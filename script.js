/* ============================================================
   QR Studio — script.js
   Full app logic: QR generation, customisation, history, PWA
   ============================================================ */

'use strict';

/* ──────────────────────────────────────────
   Constants & State
   ────────────────────────────────────────── */
const MAX_HISTORY = 20;
const STORAGE_KEY_HISTORY = 'qrs_history';
const STORAGE_KEY_THEME   = 'qrs_theme';

let currentTab      = 'url';
let currentQRData   = null;   // raw string encoded in QR
let currentQRMeta   = null;   // { type, label }
let logoDataURL     = null;   // uploaded logo
let deferredInstall = null;   // PWA install event

/* ──────────────────────────────────────────
   DOM Refs
   ────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const themeToggle      = $('themeToggle');
const navBtns          = document.querySelectorAll('.nav-btn');
const generatorView    = $('generatorView');
const historyView      = $('historyView');
const tabs             = document.querySelectorAll('.tab');
const tabPanels        = document.querySelectorAll('.tab-panel');
const generateBtn      = $('generateBtn');
const clearBtn         = $('clearBtn');
const copyUrlBtn       = $('copyUrlBtn');
const urlInput         = $('urlInput');
const urlError         = $('urlError');
const filenameInput    = $('filenameInput');
const previewPlaceholder = $('previewPlaceholder');
const previewLoading   = $('previewLoading');
const previewCanvas    = $('previewCanvas');
const previewArea      = $('previewArea');
const qrCanvas         = $('qrCanvas');
const downloadRow      = $('downloadRow');
const downloadPng      = $('downloadPng');
const downloadJpg      = $('downloadJpg');
const downloadSvg      = $('downloadSvg');
const fgColor          = $('fgColor');
const bgColor          = $('bgColor');
const fgColorVal       = $('fgColorVal');
const bgColorVal       = $('bgColorVal');
const qrSize           = $('qrSize');
const qrMargin         = $('qrMargin');
const qrEc             = $('qrEc');
const customiseToggle  = $('customiseToggle');
const customisePanel   = $('customisePanel');
const logoDropZone     = $('logoDropZone');
const logoFile         = $('logoFile');
const logoControls     = $('logoControls');
const logoSize         = $('logoSize');
const logoSizeVal      = $('logoSizeVal');
const removeLogo       = $('removeLogo');
const historyGrid      = $('historyGrid');
const historyEmpty     = $('historyEmpty');
const historyBadge     = $('historyBadge');
const clearHistoryBtn  = $('clearHistoryBtn');
const toast            = $('toast');
const installBanner    = $('installBanner');
const installBtn       = $('installBtn');
const dismissBanner    = $('dismissBanner');

/* ──────────────────────────────────────────
   Theme
   ────────────────────────────────────────── */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY_THEME, theme);
}

function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY_THEME);
  if (saved) { applyTheme(saved); return; }
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark ? 'dark' : 'light');
}

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

/* ──────────────────────────────────────────
   Navigation (views)
   ────────────────────────────────────────── */
navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;
    navBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed','true');

    if (view === 'generator') {
      generatorView.style.display = '';
      generatorView.classList.add('active');
      historyView.style.display = 'none';
    } else {
      historyView.style.display = '';
      historyView.classList.add('active');
      generatorView.style.display = 'none';
      renderHistory();
    }
  });
});

/* ──────────────────────────────────────────
   QR Type Tabs
   ────────────────────────────────────────── */
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
    tabPanels.forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    tab.setAttribute('aria-selected','true');
    currentTab = tab.dataset.tab;
    const panel = document.querySelector(`.tab-panel[data-panel="${currentTab}"]`);
    if (panel) panel.classList.add('active');
    clearError();
  });
});

/* ──────────────────────────────────────────
   QR Data Builders
   ────────────────────────────────────────── */
