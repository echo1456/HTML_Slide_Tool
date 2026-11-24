/* ==================== INTERACTIVE BUTTON TRIGGERS & LINK ACTIONS ==================== */
function ensureTriggerNodeId(el) {
  if (!el) return '';
  let id = el.getAttribute('data-trigger-node-id');
  if (!id) {
    id = 'trg_' + Math.random().toString(36).slice(2, 9);
    el.setAttribute('data-trigger-node-id', id);
  }
  return id;
}

function populateTriggerTargetSelect() {
  const sel = $studio('triggerTargetSelect');
  const activeSlideEl = slides[currentSlide - 1];
  if (!sel || !activeSlideEl) return;
  const curVal = sel.value;
  sel.innerHTML = `<option value="">-- 반응할 대상 요소 선택 --</option>`;

  activeSlideEl.querySelectorAll('.slide-card, .sub-box, .ppt-free-obj, .image-slot-box, .ppt-chart-widget, .card-inner-textbox, .card-embedded-obj').forEach((el, idx) => {
    if (el === selectedElement) return;
    const id = ensureTriggerNodeId(el);
    const tag = el.classList.contains('slide-card') ? '카드'
      : el.classList.contains('sub-box') ? '서브박스'
      : el.classList.contains('image-slot-box') ? '미디어'
      : el.classList.contains('ppt-chart-widget') ? '차트·표'
      : el.classList.contains('card-inner-textbox') ? '텍스트박스'
      : el.classList.contains('card-embedded-obj') ? '카드요소'
      : '자유요소';
    const txt = el.textContent.trim().replace(/\s+/g, ' ').slice(0, 18) || `항목 ${idx + 1}`;
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = `[${tag}] ${txt}`;
    sel.appendChild(opt);
  });
  if (curVal) sel.value = curVal;
}

function insertInteractiveTriggerButton() {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const targetCard = typeof shouldInsertIntoSelectedCard === 'function' ? shouldInsertIntoSelectedCard() : null;
  if (targetCard) {
    const btnObj = document.createElement('div');
    btnObj.className = 'card-embedded-obj my-2 shadow-sm';
    btnObj.setAttribute('data-shape-type', 'triggerButton');
    btnObj.setAttribute('data-trigger-reaction', 'reveal');
    btnObj.style.width = 'fit-content';
    btnObj.style.minWidth = '170px';
    btnObj.style.height = '38px';
    btnObj.style.padding = '6px 18px';
    btnObj.style.backgroundColor = '#111111';
    btnObj.style.border = '2px solid #0055FF';
    btnObj.style.borderRadius = '9999px';
    btnObj.style.color = '#FFFFFF';
    btnObj.innerHTML = `<div data-editable contenteditable="true" class="shape-inner-text text-xs font-mono font-bold text-center">CLICK · 연출 실행하기</div>`;
    targetCard.appendChild(btnObj);
    selectElementForInspector(btnObj);
    refreshLayerList();
    if (typeof switchStudioTab === 'function') switchStudioTab('motion');
    if (typeof expandStudioAccordionSection === 'function') expandStudioAccordionSection('motion-trigger', false);
    onLinkActionTypeChange('trigger');
    saveHistorySnapshot();
    showToast('선택한 카드 내부에 반응 실행 버튼이 소속 추가되었습니다!');
    return;
  }

  const activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return;
  ensureFreeLayersOnAllSlides();
  const layer = activeSlideEl.querySelector('.ppt-free-layer');

  const btnObj = document.createElement('div');
  btnObj.className = 'ppt-free-obj shadow-md';
  btnObj.setAttribute('data-shape-type', 'triggerButton');
  btnObj.setAttribute('data-trigger-reaction', 'reveal');
  btnObj.style.left = '38%';
  btnObj.style.top = '16%';
  btnObj.style.width = '24%';
  btnObj.style.height = '7.5%';
  btnObj.style.zIndex = String(layer.children.length + 30);
  btnObj.style.backgroundColor = '#111111';
  btnObj.style.border = '2px solid #0055FF';
  btnObj.style.borderRadius = '9999px';
  btnObj.style.color = '#FFFFFF';
  btnObj.innerHTML = `<div data-editable contenteditable="true" class="shape-inner-text text-xs font-mono font-bold text-center">CLICK · 연출 실행하기</div>`;

  layer.appendChild(btnObj);
  selectElementForInspector(btnObj);
  if (typeof switchStudioTab === 'function') switchStudioTab('motion');
  if (typeof expandStudioAccordionSection === 'function') expandStudioAccordionSection('motion-trigger', false);
  onLinkActionTypeChange('trigger');
  saveHistorySnapshot();
  showToast('반응 실행 버튼이 추가되었습니다! "슬라이드에서 대상 클릭 지정"을 눌러 연결할 카드를 선택하세요.');
}

function startPickTriggerTargetMode() {
  if (!selectedElement) {
    showToast('먼저 반응을 실행할 버튼을 선택해 주세요.');
    return;
  }
  isPickingTriggerTarget = true;
  triggerSourceBtnEl = selectedElement;
  const pickBtn = $studio('pickTriggerTargetBtn');
  if (pickBtn) pickBtn.textContent = '⏳ 슬라이드에서 연결할 요소를 클릭하세요...';
  showToast('슬라이드 위에서 버튼 클릭 시 반응할 카드·이미지·박스를 클릭하세요!');
}

function completePickTriggerTarget(targetEl) {
  isPickingTriggerTarget = false;
  const pickBtn = $studio('pickTriggerTargetBtn');
  if (pickBtn) pickBtn.textContent = '🎯 슬라이드에서 대상 클릭 지정';
  if (!triggerSourceBtnEl || !targetEl || targetEl === triggerSourceBtnEl) return;

  const targetId = ensureTriggerNodeId(targetEl);
  selectElementForInspector(triggerSourceBtnEl);
  populateTriggerTargetSelect();
  const sel = $studio('triggerTargetSelect');
  if (sel) sel.value = targetId;
  applyLinkActionToSelected();
  triggerSourceBtnEl = null;
}

function executeTriggerButtonAction(btnEl) {
  const targetId = btnEl.getAttribute('data-trigger-target');
  const reaction = btnEl.getAttribute('data-trigger-reaction') || 'reveal';
  const activeSlideEl = slides[currentSlide - 1];
  if (!targetId || !activeSlideEl) return;

  const targetEl = activeSlideEl.querySelector(`[data-trigger-node-id="${targetId}"]`);
  if (!targetEl) return;

  targetEl.setAttribute('data-trigger-fx', reaction);
  if (reaction === 'flip-pulse') {
    targetEl.classList.remove('is-triggered');
    void targetEl.offsetWidth;
    targetEl.classList.add('is-triggered');
  } else {
    targetEl.classList.toggle('is-triggered');
  }
}

function insertInteractiveLinkButton() {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const targetCard = typeof shouldInsertIntoSelectedCard === 'function' ? shouldInsertIntoSelectedCard() : null;
  if (targetCard) {
    const btnObj = document.createElement('div');
    btnObj.className = 'card-embedded-obj my-2 shadow-sm';
    btnObj.setAttribute('data-shape-type', 'linkButton');
    btnObj.setAttribute('data-goto-slide', '2');
    btnObj.style.width = 'fit-content';
    btnObj.style.minWidth = '160px';
    btnObj.style.height = '40px';
    btnObj.style.padding = '6px 20px';
    btnObj.style.backgroundColor = '#0055FF';
    btnObj.style.border = '2px solid #003EC2';
    btnObj.style.borderRadius = '9999px';
    btnObj.style.color = '#FFFFFF';
    btnObj.innerHTML = `<div data-editable contenteditable="true" class="shape-inner-text text-sm font-extrabold text-center">바로가기 버튼 →</div>`;
    targetCard.appendChild(btnObj);
    selectElementForInspector(btnObj);
    refreshLayerList();
    if (typeof switchStudioTab === 'function') switchStudioTab('motion');
    if (typeof expandStudioAccordionSection === 'function') expandStudioAccordionSection('motion-trigger', false);
    saveHistorySnapshot();
    showToast('선택한 카드 내부에 링크 버튼이 소속 추가되었습니다!');
    return;
  }

  const activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return;
  ensureFreeLayersOnAllSlides();
  const layer = activeSlideEl.querySelector('.ppt-free-layer');

  const btnObj = document.createElement('div');
  btnObj.className = 'ppt-free-obj shadow-md';
  btnObj.setAttribute('data-shape-type', 'linkButton');
  btnObj.setAttribute('data-goto-slide', '2');
  btnObj.style.left = '38%';
  btnObj.style.top = '45%';
  btnObj.style.width = '22%';
  btnObj.style.height = '8%';
  btnObj.style.zIndex = String(layer.children.length + 25);
  btnObj.style.backgroundColor = '#0055FF';
  btnObj.style.border = '2px solid #003EC2';
  btnObj.style.borderRadius = '9999px';
  btnObj.style.color = '#FFFFFF';
  btnObj.innerHTML = `<div data-editable contenteditable="true" class="shape-inner-text text-sm font-extrabold text-center">바로가기 버튼 →</div>`;

  layer.appendChild(btnObj);
  selectElementForInspector(btnObj);
  if (typeof switchStudioTab === 'function') switchStudioTab('motion');
  if (typeof expandStudioAccordionSection === 'function') expandStudioAccordionSection('motion-trigger', false);
  saveHistorySnapshot();
  showToast('인터랙티브 링크 버튼이 추가되었습니다! 우측에서 이동할 슬라이드나 URL을 설정하세요.');
}

function ensureFloatingCardsStore() {
  const stage = document.getElementById('slideStage');
  if (!stage) return null;
  let store = document.getElementById('pptFloatingCardsStore');
  if (!store) {
    store = document.createElement('div');
    store.id = 'pptFloatingCardsStore';
    store.className = 'hidden';
    store.setAttribute('aria-hidden', 'true');
    stage.insertBefore(store, stage.firstChild);
  }
  return store;
}

function populateFloatingCardSelect() {
  const sel = $studio('floatingCardSelect');
  const store = ensureFloatingCardsStore();
  if (!sel || !store) return;
  const curVal = sel.value;
  sel.innerHTML = `<option value="">-- 연결할 플로팅 카드 선택 --</option>`;
  store.querySelectorAll('[data-fc-id]').forEach((item, idx) => {
    const id = item.getAttribute('data-fc-id');
    const title = item.getAttribute('data-fc-title') || `플로팅 카드 ${idx + 1}`;
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = `🪟 ${title}`;
    sel.appendChild(opt);
  });
  if (curVal) sel.value = curVal;
}

const fcUndoStack = [];
const fcRedoStack = [];
let activeFcInnerBlock = null;

function getFcStudioDoc() {
  return (fcStudioPopupWin && !fcStudioPopupWin.closed) ? fcStudioPopupWin.document : document;
}

function $fc(id) {
  return getFcStudioDoc().getElementById(id);
}

function updateFcHistoryButtons() {
  const u = $fc('fcUndoBtn');
  const r = $fc('fcRedoBtn');
  if (u) u.disabled = fcUndoStack.length <= 1;
  if (r) r.disabled = fcRedoStack.length === 0;
}

function captureFcEditorState() {
  const editor = $fc('fcRichBodyEditor');
  if (!editor) return null;
  const clone = editor.cloneNode(true);
  clone.querySelectorAll('.fc-item-resize-grip, .fc-item-resize-grip-e, .fc-item-resize-grip-s, .fc-item-move-grip').forEach(g => g.remove());
  clone.querySelectorAll('.fc-item-selected').forEach(el => el.classList.remove('fc-item-selected'));
  return JSON.stringify({
    title: $fc('fcTitleInput')?.value || '',
    bg: $fc('fcBgColorInput')?.value || '#FFFFFF',
    opacity: $fc('fcBgOpacityInput')?.value || '100',
    color: $fc('fcTextColorInput')?.value || '#111111',
    borderColor: $fc('fcBorderColorInput')?.value || '#111111',
    radius: $fc('fcRadiusSelect')?.value || '20px',
    borderWidth: $fc('fcBorderWidthSelect')?.value || '2px',
    widthClass: $fc('fcWidthSelect')?.value || 'max-w-2xl',
    usePreset: Boolean($fc('fcUseWidthPresetToggle')?.checked),
    customW: $fc('fcCustomWidthInput')?.value || '0',
    customH: $fc('fcCustomHeightInput')?.value || '0',
    bgBlur: $fc('fcBgBlurSlider')?.value || '0',
    hoverBgBlur: $fc('fcHoverBgBlurSlider')?.value || '0',
    fcFx: $fc('fcReactiveFxSelect')?.value || 'none',
    fcFxBasis: $fc('fcFxBasisSelect')?.value || 'box',
    fcHoverBg: $fc('fcHoverBgColorInput')?.value || '#EFF6FF',
    fcHoverBgAlpha: $fc('fcHoverBgOpacityInput')?.value || '100',
    fcShadow: Boolean($fc('fcShadowToggle')?.checked),
    fcShadowHex: $fc('fcShadowColorInput')?.value || '#0055FF',
    fcShadowAlpha: $fc('fcShadowOpacityInput')?.value || '28',
    fcBorderFx: Boolean($fc('fcBorderFxToggle')?.checked),
    fcBorderFxHex: $fc('fcBorderFxColorInput')?.value || '#0055FF',
    fcBorderFxW: $fc('fcBorderFxWidthInput')?.value || '2',
    posPreset: $fc('fcPositionPresetSelect')?.value || 'center',
    posX: $fc('fcPosXInput')?.value || '50',
    posY: $fc('fcPosYInput')?.value || '50',
    bgImgUrl: editor.getAttribute('data-fc-bg-img-url') || '',
    hoverBgImgUrl: editor.getAttribute('data-fc-hover-bg-img-url') || '',
    html: clone.innerHTML
  });
}

