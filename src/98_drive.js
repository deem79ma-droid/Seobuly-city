// @v 2026101323
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
  pads: [{ x: 60, z: 150 }, { x: -900, z: -150 }, { x: 2030, z: 700 }, { x: 760, z: 180 }],
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
    });
  },
  drive(v, dt, inp) {
    const M = v.M, pilot = !!v.driver && !v.dead;
    v.rpm = damp(v.rpm || 0, pilot ? 1 : 0, pilot ? 0.9 : 0.35, dt); const lift = v.rpm > 0.82;
    let gy = floorAt(v.x, v.z, v.y + 0.3); const onG = v.y <= gy + 0.08;
    // 상승/하강
    const tvy = lift ? (inp.up ? 8 : 0) - (inp.down ? 7 : 0) + (onG && !inp.up ? -1 : 0) : -40;
    v.vy = lift ? damp(v.vy || 0, tvy, 2.2, dt) : (v.vy || 0) - 16 * dt;
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
  list: [], cool: 0,
  throw() {
    if (!G.started || ME.dead || ME.jail || INTERIOR.cur || winOpen()) return;
    if ((ME.inv.grenade | 0) <= 0) { toast('수류탄이 없다 — 총포사에서 산다'); return; }
    if (G.t < this.cool) return; this.cool = G.t + 0.9; ME.inv.grenade--; UI.updateInv && UI.updateInv();
    const cp = Math.cos(CAM.pitch), sp = Math.sin(CAM.pitch); const fx = Math.sin(CAM.yaw) * cp, fz = Math.cos(CAM.yaw) * cp; const up = clamp(-sp + 0.35, 0.15, 1);
    const a = anchorOf(ME); const o = { x: a.x + fx * 0.6, y: a.y + 1.7, z: a.z + fz * 0.6, vx: fx * 17 + (ME.vx || 0), vy: up * 11, vz: fz * 17 + (ME.vz || 0), by: ME.id };
    this.spawn(o); NET.send({ t: 'nade', o }); ME.action = 'shoot'; ME.actionT = 0; sfx('whoosh');
  },
  spawn(o) {
    const m = new THREE.Group(); const b = new THREE.Mesh(CG.sph, cmat('#3a4a2a', 0.7)); b.scale.set(0.09, 0.11, 0.09); m.add(b); const p = new THREE.Mesh(CG.box, cmat('#888888', 0.4, 0.8)); p.scale.set(0.05, 0.05, 0.05); p.position.y = 0.11; m.add(p);
    m.position.set(o.x, o.y, o.z); scene.add(m); this.list.push(Object.assign({ t: 2.4, m }, o));
  },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const g = this.list[i]; g.t -= dt; g.vy -= 20 * dt; g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt;
      const fl = floorAt(g.x, g.z, g.y + 0.3); if (g.y < fl + 0.08) { g.y = fl + 0.08; if (g.vy < -2) sfx('step', g.x, g.z, 0.4); g.vy = -g.vy * 0.32; g.vx *= 0.6; g.vz *= 0.6; }
      const r = resolveCircle(g.x, g.z, 0.1, g.y, 0.2); if (r.hit) { g.x = r.x; g.z = r.z; g.vx *= -0.4; g.vz *= -0.4; }
      g.m.position.set(g.x, g.y, g.z); g.m.rotation.x += dt * 8;
      if (g.t <= 0) { scene.remove(g.m); this.list.splice(i, 1); this.boom(g); }
    }
  },
  boom(g) {
    FX.explosion(g.x, g.y, g.z, 0.9); sfx('explode', g.x, g.z); const d = Math.hypot(camera.position.x - g.x, camera.position.z - g.z); if (d < 40) CAM.shake = Math.min(0.8, CAM.shake + (40 - d) / 60);
    const R = 8, DMG = 140;
    if (G.isHost || !G.online) damageArea(g.x, g.y, g.z, R, DMG, g.by);
    if (!G.isHost && G.online && g.by === ME.id && !ME.dead) { const dm = Math.hypot(ME.x - g.x, ME.z - g.z); if (dm < R) { const k = 1 - dm / R; ME.takeDamage(DMG * k, 'boom', 'boom'); ME.knock((ME.x - g.x) / (dm || 1) * k * 8, (ME.z - g.z) / (dm || 1) * k * 8); } }
    for (const v of vehicles.values()) { const dv = Math.hypot(v.x - g.x, v.z - g.z); if (dv < R && v.ctrl === 'local' && !G.isHost && G.online) v.damage(DMG * 6 * (1 - dv / R), g.by); }
  },
};

// ---------- 교통법규: 제한속도 · 신호위반 · 음주운전 · 인도 주행 ----------
const TRAFFIC_LAW = {
  overT: 0, cool: 0, lastNode: null, warnT: 0,
  limit(x, z) { const r = regionAt(x, z); return r === 'disanbay' ? 80 : r === 'sea' ? 90 : r === 'plaza' ? 40 : 60; },
  copsNear(x, z, r) { return PEDS.some(q => q.kind === 'police' && q.state !== 'dead' && q.state !== 'parked' && Math.hypot(q.x - x, q.z - z) < r) || [...vehicles.values()].some(o => o.model === 'police' && o.ai && Math.hypot(o.x - x, o.z - z) < r); },
  fine(amt, why, crimeWanted) {
    if (G.t < this.cool) return; this.cool = G.t + 25;
    const cop = this.copsNear(ME.x, ME.z, 70);
    if (cop && crimeWanted) { addWanted(1); toast(`교통경찰에게 걸렸다 — ${why} · 수배 ★`, 4000); sfx('siren'); }
    const pay = Math.min(ME.money, amt); ME.money -= pay;
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
