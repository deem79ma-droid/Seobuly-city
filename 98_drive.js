// @v 2026101703
// ================= 운전 · 헬기 · 수류탄 · 교통법규 =================

// ---------- 좌석: 운전석 d · 조수석 p · 뒷좌석 b1(왼쪽) b2(오른쪽) ----------
const SEATS = ['p', 'b1', 'b2'];
function seatCount(v) { return v.M.seats || (v.kind === 'car' ? 4 : 2); }
function seatTaken(v, s) { return s === 'p' ? v.passenger : (v.rear || {})[s]; }
function seatSet(v, s, id) { if (s === 'p') v.passenger = id; else { v.rear = v.rear || {}; v.rear[s] = id; } }
function seatClear(v, id) { if (v.passenger === id) v.passenger = null; if (v.rear) for (const k in v.rear) if (v.rear[k] === id) v.rear[k] = null; }
function freeSeat(v) { const n = seatCount(v) - 1; for (let i = 0; i < Math.min(n, SEATS.length); i++) if (!seatTaken(v, SEATS[i])) return SEATS[i]; return null; }
const _seatV = new THREE.Vector3();
function seatVec(v, s) {
  if (s === 'd' || !s) return v.seat;
  if (s === 'p') { if (v.seatP) return v.seatP; _seatV.copy(v.seat); _seatV.z -= 0.55; return _seatV; }
  const base = s === 'b1' ? v.seat : (v.seatP || v.seat); _seatV.copy(base); _seatV.z -= v.kind === 'heli' ? 1.2 : 1.05; return _seatV;
}

