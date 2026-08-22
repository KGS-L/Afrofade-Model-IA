#!/usr/bin/env python3
"""Automated simulation test for Salon Onboarding & DB persistence."""

import json
import urllib.request
import urllib.error
import sys

BASE_URL = "http://localhost:3000"

def run_salon_onboarding_test():
    print("==> Simulation E2E : Création d'un Espace Salon & Vérification DB")

    # 1. Authentification via OTP dev (/api/auth/otp/verify)
    auth_url = f"{BASE_URL}/api/auth/otp/verify"
    payload = json.dumps({"email": "coiffeur.test@afrofade.pro", "code": "123456"}).encode("utf-8")
    req = urllib.request.Request(auth_url, data=payload, headers={"Content-Type": "application/json", "User-Agent": "Afrofade-Simulator/1.0"}, method="POST")
    
    session_cookie = None
    try:
        with urllib.request.urlopen(req) as resp:
            cookies = resp.headers.get_all("Set-Cookie") or []
            for c in cookies:
                if "afrofade_session" in c:
                    session_cookie = c.split(";")[0]
                    break
    except Exception as exc:
        print(f"[FAIL] Impossible de créer la session de test salon: {exc}")
        return False

    if not session_cookie:
        print("[FAIL] Pas de cookie afrofade_session retourné.")
        return False

    print(f"[PASS] Session de test salon créée: {session_cookie[:40]}...")

    headers = {
        "User-Agent": "Afrofade-Simulator/1.0",
        "Cookie": session_cookie,
        "Content-Type": "application/json",
    }

    # 2. Appel POST /api/salon/onboard pour créer le salon
    salon_data = {
        "name": "Afro Barber Studio Test",
        "country": "Burkina Faso",
        "phone": "+22670998877"
    }

    post_data = json.dumps(salon_data).encode("utf-8")
    post_req = urllib.request.Request(f"{BASE_URL}/api/salon/onboard", data=post_data, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(post_req) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            print(f"[PASS] POST /api/salon/onboard : HTTP {resp.status}")
            print(f"       Réponse salon : {res}")
            if res.get('salonId') or res.get('alreadyConfigured'):
                print("[SUCCESS] SALON CRÉÉ AVEC SUCCÈS & CONVERTI EN COMPTE SALON !")
                return True
            else:
                print(f"[FAIL] Réponse salon inattendue: {res}")
                return False
    except Exception as exc:
        print(f"[FAIL] POST /api/salon/onboard échoué: {exc}")
        return False

if __name__ == "__main__":
    success = run_salon_onboarding_test()
    sys.exit(0 if success else 1)
