/**
 * main.js - Entry point utama aplikasi frontend Kantor Weiwu 3D (Putaran 2 & Live Data)
 */
import { OfficeScene } from './scene.js';
import { Character } from './characters.js';
import { IdleManager } from './idle.js';
import { DirectorClient } from './director-client.js';
import { UIManager } from './ui.js';
import { gregTasks } from './mappers.js';

function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

async function startApp() {
  const ui = new UIManager();
  const urlParams = new URLSearchParams(window.location.search);
  // Mode demo HANYA aktif bila ?demo=1. Tanpa parameter -> mode live data nyata.
  const isDemo = urlParams.get('demo') === '1';

  // 1. Elemen Dump Debug untuk verifikasi posisi headless testing
  let debugEl = document.getElementById('kantor-debug-dump');
  if (!debugEl) {
    debugEl = document.createElement('div');
    debugEl.id = 'kantor-debug-dump';
    debugEl.style.display = 'none';
    document.body.appendChild(debugEl);
  }

  // 2. Cek ketersediaan WebGL
  const viewportWrapper = document.getElementById('viewport-wrapper');
  const fallbackBox = document.getElementById('webgl-fallback-box');

  if (!isWebGLAvailable()) {
    if (viewportWrapper) viewportWrapper.style.display = 'none';
    if (fallbackBox) fallbackBox.style.display = 'block';
    console.warn('WebGL tidak didukung pada peramban ini. Menjalankan mode panel saja.');
    return;
  }

  // 3. Ambil konfigurasi kantor dari backend
  let configData;
  try {
    const res = await fetch('/api/office');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    configData = await res.json();
  } catch (err) {
    console.error('Gagal mengambil /api/office:', err);
    return;
  }

  const { office, idle_lines, personas } = configData;
  ui.setPersonaConfig(personas);

  // 4. Inisialisasi Three.js Scene & CSS2D Container
  const canvasEl = document.getElementById('canvas-3d');
  const cssContainerEl = document.getElementById('css2d-container');
  const scene = new OfficeScene(canvasEl, cssContainerEl, office);

  // 5. Inisialisasi Karakter Persona dengan Spawn Spot Awal:
  // Pada mode demo: Alex di meja kerja, yang lain di santai.
  // Pada mode live: SEMUA mulai di spot santai (lounge/tv/coffee). Posisi kerja diatur oleh snapshot.
  const initialSpots = isDemo
    ? {
        alex: 'desk_alex',
        greg: 'lounge_1',
        betty: 'tv',
        windry: 'coffee',
        codex: 'desk_codex',
        hermes: 'desk_hermes',
      }
    : {
        alex: 'lounge_2',
        greg: 'lounge_1',
        betty: 'tv',
        windry: 'coffee',
        codex: 'ps5_sofa_1',
        hermes: 'lounge_3',
      };

  const charactersMap = new Map();
  personas.forEach((p) => {
    const startSpot = initialSpots[p.id] || 'lounge_1';
    const char = new Character(p, office, scene.scene, startSpot);
    charactersMap.set(p.id, char);
  });

  // 6. Inisialisasi Idle Manager & Director Client
  const idleManager = new IdleManager(charactersMap, office, idle_lines);
  if (isDemo) {
    idleManager.initInitialSpots('alex');
    // Nyalakan monitor meja Alex pada mode demo
    scene.setDeskMonitor('desk_alex', true, '#2f6fd6');
  } else {
    idleManager.initInitialSpots();
  }

  const directorClient = new DirectorClient(charactersMap, scene, idleManager, office);

  // 7. Definisi window.__kantorDebug untuk verifikasi posisi & state
  window.__kantorDebug = () => {
    const arr = [];
    for (const [id, char] of charactersMap.entries()) {
      arr.push({
        id: char.id,
        x: Number(char.group.position.x.toFixed(2)),
        z: Number(char.group.position.z.toFixed(2)),
        spot: char.arrivedSpot || char.currentSpot,
        state: char.isWorking ? 'working' : char.state,
      });
    }
    return arr;
  };

  const updateDebugDom = () => {
    if (debugEl) {
      debugEl.textContent = JSON.stringify(window.__kantorDebug());
    }
  };
  updateDebugDom();

  // 8. Logika Mode Demo (?demo=1) vs Mode Live (Data Nyata)
  if (isDemo) {
    const demoTasks = [
      { persona: 'alex', title: 'Render visual 3D Kairosoft & prop shader (Agy Artist)', id: 'TSK-101' },
      { persona: 'greg', title: 'Review roadmap & koordinasi sprint tim', id: 'TSK-102' },
      { persona: 'betty', title: 'Sinkronisasi arsip & dokumen Google Drive', id: 'TSK-103' },
      { persona: 'windry', title: 'Pemetaan mitigasi risiko & skenario taktis', id: 'TSK-104' },
      { persona: 'codex', title: 'Review second opinion draf arsitektur sistem', id: 'TSK-105' },
      { persona: 'hermes', title: 'Dispatch orkestrasi task & load balancing', id: 'TSK-106' },
    ];

    const demoSnapshot = {
      personas: personas.map((p) => {
        const isWorking = p.id === 'alex';
        return {
          id: p.id,
          name: p.name,
          role: p.role,
          engine: p.engine,
          color: p.color,
          state: isWorking ? 'working' : 'idle',
          spot: isWorking ? p.desk_spot : initialSpots[p.id],
          task: isWorking ? { id: 'TSK-101', title: 'Optimasi shortestPath graf waypoint' } : null,
        };
      }),
      stats: {
        delegations_today: 18,
        active_now: 1,
        tokens_today: 194850,
        cost_today_usd: 0.0584,
      },
    };

    ui.updateSnapshot(demoSnapshot, charactersMap);
    directorClient.applyState(demoSnapshot);

    // Tab Riwayat contoh
    ui.updateHistory([
      { title: 'Optimasi shortestPath graf waypoint', time: 'aktif sekarang', persona_color: '#2f6fd6' },
      { title: 'Update struktur config/office.json', time: '14m lalu', persona_color: '#2f6fd6' },
      { title: 'Arsip catatan koordinasi sprint v0.1', time: '38m lalu', persona_color: '#d6457a' },
      { title: 'Review delegasi otomatis dan batas token', time: '1j lalu', persona_color: '#6d4fd8' },
      { title: 'Evaluasi perimeter dan skenario fallback', time: '2j lalu', persona_color: '#e07a2f' },
    ]);

    // Tab Tugas Greg contoh
    ui.updateGregTasks([
      { title: 'Review kesiapan PLAN-004 SSE live', status: 'running' },
      { title: 'Koordinasi arsitektur modul frontend', status: 'selesai' },
      { title: 'Penyelarasan parameter Director DeepSeek', status: 'antre' },
    ]);

    // Tab Aktivitas contoh
    ui.updateActivityLogs([
      { text: 'Alex mulai mengerjakan tugas optimasi pathfinding di mejanya', time: 'baru saja', icon: '💻' },
      { text: 'Betty menonton tayangan di TV lounge', time: '1m lalu', icon: '📺' },
      { text: 'Windry menyeduh kopi di pantry', time: '2m lalu', icon: '☕' },
      { text: 'Greg santai di lounge', time: '3m lalu', icon: '☕' },
    ]);

    // Whiteboard demo
    scene.updateWhiteboard('wb_delegation', [
      'Optimasi shortestPath graf',
      'Update config/office.json',
      'Arsip koordinasi sprint',
    ]);
    scene.updateWhiteboard('wb_greg', [
      'Review kesiapan PLAN-004',
      'Koordinasi arsitektur frontend',
      'Penyelarasan parameter',
    ]);

    // Simulasi pergantian tugas demo berkala (tiap 25 detik)
    let currentTaskIdx = 0;
    setInterval(() => {
      currentTaskIdx = (currentTaskIdx + 1) % demoTasks.length;
      const nextTask = demoTasks[currentTaskIdx];

      demoSnapshot.personas.forEach((p) => {
        if (p.id === nextTask.persona) {
          p.state = 'working';
          p.task = { id: nextTask.id, title: nextTask.title };
        } else {
          p.state = 'idle';
          p.task = null;
        }
      });
      demoSnapshot.stats.delegations_today += 1;
      demoSnapshot.stats.tokens_today += Math.floor(Math.random() * 8000 + 4000);
      demoSnapshot.stats.cost_today_usd = demoSnapshot.stats.tokens_today * 0.0000003;

      directorClient.applyState(demoSnapshot);
      ui.updateSnapshot(demoSnapshot, charactersMap);
      updateDebugDom();
    }, 25000);
  } else {
    // Mode Live: Digerakkan data nyata dari kantor-api
    let latestPersonas = personas;

    function applyHistory(tasks, pList) {
      const p = pList || latestPersonas;
      ui.updateHistory(tasks, p);
      ui.updateGregTasks(tasks);
      ui.updateActivityLogs(tasks, p);

      // Whiteboard "Delegasi terbaru" & "Tugas Greg" di 3D:
      // gambar ulang CanvasTexture dari 3 judul terakhir (potong 28 karakter) saat history berubah
      const delegationTitles = (tasks || []).slice(0, 3).map((t) => t.title || 'Tugas tanpa judul');
      scene.updateWhiteboard('wb_delegation', delegationTitles);

      const gregList = gregTasks(tasks || []);
      const gregTitles = gregList.slice(0, 3).map((t) => t.title || 'Tugas tanpa judul');
      scene.updateWhiteboard('wb_greg', gregTitles);
    }

    async function loadHistory() {
      try {
        const histRes = await fetch('/api/history?limit=40');
        if (histRes.ok) {
          const historyData = await histRes.json();
          applyHistory(historyData, latestPersonas);
        } else {
          applyHistory([], latestPersonas);
        }
      } catch (err) {
        console.warn('Gagal memuat /api/history:', err);
        applyHistory([], latestPersonas);
      }
    }

    async function loadUsage() {
      try {
        const usageRes = await fetch('/api/usage?days=7');
        if (usageRes.ok) {
          const usageData = await usageRes.json();
          ui.updateUsage(usageData, latestPersonas);
        } else {
          ui.updateUsage(null, latestPersonas);
        }
      } catch (err) {
        console.warn('Gagal memuat /api/usage:', err);
        ui.updateUsage(null, latestPersonas);
      }
    }

    async function syncSystemMetrics() {
      try {
        const sysRes = await fetch('/api/system');
        if (sysRes.ok) {
          const sysData = await sysRes.json();
          if (sysData?.metrics?.storage_boxes_count != null && scene.updateStorageBoxes) {
            scene.updateStorageBoxes(sysData.metrics.storage_boxes_count);
          }
        }
      } catch (err) {
        console.warn('Gagal memuat /api/system:', err);
      }
    }

    async function syncDirectorStatus() {
      try {
        const dirRes = await fetch('/api/director');
        if (dirRes.ok) {
          const dirData = await dirRes.json();
          ui.updateDirector(dirData, personasMap);
        }
      } catch (err) {
        console.warn('Gagal memuat /api/director:', err);
      }
    }

    // Debounce timer
    let historyDebounceTimer = null;
    function scheduleHistoryReload() {
      if (historyDebounceTimer) clearTimeout(historyDebounceTimer);
      historyDebounceTimer = setTimeout(loadHistory, 2000);
    }

    let usageDebounceTimer = null;
    function scheduleUsageReload() {
      if (usageDebounceTimer) clearTimeout(usageDebounceTimer);
      usageDebounceTimer = setTimeout(loadUsage, 30000);
    }

    // 1. Ambil initial snapshot dari /api/state
    try {
      const stateRes = await fetch('/api/state');
      if (stateRes.ok) {
        const initialSnapshot = await stateRes.json();
        if (initialSnapshot.personas) latestPersonas = initialSnapshot.personas;
        directorClient.applyState(initialSnapshot);
        ui.updateSnapshot(initialSnapshot, charactersMap);
      }
    } catch (err) {
      console.warn('Gagal memuat /api/state:', err);
    }

    // 2. Ambil data riwayat tugas, penggunaan token, dan telemetri RAM sistem
    await loadHistory();
    await loadUsage();
    await syncSystemMetrics();
    setInterval(syncSystemMetrics, 10000);
    await syncDirectorStatus();
    setInterval(syncDirectorStatus, 30000);

    // 3. Sambungkan ke SSE /api/stream
    if (window.EventSource) {
      const sse = new EventSource('/api/stream');

      sse.onopen = () => {
        ui.setConnectionStatus(true);
      };

      sse.onerror = () => {
        ui.setConnectionStatus(false);
      };

      sse.addEventListener('snapshot', (e) => {
        try {
          ui.setConnectionStatus(true);
          const snapshot = JSON.parse(e.data);
          if (snapshot.personas) latestPersonas = snapshot.personas;
          directorClient.applyState(snapshot);
          ui.updateSnapshot(snapshot, charactersMap);
          updateDebugDom();

          // Debounce reload history (2s) dan usage (30s)
          scheduleHistoryReload();
          scheduleUsageReload();
        } catch (err) {
          console.error('Error parse SSE snapshot:', err);
        }
      });
    }
  }

  // Update berkala nama spot persona di kartu UI (teks kartu update setelah tiba)
  setInterval(() => {
    ui.updateSnapshot(null, charactersMap);
    updateDebugDom();
  }, 1000);

  // 9. Loop Fisika & Animasi (Berjalan di setInterval agar deterministik di headless & browser)
  let lastPhysicsTime = performance.now();
  function tickPhysics() {
    const now = performance.now();
    const delta = Math.min((now - lastPhysicsTime) / 1000, 0.1);
    lastPhysicsTime = now;
    if (delta <= 0) return;

    for (const char of charactersMap.values()) {
      char.update(delta);
    }
    idleManager.update(delta);
    updateDebugDom();
  }
  setInterval(tickPhysics, 33); // ~30 Hz pergerakan

  // 10. Loop Rendering Tampilan 3D (60 FPS di layar nyata)
  function renderLoop() {
    requestAnimationFrame(renderLoop);
    if (document.hidden) return;
    scene.render();
  }
  requestAnimationFrame(renderLoop);
}

// Jalankan ketika DOM siap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
