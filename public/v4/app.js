/**
 * NEXUS VIRTUAL HQ — Spatial Floor Plan Engine (Version 4: Feng Shui Edition)
 * Bagua 8-Sectors, Wu Xing 5-Elements, Qi Circulation, & Spatial Audio
 */

// Data Model: Office Layout & Bagua Sectors
const OFFICE_MAP = {
  width: 1440,
  height: 940,
  wallThickness: 6,
  rooms: [
    // 1. UTARA (NORTH) — Sektor Kan | Elemen Air | Karir & Aliran Peluang
    {
      id: "reception",
      name: "Lobi Resepsionis & Air Mancur Zen",
      subtitle: "Mulut Energi Qi (The Mouth of Chi) — Sektor Karir",
      tag: "Utara • Elemen Air (Kan)",
      tagColor: "#38bdf8",
      element: "water",
      baguaSector: "Utara (Kan)",
      baguaMeaning: "Karir, Aliran Peluang & Perjalanan Hidup",
      qiQuality: "Sheng Qi (Aliran Menyegarkan & Mengalir Lancar)",
      fengshuiSummary: "Pintu masuk utama adalah 'Mulut Qi' tempat seluruh energi positif masuk. Dilengkapi air mancur melengkung yang mengalirkan energi kemakmuran tanpa turbulensi.",
      zoneType: "public",
      x: 540,
      y: 40,
      w: 360,
      h: 220,
      door: { x: 720, y: 260, w: 60, h: 6, side: "bottom" },
      color: "rgba(2, 132, 199, 0.2)",
      blueprintCode: "ENT-001 [KAN-WATER]",
      area: 120,
      capacity: 30,
      acousticRating: "Open Welcoming Soundscape",
      audioRadius: "Radius Spasial 5.0m",
      amenities: [
        'Cascading Zen Water Fountain (Penarik Rezeki)',
        'Resepsionis AI Virtual Ramah Tamah',
        'Kios Tamu & Smart RFID Digital Badge',
        'Pintu Masuk Geser Otomatis Tanpa Sudut Tajam'
      ],
      protocol: "Setiap anggota dan tamu disambut dengan suara air mengalir yang menyejukkan. Suara ramah dan senyuman dianjurkan.",
      furniture: [
        { type: "water-fountain", x: 720, y: 120, r: 26 },
        { type: "curved-reception-desk", x: 650, y: 185, w: 140, h: 40 },
        { type: "plant", x: 570, y: 70, r: 16 },
        { type: "plant", x: 870, y: 70, r: 16 }
      ]
    },

    // 2. PUSAT (CENTER) — Sektor Tai Qi | Elemen Tanah | Jantung Keseimbangan & Harmoni
    {
      id: "center-zen",
      name: "Atrium Pusat & Taman Zen 'Tai Qi'",
      subtitle: "Jantung Keseimbangan Qi — Pusat Ketenangan",
      tag: "Pusat • Elemen Tanah (Tai Qi)",
      tagColor: "#fbbf24",
      element: "earth",
      baguaSector: "Pusat (Tai Qi)",
      baguaMeaning: "Kesehatan Terpusat, Keseimbangan Yin-Yang & Stabilitas",
      qiQuality: "Yin-Yang Balance (Harmoni Total)",
      fengshuiSummary: "Pusat kantor tidak boleh terhalang dinding masif atau tumpukan barang. Didesain sebagai Atrium Zen terbuka dengan bambu dan batu kali agar energi bersirkulasi bebas ke 8 penjuru.",
      zoneType: "social",
      x: 560,
      y: 320,
      w: 320,
      h: 280,
      door: null, // open atrium
      color: "rgba(251, 191, 36, 0.18)",
      blueprintCode: "CTR-000 [TAI-QI]",
      area: 135,
      capacity: 25,
      acousticRating: "Bisikan Halus & White Noise Alam",
      audioRadius: "Radius Spasial 3.5m",
      amenities: [
        'Raked Sand Zen Garden & Batu Keseimbangan',
        'Kolam Ikan Koi Virtual & Aliran Air Lembut',
        'Bambu Keberuntungan (Lucky Bamboo)',
        'Bantalan Meditasi Tatami untuk Relaksasi'
      ],
      protocol: "Area netral untuk berjalan kaki santai di sela-sela meeting, menenangkan pikiran, atau diskusi satu-lawan-satu yang penuh empati.",
      furniture: [
        { type: "koi-pond", x: 720, y: 460, w: 130, h: 80 },
        { type: "zen-stones", x: 620, y: 390, count: 5 },
        { type: "bamboo-clump", x: 820, y: 370, r: 22 },
        { type: "tatami-cushions", x: 620, y: 520, count: 3 }
      ]
    },

    // 3. BARAT LAUT (NORTH-WEST) — Sektor Qian | Elemen Logam | Kepemimpinan & Mentor
    {
      id: "boardroom",
      name: "Boardroom Garuda (Executive Command)",
      subtitle: "Sektor Pemimpin Tertinggi & Dewan Komisaris",
      tag: "Barat Laut • Logam (Qian)",
      tagColor: "#94a3b8",
      element: "metal",
      baguaSector: "Barat Laut (Qian)",
      baguaMeaning: "Kepemimpinan Puncak, Otoritas, Mentor & Patron",
      qiQuality: "Yang Murni (Kekuatan & Ketegasan)",
      fengshuiSummary: "Posisi ideal direktur dan dewan penasihat. Kursi kepemimpinan berada pada 'Commanding Position' yang bersandar pada dinding solid berlapis akustik kayu gelap.",
      zoneType: "meeting",
      x: 40,
      y: 40,
      w: 360,
      h: 250,
      door: { x: 400, y: 160, w: 6, h: 50, side: "right" },
      color: "rgba(148, 163, 184, 0.22)",
      blueprintCode: "EXE-101 [QIAN-LEAD]",
      area: 110,
      capacity: 18,
      acousticRating: "STC 55 (Kedap Suara 100%)",
      audioRadius: "Terisolasi (Command Safe)",
      amenities: [
        'Meja Konferensi Kayu Mahoni Bulat Sudut (Tanpa Sha Qi)',
        'Posisi Kursi Komando Membelakangi Dinding Kokoh',
        'Dual 85" Smart Display & Video Bar 360',
        'Smart Privacy Glass dengan Lapisan Logam Anti Radiasi'
      ],
      protocol: "Ruang keputusan strategis tingkat tinggi. Suara terenkripsi end-to-end tanpa kebocoran spasial.",
      furniture: [
        { type: "conference-table", x: 90, y: 105, w: 220, h: 110, seats: 14 },
        { type: "command-chair", x: 70, y: 160, label: "CEO" },
        { type: "tv-wall", x: 45, y: 110, w: 10, h: 100 },
        { type: "plant", x: 60, y: 60, r: 16 },
        { type: "plant", x: 60, y: 260, r: 16 }
      ]
    },

    // 4. TENGGARA (SOUTH-EAST) — Sektor Xun | Elemen Kayu | Kemakmuran & Finansial
    {
      id: "strategy-wealth",
      name: "Strategy & Wealth Suite 'Xun'",
      subtitle: "Pusat Pertumbuhan Finansial & Pendanaan Startup",
      tag: "Tenggara • Kayu (Xun)",
      tagColor: "#22c55e",
      element: "wood",
      baguaSector: "Tenggara (Xun)",
      baguaMeaning: "Kemakmuran, Keberlimpahan Dana & Pertumbuhan Valuasi",
      qiQuality: "Sheng Qi (Kelimpahan Finansial)",
      fengshuiSummary: "Sektor Kekayaan yang dihiasi tanaman Jade Plant berdaun tebal dan aksen emas. Tempat ideal untuk deal investasi, negosiasi M&A, dan analisa profitabilitas.",
      zoneType: "meeting",
      x: 1040,
      y: 40,
      w: 360,
      h: 250,
      door: { x: 1040, y: 160, w: 6, h: 50, side: "left" },
      color: "rgba(34, 197, 94, 0.2)",
      blueprintCode: "FIN-102 [XUN-WEALTH]",
      area: 108,
      capacity: 12,
      acousticRating: "STC 52 (Privasi Tinggi)",
      audioRadius: "Terisolasi (Data Room)",
      amenities: [
        'Tanaman Giok Jade Plant Simbol Keberlimpahan',
        'Meja Negosiasi Beraksen Emas Kuningan',
        'Terminal Data Finansial & Investor Portal',
        'Brankas Digital Dokumen Legal'
      ],
      protocol: "Gunakan ruangan ini untuk rapat anggaran, pembahasan opsi saham karyawan, dan penandatanganan term sheet modal ventura.",
      furniture: [
        { type: "wealth-table", x: 1120, y: 105, w: 190, h: 105, seats: 8 },
        { type: "jade-plants", x: 1350, y: 70, r: 18 },
        { type: "kpi-display", x: 1280, y: 48, w: 80, h: 8 },
        { type: "lounge-corner", x: 1060, y: 220, count: 2 }
      ]
    },

    // 5. TIMUR (EAST) — Sektor Zhen | Elemen Kayu | Pertumbuhan, Inovasi & Kesehatan
    {
      id: "clusters-dev",
      name: "Klaster Inovasi & Rekayasa Teknologi",
      subtitle: "Area Kerja Kolaboratif Engineering & Product Hub",
      tag: "Timur • Kayu (Zhen)",
      tagColor: "#10b981",
      element: "wood",
      baguaSector: "Timur (Zhen)",
      baguaMeaning: "Pertumbuhan Cepat, Inovasi Produk Baru & Energi Fajar",
      qiQuality: "Yang Dinamis (Kreativitas & Vitalitas)",
      fengshuiSummary: "Sektor Timur menyerap energi matahari terbit, sempurna untuk tim insinyur software dan perancang produk yang terus menelurkan ide-ide segar.",
      zoneType: "open",
      x: 960,
      y: 330,
      w: 440,
      h: 300,
      door: null, // open plan
      color: "rgba(16, 185, 129, 0.14)",
      blueprintCode: "ENG-201 [ZHEN-GROWTH]",
      area: 165,
      capacity: 32,
      acousticRating: "Radius Spasial Dinamis (4.0m)",
      audioRadius: "Radius 4.0m",
      amenities: [
        'Dinding Hidup Biophilic Vertikal Penyerap Stres',
        'Meja Kerja Ergonomis Kayu Ek Alami',
        'Monitor Ganda 4K dengan Mode Perlindungan Mata',
        'Meja Berdiri (Standing Desk) Otomatis'
      ],
      protocol: "Berbincang secara santai dalam radius 4 meter. Disarankan berdiri setiap 45 menit untuk menjaga sirkulasi chi tubuh.",
      furniture: [
        { type: "desk-island", x: 990, y: 360, w: 180, h: 90, desks: 6, team: "Frontend & UI" },
        { type: "desk-island", x: 1200, y: 360, w: 180, h: 90, desks: 6, team: "Cloud & AI Dev" },
        { type: "desk-island", x: 990, y: 490, w: 180, h: 90, desks: 6, team: "Product & QA" },
        { type: "desk-island", x: 1200, y: 490, w: 180, h: 90, desks: 6, team: "Mobile & Infra" },
        { type: "biophilic-wall", x: 1390, y: 340, w: 8, h: 260 }
      ]
    },

    // 6. BARAT (WEST) — Sektor Dui | Elemen Logam | Kreativitas & Proyek Masa Depan
    {
      id: "creative-lab",
      name: "Studio Desain Kreatif & Sprint Merapi",
      subtitle: "Laboratorium Desain, UI/UX & Brainstorming",
      tag: "Barat • Logam (Dui)",
      tagColor: "#a855f7",
      element: "metal",
      baguaSector: "Barat (Dui)",
      baguaMeaning: "Kreativitas, Proyek Masa Depan, Kesenangan & Ekspresi",
      qiQuality: "Sheng Qi Ekspresif (Percikan Ide)",
      fengshuiSummary: "Sektor Barat memicu energi kreasi murni dan kegembiraan berkarya. Meja berbentuk lingkaran meruntuhkan sekat hierarki dan mendorong ide tanpa batas.",
      zoneType: "meeting",
      x: 40,
      y: 330,
      w: 440,
      h: 300,
      door: { x: 480, y: 470, w: 6, h: 50, side: "right" },
      color: "rgba(168, 85, 247, 0.16)",
      blueprintCode: "DES-202 [DUI-CREATE]",
      area: 160,
      capacity: 20,
      acousticRating: "STC 48 (Teredam Nyaman)",
      audioRadius: "Terisolasi (Studio Audio)",
      amenities: [
        'Meja Diskusi Bundar Logam (Anti Sudut Tajam Sha Qi)',
        'Figma & Miro Canvas Touch Wall 100"',
        'Papan Sketsa Moodboard Magnetik',
        'Pencahayaan Spektrum Penuh 5000K'
      ],
      protocol: "Ruang bebas kritik untuk sesi ideasi awal, sprint desain, prototipe cepat, dan workshop interaktif.",
      furniture: [
        { type: "round-table", x: 170, y: 440, r: 55, seats: 8 },
        { type: "round-table", x: 350, y: 440, r: 45, seats: 6 },
        { type: "tv-wall", x: 230, y: 338, w: 120, h: 8 },
        { type: "plant", x: 60, y: 600, r: 16 }
      ]
    },

    // 7. SELATAN (SOUTH) — Sektor Li | Elemen Api | Reputasi, Ketenaran & Visibilitas
    {
      id: "townhall",
      name: "Auditorium Nusantara (Grand Stage)",
      subtitle: "Panggung All-Hands, Showcase Produk & Reputasi Global",
      tag: "Selatan • Elemen Api (Li)",
      tagColor: "#ef4444",
      element: "fire",
      baguaSector: "Selatan (Li)",
      baguaMeaning: "Ketenaran, Reputasi Gemilang, Visibilitas & Pengakuan",
      qiQuality: "Yang Terang Benderang (Inspirasi & Energi Tinggi)",
      fengshuiSummary: "Sektor Selatan melambangkan Api dan pengakuan dunia luar. Sangat cocok sebagai panggung peluncuran produk baru, seminar global, dan penganugerahan kinerja tim.",
      zoneType: "public",
      x: 540,
      y: 650,
      w: 360,
      h: 250,
      door: { x: 720, y: 650, w: 60, h: 6, side: "top" },
      color: "rgba(239, 68, 68, 0.18)",
      blueprintCode: "AUD-300 [LI-FAME]",
      area: 120,
      capacity: 100,
      acousticRating: "Stage Spotlight PA System",
      audioRadius: "Spotlight Speaker + Muted Audience",
      amenities: [
        'Panggung Lampu Hangat Aksen Api Emas',
        'Layar Presenter Raksasa 200" HDR',
        'Sistem Spotlight Voice (Megaphone)',
        'Tempat Duduk Bertingkat Menghadap Panggung'
      ],
      protocol: "Mode stage otomatis membisukan mic audiens untuk ketertiban acara, dengan tombol 'Angkat Tangan' untuk bertanya.",
      furniture: [
        { type: "stage", x: 600, y: 810, w: 240, h: 70 },
        { type: "podium", x: 710, y: 830, w: 22, h: 28 },
        { type: "auditorium-seats", x: 580, y: 680, rows: 2, cols: 6 }
      ]
    },

    // 8. TIMUR LAUT (NORTH-EAST) — Sektor Gen | Elemen Tanah | Pengetahuan & Kebijaksanaan
    {
      id: "library",
      name: "The Silent Library & Focus Pods",
      subtitle: "Pusat Riset, Kebijaksanaan & Kontemplasi Mendalam",
      tag: "Timur Laut • Tanah (Gen)",
      tagColor: "#d97706",
      element: "earth",
      baguaSector: "Timur Laut (Gen)",
      baguaMeaning: "Pengetahuan, Kebijaksanaan Spiritual & Ketenangan Batin",
      qiQuality: "Yin Menenangkan (Fokus Tanpa Gangguan)",
      fengshuiSummary: "Sektor Tanah yang kokoh seperti gunung (Gunung Gen). Menyediakan stabilitas mental luar biasa untuk membaca buku putih, riset data, dan coding rumit.",
      zoneType: "focus",
      x: 40,
      y: 650,
      w: 440,
      h: 250,
      door: { x: 480, y: 770, w: 6, h: 50, side: "right" },
      color: "rgba(217, 119, 6, 0.16)",
      blueprintCode: "LIB-301 [GEN-WISDOM]",
      area: 140,
      capacity: 22,
      acousticRating: "Zero Noise Auto-Mute (Hening)",
      audioRadius: "Mute Total (0 Meter)",
      amenities: [
        'Dinding Buku Kayu Pinus Beraroma Alami',
        'Bilik Solo Kedap Suara untuk Deep Work',
        'Lampu Meja Hangat 2700K Non-Glare',
        'Integrasi Pomodoro Timer Sinkron'
      ],
      protocol: "Wajib hening. Mikrofon otomatis dimatikan begitu avatar melangkah masuk ke gerbang Timur Laut ini.",
      furniture: [
        { type: "bookshelf", x: 60, y: 660, w: 320, h: 16 },
        { type: "study-carrels", x: 70, y: 700, w: 360, h: 120, count: 6 },
        { type: "plant", x: 450, y: 860, r: 16 }
      ]
    },

    // 9. BARAT DAYA (SOUTH-WEST) — Sektor Kun | Elemen Tanah | Harmoni, Hubungan & Kemitraan
    {
      id: "lounge-kun",
      name: "Warung Kopi & Social Breakout Lounge",
      subtitle: "Pusat Hubungan Karyawan, Kehangatan & Kekeluargaan",
      tag: "Barat Daya • Tanah (Kun)",
      tagColor: "#f97316",
      element: "earth",
      baguaSector: "Barat Daya (Kun)",
      baguaMeaning: "Hubungan Antar Manusia, Resepsi Kasih Sayang & Kemitraan",
      qiQuality: "Yin Kehangatan (Kebersamaan & Empati)",
      fengshuiSummary: "Sektor Ibu Pertiwi (Kun) yang mengayomi seluruh keluarga besar kantor. Menghangatkan hubungan antar divisi dan mencegah silo komunikasi.",
      zoneType: "social",
      x: 960,
      y: 650,
      w: 440,
      h: 250,
      door: { x: 960, y: 770, w: 6, h: 50, side: "left" },
      color: "rgba(249, 115, 22, 0.18)",
      blueprintCode: "SOC-302 [KUN-RELATION]",
      area: 140,
      capacity: 35,
      acousticRating: "Casual Warm Proximity (Radius 3.0m)",
      audioRadius: "Radius Spasial 3.0m",
      amenities: [
        'Espresso Bar & Teh Tradisional Herbal',
        'Sofa Setengah Lingkaran (Rangkulan Persahabatan)',
        'Meja Ping-Pong & Papan Catur untuk Relaksasi',
        'Dispenser Air Minum Infused Fruit Water'
      ],
      protocol: "Tempat menjalin hubungan akrab di luar pekerjaan formal. Rayakan keberhasilan rekan kerja dan sambut kolega baru.",
      furniture: [
        { type: "coffee-bar", x: 1240, y: 670, w: 140, h: 70 },
        { type: "curved-sofa", x: 1000, y: 700, r: 60 },
        { type: "ping-pong", x: 1140, y: 780, w: 90, h: 55 },
        { type: "plant", x: 1370, y: 860, r: 16 }
      ]
    }
  ]
};

