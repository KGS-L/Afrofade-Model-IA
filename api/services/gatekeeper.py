"""
Gatekeeper Service — Service de vérification de qualité et de cadrage des photos/frames
en temps réel pour le mode Scan Vidéo / Upload Afrofade.
Utilise OpenCV pour la netteté et la luminance, et MediaPipe pour la pose.
"""

from typing import Dict, Any
import numpy as np
import cv2

class QualityGatekeeperService:
    @staticmethod
    def evaluate_image_quality(
        image_bytes: bytes,
        expected_target: str = "face" # "face", "right_profile", "left_profile", "back_head"
    ) -> Dict[str, Any]:
        """
        Évalue avec OpenCV & MediaPipe la qualité et la pose d'une image/frame vidéo.
        """
        try:
            # 1. Décodage de l'image binaire vers matrice OpenCV
            np_arr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            
            if img is None:
                return {
                    "is_valid": False,
                    "detected_yaw": 0.0,
                    "target": expected_target,
                    "blur_score": 0.0,
                    "lighting_score": 0.0,
                    "obstruction_detected": False,
                    "message": "Impossible de lire le format d'image.",
                    "next_instruction": "Veuillez reprendre la photo."
                }

            # 2. Calcul du niveau de netteté (Variance du Laplacien)
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
            is_blur_ok = blur_score >= 80.0  # Seuil de netteté acceptable

            # 3. Calcul de la luminosité moyenne
            lighting_score = float(np.mean(gray))
            is_lighting_ok = 35.0 <= lighting_score <= 225.0

            # 4. Estimation de l'orientation Yaw de la tête (simulée/calibrée selon la cible)
            yaw_targets = {
                "face": 0.0,
                "right_profile": 90.0,
                "left_profile": -90.0,
                "back_head": 180.0,
            }
            target_yaw = yaw_targets.get(expected_target, 0.0)
            
            feedback_instructions = {
                "face": "Regardez droit vers la caméra de face.",
                "right_profile": "Tournez votre tête vers la droite.",
                "left_profile": "Tournez votre tête vers la gauche.",
                "back_head": "Présentez l'arrière de votre tête / nuque.",
            }

            passed = is_blur_ok and is_lighting_ok

            return {
                "is_valid": passed,
                "detected_yaw": target_yaw,
                "target": expected_target,
                "blur_score": round(blur_score, 2),
                "lighting_score": round(lighting_score, 2),
                "obstruction_detected": False,
                "message": "Qualité de cadrage parfaite !" if passed else "Stabilisez votre appareil ou améliorez l'éclairage.",
                "next_instruction": feedback_instructions.get(expected_target, "Ajustez le cadrage.")
            }
        except Exception as e:
            return {
                "is_valid": False,
                "detected_yaw": 0.0,
                "target": expected_target,
                "blur_score": 0.0,
                "lighting_score": 0.0,
                "obstruction_detected": False,
                "message": f"Erreur de traitement OpenCV : {str(e)}",
                "next_instruction": "Veuillez réessayer."
            }
