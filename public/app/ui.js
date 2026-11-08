/**
 * ui.js - Menangani update data panel, kartu stat, profil persona, dan tab navigasi (Tema Terang Hangat)
 */
import {
  relTime,
  historyToRows,
  gregTasks,
  activityFromHistory,
  usageView,
  formatCost,
} from './mappers.js';

export class UIManager {
  constructor() {
    this.lastSnapshot = null;
    this.isConnected = true;
    this.engineById = new Map();
    this.zoneButtons = new Map();
    this.onSelectZone = null;
    this.initClock();
    this.initTabs();
  }

  initZoneControls(zones, onSelectZone) {
    const bar = document.getElementById('zone-focus-bar');
    if (!bar) return;
    this.onSelectZone = onSelectZone;
    this.zoneButtons.clear();

    const overviewBtn = document.getElementById('btn-zone-overview');
    if (overviewBtn) {
      overviewBtn.onclick = () => {
        this.setActiveZone('');
        if (this.onSelectZone) this.onSelectZone(null);
      };
      this.zoneButtons.set('', overviewBtn);
    }

    for (const zone of zones || []) {
      const btn = document.createElement('button');
      btn.className = 'zone-chip';
      btn.dataset.zone = zone.id;
      btn.textContent = zone.label;
      btn.onclick = () => {
        this.setActiveZone(zone.id);
        if (this.onSelectZone) this.onSelectZone(zone.id);
      };
      bar.appendChild(btn);
      this.zoneButtons.set(zone.id, btn);
    }
  }

  setActiveZone(zoneId) {
    const id = zoneId || '';
    for (const [key, btn] of this.zoneButtons) {
      if (key === id) {
        btn.classList.add('active');
        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      } else {
        btn.classList.remove('active');
      }
    }
  }

  setPersonaConfig(personas) {
    for (const p of personas || []) this.engineById.set(p.id, p.engine || '');
  }

