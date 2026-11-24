/* ==================== GRADIENT & ALPHA MASK ENGINE ==================== */
function setGradientMode(mode) {
  currentGradMode = mode;
  const rootDoc = (studioPopupWin && !studioPopupWin.closed) ? studioPopupWin.document : document;
  rootDoc.querySelectorAll('.grad-mode-btn').forEach(btn => {
    const isMatch = btn.getAttribute('data-grad-mode') === mode;
    btn.classList.toggle('is-active', isMatch);
    btn.classList.toggle('bg-ink', isMatch);
    btn.classList.toggle('text-white', isMatch);
    btn.classList.toggle('bg-canvas', !isMatch);
    btn.classList.toggle('text-ink', !isMatch);
  });
  previewAndApplyGradient();
}

function setGradientType(type) {
  currentGradType = type;
  const rootDoc = (studioPopupWin && !studioPopupWin.closed) ? studioPopupWin.document : document;
  rootDoc.querySelectorAll('.grad-type-btn').forEach(btn => {
    const isMatch = btn.getAttribute('data-grad-type') === type;
    btn.classList.toggle('is-active', isMatch);
    btn.classList.toggle('bg-gopro', isMatch);
    btn.classList.toggle('text-white', isMatch);
    btn.classList.toggle('bg-canvas', !isMatch);
  });
  previewAndApplyGradient();
}

function setGradientAngle(deg) {
  currentGradAngle = Number(deg) || 0;
  const slider = $studio('gradAngleSlider');
  const label = $studio('gradAngleLabel');
  if (slider) slider.value = String(currentGradAngle);
  if (label) label.textContent = `${currentGradAngle}°`;
  previewAndApplyGradient();
}

function buildGradientCssString(forceMaskMode) {
  const isMask = forceMaskMode !== undefined ? forceMaskMode : (currentGradMode === 'mask');
  const c1 = $studio('gradColorStart')?.value || '#0055FF';
  const a1 = $studio('gradAlphaStart')?.value ?? 100;
  const c2 = $studio('gradColorMid')?.value || '#38BDF8';
  const a2 = $studio('gradAlphaMid')?.value ?? 50;
  const c3 = $studio('gradColorEnd')?.value || '#0B192C';
  const a3 = $studio('gradAlphaEnd')?.value ?? 0;
  const useMid = $studio('gradUseMid')?.checked;

  const rgba1 = isMask ? hexToRgba('#000000', a1) : hexToRgba(c1, a1);
  const rgba2 = isMask ? hexToRgba('#000000', a2) : hexToRgba(c2, a2);
  const rgba3 = isMask ? hexToRgba('#000000', a3) : hexToRgba(c3, a3);
  const stops = useMid ? `${rgba1}, ${rgba2}, ${rgba3}` : `${rgba1}, ${rgba3}`;

  if (currentGradType === 'radial') {
    return `radial-gradient(circle at center, ${stops})`;
  } else if (currentGradType === 'conic') {
    return `conic-gradient(from ${currentGradAngle}deg at 50% 50%, ${stops}, ${rgba1})`;
  }
  return `linear-gradient(${currentGradAngle}deg, ${stops})`;
}

function applyGradientToElementOrMedia(el, css, forceLayerTarget) {
  if (!el) return;
  if ((typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(false)) || el.getAttribute('data-layer-locked') === 'true') return;
  if (el.classList.contains('ppt-interactive-widget')) return;
  const isCardLike = el.classList.contains('slide-card') || el.classList.contains('slide-header-bar') || (el.classList.contains('ppt-free-obj') && el.getAttribute('data-shape-type') === 'freeCard');
  if (forceLayerTarget === 'card-hover' && isCardLike) {
    const hoverLayer = ensureCardHoverBgLayer(el);
    if (currentGradMode === 'mask') {
      hoverLayer.style.webkitMaskImage = css;
      hoverLayer.style.maskImage = css;
      hoverLayer.style.webkitMaskRepeat = 'no-repeat';
      hoverLayer.style.maskRepeat = 'no-repeat';
      hoverLayer.style.webkitMaskSize = '100% 100%';
      hoverLayer.style.maskSize = '100% 100%';
    } else {
      hoverLayer.style.backgroundImage = css;
    }
    return;
  }

  if (currentGradMode === 'mask') {
    if (isCardLike) {
      const cardBg = ensureCardBgLayer(el);
      cardBg.style.webkitMaskImage = css;
      cardBg.style.maskImage = css;
      cardBg.style.webkitMaskRepeat = 'no-repeat';
      cardBg.style.maskRepeat = 'no-repeat';
      cardBg.style.webkitMaskSize = '100% 100%';
      cardBg.style.maskSize = '100% 100%';
      return;
    }
    const maskTarget = el.querySelector('.slot-img') || el.querySelector('video') || el;
    maskTarget.style.webkitMaskImage = css;
    maskTarget.style.maskImage = css;
    maskTarget.style.webkitMaskRepeat = 'no-repeat';
    maskTarget.style.maskRepeat = 'no-repeat';
    maskTarget.style.webkitMaskSize = '100% 100%';
    maskTarget.style.maskSize = '100% 100%';
    return;
  }

  const imgSlot = el.classList.contains('image-slot-box') ? el : el.querySelector('.image-slot-box');
  if (imgSlot) {
    let ov = imgSlot.querySelector('.media-gradient-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.className = 'media-gradient-overlay';
      imgSlot.appendChild(ov);
    }
    ov.style.backgroundImage = css;
    return;
  }
  if (el.classList.contains('slide-card')) {
    const bgLayerStyle = el.querySelector('.card-bg-layer')?.style.backgroundImage || '';
    const hasBgImg = bgLayerStyle.includes('url(');
    if (hasBgImg) {
      // Layer color gradient on top of the card background photo!
      ensureCardBgTintLayer(el).style.backgroundImage = css;
    } else {
      const tint = el.querySelector('.card-bg-tint');
      if (tint && tint.style.backgroundImage && tint.style.backgroundImage.includes('gradient(')) tint.style.backgroundImage = '';
      ensureCardBgLayer(el).style.backgroundImage = css;
    }
    return;
  }
  el.style.backgroundImage = css;
}

function previewAndApplyGradient() {
  const css = buildGradientCssString();
  const bar = $studio('gradPreviewBar');
  if (bar) bar.style.background = css;
  const dirArrow = $studio('gradDirectionArrow');
  if (dirArrow) dirArrow.style.setProperty('--grad-angle', `${currentGradAngle}deg`);
  const badge = $studio('gradPreviewModeBadge');
  if (badge) {
    const modeLbl = currentGradMode === 'mask' ? '페이드마스크' : '그라데이션 채우기';
    badge.textContent = `${modeLbl} · ${currentGradAngle}°`;
  }
  const a1 = $studio('gradAlphaStart')?.value ?? 100;
  const a2 = $studio('gradAlphaMid')?.value ?? 50;
  const a3 = $studio('gradAlphaEnd')?.value ?? 0;
  if ($studio('gradAlphaStartLabel')) $studio('gradAlphaStartLabel').textContent = `${a1}%`;
  if ($studio('gradAlphaMidLabel')) $studio('gradAlphaMidLabel').textContent = `${a2}%`;
  if ($studio('gradAlphaEndLabel')) $studio('gradAlphaEndLabel').textContent = `${a3}%`;
  const rootDoc = (studioPopupWin && !studioPopupWin.closed) ? studioPopupWin.document : document;
  rootDoc.querySelectorAll('.grad-dir-preset-btn').forEach(btn => {
    const deg = Number(btn.getAttribute('data-grad-deg'));
    btn.classList.toggle('is-active', deg === Number(currentGradAngle));
  });
  if (selectedElement) {
    applyGradientToElementOrMedia(selectedElement, css);
  }
}

function flipGradientDirection() {
  const cStart = $studio('gradColorStart'), cEnd = $studio('gradColorEnd');
  const aStart = $studio('gradAlphaStart'), aEnd = $studio('gradAlphaEnd');
  if (cStart && cEnd) { const tmpC = cStart.value; cStart.value = cEnd.value; cEnd.value = tmpC; }
  if (aStart && aEnd) { const tmpA = aStart.value; aStart.value = aEnd.value; aEnd.value = tmpA; }
  setGradientAngle((Number(currentGradAngle) + 180) % 360);
  saveHistorySnapshot('그라데이션 방향 반전');
}

