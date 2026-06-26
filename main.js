import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const view = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
view.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e0f12);
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
camera.position.set(220, 160, 260);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(1, 1.4, 0.8); scene.add(key);
const rim = new THREE.DirectionalLight(0x66aaff, 0.5); rim.position.set(-1, -0.5, -1); scene.add(rim);

const material = new THREE.MeshStandardMaterial({ color: 0x9fe8c8, metalness: 0.2, roughness: 0.5 });
let mesh = null;
let baseGeometry = null;
let spin = false;

const UP = new THREE.Vector3(0, 1, 0);

function edgesToGeometry(edges, radius) {
  const geos = [];
  for (let i = 0; i < edges.length; i++) {
    const a = edges[i][0], b = edges[i][1];
    const v1 = new THREE.Vector3(a[0], a[1], a[2]);
    const v2 = new THREE.Vector3(b[0], b[1], b[2]);
    const dir = new THREE.Vector3().subVectors(v2, v1);
    const len = dir.length();
    if (len < 1e-6) continue;
    const g = new THREE.CylinderGeometry(radius, radius, len, 6, 1);
    const quat = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize());
    const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
    g.applyMatrix4(new THREE.Matrix4().compose(mid, quat, new THREE.Vector3(1, 1, 1)));
    geos.push(g);
  }
  return geos.length ? mergeGeometries(geos, false) : new THREE.BufferGeometry();
}

function lattice3d(n, s) {
  const e = [], o = -(n - 1) * s / 2;
  const P = (i, j, k) => [o + i * s, o + j * s, o + k * s];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) {
    if (i < n - 1) e.push([P(i, j, k), P(i + 1, j, k)]);
    if (j < n - 1) e.push([P(i, j, k), P(i, j + 1, k)]);
    if (k < n - 1) e.push([P(i, j, k), P(i, j, k + 1)]);
  }
  return e;
}
function plane2d(n, s) {
  const e = [], o = -(n - 1) * s / 2;
  const P = (i, j) => [o + i * s, o + j * s, 0];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (i < n - 1) e.push([P(i, j), P(i + 1, j)]);
    if (j < n - 1) e.push([P(i, j), P(i, j + 1)]);
  }
  return e;
}
function curved(n, s) {
  const e = [], R = (n - 1) * s / Math.PI, h = (n - 1) * s, o = -h / 2;
  const P = (i, j) => { const t = (i / (n - 1)) * Math.PI; return [R * Math.cos(t), o + j * s, R * Math.sin(t)]; };
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (i < n - 1) e.push([P(i, j), P(i + 1, j)]);
    if (j < n - 1) e.push([P(i, j), P(i, j + 1)]);
  }
  return e;
}
function radial(n, s) {
  const e = [], rings = n, spokes = n * 2;
  for (let r = 1; r <= rings; r++) {
    const rad = r * s;
    for (let a = 0; a < spokes; a++) {
      const t0 = (a / spokes) * Math.PI * 2, t1 = ((a + 1) / spokes) * Math.PI * 2;
      e.push([[rad * Math.cos(t0), rad * Math.sin(t0), 0], [rad * Math.cos(t1), rad * Math.sin(t1), 0]]);
      if (r < rings) e.push([[rad * Math.cos(t0), rad * Math.sin(t0), 0], [(rad + s) * Math.cos(t0), (rad + s) * Math.sin(t0), 0]]);
    }
  }
  return e;
}
const TEMPLATES = { lattice3d: lattice3d, plane2d: plane2d, curved: curved, radial: radial };

function transformEdges(edges, rotDeg, off, s) {
  const m = new THREE.Matrix4().makeRotationZ(rotDeg * Math.PI / 180);
  const t = new THREE.Vector3(off * s, off * s, off * s * 0.5);
  return edges.map(function (seg) {
    return seg.map(function (p) {
      const v = new THREE.Vector3(p[0], p[1], p[2]).applyMatrix4(m).add(t);
      return [v.x, v.y, v.z];
    });
  });
}

function ui(id) { return document.getElementById(id); }
function rebuild() {
  const name = ui('template').value;
  const n = +ui('grid').value, radius = +ui('radius').value;
  const rot = +ui('rot').value, off = +ui('off').value;
  ui('gridVal').textContent = n; ui('radVal').textContent = radius.toFixed(1);
  ui('rotVal').textContent = rot.toFixed(1); ui('offVal').textContent = off.toFixed(2);
  ui('sizeVal').textContent = ui('size').value;

  const spacing = 18;
  const layerA = TEMPLATES[name](n, spacing);
  const layerB = transformEdges(TEMPLATES[name](n, spacing), rot, off, spacing);
  const all = layerA.concat(layerB);

  if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); }
  baseGeometry = edgesToGeometry(all, radius);
  baseGeometry.computeVertexNormals();
  mesh = new THREE.Mesh(baseGeometry, material);
  scene.add(mesh);
  ui('meta').textContent = 'エッジ数: ' + all.length + ' / 頂点: ' + (baseGeometry.attributes.position ? baseGeometry.attributes.position.count : 0);
}

function exportSTL() {
  if (!baseGeometry) return;
  const cm = +ui('size').value, targetMm = cm * 10;
  const g = baseGeometry.clone();
  g.computeBoundingBox();
  const sz = new THREE.Vector3(); g.boundingBox.getSize(sz);
  const maxDim = Math.max(sz.x, sz.y, sz.z) || 1;
  g.scale(targetMm / maxDim, targetMm / maxDim, targetMm / maxDim);
  const exporter = new STLExporter();
  const stl = exporter.parse(new THREE.Mesh(g, material), { binary: false });
  const blob = new Blob([stl], { type: 'model/stl' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'moire-' + ui('template').value + '-' + cm + 'cm.stl';
  a.click();
  URL.revokeObjectURL(a.href);
}

['template', 'grid', 'radius', 'rot', 'off'].forEach(function (id) {
  ui(id).addEventListener('input', rebuild);
});
ui('size').addEventListener('input', function () { ui('sizeVal').textContent = ui('size').value; });
ui('export').addEventListener('click', exportSTL);
ui('spin').addEventListener('click', function () { spin = !spin; });
ui('reset').addEventListener('click', function () { camera.position.set(220, 160, 260); controls.target.set(0, 0, 0); });

function resize() {
  const w = view.clientWidth, h = view.clientHeight;
  renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
function loop() {
  requestAnimationFrame(loop);
  if (spin && mesh) mesh.rotation.y += 0.003;
  controls.update();
  renderer.render(scene, camera);
}
resize(); rebuild(); loop();
