// @v 2026101220
// ================= 계정: 닉네임 + 비밀번호로 로그인 → 진행 상황을 서버에 저장 =================
// 돈 · 무기 · 옷 · 집 열쇠 · 직업 · 범죄 기록 · 차고가 Cloudflare 서버에 저장돼서 폰/PC 어디서든 이어서 한다.
// 비밀번호 원문은 어디에도 보내지 않는다: 브라우저에서 PBKDF2(15만 번)로 갈아서 보내고, 서버는 그걸 또 소금 쳐서 저장.
// 가입한 닉네임은 서버 전체에서 하나뿐 — 남이 그 이름으로 서버 방에 들어오면 막힌다.
const ACCT = {
  on: false, nick: null, tok: null, data: null, busyWarn: false, sid: Math.random().toString(36).slice(2, 12),
  _t: 0, _last: '', _timer: 0, _warned: false,
  NICK_RE: /^[0-9A-Za-z가-힣_]{2,12}$/,
  ok() { return !!NET.server() && !!(window.crypto && crypto.subtle); },
  async kdf(nick, pw) {
    const enc = new TextEncoder(); const base = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode('sbc3d-acct-v1:' + nick.toLowerCase()), iterations: 150000 }, base, 256);
    return [...new Uint8Array(bits)].map(x => x.toString(16).padStart(2, '0')).join('');
  },
  // Content-Type을 text/plain으로 보내면 CORS 사전 요청(OPTIONS)이 없어서 빠르다
  async call(o, ms = 9000) {
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), ms);
    try { const r = await fetch(NET.server() + '/acct', { method: 'POST', body: JSON.stringify(o), headers: { 'Content-Type': 'text/plain' }, signal: ctl.signal, cache: 'no-store' }); return await r.json(); }
    catch (e) { return { err: 'net' }; } finally { clearTimeout(to); }
  },
  remember() { try { if (this.on) localStorage.setItem('sbc3d_acct', JSON.stringify({ nick: this.nick, tok: this.tok })); else localStorage.removeItem('sbc3d_acct'); } catch (e) { } },
  set(r) { this.on = true; this.nick = r.nick; this.tok = r.tok || this.tok; this.data = r.data || null; this.busyWarn = !!r.busy; this.remember(); },
  errTxt(r) {
    return { taken: '이미 가입된 닉네임이에요 — 로그인하거나 다른 닉네임으로 가입해 주세요', noacct: '가입된 계정이 없어요 — 먼저 "가입"을 눌러 주세요', pw: '비밀번호가 틀렸어요', locked: `비밀번호를 너무 많이 틀렸어요 — ${r.wait || 10}분 뒤에 다시`, nick: '닉네임은 한글·영어·숫자·_ 2~12자만 돼요', net: '서버에 연결하지 못했어요 — 잠시 뒤 다시', tok: '로그인이 만료됐어요 — 다시 로그인해 주세요', bad: '잘못된 요청이에요' }[r.err] || ('오류: ' + r.err);
  },
  checkInput(nick, pw) {
    if (!this.NICK_RE.test(nick)) return '닉네임은 한글·영어·숫자·_ 2~12자만 돼요 (띄어쓰기 X)';
    if (/관리자/.test(nick)) return '"관리자"가 들어간 닉네임은 쓸 수 없어요';
    if (!pw || pw.length < 4) return '비밀번호는 4자 이상';
    return null;
  },
  async login(nick, pw) { const e = this.checkInput(nick, pw); if (e) return { err: 'x', msg: e }; const r = await this.call({ op: 'login', nick, k: await this.kdf(nick, pw) }); if (r.ok) this.set(r); return r; },
  // 가입하면 이 기기에 있던 진행 상황(손님 저장)을 계정으로 옮긴다
  async register(nick, pw) {
    const e = this.checkInput(nick, pw); if (e) return { err: 'x', msg: e };
    let local = null; try { local = JSON.parse(localStorage.getItem('sbc3d_save') || 'null'); } catch (er) { }
    if (local) local.name = nick;
    const r = await this.call({ op: 'reg', nick, k: await this.kdf(nick, pw), data: local }); if (r.ok) this.set(r); return r;
  },
  async logout() { if (this.on) this.call({ op: 'logout', nick: this.nick, tok: this.tok }); this.on = false; this.nick = this.tok = this.data = null; this.remember(); },
  // 저장된 로그인으로 자동 접속 / 게임 시작 직전에 최신 저장 다시 받기
  async resume() {
    let s = null; try { s = JSON.parse(localStorage.getItem('sbc3d_acct') || 'null'); } catch (e) { }
    if (!s || !s.nick || !s.tok) return false;
    const r = await this.call({ op: 'load', nick: s.nick, tok: s.tok, sid: this.sid });
    if (r.ok) { this.set(Object.assign(r, { tok: s.tok })); return true; }
    if (r.err === 'tok' || r.err === 'noacct') { try { localStorage.removeItem('sbc3d_acct'); } catch (e) { } }
    else if (r.err === 'net') { this.on = true; this.nick = s.nick; this.tok = s.tok; this.offline = true; return true; } // 서버가 잠깐 안 되면 일단 로그인 상태 유지
    return false;
  },
  async refresh() { if (!this.on) return; const r = await this.call({ op: 'load', nick: this.nick, tok: this.tok, sid: this.sid }); if (r.ok) { this.data = r.data || null; this.busyWarn = !!r.busy; this.offline = false; } else if (r.err === 'tok') { await this.logout(); } },
  // 저장: 8초에 한 번까지 (바뀐 게 없으면 안 보냄)
  push(o) {
    if (!this.on) return; const s = JSON.stringify(o); if (s === this._last) return;
    const wait = 8000 - (Date.now() - this._t); this._pend = o;
    if (wait > 0) { if (!this._timer) this._timer = setTimeout(() => { this._timer = 0; this.push(this._pend); }, wait); return; }
    this._t = Date.now(); this._last = s;
    this.call({ op: 'save', nick: this.nick, tok: this.tok, sid: this.sid, data: o }).then(r => {
      if (r.ok) { this._warned = false; return; }
      this._last = ''; // 실패 → 다음에 다시 보낸다
      if (r.err === 'busy' && !this._warned) { this._warned = true; toast('다른 기기에서 같은 계정으로 플레이 중이라 저장되지 않았다 — 그쪽을 끄면 저장된다', 6000); }
      else if (r.err === 'tok') { toast('로그인이 만료돼서 저장이 멈췄다 — 로비에서 다시 로그인해 줘', 6000); this.on = false; this.remember(); }
    });
  },
  // 창을 닫을 때: 마지막 저장 + "이 기기 끝남" 표시 (다른 기기가 바로 이어서 할 수 있게)
  beacon() {
    if (!this.on || !this.data || !navigator.sendBeacon) return;
    try { navigator.sendBeacon(NET.server() + '/acct', JSON.stringify({ op: 'save', nick: this.nick, tok: this.tok, sid: this.sid, data: this.data, end: 1 })); } catch (e) { }
  },
  // ---------- 로비 UI ----------
  initLobby() {
    const box = $('#acctField'); if (!box) return;
    if (!this.ok()) { box.style.display = 'none'; return; }
    box.style.display = '';
    const msg = (t, c) => { const m = $('#acctMsg'); m.textContent = t || ''; m.style.color = c || '#9aa3b8'; };
    const busy = on => { for (const id of ['acctLogin', 'acctReg', 'acctOutBtn']) { const b = $('#' + id); if (b) b.disabled = on; } };
    const show = () => {
      $('#acctOut').classList.toggle('hidden', this.on); $('#acctIn').classList.toggle('hidden', !this.on);
      const n = $('#nameIn');
      if (this.on) {
        n.value = this.nick; n.disabled = true; $('#acctName').innerHTML = ''; const b = document.createElement('b'); b.textContent = this.nick; $('#acctName').append('로그인: ', b, this.offline ? ' (서버 확인 못 함)' : '');
        if (this.data && this.data.outfit && typeof preview !== 'undefined' && preview) { lobbyOutfit = Object.assign({}, this.data.outfit); preview.ch.setOutfit(lobbyOutfit); buildCustomizer($('#cust'), lobbyOutfit, o => preview.ch.setOutfit(o)); }
        msg(this.data ? `저장된 돈 ${fmtMoney(this.data.money || 0)} · 어느 기기에서든 이어서 해요` : '새 계정 — 지금부터 진행 상황이 서버에 저장돼요', '#7fd88a');
      } else { n.disabled = false; msg('닉네임 + 비밀번호로 가입하면 돈·집·옷·직업이 서버에 저장돼요 (안 해도 손님으로 플레이 가능)'); }
    };
    const go = async kind => {
      const nick = $('#nameIn').value.normalize('NFC').trim(), pw = $('#acctPw').value;
      busy(true); msg(kind === 'reg' ? '가입 중…' : '로그인 중…');
      const r = kind === 'reg' ? await this.register(nick, pw) : await this.login(nick, pw);
      busy(false);
      if (r.ok) { $('#acctPw').value = ''; show(); if (kind === 'reg') toast(`가입 완료 — ${nick}`); }
      else msg(r.msg || this.errTxt(r), '#ff8a7a');
    };
    $('#acctLogin').onclick = () => go('login'); $('#acctReg').onclick = () => go('reg');
    $('#acctPw').onkeydown = e => { if (e.key === 'Enter') go('login'); };
    $('#acctOutBtn').onclick = async () => { await this.logout(); show(); };
    show(); msg('로그인 확인 중…');
    this.resume().then(show);
  },
};
