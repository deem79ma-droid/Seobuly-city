// @v 2026101502
// ================= 도시: 경제 · 대통령 선거 · 정책 · 뉴스 · 법원 · NPC 기억 =================
// 공유 상태(대통령·정책·집값·뉴스)는 방장이 관리하고 모두에게 보낸다. 서버가 있으면 방 저장에 같이 남는다.

// ---------- 정책 ----------
const POLICIES = {
  housing_up: { ic: '🏗️', name: '부동산 규제 완화', d: '집값 +25% · 임대수익 +20%', house: 1.25, rent: 1.2 },
  housing_down: { ic: '🏚️', name: '부동산 규제 강화', d: '집값 -15% · 보유세 2배', house: 0.85, prop: 2 },
  min_wage: { ic: '💵', name: '최저임금 인상', d: '수당 +25% · 일자리 -35% (구조조정 위험)', wage: 1.25, open: 0.65 },
  austerity: { ic: '✂️', name: '긴축 재정', d: '경찰·군인·의사 수당 -30% · 세금 -5%p', pub: 0.7, tax: -0.05 },
  tax_up: { ic: '🧾', name: '증세', d: '세금 +10%p · 생활비 -50% (복지)', tax: 0.1, cost: 0.5 },
  police: { ic: '🚔', name: '치안 강화', d: '형량 +30% · 경찰 수당 +30% · 협박·털기 수익 -30%', sent: 1.3, cop: 1.3, crime: 0.7 },
  stimulus: { ic: '📈', name: '경기 부양', d: '일자리 +25% · 집값 +10% · 물가 +20%', open: 1.25, house: 1.1, cost: 1.2 },
  dereg: { ic: '🏭', name: '기업 규제 완화', d: '택배·자영업·농부·벌목 수입 +20% · 세금 -3%p · 집값 +5%', biz: 1.2, tax: -0.03, house: 1.05 },
};
const PUBLIC_JOBS = ['police', 'soldier', 'doctor', 'civil', 'statoff', 'minister'], BIZ_JOBS = ['delivery', 'selfemp', 'farmer', 'lumber'];
const TERM_MS = 30 * 60 * 1000, ELECTION_MS = 3 * 60 * 1000, AI_SHUFFLE_MS = 12 * 60 * 1000;

