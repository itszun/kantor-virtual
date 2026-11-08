/**
 * main.js - Entry point utama aplikasi frontend Kantor Weiwu 3D (Putaran 2)
 */
import { OfficeScene } from './scene.js';
import { Character } from './characters.js';
import { IdleManager } from './idle.js';
import { DirectorClient } from './director-client.js';
import { UIManager } from './ui.js';

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
  const isDemo = urlParams.get('demo') === '1' || urlParams.get('demo') == null;

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

  // 4. Inisialisasi Three.js Scene & CSS2D Container
  const canvasEl = document.getElementById('canvas-3d');
  const cssContainerEl = document.getElementById('css2d-container');
  const scene = new OfficeScene(canvasEl, cssContainerEl, office);

  // 5. Inisialisasi Karakter Persona dengan Spawn Spot Awal:
  // Karakter idle muncul di spot lounge / tv / pantry, BUKAN di meja!
  const initialSpots = {
    alex: 'desk_alex',   // Alex mulai dengan tugas kerja
    greg: 'lounge_1',    // Greg santai di sofa lounge 1
    betty: 'tv',         // Betty santai menonton TV
    windry: 'coffee',    // Windry menyeduh kopi di pantry
  };

  const charactersMap = new Map();
  personas.forEach((p) => {
    const startSpot = initialSpots[p.id] || (p.id === 'alex' ? `desk_${p.id}` : 'lounge_1');
    const char = new Character(p, office, scene.scene, startSpot);
    charactersMap.set(p.id, char);
  });

  // 6. Inisialisasi Idle Manager & Director Client
  const idleManager = new IdleManager(charactersMap, office, idle_lines);
  idleManager.initInitialSpots('alex'); // Alex sedang kerja di meja, persona lain di spot santai

  const directorClient = new DirectorClient(charactersMap, scene, idleManager, office);

  // Nyalakan monitor meja Alex sejak awal
  scene.setDeskMonitor('desk_alex', true, '#2f6fd6');

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

  // 8. Data Contoh & Logika Mode Demo (?demo=1)
  if (isDemo) {
    const demoTasks = [
      { persona: 'alex', title: 'Optimasi shortestPath graf waypoint', id: 'TSK-101' },
      { persona: 'greg', title: 'Review roadmap & koordinasi sprint tim', id: 'TSK-102' },
      { persona: 'betty', title: 'Sinkronisasi arsip & dokumen Google Drive', id: 'TSK-103' },
      { persona: 'windry', title: 'Pemetaan mitigasi risiko & skenario taktis', id: 'TSK-104' },
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
    // Mode Live: Ambil initial snapshot dari /api/state
    try {
      const stateRes = await fetch('/api/state');
      if (stateRes.ok) {
        const initialSnapshot = await stateRes.json();
        directorClient.applyState(initialSnapshot);
        ui.updateSnapshot(initialSnapshot, charactersMap);
      }
    } catch (err) {
      console.warn('Gagal memuat /api/state:', err);
    }

    // Ambil data riwayat tugas
    try {
      const histRes = await fetch('/api/history?limit=20');
      if (histRes.ok) {
        const historyData = await histRes.json();
        ui.updateHistory(historyData);
      }
    } catch {
      // Abaikan bila belum ada
    }

    // Sambungkan ke SSE /api/stream
    if (window.EventSource) {
      const sse = new EventSource('/api/stream');
      sse.addEventListener('snapshot', (e) => {
        try {
          const snapshot = JSON.parse(e.data);
          directorClient.applyState(snapshot);
          ui.updateSnapshot(snapshot, charactersMap);
          updateDebugDom();
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
