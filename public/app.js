'use strict';

/* =====================================================================
   Absen Desa — antarmuka
   ===================================================================== */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const pad2 = (n) => String(n).padStart(2, '0');

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const STATUS = {
  BELUM: { label: 'Belum absen', cls: 'belum' },
  HADIR: { label: 'Hadir', cls: 'hadir' },
  TERLAMBAT: { label: 'Terlambat', cls: 'terlambat' },
  IZIN: { label: 'Izin', cls: 'izin' },
  SAKIT: { label: 'Sakit', cls: 'sakit' },
  CUTI: { label: 'Cuti', cls: 'cuti' },
  DINAS: { label: 'Dinas luar', cls: 'dinas' },
  ALPA: { label: 'Alpa', cls: 'alpa' },
};

const MANUAL_STATUS = [
  ['HADIR', 'Hadir'],
  ['TERLAMBAT', 'Terlambat'],
  ['IZIN', 'Izin'],
  ['SAKIT', 'Sakit'],
  ['CUTI', 'Cuti'],
  ['DINAS', 'Dinas luar'],
  ['ALPA', 'Alpa'],
];

const STAT_DEFS = [
  { key: 'hadir', label: 'Hadir', color: '#3f8a5f' },
  { key: 'terlambat', label: 'Terlambat', color: '#c08a2e' },
  { key: 'izin', label: 'Izin & cuti', color: '#4a72b8', sum: ['izin', 'sakit', 'cuti', 'dinas'] },
  { key: 'alpa', label: 'Alpa', color: '#b04a44' },
  { key: 'belum', label: 'Belum absen', color: '#9aa29b' },
];

const ICONS = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg>',
  print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 8V3h10v5"/><path d="M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><path d="M7 14h10v7H7z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7"/><path d="M10 11v6M14 11v6"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>',
  power: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v9"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>',
};

const AVATAR_TONES = [
  ['#e6efe4', '#356043'],
  ['#f2e9da', '#8a5f26'],
  ['#e5ecf4', '#35587b'],
  ['#f3e7e7', '#7c3b3b'],
  ['#ebe7f2', '#5b437a'],
  ['#e2eeec', '#2f6f69'],
];

const state = {
  settings: null,
  employees: [],
  units: [],
  holidays: [],
  today: '',
  defaultPassword: false,
  view: '',
  csrf: '',
  dark: localStorage.getItem('absen-theme') === 'dark',
  absensi: { q: '', unit: '', filter: 'semua', data: null },
  recap: {
    mode: 'month',
    month: '',
    from: '',
    to: '',
    unit: '',
    data: null,
    token: 0,
  },
};

const absenBusy = new Set();
let modalCloseHandler = null;
let lastDate = null;

/* ------------------------------- utilitas ------------------------------ */

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseISO(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function isoOf(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function todayISO() {
  return isoOf(new Date());
}

function currentMonth() {
  return todayISO().slice(0, 7);
}

function monthStart(month) {
  return `${month}-01`;
}

function monthEnd(month) {
  const [y, m] = month.split('-').map(Number);
  return isoOf(new Date(y, m, 0));
}

function fmtLong(iso) {
  const d = parseISO(iso);
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtMedium(iso) {
  const d = parseISO(iso);
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

function fmtDate(iso) {
  const d = parseISO(iso);
  return `${d.getDate()} ${BULAN[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

function fmtDateTime(raw) {
  const [date, time] = String(raw || '').split(' ');
  if (!date) return '';
  return `${fmtDate(date)} ${String(time || '').slice(0, 5)}`.trim();
}

function fmtPeriod(from, to) {
  const a = parseISO(from);
  const b = parseISO(to);
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) {
    return `${a.getDate()} – ${b.getDate()} ${BULAN[b.getMonth()]} ${b.getFullYear()}`;
  }
  return `${a.getDate()} ${BULAN[a.getMonth()]} ${a.getFullYear()} – ${b.getDate()} ${BULAN[b.getMonth()]} ${b.getFullYear()}`;
}

function nowStr() { const d = new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }

function initials(name) {
  const parts = String(name || '')
    .replace(/[^\p{L}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 1);
  if (!parts.length) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[1][0] : '';
  return (first + last).toUpperCase();
}

function avatarHTML(name, extra = '') {
  let hash = 0;
  for (const ch of String(name)) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  const [bg, fg] = AVATAR_TONES[hash % AVATAR_TONES.length];
  return `<span class="avatar ${extra}" style="background:${bg};color:${fg}">${esc(initials(name))}</span>`;
}

function fmtDuration(minutes) {
  if (minutes == null) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}m`;
  return `${h}j ${pad2(m)}m`;
}

function statusPill(status) {
  const s = STATUS[status] || STATUS.BELUM;
  return `<span class="pill ${s.cls}"><i class="dot"></i>${s.label}</span>`;
}

function statusOptions(selected, includeEmpty = true) {
  const rows = MANUAL_STATUS.map(
    ([value, label]) => `<option value="${value}"${value === selected ? ' selected' : ''}>${label}</option>`
  ).join('');
  return `${includeEmpty ? `<option value=""${!selected ? ' selected' : ''}>Tanpa catatan</option>` : ''}${rows}`;
}

function toast(message, type = 'success') {
  const wrap = $('#toasts');
  if (!wrap) return;
  while (wrap.children.length > 2) wrap.firstElementChild.remove();
  const el = document.createElement('div');
  el.className = `toast${type === 'error' ? ' error' : ''}`;
  el.innerHTML = `<i class="dot"></i><div>${message}</div>`;
  wrap.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 220);
  }, 3400);
}

async function api(path, options = {}) {
  const { method = 'GET', body } = options;
  const needsCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase());
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (needsCsrf) {
    if (!state.csrf) {
      try {
        const cs = await api('/csrf-token');
        state.csrf = cs.token;
      } catch { /* token akan dicoba lagi di request berikutnya */ }
    }
    if (state.csrf) headers['X-CSRF-Token'] = state.csrf;
  }
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    if (res.status === 401 && state.settings) showLogin();
    if (res.status === 403 && data && data.error && data.error.includes('CSRF')) {
      state.csrf = ''; // Paksa ambil token baru
    }
    const err = new Error((data && data.error) || 'Terjadi kesalahan pada server');
    err.status = res.status;
    throw err;
  }
  return data;
}

/* --------------------------------- jam --------------------------------- */

function tick() {
  const now = new Date();
  const hh = pad2(now.getHours());
  const mm = pad2(now.getMinutes());
  const ss = pad2(now.getSeconds());
  const top = $('#top-clock');
  if (top) top.textContent = `${hh}:${mm}`;
  const xl = $('#clock-xl');
  if (xl) xl.innerHTML = `${hh}:${mm}<span class="sec">:${ss}</span>`;
  const topDate = $('#top-date');
  if (topDate) topDate.textContent = fmtMedium(isoOf(now));
  const authDate = $('#auth-date');
  if (authDate) authDate.textContent = fmtMedium(isoOf(now));

  const tgl = isoOf(now);
  if (lastDate && lastDate !== tgl && state.settings) {
    state.today = tgl;
    if (state.view === 'absensi') renderAbsensi();
  }
  lastDate = tgl;
}

/* -------------------------------- masuk -------------------------------- */

function showLogin() {
  state.settings = null;
  closeModal();
  $('#app').hidden = true;
  $('#login').hidden = false;
  const input = $('#login-password');
  if (input) {
    input.value = '';
    setTimeout(() => input.focus(), 60);
  }
}

function applyIdentity() {
  const s = state.settings;
  if (!s) return;
  document.querySelectorAll('[data-village]').forEach((el) => {
    el.textContent = s.nama_kantor;
  });
  const side = $('#side-village');
  if (side) side.textContent = s.nama_desa;
  const name = $('#admin-name');
  if (name) name.textContent = s.admin_nama;
  const av = $('#admin-avatar');
  if (av) av.textContent = initials(s.admin_nama);
  document.title = `Absen Desa — ${s.nama_desa}`;
}

function applyTheme() {
  document.documentElement.classList.toggle('dark', state.dark);
  localStorage.setItem('absen-theme', state.dark ? 'dark' : 'light');
  const moon = $('.icon-moon', document);
  const sun = $('.icon-sun', document);
  if (moon) moon.style.display = state.dark ? 'none' : '';
  if (sun) sun.style.display = state.dark ? '' : 'none';
  const btn = $('#theme-btn');
  if (btn) btn.title = state.dark ? 'Tema terang' : 'Tema gelap';
}

function toggleTheme() {
  state.dark = !state.dark;
  applyTheme();
  toast(state.dark ? 'Tema gelap diaktifkan' : 'Tema terang diaktifkan');
}

