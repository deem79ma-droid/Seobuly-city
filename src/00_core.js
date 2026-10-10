import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ================= CORE =================
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const TAU = Math.PI * 2;
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const dampAng = (a, b, k, dt) => a + angDiff(a, b) * (1 - Math.exp(-k * dt));
const dist2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };
const fmtMoney = n => '₩' + Math.floor(n).toLocaleString('ko-KR');
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let wrng = mulberry32(20261009); // deterministic world RNG (same world for all clients)
const wr = (a = 0, b = 1) => a + (b - a) * wrng();
const wri = (a, b) => Math.floor(wr(a, b + 1));
const wpick = arr => arr[Math.floor(wrng() * arr.length)];
const rnd = (a = 0, b = 1) => a + (b - a) * Math.random();
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function shuffleW(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(wrng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function hash2(x, y) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v) * 2 - 1;
}
function fbm(x, y, o = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f + i * 17.3, y * f - i * 9.1); f *= 2.03; a *= 0.5; } return s; }
function distSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az; const l2 = dx * dx + dz * dz;
  let t = l2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0; t = clamp(t, 0, 1);
  const x = ax + dx * t, z = az + dz * t; return Math.hypot(px - x, pz - z);
}
const IS_TOUCH = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
const URLP = new URLSearchParams(location.search);

// ================= GLOBAL GAME STATE =================
const G = {
  started: false, isHost: true, online: false, myId: 'me', name: '플레이어', room: '',
  time: 9.5, day: 1, weather: 'clear', weatherT: 360, rainAmt: 0,
  quality: 3, t: 0, dt: 0, paused: false,
  players: new Map(), // remote players id -> RemotePlayer
};
let scene, camera, renderer, composer, bloomPass, clock;
const QUALITY = [
  { pr: 0.75, shadow: 0, bloom: false, grass: 0, trees: 0.45, view: 900, npcView: 90, lamps: 0, aa: false },
  { pr: 1.0, shadow: 1024, bloom: false, grass: 7000, trees: 0.7, view: 1300, npcView: 120, lamps: 4, aa: true },
  { pr: 1.5, shadow: 2048, bloom: true, grass: 16000, trees: 1, view: 1800, npcView: 150, lamps: 6, aa: true },
  { pr: 2.0, shadow: 4096, bloom: true, grass: 30000, trees: 1, view: 2400, npcView: 180, lamps: 8, aa: true },
];
const Q = () => QUALITY[G.quality];

