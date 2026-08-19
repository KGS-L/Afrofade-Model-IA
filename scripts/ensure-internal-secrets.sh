#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: environment file not found: $ENV_FILE"
  exit 1
fi

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c 'import secrets; print(secrets.token_hex(32))'
  else
    echo "ERROR: neither openssl nor python3 is available to generate secure secrets" >&2
    exit 1
  fi
}

is_placeholder() {
  value="$1"
  [ -z "$value" ] || echo "$value" | grep -Eqi '^(change-me|replace-|your-|placeholder|ci-)'
}

ensure_secret() {
  key="$1"
  current_value=$(grep "^${key}=" "$ENV_FILE" 2>/dev/null | head -n1 | cut -d'=' -f2- || true)

  if is_placeholder "$current_value"; then
    new_value=$(generate_secret)

    if grep -q "^${key}=" "$ENV_FILE"; then
      sed -i "s|^${key}=.*|${key}=${new_value}|" "$ENV_FILE"
    else
      printf '%s=%s\n' "$key" "$new_value" >> "$ENV_FILE"
    fi

    echo "Generated and persisted ${key}"
  else
    echo "${key} already configured; keeping existing value"
  fi
}

chmod 600 "$ENV_FILE"
ensure_secret API_INTERNAL_SECRET
ensure_secret CRON_SECRET
