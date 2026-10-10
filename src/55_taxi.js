
// ================= ROUTING: 도로 그래프 최단경로 (A*) =================
const ROUTE = {
  // 점에서 가장 가까운 도로 위 지점 (정확한 투영)
  nearestOnRoad(x, z, filter) {
    let best = null, bd = 1e9;
    for (const e of EDGES) {
      if (filter && !filter(e)) continue; const a = NODES[e.a], b = NODES[e.b]; const dx = (b.x - a.x) / e.len, dz = (b.z - a.z) / e.len;
      const t = clamp((x - a.x) * dx + (z - a.z) * dz, 0, e.len); const px = a.x + dx * t, pz = a.z + dz * t; const d = Math.hypot(px - x, pz - z);
      if (d < bd) { bd = d; best = { e: e.id, t, x: px, z: pz, d }; }
    }
    return best;
  },
  // A*: from/to = {e,t,x,z} (도로 위 지점) → 노드열 (최단 거리)
  astar(from, to) {
    const fE = EDGES[from.e], tE = EDGES[to.e];
    if (from.e === to.e) return { nodes: [], len: Math.abs(to.t - from.t) };
    const N = NODES.length; const g = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const heap = []; // [f, node]
    const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    const h = i => Math.hypot(NODES[i].x - to.x, NODES[i].z - to.z);
    const seed = (i, c) => { if (c < g[i]) { g[i] = c; prev[i] = -1; push(c + h(i), i); } };
    seed(fE.a, from.t); seed(fE.b, fE.len - from.t);
    let bestCost = Infinity, bestEnd = -1;
    while (heap.length) {
      const [f, i] = pop(); if (closed[i]) continue; closed[i] = 1; if (f >= bestCost) break;
      if (i === tE.a && g[i] + to.t < bestCost) { bestCost = g[i] + to.t; bestEnd = i; }
      if (i === tE.b && g[i] + tE.len - to.t < bestCost) { bestCost = g[i] + tE.len - to.t; bestEnd = i; }
      for (const eid of NODES[i].edges) {
        const E = EDGES[eid]; const j = E.a === i ? E.b : E.a; if (closed[j]) continue;
        const ng = g[i] + E.len; if (ng < g[j]) { g[j] = ng; prev[j] = i; push(ng + h(j), j); }
      }
    }
    if (bestEnd < 0) return null;
    const nodes = []; for (let i = bestEnd; i >= 0; i = prev[i]) nodes.push(i); nodes.reverse();
    return { nodes, len: bestCost };
  },
  edgeBetween(i, j) { for (const e of NODES[i].edges) { const E = EDGES[e]; if ((E.a === i && E.b === j) || (E.b === i && E.a === j)) return E; } return null; },
  // 실제 주행 경로: 오른쪽 차선 중앙선을 따라가는 폴리라인 (+ 구간별 제한속도)
  plan(x0, z0, x1, z1) {
    const ok = e => true;
    const from = this.nearestOnRoad(x0, z0, ok), to = this.nearestOnRoad(x1, z1, ok); if (!from || !to) return null;
    const r = this.astar(from, to); if (!r) return null;
    const raw = [{ x: from.x, z: from.z, E: EDGES[from.e] }];
    let lastNode = -1;
    for (let k = 0; k < r.nodes.length; k++) {
      const n = NODES[r.nodes[k]]; const E = k === 0 ? EDGES[from.e] : this.edgeBetween(r.nodes[k - 1], r.nodes[k]);
      raw[raw.length - 1].E = E || raw[raw.length - 1].E; raw.push({ x: n.x, z: n.z, E: null }); lastNode = r.nodes[k];
    }
    raw[raw.length - 1].E = EDGES[to.e]; raw.push({ x: to.x, z: to.z, E: EDGES[to.e] });
    const pts = []; for (const p of raw) { const q = pts[pts.length - 1]; if (q && Math.hypot(q.x - p.x, q.z - p.z) < 0.5) { if (p.E) q.E = p.E; continue; } pts.push(p); }
    if (pts.length < 2) pts.push({ x: to.x + 0.6, z: to.z + 0.6, E: EDGES[to.e] });
    // 오른쪽 차선으로 오프셋 (교차로는 두 구간 오프셋의 평균)
    const lane = E => (E ? E.w / 4 + 0.2 : 3);
    const seg = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; const L = Math.hypot(b.x - a.x, b.z - a.z) || 1; const dx = (b.x - a.x) / L, dz = (b.z - a.z) / L; const w = lane(a.E); seg.push({ dx, dz, ox: -dz * w, oz: dx * w, E: a.E }); }
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]; const s0 = seg[Math.max(0, i - 1)], s1 = seg[Math.min(seg.length - 1, i)];
      let ox = (s0.ox + s1.ox) / 2, oz = (s0.oz + s1.oz) / 2; if (i === 0) { ox = s1.ox; oz = s1.oz; } if (i === pts.length - 1) { ox = s0.ox; oz = s0.oz; }
      const E = s1.E; const sp = !E ? 12 : E.bridge ? 22 : E.region === 'disanbay' ? 18 : E.w >= 16 ? 15 : 13;
      out.push({ x: p.x + ox, z: p.z + oz, sp });
    }
    let s = 0; for (let i = 0; i < out.length; i++) { if (i) s += Math.hypot(out[i].x - out[i - 1].x, out[i].z - out[i - 1].z); out[i].s = s; }
    for (let i = 1; i < out.length - 1; i++) { const a = out[i - 1], b = out[i], c = out[i + 1]; out[i].turn = Math.abs(angDiff(Math.atan2(b.x - a.x, b.z - a.z), Math.atan2(c.x - b.x, c.z - b.z))); }
    return { pts: out, len: s, roadLen: r.len + from.d + to.d, end: { x: to.x, z: to.z } };
  },
  pointAt(P, s) {
    const pts = P.pts; if (s <= 0) return pts[0]; if (s >= P.len) return pts[pts.length - 1];
    let lo = 0, hi = pts.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m].s <= s) lo = m; else hi = m; }
    const a = pts[lo], b = pts[hi]; const k = (s - a.s) / ((b.s - a.s) || 1); return { x: lerp(a.x, b.x, k), z: lerp(a.z, b.z, k) };
  },
};

