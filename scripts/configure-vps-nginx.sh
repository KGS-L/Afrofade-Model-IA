#!/usr/bin/env bash
set -Eeuo pipefail

# Script d'installation et de configuration Nginx + SSL Certbot pour Afrofade (afrofade.pro)

DOMAIN="afrofade.pro"
EMAIL="contact@afrofade.pro"
EXPECTED_IP=""
DNS_WAIT=60
SKIP_DNS=false
ENABLE_TLS=true

usage() {
  cat <<'USAGE'
Usage: sudo bash scripts/configure-vps-nginx.sh [options] [DOMAIN] [EMAIL]

Options:
  --domain DOMAIN       Domaine d'Afrofade (défaut : afrofade.pro)
  --email EMAIL         Adresse email pour Let's Encrypt (défaut : contact@afrofade.pro)
  --expected-ip IPV4    IPv4 publique attendue du serveur
  --dns-wait SECONDES   Temps maximal d'attente de propagation DNS (défaut : 60)
  --skip-dns            Ignorer la vérification DNS avant configuration
  --no-tls              Configure uniquement Nginx HTTP sans générer le certificat SSL
  --help                Affiche cette aide
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="${2:?domaine manquant}"; shift 2 ;;
    --email) EMAIL="${2:?email manquant}"; shift 2 ;;
    --expected-ip) EXPECTED_IP="${2:?IPv4 manquante}"; shift 2 ;;
    --dns-wait) DNS_WAIT="${2:?durée manquante}"; shift 2 ;;
    --skip-dns) SKIP_DNS=true; shift ;;
    --no-tls) ENABLE_TLS=false; shift ;;
    --help) usage; exit 0 ;;
    -*) echo "Option inconnue : $1" >&2; usage >&2; exit 2 ;;
    *)
      if [[ -z "${DOMAIN_SET:-}" ]]; then
        DOMAIN="$1"
        DOMAIN_SET=1
      elif [[ -z "${EMAIL_SET:-}" ]]; then
        EMAIL="$1"
        EMAIL_SET=1
      fi
      shift
      ;;
  esac
done

echo "=========================================="
echo " Configuration Nginx & SSL pour Afrofade "
echo " Domaine : ${DOMAIN}"
echo " Email   : ${EMAIL}"
echo "=========================================="

if [[ $EUID -ne 0 ]]; then
  echo "Erreur : Ce script doit être exécuté en root (sudo)." >&2
  exit 1
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
TEMPLATE_PATH="$REPOSITORY_DIR/deploy/nginx/afrofade.conf.template"
DNS_CHECKER="$SCRIPT_DIR/check-dns.sh"

[[ -f "$TEMPLATE_PATH" ]] || { echo "Erreur : Modèle Nginx introuvable à $TEMPLATE_PATH" >&2; exit 1; }

# 1. Vérification DNS
if [[ "$SKIP_DNS" == false ]]; then
  echo "[1/5] Vérification de la propagation DNS pour ${DOMAIN}..."
  if [[ -f "$DNS_CHECKER" ]]; then
    DNS_ARGS=("--wait-seconds" "$DNS_WAIT")
    if [[ -n "$EXPECTED_IP" ]]; then
      DNS_ARGS+=("--expected-ip" "$EXPECTED_IP")
    fi
    if ! bash "$DNS_CHECKER" "${DNS_ARGS[@]}" "$DOMAIN"; then
      echo "⚠️ Avertissement : La vérification DNS pour $DOMAIN n'a pas pu être validée." >&2
      echo "Si les enregistrements DNS pointent vers ce serveur, continuez ou relancez avec --skip-dns." >&2
    fi
  else
    echo "Fichier $DNS_CHECKER non trouvé, saut de la vérification DNS avancee."
  fi
else
  echo "[1/5] Vérification DNS ignorée (--skip-dns spécifié)."
fi

# 2. Installation de Nginx et Certbot si non présents
echo "[2/5] Vérification / Installation de Nginx et Certbot..."
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx

# 3. Génération de la configuration Nginx à partir du template
echo "[3/5] Création du fichier Nginx /etc/nginx/sites-available/afrofade.conf..."
mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled /var/www/certbot

sed "s/__DOMAIN_NAME__/${DOMAIN}/g" "$TEMPLATE_PATH" > /etc/nginx/sites-available/afrofade.conf

ln -sf /etc/nginx/sites-available/afrofade.conf /etc/nginx/sites-enabled/afrofade.conf
rm -f /etc/nginx/sites-enabled/default

# 4. Validation et rechargement de Nginx
echo "[4/5] Validation et rechargement de Nginx..."
nginx -t
systemctl reload nginx

# 5. Obtention du certificat SSL Let's Encrypt
if [[ "$ENABLE_TLS" == true ]]; then
  echo "[5/5] Obtention du certificat SSL via Certbot pour ${DOMAIN} et www.${DOMAIN}..."
  certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" --non-interactive --agree-tos -m "${EMAIL}" --redirect || {
    echo "⚠️ Avertissement : L'obtention du certificat SSL a échoué. Assurez-vous que les DNS de ${DOMAIN} pointent bien vers l'IP de ce serveur."
  }
else
  echo "[5/5] TLS non demandé (--no-tls). Nginx est configuré en HTTP."
fi

echo "=========================================="
echo " Configuration Nginx terminée !"
echo " Afrofade est accessible sur http${ENABLE_TLS:+s}://${DOMAIN}"
echo "=========================================="
