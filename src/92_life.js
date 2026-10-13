// @v 2026101221

// ================= 생활: NPC 강도 반응 · 집에서 잠자기 =================

// ---- NPC 돈 뺏기: 방장이 반응을 정한다 (돈 없음 / 순순히 줌 / 도망치며 신고 / 반격 / 총) ----
function hostRob(p, from) {
  if (!p || p.state === 'dead' || p.state === 'parked' || !from) return;
  const tg = { kind: from === ME.id ? 'me' : 'player', id: from }; const fp = targetPos(tg);
  const broke = (p.robbedAt && G.t - p.robbedAt < 300) || hashStr('cash' + p.seed) % 100 < 22; // 이미 털렸거나 원래 빈털터리
  const x = Math.random(); let r, amt = 0;
  if (broke) r = x < 0.25 ? 'fight' : 'broke';
  else if (x < 0.16) r = 'fight';
  else if (x < 0.25) r = 'gun';
  else if (x < 0.6) r = 'report';
  else r = 'pay';
  if (r === 'pay' || r === 'report') { amt = Math.floor(rnd(20, 220) * ECON.crimeMul()); p.robbedAt = G.t; }
  NPCMEM.witness(p.x, p.z, from, 3, p); // 피해자·목격자가 기억한다
  if (r === 'fight' || r === 'gun') {
    p.weapon = r === 'gun' ? 'pistol' : 'fist'; p.target = tg; p.state = 'fight'; if (p.char) p.char.setWeapon(p.weapon);
    const id = p.id; setTimeout(() => { const q = PEDS[id]; if (q && q.state === 'fight' && q.target && q.target.id === from && q.kind === 'civ') { q.state = 'flee'; q.timer = 8; q.weapon = 'fist'; if (q.char) q.char.setWeapon('fist'); } }, 25000);
  } else {
    p.state = 'flee'; p.timer = r === 'report' ? 16 : 11; if (fp) { p.fx = fp.x; p.fz = fp.z; }
    if (r === 'report') setTimeout(() => { const q = PEDS[p.id]; if (q && q.state !== 'dead') notifyPlayer(from, { t: 'wanted', add: 1 }); }, 3500); // 도망치면서 112 신고
  }
  notifyPlayer(from, { t: 'robRes', id: p.id, r, amt });
}
// 강도(나)에게 온 결과
function onRobResult(m) {
  const p = PEDS[m.id]; const say = (s, d = 3) => { if (p && p.char && p.state !== 'dead') p.char.say(s, d); };
  const again = (lines, n) => { for (let i = 1; i <= n; i++) setTimeout(() => say(pick(lines), 2.2), i * 1800); };
  if (m.r === 'broke') { const L = ['살려주세요!! 돈 없어요!!', '제발요… 진짜 한 푼도 없어요!', '살려주세요!!', '때리지 마세요!!']; say(pick(L)); again(L, 3); toast('😰 돈이 한 푼도 없다…'); }
  else if (m.r === 'pay') { const a = m.amt * JOBS.robMul(); ME.money += a; sfx('cash'); say('가, 가져가세요! 살려주세요!'); toast(`💵 뺏은 돈 ${fmtMoney(a)}`); if (Math.random() < 0.3) addWanted(1); }
  else if (m.r === 'report') { const a = m.amt * JOBS.robMul(); ME.money += a; sfx('cash'); const L = ['경찰 아저씨!! 강도예요!!', '여보세요 112죠?! 강도가…!', '도와주세요!! 강도야!!']; say(pick(L)); again(L, 2); toast(`💵 ${fmtMoney(a)} — 📞 도망치면서 신고하고 있다!`, 3200); }
  else if (m.r === 'fight') { say(pick(['이게 미쳤나?!', '한번 해보자 이거야!', '어디서 감히!'])); toast('👊 상대가 반격한다!'); }
  else if (m.r === 'gun') { say(pick(['총 맞고 싶냐?!', '꺼져, 쏜다!'])); toast('🔫 상대가 총을 꺼냈다!'); sfx('error'); }
}

