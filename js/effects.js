/* ==================== MULTI-TYPE REACTIVE INTERACTIONS ==================== */
const REACTIVE_FX_LABELS = {
  'hover-lift': '호버 들뜸', 'hover-zoom': '호버 줌확대', 'hover-glow': '호버 네온광채',
  'hover-tilt': '3D 커서틸트', 'hover-float': '호버 부유웨이브', 'hover-shake': '호버 진동강조',
  'hover-rotate': '호버 틸트회전', 'click-pulse': '클릭 탄성펄스', 'click-highlight': '클릭 강조토글',
  'click-flip': '클릭 3D뒤집기', 'hover-spotlight': '포커스 스포트라이트(주변약화)', 'none': '없음'
};

function setReactiveFxBasis(basis) {
  const target = selectedElement || getTargetCardForHierarchy();
  if (!target) {
    showToast('먼저 애니메이션 기준을 설정할 텍스트나 도형을 선택해 주세요.');
    return;
  }
  if (basis === 'content') {
    target.setAttribute('data-fx-basis', 'content');
  } else {
    target.removeAttribute('data-fx-basis');
  }
  syncReactiveFxUI(target);
  saveHistorySnapshot();
  showToast(basis === 'content' ? '텍스트·요소 모양 기준으로 애니메이션이 반응합니다.' : '박스 테두리 기준으로 애니메이션이 반응합니다.');
}

function getActiveTextSelectionRange() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0 && !sel.isCollapsed && sel.toString().trim().length > 0) {
    return { sel, range: sel.getRangeAt(0) };
  }
  return null;
}

function findSpotlightContainer(node) {
  if (!node) return null;
  const el = node.nodeType === 3 ? node.parentElement : node;
  if (!el) return null;
  return el.closest('p, h1, h2, h3, h4, li, blockquote, .shape-inner-text') || el.closest('[data-editable]');
}

function unwrapFxTextSpan(sp) {
  if (!sp || !sp.parentNode) return null;
  const parent = sp.parentNode;
  while (sp.firstChild) {
    parent.insertBefore(sp.firstChild, sp);
  }
  parent.removeChild(sp);
  parent.normalize();
  return parent;
}


function unwrapActiveInlineFxSpan() {
  const sel = window.getSelection();
  const anchorEl = (sel && sel.rangeCount > 0)
    ? (sel.getRangeAt(0).commonAncestorContainer.nodeType === 3 ? sel.getRangeAt(0).commonAncestorContainer.parentElement : sel.getRangeAt(0).commonAncestorContainer)
    : null;
  let targetSpan = (anchorEl && anchorEl.closest('.fx-text-span')) || (selectedElement && selectedElement.closest('.fx-text-span'));
  if (!targetSpan && selectedElement) {
    targetSpan = selectedElement.querySelector('.fx-text-span');
  }
  if (!targetSpan) {
    showToast('해제할 단어 반응형 효과 영역을 먼저 클릭하거나 드래그해 주세요.');
    return;
  }
  const parentBlock = findSpotlightContainer(targetSpan) || targetSpan.parentElement;
  unwrapFxTextSpan(targetSpan);
  if (parentBlock && !parentBlock.querySelector('.fx-text-span[data-fx="hover-spotlight"]')) {
    parentBlock.removeAttribute('data-text-spotlight-container');
  }
  if (sel) sel.removeAllRanges();
  saveHistorySnapshot();
  showToast('단어에 적용된 반응형 효과가 해제되고 원래 문장으로 복원되었습니다.');
}

function applyReactiveShadowSettings(isLiveInput) {
  const targets = ((selectedElements && selectedElements.length > 1)
    ? selectedElements
    : ((selectedElement || getTargetCardForHierarchy()) ? [selectedElement || getTargetCardForHierarchy()] : []))
    .filter(el => el && el.getAttribute('data-layer-locked') !== 'true');
  const isOn = Boolean($studio('fxShadowToggle')?.checked);
  const hex = $studio('fxShadowColorPicker')?.value || '#0055FF';
  const alpha = Number($studio('fxShadowOpacitySlider')?.value ?? 28);
  const lbl = $studio('fxShadowOpacityLabel');
  if (lbl) lbl.textContent = `${alpha}%`;
  if (targets.length === 0) return;
  targets.forEach(target => {
    target.setAttribute('data-fx-shadow', isOn ? 'on' : 'off');
    target.setAttribute('data-fx-shadow-hex', hex);
    target.setAttribute('data-fx-shadow-alpha', String(alpha));
    target.style.setProperty('--fx-shadow-color', hexToRgba(hex, alpha));
  });
  if (!isLiveInput) saveHistorySnapshot();
}

