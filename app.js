// ============================================
// SITUS PUBLIK — app.js (untuk mahasiswa)
// Folder ini untuk repo: Web-jadwal-v2
// ============================================
//
// app.js — logika halaman tampilan jadwal (index.html)
// Sumber data: Firestore (koleksi "jadwal"), disinkronkan LANGSUNG dari
// situs admin — tidak ada lagi proses download/upload jadwal.json manual.

import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import {
  getFirestore, collection, onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const JURUSAN_INFO = {
  TI: { nama: 'Teknik Informatika', desk: 'Punya dua kelas paralel, pilih kelas untuk melihat jadwalnya.' },
  SI: { nama: 'Sistem Informasi', desk: 'Hanya memiliki satu kelas, jadwal langsung ditampilkan.' }
};

const HARI_URUT = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

let allData = [];
let dataLoadFailed = false;
let hasLoadedOnce = false;
let state = { jurusan: null, kelas: null };
let filterToday = false; // toggle "hanya hari ini" di layar jadwal

const boardMain = document.getElementById('boardMain');
const trailEl = document.getElementById('trail');
const backBtnSlot = document.getElementById('backBtnSlot');

const ICON_BACK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>`;
const ICON_ARROW = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>`;
const ICON_CALENDAR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>`;
const ICON_PRINT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6M6 18h12v4H6zM4 9h16a2 2 0 0 1 2 2v5h-4M2 16v-5a2 2 0 0 1 2-2"/></svg>`;

// --- ganti mode terang / gelap (+ ikut ubah warna status-bar di HP) ---
const themeToggle = document.getElementById('themeToggle');
const themeColorMeta = document.getElementById('themeColorMeta');

function applyThemeColorMeta(theme) {
  if (themeColorMeta) themeColorMeta.setAttribute('content', theme === 'dark' ? '#131210' : '#f5f1e7');
}
applyThemeColorMeta(document.documentElement.getAttribute('data-theme'));

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('jadwal-theme', next);
  applyThemeColorMeta(next);
});

// --- menu profil (persiapan — belum ada akun mahasiswa) ---
const profileBtn = document.getElementById('profileBtn');
const profileDropdown = document.getElementById('profileDropdown');
if (profileBtn && profileDropdown) {
  profileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = profileDropdown.hasAttribute('hidden');
    profileDropdown.toggleAttribute('hidden', !willOpen);
    profileBtn.setAttribute('aria-expanded', String(willOpen));
  });
  profileDropdown.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', () => {
    profileDropdown.setAttribute('hidden', '');
    profileBtn.setAttribute('aria-expanded', 'false');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      profileDropdown.setAttribute('hidden', '');
      profileBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

// onSnapshot = jadwal ikut berubah otomatis (real-time) begitu admin
// menyimpan perubahan, tanpa perlu reload halaman.
onSnapshot(
  collection(db, 'jadwal'),
  (snapshot) => {
    allData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    dataLoadFailed = false;
    hasLoadedOnce = true;
    render();
  },
  (err) => {
    console.error('Gagal memuat data dari Firestore:', err);
    dataLoadFailed = true;
    hasLoadedOnce = true;
    render();
  }
);

// render pertama kali (sebelum data datang) supaya tombol tidak kosong
render();

function setState(next) {
  state = { ...state, ...next };
  filterToday = false;
  render();
}

// --- bantuan tanggal: nama hari ini dalam Bahasa Indonesia ---
function getTodayHari() {
  const nama = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return nama[new Date().getDay()];
}

function goBack() {
  if (state.jurusan === 'TI' && state.kelas) {
    setState({ kelas: null });
  } else if (state.jurusan) {
    setState({ jurusan: null, kelas: null });
  }
}

function renderTrail() {
  const parts = [];
  parts.push(state.jurusan
    ? `<button data-action="root">Jadwal</button>`
    : `<span class="trail__current">Jadwal</span>`);

  if (state.jurusan) {
    const jurusanNama = JURUSAN_INFO[state.jurusan].nama;
    if (state.jurusan === 'TI' && state.kelas) {
      parts.push(`<span class="sep">/</span>`);
      parts.push(`<button data-action="jurusan">${jurusanNama}</button>`);
      parts.push(`<span class="sep">/</span>`);
      parts.push(`<span class="trail__current">Kelas ${state.kelas}</span>`);
    } else {
      parts.push(`<span class="sep">/</span>`);
      parts.push(`<span class="trail__current">${jurusanNama}</span>`);
    }
  }
  trailEl.innerHTML = parts.join('');

  trailEl.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.action === 'root') setState({ jurusan: null, kelas: null });
      if (btn.dataset.action === 'jurusan') setState({ kelas: null });
    });
  });

  if (state.jurusan) {
    backBtnSlot.innerHTML = `<button class="btn-back" id="backBtn">${ICON_BACK} Kembali</button>`;
    document.getElementById('backBtn').addEventListener('click', goBack);
  } else {
    backBtnSlot.innerHTML = '';
  }
}

