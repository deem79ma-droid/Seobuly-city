// @v 2026101418

// ================= WORLD: LAYOUT =================
const LAND = 2;
const HM = { x0: -1700, z0: -1300, x1: 2500, z1: 1300, res: 4 };
HM.W = (HM.x1 - HM.x0) / HM.res + 1; HM.H = (HM.z1 - HM.z0) / HM.res + 1;
let hmData, roadDistF, grassMask;
const REGIONS = {
  plaza: { name: '이벤트광장', desc: '클럽과 카지노가 있는 중앙 공원', color: '#ff5fd8', cx: 0, cz: 0 },
  seoburi: { name: '서불리', desc: '메인 도시 · 마천루 중심가', color: '#4fc3ff', cx: 760, cz: 0 },
  jiolle: { name: '지올르', desc: '평화로운 공장 도시', color: '#7dff8a', cx: -240, cz: -620 },
  kaengjibe: { name: '캥지베', desc: '갱단이 지배하는 동네 · 위험', color: '#ff5a4f', cx: -240, cz: 610 },
  disanbay: { name: '디산베이', desc: '자연친화적인 시골 마을', color: '#ffd54f', cx: -1100, cz: 0 },
  simone: { name: '시모느 아일랜드', desc: '남동쪽 휴양 섬', color: '#4fffe0', cx: 2000, cz: 560 },
  sea: { name: '바다', desc: '', color: '#5aa0ff', cx: 0, cz: 0 },
};
// ---- 산 4개: 이름(한자) · 정상 위치. 시모느의 천해산이 가장 높다 ----
const MOUNTAINS = [
  { id: 'unryeong', n: '운령산', hj: '雲嶺山', d: '구름이 걸리는 디산베이 북쪽 큰 산 · 호수와 숲', x: -1330, z: -900, r: 330 },
  { id: 'songrim', n: '송림산', hj: '松林山', d: '소나무 숲이 덮인 디산베이 남쪽 완만한 산', x: -1350, z: 820, r: 240 },
  { id: 'mangseong', n: '망성산', hj: '望城山', d: '서불리 도심이 한눈에 내려다보이는 북쪽 산', x: 820, z: -935, r: 210 },
  { id: 'cheonhae', n: '천해산', hj: '天海山', d: '바다에서 솟은 시모느 아일랜드의 최고봉 · 서불리에서 가장 높은 산', x: 2290, z: 1030, r: 260 },
];
const ISLE2 = { x: 2290, z: 1030, r: 235 }; // 천해산이 있는 시모느 남동쪽 땅
function mountainAt(x, z) { let best = null, bd = 1e9; for (const M of MOUNTAINS) { const d = Math.hypot(x - M.x, z - M.z) / M.r; if (d < 1 && d < bd) { bd = d; best = M; } } return best; }
function regionAt(x, z) {
  if (Math.hypot(x - ISLE2.x, z - ISLE2.z) < ISLE2.r) return 'simone';
  if (((x - 2000) / 420) ** 2 + ((z - 560) / 510) ** 2 < 1) return 'simone';
  if (x > 1420) return 'sea';
  if (Math.abs(x) < 212 && Math.abs(z) < 212) return 'plaza';
  if (x >= 212) return 'seoburi';
  if (x < -720) return 'disanbay';
  return z < 0 ? 'jiolle' : 'kaengjibe';
}
// ---- 16개 구역 (지역을 잘게 나눈 행정구역) ----
const DISTRICTS = [
  { id: 1, name: '이벤트광장', region: 'plaza', cx: 0, cz: 0 },
  { id: 2, name: '서불리 북부 주거지', region: 'seoburi', cx: 480, cz: -440 },
  { id: 3, name: '서불리 금융가', region: 'seoburi', cx: 1000, cz: -440 },
  { id: 4, name: '서불리 다운타운', region: 'seoburi', cx: 760, cz: 0 },
  { id: 5, name: '서불리 남부 상가', region: 'seoburi', cx: 480, cz: 440 },
  { id: 6, name: '서불리 항구', region: 'seoburi', cx: 1120, cz: 440 },
  { id: 7, name: '지올르 서부 공단', region: 'jiolle', cx: -520, cz: -800 },
  { id: 8, name: '지올르 물류단지', region: 'jiolle', cx: -40, cz: -800 },
  { id: 9, name: '지올르 주택가', region: 'jiolle', cx: -360, cz: -360 },
  { id: 10, name: '캥지베 시장통', region: 'kaengjibe', cx: -360, cz: 360 },
  { id: 11, name: '레드 크루 구역', region: 'kaengjibe', cx: -520, cz: 800 },
  { id: 12, name: '블루 독스 구역', region: 'kaengjibe', cx: -40, cz: 800 },
  { id: 13, name: '디산베이 호숫가', region: 'disanbay', cx: -1050, cz: -560 },
  { id: 14, name: '디산베이 읍내', region: 'disanbay', cx: -1050, cz: 0 },
  { id: 15, name: '디산베이 목장', region: 'disanbay', cx: -1150, cz: 440 },
  { id: 16, name: '시모느 아일랜드', region: 'simone', cx: 2000, cz: 560 },
];
const DISTRICT_COLORS = ['#ff5fd8', '#4fc3ff', '#3fa8ff', '#7fd6ff', '#5fb0e8', '#2f8fdf', '#7dff8a', '#5fe070', '#a8ff9a', '#ff8a5a', '#ff4f4f', '#4f7bff', '#ffe27a', '#ffd54f', '#ffb84f', '#4fffe0'];
function districtAt(x, z) { // 1..16, 0 = 바다
  const r = regionAt(x, z);
  switch (r) {
    case 'plaza': return 1;
    case 'seoburi': return z < -200 ? (x < 760 ? 2 : 3) : z <= 200 ? 4 : (x < 760 ? 5 : 6);
    case 'jiolle': return z < -540 ? (x < -280 ? 7 : 8) : 9;
    case 'kaengjibe': return z > 540 ? (x < -280 ? 11 : 12) : 10;
    case 'disanbay': return z < -220 ? 13 : z <= 220 ? 14 : 15;
    case 'simone': return 16;
  }
  return 0;
}
// ---- road graph ----
const NODES = [], EDGES = []; const nodeIdx = new Map();
function rnode(x, z) { const k = Math.round(x) + ',' + Math.round(z); if (nodeIdx.has(k)) return nodeIdx.get(k); const n = { id: NODES.length, x, z, edges: [], light: false }; NODES.push(n); nodeIdx.set(k, n); return n; }
function redge(a, b, w, extra = {}) {
  if (a === b) return; for (const e of a.edges) { const E = EDGES[e]; if ((E.a === a.id && E.b === b.id) || (E.b === a.id && E.a === b.id)) return; }
  const e = Object.assign({ id: EDGES.length, a: a.id, b: b.id, w, len: Math.hypot(b.x - a.x, b.z - a.z) }, extra);
  e.axis = Math.abs(b.x - a.x) > Math.abs(b.z - a.z) ? 'x' : 'z';
  EDGES.push(e); a.edges.push(e.id); b.edges.push(e.id);
}
function rpath(pts, w, extra) { for (let i = 0; i < pts.length - 1; i++) redge(rnode(...pts[i]), rnode(...pts[i + 1]), w, extra); }
const GRIDS = [
  { region: 'seoburi', xs: [280, 400, 520, 640, 760, 880, 1000, 1120, 1240], zs: [-620, -440, -260, -130, 0, 130, 260, 440, 620], w: 14 },
  { region: 'jiolle', xs: [-680, -520, -360, -200, 0, 200], zs: [-980, -800, -620, -440, -260], w: 12 },
  { region: 'kaengjibe', xs: [-680, -520, -360, -200, 0, 200], zs: [260, 440, 620, 800, 960], w: 12 },
  { region: 'simone', xs: [1720, 1860, 2000, 2140, 2280], zs: [200, 320, 440, 560, 680, 800, 920], w: 11, clip: (x, z) => ((x - 2000) / 370) ** 2 + ((z - 560) / 450) ** 2 <= 1 },
];
function buildRoadGraph() {
  for (const g of GRIDS) {
    const ok = (x, z) => !g.clip || g.clip(x, z);
    for (const z of g.zs) for (let i = 0; i < g.xs.length - 1; i++) { const x1 = g.xs[i], x2 = g.xs[i + 1]; if (ok(x1, z) && ok(x2, z)) redge(rnode(x1, z), rnode(x2, z), g.w, { region: g.region }); }
    for (const x of g.xs) for (let j = 0; j < g.zs.length - 1; j++) { const z1 = g.zs[j], z2 = g.zs[j + 1]; if (ok(x, z1) && ok(x, z2)) redge(rnode(x, z1), rnode(x, z2), g.w, { region: g.region }); }
  }
  rpath([[-200, -200], [0, -200], [200, -200], [200, 0], [200, 200], [0, 200], [-200, 200], [-200, 0], [-200, -200]], 16, { region: 'plaza' });
  for (const x of [-200, 0, 200]) { rpath([[x, -200], [x, -260]], 12); rpath([[x, 200], [x, 260]], 12); }
  for (const z of [-620, -440, -260, 260, 440, 620]) rpath([[200, z], [280, z]], 12);
  rpath([[200, 0], [280, 0]], 16);
  rpath([[-200, 0], [-680, 0]], 16);
  rpath([[-680, -260], [-680, 0], [-680, 260]], 12);
  rpath([[-680, 0], [-1050, 0], [-1400, 0]], 14, { region: 'disanbay' });
  rpath([[-1050, -900], [-1050, -440], [-1050, 0], [-1050, 440], [-1050, 900]], 12, { region: 'disanbay' });
  rpath([[-1400, -440], [-1050, -440], [-680, -440]], 12, { region: 'disanbay' });
  rpath([[-1400, 440], [-1050, 440], [-680, 440]], 12, { region: 'disanbay' });
  rpath([[-1400, -440], [-1400, 0], [-1400, 440]], 12, { region: 'disanbay' });
  rpath([[1240, 440], [1720, 440]], 14, { bridge: true, region: 'sea' });
  for (const n of NODES) {
    const r = regionAt(n.x, n.z);
    if (n.edges.length >= 3 && (r === 'seoburi' || r === 'jiolle' || r === 'kaengjibe' || r === 'plaza')) n.light = true;
  }
}
// ---- flat zones (no hills) ----
const FLAT = [
  { a: [-1380, 0], b: [-720, 0], r: 75 }, { a: [-1050, -430], b: [-1050, 430], r: 75 },
  { a: [-1230, 220], b: [-1230, 220], r: 135 }, { a: [-860, -90], b: [-860, -90], r: 100 },
  { a: [-1230, -230], b: [-1230, -230], r: 80 },
];
const LAKE = { x: -1230, z: -660, r: 100 };
function deckY(x, z) {
  if (Math.abs(z - 440) > 9.5 || x < 1240 || x > 1720) return null;
  const t = clamp((x - 1300) / 350, 0, 1); return LAND + 0.06 + 11 * Math.sin(Math.PI * t);
}
function landF(x, z) {
  const n = fbm(x * 0.0032 + 11, z * 0.0032 - 7, 3) * 34;
  let qx = Math.abs(x + 50) - 1450 + 220, qz = Math.abs(z) - 1100 + 220;
  let sd = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - 220 + n;
  const l1 = smooth(30, -30, sd);
  const e = Math.hypot((x - 2000) / 400, (z - 560) / 490); const sdI = (e - 1) * 430 + fbm(x * 0.006, z * 0.006, 3) * 30;
  const l2 = smooth(25, -25, sdI);
  const l4 = smooth(25, -25, Math.hypot(x - ISLE2.x, z - ISLE2.z) - ISLE2.r + fbm(x * 0.008 + 3, z * 0.008, 3) * 40);
  return Math.max(l1, l2, l4);
}
function hillsAt(x, z) {
  const wW = smooth(-650, -820, x);
  let h = wW * (fbm(x * 0.0032, z * 0.0032, 5) * 0.5 + 0.55) * 48;
  h += wW * 210 * Math.exp(-((x + 1330) ** 2 + (z + 900) ** 2) / (2 * 230 * 230)); // 디산베이 북쪽 큰 산 (서불리산)
  h += wW * 70 * Math.exp(-((x + 1350) ** 2 + (z - 820) ** 2) / (2 * 170 * 170));
  // 시모느 아일랜드: 동쪽 언덕 + 북쪽 작은 봉우리
  h += 46 * Math.exp(-((x - 2140) ** 2 + (z - 850) ** 2) / (2 * 110 * 110));
  h += 24 * Math.exp(-((x - 1830) ** 2 + (z - 230) ** 2) / (2 * 80 * 80));
  // 천해산 (시모느 · 최고봉) · 망성산 (서불리 북쪽)
  { const d2 = (x - 2290) ** 2 + (z - 1030) ** 2; h += 330 * Math.exp(-d2 / (2 * 120 * 120)) + 40 * Math.exp(-d2 / (2 * 40 * 40)); h += (fbm(x * 0.012, z * 0.012, 3) * 0.5) * 30 * Math.exp(-d2 / (2 * 160 * 160)); }
  { const d2 = (x - 820) ** 2 + (z + 935) ** 2; h += 135 * Math.exp(-d2 / (2 * 115 * 115)) + (fbm(x * 0.01 + 7, z * 0.01, 3) * 0.5 + 0.3) * 25 * Math.exp(-d2 / (2 * 150 * 150)); }
  // 지올르 북쪽 · 캥지베 남쪽 해안 구릉
  const band = smooth(-760, -680, x) * smooth(300, 220, x);
  h += band * smooth(-990, -1060, z) * (fbm(x * 0.006 + 2, z * 0.006, 3) * 0.5 + 0.7) * 30;
  h += band * smooth(975, 1045, z) * (fbm(x * 0.006 - 4, z * 0.006 + 1, 3) * 0.5 + 0.7) * 24;
  return Math.max(0, h);
}
// 도로까지 함께 올라가는 완만한 기복 (디산베이 외곽 언덕길). 마을·농장·호수 주변은 평지 유지
function gradeAt(x, z) {
  const wW = smooth(-760, -900, x); if (wW <= 0) return 0;
  let g = (fbm(x * 0.0019 + 5, z * 0.0019 - 3, 3) * 0.5 + 0.5) * 20;
  g += 26 * Math.exp(-((x + 1330) ** 2 + (z + 900) ** 2) / (2 * 300 * 300));
  g += 12 * Math.exp(-((x + 1350) ** 2 + (z - 820) ** 2) / (2 * 260 * 260));
  for (const f of FLAT) g *= smooth(f.r + 10, f.r + 170, distSeg(x, z, f.a[0], f.a[1], f.b[0], f.b[1]));
  g *= smooth(LAKE.r + 25, LAKE.r + 170, Math.hypot(x - LAKE.x, z - LAKE.z));
  return Math.max(0, g) * wW;
}
// 해안까지의 대략적인 거리 (육지 안쪽 +). 모래사장 색칠용
function coastDist(x, z) {
  const qx = Math.abs(x + 50) - 1450 + 220, qz = Math.abs(z) - 1100 + 220;
  const sd = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - 220;
  const e = Math.hypot((x - 2000) / 400, (z - 560) / 490); const sdI = (e - 1) * 430;
  return -Math.min(sd, sdI, Math.hypot(x - ISLE2.x, z - ISLE2.z) - ISLE2.r);
}
function hmIdx(i, j) { return j * HM.W + i; }
function hmSample(arr, x, z) {
  const fx = clamp((x - HM.x0) / HM.res, 0, HM.W - 1.001), fz = clamp((z - HM.z0) / HM.res, 0, HM.H - 1.001);
  const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
  const a = arr[hmIdx(i, j)], b = arr[hmIdx(i + 1, j)], c = arr[hmIdx(i, j + 1)], d = arr[hmIdx(i + 1, j + 1)];
  return lerp(lerp(a, b, tx), lerp(c, d, tx), tz);
}
function terrainH(x, z) { return hmSample(hmData, x, z); }
function groundHeight(x, z, y) {
  const h = terrainH(x, z); const d = deckY(x, z);
  if (d !== null && (y === undefined || y > d - 2.2) && d > h) return d;
  return h;
}
function roadDistAt(x, z) { return hmSample(roadDistF, x, z); }
function isGrassAt(x, z) { const i = Math.round((x - HM.x0) / HM.res), j = Math.round((z - HM.z0) / HM.res); if (i < 0 || j < 0 || i >= HM.W || j >= HM.H) return false; return grassMask[hmIdx(i, j)] === 1; }

function buildHeightmap() {
  const N = HM.W * HM.H; hmData = new Float32Array(N); roadDistF = new Float32Array(N).fill(999); grassMask = new Uint8Array(N);
  const R = 80;
  for (const e of EDGES) {
    const a = NODES[e.a], b = NODES[e.b];
    const i0 = Math.max(0, Math.floor((Math.min(a.x, b.x) - R - HM.x0) / HM.res)), i1 = Math.min(HM.W - 1, Math.ceil((Math.max(a.x, b.x) + R - HM.x0) / HM.res));
    const j0 = Math.max(0, Math.floor((Math.min(a.z, b.z) - R - HM.z0) / HM.res)), j1 = Math.min(HM.H - 1, Math.ceil((Math.max(a.z, b.z) + R - HM.z0) / HM.res));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = HM.x0 + i * HM.res, z = HM.z0 + j * HM.res; const d = distSeg(x, z, a.x, a.z, b.x, b.z) - e.w / 2;
      const k = hmIdx(i, j); if (d < roadDistF[k]) roadDistF[k] = d;
    }
  }
  for (let j = 0; j < HM.H; j++) for (let i = 0; i < HM.W; i++) {
    const x = HM.x0 + i * HM.res, z = HM.z0 + j * HM.res, k = hmIdx(i, j);
    const land = landF(x, z);
    const l3 = land * land * land;
    let h = lerp(-9, LAND, land) + gradeAt(x, z) * l3;
    let mask = smooth(12, 70, roadDistF[k]);
    for (const f of FLAT) { const d = distSeg(x, z, f.a[0], f.a[1], f.b[0], f.b[1]); mask *= smooth(f.r, f.r + 45, d); }
    h += (hillsAt(x, z) + fbm(x * 0.02, z * 0.02, 2) * 0.8 * smooth(-650, -760, x)) * mask * l3;
    const dl = Math.hypot(x - LAKE.x, z - LAKE.z); h = lerp(h, -3.5, smooth(LAKE.r + 30, LAKE.r - 15, dl));
    hmData[k] = h;
  }
}

