
// ================= ADMIN MODE + HELP + SETTINGS =================
// 관리자 비밀번호는 코드에 없음. 빌드할 때 ADMIN_PW(또는 ADMIN_HASH) 환경변수로 해시만 주입된다.
const ADMIN_HASH = '__ADMIN_HASH__';
function sha256hex(str) {
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  const b = new TextEncoder().encode(str), l = b.length, n = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(n); m.set(b); m[l] = 0x80;
  const dv = new DataView(m.buffer); dv.setUint32(n - 4, (l * 8) >>> 0); dv.setUint32(n - 8, Math.floor(l * 8 / 4294967296));
  let h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]; const w = new Array(64);
  const R = (x, c) => (x >>> c) | (x << (32 - c));
  for (let o = 0; o < n; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) { const s0 = R(w[i - 15], 7) ^ R(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = R(w[i - 2], 17) ^ R(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0; }
    let [a, bb, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) { const S1 = R(e, 6) ^ R(e, 11) ^ R(e, 25), ch = (e & f) ^ (~e & g), t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0, S0 = R(a, 2) ^ R(a, 13) ^ R(a, 22), mj = (a & bb) ^ (a & c) ^ (bb & c), t2 = (S0 + mj) >>> 0; hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = bb; bb = a; a = (t1 + t2) >>> 0; }
    h = [h[0] + a, h[1] + bb, h[2] + c, h[3] + d, h[4] + e, h[5] + f, h[6] + g, h[7] + hh].map(x => x >>> 0);
  }
  return h.map(x => x.toString(16).padStart(8, '0')).join('');
}
try { G.sens = parseFloat(localStorage.getItem('sbc3d_sens')) || 1; } catch (e) { G.sens = 1; }

const ADMIN = {
  on: false, pw: null, fails: 0, lockT: 0,
  enabled() { return ADMIN_HASH.length === 64; },
  check(pw) { return this.enabled() && sha256hex('sbc3d-admin:' + pw) === ADMIN_HASH; },
  open() {
    if (!this.enabled()) { toast('🔒 관리자 모드가 설정되지 않은 빌드'); return; }
    if (this.on) this.panel(); else this.login();
  },
  login() {
    UI.openMenu('🔐 관리자 로그인', '비밀번호를 입력하세요', [], { extra: '<input id="admPw" type="password" autocomplete="off" placeholder="비밀번호" style="width:100%;margin:10px 0;padding:11px 12px;border-radius:10px;border:1px solid #fff3;background:#0007;color:#fff;font-size:15px">' });
    const inp = $('#admPw'); setTimeout(() => inp && inp.focus(), 50);
    const go = () => {
      if (performance.now() < this.lockT) { toast('⏳ 잠시 후 다시 시도'); return; }
      if (this.check(inp.value)) { this.pw = inp.value; this.fails = 0; this.enter(); UI.closeMenu(); setTimeout(() => this.panel(), 60); }
      else { this.fails++; this.lockT = performance.now() + Math.min(30000, this.fails * 1500); sfx('error'); toast('❌ 비밀번호가 틀렸다'); inp.value = ''; }
    };
    inp.onkeydown = e => { if (e.key === 'Enter') go(); };
  },
  logout() { this.exit(); },
  // 호스트 권한이 필요한 동작은 호스트에게 비밀번호와 함께 요청
  remote(a, v) { if (G.isHost || !G.online) this.apply(a, v); else NET.send({ t: 'adm', a, v, pw: this.pw }); },
  apply(a, v) {
    if (a === 'time') { G.time = clamp(+v, 0, 23.99); toast('⏰ 시간 변경'); }
    else if (a === 'weather') { G.weather = v; G.weatherT = 600; toast('🌦️ 날씨 변경'); }
    else if (a === 'raid') { G.raidT = 0; toast('🔫 갱단 습격 시작!'); }
    else if (a === 'kick') this.kickOthers(false);
    else if (a === 'ban') this.kickOthers(true);
    else if (a === 'unban') { BANS.clear(); saveBans(); toast('✅ 밴 목록 초기화'); }
  },
  onNet(m) { if (!G.isHost) return; if (this.check(m.pw)) this.apply(m.a, m.v, m.f); else NET.send({ t: 'chat', m: '⚠ 관리자 인증 실패', sys: 1, to: m.f }); },
  tp(x, z) {
    if (ME.vehicle) exitVehicle(true); ME.x = x; ME.z = z; ME.y = groundHeight(x, z) + 0.3; ME.vx = ME.vz = ME.vy = 0;
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
      { ic: '🔒', t: '관리자 로그아웃', p: '', fn: () => this.logout() },
    ];
    UI.openMenu('🛠️ 관리자 패널', `<small style="opacity:.7">F2 또는 /admin 으로 열기${G.online && !G.isHost ? ' · 시간/날씨/습격은 방장에게 요청됨' : ''}</small>`, items, { refresh: R });
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
    const items = ['seoburi', 'plaza', 'jiolle', 'kaengjibe', 'disanbay', 'simone'].map(r => ({ ic: '📍', t: REGIONS[r].name, p: '', fn: () => fastTravel(r) }));
    items.push({ ic: '🚩', t: '웨이포인트로', p: '', dis: !UI.waypoint, disMsg: '지도(M)에서 웨이포인트를 먼저 찍어줘', fn: () => this.tp(UI.waypoint.x, UI.waypoint.z) });
    const o = [...G.players.values()][0]; items.push({ ic: '🤝', t: '상대 플레이어에게', p: '', dis: !o, disMsg: '다른 플레이어가 없다', fn: () => this.tp(o.x + 1.5, o.z + 1.5) });
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
    + sec('기타') + row('U', '끼임 탈출 · 뒤집힌 차 복구') + row('G|X', '춤 · 춤 멈추기') + row('T|Enter', '채팅') + row('M', '지도') + row('P|Tab|Esc', '휴대폰 메뉴') + row('F1', '이 도움말') + row('F2', '관리자')
    + `<div style="margin-top:12px;opacity:.7;font-size:12px">🪧 매물 표지판에서 땅을 사고 건축을 의뢰 · 🪓 도끼로 나무를 베어 판매 · 🐎 디산베이 목장에서 말</div>`;
  const tc = sec('터치') + row('조이스틱', '왼쪽: 이동 (끝까지 밀면 달리기)') + row('드래그', '오른쪽 화면: 시점') + row('🔥', '공격') + row('🎯', '조준') + row('⬆', '점프 / 차: 브레이크') + row('✋', '상호작용 · 탑승 · 하차') + row('📱', '휴대폰 메뉴 (끼임 탈출도 여기)');
  UI.openMenu('🎮 조작법', IS_TOUCH ? tc : pc, []);
};
UI.openSens = function () {
  const set = v => { G.sens = v; try { localStorage.setItem('sbc3d_sens', v); } catch (e) { } toast('🖱️ 감도 x' + v); };
  UI.openMenu('🖱️ 마우스 감도', '현재 x' + (G.sens || 1), [[0.5, '느리게'], [0.75, '조금 느리게'], [1, '보통'], [1.5, '빠르게'], [2.2, '매우 빠르게']].map(([v, t]) => ({ t: `${t} (x${v})`, p: '', fn: () => set(v) })));
};