function applyReactiveBorderSettings(isLiveInput) {
  const targets = (selectedElements && selectedElements.length > 1)
    ? selectedElements
    : ((selectedElement || getTargetCardForHierarchy()) ? [selectedElement || getTargetCardForHierarchy()] : []);
  const isOn = Boolean($studio('fxBorderToggle')?.checked);
  const hex = $studio('fxBorderColorPicker')?.value || '#0055FF';
  const widthPx = Number($studio('fxBorderWidthSlider')?.value ?? 2);
  const lbl = $studio('fxBorderWidthLabel');
  if (lbl) lbl.textContent = `${widthPx}px`;
  if (targets.length === 0) return;
  targets.forEach(target => {
    target.setAttribute('data-fx-border', isOn ? 'on' : 'off');
    target.setAttribute('data-fx-border-hex', hex);
    target.setAttribute('data-fx-border-width-val', String(widthPx));
    if (isOn) {
      target.style.setProperty('--fx-border-color', hex);
      target.style.setProperty('--fx-border-width', `${widthPx}px`);
    } else {
      target.style.removeProperty('--fx-border-color');
      target.style.removeProperty('--fx-border-width');
    }
  });
  if (!isLiveInput) saveHistorySnapshot();
}

function applyReactiveEffectToSelected(fxType) {
  if (typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive()) {
    const fcEd = typeof getActiveFcPreviewCanvas === 'function' ? getActiveFcPreviewCanvas() : null;
    const hasInnerFcSelection = Boolean(fcEd && selectedElement && fcEd.contains(selectedElement));
    if (!hasInnerFcSelection) {
      const fxSel = typeof $fc === 'function' ? $fc('fcReactiveFxSelect') : document.getElementById('fcReactiveFxSelect');
      if (fxSel) {
        fxSel.value = fxType || 'none';
        if (typeof updateFloatingCardPreviewStyle === 'function') updateFloatingCardPreviewStyle();
        if (typeof recordFcSnapshot === 'function') recordFcSnapshot();
        showToast(fxType === 'none'
          ? '플로팅 카드의 반응형 효과가 해제되었습니다.'
          : `플로팅 카드에 [${REACTIVE_FX_LABELS[fxType] || fxType}] 효과가 적용되었습니다.`);
        return;
      }
    }
  }
  const activeSlideEl = slides[currentSlide - 1];
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  if (selectedElement && selectedElement.getAttribute('data-layer-locked') === 'true') { showToast('잠긴 레이어에서는 반응형 모션을 변경할 수 없습니다.'); return; }
  const sel = window.getSelection();
  const hasRange = sel && sel.rangeCount > 0;
  const range = hasRange ? sel.getRangeAt(0) : null;
  const anchorEl = range
    ? (range.commonAncestorContainer.nodeType === 3 ? range.commonAncestorContainer.parentElement : range.commonAncestorContainer)
    : null;
  const containerBlock = anchorEl ? findSpotlightContainer(anchorEl) : null;

  // Case 1: Removal ('none') when cursor/selection is inside or covers .fx-text-span
  if (fxType === 'none') {
    const directSpan = (anchorEl && anchorEl.closest('.fx-text-span')) || (selectedElement && selectedElement.closest('.fx-text-span'));
    if (directSpan) {
      const parentBlock = findSpotlightContainer(directSpan) || directSpan.parentElement;
      unwrapFxTextSpan(directSpan);
      if (parentBlock && !parentBlock.querySelector('.fx-text-span[data-fx="hover-spotlight"]')) {
        parentBlock.removeAttribute('data-text-spotlight-container');
      }
      if (sel) sel.removeAllRanges();
      saveHistorySnapshot();
      showToast('텍스트 반응형 효과가 해제되고 원래 문장으로 복원되었습니다.');
      return;
    }
  }

  // Case 2: Dragged non-collapsed text range inside a text block (Strictly prevent nested/overlapping .fx-text-span!)
  if (range && !sel.isCollapsed && sel.toString().trim().length > 0 && containerBlock && fxType !== 'none' && (!selectedElements || selectedElements.length <= 1)) {
    saveHistorySnapshot();

    // Unwrap any existing .fx-text-span that intersects or wraps the selection range so effects NEVER overlap!
    const selectedText = sel.toString();
    const intersectingSpans = Array.from(containerBlock.querySelectorAll('.fx-text-span')).filter(sp => {
      try {
        return range.intersectsNode(sp);
      } catch (e) {
        return false;
      }
    });

    if (intersectingSpans.length > 0) {
      // Helper to compute [start, end) character offsets inside containerBlock
      const getCharOffsetsOfNode = (targetNode) => {
        const rBefore = document.createRange();
        rBefore.selectNodeContents(containerBlock);
        rBefore.setEndBefore(targetNode);
        const s = rBefore.toString().length;
        return { start: s, end: s + targetNode.textContent.length };
      };
      const buildRangeByOffsets = (sIdx, eIdx) => {
        const walker = document.createTreeWalker(containerBlock, NodeFilter.SHOW_TEXT, null);
        let acc = 0;
        let sNode = null, sOff = 0, eNode = null, eOff = 0, n;
        while ((n = walker.nextNode())) {
          const len = n.nodeValue.length;
          if (!sNode && acc + len >= sIdx) { sNode = n; sOff = Math.max(0, sIdx - acc); }
          if (!eNode && acc + len >= eIdx) { eNode = n; eOff = Math.max(0, eIdx - acc); break; }
          acc += len;
        }
        if (sNode && eNode) {
          const r = document.createRange();
          r.setStart(sNode, sOff);
          r.setEnd(eNode, eOff);
          return r;
        }
        return null;
      };

      const preRange = document.createRange();
      preRange.selectNodeContents(containerBlock);
      preRange.setEnd(range.startContainer, range.startOffset);
      const startCharIdx = preRange.toString().length;
      const endCharIdx = startCharIdx + selectedText.length;

      // Record non-overlapping remainder slices of existing spans so they are preserved!
      const preservedSlices = [];
      intersectingSpans.forEach(sp => {
        const { start: spStart, end: spEnd } = getCharOffsetsOfNode(sp);
        const oldFx = sp.getAttribute('data-fx');
        const oldBasis = sp.getAttribute('data-fx-basis') || 'content';
        if (oldFx) {
          if (spStart < startCharIdx) {
            preservedSlices.push({ start: spStart, end: Math.min(spEnd, startCharIdx), fx: oldFx, basis: oldBasis });
          }
          if (spEnd > endCharIdx) {
            preservedSlices.push({ start: Math.max(spStart, endCharIdx), end: spEnd, fx: oldFx, basis: oldBasis });
          }
        }
      });

      intersectingSpans.forEach(sp => unwrapFxTextSpan(sp));
      containerBlock.normalize();

      // Re-apply preserved non-overlapping slices in reverse offset order
      preservedSlices.sort((a, b) => b.start - a.start).forEach(sl => {
        if (sl.end > sl.start) {
          const remRange = buildRangeByOffsets(sl.start, sl.end);
          if (remRange) {
            const remSpan = document.createElement('span');
            remSpan.className = 'fx-text-span';
            remSpan.setAttribute('data-fx', sl.fx);
            remSpan.setAttribute('data-fx-basis', sl.basis);
            try {
              remSpan.appendChild(remRange.extractContents());
              remRange.insertNode(remSpan);
            } catch (e) {}
          }
        }
      });
      containerBlock.normalize();

      const rebuiltRange = buildRangeByOffsets(startCharIdx, endCharIdx);
      if (rebuiltRange) {
        range.setStart(rebuiltRange.startContainer, rebuiltRange.startOffset);
        range.setEnd(rebuiltRange.endContainer, rebuiltRange.endOffset);
      }
    }

    const span = document.createElement('span');
    span.className = 'fx-text-span';
    span.setAttribute('data-fx', fxType);
    span.setAttribute('data-fx-basis', 'content');
    try {
      const extracted = range.extractContents();
      extracted.querySelectorAll('.fx-text-span').forEach(nested => unwrapFxTextSpan(nested));
      span.appendChild(extracted);
      range.insertNode(span);
      containerBlock.normalize();

      if (containerBlock.querySelector('.fx-text-span[data-fx="hover-spotlight"]')) {
        containerBlock.setAttribute('data-text-spotlight-container', 'true');
      } else {
        containerBlock.removeAttribute('data-text-spotlight-container');
      }

      sel.removeAllRanges();
      saveHistorySnapshot();
      showToast(`드래그한 텍스트 "${span.textContent.trim().slice(0, 14)}"에 [${REACTIVE_FX_LABELS[fxType] || fxType}] 효과가 단독 적용되었습니다!`);
      return;
    } catch (err) {
      console.error('Range wrap fallback:', err);
    }
  }

  // Helper to thoroughly strip all reactive attributes, classes, and CSS vars from a node
  const stripReactiveFromNode = (node) => {
    if (!node || !node.classList) return;
    node.classList.remove('hover-reactive', 'fx-highlight-toggled', 'fx-pulse-active', 'fx-flip-active');
    node.removeAttribute('data-fx');
    node.removeAttribute('data-fx-basis');
    node.removeAttribute('data-fx-shadow');
    node.removeAttribute('data-fx-border');
    node.removeAttribute('data-fx-shadow-hex');
    node.removeAttribute('data-fx-shadow-alpha');
    node.removeAttribute('data-fx-border-hex');
    node.removeAttribute('data-fx-border-width-val');
    node.removeAttribute('data-text-spotlight-container');
    node.style.removeProperty('--fx-border-color');
    node.style.removeProperty('--fx-border-width');
    node.style.removeProperty('--fx-shadow-color');
  };

  // Case 3: Element-level reactive animation (supports single & multi-selection)
  const rawTargets = ((selectedElements && selectedElements.length > 1)
    ? [...selectedElements]
    : ((selectedElement || getTargetCardForHierarchy()) ? [selectedElement || getTargetCardForHierarchy()] : []))
    .filter(el => el && el.getAttribute('data-layer-locked') !== 'true');

  if (rawTargets.length === 0) {
    showToast('먼저 반응형 인터랙션을 적용할 텍스트를 드래그하거나 카드·타이틀·도형을 클릭해 주세요.');
    return;
  }

  let lastProcessed = null;
  rawTargets.forEach(origTarget => {
    let target = origTarget;
    if (target.tagName === 'DIV' && target.closest('h1, h2, h3') && !target.classList.contains('slide-card') && !target.classList.contains('ppt-free-obj')) {
      const innerSpan = target.querySelector('span[data-editable]') || target.closest('h1, h2, h3');
      if (innerSpan) target = innerSpan;
    }

    if (fxType === 'none') {
      stripReactiveFromNode(target);
      stripReactiveFromNode(origTarget);
      // Clean any enclosing heading/text wrapper with data-fx (fixes Slide 1 nested h1 > div > span!)
      const enclosingFx = origTarget.closest('[data-fx]');
      if (enclosingFx && !enclosingFx.classList.contains('slide-card')) {
        stripReactiveFromNode(enclosingFx);
      }
      const enclosingHeading = origTarget.closest('h1, h2, h3, h4');
      if (enclosingHeading) {
        stripReactiveFromNode(enclosingHeading);
      }
      target.querySelectorAll('*').forEach(ch => stripReactiveFromNode(ch));
      origTarget.querySelectorAll('*').forEach(ch => stripReactiveFromNode(ch));
      Array.from(origTarget.querySelectorAll('.fx-text-span')).forEach(sp => unwrapFxTextSpan(sp));
      origTarget.normalize();
    } else {
      stripReactiveFromNode(target);
      target.setAttribute('data-fx', fxType);
      if (fxType === 'hover-lift' && target.classList.contains('slide-card')) {
        target.classList.add('hover-reactive');
      }
      if (target.matches('h1, h2, h3, h4, p, span[data-editable], .fx-text-span') && !target.classList.contains('slide-card')) {
        target.setAttribute('data-fx-basis', 'content');
        if (window.getComputedStyle(target).display === 'inline' && !target.classList.contains('fx-text-span')) {
          target.style.display = 'inline-block';
        }
      }
    }
    lastProcessed = target;
  });

  if (fxType !== 'none') {
    applyReactiveShadowSettings();
    applyReactiveBorderSettings();
  }
  syncReactiveFxUI(lastProcessed);
  saveHistorySnapshot();
  showToast(fxType === 'none'
    ? '선택한 요소의 반응형 효과가 완전히 해제되었습니다.'
    : `선택한 요소에 [${REACTIVE_FX_LABELS[fxType] || fxType}] 반응형 효과가 적용되었습니다.`);
}

