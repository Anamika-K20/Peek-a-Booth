const video = document.getElementById('video');
const overlayCanvas = document.getElementById('overlay-canvas');
const stickerLayer = document.getElementById('sticker-layer');
const countdownEl = document.getElementById('countdown');
const flashEl = document.getElementById('flash');
const captureBtn = document.getElementById('capture-btn');
const resetBtn = document.getElementById('reset-btn');
const downloadBtn = document.getElementById('download-btn');
const shotCountEl = document.getElementById('shot-count');
const totalShotsEl = document.getElementById('total-shots');
const cameraWrapper = document.getElementById('camera-wrapper');
const stripEl = document.getElementById('strip');

// --- State ---
let currentFilter = 'none';
let currentBg = 'none';
let shotCount = 0;
let photos = [];
let isCounting = false;

let stripMode = '4-classic'; // '4-classic' | '4-grid' | '6-classic' | '6-grid'
let totalShots = 4;
let stripLayout = 'classic'; // 'classic' | 'grid'

let stripBg = '#fff5f8';
let stripBorder = '#ffb3c6';
let stripLabelText = '✨ Peek-a-Booth ✨';
let stripLabelColor = '#ff85a1';

// --- Camera ---
async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
      overlayCanvas.width = video.videoWidth;
      overlayCanvas.height = video.videoHeight;
    });
  } catch (e) {
    alert('Could not access camera. Please allow camera permissions and reload.');
  }
}

// --- Filters ---
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    video.style.filter = currentFilter === 'none' ? '' : currentFilter;
  });
});

// --- Backgrounds ---
document.querySelectorAll('.bg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentBg = btn.dataset.bg;
  });
});

// --- Stickers ---
document.querySelectorAll('.sticker-btn').forEach(btn => {
  btn.addEventListener('click', () => placeSticker(btn.dataset.sticker));
});

document.getElementById('clear-stickers').addEventListener('click', () => {
  stickerLayer.innerHTML = '';
});

function placeSticker(emoji) {
  const el = document.createElement('span');
  el.className = 'sticker-on-cam';
  el.textContent = emoji;
  const maxX = cameraWrapper.offsetWidth - 50;
  const maxY = cameraWrapper.offsetHeight - 50;
  el.style.left = (20 + Math.random() * (maxX - 20)) + 'px';
  el.style.top = (20 + Math.random() * (maxY - 20)) + 'px';
  makeDraggable(el);
  stickerLayer.appendChild(el);
}

function makeDraggable(el) {
  let startX, startY, origLeft, origTop;
  el.addEventListener('mousedown', e => {
    e.preventDefault();
    startX = e.clientX; startY = e.clientY;
    origLeft = parseInt(el.style.left); origTop = parseInt(el.style.top);
    const onMove = e => {
      el.style.left = (origLeft + e.clientX - startX) + 'px';
      el.style.top = (origTop + e.clientY - startY) + 'px';
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
  el.addEventListener('touchstart', e => {
    const t = e.touches[0];
    startX = t.clientX; startY = t.clientY;
    origLeft = parseInt(el.style.left); origTop = parseInt(el.style.top);
    const onMove = e => {
      const t = e.touches[0];
      el.style.left = (origLeft + t.clientX - startX) + 'px';
      el.style.top = (origTop + t.clientY - startY) + 'px';
    };
    const onEnd = () => {
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
    el.addEventListener('touchmove', onMove);
    el.addEventListener('touchend', onEnd);
  });
}

// --- Strip Mode ---
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (shotCount > 0) {
      if (!confirm('Changing strip mode will reset your current photos. Continue?')) return;
      doReset();
    }
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    stripMode = btn.dataset.mode;
    totalShots = parseInt(btn.dataset.count);
    stripLayout = stripMode.includes('grid') ? 'grid' : 'classic';
    totalShotsEl.textContent = totalShots;
    rebuildStrip();
  });
});

