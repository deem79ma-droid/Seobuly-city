// ================= 주차장: 차 소환 =================
// 주차장 정산기(🅿️)에서 E → 차종 선택 → 빈 주차면에 내 차가 나온다. 한 사람당 소환 차는 1대(다시 부르면 이전 차는 사라진다).
const PARKING = {
  cur: null, // 지금 소환해 둔 차 id
  MODELS: ['hatch', 'sedan', 'suv', 'pickup', 'van', 'sports', 'supercar', 'scooter', 'bike', 'superbike'],
  fee(k) { if (ADMIN.on) return 0; const M = VMODELS[k]; return Math.max(500, Math.round(M.price * 0.02 / 100) * 100); },
  icon(k) { const M = VMODELS[k]; return M.kind === 'bike' ? '🏍️' : k === 'supercar' || k === 'sports' ? '🏎️' : k === 'suv' || k === 'pickup' ? '🚙' : k === 'van' ? '🚐' : '🚗'; },
  freeBay(lot) {
    const near = [...vehicles.values()].filter(v => !v.dead && Math.abs(v.x - lot.cx) < 90 && Math.abs(v.z - lot.cz) < 90);
    const k = lot.fac; let best = null, bd = 1e9;
    for (const b of lot.bays) {
      if (near.some(v => Math.hypot(v.x - b.x, v.z - b.z) < 2.6)) continue;
      if (Math.hypot(ME.x - b.x, ME.z - b.z) < 1.6) continue;
      if ([...G.players.values()].some(rp => Math.hypot(rp.x - b.x, rp.z - b.z) < 1.6)) continue;
      const d = Math.hypot(b.x - k.x, b.z - k.z); if (d < bd) { bd = d; best = b; }
    }
    return best;
  },
  open(f) {
    const lot = PARKING_LOTS[f.lot]; if (!lot) return;
    const curV = this.cur && vehicles.get(this.cur);
    const items = this.MODELS.map(k => { const M = VMODELS[k]; return { ic: this.icon(k), t: M.name, p: this.fee(k), d: `최고 ${Math.round(M.max * 3.6)}km/h · ${M.kind === 'bike' ? '바이크' : '승용'}`, fn: () => this.summon(lot, { model: k, color: M.kind === 'bike' ? pick(['#c41818', '#1a1a1a', '#f2f2f2', '#1a4ad0']) : pick(CAR_COLORS), id: 'pk_' + ME.id }) }; });
    for (const g of ME.garage) items.unshift({ ic: '🔑', t: `내 차 · ${VMODELS[g.model].name}`, p: 0, d: '구매한 차 · 무료로 꺼내기', fn: () => this.summon(lot, g) });
    if (curV) items.push({ ic: '🧹', t: '소환한 차 돌려보내기', p: 0, d: VMODELS[curV.model].name, fn: () => { if (this.despawn()) toast('🅿️ 차를 돌려보냈다'); } });
    UI.openMenu('🅿️ 주차장 · 차 소환', `${REGIONS[lot.region] ? REGIONS[lot.region].name + ' ' : ''}주차장 — 빈 자리에 바로 나온다 · 1인 1대 (다시 부르면 이전 차는 사라짐)${ADMIN.on ? ' · 👑 관리자 무료' : ''}`, items);
  },
  despawn() {
    const v = this.cur && vehicles.get(this.cur); this.cur = null; if (!v) return false;
    if (v.driver && v.driver !== ME.id) { toast('누군가 그 차를 운전 중이라 회수하지 못했다'); return false; }
    if (ME.vehicle === v) exitVehicle(true);
    v.remove(); NET.send({ t: 'vdel', id: v.id }); return true;
  },
  summon(lot, g) {
    if (ME.jail) { toast('수감 중에는 차를 부를 수 없다'); return; }
    const bay = this.freeBay(lot); if (!bay) { toast('🅿️ 빈 주차 자리가 없다'); if (!ADMIN.on) ME.money += this.feeOf(g); return; }
    const old = this.cur && vehicles.get(this.cur);
    if (old && old.driver && old.driver !== ME.id) { toast('이전 차를 다른 사람이 운전 중이다'); if (!ADMIN.on) ME.money += this.feeOf(g); return; }
    this.despawn();
    let v = vehicles.get(g.id); if (v) { if (ME.vehicle === v) exitVehicle(true); v.remove(); NET.send({ t: 'vdel', id: v.id }); }
    v = new Vehicle(g.id, g.model, g.color, bay.x, bay.z, bay.yaw, { owner: ME.id }); v.dyn = true; v.ctrl = 'local'; v.mesh.visible = true; v.speed = 0;
    NET.send({ t: 'vspawn', id: v.id, model: g.model, color: g.color, x: bay.x, z: bay.z, yaw: bay.yaw, owner: ME.id });
    this.cur = v.id; UI.waypoint = { x: bay.x, z: bay.z }; FX.emoji && FX.emoji('🅿️', bay.x, LAND + 2.4, bay.z, 0.6); sfx('levelup');
    announce('🅿️ 차량 소환', `${VMODELS[g.model].name} — 주차장 ${lot.bays.indexOf(bay) + 1}번 자리`);
  },
  feeOf(g) { return g.id && g.id.startsWith('pk_') ? this.fee(g.model) : 0; },
};
