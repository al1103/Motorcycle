import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const $ = (selector) => document.querySelector(selector);
const canvas = $('#bike-canvas');
const stage = $('#viewer-stage');
const catalog = await fetch('./data/catalog.json').then((response) => {
  if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);
  return response.json();
});
const bikes = Object.fromEntries(catalog.motorcycles.map((record) => [record.id, { name: record.displayName || `${record.manufacturer} ${record.model}`, short: record.short || record.model, category: (record.tag || record.category || '').toUpperCase(), cc: record.cc || record.specifications?.displacement || '', mark: record.mark || record.manufacturer?.slice(0, 1) || 'M', color: record.color || '#d6d7d8', accent: record.accent || '#d7482e', style: record.style || 'naked' }]));
const products = {
  paint: [
    { id: 'paint-stock', brand: 'VISUAL PREVIEW ONLY', name: 'Factory silver', price: null, glyph: '●', color: '#c7c9ca', type: 'paint', value: '#c7c9ca', finish: 'Gloss' },
    { id: 'paint-orange', brand: 'VISUAL PREVIEW ONLY', name: 'Voltage orange', price: null, glyph: '●', color: '#f05b36', type: 'paint', value: '#f05b36', finish: 'Metallic' },
    { id: 'paint-onyx', brand: 'VISUAL PREVIEW ONLY', name: 'Onyx black', price: null, glyph: '●', color: '#292b2e', type: 'paint', value: '#292b2e', finish: 'Matte' },
    { id: 'paint-red', brand: 'VISUAL PREVIEW ONLY', name: 'Track red', price: null, glyph: '●', color: '#b9272d', type: 'paint', value: '#b9272d', finish: 'Gloss' },
  ],
  wheels: [
    { id: 'wheel-stock', brand: 'VISUAL PREVIEW ONLY', name: 'OEM cast alloy', price: null, glyph: '◎', type: 'wheel', value: 'stock' },
    { id: 'wheel-forged', brand: 'VISUAL PREVIEW ONLY', name: 'Forged 5-spoke set', price: null, glyph: '◎', type: 'wheel', value: 'forged' },
    { id: 'wheel-cnc', brand: 'VISUAL PREVIEW ONLY', name: 'CNC split-spoke set', price: null, glyph: '◉', type: 'wheel', value: 'cnc' },
  ],
  exhaust: [
    { id: 'exhaust-stock', brand: 'VISUAL PREVIEW ONLY', name: 'OEM exhaust', price: null, glyph: '≋', type: 'exhaust', value: 'stock' },
    { id: 'exhaust-titanium', brand: 'VISUAL PREVIEW ONLY', name: 'Titanium shorty', price: null, glyph: '≋', type: 'exhaust', value: 'titanium' },
    { id: 'exhaust-carbon', brand: 'VISUAL PREVIEW ONLY', name: 'Carbon slip-on', price: null, glyph: '≋', type: 'exhaust', value: 'carbon' },
  ],
  suspension: [], brakes: [],
  accessories: [
    { id: 'accessory-none', brand: 'VISUAL PREVIEW ONLY', name: 'No frame protection', price: null, glyph: '⌁', type: 'accessories', value: false },
    { id: 'accessory-guards', brand: 'VISUAL PREVIEW ONLY', name: 'Frame slider kit', price: null, glyph: '⌁', type: 'accessories', value: true },
  ],
};
const labels = { paint: 'Paint & finish', wheels: 'Wheels & tires', exhaust: 'Exhaust system', suspension: 'Suspension', brakes: 'Brakes', accessories: 'Accessories' };
const initialAssetBike = catalog.motorcycles.find((record) => record.asset);
let state = { bike: catalog.motorcycles[0]?.id || initialAssetBike?.id || 'mt15', paint: '#c7c9ca', finish: 'Gloss', wheel: 'stock', exhaust: 'stock', accessories: false };
let history = [], future = [], activeCategory = 'paint', toastTimer;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#1c1d20');
const camera = new THREE.PerspectiveCamera(35, 1, .1, 100);
let azimuth = 0.55, polar = 1.26, distance = 4.35, autoRotate = false, dragging = false, lastPointer = { x: 0, y: 0 };
camera.position.set(5.8, 3.1, 5.3);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.13;
const ktx2Loader = new KTX2Loader().setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/libs/basis/').detectSupport(renderer);

scene.add(new THREE.HemisphereLight(0xdde4ee, 0x292724, 2.15));
const keyLight = new THREE.DirectionalLight(0xffe4ce, 3.6);
keyLight.position.set(3.5, 7, 5); keyLight.castShadow = true; keyLight.shadow.mapSize.set(1024, 1024); keyLight.shadow.camera.left = -5; keyLight.shadow.camera.right = 5; keyLight.shadow.camera.top = 5; keyLight.shadow.camera.bottom = -5; scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0xb6c8ff, 2.2); rimLight.position.set(-4, 3, -5); scene.add(rimLight);
const fillLight = new THREE.PointLight(0xff693a, 30, 12); fillLight.position.set(1.3, 2.3, 3.5); scene.add(fillLight);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#222326', roughness: .82, metalness: .08 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -.04; floor.receiveShadow = true; scene.add(floor);
const grid = new THREE.GridHelper(30, 60, '#38393b', '#292a2c'); grid.position.y = -.035; grid.material.transparent = true; grid.material.opacity = .28; scene.add(grid);

