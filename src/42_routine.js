
// ================= NPC 일과 (시간대별 직업 · 행동) =================
// 방장 화면에서만 판단한다(상태는 기존 동기화로 게스트에게 전달). 결정은 몇 초에 한 번만 → 모바일에서도 가볍다.
const JOB_LINES = {
  commute: ['지각이다 지각!', '오늘도 출근…', '퇴근하고 싶다', '회의 몇 시였지?'], shop: ['장 보러 가야지', '세일한다던데', '뭐 사러 왔더라?'],
  jog: ['헉헉… 3km 남았다', '조깅 최고!', '오늘은 한 바퀴 더!'], bench: ['아이고 다리야', '날씨 좋다~', '잠깐 쉬었다 가자'],
  phone: ['여보세요? 응, 지금 가는 중', '아 진짜? 대박', '나중에 다시 걸게'], delivery: ['배달 왔습니다!', '다음 집 어디였지', '빨리빨리!'],
  home: ['이제 집에 가야지', '피곤하다… 자러 가자'], patrol: ['순찰 중입니다', '이상 무!', '안전 운전하세요'], hang: ['우리 구역에서 뭐 해?', '뭘 봐?', '형님 언제 오냐'],
  work: ['공사중입니다!', '안전모 필수!'], clerk: ['어서오세요~', '1+1 행사 중이에요', '찾으시는 거 있으세요?'],
};
const JOB_NAME = { commute: '직장인', shop: '쇼핑객', jog: '조깅', bench: '휴식', phone: '통화 중', delivery: '배달원', home: '귀가', patrol: '순찰', hang: '조직원', work: '작업자', clerk: '점원', walk: '산책' };
function isNight() { return G.time >= 23 || G.time < 5; }
function pedPickJob(p) {
  const h = G.time;
  if (p.kind === 'police') return Math.random() < 0.8 ? 'patrol' : 'phone';
  if (p.kind === 'gangA' || p.kind === 'gangB') return Math.random() < 0.7 ? 'hang' : 'walk';
  if (p.kind === 'worker') return Math.random() < 0.65 ? 'work' : 'commute';
  if (p.kind === 'medic') return Math.random() < 0.7 ? 'work' : 'commute';
  const rush = (h >= 7 && h < 9.5) || (h >= 17 && h < 19.5), early = h >= 5 && h < 8, eve = h >= 18 && h < 22, day = h >= 9 && h < 21;
  const w = { commute: rush ? 4 : 0.5, shop: day ? 2.2 : 0.2, jog: early || eve ? 1.6 : 0.25, bench: day ? 1.5 : 0.3, phone: 0.8, delivery: h >= 10 && h < 22 ? 1 : 0.2, walk: 1.4, home: isNight() ? 4 : h >= 21 ? 1.5 : 0.15 };
  let tot = 0; for (const k in w) tot += w[k]; let r = Math.random() * tot; for (const k in w) { r -= w[k]; if (r <= 0) return k; } return 'walk';
}
function pedJobSpeed(p) { const j = p.job; return j === 'jog' ? 3.4 : j === 'delivery' ? 2.1 : j === 'commute' ? 1.8 : j === 'patrol' ? 1.5 : j === 'hang' ? 0.9 : 1.35 + (p.seed % 5) * 0.08; }
function pedSayJob(p) { if (p.char && Math.random() < 0.5) p.char.say(pick(JOB_LINES[p.job] || PED_LINES[p.kind] || PED_LINES.civ), 3.5); }
// 스폰 직후: 직업 정하기 + 일부는 건물 문에서 걸어 나오거나(점원은 가게 앞에 선다)
function pedStartRoutine(p) {
  p.job = pedPickJob(p); p.jobT = rnd(6, 20); p.goal = null; p.ax = p.x; p.az = p.z;
  if (p.kind !== 'civ' || p.state !== 'walk') return;
  const h = G.time; if (h < 6 || h >= 23) return;
  const near = buildingsNear(p.x, p.z); let best = null, bd = 30;
  for (const b of near) { const d = Math.hypot(b.door.x - p.x, b.door.z - p.z); if (d < bd && Math.abs(groundHeight(b.door.x, b.door.z) - p.y) < 2) { bd = d; best = b; } }
  if (!best) return;
  if (best.fac && Math.random() < 0.25 && h >= 8 && h < 22) { // 가게 앞 점원
    p.job = 'clerk'; p.x = best.door.x + best.door.sx * 0.8; p.z = best.door.z + best.door.sz * 0.8; p.y = groundHeight(p.x, p.z); p.yaw = Math.atan2(best.door.sx, best.door.sz); p.state = 'idle'; p.timer = rnd(40, 90); return;
  }
  if (Math.random() < 0.35) { p.x = best.door.x; p.z = best.door.z; p.y = groundHeight(p.x, p.z); snapToNearestEdge(p); } // 건물에서 나와 인도로
}
// 걷는 중 일과 판단 (몇 초에 한 번)
function pedRoutineTick(p, dt) {
  if ((p.jobT = (p.jobT ?? 8) - dt) > 0) return false;
  p.jobT = rnd(5, 12);
  // Change activities over time instead of repeating a single routine forever.
  if (Math.random() < 0.13) { p.job = pedPickJob(p); p.jobT = rnd(10, 28); }
  const j = p.job || 'walk';
  if (j === 'commute' || j === 'shop' || j === 'home' || j === 'delivery') {
    if (Math.random() < (j === 'home' ? 0.7 : j === 'delivery' ? 0.6 : 0.35)) { // 근처 건물로 들어간다
      let best = null, bd = 24;
      for (const b of buildingsNear(p.x, p.z)) { if (j === 'shop' && !b.fac && Math.random() < 0.6) continue; const d = Math.hypot(b.door.x - p.x, b.door.z - p.z); if (d < bd && d > 2 && Math.abs(groundHeight(b.door.x, b.door.z) - p.y) < 2) { bd = d; best = b; } }
      if (best) { p.state = 'goto'; p.goal = { x: best.door.x, z: best.door.z, act: 'enter' }; p.gT = 0; pedSayJob(p); return true; }
    }
  } else if (j === 'bench' || (j === 'walk' && Math.random() < 0.2)) {
    let best = null, bd = 45;
    for (const b of BENCHES) { if (b.taken && b.taken > G.t) continue; const d = Math.hypot(b.x - p.x, b.z - p.z); if (d < bd) { bd = d; best = b; } }
    if (best) { best.taken = G.t + 70; p.state = 'goto'; p.goal = { x: best.x + Math.sin(best.yaw) * 0.8, z: best.z + Math.cos(best.yaw) * 0.8, act: 'sit', b: best }; p.gT = 0; return true; }
  } else if (j === 'phone' && Math.random() < 0.6) { p.state = 'idle'; p.timer = rnd(6, 14); p.phone = true; pedSayJob(p); return true; }
  else if (j === 'patrol' && Math.random() < 0.35) { p.state = 'idle'; p.timer = rnd(3, 6); pedSayJob(p); return true; }
  else if (j === 'jog' && Math.random() < 0.15) { p.state = 'idle'; p.timer = rnd(3, 6); p.act = 'drink'; p.actT = 0; pedSayJob(p); return true; } // 물 한 모금
  if (Math.random() < 0.2) pedSayJob(p);
  return false;
}
function pedGoto(p, dt) {
  const g = p.goal; if (!g) { p.state = 'walk'; snapToNearestEdge(p); return; }
  p.gT = (p.gT || 0) + dt; const dx = g.x - p.x, dz = g.z - p.z, d = Math.hypot(dx, dz);
  if (p.gT > 25) { p.goal = null; p.state = 'walk'; snapToNearestEdge(p); return; } // 길이 막힘 → 포기
  if (d < 0.7) {
    if (g.act === 'enter') { p.state = 'parked'; p.goal = null; p.nextTry = G.t + rnd(4, 12); return; } // 건물 안으로 들어감
    if (g.act === 'sit') { const b = g.b; p.state = 'sit'; p.x = b.x - Math.sin(b.yaw) * 0.05; p.z = b.z - Math.cos(b.yaw) * 0.05; p.y = b.y ?? groundHeight(b.x, b.z); p.yaw = b.yaw; p.spd = 0; p.timer = rnd(20, 50); p.goal = null; pedSayJob(p); return; }
  }
  p.spd = p.job === 'jog' ? 3.2 : 1.6; p.yaw = dampAng(p.yaw, Math.atan2(dx, dz), 7, dt);
  p.x += Math.sin(p.yaw) * p.spd * dt; p.z += Math.cos(p.yaw) * p.spd * dt;
  const r = resolveCircle(p.x, p.z, 0.3, p.y, 1.7); p.x = r.x; p.z = r.z; p.y = groundHeight(p.x, p.z, p.y + 1);
}
// 갱단: 자기 구역(스폰 지점) 근처에서 어슬렁거린다
function pedLoiter(p, dt) {
  if (p.lx === undefined || Math.hypot(p.lx - p.x, p.lz - p.z) < 0.6) {
    if (p.timer > 0 && p.spd === 0) return; // 서서 쉬는 중
    if (p.lx !== undefined && Math.random() < 0.6) { p.spd = 0; p.timer = rnd(3, 9); p.lx = p.x; p.lz = p.z; if (Math.random() < 0.3) pedSayJob(p); return; }
    const a = Math.random() * TAU, r = rnd(1, 6); p.lx = (p.ax ?? p.x) + Math.sin(a) * r; p.lz = (p.az ?? p.z) + Math.cos(a) * r;
  }
  if (p.timer > 0 && p.spd === 0) return;
  const dx = p.lx - p.x, dz = p.lz - p.z; p.spd = 0.9; p.yaw = dampAng(p.yaw, Math.atan2(dx, dz), 5, dt);
  p.x += Math.sin(p.yaw) * p.spd * dt; p.z += Math.cos(p.yaw) * p.spd * dt;
  const r = resolveCircle(p.x, p.z, 0.3, p.y, 1.7); if (r.hit) p.lx = undefined; p.x = r.x; p.z = r.z; p.y = groundHeight(p.x, p.z, p.y + 1);
}
