
// ================= MAIN =================
// 플레이어 id: 기기(브라우저)마다 저장하지만, 같은 브라우저의 탭 여러 개가 같은 id를 쓰면
// 상대를 때릴 때 내가 맞는 버그가 생긴다 → 탭마다 고유 id(잠금 + 탭 전용 id)를 쓴다.
const TAB_NONCE = Math.random().toString(36).slice(2, 10);
const UID_LOCKS = 'sbc3d_uid_locks';
function uidLocks() { try { return JSON.parse(localStorage.getItem(UID_LOCKS) || '{}') || {}; } catch (e) { return {}; } }
function uidTaken(id) { const e = uidLocks()[id]; return !!(e && e.n !== TAB_NONCE && Date.now() - e.t < 75000); }
function uidBeat(release) { try { const L = uidLocks(), now = Date.now(); for (const k in L) if (now - L[k].t > 120000 || L[k].n === TAB_NONCE) delete L[k]; if (!release && ME.id && ME.id !== 'me') L[ME.id] = { n: TAB_NONCE, t: now }; localStorage.setItem(UID_LOCKS, JSON.stringify(L)); } catch (e) { } }
function newTabId() { const base = (ME.id || 'u').replace(/t[a-z0-9]{4}$/, ''); let id; do { id = base + 't' + Math.random().toString(36).slice(2, 6); } while (uidTaken(id)); try { sessionStorage.setItem('sbc3d_tab_uid', id); } catch (e) { } ME.id = id; uidBeat(); return id; }
function uid() {
  const K = 'sbc3d_uid'; let id = null;
  try { id = URLP.get('local') ? sessionStorage.getItem(K) : localStorage.getItem(K); } catch (e) { }
  if (!id) { id = 'u' + Math.random().toString(36).slice(2, 10); try { (URLP.get('local') ? sessionStorage : localStorage).setItem(K, id); } catch (e) { } }
  try { const t = sessionStorage.getItem('sbc3d_tab_uid'); if (t) id = t; } catch (e) { }
  if (uidTaken(id)) { ME.id = id; id = newTabId(); }
  try { sessionStorage.setItem('sbc3d_tab_uid', id); } catch (e) { }
  ME.id = id; uidBeat(); if (!uid._iv) { uid._iv = setInterval(() => uidBeat(), 2000); addEventListener('pagehide', () => uidBeat(true)); }
  return id;
}
function loadSave() { try { return JSON.parse(localStorage.getItem('sbc3d_save') || 'null'); } catch (e) { return null; } }
function leaveServer() {
  try { saveGame(); savePlots(); } catch (e) { }
  try { NET.send({ t: 'bye' }); } catch (e) { }
  setTimeout(() => {
    try { for (const c of NET.conns.slice()) { try { c.close && c.close(); } catch (e) { } } NET.peer && NET.peer.destroy(); NET.gpeer && NET.gpeer.destroy(); NET.bc && NET.bc.close(); } catch (e) { }
    try { location.replace(cleanUrl()); } catch (e) { location.reload(); }
  }, 250);
  toast('🚪 나가는 중…');
}
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
  $('#soloBtn').onclick = () => startGame('solo'); $('#hostBtn').onclick = () => startGame('host'); $('#quickBtn').onclick = () => startGame('quick');
  initPubList();
  $('#joinBtn').onclick = () => { const c = $('#codeIn').value.trim().toUpperCase(); if (c.length < 4) { $('#lobbyMsg').textContent = '방 코드를 입력하세요'; return; } startGame('join', c); };
  $('#codeIn').onkeydown = e => { if (e.key === 'Enter') $('#joinBtn').click(); };
  // 초대 링크(?room=CODE)로 들어오면: 큰 "바로 참가" 버튼 + 5초 뒤 자동 참가
  if (rc) {
    const code = rc.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); $('#inviteBox').classList.remove('hidden'); $('#invCode').textContent = PUBLIC_ROOMS.includes(code) ? '공개방 ' + (PUBLIC_ROOMS.indexOf(code) + 1) : code;
    let left = 5; const cnt = $('#invCount');
    const stop = () => { clearInterval(LOBBY.cd); LOBBY.cd = 0; cnt.textContent = '닉네임/외형을 바꾼 뒤 버튼을 눌러 참가하세요'; };
    const tickCd = () => { if (left <= 0) { stop(); startGame('join', code); return; } cnt.innerHTML = `${left}초 뒤 자동으로 참가해요 · <a id="invCancel">잠깐, 외형부터 꾸밀래요</a>`; $('#invCancel').onclick = stop; left--; };
    $('#invJoin').onclick = () => { stop(); startGame('join', code); };
    tickCd(); LOBBY.cd = setInterval(tickCd, 1000);
    for (const el of ['#nameIn', '#qualIn', '#cust', '#randBtn', '#admIn', '#admBtn', '#codeIn']) { const e = $(el); if (e) e.addEventListener('pointerdown', () => LOBBY.cd && stop()); }
  } else if (URLP.get('quick')) { setTimeout(() => startGame('quick'), 300); }
}
const LOBBY = { cd: 0, busy: false, btns: ['soloBtn', 'hostBtn', 'joinBtn', 'quickBtn', 'invJoin', 'pubRefresh'], lock(on) { this.busy = on; for (const id of this.btns) { const b = $('#' + id); if (b) b.disabled = on; } for (const b of document.querySelectorAll('#pubList .pr')) b.disabled = on; } };
// ---------- 로비: 공개방 20개 목록 (인원 표시 · 누르면 참가, 비어 있으면 내가 방장) ----------
// 서버가 없는 P2P라서 각 공개방 방장(Peer id 고정)에게 잠깐 연결해 인원을 묻는다. 응답 없음 = 0명.
const PUBLIST = { counts: {}, t: 0, running: false };
function initPubList() {
  const box = $('#pubList'); if (!box) return; box.innerHTML = '';
  PUBLIC_ROOMS.forEach((code, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'pr'; b.id = 'pr-' + code; b.innerHTML = `<b></b><small>…</small>`; b.querySelector('b').textContent = '공개방 ' + (i + 1); b.onclick = () => { if (!LOBBY.busy) startGame('pub', code); }; box.appendChild(b); });
  const rb = $('#pubRefresh'); if (rb) rb.onclick = () => refreshPubList(true);
  refreshPubList(); PUBLIST.t = setInterval(() => { if (!G.started && !LOBBY.busy && !document.hidden) refreshPubList(); }, 20000);
}
function setPubCount(code, n) {
  PUBLIST.counts[code] = n; const b = $('#pr-' + code); if (!b) return; const s = b.querySelector('small');
  b.classList.toggle('has', n > 0); b.classList.toggle('full', n >= MAX_PLAYERS);
  s.textContent = n === null ? '확인 실패' : n >= MAX_PLAYERS ? `${n}/${MAX_PLAYERS}명 · 가득` : `${n}/${MAX_PLAYERS}명`;
}
async function refreshPubList(manual) {
  if (PUBLIST.running || G.started) return; PUBLIST.running = true; const msg = $('#pubMsg'); if (msg) msg.textContent = '인원 확인 중…';
  for (const c of PUBLIC_ROOMS) { const b = $('#pr-' + c); if (b && PUBLIST.counts[c] === undefined) b.querySelector('small').textContent = '…'; }
  await NET.probeRooms(PUBLIC_ROOMS, setPubCount);
  PUBLIST.running = false; if (msg) { const tot = PUBLIC_ROOMS.reduce((a, c) => a + (PUBLIST.counts[c] || 0), 0); msg.textContent = `접속 중 ${tot}명 · 20초마다 자동 새로고침`; }
}
function setLoad(p, t) { $('#loadBar').style.width = Math.round(p * 100) + '%'; $('#loadTxt').textContent = t; }
async function startGame(mode, code) {
  AU.init(); ME.name = ($('#nameIn').value.trim() || '플레이어').slice(0, 12); ME.outfit = Object.assign({}, lobbyOutfit); G.quality = +$('#qualIn').value; try { localStorage.setItem('sbc3d_q', G.quality); } catch (e) { }
  ME.id = uid(); G.name = ME.name; G.myId = ME.id; LOBBY.lock(true); clearInterval(LOBBY.cd); clearInterval(PUBLIST.t); NET.stopProbe();
  const msg = t => { $('#lobbyMsg').textContent = t; };
  if ($('#admIn') && $('#admIn').value && !ADMIN.pre) { msg('🔐 관리자 비밀번호 확인 중…'); await ADMIN.preAuth(); }
  msg(mode === 'join' ? `🔌 방 ${code}에 접속 중…` : mode === 'host' ? '🌐 비공개방 만드는 중…' : mode === 'quick' ? '⚡ 공개방 찾는 중…' : mode === 'pub' ? `🌐 공개방 ${PUBLIC_ROOMS.indexOf(code) + 1} 접속 중…` : '');
  G.isHost = mode !== 'join';
  try {
    if (mode === 'host') {
      for (let k = 0; ; k++) { const c = (k === 0 && code) || NET.code(); try { await NET.host(c); G.room = c; break; } catch (e) { if (e.code !== 'unavailable-id' || k >= 3) throw e; } }
      G.online = true; G.isHost = true;
      console.log(`//: 방코드 ${G.room}`); // 채팅창 안내는 월드 로딩이 끝난 뒤 한 번만 (loadWorld) — 예전엔 로딩 중에도 찍혀서 두 줄로 보였음
    }
    if (mode === 'join') {
      let err = null;
      for (let k = 0; k < 3; k++) { try { await NET.join(code, k ? 20000 : 15000); err = null; break; } catch (e) { err = e; if (e.code === 'full' || e.code === 'nopeer' || e.code === 'browser-incompatible') break; msg(`🔁 다시 시도 중… (${e.message})`); await sleep(1200); } }
      if (err) throw err; G.online = true; G.isHost = false; G.room = code;
    }
    if (mode === 'pub') { const r = await NET.joinOrHost(code); G.online = true; G.isHost = r.mode === 'host'; G.room = r.room; }
    if (mode === 'quick') { const r = await NET.quickMatch(msg); G.online = true; G.isHost = r.mode === 'host'; G.room = r.room; }
  } catch (e) {
    if (mode === 'join' || mode === 'quick' || mode === 'pub') {
      msg('❌ ' + (e.message || e)); LOBBY.lock(false); G.online = false; G.isHost = true; refreshPubList(); PUBLIST.t = setInterval(() => { if (!G.started && !LOBBY.busy && !document.hidden) refreshPubList(); }, 20000);
      if (mode === 'join') { $('#invJoin').innerHTML = '🔁 다시 시도'; $('#invCount').textContent = '친구 화면이 게임 안에 있는지 확인해 주세요 · 안 되면 "비공개방 만들기"로 내가 방을 만들어 코드를 알려줘도 돼요'; }
      return;
    }
    G.online = false; G.isHost = true; toastLater('⚠ 온라인 서버 연결 실패 — 혼자 모드로 시작 (' + (e.message || e) + ')');
  }
  G.hostId = G.isHost ? ME.id : null;
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
  G.started = true; UI.init(); SHARE.init(); initInput(); UI.updateWeapon(); UI.updateStars(); ADMIN.autoLogin();
  NET.updateRoomInfo(); setInterval(() => NET.heartbeat(), 2000);
  NET.flush(); if (G.online && !G.isHost) NET.hello();
  announce('서불리 시티', '이벤트광장 · ' + (G.online && G.isHost ? `방 코드 ${G.room}` : 'P 휴대폰 · E 상호작용'));
  _later.forEach(m => toast(m, 5000)); _later = [];
  if (G.online && G.isHost) {
    UI.chatLine(null, `//: 방코드 ${G.room}`);
    if (!PUBLIC_ROOMS.includes(G.room)) setTimeout(() => { if (!G.players.size) SHARE.show(); }, 700); // 비공개방: 방 코드·링크 창을 한 번 띄운다 (P ▶ 친구 초대로 다시 열기)
    if (PUBLIC_ROOMS.includes(G.room)) toast(`⚡ 공개방 ${G.room}을 열었다 — 다른 사람이 빠른 참가를 누르면 들어온다`, 5000);
  }
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
  if (winOpen()) { INP.mx = INP.mz = 0; INP.joyMag = 0; INP.fire = false; if (UI.joyReset) UI.joyReset(); }
  if (!UI.menuOpen || G.online) updatePlayer(dt); else { ME.char.update(dt, { speed: 0, grounded: true, state: ME.vehicle ? 'drive' : ME.sitBench ? 'sit' : 'normal', dance: ME.dance }); }
  INTERIOR.update(dt); LAW.tick(dt); COMFORT.tick(dt); TAXI.update(dt);
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
if (URLP.get("debug")) window.__SBC = { winOpen, leaveServer, FX, TAXI, ROUTE, DISTRICTS, districtAt, ACRYPTO, COMFORT, LAW, ADMIN, simulate, MAT, ENV, get bloomPass() { return bloomPass; }, G, ME, CAM, PEDS, vehicles, TRAFFIC, ANIMALS, PLOTS, FACILITIES, TREES, EDGES, NODES, BLOCKS, enterVehicle, exitVehicle, toggleVehicle, UI, NET, get camera() { return camera; }, get scene() { return scene; }, get renderer() { return renderer; }, groundHeight, startGame, INP, KEYS, tryAttack, selectWeapon, plotRequest, fastTravel, spawnOwned, setTreeVisible, chopTree, updateCamera, Q, regionAt, COLLIDERS, INTERIOR, BUILDINGS, PRISONS, getBuilding, floorAt, dealDamage, plotFloors, clampFloors, designPrice, MAX_FLOORS, anchorOf, sameSpace, fallDamageFor, meleeResolve, terrainH, hillsAt, DESIGN_FLOORS, BUILD_DESIGNS, applyPlotState, hostPlotRequest };
