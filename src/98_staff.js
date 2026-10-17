// @v 2026101802

// ================= 🧑‍💼 가게 직원 NPC =================
// 가게 안에는 직원이 서 있다. 직원에게 말을 걸고 → 메뉴를 고르면 → 직원이 금액을 말하고 → 결제하면 건네준다.
// (예전엔 상호작용 키 한 번에 메뉴가 열려 딸깍 사는 식이었다)
const STAFF_ROLE = {
  dealer: '딜러', hospital: '간호사', police: '민원 경찰관', food: '점원', cafe: '바리스타', mart: '계산원', clothes: '점원', gun: '총포사 주인',
  pcbang: 'PC방 사장', gym: '트레이너', pool: '안내 직원', school: '교사', academy: '학원 강사', hotel: '프런트 직원', casino: '환전 직원',
  factory: '공장 사무직', govt: '공무원', stats: '통계청 직원', zoo: '매표 직원', bank: '은행원', club: '바텐더', parking: '주차 관리인', court: '법원 직원',
};
const STAFF_HI = {
  dealer: ['어서 오세요, 고객님! 어떤 차를 찾으세요?', '신차 들어왔습니다. 천천히 보세요.', '차는 몰아봐야 압니다! 편하게 말씀하세요.'],
  hospital: ['어디가 불편하세요?', '접수 도와드릴게요.'], police: ['민원 접수하시겠어요?', '무슨 일로 오셨습니까.'],
  food: ['어서 오세요! 주문하시겠어요?', '오늘은 뭐 드릴까요?'], cafe: ['어서 오세요, 주문 도와드릴게요.', '오늘의 커피 있어요!'],
  mart: ['어서 오세요. 계산 도와드릴게요.', '봉투 필요하세요?'], clothes: ['어서 오세요! 편하게 보세요.', '새 옷 들어왔어요.'],
  gun: ['…면허는 있으시죠? 뭘 찾으세요.', '여긴 진짜만 팝니다.'], pcbang: ['어서 오세요. 자리 안내해 드릴까요?'],
  gym: ['오늘 운동 가볍게 하시겠어요?', '회원이시죠? 뭐 도와드릴까요.'], pool: ['어서 오세요. 이용권 도와드릴게요.'],
  school: ['어서 오세요. 수업 등록하시겠어요?'], academy: ['상담 도와드릴게요. 어떤 수업 들으실래요?'],
  hotel: ['어서 오세요. 체크인 도와드릴까요?'], casino: ['환영합니다. 토큰으로 바꿔드릴까요?', '행운을 빕니다.'],
  factory: ['일하러 오셨어요? 서류 보겠습니다.'], govt: ['어서 오세요. 어떤 업무로 오셨어요?'], stats: ['통계 자료 열람하시겠어요?'],
  zoo: ['어서 오세요! 입장권 드릴까요?'], bank: ['어서 오세요. 어떤 업무 도와드릴까요?'], club: ['뭐 마실래요?'], parking: ['주차 도와드릴까요?'], court: ['접수 도와드리겠습니다.'],
};
const STAFF_BYE = ['감사합니다!', '또 오세요~', '좋은 하루 보내세요!', '고맙습니다, 고객님.'];
const CAR_COLOR_NAME = ['은색', '검정', '빨강', '남색', '흰색', '회색', '초록', '노랑', '자주', '하늘', '주황', '보라'];
const STAFF = {
  // 가게를 지을 때 정해 둔 자리(specs)에 직원을 세운다
  make(I, specs, bid) {
    const out = [];
    for (const s of specs) {
      const seed = hashStr('staff' + bid + ':' + s.role + ':' + Math.round(s.x) + ':' + Math.round(s.z));
      const ch = new Character(randomOutfit(mulberry32(seed), s.role === '공장 사무직' ? 'worker' : 'civ'), { shadow: false }); ch.setWeapon && ch.setWeapon('fist');
      const num = (seed % 100) + 1; ch.setName(`NPC${num} · ${s.role}`, '#ffe9a8');
      ch.root.position.set(s.x, s.y, s.z); ch.root.rotation.y = s.yaw || 0; scene.add(ch.root);
      out.push({ ch, x: s.x, y: s.y, z: s.z, yaw0: s.yaw || 0, yaw: s.yaw || 0, role: s.role, num, key: s.key || '' });
    }
    return out;
  },
  clear(I) {
    if (!I || !I.staff) return; if (UI._staff && I.staff.includes(UI._staff)) UI._staff = null;
    for (const st of I.staff) { const c = st.ch; scene.remove(c.root); if (c.nameTag) { disposeSprite(c.nameTag); c.nameTag = null; } if (c.bubble) { disposeSprite(c.bubble); c.bubble = null; } Character.all.delete(c); }
    I.staff = null;
  },
  update(I, dt) {
    if (!I.staff) return;
    for (const st of I.staff) {
      const dx = ME.x - st.x, dz = ME.z - st.z, d = Math.hypot(dx, dz);
      const want = d < 7 && Math.abs(ME.y - st.y) < 2 ? Math.atan2(dx, dz) : st.yaw0; st.yaw = dampAng(st.yaw, want, 6, dt);
      st.ch.root.rotation.y = st.yaw; st.ch.setDetail(d < 22);
      st.ch.update(dt, { speed: 0, grounded: true, state: 'normal', idleLook: 0.2, work: false });
    }
  },
  near(role) {
    const I = INTERIOR.cur; if (!I || !I.staff) return null; let best = null, bd = 1e9;
    for (const st of I.staff) { if (role && st.role !== role) continue; const d = Math.hypot(ME.x - st.x, ME.z - st.z); if (d < bd) { bd = d; best = st; } }
    return best;
  },
  // 직원에게 말 걸기 → 인사 → 메뉴(fn)
  talk(role, fn) {
    const st = this.near(role); if (!st) { UI._staff = null; fn(); return; }
    const key = Object.keys(STAFF_ROLE).find(k => STAFF_ROLE[k] === role) || 'food';
    if (REP.refuse(role)) { st.ch.say('죄송하지만… 소문 들었어요. 손님께는 못 팝니다.', 4); toast(`🚫 ${role} NPC${st.num}: 소문이 다 났어요. 평판(${REP.name()})이 너무 나빠서 팔지 않는다`, 4000); sfx('error'); UI._staff = null; return; }
    const line = REP.greet(role) || pick(STAFF_HI[key] || ['어서 오세요.']); st.line = line; st.ch.say(line, 4); sfx('ui');
    UI._staff = st; fn();
  },
  // 계산: 직원이 금액을 말하고, 손님이 결제해야 물건이 넘어온다
  _dlg() {
    let el = document.getElementById('stfDlg'); if (el) return el;
    const st = document.createElement('style'); st.textContent = '#stfDlg{position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);padding:14px}#stfDlg .bx{width:min(420px,100%);background:#1c2030;border:2px solid #ffd34a;border-radius:16px;padding:16px;color:#fff;box-shadow:0 20px 60px rgba(0,0,0,.6)}#stfDlg .who{font-weight:800;color:#ffd34a;margin-bottom:6px}#stfDlg .say{font-size:16px;line-height:1.5;margin:6px 0 14px}#stfDlg .row{display:flex;gap:8px}#stfDlg button{flex:1;border:0;border-radius:10px;padding:13px;font:700 15px inherit;cursor:pointer}#stfDlg .ok{background:#ffd34a;color:#222}#stfDlg .no{background:#3a3f55;color:#fff}#stfDlg .bal{font-size:12px;opacity:.7;margin-top:8px;text-align:right}';
    document.head.appendChild(st); el = document.createElement('div'); el.id = 'stfDlg'; el.style.display = 'none'; document.body.appendChild(el);
    el.addEventListener('pointerdown', e => e.stopPropagation()); el.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
    return el;
  },
  closeDlg() { const el = document.getElementById('stfDlg'); if (el) el.style.display = 'none'; this._busy = false; },
  checkout(st, it, run) {
    if (this._busy) return; const price = it._adj ?? it.p; const el = this._dlg(); this._busy = true;
    el.innerHTML = '<div class="bx"><div class="who"></div><div class="say"></div><div class="row"></div><div class="bal"></div></div>';
    el.querySelector('.who').textContent = `🧑‍💼 ${st.role} NPC${st.num}`;
    const say = (t) => { el.querySelector('.say').textContent = t; st.ch.say(t.length > 30 ? t.slice(0, 30) : t, 3); };
    const row = el.querySelector('.row'); const mk = (cls, txt, fn) => { const b = document.createElement('button'); b.className = cls; b.textContent = txt; b.onclick = fn; row.appendChild(b); return b; };
    el.querySelector('.bal').textContent = `현금 ${fmtMoney(ME.money)} · 카드 ${fmtMoney(CARD.bal)}`;
    el.style.display = 'flex';
    if (CREDIT.blocked()) { say('죄송합니다. 신용불량이시라 결제가 안 됩니다. 빚부터 갚으세요.'); sfx('error'); mk('no', '알겠어요', () => this.closeDlg()); return; }
    say(`「${it.t}」 ${fmtMoney(price)}입니다.${price > it.p ? ' (소문 때문에 값이 좀 올랐어요…)' : price < it.p ? ' (단골이시라 깎아드렸어요!)' : ''} 결제하시겠어요?`);
    mk('ok', `💳 ${fmtMoney(price)} 결제`, () => {
      if (ME.money + CARD.bal < price) { say('어… 결제가 안 되네요. 잔액이 부족해요.'); sfx('error'); row.innerHTML = ''; mk('no', '다음에 올게요', () => this.closeDlg()); return; }
      row.innerHTML = ''; say('결제 중입니다…'); sfx('ui');
      setTimeout(() => { this.closeDlg(); run(); st.ch.say(pick(STAFF_BYE), 3); }, 650);
    });
    mk('no', '취소', () => { this.closeDlg(); });
  },
  // ---------- 🚗 딜러 상담 ----------
  CARLIST: ['bicycle', 'hatch', 'sedan', 'suv', 'pickup', 'van', 'sports', 'supercar', 'scooter', 'bike', 'superbike', 'heli', 'jet'],
  dealerMenu(f) {
    const st = UI._staff;
    UI.openMenu('🚗 자동차 판매점', `딜러가 차를 소개해 준다 — 차를 고르면 상담이 시작된다 · 보유 ${ME.garage.length}대`, this.CARLIST.map(k => {
      const M = VMODELS[k]; return { ic: this.icon(k), t: M.name, p: fmtMoney(M.price), d: `최고 ${Math.round(M.max * 3.6)}km/h · ${M.seats || 4}인승${M.jet ? ' · 미사일 6발 · 1인승' : M.kind === 'heli' ? ' · 하늘을 난다' : ''}`, stay: true, fn: () => { this.dealerPitch(f, k, 0); return true; } };
    }));
  },
  icon(k) { const M = VMODELS[k]; return M.bicycle ? '🚲' : M.kind === 'bike' ? '🏍️' : k === 'supercar' || k === 'sports' ? '🏎️' : k === 'suv' || k === 'pickup' ? '🚙' : '🚗'; },
  dealerPitch(f, k, ci) {
    const M = VMODELS[k]; const st = UI._staff; const col = CAR_COLORS[ci];
    const pitch = { bicycle: '튼튼한 자전거예요. 동네 한 바퀴엔 최고죠.', hatch: '경차는 작아도 골목에서 최고예요. 첫 차로 많이들 사세요.', sedan: '무난하고 안정적인 세단입니다.', suv: '덩치 큰 SUV는 험한 길에서도 든든하죠.', pickup: '짐칸 있는 픽업은 일할 때 최고예요.', van: '승합차는 사람도 짐도 넉넉합니다.', sports: '스포츠카… 한 번 타 보면 못 돌아옵니다.', supercar: '이 슈퍼카는 우리 가게의 자랑이에요. 안목이 있으시네요!', scooter: '스쿠터는 도심에서 제일 빠르죠.', bike: '바이크 좋아하세요? 바람이 다릅니다.', superbike: '슈퍼바이크요? 헬멧은 꼭 쓰세요…', heli: '헬기도 있습니다. 하늘 위에선 신호도 없어요.', jet: '전투기라니… 정말로 사시는 거죠?' }[k] || '좋은 차입니다.';
    if (st) st.ch.say(pitch.length > 30 ? pitch.slice(0, 30) : pitch, 4);
    const items = [{ ic: '🎨', t: `색상: ${CAR_COLOR_NAME[ci]} (눌러서 다음 색)`, d: '고른 색으로 출고된다', stay: true, fn: () => { this.dealerPitch(f, k, (ci + 1) % CAR_COLORS.length); return true; } },
      { ic: '✍️', t: `${M.name} (${CAR_COLOR_NAME[ci]}) 계약하고 결제`, p: M.price, d: '결제하면 차고에 등록되고 건물 앞으로 출고된다', fn: () => { this.deliver(f, k, col); } },
      { ic: '↩️', t: '다른 차 더 보기', stay: true, fn: () => { this.dealerMenu(f); return true; } }];
    UI.openMenu(`${this.icon(k)} ${M.name}`, `🗣️ <b>딜러</b>: “${pitch}”<br><small>최고 ${Math.round(M.max * 3.6)}km/h · ${M.seats || 4}인승 · ${fmtMoney(M.price)}</small>`, items);
  },
  deliver(f, k, col) {
    const M = VMODELS[k]; const g = { model: k, color: col, id: ME.id + '_' + Date.now().toString(36) }; ME.garage.push(g);
    const st = UI._staff; if (st) st.ch.say('키 여기 있어요! 차는 앞에 대기해 뒀습니다.', 4);
    spawnOwned(g, f.x, f.z); announce('🚗 구매 완료!', `${M.name} · 건물 앞에 출고됨 (지도에 📍 표시)`); sfx('cash');
    if (!INTERIOR.cur) setTimeout(() => CINE_EV.car(vehicles.get(g.id)), 150);
    saveGame();
  },
};
