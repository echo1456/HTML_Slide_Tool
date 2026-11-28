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
  'flip': '3D 플립',
  'morph': '✨ 모핑(Magic Move)'
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
    const isMorphBtn = btn.getAttribute('data-trans') === 'morph';
    const isMatch = btn.getAttribute('data-trans') === cur;
    const spanCls = isMorphBtn ? ' col-span-3' : '';
    btn.className = isMatch
      ? `trans-preset-btn${spanCls} py-1.5 px-1 rounded bg-gopro text-white font-bold cursor-pointer`
      : `trans-preset-btn${spanCls} py-1.5 px-1 rounded bg-white border border-borderline hover:border-gopro cursor-pointer`;
  });
  if (typeof syncMorphInspectorUI === 'function') syncMorphInspectorUI(typeof selectedElement !== 'undefined' ? selectedElement : null);
}

let __transitionPreviewTimer = null;
function previewCurrentSlideTransition() {
  const activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return;
  const targetSlideNum = currentSlide;
  const transType = activeSlideEl.getAttribute('data-transition') || '';
  if (transType === 'none') {
    showToast('현재 슬라이드는 "효과 없음" 상태입니다. 다른 전환 효과를 선택한 뒤 미리보기해 주세요.');
    return;
  }
  if (transType === 'morph') {
    const prevSlideEl = currentSlide > 1 ? slides[currentSlide - 2] : null;
    if (!prevSlideEl) {
      showToast('모핑 전환 미리보기는 2번 슬라이드 이상에서 이전 슬라이드와 비교해 재생됩니다.');
      return;
    }
    const snap = captureMorphSnapshots(prevSlideEl);
    const dur = Math.max(200, Math.min(2500, parseInt(activeSlideEl.getAttribute('data-morph-duration') || '650', 10) || 650));
    const stats = playMorphTransition(prevSlideEl, activeSlideEl, snap, dur, currentSlide - 1, currentSlide);
    if (!stats || stats.matchedIds.length === 0) {
      showToast('이전 슬라이드와 동일한 모핑 ID를 가진 요소가 없습니다. [+ 복제해 모핑 연결]을 사용해 보세요.');
    } else {
      showToast(`✨ 모핑 미리보기 재생 (${stats.matchedIds.length}개 요소 연결됨 · ${(dur / 1000).toFixed(2)}s)`);
    }
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

/* ==================== MORPH TRANSITION ENGINE (MAGIC MOVE — v5.8.0) ==================== */
function sanitizeMorphIdValue(raw) {
  return String(raw || '').trim().replace(/[^a-zA-Z0-9_가-힣-]/g, '').slice(0, 28);
}

function parseElementRotateDeg(el) {
  if (!el) return 0;
  const attrRot = parseFloat(el.getAttribute('data-rotate') || '');
  if (Number.isFinite(attrRot)) return attrRot;
  const t = (el.style && el.style.transform) ? el.style.transform : '';
  const m = t.match(/rotate\(\s*(-?\d+(?:\.\d+)?)deg\s*\)/i);
  return m ? (parseFloat(m[1]) || 0) : 0;
}

function captureMorphSnapshots(slideEl) {
  const map = new Map();
  if (!slideEl) return map;
  const scale = (typeof getStageScale === 'function' && getStageScale() > 0) ? getStageScale() : 1;
  const wasInactive = !slideEl.classList.contains('active');
  let prevInlineTransform = '';
  let hadInstantReset = false;
  if (wasInactive) {
    hadInstantReset = slideEl.classList.contains('transition-instant-reset');
    prevInlineTransform = slideEl.style.transform;
    slideEl.classList.add('transition-instant-reset');
    if (document.body.classList.contains('scaled-stage')) {
      slideEl.style.setProperty('transform', 'translate(calc(-50% + var(--stage-pan-x, 0px)), calc(-50% + var(--stage-pan-y, 0px))) scale(var(--stage-scale, 1))', 'important');
    } else {
      slideEl.style.setProperty('transform', 'none', 'important');
    }
    void slideEl.offsetWidth;
  }
  try {
  slideEl.querySelectorAll('[data-morph-id]').forEach(el => {
    const id = sanitizeMorphIdValue(el.getAttribute('data-morph-id'));
    if (!id || map.has(id)) return;
    if (el.getAttribute('data-layer-hidden') === 'true' || el.style.display === 'none' || el.style.visibility === 'hidden') return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const cs = window.getComputedStyle(el);
    const localW = Math.max(1, el.offsetWidth || (rect.width / scale));
    const localH = Math.max(1, el.offsetHeight || (rect.height / scale));
    const op = parseFloat(cs.opacity);
    map.set(id, {
      id,
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      w: localW,
      h: localH,
      opacity: Number.isFinite(op) ? op : 1,
      borderRadius: cs.borderRadius || el.style.borderRadius || '0px',
      rot: parseElementRotateDeg(el)
    });
  });
  } finally {
    if (wasInactive) {
      if (prevInlineTransform) slideEl.style.transform = prevInlineTransform;
      else slideEl.style.removeProperty('transform');
      if (!hadInstantReset) slideEl.classList.remove('transition-instant-reset');
    }
  }
  return map;
}

function playMorphTransition(prevSlideEl, nextSlideEl, srcMap, durationMs, fromNum, toNum) {
  const matchedIds = [];
  const dur = Math.max(200, Math.min(2500, Number(durationMs) || 650));
  if (!nextSlideEl || !(srcMap instanceof Map) || srcMap.size === 0) {
    window.__lastMorphTransitionStats = { from: fromNum || 0, to: toNum || 0, matchedIds, duration: dur };
    return window.__lastMorphTransitionStats;
  }

  nextSlideEl.style.setProperty('--morph-dur', `${(dur / 1000).toFixed(2)}s`);
  const scale = (typeof getStageScale === 'function' && getStageScale() > 0) ? getStageScale() : 1;
  const dstNodes = Array.from(nextSlideEl.querySelectorAll('[data-morph-id]'));
  const usedIds = new Set();

  dstNodes.forEach(dstEl => {
    const id = sanitizeMorphIdValue(dstEl.getAttribute('data-morph-id'));
    if (!id || usedIds.has(id) || !srcMap.has(id)) return;
    if (dstEl.classList.contains('build-step-pending')) return;
    if (dstEl.getAttribute('data-layer-hidden') === 'true' || dstEl.style.display === 'none' || dstEl.style.visibility === 'hidden') return;
    const src = srcMap.get(id);
    const dstRect = dstEl.getBoundingClientRect();
    if (dstRect.width <= 0 || dstRect.height <= 0) return;
    usedIds.add(id);

    if (dstEl.__activeMorphAnim) {
      try { dstEl.__activeMorphAnim.cancel(); } catch (e) {}
      dstEl.__activeMorphAnim = null;
    }

    const dstCx = dstRect.left + dstRect.width / 2;
    const dstCy = dstRect.top + dstRect.height / 2;
    const dstW = Math.max(1, dstEl.offsetWidth || (dstRect.width / scale));
    const dstH = Math.max(1, dstEl.offsetHeight || (dstRect.height / scale));

    const dx = (src.cx - dstCx) / scale;
    const dy = (src.cy - dstCy) / scale;
    const sx = Math.max(0.05, Math.min(20, src.w / dstW));
    const sy = Math.max(0.05, Math.min(20, src.h / dstH));
    const dstOffX = parseFloat(dstEl.getAttribute('data-offset-x') || '0') || 0;
    const dstOffY = parseFloat(dstEl.getAttribute('data-offset-y') || '0') || 0;
    const dstRot = parseElementRotateDeg(dstEl);
    const dstCs = window.getComputedStyle(dstEl);
    const dstOp = Number.isFinite(parseFloat(dstCs.opacity)) ? parseFloat(dstCs.opacity) : 1;
    const dstRadius = dstCs.borderRadius || dstEl.style.borderRadius || '0px';

    const fromTransform = `translate(${(dstOffX + dx).toFixed(2)}px, ${(dstOffY + dy).toFixed(2)}px) rotate(${src.rot}deg) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
    const toTransform = `translate(${dstOffX.toFixed(2)}px, ${dstOffY.toFixed(2)}px) rotate(${dstRot}deg) scale(1, 1)`;

    matchedIds.push(id);

    if (typeof dstEl.animate === 'function') {
      try {
        const anim = dstEl.animate(
          [
            { transform: fromTransform, opacity: src.opacity, borderRadius: src.borderRadius },
            { transform: toTransform, opacity: dstOp, borderRadius: dstRadius }
          ],
          { duration: dur, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'none' }
        );
        dstEl.__activeMorphAnim = anim;
        const clearRef = () => { if (dstEl.__activeMorphAnim === anim) dstEl.__activeMorphAnim = null; };
        anim.onfinish = clearRef;
        anim.oncancel = clearRef;
      } catch (e) {}
    } else {
      const prevTrans = dstEl.style.transition;
      const prevTransform = dstEl.style.transform;
      dstEl.style.transition = 'none';
      dstEl.style.transform = fromTransform;
      void dstEl.offsetWidth;
      dstEl.style.transition = `transform ${dur}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      dstEl.style.transform = prevTransform;
      setTimeout(() => { dstEl.style.transition = prevTrans; }, dur + 40);
    }
  });

  window.__lastMorphTransitionStats = {
    from: fromNum || 0,
    to: toNum || 0,
    matchedIds,
    duration: dur
  };
  return window.__lastMorphTransitionStats;
}

function getMorphableTargetElement() {
  if (typeof selectedElement !== 'undefined' && selectedElement && document.body.contains(selectedElement) && !selectedElement.closest('#fcRichBodyEditor') && !selectedElement.classList.contains('slide')) {
    return selectedElement;
  }
  return null;
}

function applyMorphIdToSelected(explicitRaw) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const el = getMorphableTargetElement();
  if (!el) {
    showToast('먼저 모핑 ID를 지정할 카드·도형·이미지·텍스트를 선택해 주세요.');
    return;
  }
  if (el.getAttribute('data-layer-locked') === 'true') {
    showToast('잠긴 레이어에는 모핑 ID를 변경할 수 없습니다.');
    return;
  }
  const inp = $studio('morphIdInput');
  const raw = explicitRaw !== undefined ? explicitRaw : (inp ? inp.value : '');
  const cleanId = sanitizeMorphIdValue(raw) || ('m_' + Date.now().toString(36).slice(-4));
  el.setAttribute('data-morph-id', cleanId);
  if (inp) inp.value = cleanId;
  syncMorphInspectorUI(el);
  saveHistorySnapshot(`모핑 ID 지정 (${cleanId})`);
  showToast(`◈ 모핑 ID "${cleanId}"가 지정되었습니다. 이전/다음 슬라이드 요소에 같은 ID를 지정하면 모핑 전환됩니다.`);
}

