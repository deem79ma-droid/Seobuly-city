
// ================= MAIN =================
function uid() {
  const K = 'sbc3d_uid'; let id = null;
  try { id = URLP.get('local') ? sessionStorage.getItem(K) : localStorage.getItem(K); } catch (e) { }
  if (!id) { id = 'u' + Math.random().toString(36).slice(2, 10); try { (URLP.get('local') ? sessionStorage : localStorage).setItem(K, id); } catch (e) { } }
  return id;
}
function loadSave() { try { return JSON.parse(localStorage.getItem('sbc3d_save') || 'null'); } catch (e) { return null; } }
function saveGame() {
  if (!G.started) return;
  try { localStorage.setItem('sbc3d_save', JSON.stringify({ name: ME.name, outfit: (ADMIN.on && ADMIN.prev ? ADMIN.prev.outfit : ME.outfit), money: Math.floor(ADMIN.on && ADMIN.prev ? ADMIN.prev.money : ME.money), weapons: ME.weapons, ammo: ME.ammo, mag: ME.mag, inv: ME.inv, skills: ME.skills, garage: ME.garage, homePlot: ME.homePlot, kills: ME.kills })); } catch (e) { }
}
function onResize() {
  if (!renderer) return; const w = innerWidth, h = innerHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  if (composer) { composer.setSize(w, h); } if (bloomPass) bloomPass.resolution.set(w, h);
}
function initThree() {
  const q = Q();
  renderer = new THREE.WebGLRenderer({ canvas: $('#c'), antialias: q.aa && !q.bloom, powerPreference: 'high-performance', stencil: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, q.pr)); renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.6;
  renderer.shadowMap.enabled = !!q.shadow; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.localClippingEnabled = true;
  ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 30000); clock = new THREE.Clock();
  if (q.bloom) {
    const rt = new THREE.WebGLRenderTarget(innerWidth * renderer.getPixelRatio(), innerHeight * renderer.getPixelRatio(), { type: THREE.HalfFloatType, samples: renderer.capabilities.isWebGL2 ? 4 : 0 });
    composer = new EffectComposer(renderer, rt); composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.32, 0.45, 0.9); composer.addPass(bloomPass); composer.addPass(new OutputPass());
  }
  addEventListener('resize', onResize);
}
// ---------- lobby ----------
let preview = null, lobbyOutfit = null;
function initLobby() {
  const sv = loadSave(); let q = 3; try { const s = localStorage.getItem('sbc3d_q'); if (s !== null) q = +s; else if (IS_TOUCH) q = 2; } catch (e) { }
  $('#qualIn').value = q; $('#nameIn').value = sv?.name || ('시민' + Math.floor(Math.random() * 900 + 100));
  lobbyOutfit = sv?.outfit || randomOutfit(); const rc = URLP.get('room'); if (rc) $('#codeIn').value = rc.toUpperCase();
  const cv = $('#preview'); const pr = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); pr.setPixelRatio(Math.min(2, devicePixelRatio)); pr.outputColorSpace = THREE.SRGBColorSpace; pr.toneMapping = THREE.ACESFilmicToneMapping; pr.toneMappingExposure = 1.0;
  const ps = new THREE.Scene(); const pc = new THREE.PerspectiveCamera(32, 3 / 4, 0.1, 50); pc.position.set(0, 1.25, 4.6); pc.lookAt(0, 0.95, 0);
  ps.add(new THREE.HemisphereLight(0xcfe0ff, 0x302020, 1.4)); const dl = new THREE.DirectionalLight(0xffffff, 2.6); dl.position.set(2, 4, 3); ps.add(dl); const rl = new THREE.DirectionalLight(0x88aaff, 1.4); rl.position.set(-3, 2, -3); ps.add(rl);
  const ch = new Character(lobbyOutfit, { shadow: false }); ps.add(ch.root); const floor = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32), new THREE.MeshStandardMaterial({ color: 0x222838 })); floor.rotation.x = -Math.PI / 2; ps.add(floor);
  preview = { pr, ps, pc, ch, t: 0, dance: 0 };
  buildCustomizer($('#cust'), lobbyOutfit, (o) => ch.setOutfit(o));
  $('#randBtn').onclick = () => { lobbyOutfit = randomOutfit(); ch.setOutfit(lobbyOutfit); buildCustomizer($('#cust'), lobbyOutfit, (o) => ch.setOutfit(o)); };
  const loopP = () => { if (G.started) { pr.dispose(); return; } requestAnimationFrame(loopP); const w = cv.clientWidth, h = cv.clientHeight; if (cv.width !== Math.floor(w * pr.getPixelRatio())) { pr.setSize(w, h, false); pc.aspect = w / h; pc.updateProjectionMatrix(); } preview.t += 0.016; ch.root.rotation.y = Math.sin(preview.t * 0.5) * 0.8; ch.update(0.016, { speed: 0, grounded: true, state: 'normal', dance: Math.floor(preview.t / 6) % 3 === 2 ? Math.floor(preview.t / 18) % 8 : -1, idleLook: 0.6 }); pr.render(ps, pc); };
  loopP();
  $('#soloBtn').onclick = () => startGame('solo'); $('#hostBtn').onclick = () => startGame('host'); $('#joinBtn').onclick = () => { const c = $('#codeIn').value.trim().toUpperCase(); if (c.length < 4) { $('#lobbyMsg').textContent = '방 코드를 입력하세요'; return; } startGame('join', c); };
}
function setLoad(p, t) { $('#loadBar').style.width = Math.round(p * 100) + '%'; $('#loadTxt').textContent = t; }
async function startGame(mode, code) {
  AU.init(); ME.name = ($('#nameIn').value.trim() || '플레이어').slice(0, 12); ME.outfit = Object.assign({}, lobbyOutfit); G.quality = +$('#qualIn').value; try { localStorage.setItem('sbc3d_q', G.quality); } catch (e) { }
  ME.id = uid(); G.name = ME.name; ADMIN.preAuth();
  $('#lobbyMsg').textContent = mode === 'join' ? '방에 접속 중…' : mode === 'host' ? '방 만드는 중…' : '';
  ['soloBtn', 'hostBtn', 'joinBtn'].forEach(id => $('#' + id).disabled = true);
  G.isHost = mode !== 'join';
  try {
    if (mode === 'host') { const c = NET.code(); await NET.host(c); }
    if (mode === 'join') { await NET.join(code); }
  } catch (e) {
    if (mode === 'join') { $('#lobbyMsg').textContent = '❌ ' + (e.message || e); ['soloBtn', 'hostBtn', 'joinBtn'].forEach(id => $('#' + id).disabled = false); G.online = false; return; }
    G.online = false; G.isHost = true; toastLater('⚠ 온라인 서버 연결 실패 — 혼자 모드로 시작 (' + (e.message || e) + ')');
  }
  $('#lobby').classList.add('hidden'); $('#loading').classList.remove('hidden');
  try { await loadWorld(); } catch (e) { console.error(e); $('#loadTxt').textContent = '오류: ' + e.message; return; }
}
let _later = []; function toastLater(m) { _later.push(m); }
async function loadWorld() {
  initThree();
  await buildWorld(setLoad);
  setLoad(0.82, '조명과 날씨 설정 중…'); await tick(); initEnv(); FX.init(); buildGrass();
  setLoad(0.86, '지도 그리는 중…'); await tick(); UI.buildWorldImage();
  setLoad(0.9, '사람들과 동물들 배치 중…'); await tick();
  initPeds(); initTraffic(); initAnimals(); spawnParked();
  for (const p of PLOTS) syncPlotVisual(p);
  if (G.isHost) loadPlots();
  // player
  const sv = loadSave(); if (sv) { Object.assign(ME, { money: sv.money ?? 50000, weapons: sv.weapons || { fist: 1 }, ammo: sv.ammo || {}, mag: sv.mag || {}, inv: Object.assign(ME.inv, sv.inv || {}), skills: Object.assign(ME.skills, sv.skills || {}), garage: sv.garage || [], homePlot: sv.homePlot ?? null, kills: sv.kills || 0 }); }
  if (!ME.weapons.axe) { ME.weapons.axe = 1; }
  ME.char = new Character(ME.outfit); scene.add(ME.char.root); ME.char.setName(null);
  const sx = G.isHost ? 10 : -10; ME.x = sx; ME.z = 52; ME.y = groundHeight(ME.x, ME.z); ME.yaw = Math.PI; CAM.yaw = Math.PI;
  setLoad(1, '완료!'); await tick();
  // warm up: compile shaders
  updateEnv(0.01, { x: ME.x, y: ME.y, z: ME.z }); updateCamera(0.016); try { renderer.compile(scene, camera); } catch (e) { }
  $('#loading').classList.add('hidden'); $('#hud').classList.remove('hidden');
  G.started = true; UI.init(); initInput(); UI.updateWeapon(); UI.updateStars(); ADMIN.autoLogin();
  $('#roomInfo').innerHTML = G.online ? (G.isHost ? `🌐 방 코드 <b>${G.room}</b> (친구에게 알려줘)` : `🌐 ${G.room} 방 접속`) : '혼자 플레이';
  NET.flush(); if (G.online && !G.isHost) NET.hello();
  announce('서부리 시티', '이벤트광장 · ' + (G.online && G.isHost ? `방 코드 ${G.room}` : 'P 휴대폰 · E 상호작용'));
  _later.forEach(m => toast(m, 5000)); _later = [];
  if (G.online && G.isHost) { UI.chatLine(null, `방 코드: ${G.room} — 친구가 로비에서 이 코드로 참가하면 됩니다`); }
  if (IS_TOUCH) toast('🕹️ 왼쪽 조이스틱 이동 · 오른쪽 드래그로 시점', 4000); else toast('🖱️ 화면 클릭 → 마우스 시점 · WASD 이동 · F1 조작법', 5000);
  requestAnimationFrame(loop);
  setInterval(() => { saveGame(); savePlots(); }, 30000);
  addEventListener('beforeunload', () => { saveGame(); savePlots(); });
}
function spawnParked() {
  const r = mulberry32(999); const pk = (a) => a[Math.floor(r() * a.length)];
  PARKED.forEach((p, i) => {
    const pool = p.display ? ['sports', 'supercar', 'suv', 'sedan', 'superbike', 'bike'] : p.region === 'kaengjibe' ? ['hatch', 'pickup', 'van', 'sedan', 'bike'] : p.region === 'disanbay' ? ['pickup', 'pickup', 'hatch', 'van', 'scooter'] : p.region === 'simone' ? ['sports', 'suv', 'scooter', 'sedan'] : ['sedan', 'hatch', 'suv', 'sedan', 'sports', 'van', 'bike', 'scooter'];
    const model = pk(pool); const col = CAR_COLORS[Math.floor(r() * CAR_COLORS.length)];
    const v = new Vehicle('P' + i, model, col, p.x, p.z, p.yaw, { locked: !!p.display }); v.isParked = true;
  });
  // horses
  const f = FARMS[0]; if (f) for (let i = 0; i < 4; i++) { const v = new Vehicle('H' + i, 'horse', '#000', f.x0 + 10 + i * 12, f.z0 + 15 + (i % 2) * 20, r() * TAU, { seed: r() }); v.isParked = true; }
  for (let i = 0; i < 2; i++) { const v = new Vehicle('H' + (4 + i), 'horse', '#000', -1020 + i * 6, 30, 0, { seed: r() }); v.isParked = true; }
}
// ---------- loop ----------
const _cam = new THREE.Vector3(); let _iT = 0, _mT = 0, _tT = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta()); G.dt = dt; G.t += dt;
  try { frame(dt); } catch (e) { console.error(e); if (!G._errShown) { G._errShown = true; toast('⚠ 오류: ' + e.message, 6000); } }
}
function simulate(n, dt = 1 / 30) { for (let i = 0; i < n; i++) { G.dt = dt; G.t += dt; frame(dt, true); } }
function frame(dt, noRender) {
  if (!UI.menuOpen || G.online) updatePlayer(dt); else { ME.char.update(dt, { speed: 0, grounded: true, state: ME.vehicle ? 'drive' : ME.sitBench ? 'sit' : 'normal', dance: ME.dance }); }
  LAW.tick(dt); COMFORT.tick(dt);
  if (G.isHost) { hostUpdatePeds(dt); hostUpdateTraffic(dt); hostUpdateAnimals(dt); hostTrees(dt); }
  _cam.copy(camera.position);
  const view2 = 520 * 520;
  for (const v of vehicles.values()) {
    if (v.ctrl === 'remote') v.interp(dt);
    else if (!v.driver && !v.ai && (Math.abs(v.speed) > 0.05 || v.y > (v.groundY ?? v.y) + 0.05 || v.burnT > 0 || v.vy > 0.1)) v.drive(dt, { throttle: 0, steer: 0, brake: 1 });
    const d2 = dist2(v.x, v.z, _cam.x, _cam.z); let vis = d2 < view2; if (v.isTraffic && v.ai && v.ai.parked) vis = false; if (v.isTraffic && !v.ai && v.x === 0 && v.z < -2000) vis = false;
    v.mesh.visible = vis; if (vis) { v.visual(dt); if (v.npcDriver && v.npcDriver.root.visible && d2 < 80 * 80) v.npcDriver.update(dt, { state: 'drive', steer: v.steer / (v.M.steer || 0.5), speed: 0 }); }
  }
  renderPeds(dt, _cam); renderAnimals(dt, _cam); renderRemotes(dt);
  updateConstruction(dt, _cam); updateFalling(dt);
  for (const p of PICKUPS.values()) { p.mesh.rotation.y += dt * 2; p.mesh.position.y = p.y + Math.sin(G.t * 3) * 0.1; }
  updateCamera(dt);
  const fx = ME.vehicle ? ME.vehicle : ME; updateEnv(dt, { x: fx.x, y: fx.y, z: fx.z }); updateGrass(camera.position.x, camera.position.z);
  // headlight spot for my car
  const cl = ENV.carLight; if (ME.vehicle && ENV.night > 0.3 && ME.vehicle.kind !== 'horse') { const v = ME.vehicle; cl.intensity = 220; cl.position.set(v.x + Math.sin(v.yaw) * 2, v.y + 1, v.z + Math.cos(v.yaw) * 2); cl.target.position.set(v.x + Math.sin(v.yaw) * 25, v.y - 1, v.z + Math.cos(v.yaw) * 25); } else cl.intensity = 0;
  FX.update(dt);
  _iT -= dt; if (_iT <= 0) { _iT = 0.15; curInteract = UI.menuOpen ? null : findInteract(); UI.setPrompt(curInteract); }
  _mT -= dt; if (_mT <= 0) { _mT = 0.1; UI.drawMini(); if (UI.mapOpen && Math.floor(G.t * 2) % 2 === 0) UI.drawBigMap(); }
  _tT -= dt; if (_tT <= 0) { _tT = 0.3; UI.updateTouch(); }
  const dc = Math.hypot(ME.x - CLUB.x, ME.z - CLUB.z); MUSIC.vol = clamp(1 - dc / 130, 0, 1); MUSIC.tick();
  if (!ME.vehicle) ENG.set(false, 0);
  NET.tick(dt);
  if (noRender) return;
  if (composer && Q().bloom) composer.render(); else renderer.render(scene, camera);
}
window.addEventListener('error', e => { if (G.started && !G._errShown) { G._errShown = true; toast('⚠ ' + e.message, 6000); } });
initLobby();
if (URLP.get("debug")) window.__SBC = { COMFORT, LAW, ADMIN, simulate, MAT, ENV, get bloomPass() { return bloomPass; }, G, ME, CAM, PEDS, vehicles, TRAFFIC, ANIMALS, PLOTS, FACILITIES, TREES, EDGES, NODES, BLOCKS, enterVehicle, exitVehicle, toggleVehicle, UI, NET, get camera() { return camera; }, get scene() { return scene; }, get renderer() { return renderer; }, groundHeight, startGame, INP, KEYS, tryAttack, selectWeapon, plotRequest, fastTravel, spawnOwned, setTreeVisible, chopTree, updateCamera, Q, regionAt, COLLIDERS };
