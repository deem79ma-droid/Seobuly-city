// @v 2026101417

// ================= 💼 경력 · 취업 조건 · 갱단 회비 · 압류 =================
// 돈은 밑바닥부터 꾸준히 일해야 겨우 모인다.
//  - 경력: 일해서 돈을 받을 때마다 그 직업 경력 +1 (가만히 서 있기만 해서는 안 쌓인다)
//  - 아무나 할 수 있는 일: 신문 배달 · 택배 · 벌목 · 농사 · 알바 (신용불량·범죄자도 가능)
//  - 좋은 일자리는 경력 + 자격 비용(면허·등록금·시험) + 깨끗한 신용/기록이 필요하다
//  - 같은 일을 오래 할수록 수입이 조금씩 오른다 (경력 1회당 +1%, 최대 +80%)
//  - 갱단: 입단비 · 15분마다 회비. 못 내면 빚, 세 번 밀리거나 빚이 너무 커지면 전재산 압류
const CAREER_REQ = {
  // tot: 전체 경력 · own: [다른 직업, 경력] · fee: 처음 한 번 내는 자격 비용 · credit: 신용불량이면 불가
  hunter: { tot: 10, fee: 30000, feeN: '사냥 면허' },
  selfemp: { tot: 15, fee: 100000, feeN: '창업 자금', credit: 1 },
  realtor: { tot: 30, fee: 50000, feeN: '중개사 자격증', credit: 1 },
  soldier: { tot: 25, credit: 1 },
  police: { tot: 50, own: ['soldier', 10], fee: 80000, feeN: '경찰학교', credit: 1 },
  doctor: { tot: 80, fee: 300000, feeN: '의대 등록금', credit: 1 },
  lawyer: { tot: 80, fee: 250000, feeN: '변호사 시험', credit: 1 },
  gangA: { gang: 1, fee: 150000, feeN: '입단비' }, gangB: { gang: 1, fee: 150000, feeN: '입단비' },
};
// 직업별 수입 배율 (예전엔 너무 쉽게 벌렸다) — 전문직은 그대로, 단순 노동은 적게
const CAREER_PAYK = { farmer: 0.3, lumber: 0.4, delivery: 0.45, selfemp: 0.45, realtor: 0.55, hunter: 0.5, gangA: 0.5, gangB: 0.5, paper: 1, police: 1, soldier: 1, doctor: 1.2, lawyer: 1, none: 0.5 };
const GANG_DUES = 30000, GANG_DUES_EVERY = 15 * 60;
const CAREER = {
  exp: {}, lic: {}, duesT: 0, miss: 0,
  load(sv) { const c = (sv && sv.career) || {}; this.exp = Object.assign({}, c.exp || {}); this.lic = Object.assign({}, c.lic || {}); this.duesT = c.dt != null ? +c.dt : GANG_DUES_EVERY; this.miss = +c.miss || 0; for (const k in this.exp) this.exp[k] = Math.max(0, Math.floor(+this.exp[k] || 0)); },
  save() { return { career: { exp: this.exp, lic: this.lic, dt: Math.round(this.duesT), miss: this.miss } }; },
  total() { let s = 0; for (const k in this.exp) s += this.exp[k]; return s; },
  of(id) { return this.exp[id] || 0; },
  // 일하고 받는 돈: 배율 × 경력 보너스, 그리고 경력 +1
  adjust(id, n) { const k = (CAREER_PAYK[id] ?? 1) * (1 + Math.min(0.8, this.of(id) * 0.01)); this.exp[id] = this.of(id) + 1; return n * k; },
  // 이 직업을 가질 수 없는 이유 (되면 null)
  why(id) {
    const R = CAREER_REQ[id]; if (!R || ADMIN.on) return null;
    if (R.credit && CREDIT.blocked()) return `⛔ 신용불량 — 빚 ${fmtMoney(ME.debt)}을 먼저 갚아야 한다`;
    if (R.tot && this.total() < R.tot) return `📋 경력 부족 — 전체 경력 ${this.total()}/${R.tot}회 (신문·택배·알바부터)`;
    if (R.own && this.of(R.own[0]) < R.own[1]) return `📋 ${JOB_BY[R.own[0]].name} 경력 ${this.of(R.own[0])}/${R.own[1]}회 필요`;
    if (R.fee && (R.gang || !this.lic[id]) && ME.money + CARD.bal < R.fee) return `💸 ${R.feeN} ${fmtMoney(R.fee)}이 없다`;
    return null;
  },
  // 취업 시 비용 지불 (면허는 한 번 · 갱단 입단비는 들어갈 때마다)
  payFee(id) {
    const R = CAREER_REQ[id]; if (!R || !R.fee || ADMIN.on || (!R.gang && this.lic[id])) return true;
    if (!CARD.pay(R.fee)) { toast(`💸 ${R.feeN} ${fmtMoney(R.fee)}이 없다`); sfx('error'); return false; }
    if (!R.gang) this.lic[id] = 1; else { this.duesT = GANG_DUES_EVERY; this.miss = 0; }
    toast(`🧾 ${R.feeN} ${fmtMoney(R.fee)} 냈다`, 3000); return true;
  },
  reqText(id) {
    const R = CAREER_REQ[id]; if (!R) return ' · 누구나 가능';
    const a = []; if (R.tot) a.push(`경력 ${R.tot}회`); if (R.own) a.push(`${JOB_BY[R.own[0]].name} ${R.own[1]}회`); if (R.fee) a.push(`${R.feeN} ${fmtMoney(R.fee)}${!R.gang && this.lic[id] ? ' (냄)' : ''}`); if (R.credit) a.push('신용 정상'); if (R.gang) a.push(`회비 15분마다 ${fmtMoney(GANG_DUES)}`);
    return ' · 조건: ' + a.join(' · ');
  },
  tick(dt) {
    if (!G.started || ADMIN.on || ME.jail) return;
    // 갱단 회비
    if (JOBS.isGang()) {
      if ((this.duesT -= dt) <= 0) {
        this.duesT = GANG_DUES_EVERY;
        if (CARD.pay(GANG_DUES)) { this.miss = 0; toast(`🦹 갱단 회비 ${fmtMoney(GANG_DUES)} 납부`, 3000); }
        else { this.miss++; ME.debt = (ME.debt || 0) + Math.round(GANG_DUES * 1.5); announce('🦹 회비 미납', `빚 +${fmtMoney(GANG_DUES * 1.5)} · ${this.miss}/3회 — 세 번 밀리면 전재산 압류`); }
        if (this.miss >= 3) { this.miss = 0; this.seize('갱단 회비 3회 미납 — 조직이 전재산을 빼앗았다'); JOBS.set('none', true); }
        saveGame();
      }
    }
    // 빚이 너무 커지면 (신용불량 기준의 2배) 전재산 압류
    if ((ME.debt || 0) >= CREDIT.threshold * 2 && G.t > (this._sz || 0)) { this._sz = G.t + 1800; /* 한 번 압류하면 30분은 다시 안 한다 */ this.seize('빚이 너무 많다 — 법원 명령으로 전재산 압류'); }
  },
  // 💥 전재산 압류: 현금 · 카드 · 집 · 차 · 무기 · 물건 → 빚 갚는 데 쓴다
  seize(why) {
    let got = Math.max(0, ME.money) + CARD.bal; ME.money = 0; CARD.bal = 0;
    for (const id of HOUSE.keys()) got += Math.round((HOUSE_PRICE.house || 300000) * 0.4); ME.keys = [];
    got += (ME.garage || []).length * 20000; ME.garage = [];
    for (const w in ME.weapons) if (w !== 'fist') delete ME.weapons[w]; ME.weapon = 'fist'; ME.ammo = {}; ME.mag = {}; for (const k in ME.inv) ME.inv[k] = 0;
    ME.debt = Math.max(0, (ME.debt || 0) - got);
    ME.char && ME.char.setWeapon('fist'); UI.updateWeapon && UI.updateWeapon(); UI.updateInv && UI.updateInv();
    announce('⚖️ 전재산 압류', `${why} · 남은 빚 ${fmtMoney(ME.debt)}`); sfx('error');
    NET.send({ t: 'chat', m: `⚖️ ${ME.name} — 전재산 압류`, sys: 1 }); saveGame();
  },
  phoneItem() { return { ic: '📋', t: '내 경력', p: 0, d: `전체 ${this.total()}회${JOBS.id !== 'none' ? ` · ${JOBS.cur.name} ${this.of(JOBS.id)}회` : ''}`, fn: () => setTimeout(() => this.open(), 30) }; },
  open() {
    const L = JOB_LIST.filter(j => j.id !== 'none').map(j => ({ ic: j.icon, t: `${j.name} · 경력 ${this.of(j.id)}회`, p: '', d: `수입 +${Math.round(Math.min(0.8, this.of(j.id) * 0.01) * 100)}%${this.reqText(j.id)}`, dis: true, disMsg: this.why(j.id) || '취업 가능' }));
    UI.openMenu('📋 내 경력', `전체 경력 <b>${this.total()}회</b> · 빚 ${fmtMoney(ME.debt || 0)}${CREDIT.blocked() ? ' · <b style="color:#ff6a3a">신용불량</b>' : ''}${JOBS.isGang() ? ` · 다음 회비 ${Math.ceil(this.duesT / 60)}분 뒤` : ''}<br><small>일해서 돈을 받을 때마다 경력이 쌓인다 · 좋은 직업은 경력이 있어야 한다</small>`, L);
  },
};
