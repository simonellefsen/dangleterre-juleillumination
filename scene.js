// Hotel d'Angleterre, Kongens Nytorv — the Christmas illumination as a small 3D stage.
// Everything is built procedurally; the photos in img/ were the reference.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Music } from './music.js';

const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 1200);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.7, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------- canvas textures
function canvasTex(w, h, draw, { repeat = false, srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
const paneDarkTex = canvasTex(64, 128, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2b3443'); gr.addColorStop(1, '#141a24');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = '#e9e6de'; g.fillRect(w / 2 - 2, 0, 4, h); g.fillRect(0, h * 0.3, w, 4); g.fillRect(0, 0, w, 3);
});
const paneLitTex = canvasTex(64, 128, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffe2a8'); gr.addColorStop(1, '#f2a54a');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(120,60,20,.35)'; g.fillRect(0, 0, w * 0.22, h); g.fillRect(w * 0.78, 0, w * 0.22, h); // curtains
  g.fillStyle = '#4a3320'; g.fillRect(w / 2 - 2, 0, 4, h); g.fillRect(0, h * 0.3, w, 4);
});
const shopTex = canvasTex(128, 128, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffd590'); gr.addColorStop(1, '#c9772c');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 9; i++) { // warm lamps inside the restaurant
    g.fillStyle = 'rgba(255,245,210,.9)'; g.beginPath(); g.arc(rand(10, w - 10), rand(20, h * 0.5), rand(2, 5), 0, 7); g.fill();
  }
  g.fillStyle = '#1c1611';
  for (const x of [0, w / 3, (2 * w) / 3, w - 4]) g.fillRect(x, 0, 4, h);
  g.fillRect(0, h * 0.22, w, 4); g.fillRect(0, 0, w, 4); g.fillRect(0, h - 10, w, 10);
});
const signTex = canvasTex(1024, 96, (g, w, h) => {
  g.fillStyle = '#d9d4c8'; g.fillRect(0, 0, w, h);
  g.font = '600 62px "Bodoni 72", Didot, "Times New Roman", serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#4a360c'; g.fillText('HOTEL  D\'ANGLETERRE', w / 2 + 2, h / 2 + 5);
  const gr = g.createLinearGradient(0, 20, 0, 80); gr.addColorStop(0, '#d9a62a'); gr.addColorStop(1, '#8f6510');
  g.fillStyle = gr; g.fillText('HOTEL  D\'ANGLETERRE', w / 2, h / 2 + 3);
});
const crestTex = canvasTex(256, 256, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#ece8df'; // stone cartouche
  g.beginPath(); g.moveTo(8, h); g.quadraticCurveTo(20, 150, 70, 120); g.quadraticCurveTo(128, 20, 186, 120);
  g.quadraticCurveTo(236, 150, 248, h); g.closePath(); g.fill();
  g.fillStyle = '#c9a23a'; // crown
  g.beginPath(); g.moveTo(100, 78); g.lineTo(96, 48); g.lineTo(112, 62); g.lineTo(128, 40); g.lineTo(144, 62); g.lineTo(160, 48); g.lineTo(156, 78); g.closePath(); g.fill();
  g.beginPath(); g.arc(128, 36, 6, 0, 7); g.fill();
  const shield = () => { g.beginPath(); g.moveTo(88, 84); g.lineTo(168, 84); g.lineTo(168, 150); g.quadraticCurveTo(160, 196, 128, 210); g.quadraticCurveTo(96, 196, 88, 150); g.closePath(); };
  shield(); g.fillStyle = '#c9a23a'; g.fill();
  g.save(); shield(); g.clip();
  g.fillStyle = '#2c4f9e'; g.fillRect(92, 88, 36, 56); g.fillRect(128, 144, 36, 62);
  g.fillStyle = '#b3262c'; g.fillRect(128, 88, 36, 56); g.fillRect(92, 144, 36, 62);
  g.restore();
  g.strokeStyle = '#c9a23a'; g.lineWidth = 5; shield(); g.stroke();
  g.lineWidth = 7; // supporters, loosely
  g.beginPath(); g.moveTo(80, 200); g.quadraticCurveTo(50, 150, 74, 104); g.stroke();
  g.beginPath(); g.moveTo(176, 200); g.quadraticCurveTo(206, 150, 182, 104); g.stroke();
});
const flagTex = canvasTex(148, 112, (g, w, h) => {
  g.fillStyle = '#c8102e'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff'; g.fillRect(48, 0, 16, h); g.fillRect(0, 48, w, 16);
});
const gingerTex = canvasTex(512, 128, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#b87434'); gr.addColorStop(1, '#8c5222');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = '#fbf6ec'; g.fillRect(0, 0, w, 14); // icing lace
  for (let x = 16; x < w; x += 32) { g.beginPath(); g.arc(x, 14, 15, 0, Math.PI); g.fill(); }
  g.fillStyle = '#8c5222'; for (let x = 16; x < w; x += 32) { g.beginPath(); g.arc(x, 18, 4, 0, 7); g.fill(); }
  g.strokeStyle = '#fbf6ec'; g.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const x = 32 + i * 64, y = 78;
    if (i % 2 === 0) { // heart
      g.fillStyle = '#c0222b';
      g.beginPath(); g.moveTo(x, y + 26); g.bezierCurveTo(x - 34, y, x - 16, y - 28, x, y - 10);
      g.bezierCurveTo(x + 16, y - 28, x + 34, y, x, y + 26); g.fill(); g.stroke();
    } else { // little gingerbread house
      g.beginPath(); g.moveTo(x - 18, y + 24); g.lineTo(x - 18, y - 6); g.lineTo(x, y - 26); g.lineTo(x + 18, y - 6); g.lineTo(x + 18, y + 24); g.closePath(); g.stroke();
      g.fillStyle = '#ffd98a'; g.fillRect(x - 6, y + 2, 12, 14);
    }
  }
  g.fillStyle = '#fbf6ec'; for (let x = 0; x < w; x += 16) { g.beginPath(); g.arc(x, h - 7, 3, 0, 7); g.fill(); }
}, { repeat: true });
function neighbourTex(lit) {
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = lit ? '#000' : '#cfc9bd'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 12; c++) {
      const x = 14 + c * 42, y = 22 + r * 58;
      if (lit) { if ((c * 7 + r * 5) % 3 !== 0) { g.fillStyle = (c + r) % 4 ? '#ffc470' : '#ffe7b8'; g.fillRect(x, y, 20, 34); } }
      else { g.fillStyle = '#232a36'; g.fillRect(x, y, 20, 34); g.fillStyle = '#f3efe6'; g.fillRect(x - 3, y - 6, 26, 4); }
    }
  });
}

