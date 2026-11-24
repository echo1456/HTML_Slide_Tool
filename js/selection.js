/* ==================== DETACH ANY ELEMENT INTO FREE SLIDE OBJECT ==================== */
function detachElementToFreeLayer(el, silentBatch) {
  if (!el || el.classList.contains('ppt-free-obj')) return el;
  if (el.classList.contains('fx-text-span')) el = el.closest('h1, h2, h3, h4, p, blockquote, li, div[data-editable]') || el.parentElement;
  const activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return null;
  if (activeSlideEl.getAttribute('data-slide-locked') === 'true' || el.getAttribute('data-layer-locked') === 'true') {
    if (!silentBatch) showToast('잠긴 요소나 슬라이드는 그리드에서 분리할 수 없습니다.');
    return null;
  }
  ensureFreeLayersOnAllSlides();
  const layer = activeSlideEl.querySelector('.ppt-free-layer');
  const slideRect = activeSlideEl.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  const safeSlideW = Math.max(1, slideRect.width);
  const safeSlideH = Math.max(1, slideRect.height);

  const leftPct = Math.max(1, Math.min(88, ((rect.left - slideRect.left) / safeSlideW) * 100));
  const topPct = Math.max(1, Math.min(88, ((rect.top - slideRect.top) / safeSlideH) * 100));
  const widthPct = Math.max(8, Math.min(96, (rect.width / safeSlideW) * 100));
  const heightPct = Math.max(5, Math.min(92, (rect.height / safeSlideH) * 100));

  // Case 1: Embedded Interactive Widget (.ppt-interactive-widget) -> promote directly with zero textbox wrapper!
  if (el.classList.contains('ppt-interactive-widget')) {
    el.classList.remove('card-embedded-obj', 'my-2');
    el.classList.add('ppt-free-obj', 'shadow-lg');
    el.style.position = 'absolute';
    el.style.left = leftPct.toFixed(2) + '%';
    el.style.top = topPct.toFixed(2) + '%';
    el.style.width = Math.max(24, widthPct).toFixed(2) + '%';
    el.style.height = Math.max(24, heightPct).toFixed(2) + '%';
    el.style.minHeight = '';
    el.style.padding = '0';
    el.style.zIndex = String(layer.children.length + 20);
    layer.appendChild(el);
    if (!silentBatch) {
      selectElementForInspector(el);
      if (typeof refreshLayerList === 'function') refreshLayerList();
      saveHistorySnapshot('인터랙티브 위젯 자유 배치 분리');
      showToast('인터랙티브 위젯이 자유 배치 레이어로 분리되었습니다!');
    }
    return el;
  }

  // Case 2: Embedded Chart / Data Table (.ppt-chart-widget) -> promote cleanly as chart free-obj!
  if (el.classList.contains('ppt-chart-widget')) {
    const freeBox = document.createElement('div');
    freeBox.className = 'ppt-free-obj shadow-lg';
    freeBox.setAttribute('data-shape-type', 'chart');
    freeBox.style.left = leftPct.toFixed(2) + '%';
    freeBox.style.top = topPct.toFixed(2) + '%';
    freeBox.style.width = Math.max(26, widthPct).toFixed(2) + '%';
    freeBox.style.height = Math.max(22, heightPct).toFixed(2) + '%';
    freeBox.style.zIndex = String(layer.children.length + 20);
    freeBox.style.padding = '0';
    freeBox.style.backgroundColor = 'transparent';
    el.classList.remove('my-2', 'my-3');
    el.style.width = '100%';
    el.style.height = '100%';
    freeBox.appendChild(el);
    layer.appendChild(freeBox);
    if (!silentBatch) {
      selectElementForInspector(freeBox);
      if (typeof refreshLayerList === 'function') refreshLayerList();
      saveHistorySnapshot('차트/표 자유 배치 분리');
      showToast('차트/표가 자유 배치 레이어로 분리되었습니다!');
    }
    return freeBox;
  }

  const freeBox = document.createElement('div');
  freeBox.className = 'ppt-free-obj';
  freeBox.style.left = leftPct.toFixed(2) + '%';
  freeBox.style.top = topPct.toFixed(2) + '%';
  freeBox.style.width = widthPct.toFixed(2) + '%';
  freeBox.style.height = heightPct.toFixed(2) + '%';
  freeBox.style.zIndex = String(layer.children.length + 15);
  freeBox.style.opacity = '1';
  freeBox.style.justifyContent = 'flex-start';
  freeBox.style.alignItems = 'stretch';
  freeBox.style.textAlign = 'left';

  if (el.classList.contains('slide-card')) {
    freeBox.setAttribute('data-shape-type', 'freeCard');
    const computedBg = window.getComputedStyle(el).backgroundColor;
    freeBox.style.backgroundColor = computedBg && computedBg !== 'rgba(0, 0, 0, 0)' ? computedBg : '#FFFFFF';
    freeBox.style.border = '1px solid #CBD5E1';
    freeBox.style.borderRadius = '16px';
    freeBox.style.padding = '20px';
    freeBox.style.boxShadow = '0 10px 25px rgba(0,0,0,0.08)';
    freeBox.style.overflow = 'auto';

    const clone = el.cloneNode(true);
    clone.querySelectorAll('.card-edit-controls').forEach(c => c.remove());
    const oldGridBody = el.closest('.slide-grid-body');
    const vacated = (oldGridBody && oldGridBody.getAttribute('data-bento-2d') === 'true') ? getBento2DCoords(el) : null;
    freeBox.innerHTML = `<div class="w-full h-full flex flex-col justify-between">${clone.innerHTML}</div>`;
    el.remove();
    if (oldGridBody) { if (vacated) fillVacatedBentoRect(oldGridBody, vacated); if (typeof rebalanceSlideGridLayout === 'function') rebalanceSlideGridLayout(oldGridBody); }
  } else if (el.classList.contains('image-slot-box')) {
    freeBox.setAttribute('data-shape-type', 'image');
    freeBox.style.backgroundColor = '#FFFFFF';
    freeBox.style.border = '2px solid #0055FF';
    freeBox.style.borderRadius = '14px';
    freeBox.style.padding = '0px';
    const clone = el.cloneNode(true);
    clone.style.minHeight = '100%';
    clone.style.height = '100%';
    freeBox.appendChild(clone);
    el.remove();
  } else {
    freeBox.setAttribute('data-shape-type', 'textbox');
    freeBox.style.backgroundColor = 'rgba(255, 255, 255, 0.94)';
    freeBox.style.border = '1.5px dashed #0055FF';
    freeBox.style.borderRadius = '10px';
    freeBox.style.padding = '10px 14px';
    const clone = el.cloneNode(true);
    clone.style.transform = '';
    clone.style.width = '100%';
    const innerWrap = document.createElement('div');
    innerWrap.className = 'shape-inner-text w-full text-left';
    innerWrap.appendChild(clone);
    freeBox.appendChild(innerWrap);
    el.remove();
  }

  if (typeof isActiveEditing === 'function' ? isActiveEditing() : isEditMode) {
    freeBox.querySelectorAll('[data-editable]').forEach(ed => ed.setAttribute('contenteditable', 'true'));
  }
  layer.appendChild(freeBox);
  if (!silentBatch) {
    selectElementForInspector(freeBox);
    if (typeof refreshLayerList === 'function') refreshLayerList();
    saveHistorySnapshot('그리드 자유 배치 분리');
    showToast('그리드에서 분리되었습니다! 슬라이드 어디든 드래그·8방향 크기 조절이 가능합니다.');
  }
  return freeBox;
}

function detachSelectedToFreeCanvas() {
  if (!selectedElement) {
    showToast('먼저 그리드에서 분리할 카드나 요소를 선택해 주세요.');
    return;
  }
  if (selectedElement.closest('#fcRichBodyEditor')) {
    showToast('플로팅 카드 내부 요소는 카드 안에서 직접 크기·순서를 조절해 주세요.');
    return;
  }
  detachElementToFreeLayer(selectedElement);
}

function detachAllCardsInCurrentSlide() {
  const activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return;
  if (activeSlideEl.getAttribute('data-slide-locked') === 'true') {
    showToast('잠긴 슬라이드에서는 카드를 분리할 수 없습니다.');
    return;
  }
  const cards = Array.from(activeSlideEl.querySelectorAll('.slide-card')).filter(card => !card.closest('.ppt-free-obj') && card.getAttribute('data-layer-locked') !== 'true');
  if (cards.length === 0) {
    showToast('분리할 잠금 해제된 그리드 카드가 없습니다.');
    return;
  }
  const detached = cards.map(card => detachElementToFreeLayer(card, true)).filter(Boolean);
  if (detached.length > 0) {
    selectElementForInspector(detached[detached.length - 1], false);
    if (typeof refreshLayerList === 'function') refreshLayerList();
    saveHistorySnapshot(`슬라이드 카드 ${detached.length}개 전체 자유 분리`);
    showToast(`현재 슬라이드의 카드 ${detached.length}개가 자유 배치 레이어로 전환되었습니다.`);
  }
}

function detachMultipleElementsSafely(targets) {
  const activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return targets;
  ensureFreeLayersOnAllSlides();
  const layer = activeSlideEl.querySelector('.ppt-free-layer');
  const slideRect = activeSlideEl.getBoundingClientRect();

  const measured = targets.map(el => ({
    el,
    isFree: el.classList.contains('ppt-free-obj'),
    rect: el.getBoundingClientRect()
  }));

  return measured.map(({ el, isFree, rect }) => {
    if (isFree) return el;

    const leftPct = Math.max(1, Math.min(88, ((rect.left - slideRect.left) / slideRect.width) * 100));
    const topPct = Math.max(1, Math.min(88, ((rect.top - slideRect.top) / slideRect.height) * 100));
    const widthPct = Math.max(8, Math.min(96, (rect.width / slideRect.width) * 100));
    const heightPct = Math.max(5, Math.min(92, (rect.height / slideRect.height) * 100));

    const freeBox = document.createElement('div');
    freeBox.className = 'ppt-free-obj';
    freeBox.style.left = leftPct.toFixed(2) + '%';
    freeBox.style.top = topPct.toFixed(2) + '%';
    freeBox.style.width = widthPct.toFixed(2) + '%';
    freeBox.style.height = heightPct.toFixed(2) + '%';
    freeBox.style.zIndex = String(layer.children.length + 15);
    freeBox.style.opacity = '1';
    freeBox.style.justifyContent = 'flex-start';
    freeBox.style.alignItems = 'stretch';
    freeBox.style.textAlign = 'left';

    if (el.classList.contains('slide-card')) {
      freeBox.setAttribute('data-shape-type', 'freeCard');
      const computedBg = window.getComputedStyle(el).backgroundColor;
      freeBox.style.backgroundColor = computedBg && computedBg !== 'rgba(0, 0, 0, 0)' ? computedBg : '#FFFFFF';
      freeBox.style.border = '1px solid #CBD5E1';
      freeBox.style.borderRadius = '16px';
      freeBox.style.padding = '20px';
      freeBox.style.boxShadow = '0 10px 25px rgba(0,0,0,0.08)';
      freeBox.style.overflow = 'auto';

      const clone = el.cloneNode(true);
      clone.querySelectorAll('.card-edit-controls').forEach(c => c.remove());
      freeBox.innerHTML = `<div class="w-full h-full flex flex-col justify-between">${clone.innerHTML}</div>`;
      el.remove();
    } else if (el.classList.contains('image-slot-box')) {
      freeBox.setAttribute('data-shape-type', 'image');
      freeBox.style.backgroundColor = '#FFFFFF';
      freeBox.style.border = '2px solid #0055FF';
      freeBox.style.borderRadius = '14px';
      freeBox.style.padding = '0px';
      const clone = el.cloneNode(true);
      clone.style.minHeight = '100%';
      clone.style.height = '100%';
      freeBox.appendChild(clone);
      el.remove();
    } else {
      freeBox.setAttribute('data-shape-type', 'textbox');
      freeBox.style.backgroundColor = 'rgba(255, 255, 255, 0.94)';
      freeBox.style.border = '1.5px dashed #0055FF';
      freeBox.style.borderRadius = '10px';
      freeBox.style.padding = '10px 14px';
      const clone = el.cloneNode(true);
      clone.style.transform = '';
      clone.style.width = '100%';
      const innerWrap = document.createElement('div');
      innerWrap.className = 'shape-inner-text w-full text-left';
      innerWrap.appendChild(clone);
      freeBox.appendChild(innerWrap);
      el.remove();
    }

    if (isEditMode) {
      freeBox.querySelectorAll('[data-editable]').forEach(ed => ed.setAttribute('contenteditable', 'true'));
    }
    layer.appendChild(freeBox);
    return freeBox;
  });
}

/* ==================== LAYER MANAGEMENT PANEL (WITH FOLDER TREE FOR CARD CHILDREN) ==================== */
const collapsedLayerFolders = new WeakSet();

function toggleLayerFolder(cardEl) {
  if (!cardEl) return;
  if (collapsedLayerFolders.has(cardEl)) {
    collapsedLayerFolders.delete(cardEl);
  } else {
    collapsedLayerFolders.add(cardEl);
  }
  refreshLayerList();
}

function getInteractiveWidgetDisplayName(el) {
  const iwType = el ? (el.getAttribute('data-iw-type') || '') : '';
  const map = { 'before-after': 'Before/After 비교', 'hotspot': '이미지 핫스팟', 'tabbed-card': '탭 전환 카드', 'flip-card': '3D 플립 카드' };
  return map[iwType] || '인터랙티브 위젯';
}

function getCardInnerLayerChildren(cardEl) {
  const children = [];
  const candidates = cardEl.querySelectorAll(
    '.ppt-interactive-widget, .card-inline-media, .ppt-chart-widget, .sub-box, .hierarchy-tier, .card-inner-textbox, .card-embedded-obj, h1, h2, h3, h4, p, blockquote, li'
  );
  candidates.forEach((child, idx) => {
    if (child.closest('.card-edit-controls, .img-edit-overlay, .card-media-controls, .sub-box-del-btn, .iw-edit-bar')) return;
    if (child.parentElement && child.parentElement.closest('.ppt-interactive-widget, .sub-box, .ppt-chart-widget, .card-inner-textbox, .card-embedded-obj') && !child.classList.contains('ppt-interactive-widget') && !child.classList.contains('sub-box') && !child.classList.contains('ppt-chart-widget') && !child.classList.contains('card-inner-textbox') && !child.classList.contains('card-embedded-obj')) {
      return;
    }
    let tag = '텍스트';
    let txt = '';
    if (child.classList.contains('ppt-interactive-widget')) {
      tag = '위젯';
      txt = getInteractiveWidgetDisplayName(child);
    } else if (child.classList.contains('card-inline-media')) {
      tag = '미디어';
    } else if (child.classList.contains('ppt-chart-widget')) {
      tag = '차트·표';
      const h4 = child.querySelector('h4');
      txt = h4 ? h4.textContent.trim().slice(0, 14) : '';
    } else if (child.classList.contains('sub-box')) {
      tag = child.classList.contains('sub-wide-box') ? '긴박스' : '서브박스';
    } else if (child.classList.contains('hierarchy-tier')) {
      tag = '위계블록';
    } else if (child.classList.contains('card-inner-textbox')) {
      tag = '텍스트박스';
    } else if (child.classList.contains('card-embedded-obj')) {
      tag = '카드도형';
    } else if (/^H[1-4]$/.test(child.tagName)) {
      tag = '제목';
    }

    if (!txt) txt = child.textContent.trim().replace(/\s+/g, ' ').slice(0, 14) || `${tag} ${idx + 1}`;
    children.push({ el: child, tag, label: `[${tag}] ${txt}` });
  });
  return children;
}

