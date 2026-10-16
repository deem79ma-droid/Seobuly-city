// @v 2026101602

// ================= 카지노: 토큰 교환 · 룰렛(유럽식) · 포커(텍사스 홀덤) · 777 슬롯 =================
//  - 카지노 안에서는 현금 대신 토큰으로 베팅한다. 토큰 1개 = ₩1,000 · 되팔 때는 95%
//  - 토큰은 카지노 계정에 보관돼서 죽어도 잃지 않는다 (게임 저장에 들어간다)
//  - 이모지는 빌드에서 빠지므로 카드 무늬 · 슬롯 그림은 전부 캔버스로 그린다
const TOKEN_WON = 1000, TOKEN_SELL = 0.95;
const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RED_N = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const rouCol = n => n === 0 ? '#1a8a3a' : RED_N.has(n) ? '#c8202c' : '#1a1a1e';
const HAND_NAME = ['하이카드', '원페어', '투페어', '트리플', '스트레이트', '플러시', '풀하우스', '포카드', '스트레이트 플러시'];
const SLOT_SYM = ['7', 'BAR', 'DIA', 'BELL', 'CHERRY', 'LEMON'];
const SLOT_W = [1, 2, 3, 4, 6, 7]; // 가상 릴 가중치 (합 23)
const SLOT_PAY = { 7: 150, BAR: 50, DIA: 25, BELL: 15, CHERRY: 10, LEMON: 6 };
const CSN = {
  tokens: 0, ov: null, body: null, game: null, busy: false, timers: [],
  load(sv) { this.tokens = Math.max(0, Math.floor(+(sv && sv.ctok) || 0)); },
  save() { return { ctok: this.tokens }; },
  // ---------- 공용 ----------
  css() {
    if (document.getElementById('csnCss')) return; const st = document.createElement('style'); st.id = 'csnCss';
    st.textContent = `#csn{position:fixed;inset:0;z-index:36;display:flex;flex-direction:column;background:radial-gradient(ellipse at 50% 30%,#0f5a34,#06281a 70%,#030f09);color:#fff;font-family:'Noto Sans KR',sans-serif;user-select:none;-webkit-user-select:none;touch-action:manipulation}
#csn .top{display:flex;align-items:center;gap:8px;padding:8px 10px;background:linear-gradient(#2a1a06,#160c02);border-bottom:2px solid #c8a040;flex-wrap:wrap}
#csn .top b{font:900 18px 'Black Han Sans',sans-serif;color:#ffd34a;margin-right:auto;text-shadow:0 0 8px #a60}
#csn .tk{background:#000;border:1px solid #c8a040;border-radius:20px;padding:5px 12px;font-weight:900;color:#ffe68a}
#csn .bd{flex:1;overflow:auto;padding:10px;display:flex;flex-direction:column;align-items:center;gap:10px}
#csn button.c{border:0;border-radius:12px;padding:11px 14px;font-weight:900;font-size:15px;color:#111;background:linear-gradient(#ffe080,#d8a020);box-shadow:0 4px 0 #8a6410;cursor:pointer}
#csn button.c:active{transform:translateY(2px);box-shadow:0 2px 0 #8a6410}
#csn button.c:disabled{opacity:.4;filter:grayscale(.6)}
#csn button.c.g{background:linear-gradient(#7eea9a,#2a9a50);box-shadow:0 4px 0 #14602c;color:#04200c}
#csn button.c.r{background:linear-gradient(#ff8a8a,#c02a2a);box-shadow:0 4px 0 #701010;color:#fff}
#csn button.c.d{background:linear-gradient(#555,#2a2a2a);box-shadow:0 4px 0 #111;color:#ddd}
#csn .chip{width:46px;height:46px;border-radius:50%;border:4px dashed rgba(255,255,255,.75);display:inline-flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;cursor:pointer;box-shadow:0 3px 6px #000;margin:0 3px}
#csn .chip.on{outline:3px solid #fff;transform:translateY(-4px)}
#csn .row{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;align-items:center}
#csn .msg{min-height:26px;font-weight:900;font-size:17px;text-align:center;text-shadow:0 2px 6px #000}
#csn .rb{display:grid;grid-template-columns:34px repeat(12,1fr) 40px;gap:2px;min-width:430px;width:100%}
#csn .rb div{position:relative;min-height:36px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;border:1px solid rgba(255,255,255,.35);border-radius:4px;cursor:pointer}
#csn .rb div i{position:absolute;right:1px;top:1px;min-width:16px;height:16px;border-radius:8px;background:#ffd34a;color:#000;font:900 10px sans-serif;line-height:16px;text-align:center;padding:0 3px;font-style:normal}
#csn .hist span{display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border-radius:50%;font-weight:900;font-size:12px;margin:0 2px}`;
    document.head.appendChild(st);
  },
  open(title, build) {
    this.css(); this.close(true); const ov = document.createElement('div'); ov.id = 'csn'; this.ov = ov;
    ov.innerHTML = `<div class="top"><b>${title}</b><span class="tk" id="csnTk"></span><button class="c g" id="csnEx">토큰 교환</button><button class="c d" id="csnX">나가기</button></div><div class="bd" id="csnBd"></div>`;
    document.body.appendChild(ov); this.body = ov.querySelector('#csnBd');
    ov.querySelector('#csnX').onclick = () => UI.closeMenu(); ov.querySelector('#csnEx').onclick = () => { if (this.busy) { toast('게임 중에는 교환할 수 없다'); return; } this.exchange(() => this.open(title, build)); };
    $('#menu').classList.add('hidden'); UI.menuOpen = true; UI._onClose = () => this.close(true); if (document.pointerLockElement) document.exitPointerLock();
    this.refresh(); build.call(this, this.body);
  },
  close(silent) { if (this.game && this.game.raf) cancelAnimationFrame(this.game.raf); for (const t of this.timers) clearTimeout(t), clearInterval(t); this.timers = []; this.busy = false; this.game = null; if (this.ov) { this.ov.remove(); this.ov = null; } saveGame(); },
  later(fn, ms) { const t = setTimeout(fn, ms); this.timers.push(t); return t; },
  refresh() { const t = document.getElementById('csnTk'); if (t) t.innerHTML = `토큰 <span style="color:#fff">${this.tokens.toLocaleString()}</span> <small style="opacity:.8">(₩${(this.tokens * TOKEN_WON).toLocaleString()})</small> · 현금 ${fmtMoney(Math.max(0, ME.money))}`; },
  take(n) { if (n > this.tokens) return false; this.tokens -= n; this.refresh(); return true; },
  give(n) { this.tokens += n; this.refresh(); },
  chipCss(v) { const c = { 1: '#e8e8e8;color:#222', 2: '#e8e8e8;color:#222', 5: '#d02a2a;color:#fff', 10: '#2a6ad0;color:#fff', 25: '#1a9a3a;color:#fff', 50: '#7a2ad0;color:#fff', 100: '#111;color:#ffd34a', 200: '#c8801a;color:#fff' }[v] || '#888'; return `background:${c}`; },
  chips(list, cur, on) { const w = document.createElement('div'); w.className = 'row'; for (const v of list) { const c = document.createElement('span'); c.className = 'chip' + (v === cur ? ' on' : ''); c.style.cssText = this.chipCss(v); c.textContent = v; c.onclick = () => { if (this.busy) return; sfx('ui'); on(v); }; w.appendChild(c); } return w; },
  // ---------- 토큰 교환기 ----------
  exchange(back) {
    this.css(); this.close(true); const ov = document.createElement('div'); ov.id = 'csn'; this.ov = ov;
    ov.innerHTML = `<div class="top"><b>토큰 교환기</b><span class="tk" id="csnTk"></span><button class="c d" id="csnX">닫기</button></div><div class="bd" id="csnBd"></div>`;
    document.body.appendChild(ov); this.body = ov.querySelector('#csnBd'); $('#menu').classList.add('hidden'); UI.menuOpen = true; UI._onClose = () => this.close(true); if (document.pointerLockElement) document.exitPointerLock();
    ov.querySelector('#csnX').onclick = () => { if (back) back(); else UI.closeMenu(); };
    const b = this.body; const draw = () => {
      this.refresh(); b.innerHTML = `<div class="msg" style="font-size:15px;opacity:.9">현금을 토큰으로 바꿔서 베팅한다 · 토큰 1개 = ₩${TOKEN_WON.toLocaleString()} (되팔 때 ${Math.round(TOKEN_SELL * 100)}%)<br>카드 잔액까지 합쳐서 결제된다</div><div style="font-weight:900;color:#ffd34a">토큰 사기</div><div class="row" id="exB"></div><div style="font-weight:900;color:#ffd34a;margin-top:6px">현금으로 바꾸기</div><div class="row" id="exS"></div><div class="msg" id="exM"></div>`;
      const buy = (n) => { const cost = n * TOKEN_WON; if (n < 1) return; if (!CARD.pay(cost)) { toast('돈이 모자라다 (현금+카드)'); sfx('error'); return; } this.tokens += n; sfx('cash'); saveGame(); draw(); };
      const sell = (n) => { n = Math.min(n, this.tokens); if (n < 1) return; this.tokens -= n; const g = Math.floor(n * TOKEN_WON * TOKEN_SELL); ME.money += g; sfx('cash'); toast(`토큰 ${n}개 → ${fmtMoney(g)}`); saveGame(); draw(); };
      const money = Math.max(0, ME.money) + CARD.bal;
      for (const n of [10, 50, 100, 500]) { const x = document.createElement('button'); x.className = 'c'; x.textContent = `${n}개 (${fmtMoney(n * TOKEN_WON)})`; x.disabled = money < n * TOKEN_WON; x.onclick = () => buy(n); $('#exB').appendChild(x); }
      { const x = document.createElement('button'); x.className = 'c'; x.textContent = '가진 돈 전부'; x.disabled = money < TOKEN_WON; x.onclick = () => buy(Math.floor(money / TOKEN_WON)); $('#exB').appendChild(x); }
      for (const n of [10, 50, 100]) { const x = document.createElement('button'); x.className = 'c g'; x.textContent = `${n}개 팔기`; x.disabled = this.tokens < n; x.onclick = () => sell(n); $('#exS').appendChild(x); }
      { const x = document.createElement('button'); x.className = 'c g'; x.textContent = '토큰 전부 팔기'; x.disabled = this.tokens < 1; x.onclick = () => sell(this.tokens); $('#exS').appendChild(x); }
    }; draw();
  },
  // ================= 룰렛 =================
  roulette() {
    this.open('룰렛 (유럽식 0~36)', (b) => {
      const R = this.game = { cur: 5, bets: {}, last: null, hist: [], spinning: false, ang: 0 };
      b.innerHTML = `<canvas id="rwC" width="300" height="300" style="width:min(230px,58vw);height:min(230px,58vw)"></canvas><div class="msg" id="rwM">칩을 고르고 판을 눌러 베팅 → 스핀</div><div class="hist" id="rwH"></div><div id="rwChips"></div><div style="width:100%;overflow-x:auto"><div class="rb" id="rwB"></div></div><div class="row"><button class="c g" id="rwGo">스핀!</button><button class="c d" id="rwUndo">되돌리기</button><button class="c d" id="rwClr">전부 지우기</button><button class="c" id="rwRe">이전 베팅</button><button class="c" id="rwX2">2배</button></div><div style="font-size:12px;opacity:.8;text-align:center">숫자 35:1 · 12개 묶음/열 2:1 · 빨강·검정·홀짝·1~18·19~36 1:1 · 0은 바깥 베팅이 모두 진다</div>`;
      const cv = $('#rwC'), x = cv.getContext('2d'); const N = WHEEL.length, seg = TAU / N;
      const draw = (wr, br, brad, ballOn) => {
        x.clearRect(0, 0, 300, 300); const cx = 150, cy = 150; x.save(); x.translate(cx, cy);
        const g = x.createRadialGradient(0, 0, 100, 0, 0, 148); g.addColorStop(0, '#5a3a14'); g.addColorStop(1, '#2a1804'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 148, 0, TAU); x.fill(); x.strokeStyle = '#d8b050'; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 146, 0, TAU); x.stroke();
        x.rotate(wr);
        for (let i = 0; i < N; i++) { const a0 = i * seg - seg / 2 - Math.PI / 2, a1 = a0 + seg; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, 128, a0, a1); x.closePath(); x.fillStyle = rouCol(WHEEL[i]); x.fill(); x.strokeStyle = '#d8b050'; x.lineWidth = 1; x.stroke(); }
        x.beginPath(); x.arc(0, 0, 96, 0, TAU); x.fillStyle = '#3a2208'; x.fill(); x.strokeStyle = '#d8b050'; x.lineWidth = 2; x.stroke();
        x.fillStyle = '#fff'; x.font = 'bold 11px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        for (let i = 0; i < N; i++) { x.save(); x.rotate(i * seg); x.translate(0, -112); x.fillText(WHEEL[i], 0, 0); x.restore(); }
        const hg = x.createRadialGradient(0, 0, 2, 0, 0, 50); hg.addColorStop(0, '#f6e6a0'); hg.addColorStop(1, '#8a6a20'); x.beginPath(); x.arc(0, 0, 46, 0, TAU); x.fillStyle = hg; x.fill();
        x.strokeStyle = '#d8b050'; x.lineWidth = 5; for (let k = 0; k < 4; k++) { x.save(); x.rotate(k * Math.PI / 2 + wr * 0.2); x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -44); x.stroke(); x.restore(); }
        x.restore();
        if (ballOn) { const bx = cx + Math.sin(br) * brad, by = cy - Math.cos(br) * brad; x.beginPath(); x.arc(bx, by, 5.5, 0, TAU); const bg = x.createRadialGradient(bx - 2, by - 2, 1, bx, by, 6); bg.addColorStop(0, '#fff'); bg.addColorStop(1, '#aab'); x.fillStyle = bg; x.fill(); x.shadowColor = '#000'; x.shadowBlur = 4; }
        x.shadowBlur = 0; x.fillStyle = '#ffd34a'; x.beginPath(); x.moveTo(cx, 6); x.lineTo(cx - 7, -4); x.lineTo(cx + 7, -4); x.fill();
      };
      draw(0, 0, 0, false); R.draw = draw;
      // 베팅판
      const keyName = (k) => ({ r: '빨강', b: '검정', o: '홀', e: '짝', l: '1~18', h: '19~36', d1: '1st 12', d2: '2nd 12', d3: '3rd 12', c1: '2:1', c2: '2:1', c3: '2:1' }[k] || k);
      const total = () => Object.values(R.bets).reduce((a, v) => a + v, 0);
      const cells = $('#rwB'); const place = (k, el) => { if (R.spinning) return; if (this.tokens - total() < R.cur) { toast('토큰이 모자라다 — 토큰 교환'); sfx('error'); return; } if (total() + R.cur > 1000) { toast('한 판 최대 1,000토큰'); return; } R.bets[k] = (R.bets[k] || 0) + R.cur; R.stack = R.stack || []; R.stack.push([k, R.cur]); sfx('coin'); renderBets(); };
      const els = {}; const mkc = (k, label, css, col, row, colN, spanR) => { const d = document.createElement('div'); d.style.cssText = `${css};grid-row:${row}${spanR ? `/span ${spanR}` : ''};grid-column:${colN}`; if (col) d.style.background = col; d.textContent = label; d.onclick = () => place(k); cells.appendChild(d); els[k] = d; };
      mkc('0', '0', '', '#1a8a3a', 1, 1, 3);
      for (let c = 0; c < 12; c++) for (let rw = 0; rw < 3; rw++) { const n = c * 3 + (3 - rw); mkc(String(n), n, '', rouCol(n), rw + 1, c + 2); }
      for (let rw = 0; rw < 3; rw++) mkc('c' + (3 - rw), '2:1', 'font-size:11px', '#134a2a', rw + 1, 14);
      for (let i = 0; i < 3; i++) { const d = document.createElement('div'); d.style.cssText = `grid-row:4;grid-column:${2 + i * 4}/span 4;background:#134a2a`; d.textContent = ['1st 12', '2nd 12', '3rd 12'][i]; d.onclick = () => place('d' + (i + 1)); cells.appendChild(d); els['d' + (i + 1)] = d; }
      [['l', '1~18', '#134a2a'], ['e', '짝', '#134a2a'], ['r', '빨강', '#c8202c'], ['b', '검정', '#1a1a1e'], ['o', '홀', '#134a2a'], ['h', '19~36', '#134a2a']].forEach(([k, t, c], i) => { const d = document.createElement('div'); d.style.cssText = `grid-row:5;grid-column:${2 + i * 2}/span 2;background:${c}`; d.textContent = t; d.onclick = () => place(k); cells.appendChild(d); els[k] = d; });
      const renderBets = () => { for (const k in els) { const e = els[k]; const o = e.querySelector('i'); if (o) o.remove(); if (R.bets[k]) { const i = document.createElement('i'); i.textContent = R.bets[k]; e.appendChild(i); } } if (!R.spinning && !R.keepMsg) $('#rwM').textContent = total() ? `베팅 합계 ${total()}토큰` : '칩을 고르고 판을 눌러 베팅 → 스핀'; R.keepMsg = false; $('#rwGo').disabled = !total() || R.spinning; };
      const chipsBox = $('#rwChips'); const rc = () => { chipsBox.innerHTML = ''; chipsBox.appendChild(this.chips([1, 5, 10, 25, 100], R.cur, v => { R.cur = v; rc(); })); }; rc();
      const histR = () => { $('#rwH').innerHTML = R.hist.slice(-12).map(n => `<span style="background:${rouCol(n)};border:1px solid #d8b050">${n}</span>`).join(''); }; histR();
      $('#rwUndo').onclick = () => { if (R.spinning || !R.stack || !R.stack.length) return; const [k, v] = R.stack.pop(); R.bets[k] -= v; if (R.bets[k] <= 0) delete R.bets[k]; renderBets(); };
      $('#rwClr').onclick = () => { if (R.spinning) return; R.bets = {}; R.stack = []; renderBets(); };
      $('#rwRe').onclick = () => { if (R.spinning || !R.last) return; const t = Object.values(R.last).reduce((a, v) => a + v, 0); if (t > this.tokens) { toast('토큰이 모자라다'); return; } R.bets = Object.assign({}, R.last); R.stack = Object.entries(R.last); renderBets(); };
      $('#rwX2').onclick = () => { if (R.spinning || !total()) return; const t = total(); if (t * 2 > this.tokens || t * 2 > 1000) { toast('두 배로 걸 수 없다'); return; } for (const k in R.bets) R.bets[k] *= 2; R.stack = Object.entries(R.bets); renderBets(); };
      const payout = (n) => { let w = 0; for (const [k, v] of Object.entries(R.bets)) { let m = 0; if (/^\d+$/.test(k)) m = (+k === n) ? 36 : 0; else if (n !== 0) { m = { r: RED_N.has(n) ? 2 : 0, b: !RED_N.has(n) ? 2 : 0, o: n % 2 === 1 ? 2 : 0, e: n % 2 === 0 ? 2 : 0, l: n <= 18 ? 2 : 0, h: n >= 19 ? 2 : 0, d1: n <= 12 ? 3 : 0, d2: n > 12 && n <= 24 ? 3 : 0, d3: n > 24 ? 3 : 0, c1: n % 3 === 0 ? 3 : 0, c2: n % 3 === 2 ? 3 : 0, c3: n % 3 === 1 ? 3 : 0 }[k] || 0; } w += v * m; } return w; };
      $('#rwGo').onclick = () => {
        if (R.spinning || !total()) return; const t = total(); if (!this.take(t)) { toast('토큰이 모자라다'); return; }
        R.spinning = true; this.busy = true; R.last = Object.assign({}, R.bets); $('#rwGo').disabled = true; $('#rwM').textContent = '돌아가는 중…'; sfx('ui');
        const n = WHEEL[Math.floor(Math.random() * N)]; const idx = WHEEL.indexOf(n); const dur = 6200; const t0 = performance.now(); const w0 = R.ang; const wTot = TAU * 3 + Math.random() * 2; const K = TAU * 7;
        const ease = u => 1 - Math.pow(1 - u, 3);
        const tick = () => {
          if (!this.ov) return; const u = Math.min(1, (performance.now() - t0) / dur); const e = ease(u); const wr = w0 + wTot * e;
          // 공: 휠 기준 각도가 목표 칸에 수렴 (처음엔 휠 반대 방향으로 빠르게 돈다)
          const rel = idx * seg - (1 - e) * K; const br = wr + rel; const rad = u < 0.72 ? 140 : 140 - (u - 0.72) / 0.28 * 28 + (u > 0.9 ? Math.sin((u - 0.9) * 60) * (1 - u) * 14 : 0);
          draw(wr, br, rad, true);
          if (u < 1) { R.raf = requestAnimationFrame(tick); return; }
          R.ang = wr % TAU; R.spinning = false; this.busy = false; const w = payout(n); this.give(w); R.hist.push(n); histR();
          const net = w - t; $('#rwM').innerHTML = `<span style="font-size:26px;color:#fff;background:${rouCol(n)};border:2px solid #ffd34a;border-radius:50%;padding:2px 12px;margin-right:8px">${n}</span>${w ? `<span style="color:#7dff9a">+${w}토큰 (순이익 ${net >= 0 ? '+' : ''}${net})</span>` : '<span style="color:#ff9a9a">꽝</span>'}`;
          if (w >= t * 5) announce('룰렛 대박!', `+${w}토큰`); if (w) sfx('cash'); else sfx('error'); R.bets = {}; R.stack = []; R.keepMsg = true; renderBets(); saveGame();
        };
        R.raf = requestAnimationFrame(tick);
      };
      renderBets();
    });
  },
  // ================= 777 슬롯 =================
  slots() {
    this.open('777 슬롯머신', (b) => {
      const S = this.game = { bet: 10, spinning: false, pos: [0, 0, 0], strip: [] };
      // 가상 릴: 가중치대로 심볼을 늘어놓고 섞는다 (고정 순서)
      const base = []; SLOT_SYM.forEach((s, i) => { for (let k = 0; k < SLOT_W[i]; k++) base.push(s); }); const r = mulberry32(777); for (let i = base.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [base[i], base[j]] = [base[j], base[i]]; } S.strip = base; const L = base.length;
      b.innerHTML = `<canvas id="slC" width="340" height="300" style="width:min(340px,92vw);height:auto;border-radius:16px"></canvas><div class="msg" id="slM">베팅을 고르고 스핀!</div><div id="slChips"></div><div class="row"><button class="c g" id="slGo" style="font-size:20px;padding:14px 34px">SPIN</button></div><div id="slPT" style="font-size:12px;opacity:.85;text-align:center;line-height:1.6"></div>`;
      $('#slPT').innerHTML = `가운데 줄 기준 · 777 ×150 · BAR ×50 · 다이아 ×25 · 종 ×15 · 체리3 ×10 · 레몬3 ×6<br>첫 릴 체리 ×1.5 · 앞 두 릴 체리 ×3 (베팅 곱)`;
      const cv = $('#slC'), x = cv.getContext('2d'); const CW = 86, CH = 78, X0 = 41, Y0 = 36;
      const drawSym = (s, cx, cy, sz) => {
        x.save(); x.translate(cx, cy); const k = sz / 60; x.scale(k, k); x.lineJoin = 'round';
        if (s === '7') { x.font = '900 64px "Black Han Sans",Impact,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 6; x.strokeStyle = '#fff'; x.strokeText('7', 0, 3); const g = x.createLinearGradient(0, -30, 0, 30); g.addColorStop(0, '#ff5a5a'); g.addColorStop(1, '#a00010'); x.fillStyle = g; x.fillText('7', 0, 3); }
        else if (s === 'BAR') { x.fillStyle = '#111'; x.fillRect(-30, -14, 60, 28); x.strokeStyle = '#ffd34a'; x.lineWidth = 3; x.strokeRect(-30, -14, 60, 28); x.fillStyle = '#ffd34a'; x.font = '900 20px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('BAR', 0, 1); }
        else if (s === 'DIA') { x.beginPath(); x.moveTo(0, -28); x.lineTo(24, -8); x.lineTo(0, 28); x.lineTo(-24, -8); x.closePath(); const g = x.createLinearGradient(-24, -28, 24, 28); g.addColorStop(0, '#d8f8ff'); g.addColorStop(.5, '#4ac8ff'); g.addColorStop(1, '#1a5acf'); x.fillStyle = g; x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 2; x.stroke(); x.beginPath(); x.moveTo(-24, -8); x.lineTo(24, -8); x.moveTo(-8, -8); x.lineTo(0, -28); x.lineTo(8, -8); x.moveTo(-8, -8); x.lineTo(0, 28); x.lineTo(8, -8); x.stroke(); }
        else if (s === 'BELL') { x.beginPath(); x.moveTo(-22, 18); x.quadraticCurveTo(-22, -4, -14, -16); x.quadraticCurveTo(0, -34, 14, -16); x.quadraticCurveTo(22, -4, 22, 18); x.closePath(); const g = x.createLinearGradient(-22, 0, 22, 0); g.addColorStop(0, '#d89a10'); g.addColorStop(.5, '#ffe680'); g.addColorStop(1, '#b87a08'); x.fillStyle = g; x.fill(); x.strokeStyle = '#7a5008'; x.lineWidth = 2; x.stroke(); x.beginPath(); x.arc(0, 24, 6, 0, TAU); x.fillStyle = '#c8901a'; x.fill(); }
        else if (s === 'CHERRY') { x.strokeStyle = '#2a7a2a'; x.lineWidth = 3; x.beginPath(); x.moveTo(-12, 14); x.quadraticCurveTo(-8, -10, 10, -28); x.moveTo(14, 12); x.quadraticCurveTo(14, -10, 10, -28); x.stroke(); for (const [cx, cy] of [[-12, 16], [14, 14]]) { const g = x.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, 14); g.addColorStop(0, '#ff8a8a'); g.addColorStop(1, '#b00010'); x.beginPath(); x.arc(cx, cy, 13, 0, TAU); x.fillStyle = g; x.fill(); } x.fillStyle = '#4ab04a'; x.beginPath(); x.ellipse(18, -24, 10, 5, -0.5, 0, TAU); x.fill(); }
        else { x.beginPath(); x.ellipse(0, 2, 26, 18, -0.3, 0, TAU); const g = x.createRadialGradient(-6, -4, 3, 0, 2, 28); g.addColorStop(0, '#fff6a0'); g.addColorStop(1, '#e0b800'); x.fillStyle = g; x.fill(); x.strokeStyle = '#a88800'; x.lineWidth = 2; x.stroke(); x.beginPath(); x.moveTo(24, -6); x.lineTo(30, -12); x.stroke(); }
        x.restore();
      };
      let flash = 0, winLine = false; const draw = (t) => {
        x.clearRect(0, 0, 340, 300); const g = x.createLinearGradient(0, 0, 0, 300); g.addColorStop(0, '#5a0a14'); g.addColorStop(1, '#2a0408'); x.fillStyle = g; x.fillRect(0, 0, 340, 300);
        x.strokeStyle = '#ffd34a'; x.lineWidth = 4; x.strokeRect(4, 4, 332, 292); x.fillStyle = '#ffd34a'; x.font = '900 24px "Black Han Sans",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('7 7 7  JACKPOT', 170, 20);
        for (let i = 0; i < 12; i++) { x.beginPath(); x.arc(14 + i * 28.5, 30 + 0 * i, 3, 0, TAU); x.fillStyle = (Math.floor(t / 180) + i) % 2 ? '#ffe680' : '#7a5a10'; x.fill(); }
        x.fillStyle = '#e8e4d8'; x.fillRect(X0 - 4, Y0 + 8, CW * 3 + 8, CH * 3 + 8);
        for (let i = 0; i < 3; i++) {
          const rx = X0 + i * CW; x.save(); x.beginPath(); x.rect(rx, Y0 + 12, CW - 2, CH * 3); x.clip(); const p = S.pos[i]; const c0 = Math.floor(p);
          for (let k = -2; k <= 2; k++) { const idx = ((c0 + k) % L + L) % L; drawSym(S.strip[idx], rx + CW / 2 - 1, Y0 + 12 + CH * 1.5 + (-k + (p - c0)) * CH, 56); }
          const sh = x.createLinearGradient(0, Y0 + 12, 0, Y0 + 12 + CH * 3); sh.addColorStop(0, 'rgba(0,0,0,.55)'); sh.addColorStop(.3, 'rgba(0,0,0,0)'); sh.addColorStop(.7, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.55)'); x.fillStyle = sh; x.fillRect(rx, Y0 + 12, CW, CH * 3); x.restore();
          if (i) { x.fillStyle = '#6a5a3a'; x.fillRect(rx - 2, Y0 + 12, 3, CH * 3); }
        }
        x.strokeStyle = winLine && Math.floor(t / 150) % 2 ? '#fff' : '#ff3030'; x.lineWidth = winLine ? 5 : 3; x.beginPath(); x.moveTo(X0 - 8, Y0 + 12 + CH * 1.5); x.lineTo(X0 + CW * 3 + 6, Y0 + 12 + CH * 1.5); x.stroke();
        x.fillStyle = '#ffd34a'; x.beginPath(); x.moveTo(X0 - 12, Y0 + 12 + CH * 1.5 - 8); x.lineTo(X0 - 12, Y0 + 12 + CH * 1.5 + 8); x.lineTo(X0 - 2, Y0 + 12 + CH * 1.5); x.fill();
      };
      let raf = 0; const loop = (t) => { draw(t); raf = requestAnimationFrame(loop); S.raf = raf; }; raf = requestAnimationFrame(loop);
      const chipsBox = $('#slChips'); const rc = () => { chipsBox.innerHTML = ''; chipsBox.appendChild(this.chips([2, 10, 50, 200], S.bet, v => { S.bet = v; rc(); })); }; rc();
      const center = () => [0, 1, 2].map(i => S.strip[((Math.round(S.pos[i]) % L) + L) % L]);
      $('#slGo').onclick = () => {
        if (S.spinning) return; if (!this.take(S.bet)) { toast('토큰이 모자라다 — 토큰 교환'); sfx('error'); return; }
        S.spinning = true; this.busy = true; winLine = false; $('#slGo').disabled = true; $('#slM').textContent = ''; sfx('ui');
        const tg = [0, 1, 2].map(() => Math.floor(Math.random() * L)); const from = S.pos.slice(); const t0 = performance.now(); const dur = [1500, 2100, 2700];
        const end = from.map((p, i) => { const k = Math.ceil(p) + 8 + i * 6; return k + ((tg[i] - (k % L)) % L + L) % L; });
        const ease = u => { u = 1 - u; return 1 - u * u * u; };
        const sp = () => {
          if (!this.ov) return; const now = performance.now() - t0; let done = 0;
          for (let i = 0; i < 3; i++) { const u = Math.min(1, now / dur[i]); S.pos[i] = from[i] + (end[i] - from[i]) * ease(u); if (u >= 1) { done++; if (!S['s' + i]) { S['s' + i] = 1; sfx('coin'); } } }
          if (done < 3) { requestAnimationFrame(sp); return; }
          for (let i = 0; i < 3; i++) { S['s' + i] = 0; S.pos[i] = end[i] % L; }
          S.spinning = false; this.busy = false; $('#slGo').disabled = false; const c = center(); let m = 0, name = '';
          if (c[0] === c[1] && c[1] === c[2]) { m = SLOT_PAY[c[0]]; name = c[0] === '7' ? '777 잭팟!' : `${{ BAR: 'BAR', DIA: '다이아', BELL: '종', CHERRY: '체리', LEMON: '레몬' }[c[0]]} 3개!`; }
          else if (c[0] === 'CHERRY' && c[1] === 'CHERRY') { m = 3; name = '체리 2개'; } else if (c[0] === 'CHERRY') { m = 1.5; name = '체리'; }
          const w = Math.floor(S.bet * m); if (w > 0) { this.give(w); winLine = true; sfx('cash'); $('#slM').innerHTML = `<span style="color:#ffe680">${name}</span> <span style="color:#7dff9a">+${w}토큰</span>`; if (m >= 25) announce(name, `+${w}토큰`); } else { sfx('error'); $('#slM').textContent = '꽝…'; }
          saveGame();
        };
        requestAnimationFrame(sp);
      };
    });
  },
  // ================= 포커 (텍사스 홀덤 · 딜러 NPC와 1:1) =================
  poker() {
    this.open('텍사스 홀덤 (딜러 NPC77과 1:1)', (b) => {
      const P = this.game = { bb: 10, deck: [], me: [], dl: [], board: [], pot: 0, mePut: 0, dlPut: 0, st: 'idle', street: 0, bets: 0, toCall: 0, turn: 'me', log: '', show: false };
      const SUIT = ['S', 'H', 'D', 'C']; const RK = r => ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }[r] || String(r));
      b.innerHTML = `<div class="row" id="pkDl"></div><div class="msg" style="font-size:13px;opacity:.9" id="pkDi"></div><div class="row" id="pkBd" style="min-height:92px"></div><div class="msg" id="pkPot"></div><div class="row" id="pkMe"></div><div class="msg" id="pkM"></div><div class="row" id="pkAct"></div><div id="pkChips"></div><div style="font-size:12px;opacity:.8;text-align:center">베팅 제한(리밋) 방식 · 프리플랍·플랍은 BB 단위, 턴·리버는 2BB 단위 · 한 라운드 최대 3번 베팅/레이즈</div>`;
      const card = (c, hidden) => { const cv = document.createElement('canvas'); cv.width = 62; cv.height = 88; cv.style.cssText = 'width:62px;height:88px;border-radius:6px;box-shadow:0 3px 8px #000'; const x = cv.getContext('2d'); x.fillStyle = hidden ? '#1a3a8a' : '#fffef8'; x.beginPath(); x.roundRect ? x.roundRect(0, 0, 62, 88, 7) : x.rect(0, 0, 62, 88); x.fill(); x.strokeStyle = '#999'; x.lineWidth = 1; x.stroke();
        if (hidden) { x.strokeStyle = '#8ab0ff'; x.lineWidth = 2; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(6 + i * 10, 6); x.lineTo(6 + i * 10, 82); x.stroke(); } x.strokeRect(5, 5, 52, 78); return cv; }
        const red = c.s === 1 || c.s === 2; x.fillStyle = red ? '#c8202c' : '#111'; x.font = '900 20px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(RK(c.r), 14, 16); suit(x, c.s, 14, 33, 7); suit(x, c.s, 31, 56, 17); return cv; };
      const suit = (x, s, cx, cy, r) => { x.save(); x.translate(cx, cy); const k = r / 10; x.scale(k, k); x.beginPath();
        if (s === 1) { x.moveTo(0, 9); x.bezierCurveTo(-14, -1, -10, -12, 0, -5); x.bezierCurveTo(10, -12, 14, -1, 0, 9); x.fill(); }
        else if (s === 2) { x.moveTo(0, -10); x.lineTo(8, 0); x.lineTo(0, 10); x.lineTo(-8, 0); x.closePath(); x.fill(); }
        else if (s === 0) { x.moveTo(0, -10); x.bezierCurveTo(14, 2, 10, 11, 0, 5); x.bezierCurveTo(-10, 11, -14, 2, 0, -10); x.fill(); x.fillRect(-1.6, 3, 3.2, 8); }
        else { for (const [ax, ay] of [[0, -5], [-5.5, 3], [5.5, 3]]) { x.beginPath(); x.arc(ax, ay, 5, 0, TAU); x.fill(); } x.fillRect(-1.6, 2, 3.2, 9); }
        x.restore(); };
      const eval5 = (c) => { const rs = c.map(x => x.r).sort((a, b) => b - a); const flush = c.every(x => x.s === c[0].s); const un = [...new Set(rs)]; let sh = 0; if (un.length === 5) { if (rs[0] - rs[4] === 4) sh = rs[0]; else if (rs[0] === 14 && rs[1] === 5) sh = 5; }
        const cnt = {}; rs.forEach(r => cnt[r] = (cnt[r] || 0) + 1); const g = Object.entries(cnt).map(([r, n]) => [+r, n]).sort((a, b) => b[1] - a[1] || b[0] - a[0]); let cat, tb;
        if (sh && flush) { cat = 8; tb = [sh]; } else if (g[0][1] === 4) { cat = 7; tb = [g[0][0], g[1][0]]; } else if (g[0][1] === 3 && g[1][1] === 2) { cat = 6; tb = [g[0][0], g[1][0]]; } else if (flush) { cat = 5; tb = rs; } else if (sh) { cat = 4; tb = [sh]; } else if (g[0][1] === 3) { cat = 3; tb = g.map(q => q[0]); } else if (g[0][1] === 2 && g[1][1] === 2) { cat = 2; tb = g.map(q => q[0]); } else if (g[0][1] === 2) { cat = 1; tb = g.map(q => q[0]); } else { cat = 0; tb = rs; }
        let v = cat; for (let i = 0; i < 5; i++) v = v * 15 + (tb[i] || 0); return v; };
      const best = (cs) => { let m = -1; const n = cs.length; if (n < 5) return -1; for (let a = 0; a < n - 4; a++) for (let c2 = a + 1; c2 < n - 3; c2++) for (let d = c2 + 1; d < n - 2; d++) for (let e = d + 1; e < n - 1; e++) for (let f = e + 1; f < n; f++) { const v = eval5([cs[a], cs[c2], cs[d], cs[e], cs[f]]); if (v > m) m = v; } return m; };
      const cat = v => Math.floor(v / Math.pow(15, 5));
      const newDeck = () => { const d = []; for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) d.push({ r, s }); for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } return d; };
      // 딜러 승률 추정 (몬테카를로)
      const equity = (hole, board, n = 160) => { const used = new Set([...hole, ...board].map(c => c.r * 4 + c.s)); const pool = []; for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) if (!used.has(r * 4 + s)) pool.push({ r, s }); let w = 0; for (let i = 0; i < n; i++) { for (let k = 0; k < 2 + 5 - board.length; k++) { const j = k + Math.floor(Math.random() * (pool.length - k)); [pool[k], pool[j]] = [pool[j], pool[k]]; } const opp = [pool[0], pool[1]]; const bd = board.concat(pool.slice(2, 2 + 5 - board.length)); const a = best(hole.concat(bd)), o = best(opp.concat(bd)); w += a > o ? 1 : a === o ? 0.5 : 0; } return w / n; };
      const betSize = () => P.street < 2 ? P.bb : P.bb * 2;
      const render = () => {
        const dl = $('#pkDl'); dl.innerHTML = ''; P.dl.forEach(c => dl.appendChild(card(c, !P.show))); if (!P.dl.length) { dl.innerHTML = '<div style="opacity:.6">딜러 NPC77 — 카드 없음</div>'; }
        const bd = $('#pkBd'); bd.innerHTML = ''; for (let i = 0; i < 5; i++) { if (P.board[i]) bd.appendChild(card(P.board[i])); else { const e = document.createElement('div'); e.style.cssText = 'width:62px;height:88px;border:2px dashed rgba(255,255,255,.25);border-radius:7px'; bd.appendChild(e); } }
        const me = $('#pkMe'); me.innerHTML = ''; P.me.forEach(c => me.appendChild(card(c)));
        $('#pkPot').innerHTML = P.st === 'idle' ? '' : `팟 <b style="color:#ffd34a">${P.pot}</b> · 내가 건 돈 ${P.mePut} · 딜러 ${P.dlPut}`;
        const hn = P.me.length && P.board.length >= 3 ? HAND_NAME[cat(best(P.me.concat(P.board)))] : ''; $('#pkDi').textContent = (P.st !== 'idle' ? ['프리플랍', '플랍', '턴', '리버'][P.street] || '' : '') + (hn && P.st === 'play' ? ` · 내 패: ${hn}` : '');
        const act = $('#pkAct'); act.innerHTML = '';
        const btn = (t, cls, fn, dis) => { const x = document.createElement('button'); x.className = 'c ' + cls; x.textContent = t; x.disabled = !!dis; x.onclick = fn; act.appendChild(x); };
        if (P.st === 'idle' || P.st === 'over') { btn(P.st === 'idle' ? `카드 받기 (참가비 ${P.bb})` : `다음 판 (참가비 ${P.bb})`, 'g', start, this.tokens < P.bb); }
        else if (P.st === 'play' && P.turn === 'me') {
          const call = P.toCall; const canRaise = P.bets < 3 && this.tokens >= call + betSize();
          btn(call ? `콜 ${call}` : '체크', 'g', () => meAct(call ? 'call' : 'check'), call > this.tokens); if (call > this.tokens) btn('올인 콜', 'g', () => meAct('call'));
          btn(call ? `레이즈 +${betSize()}` : `베팅 ${betSize()}`, '', () => meAct('raise'), !canRaise); btn('폴드', 'r', () => meAct('fold'));
        }
        const cb = $('#pkChips'); cb.innerHTML = ''; if (P.st === 'idle' || P.st === 'over') cb.appendChild(this.chips([2, 10, 50, 200], P.bb, v => { P.bb = v; render(); }));
      };
      const msg = (t, col) => { const m = $('#pkM'); m.style.color = col || '#fff'; m.textContent = t; };
      const put = (who, n) => { if (who === 'me') { n = Math.min(n, this.tokens); this.take(n); P.mePut += n; } else P.dlPut += n; P.pot += n; return n; };
      const start = () => {
        if (!this.take(P.bb)) { toast('토큰이 모자라다'); return; } this.give(0); P.mePut = P.bb; P.dlPut = P.bb; P.pot = P.bb * 2; P.deck = newDeck(); P.me = [P.deck.pop(), P.deck.pop()]; P.dl = [P.deck.pop(), P.deck.pop()]; P.board = []; P.st = 'play'; P.street = 0; P.show = false; this.busy = true; sfx('ui');
        newStreet(); msg('카드가 나왔다'); render();
      };
      const newStreet = () => { P.dealerActed = 0; P.bets = 0; P.toCall = 0; P.turn = 'me'; P.acted = 0; };
      const nextStreet = () => {
        if (P.street === 3) { return showdown(); } P.street++; if (P.street === 1) P.board.push(P.deck.pop(), P.deck.pop(), P.deck.pop()); else P.board.push(P.deck.pop()); sfx('ui'); newStreet(); render(); msg(['', '플랍', '턴', '리버'][P.street] + ' 공개');
      };
      const meAct = (a) => {
        if (P.st !== 'play' || P.turn !== 'me') return;
        if (a === 'fold') { dealerWins('내가 폴드'); return; }
        if (a === 'check') { P.acted++; if (P.acted >= 2 || P.dealerActed) { nextStreet(); return; } P.turn = 'dl'; render(); this.later(dealerAct, 800); return; }
        if (a === 'call') { put('me', P.toCall); P.toCall = 0; nextStreet(); return; }
        if (a === 'raise') { const sz = betSize(); put('me', P.toCall + sz); P.bets++; P.toCall = sz; P.turn = 'dl'; render(); msg('베팅!'); this.later(() => dealerAct(true), 900); }
      };
      const dealerAct = (facing) => {
        if (P.st !== 'play') return; const hole = P.dl; const eq = equity(hole, P.board); const sz = betSize(); const r = Math.random();
        if (facing) { // 내가 베팅/레이즈 → 딜러: 폴드/콜/레이즈
          const need = P.toCall; const odds = need / (P.pot + need);
          if (eq < odds * 0.9 && r > 0.1) { msg('딜러가 폴드했다', '#7dff9a'); playerWins('딜러 폴드'); return; }
          if (eq > 0.72 && P.bets < 3 && r < 0.65) { put('dl', need + sz); P.bets++; P.toCall = sz; P.turn = 'me'; msg('딜러가 레이즈!', '#ffb86a'); P.dealerActed = 1; render(); return; }
          put('dl', need); P.toCall = 0; msg('딜러가 콜', '#fff'); nextStreet(); return;
        }
        // 내가 체크 → 딜러: 체크/베팅
        if ((eq > 0.62 && r < 0.8) || (eq < 0.35 && r < 0.12)) { put('dl', sz); P.bets++; P.toCall = sz; P.turn = 'me'; P.dealerActed = 1; msg('딜러가 베팅!', '#ffb86a'); render(); return; }
        msg('딜러도 체크', '#fff'); nextStreet();
      };
      const finish = () => { P.st = 'over'; this.busy = false; P.dealerActed = 0; saveGame(); render(); };
      const playerWins = (why) => { this.give(P.pot); const net = P.pot - P.mePut; P.show = false; msg(`${why} — 팟 ${P.pot} 획득 (순이익 +${net})`, '#7dff9a'); sfx('cash'); finish(); };
      const dealerWins = (why) => { P.show = false; msg(`${why} — ${P.mePut}토큰을 잃었다`, '#ff9a9a'); sfx('error'); finish(); };
      const showdown = () => {
        P.show = true; const a = best(P.me.concat(P.board)), d = best(P.dl.concat(P.board)); const an = HAND_NAME[cat(a)], dn = HAND_NAME[cat(d)];
        if (a > d) { this.give(P.pot); const net = P.pot - P.mePut; msg(`승리! ${an} vs ${dn} — +${net}토큰`, '#7dff9a'); sfx('cash'); if (P.pot >= 200) announce('포커 승리', `${an}`); }
        else if (a < d) { msg(`패배… ${an} vs ${dn} — -${P.mePut}토큰`, '#ff9a9a'); sfx('error'); }
        else { this.give(Math.floor(P.pot / 2)); msg(`무승부 (${an}) — 팟을 나눈다`, '#ffe680'); }
        finish();
      };
      render(); msg('참가비를 내고 카드를 받자');
    });
  },
  // ---------- 허브 메뉴 (카지노 입구 · 기계 가까이서 E) ----------
  hub() {
    UI.openMenu('카지노', `토큰 <b style="color:#ffd34a">${this.tokens.toLocaleString()}</b>개 (₩${(this.tokens * TOKEN_WON).toLocaleString()}) · 현금 ${fmtMoney(Math.max(0, ME.money))}<br><small>현금은 토큰으로 바꿔야 베팅할 수 있다 · 토큰은 죽어도 안 잃는다</small>`, [
      { ic: '', t: '토큰 교환기', p: '', d: '현금 ⇄ 토큰 (1개 = ₩1,000)', fn: () => setTimeout(() => this.exchange(() => UI.closeMenu()), 30) },
      { ic: '', t: '룰렛', p: '', d: '유럽식 0~36 · 숫자 35:1 · 색·홀짝 1:1', fn: () => setTimeout(() => this.roulette(), 30) },
      { ic: '', t: '포커 (텍사스 홀덤)', p: '', d: '딜러 NPC77과 1:1 · 체크/콜/레이즈/폴드로 베팅', fn: () => setTimeout(() => this.poker(), 30) },
      { ic: '', t: '777 슬롯머신', p: '', d: '777이면 150배 잭팟', fn: () => setTimeout(() => this.slots(), 30) },
    ]);
  },
};
