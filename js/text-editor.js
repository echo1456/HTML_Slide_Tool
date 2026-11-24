/* ==================== TYPOGRAPHY, TOOLBAR SYNC & FORMAT PAINTER ==================== */
let savedTextSelectionRange = null;
let activeLiveColorSpan = null;

function getActiveEditableSelectionWindow() {
  const isFcCtx = typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive();
  if (isFcCtx && typeof getActiveFcPreviewCanvas === 'function') {
    const fcEd = getActiveFcPreviewCanvas();
    const fcWin = (fcEd && fcEd.ownerDocument && fcEd.ownerDocument.defaultView) ? fcEd.ownerDocument.defaultView : window;
    if (fcWin && typeof fcWin.getSelection === 'function') return fcWin;
  }
  return window;
}

function captureEditableTextSelection() {
  const win = getActiveEditableSelectionWindow();
  const sel = win.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  if (sel.isCollapsed || sel.toString().trim().length === 0) {
    const node = sel.anchorNode ? (sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode) : null;
    // Clear stale saved range ONLY when user explicitly clicked inside #slideStage or #fcRichBodyEditor
    if (node && node.closest('#slideStage, #fcRichBodyEditor')) {
      savedTextSelectionRange = null;
      activeLiveColorSpan = null;
      if (typeof activeLiveHighlightSpan !== 'undefined') activeLiveHighlightSpan = null;
    }
    return;
  }
  const range = sel.getRangeAt(0);
  const ancestor = range.commonAncestorContainer.nodeType === 3
    ? range.commonAncestorContainer.parentElement
    : range.commonAncestorContainer;
  if (ancestor && ((ancestor.closest('#slideStage') && ancestor.closest('[data-editable], #headerSectionBadge, .header-editable')) || ancestor.closest('#fcRichBodyEditor'))) {
    savedTextSelectionRange = range.cloneRange();
    activeLiveColorSpan = null;
    if (typeof activeLiveHighlightSpan !== 'undefined') activeLiveHighlightSpan = null;
  }
}

document.addEventListener('selectionchange', () => {
  if (!isEditMode) return;
  captureEditableTextSelection();
  updateTextCharCounter();
});

function getUsableTextRange() {
  const win = getActiveEditableSelectionWindow();
  const sel = win.getSelection();
  const isFcCtx = typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive();
  const scopeSelector = isFcCtx ? '#fcRichBodyEditor' : '#slideStage, #fcRichBodyEditor';
  if (sel && sel.rangeCount > 0 && !sel.isCollapsed && sel.toString().trim().length > 0) {
    const r = sel.getRangeAt(0);
    const anc = r.commonAncestorContainer.nodeType === 3 ? r.commonAncestorContainer.parentElement : r.commonAncestorContainer;
    if (anc && anc.closest(scopeSelector)) {
      savedTextSelectionRange = r.cloneRange();
      return { sel, range: r };
    }
  }
  if (savedTextSelectionRange) {
    const anc = savedTextSelectionRange.commonAncestorContainer.nodeType === 3
      ? savedTextSelectionRange.commonAncestorContainer.parentElement
      : savedTextSelectionRange.commonAncestorContainer;
    const ownerDoc = anc ? anc.ownerDocument : document;
    if (anc && ownerDoc && ownerDoc.body && ownerDoc.body.contains(anc) && anc.closest(scopeSelector) && savedTextSelectionRange.toString().trim().length > 0) {
      return { sel, range: savedTextSelectionRange };
    }
    savedTextSelectionRange = null;
  }
  return null;
}

function getMultiTextTargets() {
  if (typeof selectedElements !== 'undefined' && Array.isArray(selectedElements) && selectedElements.length > 1) {
    const list = [];
    selectedElements.forEach(el => {
      if (!el || !document.body.contains(el)) return;
      if (el.hasAttribute('data-editable') || el.matches('h1, h2, h3, h4, p, blockquote, li, span')) {
        list.push(el);
      } else {
        const innerEds = el.querySelectorAll('[data-editable]');
        if (innerEds.length > 0) innerEds.forEach(ie => list.push(ie));
        else list.push(el);
      }
    });
    return Array.from(new Set(list));
  }
  const single = getTargetTextEl();
  return single ? [single] : [];
}

