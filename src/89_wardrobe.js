// @v 2026101323
// ================= 옷가게 · 옷장 =================
// 로비 꾸미기는 그대로(기본 외형). 게임 안에서는 옷가게에서 옷을 "사서" 옷장에 모으고 갈아입는다.
// 기본 외형(base) 위에 입은 옷(worn)을 덮어써서 실제 외형을 만든다 → NET 'outfit' 으로 상대에게 동기화.
const CLOTH_SLOTS = [['top', '상의', '👕'], ['bottom', '하의', '👖'], ['shoes', '신발', '👟'], ['hat', '모자', '🧢'], ['glasses', '안경', '🕶️']];
const CLOTH = (() => {
  const L = []; const add = (slot, id, name, set, price) => L.push({ id, slot, name, set, price });
  const TOPS = [['tshirt', '반팔티', 9000], ['long', '긴팔티', 15000], ['hoodie', '후드티', 39000], ['jacket', '재킷', 69000], ['tank', '나시', 7000], ['suit', '정장 상의', 149000]];
  const TC = [['#f2f2f2', '화이트'], ['#1c1c22', '블랙'], ['#d03a3a', '레드'], ['#3a6ad0', '블루'], ['#3aa060', '그린'], ['#e0b030', '머스타드'], ['#8a4ad0', '퍼플'], ['#e06aa0', '핑크'], ['#a8b4c0', '그레이'], ['#6a4a2a', '브라운']];
  TOPS.forEach(([st, n, p], i) => TC.forEach(([c, cn], j) => { if ((i + j) % 2 && st !== 'suit') return; if (st === 'suit' && !['#1c1c22', '#2a2a4a', '#a8b4c0', '#6a4a2a'].includes(c) && j > 2) return; add('top', `t_${st}_${j}`, `${cn} ${n}`, { top: st, topColor: c }, p + (j % 3) * 1000); }));
  add('top', 't_suit_navy', '네이비 정장 상의', { top: 'suit', topColor: '#2a2a4a' }, 159000);
  const BOT = [['jeans', '청바지', 29000], ['slacks', '슬랙스', 35000], ['cargo', '카고바지', 32000], ['shorts', '반바지', 12000], ['skirt', '치마', 25000]];
  const BC = [['#2a3a5a', '인디고'], ['#1c1c22', '블랙'], ['#5a4a3a', '브라운'], ['#8a8a90', '그레이'], ['#c8b89a', '베이지'], ['#3a4a6a', '네이비']];
  BOT.forEach(([st, n, p], i) => BC.forEach(([c, cn], j) => { if ((i + j) % 2) return; add('bottom', `b_${st}_${j}`, `${cn} ${n}`, { bottom: st, bottomColor: c }, p); }));
  [['#1a1a1a', '블랙 스니커즈', 39000], ['#f0f0f0', '화이트 스니커즈', 45000], ['#6a3a1a', '브라운 로퍼', 79000], ['#d03a3a', '레드 하이탑', 59000], ['#3a6ad0', '블루 러닝화', 69000], ['#e0b030', '옐로 워커', 89000]].forEach(([c, n, p], j) => add('shoes', `s_${j}`, n, { shoes: c }, p));
  const HATS = [['cap', '야구모자', 19000], ['beanie', '비니', 15000], ['fedora', '중절모', 49000], ['bandana', '두건', 9000]];
  HATS.forEach(([st, n, p], i) => [['#1c1c22', '블랙'], ['#d03a3a', '레드'], ['#3a6ad0', '블루'], ['#f2f2f2', '화이트'], ['#6a4a2a', '브라운']].forEach(([c, cn], j) => { if ((i + j) % 2 && j) return; add('hat', `h_${st}_${j}`, `${cn} ${n}`, { hat: st, hatColor: c }, p); }));
  add('glasses', 'g_glasses', '뿔테 안경', { glasses: 'glasses' }, 59000); add('glasses', 'g_sun', '선글라스', { glasses: 'sunglasses' }, 99000);
  return L;
})();
const CLOTH_BY = new Map(CLOTH.map(c => [c.id, c]));
const WARDROBE = {
  base: null, own: [], worn: {}, tab: 'top', prev: null, _yaw: null,
  load(sv) { this.own = Array.isArray(sv?.wardrobe) ? sv.wardrobe.filter(id => CLOTH_BY.has(id)) : []; this.worn = {}; const w = sv?.worn || {}; for (const [s] of CLOTH_SLOTS) if (w[s] && this.own.includes(w[s])) this.worn[s] = w[s]; },
  outfit(extra) { const o = Object.assign({}, this.base || ME.outfit); for (const [s] of CLOTH_SLOTS) { const it = CLOTH_BY.get(this.worn[s]); if (it) Object.assign(o, it.set); } if (extra) Object.assign(o, extra.set); else { const u = typeof JOBS !== 'undefined' && JOBS.uniform(); if (u) Object.assign(o, u); } return o; }, // 직업 유니폼은 옷 위에 (옷가게 미리보기 중엔 미리보기 우선)
  apply(send = true) { // 실제 외형 적용 + 동기화 (관리자는 정장·선글라스 고정 규칙 유지)
    if (ADMIN.on) { if (ADMIN.prev) ADMIN.prev.outfit = this.outfit(); return; }
    ME.outfit = this.outfit(); if (ME.char) ME.char.setOutfit(ME.outfit); if (send) NET.send({ t: 'outfit', o: ME.outfit });
  },
  // 관리자 모드: 일반 옷 대신 관리자 전용 아이템만 (관리자 모드를 끄면 원래 옷으로)
  renderAdmin() {
    const box = $('#menuBox'); const on = ME.outfit.mask === 'admin';
    box.innerHTML = `<h2>👑 관리자 옷장</h2><div class="desc">관리자 모드에서만 보이는 전용 아이템 · 관리자 모드를 끄면 원래 옷으로 돌아간다</div><div class="ctabs"><button class="ctab on">👑 관리자</button></div><div class="clist"><button class="citem${on ? ' on' : ''}" data-id="a_mask"><i class="sw" style="background:#0d0d10;box-shadow:inset 0 0 0 3px #ff2a2a"></i><span class="t">관리자 마스크</span><span class="p">${on ? '착용 중' : '무료'}</span></button></div><div class="cact"><span class="desc" style="margin:0">누르면 쓰기 / 벗기</span></div><button class="btn b3 close">닫기</button>`;
    box.querySelector('.citem').onclick = () => { AU.init(); this.toggleAdminMask(); };
    box.querySelector('.close').onclick = () => UI.closeMenu();
  },
  toggleAdminMask() {
    if (!ADMIN.on) return; const on = ME.outfit.mask === 'admin';
    ME.outfit = Object.assign({}, ME.outfit, { mask: on ? 'none' : 'admin' }); if (ME.char) ME.char.setOutfit(ME.outfit); NET.send({ t: 'outfit', o: ME.outfit });
    sfx('ui'); toast(on ? '마스크를 벗었다' : '👑 관리자 마스크 착용'); this.render();
  },
  save() { return { wardrobe: this.own.slice(), worn: Object.assign({}, this.worn) }; },
  lose() { // 사망: 산 옷 전부 잃고 기본 외형으로
    const n = this.own.length; this.own = []; this.worn = {}; this.apply(); return n;
  },
  priceOf(it) { return ADMIN.on ? 0 : it.price; },
  open() {
    UI.menuOpen = true; if (document.pointerLockElement) document.exitPointerLock();
    this.prev = null; this._yaw = CAM.yaw; CAM.yaw = ME.yaw + Math.PI; // 앞모습이 보이게 카메라를 돌린다
    $('#menu').classList.add('side'); UI._onClose = () => this.close(); this.render();
    $('#menu').classList.remove('hidden');
  },
  close() { $('#menu').classList.remove('side'); if (this._yaw !== null) CAM.yaw = this._yaw; this._yaw = null; this.prev = null; if (ME.char) ME.char.setOutfit(ME.outfit); },
  preview(it) { this.prev = it ? it.id : null; if (ME.char) ME.char.setOutfit(this.outfit(it)); this.render(); },
  buy(it) {
    if (this.own.includes(it.id)) return this.wear(it); if (CREDIT.blocked()) { toast('⛔ 신용불량자 — 구매 불가'); return; } const p = this.priceOf(it);
    if (ME.money < p) { toast('💸 돈이 부족하다'); sfx('error'); return; }
    ME.money -= p; this.own.push(it.id); this.worn[it.slot] = it.id; this.prev = null; this.apply(); sfx('cash'); toast(`🛍️ ${it.name} 구매 · 착용!`); saveGame(); this.render(); CINE.big('새 옷', it.name, '#ff7ad0', 1800);
  },
  wear(it) { this.worn[it.slot] = it.id; this.prev = null; this.apply(); sfx('ui'); toast(`👕 ${it.name} 착용`); saveGame(); this.render(); },
  takeOff(slot) { delete this.worn[slot]; this.prev = null; this.apply(); sfx('ui'); toast('기본 옷으로 돌아왔다'); saveGame(); this.render(); },
  render() {
    if (ADMIN.on) return this.renderAdmin();
    const box = $('#menuBox'); const tab = this.tab; const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const tabs = CLOTH_SLOTS.map(([s, n, ic]) => `<button class="ctab${tab === s ? ' on' : ''}" data-tab="${s}">${ic} ${n}</button>`).join('') + `<button class="ctab${tab === 'own' ? ' on' : ''}" data-tab="own">🧺 내 옷장 ${this.own.length}</button>`;
    const list = tab === 'own' ? this.own.map(id => CLOTH_BY.get(id)).filter(Boolean) : CLOTH.filter(c => c.slot === tab);
    const sw = it => { const c = it.set.topColor || it.set.bottomColor || it.set.shoes || it.set.hatColor || (it.set.glasses === 'sunglasses' ? '#111' : '#c8a060'); return `<i class="sw" style="background:${c}"></i>`; };
    const rows = list.map(it => { const own = this.own.includes(it.id), on = this.worn[it.slot] === it.id, pv = this.prev === it.id; return `<button class="citem${pv ? ' pv' : ''}${on ? ' on' : ''}" data-id="${it.id}">${sw(it)}<span class="t">${esc(it.name)}</span><span class="p">${on ? '착용 중' : own ? '보유' : fmtMoney(this.priceOf(it))}</span></button>`; }).join('') || '<div class="desc">아직 산 옷이 없다 — 위 탭에서 골라 보세요</div>';
    const cur = CLOTH_BY.get(this.prev); const own = cur && this.own.includes(cur.id);
    const act = cur ? `<div class="cact"><b>${esc(cur.name)}</b>${own ? `<button class="btn" data-act="wear">입기</button>` : `<button class="btn" data-act="buy">구매 ${fmtMoney(this.priceOf(cur))}</button>`}<button class="btn b3" data-act="unprev">취소</button></div>` : `<div class="cact"><span class="desc" style="margin:0">옷을 누르면 미리보기 → 구매/입기</span>${tab !== 'own' && this.worn[tab] ? `<button class="btn b3" data-act="off">${CLOTH_SLOTS.find(s => s[0] === tab)[1]} 벗기</button>` : ''}</div>`;
    box.innerHTML = `<h2>👕 옷가게</h2><div class="desc">산 옷은 옷장에 저장 · 언제든 갈아입기 · 보유 ${fmtMoney(ME.money)} · ⚠️ 사망하면 산 옷도 모두 잃는다</div><div class="ctabs">${tabs}</div><div class="clist">${rows}</div>${act}<button class="btn b3 close">닫기</button>`;
    box.querySelectorAll('.ctab').forEach(b => b.onclick = () => { AU.init(); sfx('ui'); this.tab = b.dataset.tab; this.preview(null); });
    box.querySelectorAll('.citem').forEach(b => b.onclick = () => { AU.init(); sfx('ui'); const it = CLOTH_BY.get(b.dataset.id); if (this.prev === it.id) { this.own.includes(it.id) ? this.wear(it) : this.buy(it); } else this.preview(it); });
    const A = box.querySelector('.cact'); A.querySelectorAll('[data-act]').forEach(b => b.onclick = () => { AU.init(); const a = b.dataset.act; if (a === 'buy') this.buy(cur); else if (a === 'wear') this.wear(cur); else if (a === 'off') this.takeOff(tab); else this.preview(null); });
    box.querySelector('.close').onclick = () => UI.closeMenu();
  },
};
// ================= 사망 시 소지품 전부 잃기 =================
const INV_NAME = { grenade: '수류탄', wood: '🪵 나무', meat: '🍖 고기', food: '🍱 도시락', medkit: '🩹 구급상자', drink: '🥤 음료', ticket: '🎟️ 입장권', card: '🪪 출소카드' };
function loseAllOnDeath() {
  if (adminGod()) return null; // 관리자 면제
  const lost = []; const money = Math.max(0, Math.floor(ME.money));
  if (money > 0) lost.push(`💸 현금 ${fmtMoney(money)}`);
  const ws = Object.keys(ME.weapons || {}).filter(w => w !== 'fist' && ME.weapons[w]); if (ws.length) lost.push('🔫 무기 ' + ws.map(w => (WEAPONS[w] ? WEAPONS[w].icon + WEAPONS[w].name : w)).join(', '));
  const am = Object.values(ME.ammo || {}).reduce((a, b) => a + (+b || 0), 0) + Object.values(ME.mag || {}).reduce((a, b) => a + (+b || 0), 0); if (am > 0) lost.push(`🧨 탄약 ${am}발`);
  const it = Object.keys(ME.inv || {}).filter(k => (ME.inv[k] | 0) > 0); if (it.length) lost.push('🎒 ' + it.map(k => `${INV_NAME[k] || k} ×${ME.inv[k] | 0}`).join(', '));
  if (ME.armor > 0) lost.push('🦺 방탄복');
  const nCl = WARDROBE.own.length; if (nCl) lost.push(`👕 산 옷 ${nCl}벌 (기본 옷으로)`);
  ME.money = 0; ME.weapons = { fist: 1 }; ME.ammo = {}; ME.mag = {}; for (const k in ME.inv) ME.inv[k] = 0; ME.armor = 0;
  if (ME.weapon !== 'fist') { ME.weapon = 'fist'; if (ME.char && ME.char.setWeapon) ME.char.setWeapon('fist'); }
  WARDROBE.lose(); UI.buildHotbar && UI.buildHotbar(); if (UI.updateWeapon) UI.updateWeapon(); saveGame();
  return lost;
}