const ECON = {
  E: { pres: null, pol: [], hidx: 1, elec: null, news: [], polT: 0, imp: null, aiT: 0, termEnd: 0, bounty: {} },
  _dayLast: null, _hostT: 0, _bcT: 0, hud: null,
  // ---- 계산 ----
  P() { return this.E.pol.map(k => POLICIES[k]).filter(Boolean); },
  prod(f, d = 1) { let v = d; for (const p of this.P()) if (p[f] !== undefined) v *= p[f]; return v; },
  houseMul() { return this.E.hidx * this.prod('house'); },
  rentMul() { return this.prod('rent'); },
  taxRate() { let t = 0.1; for (const p of this.P()) if (p.tax) t += p.tax; return Math.max(0, Math.min(0.4, t)); },
  costMul() { return this.prod('cost'); },
  sentMul() { return this.prod('sent'); },
  crimeMul() { return this.prod('crime'); },
  openness() { return Math.max(0.2, Math.min(1.3, this.prod('open'))); },
  payMul(job) {
    let m = this.prod('wage');
    if (PUBLIC_JOBS.includes(job)) m *= this.prod('pub'); if (job === 'police') m *= this.prod('cop'); if (BIZ_JOBS.includes(job)) m *= this.prod('biz');
    return m;
  },
  // 받는 돈 = 기본 × 정책 배수, 세금 떼고
  net(n, job) { const g = n * this.payMul(job); const tax = Math.round(g * this.taxRate()); return { g: Math.round(g), tax, net: Math.max(0, Math.round(g - tax)) }; },
  presName() { const p = this.E.pres; return p ? (p.ai ? '🤖 ' + p.name : '🏛️ ' + p.name) : '공석'; },
  // ---- 방장: 시간 흐름 ----
  hostTick(dt) {
    if (!G.isHost || !G.started) return; if ((this._hostT -= dt) > 0) return; this._hostT = 2;
    const E = this.E, now = Date.now(); let ch = false;
    // 선거
    if (!E.elec && (!E.pres || now > E.termEnd)) { E.elec = { until: now + ELECTION_MS, c: { ai: { name: 'AI 행정부', v: 0, npc: 25 } }, voted: {} }; this.news('📢 대통령 선거가 시작됐다! 휴대폰 ▶ 🏛️ 정치에서 출마·투표 (3분)'); ch = true; }
    if (E.elec && now > E.elec.until) { this.endElection(); ch = true; }
    // 탄핵
    if (E.imp && now > E.imp.until) { const yes = Object.values(E.imp.v).filter(Boolean).length, n = G.players.size + 1; if (yes > n / 2) { this.news(`⚖️ 탄핵 가결! ${E.pres ? E.pres.name : ''} 대통령 파면 (${yes}/${n})`); E.pres = null; E.pol = []; E.termEnd = 0; } else this.news(`🗳️ 탄핵 부결 (${yes}/${n})`); E.imp = null; ch = true; }
    // AI 대통령: 가끔 정책을 바꾼다
    if (E.pres && E.pres.ai && now > E.aiT) { E.aiT = now + AI_SHUFFLE_MS; const ks = Object.keys(POLICIES); const a = pick(ks); let b = pick(ks); if (b === a) b = pick(ks); E.pol = [...new Set([a, b])]; this.news(`🤖 AI 행정부 새 정책: ${E.pol.map(k => POLICIES[k].ic + ' ' + POLICIES[k].name).join(', ')}`); ch = true; }
    // 집값 지수: 하루(게임 시간)마다 움직인다
    const day = G.day || 0; if (this._hday !== day) { if (this._hday !== undefined) { const drift = 1 + rnd(-0.04, 0.06) + (this.P().some(p => (p.house || 1) > 1) ? 0.03 : 0) - (this.P().some(p => (p.house || 1) < 1) ? 0.03 : 0); E.hidx = Math.max(0.6, Math.min(2.5, E.hidx * drift)); this.news(`🏠 오늘의 집값: ${drift >= 1 ? '▲' : '▼'} ${Math.abs((drift - 1) * 100).toFixed(1)}% (주택 ${fmtMoney(Math.round(350000 * this.houseMul()))})`); ch = true; } this._hday = day; }
    if (ch || (this._bcT -= 2) <= 0) { this._bcT = 30; this.broadcast(); }
  },
  endElection() {
    const E = this.E, el = E.elec; E.elec = null; let best = null;
    for (const [id, c] of Object.entries(el.c)) { c.total = c.v * 10 + c.npc + Math.floor(rnd(0, 15)); /* 플레이어 1표 = 시민 10표 */ if (!best || c.total > best[1].total) best = [id, c]; }
    const res = Object.entries(el.c).map(([id, c]) => `${c.name} ${c.total}표`).join(' · ');
    if (!best || best[0] === 'ai') { E.pres = { id: 'ai', name: 'AI 행정부', ai: 1 }; E.aiT = 0; this.news(`🗳️ 선거 결과: AI 행정부 집권 (${res})`); }
    else { E.pres = { id: best[0], name: best[1].name }; E.pol = []; this.news(`🎉 ${best[1].name} 대통령 당선! (${res}) — 정책 2개를 정할 수 있다`); }
    E.termEnd = Date.now() + TERM_MS;
  },
  news(s) { const E = this.E; E.news.unshift({ s: String(s).slice(0, 120), t: Date.now() }); E.news = E.news.slice(0, 25); if (G.isHost) { this.show(s); this.broadcast(); } },
  show(s) { toast('📰 ' + s, 4200); CINE_EV.news(s); },
  broadcast() { if (G.online && G.isHost) NET.send({ t: 'econ', s: this.E }); },
  apply(s) { if (!s) return; const old = this.E.news[0] && this.E.news[0].t; this.E = Object.assign(this.E, s); const n = this.E.news[0]; if (n && n.t !== old && Date.now() - n.t < 15000) this.show(n.s); },
  // ---- 정치 요청 (게스트 → 방장) ----
  req(o) { if (G.isHost) this.hostReq(o, ME.id, ME.name); else NET.send({ t: 'pol', o }); },
  hostReq(o, fid, fname) {
    const E = this.E, now = Date.now(); if (!o) return;
    if (o.a === 'run' && E.elec && !E.elec.c[fid]) { E.elec.c[fid] = { name: fname, v: 0, npc: 20 }; this.news(`🎤 ${fname} 대통령 출마 선언`); }
    else if (o.a === 'camp' && E.elec && E.elec.c[fid]) { E.elec.c[fid].npc += 6 + Math.floor(rnd(0, 8)); }
    else if (o.a === 'vote' && E.elec && E.elec.c[o.c] && !E.elec.voted[fid]) { E.elec.voted[fid] = 1; E.elec.c[o.c].v += 1; }
    else if (o.a === 'policy' && E.pres && E.pres.id === fid && POLICIES[o.p] && now > E.polT) { if (E.pol.includes(o.p)) E.pol = E.pol.filter(k => k !== o.p); else { E.pol.push(o.p); if (E.pol.length > 2) E.pol.shift(); } E.polT = now + 60000; this.news(`🏛️ ${fname} 대통령 정책 발표: ${E.pol.map(k => POLICIES[k].ic + ' ' + POLICIES[k].name).join(', ') || '정책 없음'}`); }
    else if (o.a === 'impeach' && E.pres && !E.pres.ai && !E.imp) { E.imp = { until: now + 120000, v: { [fid]: 1 } }; this.news(`⚖️ ${fname}, ${E.pres.name} 대통령 탄핵 투표 발의 (2분)`); }
    else if (o.a === 'impvote' && E.imp) { E.imp.v[fid] = o.y ? 1 : 0; }
    else if (o.a === 'news' && typeof o.s === 'string') { if (NET.rate('nw' + fid, 4, 60)) this.news(cleanText(o.s, 120)); return; }
    // ---- 현상금: 걸기 · 처치되면 처치한 사람에게 지급 ----
    else if (o.a === 'bounty' && BOUNTY_AMTS.includes(o.amt) && o.t && o.t !== fid && NET.rate('bt' + fid, 5, 60)) {
      const B = E.bounty || (E.bounty = {}); for (const k in B) if (!B[k] || now - B[k].t > BOUNTY_MS) delete B[k];
      const tn = o.t === ME.id ? ME.name : (G.players.get(o.t) || {}).name; if (!tn) return;
      const b = B[o.t] || { n: tn, amt: 0, t: now }; b.amt += o.amt; b.t = now; b.n = tn; B[o.t] = b;
      this.news(`현상금: ${tn}에게 ${fmtMoney(o.amt)} (총 ${fmtMoney(b.amt)}) — 처치하면 받는다`);
    }
    else if (o.a === 'bhit' && E.bounty && E.bounty[fid] && o.k && o.k !== fid) {
      const b = E.bounty[fid]; delete E.bounty[fid]; if (now - b.t > BOUNTY_MS) { this.broadcast(); return; }
      notifyPlayer(o.k, { t: 'bounty', amt: b.amt, n: b.n }); const kn = o.k === ME.id ? ME.name : (G.players.get(o.k) || {}).name || '누군가';
      this.news(`${kn}, ${b.n}의 현상금 ${fmtMoney(b.amt)} 획득`);
    }
    else if (o.a === 'evq') { NET.send({ t: 'ev', to: fid, v: NPCMEM.rep[fid] || 0 }); return; }
    else if (o.a === 'wit') { const rp = G.players.get(fid); if (rp) { const a = anchorOf(rp); NPCMEM.witness(a.x, a.z, fid, Math.min(8, +o.sev || 1)); } return; }
    this.broadcast();
  },
  // ---- 내 생활: 하루마다 생활비 · 보유세 · 구조조정 ----
  dailyTick() {
    if (!G.started || ME.jail || ADMIN.on) return; const day = G.day || 0;
    if (this._dayLast === null) { this._dayLast = day; return; } if (day === this._dayLast) return; this._dayLast = day;
    const living = Math.round(800 * this.costMul()); let prop = 0; for (const id of HOUSE.keys()) { const b = BUILDINGS[id]; if (b) prop += Math.round(HOUSE.price(b) * 0.004 * this.prod('prop')); }
    const total = living + prop; const paid = Math.min(ME.money, total); ME.money -= paid;
    toast(`🧾 하루 생활비 ${fmtMoney(living)}${prop ? ` · 보유세 ${fmtMoney(prop)}` : ''}${paid < total ? ' (돈이 모자라 일부만 냈다)' : ''}`, 3500);
    const op = this.openness(); if (JOBS.id !== 'none' && !JOBS.isGang() && op < 0.75 && Math.random() < (0.75 - op) * 0.8) { const old = JOBS.cur.name; JOBS.set('none', true); announce('📉 구조조정', `경기 악화로 ${old}에서 해고됐다`); }
  },
  jobLocked(id) { if (id === 'none' || id === 'gangA' || id === 'gangB') return false; const op = this.openness(); const h = hashStr(id + ':' + (this.E.pol.join(','))) % 100 / 100; return op < 1 && h > op + 0.15; }, // 일자리가 줄면 일부 직업은 채용 중단
  open() {
    const E = this.E; const items = [];
    items.push({ ic: '🏛️', t: `대통령: ${this.presName()}`, p: '', d: E.pres && !E.pres.ai ? `임기 ${Math.max(0, Math.ceil((E.termEnd - Date.now()) / 60000))}분 남음` : 'AI 행정부가 12분마다 정책을 바꾼다', fn: () => { } , stay: true });
    items.push({ ic: '📜', t: '현재 정책', p: '', d: E.pol.length ? E.pol.map(k => POLICIES[k].ic + ' ' + POLICIES[k].name).join(' · ') : '없음', stay: true, fn: () => { } });
    items.push({ ic: '📊', t: '경제 지표', p: '', d: `세금 ${Math.round(this.taxRate() * 100)}% · 집값 ×${this.houseMul().toFixed(2)} · 일자리 ${Math.round(this.openness() * 100)}% · 물가 ×${this.costMul().toFixed(2)}`, stay: true, fn: () => { } });
    if (E.elec) {
      const left = Math.ceil((E.elec.until - Date.now()) / 1000);
      if (!E.elec.c[ME.id]) items.push({ ic: '🎤', t: '대통령 출마', p: 20000, d: `선거 ${left}초 남음 · 등록비`, fn: () => this.req({ a: 'run' }) });
      else items.push({ ic: '📣', t: '유세하기 (NPC 표 +6~14)', p: 10000, d: '돈을 쓸수록 시민 표가 늘어난다', fn: () => { this.req({ a: 'camp' }); toast('📣 유세 완료!'); } });
      for (const [id, c] of Object.entries(E.elec.c)) items.push({ ic: '🗳️', t: `${c.name}에게 투표`, p: '', d: E.elec.voted[ME.id] ? '이미 투표했다' : '한 번만 투표 가능', dis: !!E.elec.voted[ME.id], disMsg: '이미 투표했다', fn: () => { this.req({ a: 'vote', c: id }); toast('🗳️ 투표 완료'); } });
    }
    if (E.pres && E.pres.id === ME.id) for (const [k, p] of Object.entries(POLICIES)) items.push({ ic: p.ic, t: (E.pol.includes(k) ? '✅ ' : '') + p.name, p: '', d: p.d, fn: () => this.req({ a: 'policy', p: k }) });
    if (E.pres && !E.pres.ai && E.pres.id !== ME.id && !E.imp) items.push({ ic: '⚖️', t: '탄핵 발의', p: 5000, d: '2분 동안 과반이 찬성하면 파면', fn: () => this.req({ a: 'impeach' }) });
    if (E.imp) items.push({ ic: '⚖️', t: '탄핵 찬성', p: '', d: '', fn: () => this.req({ a: 'impvote', y: 1 }) }, { ic: '🙅', t: '탄핵 반대', p: '', d: '', fn: () => this.req({ a: 'impvote', y: 0 }) });
    UI.openMenu('🏛️ 정치 · 경제', '대통령과 정책에 따라 수입·집값·일자리·형량이 바뀐다', items);
  },
  openNews() { const n = this.E.news; UI.openMenu('📰 서불리 일보', n.length ? '최근 소식' : '아직 소식이 없다', n.slice(0, 15).map(x => ({ ic: '🗞️', t: x.s, p: '', d: Math.max(0, Math.round((Date.now() - x.t) / 60000)) + '분 전', stay: true, fn: () => { } }))); },
  save() { try { localStorage.setItem('sbc3d_econ', JSON.stringify(this.E)); } catch (e) { } },
  load() { const s = (NET.wsMode && NET.wsSave && NET.wsSave.econ) || (() => { try { return JSON.parse(localStorage.getItem('sbc3d_econ') || 'null'); } catch (e) { return null; } })(); if (s) { Object.assign(this.E, s); this.E.elec = null; this.E.imp = null; } },
};

