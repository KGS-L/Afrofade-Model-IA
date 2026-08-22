#!/usr/bin/env python3
"""Automated simulation test for Customer Profile Update & DB persistence."""

import json
import urllib.request
import urllib.error
import sys

BASE_URL = "http://localhost:3000"

def run_profile_test():
    print("==> Simulation E2E : Connexion OTP Dev + Mise à jour du profil client & vérification DB")

    # 1. Authentification via l'API OTP dev (/api/auth/otp/verify)
    auth_url = f"{BASE_URL}/api/auth/otp/verify"
    payload = json.dumps({"email": "client.test@afrofade.pro", "code": "123456"}).encode("utf-8")
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
        print(f"[FAIL] Impossible de créer la session via OTP dev: {exc}")
        return False

    if not session_cookie:
        print("[FAIL] Pas de cookie afrofade_session retourné.")
        return False

    print(f"[PASS] Session de test créée avec succès: {session_cookie[:40]}...")

    headers = {
        "User-Agent": "Afrofade-Simulator/1.0",
        "Cookie": session_cookie,
        "Content-Type": "application/json",
    }

    # 2. Lecture initiale du profil
    get_req = urllib.request.Request(f"{BASE_URL}/api/account/overview", headers=headers)
    try:
        with urllib.request.urlopen(get_req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"[PASS] GET /api/account/overview : HTTP {resp.status}")
            print(f"       Profil initial : {data.get('profile')}")
    except Exception as exc:
        print(f"[FAIL] GET /api/account/overview échoué: {exc}")
        return False

    # 3. Envoi de la mise à jour PATCH du profil
    new_profile = {
        "displayName": "Moussa Sawadogo Simulation",
        "country": "Burkina Faso",
        "nationality": "Burkinabè",
        "phone": "+22670123456"
    }

    patch_data = json.dumps(new_profile).encode("utf-8")
    patch_req = urllib.request.Request(f"{BASE_URL}/api/account/overview", data=patch_data, headers=headers, method="PATCH")

    try:
        with urllib.request.urlopen(patch_req) as resp:
            patch_res = json.loads(resp.read().decode("utf-8"))
            print(f"[PASS] PATCH /api/account/overview : HTTP {resp.status}")
            print(f"       Réponse PATCH : {patch_res}")
    except Exception as exc:
        print(f"[FAIL] PATCH /api/account/overview échoué: {exc}")
        return False

    # 4. Vérification de la persistance en relisant le profil avec GET
    try:
        with urllib.request.urlopen(get_req) as resp:
            verify_data = json.loads(resp.read().decode("utf-8"))
            saved = verify_data.get('profile', {})
            if saved.get('displayName') == "Moussa Sawadogo Simulation" and saved.get('phone') == "+22670123456":
                print("[SUCCESS] PERSISTANCE VERIFIEE EN BASE DE DONNEES !")
                print(f"          Nom enregistré: '{saved.get('displayName')}', Téléphone: '{saved.get('phone')}'")
                return True
            else:
                print(f"[FAIL] Données non persistées correctement: {saved}")
                return False
    except Exception as exc:
        print(f"[FAIL] Vérification GET échouée: {exc}")
        return False

if __name__ == "__main__":
    success = run_profile_test()
    sys.exit(0 if success else 1)