function getLayerItemsForCurrentSlide() {
  const activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return [];
  const items = [];

  activeSlideEl.querySelectorAll('.ppt-free-obj').forEach((el, idx) => {
    const customName = el.getAttribute('data-layer-name'), type = el.getAttribute('data-shape-type') || 'object';
    let autoLabel = '';
    if (el.classList.contains('ppt-interactive-widget')) {
      autoLabel = `[위젯] ${getInteractiveWidgetDisplayName(el)}`;
    } else if (type === 'svg-icon') {
      autoLabel = `[아이콘] ${el.getAttribute('data-icon-key') || 'icon'}`;
    } else if (type === 'chart' || el.querySelector('.ppt-chart-widget')) {
      const h4 = el.querySelector('.ppt-chart-widget h4');
      autoLabel = `[차트·표] ${(h4 ? h4.textContent.trim().slice(0, 14) : '') || `차트 ${idx + 1}`}`;
    } else {
      const labelText = el.textContent.trim().replace(/\s+/g, ' ').slice(0, 16) || `자유 레이어 ${idx + 1}`;
      autoLabel = `[자유] ${labelText}`;
    }
    items.push({ el, kind: 'free', type, label: customName ? `🏷 ${customName}` : autoLabel, z: parseInt(el.style.zIndex || '20', 10), children: [] });
  });
  activeSlideEl.querySelectorAll('.slide-header-bar').forEach((el, idx) => {
    const customName = el.getAttribute('data-layer-name'), heading = el.querySelector('h1, h2, h3');
    const labelText = customName || (heading ? heading.textContent.trim().slice(0, 16) : `상단 타이틀바 ${idx + 1}`);
    items.push({ el, kind: 'header-bar', type: 'header-bar', label: `🏷 상단 타이틀 · ${labelText}`, z: parseInt(el.style.zIndex || '12', 10), children: [] });
  });
  activeSlideEl.querySelectorAll(':scope > .slide-grid-body > .slide-card').forEach((el, idx) => {
    const customName = el.getAttribute('data-layer-name'), heading = el.querySelector('h1, h2, h3');
    const labelText = customName || (heading ? heading.textContent.trim().slice(0, 16) : `그리드 카드 ${idx + 1}`);
    items.push({ el, kind: 'card', type: 'card', label: customName ? `📁 ${customName}` : `📁 카드 ${idx + 1} · ${labelText}`, z: parseInt(el.style.zIndex || '10', 10), children: getCardInnerLayerChildren(el) });
  });

  return items.sort((a, b) => b.z - a.z);
}

function refreshLayerList() {
  const listEl = $studio('studioLayerList');
  if (!listEl) return;
  const items = getLayerItemsForCurrentSlide();
  listEl.innerHTML = '';

  if (items.length === 0) {
    listEl.innerHTML = `<div class="text-[11px] text-muted py-2 text-center">현재 슬라이드에 표시할 레이어가 없습니다.</div>`;
    return;
  }

  const lDoc = listEl.ownerDocument || document;
  const buildRow = (targetEl, displayLabel, zVal, isChild, hasChildren, isCollapsed) => {
    const isSelected = selectedElement === targetEl || selectedElements.includes(targetEl);
    const isHidden = targetEl.style.visibility === 'hidden' || targetEl.style.display === 'none';
    const isLocked = targetEl.getAttribute('data-layer-locked') === 'true';

    const row = lDoc.createElement('div');
    row.className = `${isChild ? 'ml-3.5 pl-2 pr-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[11px]'} rounded-lg border flex items-center justify-between gap-1 cursor-pointer transition ${
      isSelected ? 'bg-gopro text-white border-gopro font-bold' : 'bg-white text-ink border-borderline hover:border-gopro'
    }`;

    if (hasChildren) {
      const foldBtn = lDoc.createElement('button');
      foldBtn.type = 'button';
      foldBtn.className = 'px-1 rounded hover:bg-black/15 font-mono text-[10px] shrink-0 cursor-pointer';
      foldBtn.textContent = isCollapsed ? '▸' : '▾';
      foldBtn.title = isCollapsed ? '카드 내부 요소 펼치기' : '카드 내부 요소 접기';
      foldBtn.onclick = (e) => {
        e.stopPropagation();
        toggleLayerFolder(targetEl);
      };
      row.appendChild(foldBtn);
    }

    const titleSpan = lDoc.createElement('span');
    titleSpan.className = 'truncate flex-1';
    titleSpan.textContent = isChild ? displayLabel : `${displayLabel} (Z:${zVal})`;
    titleSpan.onclick = () => { selectElementForInspector(targetEl); refreshLayerList(); };
    titleSpan.ondblclick = (e) => { e.stopPropagation(); renameLayerElement(targetEl); };
    const renameBtn = lDoc.createElement('button');
    renameBtn.type = 'button'; renameBtn.className = 'px-1 rounded hover:bg-black/15 cursor-pointer text-[9px]'; renameBtn.textContent = '✎';
    renameBtn.onclick = (e) => { e.stopPropagation(); renameLayerElement(targetEl); };

    const actionsWrap = lDoc.createElement('div');
    actionsWrap.className = 'flex items-center gap-0.5 shrink-0';

    const visBtn = lDoc.createElement('button');
    visBtn.type = 'button';
    visBtn.className = 'px-1 rounded hover:bg-black/15 cursor-pointer';
    visBtn.textContent = isHidden ? '🙈' : '👁';
    visBtn.title = '레이어 표시/숨김';
    visBtn.onclick = (e) => {
      e.stopPropagation();
      if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
      if (isHidden) {
        targetEl.style.visibility = '';
        if (targetEl.style.display === 'none') targetEl.style.display = '';
      } else {
        targetEl.style.visibility = 'hidden';
        if (selectedElement === targetEl && selectedElements.length <= 1) clearSelectionInspector();
      }
      refreshLayerList();
      saveHistorySnapshot(isHidden ? '레이어 표시' : '레이어 숨김');
    };

    const lockBtn = lDoc.createElement('button');
    lockBtn.type = 'button';
    lockBtn.className = 'px-1 rounded hover:bg-black/15 cursor-pointer';
    lockBtn.textContent = isLocked ? '🔒' : '🔓';
    lockBtn.title = '레이어 잠금/해제';
    lockBtn.onclick = (e) => {
      e.stopPropagation();
      if (isLocked) {
        targetEl.removeAttribute('data-layer-locked');
      } else {
        targetEl.setAttribute('data-layer-locked', 'true');
      }
      refreshLayerList();
      saveHistorySnapshot();
    };

    actionsWrap.appendChild(renameBtn);
    actionsWrap.appendChild(visBtn);
    actionsWrap.appendChild(lockBtn);
    row.appendChild(titleSpan);
    row.appendChild(actionsWrap);
    return row;
  };

  items.forEach((item) => {
    const hasChildren = item.children && item.children.length > 0;
    const isCollapsed = collapsedLayerFolders.has(item.el);
    listEl.appendChild(buildRow(item.el, item.label, item.z, false, hasChildren, isCollapsed));

    if (hasChildren && !isCollapsed) {
      item.children.forEach(ch => {
        listEl.appendChild(buildRow(ch.el, ch.label, 0, true, false, false));
      });
    }
  });
}

function changeSelectedLayerOrder(direction) {
  const targets = selectedElements.length > 0 ? selectedElements : (selectedElement ? [selectedElement] : []);
  if (targets.length === 0) {
    showToast('순서를 변경할 카드나 오브젝트를 먼저 선택해 주세요.');
    return;
  }
  if (targets.every(el => el.classList.contains('ppt-free-obj'))) {
    changeSelectedShapeLayer(direction);
    refreshLayerList();
    return;
  }
  targets.forEach(el => {
    const curZ = parseInt(el.style.zIndex || '10', 10);
    if (direction === 'front') el.style.zIndex = '40';
    else if (direction === 'up') el.style.zIndex = String(curZ + 5);
    else if (direction === 'down') el.style.zIndex = String(Math.max(1, curZ - 5));
    else el.style.zIndex = '1';
  });
  refreshLayerList();
  saveHistorySnapshot();
  showToast(`레이어 순서가 변경되었습니다.`);
}

/* ==================== HIERARCHICAL TIER BLOCKS INSIDE CARDS ==================== */
function addHierarchyTierToCard() {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const card = getTargetCardForHierarchy();
  if (!card) {
    showToast('먼저 위계 블록을 추가할 카드를 클릭해 주세요.');
    return;
  }

  const existingTiers = card.querySelectorAll(':scope > .hierarchy-tier');
  if (existingTiers.length === 0) {
    const padClasses = ['p-6', 'md:p-9', 'md:p-10', 'md:p-12', 'p-10', 'md:p-14', 'md:p-16'];
    const preservedPads = padClasses.filter(cls => card.classList.contains(cls));
    const innerPad = preservedPads.length > 0 ? preservedPads.join(' ') : 'p-6 md:p-10';

    const primaryTier = document.createElement('div');
    primaryTier.className = `hierarchy-tier ${innerPad} border-b border-borderline flex-1 flex flex-col justify-between`;

    const movableNodes = Array.from(card.childNodes).filter(node => {
      if (node.nodeType === 1) {
        return !node.classList.contains('card-bg-layer') && !node.classList.contains('card-hover-bg-layer') && !node.classList.contains('card-bg-tint') && !node.classList.contains('card-edit-controls');
      }
      return node.nodeType === 3 && node.textContent.trim().length > 0;
    });

    movableNodes.forEach(n => primaryTier.appendChild(n));
    preservedPads.forEach(cls => card.classList.remove(cls));
    card.classList.add('p-0', 'overflow-hidden');
    card.appendChild(primaryTier);
  }

  const tier = document.createElement('div');
  tier.className = 'hierarchy-tier p-6 md:p-8 border-b border-borderline bg-white/80 flex flex-col justify-center shrink-0';
  tier.innerHTML = `
    <span data-editable contenteditable="true" class="font-mono text-xs font-bold text-gopro tracking-wider mb-1.5">NEW TIER · 위계 라벨</span>
    <p data-editable contenteditable="true" class="text-lg md:text-xl font-extrabold text-ink">새로운 위계 블록 내용을 입력하세요.</p>
  `;
  card.appendChild(tier);
  selectElementForInspector(tier);
  refreshLayerList();
  saveHistorySnapshot();
  showToast('기존 콘텐츠 비율을 유지한 채 새 위계 블록이 추가되었습니다.');
}

function applyHierarchyTierPreset(level) {
  const tier = selectedElement ? selectedElement.closest('.hierarchy-tier') : null;
  if (!tier) {
    showToast('먼저 스타일을 변경할 위계 블록(또는 + 위계 블록 추가)을 선택해 주세요.');
    return;
  }
  const label = tier.querySelector('span');
  const body = tier.querySelector('p, h2, h3');
  tier.style.backgroundColor = '';
  tier.style.color = '';

  if (level === 'tier1') {
    tier.className = 'hierarchy-tier p-6 md:p-10 border-b border-borderline bg-white flex-1 flex flex-col justify-center';
    if (label) label.className = 'font-mono text-xs font-bold text-gopro tracking-wider mb-2';
    if (body) body.className = 'text-3xl sm:text-4xl font-black text-ink tracking-tight';
  } else if (level === 'tier2') {
    tier.className = 'hierarchy-tier p-6 md:p-8 border-b border-borderline bg-canvas flex flex-col justify-center';
    if (label) label.className = 'font-mono text-xs font-bold text-muted tracking-wider mb-1.5';
    if (body) body.className = 'text-xl md:text-2xl font-extrabold text-ink';
  } else if (level === 'tier3') {
    tier.className = 'hierarchy-tier p-6 md:p-8 bg-ink text-white flex flex-col justify-center';
    if (label) label.className = 'font-mono text-xs font-bold text-marker tracking-wider mb-1.5';
    if (body) body.className = 'text-lg md:text-xl font-bold text-white leading-snug';
  } else {
    tier.className = 'hierarchy-tier px-6 py-4 border-t border-borderline bg-white/70 flex flex-col justify-center';
    if (label) label.className = 'font-mono text-[11px] font-bold text-subtle tracking-wider mb-1';
    if (body) body.className = 'text-sm font-semibold text-muted';
  }
  positionSelectionOverlay();
  saveHistorySnapshot();
  showToast('위계 블록 스타일이 변경되었습니다.');
}

function moveSelectedTier(dir) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const tier = selectedElement ? selectedElement.closest('.hierarchy-tier') : null;
  if (!tier) return;
  const parent = tier.parentElement;
  if (dir === -1 && tier.previousElementSibling && tier.previousElementSibling.classList.contains('hierarchy-tier')) {
    parent.insertBefore(tier, tier.previousElementSibling);
  } else if (dir === 1 && tier.nextElementSibling && tier.nextElementSibling.classList.contains('hierarchy-tier')) {
    parent.insertBefore(tier.nextElementSibling, tier);
  }
  positionSelectionOverlay();
  saveHistorySnapshot();
}

function toggleSelectedTierDivider() {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const tier = selectedElement ? selectedElement.closest('.hierarchy-tier') : null;
  if (!tier) return;
  tier.classList.toggle('border-b');
  tier.classList.toggle('border-borderline');
  saveHistorySnapshot();
}

function deleteSelectedTier() {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const tier = selectedElement ? selectedElement.closest('.hierarchy-tier') : null;
  if (!tier) return;
  tier.remove();
  clearSelectionInspector();
  saveHistorySnapshot();
  showToast('위계 블록이 삭제되었습니다.');
}