// ---------- NPC 기억 · 판단 (방장) ----------
// 사람보다는 단순하지만: 범죄를 본 NPC는 그 사람을 기억하고(10분), 다시 보면 피하거나 따지고 신고한다.
// 도와준 사람(치료)은 고마워한다. 모두가 아는 '평판'(악명)도 쌓인다.
const NPCMEM = {
  rep: {}, _t: 0,
  mem(p) { return p.mem || (p.mem = {}); },
  witness(x, z, pid, sev, victim) {
    if (!G.isHost || !pid || String(pid).startsWith('n')) return;
    this.rep[pid] = Math.min(100, (this.rep[pid] || 0) + sev);
    for (const q of PEDS) { if (q.state === 'parked' || q.state === 'dead' || (q.kind !== 'civ' && q.kind !== 'worker' && q.kind !== 'medic')) continue; if (Math.abs(q.x - x) > 28 || Math.abs(q.z - z) > 28) continue; const m = this.mem(q); const e = m[pid] || {}; e.bad = Math.max(e.bad || 0, q === victim ? sev + 3 : sev); e.t = G.t; e.rep = 0; m[pid] = e; }
  },
  help(pid, ped) { if (!ped) return; const m = this.mem(ped); const e = m[pid] || {}; e.good = (e.good || 0) + 1; e.t = G.t; m[pid] = e; this.rep[pid] = Math.max(0, (this.rep[pid] || 0) - 3); },
  say(p, s) { if (p.char) p.char.say(s, 3.5); if (G.online) NET.send({ t: 'pedSay', id: p.id, s }); },
  talk(p, pid) {
    const e = this.mem(p)[pid]; const r = this.rep[pid] || 0;
    let s;
    if (e && e.bad && G.t - e.t < 600) s = pick(e.bad >= 4 ? ['당신… 아까 그 사람이죠?! 가까이 오지 마세요!', '경찰 부를 거예요!', '또 무슨 짓을 하려고요?!'] : ['아까 봤어요. 조심하세요.', '…저 기억하죠? 전 다 봤어요.']);
    else if (e && e.good) s = pick(['아까 정말 고마웠어요!', '선생님 덕분에 살았어요!', '또 만나네요! 반가워요']);
    else if (r >= 60) s = pick(['…(눈을 피한다)', '뉴스에서 본 얼굴인데…', '저 아무것도 안 봤어요…']);
    else if (G.time < 5 || G.time > 22) s = pick(['이 밤에 무슨 일이세요?', '밤길 조심하세요', '피곤하네요… 집에 가는 중이에요']);
    else if (G.weather === 'rain') s = pick(['비 와서 우울하네요', '우산 깜빡했어요…']);
    else { const pres = ECON.E.pres; s = pick([...(PED_LINES[p.kind] || PED_LINES.civ), pres ? (pres.ai ? 'AI가 나라를 다스리다니…' : `${pres.name} 대통령 어떻게 생각해요?`) : '요즘 선거한다던데', ECON.houseMul() > 1.2 ? '집값이 너무 올라서 집을 못 사요…' : '요즘 집값 좀 내렸대요', ECON.openness() < 0.8 ? '일자리가 없어서 큰일이에요' : '요즘 일자리는 좀 있대요']); }
    this.say(p, s);
  },
  // 0.5초마다: 기억하는 사람을 보면 반응
  hostTick(dt) {
    if (!G.isHost || (this._t -= dt) > 0) return; this._t = 0.5;
    const players = playersList();
    for (const p of PEDS) {
      if (!p.mem || p.state === 'parked' || p.state === 'dead' || p.state === 'fight' || p.state === 'flee') continue;
      for (const pl of players) {
        const e = p.mem[pl.id]; if (!e || !e.bad || G.t - e.t > 600 || pl.inside) continue;
        const d = Math.hypot(pl.x - p.x, pl.z - p.z); if (d > 14) continue;
        if (G.t < (e.cool || 0)) continue; e.cool = G.t + 20;
        const brave = p.personality === 'social' && e.bad < 4 && Math.random() < 0.35;
        if (brave) { this.say(p, pick(['너 아까 그놈이지?!', '경찰 부르기 전에 꺼져!'])); p.yaw = Math.atan2(pl.x - p.x, pl.z - p.z); }
        else { this.say(p, pick(['저 사람이에요! 도와주세요!', '꺅! 또 왔어!', '도망가야 해…'])); p.state = 'flee'; p.timer = 10; p.fx = pl.x; p.fz = pl.z; }
        if (!e.rep && Math.random() < (e.bad >= 4 ? 0.7 : 0.4)) { e.rep = 1; notifyPlayer(pl.id, { t: 'wanted', add: 1 }); notifyPlayer(pl.id, { t: 'pedTip', s: '📞 너를 기억하는 시민이 경찰에 신고했다' }); }
      }
      // 총을 겨누면 손 들고 도망 (상황 판단)
      for (const pl of players) { if (!pl.aimGun || pl.inside) continue; const d = Math.hypot(pl.x - p.x, pl.z - p.z); if (d > 12 || G.t < (p._aimCool || 0)) continue; p._aimCool = G.t + 8; this.say(p, pick(['쏘지 마세요!!', '살려주세요!', '으악! 총이다!'])); p.state = 'flee'; p.timer = 8; p.fx = pl.x; p.fz = pl.z; this.witness(pl.x, pl.z, pl.id, 1); }
    }
  },
};

