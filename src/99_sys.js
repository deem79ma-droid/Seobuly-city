// @v 2026101802

// ================= 🏙️ 서불리 생활 시스템 10종 =================
// GTA식 "때리고 훔치고 달리기"가 아니라, 도시 안에서 시민으로 살아가는 재미.
//  1 주민 조례 투표   2 내 가게 운영   3 사건 수사   4 재난 복구 봉사   5 서불 증시
//  6 이웃 관계        7 마을 축제      8 도시 청결도   9 서불리 일보     10 칭호·업적
// 전부 폰 > "서불리 일보 · 도시 생활" 한 곳에서 열고, 상태는 세이브에 같이 저장된다.
const SYS_ORDS = {
  price: { ic: '🏷️', n: '물가 안정 조례', d: '상점 가격 -8%' },
  wage: { ic: '💼', n: '근로자 보호 조례', d: '직업 수당 +8%' },
  grant: { ic: '🎁', n: '주민 지원금 조례', d: '5분마다 지원금 ₩2,000' },
};
const SYS_STOCKS = [['서불전자', 5200], ['아가톤광업', 2300], ['캥지식품', 3100], ['디산해운', 4100], ['쿠알바이오', 6800]];
const SYS_NEWS = [
  [0, 0.09, '서불전자 신제품 호평, 주가 급등'], [0, -0.1, '서불전자 공장 정전 사고, 주가 하락'],
  [1, 0.12, '아가톤섬에서 새 광맥 발견'], [1, -0.12, '아가톤광업 채굴 사고 조사'],
  [2, 0.08, '캥지식품 신메뉴 대박'], [2, -0.09, '캥지식품 위생 논란'],
  [3, 0.1, '디산해운 신항로 개설'], [3, -0.08, '디산해운 태풍으로 운항 중단'],
  [4, 0.13, '쿠알바이오 신약 임상 성공'], [4, -0.13, '쿠알바이오 임상 중단'],
];
const SYS_NB = [
  { id: 'a', name: '박말순 할머니', ic: '👵', gift: '따뜻한 차', help: '장보기 짐 들어드리기' },
  { id: 'b', name: '이도윤', ic: '🧑‍🎤', gift: '커피', help: '이삿짐 나르기' },
  { id: 'c', name: '최만수 아저씨', ic: '👨‍🔧', gift: '막걸리', help: '담장 고치기' },
];
const SYS_SPOTS = [{ x: 0, z: 40, name: '이벤트광장' }, { x: 580, z: -60, name: '서불리 중심가' }, { x: 900, z: 200, name: '서불리 남부' }];
const SYS_NAMES = ['김하늘', '박지훈', '이서연', '최민재', '정유나', '강도현', '조수아', '윤태호'];
const SYS_TITLES = [
  ['vol', '봉사왕', '봉사·복구를 8번 했다', d => d.st.vol >= 8, 20000], ['det', '명탐정', '사건을 3건 해결했다', d => d.st.det >= 3, 30000],
  ['inv', '큰손', '주식으로 5만 원 이상 벌었다', d => d.st.gain >= 50000, 30000], ['boss', '사장님', '가게 3레벨 달성', d => d.shop.lv >= 3, 20000],
  ['nb', '이웃사촌', '이웃과 친밀도 60', d => SYS_NB.some(n => (d.nb[n.id] || 0) >= 60), 15000], ['cln', '청소부', '청소를 12번 했다', d => d.st.cln >= 12, 15000],
  ['civ', '시민 대표', '조례를 2번 통과시켰다', d => d.st.ord >= 2, 25000], ['fes', '축제 마니아', '축제에 3번 참가했다', d => d.st.fes >= 3, 15000],
];
const SYS = {
  d: null, _t: 0, _n: 0, _evT: 0, ev: null, news: [],
  fresh() { return { ord: { act: {}, vote: null, cd: 0 }, shop: { lv: 0, cash: 0 }, px: {}, own: {}, cost: {}, nb: {}, nbT: {}, clean: 70, cs: null, caseT: 300, dis: null, disT: 600, fes: null, fesT: 900, st: { vol: 0, det: 0, gain: 0, cln: 0, ord: 0, fes: 0 }, tit: [], cur: '', log: [] }; },
  load(sv) {
    const s = sv && sv.sys, f = this.fresh(); this.d = f;
    if (s && typeof s === 'object') { for (const k in f) if (s[k] !== undefined && typeof s[k] === typeof f[k]) f[k] = s[k]; f.st = Object.assign(f.st, s.st || {}); f.ord.act = f.ord.act || {}; f.ord.vote = null; f.tit = Array.isArray(f.tit) ? f.tit.map(String) : []; f.log = Array.isArray(f.log) ? f.log.slice(-12).map(String) : []; }
    for (const [n, p] of SYS_STOCKS) if (!(f.px[n] > 0)) f.px[n] = p;
  },
  save() { return { sys: this.d || this.fresh() }; },
  say(m) { if (!this.d) return; this.d.log.push(m); if (this.d.log.length > 12) this.d.log.shift(); },
  // ----- 다른 시스템이 부르는 값 -----
  ordOn(k) { return !!(this.d && this.d.ord.act[k] > 0); },
  priceMul() { return this.ordOn('price') ? 0.92 : 1; },
  wageMul() { return this.ordOn('wage') ? 1.08 : 1; },
  stat(k, n = 1) { if (!this.d) return; this.d.st[k] = (this.d.st[k] || 0) + n; this.checkTitles(); },
  checkTitles() { const d = this.d; for (const [id, nm, , ok, rw] of SYS_TITLES) if (!d.tit.includes(id) && ok(d)) { d.tit.push(id); if (!d.cur) d.cur = id; ME.money += rw; announce('🏅 칭호 획득', `「${nm}」 +${fmtMoney(rw)}`); sfx('levelup'); this.say(`칭호 「${nm}」을 얻었다`); } },
  title() { const t = SYS_TITLES.find(x => x[0] === (this.d && this.d.cur)); return t ? t[1] : ''; },
  // ----- 매 프레임 -----
  tick(dt) {
    const d = this.d; if (!d || !G.started || ADMIN.on) return;
    this._n += dt; if (this._n < 1) return; const s = this._n; this._n = 0;
    // 조례
    const o = d.ord; o.cd = Math.max(0, o.cd - s);
    for (const k in o.act) { o.act[k] -= s; if (o.act[k] <= 0) { delete o.act[k]; this.news.push(`📜 ${SYS_ORDS[k].n} 효력이 끝났다`); } }
    if (o.act.grant && ((this._g = (this._g || 0) + s) >= 300)) { this._g = 0; ME.money += 2000; toast('🎁 주민 지원금 ₩2,000'); sfx('cash'); }
    if (o.vote) { o.vote.t -= s; if (o.vote.t <= 0) this.finishVote(); }
    // 가게 (60초마다 매출)
    if (d.shop.lv > 0 && ((this._s = (this._s || 0) + s) >= 60)) { this._s = 0; const m = (1 + REP.v / 300) * (d.clean >= 80 ? 1.1 : d.clean < 30 ? 0.85 : 1) * (this.ordOn('price') ? 1.05 : 1); d.shop.cash = Math.min(d.shop.lv * 400 * 30, d.shop.cash + Math.round(400 * d.shop.lv * m)); }
    // 증시 (20초마다 변동 · 90초마다 뉴스)
    if ((this._p = (this._p || 0) + s) >= 20) { this._p = 0; for (const [n, base] of SYS_STOCKS) { let p = d.px[n]; p = p * (1 + rnd(-0.03, 0.03)) + (base - p) * 0.01; d.px[n] = Math.max(100, Math.round(p)); } }
    if ((this._q = (this._q || 0) + s) >= 90) { this._q = 0; const e = pick(SYS_NEWS), nm = SYS_STOCKS[e[0]][0]; d.px[nm] = Math.max(100, Math.round(d.px[nm] * (1 + e[1]))); this.news.push(`📈 ${e[2]} (${e[1] > 0 ? '+' : ''}${Math.round(e[1] * 100)}%)`); this.lastEv = e; }
    // 청결도
    d.clean = Math.max(0, d.clean - s / 60);
    // 사건 · 재난 · 축제 타이머
    if (!d.cs && (d.caseT -= s) <= 0) this.newCase();
    if (d.dis) { d.dis.t -= s; if (d.dis.t <= 0) { this.news.push('🌧️ 재난 복구 작업이 마무리됐다'); d.dis = null; } } else if ((d.disT -= s) <= 0) this.newDisaster();
    if (d.fes) { d.fes.t -= s; if (d.fes.t <= 0) { this.news.push(`🎪 ${d.fes.name} 축제가 끝났다`); d.fes = null; } else if (!d.fes.got && !INTERIOR.cur && !ME.vehicle) { const a = anchorOf(ME); if (Math.hypot(a.x - d.fes.x, a.z - d.fes.z) < 28) { d.fes.got = 1; ME.money += 5000; ME.stamina = 100; REP.add(3, '마을 축제'); this.stat('fes'); announce('🎪 축제 참가!', '+₩5,000 · 스태미나 가득'); sfx('levelup'); if (UI.waypoint && UI.waypoint.label === '🎪 축제') UI.waypoint = null; } } } else if ((d.fesT -= s) <= 0) this.newFestival();
    // 알림 큐
    while (this.news.length) { const m = this.news.shift(); this.say(m); toast(m, 4000); }
  },
  newCase() {
    const d = this.d, ns = [...SYS_NAMES].sort(() => Math.random() - 0.5).slice(0, 3), cols = ['빨간', '파란', '검은', '초록'], hs = ['키가 큰', '키가 작은', '보통 키의'];
    const sus = ns.map((n, i) => ({ n, c: cols[(i + Math.floor(rnd(0, 4))) % 4], h: hs[i % 3] })); const bad = Math.floor(rnd(0, 3));
    const types = ['편의점 금품 도난', '주차된 자전거 도난', '공원 벤치 파손'];
    d.cs = { name: pick(types), sus, bad, clue: 0, done: 0 }; d.caseT = 600; this.news.push(`🔎 사건 발생: ${d.cs.name} — 폰 > 도시 생활 > 사건 수사`);
  },
  newDisaster() { const d = this.d; const t = pick([['🌧️ 폭우', '침수 피해'], ['⚡ 정전', '변전소 고장'], ['🌪️ 강풍', '간판 낙하']]); d.dis = { n: t[0], what: t[1], t: 300, left: 3 }; d.disT = 900; this.news.push(`${t[0]} ${t[1]} 발생! 복구 봉사자를 모집한다 (폰 > 도시 생활)`); },
  newFestival() { const d = this.d, sp = pick(SYS_SPOTS); d.fes = { x: sp.x, z: sp.z, name: sp.name, t: 240, got: 0 }; d.fesT = 1200; this.news.push(`🎪 ${sp.name}에서 마을 축제! 4분 안에 가면 보상`); try { NAV.mark(sp.x, sp.z, '🎪 축제'); } catch (e) { } },
  // ----- 메뉴 -----
  phoneItem() { return { ic: '🏙️', t: '서불리 일보 · 도시 생활', p: 0, d: '조례·가게·수사·증시·이웃·축제·칭호', fn: () => setTimeout(() => this.open(), 30) }; },
  open() {
    const d = this.d; if (!d) return;
    const flag = (c, t) => c ? ` · ${t}` : '';
    UI.openMenu('🏙️ 서불리 생활', `${this.title() ? '🏅 ' + this.title() + ' · ' : ''}평판 ${REP.name()} · 청결도 ${Math.round(d.clean)}%`, [
      { ic: '📰', t: '서불리 일보', p: '', d: d.log.length ? d.log[d.log.length - 1] : '오늘은 조용하다', fn: () => setTimeout(() => this.paper(), 30) },
      { ic: '🗳️', t: '주민 조례 투표', p: '', d: Object.keys(d.ord.act).length ? '시행 중: ' + Object.keys(d.ord.act).map(k => SYS_ORDS[k].n).join(', ') : '조례 발의 · 주민 투표', fn: () => setTimeout(() => this.ordMenu(), 30) },
      { ic: '🏪', t: '내 가게', p: '', d: d.shop.lv ? `${d.shop.lv}레벨 · 쌓인 매출 ${fmtMoney(d.shop.cash)}` : '₩300,000에 개업', fn: () => setTimeout(() => this.shopMenu(), 30) },
      { ic: '🔎', t: '사건 수사', p: '', d: d.cs ? d.cs.name : '지금은 사건이 없다', fn: () => setTimeout(() => this.caseMenu(), 30) },
      { ic: '🚧', t: '재난 복구 봉사', p: '', d: d.dis ? `${d.dis.n} ${d.dis.what} · 남은 작업 ${d.dis.left}` : '지금은 재난이 없다', fn: () => setTimeout(() => this.disMenu(), 30) },
      { ic: '📈', t: '서불 증시', p: '', d: '5개 종목 · 뉴스에 따라 움직인다', fn: () => setTimeout(() => this.stockMenu(), 30) },
      { ic: '🏘️', t: '이웃 관계', p: '', d: '선물·도와드리기로 친해지기', fn: () => setTimeout(() => this.nbMenu(), 30) },
      { ic: '🎪', t: '마을 축제', p: '', d: d.fes ? `${d.fes.name} · ${Math.ceil(d.fes.t)}초 남음${d.fes.got ? ' (참가 완료)' : ''}` : '다음 축제를 기다리는 중', fn: () => { if (d.fes && !d.fes.got) { NAV.mark(d.fes.x, d.fes.z, '🎪 축제'); UI.closeMenu(); } else toast(d.fes ? '이미 참가했다' : '지금은 축제가 없다'); } },
      { ic: '🧹', t: '도시 청소 봉사', p: '', d: `청결도 ${Math.round(d.clean)}% · 20초 청소 +₩1,200`, fn: () => { UI.closeMenu(); JOBS.channel(20, '🧹 도시 청소 중', () => { d.clean = Math.min(100, d.clean + 8); ME.money += 1200; REP.add(1, '도시 청소'); this.stat('cln'); this.stat('vol', 0); toast('🧹 거리가 깨끗해졌다 +₩1,200'); sfx('cash'); }); } },
      { ic: '🏅', t: '칭호 · 업적', p: '', d: `${d.tit.length}/${SYS_TITLES.length} 획득${flag(!!this.title(), '착용: ' + this.title())}`, fn: () => setTimeout(() => this.titleMenu(), 30) },
    ]);
  },
  back() { setTimeout(() => this.open(), 30); },
  paper() {
    const d = this.d, best = SYS_STOCKS.map(([n]) => [n, d.px[n]]).sort((a, b) => b[1] - a[1])[0];
    const L = d.log.slice().reverse().map(m => ({ ic: '•', t: m, p: '', dis: true, disMsg: m }));
    L.unshift({ ic: '📊', t: `청결도 ${Math.round(d.clean)}% · 최고가 ${best[0]} ${best[1].toLocaleString()}원`, p: '', d: `평판 ${REP.name()} · 시행 조례 ${Object.keys(d.ord.act).length}개`, dis: true, disMsg: '도시 현황' });
    UI.openMenu('📰 서불리 일보', '이번 호 주요 소식', L.concat([{ ic: '⬅️', t: '돌아가기', p: '', fn: () => this.back() }]));
  },
  ordMenu() {
    const d = this.d, o = d.ord; const L = [];
    if (o.vote) L.push({ ic: '⏳', t: `투표 진행 중: ${SYS_ORDS[o.vote.k].n}`, p: '', d: `남은 ${Math.ceil(o.vote.t)}초 · 결과를 기다린다`, dis: true, disMsg: '투표가 끝나길 기다려라' });
    else for (const k in SYS_ORDS) { const c = SYS_ORDS[k]; L.push({ ic: c.ic, t: `${c.n} 발의 (₩20,000)`, p: 20000, d: `${c.d} · 20분 시행${o.act[k] ? ' (시행 중 ' + Math.ceil(o.act[k] / 60) + '분)' : ''}`, dis: o.cd > 0, disMsg: `다음 발의까지 ${Math.ceil(o.cd)}초`, fn: () => { o.vote = { k, t: 90 }; o.cd = 240; announce('🗳️ 조례 발의', `${c.n} — 주민 투표 90초`); sfx('ui'); } }); }
    UI.openMenu('🗳️ 주민 조례', '평판이 좋을수록 주민들이 찬성한다', L.concat([{ ic: '⬅️', t: '돌아가기', p: '', fn: () => this.back() }]));
  },
  finishVote() {
    const d = this.d, o = d.ord, v = o.vote; o.vote = null; if (!v) return;
    const yes = Math.round(clamp(50 + REP.v * 0.22 + rnd(-14, 14), 5, 95));
    if (yes > 50) { o.act[v.k] = 1200; this.stat('ord'); this.news.push(`🗳️ ${SYS_ORDS[v.k].n} 가결! (찬성 ${yes}%)`); REP.add(1, '조례 통과'); }
    else this.news.push(`🗳️ ${SYS_ORDS[v.k].n} 부결 (찬성 ${yes}%)`);
  },
  shopMenu() {
    const d = this.d, s = d.shop; const L = [];
    if (!s.lv) L.push({ ic: '🏪', t: '가게 개업 (₩300,000)', p: 300000, d: '1분마다 매출이 쌓인다 · 평판·청결도·물가 조례가 영향', fn: () => { s.lv = 1; s.cash = 0; announce('🏪 개업!', '내 가게가 문을 열었다'); this.checkTitles(); } });
    else {
      L.push({ ic: '💰', t: `매출 수금 ${fmtMoney(s.cash)}`, p: '', d: `레벨 ${s.lv} · 보관 한도 ${fmtMoney(s.lv * 12000)}`, dis: s.cash <= 0, disMsg: '쌓인 매출이 없다', fn: () => { ME.money += s.cash; toast(`💰 매출 ${fmtMoney(s.cash)} 수금`); s.cash = 0; sfx('cash'); } });
      L.push({ ic: '⬆️', t: s.lv >= 5 ? '최고 레벨' : `확장 (₩${(s.lv * 200000).toLocaleString()})`, p: s.lv >= 5 ? '' : s.lv * 200000, d: '매출 +400/분, 한도 증가', dis: s.lv >= 5, disMsg: '이미 최고 레벨', fn: () => { s.lv++; this.checkTitles(); announce('🏪 확장', `${s.lv}레벨`); } });
    }
    UI.openMenu('🏪 내 가게', `평판 ${REP.name()} · 청결도 ${Math.round(d.clean)}% — 둘 다 높을수록 장사가 잘 된다`, L.concat([{ ic: '⬅️', t: '돌아가기', p: '', fn: () => this.back() }]));
  },
  caseMenu() {
    const d = this.d, c = d.cs; if (!c) { UI.openMenu('🔎 사건 수사', '지금은 접수된 사건이 없다. 가끔 새 사건이 들어온다.', [{ ic: '⬅️', t: '돌아가기', p: '', fn: () => this.back() }]); return; }
    const hints = [`목격자: 범인은 ${c.sus[c.bad].c} 옷을 입고 있었다`, `CCTV: 범인은 ${c.sus[c.bad].h} 사람이다`, `이웃 증언: 용의자 중 ${c.sus.filter((x, i) => i !== c.bad)[0].n}은(는) 그 시간에 다른 곳에 있었다`];
    const L = [{ ic: '🔍', t: c.clue >= 3 ? '단서를 모두 모았다' : `단서 수집 (${c.clue}/3)`, p: '', d: '20초 가만히 조사해야 한다', dis: c.clue >= 3, disMsg: '단서를 다 모았다', fn: () => { UI.closeMenu(); JOBS.channel(20, '🔍 단서 수집 중', () => { c.clue++; toast('🔍 ' + hints[c.clue - 1], 6000); sfx('ui'); }); } }];
    for (let i = 0; i < c.clue; i++) L.push({ ic: '📌', t: hints[i], p: '', dis: true, disMsg: hints[i] });
    c.sus.forEach((x, i) => L.push({ ic: '🧍', t: `${x.n} 지목`, p: '', d: `${x.c} 옷 · ${x.h} 사람`, fn: () => { const ok = i === c.bad; if (ok) { ME.money += 15000 + c.clue * 3000; REP.add(6, '사건 해결'); this.stat('det'); announce('🔎 사건 해결!', `${x.n} 검거 · +${fmtMoney(15000 + c.clue * 3000)}`); sfx('levelup'); } else { REP.add(-4, '누명 씌움'); announce('❌ 오답', `${x.n}은(는) 범인이 아니었다 (평판 하락)`); sfx('error'); } this.say(`${c.name} — ${ok ? '해결' : '오답'}`); d.cs = null; d.caseT = 480; } }));
    UI.openMenu('🔎 ' + c.name, '단서를 모은 뒤 범인을 지목하라. 단서가 많을수록 보상이 크고, 틀리면 평판이 깎인다.', L.concat([{ ic: '⬅️', t: '돌아가기', p: '', fn: () => this.back() }]));
  },
  disMenu() {
    const d = this.d, x = d.dis; const L = [];
    if (x) L.push({ ic: '🚧', t: `복구 작업 (남은 ${x.left})`, p: '', d: '25초 · +₩3,000 · 평판 +4', dis: x.left <= 0, disMsg: '작업이 끝났다', fn: () => { UI.closeMenu(); JOBS.channel(25, '🚧 복구 작업 중', () => { if (!d.dis) return; d.dis.left--; ME.money += 3000; REP.add(4, '재난 복구'); this.stat('vol'); toast('🚧 복구 완료 +₩3,000'); sfx('cash'); }); } });
    UI.openMenu('🚧 재난 복구', x ? `${x.n} ${x.what} — 모두가 힘을 합쳐야 한다` : '지금은 재난이 없다', L.concat([{ ic: '⬅️', t: '돌아가기', p: '', fn: () => this.back() }]));
  },
  stockMenu() {
    const d = this.d; const L = [];
    for (const [n] of SYS_STOCKS) {
      const px = d.px[n], have = d.own[n] || 0, avg = have ? Math.round(d.cost[n] / have) : 0;
      L.push({ ic: '📊', t: `${n} ${px.toLocaleString()}원`, p: px, d: `보유 ${have}주${have ? ` · 평단 ${avg.toLocaleString()} (${px >= avg ? '+' : ''}${Math.round((px / avg - 1) * 100)}%)` : ''} · 1주 매수`, stay: true, fn: () => { d.own[n] = have + 1; d.cost[n] = (d.cost[n] || 0) + px; setTimeout(() => this.stockMenu(), 30); } });
      if (have) L.push({ ic: '💵', t: `${n} 전량 매도`, p: '', d: `${(px * have).toLocaleString()}원 · 손익 ${(px * have - d.cost[n]).toLocaleString()}원`, fn: () => { const g = px * have - d.cost[n]; ME.money += px * have; if (g > 0) { d.st.gain += g; } d.own[n] = 0; d.cost[n] = 0; sfx('cash'); toast(`💵 매도 ${fmtMoney(px * have)} (손익 ${g >= 0 ? '+' : ''}${g.toLocaleString()}원)`); this.checkTitles(); setTimeout(() => this.stockMenu(), 30); } });
    }
    UI.openMenu('📈 서불 증시', '뉴스가 뜨면 주가가 움직인다 · 이웃과 친하면 소식을 먼저 알려준다', L.concat([{ ic: '⬅️', t: '돌아가기', p: '', fn: () => this.back() }]));
  },
  nbMenu() {
    const d = this.d; const L = [];
    for (const n of SYS_NB) {
      const a = Math.round(d.nb[n.id] || 0), rdy = !(d.nbT[n.id] > Date.now());
      L.push({ ic: n.ic, t: `${n.name} — 친밀도 ${a}`, p: '', d: a >= 60 ? '믿고 의지하는 사이' : a >= 30 ? '꽤 친한 이웃' : '아직 서먹하다', dis: true, disMsg: n.name });
      L.push({ ic: '🎁', t: `${n.gift} 선물 (₩3,000)`, p: 3000, d: '친밀도 +5', stay: true, fn: () => { d.nb[n.id] = Math.min(100, a + 5); this.checkTitles(); setTimeout(() => this.nbMenu(), 30); } });
      L.push({ ic: '🤝', t: `${n.help}`, p: '', d: '15초 · 친밀도 +4 · 평판 +1', fn: () => { UI.closeMenu(); JOBS.channel(15, '🤝 ' + n.help, () => { d.nb[n.id] = Math.min(100, (d.nb[n.id] || 0) + 4); REP.add(1, n.name + ' 도움'); this.stat('vol'); this.checkTitles(); }); } });
      if (a >= 30) L.push({ ic: '💬', t: `${n.name}의 귀띔`, p: '', d: '이웃이 주식 소문을 알려준다', dis: !rdy, disMsg: '조금 뒤에 다시 물어봐', fn: () => { d.nbT[n.id] = Date.now() + 300000; const e = this.lastEv; toast(e ? `💬 ${n.name}: "${SYS_STOCKS[e[0]][0]} 소식 들었어? ${e[1] > 0 ? '곧 오를 것 같던데' : '요즘 안 좋다던데'}"` : `💬 ${n.name}: "아직 별 소문은 없어"`, 6000); } });
      if (a >= 60) L.push({ ic: '💸', t: `${n.name}의 용돈`, p: '', d: '친한 사이라 가끔 챙겨준다 (₩8,000)', dis: !rdy, disMsg: '조금 뒤에 다시', fn: () => { d.nbT[n.id] = Date.now() + 600000; ME.money += 8000; sfx('cash'); toast(`💸 ${n.name}이(가) 용돈 ₩8,000을 줬다`); } });
    }
    UI.openMenu('🏘️ 이웃 관계', '선물과 도움으로 친해지면 소문과 용돈을 챙겨준다', L.concat([{ ic: '⬅️', t: '돌아가기', p: '', fn: () => this.back() }]));
  },
  titleMenu() {
    const d = this.d;
    UI.openMenu('🏅 칭호 · 업적', `착용: ${this.title() || '없음'}`, SYS_TITLES.map(([id, nm, desc, , rw]) => { const have = d.tit.includes(id); return { ic: have ? '🏅' : '🔒', t: nm, p: '', d: `${desc}${have ? '' : ' · 보상 ' + fmtMoney(rw)}`, dis: !have, disMsg: desc, fn: () => { d.cur = d.cur === id ? '' : id; toast(d.cur ? `🏅 「${nm}」 착용` : '칭호를 벗었다'); setTimeout(() => this.titleMenu(), 30); } }; }).concat([{ ic: '⬅️', t: '돌아가기', p: '', fn: () => this.back() }]));
  },
};
