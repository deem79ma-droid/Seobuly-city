// @v 2026101410

// ================= 💳 카드 · 📱 스테이온 휴대폰 · 💻 집 컴퓨터 · 🧑‍💼 알바 =================
// 카드: 죽어도 그대로 남고 아무도 뺏을 수 없다. 대신 한도(₩1,000,000)까지만 넣어 둘 수 있다.
//   - 넣기·빼기: ATM(은행·우체국·편의점·건물 층 편의점) · 집 컴퓨터(인터넷 뱅킹)
//   - 결제: 현금이 모자라면 자동으로 카드에서 나간다 (벌금·병원비는 현금에서만)
// 휴대폰: 처음엔 스테이온 라이트(보급형) — 느리고 가끔 버벅인다. 휴대폰 매장·집 컴퓨터에서 더 좋은 스테이온을 산다.
// 알바: 가게·상점·센터의 계산대(건물 층마다)에서 E → 12초 근무 → 시급
const CARD_LIMIT = 1000000;
const CARD = {
  bal: 0,
  load(sv) { this.bal = clamp(Math.floor(+(sv && sv.card) || 0), 0, CARD_LIMIT); },
  room() { return Math.max(0, CARD_LIMIT - this.bal); },
  deposit(n) {
    n = Math.floor(Math.min(n, Math.max(0, ME.money), this.room()));
    if (n <= 0) { toast(this.room() <= 0 ? `💳 카드 한도(${fmtMoney(CARD_LIMIT)})가 꽉 찼다` : '💸 넣을 현금이 없다'); sfx('error'); return 0; }
    ME.money -= n; this.bal += n; sfx('cash'); toast(`💳 카드에 ${fmtMoney(n)} 넣었다 · 잔액 ${fmtMoney(this.bal)}`); saveGame(); return n;
  },
  withdraw(n) {
    n = Math.floor(Math.min(n, this.bal)); if (n <= 0) { toast('💳 카드 잔액이 없다'); sfx('error'); return 0; }
    this.bal -= n; ME.money += n; sfx('cash'); toast(`💵 ${fmtMoney(n)} 뽑았다 · 카드 잔액 ${fmtMoney(this.bal)}`); saveGame(); return n;
  },
  // 결제: 현금 먼저 → 모자라면 카드 → 둘을 합쳐도 모자라면 실패
  pay(n) {
    n = Math.max(0, Math.floor(+n || 0)); if (!n) return true;
    if (ME.money >= n) { ME.money -= n; return true; }
    if (this.bal >= n) { this.bal -= n; toast(`💳 카드 결제 ${fmtMoney(n)} · 잔액 ${fmtMoney(this.bal)}`); return true; }
    const cash = Math.max(0, ME.money);
    if (cash + this.bal >= n) { const c = n - cash; ME.money -= cash; this.bal -= c; toast(`💳 현금 ${fmtMoney(cash)} + 카드 ${fmtMoney(c)} 결제 · 카드 잔액 ${fmtMoney(this.bal)}`); return true; }
    return false;
  },
  // ATM · 은행 창구 · 인터넷 뱅킹 화면
  menu(where) {
    const re = () => setTimeout(() => this.menu(where), 0);
    const dep = (n, t) => ({ ic: '📥', t, p: '', dis: ME.money < 1 || !this.room(), disMsg: !this.room() ? '카드 한도가 꽉 찼다' : '넣을 현금이 없다', stay: true, fn: () => { this.deposit(n); re(); return true; } });
    const wd = (n, t) => ({ ic: '📤', t, p: '', dis: this.bal < 1, disMsg: '카드 잔액이 없다', stay: true, fn: () => { this.withdraw(n); re(); return true; } });
    UI.openMenu(`💳 ${where || 'ATM'}`, `카드 잔액 <b style="color:#9fe0ff">${fmtMoney(this.bal)}</b> / 한도 ${fmtMoney(CARD_LIMIT)} · 현금 <b style="color:#7dff9a">${fmtMoney(Math.max(0, ME.money))}</b><br><small style="opacity:.8">카드는 죽어도 남고 아무도 못 뺏는다 · 현금은 죽으면 전부 잃는다</small>`, [
      dep(10000, '현금 ₩10,000 넣기'), dep(50000, '현금 ₩50,000 넣기'), dep(1e12, '현금 전부 넣기 (한도까지)'),
      wd(10000, '₩10,000 뽑기'), wd(50000, '₩50,000 뽑기'), wd(1e12, '전부 뽑기'),
    ]);
  },
};