// ---------------------------------------------------------------- materials
const stone = new THREE.MeshStandardMaterial({ color: 0xf0ede6, roughness: 0.9 });
const stoneDim = new THREE.MeshStandardMaterial({ color: 0xcfcbc2, roughness: 0.95 });
const slate = new THREE.MeshStandardMaterial({ color: 0x23262d, roughness: 0.7 });
const black = new THREE.MeshStandardMaterial({ color: 0x101013, roughness: 0.8 });
const gold = new THREE.MeshStandardMaterial({ color: 0xd9a93a, roughness: 0.35, metalness: 0.8, emissive: 0x5a3c08, emissiveIntensity: 0.4 });
const green = new THREE.MeshStandardMaterial({ color: 0x1f4a2a, roughness: 1 });
const red = new THREE.MeshStandardMaterial({ color: 0xb3202a, roughness: 0.7 });
const white = new THREE.MeshStandardMaterial({ color: 0xfaf6ee, roughness: 0.8 });
const paneDark = new THREE.MeshStandardMaterial({ map: paneDarkTex, roughness: 0.25, metalness: 0.3 });
const paneLit = new THREE.MeshBasicMaterial({ map: paneLitTex });
const shopMat = new THREE.MeshBasicMaterial({ map: shopTex });

// ---------------------------------------------------------------- instancing helpers
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitPlane = new THREE.PlaneGeometry(1, 1);
class Batch {
  constructor(geo, mat) { this.geo = geo; this.mat = mat; this.items = []; }
  add(sx, sy, sz, x, y, z, rx = 0, rz = 0) { this.items.push([sx, sy, sz, x, y, z, rx, rz]); }
  build(parent) {
    const m = new THREE.InstancedMesh(this.geo, this.mat, this.items.length);
    const o = new THREE.Object3D();
    this.items.forEach(([sx, sy, sz, x, y, z, rx, rz], i) => {
      o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.set(rx, 0, rz); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
    });
    m.frustumCulled = false; parent.add(m); return m;
  }
}
const B = {
  stone: new Batch(unitBox, stone), dim: new Batch(unitBox, stoneDim), slate: new Batch(unitBox, slate),
  black: new Batch(unitBox, black), gold: new Batch(unitBox, gold),
  dark: new Batch(unitPlane, paneDark), lit: new Batch(unitPlane, paneLit), shop: new Batch(unitPlane, shopMat),
};
const hotel = new THREE.Group(); scene.add(hotel);
const add = (geo, mat, x, y, z, parent = hotel) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };

