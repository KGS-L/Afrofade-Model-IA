#!/usr/bin/env bash
set -Eeuo pipefail

# Script de déploiement local / VPS pour Afrofade sur /root/project/Afrofade ou ~/project/Afrofade

TARGET_DIR="${1:-$HOME/project/Afrofade}"
DOMAIN="${2:-afrofade.pro}"
EMAIL="${3:-contact@afrofade.pro}"

echo "=========================================="
echo " Déploiement Afrofade sur VPS "
echo " Dossier cible : ${TARGET_DIR}"
echo " Domaine       : ${DOMAIN}"
echo " Email SSL     : ${EMAIL}"
echo "=========================================="

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"

echo "[1/4] Préparation et synchronisation du dossier projet..."
mkdir -p "$TARGET_DIR/scripts" "$TARGET_DIR/deploy/nginx"

cp -a "$REPO_DIR/docker-compose.yml" "$TARGET_DIR/"
if [[ -f "$REPO_DIR/.env.example" ]]; then
  cp -a "$REPO_DIR/.env.example" "$TARGET_DIR/"
fi
cp -a "$REPO_DIR/scripts/"* "$TARGET_DIR/scripts/"
cp -a "$REPO_DIR/deploy/nginx/"* "$TARGET_DIR/deploy/nginx/"

if [[ -d "$REPO_DIR/web" ]]; then
  rsync -a --exclude 'node_modules' --exclude '.next' "$REPO_DIR/web/" "$TARGET_DIR/web/" 2>/dev/null || cp -r "$REPO_DIR/web" "$TARGET_DIR/"
fi
if [[ -d "$REPO_DIR/api" ]]; then
  rsync -a --exclude '__pycache__' --exclude '.venv' "$REPO_DIR/api/" "$TARGET_DIR/api/" 2>/dev/null || cp -r "$REPO_DIR/api" "$TARGET_DIR/"
fi

cd "$TARGET_DIR"

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    echo "Fichier .env initialisé."
  fi
fi

run_sudo() {
  if [[ $EUID -eq 0 ]]; then
    "$@"
  elif [[ -n "${VPS_SUDO_PASSWORD:-${SUDO_PASSWORD:-}}" ]]; then
    echo "${VPS_SUDO_PASSWORD:-$SUDO_PASSWORD}" | sudo -S "$@"
  else
    sudo -n "$@" 2>/dev/null || sudo "$@"
  fi
}

echo "[2/4] Exécution de la vérification DNS et configuration Nginx..."
run_sudo bash "$TARGET_DIR/scripts/configure-vps-nginx.sh" --domain "$DOMAIN" --email "$EMAIL"

echo "[3/4] Lancement des services Docker..."
if command -v docker &>/dev/null && docker info &>/dev/null; then
  docker compose up -d --build
  echo "[4/4] Statut des services Afrofade :"
  docker compose ps
else
  run_sudo docker compose up -d --build
  echo "[4/4] Statut des services Afrofade :"
  run_sudo docker compose ps
fi

echo "=========================================="
echo " Déploiement terminé avec succès dans ${TARGET_DIR} !"
echo " URL d'accès : https://${DOMAIN}"
echo "=========================================="