// ---- 📱 스테이온 휴대폰 ----
const PHONES = [
  { id: 'lite', n: '스테이온 라이트', g: '보급형', p: 0, lag: 1.3, hang: 0.3, d: '처음 주는 폰 · 느리고 가끔 버벅인다' },
  { id: 'plus', n: '스테이온 플러스', g: '중급형', p: 150000, lag: 0.6, hang: 0.08, d: '조금 빨라졌다' },
  { id: 'pro', n: '스테이온 프로', g: '고급형', p: 450000, lag: 0.2, hang: 0, d: '빠르고 부드럽다' },
  { id: 'ultra', n: '스테이온 울트라', g: '플래그십', p: 1200000, lag: 0, hang: 0, d: '누르는 즉시 열린다 · 최고급' },
];
const PHONE_BY = Object.fromEntries(PHONES.map(p => [p.id, p]));
const PHONE = {
  id: 'lite',
  cur() { return PHONE_BY[this.id] || PHONES[0]; },
  load(sv) { this.id = PHONE_BY[sv && sv.phone] ? sv.phone : 'lite'; },
  // 폰이 열리기까지 걸리는 시간 (보급형은 부팅·앱 여는 데 오래 걸리고 가끔 멈칫한다)
  wait(tabSwitch) { const P = this.cur(); let w = tabSwitch ? P.lag * 0.45 : P.lag; if (Math.random() < P.hang) w += 0.9; return w; },
  shop(where) {
    const cur = this.cur(), rank = PHONES.indexOf(cur), online = where === 'online';
    UI.openMenu(`📱 스테이온 ${online ? '온라인 스토어' : '휴대폰 매장'}`, `지금 쓰는 폰: <b>${cur.n}</b> (${cur.g})<br><small style="opacity:.8">보급형은 느리고 버벅인다 · 비쌀수록 빠르다${online ? ' · 주문하면 바로 도착' : ''} · 현금이 모자라면 카드로 결제</small>`,
      PHONES.map((P, i) => ({ ic: '📱', t: `${P.n} (${P.g})`, p: P.p || '기본', d: P.d + (i === rank ? ' · 쓰는 중' : ''), dis: i <= rank, disMsg: i === rank ? '이미 쓰고 있다' : '지금 폰이 더 좋다', fn: () => { this.id = P.id; announce('📱 ' + P.n, `${P.g} · ${P.d}`); sfx('levelup'); saveGame(); } })));
  },
};

// ---- 💻 집 컴퓨터 ----
const COMPUTER = {
  open() {
    UI.openMenu('💻 내 컴퓨터', `집 컴퓨터는 빠르다 · 카드 잔액 <b style="color:#9fe0ff">${fmtMoney(CARD.bal)}</b> · 폰 ${PHONE.cur().n}`, [
      { ic: '💳', t: '인터넷 뱅킹', p: '', d: '카드에 현금 넣기 · 빼기 · 잔액 보기', fn: () => { setTimeout(() => CARD.menu('인터넷 뱅킹'), 30); } },
      { ic: '📱', t: '스테이온 온라인 스토어', p: '', d: `지금 폰: ${PHONE.cur().n} (${PHONE.cur().g}) · 더 좋은 폰 사기`, fn: () => { setTimeout(() => PHONE.shop('online'), 30); } },
    ]);
  },
};

// ---- 🧑‍💼 알바 ----
const PART = {
  SHIFT: 12,
  label(name, pay) { return `🧑‍💼 ${name} 알바 (${this.SHIFT}초 근무 · ${fmtMoney(pay)})`; },
  work(name, pay) {
    if (JOBS.chan) { toast('이미 일하는 중이다'); return; }
    if (ME.stamina < 15) { toast('😮‍💨 너무 지쳤다 — 조금 쉬었다가 하자'); sfx('error'); return; }
    toast(`🧑‍💼 ${name} 알바 시작 — ${this.SHIFT}초 동안 자리를 지키자`, 2400);
    JOBS.channel(this.SHIFT, `🧑‍💼 ${name} 알바 중`, () => JOBS.pay(pay, `${name} 알바`));
  },
};
// 건물 층마다 들어선 가게·상점·센터 (층 번호와 건물로 정해진다 → 누가 와도 같은 가게)
const FLOOR_SHOPS = {
  conv: { n: '편의점', pay: 550 }, cafe: { n: '카페', pay: 600 }, food: { n: '푸드코트', pay: 650 }, clothes: { n: '옷가게', pay: 600 },
  phone: { n: '스테이온 휴대폰 매장', pay: 750 }, academy: { n: '학원', pay: 700 }, fitness: { n: '피트니스 센터', pay: 600 },
  call: { n: '고객센터', pay: 750 }, service: { n: '스테이온 서비스센터', pay: 700 }, pc: { n: 'PC방', pay: 550 }, office: { n: '사무실', pay: 700 },
};
function floorTenant(b, k) {
  const L = b.genre === 'dept' ? ['clothes', 'clothes', 'cafe', 'food', 'phone', 'conv'] : b.genre === 'electro' ? ['phone', 'phone', 'service', 'pc', 'conv'] : (b.genre === 'tv' || b.genre === 'news') ? ['office', 'office', 'call', 'cafe'] : ['conv', 'cafe', 'food', 'clothes', 'phone', 'academy', 'fitness', 'call', 'service', 'pc', 'office', 'office'];
  const id = L[hashStr('tenant' + b.id + ':' + k) % L.length]; return Object.assign({ id }, FLOOR_SHOPS[id]);
}