let bikeGroup;
let importedModel;
const catalogModels = new Map();
const catalogModelLoading = new Set();
let useImportedModel = false;
let photoFrames = [];
let photoIndex = 0;
let photoMode = false;
let photoDragRemainder = 0;
let photoPointerX = null;
let importedObjectUrls = [];
let viewGenerationTimer;
let viewGenerationId = 0;
const generatedBikeViews = new Map();
const aiBikeViews = new Map();
let activeImageView = 'front-left';
let aiGenerating = false;
let puterLoaderPromise;
const imageViewAngles = {
  'front-left': { label: 'Trước ¾', azimuth: 1.0, polar: 1.18 },
  left: { label: 'Trái', azimuth: .05, polar: 1.38 },
  rear: { label: 'Sau', azimuth: -1.45, polar: 1.2 },
  right: { label: 'Phải', azimuth: Math.PI - .05, polar: 1.38 },
  top: { label: 'Trên', azimuth: .85, polar: .28 },
};
const gltfLoader = new GLTFLoader();
gltfLoader.setKTX2Loader(ktx2Loader);
gltfLoader.setMeshoptDecoder(MeshoptDecoder);
const material = (color, roughness = .42, metalness = .25) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const darkMetal = material('#27292b', .52, .72), rubber = material('#151618', .83, .03), metal = material('#9b9ea0', .28, .85), silver = material('#d2d4d5', .27, .8), glass = new THREE.MeshStandardMaterial({ color: '#8ca5ad', roughness: .14, metalness: .2, transparent: true, opacity: .55 });
function addMesh(parent, geometry, mat, position, scale, name) {
  const mesh = new THREE.Mesh(geometry, mat); mesh.position.set(...position); if (scale) mesh.scale.set(...scale); mesh.castShadow = true; mesh.receiveShadow = true; if (name) mesh.name = name; parent.add(mesh); return mesh;
}
function ball(parent, position, scale, mat, name) { return addMesh(parent, new THREE.SphereGeometry(1, 24, 18), mat, position, scale, name); }
function tubeBetween(parent, a, b, radius, mat, name, segments = 12) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start);
  const mesh = addMesh(parent, new THREE.CylinderGeometry(radius, radius, delta.length(), segments), mat, start.clone().add(end).multiplyScalar(.5).toArray(), null, name);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); return mesh;
}
function extrudedPanel(parent, points, depth, mat, z, name) {
  const shape = new THREE.Shape(); shape.moveTo(points[0][0], points[0][1]);
  for (const point of points.slice(1)) shape.lineTo(point[0], point[1]);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 2, bevelSize: .025, bevelThickness: .018, curveSegments: 8 });
  const panel = new THREE.Mesh(geometry, mat); panel.position.z = z; panel.castShadow = true; panel.receiveShadow = true; panel.name = name; parent.add(panel); return panel;
}
function wheelAssembly(parent, x, style, rear = false) {
  const holder = new THREE.Group(); holder.position.set(x, .52, 0); parent.add(holder); holder.name = rear ? 'RearWheel' : 'FrontWheel';
  addMesh(holder, new THREE.TorusGeometry(.36, .105, 16, 48), rubber, [0, 0, 0], null, 'Tire');
  const rimColor = style === 'cnc' ? '#f3a94e' : style === 'forged' ? '#aeb4ba' : '#b9bbbc';
  addMesh(holder, new THREE.TorusGeometry(.255, .026, 8, 40), material(rimColor, .28, .83), [0, 0, .015], null, 'Rim');
  addMesh(holder, new THREE.TorusGeometry(.19, .012, 6, 36), darkMetal, [0, 0, .018], null, 'Inner rim');
  addMesh(holder, new THREE.CylinderGeometry(.083, .083, .16, 24), metal, [0, 0, 0], null, 'Hub').rotation.x = Math.PI / 2;
  const spokes = style === 'stock' ? 10 : style === 'forged' ? 5 : 10;
  for (let i = 0; i < spokes; i++) {
    const angle = i * Math.PI * 2 / spokes + (style === 'cnc' && i % 2 ? .09 : 0);
    const inner = .08, outer = style === 'forged' ? .25 : .24;
    tubeBetween(holder, [Math.cos(angle) * inner, Math.sin(angle) * inner, .025], [Math.cos(angle + (style === 'stock' ? 0 : .28)) * outer, Math.sin(angle + (style === 'stock' ? 0 : .28)) * outer, .025], style === 'stock' ? .007 : .014, style === 'cnc' ? material('#e0a24b', .3, .7) : metal, 'Spoke', 6);
  }
  addMesh(holder, new THREE.TorusGeometry(.29, .013, 6, 36), material('#818487', .3, .8), [0, 0, .067], null, 'Brake rotor');
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; ball(holder, [Math.cos(a) * .29, Math.sin(a) * .29, .068], [.012, .012, .008], darkMetal); }
  return holder;
}
function createBike() {
  if (bikeGroup) {
    scene.remove(bikeGroup);
    const sharedMaterials = new Set([darkMetal, rubber, metal, silver, glass]);
    bikeGroup.traverse((object) => {
      if (!object.isMesh) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((partMaterial) => { if (!sharedMaterials.has(partMaterial)) partMaterial.dispose(); });
    });
  }
  const bike = bikes[state.bike], group = new THREE.Group(); bikeGroup = group; group.position.y = 0; scene.add(group);
  for (const model of catalogModels.values()) model.visible = false;
  const bikeRecord = catalog.motorcycles.find((record) => record.id === state.bike);
  if (bikeRecord?.asset) {
    group.visible = false;
    if (importedModel) importedModel.visible = false;
    const model = catalogModels.get(bikeRecord.id);
    if (model) model.visible = !photoMode;
    else loadCatalogModel(bikeRecord);
    updateUI();
    return;
  }
  const paintMat = material(state.paint, state.finish === 'Matte' ? .72 : .25, state.finish === 'Metallic' ? .78 : .28);
  const accentMat = material(bike.accent, .3, .28), bodyMat = state.bike === 'cbr150' || state.bike === 'ninja400' ? paintMat : paintMat;
  // Frame and powertrain
  tubeBetween(group, [-.85, .88, 0], [.43, .98, 0], .045, darkMetal, 'Main frame');
  tubeBetween(group, [-.83, .9, 0], [-.26, .43, 0], .04, darkMetal, 'Lower frame');
  tubeBetween(group, [-.26, .43, 0], [.4, .96, 0], .04, darkMetal, 'Frame brace');
  tubeBetween(group, [-.85, .91, 0], [-1.2, .67, 0], .045, darkMetal, 'Subframe');
  const engine = addMesh(group, new THREE.BoxGeometry(.76, .58, .56), material('#55595b', .52, .76), [-.1, .68, 0], null, 'Engine'); engine.rotation.z = -.06;
  ball(group, [-.13, .67, .29], [.25, .21, .04], darkMetal, 'Engine cover');
  ball(group, [-.13, .67, -.29], [.25, .21, .04], darkMetal, 'Engine cover');
  for (let i = 0; i < 5; i++) {
    const y = .52 + i * .065;
    tubeBetween(group, [-.36, y, .305], [.08, y, .305], .012, metal, 'Engine cooling fin', 8);
    tubeBetween(group, [-.36, y, -.305], [.08, y, -.305], .012, metal, 'Engine cooling fin', 8);
  }
  tubeBetween(group, [-.9, .76, .28], [-.2, .55, .28], .019, metal, 'Swingarm');
  tubeBetween(group, [-.9, .76, -.28], [-.2, .55, -.28], .019, metal, 'Swingarm');
  wheelAssembly(group, -1.17, state.wheel, true);
  const frontWheel = wheelAssembly(group, 1.19, state.wheel, false);
  // Rear shock, forks, handlebars
  tubeBetween(group, [-.77, .77, .12], [-.42, 1.22, .12], .032, material('#df4435', .35, .45), 'RearShock');
  for (const z of [-.17, .17]) tubeBetween(group, [1.16, .53, z], [.77, 1.72, z], .045, material('#c3c6c8', .28, .8), 'FrontFork');
  tubeBetween(group, [.6, 1.7, -.29], [.6, 1.7, .29], .045, darkMetal, 'Handlebar');
  for (const z of [-.31, .31]) { ball(group, [.58, 1.71, z], [.13, .045, .045], rubber, 'Grip'); tubeBetween(group, [.64, 1.7, z * 1.18], [.74, 1.7, z * 1.48], .014, metal, 'Mirror stem'); ball(group, [.75, 1.72, z * 1.48], [.1, .055, .055], darkMetal, 'Mirror'); }
  // Seat and tail
  const seat = ball(group, [-.67, 1.19, 0], [.42, .085, .25], rubber, 'Seat'); seat.rotation.z = -.05;
  extrudedPanel(group, [[-1.46, 1.16], [-1.36, 1.34], [-1.05, 1.39], [-.88, 1.29], [-.98, 1.18]], .42, paintMat, -.21, 'Tail section');
  // Fuel tank and tank cap
  extrudedPanel(group, [[-.48, 1.31], [-.38, 1.52], [-.3, 1.62], [-.02, 1.69], [.23, 1.63], [.48, 1.47], [.33, 1.35], [.02, 1.29]], .48, bodyMat, -.24, 'FuelTank');
  addMesh(group, new THREE.CylinderGeometry(.052, .052, .012, 24), metal, [.1, 1.7, 0], null, 'Tank cap').rotation.x = Math.PI / 2;
  // Front cowl, headlamp and windscreen
  const fairingFront = state.bike === 'mt15' ? [[.55, 1.32], [.63, 1.63], [.84, 1.68], [1.02, 1.51], [.95, 1.28], [.72, 1.2]] : [[.48, 1.27], [.55, 1.62], [.82, 1.72], [1.08, 1.55], [1.02, 1.26], [.79, 1.17]];
  extrudedPanel(group, fairingFront, .38, bodyMat, -.19, 'FrontFairing');
  ball(group, [.98, 1.47, .01], [.06, .12, .2], material('#e5e3d8', .2, .32), 'Headlight');
  extrudedPanel(group, [[.64, 1.64], [.69, 1.83], [.86, 1.91], [.99, 1.78], [.91, 1.66]], .025, glass, -.0125, 'Windscreen');
  // Rear fender, front fender and fairings
  const rearFender = ball(group, [-1.14, .96, 0], [.34, .065, .17], bodyMat, 'RearFender'); rearFender.rotation.z = -.12;
  const frontFender = ball(group, [1.2, .96, 0], [.34, .055, .17], bodyMat, 'FrontFender'); frontFender.rotation.z = .03;
  for (const z of [-.22, .22]) {
    const side = [[-.59, 1.09], [-.45, 1.33], [-.16, 1.4], [.14, 1.3], [.31, 1.08], [.12, .92], [-.33, .95]];
    extrudedPanel(group, side, .09, bodyMat, z > 0 ? .22 : -.31, 'SideFairing');
    if (state.bike !== 'mt15') extrudedPanel(group, [[-.35, .91], [-.09, 1.03], [.37, 1.03], [.43, .82], [.1, .72], [-.23, .77]], .055, accentMat, z > 0 ? .28 : -.335, 'LowerFairing');
  }
  // Visible tank graphics are independent surfaces on either side.
  extrudedPanel(group, [[-.3, 1.48], [-.22, 1.54], [.23, 1.55], [.32, 1.49], [.18, 1.45], [-.2, 1.44]], .008, accentMat, .246, 'Tank graphic');
  extrudedPanel(group, [[-.3, 1.48], [-.22, 1.54], [.23, 1.55], [.32, 1.49], [.18, 1.45], [-.2, 1.44]], .008, accentMat, -.254, 'Tank graphic');
  // Replaceable exhaust assembly: real meshes, not a screen overlay.
  tubeBetween(group, [-.12, .51, .27], [.37, .45, .28], .055, material('#777c7e', .3, .8), 'Exhaust header');
  tubeBetween(group, [.37, .45, .28], [.72, .51, .27], .045, material('#777c7e', .3, .8), 'Exhaust pipe');
  const exhaustMat = state.exhaust === 'carbon' ? material('#282a2c', .29, .45) : state.exhaust === 'titanium' ? material('#bbb8aa', .22, .83) : material('#484b4d', .32, .76);
  const can = addMesh(group, new THREE.CylinderGeometry(state.exhaust === 'stock' ? .09 : .075, .105, state.exhaust === 'stock' ? .57 : .48, 24), exhaustMat, [.68, .57, .3], null, 'Exhaust'); can.rotation.z = -1.05;
  const end = addMesh(group, new THREE.CylinderGeometry(.07, .055, .04, 24), darkMetal, [.82, .77, .3], null, 'Exhaust tip'); end.rotation.z = -1.05;
  // Lighting details and signals
  ball(group, [-1.4, 1.05, 0], [.04, .07, .13], material('#cf3b32', .18, .18), 'Taillight');
  for (const side of [-1, 1]) ball(group, [.92, 1.32, side * .33], [.075, .035, .045], material('#efa74d', .25, .1), 'TurnSignal');
  if (state.accessories) {
    for (const z of [-.34, .34]) { tubeBetween(group, [-.52, .53, z], [.15, .48, z], .022, material('#aeb2b4', .3, .8), 'Frame slider'); ball(group, [.17, .49, z], [.09, .08, .08], rubber, 'Slider puck'); }
  }
  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  group.visible = !useImportedModel && !photoMode;
  if (importedModel) importedModel.visible = useImportedModel && !photoMode;
  updateUI();
  scheduleGeneratedViews();
}

