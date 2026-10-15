// @v 2026101503

// ================= FX (particles, tracers, flashes) =================
const FX = {
  init() {
    const softTex = canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }, { repeat: false, srgb: false });
    this.sys = [this.makeSys(2500, softTex, THREE.NormalBlending), this.makeSys(2500, softTex, THREE.AdditiveBlending)];
    const N = 200; this.trPos = new Float32Array(N * 6); this.trLife = new Float32Array(N); this.trCol = new Float32Array(N * 6); this.trN = N; this.trI = 0;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.trPos, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('color', new THREE.BufferAttribute(this.trCol, 3).setUsage(THREE.DynamicDrawUsage));
    this.tracers = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); this.tracers.frustumCulled = false; scene.add(this.tracers);
    this.flash = new THREE.PointLight(0xffc070, 0, 14, 2); scene.add(this.flash); this.flashT = 0;
    this.boom = new THREE.PointLight(0xff8030, 0, 60, 2); scene.add(this.boom); this.boomT = 0;
    this.emojis = [];
  },
  makeSys(N, tex, blending) {
    const g = new THREE.BufferGeometry(); const pos = new Float32Array(N * 3), size = new Float32Array(N), col = new Float32Array(N * 4);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('size', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('pcol', new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      uniforms: { tex: { value: tex }, scale: { value: 600 } }, transparent: true, depthWrite: false, blending,
      vertexShader: `attribute float size; attribute vec4 pcol; varying vec4 vc; uniform float scale; void main(){ vc=pcol; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=size*scale/max(0.1,-mv.z); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D tex; varying vec4 vc; void main(){ vec4 t=texture2D(tex,gl_PointCoord); gl_FragColor=vec4(vc.rgb,vc.a*t.a); if(gl_FragColor.a<0.01) discard; }`,
    });
    const pts = new THREE.Points(g, mat); pts.frustumCulled = false; scene.add(pts);
    return { N, g, pos, size, col, pts, mat, p: new Array(N).fill(null).map(() => ({ life: 0 })), i: 0 };
  },
  emit(add, x, y, z, vx, vy, vz, life, s0, s1, r, g, b, a = 1, grav = 0, drag = 0) {
    const S = this.sys[add ? 1 : 0]; const p = S.p[S.i]; S.i = (S.i + 1) % S.N;
    Object.assign(p, { x, y, z, vx, vy, vz, life, max: life, s0, s1, r, g, b, a, grav, drag });
  },
  update(dt) {
    for (const S of this.sys) {
      for (let i = 0; i < S.N; i++) {
        const p = S.p[i];
        if (p.life > 0) {
          p.life -= dt; const k = 1 - p.life / p.max; p.vy -= p.grav * dt; const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d; p.vz *= d;
          p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          S.pos[i * 3] = p.x; S.pos[i * 3 + 1] = p.y; S.pos[i * 3 + 2] = p.z; S.size[i] = lerp(p.s0, p.s1, k);
          S.col[i * 4] = p.r; S.col[i * 4 + 1] = p.g; S.col[i * 4 + 2] = p.b; S.col[i * 4 + 3] = p.a * (k < 0.1 ? k * 10 : 1 - (k - 0.1) / 0.9);
        } else if (S.size[i] !== 0) { S.size[i] = 0; S.col[i * 4 + 3] = 0; }
      }
      S.g.attributes.position.needsUpdate = true; S.g.attributes.size.needsUpdate = true; S.g.attributes.pcol.needsUpdate = true;
      S.mat.uniforms.scale.value = renderer.domElement.height * 0.5 / Math.tan(camera.fov * Math.PI / 360);
    }
    for (let i = 0; i < this.trN; i++) if (this.trLife[i] > 0) { this.trLife[i] -= dt; const a = Math.max(0, this.trLife[i] / 0.08); for (let k = 0; k < 6; k++) this.trCol[i * 6 + k] *= a > 0 ? 0.82 : 0; }
    this.tracers.geometry.attributes.position.needsUpdate = true; this.tracers.geometry.attributes.color.needsUpdate = true;
    if (this.flashT > 0) { this.flashT -= dt; this.flash.intensity = Math.max(0, this.flashT / 0.05) * 30; } else this.flash.intensity = 0;
    if (this.boomT > 0) { this.boomT -= dt; this.boom.intensity = Math.max(0, this.boomT) * 400; } else this.boom.intensity = 0;
    for (let i = this.emojis.length - 1; i >= 0; i--) { const e = this.emojis[i]; e.t -= dt; e.s.position.y += dt * 0.8; e.s.material.opacity = Math.min(1, e.t); if (e.t <= 0) { scene.remove(e.s); this.emojis.splice(i, 1); } }
  },
  tracer(a, b, col = [1, 0.85, 0.5]) {
    const i = this.trI; this.trI = (this.trI + 1) % this.trN; this.trPos.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6);
    this.trCol.set([col[0] * 0.4, col[1] * 0.4, col[2] * 0.4, col[0], col[1], col[2]], i * 6); this.trLife[i] = 0.08;
  },
  muzzle(p, dir) {
    for (let i = 0; i < 6; i++) this.emit(true, p.x, p.y, p.z, dir.x * rnd(2, 8) + rnd(-1, 1), dir.y * rnd(2, 8) + rnd(-1, 1), dir.z * rnd(2, 8) + rnd(-1, 1), 0.06, 0.35, 0.1, 1, 0.75, 0.3, 1);
    this.emit(false, p.x, p.y, p.z, dir.x, dir.y + 0.5, dir.z, 0.6, 0.15, 0.6, 0.7, 0.7, 0.7, 0.3, -0.5, 1);
    this.flash.position.copy(p); this.flashT = 0.05;
  },
  impact(p, kind) {
    if (kind === 'blood') { for (let i = 0; i < 10; i++) this.emit(false, p.x, p.y, p.z, rnd(-2, 2), rnd(0, 3), rnd(-2, 2), 0.5, 0.15, 0.08, 0.55, 0.02, 0.02, 1, 9, 1); }
    else if (kind === 'spark') { for (let i = 0; i < 10; i++) this.emit(true, p.x, p.y, p.z, rnd(-5, 5), rnd(0, 5), rnd(-5, 5), 0.25, 0.08, 0.02, 1, 0.8, 0.4, 1, 12, 0.5); }
    else if (kind === 'wood') { for (let i = 0; i < 8; i++) this.emit(false, p.x, p.y, p.z, rnd(-3, 3), rnd(1, 4), rnd(-3, 3), 0.6, 0.12, 0.08, 0.6, 0.45, 0.25, 1, 10, 0.5); }
    else if (kind === 'water') { for (let i = 0; i < 16; i++) this.emit(false, p.x, p.y, p.z, rnd(-2, 2), rnd(2, 6), rnd(-2, 2), 0.8, 0.3, 0.5, 0.85, 0.92, 1, 0.8, 12, 0.3); }
    else { for (let i = 0; i < 8; i++) this.emit(false, p.x, p.y, p.z, rnd(-2, 2), rnd(0, 3), rnd(-2, 2), 0.7, 0.25, 0.8, 0.65, 0.6, 0.55, 0.7, 3, 2); }
  },
  explosion(x, y, z, big = 1) {
    for (let i = 0; i < 60 * big; i++) { const a = rnd(0, TAU), e = rnd(-0.2, 1.2), s = rnd(4, 18); this.emit(true, x, y + 0.5, z, Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s, Math.sin(a) * Math.cos(e) * s, rnd(0.3, 0.9), rnd(1.5, 3) * big, 0.5, 1, rnd(0.4, 0.75), 0.15, 1, 2, 3); }
    for (let i = 0; i < 40 * big; i++) { const a = rnd(0, TAU), s = rnd(1, 7); this.emit(false, x + rnd(-1, 1), y + rnd(0, 2), z + rnd(-1, 1), Math.cos(a) * s, rnd(2, 8), Math.sin(a) * s, rnd(1.5, 4), 1.5 * big, 6 * big, 0.15, 0.14, 0.13, 0.85, -1, 1.2); }
    for (let i = 0; i < 30; i++) this.emit(true, x, y + 0.5, z, rnd(-15, 15), rnd(5, 20), rnd(-15, 15), rnd(0.6, 1.4), 0.15, 0.05, 1, 0.7, 0.3, 1, 15, 0.3);
    this.boom.position.set(x, y + 2, z); this.boomT = 0.6;
  },
  smoke(x, y, z, dark = 0.2, s = 1) { this.emit(false, x + rnd(-0.3, 0.3), y, z + rnd(-0.3, 0.3), rnd(-0.3, 0.3), rnd(1.5, 3), rnd(-0.3, 0.3), rnd(2, 4), 0.6 * s, 3.5 * s, dark, dark, dark * 1.05, 0.5, -0.3, 0.3); },
  fire(x, y, z, s = 1) { this.emit(true, x + rnd(-0.4, 0.4) * s, y, z + rnd(-0.4, 0.4) * s, rnd(-0.3, 0.3), rnd(1.5, 3.5), rnd(-0.3, 0.3), rnd(0.3, 0.7), 0.8 * s, 0.2, 1, rnd(0.35, 0.7), 0.1, 1, -1, 1); },
  emoji(text, x, y, z, dur = 1.5) { if (!text || !String(text).trim()) return; /* 이모티콘을 지운 뒤 빈 글자는 띄우지 않는다 */ const s = textSprite(text, '#fff', 'rgba(0,0,0,0)', 64); s.position.set(x, y, z); s.material.opacity = 1; scene.add(s); this.emojis.push({ s, t: dur }); },
  confetti(x, y, z) { for (let i = 0; i < 120; i++) { const c = new THREE.Color().setHSL(Math.random(), 0.9, 0.6); this.emit(true, x, y, z, rnd(-8, 8), rnd(6, 16), rnd(-8, 8), rnd(1.5, 3), 0.25, 0.2, c.r, c.g, c.b, 1, 9, 0.8); } },
};