function showLoading(viewEl, text = 'Memuat…') {
  if (!viewEl) return;
  viewEl.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>${esc(text)}</p>
    </div>`;
}

function showEmpty({ icon, title, text, action } = {}) {
  return `
    <div class="empty-state">
      <div class="empty-ic">${icon || ICONS.info}</div>
      <h3>${esc(title || 'Tidak ada data')}</h3>
      <p>${esc(text || 'Belum ada data untuk ditampilkan.')}</p>
      ${action ? `<button class="btn btn-primary" id="empty-action">${esc(action.label)}</button>` : ''}
    </div>`;
}

async function bootstrapPublic() {
  try {
    const pub = await api('/public');
    document.querySelectorAll('[data-village]').forEach((el) => {
      el.textContent = pub.settings.nama_kantor;
    });
    const hint = $('#login-hint');
    if (hint) hint.hidden = !pub.defaultPassword;
    document.title = `Absen Desa — ${pub.settings.nama_desa}`;
    return pub;
  } catch {
    return null;
  }
}

async function reloadBootstrap() {
  const data = await api('/bootstrap');
  state.settings = data.settings;
  state.employees = data.employees;
  state.units = data.units;
  state.holidays = data.holidays;
  state.today = data.today;
  state.defaultPassword = !!data.defaultPassword;
  applyIdentity();
  return data;
}

async function enterApp() {
  await reloadBootstrap();
  $('#login').hidden = true;
  $('#app').hidden = false;
  if (!location.hash || !['absensi', 'pegawai', 'rekap', 'pengaturan'].includes(location.hash.slice(1))) {
    location.hash = '#absensi';
  }
  await renderView();
  tick();
  if (state.defaultPassword) showDefaultPasswordBanner();
}

function showDefaultPasswordBanner() {
  if (document.getElementById('default-pw-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'default-pw-banner';
  banner.className = 'default-pw-banner';
  banner.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/></svg>
    <div>
      <strong>Kata sandi bawaan masih dipakai (admin123)</strong>
      <span>Siapa pun yang membuka laptop ini bisa masuk panel admin. Ganti segera di <a href="#pengaturan">Pengaturan → Keamanan</a>.</span>
    </div>
    <button class="icon-btn" aria-label="Tutup" data-close="1">${ICONS.close}</button>`;
  document.body.appendChild(banner);
  banner.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) banner.remove();
    if (e.target.tagName === 'A') {
      banner.remove();
      location.hash = '#pengaturan';
    }
  });
}

function hideDefaultPasswordBanner() {
  const banner = document.getElementById('default-pw-banner');
  if (banner) banner.remove();
}

/* ------------------------------- navigasi ------------------------------ */

const VIEW_NAMES = { absensi: 'Absensi', pegawai: 'Pegawai', rekap: 'Rekap', pengaturan: 'Pengaturan' };