function cameraPosition() {
  const targetY = catalog.motorcycles.find((record) => record.id === state.bike)?.asset ? .64 : .92;
  camera.position.set(Math.sin(azimuth) * Math.sin(polar) * distance, Math.cos(polar) * distance + targetY, Math.cos(azimuth) * Math.sin(polar) * distance);
  camera.lookAt(0, targetY, 0);
}
function resize() {
  const rect = stage.getBoundingClientRect(); if (!rect.width || !rect.height) return;
  renderer.setSize(rect.width, rect.height, false); camera.aspect = rect.width / rect.height; camera.updateProjectionMatrix();
}
const resizeObserver = new ResizeObserver(() => { resize(); if (bikeGroup || catalogModels.has(state.bike)) scheduleGeneratedViews(); }); resizeObserver.observe(stage);
function animate() { requestAnimationFrame(animate); }
function showToast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2400); }
function savedBuilds() { try { return JSON.parse(localStorage.getItem('motoform-builds') || '[]').filter((build) => catalog.motorcycles.some((bike) => bike.id === build.state?.bike)); } catch { return []; } }
function saveBuilds(builds) { localStorage.setItem('motoform-builds', JSON.stringify(builds)); $('#garage-count').textContent = String(builds.length); }
function installedCount() { return 1 + (state.wheel !== 'stock' ? 1 : 0) + (state.exhaust !== 'stock' ? 1 : 0) + (state.accessories ? 1 : 0) + (state.paint !== '#c7c9ca' ? 1 : 0); }
function updateUI() {
  const bike = bikes[state.bike], record = catalog.motorcycles.find((item) => item.id === state.bike);
  const select = $('#bike-select');
  const expectedOptions = catalog.motorcycles.map((record) => `${record.id}:${record.selectorLabel || `${record.manufacturer} ${record.model}`}`).join('|');
  const currentOptions = [...select.options].map((option) => `${option.value}:${option.textContent}`).join('|');
  if (currentOptions !== expectedOptions) select.replaceChildren(...catalog.motorcycles.map((record) => new Option(record.selectorLabel || `${record.manufacturer} ${record.model}`, record.id)));
  select.value = state.bike; $('#bike-subtitle').textContent = record?.asset ? `${record.asset.license} · model tổng quát` : record?.source ? `${record.year} · ${record.variant} · ${record.source.name}` : 'Catalog · hình minh họa, dữ liệu đang cập nhật';
  $('#viewer-bike-name').textContent = bike.short; $('#stage-model').textContent = bike.name;
  $('.model-tag small').textContent = record?.asset ? `${bike.category} · ${record.asset.version}` : `${bike.category} · ${record?.year || ''}`;
  $('.tag-brand').textContent = bike.mark; $('.tag-brand').style.color = bike.accent;
  $('#build-items').textContent = state.paint !== '#c7c9ca' ? 'Đã đổi màu xem trước' : 'Chưa chọn phụ tùng';
  renderBuildSummary(); renderCategoryOptions(); renderProducts(); renderCatalogBikeList(); renderGearIdeas();
  $('#data-eyebrow').textContent = record?.source ? `SOURCE: ${record.source.name.toUpperCase()}` : `SOURCE: ${record?.asset?.creator || '3D MODEL'} · ${record?.asset?.license || ''}`;
  $('#data-status-title').textContent = record?.asset ? 'Ảnh render từ model tổng quát' : record?.source ? 'Thông tin từ nhà sản xuất' : 'Mục catalog · dữ liệu đang cập nhật';
  $('#data-status-note').textContent = record?.dataStatus || (record?.asset ? 'Không khẳng định phù hợp với xe cụ thể' : record?.source ? 'Thông số do nhà sản xuất công bố' : 'Ảnh minh họa · dữ liệu đang cập nhật');
  const sourceUrl = record?.source?.url || record?.asset?.source;
  $('#data-source-link').hidden = !sourceUrl;
  $('#data-source-link').href = sourceUrl || '#';
  $('#bike-facts').innerHTML = Object.entries(record?.specifications || {}).map(([key, value]) => `<div class="bike-fact"><span>${key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())}</span><strong>${value}</strong></div>`).join('');
  $('#generated-image-card').hidden = true;
  $('#options-heading').textContent = 'Thông tin xe';
  $('#model-source-label').hidden = photoMode;
  $('#model-source-label').textContent = record?.asset ? `Ảnh render từ model tổng quát · ${record.asset.license}` : record?.source ? 'Ảnh render minh họa · không phải ảnh OEM' : 'Ảnh minh họa · thông số xe chưa được xác minh';
  $('#generated-view-label').textContent = record?.asset ? `RENDER TỪ MODEL TỔNG QUÁT · ${record.asset.license}` : record?.source ? 'ẢNH RENDER MINH HỌA · KHÔNG PHẢI ẢNH OEM' : 'ẢNH MINH HỌA · DỮ LIỆU ĐANG CẬP NHẬT';
  const aiImage = aiBikeViews.get(state.bike)?.[activeImageView];
  $('#ai-view-status').textContent = aiImage ? `Đang xem ảnh AI · góc ${imageViewAngles[activeImageView].label}` : 'Ảnh AI chỉ tạo khi bạn bấm nút · phí/credit tùy tài khoản Puter và model';
  if (generatedBikeViews.get(state.bike)?.[activeImageView] || aiImage) displayBikeView(activeImageView);
  $('#undo-button').disabled = history.length === 0;
  $('#redo-button').disabled = future.length === 0;
}
function renderBuildSummary() {
  const record = catalog.motorcycles.find((bike) => bike.id === state.bike);
  const entries = [{ title: bikes[state.bike].name, detail: record?.asset ? 'Model tổng quát' : record?.source ? `${record.year} · ${record.category}` : 'Hình minh họa · thông tin đang cập nhật', icon: '◈' }];
  if (state.paint !== '#c7c9ca') entries.push({ title: 'Màu xem trước', detail: state.finish, icon: '◉' });
  $('#build-summary').innerHTML = entries.map((entry) => `<div class="build-item"><span class="build-item-icon">${entry.icon}</span><span><strong>${entry.title}</strong><small>${entry.detail}</small></span></div>`).join('');
}
function renderCatalogBikeList() {
  $('#catalog-bike-list').innerHTML = catalog.motorcycles.map((record) => `<button class="catalog-bike-option ${record.id === state.bike ? 'selected' : ''}" data-bike-id="${record.id}"><span class="catalog-bike-mark" style="--bike-accent:${record.accent || '#888'}">${record.mark || 'M'}</span><span class="catalog-bike-copy"><strong>${record.displayName || `${record.manufacturer} ${record.model}`}</strong><small>${record.asset ? 'Có model 3D tổng quát' : record.source ? `${record.year} · Có thông số nguồn` : 'Hình và thông số đang cập nhật'}</small></span><span class="catalog-bike-arrow">›</span></button>`).join('');
  $('#catalog-bike-list').querySelectorAll('[data-bike-id]').forEach((button) => button.addEventListener('click', () => selectBike(button.dataset.bikeId)));
}
function renderGearIdeas() {
  const record = catalog.motorcycles.find((bike) => bike.id === state.bike);
  const recommendations = record?.recommendations || [];
  $('#gear-list').innerHTML = recommendations.length ? recommendations.map((group) => `<article class="gear-group"><div class="gear-group-title"><span>${group.name}</span><span>IDEA</span></div><div class="gear-chips">${group.items.map((item) => `<span class="gear-chip">${item}</span>`).join('')}</div><p>${group.why}</p></article>`).join('') : '<div class="gear-group"><strong>Chưa có gợi ý</strong><p>Dữ liệu phụ kiện cho mẫu xe này đang được tổng hợp.</p></div>';
}
function selectBike(id) {
  if (!bikes[id] || state.bike === id) return;
  useImportedModel = false;
  if (importedModel) importedModel.visible = false;
  distance = catalog.motorcycles.find((record) => record.id === id)?.asset ? 4.35 : 7.1;
  activeImageView = 'front-left';
  $('#bike-view-image').hidden = true;
  changeState({ bike: id, paint: '#c7c9ca', finish: 'Gloss', wheel: 'stock', exhaust: 'stock', accessories: false }, false);
}
function scheduleGeneratedViews() {
  clearTimeout(viewGenerationTimer);
  viewGenerationTimer = setTimeout(generateBikeViews, 140);
}
function waitForRenderFrame() { return new Promise((resolve) => requestAnimationFrame(resolve)); }
async function generateBikeViews() {
  if (photoMode) return;
  const id = ++viewGenerationId;
  const bikeId = state.bike;
  const record = catalog.motorcycles.find((bike) => bike.id === bikeId);
  const model = catalogModels.get(bikeId);
  if (record?.asset && !model) return;
  const view = generatedBikeViews.get(bikeId);
  if (!view) $('#load-state').classList.remove('hidden');
  const previous = { azimuth, polar, distance };
  const shots = {};
  const renderDistance = record?.asset ? 4.35 : 7.1;
  try {
    for (const [key, angle] of Object.entries(imageViewAngles)) {
      if (id !== viewGenerationId || bikeId !== state.bike) return;
      azimuth = angle.azimuth; polar = angle.polar; distance = renderDistance;
      cameraPosition(); renderer.render(scene, camera);
      shots[key] = canvas.toDataURL('image/jpeg', .88);
      await waitForRenderFrame();
    }
    if (id !== viewGenerationId || bikeId !== state.bike) return;
    generatedBikeViews.set(bikeId, shots);
    displayBikeView(activeImageView);
  } catch (error) {
    console.error('Could not generate image views:', error);
    $('#load-state').innerHTML = '<span>Không thể tạo ảnh góc nhìn trên thiết bị này.</span>';
  } finally {
    azimuth = previous.azimuth; polar = previous.polar; distance = previous.distance;
    cameraPosition(); renderer.render(scene, camera);
    if (id === viewGenerationId) $('#load-state').classList.add('hidden');
  }
}
function displayBikeView(viewKey) {
  if (!imageViewAngles[viewKey]) return;
  activeImageView = viewKey;
  $('#image-view-caption').textContent = `${imageViewAngles[viewKey].label.toUpperCase()} · ẢNH RENDER`;
  document.querySelectorAll('[data-view]').forEach((button) => button.classList.toggle('selected', button.dataset.view === viewKey));
  const aiImage = aiBikeViews.get(state.bike)?.[viewKey];
  const views = generatedBikeViews.get(state.bike);
  const imageSrc = aiImage || views?.[viewKey];
  if (!imageSrc) return;
  $('#bike-view-image').src = imageSrc;
  $('#bike-view-image').alt = `${bikes[state.bike].name} — ${imageViewAngles[viewKey].label} image render`;
  $('#generated-view-label').textContent = aiImage ? 'ẢNH CONCEPT TẠO BẰNG AI · KHÔNG PHẢI ẢNH OEM' : catalog.motorcycles.find((record) => record.id === state.bike)?.asset ? `RENDER TỪ MODEL TỔNG QUÁT · ${catalog.motorcycles.find((record) => record.id === state.bike).asset.license}` : 'ẢNH RENDER MINH HỌA · KHÔNG PHẢI ẢNH OEM';
  $('#ai-view-status').textContent = aiImage ? `Đang xem ảnh AI · góc ${imageViewAngles[viewKey].label}` : 'Ảnh AI chỉ tạo khi bạn bấm nút · phí/credit tùy tài khoản Puter và model';
  $('#bike-view-image').hidden = false;
}

