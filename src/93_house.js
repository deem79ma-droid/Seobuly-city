// @v 2026101703
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
  { ic: '', t: '운전 · 헬기 · 교통법규', b: [
    '<b>차</b>: W 가속 · S 브레이크(멈추면 후진) · <b>Space 브레이크</b> · Shift 드리프트 · H 경적 · F 하차. 오르막은 느려지고 내리막은 빨라진다. <b>빨리 달리다 내리면 다친다</b>.',
    '<b>좌석</b>: 스포츠카·슈퍼카·오토바이는 2인승, 나머지 차와 헬기는 4인승. 친구가 운전하는 차에 F를 누르면 빈자리에 탄다.',
    '<b>헬기</b>: 헬기장(H 표시: 광장 남쪽 · 디산베이 · 시모느 · 아가톤섬 · 서불리)에서 누구나 탈 수 있고, 판매점에서 ₩650,000에 살 수도 있다. W/S 앞뒤 · A/D 회전 · Space 상승 · Shift 하강. 공중에서 내리면 떨어진다.',
    '<b>교통법규</b>: 제한속도 시내 60 · 광장 40 · 디산베이 80 (계기판에 표시). 제한 +10 넘게 달리면 단속 카메라 범칙금, 빨간불 통과·인도 주행·음주운전도 걸린다. 근처에 경찰이 있으면 수배까지 붙는다.',
    '<b>수류탄</b>: 총포사에서 3개 ₩4,500 · B 키(모바일 B 버튼)로 던지면 2.4초 뒤 폭발.',
  ] },
  { ic: '', t: '사냥하는 법', b: [
    '<b>어디서</b>: 디산베이 숲. 사냥꾼 오두막(디산베이 북쪽 도로가, 주황 링)에서 <b>사냥꾼 등록</b>을 하면 산탄총을 주고, 잡을 때마다 포상금이 나와. 사슴 ₩1,500 · 늑대 ₩2,600 · 멧돼지 ₩3,200 · 곰 ₩9,000.',
    '<b>늑대</b>는 3~4마리 무리로 다니고, 한 마리가 덤비면 무리 전체가 달려든다. 체력이 30 아래로 떨어지면 <b>잡아먹힌다</b>. 밤에는 훨씬 멀리서 알아챈다.',
    '<b>멧돼지</b>는 가까이 가면 돌진한다. 받히면 크게 다치고, 운이 나쁘면 <b>즉사</b>야. <b>곰</b>도 한 방에 죽일 수 있다.',
    '<b>요령</b>: 멀리서 쏘고, 둘러싸이면 차로 도망쳐. 차 안에 있으면 덤비지 않는다. 다친 동물은 도망친다. 고기는 오두막에서 팔거나 식당에서 구워 먹어.',
  ] },
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
  { ic: '💳', t: '카드 · 폰 · 알바', b: [
    '<b>💳 카드</b>: 죽어도 그대로 남고 아무도 못 뺏어. 대신 <b>한도 ₩1,000,000</b>까지만 넣어 둘 수 있어. 현금은 죽으면 다 잃으니 모으면 카드에 넣어 두자.',
    '넣기·빼기: 은행·우체국 창구, <b>🏧 ATM</b>(은행·편의점·건물 층 편의점), <b>💻 집 컴퓨터</b>(인터넷 뱅킹). 물건 살 때 현금이 모자라면 카드에서 알아서 나가.',
    '<b>📱 휴대폰</b>: 처음엔 <b>스테이온 라이트</b>(보급형)라 열리는 데 오래 걸리고 가끔 버벅여. 돈 모아서 <b>스테이온 플러스 · 프로 · 울트라</b>를 사면 빨라져.',
    '폰 사는 곳: 건물 위층 <b>스테이온 휴대폰 매장</b>, 전자상가·백화점 휴대폰 코너, 집 컴퓨터의 <b>온라인 스토어</b>.',
    '<b>🧑‍💼 알바</b>: 가게·상점·센터 계산대 뒤에서 E → 12초 동안 자리를 지키면 시급. 높은 건물은 <b>층마다</b> 편의점·카페·푸드코트·옷가게·학원·피트니스·고객센터 같은 가게가 있어 (엘리베이터로 올라가 봐).'] },
  { ic: '🦹', t: '범죄 · 감옥', b: [
    '폭행 +30초 · 강도 +60초 · 차량 탈취 +60초 · 가택 침입 +90초 · 살인 +120초 · 군부대 침입 +240초 · 탈옥 +60초.',
    '형량이 남아 있으면 <b>🦹 범죄자</b>: 경찰이 30m 안에서 알아보면 수배, 경찰·군인·의사·부동산중개인 못 함.',
    '형량은 <b>감옥에서만</b> 줄어. 밖에서 버텨도 안 없어지니 경찰서·법원에서 <b>🙇 자수</b>하거나 잡혀서 복역해야 해.',
    '돈은 밑바닥부터: 처음엔 <b>신문 배달·택배·알바·벌목·농사</b>만 할 수 있어 (신용불량·범죄자도 가능). 일해서 돈을 받을 때마다 <b>경력</b>이 쌓이고, 경력·자격 비용이 있어야 경찰·의사·변호사·중개사 같은 좋은 직업을 얻어. 같은 일을 오래 할수록 수입이 조금씩 올라.',
    '갱단은 입단비 ₩150,000에 15분마다 회비 ₩30,000. 못 내면 빚이 늘고, 세 번 밀리거나 빚이 신용불량 기준의 2배가 되면 <b>전재산 압류</b> (현금·카드·집·차·무기·물건).',
    '사람마다 성격이 달라서 춤추자고 해도 거절할 수 있어. 계속 조르면 도망가. 누굴 계속 따라다니면 스토킹으로, 동물을 죽이면 동물 학대로, 사람에게 총을 겨누면 총기 협박으로, 디산베이 숲 밖에서 나무를 베면 불법 벌목으로 목격자가 신고해.',
    '시민을 때리면 목격자가 바로 신고해 (★1), 죽이면 ★ 하나 더. 수배되면 ★ 수만큼 경찰이 출동하고 (★5는 6명) 순찰차도 쫓아와.',
    '경찰을 멀리 따돌려야 ★이 하나씩 줄어 (★이 높을수록 오래 걸리고, 건물 안에 숨어 있으면 안 줄어).',
    '죽어도 수배는 안 풀려 — 병원에서 깨어나면 바로 체포. 새로고침·재접속해도 수배와 남은 형기는 그대로야.',
    '잡히면 재판 → 감옥 (★당 60초) + <b>총기·수류탄 압수</b> + 들고 있던 현금의 10~50% 벌금. 수배 중엔 총포사·자동차 판매점이 안 받아줘.',
    '경찰서에서 벌금으로 끝낼 수 있는 건 가벼운 위반(★1~2, 범죄 기록 없음)뿐이야 · ★당 ₩10,000.'] },
];
function openGuide(i) {
  if (i === undefined) { UI.openMenu('📖 가이드', '궁금한 걸 골라', GUIDE.map((g, k) => ({ ic: g.ic, t: g.t, p: '', fn: () => { setTimeout(() => openGuide(k), 30); } }))); return; }
  const g = GUIDE[i]; UI.openMenu(`${g.ic} ${g.t}`, `<div style="text-align:left;line-height:1.6">${g.b.map(s => `<p style="margin:0 0 8px">${s}</p>`).join('')}</div>`, [{ ic: '↩️', t: '가이드 목록', p: '', fn: () => { setTimeout(() => openGuide(), 30); } }]);
}