async function renderView() {
  if (!state.settings) return;
  const view = (location.hash || '#absensi').replace(/^#/, '') || 'absensi';
  if (!VIEW_NAMES[view]) return;
  state.view = view;
  $$('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.view === view));
  const crumb = $('#crumb-view');
  if (crumb) crumb.textContent = VIEW_NAMES[view];
  closeModal();

  const viewEl = $('#view');
  showLoading(viewEl);

  try {
    if (view === 'absensi') await renderAbsensi();
    else if (view === 'pegawai') await renderPegawai();
    else if (view === 'rekap') await renderRekap();
    else await renderPengaturan();
  } catch (err) {
    if (!state.settings) return;
    const el = $('#view');
    if (!el) return;
    el.innerHTML = `
      <div class="empty-state">
        <h3>Tidak dapat memuat halaman</h3>
        <p>${esc(err.message)}</p>
        <button class="btn" id="retry-btn">Coba lagi</button>
      </div>`;
    const retry = $('#retry-btn');
    if (retry) retry.onclick = () => renderView();
  }
}

/* -------------------------------- absensi ------------------------------ */

function statsHTML(stats) {
  return STAT_DEFS.map((def) => {
    const value = def.sum
      ? def.sum.reduce((total, key) => total + (stats[key] || 0), 0)
      : stats[def.key] || 0;
    return `
      <div class="stat">
        <span class="stat-label"><i class="dot" style="background:${def.color}"></i>${def.label}</span>
        <span class="stat-value" data-stat="${def.key}">${value}</span>
      </div>`;
  }).join('');
}

function unitOptions(selected = '', label = 'Semua unit') {
  const rows = state.units
    .map((unit) => `<option value="${esc(unit)}"${unit === selected ? ' selected' : ''}>${esc(unit)}</option>`)
    .join('');
  return `<option value=""${!selected ? ' selected' : ''}>${label}</option>${rows}`;
}

function cardHTML(emp) {
  const st = STATUS[emp.status] || STATUS.BELUM;
  const canIn = emp.status === 'BELUM';
  const canOut = (emp.status === 'HADIR' || emp.status === 'TERLAMBAT') && !emp.pulang;
  const finished = (emp.status === 'HADIR' || emp.status === 'TERLAMBAT') && emp.pulang;
  const duration = emp.durasi != null ? fmtDuration(emp.durasi) : '';
  const search = `${emp.nama} ${emp.nip} ${emp.jabatan} ${emp.unit}`.toLowerCase();
  const statusBadge = emp.status === 'BELUM'
    ? `<span class="status-now">Belum absen</span>`
    : `<span class="status-now done">${esc(st.label)}</span>`;
  const pinBadge = emp.hasPin ? `<span class="pin-badge" title="Pegawai ini memiliki PIN">${ICONS.check}</span>` : '';

  return `<article class="emp-card" data-id="${emp.id}" data-status="${emp.status}" data-unit="${esc(emp.unit)}" data-search="${esc(search)}" data-has-pin="${emp.hasPin ? '1' : '0'}">
    ${statusBadge}
    ${avatarHTML(emp.nama)}
    <div class="emp-name" title="${esc(emp.nama)}">${esc(emp.nama)}${pinBadge}</div>
    <div class="emp-role" title="${esc(emp.jabatan)}">${esc(emp.jabatan || 'Pegawai')}</div>
    ${emp.nip ? `<div class="emp-nip">${esc(emp.nip)}</div>` : ''}
    ${emp.unit ? `<div class="unit-tag">${esc(emp.unit)}</div>` : ''}
    <div class="emp-times"><div><span>Masuk</span><b>${emp.masuk ? esc(emp.masuk) : '—'}</b></div><div><span>Pulang</span><b>${emp.pulang ? esc(emp.pulang) : '—'}</b></div></div>
    <div class="emp-actions">
      <button class="btn btn-primary btn-block" data-absen="${emp.id}"${canIn || canOut ? '' : ' disabled'}>${canIn ? 'Masuk · ' + esc(emp.masuk || nowStr()) : canOut ? 'Pulang · ' + nowStr() : 'Sudah lengkap'}</button>
      <button class="btn btn-block" data-detail="${emp.id}">${finished ? 'Lihat catatan' : 'Catat izin / Ubah'}</button>
    </div>
  </article>`;
}

async function renderAbsensi() {
  const viewEl = $('#view');
  showLoading(viewEl);
  const data = await api('/dashboard');
  if (!state.settings) return;
  state.absensi.data = data;
  state.today = data.tanggal;
  paintAbsensi();
  bindAbsensi();
}

function paintAbsensi() {
  const data = state.absensi.data;
  const s = state.settings;
  const ui = state.absensi;
  const libur = data.libur;
  const pwNote = state.defaultPassword
    ? `<div class="holiday-note" role="alert"><strong>Kata sandi masih bawaan.</strong>
         <span>Segera ganti <strong>admin123</strong> di <a href="#pengaturan">Pengaturan → Keamanan</a> agar panel tidak bisa dibuka orang lain.</span></div>`
    : '';
  const note = pwNote + (libur
    ? `<div class="holiday-note">${ICONS.info}<span><strong>${esc(libur)}</strong> — hari libur. Absensi tetap dapat dicatat bila ada pegawai yang masuk.</span></div>`
    : (!data.hariKerja
      ? `<div class="holiday-note">${ICONS.info}<span>Hari ini bukan hari kerja. Absensi tetap dapat dicatat bila diperlukan.</span></div>`
      : ''));

  $('#view').innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">Absensi</div>
        <h1 class="page-title">Absensi hari ini</h1>
        <p class="page-sub">Cari nama pegawai, lalu tekan tombol <strong>Masuk</strong> atau <strong>Pulang</strong>.</p>
      </div>
      <div class="head-actions">
        <span class="head-meta">${ICONS.clock} Jam kerja ${esc(s.jam_masuk)}–${esc(s.jam_pulang)} · toleransi ${s.toleransi} mnt</span>
      </div>
    </div>
    ${note}
    <section class="today">
      <div class="today-clock">
        <div class="eyebrow">Waktu sekarang</div>
        <div class="clock-xl" id="clock-xl">--:--</div>
        <div class="today-date">${fmtLong(data.tanggal)}</div>
      </div>
      <div class="today-stats" id="today-stats">${statsHTML(data.stats)}</div>
    </section>
    <div class="toolbar">
      <div class="search">
        ${ICONS.search}
        <input class="input" id="search" type="search" placeholder="Cari nama, jabatan, atau unit…"
          value="${esc(ui.q)}" autocomplete="off" spellcheck="false">
        <kbd>/</kbd>
      </div>
      <select class="select" id="unit-filter" aria-label="Filter unit">${unitOptions(ui.unit)}</select>
      <div class="segmented" id="status-filter">
        <button data-filter="semua" class="${ui.filter === 'semua' ? 'active' : ''}">Semua</button>
        <button data-filter="belum" class="${ui.filter === 'belum' ? 'active' : ''}">Belum absen</button>
      </div>
      <div class="toolbar-info" id="toolbar-info"></div>
    </div>
    <div class="emp-grid" id="emp-grid">${data.employees.map(cardHTML).join('')}</div>
    <div class="empty-state" id="emp-empty" hidden>
      <h3>Tidak ada pegawai yang cocok</h3>
      <p>Ubah kata kunci pencarian atau filter unit.</p>
      <button class="btn btn-sm" data-action="reset-filter">Tampilkan semua pegawai</button>
    </div>`;

  applyAbsensiFilters();
  tick();
}

function applyAbsensiFilters() {
  const ui = state.absensi;
  const cards = $$('#emp-grid .emp-card');
  let shown = 0;
  for (const card of cards) {
    const okQ = !ui.q || card.dataset.search.includes(ui.q);
    const okUnit = !ui.unit || card.dataset.unit === ui.unit;
    const okStatus =
      ui.filter === 'semua' ||
      (ui.filter === 'belum' ? card.dataset.status === 'BELUM' : card.dataset.status !== 'BELUM');
    const show = okQ && okUnit && okStatus;
    card.hidden = !show;
    if (show) shown += 1;
  }
  const empty = $('#emp-empty');
  if (empty) empty.hidden = shown > 0;
  const info = $('#toolbar-info');
  if (info) {
    info.textContent = shown === cards.length ? `${shown} pegawai` : `${shown} dari ${cards.length} pegawai`;
  }
}

function resetAbsensiFilters() {
  state.absensi.q = '';
  state.absensi.unit = '';
  state.absensi.filter = 'semua';
  const search = $('#search');
  if (search) search.value = '';
  const unit = $('#unit-filter');
  if (unit) unit.value = '';
  $$('#status-filter button').forEach((b) => b.classList.toggle('active', b.dataset.filter === 'semua'));
  applyAbsensiFilters();
}

function bindAbsensi() {
  const search = $('#search');
  if (search) {
    search.addEventListener('input', () => {
      state.absensi.q = search.value.trim().toLowerCase();
      applyAbsensiFilters();
    });
    search.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!search.value.trim()) return;
        const card = $('#emp-grid .emp-card:not([hidden])');
        if (!card) return;
        const actionable = card.querySelectorAll('[data-absen]:not([disabled])').length > 0;
        if (actionable) doAbsen(Number(card.dataset.id), true);
        else toast('Pegawai ini sudah lengkap absennya hari ini', 'error');
      }
      if (e.key === 'Escape') {
        search.value = '';
        state.absensi.q = '';
        applyAbsensiFilters();
      }
    });
  }

  const unitFilter = $('#unit-filter');
  if (unitFilter) {
    unitFilter.addEventListener('change', () => {
      state.absensi.unit = unitFilter.value;
      applyAbsensiFilters();
    });
  }

  $$('#status-filter button').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.absensi.filter = btn.dataset.filter;
      $$('#status-filter button').forEach((b) => b.classList.toggle('active', b === btn));
      applyAbsensiFilters();
    });
  });

  const grid = $('#emp-grid');
  if (grid) {
    grid.addEventListener('click', (e) => {
      const absenBtn = e.target.closest('[data-absen]');
      if (absenBtn && !absenBtn.disabled) {
        doAbsen(Number(absenBtn.dataset.absen));
        return;
      }
      const detailBtn = e.target.closest('[data-detail]');
      if (detailBtn) openDetail(Number(detailBtn.dataset.detail));
    });
  }

  const empty = $('#emp-empty');
  if (empty) {
    empty.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="reset-filter"]')) resetAbsensiFilters();
    });
  }
}

async function doAbsen(id, clearSearch = false) {
  if (absenBusy.has(id)) return;

  // Cek apakah pegawai memiliki PIN
  const card = $(`#emp-grid .emp-card[data-id="${id}"]`);
  const hasPin = card && card.dataset.hasPin === '1';

  if (hasPin) {
    // Tampilkan modal PIN
    const pin = await showPinModal(id);
    if (pin === null) {
      // User batal
      return;
    }
    return doAbsenWithPin(id, pin, clearSearch);
  }

  return doAbsenWithPin(id, '', clearSearch);
}

async function doAbsenWithPin(id, pin, clearSearch = false) {
  if (absenBusy.has(id)) return;
  absenBusy.add(id);
  try {
    const body = { employee_id: id };
    if (pin) body.pin = pin;
    const result = await api('/absen', { method: 'POST', body });
    const label = result.action === 'masuk' ? 'Masuk' : 'Pulang';
    toast(`<b>${esc(result.nama)}</b> · ${label} ${result.jam} · ${(STATUS[result.status] || {}).label || ''}`);
    if (clearSearch) {
      state.absensi.q = '';
      const search = $('#search');
      if (search) {
        search.value = '';
        search.focus();
      }
    }
    await refreshDashboard();
    const card = $(`#emp-grid .emp-card[data-id="${id}"]`);
    if (card) {
      card.classList.add('flash');
      setTimeout(() => card.classList.remove('flash'), 850);
    }
  } catch (err) {
    // Jika error PIN_REQUIRED atau PIN_INVALID, tampilkan modal ulang
    if (err.status === 401 && (err.message === 'PIN wajib diisi' || err.message === 'PIN salah')) {
      const retryPin = await showPinModal(id, err.message === 'PIN salah');
      if (retryPin !== null) {
        absenBusy.delete(id);
        return doAbsenWithPin(id, retryPin, clearSearch);
      }
    }
    toast(esc(err.message), 'error');
  } finally {
    absenBusy.delete(id);
  }
}

function showPinModal(employeeId, error = false) {
  return new Promise((resolve) => {
    const empCard = $(`#emp-grid .emp-card[data-id="${employeeId}"]`);
    const empName = empCard ? empCard.querySelector('.emp-name').textContent.replace('✓', '').trim() : 'Pegawai';

    let errorHtml = '';
    if (error) {
      errorHtml = `<div class="pin-error">${ICONS.info} PIN salah, coba lagi</div>`;
    }

    openModal({
      title: 'Verifikasi PIN',
      sub: `${esc(empName)} · Masukkan PIN 4–10 digit`,
      body: `
        <div class="pin-modal">
          ${errorHtml}
          <div class="pin-input-wrap">
            <input type="password" id="pin-input" class="input pin-input" inputmode="numeric" pattern="[0-9]*" maxlength="10" autocomplete="off" placeholder="PIN">
            <button type="button" class="icon-btn pin-toggle" id="pin-toggle" aria-label="Tampilkan/sembunyikan PIN">${ICONS.info}</button>
          </div>
          <div class="pin-hint">Hanya pegawai bersangkutan yang tahu PIN ini</div>
        </div>
      `,
      foot: `<button class="btn" data-close="1" data-pin-cancel="1">Batal</button>
        <div class="spacer"></div>
        <button class="btn btn-primary" id="pin-submit" disabled>Konfirmasi</button>`,
      onClose: () => resolve(null),
    });

    const input = $('#pin-input');
    const toggle = $('#pin-toggle');
    const submit = $('#pin-submit');
    const cancelBtn = $('[data-pin-cancel]');

    setTimeout(() => input.focus(), 100);

    input.addEventListener('input', () => {
      submit.disabled = input.value.length < 4;
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !submit.disabled) {
        e.preventDefault();
        closeModal();
        resolve(input.value.trim());
      }
      if (e.key === 'Escape') {
        closeModal();
        resolve(null);
      }
    });

    toggle.addEventListener('click', () => {
      if (input.type === 'password') {
        input.type = 'text';
        toggle.innerHTML = ICONS.close;
      } else {
        input.type = 'password';
        toggle.innerHTML = ICONS.info;
      }
    });

    cancelBtn.addEventListener('click', () => {
      closeModal();
      resolve(null);
    });

    submit.addEventListener('click', () => {
      if (!submit.disabled) {
        closeModal();
        resolve(input.value.trim());
      }
    });
  });
}

async function refreshDashboard() {
  const data = await api('/dashboard');
  if (!state.settings || state.view !== 'absensi') return;
  state.absensi.data = data;
  const grid = $('#emp-grid');
  if (!grid) {
    paintAbsensi();
    bindAbsensi();
    return;
  }
  grid.innerHTML = data.employees.map(cardHTML).join('');
  STAT_DEFS.forEach((def) => {
    const el = $(`[data-stat="${def.key}"]`);
    if (!el) return;
    const value = def.sum ? def.sum.reduce((total, key) => total + (data.stats[key] || 0), 0) : data.stats[def.key] || 0;
    el.textContent = value;
  });
  applyAbsensiFilters();
}

/* --------------------------------- rekap -------------------------------- */

function recapRange() {
  const r = state.recap;
  if (r.mode === 'range' && r.from && r.to) return { from: r.from, to: r.to };
  const month = r.month || currentMonth();
  return { from: monthStart(month), to: monthEnd(month) };
}

function summaryHTML(data) {
  if (!data) return '';
  return `
    <div class="summary-grid">
      <div class="summary">
        <span class="stat-label"><i class="dot" style="background:#15503c"></i>Hari kerja</span>
        <div class="summary-value">${data.hariKerja}<small>hari</small></div>
        <div class="summary-note">${data.hariBerjalan} hari sudah terlewati</div>
      </div>
      <div class="summary">
        <span class="stat-label"><i class="dot" style="background:#4a72b8"></i>Pegawai aktif</span>
        <div class="summary-value">${data.totalPegawai}<small>orang</small></div>
        <div class="summary-note">Dihitung pada periode ini</div>
      </div>
      <div class="summary">
        <span class="stat-label"><i class="dot" style="background:#3f8a5f"></i>Rata-rata kehadiran</span>
        <div class="summary-value">${data.rataPersen}<small class="tight">%</small></div>
        <div class="summary-note">Hadir + terlambat</div>
      </div>
      <div class="summary">
        <span class="stat-label"><i class="dot" style="background:#b04a44"></i>Total alpa</span>
        <div class="summary-value">${data.totalAlpa}<small>hari</small></div>
        <div class="summary-note">Hari kerja tanpa catatan</div>
      </div>
    </div>`;
}

function recapTableHTML(data) {
  if (!data) {
    return `<div class="table-wrap"><div style="padding:56px 20px;text-align:center;color:var(--muted);font-size:13px">Memuat rekap…</div></div>`;
  }
  if (!data.employees.length) {
    return `<div class="empty-state"><h3>Belum ada pegawai aktif</h3><p>Tambahkan pegawai terlebih dahulu untuk melihat rekap.</p></div>`;
  }
  const cell = (v) => (v ? v : '<span class="cell-zero">0</span>');
  const rows = data.employees.map((emp, index) => {
    const cls = emp.persen >= 90 ? '' : emp.persen >= 70 ? 'mid' : 'low';
    return `
      <tr data-emp="${emp.id}">
        <td>
          <div class="p-name">${esc(emp.nama)}</div>
          <div class="p-role">${esc(emp.jabatan)}${emp.unit ? ` · ${esc(emp.unit)}` : ''}</div>
        </td>
        <td class="num">${cell(emp.hadir)}</td>
        <td class="num">${cell(emp.terlambat)}</td>
        <td class="num">${cell(emp.izin)}</td>
        <td class="num">${cell(emp.sakit)}</td>
        <td class="num">${cell(emp.cuti)}</td>
        <td class="num">${cell(emp.dinas)}</td>
        <td class="num">${cell(emp.alpa)}</td>
        <td class="num tot">${emp.hariKerja}</td>
        <td class="num">
          <div class="pct-cell">
            <div class="pct-bar"><span class="${cls}" style="width:${Math.min(100, Math.max(0, emp.persen))}%"></span></div>
            <span>${emp.persen}%</span>
          </div>
        </td>
        <td class="row-arrow">${ICONS.chev}</td>
      </tr>`;
  }).join('');

  return `
    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th>Pegawai</th>
            <th class="num" title="Hadir">H</th>
            <th class="num" title="Terlambat">T</th>
            <th class="num" title="Izin">I</th>
            <th class="num" title="Sakit">S</th>
            <th class="num" title="Cuti">C</th>
            <th class="num" title="Dinas luar">DL</th>
            <th class="num" title="Alpa">A</th>
            <th class="num" title="Hari kerja">HK</th>
            <th class="num">Kehadiran</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="recap-body">${rows}</tbody>
      </table>
    </div>
    <div class="table-foot">
      <div class="legend">
        <span><i style="background:#2c6a44"></i>H — Hadir</span>
        <span><i style="background:#95651c"></i>T — Terlambat</span>
        <span><i style="background:#3d62a4"></i>I — Izin</span>
        <span><i style="background:#6a52a0"></i>S — Sakit</span>
        <span><i style="background:#2f7d78"></i>C — Cuti</span>
        <span><i style="background:#8a6326"></i>DL — Dinas luar</span>
        <span><i style="background:#9d3a34"></i>A — Alpa</span>
      </div>
      <span class="no-print">Klik baris untuk melihat rincian harian</span>
    </div>`;
}

function recapShellHTML(r, data) {
  const range = recapRange();
  const s = state.settings;
  const kopWilayah = [s.kecamatan, s.kabupaten].filter(Boolean).join(' - ');
  const printHead = `
    <div class="print-head">
      <div class="ph-kantor">${esc(s.nama_kantor)}</div>
      ${kopWilayah ? `<div class="ph-wilayah">${esc(kopWilayah)}</div>` : ''}
      ${s.alamat ? `<div class="ph-alamat">${esc(s.alamat)}</div>` : ''}
      <div class="ph-title">Rekapitulasi Kehadiran Pegawai</div>
      <div class="ph-period">Periode ${fmtPeriod(range.from, range.to)}</div>
      <hr>
    </div>`;

  const periodField = r.mode === 'month'
    ? `<input class="input" type="month" id="recap-month" value="${esc(r.month || currentMonth())}">`
    : `<div class="recap-range">
         <input class="input" type="date" id="recap-from" value="${esc(r.from || monthStart(r.month || currentMonth()))}">
         <span style="color:var(--muted);font-size:12px">s.d.</span>
         <input class="input" type="date" id="recap-to" value="${esc(r.to || monthEnd(r.month || currentMonth()))}">
       </div>`;

  return `
    ${printHead}
    <div class="page-head">
      <div>
        <div class="eyebrow">Rekap</div>
        <h1 class="page-title">Rekap kehadiran</h1>
        <p class="page-sub">Dihitung otomatis dari hari kerja, hari libur, dan absensi yang tercatat.</p>
      </div>
    </div>
    <div class="recap-bar no-print">
      <div class="recap-field">
        <span>Periode</span>
        ${periodField}
      </div>
      <div class="recap-field">
        <span>Tampilan</span>
        <div class="segmented" id="recap-mode">
          <button data-mode="month" class="${r.mode === 'month' ? 'active' : ''}">Bulanan</button>
          <button data-mode="range" class="${r.mode === 'range' ? 'active' : ''}">Rentang</button>
        </div>
      </div>
      <div class="recap-field">
        <span>Unit kerja</span>
        <select class="select" id="recap-unit">${unitOptions(r.unit)}</select>
      </div>
      <div class="spacer"></div>
      <button class="btn" id="csv-btn" ${data ? '' : 'disabled'}>${ICONS.download}Ekspor CSV</button>
      <button class="btn btn-dark" id="print-btn" ${data ? '' : 'disabled'}>${ICONS.print}Cetak</button>
    </div>
    ${summaryHTML(data)}
    ${recapTableHTML(data)}
    <div class="sign-grid">
      <div class="sign-box">
        <div>Mengetahui,</div>
        <div>Kepala ${esc(s.nama_desa)}</div>
        <div class="space"></div>
        <div class="name">${esc(s.kepala_desa)}</div>
      </div>
      <div class="sign-box">
        <div>${fmtDate(state.today || todayISO())}</div>
        <div>Administrator</div>
        <div class="space"></div>
        <div class="name">${esc(s.admin_nama)}</div>
      </div>
    </div>`;
}

async function renderRekap() {
  const r = state.recap;
  const viewEl = $('#view');
  if (!r.month) r.month = currentMonth();
  const token = ++r.token;
  showLoading(viewEl);
  const range = recapRange();
  const params = new URLSearchParams({ from: range.from, to: range.to });
  if (r.unit) params.set('unit', r.unit);

  try {
    const data = await api(`/recap?${params.toString()}`);
    if (token !== r.token || !state.settings) return;
    r.data = data;
    $('#view').innerHTML = recapShellHTML(r, data);
    bindRecapShell();
    bindRecapTable();
  } catch (err) {
    if (token === r.token) toast(esc(err.message), 'error');
  }
}

function bindRecapShell() {
  const r = state.recap;

  const month = $('#recap-month');
  if (month) {
    month.addEventListener('change', () => {
      if (!month.value) return;
      r.mode = 'month';
      r.month = month.value;
      renderRekap();
    });
  }

  $$('#recap-mode button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      if (mode === r.mode) return;
      if (mode === 'range') {
        r.from = r.from || monthStart(r.month || currentMonth());
        r.to = r.to || monthEnd(r.month || currentMonth());
      } else if (r.from) {
        r.month = r.from.slice(0, 7);
      }
      r.mode = mode;
      renderRekap();
    });
  });

  const from = $('#recap-from');
  const to = $('#recap-to');
  if (from) {
    from.addEventListener('change', () => {
      if (!from.value) return;
      r.from = from.value;
      if (r.to && r.to < r.from) {
        r.to = r.from;
        if (to) to.value = r.to;
      }
      renderRekap();
    });
  }
  if (to) {
    to.addEventListener('change', () => {
      if (!to.value) return;
      r.to = to.value;
      if (r.from && r.from > r.to) {
        r.from = r.to;
        if (from) from.value = r.from;
      }
      renderRekap();
    });
  }

  const unit = $('#recap-unit');
  if (unit) {
    unit.addEventListener('change', () => {
      r.unit = unit.value;
      renderRekap();
    });
  }

  const printBtn = $('#print-btn');
  if (printBtn) printBtn.addEventListener('click', () => window.print());

  const csvBtn = $('#csv-btn');
  if (csvBtn) csvBtn.addEventListener('click', exportRecapCSV);
}

