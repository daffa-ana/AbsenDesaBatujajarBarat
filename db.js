'use strict';

/**
 * Basis data Absen Desa (SQLite via node:sqlite, tanpa dependensi eksternal).
 * Semua waktu memakai zona waktu lokal laptop.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

/* Lokasi data dapat diarahkan oleh aplikasi desktop (Electron) lewat ABSEN_DATA_DIR. */
const DATA_DIR = process.env.ABSEN_DATA_DIR || path.join(__dirname, 'data');

/* Berkas basis data hanya boleh dibaca pemilik akun. Umask ini juga berlaku
   untuk berkas WAL/SHM yang dibuat SQLite di samping basis data. */
try {
  process.umask(0o077);
} catch {
  /* Diabaikan pada sistem yang tidak mendukung umask (Windows). */
}

fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
try {
  fs.chmodSync(DATA_DIR, 0o700);
} catch {
  /* Windows mengabaikan mode POSIX. */
}

const DB_FILE = path.join(DATA_DIR, 'absen-desa.db');
const db = new DatabaseSync(DB_FILE);

/* Berkas WAL/SHM ikut dirapatkan bila sudah ada dari versi sebelumnya. */
for (const suffix of ['', '-wal', '-shm']) {
  try {
    fs.chmodSync(DB_FILE + suffix, 0o600);
  } catch {
    /* Windows mengabaikan mode POSIX; berkas WAL/SHM mungkin belum ada. */
  }
}

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA trusted_schema = OFF');
db.exec('PRAGMA busy_timeout = 5000');

db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nama        TEXT NOT NULL,
    nip         TEXT NOT NULL DEFAULT '',
    jabatan     TEXT NOT NULL DEFAULT '',
    unit        TEXT NOT NULL DEFAULT '',
    aktif       INTEGER NOT NULL DEFAULT 1,
    pin_hash    TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    tanggal     TEXT NOT NULL,
    status      TEXT NOT NULL,
    masuk       TEXT,
    pulang      TEXT,
    keterangan  TEXT NOT NULL DEFAULT '',
    sumber      TEXT NOT NULL DEFAULT 'klik',
    photo_path  TEXT,
    lat         TEXT,
    lng         TEXT,
    updated_at  TEXT NOT NULL,
    UNIQUE (employee_id, tanggal)
  );

  CREATE INDEX IF NOT EXISTS idx_attendance_tanggal ON attendance (tanggal);
  CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance (employee_id);

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS holidays (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal TEXT NOT NULL UNIQUE,
    nama    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    waktu  TEXT NOT NULL,
    aksi   TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    ip     TEXT NOT NULL DEFAULT ''
  );

  CREATE INDEX IF NOT EXISTS idx_audit_waktu ON audit_log (waktu);
