window.PPTStudio = window.PPTStudio || { version: 'v5.6.9', offlineRuntimeRules: new Set() };

function openModalSafe(elOrId) {
  const modal = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  if (!modal) return null;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  modal.style.display = 'flex';
  modal.style.visibility = 'visible';
  modal.style.opacity = '1';
  return modal;
}

function closeModalSafe(elOrId) {
  const modal = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  if (!modal) return null;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  modal.style.display = 'none';
  return modal;
}

function isLocalFileProtocol() {
  return typeof window !== 'undefined' && window.location && window.location.protocol === 'file:';
}
/* ==================== GLOBAL APPLICATION STATE ==================== */
let currentSlide = 1;
let slides = [];
let totalSlides = 19;
let isEditMode = false;
let isInteractiveTestMode = false;
function isActiveEditing() { return Boolean(isEditMode && !isInteractiveTestMode); }
function isCurrentSlideLocked(notify, slideOnly) {
  if (!slideOnly && typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive()) return false;
  const s = (typeof slides !== 'undefined' && Array.isArray(slides)) ? slides[currentSlide - 1] : null;
  const locked = Boolean(s && s.getAttribute('data-slide-locked') === 'true');
  if (locked && notify && typeof showToast === 'function') showToast('잠긴 슬라이드에서는 요소를 추가하거나 변경할 수 없습니다.');
  return locked;
}

// Selection & Text Formatting State
let selectedElement = null;
let selectedElements = [];
let lastFocusedEditable = null;
let isFormatPainterActive = false;
let copiedFormatStyle = null;

// Studio Inspector & Media/Effect State
let studioPopupWin = null;
let currentStudioTab = 'design';
let fcStudioPopupWin = null;
let activeChartCellTarget = null;
let tocModalMode = 'synced';
let currentGradMode = 'fill';
let currentGradType = 'linear';
let currentGradAngle = 135;
let currentBlurPx = 0;
let bgUploadTarget = 'slide';
let activeImageSlot = null;
let isWideAspect = false;
let lensAspectStage = 0;

// Interactive Trigger & Navigation State
let isPickingTriggerTarget = false;
let isSnapEnabled = true;
let isCardLinkedResizeEnabled = true;
let activeEditingFloatingCardId = null;
let activeEditingContext = 'slide'; // 'slide' | 'floating-card'

function getActiveFcPreviewCanvas() {
  const modal = document.getElementById('floatingCardEditorModal');
  const isOpen = Boolean(modal && !modal.classList.contains('hidden')) || Boolean(typeof fcStudioPopupWin !== 'undefined' && fcStudioPopupWin && !fcStudioPopupWin.closed);
  if (!isOpen) return null;
  return (typeof $fc === 'function') ? $fc('fcRichBodyEditor') : document.getElementById('fcRichBodyEditor');
}

function isFloatingCardCanvasActive() {
  return activeEditingContext === 'floating-card' && Boolean(getActiveFcPreviewCanvas());
}

function setActiveEditingContext(ctx) {
  activeEditingContext = (ctx === 'floating-card' && getActiveFcPreviewCanvas()) ? 'floating-card' : 'slide';
  const badge = (typeof $studio === 'function') ? $studio('studioEditContextBadge') : document.getElementById('studioEditContextBadge');
  if (badge) {
    const isFc = activeEditingContext === 'floating-card';
    badge.classList.toggle('hidden', !isFc);
    badge.classList.toggle('inline-flex', isFc);
  }
  const panel = (typeof $fc === 'function') ? $fc('fcEditorDialogPanel') : document.getElementById('fcEditorDialogPanel');
  if (panel) {
    panel.classList.toggle('ring-2', activeEditingContext === 'floating-card');
    panel.classList.toggle('ring-gopro', activeEditingContext === 'floating-card');
  }
}
let triggerSourceBtnEl = null;
let toastTimer = null;
let touchStartX = 0;

// Undo / Redo & Auto-save State
const undoStack = [];
const redoStack = [];
const MAX_HISTORY = 30;
const dataUriToToken = new Map();
const tokenToDataUri = new Map();
let nextDataUriTokenId = 1;

let hasUnsavedChanges = false;
let hasUnexportedFileChanges = false;
let isInitialSnapshotDone = false;
let autoSaveDebounceTimer = null;