function bindRecapTable() {
  const body = $('#recap-body');
  if (!body) return;
  body.addEventListener('click', (e) => {
    const row = e.target.closest('tr[data-emp]');
    if (row) openDetail(Number(row.dataset.emp));
  });
}

function exportRecapCSV() {
  const data = state.recap.data;
  if (!data) return;
  const header = ['No', 'Nama', 'NIP', 'Jabatan', 'Unit', 'Hadir', 'Terlambat', 'Izin', 'Sakit', 'Cuti', 'Dinas Luar', 'Alpa', 'Hari Kerja', 'Kehadiran (%)'];
  const lines = data.employees.map((emp, i) => [
    i + 1, emp.nama, emp.nip, emp.jabatan, emp.unit,
    emp.hadir, emp.terlambat, emp.izin, emp.sakit, emp.cuti, emp.dinas, emp.alpa,
    emp.hariKerja, emp.persen,
  ]);
  // Sel yang dimulai dengan = + - @ dapat dijalankan sebagai rumus oleh Excel.
  // Beri awalan kutip agar tetap diperlakukan sebagai teks biasa.
  const csvCell = (value) => {
    let text = String(value ?? '');
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const csv = '\ufeff' + [header, ...lines]
    .map((row) => row.map(csvCell).join(';'))
    .join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rekap-kehadiran_${data.from}_${data.to}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast('Rekap diekspor ke berkas CSV');
}

/* --------------------------------- modal -------------------------------- */

function openModal({ title, sub = '', body, foot = '', wide = false, onClose = null }) {
  modalCloseHandler = onClose;
  const root = $('#modal-root');
  root.innerHTML = `
    <div class="overlay" data-overlay="1">
      <div class="modal${wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="modal-head">
          <div>
            <h2>${title}</h2>
            ${sub ? `<div class="sub">${sub}</div>` : ''}
          </div>
          <button class="icon-btn" data-close="1" aria-label="Tutup">${ICONS.close}</button>
        </div>
        <div class="modal-body">${body}</div>
        ${foot ? `<div class="modal-foot">${foot}</div>` : ''}
      </div>
    </div>`;
  document.body.style.overflow = 'hidden';

  const overlay = $('.overlay', root);
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) closeModal();
  });
  $$('[data-close]', root).forEach((btn) => {
    btn.addEventListener('click', closeModal);
  });
  return root;
}