// ---------------------------------------------------------------- twinkling light points
const lightSets = [];
function makeLights(list, color, gain = 2.2, parent = scene) {
  const n = list.length, pos = new Float32Array(n * 3), a = new Float32Array(n * 3);
  list.forEach((p, i) => { pos.set([p.x, p.y, p.z], i * 3); a.set([p.size, p.order ?? Math.random(), Math.random() * 10], i * 3); });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aData', new THREE.BufferAttribute(a, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOn: { value: 0 }, uScale: { value: 500 }, uColor: { value: new THREE.Color(color) }, uGain: { value: gain } },
    vertexShader: /* glsl */`
      attribute vec3 aData; uniform float uTime, uOn, uScale; varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float on = smoothstep(aData.y * 0.86, aData.y * 0.86 + 0.14, uOn);
        float tw = 0.72 + 0.28 * sin(uTime * (1.5 + fract(aData.z) * 3.5) + aData.z * 6.283);
        float px = aData.x * uScale / -mv.z;
        vA = on * tw * min(1.0, px / 2.2);
        gl_PointSize = max(px, 2.2) * (0.4 + 0.6 * on);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform float uGain; varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = pow(smoothstep(0.5, 0.0, d), 2.0) * vA;
        if (a < 0.004) discard;
        gl_FragColor = vec4(uColor * a * uGain, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; parent.add(pts);
  lightSets.push(mat);
  return mat.uniforms;
}
const WARM = 0xffc878;

// ================================================================ THE HOTEL
const BAY = 3.5, NB = 17, GF = 5.2, FL = 4.1, EAVE = GF + FL * 3; // 17.5
const bayX = (i) => (i - 8) * BAY;
const frontZ = (x) => (Math.abs(x) <= 9 ? 0.9 : Math.abs(x) >= 19.2 ? 0.5 : 0);
const SEGS = [[-30.5, -19.2], [-19.2, -9], [-9, 9], [9, 19.2], [19.2, 30.5]];
const band = (y, h, proj, batch = B.stone) => SEGS.forEach(([a, b]) => {
  const f = frontZ((a + b) / 2); batch.add(b - a + (f ? proj * 2 : 0), h, proj, (a + b) / 2, y, f + proj / 2);
});

// body
B.stone.add(61, EAVE, 12, 0, EAVE / 2, -6);
B.stone.add(18, EAVE, 0.9, 0, EAVE / 2, 0.45);
for (const s of [-1, 1]) B.stone.add(11.3, EAVE, 0.5, s * 24.85, EAVE / 2, 0.25);
band(GF + FL - 0.2, 0.22, 0.25); band(GF + 2 * FL - 0.2, 0.22, 0.25);
band(EAVE - 0.5, 0.35, 0.45); band(EAVE - 0.1, 0.4, 0.8); // main cornice

// upper windows
const litWindow = () => Math.random() < 0.42;
for (let f = 0; f < 3; f++) {
  const ph = f === 0 ? 2.9 : f === 1 ? 2.6 : 2.3, base = GF + f * FL, cy = base + 0.75 + ph / 2;
  for (let i = 0; i < NB; i++) {
    const x = bayX(i), z = frontZ(x);
    B.stone.add(1.95, ph + 0.4, 0.14, x, cy, z + 0.07);            // surround
    (litWindow() ? B.lit : B.dark).add(1.45, ph, 1, x, cy, z + 0.16);
    B.stone.add(2.1, 0.14, 0.3, x, cy - ph / 2 - 0.2, z + 0.15);   // sill
    B.stone.add(2.3, 0.2, 0.36, x, cy + ph / 2 + 0.32, z + 0.18);  // lintel
    if (f === 0) B.stone.add(1.7, 0.16, 0.3, x, cy + ph / 2 + 0.52, z + 0.15);
  }
}
// pilaster strips framing the centre and the end pavilions
for (const x of [-8.75, -5.25, 5.25, 8.75, -19.4, 19.4, -30.2, 30.2]) B.stone.add(0.5, EAVE - GF - 0.6, 0.16, x, GF + (EAVE - GF) / 2 - 0.3, frontZ(x * 0.98) + 0.08);

// ground floor: dim rusticated wall, piers, big glazed openings with black awnings
B.dim.add(61.2, GF - 0.3, 0.1, 0, (GF - 0.3) / 2, 0.02);
for (let i = 0; i <= NB; i++) {
  const x = (i - 8.5) * BAY, z = Math.max(frontZ(x - 0.5), frontZ(x + 0.5));
  B.stone.add(0.85, GF - 0.3, 0.4, x, (GF - 0.3) / 2, z + 0.2);
  B.dim.add(0.95, 0.5, 0.46, x, 0.25, z + 0.23);
}
for (let i = 0; i < NB; i++) {
  const x = bayX(i), z = frontZ(x);
  if (i === 8) continue; // entrance
  B.shop.add(2.7, 3.7, 1, x, 1.95, z + 0.08);
  B.black.add(2.95, 0.07, 1.55, x, 4.05, z + 0.78, 0.5);
  B.black.add(2.95, 0.34, 0.05, x, 3.56, z + 1.46);
}
// entrance: glazed doors, black canopy with gold trim, carpet
B.shop.add(2.7, 3.9, 1, 0, 1.95, 0.98);
B.black.add(4.6, 0.3, 3.6, 0, 4.25, 0.9 + 1.8);
B.gold.add(4.66, 0.07, 3.66, 0, 4.42, 0.9 + 1.8);
B.gold.add(4.66, 0.05, 3.66, 0, 4.09, 0.9 + 1.8);
for (const s of [-1, 1]) B.black.add(0.09, 4.1, 0.09, s * 2.15, 2.05, 4.35);
add(new THREE.PlaneGeometry(2.6, 7), red, 0, 0.03, 4.4).rotation.x = -Math.PI / 2;

// balcony over the ground floor, with balustrade
const BALC_Z = 2.4, RAIL_Y = GF + 1.02;
B.stone.add(61.6, 0.32, BALC_Z + 0.2, 0, GF - 0.16, (BALC_Z + 0.2) / 2);
B.stone.add(61.8, 0.2, 0.3, 0, GF - 0.42, BALC_Z + 0.1);
B.stone.add(61.6, 0.14, 0.3, 0, RAIL_Y, BALC_Z); B.stone.add(61.6, 0.12, 0.26, 0, GF + 0.08, BALC_Z);
for (let i = 0; i <= NB; i++) B.stone.add(0.34, 1.1, 0.34, (i - 8.5) * BAY, GF + 0.55, BALC_Z);
for (let x = -30.6; x <= 30.6; x += 0.36) B.stone.add(0.13, 0.84, 0.13, x, GF + 0.52, BALC_Z);

// roof: slate mansard at the sides with dormers, attic storey in the centre
for (const s of [-1, 1]) {
  B.slate.add(21, 3.95, 0.3, s * 20, 19.45, -0.75, -0.452);
  B.slate.add(21, 0.3, 10.4, s * 20, 21.25, -6.8);
  B.slate.add(21, 3.6, 9.6, s * 20, 19.4, -6.9);
  for (const dx of [12.6, 17.2, 21.8, 26.4]) {
    const x = s * dx;
    B.stone.add(1.7, 2.1, 1.7, x, 18.95, -0.25);
    B.dark.add(1.05, 1.5, 1, x, 18.95, 0.62);
    B.slate.add(1.95, 0.16, 1.9, x, 20.08, -0.2);
  }
  B.stone.add(1.2, 2.2, 1.0, s * 15, 22.2, -6); B.stone.add(1.2, 2.2, 1.0, s * 25, 22.2, -6); // chimneys
  B.stone.add(0.9, 1.3, 0.9, s * 9.1, 22.4, 0.5); // urn plinth
  add(new THREE.SphereGeometry(0.5, 12, 10), stone, s * 9.1, 23.4, 0.5);
}
B.stone.add(19, 3.8, 11, 0, EAVE + 1.9, -4.6);
for (let i = 6; i <= 10; i++) {
  const x = bayX(i);
  B.stone.add(1.9, 2.5, 0.14, x, 19.25, 0.97);
  (litWindow() ? B.lit : B.dark).add(1.4, 2.1, 1, x, 19.25, 1.06);
  B.stone.add(2.2, 0.18, 0.34, x, 20.62, 1.05);
}
B.stone.add(19.9, 0.4, 0.9, 0, 21.45, 0.95);             // attic cornice
B.stone.add(13.4, 1.25, 0.7, 0, 22.3, 0.75);            // name frieze
B.stone.add(14, 0.22, 0.9, 0, 23.02, 0.8);
add(new THREE.PlaneGeometry(12.6, 1.18), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6, emissive: 0x000000 }), 0, 22.3, 1.11).name = 'sign';
add(new THREE.PlaneGeometry(4.4, 4.4), new THREE.MeshStandardMaterial({ map: crestTex, transparent: true, alphaTest: 0.5, roughness: 0.7 }), 0, 25.3, 0.8);
B.slate.add(18.6, 0.5, 9, 0, 21.6, -5.4);

// flags
const flags = [];
for (const [x, top] of [[-5.6, 29.2], [1.2, 31.6], [6.2, 28.6]]) {
  B.black.add(0.16, top - 21.5, 0.16, x, (top + 21.5) / 2, -1.2);
  const g = new THREE.PlaneGeometry(2.7, 2.0, 14, 6); g.translate(1.35, 0, 0);
  const f = add(g, new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.9 }), x + 0.05, top - 1.1, -1.2);
  f.userData = { base: g.attributes.position.array.slice(), phase: rand(6) }; flags.push(f);
}

// ================================================================ CHRISTMAS DRESSING
// the gingerbread tower on the balcony
const tower = new THREE.Group(); tower.position.set(0, GF, 0.9); tower.scale.z = 0.34; hotel.add(tower);
const TIERS = 9, TH = 0.93, towerPts = [];
for (let i = 0; i < TIERS; i++) {
  const r = 4.6 - i * 0.49, y = i * TH;
  const tex = gingerTex.clone(); tex.repeat.set(Math.max(1, Math.round(r * 1.6)) / 2, 1); tex.needsUpdate = true;
  add(new THREE.CylinderGeometry(r, r * 1.03, TH, 40), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), 0, y + TH / 2, 0, tower);
  add(new THREE.CylinderGeometry(r + 0.1, r + 0.1, 0.1, 40), white, 0, y + TH, 0, tower);
  for (let k = 0, n = Math.round(r * 9); k < n; k++) {
    const th = lerp(-1.45, 1.45, k / (n - 1));
    towerPts.push({ x: (r + 0.12) * Math.sin(th), y: GF + y + TH + 0.05, z: 0.9 + (r + 0.12) * Math.cos(th) * 0.34 + 0.05, size: 0.2, order: 1 - i / TIERS + rand(0.1) });
  }
  for (let k = 0; k < r * 5; k++) {
    const th = rand(-1.4, 1.4);
    towerPts.push({ x: r * Math.sin(th), y: GF + y + rand(0.15, 0.8), z: 0.9 + r * Math.cos(th) * 0.34 + 0.08, size: 0.13, order: rand() });
  }
}
for (const s of [-1, 1]) { const b = add(new THREE.SphereGeometry(0.5, 14, 10), white, s * 0.48, TIERS * TH + 0.55, 0.6, tower); b.scale.set(1, 0.7, 1.4); }
add(new THREE.SphereGeometry(0.3, 12, 10), red, 0, TIERS * TH + 0.5, 1.3, tower);
const uTower = makeLights(towerPts, 0xfff4ea, 2.6);

// the light curtain over the central façade
const netPts = [], swagPts = [];
const APEX = new THREE.Vector2(0, 21.0);
for (let i = 0; i < 3000; i++) {
  const x = rand(-10.3, 10.3), y = rand(GF + 0.4, 21.2);
  if (Math.abs(x) < (4.9 - (y - GF) * 0.5) && y < GF + 8.6) continue; // behind the tower
  const d = Math.hypot(x - APEX.x, (y - APEX.y) * 0.8) / 19;
  netPts.push({ x, y, z: frontZ(x) + 0.42, size: 0.13, order: clamp01(d * 0.9 + rand(0.08)) });
}
const bez = (p0, p1, p2, t) => ({ x: (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], y: (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1] });
for (const s of [-1, 1]) {
  for (let k = 0; k < 5; k++) { // theatre-curtain drapes fanning out from the top
    const p0 = [s * 0.4, 21.0], p1 = [s * (3.2 + k * 2.3), 20.9 - k * 1.3], p2 = [s * 10.1, 17.6 - k * 2.75];
    for (let j = 0; j <= 70; j++) { const t = j / 70, p = bez(p0, p1, p2, t); swagPts.push({ x: p.x, y: p.y, z: 1.05, size: 0.27, order: t * 0.55 + k * 0.07 }); }
  }
  for (let j = 0; j <= 60; j++) swagPts.push({ x: s * 10.15, y: lerp(17.6, GF + 0.6, j / 60), z: 0.7, size: 0.25, order: 0.5 + (j / 60) * 0.45 });
  for (let k = 0; k < 3; k++) { // scalloped valance under the name
    const a = s * (k * 3.2 + 0.2), b = a + s * 3.2;
    for (let j = 0; j <= 22; j++) { const t = j / 22, p = bez([a, 21.1], [(a + b) / 2, 19.6], [b, 21.1], t); swagPts.push({ x: p.x, y: p.y, z: 1.1, size: 0.25, order: 0.02 + Math.abs(p.x) / 70 }); }
  }
}
const uNet = makeLights(netPts, 0xffc266, 1.9), uSwag = makeLights(swagPts, 0xffd696, 2.6);

// fir garlands and lights along the balustrade, topiaries, golden medallions
const duskPts = [];
for (let i = 0; i < NB; i++) {
  const x0 = (i - 8.5) * BAY, pts = [];
  for (let j = 0; j <= 10; j++) { const u = j / 10; pts.push(new THREE.Vector3(x0 + u * BAY, RAIL_Y - 0.1 - 0.55 * 4 * u * (1 - u), BALC_Z + 0.2)); }
  hotel.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.11, 5), green));
  pts.forEach((p, j) => { if (j % 1 === 0) duskPts.push({ x: p.x, y: p.y, z: p.z + 0.13, size: 0.12 }); });
  add(new THREE.SphereGeometry(0.17, 8, 6), red, x0, RAIL_Y - 0.05, BALC_Z + 0.22);
}
const cone = (x, z, h, r, y0, lights = 26) => {
  add(new THREE.ConeGeometry(r, h, 14), green, x, y0 + 0.5 + h / 2, z);
  add(new THREE.CylinderGeometry(r * 0.45, r * 0.35, 0.5, 10), white, x, y0 + 0.25, z);
  for (let k = 0; k < lights; k++) { const u = rand(), th = rand(-1.6, 1.6), rr = r * (1 - u) + 0.04; duskPts.push({ x: x + rr * Math.sin(th), y: y0 + 0.5 + u * h, z: z + rr * Math.cos(th), size: 0.11 }); }
};
for (const x of [-27.5, -20.6, -12.2, 12.2, 20.6, 27.5]) cone(x, 1.75, 2.7, 0.8, GF);
for (const s of [-1, 1]) {
  cone(s * 3.1, 4.9, 2.4, 0.75, 0, 34);
  const m = add(new THREE.TorusGeometry(0.85, 0.2, 10, 28), gold, s * 15.75, 11.4, 0.4);
  add(new THREE.CircleGeometry(0.75, 20), gold, 0, 0, 0.05, m);
  add(new THREE.BoxGeometry(0.5, 0.9, 0.1), red, 0, -1.2, 0.05, m);
}
// bulbs strung along the awnings and under the canopy
for (let x = -29.8; x <= 29.8; x += 0.85) if (Math.abs(x) > 2.4) duskPts.push({ x, y: 3.42 + 0.06 * Math.sin(x * 3), z: frontZ(x) + 1.52, size: 0.2 });
for (let x = -2; x <= 2; x += 0.5) for (const z of [2.2, 3.2, 4.2]) duskPts.push({ x, y: 4.05, z, size: 0.16 });
const uDusk = makeLights(duskPts, WARM, 1.6);

// Københavns Drengekor on the balcony, either side of the tower
const choir = [];
const navy = new THREE.MeshStandardMaterial({ color: 0x1a2440, roughness: 0.8 });
const skin = new THREE.MeshStandardMaterial({ color: 0xe9c2a2, roughness: 0.8 });
const hairs = [0x5a3b22, 0xc79a52, 0x2c1e14, 0x8a5a30].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1 }));
const bodyG = new THREE.CylinderGeometry(0.17, 0.21, 0.82, 10), headG = new THREE.SphereGeometry(0.135, 12, 10);
const collarG = new THREE.CylinderGeometry(0.2, 0.2, 0.07, 10), hairG = new THREE.SphereGeometry(0.142, 12, 8, 0, 7, 0, 1.5);
const bookG = new THREE.BoxGeometry(0.26, 0.18, 0.03);
for (const s of [-1, 1]) for (let row = 0; row < 2; row++) for (let k = 0; k < 11; k++) {
  const boy = new THREE.Group(), h = rand(0.9, 1.08);
  boy.position.set(s * (5.35 + k * 0.5 + row * 0.25), GF + row * 0.3, 1.95 - row * 0.5);
  boy.scale.setScalar(h);
  add(bodyG, navy, 0, 0.72, 0, boy); add(collarG, white, 0, 1.14, 0, boy);
  add(headG, skin, 0, 1.32, 0, boy); add(hairG, hairs[(k + row) % 4], 0, 1.33, -0.01, boy);
  add(bookG, white, 0, 0.98, 0.2, boy).rotation.x = -0.5;
  boy.userData.phase = rand(6); hotel.add(boy); choir.push(boy);
}

Object.values(B).forEach((b) => b.build(hotel));

// ================================================================ THE SQUARE
add(new THREE.PlaneGeometry(500, 300), new THREE.MeshStandardMaterial({ color: 0x3a3c41, roughness: 0.55, metalness: 0.2 }), 0, 0, 60, scene).rotation.x = -Math.PI / 2;
const nbLit = [];
for (const [x, w, h, z] of [[53, 40, 14.5, -3], [-55, 44, 16, -2]]) {
  const m = new THREE.MeshStandardMaterial({ map: neighbourTex(false), emissiveMap: neighbourTex(true), emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.9 });
  add(new THREE.BoxGeometry(w, h, 14), m, x, h / 2, z - 7, scene); nbLit.push(m);
  add(new THREE.BoxGeometry(w + 0.6, 2.4, 14.6), slate, x, h + 1.2, z - 7, scene);
}

// bare trees hung with bulbs
const treeLines = [], treePts = [];
const bark = new THREE.MeshStandardMaterial({ color: 0x1c1611, roughness: 1 });
function limb(a, b, r1, r2) {
  const d = new THREE.Vector3().subVectors(b, a), m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, d.length(), 6), bark);
  m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); scene.add(m);
}
function grow(a, dir, len, depth) {
  const b = a.clone().addScaledVector(dir, len);
  if (depth >= 5) limb(a, b, 0.05 * depth - 0.13, 0.05 * depth - 0.18); else treeLines.push(a.x, a.y, a.z, b.x, b.y, b.z);
  if (depth <= 5 && depth >= 2 && Math.random() < 0.45) treePts.push({ x: b.x, y: b.y - 0.15, z: b.z, size: 0.26 });
  if (depth === 0) return;
  const n = depth > 4 ? 3 : Math.random() < 0.35 ? 3 : 2;
  for (let i = 0; i < n; i++) {
    const nd = dir.clone().add(new THREE.Vector3(rand(-0.75, 0.75), rand(-0.1, 0.45), rand(-0.6, 0.6))).normalize();
    grow(b, nd, len * rand(0.66, 0.8), depth - 1);
  }
}
for (const [x, z] of [[-27, 22], [-15.5, 25], [-5.5, 21], [7.5, 24], [17, 21.5], [28, 25]]) {
  const base = new THREE.Vector3(x, 0, z), top = new THREE.Vector3(x + rand(-0.3, 0.3), 5.2, z);
  limb(base, top, 0.3, 0.2); grow(top, new THREE.Vector3(0, 1, 0), 3.6, 7);
}
{
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(treeLines, 3));
  scene.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x1a140f })));
}
const uTrees = makeLights(treePts, 0xffcf8a, 1.8);

// the crowd, a few phones held high
const CROWD = 520;
const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.125, 8, 6), new THREE.MeshStandardMaterial({ roughness: 1 }), CROWD);
const bodies = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.26, 1.5, 8), new THREE.MeshStandardMaterial({ roughness: 1 }), CROWD);
const phoneList = [];
{
  const o = new THREE.Object3D(), c = new THREE.Color();
  const coats = [0x14161c, 0x1d2230, 0x2a2420, 0x30333a, 0x1a2a24, 0x3a2326, 0x23252b];
  const caps = [0x2a1d12, 0x5c4630, 0x111111, 0xa52a2a, 0xcfc8ba, 0x3b2a1d];
  for (let i = 0; i < CROWD; i++) {
    const z = rand(28, 47), x = rand(-36, 36), h = rand(1.5, 1.92);
    o.position.set(x, h, z); o.scale.setScalar(1); o.updateMatrix(); heads.setMatrixAt(i, o.matrix);
    heads.setColorAt(i, c.setHex(caps[i % caps.length]));
    o.position.set(x, h - 0.86, z); o.updateMatrix(); bodies.setMatrixAt(i, o.matrix);
    bodies.setColorAt(i, c.setHex(coats[i % coats.length]));
    if (i % 9 === 0) phoneList.push([x + rand(-0.2, 0.2), h + rand(0.25, 0.5), z - 0.25]);
  }
  scene.add(heads, bodies);
}
const phones = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.1, 0.19), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 0.95, 1.3) }), phoneList.length);
{ const o = new THREE.Object3D(); phoneList.forEach(([x, y, z], i) => { o.position.set(x, y, z); o.rotation.x = -0.25; o.updateMatrix(); phones.setMatrixAt(i, o.matrix); }); scene.add(phones); }

// ================================================================ SKY, LIGHT, SNOW
const skyU = { uNight: { value: 0 } };
scene.add(new THREE.Mesh(new THREE.SphereGeometry(600, 24, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, uniforms: skyU,
  vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: /* glsl */`
    uniform float uNight; varying vec3 vP;
    void main() {
      float h = clamp(normalize(vP).y * 1.6 + 0.08, 0.0, 1.0);
      vec3 day = mix(vec3(0.62, 0.64, 0.66), vec3(0.42, 0.45, 0.5), h);
      vec3 dusk = mix(vec3(0.24, 0.3, 0.46), vec3(0.06, 0.11, 0.28), h);
      vec3 night = mix(vec3(0.035, 0.06, 0.16), vec3(0.008, 0.015, 0.06), h);
      vec3 c = uNight < 0.5 ? mix(day, dusk, uNight * 2.0) : mix(dusk, night, uNight * 2.0 - 1.0);
      gl_FragColor = vec4(c, 1.0);
    }`,
})));
const starPos = [];
for (let i = 0; i < 700; i++) { const v = new THREE.Vector3(rand(-1, 1), rand(0.08, 1), rand(-1, 0.4)).normalize().multiplyScalar(560); starPos.push(v.x, v.y, v.z); }
const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({ color: 0xdfe8ff, size: 1.7, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false });
scene.add(new THREE.Points(starGeo, starMat));

const hemi = new THREE.HemisphereLight(0xe6ecf5, 0x5a554c, 3);
const sun = new THREE.DirectionalLight(0xfff4e6, 1.4); sun.position.set(-30, 50, 45);
scene.add(hemi, sun);
const washes = [[-6.5, 3, 9], [6.5, 3, 9], [0, 13, 12], [0, 24, 7]].map(([x, y, z]) => {
  const l = new THREE.PointLight(0xffb866, 0, 0, 1.5); l.position.set(x, y, z); scene.add(l); return l;
});
const shopGlow = [[-18, 2.5, 6], [18, 2.5, 6], [0, 2.5, 7]].map(([x, y, z]) => {
  const l = new THREE.PointLight(0xffb060, 0, 0, 1.6); l.position.set(x, y, z); scene.add(l); return l;
});

const SNOW = 3200;
const snowGeo = new THREE.BufferGeometry();
{
  const p = new Float32Array(SNOW * 3); for (let i = 0; i < SNOW * 3; i++) p[i] = Math.random();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(p, 3));
}
const snowMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uScale: { value: 500 }, uAmount: { value: 0 } },
  vertexShader: /* glsl */`
    uniform float uTime, uScale; varying float vA;
    void main() {
      vec3 p = position; float seed = fract(p.x * 31.7 + p.z * 17.3);
      p.y = fract(p.y - uTime * (0.03 + seed * 0.03));
      p.x = fract(p.x + sin(uTime * 0.5 + seed * 40.0) * 0.006 + uTime * 0.004);
      vec3 w = vec3((p.x - 0.5) * 90.0, p.y * 36.0, p.z * 80.0 + 1.0);
      vec4 mv = modelViewMatrix * vec4(w, 1.0);
      float px = (0.07 + seed * 0.07) * uScale / -mv.z;
      gl_PointSize = clamp(px, 1.5, 14.0); vA = 0.5 + 0.4 * seed;
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: 'uniform float uAmount; varying float vA; void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.15,d)*vA*uAmount; gl_FragColor = vec4(vec3(0.9,0.94,1.0)*a, a); }',
  transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
});
const snow = new THREE.Points(snowGeo, snowMat); snow.frustumCulled = false; scene.add(snow);

