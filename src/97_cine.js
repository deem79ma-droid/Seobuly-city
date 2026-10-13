// @v 2026101221
// ================= 연출 (컷신) =================
// 카메라 컷신: 레터박스(위아래 검은 띠) + 큰 제목 + 자막 + 카메라 이동(궤도·돌리·크레인) · 언제든 건너뛰기 (Space / Esc / 버튼)
// 카드 연출: 화면 2D 애니메이션만 (속보 배너, N일차, 범죄자 도장, 사이렌, 눈 감기/뜨기 …) — 조작은 안 막는다
// 컷신 중에는 조작이 잠기고 무적이다. 전투 중·운전 중이면 카메라 컷신 대신 카드만 나온다.
const CINE = {
  on: null, q: [], t: 0, el: null, last: {}, seenPres: undefined, seenDay: undefined,
  enabled() { try { return localStorage.getItem('sbc3d_cine') !== '0'; } catch (e) { return true; } },
  setEnabled(v) { try { localStorage.setItem('sbc3d_cine', v ? '1' : '0'); } catch (e) { } if (!v) this.stop(); },
  // 지금 카메라 컷신을 틀어도 되는 상황인가
  safe() { return G.started && !ME.dead && !ME.wanted && !(ME.vehicle && Math.abs(ME.vehicle.speed) > 3) && !UI.menuOpen && !JOBS.chan && !(HOUSE.picking); },
  // ---------- 화면 요소 ----------
  init() {
    if (this.el) return;
    const st = document.createElement('style'); st.textContent = `
#cine{position:fixed;inset:0;z-index:45;pointer-events:none;overflow:hidden;font-family:inherit}
#cine .lb{position:absolute;left:0;right:0;height:0;background:#000;transition:height .7s cubic-bezier(.6,0,.2,1);z-index:3}
#cine .lb.t{top:0}#cine .lb.b{bottom:0}#cine.bars .lb{height:11vh}
#cine .ttl{position:absolute;left:0;right:0;top:calc(11vh + 4%);text-align:center;color:#fff;opacity:0;transform:translateY(14px);transition:opacity .8s,transform .8s,letter-spacing 1.6s;letter-spacing:.6em;z-index:4;text-shadow:0 4px 30px rgba(0,0,0,.65)}
#cine .ttl.show{opacity:1;transform:none;letter-spacing:.12em}
#cine .ttl b{display:block;font-size:clamp(28px,6.4vw,64px);font-weight:900}
#cine .ttl i{display:block;margin:12px auto 10px;height:3px;width:min(340px,50vw);background:linear-gradient(90deg,transparent,var(--cc,#ffd34a),transparent);transform:scaleX(0);transition:transform 1.1s .25s cubic-bezier(.2,.8,.2,1)}
#cine .ttl.show i{transform:scaleX(1)}
#cine .ttl small{display:block;font-size:clamp(13px,2vw,19px);font-weight:600;letter-spacing:.08em;opacity:.9}
#cine .cap{position:absolute;left:0;right:0;bottom:calc(11vh + 18px);text-align:center;color:#f2f2f2;font-size:clamp(13px,1.9vw,18px);font-weight:600;opacity:0;transition:opacity .5s;z-index:4;text-shadow:0 2px 10px #000}
#cine .cap.show{opacity:1}
#cine .cap em{font-style:normal;color:var(--cc,#ffd34a);font-weight:800;margin-right:8px}
#cine .fl{position:absolute;inset:0;background:#fff;opacity:0;z-index:5}
#cine .fd{position:absolute;inset:0;background:#000;opacity:0;transition:opacity .45s;z-index:6}
#cine .tint{position:absolute;inset:0;opacity:0;transition:opacity .8s;z-index:1}
#cine .skip{position:absolute;right:16px;bottom:calc(11vh + 14px);z-index:7;pointer-events:auto;border:1px solid rgba(255,255,255,.35);background:rgba(0,0,0,.45);color:#fff;border-radius:999px;padding:8px 16px;font:700 13px inherit;display:none;cursor:pointer}
#cine.bars .skip{display:block}
#cine .ccard{text-shadow:0 3px 18px rgba(0,0,0,.75);position:absolute;left:50%;top:22%;transform:translate(-50%,0);text-align:center;color:#fff;z-index:4;pointer-events:none}
#cine .eye{position:absolute;left:-10%;right:-10%;height:52%;background:#000;z-index:6;transition:transform 1.1s cubic-bezier(.7,0,.3,1)}
#cine .eye.u{top:0;border-radius:0 0 50% 50%/0 0 30% 30%;transform:translateY(-102%)}#cine .eye.d{bottom:0;border-radius:50% 50% 0 0/30% 30% 0 0;transform:translateY(102%)}
#cine.shut .eye.u,#cine.shut .eye.d{transform:none}
.cine-news{position:absolute;left:0;right:0;top:15%;height:46px;display:flex;align-items:stretch;transform:translateX(-105%);transition:transform .55s cubic-bezier(.2,.9,.2,1);z-index:4}
.cine-news.in{transform:none}.cine-news.out{transform:translateX(105%)}
.cine-news b{background:#d0202a;color:#fff;font-weight:900;font-size:20px;padding:0 18px;display:flex;align-items:center;letter-spacing:.1em}
.cine-news span{flex:1;background:rgba(10,12,20,.88);color:#fff;font-weight:700;font-size:16px;display:flex;align-items:center;padding:0 16px;white-space:nowrap;overflow:hidden}
.cine-stamp{font-size:clamp(30px,6vw,60px);font-weight:900;color:#ff3a3a;border:6px solid #ff3a3a;padding:6px 26px;border-radius:10px;transform:rotate(-12deg) scale(3);opacity:0;transition:transform .35s cubic-bezier(.3,1.6,.5,1),opacity .2s;letter-spacing:.1em;background:rgba(0,0,0,.25)}
.cine-stamp.in{transform:rotate(-12deg) scale(1);opacity:1}
.cine-day{font-size:clamp(34px,7vw,72px);font-weight:900;letter-spacing:.3em;opacity:0;transition:opacity .6s,letter-spacing 2.4s}
.cine-day.in{opacity:1;letter-spacing:.12em}.cine-day small{display:block;font-size:16px;letter-spacing:.2em;opacity:.8;font-weight:600}
.cine-big{font-size:clamp(30px,6vw,58px);font-weight:900;opacity:0;transform:scale(1.4);transition:opacity .3s,transform .5s cubic-bezier(.2,1.4,.4,1);text-shadow:0 0 30px currentColor}
.cine-big.in{opacity:1;transform:none}.cine-big small{display:block;font-size:16px;color:#fff;text-shadow:0 2px 8px #000;font-weight:700;margin-top:6px}
@keyframes cineSiren{0%,100%{background:radial-gradient(ellipse at center,transparent 45%,rgba(255,0,0,.55))}50%{background:radial-gradient(ellipse at center,transparent 45%,rgba(0,60,255,.55))}}
@keyframes cineRed{0%,100%{opacity:.15}50%{opacity:.65}}
@keyframes cineScan{0%{background-position:0 0}100%{background-position:0 8px}}
body.cine #jailHud,body.cine #sleepHud,body.cine #navCmp,body.cine #hud,body.cine #touch{opacity:0;pointer-events:none;transition:opacity .4s}
body.cineGray #c{filter:grayscale(1) contrast(1.1) brightness(.85);transition:filter 1.2s}
`; document.head.appendChild(st);
    const el = document.createElement('div'); el.id = 'cine';
    el.innerHTML = '<div class="tint"></div><div class="lb t"></div><div class="lb b"></div><div class="ttl"><b></b><i></i><small></small></div><div class="cap"></div><div class="fl"></div><div class="fd"></div><div class="eye u"></div><div class="eye d"></div><button class="skip" type="button">건너뛰기 ▶</button>';
    document.body.appendChild(el); this.el = el;
    const sk = el.querySelector('.skip'); sk.onclick = e => { e.stopPropagation(); this.skip(); }; sk.addEventListener('pointerdown', e => e.stopPropagation());
    addEventListener('keydown', e => { if (!this.on || !this.on.lock) return; if (/^F\d/.test(e.key)) return; e.preventDefault(); e.stopImmediatePropagation(); if (e.code === 'Space' || e.code === 'Escape' || e.code === 'Enter') this.skip(); }, true);
  },
  $(s) { return this.el.querySelector(s); },
  title(t, s, col) { const e = this.$('.ttl'); e.style.setProperty('--cc', col || '#ffd34a'); this.el.style.setProperty('--cc', col || '#ffd34a'); e.querySelector('b').textContent = t || ''; e.querySelector('small').textContent = s || ''; e.classList.remove('show'); if (t) requestAnimationFrame(() => requestAnimationFrame(() => e.classList.add('show'))); },
  cap(t, tag) { const e = this.$('.cap'); if (!t) { e.classList.remove('show'); return; } e.innerHTML = ''; if (tag) { const m = document.createElement('em'); m.textContent = tag; e.append(m); } e.append(t); e.classList.add('show'); },
  flash(a = 0.9, ms = 500) { const f = this.$('.fl'); f.style.transition = 'none'; f.style.opacity = a; requestAnimationFrame(() => { f.style.transition = `opacity ${ms}ms`; f.style.opacity = 0; }); },
  fade(on) { this.$('.fd').style.opacity = on ? 1 : 0; },
  tint(css, anim) { const t = this.$('.tint'); if (!css) { t.style.opacity = 0; t.style.animation = ''; return; } t.style.background = css; t.style.animation = anim || ''; t.style.opacity = 1; },
  // ---------- 카메라 컷신 ----------
  // seq = { lock, shots:[{d, pos(k,T)→[x,y,z], look(k,T)→[x,y,z], fov, title, sub, cap, tag, at:{초:fn}}], col, tint, gray, end() }
  play(seq) {
    if (!G.started || !this.enabled()) { seq.fallback && seq.fallback(); return; }
    this.init();
    if (this.on) { if (this.q.length < 3) this.q.push(seq); return; }
    this.on = Object.assign({ lock: true }, seq); this.on.i = -1; this.on.t = 0; this.on.T = 0; this.on.total = seq.shots.reduce((a, s) => a + s.d, 0);
    this.on.prevGod = G.godT; if (this.on.lock) G.godT = Math.max(G.godT || 0, G.t + this.on.total + 1);
    this.el.classList.add('bars'); document.body.classList.add('cine'); if (seq.gray) document.body.classList.add('cineGray');
    if (seq.tint) this.tint(seq.tint, seq.tintAnim);
    if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (e) { } }
    if (seq.start) try { seq.start(); } catch (e) { console.warn(e); }
    this.next();
  },
  next() {
    const s = this.on; s.i++; s.t = 0; const sh = s.shots[s.i]; if (!sh) { this.stop(); return; }
    sh._done = {};
    if (sh.title !== undefined) this.title(sh.title, sh.sub, s.col);
    this.cap(sh.cap || '', sh.tag);
    if (sh.flash) this.flash(sh.flash);
  },
  skip() { if (!this.on) return; const s = this.on; for (let i = s.i; i < s.shots.length; i++) { const sh = s.shots[i]; if (sh && sh.at) for (const k in sh.at) if (!(sh._done || {})[k]) { try { sh.at[k](); } catch (e) { } } } this.stop(); },
  stop() {
    const s = this.on; if (!s) return; this.on = null;
    if (this.el) { this.el.classList.remove('bars'); this.title(''); this.cap(''); this.tint(null); }
    document.body.classList.remove('cine'); document.body.classList.remove('cineGray');
    G.godT = Math.max(s.prevGod || 0, G.t + 1.5);
    // 카메라를 컷신 마지막 방향에서 자연스럽게 돌려받는다
    CAM.yaw = Math.atan2(camera.position.x - (ME.vehicle || ME).x, camera.position.z - (ME.vehicle || ME).z) + Math.PI; CAM.pitch = 0.18;
    if (s.end) try { s.end(); } catch (e) { console.warn(e); }
    const n = this.q.shift(); if (n) setTimeout(() => this.play(n), 60);
  },
  // frame()에서 updateCamera 뒤에 불린다 → 카메라를 덮어쓴다
  update(dt) {
    this.watch(dt);
    const s = this.on; if (!s) return;
    const sh = s.shots[s.i]; if (!sh) { this.stop(); return; }
    s.t += dt; s.T += dt; const k = Math.min(1, s.t / sh.d);
    if (sh.at) for (const key in sh.at) if (!sh._done[key] && s.t >= +key) { sh._done[key] = 1; try { sh.at[key](); } catch (e) { console.warn(e); } }
    const p = sh.pos(k, s.t), l = sh.look(k, s.t);
    const gy = groundHeight(p[0], p[2], p[1]) + 0.5; camera.position.set(p[0], Math.max(p[1], gy), p[2]); camera.lookAt(l[0], l[1], l[2]);
    if (sh.roll) camera.rotation.z += sh.roll * Math.sin(k * Math.PI);
    const fov = sh.fov || 55; if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix(); }
    if (ME.char && !ME.vehicle) ME.char.root.visible = true;
    if (s.lock) { INP.mx = INP.mz = 0; INP.joyMag = 0; INP.fire = false; }
    AU.listener.x = camera.position.x; AU.listener.z = camera.position.z;
    if (s.t >= sh.d) this.next();
  },
  locked() { return !!(this.on && this.on.lock); },
  // ---------- 카메라 움직임 도우미 ----------
  E: k => k * k * (3 - 2 * k),
  lerp3(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; },
  // 중심 c 주위를 반지름 r, 높이 h로 a0→a1 돌기
  orbit(c, r, h, a0, a1, d, o = {}) { const C = typeof c === 'function' ? c : () => c; const E = this.E; return Object.assign({ d, pos: k => { const cc = C(), a = a0 + (a1 - a0) * E(k), R = typeof r === 'function' ? r(k) : r, H = typeof h === 'function' ? h(k) : h; return [cc[0] + Math.sin(a) * R, cc[1] + H, cc[2] + Math.cos(a) * R]; }, look: k => { const cc = C(); return [cc[0], cc[1] + (o.ly || 0), cc[2]]; } }, o); },
  dolly(p0, p1, l0, l1, d, o = {}) { const E = this.E; return Object.assign({ d, pos: k => this.lerp3(p0, p1, E(k)), look: k => this.lerp3(l0, l1 || l0, E(k)) }, o); },
  me(dy = 1.2) { const a = ME.vehicle || ME; return [a.x, a.y + dy, a.z]; },
  // 플레이어 정면 각도 (카메라가 얼굴을 보게)
  face() { return ME.yaw; },
  gy(x, z) { return groundHeight(x, z); },
  bld(b) { const y0 = b.y0 ?? groundHeight(b.x, b.z); return { c: [b.x, y0, b.z], h: Math.max(6, (b.top || y0 + 10) - y0), r: Math.max(b.w || 10, b.d || 10) * 0.9 + 10, side: Math.atan2(b.door ? b.door.sx : 0, b.door ? b.door.sz : 1) }; },
  // ---------- 2D 카드 연출 (조작 안 막음) ----------
  card(html, cls, ms = 2600, setup) {
    if (!G.started || !this.enabled()) return; this.init();
    const c = document.createElement('div'); c.className = 'ccard'; const inner = document.createElement('div'); inner.className = cls; inner.innerHTML = html; c.appendChild(inner); this.el.appendChild(c);
    if (setup) setup(inner, c);
    void inner.offsetWidth; setTimeout(() => inner.classList.add('in'), 20);
    setTimeout(() => { inner.classList.remove('in'); c.style.transition = 'opacity .6s'; c.style.opacity = 0; setTimeout(() => c.remove(), 700); }, ms);
  },
  esc(s) { return String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c])); },
  news(s) {
    if (!G.started || !this.enabled()) return; this.init(); if (this._newsEl) this._newsEl.remove();
    const n = document.createElement('div'); n.className = 'cine-news'; n.innerHTML = `<b>속보</b><span>${this.esc(String(s).replace(/^[^\w가-힣]+/u, ''))}</span>`; this.el.appendChild(n); this._newsEl = n;
    requestAnimationFrame(() => requestAnimationFrame(() => n.classList.add('in'))); sfx('ui');
    setTimeout(() => { n.classList.add('out'); setTimeout(() => n.remove(), 700); }, 4600);
  },
  stamp(t, sub) { this.card(`${this.esc(t)}`, 'cine-stamp', 2400, (inner, c) => { if (sub) { const s = document.createElement('div'); s.style.cssText = 'margin-top:26px;font-weight:700;font-size:15px;text-shadow:0 2px 8px #000'; s.textContent = sub; c.appendChild(s); } }); CAM.shake = Math.max(CAM.shake || 0, 0.35); },
  big(t, sub, col, ms = 2400) { this.card(`${this.esc(t)}<small>${this.esc(sub || '')}</small>`, 'cine-big', ms, inner => { inner.style.color = col || '#ffd34a'; }); },
  siren(ms = 3000, red) { this.init(); const t = this.$('.tint'); t.style.background = ''; t.style.animation = red ? 'cineRed .5s infinite' : 'cineSiren .6s infinite'; if (red) t.style.background = 'radial-gradient(ellipse at center,transparent 40%,rgba(255,0,0,.7))'; t.style.opacity = 1; clearTimeout(this._sirT); this._sirT = setTimeout(() => { if (!this.on || !this.on.tint) this.tint(null); }, ms); },
  eyes(shut) { if (!G.started || !this.enabled()) return; this.init(); this.el.classList.toggle('shut', !!shut); },
  // ---------- 상황 감시: 대통령 교체 · 새 날 ----------
  watch(dt) {
    if ((this._wT = (this._wT || 0) - dt) > 0) return; this._wT = 0.5; if (!G.started) return;
    const P = ECON.E && ECON.E.pres; const key = P ? P.id + ':' + P.name : 'none';
    if (this.seenPres === undefined) this.seenPres = key; else if (key !== this.seenPres) { this.seenPres = key; if (P) CINE_EV.president(P); }
    const day = G.day || 0; if (this.seenDay === undefined) this.seenDay = day; else if (day !== this.seenDay) { this.seenDay = day; CINE_EV.newDay(day); }
  },
};

