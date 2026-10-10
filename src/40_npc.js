
// ================= NPC: PEDESTRIANS, POLICE, GANGS =================
const PEDS = []; const N_PED = 46; const PICKUPS = new Map(); let pickupSeq = 1;
const PED_LINES = { // 자아 있는 대사

  civ: ['안녕하세요!', '오늘 날씨 좋네요', '서불리 집값 미쳤어…', '캥지베 쪽은 가지 마세요', '이벤트광장 클럽 가봤어요?', '시모느 아일랜드 놀러가고 싶다', '배고프다…', '디산베이 공기 좋아요', '말 타봤어요? 디산베이 목장에 있어요'],
  police: ['안전 운전하세요', '수상한 사람 보면 신고하세요', '캥지베 갱단 때문에 바빠요'],
  gangA: ['여기 레드 크루 구역이다', '뭘 봐?', '블루 놈들 보이면 말해'], gangB: ['블루 독스 구역이야', '꺼져라', '레드 놈들 어디 있냐'],
  medic: ['다치면 병원으로 오세요', '건강이 최고예요'], worker: ['공사중입니다!', '안전모 필수!'],
};
function pedKindFor(region) {
  const r = Math.random();
  switch (region) {
    case 'kaengjibe': return r < 0.42 ? 'gangA' : r < 0.84 ? 'gangB' : r < 0.95 ? 'civ' : 'police';
    case 'seoburi': return r < 0.82 ? 'civ' : r < 0.95 ? 'police' : 'medic';
    case 'jiolle': return r < 0.85 ? 'civ' : r < 0.94 ? 'police' : 'worker';
    case 'plaza': return r < 0.9 ? 'civ' : 'police';
    default: return r < 0.94 ? 'civ' : 'police';
  }
}
function makePed(i) {
  const p = { id: i, kind: 'civ', x: 0, y: 0, z: 0, yaw: 0, spd: 0, hp: 100, state: 'walk', seed: 0, char: null, e: 0, dir: 1, t: 0, side: 1, timer: 0, target: null, weapon: 'fist', fireT: 0, anim: 0, act: null, actT: 1, raid: false, dance: -1 };
  PEDS.push(p); return p;
}
function pedSetIdentity(p, kind, seed) {
  p.kind = kind; p.seed = seed; const r = mulberry32(seed);
  const ok = kind === 'gangA' || kind === 'gangB' || kind === 'police' || kind === 'doctor' || kind === 'worker' ? kind : 'civ';
  p.outfit = randomOutfit(r, kind === 'medic' ? 'doctor' : ok);
  if (p.char) p.char.setOutfit(p.outfit);
  p.weapon = kind === 'police' ? 'pistol' : (kind === 'gangA' || kind === 'gangB') ? (r() < 0.65 ? (r() < 0.6 ? 'pistol' : 'smg') : 'bat') : 'fist';
  if (p.char) p.char.setWeapon(p.weapon === 'fist' ? 'fist' : null);
  p.hp = kind === 'police' ? 140 : kind.startsWith('gang') ? 120 : 90; p.state = 'walk'; p.target = null; p.raid = false; p.dance = -1; p.fear = 0; p.personality = r() < 0.33 ? 'calm' : r() < 0.66 ? 'busy' : 'social'; p.homeRegion = pick(['plaza','seoburi','jiolle','kaengjibe','disanbay']);
}
function pedEnsureChar(p) {
  if (p.char) return; p.char = new Character(p.outfit || randomOutfit(mulberry32(p.seed || 1))); scene.add(p.char.root); p.char.root.visible = false; p.char.setShadow(false); p.shadowOn = false;
}
function placePedOnEdge(p, e, t, side, dir) {
  const E = EDGES[e]; const a = NODES[E.a], b = NODES[E.b]; p.e = e; p.t = t; p.side = side; p.dir = dir;
  const dx = (b.x - a.x) / E.len, dz = (b.z - a.z) / E.len; const off = E.w / 2 + 2.6;
  p.x = a.x + dx * t + (-dz) * off * side; p.z = a.z + dz * t + dx * off * side; p.y = groundHeight(p.x, p.z);
}
let EDGE_CELLS = null;
function buildEdgeCells() {
  EDGE_CELLS = new Map();
  for (const e of EDGES) { const a = NODES[e.a], b = NODES[e.b]; const n = Math.ceil(e.len / 40); for (let i = 0; i <= n; i++) { const x = lerp(a.x, b.x, i / n), z = lerp(a.z, b.z, i / n); const k = Math.floor(x / 100) + ',' + Math.floor(z / 100); let l = EDGE_CELLS.get(k); if (!l) EDGE_CELLS.set(k, l = []); if (!l.includes(e)) l.push(e); } }
}
function edgeNearPoint(px, pz, minD, maxD, filter) {
  if (!EDGE_CELLS) buildEdgeCells();
  for (let k = 0; k < 30; k++) {
    const ang = Math.random() * TAU, r = rnd(minD, maxD); const qx = px + Math.sin(ang) * r, qz = pz + Math.cos(ang) * r;
    const l = EDGE_CELLS.get(Math.floor(qx / 100) + ',' + Math.floor(qz / 100)); if (!l || !l.length) continue;
    const e = l[Math.floor(Math.random() * l.length)]; if (filter && !filter(e)) continue;
    const a = NODES[e.a], b = NODES[e.b]; const dx = (b.x - a.x) / e.len, dz = (b.z - a.z) / e.len;
    const t = clamp((qx - a.x) * dx + (qz - a.z) * dz, 2, e.len - 2); const x = a.x + dx * t, z = a.z + dz * t;
    const dd = Math.hypot(x - px, z - pz); if (dd >= minD * 0.8 && dd <= maxD * 1.1) return { e: e.id, t };
  }
  return null;
}
function playersList() { // positions of all players (host view)
  // 실내에 있는 사람은 건물 문 앞 좌표로 취급(NPC가 실내 좌표로 몰려가지 않게), 수감자는 수배 0
  const L = []; if (!ME.dead) { const a = anchorOf(ME); const ins = !!INTERIOR.cur; L.push({ id: ME.id, x: a.x, y: a.y, z: a.z, wanted: ins || ME.jail ? 0 : ME.wanted, grudge: ins ? {} : ME.grudge, inVeh: !!ME.vehicle, me: true, inside: ins }); }
  for (const [id, rp] of G.players) if (!rp.dead) { const a = anchorOf(rp); const ins = (rp.bi ?? -1) >= 0; L.push({ id, x: a.x, y: a.y, z: a.z, wanted: ins || rp.jail ? 0 : rp.wanted || 0, grudge: ins ? {} : rp.grudge || {}, inVeh: !!rp.veh, inside: ins }); }
  return L;
}
function nearestPlayerDist(x, z) { let d = 1e9; if (typeof ME !== 'undefined') { const a = anchorOf(ME); d = Math.hypot(a.x - x, a.z - z); } for (const rp of G.players.values()) { const a = anchorOf(rp); d = Math.min(d, Math.hypot(a.x - x, a.z - z)); } return d; }
function spawnPedNear(p, px, pz) {
  const r = edgeNearPoint(px, pz, 50, 190, e => !e.bridge); if (!r) return false;
  placePedOnEdge(p, r.e, r.t, Math.random() < 0.5 ? 1 : -1, Math.random() < 0.5 ? 1 : -1);
  const R = regionAt(p.x, p.z); if (R === 'sea') return false;
  pedSetIdentity(p, pedKindFor(R), (Math.random() * 1e9) | 0);
  if (R === 'plaza' && p.kind === 'civ' && Math.random() < 0.3) { p.state = 'club'; p.x = CLUB.x + rnd(-12, 12); p.z = CLUB.z + rnd(-8, 8); p.y = LAND + 0.62; p.dance = Math.floor(Math.random() * 8); }
  p.spawnT = G.t; return true;
}
function initPeds() { for (let i = 0; i < N_PED; i++) { const p = makePed(i); pedSetIdentity(p, 'civ', i * 7919 + 13); p.state = 'parked'; p.x = 0; p.z = 0; } }
// hostile check: returns true if ped p wants to attack target t
function pedHostileTo(p, t) {
  if (t.isPed) {
    const q = t.ref; if (q.state === 'dead') return false;
    if (p.kind === 'gangA' && q.kind === 'gangB' || p.kind === 'gangB' && q.kind === 'gangA') return true;
    if (p.raid && !q.kind.startsWith('gang')) return q.kind === 'police';
    if (p.kind === 'police' && q.kind.startsWith('gang') && (q.state === 'fight' || q.raid)) return true;
    return false;
  }
  // player
  if (p.kind === 'police') return t.wanted > 0;
  if (p.kind.startsWith('gang')) return p.raid || ((t.grudge && t.grudge[p.kind]) || 0) > G.t;
  return false;
}
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3();
function hostUpdatePeds(dt) {
  const players = playersList();
  const anyP = players.length ? players : [{ x: ME.x, z: ME.z }];
  for (const p of PEDS) {
    // relocation
    if (p.state !== 'dead') { const nd = nearestPlayerDist(p.x, p.z); if ((p.state === 'parked' || nd > 240) && !(p.raid && G.raid)) { const pl = pick(anyP); if (spawnPedNear(p, pl.x, pl.z)) { } continue; } }
    p.timer -= dt; p.fireT -= dt; p.actT = Math.min(1, p.actT + dt * (p.act === 'punchR' || p.act === 'punchL' ? 3 : 2));
    if (p.state === 'dead') { if (p.timer <= 0) { p.state = 'parked'; } continue; }
    if (p.state === 'knocked') { if (p.timer <= 0) p.state = 'flee', p.timer = 6; continue; }
    // perception every ~0.4s
    if ((p.percT = (p.percT || 0) - dt) <= 0) {
      p.percT = 0.35 + Math.random() * 0.2;
      if (p.kind !== 'civ' && p.kind !== 'medic' && p.kind !== 'worker') {
        let best = null, bd = p.kind === 'police' ? 70 : (p.raid ? 70 : 34);
        for (const pl of players) { const d = Math.hypot(pl.x - p.x, pl.z - p.z); if (d < bd && pedHostileTo(p, pl)) { bd = d; best = { kind: pl.me ? 'me' : 'player', id: pl.id }; } }
        for (const q of PEDS) { if (q === p || q.state === 'dead' || q.state === 'parked') continue; const d = Math.abs(q.x - p.x) + Math.abs(q.z - p.z); if (d < bd && pedHostileTo(p, { isPed: true, ref: q })) { bd = d; best = { kind: 'ped', id: q.id }; } }
        if (best) { p.target = best; p.state = 'fight'; if (p.weapon !== 'fist' && p.char) p.char.setWeapon(p.weapon); }
        else if (p.state === 'fight') { p.target = null; if (p.raid) p.state = 'raid'; else { p.state = 'walk'; snapToNearestEdge(p); } }
      }
    }
    if (p.state === 'walk') pedWalk(p, dt);
    else if (p.state === 'idle') { p.spd = 0; if (p.timer <= 0) p.state = 'walk'; }
    else if (p.state === 'flee') { pedFlee(p, dt); }
    else if (p.state === 'fight') { pedFight(p, dt); }
    else if (p.state === 'raid') { pedRaidMove(p, dt); }
    else if (p.state === 'club') { p.spd = 0; p.yaw += dt * 0.2; if (Math.random() < dt * 0.02) p.dance = Math.floor(Math.random() * 8); }
    else if (p.state === 'dance') { p.spd = 0; if (p.timer <= 0) { p.state = 'walk'; p.dance = -1; } }
    else if (p.state === 'talk') { p.spd = 0; if (p.timer <= 0) p.state = 'walk'; }
  }
  if (G.isHost) raidUpdate(dt);
}
function snapToNearestEdge(p) {
  let best = null, bd = 1e9; const cx = Math.floor(p.x / 200), cz = Math.floor(p.z / 200);
  for (const e of EDGES) { const a = NODES[e.a], b = NODES[e.b]; const d = distSeg(p.x, p.z, a.x, a.z, b.x, b.z); if (d < bd) { bd = d; best = e; } }
  if (!best) return; const a = NODES[best.a], b = NODES[best.b]; const dx = (b.x - a.x) / best.len, dz = (b.z - a.z) / best.len;
  const t = clamp((p.x - a.x) * dx + (p.z - a.z) * dz, 0, best.len); const side = ((p.x - a.x) * (-dz) + (p.z - a.z) * dx) > 0 ? 1 : -1;
  p.e = best.id; p.t = t; p.side = side; p.dir = Math.random() < 0.5 ? 1 : -1; p.rejoin = true;
}
function pedWalk(p, dt) {
  const E = EDGES[p.e]; const a = NODES[E.a], b = NODES[E.b]; const sp = p.kind === 'police' ? 1.5 : 1.35 + (p.seed % 5) * 0.08;
  p.t += p.dir * sp * dt;
  if (p.t < 0 || p.t > E.len) {
    const node = p.t < 0 ? a : b; const opts = node.edges.filter(x => x !== p.e && !EDGES[x].bridge); const ne = opts.length ? pick(opts) : p.e; const NE = EDGES[ne];
    p.e = ne; p.dir = NE.a === node.id ? 1 : -1; p.t = p.dir > 0 ? 0 : NE.len;
    if (Math.random() < 0.08) { p.state = 'idle'; p.timer = rnd(3, 8); }
  }
  const E2 = EDGES[p.e]; const A = NODES[E2.a], Bn = NODES[E2.b]; const dx = (Bn.x - A.x) / E2.len, dz = (Bn.z - A.z) / E2.len; const off = E2.w / 2 + 2.6;
  const tx = A.x + dx * p.t + (-dz) * off * p.side, tz = A.z + dz * p.t + dx * off * p.side;
  const mx = tx - p.x, mz = tz - p.z; const md = Math.hypot(mx, mz);
  if (md > 0.01) { const k = p.rejoin ? Math.min(1, sp * 2.5 * dt / md) : 1; p.x += mx * k; p.z += mz * k; if (p.rejoin && md < 0.5) p.rejoin = false; if (md > 0.02) p.yaw = dampAng(p.yaw, Math.atan2(mx, mz), 8, dt); }
  p.spd = sp; p.y = groundHeight(p.x, p.z, p.y + 1);
  if (p.rejoin) { const r = resolveCircle(p.x, p.z, 0.3, p.y, 1.7); p.x = r.x; p.z = r.z; }
  if (Math.random() < dt * 0.01 && p.char) p.char.say(pick(PED_LINES[p.kind] || PED_LINES.civ), 4);
}
function pedRaidMove(p, dt) {
  if (!G.raid) { p.raid = false; p.state = 'walk'; snapToNearestEdge(p); return; }
  if (p.rtx === undefined || Math.hypot(p.rtx - p.x, p.rtz - p.z) < 3) { p.rtx = G.raid.x + rnd(-25, 25); p.rtz = G.raid.z + rnd(-25, 25); }
  p.spd = 4.2; p.yaw = dampAng(p.yaw, Math.atan2(p.rtx - p.x, p.rtz - p.z), 6, dt);
  p.x += Math.sin(p.yaw) * p.spd * dt; p.z += Math.cos(p.yaw) * p.spd * dt;
  const r = resolveCircle(p.x, p.z, 0.3, p.y, 1.7); if (r.hit) { p.rtx = undefined; } p.x = r.x; p.z = r.z; p.y = groundHeight(p.x, p.z, p.y + 1);
}
function pedFlee(p, dt) {
  p.spd = 5.8; const dx = p.x - (p.fx ?? p.x + 1), dz = p.z - (p.fz ?? p.z); const d = Math.hypot(dx, dz) || 1;
  p.yaw = dampAng(p.yaw, Math.atan2(dx, dz) + Math.sin(G.t + p.id) * 0.4, 5, dt);
  p.x += Math.sin(p.yaw) * p.spd * dt; p.z += Math.cos(p.yaw) * p.spd * dt;
  const r = resolveCircle(p.x, p.z, 0.3, p.y, 1.7); if (r.hit) { p.yaw += Math.PI * 0.5 * (p.id % 2 ? 1 : -1); } p.x = r.x; p.z = r.z; p.y = groundHeight(p.x, p.z, p.y + 1);
  if (terrainH(p.x, p.z) < LAND - 1) { p.yaw += Math.PI; }
  if (p.timer <= 0) { p.state = 'walk'; snapToNearestEdge(p); }
}
function targetPos(tg) {
  if (!tg) return null;
  if (tg.kind === 'me') return ME.dead || INTERIOR.cur || ME.jail ? null : { x: ME.x, y: ME.y, z: ME.z, veh: ME.vehicle };
  if (tg.kind === 'player') { const rp = G.players.get(tg.id); return rp && !rp.dead && !((rp.bi ?? -1) >= 0) && !rp.jail ? { x: rp.x, y: rp.y, z: rp.z } : null; }
  if (tg.kind === 'ped') { const q = PEDS[tg.id]; return q && q.state !== 'dead' && q.state !== 'parked' ? { x: q.x, y: q.y, z: q.z } : null; }
  return null;
}
function pedFight(p, dt) {
  const tp = targetPos(p.target); if (!tp) { p.state = p.raid ? 'raid' : 'walk'; p.target = null; if (!p.raid) snapToNearestEdge(p); return; }
  if (p.hitAt && G.t >= p.hitAt) { p.hitAt = 0; if (Math.hypot(tp.x - p.x, tp.z - p.z) < 2.2) { dealDamage(p.target, p.weapon === 'bat' ? 18 : 8, 'n' + p.id, { kind: 'melee' }); sfx('punch', p.x, p.z); } }
  const dx = tp.x - p.x, dz = tp.z - p.z, d = Math.hypot(dx, dz);
  const W = WEAPONS[p.weapon]; const ranged = !W.melee; const want = ranged ? (p.kind === 'police' ? 14 : 11) : 1.3;
  p.yaw = dampAng(p.yaw, Math.atan2(dx, dz), 8, dt);
  if (d > want) { p.spd = d > 25 ? 5.5 : 3.8; p.x += Math.sin(p.yaw) * p.spd * dt; p.z += Math.cos(p.yaw) * p.spd * dt; }
  else if (ranged && d < want * 0.5) { p.spd = 2; p.x -= Math.sin(p.yaw) * 2 * dt; p.z -= Math.cos(p.yaw) * 2 * dt; }
  else { p.spd = 0; if (ranged) { const st = Math.sin(G.t * 0.7 + p.id) * 1.6; p.x += Math.cos(p.yaw) * st * dt; p.z -= Math.sin(p.yaw) * st * dt; } }
  const r = resolveCircle(p.x, p.z, 0.3, p.y, 1.7); p.x = r.x; p.z = r.z; p.y = groundHeight(p.x, p.z, p.y + 1);
  p.aiming = ranged && d < 60;
  // police: low wanted → melee only
  const tgtWanted = p.target.kind === 'me' ? ME.wanted : p.target.kind === 'player' ? (G.players.get(p.target.id)?.wanted || 0) : 9;
  const useGun = ranged && !(p.kind === 'police' && tgtWanted < 3 && p.target.kind !== 'ped');
  if (p.fireT <= 0) {
    if (useGun && d < 70) {
      p.fireT = W.rate * (W.auto ? rnd(1, 3) : rnd(2.5, 5)); p.act = 'shoot'; p.actT = 0;
      // LOS
      _v1.set(p.x, p.y + 1.45, p.z); _v2.set(tp.x - p.x, (tp.y + 1.2) - (p.y + 1.45), tp.z - p.z); const L = _v2.length(); _v2.divideScalar(L);
      const hitW = rayColliders(_v1.x, _v1.y, _v1.z, _v2.x, _v2.y, _v2.z, L);
      const acc = clamp(0.75 - d / 90, 0.12, 0.7) * (tp.veh ? 0.6 : 1);
      const hit = !hitW.c && Math.random() < acc;
      const end = hit ? { x: tp.x, y: tp.y + 1.2, z: tp.z } : { x: tp.x + rnd(-2, 2), y: tp.y + rnd(0.2, 2.5), z: tp.z + rnd(-2, 2) };
      if (hitW.c && hitW.t < L) { end.x = _v1.x + _v2.x * hitW.t; end.y = _v1.y + _v2.y * hitW.t; end.z = _v1.z + _v2.z * hitW.t; }
      const mz = { x: p.x + Math.sin(p.yaw) * 0.5, y: p.y + 1.45, z: p.z + Math.cos(p.yaw) * 0.5 };
      showShot(mz, end, W.sfx, hit ? (p.target.kind === 'ped' ? 'blood' : 'blood') : 'dust');
      NET.send({ t: 'shot', a: [mz.x, mz.y, mz.z], b: [end.x, end.y, end.z], w: p.weapon, i: hit ? 'blood' : 'dust' });
      if (hit) dealDamage(p.target, W.dmg * (p.kind === 'police' ? 0.8 : 0.7), 'n' + p.id, { kind: 'gun' });
    } else if (d < 1.8) {
      p.fireT = 0.7; p.act = Math.random() < 0.5 ? 'punchR' : 'punchL'; p.actT = 0;
      if (p.weapon === 'bat') p.act = 'bat';
      p.hitAt = G.t + 0.15;
    }
  }
}
function showShot(a, b, w, imp) {
  sfx(w || 'pistol', a.x, a.z);
  _v1.set(b.x - a.x, b.y - a.y, b.z - a.z).normalize();
  FX.muzzle(new THREE.Vector3(a.x, a.y, a.z), _v1); FX.tracer(a, b); if (imp) FX.impact(b, imp);
}
// damage to ped (host authoritative)
function pedDamage(p, amt, from, opts = {}) {
  if (!p || p.state === 'dead' || p.state === 'parked') return;
  p.hp -= amt; if (p.char) p.char.flash = 0.2; p.act = 'hit'; p.actT = 0;
  const fromPlayer = from && !String(from).startsWith('n');
  if (fromPlayer) {
    // wanted / grudge
    const policeNear = PEDS.some(q => q.kind === 'police' && q.state !== 'dead' && q.state !== 'parked' && Math.hypot(q.x - p.x, q.z - p.z) < 45);
    if (p.kind === 'police') notifyPlayer(from, { t: 'wanted', add: p.hp <= 0 ? 2 : 1 });
    else if (policeNear || p.kind === 'civ' && Math.random() < 0.25) notifyPlayer(from, { t: 'wanted', add: 1 });
    if (p.kind.startsWith('gang')) notifyPlayer(from, { t: 'grudge', g: p.kind });
    const tg = { kind: from === ME.id ? 'me' : 'player', id: from };
    if (p.kind !== 'civ' && p.kind !== 'medic' && p.kind !== 'worker') { p.target = tg; p.state = 'fight'; if (p.char) p.char.setWeapon(p.weapon); }
    else if (Math.random() < 0.3 && opts.kind === 'melee') { p.target = tg; p.state = 'fight'; p.weapon = 'fist'; }
    else { p.state = 'flee'; p.timer = rnd(8, 14); const fp = targetPos(tg); if (fp) { p.fx = fp.x; p.fz = fp.z; } }
  } else if (from && String(from).startsWith('n')) {
    const q = PEDS[+String(from).slice(1)]; if (q && p.kind !== 'civ') { p.target = { kind: 'ped', id: q.id }; p.state = 'fight'; }
    else if (q) { p.state = 'flee'; p.timer = 10; p.fx = q.x; p.fz = q.z; }
  }
  if (opts.kind === 'car' && p.hp > 0) { p.state = 'knocked'; p.timer = 2.2; }
  if (p.hp <= 0) {
    p.state = 'dead'; p.timer = 25; p.spd = 0; p.target = null;
    const amtCash = p.kind.startsWith('gang') ? Math.floor(rnd(80, 600)) : p.kind === 'police' ? Math.floor(rnd(50, 200)) : Math.floor(rnd(20, 260));
    spawnPickup(p.x + rnd(-0.5, 0.5), p.z + rnd(-0.5, 0.5), amtCash);
    if (fromPlayer) notifyPlayer(from, { t: 'kill', k: p.kind });
  }
  // nearby civilians panic
  if (opts.kind === 'gun' || p.hp <= 0) panicAround(p.x, p.z, 30);
}
function panicAround(x, z, r) {
  for (const q of PEDS) if ((q.kind === 'civ' || q.kind === 'worker' || q.kind === 'medic') && (q.state === 'walk' || q.state === 'idle' || q.state === 'talk' || q.state === 'club') && Math.abs(q.x - x) < r && Math.abs(q.z - z) < r) { q.state = 'flee'; q.timer = rnd(6, 12); q.fx = x; q.fz = z; q.dance = -1; }
  for (const an of ANIMALS) if (!an.S.predator && an.state !== 'dead' && an.state !== 'follow' && Math.abs(an.x - x) < r && Math.abs(an.z - z) < r) { an.state = 'flee'; an.timer = 6; an.fx = x; an.fz = z; }
}
function spawnPickup(x, z, amount, id) {
  id = id || 'k' + (pickupSeq++) + '_' + (typeof ME !== 'undefined' ? String(ME.id).slice(-5) : ''); const y = groundHeight(x, z) + 0.4;
  const m = new THREE.Group(); const bill = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.18), new THREE.MeshStandardMaterial({ color: 0x3aa04a, emissive: 0x1a6a2a, emissiveIntensity: 0.8 })); m.add(bill);
  const b2 = bill.clone(); b2.position.y = 0.07; b2.rotation.y = 0.4; m.add(b2); m.position.set(x, y, z); scene.add(m);
  PICKUPS.set(id, { id, x, y, z, amount, mesh: m });
  if (G.isHost && G.online) NET.send({ t: 'pickAdd', id, x, z, a: amount });
  return id;
}
function removePickup(id) { const p = PICKUPS.get(id); if (!p) return; scene.remove(p.mesh); PICKUPS.delete(id); }
// ----- raids -----
G.raidT = 200;
function raidUpdate(dt) {
  if (G.raid) {
    G.raid.t -= dt; const alive = PEDS.filter(p => p.raid && p.state !== 'dead' && p.state !== 'parked');
    if (G.raid.t <= 0 || !alive.length) { announce('갱단 습격 종료', alive.length ? '갱단이 퇴각했다' : '갱단을 모두 제압했다!'); NET.send({ t: 'ann', a: '갱단 습격 종료', b: '' }); for (const p of PEDS) if (p.raid) { p.raid = false; if (p.state !== 'dead') p.state = 'parked'; } G.raid = null; G.raidT = rnd(240, 420); }
    return;
  }
  G.raidT -= dt; if (G.raidT > 0) return;
  const spots = [{ x: 0, z: 40, name: '이벤트광장' }, { x: 580, z: -60, name: '서불리 중심가' }, { x: 900, z: 200, name: '서불리 남부' }];
  const pl = playersList(); const sp = pl.length ? spots.slice().sort((a, b) => Math.hypot(a.x - pl[0].x, a.z - pl[0].z) - Math.hypot(b.x - pl[0].x, b.z - pl[0].z))[0] : spots[0];
  G.raid = { t: 150, x: sp.x, z: sp.z, name: sp.name };
  const fac = Math.random() < 0.5 ? 'gangA' : 'gangB';
  const sorted = PEDS.slice().sort((a, b) => nearestPlayerDist(b.x, b.z) - nearestPlayerDist(a.x, a.z));
  for (let i = 0; i < 7; i++) {
    const p = sorted[i]; pedSetIdentity(p, fac, (Math.random() * 1e9) | 0); p.weapon = pick(['pistol', 'smg', 'smg', 'rifle']); p.raid = true; p.hp = 150;
    const a = rnd(0, TAU); p.x = sp.x + Math.sin(a) * rnd(30, 55); p.z = sp.z + Math.cos(a) * rnd(30, 55); p.y = groundHeight(p.x, p.z); p.state = 'raid'; p.target = null; p.percT = 0; p.rtx = undefined;
    const res = resolveCircle(p.x, p.z, 0.3, p.y, 1.7); p.x = res.x; p.z = res.z;
  }
  for (let i = 7; i < 11; i++) { const p = sorted[i]; pedSetIdentity(p, 'police', (Math.random() * 1e9) | 0); p.x = sp.x + rnd(-50, 50); p.z = sp.z + rnd(-50, 50); p.y = groundHeight(p.x, p.z); const res = resolveCircle(p.x, p.z, 0.3, p.y, 1.7); p.x = res.x; p.z = res.z; p.state = 'walk'; snapToNearestEdge(p); p.raidCop = true; }
  const t1 = `⚠ 캥지베 ${fac === 'gangA' ? '레드 크루' : '블루 독스'} 습격!`, t2 = `${sp.name}에서 총격전 발생`;
  announce(t1, t2); NET.send({ t: 'ann', a: t1, b: t2 });
}
// ----- render peds (all clients) -----
const PED_ANIM_STATES = ['walk', 'idle', 'flee', 'fight', 'dead', 'knocked', 'club', 'dance', 'talk', 'parked'];
function renderPeds(dt, cam) {
  const view = Q().npcView;
  for (const p of PEDS) {
    if (p.state === 'parked') { if (p.char) p.char.root.visible = false; continue; }
    const d = Math.hypot(p.x - cam.x, p.z - cam.z);
    if (d > view) { if (p.char) p.char.root.visible = false; continue; }
    pedEnsureChar(p); const c = p.char; c.root.visible = true;
    if (!G.isHost && p.tx !== undefined) { p.x = damp(p.x, p.tx, 10, dt); p.z = damp(p.z, p.tz, 10, dt); p.y = damp(p.y, p.ty, 10, dt); p.yaw = dampAng(p.yaw, p.tyaw, 10, dt); }
    c.root.position.set(p.x, p.y, p.z); c.root.rotation.y = p.yaw;
    const wantShadow = d < 45; if (wantShadow !== p.shadowOn) { c.setShadow(wantShadow); p.shadowOn = wantShadow; }
    const st = p.state === 'dead' ? 'dead' : p.state === 'knocked' ? 'knocked' : 'normal';
    c.setWeapon(((p.state === 'fight' || p.state === 'raid') && p.weapon !== 'fist') ? p.weapon : 'fist');
    c.update(dt, { speed: p.spd, grounded: true, state: st, aiming: p.aiming && p.state === 'fight', aimPitch: 0, action: p.act, actionT: p.actT, dance: (p.state === 'club' || p.state === 'dance') ? p.dance : -1, guard: p.state === 'fight' && p.weapon === 'fist', idleLook: 1, work: p.kind === 'worker' && p.state === 'idle' });
  }
}
// ================= TRAFFIC =================
const TRAFFIC = []; const N_TRAFFIC = 24;
const TRAFFIC_MODELS = ['sedan', 'sedan', 'taxi', 'hatch', 'suv', 'van', 'pickup', 'police', 'sedan', 'taxi', 'bike', 'scooter', 'hatch', 'suv', 'sports', 'sedan', 'police', 'van', 'sedan', 'taxi', 'hatch', 'pickup', 'suv', 'sedan'];
function initTraffic() {
  const r = mulberry32(777);
  for (let i = 0; i < N_TRAFFIC; i++) {
    const model = TRAFFIC_MODELS[i % TRAFFIC_MODELS.length]; const col = model === 'taxi' ? '#f0c020' : model === 'police' ? '#f4f4f4' : CAR_COLORS[Math.floor(r() * CAR_COLORS.length)];
    const v = new Vehicle('T' + i, model, col, 0, -3000 - i * 10, 0); v.ai = { e: 0, dir: 1, next: -1, parked: true, stuck: 0 }; v.mesh.visible = false; v.isTraffic = true; TRAFFIC.push(v);
    v.npcDriver = new Character(randomOutfit(r, model === 'police' ? 'police' : 'civ'), { shadow: false }); v.mesh.add(v.npcDriver.root); v.npcDriver.root.position.copy(v.seat);
  }
}
function trafficPlace(v, e, t, dir) {
  const E = EDGES[e]; const a = NODES[E.a], b = NODES[E.b]; const dx = (b.x - a.x) / E.len * dir, dz = (b.z - a.z) / E.len * dir; const lane = E.w / 4 + 0.2;
  const base = clamp(t, 3, E.len - 3); const sx = a.x + (b.x - a.x) / E.len * base, sz = a.z + (b.z - a.z) / E.len * base;
  v.x = sx + (-dz) * lane; v.z = sz + dx * lane; v.yaw = Math.atan2(dx, dz); v.y = groundHeight(v.x, v.z); v.speed = 8; v.side = 0; v.vy = 0;
  v.ai.e = e; v.ai.dir = dir; v.ai.next = -1; v.ai.parked = false; v.ai.stuck = 0; v.hp = v.M.hp; v.dead = false; v.burnT = 0; v.deadT = 0; v.waterT = 0;
  if (v.bodyMat) { v.bodyMat.color.set(v.color); v.bodyMat.metalness = 0.65; v.bodyMat.roughness = 0.28; v.bodyMat.clearcoat = 1; }
  v.driver = null; v.npcDriver.root.visible = true; v.mesh.visible = true; v.siren = false;
}
// 방장이 바뀌었을 때: 게스트 화면에서 보이던 교통 차량을 가장 가까운 도로에 다시 태운다
function trafficAdopt(v) {
  let best = null, bd = 1e9; for (const e of EDGES) { const a = NODES[e.a], b = NODES[e.b]; const d = distSeg(v.x, v.z, a.x, a.z, b.x, b.z); if (d < bd) { bd = d; best = e; } }
  if (!best || bd > 30 || (v.x === 0 && v.z < -2000)) { v.ai = { e: 0, dir: 1, next: -1, parked: true, stuck: 0 }; v.mesh.visible = false; if (v.npcDriver) v.npcDriver.root.visible = false; return; }
  const a = NODES[best.a], b = NODES[best.b]; const dir = (Math.sin(v.yaw) * (b.x - a.x) + Math.cos(v.yaw) * (b.z - a.z)) >= 0 ? 1 : -1;
  v.ai = { e: best.id, dir, next: -1, parked: false, stuck: 0 }; if (v.npcDriver) v.npcDriver.root.visible = true;
}
function edgeEndNode(v) { const E = EDGES[v.ai.e]; return v.ai.dir > 0 ? NODES[E.b] : NODES[E.a]; }
function chooseNext(v) {
  const node = edgeEndNode(v); const opts = node.edges.filter(x => x !== v.ai.e); const ne = opts.length ? pick(opts) : v.ai.e; const E = EDGES[ne];
  return { e: ne, dir: E.a === node.id ? 1 : -1 };
}
function lanePoint(e, dir, s) { // point at distance s from start node along lane
  const E = EDGES[e]; const a = NODES[E.a], b = NODES[E.b]; const ux = (b.x - a.x) / E.len, uz = (b.z - a.z) / E.len; const dx = ux * dir, dz = uz * dir; const lane = E.w / 4 + 0.2;
  const start = dir > 0 ? a : b; return { x: start.x + dx * s + (-dz) * lane, z: start.z + dz * s + dx * lane };
}
function hostUpdateTraffic(dt) {
  const players = playersList(); const anyP = players.length ? players : [{ x: ME.x, z: ME.z }];
  for (const v of TRAFFIC) {
    if (!v.ai) continue; // hijacked
    const nd = nearestPlayerDist(v.x, v.z);
    if (v.ai.parked || nd > 360 || (v.dead && (v.deadT || 0) > 15)) {
      const pl = pick(anyP); const r = edgeNearPoint(pl.x, pl.z, 110, 300, e => !e.bridge || Math.random() < 0.3);
      if (r) { const dir = Math.random() < 0.5 ? 1 : -1; trafficPlace(v, r.e, r.t, dir); let clash = false; for (const o of vehicles.values()) if (o !== v && Math.hypot(o.x - v.x, o.z - v.z) < 9) clash = true; if (clash) { v.ai.parked = true; v.mesh.visible = false; v.x = 0; v.z = -3000; } }
      continue;
    }
    if (v.dead) { v.drive(dt, { throttle: 0, steer: 0, brake: 1 }); continue; }
    const E = EDGES[v.ai.e]; const len = E.len; const start = v.ai.dir > 0 ? NODES[E.a] : NODES[E.b];
    const ux = (v.ai.dir > 0 ? 1 : -1) * (NODES[E.b].x - NODES[E.a].x) / len, uz = (v.ai.dir > 0 ? 1 : -1) * (NODES[E.b].z - NODES[E.a].z) / len;
    const s = (v.x - start.x) * ux + (v.z - start.z) * uz; // progress
    if (v.ai.next < 0) { const n = chooseNext(v); v.ai.next = n.e; v.ai.ndir = n.dir; }
    if (s > len) { v.ai.e = v.ai.next; v.ai.dir = v.ai.ndir; v.ai.next = -1; continue; }
    const look = 7 + Math.abs(v.speed) * 0.5; let tgt;
    if (s + look < len) tgt = lanePoint(v.ai.e, v.ai.dir, s + look); else tgt = lanePoint(v.ai.next, v.ai.ndir, s + look - len);
    // police chase
    let targetSpeed = E.bridge ? 20 : (E.region === 'disanbay' ? 17 : 12.5);
    if (v.model === 'police') {
      let wantedP = null; for (const pl of players) if (pl.wanted >= 2 && Math.hypot(pl.x - v.x, pl.z - v.z) < 160) wantedP = pl;
      v.siren = !!wantedP;
      if (wantedP) { tgt = { x: wantedP.x, z: wantedP.z }; targetSpeed = Math.hypot(wantedP.x - v.x, wantedP.z - v.z) < 12 ? 0 : 26; }
    }
    const desired = Math.atan2(tgt.x - v.x, tgt.z - v.z); const ad = angDiff(v.yaw, desired);
    let steer = clamp(ad * 2.2, -1, 1);
    targetSpeed *= clamp(1 - Math.abs(ad) * 0.9, 0.3, 1);
    // traffic light
    const remain = len - s; const endN = edgeEndNode(v);
    if (endN.light && !v.siren && remain < E.w + 10 && remain > E.w / 2 + 2) { const ls = lightState(E.axis); if (ls !== 'g') targetSpeed = Math.min(targetSpeed, ls === 'y' && remain < E.w + 3 ? targetSpeed : 0); }
    // obstacles ahead
    const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw);
    const chk = (ox, oz, r) => { const dx = ox - v.x, dz = oz - v.z; const f = dx * fx + dz * fz; if (f < 0 || f > 14) return; const l = Math.abs(dx * fz - dz * fx); if (l < 1.6 + r) targetSpeed = Math.min(targetSpeed, Math.max(0, (f - 5.5) * 1.2)); };
    for (const o of vehicles.values()) if (o !== v && Math.abs(o.x - v.x) < 16 && Math.abs(o.z - v.z) < 16) chk(o.x, o.z, 0.8);
    for (const pl of players) if (!v.siren) chk(pl.x, pl.z, 0.3);
    for (const q of PEDS) if (q.state !== 'parked' && Math.abs(q.x - v.x) < 15 && Math.abs(q.z - v.z) < 15) chk(q.x, q.z, 0.3);
    const thr = v.speed < targetSpeed - 0.5 ? 1 : 0; const brk = v.speed > targetSpeed + 1;
    v.drive(dt, { throttle: thr, steer, brake: brk });
    // stuck recovery
    if (Math.abs(v.speed) < 0.3 && targetSpeed > 3) { v.ai.stuck += dt; if (v.ai.stuck > 6) { v.ai.parked = true; v.mesh.visible = false; } } else v.ai.stuck = 0;
    // hitting peds/players
    if (Math.abs(v.speed) > 4) runOverCheck(v, 'n');
  }
}
function runOverCheck(v, by) {
  const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw); const sp = Math.abs(v.speed);
  const hit = (x, z) => { const dx = x - v.x, dz = z - v.z; const f = dx * fx + dz * fz, l = dx * fz - dz * fx; return Math.abs(f) < v.M.L / 2 + 0.3 && Math.abs(l) < v.M.W / 2 + 0.3; };
  if (v.kind === 'horse') return;
  for (const q of PEDS) { if (q.state === 'dead' || q.state === 'parked' || q.state === 'knocked') continue; if (Math.abs(q.x - v.x) > 5 || Math.abs(q.z - v.z) > 5) continue; if (hit(q.x, q.z)) { const tg = { kind: 'ped', id: q.id }; dealDamage(tg, sp * 4.5, by === 'me' ? ME.id : 'n', { kind: 'car' }); q.x += fx * 2; q.z += fz * 2; if (G.isHost) { q.state = q.hp > 0 ? 'knocked' : 'dead'; q.timer = q.hp > 0 ? 2.5 : 25; } sfx('punch', q.x, q.z); FX.impact({ x: q.x, y: q.y + 1, z: q.z }, 'blood'); v.speed *= 0.85; } }
  if (by !== 'me' && !ME.dead && !ME.vehicle && hit(ME.x, ME.z) && Math.abs(ME.y - v.y) < 2) { ME.takeDamage(sp * 3.5, 'car'); ME.knock(fx * sp * 0.6, fz * sp * 0.6); }
  for (const an of ANIMALS) { if (an.state === 'dead') continue; if (Math.abs(an.x - v.x) > 6 || Math.abs(an.z - v.z) > 6) continue; if (hit(an.x, an.z)) dealDamage({ kind: 'animal', id: an.id }, sp * 4, by === 'me' ? ME.id : 'n', { kind: 'car' }); }
}
// ================= ANIMALS =================
const ANIMALS = [];
function initAnimals() {
  const r = mulberry32(4242); let id = 0;
  const add = (kind, bounds, extra = {}) => { const S = ANIMAL_SPECS[kind]; const x = lerp(bounds.x0, bounds.x1, r()), z = lerp(bounds.z0, bounds.z1, r()); const a = { id: id++, kind, S, x, z, y: groundHeight(x, z), yaw: r() * TAU, spd: 0, hp: S.hp, maxHp: S.hp, state: 'idle', timer: r() * 5, bounds, seed: r(), owner: null, ...extra }; ANIMALS.push(a); return a; };
  for (const zoo of ZOOS) for (const pen of zoo.pens) { const n = pen.kind === 'elephant' || pen.kind === 'giraffe' ? 2 : pen.kind === 'penguin' ? 5 : 3; for (let i = 0; i < n; i++) add(pen.kind, pen, { zoo: true }); }
  for (const f of FARMS) for (const k of f.kinds) if (k !== 'horse') add(k, { x0: f.x0 + 2, x1: f.x1 - 2, z0: f.z0 + 2, z1: f.z1 - 2 }, { farm: true });
  // wild deer in disanbay forests
  for (let i = 0; i < 14; i++) { const cx = lerp(-1450, -760, r()), cz = lerp(-1000, 1000, r()); if (terrainH(cx, cz) < LAND + 1) continue; add('deer', { x0: cx - 60, x1: cx + 60, z0: cz - 60, z1: cz + 60, wild: true }, { wild: true }); }
  // strays in cities / parks
  for (let i = 0; i < 18; i++) {
    const kind = r() < 0.55 ? 'dog' : 'cat'; const b = BLOCKS[Math.floor(r() * BLOCKS.length)]; const e = 3;
    const bounds = { x0: b.x0 + 1, x1: b.x1 - 1, z0: b.z0 - e, z1: b.z0 + 2.5, stray: true }; add(kind, bounds, { stray: true });
  }
  for (let i = 0; i < 6; i++) add(r() < 0.5 ? 'dog' : 'cat', { x0: -150, x1: 150, z0: -150, z1: 150 }, { stray: true });
  for (let i = 0; i < 5; i++) add('chicken', { x0: -1100, x1: -1000, z0: 20, z1: 60 }, { farm: true });
}
function hostUpdateAnimals(dt) {
  const players = playersList();
  for (const a of ANIMALS) {
    a.timer -= dt; a.atkT = (a.atkT || 0) - dt;
    const nd = nearestPlayerDist(a.x, a.z); if (nd > 400 && a.state !== 'follow') { a.spd = 0; continue; }
    if (a.state === 'dead') { if (a.timer <= 0) { a.state = 'idle'; a.hp = a.maxHp; a.x = lerp(a.bounds.x0, a.bounds.x1, Math.random()); a.z = lerp(a.bounds.z0, a.bounds.z1, Math.random()); } continue; }
    const S = a.S; let tx = a.tx, tz = a.tz, sp = 0;
    if (a.state === 'follow') {
      const o = a.owner === ME.id ? ME : G.players.get(a.owner); if (!o) { a.state = 'idle'; a.owner = null; continue; }
      const d = Math.hypot(o.x - a.x, o.z - a.z); if (d > 70) { a.x = o.x - 2; a.z = o.z - 2; }
      if (d > 3) { tx = o.x; tz = o.z; sp = d > 8 ? S.speed : S.speed * 0.45; } else sp = 0;
      if (o.vehicle || o.veh) sp = Math.min(sp, d > 6 ? S.speed * 1.5 : 0);
    } else if (a.state === 'flee') {
      sp = S.speed; const dx = a.x - a.fx, dz = a.z - a.fz; const dd = Math.hypot(dx, dz) || 1; tx = a.x + dx / dd * 5; tz = a.z + dz / dd * 5; if (a.timer <= 0) a.state = 'idle';
    } else if (a.state === 'attack') {
      const tp = targetPos(a.target); if (!tp || a.timer <= 0) { a.state = 'idle'; } else { tx = tp.x; tz = tp.z; const d = Math.hypot(tp.x - a.x, tp.z - a.z); sp = d > 2 ? S.speed : 0; if (d < 2.4 && a.atkT <= 0) { a.atkT = 1.1; dealDamage(a.target, a.kind === 'bear' ? 22 : 18, 'n', { kind: 'melee' }); sfx('roar', a.x, a.z, 0.6); } }
    } else {
      if (a.timer <= 0) { if (a.state === 'walk') { a.state = 'idle'; a.timer = rnd(2, 8); } else { a.state = 'walk'; a.timer = rnd(3, 9); a.tx = lerp(a.bounds.x0, a.bounds.x1, Math.random()); a.tz = lerp(a.bounds.z0, a.bounds.z1, Math.random()); } }
      if (a.state === 'walk') { tx = a.tx; tz = a.tz; sp = S.speed * 0.3; if (Math.hypot(tx - a.x, tz - a.z) < 1) { a.state = 'idle'; a.timer = rnd(2, 6); } }
      // perception
      for (const pl of players) {
        const d = Math.hypot(pl.x - a.x, pl.z - a.z);
        if (S.shy && d < 16 && !pl.inVeh) { a.state = 'flee'; a.timer = 5; a.fx = pl.x; a.fz = pl.z; }
        if (S.predator && d < 7 && pl.x > a.bounds.x0 - 1 && pl.x < a.bounds.x1 + 1 && pl.z > a.bounds.z0 - 1 && pl.z < a.bounds.z1 + 1) { a.state = 'attack'; a.timer = 12; a.target = { kind: pl.me ? 'me' : 'player', id: pl.id }; }
      }
      if (Math.random() < dt * 0.02 && S.sfx) sfx(S.sfx, a.x, a.z, 0.5);
    }
    if (sp > 0 && tx !== undefined) {
      const dx = tx - a.x, dz = tz - a.z; const d = Math.hypot(dx, dz); if (d > 0.3) { a.yaw = dampAng(a.yaw, Math.atan2(dx, dz), 5, dt); a.x += Math.sin(a.yaw) * sp * dt; a.z += Math.cos(a.yaw) * sp * dt; }
    }
    a.spd = sp;
    if (a.state !== 'follow') { const b = a.bounds; const m = a.stray || a.wild ? 0 : 0; if (!a.wild && !a.stray || a.state !== 'flee') { a.x = clamp(a.x, b.x0, b.x1); a.z = clamp(a.z, b.z0, b.z1); } }
    const r = resolveCircle(a.x, a.z, Math.min(0.8, (S.body ? S.body[2] : 0.3) * 0.6), a.y, 1); a.x = r.x; a.z = r.z; a.y = groundHeight(a.x, a.z, a.y + 1);
    if (terrainH(a.x, a.z) < LAND - 1.5 && a.state !== 'follow') { a.x -= Math.sin(a.yaw) * 2; a.z -= Math.cos(a.yaw) * 2; a.yaw += Math.PI; }
  }
}
function animalDamage(a, amt, from, opts = {}) {
  if (!a || a.state === 'dead') return; a.hp -= amt; FX.impact({ x: a.x, y: a.y + 0.6, z: a.z }, 'blood');
  if (a.hp <= 0) { a.state = 'dead'; a.timer = 60; if (a.owner) { notifyPlayer(a.owner, { t: 'petDead' }); a.owner = null; } if (from && !String(from).startsWith('n') && (a.farm || a.wild)) notifyPlayer(from, { t: 'meat', k: a.kind }); return; }
  if (a.S.predator && from && !String(from).startsWith('n')) { a.state = 'attack'; a.timer = 15; a.target = { kind: from === ME.id ? 'me' : 'player', id: from }; }
  else if (a.state !== 'follow') { a.state = 'flee'; a.timer = 6; const tp = from === ME.id ? ME : G.players.get(from); if (tp) { a.fx = tp.x; a.fz = tp.z; } else { a.fx = a.x + 1; a.fz = a.z; } }
}
function renderAnimals(dt, cam) {
  const view = Q().npcView * 1.2;
  for (const a of ANIMALS) {
    const d = Math.hypot(a.x - cam.x, a.z - cam.z);
    if (d > view) { if (a.obj) a.obj.root.visible = false; continue; }
    if (!a.obj) { a.obj = new Animal(a.kind, a.seed); scene.add(a.obj.root); }
    if (!G.isHost && a.tx2 !== undefined) { a.x = damp(a.x, a.tx2, 8, dt); a.z = damp(a.z, a.tz2, 8, dt); a.y = damp(a.y, a.ty2, 8, dt); a.yaw = dampAng(a.yaw, a.tyaw, 8, dt); }
    a.obj.root.visible = true; a.obj.root.position.set(a.x, a.y, a.z); a.obj.root.rotation.y = a.yaw;
    a.obj.update(dt, a.spd, a.state);
  }
}
