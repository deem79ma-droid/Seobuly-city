// @v 2026101421

// ================= 🎣 낚시 · 📸 사진 모드 · 💬 휴대폰 문자 =================

// ---------- 🎣 낚시 ----------
// 물가(바다·호수·강)에 서서 물을 바라보면 E → 찌를 던지고 기다리다 "❗ 입질!" 에 E → 물고기.
// 낚싯대는 그 자리에서 산다 (₩3,000 · 죽으면 다른 아이템처럼 잃는다). 잡은 물고기는 물가 어디서든 판다.
const FISH_SEA = [['고등어', 500, 30], ['전갱이', 450, 26], ['우럭', 1100, 16], ['광어', 1700, 11], ['도미', 2400, 8], ['문어', 3000, 5], ['참치', 9000, 2.5], ['🦈 상어', 18000, 0.6], ['👢 낡은 장화', 0, 6]];
const FISH_FRESH = [['붕어', 400, 30], ['피라미', 250, 24], ['잉어', 1000, 16], ['송어', 1400, 12], ['메기', 1800, 8], ['쏘가리', 3200, 4], ['✨ 황금 잉어', 12000, 0.8], ['👢 낡은 장화', 0, 6]];
const FISH = {
  on: false, phase: '', t: 0, rod: null, fresh: false,
  waterAhead() { // 바라보는 방향 2~6m 앞이 물이면 그 지점
    if (ME.vehicle || ME.swim || INTERIOR.cur || ME.jail || terrainH(ME.x, ME.z) < LAND - 0.6) return null;
    for (const d of [2.2, 3.5, 5, 6.5]) { const x = ME.x + Math.sin(ME.yaw) * d, z = ME.z + Math.cos(ME.yaw) * d; if (terrainH(x, z) < LAND - 1.2) return { x, z }; }
    return null;
  },
  isFresh(x, z) { return regionAt(x, z) === 'disanbay' || Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 40; },
  interact(cand) {
    if (this.on) return; const w = this.waterAhead(); if (!w) return;
    const n = ME.inv.fish | 0;
    cand(2.4, { label: ME.inv.rod ? `🎣 낚시하기${n ? ` · 물고기 ${n}마리` : ''}` : '🎣 낚시 (낚싯대 필요)', key: 'E', fn: () => this.menu(w) });
  },
  menu(w) {
    const n = ME.inv.fish | 0, v = ME.inv.fishV | 0;
    UI.openMenu('🎣 낚시터', `${this.isFresh(w.x, w.z) ? '민물 (붕어·잉어·송어…)' : '바다 (고등어·광어·참치…)'} · 잡은 물고기 <b>${n}</b>마리 (${fmtMoney(v)})`, [
      { ic: '🎣', t: '찌 던지기', p: '', dis: !ME.inv.rod, disMsg: '낚싯대가 없다', d: '기다리다가 ❗ 입질 오면 바로 E', fn: () => setTimeout(() => this.start(w), 30) },
      { ic: '🛒', t: '낚싯대 사기', p: 3000, dis: !!ME.inv.rod, disMsg: '이미 있다', d: '죽으면 잃는다', fn: () => { if (!CARD.pay(3000)) { toast('💸 돈이 모자라다'); sfx('error'); return; } ME.inv.rod = 1; toast('🎣 낚싯대를 샀다'); sfx('cash'); UI.updateInv(); saveGame(); } },
      { ic: '🐟', t: '잡은 물고기 팔기', p: '', d: n ? `${n}마리 → ${fmtMoney(v)}` : '팔 물고기가 없다', dis: !n, disMsg: '물고기가 없다', fn: () => { ME.money += v; ME.inv.fish = 0; ME.inv.fishV = 0; toast(`🐟 물고기 ${n}마리 판매 +${fmtMoney(v)}`); sfx('cash'); UI.updateInv(); saveGame(); } },
    ]);
  },
  start(w) {
    if (this.on || !ME.inv.rod) return; this.on = true; this.phase = 'wait'; this.t = rnd(3, 9); this.w = w; this.fresh = this.isFresh(w.x, w.z); this.px = ME.x; this.pz = ME.z; ME.dance = -1;
    if (!this.rod) { const g = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.014, 1.7, 6), cmat('#3a2a1a', 0.6)); pole.position.y = 0.85; g.add(pole); const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.03, 10), cmat('#c8ccd2', 0.3, 0.7)); reel.rotation.z = Math.PI / 2; reel.position.set(0.03, 0.25, 0); g.add(reel); g.rotation.x = 1.0; this.rod = g; }
    ME.char.P.handR.add(this.rod); this.rod.visible = true;
    if (!this.bob) { this.bob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), cmat('#ff3030', 0.4)); scene.add(this.bob); }
    this.bob.visible = true; this.bob.position.set(w.x, Math.max(0, terrainH(w.x, w.z)) + 0.02, w.z); this.bobY = this.bob.position.y;
    sfx('splash', w.x, w.z, 0.5); toast('🎣 찌를 던졌다… 움직이면 멈춘다', 2200);
  },
  stop(msg) { this.on = false; this.phase = ''; if (this.rod) { this.rod.visible = false; this.rod.parent && this.rod.parent.remove(this.rod); } if (this.bob) this.bob.visible = false; if (msg) toast(msg); },
  catchFish() {
    const L = this.fresh ? FISH_FRESH : FISH_SEA; let tot = 0; for (const f of L) tot += f[2]; let r = Math.random() * tot, F = L[0]; for (const f of L) { r -= f[2]; if (r <= 0) { F = f; break; } }
    const [name, base] = F; if (!base) { toast(`${name}… 꽝이다`); sfx('error'); return; }
    const kg = +(rnd(0.5, 1.6) * (base > 8000 ? 6 : base > 2000 ? 2.5 : 1)).toFixed(1), val = Math.round(base * rnd(0.8, 1.3) / 100) * 100;
    ME.inv.fish = (ME.inv.fish | 0) + 1; ME.inv.fishV = (ME.inv.fishV | 0) + val; UI.updateInv();
    if (base >= 9000) { announce(`🎣 ${name}!!`, `${kg}kg · ${fmtMoney(val)} — 대박`); NET.send({ t: 'chat', sys: 1, m: `🎣 ${ME.name}님이 ${name}(${kg}kg)를 낚았다!` }); }
    else { toast(`🐟 ${name} ${kg}kg (${fmtMoney(val)}) · 총 ${ME.inv.fish}마리`, 2600); sfx('coin'); }
    FX.emoji('🐟', ME.x, ME.y + 2, ME.z, 0.5);
  },
  tick(dt) {
    if (!this.on) return;
    if (ME.dead || ME.vehicle || INTERIOR.cur || Math.hypot(ME.x - this.px, ME.z - this.pz) > 0.6 || !ME.inv.rod) { this.stop(ME.dead ? '' : '🎣 낚시를 멈췄다'); return; }
    ME.yaw = Math.atan2(this.w.x - ME.x, this.w.z - ME.z); this.t -= dt;
    if (this.bob) this.bob.position.y = this.bobY + Math.sin(G.t * 3) * 0.015 - (this.phase === 'bite' ? 0.06 + Math.sin(G.t * 30) * 0.03 : 0);
    if (this.phase === 'wait' && this.t <= 0) { this.phase = 'bite'; this.t = 1.15; sfx('splash', this.w.x, this.w.z, 0.7); FX.emoji('❗', ME.x, ME.y + 2.1, ME.z, 0.5); }
    else if (this.phase === 'bite' && this.t <= 0) { this.phase = 'wait'; this.t = rnd(3, 8); toast('💨 놓쳤다… 다시 기다리자', 1600); }
  },
  pull() { if (this.phase === 'bite') { this.catchFish(); this.phase = 'wait'; this.t = rnd(4, 10); } else { this.stop('🎣 낚싯대를 거뒀다'); } },
  current() { return this.on ? { label: this.phase === 'bite' ? '❗ 입질! 당겨! (E)' : '🎣 기다리는 중… (E: 그만)', key: 'E', fn: () => this.pull() } : null; },
};

