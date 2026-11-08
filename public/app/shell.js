/**
 * shell.js - Mengelola shell UI mobile PWA: hash routing, bottom tab bar,
 * persona bottom sheet, avatar strip, dan interaksi sentuh.
 */

const VALID_TABS = ['kantor', 'tim', 'aktivitas', 'token'];

let currentOfficeConfig = null;
let currentCharactersMap = null;
let currentPersonas = [];
let isHintDismissed = false;

/**
 * Inisialisasi shell aplikasi (tab routing, gesture hint, token chip tap, bottom sheet)
 */
export function initShell({ officeConfig, personas } = {}) {
  currentOfficeConfig = officeConfig || null;
  currentPersonas = personas || [];

  initRouter();
  initHintDismissal();
  initTokenChipTap();
  initBottomSheetEvents();
  initPersonaCardTaps();
}

export function setOfficeConfig(office) {
  currentOfficeConfig = office;
}

export function setPersonas(personas) {
  currentPersonas = personas;
}

export function setCharactersMap(map) {
  currentCharactersMap = map;
}

/**
 * Hash Routing: membaca #kantor, #tim, #aktivitas, #token dari URL
 */
function initRouter() {
  const applyHash = () => {
    let hash = window.location.hash.replace(/^#/, '').toLowerCase();
    if (!VALID_TABS.includes(hash)) {
      hash = 'kantor';
    }
    switchView(hash, false);
  };

  window.addEventListener('hashchange', applyHash);

  // Hook klik pada bottom tab bar
  const bottomTabBtns = document.querySelectorAll('.bottom-tab-btn');
  bottomTabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      if (targetTab && VALID_TABS.includes(targetTab)) {
        if (window.location.hash === `#${targetTab}`) {
          // Bila sudah sama, tetap pastikan view sinkron
          switchView(targetTab, false);
        } else {
          window.location.hash = `#${targetTab}`;
        }
      }
    });
  });

  applyHash();
}

/**
 * Ganti tampilan aktif (kantor, tim, aktivitas, token)
 */
export function switchView(viewName, updateHash = true) {
  if (!VALID_TABS.includes(viewName)) viewName = 'kantor';

  if (updateHash && window.location.hash !== `#${viewName}`) {
    window.location.hash = `#${viewName}`;
    return;
  }

  // Set atribut data-view pada body
  document.body.setAttribute('data-view', viewName);

  // Perbarui status aktif tombol bottom nav
  const bottomTabBtns = document.querySelectorAll('.bottom-tab-btn');
  bottomTabBtns.forEach((btn) => {
    const tab = btn.getAttribute('data-tab');
    if (tab === viewName) {
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
    } else {
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
    }
  });

  // Jika kembali ke kantor, picu resize Three.js agar aspect ratio kanvas pas
  if (viewName === 'kantor') {
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });
  }

  // Sinkronisasi untuk panel desktop
  if (viewName === 'token') {
    const tokenBtn = document.querySelector('.tab-btn[data-tab="tab-tokens"]');
    if (tokenBtn && window.innerWidth >= 900) {
      tokenBtn.click();
    }
  } else if (viewName === 'aktivitas') {
    const actBtn = document.querySelector('.tab-btn[data-tab="tab-history"]');
    if (actBtn && window.innerWidth >= 900) {
      actBtn.click();
    }
  }
}

/**
 * Tap chip Token di baris statistik langsung membuka tampilan Token
 */
function initTokenChipTap() {
  const tokenChip = document.getElementById('stat-cell-tokens');
  if (tokenChip) {
    tokenChip.addEventListener('click', () => {
      window.location.hash = '#token';
    });
    tokenChip.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.location.hash = '#token';
      }
    });
  }
}

/**
 * Dismiss petunjuk gestur mobile ("Seret untuk memutar · cubit untuk zoom")
 * setelah interaksi sentuh / kursor pertama.
 */
function initHintDismissal() {
  const canvas = document.getElementById('canvas-3d');
  const hint = document.getElementById('viewport-hint');
  if (!canvas || !hint) return;

  const dismiss = () => {
    if (isHintDismissed) return;
    isHintDismissed = true;
    hint.classList.add('dismissed');
  };

  canvas.addEventListener('pointerdown', dismiss, { passive: true });
  canvas.addEventListener('touchstart', dismiss, { passive: true });
}

/**
 * Perbarui avatar strip yang mengambang di bawah kanvas kantor 3D
 */