function clearMorphIdFromSelected() {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const el = getMorphableTargetElement();
  if (!el) return;
  if (el.getAttribute('data-layer-locked') === 'true') return;
  el.removeAttribute('data-morph-id');
  const inp = $studio('morphIdInput');
  if (inp) inp.value = '';
  syncMorphInspectorUI(el);
  saveHistorySnapshot('모핑 ID 해제');
  showToast('선택한 요소의 모핑 ID가 해제되었습니다.');
}

function setSlideMorphDuration(msVal) {
  const activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return;
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const dur = Math.max(200, Math.min(2500, parseInt(msVal, 10) || 650));
  activeSlideEl.setAttribute('data-morph-duration', String(dur));
  saveHistorySnapshot(`모핑 속도 변경 (${dur}ms)`);
}

function countMatchedMorphPairsWithPrevSlide(slideIdx) {
  if (slideIdx <= 0 || !slides[slideIdx] || !slides[slideIdx - 1]) return 0;
  const prevIds = new Set();
  slides[slideIdx - 1].querySelectorAll('[data-morph-id]').forEach(el => {
    const id = sanitizeMorphIdValue(el.getAttribute('data-morph-id'));
    if (id) prevIds.add(id);
  });
  let count = 0;
  const seen = new Set();
  slides[slideIdx].querySelectorAll('[data-morph-id]').forEach(el => {
    const id = sanitizeMorphIdValue(el.getAttribute('data-morph-id'));
    if (id && prevIds.has(id) && !seen.has(id)) {
      seen.add(id);
      count++;
    }
  });
  return count;
}