function applyAlphaMaskPreset(type, angle, aStart, aEnd) {
  setGradientMode('mask');
  currentGradType = type;
  currentGradAngle = angle;
  if ($studio('gradAlphaStart')) $studio('gradAlphaStart').value = String(aStart);
  if ($studio('gradAlphaEnd')) $studio('gradAlphaEnd').value = String(aEnd);
  if ($studio('gradUseMid')) $studio('gradUseMid').checked = false;
  setGradientAngle(angle);
  setGradientType(type);
  if (selectedElement) {
    applyGradientToElementOrMedia(selectedElement, buildGradientCssString(true));
    saveHistorySnapshot();
    showToast('선택한 이미지·도형에 투명화 마스크 그라데이션이 적용되었습니다.');
  } else {
    showToast('먼저 투명화 마스크를 적용할 이미지나 도형을 클릭해 주세요.');
  }
}

function applyGradientPreset(type, angle, c1, c3, a1, a3, isDarkText) {
  setGradientMode('fill');
  currentGradType = type;
  currentGradAngle = angle;
  if ($studio('gradColorStart')) $studio('gradColorStart').value = c1;
  if ($studio('gradColorEnd')) $studio('gradColorEnd').value = c3;
  if ($studio('gradAlphaStart')) $studio('gradAlphaStart').value = String(a1);
  if ($studio('gradAlphaEnd')) $studio('gradAlphaEnd').value = String(a3);
  if ($studio('gradUseMid')) $studio('gradUseMid').checked = false;
  setGradientAngle(angle);
  setGradientType(type);
  if (selectedElement) {
    applyGradientToElementOrMedia(selectedElement, buildGradientCssString(false));
    if (isDarkText && !selectedElement.querySelector('.image-slot-box') && !selectedElement.classList.contains('image-slot-box')) {
      selectedElement.style.color = '#FFFFFF';
    }
    saveHistorySnapshot('그라데이션 프리셋 적용');
    showToast('선택한 요소에 그라데이션 프리셋이 적용되었습니다.');
  } else {
    showToast('먼저 그라데이션 프리셋을 적용할 카드나 도형을 클릭해 주세요.');
  }
}

function applyGradientToTarget(targetMode) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const css = buildGradientCssString();
  if (typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive() && (targetMode === 'card' || targetMode === 'card-hover' || targetMode === 'slide')) {
    const fcEd = typeof getActiveFcPreviewCanvas === 'function' ? getActiveFcPreviewCanvas() : document.getElementById('fcRichBodyEditor');
    if (fcEd) {
      if (currentGradMode === 'mask') {
        fcEd.setAttribute(targetMode === 'card-hover' ? 'data-fc-hover-bg-mask' : 'data-fc-bg-mask', css);
      } else {
        fcEd.setAttribute(targetMode === 'card-hover' ? 'data-fc-hover-bg-img-url' : 'data-fc-bg-img-url', css);
        if (targetMode === 'card-hover') {
          const fxSel = typeof $fc === 'function' ? $fc('fcReactiveFxSelect') : document.getElementById('fcReactiveFxSelect');
          if (fxSel && fxSel.value === 'none') fxSel.value = 'hover-lift';
        }
      }
      if (typeof updateFloatingCardPreviewStyle === 'function') updateFloatingCardPreviewStyle();
      if (typeof recordFcSnapshot === 'function') recordFcSnapshot();
      showToast(currentGradMode === 'mask' ? '플로팅 카드 배경에 페이드 마스크가 적용되었습니다.' : '플로팅 카드 배경에 컬러 그라데이션이 적용되었습니다.');
      return;
    }
  }
  if (targetMode === 'card') {
    const card = getTargetCardForHierarchy();
    if (!card) {
      showToast('먼저 그라데이션/페이드 마스크를 적용할 카드를 클릭해 주세요.');
      return;
    }
    applyGradientToElementOrMedia(card, css);
    saveHistorySnapshot(currentGradMode === 'mask' ? '카드 배경 페이드 마스크 적용' : '카드 배경 그라데이션 적용');
    showToast(currentGradMode === 'mask'
      ? '선택한 카드 배경에 페이드 마스크가 적용되었습니다.'
      : '선택한 카드 배경에 컬러 그라데이션이 적용되었습니다.');
    return;
  }
  if (targetMode === 'card-hover') {
    const card = getTargetCardForHierarchy();
    if (!card) {
      showToast('먼저 호버 배경에 적용할 카드를 클릭해 주세요.');
      return;
    }
    applyGradientToElementOrMedia(card, css, 'card-hover');
    saveHistorySnapshot(currentGradMode === 'mask' ? '카드 호버 페이드 마스크 적용' : '카드 호버 그라데이션 적용');
    showToast(currentGradMode === 'mask'
      ? '카드 호버 배경 이미지에 투명화 마스크가 적용되었습니다.'
      : '카드 호버 배경에 컬러 그라데이션이 적용되었습니다.');
    return;
  }
  if (targetMode === 'selected') {
    const targets = selectedElements.length > 0 ? selectedElements : (selectedElement ? [selectedElement] : []);
    if (targets.length === 0) {
      showToast('먼저 그라데이션을 적용할 이미지·카드·도형을 클릭해 주세요.');
      return;
    }
    targets.forEach(el => applyGradientToElementOrMedia(el, css));
    saveHistorySnapshot();
    showToast(currentGradMode === 'mask'
      ? '선택한 요소에 부분 투명화 마스크가 적용되었습니다.'
      : '선택한 요소에 컬러 그라데이션이 적용되었습니다.');
  } else {
    const activeSlideEl = slides[currentSlide - 1];
    if (!activeSlideEl) return;
    ensureFreeLayersOnAllSlides();
    const bgLayer = activeSlideEl.querySelector('.slide-bg-layer');
    const bgOverlay = activeSlideEl.querySelector('.slide-bg-overlay');
    if (bgLayer) {
      if (currentGradMode === 'mask') {
        bgLayer.style.webkitMaskImage = css;
        bgLayer.style.maskImage = css;
      } else if ((bgLayer.style.backgroundImage || '').includes('url(') && bgOverlay) {
        bgOverlay.style.backgroundImage = css;
      } else {
        if (bgOverlay && (bgOverlay.style.backgroundImage || '').includes('gradient(')) bgOverlay.style.backgroundImage = '';
        bgLayer.style.backgroundImage = css;
      }
    }
    const gridBody = activeSlideEl.querySelector('.slide-grid-body');
    if (gridBody) gridBody.style.backgroundColor = 'transparent';
    saveHistorySnapshot();
    showToast('현재 슬라이드 배경에 그라데이션이 적용되었습니다.');
  }
}

