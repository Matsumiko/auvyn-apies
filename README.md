# Auvyn Apies

<div align="center">

**🌉 Bridge Transaksi IP Center yang Simple & Powerful**

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/Matsumiko/auvyn-apies/graphs/commit-activity)

Backend bridge untuk transaksi pulsa, kuota, voucher game, dan produk digital lainnya ke IP Center.

[✨ Features](#-fitur-utama) • [🚀 Quick Start](#-quick-start) • [📡 API Docs](#-api-endpoints) • [⚙️ Configuration](#%EF%B8%8F-konfigurasi)

</div>

---

## 📖 Tentang

**Auvyn Apies** adalah bridge sederhana yang menghubungkan backend utama Anda (misal Cloudflare Worker) dengan IP Center (engine penyedia produk digital).

### 🎯 Kenapa Auvyn Apies?

- **Abstraksi Sempurna**: Backend utama tidak perlu tahu detail rumit IP Center
- **API Clean**: Komunikasi terstruktur dan mudah dipahami
- **Production Ready**: Sudah include monitoring, logging, dan notifikasi
- **Secure**: Built-in authentication dan sanitization

> **⚠️ Catatan Penting**  
> Credential pada README ini hanya contoh dummy. Konfigurasi asli wajib via `.env` atau installer.

---

## ✨ Fitur Utama

### 🔐 Security & Authentication
- ✅ Signature SHA1 + Base64URL untuk transaksi IP Center
- ✅ Secret-based authentication untuk semua endpoint `/api/*`
- ✅ Callback Secret untuk validasi webhook ke backend
- ✅ Payload sanitization untuk keamanan data

### 📊 Monitoring & Logging
- ✅ Structured logging dengan Winston (success, pending, failed, report)
- ✅ Notifikasi Telegram per kategori transaksi + report
- ✅ Monitoring saldo otomatis + alert saldo rendah
- ✅ Endpoint `/report` untuk webhook final dari IP Center

### 🔌 Integration
- ✅ RESTful API yang simpel dan intuitif
- ✅ Callback system event-driven
- ✅ Support custom metadata untuk tracking
- ✅ Multi-event types (transaction, balance, ticket)

### 🛠️ Operations
- ✅ Instalasi satu perintah pakai `setup.sh`
- ✅ Systemd service untuk production deployment
- ✅ Script pembersih log otomatis `cleanup-logs.sh`
- ✅ Script update cepat `update.sh`

---

## 🏗️ Arsitektur

```
┌─────────────────────┐
│  Frontend / Web     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Backend Utama      │
│  (Cloudflare)       │──► POST /api/transaction (secret)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Auvyn Apies       │
│   (VPS Server)      │
│                     │
│  • Buat signature   │
│  • Kirim ke Center  │
│  • Parse response   │
│  • Klasifikasi      │
│  • Log & Notify     │
│  • Callback         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   IP Center         │
│   (Otomax/SW)       │
│                     │
│  • Proses transaksi │
│  • Kirim report     │
└─────────────────────┘
```

### 📋 Flow Transaksi

1. **Request** → Backend utama call `/api/transaction` dengan product & dest
2. **Processing** → Auvyn Apies kirim request ke IP Center → dapat respon awal (biasanya pending)
3. **Callback** → Auvyn Apies kirim callback **sanitized** event `transaction.request` ke backend
4. **Report** → IP Center kirim report final ke endpoint `/report`
5. **Final** → Auvyn Apies klasifikasi final, log, telegram, lalu callback event `transaction.report`

---

## 🚀 Quick Start

### Instalasi (VPS)

Jalankan sebagai **root**:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Matsumiko/auvyn-apies/main/setup.sh)
```

### 📦 Apa yang Dilakukan Installer?

1. ✅ Install dependencies (curl, git, node.js)
2. ✅ Clone/update repo ke `/opt/auvyn-apies`
3. ✅ Install npm packages
4. ✅ Setup `.env` interaktif
5. ✅ Buat & enable systemd service

### ✓ Verifikasi Service

```bash
# Check status
systemctl status auvyn-apies.service

# View logs real-time
journalctl -u auvyn-apies.service -f

# Restart service
systemctl restart auvyn-apies.service

