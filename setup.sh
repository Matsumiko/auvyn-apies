#!/usr/bin/env bash
  set -e

  echo "=== Auvyn Apies - Quick Installer ==="

  if [ "$EUID" -ne 0 ]; then
    echo "[ERROR] Jalankan installer ini sebagai root (sudo)."
    exit 1
  fi

  APP_DIR="/opt/auvyn-apies"

  if ! command -v curl >/dev/null 2>&1; then
    echo "[INFO] Menginstall curl..."
    apt-get update -y
    apt-get install -y curl
  fi

  if ! command -v git >/dev/null 2>&1; then
    echo "[INFO] Menginstall git..."
    apt-get update -y
    apt-get install -y git
  fi

  if ! command -v node >/dev/null 2>&1; then
    echo "[INFO] Node.js belum terinstall. Menginstall nodejs & npm dari repo distro..."
    apt-get update -y
    apt-get install -y nodejs npm
  fi

  NODE_BIN="$(command -v node)"
  if [ -z "$NODE_BIN" ]; then
    echo "[ERROR] Node.js tidak ditemukan. Install Node.js 18+ secara manual lalu jalankan ulang installer."
    exit 1
  fi

  echo "[INFO] Node.js path: $NODE_BIN"

  if [ -d "$APP_DIR/.git" ]; then
    echo "[INFO] Repo sudah ada, melakukan git pull..."
    cd "$APP_DIR"
    git pull --ff-only
  else
    echo "[INFO] Cloning repo ke $APP_DIR ..."
    rm -rf "$APP_DIR"
    git clone https://github.com/Matsumiko/auvyn-apies.git "$APP_DIR"
    cd "$APP_DIR"
  fi

  echo "[INFO] Menginstall dependency npm..."
  npm install --production

  echo
  echo "=== Konfigurasi Environment (.env) ==="

  read -rp "Port aplikasi [default 5882]: " PORT
  PORT=${PORT:-5882}

  read -rp "CENTER_URL (contoh: http://127.0.0.1:6969): " CENTER_URL
  read -rp "MEMBER_ID (ID agen): " MEMBER_ID
  read -rp "PIN (PIN agen): " PIN
  read -rp "PASSWORD (password IP / PASSIP): " PASSWORD

  read -rp "SIGN_PREFIX (default ENGINE): " SIGN_PREFIX
  SIGN_PREFIX=${SIGN_PREFIX:-ENGINE}

  read -rp "AUVYN_SECRET (secret untuk akses dari worker): " AUVYN_SECRET
  read -rp "CALLBACK_URL (opsional, kosongkan jika tidak ada): " CALLBACK_URL
  read -rp "CALLBACK_SECRET (opsional, default sama dengan AUVYN_SECRET): " CALLBACK_SECRET
  CALLBACK_SECRET=${CALLBACK_SECRET:-$AUVYN_SECRET}

  read -rp "LOGS_DIR (default ./logs): " LOGS_DIR
  LOGS_DIR=${LOGS_DIR:-./logs}

  read -rp "BALANCE_LOW_LIMIT (dalam Rupiah, contoh 50000): " BALANCE_LOW_LIMIT
  BALANCE_LOW_LIMIT=${BALANCE_LOW_LIMIT:-50000}

  echo
  echo "--- Konfigurasi Telegram (opsional, boleh dikosongkan) ---"
  read -rp "TG_SUCCESS_BOT_TOKEN: " TG_SUCCESS_BOT_TOKEN
  read -rp "TG_SUCCESS_CHAT_ID: " TG_SUCCESS_CHAT_ID

  read -rp "TG_PENDING_BOT_TOKEN: " TG_PENDING_BOT_TOKEN
  read -rp "TG_PENDING_CHAT_ID: " TG_PENDING_CHAT_ID

  read -rp "TG_FAILED_BOT_TOKEN: " TG_FAILED_BOT_TOKEN
  read -rp "TG_FAILED_CHAT_ID: " TG_FAILED_CHAT_ID

  read -rp "TG_SYSTEM_BOT_TOKEN: " TG_SYSTEM_BOT_TOKEN
  read -rp "TG_SYSTEM_CHAT_ID: " TG_SYSTEM_CHAT_ID

  cat > "$APP_DIR/.env" <<EOF
PORT=${PORT}
CENTER_URL=${CENTER_URL}
MEMBER_ID=${MEMBER_ID}
PIN=${PIN}
PASSWORD=${PASSWORD}
SIGN_PREFIX=${SIGN_PREFIX}
AUVYN_SECRET=${AUVYN_SECRET}
CALLBACK_URL=${CALLBACK_URL}
CALLBACK_SECRET=${CALLBACK_SECRET}
LOGS_DIR=${LOGS_DIR}
BALANCE_LOW_LIMIT=${BALANCE_LOW_LIMIT}
TG_SUCCESS_BOT_TOKEN=${TG_SUCCESS_BOT_TOKEN}
TG_SUCCESS_CHAT_ID=${TG_SUCCESS_CHAT_ID}
TG_PENDING_BOT_TOKEN=${TG_PENDING_BOT_TOKEN}
TG_PENDING_CHAT_ID=${TG_PENDING_CHAT_ID}
TG_FAILED_BOT_TOKEN=${TG_FAILED_BOT_TOKEN}
TG_FAILED_CHAT_ID=${TG_FAILED_CHAT_ID}
TG_SYSTEM_BOT_TOKEN=${TG_SYSTEM_BOT_TOKEN}
TG_SYSTEM_CHAT_ID=${TG_SYSTEM_CHAT_ID}
EOF

  echo "[INFO] File .env telah dibuat di $APP_DIR/.env"

  SERVICE_FILE="/etc/systemd/system/auvyn-apies.service"

  cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Auvyn Apies - IP Center Bridge
After=network.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
ExecStart=${NODE_BIN} ${APP_DIR}/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

  echo "[INFO] Service systemd dibuat: $SERVICE_FILE"

  systemctl daemon-reload
  systemctl enable auvyn-apies.service
  systemctl restart auvyn-apies.service

  echo
  echo "=== Instalasi selesai ==="
  echo "Service: auvyn-apies.service"
  echo "Cek status: systemctl status auvyn-apies.service"
  echo "Log realtime: journalctl -u auvyn-apies.service -f"
