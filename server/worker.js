// ================= 서불리 시티 게임 서버 (Cloudflare Workers + Durable Objects) =================
// 방 하나 = Durable Object 하나. 모든 플레이어가 WebSocket으로 이 방에 접속하고, 서버가 메시지를 중계한다.
// 월드 시뮬레이션(NPC·차량)은 지금처럼 '방장' 플레이어 브라우저가 맡고, 서버는
//   - 방장 정하기 (방장이 나가면 가장 오래 있던 사람에게 자동으로 넘김)
//   - 메시지 중계 (방장 ↔ 게스트, 전체 방송)
//   - 방 상태 저장 (방장이 보내는 저장 데이터 → 아무도 없어도 남아 있음)
//   - 로비용 공개방 인원 집계 · 계정 · 랭킹
// 를 맡는다. 접속이 없으면 잠들고(과금 없음), 누가 들어오면 깨어난다.
//
// ---- 보안 ----
//   · 허용된 사이트(게임 주소 · 내 컴퓨터 테스트)에서 온 요청만 받는다 (Origin 검사)
//   · IP마다 요청 횟수 제한: 계정 API 분당 40회 · 가입 시간당 5회 · 방 접속 분당 20회
//   · 접속 id마다 비밀값(sk)을 묶어서, 남의 id로 접속해 그 사람을 쫓아내지 못하게 한다
//   · 게스트는 방장에게만 메시지를 보낼 수 있다 (다른 사람에게 직접 보내는 조작 차단)
//   · 소켓마다 초당 메시지 수 · 크기 제한 (도배·과부하 차단)
//   · 비밀번호 확인·토큰 비교는 시간차가 없는 비교 · 8번 틀리면 10분 잠금
//   · 계정 저장: 돈이 비정상적으로 빨리 늘면 잘라낸다 (콘솔 조작 방지 · 시간당 한도)
const MAX_PLAYERS = 20;
const ORIGINS = ['https://deem79ma-droid.github.io'];
const okOrigin = (o, env) => !o || ORIGINS.includes(o) || String(env.EXTRA_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean).includes(o) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
const BASE_H = { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'", 'X-Frame-Options': 'DENY' };
const corsH = o => Object.assign({}, BASE_H, o ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600', 'Vary': 'Origin' } : {});
const json = (o, s = 200, origin) => new Response(JSON.stringify(o), { status: s, headers: corsH(origin) });
// ---- 계정 ----
// 닉네임 = 계정 이름 (서버 전체에서 하나뿐). 비밀번호는 브라우저에서 PBKDF2로 한 번 갈아서(k) 보내고,
// 서버는 그 값에 소금을 쳐서 SHA-256으로 한 번 더 갈아 저장한다 → 서버에도 비밀번호 원문은 없다.
const NICK_RE = /^[0-9A-Za-z가-힣_]{2,12}$/;
const acctKey = n => { if (typeof n !== 'string') return null; n = n.normalize('NFC').trim(); return NICK_RE.test(n) ? n.toLowerCase() : null; };
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const rndHex = n => hex(crypto.getRandomValues(new Uint8Array(n)));
const sha = async s => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
const safeEq = (a, b) => { a = String(a); b = String(b); if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }; // 시간차 공격 방지
const TOK_DAYS = 60;
// 저장 데이터 검사: 객체 · 100KB 이하 · 돈은 0~1000억 정수 · 카드 잔액은 0~100만(한도)
const CARD_LIMIT = 1000000;
function cleanSave(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  let s; try { s = JSON.stringify(d); } catch (e) { return null; } if (s.length > 100000) return null;
  d = JSON.parse(s); d.money = Math.max(0, Math.min(1e11, Math.floor(+d.money || 0))); d.card = Math.max(0, Math.min(CARD_LIMIT, Math.floor(+d.card || 0))); return d;
}
const wealth = d => (d ? (d.money | 0) + (d.card | 0) : 0);
const acctStub = (env, key) => env.GAME_ROOMS.get(env.GAME_ROOMS.idFromName('acct:' + key));
const acctCall = (env, key, o) => acctStub(env, key).fetch(new Request('https://acct/acct', { method: 'POST', body: JSON.stringify(o) }));
// IP별 요청 횟수 제한 (IP마다 작은 Durable Object 하나가 최근 요청 시각을 센다)
async function limited(env, req, k, max, winSec) {
  const ip = req.headers.get('CF-Connecting-IP') || 'local';
  try { const r = await env.GAME_ROOMS.get(env.GAME_ROOMS.idFromName('ip:' + ip)).fetch(new Request(`https://ip/hit?k=${k}&max=${max}&win=${winSec}`)); return r.status === 429; } catch (e) { return false; }
}
const wsRefuse = (sys, code) => { const p = new WebSocketPair(); p[1].accept(); p[1].send(JSON.stringify({ sys })); p[1].close(code, sys); return new Response(null, { status: 101, webSocket: p[0] }); };

export default {
  async fetch(req, env) {
    const url = new URL(req.url); const origin = req.headers.get('Origin') || '';
    if (!okOrigin(origin, env)) return json({ error: 'origin' }, 403); // 다른 사이트에서 몰래 부르는 요청 차단
    const O = origin || null;
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsH(O) });
    if (url.pathname === '/ws') {
      const room = (url.searchParams.get('room') || '').toUpperCase(); const id = url.searchParams.get('id') || '';
      if (!/^[A-Z0-9]{3,10}$/.test(room)) return json({ error: 'bad room' }, 400, O);
      if (!/^[A-Za-z0-9_-]{2,40}$/.test(id)) return json({ error: 'bad id' }, 400, O);
      if (req.headers.get('Upgrade') !== 'websocket') return json({ error: 'expected websocket' }, 426, O);
      if (await limited(env, req, 'ws', 20, 60)) return wsRefuse('slow', 4029); // 접속 폭주 차단
      // 계정이 있는 닉네임은 로그인한 본인만 쓸 수 있다
      const key = acctKey(url.searchParams.get('n') || '');
      if (key) { let j = {}; try { j = await (await acctCall(env, key, { op: 'check', tok: url.searchParams.get('tok') || '' })).json(); } catch (e) { } if (j.err === 'tok') return wsRefuse('namelock', 4003); }
      return env.GAME_ROOMS.get(env.GAME_ROOMS.idFromName('room:' + room)).fetch(req);
    }
    if (url.pathname === '/acct' && req.method === 'POST') {
      if (Number(req.headers.get('content-length') || 0) > 120000) return json({ err: 'big' }, 413, O);
      const txt = await req.text(); if (txt.length > 120000) return json({ err: 'big' }, 413, O);
      let b; try { b = JSON.parse(txt); } catch (e) { return json({ err: 'bad' }, 400, O); }
      if (!b || typeof b !== 'object' || typeof b.op !== 'string') return json({ err: 'bad' }, 400, O);
      if (await limited(env, req, 'acct', 40, 60)) return json({ err: 'slow' }, 429, O);
      if (b.op === 'reg' && await limited(env, req, 'reg', 5, 3600)) return json({ err: 'slow' }, 429, O); // 가입은 IP당 시간에 5번
      const key = acctKey(b.nick); if (!key) return json({ err: 'nick' }, 200, O);
      b.nick = b.nick.normalize('NFC').trim(); const r = await acctCall(env, key, b);
      return new Response(await r.text(), { status: r.status, headers: corsH(O) });
    }
    if (url.pathname === '/rank' && req.method === 'GET') { const r = await env.GAME_ROOMS.get(env.GAME_ROOMS.idFromName('__rank__')).fetch(new Request('https://rank/rank')); return new Response(await r.text(), { status: r.status, headers: corsH(O) }); }
    if (url.pathname === '/rooms' && req.method === 'GET') { const r = await env.GAME_ROOMS.get(env.GAME_ROOMS.idFromName('__lobby__')).fetch(new Request('https://lobby/rooms')); return new Response(await r.text(), { status: r.status, headers: corsH(O) }); }
    return json({ ok: true, name: '서불리 시티 서버' }, 200, O);
  },
};