# Stop service
systemctl stop auvyn-apies.service
```

---

## 📁 Struktur Project

```
auvyn-apies/
├── 📄 server.js              # Entry point
├── 📄 package.json           # Dependencies
├── 🔧 setup.sh              # Installer script
├── 🔧 update.sh             # Update script
├── 🔧 cleanup-logs.sh       # Log cleanup script
├── 📄 .env.example          # Environment template
├── 📁 logs/                 # Log files
│   ├── combined.log
│   ├── error.log
│   ├── trx-success.log
│   ├── trx-pending.log
│   ├── trx-failed.log
│   └── report.log
└── 📁 src/
    ├── config.js            # Configuration loader
    ├── logger.js            # Winston logger
    ├── telegram.js          # Telegram notifications
    ├── callback.js          # Callback handler
    ├── store.js             # Data store
    ├── ipCenter.js          # IP Center integration
    ├── server.js            # Express server
    ├── middleware/
    │   └── auth.js          # Authentication middleware
    └── routes/
        ├── api.js           # API routes
        └── report.js        # Report webhook
```

---

## ⚙️ Konfigurasi

Buat file `.env` di root project atau isi lewat installer:

```env
# Server Configuration
PORT=5882

# IP Center Credentials
CENTER_URL=http://10.0.0.1:6969
MEMBER_ID=AG000001
PIN=0000
PASSWORD=MyStrongPassword123
SIGN_PREFIX=ENGINE

# API Security
AUVYN_SECRET=super-secret-random-string

# Callback Configuration
CALLBACK_URL=https://worker.example.com/auvyn/callback
CALLBACK_SECRET=another-secret-or-same-as-above

# Logging & Monitoring
LOGS_DIR=./logs
BALANCE_LOW_LIMIT=50000

