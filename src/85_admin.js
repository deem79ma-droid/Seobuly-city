
// ================= ADMIN MODE + HELP + SETTINGS =================
// 관리자 비밀번호는 코드/저장소 어디에도 없다.
// 빌드할 때 ADMIN_PW(시크릿)로부터 "공개키"만 계산해서 넣는다:
//   seed = PBKDF2-SHA256(비번, 'sbc3d-admin-ed25519-v2', 150000회) → Ed25519 개인키(관리자 브라우저 메모리에만 존재)
//   ADMIN_PUB = 그 개인키의 공개키 (빌드에 포함, 누구나 볼 수 있음)
// 방장은 관리자에게 무작위 nonce를 보내고, 관리자는 개인키로 서명만 돌려준다.
// → 비밀번호·개인키는 관리자 브라우저 밖으로 절대 나가지 않고, 방장은 서명을 검증만 할 수 있을 뿐 흉내낼 수 없다.
const ADMIN_PUB = '__ADMIN_PUB__';
const hexOf = b => Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('');
const unhex = h => new Uint8Array((h.match(/../g) || []).map(x => parseInt(x, 16)));
const b64uDec = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
function randHex(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return hexOf(a); }
const ACRYPTO = {
  native: null, noble: null,
  async nativeOk() {
    if (this.native !== null) return this.native;
    try { await crypto.subtle.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify']); this.native = true; } catch (e) { this.native = false; }
    return this.native;
  },
  async lib() { if (!this.noble) this.noble = await import('https://cdn.jsdelivr.net/npm/@noble/ed25519@2.3.0/+esm'); return this.noble; },
  pk8(seed) { const o = new Uint8Array(48); o.set(unhex('302e020100300506032b657004220420')); o.set(seed, 16); return o; },
  async seedFromPw(pw) {
    const enc = new TextEncoder(); const k = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode('sbc3d-admin-ed25519-v2'), iterations: 150000 }, k, 256));
  },
  async pubFromSeed(seed) {
    if (await this.nativeOk()) { try { const k = await crypto.subtle.importKey('pkcs8', this.pk8(seed), { name: 'Ed25519' }, true, ['sign']); const j = await crypto.subtle.exportKey('jwk', k); if (j.x) return hexOf(b64uDec(j.x)); } catch (e) { } }
    const ed = await this.lib(); return hexOf(await ed.getPublicKeyAsync(seed));
  },
  async sign(seed, msg) {
    const m = new TextEncoder().encode(msg);
    if (await this.nativeOk()) { try { const k = await crypto.subtle.importKey('pkcs8', this.pk8(seed), { name: 'Ed25519' }, false, ['sign']); return hexOf(await crypto.subtle.sign({ name: 'Ed25519' }, k, m)); } catch (e) { } }
    const ed = await this.lib(); return hexOf(await ed.signAsync(m, seed));
  },
  async verify(pubHex, sigHex, msg) {
    if (!/^[0-9a-f]{128}$/.test(sigHex || '')) return false; const m = new TextEncoder().encode(msg);
    if (await this.nativeOk()) { try { const k = await crypto.subtle.importKey('raw', unhex(pubHex), { name: 'Ed25519' }, false, ['verify']); return await crypto.subtle.verify({ name: 'Ed25519' }, k, unhex(sigHex), m); } catch (e) { } }
    try { const ed = await this.lib(); return await ed.verifyAsync(unhex(sigHex), m, unhex(pubHex)); } catch (e) { return false; }
  },
};
try { G.sens = parseFloat(localStorage.getItem('sbc3d_sens')) || 1; } catch (e) { G.sens = 1; }