// ================= TAXI: 호출 → 실제 탑승 → AI 기사가 최단경로로 운전 → 요금 정산 =================
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const TAXI = {
  cab: null, phase: null, dest: null, route: null, seg: 0, fast: false, traveled: 0, waitT: 0, stuckT: 0, revT: 0, stuckN: 0, hudT: 0, reT: 0, lastX: 0, lastZ: 0, pickup: null, leaveT: 0, honkT: 0,
  BASE: 3000, PER_KM: 1200,
  fareFor(m) { return Math.round((this.BASE + m / 1000 * this.PER_KM) / 100) * 100; },
  makeCab(id, x, z, yaw, owner) {
    const v = new Vehicle(id, 'taxi', '#f0c020', x, z, yaw); v.taxiCab = true; v.taxiOwner = owner; v.driver = owner;
    v.npcDriver = new Character(randomOutfit(mulberry32(hashStr(id)), 'civ'), { shadow: false }); v.mesh.add(v.npcDriver.root); v.npcDriver.root.position.copy(v.seat); v.npcDriver.root.visible = true;
    v.mesh.visible = true; return v;
  },
  removeCab(v) { if (!v) return; if (ME.vehicle === v) { ME.vehicle = null; ME.seat = null; } v.remove(); },
  removeOwnedBy(id) { for (const v of [...vehicles.values()]) if (v.taxiCab && v.taxiOwner === id) this.removeCab(v); },
  // ---- 목적지 목록: 16개 구역 + 웨이포인트 + 집 ----
  destinations() {
    const L = DISTRICTS.map(d => ({ ic: d.id + '', name: `${d.id}구역 ${d.name}`, short: d.name, x: d.cx, z: d.cz, district: d.id }));
    if (UI.waypoint) L.unshift({ ic: '📍', name: '지도에 찍은 목적지', short: '웨이포인트', x: UI.waypoint.x, z: UI.waypoint.z });
    const hp = ME.homePlot != null && PLOTS[ME.homePlot]; if (hp && hp.state === 'done' && hp.owner === ME.id) L.unshift({ ic: '🏠', name: '우리 집', short: '집', x: hp.x, z: hp.z });
    return L;
  },
  openMenu() {
    if (ME.jail) { toast('수감 중에는 택시를 부를 수 없다'); return; }
    const inCab = this.cab && ME.vehicle === this.cab;
    const from = this.cab ? this.cab : ME; const here = districtAt(from.x, from.z);
    const items = this.destinations().map(d => {
      const P = ROUTE.plan(from.x, from.z, d.x, d.z); const km = P ? P.len / 1000 : 0; const same = d.district && d.district === here;
      return { ic: d.district ? '🚕' : d.ic, t: d.name, p: P ? fmtMoney(this.fareFor(P.len)) : '-', d: P ? `최단경로 ${km.toFixed(1)}km · 약 ${Math.max(1, Math.round(P.len / 13 / 60))}분${same ? ' · 현재 구역' : ''}` : '경로 없음', dis: !P, disMsg: '도로로 갈 수 없는 곳이다', fn: () => this.setDest(d) };
    });
    const extra = [];
    if (this.cab) extra.push({ ic: '❌', t: '택시 취소', p: '', d: inCab ? '지금까지 요금만 내고 하차' : '호출 취소', fn: () => this.cancel() });
    UI.openMenu(this.cab ? '🚕 택시 — 목적지 변경' : '🚕 택시 호출', `기본요금 ${fmtMoney(this.BASE)} + 1km당 ${fmtMoney(this.PER_KM)} · AI 기사님이 <b>최단경로</b>로 운전합니다<br><small style="opacity:.75">${this.cab ? '' : '목적지를 고르면 가까운 택시가 데리러 온다 · 길가의 노란 택시에 다가가 E로 바로 잡아도 된다'}</small>`, [...extra, ...items]);
  },
  setDest(d) {
    this.dest = { name: d.name, short: d.short, x: d.x, z: d.z };
    if (!this.cab) { this.call(); return; }
    if (ME.vehicle === this.cab) this.startRide();
    else { if (this.phase === 'leave') { this.phase = 'approach'; this.waitT = 0; this.goPickup(); } toast(`🚕 목적지: ${d.short} — 택시에 타면 출발`); }
  },
  // ---- 호출: 근처 도로에서 택시가 출발해 내 위치로 온다 ----
  call() {
    const r = edgeNearPoint(ME.x, ME.z, 70, 160, e => !e.bridge) || edgeNearPoint(ME.x, ME.z, 25, 320);
    let x, z, yaw;
    if (r) { const E = EDGES[r.e]; const a = NODES[E.a], b = NODES[E.b]; const dir = Math.random() < 0.5 ? 1 : -1; const dx = (b.x - a.x) / E.len * dir, dz = (b.z - a.z) / E.len * dir; const lane = E.w / 4 + 0.2; const px = a.x + (b.x - a.x) / E.len * r.t, pz = a.z + (b.z - a.z) / E.len * r.t; x = px - dz * lane; z = pz + dx * lane; yaw = Math.atan2(dx, dz); }
    else { const n = ROUTE.nearestOnRoad(ME.x, ME.z); x = n.x; z = n.z; yaw = 0; }
    this.cab = this.makeCab('TX_' + ME.id + '_' + Date.now().toString(36), x, z, yaw, ME.id); this.cab.ctrl = 'local';
    this.goPickup(); this.phase = 'approach'; this.waitT = 0;
    const eta = this.route ? Math.max(5, Math.round(this.route.len / 11)) : 10;
    toast(`🚕 택시 호출 완료! 약 ${eta}초 후 도착 (지도에 🚕 표시)`, 4000); sfx('ui');
  },
  goPickup() {
    const p = ROUTE.nearestOnRoad(ME.x, ME.z); this.pickup = p;
    this.setRoute(ROUTE.plan(this.cab.x, this.cab.z, p.x, p.z));
  },
  setRoute(P) { this.route = P; this.seg = 0; this.stuckT = 0; this.revT = 0; this.stuckN = 0; },
  // ---- 길에서 달리는 택시 잡기 ----
  hail(tv) {
    if (this.cab) this.dispose(true);
    const v = this.makeCab('TX_' + ME.id + '_' + Date.now().toString(36), tv.x, tv.z, tv.yaw, ME.id); v.ctrl = 'local'; v.speed = 0; this.cab = v;
    if (G.isHost) this.parkTraffic(tv); else { NET.send({ t: 'taxiHail', v: tv.id }); tv.mesh.visible = false; }
    this.phase = 'wait'; this.route = null; this.dest = null; sfx('horn', v.x, v.z, 0.5); this.board();
  },
  parkTraffic(tv) { if (!tv || !tv.isTraffic || !tv.ai) return; tv.ai.parked = true; tv.mesh.visible = false; if (tv.npcDriver) tv.npcDriver.root.visible = false; tv.x = 0; tv.z = -3000; tv.speed = 0; },
  board() {
    const v = this.cab; if (!v || ME.dead || ME.jail) return;
    ME.vehicle = v; ME.seat = 'p'; v.passenger = ME.id; ME.dance = -1; ME.sitBench = null; NET.send({ t: 'seat', v: v.id, s: 'p' }); sfx('door');
    CAM.yaw = v.yaw; CAM.lookT = 0;
    if (this.dest) this.startRide(); else { this.phase = 'wait'; v.speed = 0; toast('🚕 기사님: "어디로 모실까요?"', 3000); setTimeout(() => { if (ME.vehicle === v && !this.dest) this.openMenu(); }, 250); }
  },
  startRide() {
    const v = this.cab; const P = ROUTE.plan(v.x, v.z, this.dest.x, this.dest.z);
    if (!P) { toast('도로로 갈 수 없는 목적지다'); return; }
    this.setRoute(P); this.phase = 'ride'; this.traveled = this.traveled || 0; this.lastX = v.x; this.lastZ = v.z;
    toast(`🚕 ${this.dest.short}까지 ${(P.len / 1000).toFixed(1)}km — 출발합니다! (Shift: 빨리 · E: 내리기)`, 4000);
  },
  // E / F: 주행 중이면 세워서 내리기
  stopHere() { if (this.phase === 'ride') { this.phase = 'stopping'; toast('🚕 기사님: "여기서 세워 드릴게요"'); } else this.dropOff(false); },
  onExit(forced) { // 강제로 내렸을 때 (사망·체포 등)
    if (this.phase === 'ride' || this.phase === 'stopping') this.pay(true);
    this.phase = 'leave'; this.leaveT = 0; this.cab && (this.cab.passenger = null); this.dest = null; this.goAway();
  },
  pay(partial) {
    const fare = this.fareFor(this.traveled); const paid = Math.min(ME.money, fare); ME.money -= paid; sfx('cash');
    toast(`🧾 택시 요금 ${fmtMoney(paid)}${partial ? ' (중간 하차)' : ''} · ${(this.traveled / 1000).toFixed(1)}km`, 4000); this.traveled = 0; return paid;
  },
  dropOff(arrived) {
    const v = this.cab; if (!v) return;
    if (ME.vehicle === v) {
      if (this.phase === 'ride' || this.phase === 'stopping' || arrived) this.pay(!arrived);
      this._exiting = true; exitVehicle(true); this._exiting = false;
      if (arrived) announce('🚕 도착', this.dest ? this.dest.short : '');
    }
    v.passenger = null; this.phase = 'leave'; this.leaveT = 0; this.dest = null; this.goAway();
  },
  goAway() { const v = this.cab; if (!v) return; const r = edgeNearPoint(v.x, v.z, 180, 320); if (r) { const E = EDGES[r.e]; const a = NODES[E.a], b = NODES[E.b]; this.setRoute(ROUTE.plan(v.x, v.z, a.x + (b.x - a.x) / E.len * r.t, a.z + (b.z - a.z) / E.len * r.t)); } else this.route = null; },
  cancel() {
    if (!this.cab) return;
    if (ME.vehicle === this.cab) { if (Math.abs(this.cab.speed) > 3) { this.stopHere(); return; } this.dropOff(false); }
    else { toast('🚕 택시 호출 취소'); this.phase = 'leave'; this.leaveT = 0; this.dest = null; this.goAway(); }
  },
  dispose(silent) {
    const v = this.cab; if (!v) return; if (ME.vehicle === v) { this._exiting = true; exitVehicle(true); this._exiting = false; }
    NET.send({ t: 'taxiRm', id: v.id }); this.removeCab(v); this.cab = null; this.phase = null; this.route = null; this.dest = null; this.hud(false);
  },
  // ---- 네트워크: 상대가 부른 택시를 화면에 그대로 재현 ----
  onNet(m, f) {
    const s = m.s; if (!s || !f) return; let v = vehicles.get(s[0]);
    if (!v) v = this.makeCab(s[0], s[1], s[3], s[4], f);
    if (!v.taxiCab || v.taxiOwner !== f) return;
    v.ctrl = 'remote'; v.driver = f; v.applyState(s); v.mesh.visible = true;
  },
  onRemove(m, f) { const v = vehicles.get(m.id); if (v && v.taxiCab && v.taxiOwner === f) this.removeCab(v); },
  // ---- AI 기사: 경로 추종 (pure pursuit) + 코너 감속 + 장애물 정지 + 끼임 탈출 ----
  drive(dt) {
    const v = this.cab, P = this.route;
    if (!P || this.phase === 'wait' || this.phase === 'arrived') { v.drive(dt, { throttle: 0, steer: 0, brake: 1 }); return { remain: 0 }; }
    const pts = P.pts;
    let t = 0;
    for (;;) {
      const a = pts[this.seg], b = pts[this.seg + 1]; const L = (b.s - a.s) || 1; const dx = (b.x - a.x) / L, dz = (b.z - a.z) / L;
      t = ((v.x - a.x) * dx + (v.z - a.z) * dz) / L; if (t >= 1 && this.seg < pts.length - 2) { this.seg++; continue; } break;
    }
    const a = pts[this.seg], b = pts[this.seg + 1]; const s = a.s + clamp(t, 0, 1) * (b.s - a.s); const remain = P.len - s;
    // 경로에서 너무 벗어나면 재탐색
    const off = distSeg(v.x, v.z, a.x, a.z, b.x, b.z);
    if (off > 22 && (this.reT -= dt) <= 0) { this.reT = 2; const end = pts[pts.length - 1]; this.setRoute(ROUTE.plan(v.x, v.z, end.x, end.z)); return { remain }; }
    const fast = this.fast || KEYS['shift'] || KEYS['ShiftLeft'];
    const look = 6 + Math.abs(v.speed) * 0.45; const tgt = ROUTE.pointAt(P, s + look);
    const desired = Math.atan2(tgt.x - v.x, tgt.z - v.z); const ad = angDiff(v.yaw, desired);
    let steer = clamp(ad * 2.4, -1, 1);
    let want = a.sp * (fast ? 1.9 : 1);
    // 다가오는 코너 감속
    for (let k = this.seg + 1; k < pts.length - 1; k++) { const dC = pts[k].s - s; if (dC > 90) break; const tr = pts[k].turn || 0; if (tr > 0.35) { const vc = (tr > 1.2 ? 7 : 10) * (fast ? 1.25 : 1); want = Math.min(want, Math.sqrt(vc * vc + 2 * 5.5 * Math.max(0, dC - 3))); } }
    // 목적지 감속
    want = Math.min(want, Math.sqrt(2 * 4 * Math.max(0, remain - 2.5)) + (remain > 3 ? 1 : 0));
    if (this.phase === 'stopping') want = 0;
    want *= clamp(1 - Math.abs(ad) * 0.8, 0.3, 1);
    // 장애물 (차량·사람)
    const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw);
    const chk = (ox, oz, r) => { const dx = ox - v.x, dz = oz - v.z; const f = dx * fx + dz * fz; if (f < 0 || f > 16) return; const l = Math.abs(dx * fz - dz * fx); if (l < 1.5 + r) want = Math.min(want, Math.max(0, (f - 5.5) * 1.3)); };
    for (const o of vehicles.values()) if (o !== v && o.mesh.visible && Math.abs(o.x - v.x) < 18 && Math.abs(o.z - v.z) < 18) chk(o.x, o.z, 0.8);
    for (const q of PEDS) if (q.state !== 'parked' && q.state !== 'dead' && Math.abs(q.x - v.x) < 16 && Math.abs(q.z - v.z) < 16) chk(q.x, q.z, 0.3);
    for (const rp of G.players.values()) if (!rp.veh) chk(rp.x, rp.z, 0.3);
    if (ME.vehicle !== v && !ME.dead) chk(ME.x, ME.z, 0.3);
    // 끼임: 후진 → 그래도 안 되면 경로 위로 순간이동
    if (this.revT > 0) { this.revT -= dt; v.drive(dt, { throttle: -1, steer: -steer, brake: 0 }); return { remain }; }
    const thr = v.speed < want - 0.4 ? (want - v.speed > 4 ? 1 : 0.6) : 0; const brk = v.speed > want + 0.8;
    v.drive(dt, { throttle: thr, steer, brake: brk });
    if (Math.abs(v.speed) < 0.4 && want > 3) { this.stuckT += dt; if (this.stuckT > 2.5) { this.stuckT = 0; this.stuckN++; this.revT = 1.3; if (this.stuckN >= 3) { this.stuckN = 0; this.revT = 0; const p2 = ROUTE.pointAt(P, s + 14), p3 = ROUTE.pointAt(P, s + 18); v.x = p2.x; v.z = p2.z; v.yaw = Math.atan2(p3.x - p2.x, p3.z - p2.z); v.y = groundHeight(v.x, v.z) + 0.2; v.speed = 0; v.vy = 0; } } } else if (Math.abs(v.speed) > 1) this.stuckT = 0;
    return { remain };
  },
  update(dt) {
    const v = this.cab; if (!v) return;
    if (v.dead || !vehicles.has(v.id)) { if (ME.vehicle === v) { this._exiting = true; exitVehicle(true); this._exiting = false; toast('💥 택시가 부서졌다!'); } this.leaveT += dt; if (this.leaveT > 8 || !vehicles.has(v.id)) this.dispose(true); return; }
    v.ctrl = 'local'; v.driver = ME.id; if (v.hp < v.M.hp * 0.5 && !v.burnT) v.hp = v.M.hp * 0.5 + 1; // 기사님이 조심히 운전 (쉽게 안 터짐)
    const inCab = ME.vehicle === v;
    const r = this.drive(dt);
    if (inCab) { this.traveled += Math.hypot(v.x - this.lastX, v.z - this.lastZ) * (this.phase === 'ride' || this.phase === 'stopping' ? 1 : 0); ENG.set(true, clamp(Math.abs(v.speed) / v.M.max, 0, 1), 'car'); }
    this.lastX = v.x; this.lastZ = v.z;
    if (this.phase === 'approach') {
      this.waitT += dt;
      if (this.pickup && Math.hypot(ME.x - this.pickup.x, ME.z - this.pickup.z) > 35 && (this.reT -= dt) <= 0) { this.reT = 3; this.goPickup(); }
      if (r.remain < 3 && Math.abs(v.speed) < 0.8) { this.phase = 'wait'; this.waitT = 0; this.route = null; sfx('horn', v.x, v.z, 0.8); toast('🚕 택시 도착! 가까이 가서 E로 탑승', 4000); }
      if (this.waitT > 180) { toast('🚕 택시가 오지 못했다 — 다시 불러줘'); this.dispose(true); }
    } else if (this.phase === 'wait' && !inCab) {
      this.waitT += dt; if ((this.honkT -= dt) <= 0 && Math.hypot(ME.x - v.x, ME.z - v.z) < 60) { this.honkT = 12; sfx('horn', v.x, v.z, 0.4); }
      if (this.waitT > 120 || Math.hypot(ME.x - v.x, ME.z - v.z) > 400) { toast('🚕 택시가 기다리다 떠났다'); this.phase = 'leave'; this.leaveT = 0; this.goAway(); }
    } else if (this.phase === 'ride' && inCab) {
      if (r.remain < 3 && Math.abs(v.speed) < 0.6) this.dropOff(true);
    } else if (this.phase === 'stopping' && inCab) {
      if (Math.abs(v.speed) < 0.6) this.dropOff(false);
    } else if (this.phase === 'leave') {
      this.leaveT += dt; const d = Math.hypot(ME.x - v.x, ME.z - v.z);
      if (!this.route || r.remain < 4 || this.leaveT > 45 || (d > 220 && this.leaveT > 4)) this.dispose(true);
    }
    if ((this.hudT -= dt) <= 0) { this.hudT = 0.25; this.hud(true); }
  },
  hud(show) {
    const el = $('#taxiHud'); if (!el) return; const v = this.cab;
    if (!show || !v) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden'); const inCab = ME.vehicle === v; const P = this.route;
    let s = 0; if (P) { const a = P.pts[this.seg]; s = a ? a.s + Math.hypot(v.x - a.x, v.z - a.z) : 0; }
    const remain = P ? Math.max(0, P.len - s) : 0; const kmh = Math.round(Math.abs(v.speed) * 3.6);
    let html;
    if (this.phase === 'approach') html = `🚕 택시가 오는 중 · <b>${Math.round(Math.hypot(v.x - ME.x, v.z - ME.z))}m</b> 거리 <span class="tb2" data-a="cancel">❌ 취소</span>`;
    else if (this.phase === 'wait' && !inCab) html = `🚕 택시 대기 중 — 가까이 가서 <kbd>E</kbd> 탑승 <span class="tb2" data-a="cancel">❌ 취소</span>`;
    else if (inCab && (this.phase === 'ride' || this.phase === 'stopping')) html = `🚕 <b>${this.dest ? this.dest.short : ''}</b> · 남은 거리 <b>${(remain / 1000).toFixed(2)}km</b> · ${kmh}km/h · 요금 <b style="color:#7dff9a">${fmtMoney(this.fareFor(this.traveled))}</b><br><span class="tb2${this.fast ? ' on' : ''}" data-a="fast">⏩ 빨리 ${IS_TOUCH ? '' : '(Shift)'}</span><span class="tb2" data-a="dest">🗺️ 목적지 변경</span><span class="tb2" data-a="stop">🚪 내리기 ${IS_TOUCH ? '' : '(E)'}</span>`;
    else if (inCab) html = `🚕 기사님: "어디로 모실까요?" <span class="tb2" data-a="dest">🗺️ 목적지 고르기</span><span class="tb2" data-a="stop">🚪 내리기</span>`;
    else { el.classList.add('hidden'); return; }
    if (el._h !== html) { el._h = html; el.innerHTML = html; el.querySelectorAll('[data-a]').forEach(b => b.onclick = (e) => { e.stopPropagation(); AU.init(); sfx('ui'); const a = b.dataset.a; if (a === 'fast') { this.fast = !this.fast; this.hudT = 0; } else if (a === 'dest') this.openMenu(); else if (a === 'stop') this.stopHere(); else if (a === 'cancel') this.cancel(); }); }
  },
  // 미니맵/지도에 남은 경로
  drawRoute(x, toS) {
    if (!this.cab || !this.route || this.phase === 'leave') return; const P = this.route; const pts = P.pts;
    x.save(); x.strokeStyle = this.phase === 'approach' ? 'rgba(255,210,58,.75)' : 'rgba(255,210,58,.95)'; x.lineWidth = 5; x.lineJoin = 'round'; x.setLineDash([10, 7]); x.beginPath();
    const c = toS(this.cab.x, this.cab.z); x.moveTo(c[0], c[1]); for (let i = this.seg + 1; i < pts.length; i++) { const q = toS(pts[i].x, pts[i].z); x.lineTo(q[0], q[1]); } x.stroke(); x.restore();
  },
};
