function insertCleanLineBreakInEditable(editableEl) {
  const doc = editableEl ? editableEl.ownerDocument : document;
  const win = doc.defaultView || window;
  const sel = win.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  const br = doc.createElement('br');
  range.insertNode(br);
  const afterRange = doc.createRange();
  afterRange.selectNodeContents(editableEl);
  afterRange.setStartAfter(br);
  const trailingText = afterRange.toString();
  const hasTrailingBr = afterRange.cloneContents().querySelector('br');
  if (trailingText.length === 0 && !hasTrailingBr) {
    const trailingBr = doc.createElement('br');
    br.parentNode.insertBefore(trailingBr, br.nextSibling);
  }
  const nextRange = doc.createRange();
  nextRange.setStartAfter(br);
  nextRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(nextRange);
}

/* ==================== GLOBAL STAGE, OVERLAY, KEYBOARD & TOUCH LISTENERS ==================== */
function bindGlobalEditorListeners() {
  const stage = document.getElementById('slideStage');
  const overlay = document.getElementById('pptSelectionOverlay');
  const sectionBadge = document.getElementById('headerSectionBadge');
  const marqueeBox = document.getElementById('pptMarqueeBox');
  if (!stage) return;

  if (sectionBadge) {
    sectionBadge.addEventListener('input', () => {
      const activeSlideEl = slides[currentSlide - 1];
      if (activeSlideEl) {
        activeSlideEl.setAttribute('data-section', sectionBadge.textContent.trim());
        if (typeof markUnsavedChanges === 'function') markUnsavedChanges();
        if (typeof renderLeftFilmstripThumbnails === 'function') renderLeftFilmstripThumbnails();
      }
    });
    sectionBadge.addEventListener('blur', () => {
      if (isActiveEditing()) saveHistorySnapshot('섹션명 수정');
    });
  }

  // 1. 8-Way Resize Handles on Floating Selection Overlay
  if (overlay) overlay.addEventListener('mousedown', (e) => {
    const handle = e.target.closest('.ov-handle');
    if (!handle || !isActiveEditing()) return;
    const curSlideForResize = slides[currentSlide - 1];
    if (!(selectedElement && selectedElement.closest('#fcRichBodyEditor')) && curSlideForResize && curSlideForResize.getAttribute('data-slide-locked') === 'true') {
      showToast('잠긴 슬라이드의 요소는 크기를 조절할 수 없습니다.');
      return;
    }
    const rawActiveTargets = selectedElements.filter(el => el && document.body.contains(el));
    const activeTargets = rawActiveTargets.filter(el => el.getAttribute('data-layer-locked') !== 'true');
    if (rawActiveTargets.length > 0 && activeTargets.length === 0) {
      showToast('잠긴 레이어는 크기를 조절할 수 없습니다.');
      return;
    }
    if (activeTargets.length === 0 && (!selectedElement || selectedElement.getAttribute('data-layer-locked') === 'true')) return;
    e.preventDefault();
    e.stopPropagation();

    const dir = handle.getAttribute('data-dir') || 'se';
    const startX = e.clientX;
    const startY = e.clientY;

    // Case 0: Multi-Selection Group Proportional Scale
    if (activeTargets.length > 1) {
      const slideEl = slides[currentSlide - 1];
      if (!slideEl) return;

      // Case 0-A: Multi-Selected Grid Cards -> Resize proportionally WITHIN the grid (do NOT convert to free grid)
      const allGridCards = activeTargets.every(el => el.classList.contains('slide-card') && !el.classList.contains('ppt-free-obj'));
      if (allGridCards) {
        const gridBody = activeTargets[0].closest('.slide-grid-body');
        if (!gridBody) return;
        const allCards = Array.from(gridBody.querySelectorAll(':scope > .slide-card'));
        const initialAllRects = allCards.map(c => c.getBoundingClientRect());
        const initialMarginTops = allCards.map(c => parseFloat(window.getComputedStyle(c).marginTop) || 0);

        const onMultiCardMove = (me) => {
          resizeMultipleGridCardsProportionally(
            activeTargets,
            dir,
            me.clientX - startX,
            me.clientY - startY,
            gridBody,
            allCards,
            initialAllRects,
            initialMarginTops
          );
          positionSelectionOverlay();
          if (selectedElement) syncInspectorGeometry(selectedElement);
        };

        const onMultiCardUp = () => {
          allCards.forEach(c => { delete c.dataset.dragStartSpan; delete c._bentoDragInit; });
          document.removeEventListener('mousemove', onMultiCardMove);
          document.removeEventListener('mouseup', onMultiCardUp);
          saveHistorySnapshot();
        };

        startManagedDragSession(document, onMultiCardMove, onMultiCardUp);
        return;
      }

      const slideRect = slideEl.getBoundingClientRect();
      const initGroupRect = getSelectionGroupRect();
      if (!initGroupRect) return;

      const preparedTargets = detachMultipleElementsSafely(activeTargets);
      selectedElements = preparedTargets;
      selectedElement = preparedTargets[preparedTargets.length - 1] || null;
      syncMultiSelectVisuals();

      const snapshots = preparedTargets.map(el => {
        const fontNodes = [];
        const candidates = el.matches('[data-editable], h1, h2, h3, h4, p, span, div')
          ? [el, ...Array.from(el.querySelectorAll('[data-editable], h1, h2, h3, h4, p, span'))]
          : Array.from(el.querySelectorAll('[data-editable], h1, h2, h3, h4, p, span'));
        const seen = new Set();
        candidates.forEach(node => {
          if (seen.has(node)) return;
          if (node.closest('.card-edit-controls, .img-edit-overlay, .sub-box-del-btn, .card-media-controls, .iw-edit-bar, .iw-hs-dot, .iw-flip-cue, .chart-scenario-bar, .ppt-chart-widget')) return;
          seen.add(node);
          if (node.children.length === 0 || node.hasAttribute('data-editable')) {
            const fpx = parseFloat(window.getComputedStyle(node).fontSize) || 16;
            fontNodes.push({ node, initFontPx: fpx });
          }
        });
        return {
          el,
          rect: el.getBoundingClientRect(),
          initOffX: parseFloat(el.getAttribute('data-offset-x') || '0') || 0,
          initOffY: parseFloat(el.getAttribute('data-offset-y') || '0') || 0,
          fontNodes
        };
      });

      const onGroupMove = (me) => {
        applyGroupProportionalTransform(
          snapshots,
          initGroupRect,
          dir,
          me.clientX - startX,
          me.clientY - startY,
          slideRect,
          me.shiftKey,
          me.altKey
        );
        positionSelectionOverlay();
        if (selectedElement) syncInspectorGeometry(selectedElement);
      };

      const onGroupUp = () => {
        document.removeEventListener('mousemove', onGroupMove);
        document.removeEventListener('mouseup', onGroupUp);
        saveHistorySnapshot();
      };

      startManagedDragSession(document, onGroupMove, onGroupUp);
      return;
    }

    // Single Element Resize
    const targetEl = activeTargets[0] || selectedElement;
    if (!targetEl) return;

    // Case A: Grid Card (.slide-card that is NOT detached free-obj)
    if (targetEl.classList.contains('slide-card') && !targetEl.classList.contains('ppt-free-obj')) {
      const card = targetEl;
      const gridBody = card.closest('.slide-grid-body');
      if (!gridBody) return;
      const siblingCards = Array.from(gridBody.querySelectorAll(':scope > .slide-card'));
      const initialRects = siblingCards.map(c => c.getBoundingClientRect());
      const initialMarginTop = parseFloat(window.getComputedStyle(card).marginTop) || 0;

      const onMove = (me) => {
        resizeGridCardProportionally(card, dir, me.clientX - startX, me.clientY - startY, gridBody, initialRects, initialMarginTop);
        positionSelectionOverlay();
        syncInspectorGeometry(card);
      };

      const onUp = () => {
        siblingCards.forEach(c => { delete c.dataset.dragStartSpan; delete c.dataset.dragStartCol; delete c._bentoDragInit; });
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        saveHistorySnapshot();
      };

      startManagedDragSession(document, onMove, onUp);
      return;
    }

    // Case B: Freeform Object (.ppt-free-obj)
    if (targetEl.classList.contains('ppt-free-obj')) {
      const obj = targetEl;
      const slideEl = slides[currentSlide - 1];
      if (!slideEl) return;
      const sRect = slideEl.getBoundingClientRect();
      const oRect = obj.getBoundingClientRect();
      const isPct = (v) => typeof v === 'string' && v.trim().endsWith('%');
      const initL = isPct(obj.style.left) ? (parseFloat(obj.style.left) || 0) : (((oRect.left - sRect.left) / Math.max(1, sRect.width)) * 100);
      const initT = isPct(obj.style.top) ? (parseFloat(obj.style.top) || 0) : (((oRect.top - sRect.top) / Math.max(1, sRect.height)) * 100);
      const initW = isPct(obj.style.width) ? (parseFloat(obj.style.width) || 20) : Math.max(4, (oRect.width / Math.max(1, sRect.width)) * 100);
      const initH = isPct(obj.style.height) ? (parseFloat(obj.style.height) || 15) : Math.max(4, (oRect.height / Math.max(1, sRect.height)) * 100);
      const ratio = (initH * sRect.height) / Math.max(1, initW * sRect.width);

      const onMove = (me) => {
        const isLockedAspect = obj.getAttribute('data-aspect-lock') === 'true';
        const symMult = me.altKey ? 2 : 1;
        const dxPct = ((me.clientX - startX) / sRect.width) * 100 * symMult;
        const dyPct = ((me.clientY - startY) / sRect.height) * 100 * symMult;
        let nextL = initL, nextT = initT, nextW = initW, nextH = initH;

        if (dir.includes('e')) {
          nextW = Math.max(4, initW + dxPct);
          if (me.altKey) nextL = initL - (nextW - initW) / 2;
        }
        if (dir.includes('s')) {
          nextH = Math.max(4, initH + dyPct);
          if (me.altKey) nextT = initT - (nextH - initH) / 2;
        }
        if (dir.includes('w')) {
          const clampedDx = Math.min(initW - 4, dxPct);
          nextW = initW - clampedDx;
          nextL = me.altKey ? (initL - (nextW - initW) / 2) : (initL + clampedDx);
        }
        if (dir.includes('n')) {
          const clampedDy = Math.min(initH - 4, dyPct);
          nextH = initH - clampedDy;
          nextT = me.altKey ? (initT - (nextH - initH) / 2) : (initT + clampedDy);
        }
        if ((me.shiftKey || isLockedAspect) && (dir === 'se' || dir === 'nw' || dir === 'ne' || dir === 'sw')) {
          nextH = Math.max(3, Math.min(100, (nextW * sRect.width * ratio) / Math.max(1, sRect.height)));
          if (me.altKey) nextT = initT - (nextH - initH) / 2;
          else if (dir.includes('n')) nextT = initT + (initH - nextH);
        }

        obj.style.left = nextL.toFixed(2) + '%';
        obj.style.top = nextT.toFixed(2) + '%';
        obj.style.width = nextW.toFixed(2) + '%';
        obj.style.height = nextH.toFixed(2) + '%';
        positionSelectionOverlay();
        syncInspectorGeometry(obj);
        if (typeof updateSlideConnectors === 'function') updateSlideConnectors(slideEl);
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        saveHistorySnapshot();
      };

      startManagedDragSession(document, onMove, onUp);
      return;
    }

    // Case C: Direct Resize for Media Cards / Media Frames, Sub-boxes & Card-Embedded Shapes
    if (targetEl.classList.contains('image-slot-box') || targetEl.classList.contains('card-inline-media') || targetEl.classList.contains('sub-box') || targetEl.classList.contains('ppt-chart-widget') || targetEl.classList.contains('card-embedded-obj') || targetEl.classList.contains('slide-header-bar') || targetEl.classList.contains('card-inner-textbox')) {
      const box = targetEl;
      const initScale = getStageScale();
      const initRect = box.getBoundingClientRect();
      const initLogicalW = initRect.width / initScale;
      const initLogicalH = initRect.height / initScale;
      const parentRect = (box.parentElement || slides[currentSlide - 1]).getBoundingClientRect();
      const parentLogicalW = parentRect.width / initScale;
      const aspectRatio = initLogicalH / Math.max(1, initLogicalW);
      const initOffX = parseFloat(box.getAttribute('data-offset-x') || '0') || 0;
      const initOffY = parseFloat(box.getAttribute('data-offset-y') || '0') || 0;

      // Anchor top edge inside flex cards so dragging bottom handle NEVER shifts or shrinks the top!
      const parentCard = box.closest('.slide-card');
      if (parentCard && (parentCard.classList.contains('justify-between') || parentCard.classList.contains('justify-center'))) {
        parentCard.classList.remove('justify-between', 'justify-center');
        parentCard.classList.add('justify-start');
      }

      delete box.dataset.lockedHeight;
      box.style.flex = '0 0 auto';
      box.style.maxHeight = 'none';
      box.classList.remove('flex-1');

      const innerMediaEl = box.querySelector('img.inline-media-el, .slot-img, video');
      if (innerMediaEl) {
        innerMediaEl.classList.remove('h-auto');
        innerMediaEl.style.height = '100%';
        innerMediaEl.style.width = '100%';
      }

      const onMediaMove = (me) => {
        const scale = getStageScale();
        const dx = (me.clientX - startX) / scale;
        const dy = (me.clientY - startY) / scale;
        let nextW = initLogicalW;
        let nextH = initLogicalH;

        if (dir.includes('e')) nextW = Math.max(40, Math.min(parentLogicalW, initLogicalW + dx));
        if (dir.includes('w')) nextW = Math.max(40, Math.min(parentLogicalW, initLogicalW - dx));
        if (dir.includes('s')) nextH = Math.max(24, Math.min(720, initLogicalH + dy));
        if (dir.includes('n')) nextH = Math.max(24, Math.min(720, initLogicalH - dy));

        if (me.shiftKey && (dir === 'se' || dir === 'nw' || dir === 'ne' || dir === 'sw')) {
          nextH = Math.max(24, Math.round(nextW * aspectRatio));
        }

        if (dir.includes('e') || dir.includes('w')) {
          const wPct = Math.max(10, Math.min(100, (nextW / Math.max(1, parentLogicalW)) * 100));
          box.style.width = wPct.toFixed(1) + '%';
          if (dir.includes('w')) {
            applyTextOffsetXY(box, Math.round(initOffX + (initLogicalW - nextW)), initOffY);
          }
        }
        if (dir.includes('s') || dir.includes('n') || me.shiftKey) {
          box.style.minHeight = Math.round(nextH) + 'px';
          box.style.height = Math.round(nextH) + 'px';
          if (dir.includes('n')) {
            applyTextOffsetXY(box, initOffX, Math.round(initOffY + (initLogicalH - nextH)));
          }
          if ($studio('cardMediaSizeSlider')) $studio('cardMediaSizeSlider').value = String(Math.min(460, Math.round(nextH)));
          if ($studio('cardMediaSizeLabel')) $studio('cardMediaSizeLabel').textContent = `${Math.round(nextH)}px`;
        }
        positionSelectionOverlay();
        syncInspectorGeometry(box);
      };

      const onMediaUp = () => {
        document.removeEventListener('mousemove', onMediaMove);
        document.removeEventListener('mouseup', onMediaUp);
        saveHistorySnapshot();
      };

      startManagedDragSession(document, onMediaMove, onMediaUp);
      return;
    }

    // Case D: Any Inner Card Element (Headings, Paragraphs, Spans, Tiers, Charts, Blocks)
    // Strictly isolated to the target element so sibling elements inside the card NEVER shift or resize!
    if (targetEl.closest('.slide-card')) {
      const innerEl = targetEl;
      const initScale = getStageScale();
      const initRect = innerEl.getBoundingClientRect();
      const initLogicalW = initRect.width / initScale;
      const initLogicalH = initRect.height / initScale;
      const parentCard = innerEl.closest('.slide-card');
      const parentRect = parentCard.getBoundingClientRect();
      const parentLogicalW = parentRect.width / initScale;
      const parentLogicalH = parentRect.height / initScale;
      const initFontPx = parseFloat(window.getComputedStyle(innerEl).fontSize) || 16;
      const initOffX = parseFloat(innerEl.getAttribute('data-offset-x') || '0') || 0;
      const initOffY = parseFloat(innerEl.getAttribute('data-offset-y') || '0') || 0;
      const isCorner = (dir === 'nw' || dir === 'ne' || dir === 'se' || dir === 'sw');
      const isPureText = innerEl.matches('h1, h2, h3, h4, p, span, blockquote, li, a') && !innerEl.classList.contains('ppt-chart-widget');

      if (window.getComputedStyle(innerEl).display === 'inline') {
        innerEl.style.display = 'inline-block';
      }
      innerEl.style.maxWidth = '100%';
      innerEl.style.boxSizing = 'border-box';

      const childFontSnapshots = Array.from(innerEl.querySelectorAll('*')).map(ch => ({
        node: ch,
        initPx: parseFloat(window.getComputedStyle(ch).fontSize) || initFontPx
      }));

      const onInnerResizeMove = (me) => {
        const scale = getStageScale();
        const dx = (me.clientX - startX) / scale;
        const dy = (me.clientY - startY) / scale;
        const maxInnerW = Math.max(40, parentLogicalW - 24);
        let nextW = initLogicalW;
        let nextH = initLogicalH;

        if (dir.includes('e')) nextW = Math.max(24, Math.min(maxInnerW, initLogicalW + dx));
        if (dir.includes('w')) nextW = Math.max(24, Math.min(maxInnerW, initLogicalW - dx));
        if (dir.includes('s')) nextH = Math.max(18, Math.min(parentLogicalH - 24, initLogicalH + dy));
        if (dir.includes('n')) nextH = Math.max(18, Math.min(parentLogicalH - 24, initLogicalH - dy));

        if (isCorner) {
          const scaleX = nextW / Math.max(1, initLogicalW);
          const scaleY = nextH / Math.max(1, initLogicalH);
          const uniformScale = Math.abs(dx) >= Math.abs(dy) ? scaleX : scaleY;
          const scaledW = Math.max(24, Math.min(maxInnerW, Math.round(initLogicalW * uniformScale)));
          innerEl.style.width = scaledW + 'px';

          if (isPureText) {
            const nextFont = Math.max(10, Math.min(140, Math.round(initFontPx * uniformScale)));
            innerEl.style.setProperty('font-size', nextFont + 'px', 'important');
            childFontSnapshots.forEach(item => {
              if (item.node.style.fontSize) {
                item.node.style.setProperty('font-size', Math.max(9, Math.min(140, Math.round(item.initPx * uniformScale))) + 'px', 'important');
              }
            });
            if ($studio('fontSizeInput')) $studio('fontSizeInput').value = String(nextFont);
          } else {
            const scaledH = Math.max(24, Math.min(parentLogicalH - 24, Math.round(initLogicalH * uniformScale)));
            innerEl.style.height = scaledH + 'px';
          }

          if (dir.includes('w')) {
            applyTextOffsetXY(innerEl, Math.round(initOffX + (initLogicalW - scaledW)), initOffY);
          }
        } else {
          if (dir.includes('e') || dir.includes('w')) {
            innerEl.style.width = Math.round(nextW) + 'px';
            if (dir.includes('w')) {
              applyTextOffsetXY(innerEl, Math.round(initOffX + (initLogicalW - nextW)), initOffY);
            }
          }
          if (dir.includes('s') || dir.includes('n')) {
            if (isPureText) {
              const vScale = nextH / Math.max(1, initLogicalH);
              const nextFont = Math.max(10, Math.min(140, Math.round(initFontPx * vScale)));
              innerEl.style.setProperty('font-size', nextFont + 'px', 'important');
              if ($studio('fontSizeInput')) $studio('fontSizeInput').value = String(nextFont);
            } else if (innerEl.classList.contains('card-inner-textbox')) {
              innerEl.style.minHeight = Math.round(nextH) + 'px';
              innerEl.style.height = 'auto';
            } else {
              innerEl.style.height = Math.round(nextH) + 'px';
            }
          }
        }
        positionSelectionOverlay();
        syncInspectorGeometry(innerEl);
      };

      const onInnerResizeUp = () => {
        document.removeEventListener('mousemove', onInnerResizeMove);
        document.removeEventListener('mouseup', onInnerResizeUp);
        saveHistorySnapshot();
      };

      startManagedDragSession(document, onInnerResizeMove, onInnerResizeUp);
    }
  });

  // 2. Drag Object or Group via Overlay Pill Handle (#ovDragHandle)
  const ovDragHandle = document.getElementById('ovDragHandle');
  if (ovDragHandle) {
    ovDragHandle.addEventListener('mousedown', (e) => {
      if (!isActiveEditing()) return;
      const curSlideForDrag = slides[currentSlide - 1];
      if (!(selectedElement && selectedElement.closest('#fcRichBodyEditor')) && curSlideForDrag && curSlideForDrag.getAttribute('data-slide-locked') === 'true') {
        showToast('잠긴 슬라이드의 요소는 이동할 수 없습니다.');
        return;
      }
      const rawActiveTargets = selectedElements.filter(el => el && document.body.contains(el));
      const activeTargets = rawActiveTargets.filter(el => el.getAttribute('data-layer-locked') !== 'true');
      if (rawActiveTargets.length > 0 && activeTargets.length === 0) {
        showToast('잠긴 레이어는 이동할 수 없습니다.');
        return;
      }
      if (activeTargets.length === 0 && (!selectedElement || selectedElement.getAttribute('data-layer-locked') === 'true')) return;
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startY = e.clientY;
      const slideEl = slides[currentSlide - 1];
      const sRect = slideEl ? slideEl.getBoundingClientRect() : null;

      if (activeTargets.length > 1) {
        const allGridCards = activeTargets.every(el => el.classList.contains('slide-card') && !el.classList.contains('ppt-free-obj'));
        if (allGridCards) {
          showToast('그리드 카드 상태입니다. 자유 위치로 이동하려면 상단 "⤢ 그리드 분리" 버튼을 먼저 눌러주세요.');
          return;
        }
        const prepared = detachMultipleElementsSafely(activeTargets);
        selectedElements = prepared;
        selectedElement = prepared[prepared.length - 1] || null;
        syncMultiSelectVisuals();

        const startStates = prepared.map(el => ({
          el,
          initL: parseFloat(el.style.left) || 0,
          initT: parseFloat(el.style.top) || 0,
          initOffX: parseFloat(el.getAttribute('data-offset-x') || '0') || 0,
          initOffY: parseFloat(el.getAttribute('data-offset-y') || '0') || 0
        }));

        const onGroupDrag = (me) => {
          const scale = getStageScale();
          const { dx: rawDx, dy: rawDy } = applyShiftAxisLock(me.clientX - startX, me.clientY - startY, me.shiftKey);
          const logicalDx = rawDx / scale;
          const logicalDy = rawDy / scale;
          startStates.forEach(st => {
            if (st.el.classList.contains('ppt-free-obj') && sRect) {
              const dxPct = (rawDx / sRect.width) * 100;
              const dyPct = (rawDy / sRect.height) * 100;
              st.el.style.left = Math.max(-20, Math.min(95, st.initL + dxPct)).toFixed(2) + '%';
              st.el.style.top = Math.max(-20, Math.min(95, st.initT + dyPct)).toFixed(2) + '%';
            } else {
              applyTextOffsetXY(st.el, Math.round(st.initOffX + logicalDx), Math.round(st.initOffY + logicalDy));
            }
          });
          positionSelectionOverlay();
          if (selectedElement) syncInspectorGeometry(selectedElement);
        };

        const onGroupDragUp = () => {
          document.removeEventListener('mousemove', onGroupDrag);
          document.removeEventListener('mouseup', onGroupDragUp);
          saveHistorySnapshot();
        };

        startManagedDragSession(document, onGroupDrag, onGroupDragUp);
        return;
      }

      let obj = activeTargets[0] || selectedElement;
      if (!obj) return;

      // True 2D Bento Drag-to-Empty-Slot / Drag-to-Split / Swap for Grid .slide-card!
      if (!obj.classList.contains('ppt-free-obj') && obj.classList.contains('slide-card') && obj.closest('.slide-grid-body') && typeof initFlexibleBentoGrid === 'function') {
        const gridBody = obj.closest('.slide-grid-body');
        const allCards = Array.from(gridBody.querySelectorAll(':scope > .slide-card'));
        initFlexibleBentoGrid(gridBody, allCards, allCards.map(c => c.getBoundingClientRect()));
        const origCoords = getBento2DCoords(obj);

        let dropPreview = document.getElementById('pptBentoDropPreview');
        if (!dropPreview) {
          dropPreview = document.createElement('div');
          dropPreview.id = 'pptBentoDropPreview';
          dropPreview.innerHTML = '<span>배치 위치</span>';
        }
        gridBody.appendChild(dropPreview);
        dropPreview.style.display = 'none';
        obj.style.opacity = '0.55';

        let pendingAction = null;
        const onBentoCardMove = (me) => {
          const gRect = gridBody.getBoundingClientRect();
          if (gRect.width <= 0 || gRect.height <= 0) return;
          const relX = Math.max(0, Math.min(0.999, (me.clientX - gRect.left) / gRect.width));
          const relY = Math.max(0, Math.min(0.999, (me.clientY - gRect.top) / gRect.height));
          const col = Math.max(1, Math.min(24, Math.floor(relX * 24) + 1));
          const row = Math.max(1, Math.min(24, Math.floor(relY * 24) + 1));

          const hitCard = allCards.find(c => {
            if (c === obj) return false;
            const b = getBento2DCoords(c);
            return col >= b.cs && col < b.cEnd && row >= b.rs && row < b.rEnd;
          });

          if (hitCard) {
            const tb = getBento2DCoords(hitCard);
            const hRect = hitCard.getBoundingClientRect();
            const lx = (me.clientX - hRect.left) / Math.max(1, hRect.width);
            const ly = (me.clientY - hRect.top) / Math.max(1, hRect.height);
            let mode = 'swap', pRect = { cs: tb.cs, cw: tb.cw, rs: tb.rs, rh: tb.rh }, label = '위치 맞바꾸기';
            if (ly < 0.32 && tb.rh >= 6) {
              const h1 = Math.floor(tb.rh / 2);
              mode = 'split-top'; pRect = { cs: tb.cs, cw: tb.cw, rs: tb.rs, rh: h1 }; label = '상단 분할 배치';
            } else if (ly > 0.68 && tb.rh >= 6) {
              const h1 = Math.floor(tb.rh / 2);
              mode = 'split-bottom'; pRect = { cs: tb.cs, cw: tb.cw, rs: tb.rs + h1, rh: tb.rh - h1 }; label = '하단 분할 배치';
            } else if (lx < 0.32 && tb.cw >= 6) {
              const w1 = Math.floor(tb.cw / 2);
              mode = 'split-left'; pRect = { cs: tb.cs, cw: w1, rs: tb.rs, rh: tb.rh }; label = '좌측 분할 배치';
            } else if (lx > 0.68 && tb.cw >= 6) {
              const w1 = Math.floor(tb.cw / 2);
              mode = 'split-right'; pRect = { cs: tb.cs + w1, cw: tb.cw - w1, rs: tb.rs, rh: tb.rh }; label = '우측 분할 배치';
            }
            pendingAction = { mode, targetCard: hitCard, targetCoords: tb, previewRect: pRect };
            dropPreview.style.display = 'flex';
            dropPreview.style.gridColumn = `${pRect.cs} / span ${pRect.cw}`;
            dropPreview.style.gridRow = `${pRect.rs} / span ${pRect.rh}`;
            dropPreview.firstElementChild.textContent = label;
          } else {
            const emptySlot = findLargestEmptyBentoRect(gridBody, obj, { col, row });
            if (emptySlot) {
              pendingAction = { mode: 'empty', previewRect: emptySlot };
              dropPreview.style.display = 'flex';
              dropPreview.style.gridColumn = `${emptySlot.cs} / span ${emptySlot.cw}`;
              dropPreview.style.gridRow = `${emptySlot.rs} / span ${emptySlot.rh}`;
              dropPreview.firstElementChild.textContent = '빈 영역 배치';
            } else {
              pendingAction = null;
              dropPreview.style.display = 'none';
            }
          }
        };

        const onBentoCardUp = () => {
          obj.style.opacity = '';
          if (dropPreview && dropPreview.parentNode) dropPreview.remove();
          document.removeEventListener('mousemove', onBentoCardMove);
          document.removeEventListener('mouseup', onBentoCardUp);
          if (!pendingAction) return;

          if (pendingAction.mode === 'swap' && pendingAction.targetCard) {
            const tb = pendingAction.targetCoords;
            applyBento2DCoords(obj, tb.cs, tb.cw, tb.rs, tb.rh);
            applyBento2DCoords(pendingAction.targetCard, origCoords.cs, origCoords.cw, origCoords.rs, origCoords.rh);
          } else if (pendingAction.mode === 'empty') {
            const r = pendingAction.previewRect;
            applyBento2DCoords(obj, r.cs, r.cw, r.rs, r.rh);
          } else if (pendingAction.targetCard) {
            const tb = pendingAction.targetCoords;
            const pr = pendingAction.previewRect;
            if (pendingAction.mode === 'split-top') {
              applyBento2DCoords(obj, pr.cs, pr.cw, pr.rs, pr.rh);
              applyBento2DCoords(pendingAction.targetCard, tb.cs, tb.cw, pr.rs + pr.rh, tb.rh - pr.rh);
            } else if (pendingAction.mode === 'split-bottom') {
              applyBento2DCoords(pendingAction.targetCard, tb.cs, tb.cw, tb.rs, tb.rh - pr.rh);
              applyBento2DCoords(obj, pr.cs, pr.cw, pr.rs, pr.rh);
            } else if (pendingAction.mode === 'split-left') {
              applyBento2DCoords(obj, pr.cs, pr.cw, pr.rs, pr.rh);
              applyBento2DCoords(pendingAction.targetCard, pr.cs + pr.cw, tb.cw - pr.cw, tb.rs, tb.rh);
            } else if (pendingAction.mode === 'split-right') {
              applyBento2DCoords(pendingAction.targetCard, tb.cs, tb.cw - pr.cw, tb.rs, tb.rh);
              applyBento2DCoords(obj, pr.cs, pr.cw, pr.rs, pr.rh);
            }
            if (typeof fillVacatedBentoRect === 'function') fillVacatedBentoRect(gridBody, origCoords);
          }
          syncBento2DMultiRowClass(gridBody);
          positionSelectionOverlay();
          syncInspectorGeometry(obj);
          saveHistorySnapshot('2D 카드 레이아웃 재배치');
          showToast('2D 벤토 카드 레이아웃이 재배치되었습니다.');
        };

        startManagedDragSession(document, onBentoCardMove, onBentoCardUp);
        return;
      }

      if (!obj.classList.contains('ppt-free-obj') && obj.closest('.slide-card')) {
        const initOffX = parseFloat(obj.getAttribute('data-offset-x') || '0') || 0;
        const initOffY = parseFloat(obj.getAttribute('data-offset-y') || '0') || 0;
        const initInnerRect = obj.getBoundingClientRect();
        const onMoveInner = (me) => {
          const scale = getStageScale();
          const { dx: rawDx, dy: rawDy, lockedAxis } = applyShiftAxisLock(me.clientX - startX, me.clientY - startY, me.shiftKey);
          const { snappedLeftPx, snappedTopPx } = computeAndRenderSmartGuides(
            [obj],
            initInnerRect.left + rawDx,
            initInnerRect.top + rawDy,
            initInnerRect.width,
            initInnerRect.height,
            slideEl,
            lockedAxis
          );
          const deltaLogicalX = (snappedLeftPx - initInnerRect.left) / scale;
          const deltaLogicalY = (snappedTopPx - initInnerRect.top) / scale;
          applyTextOffsetXY(obj, Math.round(initOffX + deltaLogicalX), Math.round(initOffY + deltaLogicalY));
        };
        const onUpInner = () => {
          clearSmartGuides();
          document.removeEventListener('mousemove', onMoveInner);
          document.removeEventListener('mouseup', onUpInner);
          saveHistorySnapshot();
        };
        startManagedDragSession(document, onMoveInner, onUpInner);
        return;
      }

      if (!obj.classList.contains('ppt-free-obj')) {
        obj = detachElementToFreeLayer(obj);
      }
      if (!obj || !sRect) return;
      const initL = parseFloat(obj.style.left) || 0;
      const initT = parseFloat(obj.style.top) || 0;
      const initObjRect = obj.getBoundingClientRect();

      const onMove = (me) => {
        const { dx: rawDxPx, dy: rawDyPx, lockedAxis } = applyShiftAxisLock(me.clientX - startX, me.clientY - startY, me.shiftKey);
        const { snappedLeftPx, snappedTopPx } = computeAndRenderSmartGuides(
          [obj],
          initObjRect.left + rawDxPx,
          initObjRect.top + rawDyPx,
          initObjRect.width,
          initObjRect.height,
          slideEl,
          lockedAxis
        );
        const dxPct = ((snappedLeftPx - initObjRect.left) / sRect.width) * 100;
        const dyPct = ((snappedTopPx - initObjRect.top) / sRect.height) * 100;
        obj.style.left = Math.max(-15, Math.min(94, initL + dxPct)).toFixed(2) + '%';
        obj.style.top = Math.max(-15, Math.min(94, initT + dyPct)).toFixed(2) + '%';
        positionSelectionOverlay();
        syncInspectorGeometry(obj);
      };

      const onUp = () => {
        clearSmartGuides();
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        saveHistorySnapshot();
      };

      startManagedDragSession(document, onMove, onUp);
    });
  }

  // 3. Presentation & Live Test Mode Stage Click (Widgets, Triggers, Reactive Clicks & Links)
  stage.addEventListener('click', (e) => {
    if (isEditMode && !isInteractiveTestMode) return;

    // 3D Flip Card click
    const flipScene = e.target.closest('.iw-flip-scene');
    if (flipScene && typeof toggleIwFlipCard === 'function') {
      toggleIwFlipCard(flipScene);
      return;
    }

    // Hotspot pin toggle (and close open popovers on outside click)
    const hsDot = e.target.closest('.iw-hs-dot');
    if (hsDot && typeof toggleHotspotPin === 'function') {
      e.stopPropagation();
      toggleHotspotPin(hsDot.closest('.iw-hs-pin'));
      return;
    }
    if (!e.target.closest('.iw-hs-popover')) {
      stage.querySelectorAll('.iw-hs-pin.is-open').forEach(p => p.classList.remove('is-open'));
    }

    const floatingTrigger = e.target.closest('[data-floating-card-ids], [data-floating-card-id]');
    if (floatingTrigger && typeof openFloatingCardLightbox === 'function') {
      const ids = typeof getLinkedFloatingCardIds === 'function'
        ? getLinkedFloatingCardIds(floatingTrigger)
        : [floatingTrigger.getAttribute('data-floating-card-id')].filter(Boolean);
      const displayMode = floatingTrigger.getAttribute('data-floating-card-mode') || 'paged';
      if (ids.length > 0) openFloatingCardLightbox(ids, ids, displayMode);
    }

    const triggerBtn = e.target.closest('[data-trigger-target]');
    if (triggerBtn) {
      executeTriggerButtonAction(triggerBtn);
    }

    const fxTarget = e.target.closest('[data-fx="click-pulse"], [data-fx="click-highlight"], [data-fx="click-flip"]');
    if (fxTarget) {
      const fx = fxTarget.getAttribute('data-fx');
      if (fx === 'click-pulse') { fxTarget.classList.remove('fx-pulse-active'); void fxTarget.offsetWidth; fxTarget.classList.add('fx-pulse-active'); }
      else if (fx === 'click-highlight') fxTarget.classList.toggle('fx-highlight-toggled');
      else if (fx === 'click-flip') { fxTarget.classList.remove('fx-flip-active'); void fxTarget.offsetWidth; fxTarget.classList.add('fx-flip-active'); }
    }
    const inlineAnchor = e.target.closest('a[data-inline-link], a[href]');
    if (inlineAnchor && !inlineAnchor.closest('.toc-card')) {
      const rawHref = (inlineAnchor.getAttribute('href') || '').trim();
      const slideMatch = rawHref.match(/^#slide-(\d+)$/i);
      if (slideMatch) { e.preventDefault(); goToSlide(parseInt(slideMatch[1], 10)); return; }
      if (/^https?:\/\//i.test(rawHref)) { e.preventDefault(); window.open(rawHref, '_blank', 'noopener,noreferrer'); return; }
    }
    const linkTarget = e.target.closest('[data-goto-slide], [data-goto-url]');
    if (!linkTarget || linkTarget.classList.contains('toc-card')) return;
    if (linkTarget.hasAttribute('data-goto-slide')) {
      const targetNum = parseInt(linkTarget.getAttribute('data-goto-slide') || '1', 10);
      if (!isNaN(targetNum)) goToSlide(targetNum);
    } else if (linkTarget.hasAttribute('data-goto-url')) {
      const targetUrl = (linkTarget.getAttribute('data-goto-url') || '').trim();
      if (targetUrl && /^https?:\/\//i.test(targetUrl)) window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  });

  // 3D Tilt, Chart Live Tooltip & Click Pulse Tracking in Presentation / Live Test Mode
  document.addEventListener('mousemove', (e) => {
    if (isEditMode && !isInteractiveTestMode) return;
    const chartPart = e.target.closest('[data-chart-part][data-chart-label]');
    const tt = document.getElementById('pptChartTooltip');
    if (tt) {
      if (chartPart) {
        const lbl = chartPart.getAttribute('data-chart-label') || '';
        const val = chartPart.getAttribute('data-chart-val') || '';
        const pct = chartPart.getAttribute('data-chart-pct') || '';
        const sub = chartPart.getAttribute('data-chart-sub') || '';
        tt.innerHTML = `<div style="font-weight:800;margin-bottom:2px;">${escapeAttr(lbl)}</div><div style="font-family:'JetBrains Mono',monospace;font-weight:800;color:#38BDF8;">${escapeAttr(val)} <span style="color:#94A3B8;font-weight:600;">(${escapeAttr(pct)})</span></div>${sub ? `<div style="color:#CBD5E1;font-size:10px;margin-top:2px;">${escapeAttr(sub)}</div>` : ''}`;
        tt.style.display = 'block';
        tt.style.left = Math.min(window.innerWidth - 230, e.clientX + 14) + 'px';
        tt.style.top = Math.max(8, e.clientY - 54) + 'px';
      } else {
        tt.style.display = 'none';
      }
    }
    const tiltEl = e.target.closest('[data-fx="hover-tilt"]');
    if (!tiltEl) return;
    const r = tiltEl.getBoundingClientRect();
    const px = (e.clientX - r.left) / Math.max(1, r.width) - 0.5;
    const py = (e.clientY - r.top) / Math.max(1, r.height) - 0.5;
    const offX = parseFloat(tiltEl.getAttribute('data-offset-x') || '0') || 0;
    const offY = parseFloat(tiltEl.getAttribute('data-offset-y') || '0') || 0;
    const baseTrans = tiltEl.classList.contains('fc-pos-custom')
      ? 'translate(-50%, -50%) '
      : ((offX !== 0 || offY !== 0) ? `translate(${offX}px, ${offY}px) ` : '');
    tiltEl.style.transform = `${baseTrans}perspective(900px) rotateX(${(-py * 8).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg) scale(1.02)`;
  });
  document.addEventListener('mouseout', (e) => {
    const tiltEl = e.target.closest('[data-fx="hover-tilt"]');
    if (tiltEl && !tiltEl.contains(e.relatedTarget)) {
      const offX = parseFloat(tiltEl.getAttribute('data-offset-x') || '0') || 0;
      const offY = parseFloat(tiltEl.getAttribute('data-offset-y') || '0') || 0;
      tiltEl.style.transform = tiltEl.classList.contains('fc-pos-custom')
        ? 'translate(-50%, -50%)'
        : ((offX !== 0 || offY !== 0) ? `translate(${offX}px, ${offY}px)` : '');
    }
  });
  const fcLightbox = document.getElementById('floatingCardLightbox');
  if (fcLightbox) {
    fcLightbox.addEventListener('click', (e) => {
      if (isEditMode && !isInteractiveTestMode) return;
      const flipScene = e.target.closest('.iw-flip-scene');
      if (flipScene && typeof toggleIwFlipCard === 'function') {
        e.stopPropagation();
        toggleIwFlipCard(flipScene);
        return;
      }
      const hsDot = e.target.closest('.iw-hs-dot');
      if (hsDot && typeof toggleHotspotPin === 'function') {
        e.stopPropagation();
        toggleHotspotPin(hsDot.closest('.iw-hs-pin'));
        return;
      }
      if (!e.target.closest('.iw-hs-popover')) {
        fcLightbox.querySelectorAll('.iw-hs-pin.is-open').forEach(p => p.classList.remove('is-open'));
      }
      const inlineAnchor = e.target.closest('a[data-inline-link], a[href^="#slide-"]');
      if (inlineAnchor) {
        const rawHref = (inlineAnchor.getAttribute('href') || '').trim();
        const slideMatch = rawHref.match(/^#slide-(\d+)$/i);
        if (slideMatch) {
          e.preventDefault();
          e.stopPropagation();
          if (typeof closeFloatingCardLightbox === 'function') closeFloatingCardLightbox();
          if (typeof goToSlide === 'function') goToSlide(parseInt(slideMatch[1], 10));
          return;
        }
      }
      const fxCard = e.target.closest('[data-fx="click-pulse"], [data-fx="click-highlight"], [data-fx="click-flip"]');
      if (!fxCard) return;
      const fx = fxCard.getAttribute('data-fx');
      if (fx === 'click-pulse') {
        fxCard.classList.remove('fx-pulse-active');
        void fxCard.offsetWidth;
        fxCard.classList.add('fx-pulse-active');
      } else if (fx === 'click-highlight') {
        fxCard.classList.toggle('fx-highlight-toggled');
      } else if (fx === 'click-flip') {
        fxCard.classList.remove('fx-flip-active');
        void fxCard.offsetWidth;
        fxCard.classList.add('fx-flip-active');
      }
    });
    fcLightbox.addEventListener('mousedown', (e) => {
      if (isEditMode && !isInteractiveTestMode) return;
      const baStage = e.target.closest('.iw-ba-stage');
      if (!baStage || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const lockedRect = baStage.getBoundingClientRect();
      const updateBa = (cx) => {
        const r = baStage.getBoundingClientRect();
        const leftEdge = r.width > 0 ? r.left : lockedRect.left;
        const wVal = r.width > 0 ? r.width : lockedRect.width;
        if (wVal > 0 && typeof setBeforeAfterPosition === 'function') {
          setBeforeAfterPosition(baStage, ((cx - leftEdge) / wVal) * 100);
        }
      };
      updateBa(e.clientX);
      const onMove = (me) => { me.preventDefault(); updateBa(me.clientX); };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove, true);
        window.removeEventListener('mouseup', onUp, true);
        window.removeEventListener('blur', onUp);
      };
      window.addEventListener('mousemove', onMove, true);
      window.addEventListener('mouseup', onUp, true);
      window.addEventListener('blur', onUp);
    });
    fcLightbox.addEventListener('touchstart', (e) => {
      if (isEditMode && !isInteractiveTestMode) return;
      const baStage = e.target && e.target.closest ? e.target.closest('.iw-ba-stage') : null;
      if (!baStage || !e.touches[0]) return;
      e.preventDefault();
      e.stopPropagation();
      const updateBa = (tx) => {
        const r = baStage.getBoundingClientRect();
        if (r.width > 0 && typeof setBeforeAfterPosition === 'function') {
          setBeforeAfterPosition(baStage, ((tx - r.left) / r.width) * 100);
        }
      };
      updateBa(e.touches[0].clientX);
      const onTm = (te) => { if (te.touches[0]) { te.preventDefault(); updateBa(te.touches[0].clientX); } };
      const onTe = () => {
        document.removeEventListener('touchmove', onTm);
        document.removeEventListener('touchend', onTe);
      };
      document.addEventListener('touchmove', onTm, { passive: false });
      document.addEventListener('touchend', onTe);
    }, { passive: false });
  }

  let __typingCheckpointTimer = null;
  stage.addEventListener('focusin', (e) => { if (isEditMode && e.target && e.target.isContentEditable) saveHistorySnapshot('텍스트 편집 전'); });
  stage.addEventListener('focusout', (e) => { if (isEditMode && e.target && e.target.isContentEditable) { clearTimeout(__typingCheckpointTimer); saveHistorySnapshot('텍스트 수정'); } });
  stage.addEventListener('input', (e) => {
    if (isEditMode && e.target && e.target.isContentEditable) {
      markUnsavedChanges();
      const autoFitEl = e.target.getAttribute('data-text-autofit') === 'true' ? e.target : e.target.closest('[data-text-autofit="true"]');
      if (autoFitEl && typeof runAutoFitOnElement === 'function') runAutoFitOnElement(autoFitEl);
      if (typeof updateTextCharCounter === 'function') updateTextCharCounter(e.target);
      clearTimeout(__typingCheckpointTimer);
      __typingCheckpointTimer = setTimeout(() => { if (isEditMode && document.activeElement && document.activeElement.isContentEditable) saveHistorySnapshot('텍스트 입력'); }, 850);
    }
  });
  stage.addEventListener('wheel', (e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); if (typeof adjustStageZoom === 'function') adjustStageZoom(e.deltaY < 0 ? 10 : -10); } }, { passive: false });
  stage.addEventListener('dblclick', (e) => {
    if (!isActiveEditing()) return;
    const activeSlideEl = slides[currentSlide - 1]; if (activeSlideEl && activeSlideEl.getAttribute('data-slide-locked') === 'true') return;
    const groupedItem = e.target.closest('[data-group-id]');
    if (groupedItem && groupedItem.getAttribute('data-group-id')) { isolatedGroupId = groupedItem.getAttribute('data-group-id'); selectElementForInspector(groupedItem, false); return; }
    if (e.target.closest('[contenteditable="true"], .slide-card, .slide-header-bar, .ppt-free-obj, button, input, select')) return;
    insertFreeTextboxAtClientPoint(e.clientX, e.clientY);
  });
  stage.addEventListener('contextmenu', (e) => {
    if (!isActiveEditing()) return; e.preventDefault();
    const hitTarget = e.target.closest('.ppt-free-obj, .card-inline-media, .ppt-chart-widget, .card-embedded-obj, .card-inner-textbox, .sub-box, .slide-card, .slide-header-bar');
    if (hitTarget && !selectedElements.includes(hitTarget) && selectedElement !== hitTarget) selectElementForInspector(hitTarget, false);
    openStageContextMenu(e.clientX, e.clientY);
  });

  document.querySelectorAll('#headerDeckTitle, #headerDeckSubtitle, #headerSectionBadge').forEach(el => {
    el.addEventListener('input', () => {
      if (isEditMode) markUnsavedChanges();
    });
  });

  stage.addEventListener('error', (e) => {
    if (e.target && e.target.tagName === 'VIDEO') {
      showVideoMissingFallback(e.target);
    }
  }, true);

  window.addEventListener('resize', updateStageViewportScale);
  document.addEventListener('fullscreenchange', updateStageViewportScale);
  stage.addEventListener('scroll', positionSelectionOverlay, true);


  stage.addEventListener('touchstart', (e) => {
    if (isEditMode && !isInteractiveTestMode) return;
    const baStage = e.target && e.target.closest ? e.target.closest('.iw-ba-stage') : null;
    if (!baStage || !e.touches[0]) return;
    e.preventDefault();
    const updateBa = (tx) => {
      const r = baStage.getBoundingClientRect();
      if (r.width > 0 && typeof setBeforeAfterPosition === 'function') {
        setBeforeAfterPosition(baStage, ((tx - r.left) / r.width) * 100);
      }
    };
    updateBa(e.touches[0].clientX);
    const onTm = (te) => { if (te.touches[0]) { te.preventDefault(); updateBa(te.touches[0].clientX); } };
    const onTe = () => {
      document.removeEventListener('touchmove', onTm);
      document.removeEventListener('touchend', onTe);
    };
    document.addEventListener('touchmove', onTm, { passive: false });
    document.addEventListener('touchend', onTe);
  }, { passive: false });

  // 4. Edit Mode Mousedown: Shift+Click Multi-Selection, Group Drag, Alt+Drag Inner Text & Marquee Selection
  stage.addEventListener('mousedown', (e) => {
    if (typeof setActiveEditingContext === 'function') setActiveEditingContext('slide');
    closeStageContextMenu(); if (typeof toggleHistoryDropdown === 'function') toggleHistoryDropdown(false);
    if (isSpacePanningMode) {
      e.preventDefault(); e.stopPropagation(); document.body.classList.add('space-pan-dragging');
      const startX = e.clientX, startY = e.clientY, initPanX = stagePanX, initPanY = stagePanY;
      const onPanMove = (me) => { stagePanX = initPanX + (me.clientX - startX); stagePanY = initPanY + (me.clientY - startY); updateStageViewportScale(); };
      const onPanUp = () => { document.body.classList.remove('space-pan-dragging'); document.removeEventListener('mousemove', onPanMove); document.removeEventListener('mouseup', onPanUp); };
      startManagedDragSession(document, onPanMove, onPanUp); return;
    }
    // Before/After Slider Drag (Presentation & Live Test Mode — Full 0%..100% Window-Wide Tracking)
    const baStage = e.target.closest('.iw-ba-stage');
    if (baStage && (!isEditMode || isInteractiveTestMode) && e.button === 0) {
      e.preventDefault();
      e.stopPropagation();
      const lockedRect = baStage.getBoundingClientRect();
      const updateBaFromClientX = (clientX) => {
        const r = baStage.getBoundingClientRect();
        const leftEdge = r.width > 0 ? r.left : lockedRect.left;
        const widthVal = r.width > 0 ? r.width : lockedRect.width;
        if (widthVal <= 0) return;
        const pct = ((clientX - leftEdge) / widthVal) * 100;
        if (typeof setBeforeAfterPosition === 'function') setBeforeAfterPosition(baStage, pct);
      };
      updateBaFromClientX(e.clientX);
      const onBaMove = (me) => { me.preventDefault(); updateBaFromClientX(me.clientX); };
      const onBaUp = () => {
        window.removeEventListener('mousemove', onBaMove, true);
        window.removeEventListener('mouseup', onBaUp, true);
        window.removeEventListener('blur', onBaUp);
      };
      window.addEventListener('mousemove', onBaMove, true);
      window.addEventListener('mouseup', onBaUp, true);
      window.addEventListener('blur', onBaUp);
      return;
    }

    if (!isEditMode || isInteractiveTestMode || e.button === 2) return;

    // Edit Mode: Hotspot Pin Dragging & Popover Toggle
    const editHsDot = e.target.closest('.iw-hs-dot');
    if (editHsDot) {
      e.preventDefault();
      e.stopPropagation();
      const pinEl = editHsDot.closest('.iw-hs-pin');
      const hsStage = editHsDot.closest('.iw-hs-stage');
      if (pinEl && hsStage) {
        const startX = e.clientX, startY = e.clientY;
        let dragged = false;
        const onPinMove = (me) => {
          if (Math.hypot(me.clientX - startX, me.clientY - startY) > 4) dragged = true;
          if (!dragged) return;
          const r = hsStage.getBoundingClientRect();
          const nx = Math.max(4, Math.min(96, ((me.clientX - r.left) / Math.max(1, r.width)) * 100));
          const ny = Math.max(6, Math.min(94, ((me.clientY - r.top) / Math.max(1, r.height)) * 100));
          pinEl.style.left = nx.toFixed(1) + '%';
          pinEl.style.top = ny.toFixed(1) + '%';
          if (typeof syncHotspotPinPopoverSide === 'function') syncHotspotPinPopoverSide(pinEl);
        };
        const onPinUp = () => {
          document.removeEventListener('mousemove', onPinMove);
          document.removeEventListener('mouseup', onPinUp);
          if (dragged) saveHistorySnapshot('핫스팟 핀 위치 이동');
          else if (typeof toggleHotspotPin === 'function') toggleHotspotPin(pinEl);
        };
        startManagedDragSession(document, onPinMove, onPinUp);
      }
      return;
    }
    const activeSlideEl = slides[currentSlide - 1]; if (activeSlideEl && activeSlideEl.getAttribute('data-slide-locked') === 'true') { e.preventDefault(); return; }
    if (typeof isPickingConnectorMode !== 'undefined' && isPickingConnectorMode) { const connTarget = e.target.closest('.ppt-free-obj, .slide-card, .slide-header-bar, .sub-box'); if (connTarget && typeof handleConnectorPickClick === 'function' && handleConnectorPickClick(connTarget)) { e.preventDefault(); return; } }
    if (e.target.closest('.card-edit-controls, .img-edit-overlay, .sub-box-del-btn, .card-media-controls, .table-col-resizer, .table-row-resizer, .iw-edit-bar, .chart-scenario-bar, .chart-scenario-btn, .iw-tab-btn, .ppt-audio-widget button')) return;
    if (e.altKey && !e.shiftKey && typeof document.elementsFromPoint === 'function') {
      const candidates = []; document.elementsFromPoint(e.clientX, e.clientY).forEach(node => { const item = node.closest('.ppt-free-obj, .card-inline-media, .ppt-chart-widget, .card-embedded-obj, .card-inner-textbox, .sub-box, .slide-card, .slide-header-bar'); if (item && !candidates.includes(item) && item.getAttribute('data-layer-locked') !== 'true') candidates.push(item); });
      if (candidates.length > 1) { const curIdx = selectedElement ? candidates.indexOf(selectedElement) : -1, nextTarget = candidates[(curIdx + 1) % candidates.length]; if (nextTarget && nextTarget !== selectedElement) { e.preventDefault(); selectElementForInspector(nextTarget, false); return; } }
    }
    const isShift = e.shiftKey;

    const editable = e.target.closest('[data-editable]');
    if (editable) {
      lastFocusedEditable = editable;
      if (isFormatPainterActive) {
        e.preventDefault();
        applyCopiedFormatTo(editable);
        return;
      }
      setTimeout(() => syncToolbarWithTarget(editable), 0);
    }

    const freeObj = e.target.closest('.ppt-free-obj');
    const isFreeCardContainer = Boolean(freeObj && (freeObj.classList.contains('slide-card') || freeObj.getAttribute('data-shape-type') === 'freeCard'));
    const freeCardInnerHit = (isFreeCardContainer && e.target !== freeObj && !e.altKey)
      ? e.target.closest('.card-inline-media, .ppt-chart-widget, .card-embedded-obj, .card-inner-textbox, .sub-box, .image-slot-box, h1, h2, h3, h4, p, blockquote, ul, li, a, span[data-editable], div[data-editable]')
      : null;
    if (freeObj && !(freeCardInnerHit && freeObj.contains(freeCardInnerHit) && freeCardInnerHit !== freeObj)) {
      if (isPickingTriggerTarget) {
        completePickTriggerTarget(freeObj);
        return;
      }
      if (isShift) {
        e.preventDefault();
        selectElementForInspector(freeObj, true);
        return;
      }
      const grpId = freeObj.getAttribute('data-group-id');
      if (isolatedGroupId && grpId !== isolatedGroupId) isolatedGroupId = null;
      if (grpId && isolatedGroupId !== grpId) { const members = Array.from(document.querySelectorAll(`.slide.active [data-group-id="${grpId}"]`)); selectedElements = members; selectedElement = freeObj; syncMultiSelectVisuals(); positionSelectionOverlay(); }
      else if (!selectedElements.includes(freeObj) || isolatedGroupId === grpId) selectElementForInspector(freeObj, false);
      else selectedElement = freeObj;

      if (!e.target.isContentEditable || e.altKey) {
        const slideEl = slides[currentSlide - 1];
        const sRect = slideEl.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const dragTargets = selectedElements.length > 1 ? selectedElements.filter(el => el.classList.contains('ppt-free-obj')) : [freeObj];
        const initGroupRect = getSelectionGroupRect() || freeObj.getBoundingClientRect();
        const initCoords = dragTargets.map(el => ({
          el,
          initL: parseFloat(el.style.left) || 0,
          initT: parseFloat(el.style.top) || 0
        }));
        let moved = false;

        const onMove = (me) => {
          if (Math.abs(me.clientX - startX) > 3 || Math.abs(me.clientY - startY) > 3) moved = true;
          if (!moved) return;
          const { dx: rawDxPx, dy: rawDyPx, lockedAxis } = applyShiftAxisLock(me.clientX - startX, me.clientY - startY, me.shiftKey);
          const { snappedLeftPx, snappedTopPx } = computeAndRenderSmartGuides(
            dragTargets,
            initGroupRect.left + rawDxPx,
            initGroupRect.top + rawDyPx,
            initGroupRect.width,
            initGroupRect.height,
            slideEl,
            lockedAxis
          );
          const finalDxPct = ((snappedLeftPx - initGroupRect.left) / sRect.width) * 100;
          const finalDyPct = ((snappedTopPx - initGroupRect.top) / sRect.height) * 100;
          const minBound = (typeof isPasteboardModeEnabled !== 'undefined' && isPasteboardModeEnabled) ? -45 : -15, maxBound = (typeof isPasteboardModeEnabled !== 'undefined' && isPasteboardModeEnabled) ? 130 : 94;
          initCoords.forEach(item => { item.el.style.left = Math.max(minBound, Math.min(maxBound, item.initL + finalDxPct)).toFixed(2) + '%'; item.el.style.top = Math.max(minBound, Math.min(maxBound, item.initT + finalDyPct)).toFixed(2) + '%'; });
          if (typeof updateSlideConnectors === 'function') updateSlideConnectors(slideEl);
          positionSelectionOverlay();
          syncInspectorGeometry(freeObj);
        };
        const onUp = () => {
          clearSmartGuides();
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          if (moved) saveHistorySnapshot();
        };
        startManagedDragSession(document, onMove, onUp);
      }
      return;
    }

    const card = e.target.closest('.slide-card, .ppt-free-obj[data-shape-type="freeCard"]');

    const bindDirectCardChildDrag = (childEl) => {
      if (isShift || !childEl || childEl.getAttribute('data-layer-locked') === 'true') return;
      if (e.target.isContentEditable && !e.altKey && e.target !== childEl) return;
      const slideEl = slides[currentSlide - 1];
      const startX = e.clientX;
      const startY = e.clientY;
      const initOffX = parseFloat(childEl.getAttribute('data-offset-x') || '0') || 0;
      const initOffY = parseFloat(childEl.getAttribute('data-offset-y') || '0') || 0;
      const initRect = childEl.getBoundingClientRect();
      let moved = false;

      const onChildMove = (me) => {
        if (Math.abs(me.clientX - startX) > 3 || Math.abs(me.clientY - startY) > 3) moved = true;
        if (!moved) return;
        const scale = getStageScale();
        const { dx: rawDx, dy: rawDy, lockedAxis } = applyShiftAxisLock(me.clientX - startX, me.clientY - startY, me.shiftKey);
        const { snappedLeftPx, snappedTopPx } = computeAndRenderSmartGuides(
          [childEl],
          initRect.left + rawDx,
          initRect.top + rawDy,
          initRect.width,
          initRect.height,
          slideEl,
          lockedAxis
        );
        applyTextOffsetXY(
          childEl,
          Math.round(initOffX + (snappedLeftPx - initRect.left) / scale),
          Math.round(initOffY + (snappedTopPx - initRect.top) / scale)
        );
      };
      const onChildUp = () => {
        clearSmartGuides();
        document.removeEventListener('mousemove', onChildMove);
        document.removeEventListener('mouseup', onChildUp);
        if (moved) saveHistorySnapshot();
      };
      startManagedDragSession(document, onChildMove, onChildUp);
    };

    const inlineMedia = e.target.closest('.card-inline-media');
    if (inlineMedia) {
      if (isPickingTriggerTarget) { completePickTriggerTarget(inlineMedia); return; }
      selectElementForInspector(inlineMedia, isShift);
      bindDirectCardChildDrag(inlineMedia);
      return;
    }
    const chartWidget = e.target.closest('.ppt-chart-widget');
    if (chartWidget && !chartWidget.closest('.ppt-free-obj')) {
      if (isPickingTriggerTarget) { completePickTriggerTarget(chartWidget); return; }
      selectElementForInspector(chartWidget, isShift);
      bindDirectCardChildDrag(chartWidget);
      return;
    }
    const cardEmbedded = e.target.closest('.card-embedded-obj');
    if (cardEmbedded) {
      if (isPickingTriggerTarget) { completePickTriggerTarget(cardEmbedded); return; }
      selectElementForInspector(cardEmbedded, isShift);
      bindDirectCardChildDrag(cardEmbedded);
      return;
    }
    const cardTextBox = e.target.closest('.card-inner-textbox');
    if (cardTextBox) {
      if (isPickingTriggerTarget) { completePickTriggerTarget(cardTextBox); return; }
      selectElementForInspector(cardTextBox, isShift);
      bindDirectCardChildDrag(cardTextBox);
      return;
    }
    const subBox = e.target.closest('.sub-box');
    if (subBox) {
      if (isPickingTriggerTarget) { completePickTriggerTarget(subBox); return; }
      selectElementForInspector(subBox, isShift);
      bindDirectCardChildDrag(subBox);
      return;
    }
    const tier = e.target.closest('.hierarchy-tier');
    if (tier && e.target === tier) {
      if (isPickingTriggerTarget) { completePickTriggerTarget(tier); return; }
      selectElementForInspector(tier, isShift);
      return;
    }
    const imgSlot = e.target.closest('.image-slot-box');
    if (imgSlot) {
      if (isPickingTriggerTarget) {
        completePickTriggerTarget(imgSlot);
        return;
      }
      selectElementForInspector(imgSlot, isShift);
      return;
    }

    // Match ANY meaningful existing element inside a card (headings, paragraphs, lists, badges, metadata rows, leaf divs)
    let innerTextEl = e.target.closest('h1, h2, h3, h4, p, blockquote, ul, li, a, span[data-editable], div[data-editable]');
    if (!innerTextEl && card && e.target !== card) {
      const candidateBlock = e.target.closest('div, span');
      if (candidateBlock && card.contains(candidateBlock) && candidateBlock !== card &&
          !candidateBlock.classList.contains('card-bg-layer') &&
          !candidateBlock.classList.contains('card-hover-bg-layer') &&
          !candidateBlock.classList.contains('card-bg-tint') &&
          !candidateBlock.classList.contains('card-edit-controls') &&
          !candidateBlock.classList.contains('sub-box-group')) {
        innerTextEl = candidateBlock;
      }
    }
    if (innerTextEl && (innerTextEl.classList.contains('fx-text-span') || innerTextEl.classList.contains('kw') || innerTextEl.classList.contains('hl-mark') || innerTextEl.classList.contains('text-pill-span'))) {
      innerTextEl = innerTextEl.closest('h1, h2, h3, h4, p, blockquote, li, div[data-editable]') || innerTextEl.parentElement;
    }

    if (isPickingTriggerTarget && (innerTextEl || card)) {
      completePickTriggerTarget(innerTextEl || card);
      return;
    }

    if (innerTextEl && card && innerTextEl !== card) {
      if (selectedElement !== innerTextEl || isShift) {
        selectElementForInspector(innerTextEl, isShift);
      }
      if (e.altKey) {
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const initOffX = parseFloat(innerTextEl.getAttribute('data-offset-x') || '0') || 0;
        const initOffY = parseFloat(innerTextEl.getAttribute('data-offset-y') || '0') || 0;
        const onAltMove = (me) => {
          const scale = getStageScale();
          const { dx, dy } = applyShiftAxisLock(me.clientX - startX, me.clientY - startY, me.shiftKey);
          applyTextOffsetXY(innerTextEl, Math.round(initOffX + dx / scale), Math.round(initOffY + dy / scale));
        };
        const onAltUp = () => {
          document.removeEventListener('mousemove', onAltMove);
          document.removeEventListener('mouseup', onAltUp);
          saveHistorySnapshot();
        };
        startManagedDragSession(document, onAltMove, onAltUp);
      }
      return;
    }

    if (card) {
      selectElementForInspector(card, isShift);
      return;
    }

    const headerBar = e.target.closest('.slide-header-bar');
    if (headerBar) {
      const innerHeaderText = e.target.closest('h1, h2, h3, h4, p, span[data-editable], div[data-editable]');
      if (isPickingTriggerTarget) {
        completePickTriggerTarget(innerHeaderText || headerBar);
        return;
      }
      if (innerHeaderText && innerHeaderText !== headerBar && headerBar.contains(innerHeaderText)) {
        selectElementForInspector(innerHeaderText, isShift);
        return;
      }
      selectElementForInspector(headerBar, isShift);
      return;
    }

    // Empty slide space drag -> Rubber-band Marquee Selection
    if (marqueeBox) {
      const startX = e.clientX;
      const startY = e.clientY;
      let isMarqueeDragging = false;

      const onMarqueeMove = (me) => {
        if (Math.abs(me.clientX - startX) > 6 || Math.abs(me.clientY - startY) > 6) {
          isMarqueeDragging = true;
        }
        if (!isMarqueeDragging) return;
        const left = Math.min(startX, me.clientX);
        const top = Math.min(startY, me.clientY);
        const width = Math.abs(me.clientX - startX);
        const height = Math.abs(me.clientY - startY);
        marqueeBox.style.left = left + 'px';
        marqueeBox.style.top = top + 'px';
        marqueeBox.style.width = width + 'px';
        marqueeBox.style.height = height + 'px';
        marqueeBox.style.display = 'block';
      };

      const onMarqueeUp = (me) => {
        document.removeEventListener('mousemove', onMarqueeMove);
        document.removeEventListener('mouseup', onMarqueeUp);
        marqueeBox.style.display = 'none';
        if (!me || typeof me.clientX !== 'number' || typeof me.clientY !== 'number') return;
        if (!isMarqueeDragging) {
          if (!isShift) clearSelectionInspector();
          return;
        }
        const mLeft = Math.min(startX, me.clientX);
        const mTop = Math.min(startY, me.clientY);
        const mRight = Math.max(startX, me.clientX);
        const mBottom = Math.max(startY, me.clientY);

        const activeSlideEl = slides[currentSlide - 1];
        if (!activeSlideEl) return;
        const candidates = Array.from(activeSlideEl.querySelectorAll('.ppt-free-obj, .slide-card'));
        const matched = candidates.filter(el => {
          if (el.getAttribute('data-layer-locked') === 'true' || el.getAttribute('data-layer-hidden') === 'true') return false;
          if (el.style.display === 'none' || el.style.visibility === 'hidden') return false;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return false;
          return !(r.right < mLeft || r.left > mRight || r.bottom < mTop || r.top > mBottom);
        });
        if (matched.length > 0) {
          selectedElements = isShift ? Array.from(new Set([...selectedElements, ...matched])) : matched;
          selectedElement = selectedElements[selectedElements.length - 1];
          syncMultiSelectVisuals();
          positionSelectionOverlay();
          if (typeof updateContextualTopBar === 'function') updateContextualTopBar(selectedElement);
          showToast(`${selectedElements.length}개 요소가 다중 선택되었습니다. 모서리 핸들로 그룹 비례 확대·축소가 가능합니다.`);
        }
      };

      startManagedDragSession(document, onMarqueeMove, onMarqueeUp);
    }
  });
}

function bindKeyboardAndTouchListeners() {
  document.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    const isFormInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT' || activeEl.tagName === 'TEXTAREA');
    const isContentEd = activeEl && activeEl.isContentEditable;
    const isTyping = Boolean(isFormInput || isContentEd);
    const keyLow = (e.key || '').toLowerCase();
    const code = e.code || '';
    const isKey = (ch, codeName) => keyLow === ch || code === codeName;
    const mod = e.ctrlKey || e.metaKey;

    const __anyModalNow = ['saveChoiceModal','floatingCardEditorModal','findReplaceModal','overflowAuditModal','slideCommentsModal','slideSorterModal','reuseSlidesModal','starterTemplateModal','shortcutsHelpModal','onboardingGuideModal','tocModal'].some(mid => { const mEl = document.getElementById(mid); return mEl && !mEl.classList.contains('hidden'); });
    if (!__anyModalNow && e.altKey && isKey('p', 'KeyP') && isEditMode && typeof toggleInteractiveTestMode === 'function') {
      e.preventDefault();
      toggleInteractiveTestMode();
      return;
    }
    if (e.altKey && isKey('h', 'KeyH')) {
      e.preventDefault();
      if (typeof toggleFocusMode === 'function') toggleFocusMode();
      return;
    }

    if (!__anyModalNow && ((e.altKey && isKey('e', 'KeyE')) || (mod && e.shiftKey && isKey('e', 'KeyE')))) {
      if (typeof toggleEditMode === 'function' && document.body.getAttribute('data-presentation-only') !== 'true') {
        e.preventDefault();
        toggleEditMode();
      }
      return;
    }

    // Strict Modal Keyboard Isolation: prevent slide/element shortcuts from bleeding behind open dialogs
    const fcModal = document.getElementById('floatingCardEditorModal');
    const isFcOpen = Boolean(fcModal && !fcModal.classList.contains('hidden'));
    const openDialogIds = [
      'saveChoiceModal', 'findReplaceModal', 'overflowAuditModal',
      'slideCommentsModal', 'slideSorterModal', 'reuseSlidesModal', 'starterTemplateModal',
      'shortcutsHelpModal', 'onboardingGuideModal', 'tocModal'
    ];
    const hasAnyOpenModal = openDialogIds.some(mid => {
      const mEl = document.getElementById(mid);
      return mEl && !mEl.classList.contains('hidden');
    });

    const isFcFocused = (typeof isFloatingCardCanvasActive === 'function') ? isFloatingCardCanvasActive() : isFcOpen;
    if (isFcFocused && mod && !isFormInput) {
      if (isKey('z', 'KeyZ') && !e.shiftKey) {
        e.preventDefault();
        if (typeof fcUndoAction === 'function') fcUndoAction();
        return;
      }
      if (isKey('y', 'KeyY') || (isKey('z', 'KeyZ') && e.shiftKey)) {
        e.preventDefault();
        if (typeof fcRedoAction === 'function') fcRedoAction();
        return;
      }
      if (isKey('a', 'KeyA') && !isContentEd) {
        e.preventDefault();
        const fcEd = typeof getActiveFcPreviewCanvas === 'function' ? getActiveFcPreviewCanvas() : null;
        if (fcEd) {
          const fcItems = Array.from(fcEd.children).filter(el => el.nodeType === 1 && el.style.display !== 'none' && el.style.visibility !== 'hidden');
          if (fcItems.length > 0) {
            selectedElements = fcItems;
            selectedElement = fcItems[fcItems.length - 1];
            syncMultiSelectVisuals();
            positionSelectionOverlay();
            showToast(`플로팅 카드 내부 요소 ${fcItems.length}개 전체 선택됨`);
          }
        }
        return;
      }
    }
    if (isFcFocused && !isTyping && (e.key === 'Delete' || e.key === 'Backspace')) {
      const fcEd = typeof getActiveFcPreviewCanvas === 'function' ? getActiveFcPreviewCanvas() : null;
      if (fcEd && selectedElement && fcEd.contains(selectedElement) && typeof deleteSelectedElement === 'function') {
        e.preventDefault();
        deleteSelectedElement();
        return;
      }
      if (typeof activeFcInnerBlock !== 'undefined' && activeFcInnerBlock && typeof deleteActiveFcInnerBlock === 'function') {
        e.preventDefault();
        deleteActiveFcInnerBlock();
        return;
      }
    }
    if (hasAnyOpenModal && e.key !== 'Escape') {
      // Allow Ctrl+F/H only when Find/Replace modal itself is open
      if (!(mod && (isKey('f', 'KeyF') || isKey('h', 'KeyH')))) return;
    }

    if (mod && isKey('s', 'KeyS')) {
      e.preventDefault();
      if (isContentEd && activeEl && typeof activeEl.blur === 'function') activeEl.blur();
      if (typeof flushDeferredHistoryNow === 'function') flushDeferredHistoryNow();
      if (typeof saveNativeFileOrQuickSave === 'function') saveNativeFileOrQuickSave(Boolean(e.shiftKey));
      else if (typeof saveCurrentProjectToWorkspace === 'function') saveCurrentProjectToWorkspace(true);
      return;
    }
    if (mod && isKey('o', 'KeyO')) {
      e.preventDefault();
      if (typeof openNativeProjectFile === 'function') openNativeProjectFile();
      else if (typeof triggerImportProjectFile === 'function') triggerImportProjectFile();
      return;
    }
    if (mod && (isKey('f', 'KeyF') || isKey('h', 'KeyH'))) { e.preventDefault(); if (typeof openFindReplaceModal === 'function') openFindReplaceModal(isKey('h', 'KeyH')); return; }
    if (e.key === 'F4' && isActiveEditing() && !isFormInput) { e.preventDefault(); if (typeof repeatLastAction === 'function') repeatLastAction(); return; }
    if (mod && isActiveEditing() && !isFormInput) {
      if (isKey('z', 'KeyZ') && !e.shiftKey) { e.preventDefault(); if (typeof flushDeferredHistoryNow === 'function') flushDeferredHistoryNow(); if (isContentEd) saveHistorySnapshot('텍스트 입력'); undoAction(); return; }
      if (isKey('y', 'KeyY') || (isKey('z', 'KeyZ') && e.shiftKey)) { e.preventDefault(); if (typeof flushDeferredHistoryNow === 'function') flushDeferredHistoryNow(); redoAction(); return; }
    }

    // Unified Element Copy / Paste / Duplicate / Select-All in Edit Mode
    const sel = window.getSelection();
    const hasHighlightedText = Boolean(sel && !sel.isCollapsed && sel.toString().length > 0);

    if (isActiveEditing() && !isFormInput && mod) {
      if (isKey('c', 'KeyC')) {
        if (hasHighlightedText) {
          // User explicitly copied plain text inside contenteditable: clear internal element clipboard so Ctrl+V pastes text
          window.__pptElementClipboard = [];
          window.__pptInternalClipboardPlain = '';
          try { localStorage.removeItem('ppt_studio_shared_clipboard_v1'); } catch (err) {}
          return;
        }
        if ((selectedElements.length > 0 || selectedElement) && typeof copySelectedElements === 'function') {
          e.preventDefault();
          if (isContentEd) activeEl.blur();
          copySelectedElements();
          return;
        }
      }
      if (isKey('v', 'KeyV')) {
        // Let native paste event fire first so external clipboard images/text are prioritized; fallback if synthetic keydown
        window.__pptAwaitingNativePaste = true;
        setTimeout(() => {
          if (window.__pptAwaitingNativePaste) {
            window.__pptAwaitingNativePaste = false;
            if (typeof pasteCopiedElements === 'function') {
              if (isContentEd && document.activeElement) document.activeElement.blur();
              pasteCopiedElements(true);
            }
          }
        }, 45);
        return;
      }
      if (isKey('d', 'KeyD') && !isContentEd && (selectedElements.length > 0 || selectedElement)) {
        e.preventDefault();
        duplicateSelectedElement();
        return;
      }
      if (isKey('a', 'KeyA') && !isContentEd) {
        e.preventDefault();
        if (typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive()) {
          const fcEd = typeof getActiveFcPreviewCanvas === 'function' ? getActiveFcPreviewCanvas() : null;
          if (fcEd) {
            const fcItems = Array.from(fcEd.children).filter(el => el.nodeType === 1 && el.style.display !== 'none' && el.style.visibility !== 'hidden');
            if (fcItems.length > 0) {
              selectedElements = fcItems;
              selectedElement = fcItems[fcItems.length - 1];
              syncMultiSelectVisuals();
              positionSelectionOverlay();
              showToast(`플로팅 카드 내부 요소 ${fcItems.length}개 전체 선택됨`);
            }
          }
          return;
        }
        if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
        const activeSlideEl = slides[currentSlide - 1];
        if (activeSlideEl) {
          const allItems = Array.from(activeSlideEl.querySelectorAll('.ppt-free-obj, .slide-card')).filter(el => {
            if (el.getAttribute('data-layer-locked') === 'true' || el.getAttribute('data-layer-hidden') === 'true') return false;
            if (el.style.display === 'none' || el.style.visibility === 'hidden') return false;
            const gb = el.closest('.slide-grid-body');
            if (gb && gb.style.display === 'none') return false;
            return true;
          });
          if (allItems.length > 0) {
            selectedElements = allItems;
            selectedElement = allItems[allItems.length - 1];
            syncMultiSelectVisuals();
            positionSelectionOverlay();
            if (typeof updateContextualTopBar === 'function') updateContextualTopBar(selectedElement);
            showToast(`현재 슬라이드의 ${allItems.length}개 요소 전체 선택됨`);
          }
        }
        return;
      }
    }

    if (!isTyping && e.code === 'Space' && !mod && !e.altKey) {
      const fcLb = document.getElementById('floatingCardLightbox');
      if ((!fcLb || !fcLb.classList.contains('open')) && isActiveEditing()) { e.preventDefault(); isSpacePanningMode = true; document.body.classList.add('space-pan-ready'); return; }
    }
    if (isActiveEditing() && !isTyping) {
      if (e.key === 'Tab' && !mod && !e.altKey) { e.preventDefault(); cycleSlideElementSelection(e.shiftKey ? -1 : 1); return; }
      if (isKey('t', 'KeyT') && !mod && !e.altKey && !e.shiftKey) { e.preventDefault(); insertFreeTextboxAtClientPoint(); return; }
      if ((selectedElements.length > 0 || selectedElement)) {
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelectedElement(); return; }
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); const step = mod ? 1 : (e.shiftKey ? 10 : 2); nudgeSelectedPosition(e.key === 'ArrowLeft' ? -step : (e.key === 'ArrowRight' ? step : 0), e.key === 'ArrowUp' ? -step : (e.key === 'ArrowDown' ? step : 0)); return; }
      }
    }
    if (isTyping) {
      if (e.key === 'Escape') {
      if (typeof abortActiveDragSession === 'function') abortActiveDragSession(); activeEl.blur(); return; }
      if (isContentEd && e.key === 'Tab' && !mod && !e.isComposing) { if (typeof adjustListIndent === 'function') { e.preventDefault(); adjustListIndent(e.shiftKey ? -1 : 1); return; } }
      if (isContentEd && e.key === 'Enter' && !mod && !e.isComposing) {
        if (activeEl.closest('.iw-tab-btn')) { e.preventDefault(); activeEl.blur(); return; }
        const listParent = activeEl.closest('ul, ol'), liItem = activeEl.closest('li');
        if (!listParent || !liItem) {
          e.preventDefault();
          insertCleanLineBreakInEditable(activeEl);
          const freeTextObj = activeEl.closest('.ppt-free-obj[data-shape-type="textbox"]');
          if (freeTextObj && freeTextObj.parentElement) {
            const stScale = typeof getStageScale === 'function' ? getStageScale() : 1;
            const layerH = Math.max(1, freeTextObj.parentElement.getBoundingClientRect().height / stScale);
            if (freeTextObj.scrollHeight > freeTextObj.clientHeight) {
              const nextPct = Math.min(90, ((freeTextObj.scrollHeight + 12) / layerH) * 100);
              freeTextObj.style.height = nextPct.toFixed(2) + '%';
            }
          }
          const embObj = activeEl.closest('.card-embedded-obj');
          if (embObj && embObj.scrollHeight > embObj.clientHeight) {
            embObj.style.height = (embObj.scrollHeight + 10) + 'px';
          }
          positionSelectionOverlay();
          markUnsavedChanges();
          return;
        }
      }
      return;
    }

    // Close Floating Card Lightbox with Enter, Space, or Escape when open
    const fcLightbox = document.getElementById('floatingCardLightbox');
    if (fcLightbox && fcLightbox.classList.contains('open')) {
      if (e.key === 'ArrowRight' && typeof switchFloatingCardLightboxIndex === 'function' && typeof __activeLightboxCardIds !== 'undefined' && __activeLightboxCardIds.length > 1) {
        e.preventDefault();
        e.stopPropagation();
        switchFloatingCardLightboxIndex(__activeLightboxCardIdx + 1);
      } else if (e.key === 'ArrowLeft' && typeof switchFloatingCardLightboxIndex === 'function' && typeof __activeLightboxCardIds !== 'undefined' && __activeLightboxCardIds.length > 1) {
        e.preventDefault();
        e.stopPropagation();
        switchFloatingCardLightboxIndex(__activeLightboxCardIdx - 1);
      } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (typeof closeFloatingCardLightbox === 'function') closeFloatingCardLightbox();
      }
      return;
    }

    // When Floating Card Preview Panel is active (not typing), block background slide navigation & mode-exit keys (allow Escape!)
    if (isFcFocused && !mod && e.key !== 'Escape') {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageUp' || e.key === 'PageDown' || isKey('e', 'KeyE') || isKey('h', 'KeyH') || isKey('m', 'KeyM') || isKey('f', 'KeyF')) {
        return;
      }
    }

    // Core Keyword Highlight Shortcut: [H] or [Alt+H] (supports Korean IME via e.code)
    if (isKey('h', 'KeyH') && !mod) {
      e.preventDefault();
      if (typeof toggleFocusMode === 'function') toggleFocusMode();
      return;
    }

    if (isKey('e', 'KeyE') && !mod) {
      if (typeof toggleEditMode === 'function' && document.body.getAttribute('data-presentation-only') !== 'true') {
        e.preventDefault();
        toggleEditMode();
      }
      return;
    }

    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      e.preventDefault();
      nextSlide();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      prevSlide();
    } else if (isKey('m', 'KeyM') && !mod) {
      toggleTocModal();
    } else if ((e.key === '?' || (e.shiftKey && code === 'Slash')) && !mod) {
      e.preventDefault();
      if (typeof toggleShortcutsHelpModal === 'function') toggleShortcutsHelpModal();
    } else if (isKey('f', 'KeyF') && !mod) { toggleFullScreen(); }
    else if (!isActiveEditing() && isKey('b', 'KeyB') && !mod) { e.preventDefault(); if (typeof toggleScreenBlackout === 'function') toggleScreenBlackout('black'); }
    else if (!isActiveEditing() && isKey('w', 'KeyW') && !mod) { e.preventDefault(); if (typeof toggleScreenBlackout === 'function') toggleScreenBlackout('white'); }
    else if (!isActiveEditing() && isKey('l', 'KeyL') && !mod) { e.preventDefault(); if (typeof toggleLaserPointer === 'function') toggleLaserPointer(); }
    else if (!isActiveEditing() && isKey('p', 'KeyP') && !mod) { e.preventDefault(); if (typeof toggleScreenDrawMode === 'function') toggleScreenDrawMode(); }
    else if (!isActiveEditing() && isKey('c', 'KeyC') && !mod) { if (typeof clearScreenDrawing === 'function') clearScreenDrawing(false); }
    else if (!isEditMode && isKey('v', 'KeyV') && !mod) { e.preventDefault(); if (typeof openPresenterViewWindow === 'function') openPresenterViewWindow(); }
    else if (e.key === 'Escape') {
      if (typeof activeScreenBlackoutMode !== 'undefined' && activeScreenBlackoutMode && typeof toggleScreenBlackout === 'function') { toggleScreenBlackout(activeScreenBlackoutMode); return; }
      if (typeof isScreenDrawMode !== 'undefined' && isScreenDrawMode && typeof toggleScreenDrawMode === 'function') { toggleScreenDrawMode(false); return; }
      if (typeof isLaserPointerEnabled !== 'undefined' && isLaserPointerEnabled && typeof toggleLaserPointer === 'function') { toggleLaserPointer(false); return; }
      if (typeof isFormatPainterActive !== 'undefined' && isFormatPainterActive) { isFormatPainterActive = false; if (typeof updateFormatPainterUI === 'function') updateFormatPainterUI(); showToast('서식 복사 모드가 취소되었습니다.'); return; }
      if (isolatedGroupId) { isolatedGroupId = null; clearSelectionInspector(); return; }
      if (typeof isPickingConnectorMode !== 'undefined' && isPickingConnectorMode && typeof cancelConnectorLinkMode === 'function') { cancelConnectorLinkMode(); return; }
      if (isPickingTriggerTarget) {
        isPickingTriggerTarget = false;
        triggerSourceBtnEl = null;
        const pickBtn = $studio('pickTriggerTargetBtn');
        if (pickBtn) pickBtn.textContent = '🎯 슬라이드에서 대상 클릭 지정';
        showToast('대상 클릭 지정 모드가 취소되었습니다.');
        return;
      }
      if (typeof closeFloatingCardLightbox === 'function') closeFloatingCardLightbox();
      const openModalClosers = [
        ['saveChoiceModal', () => typeof closeSaveModal === 'function' && closeSaveModal()],
        ['floatingCardEditorModal', () => typeof closeFloatingCardEditor === 'function' && closeFloatingCardEditor()],
        ['findReplaceModal', () => typeof closeFindReplaceModal === 'function' && closeFindReplaceModal()],
        ['overflowAuditModal', () => typeof closeOverflowAuditModal === 'function' && closeOverflowAuditModal()],
        ['slideCommentsModal', () => typeof closeSlideCommentsPanel === 'function' && closeSlideCommentsPanel()],
        ['slideSorterModal', () => typeof closeSlideSorterModal === 'function' && closeSlideSorterModal()],
        ['reuseSlidesModal', () => typeof closeReuseSlidesModal === 'function' && closeReuseSlidesModal()],
        ['starterTemplateModal', () => typeof closeStarterTemplateModal === 'function' && closeStarterTemplateModal()],
        ['shortcutsHelpModal', () => typeof toggleShortcutsHelpModal === 'function' && toggleShortcutsHelpModal()],
        ['onboardingGuideModal', () => typeof closeOnboardingGuide === 'function' && closeOnboardingGuide(false)],
        ['tocModal', () => typeof toggleTocModal === 'function' && toggleTocModal()]
      ];
      for (let mi = 0; mi < openModalClosers.length; mi++) {
        const mEl = document.getElementById(openModalClosers[mi][0]);
        if (mEl && !mEl.classList.contains('hidden')) {
          openModalClosers[mi][1]();
          return;
        }
      }
      if (isInteractiveTestMode && typeof toggleInteractiveTestMode === 'function') {
        toggleInteractiveTestMode(false);
        return;
      }
      if (selectedElement || (selectedElements && selectedElements.length > 0)) {
        clearSelectionInspector();
        return;
      }
      if (isEditMode && typeof toggleEditMode === 'function') {
        toggleEditMode(false);
      }
    }
  });

  // Smartpad / Touch Progress Bar Scrubbing
  const progressBarEl = document.getElementById('progressBarContainer');
  if (progressBarEl && !progressBarEl.dataset.touchScrubBound) {
    progressBarEl.dataset.touchScrubBound = 'true';
    progressBarEl.style.touchAction = 'none';
    const scrubFromTouchX = (tx) => {
      const track = progressBarEl.querySelector('div') || progressBarEl;
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return;
      const ratio = Math.max(0, Math.min(0.9999, (tx - rect.left) / rect.width));
      const targetPage = Math.max(1, Math.min(totalSlides, Math.floor(ratio * totalSlides) + 1));
      if (targetPage !== currentSlide && typeof goToSlide === 'function') goToSlide(targetPage);
    };
    progressBarEl.addEventListener('touchstart', (te) => {
      if (!te.touches[0]) return;
      te.preventDefault();
      scrubFromTouchX(te.touches[0].clientX);
    }, { passive: false });
    progressBarEl.addEventListener('touchmove', (te) => {
      if (!te.touches[0]) return;
      te.preventDefault();
      scrubFromTouchX(te.touches[0].clientX);
    }, { passive: false });
  }

  // Smartpad / Mobile Horizontal Swipe inside Paged Floating Card Lightbox (1/N)
  const fcLbSwipe = document.getElementById('floatingCardLightbox');
  if (fcLbSwipe && !fcLbSwipe.dataset.touchSwipeBound) {
    fcLbSwipe.dataset.touchSwipeBound = 'true';
    let fcTouchStartX = 0, fcTouchStartY = 0, fcIgnoreSwipe = true;
    fcLbSwipe.addEventListener('touchstart', (te) => {
      const tgt = te.target && te.target.nodeType === 1 ? te.target : null;
      fcIgnoreSwipe = !te.changedTouches[0] || Boolean(tgt && tgt.closest('.iw-ba-stage, .ppt-interactive-widget, input, textarea, select'));
      if (!fcIgnoreSwipe) {
        fcTouchStartX = te.changedTouches[0].screenX;
        fcTouchStartY = te.changedTouches[0].screenY;
      }
    }, { passive: true });
    fcLbSwipe.addEventListener('touchend', (te) => {
      if (fcIgnoreSwipe || !te.changedTouches[0] || !fcLbSwipe.classList.contains('open')) return;
      if (typeof __activeLightboxDisplayMode === 'undefined' || __activeLightboxDisplayMode !== 'paged' || !Array.isArray(__activeLightboxCardIds) || __activeLightboxCardIds.length <= 1) return;
      const dx = fcTouchStartX - te.changedTouches[0].screenX;
      const dy = Math.abs(fcTouchStartY - te.changedTouches[0].screenY);
      if (Math.abs(dx) > 55 && Math.abs(dx) > dy * 1.4 && typeof switchFloatingCardLightboxIndex === 'function') {
        switchFloatingCardLightboxIndex(__activeLightboxCardIdx + (dx > 0 ? 1 : -1));
      }
    }, { passive: true });
  }

  let __ignoreSwipeGesture = false;
  document.addEventListener('touchstart', (e) => {
    const tgt = e.target && e.target.nodeType === 1 ? e.target : null;
    __ignoreSwipeGesture = Boolean(tgt && tgt.closest('.iw-ba-stage, #floatingCardLightbox.open, #pptDrawCanvas, #progressBarContainer, .ppt-interactive-widget, input, textarea, select'));
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (__ignoreSwipeGesture || isActiveEditing()) { __ignoreSwipeGesture = false; return; }
    const touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
  }, { passive: true });
}