// Simulated Colleagues Online
const INITIAL_COLLEAGUES = [
  { id: "col-1", name: "Rian Pratama", role: "Sr. Frontend Eng", room: "clusters-dev", status: "available", color: "#10b981", x: 1040, y: 380 },
  { id: "col-2", name: "Siti Nurhaliza", role: "Lead UI/UX Designer", room: "creative-lab", status: "focus", color: "#a855f7", x: 200, y: 440 },
  { id: "col-3", name: "David Wijaya", role: "Chief Executive Officer", room: "boardroom", status: "meeting", color: "#94a3b8", x: 200, y: 155 },
  { id: "col-4", name: "Alya Kusuma", role: "Head of Growth & Wealth", room: "strategy-wealth", status: "available", color: "#22c55e", x: 1220, y: 150 },
  { id: "col-5", name: "Budi Santoso", role: "DevOps & Cloud Lead", room: "clusters-dev", status: "meeting", color: "#06b6d4", x: 1250, y: 380 },
  { id: "col-6", name: "Farhan Malik", role: "AI Research Scientist", room: "library", status: "focus", color: "#d97706", x: 180, y: 730 },
  { id: "col-7", name: "Nadia Utami", role: "Talent & People Ops", room: "lounge-kun", status: "coffee", color: "#f97316", x: 1080, y: 740 },
  { id: "col-8", name: "Maya Indri", role: "Event & Showcase Host", room: "townhall", status: "available", color: "#ef4444", x: 720, y: 750 },
  { id: "col-9", name: "Putri Anggraini", role: "Wellness Specialist", room: "center-zen", status: "available", color: "#fbbf24", x: 720, y: 440 }
];

