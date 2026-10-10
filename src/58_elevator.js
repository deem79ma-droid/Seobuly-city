
// ================= 엘리베이터 (높은 건물) =================
// 승강로 안을 실제로 오르내리는 엘리베이터 칸 + 층마다 미닫이 문. 호출 버튼(E) → 문 열림 → 타서 층 버튼(E) → 문 닫힘 → 이동 → 도착 → 문 열림.
// 계단은 걸어서 오르내리고, 층이 바뀌면 그 층 ±1층을 다시 만든다. 옥상은 엘리베이터 '옥상' 버튼이나 꼭대기 층 옥상 출입문으로.
Object.assign(INTERIOR, {
  el: null,
  floorsOf(b) { return clamp(Math.round(b.floors || (b.top - b.y0) / FLOOR_H), 2, 30); },
  floorOfY(I, y) { return clamp(Math.floor((y - I.O.y + 0.8) / I.FH), 0, I.NF - 1); },
  elevInit(I, at) {
    this.elevDispose(); if (!I.tall) return;
    const { O, SH } = I; const X = (lx) => O.x + lx, Z = (lz) => O.z + lz;
    const w = SH.x1 - SH.x0, d = SH.z1 - SH.z0, cx = (SH.x0 + SH.x1) / 2, cz = (SH.z0 + SH.z1) / 2;
    const g = new THREE.Group(); g.position.set(X(cx), O.y, Z(cz)); const mb = new MB();
    mb.box(0, -0.14, 0, w - 0.1, 0.14, d - 0.1, C(0x5a5e66)); mb.box(0, 0.002, 0, w - 0.3, 0.01, d - 0.3, C(0x3a3e46));
    mb.box(0, 2.56, 0, w - 0.1, 0.1, d - 0.1, C(0xdfe3ea), null, { bottom: true }); mb.box(0, 2.5, 0, 1.0, 0.05, 0.6, C(0xfffbe8), null, { bottom: true });
    mb.box(0, 0, -d / 2 + 0.1, w - 0.2, 2.56, 0.06, C(0xc8ccd4)); mb.box(-w / 2 + 0.08, 0, 0, 0.06, 2.56, d - 0.2, C(0xbcc0c8)); mb.box(w / 2 - 0.08, 0, 0, 0.06, 2.56, d - 0.2, C(0xbcc0c8));
    mb.box(0, 0.95, -d / 2 + 0.17, w - 0.5, 0.05, 0.06, C(0x8a8e96)); mb.box(w / 2 - 0.14, 0.9, d / 2 - 0.45, 0.04, 0.6, 0.26, C(0x22262e));
    for (let i = 0; i < 6; i++) mb.box(w / 2 - 0.17, 1.0 + i * 0.08, d / 2 - 0.45, 0.02, 0.04, 0.06, C(0xffd34a));
    mb.box(0, 2.62, 0, w - 0.1, 0.4, d - 0.1, C(0x2a2c30)); // 지붕 (승강로에서 보이는 쪽)
    const g2 = mb.geo(); const car = new THREE.Mesh(g2, new THREE.MeshBasicMaterial({ vertexColors: true })); g.add(car);
    const dm = new THREE.MeshBasicMaterial({ color: 0xb0b6c0 }); const cl = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.4, 0.05), dm), cr = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.4, 0.05), dm); g.add(cl, cr);
    const bx = SH.dx - cx; cl.position.set(bx - 0.3, 1.2, d / 2 - 0.1); cr.position.set(bx + 0.3, 1.2, d / 2 - 0.1);
    const sign = textSprite('🛗', '#ffd34a'); sign.position.set(0, 2.25, -d / 2 + 0.2); sign.scale.multiplyScalar(0.5); g.add(sign);
    scene.add(g);
    const e = { I, g, cl, cr, bx, y: at * I.FH, at, target: null, phase: 'open', doors: 1, t: 4, v: 0, roof: false, dir: 0,
      plat: { x0: X(SH.x0 + 0.05), x1: X(SH.x1 - 0.05), z0: Z(SH.z0 + 0.05), z1: Z(SH.z1 - 0.05), y: O.y + at * I.FH },
      cols: [addCollider(X(SH.x0), Z(SH.z0), X(SH.x1), Z(SH.z0 + 0.12), 0, 'int', null, 0), addCollider(X(SH.x0), Z(SH.z0), X(SH.x0 + 0.12), Z(SH.z1), 0, 'int', null, 0), addCollider(X(SH.x1 - 0.12), Z(SH.z0), X(SH.x1), Z(SH.z1), 0, 'int', null, 0)], front: null };
    this.el = e; I.plats.push(e.plat); this.elevSync();
  },
  elevDispose() {
    const e = this.el; if (!e) return; this.el = null; scene.remove(e.g);
    e.g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
    for (const c of e.cols) removeCollider(c); if (e.front) removeCollider(e.front); const ch = $('#flChip'); if (ch) ch.style.display = 'none';
  },
  // 위치·문·충돌체를 상태에 맞춘다
  elevSync() {
    const e = this.el, I = this.cur; if (!e || !I) return; const O = I.O, SH = I.SH; const cy = O.y + e.y;
    e.g.position.y = cy; e.plat.y = cy; for (const c of e.cols) { c.y0 = cy - 0.2; c.y1 = cy + 2.7; }
    const op = e.doors; e.cl.position.x = e.bx - 0.3 - op * 0.55; e.cr.position.x = e.bx + 0.3 + op * 0.55;
    const carBlock = op < 0.75;
    if (carBlock && !e.front) e.front = addCollider(O.x + SH.dx - 0.6, O.z + SH.z1 - 0.2, O.x + SH.dx + 0.6, O.z + SH.z1 - 0.06, cy + 2.6, 'int', null, cy - 0.2);
    else if (!carBlock && e.front) { removeCollider(e.front); e.front = null; }
    if (e.front) { e.front.y0 = cy - 0.2; e.front.y1 = cy + 2.6; }
    for (const k in I.dyn.doors) {
      const D = I.dyn.doors[k]; const o = (+k === e.at) ? op : 0;
      D.dl.position.x = D.x - 0.3 - o * 0.55; D.dr.position.x = D.x + 0.3 + o * 0.55;
      const block = o < 0.75;
      if (block && !D.col) D.col = addCollider(D.x - 0.6, O.z + SH.z1 - 0.04, D.x + 0.6, O.z + SH.z1 + 0.16, D.y + 2.4, 'int', null, D.y - 0.3);
      else if (!block && D.col) { removeCollider(D.col); D.col = null; }
    }
  },
  inCar() {
    const e = this.el, I = this.cur; if (!e || !I) return false; const lx = ME.x - I.O.x, lz = ME.z - I.O.z, SH = I.SH;
    return lx > SH.x0 + 0.05 && lx < SH.x1 - 0.05 && lz > SH.z0 + 0.05 && lz < SH.z1 - 0.02 && Math.abs(ME.y - (I.O.y + e.y)) < 1.4;
  },
  inDoorway() {
    const e = this.el, I = this.cur; if (!e || !I || e.at < 0) return false; const lx = ME.x - I.O.x, lz = ME.z - I.O.z, SH = I.SH;
    return Math.abs(lx - SH.dx) < 0.75 && Math.abs(lz - SH.z1) < 0.45 && Math.abs(ME.y - (I.O.y + e.at * I.FH)) < 1.2;
  },
  call(k) {
    const e = this.el; if (!e) return;
    if (e.at === k && e.phase !== 'moving') { if (e.phase === 'idle' || e.phase === 'closing') e.phase = 'opening'; else e.t = Math.max(e.t, 5); return; }
    e.target = k; if (e.phase === 'idle') { e.phase = 'moving'; e.at = -1; } else if (e.phase === 'open' || e.phase === 'opening') { if (!this.inDoorway()) e.phase = 'closing'; }
  },
  elevUpdate(dt) {
    const e = this.el; let I = this.cur; if (!e || !I) return; const FH = I.FH;
    const riding = this.inCar();
    switch (e.phase) {
      case 'open': e.doors = Math.min(1, e.doors + dt * 1.6); e.t -= dt; if (!this.inDoorway() && (e.t <= 0 || (e.target != null && e.target !== e.at && e.t < 4))) e.phase = 'closing'; break;
      case 'opening': e.doors += dt * 1.6; if (e.doors >= 1) { e.doors = 1; e.phase = 'open'; e.t = 5; if (e.roof && riding && e.at === I.NF - 1) { e.roof = false; this.exit(true); return; } e.roof = false; } break;
      case 'closing': if (this.inDoorway()) { e.phase = 'opening'; break; } e.doors -= dt * 1.3; if (e.doors <= 0) { e.doors = 0; if (e.target != null && e.target !== e.at) { e.phase = 'moving'; e.at = -1; sfx('ui'); } else { e.phase = 'idle'; e.target = null; } } break;
      case 'idle': if (e.target != null && e.target !== e.at) { e.phase = 'moving'; e.at = -1; } break;
      case 'moving': {
        if (e.target == null) { e.target = clamp(Math.round(e.y / FH), 0, I.NF - 1); }
        const ty = e.target * FH, dy = ty - e.y, dir = Math.sign(dy); e.dir = dir;
        const stopD = e.v * e.v / (2 * 2.4);
        e.v = Math.abs(dy) <= stopD + 0.05 ? Math.max(0.7, e.v - 2.4 * dt) : Math.min(5, e.v + 2.4 * dt);
        const step = e.v * dt;
        if (Math.abs(dy) <= step) {
          e.y = ty; e.v = 0; e.at = e.target; e.target = null; e.phase = 'opening'; e.dir = 0; sfx('levelup');
          if (riding) { if (e.at !== I.center) { this.setFloor(e.at); I = this.cur; } toast(`🛗 ${e.at + 1}층${e.at === 0 ? ' — 로비' : ''}`, 1400); }
        } else e.y += dir * step;
        break;
      }
    }
    if (riding) { const cy = I.O.y + e.y; if (e.phase === 'moving' || (Math.abs(ME.y - cy) < 0.6 && ME.vy <= 0.01)) { ME.y = cy + 0.01; ME.vy = 0; ME.grounded = true; ME.fallTop = null; } }
    this.elevSync();
    // 층 표시
    let ch = $('#flChip'); if (!ch) { ch = document.createElement('div'); ch.id = 'flChip'; document.body.appendChild(ch); }
    const myF = this.floorOfY(I, ME.y); const carF = e.at >= 0 ? e.at + 1 : Math.floor(e.y / FH + 0.5) + 1;
    ch.style.display = 'block'; ch.textContent = `🏢 ${myF + 1}층 / ${I.NF}층 · 🛗 ${carF}층${e.phase === 'moving' ? (e.dir > 0 ? ' ▲' : ' ▼') : ''}`;
  },
  floorMenu() {
    const I = this.cur, e = this.el; if (!I || !e) return; const items = [];
    items.push({ ic: '🏙️', t: '옥상 (R)', d: `${Math.round(I.b.top - I.b.y0)}m · 꼭대기 층에서 옥상으로 나간다`, fn: () => { if (e.at === I.NF - 1 && e.phase !== 'moving') { this.exit(true); return; } e.roof = true; this.call(I.NF - 1); } });
    for (let k = I.NF - 1; k >= 0; k--) items.push({ ic: k === 0 ? '🚪' : '🔢', t: `${k + 1}층${k === 0 ? ' (로비 · 출구)' : ''}`, d: k === e.at ? '지금 이 층' : '', dis: k === e.at, disMsg: '지금 이 층이다', fn: () => { e.roof = false; this.call(k); sfx('ui'); } });
    UI.openMenu('🛗 엘리베이터', `${escHtml(I.title)} · ${I.NF}층 건물 — 가고 싶은 층을 누르세요`, items);
  },
  elevInteracts(cand) {
    const I = this.cur, e = this.el, SH = I.SH; const lx = ME.x - I.O.x, lz = ME.z - I.O.z;
    if (this.inCar()) { cand(0.1, { label: `🛗 층 버튼 누르기 (${e.at >= 0 ? '지금 ' + (e.at + 1) + '층' : '이동 중'})`, key: 'E', fn: () => this.floorMenu() }); return; }
    const k = this.floorOfY(I, ME.y); const dd = Math.hypot(lx - SH.dx, lz - (SH.z1 + 0.9));
    if (dd > 1.9 || Math.abs(ME.y - (I.O.y + k * I.FH)) > 1) return;
    if (e.at === k && e.doors > 0.5) cand(0.15, { label: '🛗 엘리베이터 타기 (층 선택)', key: 'E', fn: () => { ME.x = I.O.x + SH.dx; ME.z = I.O.z + SH.z1 - 0.7; /* 문 쪽을 보고 선다 → 카메라가 칸 안에 들어온다 */ ME.y = I.O.y + e.y + 0.01; ME.vx = ME.vz = ME.vy = 0; ME.yaw = 0; CAM.yaw = 0; e.t = Math.max(e.t, 3); this.floorMenu(); } });
    else cand(0.15, { label: `🛗 엘리베이터 호출 (지금 ${e.at >= 0 ? e.at + 1 + '층' : '이동 중'})`, key: 'E', fn: () => { this.call(k); toast('🛗 엘리베이터를 불렀다 — 문이 열리면 E로 타기', 1800); sfx('ui'); } });
  },
});
