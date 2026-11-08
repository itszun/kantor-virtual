import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { buildV6Prop } from './props-v6.js';

const CELL_ORIGINS = { NW: [-8, -6], N: [0, -6], NE: [8, -6], W: [-8, 0], C: [0, 0], E: [8, 0], SW: [-8, 6], S: [0, 6], SE: [8, 6] };
const FLOOR_COLORS = { wood: 0xb98255, tatami: 0xb8aa67, tile: 0x8e9aa7, deck: 0x9b6b43, carpet: 0x8e779b };

export class OfficeScene {
  constructor(canvasElement, cssContainerElement, officeConfig) {
    this.canvas = canvasElement;
    this.cssContainer = cssContainerElement;
    this.config = officeConfig || {};
    this.scene = new THREE.Scene();
    this.monitorsByDesk = new Map();
    this.whiteboards = new Map();
    this.storageBoxesInstanced = null;
    this.materialCache = new Map();
    this.zoneCenters = new Map();
    this.zoneLabels = [];
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.focusAnimation = null;
    this.debugEnabled = new URLSearchParams(window.location.search).get('debug') === '1';
    this.frameCount = 0;
    this.fps = 0;
    this.lastFpsAt = performance.now();
    this.init();
  }

  material(key, color, options = {}) {
    if (!this.materialCache.has(key)) {
      this.materialCache.set(key, new THREE.MeshLambertMaterial({ color, ...options }));
    }
    return this.materialCache.get(key);
  }

  get materials() {
    return {
      wood: this.material('wood', 0x9b633d), dark: this.material('dark', 0x34404b), accent: this.material('accent', 0xd2a33d), cream: this.material('cream', 0xe8d9bd), screen: this.material('screen', 0x315d8d, { emissive: 0x19385b, emissiveIntensity: 0.45 }), water: this.material('water', 0x4d9cbc, { emissive: 0x123c5a, emissiveIntensity: 0.3 }), tatami: this.material('tatami', 0xb8aa67), terracotta: this.material('terracotta', 0xa55d3d), leaf: this.material('leaf', 0x47764b), fence: this.material('fence', 0x6d5145), sofa: this.material('sofa', 0x566f87)
    };
  }

  init() {
    this.scene.background = new THREE.Color(0xd9e7ed);
    this.camera = new THREE.OrthographicCamera(-16, 16, 16, -16, 0.1, 100);
    this.camera.position.set(25, 25, 25);
    this.camera.lookAt(0, 0, 0);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 520 ? 1.5 : 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping = true;
    this.controls.minDistance = 14;
    this.controls.maxDistance = 48;
    this.controls.minAzimuthAngle = 0.35;
    this.controls.maxAzimuthAngle = 1.15;
    this.controls.minPolarAngle = 0.72;
    this.controls.maxPolarAngle = 1.15;
    this.cssRenderer = new CSS2DRenderer();
    this.cssRenderer.domElement.style.position = 'absolute';
    this.cssRenderer.domElement.style.inset = '0';
    this.cssRenderer.domElement.style.pointerEvents = 'none';
    this.cssContainer?.appendChild(this.cssRenderer.domElement);
    this.setupLighting();
    this.buildRoom();
    this.buildFurniture();
    this.installPicking();
    this.installDebugOverlay();
    this.onResize();
    window.addEventListener('resize', () => this.onResize());
  }

  setupLighting() {
    this.scene.add(new THREE.HemisphereLight(0xfff3d8, 0x6d8292, 2.1));
    const light = new THREE.DirectionalLight(0xffe4b8, 2.6);
    light.position.set(-12, 22, 8);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.left = -18;
    light.shadow.camera.right = 18;
    light.shadow.camera.top = 18;
    light.shadow.camera.bottom = -18;
    this.scene.add(light);
  }

  zoneBounds(zone) {
    const [x, z] = CELL_ORIGINS[zone.cell];
    return { minX: x - 4, maxX: x + 4, minZ: z - 3, maxZ: z + 3, x, z };
  }