function renderJurusanChoice() {
  boardMain.innerHTML = `
    <div class="choice-grid">
      <button class="choice-card" data-jurusan="TI">
        <div class="choice-card__top">
          <h3>Teknik Informatika</h3>
          <span class="choice-card__badge">TI</span>
        </div>
        <p>${JURUSAN_INFO.TI.desk}</p>
        <div class="choice-card__foot">Lihat jadwal ${ICON_ARROW}</div>
      </button>
      <button class="choice-card" data-jurusan="SI">
        <div class="choice-card__top">
          <h3>Sistem Informasi</h3>
          <span class="choice-card__badge">SI</span>
        </div>
        <p>${JURUSAN_INFO.SI.desk}</p>
        <div class="choice-card__foot">Lihat jadwal ${ICON_ARROW}</div>
      </button>
    </div>`;

  boardMain.querySelectorAll('[data-jurusan]').forEach(card => {
    card.addEventListener('click', () => setState({ jurusan: card.dataset.jurusan, kelas: null }));
  });
}

function renderKelasChoice() {
  boardMain.innerHTML = `
    <div class="choice-grid">
      <button class="choice-card" data-kelas="A">
        <div class="choice-card__top">
          <h3>Kelas TI A</h3>
          <span class="choice-card__badge">A</span>
        </div>
        <p>Lihat jadwal kuliah kelas A.</p>
        <div class="choice-card__foot">Lihat jadwal ${ICON_ARROW}</div>
      </button>
      <button class="choice-card" data-kelas="B">
        <div class="choice-card__top">
          <h3>Kelas TI B</h3>
          <span class="choice-card__badge">B</span>
        </div>
        <p>Lihat jadwal kuliah kelas B.</p>
        <div class="choice-card__foot">Lihat jadwal ${ICON_ARROW}</div>
      </button>
    </div>`;

  boardMain.querySelectorAll('[data-kelas]').forEach(card => {
    card.addEventListener('click', () => setState({ kelas: card.dataset.kelas }));
  });
}

function renderJadwal() {
  const rows = allData.filter(item => {
    if (item.jurusan !== state.jurusan) return false;
    if (state.jurusan === 'TI') return item.kelas === state.kelas;
    return true;
  });

  if (rows.length === 0) {
    boardMain.innerHTML = `
      <div class="empty-state">
        <p>Belum ada jadwal yang diisi untuk pilihan ini.</p>
        <p style="font-size:13px;">Admin dapat menambahkannya lewat situs admin.</p>
      </div>`;
    return;
  }

  const todayHari = getTodayHari();
  const adaKelasHariIni = rows.some(r => r.hari === todayHari);
  const activeRows = filterToday ? rows.filter(r => r.hari === todayHari) : rows;

  const byHari = {};
  activeRows.forEach(r => {
    byHari[r.hari] = byHari[r.hari] || [];
    byHari[r.hari].push(r);
  });

  const hariTersedia = Object.keys(byHari).sort(
    (a, b) => HARI_URUT.indexOf(a) - HARI_URUT.indexOf(b)
  );

  const toolbarHtml = `
    <div class="schedule-toolbar">
      <span class="today-badge">${adaKelasHariIni ? `Hari ini ${todayHari} ada kelas` : `Hari ini ${todayHari}, libur`}</span>
      <div class="schedule-toolbar__actions">
        <button class="btn btn--ghost btn--small" id="todayToggleBtn">${filterToday ? 'Tampilkan semua hari' : 'Hanya hari ini'}</button>
        <button class="btn btn--ghost btn--small" id="icsBtn">${ICON_CALENDAR} Simpan .ics</button>
        <button class="btn btn--ghost btn--small" id="printBtn">${ICON_PRINT} Cetak / PDF</button>
      </div>
    </div>`;

  const bodyHtml = hariTersedia.length ? hariTersedia.map(hari => {
    const items = byHari[hari].sort((a, b) => a.jamMulai.localeCompare(b.jamMulai));
    const isToday = hari === todayHari;
    const entryRows = items.map(item => `
      <div class="entry-row">
        <div class="entry-time">${item.jamMulai}<br>–${item.jamSelesai}</div>
        <div class="entry-body">
          <strong>${escapeHtml(item.mataKuliah)}</strong>
          <span>${escapeHtml(item.dosen)}</span>
        </div>
        <div class="entry-room">${escapeHtml(item.ruangan)}</div>
      </div>`).join('');

    return `
      <div class="schedule-day${isToday ? ' schedule-day--today' : ''}">
        <div class="schedule-day__label">${hari}${isToday ? '<span class="today-tag">Hari ini</span>' : ''}</div>
        ${entryRows}
      </div>`;
  }).join('') : `
    <div class="empty-state" style="margin-top:14px;">
      <p>Tidak ada kelas hari ini.</p>
      <p style="font-size:13px;">Tekan "Tampilkan semua hari" untuk lihat jadwal lengkap.</p>
    </div>`;

  boardMain.innerHTML = toolbarHtml + bodyHtml;

  document.getElementById('todayToggleBtn').addEventListener('click', () => {
    filterToday = !filterToday;
    render();
  });
  document.getElementById('icsBtn').addEventListener('click', () => {
    const label = `jadwal-${state.jurusan}${state.kelas ? '-' + state.kelas : ''}`;
    downloadIcs(rows, label);
  });
  document.getElementById('printBtn').addEventListener('click', () => window.print());
}

