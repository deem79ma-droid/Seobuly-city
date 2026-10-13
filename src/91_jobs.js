// @v 2026101221

// ================= 직업 · 범죄자 신분 · 군부대 =================
// 직업: 휴대폰(P) ▶ 💼 직업 에서 고른다. 경찰·군인·의사·부동산중개인은 범죄 기록이 없어야 한다.
// 범죄(차량 탈취 · 가택 침입 · 군부대 침입 · 살인)를 저지르면 형량만큼 '범죄자 신분'이 된다.
//   - 감옥에서는 1초에 1초씩, 밖에서는 5초에 1초씩 줄어든다 (자수하면 빨리 끝난다)
//   - 범죄자는 이름표에 🦹 표시, 경찰 NPC가 알아보면 수배, 합법 직업에서 해고
const CRIMES = {
  car: { name: '차량 탈취', s: 60 },
  home: { name: '가택 침입', s: 90 },
  army: { name: '군부대 침입', s: 240 },
  murder: { name: '살인', s: 120 },
  escape: { name: '탈옥', s: 60 },
};
const JOB_LIST = [
  { id: 'none', icon: '🙂', name: '무직', d: '자유롭게 생활' },
  { id: 'police', icon: '👮', name: '경찰', clean: 1, d: '근무 수당 · 순찰 · 수배자 체포(E) · 갱단원 제압 수당', u: { top: 'police', topColor: '#22305a', bottom: 'slacks', bottomColor: '#1a2240', hat: 'police', hatColor: '#1a2240', shoes: '#111111' } },
  { id: 'soldier', icon: '🪖', name: '군인', clean: 1, d: '근무 수당 · 군부대 경계 근무 · 부대 출입 허가', u: { top: 'jacket', topColor: '#4a5a32', bottom: 'cargo', bottomColor: '#3e4a2a', hat: 'helmet', hatColor: '#4a5a32', shoes: '#1a1a12' } },
  { id: 'doctor', icon: '🩺', name: '의사', clean: 1, d: '근무 수당 · 🤕 환자 치료 · 다친 플레이어 치료(E)', u: { top: 'doctor', topColor: '#ffffff', bottom: 'slacks', bottomColor: '#4a6a8a', hat: 'none' } },
  { id: 'realtor', icon: '🏠', name: '부동산중개인', clean: 1, d: '빈 땅(🪧)을 찾아가 매물 감정 · 먼 매물일수록 수수료 ↑', u: { top: 'suit', topColor: '#2a2a4a', bottom: 'slacks', bottomColor: '#22223a', shoes: '#2a1a10' } },
  { id: 'lawyer', icon: '⚖️', name: '변호사', clean: 1, d: '법원에서 법률 상담 · 재판 받는 플레이어 변론 수임 (₩20,000)', u: { top: 'suit', topColor: '#1c1c22', bottom: 'slacks', bottomColor: '#1c1c22', glasses: 'glasses' } },
  { id: 'farmer', icon: '🌾', name: '농부', d: '디산베이 목장 밭에서 작물 수확 · 다시 자라면 또 수확', u: { top: 'tshirt', topColor: '#c8b48a', bottom: 'jeans', bottomColor: '#3a4a6a', hat: 'fedora', hatColor: '#c8a050' } },
  { id: 'selfemp', icon: '🏪', name: '자영업자', d: '아무 데서나 노점을 열고 장사 · 사람 많은 곳·낮·내 건물 안일수록 잘 팔린다' },
  { id: 'delivery', icon: '📦', name: '택배기사', d: '지올르 물류단지에서 상차 → 목적지 배달 · 거리만큼 수입', u: { top: 'vest', topColor: '#ff8a1a', hat: 'cap', hatColor: '#ff8a1a' } },
  { id: 'lumber', icon: '🪓', name: '벌목꾼', d: '나무를 벨 때마다 벌목 수당 (목재도 그대로 얻음)', u: { top: 'long', topColor: '#a82020', bottom: 'jeans', bottomColor: '#2a3a5a', hat: 'beanie', hatColor: '#3a2a1a' } },
  { id: 'gangA', icon: '🔴', name: '레드 크루 (갱단)', d: '레드 크루 NPC와 한편 · 블루 독스와 적 · 자릿세 수금 · 협박 수익 2배', u: { top: 'hoodie', topColor: '#c42020', hat: 'bandana', hatColor: '#c42020', bottom: 'jeans', bottomColor: '#1a1a1a' } },
  { id: 'gangB', icon: '🔵', name: '블루 독스 (갱단)', d: '블루 독스 NPC와 한편 · 레드 크루와 적 · 자릿세 수금 · 협박 수익 2배', u: { top: 'hoodie', topColor: '#2050d0', hat: 'bandana', hatColor: '#2050d0', bottom: 'jeans', bottomColor: '#1a1a1a' } },
];
const JOB_BY = Object.fromEntries(JOB_LIST.map(j => [j.id, j]));
function jobIcon(id) { const j = JOB_BY[id]; return j && id !== 'none' ? j.icon : ''; }
const RESIDENTIAL = ['house', 'apartment', 'villa', 'home'];
// ---- 군부대 (서불리 북쪽 해안가) ----
const ARMY = { x0: 232, x1: 392, z0: -940, z1: -820, gz: -880, towers: [], posts: [] };
function inArmyBase(x, z) { return x > ARMY.x0 && x < ARMY.x1 && z > ARMY.z0 && z < ARMY.z1; }
// ---- 디산베이 목장 밭 ----
const FARM = { cx: -1150, cz: 440, spots: [], ready: false };

