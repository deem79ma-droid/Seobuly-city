import glob, os, hashlib
root = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(root, 'src')
js = '\n'.join(open(f, encoding='utf-8').read() for f in sorted(glob.glob(src + '/[0-9]*.js')))

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
out_dir = os.environ.get('OUT_DIR', root)
os.makedirs(out_dir, exist_ok=True)
open(os.path.join(out_dir, 'game.mjs'), 'w', encoding='utf-8').write(js)
tpl = open(os.path.join(src, 'template.html'), encoding='utf-8').read()
out = tpl.replace('/*__JS__*/', js)
open(os.path.join(out_dir, 'index.html'), 'w', encoding='utf-8').write(out)
# ---- 검색엔진/공유용 정적 파일 (og.png, robots.txt, sitemap.xml) → 배포 폴더로 복사 ----
import shutil
for f in ('og.png', 'robots.txt', 'sitemap.xml'):
    s_, d_ = os.path.join(root, f), os.path.join(out_dir, f)
    if os.path.exists(s_) and os.path.abspath(s_) != os.path.abspath(d_): shutil.copyfile(s_, d_)
print(len(out) // 1024, 'KB', len(js.splitlines()), 'lines', '| admin:', 'ON' if pub else 'OFF')