// ---------- 헬기 ----------
function buildHeliMesh(Mo, color, v) {
  if (Mo.jet) return buildJetMesh(Mo, color, v);
  const root = new THREE.Group();
  const body = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color), metalness: 0.55, roughness: 0.3, clearcoat: 1 });
  const dark = cmat('#1a1c20', 0.6, 0.3), glass = new THREE.MeshPhysicalMaterial({ color: 0x9fd0ff, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.45 });
  const S = (mat, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(CG.sph, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); root.add(m); return m; };
  const Bx = (mat, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(CG.box, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); root.add(m); return m; };
  S(body, 0, 1.45, 0, 1.25, 1.15, 2.5); S(glass, 0, 1.7, 1.35, 1.08, 0.92, 1.25);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.26, 4.6, 10), body); boom.rotation.x = Math.PI / 2; boom.position.set(0, 1.85, -4.0); root.add(boom);
  Bx(body, 0, 2.5, -6.15, 0.12, 1.3, 0.9); Bx(body, 0, 1.95, -6.0, 1.6, 0.08, 0.5);
  for (const s of [1, -1]) { Bx(dark, s * 0.95, 0.12, 0.1, 0.12, 0.12, 3.4); Bx(dark, s * 0.8, 0.45, 0.9, 0.08, 0.7, 0.08); Bx(dark, s * 0.8, 0.45, -0.7, 0.08, 0.7, 0.08); }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.6, 8), dark); mast.position.set(0, 2.85, 0); root.add(mast);
  const rotor = new THREE.Group(); rotor.position.set(0, 3.15, 0); root.add(rotor);
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(CG.box, dark); b.scale.set(0.32, 0.04, 5.4); b.position.z = 2.7; const g = new THREE.Group(); g.rotation.y = i * Math.PI / 2; g.add(b); rotor.add(g); }
  const tail = new THREE.Group(); tail.position.set(0.15, 2.5, -6.2); root.add(tail);
  for (let i = 0; i < 2; i++) { const b = new THREE.Mesh(CG.box, dark); b.scale.set(0.04, 1.3, 0.14); b.rotation.x = i * Math.PI / 2; tail.add(b); }
  v.headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dd, emissiveIntensity: 0.2 }); v.tailMat = new THREE.MeshStandardMaterial({ color: 0x600000, emissive: 0xff1010, emissiveIntensity: 0.3 });
  S(v.headMat, 0, 0.75, 2.2, 0.12, 0.08, 0.08); S(v.tailMat, 0, 3.2, -6.2, 0.1, 0.1, 0.1);
  v.rotor = rotor; v.tailRotor = tail; v.bodyMat = body;
  v.seat = new THREE.Vector3(0.42, 0.12, 0.95); v.seatP = new THREE.Vector3(-0.42, 0.12, 0.95);
  root.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return root;
}
const HELI = {
  pads: [{ x: 60, z: 150 }, { x: -900, z: -150 }, { x: 2030, z: 700 }, { x: 760, z: 180 }, { x: 2130, z: -1000 }],
  // 헬기장 자리: 도로·건물·나무에서 떨어진 평평한 땅을 근처에서 찾는다
  spot(p) { for (let r = 0; r <= 160; r += 6) for (let a = 0; a < (r ? 16 : 1); a++) { const x = p.x + Math.cos(a / 16 * TAU) * r, z = p.z + Math.sin(a / 16 * TAU) * r; if (roadDistAt(x, z) < 8 || terrainH(x, z) < LAND - 0.5) continue; const h = terrainH(x, z); if (Math.abs(terrainH(x + 6, z) - h) > 1 || Math.abs(terrainH(x, z + 6) - h) > 1 || Math.abs(terrainH(x - 6, z) - h) > 1 || Math.abs(terrainH(x, z - 6) - h) > 1) continue; if (collidersNear(x, z, 9).some(c => c.circle ? Math.hypot(c.x - x, c.z - z) < 9 + (c.r || 0) : x > c.x0 - 9 && x < c.x1 + 9 && z > c.z0 - 9 && z < c.z1 + 9)) continue; if (BUILDINGS.some(b => Math.abs(b.x - x) < b.w / 2 + 9 && Math.abs(b.z - z) < b.d / 2 + 9)) continue; return { x, z }; } return p; },
  // 헬기장: 바닥 표시 + 공용 헬기 (누구나 탈 수 있다)
  init() {
    if (this.done) return; this.done = true;
    this.pads = this.pads.map(p => this.spot(p));
    this.pads.forEach((p, i) => {
      const y = groundHeight(p.x, p.z);
      const mb = new MB(); mb.cyl(p.x, y + 0.02, p.z, 7, 0.06, C(0x2a2c30), 32); mb.cyl(p.x, y + 0.03, p.z, 6.3, 0.06, C(0xf2c23a), 32); mb.cyl(p.x, y + 0.04, p.z, 5.9, 0.06, C(0x2a2c30), 32);
      mb.box(p.x - 1.5, y + 0.05, p.z, 0.6, 0.06, 4, C(0xffffff)); mb.box(p.x + 1.5, y + 0.05, p.z, 0.6, 0.06, 4, C(0xffffff)); mb.box(p.x, y + 0.05, p.z, 3, 0.06, 0.6, C(0xffffff));
      const m = new THREE.Mesh(mb.geo(), MAT.plain); m.receiveShadow = true; scene.add(m);
      const v = new Vehicle('heli_pad' + i, 'heli', ['#c81a1a', '#1a3a8a', '#f2f2f2', '#2a2a2a'][i % 4], p.x, p.z, 0); v.y = y; v.spawn.y = y;
      if (i === 1 || i === 3) { const jx = p.x + 22, jz = p.z, jy = groundHeight(jx, jz); const j = new Vehicle('jet_pad' + i, 'jet', '#6d7885', jx, jz, 0); j.y = jy; j.spawn.y = jy; } // ✈️ 공용 전투기
    });
  },
  drive(v, dt, inp) {
    if (v.M.jet) return JET.drive(v, dt, inp);
    const M = v.M, pilot = !!v.driver && !v.dead;
    v.rpm = damp(v.rpm || 0, pilot ? 1 : 0, pilot ? 0.9 : 0.35, dt); const lift = v.rpm > 0.82;
    let gy = floorAt(v.x, v.z, v.y + 0.3); const onG = v.y <= gy + 0.08;
    // 상승/하강
    const vk = inp.vk || 1; const tvy = lift ? (inp.up ? 9 * vk : 0) - (inp.down ? 9 * vk : 0) + (onG && !inp.up ? -1 : 0) : -40;
    const agl = v.y - gy; const tvy2 = (lift && inp.down && agl < 9) ? Math.max(tvy, -(1.2 + agl * 0.8)) : tvy; // 땅 가까이에서는 자동으로 부드럽게 착륙
    v.vy = lift ? damp(v.vy || 0, tvy2, 2.2, dt) : (v.vy || 0) - 16 * dt;
    // 전후진 · 회전
    if (lift && !onG) { v.speed += (inp.throttle || 0) * 15 * dt; v.yaw += (inp.steer || 0) * 1.5 * dt; }
    else if (onG) { v.speed *= Math.exp(-dt * 4); if (lift) v.yaw += (inp.steer || 0) * 0.8 * dt; }
    v.speed *= Math.exp(-dt * 0.55); v.speed = clamp(v.speed, -12, M.max);
    v.side = damp(v.side || 0, 0, 2, dt); v.steer = damp(v.steer, inp.steer || 0, 4, dt);
    v.pitch = damp(v.pitch, onG ? 0 : -(inp.throttle || 0) * 0.22 - v.speed / M.max * 0.08, 3, dt); v.roll = damp(v.roll, onG ? 0 : (inp.steer || 0) * 0.18 * clamp(Math.abs(v.speed) / 20, 0.3, 1), 3, dt);
    const s = Math.sin(v.yaw), c = Math.cos(v.yaw);
    v.x += s * v.speed * dt; v.z += c * v.speed * dt; v.y += v.vy * dt; v.y = Math.min(v.y, 720);
    // 건물 · 지형 충돌
    const r = resolveCircle(v.x, v.z, 1.7, v.y + 0.4, 2.6);
    if (r.hit) { const imp = Math.abs(v.speed); v.x = r.x; v.z = r.z; v.speed *= -0.25; if (imp > 9) { v.damage(imp * imp * 1.6, null); CAM.shake = Math.min(0.6, CAM.shake + 0.3); sfx('hit', v.x, v.z, 1); } }
    gy = floorAt(v.x, v.z, v.y + 0.3); v.groundY = gy;
    if (v.y <= gy) { const fv = v.vy; v.y = gy; if (fv < -9 || (Math.abs(v.speed) > 18 && fv < -2)) { v.damage((-fv) * 45 + Math.abs(v.speed) * 20, null); sfx('hit', v.x, v.z, 1); } v.vy = Math.max(0, v.vy); }
    // 물
    if (terrainH(v.x, v.z) < -0.4 && v.y < 0.4) { v.waterT += dt; v.y = Math.max(v.y - dt * 0.6, -1.6); v.speed *= Math.exp(-dt * 3); } else v.waterT = 0;
    v.brake = false;
  },
};
VMODELS.jet = { name: '전투기', kind: 'heli', jet: true, price: 2400000, max: 135, acc: 22, steer: 0.8, grip: 10, hp: 1100, L: 15, W: 9, seats: 1 };
// ---------- ✈️ 전투기 ----------
function buildJetMesh(Mo, color, v) {
  const root = new THREE.Group();
  const body = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color), metalness: 0.7, roughness: 0.3, clearcoat: 0.6 });
  const dark = cmat('#1c1f24', 0.6, 0.4), glass = new THREE.MeshPhysicalMaterial({ color: 0x7fb8e8, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.55 });
  const Bx = (mat, x, y, z, sx, sy, sz, ry = 0) => { const m = new THREE.Mesh(CG.box, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.y = ry; root.add(m); return m; };
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.8, 9.5, 12), body); fus.rotation.x = Math.PI / 2; fus.position.set(0, 1.5, -0.4); root.add(fus);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 3.2, 12), body); nose.rotation.x = Math.PI / 2; nose.position.set(0, 1.5, 5.9); root.add(nose);
  const can = new THREE.Mesh(CG.sph, glass); can.scale.set(0.62, 0.5, 1.7); can.position.set(0, 2.0, 2.2); root.add(can);
  for (const s of [1, -1]) {
    const w = Bx(body, s * 2.9, 1.35, -1.2, 5.2, 0.12, 3.6); w.rotation.y = s * 0.55; // 날개
    Bx(dark, s * 5.1, 1.35, -2.6, 0.1, 0.1, 1.2); // 날개 끝
    const t = Bx(body, s * 1.15, 1.45, -4.8, 2.4, 0.1, 1.6); t.rotation.y = s * 0.5; // 수평꼬리
    const f = Bx(body, s * 0.55, 2.4, -4.6, 0.1, 1.7, 1.5); f.rotation.z = -s * 0.25; // 수직꼬리
    const nz = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 1.0, 10), dark); nz.rotation.x = Math.PI / 2; nz.position.set(s * 0.45, 1.3, -5.1); root.add(nz);
    const ms = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.5, 8), cmat('#e8e8e8', 0.4, 0.3)); ms.rotation.x = Math.PI / 2; ms.position.set(s * 2.0, 1.0, -0.6); root.add(ms); // 날개 아래 미사일
  }
  v.afterMat = new THREE.MeshBasicMaterial({ color: 0xff8a20, transparent: true, opacity: 0 }); for (const s of [1, -1]) { const a = new THREE.Mesh(new THREE.ConeGeometry(0.34, 2.2, 10), v.afterMat); a.rotation.x = -Math.PI / 2; a.position.set(s * 0.45, 1.3, -6.1); root.add(a); }
  const wh = cmat('#111', 0.9); for (const [x, z] of [[0, 3.2], [-1.2, -1.4], [1.2, -1.4]]) { const w = new THREE.Mesh(CG.cyl, wh); w.rotation.z = Math.PI / 2; w.scale.set(0.34, 0.2, 0.34); w.position.set(x, 0.34, z); root.add(w); }
  v.headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dd, emissiveIntensity: 0.3 }); v.tailMat = new THREE.MeshStandardMaterial({ color: 0x600000, emissive: 0xff1010, emissiveIntensity: 0.4 });
  const dot = (m, x, y, z) => { const d = new THREE.Mesh(CG.sph, m); d.scale.set(0.12, 0.12, 0.12); d.position.set(x, y, z); root.add(d); }; dot(v.headMat, 0, 1.2, 6.4); dot(v.tailMat, 0, 3.2, -5.2);
  v.bodyMat = body; v.seat = new THREE.Vector3(0, 0.95, 1.6); v.seatP = v.seat.clone();
  root.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return root;
}
const JET = {
  MIN: 42, // 이 속도 아래에서는 뜨지 못하고 (공중에서는) 실속한다
  drive(v, dt, inp) {
    const M = v.M, pilot = !!v.driver && !v.dead; v.rpm = damp(v.rpm || 0, pilot ? 1 : 0, 0.8, dt);
    let gy = floorAt(v.x, v.z, v.y + 0.3); const onG = v.y <= gy + 0.12; const th = pilot ? (inp.throttle || 0) : 0;
    // 속도: W 가속 · S 감속 · 놓으면 서서히 순항속도로
    if (pilot) { v.speed += th * M.acc * dt; if (!onG && Math.abs(th) < 0.05) v.speed += (70 - v.speed) * 0.25 * dt; if (onG && Math.abs(th) < 0.05) v.speed *= Math.exp(-dt * 0.5); }
    else v.speed *= Math.exp(-dt * (onG ? 1.2 : 0.2));
    v.speed = clamp(v.speed, onG ? -6 : this.MIN * 0.5, M.max);
    const flying = !onG && v.speed >= this.MIN; const up = !!inp.up, down = !!inp.down;
    // 이륙: 지상에서 속도 55 이상 + 상승 입력
    let tvy;
    if (onG) tvy = (pilot && up && v.speed >= 55) ? 14 : 0; else if (!flying) tvy = -26 + (v.speed - 20) * 0.2; else tvy = (up ? 0.36 : 0) * v.speed - (down ? 0.42 : 0) * v.speed;
    v.vy = damp(v.vy || 0, tvy, onG ? 4 : 2.0, dt);
    // 방향: 속도가 높을수록 천천히 크게 돈다
    const st = pilot ? (inp.steer || 0) : 0; if (!onG || v.speed > 8) v.yaw += st * (onG ? 0.6 : 1.1) * dt * clamp(1.4 - v.speed / M.max * 0.6, 0.5, 1.2);
    v.side = damp(v.side || 0, 0, 2, dt); v.steer = damp(v.steer, st, 4, dt);
    v.pitch = damp(v.pitch, onG ? 0 : -clamp((v.vy || 0) / Math.max(40, v.speed), -0.5, 0.5), 3, dt); v.roll = damp(v.roll, onG ? 0 : st * 0.9, 3, dt);
    const sn = Math.sin(v.yaw), cs = Math.cos(v.yaw); v.x += sn * v.speed * dt; v.z += cs * v.speed * dt; v.y += v.vy * dt; v.y = Math.min(v.y, 900);
    if (v.afterMat) v.afterMat.opacity = pilot ? clamp(th * 0.9 + (v.speed / M.max) * 0.5, 0, 1) : 0;
    // 건물·산에 충돌 = 폭발
    const r = resolveCircle(v.x, v.z, 3.2, v.y + 0.4, 3); if (r.hit && v.speed > 12 && !v.dead) { v.hp = 0; v.explode(); v.speed = 0; v.vy = 0; }
    gy = floorAt(v.x, v.z, v.y + 0.3); v.groundY = gy;
    if (v.y <= gy) { const fv = v.vy; v.y = gy; if (!v.dead && (fv < -12 || (v.speed > 80 && fv < -4))) { v.hp = 0; v.explode(); } v.vy = Math.max(0, v.vy); } // 너무 빠르거나 가파르게 착륙하면 추락
    if (terrainH(v.x, v.z) < -0.4 && v.y < 0.4 && !v.dead) { v.hp = 0; v.explode(); } // 바다에 추락
    v.brake = false;
  },
};
// ---------- 🚀 미사일 (전투기 조종사: 발사 버튼/마우스) ----------
const MISSILE = {
  list: [], cool: 0, seq: 0,
  jet() { const v = ME.vehicle; return v && v.M.jet && ME.seat === 'd' && !v.dead ? v : null; },
  fire() {
    const v = this.jet(); if (!v || G.t < this.cool) return; if (v.mis === undefined) v.mis = 6;
    if (v.y - (v.groundY ?? v.y) < 3) { return; }
    if (v.mis <= 0) { toast('🚀 미사일 없음 — 착륙해서 정지하면 보충된다'); this.cool = G.t + 1; sfx('error'); return; }
    v.mis--; this.cool = G.t + 0.8; const sn = Math.sin(v.yaw), cs = Math.cos(v.yaw), pit = Math.atan2(v.vy || 0, Math.max(30, v.speed));
    const dirx = sn * Math.cos(pit), dirz = cs * Math.cos(pit), diry = Math.sin(pit); const side = (v.mis % 2 ? 1 : -1) * 2;
    let tg = null, best = 0.78; // 정면 ±38° 안에서 가장 가까운 방향의 차량을 추적한다
    for (const o of vehicles.values()) { if (o === v || o.dead) continue; const dx = o.x - v.x, dy = o.y - v.y, dz = o.z - v.z, d = Math.hypot(dx, dy, dz); if (d < 25 || d > 900) continue; const c = (dx * dirx + dy * diry + dz * dirz) / d; if (c > best) { best = c; tg = o; } }
    const o = { id: ME.id + '_m' + (++this.seq), x: v.x + cs * side, y: v.y + 0.6, z: v.z - sn * side, vx: dirx * (v.speed + 60), vy: diry * (v.speed + 60), vz: dirz * (v.speed + 60), tg: tg ? tg.id : null, by: ME.id };
    this.spawn(o); NET.send({ t: 'missile', o }); sfx('rifle', v.x, v.z, 1); toast(`🚀 미사일 발사 (${v.mis}발 남음)${tg ? ' · 추적 중' : ''}`, 1400);
  },
  spawn(o) {
    if (this.list.some(m => m.id === o.id)) return;
    const m = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.8, 8), cmat('#eaeaea', 0.4, 0.3)); b.rotation.x = Math.PI / 2; m.add(b); const nz = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.4, 8), cmat('#c02020', 0.5)); nz.rotation.x = Math.PI / 2; nz.position.z = 1.05; m.add(nz);
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.6, 8), new THREE.MeshBasicMaterial({ color: 0xffa030, transparent: true, opacity: 0.8 })); fl.rotation.x = -Math.PI / 2; fl.position.z = -1.5; m.add(fl);
    m.position.set(o.x, o.y, o.z); scene.add(m); this.list.push(Object.assign({ m, age: 0 }, o));
  },
  boom(g, i) { scene.remove(g.m); this.list.splice(i, 1); GRENADE.boom({ k: 'missile', x: g.x, y: g.y, z: g.z, by: g.by }); },
  tick(dt) {
    if (INP.fire && this.jet()) this.fire();
    const jv = this.jet(); if (jv) { if (jv.mis === undefined) jv.mis = 6; if (jv.y - (jv.groundY ?? jv.y) < 1 && Math.abs(jv.speed) < 3) { jv._rl = (jv._rl || 0) + dt; if (jv._rl > 6 && jv.mis < 6) { jv.mis = 6; jv._rl = 0; toast('🚀 미사일 보충 완료'); } } else jv._rl = 0; }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const g = this.list[i]; g.age += dt; let sp = Math.hypot(g.vx, g.vy, g.vz) || 1;
      const tv = g.tg ? vehicles.get(g.tg) : null;
      if (tv && !tv.dead && g.age > 0.35) { // 유도: 속도 방향을 목표쪽으로 조금씩 꺾는다
        const dx = tv.x - g.x, dy = tv.y + 1 - g.y, dz = tv.z - g.z, d = Math.hypot(dx, dy, dz) || 1, k = clamp(2.4 * dt, 0, 1);
        g.vx += (dx / d * sp - g.vx) * k; g.vy += (dy / d * sp - g.vy) * k; g.vz += (dz / d * sp - g.vz) * k; const s2 = Math.hypot(g.vx, g.vy, g.vz) || 1; g.vx *= sp / s2; g.vy *= sp / s2; g.vz *= sp / s2;
        if (d < 5) { this.boom(g, i); continue; }
      }
      g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt; g.m.position.set(g.x, g.y, g.z); g.m.lookAt(g.x + g.vx, g.y + g.vy, g.z + g.vz);
      let hit = g.age > 6 || g.y < floorAt(g.x, g.z, g.y + 0.5) + 0.2;
      if (!hit && g.age > 0.25) { const r = resolveCircle(g.x, g.z, 0.4, g.y, 0.8); if (r.hit) hit = true; }
      if (!hit && g.age > 0.4) for (const o of vehicles.values()) { if (o.dead || o.id === g.by) continue; if (Math.hypot(o.x - g.x, o.z - g.z) < (o.M.L || 4) / 2 + 1 && Math.abs(o.y + 1 - g.y) < 3) { hit = true; break; } }
      if (hit) this.boom(g, i);
    }
  },
};
VMODELS.heli = { name: '헬리콥터', kind: 'heli', price: 650000, max: 52, acc: 15, steer: 0.8, grip: 10, hp: 900, L: 9, W: 2.6, seats: 4 };

