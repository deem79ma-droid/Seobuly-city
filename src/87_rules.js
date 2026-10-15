// @v 2026101503

// ================= 지역 규정 (체계적인 지역별 법규) =================
// 모든 지역 규정은 이 표(REGION_RULES) 한 곳에서만 정한다. 게임 코드는 표를 읽기만 한다.
//   speed: 제한속도(km/h) · fine: 교통·발포 벌금 배율 · crime: 범죄 형량 배율 · gun: 총기 규정
const REGION_RULES = {
  plaza: { speed: 40, fine: 1.0, crime: 1.0, gun: 'ban', tip: '유흥가 — 음주운전 · 총기 모두 엄격' },
  seoburi: { speed: 60, fine: 1.2, crime: 1.1, gun: 'ban', tip: '대도시 — 벌금 20% 가중 · 순찰이 촘촘' },
  jiolle: { speed: 60, fine: 1.0, crime: 1.0, gun: 'ban', tip: '공업 도시 — 평균적인 단속' },
  kaengjibe: { speed: 70, fine: 0.6, crime: 0.8, gun: 'free', tip: '갱단 구역 — 단속이 느슨하다 · 대신 위험' },
  disanbay: { speed: 80, fine: 0.8, crime: 0.9, gun: 'hunt', tip: '시골 — 사냥용 총기 허용 (읍내 제외)' },
  simone: { speed: 50, fine: 1.3, crime: 1.2, gun: 'ban', tip: '휴양섬 — 관광객 보호 · 벌금 30% 가중' },
  kualp: { speed: 50, fine: 1.0, crime: 1.0, gun: 'hunt', tip: '만년설 눈길 — 차가 미끄러진다 · 사냥 허용 (스키 마을 제외)' },
  chiga: { speed: 70, fine: 0.9, crime: 1.4, gun: 'permit', tip: '무역항 — 구시가 총기 금지 · 밀수/강도 형량 가중' },
  sea: { speed: 90, fine: 1.0, crime: 1.0, gun: 'free', tip: '' },
};
const ZONE_FX = {
  17: { tip: '스키 마을 — 눈길(미끄러움) · 마을 안 총기 금지 · 안전한 휴양지' },
  18: { tip: '설봉 지대 — 혹한! 야외에서 체력(스태미나)이 계속 닳는다 · 늑대·곰 · 눈이 깊어 차가 잘 안 나간다', cold: 1.6 },
  19: { tip: '빙호 — 꽁꽁 언 호수 지대 · 얼음판이라 차가 거의 제어 안 된다 · 낚시·사냥', cold: 0.4 },
  20: { tip: '구시가 — 흙벽돌 시장통 · 총기 금지 · 밀수/강도 형량 가중' },
  21: { tip: '오아시스 — 야자수 그늘 · 야외에서 스태미나가 빨리 회복 · 낙타 · 형량 소폭 가중', rest: 1.5 },
  22: { tip: '메사 협곡 — 낮 폭염(9~18시)에 스태미나가 닳는다 · 무법지대(형량 x0.6 · 총기 자유) · 모래길이라 약간 미끄럽다', heat: 1.4 },
};
const GUN_TXT = { ban: '총기 금지', free: '총기 자유', hunt: '사냥만 허용', permit: '구시가 금지' };
const RULES = {
  at(x, z) { return REGION_RULES[regionAt(x, z)] || REGION_RULES.sea; },
  // 이 자리에서 총을 쏘면 불법인가?
  // ---- 소구역(쿠알프스드 3 · 치가커렌 3) 특색 ----
  grip(x, z) { const d = districtAt(x, z); return d === 19 ? 0.3 : d === 18 ? 0.45 : d === 17 ? 0.6 : d === 22 ? 0.85 : d === 21 ? 0.9 : 1; },
  crimeAt(x, z) { const d = districtAt(x, z); return (RULES.at(x, z).crime || 1) * (d === 22 ? 0.6 : d === 21 ? 1.2 : 1); },
  zone(x, z) { return ZONE_FX[districtAt(x, z)] || null; },
  lastD: 0, zT: 0,
  tick(dt) {
    if (!G.started || ADMIN.on || ME.dead || ME.jail) return; if ((this.zT -= dt) > 0) return; this.zT = 0.5;
    const a = anchorOf(ME); const d = districtAt(a.x, a.z); const Z = ZONE_FX[d];
    if (d !== this.lastD) { this.lastD = d; if (Z) { const D = DISTRICTS.find(q => q.id === d); toast(`${D.name} — ${Z.tip}`, 4500); } }
    if (!Z || INTERIOR.cur || ME.vehicle) return;
    const hot = G.time > 9 && G.time < 18;
    if (Z.cold) ME.stamina = Math.max(0, ME.stamina - 0.5 * Z.cold); // 0.5초마다 호출
    if (Z.heat && hot) ME.stamina = Math.max(0, ME.stamina - 0.5 * Z.heat);
    if (Z.rest) ME.stamina = Math.min(100, ME.stamina + 0.5 * Z.rest);
    if ((Z.cold || (Z.heat && hot)) && ME.stamina <= 0 && (this.wT = (this.wT || 0) + 1) % 8 === 1) toast(Z.cold ? '🥶 너무 춥다 — 지쳐서 달릴 수 없다 (건물·차 안에서 쉬어라)' : '🥵 폭염에 지쳤다 — 그늘·차 안이나 오아시스에서 쉬어라', 3000);
  },
  gunBanned(x, z) {
    const r = regionAt(x, z), g = (REGION_RULES[r] || REGION_RULES.sea).gun; if (g === 'ban') return true; if (g === 'free') return false;
    const d = districtAt(x, z); if (g === 'hunt') return d === 14 || (d === 17 && Math.hypot(x - KUALP_TOWN.x, z - KUALP_TOWN.z) < 430); if (g === 'permit') return d === 20 && d !== 22 && Math.hypot(x - CHIGA_TOWN.x, z - CHIGA_TOWN.z) < 520; return false;
  },
  line(r) { const q = REGION_RULES[r]; return `제한 ${q.speed}km/h · 벌금 x${q.fine} · 형량 x${q.crime} · ${GUN_TXT[q.gun]}`; },
  // 총을 쐈을 때: 금지 구역이고 목격자가 있으면 공공장소 발포
  onShot() {
    if (ADMIN.on || ME.dead || !RULES.gunBanned(ME.x, ME.z)) return;
    if (LAWX.witness(ME.x, ME.z, 45, ME.id)) JOBS.crime('gunfire', true);
  },
  card() {
    const cur = regionAt(anchorOf(ME).x, anchorOf(ME).z); const rows = [];
    for (const id of ['plaza', 'seoburi', 'jiolle', 'kaengjibe', 'disanbay', 'simone', 'kualp', 'chiga']) { const q = REGION_RULES[id]; rows.push(`<div class="vr"><span>${id === cur ? '▶ ' : ''}${REGIONS[id].name}</span><b${id === cur ? ' style="color:#ffd34a"' : ''}>${this.line(id)}</b></div>`); }
    const q = REGION_RULES[cur];
    for (const id of [17, 18, 19, 20, 21, 22]) { const D = DISTRICTS.find(q => q.id === id); rows.push(`<div class="vr"><span>${D.name}</span><b>${ZONE_FX[id].tip}</b></div>`); }
    POLICE.showCard('지역 규정집', q && q.tip ? REGIONS[cur].name : '', q && q.tip ? q.tip : '지역마다 법규가 다르다', rows.join(''));
  },
};
