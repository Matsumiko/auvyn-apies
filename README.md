# 🔌 Auvyn Apies

<div align="center">

**Bridge Transaksi IP Center yang Simple & Powerful**

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/Matsumiko/auvyn-apies/graphs/commit-activity)

*Backend bridge untuk transaksi pulsa, kuota, voucher, dan produk digital lainnya ke IP Center*

[Features](#-fitur-utama) • [Quick Start](#-quick-start) • [API Docs](#-api-endpoints) • [Configuration](#-konfigurasi)

</div>

---

## 📖 Tentang

**Auvyn Apies** adalah bridge sederhana yang menghubungkan backend utama Anda (misalnya Cloudflare Worker) dengan IP Center (engine penyedia produk digital). Dengan Auvyn Apies, backend Anda tidak perlu tahu detail rumit IP Center—cukup komunikasi melalui API yang clean dan simple.

### 🎯 Mengapa Auvyn Apies?

- **Abstraksi Kompleksitas**: Backend hanya perlu HTTP request sederhana
- **Security First**: Signature SHA1 + Base64URL, secret authentication
- **Monitoring Built-in**: Logging terstruktur + notifikasi Telegram
- **Event-Driven**: Callback otomatis ke backend untuk setiap event penting
- **Production Ready**: Systemd service, log rotation, error handling

> ⚠️ **Penting**: Semua credential di dokumentasi ini adalah dummy. Gunakan data asli Anda melalui installer atau file `.env`.

---

## ✨ Fitur Utama

### 🔐 Security & Authentication
- **SHA1 + Base64URL Signature** untuk semua request transaksi
- **Secret-based Authentication** untuk proteksi endpoint API
- **Callback Secret** untuk validasi webhook

### 📊 Monitoring & Logging
- **Structured Logging** dengan Winston (per kategori: success, pending, failed)
- **Telegram Notifications** untuk transaksi & event penting
- **Saldo Monitoring** dengan alert otomatis saat saldo rendah
- **Report Endpoint** untuk webhook dari IP Center

### 🔄 Integration
- **RESTful API** yang clean dan mudah digunakan
- **Callback System** ke backend eksternal (Worker, server lain)
- **Multiple Event Types** (transaction, balance, report)

### 🛠️ Operations
- **One-Command Installation** dengan script interaktif
- **Systemd Service** untuk production deployment
- **Log Cleanup Script** untuk maintenance otomatis
- **Health Check Endpoint** untuk monitoring

---

## 🏗️ Arsitektur

```
┌─────────────────┐
│   Frontend/Web  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Backend Utama (Worker) │
│                         │
│  POST /api/transaction  │
│  Header: x-auvyn-secret │
└────────┬────────────────┘
         │
         ▼
┌────────────────────────────┐
│     Auvyn Apies (VPS)      │
│                            │
│  • Signature Generation    │
│  • Request Handling        │
│  • Response Parsing        │
│  • Event Dispatching       │
└────────┬───────────────────┘
         │
         ▼
┌──────────────────────────────┐
│   IP Center (Otomax/SW)      │
│                              │
│  • Process Transaction       │
│  • Send Response             │
│  • Send Report (webhook)     │
└──────┬───────────────┬───────┘
       │               │
       ▼               ▼
   Response        /report
       │               │
       ▼               ▼
   ┌────────────────────────┐
   │   Event Processing     │
   │                        │
   │  • Parse & Classify    │
   │  • Update Balance      │
   │  • Write Logs          │
   │  • Send Notifications  │
   │  • Trigger Callbacks   │
   └────────────────────────┘
```

---

## 🚀 Quick Start

### Instalasi (VPS)

Jalankan satu perintah ini sebagai root:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Matsumiko/auvyn-apies/main/setup.sh)
```

Installer akan:
1. ✅ Install dependencies (curl, git, node)
2. 📦 Clone/update repository ke `/opt/auvyn-apies`
3. 🔧 Install npm packages
4. ⚙️ Setup konfigurasi interaktif
5. 🎯 Create & enable systemd service

### Verifikasi Service

```bash
# Check status
systemctl status auvyn-apies.service