function closeModal() {
  const root = $('#modal-root');
  if (!root || (!root.innerHTML && !modalCloseHandler)) return;
  const handler = modalCloseHandler;
  modalCloseHandler = null;
  root.innerHTML = '';
  document.body.style.overflow = '';
  if (handler) setTimeout(handler, 0);
}

function confirmDialog({
  title,
  message,
  confirmText = 'Hapus',
  danger = true,
  requirePassword = false,
  onConfirm,
}) {
  const passwordField = requirePassword
    ? `<label class="field" style="margin-top:16px">
         <span class="field-label">Kata sandi admin</span>
         <input class="input" type="password" id="confirm-password" autocomplete="current-password"
           placeholder="Wajib diisi untuk melanjutkan">
         <span class="field-hint">Tindakan ini menghapus atau menimpa data, jadi kata sandi diminta ulang.</span>
       </label>`
    : '';
  openModal({
    title,
    body: `<p class="confirm-text">${message}</p>${passwordField}`,
    foot: `<button class="btn" data-close="1">Batal</button><div class="spacer"></div>
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-yes"${requirePassword ? ' disabled' : ''}>${confirmText}</button>`,
    onClose: null,
  });

  const input = $('#confirm-password');
  const btn = $('#confirm-yes');

  async function submit() {
    if (!btn || btn.disabled) return;
    btn.disabled = true;
    try {
      await onConfirm(input ? input.value : undefined);
      closeModal();
    } catch (err) {
      btn.disabled = false;
      toast(esc(err.message), 'error');
    }
  }

  if (input) {
    setTimeout(() => input.focus(), 60);
    input.addEventListener('input', () => {
      btn.disabled = !input.value;
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value) {
        e.preventDefault();
        submit();
      }
    });
  }
  if (btn) btn.addEventListener('click', submit);
}

/* --------------------------- rincian pegawai ---------------------------- */

function detailRange() {
  if (state.view === 'rekap') return recapRange();
  const month = (state.today || todayISO()).slice(0, 7);
  return { from: monthStart(month), to: monthEnd(month) };
}

function detailBodyHTML(emp) {
  const today = state.today || todayISO();
  const rows = emp.days.map((day) => {
    const future = day.tanggal > today;
    const status = day.status || '';
    const times = status === 'HADIR' || status === 'TERLAMBAT';
    const d = parseISO(day.tanggal);
    const source = day.sumber === 'manual'
      ? ' · manual'
      : day.sumber === 'contoh' ? ' · contoh' : '';
    return `
      <div class="day-row${future ? ' is-future' : ''}" data-day="${day.tanggal}">
        <div class="day-date">${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()].slice(0, 3)}
          <small title="${source ? 'Catatan ini ' + source.slice(3) : 'Dicatat lewat tombol absen'}">${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}${source}</small>
        </div>
        <select class="select st-${status || 'NONE'}" data-field="status" ${future ? 'disabled' : ''}>
          ${statusOptions(status)}
        </select>
        <input class="input" type="time" data-field="masuk" value="${esc(day.masuk || '')}" ${!times || future ? 'disabled' : ''}>
        <input class="input" type="time" data-field="pulang" value="${esc(day.pulang || '')}" ${!times || future ? 'disabled' : ''}>
        <input class="input day-ket" type="text" data-field="keterangan" value="${esc(day.keterangan || '')}"
          placeholder="Keterangan…" maxlength="200" ${future ? 'disabled' : ''}>
        <button class="icon-btn" data-reset-day="1" title="Hapus catatan hari ini" ${future ? 'disabled' : ''}>${ICONS.trash}</button>
      </div>`;
  }).join('');

  return `
    <div class="detail-summary">
      ${avatarHTML(emp.nama, 'avatar-lg')}
      <div class="who">
        <h3>${esc(emp.nama)}</h3>
        <p>${esc(emp.jabatan || 'Pegawai')}${emp.unit ? ` · ${esc(emp.unit)}` : ''}</p>
      </div>
      <div class="detail-counts">
        <div><b id="dc-hadir">${emp.hadirTotal}</b><span>Hadir</span></div>
        <div><b id="dc-alpa">${emp.alpa}</b><span>Alpa</span></div>
        <div><b id="dc-persen">${emp.persen}%</b><span>Kehadiran</span></div>
      </div>
    </div>
    <div class="day-list">
      <div class="day-row head">
        <span>Tanggal</span><span>Status</span><span>Masuk</span><span>Pulang</span><span>Keterangan</span><span></span>
      </div>
      ${rows}
    </div>
    <p class="modal-note" style="margin-top:14px">
      Hanya hari kerja yang ditampilkan. Hari kerja yang sudah lewat tanpa catatan dihitung
      <strong>alpa</strong> otomatis. Perubahan langsung tersimpan.
    </p>`;
}

async function openDetail(employeeId) {
  const { from, to } = detailRange();
  let data;
  try {
    data = await api(`/recap?from=${from}&to=${to}&employee_id=${employeeId}`);
  } catch (err) {
    toast(esc(err.message), 'error');
    return;
  }
  const emp = data.employees[0];
  if (!emp) {
    toast('Pegawai tidak ditemukan', 'error');
    return;
  }

  let edited = false;
  openModal({
    title: esc(emp.nama),
    sub: `Rincian ${fmtPeriod(from, to)}`,
    body: detailBodyHTML(emp),
    wide: true,
    foot: `<span class="modal-note" id="save-note">Perubahan tersimpan otomatis</span>
      <div class="spacer"></div>
      <button class="btn" data-close="1">Tutup</button>`,
    onClose: () => {
      if (!edited) return;
      if (state.view === 'rekap') renderRekap();
      else if (state.view === 'absensi') refreshDashboard();
    },
  });

  const body = $('.modal-body');
  const today = state.today || todayISO();

  body.addEventListener('change', async (e) => {
    if (e.target.matches('[data-day] input, [data-day] select')) {
      const row = e.target.closest('.day-row');
      if (!row) return;
      const ok = await saveDetailRow(row, emp.id, body);
      if (ok) edited = true;
    }
  });

  body.addEventListener('click', async (e) => {
    const reset = e.target.closest('[data-reset-day]');
    if (!reset) return;
    const row = reset.closest('.day-row');
    if (!row || row.dataset.day > today) return;
    try {
      await api(`/attendance?employee_id=${emp.id}&tanggal=${row.dataset.day}`, { method: 'DELETE' });
      applyDetailRow(row, null);
      recountDetail(body);
      setSaveNote('Catatan dihapus');
      edited = true;
      toast('Catatan hari itu dihapus');
    } catch (err) {
      toast(esc(err.message), 'error');
    }
  });
}

function applyDetailRow(row, record) {
  const status = record ? record.status : '';
  const select = $('[data-field="status"]', row);
  const masuk = $('[data-field="masuk"]', row);
  const pulang = $('[data-field="pulang"]', row);
  const ket = $('[data-field="keterangan"]', row);
  const times = status === 'HADIR' || status === 'TERLAMBAT';

  select.value = status;
  select.className = `select st-${status || 'NONE'}`;
  masuk.value = (record && record.masuk) || '';
  pulang.value = (record && record.pulang) || '';
  masuk.disabled = !times;
  pulang.disabled = !times;
  if (record) ket.value = record.keterangan || '';

  // Tandai catatan yang disimpan lewat form manual agar berbeda dari hasil klik.
  const source = $('.day-date small', row);
  if (source && row.dataset.day) {
    const [, month, day] = row.dataset.day.split('-');
    const base = `${day}/${month}`;
    const changed = record && record.sumber === 'manual';
    source.textContent = changed ? `${base} · manual` : base;
    source.title = changed ? 'Catatan ini diubah manual' : 'Dicatat lewat tombol absen';
  }
}

async function saveDetailRow(row, employeeId, body) {
  const tanggal = row.dataset.day;
  const status = $('[data-field="status"]', row).value;
  const masuk = $('[data-field="masuk"]', row).value;
  const pulang = $('[data-field="pulang"]', row).value;
  const keterangan = $('[data-field="keterangan"]', row).value;
  setSaveNote('Menyimpan…');

  try {
    if (!status) {
      await api(`/attendance?employee_id=${employeeId}&tanggal=${tanggal}`, { method: 'DELETE' });
      applyDetailRow(row, null);
      setSaveNote('Tersimpan');
    } else {
      const record = await api('/attendance', {
        method: 'PUT',
        body: { employee_id: employeeId, tanggal, status, masuk, pulang, keterangan },
      });
      applyDetailRow(row, record);
      setSaveNote('Tersimpan');
    }
    recountDetail(body);
    return true;
  } catch (err) {
    setSaveNote('Gagal menyimpan');
    toast(esc(err.message), 'error');
    return false;
  }
}

