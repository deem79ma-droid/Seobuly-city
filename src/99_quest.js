// @v 2026101417
// ================= 튜토리얼 · 업적 · 의뢰 게시판 · 현상금 · 랭킹 =================
// 처음 하는 사람은 튜토리얼 7단계를 따라가며 보상을 받는다.
// 업적 26개는 조건을 채우면 자동으로 달성 + 보상. 의뢰 게시판(광장 분수 옆 · 휴대폰)에서 배달·사진·사냥·타임어택 의뢰를 받는다.
// 현상금은 방장이 관리: 다른 플레이어에게 돈을 걸고, 그 사람을 처치한 사람이 받아간다. 랭킹은 계정 저장 때마다 서버에 올라간다.

const TUT_STEPS = [
  { id: 'phone', t: '휴대폰 열기', h: 'P 키 (모바일: 폰 버튼) — 직업·지도·택시·의뢰가 전부 여기 있다', r: 1000 },
  { id: 'map', t: '지도 보기', h: 'M 키 (모바일: M 버튼) — 지도를 누르면 목적지가 찍힌다', r: 1000 },
  { id: 'eat', t: '밥 사 먹기', h: '나침반에 표시한 식당에 걸어 들어가서 메뉴를 골라 먹자', r: 3000, go: 'food' },
  { id: 'job', t: '직업 구하기', h: '휴대폰 ▶ 직업에서 아무 일이나 골라 (경찰·의사·택배·농부…)', r: 2000 },
  { id: 'pay', t: '첫 수입', h: '직업 일을 끝내고 돈을 받아보자 — 노란 기둥이 할 일 위치', r: 5000 },
  { id: 'car', t: '운전하기', h: '아무 차 옆에서 F (모바일: 차 버튼) — W 가속 · Space 브레이크', r: 2000 },
  { id: 'mission', t: '의뢰 해결', h: '휴대폰 ▶ 의뢰 게시판에서 의뢰를 하나 받아 끝내자', r: 5000 },
];
const ACH = [
  { id: 'tut', n: '첫 걸음', d: '튜토리얼 완료', ok: S => S.tut, r: 5000 },
  { id: 'job', n: '취업 성공', d: '첫 직업 갖기', ok: S => S.job },
  { id: 'earn', n: '월급쟁이', d: '일해서 ₩100,000 벌기', ok: S => (S.earned | 0) >= 100000, pr: S => [S.earned | 0, 100000] },
  { id: 'earn2', n: '성실한 일꾼', d: '일해서 ₩1,000,000 벌기', ok: S => (S.earned | 0) >= 1e6, pr: S => [S.earned | 0, 1e6], r: 20000 },
  { id: 'rich1', n: '저축왕', d: '현금 ₩500,000 모으기', ok: () => ME.money >= 5e5, pr: () => [ME.money, 5e5] },
  { id: 'rich2', n: '백만장자', d: '현금 ₩3,000,000 모으기', ok: () => ME.money >= 3e6, pr: () => [ME.money, 3e6], r: 20000 },
  { id: 'rich3', n: '재벌', d: '현금 ₩20,000,000 모으기', ok: () => ME.money >= 2e7, pr: () => [ME.money, 2e7], r: 100000 },
  { id: 'home', n: '내 집 마련', d: '집 1채 사기', ok: () => HOUSE.keys().length >= 1 },
  { id: 'landlord', n: '다주택자', d: '집 3채 보유', ok: () => HOUSE.keys().length >= 3, pr: () => [HOUSE.keys().length, 3], r: 20000 },
  { id: 'builder', n: '건물주', d: '내 땅에 건물 완공', ok: () => PLOTS.some(p => p.owner === ME.id && p.state === 'done'), r: 15000 },
  { id: 'car1', n: '첫 차', d: '차 사기', ok: () => ME.garage.length >= 1 },
  { id: 'car5', n: '카 컬렉터', d: '차 5대 보유', ok: () => ME.garage.length >= 5, pr: () => [ME.garage.length, 5], r: 30000 },
  { id: 'heli', n: '하늘을 날다', d: '헬기 조종하기', ok: S => S.heli },
  { id: 'peak1', n: '등산가', d: '산 정상 1곳 오르기', ok: S => (S.peaks || []).length >= 1 },
  { id: 'peak4', n: '4대 명산 정복', d: '운령산·송림산·망성산·천해산 정상 모두', ok: S => (S.peaks || []).length >= 4, pr: S => [(S.peaks || []).length, 4], r: 30000 },
  { id: 'hunt10', n: '사냥꾼', d: '동물 10마리 사냥', ok: S => (S.hunt | 0) >= 10, pr: S => [S.hunt | 0, 10] },
  { id: 'bear', n: '곰 사냥꾼', d: '곰 잡기', ok: S => S.bear, r: 15000 },
  { id: 'foodie', n: '미식가', d: '음식 10번 사 먹기', ok: S => (S.eat | 0) >= 10, pr: S => [S.eat | 0, 10] },
  { id: 'club', n: '클럽 죽돌이', d: '클럽 네온에서 춤추기', ok: S => S.club },
  { id: 'mission5', n: '해결사', d: '의뢰 5개 완료', ok: S => (S.missions | 0) >= 5, pr: S => [S.missions | 0, 5], r: 15000 },
  { id: 'mission20', n: '전설의 해결사', d: '의뢰 20개 완료', ok: S => (S.missions | 0) >= 20, pr: S => [S.missions | 0, 20], r: 50000 },
  { id: 'bounty', n: '현상금 사냥꾼', d: '현상금 받기', ok: S => S.bounty, r: 10000 },
  { id: 'crime', n: '흑화', d: '처음으로 범죄 저지르기', ok: S => S.crime, r: 1000 },
  { id: 'escape', n: '탈옥수', d: '탈옥 성공', ok: S => S.escape },
  { id: 'innocent', n: '무죄 판결', d: '재판에서 무죄 받기', ok: S => S.innocent },
  { id: 'speed', n: '과속왕', d: '범칙금 5번 내기', ok: S => (S.fines | 0) >= 5, pr: S => [S.fines | 0, 5], r: 1000 },
  { id: 'nade', n: '투척병', d: '수류탄 던지기', ok: S => S.nade, r: 1000 },
  { id: 'pres', n: '대통령', d: '대통령 당선', ok: S => S.pres, r: 50000 },
];
const BOUNTY_AMTS = [20000, 50000, 100000, 300000];
const BOUNTY_MS = 40 * 60000; // 40분이 지나면 현상금이 사라진다
const MISSION_NAMES = { deliver: '소포 배달', photo: '풍경 사진', hunt: '사냥 의뢰', race: '타임어택 운전' };