// ================================================================ TIMELINE
const LIGHTS_AT = 34;
const CAPTIONS = [
  [0, 'Eftermiddag på Kongens Nytorv'],
  [9, 'Folk samles foran Hotel d\'Angleterre'],
  [14, 'Københavns Drengekor synger fra balkonen'],
  [28, 'Mørket falder på …'],
  [LIGHTS_AT, 'Og så tændes lysene'],
  [47, 'Glædelig jul'],
  [62, ''],
];
// [time, camera position, look-at]
const KEYS = [
  [0, [0, 17, 84], [0, 13.5, 0]],
  [9, [-9, 2.6, 52], [0, 13, 0]],
  [14, [-11, 7.4, 18], [-8, 6.7, 2]],
  [21, [-9.5, 7.1, 12.5], [-8, 6.6, 2]],
  [24, [8, 7.5, 13], [7.8, 6.6, 2]],
  [29, [10.5, 7.6, 17], [6.5, 7, 2]],
  [33, [3, 2.5, 50], [0, 13.5, 0]],
  [42, [0, 3.2, 54], [0, 13.5, 0]],
  [50, [1.5, 9.5, 19.5], [0, 11.5, 0]],
  [61, [-16, 5, 44], [0, 13, 0]],
  [74, [0, 15, 78], [0, 13, 0]],
  [87, [14, 3, 48], [0, 13, 0]],
  [100, [1.5, 9.5, 19.5], [0, 11.5, 0]],
];
const LOOP_FROM = 50, LOOP_TO = 100;
const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(), va = new THREE.Vector3(), vb = new THREE.Vector3();
let distK = 1;
function cameraAt(t) {
  if (t > LOOP_TO) t = LOOP_FROM + ((t - LOOP_FROM) % (LOOP_TO - LOOP_FROM));
  let i = 0; while (i < KEYS.length - 2 && t >= KEYS[i + 1][0]) i++;
  const [t0, p0, l0] = KEYS[i], [t1, p1, l1] = KEYS[i + 1], u = smooth(t0, t1, t);
  camPos.copy(va.fromArray(p0)).lerp(vb.fromArray(p1), u);
  camTgt.copy(va.fromArray(l0)).lerp(vb.fromArray(l1), u);
  camPos.z = camTgt.z + (camPos.z - camTgt.z) * distK;
  camPos.x += Math.sin(t * 0.23) * 0.35 + mouse.x * 3; camPos.y += Math.sin(t * 0.31) * 0.15 - mouse.y * 1.5;
  camPos.y = Math.max(camPos.y, 1.2);
}
const mouse = new THREE.Vector2();
window.addEventListener('pointermove', (e) => mouse.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5));

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h);
  camera.aspect = w / h; camera.fov = w < h ? 52 : 38; camera.updateProjectionMatrix();
  distK = THREE.MathUtils.clamp(1.55 / camera.aspect, 1, 1.9);
  const px = (renderer.getPixelRatio() * h) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  lightSets.forEach((m) => { m.uniforms.uScale.value = px; }); snowMat.uniforms.uScale.value = px;
}
window.addEventListener('resize', resize); resize();