export class GameRoom {
  constructor(ctx, env) {
    this.ctx = ctx; this.env = env; this.host = null; this.room = null; this.rl = new Map(); this.hits = {};
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
    // ---- IP 요청 횟수 세기 (이 DO가 IP 하나를 맡는다 · 메모리에만 보관) ----
    if (url.pathname === '/hit') {
      const k = url.searchParams.get('k') || 'x', max = +url.searchParams.get('max') || 30, win = (+url.searchParams.get('win') || 60) * 1000, now = Date.now();
      const a = (this.hits[k] || []).filter(t => now - t < win); this.hits[k] = a;
      if (a.length >= max) return json({ ok: 0 }, 429); a.push(now); return json({ ok: 1 });
    }
    // ---- 로비(공개방 인원표) 전용 ----
    if (url.pathname === '/set') { const c = (await this.ctx.storage.get('counts')) || {}; const r = url.searchParams.get('room'); const n = +url.searchParams.get('n') || 0; if (r) { if (n > 0) c[r] = n; else delete c[r]; await this.ctx.storage.put('counts', c); } return json({ ok: true }); }
    if (url.pathname === '/rooms') return json((await this.ctx.storage.get('counts')) || {});
    // ---- 랭킹 (DO 하나: 계정이 저장될 때마다 돈·업적 수를 올린다) ----
    if (url.pathname === '/rankset') {
      let b = {}; try { b = await req.json(); } catch (e) { }
      if (b && b.k) {
        const B = (await this.ctx.storage.get('board')) || {};
        B[b.k] = { n: String(b.n || '').replace(/[<>&"'`]/g, '').slice(0, 12), m: Math.max(0, Math.min(1e11, Math.floor(+b.m || 0))), a: Math.max(0, Math.min(500, Math.floor(+b.a || 0))), t: Date.now() };
        const ks = Object.keys(B); if (ks.length > 500) ks.sort((x, y) => B[x].m - B[y].m).slice(0, ks.length - 500).forEach(k => delete B[k]);
        await this.ctx.storage.put('board', B);
      }
      return json({ ok: 1 });
    }
    if (url.pathname === '/rank') {
      const L = Object.values((await this.ctx.storage.get('board')) || {});
      const top = f => L.slice().sort((x, y) => y[f] - x[f] || y.t - x.t).slice(0, 30).map(e => [e.n, e[f]]);
      return json({ money: top('m'), ach: top('a'), n: L.length });
    }
    // ---- 계정 (Durable Object 하나 = 계정 하나) ----
    if (url.pathname === '/acct') { let b = {}; try { b = await req.json(); } catch (e) { } return this.acct(b || {}); }
    // ---- 게임 방 접속 ----
    const id = (url.searchParams.get('id') || '').slice(0, 40); const room = (url.searchParams.get('room') || '').toUpperCase(); const sk = (url.searchParams.get('sk') || '').slice(0, 64);
    if (!id) return json({ error: 'no id' }, 400);
    if (room && room !== this.room) { this.room = room; await this.ctx.storage.put('room', room); }
    const pair = new WebSocketPair(); const client = pair[0], server = pair[1];
    this.ctx.acceptWebSocket(server);
    const peers = this.peers(server);
    const old = peers.get(id);
    if (old) { // 같은 id가 이미 있다: 같은 비밀값(sk)일 때만 재접속으로 보고 예전 연결을 정리, 아니면 새 연결을 거절 (남을 쫓아내는 사칭 방지)
      let oa = null; try { oa = old.deserializeAttachment(); } catch (e) { }
      if (oa && oa.sk && !safeEq(oa.sk, sk)) { this.send(server, { sys: 'iddup' }); try { server.close(4009, 'iddup'); } catch (e) { } return new Response(null, { status: 101, webSocket: client }); }
      try { old.serializeAttachment(null); old.close(4000, 'replaced'); } catch (e) { } peers.delete(id);
    }
    if (peers.size >= MAX_PLAYERS) { this.send(server, { sys: 'full' }); try { server.close(4001, 'full'); } catch (e) { } return new Response(null, { status: 101, webSocket: client }); }
    server.serializeAttachment({ id, t: Date.now(), sk });
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
      const data = cleanSave(b.data); if (data) { data.money = Math.min(data.money, 5e6); await S.put('data', data); } // 가입할 때 옮겨오는 손님 저장은 최대 500만 원까지
      return json({ ok: 1, tok: await newTok(), nick: b.nick, data: data || null });
    }
    if (!a) return json({ err: 'noacct' });
    if (op === 'login' || op === 'pw') {
      const f = (await S.get('fails')) || { n: 0, until: 0 };
      if (f.until > now) return json({ err: 'locked', wait: Math.ceil((f.until - now) / 60000) });
      if (!goodK(b.k) || !safeEq(await sha(a.salt + b.k), a.h)) { f.n++; if (f.n >= 8) { f.n = 0; f.until = now + 10 * 60000; } await S.put('fails', f); return json({ err: 'pw' }); } // 8번 틀리면 10분 잠금
      await S.put('fails', { n: 0, until: 0 });
      if (op === 'pw') { if (!goodK(b.nk)) return json({ err: 'bad' }); const salt = rndHex(16); a.salt = salt; a.h = await sha(salt + b.nk); await S.put('acct', a); await S.put('toks', []); return json({ ok: 1, tok: await newTok() }); } // 비번 바꾸면 다른 기기는 전부 로그아웃
      const live = await S.get('live');
      return json({ ok: 1, tok: await newTok(), nick: a.nick, data: (await S.get('data')) || null, busy: !!(live && now - live.t < 45000) });
    }
    const toks = (await S.get('toks')) || [];
    if (typeof b.tok !== 'string' || !toks.some(x => safeEq(x.t, b.tok) && now - x.ts < TOK_DAYS * 864e5)) return json({ err: 'tok' });
    if (op === 'check') return json({ ok: 1 });
    if (op === 'load') { const live = await S.get('live'); return json({ ok: 1, nick: a.nick, data: (await S.get('data')) || null, busy: !!(live && live.sid !== b.sid && now - live.t < 45000) }); }
    if (op === 'save') {
      const live = await S.get('live'); const sid = String(b.sid || '').slice(0, 20);
      if (live && live.sid !== sid && now - live.t < 45000) return json({ err: 'busy' }); // 다른 기기에서 플레이 중 → 덮어쓰기 금지 (돈 복사 방지)
      if (live && live.sid === sid && live.t && now - live.t < 4000 && !b.end) return json({ err: 'slow' }); // 저장은 4초에 한 번까지
      const data = cleanSave(b.data); if (!data) return json({ err: 'bad' });
      // 돈이 늘어나는 속도 제한 (한 번에 최대 800만 원 · 초당 2만 원씩 다시 찬다 = 시간당 최대 약 7,200만 원)
      const prev = await S.get('data'); const eb = (await S.get('eb')) || { b: 8e6, t: now };
      eb.b = Math.min(8e6, eb.b + Math.max(0, now - eb.t) / 1000 * 20000); eb.t = now;
      if (prev && wealth(data) > wealth(prev)) { // 현금 + 카드 합계로 본다 (카드로 옮겨 우회하지 못하게)
        const inc = wealth(data) - wealth(prev);
        if (inc > eb.b) { let cut = Math.ceil(inc - eb.b); const m = Math.min(cut, data.money); data.money -= m; cut -= m; data.card = Math.max(0, data.card - cut); eb.b = 0; a.sus = (a.sus || 0) + 1; await S.put('acct', a); } else eb.b -= inc;
      }
      await S.put('eb', eb);
      await S.put('data', data); await S.put('live', { sid, t: b.end ? 0 : now });
      const R = this.env.GAME_ROOMS.get(this.env.GAME_ROOMS.idFromName('__rank__')); // 랭킹 갱신 (응답은 기다리지 않는다)
      this.ctx.waitUntil(R.fetch(new Request('https://rank/rankset', { method: 'POST', body: JSON.stringify({ k: acctKey(a.nick), n: a.nick, m: wealth(data), a: Array.isArray(data.ach) ? data.ach.length : 0 }) })).catch(() => { }));
      return json({ ok: 1, money: data.money, card: data.card });
    }
    if (op === 'logout') { await S.put('toks', toks.filter(x => !safeEq(x.t, b.tok))); return json({ ok: 1 }); }
    return json({ err: 'op' });
  }
  // 소켓마다 초당 메시지 수 제한: 방장은 모두의 메시지를 중계하니 넉넉하게, 게스트는 적게 · 심하게 넘치면 연결을 끊는다
  rate(ws, id) {
    const now = Date.now(); let r = this.rl.get(ws); if (!r || now - r.t > 1000) { r = { t: now, n: 0, over: r ? r.over : 0 }; this.rl.set(ws, r); }
    r.n++; const max = id === this.host ? 900 : 90;
    if (r.n > max) { if (r.n === max + 1) r.over++; if (r.over > 5) { try { ws.close(4008, 'flood'); } catch (e) { } } return false; }
    return true;
  }
  async webSocketMessage(ws, msg) {
    let a = null; try { a = ws.deserializeAttachment(); } catch (e) { } if (!a || !a.id) return; const from = a.id; const isHost = from === this.host;
    if (typeof msg !== 'string' || msg.length > (isHost ? 400000 : 64000)) return;
    if (!this.rate(ws, from)) return;
    let d; try { d = JSON.parse(msg); } catch (e) { return; }
    if (!d || typeof d !== 'object') return;
    if (d.sys) {
      if (d.sys === 'save' && isHost && d.v && typeof d.v === 'object' && !Array.isArray(d.v)) { if (JSON.stringify(d.v).length <= 100000) await this.ctx.storage.put('save', d.v); } // 방 상태 저장 (방장만)
      else if (d.sys === 'sethost' && isHost) { const peers = this.peers(); if (peers.has(d.id)) { this.host = d.id; await this.ctx.storage.put('host', d.id); for (const w of peers.values()) this.send(w, { sys: 'host', id: d.id }); } } // 관리자에게 방장 넘기기
      return;
    }
    if (!d.m || typeof d.m !== 'object' || Array.isArray(d.m)) return; // 메시지 모양 검사
    if (!isHost && d.to !== 'host') return; // 게스트는 방장에게만 보낸다 (방장이 확인하고 중계)
    const peers = this.peers(); const out = JSON.stringify({ from, m: d.m });
    if (d.to === '*') { for (const [id, w] of peers) if (id !== from && id !== d.ex) this.send(w, out); }
    else if (d.to === 'host') { const h = peers.get(this.host); if (h && this.host !== from) this.send(h, out); }
    else if (typeof d.to === 'string') { const w = peers.get(d.to); if (w) this.send(w, out); }
  }
  async webSocketClose(ws) { this.rl.delete(ws); await this.left(ws); }
  async webSocketError(ws) { this.rl.delete(ws); await this.left(ws); }
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
