from __future__ import annotations

import logging
import os
import signal
import socket
import threading

from services.jobs.handlers import DEFAULT_JOB_HANDLERS
from services.jobs.job_queue import JobQueueError, SupabasePostgresJobQueue
from services.jobs.worker import DurableJobWorker, WorkerConfig


logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("afrofade.worker")


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError as exc:
        raise RuntimeError(f"{name} must be an integer") from exc


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return float(raw)
    except ValueError as exc:
        raise RuntimeError(f"{name} must be a number") from exc


def main() -> None:
    stop_event = threading.Event()

    def request_stop(signum, _frame) -> None:
        logger.info("Received signal %s; worker will stop between jobs.", signum)
        stop_event.set()

    signal.signal(signal.SIGTERM, request_stop)
    signal.signal(signal.SIGINT, request_stop)

    if not _env_bool("AI_WORKER_ENABLED", True):
        logger.info("AI worker is disabled by AI_WORKER_ENABLED=false")
        while not stop_event.wait(60.0):
            pass
        return

    worker_id = (os.getenv("AI_WORKER_ID") or f"{socket.gethostname()}-{os.getpid()}").strip()
    config = WorkerConfig(
        worker_id=worker_id,
        claim_limit=_env_int("AI_WORKER_CLAIM_LIMIT", 1),
        lease_seconds=_env_int("AI_WORKER_LEASE_SECONDS", 300),
        heartbeat_interval_seconds=_env_float("AI_WORKER_HEARTBEAT_SECONDS", 60.0),
        poll_interval_seconds=_env_float("AI_WORKER_POLL_SECONDS", 2.0),
        recover_limit=_env_int("AI_WORKER_RECOVER_LIMIT", 100),
    )

    try:
        queue = SupabasePostgresJobQueue.from_env()
    except JobQueueError as exc:
        raise SystemExit(f"Persistent AI JobQueue configuration error: {exc}") from exc

    worker = DurableJobWorker(queue, DEFAULT_JOB_HANDLERS, config)
    logger.info("Starting Afrofade durable AI worker %s", config.worker_id)
    worker.run_forever(stop_event)
    logger.info("Afrofade durable AI worker %s stopped", config.worker_id)


if __name__ == "__main__":
    main()