// User Avatar State
const userAvatar = {
  name: "Anda (Karyawan)",
  role: "Product Innovator",
  x: 720,
  y: 160,
  targetX: 720,
  targetY: 160,
  speed: 4.5,
  radius: 14,
  color: "#3b82f6",
  status: "available",
  micActive: true,
  audioRange: 130,
  currentRoomId: "reception"
};

// Canvas Engine & State
const canvas = document.getElementById("floorCanvas");
const ctx = canvas.getContext("2d");
const canvasWrapper = document.getElementById("canvasWrapper");

let viewMode = "visual"; // 'visual' | 'fengshui' | 'blueprint' | 'radar'
let scale = 1.0;
const minScale = 0.55;
const maxScale = 2.2;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let startDragX = 0;
let startDragY = 0;
let selectedRoom = null;
let hoveredRoom = null;

// Ambience Web Audio Synthesizer
let audioCtx = null;
let currentAmbienceSource = null;
let ambienceType = "none";

// Keys pressed
const keys = {};

// Water ripple effect in reception
let waterRippleTick = 0;

// Qi particles for Feng Shui mode
const qiParticles = [];
for (let i = 0; i < 45; i++) {
  qiParticles.push({
    x: 720 + (Math.random() - 0.5) * 40,
    y: 100 + Math.random() * 800,
    speedY: 0.8 + Math.random() * 1.2,
    angle: Math.random() * Math.PI * 2,
    radius: 2 + Math.random() * 3,
    color: Math.random() > 0.5 ? "rgba(251, 191, 36, 0.7)" : "rgba(56, 189, 248, 0.7)"
  });
}