function restoreFcEditorState(jsonStr) {
  if (!jsonStr) return;
  try {
    const st = JSON.parse(jsonStr);
    const editor = $fc('fcRichBodyEditor');
    if (!editor) return;
    if ($fc('fcTitleInput')) $fc('fcTitleInput').value = st.title;
    if ($fc('fcBgColorInput')) $fc('fcBgColorInput').value = st.bg;
    if ($fc('fcBgOpacityInput')) $fc('fcBgOpacityInput').value = st.opacity;
    if ($fc('fcTextColorInput')) $fc('fcTextColorInput').value = st.color;
    if ($fc('fcBorderColorInput')) $fc('fcBorderColorInput').value = st.borderColor;
    if ($fc('fcRadiusSelect')) $fc('fcRadiusSelect').value = st.radius;
    if ($fc('fcBorderWidthSelect')) $fc('fcBorderWidthSelect').value = st.borderWidth;
    if ($fc('fcWidthSelect')) $fc('fcWidthSelect').value = st.widthClass;
    if ($fc('fcUseWidthPresetToggle')) {
      $fc('fcUseWidthPresetToggle').checked = st.usePreset;
      onFcWidthPresetToggle(st.usePreset);
    }
    if ($fc('fcCustomWidthInput')) $fc('fcCustomWidthInput').value = st.customW;
    if ($fc('fcCustomHeightInput')) $fc('fcCustomHeightInput').value = st.customH;
    if ($fc('fcBgBlurSlider')) $fc('fcBgBlurSlider').value = st.bgBlur || '0';
    if ($fc('fcBgBlurLabel')) $fc('fcBgBlurLabel').textContent = `${st.bgBlur || 0}px`;
    if ($fc('fcHoverBgBlurSlider')) $fc('fcHoverBgBlurSlider').value = st.hoverBgBlur || '0';
    if ($fc('fcHoverBgBlurLabel')) $fc('fcHoverBgBlurLabel').textContent = `${st.hoverBgBlur || 0}px`;
    if ($fc('fcReactiveFxSelect')) $fc('fcReactiveFxSelect').value = st.fcFx || 'none';
    if ($fc('fcFxBasisSelect')) $fc('fcFxBasisSelect').value = st.fcFxBasis || 'box';
    if ($fc('fcHoverBgColorInput')) $fc('fcHoverBgColorInput').value = st.fcHoverBg || '#EFF6FF';
    if ($fc('fcHoverBgOpacityInput')) $fc('fcHoverBgOpacityInput').value = st.fcHoverBgAlpha || '100';
    if ($fc('fcShadowToggle')) $fc('fcShadowToggle').checked = st.fcShadow !== false;
    if ($fc('fcShadowColorInput')) $fc('fcShadowColorInput').value = st.fcShadowHex || '#0055FF';
    if ($fc('fcShadowOpacityInput')) $fc('fcShadowOpacityInput').value = st.fcShadowAlpha || '28';
    if ($fc('fcBorderFxToggle')) $fc('fcBorderFxToggle').checked = Boolean(st.fcBorderFx);
    if ($fc('fcBorderFxColorInput')) $fc('fcBorderFxColorInput').value = st.fcBorderFxHex || '#0055FF';
    if ($fc('fcBorderFxWidthInput')) $fc('fcBorderFxWidthInput').value = st.fcBorderFxW || '2';
    if ($fc('fcPositionPresetSelect')) {
      const preset = st.posPreset || 'center';
      $fc('fcPositionPresetSelect').value = preset;
      onFcPositionPresetChange(preset);
    }
    if ($fc('fcPosXInput')) $fc('fcPosXInput').value = (st.posX !== undefined && st.posX !== null && String(st.posX).trim() !== '') ? String(st.posX) : '50';
    if ($fc('fcPosYInput')) $fc('fcPosYInput').value = (st.posY !== undefined && st.posY !== null && String(st.posY).trim() !== '') ? String(st.posY) : '50';

    if (st.bgImgUrl) editor.setAttribute('data-fc-bg-img-url', st.bgImgUrl);
    else editor.removeAttribute('data-fc-bg-img-url');

    if (st.hoverBgImgUrl) editor.setAttribute('data-fc-hover-bg-img-url', st.hoverBgImgUrl);
    else editor.removeAttribute('data-fc-hover-bg-img-url');

    activeFcInnerBlock = null;
    
    editor.innerHTML = st.html;
    enhanceAllFcResizableItems(editor);
    const restoredChart = editor.querySelector('.ppt-chart-widget');
    if (restoredChart) {
      if (!restoredChart.dataset.chartUid) restoredChart.dataset.chartUid = 'fc_chart_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      editor.dataset.activeChartId = restoredChart.dataset.chartUid;
      syncChartInspectorUI(restoredChart);
    } else {
      delete editor.dataset.activeChartId;
      syncChartInspectorUI(null);
    }
    updateFloatingCardPreviewStyle();
  } catch (e) {}
}

let __fcDeferLiveColor = false;
let __fcColorTimer = null;

function recordFcSnapshot(fromLiveInput) {
  if (fromLiveInput) {
    clearTimeout(__fcColorTimer);
    __fcColorTimer = setTimeout(() => recordFcSnapshot(false), 350);
    return;
  }
  clearTimeout(__fcColorTimer);
  const snap = captureFcEditorState();
  if (!snap) return;
  if (fcUndoStack.length > 0 && fcUndoStack[fcUndoStack.length - 1] === snap) return;
  fcUndoStack.push(snap);
  if (fcUndoStack.length > 30) fcUndoStack.shift();
  fcRedoStack.length = 0;
  updateFcHistoryButtons();
}

function fcUndoAction() {
  if (fcUndoStack.length <= 1) {
    showToast('플로팅 카드 편집기에서 더 이상 실행 취소할 내역이 없습니다.');
    return;
  }
  const cur = fcUndoStack.pop();
  fcRedoStack.push(cur);
  restoreFcEditorState(fcUndoStack[fcUndoStack.length - 1]);
  updateFcHistoryButtons();
  showToast('플로팅 카드 실행 취소 (Undo)');
}

function fcRedoAction() {
  if (fcRedoStack.length === 0) {
    showToast('다시 실행할 내역이 없습니다.');
    return;
  }
  const next = fcRedoStack.pop();
  fcUndoStack.push(next);
  restoreFcEditorState(next);
  updateFcHistoryButtons();
  showToast('플로팅 카드 다시 실행 (Redo)');
}

function selectFcInnerBlock(blockEl) {
  const editor = $fc('fcRichBodyEditor');
  if (!editor || !blockEl) return;
  editor.querySelectorAll('.fc-item-selected').forEach(el => el.classList.remove('fc-item-selected'));
  blockEl.classList.add('fc-item-selected');
  activeFcInnerBlock = blockEl;

  const chartWidget = blockEl.classList.contains('ppt-chart-widget') ? blockEl : blockEl.querySelector('.ppt-chart-widget');
  if (chartWidget) {
    if (!chartWidget.dataset.chartUid) chartWidget.dataset.chartUid = 'fc_chart_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    editor.dataset.activeChartId = chartWidget.dataset.chartUid;
    if (typeof syncChartInspectorUI === 'function') syncChartInspectorUI(chartWidget);
  }
}

function applyFcInnerBlockOffsetClamped(blockEl, nextX, nextY) {
  const editor = $fc('fcRichBodyEditor');
  if (!blockEl || !editor) return;
  const curX = parseFloat(blockEl.getAttribute('data-fc-offset-x') || '0') || 0;
  const curY = parseFloat(blockEl.getAttribute('data-fc-offset-y') || '0') || 0;
  const eRect = editor.getBoundingClientRect();
  const bRect = blockEl.getBoundingClientRect();
  const baseLeft = bRect.left - curX;
  const baseTop = bRect.top - curY;
  const pad = 12;

  const minX = Math.round((eRect.left + pad) - baseLeft);
  const maxX = Math.max(minX, Math.round((eRect.right - pad - bRect.width) - baseLeft));
  const minY = Math.round((eRect.top + pad) - baseTop);
  const maxY = Math.max(minY, Math.round((eRect.bottom - pad - bRect.height) - baseTop));

  const clampedX = Math.max(minX, Math.min(maxX, Math.round(nextX)));
  const clampedY = Math.max(minY, Math.min(maxY, Math.round(nextY)));

  blockEl.setAttribute('data-fc-offset-x', String(clampedX));
  blockEl.setAttribute('data-fc-offset-y', String(clampedY));
  blockEl.style.position = 'relative';
  blockEl.style.transform = (clampedX === 0 && clampedY === 0) ? '' : `translate(${clampedX}px, ${clampedY}px)`;
}

function makeFcBlockResizable(blockEl) {
  if (!blockEl) return;
  const ownerDoc = blockEl.ownerDocument || (typeof getFcStudioDoc === 'function' ? getFcStudioDoc() : document);
  blockEl.classList.add('fc-resizable-item');
  if (!blockEl.dataset.fcClickBound) {
    blockEl.dataset.fcClickBound = '1';
    blockEl.addEventListener('click', (e) => {
      e.stopPropagation();
      selectFcInnerBlock(blockEl);
    });
  }

  if (blockEl.classList.contains('fc-sub-box') || blockEl.classList.contains('fc-text-box')) {
    blockEl.setAttribute('contenteditable', 'false');
    blockEl.querySelectorAll('div, p, span, h1, h2, h3, h4, li, blockquote').forEach(ch => {
      if (ch.closest('.ppt-chart-widget, button')) return;
      if (!ch.classList.contains('fc-item-move-grip') && !ch.classList.contains('fc-item-resize-grip') && !ch.classList.contains('fc-item-resize-grip-e') && !ch.classList.contains('fc-item-resize-grip-s')) {
        ch.setAttribute('data-editable', '');
        ch.setAttribute('contenteditable', 'true');
      }
    });
  }

  if (!blockEl.querySelector('.fc-item-move-grip')) {
    const moveGrip = ownerDoc.createElement('span');
    moveGrip.className = 'fc-item-move-grip';
    moveGrip.setAttribute('contenteditable', 'false');
    moveGrip.textContent = '✥ 이동';
    moveGrip.title = '드래그하여 카드 내부에서 위치 이동 (카드 밖 이탈 방지)';
    moveGrip.onmousedown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectFcInnerBlock(blockEl);
      const doc = getFcStudioDoc();
      const startX = e.clientX;
      const startY = e.clientY;
      const initX = parseFloat(blockEl.getAttribute('data-fc-offset-x') || '0') || 0;
      const initY = parseFloat(blockEl.getAttribute('data-fc-offset-y') || '0') || 0;

      const onMove = (me) => {
        let dx = me.clientX - startX;
        let dy = me.clientY - startY;
        if (me.shiftKey && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
          if (Math.abs(dx) >= Math.abs(dy)) dy = 0;
          else dx = 0;
        }
        applyFcInnerBlockOffsetClamped(blockEl, initX + dx, initY + dy);
      };
      const onUp = () => {
        doc.removeEventListener('mousemove', onMove);
        doc.removeEventListener('mouseup', onUp);
        recordFcSnapshot();
      };
      doc.addEventListener('mousemove', onMove);
      doc.addEventListener('mouseup', onUp);
    };
    blockEl.appendChild(moveGrip);
  }

  const attachResizeDrag = (handleEl, axis) => {
    handleEl.onmousedown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectFcInnerBlock(blockEl);
      const doc = getFcStudioDoc();
      const editor = $fc('fcRichBodyEditor');
      const startX = e.clientX;
      const startY = e.clientY;
      const initRect = blockEl.getBoundingClientRect();
      const maxW = editor ? Math.max(160, editor.clientWidth - 48) : 600;

      const onMove = (me) => {
        if (axis === 'se' || axis === 'e') {
          const nextW = Math.max(80, Math.min(maxW, Math.round(initRect.width + (me.clientX - startX))));
          const wPct = Math.max(15, Math.min(100, Math.round((nextW / maxW) * 100)));
          blockEl.style.width = `${wPct}%`;
            }
        if (axis === 'se' || axis === 's') {
          const nextH = Math.max(36, Math.min(650, Math.round(initRect.height + (me.clientY - startY))));
          blockEl.style.height = `${nextH}px`;
          blockEl.style.maxHeight = 'none';
          const innerImg = blockEl.querySelector('img');
          if (innerImg) {
            innerImg.style.height = '100%';
            innerImg.style.maxHeight = 'none';
          }
            }
      };
      const onUp = () => {
        doc.removeEventListener('mousemove', onMove);
        doc.removeEventListener('mouseup', onUp);
        recordFcSnapshot();
      };
      doc.addEventListener('mousemove', onMove);
      doc.addEventListener('mouseup', onUp);
    };
  };

  if (!blockEl.querySelector('.fc-item-resize-grip')) {
    const grip = ownerDoc.createElement('span');
    grip.className = 'fc-item-resize-grip';
    grip.setAttribute('contenteditable', 'false');
    grip.title = '드래그하여 가로·세로 크기 동시 조절';
    attachResizeDrag(grip, 'se');
    blockEl.appendChild(grip);
  }
  if (!blockEl.querySelector('.fc-item-resize-grip-e')) {
    const gripE = ownerDoc.createElement('span');
    gripE.className = 'fc-item-resize-grip-e';
    gripE.setAttribute('contenteditable', 'false');
    gripE.title = '드래그하여 가로 폭 조절';
    attachResizeDrag(gripE, 'e');
    blockEl.appendChild(gripE);
  }
  if (!blockEl.querySelector('.fc-item-resize-grip-s')) {
    const gripS = ownerDoc.createElement('span');
    gripS.className = 'fc-item-resize-grip-s';
    gripS.setAttribute('contenteditable', 'false');
    gripS.title = '드래그하여 세로 높이 조절';
    attachResizeDrag(gripS, 's');
    blockEl.appendChild(gripS);
  }
}

function enhanceAllFcResizableItems(editor) {
  if (!editor) return;
  Array.from(editor.querySelectorAll('img')).forEach(img => {
    if (!img.closest('.fc-resizable-item')) {
      const wrap = document.createElement('div');
      wrap.className = 'fc-resizable-item fc-img-wrap my-3 overflow-hidden rounded-xl border border-borderline';
      wrap.setAttribute('contenteditable', 'false');
      wrap.style.width = '100%';
      img.className = 'w-full h-full object-contain block';
      img.parentNode.insertBefore(wrap, img);
      wrap.appendChild(img);
    }
  });
  Array.from(editor.querySelectorAll('table')).forEach(tbl => {
    if (!tbl.closest('.fc-resizable-item')) {
      const wrap = document.createElement('div');
      wrap.className = 'fc-resizable-item my-3 overflow-auto rounded-xl border border-borderline p-2 bg-white';
      wrap.setAttribute('contenteditable', 'false');
      wrap.style.width = '100%';
      tbl.parentNode.insertBefore(wrap, tbl);
      wrap.appendChild(tbl);
    }
  });
  editor.querySelectorAll('.ppt-chart-widget, .fc-sub-box, .fc-text-box, .fc-img-wrap, .fc-resizable-item').forEach(el => {
    makeFcBlockResizable(el);
  });
}

function toggleFcDialogMaximize() {
  const panel = $fc('fcEditorDialogPanel');
  if (!panel) return;
  panel.classList.toggle('fc-maximized');
}

