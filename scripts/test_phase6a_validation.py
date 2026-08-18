#!/usr/bin/env python3
"""
Script de Validation Scientifique & Morphologique Phase 6A — Afrofade
Exécute la reconstruction 3D réelle par PyTorch Autograd sur 2 clients différents (Client A vs Client B)
et compare la divergence des vecteurs d'identité beta in R^100 et des maillages 3D.
"""

import sys
import json
import math
import urllib.request

API_URL = "http://localhost:8005"

def run_phase_6a_validation():
    print("===============================================================")
    print("   TEST DE VALIDATION SCIENTIFIQUE PHASE 6A — CLIENT A vs B   ")
    print("===============================================================\n")

    # Client A : Visage fin / Mâchoire étroite
    payload_a = {
        "salon_id": "test-salon-a",
        "client_name": "Client A (Visage Fin)",
        "photos_urls": [
            "https://afrofade.pro/models/demo/client_a_face.jpg",
            "https://afrofade.pro/models/demo/client_a_profil_droit.jpg",
            "https://afrofade.pro/models/demo/client_a_profil_gauche.jpg"
        ]
    }

    # Client B : Visage large / Mâchoire carrée
    payload_b = {
        "salon_id": "test-salon-b",
        "client_name": "Client B (Visage Large)",
        "photos_urls": [
            "https://afrofade.pro/models/demo/client_b_face.jpg",
            "https://afrofade.pro/models/demo/client_b_profil_droit.jpg",
            "https://afrofade.pro/models/demo/client_b_profil_gauche.jpg"
        ]
    }

    print("[1/3] Inférence PyTorch Autograd pour Client A (POST /api/v1/heads)...")
    res_a_job = http_post(f"{API_URL}/api/v1/heads", payload_a)
    job_id_a = res_a_job["job_id"]
    res_a = http_get(f"{API_URL}/api/v1/heads/{job_id_a}")["result"]
    print(f"   ✓ Succès Client A (Job ID: {job_id_a})")
    print(f"   - Loss PyTorch: Initiale {res_a['fit_metrics']['initial_loss']:.5f} -> Finale {res_a['fit_metrics']['final_loss']:.5f}")
    print(f"   - Vertices: {res_a['vertices_count']}, Faces: {res_a['faces_count']}")
    print(f"   - Fichier GLB généré: {res_a['mesh_3d_url']}")

    print("\n[2/3] Inférence PyTorch Autograd pour Client B (POST /api/v1/heads)...")
    res_b_job = http_post(f"{API_URL}/api/v1/heads", payload_b)
    job_id_b = res_b_job["job_id"]
    res_b = http_get(f"{API_URL}/api/v1/heads/{job_id_b}")["result"]
    print(f"   ✓ Succès Client B (Job ID: {job_id_b})")
    print(f"   - Loss PyTorch: Initiale {res_b['fit_metrics']['initial_loss']:.5f} -> Finale {res_b['fit_metrics']['final_loss']:.5f}")
    print(f"   - Vertices: {res_b['vertices_count']}, Faces: {res_b['faces_count']}")
    print(f"   - Fichier GLB généré: {res_b['mesh_3d_url']}")

    # 3. Comparaison mathématique des vecteurs d'identité beta_A et beta_B
    beta_a = res_a["flame_params"]["beta_shape_100d"]
    beta_b = res_b["flame_params"]["beta_shape_100d"]

    diff_sq = sum((a - b) ** 2 for a, b in zip(beta_a, beta_b))
    l2_dist = math.sqrt(diff_sq)
    mae_dist = sum(abs(a - b) for a, b in zip(beta_a, beta_b)) / len(beta_a)

    dot_prod = sum(a * b for a, b in zip(beta_a, beta_b))
    norm_a = math.sqrt(sum(a * a for a in beta_a))
    norm_b = math.sqrt(sum(b * b for b in beta_b))
    cosine_sim = dot_prod / (norm_a * norm_b) if norm_a > 0 and norm_b > 0 else 0.0

    print("\n===============================================================")
    print("          RÉSULTATS DU BENCHMARK MORPHOLOGIQUE               ")
    print("===============================================================")
    print(f"1. Vecteur Beta Client A (5 premiers coefs): {[round(x, 4) for x in beta_a[:5]]}")
    print(f"2. Vecteur Beta Client B (5 premiers coefs): {[round(x, 4) for x in beta_b[:5]]}")
    print(f"3. Distance L2 ||beta_A - beta_B||: {l2_dist:.6f}")
    print(f"4. Écart Moyen Absolu (MAE): {mae_dist:.6f}")
    print(f"5. Cosine Similarity: {cosine_sim:.6f}")

    distinct = (l2_dist > 0.001) and (beta_a[0] != beta_b[0])
    if distinct:
        print("\n✔ CRITÈRE DE DISTINCTIVITÉ MORPHOLOGIQUE VALIDÉ !")
        print("  Client A et Client B ont produit des géométries 3D FLAME physiquement différentes.")
        sys.exit(0)
    else:
        print("\n✗ ÉCHEC : Les géométries générées sont identiques (placeholder suspecté).")
        sys.exit(1)

def http_get(url: str) -> dict:
    req = urllib.request.Request(url, headers={'User-Agent': 'Afrofade-Tester/1.0'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode('utf-8'))

def http_post(url: str, data: dict) -> dict:
    payload = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode('utf-8'))

if __name__ == "__main__":
    run_phase_6a_validation()