function loadPuter() {
  if (window.puter?.ai?.txt2img) return Promise.resolve(window.puter);
  if (puterLoaderPromise) return puterLoaderPromise;
  puterLoaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.puter.com/v2/';
    script.async = true;
    script.onload = () => window.puter?.ai?.txt2img ? resolve(window.puter) : reject(new Error('Puter image API was not available'));
    script.onerror = () => reject(new Error('Could not load the Puter image service'));
    document.head.appendChild(script);
  }).catch((error) => { puterLoaderPromise = null; throw error; });
  return puterLoaderPromise;
}
async function generateAiAngle() {
  if (aiGenerating) return;
  const record = catalog.motorcycles.find((item) => item.id === state.bike);
  const bikeId = state.bike;
  const viewKey = activeImageView;
  const angle = imageViewAngles[viewKey];
  const bikeName = bikes[state.bike].name;
  const reference = generatedBikeViews.get(bikeId)?.[viewKey];
  const prompt = `Create one premium motorcycle studio concept image showing a ${angle.label} view. Use the supplied reference image to keep the same general motorcycle silhouette and color; change the camera to the requested angle. Subject concept: ${bikeName}, category ${record?.category || 'motorcycle'}. Dark charcoal seamless studio background, softbox lighting, realistic materials, full vehicle centered and fully visible, no text, no watermark. It is a concept illustration, not an exact OEM photograph or a claim of manufacturer accuracy.`;
  if (!window.confirm('Tạo một ảnh AI cho góc đang chọn? Mỗi lần tạo ảnh có thể dùng credit hoặc phát sinh phí tùy model và tài khoản Puter. Prompt và ảnh xem trước sẽ được gửi đến Puter. Tiếp tục?')) return;
  aiGenerating = true;
  const button = $('#ai-generate-view');
  button.disabled = true;
  $('#ai-view-status').textContent = `Đang tạo ảnh AI · ${angle.label}…`;
  try {
    const puter = await loadPuter();
    const options = { width: 1024, height: 768 };
    if (reference) options.input_image = reference;
    const image = await puter.ai.txt2img({ prompt, ...options });
    if (!(image instanceof HTMLImageElement) || !image.src) throw new Error('The image service returned no image');
    await new Promise((resolve, reject) => { if (image.complete) image.naturalWidth ? resolve() : reject(new Error('Could not load the generated image')); else { image.onload = resolve; image.onerror = () => reject(new Error('Could not load the generated image')); } });
    let views = aiBikeViews.get(bikeId);
    if (!views) { views = {}; aiBikeViews.set(bikeId, views); }
    views[viewKey] = image.src;
    if (state.bike === bikeId && activeImageView === viewKey) displayBikeView(viewKey);
    showToast('Ảnh concept AI đã tạo xong');
  } catch (error) {
    console.error('AI image generation failed:', error);
    if (state.bike === bikeId && activeImageView === viewKey) $('#ai-view-status').textContent = 'Không tạo được ảnh AI. Ảnh render xem trước vẫn được giữ.';
    showToast(error.message || 'Dịch vụ tạo ảnh AI không khả dụng');
  } finally {
    aiGenerating = false;
    button.disabled = false;
  }
}