/* ==================== SELECTION INSPECTOR & GEOMETRY ==================== */
function syncInspectorGeometry(el) {
  const ix = $studio('inspX');
  const iy = $studio('inspY');
  const iw = $studio('inspW');
  const ih = $studio('inspH');
  if (!ix || !iy || !iw || !ih || !el) return;

  const slideElForGeo = slides[currentSlide - 1];
  const sRectForGeo = slideElForGeo ? slideElForGeo.getBoundingClientRect() : null;
  const rForGeo = el.getBoundingClientRect();
  const isPctVal = (v) => typeof v === 'string' && v.trim().endsWith('%');
  if (el.classList.contains('ppt-free-obj')) {
    ix.value = (isPctVal(el.style.left) ? (parseFloat(el.style.left) || 0) : (sRectForGeo && sRectForGeo.width > 0 ? ((rForGeo.left - sRectForGeo.left) / sRectForGeo.width) * 100 : 0)).toFixed(1);
    iy.value = (isPctVal(el.style.top) ? (parseFloat(el.style.top) || 0) : (sRectForGeo && sRectForGeo.height > 0 ? ((rForGeo.top - sRectForGeo.top) / sRectForGeo.height) * 100 : 0)).toFixed(1);
    iw.value = (isPctVal(el.style.width) ? (parseFloat(el.style.width) || 20) : (sRectForGeo && sRectForGeo.width > 0 ? (rForGeo.width / sRectForGeo.width) * 100 : 20)).toFixed(1);
    ih.value = (isPctVal(el.style.height) ? (parseFloat(el.style.height) || 15) : (sRectForGeo && sRectForGeo.height > 0 ? (rForGeo.height / sRectForGeo.height) * 100 : 15)).toFixed(1);
  } else {
    const slideEl = slides[currentSlide - 1];
    if (!slideEl) return;
    const sRect = slideEl.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    ix.value = (((r.left - sRect.left) / sRect.width) * 100).toFixed(1);
    iy.value = (((r.top - sRect.top) / sRect.height) * 100).toFixed(1);
    iw.value = ((r.width / sRect.width) * 100).toFixed(1);
    ih.value = ((r.height / sRect.height) * 100).toFixed(1);
  }
  if (typeof syncPixelAndPaddingInputs === 'function') syncPixelAndPaddingInputs(el);
}

function applyInspectorGeometry() {
  if (!selectedElement) return;
  const activeSlideEl = slides[currentSlide - 1];
  if ((typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(false)) || selectedElement.getAttribute('data-layer-locked') === 'true') {
    showToast('잠긴 요소나 슬라이드의 좌표/크기는 변경할 수 없습니다.');
    syncInspectorGeometry(selectedElement);
    return;
  }
  const ix = $studio('inspX');
  const iy = $studio('inspY');
  const iw = $studio('inspW');
  const ih = $studio('inspH');
  if (!ix || !iy || !iw || !ih) return;

  const rawX = parseFloat(ix.value), rawY = parseFloat(iy.value), rawW = parseFloat(iw.value), rawH = parseFloat(ih.value);
  const xVal = Number.isFinite(rawX) ? Math.max(-40, Math.min(120, rawX)) : 0;
  const yVal = Number.isFinite(rawY) ? Math.max(-40, Math.min(120, rawY)) : 0;
  const wVal = Number.isFinite(rawW) ? Math.max(3, Math.min(120, rawW)) : 20;
  const hVal = Number.isFinite(rawH) ? Math.max(3, Math.min(120, rawH)) : 15;

  if (!selectedElement.classList.contains('ppt-free-obj')) {
    detachElementToFreeLayer(selectedElement);
  }
  if (!selectedElement) return;
  selectedElement.style.left = xVal.toFixed(2) + '%';
  selectedElement.style.top = yVal.toFixed(2) + '%';
  selectedElement.style.width = wVal.toFixed(2) + '%';
  selectedElement.style.height = hVal.toFixed(2) + '%';
  positionSelectionOverlay();
  syncInspectorGeometry(selectedElement);
  if (typeof updateSlideConnectors === 'function') updateSlideConnectors();
  saveHistorySnapshot('좌표·크기 수치 변경');
}

function selectParentCardFromChild() {
  if (!selectedElement) return;
  const parentCard = selectedElement.closest('.slide-card, .slide-header-bar, .ppt-free-obj[data-shape-type="freeCard"]');
  if (parentCard) {
    selectElementForInspector(parentCard);
    showToast(parentCard.classList.contains('slide-header-bar') ? '상단 타이틀 영역이 선택되었습니다.' : '상위 카드가 선택되었습니다.');
  }
}

function syncTextPositionUI(el) {
  const xInp = $studio('textOffsetXInput');
  const yInp = $studio('textOffsetYInput');
  if (!xInp || !yInp) return;
  if (!el) {
    xInp.value = '0';
    yInp.value = '0';
    return;
  }
  xInp.value = String(parseFloat(el.getAttribute('data-offset-x') || '0') || 0);
  yInp.value = String(parseFloat(el.getAttribute('data-offset-y') || '0') || 0);
}

function clampOffsetToParentCard(el, nextDx, nextDy) {
  const parentCard = el ? el.closest('.slide-card') : null;
  if (!parentCard || parentCard === el) {
    return { x: Math.round(nextDx), y: Math.round(nextDy) };
  }
  const scale = typeof getStageScale === 'function' ? getStageScale() : 1;
  const curX = parseFloat(el.getAttribute('data-offset-x') || '0') || 0;
  const curY = parseFloat(el.getAttribute('data-offset-y') || '0') || 0;
  const cRect = parentCard.getBoundingClientRect();
  const eRect = el.getBoundingClientRect();
  if (cRect.width === 0 || cRect.height === 0 || eRect.width === 0 || eRect.height === 0) {
    return { x: Math.round(nextDx), y: Math.round(nextDy) };
  }
  const padScreen = 6 * scale;
  const minX = Math.round(curX + (cRect.left + padScreen - eRect.left) / scale);
  const maxX = Math.max(minX, Math.round(curX + (cRect.right - padScreen - eRect.right) / scale));
  const minY = Math.round(curY + (cRect.top + padScreen - eRect.top) / scale);
  const maxY = Math.max(minY, Math.round(curY + (cRect.bottom - padScreen - eRect.bottom) / scale));
  return {
    x: Math.max(minX, Math.min(maxX, Math.round(nextDx))),
    y: Math.max(minY, Math.min(maxY, Math.round(nextDy)))
  };
}

function applyTextOffsetXY(el, dx, dy) {
  if (!el || el.classList.contains('fx-text-span')) return;
  const clamped = clampOffsetToParentCard(el, dx, dy);
  el.setAttribute('data-offset-x', String(clamped.x));
  el.setAttribute('data-offset-y', String(clamped.y));
  const slideEl = el.closest('.slide') || slides[currentSlide - 1];
  if (slideEl) {
    const scale = typeof getStageScale === 'function' ? getStageScale() : 1;
    const sRect = slideEl.getBoundingClientRect();
    const slideW = Math.max(1, sRect.width / scale);
    const slideH = Math.max(1, sRect.height / scale);
    if (clamped.x === 0 && clamped.y === 0) {
      el.removeAttribute('data-offset-rx');
      el.removeAttribute('data-offset-ry');
    } else {
      el.setAttribute('data-offset-rx', (clamped.x / slideW).toFixed(6));
      el.setAttribute('data-offset-ry', (clamped.y / slideH).toFixed(6));
    }
  }
  const cs = window.getComputedStyle(el);
  if (cs.display === 'inline') {
    el.style.display = 'inline-block';
  }
  if (cs.position === 'static') {
    el.style.position = 'relative';
  }
  if (!el.style.zIndex) {
    el.style.zIndex = '5';
  }
  if (clamped.x === 0 && clamped.y === 0) {
    el.style.removeProperty('--el-tx');
    el.style.removeProperty('--el-ty');
    el.style.transform = '';
  } else {
    el.style.setProperty('--el-tx', `${clamped.x}px`);
    el.style.setProperty('--el-ty', `${clamped.y}px`);
    el.style.transform = `translate(${clamped.x}px, ${clamped.y}px)`;
  }
  syncTextPositionUI(el);
  positionSelectionOverlay();
}

function moveSingleElementByPx(el, dxPx, dyPx, slideRect) {
  if (!el) return;
  if (el.classList.contains('ppt-free-obj')) {
    const sRect = slideRect || (slides[currentSlide - 1] && slides[currentSlide - 1].getBoundingClientRect());
    if (!sRect) return;
    const curL = parseFloat(el.style.left) || 0;
    const curT = parseFloat(el.style.top) || 0;
    const nextL = curL + (dxPx / Math.max(1, sRect.width)) * 100;
    const nextT = curT + (dyPx / Math.max(1, sRect.height)) * 100;
    el.style.left = Math.max(-20, Math.min(96, nextL)).toFixed(2) + '%';
    el.style.top = Math.max(-20, Math.min(96, nextT)).toFixed(2) + '%';
  } else {
    const curX = parseFloat(el.getAttribute('data-offset-x') || '0') || 0;
    const curY = parseFloat(el.getAttribute('data-offset-y') || '0') || 0;
    applyTextOffsetXY(el, Math.round(curX + dxPx), Math.round(curY + dyPx));
  }
}

function nudgeSelectedPosition(stepX, stepY) {
  const targets = selectedElements.length > 0
    ? selectedElements
    : ((selectedElement || getTargetTextEl()) ? [selectedElement || getTargetTextEl()] : []);
  if (targets.length === 0) {
    showToast('위치를 이동할 텍스트나 요소를 먼저 클릭해 주세요.');
    return;
  }
  const allInFc = targets.every(el => el && el.closest && el.closest('#fcRichBodyEditor'));
  const activeSlideEl = slides[currentSlide - 1];
  if (!allInFc && activeSlideEl && activeSlideEl.getAttribute('data-slide-locked') === 'true') {
    showToast('잠긴 슬라이드의 요소는 이동할 수 없습니다.');
    return;
  }
  const unlockedTargets = targets.filter(el => el.getAttribute('data-layer-locked') !== 'true');
  if (unlockedTargets.length === 0) {
    showToast('잠긴 레이어는 이동할 수 없습니다. 배치·레이어 탭에서 잠금을 해제해 주세요.');
    return;
  }
  const sRect = activeSlideEl ? activeSlideEl.getBoundingClientRect() : null;
  unlockedTargets.forEach(el => moveSingleElementByPx(el, stepX, stepY, sRect));
  positionSelectionOverlay();
  if (selectedElement) {
    syncInspectorGeometry(selectedElement);
    syncTextPositionUI(selectedElement);
  }
  saveHistorySnapshot();
}

function setSelectedTextOffsetFromInput() {
  const targets = selectedElements.length > 0
    ? selectedElements
    : ((selectedElement || getTargetTextEl()) ? [selectedElement || getTargetTextEl()] : []);
  if (targets.length === 0) return;
  const dx = parseFloat($studio('textOffsetXInput')?.value || '0') || 0;
  const dy = parseFloat($studio('textOffsetYInput')?.value || '0') || 0;
  targets.forEach(el => {
    if (!el.classList.contains('ppt-free-obj')) {
      applyTextOffsetXY(el, dx, dy);
    }
  });
  positionSelectionOverlay();
  saveHistorySnapshot();
}

function resetSelectedTextPosition() {
  const targets = selectedElements.length > 0
    ? selectedElements
    : ((selectedElement || getTargetTextEl()) ? [selectedElement || getTargetTextEl()] : []);
  if (targets.length === 0) {
    showToast('위치를 초기화할 텍스트나 요소를 먼저 선택해 주세요.');
    return;
  }
  targets.forEach(el => {
    if (!el.classList.contains('ppt-free-obj')) {
      applyTextOffsetXY(el, 0, 0);
    }
  });
  positionSelectionOverlay();
  saveHistorySnapshot();
  showToast('선택된 텍스트 위치가 기본 위치로 초기화되었습니다.');
}

function setCardVerticalAlign(mode) {
  const card = getTargetCardForHierarchy();
  if (!card) {
    showToast('먼저 정렬을 변경할 카드를 클릭해 주세요.');
    return;
  }
  card.classList.remove('justify-start', 'justify-center', 'justify-end', 'justify-between');
  if (mode === 'start') card.classList.add('justify-start');
  else if (mode === 'center') card.classList.add('justify-center');
  else if (mode === 'end') card.classList.add('justify-end');
  else card.classList.add('justify-between');
  positionSelectionOverlay();
  saveHistorySnapshot();
  showToast('카드 내부 콘텐츠 세로 정렬이 변경되었습니다.');
}

function resetCardVerticalGeometry() {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return;
  const gridBody = activeSlideEl.querySelector('.slide-grid-body');
  if (gridBody) {
    gridBody.removeAttribute('data-bento-2d');
    gridBody.classList.remove('has-multi-rows');
    gridBody.style.display = '';
    gridBody.style.gridTemplateColumns = '';
    gridBody.style.gridTemplateRows = '';
    gridBody.style.gridAutoFlow = '';
    gridBody.style.alignContent = '';
    gridBody.style.gridAutoRows = '';
    gridBody.style.overflowY = '';
  }
  activeSlideEl.querySelectorAll('.slide-card').forEach(c => {
    delete c.dataset.bentoSpan;
    delete c.dataset.bentoStartCol;
    delete c.dataset.bentoStartRow;
    delete c.dataset.bentoRowSpan;
    delete c.dataset.bentoHRatio;
    delete c.dataset.dragStartSpan;
    c.style.gridColumn = '';
    c.style.gridRow = '';
    c.style.height = '';
    c.style.minHeight = '';
    c.style.maxHeight = '';
    c.style.marginTop = '';
    c.style.alignSelf = '';
  });
  positionSelectionOverlay();
  saveHistorySnapshot('카드 크기·배치 초기화');
  showToast('카드의 가로·세로 크기와 배치가 원래대로 초기화되었습니다.');
}