// ================= 이벤트별 연출 =================
const CINE_EV = {
  // 1) 처음 접속: 도시 전체를 날아다니는 30초 인트로
  intro(force) {
    let seen = false; try { seen = !!localStorage.getItem('sbc3d_intro'); } catch (e) { }
    if (seen && !force) return; try { localStorage.setItem('sbc3d_intro', '1'); } catch (e) { }
    const R = REGIONS, g = (x, z) => groundHeight(x, z), C = CINE;
    const reg = (k, d, r, h, a0, a1, tag) => { const c = [R[k].cx, g(R[k].cx, R[k].cz), R[k].cz]; return C.orbit(c, r, h, a0, a1, d, { cap: R[k].desc, tag: R[k].name, ly: 10, fov: 58 }); };
    const sb = R.seoburi;
    C.play({
      col: '#ffd34a', shots: [
        C.dolly([sb.cx + 900, 260, sb.cz + 420], [sb.cx + 380, 130, sb.cz + 160], [sb.cx, 60, sb.cz], null, 5.5, { title: '서불리 시티', sub: 'SEOBULY CITY', fov: 50 }),
        reg('seoburi', 5, 230, 110, 0.9, 2.1),
        Object.assign(reg('plaza', 4, 110, 30, -0.6, 0.6), { pos: k => { const a = -0.6 + 1.2 * C.E(k); return [Math.sin(a) * 110, LAND + 25 + 70 * C.E(k), Math.cos(a) * 110]; }, at: { 1.5: () => FX.confetti(0, LAND + 30, 0) } }),
        reg('jiolle', 4, 170, 70, 2.2, 3.0),
        reg('kaengjibe', 3.5, 120, 28, -0.5, 0.4),
        reg('disanbay', 3.5, 200, 60, 1.2, 2.0),
        reg('simone', 3.5, 320, 120, 3.6, 4.4),
        { d: 3.5, title: `환영합니다, ${ME.name}`, sub: 'P 휴대폰 · M 지도 · E 상호작용', fov: 60, pos: k => { const m = C.me(0), a = ME.yaw + Math.PI; const e = C.E(k); return [m[0] + Math.sin(a) * (4.5 + 60 * (1 - e)), m[1] + 1.8 + 90 * (1 - e) * (1 - e), m[2] + Math.cos(a) * (4.5 + 60 * (1 - e))]; }, look: () => C.me(1.4) },
      ],
    });
  },
  // 2) 집 구입
  house(b) {
    if (!CINE.safe()) return; const B = CINE.bld(b), C = CINE, dr = b.door || { x: b.x, z: b.z };
    C.play({
      col: '#7fd88a', shots: [
        C.orbit(B.c, B.r * 1.4, B.h + 10, B.side - 1.2, B.side + 0.2, 4.5, { title: '내 집 마련', sub: b.name, ly: B.h * 0.4, fov: 52 }),
        C.dolly([dr.x + (dr.sx || 0) * 12, B.c[1] + 4, dr.z + (dr.sz || 0) * 12], [dr.x + (dr.sx || 0) * 4, B.c[1] + 1.8, dr.z + (dr.sz || 0) * 4], [dr.x, B.c[1] + 1.5, dr.z], null, 4.5, { cap: '열쇠 1개 · 죽어도 잃지 않는다 · 침대에서 잠자기', tag: '내 집', fov: 55, at: { 0.6: () => { FX.confetti(dr.x, B.c[1] + 4, dr.z); sfx('levelup'); } } }),
      ],
    });
  },
  // 3) 건물 완공 (내 땅)
  built(p) {
    if (!CINE.safe()) return; const C = CINE, y0 = groundHeight(p.x, p.z), h = Math.max(12, plotFloors(p) * 3.6 + 6), r = Math.max(p.w, p.d) * 1.2 + 14;
    C.play({
      col: '#ffb84a', shots: [
        { d: 6, title: '완공', sub: `${BUILD_DESIGNS[p.design].name} ${plotFloors(p)}층`, fov: 50, pos: k => { const a = 0.4 + 1.4 * C.E(k); return [p.x + Math.sin(a) * r, y0 + 2 + h * C.E(k), p.z + Math.cos(a) * r]; }, look: k => [p.x, y0 + h * (0.2 + 0.6 * C.E(k)), p.z], at: { 2: () => FX.confetti(p.x, y0 + h, p.z), 3.5: () => FX.confetti(p.x + 4, y0 + h * 0.7, p.z - 3), 4.5: () => sfx('levelup') } },
        C.orbit([p.x, y0, p.z], r * 1.6, h + 18, 1.8, 2.6, 4, { cap: '문으로 들어가 볼 수 있다', tag: REGIONS[p.region] ? REGIONS[p.region].name : '', ly: h * 0.5, fov: 55 }),
      ],
    });
  },
  // 4) 차 구입
  car(v) {
    if (!v || !CINE.safe()) return; const C = CINE, c = () => [v.x, v.y, v.z];
    C.play({
      col: '#6ab4ff', shots: [
        C.orbit(c, 5.5, 0.9, v.yaw + 0.6, v.yaw + 2.4, 4, { title: '신차 출고', sub: v.M ? v.M.name : '', ly: 0.7, fov: 48, flash: 0.6 }),
        C.orbit(c, () => 9, k => 2.5 + 4 * k, v.yaw + 2.4, v.yaw + 3.6, 3.5, { cap: 'E로 탑승 · 휴대폰 > 차고에서 다시 부를 수 있다', tag: '내 차', ly: 0.8, fov: 55 }),
      ],
    });
  },
  // 5) 총 구입
  gun(name) {
    if (!CINE.safe() || ME.vehicle) return; const C = CINE;
    C.play({
      col: '#ff8a5a', start: () => { ME.aiming = true; }, end: () => { ME.aiming = false; }, shots: [
        C.orbit(() => C.me(0), 1.6, 1.45, ME.yaw + 0.9, ME.yaw + 0.2, 3.2, { title: name, sub: '총포사', ly: 1.35, fov: 40, at: { 1.6: () => { sfx('ui'); CAM.shake = 0.15; } } }),
        C.orbit(() => C.me(0), 4, 1.8, ME.yaw + 0.2, ME.yaw - 0.6, 2.6, { cap: '좌클릭 사격 · 우클릭 조준 · R 재장전', tag: '무기', ly: 1.3, fov: 55 }),
      ],
    });
  },
  // 6) 옷 구입
  outfit(name) {
    if (!CINE.safe() || ME.vehicle) return; const C = CINE, d0 = ME.dance;
    C.play({
      col: '#ff7ad0', start: () => { ME.dance = 3; }, end: () => { ME.dance = d0 >= 0 ? d0 : -1; }, shots: [
        C.orbit(() => C.me(0), k => 5 - 2 * k, k => 0.4 + 1.2 * k, ME.yaw - 0.4, ME.yaw + 0.5, 3.5, { title: '새 옷', sub: name || '', ly: 1.0, fov: 45 }),
        C.orbit(() => C.me(0), 3.2, 1.4, ME.yaw + 0.5, ME.yaw + 2.8, 3, { ly: 1.0, fov: 50 }),
      ],
    });
  },
  // 7) 취업 (직업별 색·조명이 다르다)
  job(j) {
    if (!CINE.safe() || ME.vehicle || !j || j.id === 'none') return; const C = CINE;
    const look = { police: ['#4a8aff', 'radial-gradient(ellipse at center,transparent 50%,rgba(40,90,255,.35))', 'cineSiren 1.2s infinite'], soldier: ['#9ab060', 'radial-gradient(ellipse at center,transparent 45%,rgba(60,80,30,.5))'], doctor: ['#ff6a6a', 'radial-gradient(ellipse at center,transparent 55%,rgba(255,255,255,.35))'], gangA: ['#ff3a3a', 'radial-gradient(ellipse at center,transparent 35%,rgba(60,0,0,.7))'], gangB: ['#c06aff', 'radial-gradient(ellipse at center,transparent 35%,rgba(40,0,60,.7))'], lawyer: ['#d8c06a', 'radial-gradient(ellipse at center,transparent 50%,rgba(60,50,10,.4))'], farmer: ['#9ad860', 'radial-gradient(ellipse at center,transparent 50%,rgba(255,220,120,.3))'] }[j.id] || ['#ffd34a', 'radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,.4))'];
    C.play({
      col: look[0], tint: look[1], tintAnim: look[2], shots: [
        C.orbit(() => C.me(0), k => 7 - 3.5 * k, k => 0.3 + 0.9 * k, ME.yaw + 2.2, ME.yaw + 0.3, 4, { title: j.name, sub: j.d || '', ly: 1.2, fov: 45, at: { 0.2: () => sfx('levelup') } }),
        C.orbit(() => C.me(0), 3.2, 1.7, ME.yaw + 0.3, ME.yaw - 0.4, 3, { cap: j.id.startsWith('gang') ? '캥지베의 규칙: 배신하면 끝이다' : j.id === 'police' ? '수배자를 E로 체포 · 범죄를 막아라' : '휴대폰 > 직업에서 업무 확인', tag: '첫 출근', ly: 1.4, fov: 52 }),
      ],
    });
  },
  // 8) 재판 판결 (유죄면 이어서 수감 연출)
  court(guilty, txt) {
    const f = FACILITIES.find(x => x.type === 'court'); const C = CINE;
    if (!f || !CINE.enabled()) { CINE.big(guilty ? '유죄' : '무죄', txt, guilty ? '#ff4a4a' : '#7fd88a'); return; }
    const B = f.bld ? C.bld(f.bld) : { c: [f.x, groundHeight(f.x, f.z), f.z], h: 14, r: 30, side: 0 };
    C.play({
      col: guilty ? '#ff4a4a' : '#7fd88a', tint: 'radial-gradient(ellipse at center,transparent 40%,rgba(30,20,0,.55))', shots: [
        C.dolly([B.c[0] + Math.sin(B.side) * 70, B.c[1] + 30, B.c[2] + Math.cos(B.side) * 70], [B.c[0] + Math.sin(B.side) * 32, B.c[1] + 6, B.c[2] + Math.cos(B.side) * 32], [B.c[0], B.c[1] + B.h * 0.5, B.c[2]], null, 3.5, { title: '서불리 지방법원', sub: '판결을 선고합니다', fov: 50 }),
        { d: 3.5, fov: 40, title: guilty ? '유죄' : '무죄', sub: txt, flash: 0.95, pos: k => [B.c[0] + Math.sin(B.side) * (32 - 6 * k), B.c[1] + 6 - k, B.c[2] + Math.cos(B.side) * (32 - 6 * k)], look: () => [B.c[0], B.c[1] + B.h * 0.5, B.c[2]], roll: guilty ? 0.06 : 0, at: { 0.05: () => { sfx(guilty ? 'error' : 'levelup'); CAM.shake = 0.4; } } },
      ],
    });
  },
  // 9) 체포 → 감방
  jail(pr, sec) {
    const C = CINE; if (!C.enabled()) return;
    C.play({
      col: '#8ab4ff', tint: 'radial-gradient(ellipse at center,transparent 40%,rgba(0,20,60,.6))', start: () => C.siren(2600), shots: [
        { d: 3.5, title: '수감', sub: `${pr ? pr.name : '교도소'} · 형량 ${sec}초`, fov: 55, pos: k => { const m = C.me(0); return [m[0] + 0.5, m[1] + 22 - 16 * C.E(k), m[2] + 0.5]; }, look: () => C.me(0.5) },
        C.orbit(() => C.me(0), 3, 1.6, ME.yaw + 0.2, ME.yaw - 0.4, 3.5, { cap: '감방 문 앞 E: 탈옥 시도 · 출소카드가 있으면 즉시 출소', tag: '교도소', ly: 1.2, fov: 50 }),
      ],
    });
  },
  // 10) 출소
  release(pr) {
    if (!CINE.safe()) return; const C = CINE;
    C.play({
      col: '#ffe58a', tint: 'radial-gradient(ellipse at center,rgba(255,240,200,.25),transparent 70%)', shots: [
        C.orbit(() => C.me(0), 3.5, 1.6, ME.yaw, ME.yaw + 0.7, 3, { title: '출소', sub: '자유의 몸', ly: 1.4, fov: 50, flash: 0.8 }),
        { d: 4, fov: 58, cap: pr ? pr.name + ' 정문' : '', tag: '바깥 공기', pos: k => { const m = C.me(0), a = ME.yaw + 0.7; return [m[0] + Math.sin(a) * (3.5 + 25 * C.E(k)), m[1] + 1.6 + 40 * C.E(k), m[2] + Math.cos(a) * (3.5 + 25 * C.E(k))]; }, look: () => C.me(1) },
      ],
    });
  },
  // 11) 탈옥
  escape() { CINE.siren(4000, true); CINE.big('탈옥!', '수배 ★3 — 경찰이 쫓아온다', '#ff3a3a', 2600); },
  // 12) 사망: 흑백 + 몸 위로 카메라가 천천히 떠오른다 (부활할 때까지)
  death() {
    const C = CINE; if (!C.enabled()) return; C.q.length = 0; if (C.on) { C.on.end = null; C.stop(); } const x = ME.x, y = ME.y, z = ME.z, a0 = CAM.yaw;
    C.play({ lock: true, gray: true, shots: [{ d: 5.8, fov: 55, pos: k => [x + Math.sin(a0 + k * 1.2) * (3 + 6 * k), y + 2.5 + 14 * C.E(k), z + Math.cos(a0 + k * 1.2) * (3 + 6 * k)], look: () => [x, y + 0.3, z] }] });
  },
  // 13) 병원에서 부활
  respawn() {
    const C = CINE; if (!C.enabled()) return; const m0 = C.me(0);
    C.play({ col: '#ff8a8a', shots: [{ d: 3.5, title: '다시 살아났다', sub: '서불리 병원', fov: 55, flash: 0.9, pos: k => [m0[0] + 6 - 3 * k, m0[1] + 12 - 10 * C.E(k), m0[2] + 6 - 3 * k], look: () => C.me(1.2) }] });
  },
  // 14) 잠들기 / 일어나기 (눈 감고 뜨기)
  sleep() { CINE.eyes(true); },
  wake(alarm) { CINE.eyes(true); setTimeout(() => { CINE.eyes(false); if (alarm) CINE.card(`${CINE.esc(SLEEP.fmt ? SLEEP.fmt(G.time) : '')}<small>상쾌한 아침</small>`, 'cine-day', 2600); }, 450); },
  // 15) 새 날
  newDay(d) { if (SLEEP.on) return; CINE.card(`${d}일차<small>${['일', '월', '화', '수', '목', '금', '토'][d % 7]}요일 · 서불리 시티</small>`, 'cine-day', 3000); },
  // 16) 대통령 당선 (모두에게)
  president(P) {
    const C = CINE, ai = P.ai, nm = ai ? 'AI 행정부' : P.name;
    if (!C.safe()) { C.big(ai ? 'AI 행정부 집권' : '대통령 당선', nm, '#ffd34a', 3200); return; }
    const y0 = groundHeight(0, 0);
    C.play({
      col: ai ? '#6ae0ff' : '#ffd34a', shots: [
        { d: 5, title: ai ? 'AI 행정부 집권' : '대통령 당선', sub: nm, fov: 55, pos: k => { const a = 2.4 + 1.5 * C.E(k); return [Math.sin(a) * 140, y0 + 20 + 80 * C.E(k), Math.cos(a) * 140]; }, look: () => [0, y0 + 20, 0], at: { 0.8: () => FX.confetti(0, y0 + 50, 0), 2: () => FX.confetti(-30, y0 + 60, 20), 3: () => FX.confetti(30, y0 + 55, -20), 4: () => FX.confetti(0, y0 + 70, 0) } },
        C.orbit([0, y0, 0], 240, 160, 3.9, 4.6, 4, { cap: ai ? '정책이 12분마다 바뀐다' : '새 정책이 일자리와 집값을 바꾼다', tag: '서불리 정부', ly: 0, fov: 58 }),
      ],
    });
  },
  // 17) 속보 (정책 · 선거 · 탄핵)
  news(s) { if (/정책|대통령|탄핵|선거|집권|해고|채용/.test(s)) CINE.news(s); },
  // 18) 범죄자 신분 도장
  criminal(name) { CINE.stamp('범죄자', name ? `${name} · 경찰이 알아보면 쫓아온다` : ''); sfx('error'); },
  // 19) 최고 수배
  wanted5() { CINE.siren(3500); CINE.big('최고 수배 ★★★★★', '군·경이 총동원된다', '#ff3a3a', 2800); },
  // 20) 군사기지 침입
  army() { CINE.siren(3000, true); CINE.big('군사기지 침입', '발견 즉시 사격', '#ff5a3a', 2400); },
  // 21) 가택 침입 성공
  burgle(name) { CINE.init(); CINE.flash(0.35, 400); CINE.big('침입 성공', name ? name + ' · 빨리 털고 나가라' : '', '#ffb84a', 2000); },
  // 22) 관리자 모드
  admin() { CINE.init(); CINE.tint('repeating-linear-gradient(0deg,rgba(255,0,0,.12) 0 2px,transparent 2px 4px)', 'cineScan .3s linear 8'); setTimeout(() => { if (!CINE.on) CINE.tint(null); }, 2400); CINE.big('관리자 모드', '', '#ff2a2a', 2200); },
};
