// ══════════════════════════════════════════════
//  Peek-a-Booth — app.js
// ══════════════════════════════════════════════

// ── State ──────────────────────────────────────
const state = {
  stripCount: 4,
  stripLayout: 'classic',   // classic | grid-2x2 | grid-2x3 | grid-3x2
  allPhotos: [],             // every shot taken (dataURLs)
  selectedPhotos: [],        // chosen for strip
  currentFilter: 'none',
  currentBg: 'none',
  shotsTaken: 0,
  maxShots: 0,               // stripCount + bonus
  isCounting: false,
  useTimer: true,            // 10s countdown on/off
  useBonus: true,            // 4 bonus shots on/off
  stripBg: '#fff5f8',
  stripBorder: '#ffb3c6',
  stripLabel: '✨ Peek-a-Booth ✨',
  stripLabelColor: '#ff85a1',
};

// ── DOM refs ────────────────────────────────────
const stages = {
  welcome: document.getElementById('stage-welcome'),
  camera:  document.getElementById('stage-camera'),
  select:  document.getElementById('stage-select'),
  design:  document.getElementById('stage-design'),
};

const video         = document.getElementById('video');
const overlayCanvas = document.getElementById('overlay-canvas');
const stickerLayer  = document.getElementById('sticker-layer');
const countdownEl   = document.getElementById('countdown');
const flashEl       = document.getElementById('flash');
const shotFlashEl   = document.getElementById('shot-flash');
const captureBtn    = document.getElementById('capture-btn');
const camProgress   = document.getElementById('cam-progress');
const camStatus     = document.getElementById('cam-status');
const shutterHint   = document.getElementById('shutter-hint');
const reelEl        = document.getElementById('reel');
const doneShootBtn  = document.getElementById('done-shooting-btn');
const photoPicker   = document.getElementById('photo-picker');
const selectNeedEl  = document.getElementById('select-need');
const confirmSelBtn = document.getElementById('confirm-selection-btn');
const finalStrip    = document.getElementById('final-strip');
const downloadBtn   = document.getElementById('download-btn');
const restartBtn    = document.getElementById('restart-btn');
const cameraWrapper = document.getElementById('camera-wrapper');

// ── Stage transitions ───────────────────────────
function goTo(stageName) {
  Object.entries(stages).forEach(([name, el]) => {
    if (name === stageName) {
      el.style.display = 'flex';
      el.classList.remove('slide-out');
      el.classList.add('active', 'slide-in');
      setTimeout(() => el.classList.remove('slide-in'), 600);
    } else {
      el.classList.remove('active', 'slide-in');
      el.style.display = 'none';
    }
  });
}

// ── STAGE 1: Welcome ────────────────────────────
document.querySelectorAll('.strip-choice').forEach(btn => {
  btn.addEventListener('click', () => {
    state.stripCount  = parseInt(btn.dataset.count);
    state.stripLayout = btn.dataset.layout;
    state.useTimer    = document.getElementById('opt-timer').checked;
    state.useBonus    = document.getElementById('opt-bonus').checked;
    state.maxShots    = state.stripCount + (state.useBonus ? 4 : 0);
    state.allPhotos   = [];
    state.shotsTaken  = 0;
    buildProgressDots();
    goTo('camera');
    initCamera();
    shutterHint.textContent = state.useTimer ? 'tap to shoot' : 'tap to snap';
  });
});

// ── STAGE 2: Camera ─────────────────────────────
async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
      overlayCanvas.width  = video.videoWidth;
      overlayCanvas.height = video.videoHeight;
    });
  } catch {
    alert('Camera access denied. Please allow camera permissions and reload.');
  }
}

function buildProgressDots() {
  camProgress.innerHTML = '';
  for (let i = 0; i < state.maxShots; i++) {
    const d = document.createElement('div');
    d.className = 'progress-dot';
    d.id = `dot-${i}`;
    camProgress.appendChild(d);
  }
  updateProgressDots();
}

function updateProgressDots() {
  for (let i = 0; i < state.maxShots; i++) {
    const d = document.getElementById(`dot-${i}`);
    if (!d) continue;
    d.className = 'progress-dot';
    if (i < state.shotsTaken) d.classList.add('done');
    else if (i === state.shotsTaken) d.classList.add('active');
  }
  const bonus = state.maxShots - state.stripCount;
  const bonusTxt = bonus > 0 ? ` (+${bonus} bonus)` : '';
  camStatus.textContent = state.shotsTaken < state.stripCount
    ? `shot ${state.shotsTaken + 1} of ${state.stripCount}${bonusTxt}`
    : state.shotsTaken < state.maxShots
      ? `bonus shot ${state.shotsTaken - state.stripCount + 1} of ${bonus} ✨`
      : 'all done! pick your faves 🎉';
}