function syncMorphInspectorUI(el) {
  const inp = $studio('morphIdInput');
  if (inp) {
    const target = (el && !el.closest('#fcRichBodyEditor') && !el.classList.contains('slide')) ? el : null;
    inp.value = target ? (target.getAttribute('data-morph-id') || '') : '';
  }
  const activeSlideEl = slides[currentSlide - 1];
  const durSel = $studio('morphDurationSelect');
  if (durSel && activeSlideEl) {
    const dur = activeSlideEl.getAttribute('data-morph-duration') || '650';
    durSel.value = ['450', '650', '900', '1200'].includes(dur) ? dur : '650';
  }
  const badge = $studio('morphMatchStatusBadge');
  if (badge) {
    const curIdx = currentSlide - 1;
    const matched = countMatchedMorphPairsWithPrevSlide(curIdx);
    const totalHere = activeSlideEl ? activeSlideEl.querySelectorAll('[data-morph-id]').length : 0;
    badge.textContent = matched > 0 ? `이전 장과 ${matched}개 연결` : (totalHere > 0 ? `ID ${totalHere}개 (대기)` : '연결 0개');
    badge.className = matched > 0
      ? 'font-mono text-[9px] font-extrabold text-emerald-700'
      : 'font-mono text-[9px] font-bold text-muted';
  }
}