function applySpotlightToSiblingGroup() {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const target = selectedElement || getTargetCardForHierarchy();
  if (!target || !target.parentElement) {
    showToast('먼저 스포트라이트 효과를 연동할 카드나 텍스트 항목을 선택해 주세요.');
    return;
  }
  const parent = target.parentElement;
  parent.setAttribute('data-spotlight-group', 'true');
  Array.from(parent.children).forEach(child => {
    if (child.getAttribute('data-layer-locked') === 'true') return;
    if (child.matches('.card-edit-controls, .card-bg-layer, .card-hover-bg-layer, .card-bg-tint, .slide-bg-layer, .slide-bg-overlay, .ppt-free-layer, .ppt-connectors-layer, .ppt-slide-master-layer, .fc-item-move-grip, .fc-item-resize-grip, .fc-item-resize-grip-e, .fc-item-resize-grip-s')) return;
    child.classList.remove('hover-reactive');
    child.setAttribute('data-fx', 'hover-spotlight');
  });
  syncReactiveFxUI(target);
  saveHistorySnapshot();
  showToast('같은 그룹의 모든 항목에 포커스 스포트라이트(주변 약화) 효과가 연동되었습니다!');
}

function syncReactiveFxUI(el) {
  const curFx = el ? (el.getAttribute('data-fx') || (el.classList.contains('hover-reactive') ? 'hover-lift' : 'none')) : 'none';
  const curBasis = el ? (el.getAttribute('data-fx-basis') || 'box') : 'box';
  const rootDoc = (studioPopupWin && !studioPopupWin.closed) ? studioPopupWin.document : document;
  rootDoc.querySelectorAll('.fx-preset-btn').forEach(btn => {
    const isMatch = btn.getAttribute('data-fx-btn') === curFx;
    if (btn.getAttribute('data-fx-btn') === 'none') return;
    btn.className = isMatch
      ? 'fx-preset-btn py-1.5 px-1 rounded bg-gopro text-white font-bold cursor-pointer'
      : 'fx-preset-btn py-1.5 px-1 rounded bg-white border border-borderline hover:border-gopro cursor-pointer';
  });
  rootDoc.querySelectorAll('.fx-basis-btn').forEach(btn => {
    const isMatch = btn.getAttribute('data-fx-basis-btn') === curBasis;
    btn.className = isMatch
      ? 'fx-basis-btn py-1 rounded bg-ink text-white cursor-pointer'
      : 'fx-basis-btn py-1 rounded bg-white border border-borderline text-ink cursor-pointer';
  });
  if (el) {
    const hoverHex = el.getAttribute('data-hover-bg-hex') || '#EFF6FF';
    const hoverAlpha = el.getAttribute('data-hover-bg-alpha') || '100';
    if ($studio('elHoverBgColorPicker')) $studio('elHoverBgColorPicker').value = hoverHex;
    if ($studio('hoverBgOpacitySlider')) $studio('hoverBgOpacitySlider').value = hoverAlpha;
    if ($studio('hoverBgOpacityLabel')) $studio('hoverBgOpacityLabel').textContent = `${hoverAlpha}%`;

    const shadowOn = el.getAttribute('data-fx-shadow') !== 'off';
    const shadowHex = el.getAttribute('data-fx-shadow-hex') || '#0055FF';
    const shadowAlpha = el.getAttribute('data-fx-shadow-alpha') || '28';
    if ($studio('fxShadowToggle')) $studio('fxShadowToggle').checked = shadowOn;
    if ($studio('fxShadowColorPicker')) $studio('fxShadowColorPicker').value = shadowHex;
    if ($studio('fxShadowOpacitySlider')) $studio('fxShadowOpacitySlider').value = shadowAlpha;
    if ($studio('fxShadowOpacityLabel')) $studio('fxShadowOpacityLabel').textContent = `${shadowAlpha}%`;

    const borderOn = el.getAttribute('data-fx-border') === 'on';
    const borderHex = el.getAttribute('data-fx-border-hex') || '#0055FF';
    const borderW = el.getAttribute('data-fx-border-width-val') || '2';
    if ($studio('fxBorderToggle')) $studio('fxBorderToggle').checked = borderOn;
    if ($studio('fxBorderColorPicker')) $studio('fxBorderColorPicker').value = borderHex;
    if ($studio('fxBorderWidthSlider')) $studio('fxBorderWidthSlider').value = borderW;
    if ($studio('fxBorderWidthLabel')) $studio('fxBorderWidthLabel').textContent = `${borderW}px`;
  }
}

