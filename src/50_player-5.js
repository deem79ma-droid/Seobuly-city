// @v 2026101323

// ================= PLAYER =================
const ME = {
  id: 'me', name: '플레이어', x: 0, y: LAND, z: 0, yaw: 0, vx: 0, vz: 0, vy: 0, grounded: true, hp: 100, armor: 0, stamina: 100, money: 50000,
  wanted: 0, wantedCool: 0, weapon: 'fist', weapons: { fist: 1 }, ammo: {}, mag: {}, inv: { wood: 0, meat: 0, food: 2, medkit: 1, drink: 0, ticket: 0 },
  skills: { shoot: 0, fight: 0, drive: 0, fit: 0, swim: 0, study: 0 }, garage: [], outfit: null, vehicle: null, seat: null, dead: false, deadT: 0, spawn: null,
  char: null, grudge: {}, drunk: 0, dance: -1, action: null, actionT: 1, aiming: false, swim: false, knockT: 0, sitBench: null, reloadT: 0, fireT: 0, punchSide: 0,
  combatT: 0, kills: 0, homePlot: null, petId: null, spd: 0, stepT: 0,
  takeDamage(amt, from, w) {
    if (this.dead || this.god || G.godT > G.t) return; amt = Math.max(0, amt);
    if (adminGod()) { this.hp = 100; if (amt > 0 && G.t > (this._godFx || 0)) { this._godFx = G.t + 0.6; FX.emoji('🛡️', this.x, this.y + 2.1, this.z, 0.35); } return; } // 관리자: 체력 무한
    if (this.armor > 0) { const a = Math.min(this.armor, amt * 0.65); this.armor -= a; amt -= a; }
    this.lastW = w; this.hp -= amt; this.combatT = G.t + 4; UI.damageFlash(Math.min(1, amt / 30));
    if (this.char) { this.action = 'hit'; this.actionT = 0; }
    if (amt > 2) CAM.shake = Math.min(0.6, CAM.shake + amt / 60);
    const rec = () => { if (typeof POLICE !== 'undefined') POLICE.onHurt(from, amt, w); }; // 신고용 피해 기록
    if (this.hp <= 0 && this.wanted > 0 && !this.jail && PEDS.some(q => q.kind === 'police' && q.state !== 'dead' && q.state !== 'parked' && Math.hypot(q.x - this.x, q.z - this.z) < 35)) { this.hp = 25; rec(); LAW.arrest(); return; }
    if (this.hp <= 0) this.die(from);
    rec();
  },
  knock(vx, vz) { this.vx += vx; this.vz += vz; this.vy = 4; this.grounded = false; this.knockT = 1.6; if (this.vehicle) exitVehicle(true); },
  die(from) {
    if (this.dead || adminGod()) { if (adminGod()) this.hp = 100; return; } this.dead = true; this.deadT = 0; this.hp = 0; if (this.vehicle) exitVehicle(true); this.dance = -1; this.sitBench = null;
    CINE_EV.death(); $('#death').classList.remove('hidden'); $('#deathSub').textContent = (WILD_DEATH[this.lastW] ? WILD_DEATH[this.lastW] + ' · ' : '') + '병원으로 이송 중…'; NET.send({ t: 'chat', m: '💀 ' + this.name + ' 사망', sys: 1 });
    const lost = loseAllOnDeath(); const dl = $('#deathLoss'); // 사망하면 현금·무기·탄약·아이템·산 옷을 전부 잃는다
    if (dl) { dl.innerHTML = ''; if (lost && lost.length) { const h = document.createElement('b'); h.textContent = '잃어버린 것'; dl.appendChild(h); for (const s of lost) { const d = document.createElement('div'); d.textContent = s; dl.appendChild(d); } } else { const d = document.createElement('div'); d.textContent = '잃은 소지품 없음'; dl.appendChild(d); } }
    if (lost && lost.length) { UI.chatLine('', '💀 사망 — 소지품을 모두 잃었다: ' + lost.join(' · ')); NET.send({ t: 'chat', m: '💀 ' + this.name + ' — 소지품을 모두 잃었다', sys: 1 }); }
  },
  respawn() {
    if (typeof INTERIOR !== 'undefined') { INTERIOR.dispose(); INTERIOR.clearRoof(); } this.fallTop = null;
    this.dead = false; this.hp = 100; this.armor = 0; const fee = Math.min(5000, Math.floor(this.money * 0.1)); this.money -= fee; this.wanted = 0;
    let sp = null;
    if (this.homePlot != null && PLOTS[this.homePlot] && PLOTS[this.homePlot].state === 'done' && PLOTS[this.homePlot].owner === this.id) { const p = PLOTS[this.homePlot]; sp = { x: p.x + SIDE_VEC[p.side][0] * (p.w / 2 + 2), z: p.z + SIDE_VEC[p.side][1] * (p.d / 2 + 2) }; }
    if (!sp) { let best = null, bd = 1e9; for (const f of FACILITIES) if (f.type === 'hospital') { const d = Math.hypot(f.x - this.x, f.z - this.z); if (d < bd) { bd = d; best = f; } } sp = best ? { x: best.x, z: best.z } : { x: 30, z: 30 }; }
    this.x = sp.x; this.z = sp.z; this.y = groundHeight(this.x, this.z) + 0.1; this.vx = this.vz = this.vy = 0;
    $('#death').classList.add('hidden'); CINE_EV.respawn(); toast(fee > 0 ? `🏥 병원비 ${fmtMoney(fee)} 지불` : '🏥 병원에서 깨어났다 — 빈털터리다…'); G.godT = G.t + 3;
    if (this.warrant) { this.wanted = 2; toast('🚨 체포 영장은 아직 유효하다 — 경찰이 찾고 있다', 3000); }
  },
};
const CAM = { yaw: 0, pitch: 0.12, dist: 4.4, fp: false, shake: 0, lookT: 0, fov: 62, sh: 0.45 };
const KEYS = {}; const INP = { mx: 0, mz: 0, run: false, fire: false, aim: false, touchRun: false, joyMag: 0 };
let pointerLocked = false;
// 한글 입력 상태(ㅈㄴㅁㅇ… 또는 IME 'Process')에서도 WASD·단축키가 동작하도록, 글자키는 물리 키(e.code)로 맞춘다
function keyOf(e) { const k = (e.key || '').toLowerCase(); if (/^Key[A-Z]$/.test(e.code) && !/^[a-z]$/.test(k)) return e.code.slice(3).toLowerCase(); return k; }
function initInput() {
  const cv = renderer.domElement;
  addEventListener('keydown', e => {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') { if (e.key === 'Enter' && document.activeElement.id === 'chatIn') { if (e.isComposing || e.keyCode === 229) { const ci = document.activeElement; if (!ci._imeWait) { ci._imeWait = true; ci.addEventListener('compositionend', () => setTimeout(() => { ci._imeWait = false; if (!ci.classList.contains('hidden')) UI.sendChat(); }, 0), { once: true }); } } else UI.sendChat(); } if (e.key === 'Escape') { document.activeElement.blur(); UI.closeChat(); } return; }
    if (!G.started) return; const k = keyOf(e); KEYS[k] = true; KEYS[e.code] = true;
    if (k === 'tab' || k === 'f1' || k === 'f2') e.preventDefault();
    if (k === 'f1') { if (UI.menuOpen) UI.closeMenu(); else UI.openHelp(); return; }
    if (k === 'f2' || k === '`') { if (UI.menuOpen) UI.closeMenu(); else ADMIN.open(); return; }
    if (UI.menuOpen) { if (k === 'escape' || k === 'e' || k === 'tab') UI.closeMenu(); return; }
    if (SHARE.isOpen()) { if (k === 'escape' || k === 'e' || k === 'tab' || k === 'p') { e.preventDefault(); SHARE.hide(); } return; }
    if (k === 't' || k === 'enter') { e.preventDefault(); if (k === 'enter' && performance.now() - (UI._chatSentT || 0) < 250) return; UI.openChat(); return; } // 한글 조합 중 Enter로 보낸 직후 따라오는 Enter에 채팅창이 다시 열리지 않게
    if (e.repeat) return;
    if (k === 'e') doInteract(); if (k === 'f') toggleVehicle(); if (k === 'r') startReload();
    if (k === 'g') UI.openDance(); if (k === 'm') UI.openMap(); if (k === 'v') CAM.fp = !CAM.fp; if (k === 'p' || k === 'escape' || k === 'tab') UI.openPhone();
    if (k === 'h' && ME.vehicle) { sfx('horn', ME.x, ME.z); NET.send({ t: 'horn' }); }
    if (k === 'l' && ME.vehicle && ME.vehicle.M.police) ME.vehicle.siren = !ME.vehicle.siren;
    if (k === 'u') COMFORT.unstick(true);
    if (k === 'j') POLICE.open();
    if (k === 'q') cycleWeapon(-1); if (k === 'x') ME.dance = -1; if (k === 'b') GRENADE.throw();
    const dm = /^Digit([1-8])$/.exec(e.code); if (dm) selectWeapon(WEAPON_ORDER[+dm[1] - 1]);
    if (k === ' ') e.preventDefault();
  });
  addEventListener('keyup', e => { KEYS[keyOf(e)] = false; KEYS[e.key.toLowerCase()] = false; KEYS[e.code] = false; });
  addEventListener('blur', () => { for (const k in KEYS) KEYS[k] = false; INP.fire = false; INP.aim = false; });
  cv.addEventListener('mousedown', e => {
    if (!G.started || IS_TOUCH) return; AU.init();
    if (!pointerLocked) { cv.requestPointerLock && cv.requestPointerLock(); return; }
    if (e.button === 0) INP.fire = true; if (e.button === 2) INP.aim = true;
  });
  addEventListener('mouseup', e => { if (e.button === 0) INP.fire = false; if (e.button === 2) INP.aim = false; });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('pointerlockchange', () => { pointerLocked = document.pointerLockElement === cv; });
  addEventListener('mousemove', e => { if (!pointerLocked || UI.menuOpen) return; const s = (INP.aim ? 0.0011 : 0.0022) * (G.sens || 1); CAM.yaw -= e.movementX * s; CAM.pitch = clamp(CAM.pitch + e.movementY * s, -1.25, 1.3); CAM.lookT = G.t; });
  addEventListener('wheel', e => { if (!G.started) return; if (ME.vehicle) return; cycleWeapon(e.deltaY > 0 ? 1 : -1); });
}
function winOpen() { return !!(UI.menuOpen || UI.mapOpen || SHARE.isOpen() || CINE.locked()); }
function readMoveInput() {
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return { x: 0, z: 0 };
  if (winOpen()) { INP.mx = INP.mz = 0; INP.joyMag = 0; if (UI.joyReset) UI.joyReset(); return { x: 0, z: 0 }; }
  let x = 0, z = 0;
  if (KEYS['w'] || KEYS['arrowup']) z += 1; if (KEYS['s'] || KEYS['arrowdown']) z -= 1; if (KEYS['a'] || KEYS['arrowleft']) x -= 1; if (KEYS['d'] || KEYS['arrowright']) x += 1;
  if (INP.joyMag > 0.05) { x = INP.mx; z = INP.mz; }
  return { x, z };
}
// ----- weapons -----
function selectWeapon(w) {
  if (!ME.weapons[w]) { return; } if (ME.weapon === w) return; ME.weapon = w; ME.reloadT = 0; ME.char.setWeapon(w); UI.updateWeapon(); sfx('ui');
}
function cycleWeapon(d) { const own = WEAPON_ORDER.filter(w => ME.weapons[w]); const i = own.indexOf(ME.weapon); selectWeapon(own[(i + d + own.length) % own.length]); }
function startReload() { const w = ME.weapon, W = WEAPONS[w]; if (W.melee || ME.reloadT > 0) return; const need = W.mag - (ME.mag[w] || 0); if (need <= 0 || !(ME.ammo[w] > 0)) return; ME.reloadT = 1.5; sfx('ui'); }
function finishReload() { const w = ME.weapon, W = WEAPONS[w]; const need = W.mag - (ME.mag[w] || 0); const take = Math.min(need, ME.ammo[w] || 0); ME.mag[w] = (ME.mag[w] || 0) + take; ME.ammo[w] -= take; UI.updateWeapon(); }
// ----- raycast against everything -----
function raySphere(o, d, cx, cy, cz, r) { const ox = o.x - cx, oy = o.y - cy, oz = o.z - cz; const b = ox * d.x + oy * d.y + oz * d.z; const c = ox * ox + oy * oy + oz * oz - r * r; const D = b * b - c; if (D < 0) return null; const t = -b - Math.sqrt(D); return t >= 0 ? t : null; }
function raycastWorld(o, d, maxD, opt = {}) {
  let best = { t: maxD, kind: 'none' };
  const test = (t, kind, ref, head) => { if (t !== null && t < best.t && t >= 0) best = { t, kind, ref, head }; };
  const near = (x, z) => { const px = x - o.x, pz = z - o.z; const along = px * d.x + pz * d.z; if (along < -3 || along > maxD + 3) return false; const lat = Math.abs(px * d.z - pz * d.x); return lat < 4; };
  for (const p of PEDS) { if (p.state === 'dead' || p.state === 'parked' || !near(p.x, p.z)) continue; test(raySphere(o, d, p.x, p.y + 1.63, p.z, 0.16), 'ped', p, true); test(raySphere(o, d, p.x, p.y + 1.18, p.z, 0.32), 'ped', p); test(raySphere(o, d, p.x, p.y + 0.55, p.z, 0.3), 'ped', p); }
  for (const a of ANIMALS) { if (a.state === 'dead' || !near(a.x, a.z)) continue; const S = a.S; const r = S.biped ? S.h * 0.4 : Math.max(S.body[1], S.body[2]) * 0.6; test(raySphere(o, d, a.x, a.y + (S.biped ? S.h * 0.5 : S.leg + S.body[1] * 0.4), a.z, r), 'animal', a); if (!S.biped) { const fx = Math.sin(a.yaw) * S.body[0] * 0.35, fz = Math.cos(a.yaw) * S.body[0] * 0.35; test(raySphere(o, d, a.x + fx, a.y + S.leg + S.body[1] * 0.4, a.z + fz, r), 'animal', a); test(raySphere(o, d, a.x - fx, a.y + S.leg + S.body[1] * 0.4, a.z - fz, r), 'animal', a); } }
  for (const [id, rp] of G.players) { if (id === ME.id || rp.dead || rp.veh || !sameSpace(rp) || !near(rp.x, rp.z)) continue; test(raySphere(o, d, rp.x, rp.y + 1.63, rp.z, 0.16), 'player', rp, true); test(raySphere(o, d, rp.x, rp.y + 1.18, rp.z, 0.32), 'player', rp); test(raySphere(o, d, rp.x, rp.y + 0.55, rp.z, 0.3), 'player', rp); }
  if (opt.self) { test(raySphere(o, d, ME.x, ME.y + 1.2, ME.z, 0.35), 'me', ME); }
  for (const v of vehicles.values()) { if (v === opt.ignoreVeh || !v.mesh.visible || !near(v.x, v.z)) continue; for (const [cx, cz] of v.circles()) test(raySphere(o, d, cx, v.y + (v.kind === 'car' ? 0.8 : 0.9), cz, v.radius + 0.2), 'veh', v); }
  const rc = rayColliders(o.x, o.y, o.z, d.x, d.y, d.z, best.t); if (rc.c && rc.t < best.t) best = { t: rc.t, kind: rc.c.type === 'tree' ? 'tree' : 'world', ref: rc.c };
  const tt = rayTerrain(o.x, o.y, o.z, d.x, d.y, d.z, Math.min(best.t, 400)); if (tt !== null && tt < best.t) best = { t: tt, kind: 'terrain' };
  if (o.y + d.y * best.t < -0.2 && d.y < 0) { const tw = (-0.2 - o.y) / d.y; if (tw < best.t) best = { t: tw, kind: 'water' }; }
  best.p = new THREE.Vector3(o.x + d.x * best.t, o.y + d.y * best.t, o.z + d.z * best.t); return best;
}
// ----- damage routing -----
function dealDamage(tg, amt, from, opts = {}) {
  if (!tg) return;
  if (tg.kind === 'me') {
    if (from === ME.id) return; const hb = ME.hp; ME.takeDamage(amt, from, opts.w);
    if (G.isHost && /^n\d+$/.test(String(from))) POLICE.hostSelfHit(String(from), opts.w, opts.kind, hb - Math.max(0, ME.hp)); // 방장 화면의 NPC가 방장을 때림 → 사건 기록
    return;
  }
  // PvP: 피해는 오직 맞은 사람에게만 — 공격자 자신(같은 id)은 절대 피해를 받지 않는다. 맞은 쪽이 hitAck로 결과를 돌려준다.
  if (tg.kind === 'player') {
    if (!tg.id || tg.id === ME.id || tg.id === from) return;
    const rp = G.players.get(tg.id); if (rp) { rp.act = 'hit'; rp.actT = 0; }
    const w = opts.w || (opts.kind === 'car' ? 'car' : opts.kind === 'boom' ? 'boom' : from === ME.id ? ME.weapon : '');
    sendDmg({ t: 'dmg', to: tg.id, amt: Math.round(amt * 10) / 10, from, k: opts.kind, w }); return;
  }
  if (tg.kind === 'ped') { if (G.isHost) pedDamage(PEDS[tg.id], amt, from, opts); else { NET.send({ t: 'pdmg', id: tg.id, amt, from, k: opts.kind }); const p = PEDS[tg.id]; if (p) { p.act = 'hit'; p.actT = 0; } } return; }
  if (tg.kind === 'animal') { if (G.isHost) animalDamage(ANIMALS[tg.id], amt, from, opts); else NET.send({ t: 'admg', id: tg.id, amt, from }); return; }
  if (tg.kind === 'veh') { const v = vehicles.get(tg.id); if (v) v.damage(amt, from); }
}
// 플레이어 피해 메시지 전송 (방장은 보내는 순간 사건 기록 → 신고 수사의 근거)
function sendDmg(msg) { NET.send(msg); if (G.isHost && typeof POLICE !== 'undefined') POLICE.hostSee(msg, ME.id); }
function notifyPlayer(id, msg) { if (id === ME.id) handlePersonal(msg); else { msg.to = id; NET.send(msg); } }
function handlePersonal(m) {
  if (m.t === 'wanted') addWanted(m.add);
  if (m.t === 'grudge') { ME.grudge[m.g] = G.t + 90; if (!ME._gT || G.t - ME._gT > 10) { toast(m.g === 'gangA' ? '🔴 레드 크루가 너를 노린다!' : '🔵 블루 독스가 너를 노린다!'); ME._gT = G.t; } }
  if (m.t === 'kill') { ME.kills++; JOBS.onKill(m.k); }
  if (m.t === 'robRes') onRobResult(m);
  if (m.t === 'pedTip') toast(m.s, 3500);
  if (m.t === 'meat') { JOBS.onHunt(m.k); }
  if (m.t === 'petDead') { ME.petId = null; toast('🐾 반려동물이 죽었다…'); }
  if (m.t === 'adopted') { ME.petId = m.a; toast('🐶 입양 완료! 이제 따라다닌다'); }
  if (m.t === 'plotFail') { ME.money += m.amt; toast('❌ ' + m.msg + ' (환불)'); }
  if (m.t === 'income') { ME.money += m.amt; sfx('cash'); toast(`💰 수익 ${fmtMoney(m.amt)} 수령`); }
}
function damageArea(x, y, z, r, dmg, by) {
  if (!G.isHost && by !== ME.id) { if (!ME.dead && Math.hypot(ME.x - x, ME.z - z) < r) { const k = 1 - Math.hypot(ME.x - x, ME.z - z) / r; ME.takeDamage(dmg * k, 'boom'); ME.knock((ME.x - x) * k * 2, (ME.z - z) * k * 2); } return; }
  const from = by || 'n';
  if (!ME.dead) { const d = Math.hypot(ME.x - x, ME.z - z); if (d < r) { const k = 1 - d / r; ME.takeDamage(dmg * k, from); if (!ME.vehicle) ME.knock((ME.x - x) / (d || 1) * k * 8, (ME.z - z) / (d || 1) * k * 8); } }
  if (G.isHost) {
    for (const p of PEDS) { if (p.state === 'dead' || p.state === 'parked') continue; const d = Math.hypot(p.x - x, p.z - z); if (d < r) pedDamage(p, dmg * (1 - d / r), from, { kind: 'gun' }); }
    for (const a of ANIMALS) { const d = Math.hypot(a.x - x, a.z - z); if (d < r) animalDamage(a, dmg * (1 - d / r), from); }
    for (const [id, rp] of G.players) { if (id === ME.id || from === id || !sameSpace(rp)) continue; const d = Math.hypot(rp.x - x, rp.z - z); if (d < r) sendDmg({ t: 'dmg', to: id, amt: dmg * (1 - d / r), from, k: 'boom', w: 'boom' }); }
  }
  for (const v of vehicles.values()) { const d = Math.hypot(v.x - x, v.z - z); if (d < r && d > 0.5 && v.ctrl === 'local') v.damage(dmg * 6 * (1 - d / r), by); }
}
function addWanted(n) {
  const before = ME.wanted; ME.wanted = clamp(ME.wanted + n, 0, 5); ME.wantedCool = 0; if (ME.wanted > before) { UI.updateStars(true); if (ME.wanted >= 5 && before < 5) CINE_EV.wanted5(); if (ME.wanted >= 3 && before < 3) toast('🚨 경찰이 발포를 허가했다!'); }
}
// ----- combat -----
const _o = new THREE.Vector3(), _d = new THREE.Vector3(), _m = new THREE.Vector3();
function tryAttack() {
  if (ME.jail) return;
  if (ME.dead || ME.fireT > 0 || ME.swim || UI.menuOpen) return;
  const W = WEAPONS[ME.weapon]; ME.dance = -1; ME.sitBench = null; ME.combatT = G.t + 5;
  if (ME.vehicle && (W.melee || ME.seat === 'd' && !INP.aim)) return;
  if (W.melee) {
    ME.fireT = W.rate;
    if (ME.weapon === 'fist') { // 콤보: 0.9초 안에 이어 치면 잽 → 크로스 → 훅 → 어퍼컷
      ME.combo = (G.t - (ME.comboT || -9) < 0.9) ? ((ME.combo || 0) + 1) % COMBO.length : 0; ME.comboT = G.t;
      ME.action = COMBO[ME.combo]; const mv = ME.action;
      if (mv === 'upper') ME.fireT = W.rate * 1.6; else if (mv === 'hook') ME.fireT = W.rate * 1.2;
      ME.meleeAt = G.t + 0.4 / actSpeed(mv); // 팔이 다 뻗는 순간에 판정
      const fx = Math.sin(CAM.yaw), fz = Math.cos(CAM.yaw); const lunge = mv === 'upper' ? 2.2 : mv === 'cross' ? 2.6 : 1.8; if (!ME.vehicle) { ME.vx += fx * lunge; ME.vz += fz * lunge; } // 앞으로 내딛기
      sfx('whoosh', ME.x, ME.z, mv === 'upper' ? 1 : 0.8);
    } else { ME.action = ME.weapon === 'axe' ? 'axe' : 'bat'; sfx('axe', ME.x, ME.z, 0.4); ME.meleeAt = G.t + (ME.weapon === 'axe' ? 0.33 : 0.26); }
    ME.actionT = 0;
    NET.send({ t: 'act', a: ME.action });
    return;
  }
  if (ME.reloadT > 0) return;
  const w = ME.weapon; if ((ME.mag[w] || 0) <= 0) { if ((ME.ammo[w] || 0) > 0) startReload(); else { toast('탄약이 없다 — 총포사에서 구매'); sfx('error'); ME.fireT = 0.4; } return; }
  ME.mag[w]--; ME.fireT = W.rate; ME.action = 'shoot'; ME.actionT = 0;
  camera.getWorldDirection(_d); _o.copy(camera.position); if (G.opt.assist && !ME.vehicle) COMFORT.assist(_d, _o);
  const tgt = ME.vehicle || ME; const along = (tgt.x - _o.x) * _d.x + (tgt.y + 1.4 - _o.y) * _d.y + (tgt.z - _o.z) * _d.z; _o.addScaledVector(_d, Math.max(0, along - 0.2));
  ME.char.muzzleWorld(_m);
  const pel = W.pellets || 1; const skill = 1 - ME.skills.shoot * 0.08; let anyHit = false;
  for (let i = 0; i < pel; i++) {
    const sp = (W.spread * (INP.aim ? 0.6 : 1.4) * skill) + (ME.spd > 3 ? 0.02 : 0);
    const dd = _d.clone(); dd.x += rnd(-sp, sp); dd.y += rnd(-sp, sp); dd.z += rnd(-sp, sp); dd.normalize();
    const h = raycastWorld(_o, dd, W.range, { ignoreVeh: ME.vehicle });
    let imp = h.kind === 'water' ? 'water' : h.kind === 'tree' ? 'wood' : h.kind === 'veh' ? 'spark' : h.kind === 'world' ? 'spark' : 'dust';
    const dmg = W.dmg * (h.head ? 2.6 : 1) * (1 + ME.skills.shoot * 0.05);
    if (h.kind === 'ped') { dealDamage({ kind: 'ped', id: h.ref.id }, dmg, ME.id, { kind: 'gun' }); imp = 'blood'; anyHit = true; }
    else if (h.kind === 'animal') { dealDamage({ kind: 'animal', id: h.ref.id }, dmg, ME.id, { kind: 'gun' }); imp = 'blood'; anyHit = true; }
    else if (h.kind === 'player') { dealDamage({ kind: 'player', id: h.ref.id }, dmg, ME.id, { kind: 'gun' }); imp = 'blood'; anyHit = true; }
    else if (h.kind === 'veh') { h.ref.damage(dmg * 2.2, ME.id); anyHit = true; if (h.ref.driver && h.ref.driver !== ME.id && G.players.has(h.ref.driver) && Math.random() < 0.3) dealDamage({ kind: 'player', id: h.ref.driver }, dmg * 0.5, ME.id); if (h.ref.ai && !h.ref.dead) { const p = PEDS.find(q => q.state === 'parked'); } }
    FX.tracer(_m, h.p); FX.impact(h.p, imp);
    if (i === 0) NET.send({ t: 'shot', a: [_m.x, _m.y, _m.z], b: [h.p.x, h.p.y, h.p.z], w: W.sfx, i: imp });
  }
  if (anyHit) UI.hitMarker();
  FX.muzzle(_m, _d); sfx(W.sfx, ME.x, ME.z, 0.9);
  CAM.pitch -= (W.scope ? 0.03 : w === 'shotgun' ? 0.05 : 0.012) * (INP.aim ? 0.6 : 1); CAM.shake = Math.min(0.4, CAM.shake + (w === 'shotgun' || w === 'sniper' ? 0.25 : 0.06));
  // public gunfire -> police
  if (G.isHost) panicAround(ME.x, ME.z, 35); else NET.send({ t: 'panic', x: ME.x, z: ME.z });
  if (PEDS.some(q => q.kind === 'police' && q.state !== 'dead' && q.state !== 'parked' && Math.hypot(q.x - ME.x, q.z - ME.z) < 40) && ME.wanted < 1) addWanted(1);
  UI.updateWeapon();
}
function meleeResolve() {
  if (ME.dead) return; const W = WEAPONS[ME.weapon]; const fx = Math.sin(ME.yaw), fz = Math.cos(ME.yaw); const R = W.range;
  const mv = ME.weapon === 'fist' ? ME.action : null; const heavy = mv === 'upper' || mv === 'hook';
  const dmg = W.dmg * (1 + ME.skills.fight * 0.12) * (ME.drunk > 0.3 ? 0.8 : 1) * ({ jab: 0.85, cross: 1.1, hook: 1.25, upper: 1.6 }[mv] || 1);
  let best = null, bd = R + 0.01;
  const consider = (x, z, kind, id, ref) => { const dx = x - ME.x, dz = z - ME.z; const d = Math.hypot(dx, dz); if (d > R + 0.4) return; const f = (dx * fx + dz * fz) / (d || 1); if (f < 0.45 && d > 0.8) return; if (d < bd) { bd = d; best = { kind, id, ref, x, z }; } };
  for (const p of PEDS) if (p.state !== 'dead' && p.state !== 'parked') consider(p.x, p.z, 'ped', p.id, p);
  for (const a of ANIMALS) if (a.state !== 'dead') consider(a.x, a.z, 'animal', a.id, a);
  for (const [id, rp] of G.players) if (id !== ME.id && !rp.dead && !rp.veh && sameSpace(rp) && Math.abs(rp.y - ME.y) < 2) consider(rp.x, rp.z, 'player', id, rp);
  for (const v of vehicles.values()) if (v.mesh.visible) for (const [cx, cz] of v.circles()) consider(cx, cz, 'veh', v.id, v);
  if (best) {
    if (best.kind === 'veh') { best.ref.damage(dmg * 1.5, ME.id); sfx('hit', best.x, best.z); FX.impact({ x: best.x, y: ME.y + 1, z: best.z }, 'spark'); }
    else {
      dealDamage({ kind: best.kind, id: best.id }, dmg, ME.id, { kind: 'melee' });
      const hy = ME.y + (mv === 'upper' ? 1.55 : 1.35), ix = lerp(ME.x, best.x, 0.75), iz = lerp(ME.z, best.z, 0.75);
      sfx(ME.weapon === 'fist' ? (heavy ? 'punchH' : 'punch') : 'chop', best.x, best.z); FX.impact({ x: ix, y: hy, z: iz }, ME.weapon === 'fist' ? 'dust' : 'blood');
      if (ME.weapon === 'fist') { FX.impact({ x: ix, y: hy, z: iz }, 'spark'); FX.emoji(heavy ? '💥' : '✦', ix, hy + 0.15, iz, heavy ? 0.45 : 0.3); CAM.shake = Math.min(0.6, CAM.shake + (heavy ? 0.28 : 0.13)); ME.vx *= 0.3; ME.vz *= 0.3; G.hitStop = G.t + (heavy ? 0.07 : 0.035); NET.send({ t: 'punchFx', x: +ix.toFixed(2), y: +hy.toFixed(2), z: +iz.toFixed(2), h: heavy ? 1 : 0 }); }
      UI.hitMarker();
    }
    return;
  }
  if (W.chop || ME.weapon === 'fist') {
    const list = collidersNear(ME.x + fx * 1.2, ME.z + fz * 1.2, 2.5);
    for (const c of list) { if ((c.type !== 'tree' && c.type !== 'rock') || !c.circle) continue; const d = Math.hypot(c.x - ME.x, c.z - ME.z); if (d < R + c.r + 0.3) { chopTree(c.ref, W.chop ? 1 : 0.25); return; } }
  }
}
const FALLING = [];
function chopTree(t, power) {
  if (!t || !t.alive) return;
  if (t.type === 'rock') { sfx('hit', t.x, t.z); FX.impact({ x: t.x, y: t.y + 1, z: t.z }, 'spark'); return; }
  t.hp -= power; sfx('chop', t.x, t.z); FX.impact({ x: t.x, y: t.y + 1.2, z: t.z }, 'wood'); CAM.shake = 0.15;
  if (t.hp <= 0) { fellTree(t, ME.yaw); const n = t.type === 'pine' || t.type === 'oak' ? 4 : 2; ME.inv.wood += n; toast(`🪵 목재 +${n} (총 ${ME.inv.wood})`); JOBS.onTree(n); NET.send({ t: 'tree', i: t.idx, y: ME.yaw }); UI.updateInv(); }
}
function fellTree(t, dir) {
  if (!t.alive) return; setTreeVisible(t, false); sfx('tree', t.x, t.z); t.cutAt = G.t;
  const G0 = TREE_GEO[t.type]; const g = new THREE.Group(); g.position.set(t.x, t.y, t.z);
  const inner = new THREE.Group(); g.add(inner); inner.scale.setScalar(t.s);
  const lc = new THREE.Color(G0.leafCol[0]); inner.add(new THREE.Mesh(G0.leaf, new THREE.MeshStandardMaterial({ color: lc, roughness: 0.85, transparent: true })));
  if (G0.trunk) inner.add(new THREE.Mesh(G0.trunk, new THREE.MeshStandardMaterial({ color: G0.trunkCol, roughness: 0.9, transparent: true })));
  g.rotation.y = dir; scene.add(g); g.traverse(m => m.castShadow = true);
  FALLING.push({ g, inner, t: 0 });
  // stump
}
function updateFalling(dt) {
  for (let i = FALLING.length - 1; i >= 0; i--) {
    const f = FALLING[i]; f.t += dt; const k = Math.min(1, f.t / 1.6); f.inner.rotation.x = (k * k) * Math.PI / 2 * 0.97;
    if (f.t > 1.6 && f.t < 1.7) { const p = f.g.position; FX.impact({ x: p.x + Math.sin(f.g.rotation.y) * 4, y: p.y + 0.5, z: p.z + Math.cos(f.g.rotation.y) * 4 }, 'dust'); }
    if (f.t > 4) { const a = 1 - (f.t - 4); f.inner.children.forEach(m => m.material.opacity = a); f.g.position.y -= dt * 0.5; }
    if (f.t > 5) { scene.remove(f.g); FALLING.splice(i, 1); }
  }
}
// ----- vehicles -----
function nearestVehicle(r = 3.4) {
  let best = null, bd = r; for (const v of vehicles.values()) { if (!v.mesh.visible || v.dead) continue; for (const [cx, cz] of v.circles()) { const d = Math.hypot(cx - ME.x, cz - ME.z) - v.radius; if (d < bd) { bd = d; best = v; } } } return best;
}
function toggleVehicle() {
  if (ME.dead) return; if (ME.vehicle) { exitVehicle(); return; }
  const v = nearestVehicle(); if (v) enterVehicle(v);
}
function enterVehicle(v) {
  if (v.taxiCab) { if (v.taxiOwner === ME.id) TAXI.board(); else toast('🚕 다른 손님이 부른 택시다'); return; }
  if (v.locked) { toast('🚗 판매용 전시 차량 — 판매점에서 구매하세요'); return; }
  if (v.driver && v.driver !== ME.id) {
    if (G.players.has(v.driver)) { const st = freeSeat(v); if (!st) { toast(`빈 자리가 없다 (${seatCount(v)}인승)`); return; } seatSet(v, st, ME.id); ME.vehicle = v; ME.seat = st; NET.send({ t: 'seat', v: v.id, s: st }); toast(`${st === 'p' ? '조수석' : '뒷좌석'}에 탔다 (${seatCount(v)}인승 · F 하차 · 우클릭 조준 사격)`); return; }
  }
  if (v.ai) {
    const cop = v.model === 'police'; if (G.isHost) ejectNpcDriver(v); else NET.send({ t: 'jack', v: v.id });
    v.ai = null; if (v.npcDriver) v.npcDriver.root.visible = false;
    if (cop) addWanted(2); else if (PEDS.some(q => q.kind === 'police' && q.state !== 'dead' && q.state !== 'parked' && Math.hypot(q.x - ME.x, q.z - ME.z) < 40)) addWanted(1);
    toast(cop ? '🚓 경찰차 탈취!' : '🔑 차량 탈취!'); JOBS.crime('car');
  } else if (v.owner && v.owner !== ME.id && !v.driver) { toast('🔑 남의 차를 훔쳤다!'); JOBS.crime('car'); } // 다른 사람 소유 차
  v.driver = ME.id; v.ctrl = 'local'; ME.vehicle = v; ME.seat = 'd'; ME.dance = -1; ME.sitBench = null; NET.send({ t: 'seat', v: v.id, s: 'd' }); sfx('door');
  if (!ME._drvTip || G.t - ME._drvTip > 300) { ME._drvTip = G.t; toast(v.kind === 'heli' ? '헬기: W/S 앞뒤 · A/D 회전 · Space 상승 · Shift 하강 · F 내리기 (공중에서 내리면 떨어진다)' : v.kind === 'horse' ? '말: W 달리기 · Shift 전력질주 · Space 점프' : 'W 가속 · S 브레이크/후진 · Space 브레이크 · Shift 드리프트 · H 경적 · F 하차', 5000); }
  if (v.kind === 'horse') sfx('neigh', v.x, v.z);
}
function ejectNpcDriver(v) {
  const p = PEDS.find(q => q.state === 'parked') || PEDS.reduce((a, b) => nearestPlayerDist(a.x, a.z) > nearestPlayerDist(b.x, b.z) ? a : b);
  pedSetIdentity(p, v.model === 'police' ? 'police' : 'civ', (Math.random() * 1e9) | 0);
  p.x = v.x + Math.cos(v.yaw) * 1.8; p.z = v.z - Math.sin(v.yaw) * 1.8; p.y = groundHeight(p.x, p.z); p.state = 'flee'; p.timer = 8; p.fx = v.x; p.fz = v.z;
  if (p.char) p.char.say(v.model === 'police' ? '거기 서!' : '내 차!!', 3);
  if (v.model === 'police') { p.state = 'fight'; p.target = null; }
  v.ai = null; if (v.npcDriver) v.npcDriver.root.visible = false;
}
function exitVehicle(force) {
  const v = ME.vehicle; if (!v) return;
  const myCab = v.taxiCab && v.taxiOwner === ME.id && !TAXI._exiting;
  if (myCab && !force) { TAXI.stopHere(); return; } // 택시: 기사님이 세워준 뒤 내린다
  const exitSpd = Math.abs(v.speed); const air = v.kind === 'heli' && v.y - (v.groundY ?? v.y) > 1.5;
  const side = ME.seat === 'p' || ME.seat === 'b2' ? -1 : 1; const off = v.kind === 'car' ? v.M.W / 2 + 0.7 : v.kind === 'heli' ? 2 : 0.9;
  ME.x = v.x + Math.cos(v.yaw) * off * side; ME.z = v.z - Math.sin(v.yaw) * off * side; ME.y = air ? v.y + 0.3 : groundHeight(ME.x, ME.z, v.y + 1) + 0.05; ME.yaw = v.yaw; ME.vx = ME.vz = 0; ME.vy = 0;
  if (air) { ME.grounded = false; ME.fallTop = ME.y; }
  const r = resolveCircle(ME.x, ME.z, 0.35, ME.y, 1.8); ME.x = r.x; ME.z = r.z;
  if (ME.seat === 'd') { v.driver = null; v.brake = true; } else seatClear(v, ME.id);
  NET.send({ t: 'seat', v: v.id, s: null }); ME.vehicle = null; ME.seat = null; ENG.set(false, 0); sfx('door');
  // 빠르게 달리다 내리면 다친다
  if (!force && !air && exitSpd > 7 && v.kind !== 'horse') { const dmg = Math.round((exitSpd - 5) * 3.6); ME.takeDamage(dmg, 'crash', 'fall'); ME.knock(Math.sin(v.yaw) * exitSpd * 0.45, Math.cos(v.yaw) * exitSpd * 0.45); CAM.shake = Math.min(0.7, CAM.shake + 0.4); sfx('hit'); toast(`달리는 차에서 뛰어내렸다! -${dmg} (${Math.round(exitSpd * 3.6)}km/h)`, 3000); }
  if (v.siren && !v.ai) v.siren = false;
  if (myCab) TAXI.onExit(true);
}
// ----- interaction -----
let curInteract = null;
function findInteract() {
  if (ME.jail) return LAW.interact();
  if (ME.sleep && SLEEP.on) return SLEEP.interact();
  if (ME.dead) return null;
  if (ME.vehicle && ME.vehicle.taxiCab) return { label: TAXI.phase === 'ride' ? '🚕 여기서 세워주세요 (요금 정산 후 하차)' : '🚕 택시에서 내리기', key: 'E', fn: () => TAXI.stopHere() };
  if (ME.vehicle) return { label: ME.seat === 'd' ? (ME.vehicle.kind === 'horse' ? '말에서 내리기' : '하차') : '하차', key: 'E', fn: () => exitVehicle() };
  let best = null, bd = 99;
  const cand = (d, obj) => { if (d < bd) { bd = d; best = obj; } };
  INTERIOR.interacts(cand); if (INTERIOR.cur) { for (const [id, rp] of G.players) { if (!sameSpace(rp)) continue; const d = Math.hypot(rp.x - ME.x, rp.z - ME.z); if (d < 2.2) cand(d + 0.2, { label: `🤝 ${rp.name}`, key: 'E', fn: () => UI.openPlayer(rp) }); } return best; }
  for (const f of FACILITIES) { const d = Math.hypot(f.x - ME.x, f.z - ME.z); if (d < 2.6) cand(d - 0.5, f.bld ? { label: `🚪 ${f.icon} ${f.name} 들어가기`, key: 'E', fn: () => INTERIOR.enter(f.bld) } : { label: `${f.icon} ${f.name}`, key: 'E', fn: () => UI.openFacility(f) }); }
  { const nd = INTERIOR.nearDoor(); if (nd && !nd.b.fac) cand(nd.d - 0.3, HOUSE.isHome(nd.b) && !ADMIN.on ? { label: HOUSE.label(nd.b), key: 'E', fn: () => HOUSE.door(nd.b) } : { label: `🚪 ${nd.b.kind === 'restaurant' ? FOOD.shop(nd.b).ic + ' ' + FOOD.shop(nd.b).name : nd.b.name} 들어가기`, key: 'E', fn: () => INTERIOR.enter(nd.b) }); }
  JOBS.interact(cand);
  for (const p of PLOTS) { const d = Math.hypot(p.signPos[0] - ME.x, p.signPos[1] - ME.z); const inside = Math.abs(ME.x - p.x) < p.w / 2 + 2 && Math.abs(ME.z - p.z) < p.d / 2 + 2; if (d < 4 || (inside && p.state === 'done')) cand(d, { label: p.state === 'done' ? `🏠 ${p.ownerName || ''}의 ${BUILD_DESIGNS[p.design]?.name || '건물'}` : p.owner ? `🏗️ ${p.ownerName}의 땅` : `🪧 매물 (${fmtMoney(p.price)})`, key: 'E', fn: () => UI.openPlot(p) }); }
  const v = nearestVehicle(2.8);
  if (v && v.taxiCab) cand(1.0, v.taxiOwner === ME.id ? { label: '🚕 내가 부른 택시 타기', key: 'E', vehicle: 1, fn: () => TAXI.board() } : { label: '🚕 다른 손님이 부른 택시', key: 'E', vehicle: 1, fn: () => toast('🚕 다른 손님이 부른 택시다') });
  else if (v && v.isTraffic && v.ai && v.model === 'taxi' && !v.dead) cand(1.0, { label: '🚕 택시 잡기 (F: 탈취)', key: 'E', vehicle: 1, fn: () => TAXI.hail(v) });
  else if (v) cand(1.2, { label: v.locked ? '🚗 판매용 차량' : v.kind === 'horse' ? '🐎 말 타기' : v.ai ? `🔑 차량 탈취 (${v.M.name})` : v.driver && v.driver !== ME.id ? '🧍 동승하기' : `🚗 탑승 (${v.M.name})`, key: 'E', vehicle: 1, fn: () => enterVehicle(v) });
  for (const p of PEDS) { if (p.state === 'parked' || p.state === 'dead' || p.state === 'fight') continue; const d = Math.hypot(p.x - ME.x, p.z - ME.z); if (d < 2.2) cand(d + 0.3, { label: `💬 ${p.kind === 'police' ? '경찰' : p.kind.startsWith('gang') ? '갱단원' : '시민'}과 상호작용`, key: 'E', fn: () => UI.openPed(p) }); }
  for (const a of ANIMALS) { if (a.state === 'dead') continue; const d = Math.hypot(a.x - ME.x, a.z - ME.z); const r = a.S.biped ? 1.6 : 1.4 + a.S.body[0] * 0.5; if (d < r) cand(d, { label: `🐾 ${a.S.name}`, key: 'E', fn: () => UI.openAnimal(a) }); }
  for (const b of BENCHES) { const d = Math.hypot(b.x - ME.x, b.z - ME.z); if (d < 1.4) cand(d + 0.4, { label: '🪑 앉기', key: 'E', fn: () => { ME.sitBench = b; ME.dance = -1; } }); }
  for (const [id, rp] of G.players) { if (!sameSpace(rp)) continue; const d = Math.hypot(rp.x - ME.x, rp.z - ME.z); if (d < 2.2 && !rp.veh) cand(d + 0.2, { label: `🤝 ${rp.name}`, key: 'E', fn: () => UI.openPlayer(rp) }); }
  return best;
}
function doInteract() { if (curInteract) curInteract.fn(); }
// ----- player update -----
const _tmpV = new THREE.Vector3();
// ----- 중력 · 낙하 피해 -----
// 약 4m 이하는 무피해, 그 이상은 높이에 비례 (약 19m 이상이면 치명상). 물·차량·택시는 무피해, 관리자 면역.
const FALL_SAFE = 4, FALL_K = 6.5;
function fallDamageFor(h) { return h <= FALL_SAFE ? 0 : (h - FALL_SAFE) * FALL_K; }
function landed(fv) {
  const top = ME.fallTop; ME.fallTop = null; if (top == null) return;
  const h = top - ME.y; const dmg = fallDamageFor(h);
  if (dmg <= 0 || ME.vehicle) return;
  if (ME.swim || (terrainH(ME.x, ME.z) < LAND - 1.6 && ME.y < 0.6)) { toast(`🌊 물에 떨어졌다 — 다치지 않았다 (${h.toFixed(1)}m)`, 1800); return; }
  if (ADMIN.on || ME.god) { toast(`🦴 낙하 ${h.toFixed(1)}m — 관리자 면역`, 1500); return; }
  ME.takeDamage(dmg, 'fall'); sfx('hit', ME.x, ME.z); ME.lastFall = { h, dmg, t: G.t };
  toast(ME.dead ? `💀 추락사 (${h.toFixed(1)}m)` : `🦴 낙하 피해 -${Math.round(dmg)} (${h.toFixed(1)}m)`, 2200);
}
function updatePlayer(dt) {
  const c = ME.char;
  if (ME._py !== undefined && Math.abs(ME.y - ME._py) > 6) ME.fallTop = null; // 순간이동은 낙하로 치지 않는다
  if (ME.vehicle || ME.fly || ME.sitBench) ME.fallTop = null;
  ME.fireT -= dt; ME.actionT = Math.min(1, ME.actionT + dt * actSpeed(ME.action));
  if (ME.reloadT > 0) { ME.reloadT -= dt; if (ME.reloadT <= 0) finishReload(); }
  if (ME.meleeAt && G.t >= ME.meleeAt) { ME.meleeAt = 0; meleeResolve(); }
  ME.drunk = Math.max(0, ME.drunk - dt * 0.01);
  if (ME.dead) { ME.deadT += dt; if (ME.deadT > 6) ME.respawn(); c.update(dt, { state: 'dead' }); placeChar(); return; }
  // wanted decay
  if (ME.wanted > 0) {
    const copNear = PEDS.some(q => q.kind === 'police' && q.state !== 'dead' && q.state !== 'parked' && Math.hypot(q.x - ME.x, q.z - ME.z) < 75) || TRAFFIC.some(v => v.model === 'police' && v.ai && !v.dead && Math.hypot(v.x - ME.x, v.z - ME.z) < 90);
    ME.wantedCool += copNear ? -dt * 0.5 : dt; ME.wantedCool = Math.max(0, ME.wantedCool);
    if (ME.wantedCool > 18) { ME.wanted--; ME.wantedCool = 0; UI.updateStars(); if (!ME.wanted) toast('✅ 수배 해제'); }
  }
  if (INP.fire) { const W = WEAPONS[ME.weapon]; if (W.auto || !INP._fired) { tryAttack(); INP._fired = true; } } else INP._fired = false;
  if (adminGod()) { ME.hp = 100; ME.dead = false; }
  if (ME.vehicle) { if (ME.god || adminGod()) { ME.vehicle.hp = ME.vehicle.M.hp; ME.vehicle.dead = false; ME.vehicle.burnT = 0; } updateDriving(dt); placeChar(); return; }
  const mi = readMoveInput(); const mag = Math.min(1, Math.hypot(mi.x, mi.z));
  const fwdX = Math.sin(CAM.yaw), fwdZ = Math.cos(CAM.yaw), rX = -Math.cos(CAM.yaw), rZ = Math.sin(CAM.yaw);
  let dx = fwdX * mi.z + rX * mi.x, dz = fwdZ * mi.z + rZ * mi.x; const dl = Math.hypot(dx, dz); if (dl > 0) { dx /= dl; dz /= dl; }
  ME.aiming = INP.aim && !WEAPONS[ME.weapon].melee;
  if (ME.fly) { ADMIN.flyStep(dt, dx, dz, mag); placeChar(); return; }
  const water = terrainH(ME.x, ME.z) < LAND - 1.6 && ME.y < 0.5 && !(deckY(ME.x, ME.z) !== null && ME.y > 1);
  ME.swim = water;
  let sprint = (KEYS['shift'] || KEYS['ShiftLeft'] || INP.touchRun || (G.opt.autoRun && mag > 0.1) || (IS_TOUCH && INP.joyMag > 0.92)) && ME.stamina > 1 && !ME.aiming;
  let speed = ME.swim ? (sprint ? 3.6 : 2.4) : ME.aiming ? 2.8 : sprint ? 9.2 + ME.skills.fit * 0.35 : (IS_TOUCH && mag < 0.5 ? 2.2 : 4.8);
  speed *= ME.speedMul || 1;
  const SL = slopeWalk(dx, dz); speed *= SL.mul; if (mag > 0.1 && SL.stam) ME.stamina = Math.max(0, ME.stamina - SL.stam * dt * (sprint ? 1.6 : 0.6)); // 오르막은 느리고 힘들다
  if (ME.drunk > 0.4) { dx += Math.sin(G.t * 1.3) * 0.4 * ME.drunk; dz += Math.cos(G.t * 1.1) * 0.4 * ME.drunk; }
  ME.stamina = clamp(ME.stamina + (sprint && mag > 0.1 ? -dt * (14 - ME.skills.fit * 1.5) : dt * 9), 0, 100);
  if (ME.knockT > 0) { ME.knockT -= dt; speed = 0; }
  if (mag > 0.05) { ME.dance = -1; ME.sitBench = null; if (ME.sleep) SLEEP.wake('early'); }
  const tvx = dx * speed * mag, tvz = dz * speed * mag;
  const acc = ME.grounded ? 14 : 2.5;
  ME.vx = damp(ME.vx, tvx, ME.knockT > 0 ? 1 : acc, dt); ME.vz = damp(ME.vz, tvz, ME.knockT > 0 ? 1 : acc, dt);
  if (ME.sitBench) { const b = ME.sitBench; ME.x = b.x - Math.sin(b.yaw) * 0.05; ME.z = b.z - Math.cos(b.yaw) * 0.05; ME.yaw = b.yaw; ME.vx = ME.vz = 0; }
  ME.x += ME.vx * dt; ME.z += ME.vz * dt;
  ME.spd = Math.hypot(ME.vx, ME.vz);
  if (ME.aiming || (ME.combatT > G.t && ME.fireT > -0.3 && !WEAPONS[ME.weapon].melee)) ME.yaw = dampAng(ME.yaw, CAM.yaw, 20, dt);
  else if (ME.spd > 0.3 && !ME.sitBench) ME.yaw = dampAng(ME.yaw, Math.atan2(ME.vx, ME.vz), 12, dt);
  if (ME.action && ME.actionT < 1 && WEAPONS[ME.weapon].melee && !ME.aiming) ME.yaw = dampAng(ME.yaw, CAM.yaw, 10, dt);
  // collisions
  const r = resolveCircle(ME.x, ME.z, 0.35, ME.y, 1.8); ME.x = r.x; ME.z = r.z;
  for (const v of vehicles.values()) { if (!v.mesh.visible) continue; for (const [cx, cz] of v.circles()) { const ddx = ME.x - cx, ddz = ME.z - cz, d = Math.hypot(ddx, ddz), m = v.radius + 0.35; if (d < m && d > 0.01 && Math.abs(ME.y - v.y) < 1.6) { ME.x += ddx / d * (m - d); ME.z += ddz / d * (m - d); } } }
  for (const p of PEDS) { if (p.state === 'parked' || p.state === 'dead') continue; const ddx = ME.x - p.x, ddz = ME.z - p.z; if (Math.abs(ddx) > 1 || Math.abs(ddz) > 1) continue; const d = Math.hypot(ddx, ddz); if (d < 0.65 && d > 0.01) { ME.x += ddx / d * (0.65 - d) * 0.6; ME.z += ddz / d * (0.65 - d) * 0.6; } }
  // vertical
  const gy = floorAt(ME.x, ME.z, ME.y);
  if (ME.swim) { ME.fallTop = null; }
  if (ME.swim) { ME.y = damp(ME.y, -0.32, 4, dt); ME.vy = 0; ME.grounded = false; if (Math.random() < dt * ME.spd * 0.5) FX.impact({ x: ME.x, y: -0.1, z: ME.z }, 'water'); }
  else {
    const jh = KEYS[' '] || INP.jump; ME.coyote = ME.grounded ? 0.12 : (ME.coyote || 0) - dt; ME.jumpBuf = jh ? 0.14 : (ME.jumpBuf || 0) - dt;
    if (ME.jumpBuf > 0 && ME.coyote > 0 && ME.knockT <= 0 && !ME.sitBench) { ME.vy = 5.8; ME.grounded = false; ME.coyote = 0; ME.jumpBuf = 0; INP.jump = false; ME.dance = -1; }
    if (!jh && ME.vy > 2.5 && !ME.grounded) ME.vy -= 28 * dt; // 짧게 누르면 낮은 점프
    ME.vy = Math.max(-38, ME.vy - (ME.vy < 0 ? 24 : 19) * dt); ME.y += ME.vy * dt;
    if (ME.y <= gy) { const fv = ME.vy; const wasAir = !ME.grounded; ME.y = gy; ME.vy = 0; ME.grounded = true; if (wasAir) landed(fv); if (fv < -7) { CAM.shake = Math.min(0.5, CAM.shake + (-fv - 7) / 30); sfx('step'); } }
    else if (ME.y - gy < 0.25 && ME.vy <= 0 && ME.grounded) { ME.y = gy; ME.vy = 0; }
    else { if (ME.grounded || ME.fallTop == null) ME.fallTop = Math.max(ME.y, ME.fallTop ?? -1e9); ME.grounded = false; ME.fallTop = Math.max(ME.fallTop, ME.y); }
    if (ME.y < -0.25 && terrainH(ME.x, ME.z) < LAND - 1.6) { if (ME.fallTop != null && ME.fallTop - ME.y > 4) toast(`🌊 물에 떨어졌다 — 다치지 않았다 (${(ME.fallTop - ME.y).toFixed(1)}m)`, 1800); ME.swim = true; ME.fallTop = null; }
  }
  // footsteps
  if (ME.grounded && ME.spd > 1) { ME.stepT -= dt * ME.spd; if (ME.stepT <= 0) { ME.stepT = 1.6; sfx('step'); } }
  // pickups
  for (const [id, p] of PICKUPS) if (Math.abs(p.x - ME.x) < 1.2 && Math.abs(p.z - ME.z) < 1.2 && Math.abs(p.y - ME.y) < 2) { if (G.isHost) { removePickup(id); ME.money += p.amount; sfx('cash'); toast(`💵 +${fmtMoney(p.amount)}`); NET.send({ t: 'pickRm', id }); } else { if (!p.req) { p.req = 1; NET.send({ t: 'pick', id }); } } }
  placeChar(); ME._py = ME.y;
}
function placeChar() {
  const c = ME.char; const v = ME.vehicle;
  if (v) {
    _tmpV.copy(seatVec(v, ME.seat));
    v.mesh.updateMatrixWorld(); _tmpV.applyMatrix4(v.mesh.matrixWorld); c.root.position.copy(_tmpV); c.root.rotation.set(0, 0, 0); c.root.rotation.order = 'YXZ'; c.root.rotation.y = v.yaw; c.root.rotation.x = -v.pitch; c.root.rotation.z = v.roll;
    const aimY = ME.aiming ? CAM.yaw : v.yaw; if (ME.aiming) c.root.rotation.y = aimY;
    c.update(G.dt, { state: v.kind === 'bike' ? 'bike' : v.kind === 'horse' ? 'horse' : ME.seat !== 'd' ? 'passenger' : 'drive', steer: v.steer / (v.M.steer || 0.5), speed: Math.abs(v.speed), aiming: ME.aiming, aimPitch: -CAM.pitch, action: ME.action, actionT: ME.actionT });
    c.root.visible = !(CAM.fp && ME.seat === 'd' && false);
    return;
  }
  c.root.position.set(ME.x, ME.y, ME.z); c.root.rotation.set(0, ME.yaw, 0);
  c.setWeapon(ME.dance >= 0 || ME.sitBench || ME.swim ? 'fist' : ME.weapon);
  c.update(G.dt, { speed: ME.sitBench ? 0 : ME.spd, grounded: ME.grounded || ME.swim, state: ME.dead ? 'dead' : ME.sleep ? 'sleep' : ME.sitBench ? 'sit' : ME.swim ? 'swim' : ME.knockT > 0.6 ? 'knocked' : 'normal', aiming: ME.aiming, aimPitch: -CAM.pitch, action: ME.action, actionT: ME.actionT, dance: ME.dance, guard: ME.weapon === 'fist' && ME.combatT > G.t, idleLook: 0.3, snap: false });
  if (ME.sitBench) { c.root.position.y = ME.sitBench.y + 0.5 - 0.95 + 0.0; }
  c.P.head.visible = !CAM.fp;
}
function updateDriving(dt) {
  const v = ME.vehicle; ME.x = v.x; ME.z = v.z; ME.y = v.y; ME.yaw = v.yaw; ME.aiming = INP.aim && !WEAPONS[ME.weapon].melee && (ME.weapon === 'pistol' || ME.weapon === 'smg' || ME.seat !== 'd');
  ME.spd = 0;
  if (ME.seat !== 'd') return;
  if (v.driver !== ME.id) { ME.vehicle = null; return; }
  const mi = readMoveInput();
  const shift = !!(KEYS['shift'] || KEYS['ShiftLeft'] || KEYS['ShiftRight']);
  const inp = { throttle: mi.z, steer: -mi.x, brake: !!(KEYS[' '] || INP.brake) && v.kind !== 'horse', hand: (shift || INP.drift) && v.kind === 'car' && Math.abs(v.speed) > 6, up: !!(KEYS[' '] || INP.jump || INP.brake), down: shift || !!INP.touchRun };
  if (v.kind === 'heli') { inp.brake = false; }
  if (v.kind === 'horse' && (KEYS[' '] || INP.jump) && v.y <= v.groundY + 0.05) { v.vy = 6.5; v.y += 0.1; INP.jump = false; }
  if (v.kind === 'horse' && (KEYS['shift'] || INP.touchRun)) inp.throttle *= 1; else if (v.kind === 'horse') inp.throttle *= 0.55;
  if (IS_TOUCH && INP.joyMag > 0.05) { inp.throttle = clamp(mi.z * 1.4, -1, 1); inp.steer = clamp(-mi.x * 1.2, -1, 1); }
  v.drive(dt, inp); v.ctrl = 'local';
  if (Math.abs(v.speed) > 4 && (v.kind !== 'heli' || v.y - (v.groundY ?? v.y) < 1.5)) runOverCheck(v, 'me');
  ENG.set(!v.dead, clamp(Math.abs(v.speed) / v.M.max, 0, 1), v.kind);
  if (v.kind === 'bike' && v.lastImpact > 10) { }
  if (v.waterT > 2.5 && v.kind !== 'horse') { exitVehicle(true); toast('🌊 차가 물에 빠졌다!'); }
  if (v.dead && v.burnT === 0) { exitVehicle(true); }
}
// bike crash ejection
function onVehicleCrash(v, imp) { if (v === ME.vehicle && v.kind === 'bike' && imp > 11) { exitVehicle(true); ME.takeDamage(imp * 2.2, 'crash'); ME.knock(Math.sin(v.yaw) * imp * 0.5, Math.cos(v.yaw) * imp * 0.5); toast('💥 오토바이에서 튕겨나갔다!'); } }
// ----- camera -----
const _camT = new THREE.Vector3(), _camP = new THREE.Vector3(), _camF = new THREE.Vector3();
function updateCamera(dt) {
  const v = ME.vehicle; const scope = ME.aiming && WEAPONS[ME.weapon].scope;
  let tx, ty, tz, dist, sh = 0;
  if (v) {
    tx = v.x; ty = v.y + (v.kind === 'heli' ? 3 : v.kind === 'car' ? 1.6 : 1.9); tz = v.z; dist = (v.kind === 'heli' ? 15 : v.kind === 'car' ? 7.2 + v.M.L * 0.25 : 5.2) + Math.abs(v.speed) * (v.kind === 'heli' ? 0.08 : 0.03);
    if (G.t - CAM.lookT > 1.3 && Math.abs(v.speed) > 2 && (ME.seat === 'd' || v.taxiCab)) { CAM.yaw = dampAng(CAM.yaw, v.yaw + (v.speed < -1 ? Math.PI : 0), 2.5, dt); CAM.pitch = damp(CAM.pitch, 0.16, 2, dt); }
    if (ME.aiming) { dist = 3.2; sh = 0.6; }
  } else {
    tx = ME.x; ty = ME.y + (ME.swim ? 0.9 : ME.sitBench ? 1.2 : 1.6); tz = ME.z; dist = ME.aiming ? 2.0 : 4.3; sh = ME.aiming ? 0.62 : 0.38;
    if (ME.dead) { CAM.yaw += dt * 0.3; dist = 6; CAM.pitch = damp(CAM.pitch, 0.6, 2, dt); }
  }
  if (CAM.fp || scope) { dist = 0; sh = 0; }
  CAM.dist = damp(CAM.dist, dist, 10, dt); CAM.sh = damp(CAM.sh, sh, 10, dt);
  const cp = Math.cos(CAM.pitch), sp = Math.sin(CAM.pitch);
  _camF.set(Math.sin(CAM.yaw) * cp, -sp, Math.cos(CAM.yaw) * cp);
  const rx = -Math.cos(CAM.yaw), rz = Math.sin(CAM.yaw);
  _camT.set(tx + rx * CAM.sh, ty, tz + rz * CAM.sh);
  if (CAM.fp || scope) { if (!v) { _camT.set(ME.x + Math.sin(ME.yaw) * 0.12, ME.y + 1.68, ME.z + Math.cos(ME.yaw) * 0.12); } else { const p = ME.char.P.head.getWorldPosition(_camP); _camT.set(p.x, p.y + 0.15, p.z); } }
  let d = CAM.dist;
  if (d > 0.2) { const back = _camF.clone().negate(); const hit = rayColliders(_camT.x, _camT.y, _camT.z, back.x, back.y, back.z, d + 0.3); if (hit.c && hit.t < d + 0.3) d = Math.max(0.4, hit.t - 0.35); }
  _camP.copy(_camT).addScaledVector(_camF, -d);
  const gmin = groundHeight(_camP.x, _camP.z, _camP.y) + 0.35; if (_camP.y < gmin) _camP.y = gmin;
  if (CAM.shake > 0) { CAM.shake = Math.max(0, CAM.shake - dt * 2); _camP.x += rnd(-1, 1) * CAM.shake * 0.12; _camP.y += rnd(-1, 1) * CAM.shake * 0.12; }
  camera.position.copy(_camP); camera.lookAt(_camP.x + _camF.x, _camP.y + _camF.y, _camP.z + _camF.z);
  if (ME.drunk > 0.2) camera.rotation.z += Math.sin(G.t * 1.7) * 0.05 * ME.drunk;
  const fov = scope ? 16 : ME.aiming ? 50 : 62 + (v ? clamp(Math.abs(v.speed) / 3, 0, 14) : (ME.spd > 6 ? 4 : 0));
  CAM.fov = damp(CAM.fov, fov, 8, dt); if (Math.abs(camera.fov - CAM.fov) > 0.05) { camera.fov = CAM.fov; camera.updateProjectionMatrix(); }
  AU.listener.x = camera.position.x; AU.listener.z = camera.position.z; AU.listener.yaw = CAM.yaw;
  if (ME.char) ME.char.root.visible = (!(scope || (CAM.fp && !v)) && !(d < 0.95 && !v && !CAM.fp)) || ME.dead;
}
// ================= REMOTE PLAYERS =================
function getRemote(id) {
  let rp = G.players.get(id);
  if (!rp) { rp = { id, name: '???', x: 0, y: LAND, z: 0, yaw: 0, tx: 0, ty: LAND, tz: 0, tyaw: 0, char: new Character(randomOutfit()), anim: {}, veh: null, dead: false, wanted: 0, grudge: {}, hp: 100, first: true }; scene.add(rp.char.root); G.players.set(id, rp); }
  return rp;
}
function removeRemote(id) { const rp = G.players.get(id); if (!rp) return; scene.remove(rp.char.root); disposeSprite(rp.char.nameTag); rp.char.nameTag = null; disposeSprite(rp.char.bubble); rp.char.bubble = null; for (const v of vehicles.values()) { if (v.driver === id) { v.driver = null; if (G.isHost) v.ctrl = 'local'; } if (v.passenger === id) v.passenger = null; } G.players.delete(id); }
function renderRemotes(dt) {
  for (const rp of G.players.values()) {
    const c = rp.char; const v = rp.veh ? vehicles.get(rp.veh) : null;
    const vis = sameSpace(rp); c.root.visible = vis; if (!vis) { rp.x = rp.tx; rp.y = rp.ty; rp.z = rp.tz; continue; } // 다른 실내(또는 바깥)에 있는 사람은 숨긴다
    if (v) {
      _tmpV.copy(seatVec(v, rp.seat)); v.mesh.updateMatrixWorld(); _tmpV.applyMatrix4(v.mesh.matrixWorld);
      c.root.position.copy(_tmpV); c.root.rotation.set(-v.pitch, rp.aim ? rp.yaw : v.yaw, v.roll, 'YXZ'); rp.x = v.x; rp.z = v.z; rp.y = v.y;
      c.update(dt, { state: v.kind === 'bike' ? 'bike' : v.kind === 'horse' ? 'horse' : rp.seat && rp.seat !== 'd' ? 'passenger' : 'drive', steer: v.steer / (v.M.steer || 0.5), speed: Math.abs(v.speed), aiming: rp.aim, aimPitch: rp.ap, action: rp.act, actionT: rp.actT });
    } else {
      rp.x = damp(rp.x, rp.tx, 12, dt); rp.y = damp(rp.y, rp.ty, 12, dt); rp.z = damp(rp.z, rp.tz, 12, dt); rp.yaw = dampAng(rp.yaw, rp.tyaw, 12, dt);
      c.root.position.set(rp.x, rp.y, rp.z); c.root.rotation.set(0, rp.yaw, 0);
      c.update(dt, { speed: rp.spd, grounded: rp.gr, state: rp.dead ? 'dead' : rp.st || 'normal', aiming: rp.aim, aimPitch: rp.ap, action: rp.act, actionT: rp.actT, dance: rp.dance, guard: rp.guard });
      if (rp.st === 'sit') c.root.position.y = rp.y - 0.45;
    }
    rp.actT = Math.min(1, (rp.actT ?? 1) + dt * actSpeed(rp.act));
    c.setWeapon(rp.w || 'fist');
  }
}