// ================= TEXTURES =================
let ANISO = 8;
function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h);
  const t = new THREE.CanvasTexture(c);
  if (opts.repeat !== false) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = ANISO; return t;
}
function noiseFill(x, w, h, base, amt, seed = 1) {
  const id = x.createImageData(w, h); const r = mulberry32(seed);
  for (let i = 0; i < w * h; i++) { const n = (r() - 0.5) * amt; id.data[i * 4] = clamp(base[0] + n, 0, 255); id.data[i * 4 + 1] = clamp(base[1] + n, 0, 255); id.data[i * 4 + 2] = clamp(base[2] + n, 0, 255); id.data[i * 4 + 3] = 255; }
  x.putImageData(id, 0, 0);
}
function makeFacade(kind, seed) {
  const S = 512, C = 4, cw = S / C; const r = mulberry32(seed);
  const em = document.createElement('canvas'); em.width = em.height = S; const ex = em.getContext('2d'); ex.fillStyle = '#000'; ex.fillRect(0, 0, S, S);
  const map = canvasTex(S, S, (x) => {
    const cfg = {
      glass: { wall: [205, 212, 220], lit: 0.32 }, office: { wall: [214, 208, 198], lit: 0.3 }, brick: { wall: [180, 165, 155], lit: 0.25 },
      apt: { wall: [232, 226, 214], lit: 0.4 }, house: { wall: [238, 232, 220], lit: 0.3 }, shop: { wall: [60, 60, 66], lit: 0.85 }, metal: { wall: [196, 198, 200], lit: 0 },
    }[kind];
    noiseFill(x, S, S, cfg.wall, kind === 'brick' ? 10 : 14, seed);
    if (kind === 'brick') {
      for (let y = 0; y < S; y += 8) { x.fillStyle = 'rgba(70,60,55,.35)'; x.fillRect(0, y, S, 1.5); for (let xx = ((y / 8) % 2) * 9; xx < S; xx += 18) x.fillRect(xx, y, 1.5, 8); }
      for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${r() * 60 + 120},${r() * 40 + 60},${r() * 30 + 50},.18)`; x.fillRect(r() * S, r() * S, 16, 7); }
    }
    if (kind === 'metal') { for (let xx = 0; xx < S; xx += 8) { const g = x.createLinearGradient(xx, 0, xx + 8, 0); g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(.5, 'rgba(0,0,0,.18)'); g.addColorStop(1, 'rgba(255,255,255,.1)'); x.fillStyle = g; x.fillRect(xx, 0, 8, S); } }
    for (let j = 0; j < C; j++) for (let i = 0; i < C; i++) {
      const X = i * cw, Y = j * cw; const lit = r() < cfg.lit;
      const warm = r() < 0.75 ? `rgba(255,${200 + r() * 40 | 0},${130 + r() * 60 | 0},1)` : 'rgba(200,225,255,1)';
      const glassG = (wx, wy, ww, wh) => { const g = x.createLinearGradient(wx, wy, wx + ww * 0.6, wy + wh); g.addColorStop(0, '#5d7896'); g.addColorStop(.45, '#2a3a50'); g.addColorStop(.5, '#7792ad'); g.addColorStop(1, '#1d2838'); x.fillStyle = g; x.fillRect(wx, wy, ww, wh); };
      const lite = (wx, wy, ww, wh, a = 1) => { if (!lit) return; ex.globalAlpha = a * (0.6 + r() * 0.4); ex.fillStyle = warm; ex.fillRect(wx, wy, ww, wh); ex.globalAlpha = 1; };
      if (kind === 'glass') {
        glassG(X + 3, Y + 6, cw - 6, cw - 10); x.fillStyle = 'rgba(30,36,46,.9)'; x.fillRect(X, Y + cw - 6, cw, 6);
        x.fillStyle = 'rgba(210,220,230,.5)'; x.fillRect(X + cw / 2 - 1, Y + 6, 2, cw - 12); lite(X + 3, Y + 6, cw - 6, cw - 12);
      } else if (kind === 'office') {
        glassG(X, Y + cw * 0.28, cw, cw * 0.5); x.fillStyle = 'rgba(40,40,40,.6)'; for (let k = 1; k < 3; k++) x.fillRect(X + k * cw / 3, Y + cw * 0.28, 2, cw * 0.5); lite(X, Y + cw * 0.28, cw, cw * 0.5);
      } else if (kind === 'brick') {
        x.fillStyle = '#e8e2d6'; x.fillRect(X + cw * 0.28 - 4, Y + cw * 0.22 - 4, cw * 0.44 + 8, cw * 0.52 + 8); glassG(X + cw * 0.28, Y + cw * 0.22, cw * 0.44, cw * 0.52);
        x.fillStyle = '#e8e2d6'; x.fillRect(X + cw * 0.5 - 1.5, Y + cw * 0.22, 3, cw * 0.52); lite(X + cw * 0.28, Y + cw * 0.22, cw * 0.44, cw * 0.52);
        x.fillStyle = 'rgba(90,80,70,.8)'; x.fillRect(X + cw * 0.26, Y + cw * 0.74, cw * 0.48, 5);
      } else if (kind === 'apt') {
        glassG(X + 10, Y + 18, cw - 20, cw * 0.5); lite(X + 10, Y + 18, cw - 20, cw * 0.5);
        x.fillStyle = 'rgba(120,120,120,.9)'; x.fillRect(X + 4, Y + cw * 0.5 + 18, cw - 8, 4); for (let k = 0; k < 8; k++) x.fillRect(X + 6 + k * (cw - 12) / 7, Y + cw * 0.5 + 18, 2, cw * 0.28);
        x.fillStyle = 'rgba(160,155,148,.9)'; x.fillRect(X, Y + cw * 0.5 + 18 + cw * 0.28, cw, 5);
      } else if (kind === 'house') {
        const wx = X + cw * 0.3, wy = Y + cw * 0.25, ww = cw * 0.4, wh = cw * 0.45;
        x.fillStyle = '#5a3d2a'; x.fillRect(wx - 12, wy, 10, wh); x.fillRect(wx + ww + 2, wy, 10, wh);
        x.fillStyle = '#fff'; x.fillRect(wx - 3, wy - 3, ww + 6, wh + 6); glassG(wx, wy, ww, wh); x.fillStyle = '#fff'; x.fillRect(wx + ww / 2 - 1.5, wy, 3, wh); x.fillRect(wx, wy + wh / 2 - 1.5, ww, 3); lite(wx, wy, ww, wh);
      } else if (kind === 'shop') {
        const hue = (r() * 360) | 0; x.fillStyle = `hsl(${hue},70%,45%)`; x.fillRect(X, Y, cw, cw * 0.22);
        x.fillStyle = 'rgba(255,255,255,.85)'; x.font = 'bold 18px sans-serif'; x.fillText(['CAFE', '마트', '편의점', 'BAR', '치킨', '빵집', '약국', '꽃집', 'SHOP', '분식', '은행', '부동산'][(r() * 12) | 0], X + 8, Y + 22);
        glassG(X + 4, Y + cw * 0.26, cw - 8, cw * 0.72); x.fillStyle = '#222'; x.fillRect(X + cw / 2 - 2, Y + cw * 0.26, 4, cw * 0.72);
        ex.fillStyle = `hsl(${hue},80%,55%)`; ex.globalAlpha = 0.7; ex.fillRect(X, Y, cw, cw * 0.22); ex.globalAlpha = 1;
        if (r() < cfg.lit) { ex.fillStyle = '#ffe2b0'; ex.globalAlpha = 0.75; ex.fillRect(X + 4, Y + cw * 0.26, cw - 8, cw * 0.72); ex.globalAlpha = 1; }
      } else if (kind === 'metal') {
        if (j === 0) { glassG(X, Y + 20, cw, 22); }
      }
    }
    // keep pixel (0,0) region neutral for roofs
    x.fillStyle = `rgb(${cfg.wall.join(',')})`; x.fillRect(0, 0, 4, 4);
  });
  const emis = new THREE.CanvasTexture(em); emis.wrapS = emis.wrapT = THREE.RepeatWrapping; emis.colorSpace = THREE.SRGBColorSpace; emis.anisotropy = ANISO;
  return { map, emis };
}
const MAT = {}; const BAY = { glass: [3, 3.6], office: [3.4, 3.6], brick: [3, 3.2], apt: [4, 3], house: [3, 3], shop: [5, 4.4], metal: [4, 5] };
function buildMaterials() {
  let s = 11;
  for (const k of ['glass', 'office', 'brick', 'apt', 'house', 'shop', 'metal']) {
    const t = makeFacade(k, s += 97);
    MAT[k] = new THREE.MeshStandardMaterial({ map: t.map, emissiveMap: t.emis, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0, vertexColors: true, roughness: k === 'glass' ? 0.25 : 0.85, metalness: k === 'glass' ? 0.55 : k === 'metal' ? 0.5 : 0.05 });
    MAT[k].userData.win = true;
  }
  MAT.plain = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05 });
  MAT.metalPlain = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.7 });
  MAT.roof = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, map: canvasTex(256, 256, (x, w, h) => { noiseFill(x, w, h, [200, 196, 190], 20, 5); for (let y = 0; y < h; y += 16) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, y, w, 3); for (let i = ((y / 16) % 2) * 16; i < w; i += 32) x.fillRect(i, y, 2, 16); } }) });
  MAT.concrete = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, map: canvasTex(256, 256, (x, w, h) => { noiseFill(x, w, h, [205, 203, 198], 18, 9); x.strokeStyle = 'rgba(80,80,80,.45)'; x.lineWidth = 2; for (let i = 0; i <= w; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); } }) });
  const asph = (lines) => canvasTex(256, 512, (x, w, h) => {
    noiseFill(x, w, h, [62, 63, 66], 26, 3);
    for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(${Math.random() < .5 ? 0 : 255},${Math.random() < .5 ? 0 : 255},255,.04)`; x.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
    x.fillStyle = 'rgba(30,30,32,.25)'; x.fillRect(w * 0.18, 0, w * 0.12, h); x.fillRect(w * 0.7, 0, w * 0.12, h);
    if (!lines) return;
    x.fillStyle = '#e8e8e2'; x.fillRect(w * 0.035, 0, 5, h); x.fillRect(w * 0.965 - 5, 0, 5, h);
    if (lines === 'main') { x.fillStyle = '#f0c030'; x.fillRect(w / 2 - 7, 0, 5, h); x.fillRect(w / 2 + 2, 0, 5, h); x.fillStyle = '#e8e8e2'; for (let y = 0; y < h; y += 128) { x.fillRect(w * 0.27, y, 4, 64); x.fillRect(w * 0.73 - 4, y, 4, 64); } }
    else { x.fillStyle = '#e8e8e2'; for (let y = 0; y < h; y += 128) x.fillRect(w / 2 - 2, y, 4, 64); }
  });
  const rm = (t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.92, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  MAT.roadMain = rm(asph('main')); MAT.roadLocal = rm(asph('local')); MAT.roadPlain = rm(asph(null));
  MAT.white = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  MAT.glow = new THREE.MeshBasicMaterial({ vertexColors: true });
  MAT.glassPlain = new THREE.MeshStandardMaterial({ color: 0x9fc4e0, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.55 });
  MAT.poolWater = new THREE.MeshStandardMaterial({ color: 0x2ec5e8, roughness: 0.05, metalness: 0.1, emissive: 0x0a5a7a, emissiveIntensity: 0.6 });
  const crop = canvasTex(128, 128, (x, w, h) => { noiseFill(x, w, h, [96, 70, 44], 30, 4); for (let i = 0; i < w; i += 16) { x.fillStyle = 'rgba(90,150,40,.95)'; x.fillRect(i + 3, 0, 9, h); for (let y = 0; y < h; y += 6) { x.fillStyle = 'rgba(140,200,60,.7)'; x.fillRect(i + 2 + Math.random() * 6, y, 5, 4); } } });
  MAT.crop = new THREE.MeshStandardMaterial({ map: crop, roughness: 0.95, vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1 });
  MAT.dirt = new THREE.MeshStandardMaterial({ roughness: 1, map: canvasTex(128, 128, (x, w, h) => noiseFill(x, w, h, [120, 95, 70], 40, 6)), polygonOffset: true, polygonOffsetFactor: -1 });
}

// ================= MESH BUILDER =================
class MB {
  constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; }
  tri(a, b, c, col, ua = [0, 0], ub = [1, 0], uc = [1, 1]) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    for (const [v, u] of [[a, ua], [b, ub], [c, uc]]) { this.p.push(v[0], v[1], v[2]); this.n.push(nx, ny, nz); this.uv.push(u[0], u[1]); this.c.push(col.r, col.g, col.b); }
  }
  quad(a, b, c, d, col, u0 = 0, v0 = 0, u1 = 1, v1 = 1) { this.tri(a, b, c, col, [u0, v0], [u1, v0], [u1, v1]); this.tri(a, c, d, col, [u0, v0], [u1, v1], [u0, v1]); }
  // box: x,z center, y bottom. uv: [bayW, floorH] or null (constant corner uv)
  box(x, y, z, w, h, d, col, uv = null, opts = {}) {
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, y1 = y + h;
    const U = (len) => uv ? len / (uv[0] * 4) : 0.004, V = uv ? h / (uv[1] * 4) : 0.996; const v0 = uv ? 0 : 0.996;
    const uo = opts.uoff || 0;
    if (!opts.noSides) {
      this.quad([x0, y, z1], [x1, y, z1], [x1, y1, z1], [x0, y1, z1], col, uo, v0, uo + U(w), V);
      this.quad([x1, y, z0], [x0, y, z0], [x0, y1, z0], [x1, y1, z0], col, uo, v0, uo + U(w), V);
      this.quad([x1, y, z1], [x1, y, z0], [x1, y1, z0], [x1, y1, z1], col, uo, v0, uo + U(d), V);
      this.quad([x0, y, z0], [x0, y, z1], [x0, y1, z1], [x0, y1, z0], col, uo, v0, uo + U(d), V);
    }
    if (!opts.noTop) { const tc = opts.topCol || col; const tu = opts.topUV; this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], tc, tu ? 0 : 0.004, tu ? 0 : 0.996, tu ? w / tu : 0.004, tu ? d / tu : 0.996); }
    if (opts.bottom) this.quad([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], col, 0.004, 0.996, 0.004, 0.996);
  }
  // gable roof along axis ('x' ridge along x)
  gable(x, y, z, w, d, rh, col, axis = 'x', uvs = 4) {
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, yt = y + rh;
    if (axis === 'x') {
      const sl = Math.hypot(d / 2, rh) / uvs;
      this.quad([x0, y, z1], [x1, y, z1], [x1, yt, z], [x0, yt, z], col, 0, 0, w / uvs, sl);
      this.quad([x1, y, z0], [x0, y, z0], [x0, yt, z], [x1, yt, z], col, 0, 0, w / uvs, sl);
      this.tri([x1, y, z1], [x1, y, z0], [x1, yt, z], col, [0.004, 0.996], [0.004, 0.996], [0.004, 0.996]);
      this.tri([x0, y, z0], [x0, y, z1], [x0, yt, z], col, [0.004, 0.996], [0.004, 0.996], [0.004, 0.996]);
    } else {
      const sl = Math.hypot(w / 2, rh) / uvs;
      this.quad([x1, y, z1], [x1, y, z0], [x, yt, z0], [x, yt, z1], col, 0, 0, d / uvs, sl);
      this.quad([x0, y, z0], [x0, y, z1], [x, yt, z1], [x, yt, z0], col, 0, 0, d / uvs, sl);
      this.tri([x0, y, z1], [x1, y, z1], [x, yt, z1], col, [0.004, 0.996], [0.004, 0.996], [0.004, 0.996]);
      this.tri([x1, y, z0], [x0, y, z0], [x, yt, z0], col, [0.004, 0.996], [0.004, 0.996], [0.004, 0.996]);
    }
  }
  cyl(x, y, z, r, h, col, seg = 12, r2 = r, cap = true) {
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * TAU, a1 = (i + 1) / seg * TAU;
      const p0 = [x + Math.sin(a0) * r, y, z + Math.cos(a0) * r], p1 = [x + Math.sin(a1) * r, y, z + Math.cos(a1) * r];
      const q0 = [x + Math.sin(a0) * r2, y + h, z + Math.cos(a0) * r2], q1 = [x + Math.sin(a1) * r2, y + h, z + Math.cos(a1) * r2];
      this.quad(p0, p1, q1, q0, col, 0.004, 0.996, 0.004, 0.996);
      if (cap) this.tri(q0, q1, [x, y + h, z], col, [0.004, 0.996], [0.004, 0.996], [0.004, 0.996]);
    }
  }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.computeBoundingSphere(); g.computeBoundingBox(); return g;
  }
  get empty() { return this.p.length === 0; }
}
const _col = new THREE.Color();
function C(hex, mul = 1) { const c = new THREE.Color(hex); c.multiplyScalar(mul); return c; }
function CS(r, g, b) { return new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace); }
// per-chunk builders so frustum culling works
const CHUNK = 260; const chunkMB = new Map();
// 건물 교체용 '헛돌리기': 원래 건물을 만드는 척만 해서 랜덤 순서·건물 번호를 그대로 유지한다 (집 열쇠 번호가 안 바뀌게)
let GEN_DRY = false; const DRY_MB = new Proxy({}, { get: () => () => { } });
function mbAt(mat, x, z) { if (GEN_DRY) return DRY_MB; const k = mat + '|' + Math.floor(x / CHUNK) + ',' + Math.floor(z / CHUNK); let m = chunkMB.get(k); if (!m) { m = new MB(); m.mat = mat; chunkMB.set(k, m); } return m; }
function flushMB(castShadow = true) {
  for (const [k, m] of chunkMB) { if (m.empty) continue; const mesh = new THREE.Mesh(m.geo(), MAT[m.mat]); mesh.castShadow = castShadow && m.mat !== 'glow'; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; mesh.updateMatrix(); scene.add(mesh); WORLD_MESHES.push(mesh); }
  chunkMB.clear();
}
const WORLD_MESHES = [];

// ================= COLLIDERS =================
const COL_CELL = 32; const colGrid = new Map(); const COLLIDERS = []; let colStamp = 0;
function addCollider(x0, z0, x1, z1, y1 = 100, type = 'bld', ref = null, y0 = -50) {
  if (GEN_DRY) return null;
  const c = { x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), y0, y1, type, ref, stamp: 0, circle: false };
  COLLIDERS.push(c); gridInsert(c); return c;
}
function addCircleCollider(x, z, r, type = 'tree', ref = null, y1 = 30) {
  const c = { x, z, r, x0: x - r, x1: x + r, z0: z - r, z1: z + r, y0: -50, y1, type, ref, stamp: 0, circle: true, on: true };
  COLLIDERS.push(c); gridInsert(c); return c;
}
function gridInsert(c) {
  for (let i = Math.floor(c.x0 / COL_CELL); i <= Math.floor(c.x1 / COL_CELL); i++) for (let j = Math.floor(c.z0 / COL_CELL); j <= Math.floor(c.z1 / COL_CELL); j++) {
    const k = i * 100000 + j; let a = colGrid.get(k); if (!a) { a = []; colGrid.set(k, a); } a.push(c);
  }
}
function removeCollider(c) {
  const k = COLLIDERS.lastIndexOf(c); if (k >= 0) COLLIDERS.splice(k, 1);
  for (let i = Math.floor(c.x0 / COL_CELL); i <= Math.floor(c.x1 / COL_CELL); i++) for (let j = Math.floor(c.z0 / COL_CELL); j <= Math.floor(c.z1 / COL_CELL); j++) {
    const a = colGrid.get(i * 100000 + j); if (a) { const ix = a.indexOf(c); if (ix >= 0) a.splice(ix, 1); }
  }
}
const _near = [];
function collidersNear(x, z, r) {
  _near.length = 0; colStamp++;
  for (let i = Math.floor((x - r) / COL_CELL); i <= Math.floor((x + r) / COL_CELL); i++) for (let j = Math.floor((z - r) / COL_CELL); j <= Math.floor((z + r) / COL_CELL); j++) {
    const a = colGrid.get(i * 100000 + j); if (!a) continue;
    for (const c of a) { if (c.stamp === colStamp) continue; c.stamp = colStamp; if (c.circle && !c.on) continue; _near.push(c); }
  }
  return _near;
}
// push a circle (x,z,r) out of colliders; returns {x,z,hit,nx,nz}
const _res = { x: 0, z: 0, hit: false, nx: 0, nz: 0, c: null };
function resolveCircle(x, z, r, y = 0, h = 1.8) {
  _res.hit = false; _res.c = null;
  const list = collidersNear(x, z, r + 2);
  for (let it = 0; it < 2; it++) for (const c of list) {
    if (c.type === 'step' || y > c.y1 - 0.08 || y + h < c.y0) continue; // 윗면에 서 있으면 충돌 아님 (옥상·바닥 위) · step = 낮은 바닥(데크)은 걸어서 올라간다
    if (c.circle) {
      const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = r + c.r;
      if (d < m && d > 1e-4) { const k = (m - d); x += dx / d * k; z += dz / d * k; _res.hit = true; _res.nx = dx / d; _res.nz = dz / d; _res.c = c; }
    } else {
      const cx = clamp(x, c.x0, c.x1), cz = clamp(z, c.z0, c.z1); const dx = x - cx, dz = z - cz; const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-8) { const d = Math.sqrt(d2); x += dx / d * (r - d); z += dz / d * (r - d); _res.nx = dx / d; _res.nz = dz / d; }
        else { // inside: push out shortest axis
          const l = x - c.x0, rr = c.x1 - x, t = z - c.z0, b = c.z1 - z; const m = Math.min(l, rr, t, b);
          if (m === l) { x = c.x0 - r; _res.nx = -1; _res.nz = 0; } else if (m === rr) { x = c.x1 + r; _res.nx = 1; _res.nz = 0; } else if (m === t) { z = c.z0 - r; _res.nx = 0; _res.nz = -1; } else { z = c.z1 + r; _res.nx = 0; _res.nz = 1; }
        }
        _res.hit = true; _res.c = c;
      }
    }
  }
  _res.x = x; _res.z = z; return _res;
}
// ray vs colliders (3D AABB/cylinder) for bullets & camera
function rayColliders(ox, oy, oz, dx, dy, dz, maxD) {
  let best = maxD, hitC = null; const steps = Math.ceil(maxD / COL_CELL) + 1; colStamp++;
  for (let s = 0; s <= steps; s++) {
    const px = ox + dx * s * COL_CELL, pz = oz + dz * s * COL_CELL;
    if (s * COL_CELL > best + COL_CELL) break;
    for (let i = Math.floor(px / COL_CELL) - 1; i <= Math.floor(px / COL_CELL) + 1; i++) for (let j = Math.floor(pz / COL_CELL) - 1; j <= Math.floor(pz / COL_CELL) + 1; j++) {
      const a = colGrid.get(i * 100000 + j); if (!a) continue;
      for (const c of a) {
        if (c.stamp === colStamp) continue; c.stamp = colStamp; if (c.circle && !c.on) continue;
        let t;
        if (c.circle) { t = rayCyl(ox, oz, dx, dz, c.x, c.z, c.r); if (t === null) continue; const y = oy + dy * t; if (y > c.y1 || y < c.y0) continue; }
        else t = rayBox(ox, oy, oz, dx, dy, dz, c.x0, c.y0, c.z0, c.x1, c.y1, c.z1);
        if (t !== null && t >= 0 && t < best) { best = t; hitC = c; }
      }
    }
  }
  return { t: best, c: hitC };
}
function rayBox(ox, oy, oz, dx, dy, dz, x0, y0, z0, x1, y1, z1) {
  let tmin = -Infinity, tmax = Infinity;
  for (const [o, d, a, b] of [[ox, dx, x0, x1], [oy, dy, y0, y1], [oz, dz, z0, z1]]) {
    if (Math.abs(d) < 1e-9) { if (o < a || o > b) return null; continue; }
    let t1 = (a - o) / d, t2 = (b - o) / d; if (t1 > t2) [t1, t2] = [t2, t1]; tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) return null;
  }
  if (tmax < 0) return null; return tmin >= 0 ? tmin : 0;
}
function rayCyl(ox, oz, dx, dz, cx, cz, r) {
  const fx = ox - cx, fz = oz - cz; const a = dx * dx + dz * dz; if (a < 1e-9) return null; const b = 2 * (fx * dx + fz * dz), c = fx * fx + fz * fz - r * r;
  const D = b * b - 4 * a * c; if (D < 0) return null; const t = (-b - Math.sqrt(D)) / (2 * a); return t >= 0 ? t : (c < 0 ? 0 : null);
}
function rayTerrain(ox, oy, oz, dx, dy, dz, maxD) {
  let t = 0, step = 2; while (t < maxD) { const x = ox + dx * t, y = oy + dy * t, z = oz + dz * t; if (y < groundHeight(x, z, y) || y < -0.3) return Math.max(0, t - step / 2); t += step; step = Math.min(6, step * 1.05); } return null;
}

// ================= WORLD CONTENT RECORDS =================
const BLOCKS = []; const FACILITIES = []; const PLOTS = []; const PARKED = []; const TREES = []; const BENCHES = []; const LAMPS = [];
const ZOOS = []; const FARMS = []; const ANIMATED = []; const SMOKERS = []; const DOOR_RINGS = [];
const FAC = {
  police: { name: '경찰서', icon: '🚓', col: 0x30508f, eng: 'POLICE' }, hospital: { name: '병원', icon: '🏥', col: 0xf3f5f8, eng: 'HOSPITAL' },
  dealer: { name: '자동차 판매점', icon: '🚗', col: 0xdadfe6, eng: 'MOTORS' }, factory: { name: '공장', icon: '🏭', col: 0x9aa1a8, eng: 'FACTORY' },
  school: { name: '학교', icon: '🏫', col: 0xd9b48a, eng: 'SCHOOL' }, academy: { name: '학원', icon: '📚', col: 0xe8e1d0, eng: 'ACADEMY' },
  food: { name: '음식점', icon: '🍜', col: 0xc4552e, eng: 'FOOD' }, pcbang: { name: 'PC방', icon: '🖥️', col: 0x3a2e5c, eng: 'PC ROOM' },
  gym: { name: '헬스장', icon: '💪', col: 0x2b2f38, eng: 'GYM' }, pool: { name: '수영장', icon: '🏊', col: 0xe7f4fa, eng: 'POOL' },
  zoo: { name: '동물원', icon: '🦁', col: 0x6f8c45, eng: 'ZOO' }, gun: { name: '총포사', icon: '🔫', col: 0x5a3a2a, eng: 'GUNS' },
  clothes: { name: '옷가게', icon: '👕', col: 0xf0e6f2, eng: 'FASHION' }, club: { name: '클럽 네온', icon: '🪩', col: 0x1a1030, eng: 'CLUB' },
  casino: { name: '카지노', icon: '🎰', col: 0x2a1a08, eng: 'CASINO' }, hotel: { name: '리조트 호텔', icon: '🏨', col: 0xf2efe8, eng: 'RESORT' },
};
const REGION_FAC = {
  seoburi: ['police', 'hospital', 'dealer', 'factory', 'school', 'academy', 'food', 'pcbang', 'gym', 'pool', 'zoo', 'gun', 'clothes', 'food', 'academy'],
  jiolle: ['police', 'hospital', 'dealer', 'school', 'academy', 'food', 'pcbang', 'gym', 'pool', 'zoo', 'gun', 'clothes'],
  kaengjibe: ['police', 'hospital', 'dealer', 'factory', 'school', 'academy', 'food', 'pcbang', 'gym', 'pool', 'zoo', 'gun', 'clothes'],
  disanbay: ['police', 'hospital', 'dealer', 'factory', 'school', 'academy', 'food', 'pcbang', 'gym', 'pool', 'gun', 'clothes'],
  simone: ['hotel', 'food', 'hospital', 'pool', 'clothes', 'dealer', 'police'],
};
function makeSignTex(text, sub, bg, fg = '#fff', w = 512, h = 128) {
  return canvasTex(w, h, (x) => {
    x.fillStyle = bg; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 6; x.strokeRect(6, 6, w - 12, h - 12);
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `900 ${sub ? h * 0.42 : h * 0.55}px "Noto Sans KR",sans-serif`; x.fillText(text, w / 2, sub ? h * 0.4 : h / 2);
    if (sub) { x.font = `700 ${h * 0.2}px sans-serif`; x.globalAlpha = .8; x.fillText(sub, w / 2, h * 0.78); }
  }, { repeat: false });
}
function addSign(text, sub, bg, x, y, z, w, h, faceYaw, fg) {
  const t = makeSignTex(text, sub, bg, fg); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, toneMapped: true }));
  m.position.set(x, y, z); m.rotation.y = faceYaw; scene.add(m); m.matrixAutoUpdate = false; m.updateMatrix(); return m;
}
// face side helpers: side 'n'(-z),'s'(+z),'e'(+x),'w'(-x)
const SIDE_YAW = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 };
const SIDE_VEC = { s: [0, 1], n: [0, -1], e: [1, 0], w: [-1, 0] };
// ---- 들어갈 수 있는 건물 목록 (모든 건물에 문 + 실내) ----
const BLD_KIND = {
  office: '오피스 빌딩', bank: '서불리 은행', cafe: '카페', restaurant: '식당', mart: '편의점', apartment: '아파트', house: '주택', villa: '빌라',
  factory: '공장', church: '교회', barn: '헛간', hotel: '호텔', police: '경찰서', hospital: '병원', dealer: '자동차 판매점', school: '학교', academy: '학원',
  food: '음식점', pcbang: 'PC방', gym: '헬스장', pool: '실내 수영장', gun: '총포사', clothes: '옷가게', casino: '카지노', guard: '교도관실', home: '내 집',
};
const BUILDINGS = []; const BLD_GRID = new Map(); const BLD_CELL = 64;
function regBuilding(kind, x, z, w, d, top, side, extra = {}) {
  if (GEN_DRY) return { door: {} };
  const [sx, sz] = SIDE_VEC[side] || [0, 1];
  const wx = x + sx * (w / 2), wz = z + sz * (d / 2); // 문이 붙은 벽면 중앙
  const door = extra.door || { x: wx + sx * 1.4, z: wz + sz * 1.4 };
  const b = Object.assign({ id: BUILDINGS.length, kind, name: BLD_KIND[kind] || '건물', x, z, w, d, top, side }, extra);
  b.door = { x: door.x, z: door.z, wx, wz, sx, sz }; b.y0 = extra.y0 ?? groundHeight(door.x, door.z);
  BUILDINGS.push(b); bldInsert(b);
  if (!extra.noDoorMesh) { // 문짝 (벽에 살짝 붙인 판)
    const m = mbAt('plain', wx, wz); const y = b.y0 - 0.05;
    m.box(wx + sx * 0.06, y, wz + sz * 0.06, sx ? 0.14 : 1.9, 2.6, sz ? 0.14 : 1.9, C(0x2e2620));
    m.box(wx + sx * 0.1, y + 2.6, wz + sz * 0.1, sx ? 0.2 : 2.3, 0.25, sz ? 0.2 : 2.3, C(0xd8c890));
    if (G.quality >= 1 && !extra.small) { // 유리 양문 + 손잡이 + 캐노피 + 벽등
      const px = sz, pz = sx; // 문 면을 따라가는 방향
      m.box(wx + sx * 0.14, y + 0.08, wz + sz * 0.14, sx ? 0.04 : 1.7, 2.35, sz ? 0.04 : 1.7, C(0x6a8aa0));
      m.box(wx + sx * 0.17, y + 0.08, wz + sz * 0.17, sx ? 0.04 : 0.06, 2.35, sz ? 0.04 : 0.06, C(0x2e2620));
      for (const k2 of [-1, 1]) m.box(wx + sx * 0.2 + px * k2 * 0.18, y + 1.0, wz + sz * 0.2 + pz * k2 * 0.18, sx ? 0.05 : 0.04, 0.5, sz ? 0.05 : 0.04, C(0xd8dce0));
      m.box(wx + sx * 0.8, y + 2.95, wz + sz * 0.8, sx ? 1.5 : 3.2, 0.14, sz ? 1.5 : 3.2, C(0x34383e));
      for (const k2 of [-1, 1]) m.box(wx + sx * 0.12 + px * k2 * 1.35, y + 2.0, wz + sz * 0.12 + pz * k2 * 1.35, 0.18, 0.28, 0.18, C(0xfff0c8));
    }
  }
  return b;
}
function bldInsert(b) { const k = Math.floor(b.door.x / BLD_CELL) + ',' + Math.floor(b.door.z / BLD_CELL); let a = BLD_GRID.get(k); if (!a) { a = []; BLD_GRID.set(k, a); } a.push(b); }
function buildingsNear(x, z) { const out = []; const i0 = Math.floor(x / BLD_CELL), j0 = Math.floor(z / BLD_CELL); for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) { const a = BLD_GRID.get(i + ',' + j); if (a) out.push(...a); } return out; }
const PRISONS = [];

