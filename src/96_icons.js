// @v 2026101219
// ================= 지도 아이콘: 이모티콘 대신 직접 그린 배지 =================
// 이모티콘은 빌드할 때 전부 지운다(build.py). 지도·미니맵 표시는 색 배지 + 한 글자로 그린다.
const BADGE = {
  police: ['경', '#2f5fd0'], hospital: ['병', '#d84848'], dealer: ['차', '#4f6274'], factory: ['공', '#7a6a50'], school: ['학', '#b8823a'],
  academy: ['원', '#9a7448'], food: ['식', '#e0702a'], pcbang: ['PC', '#5a3ab0'], gym: ['헬', '#3a3f4a'], pool: ['수', '#2a98c8'],
  zoo: ['동', '#4a8a3a'], gun: ['총', '#7a3a2a'], clothes: ['옷', '#b8488f'], club: ['클', '#8a3ad0'], casino: ['카', '#b8902a'],
  hotel: ['호', '#2a9a98'], parking: ['P', '#2a6ad0'], court: ['법', '#86763a'],
  plotEmpty: ['매', '#2a8a4a'], plotBuild: ['공', '#c8902a'], plotMine: ['내', '#ff6a3a'], plotOther: ['건', '#6f7686'],
  car: ['차', '#3a7ad0'], taxi: ['T', '#d8a818'], raid: ['!', '#e03030'], army: ['군', '#4a5a32'], job: ['일', '#e8a018'], patient: ['+', '#d84848'],
};
function mapBadge(x, k, px, py, size = 16, label) {
  const b = BADGE[k] || ['·', '#666']; const t = label || b[0]; const s = Math.max(10, size);
  x.save(); x.font = `900 ${Math.round(s * 0.62)}px "Noto Sans KR",sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  const w = Math.max(s, x.measureText(t).width + s * 0.45), h = s, r = s * 0.28, X = px - w / 2, Y = py - h / 2;
  x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath();
  x.fillStyle = b[1]; x.fill(); x.lineWidth = Math.max(1.5, s * 0.1); x.strokeStyle = 'rgba(255,255,255,.92)'; x.stroke();
  x.fillStyle = '#fff'; x.fillText(t, px, py + s * 0.04); x.restore();
}
// 목적지 핀 (빨간 물방울 모양)
function mapPin(x, px, py, s = 18, col = '#ff3b4a') {
  x.save(); x.beginPath(); x.arc(px, py - s * 0.62, s * 0.38, Math.PI * 0.85, Math.PI * 2.15); x.lineTo(px, py); x.closePath();
  x.fillStyle = col; x.fill(); x.lineWidth = Math.max(1.5, s * 0.09); x.strokeStyle = '#fff'; x.stroke();
  x.beginPath(); x.arc(px, py - s * 0.62, s * 0.14, 0, Math.PI * 2); x.fillStyle = '#fff'; x.fill(); x.restore();
}
// 메뉴 왼쪽 아이콘 칸이 비면 숨긴다 · 나침반 목적지 표시
(() => { const st = document.createElement('style'); st.textContent = `.item .ic:empty{display:none}#navCmp .wp{width:9px;height:9px;margin-top:6px;background:#ff3b4a;border:2px solid #fff;transform:translateX(-50%) rotate(45deg)!important;border-radius:2px}`; document.head.appendChild(st); })();