// ---------- 📸 사진 모드 ----------
// K 또는 휴대폰 → 화면의 글자·버튼이 사라지고 카메라만 자유롭게 (내 캐릭터 40m 안). 촬영하면 PNG로 저장.
const PHOTO = {
  on: false, pos: new THREE.Vector3(), fov: 55,
  toggle() { this.on ? this.exit() : this.enter(); },
  enter() {
    if (this.on || !G.started || ME.dead) return; this.on = true; UI.closeMenu && UI.closeMenu(); this.pos.copy(camera.position); this.fov = camera.fov;
    document.body.classList.add('photoMode'); this.ui(true); toast('📸 사진 모드 — ' + (IS_TOUCH ? '조이스틱 이동 · 화면 드래그 시점 · 📸 촬영' : 'WASD 이동 · 마우스 시점 · Space/C 위아래 · 휠 줌 · Enter 촬영 · K/Esc 나가기'), 4000);
  },
  exit() { if (!this.on) return; this.on = false; document.body.classList.remove('photoMode'); this.ui(false); camera.fov = CAM.fov; camera.updateProjectionMatrix(); },
  ui(show) {
    let el = $('#photoUI');
    if (!el) {
      el = document.createElement('div'); el.id = 'photoUI';
      el.innerHTML = '<button type="button" data-a="shot">📸</button><button type="button" data-a="up">▲</button><button type="button" data-a="dn">▼</button><button type="button" data-a="in">＋</button><button type="button" data-a="out">－</button><button type="button" data-a="x">✕</button>';
      const hold = (b, on) => { b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); on(true); }, { passive: false }); b.addEventListener('touchend', e => { e.preventDefault(); on(false); }, { passive: false }); b.addEventListener('mousedown', () => on(true)); b.addEventListener('mouseup', () => on(false)); };
      for (const b of el.querySelectorAll('button')) { const a = b.dataset.a; hold(b, d => { if (a === 'up') this.vy = d ? 1 : 0; else if (a === 'dn') this.vy = d ? -1 : 0; else if (a === 'in') this.zv = d ? -1 : 0; else if (a === 'out') this.zv = d ? 1 : 0; else if (d && a === 'shot') this.shot(); else if (d && a === 'x') this.exit(); }); }
      document.body.appendChild(el);
    }
    el.style.display = show ? '' : 'none';
  },
  key(k, down) { // 사진 모드일 때 키 입력을 가로챈다
    if (!down) { if (k === ' ' || k === 'c') this.vy = 0; return true; }
    if (k === 'k' || k === 'escape') this.exit(); else if (k === 'enter' || k === 'f12') this.shot(); else if (k === ' ') this.vy = 1; else if (k === 'c') this.vy = -1;
    return true;
  },
  wheel(dy) { this.fov = clamp(this.fov * (dy > 0 ? 1.08 : 1 / 1.08), 12, 100); },
  update(dt) { // updateCamera 대신
    const cp = Math.cos(CAM.pitch), sp = Math.sin(CAM.pitch); const fx = Math.sin(CAM.yaw) * cp, fy = -sp, fz = Math.cos(CAM.yaw) * cp, rx = -Math.cos(CAM.yaw), rz = Math.sin(CAM.yaw);
    let mx = 0, mz = 0; if (KEYS['w'] || KEYS['arrowup']) mz += 1; if (KEYS['s'] || KEYS['arrowdown']) mz -= 1; if (KEYS['a'] || KEYS['arrowleft']) mx -= 1; if (KEYS['d'] || KEYS['arrowright']) mx += 1;
    if (INP.joyMag > 0.05) { mx = INP.mx; mz = INP.mz; }
    const v = (KEYS['shift'] ? 14 : 5) * dt; this.pos.x += (fx * mz + rx * mx) * v; this.pos.y += (fy * mz) * v + (this.vy || 0) * v; this.pos.z += (fz * mz + rz * mx) * v;
    if (this.zv) this.fov = clamp(this.fov * (1 + this.zv * dt * 0.8), 12, 100);
    const dx = this.pos.x - ME.x, dz = this.pos.z - ME.z, d = Math.hypot(dx, dz); if (d > 40) { this.pos.x = ME.x + dx / d * 40; this.pos.z = ME.z + dz / d * 40; } // 내 캐릭터 40m 안
    this.pos.y = clamp(this.pos.y, groundHeight(this.pos.x, this.pos.z, this.pos.y) + 0.25, ME.y + 30);
    camera.position.copy(this.pos); camera.lookAt(this.pos.x + fx, this.pos.y + fy, this.pos.z + fz);
    if (Math.abs(camera.fov - this.fov) > 0.05) { camera.fov = this.fov; camera.updateProjectionMatrix(); }
    if (ME.char) ME.char.root.visible = true;
  },
  shot() {
    try {
      if (typeof composer !== 'undefined' && composer) composer.render(); else renderer.render(scene, camera);
      const url = renderer.domElement.toDataURL('image/png'); const a = document.createElement('a'); const d = new Date();
      a.download = `서불리시티_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}.png`;
      a.href = url; document.body.appendChild(a); a.click(); a.remove();
      const fl = document.createElement('div'); fl.className = 'photoFlash'; document.body.appendChild(fl); setTimeout(() => fl.remove(), 400); sfx('ui');
    } catch (e) { toast('📸 저장 실패 — 브라우저가 막았다'); }
  },
};