function init() {
  ensureFreeLayersOnAllSlides();
  document.querySelectorAll('.slide-card').forEach(c => {
    if (!c.hasAttribute('data-hover-init')) {
      c.setAttribute('data-hover-init', 'true');
      c.classList.add('hover-reactive');
    }
  });
  initVideoErrorFallbacks(document);
  if (typeof hydrateYouTubeEmbedsForProtocol === 'function') hydrateYouTubeEmbedsForProtocol(document);
  if (typeof bindHistoryCoalesceListeners === 'function') bindHistoryCoalesceListeners(document);
  initStorageListeners();
  if (typeof initPwaAndNativeFileSystem === 'function') initPwaAndNativeFileSystem();
  initMediaListeners();
  initBgUploaderListener();
  if (typeof initStudioDockModePreference === 'function') initStudioDockModePreference();
  if (typeof initUiLanguagePreference === 'function') initUiLanguagePreference();
  if (typeof bindStudioPopupDrag === 'function') bindStudioPopupDrag();
  bindGlobalEditorListeners();
  bindKeyboardAndTouchListeners();
  if (typeof initTouchPointerBridge === 'function') initTouchPointerBridge();
  if (typeof initOfflineRuntimeUtilityObserver === 'function') initOfflineRuntimeUtilityObserver();
  if (typeof initWorkspaceProjectsStore === 'function') initWorkspaceProjectsStore();
  renderSavedProjectsList();
  const savedRatio = (document.getElementById('slideStage') && document.getElementById('slideStage').getAttribute('data-aspect-ratio')) || (document.body && document.body.getAttribute('data-aspect-ratio'));
  if (savedRatio && ['16:9', '4:3', '9:16'].includes(savedRatio) && typeof setDeckAspectRatio === 'function') {
    setDeckAspectRatio(savedRatio, true);
  } else {
    updateStageViewportScale();
  }
  if (!isEditMode && slides[0] && typeof initSlideBuildSteps === 'function') initSlideBuildSteps(slides[0]);
  updateSlideUI();
  const initStageEl = document.getElementById('slideStage');
  if (initStageEl) initialDeckStageHtml = initStageEl.innerHTML;
  if (typeof renderRecentColorsSwatches === 'function') renderRecentColorsSwatches();
  if (typeof previewAndApplyGradient === 'function') { const bar = document.getElementById('gradPreviewBar'); if (bar && typeof buildGradientCssString === 'function') { bar.style.background = buildGradientCssString(); } }
  saveHistorySnapshot('초기 상태');
  isInitialSnapshotDone = true;
  hasUnsavedChanges = false;
  if (document.body.getAttribute('data-presentation-only') !== 'true') {
    checkAndPromptAutoSaveRecovery();
    if (typeof maybeShowOnboardingGuide === 'function') {
      maybeShowOnboardingGuide();
    }
    if (window.__pptAutoSaveIntervalId) clearInterval(window.__pptAutoSaveIntervalId);
    window.__pptAutoSaveIntervalId = setInterval(() => {
      if (!document.hidden && hasUnsavedChanges) {
        writeAutoSaveToIndexedDB(true);
      }
    }, 20000);
  }
}


