import glob, os, hashlib, json
root = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(root, 'src')
import re
# 폰에서 받으면 이름이 "70_net-6.js", "70_net (1).js" 처럼 바뀔 때가 있다 → 같은 파일이 두 벌이면 게임이 멈춘다.
# 그래서 이름 뒤 숫자를 떼고 같은 파일끼리 묶은 뒤, 첫 줄 "// @v 숫자"가 가장 큰 것(같으면 나중 이름) 하나만 쓴다.
def _base(path): return re.sub(r'(\s*\(\d+\)|-\d+)+\.js$', '.js', os.path.basename(path))
def _ver(path):
    with open(path, encoding='utf-8') as fh: m = re.match(r'//\s*@v\s*(\d+)', fh.readline())
    return int(m.group(1)) if m else 0
_pick = {}
for f in sorted(glob.glob(src + '/[0-9]*.js')):
    b = _base(f); cur = _pick.get(b)
    if cur is None or (_ver(f), f) >= (_ver(cur), cur): _pick[b] = f
_dups = [f for f in glob.glob(src + '/[0-9]*.js') if f not in _pick.values()]
if _dups: print('중복 파일 무시:', ', '.join(os.path.basename(f) for f in sorted(_dups)))
js = '\n'.join(open(_pick[b], encoding='utf-8').read() for b in sorted(_pick))

# ---- 관리자 공개키 ----
# 관리자 비밀번호는 코드/저장소에 넣지 않는다. ADMIN_PW(평문)는 환경변수/GitHub 시크릿으로만 전달되고,
# 빌드 결과물에는 Ed25519 "공개키"만 들어간다 (서명 검증용, 공개돼도 안전).
#   seed = PBKDF2-HMAC-SHA256(pw, 'sbc3d-admin-ed25519-v2', 150000, 32)  → 개인키 (관리자 브라우저에서만 계산)
#   pub  = Ed25519 공개키(seed)
# ADMIN_PUB(64 hex)를 직접 넘겨도 된다.
P = 2 ** 255 - 19
D = -121665 * pow(121666, P - 2, P) % P
def _inv(x): return pow(x, P - 2, P)
def _add(a, b):
    A = (a[1] - a[0]) * (b[1] - b[0]) % P; B = (a[1] + a[0]) * (b[1] + b[0]) % P
    C = 2 * a[3] * b[3] * D % P; Dd = 2 * a[2] * b[2] % P
    E, F, G, H = B - A, Dd - C, Dd + C, B + A
    return (E * F % P, G * H % P, F * G % P, E * H % P)
def _mul(s, pt):
    q = (0, 1, 1, 0)
    while s > 0:
        if s & 1: q = _add(q, pt)
        pt = _add(pt, pt); s >>= 1
    return q
