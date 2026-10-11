
// ================= 건물 실내 (모든 건물 입장 가능) =================
// 실내는 맵 밖 먼 곳(건물 id마다 고정 좌표)에 들어갈 때만 만들고, 나오면 바로 정리(dispose)한다.
// 좌표가 건물 id로 정해져 있어서 두 사람이 같은 건물에 들어가면 같은 자리에서 서로 보인다.
const PLOT_BLD = new Map();
function getBuilding(id) {
  if (id == null || id < 0) return null;
  if (id >= 5000) { const p = PLOTS[id - 5000]; if (!p || p.state !== 'done') return null; let b = PLOT_BLD.get(p.id); if (!b || b.design !== p.design) { b = plotBuilding(p); PLOT_BLD.set(p.id, b); } return b; }
  return BUILDINGS[id] || null;
}
function plotBuilding(p) {
  const fp = plotFootprint(p, p.design); const [sx, sz] = SIDE_VEC[p.side]; const fl = plotFloors(p);
  const kind = p.design === 'shop' ? 'mart' : p.design === 'tower' ? 'office' : 'home';
  const wx = p.x + sx * fp.hw, wz = p.z + sz * fp.hd;
  const top = p.y + ((CONSTR.get(p.id) && CONSTR.get(p.id).group) ? CONSTR.get(p.id).group.userData.H : fl * FLOOR_H);
  return { id: 5000 + p.id, plot: p, design: p.design, kind, name: (p.ownerName || '') + '의 ' + (BUILD_DESIGNS[p.design] ? BUILD_DESIGNS[p.design].name : '건물'), x: p.x, z: p.z, w: fp.hw * 2, d: fp.hd * 2, top, side: p.side, floors: fl, y0: p.y, door: { x: wx + sx * 1.4, z: wz + sz * 1.4, wx, wz, sx, sz } };
}
function anchorOf(o) { // 실내에 있는 사람은 건물 문 앞에 있는 것으로 취급 (NPC·지도·미니맵용)
  if (o === ME) { const I = INTERIOR.cur; return I ? { x: I.b.door.x, y: I.b.y0, z: I.b.door.z } : { x: ME.x, y: ME.y, z: ME.z }; }
  if (o && o.bi >= 0) { const b = getBuilding(o.bi); if (b) return { x: b.door.x, y: b.y0, z: b.door.z }; }
  return o;
}
function myBi() { return INTERIOR.cur ? INTERIOR.cur.b.id : -1; }
// 같은 공간 = 같은 건물(또는 둘 다 밖) + 실내라면 같은 층 (높이 차 3.6m 미만 — 다락은 같은 층으로 친다)
function sameSpace(rp) { const bi = rp.bi ?? -1; if (bi !== myBi()) return false; return bi < 0 || Math.abs((rp.y ?? ME.y) - ME.y) < 3.6; }
// 직사각형에서 구멍(직사각형들)을 뺀 나머지 조각들 (층 바닥판의 계단·승강로 구멍)
function rectMinus(r, holes) {
  let out = [r];
  for (const h of holes) {
    const nx = [];
    for (const a of out) {
      if (h.x1 <= a.x0 || h.x0 >= a.x1 || h.z1 <= a.z0 || h.z0 >= a.z1) { nx.push(a); continue; }
      const ix0 = Math.max(a.x0, h.x0), ix1 = Math.min(a.x1, h.x1);
      if (a.x0 < ix0) nx.push({ x0: a.x0, x1: ix0, z0: a.z0, z1: a.z1 });
      if (ix1 < a.x1) nx.push({ x0: ix1, x1: a.x1, z0: a.z0, z1: a.z1 });
      if (a.z0 < h.z0) nx.push({ x0: ix0, x1: ix1, z0: a.z0, z1: h.z0 });
      if (h.z1 < a.z1) nx.push({ x0: ix0, x1: ix1, z0: h.z1, z1: a.z1 });
    }
    out = nx;
  }
  return out.filter(q => q.x1 - q.x0 > 0.01 && q.z1 - q.z0 > 0.01);
}
// 플레이어 발밑 높이: 지형 + 실내 바닥/계단 + 올라설 수 있는 건물 옥상·물체 윗면
function floorAt(x, z, y) {
  let g = groundHeight(x, z, y + 0.5);
  const I = INTERIOR.cur;
  if (I && Math.abs(x - I.O.x) < 70 && Math.abs(z - I.O.z) < 70) {
    let best = -1e9;
    for (const p of I.plats) {
      if (x < p.x0 || x > p.x1 || z < p.z0 || z > p.z1) continue;
      const h = p.ramp ? lerp(p.y0, p.y1, clamp((z - p.z0) / (p.z1 - p.z0), 0, 1)) : p.y;
      if (h <= y + 0.7 && h > best) best = h;
    }
    g = best > -1e9 ? best : I.O.y; // 실내에서는 절대 바닥 아래로 떨어지지 않는다
  }
  const list = collidersNear(x, z, 0.4);
  for (const c of list) {
    if (c.circle || c.type === 'tree' || c.type === 'pole' || c.type === 'rock') continue;
    if (x < c.x0 || x > c.x1 || z < c.z0 || z > c.z1) continue;
    if (c.y1 <= y + 0.6 && c.y1 > g) g = c.y1;
  }
  return g;
}
const INTERIOR = {
  cur: null, roof: null, cool: 0, light: null,
  slot(b) { const i = b.id >= 5000 ? 1400 + (b.id - 5000) : b.id; return { x: 6200 + (i % 40) * 95, y: 60, z: -2200 + Math.floor(i / 40) * 95 }; },
  tall(b) { return (b.top - b.y0) > 13 && !['barn', 'factory', 'church', 'guard'].includes(b.kind); },
  canUse() { return !ME.dead && !ME.vehicle && !ME.jail && G.started; },
  enter(b, opts = {}) {
    if (!b || !this.canUse()) return;
    if (this.cur && this.cur.b === b) return;
    if (!opts.fromRoof && !JOBS.onEnter(b, opts)) return;
    if (this.cur) this.dispose();
    this.clearRoof();
    const topF = this.tall(b) ? this.floorsOf(b) - 1 : 0, f0 = opts.fromRoof ? topF : 0;
    const I = this.build(b, f0); this.cur = I; this.cool = G.t + 1.2; this.elevInit(I, f0);
    const sp = opts.fromRoof ? I.elev : I.spawn;
    ME.x = sp.x; ME.z = sp.z; ME.y = I.O.y + f0 * I.FH + 0.02; ME.vx = ME.vz = ME.vy = 0; ME.fallTop = null; ME.yaw = Math.PI; CAM.yaw = Math.PI; CAM.pitch = 0.12;
    ME.dance = -1; ME.sitBench = null;
    this.placeLight(I);
    sfx('door'); toast(`🚪 ${I.title} — 문으로 걸어 나가거나 E: 나가기`, 2600);
    NET.send({ t: 'chat', m: `🚪 ${ME.name}님이 ${I.title}에 들어갔다`, sys: 1, quiet: 1 });
  },
  exit(toRoof) {
    const I = this.cur; if (!I) return; const b = I.b;
    this.dispose(); this.cool = G.t + 1.2;
    if (toRoof) { this.toRoof(b); return; }
    const d = b.door; const lat = ((Math.abs(hashStr(ME.id)) % 3) - 1) * 0.9; ME.x = d.x + d.sx * 0.6 + d.sz * lat; ME.z = d.z + d.sz * 0.6 - d.sx * lat; ME.y = groundHeight(ME.x, ME.z) + 0.05; ME.vx = ME.vz = ME.vy = 0; ME.fallTop = null; // 둘이 같이 나와도 겹치지 않게 옆으로 살짝
    const r = resolveCircle(ME.x, ME.z, 0.35, ME.y, 1.8); ME.x = r.x; ME.z = r.z;
    ME.yaw = Math.atan2(d.sx, d.sz); CAM.yaw = ME.yaw; sfx('door');
  },
  toRoof(b) {
    const x = b.x, z = b.z; let y = b.top; // 실제 지붕 높이 = 건물 중심의 충돌 상자 꼭대기
    for (const c of collidersNear(x, z, 1)) if (!c.circle && (c.type === 'bld' || c.type === 'roof') && x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1 && c.y1 < b.top + 60 && c.y1 > y) y = c.y1;
    ME.x = x + 1.7; ME.z = z + 1.7; ME.y = y + 0.05; ME.vx = ME.vz = ME.vy = 0; ME.fallTop = null; ME.grounded = true;
    const g = new THREE.Group(); const mb = new MB();
    mb.box(x, y, z, 2.6, 2.7, 2.6, C(0x8a8e94)); mb.box(x, y + 2.7, z, 2.9, 0.2, 2.9, C(0x5a5e64)); mb.box(x, y, z + 1.31, 1.4, 2.2, 0.05, C(0x3a3e44));
    const m = new THREE.Mesh(mb.geo(), MAT.plain); m.castShadow = true; g.add(m);
    const s = textSprite('🛗 엘리베이터', '#9fe0ff'); s.position.set(x, y + 3.4, z); s.scale.multiplyScalar(1.3); g.add(s);
    scene.add(g); const col = addCollider(x - 1.3, z - 1.3, x + 1.3, z + 1.3, y + 2.9, 'int', null, y - 0.2);
    this.roof = { b, g, col, x, z, y };
    toast(`🏙️ 옥상 (${Math.round(y - b.y0)}m) — 떨어지면 크게 다친다! 엘리베이터에서 E로 내려가기`, 3500);
  },
  clearRoof() { const R = this.roof; if (!R) return; scene.remove(R.g); R.g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material !== MAT.plain) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }); removeCollider(R.col); this.roof = null; },
  placeLight(I) { if (this.light) { this.light.position.set(I.O.x, I.O.y + I.center * I.FH + I.H - 0.6, I.O.z); this.light.intensity = 40; this.light.distance = Math.max(I.W, I.D) * 1.6; } },
  // 계단·엘리베이터로 층이 바뀌면 그 층 ±1층으로 다시 만든다 (엘리베이터 상태는 유지)
  setFloor(f) { const I = this.cur; if (!I) return; const b = I.b; this.dispose(true); const N = this.build(b, f); this.cur = N; if (this.el) { this.el.I = N; N.plats.push(this.el.plat); this.elevSync(); } this.placeLight(N); },
  dispose(keepEl) {
    const I = this.cur; if (!I) return; this.cur = null;
    for (const k in I.dyn.doors) { const d = I.dyn.doors[k]; if (d.col) removeCollider(d.col); d.col = null; }
    if (!keepEl) this.elevDispose();
    scene.remove(I.group);
    I.group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && !o.material.userData.shared) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
    for (const c of I.cols) removeCollider(c);
    if (this.light) this.light.intensity = 0;
  },
  // 매 프레임: 문 자동 출입, 텔레포트로 실내를 벗어나면 정리
  update(dt) {
    if (!G.started) return;
    if (!this.light) { this.light = new THREE.PointLight(0xfff1d8, 0, 30, 1.2); scene.add(this.light); }
    const I = this.cur;
    if (I) {
      if (ME.dead || ME.jail || ME.vehicle || Math.abs(ME.x - I.O.x) > 120 || Math.abs(ME.z - I.O.z) > 120) { this.dispose(); return; }
      // 출구 쪽으로 걸어가면 자동으로 나간다
      if (G.t > this.cool && Math.abs(ME.x - I.exit.x) < 1.1 && ME.z > I.exit.z && ME.vz > 0.8 && Math.abs(ME.y - I.O.y) < 0.5) { this.exit(); return; }
      if (I.tall) { this.elevUpdate(dt); const C2 = this.cur; if (C2 && !this.inCar()) { const cf = this.floorOfY(C2, ME.y); if (cf !== C2.center) this.setFloor(cf); } }
      return;
    }
    if (this.roof) { const R = this.roof; if (Math.hypot(ME.x - R.x, ME.z - R.z) > 160 || ME.y < R.y - 30) this.clearRoof(); }
    // 바깥: 문으로 걸어 들어가면 자동 입장
    if (!this.canUse() || G.t < this.cool || ME.spd < 1.2) return;
    for (const b of buildingsNear(ME.x, ME.z)) {
      const d = b.door; const ex = ME.x - d.wx, ez = ME.z - d.wz; if (ex * ex + ez * ez > 2.2 * 2.2) continue;
      const lat = Math.abs(ex * d.sz - ez * d.sx); if (lat > 1.2) continue;
      if ((ME.vx * -d.sx + ME.vz * -d.sz) > 1 && Math.abs(ME.y - b.y0) < 1.5) { this.enter(b, { walk: 1 }); return; }
    }
  },
  nearDoor() {
    if (!this.canUse()) return null; let best = null, bd = 2.6;
    for (const b of buildingsNear(ME.x, ME.z)) { const d = Math.hypot(b.door.x - ME.x, b.door.z - ME.z); if (d < bd && Math.abs(ME.y - b.y0) < 2.5) { bd = d; best = b; } }
    for (const p of PLOTS) if (p.state === 'done') { const b = getBuilding(5000 + p.id); if (!b) continue; const d = Math.hypot(b.door.x - ME.x, b.door.z - ME.z); if (d < bd) { bd = d; best = b; } }
    return best ? { b: best, d: bd } : null;
  },
  // 상호작용 후보 (실내 물건 / 옥상 엘리베이터)
  interacts(cand) {
    const I = this.cur;
    if (I) {
      { const de = Math.hypot(ME.x - I.exit.x, ME.z - I.exit.z); if (de < 2.4 && Math.abs(ME.y - I.O.y) < 1.5) cand(de * 0.5 + 0.05, { label: '🚪 밖으로 나가기', key: 'E', fn: () => this.exit() }); }
      if (I.tall && this.el) this.elevInteracts(cand);
      for (const it of I.items) { const d = Math.hypot(ME.x - it.x, ME.z - it.z); if (d < (it.r || 1.8) && Math.abs(ME.y - (it.y ?? I.O.y)) < 1.6) cand(d * 0.5, { label: it.label, key: 'E', fn: it.fn }); }
      return;
    }
    const R = this.roof; if (R && Math.hypot(ME.x - R.x, ME.z - R.z) < 3 && Math.abs(ME.y - R.y) < 1.5) cand(0.3, { label: '🛗 엘리베이터 (1층으로 내려가기)', key: 'E', fn: () => this.enter(R.b, { fromRoof: true }) });
  },
  // ---------- 실내 생성 ----------
  build(b, center = 0) {
    const O = this.slot(b); const kind = b.kind; const fac = b.fac;
    const tall = this.tall(b); const NF = tall ? this.floorsOf(b) : 1; center = clamp(center | 0, 0, NF - 1);
    const lo = Math.max(0, center - 1), hi = Math.min(NF - 1, center + 1); // 지금 층 ±1층만 만든다 (15층 건물도 가볍게)
    const loft = ['house', 'apartment', 'villa', 'home', 'hotel'].includes(kind) && !tall;
    const big = ['church', 'factory', 'casino', 'pool', 'gym', 'dealer', 'barn'].includes(kind);
    const W = clamp(Math.round(b.w * 0.8), big ? 20 : 14, big ? 34 : 28), D = clamp(Math.round(b.d * 0.75), big ? 18 : 12, big ? 28 : 22);
    const H = loft ? 6.6 : (kind === 'church' || kind === 'factory' || kind === 'barn' || kind === 'casino') ? 8 : 4.2;
    const rnd2 = mulberry32(hashStr('int' + b.id));
    const R = (a, c) => a + (c - a) * rnd2(); const RP = (a) => a[Math.floor(rnd2() * a.length)];
    const mb = new MB(); const cols = []; const plats = []; const items = []; const group = new THREE.Group(); const extra = [];
    const X = (lx) => O.x + lx, Z = (lz) => O.z + lz;
    const FH = H + 0.4, LV = (k) => k * FH; // 층 높이 (바닥 슬래브 0.4 포함)
    const hw0 = W / 2, hd0 = D / 2;
    // 높은 건물: 오른쪽 벽 = 계단실(2줄 왕복 계단), 왼쪽 안쪽 모서리 = 엘리베이터 승강로
    const ST = tall ? { ax0: hw0 - 1.35, ax1: hw0 - 0.05, bx0: hw0 - 2.75, bx1: hw0 - 1.45, z0: -hd0 + 1.6, z1: -hd0 + 1.6 + Math.min(7.5, D - 4.6) } : null;
    const SH = tall ? { x0: -hw0, x1: -hw0 + 2.4, z0: -hd0, z1: -hd0 + 2.2, dx: -hw0 + 1.2 } : null;
    const reserved = tall ? [{ x0: ST.bx0 - 0.4, x1: hw0 + 1, z0: ST.z0 - 1.6, z1: ST.z1 + 1.6 }, { x0: -hw0 - 1, x1: SH.x1 + 0.5, z0: -hd0 - 1, z1: SH.z1 + 1.8 }] : [];
    const inRes = (lx, lz, w = 0, d = 0) => reserved.some(r => lx + w / 2 > r.x0 && lx - w / 2 < r.x1 && lz + d / 2 > r.z0 && lz - d / 2 < r.z1);
    let furn = false; // 가구 배치 중에는 계단실·승강로 자리를 피한다
    const box = (lx, ly, lz, w, h, d, col, solid, bo) => { if (furn && inRes(lx, lz, w, d)) return; mb.box(X(lx), O.y + ly, Z(lz), w, h, d, typeof col === 'number' ? C(col) : col, null, bo ? { bottom: true } : undefined); if (solid) cols.push(addCollider(X(lx) - w / 2, Z(lz) - d / 2, X(lx) + w / 2, Z(lz) + d / 2, O.y + ly + h, 'int', null, O.y + ly - 0.3)); };
    const cyl = (lx, ly, lz, r, h, col, seg = 12, r2) => mb.cyl(X(lx), O.y + ly, Z(lz), r, h, C(col), seg, r2 ?? r);
    const item = (lx, lz, label, fn, r = 1.8, ly = 0) => { if (furn && inRes(lx, lz)) { lx = 0; lz = hd0 - 3.2; } items.push({ x: X(lx), z: Z(lz), y: O.y + ly, label, fn, r }); };
    const T = this.theme(kind);
    // 바닥 · 벽 · 천장 (층마다)
    const wallT = 0.3, WH = H + 0.2;
    const full = { x0: -W / 2 - 0.3, x1: W / 2 + 0.3, z0: -D / 2 - 0.3, z1: D / 2 + 0.3 };
    const laneR = (L) => L === 'A' ? { x0: ST.ax0, x1: ST.ax1, z0: ST.z0, z1: ST.z1 } : { x0: ST.bx0, x1: ST.bx1, z0: ST.z0, z1: ST.z1 };
    const laneOf = (k) => k % 2 ? 'B' : 'A'; // k층에서 올라가는 계단 줄
    const holes = (k) => !tall || k === 0 ? [] : [{ x0: SH.x0 - 0.3, x1: SH.x1, z0: SH.z0 - 0.3, z1: SH.z1 }, laneR(laneOf(k - 1))];
    const slab = (k, asFloor) => { // k층 바닥판 (구멍 뚫린 곳 제외) = 아래층 천장
      for (const r of rectMinus(full, holes(k))) {
        const w = r.x1 - r.x0, d = r.z1 - r.z0, cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
        box(cx, LV(k) - 0.4, cz, w, 0.4, d, k === 0 ? T.floor : T.ceil, false, true);
        if (k > 0) { box(cx, LV(k) + 0.002, cz, w, 0.01, d, T.floor); cols.push(addCollider(X(r.x0), Z(r.z0), X(r.x1), Z(r.z1), O.y + LV(k), 'roof', null, O.y + LV(k) - 0.4)); }
        if (asFloor) plats.push({ x0: X(r.x0), x1: X(r.x1), z0: Z(r.z0), z1: Z(r.z1), y: O.y + LV(k) });
      }
    };
    for (let k = lo; k <= hi; k++) {
      const y = LV(k); slab(k, true);
      if (T.tiles) for (let i = -W / 2 + 1; i < W / 2; i += 2) box(i, y + 0.005, 0, 0.04, 0.01, D, T.tiles);
      box(0, y, -D / 2 - wallT / 2, W + wallT * 2, WH, wallT, T.wall, true);
      box(-W / 2 - wallT / 2, y, 0, wallT, WH, D, T.wall, true); box(W / 2 + wallT / 2, y, 0, wallT, WH, D, T.wall, true);
      if (k === 0) {
        box(-(W / 4 + 0.6), 0, D / 2 + wallT / 2, W / 2 - 1.2, WH, wallT, T.wall, true); box(W / 4 + 0.6, 0, D / 2 + wallT / 2, W / 2 - 1.2, WH, wallT, T.wall, true);
        box(0, 2.6, D / 2 + wallT / 2, 2.4, WH - 2.6, wallT, T.wall, true);
        box(0, 0, D / 2 + wallT + 0.4, 2.4, 2.6, 0.2, 0x111111, true); // 문 밖은 막혀 있음 (출구 표시)
        box(0, 2.62, D / 2 - 0.05, 1.4, 0.35, 0.1, 0x18c860); // 비상구 표시
      } else box(0, y, D / 2 + wallT / 2, W + wallT * 2, WH, wallT, T.wall, true);
      for (let i = -W / 2 + 0.05; i <= W / 2; i += W - 0.1) box(i, y, 0, 0.06, 0.18, D, T.trim); // 걸레받이
      box(0, y, -D / 2 + 0.02, W, 0.18, 0.06, T.trim);
      for (let lx = -W / 2 + 3; lx < W / 2 - 1; lx += 5) for (let lz = -D / 2 + 3; lz < D / 2 - 1; lz += 5) if (!tall || !inRes(lx, lz, 1.4, 0.6)) box(lx, y + H - 0.06, lz, 1.4, 0.05, 0.6, 0xfffbe8, false, true);
    }
    if (hi < NF - 1) slab(hi + 1, false); // 위층 바닥 = 천장
    else { box(0, LV(hi) + H, 0, W + 0.6, 0.25, D + 0.6, T.ceil, false, true); cols.push(addCollider(X(-W / 2), Z(-D / 2), X(W / 2), Z(D / 2), O.y + LV(hi) + H + 0.4, 'roof', null, O.y + LV(hi) + H)); }
    // 간판 (안쪽 벽)
    const title = fac ? fac.name : b.name;
    for (let k = lo; k <= hi; k++) { const sg = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(8, W * 0.4), 1.4), new THREE.MeshBasicMaterial({ map: makeSignTex(k ? `${k + 1}층` : title, k ? title : T.sub, T.sign) })); sg.position.set(X(tall ? 1 : 0), O.y + LV(k) + H - 1.1, Z(-D / 2 + 0.2)); group.add(sg); }
    // 종류별 가구
    const facItem = (lx, lz, label) => { if (fac) item(lx, lz, label || `${fac.icon} ${fac.name} 이용하기`, () => UI.openFacility(fac), 2.4); };
    const desk = (lx, lz, col = 0x8a6a4a, mon = true) => { box(lx, 0, lz, 1.6, 0.76, 0.8, col, true); if (mon) { box(lx, 0.76, lz - 0.2, 0.6, 0.42, 0.06, 0x111418); box(lx, 0.8, lz - 0.18, 0.54, 0.34, 0.02, 0x3a7ad8); } box(lx, 0, lz + 0.75, 0.5, 0.45, 0.5, 0x2a2a30); box(lx, 0.45, lz + 0.98, 0.5, 0.55, 0.06, 0x2a2a30); };
    const chair = (lx, lz, col = 0x6a4a2a, face = 1) => { box(lx, 0, lz, 0.45, 0.45, 0.45, col); box(lx, 0.45, lz + face * 0.2, 0.45, 0.5, 0.06, col); };
    const table4 = (lx, lz, col = 0xa07850, round = false) => { if (round) { cyl(lx, 0, lz, 0.08, 0.72, 0x444444, 6); cyl(lx, 0.72, lz, 0.55, 0.05, col, 14); cols.push(addCollider(X(lx) - 0.5, Z(lz) - 0.5, X(lx) + 0.5, Z(lz) + 0.5, O.y + 0.77, 'int', null, O.y - 0.3)); } else box(lx, 0, lz, 1.2, 0.75, 1.2, col, true); chair(lx - 0.95, lz, 0x5a3a22, 0); chair(lx + 0.95, lz, 0x5a3a22, 0); chair(lx, lz - 0.95, 0x5a3a22, -1); chair(lx, lz + 0.95, 0x5a3a22, 1); };
    const shelf = (lx, lz, len, ax = 'x', h = 1.9) => { const w = ax === 'x' ? len : 0.6, d = ax === 'x' ? 0.6 : len; box(lx, 0, lz, w, h, d, 0xd8d8d8, true); for (let k = 0.35; k < h; k += 0.45) { const n = Math.floor(len / 0.4); for (let i = 0; i < n; i++) { const o = -len / 2 + 0.2 + i * 0.4; box(lx + (ax === 'x' ? o : 0), k, lz + (ax === 'x' ? 0 : o), ax === 'x' ? 0.3 : 0.62, 0.32, ax === 'x' ? 0.62 : 0.3, C(RP([0xe84a3a, 0x3a8ae8, 0xf2c23a, 0x4ac86a, 0xf08a2a, 0xffffff, 0x9a5ae8]))); } } };
    const counter = (lx, lz, len, col = 0xb89a7a) => { box(lx, 0, lz, len, 1.05, 0.8, col, true); box(lx, 1.05, lz, len + 0.1, 0.06, 0.9, 0xe8e4dc); };
    const bed = (lx, lz, col = 0x5a7ab8, ly = 0) => { box(lx, ly, lz, 1.5, 0.45, 2.1, 0x6a4a2a, true); box(lx, ly + 0.45, lz, 1.45, 0.18, 2.0, 0xf4f0e8); box(lx, ly + 0.5, lz + 0.35, 1.47, 0.16, 1.3, col); box(lx, ly + 0.6, lz - 0.75, 1.2, 0.14, 0.4, 0xffffff); };
    const sofa = (lx, lz, col = 0x6a7a8a, ly = 0, len = 2.4) => { box(lx, ly, lz, len, 0.45, 0.9, col, true); box(lx, ly + 0.45, lz - 0.35, len, 0.5, 0.2, col); box(lx - len / 2 + 0.1, ly + 0.45, lz, 0.2, 0.25, 0.9, col); box(lx + len / 2 - 0.1, ly + 0.45, lz, 0.2, 0.25, 0.9, col); };
    const plant = (lx, lz) => { cyl(lx, 0, lz, 0.25, 0.45, 0x8a5a3a, 8, 0.2); box(lx, 0.45, lz, 0.6, 0.9, 0.6, 0x3a8a3a); };
    const bars = (x0, z0, x1, z1, h = 3) => { const len = Math.hypot(x1 - x0, z1 - z0); const n = Math.floor(len / 0.3); for (let i = 0; i <= n; i++) { const t = i / n; box(lerp(x0, x1, t), 0, lerp(z0, z1, t), 0.06, h, 0.06, 0x2a2c30); } cols.push(addCollider(X(Math.min(x0, x1)) - 0.12, Z(Math.min(z0, z1)) - 0.12, X(Math.max(x0, x1)) + 0.12, Z(Math.max(z0, z1)) + 0.12, O.y + h, 'int', null, O.y - 0.3)); };
    const hw = W / 2, hd = D / 2;
    if (lo === 0) { furn = true;
    switch (kind) {
      case 'police': case 'guard': {
        counter(0, -hd + 3.2, Math.min(8, W - 6), 0x30508f); facItem(0, -hd + 4.6, fac ? '🚓 민원실 (출소카드·수배 해제)' : undefined);
        for (let i = 0; i < 4; i++) desk(-hw + 3 + (i % 2) * 3.2, -1 + Math.floor(i / 2) * 3.4, 0x5a6270);
        box(-hw + 0.4, 0, hd - 4, 0.5, 2.0, 5, 0x6a7480, true); // 사물함
        bars(hw - 5, -hd + 0.2, hw - 5, -hd + 5); bars(hw - 5, -hd + 5, hw - 0.2, -hd + 5); bed(hw - 2.5, -hd + 1.6, 0x6a6a6a);
        box(0, 1.4, -hd + 0.18, 3, 1.4, 0.05, 0xf2efe6); for (let i = 0; i < 6; i++) box(-1.2 + (i % 3) * 1.2, 1.55 + Math.floor(i / 3) * 0.65, -hd + 0.21, 0.7, 0.5, 0.02, 0xd8c8a0);
        if (kind === 'guard') { for (let i = 0; i < 6; i++) box(-2 + (i % 3) * 1.3, 1.2 + Math.floor(i / 3) * 0.8, -hd + 0.22, 1.1, 0.65, 0.04, 0x2a6a4a); }
        box(-hw + 1.2, 0, -hd + 0.6, 0.06, 2.4, 0.06, 0xcccccc); box(-hw + 1.6, 1.7, -hd + 0.6, 0.8, 0.5, 0.02, 0x2a4a9a);
        break;
      }
      case 'hospital': {
        counter(-hw + 5, -hd + 2.6, 6, 0xf0f2f6); facItem(-hw + 5, -hd + 4, '🏥 원무과 (치료·구급상자)');
        box(0, 1.6, -hd + 0.2, 1.4, 0.4, 0.04, 0xe52a3a); box(0, 1.1, -hd + 0.2, 0.4, 1.4, 0.04, 0xe52a3a);
        const nb = Math.max(3, Math.floor((D - 4) / 2.8));
        for (let i = 0; i < nb; i++) { const z = -hd + 2 + i * 2.8; bed(hw - 1.4, z, 0x9ad0f0); box(hw - 2.9, 0, z + 1.35, 0.05, 2.2, 0.05, 0xcccccc); box(hw - 1.4, 2.1, z + 1.35, 2.6, 0.04, 0.04, 0xcccccc); box(hw - 1.4, 0.3, z + 1.38, 2.4, 1.8, 0.02, 0xbfe0f0); cyl(hw - 3.1, 0, z - 0.5, 0.03, 1.8, 0xbbbbbb, 6); box(hw - 3.1, 1.6, z - 0.5, 0.2, 0.3, 0.1, 0xddeeff); }
        for (let i = 0; i < 6; i++) chair(-hw + 2 + i * 0.8, hd - 3, 0x3a8ad8, 1);
        break;
      }
      case 'dealer': {
        box(0, 0, 0, W - 2, 0.02, D - 2, 0xf4f4f4);
        for (const [lx, col] of [[-hw / 2, 0xd02a2a], [hw / 2, 0x2a5ad0]]) { cyl(lx, 0, -1, 3, 0.25, 0x333333, 24); box(lx, 0.6, -1, 1.9, 0.7, 4.2, col, true); box(lx, 1.3, -1.3, 1.7, 0.6, 2.2, 0x223344); for (const [wx, wz] of [[-0.95, 0.5], [0.95, 0.5], [-0.95, -2.5], [0.95, -2.5]]) cyl(lx + wx, 0.25, -1 + wz + 1, 0.36, 0.3, 0x111111, 10); }
        desk(0, hd - 5, 0xeeeeee); facItem(0, hd - 3.6, '🚗 차량 구매 상담');
        break;
      }
      case 'factory': {
        box(0, 0.006, 0, W - 4, 0.01, 0.25, 0xf2c23a); box(0, 0.006, 3, W - 4, 0.01, 0.25, 0xf2c23a);
        box(0, 0, -2, W - 6, 1.0, 1.2, 0x3a3e44, true); for (let i = -hw + 4; i < hw - 3; i += 0.8) cyl(i, 1.0, -2, 0.12, 0.05, 0x888888, 6);
        for (let i = 0; i < 4; i++) { const x = -hw + 4 + i * (W - 8) / 3; box(x, 0, -hd + 3, 3, 2.8, 2.6, RP([0x4a7aa8, 0x8a9aa8, 0xc8a040]), true); box(x, 2.8, -hd + 3, 0.6, 1.2, 0.6, 0x555555); }
        for (let i = 0; i < 8; i++) box(-hw + 2 + (i % 4) * 1.3, Math.floor(i / 4) * 1.1, hd - 3, 1.1, 1.05, 1.1, 0xb08a5a, true);
        if (fac) facItem(hw - 3, hd - 3, '🏭 공장 사무실 (일하기)');
        break;
      }
      case 'school': case 'academy': {
        box(0, 1.0, -hd + 0.2, Math.min(8, W - 4), 1.6, 0.06, 0x2a5a3a); box(0, 0.95, -hd + 0.3, Math.min(8, W - 4), 0.06, 0.2, 0xb08a5a);
        desk(0, -hd + 2.4, 0x8a6a4a, false);
        for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const x = -hw + 2.5 + c * (W - 5) / 3, z = -hd + 5 + r * 2.4; box(x, 0, z, 1.1, 0.72, 0.6, 0xd8b88a, true); chair(x, z + 0.6, 0x3a5a8a, 1); }
        facItem(0, -hd + 4, kind === 'school' ? '🏫 교무실 (수업 듣기)' : '📚 학원 상담실 (수업 듣기)');
        break;
      }
      case 'food': case 'restaurant': case 'cafe': {
        const cafe = kind === 'cafe';
        counter(0, -hd + 2.2, Math.min(9, W - 4), cafe ? 0x5a3a2a : 0xc4552e); box(0, 1.1, -hd + 2.2, 0.6, 0.5, 0.4, 0x888888);
        box(0, 0, -hd + 0.6, W - 1, 0.9, 0.8, 0xc0c0c0, true); box(-2, 0.9, -hd + 0.6, 1.2, 0.05, 0.6, 0x222222);
        box(0, 1.9, -hd + 0.18, 3.6, 1.0, 0.04, 0x1a1a1a);
        for (let r = 0; r < Math.floor((D - 6) / 3); r++) for (let c = 0; c < Math.floor((W - 3) / 3.4); c++) table4(-hw + 2.4 + c * 3.4, -hd + 6 + r * 3, cafe ? 0xe8e0d0 : 0xa07850, cafe);
        if (cafe) { sofa(-hw + 1.6, hd - 2, 0x8a5a3a); plant(hw - 1, hd - 1.2); plant(-hw + 1, -hd + 4); }
        if (fac) facItem(0, -hd + 3.4);
        else item(0, -hd + 3.4, cafe ? '☕ 커피 주문 (₩4,500 · 스태미나 회복)' : '🍜 식사 주문 (₩9,000 · 체력 회복)', () => this.buy(cafe ? 4500 : 9000, cafe ? 'stamina' : 'hp'), 2.4);
        break;
      }
      case 'mart': {
        counter(-hw + 3, hd - 4, 3.2, 0xe8e8e8); box(-hw + 3, 1.1, hd - 4, 0.5, 0.35, 0.4, 0x222222);
        for (let i = 0; i < Math.floor((W - 6) / 2.6); i++) shelf(-hw + 6 + i * 2.6, -1, D - 9, 'z');
        box(0, 0, -hd + 0.5, W - 2, 2.1, 0.8, 0xdde8f0, true); for (let i = -hw + 1.5; i < hw - 1; i += 1.2) box(i, 0.2, -hd + 0.92, 1.0, 1.7, 0.02, 0x9fd8ff);
        item(-hw + 3, hd - 2.8, '🛒 계산대 (음료 ₩2,000 · 구급상자 ₩8,000)', () => this.martMenu(), 2.2);
        break;
      }
      case 'pcbang': {
        for (let r = 0; r < Math.floor((D - 4) / 2.6); r++) for (let c = 0; c < Math.floor((W - 2) / 1.8); c++) { const x = -hw + 1.6 + c * 1.8, z = -hd + 2 + r * 2.6; box(x, 0, z, 1.6, 0.74, 0.7, 0x1a1a22, true); box(x, 0.74, z - 0.15, 0.7, 0.45, 0.05, 0x111111); box(x, 0.78, z - 0.12, 0.64, 0.38, 0.02, RP([0x3a6aff, 0xff3a8a, 0x3aff9a])); box(x, 0, z + 0.7, 0.6, 0.5, 0.6, 0xc8202a); box(x, 0.5, z + 0.95, 0.6, 0.8, 0.1, 0xc8202a); }
        counter(hw - 3, hd - 2.5, 3, 0x3a2e5c); facItem(hw - 3, hd - 1.3, fac ? '🖥️ PC방 카운터' : undefined);
        break;
      }
      case 'gym': {
        box(0, 0.6, -hd + 0.18, W - 2, 2.2, 0.04, 0xcfe8f4);
        for (let i = 0; i < Math.floor((W - 4) / 2); i++) { const x = -hw + 2 + i * 2; box(x, 0, -hd + 2.2, 0.9, 0.25, 2, 0x222222, true); box(x, 0.25, -hd + 3.0, 0.8, 1.2, 0.08, 0x444444); box(x, 1.4, -hd + 3.0, 0.6, 0.3, 0.2, 0x111111); }
        for (let i = 0; i < 3; i++) { const x = -hw + 3 + i * 4; box(x, 0, 1.5, 0.5, 0.45, 1.4, 0x111111, true); box(x, 1.2, 1.5, 2.2, 0.05, 0.05, 0x999999); cyl(x - 1.0, 1.0, 1.5, 0.3, 0.12, 0x222222); cyl(x + 1.0, 1.0, 1.5, 0.3, 0.12, 0x222222); box(x - 0.5, 0, 1.5, 0.06, 1.3, 0.06, 0x999999); box(x + 0.5, 0, 1.5, 0.06, 1.3, 0.06, 0x999999); }
        box(hw - 1, 0, 0, 0.8, 1.2, 4, 0x333333, true); for (let i = 0; i < 6; i++) cyl(hw - 1, 1.2, -1.6 + i * 0.6, 0.12, 0.25, 0x888888, 8);
        facItem(0, hd - 3, fac ? '💪 헬스장 카운터 (운동하기)' : undefined);
        break;
      }
      case 'pool': {
        box(0, 0.003, -1, W - 6, 0.02, D - 9, 0x9ad8f0);
        { const p = new THREE.Mesh(new THREE.PlaneGeometry(W - 7, D - 10), MAT.poolWater); MAT.poolWater.userData.shared = true; p.rotation.x = -Math.PI / 2; p.position.set(X(0), O.y + 0.06, Z(-1)); group.add(p); }
        for (let i = 0; i < 5; i++) { box(-hw + 2 + i * 2.2, 0, hd - 2.2, 0.8, 0.35, 1.8, 0xffffff); box(-hw + 2 + i * 2.2, 0.35, hd - 1.5, 0.8, 0.4, 0.3, 0xffffff); }
        facItem(hw - 2.5, hd - 2.5, fac ? '🏊 수영장 카운터' : undefined);
        break;
      }
      case 'gun': {
        counter(0, -hd + 3.4, Math.min(7, W - 4), 0x3a2a1e); box(0, 1.1, -hd + 3.4, Math.min(7, W - 4), 0.4, 0.7, 0xbfe0f0);
        box(0, 0.8, -hd + 0.2, W - 2, 2.0, 0.06, 0x6a4a2e); for (let i = 0; i < Math.floor(W / 1.2) - 2; i++) { box(-hw + 1.6 + i * 1.2, 1.1 + (i % 3) * 0.5, -hd + 0.28, 0.9, 0.12, 0.06, 0x1a1a1a); }
        for (let i = 0; i < 3; i++) { box(-hw + 2 + i * 2.5, 0, hd - 6, 0.08, 1.1, 1.6, 0x555555, true); box(-hw + 2 + i * 2.5, 1.2, hd - 1, 0.6, 0.8, 0.04, 0xffffff); }
        facItem(0, -hd + 4.8, fac ? '🔫 총포사 카운터' : undefined);
        break;
      }
      case 'clothes': {
        for (let r = 0; r < 3; r++) { const z = -hd + 3 + r * (D - 6) / 2.5; box(-hw / 2, 1.5, z, W / 2.4, 0.05, 0.05, 0xaaaaaa); box(-hw / 2 - W / 4.8, 0, z, 0.06, 1.55, 0.06, 0xaaaaaa); box(-hw / 2 + W / 4.8, 0, z, 0.06, 1.55, 0.06, 0xaaaaaa); for (let i = 0; i < 9; i++) box(-hw / 2 - W / 5.5 + i * W / 22, 0.75, z, 0.08, 0.75, 0.55, C(RP([0xe84a7a, 0x4a8ae8, 0xf2f2f2, 0x222222, 0xf2c23a, 0x8a5ae8]))); }
        for (let i = 0; i < 3; i++) { const x = hw - 2 - i * 2; cyl(x, 0, -hd + 2, 0.25, 0.1, 0x222222); cyl(x, 0.1, -hd + 2, 0.05, 0.9, 0xcccccc, 6); box(x, 1.0, -hd + 2, 0.45, 0.65, 0.25, C(RP([0xe84a7a, 0x4a8ae8, 0xf2c23a]))); cyl(x, 1.65, -hd + 2, 0.12, 0.25, 0xf0d8c0, 8); }
        box(hw - 0.2, 0.3, 2, 0.06, 2, 1.2, 0xdff0ff); counter(hw - 3, hd - 3, 2.6, 0xf6e8f6);
        facItem(hw - 3, hd - 1.8, fac ? '👕 옷가게 계산대 (옷 갈아입기)' : undefined);
        break;
      }
      case 'casino': {
        box(0, 0.003, 0, W - 1, 0.01, D - 1, 0x8a1a2a);
        for (let i = 0; i < Math.floor((W - 4) / 1.3); i++) for (const z of [-hd + 1.2, -hd + 4.5]) { const x = -hw + 2 + i * 1.3; box(x, 0, z, 1.0, 1.6, 0.8, 0x2a1a08, true); box(x, 1.0, z + 0.41, 0.8, 0.5, 0.02, RP([0xffd34a, 0xff4a8a, 0x4affd3])); }
        for (let i = 0; i < 3; i++) { const x = -hw + 4 + i * (W - 8) / 2; cyl(x, 0, 2.5, 1.6, 0.85, 0x1a5a2a, 20); cyl(x, 0.85, 2.5, 0.5, 0.05, 0x8a5a2a, 16); cols.push(addCollider(X(x) - 1.5, Z(2.5) - 1.5, X(x) + 1.5, Z(2.5) + 1.5, O.y + 0.9, 'int', null, O.y - 0.3)); }
        facItem(0, hd - 3, fac ? '🎰 카지노 칩 교환소 (게임하기)' : undefined);
        break;
      }
      case 'bank': {
        box(0, 0.004, 0, W - 1, 0.01, D - 1, 0xe8e4dc);
        counter(0, -hd + 4, W - 4, 0x6a5a4a); for (let i = -hw + 2.5; i < hw - 2; i += 2.5) box(i, 1.1, -hd + 4, 0.05, 1.2, 0.8, 0xcfe8f4);
        { const vd = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.4, 28), new THREE.MeshBasicMaterial({ color: 0x8a8e94 })); vd.rotation.x = Math.PI / 2; vd.position.set(X(0), O.y + 1.7, Z(-hd + 0.3)); group.add(vd); box(0, 1.6, -hd + 0.55, 1.6, 0.2, 0.2, 0xd8c070); }
        for (let i = 0; i < 2; i++) { box(hw - 1, 0, hd - 4 - i * 1.6, 0.8, 1.7, 1.0, 0x2a4a6a, true); box(hw - 1.42, 1.0, hd - 4 - i * 1.6, 0.02, 0.4, 0.5, 0x6ad8ff); }
        for (let i = 0; i < 6; i++) chair(-hw + 2 + i * 0.8, hd - 3, 0x2a3a5a, 1);
        item(0, -hd + 5.2, '🏦 은행 창구 (잔액 확인)', () => toast(`🏦 잔액: ${fmtMoney(ME.money)} — 늘 감사합니다`), 2.4);
        item(hw - 1.8, hd - 4.8, '🏧 ATM (₩10,000 출금 연출)', () => { sfx('cash'); toast('🏧 지갑에 이미 돈이 있습니다 — 잔액 ' + fmtMoney(ME.money)); }, 1.6);
        break;
      }
      case 'church': {
        box(0, 0.004, 1, 2, 0.01, D - 4, 0xa8202a);
        for (let r = 0; r < Math.floor((D - 7) / 1.6); r++) for (const s of [-1, 1]) { const z = -hd + 6 + r * 1.6; box(s * (hw / 2 + 0.6), 0, z, hw - 2.4, 0.45, 0.5, 0x6a4026, true); box(s * (hw / 2 + 0.6), 0.45, z + 0.22, hw - 2.4, 0.5, 0.08, 0x6a4026); }
        box(0, 0, -hd + 3, 3, 0.4, 2, 0xd8d0c0, true); box(0, 0.4, -hd + 3, 1.8, 0.9, 0.7, 0xf2ecd8, true);
        box(0, 2.4, -hd + 0.25, 0.3, 3.4, 0.1, 0xd8c070); box(0, 3.4, -hd + 0.25, 1.6, 0.3, 0.1, 0xd8c070);
        for (const s of [-1, 1]) for (let i = 0; i < 3; i++) box(s * (hw - 0.05), 2.5, -hd + 4 + i * 4, 0.04, 3, 1.4, C(RP([0xd84a4a, 0x4a7ad8, 0xf2c23a, 0x4ac86a])));
        item(0, -hd + 5, '🙏 기도하기 (체력 회복)', () => { ME.hp = Math.min(100, ME.hp + 30); toast('🙏 마음이 편안해졌다 (+체력)'); }, 2);
        break;
      }
      case 'barn': {
        box(0, 0.004, 0, W - 1, 0.01, D - 1, 0x8a6a3a);
        for (let i = 0; i < 8; i++) box(-hw + 2 + (i % 4) * 1.6, Math.floor(i / 4) * 0.9, -hd + 2, 1.4, 0.88, 0.9, 0xd8b84a, true);
        for (let i = 0; i < 3; i++) { const x = -hw + 4 + i * 4; box(x, 0, hd - 4, 0.12, 1.3, 4, 0x6a4a2a, true); }
        box(hw - 4, 0, 0, 2.2, 1.6, 3.4, 0xc0302a, true); cyl(hw - 4, 0, 1.2, 0.8, 0.5, 0x111111);
        break;
      }
      case 'office': default: if (!loft) {
        if (kind === 'office' || kind === 'hotel') {
          counter(0, hd - 4.5, 4, 0x8a8a8a); plant(-2.8, hd - 4.5); plant(2.8, hd - 4.5);
          for (let r = 0; r < Math.floor((D - 8) / 3); r++) for (let c = 0; c < Math.floor((W - 4) / 3.2); c++) { const x = -hw + 2.4 + c * 3.2, z = -hd + 2 + r * 3; desk(x, z, 0xd8d4cc); box(x - 1.5, 0, z + 0.3, 0.06, 1.4, 2.2, 0x9aa4b0); }
          box(hw - 1.2, 0, hd - 2, 0.4, 1.2, 0.4, 0xcfe8f4);
        } else { sofa(0, 0); table4(0, -3); }
      }
    }
    if (loft) { // 집/아파트: 1층 거실·부엌 + 계단 + 2층 침실(다락)
      const LY = 3.2, lz0 = -hd, lz1 = -hd + D * 0.45;
      box(0, LY - 0.25, (lz0 + lz1) / 2, W, 0.25, lz1 - lz0, T.ceil); plats.push({ x0: X(-hw), x1: X(hw), z0: Z(lz0), z1: Z(lz1), y: O.y + LY });
      cols.push(addCollider(X(-hw), Z(lz1) - 0.06, X(hw - 1.4), Z(lz1) + 0.06, O.y + LY + 1.05, 'int', null, O.y + LY - 0.1)); // 난간
      for (let i = -hw + 0.2; i < hw - 1.4; i += 0.5) box(i, LY, lz1, 0.05, 1.0, 0.05, 0x8a6a4a); box((-hw + hw - 1.4) / 2, LY + 1.0, lz1, W - 1.4, 0.06, 0.08, 0x8a6a4a);
      // 계단 (오른쪽 벽을 따라 올라감)
      const sz0 = lz1, sz1 = lz1 + 4.8, sx = hw - 0.7; const n = 12;
      for (let i = 0; i < n; i++) { const z = sz1 - (i + 0.5) * (sz1 - sz0) / n; box(sx, 0, z, 1.3, (i + 1) * LY / n, (sz1 - sz0) / n + 0.01, 0xa07850); }
      plats.push({ ramp: true, x0: X(sx - 0.65), x1: X(sx + 0.65), z0: Z(sz0), z1: Z(sz1), y0: O.y + LY, y1: O.y });
      cols.push(addCollider(X(sx - 0.72), Z(sz0), X(sx - 0.62), Z(sz1), O.y + LY + 1, 'int', null, O.y + 1.2));
      // 1층 거실
      sofa(-hw / 3, hd - 3.2, C(RP([0x6a7a8a, 0x8a5a4a, 0x4a6a5a]))); box(-hw / 3, 0, hd - 5, 1.4, 0.4, 0.8, 0x6a4a2a, true);
      box(-hw / 3, 0.6, lz1 + 0.6, 2.4, 1.3, 0.1, 0x111111); box(-hw / 3, 0, lz1 + 0.6, 2.6, 0.55, 0.5, 0x3a2a1e, true);
      box(-hw / 3, 0.003, hd - 4.2, 3.2, 0.01, 2.6, C(RP([0xc8a07a, 0x8aa0c8, 0xc87a8a])));
      box(-hw + 0.5, 0, 1, 0.8, 0.9, 3.2, 0xe8e4dc, true); box(-hw + 0.5, 0.9, 1, 0.85, 0.05, 3.25, 0x333333); box(-hw + 0.5, 0, 3.2, 0.8, 1.9, 0.8, 0xf2f2f2, true);
      table4(0, 1.5, 0xc8a07a);
      plant(hw - 1.2, hd - 1.2);
      // 2층
      bed(-hw + 1.6, lz0 + 1.6, C(RP([0x5a7ab8, 0xb85a7a, 0x5ab88a])), LY); bed(-hw + 4, lz0 + 1.6, 0xd8c070, LY);
      box(hw - 3, LY, lz0 + 0.5, 1.6, 2.0, 0.6, 0x6a4a2a, true); box(0, LY, lz0 + 0.5, 2, 1.0, 0.6, 0x8a6a4a, true);
      item(-hw + 1.6, lz0 + 3.2, '🛏️ 침대에서 쉬기 (체력·스태미나 회복)', () => { ME.hp = 100; ME.stamina = 100; ME.drunk = 0; toast('😴 푹 쉬었다'); }, 1.8, LY);
      if (b.plot && b.plot.owner === ME.id) item(0, hd - 5, '📍 내 집을 스폰 지점으로', () => { ME.homePlot = b.plot.id; toast('📍 집이 스폰 지점이 되었다'); saveGame(); }, 1.6);
      if (fac) facItem(0, hd - 6);
    }
    furn = false; }
    // 높은 건물: 계단실 · 엘리베이터 승강로 · 위층 가구
    const dyn = { doors: {}, lo, hi };
    if (tall) {
      const zm = (ST.z0 + ST.z1) / 2, run = ST.z1 - ST.z0, n = 14;
      const top = LV(hi) + FH + 1;
      // 두 계단 줄 사이 칸막이 + 계단실 바깥벽 (끝은 열려 있어 드나들 수 있다)
      box(hw0 - 1.4, LV(lo), zm, 0.08, top - LV(lo), run, 0xd8d4cc, true); box(ST.bx0 - 0.08, LV(lo), zm, 0.12, top - LV(lo), run, 0xd8d4cc, true);
      for (let k = lo; k <= hi; k++) {
        const y = LV(k);
        if (k < NF - 1) { // k층 → k+1층 계단
          const L = laneOf(k), r = laneR(L), cx = (r.x0 + r.x1) / 2, up = L === 'A' ? -1 : 1; // A: +z 끝에서 -z 쪽으로 올라감, B: 반대
          for (let i = 0; i < n; i++) { const z = up < 0 ? ST.z1 - (i + 0.5) * run / n : ST.z0 + (i + 0.5) * run / n; box(cx, y, z, r.x1 - r.x0, (i + 1) * FH / n, run / n + 0.01, i % 2 ? 0x9a9690 : 0xa8a49e); }
          plats.push({ ramp: true, x0: X(r.x0), x1: X(r.x1), z0: Z(ST.z0), z1: Z(ST.z1), y0: O.y + (up < 0 ? LV(k + 1) : y), y1: O.y + (up < 0 ? y : LV(k + 1)) });
          const hz0 = up < 0 ? ST.z0 : zm, hz1 = up < 0 ? zm : ST.z1; // 계단 밑 (머리 닿는 쪽)은 막는다
          cols.push(addCollider(X(r.x0), Z(hz0), X(r.x1), Z(hz1), O.y + y + FH * 0.5, 'int', null, O.y + y - 0.3));
          const lowZ = up < 0 ? ST.z1 + 0.6 : ST.z0 - 0.6; box(cx, y + 0.01, lowZ, r.x1 - r.x0, 0.01, 0.5, 0xf2c23a); // 계단 시작 표시
        } else { // 꼭대기 층: 옥상 출입문
          const L = laneOf(k), r = laneR(L), cx = (r.x0 + r.x1) / 2, dz = L === 'A' ? ST.z1 - 0.2 : ST.z0 + 0.2;
          box(cx, y, dz, r.x1 - r.x0 - 0.1, 2.3, 0.12, 0x5a5e66, true); box(cx, y + 2.35, dz, 0.9, 0.25, 0.14, 0x18c860);
          item(cx, L === 'A' ? ST.z1 + 0.8 : ST.z0 - 0.8, '🚪 옥상으로 나가기 (계단)', () => this.exit(true), 1.4, y);
        }
        if (k > 0) { // 아래층 계단 구멍 앞 난간 (막힌 쪽 끝)
          const L = laneOf(k - 1), r = laneR(L), rz = L === 'A' ? ST.z1 : ST.z0;
          box((r.x0 + r.x1) / 2, y, rz, r.x1 - r.x0, 1.05, 0.08, 0x8a8e96, true);
        }
        // 엘리베이터 승강로 (층마다 문)
        box(SH.x1 + 0.06, y, (SH.z0 + SH.z1) / 2, 0.12, FH, SH.z1 - SH.z0, 0xb8bcc4, true);
        box((SH.x0 + SH.dx - 0.6) / 2, y, SH.z1 + 0.06, SH.dx - 0.6 - SH.x0, FH, 0.12, 0xb8bcc4, true);
        box((SH.dx + 0.6 + SH.x1 + 0.12) / 2, y, SH.z1 + 0.06, SH.x1 + 0.12 - SH.dx - 0.6, FH, 0.12, 0xb8bcc4, true);
        box(SH.dx, y + 2.4, SH.z1 + 0.06, 1.2, FH - 2.4, 0.12, 0xb8bcc4, true);
        box(SH.dx, y + 2.45, SH.z1 + 0.14, 0.7, 0.28, 0.04, 0x111418); // 층 표시창
        box(SH.dx + 0.95, y + 1.1, SH.z1 + 0.14, 0.16, 0.3, 0.04, 0xffd34a); // 호출 버튼
        { const fs = textSprite(`🛗 ${k + 1}층`, '#ffd34a'); fs.position.set(X(SH.dx), O.y + y + 2.95, Z(SH.z1 + 0.2)); fs.scale.multiplyScalar(0.7); group.add(fs); }
        const dm = new THREE.MeshBasicMaterial({ color: 0x9aa0aa }); const dl = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.4, 0.05), dm), dr = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.4, 0.05), dm);
        dl.position.set(X(SH.dx - 0.3), O.y + y + 1.2, Z(SH.z1 + 0.02)); dr.position.set(X(SH.dx + 0.3), O.y + y + 1.2, Z(SH.z1 + 0.02)); group.add(dl, dr);
        dyn.doors[k] = { dl, dr, x: X(SH.dx), y: O.y + y, col: null };
        if (k > 0) { // 위층: 사무실 / 객실 / 병실
          furn = true; const rr = mulberry32(hashStr('fl' + b.id + ':' + k));
          const style = ['hotel', 'apartment'].includes(kind) ? 'rooms' : kind === 'hospital' ? 'ward' : 'office';
          if (style === 'office') { for (let lz = -hd0 + 4.4; lz < hd0 - 2; lz += 3) for (let lx = -hw0 + 4; lx < hw0 - 3.5; lx += 3.2) { if (rr() < 0.15) continue; box(lx, y, lz, 1.6, 0.76, 0.8, 0xd8d4cc, true); box(lx, y + 0.76, lz - 0.2, 0.6, 0.42, 0.06, 0x111418); box(lx, y + 0.8, lz - 0.18, 0.54, 0.34, 0.02, 0x3a7ad8); box(lx, y, lz + 0.75, 0.5, 0.45, 0.5, 0x2a2a30); } }
          else if (style === 'ward') { for (let lx = -hw0 + 4; lx < hw0 - 4; lx += 2.6) for (const lz of [-hd0 + 1.6, hd0 - 1.8]) { box(lx, y, lz, 1.0, 0.55, 2.0, 0xe8eef2, true); box(lx, y + 0.55, lz, 0.95, 0.12, 1.9, 0x9ad0f0); } }
          else { for (let lx = -hw0 + 4.2; lx < hw0 - 4; lx += 3.4) { box(lx, y, -hd0 + 1.4, 1.5, 0.5, 2.1, 0x6a4a2a, true); box(lx, y + 0.5, -hd0 + 1.4, 1.45, 0.16, 2.0, C(rr() < 0.5 ? 0x5a7ab8 : 0xb85a7a)); box(lx + 1.7, y, -hd0 + 1.5, 0.08, 2.4, 2.6, 0xe8e0d0, true); } for (let lx = -hw0 + 4.5; lx < hw0 - 4; lx += 4.5) sofa(lx, hd0 - 2, C(0x6a7a8a), y); }
          box(-hw0 + 3.6, y, hd0 - 1, 0.6, 0.9, 0.6, 0x3a8a3a); box(hw0 - 4, y, hd0 - 0.8, 0.4, 1.2, 0.4, 0xcfe8f4);
          furn = false;
        }
      }
    }
    // 메쉬 (조명은 굽기: 위쪽 면은 밝고 옆·아래는 어둡게 → 라이트 없이도 실내 느낌, 저사양 폰도 가볍게)
    const g = mb.geo(); const nor = g.attributes.normal, col = g.attributes.color;
    for (let i = 0; i < col.count; i++) { const ny = nor.getY(i), nx = nor.getX(i), nz = nor.getZ(i); const f = ny > 0.5 ? 1.0 : ny < -0.5 ? 0.78 : 0.84 + nx * 0.06 + nz * 0.04; col.setXYZ(i, col.getX(i) * f * T.bright, col.getY(i) * f * T.bright, col.getZ(i) * f * T.bright); }
    const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true })); group.add(mesh);
    scene.add(group);
    const I = { b, O, W, D, H, FH, NF, center, lo, hi, tall, ST, SH, dyn, group, cols, plats, items: items.filter(Boolean), title, spawn: { x: X(0), z: Z(hd - 1.6) }, exit: { x: X(0), z: Z(hd - 0.7) }, elev: tall ? { x: X(SH.dx), z: Z(SH.z1 + 1.0) } : { x: X(0), z: Z(hd - 1.6) } };
    return I;
  },
  theme(kind) {
    const T = { floor: 0xb8b0a4, wall: 0xeae6de, ceil: 0xf4f2ee, trim: 0x6a5a4a, sign: '#2a3a5a', sub: '', tiles: null, bright: 1 };
    const set = (o) => Object.assign(T, o);
    switch (kind) {
      case 'police': case 'guard': set({ floor: 0x8a9098, wall: 0xc8d2e0, sign: '#1a2f6a', sub: 'POLICE', tiles: 0x7a8088 }); break;
      case 'hospital': set({ floor: 0xdfe6ea, wall: 0xf6f8fa, sign: '#c8202a', sub: 'HOSPITAL', tiles: 0xcfd6da, bright: 1.05 }); break;
      case 'dealer': set({ floor: 0xe8e8ec, wall: 0xf2f2f2, sign: '#1a1a1a', sub: 'MOTORS' }); break;
      case 'factory': set({ floor: 0x8a8a86, wall: 0xa8aeb4, ceil: 0x7a8088, sign: '#3a3e44', sub: 'FACTORY', bright: 0.95 }); break;
      case 'school': case 'academy': set({ floor: 0xc8a878, wall: 0xf2ecd8, sign: '#2a5a3a', sub: kind === 'school' ? 'SCHOOL' : 'ACADEMY', tiles: 0xb89868 }); break;
      case 'food': case 'restaurant': set({ floor: 0x9a6a4a, wall: 0xf4e0c0, sign: '#c4552e', sub: 'RESTAURANT', tiles: 0x8a5a3a }); break;
      case 'cafe': set({ floor: 0x8a6a4a, wall: 0xe8dcc8, sign: '#4a2a1a', sub: 'CAFE', tiles: 0x7a5a3a }); break;
      case 'mart': set({ floor: 0xe8e8e8, wall: 0xf8f8f8, sign: '#1a8a4a', sub: '24H MART', tiles: 0xd8d8d8, bright: 1.05 }); break;
      case 'pcbang': set({ floor: 0x2a2a34, wall: 0x3a3048, ceil: 0x222230, sign: '#5a2aa0', sub: 'PC ROOM', bright: 0.9 }); break;
      case 'gym': set({ floor: 0x2a2e34, wall: 0x6a7480, sign: '#2b2f38', sub: 'GYM', bright: 0.95 }); break;
      case 'pool': set({ floor: 0xe7f4fa, wall: 0xd0f0ff, sign: '#1a6a9a', sub: 'POOL', tiles: 0xc8e8f4 }); break;
      case 'gun': set({ floor: 0x5a4a3a, wall: 0x8a6a5a, sign: '#5a3a2a', sub: 'GUNS', bright: 0.95 }); break;
      case 'clothes': set({ floor: 0xf0eaf2, wall: 0xfaf4fa, sign: '#8a3a8a', sub: 'FASHION', bright: 1.05 }); break;
      case 'casino': set({ floor: 0x4a1a1a, wall: 0x3a2008, ceil: 0x2a1808, sign: '#3a2000', sub: 'CASINO', bright: 1.0 }); break;
      case 'bank': set({ floor: 0xd8d0c4, wall: 0xf0e8d8, sign: '#1a3a2a', sub: 'BANK', tiles: 0xc8c0b4 }); break;
      case 'church': set({ floor: 0xb8a890, wall: 0xf2ecdc, ceil: 0xe8e0cc, sign: '#5a3a1a', sub: 'CHURCH' }); break;
      case 'barn': set({ floor: 0x8a6a3a, wall: 0xa8322a, ceil: 0x6a4a2a, sign: '#5a2a1a', sub: 'FARM', bright: 0.95 }); break;
      case 'hotel': set({ floor: 0xc8b8a0, wall: 0xf6efe0, sign: '#8a6a2a', sub: 'HOTEL' }); break;
      case 'house': case 'villa': case 'home': case 'apartment': set({ floor: 0xb08a62, wall: 0xf6efe4, sign: '#6a4a2a', sub: 'HOME', tiles: 0x9a7a52 }); break;
      case 'office': set({ floor: 0x8a929a, wall: 0xeef0f2, sign: '#2a3a5a', sub: 'OFFICE' }); break;
    }
    return T;
  },
  buy(price, what) {
    if (ME.money < price) { toast('돈이 부족하다'); sfx('error'); return; }
    ME.money -= price; sfx('cash');
    if (what === 'hp') { ME.hp = Math.min(100, ME.hp + 40); toast('🍜 맛있게 먹었다 (+체력)'); } else { ME.stamina = 100; ME.drunk = Math.max(0, ME.drunk - 0.3); toast('☕ 커피 한 잔 (스태미나 회복)'); }
  },
  martMenu() {
    UI.openMenu('🛒 편의점', '24시간 영업', [
      { ic: '🥤', t: '음료', p: 2000, fn: () => { ME.inv.drink = (ME.inv.drink | 0) + 1; ME.stamina = 100; toast('🥤 음료 +1'); UI.updateInv && UI.updateInv(); } },
      { ic: '🍙', t: '삼각김밥', p: 1500, fn: () => { ME.inv.food = (ME.inv.food | 0) + 1; toast('🍙 음식 +1'); UI.updateInv && UI.updateInv(); } },
      { ic: '🩹', t: '구급상자', p: 8000, fn: () => { ME.inv.medkit = (ME.inv.medkit | 0) + 1; toast('🩹 구급상자 +1'); UI.updateInv && UI.updateInv(); } },
    ]);
  },
};
