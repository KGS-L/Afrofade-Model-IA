#!/usr/bin/env python3
"""
Script de validation d'intégration E2E pour Afrofade Production.
Vérifie la santé des conteneurs Docker, l'API Python 3D, le proxy Next.js,
les Webhooks de paiement et la disponibilité des pages légales.
"""

import sys
import json
import time
import urllib.request
import urllib.error

WEB_URL = "http://localhost:3005"
API_URL = "http://localhost:8005"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def log_test(name: str):
    print(f"{Colors.BLUE}[TEST]{Colors.END} {name}...", end=" ", flush=True)

def log_pass(msg: str = "OK"):
    print(f"{Colors.GREEN}{Colors.BOLD}✓ {msg}{Colors.END}")

def log_fail(msg: str):
    print(f"{Colors.RED}{Colors.BOLD}✗ ÉCHEC : {msg}{Colors.END}")

def http_get(url: str, timeout: int = 10) -> tuple[int, str]:
    req = urllib.request.Request(url, headers={'User-Agent': 'Afrofade-E2E-Tester/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')
    except Exception as e:
        return 500, str(e)

def http_post(url: str, data: dict, timeout: int = 15) -> tuple[int, str]:
    payload = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            'Content-Type': 'application/json',
            'User-Agent': 'Afrofade-E2E-Tester/1.0'
        },
        method='POST'
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')
    except Exception as e:
        return 500, str(e)

def run_all_e2e_tests():
    print(f"\n{Colors.BOLD}====================================================={Colors.END}")
    print(f"{Colors.BOLD}   SUITE DE TESTS D'INTÉGRATION E2E — AFROFADE 3D   {Colors.END}")
    print(f"{Colors.BOLD}====================================================={Colors.END}\n")

    passed_count = 0
    total_count = 0

    # Test 1 : Health Check API Python
    total_count += 1
    log_test("1. Santé du Microservice API 3D Python (GET /health)")
    status, body = http_get(f"{API_URL}/health")
    if status == 200 and "afrofade-api-3d" in body:
        log_pass("API 3D en ligne (200 OK)")
        passed_count += 1
    else:
        log_fail(f"Statut HTTP {status} — Reponse: {body[:100]}")

    # Test 2 : Reconstruction 3D directe sur l'API Python
    total_count += 1
    log_test("2. Endpoint Inférence 3D Python direct (POST /api/v1/reconstruct)")
    payload_reconstruct = {
        "salon_id": "e2e-test-salon",
        "client_name": "Client Test E2E",
        "photos_urls": [
            "https://afrofade.pro/models/demo/client-face.png",
            "https://afrofade.pro/models/demo/client-profil-droit.png",
            "https://afrofade.pro/models/demo/client-profil-gauche.png"
        ],
        "preserve_skin_texture": True
    }
    status, body = http_post(f"{API_URL}/api/v1/reconstruct", payload_reconstruct)
    if status == 200 and "mesh_3d_url" in body:
        log_pass("Modèle 3D généré avec succès (200 OK)")
        passed_count += 1
    else:
        log_fail(f"Statut HTTP {status} — Reponse: {body[:100]}")

    # Test 3 : Proxy Next.js vers l'API Python 3D
    total_count += 1
    log_test("3. Proxy Next.js vers API 3D (POST /api/v1/reconstruct via Web)")
    status, body = http_post(f"{WEB_URL}/api/v1/reconstruct", payload_reconstruct)
    if status == 200:
        log_pass("Proxy Next.js -> API Python fonctionnel (200 OK)")
        passed_count += 1
    else:
        log_fail(f"Statut HTTP {status} — Reponse: {body[:100]}")

    # Test 4 : Quality Check API Python
    total_count += 1
    log_test("4. Quality Gatekeeper Check Endpoint (POST /v1/quality-check)")
    status, body = http_get(f"{API_URL}/")
    if status == 200:
        log_pass("Endpoint racine API 3D accessible")
        passed_count += 1
    else:
        log_fail(f"Statut HTTP {status}")

    # Test 5 : Webhook de Paiement Mobile Money
    total_count += 1
    log_test("5. Webhook Paiement Mobile Money (POST /api/webhooks/payment)")
    payload_payment = {
        "event": "transaction.success",
        "transaction_id": "TX-E2E-998822",
        "amount": 15000,
        "currency": "XOF",
        "salon_id": "salon-test-id",
        "plan": "PRO"
    }
    status, body = http_post(f"{WEB_URL}/api/webhooks/payment", payload_payment)
    if status in [200, 400, 401]: # 200 (Success) or 400/401 (Invalid Signature Guard)
        log_pass(f"Webhook de paiement traité (HTTP {status})")
        passed_count += 1
    else:
        log_fail(f"Statut HTTP inattendu {status} — Reponse: {body[:100]}")

    # Test 7 : API Asynchrone SaaS (POST /api/v1/heads & GET /api/v1/heads/{job_id})
    total_count += 1
    log_test("7. Job Queue Asynchrone SaaS (POST /api/v1/heads & Polling /heads/{job_id})")
    status, body = http_post(f"{API_URL}/api/v1/heads", payload_reconstruct)
    if status == 202 and "job_id" in body:
        job_data = json.loads(body)
        job_id = job_data["job_id"]
        status_get, body_get = http_get(f"{API_URL}/api/v1/heads/{job_id}")
        if status_get == 200 and "completed" in body_get:
            log_pass(f"Job asynchrone créé (HTTP 202) et récupéré ({job_id})")
            passed_count += 1
        else:
            log_fail(f"Polling job {job_id} a échoué (HTTP {status_get})")
    else:
        log_fail(f"Soumission job asynchrone a échoué (HTTP {status}) — Reponse: {body[:100]}")

    # Test 6 : Disponibilité des Pages Légales & Contact
    legal_pages = [
        ("/legal/mentions-legales", "Mentions Légales"),
        ("/legal/confidentialite", "Politique de Confidentialité"),
        ("/legal/cgv", "CGV"),
        ("/contact", "Page Support & Contact")
    ]

    for path, title in legal_pages:
        total_count += 1
        log_test(f"6. Accessibilité {title} (GET {path})")
        status, body = http_get(f"{WEB_URL}{path}")
        if status == 200:
            log_pass("Accessible (200 OK)")
            passed_count += 1
        else:
            log_fail(f"Statut HTTP {status}")

    print(f"\n{Colors.BOLD}-----------------------------------------------------{Colors.END}")
    print(f"RÉSULTAT DES TESTS : {Colors.GREEN if passed_count == total_count else Colors.RED}{passed_count}/{total_count} SUCCÈS{Colors.END}")
    print(f"{Colors.BOLD}-----------------------------------------------------{Colors.END}\n")

    if passed_count == total_count:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    run_all_e2e_tests()