// Initialization
function init() {
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // Center camera initially on Reception / Entrance
  centerCameraOn(userAvatar.x, userAvatar.y);

  // Event Listeners
  setupEventListeners();

  // Populate UI Lists
  renderRoomQuickList();
  renderColleaguesList();

  // Start Animation Loop
  requestAnimationFrame(animationLoop);
}

function resizeCanvas() {
  const rect = canvasWrapper.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  ctx.scale(dpr, dpr);
}

function centerCameraOn(worldX, worldY) {
  const rect = canvasWrapper.getBoundingClientRect();
  offsetX = rect.width / 2 - worldX * scale;
  offsetY = rect.height / 2 - worldY * scale;
}

// Event Listeners
function setupEventListeners() {
  // View mode switcher buttons
  document.getElementById("modeVisualBtn").addEventListener("click", () => setViewMode("visual"));
  document.getElementById("modeFengShuiBtn").addEventListener("click", () => setViewMode("fengshui"));
  document.getElementById("modeBlueprintBtn").addEventListener("click", () => setViewMode("blueprint"));
  document.getElementById("modeRadarBtn").addEventListener("click", () => setViewMode("radar"));

  // Zoom buttons
  document.getElementById("zoomInBtn").addEventListener("click", () => zoomBy(1.2));
  document.getElementById("zoomOutBtn").addEventListener("click", () => zoomBy(0.8));
  document.getElementById("centerAvatarBtn").addEventListener("click", () => centerCameraOn(userAvatar.x, userAvatar.y));
  document.getElementById("exportPngBtn").addEventListener("click", exportFloorplanPng);

  // Status selector
  document.getElementById("userStatusSelect").addEventListener("change", (e) => {
    userAvatar.status = e.target.value;
    updateStatusDot();
  });

  // Mic toggle
  const micBtn = document.getElementById("micToggleBtn");
  micBtn.addEventListener("click", () => {
    userAvatar.micActive = !userAvatar.micActive;
    micBtn.classList.toggle("active", userAvatar.micActive);
  });

  // Ambience audio buttons
  document.querySelectorAll(".ambience-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".ambience-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      playAmbienceSound(btn.dataset.sound);
    });
  });

  // Search input
  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", (e) => {
    handleSearch(e.target.value.trim().toLowerCase());
  });

  // Drawer buttons
  document.getElementById("closeDrawerBtn").addEventListener("click", closeDrawer);
  document.getElementById("teleportBtn").addEventListener("click", () => {
    if (selectedRoom) {
      userAvatar.targetX = selectedRoom.x + selectedRoom.w / 2;
      userAvatar.targetY = selectedRoom.y + selectedRoom.h / 2;
      closeDrawer();
    }
  });

  document.getElementById("joinMeetingBtn").addEventListener("click", () => {
    alert(`Bergabung ke video call spasial di "${selectedRoom?.name || 'Ruangan'}"!\nKoneksi audio jernih harmonis aktif.`);
  });

  document.getElementById("bookRoomBtn").addEventListener("click", () => {
    alert(`Jadwal untuk "${selectedRoom?.name}" berhasil dibuka di kalender kerja!`);
  });

  // Keyboard navigation
  window.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
  });

  window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  // Mouse drag & click on canvas
  canvasWrapper.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
      isDragging = true;
      startDragX = e.clientX - offsetX;
      startDragY = e.clientY - offsetY;
      canvasWrapper.classList.add("grabbing");
    }
  });

  window.addEventListener("mousemove", (e) => {
    if (isDragging) {
      offsetX = e.clientX - startDragX;
      offsetY = e.clientY - startDragY;
    } else {
      const rect = canvasWrapper.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - offsetX) / scale;
      const mouseY = (e.clientY - rect.top - offsetY) / scale;
      hoveredRoom = getRoomAt(mouseX, mouseY);
      canvasWrapper.style.cursor = hoveredRoom ? "pointer" : "grab";
    }
  });

  window.addEventListener("mouseup", (e) => {
    if (isDragging) {
      isDragging = false;
      canvasWrapper.classList.remove("grabbing");
    }
  });

  // Click on Canvas to Walk or Inspect Room
  canvasWrapper.addEventListener("click", (e) => {
    const rect = canvasWrapper.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - offsetX) / scale;
    const mouseY = (e.clientY - rect.top - offsetY) / scale;

    const clickedRoom = getRoomAt(mouseX, mouseY);
    if (clickedRoom) {
      openRoomDetails(clickedRoom);
    }

    userAvatar.targetX = Math.max(30, Math.min(OFFICE_MAP.width - 30, mouseX));
    userAvatar.targetY = Math.max(30, Math.min(OFFICE_MAP.height - 30, mouseY));
  });

  // Mouse wheel zoom
  canvasWrapper.addEventListener("wheel", (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const rect = canvasWrapper.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newScale = Math.min(maxScale, Math.max(minScale, scale * zoomFactor));
    offsetX = mouseX - (mouseX - offsetX) * (newScale / scale);
    offsetY = mouseY - (mouseY - offsetY) * (newScale / scale);
    scale = newScale;
  }, { passive: false });
}

function setViewMode(mode) {
  viewMode = mode;
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  if (mode === "visual") document.getElementById("modeVisualBtn").classList.add("active");
  if (mode === "fengshui") document.getElementById("modeFengShuiBtn").classList.add("active");
  if (mode === "blueprint") document.getElementById("modeBlueprintBtn").classList.add("active");
  if (mode === "radar") document.getElementById("modeRadarBtn").classList.add("active");

  const legend = document.getElementById("fengshuiLegend");
  if (mode === "fengshui") {
    legend.classList.add("visible");
  } else {
    legend.classList.remove("visible");
  }
}

function zoomBy(factor) {
  const rect = canvasWrapper.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const newScale = Math.min(maxScale, Math.max(minScale, scale * factor));
  offsetX = centerX - (centerX - offsetX) * (newScale / scale);
  offsetY = centerY - (centerY - offsetY) * (newScale / scale);
  scale = newScale;
}

function updateStatusDot() {
  const dot = document.getElementById("statusDot");
  const colors = {
    available: "var(--accent-emerald)",
    meeting: "var(--accent-indigo)",
    focus: "var(--accent-rose)",
    coffee: "var(--accent-amber)",
    away: "var(--text-muted)"
  };
  dot.style.background = colors[userAvatar.status] || "var(--accent-emerald)";
  dot.style.boxShadow = `0 0 8px ${colors[userAvatar.status]}`;
}

