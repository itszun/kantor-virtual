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
    this.monitorsByDesk = new Map(); // desk_id -> array of { screenMat, glowBarMat }
    this.whiteboards = new Map(); // id -> { boardMat, title, texture }
    this.storageBoxesInstanced = null;
    this.storageRackGroup = null;

    this.init();
  }

  calcViewSize(width, height) {
    const aspect = width / height;
    // Pada HP (< 520px): seluruh 4 meja + lounge + pantry terlihat tanpa terpotong
    if (width < 520) {
      return Math.max(7.8, 9.2 / Math.max(aspect, 0.6));
    } else if (width < 600) {
      return 7.5;
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
    this.camera.lookAt(0.2, 0.4, -0.5);

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
    this.controls.target.set(0.2, 0.4, -0.5);

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

  createTatamiTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    // Warna dasar tikar jerami tatami Jepang
    ctx.fillStyle = '#b8a66d';
    ctx.fillRect(0, 0, 512, 512);

    // Anyaman jerami halus melintang
    ctx.fillStyle = 'rgba(74, 62, 34, 0.12)';
    for (let y = 0; y < 512; y += 4) {
      ctx.fillRect(0, y, 512, 2);
    }
    // Jahitan serat vertikal
    ctx.fillStyle = 'rgba(235, 222, 175, 0.18)';
    for (let x = 0; x < 512; x += 16) {
      ctx.fillRect(x, 0, 2, 512);
    }
    // Pita tepi kain hitam/hijau lumut tua (heri) di sisi kiri & kanan
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 28, 512);
    ctx.fillRect(512 - 28, 0, 28, 512);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(26, 0, 3, 512);
    ctx.fillRect(512 - 29, 0, 3, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    return texture;
  }

  createCardboardTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    // Kertas kardus kraft cokelat hangat
    ctx.fillStyle = '#be854d';
    ctx.fillRect(0, 0, 256, 256);

    // Serat kardus kasar
    ctx.fillStyle = 'rgba(92, 53, 20, 0.1)';
    for (let y = 0; y < 256; y += 6) {
      ctx.fillRect(0, y, 256, 2);
    }

    // Label pengiriman putih & barcode
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(25, 40, 110, 80);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('RAM LOGISTICS', 30, 58);
    ctx.font = '10px monospace';
    ctx.fillText('BOX-RAM', 30, 74);

    // Garis barcode
    for (let x = 32; x < 125; x += 5) {
      const w = x % 3 === 0 ? 3 : 1.5;
      ctx.fillRect(x, 82, w, 28);
    }

    // Pita selotip lakban cokelat di tengah
    ctx.fillStyle = 'rgba(194, 137, 72, 0.85)';
    ctx.fillRect(0, 140, 256, 32);
    ctx.strokeStyle = '#8a531e';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 140, 256, 32);

    return new THREE.CanvasTexture(canvas);
  }

  createPs5ScreenTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 288;
    const ctx = canvas.getContext('2d');
    // Langit pixel art game retro Kairosoft
    const grad = ctx.createLinearGradient(0, 0, 0, 288);
    grad.addColorStop(0, '#1e1b4b');
    grad.addColorStop(0.5, '#4338ca');
    grad.addColorStop(1, '#f43f5e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 288);

    // Bulan pixel bulat
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(420, 70, 36, 0, Math.PI * 2);
    ctx.fill();

    // Siluet bukit & pohon pixel
    ctx.fillStyle = '#064e3b';
    ctx.beginPath();
    ctx.moveTo(0, 288);
    ctx.lineTo(0, 200);
    ctx.lineTo(140, 160);
    ctx.lineTo(280, 220);
    ctx.lineTo(420, 170);
    ctx.lineTo(512, 210);
    ctx.lineTo(512, 288);
    ctx.closePath();
    ctx.fill();

    // UI HUD Game: Health bar & Koin
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(20, 20, 120, 14);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 120, 14);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('STAGE 1: KANTOR AI', 20, 54);
    ctx.fillStyle = '#fde047';
    ctx.fillText('🪙 9,999 PTS', 380, 34);

    return new THREE.CanvasTexture(canvas);
  }

  createPaintingTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    // Lukisan kanvas hasil kreasi artist agy: Sunset gunung Fuji & sakura
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#f97316');
    grad.addColorStop(0.4, '#fbbf24');
    grad.addColorStop(0.8, '#ec4899');
    grad.addColorStop(1, '#831843');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 384, 256);

    // Matahari merah bulat
    ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
    ctx.beginPath();
    ctx.arc(192, 100, 50, 0, Math.PI * 2);
    ctx.fill();

    // Gunung bersalju di tengah
    ctx.fillStyle = '#312e81';
    ctx.beginPath();
    ctx.moveTo(100, 256);
    ctx.lineTo(192, 90);
    ctx.lineTo(284, 256);
    ctx.closePath();
    ctx.fill();

    // Puncak salju putih
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(172, 125);
    ctx.lineTo(192, 90);
    ctx.lineTo(212, 125);
    ctx.lineTo(192, 138);
    ctx.closePath();
    ctx.fill();

    // Pohon sakura berbunga pink di sudut kiri
    ctx.fillStyle = '#451a03';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(40, 256);
    ctx.quadraticCurveTo(60, 180, 90, 140);
    ctx.stroke();

    ctx.fillStyle = '#f472b6';
    for (let i = 0; i < 18; i++) {
      const px = 60 + Math.sin(i * 1.7) * 35;
      const py = 120 + Math.cos(i * 2.1) * 30;
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.fill();
    }

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

        // Glow indicator bar di atas monitor agar jelas terlihat dari sudut kamera manapun
        const glowBarMat = new THREE.MeshBasicMaterial({
          color: 0x000000,
          visible: false,
        });
        const glowBar = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.05, 0.05), glowBarMat);
        glowBar.position.set(0, 0.49, 0);
        group.add(glowBar);

        if (f.target) {
          if (!this.monitorsByDesk.has(f.target)) {
            this.monitorsByDesk.set(f.target, []);
          }
          this.monitorsByDesk.get(f.target).push({ screenMat, glowBarMat });
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
          ? ['Belum ada delegasi']
          : ['Belum ada tugas Greg'];

        const texture = this.createWhiteboardTexture(title, lines);
        const group = new THREE.Group();
        // Bingkai aluminium
        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.06, h + 0.06, d),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6, roughness: 0.3 })
        );
        group.add(frame);
        // Permukaan papan
        const boardMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.2 });
        const board = new THREE.Mesh(
          new THREE.PlaneGeometry(w, h),
          boardMat
        );
        board.position.z = d / 2 + 0.005;
        group.add(board);

        group.position.set(pos[0], pos[1], pos[2]);
        this.scene.add(group);

        if (f.id) {
          this.whiteboards.set(f.id, { boardMat, title, texture });
        }
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

      else if (f.type === 'buddha_altar') {
        const group = new THREE.Group();
        const altarWoodMat = new THREE.MeshStandardMaterial({ color: 0x3e1f0e, roughness: 0.5 });
        const goldMat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          metalness: 0.85,
          roughness: 0.25,
        });
        const bronzeMat = new THREE.MeshStandardMaterial({
          color: 0x78350f,
          metalness: 0.7,
          roughness: 0.4,
        });

        // Meja altar kayu jati bertingkat
        const baseTable = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.65, 0.9), altarWoodMat);
        baseTable.position.y = 0.325;
        baseTable.castShadow = true;
        baseTable.receiveShadow = true;
        group.add(baseTable);

        const topPlinth = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.98), altarWoodMat);
        topPlinth.position.y = 0.69;
        group.add(topPlinth);

        // Taplak sutra altar merah anggur
        const runnerMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.7 });
        const runner = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.015, 0.92), runnerMat);
        runner.position.y = 0.735;
        group.add(runner);

        // Patung Rupang Buddha Emas (Lotus seat, body, head, halo/ushnisha)
        const statueGroup = new THREE.Group();
        statueGroup.position.set(0, 0.74, -0.15);

        // Kelopak teratai lotus base
        const lotusBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.12, 16), goldMat);
        lotusBase.position.y = 0.06;
        statueGroup.add(lotusBase);

        // Tubuh meditasi lotus posture
        const buddhaBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.22, 8, 16), goldMat);
        buddhaBody.position.y = 0.28;
        statueGroup.add(buddhaBody);

        // Kepala & Ushnisha
        const buddhaHead = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), goldMat);
        buddhaHead.position.y = 0.52;
        statueGroup.add(buddhaHead);

        const ushnisha = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 12), goldMat);
        ushnisha.position.y = 0.68;
        statueGroup.add(ushnisha);

        // Lingkaran aura halo hening emas di belakang patung
        const haloMat = new THREE.MeshStandardMaterial({
          color: 0xfef08a,
          emissive: 0xf59e0b,
          emissiveIntensity: 0.4,
          roughness: 0.3,
        });
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.02, 8, 24), haloMat);
        halo.position.set(0, 0.48, -0.06);
        statueGroup.add(halo);

        group.add(statueGroup);

        // Wadah dupa perunggu & stik dupa
        const censer = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.09, 12), bronzeMat);
        censer.position.set(0, 0.78, 0.24);
        group.add(censer);

        const incenseStickMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.18, 6), incenseStickMat);
        stick.position.set(0, 0.90, 0.24);
        group.add(stick);

        // Asap dupa meliuk (semi-transparan halus)
        const smokeMat = new THREE.MeshBasicMaterial({
          color: 0xf1f5f9,
          transparent: true,
          opacity: 0.3,
        });
        const smoke1 = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), smokeMat);
        smoke1.position.set(0.01, 1.03, 0.24);
        group.add(smoke1);
        const smoke2 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), smokeMat);
        smoke2.position.set(-0.02, 1.12, 0.25);
        group.add(smoke2);
        const smoke3 = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), smokeMat);
        smoke3.position.set(0.02, 1.22, 0.26);
        group.add(smoke3);

        // Mangkuk persembahan buah & lilin teratai
        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.05, 0.06, 12), goldMat);
        bowl.position.set(0.42, 0.77, 0.2);
        group.add(bowl);
        const candleMat = new THREE.MeshStandardMaterial({
          color: 0xfef08a,
          emissive: 0xf59e0b,
          emissiveIntensity: 1.2,
        });
        const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.08, 12), candleMat);
        candle.position.set(-0.42, 0.78, 0.2);
        group.add(candle);

        group.position.set(pos[0], pos[1], pos[2]);
        this.scene.add(group);
      }

      else if (f.type === 'meditation_cushion') {
        const group = new THREE.Group();
        const cushionMat = new THREE.MeshStandardMaterial({
          color: 0x78350f,
          roughness: 0.8,
        });
        const zafu = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.11, 16), cushionMat);
        zafu.position.y = 0.055;
        zafu.castShadow = true;
        group.add(zafu);

        // Pita ornamen tengah
        const ribMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
        const rib = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.015, 8, 20), ribMat);
        rib.rotation.x = Math.PI / 2;
        rib.position.y = 0.055;
        group.add(rib);

        group.position.set(pos[0], 0, pos[2]);
        this.scene.add(group);
      }

      else if (f.type === 'ps5_station') {
        const group = new THREE.Group();
        // Meja kabinet TV modern
        const tvStandMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
        const stand = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.45, 0.65), tvStandMat);
        stand.position.y = 0.225;
        stand.castShadow = true;
        group.add(stand);

        // TV 40 inci
        const tvGroup = new THREE.Group();
        tvGroup.position.set(0.35, 0.45, 0);
        const tvBezelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });
        const tvFrame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 0.06), tvBezelMat);
        tvFrame.position.y = 0.65;
        tvGroup.add(tvFrame);

        // Layar TV pixel art game Kairosoft
        const tvScreenMat = new THREE.MeshStandardMaterial({
          map: this.createPs5ScreenTexture(),
          roughness: 0.1,
          emissive: 0xffffff,
          emissiveIntensity: 0.5,
        });
        const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.72, 1.02), tvScreenMat);
        tvScreen.position.set(0, 0.65, 0.035);
        tvGroup.add(tvScreen);

        // Kaki TV aluminium
        const tvFoot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 0.2, 12),
          new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 })
        );
        tvFoot.position.y = 0.1;
        tvGroup.add(tvFoot);
        group.add(tvGroup);

        // Konsol PlayStation 5 berdiri vertikal di samping TV
        const ps5Group = new THREE.Group();
        ps5Group.position.set(-0.82, 0.45, 0.05);

        // Plat bodi luar putih melengkung
        const ps5ShellMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25 });
        const shellLeft = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.42, 0.28), ps5ShellMat);
        shellLeft.position.set(-0.06, 0.21, 0);
        ps5Group.add(shellLeft);

        const shellRight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.42, 0.28), ps5ShellMat);
        shellRight.position.set(0.06, 0.21, 0);
        ps5Group.add(shellRight);

        // Inti hitam glossy
        const ps5CoreMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.15 });
        const core = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.40, 0.26), ps5CoreMat);
        core.position.set(0, 0.20, 0);
        ps5Group.add(core);

        // Lampu LED neon biru khas PS5
        const ps5LedMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });
        const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.015, 0.24), ps5LedMat);
        ledStrip.position.set(0, 0.38, 0);
        ps5Group.add(ledStrip);

        // Controller DualSense di dock
        const padMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
        const pad1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.08), padMat);
        pad1.position.set(-0.82, 0.47, 0.22);
        group.add(pad1);

        group.add(ps5Group);
        group.position.set(pos[0], pos[1], pos[2]);
        this.scene.add(group);
      }

      else if (f.type === 'reception_counter') {
        const group = new THREE.Group();
        const woodMat = new THREE.MeshStandardMaterial({ color: 0xd89b4b, roughness: 0.5 });
        const topMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });

        // Meja konter lobi resepsionis
        const counterBase = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 0.8), woodMat);
        counterBase.position.y = 0.5;
        counterBase.castShadow = true;
        group.add(counterBase);

        const counterTop = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.08, 0.9), topMat);
        counterTop.position.y = 1.04;
        group.add(counterTop);

        // Bell resepsionis emas & buku tamu
        const bell = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.07, 0.05, 12),
          new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.2 })
        );
        bell.position.set(-0.4, 1.1, 0);
        group.add(bell);

        const book = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, 0.02, 0.3),
          new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.7 })
        );
        book.position.set(0.3, 1.09, 0);
        group.add(book);

        // Vas tanaman anggrek kecil
        const vase = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.06, 0.16, 12),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
        );
        vase.position.set(0.8, 1.16, 0);
        group.add(vase);
        const flower = new THREE.Mesh(
          new THREE.SphereGeometry(0.09, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.6 })
        );
        flower.position.set(0.8, 1.3, 0);
        group.add(flower);

        group.position.set(pos[0], pos[1], pos[2]);
        this.scene.add(group);
      }

      else if (f.type === 'shoe_rack') {
        const group = new THREE.Group();
        const rackMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });
        const rack = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.1, 0.45), rackMat);
        rack.position.y = 0.55;
        rack.castShadow = true;
        group.add(rack);

        // Sekat rak sepatu 3 tingkat
        for (let i = 0; i < 3; i++) {
          const shoeMat = new THREE.MeshStandardMaterial({
            color: i === 0 ? 0x2563eb : i === 1 ? 0xd97706 : 0x059669,
            roughness: 0.7,
          });
          const shoe1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.22), shoeMat);
          shoe1.position.set(-0.2, 0.25 + i * 0.32, 0.05);
          group.add(shoe1);
          const shoe2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.22), shoeMat);
          shoe2.position.set(0.2, 0.25 + i * 0.32, 0.05);
          group.add(shoe2);
        }

        group.position.set(pos[0], pos[1], pos[2]);
        this.scene.add(group);
      }

      else if (f.type === 'sunken_tatami') {
        const group = new THREE.Group();
        // Frame kayu luar tatami bertingkat
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.5 });
        const frame = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 2.4), frameMat);
        frame.position.y = 0.06;
        frame.receiveShadow = true;
        group.add(frame);

        // Karpet anyaman tikar tatami
        const tatamiMat = new THREE.MeshStandardMaterial({
          map: this.createTatamiTexture(),
          roughness: 0.8,
        });
        const tatami = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.2), tatamiMat);
        tatami.rotation.x = -Math.PI / 2;
        tatami.position.y = 0.125;
        tatami.receiveShadow = true;
        group.add(tatami);

        // Meja rendah horigotatsu di tengah
        const tableMat = new THREE.MeshStandardMaterial({ color: 0x3e1f0e, roughness: 0.4 });
        const table = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.28, 0.85), tableMat);
        table.position.y = 0.265;
        table.castShadow = true;
        group.add(table);

        // Teko teh keramik Jepang & cangkir ocha
        const teapotMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.3 });
        const teapot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.12, 12), teapotMat);
        teapot.position.set(0, 0.46, 0);
        group.add(teapot);

        const cupMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
        const cup1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.05, 10), cupMat);
        cup1.position.set(-0.25, 0.43, 0);
        group.add(cup1);
        const cup2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.05, 10), cupMat);
        cup2.position.set(0.25, 0.43, 0);
        group.add(cup2);

        // Bantal duduk merah zabuton di sisi meja
        const zabutonMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.8 });
        const z1 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), zabutonMat);
        z1.position.set(-0.95, 0.145, 0);
        group.add(z1);
        const z2 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), zabutonMat);
        z2.position.set(0.95, 0.145, 0);
        group.add(z2);

        group.position.set(pos[0], pos[1], pos[2]);
        this.scene.add(group);
      }

      else if (f.type === 'art_easel') {
        const group = new THREE.Group();
        const easelWoodMat = new THREE.MeshStandardMaterial({ color: 0xc49a45, roughness: 0.6 });

        // Kaki tripod easel kayu
        const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.6, 8), easelWoodMat);
        leg1.position.set(-0.28, 0.8, 0.15);
        leg1.rotation.z = 0.18;
        leg1.rotation.x = -0.15;
        group.add(leg1);

        const leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.6, 8), easelWoodMat);
        leg2.position.set(0.28, 0.8, 0.15);
        leg2.rotation.z = -0.18;
        leg2.rotation.x = -0.15;
        group.add(leg2);

        const legBack = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.6, 8), easelWoodMat);
        legBack.position.set(0, 0.8, -0.32);
        legBack.rotation.x = 0.32;
        group.add(legBack);

        // Dudukan penyangga kanvas melintang
        const ledge = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.04, 0.08), easelWoodMat);
        ledge.position.set(0, 0.72, 0.18);
        group.add(ledge);

        // Kanvas lukisan Codex
        const canvasMat = new THREE.MeshStandardMaterial({
          map: this.createPaintingTexture(),
          roughness: 0.5,
        });
        const painting = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.52), canvasMat);
        painting.position.set(0, 1.0, 0.17);
        painting.rotation.x = -0.15;
        group.add(painting);

        // Palet cat kayu dengan bercak warna minyak
        const palette = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.16, 0.015, 16),
          new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 })
        );
        palette.position.set(0.48, 0.55, 0.1);
        palette.rotation.x = 0.2;
        group.add(palette);

        // Gelas kuas
        const brushJar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.05, 0.14, 12),
          new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 })
        );
        brushJar.position.set(-0.45, 0.4, 0.1);
        group.add(brushJar);

        group.position.set(pos[0], pos[1], pos[2]);
        this.scene.add(group);
      }

      else if (f.type === 'storage_shelves') {
        const group = new THREE.Group();
        this.storageRackGroup = group;

        const steelMat = new THREE.MeshStandardMaterial({
          color: 0x475569,
          metalness: 0.8,
          roughness: 0.3,
        });

        // 4 Tiang besi rak industri
        const rackW = 2.4;
        const rackH = 2.5;
        const rackD = 0.9;
        const postGeo = new THREE.BoxGeometry(0.06, rackH, 0.06);

        const offsets = [
          [-rackW / 2 + 0.05, -rackD / 2 + 0.05],
          [rackW / 2 - 0.05, -rackD / 2 + 0.05],
          [-rackW / 2 + 0.05, rackD / 2 - 0.05],
          [rackW / 2 - 0.05, rackD / 2 - 0.05],
        ];

        offsets.forEach(([x, z]) => {
          const post = new THREE.Mesh(postGeo, steelMat);
          post.position.set(x, rackH / 2, z);
          post.castShadow = true;
          group.add(post);
        });

        // 3 Tingkat ambalan besi
        const shelfLevels = [0.2, 1.0, 1.8];
        shelfLevels.forEach((lvl) => {
          const shelf = new THREE.Mesh(new THREE.BoxGeometry(rackW, 0.04, rackD), steelMat);
          shelf.position.y = lvl;
          shelf.castShadow = true;
          shelf.receiveShadow = true;
          group.add(shelf);
        });

        // InstancedMesh tumpukan kardus RAM logistik
        // 24 slot total: 3 tier x 4 kolom x 2 baris
        const boxGeo = new THREE.BoxGeometry(0.48, 0.34, 0.38);
        const boxMat = new THREE.MeshStandardMaterial({
          map: this.createCardboardTexture(),
          roughness: 0.8,
        });

        const maxBoxes = 24;
        this.storageBoxesInstanced = new THREE.InstancedMesh(boxGeo, boxMat, maxBoxes);
        this.storageBoxesInstanced.castShadow = true;
        this.storageBoxesInstanced.receiveShadow = true;

        const dummy = new THREE.Object3D();
        let idx = 0;

        for (let tier = 0; tier < 3; tier++) {
          const y = shelfLevels[tier] + 0.17 + 0.02;
          for (let row = 0; row < 2; row++) {
            const z = row === 0 ? -0.2 : 0.2;
            for (let col = 0; col < 4; col++) {
              const x = -0.75 + col * 0.5;
              dummy.position.set(x, y, z);
              dummy.rotation.y = idx % 2 === 0 ? 0.05 : -0.05;
              dummy.updateMatrix();
              this.storageBoxesInstanced.setMatrixAt(idx, dummy.matrix);
              idx++;
            }
          }
        }

        // Tampilkan 8 boks sebagai default awal
        this.storageBoxesInstanced.count = 8;
        this.storageBoxesInstanced.instanceMatrix.needsUpdate = true;
        group.add(this.storageBoxesInstanced);

        group.position.set(pos[0], pos[1], pos[2]);
        this.scene.add(group);
      }

      else if (f.type === 'hermes_console') {
        const group = new THREE.Group();
        const consoleBaseMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          metalness: 0.7,
          roughness: 0.35,
        });
        const cyberCyanMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });

        // Konsol heksagonal operator Hermes
        const hexConsole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.95, 1.05, 0.72, 6),
          consoleBaseMat
        );
        hexConsole.position.y = 0.36;
        hexConsole.castShadow = true;
        hexConsole.receiveShadow = true;
        group.add(hexConsole);

        // Strip aksen neon cyber-cyan di sekeliling konsol
        const neonRing = new THREE.Mesh(
          new THREE.CylinderGeometry(0.97, 0.97, 0.04, 6),
          cyberCyanMat
        );
        neonRing.position.y = 0.68;
        group.add(neonRing);

        // Monitor CRT Ganda (layar cembung retro tabung)
        const crtCaseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
        const crtGreenMat = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          emissive: 0x059669,
          emissiveIntensity: 1.2,
          roughness: 0.2,
        });
        const crtCyanMat = new THREE.MeshStandardMaterial({
          color: 0x06b6d4,
          emissive: 0x0891b2,
          emissiveIntensity: 1.2,
          roughness: 0.2,
        });

        // CRT 1: Layar Hijau Terminal / Matrix data
        const crt1 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.32), crtCaseMat);
        crt1.position.set(-0.28, 0.92, -0.15);
        crt1.rotation.y = 0.35;
        group.add(crt1);
        const crt1Screen = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), crtGreenMat);
        crt1Screen.scale.set(1.0, 0.8, 0.35);
        crt1Screen.position.set(-0.24, 0.92, -0.01);
        crt1Screen.rotation.y = 0.35;
        group.add(crt1Screen);

        // CRT 2: Layar Cyan Radar / Route packet
        const crt2 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.32), crtCaseMat);
        crt2.position.set(0.28, 0.92, -0.15);
        crt2.rotation.y = -0.35;
        group.add(crt2);
        const crt2Screen = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), crtCyanMat);
        crt2Screen.scale.set(1.0, 0.8, 0.35);
        crt2Screen.position.set(0.24, 0.92, -0.01);
        crt2Screen.rotation.y = -0.35;
        group.add(crt2Screen);

        // Keyboard mekanik & panel tombol indikator
        const keyMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
        const keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.03, 0.22), keyMat);
        keyboard.position.set(0, 0.74, 0.18);
        keyboard.rotation.x = -0.15;
        group.add(keyboard);

        // Daftarkan monitor Hermes untuk efek aktif saat orkestrasi
        this.monitorsByDesk.set('desk_hermes', [
          { screenMat: crt1Screen.material, glowBarMat: null },
          { screenMat: crt2Screen.material, glowBarMat: null },
        ]);

        group.position.set(pos[0], pos[1], pos[2]);
        this.scene.add(group);
      }
    });
  }

  setDeskMonitor(deskSpot, active, colorHex = '#60a5fa') {
    const monitors = this.monitorsByDesk.get(deskSpot);
    if (!monitors) return;
    const color = new THREE.Color(colorHex);

    monitors.forEach(({ screenMat, glowBarMat }) => {
      if (active) {
        screenMat.color.copy(color);
        screenMat.emissive.copy(color);
        screenMat.emissiveIntensity = 2.0;
        if (glowBarMat) {
          glowBarMat.color.copy(color);
          glowBarMat.visible = true;
        }
      } else {
        screenMat.color.set(0x111111);
        screenMat.emissive.set(0x000000);
        screenMat.emissiveIntensity = 0;
        if (glowBarMat) {
          glowBarMat.visible = false;
        }
      }
    });
  }

  updateWhiteboard(id, lines = []) {
    const wb = this.whiteboards.get(id);
    if (!wb) return;

    const safeLines = lines.slice(0, 3).map((l) => {
      const str = String(l || '').trim();
      return str.length > 28 ? str.slice(0, 27) + '…' : str;
    });

    if (safeLines.length === 0) {
      safeLines.push(id === 'wb_delegation' ? 'Belum ada delegasi' : 'Belum ada tugas Greg');
    }

    const newTex = this.createWhiteboardTexture(wb.title, safeLines);
    if (wb.texture) {
      wb.texture.dispose();
    }
    wb.texture = newTex;
    wb.boardMat.map = newTex;
    wb.boardMat.needsUpdate = true;
  }

  updateStorageBoxes(boxCount = 8) {
    if (!this.storageBoxesInstanced) return;
    const maxBoxes = 24;
    const count = Math.max(1, Math.min(Math.round(boxCount), maxBoxes));
    this.storageBoxesInstanced.count = count;
    this.storageBoxesInstanced.instanceMatrix.needsUpdate = true;
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