function renderCategoryOptions() {
  const target = $('#custom-options');
  if (catalog.motorcycles.find((record) => record.id === state.bike)?.asset) { target.innerHTML = '<div class="option-heading">Parts not mapped</div><div class="option-caption">This model has no verified attachment points or compatible parts in the catalog.</div>'; return; }
  if (activeCategory === 'paint') {
    target.innerHTML = `<div class="option-heading">Choose a color</div><div class="swatch-row">${products.paint.map((p) => `<button class="swatch ${state.paint === p.value ? 'selected' : ''}" style="--swatch:${p.value}" data-paint="${p.id}" title="${p.name}" aria-label="${p.name}" aria-pressed="${state.paint === p.value}"></button>`).join('')}<button class="swatch" style="--swatch:conic-gradient(#f66,#fc3,#6c9,#5cf,#96f,#f66)" id="custom-color" title="Choose custom color" aria-label="Choose custom color">+</button></div><div class="finish-row">${['Gloss', 'Matte', 'Metallic'].map((finish) => `<button class="finish-chip ${state.finish === finish ? 'selected' : ''}" data-finish="${finish}">${finish}</button>`).join('')}</div><div class="option-caption">Paint preview · changes body panels</div>`;
    target.querySelectorAll('[data-paint]').forEach((button) => button.addEventListener('click', () => { const part = products.paint.find((p) => p.id === button.dataset.paint); changeState({ paint: part.value, finish: part.finish }); }));
    target.querySelectorAll('[data-finish]').forEach((button) => button.addEventListener('click', () => changeState({ finish: button.dataset.finish })));
    $('#custom-color')?.addEventListener('click', () => { const picker = document.createElement('input'); picker.type = 'color'; picker.value = state.paint; picker.oninput = () => changeState({ paint: picker.value }); picker.click(); });
  } else target.innerHTML = `<div class="option-heading">Unavailable for this model</div><div class="option-caption">No verified component mapping or compatible product record is configured.</div>`;
}
function isInstalled(part) { if (part.type === 'paint') return state.paint === part.value; if (part.type === 'wheel') return state.wheel === part.value; if (part.type === 'exhaust') return state.exhaust === part.value; if (part.type === 'accessories') return state.accessories === part.value; return false; }
function renderProducts() {}

