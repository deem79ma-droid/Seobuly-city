// ================= 서불리 시티 게임 서버 (Cloudflare Workers + Durable Objects) =================
// 방 하나 = Durable Object 하나. 모든 플레이어가 WebSocket으로 이 방에 접속하고, 서버가 메시지를 중계한다.
// 월드 시뮬레이션(NPC·차량)은 지금처럼 '방장' 플레이어 브라우저가 맡고, 서버는
//   - 방장 정하기 (방장이 나가면 가장 오래 있던 사람에게 자동으로 넘김)
//   - 메시지 중계 (방장 ↔ 게스트, 전체 방송)
//   - 방 상태 저장 (방장이 보내는 저장 데이터 → 아무도 없어도 남아 있음)
//   - 로비용 공개방 인원 집계
// 를 맡는다. 접속이 없으면 잠들고(과금 없음), 누가 들어오면 깨어난다.
const MAX_PLAYERS = 20;
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Content-Type': 'application/json; charset=utf-8' };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: CORS });
// ---- 계정 ----
// 닉네임 = 계정 이름 (서버 전체에서 하나뿐). 비밀번호는 브라우저에서 PBKDF2로 한 번 갈아서(k) 보내고,
// 서버는 그 값에 소금을 쳐서 SHA-256으로 한 번 더 갈아 저장한다 → 서버에도 비밀번호 원문은 없다.
const NICK_RE = /^[0-9A-Za-z가-힣_]{2,12}$/;
const acctKey = n => { if (typeof n !== 'string') return null; n = n.normalize('NFC').trim(); return NICK_RE.test(n) ? n.toLowerCase() : null; };
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const rndHex = n => hex(crypto.getRandomValues(new Uint8Array(n)));
const sha = async s => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
const TOK_DAYS = 60;
// 저장 데이터 검사: 객체 · 100KB 이하 · 돈은 0~1000억 정수
function cleanSave(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  let s; try { s = JSON.stringify(d); } catch (e) { return null; } if (s.length > 100000) return null;
  d = JSON.parse(s); d.money = Math.max(0, Math.min(1e11, Math.floor(+d.money || 0))); return d;
}
const acctStub = (env, key) => env.GAME_ROOMS.get(env.GAME_ROOMS.idFromName('acct:' + key));
const acctCall = (env, key, o) => acctStub(env, key).fetch(new Request('https://acct/acct', { method: 'POST', body: JSON.stringify(o) }));

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (url.pathname === '/ws') {
      const room = (url.searchParams.get('room') || '').toUpperCase();
      if (!/^[A-Z0-9]{3,10}$/.test(room)) return json({ error: 'bad room' }, 400);
      if (req.headers.get('Upgrade') !== 'websocket') return json({ error: 'expected websocket' }, 426);
      // 계정이 있는 닉네임은 로그인한 본인만 쓸 수 있다
      const key = acctKey(url.searchParams.get('n') || '');
      if (key) { let j = {}; try { j = await (await acctCall(env, key, { op: 'check', tok: url.searchParams.get('tok') || '' })).json(); } catch (e) { } if (j.err === 'tok') { const p = new WebSocketPair(); p[1].accept(); p[1].send(JSON.stringify({ sys: 'namelock' })); p[1].close(4003, 'namelock'); return new Response(null, { status: 101, webSocket: p[0] }); } }
      return env.GAME_ROOMS.get(env.GAME_ROOMS.idFromName('room:' + room)).fetch(req);
    }
    if (url.pathname === '/acct' && req.method === 'POST') {
      let b; try { b = JSON.parse(await req.text()); } catch (e) { return json({ err: 'bad' }, 400); }
      if (!b || typeof b !== 'object') return json({ err: 'bad' }, 400);
      const key = acctKey(b.nick); if (!key) return json({ err: 'nick' });
      b.nick = b.nick.normalize('NFC').trim(); const r = await acctCall(env, key, b);
      return new Response(await r.text(), { status: r.status, headers: CORS });
    }
    if (url.pathname === '/rooms') return env.GAME_ROOMS.get(env.GAME_ROOMS.idFromName('__lobby__')).fetch(new Request('https://lobby/rooms'));
    return json({ ok: true, name: '서불리 시티 서버' });
  },
};