// ---------- 법원 · 변호사 ----------
const LAWYERS = [
  { k: 'pub', ic: '🧑‍💼', name: '국선 변호사', fee: 0, cut: [0, 0.3], free: 0.05 },
  { k: 'std', ic: '👔', name: '일반 변호사', fee: 15000, cut: [0.2, 0.5], free: 0.15 },
  { k: 'top', ic: '💼', name: '대형 로펌', fee: 60000, cut: [0.4, 0.7], free: 0.3 },
];
const COURT = {
  pending: null, site: null,
  // 체포되면 감옥 대신 먼저 재판 (LAW.arrest가 부른다) → true면 체포를 잠시 멈춘다
  intercept(s) {
    if (ADMIN.on || ME.jail || this.pending) return !!this.pending;
    s = Math.round(s * ECON.sentMul());
    this.pending = { s, ev: 0, pos: { x: ME.x, y: ME.y, z: ME.z } }; ME.trial = true; ME.wanted = 0; UI.updateStars(); G.godT = G.t + 999;
    if (G.isHost) this.pending.ev = NPCMEM.rep[ME.id] || 0; else NET.send({ t: 'pol', o: { a: 'evq' } }); // 증거(목격자·악명) — 방장이 기억하고 있다
    setTimeout(() => this.menu(), 400); return true;
  },
  evidence() { return Math.min(0.8, (this.pending && this.pending.ev || 0) / 100 + (JOBS.record > 200 ? 0.2 : 0)); },
  menu() {
    const P = this.pending; if (!P) return; const ev = this.evidence();
    const lawyersOnline = [...G.players.values()].filter(rp => rp.jb === 'lawyer');
    const items = LAWYERS.map(L => ({ ic: L.ic, t: L.name, p: L.fee, d: `형량 -${Math.round(L.cut[0] * 100)}~${Math.round(L.cut[1] * 100)}% · 무죄 ${Math.round(L.free * (1 - ev) * 100)}%`, fn: () => { setTimeout(() => this.verdict(L), 30); } }));
    for (const rp of lawyersOnline) items.push({ ic: '⚖️', t: `플레이어 변호사 ${rp.name}`, p: '₩20,000', d: '수락하면 형량 -50~80% · 무죄 35%', fn: () => { NET.send({ t: 'lawReq', to: rp.id, n: ME.name, s: P.s }); toast(`⚖️ ${rp.name}에게 변론 요청… (20초)`); this._wait = setTimeout(() => { toast('응답이 없다 — 다른 변호사를 고르자'); this.menu(); }, 20000); } });
    items.push({ ic: '🙇', t: '유죄 인정 (자백)', p: '', d: '형량 -30% 확정', fn: () => { setTimeout(() => this.finish(Math.round(P.s * 0.7), '자백으로 감경'), 30); } });
    UI.openMenu('⚖️ 서불리 지방법원 — 재판', `구형 <b>${P.s}초</b> · 증거(목격자·악명) <b>${Math.round(ev * 100)}%</b><br><small>변호사를 고르면 판결이 나온다</small>`, items);
  },
  verdict(L, playerLawyer) {
    const P = this.pending; if (!P) return; const ev = this.evidence();
    const free = (playerLawyer ? 0.35 : L.free) * (1 - ev); const cut = playerLawyer ? rnd(0.5, 0.8) : rnd(L.cut[0], L.cut[1]) * (1 - ev * 0.5);
    if (Math.random() < free) { CINE_EV.court(false, `${playerLawyer ? '플레이어 변호사' : L.name}의 변론`); announce('⚖️ 무죄!', `${playerLawyer ? '플레이어 변호사' : L.name}의 변론으로 무죄 판결`); ECON.req({ a: 'news', s: `⚖️ ${ME.name} 무죄 판결 (${playerLawyer ? '플레이어 변호사' : L.name})` }); JOBS.record = 0; this.done(); sfx('levelup'); return; }
    this.finish(Math.max(20, Math.round(P.s * (1 - cut))), `${playerLawyer ? '플레이어 변호사' : L.name} 변론으로 -${Math.round(cut * 100)}%`);
  },
  finish(s, why) {
    const P = this.pending; if (!P) return; CINE_EV.court(true, `징역 ${s}초 · ${why}`); ECON.req({ a: 'news', s: `⚖️ ${ME.name} 징역 ${s}초 선고 (${why})` });
    this.done(); LAW._courtS = s; LAW.arrest(); LAW._courtS = undefined; toast(`⚖️ 판결: 징역 ${s}초 — ${why}`, 4000);
  },
  done() { clearTimeout(this._wait); this.pending = null; ME.trial = false; G.godT = G.t + 2; UI.closeMenu(); },
  tick() { const P = this.pending; if (!P) return; ME.x = P.pos.x; ME.z = P.pos.z; ME.vx = ME.vz = 0; if (!UI.menuOpen && !this._wait) this.menu(); },
  onNet(m, f) {
    if (m.t === 'lawReq' && m.to === ME.id && JOBS.id === 'lawyer' && NET.rate('lr' + f, 2, 60)) { UI.openMenu('⚖️ 변론 의뢰', `<b>${m.n}</b>이(가) 재판 변론을 요청했다 (구형 ${m.s}초) · 수임료 ₩20,000`, [{ ic: '✅', t: '수락', p: '', fn: () => { this._feeFrom = { f, until: G.t + 120 }; NET.send({ t: 'lawAns', to: f, ok: 1 }); } }, { ic: '❌', t: '거절', p: '', fn: () => NET.send({ t: 'lawAns', to: f, ok: 0 }) }]); }
    if (m.t === 'lawAns' && m.to === ME.id && this.pending) { clearTimeout(this._wait); this._wait = null; if (m.ok) { const fee = Math.min(ME.money, 20000); ME.money -= fee; NET.send({ t: 'lawFee', to: f, amt: fee }); this.verdict(null, true); } else { toast('변호사가 거절했다'); this.menu(); } }
    if (m.t === 'lawFee' && m.to === ME.id && this._feeFrom && this._feeFrom.f === f && G.t < this._feeFrom.until && !(this._feeFrom = null)) JOBS.pay(Math.min(20000, Math.max(0, +m.amt || 0)) / ECON.payMul('lawyer') / (1 - ECON.taxRate()), '변론 수임료', 'raw');
  },
};
// 법원 건물 (이벤트광장 서쪽)
function buildCourt() {
  const cx = -470, cz = -100, w = 34, d = 22, y = LAND - 0.2;
  for (const c of COLLIDERS) if (c.x1 > cx - w / 2 - 6 && c.x0 < cx + w / 2 + 6 && c.z1 > cz - d / 2 - 12 && c.z0 < cz + d / 2 + 6) return; // 자리가 없으면 건너뜀
  markGrass(cx - w / 2 - 4, cz - d / 2 - 4, cx + w / 2 + 4, cz + d / 2 + 14, 0);
  const n = ROUTE.nearestOnRoad(cx, cz); const side = Math.abs(n.x - cx) > Math.abs(n.z - cz) ? (n.x > cx ? 'e' : 'w') : (n.z > cz ? 's' : 'n');
  const [sx, sz] = SIDE_VEC[side]; const m = mbAt('plain', cx, cz);
  m.box(cx, y - 0.1, cz, w + 8, 0.4, d + 8, C(0xd8d2c4)); // 광장 바닥
  addBuildingBox(cx, cz, w, d, 14, 'office', C(0xe8e2d4), { y0: y });
  // 기둥 (정면)
  for (let i = -3; i <= 3; i++) { const px = sx ? cx + sx * (w / 2 + 1.6) : cx + i * 4.2, pz = sz ? cz + sz * (d / 2 + 1.6) : cz + i * 3; m.cyl(px, y, pz, 0.6, 11, C(0xf2eee4), 12); }
  m.box(sx ? cx + sx * (w / 2 + 1.6) : cx, y + 11, sz ? cz + sz * (d / 2 + 1.6) : cz, sx ? 3.4 : w + 2, 1.2, sz ? 3.4 : d + 2, C(0xe0dacb));
  for (let i = 0; i < 4; i++) m.box(sx ? cx + sx * (w / 2 + 3.6 + i * 0.6) : cx, y + i * 0.18, sz ? cz + sz * (d / 2 + 3.6 + i * 0.6) : cz, sx ? 0.6 : w - 2, 0.2, sz ? 0.6 : d - 2, C(0xcfc8b8)); // 계단
  addCollider(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, y + 15, 'bld');
  const door = { x: cx + sx * (w / 2 + 6.5), z: cz + sz * (d / 2 + 6.5) };
  addSign('서불리 지방법원', 'COURT OF JUSTICE ⚖️', '#2a2418', cx + sx * (w / 2 + 0.2), y + 8.6, cz + sz * (d / 2 + 0.2), 12, 2.4, SIDE_YAW[side]);
  const f = { id: FACILITIES.length, type: 'court', name: '법원', icon: '⚖️', region: regionAt(cx, cz), x: door.x, z: door.z, cx, cz, side }; f.ring = addDoorRing(door.x, door.z, 0xd8b04a); FACILITIES.push(f);
  COURT.site = { x: door.x, z: door.z };
}
function courtFacilityMenu() {
  const cr = JOBS.criminal();
  UI.openMenu('⚖️ 서불리 지방법원', `범죄 기록: ${cr ? `<b style="color:#ff6a3a">형량 ${Math.ceil(JOBS.record)}초 남음</b>` : '없음'} · 악명 ${Math.round(NPCMEM.rep[ME.id] || 0)}`, [
    { ic: '📜', t: '재심 청구 (일반 변호사)', p: 15000, d: '남은 형량 -20~50% (범죄 기록 감경)', dis: !cr, disMsg: '범죄 기록이 없다', fn: () => { const c = rnd(0.2, 0.5); JOBS.record = Math.round(JOBS.record * (1 - c)); toast(`📜 재심 결과: 형량 -${Math.round(c * 100)}%`); JOBS.updateHud(); } },
    { ic: '💼', t: '재심 청구 (대형 로펌)', p: 60000, d: '남은 형량 -40~80%', dis: !cr, disMsg: '범죄 기록이 없다', fn: () => { const c = rnd(0.4, 0.8); JOBS.record = Math.round(JOBS.record * (1 - c)); toast(`💼 재심 결과: 형량 -${Math.round(c * 100)}%`); JOBS.updateHud(); } },
    { ic: '🙇', t: '자수하기', p: '', d: '재판을 받고 감옥으로', dis: !cr && !ME.wanted, disMsg: '범죄 기록도 수배도 없다', fn: () => LAW.arrest() },
    { ic: '⚖️', t: JOBS.id === 'lawyer' ? '법률 상담 근무 (6초)' : '변호사 되기', p: '', d: JOBS.id === 'lawyer' ? '상담 1건 수당' : '휴대폰 ▶ 💼 직업 ▶ 변호사', fn: () => { if (JOBS.id === 'lawyer') JOBS.channel(6, '⚖️ 법률 상담 중', () => JOBS.pay(1200, '법률 상담')); else setTimeout(() => JOBS.openMenu(), 30); } },
  ]);
}