// ---------- 💬 휴대폰 문자 ----------
// 같은 방에 있는 사람에게 휴대폰으로 문자를 보낸다 (방장을 거쳐 그 사람에게만 간다).
const SMS = {
  box: [], unread: 0,
  load() { try { this.box = JSON.parse(localStorage.getItem('sbc3d_sms') || '[]').slice(-40); } catch (e) { this.box = []; } },
  keep() { try { localStorage.setItem('sbc3d_sms', JSON.stringify(this.box.slice(-40))); } catch (e) { } },
  phoneItem() { return { ic: '💬', t: '문자', p: 0, d: this.unread ? `새 문자 ${this.unread}개` : G.players.size ? `접속 중 ${G.players.size}명에게 보내기` : '받은 문자함', fn: () => setTimeout(() => this.open(), 30) }; },
  open() {
    this.unread = 0; const L = [...G.players.values()].filter(rp => rp.name);
    const recent = this.box.slice(-6).reverse().map(m => { const b = document.createElement('div'); b.textContent = `${m.me ? '➡️ ' + m.n : '⬅️ ' + m.n}: ${m.m}`; return b.outerHTML; }).join('') || '<small style="opacity:.7">문자가 없다</small>';
    UI.openMenu('💬 문자', `<div style="text-align:left;max-height:140px;overflow:auto;font-size:12.5px;line-height:1.5">${recent}</div>`,
      L.length ? L.map(rp => ({ ic: '👤', t: rp.name, p: '', d: '문자 보내기', fn: () => setTimeout(() => this.write(rp), 30) })) : [{ ic: '😶', t: '같은 방에 다른 사람이 없다', p: '', dis: true, disMsg: '친구를 초대해 봐' }]);
  },
  write(rp) {
    let el = $('#smsBox'); if (el) el.remove();
    el = document.createElement('div'); el.id = 'smsBox'; el.className = 'panel';
    const h = document.createElement('div'); h.textContent = `💬 ${rp.name}에게`; h.style.fontWeight = '700';
    const inp = document.createElement('input'); inp.className = 'inp'; inp.maxLength = 100; inp.placeholder = '메시지 (100자)';
    const row = document.createElement('div'); row.className = 'row'; row.style.gap = '8px';
    const send = document.createElement('button'); send.className = 'btn'; send.type = 'button'; send.textContent = '보내기'; const x = document.createElement('button'); x.className = 'btn b3'; x.type = 'button'; x.textContent = '취소';
    const go = () => { const m = cleanText(inp.value, 100).trim(); if (!m) return; if (!G.players.has(rp.id)) { toast('그 사람이 나갔다'); el.remove(); return; } NET.send({ t: 'sms', to: rp.id, m }); this.box.push({ n: rp.name, m, me: 1 }); this.keep(); toast(`💬 ${rp.name}에게 보냈다`); sfx('ui'); el.remove(); };
    send.onclick = go; x.onclick = () => el.remove(); inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter' && !e.isComposing) go(); if (e.key === 'Escape') el.remove(); };
    row.append(send, x); el.append(h, inp, row); document.body.appendChild(el); setTimeout(() => inp.focus(), 30);
  },
  recv(m, f) {
    if (!NET.rate('sms' + (f || '?'), 5, 10)) return; const rp = G.players.get(f); if (!rp) return;
    const txt = cleanText(m.m, 100); if (!txt) return; this.box.push({ n: rp.name, m: txt }); this.keep(); this.unread++;
    toast(`💬 ${rp.name}: ${txt}`, 5000); sfx('coin');
  },
};
SMS.load();

