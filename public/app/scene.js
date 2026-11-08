/**
 * scene.js - Pembangun lingkungan kantor 3D isometrik dengan Three.js (Tema Terang & Hangat)
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

export class OfficeScene {
  constructor(canvasElement, cssContainerElement, officeConfig) {
    this.canvas = canvasElement;
    this.cssContainer = cssContainerElement;
    this.config = officeConfig || {};
    this.monitorsByDesk = new Map(); // desk_id -> array of MeshStandardMaterial

    this.init();
  }

  calcViewSize(width, height) {
    // Pada HP (< 600px): karakter tampak ±2x lebih besar, lantai mengisi ±95% kanvas
    if (width < 600) {
      return 6.6;
    } else if (width < 1000) {
      return 8.2;
    } else {
      return 9.4;
    }
  }

  init() {
    const width = this.canvas.parentElement.clientWidth || window.innerWidth;
    const height = this.canvas.parentElement.clientHeight || window.innerHeight;

    // 1. Scene dengan latar krem/hangat
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#f5f0e8');

    // 2. Camera (Orthographic Isometrik)
    const aspect = width / height;
    const viewSize = this.calcViewSize(width, height);
    this.camera = new THREE.OrthographicCamera(
      -viewSize * aspect,
      viewSize * aspect,
      viewSize,
      -viewSize,
      0.1,
      250
    );
    // Sudut isometrik dari depan-kanan-atas
    this.camera.position.set(22, 22, 22);
    this.camera.lookAt(0, 0.4, 0);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    // 4. CSS2D Renderer untuk label & bubble
    this.cssRenderer = new CSS2DRenderer();
    this.cssRenderer.setSize(width, height);
    this.cssRenderer.domElement.style.position = 'absolute';
    this.cssRenderer.domElement.style.top = '0px';
    this.cssRenderer.domElement.style.left = '0px';
    this.cssRenderer.domElement.style.pointerEvents = 'none';
    this.cssContainer.appendChild(this.cssRenderer.domElement);

    // 5. Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enableRotate = true;
    this.controls.minPolarAngle = Math.PI / 4.5;
    this.controls.maxPolarAngle = Math.PI / 2.8;
    this.controls.minAzimuthAngle = Math.PI / 12;
    this.controls.maxAzimuthAngle = Math.PI / 2.2;
    this.controls.target.set(0, 0.4, 0);

    // 6. Pencahayaan Hangat
    this.setupLighting();

    // 7. Bangun Ruangan & Furnitur
    this.buildRoom();
    this.buildFurniture();

    // Event listener resize
    window.addEventListener('resize', () => this.onResize());
  }

  setupLighting() {
    // Cahaya hemisfer hangat (langit krem keperakan, lantai hangat)
    const hemiLight = new THREE.HemisphereLight(0xfffbf2, 0xd4c2a5, 0.95);
    hemiLight.position.set(0, 20, 0);
    this.scene.add(hemiLight);

    // Cahaya matahari hangat dengan bayangan lembut
    const dirLight = new THREE.DirectionalLight(0xfff4e0, 1.35);
    dirLight.position.set(16, 24, 14);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 80;
    const d = 16;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    // Lampu aksen lembut dari sisi jendela/lounge
    const accentLight = new THREE.DirectionalLight(0xe0e7ff, 0.4);
    accentLight.position.set(-15, 12, -10);
    this.scene.add(accentLight);
  }

  buildRoom() {
    const roomW = this.config.room?.width || 20;
    const roomD = this.config.room?.depth || 12;
    const wallH = this.config.room?.wallHeight || 4.5;

    // --- Lantai Kayu Madu Hangat dengan Garis Papan Jelas ---
    const woodTexture = this.createWoodTexture();
    const floorGeo = new THREE.PlaneGeometry(roomW, roomD);
    const floorMat = new THREE.MeshStandardMaterial({
      map: woodTexture,
      roughness: 0.65,
      metalness: 0.04,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(0, 0, 0);
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);

    // --- Dinding Belakang Krem Hangat (Z = -roomD/2) ---
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xf5ede1, // Krem hangat terang
      roughness: 0.85,
    });
    const backWallGeo = new THREE.BoxGeometry(roomW, wallH, 0.2);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, wallH / 2, -roomD / 2);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    // Baseboard belakang kayu hangat
    const baseboardMat = new THREE.MeshStandardMaterial({ color: 0x8c5b32, roughness: 0.6 });
    const backBaseboard = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.18, 0.25), baseboardMat);
    backBaseboard.position.set(0, 0.09, -roomD / 2 + 0.03);
    this.scene.add(backBaseboard);

    // --- Dinding Kiri Krem Hangat (X = -roomW/2) ---
    const leftWallGeo = new THREE.BoxGeometry(0.2, wallH, roomD);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
    leftWall.position.set(-roomW / 2, wallH / 2, 0);
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    // Baseboard kiri
    const leftBaseboard = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, roomD), baseboardMat);
    leftBaseboard.position.set(-roomW / 2 + 0.03, 0.09, 0);
    this.scene.add(leftBaseboard);
  }

  createWoodTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Palet warna papan kayu madu hangat
    const honeyColors = ['#d89b4b', '#e2a758', '#ce8f3e', '#dba254', '#cb8b39'];
    const plankH = 32;

    // Gambar per baris papan kayu dengan variasi warna madu alami
    for (let y = 0; y < 512; y += plankH) {
      const rowIdx = Math.floor(y / plankH);
      const rowColor = honeyColors[rowIdx % honeyColors.length];
      ctx.fillStyle = rowColor;
      ctx.fillRect(0, y, 512, plankH);

      // Urat kayu halus di dalam papan
      ctx.fillStyle = 'rgba(110, 60, 16, 0.08)';
      for (let i = 0; i < 4; i++) {
        const lineY = y + 4 + i * 7;
        ctx.fillRect(0, lineY, 512, 1.5);
      }
    }

    // Garis nat horizontal antar papan (cokelat tua tegas, kontras jelas)
    ctx.strokeStyle = '#683c15';
    ctx.lineWidth = 2.5;
    for (let y = 0; y <= 512; y += plankH) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Sambungan vertikal selang-seling antar bilah papan
    ctx.lineWidth = 2.0;
    for (let y = 0; y < 512; y += plankH) {
      const offset = (Math.floor(y / plankH) % 2 === 0) ? 0 : 64;
      for (let x = offset; x < 512; x += 128) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + plankH);
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 2.5);
    return texture;
  }

  createWhiteboardTexture(title, lines) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 340;
    const ctx = canvas.getContext('2d');

    // Background putih papan tulis bersih
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 340);

    // Header bar
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(0, 0, 512, 42);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(title, 20, 28);

    // List lines
    ctx.font = '16px sans-serif';
    lines.forEach((line, idx) => {
      ctx.fillStyle = '#3b82f6';
      ctx.fillText('•', 24, 85 + idx * 45);
      ctx.fillStyle = '#1e293b';
      ctx.fillText(line, 44, 85 + idx * 45);
    });

    return new THREE.CanvasTexture(canvas);
  }

  createWindowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Langit gradien cerah hangat
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#93c5fd');
    grad.addColorStop(0.65, '#e0f2fe');
    grad.addColorStop(1, '#fef3c7');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Siluet gedung kota di kejauhan
    ctx.fillStyle = '#94a3b8';
    const buildings = [
      { x: 10, w: 30, h: 100 },
      { x: 45, w: 25, h: 140 },
      { x: 75, w: 35, h: 80 },
      { x: 115, w: 40, h: 160 },
      { x: 160, w: 30, h: 120 },
      { x: 195, w: 45, h: 90 },
    ];
    buildings.forEach(b => {
      ctx.fillRect(b.x, 256 - b.h, b.w, b.h);
      ctx.fillStyle = '#fef08a';
      for (let wy = 256 - b.h + 10; wy < 250; wy += 15) {
        for (let wx = b.x + 5; wx < b.x + b.w - 5; wx += 8) {
          ctx.fillRect(wx, wy, 3, 5);
        }
      }
      ctx.fillStyle = '#94a3b8';
    });

    return new THREE.CanvasTexture(canvas);
  }

  createTvTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 288;
    const ctx = canvas.getContext('2d');

    // Background layar TV warna biru-indigo cerah & hidup
    const grad = ctx.createLinearGradient(0, 0, 512, 288);
    grad.addColorStop(0, '#0369a1');
    grad.addColorStop(0.5, '#4338ca');
    grad.addColorStop(1, '#0f766e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 288);

    // Banner Siaran Atas
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(20, 20, 70, 26);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('● LIVE', 30, 38);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('KANTOR WEIWU TV', 105, 40);

    // Grafik Batang Statistik / Acara TV
    const barColors = ['#38bdf8', '#34d399', '#facc15', '#f472b6', '#a78bfa'];
    const barHeights = [90, 140, 110, 170, 130];
    barHeights.forEach((bh, i) => {
      ctx.fillStyle = barColors[i];
      ctx.fillRect(40 + i * 85, 230 - bh, 60, bh);
    });

    // Subtitle Ticker Bawah
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 245, 512, 43);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.fillText('Tim AI Beroperasi Penuh · Sprint Status: Normal · Efisiensi 99.4%', 20, 272);

    return new THREE.CanvasTexture(canvas);
  }

  buildFurniture() {
    const furnitureList = this.config.furniture || [];

    // Shared materials tema terang hangat
    const deskWoodMat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.5 }); // Kayu cerah
    const deskLegMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4 });
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    const sofaMat = new THREE.MeshStandardMaterial({ color: 0x3b536b, roughness: 0.85 }); // Sofa soft slate-blue
    const potMat = new THREE.MeshStandardMaterial({ color: 0xc2714f, roughness: 0.6 });
    const plantMat = new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.8 });

    furnitureList.forEach((f) => {
      const pos = f.pos || [0, 0, 0];
      const rot = f.rot || [0, 0, 0];

      if (f.type === 'desk') {
        const [w, h, d] = f.size || [2.2, 0.7, 1.2];
        const group = new THREE.Group();
        // Top board kayu
        const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), deskWoodMat);
        top.position.y = h;
        top.castShadow = true;
        top.receiveShadow = true;
        group.add(top);
        // Legs
        const legGeo = new THREE.CylinderGeometry(0.04, 0.04, h);
        const offsets = [
          [-w / 2 + 0.15, -d / 2 + 0.15],
          [w / 2 - 0.15, -d / 2 + 0.15],
          [-w / 2 + 0.15, d / 2 - 0.15],
          [w / 2 - 0.15, d / 2 - 0.15],
        ];
        offsets.forEach(([ox, oz]) => {
          const leg = new THREE.Mesh(legGeo, deskLegMat);
          leg.position.set(ox, h / 2, oz);
          leg.castShadow = true;
          group.add(leg);
        });
        group.position.set(pos[0], 0, pos[2]);
        this.scene.add(group);
      }

      else if (f.type === 'chair') {
        const group = new THREE.Group();
        // Base seat
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.55), chairMat);
        seat.position.y = 0.45;
        seat.castShadow = true;
        group.add(seat);
        // Backrest
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.08), chairMat);
        back.position.set(0, 0.7, -0.24);
        back.castShadow = true;
        group.add(back);
        // Stand leg
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45), deskLegMat);
        leg.position.y = 0.225;
        group.add(leg);
        // Base star
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04), deskLegMat);
        base.position.y = 0.02;
        group.add(base);

        group.position.set(pos[0], 0, pos[2]);
        group.rotation.set(rot[0], rot[1], rot[2]);
        this.scene.add(group);
      }

      else if (f.type === 'monitor') {
        const group = new THREE.Group();
        // Stand
        const stand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.06), deskLegMat);
        stand.position.y = 0.11;
        group.add(stand);
        // Frame
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.42, 0.04), deskLegMat);
        frame.position.y = 0.28;
        frame.castShadow = true;
        group.add(frame);
        // Screen (Emissive standard material yang bisa dinyalakan)
        const screenMat = new THREE.MeshStandardMaterial({
          color: 0x111111,
          emissive: 0x000000,
          roughness: 0.3,
        });
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.36), screenMat);
        screen.position.set(0, 0.28, 0.025);
        group.add(screen);

        if (f.target) {
          if (!this.monitorsByDesk.has(f.target)) {
            this.monitorsByDesk.set(f.target, []);
          }
          this.monitorsByDesk.get(f.target).push(screenMat);
        }

        group.position.set(pos[0], pos[1] - 0.15, pos[2]);
        group.rotation.set(rot[0], rot[1], rot[2]);
        this.scene.add(group);
      }

      else if (f.type === 'carpet') {
        const carpetGeo = new THREE.CircleGeometry(f.radius || 2.4, 32);
        const carpetMat = new THREE.MeshStandardMaterial({
          color: 0xe2ded4, // Karpet krem oat hangat
          roughness: 0.95,
        });
        const carpet = new THREE.Mesh(carpetGeo, carpetMat);
        carpet.rotation.x = -Math.PI / 2;
        carpet.position.set(pos[0], pos[1] || 0.01, pos[2]);
        carpet.receiveShadow = true;
        this.scene.add(carpet);
      }

      else if (f.type === 'coffee_table') {
        const r = f.radius || 0.85;
        const group = new THREE.Group();
        const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.06, 32), deskWoodMat);
        top.position.y = 0.35;
        top.castShadow = true;
        top.receiveShadow = true;
        group.add(top);

        const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.35);
        for (let a = 0; a < Math.PI * 2; a += (Math.PI * 2) / 3) {
          const leg = new THREE.Mesh(legGeo, deskLegMat);
          leg.position.set(Math.cos(a) * (r - 0.2), 0.175, Math.sin(a) * (r - 0.2));
          leg.castShadow = true;
          group.add(leg);
        }
        group.position.set(pos[0], 0, pos[2]);
        this.scene.add(group);
      }

      else if (f.type === 'sofa') {
        const group = new THREE.Group();
        // Cushion
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.75), sofaMat);
        seat.position.y = 0.25;
        seat.castShadow = true;
        seat.receiveShadow = true;
        group.add(seat);
        // Back
        const back = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 0.2), sofaMat);
        back.position.set(0, 0.48, -0.28);
        back.castShadow = true;
        group.add(back);
        // Armrests
        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.35, 0.75), sofaMat);
        armL.position.set(-0.51, 0.35, 0);
        group.add(armL);
        const armR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.35, 0.75), sofaMat);
        armR.position.set(0.51, 0.35, 0);
        group.add(armR);

        group.position.set(pos[0], 0, pos[2]);
        group.rotation.set(rot[0], rot[1], rot[2]);
        this.scene.add(group);
      }

      // --- PANTRY KOPI LENGKAP ---
      else if (f.type === 'coffee_counter') {
        const [w, h, d] = f.size || [2.6, 1, 1.2];
        const group = new THREE.Group();

        // Lemari bawah (kayu krem/hangat)
        const cabinetMat = new THREE.MeshStandardMaterial({ color: 0xeadbc8, roughness: 0.6 });
        const cabinet = new THREE.Mesh(new THREE.BoxGeometry(w, h - 0.08, d), cabinetMat);
        cabinet.position.y = (h - 0.08) / 2;
        cabinet.castShadow = true;
        cabinet.receiveShadow = true;
        group.add(cabinet);

        // Countertop marmer putih bersih
        const marbleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
        const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.08, d + 0.06), marbleMat);
        top.position.y = h - 0.04;
        top.castShadow = true;
        top.receiveShadow = true;
        group.add(top);

        // Rak gantung dinding dengan cangkir kopi
        const shelfMat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.5 });
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 0.3), shelfMat);
        shelf.position.set(0, 1.9, -0.45);
        shelf.castShadow = true;
        group.add(shelf);

        // Beberapa cangkir keramik di atas rak
        const cupMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
        [-0.6, -0.2, 0.2, 0.6].forEach((cx) => {
          const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.1, 12), cupMat);
          cup.position.set(cx, 1.98, -0.45);
          cup.castShadow = true;
          group.add(cup);
        });

        group.position.set(pos[0], 0, pos[2]);
        this.scene.add(group);
      }

      else if (f.type === 'coffee_machine') {
        const group = new THREE.Group();
        // Bodi mesin espresso metalik elegan
        const bodyMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          metalness: 0.7,
          roughness: 0.3,
        });
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.45), bodyMat);
        body.position.y = 0.225;
        body.castShadow = true;
        group.add(body);

        // Cerat / Portafilter kopi
        const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.2 });
        const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.08), chromeMat);
        spout.position.set(0, 0.12, 0.24);
        group.add(spout);

        // Cangkir kopi di bawah cerat
        const cupMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.08, 12), cupMat);
        cup.position.set(0, 0.04, 0.24);
        cup.castShadow = true;
        group.add(cup);

        // Wadah biji kopi transparan di atas mesin
        const glassMat = new THREE.MeshStandardMaterial({
          color: 0x854d0e,
          roughness: 0.1,
          metalness: 0.1,
          transparent: true,
          opacity: 0.85,
        });
        const hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.14, 16), glassMat);
        hopper.position.set(0, 0.52, 0);
        group.add(hopper);

        // Lampu indikator status hijau menyala
        const ledMat = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          emissive: 0x10b981,
          emissiveIntensity: 0.8,
        });
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), ledMat);
        led.position.set(0.18, 0.35, 0.23);
        group.add(led);

        group.position.set(pos[0], pos[1], pos[2]);
        this.scene.add(group);
      }

      // --- TV DI LOUNGE DENGAN LAYAR MENYALA TERANG ---
      else if (f.type === 'tv_wall') {
        const [w, h, d] = f.size || [2.4, 1.4, 0.1];
        const group = new THREE.Group();

        // Frame TV bezel tipis hitam
        const frameMat = new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          roughness: 0.3,
          metalness: 0.6,
        });
        const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), frameMat);
        frame.castShadow = true;
        group.add(frame);

        // Layar TV dengan tekstur siaran menyala terang
        const tvTex = this.createTvTexture();
        const screenMat = new THREE.MeshStandardMaterial({
          map: tvTex,
          emissiveMap: tvTex,
          emissive: 0xffffff,
          emissiveIntensity: 0.8, // Layar jelas berpijar dan menyala
          roughness: 0.2,
        });
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.12, h - 0.12), screenMat);
        screen.position.z = d / 2 + 0.01;
        group.add(screen);

        // Lampu LED power indikator di bawah TV
        const powerLedMat = new THREE.MeshStandardMaterial({
          color: 0x3b82f6,
          emissive: 0x3b82f6,
          emissiveIntensity: 1.0,
        });
        const powerLed = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), powerLedMat);
        powerLed.position.set(w / 2 - 0.12, -h / 2 + 0.05, d / 2 + 0.01);
        group.add(powerLed);

        group.position.set(pos[0], pos[1], pos[2]);
        this.scene.add(group);
      }

      else if (f.type === 'whiteboard') {
        const [w, h, d] = f.size || [2.4, 1.4, 0.08];
        const title = f.title || 'Papan Informasi';
        const lines = f.id === 'wb_delegation'
          ? ['Integrasi API Server v0.1 Selesai', 'Worktree isolasi aktif', 'Sistem pelaporan otomatis']
          : ['Sprint Prioritas Minggu Ini', 'Review kode dan performa 60fps', 'Kompak & rapi selalu'];

        const texture = this.createWhiteboardTexture(title, lines);
        const group = new THREE.Group();
        // Bingkai aluminium
        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.06, h + 0.06, d),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6, roughness: 0.3 })
        );
        group.add(frame);
        // Permukaan papan
        const board = new THREE.Mesh(
          new THREE.PlaneGeometry(w, h),
          new THREE.MeshStandardMaterial({ map: texture, roughness: 0.2 })
        );
        board.position.z = d / 2 + 0.005;
        group.add(board);

        group.position.set(pos[0], pos[1], pos[2]);
        this.scene.add(group);
      }

      else if (f.type === 'window') {
        const [w, h, d] = f.size || [2.2, 2.0, 0.1];
        const group = new THREE.Group();
        // Frame jendela
        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4 })
        );
        group.add(frame);
        // Kaca dengan siluet kota cerah
        const winTex = this.createWindowTexture();
        const glass = new THREE.Mesh(
          new THREE.PlaneGeometry(w - 0.15, h - 0.15),
          new THREE.MeshStandardMaterial({
            map: winTex,
            roughness: 0.1,
            emissive: 0xffffff,
            emissiveIntensity: 0.3,
          })
        );
        glass.position.z = d / 2 + 0.005;
        group.add(glass);

        group.position.set(pos[0], pos[1], pos[2]);
        this.scene.add(group);
      }

      else if (f.type === 'plant') {
        const group = new THREE.Group();
        // Pot keramik
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.5, 16), potMat);
        pot.position.y = 0.25;
        pot.castShadow = true;
        group.add(pot);
        // Daun tanaman
        const leaf1 = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), plantMat);
        leaf1.position.set(0, 0.65, 0);
        leaf1.scale.set(1, 1.2, 1);
        leaf1.castShadow = true;
        group.add(leaf1);

        const leaf2 = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), plantMat);
        leaf2.position.set(0.12, 0.8, -0.05);
        group.add(leaf2);

        const leaf3 = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), plantMat);
        leaf3.position.set(-0.1, 0.75, 0.08);
        group.add(leaf3);

        group.position.set(pos[0], 0, pos[2]);
        this.scene.add(group);
      }
    });
  }

  setDeskMonitor(deskSpot, active, colorHex = '#60a5fa') {
    const screens = this.monitorsByDesk.get(deskSpot);
    if (!screens) return;
    const color = new THREE.Color(colorHex);

    screens.forEach((mat) => {
      if (active) {
        mat.emissive.copy(color);
        mat.emissiveIntensity = 0.85;
      } else {
        mat.emissive.set(0x000000);
        mat.emissiveIntensity = 0;
      }
    });
  }

  onResize() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const width = this.canvas.parentElement.clientWidth;
    const height = this.canvas.parentElement.clientHeight;
    if (width === 0 || height === 0) return;

    const aspect = width / height;
    const viewSize = this.calcViewSize(width, height);

    this.camera.left = -viewSize * aspect;
    this.camera.right = viewSize * aspect;
    this.camera.top = viewSize;
    this.camera.bottom = -viewSize;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.cssRenderer.setSize(width, height);
  }

  render() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.cssRenderer.render(this.scene, this.camera);
  }
}