function rebuildStrip() {
  stripEl.innerHTML = '';
  // Apply layout class
  stripEl.classList.toggle('layout-grid', stripLayout === 'grid');
  // Apply design
  applyStripDesign();
  // Build slots
  for (let i = 0; i < totalShots; i++) {
    const slot = document.createElement('div');
    slot.className = 'strip-slot empty';
    slot.id = `slot-${i}`;
    stripEl.appendChild(slot);
  }
  // Label bar
  const label = document.createElement('div');
  label.className = 'strip-label-bar';
  label.id = 'strip-label-bar';
  label.textContent = stripLabelText;
  label.style.color = stripLabelColor;
  stripEl.appendChild(label);
  // Re-fill existing photos
  photos.forEach((url, i) => addToStrip(url, i));
}

function applyStripDesign() {
  stripEl.style.background = stripBg;
  stripEl.style.borderColor = stripBorder;
  const labelBar = document.getElementById('strip-label-bar');
  if (labelBar) {
    labelBar.textContent = stripLabelText;
    labelBar.style.color = stripLabelColor;
  }
}

// --- Strip Design Controls ---
function setupSwatches(groupId, customInputId, onChange) {
  const group = document.getElementById(groupId);
  group.querySelectorAll('.swatch').forEach(s => {
    s.addEventListener('click', () => {
      group.querySelectorAll('.swatch').forEach(x => x.classList.remove('active'));
      s.classList.add('active');
      onChange(s.dataset.val);
    });
  });
  const custom = document.getElementById(customInputId);
  custom.addEventListener('input', () => {
    group.querySelectorAll('.swatch').forEach(x => x.classList.remove('active'));
    onChange(custom.value);
  });
}

setupSwatches('strip-bg-swatches', 'strip-bg-custom', val => {
  stripBg = val;
  applyStripDesign();
});

setupSwatches('strip-border-swatches', 'strip-border-custom', val => {
  stripBorder = val;
  applyStripDesign();
});

setupSwatches('strip-label-swatches', 'strip-label-custom', val => {
  stripLabelColor = val;
  applyStripDesign();
});

document.getElementById('strip-label').addEventListener('input', e => {
  stripLabelText = e.target.value;
  applyStripDesign();
});

// --- Capture ---
captureBtn.addEventListener('click', () => {
  if (isCounting || shotCount >= totalShots) return;
  startCountdown();
});

function startCountdown() {
  isCounting = true;
  captureBtn.disabled = true;
  let count = 3;
  countdownEl.classList.remove('hidden');
  countdownEl.textContent = count;

  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      countdownEl.textContent = count;
      countdownEl.style.animation = 'none';
      void countdownEl.offsetWidth;
      countdownEl.style.animation = 'pulse 1s ease-in-out';
    } else {
      clearInterval(interval);
      countdownEl.classList.add('hidden');
      takePhoto();
    }
  }, 1000);
}

function takePhoto() {
  flashEl.classList.remove('hidden');
  flashEl.classList.add('active');
  setTimeout(() => { flashEl.classList.add('hidden'); flashEl.classList.remove('active'); }, 400);

  const canvas = document.createElement('canvas');
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');

  drawBackground(ctx, w, h, currentBg);

  ctx.save();
  ctx.filter = currentFilter === 'none' ? 'none' : currentFilter;
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, w, h);
  ctx.restore();

  const stickers = stickerLayer.querySelectorAll('.sticker-on-cam');
  const scaleX = w / cameraWrapper.offsetWidth;
  const scaleY = h / cameraWrapper.offsetHeight;
  stickers.forEach(s => {
    const x = parseInt(s.style.left) * scaleX;
    const y = parseInt(s.style.top) * scaleY;
    ctx.font = `${2 * scaleX * 30}px serif`;
    ctx.fillText(s.textContent, x, y + 2 * scaleY * 30);
  });

  const dataURL = canvas.toDataURL('image/png');
  photos.push(dataURL);
  addToStrip(dataURL, shotCount);
  shotCount++;
  shotCountEl.textContent = shotCount;
  isCounting = false;

  if (shotCount < totalShots) {
    captureBtn.disabled = false;
  } else {
    captureBtn.disabled = true;
    captureBtn.textContent = '🎉 Strip complete!';
    downloadBtn.disabled = false;
  }
}

