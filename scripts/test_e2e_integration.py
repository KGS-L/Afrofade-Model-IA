#!/usr/bin/env python3
"""Afrofade production security smoke tests."""

import json
import sys
import urllib.error
import urllib.request

WEB_URL = "http://localhost:3005"
API_URL = "http://localhost:8005"


def request(url: str, method: str = "GET", data: dict | None = None, headers: dict | None = None, timeout: int = 10):
    payload = json.dumps(data).encode("utf-8") if data is not None else None
    req_headers = {"User-Agent": "Afrofade-E2E-Tester/3.0", **(headers or {})}
    if data is not None:
        req_headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=payload, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode("utf-8")
    except Exception as exc:
        return 500, str(exc)


def expect(name: str, condition: bool, detail: str) -> bool:
    print(f"[{'PASS' if condition else 'FAIL'}] {name}: {detail}")
    return condition


def run_all_e2e_tests():
    results = []

    status, body = request(f"{API_URL}/health")
    results.append(expect("API health remains public", status == 200 and "afrofade-api-3d" in body, f"HTTP {status}"))

    reconstruct_payload = {
        "salon_id": "must-not-be-trusted",
        "client_name": "Security Test",
        "photos_urls": ["a", "b", "c"],
        "preserve_skin_texture": True,
    }

    status, _ = request(f"{API_URL}/api/v1/reconstruct", method="POST", data=reconstruct_payload)
    results.append(expect("FastAPI rejects missing internal key", status == 401, f"HTTP {status}"))

    status, _ = request(f"{API_URL}/api/v1/heads", method="POST", data=reconstruct_payload)
    results.append(expect("Job API rejects missing internal key", status == 401, f"HTTP {status}"))

    status, _ = request(f"{WEB_URL}/api/v1/reconstruct", method="POST", data=reconstruct_payload)
    results.append(expect("Next reconstruction proxy requires user auth", status == 401, f"HTTP {status}"))

    status, _ = request(
        f"{WEB_URL}/api/upload/presigned-url",
        method="POST",
        data={"filename": "face.jpg", "mimeType": "image/jpeg", "fileSize": 1024, "salonId": "victim"},
    )
    results.append(expect("Upload signing requires user auth", status == 401, f"HTTP {status}"))

    status, _ = request(
        f"{WEB_URL}/api/v1/payments/checkout",
        method="POST",
        data={"provider": "genius_pay", "purpose": "credits", "packId": "pack-essai"},
    )
    results.append(expect("Unified payment checkout requires user auth", status == 401, f"HTTP {status}"))

    status, _ = request(
        f"{WEB_URL}/api/webhooks/genius-pay",
        method="POST",
        data={"event": "payment.success", "data": {"transaction": {"reference": "fake"}}},
    )
    results.append(expect("GeniusPay rejects unsigned webhook", status in (401, 503), f"HTTP {status}"))

    status, _ = request(
        f"{WEB_URL}/api/webhooks/money-fusion",
        method="POST",
        data={"event": "payin.session.completed"},
    )
    results.append(expect("Money Fusion webhook requires tokenPay before provider lookup", status == 400, f"HTTP {status}"))

    status, _ = request(
        f"{WEB_URL}/api/webhooks/payment",
        method="POST",
        data={"status": "paid", "paymentId": "fake", "token": "fake"},
    )
    results.append(expect("Legacy generic payment webhook is retired", status == 410, f"HTTP {status}"))

    status, _ = request(f"{WEB_URL}/api/cron/purge-biometric")
    results.append(expect("Biometric purge rejects missing secret", status in (401, 503), f"HTTP {status}"))

    for path in ["/legal/mentions-legales", "/legal/confidentialite", "/legal/cgv", "/contact"]:
        status, _ = request(f"{WEB_URL}{path}")
        results.append(expect(f"Public page {path}", status == 200, f"HTTP {status}"))

    passed = sum(results)
    total = len(results)
    print(f"\nSecurity smoke tests: {passed}/{total} passed")
    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    run_all_e2e_tests()
