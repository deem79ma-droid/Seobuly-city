
// ================= LAW (체포/감옥/출소카드) + ADMIN 특권 =================
const BANS = new Set(); try { for (const b of JSON.parse(localStorage.getItem('sbc3d_bans') || '[]')) BANS.add(b); } catch (e) { }
function saveBans() { try { localStorage.setItem('sbc3d_bans', JSON.stringify([...BANS])); } catch (e) { } }
const ADMIN_SUIT = { top: 'suit', topColor: '#15151a', bottom: 'slacks', bottomColor: '#15151a', shoes: '#0c0c0c', glasses: 'sunglasses', hat: 'none', beard: 'none' };
const COP_ADMIN = ['관리자 님입니까? 즉시 풀어드리겠습니다!', '관리자 님이셨군요! 바로 풀어드리겠습니다!', '충성! 관리자 님, 즉시 풀어드리겠습니다!'];
const DOC_ADMIN = ['관리자 님입니까? 즉시 치료해드리겠습니다!', '관리자 님! 바로 치료해드리겠습니다!'];

Object.assign(ADMIN, {
  prev: null, bonus: 0,
  async preAuth() { try { const el = $('#admIn'); const pw = el && el.value; if (el) el.value = ''; if (!pw) return; const sk = await this.check(pw); if (sk) { this.sk = sk; this.pre = true; } else toastLater('❌ 관리자 비밀번호가 틀렸다'); } catch (e) { } },
  autoLogin() { if (this.pre && this.sk && !this.on) this.enter(); },
  enter() {
    this.on = true; this.prev = { outfit: Object.assign({}, ME.outfit), money: ME.money };
    if (ME.char) { ME.outfit = Object.assign({}, ME.outfit, ADMIN_SUIT); ME.char.setOutfit(ME.outfit); NET.send({ t: 'outfit', o: ME.outfit }); }
    for (const w of WEAPON_ORDER) ME.weapons[w] = 1; ME.money = 999999999999; UI.updateWeapon && UI.updateWeapon();
    this.announce(); toast('👑 관리자 모드 — 무한 돈·무한 탄약·체포 면제');
  },
  announce() {
    if (!G.online) return;
    if (G.isHost) { G.adminId = ME.id; NET.send({ t: 'admin', aid: ME.id }); }
    else if (NET.helloSent) NET.send({ t: 'admClaim' }); // 방장이 nonce를 보내면 서명으로 증명 → 자동으로 방장 권한 이전
  },
  exit() {
    this.on = false; this.sk = null; this.pre = false; ME.god = false; ME.fly = false; ME.speedMul = 1;
    if (this.prev) { ME.outfit = this.prev.outfit; if (ME.char) { ME.char.setOutfit(ME.outfit); NET.send({ t: 'outfit', o: ME.outfit }); } ME.money = Math.min(ME.money, Math.max(this.prev.money, 50000)); }
    if (G.adminId === ME.id) { G.adminId = null; NET.send({ t: 'admin', aid: null }); }
    toast('🔒 관리자 모드 OFF');
  },
  // ----- 방장 쪽: 관리자 증명 요청/검증 -----
  challenge(conn, banned) {
    if (!G.isHost || !this.enabled() || !conn || conn.chal) return;
    conn.chal = randHex(32); conn.chalBan = !!banned; clearTimeout(conn.chalT);
    conn.chalT = setTimeout(() => { if (conn.chal) { conn.chal = null; if (conn.chalBan) NET.kick(conn, true); } }, 15000);
    try { conn.send({ t: 'admChal', n: conn.chal, h: ME.id, r: G.room, f: ME.id }); } catch (e) { }
  },
  async onProof(m, conn) {
    if (!G.isHost || !conn || !conn.chal || !conn.pid) return; const n = conn.chal; conn.chal = null; clearTimeout(conn.chalT);
    const ok = await ACRYPTO.verify(ADMIN_PUB, m.s, `sbc3d-admin-v2|${G.room}|${ME.id}|${conn.pid}|${n}`);
    if (!ok) { try { conn.send({ t: 'chat', m: '⚠ 관리자 인증 실패', sys: 1 }); } catch (e) { } if (conn.chalBan) NET.kick(conn, true); return; }
    conn.admin = true;
    if (this.on && G.adminId === ME.id) { try { conn.send({ t: 'chat', m: '👑 이 방은 이미 관리자가 방장입니다', sys: 1 }); } catch (e) { } return; }
    NET.transferHostTo(conn); // 승인 절차 없이 무조건 방장 이전
  },
  // ----- 관리자 쪽: nonce에 서명만 돌려준다 (비번/개인키는 전송하지 않음) -----
  async prove(m, conn) {
    if (!this.on || !this.sk || conn !== NET.hostConn) return;
    const sig = await ACRYPTO.sign(this.sk, `sbc3d-admin-v2|${m.r}|${m.h}|${ME.id}|${m.n}`);
    try { conn.send({ t: 'admProof', s: sig, f: ME.id }); } catch (e) { }
  },
  onAdminMsg(m) { if (G.isHost) return; G.adminId = m.aid || null; if (m.aid) { const rp = G.players.get(m.aid); if (rp) rp.char.setName((rp.name || '') + ' 👑', '#ffd34a'); if (m.aid !== ME.id) announce('👑 관리자 입장', '방장 권한이 관리자에게 이전되었습니다'); } },
  hostPower() { return G.adminId ? G.adminId === ME.id : G.isHost; },
  kickOthers(ban) {
    let n = 0;
    for (const c of NET.conns.slice()) {
      if (c.admin || (c.pid && c.pid === G.adminId)) continue; if (G.adminId && G.adminId !== ME.id && !c.pid) continue;
      NET.kick(c, ban); n++;
    }
    toast(n ? (ban ? '⛔ 밴했다' : '👢 추방했다') : '대상이 없다');
  },
  freeOther() { const o = [...G.players.values()][0]; if (!o) { toast('다른 플레이어가 없다'); return; } NET.send({ t: 'free', to: o.id }); toast('🔓 ' + o.name + ' 무료 석방'); },
  adminTick(dt) {
    ME.money = 999999999999;
    this._u = (this._u || 0) - dt; const refresh = this._u <= 0; if (refresh) this._u = 0.6;
    for (const w of WEAPON_ORDER) { ME.weapons[w] = 1; const W = WEAPONS[w]; if (!W.melee) { ME.ammo[w] = 999; if (ME.reloadT <= 0 || w !== ME.weapon) ME.mag[w] = W.mag; } }
    if (refresh && UI.updateWeapon) UI.updateWeapon();
    if (ME.wanted) { ME.wanted = 0; ME.wantedCool = 0; UI.updateStars(); }
    for (const p of PEDS) {
      if (p.state === 'dead' || p.state === 'parked') continue; const d = Math.hypot(p.x - ME.x, p.z - ME.z);
      if (p.kind === 'police' && d < 60) {
        if (p.state === 'fight' && p.target && p.target.kind === 'me') { p.state = 'idle'; p.target = null; p.timer = 4; }
        if (d < 14 && G.t > (p._as || 0)) { p._as = G.t + 12; if (p.char) p.char.say(pick(COP_ADMIN), 4); }
      }
      if (p.kind === 'medic' && d < 14 && ME.hp < 100 && G.t > (p._as || 0)) { p._as = G.t + 8; ME.hp = 100; if (p.char) p.char.say(pick(DOC_ADMIN), 4); toast('🧑‍⚕️ 치료 완료'); }
    }
    if (ME.dead) {} 
  },
});

