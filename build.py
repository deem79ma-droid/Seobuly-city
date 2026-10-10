import glob, os, hashlib
root = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(root, 'src')
js = '\n'.join(open(f, encoding='utf-8').read() for f in sorted(glob.glob(src + '/[0-9]*.js')))
# 관리자 비밀번호는 코드/저장소에 넣지 않는다. ADMIN_PW(평문) 또는 ADMIN_HASH(sha256 hex)를 환경변수/시크릿으로만 전달.
h = os.environ.get('ADMIN_HASH', '').strip().lower()
pw = os.environ.get('ADMIN_PW', '')
if not h and pw:
    h = hashlib.sha256(('sbc3d-admin:' + pw).encode()).hexdigest()
if h and len(h) != 64:
    raise SystemExit('ADMIN_HASH must be 64 hex chars')
js = js.replace("'__ADMIN_HASH__'", "'" + h + "'")
out_dir = os.environ.get('OUT_DIR', root)
os.makedirs(out_dir, exist_ok=True)
open(os.path.join(out_dir, 'game.mjs'), 'w', encoding='utf-8').write(js)
tpl = open(os.path.join(src, 'template.html'), encoding='utf-8').read()
out = tpl.replace('/*__JS__*/', js)
open(os.path.join(out_dir, 'index.html'), 'w', encoding='utf-8').write(out)
print(len(out) // 1024, 'KB', len(js.splitlines()), 'lines', '| admin:', 'ON' if h else 'OFF')