function duplicateSlideForMorphTransition() {
  const activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return;
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;

  // Auto-assign deterministic morph IDs to unlocked top-level morphable elements on source slide
  const morphCandidates = Array.from(activeSlideEl.querySelectorAll('.slide-header-bar, .slide-card, .ppt-free-obj'));
  const existingIds = new Set();
  activeSlideEl.querySelectorAll('[data-morph-id]').forEach(el => {
    const id = sanitizeMorphIdValue(el.getAttribute('data-morph-id'));
    if (id) existingIds.add(id);
  });
  let seq = 1;
  morphCandidates.forEach(el => {
    if (el.getAttribute('data-morph-id')) return;
    if (el.getAttribute('data-layer-hidden') === 'true' || el.getAttribute('data-layer-locked') === 'true') return;
    while (existingIds.has(`m${seq}`)) seq++;
    const assigned = `m${seq++}`;
    existingIds.add(assigned);
    el.setAttribute('data-morph-id', assigned);
  });

  if (typeof duplicateCurrentSlide === 'function') {
    duplicateCurrentSlide();
    const newSlideEl = slides[currentSlide - 1];
    if (newSlideEl) {
      newSlideEl.setAttribute('data-transition', 'morph');
      if (!newSlideEl.getAttribute('data-morph-duration')) {
        newSlideEl.setAttribute('data-morph-duration', '650');
      }
      syncTransitionUI();
      saveHistorySnapshot('모핑 전환용 슬라이드 복제 연결');
      showToast('✨ 슬라이드가 복제되어 모핑 전환이 연결되었습니다! 요소 위치·크기·색상을 바꿔 보세요.');
    }
  }
}

