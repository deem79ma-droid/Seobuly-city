
// ================= NETWORK (PeerJS, host-authoritative) =================
const MAX_PLAYERS = 2;
const NET = {
  peer: null, conns: [], ready: false, lastP: 0, lastW: 0, bc: null,
  send(m) {
    if (!G.online) return; m.f = m.f || ME.id;
    for (const c of this.conns) { if (m.to && G.isHost && c.pid && c.pid !== m.to) continue; try { c.send(m); } catch (e) { } }
  },
  relay(m, from) { if (!G.isHost) return; for (const c of this.conns) if (c !== from) { if (m.to && c.pid !== m.to) continue; try { c.send(m); } catch (e) { } } },
  code() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += A[Math.floor(Math.random() * A.length)]; return s; },
  // ---- local test transport (same browser tabs) ----
  localTransport(room, host) {
    const bc = new BroadcastChannel('sbc3d-' + room); this.bc = bc; const self = this;
    const mk = (peerId) => ({ pid: null, peerId, open: true, send(m) { bc.postMessage({ to: peerId, from: self.localId, m }); }, close() { } });
    this.localId = host ? 'HOST' : 'G' + Math.random().toString(36).slice(2, 7);
    bc.onmessage = (e) => {
      const d = e.data; if (d.to !== self.localId) { if (!(d.to === '*' )) return; }
      let c = self.conns.find(x => x.peerId === d.from);
      if (!c) { if (!host) return; if (self.conns.length >= MAX_PLAYERS - 1) { bc.postMessage({ to: d.from, from: self.localId, m: { t: 'full' } }); return; } c = mk(d.from); self.conns.push(c); }
      self.onData(d.m, c);
    };
    if (!host) { const c = mk('HOST'); this.conns.push(c); return Promise.resolve(c); }
    return Promise.resolve(null);
  },
  async host(room) {
    G.online = true; G.isHost = true; G.room = room;
    if (URLP.get('local')) { await this.localTransport(room, true); return true; }
    if (!window.Peer) throw new Error('PeerJS 로드 실패 (네트워크 확인)');
    return new Promise((res, rej) => {
      const peer = this.peer = new Peer('sbc3d-v1-' + room, { debug: 0 });
      const to = setTimeout(() => rej(new Error('서버 연결 시간 초과')), 15000);
      peer.on('open', () => { clearTimeout(to); res(true); });
      peer.on('error', e => { clearTimeout(to); if (e.type === 'unavailable-id') rej(new Error('이미 사용 중인 방 코드')); else if (!G.started) rej(e); else toast('네트워크 오류: ' + e.type); });
      peer.on('connection', conn => {
        if (this.conns.length >= MAX_PLAYERS - 1) { conn.on('open', () => { conn.send({ t: 'full' }); setTimeout(() => conn.close(), 500); }); return; }
        conn.on('open', () => { this.conns.push(conn); });
        conn.on('data', m => this.onData(m, conn));
        conn.on('close', () => this.onClose(conn)); conn.on('error', () => this.onClose(conn));
      });
      peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { } });
    });
  },
  async join(room) {
    G.online = true; G.isHost = false; G.room = room;
    if (URLP.get('local')) { const c = await this.localTransport(room, false); this.hostConn = c; return true; }
    if (!window.Peer) throw new Error('PeerJS 로드 실패 (네트워크 확인)');
    return new Promise((res, rej) => {
      const peer = this.peer = new Peer({ debug: 0 }); const to = setTimeout(() => rej(new Error('방을 찾을 수 없음 (시간 초과)')), 15000);
      peer.on('open', () => {
        const conn = peer.connect('sbc3d-v1-' + room, { reliable: true, serialization: 'json' });
        conn.on('open', () => { clearTimeout(to); this.conns.push(conn); this.hostConn = conn; res(true); });
        conn.on('data', m => this.onData(m, conn)); conn.on('close', () => this.onClose(conn)); conn.on('error', () => this.onClose(conn));
      });
      peer.on('error', e => { clearTimeout(to); if (!G.started) rej(new Error(e.type === 'peer-unavailable' ? '방을 찾을 수 없음' : e.type)); else toast('네트워크 오류: ' + e.type); });
    });
  },
  onClose(conn) {
    const i = this.conns.indexOf(conn); if (i < 0) return; this.conns.splice(i, 1);
    if (G.isHost) { if (conn.pid) { const rp = G.players.get(conn.pid); toast(`👋 ${rp ? rp.name : '플레이어'} 퇴장`); UI.chatLine(null, `${rp ? rp.name : '플레이어'}님이 나갔습니다`); removeRemote(conn.pid); this.relay({ t: 'bye', f: conn.pid }, conn); } }
    else { toast('⚠ 호스트와 연결이 끊겼다 — 혼자 모드로 전환'); for (const id of [...G.players.keys()]) removeRemote(id); becomeHost(); }
  },
  hello() { this.send({ t: 'hello', id: ME.id, n: ME.name, o: ME.outfit, ap: ADMIN.on ? ADMIN.pw : undefined }); },
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
      veh: ME.vehicle ? ME.vehicle.id : null, seat: ME.seat, dead: ME.dead ? 1 : 0, j: ME.jail ? 1 : 0, wanted: ME.wanted, hp: Math.round(ME.hp), g: { gangA: ME.grudge.gangA || 0, gangB: ME.grudge.gangB || 0 }, gt: G.t };
    if (ME.vehicle && ME.seat === 'd') m.vs = ME.vehicle.state();
    return m;
  },
  worldMsg() {
    const peds = []; const guestPos = [...G.players.values()];
    const nearG = (x, z) => guestPos.some(rp => Math.abs(rp.x - x) < 260 && Math.abs(rp.z - z) < 260);
    for (const p of PEDS) { if (p.state === 'parked' || !nearG(p.x, p.z)) { peds.push([p.id, 0]); continue; } peds.push([p.id, 1, p.kind, p.seed, +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), +p.yaw.toFixed(2), +p.spd.toFixed(1), p.state, p.weapon, p.act || '', +p.actT.toFixed(2), p.dance, p.aiming ? 1 : 0]); }
    const vs = []; for (const v of vehicles.values()) { if (v.ctrl !== 'local' || v.driver === ME.id) continue; if (!nearG(v.x, v.z) && !v.isTraffic) continue; const moving = Math.abs(v.speed) > 0.05 || v.vy !== 0 || v.burnT > 0 || v._ls === undefined || Math.abs(v._ls - v.x - v.z) > 0.01; if (!moving && !v.isTraffic) continue; v._ls = v.x + v.z; const s = v.state(); s.push(v.ai ? 1 : 0, v.mesh.visible ? 1 : 0); vs.push(s); }
    const an = []; for (const a of ANIMALS) { if (!nearG(a.x, a.z)) continue; an.push([a.id, +a.x.toFixed(2), +a.y.toFixed(2), +a.z.toFixed(2), +a.yaw.toFixed(2), +a.spd.toFixed(1), a.state, a.owner || 0]); }
    return { t: 'w', peds, vs, an, time: +G.time.toFixed(3), wt: G.weather, raid: G.raid ? [G.raid.x, G.raid.z] : 0 };
  },
  // ---- incoming ----
  queue: [],
  flush() { const q = this.queue; this.queue = []; for (const [m, c] of q) this.onData(m, c); },
  onData(m, conn) {
    if (!m || !m.t) return; const f = m.f;
    if (!G.started && m.t !== 'full') { if (m.t !== 'p' && m.t !== 'w') this.queue.push([m, conn]); return; }
    if (G.isHost && conn && !conn.pid && m.t === 'hello') conn.pid = m.id;
    if (G.isHost && m.t !== 'hello' && m.t !== 'pdmg' && m.t !== 'admg' && m.t !== 'buyLand' && m.t !== 'build' && m.t !== 'collect' && m.t !== 'pick' && m.t !== 'jack' && m.t !== 'adopt' && m.t !== 'panic' && m.t !== 'adm' && m.t !== 'admAuth') this.relay(m, conn);
    if (m.to && m.to !== ME.id) return;
    switch (m.t) {
      case 'full': toast('방이 가득 찼다 (최대 2명)'); break;
      case 'hello': {
        if (!G.isHost) break;
        if (BANS.has(m.id) && !(m.ap && ADMIN.check(m.ap))) { try { conn.send({ t: 'kicked', ban: true }); } catch (e) { } setTimeout(() => { try { conn.close && conn.close(); } catch (e) { } }, 400); break; }
        if (m.ap && ADMIN.check(m.ap)) { conn.admin = true; G.adminId = m.id; } const rp = getRemote(m.id); rp.name = m.n; rp.char.setOutfit(m.o); rp.char.setName(m.n, '#9fe0ff');
        conn.send({ t: 'welcome', id: ME.id, n: ME.name, o: ME.outfit, time: G.time, wt: G.weather, plots: PLOTS.filter(p => p.state !== 'empty').map(plotState), trees: TREES.filter(t => t.cutAt && !t.alive).map(t => t.idx), dyn: [...vehicles.values()].filter(v => v.dyn).map(v => [v.id, v.model, v.color, v.x, v.z, v.yaw, v.owner]), picks: [...PICKUPS.values()].map(p => [p.id, p.x, p.z, p.amount]), seats: [...vehicles.values()].filter(v => v.driver).map(v => [v.id, v.driver, v.passenger]) });
        if (conn.admin) { NET.send({ t: 'admin', aid: m.id }); rp.char.setName(m.n + ' 👑', '#ffd34a'); announce('👑 관리자 입장', m.n + '님이 방장 권한을 가져갑니다'); } else if (ADMIN.on) conn.send({ t: 'admin', aid: ME.id });
        toast(`🎉 ${m.n} 입장!`); UI.chatLine(null, `${m.n}님이 들어왔습니다`); sfx('levelup'); break;
      }
      case 'welcome': {
        const rp = getRemote(m.id); rp.name = m.n; rp.char.setOutfit(m.o); rp.char.setName(m.n, '#ffd34a'); G.hostId = m.id;
        G.time = m.time; G.weather = m.wt; for (const s of m.plots) applyPlotState(s);
        for (const i of m.trees) if (TREES[i] && TREES[i].alive) setTreeVisible(TREES[i], false);
        for (const d of m.dyn) if (!vehicles.has(d[0])) { const v = new Vehicle(d[0], d[1], d[2], d[3], d[4], d[5], { owner: d[6] }); v.dyn = true; }
        for (const p of m.picks) spawnPickup(p[1], p[2], p[3], p[0]);
        for (const s of m.seats) { const v = vehicles.get(s[0]); if (v) { v.driver = s[1]; v.passenger = s[2]; } }
        toast(`✅ ${m.n}의 서부리 시티에 접속!`); UI.chatLine(null, `${m.n}님의 방에 접속했습니다`); break;
      }
      case 'bye': removeRemote(m.f); break;
      case 'p': {
        const rp = getRemote(f); if (rp.first) { rp.first = false; rp.x = m.x; rp.y = m.y; rp.z = m.z; }
        if (rp.name !== m.n) { rp.name = m.n; rp.char.setName(m.n, '#9fe0ff'); }
        Object.assign(rp, { tx: m.x, ty: m.y, tz: m.z, tyaw: m.yaw, spd: m.spd, gr: m.gr, st: m.st, aim: m.aim, ap: m.ap, w: m.w, dance: m.dance, guard: m.guard, seat: m.seat, dead: !!m.dead, jail: !!m.j, wanted: m.wanted, hp: m.hp, grudge: m.g || {} });
        // grudge times are sender-relative -> convert
        if (m.g) rp.grudge = { gangA: m.g.gangA ? G.t + (m.g.gangA - m.gt) : 0, gangB: m.g.gangB ? G.t + (m.g.gangB - m.gt) : 0 };
        if (rp.veh !== m.veh) { const old = rp.veh && vehicles.get(rp.veh); if (old) { if (old.driver === f) { old.driver = null; old.ctrl = G.isHost ? 'local' : 'remote'; } if (old.passenger === f) old.passenger = null; } rp.veh = m.veh; }
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
      case 'dmg': if (m.to === ME.id) ME.takeDamage(m.amt, m.f); break;
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
      case 'admAuth': ADMIN.onAuth(m, conn); break;
      case 'admin': ADMIN.onAdminMsg(m); break;
      case 'free': if (m.to === ME.id) LAW.release('🔓 관리자님이 무료로 석방해 주셨다'); break;
      case 'adm': ADMIN.onNet(Object.assign({}, m, { f })); break;
      case 'kicked': if (!G.isHost && !ADMIN.on) { toast(m.ban ? '⛔ 밴당했다' : '👢 추방당했다'); setTimeout(() => location.reload(), 1500); } break;
      case 'panic': if (G.isHost) panicAround(m.x, m.z, 35); break;
      case 'adopt': if (G.isHost) { const a = ANIMALS[m.a]; if (a && !a.owner) { a.owner = f; a.state = 'follow'; notifyPlayer(f, { t: 'adopted', a: a.id }); } } break;
      case 'pet': { const a = ANIMALS[m.a]; if (a) FX.emoji('💕', a.x, a.y + 1.2, a.z); break; }
      case 'outfit': { const rp = G.players.get(f); if (rp) rp.char.setOutfit(m.o); break; }
      case 'pedAct': if (G.isHost) { const p = PEDS[m.id]; if (p && p.state !== 'dead') { if (m.a === 'dance') { p.state = 'dance'; p.timer = 15; p.dance = m.d; } if (m.a === 'talk') { p.state = 'talk'; p.timer = 4; } if (m.a === 'rob') { p.state = 'flee'; p.timer = 10; const rp = G.players.get(f); if (rp) { p.fx = rp.x; p.fz = rp.z; } } } } break;
    }
  },
};
function becomeHost() {
  G.isHost = true; G.online = false; NET.conns = [];
  for (const v of vehicles.values()) if (v.driver !== ME.id) { v.ctrl = 'local'; if (v.driver) v.driver = null; }
  for (const p of PEDS) { if (p.tx !== undefined) { p.x = p.tx; p.z = p.tz; } snapToNearestEdge(p); p.state = 'parked'; }
  $('#roomInfo').textContent = '혼자 플레이';
}
// tree regrowth (host)
function hostTrees(dt) {
  if ((G._treeT = (G._treeT || 0) - dt) > 0) return; G._treeT = 5;
  for (const t of TREES) if (!t.alive && t.cutAt && G.t - t.cutAt > 240) { if (nearestPlayerDist(t.x, t.z) < 25) continue; setTreeVisible(t, true); t.hp = 4; t.cutAt = 0; NET.send({ t: 'treeGrow', i: t.idx }); }
}
