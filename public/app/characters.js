/**
 * characters.js - Karakter 3D procedurally generated, animasi, label, dan bubble chat
 */
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export class Character {
  // Global manager untuk bubble aktif (maks 2 bubble sekaligus)
  static activeBubbles = [];

  constructor(persona, officeConfig, scene, initialSpot = null) {
    this.persona = persona;
    this.config = officeConfig;
    this.scene = scene;

    this.id = persona.id;
    this.name = persona.name;
    this.role = persona.role;
    this.color = persona.color;
    this.deskSpot = persona.desk_spot || `desk_${persona.id}`;

    this.state = 'idle'; // 'idle' | 'walking' | 'sitting'
    this.currentSpot = initialSpot || this.deskSpot;
    this.arrivedSpot = this.currentSpot; // Spot di mana karakter sudah tiba
    this.targetSpot = null;
    this.path = []; // Array of [x, z]
    this.targetFacing = 0;
    this.walkSpeed = 2.4;
    this.animTime = Math.random() * 10;
    this.bubbleTimeout = null;

    this.initMesh(initialSpot);
  }

  initMesh(initialSpot) {
    this.group = new THREE.Group();

    // Model sub-group (untuk bobbing saat jalan tanpa menggeser root)
    this.model = new THREE.Group();
    this.group.add(this.model);

    // 1. Badan (Kapsul warna persona)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.color,
      roughness: 0.5,
    });
    const bodyGeo = new THREE.CapsuleGeometry(0.2, 0.32, 8, 16);
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.bodyMesh.position.y = 0.56;
    this.bodyMesh.castShadow = true;
    this.model.add(this.bodyMesh);

    // 2. Kepala (Bola warna kulit)
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xffd7ba,
      roughness: 0.6,
    });
    const headGeo = new THREE.SphereGeometry(0.18, 16, 16);
    this.headMesh = new THREE.Mesh(headGeo, skinMat);
    this.headMesh.position.y = 0.94;
    this.headMesh.castShadow = true;
    this.model.add(this.headMesh);

    // 3. Rambut (Berbeda per persona)
    this.initHair();

    // 4. Kaki (Dua silinder dengan pivot pangkal paha)
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.7,
    });
    const legGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.38, 12);
    legGeo.translate(0, -0.19, 0);

    this.leftLeg = new THREE.Mesh(legGeo, legMat);
    this.leftLeg.position.set(-0.09, 0.38, 0);
    this.leftLeg.castShadow = true;
    this.model.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, legMat);
    this.rightLeg.position.set(0.09, 0.38, 0);
    this.rightLeg.castShadow = true;
    this.model.add(this.rightLeg);

    // 5. CSS2D Label (Nama · Peran) - Teks gelap tajam di latar terang
    const labelDiv = document.createElement('div');
    labelDiv.className = 'character-label';
    labelDiv.innerHTML = `
      <span class="character-label-dot" style="background:${this.color}"></span>
      <span style="color:#0f172a">${this.name}</span>
      <span style="color:#64748b; font-weight:500;">· ${this.getShortRole()}</span>
    `;
    this.labelObj = new CSS2DObject(labelDiv);
    this.labelObj.position.set(0, 1.30, 0);
    this.group.add(this.labelObj);

    // 6. CSS2D Bubble Chat (Berada di atas label pada y = 1.82)
    this.bubbleDiv = document.createElement('div');
    this.bubbleDiv.className = 'character-bubble';
    this.bubbleObj = new CSS2DObject(this.bubbleDiv);
    this.bubbleObj.position.set(0, 1.82, 0);
    this.group.add(this.bubbleObj);

    // Letakkan posisi awal
    const startSpot = initialSpot || this.deskSpot;
    this.spawnAt(startSpot);

    this.scene.add(this.group);
  }

  spawnAt(spotName) {
    const spotData = this.config.spots?.[spotName];
    this.currentSpot = spotName;
    this.arrivedSpot = spotName;
    this.targetSpot = null;

    if (spotData) {
      this.group.position.set(spotData.pos[0], 0, spotData.pos[1]);
      this.group.rotation.y = spotData.facing || 0;
      if (
        spotName.startsWith('desk_') ||
        spotName.startsWith('lounge_') ||
        spotName.startsWith('ps5_sofa') ||
        spotName.startsWith('sunken_tatami') ||
        spotName.startsWith('meditation_')
      ) {
        this.sit();
      } else {
        this.stand();
      }
    }
  }

  getShortRole() {
    if (this.id === 'greg') return 'Lead';
    if (this.id === 'betty') return 'Admin';
    if (this.id === 'alex') return 'Teknis';
    if (this.id === 'windry') return 'Taktis';
    if (this.id === 'codex') return 'Reviewer';
    if (this.id === 'hermes') return 'Dispatcher';
    return this.role;
  }

  initHair() {
    const hairGroup = new THREE.Group();
    if (this.id === 'greg') {
      const mat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 14), mat);
      hair.position.set(0, 0.98, -0.02);
      hair.scale.set(1.02, 0.7, 1.05);
      hairGroup.add(hair);
    } else if (this.id === 'betty') {
      const mat = new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.8 });
      const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 14), mat);
      hairTop.position.set(0, 0.98, -0.01);
      hairGroup.add(hairTop);
      const hairSides = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.28), mat);
      hairSides.position.set(0, 0.86, -0.04);
      hairGroup.add(hairSides);
    } else if (this.id === 'alex') {
      const mat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 14), mat);
      hair.position.set(0, 0.98, 0);
      hair.scale.set(1.04, 0.75, 1.05);
      hairGroup.add(hair);
      const bangs = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.12), mat);
      bangs.position.set(0.04, 1.04, 0.14);
      hairGroup.add(bangs);
    } else if (this.id === 'windry') {
      const mat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.8 });
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 14), mat);
      hair.position.set(0, 0.98, 0);
      hair.scale.set(1.03, 0.75, 1.03);
      hairGroup.add(hair);
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), mat);
      bun.position.set(0, 1.05, -0.16);
      hairGroup.add(bun);
    } else if (this.id === 'codex') {
      const mat = new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.8 });
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 14), mat);
      hair.position.set(0, 0.98, -0.01);
      hair.scale.set(1.02, 0.72, 1.02);
      hairGroup.add(hair);
    } else if (this.id === 'hermes') {
      const mat = new THREE.MeshStandardMaterial({ color: 0x0891b2, roughness: 0.5 });
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.022, 8, 20), mat);
      band.position.set(0, 0.98, 0);
      band.rotation.x = Math.PI / 2;
      hairGroup.add(band);
      const earLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 12), mat);
      earLeft.position.set(-0.19, 0.94, 0);
      earLeft.rotation.z = Math.PI / 2;
      hairGroup.add(earLeft);
      const earRight = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 12), mat);
      earRight.position.set(0.19, 0.94, 0);
      earRight.rotation.z = Math.PI / 2;
      hairGroup.add(earRight);
      const mic = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.14, 6), mat);
      mic.position.set(0.12, 0.88, 0.12);
      mic.rotation.x = 0.5;
      hairGroup.add(mic);
    }
    this.model.add(hairGroup);
  }

  sit() {
    this.state = 'sitting';
    this.path = [];
    this.model.position.y = -0.16;
    this.leftLeg.rotation.x = -Math.PI / 2.1;
    this.rightLeg.rotation.x = -Math.PI / 2.1;
  }

  stand() {
    this.state = 'idle';
    this.model.position.y = 0;
    this.leftLeg.rotation.x = 0;
    this.rightLeg.rotation.x = 0;
  }

  setPath(coordPath, finalFacing = 0, onArrival = null) {
    if (!coordPath || coordPath.length === 0) {
      if (onArrival) onArrival();
      return;
    }
    this.stand();
    this.state = 'walking';
    this.path = coordPath.map(([x, z]) => [x, z]);
    this.targetFacing = finalFacing;
    this.onArrival = onArrival;
  }

  say(text, durationMs = 4500) {
    if (!text) return;

    // Bersihkan timeout sebelumnya jika ada
    if (this.bubbleTimeout) {
      clearTimeout(this.bubbleTimeout);
      this.bubbleTimeout = null;
    }

    // Maksimal 2 bubble aktif sekaligus di kantor
    const activeList = Character.activeBubbles;
    while (activeList.length >= 2) {
      const oldest = activeList.shift();
      if (oldest && oldest.char !== this) {
        oldest.char.hideBubble();
      }
    }

    // Potong teks jika melebihi batas (maks 2 baris / ~80 char)
    const cleanText = text.length > 80 ? text.slice(0, 77) + '...' : text;
    this.bubbleDiv.textContent = cleanText;

    // Periksa apakah ada bubble lain yang berdekatan; jika ya, angkat ke atas (lifted)
    let shouldLift = false;
    for (const b of activeList) {
      if (b.char !== this) {
        const dist = Math.hypot(
          this.group.position.x - b.char.group.position.x,
          this.group.position.z - b.char.group.position.z
        );
        if (dist < 4.0) {
          shouldLift = true;
          break;
        }
      }
    }

    if (shouldLift) {
      this.bubbleDiv.classList.add('lifted');
    } else {
      this.bubbleDiv.classList.remove('lifted');
    }

    this.bubbleDiv.classList.add('visible');

    const entry = { char: this, div: this.bubbleDiv };
    activeList.push(entry);

    this.bubbleTimeout = setTimeout(() => {
      this.hideBubble();
    }, durationMs);
  }

  hideBubble() {
    if (this.bubbleTimeout) {
      clearTimeout(this.bubbleTimeout);
      this.bubbleTimeout = null;
    }
    this.bubbleDiv.classList.remove('visible');
    this.bubbleDiv.classList.remove('lifted');
    Character.activeBubbles = Character.activeBubbles.filter((b) => b.char !== this);
  }

  update(delta) {
    this.animTime += delta;

    if (this.state === 'walking') {
      if (this.path.length === 0) {
        // Tiba di tujuan
        this.group.rotation.y = this.targetFacing;
        const spot = this.targetSpot || this.currentSpot;
        this.currentSpot = spot;
        this.arrivedSpot = spot;
        this.targetSpot = null;

        if (
          spot &&
          (spot.startsWith('desk_') ||
            spot.startsWith('lounge_') ||
            spot.startsWith('ps5_sofa') ||
            spot.startsWith('sunken_tatami') ||
            spot.startsWith('meditation_'))
        ) {
          this.sit();
        } else {
          this.stand();
        }

        if (this.onArrival) {
          const cb = this.onArrival;
          this.onArrival = null;
          cb();
        }
        return;
      }

      const target = this.path[0];
      const curX = this.group.position.x;
      const curZ = this.group.position.z;
      const dx = target[0] - curX;
      const dz = target[1] - curZ;
      const dist = Math.hypot(dx, dz);
      const step = this.walkSpeed * delta;

      if (dist <= step) {
        // Sampai di waypoint ini
        this.group.position.x = target[0];
        this.group.position.z = target[1];
        this.path.shift();
      } else {
        // Melangkah mendekati waypoint
        this.group.position.x += (dx / dist) * step;
        this.group.position.z += (dz / dist) * step;

        // Rotasi menghadap arah gerak
        const angle = Math.atan2(dx, dz);
        this.group.rotation.y = angle;

        // Animasi jalan: ayun kaki & bobbing tubuh
        const cycle = Math.sin(this.animTime * 10);
        this.leftLeg.rotation.x = cycle * 0.55;
        this.rightLeg.rotation.x = -cycle * 0.55;
        this.model.position.y = Math.abs(Math.sin(this.animTime * 10)) * 0.04;
      }
    } else if (this.state === 'idle') {
      this.model.position.y = Math.sin(this.animTime * 2.5) * 0.015;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
    } else if (this.state === 'sitting') {
      this.model.position.y = -0.16 + Math.sin(this.animTime * 1.8) * 0.008;
      this.leftLeg.rotation.x = -Math.PI / 2.1;
      this.rightLeg.rotation.x = -Math.PI / 2.1;
    }
  }
}
