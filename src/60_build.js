
// ================= CONSTRUCTION (건축 의뢰) =================
const BUILD_DESIGNS = {
  container: { name: '컨테이너 하우스', price: 8000, time: 40, desc: '싸고 빠르게. 휴식/스폰 가능', icon: '📦' },
  cottage: { name: '아담한 단독주택', price: 25000, time: 70, desc: '박공지붕 + 정원', icon: '🏡' },
  modern: { name: '2층 모던하우스', price: 60000, time: 100, desc: '통유리 2층 주택', icon: '🏠' },
  villa: { name: '수영장 빌라', price: 120000, time: 140, desc: '야외 수영장 포함 고급 빌라', icon: '🏖️' },
  shop: { name: '상가 건물', price: 150000, time: 160, desc: '임대 수익 분당 ₩500', icon: '🏪', income: 500 },
  tower: { name: '펜트하우스 타워', price: 450000, time: 240, desc: '18층 유리 타워 · 분당 ₩1,500', icon: '🏙️', income: 1500 },
};
const CONSTR = new Map(); // plot id -> visual state
function designGroup(p, design, ownerName) {
  const g = new THREE.Group(); const w = p.w - 4, d = p.d - 4; const y0 = p.y - 0.1; const mbs = {};
  const mb = (k) => mbs[k] || (mbs[k] = new MB());
  const [sx, sz] = SIDE_VEC[p.side]; let H = 6;
  const front = (ox = 0) => ({ x: p.x + sx * (Math.abs(sx) ? w / 2 : 0), z: p.z + sz * (Math.abs(sz) ? d / 2 : 0) });
  switch (design) {
    case 'container': {
      const cw = Math.min(12, w * 0.6), cd = 2.5; mb('metal').box(p.x, y0, p.z, cw, 2.7, cd, C(0x2f6fa8), BAY.metal); mb('metal').box(p.x + 1, y0 + 2.7, p.z + 0.2, cw * 0.7, 2.7, cd, C(0xc8462a), BAY.metal);
      mb('plain').box(p.x + sx * 0.1, y0, p.z + sz * (cd / 2 + 0.03), 1, 2.1, 0.06, C(0x333333)); H = 5.4; break;
    }
    case 'cottage': {
      const hw = Math.min(14, w * 0.6), hd = Math.min(11, d * 0.55); mb('plain').box(p.x, y0 - 1, p.z, hw + 0.4, 1.4, hd + 0.4, C(0x8a8580));
      mb('house').box(p.x, y0 + 0.4, p.z, hw, 3.4, hd, C(0xfff2dc), BAY.house, { noTop: true }); mb('roof').gable(p.x, y0 + 3.8, p.z, hw + 1.2, hd + 1.2, 3.2, C(0x8a3a2a), hw > hd ? 'x' : 'z');
      mb('plain').box(p.x + sx * (hw / 2 + 0.01), y0 + 0.4, p.z + sz * (hd / 2 + 0.01), sx ? 0.08 : 1.2, 2.2, sz ? 0.08 : 1.2, C(0x6a4026)); mb('plain').box(p.x + hw * 0.3, y0 + 4, p.z - hd * 0.2, 0.8, 3, 0.8, C(0x7a5a4a));
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; mb('plain').box(p.x + Math.sin(a) * w * 0.42, y0, p.z + Math.cos(a) * d * 0.42, 1.2, 0.8, 1.2, C(0x3a7a2a)); }
      H = 7; break;
    }
    case 'modern': {
      const hw = Math.min(18, w * 0.7), hd = Math.min(14, d * 0.6);
      mb('plain').box(p.x, y0, p.z, hw, 3.4, hd, C(0xf4f4f2)); mb('glass').box(p.x, y0 + 0.4, p.z + hd / 2 - 0.3, hw * 0.8, 2.6, 0.7, C(0xbfe0f0), BAY.glass);
      mb('plain').box(p.x - hw * 0.12, y0 + 3.4, p.z - hd * 0.05, hw * 0.85, 3.3, hd * 0.9, C(0x3a3e44)); mb('glass').box(p.x - hw * 0.12, y0 + 3.8, p.z - hd * 0.05, hw * 0.86, 2.2, hd * 0.91, C(0xc8e8f8), BAY.glass, { noTop: true });
      mb('plain').box(p.x - hw * 0.12, y0 + 6.7, p.z - hd * 0.05, hw * 0.92, 0.3, hd * 0.96, C(0xeeeeee)); mb('wood').box(p.x + hw * 0.35, y0 + 3.4, p.z + hd * 0.3, hw * 0.3, 0.15, hd * 0.4, C(0x8a5a3a)); H = 7; break;
    }
    case 'villa': {
      const hw = Math.min(22, w * 0.7), hd = Math.min(16, d * 0.55);
      mb('plain').box(p.x - hw * 0.15, y0, p.z - hd * 0.15, hw * 0.7, 4, hd * 0.7, C(0xfbfaf6)); mb('glass').box(p.x - hw * 0.15, y0 + 0.5, p.z - hd * 0.15, hw * 0.72, 3, hd * 0.72, C(0xc8e8f8), BAY.glass, { noTop: true });
      mb('plain').box(p.x - hw * 0.15, y0 + 3.6, p.z - hd * 0.15, hw * 0.8, 0.4, hd * 0.8, C(0xfbfaf6)); mb('plain').box(p.x + hw * 0.05, y0 + 4, p.z - hd * 0.25, hw * 0.45, 3.4, hd * 0.45, C(0xfbfaf6));
      mb('glass').box(p.x + hw * 0.05, y0 + 4.5, p.z - hd * 0.25, hw * 0.46, 2.2, hd * 0.46, C(0xc8e8f8), BAY.glass, { noTop: true });
      mb('plain').box(p.x + hw * 0.3, y0, p.z + hd * 0.35, hw * 0.4, 0.4, hd * 0.35, C(0xdde6ea));
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(hw * 0.34, hd * 0.28), MAT.poolWater); pool.rotation.x = -Math.PI / 2; pool.position.set(p.x + hw * 0.3, y0 + 0.42, p.z + hd * 0.35); g.add(pool);
      H = 7.5; break;
    }
    case 'shop': {
      const hw = Math.min(30, w * 0.85), hd = Math.min(22, d * 0.75); mb('shop').box(p.x, y0, p.z, hw + 0.4, 4.4, hd + 0.4, C(0xffffff), BAY.shop, { noTop: true });
      mb('office').box(p.x, y0 + 4.4, p.z, hw, 8, hd, C(0xe8dcc8), BAY.office, { topCol: C(0x777777) }); mb('plain').box(p.x, y0 + 12.4, p.z, hw + 0.6, 0.6, hd + 0.6, C(0x8a8070));
      const s = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(14, hw * 0.7), 2.4), new THREE.MeshBasicMaterial({ map: makeSignTex((ownerName || '') + ' 상가', 'SHOPPING', '#9a2a2a') }));
      s.position.set(p.x + sx * (hw / 2 + 0.25), y0 + 5.6, p.z + sz * (hd / 2 + 0.25)); s.rotation.y = SIDE_YAW[p.side]; g.add(s); H = 13; break;
    }
    case 'tower': {
      const hw = Math.min(24, w * 0.7), hd = Math.min(24, d * 0.7); mb('office').box(p.x, y0, p.z, hw + 4, 8, hd + 4, C(0xd8d4cc), BAY.office);
      mb('glass').box(p.x, y0 + 8, p.z, hw, 58, hd, C(0x9fc0e0), BAY.glass, { topCol: C(0x444444) }); mb('plain').box(p.x, y0 + 66, p.z, hw * 0.7, 4, hd * 0.7, C(0x333a44));
      mb('plain').box(p.x, y0 + 70, p.z, hw * 0.55, 0.3, hd * 0.55, C(0x222222)); mb('plain').box(p.x, y0 + 70.3, p.z, 0.4, 8, 0.4, C(0xcccccc));
      const s = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5), new THREE.MeshBasicMaterial({ map: makeSignTex((ownerName || '') + ' TOWER', 'PENTHOUSE', '#1a2a4a') }));
      s.position.set(p.x + sx * (hw / 2 + 2.3), y0 + 6, p.z + sz * (hd / 2 + 2.3)); s.rotation.y = SIDE_YAW[p.side]; g.add(s); H = 78; break;
    }
  }
  if (!MAT.wood) MAT.wood = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
  const mats = [];
  for (const k in mbs) { const mat = MAT[k].clone(); mats.push(mat); const m = new THREE.Mesh(mbs[k].geo(), mat); m.castShadow = true; m.receiveShadow = true; g.add(m); }
  g.userData.mats = mats; g.userData.H = H; g.userData.y0 = y0;
  return g;
}
function plotFootprint(p, design) {
  const w = p.w - 4, d = p.d - 4;
  const f = { container: [12, 3], cottage: [14, 11], modern: [18, 14], villa: [22, 16], shop: [30, 22], tower: [28, 28] }[design] || [10, 10];
  return { hw: Math.min(f[0], w * 0.85) / 2, hd: Math.min(f[1], d * 0.75) / 2 };
}
function syncPlotVisual(p) {
  let V = CONSTR.get(p.id); if (!V) { V = { id: p.id }; CONSTR.set(p.id, V); }
  // sign
  const signText = p.state === 'empty' ? ['매물', fmtMoney(p.price) + ' · ' + REGIONS[p.region].name, '#0f6a3a'] : p.state === 'owned' ? [p.ownerName + '의 땅', '건축 의뢰 가능', '#2a4a8a'] : p.state === 'building' ? ['공사중', (BUILD_DESIGNS[p.design]?.name || '') + ' · ' + p.ownerName, '#c87a10'] : [p.ownerName, BUILD_DESIGNS[p.design]?.name || '', '#3a3a3a'];
  const key = signText.join('|'); if (V.signKey !== key) { V.signKey = key; p.sign.material.map.dispose(); p.sign.material.map = makeSignTex(signText[0], signText[1], signText[2]); p.sign.material.needsUpdate = true; }
  if ((p.state === 'building' || p.state === 'done') && (!V.group || V.design !== p.design)) {
    if (V.group) scene.remove(V.group); V.group = designGroup(p, p.design, p.ownerName); V.design = p.design; scene.add(V.group);
    V.clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0); for (const m of V.group.userData.mats) { m.clippingPlanes = [V.clip]; m.clipShadows = true; }
  }
  if (p.state === 'building' && !V.site) {
    const site = V.site = new THREE.Group(); scene.add(site);
    const fm = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.7 }); const fo = new THREE.MeshStandardMaterial({ color: 0xff8a1a, roughness: 0.7 });
    const hw = p.w / 2 - 0.5, hd = p.d / 2 - 0.5;
    for (const [x0, z0, x1, z1] of [[-hw, -hd, hw, -hd], [-hw, hd, hw, hd], [-hw, -hd, -hw, hd], [hw, -hd, hw, hd]]) { const len = Math.hypot(x1 - x0, z1 - z0); const b = new THREE.Mesh(new THREE.BoxGeometry(x0 === x1 ? 0.1 : len, 1.8, x0 === x1 ? len : 0.1), fm); b.position.set(p.x + (x0 + x1) / 2, p.y + 0.9, p.z + (z0 + z1) / 2); site.add(b); const st = new THREE.Mesh(new THREE.BoxGeometry(x0 === x1 ? 0.12 : len, 0.25, x0 === x1 ? len : 0.12), fo); st.position.copy(b.position); st.position.y += 0.6; site.add(st); }
    // crane
    const crane = new THREE.Group(); const cm = new THREE.MeshStandardMaterial({ color: 0xf2c20a, roughness: 0.5, metalness: 0.3 });
    const H = Math.max(20, (V.group?.userData.H || 10) + 12); const mast = new THREE.Mesh(new THREE.BoxGeometry(1.2, H, 1.2), cm); mast.position.y = H / 2; crane.add(mast);
    const jib = new THREE.Group(); jib.position.y = H; crane.add(jib); const arm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 26), cm); arm.position.z = 8; jib.add(arm);
    const cw = new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 2), new THREE.MeshStandardMaterial({ color: 0x555555 })); cw.position.set(0, -0.3, -4); jib.add(cw);
    const cable = new THREE.Mesh(new THREE.BoxGeometry(0.05, 10, 0.05), new THREE.MeshStandardMaterial({ color: 0x222222 })); cable.position.set(0, -5, 16); jib.add(cable);
    const load = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 1), new THREE.MeshStandardMaterial({ color: 0x8a5a3a })); load.position.set(0, -10, 16); jib.add(load);
    crane.position.set(p.x - p.w / 2 + 3, p.y, p.z - p.d / 2 + 3); site.add(crane); V.jib = jib;
    crane.traverse(m => { if (m.isMesh) m.castShadow = true; });
    // scaffold
    V.scaff = new THREE.Group(); site.add(V.scaff);
    const fp = plotFootprint(p, p.design); const sm = new THREE.MeshStandardMaterial({ color: 0x8a8e94, metalness: 0.6, roughness: 0.4 });
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 6), sm); pole.position.set(p.x + x * (fp.hw + 1), 0, p.z + z * (fp.hd + 1)); V.scaff.add(pole); }
    V.planks = []; for (let i = 0; i < 4; i++) { const pl = new THREE.Mesh(new THREE.BoxGeometry(fp.hw * 2 + 2, 0.08, 0.9), new THREE.MeshStandardMaterial({ color: 0xa87a4a })); V.scaff.add(pl); V.planks.push(pl); }
    V.workers = [];
    for (let i = 0; i < 3; i++) { const c = new Character(randomOutfit(Math.random, 'worker'), { shadow: false }); c.setWeapon(null); scene.add(c.root); V.workers.push({ c, a: i / 3 * TAU + 0.5 }); }
    V.label = null;
  }
  if (p.state !== 'building' && V.site) { scene.remove(V.site); for (const w of V.workers) scene.remove(w.c.root); V.site = null; V.workers = []; if (V.label) { scene.remove(V.label); V.label = null; } }
  if (p.state === 'done' && V.group && !V.collider) {
    const fp = plotFootprint(p, p.design); V.collider = addCollider(p.x - fp.hw, p.z - fp.hd, p.x + fp.hw, p.z + fp.hd, p.y + (V.group.userData.H || 8), 'bld');
    if (V.clip) V.clip.constant = 9999; if (V.doneFx !== true) { V.doneFx = true; }
  }
  if (p.state === 'empty' && V.group) { scene.remove(V.group); V.group = null; }
}
function updateConstruction(dt, cam) {
  // host progress
  if (G.isHost) {
    for (const p of PLOTS) {
      if (p.state === 'building') { p.progress = Math.min(1, p.progress + dt / (BUILD_DESIGNS[p.design].time)); if (p.progress >= 1) { p.state = 'done'; syncPlotVisual(p); onBuildDone(p); NET.send({ t: 'plot', p: plotState(p) }); savePlots(); } }
      if (p.state === 'done' && BUILD_DESIGNS[p.design].income) p.bank = (p.bank || 0) + BUILD_DESIGNS[p.design].income * dt / 60;
    }
    if ((G._plotSync = (G._plotSync || 0) - dt) <= 0) { G._plotSync = 2; const act = PLOTS.filter(p => p.state === 'building'); if (act.length) NET.send({ t: 'plots', ps: act.map(plotState) }); }
  }
  for (const [id, V] of CONSTR) {
    const p = PLOTS[id];
    if (V.group && V.clip && p.state === 'building') { const H = V.group.userData.H; V.clip.constant = V.group.userData.y0 + H * p.progress + 0.01; }
    if (!V.site) continue; const d = Math.hypot(p.x - cam.x, p.z - cam.z); V.site.visible = d < 500;
    if (V.jib) V.jib.rotation.y = Math.sin(G.t * 0.25 + id) * 1.4;
    const H = V.group ? V.group.userData.H : 10; const top = p.y + H * p.progress + 2;
    for (const pole of V.scaff.children.filter(c => c.geometry.type === 'CylinderGeometry')) { pole.scale.y = Math.max(0.1, top - p.y); pole.position.y = p.y + (top - p.y) / 2; }
    V.planks.forEach((pl, i) => { const fp = plotFootprint(p, p.design); pl.position.set(p.x, p.y + (top - p.y) * (i + 1) / 4, p.z + (i % 2 ? 1 : -1) * (fp.hd + 1)); });
    const near = d < 110;
    V.workers.forEach((w, i) => { w.c.root.visible = near; if (!near) return; const fp = plotFootprint(p, p.design); const a = w.a + Math.sin(G.t * 0.1 + i) * 0.3; w.c.root.position.set(p.x + Math.sin(a) * (fp.hw + 1.8), p.y, p.z + Math.cos(a) * (fp.hd + 1.8)); w.c.root.rotation.y = a + Math.PI; w.c.update(dt, { speed: 0, grounded: true, state: 'normal', work: true }); });
    if (near && Math.random() < dt * 3) { FX.impact({ x: p.x + rnd(-p.w / 3, p.w / 3), y: p.y + rnd(0.2, H * p.progress + 1), z: p.z + rnd(-p.d / 3, p.d / 3) }, 'dust'); }
    if (near && Math.random() < dt * 1.5) sfx('build', p.x, p.z, 0.6);
    // label
    const pct = Math.floor(p.progress * 100); if (V.lastPct !== pct) { V.lastPct = pct; if (V.label) { scene.remove(V.label); V.label.material.map.dispose(); } V.label = textSprite(`🏗️ ${BUILD_DESIGNS[p.design].name} ${pct}%`, '#ffd34a'); V.label.scale.multiplyScalar(4); V.label.position.set(p.x, top + 4, p.z); scene.add(V.label); }
    V.label.position.y = top + 4;
  }
}
function onBuildDone(p) {
  FX.confetti(p.x, p.y + 8, p.z); sfx('levelup');
  if (p.owner === ME.id) { announce('🏠 건축 완료!', `${BUILD_DESIGNS[p.design].name} — ${REGIONS[p.region].name}`); }
  else toast(`🏗️ ${p.ownerName}의 ${BUILD_DESIGNS[p.design].name} 완공`);
}
function plotState(p) { return { id: p.id, o: p.owner, on: p.ownerName, d: p.design, pr: +p.progress.toFixed(4), s: p.state, b: Math.floor(p.bank || 0) }; }
function applyPlotState(s) {
  const p = PLOTS[s.id]; if (!p) return; const wasDone = p.state === 'done';
  p.owner = s.o; p.ownerName = s.on; p.design = s.d; p.progress = s.pr; p.state = s.s; p.bank = s.b; syncPlotVisual(p);
  if (!wasDone && p.state === 'done' && G.started && !G.isHost) onBuildDone(p);
}
function savePlots() { if (!G.isHost) return; try { localStorage.setItem('sbc3d_world', JSON.stringify({ plots: PLOTS.map(plotState), time: G.time })); } catch (e) { } }
function loadPlots() {
  try { const w = JSON.parse(localStorage.getItem('sbc3d_world') || 'null'); if (!w) return; for (const s of w.plots) { if (s.s === 'building' && s.pr === undefined) s.pr = 0; applyPlotState(s); } if (w.time) G.time = w.time; } catch (e) { }
}
// requests (host side handlers)
function hostPlotRequest(m, fromId, fromName) {
  const p = PLOTS[m.p]; if (!p) return;
  if (m.t === 'buyLand') { if (p.state !== 'empty') { notifyPlayer(fromId, { t: 'plotFail', amt: p.price, msg: '이미 팔린 땅이다' }); return; } p.owner = fromId; p.ownerName = fromName; p.state = 'owned'; p.design = null; p.progress = 0; }
  if (m.t === 'build') { if (p.owner !== fromId || p.state !== 'owned') { notifyPlayer(fromId, { t: 'plotFail', amt: BUILD_DESIGNS[m.d]?.price || 0, msg: '건축할 수 없다' }); return; } p.design = m.d; p.state = 'building'; p.progress = 0; }
  if (m.t === 'collect') { if (p.owner !== fromId) return; const a = Math.floor(p.bank || 0); p.bank = 0; notifyPlayer(fromId, { t: 'income', amt: a }); }
  syncPlotVisual(p); NET.send({ t: 'plot', p: plotState(p) }); savePlots();
}
function plotRequest(m) { if (G.isHost) hostPlotRequest(m, ME.id, ME.name); else NET.send(m); }