def _recover_x(y, sign):
    x2 = (y * y - 1) * _inv(D * y * y + 1) % P
    x = pow(x2, (P + 3) // 8, P)
    if (x * x - x2) % P: x = x * pow(2, (P - 1) // 4, P) % P
    if (x & 1) != sign: x = P - x
    return x
_GY = 4 * _inv(5) % P; _GX = _recover_x(_GY, 0); _G = (_GX, _GY, 1, _GX * _GY % P)
def ed25519_pub(seed):
    h = hashlib.sha512(seed).digest(); a = int.from_bytes(h[:32], 'little')
    a &= (1 << 254) - 8; a |= (1 << 254)
    pt = _mul(a, _G); zi = _inv(pt[2]); x = pt[0] * zi % P; y = pt[1] * zi % P
    return (y | ((x & 1) << 255)).to_bytes(32, 'little')
def admin_seed(pw):
    return hashlib.pbkdf2_hmac('sha256', pw.encode('utf-8'), b'sbc3d-admin-ed25519-v2', 150000, 32)

pub = os.environ.get('ADMIN_PUB', '').strip().lower()
pw = os.environ.get('ADMIN_PW', '')
if not pub and pw:
    pub = ed25519_pub(admin_seed(pw)).hex()
if pub and (len(pub) != 64 or any(c not in '0123456789abcdef' for c in pub)):
    raise SystemExit('ADMIN_PUB must be 64 hex chars')
js = js.replace("'__ADMIN_PUB__'", "'" + pub + "'")
# ---- 게임 서버 주소 (GitHub Actions가 Cloudflare에 서버를 배포한 뒤 넣어준다. 없으면 P2P) ----
srv = os.environ.get('SERVER_URL', '').strip().rstrip('/')
if srv and not srv.startswith('http'): srv = 'https://' + srv
js = js.replace("'__SERVER_URL__'", "'" + srv.replace("'", '') + "'") if srv else js
out_dir = os.environ.get('OUT_DIR', root)
os.makedirs(out_dir, exist_ok=True)
open(os.path.join(out_dir, 'game.mjs'), 'w', encoding='utf-8').write(js)
tpl = open(os.path.join(src, 'template.html'), encoding='utf-8').read()
# ---- 이모티콘 전부 지우기 (저퀄리티 느낌 → 글씨·직접 그린 아이콘으로) ----
# ★☆ 같은 기호는 남긴다 (수배 별 등). 이모티콘 뒤에 붙은 공백 하나도 같이 지운다.
_KEEP = set('★☆✓✔✕✖✦▲▼◀▶●○◆◇■□')
_EMO = re.compile('[\U0001F000-\U0001FAFF\u2600-\u27BF\u2300-\u23FF\u2B00-\u2BFF\u21A9\u21AA\u2139\u203C\u2049\u3297\u3299]')
def _strip(t):
    out = []; i = 0; n = len(t)
    while i < n:
        ch = t[i]
        if _EMO.match(ch) and ch not in _KEEP:
            i += 1
            while i < n and t[i] in '\uFE0F\u200D\u20E3' or (i < n and t[i - 1] == '\u200D' and _EMO.match(t[i])): i += 1
            if i < n and t[i] == ' ': i += 1
            continue
        if ch in '\uFE0F\u20E3': i += 1; continue
        out.append(ch); i += 1
    return ''.join(out)
if os.environ.get('KEEP_EMOJI') != '1':
    js = _strip(js); tpl = _strip(tpl)
    open(os.path.join(out_dir, 'game.mjs'), 'w', encoding='utf-8').write(js)
out = tpl.replace('/*__JS__*/', js)
# ================= 보안: CDN 파일 무결성(SRI) + 콘텐츠 보안 정책(CSP) =================
# SRI: 빌드할 때 CDN 파일을 받아 지문(sha384)을 찍어 둔다 → CDN 파일이 바뀌거나 조작되면 브라우저가 실행을 거부한다.
#      (빌드하는 곳이 인터넷에 못 붙으면 SRI만 빼고 정상 빌드. SRI=0 으로 끌 수 있다)
# CSP: 이 페이지가 실행할 수 있는 스크립트(우리 코드 지문 + 허용한 CDN)와 접속할 수 있는 서버를 정해 둔다
#      → 채팅·이름 등에 악성 코드가 섞여 들어와도 실행되지 않는다 (XSS 차단)
import base64, urllib.request, urllib.parse
PEER = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js'
TROOT = 'https://cdn.jsdelivr.net/npm/three@0.160.0/'
def _sri(data): return 'sha384-' + base64.b64encode(hashlib.sha384(data).digest()).decode()
def _fetch(url):
    loc = os.environ.get('SRI_LOCAL_THREE')  # 테스트용: three 파일을 로컬 폴더에서 읽는다
    if loc and url.startswith(TROOT): return open(os.path.join(loc, url[len(TROOT):]), 'rb').read()
    if os.environ.get('SRI_LOCAL_PEER') and url == PEER: return open(os.environ['SRI_LOCAL_PEER'], 'rb').read()
    req = urllib.request.Request(url, headers={'User-Agent': 'seobuly-build', 'Accept-Encoding': 'identity'})
    with urllib.request.urlopen(req, timeout=25) as r:
        if r.status != 200: raise RuntimeError('HTTP %d' % r.status)
        return r.read()
sri = {}
if os.environ.get('SRI', '1') != '0':
    try:
        pj = _fetch(PEER)
        if b'Peer' not in pj or len(pj) < 20000: raise RuntimeError('peerjs 파일이 이상함')
        sri[PEER] = _sri(pj)
        todo = [TROOT + 'build/three.module.js'] + [TROOT + 'examples/jsm/' + m for m in re.findall(r"from 'three/addons/([^']+)'", js)]
        seen = set()
        while todo:
            u = todo.pop()
            if u in seen: continue
            seen.add(u); data = _fetch(u)
            if len(data) < 200: raise RuntimeError('파일이 너무 작음: ' + u)
            sri[u] = _sri(data)
            for rel in re.findall(r"""(?:from|import)\s*['"](\.{1,2}/[^'"]+)['"]""", data.decode('utf-8', 'replace')):
                todo.append(urllib.parse.urljoin(u, rel))
        print('SRI: CDN 파일', len(sri), '개 지문 등록')
    except Exception as e:
        print('SRI 생략 (CDN에 연결할 수 없음):', e); sri = {}
_pa = (' integrity="%s" crossorigin="anonymous"' % sri[PEER]) if PEER in sri else ''
out = out.replace(' __SRI_PEERJS__', _pa).replace('__SRI_PEERJS2__', _pa)
if sri:
    def _imap(mm):
        o = json.loads(mm.group(1)); o['integrity'] = {u: h for u, h in sri.items() if u.startswith(TROOT)}
        return '<script type="importmap">' + json.dumps(o, separators=(',', ':')) + '</script>'
    out = re.sub(r'<script type="importmap">(.*?)</script>', _imap, out, count=1, flags=re.S)
_inl = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', out, flags=re.S)
_hs = ' '.join("'sha256-%s'" % base64.b64encode(hashlib.sha256(x.encode('utf-8')).digest()).decode() for x in _inl)
_conn = ["'self'", 'https://0.peerjs.com', 'wss://0.peerjs.com', 'https://cdn.jsdelivr.net']
if srv:
    _h = urllib.parse.urlparse(srv).netloc
    if _h: _conn += ['https://' + _h, 'wss://' + _h]
CSP = '; '.join([
    "default-src 'self'",
    "script-src 'self' " + _hs + ' https://cdn.jsdelivr.net https://unpkg.com',
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    'connect-src ' + ' '.join(_conn),
    "media-src 'self' data: blob:",
    "worker-src 'self' blob:",
    "object-src 'none'", "base-uri 'none'", "form-action 'none'", "frame-src 'none'", "manifest-src 'self'",
    'upgrade-insecure-requests',
])
if os.environ.get('CSP') == '0': CSP = ''
out = out.replace('<meta http-equiv="Content-Security-Policy" content="__CSP__">\n', ('<meta http-equiv="Content-Security-Policy" content="%s">\n' % CSP) if CSP else '')
open(os.path.join(out_dir, 'index.html'), 'w', encoding='utf-8').write(out)
# ---- 검색엔진/공유용 정적 파일 (og.png, robots.txt, sitemap.xml) → 배포 폴더로 복사 ----
import shutil
for f in ('og.png', 'robots.txt', 'sitemap.xml'):
    s_, d_ = os.path.join(root, f), os.path.join(out_dir, f)
    if os.path.exists(s_) and os.path.abspath(s_) != os.path.abspath(d_): shutil.copyfile(s_, d_)
# ---- 사람 3D 모델 (models/*.glb) → 배포 폴더로 복사 ----
for _dn, _ext in (('models', '.glb'), ('music', '.mp3')):  # 3D 모델 · 배경음악 파일 복사
    _md = os.path.join(root, _dn)
    if os.path.isdir(_md) and os.path.abspath(_md) != os.path.abspath(os.path.join(out_dir, _dn)):
        os.makedirs(os.path.join(out_dir, _dn), exist_ok=True)
        for _r, _ds, _fs in os.walk(_md):  # 하위 폴더에 들어가 있어도 찾아서 music/ 바로 아래로 모은다
            for f in _fs:
                if f.endswith(_ext): shutil.copyfile(os.path.join(_r, f), os.path.join(out_dir, _dn, f))
print(len(out) // 1024, 'KB', len(js.splitlines()), 'lines', '| admin:', 'ON' if pub else 'OFF', '| server:', srv or 'P2P')