// ================= BUILD WORLD =================
async function buildWorld(progress) {
  wrng = mulberry32(20261009);
  progress(0.02, '도로망 설계 중…'); buildRoadGraph();
  await tick(); progress(0.06, '지형 생성 중…'); buildHeightmap();
  await tick(); progress(0.18, '재질 생성 중…'); buildMaterials();
  await tick(); progress(0.24, '블록과 건물 배치 중…'); genBlocks();
  await tick(); progress(0.38, '도로 포장 중…'); buildRoads();
  await tick(); progress(0.46, '이벤트광장 조성 중…'); buildPlaza(); buildBridge();
  await tick(); progress(0.52, '디산베이 마을 조성 중…'); genCountryside(); buildJobWorld();
  await tick(); progress(0.58, '지형 메쉬 생성 중…'); buildTerrainMesh(); buildWater();
  await tick(); progress(0.68, '나무 심는 중…'); genTrees(); buildStreetProps(); buildCityDetail();
  flushMB();
  await tick(); progress(0.78, '하늘 생성 중…');
}
const tick = () => new Promise(r => setTimeout(r, 0));

function blockSideTouch(lot, blk) {
  const s = []; const e = 1;
  if (lot.z1 >= blk.iz1 - e) s.push('s'); if (lot.z0 <= blk.iz0 + e) s.push('n'); if (lot.x1 >= blk.ix1 - e) s.push('e'); if (lot.x0 <= blk.ix0 + e) s.push('w'); return s;
}
function genBlocks() {
  const SW = 4.5;
  for (const g of GRIDS) {
    const ok = (x, z) => !g.clip || g.clip(x, z);
    const list = [];
    for (let i = 0; i < g.xs.length - 1; i++) for (let j = 0; j < g.zs.length - 1; j++) {
      const xa = g.xs[i], xb = g.xs[i + 1], za = g.zs[j], zb = g.zs[j + 1];
      if (!ok(xa, za) || !ok(xb, za) || !ok(xa, zb) || !ok(xb, zb)) continue;
      const b = { region: g.region, x0: xa + g.w / 2, x1: xb - g.w / 2, z0: za + g.w / 2, z1: zb - g.w / 2, use: 'normal', lots: [] };
      b.ix0 = b.x0 + SW; b.ix1 = b.x1 - SW; b.iz0 = b.z0 + SW; b.iz1 = b.z1 - SW;
      BLOCKS.push(b); list.push(b);
    }
    shuffleW(list);
    const facs = REGION_FAC[g.region].slice(); let bi = 0;
    // whole-block uses
    for (const f of facs) { const b = list[bi++]; if (!b) break; b.use = 'fac'; b.fac = f; }
    const nPlots = g.region === 'simone' ? 3 : 4;
    for (let k = 0; k < nPlots; k++) { const b = list[bi++]; if (b) b.use = 'plotblock'; }
    if (g.region === 'seoburi') for (let k = 0; k < 4; k++) { const b = list[bi++]; if (b) b.use = k < 2 ? 'park' : 'parking'; }
    if (g.region === 'kaengjibe') for (let k = 0; k < 2; k++) { const b = list[bi++]; if (b) b.use = k ? 'court' : 'park'; }
    if (g.region === 'jiolle') for (let k = 0; k < 3; k++) { const b = list[bi++]; if (b) b.use = k === 0 ? 'park' : 'factoryblock'; }
    if (g.region === 'simone') { const b = list[bi++]; if (b) b.use = 'park'; }
    if (g.region !== 'seoburi') { const b = list[bi++]; if (b) b.use = 'parking'; } // 모든 지역에 주차장 (차 소환)
  }
  for (const b of BLOCKS) {
    // slab + curb
    const slabCol = b.region === 'kaengjibe' ? C(0x9a958c) : b.region === 'simone' ? C(0xe9e2d0) : C(0xc9c6c0);
    mbAt('concrete', b.x0, b.z0).box((b.x0 + b.x1) / 2, LAND - 0.5, (b.z0 + b.z1) / 2, b.x1 - b.x0, 0.66, b.z1 - b.z0, slabCol, null, { topUV: 6 });
    markGrass(b.x0 - 1, b.z0 - 1, b.x1 + 1, b.z1 + 1, 0);
    const iw = b.ix1 - b.ix0, id = b.iz1 - b.iz0;
    const nx = clamp(Math.round(iw / 50), 1, 3), nz = clamp(Math.round(id / 50), 1, 3);
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      if (nx === 3 && nz === 3 && i === 1 && j === 1) continue;
      const lot = { x0: b.ix0 + iw * i / nx, x1: b.ix0 + iw * (i + 1) / nx, z0: b.iz0 + id * j / nz, z1: b.iz0 + id * (j + 1) / nz };
      lot.sides = blockSideTouch(lot, b); b.lots.push(lot);
    }
    fillBlock(b);
  }
}
function lotFront(lot) { // prefer side facing nearer to block outer: just choose first of preference order
  for (const s of ['s', 'e', 'n', 'w']) if (lot.sides.includes(s)) return s; return 's';
}
function fillBlock(b) {
  const R = b.region;
  if (b.use === 'fac' && (b.fac === 'zoo' || b.fac === 'school')) { if (b.fac === 'zoo') buildZooBlock(b); else buildSchoolBlock(b); return; }
  if (b.use === 'park' || b.use === 'court') { buildParkBlock(b); return; }
  if (b.use === 'factoryblock') { buildFactoryHall((b.ix0 + b.ix1) / 2, (b.iz0 + b.iz1) / 2, b.ix1 - b.ix0 - 8, b.iz1 - b.iz0 - 8, R, false, 's'); return; }
  if (b.use === 'parking') { buildParking(b); return; }
  const prisonBlock = b.use === 'fac' && b.fac === 'police' && b.lots.length > 1;
  const lot0 = b.lots[0];
  b.lots.forEach((lot, li) => {
    const side = lotFront(lot);
    if (b.use === 'fac' && li === 0) { const f = buildFacility(b.fac, lot, side, R); if (prisonBlock) buildPrison(b, lot0, f); return; }
    if (prisonBlock && lot.z0 > lot0.z0 + 1) return; // 경찰서 뒤편은 교도소 부지
    if (b.use === 'fac' && b.fac === 'pool' && li === 1) { buildOutdoorPool(lot); return; }
    if (b.use === 'plotblock' && li === 0) { makePlot(lot, side, R); return; }
    buildLotBuilding(lot, side, R, b);
  });
}
function markGrass(x0, z0, x1, z1, v) {
  const i0 = Math.max(0, Math.floor((x0 - HM.x0) / HM.res)), i1 = Math.min(HM.W - 1, Math.ceil((x1 - HM.x0) / HM.res));
  const j0 = Math.max(0, Math.floor((z0 - HM.z0) / HM.res)), j1 = Math.min(HM.H - 1, Math.ceil((z1 - HM.z0) / HM.res));
  const vv = v === 0 ? 3 : v === 1 ? 2 : v;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) grassMask[hmIdx(i, j)] = vv;
}
const PALETTE = {
  glass: [0x9fc4e8, 0x8ad1d6, 0xb8c6d4, 0xd8c9a0, 0x7fa2c8, 0xa0b8a8, 0xc2d6ee],
  office: [0xf0ebe0, 0xd8d2c4, 0xc8ccd2, 0xe6dccc, 0xbfb8aa],
  brick: [0xc0634a, 0xa85a40, 0x8a4a3a, 0xb07a5a, 0x9b6b55, 0x7a5848],
  apt: [0xffffff, 0xf0e8d8, 0xe8f0f4, 0xf6efe0, 0xe0e6d8],
  house: [0xfff8ec, 0xf4e4c8, 0xe8f0e0, 0xf8e0d8, 0xe0e8f0, 0xfff0c8],
  roof: [0x8a3a2a, 0x3a4a5a, 0x5a3a2a, 0x2a3a2a, 0x7a2a2a, 0x4a4a52],
};
function addBuildingBox(x, z, w, d, h, style, col, opts = {}) {
  const y0 = opts.y0 ?? LAND - 0.2; const cityShop = opts.shop;
  if (cityShop) { mbAt('shop', x, z).box(x, y0, z, w + 0.4, 4.4, d + 0.4, C(0xffffff), BAY.shop, { noTop: true, uoff: Math.floor(wr(0, 4)) / 4 }); }
  const yb = cityShop ? y0 + 4.4 : y0;
  mbAt(style, x, z).box(x, yb, z, w, h - (yb - y0), d, col, BAY[style], { topCol: col.clone().multiplyScalar(0.55) });
  if (!GEN_DRY) FACADES.push({ x, z, w, d, y0: yb, h: h - (yb - y0), style, col }); // 외벽 디테일용 (16_detail)
  if (!opts.noCornice) mbAt('plain', x, z).box(x, y0 + h, z, w + 0.6, 0.7, d + 0.6, col.clone().multiplyScalar(0.7));
  if (G.quality >= 1) { // 고품질 외관: 모서리 기둥, 옥상 난간(파라펫)+금속 마감, 지상층 석재 기단
    const m = mbAt('plain', x, z); const pc = style === 'glass' ? C(0x4e555e) : col.clone().multiplyScalar(0.82); const ph = h - (yb - y0);
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) m.box(x + sx * (w / 2 - 0.25), yb, z + sz * (d / 2 - 0.25), 0.62, ph, 0.62, pc);
    if (!opts.noCornice) { const t = y0 + h + 0.7, pw = col.clone().multiplyScalar(0.62), cap = C(0xb8bcc2), W2 = w + 0.6, D2 = d + 0.6;
      for (const [cx2, cz2, ww, dd] of [[x, z - D2 / 2 + 0.14, W2, 0.28], [x, z + D2 / 2 - 0.14, W2, 0.28], [x - W2 / 2 + 0.14, z, 0.28, D2], [x + W2 / 2 - 0.14, z, 0.28, D2]]) { m.box(cx2, t, cz2, ww, 0.85, dd, pw); m.box(cx2, t + 0.85, cz2, ww + 0.06, 0.08, dd + 0.06, cap); } }
    if (!cityShop) m.box(x, y0, z, w + 0.08, 0.6, d + 0.08, C(0x55565c));
  }
  addCollider(x - w / 2 - (cityShop ? 0.2 : 0), z - d / 2 - (cityShop ? 0.2 : 0), x + w / 2 + (cityShop ? 0.2 : 0), z + d / 2 + (cityShop ? 0.2 : 0), y0 + h + 0.7, 'bld');
  return y0 + h + 0.7;
}
function roofProps(x, z, w, d, top, n = 3) {
  const m = mbAt('plain', x, z);
  for (let i = 0; i < n; i++) {
    const px = x + wr(-w / 3, w / 3), pz = z + wr(-d / 3, d / 3); const k = wrng();
    const hq = G.quality >= 1; // 고품질: 실외기 팬·물탱크 지붕·안테나 경고등·계단실 문 (랜덤 시퀀스는 그대로 유지)
    if (k < 0.45) { const aw = wr(2, 3.5), ah = wr(1.2, 2), ad = wr(2, 3); m.box(px, top, pz, aw, ah, ad, C(0xa8aab0)); if (hq) { m.cyl(px - aw * 0.22, top + ah, pz, Math.min(aw, ad) * 0.2, 0.08, C(0x2a2c30), 12); m.cyl(px + aw * 0.22, top + ah, pz, Math.min(aw, ad) * 0.2, 0.08, C(0x2a2c30), 12); m.box(px, top + ah * 0.15, pz + ad / 2 + 0.01, aw * 0.85, ah * 0.6, 0.04, C(0x6a6e74)); m.box(px, top, pz, aw + 0.2, 0.15, ad + 0.2, C(0x5a5e64)); } }
    else if (k < 0.7) { const r = wr(1.2, 2), th = wr(2.5, 4); m.cyl(px, top + (hq ? 0.9 : 0), pz, r, th, C(0x8a8f96), hq ? 14 : 10); if (hq) { for (let a = 0; a < 4; a++) m.box(px + Math.cos(a * 1.571 + 0.785) * r * 0.7, top, pz + Math.sin(a * 1.571 + 0.785) * r * 0.7, 0.18, 0.9, 0.18, C(0x4a4e54)); m.cyl(px, top + 0.9 + th, pz, r * 1.04, 0.5, C(0x6a6e74), 14, 0.08); m.cyl(px, top + 0.9 + th * 0.5, pz, r * 1.02, 0.12, C(0x5a5e64), 14); } }
    else if (k < 0.85) { const ah = wr(4, 10); m.box(px, top, pz, 0.25, ah, 0.25, C(0x555555)); if (hq) { m.box(px, top + ah * 0.6, pz, 1.4, 0.06, 0.06, C(0x555555)); m.box(px, top + ah * 0.8, pz, 0.06, 0.06, 1.0, C(0x555555)); m.box(px, top + ah, pz, 0.3, 0.3, 0.3, C(0xff2a2a)); } }
    else { const sw = wr(3, 5), sd = wr(3, 5); m.box(px, top, pz, sw, 2.6, sd, C(0xd0ccc4)); if (hq) { m.box(px, top + 2.6, pz, sw + 0.3, 0.18, sd + 0.3, C(0x8a8a8e)); m.box(px, top, pz + sd / 2 + 0.02, 0.95, 2.05, 0.06, C(0x3a4048)); m.box(px + sw / 2 + 0.02, top + 1.2, pz, 0.06, 0.6, 1.2, C(0x8ab0c8)); } }
  }
}
function seoKind(x, z) { const k = hash2(x * 7 | 0, z * 13 | 0); return k < 0.12 ? 'bank' : k < 0.27 ? 'cafe' : k < 0.4 ? 'mart' : k < 0.5 ? 'restaurant' : k < 0.55 ? 'church' : 'office'; }
function buildLotBuilding(lot, side, R, b) {
  const lw = lot.x1 - lot.x0, ld = lot.z1 - lot.z0, cx = (lot.x0 + lot.x1) / 2, cz = (lot.z0 + lot.z1) / 2;
  if (R === 'seoburi') {
    const g = genrePick(cx, cz);
    if (g) { GEN_DRY = true; try { buildLotBuilding(lot, side, '__seo', b); } finally { GEN_DRY = false; } const keep = wrng; wrng = mulberry32(hash2(cx | 0, cz | 0) * 4e9 | 0); try { buildGenre(g, lot, side); } finally { wrng = keep; } return; }
    buildLotBuilding(lot, side, '__seo', b); return;
  }
  if (R === '__seo') {
    const dc = Math.hypot(cx - 760, cz) / 520; const hMax = lerp(175, 38, clamp(dc, 0, 1));
    const h = Math.max(16, wr(0.35, 1) * hMax); const style = wrng() < 0.6 ? 'glass' : 'office';
    const col = C(wpick(PALETTE[style]));
    const w = lw - wr(3, 8), d = ld - wr(3, 8);
    if (h > 60 && wrng() < 0.6) {
      const podH = wr(10, 18); addBuildingBox(cx, cz, w, d, podH, 'office', C(wpick(PALETTE.office)), { shop: true });
      const tw = w * wr(0.55, 0.8), td = d * wr(0.55, 0.8);
      const top = addBuildingBox(cx, cz, tw, td, h - podH, style, col, { y0: LAND - 0.2 + podH + 0.7 });
      if (wrng() < 0.5) { const t2 = addBuildingBox(cx, cz, tw * 0.6, td * 0.6, wr(8, 25), style, col, { y0: top }); roofProps(cx, cz, tw * 0.6, td * 0.6, t2, 2); if (wrng() < 0.5) mbAt('plain', cx, cz).box(cx, t2, cz, 0.4, wr(10, 25), 0.4, C(0x888888)); }
      else roofProps(cx, cz, tw, td, top, 4);
      regBuilding(seoKind(cx, cz), cx, cz, w + 0.4, d + 0.4, top, side, { roofW: tw, roofD: td });
    } else { const top = addBuildingBox(cx, cz, w, d, h, style, col, { shop: true }); roofProps(cx, cz, w, d, top, 4); regBuilding(seoKind(cx, cz), cx, cz, w + 0.4, d + 0.4, top, side); }
  } else if (R === 'jiolle') {
    if (wrng() < 0.6) { // houses
      const n = 2; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const hx = lot.x0 + lw * (i + 0.5) / n, hz = lot.z0 + ld * (j + 0.5) / n; buildHouse(hx, hz, lw / n - 5, ld / n - 5, wrng() < 0.5 ? 1 : 2, R);
      }
    } else { const h = wr(12, 24); const top = addBuildingBox(cx, cz, lw - 6, ld - 6, h, 'apt', C(wpick(PALETTE.apt))); roofProps(cx, cz, lw - 6, ld - 6, top, 2); regBuilding('apartment', cx, cz, lw - 6, ld - 6, top, side); }
  } else if (R === 'kaengjibe') {
    const k = wrng();
    if (k < 0.15) { buildFactoryHall(cx, cz, lw - 6, ld - 6, R, true, side); return; }
    const h = wr(9, 24); const w = lw - wr(3, 7), d = ld - wr(3, 7); const col = C(wpick(PALETTE.brick));
    const shopF = wrng() < 0.5; const top = addBuildingBox(cx, cz, w, d, h, 'brick', col, { shop: shopF });
    { const hk = hash2(cx * 3 | 0, cz * 5 | 0); regBuilding(hk < 0.1 ? 'church' : shopF ? (hk < 0.55 ? 'mart' : 'restaurant') : 'apartment', cx, cz, w + (shopF ? 0.4 : 0), d + (shopF ? 0.4 : 0), top, side); }
    roofProps(cx, cz, w, d, top, 2);
    // fire escape
    const fs = side; const [sx, sz] = SIDE_VEC[fs];
    const m = mbAt('metalPlain', cx, cz);
    for (let y = LAND + 4; y < top - 2; y += 3.2) { if (sx) m.box(cx + sx * (w / 2 + 0.7), y, cz, 1.4, 0.15, 6, C(0x333333)); else m.box(cx, y, cz + sz * (d / 2 + 0.7), 6, 0.15, 1.4, C(0x333333)); }
    if (wrng() < 0.6) addGraffiti(cx, cz, w, d, side);
    // fence + barrels
    if (wrng() < 0.5) { const bx = cx + wr(-lw / 3, lw / 3), bz = cz + (sz || 1) * (d / 2 + 2); mbAt('metalPlain', bx, bz).cyl(bx, LAND, bz, 0.4, 1.1, C(0x6a3a1a), 8); SMOKERS.push({ x: bx, y: LAND + 1.2, z: bz, fire: true, rate: 0.12 }); }
  } else if (R === 'simone') {
    if (wrng() < 0.25 && Math.hypot(cx - 2000, cz - 560) < 220) { const h = wr(30, 60); const top = addBuildingBox(cx, cz, lw - 10, ld - 10, h, 'apt', C(0xffffff)); roofProps(cx, cz, lw - 10, ld - 10, top, 2); regBuilding('hotel', cx, cz, lw - 10, ld - 10, top, side); }
    else buildVilla(cx, cz, lw - 6, ld - 6, side);
  }
}
function addGraffiti(cx, cz, w, d, side) {
  const t = canvasTex(256, 128, (x) => {
    x.clearRect(0, 0, 256, 128); const cols = ['#ff3d6a', '#3dff9a', '#3db8ff', '#ffd23d', '#c43dff'];
    x.font = `900 ${50 + wrng() * 20}px "Black Han Sans",sans-serif`; x.lineWidth = 8; x.strokeStyle = '#111'; x.fillStyle = wpick(cols);
    const w2 = wpick(['캥지베', 'KJB', 'RED', 'BLUE', '서불리X', 'GANG', '🔥']); x.save(); x.translate(128, 70); x.rotate(wr(-0.15, 0.15)); x.textAlign = 'center'; x.strokeText(w2, 0, 0); x.fillText(w2, 0, 0); x.restore();
  }, { repeat: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }));
  const [sx, sz] = SIDE_VEC[side]; m.position.set(cx + sx * (w / 2 + 0.03), LAND + 2.4, cz + sz * (d / 2 + 0.03)); m.rotation.y = SIDE_YAW[side]; scene.add(m);
}
function buildHouse(x, z, w, d, floors, R, y0 = LAND - 0.3) {
  w = Math.max(7, Math.min(w, 13)); d = Math.max(7, Math.min(d, 12)); const h = floors * 3.1 + 0.4;
  const wall = C(wpick(PALETTE.house)), roof = C(wpick(PALETTE.roof));
  mbAt('plain', x, z).box(x, y0 - 2, z, w + 0.4, 2.4, d + 0.4, C(0x8a8580));
  mbAt('house', x, z).box(x, y0 + 0.4, z, w, h, d, wall, BAY.house, { noTop: true });
  const ax = w > d ? 'x' : 'z';
  mbAt('roof', x, z).gable(x, y0 + 0.4 + h, z, w + 1.2, d + 1.2, Math.min(w, d) * 0.38, roof, ax);
  mbAt('plain', x, z).box(x + w * 0.25, y0 + h, z - d * 0.15, 0.8, 3.2, 0.8, C(0x7a5a4a));
  // door
  mbAt('plain', x, z).box(x, y0 + 0.4, z + d / 2 + 0.02, 1.2, 2.2, 0.1, C(0x6a4026));
  const apex = y0 + 0.4 + h + Math.min(w, d) * 0.38; addCollider(x - w / 2, z - d / 2, x + w / 2, z + d / 2, apex, 'bld');
  regBuilding('house', x, z, w, d, apex, 's', { noDoorMesh: true, y0: y0 + 0.3, floors: floors });
}
function buildVilla(x, z, w, d, side) {
  w = Math.min(w, 30); d = Math.min(d, 26);
  const y0 = LAND - 0.2; const m = mbAt('plain', x, z);
  const wall = C(0xfbfbf8);
  m.box(x - w * 0.15, y0, z, w * 0.6, 3.6, d * 0.6, wall);
  mbAt('glass', x, z).box(x - w * 0.15, y0 + 3.6, z, w * 0.58, 0.9, d * 0.58, C(0xbfe0f0), BAY.glass, { noTop: true });
  m.box(x - w * 0.15, y0 + 4.5, z, w * 0.66, 0.4, d * 0.66, wall);
  m.box(x + w * 0.05, y0 + 4.9, z - d * 0.1, w * 0.4, 3.2, d * 0.4, wall);
  mbAt('glass', x, z).box(x + w * 0.05, y0 + 5.4, z - d * 0.1, w * 0.41, 1.8, d * 0.41, C(0xbfe0f0), BAY.glass, { noTop: true, noTopx: 1 });
  addCollider(x - w * 0.45, z - d * 0.33, x + w * 0.25, z + d * 0.33, y0 + 8.5, 'bld');
  regBuilding('villa', x - w * 0.1, z, w * 0.7, d * 0.66, y0 + 8.5, side === 'n' || side === 's' ? side : 's');
  // pool
  const px = x + w * 0.3, pz = z + d * 0.15;
  m.box(px, y0, pz, w * 0.3, 0.5, d * 0.5, C(0xdfe8ec));
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.25, d * 0.42), MAT.poolWater); pool.rotation.x = -Math.PI / 2; pool.position.set(px, y0 + 0.52, pz); scene.add(pool);
  TREES.push({ type: 'palm', x: x - w * 0.42, z: z + d * 0.42, s: wr(0.8, 1.1) });
}
function buildFactoryHall(x, z, w, d, R, small, side = 's', noReg = false) {
  const y0 = LAND - 0.2; const h = small ? wr(8, 11) : wr(12, 16);
  mbAt('metal', x, z).box(x, y0, z, w, h, d, C(wpick([0xb8bec4, 0x9aa8b4, 0xc4b8a0, 0x8fa0a8])), BAY.metal, { noTop: true });
  const n = Math.max(2, Math.floor(w / 12)); const rm = mbAt('metal', x, z);
  for (let i = 0; i < n; i++) { const sx = x - w / 2 + (i + 0.5) * w / n; rm.gable(sx, y0 + h, z, w / n, d, 3, C(0x9aa0a6), 'z', 6); }
  addCollider(x - w / 2, z - d / 2, x + w / 2, z + d / 2, y0 + h + 3, 'bld');
  if (!noReg) regBuilding('factory', x, z, w, d, y0 + h, side === 'n' ? 's' : side);
  const cm = mbAt('plain', x, z);
  const nch = small ? 1 : wri(1, 3);
  for (let i = 0; i < nch; i++) {
    const cx = x + wr(-w / 3, w / 3), cz = z - d / 2 - 3; const ch = wr(22, 38);
    for (let k = 0; k < 6; k++) cm.cyl(cx, y0 + k * ch / 6, cz, 1.4 - k * 0.08, ch / 6, k % 2 ? C(0xd04030) : C(0xeeeeee), 12, 1.4 - (k + 1) * 0.08, false);
    addCircleCollider(cx, cz, 1.5, 'bld', null, y0 + ch);
    SMOKERS.push({ x: cx, y: y0 + ch, z: cz, rate: 0.35 });
  }
  if (!small) for (let i = 0; i < 6; i++) { const tx = x + wr(-w / 2, w / 2), tz = z + d / 2 + 4; cm.box(tx, y0, tz, 6, 2.6, 2.5, C(wpick([0xc04030, 0x3060a0, 0x40a060, 0xe0a030])), null); }
}
const PARKING_LOTS = []; // 주차장: 무인 정산기(키오스크) + 주차면 목록 → 차 소환
function buildParking(b) {
  const m = mbAt('plain', b.x0, b.z0); const cx = (b.ix0 + b.ix1) / 2, cz = (b.iz0 + b.iz1) / 2, W = b.ix1 - b.ix0, D = b.iz1 - b.iz0;
  m.box(cx, LAND - 0.2, cz, W, 0.42, D, C(0x3c3d41));
  const lot = { id: PARKING_LOTS.length, region: b.region, cx, cz, bays: [], fac: null };
  const rows = D > 46 ? [b.iz0 + 8, cz - 3, cz + 3, b.iz1 - 8] : [b.iz0 + 8, b.iz1 - 8];
  rows.forEach((zz, ri) => {
    const yaw = (ri % 2 === 0) ? 0 : Math.PI; const back = ri % 2 === 0 ? -1 : 1; // 차 앞이 통로를 보게
    for (let x = b.ix0 + 4; x < b.ix1 - 4; x += 3.2) {
      m.box(x, LAND + 0.23, zz, 0.15, 0.02, 5.5, C(0xe8e8e8));
      if (x + 3.2 < b.ix1 - 4) {
        const bx = x + 1.6; m.box(bx, LAND + 0.22, zz + back * 2.3, 1.4, 0.14, 0.22, C(0xe0c030)); // 휠스톱
        if (wrng() < 0.08) m.box(bx, LAND + 0.231, zz, 1.1, 0.012, 1.1, C(0x2a6ad0)); // 장애인 주차 표시
        const bay = { x: bx, z: zz, yaw }; lot.bays.push(bay);
        if (wrng() < 0.12) PARKED.push({ x: bx, z: zz, yaw, region: b.region }); // 빈 자리를 넉넉히 (소환용 + 성능)
      }
    }
  });
  // 통로 화살표 + 테두리 연석
  if (rows.length === 2) for (let x = b.ix0 + 8; x < b.ix1 - 8; x += 12) { m.box(x, LAND + 0.231, cz, 2.2, 0.012, 0.35, C(0xf2f2f2)); m.box(x + 1.1, LAND + 0.231, cz, 0.5, 0.012, 0.9, C(0xf2f2f2)); }
  for (const [x0, z0, x1, z1] of [[b.ix0, b.iz0, b.ix1, b.iz0 + 0.4], [b.ix0, b.iz1 - 0.4, b.ix1, b.iz1], [b.ix0, b.iz0, b.ix0 + 0.4, b.iz1], [b.ix1 - 0.4, b.iz0, b.ix1, b.iz1]]) m.box((x0 + x1) / 2, LAND, (z0 + z1) / 2, x1 - x0, 0.28, z1 - z0, C(0xb8b4ac));
  // 가로등
  for (let x = b.ix0 + 10; x < b.ix1 - 6; x += 22) for (const z of [cz]) { m.cyl(x, LAND, z + 0.01, 0.12, 6.5, C(0x5a5e66), 8); m.box(x, LAND + 6.5, z, 1.6, 0.18, 0.4, C(0x5a5e66)); m.box(x, LAND + 6.4, z, 1.2, 0.06, 0.3, C(0xfff2c0)); addCircleCollider(x, z, 0.2, 'bld', null, LAND + 6.5); LAMPS.push({ x, y: LAND - 0.02, z, yaw: Math.PI, park: 1 }); }
  // 정산소 부스 + 키오스크 (남쪽 입구)
  const kx = cx + Math.min(10, W / 4), kz = b.iz1 - 2.2;
  m.box(kx - 3.2, LAND, kz, 2.4, 2.6, 2.2, C(0xe8eef4)); m.box(kx - 3.2, LAND + 2.6, kz, 2.9, 0.22, 2.7, C(0x2a5ad0)); m.box(kx - 3.2, LAND + 1.1, kz + 1.11, 1.8, 1.0, 0.04, C(0x9cc8e8));
  m.box(kx, LAND, kz, 0.9, 1.45, 0.6, C(0x2a5ad0)); m.box(kx, LAND + 0.85, kz + 0.31, 0.62, 0.45, 0.03, C(0x101820)); m.box(kx, LAND + 1.45, kz, 1.0, 0.12, 0.7, C(0xf2f2f2));
  m.box(kx + 2.4, LAND, kz, 0.14, 1.1, 0.14, C(0xd8d8d8)); m.box(kx + 4.4, LAND + 1.0, kz, 4.0, 0.1, 0.1, C(0xd03030)); // 차단기
  addCollider(kx - 4.45, kz - 1.15, kx - 1.95, kz + 1.15, LAND + 2.9, 'bld'); addCollider(kx - 0.45, kz - 0.3, kx + 0.45, kz + 0.3, LAND + 1.5, 'bld');
  addSign('P', '주차장 · 차 소환', '#2a5ad0', kx - 3.2, LAND + 3.6, kz + 1.36, 2.6, 1.3, 0, '#ffffff');
  const f = { id: FACILITIES.length, type: 'parking', name: '주차장 (차 소환)', icon: '🅿️', region: b.region, x: kx, z: kz + 1.3, cx, cz, side: 's', lot: lot.id };
  f.ring = addDoorRing(f.x, f.z, 0x4a8aff); FACILITIES.push(f); lot.fac = f; PARKING_LOTS.push(lot);
}
function buildParkBlock(b) {
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, w = b.ix1 - b.ix0, d = b.iz1 - b.iz0;
  const m = mbAt('plain', cx, cz);
  m.box(cx, LAND - 0.2, cz, w, 0.4, d, C(0x4f8a3a));
  markGrass(b.ix0, b.iz0, b.ix1, b.iz1, 2);
  m.box(cx, LAND + 0.2, cz, w, 0.03, 4, C(0xcfc2a6)); m.box(cx, LAND + 0.2, cz, 4, 0.03, d, C(0xcfc2a6));
  if (b.use === 'court') {
    m.box(cx + w / 4, LAND + 0.21, cz + d / 4, 28, 0.05, 15, C(0xb85a3a));
    for (const s of [-1, 1]) { m.box(cx + w / 4 + s * 13, LAND, cz + d / 4, 0.25, 3.5, 0.25, C(0x333333)); m.box(cx + w / 4 + s * 12.6, LAND + 3.3, cz + d / 4, 0.1, 1.1, 1.8, C(0xffffff)); }
  } else {
    m.cyl(cx, LAND + 0.2, cz, 4, 0.8, C(0xcccccc), 20); const wtr = new THREE.Mesh(new THREE.CircleGeometry(3.6, 24), MAT.poolWater); wtr.rotation.x = -Math.PI / 2; wtr.position.set(cx, LAND + 0.9, cz); scene.add(wtr);
    SMOKERS.push({ x: cx, y: LAND + 1, z: cz, fountain: true, rate: 0.03 });
    addCircleCollider(cx, cz, 4, 'prop', null, LAND + 1);
  }
  for (let i = 0; i < 18; i++) { const tx = wr(b.ix0 + 4, b.ix1 - 4), tz = wr(b.iz0 + 4, b.iz1 - 4); if (Math.abs(tx - cx) < 5 || Math.abs(tz - cz) < 5) continue; TREES.push({ type: b.region === 'simone' ? 'palm' : wpick(['oak', 'oak', 'birch']), x: tx, z: tz, s: wr(0.8, 1.2) }); }
  for (let i = 0; i < 6; i++) { const bx = cx + wr(-w / 3, w / 3), bz = cz + (i % 2 ? 3.2 : -3.2); BENCHES.push({ x: bx, z: bz, yaw: i % 2 ? Math.PI : 0 }); }
}
// ---- 🏊 수영장 물: 물결 · 굴절된 타일 바닥 · 레인 · 빛 무늬(코스틱) · 하늘 반사 · 깊이감 · 들어가면 수영 ----
const POOLS = []; // { x0, x1, z0, z1, wy (수면 높이), bot (바닥) }
const POOL_U = { uT: { value: 0 }, uLight: { value: 1 }, uSun: { value: new THREE.Vector3(0.4, 0.8, 0.3) } };
function makePoolWater(w, d, indoor) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: POOL_U.uT, uSun: POOL_U.uSun, uLight: indoor ? { value: 0.95 } : POOL_U.uLight, uSize: { value: new THREE.Vector2(w, d) } },
    vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uT; uniform vec2 uSize; uniform float uLight; uniform vec3 uSun; varying vec2 vUv; varying vec3 vW;
      float grout(vec2 p){ vec2 g = abs(fract(p / 0.25) - 0.5); return smoothstep(0.44, 0.5, max(g.x, g.y)); }
      void main(){
        vec2 p = vUv * uSize; vec3 V = normalize(cameraPosition - vW);
        vec2 n = vec2(cos(p.x * 1.7 + uT * 1.3), cos(p.y * 1.9 - uT * 1.1)) * 0.05 + vec2(cos((p.x + p.y) * 3.1 + uT * 2.3), cos((p.x - p.y) * 2.7 - uT * 1.9)) * 0.03 + vec2(sin(p.y * 5.3 + uT * 3.1), sin(p.x * 4.7 + uT * 2.6)) * 0.015;
        vec3 N = normalize(vec3(n.x, 1.0, n.y));
        float D = 1.6; vec2 b = p - V.xz / max(V.y, 0.25) * D * 0.45 + n * 0.5; b = clamp(b, vec2(0.0), uSize);
        vec2 e = min(b, uSize - b); float edge = min(e.x, e.y);
        vec3 bottom = mix(vec3(0.66, 0.88, 0.95), vec3(0.42, 0.62, 0.72), grout(b) * 0.6);
        float lane = (1.0 - smoothstep(0.035, 0.05, abs(fract(b.y / 2.5) - 0.5))) * step(1.2, b.x) * step(1.2, uSize.x - b.x);
        bottom = mix(bottom, vec3(0.07, 0.18, 0.42), clamp(lane, 0.0, 1.0) * 0.8);
        vec2 q = b * 1.3; float c = abs(sin(q.x * 2.0 + sin(q.y * 1.7 + uT * 1.4) + uT * 0.9)) + abs(sin(q.y * 2.3 + sin(q.x * 1.5 - uT * 1.2) - uT * 0.8));
        c = pow(clamp(1.0 - c * 0.5, 0.0, 1.0), 4.0); bottom += c * 0.5 * uLight;
        float path = D / max(V.y, 0.2); vec3 ab = exp(-vec3(0.42, 0.11, 0.055) * path);
        vec3 under = (bottom * ab + vec3(0.0, 0.2, 0.33) * (1.0 - ab)) * uLight * mix(0.6, 1.0, smoothstep(0.0, 0.7, edge));
        vec3 R = reflect(-V, N); vec3 sky = mix(vec3(0.55, 0.7, 0.86), vec3(0.88, 0.94, 1.0), clamp(R.y, 0.0, 1.0)) * uLight;
        float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
        vec3 col = mix(under, sky, fres * 0.85) + pow(max(dot(R, normalize(uSun)), 0.0), 600.0) * 0.9 * uLight;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; return m;
}
function addPool(cx, cz, w, d, wy) { POOLS.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2, wy, bot: wy - 1.8 }); }
function poolAt(x, z) { for (const p of POOLS) if (x > p.x0 + 0.25 && x < p.x1 - 0.25 && z > p.z0 + 0.25 && z < p.z1 - 0.25) return p; return null; }
function buildOutdoorPool(lot) {
  const cx = (lot.x0 + lot.x1) / 2, cz = (lot.z0 + lot.z1) / 2, w = lot.x1 - lot.x0 - 6, d = lot.z1 - lot.z0 - 6;
  const m = mbAt('plain', cx, cz); const pw = w * 0.7, pd = d * 0.6;
  // 데크: 물 자리를 비워 둔 테두리 4조각 (올라설 수 있다)
  for (const [bx0, bz0, bx1, bz1] of [[cx - w / 2, cz - d / 2, cx + w / 2, cz - pd / 2], [cx - w / 2, cz + pd / 2, cx + w / 2, cz + d / 2], [cx - w / 2, cz - pd / 2, cx - pw / 2, cz + pd / 2], [cx + pw / 2, cz - pd / 2, cx + w / 2, cz + pd / 2]]) { m.box((bx0 + bx1) / 2, LAND - 0.2, (bz0 + bz1) / 2, bx1 - bx0, 0.6, bz1 - bz0, C(0xe8eef0)); addCollider(bx0, bz0, bx1, bz1, LAND + 0.4, 'step'); }
  const p = makePoolWater(pw, pd, false); p.position.set(cx, LAND + 0.38, cz); scene.add(p); addPool(cx, cz, pw, pd, LAND + 0.38);
  for (const [sx, sz, ww, dd] of [[0, -1, pw + 0.6, 0.3], [0, 1, pw + 0.6, 0.3], [-1, 0, 0.3, pd], [1, 0, 0.3, pd]]) m.box(cx + sx * (pw / 2 + 0.15), LAND + 0.38, cz + sz * (pd / 2 + 0.15), ww, 0.06, dd, C(0xf6f6f2)); // 테두리 (코핑)
  for (let i = 0; i < 6; i++) m.box(cx - w * 0.3 + i * w * 0.12, LAND + 0.4, cz + d * 0.4, 0.9, 0.35, 2, C(0xffffff));
}
function makePlot(lot, side, R) {
  const cx = (lot.x0 + lot.x1) / 2, cz = (lot.z0 + lot.z1) / 2; const w = Math.min(lot.x1 - lot.x0 - 4, 40), d = Math.min(lot.z1 - lot.z0 - 4, 40);
  const id = PLOTS.length; const price = { seoburi: 60000, jiolle: 30000, kaengjibe: 18000, disanbay: 22000, simone: 90000 }[R] || 30000;
  const p = { id, x: cx, z: cz, w, d, side, region: R, price, owner: null, ownerName: '', design: null, progress: 0, state: 'empty', y: groundHeight(cx, cz) };
  const dirt = new THREE.Mesh(new THREE.PlaneGeometry(w, d), MAT.dirt); dirt.rotation.x = -Math.PI / 2; dirt.position.set(cx, p.y + 0.25, cz); dirt.receiveShadow = true; scene.add(dirt);
  const [sx, sz] = SIDE_VEC[side];
  p.signPos = [cx + sx * (w / 2 - 1), cz + sz * (d / 2 - 1)];
  const post = mbAt('plain', cx, cz); post.box(p.signPos[0], p.y, p.signPos[1], 0.2, 3, 0.2, C(0x6a4a2a));
  p.sign = addSign('매물', fmtMoney(price) + ' · ' + REGIONS[R].name, '#0f6a3a', p.signPos[0], p.y + 3, p.signPos[1], 3.2, 0.8, SIDE_YAW[side]);
  p.dirt = dirt; PLOTS.push(p); markGrass(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, 0);
}
function facDoor(lot, side, w, d, cx, cz) {
  const [sx, sz] = SIDE_VEC[side]; return { x: cx + sx * (d / 2 + 2.2) * (sx ? 0 : 0) + sx * (w / 2 + 2.2), z: cz + sz * (d / 2 + 2.2) };
}
function addDoorRing(x, z, color = 0xffcc33) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.07, 8, 32), new THREE.MeshBasicMaterial({ color }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(x, groundHeight(x, z) + 0.35, z); scene.add(ring); DOOR_RINGS.push(ring); return ring;
}
function buildFacility(type, lot, side, R) {
  const F = FAC[type]; const cx = (lot.x0 + lot.x1) / 2, cz = (lot.z0 + lot.z1) / 2;
  let w = Math.min(lot.x1 - lot.x0 - 6, 44), d = Math.min(lot.z1 - lot.z0 - 6, 40);
  const [sx, sz] = SIDE_VEC[side];
  const y0 = Math.min(groundHeight(cx, cz), groundHeight(cx + sx * (w * 0.35 + 2.6), cz + sz * (d * 0.35 + 2.6))) - 0.2; let h = 12; const col = C(F.col); // 입구(앞쪽) 지면에 맞춘다
  const m = mbAt('plain', cx, cz);
  switch (type) {
    case 'police': h = 13; addBuildingBox(cx, cz, w, d, h, 'office', C(0xdfe6f0), { y0 }); m.box(cx, y0 + 4, cz, w + 0.3, 1.2, d + 0.3, C(0x2a4a9a)); m.box(cx + sx * (w / 2 + 4) + (sz ? w / 3 : 0), y0, cz + sz * (d / 2 + 4) + (sx ? d / 3 : 0), 0.15, 10, 0.15, C(0xcccccc)); break;
    case 'hospital': h = 26; addBuildingBox(cx, cz, w, d, h, 'office', C(0xffffff), { y0 }); { const s = addSign('✚', '', '#e52a3a', cx + sx * (w / 2 + 0.1), y0 + h - 3, cz + sz * (d / 2 + 0.1), 4, 4, SIDE_YAW[side]); } break;
    case 'dealer': h = 9; m.box(cx, y0, cz, w, 0.5, d, C(0xe6e6e6)); mbAt('glass', cx, cz).box(cx, y0 + 0.5, cz, w, h, d, C(0xd8ecf8), BAY.glass, { topCol: C(0x888888) }); addCollider(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, y0 + h + 1);
      for (let i = 0; i < 4; i++) PARKED.push({ x: cx + sx * (w / 2 + 6) + (sz ? -w / 3 + i * w / 4.5 : 0), z: cz + sz * (d / 2 + 6) + (sx ? -d / 3 + i * d / 4.5 : 0), yaw: SIDE_YAW[side] + Math.PI / 2, display: true, region: R }); break;
    case 'factory': buildFactoryHall(cx, cz, w, d, R, true, side, true); h = 10; break;
    case 'academy': h = 22; addBuildingBox(cx, cz, w * 0.8, d * 0.8, h, 'office', C(0xf0ece4), { y0, shop: true }); for (let i = 0; i < 3; i++) addSign(['영어', '수학', '코딩', '입시', '피아노', '태권도'][wri(0, 5)] + ' 학원', '', ['#1a6ad0', '#d02a6a', '#2aa05a'][i], cx + sx * (w * 0.4 + 0.1) + (sz ? (i - 1) * w * 0.25 : 0), y0 + 8 + i * 4, cz + sz * (d * 0.4 + 0.1) + (sx ? (i - 1) * d * 0.25 : 0), 6, 1.5, SIDE_YAW[side]); w *= 0.8; d *= 0.8; break;
    case 'food': h = 8; addBuildingBox(cx, cz, w * 0.7, d * 0.7, h, 'house', C(0xf4e0c0), { y0, shop: true }); w *= 0.7; d *= 0.7;
      for (let i = 0; i < 3; i++) { const tx = cx + sx * (w / 2 + 5) + (sz ? (i - 1) * 6 : 0), tz = cz + sz * (d / 2 + 5) + (sx ? (i - 1) * 6 : 0); m.cyl(tx, y0, tz, 0.08, 2.4, C(0x888888), 6); m.cyl(tx, y0 + 2.4, tz, 1.8, 0.6, C(i % 2 ? 0xd04030 : 0xffffff), 10, 0.05); m.cyl(tx, y0 + 0.75, tz, 0.7, 0.06, C(0xffffff), 10); } break;
    case 'pcbang': h = 14; addBuildingBox(cx, cz, w * 0.75, d * 0.75, h, 'brick', C(0x9a9aaa), { y0, shop: true }); w *= 0.75; d *= 0.75; break;
    case 'gym': h = 10; addBuildingBox(cx, cz, w * 0.85, d * 0.85, h, 'glass', C(0x6a7480), { y0 }); w *= 0.85; d *= 0.85; break;
    case 'pool': h = 9; addBuildingBox(cx, cz, w * 0.8, d * 0.8, h, 'glass', C(0xd0f0ff), { y0 }); w *= 0.8; d *= 0.8; break;
    case 'gun': h = 7; addBuildingBox(cx, cz, w * 0.6, d * 0.6, h, 'brick', C(0x8a6a5a), { y0, shop: true }); w *= 0.6; d *= 0.6; break;
    case 'clothes': h = 10; addBuildingBox(cx, cz, w * 0.7, d * 0.7, h, 'glass', C(0xf6e8f6), { y0, shop: true }); w *= 0.7; d *= 0.7; break;
    case 'hotel': h = 48; addBuildingBox(cx, cz, w * 0.8, d * 0.6, h, 'apt', C(0xffffff), { y0 }); w *= 0.8; d *= 0.6; roofProps(cx, cz, w, d, y0 + h, 3); break;
    default: addBuildingBox(cx, cz, w, d, h, 'office', col, { y0 });
  }
  const bgCol = '#' + new THREE.Color(F.col).offsetHSL(0, 0.2, type === 'hospital' || type === 'dealer' || type === 'clothes' || type === 'pool' || type === 'hotel' || type === 'academy' ? -0.55 : 0).getHexString();
  const signY = Math.min(y0 + h - 1.6, y0 + 7.5);
  addSign(F.name, F.eng, bgCol, cx + sx * (w / 2 + 0.12), Math.max(signY, y0 + 5.2), cz + sz * (d / 2 + 0.12), Math.min(10, Math.max(w, d) * 0.6), 2.5, SIDE_YAW[side]);
  const door = { x: cx + sx * (w / 2 + 2.6), z: cz + sz * (d / 2 + 2.6) };
  const f = { id: FACILITIES.length, type, name: F.name, icon: F.icon, region: R, x: door.x, z: door.z, cx, cz, side };
  f.ring = addDoorRing(door.x, door.z); FACILITIES.push(f);
  f.bld = regBuilding(type, cx, cz, w, d, y0 + h, side, { fac: f, door: { x: door.x, z: door.z }, y0: y0 + 0.2 });
  return f;
}
function buildSchoolBlock(b) {
  const lot = { x0: b.ix0, x1: b.ix1, z0: b.iz0, z1: b.iz0 + (b.iz1 - b.iz0) * 0.42 }; lot.sides = ['n', 'e', 'w'];
  const cx = (lot.x0 + lot.x1) / 2, cz = (lot.z0 + lot.z1) / 2; const w = lot.x1 - lot.x0 - 8, d = lot.z1 - lot.z0 - 6;
  addBuildingBox(cx, cz, w, d, 14, 'apt', C(0xe8c8a0));
  addSign('학교', 'SCHOOL', '#7a4a2a', cx, LAND + 15.2, cz + d / 2 + 0.1, 10, 2.5, 0);
  // clock
  const door = { x: cx, z: cz + d / 2 + 3 };
  const f = { id: FACILITIES.length, type: 'school', name: '학교', icon: '🏫', region: b.region, x: door.x, z: door.z, cx, cz, side: 's' }; f.ring = addDoorRing(door.x, door.z); FACILITIES.push(f);
  f.bld = regBuilding('school', cx, cz, w, d, LAND + 14, 's', { fac: f, door: { x: door.x, z: door.z } });
  // field
  const fz0 = lot.z1 + 4, fz1 = b.iz1 - 2; const fcx = cx, fcz = (fz0 + fz1) / 2; const fw = b.ix1 - b.ix0 - 6, fd = fz1 - fz0;
  const m = mbAt('plain', fcx, fcz); m.box(fcx, LAND - 0.2, fcz, fw, 0.41, fd, C(0xb8643a)); m.box(fcx, LAND + 0.21, fcz, fw - 8, 0.02, fd - 8, C(0x3e8a3a));
  m.box(fcx, LAND + 0.23, fcz, 0.3, 0.02, fd - 8, C(0xffffff));
  for (const s of [-1, 1]) { m.box(fcx + s * (fw / 2 - 6), LAND, fcz, 0.2, 2.4, 0.2, C(0xffffff)); m.box(fcx + s * (fw / 2 - 6), LAND + 2.4, fcz, 0.2, 0.2, 7, C(0xffffff)); m.box(fcx + s * (fw / 2 - 6), LAND, fcz - 3.5, 0.2, 2.4, 0.2, C(0xffffff)); m.box(fcx + s * (fw / 2 - 6), LAND, fcz + 3.5, 0.2, 2.4, 0.2, C(0xffffff)); }
}
// ================= 교도소 (경찰서 바로 뒤편) =================
function buildPrison(b, lot0, pf) {
  const x0 = b.ix0 + 1, x1 = b.ix1 - 1, z0 = lot0.z1 + 2.5, z1 = b.iz1 - 1;
  const W = x1 - x0, D = z1 - z0; if (W < 50 || D < 40) return;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, y = LAND - 0.2;
  const m = mbAt('concrete', cx, cz), mp = mbAt('plain', cx, cz), mm = mbAt('metalPlain', cx, cz), gl = mbAt('glow', cx, cz);
  markGrass(x0 - 1, z0 - 1, x1 + 1, z1 + 1, 0);
  mp.box(cx, LAND - 0.3, cz, W, 0.47, D, C(0x6f6f6a)); // 마당 바닥
  const WH = 7.5, T = 0.8, GW = 6; const gx = clamp((lot0.x0 + lot0.x1) / 2, x0 + 14, x1 - 14);
  const wall = (ax, az, bx, bz) => {
    const w = Math.max(T, Math.abs(bx - ax)), d = Math.max(T, Math.abs(bz - az)), mx = (ax + bx) / 2, mz = (az + bz) / 2;
    m.box(mx, y, mz, w, WH, d, C(0xbdb8ac), null, { topUV: 4 }); addCollider(mx - w / 2, mz - d / 2, mx + w / 2, mz + d / 2, y + WH + 1.5, 'bld');
    mm.box(mx, y + WH, mz, w, 0.12, d, C(0x555555)); // 철조망 받침
    const n = Math.ceil(Math.max(w, d) / 2.5); for (let i = 0; i <= n; i++) { const t = i / n; mm.box(lerp(ax, bx, t), y + WH, lerp(az, bz, t), 0.08, 1.1, 0.08, C(0x444444)); }
    mm.box(mx, y + WH + 0.55, mz, w, 0.06, d, C(0x9a9a9a)); mm.box(mx, y + WH + 1.0, mz, w, 0.06, d, C(0x9a9a9a));
  };
  wall(x0, z1, x1, z1); wall(x0, z0, x0, z1); wall(x1, z0, x1, z1); wall(x0, z0, gx - GW / 2, z0); wall(gx + GW / 2, z0, x1, z0);
  // 정문 (철창문) — 탈옥한 사람에게만 로컬로 열린다
  const gmb = new MB(); for (let i = 0; i <= 20; i++) gmb.box(gx - GW / 2 + i * GW / 20, y, z0, 0.1, 5.2, 0.1, C(0x2a2c30)); gmb.box(gx, y + 5.1, z0, GW, 0.25, 0.2, C(0x2a2c30)); gmb.box(gx, y + 2.6, z0, GW, 0.15, 0.15, C(0x2a2c30));
  const gateMesh = new THREE.Mesh(gmb.geo(), MAT.metalPlain); gateMesh.castShadow = true; scene.add(gateMesh);
  const gateCol = addCollider(gx - GW / 2, z0 - 0.3, gx + GW / 2, z0 + 0.3, y + WH + 1.5, 'bld');
  for (const sx of [-1, 1]) { m.box(gx + sx * (GW / 2 + 0.6), y, z0, 1.2, WH + 1.2, 1.4, C(0x8a867c)); gl.box(gx + sx * (GW / 2 + 0.6), y + WH + 1.2, z0, 0.6, 0.3, 0.6, CS(1, 0.25, 0.2)); }
  const name = (REGIONS[b.region] ? REGIONS[b.region].name : '') + ' 교도소';
  addSign(name, 'PRISON · 무단 출입 금지', '#2a2f3a', gx, y + WH - 1.2, z0 - T / 2 - 0.08, 10, 2.2, Math.PI);
  // 감시탑 4개
  for (const [tx, tz] of [[x0 + 3, z0 + 3], [x1 - 3, z0 + 3], [x0 + 3, z1 - 3], [x1 - 3, z1 - 3]]) {
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mm.box(tx + lx * 1.3, y, tz + lz * 1.3, 0.25, 9, 0.25, C(0x4a4c50));
    mp.box(tx, y + 9, tz, 3.6, 0.3, 3.6, C(0x6a6c70)); mp.box(tx, y + 9.3, tz, 3.4, 1.0, 3.4, C(0x50545a)); mm.box(tx, y + 11.8, tz, 3.8, 0.25, 3.8, C(0x3a3c40));
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mm.box(tx + lx * 1.6, y + 10.3, tz + lz * 1.6, 0.12, 1.5, 0.12, C(0x3a3c40));
    gl.box(tx, y + 11.6, tz + 1.95, 0.6, 0.2, 0.1, CS(1, 1, 0.8));
    addCollider(tx - 1.8, tz - 1.8, tx + 1.8, tz + 1.8, y + 12, 'bld');
  }
  // 교도관실 (경비 구역) — 정문 옆
  const gw = 10, gd = 7, ghx = clamp(gx + GW / 2 + 9, x0 + 9, x1 - 9), ghz = z0 + 6.5;
  addBuildingBox(ghx, ghz, gw, gd, 4.2, 'office', C(0x9aa4b4), { y0: y });
  addSign('교도관실', 'GUARD', '#20304a', ghx, y + 3, ghz + gd / 2 + 0.1, 4, 1, 0);
  regBuilding('guard', ghx, ghz, gw, gd, y + 4.9, 's', { y0: LAND });
  // 감방동
  const bw = Math.min(W - 14, 58), bd = 15, bx = cx, bz1 = z1 - 2.5, bz0 = bz1 - bd, BH = 4.2;
  mp.box(bx, y, (bz0 + bz1) / 2, bw, 0.42, bd, C(0x8d8c88));
  const cw = (ax, az, bx2, bz2, h = BH, col = C(0xd8d4c8)) => { const w = Math.max(0.35, Math.abs(bx2 - ax)), d = Math.max(0.35, Math.abs(bz2 - az)), mx = (ax + bx2) / 2, mz = (az + bz2) / 2; mp.box(mx, y, mz, w, h, d, col); addCollider(mx - w / 2, mz - d / 2, mx + w / 2, mz + d / 2, y + h, 'bld'); };
  cw(bx - bw / 2, bz1, bx + bw / 2, bz1); cw(bx - bw / 2, bz0, bx - bw / 2, bz1); cw(bx + bw / 2, bz0, bx + bw / 2, bz1);
  cw(bx - bw / 2, bz0, bx - 2, bz0); cw(bx + 2, bz0, bx + bw / 2, bz0);
  mp.box(bx, y + BH, bz0, 4, 0.6, 0.4, C(0xd8d4c8));
  addSign('감방동', 'CELL BLOCK', '#3a3a3a', bx, y + BH - 0.55, bz0 - 0.25, 4, 0.9, Math.PI);
  { const rmb = new MB(); rmb.box(bx, y + BH, (bz0 + bz1) / 2, bw + 0.6, 0.4, bd + 0.6, C(0x9a978e)); const roof = new THREE.Mesh(rmb.geo(), MAT.plain); roof.receiveShadow = true; roof.castShadow = false; scene.add(roof); addCollider(bx - bw / 2 - 0.3, bz0 - 0.3, bx + bw / 2 + 0.3, bz1 + 0.3, y + BH + 0.4, 'roof', null, y + BH); }
  for (let gx2 = bx - bw / 2 + 4; gx2 < bx + bw / 2 - 2; gx2 += 6) gl.box(gx2, y + BH - 0.08, bz0 + 3, 2.4, 0.06, 0.3, CS(1, 0.97, 0.85));
  const CW = 4.2, CD = 4.6, n = Math.floor((bw - 1) / CW); const cells = [];
  const sx0 = bx - n * CW / 2;
  for (let i = 0; i < n; i++) {
    const a = sx0 + i * CW, b2 = a + CW, fz = bz1 - CD;
    cw(a, fz, a, bz1, BH, C(0xcfcabd)); if (i === n - 1) cw(b2, fz, b2, bz1, BH, C(0xcfcabd)); // 감방 사이 벽 (양 끝 포함 — 문 말고는 빠져나갈 틈 없음)
    // 쇠창살 (왼쪽은 고정, 오른쪽 1.4m는 감방 문)
    for (let k = 0.2; k < CW; k += 0.3) mm.box(a + k, y + 0.2, fz, 0.06, BH - 0.2, 0.06, C(0x2a2c30));
    mm.box((a + b2) / 2, y + BH - 0.3, fz, CW, 0.12, 0.12, C(0x2a2c30)); mm.box((a + b2) / 2, y + 1.2, fz, CW, 0.08, 0.08, C(0x2a2c30));
    addCollider(a, fz - 0.15, b2 - 1.5, fz + 0.15, y + BH, 'bld');
    const doorCol = addCollider(b2 - 1.5, fz - 0.15, b2, fz + 0.15, y + BH, 'bld');
    // 침대 · 변기 · 세면대
    mp.box(a + 0.65, y + 0.2, bz1 - CD / 2 + 0.3, 0.95, 0.5, 2.1, C(0x6a6a70)); mp.box(a + 0.65, y + 0.7, bz1 - CD / 2 + 0.3, 0.9, 0.15, 2.0, C(0xe8e4dc));
    mp.cyl(b2 - 0.6, y + 0.2, bz1 - 0.6, 0.25, 0.45, C(0xf2f2f0), 10); mp.box(b2 - 0.5, y + 0.9, bz1 - 1.6, 0.5, 0.15, 0.4, C(0xf2f2f0));
    cells.push({ i, x: a + CW / 2 + 0.3, z: bz1 - CD / 2, x0: a + 0.25, x1: b2 - 0.25, z0: fz + 0.25, z1: bz1 - 0.25, doorCol, dx: b2 - 0.75, dz: fz });
  }
  // 운동장: 농구 코트 · 벤치 · 철봉
  const yz = (z0 + 12 + bz0) / 2; const ycx = clamp(gx - 16, x0 + 12, x1 - 30);
  mp.box(ycx, LAND + 0.18, yz, 24, 0.03, 14, C(0x8a4a32)); mp.box(ycx, LAND + 0.2, yz, 0.15, 0.02, 14, C(0xffffff));
  for (const s2 of [-1, 1]) { mm.box(ycx + s2 * 11.5, y, yz, 0.25, 3.6, 0.25, C(0x333333)); mp.box(ycx + s2 * 11.1, y + 3.4, yz, 0.1, 1.1, 1.8, C(0xffffff)); }
  for (let i = 0; i < 3; i++) { BENCHES.push({ x: ycx - 8 + i * 8, z: yz + 9, yaw: Math.PI }); }
  for (let i = 0; i < 2; i++) { const px = x1 - 14 + i * 4; mm.box(px - 1, y, yz, 0.12, 2.6, 0.12, C(0x555555)); mm.box(px + 1, y, yz, 0.12, 2.6, 0.12, C(0x555555)); mm.box(px, y + 2.5, yz, 2.1, 0.08, 0.08, C(0x555555)); }
  const pr = { id: PRISONS.length, name, region: b.region, x0, x1, z0, z1, gx, release: { x: gx, z: z0 - 3.2 }, inside: { x: gx, z: z0 + 3 }, cells, gateMesh, gateCol, police: pf, block: { x0: bx - bw / 2, x1: bx + bw / 2, z0: bz0, z1: bz1 } };
  PRISONS.push(pr); if (pf) pf.prison = pr.id; return pr;
}
function fenceRect(x0, z0, x1, z1, col = C(0x777a80), h = 2.2, gap = null) {
  const m = mbAt('metalPlain', x0, z0);
  const seg = (ax, az, bx, bz) => {
    const len = Math.hypot(bx - ax, bz - az); const n = Math.ceil(len / 3);
    for (let i = 0; i <= n; i++) { const t = i / n; m.box(lerp(ax, bx, t), LAND, lerp(az, bz, t), 0.12, h, 0.12, col); }
    if (ax === bx) { m.box(ax, LAND + h - 0.1, (az + bz) / 2, 0.08, 0.1, len, col); m.box(ax, LAND + h * 0.5, (az + bz) / 2, 0.08, 0.08, len, col); addCollider(ax - 0.15, Math.min(az, bz), ax + 0.15, Math.max(az, bz), LAND + h, 'fence'); }
    else { m.box((ax + bx) / 2, LAND + h - 0.1, az, len, 0.1, 0.08, col); m.box((ax + bx) / 2, LAND + h * 0.5, az, len, 0.08, 0.08, col); addCollider(Math.min(ax, bx), az - 0.15, Math.max(ax, bx), az + 0.15, LAND + h, 'fence'); }
  };
  if (gap === 's') { const mx = (x0 + x1) / 2; seg(x0, z1, mx - 3, z1); seg(mx + 3, z1, x1, z1); } else seg(x0, z1, x1, z1);
  seg(x0, z0, x1, z0); seg(x0, z0, x0, z1); seg(x1, z0, x1, z1);
}
// 우리 하나에 여러 종(+로 연결)이 같이 산다
const ZOO_SETS = [['lion+tiger', 'zebra+ostrich', 'giraffe'], ['elephant', 'panda+bear', 'penguin+polarbear'], ['hippo+rhino', 'camel', 'giraffe+deer'], ['bear', 'zebra', 'elephant'], ['penguin', 'lion', 'giraffe']];
function buildZooBlock(b) {
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2; const w = b.ix1 - b.ix0, d = b.iz1 - b.iz0;
  buildZoo(cx, cz, w, d, b.region);
}
function buildZoo(cx, cz, w, d, region) {
  const m = mbAt('plain', cx, cz); m.box(cx, LAND - 0.2, cz, w, 0.41, d, C(0x5d8a3e));
  markGrass(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, 2);
  const set = ZOO_SETS[ZOOS.length % ZOO_SETS.length];
  const ew = (w - 16) / 3;
  const pens = [];
  for (let i = 0; i < 3; i++) {
    const x0 = cx - w / 2 + 6 + i * (ew + 2), x1 = x0 + ew, z0 = cz - d / 2 + 6, z1 = cz + d / 2 - 14;
    fenceRect(x0, z0, x1, z1, C(0x5a4a3a), 2.4);
    m.box((x0 + x1) / 2, LAND + 0.21, (z0 + z1) / 2, x1 - x0 - 0.5, 0.02, z1 - z0 - 0.5, set[i].includes('penguin') ? C(0xdde8ee) : C(0xa89060));
    if (set[i].includes('penguin')) { const p = new THREE.Mesh(new THREE.PlaneGeometry(ew * 0.5, (z1 - z0) * 0.4), MAT.poolWater); p.rotation.x = -Math.PI / 2; p.position.set((x0 + x1) / 2, LAND + 0.25, (z0 + z1) / 2); scene.add(p); }
    for (let k = 0; k < 3; k++) TREES.push({ type: set[i].includes('giraffe') ? 'acacia' : 'oak', x: wr(x0 + 2, x1 - 2), z: wr(z0 + 2, z1 - 2), s: wr(0.8, 1.1), noCollide: false });
    pens.push({ x0: x0 + 1.5, x1: x1 - 1.5, z0: z0 + 1.5, z1: z1 - 1.5, kind: set[i] });
  }
  addSign('동물원', 'ZOO · ' + REGIONS[region].name, '#2e5a1a', cx, LAND + 4.2, cz + d / 2 + 0.2, 9, 2.2, 0);
  mbAt('plain', cx, cz).box(cx - 5.5, LAND, cz + d / 2, 0.6, 4.6, 0.6, C(0x5a3a1a)); mbAt('plain', cx, cz).box(cx + 5.5, LAND, cz + d / 2, 0.6, 4.6, 0.6, C(0x5a3a1a));
  const door = { x: cx, z: cz + d / 2 + 3 };
  const f = { id: FACILITIES.length, type: 'zoo', name: '동물원', icon: '🦁', region, x: door.x, z: door.z, cx, cz, side: 's' }; f.ring = addDoorRing(door.x, door.z); FACILITIES.push(f);
  ZOOS.push({ region, pens });
}