function clearAppliedGradient() {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const clearGradientOnly = (node) => {
    if (!node || !node.style) return;
    if (node.style.backgroundImage && node.style.backgroundImage.includes('gradient(')) {
      node.style.backgroundImage = '';
    }
    node.style.webkitMaskImage = '';
    node.style.maskImage = '';
  };
  if (typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive()) {
    const fcEd = typeof getActiveFcPreviewCanvas === 'function' ? getActiveFcPreviewCanvas() : document.getElementById('fcRichBodyEditor');
    if (fcEd) {
      if (/^(?:linear|radial)-gradient\(/i.test(fcEd.getAttribute('data-fc-bg-img-url') || '')) fcEd.removeAttribute('data-fc-bg-img-url');
      if (/^(?:linear|radial)-gradient\(/i.test(fcEd.getAttribute('data-fc-hover-bg-img-url') || '')) fcEd.removeAttribute('data-fc-hover-bg-img-url');
      fcEd.removeAttribute('data-fc-bg-mask');
      fcEd.removeAttribute('data-fc-hover-bg-mask');
      if (typeof updateFloatingCardPreviewStyle === 'function') updateFloatingCardPreviewStyle();
    }
    if (selectedElement && selectedElement.closest && selectedElement.closest('#fcRichBodyEditor')) {
      clearGradientOnly(selectedElement);
      selectedElement.querySelectorAll('img, video').forEach(clearGradientOnly);
    }
    if (typeof recordFcSnapshot === 'function') recordFcSnapshot();
    showToast('플로팅 카드의 그라데이션 및 페이드 마스크가 초기화되었습니다.');
    return;
  }
  const targets = selectedElements.length > 0 ? selectedElements : (selectedElement ? [selectedElement] : []);
  if (targets.length > 0) {
    targets.forEach(el => {
      clearGradientOnly(el);
      el.querySelectorAll('.media-gradient-overlay, .card-bg-layer, .card-hover-bg-layer, .card-bg-tint').forEach(clearGradientOnly);
      el.querySelectorAll('.slot-img, .inline-media-el, video').forEach(media => {
        media.style.webkitMaskImage = '';
        media.style.maskImage = '';
      });
    });
  } else {
    const activeSlideEl = slides[currentSlide - 1];
    if (activeSlideEl) {
      clearGradientOnly(activeSlideEl);
      const bgLayer = activeSlideEl.querySelector('.slide-bg-layer');
      clearGradientOnly(bgLayer);
      const bgOverlay = activeSlideEl.querySelector('.slide-bg-overlay');
      clearGradientOnly(bgOverlay);
    }
  }
  saveHistorySnapshot('그라데이션 및 마스크 초기화');
  showToast('그라데이션 및 투명화 마스크가 초기화되었습니다.');
}

/* ==================== BLUR EFFECT (IMAGE / CARD BG / SLIDE BG) ==================== */
function onBlurSliderChange(val) {
  currentBlurPx = Math.max(0, Math.min(30, Number(val) || 0));
  const lbl = $studio('blurAmountLabel');
  if (lbl) lbl.textContent = `${currentBlurPx}px`;
  if (selectedElement) {
    const imgEl = typeof getActiveImageElement === 'function' ? getActiveImageElement() : selectedElement.querySelector('.slot-img, .inline-media-el');
    if (imgEl && !selectedElement.classList.contains('slide-card')) {
      imgEl.setAttribute('data-img-blur', String(Math.round(currentBlurPx)));
      if (typeof syncImageCssTransformAndFilter === 'function') syncImageCssTransformAndFilter(imgEl);
      else imgEl.style.filter = currentBlurPx > 0 ? `blur(${currentBlurPx}px)` : '';
    } else if (selectedElement.classList.contains('slide-card')) {
      const cardBg = ensureCardBgLayer(selectedElement);
      cardBg.style.filter = currentBlurPx > 0 ? `blur(${currentBlurPx}px)` : '';
      cardBg.style.transform = currentBlurPx > 0 ? 'scale(1.06)' : '';
    }
  }
}

function setBlurPreset(px) {
  const slider = $studio('blurRangeSlider');
  if (slider) slider.value = String(px);
  onBlurSliderChange(px);
  saveHistorySnapshot();
}

function applyBlurToTarget(targetMode) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const px = Number($studio('blurRangeSlider')?.value || currentBlurPx || 0);
  const filterCss = px > 0 ? `blur(${px}px)` : '';
  if (typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive()) {
    if (targetMode === 'card' || targetMode === 'slide') {
      const sl = typeof $fc === 'function' ? $fc('fcBgBlurSlider') : document.getElementById('fcBgBlurSlider');
      if (sl) sl.value = String(px);
      if (typeof onFcBgBlurChange === 'function') onFcBgBlurChange(px);
      if (typeof recordFcSnapshot === 'function') recordFcSnapshot();
      showToast(`플로팅 카드 배경에 흐림 효과(${px}px)가 적용되었습니다.`);
      return;
    }
    if (targetMode === 'card-hover') {
      const sl = typeof $fc === 'function' ? $fc('fcHoverBgBlurSlider') : document.getElementById('fcHoverBgBlurSlider');
      if (sl) sl.value = String(px);
      if (typeof onFcHoverBgBlurChange === 'function') onFcHoverBgBlurChange(px);
      if (typeof recordFcSnapshot === 'function') recordFcSnapshot();
      showToast(`플로팅 카드 호버 배경에 흐림 효과(${px}px)가 적용되었습니다.`);
      return;
    }
  }
  if (targetMode === 'selected') {
    const targets = selectedElements.length > 0 ? selectedElements : (selectedElement ? [selectedElement] : []);
    if (targets.length === 0) { showToast('먼저 블러를 적용할 요소를 클릭해 주세요.'); return; }
    targets.forEach(el => {
      const imgEl = el.tagName === 'IMG' ? el : el.querySelector('.slot-img, .inline-media-el, img');
      if (imgEl && !el.classList.contains('slide-card')) {
        imgEl.setAttribute('data-img-blur', String(Math.round(px)));
        if (typeof syncImageCssTransformAndFilter === 'function') syncImageCssTransformAndFilter(imgEl);
        else { imgEl.style.filter = filterCss; imgEl.style.transform = px > 0 ? 'scale(1.05)' : ''; }
      } else {
        el.style.filter = filterCss;
      }
    });
    saveHistorySnapshot('선택 요소 블러 적용');
    showToast(`선택한 요소에 흐림 효과(${px}px)가 적용되었습니다.`);
    return;
  }
  if (targetMode === 'image') {
    const imgEl = typeof getActiveImageElement === 'function' ? getActiveImageElement() : (selectedElement ? selectedElement.querySelector('.slot-img, .inline-media-el') : null);
    if (!imgEl) { showToast('먼저 흐림 효과를 적용할 이미지를 클릭해 주세요.'); return; }
    imgEl.setAttribute('data-img-blur', String(Math.round(px)));
    if (typeof syncImageCssTransformAndFilter === 'function') syncImageCssTransformAndFilter(imgEl);
    else { imgEl.style.filter = filterCss; imgEl.style.transform = px > 0 ? 'scale(1.05)' : ''; }
    saveHistorySnapshot('이미지 블러 효과');
    showToast(`선택한 이미지에 흐림 효과(${px}px)가 적용되었습니다.`);
  } else if (targetMode === 'card') {
    const card = getTargetCardForHierarchy();
    if (!card) {
      showToast('먼저 흐림 효과를 적용할 카드를 클릭해 주세요.');
      return;
    }
    const cardBg = ensureCardBgLayer(card);
    cardBg.style.filter = filterCss;
    cardBg.style.transform = px > 0 ? 'scale(1.06)' : '';
    saveHistorySnapshot();
    showToast(`카드 배경에 흐림 효과(${px}px)가 적용되었습니다.`);
  } else if (targetMode === 'card-hover') {
    const card = getTargetCardForHierarchy();
    if (!card) {
      showToast('먼저 호버 배경 흐림 효과를 적용할 카드를 클릭해 주세요.');
      return;
    }
    const hoverBg = ensureCardHoverBgLayer(card);
    hoverBg.style.filter = filterCss;
    hoverBg.style.transform = px > 0 ? 'scale(1.06)' : '';
    saveHistorySnapshot();
    showToast(`호버 배경 이미지에 흐림 효과(${px}px)가 적용되었습니다.`);
  } else {
    const activeSlideEl = slides[currentSlide - 1];
    if (!activeSlideEl) return;
    ensureFreeLayersOnAllSlides();
    const bgLayer = activeSlideEl.querySelector('.slide-bg-layer');
    if (bgLayer) {
      bgLayer.style.filter = filterCss;
      bgLayer.style.transform = px > 0 ? 'scale(1.04)' : '';
    }
    saveHistorySnapshot();
    showToast(`슬라이드 배경에 흐림 효과(${px}px)가 적용되었습니다.`);
  }
}

/* ==================== SLIDE THEMES, BACKGROUND IMAGES & CARD COLORS ==================== */
function triggerBgImageUpload(target) {
  bgUploadTarget = target || 'slide';
  const inp = document.getElementById('bgImageUploader');
  if (inp) {
    inp.value = '';
    inp.click();
  }
}

function initBgUploaderListener() {
  const bgUploader = document.getElementById('bgImageUploader');
  if (!bgUploader || bgUploader.dataset.bound) return;
  bgUploader.dataset.bound = 'true';
  bgUploader.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
      const imgObj = new Image();
      imgObj.onload = function () {
        const maxDim = 1920;
        let w = imgObj.width;
        let h = imgObj.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(imgObj, 0, 0, w, h);
        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mime, 0.88);

        if (bgUploadTarget === 'card' && getTargetCardForHierarchy()) {
          const card = getTargetCardForHierarchy();
          const cardBg = ensureCardBgLayer(card);
          cardBg.style.backgroundImage = `url("${dataUrl}")`;
          const curHex = card.getAttribute('data-card-bg-hex');
          const curAlpha = card.getAttribute('data-card-bg-alpha');
          if (curHex && curAlpha !== null) {
            card.style.backgroundColor = 'transparent';
            const rgba = hexToRgba(curHex, curAlpha);
            card.style.setProperty('--card-bg-color', rgba);
            ensureCardBgTintLayer(card).style.backgroundColor = rgba;
          }
          saveHistorySnapshot();
          showToast('선택한 카드 배경에 이미지가 적용되었습니다. (카드 배경색·투명도로 오버레이 틴트 조절 가능)');
        } else if (bgUploadTarget === 'card-hover') {
          const target = selectedElement || getTargetCardForHierarchy();
          if (!target) {
            showToast('먼저 호버 배경 이미지를 적용할 카드나 요소를 클릭해 주세요.');
            return;
          }
          const curOpacity = Number($studio('hoverBgOpacitySlider')?.value ?? 100);
          if ($studio('hoverBgOpacityLabel')) $studio('hoverBgOpacityLabel').textContent = `${curOpacity}%`;
          const hoverHex = target.getAttribute('data-hover-bg-hex') || $studio('elHoverBgColorPicker')?.value || '#EFF6FF';
          target.setAttribute('data-hover-bg-hex', hoverHex);
          target.setAttribute('data-hover-bg-alpha', String(curOpacity));
          const hoverRgba = hexToRgba(hoverHex, curOpacity);
          target.style.setProperty('--card-hover-bg', hoverRgba);

          if (target.classList.contains('slide-card')) {
            const hoverBg = ensureCardHoverBgLayer(target);
            hoverBg.style.backgroundImage = `url("${dataUrl}")`;
            ensureCardBgTintLayer(target);
            if (!target.getAttribute('data-fx')) {
              target.setAttribute('data-fx', 'hover-lift');
              target.classList.add('hover-reactive');
            }
          } else {
            target.setAttribute('data-el-hover-bg-img', 'true');
            target.style.setProperty('--el-hover-bg-img', `url("${dataUrl}")`);
            if (!target.getAttribute('data-fx')) {
              target.setAttribute('data-fx', 'hover-lift');
            }
          }
          saveHistorySnapshot();
          showToast('호버 배경 이미지가 적용되었습니다! 발표 모드에서 마우스를 올리면 반투명 호버 배경색과 함께 나타납니다.');
        } else if (bgUploadTarget === 'all-slides') {
          ensureFreeLayersOnAllSlides();
          let appliedCnt = 0;
          slides.forEach(sEl => {
            if (sEl.getAttribute('data-slide-locked') === 'true') return;
            const bgLayer = sEl.querySelector(':scope > .slide-bg-layer') || sEl.querySelector('.slide-bg-layer');
            if (bgLayer) {
              bgLayer.style.backgroundImage = `url("${dataUrl}")`;
              bgLayer.style.opacity = '1';
              const gridBody = sEl.querySelector('.slide-grid-body');
              if (gridBody) gridBody.style.backgroundColor = 'transparent';
              appliedCnt++;
            }
          });
          const slider = $studio('slideBgOpacitySlider');
          if (slider) slider.value = '100';
          saveHistorySnapshot('전체 슬라이드 배경 이미지 적용');
          showToast(`전체 슬라이드(${appliedCnt}장) 배경에 이미지가 일괄 적용되었습니다.`);
        } else {
          if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true, true)) return;
          const activeSlideEl = slides[currentSlide - 1];
          if (!activeSlideEl) return;
          ensureFreeLayersOnAllSlides();
          const bgLayer = activeSlideEl.querySelector(':scope > .slide-bg-layer') || activeSlideEl.querySelector('.slide-bg-layer');
          if (bgLayer) {
            bgLayer.style.backgroundImage = `url("${dataUrl}")`;
            bgLayer.style.opacity = '1';
            const slider = $studio('slideBgOpacitySlider');
            if (slider) slider.value = '100';
            const gridBody = activeSlideEl.querySelector('.slide-grid-body');
            if (gridBody) gridBody.style.backgroundColor = 'transparent';
            saveHistorySnapshot(`P.${String(currentSlide).padStart(2, '0')} 슬라이드 배경 이미지 적용`);
            showToast(`현재 슬라이드(P.${String(currentSlide).padStart(2, '0')}) 배경에만 이미지가 적용되었습니다.`);
          }
        }
      };
      imgObj.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function applyThemePreset(bgHex, isDark) {
  const activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return;
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  let resolvedBg = bgHex;
  let resolvedDark = Boolean(isDark);
  if (bgHex === 'light') { resolvedBg = '#F5F5F7'; resolvedDark = false; }
  else if (bgHex === 'dark') { resolvedBg = '#111111'; resolvedDark = true; }
  activeSlideEl.style.backgroundImage = '';
  activeSlideEl.style.backgroundColor = resolvedBg;
  activeSlideEl.classList.toggle('theme-dark', resolvedDark);
  activeSlideEl.classList.toggle('theme-light', !resolvedDark);
  const stage = document.getElementById('slideStage');
  if (stage) stage.style.backgroundColor = resolvedBg;
  const cardBg = resolvedDark ? '#1E293B' : '#FFFFFF';
  activeSlideEl.querySelectorAll('.slide-card').forEach(card => {
    card.classList.remove('card-theme-dark', 'bg-ink');
    card.style.color = '';
    card.setAttribute('data-card-bg-hex', cardBg);
    card.style.setProperty('--card-bg-color', cardBg);
    const hasBgImg = Boolean((card.querySelector('.card-bg-layer')?.style.backgroundImage || '').includes('url('));
    if (hasBgImg && typeof ensureCardBgTintLayer === 'function') {
      card.style.backgroundColor = 'transparent';
      ensureCardBgTintLayer(card).style.backgroundColor = hexToRgba(cardBg, Number(card.getAttribute('data-card-bg-alpha') || 85));
    } else {
      card.style.backgroundColor = cardBg;
    }
    card.style.borderColor = resolvedDark ? 'rgba(255, 255, 255, 0.14)' : '';
  });
  if ($studio('cardBgColorPicker')) $studio('cardBgColorPicker').value = cardBg;
  const picker = $studio('slideBgColorPicker') || $studio('slideBgPicker');
  if (picker && /^#[0-9a-fA-F]{6}$/.test(resolvedBg)) picker.value = resolvedBg;
  if (typeof syncPresenterWindowState === 'function') syncPresenterWindowState();
  saveHistorySnapshot('슬라이드 테마 변경');
  showToast(resolvedDark ? '현재 슬라이드에 다크 테마가 적용되었습니다.' : '현재 슬라이드에 라이트 테마가 적용되었습니다.');
}

/* ==================== BRAND KIT & SLIDE MASTER DESIGN PRESETS (v4.7.0) ==================== */
const CUSTOM_BRAND_KIT_STORAGE_KEY = 'html_slide_tool_custom_brand_kit_v1';
const BRAND_KIT_PRESETS = {
  'minimal-white': {
    name: '미니멀 화이트',
    isDark: false,
    slideBg: '#F5F5F7',
    cardBg: '#FFFFFF',
    accent: '#0055FF',
    chromeBg: '#F5F5F7',
    chromeFg: '#111111',
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif"
  },
  'dark-tech': {
    name: '다크 테크',
    isDark: true,
    slideBg: '#0F172A',
    cardBg: '#1E293B',
    accent: '#38BDF8',
    chromeBg: '#0B1120',
    chromeFg: '#F8FAFC',
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif"
  },
  'editorial-beige': {
    name: '에디토리얼',
    isDark: false,
    slideBg: '#F6F3EC',
    cardBg: '#FFFDF9',
    accent: '#B45309',
    chromeBg: '#EFECE3',
    chromeFg: '#292524',
    fontFamily: "'Noto Serif KR', 'AppleMyungjo', 'Batang', Georgia, serif"
  },
  'corporate-navy': {
    name: '코퍼레이트 네이비',
    isDark: false,
    slideBg: '#EEF2F7',
    cardBg: '#FFFFFF',
    accent: '#1D4ED8',
    chromeBg: '#0F172A',
    chromeFg: '#F8FAFC',
    fontFamily: "'IBM Plex Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"
  },
  'emerald-studio': {
    name: '에메랄드 스튜디오',
    isDark: false,
    slideBg: '#ECFDF5',
    cardBg: '#FFFFFF',
    accent: '#059669',
    chromeBg: '#064E3B',
    chromeFg: '#ECFDF5',
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"
  },
  'obsidian-amber': {
    name: '옵시디언 골드',
    isDark: true,
    slideBg: '#111111',
    cardBg: '#1C1C1E',
    accent: '#F59E0B',
    chromeBg: '#09090B',
    chromeFg: '#FAFAFA',
    fontFamily: "'Gothic A1', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"
  },
  'sunset-coral': {
    name: '코랄 크리에이티브',
    isDark: false,
    slideBg: '#FFF5F5',
    cardBg: '#FFFFFF',
    accent: '#E11D48',
    chromeBg: '#FFFFFF',
    chromeFg: '#1F2937',
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"
  },
  'slate-mono': {
    name: '슬레이트 모노',
    isDark: false,
    slideBg: '#F1F5F9',
    cardBg: '#FFFFFF',
    accent: '#334155',
    chromeBg: '#1E293B',
    chromeFg: '#F8FAFC',
    fontFamily: "'IBM Plex Sans KR', 'JetBrains Mono', 'Malgun Gothic', sans-serif"
  }
};

function saveCustomBrandKit() {
  const activeSlideEl = slides[currentSlide - 1];
  const slideBg = activeSlideEl ? (rgbToHex(activeSlideEl.style.backgroundColor || window.getComputedStyle(activeSlideEl).backgroundColor) || '#F5F5F7') : '#F5F5F7';
  const sampleCard = activeSlideEl ? activeSlideEl.querySelector('.slide-card') : null;
  const cardBg = sampleCard ? (rgbToHex(sampleCard.style.backgroundColor || window.getComputedStyle(sampleCard).backgroundColor) || '#FFFFFF') : '#FFFFFF';
  const accent = (document.documentElement.style.getPropertyValue('--accent-color') || '#0055FF').trim();
  const chromeBg = (document.documentElement.style.getPropertyValue('--header-bg') || '#F5F5F7').trim();
  const chromeFg = (document.documentElement.style.getPropertyValue('--header-fg') || '#111111').trim();
  const fontSel = $studio('fontFamilySelect');
  const fontFamily = (fontSel && fontSel.value) ? fontSel.value : "'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
  const isDark = activeSlideEl ? activeSlideEl.classList.contains('theme-dark') : isDarkHexColor(slideBg);

  const kit = { name: '내 커스텀 키트', isDark, slideBg, cardBg, accent, chromeBg, chromeFg, fontFamily };
  try {
    localStorage.setItem(CUSTOM_BRAND_KIT_STORAGE_KEY, JSON.stringify(kit));
    showToast('현재 슬라이드 디자인이 [내 브랜드 키트]로 저장되었습니다!');
  } catch (e) {
    showToast('브라우저 저장소 제한으로 커스텀 키트를 저장하지 못했습니다.');
  }
}

function applyBrandKitPreset(kitKey) {
  let kit = BRAND_KIT_PRESETS[kitKey];
  if (kitKey === 'custom') {
    try {
      const raw = localStorage.getItem(CUSTOM_BRAND_KIT_STORAGE_KEY);
      if (raw) kit = JSON.parse(raw);
    } catch (e) {}
    if (!kit) {
      showToast('저장된 커스텀 브랜드 키트가 없습니다. 먼저 [현재 저장]을 눌러주세요.');
      return;
    }
  }
  if (!kit) return;

  const applyAll = $studio('brandKitApplyAllChk') ? Boolean($studio('brandKitApplyAllChk').checked) : true;
  const targetSlides = applyAll ? Array.from(document.querySelectorAll('#slideStage .slide')) : [slides[currentSlide - 1]].filter(Boolean);
  if (targetSlides.length === 0) return;

  // 1. Global accent & chrome bar colors
  setAccentColor(kit.accent, true);
  if (typeof applyChromeBarColors === 'function') {
    applyChromeBarColors('header', 'bg', kit.chromeBg, true);
    applyChromeBarColors('header', 'fg', kit.chromeFg, true);
    applyChromeBarColors('footer', 'bg', kit.chromeBg, true);
    applyChromeBarColors('footer', 'fg', kit.chromeFg, true);
  }

  // 2. Apply slide background, dark/light theme, card surface & typography
  if (!applyAll && typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  targetSlides.forEach(sEl => {
    if (sEl.getAttribute('data-slide-locked') === 'true') return;
    sEl.style.backgroundImage = '';
    sEl.style.backgroundColor = kit.slideBg;
    sEl.classList.toggle('theme-dark', Boolean(kit.isDark));
    sEl.classList.toggle('theme-light', !kit.isDark);
    sEl.style.fontFamily = kit.fontFamily;
    sEl.querySelectorAll('.slide-card').forEach(card => {
      card.classList.remove('card-theme-dark', 'bg-ink');
      card.style.color = '';
      card.setAttribute('data-card-bg-hex', kit.cardBg);
      card.style.setProperty('--card-bg-color', kit.cardBg);
      const hasBgImg = Boolean((card.querySelector('.card-bg-layer')?.style.backgroundImage || '').includes('url('));
      if (hasBgImg && typeof ensureCardBgTintLayer === 'function') {
        card.style.backgroundColor = 'transparent';
        ensureCardBgTintLayer(card).style.backgroundColor = hexToRgba(kit.cardBg, Number(card.getAttribute('data-card-bg-alpha') || 85));
      } else {
        card.style.backgroundColor = kit.cardBg;
      }
      card.style.borderColor = kit.isDark ? 'rgba(255, 255, 255, 0.14)' : '';
    });
    sEl.querySelectorAll('[data-editable], h1, h2, h3, h4, p, li').forEach(txtEl => {
      if (txtEl.closest('.card-edit-controls, .iw-edit-bar, .chart-scenario-bar, .iw-hs-dot')) return;
      if (!txtEl.classList.contains('font-mono')) {
        txtEl.style.fontFamily = kit.fontFamily;
      }
    });
  });
  const stageEl = document.getElementById('slideStage');
  if (stageEl) stageEl.style.backgroundColor = kit.slideBg;
  if (typeof syncPresenterWindowState === 'function') syncPresenterWindowState();

  // 3. Sync inspector pickers & active highlight
  if ($studio('slideBgColorPicker') && /^#[0-9a-fA-F]{6}$/.test(kit.slideBg)) $studio('slideBgColorPicker').value = kit.slideBg;
  if ($studio('accentColorPicker') && /^#[0-9a-fA-F]{6}$/.test(kit.accent)) $studio('accentColorPicker').value = kit.accent;
  if ($studio('cardBgColorPicker') && /^#[0-9a-fA-F]{6}$/.test(kit.cardBg)) $studio('cardBgColorPicker').value = kit.cardBg;
  if ($studio('fontFamilySelect') && kit.fontFamily) {
    const sel = $studio('fontFamilySelect');
    const matched = Array.from(sel.options).find(o => o.value.toLowerCase().includes(kit.fontFamily.split(',')[0].replace(/['"]/g, '').trim().toLowerCase()));
    if (matched) sel.value = matched.value;
  }
  const rootDoc = (studioPopupWin && !studioPopupWin.closed) ? studioPopupWin.document : document;
  rootDoc.querySelectorAll('.brand-kit-btn').forEach(btn => {
    btn.classList.toggle('is-active', btn.getAttribute('data-brand-kit') === kitKey);
  });

  if (typeof markUnsavedChanges === 'function') markUnsavedChanges();
  saveHistorySnapshot(`브랜드 키트 적용 (${kit.name})`);
  showToast(`[${kit.name}] 브랜드 키트가 ${applyAll ? '전체 슬라이드' : '현재 슬라이드'}에 적용되었습니다.`);
}

function applyCustomSlideBg(hexColor, isLiveInput) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(!isLiveInput)) return;
  const activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return;
  activeSlideEl.style.backgroundImage = '';
  activeSlideEl.style.backgroundColor = hexColor;
  const isDark = isDarkHexColor(hexColor);
  activeSlideEl.classList.toggle('theme-dark', isDark);
  activeSlideEl.classList.toggle('theme-light', !isDark);
  const stage = document.getElementById('slideStage');
  if (stage) stage.style.backgroundColor = hexColor;
  if (!isLiveInput) saveHistorySnapshot('슬라이드 배경색 변경');
}

function isDarkHexColor(hex) {
  let clean = String(hex || '#F5F5F7').trim().replace(/^#/, '');
  if (clean.length === 3) clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  if (clean.length < 6) return false;
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  return ((r * 299 + g * 587 + b * 114) / 1000) < 128;
}

function applyChromeBarColors(barTarget, prop, hexColor, isLiveInput) {
  const headerEl = document.getElementById('appTopHeader');
  const footerEl = document.getElementById('appBottomFooter');
  if (barTarget === 'header' && headerEl) {
    if (prop === 'bg') {
      document.documentElement.style.setProperty('--header-bg', hexColor);
      headerEl.style.backgroundColor = hexColor;
      const dark = isDarkHexColor(hexColor);
      if (dark) headerEl.setAttribute('data-chrome-dark', 'true');
      else headerEl.removeAttribute('data-chrome-dark');
      const autoFg = dark ? '#F9FAFB' : '#111111';
      document.documentElement.style.setProperty('--header-fg', autoFg);
      headerEl.style.color = autoFg;
      if ($studio('topHeaderTextPicker')) $studio('topHeaderTextPicker').value = autoFg;
    } else if (prop === 'fg') {
      document.documentElement.style.setProperty('--header-fg', hexColor);
      headerEl.style.color = hexColor;
    }
  } else if (barTarget === 'footer' && footerEl) {
    if (prop === 'bg') {
      document.documentElement.style.setProperty('--footer-bg', hexColor);
      footerEl.style.backgroundColor = hexColor;
      const dark = isDarkHexColor(hexColor);
      if (dark) footerEl.setAttribute('data-chrome-dark', 'true');
      else footerEl.removeAttribute('data-chrome-dark');
      const autoFg = dark ? '#F9FAFB' : '#111111';
      document.documentElement.style.setProperty('--footer-fg', autoFg);
      footerEl.style.color = autoFg;
      if ($studio('bottomFooterTextPicker')) $studio('bottomFooterTextPicker').value = autoFg;
    } else if (prop === 'fg') {
      document.documentElement.style.setProperty('--footer-fg', hexColor);
      footerEl.style.color = hexColor;
    }
  }
  if (!isLiveInput) {
    if (typeof markUnsavedChanges === 'function') markUnsavedChanges();
  }
}

function applyChromeBarPreset(bgHex, fgHex) {
  applyChromeBarColors('header', 'bg', bgHex, true);
  applyChromeBarColors('header', 'fg', fgHex, true);
  applyChromeBarColors('footer', 'bg', bgHex, true);
  applyChromeBarColors('footer', 'fg', fgHex, true);
  if ($studio('topHeaderBgPicker')) $studio('topHeaderBgPicker').value = bgHex;
  if ($studio('topHeaderTextPicker')) $studio('topHeaderTextPicker').value = fgHex;
  if ($studio('bottomFooterBgPicker')) $studio('bottomFooterBgPicker').value = bgHex;
  if ($studio('bottomFooterTextPicker')) $studio('bottomFooterTextPicker').value = fgHex;
  if (typeof markUnsavedChanges === 'function') markUnsavedChanges();
  showToast('상단 바 및 하단 바 색상이 변경되었습니다.');
}

function syncChromeBarWithCurrentSlide() {
  const activeSlideEl = slides[currentSlide - 1];
  const rawBg = activeSlideEl ? rgbToHex(window.getComputedStyle(activeSlideEl).backgroundColor) : '#F5F5F7';
  const bgHex = rawBg || '#F5F5F7';
  const fgHex = isDarkHexColor(bgHex) ? '#F9FAFB' : '#111111';
  applyChromeBarPreset(bgHex, fgHex);
}

function applyThemeToAllSlides() {
  const activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return;
  const bg = activeSlideEl.style.backgroundColor || window.getComputedStyle(activeSlideEl).backgroundColor || '#F5F5F7';
  const bgImg = activeSlideEl.style.backgroundImage || '';
  const isDark = activeSlideEl.classList.contains('theme-dark');
  const srcBgLayer = activeSlideEl.querySelector(':scope > .slide-bg-layer');
  const srcBgLayerImg = srcBgLayer ? (srcBgLayer.style.backgroundImage || '') : '';
  const srcBgLayerOp = srcBgLayer ? (srcBgLayer.style.opacity || '') : '';
  const srcBgOverlay = activeSlideEl.querySelector(':scope > .slide-bg-overlay');
  const srcBgOverlayImg = srcBgOverlay ? (srcBgOverlay.style.backgroundImage || '') : '';
  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const stage = document.getElementById('slideStage');
  if (stage) stage.style.backgroundColor = bg;
  slides.forEach(s => {
    if (s.getAttribute('data-slide-locked') === 'true') return;
    s.style.backgroundColor = bg;
    s.style.backgroundImage = bgImg;
    s.classList.toggle('theme-dark', isDark);
    s.classList.toggle('theme-light', !isDark);
    const dstBgLayer = s.querySelector(':scope > .slide-bg-layer');
    if (dstBgLayer) { dstBgLayer.style.backgroundImage = srcBgLayerImg; dstBgLayer.style.opacity = srcBgLayerOp; }
    const dstBgOverlay = s.querySelector(':scope > .slide-bg-overlay');
    if (dstBgOverlay) dstBgOverlay.style.backgroundImage = srcBgOverlayImg;
    s.querySelectorAll('.slide-card').forEach(card => {
      card.classList.remove('card-theme-dark', 'bg-ink');
      card.style.color = '';
      card.setAttribute('data-card-bg-hex', cardBg);
      card.style.setProperty('--card-bg-color', cardBg);
      const hasPhoto = Boolean((card.querySelector('.card-bg-layer')?.style.backgroundImage || '').includes('url('));
      if (hasPhoto && typeof ensureCardBgTintLayer === 'function') {
        card.style.backgroundColor = 'transparent';
        ensureCardBgTintLayer(card).style.backgroundColor = hexToRgba(cardBg, Number(card.getAttribute('data-card-bg-alpha') || 85));
      } else {
        card.style.backgroundColor = cardBg;
      }
      card.style.borderColor = isDark ? 'rgba(255, 255, 255, 0.14)' : '';
    });
  });
  if (typeof syncPresenterWindowState === 'function') syncPresenterWindowState();
  saveHistorySnapshot('전체 슬라이드 테마 일괄 적용');
  showToast('모든 슬라이드에 현재 배경/테마가 일괄 적용되었습니다.');
}

function setAccentColor(hexColor, isLiveInput) {
  document.documentElement.style.setProperty('--accent-color', hexColor);
  if (studioPopupWin && !studioPopupWin.closed) {
    studioPopupWin.document.documentElement.style.setProperty('--accent-color', hexColor);
  }
  if (fcStudioPopupWin && !fcStudioPopupWin.closed) {
    fcStudioPopupWin.document.documentElement.style.setProperty('--accent-color', hexColor);
  }
  if (typeof syncPresenterWindowState === 'function') syncPresenterWindowState();
  const picker = $studio('accentColorPicker');
  if (picker) picker.value = hexColor;
  if (!isLiveInput) {
    if (typeof markUnsavedChanges === 'function') markUnsavedChanges();
    saveHistorySnapshot('포인트 컬러 변경');
    showToast('브랜드 포인트 컬러가 변경되었습니다.');
  }
}

function getTargetCardsForMulti() {
  if (selectedElements && selectedElements.length > 1) {
    const cards = selectedElements.map(el => (el.classList.contains('slide-card') || el.classList.contains('slide-header-bar') || (el.classList.contains('ppt-free-obj') && el.getAttribute('data-shape-type') === 'freeCard')) ? el : el.closest('.slide-card, .slide-header-bar, .ppt-free-obj[data-shape-type="freeCard"]')).filter(Boolean);
    if (cards.length > 0) return Array.from(new Set(cards));
  }
  const single = getTargetCardForHierarchy();
  return single ? [single] : [];
}

function applySelectedCardBgColor(hexColor, isLiveInput) {
  if (typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive()) {
    const fcBgInp = typeof $fc === 'function' ? $fc('fcBgColorInput') : document.getElementById('fcBgColorInput');
    if (fcBgInp) fcBgInp.value = hexColor;
    if (typeof updateFloatingCardPreviewStyle === 'function') updateFloatingCardPreviewStyle();
    if (!isLiveInput && typeof recordFcSnapshot === 'function') recordFcSnapshot();
    return;
  }
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(!isLiveInput)) return;
  const cards = getTargetCardsForMulti();
  if (cards.length === 0) {
    if (!isLiveInput) showToast('먼저 배경색을 변경할 카드를 클릭해 주세요.');
    return;
  }
  const alphaPct = Number($studio('cardBgOpacitySlider')?.value ?? 100);
  const rgba = hexToRgba(hexColor, alphaPct);
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const isDarkCard = ((r * 299 + g * 587 + b * 114) / 1000) < 128 && alphaPct > 45;

  cards.forEach(card => {
    card.setAttribute('data-card-bg-hex', hexColor);
    card.setAttribute('data-card-bg-alpha', String(alphaPct));
    const hasBgImg = Boolean((card.querySelector('.card-bg-layer')?.style.backgroundImage || '').includes('url('));
    const hasHoverImg = Boolean(card.querySelector('.card-hover-bg-layer')?.style.backgroundImage);

    card.style.setProperty('--card-bg-color', rgba);
    if (hasBgImg || hasHoverImg) {
      card.style.backgroundColor = 'transparent';
      const tint = ensureCardBgTintLayer(card);
      tint.style.backgroundColor = rgba;
    } else {
      card.style.backgroundColor = rgba;
      const tint = card.querySelector('.card-bg-tint');
      if (tint) tint.style.backgroundColor = 'transparent';
    }
    card.classList.toggle('card-theme-dark', isDarkCard);
    card.style.color = isDarkCard ? '#F9FAFB' : '';
  });
  if (!isLiveInput) saveHistorySnapshot();
}

function applyOpacityToTarget(targetMode) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const alphaPct = Math.max(0, Math.min(100, Number($studio('cardBgOpacitySlider')?.value ?? 100)));
  const lbl = $studio('cardBgOpacityLabel');
  if (lbl) lbl.textContent = `${alphaPct}%`;

  if (typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive()) {
    if (targetMode === 'card' || targetMode === 'slide') {
      const fcOp = typeof $fc === 'function' ? $fc('fcBgOpacityInput') : document.getElementById('fcBgOpacityInput');
      if (fcOp) fcOp.value = String(alphaPct);
      if (typeof updateFloatingCardPreviewStyle === 'function') updateFloatingCardPreviewStyle();
      if (typeof recordFcSnapshot === 'function') recordFcSnapshot();
      showToast(`플로팅 카드 배경 불투명도가 ${alphaPct}%로 적용되었습니다.`);
      return;
    }
    if (targetMode === 'card-hover') {
      const fcHop = typeof $fc === 'function' ? $fc('fcHoverBgOpacityInput') : document.getElementById('fcHoverBgOpacityInput');
      if (fcHop) fcHop.value = String(alphaPct);
      if (typeof updateFloatingCardPreviewStyle === 'function') updateFloatingCardPreviewStyle();
      if (typeof recordFcSnapshot === 'function') recordFcSnapshot();
      showToast(`플로팅 카드 호버 불투명도가 ${alphaPct}%로 적용되었습니다.`);
      return;
    }
  }

  if (targetMode === 'slide') {
    const activeSlideEl = slides[currentSlide - 1];
    if (!activeSlideEl) return;
    ensureFreeLayersOnAllSlides();
    const bgLayer = activeSlideEl.querySelector(':scope > .slide-bg-layer') || activeSlideEl.querySelector('.slide-bg-layer');
    if (bgLayer) bgLayer.style.opacity = String(alphaPct / 100);
    if ($studio('slideBgOpacitySlider')) $studio('slideBgOpacitySlider').value = String(alphaPct);
    saveHistorySnapshot('슬라이드 배경 불투명도 적용');
    showToast(`현재 슬라이드 배경 불투명도가 ${alphaPct}%로 적용되었습니다.`);
  } else if (targetMode === 'card') {
    applySelectedCardBgOpacity(alphaPct, false);
    showToast(`선택한 카드 배경 불투명도가 ${alphaPct}%로 적용되었습니다.`);
  } else if (targetMode === 'card-hover') {
    if ($studio('hoverBgOpacitySlider')) $studio('hoverBgOpacitySlider').value = String(alphaPct);
    if (typeof applySelectedHoverBgOpacity === 'function') applySelectedHoverBgOpacity(alphaPct, false);
    showToast(`카드 호버 배경 불투명도가 ${alphaPct}%로 적용되었습니다.`);
  } else if (targetMode === 'selected') {
    const targets = selectedElements.length > 0 ? selectedElements : (selectedElement ? [selectedElement] : []);
    if (targets.length === 0) { showToast('먼저 불투명도를 적용할 요소를 클릭해 주세요.'); return; }
    targets.forEach(el => { el.style.opacity = String(alphaPct / 100); });
    saveHistorySnapshot('선택 요소 불투명도 적용');
    showToast(`선택한 요소의 불투명도가 ${alphaPct}%로 적용되었습니다.`);
  }
}

function applySelectedCardBgOpacity(alphaPct, isLiveInput) {
  const lbl = $studio('cardBgOpacityLabel');
  if (lbl) lbl.textContent = `${alphaPct}%`;
  if (typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive()) {
    const fcOp = typeof $fc === 'function' ? $fc('fcBgOpacityInput') : document.getElementById('fcBgOpacityInput');
    if (fcOp) fcOp.value = String(alphaPct);
    if (typeof updateFloatingCardPreviewStyle === 'function') updateFloatingCardPreviewStyle();
    if (!isLiveInput && typeof recordFcSnapshot === 'function') recordFcSnapshot();
    return;
  }
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(!isLiveInput)) return;
  const cards = getTargetCardsForMulti();
  if (cards.length === 0) {
    if (!isLiveInput) showToast('먼저 투명도를 조절할 카드를 클릭해 주세요.');
    return;
  }
  cards.forEach(card => {
    let baseHex = card.getAttribute('data-card-bg-hex');
    if (!baseHex) {
      const computed = rgbToHex(window.getComputedStyle(card).backgroundColor);
      baseHex = computed || $studio('cardBgColorPicker')?.value || '#FFFFFF';
      card.setAttribute('data-card-bg-hex', baseHex);
    }
    card.setAttribute('data-card-bg-alpha', String(alphaPct));
    if ($studio('cardBgColorPicker')) $studio('cardBgColorPicker').value = baseHex;
    const rgba = hexToRgba(baseHex, alphaPct);
    const hasBgImg = Boolean((card.querySelector('.card-bg-layer')?.style.backgroundImage || '').includes('url('));
    const hasHoverImg = Boolean(card.querySelector('.card-hover-bg-layer')?.style.backgroundImage);

    card.style.setProperty('--card-bg-color', rgba);
    if (hasBgImg || hasHoverImg) {
      card.style.backgroundColor = 'transparent';
      const tint = ensureCardBgTintLayer(card);
      tint.style.backgroundColor = rgba;
    } else {
      card.style.backgroundColor = rgba;
      const tint = card.querySelector('.card-bg-tint');
      if (tint) tint.style.backgroundColor = 'transparent';
    }

    const r = parseInt(baseHex.slice(1, 3), 16);
    const g = parseInt(baseHex.slice(3, 5), 16);
    const b = parseInt(baseHex.slice(5, 7), 16);
    const isDarkCard = ((r * 299 + g * 587 + b * 114) / 1000) < 128 && Number(alphaPct) > 45;
    card.classList.toggle('card-theme-dark', isDarkCard);
    card.style.color = isDarkCard ? '#F9FAFB' : '';
  });
  if (!isLiveInput) saveHistorySnapshot();
}

function applySelectedCardHoverBgColor(hexColor, isLiveInput) {
  if (typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive()) {
    const inp = typeof $fc === 'function' ? $fc('fcHoverBgColorInput') : document.getElementById('fcHoverBgColorInput');
    if (inp) inp.value = hexColor;
    if (typeof updateFloatingCardPreviewStyle === 'function') updateFloatingCardPreviewStyle();
    if (!isLiveInput && typeof recordFcSnapshot === 'function') recordFcSnapshot();
    return;
  }
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(!isLiveInput)) return;
  const targets = (selectedElements && selectedElements.length > 1)
    ? selectedElements
    : ((selectedElement || getTargetCardForHierarchy()) ? [selectedElement || getTargetCardForHierarchy()] : []);
  if (targets.length === 0) {
    if (!isLiveInput) showToast('먼저 호버 배경색을 설정할 요소(카드·도형·박스)를 클릭해 주세요.');
    return;
  }
  const alphaPct = Number($studio('hoverBgOpacitySlider')?.value ?? 100);
  const rgba = hexToRgba(hexColor, alphaPct);
  targets.forEach(target => {
    target.setAttribute('data-hover-bg-hex', hexColor);
    target.setAttribute('data-hover-bg-alpha', String(alphaPct));
    if (!target.getAttribute('data-fx')) {
      target.setAttribute('data-fx', 'hover-lift');
      target.classList.add('hover-reactive');
    }
    target.style.setProperty('--card-hover-bg', rgba);
    if (target.classList.contains('slide-card')) {
      ensureCardBgTintLayer(target);
    }
  });
  if (!isLiveInput) {
    saveHistorySnapshot();
    showToast('호버 시 배경색 및 투명도가 설정되었습니다.');
  }
}

function applySelectedHoverBgOpacity(alphaPct, isLiveInput) {
  const lbl = $studio('hoverBgOpacityLabel');
  if (lbl) lbl.textContent = `${alphaPct}%`;
  if (typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive()) {
    const inp = typeof $fc === 'function' ? $fc('fcHoverBgOpacityInput') : document.getElementById('fcHoverBgOpacityInput');
    if (inp) inp.value = String(alphaPct);
    if (typeof updateFloatingCardPreviewStyle === 'function') updateFloatingCardPreviewStyle();
    if (!isLiveInput && typeof recordFcSnapshot === 'function') recordFcSnapshot();
    return;
  }
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(!isLiveInput)) return;
  const targets = (selectedElements && selectedElements.length > 1)
    ? selectedElements
    : ((selectedElement || getTargetCardForHierarchy()) ? [selectedElement || getTargetCardForHierarchy()] : []);
  if (targets.length === 0) {
    if (!isLiveInput) showToast('먼저 호버 투명도를 조절할 요소를 클릭해 주세요.');
    return;
  }
  targets.forEach(target => {
    const baseHex = target.getAttribute('data-hover-bg-hex') || $studio('elHoverBgColorPicker')?.value || '#EFF6FF';
    target.setAttribute('data-hover-bg-hex', baseHex);
    target.setAttribute('data-hover-bg-alpha', String(alphaPct));
    if (!target.getAttribute('data-fx')) {
      target.setAttribute('data-fx', 'hover-lift');
      target.classList.add('hover-reactive');
    }
    const rgba = hexToRgba(baseHex, alphaPct);
    target.style.setProperty('--card-hover-bg', rgba);
    if (target.classList.contains('slide-card')) {
      ensureCardBgTintLayer(target);
    }
  });
  if (!isLiveInput) saveHistorySnapshot();
}

function clearSelectedCardHoverBgImage() {
  if (typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive()) {
    if (typeof clearFloatingCardHoverBgImage === 'function') clearFloatingCardHoverBgImage();
    return;
  }
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const target = selectedElement || getTargetCardForHierarchy();
  if (!target) {
    showToast('먼저 호버 배경 이미지를 제거할 카드나 요소를 클릭해 주세요.');
    return;
  }
  const hoverBg = target.querySelector('.card-hover-bg-layer');
  if (hoverBg) {
    hoverBg.style.backgroundImage = '';
    hoverBg.style.filter = '';
  }
  target.removeAttribute('data-el-hover-bg-img');
  target.style.removeProperty('--el-hover-bg-img');
  saveHistorySnapshot();
  showToast('호버 배경 이미지가 제거되었습니다.');
}

function updateSlideBgOpacity(val) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(false)) return;
  const activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return;
  const bgLayer = activeSlideEl.querySelector('.slide-bg-layer');
  if (bgLayer) {
    bgLayer.style.opacity = String(Number(val) / 100);
  }
}

function clearSlideBgImage() {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return;
  const bgLayer = activeSlideEl.querySelector('.slide-bg-layer');
  if (bgLayer) {
    bgLayer.style.backgroundImage = '';
    bgLayer.style.opacity = '1';
    bgLayer.style.filter = '';
    bgLayer.style.transform = '';
  }
  const bgOverlay = activeSlideEl.querySelector('.slide-bg-overlay');
  if (bgOverlay) bgOverlay.style.backgroundImage = '';
  saveHistorySnapshot('슬라이드 배경 이미지 제거');
  showToast('슬라이드 배경 이미지가 제거되었습니다.');
}

function toggleSelectedCardGlass() {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const card = getTargetCardForHierarchy();
  if (!card) {
    showToast('먼저 반투명(Glass) 효과를 적용할 카드를 클릭해 주세요.');
    return;
  }
  if (card.getAttribute('data-layer-locked') === 'true') { showToast('잠긴 카드에는 반투명 효과를 변경할 수 없습니다.'); return; }
  const isGlass = card.getAttribute('data-glass') === 'true';
  const parentSlide = card.closest('.slide');
  const isDarkSlide = Boolean(parentSlide && parentSlide.classList.contains('theme-dark'));
  if (isGlass) {
    card.removeAttribute('data-glass');
    card.style.backgroundColor = isDarkSlide ? '#1E293B' : '';
    card.style.backdropFilter = '';
    card.style.webkitBackdropFilter = '';
    showToast('카드 반투명(Glass) 해제');
  } else {
    card.setAttribute('data-glass', 'true');
    card.style.backgroundColor = isDarkSlide ? 'rgba(30, 41, 59, 0.68)' : 'rgba(255, 255, 255, 0.72)';
    card.style.backdropFilter = 'blur(10px)';
    card.style.webkitBackdropFilter = 'blur(10px)';
    if (isDarkSlide) card.style.borderColor = 'rgba(255, 255, 255, 0.18)';
    showToast('카드 반투명(Glass) 적용 — 뒤쪽 배경 이미지가 은은하게 비칩니다.');
  }
  saveHistorySnapshot('카드 반투명(Glass) 전환');
}

function clearSelectedCardBgImage() {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const card = getTargetCardForHierarchy();
  if (!card) {
    showToast('먼저 배경 이미지를 제거할 카드를 클릭해 주세요.');
    return;
  }
  card.style.backgroundImage = '';
  const cardBg = card.querySelector('.card-bg-layer');
  if (cardBg) {
    cardBg.style.backgroundImage = '';
    cardBg.style.filter = '';
    cardBg.style.transform = '';
    cardBg.style.webkitMaskImage = '';
    cardBg.style.maskImage = '';
  }
  const hasHoverImg = Boolean(card.querySelector('.card-hover-bg-layer')?.style.backgroundImage);
  if (!hasHoverImg) {
    const savedHex = card.getAttribute('data-card-bg-hex');
    const savedAlpha = card.getAttribute('data-card-bg-alpha') ?? '100';
    card.style.backgroundColor = savedHex ? hexToRgba(savedHex, savedAlpha) : '';
    const tint = card.querySelector('.card-bg-tint');
    if (tint) tint.style.backgroundColor = 'transparent';
  }
  saveHistorySnapshot('카드 배경 이미지 제거');
  showToast('카드 배경 이미지가 제거되었습니다.');
}


/* ==================== UNIFIED BACKGROUND CONTROLS ==================== */
function resolveUnifiedBgLayers(mode) {
  const layers = [];
  if (typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive()) {
    const fcLayer = (mode === 'card-hover')
      ? (typeof $fc === 'function' ? $fc('fcEditorHoverBgPreviewLayer') : document.getElementById('fcEditorHoverBgPreviewLayer'))
      : (typeof $fc === 'function' ? $fc('fcEditorBgPreviewLayer') : document.getElementById('fcEditorBgPreviewLayer'));
    if (fcLayer) return [fcLayer];
  }
  if (mode === 'all-slides') {
    ensureFreeLayersOnAllSlides();
    slides.forEach(sEl => {
      if (sEl.getAttribute('data-slide-locked') === 'true') return;
      const bg = sEl.querySelector(':scope > .slide-bg-layer') || sEl.querySelector('.slide-bg-layer');
      if (bg) layers.push(bg);
    });
    return layers;
  }
  if (mode === 'slide') {
    const activeSlideEl = slides[currentSlide - 1];
    if (!activeSlideEl) return layers;
    ensureFreeLayersOnAllSlides();
    const bg = activeSlideEl.querySelector(':scope > .slide-bg-layer') || activeSlideEl.querySelector('.slide-bg-layer');
    if (bg) layers.push(bg);
    return layers;
  }
  const card = getTargetCardForHierarchy();
  if (card) {
    if (mode === 'card-hover') layers.push(ensureCardHoverBgLayer(card));
    else layers.push(ensureCardBgLayer(card));
    return layers;
  }
  if (selectedElement) layers.push(selectedElement);
  return layers;
}

function setBackgroundFocalPosition(posCss) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const mode = $studio('unifiedBgTargetSelect')?.value || 'slide';
  const layers = resolveUnifiedBgLayers(mode);
  if (layers.length === 0) { showToast('먼저 배경 초점을 조절할 대상(슬라이드/카드)을 선택해 주세요.'); return; }
  layers.forEach(ly => { ly.style.backgroundPosition = posCss || 'center center'; });
  saveHistorySnapshot('배경 이미지 초점 위치 변경');
  showToast(`배경 이미지 초점이 [${posCss}]로 적용되었습니다.`);
}