function syncToolbarWithTarget(targetEl) {
  if (!isEditMode || !targetEl) return;
  const cs = window.getComputedStyle(targetEl);

  const fontSelect = $studio('fontFamilySelect');
  if (fontSelect) {
    const ff = (cs.fontFamily || '').toLowerCase();
    const options = Array.from(fontSelect.options);
    const matched = options.find(opt => {
      const cleanOpt = opt.value.split(',')[0].replace(/['"]/g, '').trim().toLowerCase();
      return ff.includes(cleanOpt);
    });
    const primaryName = (cs.fontFamily || '').split(',')[0].replace(/['"]/g, '').trim();
    if (matched) {
      fontSelect.value = matched.value;
    } else if (primaryName) {
      let customOpt = options.find(opt => opt.dataset.customLocal === 'true' && opt.textContent.toLowerCase().includes(primaryName.toLowerCase()));
      if (!customOpt) {
        customOpt = document.createElement('option');
        customOpt.value = cs.fontFamily;
        customOpt.dataset.customLocal = 'true';
        customOpt.textContent = `${primaryName} (로컬)`;
        fontSelect.appendChild(customOpt);
      }
      fontSelect.value = customOpt.value;
    } else {
      fontSelect.value = options[0].value;
    }
    const localInp = $studio('customLocalFontInput');
    if (localInp && document.activeElement !== localInp && primaryName) {
      localInp.value = primaryName;
    }
  }

  const sizeInput = $studio('fontSizeInput');
  if (sizeInput) {
    sizeInput.value = Math.round(parseFloat(cs.fontSize) || 18);
  }

  const colorPicker = $studio('textColorPicker');
  const hexColor = rgbToHex(cs.color);
  if (colorPicker && hexColor) {
    colorPicker.value = hexColor;
  }

  const selObj = window.getSelection();
  const anchorEl = (selObj && selObj.anchorNode) ? (selObj.anchorNode.nodeType === 3 ? selObj.anchorNode.parentElement : selObj.anchorNode) : targetEl;
  const isBold = parseInt(cs.fontWeight, 10) >= 700 || cs.fontWeight === 'bold' || Boolean(anchorEl && anchorEl.closest('b, strong'));
  const isItalic = cs.fontStyle === 'italic' || Boolean(anchorEl && anchorEl.closest('i, em'));
  const isUnderline = (cs.textDecorationLine || '').includes('underline') || Boolean(anchorEl && anchorEl.closest('u'));
  const isStrike = (cs.textDecorationLine || '').includes('line-through') || Boolean(anchorEl && anchorEl.closest('s, strike, del'));

  $studio('fmtBoldBtn')?.classList.toggle('is-active', isBold);
  $studio('fmtItalicBtn')?.classList.toggle('is-active', isItalic);
  $studio('fmtUnderlineBtn')?.classList.toggle('is-active', isUnderline);
  $studio('fmtStrikeBtn')?.classList.toggle('is-active', isStrike);

  const align = cs.textAlign;
  $studio('fmtAlignLeftBtn')?.classList.toggle('is-active', align === 'left' || align === 'start');
  $studio('fmtAlignCenterBtn')?.classList.toggle('is-active', align === 'center');
  $studio('fmtAlignRightBtn')?.classList.toggle('is-active', align === 'right' || align === 'end');
  $studio('fmtAlignJustifyBtn')?.classList.toggle('is-active', align === 'justify');
  $studio('fmtSupBtn')?.classList.toggle('is-active', Boolean(anchorEl && anchorEl.closest('sup')));
  $studio('fmtSubBtn')?.classList.toggle('is-active', Boolean(anchorEl && anchorEl.closest('sub')));
  const lhInp = $studio('lineHeightInput');
  if (lhInp) { const rawLh = targetEl.style.lineHeight; if (rawLh && !isNaN(parseFloat(rawLh))) lhInp.value = String(parseFloat(rawLh)); else { const fPx = parseFloat(cs.fontSize) || 16, lhPx = parseFloat(cs.lineHeight); lhInp.value = (!isNaN(lhPx) && fPx > 0) ? (lhPx / fPx).toFixed(2) : '1.45'; } }
  const lsInp = $studio('letterSpacingInput');
  if (lsInp) { const rawLs = targetEl.style.letterSpacing; if (rawLs && rawLs.endsWith('em')) lsInp.value = String(parseFloat(rawLs) || 0); else if (rawLs && rawLs.endsWith('px')) lsInp.value = ((parseFloat(rawLs) || 0) / (parseFloat(cs.fontSize) || 16)).toFixed(2); else lsInp.value = '0'; }
  const mtInp = $studio('paraMarginTopInput'), mbInp = $studio('paraMarginBottomInput');
  if (mtInp) mtInp.value = String(Math.round(parseFloat(targetEl.style.marginTop || cs.marginTop) || 0));
  if (mbInp) mbInp.value = String(Math.round(parseFloat(targetEl.style.marginBottom || cs.marginBottom) || 0));
  const autoFitBtn = $studio('textAutoFitToggleBtn');
  if (autoFitBtn) autoFitBtn.classList.toggle('is-active', targetEl.getAttribute('data-text-autofit') === 'true' || Boolean(targetEl.closest('[data-text-autofit="true"]')));
  const wbBtn = $studio('wordBreakToggleBtn');
  if (wbBtn) { const isBreakAll = (targetEl.style.wordBreak || cs.wordBreak) === 'break-all'; wbBtn.textContent = isBreakAll ? '글자 줄바꿈' : '어절 유지'; wbBtn.classList.toggle('is-active', isBreakAll); }
  updateTextCharCounter(targetEl);
}

function getTargetTextEl() {
  const isFcCtx = typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive();
  const fcEd = isFcCtx && typeof getActiveFcPreviewCanvas === 'function' ? getActiveFcPreviewCanvas() : null;
  const fcWin = (fcEd && fcEd.ownerDocument && fcEd.ownerDocument.defaultView) ? fcEd.ownerDocument.defaultView : window;
  const fcSel = (fcWin && typeof fcWin.getSelection === 'function') ? fcWin.getSelection() : null;
  const sel = (fcSel && fcSel.anchorNode) ? fcSel : window.getSelection();
  if (sel && sel.anchorNode) {
    const node = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
    if (fcEd && node && fcEd.contains(node)) {
      const fcHit = node.closest('[data-editable], h1, h2, h3, h4, p, li, blockquote, .fc-text-box');
      if (fcHit && fcEd.contains(fcHit)) return fcHit;
    }
    const ed = node ? node.closest('[data-editable], #headerSectionBadge, .header-editable') : null;
    if (ed && (!fcEd || fcEd.contains(ed))) return ed;
  }
  if (fcEd) {
    if (selectedElement && fcEd.contains(selectedElement)) {
      if (selectedElement.matches('[data-editable], h1, h2, h3, h4, p, li, blockquote, .fc-text-box')) return selectedElement;
      const innerFc = selectedElement.querySelector('[data-editable], h1, h2, h3, h4, p, li, blockquote');
      if (innerFc) return innerFc;
    }
    return fcEd.querySelector('h1, h2, h3, h4, p, li, blockquote, [data-editable]') || fcEd;
  }
  if (typeof activeChartCellTarget !== 'undefined' && activeChartCellTarget && document.body.contains(activeChartCellTarget) && (!fcEd || fcEd.contains(activeChartCellTarget))) {
    if (!selectedElement || selectedElement.contains(activeChartCellTarget) || selectedElement === activeChartCellTarget) {
      return activeChartCellTarget;
    }
  }
  if (selectedElement) {
    if (selectedElement.hasAttribute('data-editable')) return selectedElement;
    if (lastFocusedEditable && document.body.contains(lastFocusedEditable) && selectedElement.contains(lastFocusedEditable)) {
      return lastFocusedEditable;
    }
    const inner = selectedElement.querySelector('[data-editable]');
    if (inner) return inner;
  }
  if (lastFocusedEditable && document.body.contains(lastFocusedEditable)) {
    return lastFocusedEditable;
  }
  return null;
}

function applyFontFamily(fontCss) {
  if ((typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) || (selectedElement && selectedElement.getAttribute('data-layer-locked') === 'true')) return;
  const usable = getUsableTextRange();
  if (usable && (!selectedElements || selectedElements.length <= 1)) {
    const span = document.createElement('span');
    span.style.fontFamily = fontCss;
    try {
      const extracted = usable.range.extractContents();
      span.appendChild(extracted);
      usable.range.insertNode(span);
      savedTextSelectionRange = null;
      if (usable.sel) usable.sel.removeAllRanges();
      saveHistorySnapshot();
      showToast('선택 영역에 글꼴이 적용되었습니다.');
      return;
    } catch (e) {}
  }
  const targets = getMultiTextTargets();
  if (targets.length > 0) {
    targets.forEach(t => {
      t.style.fontFamily = fontCss;
    });
    syncToolbarWithTarget(targets[targets.length - 1]);
    saveHistorySnapshot();
    showToast(targets.length > 1 ? `${targets.length}개 선택 요소에 글꼴이 적용되었습니다.` : '글꼴이 적용되었습니다.');
  } else {
    showToast('글꼴을 적용할 텍스트를 먼저 클릭해 주세요.');
  }
}


function buildSafeLocalFontCss(rawFontName) {
  const clean = String(rawFontName || '').replace(/["';<>\\{}]/g, '').trim().slice(0, 60);
  if (!clean) return '';
  const low = clean.toLowerCase();
  const isMono = /mono|code|consolas|courier|d2coding|menlo|fira/.test(low);
  const isSerif = /serif|myungjo|myeongjo|batang|gungsuh|georgia|times|명조|바탕|궁서/.test(low);
  const fallback = isMono
    ? "'SF Mono', 'Consolas', 'D2Coding', monospace"
    : (isSerif
      ? "'AppleMyungjo', 'Batang', Georgia, serif"
      : "'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif");
  return `'${clean}', ${fallback}`;
}

function applyCustomLocalFont(explicitName) {
  const inp = $studio('customLocalFontInput');
  const raw = explicitName !== undefined ? explicitName : (inp ? inp.value : '');
  const cssStack = buildSafeLocalFontCss(raw);
  if (!cssStack) {
    showToast('적용할 로컬 폰트 이름을 입력하거나 목록에서 선택해 주세요.');
    return;
  }
  const fontSelect = $studio('fontFamilySelect');
  if (fontSelect) {
    let opt = Array.from(fontSelect.options).find(o => o.value === cssStack);
    if (!opt) {
      opt = document.createElement('option');
      opt.value = cssStack;
      opt.textContent = `${raw.trim()} (로컬)`;
      fontSelect.appendChild(opt);
    }
    fontSelect.value = cssStack;
  }
  applyFontFamily(cssStack);
}

function applyCustomLocalFontToDeck(explicitName) {
  const inp = $studio('customLocalFontInput');
  const raw = explicitName !== undefined ? explicitName : (inp ? inp.value : '');
  const cssStack = buildSafeLocalFontCss(raw);
  if (!cssStack) {
    showToast('전체 슬라이드에 적용할 로컬 폰트 이름을 먼저 입력해 주세요.');
    return;
  }
  let changed = 0;
  document.querySelectorAll('#slideStage [data-editable], #slideStage h1, #slideStage h2, #slideStage h3, #slideStage h4, #slideStage p, #slideStage li').forEach(el => {
    if (el.closest('.slide[data-slide-locked="true"], [data-layer-locked="true"], .card-edit-controls, .img-edit-overlay, .sub-box-del-btn, .iw-edit-bar, .chart-scenario-bar, .iw-flip-cue, .iw-hs-dot, .ppt-slide-comment-badge')) return;
    if (el.classList.contains('font-mono')) return;
    el.style.fontFamily = cssStack;
    changed++;
  });
  saveHistorySnapshot(`로컬 폰트 일괄 적용 (${raw.trim()})`);
  showToast(`전체 슬라이드(${changed}개 텍스트)에 로컬 폰트 "${raw.trim()}"이 적용되었습니다.`);
}

function reapplyCurrentFontFamily() {
  const fontSelect = $studio('fontFamilySelect');
  if (fontSelect) applyFontFamily(fontSelect.value);
}

function reapplyCurrentTextColor() {
  const picker = $studio('textColorPicker');
  if (picker) applyTextColor(picker.value);
}

function adjustSelectedFontSize(delta) {
  if ((typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) || (selectedElement && selectedElement.getAttribute('data-layer-locked') === 'true')) return;
  const usable = getUsableTextRange();
  if (usable && (!selectedElements || selectedElements.length <= 1)) {
    const baseEl = usable.range.commonAncestorContainer.nodeType === 3 ? usable.range.commonAncestorContainer.parentElement : usable.range.commonAncestorContainer;
    const curPx = parseFloat(window.getComputedStyle(baseEl || document.body).fontSize) || 18;
    const nextPx = Math.max(10, Math.min(120, Math.round(curPx + delta * 2)));
    setSelectedFontSizePx(nextPx, false);
    const inputEl = $studio('fontSizeInput');
    if (inputEl) inputEl.value = nextPx;
    return;
  }
  const targets = getMultiTextTargets();
  if (targets.length > 0) {
    let lastPx = 18;
    targets.forEach(target => {
      const currentPx = parseFloat(window.getComputedStyle(target).fontSize) || 18;
      const nextPx = Math.max(10, Math.min(120, Math.round(currentPx + delta * 2)));
      target.style.setProperty('font-size', nextPx + 'px', 'important');
      target.querySelectorAll('span[style*="font-size"]').forEach(sp => {
        const spPx = parseFloat(window.getComputedStyle(sp).fontSize) || nextPx;
        sp.style.setProperty('font-size', Math.max(10, Math.min(120, Math.round(spPx + delta * 2))) + 'px', 'important');
      });
      lastPx = nextPx;
    });
    const inputEl = $studio('fontSizeInput');
    if (inputEl) inputEl.value = lastPx;
    positionSelectionOverlay();
    saveHistorySnapshot();
  } else {
    showToast('크기를 조절할 텍스트를 먼저 클릭해 주세요.');
  }
}

function setSelectedFontSizePx(pxVal, isLiveInput) {
  if ((typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) || (selectedElement && selectedElement.getAttribute('data-layer-locked') === 'true')) return;
  const nextPx = Math.max(10, Math.min(120, Number(pxVal) || 18));
  const usable = getUsableTextRange();
  if (usable && (!selectedElements || selectedElements.length <= 1)) {
    const span = document.createElement('span');
    span.style.setProperty('font-size', nextPx + 'px', 'important');
    try {
      const extracted = usable.range.extractContents();
      extracted.querySelectorAll('span[style*="font-size"]').forEach(sp => {
        sp.style.setProperty('font-size', nextPx + 'px', 'important');
      });
      span.appendChild(extracted);
      usable.range.insertNode(span);
      savedTextSelectionRange = null;
      if (usable.sel) usable.sel.removeAllRanges();
      if (!isLiveInput) {
        saveHistorySnapshot();
        showToast(`선택 영역의 글자 크기가 ${nextPx}px로 변경되었습니다.`);
      }
      return;
    } catch (e) {}
  }
  const targets = getMultiTextTargets();
  if (targets.length > 0) {
    const touchedTableWidgets = new Set();
    targets.forEach(target => {
      target.style.setProperty('font-size', nextPx + 'px', 'important');
      target.querySelectorAll('span[style*="font-size"]').forEach(sp => {
        sp.style.setProperty('font-size', nextPx + 'px', 'important');
      });
      // Sync font-size into table data-chart-json so re-renders, equalizing & PPTX/PNG exports preserve it!
      const cellEl = target.matches && target.matches('th[data-cell-key], td[data-cell-key]') ? target : (target.closest ? target.closest('th[data-cell-key], td[data-cell-key]') : null);
      const tblWidget = target.classList && target.classList.contains('ppt-chart-widget') ? target : (target.closest ? target.closest('.ppt-chart-widget') : null);
      if (tblWidget && typeof readChartData === 'function') {
        const d = readChartData(tblWidget);
        if (d && d.type === 'table') {
          if (!d.cellStyles) d.cellStyles = {};
          if (cellEl) {
            const keys = (typeof selectedTableCellKeys !== 'undefined' && selectedTableCellKeys.size > 0)
              ? Array.from(selectedTableCellKeys)
              : [cellEl.getAttribute('data-cell-key')].filter(Boolean);
            keys.forEach(ck => {
              if (!d.cellStyles[ck]) d.cellStyles[ck] = {};
              d.cellStyles[ck].fontSize = nextPx;
              const domCell = tblWidget.querySelector(`[data-cell-key="${ck}"]`);
              if (domCell) domCell.style.setProperty('font-size', nextPx + 'px', 'important');
            });
          } else {
            d.tableFontSize = nextPx;
            tblWidget.querySelectorAll('th[data-cell-key], td[data-cell-key]').forEach(c => {
              const ck = c.getAttribute('data-cell-key');
              if (ck) {
                if (!d.cellStyles[ck]) d.cellStyles[ck] = {};
                d.cellStyles[ck].fontSize = nextPx;
              }
              c.style.setProperty('font-size', nextPx + 'px', 'important');
            });
          }
          tblWidget.setAttribute('data-chart-json', JSON.stringify(d));
          touchedTableWidgets.add(tblWidget);
        }
      }
    });
    // Also handle case where activeChartCellTarget is set on a table cell while targets didn't directly include it
    if (touchedTableWidgets.size === 0 && typeof activeChartCellTarget !== 'undefined' && activeChartCellTarget && activeChartCellTarget.closest) {
      const cw = activeChartCellTarget.closest('.ppt-chart-widget');
      if (cw && typeof readChartData === 'function') {
        const d = readChartData(cw);
        if (d && d.type === 'table') {
          if (!d.cellStyles) d.cellStyles = {};
          const keys = (typeof selectedTableCellKeys !== 'undefined' && selectedTableCellKeys.size > 0)
            ? Array.from(selectedTableCellKeys)
            : [activeChartCellTarget.getAttribute('data-cell-key')].filter(Boolean);
          keys.forEach(ck => {
            if (!d.cellStyles[ck]) d.cellStyles[ck] = {};
            d.cellStyles[ck].fontSize = nextPx;
            const domCell = cw.querySelector(`[data-cell-key="${ck}"]`);
            if (domCell) domCell.style.setProperty('font-size', nextPx + 'px', 'important');
          });
          cw.setAttribute('data-chart-json', JSON.stringify(d));
        }
      }
    }
    positionSelectionOverlay();
    if (!isLiveInput) {
      saveHistorySnapshot();
      if (targets.length > 1) {
        showToast(`${targets.length}개 선택 요소의 글자 크기가 ${nextPx}px로 변경되었습니다.`);
      }
    }
  } else if (!isLiveInput) {
    showToast('크기를 변경할 텍스트를 먼저 클릭해 주세요.');
  }
}

function applyLineHeight(val, isLiveInput) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;

  if (val === '' || val === null || val === undefined) return;
  const num = parseFloat(val), cssVal = !isNaN(num) ? String(Math.max(0.8, Math.min(3.5, num))) : String(val);
  const targets = getMultiTextTargets();
  if (targets.length > 0) { targets.forEach(t => { t.style.lineHeight = cssVal; }); positionSelectionOverlay(); if (!isLiveInput) saveHistorySnapshot('행간 변경'); }
}
function applyLetterSpacing(val, isLiveInput) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;

  if (val === '' || val === null || val === undefined) return;
  const str = String(val).trim(), cssVal = /^-?\d+(?:\.\d+)?$/.test(str) ? `${Math.max(-0.2, Math.min(1.0, parseFloat(str)))}em` : str;
  const targets = getMultiTextTargets();
  if (targets.length > 0) { targets.forEach(t => { t.style.letterSpacing = cssVal; }); if (!isLiveInput) saveHistorySnapshot('자간 변경'); }
}

function execFormat(command) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  if (selectedElement && selectedElement.getAttribute('data-layer-locked') === 'true') {
    showToast('잠긴 레이어의 텍스트 서식은 변경할 수 없습니다.');
    return;
  }

  const alignMap = {
    justifyLeft: 'left',
    justifyCenter: 'center',
    justifyRight: 'right',
    justifyFull: 'justify'
  };

  // 1. Block Alignment always applies to targeted text element(s) regardless of inline text selection!
  if (alignMap[command]) {
    const targets = getMultiTextTargets();
    if (targets.length === 0) {
      showToast('먼저 정렬할 텍스트나 카드를 클릭해 주세요.');
      return;
    }
    const nextAlign = alignMap[command];
    targets.forEach(t => { t.style.textAlign = nextAlign; });
    syncToolbarWithTarget(targets[targets.length - 1]);
    if (typeof recordRepeatableAction === 'function') recordRepeatableAction(`정렬 (${nextAlign})`, () => execFormat(command));
    saveHistorySnapshot(`텍스트 정렬 (${nextAlign})`);
    return;
  }

  // 2. Inline Text Selection Range (single element with dragged text range)
  const inlineRange = getUsableTextRange();
  if (inlineRange && (!selectedElements || selectedElements.length <= 1)) {
    const tagMap = { bold: 'strong', italic: 'em', underline: 'u', strikeThrough: 's' };
    const tagName = tagMap[command];
    if (tagName) {
      const anc = inlineRange.range.commonAncestorContainer.nodeType === 3 ? inlineRange.range.commonAncestorContainer.parentElement : inlineRange.range.commonAncestorContainer;
      const existingTag = anc ? anc.closest(tagName) : null;
      if (existingTag && existingTag.parentNode) {
        const p = existingTag.parentNode;
        while (existingTag.firstChild) p.insertBefore(existingTag.firstChild, existingTag);
        p.removeChild(existingTag);
        p.normalize();
      } else {
        const wrapper = document.createElement(tagName);
        try {
          wrapper.appendChild(inlineRange.range.extractContents());
          inlineRange.range.insertNode(wrapper);
        } catch (err) {}
      }
      savedTextSelectionRange = null;
      if (inlineRange.sel) inlineRange.sel.removeAllRanges();
      const target = getTargetTextEl();
      if (target) syncToolbarWithTarget(target);
      if (typeof recordRepeatableAction === 'function') recordRepeatableAction(`서식 (${command})`, () => execFormat(command));
      saveHistorySnapshot(`서식 (${command})`);
      return;
    }
  }

  // 3. Whole-Element Formatting (Works for BOTH single-selected AND multi-selected text targets!)
  const targets = getMultiTextTargets();
  if (targets.length === 0) {
    showToast('먼저 서식을 적용할 텍스트를 클릭하거나 드래그해 주세요.');
    return;
  }
  const firstCs = window.getComputedStyle(targets[0]);
  if (command === 'bold') {
    const nextBold = !(parseInt(firstCs.fontWeight, 10) >= 700 || firstCs.fontWeight === 'bold');
    targets.forEach(t => { t.style.fontWeight = nextBold ? '800' : '400'; });
  } else if (command === 'italic') {
    const nextItalic = firstCs.fontStyle !== 'italic';
    targets.forEach(t => { t.style.fontStyle = nextItalic ? 'italic' : 'normal'; });
  } else if (command === 'underline') {
    const curDec = (firstCs.textDecorationLine || firstCs.textDecoration || '');
    const hasU = curDec.includes('underline');
    const hasS = curDec.includes('line-through');
    const nextDec = (!hasU ? 'underline' : '') + (hasS ? ' line-through' : '');
    targets.forEach(t => { t.style.textDecoration = nextDec.trim() || 'none'; });
  } else if (command === 'strikeThrough') {
    const curDec = (firstCs.textDecorationLine || firstCs.textDecoration || '');
    const hasU = curDec.includes('underline');
    const hasS = curDec.includes('line-through');
    const nextDec = (hasU ? 'underline' : '') + (!hasS ? ' line-through' : '');
    targets.forEach(t => { t.style.textDecoration = nextDec.trim() || 'none'; });
  }
  syncToolbarWithTarget(targets[targets.length - 1]);
  if (typeof recordRepeatableAction === 'function') recordRepeatableAction(`서식 (${command})`, () => execFormat(command));
  saveHistorySnapshot(`서식 (${command})`);
}

function applyTextColor(hexColor, isLiveInput) {
  if ((typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) || (selectedElement && selectedElement.getAttribute('data-layer-locked') === 'true')) return;
  // 1. Live color picker dragging on an already created inline color span
  if (activeLiveColorSpan && document.body.contains(activeLiveColorSpan)) {
    activeLiveColorSpan.style.color = hexColor;
    if (!isLiveInput) {
      activeLiveColorSpan = null;
      saveHistorySnapshot();
    }
    return;
  }

  // 2. Dragged text range inside a sentence (works even after <input type="color"> steals focus!)
  const usable = getUsableTextRange();
  if (usable && (!selectedElements || selectedElements.length <= 1)) {
    const range = usable.range;
    const span = document.createElement('span');
    span.style.color = hexColor;
    try {
      const extracted = range.extractContents();
      extracted.querySelectorAll('span[style*="color"]').forEach(innerSp => {
        if (!innerSp.classList.contains('kw')) {
          innerSp.style.color = hexColor;
        }
      });
      span.appendChild(extracted);
      range.insertNode(span);
      activeLiveColorSpan = isLiveInput ? span : null;
      savedTextSelectionRange = null;
      if (usable.sel) usable.sel.removeAllRanges();
      if (!isLiveInput) {
        saveHistorySnapshot();
        showToast('드래그한 텍스트에 글자 색상이 적용되었습니다.');
      }
      return;
    } catch (e) {
      // Range fallback handled by block target below
    }
  }

  // 3. Single or Multi-selected elements
  const targets = getMultiTextTargets();
  if (targets.length > 0) {
    targets.forEach(target => {
      target.style.setProperty('color', hexColor, 'important');
      target.querySelectorAll('span').forEach(sp => {
        if (sp.classList.contains('kw') || sp.classList.contains('hl-mark')) return;
        if (sp.closest('.card-edit-controls, .iw-edit-bar, .iw-ba-badge, .iw-flip-cue, .iw-hs-pin, .ppt-chart-widget, .chart-scenario-bar, .ppt-slide-comment-badge')) return;
        sp.style.setProperty('color', hexColor, 'important');
      });
    });
    syncToolbarWithTarget(targets[targets.length - 1]);
    if (!isLiveInput) {
      saveHistorySnapshot();
      showToast(targets.length > 1 ? `${targets.length}개 선택 요소에 글자 색상이 적용되었습니다.` : '글자 색상이 적용되었습니다.');
    }
  } else if (!isLiveInput) {
    showToast('색상을 입힐 텍스트를 먼저 클릭하거나 드래그해 주세요.');
  }
}

let activeLiveHighlightSpan = null;

function applyHighlightSelection(customHex, isLiveInput) {
  if ((typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) || (selectedElement && selectedElement.getAttribute('data-layer-locked') === 'true')) return;
  const picker = $studio('highlightColorPicker');
  const hlColor = customHex || (picker ? picker.value : '#FFE600');

  if (activeLiveHighlightSpan && document.body.contains(activeLiveHighlightSpan) && customHex) {
    activeLiveHighlightSpan.style.backgroundColor = hlColor;
    if (!isLiveInput) {
      activeLiveHighlightSpan = null;
      saveHistorySnapshot();
    }
    return;
  }

  const usable = getUsableTextRange();

  if (usable && (!selectedElements || selectedElements.length <= 1)) {
    const range = usable.range;
    const anchorEl = range.commonAncestorContainer.nodeType === 3 ? range.commonAncestorContainer.parentElement : range.commonAncestorContainer;
    const existingHl = anchorEl ? anchorEl.closest('.hl-mark') : null;
    if (existingHl && !customHex) {
      unwrapHighlightSpan(existingHl);
      savedTextSelectionRange = null;
      if (usable.sel) usable.sel.removeAllRanges();
      if (!isLiveInput) {
        saveHistorySnapshot();
        showToast('형광펜 강조가 해제되었습니다.');
      }
      return;
    }

    const span = document.createElement('span');
    span.className = 'hl-mark px-1 rounded font-bold text-ink';
    span.style.backgroundColor = hlColor;
    try {
      const extracted = range.extractContents();
      span.appendChild(extracted);
      range.insertNode(span);
      activeLiveHighlightSpan = isLiveInput ? span : null;
      savedTextSelectionRange = null;
      if (usable.sel) usable.sel.removeAllRanges();
      if (!isLiveInput) {
        saveHistorySnapshot();
        showToast('형광펜 강조가 적용되었습니다.');
      }
      return;
    } catch (e) {}
  }

  const sel = window.getSelection();
  if (sel && sel.anchorNode && (!selectedElements || selectedElements.length <= 1)) {
    const node = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
    const existingHl = node ? node.closest('.hl-mark') : null;
    if (existingHl && !customHex) {
      unwrapHighlightSpan(existingHl);
      if (!isLiveInput) {
        saveHistorySnapshot();
        showToast('형광펜 강조가 해제되었습니다.');
      }
      return;
    }
  }

  const targets = getMultiTextTargets();
  if (targets.length > 0) {
    targets.forEach(target => {
      if (target.classList.contains('hl-mark') && !customHex) {
        target.classList.remove('hl-mark');
        target.style.backgroundColor = '';
        target.style.padding = '';
        target.style.borderRadius = '';
      } else {
        target.classList.add('hl-mark');
        target.style.backgroundColor = hlColor;
        target.style.padding = '2px 6px';
        target.style.borderRadius = '4px';
      }
    });
    if (!isLiveInput) {
      saveHistorySnapshot();
      showToast('텍스트 배경 형광펜이 적용되었습니다.');
    }
  } else if (!isLiveInput) {
    showToast('형광펜을 입힐 텍스트를 먼저 클릭하거나 드래그해 주세요.');
  }
}

function unwrapHighlightSpan(spanEl) {
  if (!spanEl || !spanEl.parentNode) return;
  const parent = spanEl.parentNode;
  while (spanEl.firstChild) {
    parent.insertBefore(spanEl.firstChild, spanEl);
  }
  parent.removeChild(spanEl);
  parent.normalize();
}

function removeHighlightSelection() {
  if ((typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) || (selectedElement && selectedElement.getAttribute('data-layer-locked') === 'true')) return;
  const sel = window.getSelection();
  if (sel && sel.anchorNode && (!selectedElements || selectedElements.length <= 1)) {
    const node = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
    const hlSpan = node ? node.closest('.hl-mark') : null;
    if (hlSpan) {
      unwrapHighlightSpan(hlSpan);
      saveHistorySnapshot();
      showToast('형광펜이 해제되었습니다.');
      return;
    }
    if (!sel.isCollapsed) {
      const r = sel.getRangeAt(0);
      const plainTxt = document.createTextNode(r.toString());
      r.deleteContents();
      r.insertNode(plainTxt);
      saveHistorySnapshot();
      showToast('선택 영역 형광펜 및 서식이 해제되었습니다.');
      return;
    }
  }

  const targets = getMultiTextTargets();
  if (targets.length > 0) {
    targets.forEach(target => {
      target.querySelectorAll('.hl-mark').forEach(sp => unwrapHighlightSpan(sp));
      target.classList.remove('hl-mark');
      target.style.backgroundColor = '';
    });
    saveHistorySnapshot();
    showToast('형광펜 강조가 해제되었습니다.');
  } else {
    showToast('형광펜을 해제할 텍스트를 먼저 클릭해 주세요.');
  }
}

/* ==================== CORE KEYWORD (.kw) DESIGNATION & REMOVAL ==================== */
function designateCoreKeyword() {
  if ((typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) || (selectedElement && selectedElement.getAttribute('data-layer-locked') === 'true')) return;
  const usable = getUsableTextRange();
  if (usable && (!selectedElements || selectedElements.length <= 1)) {
    const range = usable.range;
    const parentBlock = range.commonAncestorContainer.nodeType === 3
      ? range.commonAncestorContainer.parentElement
      : range.commonAncestorContainer;
    const span = document.createElement('span');
    span.className = 'kw';
    try {
      const extracted = range.extractContents();
      extracted.querySelectorAll('span.kw').forEach(nested => {
        const p = nested.parentNode;
        while (nested.firstChild) p.insertBefore(nested.firstChild, nested);
        p.removeChild(nested);
      });
      span.appendChild(extracted);
      range.insertNode(span);
      if (parentBlock) parentBlock.normalize();
      savedTextSelectionRange = null;
      if (usable.sel) usable.sel.removeAllRanges();
      saveHistorySnapshot();
      showToast('핵심 키워드(.kw)로 지정되었습니다! 단축키 [H]로 강조할 수 있습니다.');
      return;
    } catch (e) {}
  }
  const targets = getMultiTextTargets();
  if (targets.length > 0) {
    targets.forEach(target => target.classList.add('kw'));
    saveHistorySnapshot();
    showToast('선택된 텍스트 블록이 핵심 키워드(.kw)로 지정되었습니다.');
  } else {
    showToast('핵심 키워드로 지정할 텍스트를 먼저 드래그하거나 클릭해 주세요.');
  }
}

function removeCoreKeyword() {
  if ((typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) || (selectedElement && selectedElement.getAttribute('data-layer-locked') === 'true')) return;
  const sel = window.getSelection();
  if (sel && sel.anchorNode && (!selectedElements || selectedElements.length <= 1)) {
    const node = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
    const kwEl = node ? node.closest('.kw') : null;
    if (kwEl) {
      if (kwEl.tagName === 'SPAN' && kwEl.classList.length === 1 && !kwEl.getAttribute('style')) {
        const p = kwEl.parentNode;
        if (p) {
          while (kwEl.firstChild) p.insertBefore(kwEl.firstChild, kwEl);
          p.removeChild(kwEl);
          p.normalize();
        }
      } else {
        kwEl.classList.remove('kw');
      }
      saveHistorySnapshot();
      showToast('핵심 키워드 지정이 해제되었습니다.');
      return;
    }
  }
  const targets = getMultiTextTargets();
  if (targets.length > 0) {
    targets.forEach(target => {
      target.classList.remove('kw');
      target.querySelectorAll('.kw').forEach(k => k.classList.remove('kw'));
    });
    saveHistorySnapshot();
    showToast('핵심 키워드 지정이 해제되었습니다.');
  } else {
    showToast('해제할 핵심 키워드 텍스트를 먼저 클릭해 주세요.');
  }
}

/* ==================== FORMAT PAINTER ==================== */
function toggleFormatPainter() {
  isFormatPainterActive = !isFormatPainterActive;
  if (isFormatPainterActive) {
    const src = getTargetTextEl();
    if (!src) {
      isFormatPainterActive = false;
      showToast('먼저 복사할 기준 텍스트를 클릭해 주세요.');
      return;
    }
    const cs = window.getComputedStyle(src);
    copiedFormatStyle = {
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle,
      color: cs.color,
      letterSpacing: cs.letterSpacing,
      lineHeight: cs.lineHeight,
      backgroundColor: src.style.backgroundColor || '',
      borderRadius: src.style.borderRadius || '',
      padding: src.style.padding || ''
    };
    showToast('서식이 복사되었습니다! 적용할 다른 텍스트를 클릭하세요.');
  }
  updateFormatPainterUI();
}

function updateFormatPainterUI() {
  const btn = $studio('formatPainterBtn');
  if (!btn) return;
  if (isFormatPainterActive) {
    btn.classList.add('bg-gopro', 'text-white');
  } else {
    btn.classList.remove('bg-gopro', 'text-white');
  }
}

function applyCopiedFormatTo(target) {
  if (!copiedFormatStyle || !target) return;
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) {
    isFormatPainterActive = false;
    updateFormatPainterUI();
    return;
  }
  const rawTargets = (selectedElements && selectedElements.length > 1) ? getMultiTextTargets() : [target];
  const targets = rawTargets.filter(t => t && !t.closest('[data-layer-locked="true"]'));
  if (targets.length === 0) {
    isFormatPainterActive = false;
    updateFormatPainterUI();
    showToast('잠긴 레이어에는 서식을 적용할 수 없습니다.');
    return;
  }
  targets.forEach(t => Object.assign(t.style, copiedFormatStyle));
  isFormatPainterActive = false;
  updateFormatPainterUI();
  syncToolbarWithTarget(target);
  saveHistorySnapshot();
  showToast('복사한 서식이 적용되었습니다.');
}

/* ==================== TEXT ROUNDED PILL / BOX STYLING ==================== */
function setTextPillRadiusPreset(rad) {
  const slider = $studio('textPillRadiusSlider');
  if (slider) slider.value = rad === '9999px' ? '40' : String(parseInt(rad, 10) || 0);
  const targets = getActiveTextPillOrBlocks();
  if (targets.length > 0) {
    targets.forEach(t => { t.style.borderRadius = rad; });
    saveHistorySnapshot();
  }
}

function updateTextPillLiveRadius(val) {
  const rad = Number(val) >= 40 ? '9999px' : `${val}px`;
  const targets = getActiveTextPillOrBlocks();
  targets.forEach(t => { t.style.borderRadius = rad; });
}

function setTextPillPadding(padStr) {
  const targets = getActiveTextPillOrBlocks();
  if (targets.length > 0) {
    targets.forEach(t => { t.style.padding = padStr; });
    saveHistorySnapshot();
  }
}

function getActiveTextPillOrBlocks() {
  if (selectedElements && selectedElements.length > 1) {
    return getMultiTextTargets();
  }
  const single = getActiveTextPillOrBlock();
  return single ? [single] : [];
}

function getActiveTextPillOrBlock() {
  const sel = window.getSelection();
  if (sel && sel.anchorNode) {
    const node = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
    const pill = node ? node.closest('.text-pill-span') : null;
    if (pill) return pill;
  }
  return getTargetTextEl();
}

function updateTextPillLiveBgOpacity(val) {
  const alphaPct = val !== undefined ? Number(val) : Number($studio('textPillBgOpacitySlider')?.value ?? 100);
  const lbl = $studio('textPillBgOpacityLabel');
  if (lbl) lbl.textContent = `${alphaPct}%`;
  const bgHex = $studio('textPillBgPicker')?.value || '#FEF3C7';
  const targets = getActiveTextPillOrBlocks();
  targets.forEach(target => {
    if (target.classList.contains('text-pill-span') || target.style.backgroundColor) {
      target.setAttribute('data-pill-bg-hex', bgHex);
      target.style.backgroundColor = hexToRgba(bgHex, alphaPct);
    }
  });
}

function updateTextPillLiveTextColor(hexColor) {
  const targets = getActiveTextPillOrBlocks();
  targets.forEach(target => {
    if (target.classList.contains('text-pill-span') || target.style.backgroundColor) {
      target.style.color = hexColor;
    }
  });
}

function applyTextBackgroundBox() {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;

  const bg = $studio('textPillBgPicker')?.value || '#FEF3C7';
  const fg = $studio('textPillColorPicker')?.value || '#78350F';
  const alphaPct = Number($studio('textPillBgOpacitySlider')?.value ?? 100);
  const bgRgba = hexToRgba(bg, alphaPct);
  const sliderVal = Number($studio('textPillRadiusSlider')?.value ?? 40);
  const radius = sliderVal >= 40 ? '9999px' : `${sliderVal}px`;

  const usable = getUsableTextRange();
  if (usable && (!selectedElements || selectedElements.length <= 1)) {
    const range = usable.range;
    const span = document.createElement('span');
    span.className = 'text-pill-span font-bold';
    span.setAttribute('data-pill-bg-hex', bg);
    span.style.backgroundColor = bgRgba;
    span.style.color = fg;
    span.style.borderRadius = radius;
    span.style.padding = '3px 12px';
    span.style.margin = '0 2px';
    try {
      const extracted = range.extractContents();
      span.appendChild(extracted);
      range.insertNode(span);
      savedTextSelectionRange = null;
      if (usable.sel) usable.sel.removeAllRanges();
      saveHistorySnapshot();
      showToast('드래그한 텍스트에 라운드 배경 박스가 적용되었습니다.');
      return;
    } catch (e) {}
  }

  const targets = getMultiTextTargets();
  if (targets.length > 0) {
    targets.forEach(target => {
      target.setAttribute('data-pill-bg-hex', bg);
      target.style.display = target.tagName === 'SPAN' ? 'inline-block' : target.style.display;
      target.style.backgroundColor = bgRgba;
      target.style.color = fg;
      target.style.borderRadius = radius;
      target.style.padding = '6px 14px';
    });
    saveHistorySnapshot();
    showToast('선택된 텍스트 블록에 배경 박스가 적용되었습니다.');
  } else {
    showToast('배경 박스를 입힐 텍스트를 드래그하거나 클릭해 주세요.');
  }
}

function removeTextBackgroundBox() {
  if ((typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) || (selectedElement && selectedElement.getAttribute('data-layer-locked') === 'true')) return;
  const unwrapPill = (pillEl) => {
    if (!pillEl || !pillEl.parentNode) return;
    const p = pillEl.parentNode;
    while (pillEl.firstChild) p.insertBefore(pillEl.firstChild, pillEl);
    p.removeChild(pillEl);
    p.normalize();
  };
  const sel = window.getSelection();
  if (sel && sel.anchorNode && (!selectedElements || selectedElements.length <= 1)) {
    const node = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
    const pill = node ? node.closest('.text-pill-span') : null;
    if (pill) {
      unwrapPill(pill);
      saveHistorySnapshot('텍스트 배경 박스 해제');
      showToast('텍스트 배경 박스가 해제되었습니다.');
      return;
    }
  }
  const targets = getMultiTextTargets();
  if (targets.length > 0) {
    targets.forEach(target => {
      Array.from(target.querySelectorAll('.text-pill-span')).forEach(unwrapPill);
      target.removeAttribute('data-pill-bg-hex');
      target.style.backgroundColor = '';
      target.style.color = '';
      target.style.borderRadius = '';
      target.style.padding = '';
    });
    saveHistorySnapshot('배경 박스 스타일 제거');
    showToast('배경 박스 스타일이 제거되었습니다.');
  }
}

function makeAllTextEditable(enable) {
  const stage = document.getElementById('slideStage');
  if (enable) {
    // Strip stale data-editable from inline .kw spans inside sentences so keywords never spawn separate selection boxes
    stage.querySelectorAll('span.kw[data-editable]').forEach(kw => {
      if (kw.parentElement && kw.parentElement.closest('h1, h2, h3, h4, p, li, blockquote, div[data-editable]')) {
        kw.removeAttribute('data-editable');
        kw.removeAttribute('contenteditable');
      }
    });
    stage.querySelectorAll('h1, h2, h3, h4, p, li, blockquote, span, div').forEach(el => {
      if (el.closest('.card-edit-controls, .img-edit-overlay, .sub-box-del-btn, .ppt-free-layer, .table-col-resizer, .table-row-resizer, .iw-edit-bar, .chart-scenario-bar, .iw-flip-cue, .iw-hs-dot, .ppt-slide-comment-badge')) return;
      if (el.classList.contains('kw') || el.classList.contains('fx-text-span') || el.classList.contains('hl-mark') || el.classList.contains('text-pill-span')) return;
      if (el.children.length === 0 && el.textContent.trim().length > 0) {
        el.setAttribute('data-editable', '');
      }
    });
    // Re-hydrate interactive table cell column/row resize handles on existing tables
    if (typeof readChartData === 'function' && typeof renderChartWidgetInnerHtml === 'function') {
      document.querySelectorAll('.ppt-chart-widget').forEach(widget => {
        const d = readChartData(widget);
        if (d && d.type === 'table') {
          widget.innerHTML = renderChartWidgetInnerHtml(d);
        }
      });
    }
    const spellVal = window.__pptSpellcheckEnabled === false ? 'false' : 'true';
    document.querySelectorAll('[data-editable], #headerSectionBadge, .header-editable, .card-inner-textbox > p, .card-inner-textbox > div, .ppt-free-obj[data-shape-type="textbox"] .shape-inner-text').forEach(el => {
      if (el.classList.contains('kw') || el.classList.contains('fx-text-span')) return;
      el.setAttribute('contenteditable', 'true'); el.setAttribute('spellcheck', spellVal);
    });
  } else {
    document.querySelectorAll('[contenteditable="true"]').forEach(el => { el.removeAttribute('contenteditable'); el.removeAttribute('spellcheck'); });
  }
}

window.__pptSpellcheckEnabled = true;
function toggleSpellcheckMode() {
  window.__pptSpellcheckEnabled = !window.__pptSpellcheckEnabled;
  const spellVal = window.__pptSpellcheckEnabled ? 'true' : 'false';
  document.querySelectorAll('[contenteditable="true"]').forEach(el => { el.setAttribute('spellcheck', spellVal); });
  const btn = $studio('spellcheckToggleBtn');
  if (btn) { btn.classList.toggle('is-active', window.__pptSpellcheckEnabled); btn.textContent = window.__pptSpellcheckEnabled ? '맞춤법 ON' : '맞춤법 OFF'; }
}
function updateTextCharCounter(explicitEl) {
  const badge = $studio('textCharCountBadge'); if (!badge) return;
  let rawText = ''; const sel = window.getSelection();
  if (sel && sel.rangeCount > 0 && !sel.isCollapsed && sel.toString().length > 0) { const anc = sel.getRangeAt(0).commonAncestorContainer, ancEl = anc.nodeType === 3 ? anc.parentElement : anc; if (ancEl && ancEl.closest('#slideStage')) rawText = sel.toString(); }
  if (!rawText) { const t = explicitEl || getTargetTextEl(); if (t) rawText = t.textContent || ''; }
  badge.textContent = `${rawText.length}자 (공백제외 ${rawText.replace(/\s+/g, '').length}자)`;
}
function toggleTextList(listType) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;

  const tagTarget = listType === 'ol' ? 'OL' : 'UL', listClass = listType === 'ol' ? 'ppt-number-list' : 'ppt-bullet-list', target = getTargetTextEl();
  if (!target) return;
  const existingList = target.closest('ul, ol') || target.querySelector(':scope > ul, :scope > ol');
  if (existingList) {
    if (existingList.tagName === tagTarget) {
      const items = Array.from(existingList.querySelectorAll('li')).map(li => li.innerHTML.trim()).filter(Boolean), parent = existingList.parentElement, p = document.createElement('p');
      p.setAttribute('data-editable', ''); if (isEditMode) p.setAttribute('contenteditable', 'true');
      p.className = (parent && parent.tagName === 'DIV' && parent.children.length === 1 && !parent.classList.contains('slide-card') && !parent.classList.contains('card-inner-textbox') && !parent.classList.contains('shape-inner-text')) ? (parent.className || 'text-base text-ink leading-relaxed') : 'text-base text-ink leading-relaxed';
      p.innerHTML = items.join('<br>');
      if (parent && parent.tagName === 'DIV' && parent.children.length === 1 && !parent.classList.contains('slide-card') && !parent.classList.contains('card-inner-textbox') && !parent.classList.contains('shape-inner-text')) parent.replaceWith(p);
      else existingList.replaceWith(p);
      lastFocusedEditable = p; selectElementForInspector(p); saveHistorySnapshot('목록 해제'); return;
    } else {
      const newList = document.createElement(listType === 'ol' ? 'ol' : 'ul'); newList.className = listClass;
      while (existingList.firstChild) newList.appendChild(existingList.firstChild);
      existingList.replaceWith(newList); saveHistorySnapshot('목록 유형 전환'); return;
    }
  }
  const lines = (target.innerHTML || '').split(/<br\s*\/?>/i).map(s => s.trim()).filter(s => s.length > 0);
  if (lines.length === 0) lines.push('목록 항목 입력');
  const listEl = document.createElement(listType === 'ol' ? 'ol' : 'ul'); listEl.className = listClass;
  lines.forEach(lineHtml => { const li = document.createElement('li'); li.setAttribute('data-editable', ''); if (isEditMode) li.setAttribute('contenteditable', 'true'); li.innerHTML = lineHtml; listEl.appendChild(li); });
  if (['P', 'H1', 'H2', 'H3', 'H4', 'SPAN'].includes(target.tagName)) {
    const wrapper = document.createElement('div'); wrapper.className = target.className;
    if (target.getAttribute('style')) wrapper.setAttribute('style', target.getAttribute('style'));
    wrapper.appendChild(listEl); target.replaceWith(wrapper); selectElementForInspector(wrapper);
  } else { target.innerHTML = ''; target.appendChild(listEl); }
  const firstLi = listEl.querySelector('li'); if (firstLi) { lastFocusedEditable = firstLi; firstLi.focus(); }
  saveHistorySnapshot(listType === 'ol' ? '번호 목록 적용' : '글머리 목록 적용');
}
function adjustListIndent(dir) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;

  const sel = window.getSelection();
  let anchor = sel && sel.anchorNode ? (sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode) : null;
  if (!anchor && lastFocusedEditable) anchor = lastFocusedEditable;
  const li = anchor ? anchor.closest('li') : null;
  if (li && li.parentElement) {
    const parentList = li.parentElement;
    if (dir > 0) {
      const prevLi = li.previousElementSibling;
      if (prevLi && prevLi.tagName === 'LI') {
        const subTag = parentList.tagName === 'OL' ? 'ol' : 'ul';
        let subList = prevLi.querySelector(`:scope > ${subTag}`);
        if (!subList) { subList = document.createElement(subTag); subList.className = subTag === 'ol' ? 'ppt-number-list' : 'ppt-bullet-list'; prevLi.appendChild(subList); }
        subList.appendChild(li); li.focus(); saveHistorySnapshot('목록 들여쓰기'); return true;
      }
      li.style.marginLeft = Math.min(120, (parseInt(li.style.marginLeft || '0', 10) || 0) + 20) + 'px'; saveHistorySnapshot('목록 들여쓰기'); return true;
    } else {
      const grandLi = parentList.parentElement && parentList.parentElement.tagName === 'LI' ? parentList.parentElement : null;
      if (grandLi && grandLi.parentElement) { grandLi.parentElement.insertBefore(li, grandLi.nextSibling); if (parentList.children.length === 0) parentList.remove(); li.focus(); saveHistorySnapshot('목록 내어쓰기'); return true; }
      li.style.marginLeft = Math.max(0, (parseInt(li.style.marginLeft || '0', 10) || 0) - 20) + 'px'; saveHistorySnapshot('목록 내어쓰기'); return true;
    }
  }
  const target = getTargetTextEl();
  if (target) { const curPad = parseInt(target.style.paddingLeft || '0', 10) || 0, nextPad = dir > 0 ? Math.min(120, curPad + 16) : Math.max(0, curPad - 16); target.style.paddingLeft = nextPad > 0 ? `${nextPad}px` : ''; saveHistorySnapshot('문단 들여쓰기'); return true; }
  return false;
}
function clearAllTextFormatting() {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;

  const usable = getUsableTextRange();
  if (usable && (!selectedElements || selectedElements.length <= 1)) {
    const textOnly = usable.range.toString(); usable.range.deleteContents();
    const tn = document.createTextNode(textOnly); usable.range.insertNode(tn);
    if (tn.parentElement) tn.parentElement.normalize();
    savedTextSelectionRange = null; if (usable.sel) usable.sel.removeAllRanges();
    saveHistorySnapshot('부분 서식 지우기'); updateTextCharCounter(); return;
  }
  const targets = getMultiTextTargets(); if (targets.length === 0) return;
  targets.forEach(target => {
    Array.from(target.querySelectorAll('span, b, strong, i, em, u, s, strike, font, sup, sub, a')).reverse().forEach(node => {
      if (node.closest('.card-edit-controls, .sub-box-del-btn, .iw-edit-bar, .iw-ba-badge, .iw-flip-cue, .iw-tab-btn, .iw-hs-pin, .ppt-chart-widget, .chart-scenario-bar, .ppt-slide-comment-badge')) return;
      if (node.classList.contains('toc-num') || node.classList.contains('toc-sub') || node.classList.contains('toc-title')) return;
      const p = node.parentNode; if (!p) return;
      while (node.firstChild) p.insertBefore(node.firstChild, node); p.removeChild(node);
    });
    target.normalize();
    ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'textDecoration', 'color', 'backgroundColor', 'borderRadius', 'padding', 'paddingLeft', 'marginTop', 'marginBottom', 'letterSpacing', 'lineHeight', 'textShadow', 'webkitTextStroke', 'paintOrder', 'textTransform', 'verticalAlign', 'wordBreak', 'display', 'flexDirection', 'justifyContent'].forEach(prop => { target.style[prop] = ''; });
    target.classList.remove('kw', 'hl-mark', 'text-pill-span');
    target.removeAttribute('data-text-autofit'); target.removeAttribute('data-autofit-max-px'); target.removeAttribute('data-text-spotlight-container'); target.removeAttribute('data-pill-bg-hex');
  });
  syncToolbarWithTarget(targets[targets.length - 1]); positionSelectionOverlay();
  if (typeof recordRepeatableAction === 'function') recordRepeatableAction('전체 서식 지우기', () => clearAllTextFormatting());
  saveHistorySnapshot('전체 서식 지우기');
}
function setParagraphSpacing(side, rawPx, isLiveInput) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
 const px = Math.max(0, Math.min(120, Math.round(Number(rawPx) || 0))), targets = getMultiTextTargets(); if (targets.length === 0) return; targets.forEach(t => { if (side === 'top') t.style.marginTop = px > 0 ? `${px}px` : ''; else t.style.marginBottom = px > 0 ? `${px}px` : ''; }); positionSelectionOverlay(); if (!isLiveInput) saveHistorySnapshot('문단 여백 조절'); }