function buildQRData() {
  switch (currentTab) {
    case 'url': {
      const url = urlInput.value.trim();
      if (!url) { showError(urlError, 'Please enter a URL.'); return null; }
      if (!isValidURL(url)) { showError(urlError, 'Please enter a valid URL (include https://).'); return null; }
      clearError();
      return { data: url, label: extractSiteName(url), type: 'URL' };
    }
    case 'wifi': {
      const ssid = $('wifiSsid').value.trim();
      if (!ssid) { showToast('Please enter the network name.', 'error'); return null; }
      const pass = $('wifiPassword').value;
      const sec  = $('wifiSecurity').value;
      const hidden = $('wifiHidden').checked ? 'true' : 'false';
      const data = `WIFI:T:${sec};S:${escapeSemicolon(ssid)};P:${escapeSemicolon(pass)};H:${hidden};;`;
      return { data, label: ssid, type: 'WiFi' };
    }
    case 'contact': {
      const first = $('contactFirst').value.trim();
      const last  = $('contactLast').value.trim();
      if (!first && !last) { showToast('Please enter at least a name.', 'error'); return null; }
      const lines = [
        'BEGIN:VCARD', 'VERSION:3.0',
        `N:${last};${first};;;`,
        `FN:${first} ${last}`.trim(),
      ];
      if ($('contactOrg').value)     lines.push(`ORG:${$('contactOrg').value}`);
      if ($('contactPhone').value)   lines.push(`TEL;TYPE=CELL:${$('contactPhone').value}`);
      if ($('contactEmail').value)   lines.push(`EMAIL:${$('contactEmail').value}`);
      if ($('contactUrl').value)     lines.push(`URL:${$('contactUrl').value}`);
      if ($('contactAddress').value) lines.push(`ADR;TYPE=HOME:;;${$('contactAddress').value};;;;`);
      lines.push('END:VCARD');
      return { data: lines.join('\n'), label: `${first} ${last}`.trim(), type: 'Contact' };
    }
    case 'email': {
      const to = $('emailTo').value.trim();
      if (!to) { showToast('Please enter an email address.', 'error'); return null; }
      const sub  = encodeURIComponent($('emailSubject').value);
      const body = encodeURIComponent($('emailBody').value);
      let data = `mailto:${to}`;
      const params = [];
      if (sub)  params.push(`subject=${sub}`);
      if (body) params.push(`body=${body}`);
      if (params.length) data += '?' + params.join('&');
      return { data, label: to, type: 'Email' };
    }
    case 'phone': {
      const num = $('phoneNumber').value.trim();
      if (!num) { showToast('Please enter a phone number.', 'error'); return null; }
      return { data: `tel:${num}`, label: num, type: 'Phone' };
    }
    case 'sms': {
      const num = $('smsNumber').value.trim();
      if (!num) { showToast('Please enter a phone number.', 'error'); return null; }
      const msg = $('smsMessage').value.trim();
      const data = msg ? `smsto:${num}:${msg}` : `sms:${num}`;
      return { data, label: num, type: 'SMS' };
    }
    case 'text': {
      const txt = $('plainText').value.trim();
      if (!txt) { showToast('Please enter some text.', 'error'); return null; }
      return { data: txt, label: txt.slice(0, 30), type: 'Text' };
    }
    default: return null;
  }
}

/* ──────────────────────────────────────────
   QR Generation
   ────────────────────────────────────────── */
generateBtn.addEventListener('click', generateQR);

// Enter key in url input
urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') generateQR(); });

async function generateQR() {
  const result = buildQRData();
  if (!result) return;

  currentQRData = result.data;
  currentQRMeta = { type: result.type, label: result.label };

  // Show loading
  previewPlaceholder.style.display = 'none';
  previewLoading.style.display = 'flex';
  previewCanvas.style.display = 'none';
  previewArea.classList.remove('has-qr');
  downloadRow.style.display = 'none';

  // Small delay for UX
  await new Promise(r => setTimeout(r, 120));

  try {
    await renderQRToCanvas(currentQRData);

    previewLoading.style.display = 'none';
    previewCanvas.style.display = 'flex';
    previewArea.classList.add('has-qr');
    downloadRow.style.display = 'flex';

    // Save to history
    saveToHistory(result);

  } catch (err) {
    previewLoading.style.display = 'none';
    previewPlaceholder.style.display = 'flex';
    showToast('Failed to generate QR code.', 'error');
    console.error(err);
  }
}

function getOptions() {
  return {
    size:   parseInt(qrSize.value, 10),
    margin: parseInt(qrMargin.value, 10),
    ec:     qrEc.value,
    fg:     fgColor.value,
    bg:     bgColor.value,
  };
}

