#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: generate-self-signed-cert.sh --domain DOMAIN [--output-dir PATH] [--days 365]

Generates a self-signed certificate pair for local or staging smoke tests.
EOF
}

DOMAIN=""
OUTPUT_DIR=""
DAYS=365

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)
      DOMAIN="${2:?missing value for --domain}"
      shift 2
      ;;
    --output-dir)
      OUTPUT_DIR="${2:?missing value for --output-dir}"
      shift 2
      ;;
    --days)
      DAYS="${2:?missing value for --days}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

[[ -n "$DOMAIN" ]] || {
  echo "--domain is required" >&2
  exit 1
}

OUTPUT_DIR="${OUTPUT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/live/$DOMAIN}"
mkdir -p "$OUTPUT_DIR"

openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout "$OUTPUT_DIR/privkey.pem" \
  -out "$OUTPUT_DIR/cert.pem" \
  -days "$DAYS" \
  -subj "/CN=$DOMAIN"

cp "$OUTPUT_DIR/cert.pem" "$OUTPUT_DIR/fullchain.pem"
cp "$OUTPUT_DIR/cert.pem" "$OUTPUT_DIR/chain.pem"

printf 'Generated self-signed certificate for %s at %s\n' "$DOMAIN" "$OUTPUT_DIR"