function toggleSelectedCardHover() {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const card = getTargetCardForHierarchy();
  if (!card) {
    showToast('먼저 호버 반응을 설정할 카드를 클릭해 주세요.');
    return;
  }
  const nextState = !card.classList.contains('hover-reactive');
  card.classList.toggle('hover-reactive', nextState);
  saveHistorySnapshot();
  showToast(nextState ? '선택한 카드의 호버 반응이 켜졌습니다.' : '선택한 카드의 호버 반응이 꺼졌습니다.');
}

function applyCardHoverToAll() {
  const target = selectedElement || getTargetCardForHierarchy();
  const curFx = target ? (target.getAttribute('data-fx') || 'hover-lift') : 'hover-lift';
  const hoverBg = target ? target.style.getPropertyValue('--card-hover-bg') : '';
  document.querySelectorAll('.slide-card').forEach(c => {
    if (c.getAttribute('data-layer-locked') === 'true' || c.closest('.slide[data-slide-locked="true"]')) return;
    if (curFx === 'none') {
      c.removeAttribute('data-fx');
      c.classList.remove('hover-reactive');
    } else {
      c.setAttribute('data-fx', curFx);
      c.classList.toggle('hover-reactive', curFx === 'hover-lift');
      if (hoverBg) c.style.setProperty('--card-hover-bg', hoverBg);
    }
  });
  saveHistorySnapshot();
  showToast(`모든 카드에 [${REACTIVE_FX_LABELS[curFx] || curFx}] 효과가 일괄 적용되었습니다.`);
}