// ---------- 🎵 배경음악 ----------
// 메뉴(로비) = music/midnight_perimeter_1.mp3 · 평소 = music/afternoon_in_amber.mp3 · 긴박한 상황(수배 ★2 이상 · 경찰 추격 · 총격전 · 야생동물 공격 · 갱단 습격) = music/locked_in_steel.mp3
// 브라우저는 사용자가 한 번 누르기 전엔 소리를 못 낸다 → 첫 클릭/터치/키에서 시작. 휴대폰 설정에서 끄고 켤 수 있다.
const BGM = {
  on: true, menu: null, calm: null, tense: null, tv: 0, calmT: 0, unlocked: false,
  init() {
    try { this.on = localStorage.getItem('sbc3d_bgm') !== '0'; } catch (e) { }
    const mk = src => { const a = new Audio(src); a.loop = true; a.preload = 'auto'; a.volume = 0; return a; };
    this.menu = mk('music/midnight_perimeter_1.mp3'); this.calm = mk('music/afternoon_in_amber.mp3'); this.tense = mk('music/locked_in_steel.mp3');
    const un = () => { if (!this.unlocked) { this.unlocked = true; for (const t of [this.calm, this.tense]) t.play().then(() => { if (t.volume === 0) t.pause(); }).catch(() => { }); } this.tick(); }; /* iOS: 누를 때 한 번 재생해 둬야 나중에 소리가 난다 */ for (const ev of ['pointerdown', 'keydown', 'touchstart']) addEventListener(ev, un, { passive: true, capture: true });
    setInterval(() => this.tick(), 100);
  },
  set(v) { this.on = !!v; try { localStorage.setItem('sbc3d_bgm', this.on ? '1' : '0'); } catch (e) { } toast(this.on ? '🎵 배경음악 켜짐' : '🔇 배경음악 꺼짐'); this.tick(); },
  urgent() { // 긴박한 상황?
    if (!G.started || ME.dead || ME.jail) return false;
    if (ME.wanted >= 2) return true;
    if (ME.wanted >= 1 && PEDS.some(q => q.kind === 'police' && q.state === 'fight' && Math.hypot(q.x - ME.x, q.z - ME.z) < 80)) return true;
    if (ME.combatT > G.t && (PEDS.some(q => q.state === 'fight' && Math.hypot(q.x - ME.x, q.z - ME.z) < 40) || ME.hp < 60)) return true;
    if (ANIMALS.some(a => a.state === 'attack' && a.wild && Math.hypot(a.x - ME.x, a.z - ME.z) < 30)) return true;
    if (G.raid && Math.hypot(G.raid.x - ME.x, G.raid.z - ME.z) < 150) return true;
    return false;
  },
  fade(a, target, k) { if (!a) return; const v = a.volume + (target - a.volume) * k; a.volume = clamp(v < 0.004 && target === 0 ? 0 : v, 0, 1);
    if (target > 0 && a.paused && this.unlocked) a.play().catch(() => { }); if (target === 0 && a.volume === 0 && !a.paused) a.pause(); },
  tick() {
    if (!this.menu) return; const on = this.on && this.unlocked && !document.hidden;
    const inMenu = !G.started; let tense = false;
    if (!inMenu) { if (this.urgent()) { tense = true; this.calmT = 6; } else if ((this.calmT -= 0.1) > 0) tense = true; } // 끝나도 6초는 이어서
    this.fade(this.menu, on && inMenu ? 0.45 : 0, inMenu ? 0.08 : 0.15);
    if (tense && this.tense.paused && this.tense.volume === 0) try { this.tense.currentTime = 0; } catch (e) { }
    this.fade(this.tense, on && tense ? 0.5 : 0, tense ? 0.12 : 0.04);
    const club = typeof MUSIC !== 'undefined' && MUSIC.vol > 0.25; // 클럽 근처면 클럽 음악만
    this.fade(this.calm, on && !inMenu && !tense && !club && !ME.dead ? 0.32 : 0, 0.03);
    this.tenseOn = tense && on;
  },
  phoneItem() { return { ic: this.on ? '🎵' : '🔇', t: '배경음악', p: 0, d: this.on ? '켜짐 — 눌러서 끄기' : '꺼짐 — 눌러서 켜기', fn: () => this.set(!this.on) }; },
};
BGM.init();

