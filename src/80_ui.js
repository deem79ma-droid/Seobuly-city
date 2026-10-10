
// ================= UI =================
function toast(msg, dur = 2600) { const t = document.createElement('div'); t.className = 'toast panel'; t.textContent = msg; $('#toasts').appendChild(t); setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = 0; setTimeout(() => t.remove(), 400); }, dur); while ($('#toasts').children.length > 5) $('#toasts').firstChild.remove(); }
let annT = 0;
function announce(a, b = '') { const el = $('#bigMsg'); el.innerHTML = `${a}<small>${b}</small>`; el.style.opacity = 1; clearTimeout(annT); annT = setTimeout(() => el.style.opacity = 0, 3200); sfx('levelup'); }
const UI = {
  menuOpen: false, mapOpen: false, waypoint: null, lastRegion: '',
  init() {
    $('#mapClose').onclick = () => this.closeMap();
    $('#bigmapC').addEventListener('click', e => { const r = e.target.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * 1400, y = (e.clientY - r.top) / r.height * 900; const w = this.mapToWorld(x, y); this.waypoint = w; toast('📍 목적지 설정'); this.drawBigMap(); });
    $('#menu').addEventListener('click', e => { if (e.target.id === 'menu') this.closeMenu(); });
    this.buildHotbar();
    if (IS_TOUCH) this.buildTouch();
    setInterval(() => { if (G.started) this.updateHud(); }, 250);
  },
  // ---------- HUD ----------
  updateHud() {
    { const adm = ADMIN.on && ADMIN.ready; const k = ME.name + '|' + adm; const el = $('#myName'); if (el && el._k !== k) { el._k = k; el.innerHTML = '🙂 <span></span>' + (adm ? '<span class="admBadge">👑 관리자</span>' : ''); el.querySelector('span').textContent = ME.name; } }
    $('#money').textContent = fmtMoney(ME.money);
    $('#hpBar i').style.width = clamp(ME.hp, 0, 100) + '%'; $('#arBar i').style.width = clamp(ME.armor, 0, 100) + '%'; $('#arBar').style.display = ME.armor > 0 ? '' : 'none'; $('#stBar i').style.width = ME.stamina + '%';
    const AP = ME.vehicle ? ME.vehicle : anchorOf(ME); const R = regionAt(AP.x, AP.z); const RG = REGIONS[R];
    const regionChanged = R !== this.lastRegion;
    if (regionChanged) { this.lastRegion = R; $('#regionName').textContent = RG.name; $('#regionName').style.color = RG.color; $('#regionSub').textContent = RG.desc; if (G.t > 3 && R !== 'sea') announce(RG.name, RG.desc); }
    const px = AP.x, pz = AP.z; const dId = districtAt(px, pz);
    if (dId !== this.lastDistrict) { const D = DISTRICTS[dId - 1]; this.lastDistrict = dId; const zn = $('#zoneName'); zn.textContent = D ? `📍 ${D.id}구역 · ${D.name}` : '🌊 바다 (구역 밖)'; zn.style.color = D ? DISTRICT_COLORS[dId - 1] : '#9ab'; if (D && G.t > 3 && !regionChanged) toast(`📍 ${D.id}구역 · ${D.name}`, 2200); }
    const h = Math.floor(G.time), mi = Math.floor((G.time - h) * 60); const wt = { clear: '☀️ 맑음', cloudy: '☁️ 흐림', rain: '🌧️ 비' }[G.weather];
    $('#clock').textContent = `${G.day}일차 ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')} · ${ENV.night > 0.5 && G.weather === 'clear' ? '🌙 밤' : wt}`;
    this.updateStars(); this.updateInv();
    const v = ME.vehicle; $('#speedo').classList.toggle('hidden', !v); if (v) $('#speedo').innerHTML = `${Math.round(Math.abs(v.speed) * 3.6)}<small>km/h · ${v.M.name}${v.hp < v.M.hp * 0.3 ? ' · ⚠ 파손' : ''}</small>`;
    $('#cross').classList.toggle('hidden', !(ME.aiming || (!WEAPONS[ME.weapon].melee && !ME.vehicle)) || ME.dead);
  },
  updateStars(flash) { let s = ''; for (let i = 0; i < 5; i++) s += `<span class="${i < ME.wanted ? 'on' : ''}">★</span>`; $('#stars').innerHTML = ME.wanted ? s : ''; },
  updateInv() { const i = ME.inv; const parts = []; if (i.wood) parts.push(`🪵${i.wood}`); if (i.meat) parts.push(`🥩${i.meat}`); if (i.food) parts.push(`🍱${i.food}`); if (i.medkit) parts.push(`🩹${i.medkit}`); if (i.drink) parts.push(`🍺${i.drink}`); $('#inv').textContent = parts.join('  ') || '인벤토리 비어있음'; },
  buildHotbar() { const hb = $('#hotbar'); hb.innerHTML = ''; WEAPON_ORDER.forEach((w, i) => { if (!ME.weapons[w]) return; const s = document.createElement('span'); s.textContent = `${i + 1} ${WEAPONS[w].icon}`; s.className = ME.weapon === w ? 'on' : ''; hb.appendChild(s); }); },
  updateWeapon() { const W = WEAPONS[ME.weapon]; $('#wName').textContent = `${W.icon} ${W.name}`; $('#wAmmo').textContent = W.melee ? (W.chop ? '나무를 베면 목재 획득' : '') : `${ME.mag[ME.weapon] || 0} / ${ME.ammo[ME.weapon] || 0}${ME.reloadT > 0 ? ' · 재장전…' : ''}`; this.buildHotbar(); },
  damageFlash(a) { const e = $('#dmgFlash'); e.style.transition = 'none'; e.style.opacity = Math.min(0.9, 0.3 + a); requestAnimationFrame(() => { e.style.transition = 'opacity .5s'; e.style.opacity = 0; }); },
  hitMarker() { const c = $('#cross'); c.classList.add('hit'); clearTimeout(this._hm); this._hm = setTimeout(() => c.classList.remove('hit'), 120); sfx('hit', undefined, undefined, 0.3); },
  setPrompt(it) { const el = $('#prompt'); if (!it) { el.classList.add('hidden'); return; } el.classList.remove('hidden'); el.innerHTML = IS_TOUCH ? `<kbd>${it.key === 'F' ? '🚗' : '✋'}</kbd>${it.label}` : `<kbd>${it.key}</kbd>${it.label}`; },
  // ---------- chat ----------
  openChat() { const i = $('#chatIn'); i.classList.remove('hidden'); i.focus(); if (document.pointerLockElement) document.exitPointerLock(); },
  closeChat() { const i = $('#chatIn'); i.value = ''; i.classList.add('hidden'); i.blur(); },
  sendChat() {
    const i = $('#chatIn'); const m = i.value.trim(); this.closeChat(); if (!m) return;
    if (m.startsWith('/')) { this.command(m); return; }
    this.chatLine(displayName(ME.id, ME.name), m); ME.char.say(m); NET.send({ t: 'chat', m });
  },
  command(m) {
    const [c, a] = m.slice(1).split(/\s+/);
    if (c === 'admin' || c === '관리자') { ADMIN.open(); return; }
    if (!ADMIN.hostPower()) { toast(G.adminId ? '👑 관리자가 방장 권한을 가지고 있다' : '명령어는 방장만 사용 가능'); return; }
    if (G.adminId && G.adminId !== ME.id) return;
    if (c === '시간' || c === 'time') { G.time = clamp(parseFloat(a) || 12, 0, 23.99); toast('⏰ 시간 변경'); }
    else if (c === '날씨' || c === 'weather') { G.weather = { 비: 'rain', 맑음: 'clear', 흐림: 'cloudy' }[a] || a || 'clear'; G.weatherT = 600; toast('🌦️ 날씨 변경'); }
    else if (c === '습격' || c === 'raid') { G.raidT = 0; }
    else toast('명령어: /시간 20, /날씨 비|맑음|흐림, /습격, /admin');
  },
  chatLine(name, msg) { const d = document.createElement('div'); if (!name) { d.className = 'sys'; d.textContent = msg; } else { d.innerHTML = `<b></b> `; d.querySelector('b').textContent = name; d.appendChild(document.createTextNode(msg)); } $('#chatLog').appendChild(d); while ($('#chatLog').children.length > 7) $('#chatLog').firstChild.remove(); setTimeout(() => { d.style.transition = 'opacity 1s'; d.style.opacity = 0; setTimeout(() => d.remove(), 1000); }, 15000); },
  // ---------- menu ----------
  openMenu(title, desc, items, opts = {}) {
    this.menuOpen = true; if (document.pointerLockElement) document.exitPointerLock();
    const box = $('#menuBox'); box.innerHTML = `<h2></h2><div class="desc"></div><div class="items"></div>${opts.extra || ''}<button class="btn b3 close">닫기</button>`;
    box.querySelector('h2').textContent = title; box.querySelector('.desc').innerHTML = desc || '';
    const wrap = box.querySelector('.items');
    for (const it of items) {
      const b = document.createElement('button'); b.className = 'item' + (it.dis ? ' dis' : '');
      b.innerHTML = `${it.ic ? `<span class="ic">${it.ic}</span>` : ''}<span class="t"></span>${it.p !== undefined ? `<span class="p">${typeof it.p === 'number' ? fmtMoney(it.p) : it.p}</span>` : ''}${it.d ? `<span class="d"></span>` : ''}`;
      b.querySelector('.t').textContent = it.t; if (it.d) b.querySelector('.d').textContent = it.d;
      b.onclick = () => { AU.init(); sfx('ui'); if (it.dis) { toast(it.disMsg || '사용할 수 없다'); return; } if (typeof it.p === 'number' && it.p > 0 && !it.free) { if (ME.money < it.p) { toast('💸 돈이 부족하다'); sfx('error'); return; } ME.money -= it.p; } const keep = it.fn && it.fn(b); if (!keep && !it.stay) this.closeMenu(); else if (opts.refresh) opts.refresh(); };
      wrap.appendChild(b);
    }
    box.querySelector('.close').onclick = () => this.closeMenu();
    $('#menu').classList.remove('hidden'); if (opts.after) opts.after(box);
  },
  closeMenu() { this.menuOpen = false; $('#menu').classList.add('hidden'); clearInterval(this._mg); },
  // ---------- facility ----------
  openFacility(f) {
    sfx('door'); const skillUp = (k, name) => { if (ME.skills[k] >= 5) { toast('이미 최고 레벨!'); return; } ME.skills[k]++; sfx('levelup'); toast(`📈 ${name} 레벨 ${ME.skills[k]}`); };
    const heal = (n) => { ME.hp = Math.min(100, ME.hp + n); };
    switch (f.type) {
      case 'police': this.openMenu('🚓 경찰서', `${REGIONS[f.region].name} 경찰서. 현재 수배 ★${ME.wanted}`, [
        { ic: '💸', t: '벌금 내고 수배 해제', p: ME.wanted * 2500 || 0, d: '★당 ₩2,500', dis: !ME.wanted, disMsg: '수배 중이 아니다', fn: () => { ME.wanted = 0; toast('✅ 수배 해제'); } },
        { ic: '🪪', t: `출소카드 구입 (보유 ${ME.inv.card | 0})`, p: 25000, d: '수감 중 E 로 즉시 출소', stay: true, fn: () => { ME.inv.card = (ME.inv.card | 0) + 1; toast('🪪 출소카드 +1'); } },
        { ic: '📞', t: '갱단 원한 해제 상담', p: 5000, d: '레드/블루 갱이 더 이상 노리지 않음', fn: () => { ME.grudge = {}; toast('🤝 갱단 원한이 풀렸다'); } },
        { ic: '🚔', t: '압류 차량 찾기', p: 1500, d: '내 차를 경찰서 앞으로', dis: !ME.garage.length, disMsg: '보유 차량 없음', fn: () => this.openGarage(f.x, f.z) }]); break;
      case 'hospital': this.openMenu('🏥 병원', '치료와 의약품', [
        { ic: '💉', t: '치료받기', p: 300, d: '체력 100으로 회복', fn: () => { ME.hp = 100; sfx('levelup'); toast('❤️ 완치!'); } },
        { ic: '🩹', t: '구급상자 구매', p: 800, d: '인벤토리 +1 (사용: 휴대폰 메뉴)', fn: () => { ME.inv.medkit++; } },
        { ic: '🧪', t: '건강검진 (스태미나 회복)', p: 200, fn: () => { ME.stamina = 100; } }]); break;
      case 'dealer': this.openDealer(f); break;
      case 'factory': this.openMenu('🏭 공장', '목재·고기 매입, 아르바이트', [
        { ic: '🪵', t: `목재 판매 (${ME.inv.wood}개)`, p: '개당 ₩180', free: true, dis: !ME.inv.wood, disMsg: '목재가 없다 — 도끼로 나무를 베자', fn: () => { const a = ME.inv.wood * 180; ME.money += a; ME.inv.wood = 0; sfx('cash'); toast(`💰 +${fmtMoney(a)}`); } },
        { ic: '🥩', t: `고기 판매 (${ME.inv.meat}개)`, p: '개당 ₩350', dis: !ME.inv.meat, disMsg: '고기가 없다', fn: () => { const a = ME.inv.meat * 350; ME.money += a; ME.inv.meat = 0; sfx('cash'); toast(`💰 +${fmtMoney(a)}`); } },
        { ic: '⚙️', t: '공장 아르바이트', p: '타이밍 미니게임', d: '성공할 때마다 ₩300', fn: () => { this.factoryGame(); return true; } }]); break;
      case 'school': this.openMenu('🏫 학교', '스킬을 배우자 (최대 5레벨)', [
        { ic: '🚗', t: `운전 교육 (Lv ${ME.skills.drive})`, p: 2000, d: '차량 핸들링 향상', fn: () => skillUp('drive', '운전') },
        { ic: '🏃', t: `체육 수업 (Lv ${ME.skills.fit})`, p: 1500, d: '달리기 속도·스태미나', fn: () => skillUp('fit', '체력') },
        { ic: '📖', t: `자습 (Lv ${ME.skills.study})`, p: 0, d: '공부하면 알바 수익 증가', fn: () => skillUp('study', '지식') }]); break;
      case 'academy': this.openMenu('📚 학원', '전문 학원', [
        { ic: '🎯', t: `사격 학원 (Lv ${ME.skills.shoot})`, p: 3000, d: '명중률·데미지 증가', fn: () => skillUp('shoot', '사격') },
        { ic: '🥋', t: `격투 도장 (Lv ${ME.skills.fight})`, p: 3000, d: '주먹·근접 데미지 증가', fn: () => skillUp('fight', '격투') },
        { ic: '🏊', t: `수영 강습 (Lv ${ME.skills.swim})`, p: 1500, fn: () => skillUp('swim', '수영') }]); break;
      case 'food': this.openMenu('🍜 음식점', '배를 채우면 체력이 회복된다', [
        { ic: '🍙', t: '김밥', p: 500, d: '+15 HP', fn: () => heal(15) }, { ic: '🍜', t: '라면', p: 900, d: '+25 HP', fn: () => heal(25) },
        { ic: '🍗', t: '치킨', p: 3000, d: '+60 HP', fn: () => heal(60) }, { ic: '🥩', t: '고기 구워먹기', p: 0, d: '고기 1개 → +45 HP', dis: !ME.inv.meat, disMsg: '고기가 없다', fn: () => { ME.inv.meat--; heal(45); } },
        { ic: '🍱', t: '도시락 포장', p: 1200, d: '인벤토리 +1 (언제든 +35HP)', fn: () => { ME.inv.food++; } }]); break;
      case 'pcbang': this.openMenu('🖥️ PC방', '1시간 ₩1,000 · 에임 대회 상금!', [{ ic: '🎮', t: '에임 대회 참가', p: 1000, d: '10초 안에 타겟 클릭 → 상금', fn: () => { this.aimGame(); return true; } }]); break;
      case 'gym': this.openMenu('💪 헬스장', '', [{ ic: '🏋️', t: `웨이트 (Lv ${ME.skills.fit})`, p: 1200, d: '체력 스킬 +1', fn: () => skillUp('fit', '체력') }, { ic: '🥤', t: '프로틴 쉐이크', p: 500, d: '+10 HP · 스태미나 회복', fn: () => { heal(10); ME.stamina = 100; } }, { ic: '🥊', t: `복싱 (Lv ${ME.skills.fight})`, p: 2000, fn: () => skillUp('fight', '격투') }]); break;
      case 'pool': this.openMenu('🏊 수영장', '', [{ ic: '🏊', t: '자유 수영', p: 800, d: '+30 HP · 수영 스킬', fn: () => { heal(30); if (ME.skills.swim < 5) ME.skills.swim++; toast('🏊 상쾌하다!'); } }, { ic: '🧖', t: '사우나', p: 1500, d: 'HP 100', fn: () => { ME.hp = 100; } }]); break;
      case 'zoo': this.openMenu('🦁 동물원', `${REGIONS[f.region].name} 동물원 — 사자·코끼리·기린·얼룩말·곰·펭귄`, [{ ic: '🎟️', t: '입장권', p: 1000, d: '맹수 우리에 들어가면 위험!', fn: () => { ME.inv.ticket++; toast('🎟️ 즐거운 관람 되세요!'); } }, { ic: '🥕', t: '동물 사료', p: 200, d: '음식 +1 (동물에게 먹이 주기)', fn: () => ME.inv.food++ }]); break;
      case 'gun': this.openGun(); break;
      case 'clothes': this.openClothes(); break;
      case 'club': this.openMenu('🪩 클럽 네온 · 바', '플로어에서 G로 춤추기!', [
        { ic: '🍺', t: '맥주', p: 300, d: '취기 +', fn: () => { ME.drunk = Math.min(1.2, ME.drunk + 0.3); ME.action = 'drink'; ME.actionT = 0; } },
        { ic: '🍸', t: '칵테일', p: 900, d: '취기 ++ · HP+5', fn: () => { ME.drunk = Math.min(1.2, ME.drunk + 0.5); ME.hp = Math.min(100, ME.hp + 5); } },
        { ic: '🥤', t: '해장 음료', p: 500, d: '취기 해소', fn: () => { ME.drunk = 0; } },
        { ic: '💃', t: '춤추기', p: 0, fn: () => { setTimeout(() => this.openDance(), 50); } },
        { ic: '🎧', t: 'DJ 신청곡 (BPM 변경)', p: 500, fn: () => { MUSIC.bpm = pick([110, 124, 128, 140, 96]); toast(`🎧 BPM ${MUSIC.bpm}`); } }]); break;
      case 'casino': this.openCasino(); break;
      case 'hotel': this.openMenu('🏨 시모느 리조트 호텔', '', [{ ic: '🛏️', t: '숙박 (체력 회복 + 스폰 설정)', p: 5000, fn: () => { ME.hp = 100; ME.homePlot = null; ME.spawnHotel = true; toast('🛏️ 푹 쉬었다'); } }, { ic: '🍹', t: '루프탑 바', p: 1500, fn: () => { ME.drunk = Math.min(1.2, ME.drunk + 0.4); } }]); break;
    }
  },
  openDealer(f) {
    const list = ['hatch', 'sedan', 'suv', 'pickup', 'van', 'sports', 'supercar', 'scooter', 'bike', 'superbike'];
    this.openMenu('🚗 자동차 판매점', `구매한 차는 차고에 저장되고 휴대폰으로 언제든 부를 수 있다 · 보유 ${ME.garage.length}대`, list.map(k => {
      const M = VMODELS[k]; return { ic: M.kind === 'bike' ? '🏍️' : k === 'supercar' || k === 'sports' ? '🏎️' : k === 'suv' || k === 'pickup' ? '🚙' : '🚗', t: M.name, p: M.price, d: `최고 ${Math.round(M.max * 3.6)}km/h`, fn: () => { const col = M.kind === 'bike' ? pick(['#c41818', '#1a1a1a', '#f2f2f2', '#1a4ad0']) : pick(CAR_COLORS); const g = { model: k, color: col, id: ME.id + '_' + Date.now().toString(36) }; ME.garage.push(g); spawnOwned(g, f.x, f.z); announce('🚗 구매 완료!', M.name); saveGame(); } };
    }));
  },
  openGarage(x, z) {
    if (!ME.garage.length) { toast('보유 차량이 없다 — 자동차 판매점에서 구매'); return; }
    this.openMenu('🔑 내 차고', '차를 선택하면 근처로 배달된다', ME.garage.map(g => ({ ic: VMODELS[g.model].kind === 'bike' ? '🏍️' : '🚗', t: VMODELS[g.model].name, d: g.color, fn: () => { spawnOwned(g, x ?? ME.x, z ?? ME.z); toast('🚗 차량 도착!'); } })));
  },
  openGun() {
    const items = [];
    for (const w of WEAPON_ORDER) { const W = WEAPONS[w]; if (!W.price) continue; if (!ME.weapons[w]) items.push({ ic: W.icon, t: W.name, p: W.price, d: W.melee ? '근접 무기' : `탄창 ${W.mag}발 포함`, fn: () => { ME.weapons[w] = 1; if (!W.melee) { ME.mag[w] = W.mag; ME.ammo[w] = (ME.ammo[w] || 0) + W.mag; } selectWeapon(w); this.buildHotbar(); saveGame(); } }); else if (!W.melee) items.push({ ic: '📦', t: `${W.name} 탄약`, p: W.ammoPrice, d: `+${W.mag * 2}발 (보유 ${ME.ammo[w] || 0})`, stay: true, fn: () => { ME.ammo[w] = (ME.ammo[w] || 0) + W.mag * 2; UI.updateWeapon(); this.openGun(); return true; } }); }
    items.push({ ic: '🦺', t: '방탄복', p: 2500, d: '아머 100', fn: () => { ME.armor = 100; } });
    this.openMenu('🔫 총포사', '무기와 탄약 · 경찰 앞에서 쏘면 수배된다', items);
  },
  openClothes() {
    this.menuOpen = true; const o = Object.assign({}, ME.outfit);
    const box = $('#menuBox'); box.innerHTML = `<h2>👕 옷가게</h2><div class="desc">변경 비용 ₩1,500 · 실시간 미리보기</div><div class="cust" id="cust2" style="max-height:52vh"></div><div class="row" style="margin-top:12px"><button class="btn" id="buyCl">구매 (₩1,500)</button><button class="btn b3" id="cancelCl">취소</button></div>`;
    buildCustomizer($('#cust2'), o, (no) => { ME.char.setOutfit(no); });
    $('#buyCl').onclick = () => { if (ME.money < 1500) { toast('💸 돈이 부족하다'); return; } ME.money -= 1500; ME.outfit = Object.assign({}, o); ME.char.setOutfit(ME.outfit); NET.send({ t: 'outfit', o: ME.outfit }); sfx('cash'); toast('👕 새 옷!'); saveGame(); this.closeMenu(); };
    $('#cancelCl').onclick = () => { ME.char.setOutfit(ME.outfit); this.closeMenu(); };
    $('#menu').classList.remove('hidden'); if (document.pointerLockElement) document.exitPointerLock();
  },
  openCasino() {
    const bet = (b) => ({ ic: '🎰', t: `슬롯머신 ₩${b.toLocaleString()}`, p: b, stay: true, d: '777 = 50배', fn: (btn) => { const S = ['🍒', '🍋', '🔔', '💎', '7️⃣']; const r = [0, 1, 2].map(() => Math.random() < 0.3 ? 4 : Math.floor(Math.random() * 4)); const res = r.map(i => S[i]).join(' '); let win = 0; if (r[0] === r[1] && r[1] === r[2]) win = r[0] === 4 ? b * 50 : b * 10; else if (r[0] === r[1] || r[1] === r[2]) win = b * 1.5; ME.money += win; btn.querySelector('.d').textContent = `${res} → ${win ? '+' + fmtMoney(win) : '꽝'}`; if (win) { sfx('cash'); if (win >= b * 10) announce('🎰 잭팟!', fmtMoney(win)); } else sfx('error'); return true; } });
    const rou = (c, b) => ({ ic: c === 'red' ? '🔴' : '⚫', t: `룰렛 ${c === 'red' ? '레드' : '블랙'} ₩${b.toLocaleString()}`, p: b, stay: true, d: '2배', fn: (btn) => { const n = Math.floor(Math.random() * 37); const col = n === 0 ? 'green' : n % 2 ? 'red' : 'black'; const win = col === c ? b * 2 : 0; ME.money += win; btn.querySelector('.d').textContent = `${n} ${col === 'red' ? '🔴' : col === 'black' ? '⚫' : '🟢'} → ${win ? '+' + fmtMoney(win) : '꽝'}`; sfx(win ? 'cash' : 'error'); return true; } });
    this.openMenu('🎰 카지노', '도박은 적당히…', [bet(100), bet(1000), bet(10000), rou('red', 1000), rou('black', 1000), rou('red', 10000)]);
  },
  factoryGame() {
    const box = $('#menuBox'); let round = 0, score = 0, pos = 0, dir = 1; const zone = [0.4, 0.6];
    box.innerHTML = `<h2>⚙️ 공장 아르바이트</h2><div class="desc">막대가 초록 구간에 있을 때 누르세요 (5회)</div><div style="position:relative;height:34px;border-radius:10px;background:#222;overflow:hidden;margin:14px 0"><div style="position:absolute;left:40%;width:20%;top:0;bottom:0;background:#2a8a4a"></div><div id="mgBar" style="position:absolute;left:0;width:6px;top:0;bottom:0;background:#ffd34a"></div></div><div id="mgTxt" class="desc">0 / 5</div><button class="btn" id="mgBtn" style="width:100%">작업!</button>`;
    const step = () => { pos += dir * 0.025 * (1 + round * 0.25); if (pos > 1 || pos < 0) dir *= -1; pos = clamp(pos, 0, 1); const b = $('#mgBar'); if (b) b.style.left = (pos * 100) + '%'; };
    clearInterval(this._mg); this._mg = setInterval(step, 16);
    $('#mgBtn').onclick = () => { round++; const ok = pos > zone[0] && pos < zone[1]; if (ok) { score++; sfx('coin'); } else sfx('error'); $('#mgTxt').textContent = `${round} / 5 · 성공 ${score}`; if (round >= 5) { clearInterval(this._mg); const pay = score * (300 + ME.skills.study * 60); ME.money += pay; toast(`💰 알바비 ${fmtMoney(pay)}`); setTimeout(() => this.closeMenu(), 600); } };
  },
  aimGame() {
    const box = $('#menuBox'); let hits = 0, t0 = performance.now();
    box.innerHTML = `<h2>🎮 에임 대회</h2><div class="desc" id="agTxt">10초! 타겟을 클릭</div><div id="agArea" style="position:relative;height:300px;border-radius:12px;background:#0d1020;overflow:hidden"></div>`;
    const area = $('#agArea'); const spawn = () => { area.innerHTML = ''; const t = document.createElement('div'); t.style.cssText = `position:absolute;width:38px;height:38px;border-radius:50%;background:radial-gradient(#fff 20%,#ff3d4f 22%,#ff3d4f 45%,#fff 47%,#fff 60%,#ff3d4f 62%);left:${Math.random() * 85}%;top:${Math.random() * 82}%;cursor:crosshair`; t.onclick = () => { hits++; sfx('hit'); spawn(); }; area.appendChild(t); };
    spawn(); clearInterval(this._mg); this._mg = setInterval(() => { const el = (performance.now() - t0) / 1000; $('#agTxt').textContent = `${Math.max(0, 10 - el).toFixed(1)}초 · 명중 ${hits}`; if (el >= 10) { clearInterval(this._mg); const prize = hits >= 18 ? 8000 : hits >= 14 ? 3000 : hits >= 10 ? 1200 : 0; ME.money += prize; if (prize) announce('🏆 대회 입상!', `${hits}점 · 상금 ${fmtMoney(prize)}`); else toast(`${hits}점… 상금 없음`); setTimeout(() => this.closeMenu(), 800); } }, 50);
  },
  // ---------- plots ----------
  openPlot(p) {
    const mine = p.owner === ME.id; const R = REGIONS[p.region].name;
    if (p.state === 'empty') { this.openMenu('🪧 매물 — ' + R, `${Math.round(p.w)}m × ${Math.round(p.d)}m 부지. 구매 후 시공사에 건축을 맡길 수 있다.`, [{ ic: '📝', t: '땅 구매', p: p.price, fn: () => { plotRequest({ t: 'buyLand', p: p.id }); toast('📝 계약 진행 중…'); } }]); return; }
    if (p.state === 'owned') {
      if (!mine) { this.openMenu(`🏗️ ${p.ownerName}의 땅`, '아직 건물이 없다', []); return; }
      const order = (k, fl) => { const D = BUILD_DESIGNS[k]; fl = clampFloors(k, fl); plotRequest({ t: 'build', p: p.id, d: k, fl }); announce('🏗️ 착공!', `${D.name} ${fl}층 — 서부리 건설`); };
      const pickFloors = (k) => { const D = BUILD_DESIGNS[k], r = DESIGN_FLOORS[k]; const opts = [r[0], 3, 4, 5, 6, 8, 10, 12, MAX_FLOORS].filter((v, i, a) => v >= r[0] && v <= Math.min(r[1], MAX_FLOORS) && a.indexOf(v) === i);
        this.openMenu(`${D.icon} ${D.name} — 층수 선택`, `건물은 <b>최대 ${MAX_FLOORS}층</b>까지 지을 수 있다 (1층 ≈ ${FLOOR_H}m)`, opts.map(fl => ({ ic: '🏢', t: `${fl}층${fl === MAX_FLOORS ? ' (최대)' : ''}`, p: designPrice(k, fl), d: `높이 약 ${Math.round(fl * FLOOR_H)}m${D.income ? ` · 분당 ₩${Math.round(D.income * fl / r[2]).toLocaleString()}` : ''}`, fn: () => order(k, fl) }))); };
      this.openMenu('🏗️ 건축 의뢰 — ' + R, `시공사(서부리 건설)에 맡기면 인부들이 직접 지어준다 · <b>최대 ${MAX_FLOORS}층</b>`, Object.entries(BUILD_DESIGNS).map(([k, D]) => { const r = DESIGN_FLOORS[k]; const multi = r[0] !== r[1]; return { ic: D.icon, t: D.name + (multi ? ` (${r[0]}~${Math.min(r[1], MAX_FLOORS)}층)` : ` (${r[0]}층)`), p: multi ? `${fmtMoney(designPrice(k, r[0]))}~` : D.price, d: `${D.desc} · 공사 ${D.time}초`, fn: () => { if (multi) { setTimeout(() => pickFloors(k), 30); return; } order(k, r[0]); } }; }));
      return;
    }
    if (p.state === 'building') { this.openMenu('🏗️ 공사 현장', `${BUILD_DESIGNS[p.design].name} · 진행률 ${Math.floor(p.progress * 100)}% · 건축주 ${p.ownerName}`, []); return; }
    const D = BUILD_DESIGNS[p.design];
    if (!mine) { this.openMenu(`🏠 ${p.ownerName}의 ${D.name}`, `${R}`, [{ ic: '🔔', t: '초인종 누르기', p: 0, fn: () => { NET.send({ t: 'chat', m: `🔔 ${ME.name}님이 ${p.ownerName}님 집 초인종을 눌렀다`, sys: 1 }); toast('딩동~'); } }]); return; }
    const items = [{ ic: '🛏️', t: '휴식', p: 0, d: '체력·스태미나 회복', fn: () => { ME.hp = 100; ME.stamina = 100; ME.drunk = 0; toast('😴 푹 쉬었다'); saveGame(); } }, { ic: '📍', t: '스폰 지점으로 설정', p: 0, d: '사망 시 여기서 부활', fn: () => { ME.homePlot = p.id; toast('📍 집이 스폰 지점이 되었다'); saveGame(); } }];
    if (D.income) items.push({ ic: '💰', t: '임대 수익 수령', p: `${fmtMoney(p.bank || 0)} 적립`, fn: () => plotRequest({ t: 'collect', p: p.id }) });
    items.push({ ic: '🚗', t: '차고에서 차 꺼내기', p: 0, fn: () => { setTimeout(() => this.openGarage(), 50); } });
    this.openMenu(`🏠 내 ${D.name}`, R, items);
  },
  // ---------- peds / animals / players ----------
  openPed(p) {
    const items = [{ ic: '💬', t: '대화하기', p: 0, fn: () => { if (p.char) p.char.say(pick(PED_LINES[p.kind] || PED_LINES.civ), 4); pedAction(p, 'talk'); } }, { ic: '💃', t: '같이 춤추기', p: 0, fn: () => { const d = Math.floor(Math.random() * 8); ME.dance = d; pedAction(p, 'dance', d); } }];
    if (p.kind === 'civ') items.push({ ic: '😠', t: '돈 내놔! (협박)', p: 0, d: '수배될 수 있다', fn: () => { const a = Math.floor(rnd(30, 400)); ME.money += a; toast(`💵 뺏은 돈 ${fmtMoney(a)}`); if (p.char) p.char.say('살려주세요!!', 3); pedAction(p, 'rob'); if (Math.random() < 0.5) addWanted(1); } });
    if (p.kind === 'police' && ME.wanted) items.push({ ic: '🙇', t: '자수하기', p: ME.wanted * 1500, d: '벌금 내고 수배 해제', fn: () => { ME.wanted = 0; toast('🙇 자수했다'); } });
    if (p.kind === 'police' && ADMIN.on) items.push({ ic: '🔓', t: '수감자 무료 석방 (관리자)', p: 0, fn: () => ADMIN.freeOther() });
    if (p.kind === 'medic') items.push({ ic: '💉', t: '응급치료', p: 500, fn: () => { ME.hp = 100; } });
    this.openMenu(p.kind === 'police' ? '👮 경찰' : p.kind.startsWith('gang') ? (p.kind === 'gangA' ? '🔴 레드 크루' : '🔵 블루 독스') : p.kind === 'medic' ? '🧑‍⚕️ 의사' : '🧑 시민', '', items);
  },
  openAnimal(a) {
    const S = a.S; const items = [{ ic: '🤚', t: '쓰다듬기', p: 0, fn: () => { ME.action = 'pet'; ME.actionT = 0; ME.yaw = Math.atan2(a.x - ME.x, a.z - ME.z); FX.emoji('💕', a.x, a.y + (S.biped ? 0.8 : S.leg + S.body[1] + 0.3), a.z); NET.send({ t: 'pet', a: a.id }); if (S.sfx) sfx(S.sfx, a.x, a.z, 0.6); if (S.predator && a.bounds && !a.owner) { dealDamage({ kind: 'me' }, 25, 'n'); toast('🦁 물렸다!!'); } } }];
    items.push({ ic: '🥕', t: '먹이 주기', p: 0, d: `음식 1개 (보유 ${ME.inv.food})`, dis: !ME.inv.food, disMsg: '음식이 없다 (음식점·동물원에서 구매)', fn: () => { ME.inv.food--; FX.emoji('😋', a.x, a.y + 1.4, a.z); toast(`${S.name}가 좋아한다!`); } });
    if (S.adopt && !a.owner) items.push({ ic: '🏠', t: '입양하기', p: 2000, d: '반려동물이 되어 따라다닌다', fn: () => { if (G.isHost) { a.owner = ME.id; a.state = 'follow'; handlePersonal({ t: 'adopted', a: a.id }); } else NET.send({ t: 'adopt', a: a.id }); } });
    if (a.owner === ME.id) items.push({ ic: '👋', t: '놓아주기', p: 0, fn: () => { a.owner = null; a.state = 'idle'; ME.petId = null; } });
    this.openMenu(`🐾 ${S.name}`, a.owner ? (a.owner === ME.id ? '내 반려동물' : '누군가의 반려동물') : a.zoo ? '동물원 동물' : a.farm ? '목장 동물' : a.wild ? '야생 동물' : '길동물', items);
  },
  openPlayer(rp) {
    this.openMenu(`🤝 ${displayName(rp.id, rp.name)}`, '', [
      ...(ADMIN.on && rp.jail ? [{ ic: '🔓', t: '무료 석방', p: 0, fn: () => NET.send({ t: 'free', to: rp.id }) }] : []),
      { ic: '💸', t: '₩1,000 송금', p: 1000, fn: () => { NET.send({ t: 'chat', m: `💸 ${ME.name} → ${rp.name} ₩1,000 송금`, sys: 1 }); NET.send({ t: 'income', to: rp.id, amt: 1000 }); } },
      { ic: '👋', t: '손 흔들기', p: 0, fn: () => { ME.action = 'wave'; ME.actionT = 0; NET.send({ t: 'act', a: 'wave' }); } },
      { ic: '💃', t: '같이 춤추기', p: 0, fn: () => { ME.dance = rp.dance >= 0 ? rp.dance : 0; NET.send({ t: 'chat', m: `💃 ${ME.name}님이 같이 춤추자고 한다!`, sys: 1 }); } }]);
  },
  openDance() {
    this.openMenu('💃 춤', 'X 또는 이동하면 멈춘다', DANCES.map((n, i) => ({ ic: ['🕺', '🌊', '🎤', '🪩', '🌀', '🤖', '🐎', '🧵'][i], t: n, p: 0, fn: () => { ME.dance = i; ME.sitBench = null; } })));
  },
  openPhone() {
    if (this.menuOpen) { this.closeMenu(); return; }
    const regions = ['seoburi', 'plaza', 'jiolle', 'kaengjibe', 'disanbay', 'simone'];
    const dz = DISTRICTS[districtAt(anchorOf(ME).x, anchorOf(ME).z) - 1];
    this.openMenu('📱 휴대폰', `${G.online ? `방 코드 <b style="color:#ffd34a">${G.room}</b> · ${G.players.size + 1}명 접속${G.isHost ? ' · 👑 방장' : ''}` : '혼자 플레이 중'} · ${dz ? dz.id + '구역 ' + dz.name : '바다'} · 킬 ${ME.kills}`, [
      { ic: '🗺️', t: '지도', p: 0, fn: () => setTimeout(() => this.openMap(), 30) },
      { ic: '🔑', t: '내 차 부르기', p: 0, d: `보유 ${ME.garage.length}대`, fn: () => { setTimeout(() => this.openGarage(), 30); } },
      { ic: '🚕', t: TAXI.cab ? '택시 (이용 중)' : '택시 호출', p: 0, d: TAXI.cab ? '목적지 변경 · 취소' : '16개 구역 · AI 기사 최단경로 운전', fn: () => { setTimeout(() => TAXI.openMenu(), 30); } },
      { ic: '🔗', t: '친구 초대 링크', p: 0, d: G.online ? `방 ${G.room} · ${G.players.size + 1}/${MAX_PLAYERS}명` : '누르면 방을 만들고 링크 생성', fn: () => { setTimeout(() => SHARE.open(), 30); } },
      { ic: '🩹', t: '구급상자 사용', p: 0, d: `보유 ${ME.inv.medkit}`, dis: !ME.inv.medkit, disMsg: '구급상자 없음', fn: () => { ME.inv.medkit--; ME.hp = Math.min(100, ME.hp + 60); toast('🩹 +60 HP'); } },
      { ic: '🍱', t: '도시락 먹기', p: 0, d: `보유 ${ME.inv.food}`, dis: !ME.inv.food, disMsg: '음식 없음', fn: () => { ME.inv.food--; ME.hp = Math.min(100, ME.hp + 35); } },
      { ic: '🐶', t: '반려동물 부르기', p: 0, dis: ME.petId === null, disMsg: '반려동물이 없다 (길강아지/고양이 입양)', fn: () => { const a = ANIMALS[ME.petId]; if (a && G.isHost) { a.x = ME.x + 1.5; a.z = ME.z + 1.5; } toast('🐶 이리 와!'); } },
      { ic: '💃', t: '춤', p: 0, fn: () => setTimeout(() => this.openDance(), 30) },
      { ic: '🎥', t: CAM.fp ? '3인칭 시점' : '1인칭 시점', p: 0, fn: () => { CAM.fp = !CAM.fp; } },
      { ic: '⚙️', t: '그래픽 품질', p: 0, d: ['낮음', '보통', '높음', '최고'][G.quality], fn: () => { setTimeout(() => this.openMenu('⚙️ 그래픽', '변경 후 새로고침하면 완전 적용', [0, 1, 2, 3].map(q => ({ t: ['낮음', '보통', '높음', '최고'][q], p: 0, fn: () => { try { localStorage.setItem('sbc3d_q', q); } catch (e) { } G.quality = q; applyQualityLive(); toast('품질 변경'); } }))), 30); } },
      { ic: '💾', t: '저장', p: 0, fn: () => { saveGame(); savePlots(); toast('💾 저장 완료'); } },
      { ic: '🎯', t: '쉬운 조작 · 끼임 탈출', p: 0, d: '사격 보정 · 자동 달리기 · 끼임 탈출', fn: () => setTimeout(() => this.openEasy(), 30) },
      { ic: '🖱️', t: '마우스 감도', p: 0, d: 'x' + (G.sens || 1), dis: IS_TOUCH, disMsg: '터치에선 필요 없어요', fn: () => setTimeout(() => this.openSens(), 30) },
      { ic: '❓', t: '조작법 (F1)', p: 0, fn: () => setTimeout(() => this.openHelp(), 30) },
      { ic: '🛠️', t: '관리자', p: 0, d: ADMIN.enabled() ? (ADMIN.on ? '로그인됨' : '비밀번호 필요') : '이 빌드에선 비활성', fn: () => setTimeout(() => ADMIN.open(), 30) },
    ]);
  },
  // ---------- maps ----------
  buildWorldImage() {
    const W = Math.floor(HM.W / 1), H = Math.floor(HM.H / 1); const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); const id = x.createImageData(W, H);
    const RC = { plaza: [70, 110, 60], seoburi: [92, 102, 110], jiolle: [80, 112, 70], kaengjibe: [110, 96, 70], disanbay: [74, 112, 54], simone: [90, 130, 80], sea: [50, 90, 120] };
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const k = hmIdx(i, j); const h = hmData[k]; const o = (j * W + i) * 4; const wx = HM.x0 + i * HM.res, wz = HM.z0 + j * HM.res;
      let c3; if (h < -0.2) c3 = [28, 62, 96]; else if (h < LAND - 0.3) c3 = [196, 180, 130]; else { c3 = RC[regionAt(wx, wz)].slice(); if (h > 60) { const t = clamp((h - 60) / 60, 0, 1); c3 = c3.map((v, ii) => lerp(v, [140, 140, 140][ii], t)); } if (h > 115) c3 = [235, 238, 242]; const sh = clamp((h - LAND) * 0.6, -10, 40); c3 = c3.map(v => v + sh); }
      if (roadDistF[k] < 0) c3 = [210, 210, 205];
      id.data[o] = c3[0]; id.data[o + 1] = c3[1]; id.data[o + 2] = c3[2]; id.data[o + 3] = 255;
    }
    x.putImageData(id, 0, 0);
    // blocks & buildings
    const toP = (wx, wz) => [(wx - HM.x0) / HM.res, (wz - HM.z0) / HM.res];
    x.fillStyle = 'rgba(150,150,155,.85)'; for (const b of BLOCKS) { const [a, bb] = toP(b.x0, b.z0); x.fillRect(a, bb, (b.x1 - b.x0) / HM.res, (b.z1 - b.z0) / HM.res); }
    x.fillStyle = 'rgba(55,60,70,.9)'; for (const c2 of COLLIDERS) { if (c2.type !== 'bld' || c2.circle) continue; const [a, bb] = toP(c2.x0, c2.z0); x.fillRect(a, bb, Math.max(1, (c2.x1 - c2.x0) / HM.res), Math.max(1, (c2.z1 - c2.z0) / HM.res)); }
    x.strokeStyle = '#e8e6e0'; x.lineCap = 'round'; for (const e of EDGES) { const a = NODES[e.a], b = NODES[e.b]; x.lineWidth = e.w / HM.res; const [ax, az] = toP(a.x, a.z), [bx, bz] = toP(b.x, b.z); x.beginPath(); x.moveTo(ax, az); x.lineTo(bx, bz); x.stroke(); }
    this.worldImg = c;
    // 16개 구역 경계 + 옅은 색
    const zc = document.createElement('canvas'); const S2 = 2; const ZW = Math.ceil(W / S2), ZH = Math.ceil(H / S2); zc.width = ZW; zc.height = ZH; const zx = zc.getContext('2d'); const zd = zx.createImageData(ZW, ZH);
    const ids = new Uint8Array(ZW * ZH); for (let j = 0; j < ZH; j++) for (let i = 0; i < ZW; i++) { const wx = HM.x0 + i * S2 * HM.res, wz = HM.z0 + j * S2 * HM.res; ids[j * ZW + i] = terrainH(wx, wz) < -0.2 ? 0 : districtAt(wx, wz); }
    const rgb = DISTRICT_COLORS.map(h => { const c3 = new THREE.Color(h); return [c3.r * 255, c3.g * 255, c3.b * 255]; });
    for (let j = 0; j < ZH; j++) for (let i = 0; i < ZW; i++) {
      const k = j * ZW + i, id = ids[k]; if (!id) continue; const o = k * 4;
      const edge = (i + 1 < ZW && ids[k + 1] && ids[k + 1] !== id) || (j + 1 < ZH && ids[k + ZW] && ids[k + ZW] !== id) || (i > 0 && ids[k - 1] && ids[k - 1] !== id) || (j > 0 && ids[k - ZW] && ids[k - ZW] !== id);
      if (edge) { zd.data[o] = 255; zd.data[o + 1] = 255; zd.data[o + 2] = 255; zd.data[o + 3] = 200; } else { const c3 = rgb[id - 1]; zd.data[o] = c3[0]; zd.data[o + 1] = c3[1]; zd.data[o + 2] = c3[2]; zd.data[o + 3] = 34; }
    }
    zx.putImageData(zd, 0, 0); this.zoneImg = zc;
  },
  drawMini() {
    const cv = $('#mini'); const x = cv.getContext('2d'); const S = cv.width; const cx = S / 2; const scale = (ME.vehicle ? 0.65 : 1.0) * S / 340;
    const AP = ME.vehicle ? ME.vehicle : anchorOf(ME); const px = AP.x, pz = AP.z; const cy = Math.cos(CAM.yaw), sy = Math.sin(CAM.yaw);
    const a = -cy * scale, c = sy * scale, b = -sy * scale, d = -cy * scale;
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, S, S); x.save(); x.beginPath(); x.arc(cx, cx, cx, 0, TAU); x.clip(); x.fillStyle = '#1c3c5c'; x.fillRect(0, 0, S, S);
    x.setTransform(a, b, c, d, cx - (a * px + c * pz), cx - (b * px + d * pz));
    x.imageSmoothingEnabled = true; x.drawImage(this.worldImg, HM.x0, HM.z0, HM.W * HM.res, HM.H * HM.res);
    if (this.zoneImg) { x.globalAlpha = 0.55; x.drawImage(this.zoneImg, HM.x0, HM.z0, HM.W * HM.res, HM.H * HM.res); x.globalAlpha = 1; }
    x.setTransform(1, 0, 0, 1, 0, 0);
    const toS = (wx, wz) => { const dx = wx - px, dz = wz - pz; return [cx + a * dx + c * dz, cx + b * dx + d * dz]; };
    const R = cx - 10; const clampS = (p) => { const dx = p[0] - cx, dy = p[1] - cx, l = Math.hypot(dx, dy); return l > R ? [cx + dx / l * R, cx + dy / l * R, true] : [p[0], p[1], false]; };
    x.font = `${Math.round(S / 14)}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (const f of FACILITIES) { const p = toS(f.x, f.z); if (Math.hypot(p[0] - cx, p[1] - cx) > R) continue; x.fillText(f.icon, p[0], p[1]); }
    for (const p of PLOTS) { const s = toS(p.x, p.z); if (Math.hypot(s[0] - cx, s[1] - cx) > R) continue; x.fillText(p.state === 'empty' ? '🪧' : p.state === 'building' ? '🏗️' : p.owner === ME.id ? '🏠' : '🏘️', s[0], s[1]); }
    if (ME.wanted) for (const q of PEDS) if (q.kind === 'police' && q.state !== 'dead' && q.state !== 'parked') { const s = toS(q.x, q.z); if (Math.hypot(s[0] - cx, s[1] - cx) > R) continue; x.fillStyle = Math.floor(G.t * 4) % 2 ? '#ff3030' : '#3060ff'; x.beginPath(); x.arc(s[0], s[1], S / 70, 0, TAU); x.fill(); }
    for (const q of PEDS) if (q.state === 'fight' && q.kind.startsWith('gang')) { const s = toS(q.x, q.z); if (Math.hypot(s[0] - cx, s[1] - cx) > R) continue; x.fillStyle = q.kind === 'gangA' ? '#ff4040' : '#4080ff'; x.beginPath(); x.arc(s[0], s[1], S / 90, 0, TAU); x.fill(); }
    for (const v of vehicles.values()) if (v.owner === ME.id) { const s = clampS(toS(v.x, v.z)); x.fillText('🚘', s[0], s[1]); }
    TAXI.drawRoute(x, toS); if (TAXI.cab && ME.vehicle !== TAXI.cab) { const s = clampS(toS(TAXI.cab.x, TAXI.cab.z)); x.fillText('🚕', s[0], s[1]); }
    if (G.raid) { const s = clampS(toS(G.raid.x, G.raid.z)); x.fillText('⚠️', s[0], s[1]); }
    if (this.waypoint) { const s = clampS(toS(this.waypoint.x, this.waypoint.z)); x.fillText('📍', s[0], s[1] - 6); }
    for (const rp of G.players.values()) { const ra = anchorOf(rp); const s = clampS(toS(ra.x, ra.z)); x.fillStyle = '#ffd34a'; x.beginPath(); x.arc(s[0], s[1], S / 45, 0, TAU); x.fill(); x.strokeStyle = '#000'; x.lineWidth = 2; x.stroke(); }
    // player arrow
    const ang = -(ME.vehicle ? ME.vehicle.yaw : ME.yaw) + CAM.yaw; x.save(); x.translate(cx, cx); x.rotate(ang); x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, -S / 22); x.lineTo(S / 32, S / 30); x.lineTo(0, S / 60); x.lineTo(-S / 32, S / 30); x.closePath(); x.stroke(); x.fill(); x.restore();
    // north
    const n = clampS(toS(px, pz - 5000)); x.fillStyle = '#fff'; x.font = `bold ${Math.round(S / 16)}px sans-serif`; x.fillText('N', n[0], n[1]);
    x.restore();
  },
  openMap() { this.mapOpen = true; $('#bigmap').classList.remove('hidden'); if (document.pointerLockElement) document.exitPointerLock(); this.drawBigMap(); },
  closeMap() { this.mapOpen = false; $('#bigmap').classList.add('hidden'); },
  mapToWorld(px, py) { const s = this._ms; return { x: (px - s.ox) / s.k, z: (py - s.oy) / s.k }; },
  drawBigMap() {
    const cv = $('#bigmapC'); const x = cv.getContext('2d'); const W = cv.width, H = cv.height;
    const ww = HM.W * HM.res, wh = HM.H * HM.res; const k = Math.min(W / ww, H / wh); const ox = (W - ww * k) / 2 - HM.x0 * k, oy = (H - wh * k) / 2 - HM.z0 * k; this._ms = { k, ox, oy };
    x.fillStyle = '#16324a'; x.fillRect(0, 0, W, H); x.drawImage(this.worldImg, ox + HM.x0 * k, oy + HM.z0 * k, ww * k, wh * k);
    const P = (wx, wz) => [ox + wx * k, oy + wz * k];
    if (this.zoneImg) x.drawImage(this.zoneImg, ox + HM.x0 * k, oy + HM.z0 * k, ww * k, wh * k);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    for (const [id, R] of Object.entries(REGIONS)) { if (id === 'sea') continue; const p = P(R.cx, R.cz); x.font = '900 24px "Black Han Sans",sans-serif'; x.lineWidth = 5; x.strokeStyle = 'rgba(0,0,0,.7)'; x.globalAlpha = 0.85; x.strokeText(R.name, p[0], p[1] - 40); x.fillStyle = R.color; x.fillText(R.name, p[0], p[1] - 40); x.globalAlpha = 1; }
    const myD = districtAt(anchorOf(ME).x, anchorOf(ME).z);
    for (const D of DISTRICTS) { const p = P(D.cx, D.cz); const col = DISTRICT_COLORS[D.id - 1]; x.beginPath(); x.arc(p[0], p[1], 11, 0, TAU); x.fillStyle = D.id === myD ? '#fff' : 'rgba(0,0,0,.72)'; x.fill(); x.lineWidth = 2.5; x.strokeStyle = col; x.stroke(); x.fillStyle = D.id === myD ? '#000' : '#fff'; x.font = 'bold 12px sans-serif'; x.fillText(D.id, p[0], p[1] + 0.5); x.font = 'bold 12.5px "Noto Sans KR",sans-serif'; x.lineWidth = 4; x.strokeStyle = 'rgba(0,0,0,.8)'; x.strokeText(D.name, p[0], p[1] + 21); x.fillStyle = col; x.fillText(D.name, p[0], p[1] + 21); }
    x.font = '15px sans-serif'; for (const f of FACILITIES) { const p = P(f.x, f.z); x.fillText(f.icon, p[0], p[1]); }
    x.font = '16px sans-serif'; for (const p of PLOTS) { const s = P(p.x, p.z); x.fillText(p.state === 'empty' ? '🪧' : p.state === 'building' ? '🏗️' : '🏠', s[0], s[1]); }
    for (const v of vehicles.values()) if (v.owner === ME.id) { const s = P(v.x, v.z); x.fillText('🚘', s[0], s[1]); }
    if (this.waypoint) { const s = P(this.waypoint.x, this.waypoint.z); x.font = '26px sans-serif'; x.fillText('📍', s[0], s[1] - 10); }
    TAXI.drawRoute(x, P); if (TAXI.cab) { const s = P(TAXI.cab.x, TAXI.cab.z); x.font = '20px sans-serif'; x.fillText('🚕', s[0], s[1]); }
    for (const rp of G.players.values()) { const ra = anchorOf(rp); const s = P(ra.x, ra.z); x.fillStyle = '#ffd34a'; x.beginPath(); x.arc(s[0], s[1], 7, 0, TAU); x.fill(); x.fillStyle = '#fff'; x.font = 'bold 13px sans-serif'; x.fillText(rp.name, s[0], s[1] - 14); }
    const MA = anchorOf(ME); const me = P(MA.x, MA.z); x.fillStyle = '#ff3d6a'; x.beginPath(); x.arc(me[0], me[1], 8, 0, TAU); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 3; x.stroke(); x.fillStyle = '#fff'; x.font = 'bold 14px sans-serif'; x.fillText('나', me[0], me[1] - 16);
    x.textAlign = 'left'; x.font = '13px sans-serif'; x.fillStyle = 'rgba(255,255,255,.8)'; x.fillText('지도를 클릭하면 목적지(📍) 설정 · 숫자 = 16개 구역 (택시 목적지) · 🚕 내 택시 · 🪧 매물  🏗️ 공사중  🏠 건물', 14, H - 16);
  },
  // ---------- touch ----------
  buildTouch() {
    document.body.classList.add('touch'); const T = $('#touch'); T.classList.remove('hidden');
    const mk = (id, txt, css, cls = '', label = '') => { const b = document.createElement('div'); b.className = 'tb ' + cls; b.id = id; b.innerHTML = txt + (label ? `<small>${label}</small>` : ''); b.style.cssText = css; T.appendChild(b); return b; };
    const B = {
      fire: mk('tFire', '🔥', 'right:18px;bottom:92px', 'big'), jump: mk('tJump', '⬆', 'right:112px;bottom:18px', '', '점프'), aim: mk('tAim', '🎯', 'right:114px;bottom:112px', '', '조준'),
      use: mk('tUse', '✋', 'right:198px;bottom:32px', '', '상호작용'), car: mk('tCar', '🚗', 'right:200px;bottom:124px', '', '탑승'), run: mk('tRun', '🏃', 'left:22px;bottom:196px', 'sm', '달리기'),
      wpn: mk('tWpn', '🔁', 'right:28px;bottom:192px', 'sm', '무기'), rel: mk('tRel', '♻', 'right:84px;bottom:196px', 'sm', '재장전'),
      phone: mk('tPhone', '📱', 'left:min(36vw,230px);top:10px', 'sm'), map: mk('tMap', '🗺', 'left:calc(min(36vw,230px) + 52px);top:10px', 'sm'), chat: mk('tChat', '💬', 'left:calc(min(36vw,230px) + 104px);top:10px', 'sm'), dance: mk('tDance', '💃', 'left:calc(min(36vw,230px) + 156px);top:10px', 'sm'), cam: mk('tCam', '🎥', 'left:calc(min(36vw,230px) + 208px);top:10px', 'sm'),
    };
    const hold = (el, on, off) => { el.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); AU.init(); on(); el.classList.add('on'); }, { passive: false }); el.addEventListener('touchend', e => { e.preventDefault(); off && off(); el.classList.remove('on'); }, { passive: false }); el.addEventListener('touchcancel', e => { off && off(); el.classList.remove('on'); }); };
    hold(B.fire, () => { INP.fire = true; }, () => { INP.fire = false; });
    hold(B.jump, () => { INP.jump = true; INP.brake = true; }, () => { INP.brake = false; });
    hold(B.aim, () => { INP.aim = !INP.aim; B.aim.dataset.on = INP.aim ? 1 : 0; }, () => { if (INP.aim) B.aim.classList.add('on'); });
    hold(B.use, () => { if (ME.vehicle) { sfx('horn', ME.x, ME.z); NET.send({ t: 'horn' }); } else doInteract(); });
    hold(B.car, () => toggleVehicle());
    hold(B.run, () => { INP.touchRun = !INP.touchRun; }, () => { if (INP.touchRun) B.run.classList.add('on'); });
    hold(B.wpn, () => cycleWeapon(1)); hold(B.rel, () => startReload());
    hold(B.phone, () => this.openPhone()); hold(B.map, () => this.openMap()); hold(B.chat, () => this.openChat()); hold(B.dance, () => this.openDance()); hold(B.cam, () => { CAM.fp = !CAM.fp; });
    this.touchBtns = B;
    // joystick
    const joy = $('#joy'), base = $('#joyBase'), knob = $('#joyKnob'); let jid = null, jx = 0, jy = 0;
    joy.addEventListener('touchstart', e => { e.preventDefault(); AU.init(); const t = e.changedTouches[0]; jid = t.identifier; jx = t.clientX; jy = t.clientY; base.style.display = knob.style.display = 'block'; base.style.left = knob.style.left = jx + 'px'; base.style.top = knob.style.top = jy + 'px'; }, { passive: false });
    joy.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === jid) { let dx = t.clientX - jx, dy = t.clientY - jy; const l = Math.hypot(dx, dy), m = 60; if (l > m) { dx *= m / l; dy *= m / l; } knob.style.left = (jx + dx) + 'px'; knob.style.top = (jy + dy) + 'px'; INP.mx = dx / m; INP.mz = -dy / m; INP.joyMag = Math.min(1, l / m); } }, { passive: false });
    const jend = e => { for (const t of e.changedTouches) if (t.identifier === jid) { jid = null; INP.mx = INP.mz = 0; INP.joyMag = 0; base.style.display = knob.style.display = 'none'; } };
    joy.addEventListener('touchend', jend); joy.addEventListener('touchcancel', jend);
    // look
    const look = $('#look'); let lid = null, lx = 0, ly = 0;
    look.addEventListener('touchstart', e => { e.preventDefault(); AU.init(); const t = e.changedTouches[0]; lid = t.identifier; lx = t.clientX; ly = t.clientY; }, { passive: false });
    look.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === lid) { const s = INP.aim ? 0.0035 : 0.0062; CAM.yaw -= (t.clientX - lx) * s; CAM.pitch = clamp(CAM.pitch + (t.clientY - ly) * s, -1.25, 1.3); lx = t.clientX; ly = t.clientY; CAM.lookT = G.t; } }, { passive: false });
    const lend = e => { for (const t of e.changedTouches) if (t.identifier === lid) lid = null; }; look.addEventListener('touchend', lend); look.addEventListener('touchcancel', lend);
  },
  updateTouch() {
    if (!this.touchBtns) return; const B = this.touchBtns; const inV = !!ME.vehicle;
    B.jump.innerHTML = inV ? '🛑<small>브레이크</small>' : '⬆<small>점프</small>'; B.use.innerHTML = inV ? '📯<small>경적</small>' : '✋<small>상호작용</small>'; B.car.innerHTML = inV ? (ME.vehicle.taxiCab ? '🚪<small>세워주세요</small>' : '🚪<small>하차</small>') : '🚗<small>탑승</small>';
    B.aim.classList.toggle('on', INP.aim); B.run.classList.toggle('on', INP.touchRun);
  },
};
function pedAction(p, a, d) { if (G.isHost) { if (a === 'dance') { p.state = 'dance'; p.timer = 15; p.dance = d; } if (a === 'talk') { p.state = 'talk'; p.timer = 4; p.yaw = Math.atan2(ME.x - p.x, ME.z - p.z); } if (a === 'rob') { p.state = 'flee'; p.timer = 10; p.fx = ME.x; p.fz = ME.z; } } else NET.send({ t: 'pedAct', id: p.id, a, d }); }
function spawnOwned(g, nx, nz) {
  let v = vehicles.get(g.id);
  const r = edgeNearPoint(nx, nz, 4, 30) || edgeNearPoint(nx, nz, 20, 80);
  let x = nx + 4, z = nz + 4, yaw = 0;
  if (r) { const E = EDGES[r.e]; const a = NODES[E.a], b = NODES[E.b]; const dx = (b.x - a.x) / E.len, dz = (b.z - a.z) / E.len; x = a.x + dx * r.t + (-dz) * (E.w / 2 - 1.5); z = a.z + dz * r.t + dx * (E.w / 2 - 1.5); yaw = Math.atan2(dx, dz); }
  if (!v) { v = new Vehicle(g.id, g.model, g.color, x, z, yaw, { owner: ME.id }); v.dyn = true; }
  else { if (v.driver && v.driver !== ME.id) { toast('누군가 운전 중이다'); return; } v.spawn = { x, z, yaw }; v.reset(); v.color = g.color; }
  v.ctrl = 'local'; v.mesh.visible = true;
  NET.send({ t: 'vspawn', id: v.id, model: g.model, color: g.color, x, z, yaw, owner: ME.id });
  UI.waypoint = { x, z };
}
function fastTravel(r) {
  const R = REGIONS[r]; if (ME.jail) { toast('수감 중에는 이동할 수 없다'); return; } INTERIOR.dispose(); INTERIOR.clearRoof(); if (ME.vehicle) exitVehicle(true);
  const tgt = edgeNearPoint(R.cx, R.cz, 0, 120) || { e: 0, t: 0 }; const E = EDGES[tgt.e]; const a = NODES[E.a], b = NODES[E.b]; const dx = (b.x - a.x) / E.len, dz = (b.z - a.z) / E.len;
  ME.x = a.x + dx * tgt.t + (-dz) * (E.w / 2 + 2.5); ME.z = a.z + dz * tgt.t + dx * (E.w / 2 + 2.5); ME.y = groundHeight(ME.x, ME.z) + 0.2; ME.vx = ME.vz = ME.vy = 0;
  const res = resolveCircle(ME.x, ME.z, 0.35, ME.y, 1.8); ME.x = res.x; ME.z = res.z;
  const f = $('#dmgFlash'); f.style.transition = 'none'; f.style.background = '#000'; f.style.opacity = 1; setTimeout(() => { f.style.transition = 'opacity .8s'; f.style.opacity = 0; setTimeout(() => f.style.background = '', 900); }, 250);
  toast(`🚕 ${R.name} 도착`);
}
// ---------- customizer (lobby + clothes shop) ----------
function buildCustomizer(el, o, onChange) {
  el.innerHTML = '';
  const fields = [['body', '체형', OPT.body], ['skin', '피부', null, OPT.skin], ['hair', '헤어', OPT.hair], ['hairColor', '머리색', null], ['top', '상의', OPT.top], ['topColor', '상의 색', null], ['bottom', '하의', OPT.bottom], ['bottomColor', '하의 색', null], ['shoes', '신발 색', null], ['hat', '모자', OPT.hat], ['hatColor', '모자 색', null], ['glasses', '안경', OPT.glasses], ['beard', '수염', OPT.beard]];
  for (const [k, label, opts] of fields) {
    const f = document.createElement('div'); f.className = 'f'; f.innerHTML = `<label>${label}</label>`;
    let inp; if (opts) { inp = document.createElement('select'); for (const [v, n] of opts) { const op = document.createElement('option'); op.value = v; op.textContent = n; inp.appendChild(op); } }
    else { inp = document.createElement('input'); inp.type = 'color'; }
    inp.value = o[k] || (opts ? opts[0][0] : '#888888'); inp.oninput = inp.onchange = () => { o[k] = inp.value; onChange(o); };
    f.appendChild(inp); el.appendChild(f);
  }
}
function applyQualityLive() {
  const q = Q(); renderer.setPixelRatio(Math.min(devicePixelRatio, q.pr)); composer && composer.setPixelRatio && composer.setPixelRatio(Math.min(devicePixelRatio, q.pr));
  if (bloomPass) bloomPass.enabled = q.bloom; renderer.shadowMap.enabled = !!q.shadow; onResize();
}

// ---------- 원클릭 초대: 링크 만들기 / 복사 / 공유 ----------
const SHARE = {
  async open() {
    if (!G.online) { // 혼자 하다가 초대 → 그 자리에서 방을 연다
      toast('🌐 방 만드는 중…');
      for (let k = 0; k < 3; k++) { const c = NET.code(); try { await NET.listen(c); G.online = true; G.isHost = true; G.room = c; G.hostId = ME.id; if (ADMIN.on) G.adminId = ME.id; NET.updateRoomInfo(); break; } catch (e) { if (e.code !== 'unavailable-id') { toast('❌ ' + e.message, 5000); return; } } }
      if (!G.online) return;
    }
    this.show();
  },
  show() {
    const el = $('#share'); if (!el) return; const link = inviteLink(G.room);
    $('#shareLink').value = link; $('#shareCode').textContent = G.room; el.classList.remove('hidden');
    $('#shareSub').textContent = G.players.size ? '친구가 이미 들어와 있어요' : (G.isHost ? '이 링크를 카톡/문자로 보내면 친구가 누르자마자 들어와요' : '이 링크로 다른 사람도 이 방을 찾을 수 있어요');
    if (document.pointerLockElement) document.exitPointerLock();
  },
  hide() { const el = $('#share'); if (el) el.classList.add('hidden'); },
  async copy() {
    const link = inviteLink(G.room); let ok = false;
    try { await navigator.clipboard.writeText(link); ok = true; } catch (e) { const i = $('#shareLink'); i.focus(); i.select(); try { ok = document.execCommand('copy'); } catch (e2) { } }
    toast(ok ? '📋 초대 링크 복사 완료! 친구에게 붙여넣기 하세요' : '링크를 길게 눌러 복사해 주세요'); sfx('coin');
  },
  async share() {
    const link = inviteLink(G.room);
    if (navigator.share) { try { await navigator.share({ title: '서부리 시티 3D', text: `서부리 시티 같이 하자! 링크 누르면 바로 들어와 (방 ${G.room})`, url: link }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    this.copy();
  },
  init() {
    $('#shareCopy').onclick = () => this.copy(); $('#shareShare').onclick = () => this.share(); $('#shareClose').onclick = () => this.hide();
    $('#shareLink').onclick = e => e.target.select();
  },
};