/* ==================== PER-SLIDE TRANSITION EFFECTS ==================== */
const TRANSITION_LABELS = {
  '': '기본',
  'none': '효과 없음',
  'fade': '페이드',
  'slide-left': '가로 슬라이드',
  'slide-up': '세로 슬라이드',
  'zoom': '줌 인',
  'flip': '3D 플립'
};

function setSlideTransition(effectType) {
  const activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return;
  if (!effectType || effectType === 'default') {
    activeSlideEl.removeAttribute('data-transition');
  } else {
    activeSlideEl.setAttribute('data-transition', effectType);
  }
  syncTransitionUI();
  saveHistorySnapshot('슬라이드 트랜지션 변경');
  if (effectType && effectType !== 'none' && effectType !== 'default') {
    previewCurrentSlideTransition();
  }
  showToast(`현재 슬라이드 트랜지션: ${TRANSITION_LABELS[effectType] || (effectType === 'default' ? '기본' : effectType)}`);
}

function syncTransitionUI() {
  const activeSlideEl = slides[currentSlide - 1];
  const cur = activeSlideEl ? (activeSlideEl.getAttribute('data-transition') || '') : '';
  const badge = $studio('currentTransitionBadge');
  if (badge) badge.textContent = TRANSITION_LABELS[cur] || '기본';
  const rootDoc = (studioPopupWin && !studioPopupWin.closed) ? studioPopupWin.document : document;
  rootDoc.querySelectorAll('.trans-preset-btn').forEach(btn => {
    const isMatch = btn.getAttribute('data-trans') === cur;
    btn.className = isMatch
      ? 'trans-preset-btn py-1.5 px-1 rounded bg-gopro text-white font-bold cursor-pointer'
      : 'trans-preset-btn py-1.5 px-1 rounded bg-white border border-borderline hover:border-gopro cursor-pointer';
  });
}