// ---------- ⚖️ 생활 법규: 춤 거절 · 스토킹 · 동물 학대 · 총기 협박 · 불법 벌목 ----------
// 사람마다 성격이 다르다 (예민함 · 친절함은 그 사람 고유값). 신고는 그 사람이나 주변 목격자가 한다.
const LAWX = {
  asks: {}, sus: {}, thr: {}, cool: {}, warnT: 0,
  pers(p) { const h = hashStr('pers' + (p.seed || p.id)); return { kind: (h % 1000) / 1000, sens: ((h >>> 10) % 1000) / 1000 }; }, // kind: 친절함 · sens: 예민함
  civ(p) { return p && p.char && (p.kind === 'civ' || p.kind === 'worker' || p.kind === 'medic') && p.state !== 'dead' && p.state !== 'parked' && p.state !== 'fight'; },
  // 목격자: 근처 시민·경찰 또는 다른 플레이어 (본인 제외)
  witness(x, z, r, exceptId) {
    for (const q of PEDS) { if (q.state === 'dead' || q.state === 'parked' || !(q.kind === 'civ' || q.kind === 'worker' || q.kind === 'medic' || q.kind === 'police')) continue; if (Math.abs(q.x - x) < r && Math.abs(q.z - z) < r && Math.hypot(q.x - x, q.z - z) < r) return q; }
    for (const [id, rp] of G.players) { if (id === exceptId || rp.dead) continue; if (Math.hypot(rp.x - x, rp.z - z) < r) return rp; }
    if (exceptId !== ME.id && !ME.dead && Math.hypot(ME.x - x, ME.z - z) < r) return ME;
    return null;
  },
  report(p, crime, stars, line) { if (p && p.char && line) p.char.say(line, 3.5); if (p && p.id !== undefined && PEDS[p.id] === p) pedAction(p, 'flee'); JOBS.crime(crime); addWanted(stars); },
  // 💃 같이 춤추자 → 거절할 수도 있다 · 계속 조르면 도망치고 스토킹으로 의심
  askDance(p, d) {
    const r = this.asks[p.id] && G.t - this.asks[p.id].t < 120 ? this.asks[p.id] : (this.asks[p.id] = { n: 0, t: 0 });
    const P = this.pers(p); let ok = 0.2 + P.kind * 0.6 - r.n * 0.35; if (ME.wanted > 0 || JOBS.criminal()) ok -= 0.25; if (p.state === 'club') ok += 0.25;
    if (Math.random() < ok) { ME.dance = d; pedAction(p, 'dance', d); if (p.char) p.char.say(pick(['좋아요!', '오 춤 좀 추시네요?', '한 곡만이요~', '그래요!']), 2.5); this.asks[p.id] = { n: 0, t: G.t }; return; }
    r.n++; r.t = G.t;
    if (r.n >= 3) { if (p.char) p.char.say('그만 좀 하세요!! 무서워요…', 3); pedAction(p, 'flee'); this.sus[p.id] = (this.sus[p.id] || 0) + 10; toast('😨 계속 조르자 도망쳤다 — 더 따라가면 스토킹으로 신고당한다', 3500); return; }
    if (p.char) p.char.say(r.n === 2 ? pick(['싫다고 했잖아요', '자꾸 이러시면 곤란해요', '저 바빠요…']) : pick(['괜찮아요, 사양할게요', '지금은 좀…', '다음에요', '전 춤 안 춰요']), 2.8);
  },
  tick(dt) {
    if (!G.started || ME.dead || ME.jail || ADMIN.on) return;
    const W = WEAPONS[ME.weapon] || {}; const gun = ME.aiming && !W.melee && ME.weapon !== 'fist' && !ME.vehicle && !INTERIOR.cur;
    const fx = Math.sin(CAM.yaw), fz = Math.cos(CAM.yaw);
    for (const p of PEDS) {
      if (!this.civ(p) && !(gun && p.kind === 'police' && p.state !== 'dead' && p.state !== 'parked')) continue;
      const dx = p.x - ME.x, dz = p.z - ME.z, d = Math.hypot(dx, dz); if (d > 40) { if (this.sus[p.id]) this.sus[p.id] = Math.max(0, this.sus[p.id] - dt * 2); continue; }
      if ((this.cool[p.id] || 0) > G.t) continue;
      // 🔫 총으로 겨누기 = 협박 (1초 넘게 겨누면 신고)
      if (gun && d < 25 && d > 0.5 && (dx * fx + dz * fz) / d > 0.985) {
        if ((this.thr[p.id] = (this.thr[p.id] || 0) + dt) > 1.0) { this.thr[p.id] = 0; this.cool[p.id] = G.t + 30; const again = G.t < (this.gThr || 0); this.gThr = G.t + 8; /* 한 번 겨눈 걸로 여러 번 처벌하지 않는다 */ if (p.kind === 'police') { if (!again) { JOBS.crime('threat'); addWanted(2); } if (p.char) p.char.say('총 내려놔!!', 2.5); } else if (again) { if (p.char) p.char.say('꺄악!!', 2); pedAction(p, 'flee'); } else this.report(p, 'threat', 1, pick(['살려주세요!!', '총이다!! 신고해!!', '쏘지 마세요!!'])); continue; }
      } else if (this.thr[p.id]) this.thr[p.id] = Math.max(0, this.thr[p.id] - dt);
      if (p.kind === 'police') continue;
      // 👣 스토킹: 움직이는 사람을 가까이서 계속 따라가거나, 멈춘 사람 곁에 오래 붙어 있으면 의심 → 그 사람마다 참는 시간이 다르다
      const P = this.pers(p), lim = 14 + (1 - P.sens) * 34; let s = this.sus[p.id] || 0;
      if (!ME.vehicle && !INTERIOR.cur && d < 12 && d > 0.8 && p.spd > 0.5 && ME.spd > 0.5) s += dt * (d < 5 ? 1.6 : 1);
      else if (!ME.vehicle && d < 3.5 && p.spd < 0.3 && p.state !== 'dance' && p.state !== 'talk' && p.state !== 'club') s += dt * 0.5;
      else s = Math.max(0, s - dt * 0.7);
      if (s > lim * 0.55 && !p._glance) { p._glance = 1; if (p.char) p.char.say(pick(['…?', '뭐지 저 사람…', '왜 자꾸 따라오지?']), 2.5); FX.emoji('😟', p.x, p.y + 2.1, p.z, 1); }
      if (s < lim * 0.3) p._glance = 0;
      if (s >= lim) { s = 0; p._glance = 0; this.cool[p.id] = G.t + 120; this.report(p, 'stalk', 1, pick(['왜 자꾸 따라와요?! 경찰 부를 거예요!', '스토커야!! 신고할게요!', '살려주세요, 누가 따라와요!'])); }
      this.sus[p.id] = s;
    }
  },
  // 🪓 벌목: 디산베이 숲(허가 구역)만 된다. 다른 곳에서 나무를 베다가 들키면 불법 벌목
  logOk(x, z) { return regionAt(x, z) === 'disanbay'; },
  chopWarn(t) { if (this.logOk(t.x, t.z) || G.t < this.warnT) return; this.warnT = G.t + 20; toast('⚠️ 벌목 금지 구역 — 디산베이 숲에서만 나무를 벨 수 있다. 들키면 신고당한다', 3500); },
  felled(t) { if (this.logOk(t.x, t.z) || ADMIN.on) return; const w = this.witness(ME.x, ME.z, 35, ME.id); if (!w) return; this.report(PEDS[w.id] === w ? w : null, 'logging', 1, '거기 나무 베면 안 돼요! 신고합니다!'); },
  // 🐾 동물을 죽이면 (사냥 가능한 야생동물 제외) 목격자가 신고 → 동물 학대 — 방장이 판단
  hostAnimalKilled(a, from) {
    if (!from || String(from).startsWith('n') || a.wild) return; const w = this.witness(a.x, a.z, 30, from); if (!w) return;
    if (PEDS[w.id] === w && w.char) w.char.say('동물을 죽이다니!! 신고할 거예요!', 3); notifyPlayer(from, { t: 'wanted', add: 1, c: 'animal' });
  },
};