// ---------- 오르막 ----------
// 차: 경사 방향 중력 (오르막은 느려지고 내리막은 빨라진다) · 사람: 오르막에선 느리고 스태미나가 빨리 닳는다
function slopeVehicle(v, dt) { if (v.kind === 'heli') return; const g = Math.sin(v.pitch || 0); v.speed -= 9.8 * g * dt * (v.kind === 'horse' ? 0.45 : v.kind === 'bike' ? 0.75 : 0.95); }
function slopeWalk(dx, dz) {
  if (INTERIOR.cur || ME.swim || !ME.grounded) return { mul: 1, stam: 0 };
  const h0 = terrainH(ME.x, ME.z), h1 = terrainH(ME.x + dx * 1.5, ME.z + dz * 1.5); const g = (h1 - h0) / 1.5;
  if (Math.abs(g) < 0.06) return { mul: 1, stam: 0 };
  return g > 0 ? { mul: clamp(1 - g * 1.5, 0.3, 1), stam: g * 22 } : { mul: clamp(1 - g * 0.25, 1, 1.15), stam: 0 };
}

// ---------- 수류탄 (B 키 · 총포사에서 구매) ----------
const GRENADE = {
  list: [], cool: 0, seq: 0,
  // 종류: g 수류탄(2.4초) · tb 시한폭탄(붙는다, 6초) · mine 지뢰(밟으면 폭발)
  KIND: { g: { t: 2.4, R: 8, D: 140 }, tb: { t: 6, R: 11, D: 230 }, mine: { t: 600, R: 7, D: 190 }, missile: { t: 0, R: 15, D: 320 } },
  // 던지는 위치·방향 (차를 타고 있어도 된다 — 운전자가 아닌 동승자만)
  origin() { const a = anchorOf(ME); const cp = Math.cos(CAM.pitch), sp = Math.sin(CAM.pitch); const fx = Math.sin(CAM.yaw) * cp, fz = Math.cos(CAM.yaw) * cp; return { a, fx, fz, up: clamp(-sp + 0.35, 0.15, 1) }; },
  can(k) {
    if (!G.started || ME.dead || ME.jail || INTERIOR.cur || winOpen()) return false;
    if (ME.vehicle && ME.seat === 'd') { toast('🚗 운전 중에는 던질 수 없다 — 동승자가 던져야 한다'); return false; }
    const key = { g: 'grenade', tb: 'tbomb', mine: 'mine' }[k];
    if ((ME.inv[key] | 0) <= 0) { toast({ g: '수류탄이 없다', tb: '시한폭탄이 없다', mine: '지뢰가 없다' }[k] + ' — 총포사에서 산다'); return false; }
    return G.t >= this.cool;
  },
  throw(k = 'g') {
    if (!this.can(k)) return; const key = { g: 'grenade', tb: 'tbomb', mine: 'mine' }[k];
    this.cool = G.t + 0.9; ME.inv[key]--; UI.updateInv && UI.updateInv();
    const { a, fx, fz, up } = this.origin(); const id = ME.id + '_' + (++this.seq);
    const o = { id, k, x: a.x + fx * 0.6, y: a.y + 1.7, z: a.z + fz * 0.6, vx: fx * 17 + (ME.vx || 0), vy: up * 11, vz: fz * 17 + (ME.vz || 0), by: ME.id };
    if (ME.vehicle) { const v = ME.vehicle; o.vx += Math.sin(v.yaw) * v.speed; o.vz += Math.cos(v.yaw) * v.speed; } // 달리는 차의 속도가 더해진다
    this.spawn(o); NET.send({ t: 'nade', o }); ME.action = 'shoot'; ME.actionT = 0; sfx('whoosh');
  },
  // 🪤 지뢰: 발밑에 놓는다 (최대 5개) — 2초 뒤부터 사람·차가 가까이 가면 터진다 (방장이 판정)
  plant() {
    if (ME.vehicle) { toast('차에서는 지뢰를 놓을 수 없다'); return; }
    const mine = this.list.filter(g => g.k === 'mine' && g.by === ME.id).length; if (mine >= 5) { toast('지뢰는 한 번에 5개까지'); return; }
    if (!this.can('mine')) return; this.cool = G.t + 0.9; ME.inv.mine--; UI.updateInv && UI.updateInv();
    const id = ME.id + '_' + (++this.seq); const o = { id, k: 'mine', x: ME.x + Math.sin(ME.yaw) * 0.8, y: ME.y + 0.3, z: ME.z + Math.cos(ME.yaw) * 0.8, vx: 0, vy: 0, vz: 0, by: ME.id };
    this.spawn(o); NET.send({ t: 'nade', o }); ME.action = 'shoot'; ME.actionT = 0; sfx('build'); toast('🪤 지뢰 설치 — 2초 뒤부터 작동한다');
  },
  spawn(o) {
    if (o.id && this.list.some(g => g.id === o.id)) return; const k = ['g', 'tb', 'mine'].includes(o.k) ? o.k : 'g'; o.k = k; const K = this.KIND[k];
    const m = new THREE.Group();
    if (k === 'g') { const b = new THREE.Mesh(CG.sph, cmat('#3a4a2a', 0.7)); b.scale.set(0.09, 0.11, 0.09); m.add(b); const p = new THREE.Mesh(CG.box, cmat('#888888', 0.4, 0.8)); p.scale.set(0.05, 0.05, 0.05); p.position.y = 0.11; m.add(p); }
    else if (k === 'tb') { const b = new THREE.Mesh(CG.box, cmat('#2a2a2e', 0.6, 0.3)); b.scale.set(0.3, 0.12, 0.2); m.add(b); const led = new THREE.Mesh(CG.sph, new THREE.MeshBasicMaterial({ color: 0xff2020 })); led.scale.set(0.05, 0.05, 0.05); led.position.set(0.08, 0.09, 0); m.add(led); m.userData.led = led; }
    else { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.08, 14), cmat('#4a4a38', 0.8, 0.2)); m.add(b); const led = new THREE.Mesh(CG.sph, new THREE.MeshBasicMaterial({ color: 0x884400 })); led.scale.set(0.05, 0.05, 0.05); led.position.y = 0.06; m.add(led); m.userData.led = led; }
    m.position.set(o.x, o.y, o.z); scene.add(m); this.list.push(Object.assign({ t: K.t, m, age: 0, stick: null }, o));
  },
  // 시한폭탄이 닿은 차·사람에 붙는다
  stickTo(g) {
    for (const v of vehicles.values()) { if (v.dead || v === ME.vehicle && g.by === ME.id) continue; const dx = g.x - v.x, dz = g.z - v.z, d = Math.hypot(dx, dz); const r = (v.M.L || 4) / 2 + 0.4; if (d < r && g.y < v.y + 3 && g.y > v.y - 0.5) { g.stick = { v, ox: dx, oy: g.y - v.y, oz: dz, yaw: v.yaw }; return true; } }
    return false;
  },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const g = this.list[i]; g.age += dt; g.t -= dt;
      if (g.stick) { // 붙은 차를 따라간다
        const v = g.stick.v, dy = v.yaw - g.stick.yaw, c = Math.cos(dy), s = Math.sin(dy); g.x = v.x + g.stick.ox * c + g.stick.oz * s; g.z = v.z - g.stick.ox * s + g.stick.oz * c; g.y = v.y + g.stick.oy;
      } else if (g.k === 'mine' && g.age > 0.4 && g.vx === 0 && g.vz === 0) { g.y = floorAt(g.x, g.z, g.y + 0.3) + 0.05; }
      else {
        g.vy -= 20 * dt; g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt;
        const fl = floorAt(g.x, g.z, g.y + 0.3); if (g.y < fl + 0.08) { g.y = fl + 0.08; if (g.vy < -2) sfx('step', g.x, g.z, 0.4); g.vy = -g.vy * 0.32; g.vx *= 0.6; g.vz *= 0.6; if (g.k === 'tb') { g.vx *= 0.3; g.vz *= 0.3; } if (g.k === 'mine') { g.vx = g.vz = g.vy = 0; } }
        const r = resolveCircle(g.x, g.z, 0.1, g.y, 0.2); if (r.hit) { g.x = r.x; g.z = r.z; g.vx *= -0.4; g.vz *= -0.4; }
        if (g.k === 'tb' && g.age > 0.15) this.stickTo(g);
      }
      g.m.position.set(g.x, g.y, g.z); if (g.k === 'g') g.m.rotation.x += dt * 8;
      // 시한폭탄·지뢰: LED 깜빡임 (폭발이 가까울수록 빨라진다)
      if (g.m.userData.led) { const rate = g.k === 'tb' ? (g.t < 2 ? 14 : 5) : 1.2; const on = Math.sin(G.t * rate * 2) > 0; g.m.userData.led.material.color.setHex(on ? 0xff2020 : 0x330000); if (g.k === 'tb' && on && Math.floor(G.t * rate) !== g._b) { g._b = Math.floor(G.t * rate); sfx('ui', g.x, g.z, 0.25); } }
      // 지뢰: 방장(또는 혼자일 때)이 사람·차·동물을 감지
      if (g.k === 'mine' && g.age > 2 && (G.isHost || !G.online)) { if (this.minePressed(g)) { this.detonate(g, i); continue; } }
      if (g.t <= 0 && g.k !== 'mine') this.detonate(g, i);
      else if (g.t <= 0) this.detonate(g, i);
    }
  },
  minePressed(g) {
    const R = 1.9;
    if (!ME.dead && !(ME.vehicle && Math.abs(ME.vehicle.speed) > 0) && Math.hypot(ME.x - g.x, ME.z - g.z) < R && Math.abs(ME.y - g.y) < 1.2 && !ME.swim && (g.by !== ME.id || g.age > 6)) return true;
    for (const p of PEDS) { if (p.state === 'dead' || p.state === 'parked') continue; if (Math.hypot(p.x - g.x, p.z - g.z) < R && Math.abs(p.y - g.y) < 1.4) return true; }
    for (const [id, rp] of G.players) { if (id === ME.id || rp.dead) continue; if (Math.hypot(rp.x - g.x, rp.z - g.z) < R && Math.abs(rp.y - g.y) < 1.4 && (g.by !== id || g.age > 6)) return true; }
    for (const v of vehicles.values()) { if (v.dead || v.kind === 'heli' || v.kind === 'jet') continue; if (Math.hypot(v.x - g.x, v.z - g.z) < (v.M.W || 1.8) / 2 + 0.9 && v.y < g.y + 1.2) return true; }
    for (const a of ANIMALS) { if (a.state === 'dead') continue; if (Math.hypot(a.x - g.x, a.z - g.z) < R) return true; }
    return false;
  },
  detonate(g, i) { scene.remove(g.m); this.list.splice(i, 1); if (g.k === 'mine' && G.isHost && G.online) NET.send({ t: 'mineBoom', id: g.id }); this.boom(g); },
  remoteBoom(id) { const i = this.list.findIndex(g => g.id === id); if (i >= 0) { const g = this.list[i]; scene.remove(g.m); this.list.splice(i, 1); this.boom(g); } },
  boom(g) {
    const K = this.KIND[g.k] || this.KIND.g; const R = K.R, DMG = K.D;
    FX.explosion(g.x, g.y, g.z, g.k === 'g' ? 0.9 : 1.2); sfx('explode', g.x, g.z); const d = Math.hypot(camera.position.x - g.x, camera.position.z - g.z); if (d < 40) CAM.shake = Math.min(0.8, CAM.shake + (40 - d) / 60);
    if (g.by === ME.id && PEDS.some(q => q.state !== 'dead' && q.state !== 'parked' && q.kind !== 'gang' && Math.hypot(q.x - g.x, q.z - g.z) < R + 15)) JOBS.crime('bomb', true);
    if (G.isHost || !G.online) damageArea(g.x, g.y, g.z, R, DMG, g.by);
    if (!G.isHost && G.online && g.by === ME.id && !ME.dead) { const dm = Math.hypot(ME.x - g.x, ME.z - g.z); if (dm < R) { const k = 1 - dm / R; ME.takeDamage(DMG * k, 'boom', 'boom'); ME.knock((ME.x - g.x) / (dm || 1) * k * 8, (ME.z - g.z) / (dm || 1) * k * 8); } }
    for (const v of vehicles.values()) { const dv = Math.hypot(v.x - g.x, v.z - g.z); if (dv < R && v.ctrl === 'local' && !G.isHost && G.online) v.damage(DMG * 6 * (1 - dv / R), g.by); }
  },
};