// ================= VEHICLES =================
const VMODELS = {
  sedan: { name: '세단', kind: 'car', price: 25000, L: 4.7, W: 1.84, clear: 0.3, hood: 0.98, deck: 1.02, roof: 1.46, cabF: 1.0, cabR: -1.35, roofF: 0.22, roofR: -0.95, wb: [1.42, -1.38], wr: 0.34, max: 46, acc: 9, steer: 0.55, grip: 9, hp: 1000, seats: 2 },
  taxi: { base: 'sedan', name: '택시', kind: 'car', taxi: true, price: 0 },
  police: { base: 'sedan', name: '경찰차', kind: 'car', police: true, max: 55, acc: 12, price: 0 },
  hatch: { name: '경차', kind: 'car', price: 14000, L: 3.8, W: 1.68, clear: 0.28, hood: 0.95, deck: 1.35, roof: 1.5, cabF: 0.75, cabR: -1.75, roofF: 0.05, roofR: -1.7, wb: [1.2, -1.15], wr: 0.3, max: 38, acc: 8, steer: 0.6, grip: 9, hp: 800, seats: 2 },
  sports: { name: '스포츠카', kind: 'car', price: 120000, L: 4.5, W: 1.95, clear: 0.2, hood: 0.82, deck: 0.92, roof: 1.22, cabF: 0.55, cabR: -1.2, roofF: -0.08, roofR: -0.78, wb: [1.4, -1.3], wr: 0.35, max: 76, acc: 17, steer: 0.5, grip: 12, hp: 900, seats: 2 },
  supercar: { name: '슈퍼카', kind: 'car', price: 380000, L: 4.6, W: 2.02, clear: 0.15, hood: 0.72, deck: 0.86, roof: 1.13, cabF: 0.4, cabR: -1.45, roofF: -0.25, roofR: -0.98, wb: [1.45, -1.4], wr: 0.36, max: 96, acc: 24, steer: 0.48, grip: 14, hp: 900, seats: 2, wing: true },
  suv: { name: 'SUV', kind: 'car', price: 55000, L: 4.85, W: 1.96, clear: 0.45, hood: 1.24, deck: 1.6, roof: 1.9, cabF: 1.15, cabR: -2.2, roofF: 0.45, roofR: -2.15, wb: [1.5, -1.45], wr: 0.4, max: 44, acc: 9, steer: 0.52, grip: 9, hp: 1400, seats: 2 },
  pickup: { name: '픽업트럭', kind: 'car', price: 42000, L: 5.3, W: 1.98, clear: 0.48, hood: 1.28, deck: 1.3, roof: 1.95, cabF: 1.35, cabR: -0.45, roofF: 0.7, roofR: -0.4, wb: [1.75, -1.6], wr: 0.42, max: 40, acc: 8, steer: 0.5, grip: 8, hp: 1500, seats: 2, bed: true },
  van: { name: '승합차', kind: 'car', price: 30000, L: 5.0, W: 1.96, clear: 0.36, hood: 1.15, deck: 2.1, roof: 2.15, cabF: 1.65, cabR: -2.48, roofF: 1.05, roofR: -2.48, wb: [1.55, -1.6], wr: 0.36, max: 36, acc: 6.5, steer: 0.5, grip: 7, hp: 1400, seats: 2 },
  bicycle: { name: '자전거', kind: 'bike', bicycle: true, seats: 1, price: 4000, max: 9, acc: 3.6, steer: 0.7, grip: 9, hp: 160, wr: 0.34, L: 1.75, W: 0.55 },
  scooter: { name: '스쿠터', kind: 'bike', price: 6000, max: 24, acc: 7, steer: 0.6, grip: 8, hp: 300, wr: 0.24, L: 1.7, W: 0.6 },
  bike: { name: '오토바이', kind: 'bike', price: 28000, max: 62, acc: 15, steer: 0.5, grip: 10, hp: 450, wr: 0.32, L: 2.1, W: 0.7 },
  superbike: { name: '슈퍼바이크', kind: 'bike', price: 95000, max: 88, acc: 22, steer: 0.45, grip: 12, hp: 450, wr: 0.33, L: 2.1, W: 0.7, fairing: true },
  horse: { name: '말', kind: 'horse', price: 0, max: 14, acc: 7, steer: 0.9, grip: 20, hp: 800, L: 2.2, W: 0.8 },
};
for (const k in VMODELS) { const m = VMODELS[k]; if (m.base) VMODELS[k] = Object.assign({}, VMODELS[m.base], m); }
// 좌석 수: 스포츠카·슈퍼카·오토바이·말 2인승, 나머지 차 4인승
for (const k of ['sports', 'supercar']) VMODELS[k].seats = 2; for (const k in VMODELS) if (!VMODELS[k].seats) VMODELS[k].seats = VMODELS[k].kind === 'car' ? 4 : 2;
const CAR_COLORS = ['#d8d8dc', '#1a1a1e', '#b01818', '#1a3a8a', '#f2f2f2', '#6a6e74', '#2a5a3a', '#e0a020', '#8a1a4a', '#3ac0e0', '#ff6a1a', '#4a4a8a'];
const vehicles = new Map();
// ---- 차량 디테일 지오메트리 캐시: 알로이 휠(스포크), 그릴/문틈/사이드스커트 (모델당 1번만 만든다) ----
const VGEO = new Map();
function rimGeo(wr) {
  const k = 'rim' + wr; if (VGEO.has(k)) return VGEO.get(k);
  const parts = []; const R = wr * 0.64;
  const barrel = new THREE.CylinderGeometry(R, R, 0.22, 18, 1, true); barrel.rotateX(Math.PI / 2); parts.push(barrel);
  for (const zs of [1, -1]) {
    const lip = new THREE.TorusGeometry(R, 0.018, 6, 22); lip.translate(0, 0, zs * 0.115); parts.push(lip);
    const hub = new THREE.CylinderGeometry(R * 0.26, R * 0.3, 0.05, 10); hub.rotateX(Math.PI / 2); hub.translate(0, 0, zs * 0.11); parts.push(hub);
    for (let i = 0; i < 5; i++) { const sp = new THREE.BoxGeometry(R * 0.8, 0.055, 0.03); sp.translate(R * 0.5, 0, zs * 0.105); sp.rotateZ(i / 5 * Math.PI * 2); parts.push(sp); }
    for (let i = 0; i < 5; i++) { const nut = new THREE.CylinderGeometry(0.012, 0.012, 0.02, 6); nut.rotateX(Math.PI / 2); nut.translate(Math.cos(i / 5 * 6.283 + 0.6) * R * 0.17, Math.sin(i / 5 * 6.283 + 0.6) * R * 0.17, zs * 0.14); parts.push(nut); }
  }
  const g = mergeAttrGeos(parts); VGEO.set(k, g); return g;
}
function tireGeo(wr) {
  const k = 'tire' + wr; if (VGEO.has(k)) return VGEO.get(k);
  const tread = new THREE.CylinderGeometry(wr - 0.03, wr - 0.03, 0.2, 24, 1, true); tread.rotateX(Math.PI / 2);
  const parts = [tread]; for (const zs of [1, -1]) { const side = new THREE.TorusGeometry(wr - 0.06, 0.06, 8, 24); side.translate(0, 0, zs * 0.085); parts.push(side); const wall = new THREE.RingGeometry(wr * 0.62, wr - 0.04, 24); if (zs < 0) wall.rotateY(Math.PI); wall.translate(0, 0, zs * 0.13); parts.push(wall); }
  const g = mergeAttrGeos(parts); VGEO.set(k, g); return g;
}
function carTrimGeo(Mo) { // 그릴 슬랫 + 문틈 + 사이드 스커트 + 와이퍼 (어두운 재질 한 덩어리)
  const k = 'trim' + Mo.name; if (VGEO.has(k)) return VGEO.get(k);
  const L = Mo.L / 2, W = Mo.W, c = Mo.clear; const parts = [];
  const bx = (x, y, z, sx, sy, sz, rz = 0) => { const g = new THREE.BoxGeometry(sx, sy, sz); if (rz) g.rotateZ(rz); g.translate(x, y, z); parts.push(g); };
  const gy = Mo.hood - 0.3; for (let i = 0; i < 3; i++) bx(L + 0.035, gy + i * 0.055 - 0.05, 0, 0.03, 0.022, W * 0.42); // 그릴 슬랫
  for (const zs of [1, -1]) {
    const z = zs * (W / 2 + 0.002);
    bx(0, c + 0.12, z, Mo.L * 0.62, 0.06, 0.02); // 사이드 스커트
    const dx = (Mo.cabF + Mo.cabR) / 2; bx(dx + 0.02, (c + Mo.deck) / 2 + 0.12, z, 0.012, Math.max(0.3, Mo.deck - c - 0.25), 0.012); // 앞뒤 문 틈
    bx(Mo.cabF - 0.08, (c + Mo.hood) / 2 + 0.12, z, 0.012, Math.max(0.3, Mo.hood - c - 0.25), 0.012);
    if (!Mo.bed) bx(Mo.cabR + 0.12, (c + Mo.deck) / 2 + 0.12, z, 0.012, Math.max(0.3, Mo.deck - c - 0.25), 0.012);
    bx(Mo.wb[0], c + 0.52, z, 0.05, 0.035, 0.012); bx(Mo.wb[1], c + 0.52, z, 0.05, 0.035, 0.012); // 휠아치 위 몰딩
  }
  bx(Mo.cabF + 0.02, Mo.hood + 0.08, 0.25, 0.02, 0.015, 0.5, 0); bx(Mo.cabF + 0.02, Mo.hood + 0.08, -0.25, 0.02, 0.015, 0.5, 0); // 와이퍼
  const g = mergeAttrGeos(parts); VGEO.set(k, g); return g;
}
let plateTex = null;
function buildCarMesh(Mo, color, v) {
  const root = new THREE.Group(); const inner = new THREE.Group(); inner.rotation.y = -Math.PI / 2; root.add(inner);
  const body = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color), metalness: 0.65, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });
  const dark = cmat('#141416', 0.6, 0.2), tireM = cmat('#1b1b1d', 0.92, 0), chrome = cmat('#d8dce0', 0.15, 1), glass = new THREE.MeshPhysicalMaterial({ color: 0x15202a, metalness: 0.2, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.78, clearcoat: 1 });
  const L = Mo.L / 2, W = Mo.W, c = Mo.clear, wr = Mo.wr;
  const pts = []; pts.push([-L + 0.05, c + 0.05]);
  for (const wx of [Mo.wb[1], Mo.wb[0]]) { const r = wr + 0.09; for (let i = 0; i <= 10; i++) { const a = Math.PI - i / 10 * Math.PI; pts.push([wx + Math.cos(a) * r, Math.max(c + 0.05, wr + Math.sin(a) * r)]); } }
  pts.push([L - 0.05, c + 0.05], [L + 0.03, c + 0.32], [L - 0.02, Mo.hood - 0.1], [L - 0.35, Mo.hood], [Mo.cabF, Mo.hood + 0.05], [Mo.cabR, Mo.deck], [-L + 0.25, Mo.deck], [-L + 0.02, Mo.deck - 0.12], [-L - 0.03, c + 0.3]);
  const shape = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
  const bg = new THREE.ExtrudeGeometry(shape, { depth: W - 0.14, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.06, bevelSegments: 3, curveSegments: 4 }); bg.translate(0, 0, -(W - 0.14) / 2);
  const bm = new THREE.Mesh(bg, body); inner.add(bm);
  const cab = new THREE.Shape([[Mo.cabR + 0.04, Mo.deck - 0.02], [Mo.cabF - 0.04, Mo.hood + 0.03], [Mo.roofF, Mo.roof], [Mo.roofR, Mo.roof]].map(p => new THREE.Vector2(p[0], p[1])));
  const cg = new THREE.ExtrudeGeometry(cab, { depth: W - 0.3, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 }); cg.translate(0, 0, -(W - 0.3) / 2);
  inner.add(new THREE.Mesh(cg, glass));
  const rl = Mo.roofF - Mo.roofR; const roof = new THREE.Mesh(new THREE.BoxGeometry(rl + 0.04, 0.07, W - 0.22), body); roof.position.set((Mo.roofF + Mo.roofR) / 2, Mo.roof + 0.02, 0); inner.add(roof);
  const pillar = (x1, y1, x2, y2, z) => { const len = Math.hypot(x2 - x1, y2 - y1); const p = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.07), body); p.position.set((x1 + x2) / 2, (y1 + y2) / 2, z); p.rotation.z = Math.atan2(y2 - y1, x2 - x1); inner.add(p); };
  for (const s of [1, -1]) { const z = s * (W / 2 - 0.14); pillar(Mo.cabF, Mo.hood + 0.05, Mo.roofF, Mo.roof, z); pillar(Mo.roofR, Mo.roof, Mo.cabR, Mo.deck, z); pillar((Mo.roofF + Mo.roofR) / 2, Mo.roof, (Mo.roofF + Mo.roofR) / 2 - 0.05, Mo.deck - 0.05, z); }
  // trims
  const B = (mat, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(CG.box, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); inner.add(m); return m; };
  B(dark, L + 0.04, c + 0.22, 0, 0.12, 0.22, W - 0.05); B(dark, -L - 0.04, c + 0.22, 0, 0.12, 0.22, W - 0.05);
  B(dark, L + 0.02, Mo.hood - 0.25, 0, 0.06, 0.16, W * 0.45);
  if (!plateTex) plateTex = canvasTex(256, 64, (x) => { x.fillStyle = '#f4f4f0'; x.fillRect(0, 0, 256, 64); x.strokeStyle = '#222'; x.lineWidth = 4; x.strokeRect(2, 2, 252, 60); x.fillStyle = '#111'; x.font = '900 38px "Noto Sans KR",sans-serif'; x.textAlign = 'center'; x.fillText('서벌 12가 3456', 128, 46); }, { repeat: false });
  const plateM = new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.5 });
  for (const s of [1, -1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.12), plateM); p.position.set(s * (L + 0.11), c + 0.24, 0); p.rotation.y = s * Math.PI / 2; inner.add(p); }
  v.headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dd, emissiveIntensity: 0.2, roughness: 0.1 });
  v.tailMat = new THREE.MeshStandardMaterial({ color: 0x600000, emissive: 0xff1010, emissiveIntensity: 0.3, roughness: 0.2 });
  for (const s of [1, -1]) {
    B(v.headMat, L - 0.03, Mo.hood - 0.13, s * (W / 2 - 0.3), 0.08, 0.12, 0.34);
    B(v.tailMat, -L - 0.01, Mo.deck - 0.2, s * (W / 2 - 0.25), 0.06, 0.12, 0.4);
    B(body, Mo.cabF - 0.12, Mo.hood + 0.12, s * (W / 2 + 0.05), 0.1, 0.08, 0.16);
    B(chrome, -L * 0.1, c + 0.62, s * (W / 2 + 0.005), 0.18, 0.03, 0.02);
  }
  if (Mo.bed) { B(dark, (-L + Mo.cabR) / 2, Mo.deck + 0.02, 0, (Mo.cabR + L) - 0.2, 0.03, W - 0.3); for (const s of [1, -1]) B(body, (-L + Mo.cabR) / 2, Mo.deck + 0.15, s * (W / 2 - 0.08), Mo.cabR + L, 0.3, 0.08); B(body, -L + 0.06, Mo.deck + 0.15, 0, 0.08, 0.3, W - 0.1); }
  if (Mo.wing) { B(dark, -L + 0.2, Mo.deck + 0.28, 0, 0.3, 0.04, W - 0.1); for (const s of [1, -1]) B(dark, -L + 0.25, Mo.deck + 0.12, s * 0.6, 0.15, 0.3, 0.05); }
  if (Mo.police) {
    B(dark, (Mo.roofF + Mo.roofR) / 2, Mo.roof + 0.09, 0, 0.32, 0.1, 1.2);
    v.sirenR = new THREE.MeshBasicMaterial({ color: 0x400000 }); v.sirenB = new THREE.MeshBasicMaterial({ color: 0x000040 });
    B(v.sirenR, (Mo.roofF + Mo.roofR) / 2, Mo.roof + 0.17, 0.32, 0.26, 0.12, 0.5); B(v.sirenB, (Mo.roofF + Mo.roofR) / 2, Mo.roof + 0.17, -0.32, 0.26, 0.12, 0.5);
    const tx = canvasTex(256, 64, (x) => { x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 64); x.fillStyle = '#1a3a8a'; x.font = '900 40px "Noto Sans KR"'; x.textAlign = 'center'; x.fillText('POLICE 경찰', 128, 46); }, { repeat: false });
    for (const s of [1, -1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshStandardMaterial({ map: tx, transparent: true })); p.position.set(-0.1, c + 0.55, s * (W / 2 + 0.002)); if (s < 0) p.rotation.y = Math.PI; inner.add(p); }
  }
  if (Mo.taxi) { const t = B(new THREE.MeshStandardMaterial({ color: 0xffd23a, emissive: 0xffaa00, emissiveIntensity: 0.4 }), (Mo.roofF + Mo.roofR) / 2, Mo.roof + 0.14, 0, 0.3, 0.2, 0.7); v.taxiSign = t; }
  // wheels
  v.wheels = [];
  const hq = G.quality >= 1; const tireG = hq ? tireGeo(wr) : (() => { const g = new THREE.CylinderGeometry(wr, wr, 0.24, 14); g.rotateX(Math.PI / 2); return g; })();
  const rimG = hq ? rimGeo(wr) : (() => { const g = new THREE.CylinderGeometry(wr * 0.62, wr * 0.62, 0.26, 10); g.rotateX(Math.PI / 2); return g; })();
  const rimM = Mo.police || Mo.taxi ? cmat('#9aa0a8', 0.35, 0.8) : chrome;
  if (hq) { const tr = new THREE.Mesh(carTrimGeo(Mo), dark); inner.add(tr); }
  for (const [wx, front] of [[Mo.wb[0], true], [Mo.wb[1], false]]) for (const s of [1, -1]) {
    const pivot = new THREE.Group(); pivot.position.set(wx, wr, s * (W / 2 - 0.13)); inner.add(pivot);
    const spin = new THREE.Group(); pivot.add(spin); spin.add(new THREE.Mesh(tireG, tireM)); spin.add(new THREE.Mesh(rimG, rimM));
    if (!hq) { const sp = new THREE.Mesh(CG.box, dark); sp.scale.set(wr * 1.1, 0.06, 0.27); spin.add(sp); }
    v.wheels.push({ pivot, spin, front });
  }
  // driver seat position (in root space, +z forward)
  v.seat = new THREE.Vector3(Math.max(0.3, Mo.W / 2 - 0.55), Mo.clear + 0.16 - 0.95, (Mo.cabF + Mo.roofR) / 2 - 0.25);
  v.seatP = new THREE.Vector3(-v.seat.x, v.seat.y, v.seat.z);
  v.bodyMat = body;
  root.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = false; } });
  v.small = []; inner.traverse(m => { if (m.isMesh && m !== bm && m.geometry !== cg && m !== roof && m.geometry !== tireG && m.material !== v.headMat && m.material !== v.tailMat) v.small.push(m); }); v.lodFar = false; // 멀리 있으면 작은 부품 생략
  return root;
}
function buildBikeMesh(Mo, color, v) {
  const root = new THREE.Group(); const inner = new THREE.Group(); inner.rotation.y = -Math.PI / 2; root.add(inner);
  const body = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color), metalness: 0.6, roughness: 0.3, clearcoat: 1 });
  const dark = cmat('#141416', 0.6, 0.2), chrome = cmat('#d0d4d8', 0.15, 1);
  const wr = Mo.wr; const wb = Mo.L / 2 - wr * 0.8;
  const B = (mat, x, y, z, sx, sy, sz, rz = 0) => { const m = new THREE.Mesh(CG.box, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.z = rz; inner.add(m); return m; };
  v.wheels = [];
  const tireG = new THREE.TorusGeometry(wr - 0.05, 0.065, 8, 22); const rimG = new THREE.CylinderGeometry(wr - 0.08, wr - 0.08, 0.03, 12); rimG.rotateX(Math.PI / 2);
  for (const [x, front] of [[wb, true], [-wb, false]]) { const pivot = new THREE.Group(); pivot.position.set(x, wr, 0); inner.add(pivot); const spin = new THREE.Group(); pivot.add(spin); spin.add(new THREE.Mesh(tireG, dark)); spin.add(new THREE.Mesh(rimG, chrome)); v.wheels.push({ pivot, spin, front }); }
  if (Mo.bicycle) { // 🚲 자전거: 가는 바퀴 · 살 · 프레임 · 안장 · 핸들 · 페달 (엔진 없음)
    v.wheels.forEach(w => { w.spin.clear(); w.spin.add(new THREE.Mesh(new THREE.TorusGeometry(wr - 0.02, 0.022, 6, 28), dark)); w.spin.add(new THREE.Mesh(new THREE.TorusGeometry(wr - 0.05, 0.008, 4, 28), chrome)); for (let i = 0; i < 6; i++) { const sp = new THREE.Mesh(CG.box, chrome); sp.scale.set(0.006, (wr - 0.05) * 2, 0.006); sp.rotation.z = i / 6 * Math.PI; w.spin.add(sp); } const hub = new THREE.Mesh(CG.cyl, chrome); hub.scale.set(0.03, 0.06, 0.03); hub.rotation.x = Math.PI / 2; w.spin.add(hub); });
    const T = (x0, y0, x1, y1, z = 0, r = 0.022, mat = body) => { const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy); const m = new THREE.Mesh(CG.cyl, mat); m.scale.set(r, L, r); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, z); m.rotation.z = Math.atan2(-dx, dy); inner.add(m); return m; };
    const bb = [0, wr + 0.02], seat = [-0.18, wr + 0.62], head = [wb - 0.18, wr + 0.6];
    T(bb[0], bb[1], seat[0], seat[1]); T(seat[0] + 0.02, seat[1] - 0.05, head[0], head[1]); T(bb[0], bb[1], head[0], head[1] - 0.08, 0, 0.026);
    for (const z of [0.05, -0.05]) { T(bb[0], bb[1], -wb, wr, z, 0.013); T(seat[0], seat[1] - 0.04, -wb, wr, z, 0.012); T(head[0], head[1], wb, wr, z, 0.015, chrome); }
    T(head[0], head[1], head[0] - 0.04, head[1] + 0.22, 0, 0.016, chrome); B(dark, head[0] - 0.05, head[1] + 0.23, 0, 0.04, 0.03, 0.56);
    B(dark, seat[0] - 0.02, seat[1] + 0.05, 0, 0.24, 0.05, 0.12); const crank = new THREE.Mesh(CG.cyl, chrome); crank.scale.set(0.07, 0.03, 0.07); crank.rotation.x = Math.PI / 2; crank.position.set(bb[0], bb[1], 0.04); inner.add(crank);
    for (const s of [1, -1]) B(dark, bb[0] + 0.08 * s, bb[1] - 0.06 * s, 0.11 * s, 0.1, 0.02, 0.06);
  } else if (Mo.name === '스쿠터') {
    B(body, -0.1, wr + 0.25, 0, 0.9, 0.3, 0.42); B(body, wb - 0.15, wr + 0.5, 0, 0.18, 0.9, 0.4, -0.3); B(dark, -0.25, wr + 0.48, 0, 0.6, 0.12, 0.34); B(chrome, wb - 0.25, wr + 0.98, 0, 0.06, 0.06, 0.6);
  } else {
    const tank = new THREE.Mesh(CG.sph, body); tank.scale.set(0.38, 0.17, 0.2); tank.position.set(0.18, wr + 0.55, 0); inner.add(tank);
    B(dark, 0, wr + 0.18, 0, 0.55, 0.38, 0.32); B(chrome, -0.1, wr + 0.05, 0.2, 0.7, 0.07, 0.07, 0.15);
    B(dark, -0.35, wr + 0.56, 0, 0.6, 0.1, 0.28); B(body, -0.72, wr + 0.5, 0, 0.35, 0.08, 0.2, 0.2);
    B(chrome, wb - 0.12, wr + 0.42, 0.09, 0.05, 0.85, 0.05, -0.38); B(chrome, wb - 0.12, wr + 0.42, -0.09, 0.05, 0.85, 0.05, -0.38);
    B(dark, wb - 0.3, wr + 0.82, 0, 0.06, 0.06, 0.7);
    if (Mo.fairing) { B(body, wb - 0.32, wr + 0.62, 0, 0.5, 0.42, 0.42, -0.5); B(body, 0.15, wr + 0.32, 0, 0.9, 0.3, 0.36); }
  }
  v.headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dd, emissiveIntensity: 0.2 }); v.tailMat = new THREE.MeshStandardMaterial({ color: 0x600000, emissive: 0xff1010, emissiveIntensity: 0.3 });
  const hl = new THREE.Mesh(CG.sph, v.headMat); hl.scale.set(0.06, 0.08, 0.08); hl.position.set(wb - 0.12, wr + 0.72, 0); inner.add(hl);
  B(v.tailMat, -0.88, wr + 0.5, 0, 0.04, 0.06, 0.14);
  v.seat = new THREE.Vector3(0, wr + 0.6 - 0.95 + 0.07, -0.3);
  root.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return root;
}
class Vehicle {
  constructor(id, model, color, x, z, yaw, opts = {}) {
    this.id = id; this.model = model; this.M = VMODELS[model]; this.color = color || pick(CAR_COLORS);
    this.x = x; this.z = z; this.yaw = yaw; this.y = groundHeight(x, z); this.vy = 0; this.pitch = 0; this.roll = 0;
    this.speed = 0; this.side = 0; this.steer = 0; this.hp = this.M.hp; this.dead = false; this.burnT = 0; this.driver = null; this.passenger = null; this.ctrl = G.isHost ? 'local' : 'remote';
    this.siren = false; this.brake = false; this.wheelRot = 0; this.locked = !!opts.locked; this.owner = opts.owner || null; this.spawn = { x, z, yaw }; this.kind = this.M.kind;
    this.waterT = 0; this.lastHit = 0; this.netT = 0;
    this.onCrash = (imp) => { if (typeof onVehicleCrash === 'function') onVehicleCrash(this, imp); };
    if (this.kind === 'car') this.mesh = buildCarMesh(this.M, this.color, this);
    else if (this.kind === 'bike') this.mesh = buildBikeMesh(this.M, this.color, this);
    else if (this.kind === 'heli') { this.mesh = buildHeliMesh(this.M, this.color, this); this.rpm = 0; }
    else { this.animal = new Animal('horse', opts.seed ?? 0.3); this.mesh = this.animal.root; this.seat = new THREE.Vector3(0, this.animal.bodyY + 0.12 - 0.95 + 0.25, 0.05); }
    this.mesh.position.set(x, this.y, z); this.mesh.rotation.y = yaw; scene.add(this.mesh);
    this.radius = this.kind === 'car' ? this.M.W / 2 : this.kind === 'heli' ? (this.M.jet ? 3 : 1.6) : 0.45;
    vehicles.set(id, this);
  }
  circles() { const f = this.kind === 'car' ? this.M.L / 2 - this.M.W / 2 : 0.55; const s = Math.sin(this.yaw), c = Math.cos(this.yaw); return [[this.x + s * f, this.z + c * f], [this.x - s * f, this.z - c * f]]; }
  drive(dt, inp) {
    if (this.kind === 'heli') { HELI.drive(this, dt, this.dead ? {} : inp); return; }
    const M = this.M; if (this.dead) { inp = { throttle: 0, steer: 0, brake: 1 }; }
    const inWater = this.waterT > 0.5; if (inWater && this.kind !== 'horse') inp = { throttle: 0, steer: 0, brake: 0 };
    const spdAbs = Math.abs(this.speed);
    const steerTarget = inp.steer * M.steer / (1 + spdAbs * (this.kind === 'horse' ? 0.02 : 0.055));
    this.steer = damp(this.steer, steerTarget, 10, dt);
    const air = this.y > this.groundY + 0.25;
    if (!air) {
      if (inp.throttle > 0) { const top = inp.pedal ? M.max * (0.3 + 0.7 * inp.throttle) : M.max; /* 액셀을 살살 밟으면 최고속도도 낮다 */ if (this.speed < -0.5) this.speed += 22 * dt; else if (this.speed <= top) this.speed += M.acc * inp.throttle * dt * Math.max(0.05, 1 - this.speed / top); else this.speed = Math.max(top, this.speed - 4 * dt); }
      else if (inp.throttle < 0) { if (this.speed > 0.5) this.speed -= 22 * dt; else this.speed -= M.acc * 0.6 * dt * Math.max(0, 1 + this.speed / (this.kind === 'horse' ? 3 : 12)); }
      else this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), (1.2 + Math.abs(this.speed) * 0.04) * dt);
      if (inp.brake) this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 30 * dt);
      slopeVehicle(this, dt); // 오르막은 힘들고 내리막은 빨라진다
      const wb = this.kind === 'car' ? (M.wb[0] - M.wb[1]) : 1.4;
      let yawRate = this.speed * Math.tan(this.steer) / wb;
      if ((this._gkT = (this._gkT || 0) - dt) <= 0) { this._gkT = 0.5; this._gk = (this.kind === 'car' || this.kind === 'bike') && this.y < 400 ? RULES.grip(this.x, this.z) : 1; } // 쿠알프스드 눈길: 접지력 감소
      const gk = this._gk ?? 1;
      const maxRate = (M.grip * gk * 1.7) / Math.max(4, spdAbs); yawRate = clamp(yawRate, -maxRate, maxRate);
      if (inp.hand && this.kind === 'car') { yawRate *= 1.5; this.side += this.speed * yawRate * dt * 0.7; this.speed -= Math.sign(this.speed) * 6 * dt; }
      this.yaw += yawRate * dt;
      this.side = damp(this.side, 0, inp.hand ? 1.5 : M.grip * gk * 0.9, dt);
      this.yawRate = yawRate;
    }
    this.brake = !!inp.brake || (inp.throttle < 0 && this.speed > 0.5);
    if (inWater) { this.speed *= Math.exp(-dt * 2); this.side *= Math.exp(-dt * 2); }
    this.integrate(dt);
  }
  integrate(dt) {
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    const vx = s * this.speed - c * this.side, vz = c * this.speed + s * this.side; // right = (-cos, sin)
    // collisions with world — 빠르면 잘게 나눠 움직이며 검사 (얇은 벽(클럽 벽 등)을 차가 뚫고 지나가던 버그)
    let hitImpact = 0;
    const r = this.radius; const fo = this.kind === 'car' ? this.M.L / 2 - this.M.W / 2 : 0.55;
    const nSub = Math.min(12, Math.max(1, Math.ceil(Math.hypot(vx, vz) * dt / 0.35))); let hitW = false;
    for (let st = 0; st < nSub && !hitW; st++) {
      this.x += vx * dt / nSub; this.z += vz * dt / nSub;
      for (const sgn of [1, -1]) {
        const cx = this.x + s * fo * sgn, cz = this.z + c * fo * sgn;
        const res = resolveCircle(cx, cz, r, this.y + 0.3, 1.2);
        if (res.hit) {
          const dx = res.x - cx, dz = res.z - cz; this.x += dx; this.z += dz;
          const vn = vx * res.nx + vz * res.nz; if (vn < -0.5) {
            hitImpact = Math.max(hitImpact, -vn); hitW = true;
            const nvx = vx - 1.35 * vn * res.nx, nvz = vz - 1.35 * vn * res.nz; this.speed = nvx * s + nvz * c; this.side = -(nvx * c) + nvz * s; this.speed *= 0.7;
          }
        }
      }
    }
    // vehicle-vehicle
    for (const o of vehicles.values()) {
      if (o === this) continue; if (Math.abs(o.x - this.x) > 7 || Math.abs(o.z - this.z) > 7) continue;
      for (const [ax, az] of this.circles()) for (const [bx, bz] of o.circles()) {
        const dx = ax - bx, dz = az - bz, d = Math.hypot(dx, dz), m = this.radius + o.radius;
        if (d < m && d > 0.001) {
          const k = (m - d), nx = dx / d, nz = dz / d; const mine = o.ctrl === 'remote' ? 1 : 0.5;
          this.x += nx * k * mine; this.z += nz * k * mine;
          if (o.ctrl === 'local') { o.x -= nx * k * 0.5; o.z -= nz * k * 0.5; o.speed += -(nx * Math.sin(o.yaw) + nz * Math.cos(o.yaw)) * Math.abs(this.speed) * 0.05; }
          const rel = (vx * nx + vz * nz); if (rel < -2) { hitImpact = Math.max(hitImpact, -rel * 0.7); this.speed *= 0.6; if (o.ctrl !== 'remote') o.damage(-rel * 6, this.driver); }
        }
      }
    }
    if (hitImpact > 3) { this.damage(hitImpact * hitImpact * 1.2, null); this.onCrash && this.onCrash(hitImpact); sfx('hit', this.x, this.z, Math.min(1, hitImpact / 15)); if (hitImpact > 8) FX.impact({ x: this.x + s * 2, y: this.y + 0.6, z: this.z + c * 2 }, 'spark'); }
    // ground
    const gy = groundHeight(this.x, this.z, this.y); this.groundY = gy;
    if (this.y > gy + 0.05) { this.vy -= 22 * dt; this.y += this.vy * dt; if (this.y <= gy) { if (this.vy < -9) this.damage((-this.vy - 9) * 30, null); this.y = gy; this.vy = 0; } }
    else { const ny = gy; this.vy = clamp((ny - this.y) / Math.max(dt, 1e-3), -5, 14); this.y = ny; }
    const L = this.kind === 'car' ? this.M.L * 0.42 : 0.7, W = this.kind === 'car' ? this.M.W * 0.45 : 0.1;
    const hf = groundHeight(this.x + s * L, this.z + c * L, this.y), hb = groundHeight(this.x - s * L, this.z - c * L, this.y);
    const hl = groundHeight(this.x - c * W, this.z + s * W, this.y), hr = groundHeight(this.x + c * W, this.z - s * W, this.y);
    const onGround = this.y <= gy + 0.06;
    if (onGround) { this.pitch = damp(this.pitch, Math.atan2(hf - hb, 2 * L), 12, dt); this.roll = damp(this.roll, this.kind === 'car' ? Math.atan2(hl - hr, 2 * W) * 0.8 : 0, 12, dt); }
    if (this.kind === 'bike') this.roll = damp(this.roll, clamp(-this.steer * Math.abs(this.speed) * 0.05, -0.65, 0.65), 6, dt);
    // water
    const th = terrainH(this.x, this.z); if (th < -0.4 && this.y < 0.3) { this.waterT += dt; this.y = Math.max(this.y - dt * 0.5, this.kind === 'horse' ? -0.9 : -1.4); if (this.waterT > 0.2 && this.waterT < 0.3) { sfx('splash', this.x, this.z); FX.impact({ x: this.x, y: 0.2, z: this.z }, 'water'); } } else this.waterT = 0;
    this.wheelRot += this.speed * dt / (this.M.wr || 0.4);
  }
  damage(amt, by) {
    if (this.dead || this.kind === 'horse' || amt <= 0) return;
    if (this.ctrl === 'remote') { NET.send({ t: 'vdmg', id: this.id, amt }); return; }
    this.hp -= amt; this.lastDamager = by;
    if (this.hp <= 0) { this.hp = 0; if (!this.burnT) this.burnT = 0.001; }
  }
  explode() {
    if (this.dead) return; this.dead = true; this.speed = 0; this.burnT = 0;
    FX.explosion(this.x, this.y, this.z, 1.3); sfx('explode', this.x, this.z);
    this.bodyMat && this.bodyMat.color.multiplyScalar(0.12); if (this.bodyMat) { this.bodyMat.metalness = 0.2; this.bodyMat.roughness = 0.9; this.bodyMat.clearcoat = 0; }
    this.vy = 6; this.y += 0.1;
    explosionDamage(this.x, this.y, this.z, 9, 110, this.lastDamager);
    this.deadT = 0;
    if (this.onExplode) this.onExplode();
  }
  visual(dt) {
    const m = this.mesh; m.position.set(this.x, this.y, this.z); m.rotation.set(0, 0, 0); m.rotation.order = 'YXZ'; m.rotation.y = this.yaw; m.rotation.x = -this.pitch; m.rotation.z = this.roll;
    if (this.wheels) for (const w of this.wheels) { w.spin.rotation.z = -this.wheelRot; if (w.front) w.pivot.rotation.y = this.steer * (this.kind === 'bike' ? 0.6 : 1); }
    if (this.animal) { this.animal.update(dt, Math.abs(this.speed), 'walk'); }
    if (this.rotor) { const rpm = this.ctrl === 'remote' ? (this.driver ? 1 : 0) : (this.rpm || 0); this._rs = damp(this._rs || 0, rpm, 0.8, dt); this.rotor.rotation.y += dt * this._rs * 38; this.tailRotor.rotation.x += dt * this._rs * 60; }
    const night = ENV.night;
    if (this.headMat) this.headMat.emissiveIntensity = (this.driver || this.ai) && !this.dead ? (night > 0.3 ? 3 : 0.4) : 0.05;
    if (this.tailMat) this.tailMat.emissiveIntensity = this.dead ? 0 : this.brake ? 3 : (night > 0.3 && (this.driver || this.ai) ? 1 : 0.15);
    if (this.sirenR) { const on = this.siren && !this.dead; const ph = Math.floor(G.t * 6) % 2; this.sirenR.color.setRGB(on && ph ? 3 : 0.25, 0, 0); this.sirenB.color.setRGB(0, 0, on && !ph ? 3 : 0.25); }
    // smoke/fire
    if (!this.dead && this.hp < this.M.hp * 0.3 && Math.random() < dt * 12) FX.smoke(this.x + Math.sin(this.yaw) * 1.6, this.y + 1.0, this.z + Math.cos(this.yaw) * 1.6, this.hp < this.M.hp * 0.12 ? 0.08 : 0.4, 0.7);
    if (this.burnT > 0 && !this.dead) { this.burnT += dt; if (Math.random() < dt * 40) FX.fire(this.x + Math.sin(this.yaw) * 1.5, this.y + 0.9, this.z + Math.cos(this.yaw) * 1.5, 1.2); if (this.burnT > 4 && this.ctrl !== 'remote') { this.explode(); if (G.online) NET.send({ t: 'vboom', id: this.id }); } }
    if (this.dead) { this.deadT = (this.deadT || 0) + dt; if (this.deadT < 20 && Math.random() < dt * 8) FX.smoke(this.x, this.y + 1, this.z, 0.06, 1.2); if (this.deadT < 8 && Math.random() < dt * 20) FX.fire(this.x + rnd(-1, 1), this.y + 0.8, this.z + rnd(-1, 1), 1); }
  }
  state() { return [this.id, +this.x.toFixed(2), +this.y.toFixed(2), +this.z.toFixed(2), +this.yaw.toFixed(3), +this.pitch.toFixed(3), +this.roll.toFixed(3), +this.speed.toFixed(2), +this.steer.toFixed(2), Math.round(this.hp), (this.siren ? 1 : 0) | (this.brake ? 2 : 0) | (this.dead ? 4 : 0) | (this.burnT > 0 ? 8 : 0)]; }
  applyState(s) {
    this.tx = s[1]; this.ty = s[2]; this.tz = s[3]; this.tyaw = s[4]; this.pitch = s[5]; this.roll = s[6]; this.speed = s[7]; this.steer = s[8]; this.hp = s[9];
    this.siren = !!(s[10] & 1); this.brake = !!(s[10] & 2); if ((s[10] & 8) && !this.burnT) this.burnT = 0.001; if ((s[10] & 4) && !this.dead) this.explode();
    if (this.netT === 0 || Math.hypot(this.tx - this.x, this.tz - this.z) > 15) { this.x = this.tx; this.y = this.ty; this.z = this.tz; this.yaw = this.tyaw; }
    this.netT = 1;
  }
  interp(dt) {
    if (this.tx === undefined) return;
    this.x = damp(this.x, this.tx + Math.sin(this.yaw) * this.speed * 0.05, 14, dt); this.z = damp(this.z, this.tz + Math.cos(this.yaw) * this.speed * 0.05, 14, dt); this.y = damp(this.y, this.ty, 14, dt); this.yaw = dampAng(this.yaw, this.tyaw, 14, dt);
    this.wheelRot += this.speed * dt / (this.M.wr || 0.4);
  }
  reset() {
    this.x = this.spawn.x; this.z = this.spawn.z; this.yaw = this.spawn.yaw; this.y = groundHeight(this.x, this.z); this.speed = 0; this.side = 0; this.hp = this.M.hp; this.dead = false; this.burnT = 0; this.deadT = 0; this.vy = 0; this.waterT = 0;
    if (this.bodyMat) { this.bodyMat.color.set(this.color); this.bodyMat.metalness = 0.65; this.bodyMat.roughness = 0.28; this.bodyMat.clearcoat = 1; }
  }
  remove() { scene.remove(this.mesh); vehicles.delete(this.id); }
}
function explosionDamage(x, y, z, radius, dmg, by) {
  if (typeof damageArea === 'function') damageArea(x, y, z, radius, dmg, by);
}
