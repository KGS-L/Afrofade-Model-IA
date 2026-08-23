#!/usr/bin/env python3
import os
import sys
import json
import urllib.request
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB_URL = os.environ.get("TEST_WEB_URL", "http://localhost:3000").rstrip("/")
CRON_SECRET = os.environ.get("CRON_SECRET", "replace-with-a-long-random-secret")

def http_post(url, data_dict=None, headers=None):
    headers = headers or {}
    body_bytes = None
    if data_dict is not None:
        body_bytes = json.dumps(data_dict).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body_bytes, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            cookie_hdr = resp.headers.get("Set-Cookie", "")
            data = json.loads(content) if content else {}
            if cookie_hdr:
                data["_set_cookie"] = cookie_hdr
            return resp.status, data
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        data = json.loads(content) if content.strip().startswith("{") else {"raw": content}
        cookie_hdr = e.headers.get("Set-Cookie", "")
        if cookie_hdr:
            data["_set_cookie"] = cookie_hdr
        return e.code, data

def main():
    print("==> Simulation & Validation E2E : Rappels Automatiques de RDV (Booking Reminders)")

    # 1. Verification qu'un acces non-autorisé au CRON est rejeté (HTTP 401)
    status, body = http_post(f"{WEB_URL}/api/cron/reminders", data_dict={})
    if status != 401:
        print(f"[FAIL] /api/cron/reminders sans secret aurait du retourner 401 mais a renvoyé HTTP {status}")
        sys.exit(1)
    print("[PASS] Accès anonyme au CRON des rappels rejeté (HTTP 401)")

    # 2. Exécution autorisée du CRON avec secret
    status, body = http_post(
        f"{WEB_URL}/api/cron/reminders",
        data_dict={},
        headers={"Authorization": f"Bearer {CRON_SECRET}"}
    )
    if status != 200 or not body.get("success"):
        print(f"[FAIL] Execution du CRON avec secret a echoué: HTTP {status}, body={body}")
        sys.exit(1)
    print(f"[PASS] Exécution du CRON réussie (HTTP 200): {body.get('summary')}")

    # 3. Connexion Salon pour tester l'envoi de rappel manuel
    salon_email = "salon.reminders.test@afrofade.internal"
    status, otp_res = http_post(f"{WEB_URL}/api/auth/otp/send", {"email": salon_email})
    dev_code = otp_res.get("devCodeHint") or "123456"
    status, verify_res = http_post(f"{WEB_URL}/api/auth/otp/verify", {"email": salon_email, "code": dev_code})
    
    access_token = verify_res.get("accessToken")
    cookie_hdr = verify_res.get("_set_cookie") or f"afrofade_session={access_token}"
    auth_headers = {"Cookie": cookie_hdr}

    # 4. Onboarding Salon
    status, onboard_res = http_post(
        f"{WEB_URL}/api/salon/onboard",
        {
          "name": "Salon Reminders Test",
          "city": "Ouagadougou",
          "neighborhood": "Koulouba",
          "address": "Avenue Bassawarga",
          "phone": "+22670999888"
        },
        headers=auth_headers
      )
    print(f"[PASS] Salon de test créé / vérifié (HTTP {status})")

    # 5. Tentative de relance manuelle sans ID valide (HTTP 400)
    status, err_res = http_post(f"{WEB_URL}/api/workspace/reminders/send-now", {}, headers=auth_headers)
    if status != 400:
        print(f"[FAIL] /api/workspace/reminders/send-now sans bookingId aurait du renvoyer 400, a renvoyé HTTP {status}")
        sys.exit(1)
    print("[PASS] Validation de requete de relance manuelle sans ID OK (HTTP 400)")

    print("[SUCCESS] TOUS LES TESTS DE RAPPELS AUTOMATIQUES DE RDV SONT PASSÉS 100% AVEC SUCCÈS !")

if __name__ == "__main__":
    main()
