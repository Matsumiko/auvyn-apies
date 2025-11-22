#!/usr/bin/env bash
set -euo pipefail

echo "=== Auvyn Apies - Updater ==="

if [ "$EUID" -ne 0 ]; then
  echo "[ERROR] Jalankan updater ini sebagai root (sudo)."
  exit 1
fi

APP_DIR="/opt/auvyn-apies"
SERVICE_NAME="auvyn-apies.service"
BRANCH="main"

if [ ! -d "$APP_DIR/.git" ]; then
  echo "[ERROR] Repo tidak ditemukan di $APP_DIR"
  echo "        Install dulu pakai setup.sh"
  exit 1
fi

cd "$APP_DIR"

echo "[INFO] Repo path: $APP_DIR"
echo "[INFO] Branch   : $BRANCH"

# --- cek perubahan lokal ---
LOCAL_CHANGES="$(git status --porcelain || true)"
STASHED="false"

if [ -n "$LOCAL_CHANGES" ]; then
  echo "[WARN] Ada perubahan lokal, auto-stash dulu biar pull tidak gagal..."
  git stash push -m "auto-stash before update $(date -Is)" >/dev/null
  STASHED="true"
fi

# --- pull update ---
echo "[INFO] Pull update dari origin/$BRANCH ..."
git fetch origin "$BRANCH"
git checkout "$BRANCH" >/dev/null 2>&1 || true
git pull --ff-only origin "$BRANCH"

# --- install deps kalau perlu ---
if [ -f package.json ]; then
  echo "[INFO] Install dependency (npm install --production)..."
  npm install --production
else
  echo "[WARN] package.json tidak ditemukan, skip npm install."
fi

# --- apply stash kalau ada ---
if [ "$STASHED" = "true" ]; then
  echo "[INFO] Balikin perubahan lokal (stash pop)..."
  set +e
  git stash pop
  POP_STATUS=$?
  set -e

  if [ $POP_STATUS -ne 0 ]; then
    echo
    echo "[WARN] Ada konflik setelah stash pop."
    echo "       Silakan bereskan conflict manual."
    echo "       Lalu restart service pakai:"
    echo "       systemctl restart $SERVICE_NAME"
    exit 2
  fi
fi

# --- restart service ---
echo "[INFO] Restart service $SERVICE_NAME ..."
systemctl daemon-reload
systemctl restart "$SERVICE_NAME"

echo
echo "=== Update selesai ==="
echo "Cek status : systemctl status $SERVICE_NAME"
echo "Log realtime: journalctl -u $SERVICE_NAME -f"