// ---------- 🚗 운전 조작: 왼쪽 · 오른쪽 · 가속 · 브레이크(드리프트) + 내리기 ----------
// 차·오토바이·자전거를 직접 몰 때는 이것만 쓴다 (무기 등 다른 키는 막힘 · 경적 H · 지도 M · 폰 P는 된다).
// PC: W/↑ 가속 · A/D(←/→) 방향 · Space/S/↓ 브레이크 (달리는 중이면 드리프트, 멈췄을 때 누르고 있으면 후진) · E/F 내리기
const DRIVE = {
  on() { const v = ME.vehicle; return !!(v && ME.seat === 'd' && !v.taxiCab && (v.kind === 'car' || v.kind === 'bike')); },
  input(v) {
    const K = KEYS; const accV = K['w'] || K['arrowup'] ? 1 : INP.dAcc ? (INP.dAccV ?? 1) : 0, acc = accV > 0, L = !!(K['a'] || K['arrowleft'] || INP.dL), R = !!(K['d'] || K['arrowright'] || INP.dR), brk = !!(K[' '] || K['s'] || K['arrowdown'] || INP.dBrk);
    const inp = { pedal: true, throttle: accV, steer: (L ? 1 : 0) - (R ? 1 : 0), brake: false, hand: false, up: false, down: false };
    if (brk) { if (v.speed > 2.5) { inp.brake = true; inp.hand = v.speed > 6 && (L || R); inp.throttle = 0; } else if (v.speed < -2.5) inp.brake = true; else inp.throttle = -1; } // 멈췄을 때 브레이크를 누르고 있으면 천천히 후진
    return inp;
  },
  ui() {
    let el = $('#driveUI'); if (el) return el;
    el = document.createElement('div'); el.id = 'driveUI';
    el.innerHTML = '<button type="button" data-k="dL" class="dl">◀</button><button type="button" data-k="dR" class="dr">▶</button><button type="button" data-k="dBrk" class="db">브레이크<small>드리프트</small></button><button type="button" data-k="dAcc" class="da"><span class="pd"><i></i><i></i><i></i><i></i><i></i></span><small>액셀</small><b class="pv"></b></button><button type="button" data-k="out" class="dout">내리기</button><button type="button" data-k="horn" class="dhorn">경적</button><button type="button" data-k="phone" class="dph">폰</button><button type="button" data-k="map" class="dmap">지도</button>';
    for (const b of el.querySelectorAll('button')) {
      const k = b.dataset.k;
      // 🦶 액셀 페달: 위쪽을 누를수록 세게 밟는다 (아래 30% ~ 위 100%) · 누른 채 손가락을 위아래로 움직여 조절
      const pedal = e => { const t = e.targetTouches && e.targetTouches[0]; if (!t) return; const r = b.getBoundingClientRect(); const v = clamp(0.3 + 0.7 * (r.bottom - t.clientY) / r.height, 0.3, 1); INP.dAccV = v; b.style.setProperty('--p', v.toFixed(2)); };
      if (k === 'dAcc') b.addEventListener('touchmove', e => { e.preventDefault(); pedal(e); }, { passive: false });
      const on = e => { e.preventDefault(); e.stopPropagation(); AU.init && AU.init(); if (k === 'dAcc') pedal(e); if (k === 'out') { doInteract(); return; } if (k === 'horn') { sfx('horn', ME.x, ME.z); NET.send({ t: 'horn' }); b.classList.add('on'); return; } if (k === 'phone') { UI.openPhone(); return; } if (k === 'map') { UI.openMap(); return; } INP[k] = true; b.classList.add('on'); };
      const off = e => { e.preventDefault(); if (k.startsWith('d')) INP[k] = false; if (k === 'dAcc') { INP.dAccV = 0; b.style.setProperty('--p', 0); } b.classList.remove('on'); };
      b.addEventListener('touchstart', on, { passive: false }); b.addEventListener('touchend', off, { passive: false }); b.addEventListener('touchcancel', off);
    }
    document.body.appendChild(el); return el;
  },
  tick() {
    const on = this.on() && G.started; document.body.classList.toggle('driving', on);
    if (IS_TOUCH) { const el = this.ui(); el.style.display = on && !UI.menuOpen ? '' : 'none'; }
    if (!on) { INP.dAcc = INP.dL = INP.dR = INP.dBrk = false; INP.dAccV = 0; }
  },
};

