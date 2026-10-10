
// ================= COMFORT: 끼임 탈출 · 중력 보정 · 쉬운 조작 =================
G.opt = { assist: true, autoRun: false, autoUnstick: true };
try { Object.assign(G.opt, JSON.parse(localStorage.getItem('sbc3d_opt') || '{}')); } catch (e) { }
const COMFORT = {
  px: 0, pz: 0, st: 0, vt: 0, ft: 0, hopT: 0, warned: false,
  save() { try { localStorage.setItem('sbc3d_opt', JSON.stringify(G.opt)); } catch (e) { } },
  freeSpot(x, z) {
    for (const r of [1, 1.6, 2.4, 3.4, 5, 7, 10, 14]) for (let k = 0; k < 16; k++) {
      const a = k / 16 * TAU, cx = x + Math.sin(a) * r, cz = z + Math.cos(a) * r, gy = groundHeight(cx, cz);
      if (terrainH(cx, cz) < LAND - 1.6) continue; const q = resolveCircle(cx, cz, 0.35, gy + 0.3, 1.8);
      if (Math.hypot(q.x - cx, q.z - cz) < 0.05) return { x: cx, z: cz };
    }
    return null;
  },
  fade() { const f = $('#dmgFlash'); if (!f) return; f.style.transition = 'none'; f.style.background = '#000'; f.style.opacity = 0.7; setTimeout(() => { f.style.transition = 'opacity .5s'; f.style.opacity = 0; setTimeout(() => f.style.background = '', 600); }, 120); },
  recoverVehicle(v) {
    if (!v || v.dead) return;
    const r = edgeNearPoint(v.x, v.z, 0, 70); let x = v.x, z = v.z, yaw = v.yaw;
    if (r) { const E = EDGES[r.e]; const a = NODES[E.a], b = NODES[E.b]; const dx = (b.x - a.x) / E.len, dz = (b.z - a.z) / E.len; x = a.x + dx * r.t + (-dz) * (E.w / 2 - 1.8); z = a.z + dz * r.t + dx * (E.w / 2 - 1.8); yaw = Math.atan2(dx, dz); }
    v.x = x; v.z = z; v.yaw = yaw; v.y = groundHeight(x, z) + 0.2; v.speed = 0; v.vy = 0; v.pitch = 0; v.roll = 0; v.waterT = 0; this.vt = this.ft = 0; this.fade(); toast('🛟 차량을 도로 위로 복구했다');
  },
  unstick(manual) {
    if (ME.jail || ME.dead) return;
    if (ME.vehicle) { if (ME.seat === 'd') this.recoverVehicle(ME.vehicle); return; }
    let x = ME.x, z = ME.z; const sp = this.freeSpot(x, z);
    if (sp && (manual || true)) { ME.x = sp.x; ME.z = sp.z; }
    ME.y = groundHeight(ME.x, ME.z) + 0.3; ME.vx = ME.vz = ME.vy = 0; ME.knockT = 0; this.st = 0; this.fade(); toast('🆘 끼임 탈출!'); sfx('ui');
  },
  assist(d, o) { // 사격 보정: 시선 근처의 적에게 살짝 끌려간다
    let best = null, ba = 0.11; const t = new THREE.Vector3();
    for (const p of PEDS) {
      if (p.state === 'dead' || p.state === 'parked' || p.state === 'knocked') continue; if (!(p.state === 'fight' || p.state === 'raid')) continue;
      t.set(p.x - o.x, p.y + 1.25 - o.y, p.z - o.z); const L = t.length(); if (L < 2 || L > 90) continue; t.divideScalar(L); const a = Math.acos(clamp(t.dot(d), -1, 1)); if (a < ba) { ba = a; best = t.clone(); }
    }
    if (best) d.lerp(best, 0.75).normalize();
  },
  tick(dt) {
    if (!G.started || !ME.char || UI.menuOpen || ME.jail || ME.dead) return;
    const v = ME.vehicle;
    if (v && ME.seat === 'd') {
      const mi = readMoveInput(); const want = Math.abs(mi.z) > 0.5;
      if (want && Math.abs(v.speed) < 0.5 && v.kind !== 'horse') this.vt += dt; else this.vt = Math.max(0, this.vt - dt * 2);
      if (this.vt > 3.2 && !this.warned) { this.warned = true; toast(IS_TOUCH ? '🚗 차가 끼였다 — 📱메뉴 ▶ 끼임 탈출' : '🚗 차가 끼였다 — U 키로 복구'); }
      if (this.vt <= 0.1) this.warned = false;
      if (G.opt.autoUnstick && this.vt > 6) this.recoverVehicle(v);
      if ((Math.abs(v.roll) > 1.25 || Math.abs(v.pitch) > 1.15) && v.kind === 'car') this.ft += dt; else this.ft = 0;
      if (G.opt.autoUnstick && this.ft > 2) this.recoverVehicle(v);
      return;
    }
    this.vt = this.ft = 0; if (v) return;
    if (ME.y < -45 && !ME.fly) { this.unstick(true); return; } // 맵 밖으로 추락
    if (ME.fly || ME.swim || ME.sitBench || ME.dance >= 0 || ME.knockT > 0) { this.px = ME.x; this.pz = ME.z; this.st = 0; return; }
    const mi = readMoveInput(); const mag = Math.hypot(mi.x, mi.z); const disp = Math.hypot(ME.x - this.px, ME.z - this.pz); this.px = ME.x; this.pz = ME.z;
    // 벽/물체 안에 박힘
    const q = resolveCircle(ME.x, ME.z, 0.35, ME.y, 1.8); if (Math.hypot(q.x - ME.x, q.z - ME.z) > 0.6 && G.opt.autoUnstick) { this.unstick(); return; }
    if (mag > 0.3 && disp < 3.5 * dt * 0.15) this.st += dt; else this.st = Math.max(0, this.st - dt * 2);
    if (this.st > 0.6 && ME.grounded && G.opt.autoUnstick) { ME.vy = 5.8; ME.grounded = false; this.st = 0.25; } // 자동 점프로 낮은 턱 넘기
    if (this.st > 5 && G.opt.autoUnstick) this.unstick();
  },
};
UI.openEasy = function () {
  const on = b => b ? 'ON' : 'OFF'; const R = () => UI.openEasy();
  UI.openMenu('🎯 쉬운 조작', '켜두면 편해져요', [
    { ic: '🎯', t: '사격 보정', p: on(G.opt.assist), d: '적 근처로 조준하면 알아서 맞춰줌', stay: true, fn: () => { G.opt.assist = !G.opt.assist; COMFORT.save(); return true; } },
    { ic: '🏃', t: '자동 달리기', p: on(G.opt.autoRun), d: '움직이면 계속 달림 (스태미나 소모)', stay: true, fn: () => { G.opt.autoRun = !G.opt.autoRun; COMFORT.save(); return true; } },
    { ic: '🛟', t: '자동 끼임 탈출', p: on(G.opt.autoUnstick), d: '끼이면 알아서 빼줌 · 뒤집힌 차 복구', stay: true, fn: () => { G.opt.autoUnstick = !G.opt.autoUnstick; COMFORT.save(); return true; } },
    { ic: '🆘', t: '지금 끼임 탈출', p: '', d: IS_TOUCH ? '' : 'U 키', fn: () => COMFORT.unstick(true) },
  ], { refresh: R });
};