// 월드 생성 중에 호출 (나무 심기 전에): 군부대 + 밭
function buildJobWorld() { try { buildArmyBase(); } catch (e) { console.warn('army', e); } try { buildFarmField(); } catch (e) { console.warn('farm', e); } try { buildCourt(); } catch (e) { console.warn('court', e); } }
function buildArmyBase() {
  const { x0, x1, z0, z1, gz } = ARMY; const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, y = LAND - 0.2;
  const m = mbAt('concrete', cx, cz), mp = mbAt('plain', cx, cz), mm = mbAt('metalPlain', cx, cz), gl = mbAt('glow', cx, cz);
  markGrass(x0 - 2, z0 - 2, x1 + 2, z1 + 2, 0); markGrass(200, gz - 5, x0, gz + 5, 0);
  mp.box(cx, LAND - 0.3, cz, x1 - x0, 0.47, z1 - z0, C(0x6e6a58)); // 연병장 바닥
  mp.box((200 + x0) / 2, LAND - 0.3, gz, x0 - 200, 0.46, 9, C(0x3a3b3e)); // 진입로
  const WH = 4.2, T = 0.7, GW = 9;
  const wall = (ax, az, bx, bz) => {
    const w = Math.max(T, Math.abs(bx - ax)), d = Math.max(T, Math.abs(bz - az)), mx = (ax + bx) / 2, mz = (az + bz) / 2;
    m.box(mx, y, mz, w, WH, d, C(0x7a7e68), null, { topUV: 4 }); addCollider(mx - w / 2, mz - d / 2, mx + w / 2, mz + d / 2, y + WH + 1.4, 'bld');
    const n = Math.ceil(Math.max(w, d) / 2.5); for (let i = 0; i <= n; i++) { const t = i / n; mm.box(lerp(ax, bx, t), y + WH, lerp(az, bz, t), 0.08, 1.1, 0.08, C(0x444444)); }
    mm.box(mx, y + WH + 0.5, mz, w, 0.06, d, C(0x9a9a9a)); mm.box(mx, y + WH + 1.0, mz, w, 0.06, d, C(0x9a9a9a));
  };
  wall(x0, z0, x1, z0); wall(x0, z1, x1, z1); wall(x1, z0, x1, z1); wall(x0, z0, x0, gz - GW / 2); wall(x0, gz + GW / 2, x0, z1);
  // 정문: 위병소 + 차단기(올라가 있음)
  for (const s of [-1, 1]) { m.box(x0, y, gz + s * (GW / 2 + 0.7), 1.4, WH + 1.4, 1.4, C(0x5a5e4a)); gl.box(x0 - 0.75, y + WH + 1.4, gz + s * (GW / 2 + 0.7), 0.5, 0.3, 0.5, CS(1, 0.2, 0.15)); }
  mm.box(x0 - 0.8, y + 1.0, gz - GW / 2 + 0.4, 0.25, 0.25, 0.25, C(0x333333));
  { const pole = mbAt('plain', x0, gz); for (let i = 0; i < 8; i++) pole.box(x0 - 0.8, y + 1.2 + i * 0.95, gz - GW / 2 + 0.4, 0.18, 0.95, 0.18, i % 2 ? C(0xffffff) : C(0xd02020)); }
  addBuildingBox(x0 + 5, gz - GW / 2 - 4.5, 5, 4, 3.2, 'office', C(0x6a7458), { y0: y });
  addSign('서불리 육군 제1사단', 'ARMY BASE · 민간인 출입 금지 · 무단 침입 시 발포', '#2f3a20', x0 - T / 2 - 0.08, y + WH - 1.0, gz + GW / 2 + 6, 10, 2.2, -Math.PI / 2);
  addSign('⚠ 군사 보호 구역', '허가 없이 들어오면 경계병이 발포합니다', '#6a1a1a', x0 - T / 2 - 0.08, y + WH - 1.2, gz - GW / 2 - 6, 8, 1.8, -Math.PI / 2);
  // 감시탑 6개
  const TW = [[x0 + 4, z0 + 4], [x1 - 4, z0 + 4], [x0 + 4, z1 - 4], [x1 - 4, z1 - 4], [x0 + 4, gz - GW / 2 - 12], [(x0 + x1) / 2, z0 + 4]];
  for (const [tx, tz] of TW) {
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mm.box(tx + lx * 1.3, y, tz + lz * 1.3, 0.25, 9, 0.25, C(0x4a4c40));
    mp.box(tx, y + 9, tz, 3.6, 0.3, 3.6, C(0x5a6048)); mp.box(tx, y + 9.3, tz, 3.4, 1.0, 3.4, C(0x4a5038)); mm.box(tx, y + 11.8, tz, 3.8, 0.25, 3.8, C(0x3a3c30));
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mm.box(tx + lx * 1.6, y + 10.3, tz + lz * 1.6, 0.12, 1.5, 0.12, C(0x3a3c30));
    gl.box(tx, y + 11.6, tz, 0.5, 0.2, 0.5, CS(1, 0.95, 0.75));
    addCollider(tx - 1.8, tz - 1.8, tx + 1.8, tz + 1.8, y + 12, 'bld');
    ARMY.towers.push({ x: tx, y: y + 10.6, z: tz });
  }
  // 막사 · 본부 (들어갈 수 있음)
  const blds = [[x0 + 30, z1 - 14, 22, 12, 6, '제1 막사'], [x0 + 60, z1 - 14, 22, 12, 6, '제2 막사'], [x1 - 26, gz, 18, 20, 9, '사단 본부']];
  for (const [bx, bz, w, d, h, nm] of blds) {
    addBuildingBox(bx, bz, w, d, h, 'office', C(0x6a7458), { y0: y });
    const side = nm === '사단 본부' ? 'w' : 'n';
    regBuilding('office', bx, bz, w, d, y + h + 0.7, side, { y0: LAND, name: nm, army: 1 });
    addSign(nm, 'ARMY', '#2f3a20', side === 'w' ? bx - w / 2 - 0.1 : bx, y + h - 1.2, side === 'w' ? bz : bz - d / 2 - 0.1, 5, 1.1, side === 'w' ? -Math.PI / 2 : Math.PI);
  }
  // 전차 · 장갑차 (장식)
  const tank = (tx, tz, yaw, col) => {
    const ca = Math.cos(yaw), sa = Math.sin(yaw); const P = (lx, lz) => [tx + lx * ca + lz * sa, tz - lx * sa + lz * ca];
    const tm = mbAt('metalPlain', tx, tz); const along = Math.abs(sa) > 0.5; const W = (a, b) => along ? b : a, D = (a, b) => along ? a : b;
    tm.box(tx, y + 0.3, tz, W(3.4, 7.0), 1.3, D(3.4, 7.0), col);
    for (const s of [-1, 1]) { const [px, pz] = P(s * 1.75, 0); tm.box(px, y, pz, W(0.7, 7.4), 1.2, D(0.7, 7.4), C(0x222222)); }
    tm.box(tx, y + 1.6, tz, 2.4, 0.9, 2.6, col.clone().multiplyScalar(0.9));
    const [bx, bz] = P(0, 3.2); tm.box(bx, y + 1.85, bz, W(0.25, 4.0), 0.25, D(0.25, 4.0), C(0x2a2c22));
    addCollider(tx - (along ? 3.8 : 1.9), tz - (along ? 1.9 : 3.8), tx + (along ? 3.8 : 1.9), tz + (along ? 1.9 : 3.8), y + 2.6, 'bld');
  };
  for (let i = 0; i < 4; i++) tank(x0 + 30 + i * 11, z0 + 22, 0, C(0x56603e));
  for (let i = 0; i < 3; i++) tank(x1 - 50 + i * 12, z0 + 22, 0, C(0x4e5638));
  // 헬기장
  mp.cyl(x1 - 26, LAND + 0.17, z1 - 22, 9, 0.06, C(0x3a3c3a), 28); mp.cyl(x1 - 26, LAND + 0.2, z1 - 22, 7.6, 0.03, C(0xf2f2f2), 28); mp.cyl(x1 - 26, LAND + 0.21, z1 - 22, 7.1, 0.03, C(0x3a3c3a), 28);
  mp.box(x1 - 28.5, LAND + 0.23, z1 - 22, 0.9, 0.02, 6, C(0xf2f2f2)); mp.box(x1 - 23.5, LAND + 0.23, z1 - 22, 0.9, 0.02, 6, C(0xf2f2f2)); mp.box(x1 - 26, LAND + 0.23, z1 - 22, 5, 0.02, 0.9, C(0xf2f2f2));
  // 국기 게양대 · 연병장 선
  mm.cyl(cx - 10, y, gz, 0.12, 12, C(0xcfcfcf), 8); mp.box(cx - 10 + 1.2, y + 10.4, gz, 2.4, 1.5, 0.05, C(0xf2f2f2)); mp.box(cx - 10 + 1.2, y + 10.9, gz, 0.6, 0.6, 0.06, C(0xc02030));
  for (let i = 0; i < 5; i++) mp.box(cx - 30 + i * 12, LAND + 0.18, gz + 18, 0.3, 0.02, 14, C(0xe8e8e0));
  // 경계 근무 지점 (군인 직업)
  ARMY.posts = [[x0 + 12, z0 + 12], [x1 - 12, z0 + 12], [x1 - 12, z1 - 12], [x0 + 12, z1 - 12], [cx, gz + 30], [x0 + 8, gz]].map(([x, z]) => ({ x, z }));
}
function buildFarmField() {
  const { cx, cz } = FARM; const spots = [];
  const blocked = (x, z) => { for (const c of COLLIDERS) if (c.x1 > x - 2 && c.x0 < x + 2 && c.z1 > z - 2 && c.z0 < z + 2) return true; return false; };
  // 목장 근처에서 평평하고 빈 땅을 찾아 8×4칸 밭을 만든다
  let best = null;
  for (let r = 0; r < 220 && !best; r += 12) for (let a = 0; a < 16 && !best; a++) {
    const ox = cx + Math.cos(a / 16 * TAU) * r, oz = cz + Math.sin(a / 16 * TAU) * r; let ok = true; const h0 = terrainH(ox, oz);
    if (h0 < LAND - 0.3) continue;
    for (let i = 0; i < 8 && ok; i++) for (let j = 0; j < 4 && ok; j++) { const x = ox + i * 4, z = oz + j * 4; if (roadDistAt(x, z) < 5 || blocked(x, z) || Math.abs(terrainH(x, z) - h0) > 1.2) ok = false; }
    if (ok) best = [ox, oz];
  }
  if (!best) return;
  const [ox, oz] = best; markGrass(ox - 3, oz - 3, ox + 31, oz + 15, 0);
  const mp = mbAt('plain', ox, oz);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) {
    const x = ox + i * 4, z = oz + j * 4, h = terrainH(x, z);
    mp.box(x, h - 0.1, z, 3, 0.32, 3, C(0x5a3e24)); spots.push({ x, z, y: h + 0.2, ready: true, t: 0, mesh: null });
  }
  fenceRect(ox - 3, oz - 3, ox + 31, oz + 15, C(0x8a6a3a), 1.2, 's');
  addSign('🌾 서불리 농장', '농부: E 로 수확', '#4a3a1a', ox + 14, terrainH(ox + 14, oz + 16) + 1.6, oz + 15.3, 4.5, 1.1, 0);
  FARM.spots = spots; FARM.cx = ox + 14; FARM.cz = oz + 6;
}