function changeState(changes, notify = true) {
  history.push(JSON.stringify(state)); if (history.length > 40) history.shift(); future = [];
  state = { ...state, ...changes }; createBike();
  if (notify) showToast('3D preview updated');
}
function restoreState(serialized) { state = JSON.parse(serialized); createBike(); }

function showPhotoFrame(index) {
  if (!photoFrames.length) return;
  photoIndex = (index + photoFrames.length) % photoFrames.length;
  const frame = photoFrames[photoIndex];
  $('#turntable-image').src = frame.url;
  $('#turntable-image').alt = `360° motorcycle photo ${photoIndex + 1} of ${photoFrames.length}: ${frame.file.name}`;
  $('#photo-index').textContent = `${String(photoIndex + 1).padStart(2, '0')} / ${String(photoFrames.length).padStart(2, '0')}`;
}
function setPhotoMode(enabled) {
  photoMode = enabled;
  stage.classList.toggle('photo-mode', enabled);
  if (!enabled) autoRotate = false;
  $('#rotate-toggle').classList.toggle('on', autoRotate);
  $('#camera-controls').hidden = enabled;
  $('#photo-controls').hidden = !enabled || photoFrames.length === 0;
  $('#photo-empty').hidden = !enabled || photoFrames.length > 0;
  $('#turntable-image').hidden = !enabled || photoFrames.length === 0;
  canvas.hidden = enabled;
  const currentRecord = catalog.motorcycles.find((record) => record.id === state.bike);
  $('#model-source-label').hidden = enabled;
  $('#model-source-label').textContent = currentRecord?.asset ? `Included ${currentRecord.asset.license} mesh · generic bike` : useImportedModel ? 'Imported mesh · 3D parts not mapped' : 'Illustrative geometry · not a Yamaha OEM asset';
  if (bikeGroup) bikeGroup.visible = !enabled && !useImportedModel;
  if (importedModel) importedModel.visible = !enabled && useImportedModel;
  for (const record of catalog.motorcycles) { const model = catalogModels.get(record.id); if (model) model.visible = !enabled && state.bike === record.id; }
  if (enabled && photoFrames.length) showPhotoFrame(photoIndex);
  resize();
}
function loadPhotoFiles(fileList) {
  const files = [...fileList].filter((file) => file.type.startsWith('image/')).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  if (!files.length) { showToast('Choose image files to create a 360° photo spin'); return; }
  if (files.length > 72) { showToast('Use up to 72 photos per turntable set'); return; }
  if (files.some((file) => file.size > 25 * 1024 * 1024)) { showToast('Each photo must be smaller than 25 MB'); return; }
  importedObjectUrls.forEach(URL.revokeObjectURL); importedObjectUrls = [];
  photoFrames = files.map((file) => { const url = URL.createObjectURL(file); importedObjectUrls.push(url); return { file, url }; });
  photoIndex = 0; setPhotoMode(true); showPhotoFrame(0);
  showToast(files.length < 12 ? `Loaded ${files.length} photos · add 12 or more for a smoother spin` : `${files.length} turntable photos ready`);
}
function cleanImportedModel(root) {
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true; object.receiveShadow = true;
    object.material = Array.isArray(object.material) ? object.material.map((mat) => mat.clone()) : object.material.clone();
  });
}
function loadModelFile(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!['glb', 'gltf'].includes(extension)) { showToast('Choose a GLB or GLTF model'); return; }
  $('#load-state').innerHTML = '<span class="loader"></span><span>Loading 3D model...</span>';
  $('#load-state').classList.remove('hidden');
  file.arrayBuffer().then((data) => gltfLoader.parse(data, '', (gltf) => {
    if (importedModel) {
      scene.remove(importedModel);
      importedModel.traverse((object) => { if (object.isMesh) { object.geometry.dispose(); (Array.isArray(object.material) ? object.material : [object.material]).forEach((mat) => mat.dispose()); } });
    }
    importedModel = gltf.scene;
    cleanImportedModel(importedModel);
    const bounds = new THREE.Box3().setFromObject(importedModel);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);
    if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
      $('#load-state').classList.add('hidden');
      showToast('This model has no visible 3D geometry');
      return;
    }
    importedModel.scale.setScalar(2.2 / maxDimension);
    importedModel.position.set(-center.x * importedModel.scale.x, -bounds.min.y * importedModel.scale.y, -center.z * importedModel.scale.z);
    scene.add(importedModel); useImportedModel = true; setPhotoMode(false); createBike();
    $('#load-state').classList.add('hidden'); $('#load-state').innerHTML = '<span class="loader"></span><span>Building your bike...</span>';
    showToast('Generated 3D model loaded');
  }, (error) => {
    console.error('Unable to load the selected 3D model:', error);
    $('#load-state').classList.add('hidden');
    showToast(extension === 'gltf' ? 'This GLTF may need external files; try a self-contained GLB' : 'Could not read this model. Check that it is a valid GLB.');
  })).catch((error) => { console.error('Unable to read the selected 3D model:', error); $('#load-state').classList.add('hidden'); showToast('Unable to read this 3D model'); });
}