// Ambience Sound Generator with Web Audio API (No external files needed)
function playAmbienceSound(type) {
  ambienceType = type;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (currentAmbienceSource) {
    try {
      currentAmbienceSource.stop();
      currentAmbienceSource.disconnect();
    } catch (e) {}
    currentAmbienceSource = null;
  }

  if (type === "none") return;

  const bufferSize = audioCtx.sampleRate * 2;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);

  let lastOut = 0.0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + 0.02 * white) / 1.02;
    data[i] = lastOut * 3.5;
  }

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;

  const filter = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();

  if (type === "zenfountain") {
    // Water trickle sound
    filter.type = "bandpass";
    filter.frequency.value = 1100;
    filter.Q.value = 2.0;
    gain.gain.value = 0.06;
  } else if (type === "coffee") {
    filter.type = "bandpass";
    filter.frequency.value = 600;
    filter.Q.value = 0.8;
    gain.gain.value = 0.07;
  } else if (type === "rain") {
    filter.type = "lowpass";
    filter.frequency.value = 900;
    gain.gain.value = 0.06;
  } else if (type === "office") {
    filter.type = "lowpass";
    filter.frequency.value = 450;
    gain.gain.value = 0.04;
  }

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  noise.start();
  currentAmbienceSource = noise;
}

function getRoomAt(x, y) {
  return OFFICE_MAP.rooms.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) || null;
}

// User Movement Physics
function updateAvatarPhysics() {
  let moveX = 0;
  let moveY = 0;

  if (keys["w"] || keys["arrowup"]) moveY -= 1;
  if (keys["s"] || keys["arrowdown"]) moveY += 1;
  if (keys["a"] || keys["arrowleft"]) moveX -= 1;
  if (keys["d"] || keys["arrowright"]) moveX += 1;

  if (moveX !== 0 || moveY !== 0) {
    const len = Math.hypot(moveX, moveY);
    userAvatar.x += (moveX / len) * userAvatar.speed;
    userAvatar.y += (moveY / len) * userAvatar.speed;
    userAvatar.targetX = userAvatar.x;
    userAvatar.targetY = userAvatar.y;
  } else {
    const dx = userAvatar.targetX - userAvatar.x;
    const dy = userAvatar.targetY - userAvatar.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 3) {
      userAvatar.x += (dx / dist) * Math.min(dist, userAvatar.speed);
      userAvatar.y += (dy / dist) * Math.min(dist, userAvatar.speed);
    }
  }

  userAvatar.x = Math.max(25, Math.min(OFFICE_MAP.width - 25, userAvatar.x));
  userAvatar.y = Math.max(25, Math.min(OFFICE_MAP.height - 25, userAvatar.y));

  const curRoom = getRoomAt(userAvatar.x, userAvatar.y);
  if (curRoom && curRoom.id !== userAvatar.currentRoomId) {
    userAvatar.currentRoomId = curRoom.id;
    document.getElementById("currentRoomText").textContent = `${curRoom.name} (${curRoom.baguaSector})`;
    document.getElementById("currentRoomText").style.color = curRoom.tagColor || "var(--accent-cyan)";
  } else if (!curRoom && userAvatar.currentRoomId !== "hallway") {
    userAvatar.currentRoomId = "hallway";
    document.getElementById("currentRoomText").textContent = "Jalur Sirkulasi Qi Terbuka";
    document.getElementById("currentRoomText").style.color = "var(--text-secondary)";
  }

  calculateSpatialProximity();
}

function calculateSpatialProximity() {
  let nearbyCount = 0;
  const userRoom = getRoomAt(userAvatar.x, userAvatar.y);

  INITIAL_COLLEAGUES.forEach((col) => {
    const colRoom = getRoomAt(col.x, col.y);
    const isIsolatedUser = userRoom && (userRoom.zoneType === "meeting" || userRoom.zoneType === "focus");
    const isIsolatedCol = colRoom && (colRoom.zoneType === "meeting" || colRoom.zoneType === "focus");

    if (isIsolatedUser || isIsolatedCol) {
      if (userRoom && colRoom && userRoom.id === colRoom.id) {
        nearbyCount++;
      }
    } else {
      const dist = Math.hypot(userAvatar.x - col.x, userAvatar.y - col.y);
      if (dist <= userAvatar.audioRange) {
        nearbyCount++;
      }
    }
  });

  const countBadge = document.getElementById("proximityNearbyCount");
  countBadge.textContent = `${nearbyCount} rekan terhubung`;
  countBadge.style.color = nearbyCount > 0 ? "var(--accent-emerald)" : "var(--text-secondary)";
}

let simTick = 0;
function updateColleagues() {
  simTick += 0.02;
  waterRippleTick += 0.04;

  INITIAL_COLLEAGUES.forEach((col, idx) => {
    col.displayX = col.x + Math.sin(simTick + idx * 2) * 1.5;
    col.displayY = col.y + Math.cos(simTick + idx * 2) * 1.5;
  });

  // Update Qi particles flow towards center
  qiParticles.forEach((p) => {
    p.y += p.speedY;
    p.x += Math.sin(p.y * 0.02) * 1.2;
    if (p.y > OFFICE_MAP.height - 40) {
      p.y = 60;
      p.x = 650 + Math.random() * 140;
    }
  });
}

function animationLoop() {
  updateAvatarPhysics();
  updateColleagues();
  renderCanvas();
  requestAnimationFrame(animationLoop);
}

// Main Canvas Renderer
function renderCanvas() {
  const rect = canvasWrapper.getBoundingClientRect();
  ctx.save();
  ctx.clearRect(0, 0, rect.width, rect.height);

  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // 1. Draw Background Grid & Floor Base
  drawFloorBase();

  // 2. If Feng Shui mode: Draw Bagua Compass & Sectors Overlay Background
  if (viewMode === "fengshui") {
    drawBaguaSectorsBackground();
  }

  // 3. Draw Rooms & Architectural Partitions (with rounded anti-Sha-Qi edges)
  OFFICE_MAP.rooms.forEach((room) => {
    drawRoom(room);
  });

  // 4. Draw Doors & Entrances
  OFFICE_MAP.rooms.forEach((room) => {
    if (room.door) drawDoor(room.door, room);
  });

  // 5. Draw Furniture & Fixtures
  OFFICE_MAP.rooms.forEach((room) => {
    drawFurniture(room);
  });

  // 6. Draw Feng Shui Qi Circulation Lines & Particles
  if (viewMode === "fengshui") {
    drawQiCirculationStream();
  }

  // 7. Draw Acoustic Radar (if Radar Mode)
  if (viewMode === "radar") {
    drawAcousticRadarHeatmap();
  }

  // 8. Draw Colleagues
  INITIAL_COLLEAGUES.forEach((col) => {
    drawColleague(col);
  });

  // 9. Draw User Avatar with Spatial Proximity Halo
  drawUserAvatar();

  // 10. Draw CAD Blueprint Annotations (if Blueprint Mode)
  if (viewMode === "blueprint") {
    drawBlueprintAnnotations();
  }

  ctx.restore();
}