async function renderQRToCanvas(data) {
  const opts = getOptions();
  const canvas = qrCanvas;
  canvas.width  = opts.size;
  canvas.height = opts.size;

  // Use QrCreator library
  await new Promise((resolve, reject) => {
    try {
      QrCreator.render({
        text: data,
        radius: 0.0,
        ecLevel: opts.ec,
        fill: opts.fg,
        background: opts.bg,
        size: opts.size,
      }, canvas);
      resolve();
    } catch (e) { reject(e); }
  });

  // Apply margin (redraw with padding)
  if (opts.margin > 0) {
    const moduleCount = 25; // approx; we redraw with padding
    const pad = Math.round((opts.size / (25 + opts.margin * 2)) * opts.margin);
    const inner = canvas.width - pad * 2;
    const tmp = document.createElement('canvas');
    tmp.width  = opts.size;
    tmp.height = opts.size;
    const ctx2 = tmp.getContext('2d');
    ctx2.fillStyle = opts.bg;
    ctx2.fillRect(0, 0, opts.size, opts.size);
    ctx2.drawImage(canvas, pad, pad, inner, inner);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tmp, 0, 0);
  }

  // Overlay logo
  if (logoDataURL) {
    await overlayLogo(canvas, logoDataURL, parseInt(logoSize.value, 10) / 100);
  }
}

function overlayLogo(canvas, src, ratio) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      const logoW = canvas.width * ratio;
      const logoH = (img.height / img.width) * logoW;
      const x = (canvas.width  - logoW) / 2;
      const y = (canvas.height - logoH) / 2;
      // White bg behind logo
      ctx.fillStyle = '#ffffff';
      const pad = logoW * 0.1;
      roundRect(ctx, x - pad, y - pad, logoW + pad * 2, logoH + pad * 2, 6);
      ctx.fill();
      ctx.drawImage(img, x, y, logoW, logoH);
      resolve();
    };
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ──────────────────────────────────────────
   Live Re-render on Customise changes
   ────────────────────────────────────────── */
[fgColor, bgColor, qrSize, qrMargin, qrEc].forEach(el => {
  el.addEventListener('change', () => { if (currentQRData) generateQR(); });
});

fgColor.addEventListener('input', () => { fgColorVal.textContent = fgColor.value; });
bgColor.addEventListener('input', () => { bgColorVal.textContent = bgColor.value; });

logoSize.addEventListener('input', () => {
  logoSizeVal.textContent = logoSize.value;
  if (currentQRData && logoDataURL) generateQR();
});

/* ──────────────────────────────────────────
   Logo Upload
   ────────────────────────────────────────── */
logoDropZone.addEventListener('click', () => logoFile.click());
logoDropZone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') logoFile.click(); });

logoFile.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) handleLogoFile(file);
});

logoDropZone.addEventListener('dragover', e => {
  e.preventDefault();
  logoDropZone.classList.add('drag-over');
});
logoDropZone.addEventListener('dragleave', () => logoDropZone.classList.remove('drag-over'));
logoDropZone.addEventListener('drop', e => {
  e.preventDefault();
  logoDropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) handleLogoFile(file);
});

function handleLogoFile(file) {
  const reader = new FileReader();
  reader.onload = ev => {
    logoDataURL = ev.target.result;
    logoControls.style.display = 'block';
    logoDropZone.querySelector('span').textContent = file.name;
    if (currentQRData) generateQR();
  };
  reader.readAsDataURL(file);
}

removeLogo.addEventListener('click', () => {
  logoDataURL = null;
  logoFile.value = '';
  logoControls.style.display = 'none';
  logoDropZone.querySelector('span').textContent = 'Click or drag image here';
  if (currentQRData) generateQR();
});

/* ──────────────────────────────────────────
   Customise Accordion
   ────────────────────────────────────────── */
customiseToggle.addEventListener('click', () => {
  const expanded = customiseToggle.getAttribute('aria-expanded') === 'true';
  customiseToggle.setAttribute('aria-expanded', String(!expanded));
  customisePanel.setAttribute('aria-hidden', String(expanded));
  customisePanel.classList.toggle('open', !expanded);
});

/* ──────────────────────────────────────────
   Download
   ────────────────────────────────────────── */
function getFilename(ext) {
  const manual = filenameInput.value.trim();
  if (manual) return `${sanitize(manual)}.${ext}`;
  if (currentQRMeta) return `${sanitize(currentQRMeta.label) || 'qr'}qr.${ext}`;
  return `qr.${ext}`;
}

function sanitize(str) {
  return str.replace(/[^a-z0-9_\-]/gi, '').toLowerCase().slice(0, 40);
}

downloadPng.addEventListener('click', () => downloadCanvas('png'));
downloadJpg.addEventListener('click', () => downloadCanvas('jpg'));

