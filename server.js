'use strict';

/**
 * Absen Desa — server lokal tanpa dependensi (Node.js >= 22).
 * Jalankan: node server.js  (atau klik start.bat)
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

const store = require('./db');

const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');
const COOKIE = 'absen_sesi';
const SESSION_TTL = 12 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* Sesi                                                                */
/* ------------------------------------------------------------------ */

const SECRET = store.sessionSecret();

function sign(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('base64url');
}

function createSession() {
  const payload = Buffer.from(JSON.stringify({ sub: 'admin', exp: Date.now() + SESSION_TTL })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function sessionValid(token) {
  if (!token || typeof token !== 'string') return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data.sub === 'admin' && Number(data.exp) > Date.now();
  } catch {
    return false;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function isAuthed(req) {
  return sessionValid(parseCookies(req)[COOKIE]);
}

function pegawaiAuthed(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) return store.verifyPegawaiToken(token);
  return null;
}

/* ------------------------------------------------------------------ */
/* Utilitas HTTP                                                       */
/* ------------------------------------------------------------------ */

class HttpError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function sendJSON(res, status, data, extraHeaders = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 512 * 1024) {
        reject(new HttpError('Data terlalu besar', 413));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new HttpError('Format data tidak valid', 400));
      }
    });
    req.on('error', reject);
  });
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/* ------------------------------------------------------------------ */
/* Pembatasan percobaan masuk                                          */
/* ------------------------------------------------------------------ */

const attempts = new Map();

function loginBlocked(ip) {
  const entry = attempts.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.first > 5 * 60 * 1000) {
    attempts.delete(ip);
    return false;
  }
  return entry.count >= 6;
}

function noteFailure(ip) {
  const entry = attempts.get(ip) || { count: 0, first: Date.now() };
  entry.count += 1;
  attempts.set(ip, entry);
}

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