function openStageContextMenu(clientX, clientY) {
  const menu = document.getElementById('pptContextMenu'); if (!menu) return;
  const hasSel = Boolean(selectedElement || (selectedElements && selectedElements.length > 0));
  const isLocked = selectedElement && selectedElement.getAttribute('data-layer-locked') === 'true', isGrouped = selectedElement && Boolean(selectedElement.getAttribute('data-group-id'));
  if (document.getElementById('ctxMenuLockLabel')) document.getElementById('ctxMenuLockLabel').textContent = isLocked ? '🔓 요소 잠금 해제' : '🔒 요소 잠금';
  if (document.getElementById('ctxMenuGroupLabel')) document.getElementById('ctxMenuGroupLabel').textContent = isGrouped ? '⊞ 그룹 해제' : '⊞ 선택 요소 그룹 묶기';
  menu.querySelectorAll('[data-ctx-needs-sel="true"]').forEach(btn => { btn.disabled = !hasSel; btn.classList.toggle('opacity-40', !hasSel); });
  const pasteBtn = document.getElementById('ctxMenuPasteBtn'); if (pasteBtn) { pasteBtn.disabled = false; pasteBtn.classList.remove('opacity-40'); }
  menu.dataset.spawnX = String(clientX); menu.dataset.spawnY = String(clientY); menu.classList.remove('hidden');
  const rect = menu.getBoundingClientRect();
  menu.style.left = `${Math.min(Math.max(8, window.innerWidth - rect.width - 12), Math.max(8, clientX))}px`;
  menu.style.top = `${Math.min(Math.max(8, window.innerHeight - rect.height - 12), Math.max(8, clientY))}px`;
}
function closeStageContextMenu() { const menu = document.getElementById('pptContextMenu'); if (menu) menu.classList.add('hidden'); }
function toggleContextTargetLock() {
  const targets = selectedElements.length > 0 ? selectedElements : (selectedElement ? [selectedElement] : []); if (targets.length === 0) return;
  const nextLock = targets[0].getAttribute('data-layer-locked') !== 'true';
  targets.forEach(el => { if (nextLock) el.setAttribute('data-layer-locked', 'true'); else el.removeAttribute('data-layer-locked'); });
  if (typeof refreshLayerList === 'function') refreshLayerList(); saveHistorySnapshot(nextLock ? '요소 잠금' : '요소 잠금 해제');
}
function cycleSlideElementSelection(dir) {
  const activeSlideEl = slides[currentSlide - 1]; if (!activeSlideEl) return;
  const items = Array.from(activeSlideEl.querySelectorAll('.slide-header-bar, .slide-card, .ppt-free-obj, .card-inner-textbox, .sub-box')).filter(el => el.getAttribute('data-layer-locked') !== 'true');
  if (items.length === 0) return;
  const curIdx = selectedElement ? items.indexOf(selectedElement) : -1, nextIdx = curIdx === -1 ? (dir > 0 ? 0 : items.length - 1) : ((curIdx + dir + items.length) % items.length);
  selectElementForInspector(items[nextIdx], false);
}
function insertFreeTextboxAtClientPoint(clientX, clientY) {
  if (typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive()) {
    if (typeof insertTextBoxIntoFloatingCardEditor === 'function') insertTextBoxIntoFloatingCardEditor();
    return;
  }
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const activeSlideEl = slides[currentSlide - 1]; if (!activeSlideEl) return;
  let layer = activeSlideEl.querySelector('.ppt-free-layer'); if (!layer) { layer = document.createElement('div'); layer.className = 'ppt-free-layer'; activeSlideEl.appendChild(layer); }
  const sRect = activeSlideEl.getBoundingClientRect(); let leftPct = 34, topPct = 32;
  if (typeof clientX === 'number' && typeof clientY === 'number' && sRect.width > 0 && sRect.height > 0) { leftPct = Math.max(2, Math.min(72, ((clientX - sRect.left) / sRect.width) * 100)); topPct = Math.max(2, Math.min(82, ((clientY - sRect.top) / sRect.height) * 100)); }
  const shape = document.createElement('div'); shape.className = 'ppt-free-obj'; shape.setAttribute('data-shape-type', 'textbox');
  shape.style.left = `${leftPct.toFixed(1)}%`; shape.style.top = `${topPct.toFixed(1)}%`; shape.style.width = '28%'; shape.style.height = '12%'; shape.style.zIndex = String(layer.children.length + 20);
  shape.style.opacity = '1'; shape.style.backgroundColor = 'rgba(255, 255, 255, 0.94)'; shape.style.border = '1.5px dashed #0055FF'; shape.style.borderRadius = '10px'; shape.style.color = '#111111';
  shape.innerHTML = `<div data-editable contenteditable="true" class="shape-inner-text text-base font-bold text-center">텍스트 입력</div>`;
  layer.appendChild(shape); selectElementForInspector(shape, false);
  const innerEd = shape.querySelector('[data-editable]'); if (innerEd) { innerEd.focus(); const r = document.createRange(); r.selectNodeContents(innerEd); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
  if (typeof refreshLayerList === 'function') refreshLayerList(); saveHistorySnapshot('텍스트 박스 생성');
}
document.addEventListener('keyup', (e) => { if (e.code === 'Space' && isSpacePanningMode) { isSpacePanningMode = false; document.body.classList.remove('space-pan-ready', 'space-pan-dragging'); } });
window.addEventListener('blur', () => {
  if (typeof abortActiveDragSession === 'function') abortActiveDragSession();
  if (isSpacePanningMode) { isSpacePanningMode = false; document.body.classList.remove('space-pan-ready', 'space-pan-dragging'); }
});
window.addEventListener('pagehide', () => {
  if (window.__pptAutoSaveIntervalId) { clearInterval(window.__pptAutoSaveIntervalId); window.__pptAutoSaveIntervalId = null; }
  if (typeof revokeAllTrackedMediaBlobUrls === 'function') revokeAllTrackedMediaBlobUrls();
  try { if (typeof studioPopupWin !== 'undefined' && studioPopupWin && !studioPopupWin.closed) studioPopupWin.close(); } catch (e) {}
  try { if (typeof fcStudioPopupWin !== 'undefined' && fcStudioPopupWin && !fcStudioPopupWin.closed) fcStudioPopupWin.close(); } catch (e) {}
  try { if (typeof presenterPopupWin !== 'undefined' && presenterPopupWin && !presenterPopupWin.closed) presenterPopupWin.close(); } catch (e) {}
});
document.addEventListener('mousedown', (e) => { if (!e.target.closest('#pptContextMenu')) closeStageContextMenu(); if (!e.target.closest('#historyDropdownWrap') && typeof toggleHistoryDropdown === 'function') toggleHistoryDropdown(false); });

window.addEventListener('DOMContentLoaded', init);

function navigateTableCellWithTab(currentCell, dir) {
  const table = currentCell ? currentCell.closest('table.ppt-data-table') : null;
  if (!table) return false;
  const cells = Array.from(table.querySelectorAll('th[data-cell-key], td[data-cell-key]'));
  const idx = cells.indexOf(currentCell);
  if (idx === -1) return false;
  const nextCell = cells[idx + dir];
  if (!nextCell) return false;
  nextCell.focus();
  if (typeof selectChartCellForFill === 'function') selectChartCellForFill(null, nextCell);
  const r = document.createRange();
  const firstResizer = nextCell.querySelector('.table-col-resizer, .table-row-resizer');
  if (firstResizer) {
    r.setStart(nextCell, 0);
    r.setEndBefore(firstResizer);
  } else {
    r.selectNodeContents(nextCell);
  }
  const s = window.getSelection();
  s.removeAllRanges();
  s.addRange(r);
  return true;
}

document.addEventListener('keydown', (e) => {
  if (!isActiveEditing()) return;
  const active = document.activeElement;
  if (e.key === 'Tab') {
    const cell = active ? active.closest('th[data-cell-key], td[data-cell-key]') : null;
    if (cell && navigateTableCellWithTab(cell, e.shiftKey ? -1 : 1)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
  }
  const mod = e.ctrlKey || e.metaKey;
  const isTyping = active && (active.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName));
  const inFilmstrip = Boolean(active && active.closest && active.closest('#pptLeftFilmstrip'));
  if (mod && !isTyping && inFilmstrip && !selectedElement && selectedElements.length === 0) {
    if (e.code === 'KeyC' && typeof copyCurrentSlideToClipboard === 'function') {
      e.preventDefault();
      copyCurrentSlideToClipboard();
    } else if (e.code === 'KeyV' && typeof pasteCopiedSlide === 'function') {
      e.preventDefault();
      pasteCopiedSlide();
    }
  }
}, true);

function insertPlainTextPreservingNewlines(doc, targetEl, plainText) {
  const sel = doc.getSelection();
  const frag = doc.createDocumentFragment();
  const lines = String(plainText || '').split(/\r?\n/);
  let lastInserted = null;
  lines.forEach((line, idx) => {
    if (idx > 0) {
      const br = doc.createElement('br');
      frag.appendChild(br);
      lastInserted = br;
    }
    if (line.length > 0) {
      const tn = doc.createTextNode(line);
      frag.appendChild(tn);
      lastInserted = tn;
    }
  });
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(frag);
    if (lastInserted) {
      range.setStartAfter(lastInserted);
      range.setEndAfter(lastInserted);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  } else if (targetEl) {
    targetEl.appendChild(frag);
  }
}

document.addEventListener('paste', (e) => {
  window.__pptAwaitingNativePaste = false;
  if (!isActiveEditing()) return;
  const active = document.activeElement;
  if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) return;

  // Modal Isolation for Paste!
  const fcModal = document.getElementById('floatingCardEditorModal');
  const isFcModalOpen = Boolean(fcModal && !fcModal.classList.contains('hidden'));
  const otherOpenModal = [
    'saveChoiceModal', 'findReplaceModal', 'overflowAuditModal', 'slideCommentsModal',
    'slideSorterModal', 'reuseSlidesModal', 'starterTemplateModal', 'shortcutsHelpModal',
    'onboardingGuideModal', 'tocModal'
  ].some(mid => { const mEl = document.getElementById(mid); return mEl && !mEl.classList.contains('hidden'); });
  if (otherOpenModal) return;

  const items = e.clipboardData && e.clipboardData.items ? Array.from(e.clipboardData.items) : [];
  const imgItem = items.find(it => it.type && it.type.startsWith('image/'));

  if (isFcModalOpen) {
    const fcEditor = typeof $fc === 'function' ? $fc('fcRichBodyEditor') : document.getElementById('fcRichBodyEditor');
    if (imgItem && fcEditor) {
      const file = imgItem.getAsFile();
      if (file) {
        e.preventDefault();
        const mountImg = (url) => {
          const doc = fcEditor.ownerDocument || document;
          const wrap = doc.createElement('div');
          wrap.className = 'fc-resizable-item fc-img-wrap my-3 overflow-hidden rounded-xl border border-borderline';
          wrap.setAttribute('contenteditable', 'false');
          wrap.style.width = '100%';
          const img = doc.createElement('img');
          img.src = url;
          img.className = 'w-full max-h-64 object-contain block';
          wrap.appendChild(img);
          fcEditor.appendChild(wrap);
          if (typeof makeFcBlockResizable === 'function') makeFcBlockResizable(wrap);
          if (typeof selectFcInnerBlock === 'function') selectFcInnerBlock(wrap);
          if (typeof recordFcSnapshot === 'function') recordFcSnapshot();
          showToast('클립보드 이미지가 플로팅 카드에 삽입되었습니다!');
        };
        if (typeof compressImageFileToDataUrl === 'function') compressImageFileToDataUrl(file, 1400, mountImg);
        else { const r = new FileReader(); r.onload = (ev) => mountImg(ev.target.result); r.readAsDataURL(file); }
        return;
      }
    }
    if (active && active.isContentEditable && fcEditor && fcEditor.contains(active)) {
      const plainFc = (e.clipboardData && e.clipboardData.getData('text/plain')) || '';
      e.preventDefault();
      insertPlainTextPreservingNewlines(document, active, plainFc);
      if (typeof recordFcSnapshot === 'function') recordFcSnapshot();
    }
    return;
  }

  // Slide Stage Paste: block on locked slides
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) {
    e.preventDefault();
    return;
  }

  if (imgItem) {
    const file = imgItem.getAsFile();
    if (file && typeof insertDirectImageFile === 'function') {
      e.preventDefault();
      insertDirectImageFile(file);
      showToast('클립보드 스크린샷/이미지가 슬라이드에 바로 삽입되었습니다!');
      return;
    }
  }

  const plain = (e.clipboardData && e.clipboardData.getData('text/plain')) || '';

  if (active && active.isContentEditable) {
    e.preventDefault();
    insertPlainTextPreservingNewlines(document, active, plain);
    if (typeof markUnsavedChanges === 'function') markUnsavedChanges();
    return;
  }

  const internalClip = typeof readSharedElementClipboard === 'function' ? readSharedElementClipboard() : [];
  const normPlain = plain.replace(/\s+/g, ' ').trim();
  const normInternal = (window.__pptInternalClipboardPlain || '').replace(/\s+/g, ' ').trim();
  const hasExternalText = normPlain.length > 0 && normPlain !== normInternal;

  if (hasExternalText && typeof insertExternalPastedTextToSlide === 'function') {
    e.preventDefault();
    insertExternalPastedTextToSlide(plain);
    return;
  }

  if (internalClip.length > 0 && typeof pasteCopiedElements === 'function') {
    e.preventDefault();
    pasteCopiedElements(false);
    return;
  }

  if (normPlain.length > 0 && typeof insertExternalPastedTextToSlide === 'function') {
    e.preventDefault();
    insertExternalPastedTextToSlide(plain);
  }
});

