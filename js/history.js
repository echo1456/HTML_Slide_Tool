function getHistoryEntryHtml(entry) { return !entry ? '' : (typeof entry === 'string' ? entry : (entry.html || '')); }
function cleanupUnusedDataUriTokens() {
  const referenced = new Set();
  const tokenRegex = /__DATA_URI_TOKEN_\d+__/g;
  const collect = (entry) => {
    const str = (entry && entry.kind === 'slide-diff') ? (entry.slideHtml || '') : getHistoryEntryHtml(entry);
    if (!str) return;
    const m = str.match(tokenRegex);
    if (m) m.forEach(t => referenced.add(t));
  };
  undoStack.forEach(collect); redoStack.forEach(collect);
  for (const [token, uri] of tokenToDataUri.entries()) { if (!referenced.has(token)) { tokenToDataUri.delete(token); dataUriToToken.delete(uri); } }
}
function tokenizeDataUris(html) {
  if (!html) return '';
  return html.replace(/data:[a-zA-Z0-9.+/-]+;base64,[A-Za-z0-9+/=]+/g, (uri) => {
    let token = dataUriToToken.get(uri);
    if (!token) { token = `__DATA_URI_TOKEN_${nextDataUriTokenId++}__`; dataUriToToken.set(uri, token); tokenToDataUri.set(token, uri); }
    return token;
  });
}
function detokenizeDataUris(tokenizedHtml) {
  if (!tokenizedHtml) return '';
  return tokenizedHtml.replace(/__DATA_URI_TOKEN_\d+__/g, (token) => tokenToDataUri.get(token) || token);
}
function materializeHistoryFullHtml(stackArr, upToIdx) {
  let baseIdx = upToIdx;
  while (baseIdx >= 0 && stackArr[baseIdx] && stackArr[baseIdx].kind === 'slide-diff') baseIdx--;
  if (baseIdx < 0) return '';
  const baseHtml = getHistoryEntryHtml(stackArr[baseIdx]);
  if (baseIdx === upToIdx) return baseHtml;
  const parser = new DOMParser();
  const inertDoc = parser.parseFromString(`<body>${baseHtml}</body>`, 'text/html');
  const temp = inertDoc.body;
  for (let i = baseIdx + 1; i <= upToIdx; i++) {
    const entry = stackArr[i];
    if (entry && entry.kind === 'slide-diff') {
      const targetSlides = temp.querySelectorAll('.slide');
      const target = targetSlides[entry.slideIdx];
      if (target) {
        const w = inertDoc.createElement('div');
        w.innerHTML = entry.slideHtml;
        if (w.firstElementChild) target.replaceWith(w.firstElementChild);
      }
    }
  }
  return temp.innerHTML;
}