const LAW = {
  JX: -60, JZ: -60, JY: 420, built: false, arrestT: 0, hud: null,
  build() {
    this.built = true; const g = new THREE.Group(); const conc = new THREE.MeshStandardMaterial({ color: 0x8a8d92, roughness: 0.9 }), bar = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.4, metalness: 0.8 });
    const fl = new THREE.Mesh(new THREE.BoxGeometry(13, 1, 13), conc); fl.position.set(0, -0.5, 0); fl.receiveShadow = true; g.add(fl);
    for (let s = 0; s < 4; s++) for (let i = -6; i <= 6; i += 0.8) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 6), bar); const a = s < 2 ? 6.2 : i, c = s < 2 ? i : 6.2; b.position.set(s === 0 ? -6.2 : s === 1 ? 6.2 : i, 1.7, s === 2 ? -6.2 : s === 3 ? 6.2 : i); g.add(b); }
    for (let s = 0; s < 4; s++) { const r = new THREE.Mesh(new THREE.BoxGeometry(s < 2 ? 0.2 : 12.6, 0.2, s < 2 ? 12.6 : 0.2), bar); r.position.set(s === 0 ? -6.2 : s === 1 ? 6.2 : 0, 3.4, s === 2 ? -6.2 : s === 3 ? 6.2 : 0); g.add(r); }
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 1), new THREE.MeshStandardMaterial({ color: 0x5a5448 })); bed.position.set(4.5, 0.25, -5); g.add(bed);
    const lamp = new THREE.PointLight(0xfff0d0, 25, 25); lamp.position.set(0, 3, 0); g.add(lamp);
    g.position.set(this.JX, this.JY, this.JZ); scene.add(g);
    const h = document.createElement('div'); h.id = 'jailHud'; h.className = 'panel'; h.style.cssText = 'position:fixed;top:92px;left:50%;transform:translateX(-50%);padding:10px 18px;border-radius:12px;font-size:15px;z-index:20;display:none;text-align:center;pointer-events:none'; document.body.appendChild(h); this.hud = h;
  },
  nearestPolice() { let best = null, bd = 1e9; for (const f of FACILITIES) if (f.type === 'police') { const d = Math.hypot(f.x - ME.x, f.z - ME.z); if (d < bd) { bd = d; best = f; } } return best; },
  arrest() {
    const stars = ME.wanted; const f = this.nearestPolice(); const s = Math.max(40, stars * 40);
    if (ME.vehicle) exitVehicle(true); ME.jail = { t: s, total: s, ret: f ? { x: f.x, z: f.z } : { x: 30, z: 30 } }; ME.wanted = 0; ME.wantedCool = 0; UI.updateStars();
    ME.x = this.JX; ME.z = this.JZ; ME.y = this.JY; ME.vx = ME.vz = ME.vy = 0; ME.dance = -1; ME.sitBench = null; ME.weapon !== 'fist' && selectWeapon('fist');
    announce('🚔 체포!', `범죄 ★${stars} · 형량 ${s}초`); NET.send({ t: 'chat', m: `🚔 ${ME.name} 체포됨 (형량 ${s}초)`, sys: 1 }); sfx('error');
  },
  release(msg) {
    if (!ME.jail) return; const r = ME.jail.ret; ME.jail = null; ME.x = r.x + 1.5; ME.z = r.z + 3; ME.y = groundHeight(ME.x, ME.z) + 0.3; ME.vx = ME.vz = ME.vy = 0; ME.wanted = 0; UI.updateStars();
    const rr = resolveCircle(ME.x, ME.z, 0.35, ME.y, 1.8); ME.x = rr.x; ME.z = rr.z; G.godT = G.t + 3; toast(msg || '🔓 출소했다'); announce('🔓 출소', ''); sfx('levelup');
    NET.send({ t: 'chat', m: `🔓 ${ME.name} 출소`, sys: 1 });
  },
  jailStep(dt, dx, dz, mag) {
    const sp = 3.2; ME.vx = damp(ME.vx, dx * sp * mag, 12, dt); ME.vz = damp(ME.vz, dz * sp * mag, 12, dt);
    ME.x = clamp(ME.x + ME.vx * dt, this.JX - 5.5, this.JX + 5.5); ME.z = clamp(ME.z + ME.vz * dt, this.JZ - 5.5, this.JZ + 5.5); ME.y = this.JY; ME.vy = 0; ME.grounded = true; ME.swim = false;
    ME.spd = Math.hypot(ME.vx, ME.vz); if (ME.spd > 0.3) ME.yaw = dampAng(ME.yaw, Math.atan2(ME.vx, ME.vz), 12, dt);
  },
  tick(dt) {
    if (!G.started || !ME.char) return; if (!this.built) this.build();
    if (ADMIN.on) ADMIN.adminTick(dt);
    if (ME.jail) {
      ME.hp = 100; ME.dead = false; if (ADMIN.on) { this.release('👑 관리자는 수감되지 않는다'); return; }
      ME.jail.t -= dt; const t = Math.max(0, Math.ceil(ME.jail.t)); const card = ME.inv.card | 0;
      this.hud.style.display = ''; this.hud.innerHTML = `🔒 수감 중 · 남은 형량 <b style="color:#ffd34a">${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}</b><br><small style="opacity:.8">${card > 0 ? `🪪 출소카드 ${card}장 보유 — E 로 사용` : '출소카드 없음 (경찰서에서 구입)'}</small>`;
      if (ME.jail.t <= 0) this.release('🔓 형기를 마치고 출소했다');
      return;
    }
    this.hud.style.display = 'none';
    if (ME.wanted > 0 && !ME.dead && !ADMIN.on) {
      const slow = !ME.vehicle || Math.abs(ME.vehicle.speed) < 4; let near = false;
      if (slow) for (const p of PEDS) { if (p.kind !== 'police' || p.state === 'dead' || p.state === 'parked') continue; if (Math.abs(p.x - ME.x) < 2.3 && Math.abs(p.z - ME.z) < 2.3 && Math.abs(p.y - ME.y) < 2) { near = true; break; } }
      if (near) { this.arrestT += dt; if (this._w !== 1) { this._w = 1; toast('🚔 경찰에게 붙잡혔다! 뿌리쳐라!'); } if (this.arrestT > 1.8) this.arrest(); } else { this.arrestT = Math.max(0, this.arrestT - dt * 2); this._w = 0; }
    } else this.arrestT = 0;
  },
};
if (ADMIN.enabled()) { const f = $('#admField'); if (f) f.style.display = ''; }