// ---------- 🔊 목소리: 맞는 소리 · 죽는 소리 (남/여) · NPC 말소리 ----------
// 파일: music/male_hit.mp3 female_hit.mp3 male_death.mp3 female_death.mp3 villager_chatter.mp3
const VOICE = {
  FILES: ['male_hit', 'female_hit', 'male_death', 'female_death', 'villager_chatter'], buf: {}, loading: false, lastChat: 0,
  load() {
    if (this.loading || !AU.ctx) return; this.loading = true;
    for (const n of this.FILES) fetch('music/' + n + '.mp3').then(r => r.ok ? r.arrayBuffer() : Promise.reject()).then(a => AU.ctx.decodeAudioData(a)).then(b => { this.buf[n] = b; }).catch(() => {});
  },
  play(n, x, z, vol, range) {
    const b = this.buf[n], c = AU.ctx; if (!b || !c) { this.load(); return false; }
    const s = AU.spatial(x, z, range), v = s.v * vol; if (v < 0.02) return false;
    const src = c.createBufferSource(); src.buffer = b; const g = c.createGain(); g.gain.value = Math.min(1, v); src.connect(g); g.connect(AU.out(s.p)); src.start(); return true;
  },
  female(ch) { return !!(ch && ch.outfit && ch.outfit.body === 'f'); },
  // 맞았을 때 / 죽었을 때 (dead=true)
  pain(ch, x, z, dead) {
    if (!ch) return; const k = this.female(ch) ? 'female' : 'male'; const t = G.t;
    if (dead) { if (t < (ch._vd || 0)) return; ch._vd = t + 3; this.play(k + '_death', x, z, 1, 60); return; }
    if (t < (ch._vh || 0)) return; ch._vh = t + 0.7; this.play(k + '_hit', x, z, 0.9, 45);
  },
  // NPC가 말풍선으로 말할 때 (나에게 말을 걸 때 포함)
  chatter(ch) {
    if (!ch || !ch.root || !ch.root.visible) return; const t = G.t; if (t < this.lastChat || t < (ch._vc || 0)) return;
    const p = ch.root.position; if (Math.hypot(p.x - ME.x, p.z - ME.z) > 30) return;
    if (this.play('villager_chatter', p.x, p.z, 0.55, 30)) { this.lastChat = t + 1.5; ch._vc = t + 6; }
  },
};

