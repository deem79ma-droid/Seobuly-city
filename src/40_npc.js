// @v 2026101419

// ================= NPC: PEDESTRIANS, POLICE, GANGS =================
const PEDS = []; const N_PED = 50; const PICKUPS = new Map(); let pickupSeq = 1;
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
  p.mem = null; // 다른 사람이 됐으니 기억도 새로
  p.kind = kind; p.seed = seed; const r = mulberry32(seed);
  const ok = kind === 'gangA' || kind === 'gangB' || kind === 'police' || kind === 'doctor' || kind === 'worker' ? kind : 'civ';
  p.outfit = randomOutfit(r, kind === 'medic' ? 'doctor' : ok);
  if (p.char) p.char.setOutfit(p.outfit);
  p.weapon = kind === 'police' ? 'pistol' : (kind === 'gangA' || kind === 'gangB') ? (r() < 0.65 ? (r() < 0.6 ? 'pistol' : 'smg') : 'bat') : 'fist';
  if (p.char) p.char.setWeapon(p.weapon === 'fist' ? 'fist' : null);
  p.hp = kind === 'police' ? 140 : kind.startsWith('gang') ? 120 : 90; p.state = 'walk'; p.target = null; p.raid = false; p.dance = -1; p.fear = 0; p.personality = r() < 0.33 ? 'calm' : r() < 0.66 ? 'busy' : 'social'; p.homeRegion = pick(['plaza','seoburi','jiolle','kaengjibe','disanbay']); p.phone = false; p.job = null; p.goal = null; p.lx = undefined; p.homeX = p.x; p.homeZ = p.z;
}
function pedEnsureChar(p) {
  if (p.char) return; p.char = new Character(p.outfit || randomOutfit(mulberry32(p.seed || 1))); scene.add(p.char.root); p.char.root.visible = false; p.char.setShadow(false); p.shadowOn = false;
}
function placePedOnEdge(p, e, t, side, dir) {
  const E = EDGES[e]; const a = NODES[E.a], b = NODES[E.b]; p.e = e; p.t = t; p.side = side; p.dir = dir;
  const dx = (b.x - a.x) / E.len, dz = (b.z - a.z) / E.len; const off = E.w / 2 + 2.6;
  p.x = a.x + dx * t + (-dz) * off * side; p.z = a.z + dz * t + dx * off * side; p.y = groundHeight(p.x, p.z); p.fallGroundY = p.y;
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
  const L = []; if (!ME.dead) { const a = anchorOf(ME); const ins = !!INTERIOR.cur; L.push({ id: ME.id, x: a.x, y: a.y, z: a.z, wanted: ins || ME.jail ? 0 : ME.wanted, grudge: ins ? {} : ME.grudge, gang: JOBS.gang(), aimGun: ME.aiming && !WEAPONS[ME.weapon]?.melee, inVeh: !!ME.vehicle, me: true, inside: ins }); }
  for (const [id, rp] of G.players) if (!rp.dead) { const a = anchorOf(rp); const ins = (rp.bi ?? -1) >= 0; L.push({ id, x: a.x, y: a.y, z: a.z, wanted: ins || rp.jail ? 0 : rp.wanted || 0, grudge: ins ? {} : rp.grudge || {}, gang: rp.jb === 'gangA' || rp.jb === 'gangB' ? rp.jb : null, aimGun: !!rp.aim && !WEAPONS[rp.w]?.melee, inVeh: !!rp.veh, inside: ins }); }
  return L;
}
function nearestPlayerDist(x, z) { let d = 1e9; if (typeof ME !== 'undefined') { const a = anchorOf(ME); d = Math.hypot(a.x - x, a.z - z); } for (const rp of G.players.values()) { const a = anchorOf(rp); d = Math.min(d, Math.hypot(a.x - x, a.z - z)); } return d; }
function spawnPedNear(p, px, pz) {
  const r = edgeNearPoint(px, pz, 50, 190, e => !e.bridge); if (!r) return false;
  placePedOnEdge(p, r.e, r.t, Math.random() < 0.5 ? 1 : -1, Math.random() < 0.5 ? 1 : -1);
  const R = regionAt(p.x, p.z); if (R === 'sea') return false;
  // Keep the same citizen, outfit, role and memories when relocating near a player.
  if (!p.identityPlaced) { pedSetIdentity(p, pedKindFor(R), (Math.random() * 1e9) | 0); p.identityPlaced = true; }
  if (p.kind === 'civ' && isNight() && Math.random() < 0.45) { p.state = 'parked'; p.nextTry = G.t + rnd(6, 15); return false; } // 밤에는 거리에 사람이 적다
  if (!p.homeAssigned) { p.homeX = p.x; p.homeZ = p.z; p.homeAssigned = true; } pedStartRoutine(p);
  if (R === 'plaza' && p.kind === 'civ' && Math.random() < 0.3) { p.state = 'club'; p.x = CLUB.x + rnd(-12, 12); p.z = CLUB.z + rnd(-8, 8); p.y = LAND + 0.06; p.dance = Math.floor(Math.random() * 8); }
  p.fallGroundY = p.y; p.spawnT = G.t; return true;
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
  if (p.kind.startsWith('gang')) { if (t.gang === p.kind) return false; if (t.gang) return true; return p.raid || ((t.grudge && t.grudge[p.kind]) || 0) > G.t; } // 갱단원: 같은 갱은 한편, 상대 갱은 적
  return false;
}
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3();
function hostUpdatePeds(dt) {
  const players = playersList();
  const anyP = players.length ? players : [{ x: ME.x, z: ME.z }];
  for (const p of PEDS) {
    // relocation
    if (p.state === 'parked' && p.nextTry > G.t) continue; // 건물에 들어간/밤이라 쉬는 NPC는 잠시 뒤에 다시 등장
    if (p.state !== 'dead') { const nd = nearestPlayerDist(p.x, p.z); if ((p.state === 'parked' || nd > 240) && !(p.raid && G.raid)) { const pl = pick(anyP); if (spawnPedNear(p, pl.x, pl.z)) { } continue; } }
    p.timer -= dt; p.fireT -= dt; p.actT = Math.min(1, p.actT + dt * (p.act === 'punchR' || p.act === 'punchL' ? 3 : 2));
    if (p.state === 'dead') { if (p.timer <= 0) {
      // NPC 신원·직업은 유지하고 담당 활동 지역에서 다시 시작한다.
      p.hp = p.kind === 'police' ? 140 : p.kind.startsWith('gang') ? 120 : 90;
      p.target = null; p.raid = false; p.fear = 0; p.phone = false; p.state = 'walk';
      const rx = Number.isFinite(p.homeX) ? p.homeX : p.x;
      const rz = Number.isFinite(p.homeZ) ? p.homeZ : p.z;
      p.x = rx; p.z = rz; p.y = groundHeight(rx, rz); p.fallGroundY = p.y;
      snapToNearestEdge(p); pedStartRoutine(p);
    } continue; }
    if (p.state === 'knocked') { if (p.timer <= 0) p.state = 'flee', p.timer = 6; continue; }
    // perception every ~0.4s
    if (p.state === 'surrender') { p.spd = 0; p.aiming = false; if (p.timer <= 0) p.state = 'parked'; continue; } // 신고당한 갱단원: 손 들고 연행 대기
    if (p.state === 'collar') { POLICE.copCollar(p, dt); continue; } // 경찰: 갱단원 연행
    if ((p.percT = (p.percT || 0) - dt) <= 0) {
      p.percT = 0.35 + Math.random() * 0.2;
      if (p.kind !== 'civ' && p.kind !== 'medic' && p.kind !== 'worker') {
        let best = null, bd = p.kind === 'police' ? 70 : (p.raid ? 70 : 34);
        for (const pl of players) { const d = Math.hypot(pl.x - p.x, pl.z - p.z); if (d < bd && pedHostileTo(p, pl)) { bd = d; best = { kind: pl.me ? 'me' : 'player', id: pl.id }; } }
        for (const q of PEDS) { if (q === p || q.state === 'dead' || q.state === 'parked') continue; const d = Math.abs(q.x - p.x) + Math.abs(q.z - p.z); if (d < bd && pedHostileTo(p, { isPed: true, ref: q })) { bd = d; best = { kind: 'ped', id: q.id }; } }
        if (best) { p.target = best; p.state = 'fight'; if (p.weapon !== 'fist' && p.char) p.char.setWeapon(p.weapon); }
        else if (p.state === 'fight' && p.dispT > G.t && targetPos(p.target)) { /* 체포 영장 집행 중: 목표 유지 */ }
        else if (p.state === 'fight') { p.target = null; if (p.raid) p.state = 'raid'; else if (p.job === 'hang') { p.state = 'loiter'; p.lx = undefined; } else { p.state = 'walk'; snapToNearestEdge(p); } }
      }
    }
    if (p.state === 'walk') { if (p.job === 'hang') p.state = 'loiter'; else if (!pedRoutineTick(p, dt)) pedWalk(p, dt); }
    else if (p.state === 'idle') { p.spd = 0; if (p.phone) { p.act = 'drink'; p.actT = 0.5; } if (p.timer <= 0) { p.state = 'walk'; p.phone = false; if (p.job === 'clerk') p.job = 'walk'; } }
    else if (p.state === 'goto') pedGoto(p, dt);
    else if (p.state === 'sit') { p.spd = 0; if (p.timer <= 0) { p.state = 'walk'; snapToNearestEdge(p); } }
    else if (p.state === 'loiter') { pedLoiter(p, dt); }
    else if (p.state === 'flee') { pedFlee(p, dt); }
    else if (p.state === 'fight') { pedFight(p, dt); }
    else if (p.state === 'raid') { pedRaidMove(p, dt); }
    else if (p.state === 'club') { p.spd = 0; p.yaw += dt * 0.2; if (Math.random() < dt * 0.02) p.dance = Math.floor(Math.random() * 8); }
    else if (p.state === 'dance') { p.spd = 0; if (p.timer <= 0) { p.state = 'walk'; p.dance = -1; } }
    else if (p.state === 'talk') { p.spd = 0; if (p.timer <= 0) p.state = 'walk'; }
    // Terrain drop damage for NPCs. NPC movement normally snaps to the terrain,
    // so compare the previous grounded height against the new grounded height.
    // Ignore respawn/teleport states and small slopes; host alone applies damage.
    if (p.state !== 'dead' && p.state !== 'parked' && p.state !== 'club') {
      const h = groundHeight(p.x, p.z, p.y + 1);
      const mv = Number.isFinite(p.fallX) ? Math.hypot(p.x - p.fallX, p.z - p.fallZ) : 99; p.fallX = p.x; p.fallZ = p.z;
      // 순간이동(재배치·출동·가게 문 앞 이동·연행)이나 가파른 비탈은 낙하가 아니다 → 진짜 절벽에서 떨어질 때만 (예전엔 멀쩡히 걷던 NPC가 갑자기 낙하 피해로 죽었다)
      if (Number.isFinite(p.fallGroundY) && mv < 2.5) {
        const drop = p.fallGroundY - h;
        if (drop > 3.5 && drop < 120 && drop > mv * 3) {
          const damage = Math.min(180, Math.round((drop - 3.5) * 11));
          if (damage > 0) pedDamage(p, damage, null, { kind: 'fall' });
        }
      }
      p.fallGroundY = h;
    } else p.fallGroundY = p.y;
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
  const E = EDGES[p.e]; const a = NODES[E.a], b = NODES[E.b]; const sp = pedJobSpeed(p);
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
  if (Math.random() < dt * 0.01 && p.char) p.char.say(pick((p.job && JOB_LINES[p.job]) || PED_LINES[p.kind] || PED_LINES.civ), 4);
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
  if (tg.kind === 'player') { const rp = G.players.get(tg.id); return rp && !rp.dead && !((rp.bi ?? -1) >= 0) && !rp.jail ? { x: rp.x, y: rp.y, z: rp.z, veh: rp.veh } : null; }
  if (tg.kind === 'ped') { const q = PEDS[tg.id]; return q && q.state !== 'dead' && q.state !== 'parked' ? { x: q.x, y: q.y, z: q.z } : null; }
  return null;
}
function pedFight(p, dt) {
  const tp = targetPos(p.target); if (!tp) { p.state = p.raid ? 'raid' : 'walk'; p.target = null; if (!p.raid) snapToNearestEdge(p); return; }
  if (p.hitAt && G.t >= p.hitAt) { p.hitAt = 0; if (Math.hypot(tp.x - p.x, tp.z - p.z) < 2.2) { dealDamage(p.target, p.weapon === 'bat' ? 18 : 3, 'n' + p.id, { kind: 'melee', w: p.weapon === 'bat' ? 'bat' : 'fist' }); sfx('punch', p.x, p.z); } }
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
      if (hit) dealDamage(p.target, shotDamage(p.weapon, false), 'n' + p.id, { kind: 'gun', w: p.weapon, head: false });
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
    // 법: 시민·노동자·의료진을 때리면 목격자가 무조건 신고(처음 때릴 때 ★1 + 폭행 기록), 죽이면 ★ 하나 더 · 경찰은 때릴 때마다 ★1, 죽이면 ★3
    const policeNear = PEDS.some(q => q.kind === 'police' && q.state !== 'dead' && q.state !== 'parked' && Math.hypot(q.x - p.x, q.z - p.z) < 45);
    if (p._asK !== p.seed) { p._asK = p.seed; p._as = {}; } const first = !p._as[from]; p._as[from] = 1;
    if (p.kind === 'police') notifyPlayer(from, { t: 'wanted', add: p.hp <= 0 ? 3 : 1, c: first ? 'assault' : undefined });
    else if (p.kind === 'civ' || p.kind === 'worker' || p.kind === 'medic') { const add = (first ? 1 : 0) + (p.hp <= 0 ? 1 : 0); if (add) notifyPlayer(from, { t: 'wanted', add, c: first && p.hp > 0 ? 'assault' : undefined }); }
    else if (policeNear) notifyPlayer(from, { t: 'wanted', add: 1 });
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
    const amtCash = p.kind.startsWith('gang') ? Math.floor(rnd(30, 200)) : p.kind === 'police' ? Math.floor(rnd(20, 70)) : Math.floor(rnd(5, 80));
    spawnPickup(p.x + rnd(-0.5, 0.5), p.z + rnd(-0.5, 0.5), amtCash);
    if (fromPlayer) notifyPlayer(from, { t: 'kill', k: p.kind });
    if (fromPlayer) NPCMEM.witness(p.x, p.z, from, p.kind === 'gangA' || p.kind === 'gangB' ? 3 : 8, p);
  }
  // nearby civilians panic
  if (opts.kind === 'gun' || p.hp <= 0) panicAround(p.x, p.z, 30);
}
function panicAround(x, z, r) {
  for (const q of PEDS) if ((q.kind === 'civ' || q.kind === 'worker' || q.kind === 'medic') && (q.state === 'walk' || q.state === 'idle' || q.state === 'talk' || q.state === 'club' || q.state === 'sit' || q.state === 'goto') && Math.abs(q.x - x) < r && Math.abs(q.z - z) < r) { q.state = 'flee'; q.timer = rnd(6, 12); q.fx = x; q.fz = z; q.dance = -1; }
  for (const an of ANIMALS) if (!an.S.predator && an.state !== 'dead' && an.state !== 'follow' && Math.abs(an.x - x) < r && Math.abs(an.z - z) < r) { an.state = 'flee'; an.timer = 6; an.fx = x; an.fz = z; }
}
function spawnPickup(x, z, amount, id, loot) {
  id = id || 'k' + (pickupSeq++) + '_' + (typeof ME !== 'undefined' ? String(ME.id).slice(-5) : ''); const y = (loot ? Math.max(groundHeight(x, z), 0) : groundHeight(x, z)) + 0.4; // 가방은 물에 뜬다
  const m = new THREE.Group();
  if (loot) { // 💼 죽은 사람이 떨군 가방
    const bm = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.8, emissive: 0x2a1408, emissiveIntensity: 0.6 });
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.28), bm); m.add(bag);
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.06, 0.3), new THREE.MeshStandardMaterial({ color: 0x3a2412, roughness: 0.8 })); flap.position.y = 0.2; m.add(flap);
    const hd = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 6, 12, Math.PI), bm); hd.position.y = 0.22; m.add(hd);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 24), new THREE.MeshBasicMaterial({ color: 0xffd34a, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = -0.36; m.add(ring);
  } else { const bill = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.18), new THREE.MeshStandardMaterial({ color: 0x3aa04a, emissive: 0x1a6a2a, emissiveIntensity: 0.8 })); m.add(bill);
    const b2 = bill.clone(); b2.position.y = 0.07; b2.rotation.y = 0.4; m.add(b2); }
  m.position.set(x, y, z); scene.add(m);
  PICKUPS.set(id, { id, x, y, z, amount, mesh: m, loot: loot || null, t: G.t });
  if (G.isHost && G.online) NET.send({ t: 'pickAdd', id, x, z, a: amount, l: loot || undefined });
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
const PED_ANIM_STATES = ['walk', 'idle', 'flee', 'fight', 'dead', 'knocked', 'club', 'dance', 'talk', 'parked', 'goto', 'sit', 'loiter', 'surrender', 'collar'];
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
    const wantDet = d < (G.quality >= 2 ? 22 : 12); if (wantDet !== c.detail) c.setDetail(wantDet); // 먼 NPC는 얼굴·옷 디테일 생략
    const st = p.state === 'dead' ? 'dead' : p.state === 'knocked' ? 'knocked' : p.state === 'sit' ? 'sit' : 'normal';
    if (p.state === 'sit') c.root.position.y = p.y + 0.5 - 0.95;
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
      let wantedP = null; for (const pl of players) if (pl.wanted >= 1 && Math.hypot(pl.x - v.x, pl.z - v.z) < 160) wantedP = pl; // ★1부터 순찰차가 쫓아온다
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
  // 내가 운전한 차에 다른 플레이어가 치임 (같은 공간·1초에 한 번) → 피해는 맞은 쪽이 적용, 사고 기록은 신고 수사에 쓰인다
  if (by === 'me') for (const [id, rp] of G.players) { if (rp.dead || rp.veh || !sameSpace(rp) || Math.abs(rp.y - v.y) > 2 || !hit(rp.x, rp.z)) continue; if (G.t < (rp._carHitT || 0)) continue; rp._carHitT = G.t + 1; dealDamage({ kind: 'player', id }, sp * 3.5, ME.id, { kind: 'car', w: 'car' }); FX.impact({ x: rp.x, y: rp.y + 1, z: rp.z }, 'blood'); sfx('punch', rp.x, rp.z); v.speed *= 0.85; }
  for (const an of ANIMALS) { if (an.state === 'dead') continue; if (Math.abs(an.x - v.x) > 6 || Math.abs(an.z - v.z) > 6) continue; if (hit(an.x, an.z)) dealDamage({ kind: 'animal', id: an.id }, sp * 4, by === 'me' ? ME.id : 'n', { kind: 'car' }); }
}
// ================= ANIMALS =================
const ANIMALS = [];
function initAnimals() {
  const r = mulberry32(4242); let id = 0;
  const add = (kind, bounds, extra = {}) => { const S = ANIMAL_SPECS[kind]; const x = lerp(bounds.x0, bounds.x1, r()), z = lerp(bounds.z0, bounds.z1, r()); const a = { id: id++, kind, S, x, z, y: groundHeight(x, z), yaw: r() * TAU, spd: 0, hp: S.hp, maxHp: S.hp, state: 'idle', timer: r() * 5, bounds, seed: r(), owner: null, ...extra }; ANIMALS.push(a); return a; };
  for (const zoo of ZOOS) for (const pen of zoo.pens) for (const k of pen.kind.split('+')) { const n = k === 'elephant' || k === 'giraffe' || k === 'hippo' || k === 'rhino' ? 2 : k === 'penguin' ? 5 : k === 'panda' || k === 'polarbear' ? 1 : 2; for (let i = 0; i < n; i++) add(k, pen, { zoo: true }); }
  for (const f of FARMS) for (const k of f.kinds) if (k !== 'horse') add(k, { x0: f.x0 + 2, x1: f.x1 - 2, z0: f.z0 + 2, z1: f.z1 - 2 }, { farm: true });
  // wild deer in disanbay forests
  for (let i = 0; i < 14; i++) { const cx = lerp(-1450, -760, r()), cz = lerp(-1000, 1000, r()); if (terrainH(cx, cz) < LAND + 1) continue; add('deer', { x0: cx - 60, x1: cx + 60, z0: cz - 60, z1: cz + 60, wild: true }, { wild: true, amb: 'wild' }); }
  // strays in cities / parks
  for (let i = 0; i < 18; i++) {
    const kind = r() < 0.55 ? 'dog' : 'cat'; const b = BLOCKS[Math.floor(r() * BLOCKS.length)]; const e = 3;
    const bounds = { x0: b.x0 + 1, x1: b.x1 - 1, z0: b.z0 - e, z1: b.z0 + 2.5, stray: true }; add(kind, bounds, { stray: true, amb: 'city' });
  }
  for (let i = 0; i < 6; i++) add(r() < 0.5 ? 'dog' : 'cat', { x0: -150, x1: 150, z0: -150, z1: 150 }, { stray: true, amb: 'city' });
  for (let i = 0; i < 5; i++) add('chicken', { x0: -1100, x1: -1000, z0: 20, z1: 60 }, { farm: true });
  // ---- 디산베이 야생: 늑대 무리 · 멧돼지 · 곰 (사냥 가능, 잘못하면 잡아먹힌다) ----
  const w = mulberry32(7171); const spot = (xa, xb) => { for (let k = 0; k < 30; k++) { const x = lerp(xa, xb, w()), z = lerp(-980, 980, w()); if (terrainH(x, z) > LAND + 1 && roadDistAt(x, z) > 25 && coastDist(x, z) > 60 && Math.hypot(x + 1100, z) > 110) return [x, z]; } return [lerp(xa, xb, 0.5), -600]; };
  const B = (x, z, r) => ({ x0: x - r, x1: x + r, z0: z - r, z1: z + r, wild: true });
  for (let p = 0; p < 6; p++) { const [x, z] = spot(-1520, -780); const n = 3 + (p % 2); for (let i = 0; i < n; i++) add('wolf', B(x, z, 70), { wild: true, pack: p }); }
  for (let i = 0; i < 12; i++) { const [x, z] = spot(-1520, -760); add('boar', B(x, z, 60), { wild: true }); }
  for (let i = 0; i < 3; i++) { const [x, z] = spot(-1560, -1300); add('bear', B(x, z, 80), { wild: true }); }
  // ---- 순한 동물들: 숲 · 호수 · 농장 · 광장 · 공원 · 시모느 바닷가 ----
  const v = mulberry32(9393);
  for (const [k, n, r] of [['fox', 6, 60], ['rabbit', 12, 40], ['squirrel', 10, 30], ['raccoon', 5, 40], ['badger', 4, 40], ['moose', 4, 90], ['pheasant', 7, 40], ['crow', 6, 50]]) for (let i = 0; i < n; i++) { const [x, z] = spot(-1500, -770); add(k, B(x, z, r), { wild: true, amb: 'wild' }); }
  for (const [k, n] of [['duck', 7], ['goose', 4], ['flamingo', 6], ['otter', 3]]) for (let i = 0; i < n; i++) { const a = v() * TAU, rr = LAKE.r + 6 + v() * 14; const x = LAKE.x + Math.cos(a) * rr, z = LAKE.z + Math.sin(a) * rr; add(k, { x0: x - 10, x1: x + 10, z0: z - 10, z1: z + 10 }); }
  const F0 = FARMS[0]; if (F0) for (const [k, n] of [['goat', 4], ['duck', 3], ['goose', 3]]) for (let i = 0; i < n; i++) add(k, { x0: F0.x0 + 2, x1: F0.x1 - 2, z0: F0.z0 + 2, z1: F0.z1 - 2 }, { farm: true });
  for (let i = 0; i < 12; i++) add('pigeon', { x0: -40, x1: 40, z0: -40, z1: 40 });
  for (let i = 0; i < 8; i++) { const b = BLOCKS[Math.floor(v() * BLOCKS.length)]; add(v() < 0.5 ? 'crow' : 'squirrel', { x0: b.x0 + 1, x1: b.x1 - 1, z0: b.z0 - 3, z1: b.z0 + 2.5 }); }
  for (const [k, n] of [['seagull', 10], ['crab', 10], ['turtle', 6]]) for (let i = 0; i < n; i++) { for (let t = 0; t < 20; t++) { const a = v() * TAU; const x = 2000 + Math.cos(a) * 395, z = 560 + Math.sin(a) * 485; if (terrainH(x, z) > LAND - 1.2 && terrainH(x, z) < LAND + 3) { add(k, { x0: x - 12, x1: x + 12, z0: z - 12, z1: z + 12 }); break; } } }
  for (let i = 0; i < 4; i++) add('peacock', { x0: 1960, x1: 2040, z0: 520, z1: 600 });
  // ---- 사람이 다니는 곳에도 동물이 보이게 (예전엔 숲 깊은 곳·동물원에 몰려 있어 길에서는 거의 안 보였다) ----
  const u = mulberry32(5151);
  for (let i = 0; i < 26; i++) { const b = BLOCKS[Math.floor(u() * BLOCKS.length)]; add(u() < 0.55 ? 'dog' : 'cat', { x0: b.x0 + 1, x1: b.x1 - 1, z0: b.z0 - 3, z1: b.z0 + 2.5, stray: true }, { stray: true, amb: 'city' }); } // 도시 길고양이·떠돌이 개
  for (let i = 0; i < 8; i++) add('pigeon', { x0: -60, x1: 60, z0: -60, z1: 60 });
  for (let f = 0; f < 6; f++) { const b = BLOCKS[Math.floor(u() * BLOCKS.length)]; const cx = lerp(b.x0 + 8, b.x1 - 8, u()); for (let i = 0; i < 6; i++) add('pigeon', { x0: cx - 8, x1: cx + 8, z0: b.z0 - 3, z1: b.z0 + 2 }); } // 도시 인도 비둘기 떼
  // 디산베이 길가 (도로에서 6~45m — 차를 타고 지나가도 보인다): 사슴 무리 · 토끼 · 여우 · 꿩 · 다람쥐
  const nearRoad = (dmin, dmax) => { for (let k = 0; k < 80; k++) { const x = lerp(-1500, -760, u()), z = lerp(-980, 980, u()); const rd = roadDistAt(x, z); if (rd > dmin && rd < dmax && terrainH(x, z) > LAND + 1 && coastDist(x, z) > 40) return [x, z]; } return null; };
  for (let h = 0; h < 9; h++) { const sp = nearRoad(10, 45); if (!sp) continue; for (let i = 0; i < 2 + (h % 3); i++) add('deer', B(sp[0], sp[1], 25), { wild: true, amb: 'wild' }); }
  for (const [k, n, r] of [['rabbit', 12, 15], ['fox', 5, 25], ['pheasant', 8, 15], ['squirrel', 6, 12]]) for (let i = 0; i < n; i++) { const sp = nearRoad(6, 35); if (sp) add(k, B(sp[0], sp[1], r), { wild: true, amb: 'wild' }); }
  for (let i = 0; i < 4; i++) add('deer', B(HUNT.x + 70, HUNT.z + 30, 30), { wild: true }); // 사냥꾼 오두막 앞 들판
  for (let i = 0; i < 4; i++) add('rabbit', B(HUNT.x + 30, HUNT.z - 40, 20), { wild: true });
  // ---- ⛰️ 산 4곳 (운령산·송림산·망성산·천해산): 사슴·산양·토끼·여우·다람쥐·꿩·까마귀 + 멧돼지 (예전엔 산 위에 동물이 하나도 없었다) ----
  const mt = mulberry32(8484);
  const mspot = M => { for (let k = 0; k < 40; k++) { const a = mt() * TAU, rr = Math.sqrt(mt()) * M.r * 0.85; const x = M.x + Math.cos(a) * rr, z = M.z + Math.sin(a) * rr; if (terrainH(x, z) > LAND + 2 && coastDist(x, z) > 20 && roadDistAt(x, z) > 6) return [x, z]; } return null; };
  for (const M of MOUNTAINS) {
    for (const [k, n, rr] of [['deer', 6, 40], ['goat', 5, 30], ['rabbit', 6, 20], ['fox', 3, 40], ['squirrel', 5, 20], ['pheasant', 4, 25], ['crow', 3, 40]]) for (let i = 0; i < n; i++) { const sp = mspot(M); if (sp) add(k, B(sp[0], sp[1], rr), { wild: true, amb: 'mtn' }); }
    for (let i = 0; i < 2; i++) { const sp = mspot(M); if (sp) add('boar', B(sp[0], sp[1], 50), { wild: true }); }
  }
}
// 야생 동물 공격 성향: r 감지 거리(밤에 rn) · dmg 한 번 피해 · kill 즉사 확률 · cool 공격 간격
const WILD = { wolf: { r: 18, rn: 32, dmg: 13, kill: 0, cool: 0.9, eat: true }, boar: { r: 9, rn: 11, dmg: 30, kill: 0.18, cool: 1.7 }, bear: { r: 13, rn: 16, dmg: 28, kill: 0.15, cool: 1.3 } };
const WILD_DEATH = { wolf: '늑대 무리에게 잡아먹혔다', boar: '멧돼지 엄니에 받혀 즉사했다', bear: '곰에게 찢겨 죽었다' };
function wildAggro(a, pl) {
  a.state = 'attack'; a.timer = 14; a.target = { kind: pl.me ? 'me' : 'player', id: pl.id };
  if (a.kind === 'wolf') for (const o of ANIMALS) if (o !== a && o.pack === a.pack && o.kind === 'wolf' && o.state !== 'dead' && o.state !== 'attack' && Math.hypot(o.x - a.x, o.z - a.z) < 50) { o.state = 'attack'; o.timer = 14; o.target = a.target; }
  if (Math.random() < 0.5) sfx(a.kind === 'wolf' ? 'bark' : 'roar', a.x, a.z, a.kind === 'boar' ? 0.5 : 0.8);
}
// ---- 주변 동물: 모든 플레이어에게서 멀어진 길동물(개·고양이)과 디산베이 초식동물(사슴·토끼·여우…)은
//      플레이어 근처의 자기 서식지로 옮겨 온다 (NPC처럼) → 도시를 걸어도, 디산베이 길을 달려도 늘 근처에 동물이 있다.
//      늑대·멧돼지·곰은 자기 영역에 그대로 있다. 한 사람 근처에 너무 몰리지 않게 상한(도시 8 · 디산베이 10).
const AMB_CAP = { city: 8, wild: 10, mtn: 10 }, AMB_R = { city: 170, wild: 220, mtn: 220 }; let _ambT = 0;
function ambientSpot(kind, pl) {
  for (let k = 0; k < 12; k++) {
    const ang = Math.random() * TAU, r = kind === 'city' ? rnd(35, 120) : rnd(60, 180); const x = pl.x + Math.sin(ang) * r, z = pl.z + Math.cos(ang) * r;
    if (kind === 'city') {
      insideAnyBlock(0, 0); const L = _blockGrid.get(Math.floor(x / 100) * 1000 + Math.floor(z / 100)); if (!L || !L.length) continue;
      const b = L[Math.floor(Math.random() * L.length)]; if (regionAt((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2) === 'sea') continue;
      // 고른 지점에서 가장 가까운 블록 변의 인도 (그 근처 ±12m 안에서만 돌아다닌다)
      const dN = Math.abs(z - b.z0), dS = Math.abs(z - b.z1), dW = Math.abs(x - b.x0), dE = Math.abs(x - b.x1), m = Math.min(dN, dS, dW, dE);
      const st = m === dN ? { x0: b.x0 + 1, x1: b.x1 - 1, z0: b.z0 + 0.5, z1: b.z0 + 3.5 } : m === dS ? { x0: b.x0 + 1, x1: b.x1 - 1, z0: b.z1 - 3.5, z1: b.z1 - 0.5 } : m === dW ? { x0: b.x0 + 0.5, x1: b.x0 + 3.5, z0: b.z0 + 1, z1: b.z1 - 1 } : { x0: b.x1 - 3.5, x1: b.x1 - 0.5, z0: b.z0 + 1, z1: b.z1 - 1 };
      const px = clamp(x, st.x0, st.x1), pz = clamp(z, st.z0, st.z1); const dd = Math.hypot(px - pl.x, pz - pl.z); if (dd < 25 || dd > 140) continue;
      return { x: px, z: pz, b: { x0: Math.max(st.x0, px - 12), x1: Math.min(st.x1, px + 12), z0: Math.max(st.z0, pz - 12), z1: Math.min(st.z1, pz + 12), stray: true } };
    }
    if (kind === 'mtn') { // 산에 있는 사람 근처 산비탈로
      const M = mountainAt(pl.x, pl.z); if (!M || Math.hypot(x - M.x, z - M.z) > M.r * 0.95 || terrainH(x, z) < LAND + 2 || coastDist(x, z) < 20 || roadDistAt(x, z) < 5) continue;
      return { x, z, b: { x0: x - 30, x1: x + 30, z0: z - 30, z1: z + 30, wild: true } };
    }
    if (regionAt(x, z) !== 'disanbay' || terrainH(x, z) < LAND + 1 || coastDist(x, z) < 30 || roadDistAt(x, z) < 5) continue;
    return { x, z, b: { x0: x - 30, x1: x + 30, z0: z - 30, z1: z + 30, wild: true } };
  }
  return null;
}
function ambientAnimals() {
  const pls = playersList().filter(p => !p.inside); if (!pls.length) return;
  const near = pls.map(pl => { const c = { city: 0, wild: 0, mtn: 0 }; for (const a of ANIMALS) if (a.amb && a.state !== 'dead' && Math.abs(a.x - pl.x) < AMB_R[a.amb] && Math.abs(a.z - pl.z) < AMB_R[a.amb]) c[a.amb]++; return c; });
  let moved = 0;
  for (const a of ANIMALS) {
    if (!a.amb || a.owner || a.state === 'follow' || a.state === 'attack' || nearestPlayerDist(a.x, a.z) < 300) continue;
    const i = Math.floor(Math.random() * pls.length); if (near[i][a.amb] >= AMB_CAP[a.amb]) continue;
    const sp = ambientSpot(a.amb, pls[i]); if (!sp) continue;
    a.x = sp.x; a.z = sp.z; a.y = groundHeight(a.x, a.z); a.bounds = sp.b; a.state = 'idle'; a.timer = rnd(1, 6); a.hp = a.maxHp; a.tx = a.x; a.tz = a.z; near[i][a.amb]++;
    if (++moved >= 3) break; // 1초에 최대 3마리씩
  }
}
function hostUpdateAnimals(dt) {
  if ((_ambT -= dt) <= 0) { _ambT = 1; ambientAnimals(); }
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
      const tp = targetPos(a.target); const WD = a.wild && WILD[a.kind]; const bcx = (a.bounds.x0 + a.bounds.x1) / 2, bcz = (a.bounds.z0 + a.bounds.z1) / 2;
      if (!tp || a.timer <= 0 || (WD && (Math.hypot(a.x - bcx, a.z - bcz) > 170 || a.hp < a.maxHp * 0.3 || tp.veh))) { a.state = WD && a.hp < a.maxHp * 0.3 ? 'flee' : 'walk'; a.timer = 6; a.tx = bcx; a.tz = bcz; if (tp) { a.fx = tp.x; a.fz = tp.z; } }
      else { tx = tp.x; tz = tp.z; const d = Math.hypot(tp.x - a.x, tp.z - a.z); sp = d > 1.5 ? Math.min(S.speed * (WD && a.kind === 'boar' && d > 5 ? 1.35 : 1), 1.5 + d * 2.2) : 0; a.timer = Math.max(a.timer, d < 25 ? 6 : 0);
        if (d < (a.kind === 'boar' ? 3 : 2.7) && a.atkT <= 0) {
          if (WD) { a.atkT = WD.cool; const inst = Math.random() < WD.kill; const hp = a.target.kind === 'me' ? ME.hp : (G.players.get(a.target.id) || {}).hp; const eat = WD.eat && hp !== undefined && hp < 30;
            dealDamage(a.target, inst || eat ? 999 : WD.dmg, 'n', { kind: 'melee', w: a.kind }); sfx(a.kind === 'wolf' ? 'bark' : 'roar', a.x, a.z, 0.7);
            if (a.kind === 'boar') { a.atkT += 0.8; a.yaw += Math.PI * 0.8; a.chargeT = G.t + 0.7; } }
          else { a.atkT = 1.1; dealDamage(a.target, a.kind === 'bear' ? 22 : 18, 'n', { kind: 'melee' }); sfx('roar', a.x, a.z, 0.6); } } }
    } else {
      if (a.timer <= 0) { if (a.state === 'walk') { a.state = 'idle'; a.timer = rnd(2, 8); } else { a.state = 'walk'; a.timer = rnd(3, 9); a.tx = lerp(a.bounds.x0, a.bounds.x1, Math.random()); a.tz = lerp(a.bounds.z0, a.bounds.z1, Math.random()); } }
      if (a.state === 'walk') { tx = a.tx; tz = a.tz; sp = S.speed * 0.3; if (Math.hypot(tx - a.x, tz - a.z) < 1) { a.state = 'idle'; a.timer = rnd(2, 6); } }
      // perception
      for (const pl of players) {
        const d = Math.hypot(pl.x - a.x, pl.z - a.z);
        if (S.shy && d < 16 && !pl.inVeh) { a.state = 'flee'; a.timer = 5; a.fx = pl.x; a.fz = pl.z; }
        const WD = a.wild && WILD[a.kind]; if (WD && !pl.inVeh && d < (ENV.night > 0.5 ? WD.rn : WD.r) && a.hp > a.maxHp * 0.3) { wildAggro(a, pl); break; }
        if (S.predator && !a.wild && d < 7 && pl.x > a.bounds.x0 - 1 && pl.x < a.bounds.x1 + 1 && pl.z > a.bounds.z0 - 1 && pl.z < a.bounds.z1 + 1) { a.state = 'attack'; a.timer = 12; a.target = { kind: pl.me ? 'me' : 'player', id: pl.id }; }
      }
      if (Math.random() < dt * 0.02 && S.sfx) sfx(S.sfx, a.x, a.z, 0.5);
    }
    const px0 = a.x, pz0 = a.z;
    if (sp > 0 && tx !== undefined) {
      const dx = tx - a.x, dz = tz - a.z; const d = Math.hypot(dx, dz); if (d > 0.3) { if (!(a.chargeT > G.t)) a.yaw = dampAng(a.yaw, Math.atan2(dx, dz), a.state === 'attack' ? (d < 12 ? 30 : 10) : 5, dt); a.x += Math.sin(a.yaw) * sp * dt; a.z += Math.cos(a.yaw) * sp * dt; }
    }
    a.spd = sp;
    if (a.state !== 'follow') { const b = a.bounds; const m = a.stray || a.wild ? 0 : 0; if ((!a.wild && !a.stray || a.state !== 'flee') && !(a.wild && a.state === 'attack')) { a.x = clamp(a.x, b.x0, b.x1); a.z = clamp(a.z, b.z0, b.z1); } }
    const r = resolveCircle(a.x, a.z, Math.min(0.8, (S.body ? S.body[2] : 0.3) * 0.6), a.y, 1); a.x = r.x; a.z = r.z; a.y = groundHeight(a.x, a.z, a.y + 1);
    if (a.wild && terrainH(a.x, a.z) < LAND - 1.2) { a.x = px0; a.z = pz0; if (a.state !== 'attack') { a.tx = (a.bounds.x0 + a.bounds.x1) / 2; a.tz = (a.bounds.z0 + a.bounds.z1) / 2; } } // 야생 동물은 물에 들어가지 않는다 (예전엔 물가에서 빙빙 돌다 바다로 떠내려갔다)
    else if (terrainH(a.x, a.z) < LAND - 1.5 && a.state !== 'follow') { a.x -= Math.sin(a.yaw) * 2; a.z -= Math.cos(a.yaw) * 2; a.yaw += Math.PI; }
  }
}
function animalDamage(a, amt, from, opts = {}) {
  if (!a || a.state === 'dead') return; a.hp -= amt; FX.impact({ x: a.x, y: a.y + 0.6, z: a.z }, 'blood');
  if (a.hp <= 0) { a.state = 'dead'; a.timer = 60; LAWX.hostAnimalKilled(a, from); if (a.owner) { notifyPlayer(a.owner, { t: 'petDead' }); a.owner = null; } if (from && !String(from).startsWith('n') && (a.farm || a.wild)) notifyPlayer(from, { t: 'meat', k: a.kind }); return; }
  if ((a.S.predator || (a.wild && WILD[a.kind])) && from && !String(from).startsWith('n') && a.hp > a.maxHp * 0.3) { a.state = 'attack'; a.timer = 15; a.target = { kind: from === ME.id ? 'me' : 'player', id: from }; }
  else if (a.state !== 'follow') { a.state = 'flee'; a.timer = 6; const tp = from === ME.id ? ME : G.players.get(from); if (tp) { a.fx = tp.x; a.fz = tp.z; } else { a.fx = a.x + 1; a.fz = a.z; } }
}
function renderAnimals(dt, cam) {
  // 표시 거리: 작은 동물 170m 이상 · 큰 동물(사슴·소·곰·늑대…) 260m 이상 (예전엔 108~216m라 조금만 멀어도 사라졌다)
  const nv = Q().npcView, vSmall = Math.max(nv * 1.5, 170), vBig = Math.max(nv * 2.2, 260);
  for (const a of ANIMALS) {
    if (a._big === undefined) { const S = a.S; a._big = S.biped ? (S.h || 0) >= 1.2 : (S.body[0] >= 0.9 || S.leg + S.body[1] >= 0.9); }
    const d = Math.hypot(a.x - cam.x, a.z - cam.z);
    if (d > (a._big ? vBig : vSmall)) { if (a.obj) a.obj.root.visible = false; continue; }
    if (!a.obj) { a.obj = new Animal(a.kind, a.seed); scene.add(a.obj.root); }
    if (!G.isHost && a.tx2 !== undefined) { a.x = damp(a.x, a.tx2, 8, dt); a.z = damp(a.z, a.tz2, 8, dt); a.y = damp(a.y, a.ty2, 8, dt); a.yaw = dampAng(a.yaw, a.tyaw, 8, dt); }
    a.obj.root.visible = true; a.obj.root.position.set(a.x, a.y, a.z); a.obj.root.rotation.y = a.yaw;
    a.obj.update(dt, a.spd, a.state);
  }
}