function recountDetail(body) {
  const today = state.today || todayISO();
  const now = new Date();
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const jamPulang = (state.settings && state.settings.jam_pulang) || '15:00';
  const dayDone = (tanggal) => tanggal < today || (tanggal === today && nowTime >= jamPulang);
  let hadir = 0;
  let alpa = 0;
  let elapsed = 0;
  $$('.day-row[data-day]', body).forEach((row) => {
    const status = $('[data-field="status"]', row).value;
    if (dayDone(row.dataset.day)) elapsed += 1;
    if (status === 'HADIR' || status === 'TERLAMBAT') hadir += 1;
    if (status === 'ALPA') alpa += 1;
  });
  const persen = elapsed ? Math.round((hadir / elapsed) * 100) : 0;
  const h = $('#dc-hadir');
  const a = $('#dc-alpa');
  const p = $('#dc-persen');
  if (h) h.textContent = hadir;
  if (a) a.textContent = alpa;
  if (p) p.textContent = `${persen}%`;
}

function setSaveNote(text) {
  const note = $('#save-note');
  if (!note) return;
  note.textContent = text;
  note.style.color = text === 'Gagal menyimpan' ? 'var(--danger)' : '';
  clearTimeout(setSaveNote.timer);
  if (text === 'Tersimpan' || text === 'Catatan dihapus') {
    setSaveNote.timer = setTimeout(() => {
      const n = $('#save-note');
      if (n) n.textContent = 'Perubahan tersimpan otomatis';
    }, 2400);
  }
}

/* -------------------------------- pegawai ------------------------------- */

