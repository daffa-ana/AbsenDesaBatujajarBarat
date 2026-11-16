# Panduan Hosting Gratis Absen Desa

## ❌ Kenapa Bukan InfinityFree?
InfinityFree **hanya support PHP + MySQL**, tidak support Node.js. Aplikasi ini pakai **Node.js + SQLite**.

---

## ✅ Hosting Gratis Recommended (Support Node.js + SQLite)

### 1. Railway.app (PALING MUDAH & RECOMMENDED)
- **Free tier**: $5 kredit/bulan (cukup untuk 24/7)
- **Persistent storage**: 1GB gratis
- **SQLite**: Jalan normal
- **Deploy**: Connect GitHub → Auto deploy
- **Waktu setup**: ~5 menit

**Cara deploy:**
1. Buat akun di [railway.app](https://railway.app) (pakai GitHub)
2. Klik "New Project" → "Deploy from GitHub repo"
3. Upload folder `absen-desa-deploy` ke GitHub repository baru
4. Pilih repo itu di Railway
5. Tunggu build selesai → Dapat URL gratis (misal: `absen-desa.up.railway.app`)

---

### 2. Koyeb.com (ALTERNATIF)
- **Free tier**: 1 service gratis selamanya
- **Persistent storage**: 1GB
- **Deploy**: Sama seperti Railway (via GitHub)

---

### 3. Render.com (TIDAK RECOMMENDED untuk SQLite)
- Free tier **sleep after 15 min idle** → database corrupt
- Persistent disk **paid only** ($7/bulan)

---

### 4. Fly.io (UNTUK YANG MAU LEBIH KONTROL)
- Free allowance: 3 shared-CPU VMs, 3GB persistent volume
- Butuh install CLI: `flyctl`
- Lebih teknis tapi paling powerful

---

### 5. Oracle Cloud Always Free (PALING BEBAS BIAYA)
- 4 ARM Ampere CPU + 24GB RAM **selamanya gratis**
- Unlimited persistent storage
- Butuh setup manual VPS (Linux, Nginx, PM2, SSL)
- Cocok kalau mau belajar server management

---

## 📁 Struktur Folder yang Sudah Siap

```
absen-desa-deploy/
├── package.json        # Config Node.js
├── server.js           # Server utama
├── db.js               # Database & logic
├── railway.json        # Config Railway
├── Dockerfile          # Config Docker (untuk Fly.io, Koyeb, dll)
├── .dockerignore
├── public/             # Frontend files
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   ├── favicon.svg
│   └── fonts/
└── data/               # Database SQLite (sudah ada data)
    ├── absen-desa.db
    ├── absen-desa.db-wal
    └── absen-desa.db-shm
```

---

## 🚀 Langkah Cepat Deploy ke Railway (5 Menit)

### Opsi A: Via GitHub (Recommended)
```bash
# 1. Buat repo GitHub baru (misal: absen-desa)
# 2. Upload folder absen-desa-deploy ke repo itu
# 3. Di Railway: New Project → Deploy from GitHub repo → Pilih repo
# 4. Tunggu build → Selesai!
```

### Opsi B: Via Railway CLI (Tanpa GitHub)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy langsung dari folder
cd /home/anargya/Documents/absen-desa-deploy
railway init
railway up
```

---

## ⚙️ Environment Variables (Opsional)

Di Railway dashboard → Variables, bisa tambah:
```
NODE_ENV=production
PORT=3000
```

---

## 🔒 Keamanan Setelah Deploy

1. **Ganti password default** `admin123` → Pengaturan → Keamanan
2. **Aktifkan HTTPS** (Railway auto kasih SSL)
3. **Batasi akses IP** (opsional): di Railway → Settings → Networking

---

## 📱 Cara Pakai Setelah Online

1. Buka URL Railway (misal: `https://absen-desa.up.railway.app`)
2. Login pakai password admin
3. Karyawan absen dari HP masing-masing via browser
4. Admin kelola pegawai & rekap dari panel yang sama

---

## 💾 Backup Database

**Penting!** Backup rutin folder `data/`:
- Di Railway: `railway run cp -r data data-backup-$(date +%Y%m%d)`
- Atau download via Railway dashboard → Files tab

---

## 🆘 Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Build gagal | Pastikan Node.js 22+ di `package.json` |
| Database error | Cek permission folder `data/` (755) |
| App sleep/idle | Upgrade ke paid plan atau pake Koyeb/Fly.io |
| Port error | Railway auto assign PORT, jangan hardcode |

---

## 📞 Butuh Bantuan?

Kalau stuck di langkah mana, tinggal tanya aja. Folder `absen-desa-deploy` sudah **siap pakai** - tinggal upload ke GitHub → connect ke Railway → jalan!