async function handleApi(req, res, url) {
  const method = req.method;
  const route = url.pathname.replace(/^\/api/, '');
  const ip = req.socket.remoteAddress || 'lokal';

  /* --- publik --- */
  if (route === '/public' && method === 'GET') {
    return sendJSON(res, 200, {
      settings: store.publicSettings(),
      defaultPassword: store.isDefaultPassword(),
    });
  }

  if (route === '/auth/login' && method === 'POST') {
    if (loginBlocked(ip)) {
      throw new HttpError('Terlalu banyak percobaan. Tunggu 5 menit.', 429);
    }
    const body = await readBody(req);
    if (!store.verifyPassword(body.password || '')) {
      noteFailure(ip);
      throw new HttpError('Kata sandi salah', 401);
    }
    attempts.delete(ip);
    const token = createSession();
    res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`);
    return sendJSON(res, 200, { ok: true, admin: store.getSettings().admin_nama });
  }

  if (route === '/auth/logout' && method === 'POST') {
    res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
    return sendJSON(res, 200, { ok: true });
  }

  if (route === '/auth/me' && method === 'GET') {
    if (!isAuthed(req)) throw new HttpError('Belum masuk', 401);
    return sendJSON(res, 200, {
      ok: true,
      admin: store.getSettings().admin_nama,
      defaultPassword: store.isDefaultPassword(),
    });
  }

  if (route === '/auth/status' && method === 'GET') {
    return sendJSON(res, 200, {
      authenticated: isAuthed(req),
      defaultPassword: store.isDefaultPassword(),
    });
  }

  /* ================= PEGAWAI SELF-SERVICE (Absen via HP) ================= */

  if (route === '/pegawai/login' && method === 'POST') {
    const body = await readBody(req);
    const nip = String(body.nip || '').trim();
    const pin = String(body.pin || '').trim();
    if (!nip) throw new HttpError('NIP wajib diisi');
    if (!pin) throw new HttpError('PIN wajib diisi');
    const emp = store.findEmployeeByNip(nip, { includePinHash: true });
    if (!emp) throw new HttpError('Pegawai tidak ditemukan', 404);
    if (!emp.aktif) throw new HttpError('Pegawai nonaktif', 403);
    if (!emp.pin_hash) throw new HttpError('Pegawai belum punya PIN. Hubungi admin.', 403);
    if (!store.verifyPin(emp.id, pin)) {
      throw new HttpError('PIN salah', 401);
    }
    const token = store.createPegawaiToken(emp.id);
    return sendJSON(res, 200, {
      ok: true,
      token,
      employee: { id: emp.id, nama: emp.nama, nip: emp.nip, jabatan: emp.jabatan, unit: emp.unit },
    });
  }

  if (route === '/pegawai/me' && method === 'GET') {
    const empId = pegawaiAuthed(req);
    if (!empId) throw new HttpError('Belum masuk', 401);
    const data = store.pegawaiStatusHariIni(empId);
    return sendJSON(res, 200, data);
  }

  if (route === '/pegawai/status' && method === 'GET') {
    const empId = pegawaiAuthed(req);
    if (!empId) throw new HttpError('Belum masuk', 401);
    return sendJSON(res, 200, { sudahAbsen: store.pegawaiSudahAbsen(empId) });
  }

  if (route === '/pegawai/riwayat' && method === 'GET') {
    const empId = pegawaiAuthed(req);
    if (!empId) throw new HttpError('Belum masuk', 401);
    const days = num(url.searchParams.get('days')) || 30;
    return sendJSON(res, 200, store.pegawaiRiwayat(empId, days));
  }

  if (route === '/pegawai/absen' && method === 'POST') {
    const empId = pegawaiAuthed(req);
    if (!empId) throw new HttpError('Belum masuk', 401);
    const body = await readBody(req);
    const result = store.pegawaiAbsen({
      employee_id: empId,
      pin: body.pin,
      status: body.status,
      keterangan: body.keterangan,
      photo_path: body.photo_path,
      lat: body.lat,
      lng: body.lng,
    });
    return sendJSON(res, 200, result);
  }

  if (route === '/pegawai/upload' && method === 'POST') {
    const empId = pegawaiAuthed(req);
    if (!empId) throw new HttpError('Belum masuk', 401);
    const chunks = [];
    let size = 0;
    const contentType = req.headers['content-type'] || '';
    await new Promise((resolve, reject) => {
      req.on('data', (chunk) => {
        size += chunk.length;
        if (size > 5 * 1024 * 1024) { reject(new HttpError('File terlalu besar (maks 5MB)', 413)); req.destroy(); return; }
        chunks.push(chunk);
      });
      req.on('end', resolve);
      req.on('error', reject);
    });
    const buffer = Buffer.concat(chunks);
    if (!buffer.length) throw new HttpError('File kosong');
    const filename = url.searchParams.get('filename') || `absen_${empId}.jpg`;
    const photoPath = store.saveUploadFile(empId, buffer, filename, contentType);
    return sendJSON(res, 200, { ok: true, photo_path: photoPath });
  }

  /* --- semua rute di bawah wajib login --- */
  if (!isAuthed(req)) throw new HttpError('Sesi berakhir, silakan masuk lagi', 401);

  if (route === '/bootstrap' && method === 'GET') {
    return sendJSON(res, 200, {
      settings: store.publicSettings(),
      employees: store.listEmployees(),
      units: store.units(),
      holidays: store.listHolidays(),
      today: store.isoDate(),
    });
  }

  if (route === '/dashboard' && method === 'GET') {
    return sendJSON(res, 200, store.dashboard(url.searchParams.get('tanggal') || store.isoDate()));
  }

  if (route === '/absen' && method === 'POST') {
    const body = await readBody(req);
    if (!body.employee_id) throw new HttpError('Pegawai belum dipilih');
    const result = store.clockInOut(num(body.employee_id));
    return sendJSON(res, 200, {
      action: result.action,
      jam: result.jam,
      nama: result.employee.nama,
      status: result.status,
      tanggal: store.isoDate(),
    });
  }

  if (route === '/attendance' && method === 'PUT') {
    const body = await readBody(req);
    const record = store.upsertAttendance({
      employee_id: num(body.employee_id),
      tanggal: body.tanggal,
      status: body.status,
      masuk: body.masuk,
      pulang: body.pulang,
      keterangan: body.keterangan,
      sumber: 'manual',
    });
    return sendJSON(res, 200, record);
  }

  if (route === '/attendance' && method === 'DELETE') {
    const employeeId = num(url.searchParams.get('employee_id'));
    const tanggal = url.searchParams.get('tanggal');
    if (!employeeId || !store.isValidDate(tanggal)) throw new HttpError('Data tidak lengkap');
    return sendJSON(res, 200, { ok: true, deleted: store.deleteAttendance(employeeId, tanggal) });
  }

  if (route === '/attendance/clear' && method === 'POST') {
    const count = store.clearAttendance();
    return sendJSON(res, 200, { ok: true, deleted: count });
  }

  if (route === '/recap' && method === 'GET') {
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const unit = url.searchParams.get('unit') || '';
    const employeeId = url.searchParams.get('employee_id');
    return sendJSON(res, 200, store.recap({
      from,
      to,
      unit,
      employeeId: employeeId ? num(employeeId) : null,
    }));
  }

  if (route === '/employees' && method === 'GET') {
    return sendJSON(res, 200, store.listEmployees());
  }

  if (route === '/employees' && method === 'POST') {
    const body = await readBody(req);
    return sendJSON(res, 201, store.createEmployee(body));
  }

  const employeeMatch = route.match(/^\/employees\/(\d+)$/);
  if (employeeMatch && method === 'PUT') {
    const body = await readBody(req);
    return sendJSON(res, 200, store.updateEmployee(num(employeeMatch[1]), body));
  }

  if (employeeMatch && method === 'DELETE') {
    return sendJSON(res, 200, { ok: true, deleted: store.deleteEmployee(num(employeeMatch[1])) });
  }

  if (route === '/settings' && method === 'PUT') {
    const body = await readBody(req);
    return sendJSON(res, 200, store.updateSettings(body));
  }

  if (route === '/password' && method === 'PUT') {
    const body = await readBody(req);
    if (!store.verifyPassword(body.current || '')) throw new HttpError('Kata sandi lama salah', 400);
    const next = String(body.next || '');
    if (next.length < 6) throw new HttpError('Kata sandi baru minimal 6 karakter', 400);
    store.setPassword(next);
    return sendJSON(res, 200, { ok: true });
  }

  if (route === '/holidays' && method === 'GET') {
    return sendJSON(res, 200, store.listHolidays());
  }

  if (route === '/holidays' && method === 'POST') {
    const body = await readBody(req);
    return sendJSON(res, 201, store.addHoliday(body.tanggal, body.nama));
  }

  const holidayMatch = route.match(/^\/holidays\/(\d+)$/);
  if (holidayMatch && method === 'DELETE') {
    return sendJSON(res, 200, { ok: true, deleted: store.deleteHoliday(num(holidayMatch[1])) });
  }

  if (route === '/demo' && method === 'POST') {
    const days = store.seedDemo();
    return sendJSON(res, 200, { ok: true, days });
  }

  throw new HttpError('Alamat tidak ditemukan', 404);
}

/* ------------------------------------------------------------------ */
/* Berkas statis                                                       */
/* ------------------------------------------------------------------ */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.json': 'application/json; charset=utf-8',
};

function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  // Pegawai routes
  if (pathname === '/pegawai' || pathname === '/pegawai/') pathname = '/pegawai/login.html';
  if (pathname === '/pegawai/absen' || pathname === '/pegawai/absen/') pathname = '/pegawai/absen.html';
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end('Akses ditolak');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (path.extname(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Berkas tidak ditemukan');
        return;
      }
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, html) => {
        if (err2) res.writeHead(404).end('Halaman tidak ditemukan');
        else res.writeHead(200, { 'Content-Type': MIME['.html'] }).end(html);
      });
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
}

/* ------------------------------------------------------------------ */
/* Server                                                              */
/* ------------------------------------------------------------------ */

async function requestHandler(req, res) {
  const started = Date.now();
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  try {
    if (url.pathname.startsWith('/api')) {
      await handleApi(req, res, url);
    } else {
      serveStatic(req, res, url);
    }
  } catch (err) {
    const status = err.status || 400;
    if (status >= 500) console.error(err);
    if (!res.headersSent) sendJSON(res, status, { error: err.message || 'Terjadi kesalahan' });
    else res.end();
  }

  const ms = Date.now() - started;
  console.log(`${new Date().toLocaleTimeString('id-ID')}  ${req.method.padEnd(6)} ${url.pathname}  ${ms}ms`);
}

/**
 * Menyalakan server. Dipakai oleh CLI (`node server.js`) maupun aplikasi
 * desktop Electron. `port: 0` berarti pilih port kosong otomatis.
 */
function startServer({ port = PORT, host = HOST } = {}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(requestHandler);
    server.once('error', reject);
    server.listen(port, host, () => {
      const actual = server.address().port;
      resolve({
        server,
        port: actual,
        url: `http://localhost:${actual}`,
      });
    });
  });
}

/* Jalankan sebagai aplikasi baris perintah: `node server.js` */
if (require.main === module) {
  startServer()
    .then(({ url, port }) => {
      console.log('');
      console.log('  ABSEN DESA — siap digunakan');
      console.log(`  ${url}`);
      console.log('  Biarkan jendela ini tetap terbuka selama absensi.');
      console.log('');

      if (process.argv.includes('--open')) {
        const opener = spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' });
        opener.unref();
      }
    })
    .catch((err) => {
      if (err && err.code === 'EADDRINUSE') {
        console.error(`\n  Port ${PORT} sedang dipakai. Tutup jendela Absen Desa yang lain, lalu jalankan lagi.\n`);
      } else {
        console.error(err);
      }
      process.exit(1);
    });
}

module.exports = { startServer };
