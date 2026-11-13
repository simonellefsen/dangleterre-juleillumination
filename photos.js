import * as THREE from 'three';
import { Music } from './music.js';

const FILES = ['0822', '0824', '0826', '0827', '0829', '0831', '0833', '0834',
  '0835', '0836', '0837', '0838', '0839', '0840', '0841', '0842'].map((n) => `img/IMG_${n}.jpg`);

// Caption per shot (index of the first shot it applies to).
const CAPTIONS = [
  [0, 'Eftermiddag på Kongens Nytorv'],
  [1, 'Folk samles under de nøgne træer'],
  [3, 'Københavns Drengekor synger fra balkonen'],
  [5, 'Mørket falder på'],
  [7, 'Og så tændes lysene …'],
  [9, 'Hotel d\'Angleterre i fuldt juleskrud'],
  [13, 'Glædelig jul'],
];

const SHOT = 7.0;      // seconds each photo is held
const FADE = 3.2;      // cross-fade into the next photo
const LIGHTS_ON = 7;   // first shot with the illumination lit
const IMG_ASPECT = 4 / 3;
const FOCUS = new THREE.Vector2(0.06, -0.12); // zoom target (gingerbread tower / balcony), plane units

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x060a16);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
const CAM_Z = 5;
camera.position.z = CAM_Z;

// ---------- photo material: luminance-led reveal, lifted exposure, soft glow ----------
const photoVert = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const photoFrag = /* glsl */`
  uniform sampler2D map;
  uniform float uReveal;   // 0..1 fade-in progress
  uniform float uGlow;     // bloom strength
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(map, vUv).rgb;
    vec3 blur = texture2D(map, vUv, 4.5).rgb;
    vec3 wide = texture2D(map, vUv, 6.5).rgb;
    c *= 1.36;                                   // source photos top out at ~0.72
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    // bloom from the brightest regions, gently breathing
    float breathe = 0.9 + 0.1 * sin(uTime * 1.3 + vUv.x * 9.0);
    vec3 glow = max(blur * 1.36 - 0.55, 0.0) * 1.3 + max(wide * 1.36 - 0.45, 0.0) * 0.6;
    c += glow * vec3(1.0, 0.86, 0.62) * uGlow * breathe;
    c = mix(c, c * c * (3.0 - 2.0 * c), 0.35);   // a little contrast
    // bright pixels (the lights) arrive first
    float a = smoothstep(0.0, 1.0, uReveal * 1.7 - (1.0 - lum) * 0.7);
    gl_FragColor = vec4(c, a);
    #include <colorspace_fragment>
  }`;