function applyTransitionToAllSlides() {
  const activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return;
  const cur = activeSlideEl.getAttribute('data-transition');
  const curMorphDur = activeSlideEl.getAttribute('data-morph-duration') || '650';
  slides.forEach(s => {
    if (s.getAttribute('data-slide-locked') === 'true') return;
    if (cur) s.setAttribute('data-transition', cur);
    else s.removeAttribute('data-transition');
    if (cur === 'morph') s.setAttribute('data-morph-duration', curMorphDur);
    else s.removeAttribute('data-morph-duration');
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
  const targets = rawTargets.filter(el => el && !(el.closest && el.closest('#fcRichBodyEditor')) && el.getAttribute('data-layer-locked') !== 'true');
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
let __dragBuildTimelineIdx = -1;
let __buildSeqPreviewTimers = [];

function getOrderedBuildElementsForSlide(slideEl) {
  if (!slideEl) return [];
  return Array.from(slideEl.querySelectorAll('[data-build-order]'))
    .map((el, domIdx) => ({
      el,
      domIdx,
      step: Math.max(1, Math.min(30, parseInt(el.getAttribute('data-build-order') || '1', 10) || 1)),
      delay: Math.max(0, Math.min(5, parseFloat((el.style.getPropertyValue('--anim-delay') || '0').replace('s', '')) || 0)),
      anim: el.getAttribute('data-anim') || ''
    }))
    .sort((a, b) => (a.step - b.step) || (a.domIdx - b.domIdx));
}

function getBuildElementDisplayLabel(el, fallbackIdx) {
  if (!el) return `요소 ${fallbackIdx + 1}`;
  const customName = (el.getAttribute('data-layer-name') || '').trim();
  if (customName) return customName.slice(0, 22);
  if (el.classList.contains('ppt-interactive-widget') && typeof getInteractiveWidgetDisplayName === 'function') {
    return getInteractiveWidgetDisplayName(el).slice(0, 22);
  }
  if (el.classList.contains('ppt-chart-widget')) {
    const h = el.querySelector('h4');
    return (h && h.textContent.trim() ? h.textContent.trim() : '차트·표').slice(0, 22);
  }
  const h = el.querySelector && el.querySelector('h1, h2, h3, h4, p, .shape-inner-text');
  const txt = ((h ? h.textContent : el.textContent) || '').replace(/\s+/g, ' ').trim();
  if (txt) return txt.slice(0, 22);
  if (el.classList.contains('slide-header-bar')) return '상단 타이틀 바';
  if (el.classList.contains('slide-card')) return `슬라이드 카드 ${fallbackIdx + 1}`;
  const st = el.getAttribute('data-shape-type');
  return st ? `도형 (${st})` : `요소 ${fallbackIdx + 1}`;
}

function renderBuildOrderTimeline() {
  const listEl = $studio('buildOrderTimelineList');
  if (!listEl) return;
  const activeSlideEl = slides[currentSlide - 1];
  const items = getOrderedBuildElementsForSlide(activeSlideEl);

  const badgeToggleBtn = $studio('toggleBuildBadgesBtn');
  if (badgeToggleBtn) {
    const hidden = document.body.classList.contains('hide-build-badges');
    badgeToggleBtn.textContent = hidden ? '배지 OFF' : '배지 ON';
    badgeToggleBtn.className = hidden
      ? 'px-1.5 py-0.5 rounded bg-canvas border border-borderline text-muted font-bold text-[9px] cursor-pointer'
      : 'px-1.5 py-0.5 rounded bg-violet-50 border border-violet-200 text-violet-800 font-bold text-[9px] cursor-pointer';
  }

  if (items.length === 0) {
    listEl.innerHTML = '<div class="text-[10px] text-muted text-center py-2">요소를 선택해 클릭 순서(1, 2, 3...)를 지정하면 이곳에서 드래그로 순서와 딜레이를 재배열할 수 있습니다.</div>';
    return;
  }

  listEl.innerHTML = items.map((item, idx) => {
    const isSel = typeof selectedElement !== 'undefined' && selectedElement === item.el;
    const lbl = getBuildElementDisplayLabel(item.el, idx);
    const animLbl = item.anim ? (GENERAL_ANIM_LABELS[item.anim] || item.anim) : '기본 페이드';
    return `<div draggable="true" data-build-row-idx="${idx}" data-on-dragstart="onBuildTimelineDragStart(event, ${idx})" data-on-dragover="event.preventDefault()" data-on-drop="onBuildTimelineDrop(event, ${idx})" data-on-click="selectBuildTimelineItem(${idx})" class="px-1.5 py-1 rounded-lg border ${isSel ? 'border-gopro bg-gopro/5' : 'border-borderline bg-canvas/70 hover:border-violet-400'} flex items-center gap-1 cursor-pointer select-none">
      <span class="text-muted cursor-grab font-mono text-[10px] px-0.5" title="드래그하여 등장 순서 재배열">⋮⋮</span>
      <input type="number" min="1" max="30" value="${item.step}" class="w-8 px-1 py-0.5 rounded bg-violet-600 text-white font-mono text-[10px] font-black text-center shrink-0" title="클릭 단계 번호 (같은 번호=동시 등장)" data-on-click="event.stopPropagation()" data-on-change="updateBuildTimelineItemStep(${idx}, this.value)">
      <div class="min-w-0 flex-1">
        <div class="text-[10px] font-bold text-ink truncate">${escapeAttr(lbl)}</div>
        <div class="font-mono text-[8px] text-muted truncate">${escapeAttr(animLbl)}</div>
      </div>
      <label class="inline-flex items-center gap-0.5 font-mono text-[9px] text-muted shrink-0" title="등장 지연(초)" data-on-click="event.stopPropagation()">
        <input type="number" min="0" max="5" step="0.1" value="${item.delay}" class="w-10 px-1 py-0.5 rounded bg-white border border-borderline text-ink text-right text-[9px]" data-on-change="updateBuildTimelineItemDelay(${idx}, this.value)"><span>s</span>
      </label>
      <button type="button" class="px-1 py-0.5 rounded bg-white border border-borderline text-[9px] font-bold text-ink cursor-pointer shrink-0" data-on-click="event.stopPropagation(); moveBuildTimelineItem(${idx}, -1)" aria-label="순서 위로" title="앞 단계로 이동">▲</button>
      <button type="button" class="px-1 py-0.5 rounded bg-white border border-borderline text-[9px] font-bold text-ink cursor-pointer shrink-0" data-on-click="event.stopPropagation(); moveBuildTimelineItem(${idx}, 1)" aria-label="순서 아래로" title="뒷 단계로 이동">▼</button>
      <button type="button" class="px-1 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-bold cursor-pointer shrink-0" data-on-click="event.stopPropagation(); removeBuildTimelineItem(${idx})" aria-label="등장 순서에서 제거" title="순서 해제">✕</button>
    </div>`;
  }).join('');
}

function onBuildTimelineDragStart(e, idx) {
  __dragBuildTimelineIdx = idx;
  if (e && e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', String(idx)); } catch (err) {}
  }
}

function onBuildTimelineDrop(e, targetIdx) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  const fromIdx = __dragBuildTimelineIdx;
  __dragBuildTimelineIdx = -1;
  if (fromIdx < 0 || fromIdx === targetIdx) return;
  reorderBuildTimelineItems(fromIdx, targetIdx);
}

function reorderBuildTimelineItems(fromIdx, toIdx) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return false;
  const activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return false;
  const items = getOrderedBuildElementsForSlide(activeSlideEl);
  if (fromIdx < 0 || fromIdx >= items.length || toIdx < 0 || toIdx >= items.length || fromIdx === toIdx) return false;
  if (items[fromIdx].el.getAttribute('data-layer-locked') === 'true') {
    showToast('잠긴 레이어는 등장 순서를 이동할 수 없습니다.');
    renderBuildOrderTimeline();
    return false;
  }
  const lo = Math.min(fromIdx, toIdx), hi = Math.max(fromIdx, toIdx);
  for (let i = lo; i <= hi; i++) {
    if (i !== fromIdx && items[i].el.getAttribute('data-layer-locked') === 'true') {
      showToast('이동 구간에 잠긴 레이어가 있어 순서를 변경할 수 없습니다. 잠금을 해제한 뒤 이동해 주세요.');
      renderBuildOrderTimeline();
      return false;
    }
  }
  const moved = items.splice(fromIdx, 1)[0];
  items.splice(toIdx, 0, moved);
  items.forEach((it, idx) => {
    if (it.el.getAttribute('data-layer-locked') === 'true') return;
    it.el.setAttribute('data-build-order', String(idx + 1));
  });
  syncBuildOrderUI(moved.el);
  saveHistorySnapshot('등장 순서 타임라인 재배열');
  showToast(`등장 순서가 ${toIdx + 1}단계로 재배열되었습니다.`);
  return true;
}

function moveBuildTimelineItem(idx, delta) {
  const activeSlideEl = slides[currentSlide - 1];
  const items = getOrderedBuildElementsForSlide(activeSlideEl);
  const nextIdx = idx + delta;
  if (nextIdx < 0 || nextIdx >= items.length) return false;
  return reorderBuildTimelineItems(idx, nextIdx);
}

function selectBuildTimelineItem(idx) {
  const activeSlideEl = slides[currentSlide - 1];
  const items = getOrderedBuildElementsForSlide(activeSlideEl);
  if (!items[idx] || !items[idx].el) return;
  if (typeof selectElementForInspector === 'function') {
    selectElementForInspector(items[idx].el, false);
  }
}

function updateBuildTimelineItemStep(idx, rawVal) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const activeSlideEl = slides[currentSlide - 1];
  const items = getOrderedBuildElementsForSlide(activeSlideEl);
  if (!items[idx] || !items[idx].el) return;
  if (items[idx].el.getAttribute('data-layer-locked') === 'true') {
    showToast('잠긴 레이어의 등장 순서는 변경할 수 없습니다.');
    renderBuildOrderTimeline();
    return;
  }
  const stepNum = Math.max(1, Math.min(30, parseInt(rawVal, 10) || 1));
  items[idx].el.setAttribute('data-build-order', String(stepNum));
  syncBuildOrderUI(items[idx].el);
  saveHistorySnapshot(`등장 단계 변경 (${stepNum}단계)`);
}