let LOGICAL_STAGE_WIDTH = 1440;
let LOGICAL_STAGE_HEIGHT = 810;
let currentDeckAspectMode = '16:9';
let currentStageScale = 1;
let initialDeckStageHtml = '';
let recentColorsList = ['#0055FF', '#111111', '#FFE600', '#059669', '#E11D48', '#7C3AED'];
let userZoomFactor = 1;
let stagePanX = 0;
let stagePanY = 0;
let isSpacePanningMode = false;
let isolatedGroupId = null;
let presenterPopupWin = null;
let autoPlayKioskTimer = null;
window.__pptSessionMediaBlobs = window.__pptSessionMediaBlobs || new Map();

function getStageScale() {
  return currentStageScale > 0 ? currentStageScale : 1;
}

function syncResponsiveElementOffsets() {
  const activeSlide = slides[currentSlide - 1] || document.querySelector('.slide.active');
  if (!activeSlide) return;
  const slideW = LOGICAL_STAGE_WIDTH || 1440;
  const slideH = LOGICAL_STAGE_HEIGHT || 810;

  // Backfill normalized ratios for legacy elements that only have pixel data-offset-x / data-offset-y
  document.querySelectorAll('[data-offset-x], [data-offset-y]').forEach(el => {
    if (!el.hasAttribute('data-offset-rx') && !el.hasAttribute('data-offset-ry')) {
      const legacyX = parseFloat(el.getAttribute('data-offset-x') || '0') || 0;
      const legacyY = parseFloat(el.getAttribute('data-offset-y') || '0') || 0;
      if (legacyX !== 0 || legacyY !== 0) {
        el.setAttribute('data-offset-rx', (legacyX / 1440).toFixed(6));
        el.setAttribute('data-offset-ry', (legacyY / 810).toFixed(6));
      }
    }
  });

  document.querySelectorAll('[data-offset-rx], [data-offset-ry]').forEach(el => {
    const rx = parseFloat(el.getAttribute('data-offset-rx') || '0') || 0;
    const ry = parseFloat(el.getAttribute('data-offset-ry') || '0') || 0;
    const nextPxX = Math.round(rx * slideW);
    const nextPxY = Math.round(ry * slideH);
    el.setAttribute('data-offset-x', String(nextPxX));
    el.setAttribute('data-offset-y', String(nextPxY));
    el.style.transform = (nextPxX === 0 && nextPxY === 0) ? '' : `translate(${nextPxX}px, ${nextPxY}px)`;
  });

  syncResponsiveCardHeights();
}

function syncResponsiveCardHeights() {
  document.querySelectorAll('.slide-grid-body').forEach(gridBody => {
    if (gridBody.getAttribute('data-bento-2d') === 'true') return;
    const logicalClientH = gridBody.clientHeight;
    if (logicalClientH <= 0) return;
    const gbCs = window.getComputedStyle(gridBody);
    const padY = (parseFloat(gbCs.paddingTop) || 0) + (parseFloat(gbCs.paddingBottom) || 0);
    const innerAvailH = Math.max(120, Math.floor(logicalClientH - padY));

    gridBody.querySelectorAll(':scope > .slide-card').forEach(card => {
      const ratioStr = card.getAttribute('data-bento-h-ratio');
      if (ratioStr) {
        const ratio = parseFloat(ratioStr);
        if (!isNaN(ratio) && ratio > 0) {
          const isTitle = card.classList.contains('slide-title-card') || card.hasAttribute('data-title-card');
          const minH = isTitle ? 54 : 80;
          const nextH = Math.max(minH, Math.min(innerAvailH, Math.round(ratio * innerAvailH)));
          card.style.height = `${nextH}px`;
          card.style.minHeight = `${nextH}px`;
          card.style.maxHeight = `${nextH}px`;
          return;
        }
      }
      // Clamp any legacy fixed-pixel height that exceeds current viewport innerAvailH
      if (card.style.height && card.style.height.endsWith('px')) {
        const px = parseFloat(card.style.height);
        if (!isNaN(px) && px > innerAvailH) {
          card.style.height = `${innerAvailH}px`;
          card.style.minHeight = `${innerAvailH}px`;
          card.style.maxHeight = `${innerAvailH}px`;
          card.setAttribute('data-bento-h-ratio', '1.000000');
        }
      }
    });
  });
}