function setTextVerticalAlign(pos) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;

  const rawTargets = selectedElements.length > 0 ? selectedElements : (selectedElement ? [selectedElement] : (getTargetTextEl() ? [getTargetTextEl()] : [])); if (rawTargets.length === 0) return;
  rawTargets.forEach(el => { if (el.tagName === 'TD' || el.tagName === 'TH') { el.style.verticalAlign = pos; return; } const box = el.closest('.card-inner-textbox, .ppt-free-obj[data-shape-type="textbox"], .card-embedded-obj, .sub-box') || el; box.style.display = 'flex'; box.style.flexDirection = 'column'; box.style.justifyContent = pos === 'top' ? 'flex-start' : (pos === 'bottom' ? 'flex-end' : 'center'); });
  positionSelectionOverlay(); if (typeof recordRepeatableAction === 'function') recordRepeatableAction(`세로 정렬 (${pos})`, () => setTextVerticalAlign(pos)); saveHistorySnapshot(`세로 정렬 (${pos})`);
}
function toggleWordBreakMode() {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
 const targets = getMultiTextTargets(); if (targets.length === 0) return; const firstCs = window.getComputedStyle(targets[0]), nextBreakAll = (targets[0].style.wordBreak || firstCs.wordBreak) !== 'break-all'; targets.forEach(t => { t.style.wordBreak = nextBreakAll ? 'break-all' : 'keep-all'; }); syncToolbarWithTarget(targets[targets.length - 1]); saveHistorySnapshot('줄바꿈 규칙 변경'); }
