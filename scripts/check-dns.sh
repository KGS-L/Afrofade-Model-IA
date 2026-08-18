#!/usr/bin/env bash
set -Eeuo pipefail

# Script de vérification et attente de la propagation DNS pour Afrofade
wait_seconds=60
interval_seconds=5
expected_ip=""
domains=()

usage() {
  cat <<'USAGE'
Usage: bash scripts/check-dns.sh [options] DOMAIN [DOMAIN...]

Options:
  --expected-ip IPV4       IPv4 publique attendue (optionnel)
  --wait-seconds SECONDES  Temps maximal de propagation (défaut : 60)
  --interval SECONDES      Intervalle entre deux contrôles (défaut : 5)
  --help                   Affiche cette aide
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --expected-ip) expected_ip="${2:?IPv4 manquante}"; shift 2 ;;
    --wait-seconds) wait_seconds="${2:?durée manquante}"; shift 2 ;;
    --interval) interval_seconds="${2:?intervalle manquant}"; shift 2 ;;
    --help) usage; exit 0 ;;
    --*) echo "Option inconnue : $1" >&2; usage >&2; exit 2 ;;
    *) domains+=("$1"); shift ;;
  esac
done

[[ ${#domains[@]} -gt 0 ]] || { echo "Au moins un domaine est requis." >&2; exit 2; }
if [[ -n "$expected_ip" ]]; then
  [[ "$expected_ip" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || {
    echo "IPv4 attendue invalide : $expected_ip" >&2
    exit 2
  }
fi
[[ "$wait_seconds" =~ ^[0-9]+$ ]] || { echo "Durée invalide." >&2; exit 2; }
[[ "$interval_seconds" =~ ^[1-9][0-9]*$ ]] || { echo "Intervalle invalide." >&2; exit 2; }

deadline=$((SECONDS + wait_seconds))
while true; do
  all_valid=true

  for domain in "${domains[@]}"; do
    resolved_ips="$(getent ahostsv4 "$domain" 2>/dev/null | awk '{print $1}' | sort -u || true)"
    if [[ -z "$resolved_ips" ]] && command -v host >/dev/null 2>&1; then
      resolved_ips="$(host "$domain" 2>/dev/null | awk '/has address/ {print $4}' | sort -u || true)"
    fi
    if [[ -z "$resolved_ips" ]] && command -v dig >/dev/null 2>&1; then
      resolved_ips="$(dig +short "$domain" 2>/dev/null | grep -E '^([0-9]{1,3}\.){3}[0-9]{1,3}$' | sort -u || true)"
    fi

    if [[ -n "$resolved_ips" ]]; then
      if [[ -n "$expected_ip" ]]; then
        if grep -Fxq "$expected_ip" <<<"$resolved_ips"; then
          echo "✅ DNS valide : $domain -> $expected_ip"
        else
          all_valid=false
          echo "⌛ DNS en attente : $domain -> ${resolved_ips//$'\n'/, } (attendu : $expected_ip)" >&2
        fi
      else
        echo "✅ DNS valide : $domain -> ${resolved_ips//$'\n'/, }"
      fi
    else
      all_valid=false
      echo "⌛ DNS en attente : $domain ne possède pas encore d'IPv4 résoluble." >&2
    fi
  done

  [[ "$all_valid" == true ]] && exit 0
  if (( SECONDS >= deadline )); then
    echo "❌ La vérification DNS a expiré après ${wait_seconds}s pour ${domains[*]}." >&2
    exit 1
  fi
  sleep "$interval_seconds"
done