function setBackgroundFitMode(sizeCss) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const mode = $studio('unifiedBgTargetSelect')?.value || 'slide';
  const layers = resolveUnifiedBgLayers(mode);
  if (layers.length === 0) { showToast('먼저 배경 맞춤을 조절할 대상(슬라이드/카드)을 선택해 주세요.'); return; }
  layers.forEach(ly => {
    ly.style.backgroundSize = sizeCss || 'cover';
    ly.style.backgroundRepeat = 'no-repeat';
  });
  saveHistorySnapshot(`배경 이미지 맞춤 (${sizeCss})`);
  showToast(`배경 이미지 맞춤이 [${sizeCss === 'contain' ? '비율 맞춤(Contain)' : '꽉 채우기(Cover)'}]으로 적용되었습니다.`);
}

function triggerUnifiedBackgroundUpload() {
  const mode = $studio('unifiedBgTargetSelect')?.value || 'slide';
  if (typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive()) {
    if (mode === 'card-hover' && typeof setFloatingCardHoverBgImage === 'function') { setFloatingCardHoverBgImage(); return; }
    if (typeof setFloatingCardBgImage === 'function') { setFloatingCardBgImage(); return; }
  }
  triggerBgImageUpload(mode);
}

function clearUnifiedBackgroundImage() {
  const mode = $studio('unifiedBgTargetSelect')?.value || 'slide';
  if (typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive()) {
    if (mode === 'card-hover' && typeof clearFloatingCardHoverBgImage === 'function') { clearFloatingCardHoverBgImage(); return; }
    if (typeof clearFloatingCardBgImage === 'function') { clearFloatingCardBgImage(); return; }
  }
  if (mode === 'slide') clearSlideBgImage();
  else if (mode === 'all-slides') {
    slides.forEach(sEl => {
      if (sEl.getAttribute('data-slide-locked') === 'true') return;
      const bgLayer = sEl.querySelector(':scope > .slide-bg-layer') || sEl.querySelector('.slide-bg-layer');
      if (bgLayer) { bgLayer.style.backgroundImage = ''; bgLayer.style.opacity = '1'; }
    });
    saveHistorySnapshot('전체 슬라이드 배경 이미지 제거');
    showToast('전체 슬라이드의 배경 이미지가 제거되었습니다.');
  } else if (mode === 'card-hover') clearSelectedCardHoverBgImage();
  else clearSelectedCardBgImage();
}