  buildRoom() {
    const seen = new Set();
    for (const zone of this.config.zones || []) {
      const bounds = this.zoneBounds(zone);
      this.zoneCenters.set(zone.id, new THREE.Vector3(bounds.x, 0, bounds.z));
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(7.92, 5.92), this.material(`floor-${zone.floor}`, FLOOR_COLORS[zone.floor] || 0xb98255));
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(bounds.x, zone.id === 'tatami' ? -0.08 : 0, bounds.z);
      floor.receiveShadow = true;
      this.scene.add(floor);
      this.addZoneLabel(zone, bounds);
      this.addOwnedWalls(zone, bounds, seen);
    }
  }

  addOwnedWalls(zone, bounds, seen) {
    const edges = [
      { side: 'N', key: `h:${bounds.minZ}:${bounds.x}`, x: bounds.x, z: bounds.minZ, length: 8, outer: bounds.minZ === -9 },
      { side: 'W', key: `v:${bounds.minX}:${bounds.z}`, x: bounds.minX, z: bounds.z, length: 6, outer: bounds.minX === -12 },
      { side: 'S', key: `h:${bounds.maxZ}:${bounds.x}`, x: bounds.x, z: bounds.maxZ, length: 8, outer: bounds.maxZ === 9 },
      { side: 'E', key: `v:${bounds.maxX}:${bounds.z}`, x: bounds.maxX, z: bounds.z, length: 6, outer: bounds.maxX === 12 }
    ];
    for (const edge of edges) {
      if (seen.has(edge.key)) continue;
      seen.add(edge.key);
      const isBack = edge.outer && (edge.side === 'N' || edge.side === 'W');
      const height = isBack ? 2.4 : 0.75;
      const door = (zone.doors || []).find((d) => d.side === edge.side);
      this.addWallWithDoor(edge, height, door);
    }
  }

  addWallWithDoor(edge, height, door) {
    const off = door?.offset || 0;
    const parts = door ? [[-edge.length / 2, off - door.width / 2], [off + door.width / 2, edge.length / 2]] : [[-edge.length / 2, edge.length / 2]];
    for (const [start, end] of parts) {
      const length = end - start;
      if (length <= 0.02) continue;
      const horizontal = edge.side === 'N' || edge.side === 'S';
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? length : 0.16, height, horizontal ? 0.16 : length), this.material('wall', 0xf0dfca));
      mesh.position.set(edge.x + (horizontal ? (start + end) / 2 : 0), height / 2, edge.z + (horizontal ? 0 : (start + end) / 2));
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    }
  }

  addZoneLabel(zone, bounds) {
    const texture = this.createTextTexture(zone.label, '#24313a', '#f5dfaa');
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 0.62), new THREE.MeshBasicMaterial({ map: texture, transparent: true }));
    // Papan nama rebah di lantai tepi selatan zona: selalu terbaca dari kamera +x+z dan tidak tertutup dinding.
    sign.position.set(bounds.x, 0.03, bounds.maxZ - 0.45);
    sign.rotation.x = -Math.PI / 2;
    sign.userData.zoneId = zone.id;
    this.zoneLabels.push(sign);
    this.scene.add(sign);
  }

  createTextTexture(text, foreground = '#23303a', background = '#f0dfbf') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 104;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#765334';
    ctx.lineWidth = 7;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
    ctx.fillStyle = foreground;
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  buildFurniture() {
    for (const item of this.config.furniture || []) {
      if (item.type === 'whiteboard') {
        this.buildWhiteboard(item);
        continue;
      }
      const prop = buildV6Prop(item, this.materials);
      this.scene.add(prop);
      if (item.target) this.registerDeskMonitor(item.target, prop);
      if (item.type === 'storage_shelves') this.buildStorageBoxes(item, prop);
    }
  }

  registerDeskMonitor(target, prop) {
    const monitors = this.monitorsByDesk.get(target) || [];
    const screen = prop.children.find((child) => child.material === this.materials.screen);
    if (screen) monitors.push({ screen });
    this.monitorsByDesk.set(target, monitors);
  }

  buildWhiteboard(item) {
    const texture = this.createWhiteboardTexture(item.title, []);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(item.size[2], item.size[1]), material);
    board.position.set(item.pos[0] - 0.08, item.pos[1], item.pos[2]);
    board.rotation.y = -Math.PI / 2;
    this.scene.add(board);
    this.whiteboards.set(item.id, { boardMat: material, title: item.title, texture });
  }

  createWhiteboardTexture(title, lines) {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 600, 360);
    ctx.fillStyle = '#1e3a5f';
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText(title || 'Papan informasi', 34, 62);
    ctx.font = '28px sans-serif';
    const safe = lines.length ? lines : ['Belum ada pembaruan'];
    safe.slice(0, 3).forEach((line, index) => ctx.fillText(`• ${line}`, 36, 132 + index * 66));
    return new THREE.CanvasTexture(canvas);
  }

  buildStorageBoxes(item, parent) {
    const geometry = new THREE.BoxGeometry(0.34, 0.28, 0.34);
    const boxes = new THREE.InstancedMesh(geometry, this.material('box', 0xa86c40), 20);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 20; i++) {
      dummy.position.set((i % 2 ? 0.17 : -0.17), 0.22 + Math.floor(i / 2) * 0.29, -item.size[2] / 2 + 0.28 + (Math.floor(i / 2) % 5) * 0.54);
      dummy.updateMatrix();
      boxes.setMatrixAt(i, dummy.matrix);
    }
    boxes.count = 8;
    boxes.castShadow = true;
    parent.add(boxes);
    this.storageBoxesInstanced = boxes;
  }

  setDeskMonitor(deskSpot, active, colorHex = '#60a5fa') {
    for (const monitor of this.monitorsByDesk.get(deskSpot) || []) {
      const material = monitor.screen.material;
      if (active) {
        material.color.set(colorHex);
        material.emissive?.set(colorHex);
        material.emissiveIntensity = 0.6;
      } else {
        material.color.set(0x315d8d);
        material.emissive?.set(0x19385b);
        material.emissiveIntensity = 0.2;
      }
    }
  }

  updateWhiteboard(id, lines = []) {
    const board = this.whiteboards.get(id);
    if (!board) return;
    board.texture.dispose();
    board.texture = this.createWhiteboardTexture(board.title, lines.map((line) => String(line).slice(0, 28)));
    board.boardMat.map = board.texture;
    board.boardMat.needsUpdate = true;
  }

  updateStorageBoxes(boxCount = 8) {
    if (!this.storageBoxesInstanced) return;
    this.storageBoxesInstanced.count = Math.max(1, Math.min(Math.round(boxCount), 20));
    this.storageBoxesInstanced.instanceMatrix.needsUpdate = true;
  }

  installPicking() {
    let down = null;
    this.canvas.addEventListener('pointerdown', (event) => { down = [event.clientX, event.clientY]; });
    this.canvas.addEventListener('pointerup', (event) => {
      if (!down || Math.hypot(event.clientX - down[0], event.clientY - down[1]) > 8) return;
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hit = this.raycaster.intersectObjects(this.zoneLabels, false)[0];
      if (hit?.object.userData.zoneId) this.focusZone(hit.object.userData.zoneId);
    });
  }

  focusZone(zoneId) {
    const target = this.zoneCenters.get(zoneId);
    if (!target) return;
    this.focusAnimation = { started: performance.now(), duration: 420, fromTarget: this.controls.target.clone(), toTarget: target.clone(), fromCamera: this.camera.position.clone(), toCamera: target.clone().add(new THREE.Vector3(13, 16, 13)) };
  }

  showOverview() {
    this.focusAnimation = { started: performance.now(), duration: 420, fromTarget: this.controls.target.clone(), toTarget: new THREE.Vector3(), fromCamera: this.camera.position.clone(), toCamera: new THREE.Vector3(25, 25, 25) };
  }

  updateFocusTween() {
    if (!this.focusAnimation) return;
    const state = this.focusAnimation;
    const t = Math.min(1, (performance.now() - state.started) / state.duration);
    const eased = 1 - (1 - t) ** 3;
    this.controls.target.lerpVectors(state.fromTarget, state.toTarget, eased);
    this.camera.position.lerpVectors(state.fromCamera, state.toCamera, eased);
    if (t === 1) this.focusAnimation = null;
  }

  installDebugOverlay() {
    if (!this.debugEnabled) return;
    this.debugOverlay = document.createElement('div');
    this.debugOverlay.className = 'scene-debug-overlay';
    this.canvas.parentElement?.appendChild(this.debugOverlay);
  }

  getDebugStats() {
    return { calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, fps: this.fps };
  }

  updateDebugOverlay() {
    if (!this.debugOverlay) return;
    const stats = this.getDebugStats();
    this.debugOverlay.textContent = `Draw ${stats.calls} · Tri ${stats.triangles} · ${stats.fps} FPS`;
  }

  onResize() {
    if (!this.canvas?.parentElement) return;
    const width = this.canvas.parentElement.clientWidth;
    const height = this.canvas.parentElement.clientHeight;
    if (!width || !height) return;
    const view = width < 520 ? 15 : 13.2;
    const aspect = width / height;
    this.camera.left = -view * aspect;
    this.camera.right = view * aspect;
    this.camera.top = view;
    this.camera.bottom = -view;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 520 ? 1.5 : 2));
    this.renderer.setSize(width, height);
    this.cssRenderer.setSize(width, height);
  }

  render() {
    this.updateFocusTween();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.cssRenderer.render(this.scene, this.camera);
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsAt >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsAt));
      this.frameCount = 0;
      this.lastFpsAt = now;
      this.updateDebugOverlay();
    }
  }
}