// ---------- twinkling lights ----------
const sparkVert = /* glsl */`
  attribute float aPhase;
  attribute float aSize;
  uniform float uTime;
  uniform float uScale;
  varying float vTw;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float tw = sin(uTime * (1.6 + fract(aPhase) * 3.0) + aPhase * 6.283);
    vTw = 0.35 + 0.65 * pow(0.5 + 0.5 * tw, 3.0);
    gl_PointSize = aSize * uScale * (0.6 + 0.6 * vTw) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;
const sparkFrag = /* glsl */`
  uniform float uAlpha;
  varying float vTw;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p);
    float core = smoothstep(0.5, 0.0, d);
    float rays = max(0.0, 1.0 - abs(p.x) * 26.0) * max(0.0, 1.0 - abs(p.y) * 2.4)
               + max(0.0, 1.0 - abs(p.y) * 26.0) * max(0.0, 1.0 - abs(p.x) * 2.4);
    float a = (pow(core, 2.4) + rays * 0.5) * vTw * uAlpha;
    gl_FragColor = vec4(vec3(1.0, 0.86, 0.6) * a, a);
  }`;

function findLights(img, max) {
  const w = 256, h = 192;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(img, 0, 0, w, h);
  const d = cx.getImageData(0, 0, w, h).data;
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = (d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) / 185;
  const found = [];
  for (let y = 3; y < h - 3; y++) {
    for (let x = 3; x < w - 3; x++) {
      const i = y * w + x, l = lum[i];
      if (l < 0.7) continue;
      const warm = d[i * 4] - d[i * 4 + 2];
      if (warm < 6) continue; // skip sky / cold whites
      let ring = 0;
      for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3], [-2, -2], [2, 2], [-2, 2], [2, -2]]) ring += lum[i + dy * w + dx];
      const contrast = l - ring / 8;
      if (contrast > 0.1) found.push([x / w, 1 - y / h, contrast]);
    }
  }
  for (let i = found.length - 1; i > 0; i--) { // shuffle, then keep a sample
    const j = Math.floor(Math.random() * (i + 1));
    [found[i], found[j]] = [found[j], found[i]];
  }
  return found.slice(0, max);
}

const planeGeo = new THREE.PlaneGeometry(IMG_ASPECT, 1);
const shots = [];

function makeShot(img, index) {
  const tex = new THREE.Texture(img);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 4;
  tex.needsUpdate = true;

  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, uReveal: { value: 0 }, uGlow: { value: 0 }, uTime: { value: 0 } },
    vertexShader: photoVert, fragmentShader: photoFrag, transparent: true, depthTest: false, depthWrite: false,
  });
  const mesh = new THREE.Mesh(planeGeo, mat);

  const lit = index >= LIGHTS_ON;
  const pts = findLights(img, lit ? 420 : index === 0 ? 0 : 140);
  const pos = new Float32Array(pts.length * 3), ph = new Float32Array(pts.length), sz = new Float32Array(pts.length);
  pts.forEach(([u, v, c], i) => {
    pos[i * 3] = (u - 0.5) * IMG_ASPECT; pos[i * 3 + 1] = v - 0.5; pos[i * 3 + 2] = 0.002;
    ph[i] = Math.random() * 10;
    sz[i] = (lit ? 0.055 : 0.07) * (0.6 + Math.min(c, 0.5) * 2 + Math.random() * 0.5);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
  g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
  const smat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 }, uScale: { value: 1 } },
    vertexShader: sparkVert, fragmentShader: sparkFrag,
    transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
  const sparks = new THREE.Points(g, smat);
  sparks.frustumCulled = false;

  const group = new THREE.Group();
  group.add(mesh, sparks);
  group.visible = false;
  scene.add(group);
  return { group, mesh, mat, sparks, smat, lit };
}

// ---------- snow ----------
const SNOW = 1400;
const snowGeo = new THREE.BufferGeometry();
{
  const p = new Float32Array(SNOW * 3), s = new Float32Array(SNOW);
  for (let i = 0; i < SNOW; i++) {
    p[i * 3] = Math.random(); p[i * 3 + 1] = Math.random(); p[i * 3 + 2] = Math.random();
    s[i] = Math.random();
  }
  snowGeo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  snowGeo.setAttribute('aSeed', new THREE.BufferAttribute(s, 1));
}
const snowMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uBox: { value: new THREE.Vector3(8, 5, 3.6) }, uScale: { value: 1 }, uAmount: { value: 0 } },
  vertexShader: /* glsl */`
    attribute float aSeed;
    uniform float uTime; uniform vec3 uBox; uniform float uScale;
    varying float vA;
    void main() {
      vec3 p = position;
      float speed = 0.035 + aSeed * 0.05;
      p.y = fract(p.y - uTime * speed);
      p.x = fract(p.x + sin(uTime * 0.4 + aSeed * 40.0) * 0.012 + uTime * 0.006);
      vec3 w = (p - 0.5) * uBox; w.z = p.z * uBox.z + 0.4;
      vec4 mv = modelViewMatrix * vec4(w, 1.0);
      gl_PointSize = (0.012 + aSeed * 0.02) * uScale / -mv.z;
      vA = 0.35 + 0.5 * aSeed;
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */`
    uniform float uAmount; varying float vA;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      float a = smoothstep(0.5, 0.1, d) * vA * uAmount;
      gl_FragColor = vec4(vec3(a), a);
    }`,
  transparent: true, depthTest: false, depthWrite: false,
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
});
const snow = new THREE.Points(snowGeo, snowMat);
snow.frustumCulled = false; snow.renderOrder = 10;
scene.add(snow);

// ---------- layout ----------
let baseScale = 1;
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  const visH = 2 * CAM_Z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const visW = visH * camera.aspect;
  baseScale = Math.max(visH, visW / IMG_ASPECT) * 1.1; // cover, with room for camera drift
  const px = renderer.getPixelRatio() * h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  snowMat.uniforms.uScale.value = px;
  snowMat.uniforms.uBox.value.set(visW * 1.3, visH * 1.3, 3.6);
  shots.forEach((s) => { s.smat.uniforms.uScale.value = px; });
}
window.addEventListener('resize', resize);

const mouse = new THREE.Vector2();
window.addEventListener('pointermove', (e) => {
  mouse.set(e.clientX / window.innerWidth - 0.5, e.clientY / window.innerHeight - 0.5);
});

// ---------- UI ----------
const lineEl = document.getElementById('line');
const dotsEl = document.getElementById('dots');
FILES.forEach(() => dotsEl.appendChild(document.createElement('i')));
let shownCaption = '', shownDot = -1;
function setCaption(idx) {
  if (idx !== shownDot) {
    [...dotsEl.children].forEach((d, i) => d.classList.toggle('on', i === idx));
    shownDot = idx;
  }
  let text = '';
  for (const [from, t] of CAPTIONS) if (idx >= from) text = t;
  if (text === shownCaption) return;
  shownCaption = text;
  lineEl.style.opacity = 0;
  setTimeout(() => { lineEl.textContent = text; lineEl.style.opacity = 1; }, 900);
}