export function updateAvatarStrip(personas, charactersMap, officeConfig) {
  if (personas) currentPersonas = personas;
  if (charactersMap) currentCharactersMap = charactersMap;
  if (officeConfig) currentOfficeConfig = officeConfig;

  const stripContainer = document.getElementById('floating-avatar-strip');
  if (!stripContainer || !currentPersonas || currentPersonas.length === 0) return;

  // Render ulang avatar
  stripContainer.replaceChildren();

  currentPersonas.forEach((p) => {
    const char = currentCharactersMap?.get(p.id);
    const isWorking = p.state === 'working';

    const btn = document.createElement('button');
    btn.className = 'floating-avatar-btn';
    btn.type = 'button';
    btn.style.backgroundColor = p.color || '#6d4fd8';
    btn.textContent = p.name ? p.name.charAt(0) : p.id.charAt(0).toUpperCase();
    btn.setAttribute('aria-label', `${p.name || p.id} (${isWorking ? 'Kerja' : 'Santai'})`);
    btn.title = `${p.name || p.id} · ${isWorking ? 'Kerja' : 'Santai'}`;

    const dot = document.createElement('span');
    dot.className = `floating-avatar-dot ${isWorking ? 'working' : 'idle'}`;
    btn.appendChild(dot);

    btn.addEventListener('click', () => {
      focusAndOpenPersona(p, char, currentOfficeConfig);
    });

    stripContainer.appendChild(btn);
  });
}

/**
 * Fokus zona kamera (bila tersedia) dan buka bottom sheet persona
 */
export function focusAndOpenPersona(persona, char, officeConfig) {
  const cfg = officeConfig || currentOfficeConfig;
  const spot = char?.arrivedSpot || char?.currentSpot || persona.spot;
  const zoneId = cfg?.spots?.[spot]?.zone;

  // Fokus zona di scene jika API tersedia
  if (zoneId && typeof window.kantorScene?.focusZone === 'function') {
    try {
      window.kantorScene.focusZone(zoneId);
    } catch (err) {
      console.warn('Gagal memanggil focusZone:', err);
    }
  }

  openPersonaSheet(persona, char, cfg);
}

/**
 * Tampilkan bottom sheet kartu persona
 */
