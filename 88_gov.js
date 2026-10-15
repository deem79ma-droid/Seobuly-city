// @v 2026101501

// ================= 정부 · 공무원 · 장관 · 통계청 · 군 계급 · NPC 주민 명부 =================
//  - NPC는 100명. 이름은 "NPC<번호>" (NPC1 ~ NPC100) 이고 서로 번호로 부른다.
//  - 주민 명부: 번호마다 거주 도시와 직업이 정해져 있다. 통계청 직원(과 장관)만 열람할 수 있다.
//  - 군인은 경력(근무 횟수)에 따라 계급이 오른다. 사단 본부에서 훈련 · 보급 · 경계태세.
const NPC_TOTAL = 100;
const NPC_HOME_COUNT = { plaza: 14, seoburi: 26, jiolle: 16, kaengjibe: 12, disanbay: 12, simone: 6, kualp: 6, chiga: 8 };
const NPC_JOB_COUNT = [['장관', 3], ['공무원', 12], ['통계청 직원', 4], ['군인', 10], ['경찰', 10], ['의사', 5], ['농부', 4], ['택배기사', 4], ['자영업자', 8], ['무직·학생', 40]];
const ARMY_RANKS = [[0, '이병'], [10, '일병'], [25, '상병'], [45, '병장'], [70, '하사'], [100, '중사'], [140, '상사'], [190, '소위'], [250, '중위'], [320, '대위'], [400, '소령'], [520, '대령'], [700, '장군']];
const DUTY_PAY = { police: 900, soldier: 1000, doctor: 900, civil: 600, statoff: 650, minister: 2200 };
const GOV = {
  roster: null, alertUntil: 0, lastRank: -1, cool: {}, chatT: 4,
  nameOf(i) { return 'NPC' + (i + 1); }, // 슬롯 번호(0~99) → NPC1 ~ NPC100
  build() {
    if (this.roster) return this.roster;
    const r = mulberry32(20261015); const sh = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const homes = [], jobs = [];
    for (const k in NPC_HOME_COUNT) for (let i = 0; i < NPC_HOME_COUNT[k]; i++) homes.push(k);
    for (const [j, n] of NPC_JOB_COUNT) for (let i = 0; i < n; i++) jobs.push(j);
    sh(homes); sh(jobs);
    this.roster = []; for (let i = 0; i < NPC_TOTAL; i++) this.roster.push({ n: i + 1, home: homes[i] || 'plaza', job: jobs[i] || '무직·학생' });
    return this.roster;
  },
  homeOf(slot) { const R = this.build()[slot % NPC_TOTAL]; return R ? R.home : 'plaza'; },
  // ---- 군 계급 ----
  rank(exp) { const e = exp == null ? CAREER.of('soldier') : exp; let k = 0; for (let i = 0; i < ARMY_RANKS.length; i++) if (e >= ARMY_RANKS[i][0]) k = i; return k; },
  rankName(exp) { return ARMY_RANKS[this.rank(exp)][1]; },
  rankMul() { return 1 + 0.07 * this.rank(); },
  isOfficer() { return this.rank() >= 7; },
  alertOn() { return G.t < this.alertUntil; },
  promoCheck() {
    if (JOBS.id !== 'soldier') { this.lastRank = -1; return; }
    const k = this.rank(); if (this.lastRank < 0) { this.lastRank = k; return; }
    if (k > this.lastRank) { this.lastRank = k; announce('🪖 진급!', `${ARMY_RANKS[k][1]} (근무 ${CAREER.of('soldier')}회) · 수당 +${Math.round(k * 7)}%`); sfx('levelup'); NET.send({ t: 'chat', m: `🪖 ${ME.name} — ${ARMY_RANKS[k][1]} 진급`, sys: 1 }); }
  },
  // 2분마다 근무 수당 (직업별) — 군인은 계급·경계태세 반영
  dutyPay(id) {
    let n = DUTY_PAY[id]; if (!n) return;
    if (id === 'soldier') n *= this.rankMul() * (this.alertOn() ? 1.5 : 1);
    JOBS.pay(n, id === 'soldier' ? `${this.rankName()} 근무 수당 (2분)` : '근무 수당 (2분)');
  },
  armyHQ() { return { x: ARMY.x1 - 26, z: ARMY.gz }; },
  armyMenu() {
    const e = CAREER.of('soldier'), k = this.rank(); const nx = ARMY_RANKS[k + 1]; const now = G.t;
    const cdTrain = Math.max(0, Math.ceil((this.cool.train || 0) - now)), cdSup = Math.max(0, Math.ceil((this.cool.sup || 0) - now));
    UI.openMenu('🪖 서불리 육군 제1사단 본부', `<b>${ARMY_RANKS[k][1]}</b> · 근무 ${e}회${nx ? ` · 다음 계급 ${nx[1]}까지 ${nx[0] - e}회` : ' · 최고 계급'}${this.alertOn() ? ' · <b style="color:#ff6a3a">경계태세 발령 중</b>' : ''}`, [
      { ic: '', t: '계급표', p: '', d: ARMY_RANKS.map(q => `${q[1]} ${q[0]}`).join(' · '), stay: true, fn: () => { } },
      { ic: '', t: '체력 단련 훈련', p: '', d: '12초 · 근무 횟수 +1 · 쿨타임 90초', dis: cdTrain > 0, disMsg: `⏳ ${cdTrain}초 뒤에 가능`, fn: () => { this.cool.train = G.t + 90; UI.closeMenu(); JOBS.channel(12, '🪖 훈련 중', () => { JOBS.pay(450, '훈련 수당'); JOBS.later(); }); } },
      { ic: '', t: '보급품 수령', p: '', d: k >= 3 ? '소총탄 30발 · 구급상자 1개 · 쿨타임 10분' : '병장부터 수령 가능', dis: k < 3 || cdSup > 0, disMsg: k < 3 ? '병장 이상만 수령 가능' : `⏳ ${Math.ceil(cdSup / 60)}분 뒤에 가능`, fn: () => { this.cool.sup = G.t + 600; ME.ammo.rifle = (ME.ammo.rifle || 0) + 30; ME.inv.medkit = (ME.inv.medkit | 0) + 1; UI.updateInv && UI.updateInv(); toast('📦 보급품 수령: 소총탄 30 · 구급상자 1', 3500); sfx('cash'); saveGame(); } },
      { ic: '', t: this.alertOn() ? '경계태세 해제' : '경계태세 발령', p: '', d: '소위(장교) 이상 · 10분간 근무 수당 x1.5 · 전 서버 공지', dis: !this.isOfficer(), disMsg: '장교(소위 이상)만 발령할 수 있다', fn: () => { if (this.alertOn()) { this.alertUntil = 0; announce('🪖 경계태세 해제', ''); } else { this.alertUntil = G.t + 600; announce('🪖 경계태세 발령', `${ARMY_RANKS[k][1]} ${ME.name} · 10분간`); NET.send({ t: 'chat', m: `🚨 군 경계태세 발령 — ${ARMY_RANKS[k][1]} ${ME.name}`, sys: 1 }); } } },
      { ic: '', t: '전역 (군인 그만두기)', p: '', d: '무직이 된다 · 계급과 경력은 기록에 남는다', fn: () => JOBS.apply('none') },
    ]);
  },
  // ---- 정부청사 ----
  govtMenu(f) {
    const id = JOBS.id; const pol = (typeof ECON !== 'undefined' && ECON.E.pol.length) ? ECON.P().map(p => p.name).join(' · ') : '없음';
    const items = [
      { ic: '', t: '공무원 지원', p: '', d: '시험 응시료 · 경력 필요 · 서류 심사' + CAREER.reqText('civil'), dis: id === 'civil' || !!CAREER.why('civil'), disMsg: id === 'civil' ? '이미 공무원이다' : (CAREER.why('civil') || ''), fn: () => JOBS.apply('civil') },
      { ic: '', t: '장관 임명 지원', p: '', d: '공무원 경력이 쌓여야 한다 · 심사가 오래 걸린다' + CAREER.reqText('minister'), dis: id === 'minister' || !!CAREER.why('minister'), disMsg: id === 'minister' ? '이미 장관이다' : (CAREER.why('minister') || ''), fn: () => JOBS.apply('minister') },
      { ic: '', t: '현재 국가 정책', p: '', d: pol, stay: true, fn: () => { } },
      { ic: '', t: '지역 규정집', p: 0, d: '지역별 제한속도 · 벌금 · 총기 규정', fn: () => RULES.card() },
      { ic: '', t: '법전 보기', p: 0, d: '죄목별 등급 · 벌금 · 형량', fn: () => POLICE.showCard('서불리 법전', '', '죄목 · 형량 · 벌금', lawbookHtml()) },
    ];
    if (id === 'minister' || ADMIN.on) items.unshift({ ic: '', t: '장관 집무실', p: '', d: '정책 건의 · 비상 방송 · 군 경계태세 · 주민 통계', fn: () => setTimeout(() => this.ministerMenu(), 30) });
    if (id === 'civil' || id === 'minister') items.push({ ic: '', t: '업무 시작 (책상으로)', p: '', d: '민원 처리 업무를 받는다', fn: () => { JOBS.newTask(); toast('업무를 받았다'); } });
    UI.openMenu('정부청사', `${REGIONS[f.region] ? REGIONS[f.region].name : ''} 정부청사 · 현재 직업 ${JOBS.cur.name}`, items);
  },
  ministerMenu() {
    const now = G.t; const cdB = Math.max(0, Math.ceil((this.cool.bc || 0) - now));
    const items = [];
    if (typeof POLICIES !== 'undefined') for (const k in POLICIES) { const P = POLICIES[k]; items.push({ ic: '', t: '정책 건의: ' + P.name, p: '', d: P.d, dis: now < (this.cool.sug || 0), disMsg: '⏳ 건의는 3분에 한 번', fn: () => { this.cool.sug = G.t + 180; const m = `장관 ${ME.name}이(가) 대통령에게 "${P.name}" 정책을 건의했다`; NET.send({ t: 'chat', m: `📜 ${m}`, sys: 1 }); announce('📜 정책 건의', P.name); } }); }
    items.unshift(
      { ic: '', t: '국가 비상 방송', p: '', d: '전 서버에 공지 · 쿨타임 5분', dis: cdB > 0, disMsg: `⏳ ${Math.ceil(cdB / 60)}분 뒤에 가능`, fn: () => { this.cool.bc = G.t + 300; announce('📢 국가 비상 방송', `장관 ${ME.name}`); NET.send({ t: 'chat', m: `📢 [국가 비상 방송] 장관 ${ME.name} — 시민 여러분은 안전에 유의하십시오`, sys: 1 }); } },
      { ic: '', t: '군 경계태세 지시', p: '', d: '10분간 군인 수당 x1.5 (본인 클라이언트 기준) · 전 서버 공지', fn: () => { this.alertUntil = G.t + 600; announce('🪖 경계태세 지시', `장관 ${ME.name}`); NET.send({ t: 'chat', m: `🚨 장관 ${ME.name} — 군 경계태세 지시`, sys: 1 }); } },
      { ic: '', t: '주민 통계 보고', p: '', d: '도시별 인구 · 직업별 현황', fn: () => setTimeout(() => this.censusMenu(), 30) },
    );
    UI.openMenu('장관 집무실', `장관 ${ME.name}`, items);
  },
  // ---- 통계청 ----
  playersByRegion() {
    const out = {}; const add = (x, z) => { const R = regionAt(x, z); if (R && R !== 'sea') out[R] = (out[R] || 0) + 1; };
    add(ME.x, ME.z); for (const rp of G.players.values()) add(rp.x, rp.z); return out;
  },
  canCensus() { return ADMIN.on || JOBS.id === 'statoff' || JOBS.id === 'minister'; },
  statsMenu(f) {
    const R = this.build(); const id = JOBS.id; const items = [
      { ic: '', t: '서불리 총인구', p: '', d: `NPC ${R.length}명 · 접속 플레이어 ${1 + G.players.size}명`, stay: true, fn: () => { } },
      { ic: '', t: '통계청 직원 지원', p: '', d: '시험 응시료 · 공무원 경력 필요 · 서류 심사' + CAREER.reqText('statoff'), dis: id === 'statoff' || !!CAREER.why('statoff'), disMsg: id === 'statoff' ? '이미 통계청 직원이다' : (CAREER.why('statoff') || ''), fn: () => JOBS.apply('statoff') },
    ];
    if (this.canCensus()) items.unshift({ ic: '', t: '주민 등록 현황 (도시별)', p: '', d: '몇 명이 어느 도시에 사는지 · NPC 번호 명단', fn: () => setTimeout(() => this.censusMenu(), 30) }, { ic: '', t: '직업별 현황', p: '', d: 'NPC 100명의 직업 분포', fn: () => this.jobCard() });
    else items.push({ ic: '', t: '상세 통계 열람', p: '', d: '통계청 직원 · 장관만 볼 수 있다', dis: true, disMsg: '🔒 통계청 직원 또는 장관만 열람할 수 있다', fn: () => { } });
    if (id === 'statoff') items.push({ ic: '', t: '업무 시작 (집계 작업)', p: '', d: '통계 집계 업무를 받는다', fn: () => { JOBS.newTask(); toast('업무를 받았다'); } });
    UI.openMenu('통계청', '서불리 통계청 · 주민 등록 관리', items);
  },
  censusMenu() {
    if (!this.canCensus()) { toast('🔒 통계청 직원 또는 장관만 열람할 수 있다'); return; }
    const R = this.build(); const pl = this.playersByRegion(); const items = [];
    for (const k in NPC_HOME_COUNT) {
      const list = R.filter(q => q.home === k); const nm = (REGIONS[k] || { name: k }).name;
      items.push({ ic: '', t: `${nm} — NPC ${list.length}명`, p: '', d: `플레이어 현재 ${pl[k] || 0}명 · 눌러서 명단 보기`, fn: () => POLICE.showCard(`${nm} 주민 명단`, '', `NPC ${list.length}명 · 플레이어 ${pl[k] || 0}명`, list.map(q => `<div class="vr"><span>NPC${q.n}</span><b>${q.job}</b></div>`).join('')) });
    }
    UI.openMenu('주민 등록 현황', `총 NPC ${R.length}명 (NPC1 ~ NPC${R.length})`, items);
  },
  jobCard() {
    const R = this.build(); const c = {}; for (const q of R) (c[q.job] = c[q.job] || []).push(q.n);
    POLICE.showCard('직업별 현황', '', `NPC ${R.length}명`, Object.keys(c).map(j => `<div class="vr"><span>${j} ${c[j].length}명</span><b>${c[j].length > 14 ? 'NPC' + c[j].slice(0, 14).join(', ') + ' …' : 'NPC' + c[j].join(', ')}</b></div>`).join(''));
  },
  // ---- NPC끼리 번호로 부르며 수다 ----
  tick(dt) {
    if ((this.chatT -= dt) > 0) return; this.chatT = rnd(5, 9);
    const a = anchorOf(ME); const near = []; for (const p of PEDS) if (p.char && p.char.root.visible && (p.state === 'walk' || p.state === 'idle' || p.state === 'talk' || p.state === 'sit' || p.state === 'loiter') && p.kind !== 'police' && Math.abs(p.x - a.x) < 28 && Math.abs(p.z - a.z) < 28) near.push(p);
    for (let i = 0; i < near.length; i++) for (let j = i + 1; j < near.length; j++) {
      const p = near[i], q = near[j]; if (Math.hypot(p.x - q.x, p.z - q.z) > 4.5) continue;
      const A = p.id + 1, B = q.id + 1; const L = pick([[`NPC${B}, 어디 가?`, `NPC${A}, 그냥 산책 중이야`], [`어, NPC${B}! 오랜만이다`, `NPC${A}! 잘 지냈어?`], [`NPC${B}, 오늘 일 많았어?`, `응 NPC${A}, 완전 지쳤어…`], [`NPC${B} 들었어? 요즘 조심해야 돼`, `알아 NPC${A}, 뉴스 봤어`], [`NPC${B}, 밥 먹었어?`, `아직이야 NPC${A}, 같이 가자`]]);
      p.char.say(L[0], 3); setTimeout(() => { if (q.char && q.state !== 'dead' && q.state !== 'parked') q.char.say(L[1], 3); }, 1800); return;
    }
  },
};
