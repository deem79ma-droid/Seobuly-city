// @v 2026101802

// ================= 🌟 평판 · 소문 =================
// 서불리 시티의 NPC 100명은 네가 한 일을 기억하고, 본 사람이 다른 NPC에게 소문을 퍼뜨린다.
// 평판(-100 ~ +100)은 저장되고, 도시가 실제로 달라진다:
//  · 상점 직원이 값을 올려 받거나(악명) 깎아 준다(영웅)  · 너무 나쁘면 아예 팔지 않는다
//  · 공무원·경찰·의사 같은 번듯한 직업은 평판이 나쁘면 지원 불가, 합격률도 평판을 탄다
//  · 길에서 NPC가 소문을 수군대며 피하거나, 영웅에게 인사하고 가끔 사례도 한다
//  · 선행(병원 자원봉사·기부·환자 치료·성실한 근무)으로 올리고, 범죄로 깎인다. 가만히 두면 천천히 0으로 돌아온다
const REP_TIERS = [[-100, '악명 높은 범죄자', '#ff4a3a'], [-70, '기피 인물', '#ff7a3a'], [-40, '요주의', '#ffb84a'], [-15, '조금 수상함', '#d8c070'], [-5, '평범한 시민', '#cfd8e8'], [35, '믿음직한 시민', '#9ad87a'], [70, '동네 영웅', '#5fe0a0']];
const REP_EXEMPT = ['간호사', '민원 경찰관', '은행원', '공무원', '통계청 직원', '환전 직원', '법원 직원', '공장 사무직', '교사'];
const REP_JOBS_BLOCK = ['police', 'civil', 'statoff', 'minister', 'doctor', 'lawyer'];
const REP = {
  v: 0, log: [], _t: 0, _gift: 0,
  load(sv) { const r = (sv && sv.rep) || {}; this.v = clamp(+r.v || 0, -100, 100); this.log = Array.isArray(r.log) ? r.log.slice(-6).map(String) : []; },
  save() { return { rep: { v: Math.round(this.v * 10) / 10, log: this.log.slice(-6) } }; },
  idx(v = this.v) { let i = 0; for (let k = 0; k < REP_TIERS.length; k++) if (v >= REP_TIERS[k][0]) i = k; return i; },
  name() { return REP_TIERS[this.idx()][1]; }, color() { return REP_TIERS[this.idx()][2]; },
  add(n, why) {
    if (ADMIN.on || !n || !G.started) return;
    const old = this.idx(); this.v = clamp(this.v + n, -100, 100); const ni = this.idx();
    if (Math.abs(n) >= 1) this.log.push(`${n > 0 ? '+' : ''}${Math.round(n)} ${why || ''}`.trim()); if (this.log.length > 6) this.log.shift();
    if (ni !== old) { announce(ni > old ? '🌟 평판 상승' : '💢 평판 하락', `${REP_TIERS[old][1]} → ${REP_TIERS[ni][1]}`); sfx(ni > old ? 'levelup' : 'error'); }
    else if (Math.abs(n) >= 3) toast(`${n > 0 ? '🌟 평판 +' : '💢 평판 '}${Math.round(n)}${why ? ' · ' + why : ''}`, 2500);
  },
  priceMul() { const v = this.v; return (v <= -60 ? 1.3 : v <= -30 ? 1.15 : v >= 60 ? 0.9 : v >= 30 ? 0.95 : 1) * SYS.priceMul(); },
  passMul() { return 1 + this.v / 400; },
  refuse(role) { return !ADMIN.on && this.v <= -85 && !REP_EXEMPT.includes(role); },
  blocksJob(id) { return !ADMIN.on && this.v <= -40 && REP_JOBS_BLOCK.includes(id); },
  greet(role) {
    if (this.v >= 60) return pick(['어머, 소문 들었어요! 늘 고마워요!', '영웅님 오셨네요! 편하게 보세요.', '단골 중의 단골이시죠. 잘 챙겨드릴게요!']);
    if (this.v <= -35) return pick(['…어서 오세요. (눈치를 본다)', '소문 들었어요… 조용히 계산만 하고 가세요.', '저, 저희 가게에선 사고 치지 마세요…']);
    return null;
  },
  tick(dt) {
    if (!G.started || ADMIN.on || ME.dead || ME.jail) return;
    // 가만히 있으면 천천히 0으로 (1분에 1점)
    if (this.v !== 0) { const d = dt / 60; this.v = this.v > 0 ? Math.max(0, this.v - d) : Math.min(0, this.v + d); }
    if ((this._t -= dt) > 0) return; this._t = 2;
    if (INTERIOR.cur || ME.vehicle || Math.abs(this.v) < 60) return; const a = anchorOf(ME);
    for (const p of PEDS) {
      if (p.state !== 'walk' && p.state !== 'idle') continue; if (p.kind !== 'civ' && p.kind !== 'worker') continue; if (!p.char || !p.char.root.visible) continue;
      if (Math.hypot(p.x - a.x, p.z - a.z) > 8 || G.t < (p._repT || 0)) continue; p._repT = G.t + 25; if (Math.random() > 0.3) continue;
      if (this.v <= -60) { p.char.say(pick(['저 사람… 소문의 그 사람이잖아', '가까이 가지 마, 위험하대', '뉴스에 나온 그 얼굴이야…']), 3.5); if (Math.random() < 0.5) pedAction(p, 'flee'); }
      else {
        p.char.say(pick(['영웅님 안녕하세요!', '요즘 칭찬이 자자해요!', '덕분에 동네가 살 만해요']), 3.5);
        if (G.t > this._gift && Math.random() < 0.35) { this._gift = G.t + 360; const g = Math.round(rnd(500, 3000) / 100) * 100; ME.money += g; sfx('cash'); toast(`🎁 ${p.char.nameText || '시민'}이(가) 고마움의 뜻으로 ${fmtMoney(g)}을 건넸다`, 3500); }
      }
    }
  },
  phoneItem() { return { ic: '🌟', t: '내 평판', p: 0, d: `${this.name()} (${this.v > 0 ? '+' : ''}${Math.round(this.v)})`, fn: () => setTimeout(() => this.open(), 30) }; },
  open() {
    const v = this.v, pm = this.priceMul(); const bar = `<div style="height:10px;border-radius:6px;background:linear-gradient(90deg,#ff4a3a,#d8c070,#5fe0a0);position:relative;margin:8px 0"><i style="position:absolute;top:-4px;left:${(v + 100) / 2}%;width:4px;height:18px;background:#fff;border-radius:2px;transform:translateX(-2px)"></i></div>`;
    const L = [
      { ic: '🏷️', t: pm > 1 ? `상점 가격 +${Math.round((pm - 1) * 100)}%` : pm < 1 ? `상점 가격 -${Math.round((1 - pm) * 100)}% (단골 할인)` : '상점 가격 보통', p: '', d: '직원이 소문을 듣고 값을 부른다 (-30 이하 +15% · -60 이하 +30% · +30 이상 -5% · +60 이상 -10%)', dis: true, disMsg: '평판이 가격에 영향을 준다' },
      { ic: '🚫', t: v <= -85 ? '일부 가게가 팔지 않는다' : '가게 출입 문제 없음', p: '', d: '-85 이하면 가게 직원이 판매를 거절한다 (병원·은행·관공서는 예외)', dis: true, disMsg: '평판이 -85 이하면 상점이 거절한다' },
      { ic: '💼', t: v <= -40 ? '번듯한 직업 지원 불가' : `면접 합격률 ×${this.passMul().toFixed(2)}`, p: '', d: '-40 이하면 경찰·공무원·장관·의사·변호사 지원 불가 · 합격률도 평판을 탄다', dis: true, disMsg: '평판이 면접에 영향을 준다' },
      { ic: '🗣️', t: Math.abs(v) >= 60 ? (v > 0 ? '길에서 NPC들이 인사한다 (가끔 사례도!)' : '길에서 NPC들이 수군대며 피한다') : 'NPC 반응 보통', p: '', d: '±60 이상이면 NPC들이 알아본다 · 범죄를 본 NPC는 다른 NPC에게 소문을 낸다', dis: true, disMsg: '평판이 NPC 반응에 영향을 준다' },
      { ic: '🧡', t: '올리는 법', p: '', d: '병원 자원봉사 · 병원 기부 · 환자 치료 · 성실한 근무', dis: true, disMsg: '병원에서 자원봉사를 할 수 있다' },
      { ic: '💢', t: '내리는 법', p: '', d: '범죄 (중범죄일수록 크게) · 가만히 두면 1분에 1점씩 0으로 돌아온다', dis: true, disMsg: '범죄는 평판을 깎는다' },
    ];
    if (this.log.length) L.push({ ic: '📜', t: '최근 변화', p: '', d: this.log.slice().reverse().join(' · '), dis: true, disMsg: '최근 평판 변화' });
    UI.openMenu('🌟 내 평판', `<b style="color:${this.color()}">${SYS.title() ? '🏅' + SYS.title() + ' · ' : ''}${this.name()}</b> (${v > 0 ? '+' : ''}${Math.round(v)})${bar}<small>-100 악명 ← 0 → +100 영웅</small>`, L);
  },
};
