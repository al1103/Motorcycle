const $ = (selector) => document.querySelector(selector);
const catalogResponse = await fetch('./data/catalog.json');
if (!catalogResponse.ok) throw new Error(`Motorcycle catalog failed: ${catalogResponse.status}`);
const catalog = await catalogResponse.json();
const motorcycles = catalog.motorcycles;
const angles = {
  'front-left': { label: 'Trước ¾', direction: 'front three-quarter' },
  left: { label: 'Trái', direction: 'left profile' },
  rear: { label: 'Sau', direction: 'rear three-quarter' },
  right: { label: 'Phải', direction: 'right profile' },
  top: { label: 'Trên', direction: 'slightly elevated top-down three-quarter' },
};
let selectedBikeId = motorcycles[0]?.id;
let selectedAngle = 'front-left';
let currentGeneration = 0;
let puterScriptPromise;
const generatedImages = new Map();
let toastTimer;

function currentBike() { return motorcycles.find((bike) => bike.id === selectedBikeId); }
function angleImages() {
  let images = generatedImages.get(selectedBikeId);
  if (!images) { images = {}; generatedImages.set(selectedBikeId, images); }
  return images;
}
function setStatus(message) { $('#ai-view-status').textContent = message; }
function showToast(message) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}
function renderCatalog() {
  $('#bike-select').replaceChildren(...motorcycles.map((bike) => new Option(bike.selectorLabel || `${bike.manufacturer} ${bike.model}`, bike.id)));
  $('#catalog-bike-list').innerHTML = motorcycles.map((bike) => `<button class="catalog-bike-option ${bike.id === selectedBikeId ? 'selected' : ''}" data-bike-id="${bike.id}"><span class="catalog-bike-mark" style="--bike-accent:${bike.accent || '#ff704b'}">${bike.mark || 'M'}</span><span class="catalog-bike-copy"><strong>${bike.displayName || `${bike.manufacturer} ${bike.model}`}</strong><small>${bike.year} · thông số nhà sản xuất</small></span><span class="catalog-bike-arrow">›</span></button>`).join('');
  $('#catalog-bike-list').querySelectorAll('[data-bike-id]').forEach((button) => button.addEventListener('click', () => selectBike(button.dataset.bikeId)));
  $('#bike-select').value = selectedBikeId;
}
function renderBike() {
  const bike = currentBike();
  if (!bike) return;
  $('#bike-select').value = bike.id;
  $('#bike-subtitle').textContent = `${bike.year} · ${bike.variant} · thông số có nguồn`;
  $('#viewer-bike-name').textContent = bike.short || bike.model;
  $('#stage-model').textContent = bike.displayName || `${bike.manufacturer} ${bike.model}`;
  $('#stage-meta').textContent = `${bike.category.toUpperCase()} · ${bike.year}`;
  $('.tag-brand').textContent = bike.mark || bike.manufacturer.slice(0, 1);
  $('.tag-brand').style.color = bike.accent || '#ff704b';
  $('#data-eyebrow').textContent = `NGUỒN: ${bike.source.name.toUpperCase()}`;
  $('#data-source-link').href = bike.source.url;
  $('#bike-facts').innerHTML = Object.entries(bike.specifications).map(([key, value]) => `<div class="bike-fact"><span>${key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase())}</span><strong>${value}</strong></div>`).join('');
  $('#gear-list').innerHTML = bike.recommendations.map((group) => `<article class="gear-group"><div class="gear-group-title"><span>${group.name}</span><span>GỢI Ý</span></div><div class="gear-chips">${group.items.map((item) => `<span class="gear-chip">${item}</span>`).join('')}</div><p>${group.why}</p></article>`).join('');
  document.querySelectorAll('[data-view]').forEach((button) => button.classList.toggle('selected', button.dataset.view === selectedAngle));
  $('#selected-angle-name').textContent = angles[selectedAngle].label;
  $('#generated-view-label').textContent = bike.generatedImageStatus;
  showSelectedImage();
  updateImageCount();
}
function showSelectedImage() {
  const imageUrl = angleImages()[selectedAngle];
  const image = $('#bike-view-image');
  const empty = $('#image-empty');
  const download = $('#download-view');
  if (imageUrl) {
    image.src = imageUrl;
    image.alt = `${currentBike().displayName} — ảnh concept AI góc ${angles[selectedAngle].label}`;
    image.hidden = false;
    empty.hidden = true;
    $('#generated-view-label').textContent = 'ẢNH AI CONCEPT · KHÔNG PHẢI ẢNH OEM';
    download.href = imageUrl;
    download.hidden = false;
    download.download = `${currentBike().id}-${selectedAngle}-ai-concept.png`;
    setStatus(`Ảnh AI · góc ${angles[selectedAngle].label} · chỉ lưu trong phiên này`);
  } else {
    image.removeAttribute('src');
    image.hidden = true;
    empty.hidden = false;
    $('#empty-title').textContent = `Chưa có ảnh góc ${angles[selectedAngle].label}`;
    $('#empty-copy').textContent = 'Tạo ảnh concept AI cho góc này. Cần đăng nhập Puter nếu dịch vụ yêu cầu.';
    $('#generated-view-label').textContent = 'CHƯA CÓ ẢNH AI';
    download.removeAttribute('href');
    download.hidden = true;
    setStatus('Chưa tạo ảnh · không hiển thị ảnh demo');
  }
}
function updateImageCount() {
  const count = Object.keys(angleImages()).length;
  $('#view-count').textContent = `${count} / ${Object.keys(angles).length} ảnh AI`;
}
function selectBike(id) {
  if (!motorcycles.some((bike) => bike.id === id)) return;
  currentGeneration++;
  selectedBikeId = id;
  renderCatalog();
  renderBike();
}
function selectAngle(id) {
  if (!angles[id]) return;
  selectedAngle = id;
  renderBike();
}
function loadPuter() {
  if (window.puter?.ai?.txt2img) return Promise.resolve(window.puter);
  if (puterScriptPromise) return puterScriptPromise;
  puterScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.puter.com/v2/';
    script.async = true;
    script.onload = () => window.puter?.ai?.txt2img ? resolve(window.puter) : reject(new Error('Puter image API is unavailable'));
    script.onerror = () => reject(new Error('Không tải được dịch vụ Puter'));
    document.head.appendChild(script);
  }).catch((error) => { puterScriptPromise = null; throw error; });
  return puterScriptPromise;
}
async function makeAiImage() {
  const bike = currentBike();
  if (!bike) return;
  const angle = angles[selectedAngle];
  const viewKey = selectedAngle;
  const bikeId = selectedBikeId;
  const generationId = ++currentGeneration;
  const prompt = `Create a realistic motorcycle product concept image. The motorcycle is inspired by the Yamaha MT-15 ${bike.year} ${bike.variant} naked street motorcycle. Camera view: ${angle.direction}. Respect the published model cues: compact naked street-bike proportions, upright wide handlebar, sharp compact headlamp, sculpted tank, exposed frame, two wheels, dark neutral metallic bodywork with subtle red accents. Full motorcycle visible, correct motorcycle anatomy, studio photograph lighting, neutral charcoal seamless studio background, premium but realistic paint and materials, clean commercial catalog composition. No text, no watermark, no extra wheels, no rider. This is an AI concept inspired by the model name, not an OEM reference photograph; do not invent a claim of exact factory accuracy.`;
  if (!window.confirm('Tạo ảnh concept AI thật cho Yamaha MT-15? Prompt sẽ gửi đến Puter. Có thể cần đăng nhập và dùng credit/chi phí tùy model, dịch vụ và tài khoản. Tiếp tục?')) return;
  const button = $('#generate-view');
  button.disabled = true;
  $('#empty-generate').disabled = true;
  $('#ai-image-loading').hidden = false;
  $('#image-empty').hidden = true;
  $('#bike-view-image').hidden = true;
  setStatus('Đang kết nối AI… Nếu được yêu cầu, đăng nhập Puter trong cửa sổ mở ra.');
  try {
    const puter = await loadPuter();
    if (generationId !== currentGeneration) return;
    setStatus('Đang tạo ảnh AI…');
    const image = await puter.ai.txt2img({ prompt, width: 1024, height: 768 });
    if (!(image instanceof HTMLImageElement) || !image.src) throw new Error('AI không trả về ảnh hợp lệ');
    await new Promise((resolve, reject) => {
      if (image.complete) image.naturalWidth ? resolve() : reject(new Error('Không tải được ảnh AI'));
      else { image.onload = resolve; image.onerror = () => reject(new Error('Không tải được ảnh AI')); }
    });
    if (generationId !== currentGeneration) return;
    angleImages()[viewKey] = image.src;
    renderBike();
    showToast('Ảnh AI đã tạo xong');
  } catch (error) {
    console.error('AI image generation failed:', error);
    if (generationId === currentGeneration) {
      $('#ai-image-loading').hidden = true;
      $('#image-empty').hidden = false;
      setStatus('Không tạo được ảnh. Hãy đăng nhập Puter hoặc thử lại. Không có ảnh demo thay thế.');
      showToast(error.message || 'Cần đăng nhập Puter để tạo ảnh');
    }
  } finally {
    button.disabled = false;
    $('#empty-generate').disabled = false;
  }
}

$('#bike-select').addEventListener('change', (event) => selectBike(event.target.value));
document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => selectAngle(button.dataset.view)));
$('#generate-view').addEventListener('click', makeAiImage);
$('#empty-generate').addEventListener('click', makeAiImage);
$('#fullscreen-toggle').addEventListener('click', () => { if (!document.fullscreenElement) $('#viewer-stage').requestFullscreen?.(); else document.exitFullscreen?.(); });
$('#save-view').addEventListener('click', () => $('#download-view').click());
$('#change-bike').addEventListener('click', () => window.open(currentBike()?.source?.url, '_blank', 'noopener'));
$('#empty-generate').textContent = 'Tạo ảnh AI góc này';
renderCatalog();
renderBike();
