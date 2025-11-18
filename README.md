# Auvyn Apies

Bridge sederhana untuk transaksi ke IP Center (engine penyedia pulsa) dengan:

- Signature SHA1 + Base64URL,
- Logging terstruktur memakai Winston,
- Notifikasi Telegram (success / pending / failed / report / saldo rendah),
- Callback ke backend lain.

> Catatan: semua contoh ID, PIN, password pada repo ini **hanya dummy**.  
> Masukkan data asli kamu melalui installer interaktif (`setup.sh`).

## Fitur

- Endpoint HTTP di VPS (Node.js + Express).
- Menghitung signature dengan pola:

  ```text
  <SIGN_PREFIX>|memberID|product|dest|refID|pin|password
  ```

  lalu:

  - di-hash dengan `SHA1`,
  - di-encode ke Base64 URL-safe (`+` → `-`, `/` → `_`, hapus `=` di akhir).

- Mengirim request ke `CENTER_URL/trx?...` sesuai format IP center.
- Proteksi `/api/*` dengan `AUVYN_SECRET`.
- Endpoint `/report` sebagai target `REPORTURL` dari IP center.
- Forward event ke backend lain via `CALLBACK_URL`.
- Logging:
  - `logs/combined.log` — log umum.
  - `logs/error.log` — error.
  - `logs/trx-success.log` — transaksi kategori sukses.
  - `logs/trx-pending.log` — transaksi kategori pending / unknown.
  - `logs/trx-failed.log` — transaksi gagal.
  - `logs/report.log` — data yang diterima di `/report`.
- Notifikasi Telegram:
  - Bot & chat terpisah untuk success / pending / failed.
  - Bot sistem untuk report dan saldo rendah.
- Quick install: satu perintah untuk setup + systemd service.

## Alur Besar

```text
FE / Web
    │
    ▼
Cloudflare Worker / Backend utama
    │  (POST /api/transaction + header x-auvyn-secret)
    ▼
Auvyn Apies (VPS)
    │  (GET ke CENTER_URL/trx?...)
    ▼
IP Center
    │
    ├── response langsung ke Auvyn Apies
    │       └── balikan JSON ke Worker
    │       └── catat ke logs + kirim Telegram
    │       └── kirim callback event "transaction.request"
    │
    └── (opsional) HTTP reply ke /report
            └── catat ke logs/report.log
            └── kirim Telegram (bot sistem)
            └── kirim callback event "transaction.report"
```

## Kebutuhan

- VPS Linux (Debian/Ubuntu).
- `bash`, `curl`, `git`, `systemd`.
- Node.js **18+** (untuk dukungan `fetch` native).

## Quick Install

Setelah repo ini kamu push ke GitHub (`Matsumiko/auvyn-apies`):

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Matsumiko/auvyn-apies/main/setup.sh)
```

Installer akan:

1. Pastikan `curl`, `git`, dan `node` tersedia.
2. Clone / update repo ke `/opt/auvyn-apies`.
3. `npm install --production`.
4. Tanya konfigurasi:

   - `PORT`
   - `CENTER_URL`
   - `MEMBER_ID`
   - `PIN`
   - `PASSWORD`
   - `SIGN_PREFIX`
   - `AUVYN_SECRET`
   - `CALLBACK_URL` (opsional)
   - `CALLBACK_SECRET` (opsional)
   - `LOGS_DIR`
   - `BALANCE_LOW_LIMIT`
   - `TG_*` (token & chat id untuk Telegram, opsional)

5. Membuat `.env`.
6. Membuat & mengaktifkan service systemd `auvyn-apies.service`.

Cek servis:

```bash
systemctl status auvyn-apies.service
journalctl -u auvyn-apies.service -f
```

## Struktur Project

```text
auvyn-apies/
├── server.js              # Entry point (start server)
├── package.json
├── setup.sh               # Quick installer
├── .env.example
├── .gitignore
├── logs/                  # Folder log (diabaikan git)
└── src/
    ├── config.js          # Baca env & konfigurasi
    ├── logger.js          # Winston logger
    ├── telegram.js        # Helper notifikasi Telegram
    ├── callback.js        # Helper kirim callback ke backend
    ├── ipCenter.js        # Client ke IP center + categorizer
    ├── server.js          # Express app
    ├── middleware/
    │   └── auth.js        # Middleware cek AUVYN_SECRET
    └── routes/
        ├── api.js         # /api/ping, /api/transaction
        └── report.js      # /report (REPORTURL dari IP center)
```

## Konfigurasi `.env`

Contoh `.env` (lihat `.env.example`):

```ini
PORT=5882
CENTER_URL=http://10.0.0.1:6969

MEMBER_ID=AG000001
PIN=0000
PASSWORD=MyStrongPassword123
SIGN_PREFIX=ENGINE

AUVYN_SECRET=super-secret-random-string

CALLBACK_URL=https://worker.example.com/auvyn/callback
CALLBACK_SECRET=another-secret-or-same-as-above

LOGS_DIR=./logs
BALANCE_LOW_LIMIT=50000

