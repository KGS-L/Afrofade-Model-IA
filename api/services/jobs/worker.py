from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass
from typing import Any, Callable, Mapping

from models.jobs import AIJobRecord, AIJobType
from services.jobs.job_queue import JobQueue, JobQueueError


logger = logging.getLogger(__name__)
JobHandler = Callable[[AIJobRecord], dict[str, Any]]


class PermanentJobError(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code or "permanent_job_error"


class TransientJobError(RuntimeError):
    def __init__(self, code: str, message: str, retry_delay_seconds: int = 30):
        super().__init__(message)
        self.code = code or "transient_job_error"
        self.retry_delay_seconds = max(0, min(retry_delay_seconds, 3600))


@dataclass(frozen=True)
class WorkerConfig:
    worker_id: str
    claim_limit: int = 1
    lease_seconds: int = 300
    heartbeat_interval_seconds: float = 60.0
    poll_interval_seconds: float = 2.0
    recover_limit: int = 100

    def __post_init__(self) -> None:
        if not self.worker_id.strip():
            raise ValueError("worker_id is required")
        if not 1 <= self.claim_limit <= 50:
            raise ValueError("claim_limit must be between 1 and 50")
        if not 10 <= self.lease_seconds <= 3600:
            raise ValueError("lease_seconds must be between 10 and 3600")
        if self.heartbeat_interval_seconds <= 0:
            raise ValueError("heartbeat_interval_seconds must be positive")
        if self.heartbeat_interval_seconds >= self.lease_seconds:
            raise ValueError("heartbeat interval must be shorter than the lease")
        if self.poll_interval_seconds <= 0:
            raise ValueError("poll_interval_seconds must be positive")
        if not 1 <= self.recover_limit <= 500:
            raise ValueError("recover_limit must be between 1 and 500")


class LeaseHeartbeat:
    """Extends a claimed job lease while its handler is running."""

    def __init__(self, queue: JobQueue, job: AIJobRecord, config: WorkerConfig):
        self._queue = queue
        self._job = job
        self._config = config
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self.lost_lease = False
        self.last_error: Exception | None = None

    def __enter__(self) -> "LeaseHeartbeat":
        self._thread = threading.Thread(
            target=self._run,
            name=f"afrofade-heartbeat-{self._job.id}",
            daemon=True,
        )
        self._thread.start()
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=max(1.0, self._config.heartbeat_interval_seconds + 1.0))

    def _run(self) -> None:
        while not self._stop.wait(self._config.heartbeat_interval_seconds):
            try:
                self._queue.heartbeat(
                    job_id=self._job.id,
                    worker_id=self._config.worker_id,
                    lease_seconds=self._config.lease_seconds,
                )
            except Exception as exc:  # lease ownership/network failures must stop stale finalization
                self.lost_lease = True
                self.last_error = exc
                logger.error("Lost lease heartbeat for job %s: %s", self._job.id, exc)
                return


class DurableJobWorker:
    def __init__(
        self,
        queue: JobQueue,
        handlers: Mapping[AIJobType, JobHandler],
        config: WorkerConfig,
    ) -> None:
        self.queue = queue
        self.handlers = dict(handlers)
        self.config = config

    def run_once(self) -> int:
        recovered = self.queue.recover_expired(limit=self.config.recover_limit)
        if recovered:
            logger.warning("Recovered %d expired AI job lease(s)", len(recovered))

        jobs = self.queue.claim(
            worker_id=self.config.worker_id,
            limit=self.config.claim_limit,
            lease_seconds=self.config.lease_seconds,
        )

        for job in jobs:
            self.process_job(job)

        return len(jobs)

    def run_forever(self, stop_event: threading.Event) -> None:
        while not stop_event.is_set():
            try:
                processed = self.run_once()
            except JobQueueError as exc:
                logger.error("Durable job queue iteration failed: %s", exc)
                processed = 0

            if processed == 0:
                stop_event.wait(self.config.poll_interval_seconds)

    def process_job(self, job: AIJobRecord) -> bool:
        handler = self.handlers.get(job.job_type)
        if handler is None:
            return self._fail_if_owned(
                job,
                code="unsupported_job_handler",
                message=f"No worker handler registered for job type {job.job_type.value}.",
                retryable=False,
                retry_delay_seconds=0,
            )

        heartbeat = LeaseHeartbeat(self.queue, job, self.config)
        output: dict[str, Any] | None = None
        handler_error: Exception | None = None

        with heartbeat:
            try:
                output = handler(job)
                if not isinstance(output, dict):
                    raise PermanentJobError(
                        "invalid_handler_output",
                        "Worker handler must return a JSON object/dict.",
                    )
            except Exception as exc:
                handler_error = exc

        if heartbeat.lost_lease:
            logger.error(
                "Job %s finished local execution after lease loss; terminal mutation skipped.",
                job.id,
            )
            return False

        if handler_error is None:
            try:
                self.queue.complete(
                    job_id=job.id,
                    worker_id=self.config.worker_id,
                    output_payload=output or {},
                )
                return True
            except JobQueueError as exc:
                logger.error("Could not complete job %s: %s", job.id, exc)
                return False

        if isinstance(handler_error, PermanentJobError):
            return self._fail_if_owned(
                job,
                code=handler_error.code,
                message=str(handler_error),
                retryable=False,
                retry_delay_seconds=0,
            )

        if isinstance(handler_error, TransientJobError):
            return self._fail_if_owned(
                job,
                code=handler_error.code,
                message=str(handler_error),
                retryable=True,
                retry_delay_seconds=handler_error.retry_delay_seconds,
            )

        return self._fail_if_owned(
            job,
            code="unhandled_worker_exception",
            message=str(handler_error),
            retryable=True,
            retry_delay_seconds=30,
        )

    def _fail_if_owned(
        self,
        job: AIJobRecord,
        *,
        code: str,
        message: str,
        retryable: bool,
        retry_delay_seconds: int,
    ) -> bool:
        try:
            self.queue.fail(
                job_id=job.id,
                worker_id=self.config.worker_id,
                error_code=code,
                error_message=message,
                retryable=retryable,
                retry_delay_seconds=retry_delay_seconds,
            )
            return True
        except JobQueueError as exc:
            logger.error("Could not fail/requeue job %s: %s", job.id, exc)
            return False
