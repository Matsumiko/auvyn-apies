# Auvyn Apies

_Auvyn Apies_ adalah **bridge sederhana** untuk transaksi ke **IP Center (engine penyedia pulsa/kuota/voucher)**.  
Tujuan utamanya: backend utama kamu (misal Cloudflare Worker) nggak perlu tahu detail aneh-aneh IP Center — cukup ngobrol ke Auvyn Apies.

Fitur inti:

- Signature **SHA1 + Base64URL** untuk request transaksi.
- Parser balasan **Otomax** menggunakan **regex resmi** dari dokumentasi provider.
- **Logging terstruktur** (Winston) ke file terpisah per kategori.
- **Notifikasi Telegram** (success / pending / failed / report / saldo rendah).
- **Callback** ke backend lain (misal Worker) untuk setiap event penting.
- Endpoint tambahan untuk:
  - **cek saldo (M-Bal)**,
  - **tiket topup M-Bal**.

> ⚠️ **Catatan:**  
> Semua contoh `MEMBER_ID`, `PIN`, `PASSWORD` di repo ini **dummy**.  
> Pakai data asli kamu lewat installer interaktif (`setup.sh`) atau file `.env`.

---

## Fitur Utama

- HTTP server di VPS (Node.js + Express).
- Perhitungan signature **transaksi** dengan pola:

  ```text
  <SIGN_PREFIX>|memberID|product|dest|refID|pin|password
````

lalu:

* di-hash dengan `SHA1`,

* di-encode ke Base64 URL-safe:

  * `+` → `-`
  * `/` → `_`
  * hapus `=` di akhir.

* Perhitungan signature **M-Bal** (cek saldo & tiket):

  ```text
  <SIGN_PREFIX>|memberID|PIN|PASSWORD
  ```

  lalu diproses sama: `SHA1` → Base64URL.
  Kalau provider kamu punya rumus SIGN khusus, cukup edit di fungsi `buildBalanceSign()`.

* Kirim request ke:

  * `CENTER_URL/trx?...` untuk transaksi,
  * `CENTER_URL/balance?memberID=...&sign=...` untuk cek saldo,
  * `CENTER_URL/?cmd=ticket&memberid=...&amount=...&sign=...` untuk tiket topup M-Bal.

* Proteksi seluruh endpoint `/api/*` dengan secret `AUVYN_SECRET`.

* Endpoint `/report` sebagai target `REPORTURL` dari IP center.

* Forward semua event penting ke backend lain via `CALLBACK_URL`.

* Logging:

  * `logs/combined.log` — log umum.
  * `logs/error.log` — error.
  * `logs/trx-success.log` — transaksi kategori sukses.
  * `logs/trx-pending.log` — transaksi kategori pending / unknown.
  * `logs/trx-failed.log` — transaksi gagal.
  * `logs/report.log` — data yang diterima di `/report`.

* Notifikasi Telegram:

  * Bot & chat ID terpisah untuk `success`, `pending`, `failed`.
  * Bot sistem untuk `report` dan saldo rendah.

* Quick install: satu perintah untuk setup + systemd service.

* Script **`cleanup-logs.sh`** untuk bersihin log yang sudah terlalu lama.

---

## Alur Besar

```text
Frontend / Web
    │
    ▼
Backend utama (misal Worker Cloudflare)
    │  (POST /api/transaction + header x-auvyn-secret)
    ▼
Auvyn Apies (Home SERVER)
    │
    │  (GET ke CENTER_URL/trx?... + SIGN)
    ▼
IP Center (Otomax / sw pulsa)
    │
    ├─► Response langsung ke Auvyn Apies
    │      ├─ parse regex Otomax (status, sn, tujuan, dll)
    │      ├─ klasifikasi: success / failed / pending
    │      ├─ update saldo (M-Bal) jika ada
    │      ├─ tulis ke log per kategori
    │      ├─ kirim notif Telegram
    │      └─ kirim callback event:
    │             - transaction.request
    │             - balance.check / balance.ticket
    │
    └─► (opsional) HTTP ke /report (REPORTURL)
           ├─ tulis log ke logs/report.log
           ├─ kirim notif Telegram (bot sistem)
           └─ kirim callback event:
                  - transaction.report
```

---

## Kebutuhan

* VPS Linux (Debian/Ubuntu) atau turunan.
* `bash`, `curl`, `git`, `systemd`.
* **Node.js 18+** (butuh `fetch` native di Node).

---

## Quick Install

Jalankan di VPS (sebagai root):

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Matsumiko/auvyn-apies/main/setup.sh)
```

Installer akan:

1. Pastikan `curl`, `git`, dan `node` tersedia.

2. Clone / update repo ke `/opt/auvyn-apies`.

3. Jalankan `npm install --production`.

4. Tanya konfigurasi dan membuat `.env`:

   * `PORT`
   * `CENTER_URL`
   * `MEMBER_ID`
   * `PIN`
   * `PASSWORD`
   * `SIGN_PREFIX`
   * `AUVYN_SECRET`
   * `CALLBACK_URL` (opsional)
   * `CALLBACK_SECRET` (opsional, default = `AUVYN_SECRET`)
   * `LOGS_DIR`
   * `BALANCE_LOW_LIMIT`
   * `TG_*` (token & chat id Telegram, opsional)

5. Membuat & mengaktifkan service systemd `auvyn-apies.service`.

Cek servis:

```bash
systemctl status auvyn-apies.service
journalctl -u auvyn-apies.service -f
```

---

## Struktur Project

```text
auvyn-apies/
├── server.js              # Entry point (start server)
├── package.json
├── setup.sh               # Quick installer
├── cleanup-logs.sh        # Script bersihin log lama
├── .env.example           # Contoh konfigurasi environment
├── .gitignore
├── logs/                  # Folder log (diabaikan git)
└── src/
    ├── config.js          # Baca env & konfigurasi
    ├── logger.js          # Winston logger
    ├── telegram.js        # Helper notifikasi Telegram
    ├── callback.js        # Helper kirim callback ke backend
    ├── ipCenter.js        # Client ke IP center + parser Otomax
    ├── server.js          # Express app
    ├── middleware/
    │   └── auth.js        # Middleware cek AUVYN_SECRET
    └── routes/
        ├── api.js         # /api/ping, /api/transaction, /api/balance, /api/ticket-mbal
        └── report.js      # /report (REPORTURL dari IP center)
```

---

## Konfigurasi `.env`

Contoh `.env` (lihat juga `.env.example`):

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

Keterangan singkat:

* **CENTER_URL**
  Base URL IP Center tanpa path, misal `http://127.0.0.1:6969`.

* **MEMBER_ID, PIN, PASSWORD**
  Kredensial agen yang diberikan oleh provider.

* **SIGN_PREFIX**
  Prefix string untuk perhitungan signature (ikuti dokumen provider).

* **AUVYN_SECRET**
  Secret yang harus dikirim di header tiap request `/api/*` oleh backend kamu (`x-auvyn-secret`).

* **CALLBACK_URL / CALLBACK_SECRET**
  Kalau diisi, setiap event penting akan di-POST ke URL ini dengan header:

  * `x-auvyn-callback-secret: <CALLBACK_SECRET>`
  * `x-auvyn-event: transaction.request | transaction.report | balance.check | balance.ticket`

* **LOGS_DIR**
  Folder utama log. Default `./logs`.

* **BALANCE_LOW_LIMIT**
  Ambang saldo tersisa (Rupiah). Kalau hasil parsing M-Bal ≤ nilai ini → kirim notifikasi saldo rendah via bot sistem.

* **TG_* (opsional)**
  Token & chat ID Telegram. Kosongkan jika tidak ingin notifikasi.

---

## Endpoint API

Semua endpoint `/api/*` wajib menyertakan:

```http
x-auvyn-secret: <AUVYN_SECRET>
```

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

Untuk cek koneksi & validasi secret.

**Headers:**

* `x-auvyn-secret: <AUVYN_SECRET>`

**Response:**

```json
{
  "ok": true,
  "message": "pong",
  "time": "..."
}
```

### 3. `POST /api/transaction`

Endpoint utama untuk transaksi produk (pulsa / kuota / voucher / game, dll).

**Headers:**

* `content-type: application/json`
* `x-auvyn-secret: <AUVYN_SECRET>`

**Body:**

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

* `product` & `dest` **wajib**.
* `qty` default `1`.
* `refID` opsional (auto-generate dengan prefix `AVN` kalau kosong).
* `meta` opsional (apapun, ikut disimpan di log + dikirim ke callback & Telegram).

**Alur internal singkat:**

1. Bangun `refID` (pakai yang dikirim atau generate).

2. Hit:

   ```text
   CENTER_URL/trx?product=...&qty=...&dest=...&refID=...&memberID=...&sign=...
   ```

3. Baca `rawText` balasan.

4. Parsir menggunakan regex Otomax:

   * Baca `trxid`, `tujuan`, `sn`, dll.
   * Deteksi status:

     * `SUKSES`
     * `GAGAL` (timeout, tujuan salah, salah kode, saldo tidak cukup, blacklist, dsb).
     * `PENDING` (akan diproses, menunggu trx sebelumnya, sedang diproses).
     * `NOT_FOUND` (untuk kasus cek transaksi).

5. Mapping ke kategori internal:

   * `category: "success"`
     kalau parser mengembalikan `SUCCESS`.
   * `category: "failed"`
     kalau parser `FAILED` / `NOT_FOUND`, atau HTTP status ≠ 200.
   * `category: "pending"`
     kalau parser `PENDING` atau fallback heuristik.

6. Parse saldo (`M-Bal` atau `Saldo`) bila ada.

7. Tulis log ke file kategori masing-masing.

8. Kirim notifikasi Telegram.

9. Kirim callback event `transaction.request`.

**Contoh Response:**

```json
{
  "ok": true,
  "statusCode": 200,
  "refID": "AVN1736425720255",
  "product": "PFF",
  "dest": "085727035336",
  "qty": 1,
  "sign": "base64-url-sign",
  "centerUrl": "http://127.0.0.1:6969/trx?product=PFF&...",
  "raw": "Free Fire kode \"PFF\" Cuan#R175152090 #410223217 AKX3CF8.087810203267 akan diproses @18:05. M-Bal : 77.872.622 - 45.000 = 77.827.622#...",
  "meta": {
    "orderId": "INV-123"
  },
  "balanceInfo": {
    "raw": "77.827.622",
    "remaining": 77827622
  },
  "category": "pending",
  "providerResult": {
    "state": "PENDING",
    "code": "PENDING_AKAN_DIPROSES",
    "trxid": "175152090",
    "tujuan": "AKX3CF8.087810203267",
    "sn": null,
    "duplicate": false,
    "raw": "Free Fire kode \"PFF\" Cuan#R175152090 #410223217 AKX3CF8.087810203267 akan diproses ..."
  },
  "isDuplicate": false,
  "receivedAt": "2025-01-01T00:00:00.000Z"
}
```

Field penting:

* `category` → status yang sebaiknya dipakai di UI / backend kamu.
* `providerResult.code` → kode internal hasil regex (misal `SUKSES`, `GAGAL_TIMEOUT`, `GAGAL_TUJUAN_SALAH`, `SUKSES_SUDAH_PERNAH`, dst).
* `providerResult.sn` → SN/Ref jika tersedia.
* `isDuplicate` → `true` kalau provider terdeteksi “sudah pernah” (status=20).

### 4. `POST /api/balance`

Cek saldo M-Bal ke IP Center.

**Headers:**

* `content-type: application/json`
* `x-auvyn-secret: <AUVYN_SECRET>`

**Body (opsional):**

```json
{
  "memberId": "AG000001",
  "meta": {
    "source": "manual-check"
  }
}
```

* `memberId` opsional; kalau kosong akan pakai `MEMBER_ID` dari `.env`.
* `meta` opsional.

**Alur internal:**

* Bangun SIGN khusus balance.

* Hit:

  ```text
  CENTER_URL/balance?memberID=<memberId>&sign=<sign>
  ```

* Parse teks balasan:

  * Format baru: `M-Bal : 77.872.622 - 45.000 = 77.827.622`
  * Format simple: `M-Bal : 7.065.077`
  * Fallback: pola lama `Saldo ...` kalau ada.

* Kirim callback event `balance.check`.

* Jika `balance.remaining <= BALANCE_LOW_LIMIT`, kirim notifikasi saldo rendah via Telegram (bot sistem).

**Contoh Response:**

```json
{
  "ok": true,
  "statusCode": 200,
  "memberID": "AG000001",
  "sign": "base64-url-sign",
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

### 5. `POST /api/ticket-mbal`

Buat tiket topup M-Bal.

**Headers:**

* `content-type: application/json`
* `x-auvyn-secret: <AUVYN_SECRET>`

**Body:**

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

* `amount` wajib (dalam Rupiah, harus > 0).
* `memberId` opsional (default `MEMBER_ID` dari `.env`).
* `meta` opsional.

**Alur internal:**

* Hit:

  ```text
  CENTER_URL/?cmd=ticket&memberid=<memberId>&amount=<amount>&sign=<sign>
  ```

* Parse M-Bal dan teks bila ada.

* Kirim callback event `balance.ticket`.

**Contoh Response:**

```json
{
  "ok": true,
  "statusCode": 200,
  "memberID": "AG000001",
  "amount": 25000000,
  "sign": "base64-url-sign",
  "centerUrl": "http://127.0.0.1:6969/?cmd=ticket&memberid=AG000001&amount=25000000&sign=...",
  "raw": "Tiket M-Bal : ... M-Bal : 100.000.000",
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
    "raw": "Tiket M-Bal : ..."
  },
  "meta": {
    "source": "owner",
    "note": "topup saldo awal"
  },
  "receivedAt": "2025-01-01T00:00:00.000Z"
}
```

### 6. `ALL /report`

Endpoint ini dipasangkan sebagai `REPORTURL` di pengaturan IP Center.

* Auvyn Apies akan:

  * Ambil semua info request (`method`, `query`, `body`, `headers`, `ip`).
  * Log ke `logs/report.log`.
  * Kirim notifikasi Telegram (bot sistem).
  * Kirim callback dengan event `transaction.report`.

**Response:** selalu `text/plain` dengan isi:

```text
OK
```

---

## Callback ke Backend (CALLBACK_URL)

Jika `CALLBACK_URL` disetting, Auvyn Apies akan mengirim HTTP `POST` ke URL tersebut untuk beberapa event:

* `transaction.request` — setiap kali ada request transaksi ke IP Center.
* `transaction.report` — setiap kali `/report` menerima data dari IP Center.
* `balance.check` — setiap kali `/api/balance` dipanggil dan mendapat balasan.
* `balance.ticket` — setiap kali `/api/ticket-mbal` dipanggil dan mendapat balasan.

**Headers:**

```http
x-auvyn-callback-secret: <CALLBACK_SECRET>
x-auvyn-event: transaction.request | transaction.report | balance.check | balance.ticket
content-type: application/json
```

**Body:** langsung berupa payload yang dipakai di dalam Auvyn Apies
(misalnya `resultPayload` dari `sendTransaction()` atau `checkBalance()`).

Contoh handler di backend (Node.js):

```js
async function handleAuvynCallback(req) {
  const secret = req.headers['x-auvyn-callback-secret'];
  const event = req.headers['x-auvyn-event'];

  if (secret !== process.env.AUVYN_CALLBACK_SECRET) {
    throw new Error('invalid callback secret');
  }

  const payload = req.body;

  switch (event) {
    case 'transaction.request':
      // update status awal order berdasarkan payload.category, providerResult, dll
      break;

    case 'transaction.report':
      // update status final trx dari laporan/report IP center
      break;

    case 'balance.check':
      // simpan atau tampilkan saldo terkini
      break;

    case 'balance.ticket':
      // catat riwayat tiket topup saldo
      break;
  }
}
```

---

## Logging & Telegram

### File Log

* `combined.log` — semua log umum.
* `error.log` — error & exception.
* `trx-success.log` — transaksi kategori `success`.
* `trx-pending.log` — transaksi kategori `pending`.
* `trx-failed.log` — transaksi kategori `failed`.
* `report.log` — semua request yang masuk ke `/report`.

### Notifikasi Telegram

Tiap transaksi akan mengirim pesan berformat:

* Kategori: `✅ TRX SUCCESS` / `🕒 TRX PENDING` / `❌ TRX FAILED`.
* Detail: `RefID`, produk, tujuan, qty, status HTTP, potongan `raw` (max 4000 char).
* Jika saldo berhasil diparse → tampilkan `Saldo Tersisa`.
* Jika `meta` ada → JSON `meta` dalam `<pre>...</pre>`.

Notifikasi saldo rendah:

* Dikirim via bot `TG_SYSTEM_BOT_TOKEN` jika `balance.remaining <= BALANCE_LOW_LIMIT`.

---

## Maintenance: Bersihin Log Lama

Auvyn Apies menyediakan script `cleanup-logs.sh` untuk hapus file `.log` yang sudah terlalu lama.

Script ini:

* Membaca `.env` (jika ada) dan memakai nilai `LOGS_DIR` (default `./logs`).
* Menghapus file `.log` yang lebih tua dari `KEEP_DAYS` (default 7 hari).

Jalankan manual:

```bash
cd /opt/auvyn-apies
./cleanup-logs.sh            # KEEP_DAYS default = 7
KEEP_DAYS=14 ./cleanup-logs.sh  # paksa pakai 14 hari
```

Contoh setup `cron` (bersihin tiap jam 3 pagi):

```bash
crontab -e
```

Tambahkan baris:

```bash
0 3 * * * /bin/bash /opt/auvyn-apies/cleanup-logs.sh >> /var/log/cleanup-auvyn.log 2>&1
```

---

## Development Local

Untuk development lokal / testing:

```bash
git clone https://github.com/Matsumiko/auvyn-apies.git
cd auvyn-apies
cp .env.example .env
# Edit .env dengan data sandbox / dummy
npm install
npm start
```

Server akan berjalan di `http://localhost:5882`.