let __transitionPreviewTimer = null;
function previewCurrentSlideTransition() {
  const activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return;
  const targetSlideNum = currentSlide;
  if (activeSlideEl.getAttribute('data-transition') === 'none') {
    showToast('현재 슬라이드는 "효과 없음" 상태입니다. 다른 전환 효과를 선택한 뒤 미리보기해 주세요.');
    return;
  }
  if (__transitionPreviewTimer) { clearTimeout(__transitionPreviewTimer); __transitionPreviewTimer = null; }
  activeSlideEl.classList.add('transition-instant-reset');
  activeSlideEl.classList.remove('active');
  void activeSlideEl.offsetWidth;
  __transitionPreviewTimer = setTimeout(() => {
    __transitionPreviewTimer = null;
    activeSlideEl.classList.remove('transition-instant-reset');
    void activeSlideEl.offsetWidth;
    if (currentSlide === targetSlideNum && slides[currentSlide - 1] === activeSlideEl) {
      activeSlideEl.classList.add('active');
    }
  }, 45);
}

function applyTransitionToAllSlides() {
  const activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return;
  const cur = activeSlideEl.getAttribute('data-transition');
  slides.forEach(s => {
    if (s.getAttribute('data-slide-locked') === 'true') return;
    if (cur) s.setAttribute('data-transition', cur);
    else s.removeAttribute('data-transition');
  });
  saveHistorySnapshot();
  showToast(`모든 슬라이드에 "${TRANSITION_LABELS[cur || ''] || '기본'}" 트랜지션이 적용되었습니다.`);
}

/* ==================== SLIDE 16 LENS & ASPECT RATIO TRANSITION ==================== */
const LENS_ASPECT_STAGES = [
  {
    classes: ['w-32', 'h-full'],
    sub: 'TELEPHOTO LENS',
    label: '망원 · 4:3'
  },
  {
    classes: ['w-56', 'h-20'],
    sub: 'STANDARD LENS',
    label: '표준 · 16:9'
  },
  {
    classes: ['w-full', 'h-11'],
    sub: 'WIDE ANAMORPHIC',
    label: '광각 · 시네마스코프 (2.39:1)'
  }
];