// Filters
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.currentFilter = btn.dataset.filter;
    video.style.filter = state.currentFilter === 'none' ? '' : state.currentFilter;
  });
});

// Backgrounds
document.querySelectorAll('.bg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.currentBg = btn.dataset.bg;
  });
});

// Stickers on camera
document.querySelectorAll('.sticker-btn').forEach(btn => {
  btn.addEventListener('click', () => placeSticker(btn.dataset.sticker));
});
document.getElementById('clear-stickers').addEventListener('click', () => { stickerLayer.innerHTML = ''; });

function placeSticker(emoji) {
  const el = document.createElement('span');
  el.className = 'sticker-on-cam';
  el.textContent = emoji;
  const maxX = cameraWrapper.offsetWidth - 50;
  const maxY = cameraWrapper.offsetHeight - 50;
  el.style.left = (20 + Math.random() * (maxX - 20)) + 'px';
  el.style.top  = (20 + Math.random() * (maxY - 20)) + 'px';
  makeDraggable(el);
  stickerLayer.appendChild(el);
}

function makeDraggable(el) {
  let sx, sy, ol, ot;
  const down = (cx, cy) => { sx = cx; sy = cy; ol = parseInt(el.style.left); ot = parseInt(el.style.top); };
  const move = (cx, cy) => { el.style.left = (ol + cx - sx) + 'px'; el.style.top = (ot + cy - sy) + 'px'; };
  el.addEventListener('mousedown', e => { e.preventDefault(); down(e.clientX, e.clientY);
    const mm = e2 => move(e2.clientX, e2.clientY);
    const mu = () => { document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); };
    document.addEventListener('mousemove', mm); document.addEventListener('mouseup', mu);
  });
  el.addEventListener('touchstart', e => { const t = e.touches[0]; down(t.clientX, t.clientY);
    const tm = e2 => { const t2 = e2.touches[0]; move(t2.clientX, t2.clientY); };
    const te = () => { el.removeEventListener('touchmove', tm); el.removeEventListener('touchend', te); };
    el.addEventListener('touchmove', tm); el.addEventListener('touchend', te);
  });
}

// Capture
captureBtn.addEventListener('click', () => {
  if (state.isCounting || state.shotsTaken >= state.maxShots) return;
  startCountdown();
});

function startCountdown() {
  state.isCounting = true;
  captureBtn.disabled = true;
  shutterHint.textContent = 'smile! 😊';

  if (!state.useTimer) {
    // instant capture
    takePhoto();
    return;
  }

  let count = 10;
  countdownEl.classList.remove('hidden');
  showCountNum(count);

  const iv = setInterval(() => {
    count--;
    if (count > 0) {
      showCountNum(count);
    } else {
      clearInterval(iv);
      countdownEl.classList.add('hidden');
      takePhoto();
    }
  }, 1000);
}

function showCountNum(n) {
  countdownEl.innerHTML = `<span class="countdown-num">${n}</span>`;
}

function takePhoto() {
  // Flash
  flashEl.classList.remove('hidden');
  flashEl.classList.add('active');
  setTimeout(() => { flashEl.classList.add('hidden'); flashEl.classList.remove('active'); }, 500);

  // Shot emoji pop
  const emojis = ['📸','✨','💖','🌸','⭐'];
  shotFlashEl.textContent = emojis[Math.floor(Math.random() * emojis.length)];
  shotFlashEl.classList.remove('hidden');
  shotFlashEl.classList.add('active');
  setTimeout(() => { shotFlashEl.classList.add('hidden'); shotFlashEl.classList.remove('active'); }, 700);

  const canvas = document.createElement('canvas');
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');

  drawBackground(ctx, w, h, state.currentBg);

  ctx.save();
  ctx.filter = state.currentFilter === 'none' ? 'none' : state.currentFilter;
  ctx.translate(w, 0); ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, w, h);
  ctx.restore();

  const scaleX = w / cameraWrapper.offsetWidth;
  const scaleY = h / cameraWrapper.offsetHeight;
  stickerLayer.querySelectorAll('.sticker-on-cam').forEach(s => {
    const x = parseInt(s.style.left) * scaleX;
    const y = parseInt(s.style.top)  * scaleY;
    ctx.font = `${2 * scaleX * 30}px serif`;
    ctx.fillText(s.textContent, x, y + 2 * scaleY * 30);
  });

  const dataURL = canvas.toDataURL('image/png');
  state.allPhotos.push(dataURL);
  state.shotsTaken++;
  addReel(dataURL, state.shotsTaken);
  updateProgressDots();

  state.isCounting = false;

  if (state.shotsTaken < state.maxShots) {
    captureBtn.disabled = false;
    shutterHint.textContent = state.useTimer ? 'tap to shoot' : 'tap to snap';
  } else {
    captureBtn.disabled = true;
    shutterHint.textContent = 'all done! 🎉';
    doneShootBtn.classList.remove('hidden');
  }
}

