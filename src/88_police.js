// @v 2026101410


// ================= 경찰 신고 · 수사 · 판결 =================
// 피해자: 나를 공격한 상대(플레이어·갱단원)를 기록 → 🚨 신고(J / 폰 112 / 터치 🚨)
// 방장(권한자): 실제로 오간 피해 메시지로 사건을 따로 기록해 두고, 그 기록으로만 수사한다 → 조작된 신고는 '증거 없음'
// 판결: 실수(경고·벌금) / 고의(체포 영장 → 경찰 출동, 형량 = 무기·피해·횟수·전과·평소 행실)
const W_SEV = { fist: 1, car: 1, bat: 2, axe: 3, pistol: 3, smg: 3, shotgun: 3, rifle: 4, sniper: 4, boom: 4 };
function wName(w) { return w === 'car' ? '차량' : w === 'boom' ? '폭발물' : (WEAPONS[w] ? WEAPONS[w].name : '맨손'); }
function escHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
const GANG_NAME = { gangA: '레드 크루 조직원', gangB: '블루 독스 조직원' };
const POLICE = {
  log: new Map(), hinc: new Map(), rec: new Map(), my: null, card: null, btn: null, busy: new Set(),
  loadMy() { if (this.my) return this.my; try { this.my = Object.assign({ a: 0, c: 0, w: 0 }, JSON.parse(localStorage.getItem('sbc3d_rec') || '{}')); } catch (e) { this.my = { a: 0, c: 0, w: 0 }; } return this.my; },
  saveMy() { try { localStorage.setItem('sbc3d_rec', JSON.stringify(this.my)); } catch (e) { } },
  rcOut() { const m = this.loadMy(); return [m.a | 0, m.c | 0]; },
  // ---------- 피해자 쪽 기록 (신고 목록) ----------
  onHurt(from, amt, w) {
    if (!from || amt <= 0) return; from = String(from); let kind, name, seed = 0;
    if (G.players.has(from)) { kind = 'player'; name = G.players.get(from).name || '플레이어'; }
    else if (/^n\d+$/.test(from)) { const p = PEDS[+from.slice(1)]; if (!p || !p.kind.startsWith('gang')) return; kind = 'gang'; name = GANG_NAME[p.kind]; seed = p.seed; w = w || p.weapon; }
    else return;
    let e = this.log.get(from);
    if (!e || e.reported || G.t - e.lastT > 300 || (kind === 'gang' && e.seed !== seed)) { e = { a: from, kind, name, seed, ws: {}, hits: 0, dmg: 0, minHp: 100, dead: false, firstT: G.t, lastT: G.t, reported: false }; this.log.set(from, e); }
    e.name = name; e.hits++; e.dmg += amt; e.ws[w || 'fist'] = (e.ws[w || 'fist'] || 0) + 1; e.lastT = G.t; e.minHp = Math.min(e.minHp, Math.max(0, ME.hp)); if (ME.dead) e.dead = true;
    this.refreshBtn(true);
  },
  pending() { const out = []; for (const e of this.log.values()) if (!e.reported && G.t - e.lastT < 300) out.push(e); return out.sort((a, b) => b.lastT - a.lastT); },
  outcome(e) { return e.dead ? '사망' : e.minHp <= 35 ? '중상' : '경상'; },
  worstW(ws) { let best = 'fist', s = -1; for (const w in ws) { const v = W_SEV[w] || 1; if (v > s) { s = v; best = w; } } return best; },
  open() {
    const L = this.pending();
    const items = L.map(e => ({ ic: e.kind === 'player' ? '👤' : e.a && PEDS[+e.a.slice(1)] && PEDS[+e.a.slice(1)].kind === 'gangA' ? '🔴' : '🔵', t: e.name, p: '신고', d: `${Object.keys(e.ws).map(wName).join('·')} · ${e.hits}회 · 피해 ${Math.round(e.dmg)} · ${this.outcome(e)} · ${Math.max(0, Math.round(G.t - e.lastT))}초 전`, fn: () => this.report(e) }));
    if (!items.length) items.push({ ic: 'ℹ️', t: '신고할 사건이 없다', d: '최근 5분 안에 나를 공격한 사람·갱단원이 있으면 여기에 떠요', dis: true, disMsg: '신고할 사건이 없다' });
    UI.openMenu('🚔 경찰 신고 (112)', '누가 나를 공격했나요? 경찰이 기록을 보고 <b>실수인지 고의인지</b>, 무기·피해·전과로 처분을 정해요.', items);
  },
  report(e) {
    if (!e || e.reported) return; e.reported = true; this.refreshBtn();
    toast('🚔 신고 접수 — 경찰이 사건 기록을 검토 중…', 2200); sfx('ui');
    if (!G.online || G.isHost) this.hostReport(e.a, ME.id); else NET.send({ t: 'report', a: e.a });
  },
  // ---------- 방장 쪽: 검증된 사건 기록 ----------
  key(a, v) { return a + '>' + v; },
  hostEntry(a, v, w) {
    const k = this.key(a, v); let e = this.hinc.get(k);
    if (!e || e.judged || G.t - e.lastT > 600) { e = { a, v, ws: {}, hits: 0, dmg: 0, minHp: 100, dead: false, firstT: G.t, lastT: G.t, judged: false, seed: 0, pk: null }; this.hinc.set(k, e); if (this.hinc.size > 60) this.hinc.delete(this.hinc.keys().next().value); }
    if (/^n\d+$/.test(a)) { const p = PEDS[+a.slice(1)]; if (p) { if (e.seed && e.seed !== p.seed) { e = { a, v, ws: {}, hits: 0, dmg: 0, minHp: 100, dead: false, firstT: G.t, lastT: G.t, judged: false }; this.hinc.set(k, e); } e.seed = p.seed; e.pk = p.kind; } }
    return e;
  },
  // 방장이 보거나 보낸 피해 메시지 (src: 보낸 사람의 실제 연결 id — 메시지 안의 from은 방장 자신이 보낸 것만 믿는다)
  hostSee(m, src) {
    if (!G.isHost || !m) return;
    if (m.t === 'dmg') {
      if (!m.to || !src) return; const a = src === ME.id ? String(m.from || ME.id) : src; if (a === m.to) return;
      if (src !== ME.id && /^n/.test(String(m.from || ''))) return; // 게스트는 NPC 피해를 만들 수 없다
      const e = this.hostEntry(a, m.to, m.w); const w = m.w || (m.k === 'car' ? 'car' : m.k === 'boom' ? 'boom' : 'fist');
      e.hits++; e.ws[w] = (e.ws[w] || 0) + 1; e.claim = (e.claim || 0) + (+m.amt || 0); e.lastT = G.t;
    } else if (m.t === 'hitAck') {
      const a = String(m.a || m.to || ''), v = src; if (!a || !v) return; const e = this.hinc.get(this.key(a, v)); if (!e || e.judged) return;
      this.hostOutcome(e, +m.d || 0, m.hp, !!m.dead);
    }
  },
  hostOutcome(e, d, hp, dead) { e.dmg += Math.max(0, d); if (hp != null) e.minHp = Math.min(e.minHp, Math.max(0, +hp)); if (dead) e.dead = true; },
  // 방장 자신이 맞았을 때 / NPC가 방장을 때렸을 때
  hostSelfHit(a, w, k, d) { if (!G.isHost || !a) return; const e = this.hostEntry(String(a), ME.id, w); const ww = w || (k === 'car' ? 'car' : 'fist'); e.hits++; e.ws[ww] = (e.ws[ww] || 0) + 1; e.lastT = G.t; this.hostOutcome(e, d, ME.hp, ME.dead); },
  recOf(id) { let r = this.rec.get(id); if (!r) { r = { crimes: [], lastW: 0, a: 0, c: 0, w: 0, rc: [0, 0], since: G.t }; this.rec.set(id, r); } return r; },
  observe(id, wanted, rc) {
    if (!G.isHost || !id) return; const r = this.recOf(id); wanted = wanted | 0;
    if (wanted > r.lastW) for (let i = r.lastW; i < wanted; i++) r.crimes.push(G.t);
    r.lastW = wanted; r.wantedNow = wanted; if (Array.isArray(rc)) r.rc = [rc[0] | 0, rc[1] | 0];
    while (r.crimes.length && G.t - r.crimes[0] > 900) r.crimes.shift();
  },
  nameOf(id) { if (id === ME.id) return ME.name; const rp = G.players.get(id); return rp ? rp.name : '플레이어'; },
  hostReport(a, v) {
    if (!G.isHost) return; a = String(a || ''); const e = this.hinc.get(this.key(a, v));
    const reply = (o) => { const msg = Object.assign({ t: 'verdict', v, a, vn: this.nameOf(v) }, o); setTimeout(() => { if (G.online) NET.send(msg); this.onVerdict(msg); }, 1600); };
    if (!e || !e.hits || G.t - e.lastT > 600) { reply({ r: 'none', an: /^n/.test(a) ? '갱단원' : this.nameOf(a) }); return; }
    if (e.judged) { reply({ r: 'dup', an: /^n/.test(a) ? GANG_NAME[e.pk] || '갱단원' : this.nameOf(a) }); return; }
    e.judged = true;
    const outcome = e.dead ? '사망' : e.minHp <= 35 ? '중상' : '경상'; const mw = this.worstW(e.ws); const sev = W_SEV[mw] || 1; const dmg = Math.round(e.dmg || e.claim || 0);
    const base = { hits: e.hits, w: Object.keys(e.ws).map(wName).join('·'), mw: wName(mw), out: outcome, dmg };
    if (/^n\d+$/.test(a)) { // 갱단원 신고 → 경찰이 가서 연행
      const p = PEDS[+a.slice(1)]; const here = p && p.seed === e.seed && p.state !== 'dead' && p.state !== 'parked';
      if (here) this.arrestPed(p); reply(Object.assign(base, { r: here ? 'gang' : 'gangGone', an: GANG_NAME[e.pk] || '갱단원', intent: '고의', dead: p && p.state === 'dead' ? 1 : 0 })); return;
    }
    const R = this.recOf(a); const rcA = a === ME.id ? this.rcOut() : R.rc; const arrests = Math.max(R.a, rcA[0] | 0), conv = Math.max(R.c, rcA[1] | 0); const priors = arrests + conv;
    const recent = R.crimes.filter(t => G.t - t < 900).length; const wantedNow = a === ME.id ? ME.wanted : (R.wantedNow | 0);
    const cScore = priors * 2 + recent + wantedNow; const conduct = cScore === 0 ? '양호' : cScore <= 3 ? '보통' : '불량';
    // 실수 vs 고의: 한 번 부딪히거나 한 대 맞은 정도(맨손·차량)는 실수, 반복·무기·사망은 고의
    let score = (e.hits - 1) * 0.8 + (sev >= 3 ? 2 : sev === 2 ? 1 : 0) + (e.dead && sev >= 2 ? 1 : 0) + (e.hits >= 3 && e.lastT - e.firstT > 6 ? 0.5 : 0);
    if (mw === 'car' && e.hits <= 2) score = Math.min(score, 1);
    const intent = score >= 2 ? '고의' : '실수';
    const adm = isAdminId(a) || (a === ME.id && ADMIN.on);
    let fine = 0, sentence = 0, act;
    if (intent === '실수') { fine = { 경상: 3000, 중상: 15000, 사망: 50000 }[outcome] * (conduct === '불량' ? 2 : 1); if (outcome === '경상' && conduct === '양호' && e.hits === 1) { fine = 0; act = '경고'; } else act = '벌금'; }
    else {
      let s = ({ 1: 40, 2: 70, 3: 100, 4: 130 }[sev]) * ({ 경상: 1, 중상: 1.6, 사망: 2.6 }[outcome]) + Math.min(60, (e.hits - 1) * 6);
      s *= 1 + Math.min(1.5, priors * 0.25); if (conduct === '양호') s *= 0.8; if (conduct === '불량') s *= 1.2; s += wantedNow * 15;
      sentence = Math.round(clamp(s, 40, 900) / 5) * 5; act = '체포';
    }
    if (intent === '고의') R.c++; else R.w++;
    reply(Object.assign(base, { r: 'player', an: this.nameOf(a), intent, act, fine, s: sentence, pri: priors, arr: arrests, conv, recent, conduct, adm: adm ? 1 : 0 }));
    if (intent === '고의' && !adm) this.dispatch(a);
  },
  // ---------- 판결 카드 (피해자·가해자 화면) ----------
  onVerdict(m) {
    const S = (v, ok, d) => ok.includes(v) ? v : d; // 방장이 보낸 값도 형식을 강제 (카드에 그대로 들어가므로)
    m = Object.assign({}, m, { hits: m.hits | 0, dmg: m.dmg | 0, s: m.s | 0, fine: Math.max(0, m.fine | 0), pri: m.pri | 0, arr: m.arr | 0, conv: m.conv | 0, recent: m.recent | 0, an: String(m.an || '').slice(0, 20), vn: String(m.vn || '').slice(0, 20), w: String(m.w || '').slice(0, 40), out: S(m.out, ['경상', '중상', '사망'], '경상'), intent: S(m.intent, ['고의', '실수'], '실수'), act: S(m.act, ['체포', '벌금', '경고'], '경고'), conduct: S(m.conduct, ['양호', '보통', '불량'], '보통'), r: S(m.r, ['none', 'dup', 'gang', 'gangGone', 'player'], 'none') });
    const meV = m.v === ME.id, meA = m.a === ME.id;
    const line = m.r === 'player' ? `🚔 수사 결과: ${m.an} → ${m.vn} 사건 · ${m.intent} · ${m.adm ? '관리자 면책' : m.act === '체포' ? '체포 영장 (형량 ' + m.s + '초)' : m.act === '벌금' ? '벌금 ' + fmtMoney(m.fine) : '경고'}`
      : m.r === 'gang' ? `🚔 ${m.vn}님 신고로 ${m.an} 연행 출동` : '';
    if (line) UI.chatLine(null, line);
    if (!meV && !meA) return;
    if (meV) { const e = this.log.get(m.a); if (e) e.reported = true; }
    const rows = [];
    const R = (k, v, c) => rows.push(`<div class="vr"><span>${k}</span><b${c ? ` style="color:${c}"` : ''}>${v}</b></div>`);
    let title = '🚔 수사 결과', badge = '', sub = '';
    if (m.r === 'none') { badge = '증거 없음'; sub = '경찰 기록에 해당 사건이 없어 신고가 기각됐다'; }
    else if (m.r === 'dup') { badge = '이미 처리됨'; sub = '이 사건은 이미 수사가 끝났다'; }
    else {
      R('사건', `${escHtml(m.an)} → ${escHtml(m.vn)}`); R('사용 무기', escHtml(m.w || m.mw)); R('피해', `${m.hits}회 · 총 ${m.dmg} · <span style="color:${m.out === '사망' ? '#ff5a5a' : m.out === '중상' ? '#ffb03a' : '#9fe0ff'}">${m.out}</span>`);
      if (m.r === 'player') {
        badge = m.intent; R('판정', m.intent === '고의' ? '🔴 고의 (반복·무기 사용)' : '🟢 실수 (우발적)', m.intent === '고의' ? '#ff6a6a' : '#7ef0a0');
        R('전과', `${m.pri}범 (체포 ${m.arr} · 유죄 ${m.conv}) · 최근 범죄 ${m.recent}건`); R('평소 행실', m.conduct, m.conduct === '양호' ? '#7ef0a0' : m.conduct === '불량' ? '#ff6a6a' : '#ffd34a');
        R('처분', m.adm ? '👑 관리자 — 처벌 면제' : m.act === '체포' ? `🚨 체포 영장 · 형량 ${Math.floor(m.s / 60)}분 ${m.s % 60}초` : m.act === '벌금' ? `💸 벌금 ${fmtMoney(m.fine)} (피해자에게 지급)` : '⚠ 경고 (초범·경상)', '#ffd34a');
      } else { badge = '고의'; R('판정', '🔴 고의 (갱단 폭행)', '#ff6a6a'); R('처분', m.r === 'gang' ? '🚓 경찰 출동 → 연행' : m.dead ? '용의자 사망 — 사건 종결' : '용의자 도주 — 지명수배', '#ffd34a'); }
    }
    this.showCard(title, badge, sub, rows.join(''));
    // 처분 적용 (각자 자기 화면에서)
    if (m.r === 'player' && !m.adm) {
      if (meA) {
        const my = this.loadMy();
        if (m.act === '체포') { my.c++; ME.warrant = { s: m.s, until: G.t + 600, v: m.vn }; if (ME.wanted < 2) { ME.wanted = 2; ME.wantedCool = 0; UI.updateStars(true); } announce('🚨 체포 영장 발부', `${m.vn}님 신고 · 형량 ${m.s}초 — 경찰이 출동했다`); sfx('error'); }
        else { my.w++; if (m.fine) { const f = Math.min(ME.money, m.fine); ME.money -= f; toast(`💸 벌금 ${fmtMoney(f)} 납부`); } else toast('⚠ 경찰 경고: 조심하세요'); }
        this.saveMy();
      }
      if (meV && m.act === '벌금' && m.fine) { ME.money += m.fine; sfx('cash'); toast(`💰 보상금 ${fmtMoney(m.fine)} 받음`); }
    }
  },
  showCard(title, badge, sub, html) {
    let el = $('#verdict'); if (!el) { el = document.createElement('div'); el.id = 'verdict'; el.className = 'panel'; document.body.appendChild(el); }
    el.innerHTML = `<button type="button" class="vx" aria-label="닫기">✕</button><h3></h3>${badge ? `<div class="vb ${badge === '고의' ? 'bad' : badge === '실수' ? 'ok' : ''}"></div>` : ''}${sub ? '<div class="vs"></div>' : ''}${html}`;
    el.querySelector('h3').textContent = title; if (badge) el.querySelector('.vb').textContent = badge; if (sub) el.querySelector('.vs').textContent = sub;
    el.style.display = 'block'; el.querySelector('.vx').onclick = (e) => { e.stopPropagation(); el.style.display = 'none'; };
    el.ontouchstart = (e) => e.stopPropagation();
    clearTimeout(this._cT); this._cT = setTimeout(() => { el.style.display = 'none'; }, 14000); this.card = el;
  },
  // ---------- 경찰 출동 (방장 NPC) ----------
  freeCop(x, z, near = 70, dmin = 28, dmax = 45) {
    let best = null, bd = near;
    for (const p of PEDS) if (p.kind === 'police' && (p.state === 'walk' || p.state === 'idle' || p.state === 'talk') && !p.raidCop) { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p; } }
    if (best) return best;
    // 근처에 경찰이 없으면 순찰 경찰을 새로 배치 (안 보이는 NPC를 경찰로 바꿔 35m 밖 도로에 세운다)
    const spare = PEDS.filter(p => p.state === 'parked' || ((p.kind === 'civ' || p.kind === 'worker') && p.state === 'walk' && nearestPlayerDist(p.x, p.z) > 90)).sort((a, b) => (a.state === 'parked' ? -1 : 0) - (b.state === 'parked' ? -1 : 0))[0];
    if (!spare) return null; const r = edgeNearPoint(x, z, dmin, dmax, e => !e.bridge);
    pedSetIdentity(spare, 'police', (Math.random() * 1e9) | 0);
    if (r) placePedOnEdge(spare, r.e, r.t, 1, 1); else { const a = rnd(0, TAU), dd = (dmin + dmax) / 2; spare.x = x + Math.sin(a) * dd; spare.z = z + Math.cos(a) * dd; spare.y = groundHeight(spare.x, spare.z); }
    spare.spawnT = G.t; spare.job = 'patrol'; return spare;
  },
  // 수배자에게 경찰 출동 (방장, 5초마다): ★1 1명 · ★2 2명 · ★3 3명 · ★4 4명 · ★5 6명이 쫓아온다
  //  - 새로 신고되거나(★이 올라감) 경찰·순찰차 눈에 띄는 동안만 계속 보낸다 → 멀리 따돌리고 15초 숨으면 추적이 끊기고 ★이 줄기 시작한다
  hostDispatch() {
    const seen = this._seen || (this._seen = {}), lw = this._lw || (this._lw = {});
    for (const pl of playersList()) {
      const w = pl.wanted | 0, pw = lw[pl.id] | 0; lw[pl.id] = w; if (!w || pl.inside) continue; if (pl.me ? ADMIN.on : G.adminId === pl.id) continue;
      if (w > pw || PEDS.some(q => q.kind === 'police' && q.state !== 'dead' && q.state !== 'parked' && Math.hypot(q.x - pl.x, q.z - pl.z) < 75) || TRAFFIC.some(v => v.model === 'police' && v.ai && !v.dead && Math.hypot(v.x - pl.x, v.z - pl.z) < 90)) seen[pl.id] = G.t;
      if (G.t - (seen[pl.id] ?? -99) > 15) continue; // 경찰이 놓쳤다
      const want = [0, 1, 2, 3, 4, 6][Math.min(5, w)]; let have = 0;
      for (const p of PEDS) if (p.kind === 'police' && p.state === 'fight' && p.target && p.target.id === pl.id) { have++; if (p.dispT < G.t + 20) p.dispT = G.t + 30; }
      for (let i = have; i < want; i++) {
        const c = this.freeCop(pl.x, pl.z, 130, 80, 115); if (!c) break; // 새 경찰은 80~115m 밖에서 달려온다
        c.state = 'fight'; c.target = { kind: pl.me ? 'me' : 'player', id: pl.id }; c.dispT = G.t + 40; c.percT = 1;
        if (c.char) c.char.say(pick(['🚨 거기 서!', '🚔 경찰이다! 멈춰!', '🚨 수배자 발견!', '🚔 손 들어!']), 3);
      }
    }
  },
  dispatch(id) {
    const tg = { kind: id === ME.id ? 'me' : 'player', id }; const tp = id === ME.id ? anchorOf(ME) : anchorOf(G.players.get(id) || { x: ME.x, z: ME.z });
    for (let i = 0; i < 2; i++) { const c = this.freeCop(tp.x, tp.z); if (!c) break; c.state = 'fight'; c.target = tg; c.dispT = G.t + 60; c.percT = 1; if (c.char) c.char.say('🚨 체포 영장 집행! 멈춰!', 4); }
  },
  arrestPed(q) {
    q.state = 'surrender'; q.target = null; q.raid = false; q.timer = 90; q.spd = 0; q.aiming = false; if (q.char) q.char.say('🙌 알았어요, 항복!', 4);
    const c = this.freeCop(q.x, q.z, 70); if (!c) { q.state = 'parked'; return; }
    c.state = 'collar'; c.collar = q.id; c.collarT = G.t; c.cuffT = 0; c.target = null; if (c.char) c.char.say('🚓 경찰이다! 손 들어!', 4);
  },
  copCollar(p, dt) {
    const q = PEDS[p.collar]; if (!q || q.state !== 'surrender') { p.state = 'walk'; p.collar = null; snapToNearestEdge(p); return; }
    const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
    if (G.t - p.collarT > 25 && d > 3) { p.x = q.x - 1.2; p.z = q.z - 1.2; p.y = q.y; } // 길이 막히면 바로 옆으로
    if (d > 1.3) { p.spd = 4.4; p.yaw = dampAng(p.yaw, Math.atan2(dx, dz), 8, dt); p.x += Math.sin(p.yaw) * p.spd * dt; p.z += Math.cos(p.yaw) * p.spd * dt; const r = resolveCircle(p.x, p.z, 0.3, p.y, 1.7); p.x = r.x; p.z = r.z; p.y = groundHeight(p.x, p.z, p.y + 1); return; }
    p.spd = 0; p.yaw = dampAng(p.yaw, Math.atan2(dx, dz), 8, dt); q.yaw = dampAng(q.yaw, Math.atan2(-dx, -dz) + Math.PI, 8, dt);
    if (!p.cuffT) { p.cuffT = G.t + 2.5; p.act = 'punchR'; p.actT = 0; if (p.char) p.char.say('🔗 수갑 채웁니다. 연행합니다', 3); FX.emoji('🔗', q.x, q.y + 2.1, q.z); }
    else if (G.t >= p.cuffT) {
      q.state = 'parked'; q.target = null; p.state = 'walk'; p.collar = null; p.cuffT = 0; snapToNearestEdge(p);
      FX.emoji('🚓', q.x, q.y + 2, q.z); const t = `🚓 ${GANG_NAME[q.kind] || '갱단원'} 연행 완료`; UI.chatLine(null, t); if (G.online) NET.send({ t: 'chat', m: t, sys: 1 });
    }
  },
  // ---------- 매 프레임 ----------
  tick(dt) {
    if (!G.started) return;
    if (G.isHost && (this._oT = (this._oT || 0) - dt) <= 0) { this._oT = 0.5; this.observe(ME.id, ME.wanted, this.rcOut()); }
    if ((!G.online || G.isHost) && (this._dT = (this._dT || 0) - dt) <= 0) { this._dT = 5; this.hostDispatch(); }
    const w = ME.warrant; if (w) { if (ME.jail || ADMIN.on) ME.warrant = null; else if (G.t > w.until) { ME.warrant = null; toast('📄 체포 영장 만료 — 하지만 전과 기록은 남는다'); } else if (!ME.dead && ME.wanted < 2) { ME.wanted = 2; ME.wantedCool = 0; UI.updateStars(); } }
    if ((this._bT = (this._bT || 0) - dt) <= 0) { this._bT = 1; this.refreshBtn(); }
  },
  refreshBtn(flash) {
    const n = this.pending().length; const b = $('#repBtn');
    if (b) { b.classList.toggle('hidden', !n || !G.started); b.querySelector('b').textContent = n; if (flash && n) { b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); } }
  },
  initUI() {
    if ($('#repBtn')) return; const b = document.createElement('button'); b.type = 'button'; b.id = 'repBtn'; b.className = 'hidden';
    b.innerHTML = `🚨 신고 <b>0</b>${IS_TOUCH ? '' : '<small>J</small>'}`; document.body.appendChild(b);
    const go = (e) => { e.preventDefault(); e.stopPropagation(); AU.init(); this.open(); };
    b.addEventListener('click', go); b.addEventListener('touchstart', go, { passive: false });
  },
};
// 가해자가 수감되면 기록
const _lawArrest = LAW.arrest.bind(LAW);
LAW.arrest = function () { const was = !!ME.jail; _lawArrest(); if (!was && ME.jail) { const my = POLICE.loadMy(); my.a++; POLICE.saveMy(); ME.warrant = null; } };