function transformSelectedTextCase(mode) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;

  const convertStr = (str) => mode === 'upper' ? str.toUpperCase() : (mode === 'lower' ? str.toLowerCase() : str.replace(/\b([a-zA-Z])([a-zA-Z]*)/g, (_, f, r) => f.toUpperCase() + r.toLowerCase()));
  const usable = getUsableTextRange();
  if (usable && (!selectedElements || selectedElements.length <= 1)) { const frag = usable.range.extractContents(), walker = document.createTreeWalker(frag, NodeFilter.SHOW_TEXT, null); let n; while ((n = walker.nextNode())) n.nodeValue = convertStr(n.nodeValue); usable.range.insertNode(frag); savedTextSelectionRange = null; if (usable.sel) usable.sel.removeAllRanges(); saveHistorySnapshot('대소문자 변환'); return; }
  const targets = getMultiTextTargets(); if (targets.length === 0) return;
  targets.forEach(t => { const walker = document.createTreeWalker(t, NodeFilter.SHOW_TEXT, null); let n; while ((n = walker.nextNode())) n.nodeValue = convertStr(n.nodeValue); }); saveHistorySnapshot('대소문자 변환');
}
function toggleSubSup(cmd) {
  if ((typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(false)) || (selectedElement && selectedElement.getAttribute('data-layer-locked') === 'true')) {
    showToast('잠긴 요소나 슬라이드는 수정할 수 없습니다.');
    return;
  }
  const tag = cmd === 'superscript' ? 'sup' : 'sub', usable = getUsableTextRange();
  if (usable && (!selectedElements || selectedElements.length <= 1)) {
    const anc = usable.range.commonAncestorContainer.nodeType === 3 ? usable.range.commonAncestorContainer.parentElement : usable.range.commonAncestorContainer, existing = anc ? anc.closest(tag) : null;
    if (existing) { const p = existing.parentNode; while (existing.firstChild) p.insertBefore(existing.firstChild, existing); p.removeChild(existing); p.normalize(); }
    else { const el = document.createElement(tag); try { el.appendChild(usable.range.extractContents()); usable.range.insertNode(el); } catch (e) {} }
    savedTextSelectionRange = null; if (usable.sel) usable.sel.removeAllRanges(); saveHistorySnapshot('위/아래첨자'); return;
  }
  const target = getTargetTextEl();
  if (!target) { showToast('먼저 위/아래첨자를 적용할 텍스트를 클릭하거나 드래그해 주세요.'); return; }
  target.style.verticalAlign = target.style.verticalAlign === (cmd === 'superscript' ? 'super' : 'sub') ? '' : (cmd === 'superscript' ? 'super' : 'sub');
  syncToolbarWithTarget(target);
  saveHistorySnapshot('위/아래첨자');
}
function applyTextShadowPreset(preset, isLiveInput) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;

  const targets = getMultiTextTargets(); if (targets.length === 0) return; const colorHex = $studio('textShadowColorPicker')?.value || '#000000'; let shadowCss = '';
  if (preset === 'soft') shadowCss = `0 2px 8px ${hexToRgba(colorHex, 28)}`; else if (preset === 'strong') shadowCss = `0 4px 16px ${hexToRgba(colorHex, 55)}`; else if (preset === 'hard') shadowCss = `2px 2px 0px ${hexToRgba(colorHex, 88)}`; else if (preset === 'glow') shadowCss = `0 0 12px ${hexToRgba(colorHex, 55)}, 0 0 24px ${hexToRgba(colorHex, 28)}`;
  targets.forEach(t => { t.style.textShadow = shadowCss; }); if (!isLiveInput) { if (typeof recordRepeatableAction === 'function') recordRepeatableAction(`글자 그림자 (${preset})`, () => applyTextShadowPreset(preset, false)); saveHistorySnapshot('글자 그림자'); }
}
function applyTextStrokeStyle(isLiveInput) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;

  const widthPx = Math.max(0, Math.min(6, Number($studio('textStrokeWidthInput')?.value || 0))), colorHex = $studio('textStrokeColorPicker')?.value || '#111111', targets = getMultiTextTargets();
  if (targets.length === 0) return;
  targets.forEach(t => { if (widthPx > 0) { t.style.webkitTextStroke = `${widthPx}px ${colorHex}`; t.style.paintOrder = 'stroke fill'; } else { t.style.webkitTextStroke = ''; t.style.paintOrder = ''; } });
  if (!isLiveInput) saveHistorySnapshot('글자 외곽선');
}
function runAutoFitOnElement(containerEl) {
  if (!containerEl) return;
  const maxPx = parseFloat(containerEl.getAttribute('data-autofit-max-px') || '0') || Math.round(parseFloat(window.getComputedStyle(containerEl).fontSize) || 24);
  if (!containerEl.hasAttribute('data-autofit-max-px')) containerEl.setAttribute('data-autofit-max-px', String(maxPx));
  const boundBox = containerEl.closest('.slide-card, .ppt-free-obj, .sub-box') || containerEl;
  let curPx = maxPx; containerEl.style.setProperty('font-size', `${curPx}px`, 'important'); let guard = 0;
  while (guard < 45 && curPx > 10 && (boundBox.scrollHeight > boundBox.clientHeight + 2 || containerEl.scrollHeight > containerEl.clientHeight + 2)) { curPx -= 1; containerEl.style.setProperty('font-size', `${curPx}px`, 'important'); guard++; }
  if ($studio('fontSizeInput')) $studio('fontSizeInput').value = String(curPx);
}
function toggleTextAutoFit() {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;

  const target = getTargetTextEl(); if (!target) return;
  const nextState = target.getAttribute('data-text-autofit') !== 'true';
  if (nextState) { const curPx = Math.round(parseFloat(window.getComputedStyle(target).fontSize) || 18); target.setAttribute('data-text-autofit', 'true'); target.setAttribute('data-autofit-max-px', String(curPx)); runAutoFitOnElement(target); }
  else { target.removeAttribute('data-text-autofit'); target.removeAttribute('data-autofit-max-px'); }
  syncToolbarWithTarget(target); saveHistorySnapshot('텍스트 자동 맞춤');
}
function toggleInlineTextLinkBar() {
  const bar = $studio('inlineTextLinkBar'); if (!bar) return;
  const willOpen = bar.classList.contains('hidden');
  bar.classList.toggle('hidden', !willOpen);
  bar.classList.toggle('flex', willOpen);
  if (willOpen) { const inp = $studio('inlineTextLinkInput'); if (inp) inp.focus(); }
}
function applyInlineTextLink() {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;

  const inp = $studio('inlineTextLinkInput');
  const rawVal = (inp?.value || '').trim();
  if (!rawVal) { showToast('연결할 URL 또는 이동할 슬라이드 번호를 입력해 주세요.'); return; }
  if (/^(?:javascript|vbscript|data):/i.test(rawVal.replace(/\s+/g, ''))) {
    showToast('보안상 안전하지 않은 링크 형식(javascript/data)은 연결할 수 없습니다.');
    return;
  }
  let hrefVal = rawVal;
  if (/^\d+$/.test(rawVal)) hrefVal = `#slide-${Math.max(1, Math.min(totalSlides || 99, parseInt(rawVal, 10)))}`;
  else if (!/^https?:\/\//i.test(rawVal) && !/^#slide-\d+$/i.test(rawVal)) hrefVal = 'https://' + rawVal;
  const usable = getUsableTextRange();
  if (!usable) { showToast('먼저 링크를 걸 텍스트 구간을 드래그해 선택해 주세요.'); return; }
  const a = document.createElement('a'); a.href = hrefVal; a.setAttribute('data-inline-link', 'true'); a.className = 'ppt-inline-link';
  if (/^https?:\/\//i.test(hrefVal)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
  try {
    a.appendChild(usable.range.extractContents());
    usable.range.insertNode(a);
    savedTextSelectionRange = null;
    if (usable.sel) usable.sel.removeAllRanges();
    if (inp) inp.value = '';
    const bar = $studio('inlineTextLinkBar');
    if (bar) { bar.classList.add('hidden'); bar.classList.remove('flex'); }
    saveHistorySnapshot('부분 하이퍼링크 연결');
    showToast(`선택한 텍스트에 하이퍼링크(${hrefVal})가 연결되었습니다.`);
  } catch (e) {}
}
function removeInlineTextLink() {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;

  const sel = window.getSelection();
  let anchor = sel && sel.anchorNode ? (sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode) : null;
  if (!anchor && lastFocusedEditable) anchor = lastFocusedEditable;
  const linkEl = anchor ? anchor.closest('a[data-inline-link], a') : null;
  if (linkEl) { const p = linkEl.parentNode; while (linkEl.firstChild) p.insertBefore(linkEl.firstChild, linkEl); p.removeChild(linkEl); p.normalize(); saveHistorySnapshot('부분 하이퍼링크 해제'); return; }
  const target = getTargetTextEl();
  if (target) { const links = Array.from(target.querySelectorAll('a[data-inline-link]')); if (links.length > 0) { links.forEach(lk => { const p = lk.parentNode; while (lk.firstChild) p.insertBefore(lk.firstChild, lk); p.removeChild(lk); }); target.normalize(); saveHistorySnapshot('부분 하이퍼링크 해제'); } }
}
function insertSymbolAtCursor(sym) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;

  if (!sym) return; const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) { const r = sel.getRangeAt(0), anc = r.commonAncestorContainer.nodeType === 3 ? r.commonAncestorContainer.parentElement : r.commonAncestorContainer; if (anc && anc.closest('#slideStage')) { r.deleteContents(); const tn = document.createTextNode(sym); r.insertNode(tn); const nextR = document.createRange(); nextR.setStartAfter(tn); nextR.collapse(true); sel.removeAllRanges(); sel.addRange(nextR); if (typeof markUnsavedChanges === 'function') markUnsavedChanges(); updateTextCharCounter(); saveHistorySnapshot(`기호 삽입 (${sym})`); return; } }
  const target = getTargetTextEl(); if (target) { target.appendChild(document.createTextNode(sym)); updateTextCharCounter(target); saveHistorySnapshot(`기호 삽입 (${sym})`); }
}

