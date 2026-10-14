// @v 2026101410

// ================= 사람 3D 모델 (가까운 사람만) =================
// 남자 = Xbot(매끈한 마네킹 몸) · 여자 = Michelle. 둘 다 Mixamo 뼈대라 같은 방식으로 움직인다.
//  - 기존 캐릭터의 뼈대(P.hips · P.spine · P.shL …)가 계산한 자세를 3D 모델 뼈에 그대로 옮긴다
//    (걷기·운전·춤·조준·쓰러짐 등 모든 동작이 그대로 나온다)
//  - 옷은 몸 부위별로 색칠 (상의·하의·소매·신발 · 줄무늬티는 가로 줄)
//  - 머리는 기존 얼굴(눈·입·머리카락·모자·안경)을 모델 목 위에 얹는다 → 얼굴·헤어 다양성 유지
//  - 치마·코트·후드·가방 같은 장식은 그대로 위에 입힌다
//  - 모든 사람이 3D 모델 · 먼 사람은 자세 계산을 덜 자주 (모델을 불러오는 동안만 기본 모델)
const HUMAN_MAP = { // 모델 뼈 이름 → 우리 뼈대
  Hips: 'hips', Spine: 'spine', Spine1: 'spine', Spine2: 'spine', Neck: 'neck', Head: 'head',
  LeftShoulder: 'spine', LeftArm: 'shL', LeftForeArm: 'elL', LeftHand: 'handL', RightShoulder: 'spine', RightArm: 'shR', RightForeArm: 'elR', RightHand: 'handR',
  LeftUpLeg: 'hipL', LeftLeg: 'knL', LeftFoot: 'anL', RightUpLeg: 'hipR', RightLeg: 'knR', RightFoot: 'anR',
};
const HUMAN_ORDER = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot'];
// 정렬용 '차렷 자세' 방향 (우리 뼈대가 회전 0일 때): 팔·다리는 아래, 몸통·목·머리는 위
const HUMAN_AIM = { Spine: [0, 1, 0, 'Spine1'], Spine1: [0, 1, 0, 'Spine2'], Spine2: [0, 1, 0, 'Neck'], Neck: [0, 1, 0, 'Head'], Head: [0, 1, 0, 'HeadTop_End'],
  LeftArm: [0, -1, 0, 'LeftForeArm'], LeftForeArm: [0, -1, 0, 'LeftHand'], LeftHand: [0, -1, 0, 'LeftHandMiddle1'], RightArm: [0, -1, 0, 'RightForeArm'], RightForeArm: [0, -1, 0, 'RightHand'], RightHand: [0, -1, 0, 'RightHandMiddle1'],
  LeftUpLeg: [0, -1, 0, 'LeftLeg'], LeftLeg: [0, -1, 0, 'LeftFoot'], RightUpLeg: [0, -1, 0, 'RightLeg'], RightLeg: [0, -1, 0, 'RightFoot'] };