const lineEl = document.getElementById('line'); let shown = null;
function caption(t) {
  let text = ''; for (const [at, s] of CAPTIONS) if (t >= at) text = s;
  if (text === shown) return; shown = text;
  lineEl.style.opacity = 0; setTimeout(() => { lineEl.textContent = text; lineEl.style.opacity = 1; }, 800);
}

const cDay = new THREE.Color(0xe6ecf5), cNight = new THREE.Color(0x3b56a0), gDay = new THREE.Color(0x5a554c), gNight = new THREE.Color(0x0b0c14);
const QS = new URLSearchParams(location.search);
const skip = Number(QS.get('t')) || 0;   // ?t=30 jumps ahead
const HOLD = QS.has('hold');             // ?t=30&hold freezes the timeline there (for stills)
let startedAt = null;
function frame(ms) {
  const now = ms / 1000, t = HOLD ? skip : startedAt === null ? 0 : now - startedAt;
  const night = smooth(7, 31, t), windows = smooth(11, 24, t), dusk = smooth(13, 22, t);
  const on = clamp01((t - LIGHTS_AT) / 7), glow = smooth(0, 1, on), towerOn = clamp01((t - 45) / 4);

  skyU.uNight.value = night; starMat.opacity = smooth(0.7, 1, night) * 0.9;
  hemi.color.lerpColors(cDay, cNight, night); hemi.groundColor.lerpColors(gDay, gNight, night);
  hemi.intensity = lerp(3.0, 0.75, night); sun.intensity = lerp(1.4, 0, night);
  paneLit.color.setScalar(lerp(0.1, 1.0, windows)); shopMat.color.setScalar(lerp(0.22, 1.0, windows));
  nbLit.forEach((m) => { m.emissiveIntensity = windows * 1.3; });
  shopGlow.forEach((l) => { l.intensity = windows * 14; });
  washes.forEach((l, i) => { l.intensity = glow * (i < 2 ? 17 : 11) * (0.96 + 0.04 * Math.sin(now * 2 + i)); });
  uNet.uOn.value = on; uSwag.uOn.value = clamp01(on * 1.25); uTower.uOn.value = towerOn;
  uDusk.uOn.value = dusk; uTrees.uOn.value = smooth(15, 26, t);
  phones.visible = night > 0.25;
  bloom.strength = lerp(0.1, 0.42, night) + 0.22 * Math.sin(Math.PI * clamp01((t - LIGHTS_AT) / 9)) * (on > 0 ? 1 : 0);
  lightSets.forEach((m) => { m.uniforms.uTime.value = now; });
  snowMat.uniforms.uTime.value = now; snowMat.uniforms.uAmount.value = 0.25 + 0.75 * night;

  choir.forEach((b) => { // a gentle sway, breathing with the phrases
    b.rotation.z = Math.sin(now * 0.9 + b.userData.phase) * 0.05;
    b.rotation.x = Math.sin(now * 0.45 + b.userData.phase * 0.3) * 0.03;
  });
  flags.forEach((f) => {
    const p = f.geometry.attributes.position, base = f.userData.base;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3], w = x / 2.7;
      p.setZ(i, Math.sin(x * 2.4 - now * 4 + f.userData.phase) * 0.28 * w);
      p.setY(i, base[i * 3 + 1] + Math.sin(x * 1.6 - now * 3) * 0.08 * w - w * w * 0.25);
    }
    p.needsUpdate = true;
  });

  cameraAt(t); camera.position.copy(camPos); camera.lookAt(camTgt);
  if (startedAt !== null) caption(t);
  composer.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------------------------------------------------------------- UI
const music = new Music();
Music.hasCustomTrack().then((custom) => {
  document.getElementById('musicnote').textContent = custom ? 'Musik: audio/music.mp3' : 'Musik: »Glade jul« (Franz Gruber, 1818) – syntetiseret kor';
});

if (HOLD) document.getElementById('intro').style.display = 'none';
document.getElementById('start').addEventListener('click', async () => {
  try { await music.start(); } catch (e) { console.warn('Ingen lyd:', e); }
  startedAt = performance.now() / 1000 - skip;
  document.getElementById('intro').classList.add('gone');
  document.getElementById('caption').classList.add('on');
  document.querySelectorAll('.corner').forEach((el) => el.classList.add('on'));
});
document.getElementById('replay').addEventListener('click', () => { startedAt = performance.now() / 1000; });
document.getElementById('mute').addEventListener('click', (e) => { e.currentTarget.textContent = music.toggle() ? '∅' : '♪'; });
