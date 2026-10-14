// @v 2026101410

// ================= 도시 디테일 (그래픽 품질 '보통' 이상) =================
// 월드 생성 난수(wrng)는 건드리지 않는다 → 건물·집 번호가 바뀌지 않게 따로 만든 난수만 쓴다.
//  - 건물 외벽: 층마다 띠(돌출 몰딩) · 유리/금속 빌딩은 세로 핀(멀리언)            (높음 이상)
//  - 인도: 소화전 · 쓰레기통 · 화분 · 볼라드 · 자판기 · 버스 정류장                  (보통 이상)
//  - 도로: 맨홀 뚜껑 · 차선 화살표                                                  (높음 이상)
const FACADES = []; // addBuildingBox가 외벽 정보를 적어 둔다
function buildCityDetail() {
  if (GEN_DRY || typeof G === 'undefined' || G.quality < 1) return;
  const q = G.quality, r = mulberry32(777001), R = (a, b) => a + (b - a) * r();
  // ---- 1) 건물 외벽 ----
  if (q >= 2) for (const F of FACADES) {
    const m = mbAt('plain', F.x, F.z); const fh = (BAY[F.style] || [3, 3.4])[1]; if (F.h < fh * 1.6) continue;
    const n = Math.min(44, Math.floor(F.h / fh)), step = n > 18 ? 2 : 1;
    const band = F.col.clone().multiplyScalar(F.style === 'glass' ? 0.5 : 0.76);
    for (let i = 1; i < n; i += step) m.box(F.x, F.y0 + i * fh - 0.09, F.z, F.w + 0.26, 0.18, F.d + 0.26, band);
    if (F.style === 'glass' || F.style === 'metal') {
      const finC = C(F.style === 'glass' ? 0x39414b : 0x5a5e66);
      for (const along of ['x', 'z']) { const len = along === 'x' ? F.w : F.d, off = along === 'x' ? F.d : F.w, k = Math.max(2, Math.floor(len / 3.2));
        for (let i = 1; i < k; i++) { const t = -len / 2 + i * len / k; for (const sg of [1, -1]) { if (along === 'x') m.box(F.x + t, F.y0 + 0.4, F.z + sg * (off / 2 + 0.07), 0.13, F.h - 0.5, 0.14, finC); else m.box(F.x + sg * (off / 2 + 0.07), F.y0 + 0.4, F.z + t, 0.14, F.h - 0.5, 0.13, finC); } } }
    }
  }
  // ---- 2) 인도 시설물 ----
  const red = C(0xc8262a), cap = C(0xe8e0d0), grn = C(0x2f6a3a), dark = C(0x2a2c30), steel = C(0x8a9098), wood = C(0x8a5a3a), leaf = C(0x3e8a3a), blue = C(0x1f5fc8);
  const hydrant = (x, z, y) => { const m = mbAt('plain', x, z); m.cyl(x, y, z, 0.16, 0.62, red, 10); m.cyl(x, y + 0.62, z, 0.13, 0.12, cap, 10); m.box(x, y + 0.36, z, 0.46, 0.1, 0.1, red); };
  const bin = (x, z, y) => { const m = mbAt('plain', x, z); m.cyl(x, y, z, 0.27, 0.86, grn, 12, 0.24); m.cyl(x, y + 0.86, z, 0.3, 0.06, dark, 12); };
  const planter = (x, z, y, ax) => { const m = mbAt('plain', x, z); const w = ax ? 2.2 : 0.9, d = ax ? 0.9 : 2.2; m.box(x, y, z, w, 0.5, d, C(0x9a9a96)); m.box(x, y + 0.5, z, w - 0.2, 0.08, d - 0.2, C(0x4a3424)); for (let i = 0; i < 3; i++) { const t = (i - 1) * 0.65; m.cyl(x + (ax ? t : 0), y + 0.55, z + (ax ? 0 : t), 0.3, 0.45, leaf, 8, 0.12); } };
  const bollard = (x, z, y) => { const m = mbAt('plain', x, z); m.cyl(x, y, z, 0.09, 0.85, dark, 8); m.cyl(x, y + 0.7, z, 0.095, 0.06, C(0xf2c23a), 8); };
  const vending = (x, z, y, yawX) => { const m = mbAt('plain', x, z); m.box(x, y, z, yawX ? 0.8 : 1.0, 1.9, yawX ? 1.0 : 0.8, C(r() < 0.5 ? 0xd02a2a : 0x2a6ad0)); mbAt('glow', x, z).box(x + (yawX ? yawX * 0.41 : 0), y + 1.0, z + (yawX ? 0 : 0.41), yawX ? 0.02 : 0.7, 0.7, yawX ? 0.7 : 0.02, C(0xbfe8ff)); };
  const busStop = (x, z, y, ax, out) => { // ax: 정류장이 놓인 인도 방향(true = x 방향으로 길다), out: 도로 쪽 부호
    const m = mbAt('plain', x, z); const L = 3.6, D = 1.5; const bx = ax ? 0 : -out * (D / 2), bz = ax ? -out * (D / 2) : 0;
    for (const t of [-L / 2, L / 2]) m.box(x + (ax ? t : bx), y, z + (ax ? bz : t), 0.08, 2.5, 0.08, steel);
    m.box(x, y + 2.5, z, ax ? L + 0.3 : D + 0.3, 0.1, ax ? D + 0.3 : L + 0.3, C(0xd8dce2));
    m.box(x + bx, y + 0.3, z + bz, ax ? L : 0.05, 2.0, ax ? 0.05 : L, C(0x9ec8e0)); // 뒤쪽 유리판
    m.box(x + bx * 0.5, y, z + bz * 0.5, ax ? L - 0.6 : 0.45, 0.45, ax ? 0.45 : L - 0.6, wood); // 의자
    const sx = x + (ax ? L / 2 + 0.6 : out * 0.4), sz = z + (ax ? out * 0.4 : L / 2 + 0.6); m.cyl(sx, y, sz, 0.05, 2.7, steel, 6); m.box(sx, y + 2.3, sz, 0.55, 0.45, 0.06, blue); // 정류장 표지
  };
  for (const b of BLOCKS) {
    const RG = b.region; if (RG === 'disanbay' || RG === 'sea') continue;
    const y = LAND + 0.06; const sides = [[b.x0, b.z0, b.x1, b.z0, 0, 1], [b.x0, b.z1, b.x1, b.z1, 0, -1], [b.x0, b.z0, b.x0, b.z1, 1, 1], [b.x1, b.z0, b.x1, b.z1, 1, -1]];
    for (const [x0, z0, x1, z1, vert, inw] of sides) {
      const len = vert ? z1 - z0 : x1 - x0; if (len < 14) continue; const ax = !vert; // 인도가 길게 뻗은 방향
      const P = (t, o) => vert ? [x0 + inw * o, z0 + t] : [x0 + t, z0 + inw * o]; // t: 변을 따라, o: 도로 끝에서 안쪽으로
      for (const t of [1.2, len - 1.2]) for (const dt of [0, 1.1]) { const [px, pz] = P(t + (t > 1.5 ? -dt : dt), 0.5); bollard(px, pz, y); } // 모퉁이 볼라드
      let busDone = !(len > 60 && r() < 0.35);
      for (let t = 7 + R(0, 4); t < len - 7; t += R(11, 17)) {
        const k = r(), [px, pz] = P(t, 0.75);
        if (!busDone && t > len * 0.35) { busDone = true; const [bx2, bz2] = P(t, 2.3); busStop(bx2, bz2, y, ax, -inw); t += 4; continue; }
        if (k < 0.14) hydrant(px, pz, y); else if (k < 0.42) bin(px, pz, y); else if (k < 0.62) { const [qx, qz] = P(t, 3.3); planter(qx, qz, y, ax); } else if (k < 0.7 && q >= 2) { const [vx, vz] = P(t, 3.6); vending(vx, vz, y, vert ? -inw : 0); }
      }
    }
  }
  // ---- 3) 도로: 맨홀 · 화살표 ----
  if (q >= 2) for (const e of EDGES) {
    if (e.bridge) continue; const a = NODES[e.a], b = NODES[e.b]; const dx = (b.x - a.x) / e.len, dz = (b.z - a.z) / e.len, px = -dz, pz = dx;
    for (let t = 18 + R(0, 10); t < e.len - 18; t += R(35, 55)) { const o = R(-e.w / 4, e.w / 4), x = a.x + dx * t + px * o, z = a.z + dz * t + pz * o; mbAt('plain', x, z).cyl(x, groundHeight(x, z) + 0.072, z, 0.42, 0.02, C(0x3a3c40), 14); }
    if (e.w >= 14 && e.len > 50) for (const [t, dir] of [[12, 1], [e.len - 12, -1]]) for (const s of [-1, 1]) {
      if (s !== dir) continue; const o = s * e.w / 4, cx = a.x + dx * t + px * o, cz = a.z + dz * t + pz * o, y2 = groundHeight(cx, cz) + 0.082; const m = mbAt('plain', cx, cz), W = C(0xf2f2f2);
      const fx = dx * dir, fz = dz * dir, qx = px * dir, qz = pz * dir; // 화살표 = 몸통 + 머리 (진행 방향)
      m.quad([cx - qx * 0.15, y2, cz - qz * 0.15], [cx + qx * 0.15, y2, cz + qz * 0.15], [cx + qx * 0.15 + fx * 2.2, y2, cz + qz * 0.15 + fz * 2.2], [cx - qx * 0.15 + fx * 2.2, y2, cz - qz * 0.15 + fz * 2.2], W);
      m.tri([cx - qx * 0.55 + fx * 2.2, y2, cz - qz * 0.55 + fz * 2.2], [cx + qx * 0.55 + fx * 2.2, y2, cz + qz * 0.55 + fz * 2.2], [cx + fx * 3.2, y2, cz + fz * 3.2], W);
    }
  }
}
// 화면 가장자리를 살짝 어둡게 + 색감을 조금 진하게 (높음 이상에서 블룸과 함께)
const GRADE_SHADER = {
  uniforms: { tDiffuse: { value: null }, amt: { value: 0.75 }, sat: { value: 1.1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform sampler2D tDiffuse; uniform float amt; uniform float sat; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 d = vUv - 0.5; c.rgb *= clamp(1.0 - dot(d, d) * amt, 0.0, 1.0); float l = dot(c.rgb, vec3(0.299, 0.587, 0.114)); c.rgb = mix(vec3(l), c.rgb, sat); gl_FragColor = c; }',
};