// ================= AUDIO (synth) =================
const AU = {
  ctx: null, master: null, noise: null, listener: { x: 0, z: 0, yaw: 0 },
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.7; this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2; const b = this.ctx.createBuffer(1, len, this.ctx.sampleRate); const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; this.noise = b;
    } catch (e) { this.ctx = null; }
  },
  spatial(x, z, range) {
    if (x === undefined) return { v: 1, p: 0 };
    const dx = x - this.listener.x, dz = z - this.listener.z; const d = Math.hypot(dx, dz);
    const v = Math.pow(clamp(1 - d / range, 0, 1), 1.6);
    const ang = Math.atan2(dx, dz) - this.listener.yaw;
    return { v, p: clamp(-Math.sin(ang) * 0.8, -1, 1) };
  },
  out(pan) { const c = this.ctx; const p = c.createStereoPanner ? c.createStereoPanner() : c.createGain(); if (p.pan) p.pan.value = pan; p.connect(this.master); return p; },
  noiseHit(t0, dur, f, q, vol, pan, type = 'lowpass') {
    const c = this.ctx; const s = c.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = 1;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    s.connect(fl); fl.connect(g); g.connect(this.out(pan)); s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
  },
  tone(t0, dur, f, f2, vol, pan, type = 'sine') {
    const c = this.ctx; const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    o.connect(g); g.connect(this.out(pan)); o.start(t0); o.stop(t0 + dur + 0.05);
  },
};
function sfx(type, x, z, vol = 1) {
  const c = AU.ctx; if (!c) return; const t = c.currentTime;
  const ranges = { pistol: 220, smg: 220, shotgun: 260, rifle: 320, sniper: 400, explode: 600, punch: 30, punchH: 36, whoosh: 18, hit: 40, axe: 40, chop: 60, coin: 1, ui: 1, horn: 120, step: 12, splash: 40, bark: 60, moo: 80, roar: 140, tree: 90, build: 70, siren: 200, cash: 1, levelup: 1, error: 1, door: 20, neigh: 80 };
  const s = AU.spatial(x, z, ranges[type] || 80); const v = s.v * vol; if (v < 0.01) return; const p = s.p;
  switch (type) {
    case 'pistol': AU.noiseHit(t, 0.18, 2600, 0.7, 0.9 * v, p); AU.tone(t, 0.12, 160, 50, 0.6 * v, p); break;
    case 'smg': AU.noiseHit(t, 0.1, 3200, 0.7, 0.7 * v, p); AU.tone(t, 0.08, 180, 70, 0.4 * v, p); break;
    case 'shotgun': AU.noiseHit(t, 0.4, 1500, 0.5, 1.2 * v, p); AU.tone(t, 0.25, 110, 35, 0.9 * v, p); break;
    case 'rifle': AU.noiseHit(t, 0.3, 2200, 0.6, 1.1 * v, p); AU.tone(t, 0.2, 140, 40, 0.8 * v, p); AU.noiseHit(t + 0.05, 0.6, 600, 0.3, 0.25 * v, p); break;
    case 'sniper': AU.noiseHit(t, 0.5, 1800, 0.6, 1.3 * v, p); AU.tone(t, 0.3, 120, 30, 1 * v, p); AU.noiseHit(t + 0.08, 1.2, 400, 0.3, 0.35 * v, p); break;
    case 'explode': AU.noiseHit(t, 1.6, 500, 0.4, 1.6 * v, p); AU.tone(t, 0.9, 70, 25, 1.4 * v, p); break;
    case 'punch': AU.tone(t, 0.09, 120, 50, 0.9 * v, p); AU.noiseHit(t, 0.06, 900, 1, 0.5 * v, p); break;
    case 'punchH': AU.tone(t, 0.16, 95, 38, 1.2 * v, p); AU.noiseHit(t, 0.1, 700, 1, 0.8 * v, p); AU.noiseHit(t + 0.01, 0.05, 2400, 1, 0.35 * v, p); break; // 묵직한 타격음
    case 'whoosh': AU.noiseHit(t, 0.13, 1500, 1.4, 0.32 * v, p, 'bandpass'); break; // 주먹 휘두르는 바람 소리
    case 'hit': AU.noiseHit(t, 0.08, 1400, 1, 0.5 * v, p); break;
    case 'axe': AU.noiseHit(t, 0.12, 900, 2, 0.6 * v, p, 'bandpass'); break;
    case 'chop': AU.noiseHit(t, 0.15, 700, 3, 1.0 * v, p, 'bandpass'); AU.tone(t, 0.07, 300, 150, 0.4 * v, p, 'triangle'); break;
    case 'tree': AU.noiseHit(t, 1.2, 300, 0.5, 1.0 * v, p); AU.tone(t + 0.6, 0.5, 60, 30, 0.9 * v, p); break;
    case 'coin': AU.tone(t, 0.08, 988, 0, 0.25, 0, 'square'); AU.tone(t + 0.08, 0.25, 1319, 0, 0.25, 0, 'square'); break;
    case 'cash': AU.tone(t, 0.07, 1200, 0, 0.2, 0, 'triangle'); AU.tone(t + 0.07, 0.07, 1500, 0, 0.2, 0, 'triangle'); AU.tone(t + 0.14, 0.2, 1800, 0, 0.2, 0, 'triangle'); break;
    case 'levelup': [523, 659, 784, 1046].forEach((f, i) => AU.tone(t + i * 0.09, 0.25, f, 0, 0.18, 0, 'triangle')); break;
    case 'ui': AU.tone(t, 0.05, 700, 900, 0.12, 0, 'sine'); break;
    case 'error': AU.tone(t, 0.18, 200, 120, 0.25, 0, 'square'); break;
    case 'horn': AU.tone(t, 0.45, 400, 0, 0.35 * v, p, 'sawtooth'); AU.tone(t, 0.45, 500, 0, 0.3 * v, p, 'sawtooth'); break;
    case 'step': AU.noiseHit(t, 0.05, 500, 1, 0.08 * v, p); break;
    case 'splash': AU.noiseHit(t, 0.5, 1200, 0.5, 0.5 * v, p, 'highpass'); break;
    case 'bark': AU.tone(t, 0.12, 500, 300, 0.5 * v, p, 'sawtooth'); AU.tone(t + 0.18, 0.12, 520, 300, 0.5 * v, p, 'sawtooth'); break;
    case 'moo': AU.tone(t, 0.9, 140, 110, 0.5 * v, p, 'sawtooth'); break;
    case 'roar': AU.tone(t, 1.0, 120, 60, 0.8 * v, p, 'sawtooth'); AU.noiseHit(t, 1, 400, 0.6, 0.5 * v, p); break;
    case 'neigh': AU.tone(t, 0.6, 700, 400, 0.4 * v, p, 'sawtooth'); break;
    case 'build': AU.tone(t, 0.06, 900, 600, 0.3 * v, p, 'square'); AU.noiseHit(t, 0.05, 2000, 2, 0.3 * v, p); break;
    case 'door': AU.tone(t, 0.12, 300, 200, 0.2, 0, 'triangle'); break;
  }
}
// engine loop for local vehicle
const ENG = {
  o1: null, o2: null, g: null, f: null,
  start() { const c = AU.ctx; if (!c || this.o1) return; this.o1 = c.createOscillator(); this.o2 = c.createOscillator(); this.o1.type = 'sawtooth'; this.o2.type = 'square'; this.f = c.createBiquadFilter(); this.f.type = 'lowpass'; this.f.frequency.value = 600; this.g = c.createGain(); this.g.gain.value = 0; this.o1.connect(this.f); this.o2.connect(this.f); this.f.connect(this.g); this.g.connect(AU.master); this.o1.start(); this.o2.start(); },
  set(on, rpm, kind) {
    if (!AU.ctx) return; if (!this.o1) this.start(); const t = AU.ctx.currentTime;
    const base = kind === 'bike' ? 70 : kind === 'horse' ? 0 : 45;
    this.g.gain.setTargetAtTime(on && base ? 0.09 + rpm * 0.05 : 0, t, 0.1);
    this.o1.frequency.setTargetAtTime(base + rpm * (kind === 'bike' ? 160 : 110), t, 0.05);
    this.o2.frequency.setTargetAtTime((base + rpm * (kind === 'bike' ? 160 : 110)) * 0.5, t, 0.05);
    this.f.frequency.setTargetAtTime(400 + rpm * 1400, t, 0.1);
  }
};
// club music
const MUSIC = {
  next: 0, step: 0, vol: 0, gain: null, bpm: 124,
  tick() {
    const c = AU.ctx; if (!c) return;
    if (!this.gain) { this.gain = c.createGain(); this.gain.gain.value = 0; this.gain.connect(AU.master); }
    this.gain.gain.setTargetAtTime(this.vol * 0.55, c.currentTime, 0.3);
    if (this.vol < 0.01) { this.next = c.currentTime; return; }
    const sp = 60 / this.bpm / 4;
    while (this.next < c.currentTime + 0.15) {
      const t = Math.max(this.next, c.currentTime); const s = this.step % 16; const bar = Math.floor(this.step / 16) % 4;
      const out = this.gain;
      const play = (f, f2, dur, vol, type, nz) => {
        if (nz) { const src = c.createBufferSource(); src.buffer = AU.noise; const fl = c.createBiquadFilter(); fl.type = 'highpass'; fl.frequency.value = nz; const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); src.connect(fl); fl.connect(g); g.connect(out); src.start(t, Math.random()); src.stop(t + dur); return; }
        const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur); const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02);
      };
      if (s % 4 === 0) play(150, 45, 0.25, 1, 'sine');
      if (s % 4 === 2) play(0, 0, 0.05, 0.25, '', 7000);
      if (s === 4 || s === 12) play(0, 0, 0.18, 0.35, '', 1800);
      const roots = [55, 55, 49, 65.4][bar];
      if (s % 2 === 1 || s === 0) play(roots * (s % 8 === 7 ? 2 : 1), 0, 0.14, 0.32, 'sawtooth');
      if (s === 0 || s === 6 || s === 10) { [1, 1.26, 1.5].forEach(m => play(roots * 4 * m, 0, 0.22, 0.06, 'square')); }
      this.next += sp; this.step++;
    }
  }
};