function drawBackground(ctx, w, h, bg) {
  if (!bg || bg === 'none') return;
  if (bg === 'stars') {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'white';
    for (let i = 0; i < 80; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (bg === 'confetti') {
    const colors = ['#ffeaa7','#fd79a8','#74b9ff','#55efc4','#a29bfe','#fdcb6e'];
    ctx.fillStyle = '#fff9f0';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.save();
      ctx.translate(Math.random() * w, Math.random() * h);
      ctx.rotate(Math.random() * Math.PI * 2);
      ctx.fillRect(-8, -4, 16, 8);
      ctx.restore();
    }
    return;
  }
  const gradMap = {
    pink: ['#ffb3c6','#ff85a1'], blue: ['#a0c4ff','#6fa3ef'],
    mint: ['#b5ead7','#6fcf97'], lavender: ['#d4b8e0','#b39ddb'], sunset: ['#ffcc70','#ff6b6b'],
  };
  if (gradMap[bg]) {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, gradMap[bg][0]);
    grad.addColorStop(1, gradMap[bg][1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
}

function addToStrip(dataURL, index) {
  const slot = document.getElementById(`slot-${index}`);
  if (!slot) return;
  slot.classList.remove('empty');
  slot.classList.add('filled');
  slot.innerHTML = '';
  const img = document.createElement('img');
  img.src = dataURL;
  slot.appendChild(img);
}

// --- Reset ---
function doReset() {
  shotCount = 0;
  photos = [];
  shotCountEl.textContent = '0';
  captureBtn.disabled = false;
  captureBtn.textContent = '📸 Take Photo';
  downloadBtn.disabled = true;
  stickerLayer.innerHTML = '';
  rebuildStrip();
}

resetBtn.addEventListener('click', doReset);

// --- Download ---
downloadBtn.addEventListener('click', () => {
  if (photos.length < totalShots) return;

  const isGrid = stripLayout === 'grid';
  const photoW = 400;
  const photoH = 300;
  const gap = 12;
  const pad = 20;
  const labelH = 52;

  let canvasW, canvasH;
  if (isGrid) {
    canvasW = photoW * 2 + gap + pad * 2;
    const rows = totalShots / 2;
    canvasH = photoH * rows + gap * (rows - 1) + pad * 2 + labelH;
  } else {
    canvasW = photoW + pad * 2;
    canvasH = (photoH + gap) * totalShots + pad * 2 + labelH;
  }

  const sc = document.createElement('canvas');
  sc.width = canvasW;
  sc.height = canvasH;
  const ctx = sc.getContext('2d');

  // Strip background
  ctx.fillStyle = stripBg;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Outer border
  ctx.strokeStyle = stripBorder;
  ctx.lineWidth = 5;
  ctx.strokeRect(6, 6, canvasW - 12, canvasH - 12);

  const loadPromises = photos.map((src, i) => new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      let x, y;
      if (isGrid) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        x = pad + col * (photoW + gap);
        y = pad + row * (photoH + gap);
      } else {
        x = pad;
        y = pad + i * (photoH + gap);
      }
      ctx.drawImage(img, x, y, photoW, photoH);
      ctx.strokeStyle = stripBorder;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, photoW, photoH);
      resolve();
    };
    img.src = src;
  }));

  Promise.all(loadPromises).then(() => {
    // Label bar
    const labelY = canvasH - labelH;
    ctx.fillStyle = stripBorder;
    ctx.fillRect(0, labelY, canvasW, labelH);
    ctx.fillStyle = stripLabelColor;
    ctx.font = `bold 20px 'Pacifico', cursive`;
    ctx.textAlign = 'center';
    ctx.fillText(stripLabelText || '✨ Peek-a-Booth ✨', canvasW / 2, labelY + 34);

    const link = document.createElement('a');
    link.download = `peek-a-booth-${stripMode}.png`;
    link.href = sc.toDataURL('image/png');
    link.click();
  });
});

// --- Init ---
rebuildStrip();
initCamera();