async function renderPegawai() {
  const viewEl = $('#view');
  showLoading(viewEl);
  const employees = await api('/employees');
  if (!state.settings) return;
  state.employees = employees;
  state.units = [...new Set(employees.filter((e) => e.unit).map((e) => e.unit))]
    .sort((a, b) => a.localeCompare(b, 'id'));

  const aktif = employees.filter((e) => e.aktif).length;
  const rows = employees.map((emp) => `
    <tr data-emp="${emp.id}" data-search="${esc(`${emp.nama} ${emp.nip} ${emp.jabatan} ${emp.unit}`.toLowerCase())}" data-has-pin="${emp.hasPin ? '1' : '0'}">
      <td>
        <div class="emp-cell">
          ${avatarHTML(emp.nama)}
          <div>
            <div class="p-name">${esc(emp.nama)}${emp.hasPin ? ` <span class="pin-badge" title="Memiliki PIN">${ICONS.check}</span>` : ''}</div>
            <div class="p-role">${esc(emp.jabatan || 'Pegawai')}</div>
          </div>
        </div>
      </td>
      <td class="num" style="text-align:left;color:var(--muted)">${esc(emp.nip || '—')}</td>
      <td>${emp.unit ? `<span class="unit-tag">${esc(emp.unit)}</span>` : '<span class="cell-zero">—</span>'}</td>
      <td>
        <span class="status-dot ${emp.aktif ? 'on' : 'off'}"><i></i>${emp.aktif ? 'Aktif' : 'Nonaktif'}</span>
      </td>
      <td>
        <div class="row-actions">
          <button class="btn btn-sm" data-edit="${emp.id}">Ubah</button>
          <button class="btn btn-sm" data-pin="${emp.id}" title="${emp.hasPin ? 'Ulangi PIN' : 'Atur PIN'}">${emp.hasPin ? '🔑' : '🔑'}</button>
          <button class="icon-btn" data-toggle="${emp.id}" title="${emp.aktif ? 'Nonaktifkan' : 'Aktifkan kembali'}">${ICONS.power}</button>
          <button class="icon-btn" data-delete="${emp.id}" title="Hapus pegawai">${ICONS.trash}</button>
        </div>
      </td>
    </tr>`).join('');

  $('#view').innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">Pegawai</div>
        <h1 class="page-title">Data pegawai</h1>
        <p class="page-sub">${aktif} pegawai aktif dari ${employees.length} data terdaftar.</p>
      </div>
      <div class="head-actions">
        <div class="search table-search">
          ${ICONS.search}
          <input class="input" id="emp-search" type="search" placeholder="Cari pegawai…" autocomplete="off">
        </div>
        <button class="btn btn-primary" id="add-emp">${ICONS.plus}Tambah pegawai</button>
      </div>
    </div>
    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th>Pegawai</th>
            <th>NIP / NIK</th>
            <th>Unit kerja</th>
            <th>Status</th>
            <th style="text-align:right">Aksi</th>
          </tr>
        </thead>
        <tbody id="emp-body">${rows || `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--muted);cursor:default">Belum ada pegawai</td></tr>`}</tbody>
      </table>
    </div>`;

  bindPegawai();
}

function bindPegawai() {
  const search = $('#emp-search');
  if (search) {
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      $$('#emp-body tr[data-emp]').forEach((tr) => {
        tr.hidden = q && !tr.dataset.search.includes(q);
      });
    });
  }

  const add = $('#add-emp');
  if (add) add.addEventListener('click', () => openEmployeeForm(null));

  const body = $('#emp-body');
  if (!body) return;
  body.addEventListener('click', (e) => {
    const edit = e.target.closest('[data-edit]');
    if (edit) {
      const emp = state.employees.find((x) => x.id === Number(edit.dataset.edit));
      if (emp) openEmployeeForm(emp);
      return;
    }
    const pinBtn = e.target.closest('[data-pin]');
    if (pinBtn) {
      const emp = state.employees.find((x) => x.id === Number(pinBtn.dataset.pin));
      if (emp) openSetPinModal(emp);
      return;
    }
    const toggle = e.target.closest('[data-toggle]');
    if (toggle) {
      const emp = state.employees.find((x) => x.id === Number(toggle.dataset.toggle));
      if (emp) toggleEmployee(emp);
      return;
    }
    const del = e.target.closest('[data-delete]');
    if (del) {
      const emp = state.employees.find((x) => x.id === Number(del.dataset.delete));
      if (emp) deleteEmployee(emp);
    }
  });
}

function openEmployeeForm(emp) {
  const editing = !!emp;
  const unitList = state.units.map((unit) => `<option value="${esc(unit)}"></option>`).join('');
  openModal({
    title: editing ? 'Ubah data pegawai' : 'Tambah pegawai',
    sub: editing ? esc(emp.nama) : 'Pegawai baru langsung tampil di halaman absensi.',
    body: `
      <form id="employee-form" class="form-grid" autocomplete="off">
        <label class="field full">
          <span class="field-label">Nama lengkap</span>
          <input class="input" name="nama" required maxlength="100" value="${esc(emp ? emp.nama : '')}" placeholder="Contoh: Siti Nurhaliza, S.E.">
        </label>
        <label class="field">
          <span class="field-label">NIP / NIK</span>
          <input class="input" name="nip" maxlength="40" value="${esc(emp ? emp.nip : '')}" placeholder="Opsional">
        </label>
        <label class="field">
          <span class="field-label">Jabatan</span>
          <input class="input" name="jabatan" maxlength="80" value="${esc(emp ? emp.jabatan : '')}" placeholder="Contoh: Staf Pelayanan">
        </label>
        <label class="field">
          <span class="field-label">Unit kerja</span>
          <input class="input" name="unit" list="unit-list" maxlength="80" value="${esc(emp ? emp.unit : '')}" placeholder="Contoh: Pelayanan">
          <datalist id="unit-list">${unitList}</datalist>
        </label>
        <label class="field">
          <span class="field-label">Status</span>
          <select class="select" name="aktif">
            <option value="1"${!emp || emp.aktif ? ' selected' : ''}>Aktif</option>
            <option value="0"${emp && !emp.aktif ? ' selected' : ''}>Nonaktif</option>
          </select>
        </label>
      </form>`,
    foot: `<span class="modal-note">Data pegawai nonaktif tidak muncul di halaman absensi.</span>
      <div class="spacer"></div>
      <button class="btn" data-close="1">Batal</button>
      <button class="btn btn-primary" type="submit" form="employee-form">Simpan</button>`,
  });

  const form = $('#employee-form');
  setTimeout(() => $('[name="nama"]', form).focus(), 50);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const payload = Object.fromEntries(new FormData(form));
    payload.aktif = payload.aktif === '1';
    try {
      if (editing) await api(`/employees/${emp.id}`, { method: 'PUT', body: payload });
      else await api('/employees', { method: 'POST', body: payload });
      closeModal();
      await reloadBootstrap();
      await renderPegawai();
      toast(editing ? 'Data pegawai diperbarui' : 'Pegawai baru ditambahkan');
    } catch (err) {
      toast(esc(err.message), 'error');
    }
  });
}

async function toggleEmployee(emp) {
  try {
    await api(`/employees/${emp.id}`, { method: 'PUT', body: { aktif: !emp.aktif } });
    await reloadBootstrap();
    await renderPegawai();
    toast(emp.aktif ? `${esc(emp.nama)} dinonaktifkan` : `${esc(emp.nama)} diaktifkan kembali`);
  } catch (err) {
    toast(esc(err.message), 'error');
  }
}

function deleteEmployee(emp) {
  confirmDialog({
    title: 'Hapus pegawai?',
    message: `Data <b>${esc(emp.nama)}</b> beserta seluruh riwayat absensinya akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`,
    confirmText: 'Hapus pegawai',
    requirePassword: true,
    onConfirm: async (password) => {
      await api(`/employees/${emp.id}`, { method: 'DELETE', body: { password } });
      await reloadBootstrap();
      await renderPegawai();
      toast('Pegawai dihapus');
    },
  });
}

async function openSetPinModal(emp) {
  const hasPin = emp.hasPin;
  return new Promise((resolve) => {
    openModal({
      title: hasPin ? 'Ulangi PIN' : 'Atur PIN',
      sub: `${esc(emp.nama)} · ${hasPin ? 'Ganti PIN yang sudah ada' : 'Buat PIN baru untuk verifikasi absen'}`,
      body: `
        <form id="pin-form" class="form-grid" autocomplete="off">
          <label class="field full">
            <span class="field-label">Kata sandi admin <span class="required">*</span></span>
            <input class="input" type="password" name="admin_password" required autocomplete="current-password" placeholder="Wajib untuk mengubah PIN">
          </label>
          <label class="field full">
            <span class="field-label">PIN baru (4–10 digit) <span class="required">*</span></span>
            <div class="pin-input-wrap">
              <input type="password" class="input pin-input" name="pin" required inputmode="numeric" pattern="[0-9]*" maxlength="10" minlength="4" autocomplete="new-password" placeholder="Masukkan PIN">
              <button type="button" class="icon-btn pin-toggle" id="pin-toggle-new" aria-label="Tampilkan/sembunyikan PIN">${ICONS.info}</button>
            </div>
            <span class="field-hint">Hanya angka. Kosongkan untuk menghapus PIN.</span>
          </label>
          <label class="field full">
            <span class="field-label">Ulangi PIN <span class="required">*</span></span>
            <input type="password" class="input" name="pin_confirm" required inputmode="numeric" pattern="[0-9]*" maxlength="10" minlength="4" autocomplete="new-password" placeholder="Ulangi PIN">
          </label>
        </form>
      `,
      foot: `<span class="modal-note" id="pin-note">${hasPin ? 'PIN saat ini akan diganti.' : 'Pegawai wajib memasukkan PIN ini saat absen.'}</span>
        <div class="spacer"></div>
        <button class="btn" data-close="1">Batal</button>
        <button class="btn btn-primary" type="submit" form="pin-form" id="pin-save">Simpan PIN</button>`,
      onClose: () => resolve(),
    });

    const form = $('#pin-form');
    const pinInput = $('[name="pin"]', form);
    const confirmInput = $('[name="pin_confirm"]', form);
    const adminPassInput = $('[name="admin_password"]', form);
    const toggle = $('#pin-toggle-new');
    const saveBtn = $('#pin-save');
    const note = $('#pin-note');

    setTimeout(() => adminPassInput.focus(), 100);

    pinInput.addEventListener('input', () => {
      const pin = pinInput.value.trim();
      if (!pin) {
        saveBtn.disabled = false;
        note.textContent = 'PIN akan dihapus (pegawai tidak perlu memasukkan PIN saat absen).';
        confirmInput.required = false;
        confirmInput.disabled = true;
        confirmInput.value = '';
      } else {
        confirmInput.required = true;
        confirmInput.disabled = false;
        saveBtn.disabled = pin !== confirmInput.value.trim() || pin.length < 4 || !adminPassInput.value;
        note.textContent = pin === confirmInput.value.trim() && pin.length >= 4 ? 'PIN cocok.' : 'PIN tidak cocok atau terlalu pendek (min 4 digit).';
      }
    });

    confirmInput.addEventListener('input', () => {
      const pin = pinInput.value.trim();
      saveBtn.disabled = pin !== confirmInput.value.trim() || pin.length < 4 || !adminPassInput.value;
      note.textContent = pin === confirmInput.value.trim() && pin.length >= 4 ? 'PIN cocok.' : 'PIN tidak cocok atau terlalu pendek (min 4 digit).';
    });

    adminPassInput.addEventListener('input', () => {
      const pin = pinInput.value.trim();
      saveBtn.disabled = !!pin && (pin !== confirmInput.value.trim() || pin.length < 4 || !adminPassInput.value);
    });

    toggle.addEventListener('click', () => {
      if (pinInput.type === 'password') {
        pinInput.type = 'text';
        confirmInput.type = 'text';
        toggle.innerHTML = ICONS.close;
      } else {
        pinInput.type = 'password';
        confirmInput.type = 'password';
        toggle.innerHTML = ICONS.info;
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      saveBtn.disabled = true;
      saveBtn.textContent = 'Menyimpan…';
      try {
        const pin = pinInput.value.trim();
        await api(`/employees/${emp.id}/pin`, {
          method: 'POST',
          body: { password: adminPassInput.value, pin },
        });
        closeModal();
        await reloadBootstrap();
        await renderPegawai();
        toast(pin ? `PIN ${hasPin ? 'diubah' : 'dibuat'} untuk ${esc(emp.nama)}` : `PIN dihapus untuk ${esc(emp.nama)}`);
      } catch (err) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Simpan PIN';
        toast(esc(err.message), 'error');
      }
    });
  });
}

/* ------------------------------- pengaturan ----------------------------- */

async function renderPengaturan() {
  const viewEl = $('#view');
  showLoading(viewEl);
  const [holidays, audit] = await Promise.all([api('/holidays'), api('/audit?limit=100')]);
  if (!state.settings) return;
  state.holidays = holidays;
  const s = state.settings;
  const dayChips = [1, 2, 3, 4, 5, 6, 0].map((d) => `
    <label class="day-chip">
      <input type="checkbox" name="hari_kerja" value="${d}"${s.hari_kerja.includes(d) ? ' checked' : ''}>
      <span>${HARI[d].slice(0, 3)}</span>
    </label>`).join('');

  const holidayRows = holidays.length
    ? holidays.map((h) => `
        <div class="holiday-row">
          <span class="holiday-date">${fmtDate(h.tanggal)}</span>
          <span class="holiday-name">${esc(h.nama)}</span>
          <button class="icon-btn" data-holiday="${h.id}" title="Hapus hari libur">${ICONS.trash}</button>
        </div>`).join('')
    : '<div class="holiday-empty">Belum ada hari libur khusus. Hari Sabtu dan Minggu mengikuti pengaturan hari kerja.</div>';

  const auditRows = audit.length
    ? audit.map((item) => `
        <div class="holiday-row">
          <span class="holiday-date" style="width:132px">${fmtDateTime(item.waktu)}</span>
          <span class="holiday-name"><strong>${esc(item.aksi)}</strong>${item.detail ? ` — ${esc(item.detail)}` : ''}</span>
        </div>`).join('')
    : '<div class="holiday-empty">Belum ada perubahan yang tercatat.</div>';

  $('#view').innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">Pengaturan</div>
        <h1 class="page-title">Pengaturan aplikasi</h1>
        <p class="page-sub">Sesuaikan identitas kantor, jam kerja, dan hari masuk pegawai.</p>
      </div>
    </div>

    <div class="settings-grid">
      <section class="panel settings-card">
        <h2>Identitas kantor</h2>
        <p class="card-sub">Tampil pada halaman masuk, panel, dan kop rekap cetak.</p>
        <form id="form-identity" class="form-grid" autocomplete="off">
          <label class="field">
            <span class="field-label">Nama desa</span>
            <input class="input" name="nama_desa" required maxlength="80" value="${esc(s.nama_desa)}">
          </label>
          <label class="field">
            <span class="field-label">Nama admin</span>
            <input class="input" name="admin_nama" maxlength="80" value="${esc(s.admin_nama)}">
          </label>
          <label class="field">
            <span class="field-label">Kecamatan</span>
            <input class="input" name="kecamatan" maxlength="80" value="${esc(s.kecamatan || '')}">
          </label>
          <label class="field">
            <span class="field-label">Kabupaten</span>
            <input class="input" name="kabupaten" maxlength="80" value="${esc(s.kabupaten || '')}">
          </label>
          <label class="field full">
            <span class="field-label">Nama kantor</span>
            <input class="input" name="nama_kantor" required maxlength="120" value="${esc(s.nama_kantor)}">
          </label>
          <label class="field full">
            <span class="field-label">Alamat kantor</span>
            <input class="input" name="alamat" maxlength="160" value="${esc(s.alamat || '')}" placeholder="Opsional, tampil di kop cetak">
          </label>
          <label class="field full">
            <span class="field-label">Nama kepala desa</span>
            <input class="input" name="kepala_desa" maxlength="100" value="${esc(s.kepala_desa)}">
          </label>
          <div class="card-actions">
            <span class="modal-note">Dipakai pada tanda tangan rekap.</span>
            <div class="spacer"></div>
            <button class="btn btn-primary" type="submit">Simpan identitas</button>
          </div>
        </form>
      </section>

      <section class="panel settings-card">
        <h2>Jam kerja</h2>
        <p class="card-sub">Menentukan status terlambat dan perhitungan jam kerja.</p>
        <form id="form-hours" class="form-grid" autocomplete="off">
          <label class="field">
            <span class="field-label">Jam masuk</span>
            <input class="input" type="time" name="jam_masuk" required value="${esc(s.jam_masuk)}">
          </label>
          <label class="field">
            <span class="field-label">Jam pulang</span>
            <input class="input" type="time" name="jam_pulang" required value="${esc(s.jam_pulang)}">
          </label>
          <label class="field">
            <span class="field-label">Toleransi keterlambatan</span>
            <input class="input" type="number" name="toleransi" min="0" max="180" value="${s.toleransi}">
            <span class="field-hint">Menit setelah jam masuk</span>
          </label>
          <div class="field full">
            <span class="field-label">Hari kerja</span>
            <div class="days">${dayChips}</div>
            <span class="field-hint">Hari yang tidak dicentang tidak dihitung sebagai hari kerja.</span>
          </div>
          <div class="card-actions">
            <span class="modal-note">Absensi di luar hari kerja tetap dapat dicatat.</span>
            <div class="spacer"></div>
            <button class="btn btn-primary" type="submit">Simpan jam kerja</button>
          </div>
        </form>
      </section>

      <section class="panel settings-card span-2">
        <h2>Hari libur</h2>
        <p class="card-sub">Hari libur tidak dihitung sebagai hari kerja dan tidak membuat pegawai tercatat alpa.</p>
        <div class="holiday-list" id="holiday-list">${holidayRows}</div>
        <form class="holiday-add" id="holiday-form" autocomplete="off">
          <input class="input" type="date" name="tanggal" required value="${todayISO()}">
          <input class="input" name="nama" maxlength="100" placeholder="Nama hari libur, misal: Cuti bersama" required>
          <button class="btn btn-soft" type="submit">Tambah</button>
        </form>
      </section>

      <section class="panel settings-card span-2">
        <h2>Riwayat perubahan</h2>
        <p class="card-sub">Setiap perubahan absensi, data pegawai, hari libur, dan pengaturan dicatat agar dapat ditelusuri. Menampilkan 100 catatan terakhir.</p>
        <div class="holiday-list" id="audit-list">${auditRows}</div>
      </section>

      <section class="panel settings-card">
        <h2>Keamanan</h2>
        <p class="card-sub">Ganti kata sandi panel admin secara berkala.</p>
        <form id="form-password" class="form-grid" autocomplete="off">
          <label class="field full">
            <span class="field-label">Kata sandi saat ini</span>
            <input class="input" type="password" name="current" required autocomplete="current-password">
          </label>
          <label class="field">
            <span class="field-label">Kata sandi baru</span>
            <input class="input" type="password" name="next" required minlength="8" maxlength="200" autocomplete="new-password">
          </label>
          <label class="field">
            <span class="field-label">Ulangi kata sandi baru</span>
            <input class="input" type="password" name="confirm" required minlength="8" maxlength="200" autocomplete="new-password">
          </label>
          <div class="card-actions">
            <span class="modal-note">Minimal 8 karakter. Ganti sandi akan mengeluarkan sesi lain yang masih terbuka.</span>
            <div class="spacer"></div>
            <button class="btn" type="submit">Ganti kata sandi</button>
          </div>
        </form>
      </section>

      <section class="panel settings-card">
        <h2>Data &amp; pemeliharaan</h2>
        <p class="card-sub">Cadangkan data dengan menyalin folder <strong>data</strong> aplikasi.</p>
        <div class="danger-row">
          <div>
            <strong>Muat data contoh</strong>
            <p>Mengisi absensi lima minggu terakhir untuk uji coba. Data absensi yang ada akan diganti.</p>
          </div>
          <button class="btn btn-sm" id="demo-btn">Muat contoh</button>
        </div>
        <div class="danger-row">
          <div>
            <strong>Hapus semua data absensi</strong>
            <p>Menghapus seluruh catatan kehadiran, tetapi data pegawai tetap tersimpan.</p>
          </div>
          <button class="btn btn-sm btn-danger" id="clear-btn">Hapus</button>
        </div>
      </section>
    </div>`;

  bindSettings();
}

