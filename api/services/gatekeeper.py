"""
Gatekeeper Service — Service de vérification de qualité et de cadrage des photos/frames
en temps réel pour le mode Scan Vidéo / Upload Afrofade.
"""

from typing import Dict, Any, Tuple
import numpy as np

class QualityGatekeeperService:
    @staticmethod
    def evaluate_image_quality(
        image_bytes: bytes,
        expected_target: str = "face" # "face", "right_profile", "left_profile", "back_head"
    ) -> Dict[str, Any]:
        """
        Évalue la qualité et le cadrage d'une image/frame vidéo.
        S'assure du niveau de netteté, d'éclairage et d'occultation du visage.
        """
        # Simulation d'analyse d'image OpenCV / MediaPipe
        # En production : calcul Laplacian Variance (flou), Luminance Histogram (éclairage), et Pose Yaw/Pitch/Roll
        
        # Valeurs simulées déterministes basées sur la taille des données
        bytes_len = len(image_bytes)
        is_blur_ok = bytes_len > 5000  # Vérification minimale de données
        is_lighting_ok = True
        
        yaw_angles = {
            "face": 0,
            "right_profile": 88,
            "left_profile": -85,
            "back_head": 175,
        }
        detected_yaw = yaw_angles.get(expected_target, 0)
        
        feedback_messages = {
            "face": "Veuillez regarder la caméra de face.",
            "right_profile": "Tournez doucement la tête vers la droite.",
            "left_profile": "Tournez la tête vers la gauche.",
            "back_head": "Présentez l'arrière de votre tête / nuque.",
        }
        
        passed = is_blur_ok and is_lighting_ok
        
        return {
            "is_valid": passed,
            "detected_yaw": detected_yaw,
            "target": expected_target,
            "blur_score": 145.2 if is_blur_ok else 45.0,
            "lighting_score": 128.0,
            "obstruction_detected": False,
            "message": "Image de qualité parfaite !" if passed else "Photo trop floue, veuillez vous stabiliser.",
            "next_instruction": feedback_messages.get(expected_target, "Positionnez votre visage.")
        }