# View logs
journalctl -u auvyn-apies.service -f

# Restart service
systemctl restart auvyn-apies.service
```

---

## 📁 Struktur Project

```
auvyn-apies/
├── 📄 server.js              # Entry point
├── 📦 package.json
├── 🚀 setup.sh               # Quick installer
├── 🧹 cleanup-logs.sh        # Log maintenance script
├── 📝 .env.example           # Template konfigurasi
├── 🙈 .gitignore
├── 📊 logs/                  # Log files (auto-generated)
│   ├── combined.log
│   ├── error.log
│   ├── trx-success.log
│   ├── trx-pending.log
│   ├── trx-failed.log
│   └── report.log
└── 🔧 src/
    ├── config.js             # Configuration loader
    ├── logger.js             # Winston logger setup
    ├── telegram.js           # Telegram notifications
    ├── callback.js           # Backend callback handler
    ├── ipCenter.js           # IP Center client & parser
    ├── server.js             # Express app
    ├── middleware/
    │   └── auth.js           # Authentication middleware
    └── routes/
        ├── api.js            # API endpoints
        └── report.js         # Report webhook endpoint
```

---

## ⚙️ Konfigurasi

### Environment Variables

Buat file `.env` di root project atau gunakan installer interaktif:

```env
# Server Configuration
PORT=5882

# IP Center Configuration
CENTER_URL=http://10.0.0.1:6969
MEMBER_ID=AG000001
PIN=0000
PASSWORD=MyStrongPassword123
SIGN_PREFIX=ENGINE

# Security
AUVYN_SECRET=super-secret-random-string

# Callback Configuration (Optional)
CALLBACK_URL=https://worker.example.com/auvyn/callback
CALLBACK_SECRET=another-secret-or-same-as-above

# Logging
LOGS_DIR=./logs
BALANCE_LOW_LIMIT=50000

# Telegram Notifications (Optional)
# Success Notifications
TG_SUCCESS_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TG_SUCCESS_CHAT_ID=12345678

# Pending Notifications
TG_PENDING_BOT_TOKEN=
TG_PENDING_CHAT_ID=

# Failed Notifications
TG_FAILED_BOT_TOKEN=
TG_FAILED_CHAT_ID=

