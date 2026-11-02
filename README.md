# 🤖💰 Personal Finance Bot - Asisten Keuangan Pribadi Telegram

Bot Telegram berbasis AI untuk mencatat dan mengelola keuangan pribadi sehari-hari. Ditulis dalam Node.js, menggunakan AI untuk memahami bahasa Indonesia sehari-hari.

## ✨ Fitur

- **Pencatatan Transaksi** - Catat pemasukan/pengeluaran dengan bahasa sehari-hari
- **Cek Saldo** - Lihat saldo real-time kapan saja
- **Laporan Keuangan** - Laporan harian, mingguan, bulanan dengan perbandingan periode
- **Target Tabungan** - Buat dan pantau progres target tabungan
- **Pengingat** - Pengingat harian/bulanan untuk mencatat keuangan
- **Scan Struk** - Kirim foto struk, AI akan membaca dan mencatat
- **Ekspor PDF/Excel** - Download laporan dalam format PDF atau Excel
- **Analisis AI** - Tanya apa saja tentang keuanganmu
- **Klasifikasi Otomatis** - AI mendeteksi kategori transaksi secara otomatis

## 🏗️ Teknologi

| Layer | Teknologi |
|-------|-----------|
| Runtime | Node.js v20+ |
| Framework | Express.js |
| Bot | Telegraf (Telegram Bot API) |
| Database | PostgreSQL (Neon, free tier) |
| ORM | Prisma |
| AI | Google Gemini API (free tier) |
| PDF | PDFKit |
| Excel | ExcelJS |
| Deployment | Render.com (free tier) |
| Scheduler | cron-job.org (free) |

## 📋 Prasyarat