function toggleTextboxAutoWidth() {
  if ((typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) || (selectedElement && selectedElement.getAttribute('data-layer-locked') === 'true')) return;
  const textEl = getTargetTextEl();
  const target = selectedElement && selectedElement.classList.contains('ppt-free-obj')
    ? selectedElement
    : ((textEl && textEl.closest('.ppt-free-obj')) || textEl);
  if (!target) return;
  const isFreeObj = target.classList.contains('ppt-free-obj');
  const nextAuto = target.getAttribute('data-auto-width') !== 'true';
  if (nextAuto) {
    target.setAttribute('data-auto-width', 'true');
    target.style.width = 'fit-content';
    target.style.whiteSpace = 'nowrap';
  } else {
    target.removeAttribute('data-auto-width');
    target.style.width = isFreeObj ? '32%' : '';
    target.style.whiteSpace = '';
  }
  const btn = $studio('textboxAutoWidthBtn');
  if (btn) {
    btn.classList.toggle('is-active', nextAuto);
    btn.textContent = nextAuto ? '↔ 자동폭 ON' : '↔ 고정폭 줄바꿈';
  }
  positionSelectionOverlay();
  saveHistorySnapshot('텍스트 박스 폭 모드 전환');
}

function resetCurrentContextStyle() {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  if (selectedElement && selectedElement.getAttribute('data-layer-locked') === 'true') {
    showToast('잠긴 레이어의 서식은 초기화할 수 없습니다.');
    return;
  }
  const usable = getUsableTextRange();
  if (usable) {
    clearAllTextFormatting();
    return;
  }
  const prevDefer = typeof __deferHistoryDuringLiveDrag !== 'undefined' ? __deferHistoryDuringLiveDrag : false;
  if (typeof __deferHistoryDuringLiveDrag !== 'undefined') __deferHistoryDuringLiveDrag = true;
  try {
    const target = getTargetTextEl();
    if (target && (!selectedElement || selectedElement === target || selectedElement.contains(target))) {
      clearAllTextFormatting();
    }
    if (selectedElement) {
      if (typeof clearAppliedGradient === 'function') clearAppliedGradient();
      if (typeof applyReactiveEffectToSelected === 'function') applyReactiveEffectToSelected('none');
      if (typeof applyGeneralAnimationToSelected === 'function') applyGeneralAnimationToSelected('none');
      selectedElement.style.filter = '';
    }
  } finally {
    if (typeof __deferHistoryDuringLiveDrag !== 'undefined') __deferHistoryDuringLiveDrag = prevDefer;
  }
  saveHistorySnapshot('서식·효과 일괄 초기화');
  showToast('선택 요소의 서식·그라데이션·모션 효과가 모두 초기화되었습니다.');
}
