
// ================= LAW (체포/감옥/출소카드) + ADMIN 특권 =================
const BANS = new Set(); try { for (const b of JSON.parse(localStorage.getItem('sbc3d_bans') || '[]')) BANS.add(b); } catch (e) { }
function saveBans() { try { localStorage.setItem('sbc3d_bans', JSON.stringify([...BANS])); } catch (e) { } }
const ADMIN_SUIT = { top: 'suit', topColor: '#15151a', bottom: 'slacks', bottomColor: '#15151a', shoes: '#0c0c0c', glasses: 'sunglasses', hat: 'none', beard: 'none' };
const COP_ADMIN = ['관리자 님입니까? 즉시 풀어드리겠습니다!', '관리자 님이셨군요! 바로 풀어드리겠습니다!', '충성! 관리자 님, 즉시 풀어드리겠습니다!'];
const DOC_ADMIN = ['관리자 님입니까? 즉시 치료해드리겠습니다!', '관리자 님! 바로 치료해드리겠습니다!'];

Object.assign(ADMIN, {
  prev: null, bonus: 0,
  async preAuth() { try { const el = $('#admIn'); const pw = el && el.value; if (el) el.value = ''; if (!pw) return; const sk = await this.check(pw); if (sk) { this.sk = sk; this.pre = true; } else { this.lobbyMsg('err', '❌ 비밀번호가 틀렸어요'); toastLater('❌ 비밀번호가 틀렸어요'); } } catch (e) { } },
  autoLogin() { if (this.pre && this.sk && !this.on) this.enter(); },
  enter() {
    this.on = true; this.prev = { outfit: Object.assign({}, ME.outfit), money: ME.money };
    if (ME.char) { ME.outfit = Object.assign({}, ME.outfit, ADMIN_SUIT); ME.char.setOutfit(ME.outfit); NET.send({ t: 'outfit', o: ME.outfit }); }
    for (const w of WEAPON_ORDER) ME.weapons[w] = 1; ME.money = 999999999999; UI.updateWeapon && UI.updateWeapon();
    this.announce(); this.beginProgress();
  },
  // ---- 진입 진행 표시: 진입 중(스피너) → 완료 + 관리자 배지 ----
  status(kind, text, sub) {
    let el = $('#admStatus'); if (!el) { el = document.createElement('div'); el.id = 'admStatus'; document.body.appendChild(el); }
    clearTimeout(this._stT); el.className = kind; el.innerHTML = (kind === 'busy' ? '<span class="spin"></span>' : '') + '<div><b></b>' + (sub ? '<small></small>' : '') + '</div>';
    el.querySelector('b').textContent = text; if (sub) el.querySelector('small').textContent = sub; el.style.display = 'flex';
    if (kind !== 'busy') this._stT = setTimeout(() => { el.style.display = 'none'; }, kind === 'ok' ? 4200 : 3500);
  },
  hideStatus() { const el = $('#admStatus'); if (el) el.style.display = 'none'; clearTimeout(this._stT); },
  lobbyMsg(kind, text) { const el = $('#admMsg'); if (!el) return; el.className = kind || ''; el.innerHTML = (kind === 'busy' ? '<span class="spin"></span>' : '') + '<span></span>'; el.querySelector('span:last-child').textContent = text || ''; },
  beginProgress() {
    this.pending = true; this.ready = false; clearTimeout(this._pT);
    const needHost = G.online && !G.isHost;
    this.status('busy', '관리자 모드 진입 중…', needHost ? '서명 인증 · 방장 권한 넘겨받는 중' : '관리자 권한 적용 중');
    if (!needHost) this._pT = setTimeout(() => this.finish(true), 700);
    else this._pT = setTimeout(() => this.finish(false), 20000);
  },
  finish(hostOk) {
    if (!this.on || !this.pending) return; this.pending = false; this.ready = true; clearTimeout(this._pT);
    this.status('ok', '👑 관리자 모드 완료', hostOk ? (G.online ? '이 방의 방장 · 무한 돈·탄약 · 체포 면제' : '무한 돈·탄약 · 체포 면제') : '방장 권한은 아직 못 받았어요 (관리자 기능은 사용 가능)');
    sfx('levelup'); UI.updateHud && G.started && UI.updateHud();
  },
  onHostGranted() { G.adminId = ME.id; if (this.pending) this.finish(true); },
  announce() {
    if (!G.online) return;
    if (G.isHost) { G.adminId = ME.id; NET.send({ t: 'admin', aid: ME.id }); }
    else if (NET.helloSent) NET.send({ t: 'admClaim' }); // 방장이 nonce를 보내면 서명으로 증명 → 자동으로 방장 권한 이전
  },
  exit() {
    this.on = false; this.sk = null; this.pre = false; ME.god = false; ME.fly = false; ME.speedMul = 1;
    if (this.prev) { ME.outfit = this.prev.outfit; if (ME.char) { ME.char.setOutfit(ME.outfit); NET.send({ t: 'outfit', o: ME.outfit }); } ME.money = Math.min(ME.money, Math.max(this.prev.money, 50000)); }
    if (G.adminId === ME.id) { G.adminId = null; NET.send({ t: 'admin', aid: null }); }
    this.pending = false; this.ready = false; clearTimeout(this._pT); this.hideStatus(); toast('🔒 관리자 모드 OFF');
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
  onAdminMsg(m) { if (G.isHost) return; G.adminId = m.aid || null; if (m.aid) { if (m.aid === ME.id) this.onHostGranted(); if (m.aid !== ME.id) announce('👑 관리자 입장', '방장 권한이 관리자에게 이전되었습니다'); } },
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
  arrestT: 0, hud: null, built: false, esc: null,
  build() {
    this.built = true;
    const h = document.createElement('div'); h.id = 'jailHud'; h.className = 'panel'; h.style.cssText = 'position:fixed;top:92px;left:50%;transform:translateX(-50%);padding:10px 18px;border-radius:12px;font-size:15px;z-index:20;display:none;text-align:center;pointer-events:none'; document.body.appendChild(h); this.hud = h;
  },
  nearestPrison(x, z) { let best = null, bd = 1e9; for (const pr of PRISONS) { const d = Math.hypot(pr.gx - x, pr.z0 - z); if (d < bd) { bd = d; best = pr; } } return best; },
  nearestPolice() { let best = null, bd = 1e9; for (const f of FACILITIES) if (f.type === 'police') { const d = Math.hypot(f.x - ME.x, f.z - ME.z); if (d < bd) { bd = d; best = f; } } return best; },
  cellOf(j) { const pr = j && PRISONS[j.pr]; return pr ? pr.cells[j.cell] : null; },
  putInCell(c) { ME.x = c.x; ME.z = c.z; ME.y = groundHeight(c.x, c.z) + 0.05; ME.vx = ME.vz = ME.vy = 0; ME.fallTop = null; ME.yaw = Math.PI; },
  arrest() {
    if (ADMIN.on || ME.jail) { if (ADMIN.on) { ME.wanted = 0; UI.updateStars(); } return; } // 관리자는 체포 면제
    const a = anchorOf(ME); const pr = this.nearestPrison(a.x, a.z);
    INTERIOR.dispose(); INTERIOR.clearRoof(); if (ME.vehicle) exitVehicle(true); if (TAXI.cab) TAXI.dispose(true);
    const stars = ME.wanted; const s = Math.max(40, stars * 40);
    ME.wanted = 0; ME.wantedCool = 0; UI.updateStars(); ME.dance = -1; ME.sitBench = null; ME.weapon !== 'fist' && selectWeapon('fist');
    if (!pr) { toast('🚔 체포됐지만 근처에 교도소가 없어 훈방됐다'); return; }
    const ci = hashStr(ME.id + ':' + pr.id) % pr.cells.length;
    ME.jail = { t: s, total: s, pr: pr.id, cell: ci, escT: 0, escCool: 0 };
    this.putInCell(pr.cells[ci]);
    announce('🚔 체포!', `${pr.name} ${ci + 1}번 감방 · 형량 ${s}초`); NET.send({ t: 'chat', m: `🚔 ${ME.name} 체포 → ${pr.name} 수감 (형량 ${s}초)`, sys: 1 }); sfx('error');
  },
  release(msg) {
    if (!ME.jail) return; const pr = PRISONS[ME.jail.pr]; ME.jail = null;
    const r = pr ? pr.release : { x: 30, z: 30 }; ME.x = r.x + rnd(-1.2, 1.2); ME.z = r.z; ME.y = groundHeight(ME.x, ME.z) + 0.1; ME.vx = ME.vz = ME.vy = 0; ME.fallTop = null; ME.wanted = 0; UI.updateStars(); ME.yaw = Math.PI; CAM.yaw = Math.PI;
    const rr = resolveCircle(ME.x, ME.z, 0.35, ME.y, 1.8); ME.x = rr.x; ME.z = rr.z; G.godT = G.t + 3; toast(msg || '🔓 출소했다'); announce('🔓 출소', pr ? pr.name + ' 정문' : ''); sfx('levelup');
    NET.send({ t: 'chat', m: `🔓 ${ME.name} 출소`, sys: 1 });
  },
  // 감방 문 앞에서 E: 탈옥 시도 (3초, 약 35% 성공) — 성공하면 내 화면에서만 감방 문·정문이 열리고 수배 ★3
  interact() {
    const j = ME.jail; const c = this.cellOf(j); const card = ME.inv.card | 0;
    if (card > 0) return { label: `🪪 출소카드 사용 (보유 ${card}장)`, key: 'E', fn: () => { ME.inv.card--; this.release('🪪 출소카드로 즉시 출소했다'); } };
    if (c && Math.hypot(ME.x - c.dx, ME.z - (c.dz + 0.6)) < 1.7) {
      if (j.escT) return { label: '⛓️ 자물쇠 따는 중…', key: 'E', fn: () => { } };
      if (G.t < j.escCool) return { label: `⛓️ 탈옥 시도 (교도관 경계 중 ${Math.ceil(j.escCool - G.t)}초)`, key: 'E', fn: () => toast('🚨 교도관이 지켜보고 있다') };
      return { label: '⛓️ 탈옥 시도 (성공하면 수배 ★3 · 실패하면 형량 +30초)', key: 'E', fn: () => { j.escT = G.t + 3; toast('⛓️ 자물쇠를 따는 중… (3초간 문 앞에 있어야 한다)', 2500); sfx('ui'); } };
    }
    return null;
  },
  escapeResolve() {
    const j = ME.jail; const pr = PRISONS[j.pr]; const c = this.cellOf(j); j.escT = 0;
    if (Math.random() < 0.35 || ME.forceEscape) {
      ME.jail = null; removeCollider(c.doorCol); removeCollider(pr.gateCol); pr.gateMesh.visible = false;
      this.esc = { pr, c, until: G.t + 75 };
      addWanted(3); announce('🚨 탈옥 성공!', '정문이 열렸다 — 수배 ★3, 경찰이 쫓아온다!'); NET.send({ t: 'chat', m: `🚨 ${ME.name} 탈옥! (${pr.name})`, sys: 1 }); sfx('error');
    } else { j.t += 30; j.escCool = G.t + 20; toast('❌ 탈옥 실패 — 교도관에게 들켰다! 형량 +30초', 2600); sfx('error'); CAM.shake = 0.3; }
  },
  restoreDoors() {
    const E = this.esc; if (!E) return; this.esc = null;
    const re = (col) => { const n = addCollider(col.x0, col.z0, col.x1, col.z1, col.y1, col.type, col.ref, col.y0); return n; };
    E.c.doorCol = re(E.c.doorCol); E.pr.gateCol = re(E.pr.gateCol); E.pr.gateMesh.visible = true;
  },
  tick(dt) {
    if (!G.started || !ME.char) return; if (!this.built) this.build();
    for (const rp of G.players.values()) refreshRemoteName(rp);
    if (ADMIN.on) ADMIN.adminTick(dt);
    if (this.esc) { const E = this.esc, pr = E.pr; const inside = ME.x > pr.x0 && ME.x < pr.x1 && ME.z > pr.z0 && ME.z < pr.z1; if ((G.t > E.until && !inside) || G.t > E.until + 60 || ME.jail) this.restoreDoors(); }
    if (ME.jail) {
      const j = ME.jail; ME.hp = Math.max(ME.hp, 100); ME.dead = false; if (ADMIN.on) { this.release('👑 관리자는 수감되지 않는다'); return; }
      const c = this.cellOf(j); if (!c) { this.release(); return; }
      // 감방 밖으로 나가면(벽 끼임·순간이동 등) 감방으로 되돌린다
      if (ME.x < c.x0 - 0.6 || ME.x > c.x1 + 0.6 || ME.z < c.z0 - 0.7 || ME.z > c.z1 + 0.6 || Math.abs(ME.y - groundHeight(c.x, c.z)) > 3) this.putInCell(c);
      if (j.escT) { if (Math.hypot(ME.x - c.dx, ME.z - (c.dz + 0.6)) > 2) { j.escT = 0; toast('⛓️ 탈옥 시도 중단'); } else if (G.t >= j.escT) { this.escapeResolve(); if (!ME.jail) { this.hud.style.display = 'none'; return; } } }
      j.t -= dt; const t = Math.max(0, Math.ceil(j.t)); const card = ME.inv.card | 0; const pr = PRISONS[j.pr];
      this.hud.style.display = ''; this.hud.innerHTML = `🔒 ${pr.name} ${j.cell + 1}번 감방 · 남은 형량 <b style="color:#ffd34a">${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}</b><br><small style="opacity:.8">${j.escT ? `⛓️ 자물쇠 따는 중… ${Math.max(0, j.escT - G.t).toFixed(1)}초` : card > 0 ? `🪪 출소카드 ${card}장 보유 — E 로 사용` : '감방 문 앞에서 E: 탈옥 시도 · 출소카드는 경찰서에서 구입'}</small>`;
      if (j.t <= 0) this.release('🔓 형기를 마치고 정문으로 출소했다');
      return;
    }
    this.hud.style.display = 'none';
    if (ME.wanted > 0 && !ME.dead && !ADMIN.on && !INTERIOR.cur) {
      const slow = !ME.vehicle || Math.abs(ME.vehicle.speed) < 4; let near = false;
      if (slow) for (const p of PEDS) { if (p.kind !== 'police' || p.state === 'dead' || p.state === 'parked') continue; if (Math.abs(p.x - ME.x) < 2.3 && Math.abs(p.z - ME.z) < 2.3 && Math.abs(p.y - ME.y) < 2) { near = true; break; } }
      if (near) { this.arrestT += dt; if (this._w !== 1) { this._w = 1; toast('🚔 경찰에게 붙잡혔다! 뿌리쳐라!'); } if (this.arrestT > 1.8) this.arrest(); } else { this.arrestT = Math.max(0, this.arrestT - dt * 2); this._w = 0; }
    } else this.arrestT = 0;
  },
};
// ---- 이름표 / 배지: 방장이 서명으로 검증한 관리자(G.adminId)에게만 '👑관리자' 배지 ----
function isAdminId(id) { return !!id && (id === ME.id ? ADMIN.on && ADMIN.ready : G.adminId === id); }
function displayName(id, name) { return (isAdminId(id) ? '👑관리자 ' : '') + (name || ''); }
function refreshRemoteName(rp) {
  const adm = G.adminId === rp.id; const key = rp.name + '|' + !!rp.jail + '|' + adm; if (rp._nk === key) return; rp._nk = key;
  rp.char.setName((adm ? '👑관리자 ' : '') + (rp.name || '') + (rp.jail ? ' 🔒수감 중' : ''), adm ? '#ffd34a' : rp.jail ? '#ff9a6a' : (rp.baseCol || '#9fe0ff'));
}
if (ADMIN.enabled()) {
  const f = $('#admField'); if (f) f.style.display = '';
  // 로비: 확인 버튼(또는 Enter)으로 게임에 들어가기 전에 비밀번호를 미리 확인 (비번은 이 브라우저 밖으로 안 나감)
  const inp = $('#admIn'), btn = $('#admBtn');
  const check = async () => {
    const pw = inp.value; if (!pw) { ADMIN.lobbyMsg('err', '비밀번호를 입력하세요'); return; } if (ADMIN.busy) return;
    ADMIN.busy = true; btn.disabled = true; ADMIN.lobbyMsg('busy', '비밀번호 확인 중…');
    const sk = await ADMIN.check(pw); ADMIN.busy = false; btn.disabled = false; inp.value = '';
    if (sk) { ADMIN.sk = sk; ADMIN.pre = true; inp.placeholder = '✓ 확인됨'; ADMIN.lobbyMsg('ok', '✅ 비밀번호 확인 완료 — 게임에 들어가면 관리자 모드가 켜져요'); }
    else { ADMIN.sk = null; ADMIN.pre = false; ADMIN.lobbyMsg('err', '❌ 비밀번호가 틀렸어요'); try { sfx('error'); } catch (e) { } }
  };
  if (btn) btn.addEventListener('click', e => { e.preventDefault(); check(); });
  if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); check(); } });
}