function setLensAspectStage(stageIdx, sourceEl) {
  const slideEl = (sourceEl && sourceEl.closest('.slide')) || slides[currentSlide - 1];
  const normalizedIdx = ((stageIdx % LENS_ASPECT_STAGES.length) + LENS_ASPECT_STAGES.length) % LENS_ASPECT_STAGES.length;
  lensAspectStage = normalizedIdx;
  if (slideEl) {
    slideEl.dataset.lensStage = String(normalizedIdx);
  }
  const cfg = LENS_ASPECT_STAGES[normalizedIdx];
  const scope = slideEl || document;
  const box = scope.querySelector('[data-lens-box], #cinemaBox');
  if (box) {
    box.classList.remove('w-28', 'w-32', 'w-56', 'w-full', 'h-full', 'h-20', 'h-12', 'h-11');
    box.classList.add(...cfg.classes);
    box.innerHTML = `<span class="text-[10px] text-sky-200 tracking-wider">${cfg.sub}</span><span>${cfg.label}</span>`;
  }
  scope.querySelectorAll('.lens-stage-btn').forEach(btn => {
    const isMatch = Number(btn.getAttribute('data-lens-btn')) === normalizedIdx;
    btn.className = isMatch
      ? 'lens-stage-btn py-1 px-1.5 rounded bg-gopro text-white cursor-pointer'
      : 'lens-stage-btn py-1 px-1.5 rounded bg-white text-ink border border-borderline hover:border-gopro cursor-pointer';
  });
}

function toggleAspectRatio(sourceEl) {
  const slideEl = (sourceEl && sourceEl.closest('.slide')) || slides[currentSlide - 1];
  const curStage = slideEl && slideEl.dataset.lensStage !== undefined
    ? parseInt(slideEl.dataset.lensStage, 10)
    : lensAspectStage;
  setLensAspectStage((isNaN(curStage) ? 0 : curStage) + 1, slideEl);
}


/* ==================== GENERAL ENTRANCE & EMPHASIS ANIMATIONS ([data-anim]) & BUILD ORDER ==================== */
const GENERAL_ANIM_LABELS = {
  'fade-up': '페이드 업', 'fade-in': '페이드 인', 'slide-left': '좌측 슬라이드', 'slide-right': '우측 슬라이드',
  'slide-down': '상단 드롭 다운', 'zoom-in': '팝업 줌 인', 'zoom-out': '축소 안착 줌아웃', 'flip-in': '3D 플립 인',
  'rotate-in': '회전 등장', 'blur-in': '시네마 블러 인', 'bounce-in': '바운스 강조', 'pulse-loop': '맥박 펄스 반복',
  'float-loop': '부유 루프 반복', 'shake-attention': '흔들림 강조', 'none': '애니메이션 없음'
};
function setElementBuildOrder(rawStep) {
  const activeSlideEl = slides[currentSlide - 1];
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const rawTargets = (selectedElements && selectedElements.length > 0) ? selectedElements : ((selectedElement || getTargetCardForHierarchy()) ? [selectedElement || getTargetCardForHierarchy()] : []);
  const targets = rawTargets.filter(el => el && el.getAttribute('data-layer-locked') !== 'true');
  if (targets.length === 0) return;
  const stepNum = Math.max(0, Math.min(30, parseInt(rawStep, 10) || 0));
  targets.forEach(t => { if (stepNum <= 0) t.removeAttribute('data-build-order'); else t.setAttribute('data-build-order', String(stepNum)); });
  syncBuildOrderUI(targets[targets.length - 1]); saveHistorySnapshot(stepNum > 0 ? `클릭 등장 순서 ${stepNum}단계` : '클릭 등장 순서 해제');
}
function clearSlideBuildOrders() {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const activeSlideEl = slides[currentSlide - 1]; if (!activeSlideEl) return; let cleared = 0;
  activeSlideEl.querySelectorAll('[data-build-order]').forEach(el => { el.removeAttribute('data-build-order'); el.classList.remove('build-step-pending', 'build-step-revealed'); cleared++; });
  syncBuildOrderUI(selectedElement); if (cleared > 0) saveHistorySnapshot('슬라이드 등장 순서 일괄 해제');
}
function syncBuildOrderUI(el) {
  const stepVal = el ? (parseInt(el.getAttribute('data-build-order') || '0', 10) || 0) : 0;
  if ($studio('elementBuildOrderInput')) $studio('elementBuildOrderInput').value = String(stepVal);
  const badge = $studio('slideBuildCountBadge'), activeSlideEl = slides[currentSlide - 1];
  if (badge && activeSlideEl) { const c = activeSlideEl.querySelectorAll('[data-build-order]').length; badge.textContent = c > 0 ? `단계 ${c}개 설정됨` : '단계 없음'; }
}
function initSlideBuildSteps(slideEl) { if (!slideEl) return; const activeEdit = typeof isActiveEditing === 'function' ? isActiveEditing() : isEditMode; Array.from(slideEl.querySelectorAll('[data-build-order]')).forEach(el => { el.classList.remove('build-step-revealed'); if (!activeEdit) el.classList.add('build-step-pending'); else el.classList.remove('build-step-pending'); }); }
function advanceSlideBuildStep(slideEl) {
  const activeEdit = typeof isActiveEditing === 'function' ? isActiveEditing() : isEditMode;
  if (!slideEl || activeEdit) return false;
  const pending = Array.from(slideEl.querySelectorAll('[data-build-order].build-step-pending')); if (pending.length === 0) return false;
  let minStep = Infinity; pending.forEach(el => { const s = parseInt(el.getAttribute('data-build-order') || '1', 10) || 1; if (s < minStep) minStep = s; });
  pending.forEach(el => { const s = parseInt(el.getAttribute('data-build-order') || '1', 10) || 1; if (s === minStep) { el.classList.remove('build-step-pending'); el.classList.add('build-step-revealed'); if (typeof previewGeneralAnimationOnElement === 'function') previewGeneralAnimationOnElement(el); } });
  return true;
}
function rewindSlideBuildStep(slideEl) {
  const activeEdit = typeof isActiveEditing === 'function' ? isActiveEditing() : isEditMode;
  if (!slideEl || activeEdit) return false;
  const revealed = Array.from(slideEl.querySelectorAll('[data-build-order].build-step-revealed')); if (revealed.length === 0) return false;
  let maxStep = -Infinity; revealed.forEach(el => { const s = parseInt(el.getAttribute('data-build-order') || '1', 10) || 1; if (s > maxStep) maxStep = s; });
  revealed.forEach(el => { const s = parseInt(el.getAttribute('data-build-order') || '1', 10) || 1; if (s === maxStep) { el.classList.remove('build-step-revealed'); el.classList.add('build-step-pending'); } });
  return true;
}