function addReel(dataURL, num) {
  const wrap = document.createElement('div');
  wrap.className = 'reel-thumb';
  const img = document.createElement('img');
  img.src = dataURL;
  const badge = document.createElement('span');
  badge.className = 'thumb-num';
  badge.textContent = num;
  wrap.appendChild(img);
  wrap.appendChild(badge);
  reelEl.appendChild(wrap);
}

doneShootBtn.addEventListener('click', () => {
  if (!state.useBonus) {
    // no bonus — all photos go straight to strip
    state.selectedPhotos = [...state.allPhotos];
    buildFinalStrip();
    goTo('design');
  } else {
    buildPhotoPicker();
    goTo('select');
  }
});

// ── STAGE 3: Select ─────────────────────────────
function buildPhotoPicker() {
  photoPicker.innerHTML = '';
  state.selectedPhotos = [];
  selectNeedEl.textContent = state.stripCount;
  confirmSelBtn.disabled = true;

  state.allPhotos.forEach((url, i) => {
    const item = document.createElement('div');
    item.className = 'picker-item';
    item.dataset.index = i;
    const img = document.createElement('img');
    img.src = url;
    const overlay = document.createElement('div');
    overlay.className = 'pick-overlay';
    item.appendChild(img);
    item.appendChild(overlay);
    item.addEventListener('click', () => togglePick(item, url));
    photoPicker.appendChild(item);
  });
}

function togglePick(item, url) {
  if (item.classList.contains('selected')) {
    item.classList.remove('selected');
    state.selectedPhotos = state.selectedPhotos.filter(u => u !== url);
  } else {
    if (state.selectedPhotos.length >= state.stripCount) return;
    item.classList.add('selected');
    state.selectedPhotos.push(url);
  }
  confirmSelBtn.disabled = state.selectedPhotos.length !== state.stripCount;
  // dim unchosen when full
  document.querySelectorAll('.picker-item').forEach(el => {
    el.classList.toggle('disabled-pick',
      state.selectedPhotos.length >= state.stripCount && !el.classList.contains('selected'));
  });
}

confirmSelBtn.addEventListener('click', () => {
  buildFinalStrip();
  goTo('design');
});

// ── STAGE 4: Design ─────────────────────────────
function layoutClass() {
  if (state.stripLayout === 'grid') {
    return state.stripCount === 4 ? 'layout-grid-2x2' : 'layout-grid-2x3';
  }
  if (state.stripLayout === 'wide') return 'layout-grid-3x2';
  return '';
}

function buildFinalStrip() {
  finalStrip.innerHTML = '';
  finalStrip.className = 'final-strip';
  const lc = layoutClass();
  if (lc) finalStrip.classList.add(lc);

  applyStripStyle();

  state.selectedPhotos.forEach(url => {
    const div = document.createElement('div');
    div.className = 'strip-photo';
    div.style.borderColor = state.stripBorder;
    const img = document.createElement('img');
    img.src = url;
    div.appendChild(img);
    finalStrip.appendChild(div);
  });

  const label = document.createElement('div');
  label.className = 'strip-label-bar';
  label.id = 'final-label';
  label.textContent = state.stripLabel;
  label.style.color = state.stripLabelColor;
  finalStrip.appendChild(label);
}

function applyStripStyle() {
  finalStrip.style.background    = state.stripBg;
  finalStrip.style.borderColor   = state.stripBorder;
  document.querySelectorAll('.strip-photo').forEach(p => p.style.borderColor = state.stripBorder);
  const lbl = document.getElementById('final-label');
  if (lbl) { lbl.textContent = state.stripLabel; lbl.style.color = state.stripLabelColor; }
}

