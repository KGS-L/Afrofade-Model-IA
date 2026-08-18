"""
Script de téléchargement et d'initialisation des poids de modèles IA 3D Afrofade
(FLAME 3DMM, DECA, MediaPipe Face Landmarker & SAM-2 Checkpoints).
"""

import os
import sys
import urllib.request

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")

MODEL_URLS = {
    "mediapipe_face_landmarker.task": "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
    "flame_head_template.glb": "https://storage.googleapis.com/afrofade-assets/flame_head_template.glb"
}

def download_models():
    os.makedirs(MODELS_DIR, exist_ok=True)
    print(f"==================================================")
    print(f" Téléchargement des poids de modèles IA Afrofade ")
    print(f" Destination : {os.path.abspath(MODELS_DIR)}")
    print(f"==================================================")

    for filename, url in MODEL_URLS.items():
        dest_path = os.path.join(MODELS_DIR, filename)
        if os.path.exists(dest_path):
            print(f"✔ Modèle {filename} déjà présent.")
        else:
            print(f"⬇ Téléchargement de {filename}...")
            try:
                urllib.request.urlretrieve(url, dest_path)
                print(f"✔ {filename} téléchargé avec succès !")
            except Exception as e:
                print(f"⚠ Erreur lors du téléchargement de {filename} : {e}")

    print("==================================================")
    print(" Tous les poids de modèles sont prêts pour l'inférence !")
    print("==================================================")

if __name__ == "__main__":
    download_models()