function openExternalFloatingCardWindow() {
  const dialogPanel = document.getElementById('fcEditorDialogPanel');
  const modal = document.getElementById('floatingCardEditorModal');
  if (!dialogPanel) return;

  if (fcStudioPopupWin && !fcStudioPopupWin.closed) {
    fcStudioPopupWin.focus();
    return;
  }

  const win = window.open('', 'PPTStudioFloatingCardWin', 'width=760,height=860,left=120,top=40,resizable=yes,scrollbars=yes');
  if (!win) {
    showToast('브라우저 팝업 차단이 감지되었습니다. 주소창 우측 팝업 허용 후 다시 시도해 주세요.');
    return;
  }

  fcStudioPopupWin = win;
  win.document.open();
  win.document.write(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>✦ FLOATING POPUP CARD STUDIO — 독립 창</title>
  <style>
    :root { --accent-color: #0055FF; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #F5F5F7; color: #111111; font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Malgun Gothic', sans-serif; overflow: hidden; }
    #fcEditorDialogPanel {
      position: relative !important;
      left: 0 !important;
      top: 0 !important;
      margin: 0 !important;
      width: 100% !important;
      height: 100vh !important;
      max-width: 100% !important;
      max-height: 100vh !important;
      border: none !important;
      border-radius: 0 !important;
    }
    .ppt-chart-widget { width: 100%; background: #FFFFFF; border: 1px solid #E2E4E9; border-radius: 14px; padding: 14px 16px; }
    .ppt-data-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .ppt-data-table th { color: #FFFFFF; font-weight: 700; padding: 8px 10px; text-align: left; border: 1px solid rgba(0,0,0,0.08); }
    .ppt-data-table td { padding: 7px 10px; border: 1px solid #E2E4E9; }
    .fc-tab-btn.active { background-color: var(--accent-color) !important; color: #FFFFFF !important; border-color: var(--accent-color) !important; }
    .chart-cell-selected { outline: 2px solid #F43F5E !important; outline-offset: -2px; }
    .fc-resizable-item { position: relative; }
    .fc-resizable-item:hover, .fc-resizable-item.fc-item-selected { outline: 1.5px dashed #0055FF; outline-offset: 2px; }
    .fc-item-resize-grip { position: absolute; right: 3px; bottom: 3px; width: 16px; height: 16px; border-radius: 3px; background: #0055FF; border: 2px solid #FFFFFF; cursor: nwse-resize; z-index: 30; }
    .fc-item-resize-grip-e { position: absolute; right: -3px; top: 50%; transform: translateY(-50%); width: 8px; height: 28px; border-radius: 9999px; background: #0055FF; border: 1.5px solid #FFFFFF; cursor: ew-resize; z-index: 30; }
    .fc-item-resize-grip-s { position: absolute; bottom: -3px; left: 50%; transform: translateX(-50%); width: 28px; height: 8px; border-radius: 9999px; background: #0055FF; border: 1.5px solid #FFFFFF; cursor: ns-resize; z-index: 30; }
    .fc-item-move-grip { position: absolute; left: 4px; top: 4px; padding: 1px 6px; border-radius: 5px; background: rgba(17,17,17,0.85); color: #FFE600; font-size: 10px; font-weight: 700; cursor: move; z-index: 31; }
    #fcPreviewResizeBox { position: relative; margin: 0 auto; max-width: 100%; overflow: hidden; }
    #fcEditorBgPreviewLayer, #fcEditorHoverBgPreviewLayer, #fcEditorBgTintLayer { position: absolute; inset: 0; pointer-events: none; background-size: cover; background-position: center; background-repeat: no-repeat; }
    #fcEditorHoverBgPreviewLayer { opacity: 0; }
    #fcPreviewResizeBox:hover #fcEditorHoverBgPreviewLayer.has-hover-img { opacity: 1; }
    #fcEditorBgTintLayer { z-index: 1; }
    #fcRichBodyEditor { position: relative; z-index: 2; }
    .fc-resizer-e { position: absolute; top: 50%; right: -7px; transform: translateY(-50%); width: 10px; height: 36px; border-radius: 9999px; background: #0055FF; cursor: ew-resize; z-index: 20; }
    .fc-resizer-s { position: absolute; bottom: -7px; left: 50%; transform: translateX(-50%); width: 36px; height: 10px; border-radius: 9999px; background: #0055FF; cursor: ns-resize; z-index: 20; }
    .fc-resizer-se { position: absolute; bottom: -6px; right: -6px; width: 14px; height: 14px; border-radius: 4px; background: #111111; border: 2px solid #FFFFFF; cursor: nwse-resize; z-index: 21; }
  </style>
</head>
<body></body>
</html>`);
  win.document.close();

  const targetBody = win.document.body || win.document.documentElement;
  const adopted = win.document.adoptNode(dialogPanel);
  adopted.style.position = 'relative';
  adopted.style.left = '';
  adopted.style.top = '';
  adopted.style.margin = '';
  adopted.classList.remove('fc-maximized');
  const mainOv = document.getElementById('pptSelectionOverlay');
  if (mainOv && selectedElement && adopted.contains(selectedElement)) mainOv.classList.remove('visible');


  const popBtn = adopted.querySelector('#popoutFcStudioBtn');
  if (popBtn) {
    popBtn.textContent = '↙ 메인 창으로 복귀';
    popBtn.setAttribute('data-on-click', 'dockFcStudioBackToMain()');
  }

  targetBody.appendChild(adopted);
  if (typeof initDeclarativeEventSystem === 'function') initDeclarativeEventSystem(win.document, window);

  // Copy compiled styles from main document so popup renders identically offline & headless
  if (typeof cloneDocumentStylesToPopup === 'function') cloneDocumentStylesToPopup(win);
  ['--accent-color', '--header-bg', '--header-fg', '--footer-bg', '--footer-fg'].forEach(v => {
    const val = document.documentElement.style.getPropertyValue(v);
    if (val) win.document.documentElement.style.setProperty(v, val);
  });

  [
    'selectChartCellForFill', 'selectChartPartForColor',
    'startTableColResize', 'startTableRowResize',
    'onChartTitleInlineEdit', 'onChartLabelInlineEdit', 'onChartValueInlineEdit',
    'onTableHeaderInlineEdit', 'onTableCellInlineEdit',
    'updateChartItemField', 'removeChartDataRow',
    '$fc', '$studio', 'recordFcSnapshot'
  ].forEach(fnName => {
    if (typeof window[fnName] === 'function') {
      win[fnName] = window[fnName];
    }
  });
  if (typeof bindHistoryCoalesceListeners === 'function') bindHistoryCoalesceListeners(win.document);
  const editor = $fc('fcRichBodyEditor');
  if (editor) enhanceAllFcResizableItems(editor);
  if (modal) {
    if (typeof closeModalSafe === 'function') closeModalSafe(modal);
    else { modal.classList.add('hidden'); modal.classList.remove('flex'); modal.style.display = 'none'; }
  }
  win.addEventListener('beforeunload', () => {
    dockFcStudioBackToMain(true);
  });
  showToast('플로팅 카드 스튜디오가 독립 브라우저 창으로 분리되었습니다!');
}

function dockFcStudioBackToMain(fromUnload) {
  if (!fcStudioPopupWin) return;
  const win = fcStudioPopupWin;
  fcStudioPopupWin = null;
  try {
    const dialogPanel = win.document.getElementById('fcEditorDialogPanel');
    const modal = document.getElementById('floatingCardEditorModal');
    if (dialogPanel && modal) {
      const adoptedBack = document.adoptNode(dialogPanel);
      adoptedBack.style.position = '';
      adoptedBack.style.left = '';
      adoptedBack.style.top = '';
      adoptedBack.style.margin = '';
      adoptedBack.style.width = '680px';
      adoptedBack.style.height = '78vh';
      adoptedBack.classList.remove('fc-maximized');

      const popBtn = adoptedBack.querySelector('#popoutFcStudioBtn');
      if (popBtn) {
        popBtn.textContent = '🖥 새 창 분리';
        popBtn.setAttribute('data-on-click', 'openExternalFloatingCardWindow()');
      }
      modal.appendChild(adoptedBack);
      if (!fromUnload) {
        if (typeof openModalSafe === 'function') openModalSafe(modal);
        else { modal.classList.remove('hidden'); modal.classList.add('flex'); modal.style.display = 'flex'; }
        if (typeof setActiveEditingContext === 'function') setActiveEditingContext('floating-card');
      } else {
        const fcEdBack = document.getElementById('fcRichBodyEditor');
        if (fcEdBack && selectedElement && fcEdBack.contains(selectedElement) && typeof clearSelectionInspector === 'function') {
          clearSelectionInspector();
        }
        fcOriginTriggerElement = null;
  if (typeof setActiveEditingContext === 'function') setActiveEditingContext('slide');
      }
    }
    if (!fromUnload && !win.closed) win.close();
  } catch (e) {}
}

function onFcBgBlurChange(val) {
  const px = Number(val) || 0;
  if ($fc('fcBgBlurLabel')) $fc('fcBgBlurLabel').textContent = `${px}px`;
  updateFloatingCardPreviewStyle();
}

function onFcHoverBgBlurChange(val) {
  const px = Number(val) || 0;
  if ($fc('fcHoverBgBlurLabel')) $fc('fcHoverBgBlurLabel').textContent = `${px}px`;
  updateFloatingCardPreviewStyle();
}

function updateFloatingCardPreviewStyle() {
  const box = $fc('fcPreviewResizeBox');
  const editor = $fc('fcRichBodyEditor');
  if (!editor) return;
  const bgHex = $fc('fcBgColorInput')?.value || '#FFFFFF';
  const alphaPct = Number($fc('fcBgOpacityInput')?.value ?? 100);
  const textCol = $fc('fcTextColorInput')?.value || '#111111';
  const borderCol = $fc('fcBorderColorInput')?.value || '#111111';
  const radius = $fc('fcRadiusSelect')?.value || '20px';
  const borderW = $fc('fcBorderWidthSelect')?.value || '2px';
  const bgImgUrl = editor.getAttribute('data-fc-bg-img-url') || '';
  const hoverBgImgUrl = editor.getAttribute('data-fc-hover-bg-img-url') || '';
  const bgBlurPx = Number($fc('fcBgBlurSlider')?.value || 0);
  const hoverBgBlurPx = Number($fc('fcHoverBgBlurSlider')?.value || 0);
  const rgbaOverlay = hexToRgba(bgHex, alphaPct);

  const bgLayer = $fc('fcEditorBgPreviewLayer');
  const hoverLayer = $fc('fcEditorHoverBgPreviewLayer');
  const tintLayer = $fc('fcEditorBgTintLayer');

  if (bgLayer && hoverLayer && tintLayer) {
    const bgCssVal = bgImgUrl
      ? (/^(?:linear|radial)-gradient\(/i.test(bgImgUrl) ? bgImgUrl : `url("${bgImgUrl}")`)
      : '';
    const bgMaskVal = editor.getAttribute('data-fc-bg-mask') || '';
    bgLayer.style.backgroundImage = bgCssVal;
    bgLayer.style.webkitMaskImage = bgMaskVal;
    bgLayer.style.maskImage = bgMaskVal;
    if (bgMaskVal) {
      bgLayer.style.webkitMaskRepeat = 'no-repeat'; bgLayer.style.maskRepeat = 'no-repeat';
      bgLayer.style.webkitMaskSize = '100% 100%'; bgLayer.style.maskSize = '100% 100%';
    }
    bgLayer.style.filter = bgBlurPx > 0 ? `blur(${bgBlurPx}px)` : '';
    bgLayer.style.transform = bgBlurPx > 0 ? 'scale(1.06)' : '';

    const curFcFx = $fc('fcReactiveFxSelect')?.value || 'none';
    const hoverCssVal = hoverBgImgUrl
      ? (/^(?:linear|radial)-gradient\(/i.test(hoverBgImgUrl) ? hoverBgImgUrl : `url("${hoverBgImgUrl}")`)
      : '';
    const hoverMaskVal = editor.getAttribute('data-fc-hover-bg-mask') || '';
    const showHoverPreview = Boolean(hoverCssVal) && curFcFx !== 'none';
    hoverLayer.style.backgroundImage = showHoverPreview ? hoverCssVal : '';
    hoverLayer.style.webkitMaskImage = showHoverPreview ? hoverMaskVal : '';
    hoverLayer.style.maskImage = showHoverPreview ? hoverMaskVal : '';
    hoverLayer.style.filter = hoverBgBlurPx > 0 ? `blur(${hoverBgBlurPx}px)` : '';
    hoverLayer.style.transform = hoverBgBlurPx > 0 ? 'scale(1.06)' : '';
    hoverLayer.classList.toggle('has-hover-img', showHoverPreview);

    // When background is a pure gradient with 100% solid tint, keep tint subtle unless explicitly customized; otherwise apply tint overlay
    tintLayer.style.backgroundColor = (/^(?:linear|radial)-gradient\(/i.test(bgCssVal) && alphaPct >= 100) ? 'transparent' : rgbaOverlay;
  }

  const curFcFx = $fc('fcReactiveFxSelect')?.value || 'none';
  const hasReactiveFx = Boolean(curFcFx && curFcFx !== 'none');
  const fcHoverBg = $fc('fcHoverBgColorInput')?.value || '#EFF6FF';
  const fcHoverBgAlpha = $fc('fcHoverBgOpacityInput')?.value || '100';
  const fcShadowOn = Boolean($fc('fcShadowToggle')?.checked);
  const fcShadowHex = $fc('fcShadowColorInput')?.value || '#0055FF';
  const fcShadowAlpha = $fc('fcShadowOpacityInput')?.value || '28';
  const fcBorderFxOn = Boolean($fc('fcBorderFxToggle')?.checked);
  const fcBorderFxHex = $fc('fcBorderFxColorInput')?.value || '#0055FF';
  const fcBorderFxW = $fc('fcBorderFxWidthInput')?.value || '2';

  const frameEl = box || editor;
  frameEl.style.borderStyle = borderW === '0px' ? 'none' : 'solid';
  frameEl.style.borderWidth = borderW;
  frameEl.style.borderColor = borderCol;
  frameEl.style.borderRadius = radius;
  frameEl.style.setProperty('--fc-base-tint', rgbaOverlay);
  if (hasReactiveFx) {
    frameEl.setAttribute('data-fx', curFcFx);
    frameEl.setAttribute('data-fc-has-hover', 'true');
    frameEl.style.setProperty('--card-hover-bg', hexToRgba(fcHoverBg, fcHoverBgAlpha));
    frameEl.setAttribute('data-fx-shadow', fcShadowOn ? 'on' : 'off');
    frameEl.style.setProperty('--fx-shadow-color', hexToRgba(fcShadowHex, fcShadowAlpha));
    frameEl.setAttribute('data-fx-border', fcBorderFxOn ? 'on' : 'off');
    if (fcBorderFxOn) {
      frameEl.style.setProperty('--fx-border-color', fcBorderFxHex);
      frameEl.style.setProperty('--fx-border-width', `${fcBorderFxW}px`);
    } else {
      frameEl.style.removeProperty('--fx-border-color');
      frameEl.style.removeProperty('--fx-border-width');
    }
  } else {
    frameEl.removeAttribute('data-fx');
    frameEl.removeAttribute('data-fc-has-hover');
    frameEl.removeAttribute('data-fx-shadow');
    frameEl.removeAttribute('data-fx-border');
    frameEl.style.removeProperty('--card-hover-bg');
    frameEl.style.removeProperty('--fx-shadow-color');
    frameEl.style.removeProperty('--fx-border-color');
    frameEl.style.removeProperty('--fx-border-width');
  }
  editor.style.color = textCol;
  applyFcPreviewSizeFromInputs();
}


function onFcPositionPresetChange(val) {
  const wrap = $fc('fcCustomCoordsWrap');
  if (!wrap) return;
  if (val === 'custom') {
    wrap.classList.remove('hidden');
    wrap.classList.add('grid');
  } else {
    wrap.classList.add('hidden');
    wrap.classList.remove('grid');
  }
}

function onFcWidthPresetToggle(usePreset) {
  const widthSel = $fc('fcWidthSelect');
  if (widthSel) {
    widthSel.disabled = !usePreset;
    widthSel.style.opacity = usePreset ? '1' : '0.45';
  }
  if (usePreset) {
    const wInp = $fc('fcCustomWidthInput');
    if (wInp) wInp.value = '0';
  }
  updateFloatingCardPreviewStyle();
}

function onFcCustomSizeInput() {
  const wVal = Number($fc('fcCustomWidthInput')?.value || 0);
  const presetToggle = $fc('fcUseWidthPresetToggle');
  if (wVal > 0 && presetToggle && presetToggle.checked) {
    presetToggle.checked = false;
    onFcWidthPresetToggle(false);
  }
  updateFloatingCardPreviewStyle();
}

function startFcPreviewResize(e, dir) {
  e.preventDefault();
  e.stopPropagation();
  const doc = getFcStudioDoc();
  const box = $fc('fcPreviewResizeBox');
  const editor = $fc('fcRichBodyEditor');
  if (!box || !editor) return;

  const startX = e.clientX;
  const startY = e.clientY;
  const initW = editor.offsetWidth || 540;
  const initH = editor.offsetHeight || 220;

  const presetToggle = $fc('fcUseWidthPresetToggle');
  if (presetToggle && presetToggle.checked) {
    presetToggle.checked = false;
    onFcWidthPresetToggle(false);
  }

  const onMove = (me) => {
    const dx = me.clientX - startX;
    const dy = me.clientY - startY;
    if (dir.includes('e')) {
      const nextW = Math.max(240, Math.min(1200, Math.round(initW + dx)));
      box.style.width = nextW + 'px';
      if ($fc('fcCustomWidthInput')) $fc('fcCustomWidthInput').value = String(nextW);
    }
    if (dir.includes('s')) {
      const nextH = Math.max(120, Math.min(720, Math.round(initH + dy)));
      editor.style.height = nextH + 'px';
      editor.style.maxHeight = 'none';
      if ($fc('fcCustomHeightInput')) $fc('fcCustomHeightInput').value = String(nextH);
    }
  };
  const onUp = () => {
    doc.removeEventListener('mousemove', onMove);
    doc.removeEventListener('mouseup', onUp);
    recordFcSnapshot();
  };
  doc.addEventListener('mousemove', onMove);
  doc.addEventListener('mouseup', onUp);
}

function applyFcPreviewSizeFromInputs() {
  const box = $fc('fcPreviewResizeBox');
  const editor = $fc('fcRichBodyEditor');
  if (!box || !editor) return;
  const usePreset = Boolean($fc('fcUseWidthPresetToggle')?.checked);
  const customW = Number($fc('fcCustomWidthInput')?.value || 0);
  const customH = Number($fc('fcCustomHeightInput')?.value || 0);

  if (!usePreset && customW > 0) {
    box.style.width = `${Math.max(240, Math.min(1200, customW))}px`;
  } else {
    box.style.width = '100%';
  }
  if (customH > 0) {
    editor.style.height = `${Math.max(120, Math.min(720, customH))}px`;
    editor.style.maxHeight = 'none';
  } else {
    editor.style.height = '';
    editor.style.maxHeight = '360px';
  }
}

function insertTextBoxIntoFloatingCardEditor() {
  const doc = getFcStudioDoc();
  const editor = doc.getElementById('fcRichBodyEditor');
  if (!editor) return;
  editor.setAttribute('contenteditable', 'false');
  const box = doc.createElement('div');
  box.className = 'fc-text-box p-3 rounded-xl border border-borderline bg-white/85 my-2';
  box.setAttribute('contenteditable', 'false');
  box.style.width = '100%';
  box.innerHTML = `<p data-editable contenteditable="true" class="text-sm md:text-base leading-relaxed">텍스트 내용을 입력하세요</p>`;
  editor.appendChild(box);
  makeFcBlockResizable(box);
  selectFcInnerBlock(box);
  if (typeof selectElementForInspector === 'function') selectElementForInspector(box, false);
  recordFcSnapshot();
  const editableLeaf = box.querySelector('p');
  if (editableLeaf) editableLeaf.focus();
  showToast('플로팅 카드 내부에 텍스트박스가 추가되었습니다.');
}

function deleteActiveFcInnerBlock() {
  const editor = $fc('fcRichBodyEditor');
  if (!activeFcInnerBlock || !editor || !editor.contains(activeFcInnerBlock)) {
    showToast('먼저 삭제할 카드 내부 블록을 클릭해 주세요.');
    return;
  }
  activeFcInnerBlock.remove();
  activeFcInnerBlock = null;
  recordFcSnapshot();
  showToast('선택한 내부 블록이 삭제되었습니다.');
}

function setFloatingCardBgImage() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.onchange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const applyUrl = (url) => {
      const editor = $fc('fcRichBodyEditor');
      if (!editor) return;
      editor.setAttribute('data-fc-bg-img-url', url);
      updateFloatingCardPreviewStyle();
      recordFcSnapshot();
      showToast('플로팅 카드 배경 이미지가 적용되었습니다. 배경색투명 및 배경사진 블러 슬라이더로 조절하세요.');
    };
    if (typeof compressImageFileToDataUrl === 'function') compressImageFileToDataUrl(file, 1400, applyUrl);
    else { const r = new FileReader(); r.onload = (ev) => applyUrl(ev.target.result); r.readAsDataURL(file); }
  };
  inp.click();
}

function setFloatingCardHoverBgImage() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.onchange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const applyUrl = (url) => {
      const editor = $fc('fcRichBodyEditor');
      if (!editor) return;
      editor.setAttribute('data-fc-hover-bg-img-url', url);
      updateFloatingCardPreviewStyle();
      recordFcSnapshot();
      showToast('플로팅 카드 호버 배경 사진이 설정되었습니다!');
    };
    if (typeof compressImageFileToDataUrl === 'function') compressImageFileToDataUrl(file, 1400, applyUrl);
    else { const r = new FileReader(); r.onload = (ev) => applyUrl(ev.target.result); r.readAsDataURL(file); }
  };
  inp.click();
}

function clearFloatingCardBgImage() {
  const editor = $fc('fcRichBodyEditor');
  if (!editor) return;
  editor.removeAttribute('data-fc-bg-img-url');
  updateFloatingCardPreviewStyle();
  recordFcSnapshot();
  if (typeof toggleFcLegacyPropsDrawer === 'function') toggleFcLegacyPropsDrawer(false);
  if (editor && !editor.dataset.unifiedMainBound) {
    editor.dataset.unifiedMainBound = 'true';
    editor.addEventListener('mousedown', (ev) => {
      if (typeof setActiveEditingContext === 'function') setActiveEditingContext('floating-card');
      const editHsDot = ev.target && ev.target.closest ? ev.target.closest('.iw-hs-dot') : null;
      if (editHsDot && editor.contains(editHsDot)) {
        ev.preventDefault();
        ev.stopPropagation();
        const pinEl = editHsDot.closest('.iw-hs-pin');
        const hsStage = editHsDot.closest('.iw-hs-stage');
        if (pinEl && hsStage) {
          const stRect = hsStage.getBoundingClientRect();
          const startX = ev.clientX, startY = ev.clientY;
          let dragged = false;
          const docRef = editor.ownerDocument || document;
          const onPinMove = (me) => {
            if (Math.abs(me.clientX - startX) > 3 || Math.abs(me.clientY - startY) > 3) dragged = true;
            if (!dragged || stRect.width <= 0 || stRect.height <= 0) return;
            const pctX = Math.max(4, Math.min(96, ((me.clientX - stRect.left) / stRect.width) * 100));
            const pctY = Math.max(6, Math.min(94, ((me.clientY - stRect.top) / stRect.height) * 100));
            pinEl.style.left = pctX.toFixed(1) + '%';
            pinEl.style.top = pctY.toFixed(1) + '%';
            if (typeof syncHotspotPinPopoverSide === 'function') syncHotspotPinPopoverSide(pinEl);
          };
          const onPinUp = () => {
            docRef.removeEventListener('mousemove', onPinMove);
            docRef.removeEventListener('mouseup', onPinUp);
            if (dragged && typeof recordFcSnapshot === 'function') recordFcSnapshot();
            else if (typeof toggleHotspotPin === 'function') toggleHotspotPin(pinEl);
          };
          docRef.addEventListener('mousemove', onPinMove);
          docRef.addEventListener('mouseup', onPinUp);
        }
        return;
      }
      const hit = ev.target && ev.target.closest ? ev.target.closest('.ppt-chart-widget, .ppt-interactive-widget, .card-embedded-obj, .fc-resizable-item, h1, h2, h3, h4, p, blockquote, li, img') : null;
      if (hit && editor.contains(hit) && typeof selectElementForInspector === 'function') {
        selectElementForInspector(hit, Boolean(ev.shiftKey));
      }
    });
    editor.addEventListener('scroll', () => {
      if (selectedElement && editor.contains(selectedElement) && typeof positionSelectionOverlay === 'function') {
        positionSelectionOverlay();
      }
    }, { passive: true });
  }
  showToast('플로팅 카드 기본 배경 이미지가 제거되었습니다.');
}

function clearFloatingCardHoverBgImage() {
  const editor = $fc('fcRichBodyEditor');
  if (!editor) return;
  editor.removeAttribute('data-fc-hover-bg-img-url');
  updateFloatingCardPreviewStyle();
  recordFcSnapshot();
  showToast('플로팅 카드 호버 배경 사진이 제거되었습니다.');
}

function resetFloatingCardEditorStyle() {
  const editor = $fc('fcRichBodyEditor');
  if (!editor) return;
  $fc('fcBgColorInput').value = '#FFFFFF';
  $fc('fcBgOpacityInput').value = '100';
  $fc('fcTextColorInput').value = '#111111';
  $fc('fcBorderColorInput').value = '#111111';
  $fc('fcRadiusSelect').value = '20px';
  $fc('fcBorderWidthSelect').value = '2px';
  if ($fc('fcBgBlurSlider')) $fc('fcBgBlurSlider').value = '0';
  if ($fc('fcBgBlurLabel')) $fc('fcBgBlurLabel').textContent = '0px';
  if ($fc('fcHoverBgBlurSlider')) $fc('fcHoverBgBlurSlider').value = '0';
  if ($fc('fcHoverBgBlurLabel')) $fc('fcHoverBgBlurLabel').textContent = '0px';
  if ($fc('fcUseWidthPresetToggle')) {
    $fc('fcUseWidthPresetToggle').checked = true;
    onFcWidthPresetToggle(true);
  }
  if ($fc('fcCustomWidthInput')) $fc('fcCustomWidthInput').value = '0';
  if ($fc('fcCustomHeightInput')) $fc('fcCustomHeightInput').value = '0';
  if ($fc('fcReactiveFxSelect')) $fc('fcReactiveFxSelect').value = 'none';
  if ($fc('fcFxBasisSelect')) $fc('fcFxBasisSelect').value = 'box';
  if ($fc('fcHoverBgColorInput')) $fc('fcHoverBgColorInput').value = '#EFF6FF';
  if ($fc('fcHoverBgOpacityInput')) $fc('fcHoverBgOpacityInput').value = '100';
  if ($fc('fcShadowToggle')) $fc('fcShadowToggle').checked = true;
  if ($fc('fcBorderFxToggle')) $fc('fcBorderFxToggle').checked = false;
  if ($fc('fcPositionPresetSelect')) {
    $fc('fcPositionPresetSelect').value = 'center';
    onFcPositionPresetChange('center');
  }
  editor.removeAttribute('data-fc-bg-img-url');
  editor.removeAttribute('data-fc-hover-bg-img-url');
  updateFloatingCardPreviewStyle();
  recordFcSnapshot();
}

function switchFcStudioTab(tabKey) {
  const doc = getFcStudioDoc();
  doc.querySelectorAll('.fc-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-fc-tab') === tabKey);
  });
  doc.querySelectorAll('.fc-tab-pane').forEach(pane => {
    pane.classList.toggle('hidden', pane.id !== 'fcStudioTab-' + tabKey);
  });
}


function toggleFcLegacyPropsDrawer(forceOpen) {
  const drawer = $fc('fcLegacyPropsDrawer');
  const btn = $fc('fcTogglePropsDrawerBtn');
  if (!drawer) return;
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : drawer.classList.contains('hidden');
  drawer.classList.toggle('hidden', !shouldOpen);
  if (btn) {
    btn.classList.toggle('bg-gopro', shouldOpen);
    btn.classList.toggle('bg-white/15', !shouldOpen);
  }
}

function startFcPreviewPanelDrag(e) {
  if (!e || e.button !== 0) return;
  if (fcStudioPopupWin && !fcStudioPopupWin.closed) return;
  const panel = document.getElementById('fcEditorDialogPanel');
  if (!panel) return;
  e.preventDefault();
  if (typeof setActiveEditingContext === 'function') setActiveEditingContext('floating-card');
  const rect = panel.getBoundingClientRect();
  panel.style.position = 'fixed';
  panel.style.left = rect.left + 'px';
  panel.style.top = rect.top + 'px';
  panel.style.margin = '0';
  const startX = e.clientX, startY = e.clientY, initL = rect.left, initT = rect.top;
  const onMove = (me) => {
    const nextL = Math.max(8, Math.min(window.innerWidth - 160, initL + (me.clientX - startX)));
    const nextT = Math.max(48, Math.min(window.innerHeight - 80, initT + (me.clientY - startY)));
    panel.style.left = Math.round(nextL) + 'px';
    panel.style.top = Math.round(nextT) + 'px';
    if (typeof positionSelectionOverlay === 'function' && selectedElement && panel.contains(selectedElement)) {
      positionSelectionOverlay();
    }
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

let fcOriginTriggerElement = null;

function openFloatingCardEditor(cardId) {
  if (typeof isEditMode !== 'undefined' && !isEditMode && typeof toggleEditMode === 'function') toggleEditMode(true);
  fcOriginTriggerElement = (typeof selectedElement !== 'undefined' && selectedElement && document.body.contains(selectedElement) && !selectedElement.closest('#fcRichBodyEditor') && !selectedElement.classList.contains('slide'))
    ? selectedElement
    : null;
  const store = ensureFloatingCardsStore();
  const modal = document.getElementById('floatingCardEditorModal');
  if (!store || !modal) {
    showToast('플로팅 카드 편집기를 불러올 수 없습니다.');
    return;
  }

  if (fcStudioPopupWin && fcStudioPopupWin.closed) {
    fcStudioPopupWin = null;
  }
  activeEditingFloatingCardId = cardId || ('fc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6));
  const existing = store.querySelector(`[data-fc-id="${activeEditingFloatingCardId}"]`);
  const editor = $fc('fcRichBodyEditor');
  try {

  $fc('fcTitleInput').value = existing ? (existing.getAttribute('data-fc-title') || '') : '상세 설명 팝업 카드';
  $fc('fcBgColorInput').value = existing ? (existing.getAttribute('data-fc-bg') || '#FFFFFF') : '#FFFFFF';
  if ($fc('fcBgOpacityInput')) $fc('fcBgOpacityInput').value = existing ? (existing.getAttribute('data-fc-opacity') || '100') : '100';
  $fc('fcTextColorInput').value = existing ? (existing.getAttribute('data-fc-color') || '#111111') : '#111111';
  if ($fc('fcBorderColorInput')) $fc('fcBorderColorInput').value = existing ? (existing.getAttribute('data-fc-border-color') || '#111111') : '#111111';
  if ($fc('fcRadiusSelect')) $fc('fcRadiusSelect').value = existing ? (existing.getAttribute('data-fc-radius') || '20px') : '20px';
  if ($fc('fcBorderWidthSelect')) $fc('fcBorderWidthSelect').value = existing ? (existing.getAttribute('data-fc-border-width') || '2px') : '2px';
  if ($fc('fcWidthSelect')) $fc('fcWidthSelect').value = existing ? (existing.getAttribute('data-fc-width-class') || 'max-w-2xl') : 'max-w-2xl';

  const bgBlur = existing ? (existing.getAttribute('data-fc-bg-blur') || '0') : '0';
  if ($fc('fcBgBlurSlider')) $fc('fcBgBlurSlider').value = bgBlur;
  if ($fc('fcBgBlurLabel')) $fc('fcBgBlurLabel').textContent = `${bgBlur}px`;

  const hoverBgBlur = existing ? (existing.getAttribute('data-fc-hover-bg-blur') || '0') : '0';
  if ($fc('fcHoverBgBlurSlider')) $fc('fcHoverBgBlurSlider').value = hoverBgBlur;
  if ($fc('fcHoverBgBlurLabel')) $fc('fcHoverBgBlurLabel').textContent = `${hoverBgBlur}px`;

  const usePreset = existing ? (existing.getAttribute('data-fc-use-width-preset') !== 'false') : true;
  if ($fc('fcUseWidthPresetToggle')) {
    $fc('fcUseWidthPresetToggle').checked = usePreset;
    onFcWidthPresetToggle(usePreset);
  }
  if ($fc('fcCustomWidthInput')) $fc('fcCustomWidthInput').value = existing ? (existing.getAttribute('data-fc-custom-w') || '0') : '0';
  if ($fc('fcCustomHeightInput')) $fc('fcCustomHeightInput').value = existing ? (existing.getAttribute('data-fc-custom-h') || '0') : '0';

  if ($fc('fcReactiveFxSelect')) $fc('fcReactiveFxSelect').value = existing ? (existing.getAttribute('data-fc-fx') || 'none') : 'none';
  if ($fc('fcFxBasisSelect')) $fc('fcFxBasisSelect').value = existing ? (existing.getAttribute('data-fc-fx-basis') || 'box') : 'box';
  if ($fc('fcHoverBgColorInput')) $fc('fcHoverBgColorInput').value = existing ? (existing.getAttribute('data-fc-hover-bg') || '#EFF6FF') : '#EFF6FF';
  if ($fc('fcHoverBgOpacityInput')) $fc('fcHoverBgOpacityInput').value = existing ? (existing.getAttribute('data-fc-hover-bg-alpha') || '100') : '100';
  if ($fc('fcShadowToggle')) $fc('fcShadowToggle').checked = existing ? (existing.getAttribute('data-fc-shadow') !== 'off') : true;
  if ($fc('fcShadowColorInput')) $fc('fcShadowColorInput').value = existing ? (existing.getAttribute('data-fc-shadow-hex') || '#0055FF') : '#0055FF';
  if ($fc('fcShadowOpacityInput')) $fc('fcShadowOpacityInput').value = existing ? (existing.getAttribute('data-fc-shadow-alpha') || '28') : '28';
  if ($fc('fcBorderFxToggle')) $fc('fcBorderFxToggle').checked = existing ? (existing.getAttribute('data-fc-border-fx') === 'on') : false;
  if ($fc('fcBorderFxColorInput')) $fc('fcBorderFxColorInput').value = existing ? (existing.getAttribute('data-fc-border-fx-hex') || '#0055FF') : '#0055FF';
  if ($fc('fcBorderFxWidthInput')) $fc('fcBorderFxWidthInput').value = existing ? (existing.getAttribute('data-fc-border-fx-width') || '2') : '2';

  if ($fc('fcPositionPresetSelect')) {
    const preset = existing ? (existing.getAttribute('data-fc-pos-preset') || 'center') : 'center';
    $fc('fcPositionPresetSelect').value = preset;
    onFcPositionPresetChange(preset);
  }
  if ($fc('fcPosXInput')) $fc('fcPosXInput').value = existing ? (existing.getAttribute('data-fc-pos-x') || '50') : '50';
  if ($fc('fcPosYInput')) $fc('fcPosYInput').value = existing ? (existing.getAttribute('data-fc-pos-y') || '50') : '50';

  // Keep outer #fcRichBodyEditor non-monolithic so each text block is an independent selectable/deletable text box!
  if (editor) editor.setAttribute('contenteditable', 'false');
  const rawBgImg = existing ? (existing.getAttribute('data-fc-bg-img') || '') : '';
  const cleanUrl = /^(?:linear|radial)-gradient\(/i.test(rawBgImg) ? rawBgImg : rawBgImg.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
  if (cleanUrl) editor.setAttribute('data-fc-bg-img-url', cleanUrl);
  else editor.removeAttribute('data-fc-bg-img-url');
  const rawBgMask = existing ? (existing.getAttribute('data-fc-bg-mask') || '') : '';
  if (rawBgMask) editor.setAttribute('data-fc-bg-mask', rawBgMask);
  else editor.removeAttribute('data-fc-bg-mask');

  const rawHoverBgImg = existing ? (existing.getAttribute('data-fc-hover-bg-img') || '') : '';
  const cleanHoverUrl = /^(?:linear|radial)-gradient\(/i.test(rawHoverBgImg) ? rawHoverBgImg : rawHoverBgImg.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
  if (cleanHoverUrl) editor.setAttribute('data-fc-hover-bg-img-url', cleanHoverUrl);
  else editor.removeAttribute('data-fc-hover-bg-img-url');
  const rawHoverMask = existing ? (existing.getAttribute('data-fc-hover-bg-mask') || '') : '';
  if (rawHoverMask) editor.setAttribute('data-fc-hover-bg-mask', rawHoverMask);
  else editor.removeAttribute('data-fc-hover-bg-mask');

  editor.innerHTML = existing
    ? existing.innerHTML
    : `<div class="fc-text-box fc-resizable-item p-2 rounded-lg mb-1" contenteditable="false" style="width:100%;"><span data-editable contenteditable="true" class="font-mono text-xs font-bold text-gopro uppercase block">DETAIL VIEW</span></div>
       <div class="fc-text-box fc-resizable-item p-2 rounded-lg mb-1" contenteditable="false" style="width:100%;"><h3 data-editable contenteditable="true" class="text-2xl font-black">플로팅 상세 카드 제목</h3></div>
       <div class="fc-text-box fc-resizable-item p-2 rounded-lg mb-1" contenteditable="false" style="width:100%;"><p data-editable contenteditable="true" class="text-base leading-relaxed">발표 중 연결된 요소(텍스트·도형·카드)를 클릭하면 이 팝업 카드가 지정된 위치와 크기로 부드럽게 나타납니다.</p></div>`;
  // Auto-upgrade legacy loose top-level text elements into independent selectable/deletable .fc-text-box blocks
  Array.from(editor.children).forEach(ch => {
    if (ch.matches && ch.matches('h1, h2, h3, h4, p, span, blockquote, ul, ol') && !ch.closest('.fc-resizable-item')) {
      const box = editor.ownerDocument.createElement('div');
      box.className = 'fc-text-box fc-resizable-item p-2 rounded-lg mb-1';
      box.setAttribute('contenteditable', 'false');
      box.style.width = '100%';
      ch.setAttribute('data-editable', '');
      ch.setAttribute('contenteditable', 'true');
      ch.parentNode.insertBefore(box, ch);
      box.appendChild(ch);
    }
  });

  enhanceAllFcResizableItems(editor);
  const firstChart = editor.querySelector('.ppt-chart-widget');
  if (firstChart) {
    if (!firstChart.dataset.chartUid) firstChart.dataset.chartUid = 'fc_chart_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    editor.dataset.activeChartId = firstChart.dataset.chartUid;
    syncChartInspectorUI(firstChart);
  } else {
    delete editor.dataset.activeChartId;
    syncChartInspectorUI(null);
  }

  if (!editor.dataset.fcInputBound) {
    editor.dataset.fcInputBound = 'true';
    const fcDoc = getFcStudioDoc();
    const previewBox = fcDoc.getElementById('fcPreviewResizeBox');
    if (previewBox && !previewBox.dataset.fcTiltBound) {
      previewBox.dataset.fcTiltBound = 'true';
      previewBox.addEventListener('mousemove', (me) => {
        if (previewBox.getAttribute('data-fx') !== 'hover-tilt') return;
        const r = previewBox.getBoundingClientRect();
        const px = (me.clientX - r.left) / Math.max(1, r.width) - 0.5;
        const py = (me.clientY - r.top) / Math.max(1, r.height) - 0.5;
        previewBox.style.transform = `perspective(900px) rotateX(${(-py * 8).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg) scale(1.02)`;
      });
      previewBox.addEventListener('mouseleave', () => {
        if (previewBox.getAttribute('data-fx') === 'hover-tilt') {
          previewBox.style.transform = '';
        }
      });
    }
    editor.addEventListener('click', (e) => {
      if (!e.target.closest('.fc-resizable-item')) {
        editor.querySelectorAll('.fc-item-selected').forEach(el => el.classList.remove('fc-item-selected'));
        activeFcInnerBlock = null;
      }

    });
    let fcTypeTimer = null;
    editor.addEventListener('input', () => {
      clearTimeout(fcTypeTimer);
      fcTypeTimer = setTimeout(() => recordFcSnapshot(), 400);
    });
    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.isComposing) {
        const activeEd = fcDoc.activeElement;
        if (activeEd && activeEd.isContentEditable && editor.contains(activeEd) && typeof insertCleanLineBreakInEditable === 'function') {
          e.preventDefault();
          insertCleanLineBreakInEditable(activeEd);
          clearTimeout(fcTypeTimer);
          fcTypeTimer = setTimeout(() => recordFcSnapshot(), 400);
        }
      }
    });
  }

  fcUndoStack.length = 0;
  fcRedoStack.length = 0;
  switchFcStudioTab('style');
  updateFloatingCardPreviewStyle();
  recordFcSnapshot();
  } catch (fcInitErr) {
    console.warn('[HTML Slide Tool] 플로팅 카드 초기값 동기화 경고:', fcInitErr);
  }

  if (fcStudioPopupWin && !fcStudioPopupWin.closed) {
    fcStudioPopupWin.focus();
  } else if (typeof openModalSafe === 'function') {
    openModalSafe(modal);
  } else {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
  }
  if (typeof setActiveEditingContext === 'function') setActiveEditingContext('floating-card');
  setTimeout(() => { if (editor) editor.focus(); }, 30);
}

function closeFloatingCardEditor() {
  if (fcStudioPopupWin && !fcStudioPopupWin.closed) {
    dockFcStudioBackToMain(false);
  }
  const fcEd = document.getElementById('fcRichBodyEditor');
  if (fcEd && selectedElement && fcEd.contains(selectedElement) && typeof clearSelectionInspector === 'function') {
    clearSelectionInspector();
  }
  if (typeof setActiveEditingContext === 'function') setActiveEditingContext('slide');
  const modal = document.getElementById('floatingCardEditorModal');
  if (modal) {
    if (typeof closeModalSafe === 'function') closeModalSafe(modal);
    else { modal.classList.add('hidden'); modal.classList.remove('flex'); modal.style.display = 'none'; }
  }
}

function insertImageIntoFloatingCardEditor() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.onchange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const mountImg = (url) => {
      const doc = getFcStudioDoc();
      const editor = doc.getElementById('fcRichBodyEditor');
      if (!editor) return;
      const wrap = doc.createElement('div');
      wrap.className = 'fc-resizable-item fc-img-wrap my-3 overflow-hidden rounded-xl border border-borderline';
      wrap.setAttribute('contenteditable', 'false');
      wrap.style.width = '100%';
      const img = doc.createElement('img');
      img.src = url;
      img.className = 'w-full max-h-64 object-contain block';
      wrap.appendChild(img);
      editor.appendChild(wrap);
      makeFcBlockResizable(wrap);
      selectFcInnerBlock(wrap);
      recordFcSnapshot();
      showToast('플로팅 카드에 사진이 삽입되었습니다! 우측·하단·모서리 핸들로 크기를 조절할 수 있습니다.');
    };
    if (typeof compressImageFileToDataUrl === 'function') compressImageFileToDataUrl(file, 1400, mountImg);
    else { const r = new FileReader(); r.onload = (ev) => mountImg(ev.target.result); r.readAsDataURL(file); }
  };
  inp.click();
}

function saveFloatingCardFromEditor() {
  const store = ensureFloatingCardsStore();
  if (!store || !activeEditingFloatingCardId) return;

  const title = ($fc('fcTitleInput')?.value || '상세 플로팅 카드').trim();
  const bg = $fc('fcBgColorInput')?.value || '#FFFFFF';
  const opacity = $fc('fcBgOpacityInput')?.value || '100';
  const color = $fc('fcTextColorInput')?.value || '#111111';
  const borderColor = $fc('fcBorderColorInput')?.value || '#111111';
  const radius = $fc('fcRadiusSelect')?.value || '20px';
  const borderWidth = $fc('fcBorderWidthSelect')?.value || '2px';
  const widthClass = $fc('fcWidthSelect')?.value || 'max-w-2xl';
  const bgBlur = $fc('fcBgBlurSlider')?.value || '0';
  const hoverBgBlur = $fc('fcHoverBgBlurSlider')?.value || '0';
  const useWidthPreset = Boolean($fc('fcUseWidthPresetToggle')?.checked);
  const customW = $fc('fcCustomWidthInput')?.value || '0';
  const customH = $fc('fcCustomHeightInput')?.value || '0';
  const fcFx = $fc('fcReactiveFxSelect')?.value || 'none';
  const fcFxBasis = $fc('fcFxBasisSelect')?.value || 'box';
  const fcHoverBg = $fc('fcHoverBgColorInput')?.value || '#EFF6FF';
  const fcHoverBgAlpha = $fc('fcHoverBgOpacityInput')?.value || '100';
  const fcShadow = $fc('fcShadowToggle')?.checked ? 'on' : 'off';
  const fcShadowHex = $fc('fcShadowColorInput')?.value || '#0055FF';
  const fcShadowAlpha = $fc('fcShadowOpacityInput')?.value || '28';
  const fcBorderFx = $fc('fcBorderFxToggle')?.checked ? 'on' : 'off';
  const fcBorderFxHex = $fc('fcBorderFxColorInput')?.value || '#0055FF';
  const fcBorderFxW = $fc('fcBorderFxWidthInput')?.value || '2';
  const posPreset = $fc('fcPositionPresetSelect')?.value || 'center';
  const posX = $fc('fcPosXInput')?.value || '50';
  const posY = $fc('fcPosYInput')?.value || '50';
  const editor = $fc('fcRichBodyEditor');
  const bgImgUrl = editor ? (editor.getAttribute('data-fc-bg-img-url') || '') : '';
  const hoverBgImgUrl = editor ? (editor.getAttribute('data-fc-hover-bg-img-url') || '') : '';

  let cleanHtml = '';
  if (editor) {
    const clone = editor.cloneNode(true);
    clone.querySelectorAll('.fc-item-resize-grip, .fc-item-resize-grip-e, .fc-item-resize-grip-s, .fc-item-move-grip').forEach(g => g.remove());
    clone.querySelectorAll('.fc-item-selected, .chart-cell-selected, .ppt-multi-selected, .is-selected').forEach(el => el.classList.remove('fc-item-selected', 'chart-cell-selected', 'ppt-multi-selected', 'is-selected'));
    clone.querySelectorAll('.table-col-resizer, .table-row-resizer').forEach(r => r.remove());
    clone.querySelectorAll('.iw-flip-scene.is-editing-back').forEach(s => {
      s.classList.remove('is-editing-back');
      const w = s.closest('.ppt-interactive-widget');
      const flipBtn = w ? w.querySelector('button[data-on-click*="toggleIwFlipEditSide"]') : null;
      if (flipBtn) flipBtn.textContent = '↻ 뒷면 편집으로 전환';
    });
    cleanHtml = clone.innerHTML;
  }

  let recordEl = store.querySelector(`[data-fc-id="${activeEditingFloatingCardId}"]`);
  if (!recordEl) {
    recordEl = document.createElement('div');
    recordEl.setAttribute('data-fc-id', activeEditingFloatingCardId);
    store.appendChild(recordEl);
  }
  recordEl.setAttribute('data-fc-title', title);
  recordEl.setAttribute('data-fc-bg', bg);
  recordEl.setAttribute('data-fc-opacity', opacity);
  recordEl.setAttribute('data-fc-color', color);
  recordEl.setAttribute('data-fc-border-color', borderColor);
  recordEl.setAttribute('data-fc-radius', radius);
  recordEl.setAttribute('data-fc-border-width', borderWidth);
  recordEl.setAttribute('data-fc-width-class', widthClass);
  recordEl.setAttribute('data-fc-bg-blur', bgBlur);
  recordEl.setAttribute('data-fc-hover-bg-blur', hoverBgBlur);
  recordEl.setAttribute('data-fc-use-width-preset', String(useWidthPreset));
  recordEl.setAttribute('data-fc-custom-w', customW);
  recordEl.setAttribute('data-fc-custom-h', customH);
  recordEl.setAttribute('data-fc-fx', fcFx);
  recordEl.setAttribute('data-fc-fx-basis', fcFxBasis);
  recordEl.setAttribute('data-fc-hover-bg', fcHoverBg);
  recordEl.setAttribute('data-fc-hover-bg-alpha', fcHoverBgAlpha);
  recordEl.setAttribute('data-fc-shadow', fcShadow);
  recordEl.setAttribute('data-fc-shadow-hex', fcShadowHex);
  recordEl.setAttribute('data-fc-shadow-alpha', fcShadowAlpha);
  recordEl.setAttribute('data-fc-border-fx', fcBorderFx);
  recordEl.setAttribute('data-fc-border-fx-hex', fcBorderFxHex);
  recordEl.setAttribute('data-fc-border-fx-width', fcBorderFxW);
  recordEl.setAttribute('data-fc-pos-preset', posPreset);
  recordEl.setAttribute('data-fc-pos-x', posX);
  recordEl.setAttribute('data-fc-pos-y', posY);
  const bgMaskSaved = editor ? (editor.getAttribute('data-fc-bg-mask') || '') : '';
  const hoverMaskSaved = editor ? (editor.getAttribute('data-fc-hover-bg-mask') || '') : '';
  const serializedBgImg = bgImgUrl ? (/^(?:linear|radial)-gradient\(/i.test(bgImgUrl) ? bgImgUrl : `url("${bgImgUrl}")`) : '';
  const serializedHoverBgImg = hoverBgImgUrl ? (/^(?:linear|radial)-gradient\(/i.test(hoverBgImgUrl) ? hoverBgImgUrl : `url("${hoverBgImgUrl}")`) : '';
  recordEl.setAttribute('data-fc-bg-img', serializedBgImg);
  recordEl.setAttribute('data-fc-hover-bg-img', serializedHoverBgImg);
  if (bgMaskSaved) recordEl.setAttribute('data-fc-bg-mask', bgMaskSaved); else recordEl.removeAttribute('data-fc-bg-mask');
  if (hoverMaskSaved) recordEl.setAttribute('data-fc-hover-bg-mask', hoverMaskSaved); else recordEl.removeAttribute('data-fc-hover-bg-mask');
  recordEl.innerHTML = cleanHtml;

  populateFloatingCardSelect();
  const sel = $studio('floatingCardSelect');
  if (sel) sel.value = activeEditingFloatingCardId;

  // Resolve the actual slide trigger element (never link to an inner element of #fcRichBodyEditor!)
  const slideTriggerTarget = (selectedElement && document.body.contains(selectedElement) && !selectedElement.closest('#fcRichBodyEditor') && !selectedElement.classList.contains('slide'))
    ? selectedElement
    : ((fcOriginTriggerElement && document.body.contains(fcOriginTriggerElement) && !fcOriginTriggerElement.closest('#fcRichBodyEditor')) ? fcOriginTriggerElement : null);

  if (typeof setActiveEditingContext === 'function') setActiveEditingContext('slide');

  if (slideTriggerTarget) {
    selectElementForInspector(slideTriggerTarget, false);
  } else {
    const activeSlideEl = slides[currentSlide - 1];
    if (activeSlideEl) {
      ensureFreeLayersOnAllSlides();
      const layer = activeSlideEl.querySelector('.ppt-free-layer');
      if (layer) {
        const btnObj = document.createElement('div');
        btnObj.className = 'ppt-free-obj shadow-md';
        btnObj.setAttribute('data-shape-type', 'linkButton');
        btnObj.style.left = '38%'; btnObj.style.top = '78%'; btnObj.style.width = 'fit-content'; btnObj.style.minWidth = '180px'; btnObj.style.height = '42px'; btnObj.style.padding = '8px 22px'; btnObj.style.backgroundColor = '#0055FF'; btnObj.style.border = '2px solid #003EC2'; btnObj.style.borderRadius = '9999px'; btnObj.style.color = '#FFFFFF'; btnObj.style.zIndex = String(layer.children.length + 24);
        btnObj.innerHTML = `<div data-editable contenteditable="true" class="shape-inner-text text-sm font-extrabold text-center">🪟 ${escapeAttr(title)}</div>`;
        layer.appendChild(btnObj);
        selectElementForInspector(btnObj, false);
        if (typeof refreshLayerList === 'function') refreshLayerList();
      }
    }
  }
  if (selectedElement && !selectedElement.closest('#fcRichBodyEditor')) {
    const typeSel = $studio('linkActionTypeSelect');
    if (typeSel) typeSel.value = 'floating';
    onLinkActionTypeChange('floating');
  } else {
    saveHistorySnapshot('플로팅 팝업 카드 생성', true);
  }
  closeFloatingCardEditor();
  showToast(`플로팅 카드 "${title}"가 저장되었습니다!`);
}

function getLinkedFloatingCardIds(el) {
  if (!el) return [];
  const multi = (el.getAttribute('data-floating-card-ids') || '').trim();
  if (multi) {
    return multi.split(',').map(s => s.trim()).filter(Boolean);
  }
  const single = (el.getAttribute('data-floating-card-id') || '').trim();
  return single ? [single] : [];
}

function setLinkedFloatingCardIds(el, ids) {
  if (!el) return;
  const store = ensureFloatingCardsStore();
  const validIds = Array.from(new Set((ids || []).filter(id => !store || store.querySelector(`[data-fc-id="${id}"]`))));
  if (validIds.length > 0) {
    el.setAttribute('data-floating-card-ids', validIds.join(','));
    el.setAttribute('data-floating-card-id', validIds[0]);
  } else {
    el.removeAttribute('data-floating-card-ids');
    el.removeAttribute('data-floating-card-id');
    el.removeAttribute('data-floating-card-mode');
  }
}

function setSelectedFloatingCardDisplayMode(mode) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true, true)) return;
  if (!selectedElement) return;
  selectedElement.setAttribute('data-floating-card-mode', mode === 'multi' ? 'multi' : 'paged');
  saveHistorySnapshot();
  showToast(mode === 'multi'
    ? '연결된 여러 플로팅 카드를 한 화면에 동시에 띄우도록 설정되었습니다.'
    : '연결된 여러 플로팅 카드를 페이지 전환 형식(1/N)으로 표시하도록 설정되었습니다.');
}

function renderLinkedFloatingCardsList() {
  const listEl = $studio('linkedFloatingCardsList');
  if (!listEl) return;
  const ids = getLinkedFloatingCardIds(selectedElement);
  const store = ensureFloatingCardsStore();
  listEl.innerHTML = '';

  if (ids.length === 0) {
    listEl.innerHTML = `<div class="text-[10px] text-muted text-center py-1">연결된 플로팅 카드가 없습니다. 위 목록에서 선택 후 '+ 연결 추가'를 누르세요.</div>`;
    return;
  }

  ids.forEach((rawFcId, idx) => {
    const fcId = String(rawFcId || '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (!fcId) return;
    const rec = store ? store.querySelector(`[data-fc-id="${fcId}"]`) : null;
    const title = rec ? (rec.getAttribute('data-fc-title') || `플로팅 카드 ${idx + 1}`) : fcId;
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between gap-1 px-2 py-1 rounded bg-canvas border border-borderline text-[10px]';
    row.innerHTML = `
      <span class="font-bold text-ink truncate flex-1">${idx + 1}. 🪟 ${escapeAttr(title)}</span>
      <div class="flex items-center gap-0.5 shrink-0">
        <button type="button" data-on-click="moveLinkedFloatingCardOrder(${idx}, -1)" class="px-1 py-0.5 rounded bg-white border border-borderline cursor-pointer" title="순서 위로">▲</button>
        <button type="button" data-on-click="moveLinkedFloatingCardOrder(${idx}, 1)" class="px-1 py-0.5 rounded bg-white border border-borderline cursor-pointer" title="순서 아래로">▼</button>
        <button type="button" data-on-click="openFloatingCardEditor('${fcId}')" class="px-1.5 py-0.5 rounded bg-ink text-white font-bold cursor-pointer" title="내용 수정">✎</button>
        <button type="button" data-on-click="removeFloatingCardLinkFromSelected('${fcId}')" class="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold cursor-pointer" title="이 요소에서 연결 해제">✕</button>
      </div>
    `;
    listEl.appendChild(row);
  });
}

function addFloatingCardLinkToSelected(explicitFcId) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true, true)) return;
  if (!selectedElement || (selectedElement.closest && selectedElement.closest('#fcRichBodyEditor'))) {
    showToast('먼저 슬라이드 위의 요소(버튼·카드·도형·텍스트)를 선택해 주세요.');
    return;
  }
  const sel = $studio('floatingCardSelect');
  const fcId = explicitFcId || (sel && sel.value) || '';
  if (!fcId) {
    showToast('연결할 플로팅 카드를 선택하거나 "+ 새 카드"로 생성해 주세요.');
    return;
  }
  const currentIds = getLinkedFloatingCardIds(selectedElement);
  if (!currentIds.includes(fcId)) {
    currentIds.push(fcId);
  }
  setLinkedFloatingCardIds(selectedElement, currentIds);
  if (!selectedElement.getAttribute('data-floating-card-mode')) {
    const mSel = $studio('floatingCardMultiModeSelect');
    selectedElement.setAttribute('data-floating-card-mode', (mSel && mSel.value === 'multi') ? 'multi' : 'paged');
  }
  renderLinkedFloatingCardsList();
  saveHistorySnapshot();
  showToast(`플로팅 카드가 연결되었습니다 (총 ${currentIds.length}개 연결됨).`);
}

function removeFloatingCardLinkFromSelected(fcId) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true, true)) return;
  if (!selectedElement) return;
  const nextIds = getLinkedFloatingCardIds(selectedElement).filter(id => id !== fcId);
  setLinkedFloatingCardIds(selectedElement, nextIds);
  renderLinkedFloatingCardsList();
  saveHistorySnapshot();
  showToast('선택 요소에서 해당 플로팅 카드 연결이 해제되었습니다.');
}

function moveLinkedFloatingCardOrder(idx, dir) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true, true)) return;
  if (!selectedElement) return;
  const ids = getLinkedFloatingCardIds(selectedElement);
  const targetIdx = idx + dir;
  if (targetIdx < 0 || targetIdx >= ids.length) return;
  const tmp = ids[idx];
  ids[idx] = ids[targetIdx];
  ids[targetIdx] = tmp;
  setLinkedFloatingCardIds(selectedElement, ids);
  renderLinkedFloatingCardsList();
  saveHistorySnapshot();
}

function editSelectedFloatingCard() {
  const sel = $studio('floatingCardSelect');
  const linked = getLinkedFloatingCardIds(selectedElement);
  const fcId = (sel && sel.value) || linked[0];
  if (!fcId) {
    openFloatingCardEditor(null);
    return;
  }
  openFloatingCardEditor(fcId);
}

function deleteSelectedFloatingCard() {
  const sel = $studio('floatingCardSelect');
  const fcId = sel && sel.value;
  if (!fcId) return;
  const store = ensureFloatingCardsStore();
  const item = store ? store.querySelector(`[data-fc-id="${fcId}"]`) : null;
  if (item) item.remove();
  if (typeof activeEditingFloatingCardId !== 'undefined' && activeEditingFloatingCardId === fcId && typeof closeFloatingCardEditor === 'function') {
    closeFloatingCardEditor();
  }
  document.querySelectorAll('[data-floating-card-id], [data-floating-card-ids]').forEach(el => {
    const remaining = getLinkedFloatingCardIds(el).filter(id => id !== fcId);
    setLinkedFloatingCardIds(el, remaining);
  });
  populateFloatingCardSelect();
  renderLinkedFloatingCardsList();
  saveHistorySnapshot();
  showToast('플로팅 카드가 보관함에서 삭제되었습니다.');
}

function ensureFloatingCardLightboxStage() {
  const lightbox = document.getElementById('floatingCardLightbox');
  if (!lightbox) return null;
  let stageEl = document.getElementById('floatingCardLightboxStage');
  if (!stageEl) {
    stageEl = document.createElement('div');
    stageEl.id = 'floatingCardLightboxStage';
    const contentBox = document.getElementById('floatingCardLightboxContent');
    if (contentBox && contentBox.parentElement === lightbox) {
      lightbox.insertBefore(stageEl, contentBox);
      stageEl.appendChild(contentBox);
    } else {
      lightbox.appendChild(stageEl);
    }
  }
  return stageEl;
}

function syncFloatingCardLightboxScale() {
  const lightbox = document.getElementById('floatingCardLightbox');
  if (!lightbox) return;
  const stageW = (typeof LOGICAL_STAGE_WIDTH === 'number' && LOGICAL_STAGE_WIDTH > 0) ? LOGICAL_STAGE_WIDTH : 1440;
  const stageH = (typeof LOGICAL_STAGE_HEIGHT === 'number' && LOGICAL_STAGE_HEIGHT > 0) ? LOGICAL_STAGE_HEIGHT : 810;
  const vv = window.visualViewport;
  const vw = Math.max(120, vv ? vv.width : window.innerWidth);
  const vh = Math.max(120, vv ? vv.height : window.innerHeight);
  const maxFit = Math.min(vw / stageW, vh / stageH);
  const slideScale = (typeof currentStageScale === 'number' && currentStageScale > 0) ? currentStageScale : maxFit;
  // Scale 1:1 with the slide (--stage-scale); only cap if edit-mode zoom exceeds the physical viewport
  const nextScale = Math.max(0.15, Math.min(slideScale, maxFit));
  lightbox.style.setProperty('--fc-lb-scale', nextScale.toFixed(6));
}

if (typeof window !== 'undefined' && window.visualViewport && !window.__fcLbVisualViewportBound) {
  window.__fcLbVisualViewportBound = true;
  window.visualViewport.addEventListener('resize', () => {
    if (typeof syncFloatingCardLightboxScale === 'function') syncFloatingCardLightboxScale();
  });
}

function applyFloatingCardLightboxPosition(lightbox, contentBox, preset, posX, posY) {
  const stageEl = ensureFloatingCardLightboxStage() || lightbox;
  if (lightbox && lightbox !== stageEl) {
    lightbox.style.alignItems = 'center';
    lightbox.style.justifyContent = 'center';
  }
  stageEl.style.alignItems = 'center';
  stageEl.style.justifyContent = 'center';
  contentBox.classList.remove('fc-pos-custom');
  contentBox.style.left = '';
  contentBox.style.top = '';
  contentBox.style.transform = '';

  if (preset === 'top-left') {
    stageEl.style.alignItems = 'flex-start';
    stageEl.style.justifyContent = 'flex-start';
  } else if (preset === 'top-center') {
    stageEl.style.alignItems = 'flex-start';
    stageEl.style.justifyContent = 'center';
  } else if (preset === 'top-right') {
    stageEl.style.alignItems = 'flex-start';
    stageEl.style.justifyContent = 'flex-end';
  } else if (preset === 'center-left') {
    stageEl.style.alignItems = 'center';
    stageEl.style.justifyContent = 'flex-start';
  } else if (preset === 'center-right') {
    stageEl.style.alignItems = 'center';
    stageEl.style.justifyContent = 'flex-end';
  } else if (preset === 'bottom-left') {
    stageEl.style.alignItems = 'flex-end';
    stageEl.style.justifyContent = 'flex-start';
  } else if (preset === 'bottom-center') {
    stageEl.style.alignItems = 'flex-end';
    stageEl.style.justifyContent = 'center';
  } else if (preset === 'bottom-right') {
    stageEl.style.alignItems = 'flex-end';
    stageEl.style.justifyContent = 'flex-end';
  } else if (preset === 'custom') {
    contentBox.classList.add('fc-pos-custom');
    const parsedX = (posX !== '' && posX !== null && posX !== undefined && Number.isFinite(Number(posX))) ? Number(posX) : 50;
    const parsedY = (posY !== '' && posY !== null && posY !== undefined && Number.isFinite(Number(posY))) ? Number(posY) : 50;
    contentBox.style.left = `${Math.max(0, Math.min(90, parsedX))}%`;
    contentBox.style.top = `${Math.max(0, Math.min(90, parsedY))}%`;
    contentBox.style.transform = 'translate(-50%, -50%)';
  }
}

let __activeLightboxCardIds = [];
let __activeLightboxCardIdx = 0;
let __activeLightboxDisplayMode = 'paged';

function switchFloatingCardLightboxIndex(nextIdx) {
  if (!__activeLightboxCardIds || __activeLightboxCardIds.length === 0) return;
  const len = __activeLightboxCardIds.length;
  const norm = ((nextIdx % len) + len) % len;
  __activeLightboxCardIdx = norm;
  openFloatingCardLightbox(__activeLightboxCardIds[norm], __activeLightboxCardIds, __activeLightboxDisplayMode);
}

function hydrateFloatingCardSurface(boxEl, recordEl, bodyTargetEl, extraTopHtml, isMultiSimultaneous) {
  const bg = recordEl.getAttribute('data-fc-bg') || '#FFFFFF';
  const opacity = recordEl.getAttribute('data-fc-opacity') || '100';
  const color = recordEl.getAttribute('data-fc-color') || '#111111';
  const borderColor = recordEl.getAttribute('data-fc-border-color') || '#111111';
  const radius = recordEl.getAttribute('data-fc-radius') || '20px';
  const borderWidth = recordEl.getAttribute('data-fc-border-width') || '2px';
  const widthClass = recordEl.getAttribute('data-fc-width-class') || 'max-w-2xl';
  const bgBlurPx = Number(recordEl.getAttribute('data-fc-bg-blur') || 0);
  const hoverBgBlurPx = Number(recordEl.getAttribute('data-fc-hover-bg-blur') || 0);
  const useWidthPreset = recordEl.getAttribute('data-fc-use-width-preset') !== 'false';
  const customW = Number(recordEl.getAttribute('data-fc-custom-w') || 0);
  const customH = Number(recordEl.getAttribute('data-fc-custom-h') || 0);
  const fcFx = recordEl.getAttribute('data-fc-fx') || 'none';
  const fcFxBasis = recordEl.getAttribute('data-fc-fx-basis') || 'box';
  const fcHoverBg = recordEl.getAttribute('data-fc-hover-bg') || '#EFF6FF';
  const fcHoverBgAlpha = recordEl.getAttribute('data-fc-hover-bg-alpha') || '100';
  const fcShadow = recordEl.getAttribute('data-fc-shadow') || 'on';
  const fcShadowHex = recordEl.getAttribute('data-fc-shadow-hex') || '#0055FF';
  const fcShadowAlpha = recordEl.getAttribute('data-fc-shadow-alpha') || '28';
  const fcBorderFx = recordEl.getAttribute('data-fc-border-fx') || 'off';
  const fcBorderFxHex = recordEl.getAttribute('data-fc-border-fx-hex') || '#0055FF';
  const fcBorderFxW = recordEl.getAttribute('data-fc-border-fx-width') || '2';
  const posPreset = recordEl.getAttribute('data-fc-pos-preset') || 'center';
  const posX = recordEl.getAttribute('data-fc-pos-x') || '50';
  const posY = recordEl.getAttribute('data-fc-pos-y') || '50';
  const bgImg = recordEl.getAttribute('data-fc-bg-img') || '';
  const hoverBgImg = recordEl.getAttribute('data-fc-hover-bg-img') || '';
  const rgbaOverlay = hexToRgba(bg, opacity);
  const hoverRgbaOverlay = hexToRgba(fcHoverBg, fcHoverBgAlpha);

  const appliedWidthCls = (useWidthPreset && customW <= 0)
    ? (isMultiSimultaneous ? 'max-w-lg' : widthClass)
    : '';
  const baseCls = isMultiSimultaneous
    ? `fc-multi-card-item relative border-ink overflow-y-auto safe-scroll p-6 md:p-8 shadow-2xl w-full ${appliedWidthCls}`
    : `relative border-ink overflow-y-auto safe-scroll p-7 md:p-10 shadow-2xl w-full ${appliedWidthCls}`;
  boxEl.className = baseCls;
  boxEl.style.width = (!useWidthPreset && customW > 0) ? `${customW}px` : '';
  boxEl.style.maxWidth = (!useWidthPreset && customW > 0) ? 'calc(var(--stage-w, 1440px) - 48px)' : '';
  boxEl.style.height = customH > 0 ? `${customH}px` : '';
  boxEl.style.color = color;
  boxEl.style.borderStyle = borderWidth === '0px' ? 'none' : 'solid';
  boxEl.style.borderWidth = borderWidth;
  boxEl.style.borderColor = borderColor;
  boxEl.style.borderRadius = radius;
  const hasReactiveFx = Boolean(fcFx && fcFx !== 'none');
  const effectiveHoverBgImg = hasReactiveFx ? hoverBgImg : '';

  boxEl.style.setProperty('--fc-base-tint', rgbaOverlay);
  if (hasReactiveFx) {
    boxEl.setAttribute('data-fc-has-hover', 'true');
    boxEl.style.setProperty('--card-hover-bg', hoverRgbaOverlay);
  } else {
    boxEl.removeAttribute('data-fc-has-hover');
    boxEl.style.removeProperty('--card-hover-bg');
  }

  let imgLayer = boxEl.querySelector('.fc-bg-img-layer');
  if (!imgLayer) {
    imgLayer = document.createElement('div');
    imgLayer.className = 'fc-bg-img-layer';
    boxEl.insertBefore(imgLayer, boxEl.firstChild);
  }
  let hoverImgLayer = boxEl.querySelector('.fc-hover-bg-img-layer');
  if (!hoverImgLayer) {
    hoverImgLayer = document.createElement('div');
    hoverImgLayer.className = 'fc-hover-bg-img-layer';
    imgLayer.insertAdjacentElement('afterend', hoverImgLayer);
  }
  let tintLayer = boxEl.querySelector('.fc-bg-tint-layer');
  if (!tintLayer) {
    tintLayer = document.createElement('div');
    tintLayer.className = 'fc-bg-tint-layer';
    hoverImgLayer.insertAdjacentElement('afterend', tintLayer);
  }

  imgLayer.style.filter = bgBlurPx > 0 ? `blur(${bgBlurPx}px)` : '';
  imgLayer.style.transform = bgBlurPx > 0 ? 'scale(1.06)' : '';
  hoverImgLayer.style.backgroundImage = effectiveHoverBgImg;
  hoverImgLayer.style.filter = (hasReactiveFx && hoverBgBlurPx > 0) ? `blur(${hoverBgBlurPx}px)` : '';
  hoverImgLayer.style.transform = (hasReactiveFx && hoverBgBlurPx > 0) ? 'scale(1.06)' : '';

  const bgMaskCss = recordEl.getAttribute('data-fc-bg-mask') || '';
  const hoverMaskCss = recordEl.getAttribute('data-fc-hover-bg-mask') || '';
  imgLayer.style.webkitMaskImage = bgMaskCss;
  imgLayer.style.maskImage = bgMaskCss;
  if (bgMaskCss) {
    imgLayer.style.webkitMaskRepeat = 'no-repeat'; imgLayer.style.maskRepeat = 'no-repeat';
    imgLayer.style.webkitMaskSize = '100% 100%'; imgLayer.style.maskSize = '100% 100%';
  }
  hoverImgLayer.style.webkitMaskImage = hasReactiveFx ? hoverMaskCss : '';
  hoverImgLayer.style.maskImage = hasReactiveFx ? hoverMaskCss : '';
  if (hasReactiveFx && hoverMaskCss) {
    hoverImgLayer.style.webkitMaskRepeat = 'no-repeat'; hoverImgLayer.style.maskRepeat = 'no-repeat';
    hoverImgLayer.style.webkitMaskSize = '100% 100%'; hoverImgLayer.style.maskSize = '100% 100%';
  }

  if (bgImg || effectiveHoverBgImg) {
    imgLayer.style.backgroundImage = bgImg || '';
    boxEl.style.backgroundColor = 'transparent';
    tintLayer.style.backgroundColor = (/^(?:linear|radial)-gradient\(/i.test(bgImg || '') && Number(opacity) >= 100) ? 'transparent' : rgbaOverlay;
  } else {
    imgLayer.style.backgroundImage = '';
    tintLayer.style.backgroundColor = 'transparent';
    boxEl.style.backgroundColor = rgbaOverlay;
  }

  boxEl.classList.remove('hover-reactive', 'fx-pulse-active', 'fx-highlight-toggled');
  boxEl.style.transform = '';
  if (hasReactiveFx) {
    boxEl.setAttribute('data-fx', fcFx);
    if (fcFx === 'hover-lift') boxEl.classList.add('hover-reactive');
    if (fcFxBasis === 'content') boxEl.setAttribute('data-fx-basis', 'content');
    else boxEl.removeAttribute('data-fx-basis');
    boxEl.setAttribute('data-fx-shadow', fcShadow);
    boxEl.style.setProperty('--fx-shadow-color', hexToRgba(fcShadowHex, fcShadowAlpha));
    boxEl.setAttribute('data-fx-border', fcBorderFx);
    if (fcBorderFx === 'on') {
      boxEl.style.setProperty('--fx-border-color', fcBorderFxHex);
      boxEl.style.setProperty('--fx-border-width', `${fcBorderFxW}px`);
    } else {
      boxEl.style.removeProperty('--fx-border-color');
      boxEl.style.removeProperty('--fx-border-width');
    }
  } else {
    boxEl.removeAttribute('data-fx');
    boxEl.removeAttribute('data-fx-basis');
    boxEl.removeAttribute('data-fx-shadow');
    boxEl.removeAttribute('data-fx-border');
    boxEl.style.removeProperty('--fx-shadow-color');
    boxEl.style.removeProperty('--fx-border-color');
    boxEl.style.removeProperty('--fx-border-width');
  }

  if (isMultiSimultaneous && posPreset === 'custom') {
    boxEl.classList.add('fc-pos-custom');
    const parsedMultiX = (posX !== '' && posX !== null && posX !== undefined && Number.isFinite(Number(posX))) ? Number(posX) : 50;
    const parsedMultiY = (posY !== '' && posY !== null && posY !== undefined && Number.isFinite(Number(posY))) ? Number(posY) : 50;
    boxEl.style.left = `${Math.max(0, Math.min(90, parsedMultiX))}%`;
    boxEl.style.top = `${Math.max(0, Math.min(90, parsedMultiY))}%`;
    boxEl.style.transform = 'translate(-50%, -50%)';
  }

  bodyTargetEl.innerHTML = (extraTopHtml || '') + recordEl.innerHTML;
  bodyTargetEl.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
  bodyTargetEl.querySelectorAll('.fc-item-resize-grip, .fc-item-resize-grip-e, .fc-item-resize-grip-s, .fc-item-move-grip, .table-col-resizer, .table-row-resizer, .iw-edit-bar, .embed-widget-drag-bar, .yt-local-hint-bar, .card-edit-controls, .ppt-slide-comment-badge').forEach(g => g.remove());
  bodyTargetEl.querySelectorAll('.iw-flip-scene.is-editing-back').forEach(s => s.classList.remove('is-editing-back'));
  bodyTargetEl.querySelectorAll('.chart-cell-selected, .ppt-multi-selected, .is-selected, .fc-item-selected').forEach(el => el.classList.remove('chart-cell-selected', 'ppt-multi-selected', 'is-selected', 'fc-item-selected'));
  if (typeof hydrateYouTubeEmbedsForProtocol === 'function') hydrateYouTubeEmbedsForProtocol(bodyTargetEl);
  if (typeof animateSlideKpisAndCharts === 'function') requestAnimationFrame(() => animateSlideKpisAndCharts(bodyTargetEl));
}

function openFloatingCardLightbox(fcIdOrList, explicitList, displayMode) {
  const store = ensureFloatingCardsStore();
  const lightbox = document.getElementById('floatingCardLightbox');
  const contentBox = document.getElementById('floatingCardLightboxContent');
  const bodyEl = document.getElementById('floatingCardLightboxBody');
  if (!store || !lightbox || !contentBox || !bodyEl) return;

  const list = Array.isArray(fcIdOrList)
    ? fcIdOrList
    : (Array.isArray(explicitList) ? explicitList : [fcIdOrList]);
  const validList = list.filter(id => id && store.querySelector(`[data-fc-id="${id}"]`));
  if (validList.length === 0) return;

  const mode = displayMode || 'paged';
  __activeLightboxDisplayMode = mode;
  __activeLightboxCardIds = validList;

  // Clean up any previous simultaneous multi-cards
  lightbox.querySelectorAll('.fc-multi-card-item').forEach(n => n.remove());
  lightbox.classList.remove('fc-multi-open');

  const stageEl = ensureFloatingCardLightboxStage() || lightbox;
  syncFloatingCardLightboxScale();

  // Mode A: Simultaneous Multi-Card Display (`multi`)
  if (mode === 'multi' && validList.length > 1) {
    contentBox.style.display = 'none';
    lightbox.style.alignItems = 'center';
    lightbox.style.justifyContent = 'center';
    stageEl.style.alignItems = 'center';
    stageEl.style.justifyContent = 'center';
    validList.forEach(id => {
      const rec = store.querySelector(`[data-fc-id="${id}"]`);
      if (!rec) return;
      const cardEl = document.createElement('div');
      cardEl.addEventListener('click', (ev) => ev.stopPropagation());
      const innerBody = document.createElement('div');
      innerBody.className = 'fc-multi-card-body';
      cardEl.appendChild(innerBody);
      hydrateFloatingCardSurface(cardEl, rec, innerBody, '', true);
      stageEl.appendChild(cardEl);
    });
    lightbox.classList.add('open', 'fc-multi-open');
    return;
  }

  // Mode B: Paged Single-Card Display (`paged`) with minimal `1/N` page counter ONLY
  contentBox.style.display = '';
  const fcId = Array.isArray(fcIdOrList) ? validList[0] : fcIdOrList;
  __activeLightboxCardIdx = Math.max(0, validList.indexOf(fcId));

  const recordEl = store.querySelector(`[data-fc-id="${fcId}"]`);
  if (!recordEl) return;

  const posPreset = recordEl.getAttribute('data-fc-pos-preset') || 'center';
  const posX = recordEl.getAttribute('data-fc-pos-x') || '50';
  const posY = recordEl.getAttribute('data-fc-pos-y') || '50';

  const pageCounterHtml = __activeLightboxCardIds.length > 1
    ? `<div data-on-click="event.stopPropagation(); switchFloatingCardLightboxIndex(${__activeLightboxCardIdx + 1})" title="클릭하거나 방향키(←/→)로 다음 페이지 보기" class="float-right ml-3 mb-1 px-2 py-0.5 rounded-full bg-black/10 font-mono text-[11px] font-bold opacity-75 hover:opacity-100 cursor-pointer select-none">${__activeLightboxCardIdx + 1}/${__activeLightboxCardIds.length}</div>`
    : '';

  hydrateFloatingCardSurface(contentBox, recordEl, bodyEl, pageCounterHtml, false);
  applyFloatingCardLightboxPosition(lightbox, contentBox, posPreset, posX, posY);

  lightbox.classList.add('open');
}

function closeFloatingCardLightbox() {
  const lightbox = document.getElementById('floatingCardLightbox');
  if (lightbox) {
    lightbox.querySelectorAll('video, audio').forEach(m => { try { if (!m.paused) m.pause(); } catch (e) {} });
    lightbox.classList.remove('open', 'fc-multi-open');
    lightbox.querySelectorAll('.fc-multi-card-item').forEach(n => n.remove());
    const bodyEl = document.getElementById('floatingCardLightboxBody');
    if (bodyEl) bodyEl.innerHTML = '';
  }
}

function syncLinkInspectorUI(el) {
  const typeSel = $studio('linkActionTypeSelect');
  const floatingWrap = $studio('linkFloatingCardWrap');
  const triggerWrap = $studio('linkTriggerTargetWrap');
  const slideWrap = $studio('linkSlideTargetWrap');
  const urlWrap = $studio('linkUrlTargetWrap');
  const slideInp = $studio('linkSlideTargetInput');
  const urlInp = $studio('linkUrlTargetInput');
  if (!typeSel || !el) return;

  if (floatingWrap) floatingWrap.classList.add('hidden');
  if (triggerWrap) triggerWrap.classList.add('hidden');
  if (slideWrap) slideWrap.classList.add('hidden');
  if (urlWrap) urlWrap.classList.add('hidden');

  if (el.hasAttribute('data-floating-card-id') || el.hasAttribute('data-floating-card-ids')) {
    typeSel.value = 'floating';
    populateFloatingCardSelect();
    const linked = getLinkedFloatingCardIds(el);
    const fSel = $studio('floatingCardSelect');
    if (fSel && linked.length > 0) fSel.value = linked[0];
    const mSel = $studio('floatingCardMultiModeSelect');
    if (mSel) mSel.value = el.getAttribute('data-floating-card-mode') || 'paged';
    renderLinkedFloatingCardsList();
    if (floatingWrap) {
      floatingWrap.classList.remove('hidden');
      floatingWrap.classList.add('flex');
    }
  } else if (el.hasAttribute('data-trigger-target') || el.getAttribute('data-shape-type') === 'triggerButton') {
    typeSel.value = 'trigger';
    populateTriggerTargetSelect();
    const tSel = $studio('triggerTargetSelect');
    const rSel = $studio('triggerReactionSelect');
    if (tSel) tSel.value = el.getAttribute('data-trigger-target') || '';
    if (rSel) rSel.value = el.getAttribute('data-trigger-reaction') || 'reveal';
    if (triggerWrap) {
      triggerWrap.classList.remove('hidden');
      triggerWrap.classList.add('flex');
    }
  } else if (el.hasAttribute('data-goto-url')) {
    typeSel.value = 'url';
    urlInp.value = el.getAttribute('data-goto-url') || '';
    urlWrap.classList.remove('hidden');
    urlWrap.classList.add('flex');
  } else if (el.hasAttribute('data-goto-slide')) {
    typeSel.value = 'slide';
    slideInp.value = el.getAttribute('data-goto-slide') || '1';
    slideWrap.classList.remove('hidden');
    slideWrap.classList.add('flex');
  } else {
    typeSel.value = 'none';
  }
}

function onLinkActionTypeChange(val) {
  const floatingWrap = $studio('linkFloatingCardWrap');
  const triggerWrap = $studio('linkTriggerTargetWrap');
  const slideWrap = $studio('linkSlideTargetWrap');
  const urlWrap = $studio('linkUrlTargetWrap');
  if (floatingWrap) floatingWrap.classList.add('hidden');
  if (triggerWrap) triggerWrap.classList.add('hidden');
  if (slideWrap) slideWrap.classList.add('hidden');
  if (urlWrap) urlWrap.classList.add('hidden');

  if (val === 'floating' && floatingWrap) {
    populateFloatingCardSelect();
    floatingWrap.classList.remove('hidden');
    floatingWrap.classList.add('flex');
    const fSel = $studio('floatingCardSelect');
    if (fSel && !fSel.value && fSel.options.length > 1) {
      fSel.selectedIndex = 1;
    }
    renderLinkedFloatingCardsList();
  } else if (val === 'trigger' && triggerWrap) {
    populateTriggerTargetSelect();
    triggerWrap.classList.remove('hidden');
    triggerWrap.classList.add('flex');
  } else if (val === 'slide' && slideWrap) {
    slideWrap.classList.remove('hidden');
    slideWrap.classList.add('flex');
  } else if (val === 'url' && urlWrap) {
    urlWrap.classList.remove('hidden');
    urlWrap.classList.add('flex');
  }
  applyLinkActionToSelected();
}

function applyLinkActionToSelected() {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true, true)) return;
  if (!selectedElement) {
    showToast('먼저 액션이나 링크를 연결할 텍스트·카드·도형을 클릭해 주세요.');
    return;
  }
  const type = $studio('linkActionTypeSelect')?.value || 'none';
  const prevLinkedIds = getLinkedFloatingCardIds(selectedElement);
  const prevFcMode = selectedElement.getAttribute('data-floating-card-mode') || ($studio('floatingCardMultiModeSelect')?.value || 'paged');
  selectedElement.removeAttribute('data-floating-card-id');
  selectedElement.removeAttribute('data-floating-card-ids');
  selectedElement.removeAttribute('data-floating-card-mode');
  selectedElement.removeAttribute('data-goto-slide');
  selectedElement.removeAttribute('data-goto-url');
  selectedElement.removeAttribute('data-trigger-target');
  selectedElement.removeAttribute('data-trigger-reaction');

  if (type === 'floating') {
    const fcId = $studio('floatingCardSelect')?.value || '';
    const merged = [...prevLinkedIds];
    if (fcId && !merged.includes(fcId)) merged.push(fcId);
    setLinkedFloatingCardIds(selectedElement, merged);
    if (merged.length > 0) selectedElement.setAttribute('data-floating-card-mode', prevFcMode === 'multi' ? 'multi' : 'paged');
    renderLinkedFloatingCardsList();
    if (merged.length > 0) {
      showToast(`플로팅 팝업 카드 ${merged.length}개가 연결되었습니다!`);
    }
  } else if (type === 'trigger') {
    const targetId = $studio('triggerTargetSelect')?.value || '';
    const reaction = $studio('triggerReactionSelect')?.value || 'reveal';
    if (targetId) {
      selectedElement.setAttribute('data-trigger-target', targetId);
      selectedElement.setAttribute('data-trigger-reaction', reaction);
      const activeSlideEl = slides[currentSlide - 1];
      const targetEl = activeSlideEl ? activeSlideEl.querySelector(`[data-trigger-node-id="${targetId}"]`) : null;
      if (targetEl) {
        targetEl.setAttribute('data-trigger-fx', reaction);
        targetEl.classList.remove('is-triggered');
      }
      showToast('버튼 클릭 시 연결된 요소가 반응하도록 설정되었습니다! (발표 모드에서 클릭 실행)');
    }
  } else if (type === 'slide') {
    const targetNum = Math.max(1, Math.min(totalSlides, parseInt($studio('linkSlideTargetInput')?.value || '1', 10)));
    selectedElement.setAttribute('data-goto-slide', String(targetNum));
    const subEl = selectedElement.querySelector('.toc-sub');
    if (subEl) subEl.textContent = `SLIDE ${String(targetNum).padStart(2, '0')}`;
    buildModalGrid();
    showToast(`클릭 시 ${targetNum}번 슬라이드로 이동하도록 연결되었습니다.`);
  } else if (type === 'url') {
    let rawUrl = ($studio('linkUrlTargetInput')?.value || '').trim();
    if (/^(?:javascript|vbscript|data):/i.test(rawUrl)) {
      showToast('보안상 허용되지 않는 URL 형식입니다. https:// 주소를 입력해 주세요.');
      return;
    }
    if (rawUrl && !/^https?:\/\//i.test(rawUrl)) rawUrl = 'https://' + rawUrl;
    if (rawUrl) {
      selectedElement.setAttribute('data-goto-url', rawUrl);
      showToast(`클릭 시 외부 URL(${rawUrl})로 이동하도록 연결되었습니다.`);
    }
  } else {
    showToast('연동 액션이 해제되었습니다.');
  }
  saveHistorySnapshot();
}
