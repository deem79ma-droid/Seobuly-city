// @v 2026101218
// ================= 길찾기 · 나침반 · 장소 찾기 · 음식 메뉴 =================
// 방위: 북 = -z, 동 = +x (지도 위쪽이 북쪽)
const DIR8 = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
function bearingTo(x, z, fx = ME.x, fz = ME.z) { const a = Math.atan2(x - fx, -(z - fz)) * 180 / Math.PI; return (a + 360) % 360; } // 0 = 북, 90 = 동
function dir8(deg) { return DIR8[Math.round(((deg % 360) + 360) % 360 / 45) % 8]; }
function distTxt(m) { return m >= 1000 ? (m / 1000).toFixed(1) + 'km' : Math.round(m) + 'm'; }
function whereTxt(x, z) { const a = anchorOf(ME); return `${dir8(bearingTo(x, z, a.x, a.z))}쪽 ${distTxt(Math.hypot(x - a.x, z - a.z))}`; }

// 찾을 수 있는 장소 종류
const PLACE_KINDS = [
  { k: 'gun', ic: '🔫', name: '총포사', fac: ['gun'] },
  { k: 'clothes', ic: '👕', name: '옷가게', fac: ['clothes'] },
  { k: 'food', ic: '🍜', name: '음식점', fac: ['food'], bld: ['restaurant', 'food'] },
  { k: 'cafe', ic: '☕', name: '카페', bld: ['cafe'] },
  { k: 'mart', ic: '🏪', name: '편의점', bld: ['mart'] },
  { k: 'hospital', ic: '🏥', name: '병원', fac: ['hospital'] },
  { k: 'police', ic: '🚓', name: '경찰서', fac: ['police'] },
  { k: 'court', ic: '⚖️', name: '법원', fac: ['court'] },
  { k: 'factory', ic: '🏭', name: '공장 (목재·고기 팔기)', fac: ['factory'] },
  { k: 'dealer', ic: '🚗', name: '자동차 판매점', fac: ['dealer'] },
  { k: 'parking', ic: '🅿️', name: '주차장', fac: ['parking'] },
  { k: 'bank', ic: '🏦', name: '은행', bld: ['bank'] },
  { k: 'gym', ic: '💪', name: '헬스장', fac: ['gym'] },
  { k: 'casino', ic: '🎰', name: '카지노', fac: ['casino'] },
  { k: 'club', ic: '🪩', name: '클럽', fac: ['club'] },
  { k: 'home', ic: '🔑', name: '내 집', mine: 1 },
];
const NAV = {
  hud: null, cmp: null, arrow: null, beam: null, _t: 0,
  places(kind) {
    const out = []; const seen = new Set();
    if (kind.fac) for (const f of FACILITIES) if (kind.fac.includes(f.type)) { out.push({ x: f.x, z: f.z, name: f.name, ic: f.icon || kind.ic }); if (f.bld) seen.add(f.bld.id); }
    if (kind.bld) for (const b of BUILDINGS) if (kind.bld.includes(b.kind) && !seen.has(b.id)) out.push({ x: b.door.x, z: b.door.z, name: kind.k === 'food' ? FOOD.shop(b).name : b.name, ic: kind.k === 'food' ? FOOD.shop(b).ic : kind.ic });
    if (kind.mine) { for (const b of BUILDINGS) if (HOUSE.isHome(b) && HOUSE.mine(b) && !b.plot) out.push({ x: b.door.x, z: b.door.z, name: b.name, ic: '🔑' }); for (const p of PLOTS) if (p.owner === ME.id && p.state === 'done') out.push({ x: p.signPos[0], z: p.signPos[1], name: '내 건물', ic: '🏠' }); }
    const a = anchorOf(ME); for (const p of out) p.d = Math.hypot(p.x - a.x, p.z - a.z);
    return out.sort((p, q) => p.d - q.d);
  },
  open() {
    UI.openMenu('🧭 장소 찾기', '고르면 가까운 순서로 보여주고, 누르면 📍 표시해서 길을 안내해줘', PLACE_KINDS.map(k => { const n = this.places(k); return { ic: k.ic, t: k.name, p: '', d: n.length ? `가장 가까운 곳: ${dir8(bearingTo(n[0].x, n[0].z))}쪽 ${distTxt(n[0].d)}` : '없음', dis: !n.length, disMsg: k.mine ? '아직 산 집이 없다' : '근처에 없다', fn: () => { setTimeout(() => this.openKind(k), 30); } }; }).concat(UI.waypoint ? [{ ic: '❌', t: '📍 표시 지우기', p: '', fn: () => this.clear() }] : []));
  },
  openKind(k) {
    const list = this.places(k).slice(0, 8);
    UI.openMenu(`${k.ic} ${k.name}`, '누르면 📍 찍고 방향·거리 안내', list.map(p => ({ ic: p.ic, t: p.name, p: distTxt(p.d), d: `${dir8(bearingTo(p.x, p.z))}쪽`, fn: () => this.mark(p.x, p.z, `${p.ic} ${p.name}`) })).concat([{ ic: '↩️', t: '다른 장소', p: '', fn: () => { setTimeout(() => this.open(), 30); } }]));
  },
  mark(x, z, label) { UI.waypoint = { x, z, label: label || '📍 표시한 곳' }; sfx('ui'); toast(`📍 ${UI.waypoint.label} — ${whereTxt(x, z)}`, 3000); },
  clear() { UI.waypoint = null; toast('📍 표시를 지웠다'); },
  init() {
    if (this.hud) return;
    const css = document.createElement('style'); css.textContent = `
#navCmp{position:fixed;top:max(8px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);width:min(300px,56vw);height:30px;overflow:hidden;border-radius:9px;background:rgba(10,14,24,.55);border:1px solid rgba(255,255,255,.14);z-index:12;pointer-events:none;font:700 12px sans-serif;color:#dfe6f5}
#navCmp .tk{position:absolute;top:0;width:1px;height:6px;background:rgba(255,255,255,.35)}
#navCmp .lb{position:absolute;top:8px;transform:translateX(-50%);white-space:nowrap}
#navCmp .lb.n{color:#ff6a5a}
#navCmp .wp{position:absolute;top:4px;transform:translateX(-50%);font-size:14px}
#navCmp .ctr{position:absolute;left:50%;top:0;bottom:0;width:2px;margin-left:-1px;background:#ffd34a}
#navWp{position:fixed;top:calc(max(8px,env(safe-area-inset-top)) + 34px);left:50%;transform:translateX(-50%);z-index:12;pointer-events:none;padding:4px 12px;border-radius:9px;background:rgba(10,14,24,.6);border:1px solid rgba(255,211,74,.4);color:#fff;font:700 13px sans-serif;white-space:nowrap;display:none;align-items:center;gap:8px}
#navWp .ar{display:inline-block;color:#ffd34a;font-size:16px;transition:transform .1s linear}
body.touch #navCmp{width:min(220px,46vw);height:26px;font-size:11px}`;
    document.head.appendChild(css);
    const c = document.createElement('div'); c.id = 'navCmp'; document.body.appendChild(c); this.cmp = c;
    const h = document.createElement('div'); h.id = 'navWp'; h.innerHTML = '<span class="ar">▲</span><span class="tx"></span>'; document.body.appendChild(h); this.hud = h;
    const bm = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 80, 14, 1, true), new THREE.MeshBasicMaterial({ color: 0x4fd8ff, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }));
    bm.visible = false; bm.renderOrder = 5; scene.add(bm); this.beam = bm;
  },
  // 카메라가 보는 방향 (0 = 북)
  heading() { const y = CAM.yaw; return ((Math.atan2(Math.sin(y), -Math.cos(y)) * 180 / Math.PI) + 360) % 360; },
  tick(dt) {
    if (!this.cmp) return; if ((this._t -= dt) > 0) return; this._t = 0.08;
    const hd = this.heading(); const W = this.cmp.clientWidth || 260, half = W / 2, span = 75; // 화면 폭에 보이는 각도 ±75°
    let html = '<div class="ctr"></div>';
    for (let a = 0; a < 360; a += 15) {
      let r = ((a - hd + 540) % 360) - 180; if (Math.abs(r) > span) continue; const x = half + r / span * half;
      if (a % 45 === 0) html += `<div class="lb${a === 0 ? ' n' : ''}" style="left:${x}px">${DIR8[a / 45]}</div>`; else html += `<div class="tk" style="left:${x}px"></div>`;
    }
    const wp = UI.waypoint; const a = anchorOf(ME);
    if (wp) { const r = ((bearingTo(wp.x, wp.z, a.x, a.z) - hd + 540) % 360) - 180; const x = half + Math.max(-span, Math.min(span, r)) / span * half; html += `<div class="wp" style="left:${x}px">📍</div>`; }
    this.cmp.innerHTML = html;
    // 📍 안내: 이름 · 방향 · 거리 + 화살표
    if (wp && !ME.jail) {
      const d = Math.hypot(wp.x - a.x, wp.z - a.z);
      if (d < 7 && !INTERIOR.cur) { toast(`🏁 도착: ${wp.label || '표시한 곳'}`); UI.waypoint = null; this.hud.style.display = 'none'; if (this.beam) this.beam.visible = false; return; }
      const br = bearingTo(wp.x, wp.z, a.x, a.z); const rel = ((br - hd + 540) % 360) - 180;
      this.hud.style.display = 'flex'; this.hud.querySelector('.ar').style.transform = `rotate(${rel}deg)`;
      this.hud.querySelector('.tx').textContent = `${wp.label || '📍 표시한 곳'} · ${dir8(br)}쪽 ${distTxt(d)}`;
      if (this.beam) { this.beam.visible = !INTERIOR.cur; this.beam.position.set(wp.x, groundHeight(wp.x, wp.z) + 40, wp.z); }
    } else { this.hud.style.display = 'none'; if (this.beam) this.beam.visible = false; }
  },
};