- Node.js v20 atau lebih baru
- Akun Telegram
- Akun [Neon](https://neon.tech) (PostgreSQL gratis)
- Akun [Google AI Studio](https://aistudio.google.com) (Gemini API gratis)
- Akun [Render.com](https://render.com) (deployment gratis)

---

## 🚀 Panduan Instalasi Lengkap

### Langkah 1: Buat Telegram Bot via BotFather

1. Buka Telegram, cari **@BotFather**
2. Kirim `/newbot`
3. Masukkan nama bot (contoh: `Asisten Keuangan Saya`)
4. Masukkan username bot (contoh: `keuangan_pribadi_bot`) — harus diakhiri `bot`
5. Simpan **API Token** yang diberikan (format: `123456789:ABCdef...`)
6. Kirim `/setdescription` ke BotFather dan pilih bot Anda, lalu kirim: `Asisten keuangan pribadi berbasis AI`
7. Kirim `/setabouttext` dan kirim: `Bot untuk mencatat dan mengelola keuangan pribadi`

### Langkah 2: Dapatkan Telegram ID Anda

1. Buka Telegram, cari **@userinfobot** atau **@raw_data_bot**
2. Kirim `/start`
3. Bot akan menampilkan **ID** Anda (angka, contoh: `123456789`)
4. Simpan nomor ini untuk `ALLOWED_TELEGRAM_IDS`

### Langkah 3: Buat Database PostgreSQL di Neon

1. Kunjungi [neon.tech](https://neon.tech) dan daftar (gratis)
2. Klik **Create Project**
3. Beri nama project (contoh: `finance-bot`)
4. Pilih region terdekat (Singapore jika ada)
5. Setelah project dibuat, salin **Connection String** dari dashboard
   - Format: `postgresql://user:password@ep-xxx.region.neon.tech/dbname?sslmode=require`
6. Simpan connection string ini untuk `DATABASE_URL`

> **Batas Free Tier Neon:** 1 GB storage per project, data tidak expire, compute scales to zero saat idle

### Langkah 4: Dapatkan Google Gemini API Key

1. Kunjungi [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Login dengan akun Google
3. Klik **Create API Key**
4. Pilih project (atau buat baru)
5. Salin API key yang dihasilkan
6. Simpan untuk `GEMINI_API_KEY`

> **Batas Free Tier Gemini:** ~15 request/menit, ~1500 request/hari. Jika habis, bot otomatis menggunakan fallback parser berbasis regex

### Langkah 5: Setup Lokal (Opsional, untuk Development)

```bash
# Clone atau download repository
git clone <repo-url>
cd personal-finance-bot

# Install dependencies
npm install

# Salin file environment
cp .env.example .env

# Edit .env dan isi semua nilai
# BOT_TOKEN=...
# DATABASE_URL=...
# GEMINI_API_KEY=...
# ALLOWED_TELEGRAM_IDS=...

# Generate Prisma Client
npx prisma generate

# Push schema ke database
npx prisma db push

# Jalankan dalam mode polling (development)
# Pastikan NODE_ENV=development di .env
npm run dev
```

### Langkah 6: Deploy ke Render.com

1. Push kode ke GitHub repository (pastikan `.env` ada di `.gitignore`!)
2. Kunjungi [render.com](https://render.com) dan daftar
3. Klik **New** → **Web Service**
4. Hubungkan GitHub repository Anda
5. Konfigurasi:
   - **Name:** `personal-finance-bot` (atau nama lain)
   - **Region:** Singapore (atau terdekat)
   - **Branch:** `main`
   - **Runtime:** Node
   - **Build Command:** `npm install && npx prisma generate && npx prisma db push`
   - **Start Command:** `node src/index.js`
   - **Instance Type:** Free
6. Di bagian **Environment Variables**, tambahkan:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `BOT_TOKEN` | Token dari BotFather |
   | `WEBHOOK_SECRET` | Buat string acak (contoh: `my-secret-xyz123`) |
   | `WEBHOOK_URL` | `https://nama-app-anda.onrender.com` (diisi setelah deploy) |
   | `DATABASE_URL` | Connection string dari Neon |
   | `GEMINI_API_KEY` | API key dari Google AI Studio |
   | `ALLOWED_TELEGRAM_IDS` | Telegram ID Anda (contoh: `123456789`) |
   | `CRON_SECRET` | Buat string acak lain (contoh: `cron-secret-abc456`) |
   | `TZ` | `Asia/Makassar` |

7. Klik **Create Web Service**
8. Tunggu deployment selesai
9. Setelah deploy, salin URL service (contoh: `https://personal-finance-bot-xxxx.onrender.com`)
10. Update environment variable `WEBHOOK_URL` dengan URL tersebut
11. Redeploy dari dashboard Render

> **Keterbatasan Render Free Tier:**
> - Service sleep setelah 15 menit tanpa traffic
> - Wake up membutuhkan ~1 menit saat ada request baru
> - 750 jam instance/bulan
> - Respons pertama setelah idle mungkin lambat

### Langkah 7: Setup Pengingat dengan cron-job.org

Karena Render free tier bisa sleep, gunakan cron-job.org untuk:
- Menjaga bot tetap aktif
- Menjalankan pengingat tepat waktu

1. Kunjungi [cron-job.org](https://cron-job.org) dan daftar (gratis)
2. Klik **Create Cronjob**
3. Buat 2 cron job:

**Cron Job 1: Keep Alive (opsional)**
- URL: `https://nama-app-anda.onrender.com/health`
- Schedule: Every 14 minutes
- Ini mencegah service Render sleep

**Cron Job 2: Reminder Checker**
- URL: `https://nama-app-anda.onrender.com/cron/reminders?secret=CRON_SECRET_ANDA`
- Schedule: Every 1 minute (atau sesuai kebutuhan)
- Ini memeriksa dan mengirim pengingat yang jatuh tempo

---

## 💬 Cara Penggunaan

### Perintah Bot

| Perintah | Fungsi |
|----------|--------|
| `/start` | Mulai bot, registrasi |
| `/menu` | Tampilkan menu utama |
| `/saldo` | Cek saldo saat ini |
| `/hariini` | Laporan hari ini |
| `/mingguini` | Laporan minggu ini |
| `/bulanini` | Laporan bulan ini |
| `/laporan` | Menu laporan lengkap |
| `/riwayat` | Riwayat transaksi |
| `/tabungan` | Kelola target tabungan |
| `/pengingat` | Kelola pengingat |
| `/export` | Ekspor laporan PDF/Excel |
| `/bantuan` | Panduan penggunaan |

### Contoh Penggunaan

**Mencatat pengeluaran:**
```
Beli makan siang 20 ribu
Bensin 30rb
Bayar listrik 200.000
Nongkrong di kafe 50 ribu
```

**Mencatat pemasukan:**
```
Gaji bulan ini 3 juta
Dapat uang 500 ribu dari orang tua
Freelance 1,5 juta
```

**Cek saldo:**
```
Berapa saldo saya?
Sisa uang saya berapa?
```

**Target tabungan:**
```
Buat target tabungan laptop 8 juta
```

**Pengingat:**
```
Ingatkan catat pengeluaran jam 21:00
Ingatkan bayar listrik jam 09:00 tanggal 20
```

**Tanya AI:**
```
Pengeluaran terbesar bulan ini apa?
Berapa pengeluaran makanan saya?
Apakah pengeluaran saya meningkat?
```

**Scan struk:**
Kirim foto struk → bot akan membaca dan minta konfirmasi

---

## 🗄️ Struktur Database

```
users                    → Data pengguna
transactions             → Catatan transaksi (pemasukan/pengeluaran)
savings_goals            → Target tabungan
savings_contributions    → Kontribusi ke target tabungan
reminders                → Pengingat keuangan
processed_telegram_updates → Deduplication webhook
user_settings            → Pengaturan pengguna
```

## 📁 Struktur Proyek

```
personal-finance-bot/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── config/
│   │   ├── index.js           # Konfigurasi environment
│   │   └── constants.js       # Konstanta aplikasi
│   ├── bot/
│   │   ├── index.js           # Setup bot Telegraf
│   │   ├── commands/          # Handler perintah (/start, /saldo, dll)
│   │   ├── handlers/          # Handler pesan & callback
│   │   └── keyboards/         # Inline keyboard Telegram
│   ├── services/
│   │   ├── ai/                # AI abstraction layer (Gemini + Fallback)
│   │   ├── user/              # User service
│   │   ├── transaction/       # Transaction CRUD
│   │   ├── balance/           # Balance calculation
│   │   ├── report/            # Laporan keuangan
│   │   ├── savings/           # Target tabungan
│   │   ├── reminder/          # Pengingat
│   │   ├── export/            # PDF & Excel generation
│   │   └── ocr/               # OCR struk
│   ├── middleware/
│   │   ├── auth.js            # Autentikasi & webhook verification
│   │   ├── rateLimiter.js     # Rate limiting
│   │   └── deduplication.js   # Cegah transaksi ganda
│   ├── database/
│   │   └── prisma.js          # Prisma client singleton
│   ├── utils/
│   │   ├── currency.js        # Parse & format Rupiah
│   │   ├── date.js            # Utilitas tanggal/waktu
│   │   ├── format.js          # Format pesan Telegram
│   │   └── logger.js          # Winston logger
│   └── index.js               # Entry point (Express + webhook)
├── scripts/
│   ├── set-webhook.js         # Set webhook Telegram
│   ├── delete-webhook.js      # Hapus webhook
│   └── webhook-info.js        # Info webhook saat ini
├── tests/
│   └── unit.test.js           # Unit tests
├── .env.example               # Template environment variables
├── .gitignore
├── jest.config.js
├── package.json
├── render.yaml                # Render deployment config
└── README.md
```

---

## 🔒 Keamanan

- **Access Control:** Hanya Telegram ID yang terdaftar di `ALLOWED_TELEGRAM_IDS` yang bisa menggunakan bot
- **Webhook Verification:** Secret token memverifikasi setiap request dari Telegram
- **Rate Limiting:** Mencegah abuse pada endpoint webhook dan cron
- **Deduplication:** Mencegah transaksi ganda dari webhook retry
- **SQL Injection:** Dilindungi oleh Prisma ORM (parameterized queries)
- **Data Isolation:** Setiap user hanya bisa mengakses data miliknya sendiri
- **No Secrets in Logs:** Logger tidak pernah mencetak API key atau token
- **Environment Variables:** Semua konfigurasi rahasia disimpan di environment variables

---

## 🧪 Testing

```bash
# Jalankan semua test
npm test

# Atau manual:
NODE_OPTIONS=--experimental-vm-modules npx jest --forceExit
```

---

## 🛠️ Pemeliharaan

### Backup Database

Neon menyediakan point-in-time recovery di free tier. Untuk backup manual:

```bash
# Export data (ganti connection string)
pg_dump "postgresql://user:pass@host/db?sslmode=require" > backup.sql

# Import data
psql "postgresql://user:pass@host/db?sslmode=require" < backup.sql
```

Atau gunakan fitur **Branching** di dashboard Neon untuk membuat snapshot database.

### Monitor Bot

- Cek log di dashboard Render.com
- Health check: `GET https://your-app.onrender.com/health`
- Webhook info: `node scripts/webhook-info.js`

### Update Dependencies

```bash
npm update
npx prisma generate
```

### Migrasi Database

```bash
# Setelah mengubah schema.prisma:
npx prisma db push   # Development (langsung push perubahan)
# ATAU
npx prisma migrate dev --name deskripsi_perubahan  # Untuk migrasi terstruktur
```

---

## ⚠️ Keterbatasan Free Tier

| Layanan | Keterbatasan |
|---------|-------------|
| **Render.com** | Sleep setelah 15 menit idle, wake up ~1 menit, 750 jam/bulan |
| **Neon PostgreSQL** | 1 GB storage per project |
| **Gemini API** | ~15 RPM, ~1500 RPD, data mungkin digunakan untuk training |
| **cron-job.org** | 5 cron job gratis |

### Jika Ingin Upgrade

- **Render Starter:** $7/bulan — tanpa sleep, lebih cepat
- **Neon Launch:** $19/bulan — 10 GB storage
- **Gemini Pay-as-you-go:** ~$0.075/juta token — tanpa batas harian

---

## 📝 Lisensi

Proyek ini dibuat untuk penggunaan pribadi. Gunakan sesuai kebutuhan Anda.
