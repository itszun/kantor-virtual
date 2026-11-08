/**
 * idle.js - Pengatur perilaku santai bawaan karakter AI di kantor 3D.
 */
import { shortestPath, getPathCoordinates } from './nav.js';

export class IdleManager {
  constructor(charactersMap, officeConfig, idleLines) {
    this.characters = charactersMap; // Map<id, Character>
    this.config = officeConfig;
    this.idleLines = idleLines || {};
    this.waypoints = officeConfig.waypoints;
    this.spots = officeConfig.spots || {};

    // Daftar spot santai yang tersedia dengan bobot
    this.relaxSpots = [
      { spot: 'lounge_1', weight: 3 },
      { spot: 'lounge_2', weight: 3 },
      { spot: 'lounge_3', weight: 3 },
      { spot: 'lounge_4', weight: 3 },
      { spot: 'coffee', weight: 2.5 },
      { spot: 'tv', weight: 2.5 },
      { spot: 'window_1', weight: 2 },
      { spot: 'window_2', weight: 2 },
      { spot: 'whiteboard', weight: 1.5 },
      { spot: 'ps5_sofa_1', weight: 3.5 },
      { spot: 'ps5_sofa_2', weight: 3.0 },
      { spot: 'meditation_1', weight: 2.5 },
      { spot: 'meditation_2', weight: 2.5 },
      { spot: 'sunken_tatami_1', weight: 3.0 },
      { spot: 'sunken_tatami_2', weight: 3.0 },
      { spot: 'reception_desk', weight: 1.5 },
      { spot: 'storage_rack', weight: 1.5 },
    ];

    // Status spot yang sedang diduduki: spotName -> personaId
    this.occupiedSpots = new Map();

    // Timer per karakter: personaId -> number (detik tersisa sebelum ganti spot)
    this.personaTimers = new Map();

    // Dialog state
    this.dialogCooldown = 12; // detik
  }

  initInitialSpots(workingPersonaId = null) {
    // Alokasi spot santai awal untuk karakter idle
    const defaultIdleAssignments = {
      greg: 'lounge_1',
      betty: 'tv',
      windry: 'coffee',
      alex: 'lounge_2',
      codex: 'ps5_sofa_1',
      hermes: 'lounge_3',
    };

    // Stagger timer awal agar karakter tidak bergerak serempak di detik 0
    const initialStaggers = {
      greg: 10,
      betty: 16,
      windry: 22,
      alex: 14,
      codex: 18,
      hermes: 20,
    };

    for (const [id, char] of this.characters.entries()) {
      if (id === workingPersonaId || char.isWorking) {
        continue; // Persona sedang kerja di mejanya
      }
      const spotName = defaultIdleAssignments[id] || 'lounge_1';
      this.occupySpot(spotName, id);
      char.spawnAt(spotName);
      this.personaTimers.set(id, initialStaggers[id] || 12);
    }
  }

  isPersonaFree(id) {
    const char = this.characters.get(id);
    if (!char) return false;
    return char.isWorking !== true && char.state !== 'walking';
  }

  occupySpot(spotName, personaId) {
    // Kosongkan spot lama milik persona ini
    for (const [s, pId] of this.occupiedSpots.entries()) {
      if (pId === personaId) {
        this.occupiedSpots.delete(s);
      }
    }
    this.occupiedSpots.set(spotName, personaId);
  }

  releaseSpot(personaId) {
    for (const [s, pId] of this.occupiedSpots.entries()) {
      if (pId === personaId) {
        this.occupiedSpots.delete(s);
      }
    }
  }

  getFreeSpots() {
    return this.relaxSpots.filter((item) => !this.occupiedSpots.has(item.spot));
  }

  pickNextSpot(currentSpot) {
    const free = this.getFreeSpots().filter((item) => item.spot !== currentSpot);
    if (free.length === 0) {
      const anyFree = this.getFreeSpots();
      if (anyFree.length === 0) return null;
      return anyFree[0].spot;
    }
    const totalWeight = free.reduce((sum, item) => sum + item.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const item of free) {
      rand -= item.weight;
      if (rand <= 0) return item.spot;
    }
    return free[0].spot;
  }

  moveToSpot(char, targetSpotName, onArrived = null) {
    const fromSpot = char.arrivedSpot || char.currentSpot || char.deskSpot;
    const nodePath = shortestPath(this.waypoints, fromSpot, targetSpotName);
    if (nodePath.length === 0) return;

    this.occupySpot(targetSpotName, char.id);
    char.targetSpot = targetSpotName;

    const coords = getPathCoordinates(this.waypoints, nodePath);
    const targetSpotData = this.spots[targetSpotName] || {};
    const facing = targetSpotData.facing || 0;

    char.setPath(coords, facing, () => {
      char.arrivedSpot = targetSpotName;
      char.currentSpot = targetSpotName;
      char.targetSpot = null;
      if (onArrived) onArrived();
    });
  }

  sayRandomLine(char) {
    const lines = this.idleLines[char.id];
    if (Array.isArray(lines) && lines.length > 0) {
      const line = lines[Math.floor(Math.random() * lines.length)];
      char.say(line, 4500);
    }
  }

  tryTriggerDialogue() {
    if (this.dialogCooldown > 0) return;
    const dialogues = this.idleLines.dialogues;
    if (!Array.isArray(dialogues) || dialogues.length === 0) return;

    // Cari dialog yang kedua speakernya sedang free
    const availableDialogs = dialogues.filter((d) => {
      const [p1, p2] = d.speakers;
      return this.isPersonaFree(p1) && this.isPersonaFree(p2);
    });

    if (availableDialogs.length === 0) return;

    const chosen = availableDialogs[Math.floor(Math.random() * availableDialogs.length)];
    this.dialogCooldown = 25; // Reset cooldown

    // Jalankan dialog bergantian
    const lines = chosen.lines || [];
    lines.forEach((item, index) => {
      setTimeout(() => {
        const char = this.characters.get(item.speaker);
        if (char && char.isWorking !== true) {
          char.say(item.text, 4000);
        }
      }, index * 3200);
    });
  }

  update(delta) {
    this.dialogCooldown = Math.max(0, this.dialogCooldown - delta);

    for (const [id, char] of this.characters.entries()) {
      if (char.isWorking) continue; // Sedang ada tugas

      let timer = (this.personaTimers.get(id) || 0) - delta;
      if (timer <= 0) {
        // Waktu tinggal di spot ini habis, tentukan aktivitas baru
        if (char.state !== 'walking') {
          // 40% kesempatan berbicara sebelum pindah
          if (Math.random() < 0.45) {
            this.sayRandomLine(char);
          }

          const currentSpot = char.arrivedSpot || char.currentSpot;
          const nextSpot = this.pickNextSpot(currentSpot);
          if (nextSpot) {
            this.moveToSpot(char, nextSpot, () => {
              // Timer tinggal di spot baru (antara 12 s/d 22 detik)
              this.personaTimers.set(id, 12 + Math.random() * 10);
            });
          }
        }
        // Set fallback timer
        this.personaTimers.set(id, 14 + Math.random() * 8);
      } else {
        this.personaTimers.set(id, timer);
      }
    }

    // Coba picu dialog santai antar karakter sesekali
    if (Math.random() < 0.03) {
      this.tryTriggerDialogue();
    }
  }
}