// ---- 잠자기: 침대 → 기상 시간 예약 → 눕기 → 그 시간에 자동 기상 (중간에 일어나면 그때 시각) ----
const SLEEP = {
  on: null, fast: false, base: 1, hud: null, FAST: 40,
  fmt(h) { h = ((h % 24) + 24) % 24; const hh = Math.floor(h), mm = Math.floor((h - hh) * 60); return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; },
  open(bed) {
    if (ME.vehicle || ME.dead || ME.jail) return;
    const opts = [5, 6, 7, 8, 9, 10, 12].map(h => ({ ic: h < 7 ? '🌅' : h < 11 ? '☀️' : '🌞', t: `${this.fmt(h)}에 일어나기`, p: '', d: `${(((h - G.time) % 24 + 24) % 24).toFixed(1)}시간 뒤`, fn: () => this.start(bed, h) }));
    opts.push({ ic: '⏱️', t: '1시간만 자기', p: '', d: `${this.fmt(G.time + 1)} 기상`, fn: () => this.start(bed, (G.time + 1) % 24) });
    UI.openMenu('🛏️ 잠자기', `지금 <b>${this.fmt(G.time)}</b> · 몇 시에 일어날까?<br><small style="opacity:.75">${G.online && G.players.size ? '모두 자고 있으면 시간이 빨리 흐르고, 깨어 있는 사람이 있으면 그대로 흘러요' : '자는 동안 시간이 빨리 흘러요'} · E 또는 움직이면 중간에 일어남</small>`, opts);
  },
  start(bed, wake) {
    if (ME.vehicle || ME.dead || ME.jail) return;
    const need = ((wake - G.time) % 24 + 24) % 24 || 24;
    this.on = { bed, wake, need, done: 0, last: G.time, hp: ME.hp, back: { x: ME.x, y: ME.y, z: ME.z } };
    ME.sleep = true; ME.dance = -1; ME.sitBench = null; if (JOBS.stall) JOBS.closeStall(true);
    if (!this.hud) { const h = document.createElement('div'); h.id = 'sleepHud'; h.style.cssText = 'position:fixed;inset:0;z-index:15;pointer-events:none;background:radial-gradient(ellipse at center,rgba(5,8,20,.35),rgba(2,3,10,.88));display:flex;align-items:flex-end;justify-content:center;padding-bottom:16vh;transition:opacity .6s;opacity:0'; h.innerHTML = '<div class="panel" style="padding:12px 18px;border-radius:14px;text-align:center;font-size:15px;line-height:1.6"></div>'; document.body.appendChild(h); this.hud = h; }
    this.hud.style.display = 'flex'; requestAnimationFrame(() => { if (this.hud) this.hud.style.opacity = 1; });
    toast(`😴 잠자리에 들었다 — ${this.fmt(wake)} 기상 예약`); sfx('ui'); CINE_EV.sleep();
  },
  wake(why) {
    const s = this.on; if (!s) return; this.on = null; ME.sleep = false; CINE_EV.wake(why === 'alarm');
    ME.x = s.back.x; ME.z = s.back.z; ME.y = s.back.y + 0.05; ME.vx = ME.vz = ME.vy = 0; ME.fallTop = null;
    if (this.hud) { this.hud.style.opacity = 0; setTimeout(() => { if (!this.on && this.hud) this.hud.style.display = 'none'; }, 650); }
    if (why === 'alarm' && (!G.online || G.isHost) && (G.timeScale || 1) > 2) G.time = s.wake; // 빨리 감기로 지나친 만큼 맞춘다
    if (why === 'alarm') { announce('⏰ ' + this.fmt(G.time), '상쾌하게 일어났다'); sfx('levelup'); ME.hp = 100; ME.stamina = 100; ME.drunk = 0; }
    else if (why === 'hit') toast('😵 공격받아서 깼다!', 3000);
    else toast(`😪 ${this.fmt(G.time)}에 깼다 (예약 ${this.fmt(s.wake)})`, 3000);
    this.syncSpeed();
  },
  interact() { const s = this.on; return { label: `☀️ 일어나기 (예약 ${this.fmt(s.wake)})`, key: 'E', fn: () => this.wake('early') }; },
  // 모두 자고 있으면 시간 빨리 감기 (방장/혼자만 결정, 게스트는 방장 값을 받음)
  allAsleep() { if (!ME.sleep) return false; for (const rp of G.players.values()) if (rp.st !== 'sleep') return false; return true; },
  syncSpeed() {
    if (G.online && !G.isHost) return;
    const want = this.allAsleep();
    if (want && !this.fast) { this.fast = true; this.base = G.timeScale || 1; G.timeScale = this.FAST; }
    else if (!want && this.fast) { this.fast = false; G.timeScale = this.base || 1; }
  },
  tick(dt) {
    if (this._sT === undefined) this._sT = 0; if ((this._sT -= dt) <= 0) { this._sT = 0.5; this.syncSpeed(); }
    const s = this.on; if (!s) return;
    if (ME.dead || ME.jail || ME.vehicle || !INTERIOR.cur) { this.wake('early'); return; }
    if (ME.hp < s.hp - 0.5) { this.wake('hit'); return; }
    // 침대 위에 눕힌다 (머리는 베개 쪽)
    const b = s.bed; ME.x = b.x; ME.z = b.z; ME.y = b.y; ME.vx = ME.vz = ME.vy = 0; ME.fallTop = null; ME.yaw = b.yaw; ME.grounded = true;
    if (ME.char) { ME.char.root.position.set(b.x, b.y, b.z); ME.char.root.rotation.set(0, b.yaw, 0); }
    ME.hp = Math.min(100, ME.hp + dt * 4); s.hp = ME.hp; ME.stamina = 100;
    s.done += ((G.time - s.last) % 24 + 24) % 24; s.last = G.time;
    if (s.done >= s.need - 0.01) { this.wake('alarm'); return; }
    if (this.hud) { const left = Math.max(0, s.need - s.done); const fast = (G.timeScale || 1) > 2; this.hud.firstChild.innerHTML = `💤 <b>잠자는 중…</b> 지금 ${this.fmt(G.time)} → 기상 <b style="color:#ffd34a">${this.fmt(s.wake)}</b> (${left.toFixed(1)}시간 남음)<br><small style="opacity:.8">${fast ? '⏩ 모두 자는 중 — 시간이 빨리 흐른다' : G.online && G.players.size ? '깨어 있는 사람이 있어서 시간이 그대로 흐른다 — 예약 시간에 자동 기상' : ''} · E 또는 움직이면 일어나기</small>`; }
  },
};
// 침대 위치 → 눕는 자리 (머리가 베개 쪽, 몸통이 침대 가운데)
function bedSpot(cx, cz, px, pz, y) { const dx = cx - px, dz = cz - pz, l = Math.hypot(dx, dz) || 1; return { x: cx + dx / l * 0.9, z: cz + dz / l * 0.9, y, yaw: Math.atan2(dx, dz) }; }