function updateBuildTimelineItemDelay(idx, rawSec) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const activeSlideEl = slides[currentSlide - 1];
  const items = getOrderedBuildElementsForSlide(activeSlideEl);
  if (!items[idx] || !items[idx].el) return;
  if (items[idx].el.getAttribute('data-layer-locked') === 'true') {
    showToast('잠긴 레이어의 지연 시간은 변경할 수 없습니다.');
    renderBuildOrderTimeline();
    return;
  }
  const sec = Math.max(0, Math.min(5, Math.round((Number(rawSec) || 0) * 10) / 10));
  items[idx].el.style.setProperty('--anim-delay', `${sec}s`);
  if (selectedElement === items[idx].el && $studio('generalAnimDelayInput')) {
    $studio('generalAnimDelayInput').value = String(sec);
  }
  renderBuildOrderTimeline();
  saveHistorySnapshot(`등장 지연 변경 (${sec}s)`);
}

function removeBuildTimelineItem(idx) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const activeSlideEl = slides[currentSlide - 1];
  const items = getOrderedBuildElementsForSlide(activeSlideEl);
  if (!items[idx] || !items[idx].el) return;
  const el = items[idx].el;
  el.removeAttribute('data-build-order');
  el.classList.remove('build-step-pending', 'build-step-revealed');
  syncBuildOrderUI(selectedElement);
  saveHistorySnapshot('클릭 등장 순서 개별 해제');
}