// Design controls
function setupSwatches(groupId, customId, onChange) {
  const group = document.getElementById(groupId);
  group.querySelectorAll('.swatch').forEach(s => {
    s.addEventListener('click', () => {
      group.querySelectorAll('.swatch').forEach(x => x.classList.remove('active'));
      s.classList.add('active');
      onChange(s.dataset.val);
    });
  });
  document.getElementById(customId).addEventListener('input', e => {
    group.querySelectorAll('.swatch').forEach(x => x.classList.remove('active'));
    onChange(e.target.value);
  });
}

setupSwatches('strip-bg-swatches',     'strip-bg-custom',    v => { state.stripBg     = v; applyStripStyle(); });
setupSwatches('strip-border-swatches', 'strip-border-custom',v => { state.stripBorder  = v; applyStripStyle(); });
setupSwatches('strip-label-swatches',  'strip-label-custom', v => { state.stripLabelColor = v; applyStripStyle(); });

document.getElementById('strip-label-input').addEventListener('input', e => {
  state.stripLabel = e.target.value;
  applyStripStyle();
});

// Strip stickers (draggable on the final strip)
document.querySelectorAll('.strip-sticker-btn').forEach(btn => {
  btn.addEventListener('click', () => placeStripSticker(btn.dataset.sticker));
});
document.getElementById('clear-strip-stickers').addEventListener('click', () => {
  document.querySelectorAll('.strip-sticker-overlay').forEach(s => s.remove());
});

function placeStripSticker(emoji) {
  const wrap = document.getElementById('strip-canvas-wrap');
  const el = document.createElement('span');
  el.className = 'strip-sticker-overlay';
  el.textContent = emoji;
  el.style.left = (20 + Math.random() * (wrap.offsetWidth  - 60)) + 'px';
  el.style.top  = (20 + Math.random() * (wrap.offsetHeight - 60)) + 'px';
  makeDraggable(el);
  wrap.appendChild(el);
}

const downloadVideoBtn  = document.getElementById('download-video-btn');
const videoProgressEl   = document.getElementById('video-progress');
const vpFill            = document.getElementById('vp-fill');
const vpLabel           = document.getElementById('vp-label');

// Download image
downloadBtn.addEventListener('click', downloadStrip);

// Download video
downloadVideoBtn.addEventListener('click', downloadStripVideo);

function downloadStrip() {
  const isGrid = state.stripLayout !== 'classic';
  const isWide = state.stripLayout === 'wide';
  const photoW = 360, photoH = 270, gap = 10, pad = 18, labelH = 50;

  let cols, rows;
  if (isWide)       { cols = 3; rows = 2; }
  else if (isGrid)  { cols = 2; rows = state.stripCount / 2; }
  else              { cols = 1; rows = state.stripCount; }

  const cw = photoW * cols + gap * (cols - 1) + pad * 2;
  const ch = photoH * rows + gap * (rows - 1) + pad * 2 + labelH;

  const sc = document.createElement('canvas');
  sc.width = cw; sc.height = ch;
  const ctx = sc.getContext('2d');

  ctx.fillStyle = state.stripBg;
  ctx.fillRect(0, 0, cw, ch);
  ctx.strokeStyle = state.stripBorder;
  ctx.lineWidth = 5;
  ctx.strokeRect(5, 5, cw - 10, ch - 10);

  const promises = state.selectedPhotos.map((src, i) => new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = pad + col * (photoW + gap);
      const y = pad + row * (photoH + gap);
      ctx.drawImage(img, x, y, photoW, photoH);
      ctx.strokeStyle = state.stripBorder;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, photoW, photoH);
      resolve();
    };
    img.src = src;
  }));

  // Also render strip stickers
  const stripStickers = document.querySelectorAll('.strip-sticker-overlay');
  const wrapEl = document.getElementById('strip-canvas-wrap');
  const scaleX = cw / wrapEl.offsetWidth;
  const scaleY = ch / wrapEl.offsetHeight;

  Promise.all(promises).then(() => {
    stripStickers.forEach(s => {
      const x = parseInt(s.style.left) * scaleX;
      const y = parseInt(s.style.top)  * scaleY;
      ctx.font = `${40}px serif`;
      ctx.fillText(s.textContent, x, y + 40);
    });

    // Label
    const ly = ch - labelH;
    ctx.fillStyle = state.stripBorder;
    ctx.fillRect(0, ly, cw, labelH);
    ctx.fillStyle = state.stripLabelColor;
    ctx.font = 'bold 20px Pacifico, cursive';
    ctx.textAlign = 'center';
    ctx.fillText(state.stripLabel || '✨ Peek-a-Booth ✨', cw / 2, ly + 34);

    const a = document.createElement('a');
    a.download = 'peek-a-booth-strip.png';
    a.href = sc.toDataURL('image/png');
    a.click();
  });
}