function applyGeneralAnimationToSelected(animType) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const targets = (selectedElements && selectedElements.length > 1)
    ? selectedElements
    : ((selectedElement || getTargetCardForHierarchy()) ? [selectedElement || getTargetCardForHierarchy()] : []);
  if (targets.length === 0) {
    showToast('먼저 일반 애니메이션을 적용할 카드·텍스트·도형·차트를 클릭해 주세요.');
    return;
  }
  const delaySec = Number($studio('generalAnimDelayInput')?.value || 0);
  targets.forEach(target => {
    target.classList.remove('anim-preview-playing');
    if (!animType || animType === 'none') {
      target.removeAttribute('data-anim');
      target.style.removeProperty('--anim-delay');
    } else {
      target.setAttribute('data-anim', animType);
      target.style.setProperty('--anim-delay', `${delaySec}s`);
      previewGeneralAnimationOnElement(target);
    }
  });
  syncGeneralAnimUI(targets[targets.length - 1]);
  saveHistorySnapshot();
  showToast(`일반 애니메이션 [${GENERAL_ANIM_LABELS[animType] || animType}]이 적용되었습니다.`);
}

function setGeneralAnimationDelay(secVal) {
  const targets = (selectedElements && selectedElements.length > 1)
    ? selectedElements
    : ((selectedElement || getTargetCardForHierarchy()) ? [selectedElement || getTargetCardForHierarchy()] : []);
  if (targets.length === 0) return;
  const sec = Math.max(0, Math.min(5, Number(secVal) || 0));
  targets.forEach(target => {
    target.style.setProperty('--anim-delay', `${sec}s`);
    previewGeneralAnimationOnElement(target);
  });
  saveHistorySnapshot();
}

function previewGeneralAnimationOnElement(el) {
  if (!el || !el.getAttribute('data-anim')) return;
  el.classList.remove('anim-preview-playing');
  void el.offsetWidth;
  el.classList.add('anim-preview-playing');
  setTimeout(() => el.classList.remove('anim-preview-playing'), 1400);
}

function syncGeneralAnimUI(el) {
  const curAnim = el ? (el.getAttribute('data-anim') || 'none') : 'none';
  const rootDoc = (studioPopupWin && !studioPopupWin.closed) ? studioPopupWin.document : document;
  rootDoc.querySelectorAll('.gen-anim-btn').forEach(btn => {
    const isMatch = btn.getAttribute('data-anim-btn') === curAnim;
    if (btn.getAttribute('data-anim-btn') === 'none') return;
    btn.className = isMatch
      ? 'gen-anim-btn py-1.5 px-1 rounded bg-gopro text-white font-bold cursor-pointer'
      : 'gen-anim-btn py-1.5 px-1 rounded bg-white border border-borderline hover:border-gopro cursor-pointer';
  });
  if (el && $studio('generalAnimDelayInput')) {
    const rawDelay = el.style.getPropertyValue('--anim-delay') || '0s';
    $studio('generalAnimDelayInput').value = String(parseFloat(rawDelay) || 0);
  }
}