function normalizeSlideBuildOrders() {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return 0;
  const activeSlideEl = slides[currentSlide - 1];
  const items = getOrderedBuildElementsForSlide(activeSlideEl);
  if (items.length === 0) {
    showToast('정렬할 클릭 등장 요소가 없습니다.');
    return 0;
  }
  // Preserve simultaneous step groupings while compacting sparse gaps (e.g. 1, 5, 5, 9 -> 1, 2, 2, 3)
  const uniqueSteps = Array.from(new Set(items.map(it => it.step))).sort((a, b) => a - b);
  const stepMap = new Map();
  uniqueSteps.forEach((s, i) => stepMap.set(s, i + 1));
  items.forEach(it => {
    it.el.setAttribute('data-build-order', String(stepMap.get(it.step)));
  });
  syncBuildOrderUI(selectedElement);
  saveHistorySnapshot('등장 순서 자동 정렬');
  showToast(`등장 순서 ${items.length}개 요소가 1~${uniqueSteps.length}단계로 깔끔하게 정리되었습니다.`);
  return uniqueSteps.length;
}

function toggleBuildOrderBadges(forceHide) {
  const nextHidden = typeof forceHide === 'boolean' ? forceHide : !document.body.classList.contains('hide-build-badges');
  document.body.classList.toggle('hide-build-badges', nextHidden);
  renderBuildOrderTimeline();
  showToast(nextHidden ? '캔버스 등장 순서 번호 배지를 숨겼습니다.' : '캔버스 등장 순서 번호 배지를 표시합니다.');
}

function cancelBuildSequencePreview() {
  __buildSeqPreviewTimers.forEach(t => clearTimeout(t));
  __buildSeqPreviewTimers = [];
  document.body.classList.remove('build-seq-previewing');
  const activeSlideEl = slides[currentSlide - 1];
  if (activeSlideEl && (typeof isActiveEditing === 'function' ? isActiveEditing() : isEditMode)) {
    activeSlideEl.querySelectorAll('[data-build-order]').forEach(el => {
      el.classList.remove('build-step-pending', 'build-step-revealed');
    });
  }
}