// ---------- animation ----------
const ease = (x) => x * x * (3 - 2 * x);
let startedAt = null; // seconds; null until "start"
let flash = 0;

function frame(nowMs) {
  const now = nowMs / 1000;
  const t = startedAt === null ? 0 : now - startedAt;
  const N = shots.length;
  const cycle = t % (N * SHOT);
  const idx = Math.floor(cycle / SHOT);
  const local = cycle - idx * SHOT;
  const next = (idx + 1) % N;
  const fadeP = Math.max(0, (local - (SHOT - FADE)) / FADE);

  shots.forEach((s, i) => {
    const isCur = i === idx, isNext = i === next && fadeP > 0;
    s.group.visible = isCur || isNext;
    if (!s.group.visible) return;
    // age: seconds since this shot began fading in
    const age = isCur ? local + FADE : fadeP * FADE;
    const zoom = 1 + 0.085 * (age / (SHOT + FADE));
    const sc = baseScale * zoom;
    s.group.scale.set(sc, sc, 1);
    s.group.position.set(-FOCUS.x * (sc - baseScale), -FOCUS.y * (sc - baseScale), 0);
    s.group.renderOrder = isCur ? 1 : 2;
    s.mesh.renderOrder = isCur ? 1 : 3;
    s.sparks.renderOrder = isCur ? 2 : 4;
    const reveal = isCur ? 1 : ease(fadeP);
    s.mat.uniforms.uReveal.value = reveal;
    s.mat.uniforms.uTime.value = now;
    s.mat.uniforms.uGlow.value = (s.lit ? 0.75 : 0.3) + (i === LIGHTS_ON ? flash : 0);
    s.smat.uniforms.uTime.value = now;
    s.smat.uniforms.uAlpha.value = reveal * (isCur ? 1 - ease(fadeP) * 0.6 : 1) * (startedAt === null ? 0.5 : 1);
  });

  // the moment the façade lights up: a warm surge that settles
  if (next === LIGHTS_ON && fadeP > 0) flash = Math.sin(fadeP * Math.PI) * 0.9 + fadeP * 0.5;
  else if (idx === LIGHTS_ON) flash = 0.5 * Math.exp(-local * 0.9);
  else flash = 0;

  // snow thickens as evening falls
  const evening = THREE.MathUtils.clamp((idx + local / SHOT - 0.6) / 4, 0, 1);
  snowMat.uniforms.uTime.value = now;
  snowMat.uniforms.uAmount.value = startedAt === null ? 0.6 : 0.25 + 0.75 * evening;

  // slow handheld drift + pointer parallax
  const tx = Math.sin(now * 0.11) * 0.09 + mouse.x * 0.22;
  const ty = Math.cos(now * 0.085) * 0.05 - mouse.y * 0.14;
  camera.position.x += (tx - camera.position.x) * 0.03;
  camera.position.y += (ty - camera.position.y) * 0.03;
  camera.lookAt(camera.position.x * 0.55, camera.position.y * 0.55, 0);

  if (startedAt !== null) setCaption(fadeP > 0.5 ? next : idx);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// ---------- boot ----------
const startBtn = document.getElementById('start');
const music = new Music();

function loadImage(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im); im.onerror = () => rej(new Error(`Kunne ikke hente ${src}`));
    im.src = src;
  });
}

(async () => {
  let done = 0;
  const imgs = await Promise.all(FILES.map((f) => loadImage(f).then((im) => {
    startBtn.textContent = `Indlæser… ${++done}/${FILES.length}`;
    return im;
  })));
  imgs.forEach((im, i) => shots.push(makeShot(im, i)));
  resize();
  requestAnimationFrame(frame);

  const custom = await Music.hasCustomTrack();
  document.getElementById('musicnote').textContent = custom
    ? 'Musik: audio/music.mp3'
    : 'Musik: »Glade jul« (Franz Gruber, 1818) – syntetiseret kor';
  startBtn.textContent = 'Tænd lysene';
  startBtn.disabled = false;
})().catch((e) => { startBtn.textContent = e.message; });

startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  try { await music.start(); } catch (e) { console.warn('Ingen lyd:', e); }
  // ?t=<seconds> starts part-way through (handy for jumping to the illumination)
  const skip = Number(new URLSearchParams(location.search).get('t')) || 0;
  startedAt = performance.now() / 1000 - skip;
  document.getElementById('intro').classList.add('gone');
  document.getElementById('caption').classList.add('on');
  document.getElementById('mute').classList.add('on');
});
document.getElementById('mute').addEventListener('click', (e) => {
  e.currentTarget.textContent = music.toggle() ? '∅' : '♪';
});