function drawFloorBase() {
  const w = OFFICE_MAP.width;
  const h = OFFICE_MAP.height;

  if (viewMode === "blueprint") {
    ctx.fillStyle = "#071322";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(14, 165, 233, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 20) {
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += 20) {
      ctx.moveTo(0, y); ctx.lineTo(w, y);
    }
    ctx.stroke();
  } else if (viewMode === "fengshui") {
    ctx.fillStyle = "#060a12";
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.fillStyle = "#080d1a";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 40) {
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += 40) {
      ctx.moveTo(0, y); ctx.lineTo(w, y);
    }
    ctx.stroke();
  }

  // Outer Building Boundary Wall with rounded corners (No Sha Qi)
  ctx.strokeStyle = viewMode === "blueprint" ? "#38bdf8" : viewMode === "fengshui" ? "#fbbf24" : "#1e293b";
  ctx.lineWidth = 8;
  roundRect(ctx, 4, 4, w - 8, h - 8, 24, false, true);
}

// Bagua Sectors Background in Feng Shui Mode
function drawBaguaSectorsBackground() {
  ctx.save();

  // Draw 8 Compass Sector Lines from Center (720, 460)
  const cx = 720;
  const cy = 460;

  // Center Tai Qi Circle
  ctx.beginPath();
  ctx.arc(cx, cy, 180, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(251, 191, 36, 0.35)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Compass Cardinal Labels
  ctx.font = "bold 13px 'Inter', sans-serif";
  ctx.textAlign = "center";

  ctx.fillStyle = "#38bdf8";
  ctx.fillText("▲ UTARA (KAN - AIR) — MULUT QI KARIR", cx, 28);

  ctx.fillStyle = "#ef4444";
  ctx.fillText("▼ SELATAN (LI - API) — REPUTASI & ALL-HANDS", cx, 928);

  ctx.fillStyle = "#10b981";
  ctx.fillText("▶ TIMUR (ZHEN - KAYU) — INOVASI", 1320, cy);

  ctx.fillStyle = "#a855f7";
  ctx.fillText("◀ BARAT (DUI - LOGAM) — KREATIF", 120, cy);

  ctx.restore();
}

// Room Rendering with Anti-Sha-Qi rounded architectural corners
function drawRoom(room) {
  const isSelected = selectedRoom && selectedRoom.id === room.id;
  const isHovered = hoveredRoom && hoveredRoom.id === room.id;
  const cornerRadius = 16; // Anti-Sha Qi smooth curves

  if (viewMode === "blueprint") {
    ctx.fillStyle = isSelected ? "rgba(56, 189, 248, 0.15)" : "rgba(15, 23, 42, 0.8)";
    roundRect(ctx, room.x, room.y, room.w, room.h, cornerRadius, true, false);

    ctx.strokeStyle = isSelected ? "#06b6d4" : isHovered ? "#38bdf8" : "rgba(56, 189, 248, 0.7)";
    ctx.lineWidth = 3;
    roundRect(ctx, room.x, room.y, room.w, room.h, cornerRadius, false, true);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.fillText(room.blueprintCode, room.x + 14, room.y + 24);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.fillText(`${room.area} m² | ${room.baguaSector}`, room.x + 14, room.y + 38);
  } else if (viewMode === "fengshui") {
    // Feng Shui Mode: Highlights element colors and Bagua trigram badges
    ctx.fillStyle = isSelected ? "rgba(251, 191, 36, 0.28)" : room.color;
    roundRect(ctx, room.x, room.y, room.w, room.h, cornerRadius, true, false);

    ctx.strokeStyle = isSelected ? "#fbbf24" : room.tagColor;
    ctx.lineWidth = isSelected ? 3.5 : 2;
    roundRect(ctx, room.x, room.y, room.w, room.h, cornerRadius, false, true);

    // Bagua Element Trigram Tag
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px 'Inter', sans-serif";
    ctx.fillText(room.name, room.x + 16, room.y + 26);

    ctx.fillStyle = room.tagColor;
    ctx.font = "bold 10px 'Inter', sans-serif";
    ctx.fillText(`☯ ${room.baguaSector} • ${room.qiQuality}`, room.x + 16, room.y + 42);
  } else {
    // Visual Modern 2.5D Mode
    ctx.fillStyle = isSelected
      ? "rgba(59, 130, 246, 0.24)"
      : isHovered
      ? "rgba(255, 255, 255, 0.08)"
      : room.color;
    roundRect(ctx, room.x, room.y, room.w, room.h, cornerRadius, true, false);

    ctx.strokeStyle = isSelected
      ? "#3b82f6"
      : isHovered
      ? "#60a5fa"
      : "rgba(148, 163, 184, 0.25)";
    ctx.lineWidth = isSelected ? 3.5 : 2;
    roundRect(ctx, room.x, room.y, room.w, room.h, cornerRadius, false, true);

    // Label
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 13px 'Inter', sans-serif";
    ctx.fillText(room.name, room.x + 16, room.y + 26);

    ctx.fillStyle = room.tagColor || "#94a3b8";
    ctx.font = "600 10px 'Inter', sans-serif";
    ctx.fillText(`● ${room.tag}`, room.x + 16, room.y + 42);
  }
}

function drawDoor(door, room) {
  ctx.save();
  ctx.fillStyle = "#080d1a";
  ctx.fillRect(door.x - 2, door.y - 2, door.w + 4, door.h + 4);

  if (viewMode === "blueprint") {
    ctx.strokeStyle = "#06b6d4";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(door.x, door.y, 25, 0, Math.PI / 2);
    ctx.stroke();
  } else {
    // Soft curved sliding glass entry
    ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
    roundRect(ctx, door.x, door.y, door.w || 6, door.h || 6, 3, true, false);
  }
  ctx.restore();
}

function drawFurniture(room) {
  if (!room.furniture) return;

  room.furniture.forEach((f) => {
    ctx.save();
    if (f.type === "water-fountain") {
      // Cascading curved fountain at North Entrance (Water Element)
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(2, 132, 199, 0.4)";
      ctx.fill();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Ripples
      const rip = (waterRippleTick % 1) * f.r;
      ctx.beginPath();
      ctx.arc(f.x, f.y, rip, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(56, 189, 248, ${1 - rip / f.r})`;
      ctx.stroke();

      ctx.fillStyle = "#e0f2fe";
      ctx.font = "bold 8px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🌊 AIR MANCUR", f.x, f.y + 3);
    } else if (f.type === "curved-reception-desk") {
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      roundRect(ctx, f.x, f.y, f.w, f.h, 20, true, true);
      ctx.fillStyle = "#7dd3fc";
      ctx.font = "bold 9px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("RESEPSIONIS RAMAH", f.x + f.w / 2, f.y + 24);
    } else if (f.type === "conference-table") {
      // Rounded executive table (North-West Qian Metal)
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2;
      roundRect(ctx, f.x, f.y, f.w, f.h, 30, true, true);

      // Chairs
      const chairCount = f.seats || 12;
      const spacing = (f.w - 40) / (chairCount / 2);
      ctx.fillStyle = "#64748b";
      for (let i = 0; i < chairCount / 2; i++) {
        roundRect(ctx, f.x + 20 + i * spacing, f.y - 12, 18, 8, 3, true, false);
        roundRect(ctx, f.x + 20 + i * spacing, f.y + f.h + 4, 18, 8, 3, true, false);
      }
    } else if (f.type === "command-chair") {
      // CEO Commanding Position (solid wall back)
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(f.x, f.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 8px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("KOMANDO", f.x, f.y + 3);
    } else if (f.type === "wealth-table") {
      // Jade Wealth Table (South-East Xun)
      ctx.fillStyle = "#14532d";
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2;
      roundRect(ctx, f.x, f.y, f.w, f.h, 24, true, true);
      ctx.fillStyle = "#fef08a";
      ctx.font = "bold 9px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("MEJA STRATEGI KEMAKMURAN", f.x + f.w / 2, f.y + f.h / 2 + 3);
    } else if (f.type === "jade-plants") {
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = "#16a34a";
      ctx.fill();
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (f.type === "round-table") {
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (f.type === "koi-pond") {
      // Center Tai Qi Koi Pond
      ctx.fillStyle = "rgba(14, 165, 233, 0.25)";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      roundRect(ctx, f.x, f.y, f.w, f.h, 24, true, true);
      ctx.fillStyle = "#7dd3fc";
      ctx.font = "bold 9px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("KOLAM KOI TAI QI ☯", f.x + f.w / 2, f.y + f.h / 2 + 3);
    } else if (f.type === "stage") {
      ctx.fillStyle = "#450a0a";
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      roundRect(ctx, f.x, f.y, f.w, f.h, 16, true, true);
      ctx.fillStyle = "#fca5a5";
      ctx.font = "bold 10px 'Inter', sans-serif";
      ctx.fillText("PANGGUNG REPUTASI NASIONAL (API LI)", f.x + 18, f.y + 24);
    } else if (f.type === "desk-island") {
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1.5;
      roundRect(ctx, f.x, f.y, f.w, f.h, 12, true, true);
      ctx.fillStyle = "#86efac";
      ctx.font = "600 9px 'Inter', sans-serif";
      ctx.fillText(f.team, f.x + 10, f.y + 16);
    } else if (f.type === "plant") {
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = "#059669";
      ctx.fill();
    } else if (f.type === "bookshelf") {
      ctx.fillStyle = "#451a03";
      roundRect(ctx, f.x, f.y, f.w, f.h, 6, true, false);
      ctx.fillStyle = "#fde68a";
      ctx.font = "bold 8px 'Inter', sans-serif";
      ctx.fillText("ARSIP PENGETAHUAN & RISET GEN", f.x + 12, f.y + 12);
    } else if (f.type === "coffee-bar") {
      ctx.fillStyle = "#332219";
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 2;
      roundRect(ctx, f.x, f.y, f.w, f.h, 14, true, true);
      ctx.fillStyle = "#fdba74";
      ctx.font = "bold 9px 'Inter', sans-serif";
      ctx.fillText("☕ BARISTA & TEH HERBAL", f.x + 12, f.y + 24);
    } else if (f.type === "curved-sofa") {
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI);
      ctx.fillStyle = "#7c2d12";
      ctx.fill();
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
  });
}

// Draw Animated Qi Circulation Streams in Feng Shui Mode
function drawQiCirculationStream() {
  ctx.save();
  qiParticles.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  });

  // Flowing Curved Ribbon of Qi connecting Entrance -> Center Atrium -> Wings
  ctx.strokeStyle = "rgba(251, 191, 36, 0.25)";
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 8]);
  ctx.beginPath();
  // North entrance down to Center
  ctx.moveTo(720, 200);
  ctx.bezierCurveTo(720, 280, 680, 320, 720, 460);
  // Center to West
  ctx.bezierCurveTo(600, 460, 480, 460, 260, 460);
  ctx.moveTo(720, 460);
  // Center to East
  ctx.bezierCurveTo(840, 460, 960, 460, 1180, 460);
  ctx.moveTo(720, 460);
  // Center to South
  ctx.bezierCurveTo(720, 580, 720, 640, 720, 720);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// Spatial Audio Radar Heatmap
function drawAcousticRadarHeatmap() {
  ctx.save();
  OFFICE_MAP.rooms.forEach((room) => {
    if (room.zoneType === "meeting" || room.zoneType === "focus") {
      ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      roundRect(ctx, room.x - 3, room.y - 3, room.w + 6, room.h + 6, 18, false, true);
      ctx.setLineDash([]);
    }
  });

  INITIAL_COLLEAGUES.forEach((col) => {
    if (col.status !== "focus") {
      const grad = ctx.createRadialGradient(col.x, col.y, 10, col.x, col.y, 80);
      grad.addColorStop(0, "rgba(59, 130, 246, 0.2)");
      grad.addColorStop(1, "rgba(59, 130, 246, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(col.x, col.y, 80, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.restore();
}

function drawUserAvatar() {
  ctx.save();

  const grad = ctx.createRadialGradient(
    userAvatar.x,
    userAvatar.y,
    15,
    userAvatar.x,
    userAvatar.y,
    userAvatar.audioRange
  );
  grad.addColorStop(0, "rgba(99, 102, 241, 0.25)");
  grad.addColorStop(0.7, "rgba(6, 182, 212, 0.12)");
  grad.addColorStop(1, "rgba(6, 182, 212, 0)");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(userAvatar.x, userAvatar.y, userAvatar.audioRange, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(userAvatar.x, userAvatar.y, userAvatar.audioRange, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Avatar body
  ctx.beginPath();
  ctx.arc(userAvatar.x, userAvatar.y, userAvatar.radius, 0, Math.PI * 2);
  ctx.fillStyle = userAvatar.color;
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Face direction
  const angle = Math.atan2(userAvatar.targetY - userAvatar.y, userAvatar.targetX - userAvatar.x);
  ctx.beginPath();
  ctx.arc(
    userAvatar.x + Math.cos(angle) * userAvatar.radius,
    userAvatar.y + Math.sin(angle) * userAvatar.radius,
    4,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = "#38bdf8";
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 11px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Anda (You)", userAvatar.x, userAvatar.y - 20);

  const statusColors = {
    available: "#10b981",
    meeting: "#8b5cf6",
    focus: "#ef4444",
    coffee: "#f59e0b",
    away: "#94a3b8"
  };
  ctx.beginPath();
  ctx.arc(userAvatar.x + 36, userAvatar.y - 23, 4, 0, Math.PI * 2);
  ctx.fillStyle = statusColors[userAvatar.status] || "#10b981";
  ctx.fill();

  ctx.restore();
}

function drawColleague(col) {
  ctx.save();
  const posX = col.displayX || col.x;
  const posY = col.displayY || col.y;

  ctx.beginPath();
  ctx.arc(posX, posY, 12, 0, Math.PI * 2);
  ctx.fillStyle = col.color || "#38bdf8";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const initials = col.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 9px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initials, posX, posY);

  ctx.font = "500 10px 'Inter', sans-serif";
  ctx.fillText(col.name.split(" ")[0], posX, posY + 20);

  ctx.restore();
}

function drawBlueprintAnnotations() {
  ctx.save();
  ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
  ctx.fillStyle = "#38bdf8";
  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.lineWidth = 1;

  const topY = 20;
  ctx.beginPath();
  ctx.moveTo(40, topY);
  ctx.lineTo(1400, topY);
  ctx.moveTo(40, topY - 5);
  ctx.lineTo(40, topY + 5);
  ctx.moveTo(1400, topY - 5);
  ctx.lineTo(1400, topY + 5);
  ctx.stroke();
  ctx.fillText("DIMENSI TOTAL GEDUNG: 48.00 METER", 620, topY - 6);
  ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  if (typeof radius === "number") {
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  } else {
    radius = Object.assign({ tl: 0, tr: 0, br: 0, bl: 0 }, radius);
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function renderRoomQuickList() {
  const container = document.getElementById("roomQuickList");
  container.innerHTML = "";

  OFFICE_MAP.rooms.forEach((room) => {
    const item = document.createElement("div");
    item.className = "room-item";
    item.dataset.roomId = room.id;

    const count = INITIAL_COLLEAGUES.filter((c) => c.room === room.id).length;

    item.innerHTML = `
      <div class="room-item-info">
        <div class="room-color-tag" style="background: ${room.tagColor || '#3b82f6'};"></div>
        <div>
          <div class="room-name">${room.name}</div>
          <div class="room-type">${room.baguaSector} • ${room.area} m²</div>
        </div>
      </div>
      <div class="room-badge">${count} online</div>
    `;

    item.addEventListener("click", () => {
      openRoomDetails(room);
      centerCameraOn(room.x + room.w / 2, room.y + room.h / 2);
    });

    container.appendChild(item);
  });
}

function renderColleaguesList() {
  const container = document.getElementById("colleaguesList");
  container.innerHTML = "";

  INITIAL_COLLEAGUES.slice(0, 5).forEach((col) => {
    const room = OFFICE_MAP.rooms.find((r) => r.id === col.room);
    const card = document.createElement("div");
    card.className = "member-card";
    card.style.cursor = "pointer";
    card.title = "Klik untuk teleport ke dekat rekan ini";

    card.innerHTML = `
      <div class="member-info">
        <div class="member-avatar" style="background: ${col.color};">
          ${col.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        <div>
          <div class="member-name">${col.name}</div>
          <div class="member-role">${col.role} • <span style="color: var(--accent-cyan);">${room ? room.name.split(" ")[0] : 'Hall'}</span></div>
        </div>
      </div>
      <div style="font-size: 0.72rem; color: var(--text-muted);">
        Teleport ➔
      </div>
    `;

    card.addEventListener("click", () => {
      userAvatar.targetX = col.x + 25;
      userAvatar.targetY = col.y;
      centerCameraOn(col.x, col.y);
    });

    container.appendChild(card);
  });
}

function openRoomDetails(room) {
  selectedRoom = room;

  document.querySelectorAll(".room-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.roomId === room.id);
  });

  const drawer = document.getElementById("sidebarRight");
  drawer.classList.remove("hidden");

  document.getElementById("drawerTitle").textContent = room.name;
  document.getElementById("drawerSubtitle").textContent = room.subtitle;
  document.getElementById("drawerTag").textContent = room.tag;
  document.getElementById("drawerTag").style.background = `${room.tagColor}25`;
  document.getElementById("drawerTag").style.color = room.tagColor;

  document.getElementById("drawerCapacity").textContent = `${room.capacity} Avatar`;
  document.getElementById("drawerArea").textContent = `${room.area} m²`;
  document.getElementById("drawerAcoustic").textContent = room.acousticRating;
  document.getElementById("drawerQiQuality").textContent = room.qiQuality;
  document.getElementById("drawerFengShuiText").textContent = room.fengshuiSummary;

  const amenitiesContainer = document.getElementById("drawerAmenities");
  amenitiesContainer.innerHTML = "";
  room.amenities.forEach((item) => {
    const chip = document.createElement("div");
    chip.className = "amenity-chip";
    chip.innerHTML = `<span>☯</span><span>${item}</span>`;
    amenitiesContainer.appendChild(chip);
  });

  const occupants = INITIAL_COLLEAGUES.filter((c) => c.room === room.id);
  const occList = document.getElementById("drawerOccupantsList");
  document.getElementById("drawerOccupantCount").textContent = `${occupants.length} Orang`;
  occList.innerHTML = "";

  if (occupants.length === 0) {
    occList.innerHTML = `<div style="font-size: 0.75rem; color: var(--text-muted); padding: 8px;">Tidak ada rekan di ruangan ini saat ini. Ruangan bebas digunakan.</div>`;
  } else {
    occupants.forEach((col) => {
      const card = document.createElement("div");
      card.className = "member-card";
      card.innerHTML = `
        <div class="member-info">
          <div class="member-avatar" style="background: ${col.color};">
            ${col.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div>
            <div class="member-name">${col.name}</div>
            <div class="member-role">${col.role}</div>
          </div>
        </div>
        <span style="font-size: 0.7rem; color: var(--accent-emerald);">● Aktif Harmonis</span>
      `;
      occList.appendChild(card);
    });
  }
}

function closeDrawer() {
  document.getElementById("sidebarRight").classList.add("hidden");
  selectedRoom = null;
  document.querySelectorAll(".room-item").forEach((el) => el.classList.remove("active"));
}

function handleSearch(query) {
  if (!query) return;

  const matchedRoom = OFFICE_MAP.rooms.find(
    (r) =>
      r.name.toLowerCase().includes(query) ||
      r.baguaSector.toLowerCase().includes(query) ||
      r.element.toLowerCase().includes(query)
  );

  if (matchedRoom) {
    openRoomDetails(matchedRoom);
    centerCameraOn(matchedRoom.x + matchedRoom.w / 2, matchedRoom.y + matchedRoom.h / 2);
    return;
  }

  const matchedColleague = INITIAL_COLLEAGUES.find(
    (c) => c.name.toLowerCase().includes(query) || c.role.toLowerCase().includes(query)
  );

  if (matchedColleague) {
    centerCameraOn(matchedColleague.x, matchedColleague.y);
  }
}

function exportFloorplanPng() {
  const offscreen = document.createElement("canvas");
  offscreen.width = OFFICE_MAP.width;
  offscreen.height = OFFICE_MAP.height;
  const offCtx = offscreen.getContext("2d");

  const tempCtx = ctx;
  window.ctx = offCtx;

  offCtx.fillStyle = viewMode === "blueprint" ? "#071322" : "#060a12";
  offCtx.fillRect(0, 0, offscreen.width, offscreen.height);

  drawFloorBase();
  if (viewMode === "fengshui") drawBaguaSectorsBackground();
  OFFICE_MAP.rooms.forEach((r) => drawRoom(r));
  OFFICE_MAP.rooms.forEach((r) => { if (r.door) drawDoor(r.door, r); });
  OFFICE_MAP.rooms.forEach((r) => drawFurniture(r));
  if (viewMode === "fengshui") drawQiCirculationStream();
  if (viewMode === "radar") drawAcousticRadarHeatmap();
  INITIAL_COLLEAGUES.forEach((c) => drawColleague(c));
  drawUserAvatar();
  if (viewMode === "blueprint") drawBlueprintAnnotations();

  // Watermark
  offCtx.fillStyle = "#fbbf24";
  offCtx.font = "bold 14px 'Inter', sans-serif";
  offCtx.fillText("NEXUS VIRTUAL HQ — VERSI 4 (FENG SHUI HARMONY FLOOR PLAN)", 40, OFFICE_MAP.height - 20);

  window.ctx = tempCtx;

  const a = document.createElement("a");
  a.download = `Kantor_Virtual_Floorplan_V4_FengShui_${viewMode}.png`;
  a.href = offscreen.toDataURL("image/png");
  a.click();
}

window.addEventListener("DOMContentLoaded", init);