window.addEventListener('DOMContentLoaded', () => {
  const stage = document.getElementById('slideStage');
  if (!stage) return;
  stage.addEventListener('dragover', (e) => {
    if (!isActiveEditing()) return;
    if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  });
  stage.addEventListener('drop', (e) => {
    if (!isActiveEditing()) return;
    if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) { e.preventDefault(); return; }
    const files = e.dataTransfer && e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    if (files.length === 0) return;
    e.preventDefault();
    const imgFile = files.find(f => f.type && f.type.startsWith('image/'));
    const vidFile = files.find(f => f.type && f.type.startsWith('video/'));
    const audFile = files.find(f => f.type && f.type.startsWith('audio/'));
    if (imgFile && typeof insertDirectImageFile === 'function') {
      insertDirectImageFile(imgFile);
      showToast(`드래그한 이미지("${imgFile.name}")가 삽입되었습니다!`);
    } else if (vidFile && typeof insertDirectVideoFile === 'function') {
      insertDirectVideoFile(vidFile);
      showToast(`드래그한 동영상("${vidFile.name}")이 삽입되었습니다!`);
    } else if (audFile && typeof insertAudioFile === 'function') {
      insertAudioFile(audFile);
    }
  });
});

/* ==================== TABLET & TOUCH / STYLUS BRIDGE ==================== */
function initTouchPointerBridge() {
  const dispatchSyntheticMouse = (type, touch, target) => {
    if (!touch || !target) return;
    const evt = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: touch.clientX,
      clientY: touch.clientY,
      screenX: touch.screenX,
      screenY: touch.screenY,
      button: 0,
      buttons: type === 'mouseup' ? 0 : 1
    });
    target.dispatchEvent(evt);
  };

  let activeTouchTarget = null;
  document.addEventListener('touchstart', (e) => {
    if (!isActiveEditing() || e.touches.length !== 1) return;
    const t = e.touches[0];
    const hit = t.target && t.target.closest('.ov-handle, #ovDragHandle, #progressBarContainer, #slideStage .ppt-free-obj, #slideStage .slide-card');
    if (!hit) return;
    if (t.target && t.target.isContentEditable) return;
    activeTouchTarget = hit;
    dispatchSyntheticMouse('mousedown', t, t.target);
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!activeTouchTarget || e.touches.length !== 1) return;
    const t = e.touches[0];
    e.preventDefault();
    dispatchSyntheticMouse('mousemove', t, document);
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    if (!activeTouchTarget) return;
    const t = (e.changedTouches && e.changedTouches[0]) || null;
    dispatchSyntheticMouse('mouseup', t || { clientX: 0, clientY: 0, screenX: 0, screenY: 0 }, document);
    activeTouchTarget = null;
  }, { passive: true });
}