// ================= ROADS =================
function buildRoads() {
  const mbMain = new MB(), mbLocal = new MB(), mbPlain = new MB(), mbWhite = new MB();
  const nodeSize = NODES.map(n => Math.max(0, ...n.edges.map(e => EDGES[e].w)));
  const Y = (x, z) => groundHeight(x, z) + 0.07;
  for (const e of EDGES) {
    const a = NODES[e.a], b = NODES[e.b]; const dx = (b.x - a.x) / e.len, dz = (b.z - a.z) / e.len; const px = -dz, pz = dx;
    const s0 = nodeSize[a.id] / 2, s1 = e.len - nodeSize[b.id] / 2; if (s1 <= s0) continue;
    const mb = e.w >= 14 ? mbMain : mbLocal; const hw = e.w / 2;
    const steps = Math.max(1, Math.ceil((s1 - s0) / (e.bridge ? 4 : 12)));
    for (let i = 0; i < steps; i++) {
      const t0 = s0 + (s1 - s0) * i / steps, t1 = s0 + (s1 - s0) * (i + 1) / steps;
      const ax = a.x + dx * t0, az = a.z + dz * t0, bx = a.x + dx * t1, bz = a.z + dz * t1;
      const ya = Y(ax, az), yb = Y(bx, bz);
      mb.quad([ax - px * hw, ya, az - pz * hw], [ax + px * hw, ya, az + pz * hw], [bx + px * hw, yb, bz + pz * hw], [bx - px * hw, yb, bz - pz * hw], C(0xffffff), 0, t0 / 10, 1, t1 / 10);
    }
    // crosswalks near lit nodes
    for (const [nd, s, sign] of [[a, s0, 1], [b, s1, -1]]) {
      if (!nd.light) continue;
      for (let k = -hw + 1; k < hw - 0.5; k += 1.6) {
        const cx0 = a.x + dx * (s - (sign > 0 ? 0 : 4)) + px * k, cz0 = a.z + dz * (s - (sign > 0 ? 0 : 4)) + pz * k;
        const ux = dx * 4, uz = dz * 4, y = Y(cx0, cz0) + 0.01;
        mbWhite.quad([cx0, y, cz0], [cx0 + px * 0.8, y, cz0 + pz * 0.8], [cx0 + px * 0.8 + ux, y, cz0 + pz * 0.8 + uz], [cx0 + ux, y, cz0 + uz], C(0xffffff));
      }
    }
    if (regionAt((a.x + b.x) / 2, (a.z + b.z) / 2) === 'disanbay' || e.bridge) {} else markGrass(Math.min(a.x, b.x) - hw - 1, Math.min(a.z, b.z) - hw - 1, Math.max(a.x, b.x) + hw + 1, Math.max(a.z, b.z) + hw + 1, 0);
  }
  for (const n of NODES) {
    const s = nodeSize[n.id] / 2; const y = Y(n.x, n.z);
    mbPlain.quad([n.x - s, y, n.z + s], [n.x + s, y, n.z + s], [n.x + s, y, n.z - s], [n.x - s, y, n.z - s], C(0xffffff), n.x / 10, n.z / 10, (n.x + 2 * s) / 10, (n.z - 2 * s) / 10);
  }
  for (const [mb, mat] of [[mbMain, MAT.roadMain], [mbLocal, MAT.roadLocal], [mbPlain, MAT.roadPlain], [mbWhite, MAT.white]]) {
    const g = mb.geo(); g.deleteAttribute('color'); const mesh = new THREE.Mesh(g, mat); mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; scene.add(mesh);
  }
  // grass mask under roads (all)
}
function buildBridge() {
  const m = mbAt('plain', 1500, 440); const mm = mbAt('metalPlain', 1500, 440);
  for (let x = 1290; x < 1660; x += 4) {
    const y = deckY(x + 2, 440); if (y === null) continue;
    m.box(x + 2, y - 1.2, 440, 4.1, 1.15, 15, C(0x8a8a88), null);
    mm.box(x + 2, y, 432.6, 4.1, 1.1, 0.25, C(0xd04030)); mm.box(x + 2, y, 447.4, 4.1, 1.1, 0.25, C(0xd04030));
  }
  for (const px of [1340, 1420, 1530, 1610]) { const y = deckY(px, 440); m.box(px, -10, 440, 3, y + 9, 10, C(0x9a9894)); }
  for (const px of [1420, 1530]) {
    const y = deckY(px, 440);
    for (const zz of [432.3, 447.7]) { mm.box(px, y, zz, 1.6, 34, 1.6, C(0xd04030)); }
    mm.box(px, y + 30, 440, 1.6, 2, 17, C(0xd04030));
    for (let k = 1; k <= 7; k++) for (const sgn of [-1, 1]) for (const zz of [432.3, 447.7]) {
      const tx = px + sgn * k * 9; const ty = deckY(tx, 440); if (ty === null) continue;
      const len = Math.hypot(tx - px, y + 33 - ty); const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, len, 4), new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.8, roughness: 0.3 }));
      cyl.position.set((tx + px) / 2, (ty + y + 33) / 2, zz); cyl.rotation.z = Math.atan2(tx - px, y + 33 - ty); scene.add(cyl);
    }
  }
  addCollider(1250, 432.2, 1700, 432.9, 30, 'rail'); addCollider(1250, 447.1, 1700, 447.8, 30, 'rail');
}
// ================= 서불리 장르 건물 100개 =================
// 서불리 도심 필지 중 100곳을 영화관·박물관·소방서·주유소·노래방 같은 다양한 건물로 바꾼다.
// k = 실내 종류(기존 실내 재사용), cu = 식당 메뉴 종류, deco = 겉모양 장식
const GENRES = [
  { id: 'cinema', n: '영화관', e: 'CINEMA', k: 'office', h: [16, 22], st: 'office', col: 0x2a2a3a, deco: 'marquee', bg: '#a01020' },
  { id: 'museum', n: '시립 박물관', e: 'MUSEUM', k: 'bank', h: [14, 18], st: 'office', col: 0xe8e0cc, deco: 'columns', bg: '#5a4a2a' },
  { id: 'gallery', n: '현대 미술관', e: 'ART GALLERY', k: 'office', h: [14, 20], st: 'glass', col: 0xf4f4f4, deco: 'cube', bg: '#111111' },
  { id: 'library', n: '중앙 도서관', e: 'LIBRARY', k: 'academy', h: [12, 16], st: 'brick', col: 0xa85a40, deco: 'columns', bg: '#2a4a3a' },
  { id: 'books', n: '서점', e: 'BOOKS', k: 'mart', h: [10, 16], st: 'brick', col: 0x8a4a3a, deco: 'awning', aw: 0x2a6a4a, bg: '#2a5a3a', shop: 1 },
  { id: 'bakery', n: '빵집', e: 'BAKERY', k: 'cafe', h: [8, 14], st: 'brick', col: 0xd8b088, deco: 'awning', aw: 0xc8582a, bg: '#8a4a1a', shop: 1 },
  { id: 'flower', n: '꽃집', e: 'FLOWERS', k: 'mart', h: [8, 12], st: 'office', col: 0xf4e8ec, deco: 'awning', aw: 0xe86a9a, bg: '#c84a7a', shop: 1 },
  { id: 'pharmacy', n: '약국', e: 'PHARMACY', k: 'mart', h: [10, 18], st: 'office', col: 0xf0f0ec, deco: 'cross', bg: '#1a8a4a', shop: 1 },
  { id: 'chicken', n: '치킨집', e: 'CHICKEN', k: 'restaurant', cu: 'chk', h: [8, 14], st: 'brick', col: 0xd89a4a, deco: 'awning', aw: 0xe8a018, bg: '#c86a10', shop: 1 },
  { id: 'pizza', n: '피자집', e: 'PIZZA', k: 'restaurant', cu: 'piz', h: [8, 14], st: 'brick', col: 0xb8483a, deco: 'awning', aw: 0x2a8a3a, bg: '#a82a1a', shop: 1 },
  { id: 'snack', n: '분식집', e: 'SNACK BAR', k: 'restaurant', cu: 'snack', h: [8, 12], st: 'office', col: 0xf0d8a8, deco: 'awning', aw: 0xe84a3a, bg: '#d8402a', shop: 1 },
  { id: 'bbq', n: '고깃집', e: 'K-BBQ', k: 'restaurant', cu: 'bbq', h: [8, 14], st: 'brick', col: 0x6a3a2a, deco: 'neon', bg: '#5a1a0a', shop: 1 },
  { id: 'sushi', n: '초밥집', e: 'SUSHI', k: 'restaurant', cu: 'jpn', h: [8, 12], st: 'office', col: 0x2a2a2a, deco: 'awning', aw: 0x1a1a1a, bg: '#1a1a1a', shop: 1 },
  { id: 'chinese', n: '중국집', e: 'CHINESE', k: 'restaurant', cu: 'chn', h: [8, 14], st: 'brick', col: 0xb8302a, deco: 'neon', bg: '#c81a1a', shop: 1 },
  { id: 'burger', n: '버거집', e: 'BURGER', k: 'restaurant', cu: 'bur', h: [8, 10], st: 'office', col: 0xe8c040, deco: 'billboard', bg: '#d8401a', shop: 1 },
  { id: 'korean', n: '한식당', e: 'KOREAN', k: 'restaurant', cu: 'kor', h: [8, 12], st: 'brick', col: 0x8a6a4a, deco: 'awning', aw: 0x5a3a1a, bg: '#4a2a10', shop: 1 },
  { id: 'icecream', n: '아이스크림 가게', e: 'ICE CREAM', k: 'cafe', h: [8, 10], st: 'office', col: 0xf8d8e8, deco: 'awning', aw: 0x6ad0e8, bg: '#e86aa8', shop: 1 },
  { id: 'karaoke', n: '노래방', e: 'KARAOKE', k: 'pcbang', h: [12, 20], st: 'office', col: 0x3a2a5a, deco: 'neon', bg: '#6a1aa0', shop: 1 },
  { id: 'arcade', n: '오락실', e: 'ARCADE', k: 'pcbang', h: [10, 16], st: 'office', col: 0x1a1a3a, deco: 'neon', bg: '#1a3aa0', shop: 1 },
  { id: 'bowling', n: '볼링장', e: 'BOWLING', k: 'gym', h: [10, 13], st: 'metal', col: 0x4a6a8a, deco: 'pin', bg: '#1a4a8a' },
  { id: 'sauna', n: '찜질방', e: 'SAUNA', k: 'pool', h: [14, 20], st: 'office', col: 0xe8d8c0, deco: 'billboard', bg: '#a05a1a' },
  { id: 'hair', n: '미용실', e: 'HAIR SALON', k: 'mart', h: [8, 14], st: 'office', col: 0xf4f4f4, deco: 'pole', bg: '#2a2a2a', shop: 1 },
  { id: 'laundry', n: '세탁소', e: 'LAUNDRY', k: 'mart', h: [8, 12], st: 'brick', col: 0x9ab0c8, deco: 'awning', aw: 0x3a6ad0, bg: '#2a5ab0', shop: 1 },
  { id: 'post', n: '우체국', e: 'POST OFFICE', k: 'bank', h: [10, 14], st: 'brick', col: 0xc85a3a, deco: 'flag', bg: '#d03a1a' },
  { id: 'fire', n: '소방서', e: 'FIRE STATION', k: 'office', h: [12, 15], st: 'brick', col: 0x9a3a2a, deco: 'garage', bg: '#c8201a' },
  { id: 'tv', n: '서불리 방송국', e: 'SBC TV', k: 'office', h: [40, 70], st: 'glass', col: 0x7fa2c8, deco: 'antenna', bg: '#1a2a6a' },
  { id: 'news', n: '서불리 일보', e: 'DAILY NEWS', k: 'office', h: [30, 50], st: 'office', col: 0xd8d2c4, deco: 'billboard', bg: '#2a2a2a' },
  { id: 'motel', n: '모텔', e: 'MOTEL', k: 'hotel', h: [16, 24], st: 'brick', col: 0xc8a0b8, deco: 'neon', bg: '#c81a8a' },
  { id: 'guest', n: '게스트하우스', e: 'GUEST HOUSE', k: 'hotel', h: [12, 18], st: 'brick', col: 0xe0c8a0, deco: 'awning', aw: 0x3a8a6a, bg: '#2a6a5a' },
  { id: 'dept', n: '서불리 백화점', e: 'DEPARTMENT STORE', k: 'mart', h: [28, 40], st: 'glass', col: 0xd8c9a0, deco: 'billboard', bg: '#8a1a3a' },
  { id: 'hyper', n: '대형마트', e: 'HYPERMARKET', k: 'mart', h: [12, 16], st: 'metal', col: 0xe8e8e8, deco: 'billboard', bg: '#e8401a' },
  { id: 'furniture', n: '가구 전시장', e: 'FURNITURE', k: 'mart', h: [12, 18], st: 'glass', col: 0xc8b89a, deco: 'cube', bg: '#5a4a2a' },
  { id: 'electro', n: '전자상가', e: 'ELECTRONICS', k: 'mart', h: [16, 28], st: 'glass', col: 0x8ad1d6, deco: 'neon', bg: '#1a5ab0' },
  { id: 'garage', n: '자동차 정비소', e: 'AUTO REPAIR', k: 'office', h: [8, 10], st: 'metal', col: 0x7a7a80, deco: 'garage', bg: '#2a2a2a' },
  { id: 'gas', n: '주유소', e: 'GAS STATION', k: 'mart', h: [6, 7], st: 'office', col: 0xf0f0f0, deco: 'canopy', bg: '#1a8a3a', small: 1 },
  { id: 'carwash', n: '세차장', e: 'CAR WASH', k: 'mart', h: [6, 7], st: 'metal', col: 0xd8e8f4, deco: 'canopy', bg: '#1a6ad0', small: 1 },
  { id: 'cathedral', n: '서불리 성당', e: 'CATHEDRAL', k: 'church', h: [16, 22], st: 'brick', col: 0xd8c8a8, deco: 'spire', bg: '#4a3a2a' },
  { id: 'univ', n: '서불리 대학교', e: 'UNIVERSITY', k: 'academy', h: [18, 30], st: 'brick', col: 0xa86a4a, deco: 'columns', bg: '#1a3a6a' },
  { id: 'kinder', n: '유치원', e: 'KINDERGARTEN', k: 'academy', h: [7, 9], st: 'office', col: 0xf8e070, deco: 'stripes', bg: '#e86a1a' },
  { id: 'taekwon', n: '태권도장', e: 'TAEKWONDO', k: 'gym', h: [8, 14], st: 'office', col: 0xf0f0f0, deco: 'flag', bg: '#1a3a9a', shop: 1 },
  { id: 'yoga', n: '요가 · 필라테스', e: 'YOGA', k: 'gym', h: [10, 16], st: 'glass', col: 0xa0b8a8, deco: 'awning', aw: 0x6a9a6a, bg: '#3a6a4a', shop: 1 },
  { id: 'dental', n: '치과', e: 'DENTAL', k: 'office', h: [14, 24], st: 'office', col: 0xeef4f8, deco: 'cross', bg: '#1a7ab0', shop: 1 },
  { id: 'vet', n: '동물병원', e: 'ANIMAL HOSPITAL', k: 'office', h: [8, 12], st: 'office', col: 0xf0f8f0, deco: 'cross', bg: '#3a9a5a', shop: 1 },
  { id: 'realty', n: '공인중개사', e: 'REAL ESTATE', k: 'office', h: [10, 18], st: 'office', col: 0xe6dccc, deco: 'awning', aw: 0x2a3a6a, bg: '#2a3a6a', shop: 1 },
  { id: 'convention', n: '컨벤션 센터', e: 'CONVENTION', k: 'office', h: [16, 20], st: 'glass', col: 0xb8c6d4, deco: 'arch', bg: '#2a4a6a' },
  { id: 'aquarium', n: '아쿠아리움', e: 'AQUARIUM', k: 'pool', h: [12, 16], st: 'glass', col: 0x7ab8e0, deco: 'dome', bg: '#1a5a9a' },
  { id: 'arena', n: '실내 체육관', e: 'ARENA', k: 'gym', h: [16, 20], st: 'metal', col: 0xc8ccd2, deco: 'dome', bg: '#2a2a6a' },
  { id: 'officetel', n: '오피스텔', e: 'OFFICETEL', k: 'apartment', h: [36, 60], st: 'glass', col: 0xb8c6d4, deco: 'stripes', bg: '#3a4a5a' },
  { id: 'jazz', n: '재즈바', e: 'JAZZ BAR', k: 'restaurant', cu: 'kor', h: [8, 12], st: 'brick', col: 0x3a2a2a, deco: 'neon', bg: '#2a1a3a', shop: 1 },
  { id: 'pub', n: '펍', e: 'PUB', k: 'restaurant', cu: 'bur', h: [8, 12], st: 'brick', col: 0x2a4a2a, deco: 'awning', aw: 0x1a3a1a, bg: '#1a3a1a', shop: 1 },
];
let GENRE_N = 0; const GENRE_MAX = 100;
function genrePick(cx, cz) {
  if (GENRE_N >= GENRE_MAX || hash2(cx * 3 | 0, cz * 7 | 0) > 0.46) return null;
  return GENRES[GENRE_N++ % GENRES.length];
}
function buildGenre(g, lot, side) {
  const lw = lot.x1 - lot.x0, ld = lot.z1 - lot.z0, cx = (lot.x0 + lot.x1) / 2, cz = (lot.z0 + lot.z1) / 2;
  const [sx, sz] = SIDE_VEC[side]; const along = sx !== 0; // 정면이 동서쪽이면 정면 폭은 z 방향
  let w = Math.min(lw - wr(5, 9), g.small ? 18 : 46), d = Math.min(ld - wr(5, 9), g.small ? 14 : 44);
  if (g.small) { w = Math.min(w, 16); d = Math.min(d, 12); }
  const h = wr(g.h[0], g.h[1]); const col = C(g.col);
  // 작은 건물(주유소·세차장)은 뒤쪽으로 밀고 앞에 마당
  const bx = g.small ? cx - sx * (lw / 2 - w / 2 - 3) : cx, bz = g.small ? cz - sz * (ld / 2 - d / 2 - 3) : cz;
  const top = addBuildingBox(bx, bz, w, d, h, g.st, col, { shop: !!g.shop });
  const m = mbAt('plain', bx, bz), gl = mbAt('glow', bx, bz), y0 = LAND - 0.2;
  const half = along ? w / 2 : d / 2, faceW = along ? d : w;
  // 정면 기준 상자: lat(정면 좌우) · out(정면에서 바깥으로) · wl(좌우 폭) · dd(앞뒤 두께)
  const F = (mb, lat, y, out, wl, hh, dd, c) => { const x = bx + sx * (half + out) + (along ? 0 : lat), z = bz + sz * (half + out) + (along ? lat : 0); if (along) mb.box(x, y, z, dd, hh, wl, c); else mb.box(x, y, z, wl, hh, dd, c); };
  const FC = (mb, lat, y, out, r, hh, c, seg = 12, r2) => { const x = bx + sx * (half + out) + (along ? 0 : lat), z = bz + sz * (half + out) + (along ? lat : 0); mb.cyl(x, y, z, r, hh, c, seg, r2 ?? r); };
  const bgc = C(new THREE.Color(g.bg).getHex());
  switch (g.deco) {
    case 'marquee': F(m, 0, y0 + 4.6, 2, faceW * 0.7, 0.8, 4, C(0x1a1a1a)); F(gl, 0, y0 + 4.5, 4.05, faceW * 0.7, 0.25, 0.1, CS(1, 0.85, 0.3)); F(gl, 0, y0 + 5.4, 4.05, faceW * 0.7, 0.25, 0.1, CS(1, 0.3, 0.3)); F(gl, faceW / 2 - 2, y0 + 6, 0.6, 0.6, h - 8, 1.2, CS(1, 0.2, 0.25)); break;
    case 'columns': for (let i = 0; i < 6; i++) FC(m, (i - 2.5) * faceW / 7, y0, 3, 0.6, Math.min(h - 1, 9), C(0xf2ecdc), 14); F(m, 0, y0 + Math.min(h - 1, 9), 3, faceW * 0.9, 1.0, 6.5, C(0xe8e0cc)); for (let k = 0; k < 3; k++) F(m, 0, y0 + k * 0.3, 4 + 3.2 - k * 1.0, faceW * 0.9, 0.3, 1.2 + k, C(0xd8d0c0)); break;
    case 'cube': F(m, 0, y0, 1.5, faceW * 0.5, h * 0.8, 1.2, C(0x1a1a1a)); m.box(bx, top, bz, w * 0.6, 6, d * 0.6, C(0xf4f4f4)); gl.box(bx, top + 6, bz, w * 0.6 + 0.2, 0.2, d * 0.6 + 0.2, CS(1, 1, 1)); break;
    case 'awning': { const ac = C(g.aw || 0x2a6a4a); F(m, 0, y0 + 3.6, 1.2, faceW * 0.85, 0.35, 2.4, ac); for (let i = 0; i < 8; i++) F(m, (i - 3.5) * faceW * 0.85 / 8, y0 + 3.3, 2.35, faceW * 0.85 / 16, 0.35, 0.1, i % 2 ? ac : C(0xffffff)); break; }
    case 'cross': F(gl, faceW / 2 - 2.2, y0 + h * 0.6, 0.5, 2.6, 0.8, 0.3, CS(0.1, 0.9, 0.4)); F(gl, faceW / 2 - 2.2, y0 + h * 0.6 - 0.9, 0.5, 0.8, 2.6, 0.3, CS(0.1, 0.9, 0.4)); break;
    case 'neon': for (let i = 0; i < Math.min(5, Math.floor(h / 3)); i++) F(gl, 0, y0 + 5 + i * 2.6, 0.32, faceW * 0.9, 0.22, 0.1, i % 2 ? CS(1, 0.2, 0.8) : CS(0.2, 0.9, 1)); F(gl, -faceW / 2 + 1.2, y0 + 4, 0.8, 0.5, h - 5, 1.4, CS(1, 0.3, 0.6)); break;
    case 'billboard': { const bw = Math.min(w, d) * 0.8; m.box(bx - bw / 3, top, bz, 0.4, 4, 0.4, C(0x555555)); m.box(bx + bw / 3, top, bz, 0.4, 4, 0.4, C(0x555555)); if (along) m.box(bx, top + 4, bz, 0.5, 5, bw, bgc); else m.box(bx, top + 4, bz, bw, 5, 0.5, bgc); if (along) gl.box(bx + sx * 0.3, top + 4, bz, 0.1, 0.25, bw, CS(1, 1, 0.8)); else gl.box(bx, top + 4, bz + sz * 0.3, bw, 0.25, 0.1, CS(1, 1, 0.8)); break; }
    case 'pin': m.cyl(bx, top, bz, 1.4, 3, C(0xffffff), 16, 1.0); m.cyl(bx, top + 3, bz, 1.0, 1.0, C(0xd82020), 16, 0.8); m.cyl(bx, top + 4, bz, 0.8, 2.2, C(0xffffff), 16, 0.9); m.cyl(bx, top + 6.2, bz, 0.9, 1.0, C(0xffffff), 16, 0.2); break;
    case 'pole': FC(m, faceW / 2 - 1.5, y0 + 1.5, 0.4, 0.25, 0.3, C(0x888888)); FC(gl, faceW / 2 - 1.5, y0 + 1.8, 0.4, 0.22, 1.6, CS(1, 0.2, 0.2)); FC(gl, faceW / 2 - 1.5, y0 + 2.2, 0.4, 0.23, 0.3, CS(0.2, 0.4, 1)); FC(gl, faceW / 2 - 1.5, y0 + 2.8, 0.4, 0.23, 0.3, CS(1, 1, 1)); break;
    case 'flag': for (let i = 0; i < 3; i++) { FC(m, (i - 1) * 3, y0, 4, 0.12, 10, C(0xcccccc), 6); F(m, (i - 1) * 3 + 1, y0 + 8.2, 4, 2, 1.3, 0.05, [C(0xd02020), C(0x2050d0), C(0xf0f0f0)][i]); } break;
    case 'garage': for (let i = 0; i < 3; i++) F(m, (i - 1) * faceW / 3.4, y0, 0.1, faceW / 4, 5, 0.2, i === 1 ? C(0xd8d8d8) : C(g.id === 'fire' ? 0xc82020 : 0x5a5e64)); if (g.id === 'fire') m.box(bx - (along ? 0 : w / 2 - 3), y0, bz - (along ? d / 2 - 3 : 0), 5, h + 9, 5, col); break;
    case 'canopy': { const ox = bx + sx * (half + 10), oz = bz + sz * (half + 10); for (const [a, c2] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) m.box(ox + a * 6, y0, oz + c2 * 4, 0.5, 5.5, 0.5, C(0xcccccc)); m.box(ox, y0 + 5.5, oz, 15, 1, 11, C(0xf2f2f2)); gl.box(ox, y0 + 5.5, oz, 15.2, 0.25, 11.2, g.id === 'gas' ? CS(0.1, 0.8, 0.3) : CS(0.2, 0.5, 1)); if (g.id === 'gas') for (const a of [-3, 3]) { m.box(ox + (along ? 0 : a), y0, oz + (along ? a : 0), 1.0, 1.8, 0.7, C(0xd8d8d8)); gl.box(ox + (along ? 0 : a), y0 + 1.3, oz + (along ? a : 0), 1.05, 0.3, 0.75, CS(0.1, 0.8, 0.3)); } else m.box(ox, y0, oz, 5, 4.5, 9, C(0x3a6ad0)); addCollider(ox - 7.5, oz - 5.5, ox + 7.5, oz + 5.5, y0 + 6.5, 'roof', null, y0 + 5.4); break; }
    case 'spire': { const tx = bx, tz = bz; m.box(tx, top, tz, 5, 10, 5, col); m.cyl(tx, top + 10, tz, 3.4, 12, C(0x5a4a3a), 4, 0.05); gl.box(tx, top + 22.2, tz, 0.3, 3, 0.3, CS(1, 0.9, 0.5)); gl.box(tx, top + 24, tz, 1.6, 0.3, 0.3, CS(1, 0.9, 0.5)); break; }
    case 'antenna': { m.box(bx, top, bz, 0.6, 30, 0.6, C(0x8a8a8a)); m.box(bx, top + 10, bz, 3, 0.3, 0.3, C(0x8a8a8a)); m.box(bx, top + 20, bz, 0.3, 0.3, 3, C(0x8a8a8a)); gl.box(bx, top + 30, bz, 0.5, 0.5, 0.5, CS(1, 0.1, 0.1)); m.cyl(bx + w / 4, top, bz + d / 4, 0.3, 2, C(0x999999)); m.cyl(bx + w / 4, top + 2, bz + d / 4, 2.4, 0.4, C(0xeeeeee), 16, 1.2); break; }
    case 'stripes': { const cs = [C(0xe84a4a), C(0x4a8ae8), C(0x4ac86a), C(0xf2c23a)]; for (let i = 0; i < 4; i++) F(m, (i - 1.5) * faceW / 4.2, y0 + 1, 0.12, faceW / 4.6, Math.min(h - 2, 6), 0.1, cs[i]); break; }
    case 'arch': for (let i = 0; i < 6; i++) { const r = 1 - (i / 6) ** 2; if (along) m.box(bx, top + i * 1.1, bz, w * 0.9 * r, 1.1, d * 0.95, C(0x9fb4c8)); else m.box(bx, top + i * 1.1, bz, w * 0.95, 1.1, d * 0.9 * r, C(0x9fb4c8)); } break;
    case 'dome': { const R = Math.min(w, d) * 0.42; let r = R; for (let i = 0; i < 6; i++) { const r2 = R * Math.cos((i + 1) / 6 * Math.PI / 2); m.cyl(bx, top + R * Math.sin(i / 6 * Math.PI / 2), bz, r, R * (Math.sin((i + 1) / 6 * Math.PI / 2) - Math.sin(i / 6 * Math.PI / 2)) + 0.05, g.id === 'aquarium' ? CS(0.4, 0.7, 0.95) : C(0xd8dce2), 20, Math.max(0.05, r2)); r = r2; } break; }
  }
  // 간판 (정면)
  const sw = Math.min(faceW * 0.75, 18), sy = g.shop ? y0 + 5.6 : Math.min(top - 3, y0 + (g.deco === 'columns' ? 11.5 : 7.5));
  const sxp = bx + sx * (half + (g.deco === 'columns' ? 6.3 : 0.32)), szp = bz + sz * (half + (g.deco === 'columns' ? 6.3 : 0.32));
  addSign(g.e, g.n, g.bg, sxp, sy, szp, sw, sw / 4, SIDE_YAW[side]);
  const b = regBuilding(g.k, bx, bz, w + 0.4, d + 0.4, top, side, { genre: g.id });
  b.name = g.n; if (g.cu) b.cuisine = g.cu;
  roofProps(bx, bz, w * 0.7, d * 0.7, top, g.deco === 'billboard' || g.deco === 'dome' || g.deco === 'pin' || g.deco === 'antenna' ? 0 : 2);
}
// ================= PLAZA =================
const CLUB = { x: -105, z: -95, w: 56, d: 46, roof: null };
// 클럽 안에 있으면 지붕을 숨긴다 (frame에서 매번)
function clubRoofTick() { if (!CLUB.roof || typeof camera === 'undefined' || !camera) return; const p = camera.position, A = (typeof ME !== 'undefined' && (ME.vehicle || ME)) || p; const inX = q => q.x > CLUB.x - CLUB.w / 2 && q.x < CLUB.x + CLUB.w / 2 && q.z > CLUB.z - CLUB.d / 2 && q.z < CLUB.z + CLUB.d / 2; const hide = inX(A) && inX(p) && p.y > LAND + CLUB.H - 1; for (const r of CLUB.roof) r.visible = !hide; } // 카메라가 지붕 위로 올라가면 지붕만 숨긴다
const CASINO = { x: 110, z: -100 };
let danceFloor = null;
function buildPlaza() {
  const m = mbAt('plain', 0, 0);
  // stone paths
  m.box(0, LAND - 0.2, 0, 8, 0.36, 380, C(0xa89e8c)); m.box(0, LAND - 0.2, 0, 380, 0.36, 8, C(0xa89e8c));
  m.cyl(0, LAND - 0.2, 0, 26, 0.37, C(0xa89e8c), 40);
  markGrass(-4, -190, 4, 190, 0); markGrass(-190, -4, 190, 4, 0); markGrass(-27, -27, 27, 27, 0);
  // fountain
  m.cyl(0, LAND, 0, 11, 0.9, C(0xe8e4dc), 40); m.cyl(0, LAND, 0, 2.2, 3.4, C(0xe8e4dc), 20); m.cyl(0, LAND + 3.4, 0, 4, 0.4, C(0xe8e4dc), 24, 4.4);
  const wtr = new THREE.Mesh(new THREE.CircleGeometry(10.4, 40), MAT.poolWater); wtr.rotation.x = -Math.PI / 2; wtr.position.set(0, LAND + 0.8, 0); scene.add(wtr);
  addCircleCollider(0, 0, 11, 'prop', null, LAND + 1);
  SMOKERS.push({ x: 0, y: LAND + 3.9, z: 0, fountain: true, rate: 0.01, big: true });
  // club (open-air)
  const c = CLUB; m.box(c.x, LAND - 0.2, c.z, c.w, 0.24, c.d, C(0x15121c)); // 바닥은 땅 높이 (예전엔 0.6m 높아서 사람이 바닥·조명 속에 빠져 보였다)
  const tiles = new MB(); const tw = 2.4;
  for (let i = -6; i < 6; i++) for (let j = -5; j < 4; j++) tiles.box(c.x + i * tw + tw / 2, LAND + 0.045, c.z + j * tw + tw / 2 + 2, tw - 0.15, 0.03, tw - 0.15, CS(Math.random(), Math.random(), Math.random()));
  danceFloor = new THREE.Mesh(tiles.geo(), new THREE.MeshBasicMaterial({ vertexColors: true })); scene.add(danceFloor);
  // stage / dj
  m.box(c.x, LAND + 0.04, c.z - c.d / 2 + 5, 18, 1.96, 7, C(0x222230)); m.box(c.x, LAND + 2, c.z - c.d / 2 + 5, 6, 1.2, 1.6, C(0x111111));
  addCollider(c.x - 9, c.z - c.d / 2 + 1.5, c.x + 9, c.z - c.d / 2 + 8.5, LAND + 2, 'prop');
  for (const sx of [-1, 1]) { m.box(c.x + sx * 12, LAND + 0.04, c.z - c.d / 2 + 4, 3, 7.56, 3, C(0x0d0d0d)); addCollider(c.x + sx * 12 - 1.5, c.z - c.d / 2 + 2.5, c.x + sx * 12 + 1.5, c.z - c.d / 2 + 5.5, LAND + 8); }
  // truss frame
  const mm = mbAt('metalPlain', c.x, c.z);
  for (const [px, pz] of [[-c.w / 2 + 1, -c.d / 2 + 1], [c.w / 2 - 1, -c.d / 2 + 1], [-c.w / 2 + 1, c.d / 2 - 1], [c.w / 2 - 1, c.d / 2 - 1]]) { mm.box(c.x + px, LAND + 0.04, c.z + pz, 0.6, 12.56, 0.6, C(0x444444)); addCollider(c.x + px - 0.3, c.z + pz - 0.3, c.x + px + 0.3, c.z + pz + 0.3); }
  mm.box(c.x, LAND + 12.6, c.z - c.d / 2 + 1, c.w, 0.6, 0.6, C(0x444444)); mm.box(c.x, LAND + 12.6, c.z + c.d / 2 - 1, c.w, 0.6, 0.6, C(0x444444));
  mm.box(c.x - c.w / 2 + 1, LAND + 12.6, c.z, 0.6, 0.6, c.d, C(0x444444)); mm.box(c.x + c.w / 2 - 1, LAND + 12.6, c.z, 0.6, 0.6, c.d, C(0x444444));
  addSign('DJ BOOTH', '클럽 네온 메인 스테이지', '#2a0a4a', c.x, LAND + 7.5, c.z - c.d / 2 + 1.0, 14, 3.5, 0, '#ff6af0');
  const fc = { id: FACILITIES.length, type: 'club', name: '클럽 네온 (바)', icon: '🪩', region: 'plaza', x: c.x + c.w / 2 - 5, z: c.z + c.d / 2 - 5, cx: c.x, cz: c.z, side: 's' }; fc.ring = addDoorRing(fc.x, fc.z, 0xff4fd8); FACILITIES.push(fc);
  m.box(fc.x, LAND + 0.04, fc.z - 1.6, 6, 1.1, 1, C(0x5a2a6a)); addCollider(fc.x - 3, fc.z - 2.1, fc.x + 3, fc.z - 1.1, LAND + 1.14, 'prop'); // 바 카운터 (부딪힌다)
  // ---- 클럽 건물: 벽 · 지붕 · 네온 외관 · 입구(남쪽) ----
  { const H = 11, T = 0.8, wc = C(0x1c1428), y0 = LAND - 0.2, x0 = c.x - c.w / 2, x1 = c.x + c.w / 2, z0 = c.z - c.d / 2, z1 = c.z + c.d / 2, gap = 10;
    const wm = mbAt('plain', c.x, c.z), gl = mbAt('glow', c.x, c.z);
    const wall = (cx2, cz2, ww, dd) => { wm.box(cx2, y0, cz2, ww, H, dd, wc); addCollider(cx2 - ww / 2, cz2 - dd / 2, cx2 + ww / 2, cz2 + dd / 2, y0 + H); };
    wall(c.x, z0 + T / 2, c.w, T); wall(x0 + T / 2, c.z, T, c.d); wall(x1 - T / 2, c.z, T, c.d);
    const seg = (c.w - gap) / 2; wall(x0 + seg / 2, z1 - T / 2, seg, T); wall(x1 - seg / 2, z1 - T / 2, seg, T);
    wm.box(c.x, y0 + 4.6, z1 - T / 2, gap, H - 4.6, T, wc); addCollider(c.x - gap / 2, z1 - T, c.x + gap / 2, z1, y0 + H, 'bld', null, y0 + 4.6);
    // 외벽 네온 띠
    for (const [yy, cc] of [[3.2, CS(1, 0.25, 0.85)], [8.6, CS(0.2, 0.85, 1)]]) {
      gl.box(c.x, y0 + yy, z0 - 0.05, c.w + 0.2, 0.28, 0.12, cc); gl.box(x0 - 0.05, y0 + yy, c.z, 0.12, 0.28, c.d + 0.2, cc); gl.box(x1 + 0.05, y0 + yy, c.z, 0.12, 0.28, c.d + 0.2, cc);
      gl.box(x0 + seg / 2, y0 + yy, z1 + 0.05, seg, 0.28, 0.12, cc); gl.box(x1 - seg / 2, y0 + yy, z1 + 0.05, seg, 0.28, 0.12, cc);
    }
    for (let i = 0; i < 7; i++) { const xx = x0 + 3 + i * (seg - 6) / 6; gl.box(xx, y0 + 0.4, z1 + 0.06, 0.3, H - 1, 0.1, i % 2 ? CS(1, 0.25, 0.85) : CS(0.6, 0.3, 1)); gl.box(x1 - (xx - x0), y0 + 0.4, z1 + 0.06, 0.3, H - 1, 0.1, i % 2 ? CS(1, 0.25, 0.85) : CS(0.6, 0.3, 1)); }
    // 입구: 캐노피 · 레드카펫 · 차단봉
    wm.box(c.x, y0 + 4.4, z1 + 2.2, gap + 2, 0.5, 4.4, C(0x111018)); gl.box(c.x, y0 + 4.35, z1 + 4.4, gap + 2, 0.18, 0.1, CS(1, 0.85, 0.3));
    wm.box(c.x, y0 + 0.62, z1 + 4, 4, 0.03, 9, C(0xa01020));
    for (const sx2 of [-2.6, 2.6]) for (let k = 0; k < 4; k++) { wm.cyl(c.x + sx2, y0 + 0.6, z1 + 1.5 + k * 2.2, 0.08, 1, C(0xd8b040), 8); gl.box(c.x + sx2, y0 + 1.4, z1 + 2.6 + k * 2.2, 0.06, 0.06, 2.2, CS(0.9, 0.1, 0.2)); }
    addSign('CLUB NEON', '클럽 네온 · 매일 밤 오픈', '#2a0a4a', c.x, y0 + 7.6, z1 + 0.45, 18, 4.2, 0, '#ff6af0');
    // 지붕: 따로 만든 판 → 안에 들어가면 숨긴다 (카메라가 지붕에 가리지 않게)
    const rf = new THREE.Mesh(new THREE.BoxGeometry(c.w + 0.6, 0.6, c.d + 0.6), new THREE.MeshStandardMaterial({ color: 0x15101e, roughness: 0.9 })); rf.position.set(c.x, y0 + H + 0.3, c.z); rf.castShadow = true; scene.add(rf);
    const rg = new THREE.Mesh(new THREE.BoxGeometry(c.w + 0.8, 0.25, c.d + 0.8), new THREE.MeshBasicMaterial({ color: 0xff3ad8 })); rg.position.set(c.x, y0 + H + 0.1, c.z); scene.add(rg);
    CLUB.roof = [rf, rg]; CLUB.H = H;
    addCollider(x0, z0, x1, z1, y0 + H + 0.6, 'roof', null, y0 + H);
  }
  // casino
  const k = CASINO; addBuildingBox(k.x, k.z, 50, 36, 16, 'glass', C(0xd8b060), { y0: LAND - 0.2 });
  m.box(k.x, LAND + 15.8, k.z, 30, 3, 20, C(0xcfa040));
  mbAt('glow', k.x, k.z).box(k.x, LAND + 4.6, k.z + 18.3, 50.4, 0.35, 0.3, CS(1, 0.75, 0.2)); mbAt('glow', k.x, k.z).box(k.x, LAND + 15.6, k.z + 18.3, 50.4, 0.35, 0.3, CS(1, 0.3, 0.6));
  addSign('CASINO', '카지노 · 잭팟을 노려라', '#3a2000', k.x, LAND + 10, k.z + 18.25, 22, 5.5, 0, '#ffd34a');
  const fk = { id: FACILITIES.length, type: 'casino', name: '카지노', icon: '🎰', region: 'plaza', x: k.x, z: k.z + 21, cx: k.x, cz: k.z, side: 's' }; fk.ring = addDoorRing(fk.x, fk.z, 0xffd34a); FACILITIES.push(fk);
  fk.bld = regBuilding('casino', k.x, k.z, 50, 36, LAND + 16, 's', { fac: fk, door: { x: fk.x, z: fk.z } });
  // stage south
  m.box(0, LAND - 0.2, 120, 30, 1.6, 14, C(0x333340)); addCollider(-15, 113, 15, 127, LAND + 1.4, 'prop');
  addSign('EVENT PLAZA', '이벤트광장', '#c0285a', 0, LAND + 7, 113.2, 18, 4, Math.PI);
  mm.box(-15, LAND, 113, 0.5, 8, 0.5, C(0x333333)); mm.box(15, LAND, 113, 0.5, 8, 0.5, C(0x333333)); mm.box(0, LAND + 8, 113, 30.5, 0.6, 0.6, C(0x333333));
  // benches & trees & lamps
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; BENCHES.push({ x: Math.sin(a) * 30, z: Math.cos(a) * 30, yaw: a + Math.PI }); }
  for (let i = 0; i < 140; i++) {
    const x = wr(-185, 185), z = wr(-185, 185);
    if (Math.abs(x) < 9 || Math.abs(z) < 9 || Math.hypot(x, z) < 34) continue;
    if (x > CLUB.x - CLUB.w / 2 - 4 && x < CLUB.x + CLUB.w / 2 + 4 && z > CLUB.z - CLUB.d / 2 - 4 && z < CLUB.z + CLUB.d / 2 + 4) continue;
    if (x > CASINO.x - 30 && x < CASINO.x + 30 && z > CASINO.z - 22 && z < CASINO.z + 28) continue;
    if (Math.abs(x) < 20 && z > 108 && z < 132) continue;
    TREES.push({ type: wpick(['oak', 'oak', 'cherry', 'birch']), x, z, s: wr(0.85, 1.3) });
  }
  markGrass(CLUB.x - CLUB.w / 2, CLUB.z - CLUB.d / 2, CLUB.x + CLUB.w / 2, CLUB.z + CLUB.d / 2, 0);
  markGrass(CASINO.x - 26, CASINO.z - 19, CASINO.x + 26, CASINO.z + 22, 0);
}
// ================= COUNTRYSIDE (디산베이) =================
function genCountryside() {
  const lots = [];
  const overlaps = (r) => lots.some(o => r.x0 < o.x1 + 4 && r.x1 > o.x0 - 4 && r.z0 < o.z1 + 4 && r.z1 > o.z0 - 4);
  const okRect = (r) => {
    for (const [x, z] of [[r.x0, r.z0], [r.x1, r.z0], [r.x0, r.z1], [r.x1, r.z1], [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2]]) {
      if (roadDistAt(x, z) < 3) return false; if (regionAt(x, z) !== 'disanbay') return false; if (landF(x, z) < 0.995) return false;
      if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 25) return false;
    }
    const hs = [[r.x0, r.z0], [r.x1, r.z0], [r.x0, r.z1], [r.x1, r.z1]].map(([x, z]) => terrainH(x, z));
    if (Math.max(...hs) - Math.min(...hs) > 1.2) return false;
    if (r.x0 < -918 && r.x1 > -930 && r.z0 < -25 && r.z1 > -150) return false; // zoo area
    if (Math.hypot((r.x0 + r.x1) / 2 + 1230, (r.z0 + r.z1) / 2 - 220) < 140) return false; // farm
    return true;
  };
  const cands = [];
  for (const e of EDGES) {
    if (e.region !== 'disanbay') continue; const a = NODES[e.a], b = NODES[e.b];
    const dx = (b.x - a.x) / e.len, dz = (b.z - a.z) / e.len;
    for (let t = 30; t < e.len - 30; t += 34) for (const s of [-1, 1]) cands.push({ e, x: a.x + dx * t, z: a.z + dz * t, px: -dz * s, pz: dx * s, w: e.w });
  }
  cands.sort((p, q) => Math.hypot(p.x + 1050, p.z) - Math.hypot(q.x + 1050, q.z));
  const facs = REGION_FAC.disanbay.slice(); let plots = 0;
  const place = (c, W, D) => {
    const off = c.w / 2 + 4 + D / 2; const cx = c.x + c.px * off, cz = c.z + c.pz * off;
    const r = { x0: cx - W / 2, x1: cx + W / 2, z0: cz - D / 2, z1: cz + D / 2 }; if (!okRect(r) || overlaps(r)) return null;
    lots.push(r); const side = c.px > 0.5 ? 'w' : c.px < -0.5 ? 'e' : c.pz > 0.5 ? 'n' : 's'; r.sides = [side]; return { lot: r, side };
  };
  for (const c of cands) {
    if (facs.length) { const p = place(c, 34, 30); if (p) { const f = facs.shift(); markGrass(p.lot.x0, p.lot.z0, p.lot.x1, p.lot.z1, 0); mbAt('concrete', p.lot.x0, p.lot.z0).box((p.lot.x0 + p.lot.x1) / 2, terrainH((p.lot.x0 + p.lot.x1) / 2, (p.lot.z0 + p.lot.z1) / 2) - 0.45, (p.lot.z0 + p.lot.z1) / 2, 34, 0.5, 30, C(0xc8c4bc), null, { topUV: 6 }); buildFacility(f, p.lot, p.side, 'disanbay'); } continue; }
    if (plots < 4) { const p = place(c, 34, 34); if (p) { plots++; makePlot(p.lot, p.side, 'disanbay'); } continue; }
    if (wrng() < 0.55) { const p = place(c, 18, 16); if (p) { const cx = (p.lot.x0 + p.lot.x1) / 2, cz = (p.lot.z0 + p.lot.z1) / 2; buildHouse(cx, cz, 11, 10, wrng() < 0.4 ? 2 : 1, 'disanbay', terrainH(cx, cz) - 0.3); markGrass(p.lot.x0, p.lot.z0, p.lot.x1, p.lot.z1, 2); } }
  }
  // zoo
  buildZoo(-860, -78, 112, 86, 'disanbay');
  // farm
  const fx = -1230, fz = 220; FARMS.push({ x0: fx - 60, x1: fx + 10, z0: fz - 50, z1: fz + 20, kinds: ['cow', 'cow', 'pig', 'pig', 'horse', 'horse', 'horse', 'chicken', 'chicken', 'chicken', 'sheep', 'sheep'] });
  fenceRect(fx - 60, fz - 50, fx + 10, fz + 20, C(0x8a6a4a), 1.4, 's');
  const bm = mbAt('plain', fx, fz); bm.box(fx + 40, LAND - 0.3, fz - 30, 20, 9, 14, C(0xa8322a)); mbAt('roof', fx, fz).gable(fx + 40, LAND + 8.7, fz - 30, 21, 15, 5, C(0x5a5a5a), 'x'); addCollider(fx + 30, fz - 37, fx + 50, fz - 23, LAND + 14);
  bm.box(fx + 40, LAND - 0.3, fz - 22.95, 6, 5.5, 0.1, C(0xffffff));
  regBuilding('barn', fx + 40, fz - 30, 20, 14, LAND + 14, 's', { noDoorMesh: true });
  bm.cyl(fx + 56, LAND - 0.3, fz - 30, 3.5, 16, C(0xb8bcc0), 16); bm.cyl(fx + 56, LAND + 15.7, fz - 30, 3.6, 2.5, C(0x8a8e92), 16, 0.3); addCircleCollider(fx + 56, fz - 30, 3.6, 'bld', null, LAND + 18);
  // windmill
  const wx = fx + 30, wz = fz + 60; bm.cyl(wx, LAND - 0.3, wz, 3.2, 14, C(0xe8e0d0), 12, 2.2); addCircleCollider(wx, wz, 3.2, 'bld', null, LAND + 15);
  const blades = new THREE.Group(); const bmat = new THREE.MeshStandardMaterial({ color: 0xf0ece0, roughness: 0.8 });
  for (let i = 0; i < 4; i++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.25, 9, 1.6), bmat); bl.position.y = 4.8; const p = new THREE.Group(); p.rotation.z = i * Math.PI / 2; p.add(bl); blades.add(p); }
  blades.position.set(wx, LAND + 13, wz + 2.6); scene.add(blades); ANIMATED.push({ obj: blades, fn: (o, t) => { o.rotation.z = t * 0.6; } });
  // crop fields
  for (const [cx, cz, w, d] of [[fx - 25, fz + 75, 60, 50], [fx - 25, fz + 135, 60, 40], [fx + 55, fz + 120, 40, 60], [-1300, -190, 70, 60], [-1160, -230, 50, 60]]) {
    const y = terrainH(cx, cz); const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 8, uv.getY(i) * d / 8);
    const cols = new Float32Array(g.attributes.position.count * 3).fill(1); const tint = wpick([[1, 1, 1], [1.2, 1.05, 0.5], [0.8, 1.1, 0.8]]); for (let i = 0; i < cols.length; i += 3) { cols[i] = tint[0]; cols[i + 1] = tint[1]; cols[i + 2] = tint[2]; } g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const f = new THREE.Mesh(g, MAT.crop); f.position.set(cx, y + 0.08, cz); f.receiveShadow = true; scene.add(f); markGrass(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, 0);
  }
  // camp site by lake
  bm.box(LAKE.x + 80, terrainH(LAKE.x + 80, LAKE.z) - 0.2, LAKE.z + 70, 8, 0.3, 3, C(0x8a6a4a));
}
// ================= TERRAIN MESH =================
let terrainMesh, waterMesh, waterNormal;
function buildTerrainMesh() {
  const step = 2; const W = Math.floor((HM.W - 1) / step) + 1, H = Math.floor((HM.H - 1) / step) + 1;
  const pos = new Float32Array(W * H * 3), col = new Float32Array(W * H * 3), uv = new Float32Array(W * H * 2);
  const c = new THREE.Color();
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const hi = i * step, hj = j * step; const x = HM.x0 + hi * HM.res, z = HM.z0 + hj * HM.res; const h = hmData[hmIdx(hi, hj)];
    const k = j * W + i; pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z; uv[k * 2] = x / 14; uv[k * 2 + 1] = z / 14;
    const hx = hmData[hmIdx(Math.min(hi + 1, HM.W - 1), hj)] - h, hz = hmData[hmIdx(hi, Math.min(hj + 1, HM.H - 1))] - h; const slope = Math.hypot(hx, hz) / HM.res;
    const R = regionAt(x, z); const n = fbm(x * 0.01, z * 0.01, 3), n2 = vnoise(x * 0.08, z * 0.08);
    let r, g, b;
    const grass = { plaza: [0.36, 0.56, 0.24], disanbay: [0.33, 0.53, 0.2], jiolle: [0.38, 0.54, 0.26], kaengjibe: [0.5, 0.46, 0.3], seoburi: [0.38, 0.5, 0.3], simone: [0.38, 0.6, 0.26], sea: [0.4, 0.58, 0.28] }[R];
    [r, g, b] = grass; r += n * 0.08 + n2 * 0.03; g += n * 0.06 + n2 * 0.04; b += n * 0.03;
    if (R === 'disanbay' && n > 0.2) { r += 0.08; g += 0.02; }
    const rd = roadDistF[hmIdx(hi, hj)];
    if ((R === 'disanbay' || R === 'simone') && rd < 4) { const t = smooth(4, 0, rd); r = lerp(r, 0.45, t); g = lerp(g, 0.4, t); b = lerp(b, 0.32, t); }
    if (slope > 0.55 || h > 70) { const t = Math.max(smooth(0.55, 1.0, slope), smooth(70, 100, h)); r = lerp(r, 0.46 + n * 0.05, t); g = lerp(g, 0.44 + n * 0.05, t); b = lerp(b, 0.42, t); }
    if (h > 118) { const t = smooth(118, 135, h + n * 10); r = lerp(r, 0.95, t); g = lerp(g, 0.96, t); b = lerp(b, 0.98, t); }
    const land = landF(x, z);
    // 모래사장: 섬 전체 해안, 서불리 동쪽 항구 해변, 남북 해안
    if (rd > 6 && h < LAND + 3 && !(R === 'disanbay')) { const cd = coastDist(x, z) + n * 12; const wide = R === 'simone' ? 70 : R === 'seoburi' ? 45 : 30; if (cd < wide) { const t = smooth(wide, wide * 0.5, cd) * smooth(LAND + 3, LAND + 1, h); r = lerp(r, 0.86, t); g = lerp(g, 0.79, t); b = lerp(b, 0.6, t); } }
    if (h < LAND - 0.15 || land < 0.985) { const t = smooth(LAND - 0.1, LAND - 0.9, h); r = lerp(r, 0.86, Math.max(t, land < 0.985 ? 0.9 : 0)); g = lerp(g, 0.78, Math.max(t, land < 0.985 ? 0.9 : 0)); b = lerp(b, 0.58, Math.max(t, land < 0.985 ? 0.9 : 0)); }
    if (h < -0.5) { const t = smooth(-0.5, -8, h); r = lerp(r, 0.45, t); g = lerp(g, 0.5, t); b = lerp(b, 0.42, t); }
    c.setRGB(clamp(r, 0, 1), clamp(g, 0, 1), clamp(b, 0, 1), THREE.SRGBColorSpace);
    col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
  }
  // grass mask fill (on full-res grid)
  for (let j = 0; j < HM.H; j++) for (let i = 0; i < HM.W; i++) {
    const k = hmIdx(i, j); const v = grassMask[k];
    if (v === 2) { grassMask[k] = 1; continue; }
    if (v === 3) { grassMask[k] = 0; continue; }
    const x = HM.x0 + i * HM.res, z = HM.z0 + j * HM.res; const h = hmData[k];
    if (roadDistF[k] < 2.5) { grassMask[k] = 0; continue; }
    const R = regionAt(x, z);
    const ok = h > LAND - 0.1 && h < 95 && landF(x, z) > 0.99 && roadDistF[k] > 2.5 && R !== 'sea';
    const beach = R !== 'disanbay' && h < LAND + 3 && coastDist(x, z) < (R === 'simone' ? 45 : R === 'seoburi' ? 28 : 18);
    grassMask[k] = ok && !beach && !insideAnyBlock(x, z) ? 1 : 0;
  }
  const idx = new Uint32Array((W - 1) * (H - 1) * 6); let p = 0;
  for (let j = 0; j < H - 1; j++) for (let i = 0; i < W - 1; i++) { const a = j * W + i, b = a + 1, c2 = a + W, d = c2 + 1; idx[p++] = a; idx[p++] = c2; idx[p++] = b; idx[p++] = b; idx[p++] = c2; idx[p++] = d; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals();
  const det = canvasTex(256, 256, (x, w, h) => { const id = x.createImageData(w, h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const v = 200 + (fbm(i * 0.06, j * 0.06, 3) * 40 + Math.random() * 30); const o = (j * w + i) * 4; id.data[o] = id.data[o + 1] = id.data[o + 2] = clamp(v, 0, 255); id.data[o + 3] = 255; } x.putImageData(id, 0, 0); }, { srgb: false });
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: det, roughness: 0.96, metalness: 0 });
  terrainMesh = new THREE.Mesh(g, mat); terrainMesh.receiveShadow = true; terrainMesh.matrixAutoUpdate = false; scene.add(terrainMesh);
}
let _blockGrid = null;
function insideAnyBlock(x, z) {
  if (!_blockGrid) { _blockGrid = new Map(); for (const b of BLOCKS) for (let i = Math.floor(b.x0 / 100); i <= Math.floor(b.x1 / 100); i++) for (let j = Math.floor(b.z0 / 100); j <= Math.floor(b.z1 / 100); j++) { const k = i * 1000 + j; if (!_blockGrid.has(k)) _blockGrid.set(k, []); _blockGrid.get(k).push(b); } }
  const a = _blockGrid.get(Math.floor(x / 100) * 1000 + Math.floor(z / 100)); if (!a) return false; for (const b of a) if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) return true; return false;
}
function buildWater() {
  const S = 256;
  const hgt = new Float32Array(S * S); for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { let v = 0; for (let o = 0; o < 4; o++) { const f = 4 << o; v += Math.sin((i / S) * TAU * f + Math.cos((j / S) * TAU * (f / 2)) * 2 + o) * Math.cos((j / S) * TAU * f - o * 1.3) / (1 + o); } hgt[j * S + i] = v; }
  waterNormal = canvasTex(S, S, (x) => { const id = x.createImageData(S, S); for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const l = hgt[j * S + ((i + S - 1) % S)], r = hgt[j * S + ((i + 1) % S)], u = hgt[((j + S - 1) % S) * S + i], d = hgt[((j + 1) % S) * S + i]; const nx = (l - r) * 0.5, nz = (u - d) * 0.5, ny = 1; const L = Math.hypot(nx, ny, nz); const o = (j * S + i) * 4; id.data[o] = (nx / L * 0.5 + 0.5) * 255; id.data[o + 1] = (nz / L * 0.5 + 0.5) * 255; id.data[o + 2] = (ny / L * 0.5 + 0.5) * 255; id.data[o + 3] = 255; } x.putImageData(id, 0, 0); }, { srgb: false });
  waterNormal.repeat.set(160, 120);
  const mat = new THREE.MeshStandardMaterial({ color: 0x1a5f7a, roughness: 0.08, metalness: 0.2, normalMap: waterNormal, normalScale: new THREE.Vector2(0.35, 0.35), transparent: true, opacity: 0.88 });
  waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(9000, 7000), mat); waterMesh.rotation.x = -Math.PI / 2; waterMesh.position.set(400, 0, 0); waterMesh.receiveShadow = true; scene.add(waterMesh);
}
// ================= TREES =================
const TREE_GEO = {}; let treeMeshes = [];
function buildTreeGeos() {
  const jitter = (g, amt, seed) => { const p = g.attributes.position; const r = mulberry32(seed); const map = new Map(); for (let i = 0; i < p.count; i++) { const k = p.getX(i).toFixed(3) + p.getY(i).toFixed(3) + p.getZ(i).toFixed(3); if (!map.has(k)) map.set(k, [(r() - .5) * amt, (r() - .5) * amt, (r() - .5) * amt]); const d = map.get(k); p.setXYZ(i, p.getX(i) + d[0], p.getY(i) + d[1], p.getZ(i) + d[2]); } g.computeVertexNormals(); return g; };
  const merge = (parts) => { const gs = parts.map(([g, x, y, z, s]) => { const c = g.clone(); if (c.index) { const nc = c.toNonIndexed(); c.dispose(); return nc.scale(s[0], s[1], s[2]).translate(x, y, z); } return c.scale(s[0], s[1], s[2]).translate(x, y, z); }); const out = mergeGeos(gs); out.computeVertexNormals(); return out; };
  const ico = (d) => new THREE.IcosahedronGeometry(1, d);
  TREE_GEO.oak = { trunk: new THREE.CylinderGeometry(0.22, 0.38, 4, 7).translate(0, 2, 0), leaf: jitter(merge([[ico(1), 0, 5.2, 0, [2.6, 2.2, 2.6]], [ico(1), 1.3, 4.6, 0.6, [1.8, 1.6, 1.8]], [ico(1), -1.2, 4.8, -0.5, [1.9, 1.7, 1.9]], [ico(1), 0.2, 6.3, -0.8, [1.6, 1.4, 1.6]]]), 0.35, 7), leafCol: [0x3d7a2a, 0x4a8a30, 0x568f2e, 0x2f6a24], trunkCol: 0x5a4030 };
  TREE_GEO.cherry = { trunk: TREE_GEO.oak.trunk, leaf: TREE_GEO.oak.leaf, leafCol: [0xf2a6c8, 0xf7bcd6, 0xeaa0c0], trunkCol: 0x4a3028 };
  TREE_GEO.birch = { trunk: new THREE.CylinderGeometry(0.15, 0.22, 7, 6).translate(0, 3.5, 0), leaf: jitter(merge([[ico(1), 0, 6.5, 0, [1.6, 2.6, 1.6]], [ico(1), 0.5, 5.2, 0.3, [1.3, 1.6, 1.3]]]), 0.3, 9), leafCol: [0x8ab83a, 0x9ac84a, 0x7aa832], trunkCol: 0xe8e4dc };
  const pine = []; for (let i = 0; i < 4; i++) pine.push([new THREE.ConeGeometry(1, 1, 8), 0, 3 + i * 1.7, 0, [2.6 - i * 0.55, 3.2, 2.6 - i * 0.55]]);
  TREE_GEO.pine = { trunk: new THREE.CylinderGeometry(0.18, 0.3, 4, 6).translate(0, 2, 0), leaf: jitter(merge(pine), 0.15, 3), leafCol: [0x1f4d2a, 0x285a30, 0x1a4024], trunkCol: 0x4a3426 };
  const fr = []; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; const g = new THREE.BoxGeometry(0.9, 0.08, 3.6); g.translate(0, 0, 1.8); g.rotateX(0.45); g.rotateY(a); fr.push([g, 0, 8.4, 0, [1, 1, 1]]); }
  TREE_GEO.palm = { trunk: merge([[new THREE.CylinderGeometry(0.2, 0.32, 8.6, 7), 0.25, 4.3, 0, [1, 1, 1]]]), leaf: merge(fr), leafCol: [0x3a8a2a, 0x4a9a32, 0x2e7a22], trunkCol: 0x8a7050 };
  TREE_GEO.acacia = { trunk: new THREE.CylinderGeometry(0.2, 0.3, 5, 6).translate(0, 2.5, 0), leaf: jitter(merge([[ico(1), 0, 5.6, 0, [3.6, 0.9, 3.6]]]), 0.3, 4), leafCol: [0x6a8a2a, 0x7a9a3a], trunkCol: 0x5a4434 };
  TREE_GEO.bush = { trunk: null, leaf: jitter(merge([[ico(1), 0, 0.6, 0, [1.3, 0.9, 1.3]], [ico(1), 0.7, 0.5, 0.3, [0.8, 0.7, 0.8]]]), 0.2, 5), leafCol: [0x3a6a28, 0x4a7a2a, 0x2a5a22] };
  TREE_GEO.rock = { trunk: null, leaf: jitter(new THREE.DodecahedronGeometry(1, 1), 0.35, 8), leafCol: [0x7a7872, 0x8a8680, 0x6a6862] };
  // 잎에 자연스러운 음영(아래·안쪽은 어둡고 위·바깥은 밝게) + 잎 덩어리마다 색 변화 → 버텍스 컬러 (인스턴스 색과 곱해진다)
  for (const k in TREE_GEO) { const T = TREE_GEO[k]; if (!T.leaf || T.leaf.attributes.color) continue; const g = T.leaf; g.computeBoundingBox(); const bb = g.boundingBox; const p = g.attributes.position, n = g.attributes.normal; const col = new Float32Array(p.count * 3); const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2, hy = Math.max(0.01, bb.max.y - bb.min.y), rr = Math.max(0.01, Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) / 2);
    for (let i = 0; i < p.count; i++) { const ty = (p.getY(i) - bb.min.y) / hy; const rad = Math.min(1, Math.hypot(p.getX(i) - cx, p.getZ(i) - cz) / rr); const up = n ? n.getY(i) : 0; const h = Math.sin(i * 12.9898 + k.length * 78.233) * 43758.5453; const nz = (h - Math.floor(h)) * 0.12; let v = k === 'rock' ? 0.8 + up * 0.15 + nz : 0.55 + ty * 0.35 + rad * 0.12 + up * 0.08 + nz; v = Math.min(1.12, v); col[i * 3] = v * (k === 'rock' ? 1 : 0.97); col[i * 3 + 1] = v; col[i * 3 + 2] = v * (k === 'rock' ? 1 : 0.9); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
  // 굵은 가지 (참나무·벚나무) — 줄기에 합친다
  { const br = []; for (let i = 0; i < 3; i++) { const b = new THREE.CylinderGeometry(0.07, 0.13, 1.8, 5); b.translate(0, 0.9, 0); b.rotateZ(0.75); b.rotateY(i * 2.1 + 0.4); b.translate(0, 3.0 + i * 0.35, 0); br.push(b.toNonIndexed()); } const tr = TREE_GEO.oak.trunk.toNonIndexed(); const m2 = mergeAttrGeos([tr, ...br]); TREE_GEO.oak.trunk = m2; TREE_GEO.cherry.trunk = m2; }
}
function mergeGeos(gs) {
  let n = 0; for (const g of gs) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3); let o = 0; for (const g of gs) { pos.set(g.attributes.position.array, o); o += g.attributes.position.count * 3; }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); return out;
}
function genTrees() {
  buildTreeGeos();
  const q = Q().trees;
  // forest in disanbay + mountains, scattered elsewhere
  for (let z = -1080; z < 1080; z += 9) for (let x = -1480; x < -700; x += 9) {
    const jx = x + (hash2(x, z) - 0.5) * 8, jz = z + (hash2(z, x) - 0.5) * 8;
    const f = fbm(jx * 0.005 + 3, jz * 0.005, 3); if (f < 0.05) continue; if (hash2(x * 3, z * 7) > q * (0.35 + f)) continue;
    const h = terrainH(jx, jz); if (h < LAND + 0.2 || h > 112) continue; if (roadDistAt(jx, jz) < 9) continue; if (!isGrassAt(jx, jz)) continue;
    if (Math.hypot(jx - LAKE.x, jz - LAKE.z) < LAKE.r + 8) continue;
    let skip = false; for (const fz of FLAT) if (distSeg(jx, jz, fz.a[0], fz.a[1], fz.b[0], fz.b[1]) < fz.r - 10) { skip = true; break; } if (skip) continue;
    TREES.push({ type: h > 45 ? 'pine' : (hash2(x, z * 3) < 0.25 ? 'birch' : hash2(x * 5, z) < 0.6 ? 'oak' : 'pine'), x: jx, z: jz, s: 0.8 + hash2(x * 11, z * 13) * 0.6 });
  }
  // island palms + scattered
  for (let i = 0; i < 700 * q; i++) {
    const a = wr(0, TAU), rr = Math.sqrt(wrng()) ; const x = 2000 + Math.sin(a) * 400 * rr, z = 560 + Math.cos(a) * 490 * rr;
    const h = terrainH(x, z); if (h < LAND - 0.6 || roadDistAt(x, z) < 6 || insideAnyBlock(x, z)) continue;
    TREES.push({ type: rr > 0.8 || wrng() < 0.6 ? 'palm' : 'oak', x, z, s: wr(0.8, 1.2) });
  }
  // grass areas in cities outside blocks (jiolle/kaengjibe edges, between regions)
  for (let i = 0; i < 1500 * q; i++) {
    const x = wr(-700, 1350), z = wr(-1080, 1080); const R = regionAt(x, z); if (R === 'plaza' || R === 'sea') continue;
    if (!isGrassAt(x, z) || roadDistAt(x, z) < 6 || insideAnyBlock(x, z)) continue; if (terrainH(x, z) < LAND - 0.1) continue;
    TREES.push({ type: wpick(['oak', 'birch', 'pine', 'bush']), x, z, s: wr(0.7, 1.2) });
  }
  // bushes & rocks in disanbay
  for (let i = 0; i < 1600 * q; i++) {
    const x = wr(-1480, -720), z = wr(-1080, 1080); const h = terrainH(x, z); if (h < LAND || roadDistAt(x, z) < 5 || !isGrassAt(x, z)) continue;
    TREES.push({ type: h > 50 || wrng() < 0.3 ? 'rock' : 'bush', x, z, s: wr(0.6, 1.8) });
  }
}
function buildTreeInstances() {
  const groups = new Map(); // chunk|type -> list
  for (let i = 0; i < TREES.length; i++) {
    const t = TREES[i]; t.idx = i; t.y = terrainH(t.x, t.z) - 0.1; t.alive = true; t.hp = t.type === 'rock' ? 99 : t.type === 'bush' ? 1 : 4;
    const k = Math.floor(t.x / 300) + ',' + Math.floor(t.z / 300) + '|' + t.type; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(t);
    if (t.type !== 'bush' && !t.noCollide) t.col = addCircleCollider(t.x, t.z, t.type === 'rock' ? 0.9 * t.s : 0.35 * t.s, t.type === 'rock' ? 'rock' : 'tree', t, t.y + 6);
  }
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s4 = new THREE.Vector3(), p4 = new THREE.Vector3(), c = new THREE.Color();
  const leafMat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, flatShading: false, vertexColors: true });
  const trunkMat = new THREE.MeshStandardMaterial({ roughness: 0.95 });
  for (const [k, list] of groups) {
    const type = k.split('|')[1]; const G = TREE_GEO[type];
    const leaf = new THREE.InstancedMesh(G.leaf, type === 'rock' ? new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true, vertexColors: true }) : leafMat, list.length);
    const trunk = G.trunk ? new THREE.InstancedMesh(G.trunk, trunkMat, list.length) : null;
    list.forEach((t, i) => {
      const r = hash2(Math.floor(t.x * 10), Math.floor(t.z * 10));
      q4.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r * TAU); const s = t.s; s4.set(s, s * (0.9 + r * 0.25), s); p4.set(t.x, t.y, t.z);
      m4.compose(p4, q4, s4); leaf.setMatrixAt(i, m4); if (trunk) trunk.setMatrixAt(i, m4);
      c.set(G.leafCol[Math.floor(r * G.leafCol.length)]); c.offsetHSL(0, 0, (r - 0.5) * 0.08); leaf.setColorAt(i, c);
      if (trunk) { c.set(G.trunkCol); trunk.setColorAt(i, c); }
      t.mesh = { leaf, trunk, i };
    });
    for (const im of [leaf, trunk]) { if (!im) continue; im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); scene.add(im); treeMeshes.push(im); }
  }
}
const _hideM = new THREE.Matrix4().makeScale(0, 0, 0);
function setTreeVisible(t, v) {
  const m4 = new THREE.Matrix4(); const r = hash2(Math.floor(t.x * 10), Math.floor(t.z * 10));
  if (v) { m4.compose(new THREE.Vector3(t.x, t.y, t.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r * TAU), new THREE.Vector3(t.s, t.s * (0.9 + r * 0.25), t.s)); } else m4.copy(_hideM);
  t.mesh.leaf.setMatrixAt(t.mesh.i, m4); t.mesh.leaf.instanceMatrix.needsUpdate = true;
  if (t.mesh.trunk) { t.mesh.trunk.setMatrixAt(t.mesh.i, m4); t.mesh.trunk.instanceMatrix.needsUpdate = true; }
  if (t.col) t.col.on = v; t.alive = v;
}
// ================= STREET PROPS =================
let lampHeads, trafficLightMesh, tlBulbs;
function buildStreetProps() {
  const lampPos = [];
  for (const e of EDGES) {
    const a = NODES[e.a], b = NODES[e.b]; const R = e.region || regionAt((a.x + b.x) / 2, (a.z + b.z) / 2);
    const dx = (b.x - a.x) / e.len, dz = (b.z - a.z) / e.len; const px = -dz, pz = dx;
    const city = R === 'seoburi' || R === 'jiolle' || R === 'kaengjibe' || R === 'simone' || R === 'plaza';
    const spacing = e.bridge ? 30 : city ? 32 : 60;
    for (let t = e.w + 6; t < e.len - e.w - 2; t += spacing) for (const s of [-1, 1]) {
      if (!city && !e.bridge && s > 0) continue;
      const off = e.w / 2 + (e.bridge ? 0.2 : 1.3); const x = a.x + dx * t + px * off * s, z = a.z + dz * t + pz * off * s;
      lampPos.push({ x, z, y: groundHeight(x, z) - 0.02, yaw: Math.atan2(-px * s, -pz * s) });
      // street trees between lamps
      if (city && !e.bridge && R !== 'kaengjibe' && wrng() < 0.6) { const tt = t + spacing / 2; if (tt < e.len - e.w - 2) { const tx = a.x + dx * tt + px * off * s, tz = a.z + dz * tt + pz * off * s; TREES.push({ type: R === 'simone' ? 'palm' : wpick(['oak', 'birch', 'birch']), x: tx, z: tz, s: wr(0.45, 0.62) }); } }
      // parked cars
      if (city && !e.bridge && wrng() < 0.09) { const po = e.w / 2 - 1.3; PARKED.push({ x: a.x + dx * (t + 8) + px * po * s, z: a.z + dz * (t + 8) + pz * po * s, yaw: Math.atan2(dx * s, dz * s), region: R }); }
    }
  }
  LAMPS.push(...lampPos);
  const poleG = new THREE.CylinderGeometry(0.09, 0.13, 7.4, 6).translate(0, 3.7, 0);
  const armG = new THREE.BoxGeometry(0.12, 0.12, 2.2).translate(0, 7.3, 1.0);
  const headG = new THREE.BoxGeometry(0.5, 0.18, 0.9).translate(0, 7.2, 2.0);
  const poleM = new THREE.MeshStandardMaterial({ color: 0x3a3e44, metalness: 0.6, roughness: 0.45 });
  const pole = new THREE.InstancedMesh(mergeAttrGeos([poleG, armG]), poleM, lampPos.length);
  lampHeads = new THREE.InstancedMesh(headG, new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffd9a0, emissiveIntensity: 0 }), lampPos.length);
  const m4 = new THREE.Matrix4();
  lampPos.forEach((l, i) => { m4.makeRotationY(l.yaw); m4.setPosition(l.x, l.y, l.z); pole.setMatrixAt(i, m4); lampHeads.setMatrixAt(i, m4); addCircleCollider(l.x, l.z, 0.2, 'pole', null, l.y + 7); });
  pole.castShadow = true; scene.add(pole, lampHeads); pole.computeBoundingSphere(); lampHeads.computeBoundingSphere();
  // traffic lights
  const tls = []; for (const n of NODES) if (n.light) { const s = Math.max(...n.edges.map(e => EDGES[e].w)) / 2 + 1.2; for (const [sx, sz, yaw] of [[1, 1, 0], [-1, -1, Math.PI], [1, -1, Math.PI / 2], [-1, 1, -Math.PI / 2]]) tls.push({ x: n.x + sx * s, z: n.z + sz * s, yaw, axis: (Math.abs(yaw) === Math.PI / 2) ? 'x' : 'z', y: groundHeight(n.x, n.z) }); }
  const tpole = new THREE.InstancedMesh(mergeAttrGeos([new THREE.CylinderGeometry(0.1, 0.12, 5, 6).translate(0, 2.5, 0), new THREE.BoxGeometry(0.4, 1.2, 0.35).translate(0, 4.6, 0.25)]), poleM, tls.length);
  tlBulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 8, 6).translate(0, 4.6, 0.45), new THREE.MeshBasicMaterial({ color: 0xffffff }), tls.length);
  tls.forEach((l, i) => { m4.makeRotationY(l.yaw); m4.setPosition(l.x, l.y, l.z); tpole.setMatrixAt(i, m4); tlBulbs.setMatrixAt(i, m4); tlBulbs.setColorAt(i, new THREE.Color(0x00ff66)); addCircleCollider(l.x, l.z, 0.2, 'pole', null, l.y + 5); });
  tpole.castShadow = true; tpole.computeBoundingSphere(); tlBulbs.computeBoundingSphere(); scene.add(tpole, tlBulbs); tlBulbs.userData.list = tls;
  // benches
  const benchG = mergeAttrGeos([new THREE.BoxGeometry(1.8, 0.08, 0.5).translate(0, 0.45, 0), new THREE.BoxGeometry(1.8, 0.45, 0.08).translate(0, 0.72, -0.24), new THREE.BoxGeometry(0.08, 0.45, 0.45).translate(-0.8, 0.22, 0), new THREE.BoxGeometry(0.08, 0.45, 0.45).translate(0.8, 0.22, 0)]);
  const bench = new THREE.InstancedMesh(benchG, new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.8 }), BENCHES.length);
  BENCHES.forEach((b, i) => { b.y = groundHeight(b.x, b.z); m4.makeRotationY(b.yaw); m4.setPosition(b.x, b.y, b.z); bench.setMatrixAt(i, m4); });
  bench.castShadow = true; bench.computeBoundingSphere(); scene.add(bench);
  buildTreeInstances();
}
function mergeAttrGeos(gs) {
  const parts = gs.map(g => g.index ? g.toNonIndexed() : g);
  let n = 0; for (const g of parts) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
  for (const g of parts) { pos.set(g.attributes.position.array, o); nor.set(g.attributes.normal.array, o); o += g.attributes.position.count * 3; }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); return out;
}
// ================= GRASS (instanced, follows camera) =================
let grassMesh = null, grassCenter = { x: 1e9, z: 1e9 }, grassUniforms = { time: { value: 0 } };
function buildGrass() {
  const N = Q().grass; if (!N) return;
  const g = new THREE.BufferGeometry();
  const w = 0.045, h = 0.42; const pos = [-w, 0, 0, w, 0, 0, -w * 0.6, h * 0.5, 0, w * 0.6, h * 0.5, 0, 0, h, 0];
  const idx = [0, 1, 2, 2, 1, 3, 2, 3, 4];
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0.3, 0, 1, 0.3, 0, 1, 0.3, 0, 1, 0.3, 0, 1, 0.3], 3));
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.time = grassUniforms.time;
    sh.vertexShader = 'uniform float time;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 wp = instanceMatrix * vec4(0.,0.,0.,1.);
      float k = position.y / 0.42; k = k*k;
      float wv = sin(time*1.7 + wp.x*0.35 + wp.z*0.25) * 0.5 + sin(time*2.9 + wp.x*0.8) * 0.2;
      transformed.x += wv * 0.18 * k; transformed.z += wv * 0.08 * k;`);
  };
  grassMesh = new THREE.InstancedMesh(g, mat, N); grassMesh.frustumCulled = false; grassMesh.receiveShadow = true;
  grassMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(grassMesh);
  grassMesh.count = 0;
}
function updateGrass(cx, cz) {
  if (!grassMesh) return; if (Math.hypot(cx - grassCenter.x, cz - grassCenter.z) < 7) return;
  grassCenter.x = cx; grassCenter.z = cz;
  const N = Q().grass; const R = Math.sqrt(N / 5.5 / Math.PI); const sp = 0.42;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
  let n = 0;
  const i0 = Math.floor((cx - R) / sp), i1 = Math.ceil((cx + R) / sp), j0 = Math.floor((cz - R) / sp), j1 = Math.ceil((cz + R) / sp);
  for (let j = j0; j <= j1 && n < N; j++) for (let i = i0; i <= i1 && n < N; i++) {
    const r1 = hash2(i, j), r2 = hash2(j * 7, i * 3);
    const x = i * sp + (r1 - 0.5) * sp, z = j * sp + (r2 - 0.5) * sp; const dd = (x - cx) ** 2 + (z - cz) ** 2; if (dd > R * R) continue;
    if (!isGrassAt(x, z)) continue; if (dd > R * R * 0.6 && r1 > 0.5) continue;
    const y = terrainH(x, z); if (y < LAND - 0.3) continue;
    q.setFromAxisAngle(up, r1 * TAU); const sc = 0.55 + r2 * 0.8; s.set(1 + r1 * 0.6, sc, 1); p.set(x, y - 0.02, z); m4.compose(p, q, s); grassMesh.setMatrixAt(n, m4);
    const flower = r1 * r2 > 0.86 && regionAt(x, z) === 'disanbay';
    if (flower) c.setHSL(r2 > 0.95 ? 0.9 : r1 > 0.95 ? 0.15 : 0.0, 0.8, 0.6); else { const reg = regionAt(x, z); const dry = reg === 'kaengjibe' ? 0.12 : reg === 'disanbay' && r2 > 0.7 ? 0.06 : 0; c.setRGB(0.24 + r1 * 0.1 + dry, 0.44 + r2 * 0.14, 0.13 + r1 * 0.05, THREE.SRGBColorSpace); }
    grassMesh.setColorAt(n, c); n++;
  }
  grassMesh.count = n; grassMesh.instanceMatrix.needsUpdate = true; if (grassMesh.instanceColor) grassMesh.instanceColor.needsUpdate = true;
}
