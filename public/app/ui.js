/**
 * ui.js - Menangani update data panel, kartu stat, profil persona, dan tab navigasi (Tema Terang Hangat)
 */

export class UIManager {
  constructor() {
    this.lastSnapshot = null;
    this.initClock();
    this.initTabs();
  }

  initClock() {
    const timeEl = document.getElementById('header-time');
    const updateTime = () => {
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

  formatCost(usd) {
    if (usd == null) return '$0.0000';
    return '$' + Number(usd).toFixed(4);
  }

  getActivityText(persona, char) {
    if (persona.state === 'working') {
      return persona.task ? `Sedang: ${persona.task.title || persona.task.id}` : 'Sedang mengerjakan tugas...';
    }

    // Hanya berubah setelah karakter tiba di spotnya (arrivedSpot)
    const arrived = char?.arrivedSpot;
    if (!arrived) return 'Santai di lounge ☕';

    if (arrived === 'coffee') return 'Menyeduh kopi di pantry ☕';
    if (arrived === 'tv') return 'Menonton siaran di TV 📺';
    if (arrived.startsWith('window')) return 'Melihat pemandangan kota 🏙️';
    if (arrived === 'whiteboard') return 'Memeriksa papan delegasi 📋';
    if (arrived.startsWith('lounge_')) return 'Santai sejenak di lounge ✨';
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
    if (costEl) costEl.textContent = this.formatCost(stats.cost_today_usd ?? 0);

    // 2. Persona Cards
    const personas = snapshot.personas || [];
    const container = document.getElementById('persona-cards-container');
    if (container && personas.length > 0) {
      container.innerHTML = '';
      personas.forEach((p) => {
        const isWorking = p.state === 'working';
        const char = charactersMap?.get(p.id);
        const activityText = this.getActivityText(p, char);

        const card = document.createElement('div');
        card.className = 'persona-card';
        card.innerHTML = `
          <div class="persona-card-header">
            <div class="persona-avatar-info">
              <div class="persona-avatar" style="background: ${p.color || '#6d4fd8'}">
                ${p.name ? p.name.charAt(0) : 'A'}
              </div>
              <div class="persona-titles">
                <span class="persona-card-name">${p.name}</span>
                <span class="persona-card-role">${p.role}</span>
              </div>
            </div>
            <span class="badge-status ${isWorking ? 'working' : 'idle'}">
              ${isWorking ? 'Kerja' : 'Santai'}
            </span>
          </div>
          <div class="persona-card-activity" title="${activityText}">
            ${activityText}
          </div>
          <div class="persona-card-footer">
            <span>Mesin: ${p.engine ? p.engine.split(' ')[0] : 'agy'}</span>
            <span>aktif ${isWorking ? 'sekarang' : '2m lalu'}</span>
          </div>
        `;
        container.appendChild(card);
      });
    }

    // 3. Tab Token Breakdown
    const tokenTbody = document.getElementById('token-breakdown-body');
    if (tokenTbody && personas.length > 0) {
      tokenTbody.innerHTML = '';
      personas.forEach((p) => {
        const tr = document.createElement('tr');
        const pTokens = p.tokens_today ?? Math.floor((stats.tokens_today || 0) / 4);
        const pCost = p.cost_today_usd ?? ((stats.cost_today_usd || 0) / 4);
        tr.innerHTML = `
          <td>
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${p.color}; margin-right:6px;"></span>
            <strong>${p.name}</strong>
          </td>
          <td style="color:var(--text-muted);">${p.engine || 'Claude'}</td>
          <td>${this.formatTokens(pTokens)}</td>
          <td>${this.formatCost(pCost)}</td>
        `;
        tokenTbody.appendChild(tr);
      });
    }
  }

  updateHistory(tasksList) {
    const listEl = document.getElementById('history-list');
    if (!listEl) return;
    if (!tasksList || tasksList.length === 0) {
      listEl.innerHTML = '<div style="color: var(--text-dim); font-size: 12px;">Belum ada riwayat tugas hari ini.</div>';
      return;
    }

    listEl.innerHTML = '';
    tasksList.slice(0, 8).forEach((task) => {
      const item = document.createElement('div');
      item.className = 'task-item';
      item.innerHTML = `
        <div class="task-item-left">
          <span class="task-persona-dot" style="background: ${task.persona_color || '#6d4fd8'}"></span>
          <span class="task-title">${task.title}</span>
        </div>
        <span class="task-time">${task.time || ''}</span>
      `;
      listEl.appendChild(item);
    });
  }

  updateGregTasks(tasksList) {
    const listEl = document.getElementById('greg-tasks-list');
    if (!listEl) return;
    if (!tasksList || tasksList.length === 0) {
      listEl.innerHTML = '<div style="color: var(--text-dim); font-size: 12px;">Tidak ada antrean tugas Greg.</div>';
      return;
    }

    listEl.innerHTML = '';
    tasksList.forEach((t) => {
      const item = document.createElement('div');
      item.className = 'task-item';
      let statusBadge = '<span style="color:#64748b; font-size:11px;">antre</span>';
      if (t.status === 'running') statusBadge = '<span style="color:#059669; font-weight:600; font-size:11px;">sedang berjalan</span>';
      if (t.status === 'selesai') statusBadge = '<span style="color:#2563eb; font-size:11px;">selesai</span>';

      item.innerHTML = `
        <div class="task-item-left">
          <span class="task-persona-dot" style="background: #6d4fd8"></span>
          <span class="task-title">${t.title}</span>
        </div>
        ${statusBadge}
      `;
      listEl.appendChild(item);
    });
  }

  updateActivityLogs(logs) {
    const listEl = document.getElementById('activity-logs-list');
    if (!listEl) return;
    if (!logs || logs.length === 0) {
      listEl.innerHTML = '<div style="color: var(--text-dim); font-size: 12px;">Belum ada log aktivitas.</div>';
      return;
    }

    listEl.innerHTML = '';
    logs.forEach((log) => {
      const item = document.createElement('div');
      item.className = 'task-item';
      item.innerHTML = `
        <div class="task-item-left">
          <span>${log.icon || '📌'}</span>
          <span class="task-title">${log.text}</span>
        </div>
        <span class="task-time">${log.time || ''}</span>
      `;
      listEl.appendChild(item);
    });
  }
}
