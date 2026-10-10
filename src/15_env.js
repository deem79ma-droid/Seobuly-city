
// ================= ENVIRONMENT (sky, sun, fog, weather) =================
const ENV = { night: 0, sunDir: new THREE.Vector3(), envT: -99, lampLights: [], rainT: 0 };
function initEnv() {
  const sky = ENV.sky = new Sky(); sky.scale.setScalar(30000); scene.add(sky);
  const u = sky.material.uniforms; u.turbidity.value = 5; u.rayleigh.value = 1.6; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.82;
  ENV.envScene = new THREE.Scene(); ENV.envSky = new Sky(); ENV.envSky.scale.setScalar(1000); ENV.envScene.add(ENV.envSky);
  ENV.pmrem = new THREE.PMREMGenerator(renderer);
  const sun = ENV.sun = new THREE.DirectionalLight(0xffffff, 3);
  const q = Q();
  if (q.shadow) {
    sun.castShadow = true; sun.shadow.mapSize.set(q.shadow, q.shadow);
    const R = q.shadow >= 4096 ? 120 : q.shadow >= 2048 ? 95 : 70; ENV.shadowR = R;
    Object.assign(sun.shadow.camera, { left: -R, right: R, top: R, bottom: -R, near: 10, far: 900 });
    sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.035; sun.shadow.radius = 2;
  }
  scene.add(sun, sun.target);
  ENV.hemi = new THREE.HemisphereLight(0xbfd8ff, 0x5a4a38, 0.7); scene.add(ENV.hemi);
  ENV.amb = new THREE.AmbientLight(0x8090b0, 0.08); scene.add(ENV.amb);
  scene.fog = new THREE.FogExp2(0xa8c4e0, 1 / q.view);
  // stars
  const N = 3000, sp = new Float32Array(N * 3); const r = mulberry32(42);
  for (let i = 0; i < N; i++) { const a = r() * TAU, b = Math.acos(r() * 0.95); sp[i * 3] = Math.sin(b) * Math.cos(a) * 9000; sp[i * 3 + 1] = Math.cos(b) * 9000; sp[i * 3 + 2] = Math.sin(b) * Math.sin(a) * 9000; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  ENV.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })); scene.add(ENV.stars);
  // moon
  ENV.moon = new THREE.Mesh(new THREE.SphereGeometry(160, 24, 16), new THREE.MeshBasicMaterial({ color: 0xf0f0ff, fog: false, transparent: true })); scene.add(ENV.moon);
  // clouds
  const pn = (x, y, P) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const H = (i, j) => hash2(((i % P) + P) % P, ((j % P) + P) % P); return lerp(lerp(H(xi, yi), H(xi + 1, yi), u), lerp(H(xi, yi + 1), H(xi + 1, yi + 1), u), v); };
  const ct = canvasTex(512, 512, (x, w, h) => {
    const id = x.createImageData(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      let v = 0, a = 0.5; for (let o = 0; o < 5; o++) { const P = 4 << o; v += a * pn(i / w * P, j / h * P, P); a *= 0.5; }
      const d = clamp((v - 0.52) * 3.2, 0, 1); const o = (j * w + i) * 4; id.data[o] = id.data[o + 1] = id.data[o + 2] = 255 - d * 30; id.data[o + 3] = d * 235;
    }
    x.putImageData(id, 0, 0);
  }, { srgb: false });
  ct.repeat.set(4, 4);
  ENV.clouds = new THREE.Mesh(new THREE.PlaneGeometry(26000, 26000), new THREE.MeshBasicMaterial({ map: ct, transparent: true, depthWrite: false, fog: false, opacity: 0.8 }));
  ENV.clouds.rotation.x = Math.PI / 2; ENV.clouds.position.y = 1400; scene.add(ENV.clouds);
  // rain
  const RN = 4000; const rp = new Float32Array(RN * 6); for (let i = 0; i < RN; i++) { const x = rnd(-60, 60), y = rnd(0, 50), z = rnd(-60, 60); rp.set([x, y, z, x + 0.05, y - 0.7, z], i * 6); }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  ENV.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xaabbcc, transparent: true, opacity: 0.35 })); ENV.rain.frustumCulled = false; ENV.rain.visible = false; scene.add(ENV.rain);
  // lamp lights pool
  for (let i = 0; i < q.lamps; i++) { const l = new THREE.PointLight(0xffc880, 0, 22, 1.6); scene.add(l); ENV.lampLights.push(l); }
  ENV.carLight = new THREE.SpotLight(0xfff2dd, 0, 60, 0.55, 0.5, 1.2); scene.add(ENV.carLight, ENV.carLight.target);
  ENV.clubLights = [];
  for (let i = 0; i < 3; i++) { const l = new THREE.SpotLight(0xff00ff, 0, 60, 0.35, 0.4, 1); l.position.set(CLUB.x + (i - 1) * 14, LAND + 12, CLUB.z - CLUB.d / 2 + 2); scene.add(l, l.target); ENV.clubLights.push(l); }
}
const _skyCol = new THREE.Color(), _c2 = new THREE.Color();
function updateEnv(dt, focus) {
  G.time += dt / 60 * (G.timeScale || 1); if (G.time >= 24) { G.time -= 24; G.day++; }
  const th = (G.time / 24) * TAU - Math.PI / 2; const sy = Math.sin(th), sx = Math.cos(th);
  ENV.sunDir.set(sx * 0.9, sy, 0.38).normalize();
  const night = ENV.night = smooth(0.06, -0.12, sy); const day = 1 - night;
  const dusk = Math.max(0, 1 - Math.abs(sy) * 5) * (sy > -0.15 ? 1 : 0);
  const sky = ENV.sky.material.uniforms; sky.sunPosition.value.copy(ENV.sunDir); ENV.envSky.material.uniforms.sunPosition.value.copy(ENV.sunDir);
  const rain = G.rainAmt; sky.rayleigh.value = lerp(1.6, 3.5, rain); sky.turbidity.value = lerp(5, 18, rain);
  // sun / moon light
  const S = ENV.sun; const useMoon = sy < 0.02;
  const ld = useMoon ? new THREE.Vector3(-sx * 0.6, Math.max(0.25, -sy), 0.5).normalize() : ENV.sunDir;
  const R = ENV.shadowR || 80; const tex = R * 2 / (Q().shadow || 1024);
  const fx = Math.round(focus.x / tex) * tex, fz = Math.round(focus.z / tex) * tex;
  S.target.position.set(fx, focus.y, fz); S.position.set(fx + ld.x * 400, focus.y + ld.y * 400, fz + ld.z * 400);
  S.intensity = useMoon ? 0.22 * (1 - rain * 0.6) : lerp(0, 2.5, smooth(0.0, 0.25, sy)) * (1 - rain * 0.65);
  S.color.setRGB(1, lerp(0.62, 0.97, smooth(0, 0.35, sy)), lerp(0.4, 0.92, smooth(0, 0.35, sy)));
  if (useMoon) S.color.setRGB(0.6, 0.7, 1);
  ENV.hemi.intensity = lerp(0.08, 0.5, day) * (1 - rain * 0.3); ENV.hemi.color.setRGB(lerp(0.25, 0.75, day), lerp(0.3, 0.85, day), lerp(0.55, 1, day));
  ENV.amb.intensity = 0.06 + night * 0.12;
  // fog / bg
  _skyCol.setRGB(lerp(0.012, 0.36, day), lerp(0.02, 0.5, day), lerp(0.05, 0.74, day));
  if (dusk > 0) { _c2.setRGB(0.95, 0.55, 0.35); _skyCol.lerp(_c2, dusk * 0.55); }
  _c2.setRGB(0.5, 0.53, 0.57).multiplyScalar(lerp(0.15, 1, day)); _skyCol.lerp(_c2, rain * 0.8);
  scene.fog.color.copy(_skyCol); scene.fog.density = (1 / Q().view) * (1.1 + rain * 2.5) * (focus.y > 60 ? 0.6 : 1);
  renderer.toneMappingExposure = lerp(0.55, 0.5, day);
  if (bloomPass) { bloomPass.strength = lerp(0.06, 0.5, night); bloomPass.threshold = lerp(3.0, 0.72, night); }
  // emissives
  const win = clamp(night * 1.3 + rain * 0.3, 0, 1.3);
  for (const k of ['glass', 'office', 'brick', 'apt', 'house', 'metal']) MAT[k].emissiveIntensity = win * (k === 'glass' ? 1.3 : 1.1);
  MAT.shop.emissiveIntensity = 0.25 + night * 0.75;
  if (lampHeads) lampHeads.material.emissiveIntensity = night * 6;
  MAT.roadMain.roughness = MAT.roadLocal.roughness = MAT.roadPlain.roughness = lerp(0.92, 0.35, rain);
  // stars, moon, clouds
  ENV.stars.material.opacity = night * (1 - rain); ENV.stars.position.set(focus.x, 0, focus.z);
  ENV.moon.position.set(focus.x - sx * 6000, -sy * 6000 + 300, focus.z + 2500); ENV.moon.material.opacity = night;
  ENV.clouds.position.x = focus.x + (G.t * 6) % 2000; ENV.clouds.position.z = focus.z;
  ENV.clouds.material.color.copy(_skyCol).lerp(_c2.setRGB(1, 1, 1), day * 0.7); ENV.clouds.material.opacity = 0.75 + rain * 0.25;
  // rain
  ENV.rain.visible = rain > 0.05; if (ENV.rain.visible) { ENV.rain.position.set(focus.x, focus.y - 10, focus.z); ENV.rain.material.opacity = rain * 0.4; const p = ENV.rain.geometry.attributes.position; const a = p.array; for (let i = 0; i < a.length; i += 6) { a[i + 1] -= dt * 30; a[i + 4] -= dt * 30; if (a[i + 1] < 0) { a[i + 1] += 50; a[i + 4] += 50; } } p.needsUpdate = true; }
  // weather change (host)
  if (G.isHost) { G.weatherT -= dt; if (G.weatherT <= 0) { G.weatherT = rnd(240, 600); G.weather = Math.random() < 0.25 ? 'rain' : Math.random() < 0.3 ? 'cloudy' : 'clear'; } }
  G.rainAmt = damp(G.rainAmt, G.weather === 'rain' ? 1 : G.weather === 'cloudy' ? 0.35 : 0, 0.3, dt);
  // env map
  if (G.t - ENV.envT > 6) { ENV.envT = G.t; if (ENV.envRT) ENV.envRT.dispose(); ENV.envSky.material.uniforms.rayleigh.value = sky.rayleigh.value; ENV.envSky.material.uniforms.turbidity.value = sky.turbidity.value; ENV.envRT = ENV.pmrem.fromScene(ENV.envScene, 0.04); scene.environment = ENV.envRT.texture; scene.environmentIntensity = lerp(0.06, 0.45, day); }
  // lamp lights near camera
  if (ENV.lampLights.length && Math.floor(G.t * 2) !== ENV.lampTick) {
    ENV.lampTick = Math.floor(G.t * 2);
    if (night > 0.2) { const near = LAMPS.map(l => [l, dist2(l.x, l.z, focus.x, focus.z)]).filter(a => a[1] < 120 * 120).sort((a, b) => a[1] - b[1]); ENV.lampLights.forEach((L, i) => { const l = near[i]; if (l) { L.position.set(l[0].x - Math.sin(l[0].yaw) * 2, l[0].y + 6.8, l[0].z - Math.cos(l[0].yaw) * 2); L.intensity = 40 * night; } else L.intensity = 0; }); }
    else ENV.lampLights.forEach(L => L.intensity = 0);
  }
  // club lights
  const nearClub = Math.hypot(focus.x - CLUB.x, focus.z - CLUB.z) < 160;
  ENV.clubLights.forEach((l, i) => { l.intensity = nearClub ? 260 * (0.4 + night) : 0; l.color.setHSL((G.t * 0.1 + i * 0.33) % 1, 1, 0.5); l.target.position.set(CLUB.x + Math.sin(G.t * 1.3 + i * 2) * 15, LAND, CLUB.z + Math.cos(G.t * 1.1 + i) * 12); });
  if (danceFloor && nearClub) { const cols = danceFloor.geometry.attributes.color; if (Math.floor(G.t * 4) !== ENV.dfTick) { ENV.dfTick = Math.floor(G.t * 4); for (let i = 0; i < cols.count; i += 24) { const c = new THREE.Color().setHSL(Math.random(), 1, Math.random() < 0.5 ? 0.55 : 0.1); for (let k = 0; k < 24 && i + k < cols.count; k++) cols.setXYZ(i + k, c.r, c.g, c.b); } cols.needsUpdate = true; } }
  // traffic lights
  if (tlBulbs && Math.floor(G.t) !== ENV.tlTick) {
    ENV.tlTick = Math.floor(G.t); const list = tlBulbs.userData.list; const c = new THREE.Color();
    list.forEach((l, i) => { const st = lightState(l.axis); c.set(st === 'g' ? 0x10ff60 : st === 'y' ? 0xffc010 : 0xff2020).multiplyScalar(2); tlBulbs.setColorAt(i, c); }); tlBulbs.instanceColor.needsUpdate = true;
  }
  // door rings pulse
  const pulse = 1 + Math.sin(G.t * 4) * 0.08; for (const r of DOOR_RINGS) r.scale.setScalar(pulse);
  // world animated
  for (const a of ANIMATED) a.fn(a.obj, G.t);
  if (waterNormal) { waterNormal.offset.x = G.t * 0.004; waterNormal.offset.y = G.t * 0.0025; }
  grassUniforms.time.value = G.t;
  // smokers
  for (const s of SMOKERS) {
    if (Math.abs(s.x - focus.x) > 300 || Math.abs(s.z - focus.z) > 300) continue;
    if (Math.random() < s.rate * 60 * dt) {
      if (s.fountain) { const n = s.big ? 3 : 1; for (let i = 0; i < n; i++) { const a = rnd(0, TAU); FX.emit(false, s.x, s.y, s.z, Math.cos(a) * rnd(0.5, 1.6), rnd(4, 6), Math.sin(a) * rnd(0.5, 1.6), 1.2, 0.18, 0.12, 0.8, 0.9, 1, 0.7, 9, 0.2); } }
      else if (s.fire) { FX.fire(s.x, s.y, s.z, 0.5); if (Math.random() < 0.3) FX.smoke(s.x, s.y + 0.5, s.z, 0.15, 0.4); }
      else FX.smoke(s.x, s.y, s.z, 0.55, 2);
    }
  }
}
function lightState(axis) { const c = (G.t % 24); const xGreen = c < 10, xYellow = c >= 10 && c < 12, zGreen = c >= 12 && c < 22; if (axis === 'x') return xGreen ? 'g' : xYellow ? 'y' : 'r'; return zGreen ? 'g' : (c >= 22) ? 'y' : 'r'; }
