#!/usr/bin/env bash
set -euo pipefail

# Script d'installation et de configuration Nginx + SSL Certbot pour Afrofade (afrofade.pro)
DOMAIN="${1:-afrofade.pro}"
EMAIL="${2:-contact@afrofade.pro}"

echo "=========================================="
echo " Configuration Nginx & SSL pour Afrofade "
echo " Domaine : ${DOMAIN}"
echo "=========================================="

if [ "$EUID" -ne 0 ]; then
  echo "Erreur : Ce script doit être exécuté en root (sudo)."
  exit 1
fi

# 1. Installation de Nginx et Certbot si non présents
echo "[1/4] Vérification / Installation de Nginx et Certbot..."
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx

# 2. Génération de la configuration Nginx à partir du template
echo "[2/4] Création du fichier Nginx /etc/nginx/sites-available/afrofade.conf..."
mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled /var/www/certbot

sed "s/__DOMAIN_NAME__/${DOMAIN}/g" "$(dirname "$0")/../deploy/nginx/afrofade.conf.template" > /etc/nginx/sites-available/afrofade.conf

ln -sf /etc/nginx/sites-available/afrofade.conf /etc/nginx/sites-enabled/afrofade.conf
rm -f /etc/nginx/sites-enabled/default

echo "[3/4] Validation et rechargement de Nginx..."
nginx -t
systemctl reload nginx

# 3. Génération du certificat SSL Let's Encrypt
echo "[4/4] Obtention du certificat SSL via Certbot..."
certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" --non-interactive --agree-tos -m "${EMAIL}" --redirect || {
  echo "Avertissement : L'obtention du certificat SSL a échoué. Assurez-vous que les DNS de ${DOMAIN} pointent bien vers l'IP de ce serveur."
}

echo "=========================================="
echo " Configuration Nginx terminée avec succès !"
echo " Afrofade est accessible sur https://${DOMAIN}"
echo "=========================================="