function isBrowserInFullscreen() {
  if (document.fullscreenElement || document.webkitFullscreenElement) return true;
  if (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches) return true;
  if (typeof screen !== 'undefined' && screen.width > 0 && screen.height > 0 && Math.abs(window.innerWidth - screen.width) <= 2 && Math.abs(window.innerHeight - screen.height) <= 2) return true;
  return false;
}

let __wasEditingBeforeFullscreen = false;
function syncFullscreenBodyClass() {
  const isFs = isBrowserInFullscreen();
  const wasFs = document.body.classList.contains('is-fullscreen');
  if (isFs && !wasFs) {
    __wasEditingBeforeFullscreen = Boolean(isEditMode);
    if (isEditMode && typeof toggleEditMode === 'function') {
      toggleEditMode(false);
    }
    userZoomFactor = 1;
    stagePanX = 0;
    stagePanY = 0;
  }
  document.body.classList.toggle('is-fullscreen', isFs);
  if (!isFs && wasFs && __wasEditingBeforeFullscreen) {
    __wasEditingBeforeFullscreen = false;
    if (!isEditMode && typeof toggleEditMode === 'function') {
      toggleEditMode(true);
    }
  }
  updateStageViewportScale();
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      updateStageViewportScale();
      requestAnimationFrame(() => updateStageViewportScale());
    });
  }
}
document.addEventListener('fullscreenchange', syncFullscreenBodyClass);
document.addEventListener('webkitfullscreenchange', syncFullscreenBodyClass);

function setDeckAspectRatio(ratioStr, silent) {
  const mode = ratioStr === '4:3' ? '4:3' : (ratioStr === '9:16' ? '9:16' : '16:9');
  currentDeckAspectMode = mode;
  let printCss = '@media print { @page { size: 15in 8.4375in; margin: 0; } html, body, #pptWorkspaceShell, #slideStage, html body #slideStage .slide { width: 1440px !important; } html body #slideStage .slide { height: 810px !important; } }';
  if (mode === '4:3') {
    LOGICAL_STAGE_WIDTH = 1080;
    LOGICAL_STAGE_HEIGHT = 810;
    printCss = '@media print { @page { size: 11.25in 8.4375in; margin: 0; } html, body, #pptWorkspaceShell, #slideStage, html body #slideStage .slide { width: 1080px !important; } html body #slideStage .slide { height: 810px !important; } }';
  } else if (mode === '9:16') {
    LOGICAL_STAGE_WIDTH = 810;
    LOGICAL_STAGE_HEIGHT = 1440;
    printCss = '@media print { @page { size: 8.4375in 15in; margin: 0; } html, body, #pptWorkspaceShell, #slideStage, html body #slideStage .slide { width: 810px !important; } html body #slideStage .slide { height: 1440px !important; } }';
  } else {
    LOGICAL_STAGE_WIDTH = 1440;
    LOGICAL_STAGE_HEIGHT = 810;
  }
  document.documentElement.style.setProperty('--stage-w', `${LOGICAL_STAGE_WIDTH}px`);
  document.documentElement.style.setProperty('--stage-h', `${LOGICAL_STAGE_HEIGHT}px`);
  const stEl = document.getElementById('slideStage');
  if (stEl) stEl.setAttribute('data-aspect-ratio', mode);
  if (document.body) document.body.setAttribute('data-aspect-ratio', mode);
  let dynPrint = document.getElementById('pptDynamicPrintPageStyle');
  if (!dynPrint) {
    dynPrint = document.createElement('style');
    dynPrint.id = 'pptDynamicPrintPageStyle';
    document.head.appendChild(dynPrint);
  }
  dynPrint.textContent = printCss;
  const sel1 = $studio('deckAspectRatioSelect');
  const sel2 = document.getElementById('ctxAspectRatioSelect');
  if (sel1) sel1.value = mode;
  if (sel2) sel2.value = mode;
  updateStageViewportScale();
  if (typeof updateSlideConnectors === 'function') updateSlideConnectors();
  if (typeof syncFloatingCardLightboxScale === 'function') syncFloatingCardLightboxScale();
  if (typeof presenterPopupWin !== 'undefined' && presenterPopupWin && !presenterPopupWin.closed && presenterPopupWin.document) {
    presenterPopupWin.document.documentElement.style.setProperty('--stage-w', `${LOGICAL_STAGE_WIDTH}px`);
    presenterPopupWin.document.documentElement.style.setProperty('--stage-h', `${LOGICAL_STAGE_HEIGHT}px`);
    if (typeof syncPresenterWindowState === 'function') syncPresenterWindowState();
  }
  if (!silent) {
    if (typeof saveHistorySnapshot === 'function') saveHistorySnapshot(`슬라이드 비율 (${mode})`);
    showToast(`슬라이드 화면 비율이 ${mode} (${LOGICAL_STAGE_WIDTH}×${LOGICAL_STAGE_HEIGHT})로 전환되었습니다.`);
  }
}