# Telegram Notifications (Optional)
TG_SUCCESS_BOT_TOKEN=
TG_SUCCESS_CHAT_ID=
TG_PENDING_BOT_TOKEN=
TG_PENDING_CHAT_ID=
TG_FAILED_BOT_TOKEN=
TG_FAILED_CHAT_ID=
TG_SYSTEM_BOT_TOKEN=
TG_SYSTEM_CHAT_ID=
```

### 📝 Penjelasan Parameter

| Parameter           | Required | Deskripsi                                               |
| ------------------- | :------: | ------------------------------------------------------- |
| `PORT`              |    ✅    | Port server (default: 5882)                             |
| `CENTER_URL`        |    ✅    | Base URL IP Center                                      |
| `MEMBER_ID`         |    ✅    | ID agen provider                                        |
| `PIN`               |    ✅    | PIN agen                                                |
| `PASSWORD`          |    ✅    | Password IP Center                                      |
| `SIGN_PREFIX`       |    ✅    | Prefix signature (ikuti aturan provider)                |
| `AUVYN_SECRET`      |    ✅    | Secret untuk akses endpoint `/api/*`                    |
| `CALLBACK_URL`      |    ⚪    | URL backend utama untuk menerima callback               |
| `CALLBACK_SECRET`   |    ⚪    | Secret callback (default: sama dengan `AUVYN_SECRET`)   |
| `LOGS_DIR`          |    ✅    | Direktori penyimpanan log (default: `./logs`)           |
| `BALANCE_LOW_LIMIT` |    ✅    | Batas alert saldo rendah dalam Rupiah (e.g., 50000)    |
| `TG_*_BOT_TOKEN`    |    ⚪    | Token bot Telegram per kategori                         |
| `TG_*_CHAT_ID`      |    ⚪    | Chat ID Telegram per kategori                           |

---

## 📡 API Endpoints

> **🔑 Authentication Required**  
> Semua endpoint `/api/*` wajib menyertakan header:
> ```http
> x-auvyn-secret: <AUVYN_SECRET>
> ```

### 🏥 Health Check

```http
GET /
```

**Response:**
```json
{
  "ok": true,
  "name": "auvyn-apies",
  "message": "IP center bridge online",
  "time": "2025-01-01T00:00:00.000Z"
}
```

---

### 🏓 Ping

Test koneksi API dengan endpoint ini.

```http
POST /api/ping
x-auvyn-secret: <your-secret>
```

**Response:**
```json
{
  "ok": true,
  "message": "pong"
}
```

---

### 💳 Transaction (Request Awal)

Endpoint utama untuk memproses transaksi produk digital.

```http
POST /api/transaction
Content-Type: application/json
x-auvyn-secret: <your-secret>
```

**Request Body:**
```json
{
  "product": "PFF",
  "dest": "085727035336",
  "qty": 1,
  "refID": "AVN1234567890",
  "meta": {
    "orderId": "INV-123",
    "source": "kuota-worker"
  }
}
```

**Response (Internal - ke Backend Utama):**
```json
{
  "ok": true,
  "statusCode": 200,
  "refID": "AVN1736425720255",
  "product": "PFF",
  "dest": "085727035336",
  "qty": 1,
  "raw": "[INTERNAL DATA]",
  "balanceInfo": {
    "remaining": 77827622
  },
  "category": "pending",
  "providerResult": {
    "state": "PENDING",
    "code": "PENDING_AKAN_DIPROSES"
  },
  "meta": {
    "orderId": "INV-123"
  }
}
```

**Category Types:**
- `success` → Transaksi berhasil
- `pending` → Transaksi sedang diproses
- `failed` → Transaksi gagal

> **⚠️ Penting**  
> Response dari `/api/transaction` adalah payload **internal** untuk backend utama.  
> Jika akan diteruskan ke frontend publik, lakukan **filtering** di backend utama.

---

### 💰 Check Balance

Cek saldo member di IP Center.

```http
POST /api/balance
Content-Type: application/json
x-auvyn-secret: <your-secret>
```

**Request Body (Optional):**
```json
{
  "memberId": "AG000001",
  "meta": {
    "source": "manual-check"
  }
}
```

**Response:**
```json
{
  "ok": true,
  "balance": 12345678,
  "memberId": "AG000001"
}
```

---

### 🎫 Ticket M-Bal

Request tiket deposit (M-Bal) ke IP Center.

```http
POST /api/ticket-mbal
Content-Type: application/json
x-auvyn-secret: <your-secret>
```

**Request Body:**
```json
{
  "amount": 25000000,
  "memberId": "AG000001"
}
```

**Response:**
```json
{
  "ok": true,
  "ticket": "TICKET123456",
  "amount": 25000000,
  "memberId": "AG000001"
}
```

---

### 📬 Report Webhook (Final Report)

Endpoint untuk menerima laporan final dari IP Center.

```http
ALL /report
```

**Behavior:**
- Menerima semua HTTP method (GET, POST, PUT, dll)
- Log raw report ke `logs/report.log`
- Klasifikasi status final transaksi
- Kirim notifikasi Telegram
- Callback event `transaction.report` ke backend utama

> **💡 Info**  
> Endpoint ini biasanya di-hit langsung oleh IP Center setelah transaksi selesai diproses.

---

## 🔔 Callback System (Sanitized)

Jika `CALLBACK_URL` di-set, Auvyn Apies akan mengirim callback ke backend utama setiap kali ada event.

### 📤 Header Callback

```http
POST <CALLBACK_URL>
Content-Type: application/json
x-auvyn-callback-secret: <CALLBACK_SECRET>
x-auvyn-event: <event-type>
```

### 🎭 Event Types

- `transaction.request` → Respon awal transaksi dari IP Center
- `transaction.report` → Laporan final transaksi
- `balance.check` → Hasil cek saldo
- `balance.ticket` → Hasil request tiket M-Bal

### 🛡️ Payload Sanitization

**Yang dibuang / disensor sebelum callback:**
- `centerUrl` → URL IP Center
- `sign` → Signature hash
- `memberID` → ID member
- Bagian sensitif pada `raw` (HRG, M-Bal, SN/Ref, dll)

### ✅ Contoh Callback Aman

```json
{
  "ok": true,
  "statusCode": 200,
  "refID": "AVN1736425720255",
  "product": "PFF",
  "dest": "085727035336",
  "qty": 1,
  "category": "success",
  "raw": "[REDACTED]",
  "providerResult": {
    "state": "SUCCESS",
    "code": "SUKSES",
    "sn": "[REDACTED]",
    "raw": "[REDACTED]"
  },
  "meta": {
    "orderId": "INV-123"
  }
}
```

> **🔐 Keamanan**  
> Payload callback sudah di-sanitize untuk melindungi data sensitif.  
> Backend utama hanya menerima informasi yang aman untuk diproses.

---

## 📊 Logging & Monitoring

### 📄 File Log

| File                | Isi                                  |
| ------------------- | ------------------------------------ |
| `combined.log`      | Semua aktivitas aplikasi             |
| `error.log`         | Error & exception                    |
| `trx-success.log`   | Transaksi sukses                     |
| `trx-pending.log`   | Transaksi pending                    |
| `trx-failed.log`    | Transaksi gagal                      |
| `report.log`        | Webhook `/report` dari IP Center     |

### 📱 Notifikasi Telegram

Auvyn Apies mendukung **4 kategori bot Telegram** yang terpisah:

| Bot         | Fungsi                                      |
| ----------- | ------------------------------------------- |
| **SUCCESS** | Notifikasi transaksi berhasil               |
| **PENDING** | Notifikasi transaksi pending                |
| **FAILED**  | Notifikasi transaksi gagal                  |
| **SYSTEM**  | Alert saldo rendah, report, error           |

> **💡 Pro Tip**  
> Payload Telegram **tetap full internal** (aman karena hanya dikirim ke bot pribadi kamu).  
> Berbeda dengan callback ke backend yang sudah di-sanitize.

---

## 🧹 Maintenance

### Cleanup Log

Bersihkan log lama untuk menghemat disk space.

```bash
cd /opt/auvyn-apies
./cleanup-logs.sh

# Atau custom retention
KEEP_DAYS=14 ./cleanup-logs.sh
```

### ⏰ Cron Otomatis

Setup cron job untuk cleanup otomatis setiap hari jam 3 pagi:

```bash
crontab -e
```

Tambahkan line ini:

```cron
0 3 * * * /bin/bash /opt/auvyn-apies/cleanup-logs.sh >> /var/log/cleanup-auvyn.log 2>&1
```

---

## 🔄 Update / Upgrade

Kalau ada update di repository, jalankan:

```bash
sudo /opt/auvyn-apies/update.sh
```

### 📦 Fungsi `update.sh`

1. ✅ Auto stash kalau ada perubahan lokal
2. ✅ Pull update terbaru dari GitHub
3. ✅ Install dependency kalau ada perubahan
4. ✅ Restart service `auvyn-apies.service`
5. ✅ File `.env` **tidak ditimpa**

### 🚀 One-liner Update

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Matsumiko/auvyn-apies/main/update.sh)
```

---

## 🔧 Troubleshooting

### ❌ Git pull gagal karena local changes

**Error:**
```
error: Your local changes would be overwritten by merge
```

**Solusi Cepat:**
```bash
cd /opt/auvyn-apies
git stash
git pull --ff-only
git stash pop
systemctl restart auvyn-apies.service
```

Atau langsung pakai `update.sh` karena sudah auto-stash.

---

### ❌ Callback tidak sampai

**Checklist:**
- ✅ Cek `CALLBACK_URL` sudah benar
- ✅ Pastikan backend utama bisa diakses dari VPS
- ✅ Verifikasi `CALLBACK_SECRET` cocok di kedua sisi
- ✅ Check firewall/security group
- ✅ Lihat log `combined.log` untuk error

---

### ❌ Notifikasi Telegram tidak masuk

**Checklist:**
- ✅ Pastikan token bot benar
- ✅ Bot sudah join grup/chat
- ✅ Chat ID benar
- ✅ Bot punya permission untuk send message
- ✅ Cek log `error.log` untuk detail error

**Test Manual:**
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
  -d "chat_id=<CHAT_ID>" \
  -d "text=Test from Auvyn Apies"
```

---

### ❌ Service tidak start

**Debug:**
```bash
# Lihat status detail
systemctl status auvyn-apies.service

# Lihat log error
journalctl -u auvyn-apies.service -n 50

# Test manual run
cd /opt/auvyn-apies
node server.js
```

---

### ❌ Port sudah digunakan

**Error:**
```
Error: listen EADDRINUSE: address already in use :::5882
```

**Solusi:**
```bash
# Cari process yang pakai port
sudo lsof -i :5882

# Kill process
sudo kill -9 <PID>

# Atau ubah PORT di .env
```

---

## 🤝 Contributing

Contributions are welcome! Kalau kamu punya ide atau perbaikan:

1. Fork repository ini
2. Buat branch baru (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push ke branch (`git push origin feature/amazing-feature`)
5. Buat Pull Request

---

## 📜 License

MIT License - lihat file [LICENSE](LICENSE) untuk detail.

---

## 💬 Support

Punya pertanyaan atau butuh bantuan?

- 🐛 **Bug Report**: [GitHub Issues](https://github.com/Matsumiko/auvyn-apies/issues)
- 💡 **Feature Request**: [GitHub Discussions](https://github.com/Matsumiko/auvyn-apies/discussions)

---

<div align="center">

### ⭐ Support Project

Project ini dibuat untuk membantu seller produk digital Indonesia.  
Kalau bermanfaat, **jangan lupa kasih star** ⭐

**Made with ❤️ by Indonesian Developers**

[⬆ Back to Top](#auvyn-apies)

</div>