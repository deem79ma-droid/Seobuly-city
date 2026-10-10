
// ================= CHARACTERS =================
const OPT = {
  body: [['m', '남성형'], ['f', '여성형']],
  skin: ['#f8dcc8', '#f0c6a6', '#e0aa84', '#c48a62', '#9a6644', '#6a4430'],
  hair: [['short', '숏컷'], ['buzz', '반삭'], ['long', '장발'], ['ponytail', '포니테일'], ['bob', '단발'], ['curly', '곱슬'], ['spiky', '스파이키'], ['mohawk', '모히칸'], ['bald', '삭발']],
  hairColor: ['#1a1412', '#3a2418', '#6a4024', '#a87038', '#e0c070', '#c8c8c8', '#d04060', '#4060d0', '#f0f0f0'],
  top: [['tshirt', '반팔티'], ['long', '긴팔티'], ['hoodie', '후드티'], ['jacket', '재킷'], ['tank', '나시'], ['suit', '정장'], ['police', '경찰복'], ['doctor', '의사 가운'], ['vest', '조끼(작업복)']],
  bottom: [['jeans', '청바지'], ['slacks', '슬랙스'], ['cargo', '카고바지'], ['shorts', '반바지'], ['skirt', '치마']],
  hat: [['none', '없음'], ['cap', '야구모자'], ['beanie', '비니'], ['fedora', '중절모'], ['helmet', '안전모'], ['police', '경찰모'], ['bandana', '두건']],
  glasses: [['none', '없음'], ['glasses', '안경'], ['sunglasses', '선글라스']],
  beard: [['none', '없음'], ['stubble', '수염 자국'], ['full', '턱수염']],
};
const COLORS_CLOTH = ['#f2f2f2', '#1c1c22', '#d03a3a', '#3a6ad0', '#3aa060', '#e0b030', '#8a4ad0', '#e06aa0', '#2a2a4a', '#6a4a2a', '#a8b4c0', '#ff7a2a', '#20b0b0', '#5a6a3a'];
function randomOutfit(r = Math.random, kind = 'civ') {
  const p = a => a[Math.floor(r() * a.length)]; const v = a => p(a)[0] ?? p(a);
  const body = r() < 0.5 ? 'm' : 'f';
  const o = {
    body, skin: p(OPT.skin), hair: body === 'f' ? p(['long', 'ponytail', 'bob', 'curly', 'short']) : p(['short', 'buzz', 'spiky', 'curly', 'short', 'mohawk', 'bald']),
    hairColor: p(OPT.hairColor.slice(0, 6)), top: p(['tshirt', 'long', 'hoodie', 'jacket', 'tank', 'tshirt', 'suit']), topColor: p(COLORS_CLOTH),
    bottom: body === 'f' ? p(['jeans', 'skirt', 'slacks', 'shorts']) : p(['jeans', 'slacks', 'cargo', 'shorts']), bottomColor: p(['#2a3a5a', '#1c1c22', '#5a4a3a', '#8a8a90', '#3a4a6a', '#c8b89a']),
    shoes: p(['#1a1a1a', '#f0f0f0', '#6a3a1a', '#d03a3a', '#3a6ad0']), hat: r() < 0.25 ? p(['cap', 'beanie', 'fedora']) : 'none', hatColor: p(COLORS_CLOTH),
    glasses: r() < 0.2 ? p(['glasses', 'sunglasses']) : 'none', beard: body === 'm' && r() < 0.25 ? p(['stubble', 'full']) : 'none',
  };
  if (kind === 'police') Object.assign(o, { top: 'police', topColor: '#22305a', bottom: 'slacks', bottomColor: '#1a2240', hat: 'police', hatColor: '#1a2240', shoes: '#111111' });
  if (kind === 'doctor') Object.assign(o, { top: 'doctor', topColor: '#ffffff', bottom: 'slacks', bottomColor: '#4a6a8a', hat: 'none' });
  if (kind === 'gangA') Object.assign(o, { top: p(['hoodie', 'tank', 'jacket']), topColor: '#c42020', hat: p(['bandana', 'cap', 'none']), hatColor: '#c42020', bottom: p(['jeans', 'cargo']), bottomColor: '#1a1a1a', body: 'm', hair: p(['buzz', 'spiky', 'bald', 'mohawk']), beard: p(['none', 'stubble']) });
  if (kind === 'gangB') Object.assign(o, { top: p(['hoodie', 'tank', 'jacket']), topColor: '#2050d0', hat: p(['bandana', 'cap', 'none']), hatColor: '#2050d0', bottom: p(['jeans', 'cargo']), bottomColor: '#1a1a1a', body: 'm', hair: p(['buzz', 'spiky', 'bald', 'short']), beard: p(['none', 'full']) });
  if (kind === 'worker') Object.assign(o, { top: 'vest', topColor: '#ff8a1a', hat: 'helmet', hatColor: '#ffcc00', bottom: 'cargo', bottomColor: '#3a4a6a' });
  return o;
}
const _matCache = new Map();
function cmat(color, rough = 0.8, metal = 0, extra = '') {
  const k = color + '|' + rough + '|' + metal + extra; let m = _matCache.get(k);
  if (!m) { m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: rough, metalness: metal }); if (extra === 'emis') { m.emissive = new THREE.Color(color); m.emissiveIntensity = 1; } _matCache.set(k, m); }
  return m;
}
const CG = {}; // char geometry cache
function initCharGeo() {
  if (CG.done) return; CG.done = true;
  CG.chest = new THREE.CapsuleGeometry(0.15, 0.28, 6, 14);
  CG.pelvis = new THREE.SphereGeometry(0.16, 14, 10);
  CG.neck = new THREE.CylinderGeometry(0.052, 0.06, 0.12, 10);
  CG.head = new THREE.SphereGeometry(0.115, 22, 18);
  CG.uarm = new THREE.CapsuleGeometry(0.052, 0.19, 4, 10);
  CG.farm = new THREE.CapsuleGeometry(0.045, 0.17, 4, 10);
  CG.hand = new THREE.SphereGeometry(0.048, 10, 8);
  CG.thigh = new THREE.CapsuleGeometry(0.074, 0.29, 4, 12);
  CG.shin = new THREE.CapsuleGeometry(0.058, 0.3, 4, 10);
  CG.foot = new THREE.BoxGeometry(0.1, 0.07, 0.25); CG.foot.translate(0, 0, 0.05);
  CG.eyeW = new THREE.SphereGeometry(0.02, 10, 8); CG.pupil = new THREE.SphereGeometry(0.0115, 8, 6);
  CG.brow = new THREE.BoxGeometry(0.045, 0.009, 0.012); CG.mouth = new THREE.BoxGeometry(0.045, 0.009, 0.01);
  CG.nose = new THREE.ConeGeometry(0.018, 0.045, 8); CG.nose.rotateX(Math.PI / 2 + 0.3);
  CG.ear = new THREE.SphereGeometry(0.028, 8, 6);
  CG.cap = (t, r = 0.125) => new THREE.SphereGeometry(r, 18, 12, 0, TAU, 0, Math.PI * t);
  CG.box = new THREE.BoxGeometry(1, 1, 1);
  CG.cyl = new THREE.CylinderGeometry(1, 1, 1, 14);
  CG.sph = new THREE.SphereGeometry(1, 12, 10);
  CG.cone = new THREE.ConeGeometry(1, 1, 10);
  CG.skirt = new THREE.CylinderGeometry(0.17, 0.3, 0.42, 16, 1, true);
  CG.coat = new THREE.CylinderGeometry(0.19, 0.26, 0.55, 16, 1, true, -Math.PI * 0.85, Math.PI * 1.7);
}
function M(geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); return m; }
// ---- weapons ----
const WEAPONS = {
  fist: { name: '주먹', melee: true, dmg: 12, range: 1.7, rate: 0.36, icon: '👊' },
  bat: { name: '야구방망이', melee: true, dmg: 26, range: 2.1, rate: 0.6, price: 800, icon: '🏏' },
  axe: { name: '도끼', melee: true, dmg: 40, range: 2.3, rate: 0.75, price: 1500, icon: '🪓', chop: true },
  pistol: { name: '권총', dmg: 22, range: 120, rate: 0.28, mag: 12, price: 4000, ammoPrice: 300, spread: 0.012, sfx: 'pistol', icon: '🔫' },
  smg: { name: '기관단총', dmg: 14, range: 110, rate: 0.085, mag: 30, auto: true, price: 9000, ammoPrice: 500, spread: 0.03, sfx: 'smg', icon: '🔫' },
  shotgun: { name: '산탄총', dmg: 13, pellets: 8, range: 45, rate: 0.85, mag: 6, price: 12000, ammoPrice: 600, spread: 0.07, sfx: 'shotgun', icon: '🔫' },
  rifle: { name: '돌격소총', dmg: 26, range: 220, rate: 0.12, mag: 30, auto: true, price: 22000, ammoPrice: 800, spread: 0.014, sfx: 'rifle', icon: '🔫' },
  sniper: { name: '저격소총', dmg: 95, range: 600, rate: 1.3, mag: 5, price: 40000, ammoPrice: 1200, spread: 0.0, sfx: 'sniper', icon: '🎯', scope: true },
};
const WEAPON_ORDER = ['fist', 'bat', 'axe', 'pistol', 'smg', 'shotgun', 'rifle', 'sniper'];
function buildWeaponMesh(type) {
  const g = new THREE.Group(); const dark = cmat('#1c1d20', 0.4, 0.7), metal = cmat('#6a6e74', 0.3, 0.9), wood = cmat('#6a4228', 0.7), grip = cmat('#2a2420', 0.8);
  const B = (mat, x, y, z, sx, sy, sz) => g.add(M(CG.box, mat, x, y, z, sx, sy, sz));
  if (type === 'pistol') { B(dark, 0, 0.03, 0.08, 0.035, 0.05, 0.2); B(grip, 0, -0.04, 0.0, 0.032, 0.11, 0.05); g.userData.muzzle = new THREE.Vector3(0, 0.03, 0.19); }
  if (type === 'smg') { B(dark, 0, 0.03, 0.1, 0.045, 0.07, 0.3); B(grip, 0, -0.05, 0.02, 0.035, 0.1, 0.05); B(dark, 0, -0.07, 0.12, 0.03, 0.14, 0.04); B(metal, 0, 0.03, 0.28, 0.02, 0.02, 0.1); g.userData.muzzle = new THREE.Vector3(0, 0.03, 0.34); }
  if (type === 'shotgun') { B(wood, 0, 0.0, -0.12, 0.05, 0.08, 0.28); B(metal, 0, 0.03, 0.25, 0.045, 0.045, 0.62); B(wood, 0, 0.0, 0.2, 0.055, 0.05, 0.18); B(grip, 0, -0.05, -0.02, 0.035, 0.1, 0.05); g.userData.muzzle = new THREE.Vector3(0, 0.03, 0.57); }
  if (type === 'rifle') { B(dark, 0, 0.02, 0.1, 0.05, 0.08, 0.5); B(dark, 0, 0.0, -0.22, 0.045, 0.09, 0.2); B(metal, 0, 0.03, 0.42, 0.022, 0.022, 0.2); B(dark, 0, -0.08, 0.12, 0.035, 0.14, 0.06); B(grip, 0, -0.06, -0.03, 0.035, 0.1, 0.05); B(dark, 0, 0.08, 0.1, 0.02, 0.03, 0.12); g.userData.muzzle = new THREE.Vector3(0, 0.03, 0.52); }
  if (type === 'sniper') { B(wood, 0, 0.0, 0.0, 0.05, 0.08, 0.6); B(metal, 0, 0.03, 0.5, 0.025, 0.025, 0.55); B(dark, 0, 0.1, 0.08, 0.035, 0.035, 0.28); B(grip, 0, -0.06, -0.05, 0.035, 0.1, 0.05); g.userData.muzzle = new THREE.Vector3(0, 0.03, 0.78); }
  if (type === 'axe') { B(wood, 0, 0, 0.25, 0.035, 0.035, 0.75); B(metal, 0, 0.08, 0.56, 0.02, 0.18, 0.12); B(cmat('#c8ccd0', 0.2, 0.9), 0, 0.17, 0.56, 0.012, 0.03, 0.14); }
  if (type === 'bat') { const b = M(CG.cyl, cmat('#c8a070', 0.6), 0, 0, 0.35, 0.03, 0.75, 0.03); b.rotation.x = Math.PI / 2; b.scale.set(0.035, 0.75, 0.035); g.add(b); const t = M(CG.cyl, cmat('#c8a070', 0.6), 0, 0, 0.62, 0.045, 0.25, 0.045); t.rotation.x = Math.PI / 2; g.add(t); }
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return g;
}
// ---- name/chat sprites ----
function textSprite(text, color = '#fff', bg = 'rgba(0,0,0,.55)', size = 48) {
  const c = document.createElement('canvas'); const x = c.getContext('2d'); x.font = `900 ${size}px "Noto Sans KR",sans-serif`;
  const w = Math.min(1024, Math.ceil(x.measureText(text).width + size * 0.9)); c.width = w; c.height = size * 1.5;
  x.font = `900 ${size}px "Noto Sans KR",sans-serif`; x.fillStyle = bg; const r = size * 0.4; x.beginPath(); x.roundRect(0, 0, w, c.height, r); x.fill();
  x.fillStyle = color; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: true, transparent: true })); s.scale.set(w / c.height * 0.32, 0.32, 1); s.renderOrder = 10; return s;
}
class Character {
  constructor(outfit, opts = {}) {
    initCharGeo();
    this.root = new THREE.Group(); this.body = new THREE.Group(); this.root.add(this.body);
    this.phase = Math.random() * TAU; this.t = Math.random() * 10; this.deadT = 0; this.weapon = 'fist'; this.weaponMeshes = {};
    this.pose = {}; this.flash = 0;
    this.buildSkeleton(); this.setOutfit(outfit || randomOutfit());
    this.shadow = opts.shadow !== false; this.setShadow(this.shadow);
  }
  buildSkeleton() {
    const b = this.body; const P = this.P = {};
    P.hips = new THREE.Group(); P.hips.position.y = 0.95; b.add(P.hips);
    P.spine = new THREE.Group(); P.spine.position.y = 0.05; P.hips.add(P.spine);
    P.neck = new THREE.Group(); P.neck.position.y = 0.56; P.spine.add(P.neck);
    P.head = new THREE.Group(); P.head.position.y = 0.08; P.neck.add(P.head);
    for (const s of ['L', 'R']) {
      const sx = s === 'L' ? 1 : -1;
      const sh = P['sh' + s] = new THREE.Group(); sh.position.set(0.205 * sx, 0.47, 0); P.spine.add(sh);
      const el = P['el' + s] = new THREE.Group(); el.position.y = -0.28; sh.add(el);
      const hd = P['hand' + s] = new THREE.Group(); hd.position.y = -0.26; el.add(hd);
      const hp = P['hip' + s] = new THREE.Group(); hp.position.set(0.095 * sx, -0.03, 0); P.hips.add(hp);
      const kn = P['kn' + s] = new THREE.Group(); kn.position.y = -0.44; hp.add(kn);
      const an = P['an' + s] = new THREE.Group(); an.position.y = -0.44; kn.add(an);
    }
    this.var = new THREE.Group(); // nothing — variable parts are created in setOutfit
  }
  setOutfit(o) {
    this.outfit = Object.assign({}, o); const P = this.P;
    // clear old meshes
    if (this.meshes) for (const m of this.meshes) m.parent && m.parent.remove(m);
    this.meshes = []; const add = (parent, m, shadow = true) => { parent.add(m); this.meshes.push(m); m.castShadow = shadow; return m; };
    const skin = cmat(o.skin, 0.62), top = cmat(o.topColor, 0.85), bot = cmat(o.bottomColor, 0.88), shoe = cmat(o.shoes, 0.5), hairM = cmat(o.hairColor, 0.55), hatM = cmat(o.hatColor || '#333', 0.7);
    const f = o.body === 'f';
    const longSleeve = ['long', 'hoodie', 'jacket', 'suit', 'police', 'doctor'].includes(o.top); const noSleeve = o.top === 'tank' || o.top === 'vest';
    const longPants = !['shorts', 'skirt'].includes(o.bottom);
    // torso
    add(P.spine, M(CG.chest, top, 0, 0.27, 0, f ? 1.12 : 1.28, 1, f ? 0.74 : 0.78));
    if (f) { add(P.spine, M(CG.sph, top, 0.06, 0.36, 0.085, 0.065, 0.06, 0.06)); add(P.spine, M(CG.sph, top, -0.06, 0.36, 0.085, 0.065, 0.06, 0.06)); }
    add(P.hips, M(CG.pelvis, o.bottom === 'skirt' ? bot : bot, 0, 0.0, 0, f ? 1.12 : 1.05, 0.62, 0.78));
    add(P.spine, M(CG.neck, skin, 0, 0.6, 0));
    if (o.top === 'tank' || o.top === 'tshirt') add(P.spine, M(CG.sph, skin, 0, 0.52, 0.055, 0.075, 0.045, 0.04), false);
    if (o.top === 'suit' || o.top === 'jacket' || o.top === 'doctor') {
      add(P.spine, M(CG.box, cmat(o.top === 'suit' ? '#f4f4f4' : o.top === 'doctor' ? '#a8c8e8' : '#e8e8e8', 0.8), 0, 0.36, 0.115, 0.08, 0.32, 0.02));
      if (o.top === 'suit') add(P.spine, M(CG.box, cmat('#a01828', 0.6), 0, 0.33, 0.128, 0.03, 0.26, 0.01));
    }
    if (o.top === 'police') { add(P.spine, M(CG.box, cmat('#e8c040', 0.3, 0.8), 0.08, 0.42, 0.11, 0.035, 0.045, 0.01)); add(P.hips, M(CG.cyl, cmat('#111111', 0.6), 0, 0.06, 0, 0.19, 0.05, 0.13)); }
    if (o.top === 'hoodie') { add(P.spine, M(CG.cap(0.5, 0.14), top, 0, 0.5, -0.08, 1.05, 0.7, 0.9)).rotation.x = -1.9; add(P.spine, M(CG.box, top, 0, 0.12, 0.115, 0.2, 0.1, 0.02)); }
    if (o.top === 'vest') { add(P.spine, M(CG.chest, cmat(o.topColor, 0.7), 0, 0.28, 0, 1.33, 0.95, 0.84)); add(P.spine, M(CG.box, cmat('#e8e8e8', 0.3, 0.3), 0, 0.3, 0.128, 0.26, 0.03, 0.01)); }
    if (o.top === 'doctor') add(P.hips, M(CG.coat, top, 0, -0.18, 0, 1, 1, 0.85)).material = cmat('#ffffff', 0.85);
    // arms
    for (const s of ['L', 'R']) {
      const sx = s === 'L' ? 1 : -1;
      add(P['sh' + s], M(CG.sph, noSleeve ? skin : top, 0, -0.01, 0, 0.075, 0.07, 0.075));
      add(P['sh' + s], M(CG.uarm, noSleeve ? skin : top, 0, -0.14, 0));
      add(P['el' + s], M(CG.farm, longSleeve ? top : skin, 0, -0.12, 0));
      add(P['hand' + s], M(CG.hand, skin, 0, 0.0, 0, 1, 1.15, 0.9));
      add(P['hip' + s], M(CG.thigh, bot, 0, -0.22, 0, f ? 1.05 : 1, 1, 1));
      add(P['kn' + s], M(CG.shin, longPants ? bot : skin, 0, -0.21, 0));
      add(P['an' + s], M(CG.foot, shoe, 0, -0.005, 0.0));
    }
    if (o.bottom === 'skirt') add(P.hips, M(CG.skirt, bot, 0, -0.17, 0));
    if (o.bottom === 'cargo') for (const s of [1, -1]) add(P['hip' + (s > 0 ? 'L' : 'R')], M(CG.box, bot, 0.075 * s, -0.25, 0, 0.03, 0.1, 0.08));
    // head
    const H = P.head;
    add(H, M(CG.head, skin, 0, 0.1, 0, f ? 0.95 : 1, 1.12, 1.04));
    add(H, M(CG.sph, skin, 0, 0.04, 0.035, 0.085, 0.07, 0.075));
    for (const s of [1, -1]) {
      add(H, M(CG.eyeW, cmat('#ffffff', 0.3), 0.042 * s, 0.115, 0.098), false);
      add(H, M(CG.pupil, cmat('#2a1a10', 0.2), 0.042 * s, 0.115, 0.115), false);
      add(H, M(CG.brow, hairM, 0.043 * s, 0.148, 0.108), false).rotation.z = -0.12 * s;
      add(H, M(CG.ear, skin, 0.112 * s, 0.1, -0.005, 0.5, 1, 0.8));
    }
    add(H, M(CG.nose, skin, 0, 0.085, 0.122), false);
    add(H, M(CG.mouth, cmat(f ? '#b8404a' : '#8a4040', 0.5), 0, 0.047, 0.108), false);
    // hair
    const hh = o.hair;
    if (hh === 'short' || hh === 'spiky' || hh === 'curly' || hh === 'long' || hh === 'ponytail') { const c = add(H, M(CG.cap(0.52, 0.127), hairM, 0, 0.115, -0.012, f ? 0.98 : 1.02, 1.05, 1.06)); c.rotation.x = -0.28; }
    if (hh === 'buzz') { const c = add(H, M(CG.cap(0.5, 0.119), hairM, 0, 0.12, -0.005, 1, 1.05, 1.04)); c.rotation.x = -0.3; }
    if (hh === 'bob') { const c = add(H, M(CG.cap(0.66, 0.13), hairM, 0, 0.115, -0.02, 1.04, 1.1, 1.06)); c.rotation.x = -0.42; }
    if (hh === 'long') add(H, M(CG.uarm, hairM, 0, -0.03, -0.065, 2.1, 1.25, 0.9));
    if (hh === 'ponytail') { add(H, M(CG.sph, hairM, 0, 0.14, -0.12, 0.05, 0.05, 0.05)); const t = add(H, M(CG.farm, hairM, 0, 0.02, -0.15, 0.9, 0.9, 0.9)); t.rotation.x = 0.35; }
    if (hh === 'spiky') for (let i = 0; i < 7; i++) { const sp = add(H, M(CG.cone, hairM, Math.sin(i * 0.9) * 0.06, 0.22, Math.cos(i * 1.7) * 0.05 - 0.01, 0.03, 0.08, 0.03)); sp.rotation.set(Math.cos(i) * 0.4, 0, Math.sin(i * 0.9) * 0.5); }
    if (hh === 'curly') for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; add(H, M(CG.sph, hairM, Math.sin(a) * 0.1, 0.2 + Math.cos(a * 2) * 0.02, Math.cos(a) * 0.09 - 0.01, 0.045, 0.045, 0.045)); }
    if (hh === 'mohawk') add(H, M(CG.box, hairM, 0, 0.22, -0.01, 0.03, 0.09, 0.22));
    if (o.beard === 'stubble') add(H, M(CG.cap(0.42, 0.118), cmat(new THREE.Color(o.skin).multiplyScalar(0.72).getStyle(), 0.9), 0, 0.085, 0.006, 1.0, 1, 1.03), false).rotation.x = Math.PI * 0.86;
    if (o.beard === 'full') add(H, M(CG.cap(0.42, 0.122), hairM, 0, 0.085, 0.008, 1.0, 1.05, 1.05)).rotation.x = Math.PI * 0.86;
    // hats
    if (o.hat === 'cap') { add(H, M(CG.cap(0.5, 0.132), hatM, 0, 0.13, -0.005)); add(H, M(CG.box, hatM, 0, 0.165, 0.12, 0.2, 0.015, 0.12)); }
    if (o.hat === 'beanie') add(H, M(CG.cap(0.52, 0.136), hatM, 0, 0.13, -0.01, 1, 1.15, 1));
    if (o.hat === 'fedora') { add(H, M(CG.cyl, hatM, 0, 0.215, 0, 0.2, 0.012, 0.2)); add(H, M(CG.cyl, hatM, 0, 0.27, 0, 0.11, 0.11, 0.11)); add(H, M(CG.cyl, cmat('#1a1a1a'), 0, 0.235, 0, 0.112, 0.025, 0.112)); }
    if (o.hat === 'helmet') { add(H, M(CG.cap(0.5, 0.145), cmat(o.hatColor || '#ffcc00', 0.3, 0.1), 0, 0.13, 0)); add(H, M(CG.cyl, cmat(o.hatColor || '#ffcc00', 0.3, 0.1), 0, 0.135, 0.02, 0.16, 0.01, 0.17)); }
    if (o.hat === 'police') { add(H, M(CG.cyl, hatM, 0, 0.22, -0.005, 0.135, 0.08, 0.135)); add(H, M(CG.box, cmat('#111'), 0, 0.185, 0.1, 0.17, 0.012, 0.09)); add(H, M(CG.box, cmat('#e8c040', 0.3, 0.8), 0, 0.235, 0.13, 0.04, 0.04, 0.01)); }
    if (o.hat === 'bandana') { add(H, M(CG.cap(0.5, 0.13), hatM, 0, 0.12, -0.01, 1, 0.95, 1.02)).rotation.x = -0.15; add(H, M(CG.box, hatM, 0, 0.13, -0.14, 0.03, 0.03, 0.06)); }
    if (o.glasses === 'glasses' || o.glasses === 'sunglasses') {
      const gm = o.glasses === 'sunglasses' ? cmat('#0a0a0a', 0.1, 0.6) : cmat('#222', 0.4);
      for (const s of [1, -1]) add(H, M(CG.box, gm, 0.043 * s, 0.115, 0.123, 0.05, 0.035, o.glasses === 'sunglasses' ? 0.01 : 0.004), false);
      add(H, M(CG.box, gm, 0, 0.12, 0.124, 0.03, 0.006, 0.006), false);
    }
    this.setShadow(this.shadow !== false);
  }
  setShadow(v) { this.shadow = v; if (this.meshes) for (const m of this.meshes) if (m.castShadow !== undefined && m.geometry !== CG.eyeW && m.geometry !== CG.pupil) m.castShadow = v; }
  setWeapon(w) {
    if (this.weapon === w) return; this.weapon = w;
    for (const k in this.weaponMeshes) this.weaponMeshes[k].visible = false;
    if (w && w !== 'fist') { if (!this.weaponMeshes[w]) { const m = buildWeaponMesh(w); m.rotation.x = Math.PI / 2; m.position.set(0, -0.03, 0.02); this.P.handR.add(m); this.weaponMeshes[w] = m; } this.weaponMeshes[w].visible = true; }
  }
  muzzleWorld(out) {
    const m = this.weaponMeshes[this.weapon]; if (!m || !m.userData.muzzle) { this.P.handR.getWorldPosition(out); return out; }
    out.copy(m.userData.muzzle); m.localToWorld(out); return out;
  }
  setName(text, color = '#fff') {
    if (this.nameTag) { this.root.remove(this.nameTag); this.nameTag.material.map.dispose(); }
    this.nameText = text || ''; if (!text) { this.nameTag = null; return; }
    this.nameTag = textSprite(text, color); this.nameTag.position.y = 2.15; this.root.add(this.nameTag);
  }
  say(text, dur = 5) {
    if (this.bubble) { this.root.remove(this.bubble); this.bubble.material.map.dispose(); }
    this.bubble = textSprite(text.length > 34 ? text.slice(0, 33) + '…' : text, '#111', 'rgba(255,255,255,.92)', 40); this.bubble.position.y = this.nameTag ? 2.5 : 2.2; this.bubbleT = dur; this.root.add(this.bubble);
  }
  // s: {speed, grounded, state, aiming, aimPitch, action, actionT, dance, carry}
  update(dt, s) {
    this.t += dt; const P = this.P; const p = {}; const t = this.t; s.spin = 0;
    if (this.bubble) { this.bubbleT -= dt; if (this.bubbleT <= 0) { this.root.remove(this.bubble); this.bubble = null; } }
    const spd = s.speed || 0; const runT = clamp((spd - 1.8) / 4.2, 0, 1);
    const st = s.state || 'normal';
    // defaults
    Object.assign(p, { hipsY: 0.95, pitch: 0, roll: 0, spY: 0, spX: 0, spZ: 0, hdY: 0, hdX: 0, lSx: 0.05, lSz: 0.08, lSy: 0, rSx: 0.05, rSz: -0.08, rSy: 0, lE: -0.15, rE: -0.15, lHx: 0, lHz: 0.02, rHx: 0, rHz: -0.02, lK: 0.04, rK: 0.04, lA: 0, rA: 0, bodyX: 0, bodyY: 0, bodyZ: 0 });
    if (st === 'dead' || st === 'knocked') { this.deadT += dt; } else this.deadT = Math.max(0, this.deadT - dt * 3);
    if (st === 'normal' || st === 'swim') {
      const wk = spd > 0.15;
      if (wk) {
        const w = spd * lerp(3.4, 1.55, runT); this.phase += w * dt; const ph = this.phase;
        const A = lerp(0.45, 0.85, runT) * clamp(spd / 1.2, 0.3, 1);
        p.lHx = -Math.sin(ph) * A; p.rHx = Math.sin(ph) * A;
        p.lK = Math.max(0, -Math.cos(ph)) * A * 1.6 + 0.08; p.rK = Math.max(0, Math.cos(ph)) * A * 1.6 + 0.08;
        p.lA = -p.lHx * 0.3; p.rA = -p.rHx * 0.3;
        p.lSx = -Math.sin(ph) * A * 0.85; p.rSx = Math.sin(ph) * A * 0.85;
        p.lE = -0.25 - runT * 1.2; p.rE = -0.25 - runT * 1.2;
        p.hipsY = 0.95 - Math.abs(Math.cos(ph)) * (0.025 + runT * 0.05) - runT * 0.04;
        p.pitch = runT * 0.22; p.spY = Math.sin(ph) * 0.12 * A;
      } else {
        p.hipsY = 0.95 + Math.sin(t * 1.8) * 0.004; p.spX = Math.sin(t * 1.8) * 0.015; p.lSz = 0.1 + Math.sin(t * 1.8) * 0.01; p.rSz = -0.1 - Math.sin(t * 1.8) * 0.01;
        p.hdY = Math.sin(t * 0.37) * 0.25 * (s.idleLook ?? 1);
      }
      if (!s.grounded && st !== 'swim') { p.lHx = -0.5; p.rHx = 0.2; p.lK = 0.9; p.rK = 0.5; p.lSx = -0.6; p.rSx = -0.6; p.lSz = 0.5; p.rSz = -0.5; }
      if (st === 'swim') {
        p.bodyX = 1.25; p.hipsY = 0.95; const ph = t * 4;
        p.lSx = -2.8 + Math.sin(ph) * 1.2; p.rSx = -2.8 + Math.sin(ph + Math.PI) * 1.2; p.lE = -0.3; p.rE = -0.3; p.lHx = Math.sin(ph * 1.5) * 0.3; p.rHx = -Math.sin(ph * 1.5) * 0.3; p.lK = 0.2; p.rK = 0.2; p.hdX = -0.9;
      }
      // weapon holding (upper body)
      const w = this.weapon; const twoH = w === 'smg' || w === 'shotgun' || w === 'rifle' || w === 'sniper';
      if (st === 'normal') {
        if (s.aiming && !WEAPONS[w]?.melee) {
          const ap = -(Math.PI / 2) - (s.aimPitch || 0);
          p.rSx = ap; p.rSz = 0.05; p.rE = -0.05; p.rSy = 0;
          if (twoH) { p.rSx = ap + 0.1; p.rE = -0.25; p.lSx = ap + 0.15; p.lSz = -0.55; p.lE = -0.9; p.spY = 0.35; p.hdY = -0.3; }
          else { p.lSx = ap + 0.25; p.lSz = -0.35; p.lE = -0.45; p.spY = 0.15; }
          p.pitch = 0.04;
        } else if (twoH) { p.rSx = -0.45; p.rE = -1.25; p.lSx = -0.85; p.lSz = -0.3; p.lE = -1.0; p.spY = 0.2; }
        else if (w === 'pistol') { p.rSx = Math.min(p.rSx, -0.15); p.rE = -0.5; }
        else if ((w === 'fist') && s.guard) { p.lSx = -1.15; p.lSz = 0.1; p.lE = -2.0; p.rSx = -1.15; p.rSz = -0.1; p.rE = -2.0; }
        else if (w === 'axe' || w === 'bat') { p.rSx = Math.min(p.rSx, -0.2); p.rE = -0.6; }
      }
      // actions
      if (s.action && s.actionT < 1) {
        const a = s.action, k = s.actionT;
        if (PUNCH_MOVES[a]) {
          punchPose(p, a === 'punchR' ? 'cross' : a === 'punchL' ? 'jab' : a, k);
        } else if (a === 'kick') {
          const e = Math.sin(k * Math.PI); p.rHx = -1.5 * e; p.rK = 0.3 * (1 - e); p.pitch = -0.25 * e; p.lSx = -0.8; p.rSx = 0.4;
        } else if (a === 'axe') {
          let sx, ex, sp;
          if (k < 0.45) { const u = k / 0.45; sx = lerp(-0.4, -2.9, u); ex = lerp(-0.6, -0.9, u); sp = lerp(0, -0.2, u); }
          else if (k < 0.65) { const u = (k - 0.45) / 0.2; sx = lerp(-2.9, -0.7, u * u); ex = lerp(-0.9, -0.1, u); sp = lerp(-0.2, 0.45, u); }
          else { const u = (k - 0.65) / 0.35; sx = lerp(-0.7, -0.3, u); ex = lerp(-0.1, -0.6, u); sp = lerp(0.45, 0, u); }
          p.rSx = sx; p.lSx = sx + 0.1; p.rE = ex; p.lE = ex - 0.3; p.lSz = -0.35; p.rSz = 0.1; p.spX = sp; p.pitch = sp * 0.5;
        } else if (a === 'bat') {
          const u = k < 0.4 ? -(k / 0.4) : lerp(-1, 1.3, clamp((k - 0.4) / 0.25, 0, 1));
          p.spY = u * 0.9; p.rSx = -1.3; p.lSx = -1.2; p.lSz = -0.6; p.rE = -0.5; p.lE = -0.9; p.rSy = 0.3;
        } else if (a === 'shoot') {
          const e = Math.exp(-k * 8); p.rSx -= 0.25 * e; p.lSx -= 0.15 * e; p.spX -= 0.05 * e;
        } else if (a === 'pet') {
          p.hipsY = 0.6; p.lHx = -1.5; p.rHx = -0.9; p.lK = 2.1; p.rK = 1.9; p.rSx = -1.0 - Math.sin(t * 8) * 0.15; p.rE = -0.2; p.pitch = 0.35;
        } else if (a === 'hit') {
          const e = Math.sin(k * Math.PI); p.spX = -0.3 * e; p.hdX = -0.3 * e;
        } else if (a === 'wave') {
          p.rSx = -0.4; p.rSz = -2.6 + Math.sin(t * 12) * 0.3; p.rE = -0.6;
        } else if (a === 'drink') {
          p.rSx = -1.2; p.rE = -2.2; p.hdX = -0.3;
        }
      }
      if (s.dance !== undefined && s.dance >= 0 && spd < 0.3) this.dancePose(p, s.dance, t, s);
      if (s.work) { p.rSx = -1.3 + Math.abs(Math.sin(t * 5)) * -0.9; p.rE = -0.8; p.lSx = -0.6; p.lE = -0.8; p.pitch = 0.25; p.hipsY = 0.85; p.lK = 0.4; p.rK = 0.4; p.lHx = -0.3; p.rHx = -0.3; }
    } else if (st === 'drive' || st === 'sit' || st === 'bike' || st === 'horse' || st === 'passenger') {
      p.lHx = -1.5; p.rHx = -1.5; p.lK = 1.45; p.rK = 1.45; p.hipsY = 0.95;
      if (st === 'drive') { p.pitch = -0.18; p.lSx = -1.0 + (s.steer || 0) * 0.3; p.rSx = -1.0 - (s.steer || 0) * 0.3; p.lE = -0.6; p.rE = -0.6; p.lSz = -0.15; p.rSz = 0.15; p.hdY = (s.steer || 0) * -0.3; }
      if (st === 'sit' || st === 'passenger') { p.lSx = -0.25; p.rSx = -0.25; p.lE = -0.9; p.rE = -0.9; }
      if (st === 'bike') { p.lHx = -1.2; p.rHx = -1.2; p.lK = 1.7; p.rK = 1.7; p.lHz = 0.18; p.rHz = -0.18; p.pitch = 0.45; p.lSx = -1.2; p.rSx = -1.2; p.lSz = 0.25; p.rSz = -0.25; p.lE = -0.4; p.rE = -0.4; p.hdX = -0.35; }
      if (st === 'horse') { p.lHx = -0.9; p.rHx = -0.9; p.lHz = 0.55; p.rHz = -0.55; p.lK = 1.2; p.rK = 1.2; p.lSx = -0.7; p.rSx = -0.7; p.lE = -1.0; p.rE = -1.0; p.pitch = 0.15 + Math.sin(t * 9) * 0.05 * clamp(spd / 8, 0, 1); }
      if (s.aiming && !WEAPONS[this.weapon]?.melee) { p.rSx = -(Math.PI / 2) - (s.aimPitch || 0); p.rE = -0.05; p.rSz = 0.05; p.spY = 0.2; }
    }
    if (this.deadT > 0) {
      const k = clamp(this.deadT * 3.5, 0, 1); const e = k * k;
      p.bodyX = lerp(p.bodyX, -Math.PI / 2, e); p.lSz = lerp(p.lSz, 1.2, e); p.rSz = lerp(p.rSz, -1.2, e); p.lSx = lerp(p.lSx, -0.2, e); p.rSx = lerp(p.rSx, 0.2, e); p.lE = lerp(p.lE, -0.2, e); p.rE = lerp(p.rE, -0.4, e);
      p.lHx = lerp(p.lHx, 0, e); p.rHx = lerp(p.rHx, 0.1, e); p.lHz = lerp(p.lHz, 0.2, e); p.rHz = lerp(p.rHz, -0.15, e); p.lK = lerp(p.lK, 0.1, e); p.rK = lerp(p.rK, 0.3, e); p.hdY = lerp(p.hdY, 0.5, e); p.spY = lerp(p.spY, 0, e); p.pitch = lerp(p.pitch, 0, e); p.hipsY = 0.95;
      p.bodyY = 0.12 * e;
    }
    // apply with damping
    const k = 1 - Math.exp(-dt * (s.snap ? 60 : 18)); const c = this.pose;
    for (const key in p) { if (c[key] === undefined) c[key] = p[key]; c[key] += (p[key] - c[key]) * k; }
    P.hips.position.y = c.hipsY; P.hips.rotation.set(c.pitch, 0, c.roll);
    P.spine.rotation.set(c.spX, c.spY, c.spZ); P.head.rotation.set(c.hdX, c.hdY, 0); P.neck.rotation.set(0, 0, 0);
    P.shL.rotation.set(c.lSx, c.lSy, c.lSz); P.shR.rotation.set(c.rSx, c.rSy, c.rSz); P.elL.rotation.x = c.lE; P.elR.rotation.x = c.rE;
    P.hipL.rotation.set(c.lHx, 0, c.lHz); P.hipR.rotation.set(c.rHx, 0, c.rHz); P.knL.rotation.x = c.lK; P.knR.rotation.x = c.rK; P.anL.rotation.x = c.lA; P.anR.rotation.x = c.rA;
    this.body.rotation.x = c.bodyX; this.body.position.y = c.bodyY; this.body.rotation.y = (s.spin || 0);
    if (st === 'swim') this.body.position.y = 0;
  }
  dancePose(p, d, t, s) {
    const b = s.beat ?? t * 2.07 * TAU / 2; // ~124bpm
    switch (d) {
      case 0: { // 셔플
        const k = Math.sin(b * 2); p.lHx = k > 0 ? -0.6 * k : 0.15 * k; p.rHx = k < 0 ? 0.6 * k : -0.15 * k; p.lK = Math.max(0, k) * 0.8; p.rK = Math.max(0, -k) * 0.8;
        p.hipsY = 0.92 - Math.abs(Math.sin(b * 2)) * 0.05; p.lSx = -0.6 + k * 0.4; p.rSx = -0.6 - k * 0.4; p.lE = -1.5; p.rE = -1.5; p.spY = k * 0.2; break;
      }
      case 1: { // 웨이브
        p.lSz = 1.45 + Math.sin(b) * 0.3; p.rSz = -1.45 + Math.sin(b + 1.2) * 0.3; p.lE = Math.sin(b + 0.6) * 0.6 - 0.2; p.rE = Math.sin(b + 1.8) * 0.6 - 0.2; p.lSx = 0; p.rSx = 0;
        p.roll = Math.sin(b) * 0.08; p.spZ = Math.sin(b + 0.6) * 0.1; p.hdY = Math.sin(b * 0.5) * 0.3; p.hipsY = 0.94 + Math.sin(b * 2) * 0.015; break;
      }
      case 2: { // 힙합 바운스
        const k = Math.abs(Math.sin(b)); p.hipsY = 0.9 - k * 0.08; p.lK = 0.3 + k * 0.3; p.rK = 0.3 + k * 0.3; p.lHx = -0.2 - k * 0.15; p.rHx = -0.2 - k * 0.15;
        p.lSx = -1.2; p.rSx = -1.2; p.lSz = -0.5; p.rSz = 0.5; p.lE = -1.6 + k * 0.5; p.rE = -1.6 + k * 0.5; p.hdX = k * 0.25; p.pitch = 0.1 + k * 0.1; break;
      }
      case 3: { // 디스코
        const up = Math.sin(b) > 0; p.rSx = up ? -2.6 : -0.3; p.rSz = up ? -0.6 : -0.4; p.rE = -0.05; p.lSz = 0.4; p.lE = -1.7; p.lSx = -0.3;
        p.roll = Math.sin(b) * 0.12; p.lHz = 0.1 + Math.max(0, Math.sin(b)) * 0.3; p.hipsY = 0.94; p.hdY = up ? -0.4 : 0.2; break;
      }
      case 4: { // 회전
        p.lSz = 1.4; p.rSz = -1.4; p.lE = -0.2; p.rE = -0.2; p.hipsY = 0.95 + Math.sin(b * 2) * 0.03; s.spin = (t * 4) % TAU; break;
      }
      case 5: { // 로봇
        const q = (v) => Math.round(v * 3) / 3; const k = Math.sin(b * 0.5);
        p.lSx = q(-1.5 + Math.max(0, k)); p.lE = q(-1.57); p.rSx = q(-0.3 - Math.max(0, -k) * 1.2); p.rE = q(-1.57 * Math.max(0, -k)); p.spY = q(k * 0.5); p.hdY = q(-k * 0.6); p.lSz = 0.2; p.rSz = -0.2; break;
      }
      case 6: { // 말춤
        const k = Math.sin(b * 2); p.lHx = -0.35 - Math.max(0, k) * 0.35; p.rHx = -0.35 - Math.max(0, -k) * 0.35; p.lK = 0.6 + Math.max(0, k) * 0.4; p.rK = 0.6 + Math.max(0, -k) * 0.4; p.hipsY = 0.86 - Math.abs(k) * 0.04;
        p.lSx = -1.3; p.rSx = -1.3; p.lSz = -0.35; p.rSz = 0.35; p.lE = -0.5 + Math.sin(b * 4) * 0.15; p.rE = -0.5 + Math.sin(b * 4) * 0.15; p.lHz = 0.25; p.rHz = -0.25; break;
      }
      case 7: { // 플로스
        const k = Math.sin(b * 2); p.lSx = 0.1 * k; p.rSx = 0.1 * k; p.lSz = -0.3 + k * 0.6; p.rSz = 0.3 + k * 0.6; p.lSy = k * 0.6; p.rSy = k * 0.6; p.lE = 0; p.rE = 0;
        p.spY = -k * 0.25; p.roll = -k * 0.05; p.hipsY = 0.94; break;
      }
    }
  }
}
const DANCES = ['셔플', '웨이브', '힙합', '디스코', '회전', '로봇', '말춤', '플로스'];

