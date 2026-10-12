// ================= 서불리 시티 게임 서버 (Cloudflare Workers + Durable Objects) =================
// 방 하나 = Durable Object 하나. 모든 플레이어가 WebSocket으로 이 방에 접속하고, 서버가 메시지를 중계한다.
// 월드 시뮬레이션(NPC·차량)은 지금처럼 '방장' 플레이어 브라우저가 맡고, 서버는
//   - 방장 정하기 (방장이 나가면 가장 오래 있던 사람에게 자동으로 넘김)
//   - 메시지 중계 (방장 ↔ 게스트, 전체 방송)
//   - 방 상태 저장 (방장이 보내는 저장 데이터 → 아무도 없어도 남아 있음)
//   - 로비용 공개방 인원 집계
// 를 맡는다. 접속이 없으면 잠들고(과금 없음), 누가 들어오면 깨어난다.
const MAX_PLAYERS = 20;
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Content-Type': 'application/json; charset=utf-8' };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: CORS });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (url.pathname === '/ws') {
      const room = (url.searchParams.get('room') || '').toUpperCase();
      if (!/^[A-Z0-9]{3,10}$/.test(room)) return json({ error: 'bad room' }, 400);
      if (req.headers.get('Upgrade') !== 'websocket') return json({ error: 'expected websocket' }, 426);
      return env.GAME_ROOMS.get(env.GAME_ROOMS.idFromName('room:' + room)).fetch(req);
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