export class GameRoom {
  constructor(ctx, env) {
    this.ctx = ctx; this.env = env; this.host = null; this.room = null;
    ctx.blockConcurrencyWhile(async () => { this.host = (await ctx.storage.get('host')) || null; this.room = (await ctx.storage.get('room')) || null; });
  }
  // 지금 접속 중인 플레이어: id → WebSocket (잠들었다 깨어나도 attachment로 복구)
  peers(except) {
    const m = new Map();
    for (const ws of this.ctx.getWebSockets()) { if (ws === except) continue; let a = null; try { a = ws.deserializeAttachment(); } catch (e) { } if (a && a.id) m.set(a.id, ws); }
    return m;
  }
  send(ws, o) { try { ws.send(typeof o === 'string' ? o : JSON.stringify(o)); } catch (e) { } }
  async fetch(req) {
    const url = new URL(req.url);
    // ---- 로비(공개방 인원표) 전용 ----
    if (url.pathname === '/set') { const c = (await this.ctx.storage.get('counts')) || {}; const r = url.searchParams.get('room'); const n = +url.searchParams.get('n') || 0; if (r) { if (n > 0) c[r] = n; else delete c[r]; await this.ctx.storage.put('counts', c); } return json({ ok: true }); }
    if (url.pathname === '/rooms') return json((await this.ctx.storage.get('counts')) || {});
    // ---- 계정 (Durable Object 하나 = 계정 하나) ----
    if (url.pathname === '/acct') { let b = {}; try { b = await req.json(); } catch (e) { } return this.acct(b || {}); }
    // ---- 게임 방 접속 ----
    const id = (url.searchParams.get('id') || '').slice(0, 40); const room = (url.searchParams.get('room') || '').toUpperCase();
    if (!id) return json({ error: 'no id' }, 400);
    if (room && room !== this.room) { this.room = room; await this.ctx.storage.put('room', room); }
    const pair = new WebSocketPair(); const client = pair[0], server = pair[1];
    this.ctx.acceptWebSocket(server);
    const peers = this.peers(server);
    const old = peers.get(id); if (old) { try { old.serializeAttachment(null); old.close(4000, 'replaced'); } catch (e) { } peers.delete(id); } // 같은 사람이 다시 접속 → 예전 연결 정리
    if (peers.size >= MAX_PLAYERS) { this.send(server, { sys: 'full' }); try { server.close(4001, 'full'); } catch (e) { } return new Response(null, { status: 101, webSocket: client }); }
    server.serializeAttachment({ id, t: Date.now() });
    if (!this.host || !peers.has(this.host)) { this.host = id; await this.ctx.storage.put('host', id); }
    const save = (await this.ctx.storage.get('save')) || null;
    this.send(server, { sys: 'init', you: id, host: this.host, peers: [...peers.keys()], save });
    if (this.host !== id) { const h = peers.get(this.host); if (h) this.send(h, { sys: 'join', id }); }
    this.report(peers.size + 1);
    return new Response(null, { status: 101, webSocket: client });
  }
  async acct(b) {
    const S = this.ctx.storage, now = Date.now(), a = await S.get('acct'), op = b.op;
    const goodK = k => typeof k === 'string' && /^[0-9a-f]{64}$/.test(k);
    const newTok = async () => { const t = rndHex(24); const L = ((await S.get('toks')) || []).filter(x => now - x.ts < TOK_DAYS * 864e5).slice(-4); L.push({ t, ts: now }); await S.put('toks', L); return t; };
    if (op === 'exists') return json({ exists: !!a });
    if (op === 'reg') {
      if (a) return json({ err: 'taken' }); if (!goodK(b.k)) return json({ err: 'bad' });
      const salt = rndHex(16); await S.put('acct', { nick: b.nick, salt, h: await sha(salt + b.k), ct: now });
      const data = cleanSave(b.data); if (data) await S.put('data', data);
      return json({ ok: 1, tok: await newTok(), nick: b.nick, data: data || null });
    }
    if (!a) return json({ err: 'noacct' });
    if (op === 'login' || op === 'pw') {
      const f = (await S.get('fails')) || { n: 0, until: 0 };
      if (f.until > now) return json({ err: 'locked', wait: Math.ceil((f.until - now) / 60000) });
      if (!goodK(b.k) || await sha(a.salt + b.k) !== a.h) { f.n++; if (f.n >= 8) { f.n = 0; f.until = now + 10 * 60000; } await S.put('fails', f); return json({ err: 'pw' }); } // 8번 틀리면 10분 잠금
      await S.put('fails', { n: 0, until: 0 });
      if (op === 'pw') { if (!goodK(b.nk)) return json({ err: 'bad' }); const salt = rndHex(16); a.salt = salt; a.h = await sha(salt + b.nk); await S.put('acct', a); await S.put('toks', []); return json({ ok: 1, tok: await newTok() }); } // 비번 바꾸면 다른 기기는 전부 로그아웃
      const live = await S.get('live');
      return json({ ok: 1, tok: await newTok(), nick: a.nick, data: (await S.get('data')) || null, busy: !!(live && now - live.t < 45000) });
    }
    const toks = (await S.get('toks')) || [];
    if (typeof b.tok !== 'string' || !toks.some(x => x.t === b.tok && now - x.ts < TOK_DAYS * 864e5)) return json({ err: 'tok' });
    if (op === 'check') return json({ ok: 1 });
    if (op === 'load') { const live = await S.get('live'); return json({ ok: 1, nick: a.nick, data: (await S.get('data')) || null, busy: !!(live && live.sid !== b.sid && now - live.t < 45000) }); }
    if (op === 'save') {
      const live = await S.get('live'); const sid = String(b.sid || '').slice(0, 20);
      if (live && live.sid !== sid && now - live.t < 45000) return json({ err: 'busy' }); // 다른 기기에서 플레이 중 → 덮어쓰기 금지 (돈 복사 방지)
      const data = cleanSave(b.data); if (!data) return json({ err: 'bad' });
      await S.put('data', data); await S.put('live', { sid, t: b.end ? 0 : now }); return json({ ok: 1 });
    }
    if (op === 'logout') { await S.put('toks', toks.filter(x => x.t !== b.tok)); return json({ ok: 1 }); }
    return json({ err: 'op' });
  }
  async webSocketMessage(ws, msg) {
    let a = null; try { a = ws.deserializeAttachment(); } catch (e) { } if (!a || !a.id) return; const from = a.id;
    if (typeof msg !== 'string' || msg.length > 400000) return;
    let d; try { d = JSON.parse(msg); } catch (e) { return; }
    if (d.sys) {
      if (d.sys === 'save' && from === this.host && d.v && typeof d.v === 'object') await this.ctx.storage.put('save', d.v); // 방 상태 저장 (방장만)
      else if (d.sys === 'sethost' && from === this.host) { const peers = this.peers(); if (peers.has(d.id)) { this.host = d.id; await this.ctx.storage.put('host', d.id); for (const w of peers.values()) this.send(w, { sys: 'host', id: d.id }); } } // 관리자에게 방장 넘기기
      return;
    }
    const peers = this.peers(); const out = JSON.stringify({ from, m: d.m });
    if (d.to === '*') { for (const [id, w] of peers) if (id !== from && id !== d.ex) this.send(w, out); }
    else if (d.to === 'host') { const h = peers.get(this.host); if (h && this.host !== from) this.send(h, out); }
    else if (typeof d.to === 'string') { const w = peers.get(d.to); if (w) this.send(w, out); }
  }
  async webSocketClose(ws) { await this.left(ws); }
  async webSocketError(ws) { await this.left(ws); }
  async left(ws) {
    let a = null; try { a = ws.deserializeAttachment(); } catch (e) { } if (!a || !a.id) return;
    try { ws.serializeAttachment(null); } catch (e) { }
    const peers = this.peers(ws); peers.delete(a.id);
    if (a.id === this.host) { // 방장이 나감 → 가장 오래 있던 사람이 새 방장
      let best = null; for (const [id, w] of peers) { let t = 0; try { t = w.deserializeAttachment().t; } catch (e) { } if (!best || t < best.t) best = { id, t }; }
      this.host = best ? best.id : null; await this.ctx.storage.put('host', this.host);
      if (best) for (const w of peers.values()) this.send(w, { sys: 'host', id: this.host, left: a.id });
    } else { const h = peers.get(this.host); if (h) this.send(h, { sys: 'leave', id: a.id }); for (const [id, w] of peers) if (id !== this.host) this.send(w, { sys: 'gone', id: a.id }); }
    this.report(peers.size);
  }
  report(n) {
    if (!this.room) return;
    const lob = this.env.GAME_ROOMS.get(this.env.GAME_ROOMS.idFromName('__lobby__'));
    this.ctx.waitUntil(lob.fetch(new Request('https://lobby/set?room=' + encodeURIComponent(this.room) + '&n=' + n)).catch(() => { }));
  }
}