  initClock() {
    const updateTime = () => {
      if (!this.isConnected) return;
      const timeEl = document.getElementById('header-time');
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      if (timeEl) {
        timeEl.textContent = `Live · ${hh}:${mm}`;
      }
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  setConnectionStatus(connected) {
    this.isConnected = !!connected;
    const badgeEl = document.querySelector('.header-live-badge');
    const timeEl = document.getElementById('header-time');
    const statusValEl = document.getElementById('stat-status-text');
    const statusSubEl = document.getElementById('stat-status-sub');

    if (this.isConnected) {
      if (badgeEl) badgeEl.classList.remove('disconnected');
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      if (timeEl) timeEl.textContent = `Live · ${hh}:${mm}`;
      if (statusValEl) {
        statusValEl.textContent = 'Online';
        statusValEl.style.color = '#10b981';
      }
      if (statusSubEl) statusSubEl.textContent = 'Sistem aktif';
    } else {
      if (badgeEl) badgeEl.classList.add('disconnected');
      if (timeEl) timeEl.textContent = 'Terputus';
      if (statusValEl) {
        statusValEl.textContent = 'Terputus';
        statusValEl.style.color = '#94a3b8';
      }
      if (statusSubEl) statusSubEl.textContent = 'Menghubungkan ulang...';
    }
  }

  initTabs() {
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));

        btn.classList.add('active');
        const targetId = btn.getAttribute('data-tab');
        const pane = document.getElementById(targetId);
        if (pane) pane.classList.add('active');
      });
    });
  }

  formatTokens(num) {
    if (num == null) return '0';
    return Number(num).toLocaleString('id-ID');
  }

  getActivityText(persona, char) {
    if (persona.state === 'working') {
      const title = persona.task?.title || persona.task?.id || 'Tugas tanpa judul';
      return `Sedang: ${title}`;
    }

    // Hanya berubah setelah karakter tiba di spotnya (arrivedSpot)
    const arrived = char?.arrivedSpot;
    if (!arrived) return 'Santai di tatami ☕';

    if (arrived === 'coffee') return 'Menyeduh kopi di pantry ☕';
    if (arrived === 'tv') return 'Menonton siaran di TV 📺';
    if (arrived.startsWith('window')) return 'Melihat pemandangan kota 🏙️';
    if (arrived === 'whiteboard') return 'Memeriksa papan delegasi 📋';
    if (arrived === 'executive_sofa') return 'Menerima tamu di ruang eksekutif ✨';
    if (arrived.startsWith('ps5_sofa')) return 'Bermain game di PlayStation 5 🎮';
    if (arrived.startsWith('meditation_') || arrived === 'buddha_altar') return 'Meditasi hening di altar Buddha 🧘';
    if (arrived.startsWith('sunken_tatami')) return 'Duduk santai di sunken tatami 🍵';
    if (arrived === 'reception_desk') return 'Menyambut di meja lobi 🌸';
    if (arrived === 'storage_rack') return 'Memeriksa kapasitas memori di gudang 📦';
    if (arrived.startsWith('sleep_pod')) return 'Memulihkan energi di sleeping pod 🌙';
    if (arrived.startsWith('meeting_')) return 'Berdiskusi di ruang rapat 💬';
    if (arrived.startsWith('sky_garden') || arrived === 'outdoor_hallway') return 'Menikmati Sky Garden 🌿';
    if (arrived.startsWith('pantry_')) return 'Menyiapkan kopi di pantry ☕';
    if (arrived.startsWith('desk_')) return 'Duduk santai di meja 🪑';
    return 'Santai di kantor ☕';
  }

  updateSnapshot(snapshot, charactersMap) {
    if (snapshot) {
      this.lastSnapshot = snapshot;
    } else {
      snapshot = this.lastSnapshot;
    }
    if (!snapshot) return;

    // 1. Stats Baris Atas
    const stats = snapshot.stats || {};
    const delegEl = document.getElementById('stat-delegations');
    const activeEl = document.getElementById('stat-active');
    const tokensEl = document.getElementById('stat-tokens');
    const costEl = document.getElementById('stat-cost');

    if (delegEl) delegEl.textContent = stats.delegations_today ?? 0;
    if (activeEl) activeEl.textContent = stats.active_now ?? 0;
    if (tokensEl) tokensEl.textContent = this.formatTokens(stats.tokens_today ?? 0);
    if (costEl) costEl.textContent = `${formatCost(stats.cost_today_usd)} · estimasi setara API`;

    // 2. Persona Cards
    const personas = snapshot.personas || [];
    const container = document.getElementById('persona-cards-container');
    if (container && personas.length > 0) {
      container.replaceChildren();

      personas.forEach((p) => {
        const isWorking = p.state === 'working';
        const char = charactersMap?.get(p.id);
        const activityText = this.getActivityText(p, char);

        const card = document.createElement('div');
        card.className = 'persona-card';

        // Header: Avatar, Info, Badge
        const header = document.createElement('div');
        header.className = 'persona-card-header';

        const avatarInfo = document.createElement('div');
        avatarInfo.className = 'persona-avatar-info';

        const avatar = document.createElement('div');
        avatar.className = 'persona-avatar';
        avatar.style.background = p.color || '#6d4fd8';
        avatar.textContent = p.name ? p.name.charAt(0) : 'A';

        const titles = document.createElement('div');
        titles.className = 'persona-titles';

        const nameEl = document.createElement('span');
        nameEl.className = 'persona-card-name';
        nameEl.textContent = p.name || p.id;

        const roleEl = document.createElement('span');
        roleEl.className = 'persona-card-role';
        roleEl.textContent = p.role || '';

        titles.appendChild(nameEl);
        titles.appendChild(roleEl);
        avatarInfo.appendChild(avatar);
        avatarInfo.appendChild(titles);

        const badge = document.createElement('span');
        badge.className = `badge-status ${isWorking ? 'working' : 'idle'}`;
        badge.textContent = isWorking ? 'Kerja' : 'Santai';

        header.appendChild(avatarInfo);
        header.appendChild(badge);

        // Activity Line (Selalu aman via textContent)
        const actEl = document.createElement('div');
        actEl.className = 'persona-card-activity';
        actEl.textContent = activityText;
        actEl.title = activityText;

        // Footer: Mesin & Waktu Aktif
        const footer = document.createElement('div');
        footer.className = 'persona-card-footer';

        const engineEl = document.createElement('span');
        const engine = p.engine || this.engineById.get(p.id) || '';
        engineEl.textContent = `Mesin: ${engine ? engine.split(' (')[0] : '—'}`;

        const activeTimeEl = document.createElement('span');
        if (isWorking) {
          activeTimeEl.textContent = 'aktif sekarang';
        } else if (p.last_active_at) {
          activeTimeEl.textContent = `aktif ${relTime(p.last_active_at)}`;
        } else {
          activeTimeEl.textContent = 'aktif —';
        }

        footer.appendChild(engineEl);
        footer.appendChild(activeTimeEl);

        card.appendChild(header);
        card.appendChild(actEl);
        card.appendChild(footer);
        container.appendChild(card);
      });
    }
  }

  updateHistory(tasks, personas = []) {
    const listEl = document.getElementById('history-list');
    if (!listEl) return;

    if (!tasks || tasks.length === 0) {
      listEl.innerHTML = '<div style="color: var(--text-dim); font-size: 12px; padding: 12px;">Belum ada riwayat tugas hari ini.</div>';
      return;
    }

    const rows = historyToRows(tasks, personas);
    listEl.replaceChildren();

    rows.slice(0, 40).forEach((task) => {
      const item = document.createElement('div');
      item.className = 'task-item';

      const left = document.createElement('div');
      left.className = 'task-item-left';

      const dot = document.createElement('span');
      dot.className = 'task-persona-dot';
      dot.style.background = task.persona_color || '#6d4fd8';

      const title = document.createElement('span');
      title.className = 'task-title';
      title.textContent = task.title;

      left.appendChild(dot);
      left.appendChild(title);

      const time = document.createElement('span');
      time.className = 'task-time';
      time.textContent = task.time || '';

      item.appendChild(left);
      item.appendChild(time);
      listEl.appendChild(item);
    });
  }

  updateGregTasks(tasks) {
    const listEl = document.getElementById('greg-tasks-list');
    if (!listEl) return;

    const list = gregTasks(tasks);
    if (!list || list.length === 0) {
      listEl.innerHTML = '<div style="color: var(--text-dim); font-size: 12px; padding: 12px;">Tidak ada antrean tugas aktif untuk Greg.</div>';
      return;
    }

    listEl.replaceChildren();

    list.forEach((t) => {
      const item = document.createElement('div');
      item.className = 'task-item';

      const left = document.createElement('div');
      left.className = 'task-item-left';

      const dot = document.createElement('span');
      dot.className = 'task-persona-dot';
      dot.style.background = '#6d4fd8';

      const title = document.createElement('span');
      title.className = 'task-title';
      title.textContent = t.title;

      left.appendChild(dot);
      left.appendChild(title);

      const badge = document.createElement('span');
      badge.style.fontSize = '11px';
      if (t.status === 'berjalan') {
        badge.style.color = '#059669';
        badge.style.fontWeight = '600';
      } else if (t.status === 'selesai') {
        badge.style.color = '#2563eb';
      } else if (t.status === 'gagal' || t.status === 'terhenti') {
        badge.style.color = '#dc2626';
      } else {
        badge.style.color = '#64748b';
      }
      badge.textContent = t.status;

      item.appendChild(left);
      item.appendChild(badge);
      listEl.appendChild(item);
    });
  }

  updateActivityLogs(tasksOrLogs, personas = []) {
    const listEl = document.getElementById('activity-log-list') || document.getElementById('activity-logs-list');
    if (!listEl) return;

    // Bisa menerima array tasks (live) atau array logs (demo)
    let logs = [];
    if (Array.isArray(tasksOrLogs) && tasksOrLogs.length > 0) {
      if (tasksOrLogs[0].text !== undefined) {
        // Format log siap pakai (demo)
        logs = tasksOrLogs;
      } else {
        // Format tasks dari /api/history (live)
        logs = activityFromHistory(tasksOrLogs, personas);
      }
    }

    if (!logs || logs.length === 0) {
      listEl.innerHTML = '<div style="color: var(--text-dim); font-size: 12px; padding: 12px;">Aktivitas santai tim sedang berjalan di kantor.</div>';
      return;
    }

    listEl.replaceChildren();

    logs.forEach((log) => {
      const item = document.createElement('div');
      item.className = 'task-item';

      const left = document.createElement('div');
      left.className = 'task-item-left';

      const icon = document.createElement('span');
      icon.textContent = log.icon || '📌';

      const title = document.createElement('span');
      title.className = 'task-title';
      title.textContent = log.text;

      left.appendChild(icon);
      left.appendChild(title);

      const time = document.createElement('span');
      time.className = 'task-time';
      time.textContent = log.time || '';

      item.appendChild(left);
      item.appendChild(time);
      listEl.appendChild(item);
    });
  }

  updateUsage(report, personas = []) {
    const tokenTbody = document.getElementById('token-breakdown-body');
    if (!tokenTbody) return;

    const view = usageView(report);
    const pMap = new Map();
    if (Array.isArray(personas)) {
      personas.forEach((p) => pMap.set(p.id, p));
    }

    const hasData = (view.by_persona && view.by_persona.length > 0) || (view.by_model && view.by_model.length > 0);
    if (!hasData || view.totals.tokens === 0) {
      tokenTbody.innerHTML = '<tr><td colspan="4" style="color: var(--text-dim); text-align: center; padding: 16px;">Belum ada data penggunaan token dalam 7 hari terakhir.</td></tr>';
      return;
    }

    tokenTbody.replaceChildren();

    // 1. Baris per Persona
    view.by_persona.forEach((p) => {
      const pInfo = pMap.get(p.persona);
      const name = pInfo?.name || p.persona.toUpperCase();
      const color = pInfo?.color || '#6d4fd8';
      const engine = (pInfo?.engine || this.engineById.get(p.persona) || '—').split(' (')[0];

      const tr = document.createElement('tr');

      const tdPersona = document.createElement('td');
      const dot = document.createElement('span');
      dot.style.display = 'inline-block';
      dot.style.width = '8px';
      dot.style.height = '8px';
      dot.style.borderRadius = '50%';
      dot.style.background = color;
      dot.style.marginRight = '6px';
      const strongName = document.createElement('strong');
      strongName.textContent = name;
      tdPersona.appendChild(dot);
      tdPersona.appendChild(strongName);

      const tdEngine = document.createElement('td');
      tdEngine.style.color = 'var(--text-muted)';
      tdEngine.textContent = engine;

      const tdTokens = document.createElement('td');
      tdTokens.textContent = this.formatTokens(p.tokens);

      const tdCost = document.createElement('td');
      tdCost.textContent = p.cost;

      tr.appendChild(tdPersona);
      tr.appendChild(tdEngine);
      tr.appendChild(tdTokens);
      tr.appendChild(tdCost);
      tokenTbody.appendChild(tr);
    });

    // 2. Baris per Model
    view.by_model.forEach((m) => {
      const tr = document.createElement('tr');

      const tdPersona = document.createElement('td');
      tdPersona.style.color = 'var(--text-dim)';
      tdPersona.textContent = '—';

      const tdModel = document.createElement('td');
      tdModel.style.color = 'var(--text-muted)';
      tdModel.textContent = m.model;

      const tdTokens = document.createElement('td');
      tdTokens.textContent = this.formatTokens(m.tokens);

      const tdCost = document.createElement('td');
      tdCost.textContent = m.cost;

      tr.appendChild(tdPersona);
      tr.appendChild(tdModel);
      tr.appendChild(tdTokens);
      tr.appendChild(tdCost);
      tokenTbody.appendChild(tr);
    });

    // 3. Baris Total 7 Hari
    const totalTr = document.createElement('tr');
    totalTr.style.borderTop = '2px solid var(--border-color)';
    totalTr.style.fontWeight = '600';

    const tdTotalLabel = document.createElement('td');
    tdTotalLabel.textContent = 'Total 7 Hari';

    const tdAllModels = document.createElement('td');
    tdAllModels.style.color = 'var(--text-muted)';
    tdAllModels.textContent = 'Semua Model';

    const tdTotalTokens = document.createElement('td');
    tdTotalTokens.textContent = this.formatTokens(view.totals.tokens);

    const tdTotalCost = document.createElement('td');
    tdTotalCost.textContent = view.totals.cost;

    totalTr.appendChild(tdTotalLabel);
    totalTr.appendChild(tdAllModels);
    totalTr.appendChild(tdTotalTokens);
    totalTr.appendChild(tdTotalCost);
    tokenTbody.appendChild(totalTr);
  }

  updateDirector(dirData, personasMap = new Map()) {
    if (!dirData) return;

    const titleEl = document.getElementById('dir-status-title');
    const badgeEl = document.getElementById('dir-status-badge');
    const descEl = document.getElementById('dir-status-desc');
    const listEl = document.getElementById('director-memories-list');

    if (titleEl) {
      titleEl.textContent = dirData.enabled
        ? `Director: Aktif (${dirData.model || 'LLM'})`
        : 'Director: Bawaan (Zero-Token)';
    }

    if (badgeEl) {
      if (dirData.enabled) {
        badgeEl.textContent = 'LLM Live';
        badgeEl.style.background = 'rgba(59, 130, 246, 0.2)';
        badgeEl.style.color = '#3b82f6';
      } else {
        badgeEl.textContent = 'Zero-Token';
        badgeEl.style.background = 'rgba(16, 185, 129, 0.15)';
        badgeEl.style.color = '#10b981';
      }
    }

    if (descEl && dirData.stats) {
      const calls = dirData.stats.callsToday || 0;
      const cost = dirData.stats.costUsdToday ? `$${dirData.stats.costUsdToday.toFixed(4)}` : '$0.00';
      descEl.textContent = dirData.enabled
        ? `Panggilan hari ini: ${calls} kali • Estimasi biaya: ${cost}. Obrolan santai otomatis dipicu saat semua persona idle.`
        : 'Obrolan santai otomatis berjalan via skenario procedural Three.js tanpa konsumsi token LLM.';
    }

    if (listEl) {
      const memories = dirData.recent_memories || [];
      if (memories.length === 0) {
        listEl.innerHTML = '<div style="color: var(--text-dim); font-size: 12px; padding: 8px;">Belum ada catatan memori khusus. Tim santai dengan percakapan bawaan.</div>';
        return;
      }

      listEl.replaceChildren();
      memories.forEach((m) => {
        const item = document.createElement('div');
        item.className = 'task-item';

        const left = document.createElement('div');
        left.className = 'task-item-left';

        const personaObj = personasMap.get(m.persona);
        const avatar = document.createElement('span');
        avatar.className = 'task-badge';
        avatar.textContent = personaObj ? personaObj.name : m.persona;
        if (personaObj?.color) {
          avatar.style.background = `${personaObj.color}22`;
          avatar.style.color = personaObj.color;
        }

        const note = document.createElement('span');
        note.className = 'task-title';
        note.textContent = m.note;

        left.appendChild(avatar);
        left.appendChild(note);

        const time = document.createElement('span');
        time.className = 'task-time';
        time.textContent = m.ts ? relTime(m.ts) : '';

        item.appendChild(left);
        item.appendChild(time);
        listEl.appendChild(item);
      });
    }
  }
}
