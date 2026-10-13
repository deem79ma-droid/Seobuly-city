// @v 2026101221
// ================= 집: 사기 · 열쇠 · 남의 집 자물쇠 따기 · 털기 · 가이드 =================
// 집(주택·빌라·아파트)마다 열쇠가 하나. 산 집의 열쇠는 그 집만 열고, 죽어도 잃지 않는다.
// 열쇠가 없는 집은 잠겨 있다 → 문 앞 E: 자물쇠 따기(확률) 또는 집 사기.
const HOUSE_PRICE = { house: 350000, villa: 500000, apartment: 250000 };
const HOUSE = {
  picking: null, cool: {}, looted: {}, _hkT: 0,
  keys() { if (!Array.isArray(ME.keys)) ME.keys = []; return ME.keys; },
  isHome(b) { return !!b && RESIDENTIAL.includes(b.kind); },
  mine(b) { if (!b) return false; if (b.plot) return b.plot.owner === ME.id; if (b.kind === 'home') return true; return this.keys().includes(b.id); },
  ownerName(b) { // 지금 접속 중인 다른 주인
    if (!b) return null; if (b.plot) return b.plot.owner && b.plot.owner !== ME.id ? (b.plot.ownerName || '다른 사람') : null;
    for (const [id, rp] of G.players) if (Array.isArray(rp.keys) && rp.keys.includes(b.id)) return rp.name || '다른 사람';
    return null;
  },
  ownerId(b) { if (!b) return null; if (b.plot) return b.plot.owner; for (const [id, rp] of G.players) if (Array.isArray(rp.keys) && rp.keys.includes(b.id)) return id; return null; },
  price(b) { return Math.round((HOUSE_PRICE[b.kind] || 300000) * ECON.houseMul() / 1000) * 1000; }, // 정책·시세에 따라 바뀐다
  chance() { return JOBS.isGang() ? 0.45 : 0.35; },
  label(b) { return this.mine(b) ? `🔑 내 집 들어가기 (${b.name})` : `🏠 ${b.name} · 🔒 잠김 (E: 자물쇠 따기 / 집 사기)`; },
  // 문 앞 E
  door(b) {
    if (this.mine(b)) { INTERIOR.enter(b, { key: 1 }); return; }
    const own = this.ownerName(b); const pct = Math.round(this.chance() * 100); const cd = Math.ceil((this.cool[b.id] || 0) - G.t);
    const items = [
      { ic: '🔓', t: `자물쇠 따기 (성공 ${pct}%)`, p: '', d: cd > 0 ? `${cd}초 뒤 다시 시도 가능` : '3초 동안 가만히 · 들어가면 가택 침입(범죄)', dis: cd > 0, disMsg: '이웃이 보고 있다 — 잠시 뒤에', fn: () => this.startPick(b) },
    ];
    if (!b.plot) items.push({ ic: '🏠', t: `이 집 사기`, p: this.price(b), d: own ? `${own}의 집이다` : '열쇠 1개 · 죽어도 안 잃음 · 침대에서 잠자기', dis: !!own, disMsg: `${own}의 집이라 살 수 없다`, fn: () => this.buy(b) });
    UI.openMenu(`🏠 ${b.name}`, own ? `<b>${own}</b>의 집 · 잠겨 있다` : '잠겨 있다 · 주인 없음 (살 수 있음)', items);
  },
  buy(b) {
    // 메뉴가 가격만큼 이미 뺐다
    if (this.mine(b)) return; if (this.ownerName(b)) { ME.money += this.price(b); toast('다른 사람이 먼저 샀다 (환불)'); return; }
    this.keys().push(b.id); sfx('levelup'); announce('🔑 내 집 마련!', `${b.name} 열쇠를 받았다 · 죽어도 잃지 않는다`); setTimeout(() => CINE_EV.house(b), 150);
    NET.send({ t: 'chat', m: `🏠 ${ME.name} — ${b.name} 구입`, sys: 1 }); this._hkT = 0; saveGame(); UI.updateInv();
  },
  sell(b) {
    const k = this.keys(); const i = k.indexOf(b.id); if (i < 0) return; const p = Math.floor(this.price(b) * 0.6);
    k.splice(i, 1); ME.money += p; sfx('cash'); toast(`💸 집을 팔았다 +${fmtMoney(p)} (열쇠 반납)`); this._hkT = 0; saveGame(); UI.updateInv();
  },
  startPick(b) {
    if (ME.vehicle || ME.dead || ME.jail) return; if ((this.cool[b.id] || 0) > G.t) { toast('이웃이 보고 있다 — 잠시 뒤에'); return; }
    this.picking = { b, t: G.t + 3, x: ME.x, z: ME.z }; sfx('ui'); toast('🔓 자물쇠 따는 중… (3초간 가만히)', 2600);
  },
  resolvePick() {
    const p = this.picking; this.picking = null; const b = p.b;
    if (Math.random() < this.chance()) {
      toast('🔓 딸깍! 문이 열렸다'); sfx('door'); CINE_EV.burgle(b.name);
      const oid = this.ownerId(b); if (oid && oid !== ME.id) NET.send({ t: 'burgle', to: oid, n: b.name });
      INTERIOR.enter(b, { picked: 1 });
    } else {
      this.cool[b.id] = G.t + 10; sfx('error'); CAM.shake = 0.15;
      if (Math.random() < 0.3) { addWanted(1); toast('🚨 실패 — 이웃이 경찰에 신고했다!', 3000); } else toast('❌ 자물쇠가 안 열렸다 (10초 뒤 다시)', 2600);
    }
  },
  // 남의 집 안에서: 서랍·귀중품 뒤지기 (집마다 10분에 한 번)
  loot(b, spot) {
    const key = b.id + ':' + spot; if (G.t < (this.looted[key] || 0)) { toast('이미 뒤졌다 — 텅 비었다'); return; }
    this.looted[key] = G.t + 600; const r = Math.random(); let msg;
    if (r < 0.12) { msg = '아무것도 없다…'; }
    else { const a = Math.floor(rnd(150, spot === 'safe' ? 2000 : 900) * ECON.crimeMul() / 10) * 10 * JOBS.robMul(); ME.money += a; msg = `💰 ${fmtMoney(a)} 챙겼다`; sfx('cash'); }
    if (Math.random() < 0.2) { const it = pick(['medkit', 'food', 'drink']); ME.inv[it] = (ME.inv[it] | 0) + 1; msg += ` · ${({ medkit: '🩹 구급상자', food: '🍱 도시락', drink: '🍺 음료' })[it]} +1`; UI.updateInv(); }
    toast(msg, 2600);
    if (Math.random() < 0.25) { addWanted(1); toast('🚨 소리를 듣고 이웃이 신고했다!', 3000); }
    const oid = this.ownerId(b); if (oid && oid !== ME.id) NET.send({ t: 'burgle', to: oid, n: b.name, loot: 1 });
  },
  tick(dt) {
    const p = this.picking;
    if (p) { if (ME.dead || ME.jail || ME.vehicle || Math.hypot(ME.x - p.x, ME.z - p.z) > 1.2) { this.picking = null; toast('🔓 자물쇠 따기 중단'); } else if (G.t >= p.t) this.resolvePick(); }
  },
  onNet(m, f) {
    if (m.t === 'burgle' && m.to === ME.id) { const rp = G.players.get(f); announce('🚨 우리 집에 도둑!', `${rp ? rp.name : '누군가'}이(가) ${m.n}${m.loot ? '을(를) 털고 있다' : '에 침입했다'}`); sfx('siren', ME.x, ME.z); }
  },
};

