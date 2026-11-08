/**
 * director-client.js - Menerjemahkan snapshot state server / demo ke pergerakan 3D karakter.
 */
import { shortestPath, getPathCoordinates } from './nav.js';

export class DirectorClient {
  constructor(charactersMap, scene, idleManager, officeConfig) {
    this.characters = charactersMap;
    this.scene = scene;
    this.idleManager = idleManager;
    this.config = officeConfig;
    this.previousStates = new Map(); // id -> 'working' | 'idle'
  }

  applyState(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.personas)) return;

    for (const p of snapshot.personas) {
      const char = this.characters.get(p.id);
      if (!char) continue;

      const prevState = this.previousStates.get(p.id) || 'idle';
      const newState = p.state || 'idle';
      this.previousStates.set(p.id, newState);

      if (newState === 'working') {
        char.isWorking = true;
        this.idleManager.releaseSpot(char.id);

        const targetSpot = char.deskSpot;
        const taskTitle = p.task ? (p.task.title || p.task.id) : 'Sedang mengerjakan tugas...';

        // Tampilkan bubble tugas
        char.say(`💻 ${taskTitle}`, 5000);

        if (char.arrivedSpot !== targetSpot) {
          const fromSpot = char.arrivedSpot || char.currentSpot || 'n_center';
          const nodePath = shortestPath(this.config.waypoints, fromSpot, targetSpot);
          const coords = getPathCoordinates(this.config.waypoints, nodePath);
          const spotData = this.config.spots?.[targetSpot] || {};
          const facing = spotData.facing || 0;

          char.targetSpot = targetSpot;
          char.setPath(coords, facing, () => {
            char.arrivedSpot = targetSpot;
            char.currentSpot = targetSpot;
            char.targetSpot = null;
            char.sit();
            this.scene.setDeskMonitor(targetSpot, true, char.color);
          });
        } else {
          char.sit();
          this.scene.setDeskMonitor(targetSpot, true, char.color);
        }
      } else {
        // State idle
        if (prevState === 'working') {
          // Baru selesai tugas: matikan monitor dan berjalan santai ke lounge/spot santai
          char.isWorking = false;
          this.scene.setDeskMonitor(char.deskSpot, false);
          char.say('Tugas selesai! Istirahat sejenak ☕', 4000);

          const freeSpot = this.idleManager.pickNextSpot(char.deskSpot) || 'sunken_tatami_1';
          this.idleManager.moveToSpot(char, freeSpot);
        } else {
          char.isWorking = false;
        }
      }
    }
  }
}