# System Notifications (Reports & Low Balance)
TG_SYSTEM_BOT_TOKEN=
TG_SYSTEM_CHAT_ID=
```

### Penjelasan Parameter

| Parameter | Required | Deskripsi |
|-----------|----------|-----------|
| `PORT` | ✅ | Port server (default: 5882) |
| `CENTER_URL` | ✅ | Base URL IP Center (tanpa trailing slash) |
| `MEMBER_ID` | ✅ | ID agen dari provider |
| `PIN` | ✅ | PIN agen |
| `PASSWORD` | ✅ | Password agen |
| `SIGN_PREFIX` | ✅ | Prefix untuk signature (sesuai dokumen provider) |
| `AUVYN_SECRET` | ✅ | Secret untuk autentikasi API |
| `CALLBACK_URL` | ❌ | URL backend untuk menerima callback |
| `CALLBACK_SECRET` | ❌ | Secret untuk validasi callback (default: sama dengan `AUVYN_SECRET`) |
| `LOGS_DIR` | ✅ | Direktori penyimpanan log (default: ./logs) |
| `BALANCE_LOW_LIMIT` | ✅ | Threshold saldo rendah dalam Rupiah |
| `TG_*_BOT_TOKEN` | ❌ | Token bot Telegram untuk notifikasi |
| `TG_*_CHAT_ID` | ❌ | Chat ID untuk notifikasi Telegram |

---

## 🔌 API Endpoints

Semua endpoint `/api/*` memerlukan header autentikasi:

```http
x-auvyn-secret: <AUVYN_SECRET>
```

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

Test koneksi dan validasi secret.

```http
POST /api/ping
Headers: x-auvyn-secret: <secret>
```

**Response:**
```json
{
  "ok": true,
  "message": "pong",
  "time": "2025-01-01T00:00:00.000Z"
}
```

---

### 💳 Transaction

Endpoint utama untuk transaksi produk digital.

```http
POST /api/transaction
Content-Type: application/json
x-auvyn-secret: <secret>
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
    "source": "kuota-worker",
    "customData": "anything"
  }
}
```

| Field | Type | Required | Deskripsi |
|-------|------|----------|-----------|
| `product` | string | ✅ | Kode produk (sesuai IP Center) |
| `dest` | string | ✅ | Nomor tujuan/ID tujuan |
| `qty` | number | ❌ | Jumlah/quantity (default: 1) |
| `refID` | string | ❌ | Reference ID (auto-generate jika kosong) |
| `meta` | object | ❌ | Data tambahan (disimpan di log & callback) |

**Response Success:**
```json
{
  "ok": true,
  "statusCode": 200,
  "refID": "AVN1736425720255",
  "product": "PFF",
  "dest": "085727035336",
  "qty": 1,
  "sign": "mF8xKJ...",
  "centerUrl": "http://127.0.0.1:6969/trx?product=PFF&...",
  "raw": "Free Fire kode \"PFF\" Cuan#R175152090...",
  "meta": {
    "orderId": "INV-123"
  },
  "balanceInfo": {
    "raw": "77.827.622",
    "remaining": 77827622
  },
  "category": "success",
  "providerResult": {
    "state": "SUCCESS",
    "code": "SUKSES",
    "trxid": "175152090",
    "tujuan": "AKX3CF8.087810203267",
    "sn": "ABC123XYZ",
    "duplicate": false,
    "raw": "..."
  },
  "isDuplicate": false,
  "receivedAt": "2025-01-01T00:00:00.000Z"
}
```

**Category Values:**
- `success` - Transaksi berhasil
- `pending` - Transaksi diproses/menunggu
- `failed` - Transaksi gagal

**Provider Result Codes:**
| Code | State | Deskripsi |
|------|-------|-----------|
| `SUKSES` | SUCCESS | Transaksi berhasil |
| `SUKSES_SUDAH_PERNAH` | SUCCESS | Duplikat (sudah pernah diproses) |
| `GAGAL_TIMEOUT` | FAILED | Timeout ke provider |
| `GAGAL_TUJUAN_SALAH` | FAILED | Nomor/tujuan tidak valid |
| `GAGAL_SALAH_KODE` | FAILED | Kode produk tidak valid |
| `GAGAL_SALDO_TIDAK_CUKUP` | FAILED | Saldo tidak mencukupi |
| `GAGAL_BLACKLIST` | FAILED | Nomor dalam blacklist |
| `PENDING_AKAN_DIPROSES` | PENDING | Akan diproses |
| `PENDING_MENUNGGU_TRX_SEBELUMNYA` | PENDING | Menunggu transaksi sebelumnya |
| `PENDING_SEDANG_DIPROSES` | PENDING | Sedang diproses |

---

### 💰 Check Balance

Cek saldo M-Bal IP Center.

```http
POST /api/balance
Content-Type: application/json
x-auvyn-secret: <secret>
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
  "statusCode": 200,
  "memberID": "AG000001",
  "sign": "...",
  "centerUrl": "http://127.0.0.1:6969/balance?memberID=AG000001&sign=...",
  "raw": "M-Bal : 77.872.622 - 45.000 = 77.827.622",
  "balanceInfo": {
    "raw": "77.827.622",
    "remaining": 77827622
  },
  "providerResult": {
    "state": "UNKNOWN",
    "code": "UNKNOWN",
    "trxid": null,
    "tujuan": null,
    "sn": null,
    "duplicate": false,
    "raw": "M-Bal : 77.872.622 - 45.000 = 77.827.622"
  },
  "meta": {
    "source": "manual-check"
  },
  "receivedAt": "2025-01-01T00:00:00.000Z"
}
```

> 💡 **Tip**: Jika `balanceInfo.remaining <= BALANCE_LOW_LIMIT`, notifikasi otomatis akan dikirim via Telegram (bot sistem).

---

### 🎫 Ticket M-Bal

Buat tiket topup saldo M-Bal.

```http
POST /api/ticket-mbal
Content-Type: application/json
x-auvyn-secret: <secret>
```

**Request Body:**
```json
{
  "amount": 25000000,
  "memberId": "AG000001",
  "meta": {
    "source": "owner",
    "note": "topup saldo awal"
  }
}
```

| Field | Type | Required | Deskripsi |
|-------|------|----------|-----------|
| `amount` | number | ✅ | Jumlah topup (Rupiah, harus > 0) |
| `memberId` | string | ❌ | ID member (default: dari .env) |
| `meta` | object | ❌ | Data tambahan |

**Response:**
```json
{
  "ok": true,
  "statusCode": 200,
  "memberID": "AG000001",
  "amount": 25000000,
  "sign": "...",
  "centerUrl": "http://127.0.0.1:6969/?cmd=ticket&memberid=AG000001&amount=25000000&sign=...",
  "raw": "Tiket M-Bal berhasil dibuat...",
  "balanceInfo": {
    "raw": "100.000.000",
    "remaining": 100000000
  },
  "providerResult": {
    "state": "UNKNOWN",
    "code": "UNKNOWN",
    "trxid": null,
    "tujuan": null,
    "sn": null,
    "duplicate": false,
    "raw": "Tiket M-Bal berhasil dibuat..."
  },
  "meta": {
    "source": "owner",
    "note": "topup saldo awal"
  },
  "receivedAt": "2025-01-01T00:00:00.000Z"
}
```

---

### 📨 Report Webhook

Endpoint untuk menerima report/webhook dari IP Center.

```http
ALL /report
```

> ⚠️ **Setup**: Konfigurasikan URL ini sebagai `REPORTURL` di pengaturan IP Center Anda.

**Behavior:**
- Menerima semua HTTP methods (GET, POST, dll)
- Log semua data (query, body, headers) ke `logs/report.log`
- Kirim notifikasi Telegram (bot sistem)
- Trigger callback dengan event `transaction.report`
- Response: `text/plain` dengan isi `OK`

---

## 🔔 Callback System

Jika `CALLBACK_URL` dikonfigurasi, Auvyn Apies akan mengirim POST request ke backend Anda untuk setiap event.

### Event Types

| Event | Trigger | Payload |
|-------|---------|---------|
| `transaction.request` | Setiap transaksi ke IP Center | Full transaction response |
| `transaction.report` | Data diterima di `/report` | Report data |
| `balance.check` | Cek saldo via `/api/balance` | Balance response |
| `balance.ticket` | Tiket M-Bal via `/api/ticket-mbal` | Ticket response |

### Request Format

```http
POST <CALLBACK_URL>
Content-Type: application/json
x-auvyn-callback-secret: <CALLBACK_SECRET>
x-auvyn-event: transaction.request
```

**Body:** Response payload lengkap dari endpoint terkait.

### Implementasi Backend (Example)

```javascript
// Node.js / Express
app.post('/auvyn/callback', async (req, res) => {
  // Validasi secret
  const secret = req.headers['x-auvyn-callback-secret'];
  if (secret !== process.env.AUVYN_CALLBACK_SECRET) {
    return res.status(401).json({ error: 'Invalid secret' });
  }

  const event = req.headers['x-auvyn-event'];
  const payload = req.body;

  switch (event) {
    case 'transaction.request':
      // Update status order berdasarkan category & providerResult
      await updateOrderStatus(payload.refID, payload.category, payload);
      break;

    case 'transaction.report':
      // Update final status dari report IP Center
      await processFinalReport(payload);
      break;

    case 'balance.check':
      // Simpan/display saldo terkini
      await saveBalanceSnapshot(payload.balanceInfo);
      break;

    case 'balance.ticket':
      // Log riwayat topup
      await logTopupHistory(payload);
      break;
  }

  res.json({ received: true });
});
```

---

## 📊 Logging & Monitoring

### File Logs

| File | Isi |
|------|-----|
| `combined.log` | Semua log activity |
| `error.log` | Error & exceptions |
| `trx-success.log` | Transaksi berhasil |
| `trx-pending.log` | Transaksi pending |
| `trx-failed.log` | Transaksi gagal |
| `report.log` | Data dari `/report` webhook |

### Telegram Notifications

#### Transaction Notifications

Setiap transaksi mengirim notifikasi dengan format:

**Success:**
```
✅ TRX SUCCESS

RefID: AVN1736425720255
Product: PFF
Dest: 085727035336
Qty: 1
Status: 200
Saldo Tersisa: Rp 77,827,622

Raw Response:
Free Fire kode "PFF" Cuan#R175152090...

Meta:
{
  "orderId": "INV-123",
  "source": "kuota-worker"
}
```

**Pending:**
```
🕒 TRX PENDING

RefID: AVN1736425720255
...
```

**Failed:**
```
❌ TRX FAILED

RefID: AVN1736425720255
Reason: GAGAL_SALDO_TIDAK_CUKUP
...
```

#### System Notifications

**Low Balance Alert:**
```
⚠️ SALDO RENDAH!

Member ID: AG000001
Saldo Saat Ini: Rp 45,000
Limit: Rp 50,000

Silakan topup segera!
```

**Report Received:**
```
📨 REPORT RECEIVED

Method: GET
IP: 10.0.0.1

Query Params:
refID=AVN123...

Raw:
...
```

---

## 🧹 Maintenance

### Log Cleanup

Auvyn Apies menyediakan script untuk membersihkan log lama:

```bash
cd /opt/auvyn-apies

# Hapus log lebih dari 7 hari
./cleanup-logs.sh

# Hapus log lebih dari 14 hari
KEEP_DAYS=14 ./cleanup-logs.sh
```

### Setup Cron (Automatic Cleanup)

Bersihin log otomatis setiap hari jam 3 pagi:

```bash
# Edit crontab
crontab -e

# Tambahkan baris ini:
0 3 * * * /bin/bash /opt/auvyn-apies/cleanup-logs.sh >> /var/log/cleanup-auvyn.log 2>&1
```

### Service Management

```bash
# Start
systemctl start auvyn-apies.service

# Stop
systemctl stop auvyn-apies.service

# Restart
systemctl restart auvyn-apies.service

# Enable auto-start on boot
systemctl enable auvyn-apies.service

# Disable auto-start
systemctl disable auvyn-apies.service

# View logs
journalctl -u auvyn-apies.service -f

# View last 100 lines
journalctl -u auvyn-apies.service -n 100
```

---

## 💻 Development

### Setup Local Environment

```bash
# Clone repository
git clone https://github.com/Matsumiko/auvyn-apies.git
cd auvyn-apies

# Copy environment template
cp .env.example .env

# Edit dengan data sandbox/dummy
nano .env

# Install dependencies
npm install

# Start development server
npm start
```

Server akan berjalan di `http://localhost:5882`.

### Testing Endpoints

```bash
# Health check
curl http://localhost:5882/

# Ping (butuh secret)
curl -X POST http://localhost:5882/api/ping \
  -H "x-auvyn-secret: your-secret"

# Transaction
curl -X POST http://localhost:5882/api/transaction \
  -H "content-type: application/json" \
  -H "x-auvyn-secret: your-secret" \
  -d '{
    "product": "PFF",
    "dest": "085727035336",
    "qty": 1,
    "meta": {
      "orderId": "TEST-001"
    }
  }'

# Check balance
curl -X POST http://localhost:5882/api/balance \
  -H "content-type: application/json" \
  -H "x-auvyn-secret: your-secret" \
  -d '{}'
```

---

## 🔒 Security Best Practices

### 1. Environment Variables
- ✅ **Jangan commit** file `.env` ke repository
- ✅ Gunakan **strong random strings** untuk secrets
- ✅ **Rotate secrets** secara berkala
- ✅ Simpan backup `.env` di tempat aman (encrypted)

### 2. Network
- ✅ Gunakan **firewall** (ufw, iptables)
- ✅ **Whitelist** IP backend jika memungkinkan
- ✅ Pertimbangkan **VPN/tunnel** untuk komunikasi antar server
- ✅ Gunakan **HTTPS/TLS** untuk production (reverse proxy: nginx/caddy)

### 3. Monitoring
- ✅ Setup **alerting** untuk error rate tinggi
- ✅ Monitor **disk space** (log files bisa besar)
- ✅ Review **logs** secara berkala
- ✅ Track **balance trends** untuk deteksi anomali

### 4. Updates
- ✅ Update **Node.js** & **dependencies** berkala
- ✅ Review **security advisories** (npm audit)
- ✅ Backup data sebelum update major version
- ✅ Test di staging sebelum update production

---

## 🐛 Troubleshooting

### Service tidak start

```bash
# Check logs
journalctl -u auvyn-apies.service -n 50

# Check .env file
cat /opt/auvyn-apies/.env

# Check permissions
ls -la /opt/auvyn-apies

# Check Node.js version
node --version  # Should be >= 18
```

### Transaksi selalu failed

- ✅ Cek `CENTER_URL` (pastikan IP/port benar)
- ✅ Verifikasi `MEMBER_ID`, `PIN`, `PASSWORD`
- ✅ Test koneksi: `curl -v <CENTER_URL>`
- ✅ Cek signature: review `SIGN_PREFIX`
- ✅ Lihat log detail di `logs/trx-failed.log`

### Callback tidak sampai ke backend

- ✅ Cek `CALLBACK_URL` (typo?)
- ✅ Verify backend bisa diakses dari VPS
- ✅ Test: `curl -X POST <CALLBACK_URL> -d '{"test":true}'`
- ✅ Check backend logs untuk request masuk
- ✅ Validate `CALLBACK_SECRET` match di kedua sisi

### Telegram notification tidak masuk

- ✅ Verifikasi `TG_*_BOT_TOKEN` dan `TG_*_CHAT_ID`
- ✅ Test bot token: `curl https://api.telegram.org/bot<TOKEN>/getMe`
- ✅ Pastikan bot sudah di-add ke chat/group
- ✅ Check logs untuk error Telegram API

### Log files terlalu besar

```bash
# Manual cleanup
cd /opt/auvyn-apies
./cleanup-logs.sh

# Setup automatic cleanup (cron)
crontab -e
# Add: 0 3 * * * /bin/bash /opt/auvyn-apies/cleanup-logs.sh

# Compress old logs
gzip logs/*.log

# Atau gunakan logrotate
```

---

## 📞 Support & Community

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/Matsumiko/auvyn-apies/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/Matsumiko/auvyn-apies/discussions)
- 📖 **Documentation**: [Wiki](https://github.com/Matsumiko/auvyn-apies/wiki)

---

## 🤝 Contributing

Contributions are welcome! Silakan:

1. Fork repository
2. Buat feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- IP Center & Provider communities
- All contributors and users
- Open source libraries used in this project

---

<div align="center">

**Made with ❤️ for Indonesian Digital Product Sellers**

⭐ Star project ini jika membantu! ⭐

</div>