// ── Video export ─────────────────────────────────
async function downloadStripVideo() {
  if (!window.MediaRecorder) {
    alert('Your browser does not support video recording. Try Chrome or Edge.');
    return;
  }

  const isWide = state.stripLayout === 'wide';
  const isGrid = state.stripLayout !== 'classic';
  const photoW = 360, photoH = 270, gap = 10, pad = 18, labelH = 50;

  let cols, rows;
  if (isWide)      { cols = 3; rows = 2; }
  else if (isGrid) { cols = 2; rows = state.stripCount / 2; }
  else             { cols = 1; rows = state.stripCount; }

  const cw = photoW * cols + gap * (cols - 1) + pad * 2;
  const ch = photoH * rows + gap * (rows - 1) + pad * 2 + labelH;

  // Pre-load all images
  const imgs = await Promise.all(state.selectedPhotos.map(src => new Promise((res, rej) => {
    const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = src;
  })));

  // Strip sticker data (position + emoji)
  const stripStickers = [...document.querySelectorAll('.strip-sticker-overlay')].map(s => ({
    text: s.textContent,
    x: parseInt(s.style.left),
    y: parseInt(s.style.top),
  }));
  const wrapEl = document.getElementById('strip-canvas-wrap');
  const stickerScaleX = cw / wrapEl.offsetWidth;
  const stickerScaleY = ch / wrapEl.offsetHeight;

  const canvas = document.createElement('canvas');
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d');

  // Show progress
  videoProgressEl.classList.remove('hidden');
  downloadVideoBtn.disabled = true;
  vpFill.style.width = '0%';
  vpLabel.textContent = 'rendering… ✨';

  const FPS = 30;
  const HOLD_FRAMES   = FPS * 1.2;  // how long each photo stays fully visible
  const SLIDE_FRAMES  = FPS * 0.5;  // slide-in duration per photo
  const LABEL_FRAMES  = FPS * 1.0;  // label fade-in at end
  const LOOP_PAUSE    = FPS * 0.8;  // pause before loop

  const totalFrames = imgs.length * (HOLD_FRAMES + SLIDE_FRAMES) + LABEL_FRAMES + LOOP_PAUSE;

  // Photo positions
  function photoPos(i) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return { x: pad + col * (photoW + gap), y: pad + row * (photoH + gap) };
  }

  // Draw strip background + border
  function drawBase() {
    ctx.fillStyle = state.stripBg;
    ctx.fillRect(0, 0, cw, ch);
    ctx.strokeStyle = state.stripBorder;
    ctx.lineWidth = 5;
    ctx.strokeRect(5, 5, cw - 10, ch - 10);
  }

  // Draw label
  function drawLabel(alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const ly = ch - labelH;
    ctx.fillStyle = state.stripBorder;
    ctx.fillRect(0, ly, cw, labelH);
    ctx.fillStyle = state.stripLabelColor;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.stripLabel || '✨ Peek-a-Booth ✨', cw / 2, ly + 34);
    ctx.restore();
  }

  // Draw stickers
  function drawStickers(alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    stripStickers.forEach(s => {
      ctx.font = '40px serif';
      ctx.fillText(s.text, s.x * stickerScaleX, s.y * stickerScaleY + 40);
    });
    ctx.restore();
  }

  // Easing
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  // Collect frames
  const chunks = [];
  const stream = canvas.captureStream(FPS);
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

  recorder.start();

  let frame = 0;

  function renderFrame() {
    drawBase();

    // Determine which photos are fully visible and which is sliding in
    let photosDone = 0;
    let slidingIdx = -1;
    let slideProgress = 0;

    const perPhoto = HOLD_FRAMES + SLIDE_FRAMES;

    for (let i = 0; i < imgs.length; i++) {
      const start = i * perPhoto;
      const slideEnd = start + SLIDE_FRAMES;
      const holdEnd  = start + perPhoto;

      if (frame >= holdEnd) {
        photosDone = i + 1;
      } else if (frame >= start && frame < slideEnd) {
        slidingIdx = i;
        slideProgress = easeOut((frame - start) / SLIDE_FRAMES);
        photosDone = i;
        break;
      } else if (frame >= slideEnd && frame < holdEnd) {
        photosDone = i + 1;
      }
    }

    // Draw fully visible photos
    for (let i = 0; i < photosDone; i++) {
      const { x, y } = photoPos(i);
      ctx.drawImage(imgs[i], x, y, photoW, photoH);
      ctx.strokeStyle = state.stripBorder; ctx.lineWidth = 2;
      ctx.strokeRect(x, y, photoW, photoH);
    }

    // Draw sliding photo
    if (slidingIdx >= 0 && slidingIdx < imgs.length) {
      const { x, y } = photoPos(slidingIdx);
      ctx.save();
      ctx.globalAlpha = slideProgress;
      // slide from below
      const offsetY = (1 - slideProgress) * 60;
      ctx.drawImage(imgs[slidingIdx], x, y + offsetY, photoW, photoH * slideProgress);
      ctx.globalAlpha = 1;
      ctx.restore();
      // border
      ctx.save();
      ctx.globalAlpha = slideProgress;
      ctx.strokeStyle = state.stripBorder; ctx.lineWidth = 2;
      ctx.strokeRect(x, y, photoW, photoH);
      ctx.restore();
    }

    // Label fade in after all photos
    const allDone = imgs.length * perPhoto;
    if (frame >= allDone) {
      const labelProgress = Math.min(1, (frame - allDone) / LABEL_FRAMES);
      drawLabel(labelProgress);
      drawStickers(labelProgress);
    }

    frame++;
    const progress = Math.min(100, Math.round((frame / totalFrames) * 100));
    vpFill.style.width = progress + '%';
    vpLabel.textContent = progress < 100 ? `rendering… ${progress}%` : 'almost done ✨';

    if (frame < totalFrames) {
      requestAnimationFrame(renderFrame);
    } else {
      recorder.stop();
    }
  }

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.download = 'peek-a-booth-strip.webm';
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);

    videoProgressEl.classList.add('hidden');
    downloadVideoBtn.disabled = false;
    vpLabel.textContent = 'rendering… ✨';
    vpFill.style.width = '0%';
  };

  renderFrame();
}