function downloadCanvas(fmt) {
  if (!currentQRData) return;
  const mime = fmt === 'jpg' ? 'image/jpeg' : 'image/png';
  const name = getFilename(fmt);

  // For JPG, flatten transparency
  if (fmt === 'jpg') {
    const tmp = document.createElement('canvas');
    tmp.width  = qrCanvas.width;
    tmp.height = qrCanvas.height;
    const ctx = tmp.getContext('2d');
    ctx.fillStyle = bgColor.value || '#ffffff';
    ctx.fillRect(0, 0, tmp.width, tmp.height);
    ctx.drawImage(qrCanvas, 0, 0);
    triggerDownload(tmp.toDataURL(mime, 0.95), name);
  } else {
    triggerDownload(qrCanvas.toDataURL(mime), name);
  }
  showToast(`Downloaded as ${name}`);
}

downloadSvg.addEventListener('click', downloadSVG);

function downloadSVG() {
  if (!currentQRData) return;
  const opts = getOptions();
  const svg  = generateSVGString(currentQRData, opts);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const name = getFilename('svg');
  triggerDownload(url, name);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(`Downloaded as ${name}`);
}

function triggerDownload(href, name) {
  const a = document.createElement('a');
  a.href     = href;
  a.download = name;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ──────────────────────────────────────────
   SVG Generation (basic, without logo)
   ────────────────────────────────────────── */
function generateSVGString(data, opts) {
  // Use a hidden canvas to get pixel data, then convert to SVG rectangles
  const tmp = document.createElement('canvas');
  tmp.width  = opts.size;
  tmp.height = opts.size;
  QrCreator.render({
    text: data,
    radius: 0,
    ecLevel: opts.ec,
    fill: opts.fg,
    background: opts.bg,
    size: opts.size,
  }, tmp);

  const ctx      = tmp.getContext('2d');
  const imgData  = ctx.getImageData(0, 0, opts.size, opts.size);
  const pixels   = imgData.data;
  const cellSize = 1;
  let rects = '';

  for (let y = 0; y < opts.size; y++) {
    for (let x = 0; x < opts.size; x++) {
      const i = (y * opts.size + x) * 4;
      const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
      const hex = '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
      if (hex.toLowerCase() !== opts.bg.toLowerCase()) {
        rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${opts.fg}"/>`;
      }
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${opts.size} ${opts.size}" width="${opts.size}" height="${opts.size}">
  <rect width="${opts.size}" height="${opts.size}" fill="${opts.bg}"/>
  ${rects}
</svg>`;
}

/* ──────────────────────────────────────────
   Copy URL
   ────────────────────────────────────────── */
copyUrlBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  if (!url) { showToast('Nothing to copy.', 'error'); return; }
  try {
    await navigator.clipboard.writeText(url);
    showToast('URL copied to clipboard!', 'success');
  } catch {
    showToast('Copy failed — try manually.', 'error');
  }
});

/* ──────────────────────────────────────────
   Clear Form
   ────────────────────────────────────────── */
clearBtn.addEventListener('click', () => {
  // Clear all inputs
  document.querySelectorAll('.field-input, .field-select, .field-textarea').forEach(el => {
    if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = '';
  });
  document.querySelectorAll('input[type="checkbox"]').forEach(el => el.checked = false);
  clearError();
  resetPreview();
  currentQRData = null;
  currentQRMeta = null;
  showToast('Form cleared.');
});

function resetPreview() {
  previewPlaceholder.style.display = 'flex';
  previewLoading.style.display     = 'none';
  previewCanvas.style.display      = 'none';
  previewArea.classList.remove('has-qr');
  downloadRow.style.display        = 'none';
}

/* ──────────────────────────────────────────
   Validation Helpers
   ────────────────────────────────────────── */
function isValidURL(str) {
  try { const u = new URL(str); return ['http:','https:'].includes(u.protocol); }
  catch { return false; }
}

function showError(el, msg) {
  el.textContent = msg;
  const input = el.previousElementSibling?.querySelector?.('input') ||
                el.parentElement?.querySelector?.('input');
  if (input) input.classList.add('error');
}
function clearError() {
  urlError.textContent = '';
  urlInput.classList.remove('error');
}

/* ──────────────────────────────────────────
   Utility
   ────────────────────────────────────────── */
function extractSiteName(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host.split('.')[0];
  } catch { return 'qr'; }
}

function escapeSemicolon(s) {
  return s.replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/"/g,'\\"');
}

/* ──────────────────────────────────────────
   Toast
   ────────────────────────────────────────── */
let toastTimer = null;
function showToast(msg, type = '') {
  toast.textContent = msg;
  toast.className = 'toast show' + (type ? ` ${type}` : '');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 2800);
}

/* ──────────────────────────────────────────
   History
   ────────────────────────────────────────── */
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) || '[]'); }
  catch { return []; }
}

function saveHistory(items) {
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(items));
  updateHistoryBadge(items.length);
}

function updateHistoryBadge(count) {
  if (count > 0) {
    historyBadge.textContent = count;
    historyBadge.style.display = 'inline-flex';
    historyBadge.setAttribute('aria-label', `${count} history items`);
  } else {
    historyBadge.style.display = 'none';
  }
}

function saveToHistory(result) {
  const items = loadHistory();
  const thumb = qrCanvas.toDataURL('image/png');
  const entry = {
    id:    Date.now(),
    type:  result.type,
    label: result.label,
    data:  result.data,
    thumb,
    opts:  getOptions(),
    date:  new Date().toISOString(),
  };
  items.unshift(entry);
  if (items.length > MAX_HISTORY) items.splice(MAX_HISTORY);
  saveHistory(items);
}

function renderHistory() {
  const items = loadHistory();
  historyGrid.innerHTML = '';
  if (items.length === 0) {
    historyEmpty.style.display = 'flex';
    return;
  }
  historyEmpty.style.display = 'none';

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.setAttribute('role', 'listitem');

    const dateStr = new Date(item.date).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    card.innerHTML = `
      <img class="history-card-img" src="${item.thumb}" alt="QR code for ${escapeHtml(item.label)}" loading="lazy" />
      <div class="history-card-meta">
        <span class="history-card-type">${escapeHtml(item.type)}</span>
        <div class="history-card-label" title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</div>
        <div class="history-card-date">${dateStr}</div>
      </div>
      <div class="history-card-actions">
        <button class="btn btn-ghost" data-id="${item.id}" data-action="download" aria-label="Download QR code for ${escapeHtml(item.label)}">↓ PNG</button>
        <button class="btn btn-ghost" data-id="${item.id}" data-action="delete" aria-label="Delete history item for ${escapeHtml(item.label)}">🗑</button>
      </div>
    `;
    historyGrid.appendChild(card);
  });

  // Delegate events
  historyGrid.addEventListener('click', handleHistoryAction);
}

function handleHistoryAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id     = parseInt(btn.dataset.id, 10);
  const action = btn.dataset.action;
  const items  = loadHistory();
  const item   = items.find(i => i.id === id);
  if (!item) return;

  if (action === 'download') {
    triggerDownload(item.thumb, `${sanitize(item.label) || 'qr'}qr.png`);
    showToast('Downloaded!', 'success');
  } else if (action === 'delete') {
    const updated = items.filter(i => i.id !== id);
    saveHistory(updated);
    renderHistory();
    showToast('Removed from history.');
  }
}

clearHistoryBtn.addEventListener('click', () => {
  if (!confirm('Clear all QR code history?')) return;
  saveHistory([]);
  renderHistory();
  showToast('History cleared.');
});

/* ──────────────────────────────────────────
   PWA — Service Worker & Install
   ────────────────────────────────────────── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      // SW registration failed — not critical for functionality
    });
  });
}

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstall = e;
  installBanner.style.display = 'flex';
});

installBtn.addEventListener('click', async () => {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  const { outcome } = await deferredInstall.userChoice;
  deferredInstall = null;
  installBanner.style.display = 'none';
  if (outcome === 'accepted') showToast('App installed! 🎉', 'success');
});

dismissBanner.addEventListener('click', () => {
  installBanner.style.display = 'none';
});

window.addEventListener('appinstalled', () => {
  installBanner.style.display = 'none';
  showToast('App installed!', 'success');
});

/* ──────────────────────────────────────────
   HTML Escape
   ────────────────────────────────────────── */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ──────────────────────────────────────────
   Init
   ────────────────────────────────────────── */
function init() {
  initTheme();
  const hist = loadHistory();
  updateHistoryBadge(hist.length);

  // Sync color value labels
  fgColorVal.textContent = fgColor.value;
  bgColorVal.textContent = bgColor.value;
}

init();