function loadCatalogModel(record) {
  if (catalogModelLoading.has(record.id) || catalogModels.has(record.id)) return;
  catalogModelLoading.add(record.id);
  $('#load-state').innerHTML = '<span class="loader"></span><span>Đang tải model ảnh...</span>';
  $('#load-state').classList.remove('hidden');
  gltfLoader.load(`./${record.asset.file}`, (gltf) => {
    const model = gltf.scene;
    model.traverse((object) => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -bounds.min.y, -center.z);
    scene.add(model);
    model.visible = state.bike === record.id && !photoMode;
    catalogModels.set(record.id, model);
    catalogModelLoading.delete(record.id);
    $('#load-state').classList.add('hidden');
    $('#load-state').innerHTML = '<span class="loader"></span><span>Đang tạo ảnh góc nhìn...</span>';
    updateUI();
    scheduleGeneratedViews();
  }, undefined, (error) => {
    catalogModelLoading.delete(record.id);
    $('#load-state').classList.add('hidden');
    console.error('Unable to load the catalog 3D asset:', error);
    showToast('Unable to load the local dirt-bike model');
  });
}

$('#category-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-category]'); if (!button) return;
  activeCategory = button.dataset.category;
  document.querySelectorAll('.category').forEach((item) => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-selected', String(active)); });
  renderCategoryOptions(); renderProducts();
});
$('#bike-select').addEventListener('change', (event) => selectBike(event.target.value));
$('#change-bike').addEventListener('click', () => { const record = catalog.motorcycles.find((bike) => bike.id === state.bike); const source = record.source?.url || record.asset?.source; if (source) window.open(source, '_blank', 'noopener'); else showToast('Nguồn dữ liệu cho mẫu xe này đang được cập nhật'); });
$('#filter-button').addEventListener('click', () => showToast('Mẫu hiển thị chưa có thông tin fitment phụ tùng đã xác minh'));
$('#ai-generate-view').addEventListener('click', generateAiAngle);
$('#studio-select').addEventListener('click', () => { const bright = scene.background.getHexString() === '1c1d20'; scene.background.set(bright ? '#13171d' : '#1c1d20'); floor.material.color.set(bright ? '#1d2228' : '#222326'); generatedBikeViews.delete(state.bike); scheduleGeneratedViews(); });
$('#shadow-toggle').addEventListener('click', () => { renderer.shadowMap.enabled = !renderer.shadowMap.enabled; generatedBikeViews.delete(state.bike); scheduleGeneratedViews(); });
$('#fullscreen-toggle').addEventListener('click', () => { if (!document.fullscreenElement) stage.requestFullscreen?.(); else document.exitFullscreen?.(); });
$('#rotate-toggle').addEventListener('click', (event) => { autoRotate = !autoRotate; event.currentTarget.classList.toggle('on', autoRotate); });
$('#photo-mode').addEventListener('click', () => {
  if (photoMode) { setPhotoMode(false); return; }
  if (photoFrames.length) setPhotoMode(true);
  else $('#photo-input').click();
});
$('#photo-input').addEventListener('change', (event) => { if (event.target.files?.length) loadPhotoFiles(event.target.files); event.target.value = ''; });
$('#photo-empty-upload').addEventListener('click', () => $('#photo-input').click());
$('#photo-select').addEventListener('click', () => $('#photo-input').click());
$('#photo-prev').addEventListener('click', () => showPhotoFrame(photoIndex - 1));
$('#photo-next').addEventListener('click', () => showPhotoFrame(photoIndex + 1));
$('#model-upload').addEventListener('click', () => $('#model-input').click());
$('#model-input').addEventListener('change', (event) => { if (event.target.files?.[0]) loadModelFile(event.target.files[0]); event.target.value = ''; });
const modelInfoDialog = $('#model-info-dialog');
$('#photo-model-info').addEventListener('click', () => modelInfoDialog.showModal());
$('#model-info-close').addEventListener('click', () => modelInfoDialog.close());
$('#model-info-import').addEventListener('click', () => { modelInfoDialog.close(); $('#model-input').click(); });