const ADMIN = {
  on: false, sk: null, fails: 0, lockT: 0, busy: false,
  enabled() { return /^[0-9a-f]{64}$/.test(ADMIN_PUB); },
  // 비번이 맞으면 개인키 seed(메모리 전용)를 돌려준다. 비번 자체는 저장하지 않는다.
  async check(pw) { if (!this.enabled() || !pw) return null; try { const seed = await ACRYPTO.seedFromPw(pw); return (await ACRYPTO.pubFromSeed(seed)) === ADMIN_PUB ? seed : null; } catch (e) { console.warn(e); return null; } },
  open() {
    if (!this.enabled()) { toast('🔒 관리자 모드가 설정되지 않은 빌드'); return; }
    if (this.on) this.panel(); else this.login();
  },
  login() {
    UI.openMenu('🔐 관리자 로그인', '비밀번호를 입력하세요', [], { extra: '<input id="admPw" type="password" autocomplete="off" placeholder="비밀번호" style="width:100%;margin:10px 0;padding:11px 12px;border-radius:10px;border:1px solid #fff3;background:#0007;color:#fff;font-size:15px">' });
    const inp = $('#admPw'); setTimeout(() => inp && inp.focus(), 50);
    const go = async () => {
      if (performance.now() < this.lockT) { toast('⏳ 잠시 후 다시 시도'); return; }
      if (this.busy) return; this.busy = true; toast('🔐 확인 중…', 1200);
      const sk = await this.check(inp.value); this.busy = false; inp.value = '';
      if (sk) { this.sk = sk; this.fails = 0; this.enter(); UI.closeMenu(); setTimeout(() => this.panel(), 60); }
      else { this.fails++; this.lockT = performance.now() + Math.min(30000, this.fails * 1500); sfx('error'); toast('❌ 비밀번호가 틀렸다'); }
    };
    inp.onkeydown = e => { if (e.key === 'Enter') go(); };
  },
  logout() { this.exit(); },
  // 방장 권한이 필요한 동작: 관리자는 곧바로 방장이 되므로 보통 로컬에서 실행. (이전 중이면 서명 인증된 연결로만 요청)
  remote(a, v) { if (G.isHost || !G.online) this.apply(a, v); else NET.send({ t: 'adm', a, v }); },
  apply(a, v) {
    if (a === 'time') { G.time = clamp(+v, 0, 23.99); toast('⏰ 시간 변경'); }
    else if (a === 'weather') { G.weather = v; G.weatherT = 600; toast('🌦️ 날씨 변경'); }
    else if (a === 'raid') { G.raidT = 0; toast('🔫 갱단 습격 시작!'); }
    else if (a === 'kick') this.kickOthers(false);
    else if (a === 'ban') this.kickOthers(true);
    else if (a === 'unban') { BANS.clear(); saveBans(); toast('✅ 밴 목록 초기화'); }
  },
  onNet(m, conn) { if (!G.isHost) return; if (conn && conn.admin) this.apply(m.a, m.v, m.f); else NET.send({ t: 'chat', m: '⚠ 관리자 인증 실패', sys: 1, to: m.f }); },
  tp(x, z) {
    INTERIOR.dispose(); INTERIOR.clearRoof(); ME.fallTop = null; if (ME.vehicle) exitVehicle(true); ME.x = x; ME.z = z; ME.y = groundHeight(x, z) + 0.3; ME.vx = ME.vz = ME.vy = 0;
    const r = resolveCircle(ME.x, ME.z, 0.35, ME.y, 1.8); ME.x = r.x; ME.z = r.z; toast('📍 이동');
  },
  flyStep(dt, dx, dz, mag) {
    const sp = KEYS['shift'] ? 55 : 18; ME.vx = damp(ME.vx, dx * sp * mag, 6, dt); ME.vz = damp(ME.vz, dz * sp * mag, 6, dt);
    const up = (KEYS[' '] || INP.jump ? 1 : 0) - (KEYS['c'] ? 1 : 0); ME.vy = damp(ME.vy, up * sp * 0.7, 6, dt);
    ME.x += ME.vx * dt; ME.z += ME.vz * dt; ME.y += ME.vy * dt;
    const gy = groundHeight(ME.x, ME.z, ME.y + 0.5); if (ME.y < gy) { ME.y = gy; ME.vy = Math.max(0, ME.vy); }
    ME.grounded = false; ME.swim = false; ME.spd = Math.hypot(ME.vx, ME.vz);
    if (ME.spd > 0.3) ME.yaw = dampAng(ME.yaw, Math.atan2(ME.vx, ME.vz), 12, dt);
  },
  panel() {
    const R = () => this.panel(); const on = b => b ? 'ON' : 'OFF';
    const others = [...G.players.values()];
    const items = [
      { ic: '🛡️', t: '무적', p: on(ME.god), d: '데미지 무시 · 차량 무적', stay: true, fn: () => { ME.god = !ME.god; return true; } },
      { ic: '🕊️', t: '비행', p: on(ME.fly), d: 'Space 상승 · C 하강 · Shift 빠르게', stay: true, fn: () => { ME.fly = !ME.fly; if (!ME.fly) ME.vy = 0; return true; } },
      { ic: '⚡', t: '이동 속도', p: 'x' + (ME.speedMul || 1), d: '눌러서 x1 → x3 → x6', stay: true, fn: () => { const c = ME.speedMul || 1; ME.speedMul = c === 1 ? 3 : c === 3 ? 6 : 1; return true; } },
                  { ic: '❤️', t: '완전 회복', p: '', stay: true, fn: () => { ME.hp = 100; ME.armor = 100; ME.stamina = 100; ME.drunk = 0; UI.updateInv && UI.updateInv(); return true; } },
      { ic: '⭐', t: '수배 해제', p: '', stay: true, fn: () => { ME.wanted = 0; ME.wantedCool = 0; UI.updateStars(); return true; } },
      { ic: '⏰', t: '시간 설정', p: String(Math.floor(G.time)).padStart(2, '0') + '시', fn: () => { setTimeout(() => this.timeMenu(), 30); } },
      { ic: '🌦️', t: '날씨 설정', p: G.weather, fn: () => { setTimeout(() => this.weatherMenu(), 30); } },
      { ic: '🚗', t: '차량 소환', p: '', fn: () => { setTimeout(() => this.carMenu(), 30); } },
      { ic: '📍', t: '텔레포트', p: '', fn: () => { setTimeout(() => this.tpMenu(), 30); } },
      { ic: '🔥', t: '갱단 습격 시작', p: '', fn: () => { this.remote('raid'); } },
      { ic: '👢', t: '상대 추방', p: '', d: '관리자는 추방·밴 불가', dis: !G.online, disMsg: '혼자 플레이 중', fn: () => { this.remote('kick'); } },
      { ic: '⛔', t: '상대 밴 (재입장 차단)', p: '', dis: !G.online, disMsg: '혼자 플레이 중', fn: () => { this.remote('ban'); } },
      { ic: '♻️', t: '밴 목록 초기화', p: '', fn: () => { this.remote('unban'); } },
      { ic: '🔓', t: '상대 수감자 무료 석방', p: '', dis: !G.online, disMsg: '혼자 플레이 중', fn: () => this.freeOther() },
      { ic: '👑', t: '방장 권한 가져오기', p: G.isHost ? '방장임' : '', d: '관리자는 자동으로 방장이 된다 (안 됐을 때만)', dis: !G.online || G.isHost, disMsg: G.online ? '이미 방장이다' : '혼자 플레이 중', fn: () => { NET.send({ t: 'admClaim' }); toast('👑 방장 권한 요청 (서명 인증)'); } },
      { ic: '🔒', t: '관리자 로그아웃', p: '', fn: () => this.logout() },
    ];
    UI.openMenu('🛠️ 관리자 패널', `<small style="opacity:.7">F2 또는 /admin 으로 열기 · ${G.online ? (G.isHost ? '👑 내가 방장' : '⏳ 방장 권한 이전 중…') : '혼자 플레이'}</small>`, items, { refresh: R });
  },
  timeMenu() { UI.openMenu('⏰ 시간', '', [[6, '🌅 아침 06시'], [12, '☀️ 정오 12시'], [18, '🌇 저녁 18시'], [22, '🌃 밤 22시'], [0, '🌌 자정 00시'], [3, '🌠 새벽 03시']].map(([h, t]) => ({ t, p: '', fn: () => { this.remote('time', h); } }))); },
  weatherMenu() { UI.openMenu('🌦️ 날씨', '', [['clear', '☀️ 맑음'], ['cloudy', '☁️ 흐림'], ['rain', '🌧️ 비']].map(([k, t]) => ({ t, p: '', fn: () => { this.remote('weather', k); } }))); },
  carMenu() {
    UI.openMenu('🚗 차량 소환', '내 앞에 생성된다', Object.keys(VMODELS).map(k => ({ ic: VMODELS[k].kind === 'bike' ? '🏍️' : VMODELS[k].kind === 'horse' ? '🐎' : '🚗', t: VMODELS[k].name, p: '', fn: () => {
      const x = ME.x + Math.sin(ME.yaw) * 6, z = ME.z + Math.cos(ME.yaw) * 6, id = 'adm_' + ME.id + '_' + Date.now().toString(36);
      const col = VMODELS[k].kind === 'bike' ? pick(['#c41818', '#1a1a1a', '#f2f2f2', '#1a4ad0']) : pick(CAR_COLORS);
      const v = new Vehicle(id, k, col, x, z, ME.yaw, { owner: ME.id }); v.dyn = true; v.ctrl = 'local'; v.mesh.visible = true;
      NET.send({ t: 'vspawn', id, model: k, color: col, x, z, yaw: ME.yaw, owner: ME.id }); toast('🚗 ' + VMODELS[k].name + ' 소환');
    } })));
  },
  tpMenu() {
    const items = DISTRICTS.map(d => ({ ic: '📍', t: `${d.id}구역 ${d.name}`, p: '', fn: () => { const n = ROUTE.nearestOnRoad(d.cx, d.cz); const E = EDGES[n.e]; this.tp(n.x + (E.axis === 'x' ? 0 : E.w / 2 + 2.5), n.z + (E.axis === 'x' ? E.w / 2 + 2.5 : 0)); } }));
    items.push({ ic: '🚩', t: '웨이포인트로', p: '', dis: !UI.waypoint, disMsg: '지도(M)에서 웨이포인트를 먼저 찍어줘', fn: () => this.tp(UI.waypoint.x, UI.waypoint.z) });
    const o = [...G.players.values()][0]; items.push({ ic: '🤝', t: '상대 플레이어에게', p: '', dis: !o, disMsg: '다른 플레이어가 없다', fn: () => { const a = anchorOf(o); this.tp(a.x + 1.5, a.z + 1.5); } });
    UI.openMenu('📍 텔레포트', '', items);
  },
};