function recordRecentColor(hex) {
  if (!hex || !/^#[0-9a-fA-F]{3,8}$/.test(hex)) return;
  const upper = hex.toUpperCase();
  recentColorsList = [upper, ...recentColorsList.filter(c => c !== upper)].slice(0, 8);
  renderRecentColorsSwatches();
}

function renderRecentColorsSwatches() {
  const htmlStr = recentColorsList.map(c =>
    `<button type="button" data-on-mousedown="event.preventDefault(); applyQuickRecentColor('${c}', this)" title="최근 사용 색상: ${c}" class="w-4 h-4 rounded-full border border-borderline cursor-pointer shrink-0" style="background:${c};"></button>`
  ).join('');
  document.querySelectorAll('.recent-colors-row').forEach(wrap => { wrap.innerHTML = htmlStr; });
  if (typeof studioPopupWin !== 'undefined' && studioPopupWin && !studioPopupWin.closed && studioPopupWin.document) {
    studioPopupWin.document.querySelectorAll('.recent-colors-row').forEach(wrap => { wrap.innerHTML = htmlStr; });
  }
}

function applyQuickRecentColor(hex, triggerEl) {
  recordRecentColor(hex);
  const inShapeBar = Boolean(triggerEl && triggerEl.closest && triggerEl.closest('#ctxBar-shape'));
  if (inShapeBar && selectedElement && typeof updateSelectedShapeStyle === 'function') {
    updateSelectedShapeStyle('fill', hex, false);
    return;
  }
  const target = typeof getTargetTextEl === 'function' ? getTargetTextEl() : null;
  if (target && (!selectedElement || selectedElement === target || selectedElement.contains(target))) {
    if (typeof applyTextColor === 'function') {
      applyTextColor(hex, false);
      return;
    }
  }
  if (typeof updateSelectedShapeStyle === 'function' && selectedElement) {
    updateSelectedShapeStyle('fill', hex, false);
  }
}

async function pickColorWithEyeDropper(targetKind) {
  if (typeof window.EyeDropper !== 'function') {
    showToast(isLocalFileProtocol()
      ? '로컬 파일(file://) 직접 실행 시 브라우저 보안 정책상 스포이드가 제한됩니다. 컬러 피커를 이용해 주세요.'
      : '현재 브라우저에서는 화면 스포이드를 지원하지 않습니다. 컬러 피커를 이용해 주세요.');
    return;
  }
  try {
    const dropper = new window.EyeDropper();
    const res = await dropper.open();
    if (res && res.sRGBHex) {
      const hex = res.sRGBHex.toUpperCase();
      recordRecentColor(hex);
      if (targetKind === 'text' && typeof applyTextColor === 'function') applyTextColor(hex, false);
      else if (targetKind === 'fill' && typeof updateSelectedShapeStyle === 'function') updateSelectedShapeStyle('fill', hex, false);
      else if (targetKind === 'border' && typeof updateSelectedShapeStyle === 'function') updateSelectedShapeStyle('borderColor', hex, false);
      showToast(`스포이드 추출 색상 적용: ${hex}`);
    }
  } catch (e) {}
}

function updateStageViewportScale() {
  const stage = document.getElementById('slideStage');
  if (!stage) return;
  const isFs = isBrowserInFullscreen();
  if (document.body.classList.contains('is-fullscreen') !== isFs) {
    document.body.classList.toggle('is-fullscreen', isFs);
  }
  const rect = stage.getBoundingClientRect();
  const availW = isFs ? window.innerWidth : Math.max(120, rect.width);
  const availH = isFs ? window.innerHeight : Math.max(90, rect.height);

  const baseFitScale = Math.min(availW / LOGICAL_STAGE_WIDTH, availH / LOGICAL_STAGE_HEIGHT);
  const safeBase = baseFitScale > 0 ? baseFitScale : 1;
  currentStageScale = Math.max(0.15, safeBase * userZoomFactor);
  const prevScaleStr = document.documentElement.style.getPropertyValue('--stage-scale').trim();
  const nextScaleStr = currentStageScale.toFixed(6);
  const scaleChanged = prevScaleStr !== '' && prevScaleStr !== nextScaleStr;
  if (scaleChanged) document.body.classList.add('stage-rescaling');
  document.body.classList.add('scaled-stage');
  document.documentElement.style.setProperty('--stage-w', `${LOGICAL_STAGE_WIDTH}px`);
  document.documentElement.style.setProperty('--stage-h', `${LOGICAL_STAGE_HEIGHT}px`);
  document.documentElement.style.setProperty('--stage-scale', nextScaleStr);
  document.documentElement.style.setProperty('--stage-pan-x', `${Math.round(stagePanX)}px`);
  document.documentElement.style.setProperty('--stage-pan-y', `${Math.round(stagePanY)}px`);
  if (scaleChanged) {
    void stage.offsetWidth;
    document.body.classList.remove('stage-rescaling');
  }
  const zoomLbl = document.getElementById('stageZoomLabel');
  if (zoomLbl) zoomLbl.textContent = `${Math.round(userZoomFactor * 100)}%`;
  if (typeof renderRulerTicks === 'function') renderRulerTicks();
  if (typeof updateSlideConnectors === 'function') updateSlideConnectors();

  const activeSlide = slides[currentSlide - 1] || document.querySelector('.slide.active');
  if (activeSlide) {
    const bgCol = activeSlide.style.backgroundColor || window.getComputedStyle(activeSlide).backgroundColor;
    if (bgCol && bgCol !== 'rgba(0, 0, 0, 0)' && bgCol !== 'transparent') {
      stage.style.backgroundColor = bgCol;
    }
  }

  syncResponsiveElementOffsets();
  if (typeof positionSelectionOverlay === 'function') {
    positionSelectionOverlay();
  }
}


function setStageZoom(zoomPct) {
  const clampedPct = Math.max(50, Math.min(200, Math.round(Number(zoomPct) || 100)));
  userZoomFactor = clampedPct / 100;
  if (clampedPct === 100) { stagePanX = 0; stagePanY = 0; }
  updateStageViewportScale();
}
function adjustStageZoom(deltaPct) { setStageZoom(Math.round(userZoomFactor * 100) + deltaPct); }
function resetStageZoomAndPan() {
  userZoomFactor = 1; stagePanX = 0; stagePanY = 0;
  updateStageViewportScale();
  showToast('캔버스 배율이 화면 맞춤(100%)으로 초기화되었습니다.');
}

/* ==================== COMMON UTILITY & DOM HELPERS ==================== */
function $studio(id) {
  if (studioPopupWin && !studioPopupWin.closed) {
    const el = studioPopupWin.document.getElementById(id);
    if (el) return el;
  }
  return document.getElementById(id);
}

function showToast(msg) {
  const toast = document.getElementById('toastBox');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove('opacity-0');
  toast.classList.add('opacity-100');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('opacity-100');
    toast.classList.add('opacity-0');
  }, 2400);
}