function bindSettings() {
  const identity = $('#form-identity');
  if (identity) {
    identity.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!identity.reportValidity()) return;
      try {
        const settings = await api('/settings', {
          method: 'PUT',
          body: Object.fromEntries(new FormData(identity)),
        });
        state.settings = settings;
        applyIdentity();
        toast('Identitas kantor disimpan');
      } catch (err) {
        toast(esc(err.message), 'error');
      }
    });
  }

  const hours = $('#form-hours');
  if (hours) {
    hours.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!hours.reportValidity()) return;
      const payload = Object.fromEntries(new FormData(hours));
      delete payload.hari_kerja;
      const days = $$('input[name="hari_kerja"]:checked', hours).map((el) => Number(el.value));
      if (!days.length) {
        toast('Pilih minimal satu hari kerja', 'error');
        return;
      }
      payload.hari_kerja = days;
      try {
        const settings = await api('/settings', { method: 'PUT', body: payload });
        state.settings = settings;
        applyIdentity();
        toast('Jam kerja diperbarui');
      } catch (err) {
        toast(esc(err.message), 'error');
      }
    });
  }

  const holidayForm = $('#holiday-form');
  if (holidayForm) {
    holidayForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!holidayForm.reportValidity()) return;
      const payload = Object.fromEntries(new FormData(holidayForm));
      try {
        await api('/holidays', { method: 'POST', body: payload });
        await reloadBootstrap();
        await renderPengaturan();
        toast('Hari libur ditambahkan');
      } catch (err) {
        toast(esc(err.message), 'error');
      }
    });
  }

  const holidayList = $('#holiday-list');
  if (holidayList) {
    holidayList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-holiday]');
      if (!btn) return;
      const holiday = state.holidays.find((h) => h.id === Number(btn.dataset.holiday));
      if (!holiday) return;
      confirmDialog({
        title: 'Hapus hari libur?',
        message: `<b>${esc(holiday.nama)}</b> (${fmtDate(holiday.tanggal)}) akan dihapus dan dihitung kembali sebagai hari kerja.`,
        confirmText: 'Hapus',
        onConfirm: async () => {
          await api(`/holidays/${holiday.id}`, { method: 'DELETE' });
          await reloadBootstrap();
          await renderPengaturan();
          toast('Hari libur dihapus');
        },
      });
    });
  }

  const passwordForm = $('#form-password');
  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!passwordForm.reportValidity()) return;
      const data = Object.fromEntries(new FormData(passwordForm));
      if (data.next !== data.confirm) {
        toast('Konfirmasi kata sandi tidak sama', 'error');
        return;
      }
      try {
        await api('/password', {
          method: 'PUT',
          body: { current: data.current, next: data.next },
        });
        state.defaultPassword = false;
        passwordForm.reset();
        hideDefaultPasswordBanner();
        toast('Kata sandi berhasil diganti');
      } catch (err) {
        toast(esc(err.message), 'error');
      }
    });
  }

  const demoBtn = $('#demo-btn');
  if (demoBtn) {
    demoBtn.addEventListener('click', () => {
      confirmDialog({
        title: 'Muat data contoh?',
        message: 'Seluruh catatan absensi yang ada akan diganti dengan data contoh lima minggu terakhir. Data pegawai dan pengaturan tidak berubah.',
        confirmText: 'Muat data contoh',
        danger: false,
        requirePassword: true,
        onConfirm: async (password) => {
          demoBtn.disabled = true;
          demoBtn.textContent = 'Memuat…';
          try {
            const res = await api('/demo', { method: 'POST', body: { password } });
            state.recap.data = null;
            state.absensi.data = null;
            toast(`Data contoh dimuat (${res.days} hari kerja)`);
          } finally {
            demoBtn.disabled = false;
            demoBtn.textContent = 'Muat contoh';
          }
        },
      });
    });
  }

  const clearBtn = $('#clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      confirmDialog({
        title: 'Hapus semua absensi?',
        message: 'Seluruh catatan kehadiran akan dihapus permanen. Data pegawai tetap tersimpan.',
        confirmText: 'Hapus semua',
        requirePassword: true,
        onConfirm: async (password) => {
          const res = await api('/attendance/clear', { method: 'POST', body: { password } });
          state.recap.data = null;
          state.absensi.data = null;
          toast(`${res.deleted} catatan absensi dihapus`);
        },
      });
    });
  }

  const themeBtn = $('#theme-btn');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
}

/* --------------------------------- global -------------------------------- */

function isTyping(target) {
  return target && (target.matches('input, select, textarea') || target.isContentEditable);
}

function bindGlobal() {
  window.addEventListener('hashchange', () => {
    if (state.settings) renderView();
  });

  const refresh = $('#refresh-btn');
  if (refresh) {
    refresh.addEventListener('click', async () => {
      refresh.classList.add('spin');
      try {
        await renderView();
      } finally {
        setTimeout(() => refresh.classList.remove('spin'), 350);
      }
    });
  }

  const logout = $('#logout-btn');
  if (logout) {
    logout.addEventListener('click', async () => {
      try {
        await api('/auth/logout', { method: 'POST' });
      } catch {
        /* diabaikan */
      }
      state.settings = null;
      showLogin();
      toast('Anda telah keluar dari panel');
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if ($('#modal-root').innerHTML) closeModal();
      return;
    }
    if (e.key === '/' && !isTyping(e.target) && state.settings && state.view === 'absensi') {
      e.preventDefault();
      const search = $('#search');
      if (search) search.focus();
    }
  });

  const loginForm = $('#login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = $('#login-error');
      const btn = $('#login-submit');
      const pass = $('#login-password');
      err.hidden = true;
      btn.disabled = true;
      btn.textContent = 'Memeriksa…';
      try {
        await api('/auth/login', { method: 'POST', body: { password: pass.value } });
        await bootstrapPublic();
        await enterApp();
        toast(`Selamat datang, ${esc(state.settings.admin_nama)}`);
        hideDefaultPasswordBanner();
      } catch (ex) {
        err.textContent = ex.message;
        err.hidden = false;
        pass.value = '';
        pass.focus();
      } finally {
        btn.disabled = false;
        btn.textContent = 'Masuk ke panel';
      }
    });
  }
}

/* --------------------------------- mulai --------------------------------- */

(async function init() {
  bindGlobal();
  applyTheme();

  const themeBtn = $('#theme-btn');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  setInterval(tick, 1000);
  tick();
  await bootstrapPublic();
  try {
    const status = await api('/auth/status');
    if (status.authenticated) await enterApp();
    else showLogin();
  } catch {
    showLogin();
  }
})();