$('#undo-button').addEventListener('click', () => { if (!history.length) return; future.push(JSON.stringify(state)); restoreState(history.pop()); });
$('#redo-button').addEventListener('click', () => { if (!future.length) return; history.push(JSON.stringify(state)); restoreState(future.pop()); });

document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => displayBikeView(button.dataset.view)));
$('#regenerate-views').addEventListener('click', () => { generatedBikeViews.delete(state.bike); $('#load-state').classList.remove('hidden'); scheduleGeneratedViews(); });
$('#reset-camera').addEventListener('click', () => { activeImageView = 'front-left'; if (generatedBikeViews.has(state.bike)) displayBikeView(activeImageView); else scheduleGeneratedViews(); });
$('#save-build').addEventListener('click', () => {
  const builds = savedBuilds(), name = `${bikes[state.bike].short} · ${new Date().toLocaleDateString()}`;
  builds.unshift({ id: crypto.randomUUID?.() || String(Date.now()), name, state: { ...state }, savedAt: new Date().toISOString() });
  saveBuilds(builds); showToast('Build saved to My garage');
});
const dialog = $('#garage-dialog');
function renderGarage() {
  const builds = savedBuilds(); $('#garage-count').textContent = String(builds.length);
  $('#garage-builds').innerHTML = builds.length ? builds.map((build) => `<div class="saved-build"><span class="saved-build-mark">◈</span><span class="saved-build-info"><strong>${build.name}</strong><small>${bikes[build.state.bike]?.name || build.state.bike}</small></span><button data-load-build="${build.id}">Load build</button></div>`).join('') : '<div class="garage-empty">Your garage is looking fresh.<br>Save a build from the studio to keep it here.</div>';
  $('#garage-builds').querySelectorAll('[data-load-build]').forEach((button) => button.addEventListener('click', () => { const build = builds.find((item) => item.id === button.dataset.loadBuild); if (build) { history.push(JSON.stringify(state)); future = []; restoreState(JSON.stringify(build.state)); dialog.close(); showToast('Build loaded'); } }));
}
$('#garage-open').addEventListener('click', () => { renderGarage(); dialog.showModal(); }); $('#garage-close').addEventListener('click', () => dialog.close());
$('#new-build').addEventListener('click', () => { dialog.close(); changeState({ bike: catalog.motorcycles[0].id, paint: '#c7c9ca', finish: 'Gloss', wheel: 'stock', exhaust: 'stock', accessories: false }); showToast('Fresh build started'); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && document.activeElement === canvas) document.activeElement.blur(); });
function showWebGLState() { $('#load-state').innerHTML = '<span style="font-size:23px;color:#ff7755">◇</span><span>3D preview is unavailable in this browser.</span><span style="font-size:9px">Enable WebGL to explore your motorcycle.</span>'; }
try { resize(); createBike(); renderer.render(scene, camera); } catch (error) { console.error('Unable to initialize the motorcycle preview:', error); showWebGLState(); }
saveBuilds(savedBuilds()); animate();
