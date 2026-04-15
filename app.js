const video = document.getElementById('video');
const overlayCanvas = document.getElementById('overlay-canvas');
const stickerLayer = document.getElementById('sticker-layer');
const countdownEl = document.getElementById('countdown');
const flashEl = document.getElementById('flash');
const captureBtn = document.getElementById('capture-btn');
const resetBtn = document.getElementById('reset-btn');
const downloadBtn = document.getElementById('download-btn');
const shotCountEl = document.getElementById('shot-count');
const cameraWrapper = document.getElementById('camera-wrapper');

let currentFilter = 'none';
let currentBg = 'none';
let shotCount = 0;
let photos = []; // array of dataURLs
let isCounting = false;
let selectedSticker = null;

const bgGradients = {
  none: null,
  pink: ['#ffb3c6', '#ff85a1'],
  blue: ['#a0c4ff', '#6fa3ef'],
  mint: ['#b5ead7', '#6fcf97'],
  lavender: ['#d4b8e0', '#b39ddb'],
  sunset: ['#ffcc70', '#ff6b6b'],
  stars: 'stars',
  confetti: 'confetti',
};

// --- Camera init ---
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

// --- Filter buttons ---
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    video.style.filter = currentFilter === 'none' ? '' : currentFilter;
  });
});

// --- Background buttons ---
document.querySelectorAll('.bg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentBg = btn.dataset.bg;
  });
});

// --- Sticker buttons ---
document.querySelectorAll('.sticker-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedSticker = btn.dataset.sticker;
    placeSticker(selectedSticker);
  });
});

document.getElementById('clear-stickers').addEventListener('click', () => {
  stickerLayer.innerHTML = '';
});

function placeSticker(emoji) {
  const el = document.createElement('span');
  el.className = 'sticker-on-cam';
  el.textContent = emoji;
  // random position within camera
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
    startX = e.clientX;
    startY = e.clientY;
    origLeft = parseInt(el.style.left);
    origTop = parseInt(el.style.top);
    const onMove = (e) => {
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
  // touch support
  el.addEventListener('touchstart', e => {
    const t = e.touches[0];
    startX = t.clientX; startY = t.clientY;
    origLeft = parseInt(el.style.left); origTop = parseInt(el.style.top);
    const onMove = (e) => {
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

// --- Capture ---
captureBtn.addEventListener('click', () => {
  if (isCounting || shotCount >= 4) return;
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
      void countdownEl.offsetWidth; // reflow
      countdownEl.style.animation = 'pulse 1s ease-in-out';
    } else {
      clearInterval(interval);
      countdownEl.classList.add('hidden');
      takePhoto();
    }
  }, 1000);
}

function takePhoto() {
  // Flash
  flashEl.classList.remove('hidden');
  flashEl.classList.add('active');
  setTimeout(() => {
    flashEl.classList.add('hidden');
    flashEl.classList.remove('active');
  }, 400);

  const canvas = document.createElement('canvas');
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Draw background
  drawBackground(ctx, w, h, currentBg);

  // Draw video (mirrored + filtered)
  ctx.save();
  ctx.filter = currentFilter === 'none' ? 'none' : currentFilter;
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, w, h);
  ctx.restore();

  // Draw stickers
  const stickers = stickerLayer.querySelectorAll('.sticker-on-cam');
  const wrapperRect = cameraWrapper.getBoundingClientRect();
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
  if (shotCount < 4) {
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
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.random() * 2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (bg === 'confetti') {
    const colors = ['#ffeaa7', '#fd79a8', '#74b9ff', '#55efc4', '#a29bfe', '#fdcb6e'];
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
    pink: ['#ffb3c6', '#ff85a1'],
    blue: ['#a0c4ff', '#6fa3ef'],
    mint: ['#b5ead7', '#6fcf97'],
    lavender: ['#d4b8e0', '#b39ddb'],
    sunset: ['#ffcc70', '#ff6b6b'],
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
  slot.classList.remove('empty');
  slot.classList.add('filled');
  slot.innerHTML = '';
  const img = document.createElement('img');
  img.src = dataURL;
  slot.appendChild(img);
}

// --- Reset ---
resetBtn.addEventListener('click', () => {
  shotCount = 0;
  photos = [];
  shotCountEl.textContent = '0';
  captureBtn.disabled = false;
  captureBtn.textContent = '📸 Take Photo';
  downloadBtn.disabled = true;
  stickerLayer.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const slot = document.getElementById(`slot-${i}`);
    slot.classList.remove('filled');
    slot.classList.add('empty');
    slot.innerHTML = '';
  }
});

// --- Download strip ---
downloadBtn.addEventListener('click', () => {
  if (photos.length < 4) return;

  const stripCanvas = document.createElement('canvas');
  const photoW = 400;
  const photoH = 300;
  const padding = 16;
  const borderW = 20;
  const labelH = 50;

  stripCanvas.width = photoW + borderW * 2;
  stripCanvas.height = (photoH + padding) * 4 + borderW * 2 + labelH;

  const ctx = stripCanvas.getContext('2d');

  // Strip background
  ctx.fillStyle = '#fff5f8';
  ctx.fillRect(0, 0, stripCanvas.width, stripCanvas.height);

  // Border decoration
  ctx.strokeStyle = '#ffb3c6';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, stripCanvas.width - 16, stripCanvas.height - 16);

  // Draw photos
  const loadPromises = photos.map((src, i) => {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const y = borderW + i * (photoH + padding);
        ctx.drawImage(img, borderW, y, photoW, photoH);
        // cute border per photo
        ctx.strokeStyle = '#ff85a1';
        ctx.lineWidth = 2;
        ctx.strokeRect(borderW, y, photoW, photoH);
        resolve();
      };
      img.src = src;
    });
  });

  Promise.all(loadPromises).then(() => {
    // Label at bottom
    const labelY = stripCanvas.height - labelH;
    ctx.fillStyle = '#ff85a1';
    ctx.fillRect(0, labelY, stripCanvas.width, labelH);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 18px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ Photobooth ✨', stripCanvas.width / 2, labelY + 32);

    const link = document.createElement('a');
    link.download = 'photobooth-strip.png';
    link.href = stripCanvas.toDataURL('image/png');
    link.click();
  });
});

// --- Init ---
initCamera();