// ================= 음식 =================
// 식당마다 종류가 다르다 (건물 번호로 정해짐 → 모두에게 같은 가게)
const CUISINE = [
  { k: 'kor', name: '한식당', ic: '🍚', menu: [['🍲', '김치찌개', 7000, 45], ['🥘', '된장찌개', 7000, 45], ['🍚', '비빔밥', 8000, 50], ['🍖', '제육볶음', 8500, 55], ['🍜', '냉면', 9000, 45], ['🥣', '순대국밥', 8000, 60]] },
  { k: 'snack', name: '분식집', ic: '🍢', menu: [['🍙', '김밥', 3000, 18], ['🌶️', '떡볶이', 4000, 22], ['🍢', '어묵', 2000, 10], ['🍤', '튀김 모둠', 4000, 20], ['🌭', '순대', 4000, 22], ['🍜', '라면', 4500, 25]] },
  { k: 'chn', name: '중식당', ic: '🥡', menu: [['🍝', '짜장면', 6000, 40], ['🍜', '짬뽕', 7500, 45], ['🍖', '탕수육', 15000, 70], ['🍚', '볶음밥', 7000, 40], ['🥟', '군만두', 5000, 25]] },
  { k: 'jpn', name: '일식집', ic: '🍣', menu: [['🍣', '초밥 세트', 15000, 60], ['🍛', '카레라이스', 8000, 40], ['🍜', '라멘', 9500, 45], ['🍤', '돈가스', 9000, 50], ['🍙', '우동', 7000, 35]] },
  { k: 'chk', name: '치킨집', ic: '🍗', menu: [['🍗', '후라이드 치킨', 18000, 80], ['🌶️', '양념 치킨', 19000, 80], ['🧄', '간장 치킨', 19000, 80], ['🍺', '치킨 + 맥주', 23000, 85, 'drunk']] },
  { k: 'piz', name: '피자집', ic: '🍕', menu: [['🍕', '페퍼로니 피자', 17000, 75], ['🧀', '치즈 피자', 15000, 70], ['🥔', '포테이토 피자', 19000, 80], ['🍝', '파스타', 12000, 50]] },
  { k: 'bur', name: '버거집', ic: '🍔', menu: [['🍔', '불고기 버거', 5500, 30], ['🍔', '치즈 버거', 5000, 28], ['🍟', '감자튀김', 2500, 12], ['🥤', '콜라', 2000, 5, 'stam'], ['🍔', '버거 세트', 8500, 45]] },
  { k: 'bbq', name: '고깃집', ic: '🥩', menu: [['🥓', '삼겹살 2인분', 28000, 100], ['🥩', '소갈비', 38000, 100], ['🍜', '물냉면', 9000, 40], ['🍶', '소주 한 병', 5000, 0, 'drunk']] },
];
const CAFE_MENU = [['☕', '아메리카노', 4500, 0, 'stam'], ['🥛', '카페라떼', 5000, 5, 'stam'], ['🍵', '녹차라떼', 5500, 5, 'stam'], ['🍰', '조각 케이크', 6500, 20], ['🥐', '크루아상', 4000, 15], ['🧋', '버블티', 6000, 8, 'stam'], ['🍪', '쿠키', 3000, 10]];
const FOOD = {
  shop(b) { const c = CUISINE[(b.id * 7 + 3) % CUISINE.length]; return { name: `${c.name}`, ic: c.ic, c }; },
  eat(it) {
    const [ic, name, price, hp, fx] = it;
    if (hp) ME.hp = Math.min(100, ME.hp + hp);
    if (fx === 'stam') ME.stamina = 100;
    if (fx === 'drunk') ME.drunk = Math.min(1, (ME.drunk || 0) + 0.35);
    if (ME.char) FX.emoji(ic, ME.x, ME.y + 2.1, ME.z, 0.4); sfx('ui');
    toast(`${ic} ${name} 냠냠${hp ? ` · +${hp} HP` : ''}${fx === 'stam' ? ' · 스태미나 회복' : ''}${fx === 'drunk' ? ' · 🥴 취기' : ''}`);
  },
  menuItems(menu) {
    const items = menu.map(it => ({ ic: it[0], t: it[1], p: it[2], d: `${it[3] ? '+' + it[3] + ' HP' : ''}${it[4] === 'stam' ? ' 스태미나 회복' : ''}${it[4] === 'drunk' ? ' 🥴 취함' : ''}`.trim(), stay: true, fn: () => this.eat(it) }));
    items.push({ ic: '🍱', t: '포장 (도시락)', p: 6000, d: '인벤토리 +1 · 언제든 +35 HP', stay: true, fn: () => { ME.inv.food = (ME.inv.food | 0) + 1; UI.updateInv(); toast('🍱 포장 완료'); } });
    return items;
  },
  open(b, cafe) {
    if (cafe) { UI.openMenu('☕ 카페', '음료는 스태미나를 채워준다', this.menuItems(CAFE_MENU)); return; }
    const s = b ? this.shop(b) : null;
    if (!s) { // 시설 음식점: 여러 종류를 모아 파는 푸드코트
      const menu = [CUISINE[0].menu[0], CUISINE[0].menu[2], CUISINE[1].menu[0], CUISINE[1].menu[1], CUISINE[2].menu[0], CUISINE[3].menu[3], CUISINE[4].menu[0], CUISINE[6].menu[4]];
      const items = this.menuItems(menu); if (ME.inv.meat) items.unshift({ ic: '🥩', t: '고기 구워먹기', p: 0, d: '고기 1개 → +45 HP', fn: () => { ME.inv.meat--; ME.hp = Math.min(100, ME.hp + 45); toast('🥩 고기를 구워 먹었다 +45 HP'); UI.updateInv(); } });
      UI.openMenu('🍜 푸드코트', '한식·분식·중식·일식·치킨·버거', items); return;
    }
    UI.openMenu(`${s.ic} ${s.name}`, '배를 채우면 체력이 회복된다', this.menuItems(s.c.menu));
  },
};