`);

/* ------------------------------------------------------------------ */
/* Util                                                                */
/* ------------------------------------------------------------------ */

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const pad = (n) => String(n).padStart(2, '0');

function isoDate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isoTime(d = new Date()) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function nowISO() {
  const d = new Date();
  return `${isoDate(d)} ${isoTime(d)}:${pad(d.getSeconds())}`;
}

function parseISO(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function isValidDate(iso) {
  const text = String(iso);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const date = parseISO(text);
  // Tolak tanggal yang "meluap", misalnya 2026-02-30 yang diam-diam
  // diubah JavaScript menjadi 2 Maret.
  return !Number.isNaN(date.getTime()) && isoDate(date) === text;
}

function isValidTime(t) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(t));
}

function addDays(date, n) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + n);
  return d;
}

function toMinutes(t) {
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + m;
}

/* ------------------------------------------------------------------ */
/* Pengaturan                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_SETTINGS = {
  nama_desa: 'Desa Batujajar Barat',
  nama_kantor: 'Pemerintah Desa Batujajar Barat',
  kecamatan: 'Batujajar',
  kabupaten: 'Bandung Barat',
  alamat: '',
  kepala_desa: '',
  admin_nama: 'Administrator',
  jam_masuk: '07:30',
  jam_pulang: '15:00',
  toleransi: '15',
  hari_kerja: '[1,2,3,4,5]',
};

const PUBLIC_SETTING_KEYS = [
  'nama_desa', 'nama_kantor', 'kecamatan', 'kabupaten', 'alamat',
  'kepala_desa', 'admin_nama',
  'jam_masuk', 'jam_pulang', 'toleransi', 'hari_kerja',
];

function rawSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : undefined;
}

function setSetting(key, value) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, String(value));
}

function getSettings() {
  const out = { ...DEFAULT_SETTINGS };
  for (const row of db.prepare('SELECT key, value FROM settings').all()) {
    out[row.key] = row.value;
  }
  out.toleransi = Number(out.toleransi) || 0;
  try {
    const days = JSON.parse(out.hari_kerja);
    out.hari_kerja = Array.isArray(days) ? days.map(Number).filter((d) => d >= 0 && d <= 6) : [1, 2, 3, 4, 5];
  } catch {
    out.hari_kerja = [1, 2, 3, 4, 5];
  }
  return out;
}

function publicSettings() {
  const s = getSettings();
  const out = {};
  for (const key of PUBLIC_SETTING_KEYS) out[key] = s[key];
  return out;
}

function updateSettings(patch) {
  const allowed = new Set(PUBLIC_SETTING_KEYS);
  for (const [key, value] of Object.entries(patch || {})) {
    if (!allowed.has(key)) continue;
    if (key === 'hari_kerja') {
      const days = (Array.isArray(value) ? value : [])
        .map(Number)
        .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
      setSetting(key, JSON.stringify([...new Set(days)].sort()));
    } else if (key === 'toleransi') {
      const n = Math.max(0, Math.min(180, Number(value) || 0));
      setSetting(key, String(n));
    } else if (key === 'jam_masuk' || key === 'jam_pulang') {
      if (!isValidTime(value)) continue;
      setSetting(key, value);
    } else {
      setSetting(key, String(value).slice(0, 160));
    }
  }
  return publicSettings();
}

/* ------------------------------------------------------------------ */
/* Kata sandi & sesi                                                   */
/* ------------------------------------------------------------------ */

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

function rotateSessionSecret() {
  setSetting('session_secret', crypto.randomBytes(32).toString('hex'));
}

function setPassword(password) {
  setSetting('admin_password', hashPassword(password));
  // Kunci sesi ikut diputar: semua sesi lama otomatis tidak berlaku lagi.
  rotateSessionSecret();
}

function verifyPassword(password) {
  const stored = rawSetting('admin_password');
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.scryptSync(String(password), salt, 32);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

/* ------------------------------------------------------------------ */
/* PIN Pegawai                                                         */
/* ------------------------------------------------------------------ */

/**
 * Hash PIN pegawai dengan scrypt (sama seperti password admin).
 * PIN disimpan sebagai salt:hash (hex).
 */
function hashPin(pin, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(pin), salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPin(employeeId, pin) {
  const emp = getEmployee(employeeId, { includePinHash: true });
  if (!emp || !emp.pin_hash) return false;
  const [salt, hash] = emp.pin_hash.split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.scryptSync(String(pin), salt, 32);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function setEmployeePin(employeeId, pin) {
  const emp = getEmployee(employeeId, { includePinHash: true });
  if (!emp) throw new Error('Pegawai tidak ditemukan');
  const pinStr = String(pin || '').trim();
  if (!pinStr) {
    // Kosongkan PIN
    db.prepare('UPDATE employees SET pin_hash = ? WHERE id = ?').run('', Number(employeeId));
    return true;
  }
  if (pinStr.length < 4 || pinStr.length > 10) {
    throw new Error('PIN harus 4–10 digit angka');
  }
  if (!/^\d+$/.test(pinStr)) {
    throw new Error('PIN hanya boleh berisi angka');
  }
  db.prepare('UPDATE employees SET pin_hash = ? WHERE id = ?').run(hashPin(pinStr), Number(employeeId));
  return true;
}

function hasPin(employeeId) {
  const emp = getEmployee(employeeId, { includePinHash: true });
  return !!(emp && emp.pin_hash);
}

let defaultPasswordCache = null;

/**
 * Pemeriksaan ini dipanggil pada setiap permintaan halaman publik. Hasilnya
 * disimpan sebentar agar tidak menjalankan scrypt berulang kali; cache otomatis
 * tidak berlaku lagi ketika nilai hash kata sandi berubah.
 */
function isDefaultPassword() {
  const stored = rawSetting('admin_password');
  if (!stored) return false;
  if (!defaultPasswordCache || defaultPasswordCache.stored !== stored) {
    defaultPasswordCache = { stored, value: verifyPassword('admin123') };
  }
  return defaultPasswordCache.value;
}

function sessionSecret() {
  let secret = rawSetting('session_secret');
  if (!secret) {
    secret = crypto.randomBytes(32).toString('hex');
    setSetting('session_secret', secret);
  }
  return secret;
}

/* ------------------------------------------------------------------ */
/* Pegawai Self-Service (Absen via HP)                                */
/* ------------------------------------------------------------------ */

function createPegawaiToken(employeeId) {
  const payload = Buffer.from(JSON.stringify({ sub: employee_id, exp: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyPegawaiToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (Number(data.exp) <= Date.now()) return null;
    return Number(data.sub);
  } catch {
    return null;
  }
}

function findEmployeeByNip(nip, { includePinHash = false } = {}) {
  const cols = includePinHash ? '*' : 'id, nama, nip, jabatan, unit, aktif, created_at';
  const row = db.prepare(`SELECT ${cols} FROM employees WHERE nip = ?`).get(String(nip || '').trim());
  return row ? { ...row, aktif: !!row.aktif } : null;
}

function pegawaiAbsen({ employee_id, pin, status, keterangan, photo_path, lat, lng }) {
  const employee = getEmployee(employee_id, { includePinHash: true });
  if (!employee) throw Object.assign(new Error('Pegawai tidak ditemukan'), { status: 404 });
  if (!employee.aktif) throw Object.assign(new Error('Pegawai sudah nonaktif'), { status: 400 });

  if (employee.pin_hash) {
    if (!pin) throw Object.assign(new Error('PIN wajib diisi'), { status: 401, code: 'PIN_REQUIRED' });
    if (!verifyPin(employee_id, pin)) {
      throw Object.assign(new Error('PIN salah'), { status: 401, code: 'PIN_INVALID' });
    }
  }

  const settings = getSettings();
  const now = new Date();
  const tanggal = isoDate(now);
  const jam = isoTime(now);
  const record = getAttendance(employee_id, tanggal);

  const allowed = ['HADIR', 'TERLAMBAT', 'IZIN', 'SAKIT', 'CUTI', 'DINAS', 'ALPA'];
  if (!allowed.includes(status)) throw Object.assign(new Error('Status tidak valid'), { status: 400 });

  let inTime = null;
  let outTime = null;
  if (status === 'HADIR' || status === 'TERLAMBAT') {
    inTime = jam;
    if (record && record.pulang) outTime = record.pulang;
  }

  const result = upsertAttendance({
    employee_id,
    tanggal,
    status,
    masuk: inTime,
    pulang: outTime,
    keterangan,
    sumber: 'hp',
    photo_path,
    lat,
    lng,
  });

  logAudit('absen_hp', `${employee.id} ${employee.nama} ${status} ${photo_path ? 'dengan foto' : ''}`, '');

  return {
    action: record ? 'update' : 'absen',
    jam,
    nama: employee.nama,
    status,
    tanggal,
    photo_path,
    lat,
    lng,
    record: result,
  };
}

function pegawaiStatusHariIni(employee_id) {
  const employee = getEmployee(employee_id);
  if (!employee) throw Object.assign(new Error('Pegawai tidak ditemukan'), { status: 404 });
  const record = getAttendance(employee_id, isoDate());
  return {
    employee: {
      id: employee.id,
      nama: employee.nama,
      nip: employee.nip,
      jabatan: employee.jabatan,
      unit: employee.unit,
      hasPin: !!employee.pin_hash,
    },
    record: record || null,
    today: isoDate(),
  };
}

function pegawaiRiwayat(employee_id, days = 30) {
  const employee = getEmployee(employee_id);
  if (!employee) throw Object.assign(new Error('Pegawai tidak ditemukan'), { status: 404 });
  const today = isoDate();
  const rows = db.prepare(
    'SELECT * FROM attendance WHERE employee_id = ? AND tanggal >= ? ORDER BY tanggal DESC'
  ).all(Number(employee_id), addDays(parseISO(today), -days).toISOString().slice(0, 10));
  return { employee, records: rows, today };
}

function pegawaiSudahAbsen(employee_id) {
  const record = getAttendance(employee_id, isoDate());
  return !!record;
}

function saveUploadFile(employee_id, buffer, filename, mimetype) {
  const uploadsDir = path.join(__dirname, 'public', 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o755 });
  const ext = path.extname(filename || '').slice(0, 10) || '.jpg';
  const safe = `absen_${employee_id}_${Date.now()}${ext}`;
  const filePath = path.join(uploadsDir, safe);
  fs.writeFileSync(filePath, buffer);
  return path.join('uploads', safe);
}

/* ------------------------------------------------------------------ */
/* Riwayat perubahan (audit)                                           */
/* ------------------------------------------------------------------ */

/**
 * Mencatat tindakan penting agar perubahan data dapat ditelusuri.
 * Kegagalan menulis riwayat tidak boleh menggagalkan operasi utama.
 */
function logAudit(aksi, detail = '', ip = '') {
  try {
    db.prepare('INSERT INTO audit_log (waktu, aksi, detail, ip) VALUES (?, ?, ?, ?)').run(
      nowISO(),
      String(aksi || '').slice(0, 80),
      String(detail || '').slice(0, 300),
      String(ip || '').slice(0, 60)
    );
    // Simpan riwayat secukupnya saja (maksimal sekitar 2.000 baris).
    if (Math.random() < 0.05) {
      db.prepare(
        'DELETE FROM audit_log WHERE id NOT IN (SELECT id FROM audit_log ORDER BY id DESC LIMIT 2000)'
      ).run();
    }
  } catch (err) {
    console.error('Gagal menulis riwayat perubahan:', err.message);
  }
}

function listAudit(limit = 100) {
  const n = Math.max(1, Math.min(500, Number(limit) || 100));
  return db.prepare(
    'SELECT id, waktu, aksi, detail, ip FROM audit_log ORDER BY id DESC LIMIT ?'
  ).all(n);
}

function clearAudit() {
  return Number(db.prepare('DELETE FROM audit_log').run().changes);
}

/* ------------------------------------------------------------------ */
/* Pegawai                                                             */
/* ------------------------------------------------------------------ */

function listEmployees({ includeInactive = true, includePinHash = false } = {}) {
  const where = includeInactive ? '' : 'WHERE aktif = 1';
  const cols = includePinHash
    ? 'id, nama, nip, jabatan, unit, aktif, created_at, pin_hash'
    : 'id, nama, nip, jabatan, unit, aktif, created_at';
  return db.prepare(`SELECT ${cols} FROM employees ${where} ORDER BY aktif DESC, id ASC`).all()
    .map((row) => ({ ...row, aktif: !!row.aktif, hasPin: !!row.pin_hash }));
}

function getEmployee(id, { includePinHash = false } = {}) {
  const cols = includePinHash ? '*' : 'id, nama, nip, jabatan, unit, aktif, created_at';
  const row = db.prepare(`SELECT ${cols} FROM employees WHERE id = ?`).get(Number(id));
  return row ? { ...row, aktif: !!row.aktif } : null;
}

function createEmployee({ nama, nip, jabatan, unit }) {
  const name = String(nama || '').trim();
  if (!name) throw new Error('Nama pegawai wajib diisi');
  const info = db.prepare(
    'INSERT INTO employees (nama, nip, jabatan, unit, aktif, pin_hash, created_at) VALUES (?, ?, ?, ?, 1, ?, ?)'
  ).run(
    name.slice(0, 100),
    String(nip || '').trim().slice(0, 40),
    String(jabatan || '').trim().slice(0, 80),
    String(unit || '').trim().slice(0, 80),
    '',
    isoDate()
  );
  return getEmployee(Number(info.lastInsertRowid));
}

function updateEmployee(id, { nama, nip, jabatan, unit, aktif }) {
  const current = getEmployee(id);
  if (!current) throw new Error('Pegawai tidak ditemukan');
  const name = String(nama ?? current.nama).trim();
  if (!name) throw new Error('Nama pegawai wajib diisi');
  db.prepare(
    'UPDATE employees SET nama = ?, nip = ?, jabatan = ?, unit = ?, aktif = ? WHERE id = ?'
  ).run(
    name.slice(0, 100),
    String(nip ?? current.nip).trim().slice(0, 40),
    String(jabatan ?? current.jabatan).trim().slice(0, 80),
    String(unit ?? current.unit).trim().slice(0, 80),
    aktif === undefined ? (current.aktif ? 1 : 0) : (aktif ? 1 : 0),
    Number(id)
  );
  return getEmployee(id);
}

function deleteEmployee(id) {
  const info = db.prepare('DELETE FROM employees WHERE id = ?').run(Number(id));
  return info.changes > 0;
}

/* ------------------------------------------------------------------ */
/* Kehadiran                                                           */
/* ------------------------------------------------------------------ */

function statusFromTime(jam, settings) {
  const limit = toMinutes(settings.jam_masuk) + settings.toleransi;
  return toMinutes(jam) <= limit ? 'HADIR' : 'TERLAMBAT';
}

function getAttendance(employeeId, tanggal) {
  return db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND tanggal = ?')
    .get(Number(employeeId), tanggal) || null;
}

function upsertAttendance({ employee_id, tanggal, status, masuk, pulang, keterangan, sumber = 'manual' }) {
  const employee = getEmployee(employee_id);
  if (!employee) throw new Error('Pegawai tidak ditemukan');
  if (!isValidDate(tanggal)) throw new Error('Tanggal tidak valid');
  // Catatan tidak boleh dibuat untuk tanggal yang belum terjadi.
  if (tanggal > isoDate()) throw new Error('Tanggal tidak boleh melewati hari ini');

  const allowed = ['HADIR', 'TERLAMBAT', 'IZIN', 'SAKIT', 'CUTI', 'DINAS', 'ALPA'];
  if (!allowed.includes(status)) throw new Error('Status tidak valid');

  const settings = getSettings();
  let inTime = masuk && isValidTime(masuk) ? masuk : null;
  let outTime = pulang && isValidTime(pulang) ? pulang : null;

  if (status === 'HADIR' || status === 'TERLAMBAT') {
    if (!inTime) inTime = settings.jam_masuk;
    if (outTime && toMinutes(outTime) < toMinutes(inTime)) outTime = null;
  } else {
    inTime = null;
    outTime = null;
  }

  db.prepare(`
    INSERT INTO attendance (employee_id, tanggal, status, masuk, pulang, keterangan, sumber, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(employee_id, tanggal) DO UPDATE SET
      status = excluded.status,
      masuk = excluded.masuk,
      pulang = excluded.pulang,
      keterangan = excluded.keterangan,
      sumber = excluded.sumber,
      updated_at = excluded.updated_at
  `).run(
    Number(employee_id), tanggal, status, inTime, outTime,
    String(keterangan || '').slice(0, 200), sumber, nowISO()
  );

  return getAttendance(employee_id, tanggal);
}

function deleteAttendance(employeeId, tanggal) {
  const info = db.prepare('DELETE FROM attendance WHERE employee_id = ? AND tanggal = ?')
    .run(Number(employeeId), tanggal);
  return info.changes > 0;
}

/**
 * Absen kilat satu klik: klik pertama = masuk, klik kedua = pulang.
 * Selalu memakai tanggal & jam server agar tidak bisa diakali.
 * Jika pegawai memiliki PIN, parameter `pin` wajib diisi dan divalidasi.
 */
function clockInOut(employeeId, pin = null) {
  const employee = getEmployee(employeeId, { includePinHash: true });
  if (!employee) throw Object.assign(new Error('Pegawai tidak ditemukan'), { status: 404 });
  if (!employee.aktif) throw Object.assign(new Error('Pegawai sudah nonaktif'), { status: 400 });

  // Verifikasi PIN jika pegawai memiliki PIN
  if (employee.pin_hash) {
    if (!pin) throw Object.assign(new Error('PIN wajib diisi'), { status: 401, code: 'PIN_REQUIRED' });
    if (!verifyPin(employeeId, pin)) {
      throw Object.assign(new Error('PIN salah'), { status: 401, code: 'PIN_INVALID' });
    }
  }

  const settings = getSettings();
  const now = new Date();
  const tanggal = isoDate(now);
  const jam = isoTime(now);
  const record = getAttendance(employeeId, tanggal);

  if (!record) {
    const status = statusFromTime(jam, settings);
    const inserted = upsertAttendance({
      employee_id: employeeId,
      tanggal,
      status,
      masuk: jam,
      keterangan: '',
      sumber: 'klik',
    });
    return { action: 'masuk', jam, record: inserted, employee, status };
  }

  if (record.status !== 'HADIR' && record.status !== 'TERLAMBAT') {
    throw Object.assign(
      new Error(`Hari ini sudah tercatat ${record.status.toLowerCase()}. Ubah lewat detail rekap bila perlu.`),
      { status: 409 }
    );
  }

  if (!record.pulang) {
    const updated = upsertAttendance({
      employee_id: employeeId,
      tanggal,
      status: record.status,
      masuk: record.masuk,
      pulang: jam,
      keterangan: record.keterangan,
      sumber: 'klik',
    });
    return { action: 'pulang', jam, record: updated, employee, status: record.status };
  }

  throw Object.assign(new Error('Absen hari ini sudah lengkap (masuk & pulang)'), { status: 409 });
}

function attendanceDuration(record) {
  if (!record || !record.masuk || !record.pulang) return null;
  return Math.max(0, toMinutes(record.pulang) - toMinutes(record.masuk));
}

/* ------------------------------------------------------------------ */
/* Hari libur                                                          */
/* ------------------------------------------------------------------ */

function listHolidays() {
  return db.prepare('SELECT * FROM holidays ORDER BY tanggal ASC').all();
}

function holidayMap(from, to) {
  const map = new Map();
  const rows = from && to
    ? db.prepare('SELECT tanggal, nama FROM holidays WHERE tanggal BETWEEN ? AND ?').all(from, to)
    : db.prepare('SELECT tanggal, nama FROM holidays').all();
  for (const row of rows) map.set(row.tanggal, row.nama);
  return map;
}

function addHoliday(tanggal, nama) {
  if (!isValidDate(tanggal)) throw new Error('Tanggal libur tidak valid');
  const label = String(nama || '').trim();
  if (!label) throw new Error('Nama hari libur wajib diisi');
  db.prepare(
    'INSERT INTO holidays (tanggal, nama) VALUES (?, ?) ON CONFLICT(tanggal) DO UPDATE SET nama = excluded.nama'
  ).run(tanggal, label.slice(0, 100));
  return { tanggal, nama: label };
}

function deleteHoliday(id) {
  return db.prepare('DELETE FROM holidays WHERE id = ?').run(Number(id)).changes > 0;
}

/* ------------------------------------------------------------------ */
/* Dasbor & rekap                                                      */
/* ------------------------------------------------------------------ */

function dashboard(tanggal = isoDate()) {
  if (!isValidDate(tanggal)) throw new Error('Tanggal tidak valid');
  const settings = getSettings();
  const date = parseISO(tanggal);
  const holidays = holidayMap(tanggal, tanggal);
  const libur = holidays.get(tanggal) || null;

  const employees = listEmployees({ includeInactive: false, includePinHash: true }).map((emp) => {
    const record = getAttendance(emp.id, tanggal);
    return {
      id: emp.id,
      nama: emp.nama,
      nip: emp.nip,
      jabatan: emp.jabatan,
      unit: emp.unit,
      status: record ? record.status : 'BELUM',
      masuk: record ? record.masuk : null,
      pulang: record ? record.pulang : null,
      keterangan: record ? record.keterangan : '',
      durasi: attendanceDuration(record),
      hasPin: !!emp.pin_hash,
    };
  });

  const stats = {
    total: employees.length,
    hadir: 0, terlambat: 0, izin: 0, sakit: 0, cuti: 0, dinas: 0, alpa: 0, belum: 0,
  };
  for (const emp of employees) {
    if (emp.status === 'BELUM') stats.belum += 1;
    else stats[emp.status.toLowerCase()] = (stats[emp.status.toLowerCase()] || 0) + 1;
  }

  return {
    tanggal,
    hari: HARI[date.getDay()],
    hariKerja: settings.hari_kerja.includes(date.getDay()) && !libur,
    libur,
    jamMasuk: settings.jam_masuk,
    jamPulang: settings.jam_pulang,
    stats,
    employees,
  };
}

function workingDaysBetween(from, to, settings, holidaySet) {
  const days = [];
  for (let d = parseISO(from); isoDate(d) <= to; d = addDays(d, 1)) {
    const iso = isoDate(d);
    if (!settings.hari_kerja.includes(d.getDay())) continue;
    if (holidaySet.has(iso)) continue;
    days.push(iso);
  }
  return days;
}

function recap({ from, to, unit = '', employeeId = null }) {
  if (!isValidDate(from) || !isValidDate(to)) throw new Error('Periode tidak valid');
  if (from > to) throw new Error('Tanggal awal harus sebelum tanggal akhir');
  const span = Math.round((parseISO(to) - parseISO(from)) / 86400000);
  if (span > 400) throw new Error('Periode maksimal 400 hari');

  const settings = getSettings();
  const holidaySet = new Set(holidayMap(from, to).keys());
  const days = workingDaysBetween(from, to, settings, holidaySet);
  const today = isoDate();
  // Hari ini baru dihitung "terlewati" setelah jam pulang, supaya pagi hari
  // pegawai belum otomatis tercatat alpa.
  const nowTime = isoTime();
  const isDayDone = (tanggal) => tanggal < today || (tanggal === today && nowTime >= settings.jam_pulang);
  const elapsedDays = days.filter(isDayDone);

  let employees;
  if (employeeId) {
    const emp = getEmployee(employeeId);
    employees = emp ? [emp] : [];
  } else {
    const all = listEmployees({ includeInactive: false });
    employees = unit ? all.filter((emp) => emp.unit === unit) : all;
  }

  const records = db.prepare(
    'SELECT * FROM attendance WHERE tanggal BETWEEN ? AND ?'
  ).all(from, to);
  const byKey = new Map(records.map((r) => [`${r.employee_id}|${r.tanggal}`, r]));
  const byEmployee = new Map();
  for (const record of records) {
    if (!byEmployee.has(record.employee_id)) byEmployee.set(record.employee_id, []);
    byEmployee.get(record.employee_id).push(record.tanggal);
  }

  const rows = employees.map((emp) => {
    const counts = { HADIR: 0, TERLAMBAT: 0, IZIN: 0, SAKIT: 0, CUTI: 0, DINAS: 0, ALPA: 0 };
    const dayRows = [];

    // Hari efektif: sejak pegawai terdaftar, atau sejak catatan absensi paling awal.
    let startDate = emp.created_at && emp.created_at > from ? emp.created_at : from;
    const empDates = byEmployee.get(emp.id);
    if (empDates) {
      for (const tanggal of empDates) {
        if (tanggal < startDate) startDate = tanggal;
      }
    }

    for (const tanggal of days) {
      const record = byKey.get(`${emp.id}|${tanggal}`) || null;
      let status = record ? record.status : null;
      if (!status && tanggal >= startDate && isDayDone(tanggal)) status = 'ALPA';
      if (status) counts[status] += 1;
      dayRows.push({
        tanggal,
        status,
        masuk: record ? record.masuk : null,
        pulang: record ? record.pulang : null,
        keterangan: record ? record.keterangan : '',
        sumber: record ? record.sumber : null,
        explicit: !!record,
      });
    }

    const empElapsed = elapsedDays.filter((d) => d >= startDate).length;
    const hadirTotal = counts.HADIR + counts.TERLAMBAT;
    const persen = empElapsed > 0 ? Math.min(100, Math.round((hadirTotal / empElapsed) * 100)) : 0;

    return {
      id: emp.id,
      nama: emp.nama,
      nip: emp.nip,
      jabatan: emp.jabatan,
      unit: emp.unit,
      hadir: counts.HADIR,
      terlambat: counts.TERLAMBAT,
      izin: counts.IZIN,
      sakit: counts.SAKIT,
      cuti: counts.CUTI,
      dinas: counts.DINAS,
      alpa: counts.ALPA,
      hadirTotal,
      hariKerja: days.length,
      hariBerjalan: empElapsed,
      persen,
      days: dayRows,
    };
  });

  const totalPersen = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + row.persen, 0) / rows.length)
    : 0;

  return {
    from,
    to,
    hariKerja: days.length,
    hariBerjalan: elapsedDays.length,
    totalPegawai: rows.length,
    rataPersen: totalPersen,
    totalAlpa: rows.reduce((sum, row) => sum + row.alpa, 0),
    hariLibur: [...holidayMap(from, to).entries()].map(([tanggal, nama]) => ({ tanggal, nama })),
    employees: rows,
  };
}

function units() {
  return db.prepare("SELECT DISTINCT unit FROM employees WHERE unit <> '' ORDER BY unit COLLATE NOCASE")
    .all()
    .map((row) => row.unit);
}

/* ------------------------------------------------------------------ */
/* Data contoh & reset                                                 */
/* ------------------------------------------------------------------ */

function clearAttendance() {
  const info = db.prepare('DELETE FROM attendance').run();
  return Number(info.changes);
}

function seedDemo() {
  const employees = listEmployees({ includeInactive: false });
  if (!employees.length) throw new Error('Belum ada pegawai');
  clearAttendance();

  const settings = getSettings();
  const today = new Date();
  const start = addDays(today, -34);
  const holidaySet = new Set(holidayMap(isoDate(start), isoDate(today)).keys());
  const days = workingDaysBetween(isoDate(start), isoDate(today), settings, holidaySet)
    .filter((tanggal) => tanggal < isoDate(today));

  const insert = db.prepare(`
    INSERT INTO attendance (employee_id, tanggal, status, masuk, pulang, keterangan, sumber, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'contoh', ?)
  `);

  db.exec('BEGIN');
  try {
    for (const emp of employees) {
      const discipline = 0.86 + Math.random() * 0.12;
      for (const tanggal of days) {
        const roll = Math.random();
        let status = null;
        if (roll < discipline) status = Math.random() < 0.12 ? 'TERLAMBAT' : 'HADIR';
        else if (roll < discipline + 0.045) status = 'IZIN';
        else if (roll < discipline + 0.075) status = 'SAKIT';
        else if (roll < discipline + 0.09) status = 'CUTI';
        else if (roll < discipline + 0.105) status = 'DINAS';
        else status = 'ALPA';

        if (status === 'HADIR' || status === 'TERLAMBAT') {
          const base = toMinutes(settings.jam_masuk);
          const offset = status === 'HADIR'
            ? Math.floor(Math.random() * 14) - 12
            : 16 + Math.floor(Math.random() * 35);
          const inMin = Math.max(5 * 60 + 30, base + offset);
          const outMin = toMinutes(settings.jam_pulang) + Math.floor(Math.random() * 25) - 5;
          const fmt = (mins) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
          insert.run(
            emp.id, tanggal, status, fmt(inMin), fmt(outMin),
            status === 'TERLAMBAT' ? 'Terlambat' : '',
            nowISO()
          );
        } else if (status !== 'ALPA') {
          insert.run(emp.id, tanggal, status, null, null, '', nowISO());
        }
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return days.length;
}

/* ------------------------------------------------------------------ */
/* Seed awal                                                           */
/* ------------------------------------------------------------------ */

function seedIfEmpty() {
  if (!rawSetting('admin_password')) setPassword('admin123');

  // Penanda agar data contoh tidak muncul kembali setelah semua pegawai dihapus.
  if (rawSetting('seeded') === '1') return;

  const count = db.prepare('SELECT COUNT(*) AS n FROM employees').get().n;
  if (count > 0) {
    setSetting('seeded', '1');
    return;
  }

  const people = [
    // Perangkat Desa Batujajar Barat — kosongkan seed contoh Sukamaju.
    // Admin cukup tambah pegawai lewat menu Pegawai saat pertama pakai.
  ];

  const insert = db.prepare(
    'INSERT INTO employees (nama, nip, jabatan, unit, aktif, created_at) VALUES (?, ?, ?, ?, 1, ?)'
  );
  const tgl = isoDate();
  db.exec('BEGIN');
  try {
    for (const [nama, nip, jabatan, unit] of people) insert.run(nama, nip, jabatan, unit, tgl);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  // Hari libur nasional 2026 (dapat diubah di Pengaturan)
  const libur = [
    ['2026-01-01', 'Tahun Baru 2026'],
    ['2026-03-19', 'Hari Raya Nyepi'],
    ['2026-03-20', 'Idul Fitri 1447 H'],
    ['2026-03-21', 'Idul Fitri 1447 H'],
    ['2026-04-03', 'Wafat Isa Almasih'],
    ['2026-05-01', 'Hari Buruh Internasional'],
    ['2026-05-14', 'Kenaikan Isa Almasih'],
    ['2026-05-27', 'Idul Adha 1447 H'],
    ['2026-06-01', 'Hari Lahir Pancasila'],
    ['2026-08-17', 'Hari Kemerdekaan RI'],
    ['2026-08-25', 'Maulid Nabi Muhammad SAW'],
    ['2026-12-25', 'Hari Raya Natal'],
  ];
  const insertHoliday = db.prepare('INSERT OR IGNORE INTO holidays (tanggal, nama) VALUES (?, ?)');
  for (const [tanggal, nama] of libur) insertHoliday.run(tanggal, nama);

  setSetting('seeded', '1');
}

seedIfEmpty();

module.exports = {
  db,
  isoDate,
  isoTime,
  nowISO,
  isValidDate,
  isValidTime,
  getSettings,
  publicSettings,
  updateSettings,
  verifyPassword,
  setPassword,
  isDefaultPassword,
  sessionSecret,
  rotateSessionSecret,
  logAudit,
  listAudit,
  clearAudit,
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getAttendance,
  upsertAttendance,
  deleteAttendance,
  clockInOut,
  dashboard,
  recap,
  units,
  listHolidays,
  addHoliday,
  deleteHoliday,
  clearAttendance,
  seedDemo,
  setEmployeePin,
  verifyPin,
  hasPin,
  createPegawaiToken,
  verifyPegawaiToken,
  findEmployeeByNip,
  pegawaiAbsen,
  pegawaiStatusHariIni,
  pegawaiRiwayat,
  pegawaiSudahAbsen,
  saveUploadFile,
  HARI,
  BULAN,
};