// ---------------------------------------------------- ekspor .ics --

const BYDAY_CODE = { Senin: 'MO', Selasa: 'TU', Rabu: 'WE', Kamis: 'TH', Jumat: 'FR', Sabtu: 'SA' };
const HARI_KE_ANGKA = { Senin: 1, Selasa: 2, Rabu: 3, Kamis: 4, Jumat: 5, Sabtu: 6 };

function icsEscape(str) {
  return String(str ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function pad2(n) { return String(n).padStart(2, '0'); }

// tanggal kejadian pertama (berikutnya) dari hari tertentu, dihitung dari hari ini
function nextDateForHari(hariNama) {
  const target = HARI_KE_ANGKA[hariNama];
  const now = new Date();
  const diff = (target - now.getDay() + 7) % 7;
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
  return d;
}

function formatIcsLocal(date, jamStr) {
  const [hh, mm] = jamStr.split(':').map(Number);
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}T${pad2(hh)}${pad2(mm)}00`;
}

function buildIcsEvent(item) {
  const tanggalMulai = nextDateForHari(item.hari);
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  return [
    'BEGIN:VEVENT',
    `UID:${item.id}@jadwal-kuliah`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${formatIcsLocal(tanggalMulai, item.jamMulai)}`,
    `DTEND:${formatIcsLocal(tanggalMulai, item.jamSelesai)}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY_CODE[item.hari]}`,
    `SUMMARY:${icsEscape(item.mataKuliah)}`,
    `LOCATION:${icsEscape(item.ruangan)}`,
    `DESCRIPTION:${icsEscape('Dosen: ' + item.dosen)}`,
    'END:VEVENT'
  ].join('\r\n');
}

// membuat & mengunduh file .ics (bisa diimpor ke Google Calendar, Apple Calendar, dll)
// jam mengikuti zona waktu perangkat masing-masing (tidak memakai TZID khusus).
function downloadIcs(rows, filenameBase) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Jadwal Kuliah Kampus//ID',
    'CALSCALE:GREGORIAN',
    ...rows.map(buildIcsEvent),
    'END:VCALENDAR'
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenameBase}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function render() {
  document.body.classList.remove('theme-ti', 'theme-si');
  if (state.jurusan === 'TI') document.body.classList.add('theme-ti');
  if (state.jurusan === 'SI') document.body.classList.add('theme-si');

  const warningEl = document.getElementById('loadWarning');
  warningEl.innerHTML = (hasLoadedOnce && dataLoadFailed) ? `
    <div class="empty-state" style="margin-bottom:24px; padding:18px 20px; text-align:left;">
      <p style="margin:0 0 4px;">Data jadwal belum bisa dimuat dari server.</p>
      <p style="font-size:13px; margin:0;">Coba refresh halaman. Kalau masih gagal, cek koneksi internet atau hubungi admin.</p>
    </div>` : '';

  renderTrail();
  if (!state.jurusan) {
    renderJurusanChoice();
  } else if (state.jurusan === 'TI' && !state.kelas) {
    renderKelasChoice();
  } else {
    renderJadwal();
  }
  boardMain.classList.remove('screen-in');
  void boardMain.offsetWidth;
  boardMain.classList.add('screen-in');
}