// ================= 가이드 (휴대폰 ▶ 📖 가이드) =================
const GUIDE = [
  { ic: '💰', t: '돈 버는 법', b: [
    '<b>직업</b>: 휴대폰(P) ▶ 💼 직업에서 골라. 경찰·군인·의사는 근무 수당이 나오고, 택배·농부·부동산중개인은 할 일을 하면 돈을 받아. 노란 기둥과 미니맵 아이콘이 할 일 위치야.',
    '<b>팔기</b>: 나무를 베서 얻은 목재(개당 ₩180), 사냥한 고기(개당 ₩350)는 🏭 공장에서 팔아.',
    '<b>땅·건물</b>: 지도의 🪧 빈 땅을 사서 건물을 지으면 임대 수익이 들어와. 층수가 높을수록 수익이 커.',
    '<b>위험한 방법</b>: NPC 협박, 남의 집 털기, 카지노. 돈은 빨리 벌지만 범죄 기록이 쌓이거나 다 잃을 수 있어.',
    '⚠️ 죽으면 현금·무기·아이템·산 옷을 전부 잃어 (집 열쇠는 안 잃어). 큰돈은 땅이나 집에 써 두는 게 안전해.'] },
  { ic: '🏠', t: '집 사기', b: [
    '주택·빌라·아파트 문 앞에서 <b>E</b> ▶ <b>🏠 이 집 사기</b>. 아파트 ₩250,000 · 주택 ₩350,000 · 빌라 ₩500,000.',
    '사면 그 집 <b>열쇠</b>를 받아 (인벤토리에 🔑). 집 하나에 열쇠 하나고, 그 집만 열 수 있어.',
    '열쇠는 <b>죽어도 잃지 않아</b>. 문 앞에서 E 하면 바로 들어가.',
    '집 2층 침대에서 <b>🛏️ 잠자기</b>: 기상 시간을 예약하고 자면 체력이 회복돼.',
    '팔 때는 집 안에서 <b>💸 집 팔기</b> (산 값의 60%).',
    '다른 사람이 접속해서 갖고 있는 집은 살 수 없어. 직접 지은 건물은 땅 주인 것이야.'] },
  { ic: '🔓', t: '남의 집 털기', b: [
    '열쇠 없는 집은 잠겨 있어. 문 앞에서 <b>E</b> ▶ <b>🔓 자물쇠 따기</b> ▶ <b>3초 동안 가만히</b> 있어야 해.',
    '성공 확률 <b>35%</b> (갱단원은 45%). 실패하면 10초 기다려야 하고, 30% 확률로 이웃이 신고해서 수배 ★1.',
    '들어가면 <b>가택 침입</b> 범죄 (형량 +90초 → 🦹 범죄자 신분).',
    '안에서 <b>🗄️ 서랍 뒤지기</b>, <b>💎 귀중품 찾기</b>로 돈과 아이템을 챙겨. 같은 곳은 10분 뒤에 다시 차.',
    '뒤질 때마다 25% 확률로 신고당해. 집주인이 접속해 있으면 알림이 가.'] },
  { ic: '🪓', t: '나무꾼 하는 법', b: [
    '처음 시작하면 <b>도끼</b>를 줘 (숫자 3번 또는 무기 칸에서 🪓 선택).',
    '나무 앞에서 <b>공격(좌클릭 / 공격 버튼)</b>을 몇 번 하면 쓰러지고 목재 2~4개가 들어와.',
    '나무가 많은 곳: 서쪽 <b>디산베이</b> 숲과 북서쪽 산. 벤 나무는 4분 뒤 다시 자라.',
    '목재는 🏭 <b>공장</b>에서 개당 ₩180에 팔아.',
    '휴대폰 ▶ 💼 직업 ▶ <b>🪓 벌목꾼</b>을 하면 나무를 벨 때마다 벌목 수당이 따로 나와.'] },
  { ic: '🔫', t: '갱단 들어가는 법', b: [
    '휴대폰(P) ▶ 💼 직업 ▶ <b>🔴 레드 크루</b> 또는 <b>🔵 블루 독스</b>를 고르면 바로 가입이야. 범죄 기록이 있어도 들어갈 수 있어.',
    '근거지: 레드 크루 = <b>11구역</b>, 블루 독스 = <b>12구역</b> (캥지베 남쪽).',
    '같은 갱 NPC는 너를 안 때리고, <b>상대 갱 NPC는 너를 보면 공격</b>해.',
    '돈: 근거지에서 <b>💰 자릿세 수금</b>, 상대 갱단원 처치 ₩2,500, NPC 협박 수익 2배, 자물쇠 따기 확률 ↑.',
    '갱단 옷(빨강/파랑 후드)으로 바뀌어. 나가려면 다른 직업으로 바꾸면 돼.'] },
  { ic: '🦹', t: '범죄 · 감옥', b: [
    '차량 탈취 +60초 · 가택 침입 +90초 · 군부대 침입 +240초 · 살인 +120초 · 탈옥 +60초.',
    '형량이 남아 있으면 <b>🦹 범죄자</b>: 경찰이 알아보면 수배, 경찰·군인·의사·부동산중개인 못 함.',
    '형량은 감옥에서 1초씩, 밖에서는 5초에 1초씩 줄어. 경찰서에서 <b>🙇 자수하기</b>로 빨리 끝낼 수 있어.'] },
];
function openGuide(i) {
  if (i === undefined) { UI.openMenu('📖 가이드', '궁금한 걸 골라', GUIDE.map((g, k) => ({ ic: g.ic, t: g.t, p: '', fn: () => { setTimeout(() => openGuide(k), 30); } }))); return; }
  const g = GUIDE[i]; UI.openMenu(`${g.ic} ${g.t}`, `<div style="text-align:left;line-height:1.6">${g.b.map(s => `<p style="margin:0 0 8px">${s}</p>`).join('')}</div>`, [{ ic: '↩️', t: '가이드 목록', p: '', fn: () => { setTimeout(() => openGuide(), 30); } }]);
}
