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

const boardMain = document.getElementById('boardMain');
const trailEl = document.getElementById('trail');
const backBtnSlot = document.getElementById('backBtnSlot');

const ICON_BACK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>`;
const ICON_ARROW = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>`;

// --- ganti mode terang / gelap ---
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('jadwal-theme', next);
});

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
  render();
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

  const byHari = {};
  rows.forEach(r => {
    byHari[r.hari] = byHari[r.hari] || [];
    byHari[r.hari].push(r);
  });

  const hariTersedia = Object.keys(byHari).sort(
    (a, b) => HARI_URUT.indexOf(a) - HARI_URUT.indexOf(b)
  );

  boardMain.innerHTML = hariTersedia.map(hari => {
    const items = byHari[hari].sort((a, b) => a.jamMulai.localeCompare(b.jamMulai));
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
      <div class="schedule-day">
        <div class="schedule-day__label">${hari}</div>
        ${entryRows}
      </div>`;
  }).join('');
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
