#!/usr/bin/env bash
set -e

# ===============================================
#  Auvyn Apies - Cleanup Logs
#  Hapus file .log yang sudah lebih tua dari N hari
#
#  Variabel:
#    - LOGS_DIR  : diambil dari .env (LOGS_DIR), fallback ke ./logs
#    - KEEP_DAYS : default 7 hari (bisa override: KEEP_DAYS=14 ./cleanup-logs.sh)
# ===============================================

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$BASE_DIR/.env"

# Default
LOG_DIR_DEFAULT="$BASE_DIR/logs"
KEEP_DAYS="${KEEP_DAYS:-7}"

# Load .env kalau ada (biar dapat LOGS_DIR)
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC2046
  export $(grep -E '^[A-Z0-9_]+=' "$ENV_FILE" | xargs)
fi

LOG_DIR="${LOGS_DIR:-$LOG_DIR_DEFAULT}"

echo "[INFO] Membersihkan log di: $LOG_DIR (lebih tua dari $KEEP_DAYS hari)"

if [ ! -d "$LOG_DIR" ]; then
  echo "[WARN] Folder log tidak ditemukan: $LOG_DIR"
  exit 0
fi

echo "[INFO] File yang akan dihapus:"
find "$LOG_DIR" -type f -name "*.log" -mtime "+$KEEP_DAYS" -print || true

find "$LOG_DIR" -type f -name "*.log" -mtime "+$KEEP_DAYS" -delete

echo "[INFO] Cleanup selesai."