// ----- 도움말 / 설정 -----
UI.openHelp = function () {
  const row = (k, d) => `<div style="display:flex;gap:10px;align-items:baseline;padding:3px 0"><span style="min-width:112px;text-align:right">${k.split('|').map(x => `<kbd>${x}</kbd>`).join(' ')}</span><span style="opacity:.9">${d}</span></div>`;
  const sec = t => `<div style="margin:12px 0 4px;font-weight:700;color:#ffd34a;font-size:12.5px;letter-spacing:.04em">${t}</div>`;
  const pc = sec('이동') + row('W|A|S|D', '이동 (방향키도 가능)') + row('Shift', '달리기') + row('Space', '점프') + row('V', '1인칭 / 3인칭')
    + sec('전투') + row('좌클릭', '공격') + row('우클릭', '조준') + row('1~8|휠|Q', '무기 선택 · 이전 무기') + row('R', '재장전')
    + sec('상호작용 · 탈것') + row('E', '상호작용 · 탑승 · 하차 (전부 E 하나로)') + row('F', '탑승 / 하차 (예비 키)') + row('Space', '차: 핸드브레이크') + row('H|L', '경적 · 경찰차 사이렌')
    + sec('택시 · 구역') + row('P', '휴대폰 ▶ 택시 호출 (16개 구역 중 목적지 선택)') + row('E', '길가의 노란 택시 잡기 · 내 택시 타기 · 세워주세요') + row('Shift', '택시: 빨리 가 주세요') + row('M', '지도 (숫자 = 구역 번호)')
    + sec('멀티') + row('P', '휴대폰 ▶ 친구 초대 링크 (복사/공유)')
    + sec('건물 · 감옥 · 중력') + row('E', '모든 건물 문 앞: 들어가기 (문으로 걸어 들어가도 입장) · 실내: 물건 사용 / 나가기') + row('E', '높은 건물 실내 🛗 엘리베이터 → 옥상 (4m 넘게 떨어지면 낙하 피해, 물은 안전)') + row('E', '수감 중: 감방 문 앞에서 탈옥 시도 (실패 시 형량 +30초, 성공 시 수배 ★3)')
    + sec('기타') + row('U', '끼임 탈출 · 뒤집힌 차 복구') + row('G|X', '춤 · 춤 멈추기') + row('T|Enter', '채팅') + row('M', '지도') + row('P|Tab|Esc', '휴대폰 메뉴') + row('F1', '이 도움말') + row('F2', '관리자')
    + `<div style="margin-top:12px;opacity:.7;font-size:12px">🪧 매물 표지판에서 땅을 사고 건축을 의뢰 (최대 15층) · 🪓 도끼로 나무를 베어 판매 · 🐎 디산베이 목장에서 말</div>`;
  const tc = sec('터치') + row('조이스틱', '왼쪽: 이동 (끝까지 밀면 달리기)') + row('드래그', '오른쪽 화면: 시점') + row('🔥', '공격') + row('🎯', '조준') + row('⬆', '점프 / 차: 브레이크') + row('✋', '상호작용 · 탑승 · 하차') + row('📱', '휴대폰 메뉴 (끼임 탈출도 여기)');
  UI.openMenu('🎮 조작법', IS_TOUCH ? tc : pc, []);
};
UI.openSens = function () {
  const set = v => { G.sens = v; try { localStorage.setItem('sbc3d_sens', v); } catch (e) { } toast('🖱️ 감도 x' + v); };
  UI.openMenu('🖱️ 마우스 감도', '현재 x' + (G.sens || 1), [[0.5, '느리게'], [0.75, '조금 느리게'], [1, '보통'], [1.5, '빠르게'], [2.2, '매우 빠르게']].map(([v, t]) => ({ t: `${t} (x${v})`, p: '', fn: () => set(v) })));
};