// 부위: 0 피부 · 1 몸통 · 2 골반 · 3 아래팔 · 4 정강이 · 5 머리(기존 얼굴로 대체 → 그리지 않음) · 6 발 · 7 위팔 · 8 허벅지
function humanRegion(bn) {
  if (/^(Head|HeadTop_End|LeftEye|RightEye)$/.test(bn)) return 5; if (bn === 'Neck' || /Hand/.test(bn)) return 0;
  if (bn === 'Hips') return 2; if (/^Spine|Shoulder$/.test(bn)) return 1; if (/ForeArm$/.test(bn)) return 3; if (/Arm$/.test(bn)) return 7;
  if (/UpLeg$/.test(bn)) return 8; if (/Leg$/.test(bn)) return 4; if (/Foot|Toe/.test(bn)) return 6; return 1;
}
const _hq = new THREE.Quaternion(), _hq2 = new THREE.Quaternion(), _hv = new THREE.Vector3(), _hv2 = new THREE.Vector3();
const HUMAN = {
  base: {}, ready: false, loading: false, MAXN: [2, 5, 10, 16], RANGE: 34, _t: 0,
  short: n => n.replace(/^mixamorig:?/, ''),
  load() {
    if (this.loading || typeof GLTFLoader === 'undefined') return; this.loading = true; const L = new GLTFLoader();
    const one = (k, url) => L.loadAsync(url).then(g => { this.base[k] = this.prep(g); }).catch(e => console.warn('사람 모델을 못 불러왔다', url, e));
    Promise.all([one('m', 'models/xbot.glb'), one('f', 'models/michelle.glb')]).then(() => { this.ready = !!(this.base.m || this.base.f); });
  },
  prep(g) {
    const root = g.scene; const skinned = []; const drop = [];
    root.traverse(o => { if (o.isSkinnedMesh) { if (/Joints/i.test(o.name)) drop.push(o); else skinned.push(o); } });
    for (const o of drop) o.parent.remove(o); // Xbot 관절 링은 뺀다
    root.updateMatrixWorld(true);
    const bones = {}; root.traverse(o => { if (o.isBone) bones[this.short(o.name)] = o; });
    let map = null;
    for (const m of skinned) { // 꼭짓점마다 가장 많이 따라가는 뼈 → 부위 번호
      const geo = m.geometry, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, n = si.count, reg = new Float32Array(n), names = m.skeleton.bones.map(b => this.short(b.name));
      for (let i = 0; i < n; i++) { let best = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; best = si.getComponent(i, k); } } reg[i] = humanRegion(names[best] || ''); }
      geo.setAttribute('region', new THREE.BufferAttribute(reg, 1));
      if (m.material && m.material.map) map = m.material.map;
      geo.computeBoundingBox();
    }
    // 크기: 모델 원래 비율 그대로 키 1.8m(남) / 1.68m(여) · 우리 뼈대 골반 높이·몸통 길이를 모델에 맞춘다
    const box = new THREE.Box3().setFromObject(root, true); const hipY = bones.Hips.getWorldPosition(_hv).y; const neckY = bones.Neck.getWorldPosition(_hv).y;
    const female = skinned.some(m => m.material && m.material.map); const scale = (female ? 1.68 : 1.8) / Math.max(0.5, box.max.y - box.min.y);
    const dy = (hipY - box.min.y) * scale - 0.95, spineK = (neckY - hipY) * scale / 0.61;
    // 줄무늬용: 모델 안쪽 좌표의 '위' 축과 간격
    const gb = skinned[0].geometry.boundingBox, ext = [gb.max.x - gb.min.x, gb.max.y - gb.min.y, gb.max.z - gb.min.z]; const ax = ext.indexOf(Math.max(...ext));
    // 차렷 자세로 맞춘 뒤 뼈마다 기준 회전(오프셋)을 적어 둔다
    for (const bn of HUMAN_ORDER) {
      const B = bones[bn], A = HUMAN_AIM[bn]; if (!B || !A || !bones[A[3]]) continue;
      root.updateMatrixWorld(true); const cur = bones[A[3]].getWorldPosition(_hv).sub(B.getWorldPosition(_hv2)).normalize();
      _hq.setFromUnitVectors(cur, _hv2.set(A[0], A[1], A[2])); const wq = B.getWorldQuaternion(new THREE.Quaternion()).premultiply(_hq);
      const pq = B.parent.getWorldQuaternion(new THREE.Quaternion()); B.quaternion.copy(pq.invert().multiply(wq));
    }
    root.updateMatrixWorld(true); const off = {}; for (const bn of HUMAN_ORDER) if (bones[bn]) off[bn] = bones[bn].getWorldQuaternion(new THREE.Quaternion());
    return { root, off, scale, dy, spineK, map, axis: [ax === 0 ? 1 : 0, ax === 1 ? 1 : 0, ax === 2 ? 1 : 0], stripeK: 21 / Math.max(1e-6, ext[ax]) };
  },
  material(B, U) {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0, map: B.map || null });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float region; flat varying float vRegion; varying float vStripeY; uniform vec3 stripeAxis;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRegion = region; vStripeY = dot(position, stripeAxis);');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 regCol[9]; uniform float stripeOn; uniform vec3 stripeCol; uniform float stripeK; flat varying float vRegion; varying float vStripeY;')
        .replace('#include <map_fragment>', `int ri = int(vRegion + 0.5); if (ri == 5) discard;
          vec3 rc = regCol[ri]; if (ri == 1 && stripeOn > 0.5 && fract(vStripeY * stripeK) < 0.5) rc = stripeCol;
          #ifdef USE_MAP
            vec4 tx = texture2D(map, vMapUv); float lum = dot(tx.rgb, vec3(0.299, 0.587, 0.114)); diffuseColor.rgb = rc * clamp(0.62 + lum * 0.85, 0.55, 1.3);
          #else
            diffuseColor.rgb = rc;
          #endif`);
    };
    m.customProgramCacheKey = () => 'human' + (B.map ? 1 : 0);
    return m;
  },
  make(c) {
    const key = c.outfit.body === 'f' && this.base.f ? 'f' : this.base.m ? 'm' : 'f'; const B = this.base[key]; if (!B) return null;
    const root = SkeletonUtils.clone(B.root); root.scale.multiplyScalar(B.scale);
    const U = { regCol: { value: Array.from({ length: 9 }, () => new THREE.Color()) }, stripeOn: { value: 0 }, stripeCol: { value: new THREE.Color() }, stripeK: { value: B.stripeK }, stripeAxis: { value: new THREE.Vector3(...B.axis) } };
    const mat = this.material(B, U); const bones = {};
    root.traverse(o => { if (o.isSkinnedMesh) { o.material = mat; o.frustumCulled = false; o.castShadow = c.shadow !== false; o.receiveShadow = true; } if (o.isBone) bones[this.short(o.name)] = o; });
    return { key, B, root, bones, U, mat };
  },
  // 옷 색 (부위별)
  colors(c) {
    const H = c.hm; if (!H) return; const o = c.outfit, f = o.body === 'f', R = H.U.regCol.value;
    const longSleeve = ['long', 'hoodie', 'jacket', 'suit', 'police', 'doctor', 'shirt', 'sweater', 'coat'].includes(o.top), noSleeve = o.top === 'tank' || o.top === 'vest';
    const dress = o.top === 'dress' && f, skirt = dress || o.bottom === 'skirt' || o.bottom === 'longskirt', shorts = o.bottom === 'shorts';
    const skin = o.skin, top = o.top === 'doctor' ? '#ffffff' : o.topColor, bot = dress ? o.topColor : o.bottomColor;
    const set = (i, col) => R[i].set(col);
    set(0, skin); set(1, top); set(2, bot); set(3, longSleeve ? top : skin); set(4, skirt || shorts ? skin : bot); set(6, o.shoes || '#222'); set(7, noSleeve ? skin : top); set(8, skirt ? skin : bot); set(5, skin);
    H.U.stripeOn.value = o.top === 'stripe' ? 1 : 0; H.U.stripeCol.value.set(o.stripeColor || '#f2f2f2');
  },
  // 우리 뼈대 자세 → 모델 뼈
  retarget(c) {
    const H = c.hm, P = c.P; if (!H) return; const bones = H.bones, off = H.B.off;
    c.root.updateMatrixWorld(true);
    const hipsB = bones.Hips; if (!hipsB) return;
    const wq = {}; hipsB.parent.updateWorldMatrix(true, false); const rootQ = hipsB.parent.getWorldQuaternion(new THREE.Quaternion());
    for (const bn of HUMAN_ORDER) {
      const B = bones[bn], G = P[HUMAN_MAP[bn]]; if (!B || !G || !off[bn]) continue;
      const target = G.getWorldQuaternion(_hq).multiply(off[bn]); const pq = wq[this.short(B.parent.name)] || rootQ;
      B.quaternion.copy(_hq2.copy(pq).invert().multiply(target)); wq[bn] = target.clone();
      if (bn === 'Hips') { P.hips.getWorldPosition(_hv); B.parent.worldToLocal(_hv); B.position.copy(_hv); } // 골반 위치 = 우리 뼈대 골반 (높이는 모델에 맞춰 올려 둠)
    }
    H.root.updateMatrixWorld(true);
    // 얼굴·손을 모델 머리·손 위치에 맞춘다 (모자·총도 같이 따라간다)
    if (bones.Head) { bones.Head.getWorldPosition(_hv); _hv.y -= 0.02; P.neck.worldToLocal(_hv); P.head.position.copy(_hv); }
    for (const s of ['L', 'R']) { const hb = bones[(s === 'L' ? 'Left' : 'Right') + 'Hand']; if (hb) { hb.getWorldPosition(_hv); P['el' + s].worldToLocal(_hv); P['hand' + s].position.copy(_hv); } }
  },
  // 가까운 몇 명만 3D 모델로 (0.25초마다)
  tick(dt) {
    if (!G.started) return; if (!this.loading) this.load(); if (!this.ready || (this._t -= dt) > 0) return; this._t = 0.25;
    const cam = camera.position, L = [];
    for (const c of Character.all) { let o = c.root, vis = true; while (o.parent) { if (!o.visible) { vis = false; break; } o = o.parent; } if (o !== scene || !vis) { if (c.hiOn) c.setHi(false); continue; } c.root.getWorldPosition(_hv); L.push([c === (typeof ME !== 'undefined' && ME.char) ? -1 : _hv.distanceTo(cam), c]); }
    // 모든 사람을 3D 모델로 (먼 사람은 자세 계산을 3프레임에 한 번만 → 가볍게)
    for (const [d, c] of L) { c._far = d > 45; if (!c.hiOn) c.setHi(true); }
  },
};