// ---------- 💼 사망 가방: 죽으면 현금·무기·탄약·아이템·방탄복을 그 자리에 떨군다 ----------
// 누구든 (본인 포함) 먼저 주우면 가진다. 10분 지나면 사라진다. 산 옷은 떨구지 않고 잃는다.
const LOOT = {
  LIFE: 600, lastBy: {},
  take() {
    if (adminGod()) return null;
    const l = { m: Math.max(0, Math.floor(ME.money || 0)), w: [], a: {}, i: {}, ar: Math.round(ME.armor || 0) };
    for (const w in ME.weapons || {}) if (w !== 'fist' && ME.weapons[w] && WEAPONS[w]) l.w.push(w);
    for (const src of [ME.ammo || {}, ME.mag || {}]) for (const k in src) { const n = +src[k] | 0; if (n > 0) l.a[k] = (l.a[k] || 0) + n; }
    for (const k in ME.inv || {}) { const n = ME.inv[k] | 0; if (n > 0) l.i[k] = n; }
    return this.clean(l);
  },
  // 네트워크로 받은 가방은 모양·크기를 검사한다 (이상한 값이면 버림)
  clean(l) {
    if (!l || typeof l !== 'object') return null; const ok = k => typeof k === 'string' && /^[a-z0-9_]{1,20}$/i.test(k);
    const o = { m: Math.min(1e9, Math.max(0, Math.floor(+l.m || 0))), w: [], a: {}, i: {}, ar: Math.min(100, Math.max(0, Math.round(+l.ar || 0))) };
    if (Array.isArray(l.w)) for (const w of l.w.slice(0, 20)) if (ok(w) && WEAPONS[w] && w !== 'fist' && !o.w.includes(w)) o.w.push(w);
    for (const [src, dst, max] of [[l.a, o.a, 9999], [l.i, o.i, 999]]) if (src && typeof src === 'object') for (const k of Object.keys(src).slice(0, 30)) { const n = Math.min(max, Math.floor(+src[k] || 0)); if (ok(k) && n > 0) dst[k] = n; }
    return o.m || o.w.length || o.ar || Object.keys(o.a).length || Object.keys(o.i).length ? o : null;
  },
  drop(x, z, l) { if (G.isHost) spawnPickup(x, z, 0, null, l); else NET.send({ t: 'dropLoot', x, z, l }); },
  apply(l) {
    const got = [];
    if (l.m) { ME.money += l.m; got.push(fmtMoney(l.m)); }
    for (const w of l.w) { ME.weapons[w] = 1; got.push(WEAPONS[w].name); }
    for (const k in l.a) ME.ammo[k] = (ME.ammo[k] || 0) + l.a[k];
    for (const k in l.i) { ME.inv[k] = (ME.inv[k] || 0) + l.i[k]; got.push(`${(INV_NAME[k] || k)} ×${l.i[k]}`); }
    if (l.ar) { ME.armor = Math.max(ME.armor || 0, l.ar); got.push('방탄복'); }
    sfx('cash'); toast('💼 가방을 주웠다 — ' + (got.join(' · ') || '탄약'), 4000);
    UI.buildHotbar && UI.buildHotbar(); UI.updateWeapon && UI.updateWeapon(); UI.updateInv && UI.updateInv(); saveGame();
  },
  // 방장: 오래된 가방 치우기
  tick() {
    if (!G.isHost || (this._t = (this._t || 0) + 1) % 60) return;
    for (const [id, p] of PICKUPS) if (p.loot && G.t - p.t > this.LIFE) { removePickup(id); NET.send({ t: 'pickRm', id }); }
  },
};

// ---------- 🫧 숨 (물속) · 수영장 물 움직임 ----------
// 물에 빠지면(바다·호수·수영장) 공기방울이 점점 줄어든다 (약 20초). 다 떨어지면 그 자리에서 익사. 물 밖으로 나오면 다시 찬다.
WILD_DEATH.drown = '물에 빠져 숨이 막혔다';
const BREATH = {
  MAX: 100, SEC: 20, shown: -1,
  tick(dt) {
    POOL_U.uT.value = G.t; POOL_U.uLight.value = 1 - 0.68 * (ENV.night || 0); POOL_U.uSun.value.copy(ENV.sunDir);
    if (!G.started) return;
    if (ME.dead) ME.breath = this.MAX;
    else if (ME.swim && !ME.vehicle && !(ME.god || ADMIN.on)) {
      ME.breath = (ME.breath ?? this.MAX) - dt * this.MAX / this.SEC;
      if (ME.breath <= 0) { ME.breath = 0; ME.lastW = 'drown'; ME.hp = 0; ME.die('drown'); toast('🫧 숨을 못 쉬어 익사했다', 4000); } // 즉시 사망 (조끼·체력 무시)
    } else ME.breath = Math.min(this.MAX, (ME.breath ?? this.MAX) + dt * 40);
    // 화면: '숨참기' 게이지가 점점 차오른다 → 끝까지 차면 익사
    const fill = Math.round(100 - (ME.breath ?? this.MAX)), show = fill > 0 && !ME.dead && !!ME.swim && !ME.vehicle; // 물속에 있을 때만 보인다 (나오면 바로 사라지고 숨은 따로 찬다)
    let el = $('#breath'); if (!el) { el = document.createElement('div'); el.id = 'breath'; el.innerHTML = '<div class="bt">숨참기</div><div class="bb"><div class="bf"></div></div>'; document.body.appendChild(el); }
    const key = show ? fill : -1; if (key === this.shown) return; this.shown = key;
    el.style.display = show ? '' : 'none'; if (show) { el.querySelector('.bf').style.width = fill + '%'; el.classList.toggle('low', fill >= 70); }
  },
};
