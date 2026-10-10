# 서벌리 시티 3D

브라우저 오픈월드 멀티플레이 게임 (Three.js + PeerJS, 2인 P2P).

## 배포 (GitHub Pages)
1. 저장소 Settings → Pages → Source: **GitHub Actions**
2. (선택) Settings → Secrets and variables → Actions → `ADMIN_PW` 시크릿 추가 → 관리자 모드 활성화 (없으면 관리자 모드 비활성)
3. `main`에 push 하면 자동 빌드·배포. 주소: `https://<계정>.github.io/<저장소>/`
4. 호스트가 [방 만들기] → 방 코드를 친구에게 공유 → 친구가 [참가]

## 로컬 빌드
`ADMIN_PW=비번 python3 build.py` → `index.html` (비번은 SHA-256 해시로만 들어감)

## 관리자 모드
- 로비의 [관리자] 칸에 비밀번호를 넣고 입장하거나, 게임 중 `F2`(또는 채팅 `/admin`)로 로그인
- 무한 돈·탄약, 전 무기, 정장+선글라스, 체포 면제, 경찰/의사 즉시 응대, 방장 권한 이전, 추방/밴 면역
- 비밀번호는 GitHub Secret `ADMIN_PW` 로만 주입 (코드엔 해시만 들어감). 모르는 사람 방에는 관리자로 들어가지 마세요(비번이 방장 브라우저로 전달됨).