function hexToRgba(hex, alphaPct) {
  let clean = String(hex || '#0055FF').trim().replace(/^#/, '');
  if (clean.length === 3) clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  if (!/^[0-9a-fA-F]{6}/.test(clean)) clean = '0055FF';
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  const parsedAlpha = Number(alphaPct);
  const a = Math.max(0, Math.min(1, (Number.isFinite(parsedAlpha) ? parsedAlpha : 100) / 100));
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
}

function rgbToHex(rgb) {
  if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return null;
  if (rgb.startsWith('#')) return rgb;
  const m = rgb.match(/\d+/g);
  if (!m || m.length < 3) return null;
  return '#' + [m[0], m[1], m[2]].map(x => Number(x).toString(16).padStart(2, '0')).join('');
}

function escapeAttr(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function ensureFreeLayersOnAllSlides() {
  document.querySelectorAll('.slide').forEach(slide => {
    if (!slide.querySelector('.slide-bg-layer')) {
      const bg = document.createElement('div');
      bg.className = 'slide-bg-layer';
      slide.insertBefore(bg, slide.firstChild);
    }
    if (!slide.querySelector('.slide-bg-overlay')) {
      const ov = document.createElement('div');
      ov.className = 'slide-bg-overlay';
      const bg = slide.querySelector('.slide-bg-layer');
      bg.insertAdjacentElement('afterend', ov);
    }
    if (!slide.querySelector('.ppt-free-layer')) {
      const free = document.createElement('div');
      free.className = 'ppt-free-layer';
      slide.appendChild(free);
    }
  });
  ensureSlideHeaderBarsOnAllSlides();
}

function ensureSlideHeaderBarsOnAllSlides() {
  document.querySelectorAll('.slide').forEach(slide => {
    const gridBody = slide.querySelector('.slide-grid-body');
    if (!gridBody) return;
    Array.from(slide.children).forEach(ch => {
      if (ch === gridBody) return;
      if (ch.tagName === 'DIV' &&
          !ch.classList.contains('slide-bg-layer') &&
          !ch.classList.contains('slide-bg-overlay') &&
          !ch.classList.contains('ppt-free-layer') &&
          !ch.classList.contains('slide-header-bar')) {
        ch.classList.add('slide-header-bar');
      }
    });
  });
}

function ensureCardBgLayer(card) {
  let bgLayer = card.querySelector('.card-bg-layer');
  if (!bgLayer) {
    bgLayer = document.createElement('div');
    bgLayer.className = 'card-bg-layer';
    if (card.style.backgroundImage) {
      bgLayer.style.backgroundImage = card.style.backgroundImage;
      card.style.backgroundImage = '';
    }
    card.insertBefore(bgLayer, card.firstChild);
  }
  return bgLayer;
}



function ensureCardHoverBgLayer(card) {
  let hoverLayer = card.querySelector('.card-hover-bg-layer');
  if (!hoverLayer) {
    hoverLayer = document.createElement('div');
    hoverLayer.className = 'card-hover-bg-layer';
    const bgLayer = ensureCardBgLayer(card);
    bgLayer.insertAdjacentElement('afterend', hoverLayer);
  }
  return hoverLayer;
}

function ensureCardBgTintLayer(card) {
  let tintLayer = card.querySelector('.card-bg-tint');
  if (!tintLayer) {
    tintLayer = document.createElement('div');
    tintLayer.className = 'card-bg-tint';
    const bgLayer = ensureCardBgLayer(card);
    bgLayer.insertAdjacentElement('afterend', tintLayer);
  }
  return tintLayer;
}

function getTargetCardForHierarchy() {
  if (!selectedElement) return null;
  if (selectedElement.classList.contains('slide-card') || selectedElement.classList.contains('slide-header-bar') || (selectedElement.classList.contains('ppt-free-obj') && selectedElement.getAttribute('data-shape-type') === 'freeCard')) return selectedElement;
  return selectedElement.closest('.slide-card, .slide-header-bar, .ppt-free-obj[data-shape-type="freeCard"]');
}

function getActiveGridBody() {
  const activeSlideEl = slides[currentSlide - 1];
  return activeSlideEl ? activeSlideEl.querySelector('.slide-grid-body') : null;
}

function rewriteVideoSrcForExport(rootEl) {
  if (!rootEl) return;
  rootEl.querySelectorAll('video[data-media-name], audio[data-media-name]').forEach(mediaEl => {
    const rawSrc = (mediaEl.getAttribute('src') || '').trim();
    const mediaName = (mediaEl.getAttribute('data-media-name') || '').trim();
    if (rawSrc.startsWith('blob:') && mediaName) {
      mediaEl.setAttribute('src', 'media/' + mediaName);
    }
  });
}

function ensureRuntimeOfflineUtilityClass(tok) {
  if (!tok || window.PPTStudio.offlineRuntimeRules.has(tok)) return;
  window.PPTStudio.offlineRuntimeRules.add(tok);
  const parts = tok.split(':');
  const core = parts[parts.length - 1];
  const prefixes = parts.slice(0, -1);
  let decl = null;
  let m;
  if ((m = core.match(/^bg-\[(#[0-9a-fA-F]{3,8}|rgba?\([^\]]+\))\]$/))) decl = `background-color: ${m[1]};`;
  else if ((m = core.match(/^text-\[(#[0-9a-fA-F]{3,8}|rgba?\([^\]]+\))\]$/))) decl = `color: ${m[1]};`;
  else if ((m = core.match(/^border-\[(#[0-9a-fA-F]{3,8}|rgba?\([^\]]+\))\]$/))) decl = `border-color: ${m[1]};`;
  else if ((m = core.match(/^text-\[(\d+(?:\.\d+)?(?:px|rem|em))\]$/))) decl = `font-size: ${m[1]};`;
  else if ((m = core.match(/^grid-cols-(\d{1,2})$/))) decl = `grid-template-columns: repeat(${m[1]}, minmax(0, 1fr));`;
  else if ((m = core.match(/^col-span-(\d{1,2})$/))) decl = `grid-column: span ${m[1]} / span ${m[1]};`;
  if (!decl) return;
  let styleEl = document.getElementById('pptRuntimeOfflineUtilities');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'pptRuntimeOfflineUtilities';
    const baseCssEl = document.head.querySelector('link[href="css/base.css"], style[data-inlined-css="css/base.css"]');
    if (baseCssEl) document.head.insertBefore(styleEl, baseCssEl);
    else document.head.appendChild(styleEl);
  }
  const escaped = tok.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
  let sel = '.' + escaped + (prefixes.includes('hover') ? ':hover' : '');
  let rule = `${sel} { ${decl} }`;
  if (prefixes.includes('md')) rule = `@media (min-width: 768px) { ${rule} }`;
  else if (prefixes.includes('lg')) rule = `@media (min-width: 1024px) { ${rule} }`;
  styleEl.textContent += '\n' + rule;
}

function initOfflineRuntimeUtilityObserver() {
  if (typeof MutationObserver !== 'function' || !document.body) return;
  const scanNode = (el) => {
    if (!el || el.nodeType !== 1) return;
    if (el.classList) el.classList.forEach(c => ensureRuntimeOfflineUtilityClass(c));
    el.querySelectorAll?.('[class]').forEach(child => child.classList.forEach(c => ensureRuntimeOfflineUtilityClass(c)));
  };
  scanNode(document.body);
  const obs = new MutationObserver((muts) => {
    muts.forEach(mut => {
      if (mut.type === 'attributes' && mut.target.classList) {
        mut.target.classList.forEach(c => ensureRuntimeOfflineUtilityClass(c));
      } else if (mut.type === 'childList') {
        mut.addedNodes.forEach(scanNode);
      }
    });
  });
  obs.observe(document.body, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });
}

function cloneDocumentStylesToPopup(targetWin) {
  if (!targetWin || !targetWin.document || !targetWin.document.head) return;
  const targetDoc = targetWin.document;
  const bundleCss = (window.PPT_STANDALONE_BUNDLE && window.PPT_STANDALONE_BUNDLE.css) ? window.PPT_STANDALONE_BUNDLE.css : {};
  document.querySelectorAll('head link[rel="stylesheet"], head style').forEach(node => {
    if (node.tagName === 'LINK') {
      const relHref = (node.getAttribute('href') || '').trim();
      if (node.getAttribute('media') === 'print') return;
      if (bundleCss[relHref]) {
        const st = targetDoc.createElement('style');
        st.setAttribute('data-cloned-css', relHref);
        st.textContent = bundleCss[relHref];
        targetDoc.head.appendChild(st);
      } else if (node.href) {
        const ln = targetDoc.createElement('link');
        ln.rel = 'stylesheet';
        ln.href = node.href;
        targetDoc.head.appendChild(ln);
      }
    } else if (node.tagName === 'STYLE') {
      if (node.getAttribute('media') === 'print') return;
      const st = targetDoc.createElement('style');
      st.textContent = node.textContent || '';
      targetDoc.head.appendChild(st);
    }
  });
}