function previewSlideBuildSequence() {
  cancelBuildSequencePreview();
  const activeSlideEl = slides[currentSlide - 1];
  const items = getOrderedBuildElementsForSlide(activeSlideEl);
  if (items.length === 0) {
    showToast('먼저 슬라이드 요소에 클릭 등장 순서(1, 2, 3...)를 지정해 주세요.');
    return false;
  }
  const uniqueSteps = Array.from(new Set(items.map(it => it.step))).sort((a, b) => a - b);
  document.body.classList.add('build-seq-previewing');
  items.forEach(it => {
    it.el.classList.remove('build-step-revealed');
    it.el.classList.add('build-step-pending');
  });
  uniqueSteps.forEach((stepNum, sIdx) => {
    const tId = setTimeout(() => {
      items.filter(it => it.step === stepNum).forEach(it => {
        const delayMs = Math.round(it.delay * 1000);
        const reveal = () => {
          it.el.classList.remove('build-step-pending');
          it.el.classList.add('build-step-revealed');
          if (typeof previewGeneralAnimationOnElement === 'function') previewGeneralAnimationOnElement(it.el);
        };
        if (delayMs > 0) __buildSeqPreviewTimers.push(setTimeout(reveal, delayMs));
        else reveal();
      });
    }, 240 + sIdx * 620);
    __buildSeqPreviewTimers.push(tId);
  });
  const maxItemDelayMs = items.reduce((mx, it) => Math.max(mx, Math.round((it.delay || 0) * 1000)), 0);
  const endId = setTimeout(() => {
    cancelBuildSequencePreview();
  }, 240 + uniqueSteps.length * 620 + maxItemDelayMs + 950);
  __buildSeqPreviewTimers.push(endId);
  showToast(`▶ 등장 순서 미리보기 재생 (${uniqueSteps.length}단계 · ${items.length}개 요소)`);
  return true;
}

function syncBuildOrderUI(el) {
  const stepVal = el ? (parseInt(el.getAttribute('data-build-order') || '0', 10) || 0) : 0;
  if ($studio('elementBuildOrderInput')) $studio('elementBuildOrderInput').value = String(stepVal);
  const badge = $studio('slideBuildCountBadge'), activeSlideEl = slides[currentSlide - 1];
  if (badge && activeSlideEl) { const c = activeSlideEl.querySelectorAll('[data-build-order]').length; badge.textContent = c > 0 ? `단계 ${c}개 설정됨` : '단계 없음'; }
  renderBuildOrderTimeline();
}
function initSlideBuildSteps(slideEl) {
  cancelBuildSequencePreview();
  if (!slideEl) return;
  const activeEdit = typeof isActiveEditing === 'function' ? isActiveEditing() : isEditMode;
  Array.from(slideEl.querySelectorAll('[data-build-order]')).forEach(el => {
    el.classList.remove('build-step-revealed');
    if (!activeEdit) el.classList.add('build-step-pending');
    else el.classList.remove('build-step-pending');
  });
}
function advanceSlideBuildStep(slideEl) {
  const activeEdit = typeof isActiveEditing === 'function' ? isActiveEditing() : isEditMode;
  if (!slideEl || activeEdit) return false;
  const pending = Array.from(slideEl.querySelectorAll('[data-build-order].build-step-pending')); if (pending.length === 0) return false;
  let minStep = Infinity; pending.forEach(el => { const s = parseInt(el.getAttribute('data-build-order') || '1', 10) || 1; if (s < minStep) minStep = s; });
  pending.forEach(el => {
    const s = parseInt(el.getAttribute('data-build-order') || '1', 10) || 1;
    if (s === minStep) {
      const delaySec = Math.max(0, Math.min(5, parseFloat((el.style.getPropertyValue('--anim-delay') || '0').replace('s', '')) || 0));
      el.classList.remove('build-step-pending');
      el.classList.add('build-step-revealed');
      if (delaySec > 0) {
        el.style.transitionDelay = `${delaySec}s`;
        setTimeout(() => { el.style.transitionDelay = ''; }, Math.round(delaySec * 1000) + 500);
      }
      if (typeof previewGeneralAnimationOnElement === 'function') previewGeneralAnimationOnElement(el);
    }
  });
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
  renderBuildOrderTimeline();
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
  renderBuildOrderTimeline();
  saveHistorySnapshot();
}

function previewGeneralAnimationOnElement(el) {
  if (!el || !el.getAttribute('data-anim')) return;
  if (el.__animPreviewTimer) { clearTimeout(el.__animPreviewTimer); el.__animPreviewTimer = null; }
  const delaySec = Math.max(0, Math.min(5, parseFloat((el.style.getPropertyValue('--anim-delay') || '0').replace('s', '')) || 0));
  el.classList.remove('anim-preview-playing');
  void el.offsetWidth;
  el.classList.add('anim-preview-playing');
  el.__animPreviewTimer = setTimeout(() => {
    el.__animPreviewTimer = null;
    el.classList.remove('anim-preview-playing');
  }, 1400 + Math.round(delaySec * 1000));
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