const QUEST = {
  tut: 'skip', mission: null, offers: [], offerT: 0, hud: null, _t: 0, _a: 0, _veh: null, board: { x: 16, z: -16 },
  S() { return ME.stats || (ME.stats = {}); },
  // ---------- 저장 / 불러오기 ----------
  load(sv) {
    ME.stats = Object.assign({}, (sv && sv.stats) || {}); ME.ach = Array.isArray(sv && sv.ach) ? sv.ach.slice() : [];
    this.tut = sv ? (sv.tut ?? 'skip') : 0; // 처음 하는 사람만 자동으로 튜토리얼 (원래 하던 사람은 휴대폰에서 시작)
    if (typeof this.tut === 'number' && !TUT_STEPS[this.tut]) this.tut = 'done';
  },
  save() { return { stats: ME.stats || {}, ach: ME.ach || [], tut: this.tut }; },
  // ---------- 시작: 다른 시스템에 귀를 단다 ----------
  init() {
    if (this.inited) return; this.inited = true; const S = () => this.S();
    const W = (obj, name, fn) => { const o = obj && obj[name]; if (typeof o !== 'function' || o._q) return; const w = function (...a) { const pre = fn.pre ? fn.pre() : null; const r = o.apply(this, a); try { fn.call(this, a, pre); } catch (e) { console.warn(e); } return r; }; w._q = 1; obj[name] = w; };
    W(UI, 'openPhone', () => this.ev('phone'));
    W(UI, 'openMap', () => this.ev('map'));
    W(FOOD, 'eat', () => { S().eat = (S().eat | 0) + 1; this.ev('eat'); });
    W(JOBS, 'set', ([id]) => { if (id !== 'none' && JOBS.id === id) { S().job = 1; this.ev('job'); } });
    W(JOBS, 'pay', ([n]) => { S().earned = (S().earned | 0) + Math.max(0, Math.round(+n || 0)); this.ev('pay'); });
    W(JOBS, 'onHunt', ([k]) => { S().hunt = (S().hunt | 0) + 1; if (k === 'bear') S().bear = 1; this.ev('hunt', k); });
    W(JOBS, 'crime', () => { if (!ADMIN.on) S().crime = 1; });
    W(JOBS, 'interact', ([cand]) => this.interact(cand));
    const fine = (a, pre) => { if (TRAFFIC_LAW.cool !== pre) S().fines = (S().fines | 0) + 1; }; fine.pre = () => TRAFFIC_LAW.cool; W(TRAFFIC_LAW, 'fine', fine);
    const nade = (a, pre) => { if ((ME.inv.grenade | 0) < pre) S().nade = 1; }; nade.pre = () => ME.inv.grenade | 0; W(GRENADE, 'throw', nade);
    W(CINE_EV, 'escape', () => { S().escape = 1; });
    W(CINE_EV, 'court', ([guilty]) => { if (!guilty) S().innocent = 1; });
    W(CINE_EV, 'president', ([P]) => { if (P && P.id === ME.id) S().pres = 1; });
    this.buildBoard(); this.makeHud();
    // 처음 접속: 도시 소개(인트로)가 끝난 뒤 튜토리얼 시작
    const go = () => { if (CINE.on) { setTimeout(go, 1000); return; } if (typeof this.tut !== 'number') return; this.startStep(); const st = this.step(); if (st) CINE.big(`튜토리얼 ${this.tut + 1}/${TUT_STEPS.length}`, `${st.t} — ${st.h}`, '#ffd34a', 4200); };
    if (typeof this.tut === 'number') setTimeout(go, 3000);
  },
  // ---------- 광장 분수 옆 의뢰 게시판 ----------
  buildBoard() {
    const b = this.board, y = groundHeight(b.x, b.z); const mb = new MB();
    mb.box(b.x - 1.6, y, b.z, 0.2, 2.6, 0.2, C(0x5a3a1a)); mb.box(b.x + 1.6, y, b.z, 0.2, 2.6, 0.2, C(0x5a3a1a)); mb.box(b.x, y + 1.0, b.z, 3.6, 1.6, 0.12, C(0x8a5a2a)); mb.box(b.x, y + 2.6, b.z, 3.9, 0.25, 0.5, C(0x4a2a12));
    for (let i = 0; i < 5; i++) mb.box(b.x - 1.2 + i * 0.6, y + 1.3 + (i % 2) * 0.35, b.z + 0.07, 0.45, 0.55, 0.02, C([0xf4ecd8, 0xfff2b0, 0xe8f0ff][i % 3]));
    const m = new THREE.Mesh(mb.geo(), MAT.plain); m.castShadow = true; scene.add(m);
    addSign('의뢰 게시판', '배달 · 사진 · 사냥 · 운전 의뢰', '#5a3a1a', b.x, y + 3.2, b.z + 0.3, 3.6, 0.9, 0);
    addCollider(b.x - 1.9, b.z - 0.2, b.x + 1.9, b.z + 0.2, y + 2.8);
    addDoorRing(b.x, b.z + 1.6, 0xffb84a);
  },
  // ---------- 튜토리얼 ----------
  step() { return typeof this.tut === 'number' ? TUT_STEPS[this.tut] : null; },
  startStep() {
    const st = this.step(); if (!st) return;
    if (st.go === 'food') { const a = anchorOf(ME); let best = null, bd = 1e9; for (const b of BUILDINGS) if (['restaurant', 'cafe', 'food'].includes(b.kind)) { const d = Math.hypot(b.door.x - a.x, b.door.z - a.z); if (d < bd) { bd = d; best = b; } } if (best) NAV.mark(best.door.x, best.door.z, `식당 · ${best.name}`); }
    this.updateHud();
  },
  tutDone(st) {
    const tr = Math.round(st.r * 0.2 / 100) * 100; ME.money += tr; sfx('levelup'); toast(`튜토리얼 ${st.t} 완료 +${fmtMoney(tr)}`, 3000);
    this.tut++;
    if (this.tut >= TUT_STEPS.length) { this.tut = 'done'; this.S().tut = 1; ME.money += 3000; setTimeout(() => CINE.big('튜토리얼 완료', '보너스 +₩3,000 · 이제 진짜 서불리 시민이다', '#7fd88a', 3600), 600); NET.send({ t: 'chat', m: `${ME.name}님이 튜토리얼을 마쳤다`, sys: 1, quiet: 1 }); }
    else { const nx = TUT_STEPS[this.tut]; setTimeout(() => CINE.big(`튜토리얼 ${this.tut + 1}/${TUT_STEPS.length}`, `${nx.t} — ${nx.h}`, '#ffd34a', 3600), 900); this.startStep(); }
    this.updateHud(); saveGame();
  },
  openTut() {
    const st = this.step();
    UI.openMenu('튜토리얼', st ? `<b>${this.tut + 1}/${TUT_STEPS.length}</b> ${st.t} — ${st.h}` : this.tut === 'done' ? '튜토리얼을 마쳤다' : '처음부터 다시 따라 해볼 수 있다 (단계마다 보상)', [
      ...(st ? [{ ic: '', t: '튜토리얼 건너뛰기', p: '', d: '나중에 여기서 다시 시작할 수 있다', fn: () => { this.tut = 'skip'; UI.waypoint = null; this.updateHud(); saveGame(); toast('튜토리얼을 건너뛰었다'); } }]
        : [{ ic: '', t: '튜토리얼 시작', p: '', d: this.S().tut ? '보상은 처음 한 번만' : `7단계 · 끝까지 하면 보너스 ₩20,000`, fn: () => { this.tut = 0; if (this.S().tut) for (const s of TUT_STEPS) s.r = 0; this.startStep(); CINE.big(`튜토리얼 1/${TUT_STEPS.length}`, `${TUT_STEPS[0].t} — ${TUT_STEPS[0].h}`, '#ffd34a', 3600); } }]),
      ...TUT_STEPS.map((s, i) => ({ ic: '', t: `${i + 1}. ${s.t}`, p: s.r ? fmtMoney(s.r) : '', d: (typeof this.tut === 'number' && i < this.tut) || this.tut === 'done' ? '완료' : s.h, fn: () => { } })),
    ]);
  },
  // ---------- 이벤트 ----------
  ev(id, data) {
    const st = this.step(); if (st && st.id === id) this.tutDone(st);
    const M = this.mission; if (M && M.kind === 'hunt' && id === 'hunt' && M.k === data) { M.got++; sfx('ui'); toast(`사냥 의뢰 ${M.got}/${M.n}`); if (M.got >= M.n) this.finish(); else this.updateHud(); }
  },
  // ---------- 매 프레임 ----------
  tick(dt) {
    if (!G.started) return; const S = this.S();
    if ((this._t -= dt) > 0) return; this._t = 0.5;
    const v = ME.vehicle;
    if (v && ME.seat === 'd' && v !== this._veh) { this.ev('car'); if (v.kind === 'heli') S.heli = 1; }
    this._veh = v && ME.seat === 'd' ? v : null;
    if (v && v.kind === 'heli' && ME.seat === 'd' && v.y - (v.groundY ?? v.y) > 3) S.heli = 1;
    if (ME.dance >= 0 && !ME.vehicle && Math.abs(ME.x - CLUB.x) < CLUB.w / 2 && Math.abs(ME.z - CLUB.z) < CLUB.d / 2) S.club = 1;
    for (const M of MOUNTAINS) if (M._sum) { S.peaks = S.peaks || []; if (!S.peaks.includes(M.id)) { S.peaks.push(M.id); saveGame(); } }
    if (JOBS.id !== 'none') S.job = 1;
    const st = this.step(); if (st && st.id === 'job' && JOBS.id !== 'none') this.tutDone(st);
    this.missionTick();
    if ((this._a -= 0.5) <= 0) { this._a = 1.5; this.checkAch(); }
    this.updateHud();
  },
  // ---------- 업적 ----------
  checkAch() {
    if (ADMIN.on) return; const S = this.S(); ME.ach = ME.ach || [];
    for (const a of ACH) { if (ME.ach.includes(a.id)) continue; let ok = false; try { ok = !!a.ok(S); } catch (e) { } if (!ok) continue;
      ME.ach.push(a.id); const r = Math.round((a.r ?? 3000) * 0.15 / 100) * 100; ME.money += r; sfx('levelup');
      CINE.big(`업적 달성 · ${a.n}`, `${a.d} · +${fmtMoney(r)}`, '#ffd34a', 3000);
      NET.send({ t: 'chat', m: `${ME.name}님이 업적 [${a.n}] 달성`, sys: 1 }); saveGame(); break; }
  },
  openAch() {
    const S = this.S(), got = ME.ach || [];
    UI.openMenu('업적', `<b>${got.length}</b> / ${ACH.length} 달성 · 달성하면 보상금 · 랭킹에 업적 수가 올라간다`, ACH.map(a => { const done = got.includes(a.id); let pr = ''; if (!done && a.pr) { try { const [c, m] = a.pr(S); pr = ` · ${Math.min(c, m).toLocaleString('ko-KR')}/${m.toLocaleString('ko-KR')}`; } catch (e) { } } return { ic: '', t: (done ? '[달성] ' : '') + a.n, p: fmtMoney(a.r ?? 3000), d: a.d + pr, dis: !done, disMsg: a.d + pr, fn: () => toast(`${a.n} — ${a.d}`) }; }));
  },
  // ---------- 의뢰 게시판 ----------
  landmarks() {
    const L = [];
    for (const M of MOUNTAINS) if (M.px !== undefined) L.push({ x: M.px, z: M.pz, n: `${M.n} 정상`, r: 10, bonus: 4000 });
    for (const f of FACILITIES) if (['casino', 'club', 'zoo', 'court', 'hotel'].includes(f.type)) L.push({ x: f.x, z: f.z, n: f.name, r: 14 });
    for (const b of BUILDINGS) if (['museum', 'tv', 'cathedral', 'aquarium', 'gallery', 'univ', 'convention', 'arena', 'dept', 'cinema'].includes(b.genre)) L.push({ x: b.door.x, z: b.door.z, n: b.name, r: 14 });
    L.push({ x: 1480, z: 440, n: '서불리 대교', r: 16 }); L.push({ x: HUNT.x, z: HUNT.z, n: '사냥꾼 오두막', r: 12 });
    return L;
  },
  gen(kind) {
    const a = anchorOf(ME), D = (p, q) => Math.hypot(p.x - q.x, p.z - q.z);
    if (kind === 'deliver') {
      const ok = BUILDINGS.filter(b => b.door && !RESIDENTIAL.includes(b.kind) && b.kind !== 'guard' && regionAt(b.door.x, b.door.z) !== 'sea');
      const near = ok.filter(b => { const d = D(b.door, a); return d > 60 && d < 450; }); const A = pick(near.length ? near : ok);
      const far = ok.filter(b => b !== A && D(b.door, A.door) > 250 && D(b.door, A.door) < 900); const B = pick(far.length ? far : ok);
      const d = D(A.door, B.door); return { kind, title: `${A.name} → ${B.name}`, A: { x: A.door.x, z: A.door.z, n: A.name }, B: { x: B.door.x, z: B.door.z, n: B.name }, time: Math.round(70 + d / 6), reward: Math.round((2500 + d * 5) / 100) * 100, dist: Math.round(D(A.door, a) + d) };
    }
    if (kind === 'photo') { const L = this.landmarks().filter(p => D(p, a) > 120); const p = pick(L.length ? L : this.landmarks()); const d = D(p, a); return { kind, title: `${p.n} 사진`, T: p, reward: Math.round((2000 + d * 4 + (p.bonus || 0)) / 100) * 100, dist: Math.round(d) }; }
    if (kind === 'hunt') { const k = pick(['wolf', 'boar', 'deer', 'wolf']); const n = k === 'deer' ? 3 : 2; const per = { deer: 2500, wolf: 4500, boar: 5000 }[k]; return { kind, k, n, got: 0, title: `${ANIMAL_SPECS[k].name} ${n}마리`, T: { x: HUNT.x, z: HUNT.z - 160, n: '디산베이 숲' }, reward: per * n, time: 900, dist: Math.round(Math.hypot(HUNT.x - a.x, HUNT.z - a.z)) }; }
    // race: 지금 위치에서 400~1000m 떨어진 도로까지 제한 시간 안에
    let T = null; for (let k = 0; k < 30 && !T; k++) { const ang = Math.random() * TAU, r = 400 + Math.random() * 600; const p = JOBS.roadPoint(a.x + Math.cos(ang) * r, a.z + Math.sin(ang) * r); if (p && regionAt(p.x, p.z) !== 'sea' && terrainH(p.x, p.z) > LAND - 1) T = p; }
    T = T || JOBS.roadPoint(a.x + 500, a.z); const d = D(T, a);
    return { kind: 'race', title: `${whereTxt(T.x, T.z)}까지`, T: { x: T.x, z: T.z, n: '결승점' }, time: Math.round(25 + d / 15), reward: Math.round((3000 + d * 6) / 100) * 100, dist: Math.round(d) };
  },
  refreshOffers(force) { if (!force && this.offers.length && Date.now() < this.offerT) return; this.offers = ['deliver', 'photo', pick(['hunt', 'race']), pick(['race', 'deliver', 'photo'])].map(k => { const o = this.gen(k); o.reward = Math.max(300, Math.round(o.reward * 0.3 / 100) * 100); return o; }); /* 의뢰 보상도 줄였다 */ this.offerT = Date.now() + 8 * 60000; },
  openBoard() {
    this.refreshOffers(); const M = this.mission;
    const items = [];
    if (M) items.push({ ic: '', t: `진행 중: ${MISSION_NAMES[M.kind]}`, p: fmtMoney(M.reward), d: this.status(M), fn: () => this.markTarget() }, { ic: '', t: '의뢰 포기', p: '', d: '보상 없이 취소', fn: () => this.fail('의뢰를 포기했다') });
    for (const o of this.offers) items.push({ ic: '', t: `${MISSION_NAMES[o.kind]} · ${o.title}`, p: fmtMoney(o.reward), d: `${o.kind === 'hunt' ? '15분 안에' : o.time ? `제한 ${Math.floor(o.time / 60)}분 ${o.time % 60}초` : '시간 제한 없음'} · ${o.dist}m${o.kind === 'race' ? ' · 차를 타고 받아야 한다' : ''}`, dis: !!M, disMsg: '진행 중인 의뢰를 먼저 끝내거나 포기해', fn: () => this.accept(o) });
    items.push({ ic: '', t: '새 의뢰 보기', p: 500, d: '목록을 새로 받는다', fn: () => { this.refreshOffers(true); setTimeout(() => this.openBoard(), 30); } });
    UI.openMenu('의뢰 게시판', `시민들의 부탁 · 완료 <b>${this.S().missions | 0}</b>건 · 받은 의뢰는 나침반·지도에 표시된다`, items);
  },
  accept(o) {
    if (this.mission) return; if (o.kind === 'race' && !(ME.vehicle && ME.seat === 'd' && ME.vehicle.kind !== 'heli')) { toast('차를 운전하는 중에 받아야 한다 (헬기 제외)'); return; }
    this.mission = Object.assign({ start: G.t, stage: 0, end: o.kind === 'deliver' ? 0 : o.time ? G.t + o.time : 0 }, o);
    this.offers = this.offers.filter(x => x !== o); this.markTarget(); sfx('ui');
    CINE.big(MISSION_NAMES[o.kind], `${o.title} · 보상 ${fmtMoney(o.reward)}`, '#ffb84a', 2600); this.updateHud();
  },
  target(M = this.mission) { if (!M) return null; if (M.kind === 'deliver') return M.stage ? M.B : M.A; return M.T; },
  markTarget() { const T = this.target(); if (T) NAV.mark(T.x, T.z, `의뢰 · ${T.n}`); },
  status(M = this.mission) {
    if (!M) return ''; const left = M.end ? Math.max(0, Math.ceil(M.end - G.t)) : 0; const tm = M.end ? ` · ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : '';
    const T = this.target(M); const where = T ? ` · ${T.n} ${whereTxt(T.x, T.z)}` : '';
    if (M.kind === 'deliver') return (M.stage ? '배달하기 (E)' : '소포 받으러 가기 (E)') + where + tm;
    if (M.kind === 'photo') return '도착해서 E로 사진 찍기' + where + tm;
    if (M.kind === 'hunt') return `${ANIMAL_SPECS[M.k].name} ${M.got}/${M.n}마리 · 디산베이 숲${tm}`;
    return '결승점까지 운전' + where + tm;
  },
  missionTick() {
    const M = this.mission; if (!M) return;
    if (M.end && G.t > M.end) { this.fail('시간 초과 — 의뢰 실패'); return; }
    if (M.kind === 'race') { const v = ME.vehicle; if (v && ME.seat === 'd' && Math.hypot(v.x - M.T.x, v.z - M.T.z) < 14) this.finish(); }
  },
  interact(cand) {
    if (ME.vehicle || ME.dead || INTERIOR.cur) return; const a = anchorOf(ME);
    if (Math.hypot(a.x - this.board.x, a.z - (this.board.z + 1.2)) < 3) cand(0.5, { label: '의뢰 게시판 보기', key: 'E', fn: () => this.openBoard() });
    const M = this.mission; if (!M) return; const T = this.target(M); if (!T) return; const d = Math.hypot(a.x - T.x, a.z - T.z);
    if (M.kind === 'deliver' && d < 4.5) {
      if (!M.stage) cand(d - 1, { label: `소포 받기 (${M.A.n})`, key: 'E', fn: () => JOBS.channel(2, '소포 받는 중', () => { M.stage = 1; M.end = G.t + M.time; this.markTarget(); toast(`소포를 받았다 — ${M.B.n}까지 ${Math.floor(M.time / 60)}분 ${M.time % 60}초 안에!`, 3500); this.updateHud(); }) });
      else cand(d - 1, { label: `소포 배달 (${M.B.n})`, key: 'E', fn: () => { sfx('door'); this.finish(); } });
    }
    if (M.kind === 'photo' && d < (T.r || 12)) cand(d - 1, { label: `사진 찍기 (${T.n})`, key: 'E', fn: () => { CINE.init(); CINE.flash(0.9, 500); sfx('ui'); this.finish(); } });
  },
  finish() {
    const M = this.mission; if (!M) return; this.mission = null; UI.waypoint = null;
    const r = ECON.net(M.reward, 'mission'); ME.money += r.net; sfx('cash');
    const S = this.S(); S.missions = (S.missions | 0) + 1;
    CINE.big('의뢰 완료', `${MISSION_NAMES[M.kind]} · +${fmtMoney(r.net)}${r.tax ? ` (세금 -${fmtMoney(r.tax)})` : ''}`, '#7fd88a', 2800);
    this.ev('mission'); this.updateHud(); saveGame();
  },
  fail(why) { if (!this.mission) return; this.mission = null; UI.waypoint = null; toast(why, 3500); sfx('error'); this.updateHud(); },
  // ---------- 현상금 ----------
  bounties() { const B = (ECON.E && ECON.E.bounty) || {}; const now = Date.now(); return Object.entries(B).filter(([id, b]) => b && now - b.t < BOUNTY_MS); },
  openBounty() {
    const list = this.bounties();
    const items = list.sort((x, y) => y[1].amt - x[1].amt).map(([id, b]) => { const rp = G.players.get(id); const mine = id === ME.id; return { ic: '', t: b.n + (mine ? ' (나)' : ''), p: fmtMoney(b.amt), d: mine ? '나에게 걸린 현상금 — 다른 플레이어가 노린다!' : rp ? `접속 중 · ${whereTxt(anchorOf(rp).x, anchorOf(rp).z)} · 누르면 위치 표시` : '지금은 접속해 있지 않다', fn: () => { if (rp && !mine) { const q = anchorOf(rp); NAV.mark(q.x, q.z, `현상금 · ${b.n}`); } } }; });
    if (!items.length) items.push({ ic: '', t: '걸린 현상금이 없다', p: '', d: '처음으로 걸어볼까?', fn: () => { } });
    items.push({ ic: '', t: '현상금 걸기', p: '', d: G.online ? '접속 중인 다른 플레이어에게 · 처치한 사람이 받는다' : '온라인에서만 쓸 수 있다', dis: !G.online || !G.players.size, disMsg: '같은 방에 다른 플레이어가 있어야 한다', fn: () => setTimeout(() => this.pickBounty(), 30) });
    UI.openMenu('현상금', '현상금이 걸린 사람을 <b>처치</b>하면 그 돈을 받는다 · 40분이 지나면 사라진다 · 지도에 빨간 글씨로 표시', items);
  },
  pickBounty() {
    const ps = [...G.players.values()].filter(rp => rp.id !== ME.id);
    UI.openMenu('현상금 걸 사람', '누구에게 걸까?', ps.map(rp => ({ ic: '', t: rp.name, p: '', d: jobIcon(rp.jb) ? (JOB_BY[rp.jb] || {}).name : '', fn: () => setTimeout(() => {
      UI.openMenu(`${rp.name}에게 현상금`, '돈은 바로 빠지고, 처치한 사람이 가져간다 (환불 없음)', BOUNTY_AMTS.map(amt => ({ ic: '', t: fmtMoney(amt), p: amt, fn: () => { ECON.req({ a: 'bounty', t: rp.id, amt }); toast(`${rp.name}에게 현상금 ${fmtMoney(amt)}을 걸었다`); } })));
    }, 30) })));
  },
  onBounty(m) { const amt = Math.max(0, +m.amt || 0); ME.money += amt; this.S().bounty = 1; sfx('cash'); CINE.big('현상금 획득', `${m.n || ''} · +${fmtMoney(amt)}`, '#ffd34a', 3000); saveGame(); },
  // ---------- 랭킹 (계정 서버) ----------
  async openRank(kind = 'm') {
    if (!NET.server()) { UI.openMenu('랭킹', '랭킹은 온라인 서버에 연결된 빌드에서만 볼 수 있다', []); return; }
    UI.openMenu('랭킹', '불러오는 중…', []); let r = null;
    try { r = await (await fetch(NET.server() + '/rank', { cache: 'no-store' })).json(); } catch (e) { }
    if (!UI.menuOpen) return; if (!r || !r.money) { UI.openMenu('랭킹', '서버에서 랭킹을 가져오지 못했다 — 잠시 뒤 다시', []); return; }
    const me = ACCT.on ? ACCT.nick : null; const L = kind === 'a' ? r.ach : r.money;
    const items = [{ ic: '', t: kind === 'a' ? '부자 랭킹 보기' : '업적 랭킹 보기', p: '', d: `등록된 시민 ${r.n || 0}명`, fn: () => setTimeout(() => this.openRank(kind === 'a' ? 'm' : 'a'), 30) }];
    L.forEach(([n, v], i) => items.push({ ic: '', t: `${i + 1}위 ${n}${me && n === me ? ' (나)' : ''}`, p: kind === 'a' ? `업적 ${v}개` : fmtMoney(v), d: i === 0 ? '1등' : '', fn: () => { } }));
    UI.openMenu(kind === 'a' ? '업적 랭킹' : '부자 랭킹', me ? `계정 <b>${me}</b> · 저장할 때마다 순위가 갱신된다` : '계정으로 로그인해야 랭킹에 올라간다 (로비에서 가입)', items);
  },
  // ---------- 휴대폰에 들어갈 메뉴 ----------
  phoneItems() {
    const st = this.step(), M = this.mission, nb = this.bounties().length;
    return [
      { ic: '', t: '의뢰 게시판', p: 0, d: M ? `진행 중 · ${this.status(M)}` : '배달 · 사진 · 사냥 · 타임어택 의뢰로 돈 벌기', fn: () => setTimeout(() => this.openBoard(), 30) },
      { ic: '', t: '튜토리얼', p: 0, d: st ? `${this.tut + 1}/${TUT_STEPS.length} ${st.t}` : this.tut === 'done' ? '완료' : '처음부터 따라 하기', fn: () => setTimeout(() => this.openTut(), 30) },
      { ic: '', t: '업적', p: 0, d: `${(ME.ach || []).length}/${ACH.length} 달성`, fn: () => setTimeout(() => this.openAch(), 30) },
      { ic: '', t: '랭킹', p: 0, d: ACCT.on ? '부자 · 업적 순위' : '계정 로그인하면 등록', fn: () => setTimeout(() => this.openRank(), 30) },
      { ic: '', t: '현상금', p: 0, d: nb ? `걸린 현상금 ${nb}건` : '다른 플레이어에게 현상금 걸기', fn: () => setTimeout(() => this.openBounty(), 30) },
    ];
  },
  // ---------- 화면 오른쪽 위 안내 ----------
  makeHud() {
    if (this.hud) return; const h = document.createElement('div'); h.id = 'questHud'; h.className = 'panel';
    h.style.cssText = 'font-size:12px;padding:6px 10px;text-align:right;line-height:1.45;max-width:250px;pointer-events:none;display:none';
    const tr = $('#topR'); if (tr) tr.appendChild(h); this.hud = h;
  },
  updateHud() {
    const h = this.hud; if (!h) return; const st = this.step(), M = this.mission; h.innerHTML = '';
    const line = (head, body, col) => { const b = document.createElement('div'); const t = document.createElement('b'); t.textContent = head; t.style.color = col; b.appendChild(t); if (body) { const s = document.createElement('div'); s.style.cssText = 'opacity:.85;font-size:11px'; s.textContent = body; b.appendChild(s); } h.appendChild(b); };
    if (st) line(`튜토리얼 ${this.tut + 1}/${TUT_STEPS.length} · ${st.t}`, st.h, '#ffd34a');
    if (M) line(`의뢰 · ${MISSION_NAMES[M.kind]} ${fmtMoney(M.reward)}`, this.status(M), '#ffb84a');
    h.style.display = st || M ? '' : 'none';
  },
};