// ---------- 교통법규: 제한속도 · 신호위반 · 음주운전 · 인도 주행 ----------
const CREDIT = {
  threshold: 200000,
  blocked() { return (ME.debt || 0) >= this.threshold; },
  fine(amount) { const paid = Math.min(Math.max(0, ME.money), amount); ME.money -= paid; ME.debt = Math.max(0, (ME.debt || 0) + amount - paid); if (this.blocked()) toast('⛔ 신용불량자: 신규 구매·대출 불가. 무료 노동으로 빚을 갚으세요.', 5500); saveGame(); return paid; },
  repay(amount) { const paid = Math.min(Math.max(0, ME.money), Math.max(0, ME.debt || 0), amount); ME.money -= paid; ME.debt -= paid; saveGame(); toast(paid ? `🏦 빚 ${fmtMoney(paid)} 상환 · 남은 빚 ${fmtMoney(ME.debt)}` : '상환할 돈이 없습니다'); },
  loan() { if (this.blocked() || ME.debt > 0) { toast('⛔ 기존 빚이 있어 신규 대출이 거절됐습니다'); return; } ME.money += 50000; ME.debt = (ME.debt || 0) + 60000; saveGame(); toast('🏦 5만원 대출 · 상환액 6만원'); },
  bankMenu() { UI.openMenu('🏦 서불리 은행', `현금 ${fmtMoney(ME.money)} · 채무 ${fmtMoney(ME.debt || 0)}${this.blocked() ? ' · 신용불량자' : ''}`, [
    {ic:'💳',t:'빚 1만원 상환',p:0,fn:()=>this.repay(10000)},
    {ic:'💰',t:'가능한 금액 전부 상환',p:0,fn:()=>this.repay(Infinity)},
    {ic:'🏦',t:'5만원 대출 (상환액 6만원)',p:0,fn:()=>this.loan()}
  ]); }
};
const TRAFFIC_LAW = {
  overT: 0, cool: 0, lastNode: null, warnT: 0,
  limit(x, z) { return RULES.at(x, z).speed; },
  copsNear(x, z, r) { return PEDS.some(q => q.kind === 'police' && q.state !== 'dead' && q.state !== 'parked' && Math.hypot(q.x - x, q.z - z) < r) || [...vehicles.values()].some(o => o.model === 'police' && o.ai && Math.hypot(o.x - x, o.z - z) < r); },
  fine(amt, why, crimeWanted) {
    if (G.t < this.cool) return; this.cool = G.t + 25; amt = Math.round(amt * RULES.at(ME.x, ME.z).fine / 100) * 100; // 지역 규정 벌금 배율
    const cop = this.copsNear(ME.x, ME.z, 70);
    if (cop && crimeWanted) { addWanted(1); toast(`교통경찰에게 걸렸다 — ${why} · 수배 ★`, 4000); sfx('siren'); }
    const pay = CREDIT.fine(amt);
    toast(`[${cop ? '교통경찰' : '단속 카메라'}] ${why} — 범칙금 ${fmtMoney(amt)}`, 4500); sfx('error');
    NET.send({ t: 'chat', m: `${ME.name} — ${why} 단속 (범칙금 ${fmtMoney(amt)})`, sys: 1, quiet: 1 });
  },
  tick(dt) {
    const v = ME.vehicle; if (!v || ME.seat !== 'd' || v.kind === 'heli' || v.kind === 'horse' || ADMIN.on) { this.overT = 0; return; }
    if (v.siren || JOBS.id === 'police' && v.model === 'police') return;
    const kmh = Math.abs(v.speed) * 3.6, lim = this.limit(v.x, v.z); this.lim = lim;
    // 과속: 제한 +10 넘게 2초 이상
    if (kmh > lim + 10) { this.overT += dt; if (this.overT > 2) { const over = Math.round(kmh - lim); this.fine(20000 + over * 1500, `과속 ${Math.round(kmh)}km/h (제한 ${lim})`, over > 40); this.overT = 0; } } else this.overT = Math.max(0, this.overT - dt);
    // 신호위반: 신호등 교차로에 빨간불로 진입
    if ((this._nT = (this._nT || 0) - dt) <= 0) {
      this._nT = 0.15; let node = null;
      for (const n of NODES) { if (!n.light || Math.abs(n.x - v.x) > 14 || Math.abs(n.z - v.z) > 14) continue; const w = Math.max(...n.edges.map(e => EDGES[e].w)) / 2; if (Math.abs(n.x - v.x) < w && Math.abs(n.z - v.z) < w) { node = n; break; } }
      if (node && node !== this.lastNode && kmh > 15) { const axis = Math.abs(Math.sin(v.yaw)) > Math.abs(Math.cos(v.yaw)) ? 'x' : 'z'; if (lightState(axis) === 'r') this.fine(60000, '신호위반 (빨간불)', true); }
      this.lastNode = node;
      // 인도 주행: 도로에서 멀리 + 시내 + 빠르게
      if (kmh > 25 && roadDistAt(v.x, v.z) > 3.5 && ['seoburi', 'jiolle', 'kaengjibe', 'plaza', 'simone'].includes(regionAt(v.x, v.z)) && PEDS.some(q => q.state !== 'dead' && q.state !== 'parked' && Math.hypot(q.x - v.x, q.z - v.z) < 12)) { if ((this.walkT = (this.walkT || 0) + 0.15) > 1.2) { this.walkT = 0; this.fine(40000, '인도 주행', true); } } else this.walkT = 0;
      // 음주운전
      if (ME.drunk > 0.5 && kmh > 10 && this.copsNear(v.x, v.z, 45)) this.fine(150000, '음주운전', true);
    }
  },
};