restartBtn.addEventListener('click', () => {
  state.allPhotos = []; state.selectedPhotos = [];
  state.shotsTaken = 0; state.isCounting = false;
  reelEl.innerHTML = '';
  doneShootBtn.classList.add('hidden');
  captureBtn.disabled = false;
  shutterHint.textContent = 'tap to shoot';
  stickerLayer.innerHTML = '';
  document.querySelectorAll('.strip-sticker-overlay').forEach(s => s.remove());
  // re-sync toggles to current checkbox state
  document.getElementById('opt-timer').checked = true;
  document.getElementById('opt-bonus').checked = true;
  goTo('welcome');
});

// ── Background drawing ───────────────────────────
function drawBackground(ctx, w, h, bg) {
  if (!bg || bg === 'none') return;
  if (bg === 'stars') {
    ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'white';
    for (let i = 0; i < 80; i++) {
      ctx.beginPath();
      ctx.arc(Math.random()*w, Math.random()*h, Math.random()*2, 0, Math.PI*2);
      ctx.fill();
    }
    return;
  }
  if (bg === 'confetti') {
    const cols = ['#ffeaa7','#fd79a8','#74b9ff','#55efc4','#a29bfe','#fdcb6e'];
    ctx.fillStyle = '#fff9f0'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.save(); ctx.translate(Math.random()*w, Math.random()*h);
      ctx.rotate(Math.random()*Math.PI*2); ctx.fillRect(-8,-4,16,8); ctx.restore();
    }
    return;
  }
  const gm = { pink:['#ffb3c6','#ff85a1'], blue:['#a0c4ff','#6fa3ef'], mint:['#b5ead7','#6fcf97'], lavender:['#d4b8e0','#b39ddb'], sunset:['#ffcc70','#ff6b6b'] };
  if (gm[bg]) {
    const g = ctx.createLinearGradient(0,0,w,h);
    g.addColorStop(0, gm[bg][0]); g.addColorStop(1, gm[bg][1]);
    ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
  }
}

// ── Init ─────────────────────────────────────────
goTo('welcome');