/* ==================== MULTI-SELECTION & FLOATING OVERLAY ==================== */
function syncMultiSelectVisuals() {
  document.querySelectorAll('.ppt-multi-selected, .is-selected').forEach(el => {
    el.classList.remove('ppt-multi-selected', 'is-selected');
  });
  selectedElements = selectedElements.filter(el => el && document.body.contains(el));
  if (selectedElement && document.body.contains(selectedElement)) {
    selectedElement.classList.add('is-selected');
  }
  if (selectedElements.length > 1) {
    selectedElements.forEach(el => el.classList.add('ppt-multi-selected'));
  }
  const badge = document.getElementById('ovMultiCountBadge');
  if (badge) {
    if (selectedElements.length > 1) {
      badge.textContent = `✦ ${selectedElements.length}개 그룹 선택`;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

function getSelectionGroupRect() {
  const valid = selectedElements.filter(el => el && document.body.contains(el));
  if (valid.length === 0) return null;
  let minL = Infinity, minT = Infinity, maxR = -Infinity, maxB = -Infinity;
  valid.forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    minL = Math.min(minL, r.left);
    minT = Math.min(minT, r.top);
    maxR = Math.max(maxR, r.right);
    maxB = Math.max(maxB, r.bottom);
  });
  if (!isFinite(minL) || !isFinite(minT)) return null;
  return {
    left: minL,
    top: minT,
    right: maxR,
    bottom: maxB,
    width: Math.max(4, maxR - minL),
    height: Math.max(4, maxB - minT)
  };
}

function selectElementForInspector(el, additive) {
  if ((typeof isActiveEditing === 'function' ? !isActiveEditing() : !isEditMode) || !el) return;
  if (el.getAttribute('data-layer-locked') === 'true') {
    showToast('잠긴 레이어입니다. 레이어 패널에서 잠금(🔒)을 해제하세요.');
    return;
  }
  if (typeof savedTextSelectionRange !== 'undefined' && savedTextSelectionRange) {
    const anc = savedTextSelectionRange.commonAncestorContainer && savedTextSelectionRange.commonAncestorContainer.nodeType === 3
      ? savedTextSelectionRange.commonAncestorContainer.parentElement
      : savedTextSelectionRange.commonAncestorContainer;
    if (!anc || (!el.contains(anc) && !anc.contains(el))) {
      savedTextSelectionRange = null;
      if (typeof activeLiveColorSpan !== 'undefined') activeLiveColorSpan = null;
      if (typeof activeLiveHighlightSpan !== 'undefined') activeLiveHighlightSpan = null;
    }
  }

  if (additive) {
    const existingIdx = selectedElements.indexOf(el);
    if (existingIdx !== -1) {
      selectedElements.splice(existingIdx, 1);
      selectedElement = selectedElements[selectedElements.length - 1] || null;
    } else {
      selectedElements = selectedElements.filter(item => !item.contains(el) && !el.contains(item));
      selectedElements.push(el);
      selectedElement = el;
    }
  } else {
    selectedElements = [el];
    selectedElement = el;
  }

  syncMultiSelectVisuals();

  if (!selectedElement) {
    clearSelectionInspector();
    return;
  }

  const parentBtn = document.getElementById('ovSelectParentCardBtn');
  if (parentBtn) {
    const isContainer = selectedElement.classList.contains('slide-card') || selectedElement.classList.contains('slide-header-bar') || (selectedElement.classList.contains('ppt-free-obj') && selectedElement.getAttribute('data-shape-type') === 'freeCard');
    const insideCard = selectedElements.length === 1 && !isContainer && Boolean(selectedElement.closest('.slide-card, .slide-header-bar, .ppt-free-obj[data-shape-type="freeCard"]'));
    parentBtn.classList.toggle('hidden', !insideCard);
  }
  positionSelectionOverlay();
  syncInspectorGeometry(selectedElement);
  syncTextPositionUI(selectedElement);
  syncLinkInspectorUI(selectedElement);
  syncReactiveFxUI(selectedElement);
  if (typeof syncGeneralAnimUI === 'function') syncGeneralAnimUI(selectedElement);
  if (typeof syncChartInspectorUI === 'function') syncChartInspectorUI(selectedElement);
  if (typeof syncVideoSourceInspectorUI === 'function') syncVideoSourceInspectorUI(selectedElement);
  if (typeof syncElementOpacityUI === 'function') syncElementOpacityUI(selectedElement);
  if (typeof syncElementRadiusUI === 'function') syncElementRadiusUI(selectedElement);
  if (typeof syncImageAdjustmentInspectorUI === 'function') syncImageAdjustmentInspectorUI(selectedElement);
  if (typeof syncBuildOrderUI === 'function') syncBuildOrderUI(selectedElement);
  if (typeof syncToolbarWithTarget === 'function') {
    const textCandidate = selectedElement.hasAttribute('data-editable') ? selectedElement : selectedElement.querySelector('[data-editable]');
    if (textCandidate) syncToolbarWithTarget(textCandidate);
    else if (typeof updateTextCharCounter === 'function') updateTextCharCounter(selectedElement);
  }
  refreshLayerList();

  const innerScale = selectedElement.getAttribute('data-inner-scale') || selectedElement.querySelector('[data-inner-scale]')?.getAttribute('data-inner-scale') || '100';
  if ($studio('innerMediaScaleSlider')) $studio('innerMediaScaleSlider').value = innerScale;
  if ($studio('innerMediaScaleLabel')) $studio('innerMediaScaleLabel').textContent = `${innerScale}%`;
  const autoWBtn = $studio('textboxAutoWidthBtn');
  if (autoWBtn) {
    const isAutoW = selectedElement.getAttribute('data-auto-width') === 'true';
    autoWBtn.classList.toggle('is-active', isAutoW);
    autoWBtn.textContent = isAutoW ? '↔ 자동폭 ON' : '↔ 고정폭 줄바꿈';
  }

  if (selectedElement.classList.contains('slide-card') || selectedElement.classList.contains('slide-header-bar')) {
    const cs = window.getComputedStyle(selectedElement);
    const rgbaMatch = cs.backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    const computedAlpha = rgbaMatch && rgbaMatch[4] !== undefined ? Math.round(parseFloat(rgbaMatch[4]) * 100) : 100;
    const alphaVal = selectedElement.hasAttribute('data-card-bg-alpha')
      ? Number(selectedElement.getAttribute('data-card-bg-alpha'))
      : computedAlpha;
    const hexBg = selectedElement.getAttribute('data-card-bg-hex') || rgbToHex(cs.backgroundColor) || '#FFFFFF';
    if ($studio('cardBgColorPicker')) $studio('cardBgColorPicker').value = hexBg;
    if ($studio('cardBgOpacitySlider')) $studio('cardBgOpacitySlider').value = String(alphaVal);
    if ($studio('cardBgOpacityLabel')) $studio('cardBgOpacityLabel').textContent = `${alphaVal}%`;
  }
  if (typeof updateContextualTopBar === 'function') updateContextualTopBar(selectedElement);
  if (typeof autoSwitchStudioTabForElement === 'function') autoSwitchStudioTabForElement(selectedElement);
}

function positionSelectionOverlay() {
  const overlay = document.getElementById('pptSelectionOverlay');
  if (!overlay) return;
  if (typeof isActiveEditing === 'function' ? !isActiveEditing() : !isEditMode) {
    overlay.classList.remove('visible');
    return;
  }
  if (selectedElements.length === 0 && selectedElement && document.body.contains(selectedElement)) {
    selectedElements = [selectedElement];
  }
  syncMultiSelectVisuals();
  if (selectedElement && selectedElement.ownerDocument !== document) {
    overlay.classList.remove('visible');
    return;
  }
  const rect = getSelectionGroupRect();
  if (!rect) {
    overlay.classList.remove('visible');
    return;
  }
  const fcClipBox = (selectedElement && selectedElement.closest) ? selectedElement.closest('#fcRichBodyEditor') : null;
  const detachBtn = document.getElementById('ovDetachBtn');
  if (detachBtn) detachBtn.classList.toggle('hidden', Boolean(fcClipBox));
  if (fcClipBox) {
    const clipR = fcClipBox.getBoundingClientRect();
    if (rect.bottom < clipR.top + 4 || rect.top > clipR.bottom - 4) {
      overlay.classList.remove('visible');
      return;
    }
  }
  overlay.style.left = rect.left + 'px';
  overlay.style.top = rect.top + 'px';
  overlay.style.width = rect.width + 'px';
  overlay.style.height = rect.height + 'px';
  overlay.classList.add('visible');
  if (typeof updateSlideConnectors === 'function') updateSlideConnectors();
}

function clearSelectionInspector() {
  selectedElement = null;
  selectedElements = [];
  syncMultiSelectVisuals();
  const overlay = document.getElementById('pptSelectionOverlay');
  if (overlay) overlay.classList.remove('visible');
  if (typeof updateContextualTopBar === 'function') updateContextualTopBar(null);
  if (typeof autoSwitchStudioTabForElement === 'function') autoSwitchStudioTabForElement(null);
}


function rebalanceSlideGridLayout(gridBody, forceUniformReset) {
  if (!gridBody) return;
  const allCards = Array.from(gridBody.querySelectorAll(':scope > .slide-card'));
  if (allCards.length === 0) {
    gridBody.style.display = 'none';
    gridBody.classList.remove('has-multi-rows');
    gridBody.removeAttribute('data-bento-2d');
    return;
  }
  gridBody.style.display = 'grid';

  if (!forceUniformReset && gridBody.getAttribute('data-bento-2d') === 'true' && allCards.every(c => c.dataset.bentoStartCol && c.dataset.bentoSpan && c.dataset.bentoStartRow && c.dataset.bentoRowSpan)) {
    allCards.forEach(c => {
      const b = getBento2DCoords(c);
      applyBento2DCoords(c, b.cs, b.cw, b.rs, b.rh);
    });
    syncBento2DMultiRowClass(gridBody);
    return;
  }

  if (gridBody.style.gridTemplateColumns !== 'repeat(24, minmax(0, 1fr))' && typeof initFlexibleBentoGrid === 'function') {
    initFlexibleBentoGrid(gridBody, allCards, allCards.map(c => c.getBoundingClientRect()));
  }

  const packed = [];
  let curRow = [];
  let curCols = 0;
  allCards.forEach(c => {
    const sp = Math.max(3, Math.min(24, parseInt(c.dataset.bentoSpan || '8', 10) || 8));
    if (curCols + sp > 24 && curRow.length > 0) {
      packed.push({ items: curRow, cols: curCols });
      curRow = [];
      curCols = 0;
    }
    curRow.push({ card: c, span: sp });
    curCols += sp;
  });
  if (curRow.length > 0) packed.push({ items: curRow, cols: curCols });

  const rowCount = Math.max(1, packed.length);
  const baseRowH = Math.max(4, Math.floor(24 / rowCount));
  let rowCursor = 1;
  packed.forEach((row, rIdx) => {
    const isTitle = row.items.some(it => it.card.hasAttribute('data-title-card') || it.card.classList.contains('slide-title-card'));
    const rh = isTitle && rowCount > 1 ? 4 : (rIdx === rowCount - 1 ? Math.max(4, 25 - rowCursor) : baseRowH);
    const totalSp = row.items.reduce((a, it) => a + it.span, 0);
    let colCursor = 1;
    row.items.forEach((it, idx) => {
      let cw = it.span;
      if (idx === row.items.length - 1 && totalSp < 24 && row.items.length > 1) cw = Math.max(3, 25 - colCursor);
      else if (row.items.length === 1 && forceUniformReset) cw = 24;
      applyBento2DCoords(it.card, colCursor, cw, rowCursor, rh);
      colCursor += cw;
    });
    rowCursor += rh;
  });

  gridBody.setAttribute('data-bento-2d', 'true');
  gridBody.style.gridTemplateColumns = 'repeat(24, minmax(0, 1fr))';
  gridBody.style.gridTemplateRows = 'repeat(24, minmax(0, 1fr))';
  gridBody.style.overflowY = 'hidden';
  syncBento2DMultiRowClass(gridBody);
}

function duplicateSelectedElement() {
  const preTargets = selectedElements.length > 0 ? [...selectedElements] : (selectedElement ? [selectedElement] : []);
  const fcDupTargets = preTargets.filter(el => el && el.closest && el.closest('#fcRichBodyEditor'));
  if (fcDupTargets.length > 0 && fcDupTargets.length === preTargets.length) {
    const fcClones = [];
    fcDupTargets.forEach(el => {
      const clone = el.cloneNode(true);
      clone.classList.remove('ppt-multi-selected', 'is-selected', 'fc-item-selected');
      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
      if (clone.hasAttribute('data-chart-uid')) clone.setAttribute('data-chart-uid', 'chart_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7));
      clone.querySelectorAll('[data-chart-uid]').forEach(c => c.setAttribute('data-chart-uid', 'chart_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)));
      el.insertAdjacentElement('afterend', clone);
      fcClones.push(clone);
    });
    if (fcClones.length > 0) {
      selectedElements = fcClones;
      selectedElement = fcClones[fcClones.length - 1];
      syncMultiSelectVisuals();
      positionSelectionOverlay();
      if (typeof recordFcSnapshot === 'function') recordFcSnapshot();
      showToast('플로팅 카드 내부 요소가 복제되었습니다.');
    }
    return;
  }
  const activeSlideEl = slides[currentSlide - 1];
  if (activeSlideEl && activeSlideEl.getAttribute('data-slide-locked') === 'true') {
    showToast('잠긴 슬라이드에서는 요소를 복제할 수 없습니다.');
    return;
  }
  const targets = selectedElements.length > 0 ? [...selectedElements] : (selectedElement ? [selectedElement] : []);
  if (targets.length === 0) return;
  const newClones = [];
  const touchedGridBodies = new Set();
  const groupCounts = new Map();
  targets.forEach(el => {
    const gid = el.getAttribute('data-group-id');
    if (gid) groupCounts.set(gid, (groupCounts.get(gid) || 0) + 1);
  });
  const remappedGroupIds = new Map();
  targets.forEach(el => {
    const clone = el.cloneNode(true);
    clone.classList.remove('ppt-multi-selected', 'is-selected');
    clone.removeAttribute('id');
    clone.removeAttribute('data-layer-locked');
    clone.querySelectorAll('[data-layer-locked]').forEach(n => n.removeAttribute('data-layer-locked'));
    clone.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    clone.querySelectorAll('[data-chart-uid]').forEach(c => c.setAttribute('data-chart-uid', 'chart_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)));
    if (clone.hasAttribute('data-chart-uid')) clone.setAttribute('data-chart-uid', 'chart_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7));
    clone.removeAttribute('data-conn-node-id');
    clone.querySelectorAll('[data-conn-node-id]').forEach(n => n.removeAttribute('data-conn-node-id'));
    clone.removeAttribute('data-trigger-node-id');
    clone.querySelectorAll('[data-trigger-node-id]').forEach(n => n.removeAttribute('data-trigger-node-id'));
    const origGid = clone.getAttribute('data-group-id');
    if (origGid) {
      if ((groupCounts.get(origGid) || 0) >= 2) {
        if (!remappedGroupIds.has(origGid)) remappedGroupIds.set(origGid, 'grp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6));
        clone.setAttribute('data-group-id', remappedGroupIds.get(origGid));
      } else {
        clone.removeAttribute('data-group-id');
      }
    }
    clone.querySelectorAll('[data-group-id]').forEach(n => n.removeAttribute('data-group-id'));
    if (el.classList.contains('ppt-free-obj')) {
      const l = parseFloat(el.style.left) || 30;
      const t = parseFloat(el.style.top) || 30;
      clone.style.left = Math.min(72, l + 3) + '%';
      clone.style.top = Math.min(72, t + 3) + '%';
      el.parentElement.appendChild(clone);
    } else if (el.classList.contains('slide-card')) {
      const gb = el.closest('.slide-grid-body');
      if (gb) {
        if (gb.getAttribute('data-bento-2d') !== 'true' && typeof initFlexibleBentoGrid === 'function') {
          const prev = Array.from(gb.querySelectorAll(':scope > .slide-card'));
          initFlexibleBentoGrid(gb, prev, prev.map(c => c.getBoundingClientRect()));
        }
        const emptySlot = typeof findLargestEmptyBentoRect === 'function' ? findLargestEmptyBentoRect(gb) : null;
        if (emptySlot) {
          applyBento2DCoords(clone, emptySlot.cs, emptySlot.cw, emptySlot.rs, emptySlot.rh);
        } else {
          const origB = getBento2DCoords(el);
          if (origB.rh >= 8) {
            const topH = Math.floor(origB.rh / 2);
            applyBento2DCoords(el, origB.cs, origB.cw, origB.rs, topH);
            applyBento2DCoords(clone, origB.cs, origB.cw, origB.rs + topH, origB.rh - topH);
          } else if (origB.cw >= 8) {
            const leftW = Math.floor(origB.cw / 2);
            applyBento2DCoords(el, origB.cs, leftW, origB.rs, origB.rh);
            applyBento2DCoords(clone, origB.cs + leftW, origB.cw - leftW, origB.rs, origB.rh);
          } else {
            delete clone.dataset.bentoStartCol; delete clone.dataset.bentoStartRow; delete clone.dataset.bentoRowSpan;
            clone.dataset.bentoSpan = '8';
          }
        }
        touchedGridBodies.add(gb);
      }
      el.insertAdjacentElement('afterend', clone);
    } else {
      el.insertAdjacentElement('afterend', clone);
    }
    newClones.push(clone);
  });
  touchedGridBodies.forEach(gb => rebalanceSlideGridLayout(gb));
  selectedElements = newClones;
  selectedElement = newClones[newClones.length - 1] || null;
  syncMultiSelectVisuals();
  positionSelectionOverlay();
  saveHistorySnapshot('요소 복제');
  showToast(newClones.length > 1 ? `${newClones.length}개 그룹 요소가 복제되었습니다.` : '선택한 요소가 복제되었습니다.');
}

function deleteSelectedElement() {
  const rawPreTargets = selectedElements.length > 0 ? [...selectedElements] : (selectedElement ? [selectedElement] : []);
  const fcTargets = rawPreTargets.filter(el => el && el.closest && el.closest('#fcRichBodyEditor'));
  if (fcTargets.length > 0 && fcTargets.length === rawPreTargets.length) {
    fcTargets.forEach(el => { if (el.parentNode) el.remove(); });
    clearSelectionInspector();
    if (typeof recordFcSnapshot === 'function') recordFcSnapshot();
    showToast('플로팅 카드 내부 요소가 삭제되었습니다.');
    return;
  }
  const activeSlideEl = slides[currentSlide - 1];
  if (activeSlideEl && activeSlideEl.getAttribute('data-slide-locked') === 'true') {
    showToast('잠긴 슬라이드의 요소는 삭제할 수 없습니다.');
    return;
  }
  const rawTargets = selectedElements.length > 0 ? [...selectedElements] : (selectedElement ? [selectedElement] : []);
  const targets = rawTargets.filter(el => el && el.getAttribute('data-layer-locked') !== 'true');
  if (rawTargets.length > 0 && targets.length === 0) {
    showToast('잠긴 레이어는 삭제할 수 없습니다. 배치·레이어 탭에서 잠금을 해제해 주세요.');
    return;
  }
  if (targets.length === 0) return;
  let skippedCard = false;
  let unwrappedFx = false;
  const touchedGrids = new Set();
  targets.forEach(el => {
    if (!document.body.contains(el)) return;
    if (el.classList.contains('fx-text-span') && typeof unwrapFxTextSpan === 'function') {
      unwrapFxTextSpan(el);
      unwrappedFx = true;
      return;
    }
    if (el.classList.contains('slide-card')) {
      const gb = el.closest('.slide-grid-body');
      if (gb) {
        const vac = gb.getAttribute('data-bento-2d') === 'true' ? getBento2DCoords(el) : null;
        el.remove();
        if (vac) fillVacatedBentoRect(gb, vac);
        touchedGrids.add(gb);
        return;
      }
    }
    el.remove();
  });
  touchedGrids.forEach(gb => {
    if (typeof rebalanceSlideGridLayout === 'function') rebalanceSlideGridLayout(gb);
    else if (gb.querySelectorAll(':scope > .slide-card').length === 0) gb.style.display = 'none';
  });
  if (touchedGrids.size > 0) {
    if (typeof syncTocCardsOrderAndLabels === 'function') syncTocCardsOrderAndLabels();
    if (typeof buildModalGrid === 'function') buildModalGrid();
  }
  clearSelectionInspector();
  if (typeof refreshLayerList === 'function') refreshLayerList();
  if (typeof updateSlideConnectors === 'function') updateSlideConnectors();
  saveHistorySnapshot('요소 삭제');
  if (unwrappedFx) {
    showToast('텍스트에 적용된 반응형 효과만 해제되었고 텍스트는 보존되었습니다.');
  } else {
    showToast(skippedCard ? '최소 1개의 카드는 유지되어야 합니다.' : '선택된 요소가 삭제되었습니다.');
  }
}

/* ==================== SUB-BOX & CARD STYLE RESET ==================== */
function moveSelectedSubBox(dir) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  if (!selectedElement || !selectedElement.classList.contains('sub-box')) return;
  const parent = selectedElement.parentElement;
  if (dir === -1 && selectedElement.previousElementSibling && selectedElement.previousElementSibling.classList.contains('sub-box')) {
    parent.insertBefore(selectedElement, selectedElement.previousElementSibling);
  } else if (dir === 1 && selectedElement.nextElementSibling && selectedElement.nextElementSibling.classList.contains('sub-box')) {
    parent.insertBefore(selectedElement.nextElementSibling, selectedElement);
  }
  positionSelectionOverlay();
  saveHistorySnapshot();
}

function resetSelectedCardStyle() {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const card = getTargetCardForHierarchy();
  if (!card) return;
  if (card.getAttribute('data-layer-locked') === 'true') { showToast('잠긴 카드의 스타일은 초기화할 수 없습니다.'); return; }
  card.removeAttribute('data-glass');
  card.removeAttribute('data-card-bg-hex');
  card.removeAttribute('data-card-bg-alpha');
  card.removeAttribute('data-hover-bg-hex');
  card.removeAttribute('data-hover-bg-alpha');
  card.classList.remove('card-theme-dark');
  card.style.backgroundColor = '';
  card.style.backgroundImage = '';
  card.style.backdropFilter = '';
  card.style.boxShadow = '';
  card.style.opacity = '';
  card.style.borderColor = '';
  card.style.borderWidth = '';
  card.style.borderRadius = '';
  card.style.padding = '';
  card.style.color = '';
  card.style.removeProperty('--card-hover-bg');
  if ($studio('cardBgOpacitySlider')) $studio('cardBgOpacitySlider').value = '100';
  if ($studio('cardBgOpacityLabel')) $studio('cardBgOpacityLabel').textContent = '100%';
  const cardBg = card.querySelector('.card-bg-layer');
  if (cardBg) {
    cardBg.style.backgroundImage = '';
    cardBg.style.filter = '';
    cardBg.style.webkitMaskImage = '';
    cardBg.style.maskImage = '';
  }
  const cardTint = card.querySelector('.card-bg-tint');
  if (cardTint) { cardTint.style.backgroundColor = ''; cardTint.style.backgroundImage = ''; }
  const hoverBg = card.querySelector('.card-hover-bg-layer');
  if (hoverBg) { hoverBg.style.backgroundImage = ''; hoverBg.style.filter = ''; hoverBg.style.webkitMaskImage = ''; hoverBg.style.maskImage = ''; }
  card.style.removeProperty('--card-bg-color');
  positionSelectionOverlay();
  saveHistorySnapshot('카드 스타일 초기화');
  showToast('선택된 카드의 배경 및 호버 색상이 초기화되었습니다.');
}

function removeSubBox(btn) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const box = btn ? btn.closest('.sub-box, .sub-wide-box') : null;
  if (!box) return;
  box.remove();
  clearSelectionInspector();
  if (typeof refreshLayerList === 'function') refreshLayerList();
  saveHistorySnapshot('서브박스 삭제');
  showToast('서브박스가 삭제되었습니다.');
}

function addSubBoxInContainer(container, styleType) {
  if (!container) return;
  const activeSlideEl = slides[currentSlide - 1];
  if (activeSlideEl && activeSlideEl.getAttribute('data-slide-locked') === 'true') { showToast('잠긴 슬라이드에는 서브 박스를 추가할 수 없습니다.'); return; }
  const edAttr = (typeof isActiveEditing === 'function' ? isActiveEditing() : isEditMode) ? 'data-editable contenteditable="true"' : 'data-editable';
  const box = document.createElement('div');
  if (styleType === 'chip') {
    box.className = 'sub-box relative inline-flex items-center px-3.5 py-2 rounded-lg border border-borderline bg-white text-sm font-semibold text-ink';
    box.innerHTML = `<button data-on-click="event.stopPropagation(); removeSubBox(this)" title="칩 삭제" class="sub-box-del-btn absolute -top-2 -right-2 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold items-center justify-center shadow-sm cursor-pointer">✕</button><span ${edAttr}>새 제품 칩</span>`;
  } else if (styleType === 'row') {
    box.className = 'sub-box p-3.5 rounded-xl border border-borderline bg-white font-bold text-ink flex items-center justify-between';
    box.innerHTML = `<button data-on-click="event.stopPropagation(); removeSubBox(this)" title="항목 삭제" class="sub-box-del-btn absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold items-center justify-center shadow-sm cursor-pointer">✕</button><span data-editable contenteditable="true">새 고객층 항목</span><span class="font-mono text-xs text-subtle" data-editable contenteditable="true">NEW SEGMENT</span>`;
  } else {
    box.className = 'sub-box p-4 rounded-xl border border-borderline bg-white';
    box.innerHTML = `<button data-on-click="event.stopPropagation(); removeSubBox(this)" title="박스 삭제" class="sub-box-del-btn absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold items-center justify-center shadow-sm cursor-pointer">✕</button><div data-editable contenteditable="true" class="font-bold text-lg text-ink">새 이름</div><div data-editable contenteditable="true" class="text-xs text-muted mt-1 font-medium">담당 역할</div>`;
  }
  container.appendChild(box);
  selectElementForInspector(box);
  saveHistorySnapshot();
  showToast('새 서브 박스가 추가되었습니다.');
}

function addTextBoxToSelectedCard(initialText) {
  if (typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive()) {
    if (typeof insertTextBoxIntoFloatingCardEditor === 'function') insertTextBoxIntoFloatingCardEditor();
    return;
  }
  const activeSlideEl = slides[currentSlide - 1];
  if (activeSlideEl && activeSlideEl.getAttribute('data-slide-locked') === 'true') { showToast('잠긴 슬라이드에는 텍스트 박스를 추가할 수 없습니다.'); return; }
  const card = getTargetCardForHierarchy();
  if (!card) {
    showToast('먼저 텍스트 박스를 추가할 카드를 클릭해 주세요.');
    return;
  }
  const box = document.createElement('div');
  box.className = 'card-inner-textbox w-full my-2';
  box.style.width = '100%';
  box.innerHTML = `<p data-editable contenteditable="true" class="text-base md:text-lg text-ink leading-relaxed">${escapeAttr(initialText || '텍스트 내용을 입력하세요')}</p>`;

  const footerBar = Array.from(card.children).find(ch =>
    ch.tagName === 'DIV' &&
    !ch.classList.contains('card-bg-layer') &&
    !ch.classList.contains('card-hover-bg-layer') &&
    !ch.classList.contains('card-bg-tint') &&
    !ch.classList.contains('card-edit-controls') &&
    ch.classList.contains('border-t')
  );
  if (footerBar) {
    card.insertBefore(box, footerBar);
  } else {
    card.appendChild(box);
  }
  selectElementForInspector(box);
  refreshLayerList();
  saveHistorySnapshot();
  const leaf = box.querySelector('[data-editable]');
  if (leaf) leaf.focus();
  showToast('카드 내부에 텍스트 박스가 추가되었습니다! 8방향 핸들로 크기 조절, 드래그로 카드 내 자유 이동이 가능합니다.');
}

function addWideBoxToSelectedCard() {
  const card = getTargetCardForHierarchy();
  if (!card) {
    showToast('먼저 긴 박스를 추가할 카드를 클릭해 주세요.');
    return;
  }
  let group = card.querySelector('.sub-box-group');
  if (!group) {
    group = document.createElement('div');
    group.className = 'sub-box-group grid grid-cols-1 gap-3 mt-4 w-full';
    const footerBar = Array.from(card.children).find(ch =>
      ch.tagName === 'DIV' &&
      !ch.classList.contains('card-bg-layer') &&
      !ch.classList.contains('card-hover-bg-layer') &&
      !ch.classList.contains('card-bg-tint') &&
      !ch.classList.contains('card-edit-controls') &&
      ch.classList.contains('border-t')
    );
    if (footerBar) card.insertBefore(group, footerBar);
    else card.appendChild(group);
  }

  const nextIdx = group.querySelectorAll('.sub-box').length + 1;
  const wideBox = document.createElement('div');
  wideBox.className = 'sub-box sub-wide-box col-span-full w-full p-4 rounded-xl bg-white border border-borderline';
  wideBox.innerHTML = `
    <button data-on-click="event.stopPropagation(); removeSubBox(this)" title="긴 박스 삭제" class="sub-box-del-btn absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold items-center justify-center shadow-sm cursor-pointer">✕</button>
    <div data-editable contenteditable="true" class="font-mono text-[11px] font-bold text-gopro mb-1">POINT ${String(nextIdx).padStart(2, '0')} · SUBTITLE</div>
    <p data-editable contenteditable="true" class="text-sm md:text-base font-bold text-ink">강조할 핵심 내용을 입력하세요</p>
  `;
  group.appendChild(wideBox);
  selectElementForInspector(wideBox);
  refreshLayerList();
  saveHistorySnapshot();
  showToast('카드 내부에 가로 전체 폭의 긴 강조 박스가 추가되었습니다.');
}

function addSubBoxToSelectedCard() {
  const card = getTargetCardForHierarchy();
  if (!card) {
    showToast('먼저 서브 박스를 추가할 카드를 클릭해 주세요.');
    return;
  }
  let group = card.querySelector('.sub-box-group');
  if (!group) {
    group = document.createElement('div');
    group.className = 'sub-box-group grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4';
    card.appendChild(group);
  }
  addSubBoxInContainer(group, group.classList.contains('sub-chip-group') ? 'chip' : 'role');
}

/* ==================== UNIVERSAL ELEMENT & EXTERNAL CLIPBOARD: COPY & PASTE ==================== */
const SHARED_ELEMENT_CLIPBOARD_KEY = 'ppt_studio_shared_clipboard_v1';
window.__pptElementClipboard = [];
window.__pptInternalClipboardPlain = '';

function writeSharedElementClipboard(items, plainSummary) {
  window.__pptElementClipboard = items;
  window.__pptInternalClipboardPlain = plainSummary || '';
  try {
    localStorage.setItem(SHARED_ELEMENT_CLIPBOARD_KEY, JSON.stringify({
      ts: Date.now(),
      plainSummary: window.__pptInternalClipboardPlain,
      items
    }));
  } catch (e) {}
}

function readSharedElementClipboard() {
  if (Array.isArray(window.__pptElementClipboard) && window.__pptElementClipboard.length > 0) {
    return window.__pptElementClipboard;
  }
  try {
    const raw = localStorage.getItem(SHARED_ELEMENT_CLIPBOARD_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
        window.__pptElementClipboard = parsed.items;
        window.__pptInternalClipboardPlain = parsed.plainSummary || '';
        return parsed.items;
      }
    }
  } catch (e) {}
  return [];
}

function syncTextToSystemClipboard(plainText) {
  if (!plainText) return;
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(plainText).catch(() => {});
    }
  } catch (e) {}
}

function insertExternalPastedTextToSlide(rawText) {
  const cleanText = String(rawText || '').replace(/\r\n/g, '\n').trim();
  if (!cleanText) return false;
  const activeSlideEl = document.querySelector('#slideStage .slide.active') || slides[currentSlide - 1];
  if (!activeSlideEl) return false;

  const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
  const formattedHtml = lines.map(l => escapeAttr(l)).join('<br>');

  const targetCard = typeof shouldInsertIntoSelectedCard === 'function' ? shouldInsertIntoSelectedCard() : null;
  if (targetCard) {
    const box = document.createElement('div');
    box.className = 'card-inner-textbox mt-2 p-2.5 rounded-lg border border-transparent hover:border-borderline';
    box.setAttribute('data-editable', '');
    if (isEditMode) box.setAttribute('contenteditable', 'true');
    box.style.fontSize = '16px';
    box.style.lineHeight = '1.5';
    box.innerHTML = formattedHtml;
    targetCard.appendChild(box);
    selectElementForInspector(box);
    if (typeof refreshLayerList === 'function') refreshLayerList();
    saveHistorySnapshot('외부 텍스트 붙여넣기');
    showToast('클립보드 텍스트가 선택한 카드에 붙여넣어졌습니다.');
    return true;
  }

  ensureFreeLayersOnAllSlides();
  const layer = activeSlideEl.querySelector('.ppt-free-layer');
  if (!layer) return false;
  const existingBoxes = layer.querySelectorAll('.ppt-free-obj[data-shape-type="textbox"]').length;
  const offsetPct = (existingBoxes % 5) * 3;
  const freeBox = document.createElement('div');
  freeBox.className = 'ppt-free-obj shadow-sm';
  freeBox.setAttribute('data-shape-type', 'textbox');
  freeBox.style.left = `${24 + offsetPct}%`;
  freeBox.style.top = `${24 + offsetPct}%`;
  freeBox.style.width = '46%';
  freeBox.style.height = 'auto';
  freeBox.style.minHeight = '54px';
  freeBox.style.justifyContent = 'flex-start';
  freeBox.style.alignItems = 'flex-start';
  freeBox.style.textAlign = 'left';
  freeBox.style.backgroundColor = 'rgba(255, 255, 255, 0.96)';
  freeBox.style.border = '1.5px dashed #0055FF';
  freeBox.style.borderRadius = '12px';
  freeBox.style.padding = '12px 16px';
  freeBox.style.zIndex = String(layer.children.length + 22);

  const inner = document.createElement('div');
  inner.className = 'shape-inner-text w-full text-left text-base text-ink leading-relaxed';
  inner.setAttribute('data-editable', '');
  if (isEditMode) inner.setAttribute('contenteditable', 'true');
  inner.innerHTML = formattedHtml;
  freeBox.appendChild(inner);
  layer.appendChild(freeBox);

  selectElementForInspector(freeBox);
  if (typeof refreshLayerList === 'function') refreshLayerList();
  saveHistorySnapshot('외부 텍스트 붙여넣기');
  showToast('클립보드 텍스트가 슬라이드에 텍스트 상자로 붙여넣어졌습니다.');
  return true;
}

function copySelectedElements() {
  const targets = selectedElements.length > 0 ? [...selectedElements] : (selectedElement ? [selectedElement] : []);
  const valid = targets.filter(el => el && document.body.contains(el));
  if (valid.length === 0) {
    showToast('먼저 복사할 요소를 선택해 주세요.');
    return;
  }
  const plainParts = [];
  const serializedItems = valid.map(el => {
    const clone = el.cloneNode(true);
    clone.classList.remove('ppt-multi-selected', 'is-selected');
    clone.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    clone.removeAttribute('id');
    const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (txt) plainParts.push(txt);
    const kind = el.classList.contains('ppt-free-obj')
      ? 'free-obj'
      : (el.classList.contains('slide-card') ? 'slide-card' : 'card-inner');
    return {
      kind,
      html: clone.outerHTML
    };
  });
  const plainSummary = plainParts.join('\n').trim();
  writeSharedElementClipboard(serializedItems, plainSummary);
  syncTextToSystemClipboard(plainSummary);
  showToast(`📋 선택한 요소 ${serializedItems.length}개가 복사되었습니다. (다른 슬라이드·탭·외부 앱 붙여넣기 지원)`);
}

async function pasteCopiedElements(allowSystemClipboardRead) {
  const clipItems = readSharedElementClipboard();
  if (!Array.isArray(clipItems) || clipItems.length === 0) {
    if (allowSystemClipboardRead && navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
      try {
        const sysTxt = await navigator.clipboard.readText();
        if (sysTxt && sysTxt.trim() && insertExternalPastedTextToSlide(sysTxt)) {
          return;
        }
      } catch (e) {}
    }
    showToast('붙여넣을 내용이 없습니다. 슬라이드 요소를 Ctrl+C로 복사하거나 외부 텍스트·이미지를 복사한 뒤 Ctrl+V를 눌러주세요.');
    return;
  }
  if (typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive()) {
    const fcEd = typeof getActiveFcPreviewCanvas === 'function' ? getActiveFcPreviewCanvas() : null;
    if (fcEd) {
      const fcPasted = [];
      clipItems.forEach(item => {
        const safeHtml = (typeof sanitizeImportedStageHtml === 'function') ? sanitizeImportedStageHtml(item.html || '') : (item.html || '');
        const w = fcEd.ownerDocument.createElement('div');
        w.innerHTML = safeHtml;
        const node = w.firstElementChild;
        if (!node) return;
        node.classList.remove('ppt-multi-selected', 'is-selected', 'fc-item-selected', 'ppt-free-obj');
        node.classList.add('fc-resizable-item', 'my-2');
        node.removeAttribute('id');
        node.removeAttribute('data-layer-locked');
        node.removeAttribute('data-group-id');
        node.style.position = 'relative';
        node.style.left = ''; node.style.top = '';
        node.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
        if (node.hasAttribute('data-chart-uid')) node.setAttribute('data-chart-uid', 'chart_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7));
        fcEd.appendChild(node);
        fcPasted.push(node);
      });
      if (fcPasted.length > 0) {
        selectedElements = fcPasted;
        selectedElement = fcPasted[fcPasted.length - 1];
        syncMultiSelectVisuals();
        positionSelectionOverlay();
        if (typeof recordFcSnapshot === 'function') recordFcSnapshot();
        showToast(`📌 플로팅 카드에 요소 ${fcPasted.length}개가 붙여넣어졌습니다!`);
      }
      return;
    }
  }
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const activeSlideEl = document.querySelector('#slideStage .slide.active') || slides[currentSlide - 1];
  if (!activeSlideEl) return;
  ensureFreeLayersOnAllSlides();
  const freeLayer = activeSlideEl.querySelector('.ppt-free-layer');
  const gridBody = activeSlideEl.querySelector('.slide-grid-body');
  const explicitSelectedCard = getTargetCardForHierarchy();
  const targetCard = explicitSelectedCard || activeSlideEl.querySelector('.slide-card');

  const pastedNodes = [];
  let pastedCardIntoGrid = false;
  clipItems.forEach((item, idx) => {
    const safeItemHtml = (typeof sanitizeImportedStageHtml === 'function') ? sanitizeImportedStageHtml(item.html || '') : (item.html || '');
    const wrapper = document.createElement('div');
    wrapper.innerHTML = safeItemHtml;
    const node = wrapper.firstElementChild;
    if (!node) return;
    node.classList.remove('ppt-multi-selected', 'is-selected');
    node.removeAttribute('id');
    node.removeAttribute('data-layer-locked');
    node.removeAttribute('data-conn-node-id');
    node.removeAttribute('data-trigger-node-id');
    node.removeAttribute('data-group-id');
    node.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    node.querySelectorAll('[data-layer-locked]').forEach(n => n.removeAttribute('data-layer-locked'));
    node.querySelectorAll('[data-conn-node-id]').forEach(n => n.removeAttribute('data-conn-node-id'));
    node.querySelectorAll('[data-trigger-node-id]').forEach(n => n.removeAttribute('data-trigger-node-id'));
    node.querySelectorAll('[data-group-id]').forEach(n => n.removeAttribute('data-group-id'));
    node.querySelectorAll('[data-chart-uid]').forEach(c => {
      c.setAttribute('data-chart-uid', 'chart_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7));
    });
    if (node.hasAttribute('data-chart-uid')) {
      node.setAttribute('data-chart-uid', 'chart_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7));
    }

    if (item.kind === 'free-obj' && freeLayer) {
      const l = parseFloat(node.style.left) || 30;
      const t = parseFloat(node.style.top) || 30;
      node.style.left = Math.min(82, l + 2.5 + idx * 1.5) + '%';
      node.style.top = Math.min(82, t + 2.5 + idx * 1.5) + '%';
      node.style.zIndex = String(freeLayer.children.length + 20);
      freeLayer.appendChild(node);
      pastedNodes.push(node);
    } else if (item.kind === 'slide-card' && gridBody) {
      const curCards = Array.from(gridBody.querySelectorAll(':scope > .slide-card'));
      if (curCards.length > 0 && gridBody.getAttribute('data-bento-2d') !== 'true') {
        initFlexibleBentoGrid(gridBody, curCards, curCards.map(c => c.getBoundingClientRect()));
      }
      const emptySlot = (gridBody.getAttribute('data-bento-2d') === 'true') ? findLargestEmptyBentoRect(gridBody) : null;
      delete node.dataset.bentoStartCol; delete node.dataset.bentoStartRow; delete node.dataset.bentoRowSpan;
      gridBody.style.display = 'grid';
      if (emptySlot) {
        applyBento2DCoords(node, emptySlot.cs, emptySlot.cw, emptySlot.rs, emptySlot.rh);
      } else if (curCards.length === 0) {
        gridBody.setAttribute('data-bento-2d', 'true');
        gridBody.style.gridTemplateColumns = 'repeat(24, minmax(0, 1fr))';
        gridBody.style.gridTemplateRows = 'repeat(24, minmax(0, 1fr))';
        applyBento2DCoords(node, 1, 24, 1, 24);
      } else {
        const splitTarget = (explicitSelectedCard && explicitSelectedCard.parentElement === gridBody)
          ? explicitSelectedCard
          : curCards.slice().sort((a, b) => (getBento2DCoords(b).cw * getBento2DCoords(b).rh) - (getBento2DCoords(a).cw * getBento2DCoords(a).rh))[0];
        if (splitTarget && gridBody.getAttribute('data-bento-2d') === 'true') {
          const tb = getBento2DCoords(splitTarget);
          if (tb.rh >= tb.cw && tb.rh >= 8) {
            const topH = Math.floor(tb.rh / 2);
            applyBento2DCoords(splitTarget, tb.cs, tb.cw, tb.rs, topH);
            applyBento2DCoords(node, tb.cs, tb.cw, tb.rs + topH, tb.rh - topH);
          } else if (tb.cw >= 8) {
            const leftW = Math.floor(tb.cw / 2);
            applyBento2DCoords(splitTarget, tb.cs, leftW, tb.rs, tb.rh);
            applyBento2DCoords(node, tb.cs + leftW, tb.cw - leftW, tb.rs, tb.rh);
          } else {
            node.dataset.bentoSpan = '8';
          }
        } else {
          node.dataset.bentoSpan = '8';
        }
      }
      gridBody.appendChild(node);
      pastedNodes.push(node);
      pastedCardIntoGrid = true;
    } else if (targetCard && (explicitSelectedCard || gridBody.style.display !== 'none')) {
      if (node.classList.contains('sub-box') && targetCard.querySelector('.sub-box-group')) {
        targetCard.querySelector('.sub-box-group').appendChild(node);
      } else {
        targetCard.appendChild(node);
      }
      const curX = parseFloat(node.getAttribute('data-offset-x') || '0') || 0;
      const curY = parseFloat(node.getAttribute('data-offset-y') || '0') || 0;
      if (curX !== 0 || curY !== 0) {
        applyTextOffsetXY(node, curX + 12, curY + 12);
      }
      pastedNodes.push(node);
    } else if (freeLayer) {
      const freeBox = document.createElement('div');
      freeBox.className = 'ppt-free-obj shadow-sm';
      freeBox.setAttribute('data-shape-type', 'textbox');
      freeBox.style.left = (24 + idx * 2.5) + '%';
      freeBox.style.top = (24 + idx * 2.5) + '%';
      freeBox.style.width = '44%';
      freeBox.style.height = 'auto';
      freeBox.style.minHeight = '54px';
      freeBox.style.justifyContent = 'flex-start';
      freeBox.style.alignItems = 'flex-start';
      freeBox.style.textAlign = 'left';
      freeBox.style.backgroundColor = 'rgba(255,255,255,0.96)';
      freeBox.style.border = '1.5px dashed #0055FF';
      freeBox.style.borderRadius = '12px';
      freeBox.style.padding = '12px 16px';
      freeBox.style.zIndex = String(freeLayer.children.length + 20);
      freeBox.appendChild(node);
      freeLayer.appendChild(freeBox);
      pastedNodes.push(freeBox);
    }
  });

  if (pastedCardIntoGrid && gridBody && typeof rebalanceSlideGridLayout === 'function') {
    rebalanceSlideGridLayout(gridBody);
  }

  if (pastedNodes.length > 0) {
    if (isEditMode) {
      pastedNodes.forEach(n => {
        if (n.hasAttribute('data-editable')) n.setAttribute('contenteditable', 'true');
        n.querySelectorAll('[data-editable]').forEach(ed => ed.setAttribute('contenteditable', 'true'));
      });
    }
    selectedElements = pastedNodes;
    selectedElement = pastedNodes[pastedNodes.length - 1];
    syncMultiSelectVisuals();
    positionSelectionOverlay();
    syncInspectorGeometry(selectedElement);
    if (typeof updateContextualTopBar === 'function') updateContextualTopBar(selectedElement);
    refreshLayerList();
    saveHistorySnapshot('요소 붙여넣기');
    showToast(`📌 요소 ${pastedNodes.length}개가 붙여넣어졌습니다!`);
  }
}

/* ==================== ALIGNMENT, EVEN DISTRIBUTION, GROUPING & SMART SNAP ==================== */
function toggleSmartSnap(checked) {
  isSnapEnabled = Boolean(checked);
  showToast(isSnapEnabled ? '🧲 스마트 가이드 및 자석 스냅이 켜졌습니다.' : '스마트 스냅이 꺼졌습니다.');
}

function getAlignableTargets() {
  const activeSlideEl = slides[currentSlide - 1];
  if (activeSlideEl && activeSlideEl.getAttribute('data-slide-locked') === 'true') return [];
  const raw = selectedElements.length > 0 ? selectedElements : (selectedElement ? [selectedElement] : []);
  return raw.filter(el => el && document.body.contains(el) && el.getAttribute('data-layer-locked') !== 'true');
}

function setElementLeftTopPx(el, targetLeftPx, targetTopPx, slideRect) {
  const r = el.getBoundingClientRect();
  if (el.classList.contains('ppt-free-obj')) {
    const nextL = ((targetLeftPx - slideRect.left) / slideRect.width) * 100;
    const nextT = ((targetTopPx - slideRect.top) / slideRect.height) * 100;
    el.style.left = nextL.toFixed(2) + '%';
    el.style.top = nextT.toFixed(2) + '%';
  } else {
    const stScale = typeof getStageScale === 'function' ? getStageScale() : 1;
    const curOffX = parseFloat(el.getAttribute('data-offset-x') || '0') || 0;
    const curOffY = parseFloat(el.getAttribute('data-offset-y') || '0') || 0;
    applyTextOffsetXY(el, Math.round(curOffX + (targetLeftPx - r.left) / stScale), Math.round(curOffY + (targetTopPx - r.top) / stScale));
  }
}

function alignSelectedElements(mode) {
  const targets = getAlignableTargets();
  const slideEl = slides[currentSlide - 1];
  if (targets.length === 0 || !slideEl) {
    showToast('먼저 정렬할 요소를 선택해 주세요.');
    return;
  }
  const sRect = slideEl.getBoundingClientRect();

  // Single element -> align relative to slide stage!
  if (targets.length === 1) {
    const scale = typeof getStageScale === 'function' ? getStageScale() : 1;
    const marginPx = 24 * scale;
    const el = targets[0];
    const r = el.getBoundingClientRect();
    let nextL = r.left;
    let nextT = r.top;
    if (mode === 'left') nextL = sRect.left + marginPx;
    else if (mode === 'center-x') nextL = sRect.left + (sRect.width - r.width) / 2;
    else if (mode === 'right') nextL = sRect.right - r.width - marginPx;
    else if (mode === 'top') nextT = sRect.top + marginPx;
    else if (mode === 'center-y') nextT = sRect.top + (sRect.height - r.height) / 2;
    else if (mode === 'bottom') nextT = sRect.bottom - r.height - marginPx;

    setElementLeftTopPx(el, nextL, nextT, sRect);
    positionSelectionOverlay();
    syncInspectorGeometry(el);
    if (typeof updateSlideConnectors === 'function') updateSlideConnectors();
    saveHistorySnapshot();
    showToast('슬라이드 기준으로 정렬되었습니다.');
    return;
  }

  // Multiple elements -> align relative to group bounding box
  const rects = targets.map(el => ({ el, r: el.getBoundingClientRect() }));
  const minL = Math.min(...rects.map(x => x.r.left));
  const maxR = Math.max(...rects.map(x => x.r.right));
  const minT = Math.min(...rects.map(x => x.r.top));
  const maxB = Math.max(...rects.map(x => x.r.bottom));
  const midX = (minL + maxR) / 2;
  const midY = (minT + maxB) / 2;

  rects.forEach(({ el, r }) => {
    let nextL = r.left;
    let nextT = r.top;
    if (mode === 'left') nextL = minL;
    else if (mode === 'center-x') nextL = midX - r.width / 2;
    else if (mode === 'right') nextL = maxR - r.width;
    else if (mode === 'top') nextT = minT;
    else if (mode === 'center-y') nextT = midY - r.height / 2;
    else if (mode === 'bottom') nextT = maxB - r.height;

    setElementLeftTopPx(el, nextL, nextT, sRect);
  });

  positionSelectionOverlay();
  if (selectedElement) syncInspectorGeometry(selectedElement);
  if (typeof recordRepeatableAction === 'function') recordRepeatableAction(`맞춤 정렬 (${mode})`, () => alignSelectedElements(mode));
  saveHistorySnapshot(`맞춤 정렬 (${mode})`);
  showToast(`${targets.length}개 선택 요소가 정렬되었습니다.`);
}

function centerSelectedOnSlide() {
  const targets = getAlignableTargets();
  const slideEl = slides[currentSlide - 1];
  if (targets.length === 0 || !slideEl) {
    showToast('슬라이드 중앙에 배치할 요소를 먼저 선택해 주세요.');
    return;
  }
  const sRect = slideEl.getBoundingClientRect();
  const gRect = getSelectionGroupRect();
  if (!gRect) return;

  const dx = (sRect.left + sRect.width / 2) - (gRect.left + gRect.width / 2);
  const dy = (sRect.top + sRect.height / 2) - (gRect.top + gRect.height / 2);

  targets.forEach(el => {
    const r = el.getBoundingClientRect();
    setElementLeftTopPx(el, r.left + dx, r.top + dy, sRect);
  });

  positionSelectionOverlay();
  if (selectedElement) syncInspectorGeometry(selectedElement);
  saveHistorySnapshot();
  showToast('슬라이드 정중앙으로 정렬되었습니다.');
}

function distributeSelectedElements(axis) {
  const targets = getAlignableTargets();
  const slideEl = slides[currentSlide - 1];
  if (targets.length < 2 || !slideEl) {
    showToast('간격 균등 분배는 2개 이상의 요소를 다중 선택(Shift+클릭 또는 드래그)한 상태에서 실행하세요.');
    return;
  }
  const scale = typeof getStageScale === 'function' ? getStageScale() : 1;
  const minGapPx = 12 * scale;
  const sRect = slideEl.getBoundingClientRect();
  const items = targets.map(el => ({ el, r: el.getBoundingClientRect() }));

  if (axis === 'horizontal') {
    items.sort((a, b) => a.r.left - b.r.left);
    if (items.length === 2) {
      const totalElW = items[0].r.width + items[1].r.width;
      const equalGap = Math.max(minGapPx, (sRect.width - totalElW) / 3);
      setElementLeftTopPx(items[0].el, sRect.left + equalGap, items[0].r.top, sRect);
      setElementLeftTopPx(items[1].el, sRect.left + equalGap * 2 + items[0].r.width, items[1].r.top, sRect);
    } else {
      const firstL = items[0].r.left;
      const lastR = items[items.length - 1].r.right;
      const totalElW = items.reduce((acc, it) => acc + it.r.width, 0);
      const gap = (lastR - firstL - totalElW) / (items.length - 1);
      let cursorX = firstL;
      items.forEach(it => {
        setElementLeftTopPx(it.el, cursorX, it.r.top, sRect);
        cursorX += it.r.width + gap;
      });
    }
  } else {
    items.sort((a, b) => a.r.top - b.r.top);
    if (items.length === 2) {
      const totalElH = items[0].r.height + items[1].r.height;
      const equalGap = Math.max(minGapPx, (sRect.height - totalElH) / 3);
      setElementLeftTopPx(items[0].el, items[0].r.left, sRect.top + equalGap, sRect);
      setElementLeftTopPx(items[1].el, items[1].r.left, sRect.top + equalGap * 2 + items[0].r.height, sRect);
    } else {
      const firstT = items[0].r.top;
      const lastB = items[items.length - 1].r.bottom;
      const totalElH = items.reduce((acc, it) => acc + it.r.height, 0);
      const gap = (lastB - firstT - totalElH) / (items.length - 1);
      let cursorY = firstT;
      items.forEach(it => {
        setElementLeftTopPx(it.el, it.r.left, cursorY, sRect);
        cursorY += it.r.height + gap;
      });
    }
  }

  positionSelectionOverlay();
  if (selectedElement) syncInspectorGeometry(selectedElement);
  if (typeof recordRepeatableAction === 'function') recordRepeatableAction(`균등 분배 (${axis})`, () => distributeSelectedElements(axis));
  saveHistorySnapshot(`균등 분배 (${axis})`);
  showToast(axis === 'horizontal'
    ? `${items.length}개 요소의 가로 간격이 균등하게 분배되었습니다.`
    : `${items.length}개 요소의 세로 간격이 균등하게 분배되었습니다.`);
}

function groupSelectedElements() {
  const targets = getAlignableTargets();
  if (targets.length < 2) {
    showToast('그룹화할 2개 이상의 요소를 Shift+클릭 또는 빈 공간 드래그로 선택해 주세요.');
    return;
  }
  const groupId = 'grp_' + Date.now();
  targets.forEach(el => el.setAttribute('data-group-id', groupId));
  syncMultiSelectVisuals();
  positionSelectionOverlay();
  saveHistorySnapshot();
  showToast(`🔗 ${targets.length}개 요소가 하나의 그룹으로 묶였습니다.`);
}

function ungroupSelectedElements() {
  const targets = getAlignableTargets();
  if (targets.length === 0) return;
  const activeSlideEl = slides[currentSlide - 1];
  const groupIds = new Set(targets.map(el => el.getAttribute('data-group-id')).filter(Boolean));
  let ungrouped = 0;
  if (activeSlideEl && groupIds.size > 0) {
    groupIds.forEach(gid => {
      activeSlideEl.querySelectorAll(`[data-group-id="${gid}"]`).forEach(member => {
        member.removeAttribute('data-group-id');
        ungrouped++;
      });
    });
  } else {
    targets.forEach(el => {
      if (el.hasAttribute('data-group-id')) { el.removeAttribute('data-group-id'); ungrouped++; }
    });
  }
  isolatedGroupId = null;
  if (ungrouped > 0) {
    syncMultiSelectVisuals();
    positionSelectionOverlay();
    saveHistorySnapshot('그룹 해제');
    showToast('🔓 그룹이 해제되었습니다.');
  } else {
    showToast('해제할 그룹이 없습니다.');
  }
}

function renameLayerElement(targetEl) {
  if (!targetEl) return; const current = targetEl.getAttribute('data-layer-name') || '';
  const nextRaw = window.prompt('새 레이어 이름을 입력하세요 (비워두면 기본 이름으로 복원):', current);
  if (nextRaw === null) return;
  const cleaned = nextRaw.replace(/[<>]/g, '').trim().slice(0, 40);
  if (cleaned) targetEl.setAttribute('data-layer-name', cleaned); else targetEl.removeAttribute('data-layer-name');
  refreshLayerList(); saveHistorySnapshot('레이어 이름 변경');
}
function unlockAllLayersInSlide() {
  const activeSlideEl = slides[currentSlide - 1]; if (!activeSlideEl) return; let unlocked = 0;
  activeSlideEl.querySelectorAll('[data-layer-locked="true"]').forEach(el => { el.removeAttribute('data-layer-locked'); unlocked++; });
  if (activeSlideEl.getAttribute('data-slide-locked') === 'true') { activeSlideEl.removeAttribute('data-slide-locked'); unlocked++; }
  syncSlideLockUI(); refreshLayerList(); if (unlocked > 0) saveHistorySnapshot('모든 잠금 해제');
}
function toggleCurrentSlideLock() {
  const activeSlideEl = slides[currentSlide - 1]; if (!activeSlideEl) return;
  const nextLocked = activeSlideEl.getAttribute('data-slide-locked') !== 'true';
  if (nextLocked) {
    activeSlideEl.setAttribute('data-slide-locked', 'true');
    if (document.activeElement && activeSlideEl.contains(document.activeElement) && typeof document.activeElement.blur === 'function') document.activeElement.blur();
    activeSlideEl.querySelectorAll('[contenteditable="true"]').forEach(ed => ed.setAttribute('contenteditable', 'false'));
    clearSelectionInspector();
  } else {
    activeSlideEl.removeAttribute('data-slide-locked');
    if (typeof isActiveEditing === 'function' ? isActiveEditing() : isEditMode) {
      activeSlideEl.querySelectorAll('[data-editable]').forEach(ed => ed.setAttribute('contenteditable', 'true'));
    }
  }
  syncSlideLockUI(); if (typeof renderLeftFilmstripThumbnails === 'function') renderLeftFilmstripThumbnails(); saveHistorySnapshot(nextLocked ? '슬라이드 잠금' : '슬라이드 잠금 해제');
}
function syncSlideLockUI() {
  const activeSlideEl = slides[currentSlide - 1], isLocked = Boolean(activeSlideEl && activeSlideEl.getAttribute('data-slide-locked') === 'true'), btn = $studio('slideLockToggleBtn');
  if (btn) { btn.classList.toggle('is-active', isLocked); btn.textContent = isLocked ? '🔒 슬라이드 잠금됨' : '🔓 슬라이드 잠금'; }
}
function matchSelectedElementsSize(mode) {
  const targets = getAlignableTargets(), slideEl = slides[currentSlide - 1];
  if (targets.length < 2 || !slideEl) {
    showToast('크기를 맞출 2개 이상의 잠금 해제된 요소를 Shift+클릭으로 다중 선택해 주세요.');
    return;
  }
  const scale = typeof getStageScale === 'function' ? getStageScale() : 1;
  const sRect = slideEl.getBoundingClientRect(), refRect = targets[0].getBoundingClientRect();
  const refLogicalW = refRect.width / scale;
  const refLogicalH = refRect.height / scale;
  const refWPct = sRect.width > 0 && refRect.width > 0 ? (refRect.width / sRect.width) * 100 : (parseFloat(targets[0].style.width) || 20);
  const refHPct = sRect.height > 0 && refRect.height > 0 ? (refRect.height / sRect.height) * 100 : (parseFloat(targets[0].style.height) || 20);
  const refIsCard = targets[0].classList.contains('slide-card') && !targets[0].classList.contains('ppt-free-obj');
  if (refIsCard) {
    const refGb = targets[0].closest('.slide-grid-body');
    if (refGb && refGb.getAttribute('data-bento-2d') !== 'true') {
      const refAll = Array.from(refGb.querySelectorAll(':scope > .slide-card'));
      initFlexibleBentoGrid(refGb, refAll, refAll.map(c => c.getBoundingClientRect()));
    }
  }
  const refBento = refIsCard ? getBento2DCoords(targets[0]) : null;

  const updatedSelection = [targets[0]];
  targets.slice(1).forEach(el => {
    if (el.classList.contains('slide-card') && !el.classList.contains('ppt-free-obj')) {
      const gridBody = el.closest('.slide-grid-body');
      if (gridBody) {
        const allCards = Array.from(gridBody.querySelectorAll(':scope > .slide-card'));
        if (gridBody.getAttribute('data-bento-2d') !== 'true') {
          initFlexibleBentoGrid(gridBody, allCards, allCards.map(c => c.getBoundingClientRect()));
        }
        const cur = getBento2DCoords(el);
        const targetSpan = refBento ? refBento.cw : Math.max(3, Math.min(24, Math.round((refLogicalW / LOGICAL_STAGE_WIDTH) * 24)));
        const targetRowSpan = refBento ? refBento.rh : Math.max(3, Math.min(24, Math.round((refLogicalH / Math.max(140, getGridBodyInnerHeight(gridBody, scale))) * 24)));
        const nextCw = (mode === 'width' || mode === 'both') ? Math.min(25 - cur.cs, targetSpan) : cur.cw;
        const nextRh = (mode === 'height' || mode === 'both') ? Math.min(25 - cur.rs, targetRowSpan) : cur.rh;
        applyBento2DCoords(el, cur.cs, nextCw, cur.rs, nextRh);
        syncBento2DMultiRowClass(gridBody);
      }
      updatedSelection.push(el);
      return;
    }
    const targetNode = el.classList.contains('ppt-free-obj') ? el : detachElementToFreeLayer(el);
    if (!targetNode) return;
    if (mode === 'width' || mode === 'both') targetNode.style.width = `${Math.max(4, Math.min(96, refWPct)).toFixed(2)}%`;
    if (mode === 'height' || mode === 'both') targetNode.style.height = `${Math.max(4, Math.min(96, refHPct)).toFixed(2)}%`;
    updatedSelection.push(targetNode);
  });

  selectedElements = updatedSelection;
  selectedElement = updatedSelection[updatedSelection.length - 1] || null;
  syncMultiSelectVisuals();
  positionSelectionOverlay();
  if (selectedElement) syncInspectorGeometry(selectedElement);
  if (typeof updateSlideConnectors === 'function') updateSlideConnectors();
  if (typeof recordRepeatableAction === 'function') recordRepeatableAction(`크기 동일 맞추기 (${mode})`, () => matchSelectedElementsSize(mode));
  saveHistorySnapshot(`크기 동일 맞추기 (${mode})`);
  showToast(`${updatedSelection.length}개 요소의 크기가 동일하게 맞춰졌습니다.`);
}
let isPasteboardModeEnabled = false;
function togglePasteboardMode() {
  isPasteboardModeEnabled = !isPasteboardModeEnabled; document.body.classList.toggle('pasteboard-mode', isPasteboardModeEnabled);
  const btn = $studio('pasteboardToggleBtn'); if (btn) { btn.classList.toggle('is-active', isPasteboardModeEnabled); btn.textContent = isPasteboardModeEnabled ? '🖼 대지 보관 ON' : '🖼 대지 보관 OFF'; }
}
let isStageRulersVisible = false;
function toggleStageRulers() {
  isStageRulersVisible = !isStageRulersVisible;
  const rTop = document.getElementById('pptRulerTop'), rLeft = document.getElementById('pptRulerLeft');
  if (rTop) rTop.classList.toggle('hidden', !isStageRulersVisible); if (rLeft) rLeft.classList.toggle('hidden', !isStageRulersVisible);
  const btn = $studio('stageRulerToggleBtn'); if (btn) { btn.classList.toggle('is-active', isStageRulersVisible); btn.textContent = isStageRulersVisible ? '📏 눈금자 ON' : '📏 눈금자 OFF'; }
  if (isStageRulersVisible) renderRulerTicks();
}
function renderRulerTicks() {
  if (!isStageRulersVisible) return;
  const activeSlideEl = slides[currentSlide - 1] || document.querySelector('.slide.active'), rTop = document.getElementById('pptRulerTop'), rLeft = document.getElementById('pptRulerLeft');
  if (!activeSlideEl || !rTop || !rLeft) return;
  const sRect = activeSlideEl.getBoundingClientRect(), scale = typeof getStageScale === 'function' ? getStageScale() : 1; let topHtml = '';
  for (let lx = 0; lx <= LOGICAL_STAGE_WIDTH; lx += 120) { const sx = sRect.left + lx * scale; if (sx >= 0 && sx <= window.innerWidth) topHtml += `<span style="position:absolute;left:${Math.round(sx)}px;top:2px;border-left:1px solid #94A3B8;padding-left:2px;height:16px;">${lx}</span>`; }
  rTop.innerHTML = topHtml;
  let leftHtml = ''; const leftOffsetTop = rLeft.getBoundingClientRect().top;
  for (let ly = 0; ly <= LOGICAL_STAGE_HEIGHT; ly += 90) { const sy = sRect.top + ly * scale - leftOffsetTop; if (sy >= 0 && sy <= rLeft.clientHeight) leftHtml += `<span style="position:absolute;top:${Math.round(sy)}px;left:1px;border-top:1px solid #94A3B8;width:20px;font-size:8px;">${ly}</span>`; }
  rLeft.innerHTML = leftHtml;
  repositionPersistentGuides();
}
function repositionPersistentGuides() {
  const stage = document.getElementById('slideStage'), activeSlideEl = slides[currentSlide - 1] || document.querySelector('.slide.active');
  if (!stage || !activeSlideEl) return;
  const sRect = activeSlideEl.getBoundingClientRect(), stRect = stage.getBoundingClientRect(), scale = typeof getStageScale === 'function' ? getStageScale() : 1;
  stage.querySelectorAll('.ppt-persistent-guide').forEach(guide => {
    const axis = guide.getAttribute('data-guide-axis');
    const p = parseFloat(guide.getAttribute('data-guide-pos') || '0') || 0;
    if (axis === 'x') guide.style.left = `${Math.round((sRect.left - stRect.left) + p * scale)}px`;
    else guide.style.top = `${Math.round((sRect.top - stRect.top) + p * scale)}px`;
  });
}
function addPersistentGuide(axis, logicalPos) {
  const stage = document.getElementById('slideStage'), activeSlideEl = slides[currentSlide - 1] || document.querySelector('.slide.active'); if (!stage || !activeSlideEl) return;
  if (!isStageRulersVisible) toggleStageRulers();
  const posVal = typeof logicalPos === 'number' ? logicalPos : (axis === 'x' ? 720 : 160), guide = document.createElement('div');
  guide.className = 'ppt-persistent-guide'; guide.setAttribute('data-guide-axis', axis); guide.setAttribute('data-guide-pos', String(Math.round(posVal)));
  const positionGuide = () => { const sRect = activeSlideEl.getBoundingClientRect(), stRect = stage.getBoundingClientRect(), scale = typeof getStageScale === 'function' ? getStageScale() : 1, p = parseFloat(guide.getAttribute('data-guide-pos') || '0') || 0; if (axis === 'x') guide.style.left = `${Math.round((sRect.left - stRect.left) + p * scale)}px`; else guide.style.top = `${Math.round((sRect.top - stRect.top) + p * scale)}px`; };
  positionGuide();
  guide.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); const onMove = (me) => { const sRect = activeSlideEl.getBoundingClientRect(), scale = typeof getStageScale === 'function' ? getStageScale() : 1; const nextLogical = axis === 'x' ? Math.max(0, Math.min(LOGICAL_STAGE_WIDTH, Math.round((me.clientX - sRect.left) / scale))) : Math.max(0, Math.min(LOGICAL_STAGE_HEIGHT, Math.round((me.clientY - sRect.top) / scale))); guide.setAttribute('data-guide-pos', String(nextLogical)); positionGuide(); }; const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); });
  guide.addEventListener('dblclick', (e) => { e.stopPropagation(); guide.remove(); });
  stage.appendChild(guide);
}
function clearPersistentGuides() { document.querySelectorAll('.ppt-persistent-guide').forEach(g => g.remove()); }

let isAutoSwitchInspectorTab = true;
function toggleAutoSwitchInspectorTab(checked) {
  isAutoSwitchInspectorTab = Boolean(checked);
}

function autoSwitchStudioTabForElement(el) {
  if (!isAutoSwitchInspectorTab || !(typeof isActiveEditing === 'function' ? isActiveEditing() : isEditMode)) return;
  if (currentStudioTab === 'arrange' || currentStudioTab === 'deck') return;
  if (currentStudioTab === 'design' || !el) {
    if (typeof switchStudioTab === 'function') switchStudioTab('design');
  }
  if (typeof expandStudioAccordionSection !== 'function') return;
  if (!el) {
    expandStudioAccordionSection('design-theme', false);
    return;
  }
  const shapeType = el.getAttribute('data-shape-type') || '';
  if (el.classList.contains('ppt-interactive-widget')) {
    expandStudioAccordionSection('design-card', true);
  } else if (el.classList.contains('ppt-chart-widget') || shapeType === 'chart') {
    expandStudioAccordionSection('design-chart', true);
  } else if (el.tagName === 'IMG' || el.tagName === 'VIDEO' || el.classList.contains('card-inline-media') || el.classList.contains('image-slot-box') || shapeType === 'image' || shapeType === 'video' || shapeType === 'audio' || shapeType === 'embed') {
    expandStudioAccordionSection('design-media', true);
  } else if (el.classList.contains('slide-card') || el.classList.contains('slide-header-bar') || el.classList.contains('sub-box') || (shapeType && shapeType !== 'textbox')) {
    expandStudioAccordionSection('design-card', true);
  } else {
    expandStudioAccordionSection('design-text', true);
  }
}

function updateContextualTopBar(el) {
  const modes = ['default', 'text', 'media', 'shape', 'chart'];
  let activeMode = 'default';
  if (el) {
    const shapeType = el.getAttribute('data-shape-type') || '';
    if (el.classList.contains('ppt-interactive-widget')) {
      activeMode = 'shape';
    } else if (el.classList.contains('ppt-chart-widget') || shapeType === 'chart') {
      activeMode = 'chart';
    } else if (el.tagName === 'IMG' || el.tagName === 'VIDEO' || el.classList.contains('card-inline-media') || el.classList.contains('image-slot-box') || shapeType === 'image' || shapeType === 'video') {
      activeMode = 'media';
    } else if (el.classList.contains('slide-card') || el.classList.contains('slide-header-bar') || el.classList.contains('sub-box') || (shapeType && shapeType !== 'textbox')) {
      activeMode = 'shape';
    } else if (el.hasAttribute('data-editable') || el.classList.contains('card-inner-textbox') || shapeType === 'textbox' || el.matches('h1, h2, h3, h4, p, blockquote, li, span')) {
      activeMode = 'text';
    } else {
      activeMode = 'shape';
    }
  }
  modes.forEach(m => {
    const pane = document.getElementById(`ctxBar-${m}`);
    if (pane) {
      pane.classList.toggle('hidden', m !== activeMode);
      pane.classList.toggle('flex', m === activeMode);
    }
  });
  if (el) syncPixelAndPaddingInputs(el);
}

function syncPixelAndPaddingInputs(el) {
  if (!el) return;
  const slideEl = slides[currentSlide - 1];
  const sRect = slideEl ? slideEl.getBoundingClientRect() : null;
  const r = el.getBoundingClientRect();
  const scale = typeof getStageScale === 'function' ? getStageScale() : 1;
  if (sRect && sRect.width > 0 && r.width > 0) {
    if ($studio('inspPxW')) $studio('inspPxW').value = String(Math.round(r.width / scale));
    if ($studio('inspPxH')) $studio('inspPxH').value = String(Math.round(r.height / scale));
  }
  const cs = window.getComputedStyle(el);
  if ($studio('inspPaddingPx')) $studio('inspPaddingPx').value = String(Math.round(parseFloat(el.style.padding || cs.paddingTop) || 0));
  const lockBtn = $studio('elementAspectLockBtn');
  if (lockBtn) {
    const isLocked = el.getAttribute('data-aspect-lock') === 'true';
    lockBtn.classList.toggle('is-active', isLocked);
    lockBtn.textContent = isLocked ? '🔒 비율잠금' : '🔓 비율자유';
  }
}

function toggleElementAspectLock() {
  const targets = selectedElements.length > 0 ? selectedElements : (selectedElement ? [selectedElement] : []);
  if (targets.length === 0) return;
  const nextLock = targets[0].getAttribute('data-aspect-lock') !== 'true';
  targets.forEach(el => {
    if (nextLock) el.setAttribute('data-aspect-lock', 'true');
    else el.removeAttribute('data-aspect-lock');
  });
  syncPixelAndPaddingInputs(targets[0]);
  saveHistorySnapshot(nextLock ? '화면비 고정 잠금' : '화면비 잠금 해제');
}

function applyInspectorPixelGeometry() {
  if (!selectedElement) return;
  const activeSlideEl = slides[currentSlide - 1];
  if ((typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(false)) || selectedElement.getAttribute('data-layer-locked') === 'true') {
    showToast('잠긴 요소나 슬라이드의 픽셀 크기는 변경할 수 없습니다.');
    syncPixelAndPaddingInputs(selectedElement);
    return;
  }
  const scale = typeof getStageScale === 'function' ? getStageScale() : 1;
  const curRect = selectedElement.getBoundingClientRect();
  const curW = Math.max(1, Math.round(curRect.width / scale));
  const curH = Math.max(1, Math.round(curRect.height / scale));
  const rawW = Number($studio('inspPxW')?.value), rawH = Number($studio('inspPxH')?.value);
  let pxW = Math.max(24, Math.min(LOGICAL_STAGE_WIDTH, Number.isFinite(rawW) && rawW > 0 ? rawW : curW));
  let pxH = Math.max(24, Math.min(LOGICAL_STAGE_HEIGHT, Number.isFinite(rawH) && rawH > 0 ? rawH : curH));
  if (selectedElement.getAttribute('data-aspect-lock') === 'true' && curW > 0 && curH > 0) {
    const studioDoc = (typeof studioPopupWin !== 'undefined' && studioPopupWin && !studioPopupWin.closed) ? studioPopupWin.document : document;
    const activeId = (studioDoc.activeElement && studioDoc.activeElement.id) || (document.activeElement && document.activeElement.id) || '';
    if (activeId === 'inspPxH') pxW = Math.max(24, Math.min(LOGICAL_STAGE_WIDTH, Math.round((pxH * curW) / curH)));
    else pxH = Math.max(24, Math.min(LOGICAL_STAGE_HEIGHT, Math.round((pxW * curH) / curW)));
  }
  if (!selectedElement.classList.contains('ppt-free-obj')) {
    detachElementToFreeLayer(selectedElement);
  }
  selectedElement.style.width = ((pxW / LOGICAL_STAGE_WIDTH) * 100).toFixed(2) + '%';
  selectedElement.style.height = ((pxH / LOGICAL_STAGE_HEIGHT) * 100).toFixed(2) + '%';
  positionSelectionOverlay();
  syncInspectorGeometry(selectedElement);
  if (typeof updateSlideConnectors === 'function') updateSlideConnectors();
  saveHistorySnapshot('픽셀 크기 직접 입력');
}

function applyElementPaddingPx(rawPx) {
  const activeSlideEl = slides[currentSlide - 1];
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) {
    showToast('잠긴 슬라이드의 여백은 변경할 수 없습니다.');
    return;
  }
  const rawTargets = selectedElements.length > 0 ? selectedElements : (selectedElement ? [selectedElement] : []);
  const targets = rawTargets.filter(el => el && el.getAttribute('data-layer-locked') !== 'true' && !el.classList.contains('ppt-interactive-widget'));
  if (targets.length === 0) return;
  const px = Math.max(0, Math.min(120, Math.round(Number(rawPx) || 0)));
  targets.forEach(el => { el.style.padding = `${px}px`; });
  positionSelectionOverlay();
  saveHistorySnapshot('내부 여백(Padding) 변경');
}