const JOBS = {
  id: 'none', record: 0, task: null, payT: 0, spotT: 0, armyIn: false, armyT: 0, shotT: 0, lastArmyCrime: -999, stall: null, saleT: 0, hud: null, beam: null, cool: {}, walkWarnT: 0,
  get cur() { return JOB_BY[this.id] || JOB_BY.none; },
  isGang() { return this.id === 'gangA' || this.id === 'gangB'; },
  gang() { return this.isGang() ? this.id : null; },
  uniform() { return this.cur.u || null; },
  criminal() { return this.record > 0; },
  load(sv) { this.id = (sv && JOB_BY[sv.job]) ? sv.job : 'none'; this.record = Math.max(0, +(sv && sv.rec) || 0); if (this.criminal() && this.cur.clean) this.id = 'none'; },
  // 월드가 다 만들어진 뒤: 작물·목표 표시 메쉬
  initWorld() {
    const cropG = new THREE.ConeGeometry(0.34, 1.0, 6), leafM = new THREE.MeshStandardMaterial({ color: 0x6ab03a, roughness: 0.8 }), headM = new THREE.MeshStandardMaterial({ color: 0xe0b840, roughness: 0.7 });
    const headG = new THREE.SphereGeometry(0.17, 8, 6);
    for (const s of FARM.spots) { const g = new THREE.Group(); for (const [dx, dz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6], [0, 0]]) { const c = new THREE.Mesh(cropG, leafM); c.position.set(dx, 0.55, dz); g.add(c); const hd = new THREE.Mesh(headG, headM); hd.position.set(dx, 1.05, dz); g.add(hd); } g.position.set(s.x, s.y, s.z); scene.add(g); s.mesh = g; }
    const bm = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 60, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd34a, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }));
    bm.visible = false; bm.renderOrder = 5; scene.add(bm); this.beam = bm;
    const h = document.createElement('div'); h.id = 'jobHud'; h.className = 'panel'; h.style.cssText = 'font-size:12px;padding:5px 10px;text-align:right;line-height:1.45;max-width:230px;pointer-events:none';
    const tr = $('#topR'); if (tr) tr.appendChild(h); this.hud = h;
    FARM.ready = true; this.newTask(); this.updateHud();
  },
  pay(n, why) { const r = ECON.net(n, this.id); const v = Math.round(r.net / 10) * 10; ME.money += v; sfx('cash'); toast(`💰 ${why} +${fmtMoney(v)}${r.tax ? ` (세금 -${fmtMoney(r.tax)})` : ''}`); },
  // 일하는 시간: 가만히 sec초 있어야 돈이 들어온다 (딸깍 방지)
  channel(sec, label, fn) { if (this.chan) return; this.chan = { end: G.t + sec, dur: sec, x: ME.x, z: ME.z, label, fn }; sfx('ui'); this.updateHud(); },
  chanTick() { const c = this.chan; if (!c) return; if (ME.dead || ME.vehicle || ME.jail || Math.hypot(ME.x - c.x, ME.z - c.z) > 1.5) { this.chan = null; toast('❌ 중단됐다 — 끝날 때까지 가만히 있어야 해'); this.updateHud(); return; } if ((this._cT = (this._cT || 0) - G.dt) <= 0) { this._cT = 0.25; this.updateHud(); } if (G.t >= c.end) { this.chan = null; ME.stamina = Math.max(0, ME.stamina - 12); c.fn(); this.updateHud(); } },
  // 일 끝나면 바로 다음 일이 오지 않는다
  later() { this.task = { kind: 'idle', label: '⏳ 다음 업무 대기 중', retry: G.t + rnd(20, 40) }; this.updateHud(); },
  // ---- 범죄 ----
  crime(kind) {
    if (ADMIN.on) return; const c = CRIMES[kind]; if (!c) return;
    const was = this.criminal(); this.record += c.s; this.witness(kind === 'army' ? 6 : kind === 'murder' ? 8 : 3);
    announce('🦹 범죄 기록', `${c.name} · 형량 +${c.s}초 (총 ${Math.ceil(this.record)}초)`);
    NET.send({ t: 'chat', m: `🚨 ${ME.name} — ${c.name}`, sys: 1 });
    if (this.cur.clean) { const old = this.cur.name; this.set('none', true); toast(`💼 범죄 기록 때문에 ${old}에서 해고됐다`, 4000); }
    if (kind === 'army') CINE_EV.army(); if (!was) CINE_EV.criminal(c.name); if (!was) toast('🦹 이제 범죄자 신분이다 — 경찰이 알아보면 쫓아온다 (경찰서에서 자수 가능)', 4500);
    this.updateHud(); saveGame();
  },
  witness(sev) { if (G.isHost) NPCMEM.witness(anchorOf(ME).x, anchorOf(ME).z, ME.id, sev); else NET.send({ t: 'pol', o: { a: 'wit', sev } }); },
  isTrespass(b) {
    if (!b || ADMIN.on || !RESIDENTIAL.includes(b.kind)) return false;
    return !HOUSE.mine(b); // 열쇠(산 집) · 내 땅 건물이면 내 집
  },
  // 문으로 걸어 들어갈 때(walk)는 남의 집이면 막고 경고만, E로 들어가면 가택 침입
  onEnter(b, opts) {
    if (!this.isTrespass(b)) return true;
    if (opts && opts.picked) { this.crime('home'); return true; } // 자물쇠를 따고 들어감 = 가택 침입
    if (opts && opts.walk) { if (G.t > this.walkWarnT) { this.walkWarnT = G.t + 4; toast('🔒 잠긴 남의 집 — E: 자물쇠 따기 / 집 사기', 3000); } return false; }
    HOUSE.door(b); return false; // 열쇠 없으면 잠겨 있다
  },
  onKill(k) {
    if (k === 'civ' || k === 'police' || k === 'medic' || k === 'worker') { this.crime('murder'); return; }
    if (this.id === 'police' && (k === 'gangA' || k === 'gangB')) this.pay(1400, '갱단원 제압 수당');
    else if (this.isGang() && (k === 'gangA' || k === 'gangB') && k !== this.id) this.pay(1200 * ECON.crimeMul(), '상대 갱단원 처치');
  },
  onTree(n) { if (this.id === 'lumber') this.pay(200 + n * 70, '벌목 수당'); },
  robMul() { return this.isGang() ? 2 : 1; },
  // ---- 직업 바꾸기 ----
  set(id, silent) {
    const j = JOB_BY[id]; if (!j) return;
    if (!silent && ECON.jobLocked(id)) { toast('📉 채용 중단 — 경기가 나빠 지금은 이 일자리가 없다', 3500); sfx('error'); return; }
    if (j.clean && this.criminal()) { toast(`🦹 범죄 기록이 있어 ${j.name}이(가) 될 수 없다 (남은 형량 ${Math.ceil(this.record)}초)`, 3500); sfx('error'); return; }
    if (ME.jail) { toast('🔒 수감 중에는 직업을 바꿀 수 없다'); return; }
    this.closeStall(true); this.id = id; this.task = null; this.payT = 0;
    if (!ADMIN.on) WARDROBE.apply(); this.newTask();
    if (!silent) { if (id !== 'none') setTimeout(() => CINE_EV.job(Object.assign({}, j, { id })), 150); announce(`${j.icon} ${j.name}`, id === 'none' ? '직업을 그만뒀다' : j.d); sfx('levelup'); NET.send({ t: 'chat', m: `💼 ${ME.name} → ${j.icon} ${j.name}`, sys: 1 }); }
    this.updateHud(); saveGame();
  },
  openMenu() {
    const cr = this.criminal();
    const items = JOB_LIST.map(j => ({ ic: j.icon, t: j.name + (this.id === j.id ? ' (현재)' : ''), p: '', d: j.d + (j.clean ? ' · 범죄 기록 없어야 함' : ''), dis: (j.clean && cr) || this.id === j.id || ECON.jobLocked(j.id), disMsg: this.id === j.id ? '이미 이 직업이다' : ECON.jobLocked(j.id) ? '📉 채용 중단 (일자리 감소)' : `🦹 범죄자 신분 — 남은 형량 ${Math.ceil(this.record)}초`, fn: () => this.set(j.id) }));
    if (this.id === 'selfemp') items.unshift({ ic: '🏪', t: this.stall ? '노점 닫기' : '여기서 노점 열기', p: '', d: '사람 많은 곳 · 낮 · 내 건물 안일수록 잘 팔린다', fn: () => this.stall ? this.closeStall() : this.openStall() });
    UI.openMenu('💼 직업', `현재: <b>${this.cur.icon} ${this.cur.name}</b>${cr ? ` · <b style="color:#ff6a3a">🦹 범죄자 (남은 형량 ${Math.ceil(this.record)}초)</b>` : ''}`, items);
  },
  // ---- 업무 목표 ----
  far(x, z, a, b) { return { x, z, ok: Math.hypot(x - ME.x, z - ME.z) > a && Math.hypot(x - ME.x, z - ME.z) < b }; },
  roadPoint(x, z) { const n = ROUTE.nearestOnRoad(x, z); const E = EDGES[n.e]; return { x: n.x + (E.axis === 'x' ? 0 : E.w / 2 + 2), z: n.z + (E.axis === 'x' ? E.w / 2 + 2 : 0) }; },
  newTask() {
    const id = this.id; this.task = null; const a = anchorOf(ME);
    if (id === 'police') { for (let k = 0; k < 30; k++) { const d = pick(DISTRICTS.filter(q => q.id !== 16)); const p = this.roadPoint(d.cx + rnd(-150, 150), d.cz + rnd(-150, 150)); const dd = Math.hypot(p.x - a.x, p.z - a.z); if (dd > 120 && dd < 700) { this.task = { kind: 'patrol', x: p.x, z: p.z, label: `🚓 순찰: ${d.name}`, r: 7 }; break; } } }
    else if (id === 'soldier') { const p = pick(ARMY.posts); this.task = { kind: 'post', x: p.x, z: p.z, label: '🪖 경계 근무 지점', r: 4 }; }
    else if (id === 'doctor') this.pickPatient();
    else if (id === 'realtor') { const c = PLOTS.filter(p => p.state === 'empty' && p.signPos).map(p => [p, Math.hypot(p.signPos[0] - a.x, p.signPos[1] - a.z)]).filter(q => q[1] > 60 && q[1] < 800); if (c.length) { const [p, d] = pick(c); this.task = { kind: 'plot', x: p.signPos[0], z: p.signPos[1], label: '📋 매물 감정', r: 4, e: 1, dist: d }; } }
    else if (id === 'lawyer' && COURT.site) this.task = { kind: 'court', x: COURT.site.x, z: COURT.site.z, label: '⚖️ 법원 (E: 법률 상담)', r: 8, passive: 1 };
    else if (id === 'farmer') this.task = { kind: 'farm', x: FARM.cx, z: FARM.cz, label: '🌾 농장', r: 22, passive: 1 };
    else if (id === 'delivery') { const p = this.roadPoint(-40, -800); this.task = { kind: 'pickup', x: p.x, z: p.z, label: '📦 물류단지에서 상차', r: 4, e: 1 }; }
    else if (id === 'gangA' || id === 'gangB') { const d = DISTRICTS[id === 'gangA' ? 10 : 11]; const p = this.roadPoint(d.cx + rnd(-120, 120), d.cz + rnd(-120, 120)); this.task = { kind: 'collect', x: p.x, z: p.z, label: `💰 자릿세 수금 (${d.name})`, r: 4, e: 1 }; }
    this.updateHud();
  },
  pickPatient() {
    const a = anchorOf(ME); const c = PEDS.filter(p => p.kind === 'civ' && p.char && (p.state === 'walk' || p.state === 'idle' || p.state === 'sit' || p.state === 'loiter' || p.state === 'goto')).map(p => [p, Math.hypot(p.x - a.x, p.z - a.z)]).filter(q => q[1] > 25 && q[1] < 200);
    if (!c.length) { this.task = { kind: 'wait', label: '🩺 환자 찾는 중…', retry: G.t + 4 }; return; }
    const [p] = pick(c); this.task = { kind: 'patient', ped: p.id, x: p.x, z: p.z, label: '🤕 환자에게 가기', r: 2.6, e: 1 };
  },
  // E 상호작용 후보
  interact(cand) {
    if (ME.jail || ME.dead || ME.vehicle) return;
    if (this.chan) { cand(-9, { label: `⏳ ${this.chan.label}… (움직이면 중단)`, key: 'E', fn: () => { } }); return; }
    const t = this.task;
    if (t && t.e && !INTERIOR.cur) {
      const d = Math.hypot(t.x - ME.x, t.z - ME.z);
      if (d < t.r) {
        if (t.kind === 'plot') cand(d - 0.4, { label: '📋 매물 감정하기 (부동산중개인)', key: 'E', fn: () => this.channel(5, '📋 매물 감정 중', () => { this.pay(900 + t.dist * 2, '매물 감정 수수료'); this.later(); }) });
        if (t.kind === 'pickup') cand(d - 0.4, { label: '📦 택배 상차', key: 'E', fn: () => this.channel(3, '📦 상차 중', () => this.loadParcel()) });
        if (t.kind === 'drop') cand(d - 0.4, { label: `📦 ${t.name} 배달 완료`, key: 'E', fn: () => this.channel(3, '📦 하차 중', () => { this.pay(600 + t.dist * 1.1, '배달 완료'); this.later(); }) });
        if (t.kind === 'collect') cand(d - 0.4, { label: '💰 자릿세 걷기', key: 'E', fn: () => this.channel(4, '💰 수금 중', () => { this.pay(rnd(700, 1500) * ECON.crimeMul(), '자릿세 수금'); if (Math.random() < 0.35) { addWanted(1); JOBS.witness(2); } this.later(); }) });
        if (t.kind === 'patient') { const p = PEDS[t.ped]; cand(d - 0.4, { label: '🩺 환자 치료하기', key: 'E', fn: () => this.channel(4, '🩺 치료 중', () => { if (p && p.char) p.char.say(pick(['감사합니다 선생님!', '훨씬 나아졌어요', '살았다…']), 3); FX.emoji('💖', t.x, (p ? p.y : ME.y) + 2, t.z, 0.4); if (G.isHost) NPCMEM.help(ME.id, p); else NET.send({ t: 'pedHelp', id: t.ped }); this.pay(1300, '환자 치료'); this.later(); }) }); }
      }
    }
    if (this.id === 'farmer' && !INTERIOR.cur) for (const s of FARM.spots) { const d = Math.hypot(s.x - ME.x, s.z - ME.z); if (d < 2.4) cand(d - 0.2, s.ready ? { label: '🌾 수확하기', key: 'E', fn: () => this.channel(2.5, '🌾 수확 중', () => this.harvest(s)) } : { label: `🌱 자라는 중 (${Math.ceil(s.t - G.t)}초)`, key: 'E', fn: () => { } }); }
    if (this.stall) { const d = Math.hypot(this.stall.x - ME.x, this.stall.z - ME.z); if (d < 2.5) cand(d, { label: '🏪 노점 닫기', key: 'E', fn: () => this.closeStall() }); }
    // 다른 플레이어에게: 경찰 체포 / 의사 치료
    for (const [id, rp] of G.players) {
      if (!sameSpace(rp) || rp.dead) continue; const d = Math.hypot(rp.x - ME.x, rp.z - ME.z); if (d > 2.6) continue;
      if (this.id === 'police' && (rp.wanted || 0) > 0 && !rp.jail) cand(d - 0.5, { label: `🚔 ${rp.name} 체포하기 (수배 ★${rp.wanted})`, key: 'E', fn: () => { if (G.t < (this.cool['a' + id] || 0)) { toast('잠시 뒤에 다시 시도'); return; } this.cool['a' + id] = G.t + 8; NET.send({ t: 'copArrest', to: id }); toast('🚔 체포 시도…'); } });
      if (this.id === 'doctor' && (rp.hp ?? 100) < 95) cand(d - 0.5, { label: `🩺 ${rp.name} 치료하기 (HP ${Math.round(rp.hp)})`, key: 'E', fn: () => { if (G.t < (this.cool['h' + id] || 0)) { toast('방금 치료했다'); return; } this.cool['h' + id] = G.t + 20; NET.send({ t: 'heal', to: id }); } });
    }
  },
  loadParcel() {
    const a = anchorOf(ME); const c = FACILITIES.map(f => [f, Math.hypot(f.x - a.x, f.z - a.z)]).filter(q => q[1] > 180 && q[1] < 1100);
    if (!c.length) { toast('배달할 곳이 없다'); return; }
    const [f, d] = pick(c); this.task = { kind: 'drop', x: f.x, z: f.z, label: `📦 배달: ${f.icon} ${f.name}`, name: f.name, r: 5, e: 1, dist: d };
    sfx('ui'); toast(`📦 상차 완료 → ${f.icon} ${f.name} (${Math.round(d)}m)`); this.updateHud();
  },
  harvest(s) { if (!s.ready) return; s.ready = false; s.t = G.t + 120; if (s.mesh) s.mesh.visible = false; FX.emoji('🌾', s.x, s.y + 1, s.z, 0.35); this.pay(450, '작물 수확'); },
  // ---- 자영업: 노점 ----
  openStall() {
    if (ME.vehicle || ME.jail || ME.dead) { toast('지금은 노점을 열 수 없다'); return; }
    this.closeStall(true); const g = new THREE.Group(); const yaw = ME.yaw;
    const tb = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.8), new THREE.MeshStandardMaterial({ color: 0x8a5a2a })); tb.position.y = 0.45; g.add(tb);
    const rf = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 1.3), new THREE.MeshStandardMaterial({ color: 0xd03a3a })); rf.position.y = 2.1; g.add(rf);
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.1, 6), new THREE.MeshStandardMaterial({ color: 0xdddddd })); p.position.set(s * 1.0, 1.05, -0.5); g.add(p); }
    const fx = ME.x + Math.sin(yaw) * 1.4, fz = ME.z + Math.cos(yaw) * 1.4; g.position.set(fx, ME.y, fz); g.rotation.y = yaw; scene.add(g);
    const own = INTERIOR.cur && INTERIOR.cur.b.plot && INTERIOR.cur.b.plot.owner === ME.id;
    this.stall = { x: fx, z: fz, mesh: g, bi: myBi(), own }; this.saleT = 4; toast(own ? '🏪 내 건물에서 가게 오픈! (수익 2배)' : '🏪 노점 오픈! 근처에 사람이 많을수록 잘 팔린다'); sfx('cash'); this.updateHud();
  },
  closeStall(silent) { if (!this.stall) return; scene.remove(this.stall.mesh); this.stall = null; if (!silent) toast('🏪 노점을 닫았다'); this.updateHud(); },
  stallTick(dt) {
    const s = this.stall; if (!s) return;
    if (Math.hypot(ME.x - s.x, ME.z - s.z) > 14 || myBi() !== s.bi || ME.dead || ME.jail || ME.vehicle) { this.closeStall(true); toast('🏪 자리를 비워서 노점을 접었다'); return; }
    if ((this.saleT -= dt) > 0) return; this.saleT = 9;
    let n = 0; const a = anchorOf(ME); for (const p of PEDS) if (p.state !== 'parked' && p.state !== 'dead' && Math.abs(p.x - a.x) < 22 && Math.abs(p.z - a.z) < 22) n++;
    for (const rp of G.players.values()) if (sameSpace(rp) && Math.hypot(rp.x - ME.x, rp.z - ME.z) < 12) n += 2;
    const day = G.time > 7 && G.time < 20 ? 1.5 : 0.8; const mul = (s.own ? 2 : 1) * day;
    if (n === 0 && !s.own) { if (Math.random() < 0.3) toast('🏪 손님이 없다… 사람 많은 곳으로 가보자', 2000); return; }
    if (Math.random() < Math.min(0.95, 0.35 + n * 0.12)) this.pay(rnd(100, 420) * mul, '판매');
  },
  // ---- 매 프레임 ----
  tick(dt) {
    if (!this.hud) return;
    // 범죄자 신분: 감옥 1초/초, 밖 0.2초/초
    if (this.record > 0) { const was = this.record; this.record = Math.max(0, this.record - dt * (ME.jail ? 1 : 0.2)); if (was > 0 && this.record === 0) { toast('✅ 형량이 끝나 범죄자 신분에서 벗어났다', 4000); sfx('levelup'); saveGame(); } }
    // 경찰 NPC가 범죄자를 알아본다
    if ((this.spotT -= dt) <= 0) {
      this.spotT = 1;
      if (this.criminal() && !ME.jail && !ME.dead && !INTERIOR.cur && !ADMIN.on && ME.wanted === 0 && G.t > (this._spotCool || 0)) {
        if (PEDS.some(q => q.kind === 'police' && q.state !== 'dead' && q.state !== 'parked' && Math.hypot(q.x - ME.x, q.z - ME.z) < 16)) { this._spotCool = G.t + 45; addWanted(1); toast('🚨 경찰이 범죄자를 알아봤다!', 3000); }
      }
      // 근무 수당 (경찰·군인·의사)
      if ((this.id === 'police' || this.id === 'soldier' || this.id === 'doctor') && !ME.jail && !ME.dead) { this.payT += 1; if (this.payT >= 120) { this.payT = 0; this.pay(this.id === 'soldier' ? 1000 : 900, '근무 수당 (2분)'); } }
      // 작물 다시 자람
      for (const s of FARM.spots) if (!s.ready && G.t >= s.t) { s.ready = true; if (s.mesh) s.mesh.visible = true; }
      this.updateHud();
    }
    this.armyTick(dt); this.stallTick(dt); this.chanTick();
    // 업무 목표
    const t = this.task;
    if (t) {
      if (t.kind === 'wait') { if (G.t > t.retry) this.pickPatient(); }
      else if (t.kind === 'idle') { if (G.t > t.retry) this.newTask(); }
      else if (t.kind === 'patient') { const p = PEDS[t.ped]; if (!p || p.state === 'parked' || p.state === 'dead') this.pickPatient(); else { t.x = p.x; t.z = p.z; if (p.char && Math.random() < dt * 0.4) FX.emoji('🤕', p.x, p.y + 2.2, p.z, 0.3); } }
      else if (!t.e && !t.passive && !INTERIOR.cur) {
        const a = anchorOf(ME); if (Math.hypot(t.x - a.x, t.z - a.z) < t.r) {
          if (t.kind === 'patrol') this.pay(800, '순찰 완료'); else if (t.kind === 'post') this.pay(600, '경계 근무');
          this.later();
        }
      }
    }
    // 3D 목표 표시 기둥
    const bm = this.beam; const tt = this.task;
    if (bm) { const show = !!(tt && tt.x !== undefined && !INTERIOR.cur && !(tt.passive && Math.hypot(tt.x - ME.x, tt.z - ME.z) < 40)); bm.visible = show; if (show) { bm.position.set(tt.x, groundHeight(tt.x, tt.z) + 30, tt.z); bm.material.opacity = 0.2 + Math.sin(G.t * 3) * 0.08; } }
  },
  // ---- 군부대: 들어오면 범죄 + 경계병 발포 ----
  armyTick(dt) {
    const a = anchorOf(ME); const inside = inArmyBase(a.x, a.z) && !ME.dead && !ME.jail;
    const allowed = this.id === 'soldier' || ADMIN.on;
    if (inside && !allowed) {
      if (!this.armyIn) {
        this.armyIn = true; sfx('siren', ME.x, ME.z); announce('🚨 군부대 침입!', '경계병이 발포한다 — 당장 나가라!');
        if (G.t - this.lastArmyCrime > 120) { this.lastArmyCrime = G.t; this.crime('army'); }
        if (ME.wanted < 4) addWanted(4 - ME.wanted); this.shotT = 1.2;
      }
      if (!INTERIOR.cur && (this.shotT -= dt) <= 0) {
        this.shotT = rnd(0.7, 1.2); let tw = null, bd = 1e9; for (const w of ARMY.towers) { const d = Math.hypot(w.x - ME.x, w.z - ME.z); if (d < bd) { bd = d; tw = w; } }
        if (tw && bd < 140) { const hit = Math.random() < 0.7; const b = { x: ME.x + (hit ? 0 : rnd(-2, 2)), y: ME.y + 1.2, z: ME.z + (hit ? 0 : rnd(-2, 2)) }; showShot(tw, b, 'rifle', hit ? null : 'dust'); if (hit) ME.takeDamage(ME.vehicle ? 5 : 9, 'army', 'rifle'); }
      }
    } else if (this.armyIn && !inside) { this.armyIn = false; toast('부대 밖으로 나왔다'); }
  },
  updateHud() {
    const h = this.hud; if (!h) return; const j = this.cur; const lines = [];
    if (this.id !== 'none') lines.push(`<b>${j.icon} ${j.name}</b>${this.stall ? ' · 🏪 영업 중' : ''}`);
    if (this.chan) { const c = this.chan; const pct = Math.min(100, Math.round((1 - (c.end - G.t) / c.dur) * 100)); lines.push(`<b style="color:#ffd34a">${c.label} ${pct}%</b>`); }
    const t = this.task; if (t && t.label && this.id !== 'none') { const d = t.x !== undefined ? Math.round(Math.hypot(t.x - ME.x, t.z - ME.z)) : null; lines.push(`<span style="opacity:.85">${t.label}${d !== null && !(t.passive && d < 40) ? ` · ${d}m` : ''}</span>`); }
    if (this.criminal()) { const s = Math.ceil(this.record); lines.push(`<b style="color:#ff6a3a">🦹 범죄자</b> · 남은 형량 ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`); }
    h.innerHTML = lines.join('<br>'); h.style.display = lines.length ? '' : 'none';
  },
  drawMini(x, toS, clampS) {
    const t = this.task; if (t && t.x !== undefined) { const s = clampS(toS(t.x, t.z)); mapBadge(x, t.kind === 'patient' ? 'patient' : 'job', s[0], s[1], 15); }
    const s = toS((ARMY.x0 + ARMY.x1) / 2, (ARMY.z0 + ARMY.z1) / 2); mapBadge(x, 'army', s[0], s[1], 14);
  },
  drawBig(x, P) {
    const s = P((ARMY.x0 + ARMY.x1) / 2, (ARMY.z0 + ARMY.z1) / 2); mapBadge(x, 'army', s[0], s[1], 18);
    const t = this.task; if (t && t.x !== undefined) { const q = P(t.x, t.z); mapBadge(x, t.kind === 'patient' ? 'patient' : 'job', q[0], q[1], 18); }
  },
  // ---- 네트워크 ----
  onNet(m, f) {
    const rp = G.players.get(f);
    if (m.t === 'copArrest') {
      if (!rp || rp.jb !== 'police' || ME.jail || ADMIN.on || ME.wanted <= 0 || Math.hypot(rp.x - ME.x, rp.z - ME.z) > 6) return;
      const s = ME.wanted; NET.send({ t: 'arrestOk', to: f, s }); UI.chatLine(null, `🚔 ${rp.name} 경찰에게 체포됐다`); LAW.arrest();
    } else if (m.t === 'arrestOk') { if (this.id === 'police') { this.pay(1500 + 800 * clamp(+m.s || 1, 1, 5), `수배자 체포 (★${m.s})`); } }
    else if (m.t === 'heal') {
      if (!rp || rp.jb !== 'doctor' || ME.dead || Math.hypot(rp.x - ME.x, rp.z - ME.z) > 6) return;
      const g = Math.max(0, 100 - ME.hp); ME.hp = 100; toast(`🩺 ${rp.name} 의사에게 치료받았다`); sfx('levelup'); NET.send({ t: 'healOk', to: f, g: Math.round(g) });
    } else if (m.t === 'healOk') { if (this.id === 'doctor' && (+m.g || 0) >= 10) this.pay(400 + (+m.g) * 10, '플레이어 치료'); else toast('🩺 치료했다'); }
  },
};