TG_SUCCESS_BOT_TOKEN=123:ABC
TG_SUCCESS_CHAT_ID=12345678

TG_PENDING_BOT_TOKEN=
TG_PENDING_CHAT_ID=

TG_FAILED_BOT_TOKEN=
TG_FAILED_CHAT_ID=

TG_SYSTEM_BOT_TOKEN=
TG_SYSTEM_CHAT_ID=
```

- **SIGN_PREFIX**: prefix string untuk perhitungan signature (disediakan oleh pihak IP center).
- **BALANCE_LOW_LIMIT**: jika hasil parsing saldo tersisa ≤ nilai ini, bot sistem akan kirim notifikasi saldo rendah.
- Token & chat ID Telegram boleh dikosongkan jika tidak ingin notifikasi.

## Endpoint

### 1. `GET /`

Health check dasar.

```json
{
  "ok": true,
  "name": "auvyn-apies",
  "message": "IP center bridge online",
  "time": "2025-01-01T00:00:00.000Z"
}
```

### 2. `POST /api/ping`

Untuk cek secret dari backend.

**Headers:**

- `x-auvyn-secret: <AUVYN_SECRET>`

**Response:**

```json
{
  "ok": true,
  "message": "pong",
  "time": "..."
}
```

### 3. `POST /api/transaction`

Endpoint yang dipanggil Worker/backend.

**Headers:**

- `content-type: application/json`
- `x-auvyn-secret: <AUVYN_SECRET>`

**Body:**

```json
{
  "product": "XDED5",
  "dest": "087727009745",
  "qty": 1,
  "refID": "AVN1234567890",
  "meta": {
    "orderId": "INV-123"
  }
}
```

- `product` & `dest` wajib.
- `qty` default 1.
- `refID` opsional (auto-generate jika kosong).
- `meta` opsional (dict bebas, ikut disimpan di log + dikirim ke callback).

**Alur internal:**

1. Generate/refine `refID`.
2. Hit `CENTER_URL/trx?...` dengan signature sesuai konfigurasi.
3. Baca teks balasan.
4. Tentukan kategori:

   - `failed`: HTTP status != 200 atau teks mengandung `gagal/failed/reject` (case-insensitive).
   - `success`: teks mengandung `sukses/berhasil/ok`.
   - `pending`: default jika tidak terdeteksi di atas, atau teks mengandung `diproses/akan diproses`.

5. Coba parse saldo:

   - Pola utama: `"Saldo 100.754 - 2.805 = 97.949"`.
   - Fallback: `"Saldo 97.949"`.

6. Tulis log ke file kategori masing-masing.
7. Kirim notifikasi Telegram (jika token/chat diset).
8. Kirim callback ke `CALLBACK_URL` dengan event `transaction.request`.

**Response ke caller:**

```json
{
  "ok": true,
  "statusCode": 200,
  "refID": "AVN1736425720255",
  "product": "XDED5",
  "dest": "087727009745",
  "qty": 1,
  "sign": "base64-url-sign",
  "centerUrl": "http://.../trx?product=...",
  "raw": "#211930472 XDED5.0877... akan diproses @07:28. Saldo ...",
  "meta": {
    "orderId": "INV-123"
  },
  "balanceInfo": {
    "raw": "97.949",
    "remaining": 97949
  },
  "category": "pending",
  "receivedAt": "2025-01-01T00:00:00.000Z"
}
```

### 4. `ALL /report`

Digunakan sebagai target `REPORTURL` dari IP center.

- Auvyn Apies tidak mengubah isi, hanya:
  - log ke `logs/report.log`,
  - kirim Telegram (bot sistem),
  - kirim callback event `transaction.report`.

**Response:** selalu `text/plain` dengan isi `OK`.

## Callback ke Backend

Jika `CALLBACK_URL` diset, Auvyn Apies akan mengirim:

```json
{
  "ok": true,
  "event": "transaction.request" | "transaction.report",
  "data": { ...payload... }
}
```

Namun dalam implementasi ini, objek payload dikirim langsung (tanpa wrapper `event/data`) agar fleksibel — Worker cukup membaca header:

- `x-auvyn-callback-secret`
- `x-auvyn-event` (`transaction.request` atau `transaction.report`)

Contoh handler di backend:

```js
async function handleAuvynCallback(req) {
  const secret = req.headers['x-auvyn-callback-secret'];
  const event = req.headers['x-auvyn-event'];

  if (secret !== process.env.AUVYN_CALLBACK_SECRET) {
    throw new Error('invalid callback secret');
  }

  const payload = req.body; // berisi resultPayload / reportPayload

  if (event === 'transaction.request') {
    // update status awal transaksi
  } else if (event === 'transaction.report') {
    // update status berdasarkan laporan
  }
}
```

## Development Local

```bash
git clone https://github.com/Matsumiko/auvyn-apies.git
cd auvyn-apies
cp .env.example .env
# Edit .env dengan data sandbox / dummy
npm install
npm start
```

Server akan jalan di `http://localhost:5882`.

## Lisensi

MIT.