let __isRestoringHistory = false;
let __nextHistoryActionLabel = '';
let __lastCommittedSlideCount = 0;
let __lastCommittedSlideHtmls = [];
let __lastCommittedStoreHtml = '';
function setNextHistoryActionLabel(label) { __nextHistoryActionLabel = (label || '').trim(); }
function saveHistorySnapshot(explicitLabel, forceFull) {
  if (__isRestoringHistory) return;
  if (__deferHistoryDuringLiveDrag) { __deferredHistoryDirty = true; return; }
  const stage = document.getElementById('slideStage');
  if (!stage) return;
  const slideNodes = Array.from(stage.querySelectorAll('.slide'));
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const label = (explicitLabel || __nextHistoryActionLabel || (undoStack.length === 0 ? '초기 상태' : `슬라이드 ${currentSlide} 편집`)).trim();
  __nextHistoryActionLabel = '';

  const normSlideTok = (sNode) => {
    const raw = tokenizeDataUris(sNode.outerHTML);
    return raw.replace(/^(<section\b[^>]*\bclass="[^"]*)\bactive\b\s*/i, '$1').replace(/\s+"/g, '"');
  };

  const fcStoreNode = stage.querySelector('#pptFloatingCardsStore');
  const curStoreHtml = fcStoreNode ? tokenizeDataUris(fcStoreNode.outerHTML) : '';
  const storeChanged = curStoreHtml !== __lastCommittedStoreHtml;

  // Fast incremental diff path when slide count & floating card store are unchanged and only 1 slide changed
  if (!forceFull && !storeChanged && undoStack.length > 0 && slideNodes.length > 0 && slideNodes.length === __lastCommittedSlideCount && __lastCommittedSlideHtmls.length === slideNodes.length) {
    let changedIdx = -1;
    let changedCount = 0;
    const nextSlideHtmls = slideNodes.map((sNode, idx) => {
      const tok = normSlideTok(sNode);
      if (tok !== __lastCommittedSlideHtmls[idx]) { changedIdx = idx; changedCount++; }
      return tok;
    });
    if (changedCount === 0) return;
    if (changedCount === 1) {
      __lastCommittedSlideHtmls = nextSlideHtmls;
      undoStack.push({ kind: 'slide-diff', slideIdx: changedIdx, slideHtml: nextSlideHtmls[changedIdx], slideNum: currentSlide || 1, label, time: timeStr });
      if (undoStack.length > MAX_HISTORY) {
        const fullHead = materializeHistoryFullHtml(undoStack, 1);
        undoStack.shift();
        if (undoStack[0] && undoStack[0].kind === 'slide-diff') {
          undoStack[0] = { kind: 'full', html: fullHead, slideNum: undoStack[0].slideNum, label: undoStack[0].label, time: undoStack[0].time };
        }
      }
      redoStack.length = 0;
      cleanupUnusedDataUriTokens();
      updateHistoryButtons();
      if (isInitialSnapshotDone) markUnsavedChanges();
      return;
    }
  }

  const tokenizedHtml = tokenizeDataUris(stage.innerHTML);
  const lastEntry = undoStack.length > 0 ? undoStack[undoStack.length - 1] : null;
  if (!forceFull && lastEntry && lastEntry.kind !== 'slide-diff' && getHistoryEntryHtml(lastEntry) === tokenizedHtml) return;
  __lastCommittedSlideCount = slideNodes.length;
  __lastCommittedSlideHtmls = slideNodes.map(sNode => normSlideTok(sNode));
  __lastCommittedStoreHtml = curStoreHtml;
  undoStack.push({ kind: 'full', html: tokenizedHtml, slideNum: currentSlide || 1, label, time: timeStr });
  if (undoStack.length > MAX_HISTORY) {
    const fullHead = materializeHistoryFullHtml(undoStack, 1);
    undoStack.shift();
    if (undoStack[0] && undoStack[0].kind === 'slide-diff') {
      undoStack[0] = { kind: 'full', html: fullHead, slideNum: undoStack[0].slideNum, label: undoStack[0].label, time: undoStack[0].time };
    }
  }
  redoStack.length = 0;
  cleanupUnusedDataUriTokens();
  updateHistoryButtons();
  if (isInitialSnapshotDone) markUnsavedChanges();
}
function undoAction() {
  if (undoStack.length <= 1) { showToast('더 이상 실행 취소할 내역이 없습니다.'); return; }
  const current = undoStack.pop();
  redoStack.push(current);
  const targetEntry = undoStack[undoStack.length - 1];
  const fullHtml = materializeHistoryFullHtml(undoStack, undoStack.length - 1);
  restoreStageHtml(fullHtml, true);
  const targetSlide = current && typeof current === 'object' ? current.slideNum : (targetEntry && typeof targetEntry === 'object' ? targetEntry.slideNum : currentSlide);
  if (targetSlide && targetSlide >= 1 && targetSlide <= totalSlides && targetSlide !== currentSlide && typeof goToSlide === 'function') goToSlide(targetSlide);
  showToast(`실행 취소 (Undo) · ${targetEntry && targetEntry.label ? targetEntry.label : ''}`);
}
function redoAction() {
  if (redoStack.length === 0) { showToast('다시 실행할 내역이 없습니다.'); return; }
  const next = redoStack.pop();
  undoStack.push(next);
  const fullHtml = materializeHistoryFullHtml(undoStack, undoStack.length - 1);
  restoreStageHtml(fullHtml, true);
  const targetSlide = next && typeof next === 'object' ? next.slideNum : currentSlide;
  if (targetSlide && targetSlide >= 1 && targetSlide <= totalSlides && targetSlide !== currentSlide && typeof goToSlide === 'function') goToSlide(targetSlide);
  showToast(`다시 실행 (Redo) · ${next && next.label ? next.label : ''}`);
}
function jumpToHistoryIndex(targetIdx) {
  const idx = parseInt(targetIdx, 10);
  if (isNaN(idx) || idx < 0 || idx >= undoStack.length) return;
  if (idx === undoStack.length - 1) { toggleHistoryDropdown(false); return; }
  while (undoStack.length - 1 > idx) redoStack.push(undoStack.pop());
  const targetEntry = undoStack[undoStack.length - 1];
  restoreStageHtml(materializeHistoryFullHtml(undoStack, undoStack.length - 1), true);
  const targetSlide = targetEntry && typeof targetEntry === 'object' ? targetEntry.slideNum : currentSlide;
  if (targetSlide && targetSlide >= 1 && targetSlide <= totalSlides && targetSlide !== currentSlide && typeof goToSlide === 'function') goToSlide(targetSlide);
  toggleHistoryDropdown(false);
  showToast(`히스토리 시점 복원: ${targetEntry && targetEntry.label ? targetEntry.label : ''}`);
}
function toggleHistoryDropdown(forceState) {
  const menu = $studio('historyDropdownMenu');
  if (!menu) return;
  const shouldOpen = forceState !== undefined ? Boolean(forceState) : menu.classList.contains('hidden');
  if (shouldOpen) { renderHistoryDropdownMenu(); menu.classList.remove('hidden'); }
  else menu.classList.add('hidden');
}
function renderHistoryDropdownMenu() {
  const menu = $studio('historyDropdownMenu');
  if (!menu) return;
  const items = [];
  for (let i = undoStack.length - 1; i >= 0; i--) {
    const entry = undoStack[i];
    const lbl = typeof entry === 'object' ? (entry.label || `단계 ${i + 1}`) : `단계 ${i + 1}`;
    const sNum = typeof entry === 'object' && entry.slideNum ? `P.${String(entry.slideNum).padStart(2, '0')}` : '';
    const tm = typeof entry === 'object' && entry.time ? entry.time : '';
    const isCurrent = i === undoStack.length - 1;
    items.push(`<button type="button" data-on-click="jumpToHistoryIndex(${i})" class="w-full px-2.5 py-1.5 text-left flex items-center justify-between gap-2 text-[11px] hover:bg-gopro/10 ${isCurrent ? 'bg-gopro/15 font-extrabold text-gopro' : 'text-ink'} border-b border-borderline/60 cursor-pointer"><span class="truncate">${isCurrent ? '● ' : ''}${escapeAttr(lbl)}</span><span class="font-mono text-[9px] text-muted shrink-0">${escapeAttr(sNum)} ${escapeAttr(tm)}</span></button>`);
  }
  menu.innerHTML = items.length > 0 ? items.join('') : '<div class="px-3 py-2 text-[10px] text-muted">기록이 없습니다.</div>';
}
function restoreStageHtml(entryOrHtml, fromHistory) {
  __isRestoringHistory = true;
  try {
    const stage = document.getElementById('slideStage');
    stage.innerHTML = detokenizeDataUris(getHistoryEntryHtml(entryOrHtml));
    slides = Array.from(document.querySelectorAll('.slide'));
    if (fromHistory) {
      __lastCommittedSlideCount = slides.length;
      const restoredStore = stage.querySelector('#pptFloatingCardsStore');
      __lastCommittedStoreHtml = restoredStore ? tokenizeDataUris(restoredStore.outerHTML) : '';
      __lastCommittedSlideHtmls = slides.map(sNode => tokenizeDataUris(sNode.outerHTML).replace(/^(<section\b[^>]*\bclass="[^"]*)\bactive\b\s*/i, '$1').replace(/\s+"/g, '"'));
    } else {
      // External load/import/recovery: invalidate diff cache so subsequent saveHistorySnapshot() commits a clean FULL base!
      __lastCommittedSlideCount = -1;
      __lastCommittedSlideHtmls = [];
      __lastCommittedStoreHtml = '';
    }
    totalSlides = slides.length;
    if (currentSlide > totalSlides) currentSlide = totalSlides;
    isolatedGroupId = null;
    clearSelectionInspector();
    if (typeof isActiveEditing === 'function' ? isActiveEditing() : isEditMode) {
      if (typeof makeAllTextEditable === 'function') makeAllTextEditable(true);
      else document.querySelectorAll('[data-editable]').forEach(el => el.setAttribute('contenteditable', 'true'));
    }
    initVideoErrorFallbacks(stage);
    if (typeof hydrateYouTubeEmbedsForProtocol === 'function') hydrateYouTubeEmbedsForProtocol(stage);
    updateSlideUI();
    updateHistoryButtons();
    if (typeof populateFloatingCardSelect === 'function') populateFloatingCardSelect();
    if (typeof renderLinkedFloatingCardsList === 'function') renderLinkedFloatingCardsList();
    if (typeof populateTriggerTargetSelect === 'function') populateTriggerTargetSelect();
    if (typeof updateSlideConnectors === 'function') updateSlideConnectors();
  } finally { __isRestoringHistory = false; }
}
function updateHistoryButtons() {
  const u = $studio('undoBtn');
  const r = $studio('redoBtn');
  if (u) u.disabled = undoStack.length <= 1;
  if (r) r.disabled = redoStack.length === 0;
  const menu = $studio('historyDropdownMenu');
  if (menu && !menu.classList.contains('hidden')) renderHistoryDropdownMenu();
}
let __lastRepeatableAction = null;
function recordRepeatableAction(label, fn) { if (typeof fn === 'function') __lastRepeatableAction = { label: label || '작업 반복', fn }; }
function repeatLastAction() {
  if (!__lastRepeatableAction || typeof __lastRepeatableAction.fn !== 'function') { showToast('반복할 직전 서식·정렬 작업이 없습니다.'); return; }
  __lastRepeatableAction.fn();
  showToast(`직전 작업 반복 (F4): ${__lastRepeatableAction.label}`);
}
/* ==================== COALESCE LIVE COLOR/SLIDER DRAGS FOR CLEAN UNDO/REDO ==================== */
let __deferHistoryDuringLiveDrag = false;
let __deferredHistoryDirty = false;
let __activeColorPickerInput = null;
let __activeRangeSliderInput = null;

function flushDeferredHistoryNow() {
  __deferHistoryDuringLiveDrag = false;
  __activeColorPickerInput = null;
  __activeRangeSliderInput = null;
  if (__deferredHistoryDirty) {
    __deferredHistoryDirty = false;
    saveHistorySnapshot();
  }
}

function beginColorPickerSession(inputEl) {
  if (!inputEl || inputEl.tagName !== 'INPUT' || inputEl.type !== 'color') return;
  if (__activeColorPickerInput && __activeColorPickerInput !== inputEl) {
    flushDeferredHistoryNow();
  }
  if (!__activeColorPickerInput) {
    // Guarantee the exact pre-edit baseline is recorded before live color dragging starts
    __deferHistoryDuringLiveDrag = false;
    saveHistorySnapshot();
    __activeColorPickerInput = inputEl;
    __deferHistoryDuringLiveDrag = true;
    __deferredHistoryDirty = false;
  }
}

function bindHistoryCoalesceListeners(rootDoc) {
  const doc = rootDoc || document;
  if (!doc || doc.__historyCoalesceBound) return;
  doc.__historyCoalesceBound = true;

  const isColorInput = (el) => el && el.tagName === 'INPUT' && el.type === 'color';
  const isRangeInput = (el) => el && el.tagName === 'INPUT' && el.type === 'range';

  // Color picker: OS native dialog stays open AFTER pointerup! Keep deferring until `change` or `blur`.
  ['pointerdown', 'mousedown', 'click', 'focus'].forEach(evtName => {
    doc.addEventListener(evtName, (e) => {
      if (isColorInput(e.target)) {
        beginColorPickerSession(e.target);
      }
    }, true);
  });

  // Fallback in case an `input` event fires on a color picker before focus/pointerdown was captured
  doc.addEventListener('input', (e) => {
    if (isColorInput(e.target) && !__activeColorPickerInput) {
      beginColorPickerSession(e.target);
    }
  }, true);

  // Range slider: defer from pointerdown/mousedown until pointerup/change
  ['pointerdown', 'mousedown'].forEach(evtName => {
    doc.addEventListener(evtName, (e) => {
      if (isRangeInput(e.target)) {
        if (__activeColorPickerInput) flushDeferredHistoryNow();
        __deferHistoryDuringLiveDrag = false;
        saveHistorySnapshot();
        __activeRangeSliderInput = e.target;
        __deferHistoryDuringLiveDrag = true;
        __deferredHistoryDirty = false;
      }
    }, true);
  });

  doc.addEventListener('change', (e) => {
    if (isColorInput(e.target) || isRangeInput(e.target)) {
      flushDeferredHistoryNow();
    }
  }, true);

  doc.addEventListener('blur', (e) => {
    if (isColorInput(e.target) && __activeColorPickerInput === e.target) {
      setTimeout(() => {
        if (__activeColorPickerInput === e.target && doc.activeElement !== e.target) {
          flushDeferredHistoryNow();
        }
      }, 160);
    }
  }, true);

  const flushRangeOnRelease = () => {
    // Only flush range sliders on pointerup; NEVER flush an open native OS color picker on button release!
    if (__activeRangeSliderInput && !__activeColorPickerInput) {
      setTimeout(() => {
        if (__activeRangeSliderInput && !__activeColorPickerInput) {
          flushDeferredHistoryNow();
        }
      }, 60);
    }
  };

  doc.addEventListener('pointerup', flushRangeOnRelease, true);
  doc.addEventListener('mouseup', flushRangeOnRelease, true);
  doc.addEventListener('pointercancel', flushRangeOnRelease, true);

  const win = doc.defaultView || window;
  if (win && !win.__colorPickerWinFocusBound) {
    win.__colorPickerWinFocusBound = true;
    win.addEventListener('focus', () => {
      if (__activeColorPickerInput) {
        setTimeout(() => {
          if (__activeColorPickerInput) {
            flushDeferredHistoryNow();
          }
        }, 180);
      }
    });
  }
}