// ================= ANIMALS =================
const ANIMAL_SPECS = {
  dog: { body: [0.55, 0.22, 0.2], leg: 0.32, legR: 0.045, neck: 0.12, head: [0.13, 0.12, 0.2], snout: 0.12, ear: 'flop', tail: 0.3, col: ['#c08040', '#2a2018', '#f0e0c0', '#8a5a30'], speed: 5, hp: 40, sfx: 'bark', name: '강아지', adopt: true },
  cat: { body: [0.4, 0.15, 0.13], leg: 0.22, legR: 0.03, neck: 0.06, head: [0.1, 0.09, 0.1], snout: 0.03, ear: 'point', tail: 0.35, col: ['#e09040', '#3a3a3a', '#f0f0f0', '#8a8a8a'], speed: 4, hp: 25, name: '고양이', adopt: true },
  cow: { body: [1.5, 0.6, 0.55], leg: 0.65, legR: 0.08, neck: 0.25, head: [0.25, 0.28, 0.42], snout: 0.12, ear: 'side', horn: true, tail: 0.6, col: ['#f2f2f2'], spots: '#1a1a1a', speed: 2.2, hp: 120, sfx: 'moo', name: '소' },
  pig: { body: [0.95, 0.42, 0.4], leg: 0.32, legR: 0.07, neck: 0.05, head: [0.24, 0.24, 0.26], snout: 0.08, ear: 'point', tail: 0.12, col: ['#f0b0b0', '#e8a0a0'], speed: 2.5, hp: 70, name: '돼지' },
  horse: { body: [1.5, 0.55, 0.45], leg: 0.95, legR: 0.07, neck: 0.75, neckUp: 1.0, head: [0.2, 0.25, 0.55], snout: 0.0, ear: 'point', tail: 0.75, mane: true, col: ['#6a3a1a', '#2a1a10', '#c8a070', '#f0f0f0'], speed: 7, hp: 150, sfx: 'neigh', name: '말', ride: true },
  sheep: { body: [0.9, 0.5, 0.48], leg: 0.38, legR: 0.05, neck: 0.1, head: [0.15, 0.18, 0.24], snout: 0.05, ear: 'side', tail: 0.1, col: ['#f4f0e8'], headCol: '#2a2420', fluffy: true, speed: 2.5, hp: 60, name: '양' },
  deer: { body: [1.0, 0.38, 0.32], leg: 0.75, legR: 0.045, neck: 0.45, neckUp: 0.9, head: [0.14, 0.17, 0.3], snout: 0.05, ear: 'point', antler: true, tail: 0.12, col: ['#a86a3a'], speed: 9, hp: 60, name: '사슴', shy: true },
  lion: { body: [1.4, 0.5, 0.45], leg: 0.6, legR: 0.09, neck: 0.25, head: [0.3, 0.3, 0.38], snout: 0.1, ear: 'round', tail: 0.75, mane: 'lion', col: ['#d8a050'], speed: 8, hp: 200, sfx: 'roar', name: '사자', predator: true },
  bear: { body: [1.4, 0.65, 0.6], leg: 0.55, legR: 0.12, neck: 0.15, head: [0.3, 0.3, 0.34], snout: 0.12, ear: 'round', tail: 0.08, col: ['#4a3020', '#2a1a10'], speed: 6, hp: 250, sfx: 'roar', name: '곰', predator: true },
  elephant: { body: [2.4, 1.3, 1.2], leg: 1.2, legR: 0.25, neck: 0.1, head: [0.65, 0.8, 0.7], snout: 0, trunk: true, ear: 'big', tail: 0.5, col: ['#8a8a90'], speed: 2.5, hp: 600, name: '코끼리' },
  giraffe: { body: [1.5, 0.6, 0.5], leg: 1.6, legR: 0.07, neck: 1.9, neckUp: 1.2, head: [0.15, 0.2, 0.4], snout: 0, ear: 'point', horn: 'ossi', tail: 0.6, col: ['#e8b050'], spots: '#7a4a1a', speed: 4, hp: 250, name: '기린' },
  zebra: { body: [1.3, 0.5, 0.42], leg: 0.85, legR: 0.06, neck: 0.6, neckUp: 1.0, head: [0.17, 0.22, 0.48], snout: 0, ear: 'point', tail: 0.5, mane: true, col: ['#f4f4f4'], stripes: true, speed: 7, hp: 120, name: '얼룩말', shy: true },
  penguin: { biped: true, h: 0.6, col: ['#1a1a20'], belly: '#f4f4f4', speed: 1, hp: 20, name: '펭귄' },
  chicken: { biped: true, h: 0.35, col: ['#f4f0e8', '#c87030'], comb: true, speed: 2, hp: 10, name: '닭' },
};
let _stripeTex = null, _spotTex = {};
function stripeTex() { if (!_stripeTex) _stripeTex = canvasTex(64, 64, (x) => { x.fillStyle = '#f4f4f4'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#111'; for (let i = 0; i < 64; i += 12) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 5, 0); x.lineTo(i + 9, 64); x.lineTo(i + 3, 64); x.fill(); } }); return _stripeTex; }
function spotTex(c) { if (!_spotTex[c]) { const r = mulberry32(5); _spotTex[c] = canvasTex(128, 128, (x) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 128); x.fillStyle = c; for (let i = 0; i < 22; i++) { x.beginPath(); x.ellipse(r() * 128, r() * 128, 6 + r() * 12, 5 + r() * 10, r() * 3, 0, TAU); x.fill(); } }); } return _spotTex[c]; }
class Animal {
  constructor(kind, seed = Math.random()) {
    initCharGeo(); this.kind = kind; const S = this.S = ANIMAL_SPECS[kind]; this.root = new THREE.Group(); this.body = new THREE.Group(); this.root.add(this.body);
    this.t = seed * 10; this.phase = seed * TAU; this.legs = []; this.deadT = 0;
    const col = S.col[Math.floor(seed * S.col.length)];
    let mat = cmat(col, 0.85);
    if (S.stripes) { mat = new THREE.MeshStandardMaterial({ map: stripeTex(), roughness: 0.85 }); }
    if (S.spots) { mat = new THREE.MeshStandardMaterial({ map: spotTex(S.spots), color: col, roughness: 0.85 }); }
    if (S.biped) { this.buildBiped(S, mat, col); return; }
    const [bl, bh, bw] = S.body; const legH = S.leg; const bodyY = legH + bh * 0.4;
    this.bodyY = bodyY;
    const torso = M(S.fluffy ? new THREE.IcosahedronGeometry(1, 2) : CG.sph, S.fluffy ? cmat(col, 1) : mat, 0, bodyY, 0, bw * 0.55, bh * 0.55, bl * 0.55); this.body.add(torso);
    if (S.fluffy) { for (let i = 0; i < 10; i++) this.body.add(M(CG.sph, cmat(col, 1), Math.sin(i) * bw * 0.35, bodyY + Math.cos(i * 2) * bh * 0.2 + bh * 0.15, (i / 10 - 0.5) * bl * 0.8, bw * 0.28, bh * 0.28, bw * 0.28)); }
    // legs
    const lp = [[bw * 0.32, bl * 0.34], [-bw * 0.32, bl * 0.34], [bw * 0.32, -bl * 0.34], [-bw * 0.32, -bl * 0.34]];
    const legMat = S.fluffy ? cmat(S.headCol || '#2a2420', 0.8) : mat;
    lp.forEach(([x, z], i) => {
      const g = new THREE.Group(); g.position.set(x, legH, z); this.body.add(g);
      const up = M(CG.cyl, legMat, 0, -legH * 0.27, 0, S.legR * 1.3, legH * 0.55, S.legR * 1.3); g.add(up);
      const kn = new THREE.Group(); kn.position.y = -legH * 0.52; g.add(kn);
      kn.add(M(CG.cyl, legMat, 0, -legH * 0.24, 0, S.legR, legH * 0.5, S.legR));
      kn.add(M(CG.cyl, cmat('#2a2420', 0.6), 0, -legH * 0.47, 0, S.legR * 1.1, legH * 0.06, S.legR * 1.1));
      this.legs.push({ g, kn, front: z > 0, side: x > 0 ? 1 : -1, diag: (i === 0 || i === 3) ? 0 : Math.PI });
    });
    // neck & head
    this.neck = new THREE.Group(); this.neck.position.set(0, bodyY + bh * 0.2, bl * 0.42); this.body.add(this.neck);
    const nl = S.neck; const nUp = S.neckUp || 0.5;
    if (nl > 0.05) { const n = M(CG.cyl, mat, 0, nl * 0.5, 0, bw * 0.2 + 0.03, nl, bw * 0.2 + 0.03); this.neck.add(n); }
    this.neck.rotation.x = nl > 0.3 ? (1.0 - nUp) * 0.8 + 0.25 : 0.6;
    const head = this.head = new THREE.Group(); head.position.y = Math.max(nl, 0.05); this.neck.add(head); head.rotation.x = -this.neck.rotation.x + (nl > 0.3 ? 0.25 : 0);
    const [hw, hh, hl] = S.head; const headMat = S.headCol ? cmat(S.headCol, 0.8) : mat;
    head.add(M(CG.sph, headMat, 0, 0, hl * 0.3, hw, hh, hl * 0.6));
    if (S.snout) head.add(M(CG.sph, headMat, 0, -hh * 0.25, hl * 0.75, hw * 0.65, hh * 0.55, S.snout + 0.05));
    head.add(M(CG.sph, cmat('#111', 0.3), 0, -hh * 0.15, hl * 0.75 + S.snout + 0.04, hw * 0.18, hh * 0.12, 0.03));
    for (const s of [1, -1]) {
      head.add(M(CG.sph, cmat('#0a0a0a', 0.2), hw * 0.62 * s, hh * 0.25, hl * 0.55, 0.025 + hw * 0.08, 0.025 + hw * 0.08, 0.025));
      if (S.ear === 'point') { const e = M(CG.cone, headMat, hw * 0.55 * s, hh * 0.85, hl * 0.15, hw * 0.25, hh * 0.6, hw * 0.12); e.rotation.z = -0.3 * s; head.add(e); }
      if (S.ear === 'flop') { const e = M(CG.sph, cmat(new THREE.Color(col).multiplyScalar(0.6).getStyle()), hw * 0.9 * s, hh * 0.1, hl * 0.15, hw * 0.25, hh * 0.65, hw * 0.4); head.add(e); }
      if (S.ear === 'round') head.add(M(CG.sph, headMat, hw * 0.7 * s, hh * 0.75, hl * 0.1, hw * 0.25, hw * 0.25, hw * 0.12));
      if (S.ear === 'side') { const e = M(CG.sph, headMat, hw * 1.1 * s, hh * 0.4, hl * 0.1, hw * 0.35, hh * 0.15, hw * 0.15); head.add(e); }
      if (S.ear === 'big') { const e = M(CG.sph, mat, hw * 0.95 * s, hh * 0.1, hl * 0.05, hw * 0.12, hh * 0.65, hl * 0.6); head.add(e); }
      if (S.horn === true) { const h = M(CG.cone, cmat('#e8e0c8', 0.5), hw * 0.7 * s, hh * 0.9, hl * 0.2, 0.035, 0.18, 0.035); h.rotation.z = -0.8 * s; head.add(h); }
      if (S.horn === 'ossi') head.add(M(CG.cyl, mat, hw * 0.4 * s, hh * 1.0, hl * 0.1, 0.025, 0.14, 0.025));
      if (S.antler) { const a = M(CG.cyl, cmat('#c8b090', 0.7), hw * 0.5 * s, hh * 1.4, hl * 0.1, 0.02, 0.45, 0.02); a.rotation.z = -0.5 * s; head.add(a); const a2 = M(CG.cyl, cmat('#c8b090', 0.7), hw * 0.9 * s, hh * 1.7, hl * 0.2, 0.015, 0.22, 0.015); a2.rotation.x = 0.6; head.add(a2); }
    }
    if (S.trunk) { this.trunk = []; let parent = head; for (let i = 0; i < 4; i++) { const g = new THREE.Group(); g.position.set(0, i === 0 ? -hh * 0.3 : -0.28, i === 0 ? hl * 0.7 : 0); parent.add(g); g.add(M(CG.cyl, mat, 0, -0.14, 0, 0.14 - i * 0.025, 0.3, 0.14 - i * 0.025)); g.rotation.x = 0.2; this.trunk.push(g); parent = g; } for (const s of [1, -1]) { const tk = M(CG.cone, cmat('#f4f0e0', 0.4), 0.18 * s, -hh * 0.4, hl * 0.75, 0.04, 0.4, 0.04); tk.rotation.x = 2.2; head.add(tk); } }
    if (S.mane === true) { const m = M(CG.box, cmat('#1a1a1a', 0.9), 0, nl * 0.55, -bw * 0.18, 0.05, nl * 0.95, 0.12); this.neck.add(m); }
    if (S.mane === 'lion') head.add(M(CG.sph, cmat('#7a4a1a', 1), 0, 0.02, hl * 0.05, hw * 1.55, hh * 1.5, hl * 0.6));
    // tail
    this.tail = new THREE.Group(); this.tail.position.set(0, bodyY + bh * 0.15, -bl * 0.5); this.body.add(this.tail);
    this.tail.add(M(CG.cyl, S.stripes ? cmat('#f4f4f4') : mat, 0, -S.tail * 0.5, 0, 0.03, S.tail, 0.03)); this.tail.rotation.x = 0.5;
    this.body.traverse(m => { if (m.isMesh) m.castShadow = true; });
    this.height = bodyY + bh;
  }
  buildBiped(S, mat, col) {
    const h = S.h; this.bodyY = h * 0.55; this.height = h;
    this.body.add(M(CG.sph, mat, 0, h * 0.55, 0, h * 0.3, h * 0.42, h * 0.3));
    if (S.belly) this.body.add(M(CG.sph, cmat(S.belly, 0.8), 0, h * 0.5, h * 0.08, h * 0.24, h * 0.34, h * 0.24));
    this.head = new THREE.Group(); this.head.position.set(0, h * 0.95, h * 0.05); this.body.add(this.head);
    this.head.add(M(CG.sph, mat, 0, 0, 0, h * 0.2, h * 0.2, h * 0.2));
    this.head.add(M(CG.cone, cmat(S.comb ? '#f0a020' : '#f0a020', 0.5), 0, -h * 0.02, h * 0.22, h * 0.05, h * 0.15, h * 0.05)).rotation.x = Math.PI / 2;
    if (S.comb) this.head.add(M(CG.box, cmat('#e02020', 0.6), 0, h * 0.2, 0, h * 0.03, h * 0.12, h * 0.15));
    for (const s of [1, -1]) {
      this.head.add(M(CG.sph, cmat('#111', 0.2), h * 0.11 * s, h * 0.05, h * 0.15, h * 0.035, h * 0.035, h * 0.035));
      const g = new THREE.Group(); g.position.set(h * 0.12 * s, h * 0.25, 0); this.body.add(g); g.add(M(CG.cyl, cmat('#f0a020', 0.6), 0, -h * 0.12, 0, h * 0.03, h * 0.25, h * 0.03)); g.add(M(CG.box, cmat('#f0a020', 0.6), 0, -h * 0.25, h * 0.05, h * 0.12, h * 0.02, h * 0.16));
      this.legs.push({ g, kn: null, front: true, side: s, diag: s > 0 ? 0 : Math.PI });
      const w = M(CG.sph, mat, h * 0.3 * s, h * 0.6, 0, h * 0.06, h * 0.28, h * 0.16); this.body.add(w); (this.wings = this.wings || []).push(w);
    }
    this.body.traverse(m => { if (m.isMesh) m.castShadow = true; });
  }
  update(dt, speed, state) {
    this.t += dt; const S = this.S; const sp = speed || 0;
    if (state === 'dead') { this.deadT = Math.min(1, this.deadT + dt * 3); this.body.rotation.z = this.deadT * Math.PI / 2; this.body.position.y = -this.deadT * 0.05; return; }
    this.deadT = 0; this.body.rotation.z = 0;
    const freq = S.biped ? 10 : 1.1 + (sp / Math.max(1, (S.leg || 0.4))) * 0.55;
    this.phase += dt * freq * (sp > 0.1 ? 1 : 0) * Math.PI;
    const A = clamp(sp / (S.speed * 0.5), 0, 1) * (S.biped ? 0.6 : 0.55);
    for (const L of this.legs) {
      const ph = this.phase + L.diag + (L.front ? 0 : Math.PI * 0.5 * (sp > S.speed * 0.6 ? 1 : 0));
      L.g.rotation.x = Math.sin(ph) * A; if (L.kn) L.kn.rotation.x = Math.max(0, Math.cos(ph)) * A * (L.front ? -1 : 1) * 0.9;
    }
    if (this.wings) this.wings.forEach((w, i) => w.rotation.z = (i ? -1 : 1) * (state === 'flee' ? Math.abs(Math.sin(this.t * 25)) * 0.8 : 0.05));
    if (S.biped) this.body.rotation.z = Math.sin(this.phase) * 0.12 * A;
    this.body.position.y = sp > 0.1 ? Math.abs(Math.sin(this.phase)) * 0.04 * (S.leg || 0.3) : Math.sin(this.t * 2) * 0.004;
    if (this.tail) { this.tail.rotation.z = Math.sin(this.t * (S.ear === 'flop' ? 12 : 3)) * 0.4; }
    if (this.head && !S.biped) { this.head.rotation.y = Math.sin(this.t * 0.4) * 0.3 * (sp < 0.1 ? 1 : 0.2); }
    if (this.head && S.biped && sp < 0.1 && S.comb) this.head.rotation.x = Math.max(0, Math.sin(this.t * 3)) * 0.8;
    if (this.trunk) this.trunk.forEach((g, i) => g.rotation.x = 0.2 + Math.sin(this.t * 1.3 + i * 0.6) * 0.15);
  }
}

// ===== 주먹 콤보 애니메이션: 잽 → 크로스 → 훅 → 어퍼컷 =====
// 준비(어깨·허리 비틀기) → 빠르게 뻗기(몸 기울이며 앞발 내딛기) → 임팩트 정지 → 반동 후 가드 복귀
const PUNCH_MOVES = { jab: 1, cross: 1, hook: 1, upper: 1, punchR: 1, punchL: 1 };
const COMBO = ['jab', 'cross', 'hook', 'upper'];
function actSpeed(a) { return a === 'axe' ? 1.4 : a === 'bat' ? 1.8 : a === 'shoot' ? 6 : a === 'upper' ? 2.5 : a === 'hook' ? 2.9 : a === 'jab' ? 3.8 : a === 'cross' || a === 'punchR' || a === 'punchL' ? 3.3 : 3; }
function punchPose(p, a, k) {
  const ez = x => x * x * (3 - 2 * x); let w = 0, s = 0, rec = 0; // w: 준비, s: 뻗기
  if (k < 0.24) w = ez(k / 0.24);
  else if (k < 0.4) { const u = (k - 0.24) / 0.16; w = 1 - u; s = 1 - (1 - u) * (1 - u) * (1 - u); }
  else if (k < 0.56) s = 1;
  else { const u = (k - 0.56) / 0.44; s = 1 - ez(u); rec = Math.sin(u * Math.PI) * 0.6; }
  // 기본 가드
  p.lSx = -1.2; p.lSz = 0.14; p.lE = -2.1; p.rSx = -1.2; p.rSz = -0.14; p.rE = -2.1;
  const knee = 0.22 + 0.18 * w; p.lK = knee; p.rK = knee; p.hipsY = 0.93 - 0.04 * w;
  if (a === 'jab' || a === 'cross') {
    const R = a === 'cross', sg = R ? 1 : -1, tw = R ? 0.75 : 0.42;
    p.spY = sg * (-0.32 * w + tw * s); p.spX = 0.2 * s - 0.04 * rec; p.pitch = 0.12 * s;
    if (R) { p.rSx = lerp(-1.2, -1.02, w) + (-1.62 + 1.2) * s; p.rSz = lerp(-0.14, -0.3, w) + 0.32 * s; p.rE = lerp(-2.1, -2.3, w) + 2.08 * s; }
    else { p.lSx = lerp(-1.2, -1.05, w) + (-1.62 + 1.2) * s; p.lSz = lerp(0.14, 0.28, w) - 0.3 * s; p.lE = lerp(-2.1, -2.25, w) + 2.06 * s; }
    p.lHx = -0.42 * s; p.rHx = 0.28 * s; p.lK += 0.28 * s; p.hipsY -= 0.05 * s; p.hdY = -sg * 0.3 * s;
  } else if (a === 'hook') { // 왼손 훅: 팔꿈치 90도로 옆에서 휘둘러 감는다
    p.spY = 0.55 * w - 0.95 * s; p.spX = 0.15 * s; p.pitch = 0.1 * s;
    p.lSx = lerp(-1.2, -1.0, w) - 0.4 * s; p.lSz = lerp(0.14, 1.15, w) + (-0.15 - 1.15) * s * (1 - w); p.lE = lerp(-2.1, -1.55, Math.max(w, s));
    p.lHx = -0.3 * s; p.rHx = 0.2 * s; p.hdY = 0.35 * s; p.hipsY -= 0.06 * s;
  } else if (a === 'upper') { // 오른손 어퍼컷: 낮게 웅크렸다가 몸을 펴며 올려친다 (가장 묵직)
    p.hipsY = 0.93 - 0.14 * w + 0.03 * s; p.lK = 0.25 + 0.6 * w; p.rK = 0.25 + 0.6 * w; p.spX = 0.28 * w - 0.18 * s; p.spY = -0.45 * w + 0.6 * s;
    p.rSx = lerp(-1.2, -0.35, w) + (-2.35 + 0.35) * s * (1 - w * 0.5); p.rSz = -0.1; p.rE = lerp(-2.1, -1.7, w) + 0.45 * s;
    p.pitch = 0.18 * w - 0.12 * s; p.hdX = -0.25 * s; p.rHx = 0.3 * w - 0.1 * s; p.lHx = -0.2 * w;
  }
}