export function openPersonaSheet(persona, char, officeConfig) {
  const cfg = officeConfig || currentOfficeConfig;
  const sheet = document.getElementById('persona-bottom-sheet');
  const backdrop = document.getElementById('persona-sheet-backdrop');
  if (!sheet || !backdrop) return;

  const isWorking = persona.state === 'working';
  const spot = char?.arrivedSpot || char?.currentSpot || persona.spot;
  const zoneId = cfg?.spots?.[spot]?.zone;
  const zoneObj = cfg?.zones?.find((z) => z.id === zoneId);
  const zoneLabel = zoneObj?.label || (zoneId ? zoneId.toUpperCase() : 'Kantor');

  // Avatar
  const avatarEl = document.getElementById('sheet-persona-avatar');
  if (avatarEl) {
    avatarEl.style.backgroundColor = persona.color || '#6d4fd8';
    avatarEl.textContent = persona.name ? persona.name.charAt(0) : persona.id.charAt(0).toUpperCase();
  }

  // Nama & Role
  const nameEl = document.getElementById('sheet-persona-name');
  if (nameEl) nameEl.textContent = persona.name || persona.id;

  const roleEl = document.getElementById('sheet-persona-role');
  if (roleEl) roleEl.textContent = persona.role || '';

  // Badge Status
  const statusEl = document.getElementById('sheet-persona-status');
  if (statusEl) {
    statusEl.textContent = isWorking ? 'Kerja' : 'Santai';
    statusEl.className = `sheet-status-badge ${isWorking ? 'working' : 'idle'}`;
  }

  // Tugas / Aktivitas
  const taskLabel = document.getElementById('sheet-task-label');
  const taskText = document.getElementById('sheet-persona-task');
  if (taskLabel) {
    taskLabel.textContent = isWorking ? 'Tugas Sekarang' : 'Aktivitas Saat Ini';
  }
  if (taskText) {
    if (isWorking) {
      taskText.textContent = persona.task?.title || persona.task?.id || 'Tugas tanpa judul';
    } else {
      const arrived = char?.arrivedSpot || spot;
      let actDesc = 'Santai di kantor ☕';
      if (arrived === 'coffee') actDesc = 'Menyeduh kopi di pantry ☕';
      else if (arrived === 'tv') actDesc = 'Menonton siaran di TV 📺';
      else if (arrived?.startsWith('window')) actDesc = 'Melihat pemandangan kota 🏙️';
      else if (arrived === 'executive_sofa') actDesc = 'Menerima tamu di ruang eksekutif ✨';
      else if (arrived?.startsWith('ps5_sofa')) actDesc = 'Bermain game di PlayStation 5 🎮';
      else if (arrived?.startsWith('meditation_') || arrived === 'buddha_altar') actDesc = 'Meditasi hening di altar Buddha 🧘';
      else if (arrived?.startsWith('sunken_tatami')) actDesc = 'Duduk santai di sunken tatami 🍵';
      else if (arrived?.startsWith('sky_garden') || arrived === 'outdoor_hallway') actDesc = 'Menikmati Sky Garden 🌿';
      else if (arrived?.startsWith('sleep_pod')) actDesc = 'Memulihkan energi di sleeping pod 🌙';
      else if (arrived?.startsWith('meeting_')) actDesc = 'Berdiskusi di ruang rapat 💬';
      taskText.textContent = actDesc;
    }
  }

  // Mesin & Zona
  const engineEl = document.getElementById('sheet-persona-engine');
  if (engineEl) {
    const rawEngine = persona.engine || '';
    engineEl.textContent = rawEngine ? rawEngine.split(' (')[0] : '—';
  }

  const zoneEl = document.getElementById('sheet-persona-zone');
  if (zoneEl) {
    zoneEl.textContent = `${zoneLabel} (${spot || '—'})`;
  }

  // Tombol fokus kamera di sheet
  const focusBtn = document.getElementById('sheet-focus-zone-btn');
  if (focusBtn) {
    focusBtn.onclick = () => {
      closePersonaSheet();
      if (document.body.getAttribute('data-view') !== 'kantor') {
        window.location.hash = '#kantor';
      }
      if (zoneId && typeof window.kantorScene?.focusZone === 'function') {
        try {
          window.kantorScene.focusZone(zoneId);
        } catch (e) {
          console.warn('focusZone error:', e);
        }
      }
    };
  }

  // Buka sheet
  backdrop.classList.add('open');
  sheet.classList.add('open');
  document.body.classList.add('sheet-open');
}

/**
 * Tutup bottom sheet kartu persona
 */
export function closePersonaSheet() {
  const sheet = document.getElementById('persona-bottom-sheet');
  const backdrop = document.getElementById('persona-sheet-backdrop');
  if (sheet) sheet.classList.remove('open');
  if (backdrop) backdrop.classList.remove('open');
  document.body.classList.remove('sheet-open');
}

/**
 * Inisialisasi event listener penutup bottom sheet
 */
function initBottomSheetEvents() {
  const sheet = document.getElementById('persona-bottom-sheet');
  const backdrop = document.getElementById('persona-sheet-backdrop');
  const closeBtn = document.getElementById('sheet-close-btn');

  if (backdrop) {
    backdrop.addEventListener('click', closePersonaSheet);
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', closePersonaSheet);
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePersonaSheet();
  });

  // Gestur swipe-down pada handle bar sheet
  if (sheet) {
    let startY = 0;
    let currentY = 0;

    sheet.addEventListener(
      'touchstart',
      (e) => {
        startY = e.touches[0].clientY;
        currentY = startY;
      },
      { passive: true }
    );

    sheet.addEventListener(
      'touchmove',
      (e) => {
        currentY = e.touches[0].clientY;
      },
      { passive: true }
    );

    sheet.addEventListener(
      'touchend',
      () => {
        if (currentY - startY > 60) {
          closePersonaSheet();
        }
      },
      { passive: true }
    );
  }
}

/**
 * Menghubungkan klik pada kartu persona di tampilan Tim ke bottom sheet
 */
function initPersonaCardTaps() {
  const container = document.getElementById('persona-cards-container');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const card = e.target.closest('.persona-card');
    if (!card) return;

    const nameEl = card.querySelector('.persona-card-name');
    if (!nameEl) return;
    const name = nameEl.textContent.trim();

    const persona = currentPersonas.find(
      (p) => (p.name && p.name.toLowerCase() === name.toLowerCase()) || p.id.toLowerCase() === name.toLowerCase()
    );

    if (persona) {
      const char = currentCharactersMap?.get(persona.id);
      focusAndOpenPersona(persona, char, currentOfficeConfig);
    }
  });
}
