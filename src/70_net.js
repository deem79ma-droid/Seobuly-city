
// ================= NETWORK (PeerJS P2P · 방장 권한형 · 원클릭 초대 · 자동 재접속 · 관리자 방장 이전) =================
const MAX_PLAYERS = 2;
const ROOM_PREFIX = 'sbc3d-v1-';
const PUBLIC_ROOMS = ['PUB01', 'PUB02', 'PUB03', 'PUB04', 'PUB05', 'PUB06', 'PUB07', 'PUB08'];
const NET_ERR = {
  'peer-unavailable': '방을 찾을 수 없어요 — 친구가 게임 화면을 켜 두었는지 확인해 주세요',
  'unavailable-id': '이미 사용 중인 방 코드예요', full: '방이 가득 찼어요 (최대 2명)', allfull: '공개방이 모두 가득 찼어요 — 잠시 후 다시 시도하거나 링크로 초대해 보세요',
  network: '매칭 서버에 연결할 수 없어요 (인터넷 연결 확인)', 'server-error': '매칭 서버 오류 — 잠시 후 다시 시도해 주세요', 'socket-error': '매칭 서버 연결 오류 — 다시 시도해 주세요', 'socket-closed': '매칭 서버 연결이 끊겼어요',
  'browser-incompatible': '이 브라우저는 P2P(WebRTC)를 지원하지 않아요 — 크롬/사파리 최신 버전을 써 주세요', webrtc: 'P2P 연결 실패 (방화벽/공유기 문제) — 와이파이↔LTE를 바꿔서 다시 시도해 보세요',
  timeout: '연결 시간 초과 — 네트워크를 확인하고 다시 시도해 주세요', nopeer: 'PeerJS를 불러오지 못했어요 (네트워크 확인 후 새로고침)',
};
function netErr(code) { const e = new Error(NET_ERR[code] || ('네트워크 오류: ' + code)); e.code = code; return e; }
function peerOpts() {
  const o = { debug: 0, config: { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }, { urls: 'stun:stun.cloudflare.com:3478' }] } };
  const h = URLP.get('peerhost'); // 테스트/자체 서버용 (기본은 PeerJS 공개 클라우드 서버, https)
  if (h) { o.host = h; o.port = +(URLP.get('peerport') || 443); o.path = URLP.get('peerpath') || '/'; o.secure = URLP.has('peersecure') ? URLP.get('peersecure') === '1' : o.port === 443; }
  return o;
}
function inviteLink(room) { const u = new URL(location.href); u.hash = ''; for (const k of ['debug', 'quick']) u.searchParams.delete(k); u.searchParams.set('room', room); return u.toString(); }
function cleanUrl() { const u = new URL(location.href); u.hash = ''; for (const k of ['room', 'quick']) u.searchParams.delete(k); return u.toString(); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const NET = {
  peer: null, peerRoom: null, // 방 코드를 내가 점유할 때(방장 대기)의 Peer
  gpeer: null,                // 다른 방에 참가할 때의 임시 Peer
  conns: [], hostConn: null, lastP: 0, lastW: 0, bc: null, recovering: false, kicked: false, helloSent: false,
  send(m) {
    if (!G.online) return; m.f = m.f || ME.id;
    for (const c of this.conns) { if (m.to && G.isHost && c.pid && c.pid !== m.to) continue; try { c.send(m); } catch (e) { } }
  },
  relay(m, from) { if (!G.isHost) return; for (const c of this.conns) if (c !== from) { if (m.to && c.pid !== m.to) continue; try { c.send(m); } catch (e) { } } },
  code() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += A[Math.floor(Math.random() * A.length)]; return s; },
  ownsRoom() { if (this.bc) return this.localId === 'HOST'; return !!(this.peer && this.peer.open && !this.peer.destroyed); },
  // ---- 같은 브라우저 탭끼리 테스트 (?local=1) ----
  localTransport(room, host) {
    const bc = new BroadcastChannel('sbc3d-' + room); this.bc = bc; const self = this;
    const mk = (peerId) => ({ pid: null, peerId, open: true, lastRx: performance.now(), send(m) { bc.postMessage({ to: peerId, from: self.localId, m }); }, close() { } });
    this.localId = host ? 'HOST' : 'G' + Math.random().toString(36).slice(2, 7);
    bc.onmessage = (e) => {
      const d = e.data; if (d.to !== self.localId) return;
      let c = self.conns.find(x => x.peerId === d.from);
      if (!c) { if (!host) return; if (self.conns.length >= MAX_PLAYERS - 1) { bc.postMessage({ to: d.from, from: self.localId, m: { t: 'full' } }); return; } c = mk(d.from); self.conns.push(c); }
      c.lastRx = performance.now(); self.onData(d.m, c);
    };
    if (!host) { const c = mk('HOST'); this.conns.push(c); this.hostConn = c; return Promise.resolve(c); }
    return Promise.resolve(null);
  },
  // ---- 방 코드 점유 (내가 방장으로 대기) ----
  listen(room) {
    if (URLP.get('local')) return this.localTransport(room, true).then(() => true);
    if (!window.Peer) return Promise.reject(netErr('nopeer'));
    if (this.ownsRoom() && this.peerRoom === room) return Promise.resolve(true);
    try { this.peer && this.peer.destroy(); } catch (e) { }
    return new Promise((res, rej) => {
      const peer = this.peer = new Peer(ROOM_PREFIX + room, peerOpts()); this.peerRoom = room; let done = false;
      const fail = code => { if (done) return; done = true; clearTimeout(to); try { peer.destroy(); } catch (e) { } if (this.peer === peer) this.peer = null; rej(netErr(code)); };
      const to = setTimeout(() => fail('timeout'), 15000);
      peer.on('open', () => { if (done) return; done = true; clearTimeout(to); res(true); });
      peer.on('error', e => { if (!done) fail(e.type); else console.warn('peer error', e.type); });
      peer.on('connection', conn => this.accept(conn));
      peer.on('disconnected', () => { if (!peer.destroyed) setTimeout(() => { try { if (!peer.destroyed && peer.disconnected) peer.reconnect(); } catch (e) { } }, 1500); });
    });
  },
  accept(conn) {
    conn.on('open', () => {
      if (this.conns.length >= MAX_PLAYERS - 1) { try { conn.send({ t: 'full' }); } catch (e) { } setTimeout(() => { try { conn.close(); } catch (e) { } }, 600); return; }
      this.recovering = false; if (!G.isHost) this.becomeAuthority();
      conn.lastRx = performance.now(); this.conns.push(conn);
      conn.on('data', m => { conn.lastRx = performance.now(); this.onData(m, conn); });
      conn.on('close', () => this.onClose(conn)); conn.on('error', () => this.onClose(conn));
      try { conn.send({ t: 'acc' }); } catch (e) { }
      this.updateRoomInfo();
    });
  },
  // ---- 다른 사람 방에 참가 ----
  join(room) {
    if (URLP.get('local')) return this.localTransport(room, false).then(() => true);
    if (!window.Peer) return Promise.reject(netErr('nopeer'));
    try { this.gpeer && this.gpeer.destroy(); } catch (e) { }
    return new Promise((res, rej) => {
      const peer = this.gpeer = new Peer(peerOpts()); let done = false;
      const fail = code => { if (done) return; done = true; clearTimeout(to); try { peer.destroy(); } catch (e) { } if (this.gpeer === peer) this.gpeer = null; rej(netErr(code)); };
      const to = setTimeout(() => fail('timeout'), 15000);
      peer.on('open', () => {
        const conn = peer.connect(ROOM_PREFIX + room, { reliable: true, serialization: 'json' });
        conn.on('data', m => {
          conn.lastRx = performance.now();
          if (!done) { // 방장이 받아주면 'acc', 가득 차면 'full'
            if (m && m.t === 'full') fail('full');
            else if (m && m.t === 'acc') { done = true; clearTimeout(to); this.conns.push(conn); this.hostConn = conn; res(true); }
            return;
          }
          this.onData(m, conn);
        });
        conn.on('close', () => { if (!done) fail('peer-unavailable'); else this.onClose(conn); });
        conn.on('error', () => { if (!done) fail('webrtc'); else this.onClose(conn); });
      });
      peer.on('error', e => { if (!done) fail(e.type); else if (e.type !== 'peer-unavailable') console.warn('peer error', e.type); });
      peer.on('disconnected', () => { if (!peer.destroyed && done) setTimeout(() => { try { if (!peer.destroyed && peer.disconnected) peer.reconnect(); } catch (e) { } }, 1500); });
    });
  },
  host(room) { return this.listen(room); },
  // ---- 빠른 참가: 공개방을 차례로 확인 → 사람이 기다리는 방이 있으면 참가, 없으면 내가 공개방을 연다 ----
  async quickMatch(say) {
    for (const r of PUBLIC_ROOMS) {
      say && say(`⚡ 공개방 ${r} 확인 중…`);
      try { await this.join(r); return { mode: 'join', room: r }; }
      catch (e) { if (e.code === 'full' || e.code === 'timeout' || e.code === 'webrtc') continue; if (e.code !== 'peer-unavailable') throw e; }
      try { await this.listen(r); return { mode: 'host', room: r }; }
      catch (e) { if (e.code === 'unavailable-id') { try { await this.join(r); return { mode: 'join', room: r }; } catch (e2) { continue; } } throw e; }
    }
    throw netErr('allfull');
  },
  kick(c, ban) {
    if (!c || c.admin || (c.pid && c.pid === G.adminId && G.adminId !== ME.id)) return false; // 관리자는 추방/밴 불가
    if (ban && c.pid) { BANS.add(c.pid); saveBans(); }
    try { c.send({ t: 'kicked', ban: !!ban }); } catch (e) { }
    setTimeout(() => { try { c.close && c.close(); } catch (e) { } this.onClose(c); }, 500); return true;
  },
  onClose(conn) {
    const i = this.conns.indexOf(conn); if (i < 0) return; this.conns.splice(i, 1);
    try { conn.close && conn.close(); } catch (e) { }
    const wasHostConn = conn === this.hostConn; if (wasHostConn) this.hostConn = null;
    const names = [...G.players.values()].map(rp => rp.name); const nm = names[0] || '상대';
    for (const id of [...G.players.keys()]) { removeRemote(id); TAXI.removeOwnedBy(id); }
    if (G.adminId && G.adminId !== ME.id) G.adminId = null;
    if (this.kicked) return;
    UI.chatLine(null, `${nm}님과 연결이 끊겼습니다`);
    if (!G.isHost) { this.becomeAuthority(); toast('⚠ 방장과 연결이 끊겼다 — 재접속 시도 중…', 4000); }
    else toast(`👋 ${nm} 퇴장`);
    if (G.online && !this.ownsRoom()) this.recover();
    this.updateRoomInfo();
  },
  // ---- 연결이 끊겼을 때: 같은 방에 다시 접속 → 안 되면 내가 그 방 코드를 이어받아 기다린다 ----
  async recover() {
    if (this.recovering || this.kicked || !G.online || this.bc) return;
    this.recovering = true; const room = G.room; this.updateRoomInfo();
    for (let k = 0; k < 20 && this.recovering; k++) {
      if (this.conns.length || this.ownsRoom()) break;
      try { await this.join(room); if (!this.recovering && this.conns.length > 1) break; this.recovering = false; this.becomeGuest(); this.hello(); toast('✅ 방에 다시 접속했다'); UI.chatLine(null, '방에 다시 접속했습니다'); break; }
      catch (e) { if (e.code === 'full') { toast('방이 가득 찼다'); break; } }
      if (!this.recovering || this.conns.length) break;
      try { await this.listen(room); toast(`🌐 방 ${room}을(를) 이어받았다 — 친구가 같은 링크로 다시 들어올 수 있다`, 5000); break; } catch (e) { }
      await sleep(2500 + k * 700);
    }
    this.recovering = false; this.updateRoomInfo();
  },
  // 내가 방장(월드 시뮬레이션 담당)이 된다
  becomeAuthority() {
    if (G.isHost) return; G.isHost = true; G.hostId = ME.id;
    for (const v of vehicles.values()) {
      if (v.taxiCab && v.taxiOwner !== ME.id) continue;
      if (v.driver && v.driver !== ME.id && G.players.has(v.driver)) continue;
      if (v.driver && v.driver !== ME.id) v.driver = null;
      if (v.ctrl === 'remote' && v.tx !== undefined && v !== ME.vehicle) { v.x = v.tx; v.y = v.ty; v.z = v.tz; v.yaw = v.tyaw; }
      v.ctrl = 'local'; if (v.isTraffic && v.ai) trafficAdopt(v);
    }
    for (const p of PEDS) { if (p.tx !== undefined) { p.x = p.tx; p.y = p.ty; p.z = p.tz; } if (p.state !== 'parked' && p.state !== 'dead' && p.state !== 'club') { p.target = null; p.state = 'walk'; snapToNearestEdge(p); } }
    for (const a of ANIMALS) if (a.tx2 !== undefined) { a.x = a.tx2; a.y = a.ty2; a.z = a.tz2; }
    this.updateRoomInfo();
  },
  // 다른 사람이 방장이 된다 (나는 게스트)
  becomeGuest() {
    G.isHost = false;
    for (const v of vehicles.values()) { if (v.driver === ME.id || (v.taxiCab && v.taxiOwner === ME.id)) continue; v.ctrl = 'remote'; v.netT = 0; v.tx = v.x; v.ty = v.y; v.tz = v.z; v.tyaw = v.yaw; }
    for (const p of PEDS) { p.tx = p.x; p.ty = p.y; p.tz = p.z; p.tyaw = p.yaw; }
    for (const a of ANIMALS) { a.tx2 = a.x; a.ty2 = a.y; a.tz2 = a.z; a.tyaw = a.yaw; }
    this.updateRoomInfo();
  },
  // 방장(나) → 서명 검증된 관리자에게 방장 권한을 넘긴다 (승인 절차 없음)
  transferHostTo(conn) {
    const aid = conn.pid; G.adminId = aid;
    try { conn.send({ t: 'hostTo', f: ME.id, plots: PLOTS.map(plotState), time: G.time, wt: G.weather }); } catch (e) { }
    savePlots(); this.becomeGuest(); this.hostConn = conn; G.hostId = aid;
    const rp = G.players.get(aid); if (rp) rp.char.setName((rp.name || '') + ' 👑', '#ffd34a');
    announce('👑 관리자 입장', (rp ? rp.name : '관리자') + '님이 방장이 되었습니다'); UI.chatLine(null, '👑 방장 권한이 관리자에게 넘어갔습니다');
    this.updateRoomInfo();
  },
  hello() { this.helloSent = true; this.send({ t: 'hello', id: ME.id, n: ME.name, o: ME.outfit, adm: ADMIN.on ? 1 : 0 }); },
  heartbeat() {
    if (!G.online) return; const now = performance.now();
    for (const c of this.conns.slice()) { try { c.send({ t: 'hb', f: ME.id }); } catch (e) { } if (now - (c.lastRx || now) > 30000) { toast('⚠ 상대 응답 없음 — 연결 정리'); this.onClose(c); } }
  },
  updateRoomInfo() {
    const el = $('#roomInfo'); if (!el || !G.started) return;
    if (!G.online) { el.textContent = '혼자 플레이'; return; }
    const n = G.players.size + 1; const pub = PUBLIC_ROOMS.includes(G.room);
    el.innerHTML = `${pub ? '⚡ 공개방' : '🌐 방'} <b>${G.room}</b> · ${n}/${MAX_PLAYERS}명 · ${G.isHost ? '👑 방장' : '게스트'}${this.recovering ? ' · 🔄 재접속 중…' : ''}${G.isHost && n < MAX_PLAYERS ? ' · <u>P ▶ 초대 링크</u>' : ''}`;
  },
  // ---- outgoing ticks ----
  tick(dt) {
    if (!G.online || !this.conns.length) return;
    this.lastP -= dt; this.lastW -= dt;
    if (this.lastP <= 0) { this.lastP = 1 / 15; this.send(this.playerMsg()); }
    if (G.isHost && this.lastW <= 0) { this.lastW = 1 / 10; this.send(this.worldMsg()); }
  },
  playerMsg() {
    const m = { t: 'p', n: ME.name, x: +ME.x.toFixed(2), y: +ME.y.toFixed(2), z: +ME.z.toFixed(2), yaw: +ME.yaw.toFixed(3), spd: +ME.spd.toFixed(2), gr: ME.grounded ? 1 : 0,
      st: ME.dead ? 'dead' : ME.sitBench ? 'sit' : ME.swim ? 'swim' : ME.knockT > 0.6 ? 'knocked' : 'normal', aim: ME.aiming ? 1 : 0, ap: +(-CAM.pitch).toFixed(2), w: ME.weapon, dance: ME.dance, guard: ME.combatT > G.t ? 1 : 0,
      veh: ME.vehicle ? ME.vehicle.id : null, seat: ME.seat, dead: ME.dead ? 1 : 0, j: ME.jail ? 1 : 0, bi: myBi(), wanted: ME.wanted, hp: Math.round(ME.hp), g: { gangA: ME.grudge.gangA || 0, gangB: ME.grudge.gangB || 0 }, gt: G.t };
    if (ME.vehicle && ME.seat === 'd') m.vs = ME.vehicle.state();
    if (TAXI.cab) m.tc = TAXI.cab.state(); // 내가 부른 택시 (AI 운전) 위치 동기화
    return m;
  },
  worldMsg() {
    const peds = []; const guestPos = [...G.players.values()];
    const nearG = (x, z) => guestPos.some(rp => { const a = anchorOf(rp); return Math.abs(a.x - x) < 260 && Math.abs(a.z - z) < 260; });
    for (const p of PEDS) { if (p.state === 'parked' || !nearG(p.x, p.z)) { peds.push([p.id, 0]); continue; } peds.push([p.id, 1, p.kind, p.seed, +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), +p.yaw.toFixed(2), +p.spd.toFixed(1), p.state, p.weapon, p.act || '', +p.actT.toFixed(2), p.dance, p.aiming ? 1 : 0]); }
    const vs = []; for (const v of vehicles.values()) { if (v.ctrl !== 'local' || v.driver === ME.id) continue; if (!nearG(v.x, v.z) && !v.isTraffic) continue; const moving = Math.abs(v.speed) > 0.05 || v.vy !== 0 || v.burnT > 0 || v._ls === undefined || Math.abs(v._ls - v.x - v.z) > 0.01; if (!moving && !v.isTraffic) continue; v._ls = v.x + v.z; const s = v.state(); s.push(v.ai ? 1 : 0, v.mesh.visible ? 1 : 0); vs.push(s); }
    const an = []; for (const a of ANIMALS) { if (!nearG(a.x, a.z)) continue; an.push([a.id, +a.x.toFixed(2), +a.y.toFixed(2), +a.z.toFixed(2), +a.yaw.toFixed(2), +a.spd.toFixed(1), a.state, a.owner || 0]); }
    return { t: 'w', peds, vs, an, time: +G.time.toFixed(3), wt: G.weather, raid: G.raid ? [G.raid.x, G.raid.z] : 0 };
  },
  // ---- incoming ----
  queue: [],
  flush() { const q = this.queue; this.queue = []; for (const [m, c] of q) this.onData(m, c); },
  onData(m, conn) {
    if (m && (m.t === 'hb' || m.t === 'acc')) return;
    if (!m || !m.t) return; const f = m.f;
    if (f && f === ME.id && m.t !== 'hello' && m.t !== 'reid') return; // 내 id로 온 메시지(자기 메아리·id 충돌)는 무시 → 자기 자신 복제/자해 방지
    if (!G.started && m.t !== 'full') { if (m.t !== 'p' && m.t !== 'w') this.queue.push([m, conn]); return; }
    if (G.isHost && conn && !conn.pid && m.t === 'hello') conn.pid = m.id;
    if (G.isHost && !NO_RELAY.has(m.t)) this.relay(m, conn);
    if (m.to && m.to !== ME.id) return;
    switch (m.t) {
      case 'full': toast('방이 가득 찼다 (최대 2명)'); break;
      case 'hello': {
        if (!G.isHost || !conn) break;
        if (!m.id || m.id === ME.id || [...this.conns].some(c => c !== conn && c.pid === m.id)) { conn.pid = null; try { conn.send({ t: 'reid', f: ME.id }); } catch (e) { } break; } // 같은 브라우저 탭 등 id 충돌 → 새 id 요청
        if (conn.helloId && conn.helloId !== m.id) removeRemote(conn.helloId); conn.helloId = m.id; conn.pid = m.id; // 같은 연결이 id를 바꿔 다시 인사하면 예전 캐릭터 정리
        const banned = BANS.has(m.id);
        if (banned && !m.adm) { this.kick(conn, true); break; } // 관리자라고 주장하면 서명 검증 후 판단
        const rp = getRemote(m.id); rp.name = m.n; rp.char.setOutfit(m.o); rp.char.setName(m.n, '#9fe0ff');
        conn.send({ t: 'welcome', id: ME.id, n: ME.name, o: ME.outfit, time: G.time, wt: G.weather, plots: PLOTS.filter(p => p.state !== 'empty').map(plotState), trees: TREES.filter(t => t.cutAt && !t.alive).map(t => t.idx), dyn: [...vehicles.values()].filter(v => v.dyn).map(v => [v.id, v.model, v.color, v.x, v.z, v.yaw, v.owner]), picks: [...PICKUPS.values()].map(p => [p.id, p.x, p.z, p.amount]), seats: [...vehicles.values()].filter(v => v.driver && !v.taxiCab).map(v => [v.id, v.driver, v.passenger]) });
        if (m.adm && ADMIN.enabled()) ADMIN.challenge(conn, banned); // nonce 발급 → 관리자가 서명으로 증명하면 자동 방장 이전
        else if (ADMIN.on && G.adminId === ME.id) conn.send({ t: 'admin', aid: ME.id });
        toast(`🎉 ${m.n} 입장!`); UI.chatLine(null, `${m.n}님이 들어왔습니다`); sfx('levelup'); SHARE.hide(); this.updateRoomInfo(); break;
      }
      case 'admClaim': if (G.isHost && conn && conn.pid) ADMIN.challenge(conn, false); break;
      case 'admChal': ADMIN.prove(m, conn); break;
      case 'admProof': ADMIN.onProof(m, conn); break;
      case 'hostTo': {
        if (G.isHost || !conn || conn !== this.hostConn || !ADMIN.on) break;
        conn.pid = m.f; this.hostConn = null; this.becomeAuthority(); G.adminId = ME.id;
        for (const s of m.plots || []) applyPlotState(s); if (m.time !== undefined) G.time = m.time; if (m.wt) G.weather = m.wt;
        this.send({ t: 'admin', aid: ME.id }); announce('👑 방장 권한 획득', '관리자 인증 완료 — 이제 이 방의 방장입니다'); UI.chatLine(null, '👑 관리자 인증 완료: 방장 권한을 넘겨받았습니다');
        if (BANS.has(m.f)) setTimeout(() => this.kick(conn, true), 800);
        this.updateRoomInfo(); break;
      }
      case 'tc': TAXI.onNet(m, f); break;
      case 'taxiRm': TAXI.onRemove(m, f); break;
      case 'taxiHail': if (G.isHost) TAXI.parkTraffic(vehicles.get(m.v)); break;
      case 'welcome': {
        const rp = getRemote(m.id); rp.name = m.n; rp.char.setOutfit(m.o); rp.char.setName(m.n, '#ffd34a'); G.hostId = m.id;
        G.time = m.time; G.weather = m.wt; for (const s of m.plots) applyPlotState(s);
        for (const i of m.trees) if (TREES[i] && TREES[i].alive) setTreeVisible(TREES[i], false);
        for (const d of m.dyn) if (!vehicles.has(d[0])) { const v = new Vehicle(d[0], d[1], d[2], d[3], d[4], d[5], { owner: d[6] }); v.dyn = true; }
        for (const p of m.picks) if (!PICKUPS.has(p[0])) spawnPickup(p[1], p[2], p[3], p[0]);
        for (const s of m.seats) { const v = vehicles.get(s[0]); if (v) { v.driver = s[1]; v.passenger = s[2]; } }
        toast(`✅ ${m.n}의 서부리 시티에 접속!`); UI.chatLine(null, `${m.n}님의 방에 접속했습니다`); this.updateRoomInfo(); break;
      }
      case 'reid': { if (G.isHost) break; const nid = newTabId(); toast('🔁 같은 기기의 다른 탭과 겹쳐서 새 플레이어 ID로 접속'); ME.id = nid; G.myId = nid; this.hello(); break; }
      case 'bye': removeRemote(m.f); break;
      case 'p': {
        if (!f || f === ME.id) break; const rp = getRemote(f); const nbi = m.bi ?? -1; const jump = rp.first || nbi !== (rp.bi ?? -1) || Math.hypot(m.x - rp.x, m.z - rp.z) > 40; if (jump) { rp.first = false; rp.x = rp.tx = m.x; rp.y = rp.ty = m.y; rp.z = rp.tz = m.z; } rp.bi = nbi; // 건물 출입·순간이동은 미끄러지지 않고 바로 이동
        if (rp.name !== m.n) { rp.name = m.n; rp.char.setName(m.n, '#9fe0ff'); }
        Object.assign(rp, { tx: m.x, ty: m.y, tz: m.z, tyaw: m.yaw, spd: m.spd, gr: m.gr, st: m.st, aim: m.aim, ap: m.ap, w: m.w, dance: m.dance, guard: m.guard, seat: m.seat, dead: !!m.dead, jail: !!m.j, wanted: m.wanted, hp: m.hp, grudge: m.g || {} });
        if (rp._jn !== rp.jail) { rp._jn = rp.jail; rp.char.setName(rp.name + (rp.jail ? ' 🔒수감 중' : ''), rp.jail ? '#ff9a6a' : '#9fe0ff'); }
        // grudge times are sender-relative -> convert
        if (m.g) rp.grudge = { gangA: m.g.gangA ? G.t + (m.g.gangA - m.gt) : 0, gangB: m.g.gangB ? G.t + (m.g.gangB - m.gt) : 0 };
        if (rp.veh !== m.veh) { const old = rp.veh && vehicles.get(rp.veh); if (old) { if (old.driver === f) { old.driver = null; old.ctrl = G.isHost ? 'local' : 'remote'; } if (old.passenger === f) old.passenger = null; } rp.veh = m.veh; }
        if (m.tc) TAXI.onNet({ s: m.tc }, f);
        if (m.vs) { const v = vehicles.get(m.vs[0]); if (v) { if (v.driver !== f) { v.driver = f; } if (v.ai) { if (G.isHost) ejectNpcDriver(v); v.ai = null; if (v.npcDriver) v.npcDriver.root.visible = false; } v.ctrl = 'remote'; v.applyState(m.vs); v.mesh.visible = true; } }
        break;
      }
      case 'w': {
        if (G.isHost) break; G.time = m.time; G.weather = m.wt;
        for (const d of m.peds) {
          const p = PEDS[d[0]]; if (!p) continue; if (!d[1]) { p.state = 'parked'; continue; }
          if (p.seed !== d[3] || p.kind !== d[2]) { p.kind = d[2]; p.seed = d[3]; p.outfit = randomOutfit(mulberry32(d[3]), d[2] === 'medic' ? 'doctor' : ['gangA', 'gangB', 'police', 'worker'].includes(d[2]) ? d[2] : 'civ'); if (p.char) p.char.setOutfit(p.outfit); p.x = d[4]; p.y = d[5]; p.z = d[6]; p.yaw = d[7]; }
          if (p.state === 'parked') { p.x = d[4]; p.y = d[5]; p.z = d[6]; p.yaw = d[7]; }
          p.tx = d[4]; p.ty = d[5]; p.tz = d[6]; p.tyaw = d[7]; p.spd = d[8]; p.state = d[9]; p.weapon = d[10]; if (d[11] && (d[11] !== p.act || d[12] < p.actT)) { p.act = d[11]; p.actT = d[12]; } p.dance = d[13]; p.aiming = !!d[14];
        }
        for (const s of m.vs) { const v = vehicles.get(s[0]); if (!v || v.driver === ME.id) continue; v.ctrl = 'remote'; v.applyState(s); const ai = s[11], vis = s[12]; if (v.isTraffic) { v.ai = ai ? (v.ai || {}) : null; if (v.npcDriver) v.npcDriver.root.visible = !!ai; v.mesh.visible = !!vis; } }
        for (const a of m.an) { const A = ANIMALS[a[0]]; if (!A) continue; if (A.tx2 === undefined || Math.hypot(A.x - a[1], A.z - a[3]) > 20) { A.x = a[1]; A.y = a[2]; A.z = a[3]; A.yaw = a[4]; } A.tx2 = a[1]; A.ty2 = a[2]; A.tz2 = a[3]; A.tyaw = a[4]; A.spd = a[5]; A.state = a[6]; A.owner = a[7] || null; }
        break;
      }
      case 'chat': { if (m.sys) UI.chatLine(null, m.m); else { const rp = G.players.get(f); UI.chatLine(rp ? rp.name : '?', m.m); if (rp) rp.char.say(m.m); } break; }
      case 'shot': { const a = { x: m.a[0], y: m.a[1], z: m.a[2] }, b = { x: m.b[0], y: m.b[1], z: m.b[2] }; showShot(a, b, m.w, m.i); const rp = G.players.get(f); if (rp) { rp.act = 'shoot'; rp.actT = 0; } break; }
      case 'act': { const rp = G.players.get(f); if (rp) { rp.act = m.a; rp.actT = 0; } break; }
      case 'dmg': { // 맞은 사람만 피해를 적용(권한자) → 공격자에게 결과 통보
        if (m.to !== ME.id || !f || f === ME.id || m.from === ME.id) break;
        const before = ME.hp; ME.takeDamage(+m.amt || 0, m.from || f); const d = Math.max(0, Math.round(before - Math.max(0, ME.hp)));
        if (f !== 'n' && G.players.has(f)) this.send({ t: 'hitAck', to: f, d, hp: Math.max(0, Math.round(ME.hp)), dead: ME.dead ? 1 : 0, k: m.k });
        break;
      }
      case 'hitAck': { if (m.to !== ME.id) break; const rp = G.players.get(f); UI.hitMarker(); if (rp) { rp.act = 'hit'; rp.actT = 0; rp.hp = m.hp; if (m.d > 0) FX.emoji('💢', rp.x, rp.y + 2.1, rp.z); } ME.lastHit = { id: f, d: m.d, hp: m.hp, t: G.t }; if (m.dead && rp) toast(`💀 ${rp.name} 쓰러뜨렸다!`); break; }
      case 'pdmg': if (G.isHost) pedDamage(PEDS[m.id], m.amt, m.f, { kind: m.k }); break;
      case 'admg': if (G.isHost) animalDamage(ANIMALS[m.id], m.amt, m.f); break;
      case 'wanted': case 'grudge': case 'kill': case 'meat': case 'petDead': case 'adopted': if (m.to === ME.id) handlePersonal(m); break;
      case 'plotFail': if (m.to === ME.id) { ME.money += m.amt; toast('❌ ' + m.msg + ' (환불)'); } break;
      case 'income': if (m.to === ME.id) { ME.money += m.amt; sfx('cash'); toast(`💰 임대 수익 ${fmtMoney(m.amt)} 수령`); } break;
      case 'seat': {
        const v = vehicles.get(m.v); if (!v) break;
        if (m.s === 'd') { if (v.ai && G.isHost) ejectNpcDriver(v); v.ai = null; if (v.npcDriver) v.npcDriver.root.visible = false; v.driver = f; v.ctrl = 'remote'; v.mesh.visible = true; if (ME.vehicle === v && ME.seat === 'd') { exitVehicle(true); } }
        else if (m.s === 'p') { v.passenger = f; }
        else { if (v.driver === f) { v.driver = null; v.ctrl = G.isHost ? 'local' : 'remote'; v.brake = true; } if (v.passenger === f) v.passenger = null; }
        const rp = G.players.get(f); if (rp) { rp.veh = m.s ? m.v : null; rp.seat = m.s; }
        break;
      }
      case 'jack': { const v = vehicles.get(m.v); if (v && G.isHost && v.ai) ejectNpcDriver(v); break; }
      case 'vdmg': { const v = vehicles.get(m.id); if (v && v.ctrl === 'local') v.damage(m.amt, m.f); break; }
      case 'vboom': { const v = vehicles.get(m.id); if (v && !v.dead) v.explode(); break; }
      case 'vspawn': { let v = vehicles.get(m.id); if (!v) { v = new Vehicle(m.id, m.model, m.color, m.x, m.z, m.yaw, { owner: m.owner }); v.dyn = true; } else { v.x = m.x; v.z = m.z; v.yaw = m.yaw; v.y = groundHeight(m.x, m.z); v.reset && (v.hp = v.M.hp, v.dead = false, v.burnT = 0); } v.ctrl = 'remote'; break; }
      case 'tree': { const t = TREES[m.i]; if (t && t.alive) fellTree(t, m.y); if (G.isHost && t) t.cutAt = G.t; break; }
      case 'treeGrow': { const t = TREES[m.i]; if (t && !t.alive) setTreeVisible(t, true); break; }
      case 'pick': { if (!G.isHost) break; const p = PICKUPS.get(m.id); if (!p) break; removePickup(m.id); this.send({ t: 'pickRm', id: m.id, by: f, a: p.amount }); break; }
      case 'pickRm': { removePickup(m.id); if (m.by === ME.id) { ME.money += m.a; sfx('cash'); toast(`💵 +${fmtMoney(m.a)}`); } break; }
      case 'pickAdd': if (!G.isHost && !PICKUPS.has(m.id)) spawnPickup(m.x, m.z, m.a, m.id); break;
      case 'buyLand': case 'build': case 'collect': if (G.isHost) { const rp = G.players.get(f); hostPlotRequest(m, f, rp ? rp.name : '?'); } break;
      case 'plot': applyPlotState(m.p); break;
      case 'plots': for (const s of m.ps) applyPlotState(s); break;
      case 'ann': announce(m.a, m.b); break;
      case 'horn': { const rp = G.players.get(f); if (rp) sfx('horn', rp.x, rp.z); break; }
      case 'admin': ADMIN.onAdminMsg(m); break;
      case 'free': if (m.to === ME.id) LAW.release('🔓 관리자님이 무료로 석방해 주셨다'); break;
      case 'adm': ADMIN.onNet(Object.assign({}, m, { f }), conn); break;
      case 'kicked': if (!G.isHost && !ADMIN.on && conn === this.hostConn) { this.kicked = true; this.recovering = false; announce(m.ban ? '⛔ 밴당했다' : '👢 추방당했다', '로비로 돌아갑니다'); setTimeout(() => location.replace(cleanUrl()), 1800); } break;
      case 'panic': if (G.isHost) panicAround(m.x, m.z, 35); break;
      case 'adopt': if (G.isHost) { const a = ANIMALS[m.a]; if (a && !a.owner) { a.owner = f; a.state = 'follow'; notifyPlayer(f, { t: 'adopted', a: a.id }); } } break;
      case 'pet': { const a = ANIMALS[m.a]; if (a) FX.emoji('💕', a.x, a.y + 1.2, a.z); break; }
      case 'outfit': { const rp = G.players.get(f); if (rp) rp.char.setOutfit(m.o); break; }
      case 'pedAct': if (G.isHost) { const p = PEDS[m.id]; if (p && p.state !== 'dead') { if (m.a === 'dance') { p.state = 'dance'; p.timer = 15; p.dance = m.d; } if (m.a === 'talk') { p.state = 'talk'; p.timer = 4; } if (m.a === 'rob') { p.state = 'flee'; p.timer = 10; const rp = G.players.get(f); if (rp) { p.fx = rp.x; p.fz = rp.z; } } } } break;
    }
  },
};
const NO_RELAY = new Set(['hello', 'pdmg', 'admg', 'buyLand', 'build', 'collect', 'pick', 'jack', 'adopt', 'panic', 'adm', 'admClaim', 'admChal', 'admProof', 'hostTo', 'taxiHail', 'pedAct']);
// tree regrowth (host)
function hostTrees(dt) {
  if ((G._treeT = (G._treeT || 0) - dt) > 0) return; G._treeT = 5;
  for (const t of TREES) if (!t.alive && t.cutAt && G.t - t.cutAt > 240) { if (nearestPlayerDist(t.x, t.z) < 25) continue; setTreeVisible(t, true); t.hp = 4; t.cutAt = 0; NET.send({ t: 'treeGrow', i: t.idx }); }
}
