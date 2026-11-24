/* ==================== 24-COLUMN BENTO GRID & GROUP PROPORTIONAL RESIZER ==================== */
function toggleCardLinkedResize(checked) {
  isCardLinkedResizeEnabled = Boolean(checked);
  showToast(isCardLinkedResizeEnabled
    ? '🔗 카드 연동 리사이즈 ON — 크기 조절 시 인접 카드 비율이 자동 보정되어 레이아웃이 유지됩니다.'
    : '🔓 카드 독립 리사이즈 OFF — 선택한 카드만 개별 크기로 조절됩니다.');
}

function groupCardsIntoVisualRows(cards, rects) {
  const rows = [];
  cards.forEach((card, idx) => {
    const r = rects[idx];
    let targetRow = rows.find(row => Math.abs(row.top - r.top) < 28);
    if (!targetRow) {
      targetRow = { top: r.top, height: r.height, items: [] };
      rows.push(targetRow);
    }
    targetRow.height = Math.max(targetRow.height, r.height);
    targetRow.items.push({ card, idx, rect: r });
  });
  rows.sort((a, b) => a.top - b.top);
  rows.forEach(row => row.items.sort((a, b) => a.rect.left - b.rect.left));
  return rows;
}

function getGridBodyInnerHeight(gridBody, scale) {
  const stScale = scale || (typeof getStageScale === 'function' ? getStageScale() : 1);
  const gbCs = window.getComputedStyle(gridBody);
  const padY = (parseFloat(gbCs.paddingTop) || 0) + (parseFloat(gbCs.paddingBottom) || 0);
  const logicalH = gridBody.clientHeight > 0 ? gridBody.clientHeight : (gridBody.getBoundingClientRect().height / stScale);
  return Math.max(140, Math.floor(logicalH - padY));
}

function setCardProportionalHeightPx(card, px, innerTotalH) {
  const h = Math.max(54, Math.min(innerTotalH, Math.round(px)));
  card.style.height = `${h}px`;
  card.style.minHeight = `${h}px`;
  card.style.maxHeight = `${h}px`;
  if (innerTotalH > 0) {
    card.setAttribute('data-bento-h-ratio', (h / innerTotalH).toFixed(6));
  }
}

function stripLegacyGridClasses(gridBody, cards) {
  if (gridBody && gridBody.classList) {
    Array.from(gridBody.classList).forEach(cls => {
      if (/^(?:sm:|md:|lg:|xl:)?grid-cols-\d+$/.test(cls)) {
        gridBody.classList.remove(cls);
      }
    });
  }
  cards.forEach(card => {
    if (!card || !card.classList) return;
    Array.from(card.classList).forEach(cls => {
      if (/^(?:sm:|md:|lg:|xl:)?col-span-\d+$/.test(cls) || cls === 'flex-1' || cls === 'max-w-4xl' || cls === 'w-full') {
        card.classList.remove(cls);
      }
    });
  });
}

function applyBento2DCoords(card, cs, cw, rs, rh) {
  if (!card) return;
  const cStart = Math.max(1, Math.min(22, Math.round(cs) || 1));
  const cSpan = Math.max(3, Math.min(25 - cStart, Math.round(cw) || 12));
  const rStart = Math.max(1, Math.min(22, Math.round(rs) || 1));
  const rSpan = Math.max(3, Math.min(25 - rStart, Math.round(rh) || 24));
  card.dataset.bentoStartCol = String(cStart);
  card.dataset.bentoSpan = String(cSpan);
  card.dataset.bentoStartRow = String(rStart);
  card.dataset.bentoRowSpan = String(rSpan);
  card.style.gridColumn = `${cStart} / span ${cSpan}`;
  card.style.gridRow = `${rStart} / span ${rSpan}`;
  card.style.height = '100%';
  card.style.minHeight = '0';
  card.style.maxHeight = 'none';
  card.style.marginTop = '0';
  card.style.alignSelf = 'stretch';
}

function getBento2DCoords(card) {
  if (!card) return { cs: 1, cw: 24, rs: 1, rh: 24, cEnd: 25, rEnd: 25 };
  const cs = Math.max(1, Math.min(22, parseInt(card.dataset.bentoStartCol || '1', 10) || 1));
  const cw = Math.max(3, Math.min(25 - cs, parseInt(card.dataset.bentoSpan || '12', 10) || 12));
  const rs = Math.max(1, Math.min(22, parseInt(card.dataset.bentoStartRow || '1', 10) || 1));
  const rh = Math.max(3, Math.min(25 - rs, parseInt(card.dataset.bentoRowSpan || '24', 10) || 24));
  return { cs, cw, rs, rh, cEnd: cs + cw, rEnd: rs + rh };
}

function syncBento2DMultiRowClass(gridBody) {
  if (!gridBody) return;
  const cards = Array.from(gridBody.querySelectorAll(':scope > .slide-card'));
  const hasSplitRows = cards.some(c => getBento2DCoords(c).rh < 20);
  gridBody.classList.toggle('has-multi-rows', hasSplitRows);
}

function buildBento2DOccupancy(gridBody, excludeCard) {
  const occ = Array.from({ length: 24 }, () => new Array(24).fill(false));
  if (!gridBody) return occ;
  const cards = Array.from(gridBody.querySelectorAll(':scope > .slide-card'));
  cards.forEach(c => {
    if (c === excludeCard) return;
    const { cs, cw, rs, rh } = getBento2DCoords(c);
    for (let r = rs - 1; r < Math.min(24, rs - 1 + rh); r++) {
      for (let col = cs - 1; col < Math.min(24, cs - 1 + cw); col++) {
        occ[r][col] = true;
      }
    }
  });
  return occ;
}

function findLargestEmptyBentoRect(gridBody, excludeCard, mustContainCell) {
  const occ = buildBento2DOccupancy(gridBody, excludeCard);
  const heights = new Array(24).fill(0);
  let best = null;
  for (let r = 0; r < 24; r++) {
    for (let c = 0; c < 24; c++) {
      heights[c] = occ[r][c] ? 0 : heights[c] + 1;
    }
    for (let c1 = 0; c1 < 24; c1++) {
      let minH = heights[c1];
      if (minH < 3) continue;
      for (let c2 = c1; c2 < 24; c2++) {
        minH = Math.min(minH, heights[c2]);
        if (minH < 3) break;
        const w = c2 - c1 + 1;
        if (w < 3) continue;
        const rTop = r - minH + 1;
        if (mustContainCell) {
          const mc = mustContainCell.col - 1, mr = mustContainCell.row - 1;
          if (mc < c1 || mc > c2 || mr < rTop || mr > r) continue;
        }
        const area = w * minH;
        if (!best || area > best.area || (area === best.area && (rTop < best.rs - 1 || c1 < best.cs - 1))) {
          best = { cs: c1 + 1, cw: w, rs: rTop + 1, rh: minH, area };
        }
      }
    }
  }
  return (best && best.cw >= 4 && best.rh >= 4) ? best : null;
}

function fillVacatedBentoRect(gridBody, vacated) {
  if (!gridBody || !vacated) return;
  const cards = Array.from(gridBody.querySelectorAll(':scope > .slide-card'));
  if (cards.length === 0) return;
  const vCEnd = vacated.cs + vacated.cw;
  const vREnd = vacated.rs + vacated.rh;

  const checkExpand = (side) => {
    const neighbors = cards.filter(c => {
      const b = getBento2DCoords(c);
      if (side === 'left') return b.cEnd === vacated.cs && b.rs >= vacated.rs && b.rEnd <= vREnd;
      if (side === 'right') return b.cs === vCEnd && b.rs >= vacated.rs && b.rEnd <= vREnd;
      if (side === 'top') return b.rEnd === vacated.rs && b.cs >= vacated.cs && b.cEnd <= vCEnd;
      if (side === 'bottom') return b.rs === vREnd && b.cs >= vacated.cs && b.cEnd <= vCEnd;
      return false;
    });
    if (neighbors.length === 0) return false;
    if (side === 'left' || side === 'right') {
      const coveredRows = neighbors.reduce((acc, c) => acc + getBento2DCoords(c).rh, 0);
      if (coveredRows !== vacated.rh) return false;
      neighbors.forEach(c => {
        const b = getBento2DCoords(c);
        if (side === 'left') applyBento2DCoords(c, b.cs, b.cw + vacated.cw, b.rs, b.rh);
        else applyBento2DCoords(c, b.cs - vacated.cw, b.cw + vacated.cw, b.rs, b.rh);
      });
      return true;
    } else {
      const coveredCols = neighbors.reduce((acc, c) => acc + getBento2DCoords(c).cw, 0);
      if (coveredCols !== vacated.cw) return false;
      neighbors.forEach(c => {
        const b = getBento2DCoords(c);
        if (side === 'top') applyBento2DCoords(c, b.cs, b.cw, b.rs, b.rh + vacated.rh);
        else applyBento2DCoords(c, b.cs, b.cw, b.rs - vacated.rh, b.rh + vacated.rh);
      });
      return true;
    }
  };
  if (checkExpand('left') || checkExpand('right') || checkExpand('top') || checkExpand('bottom')) {
    syncBento2DMultiRowClass(gridBody);
  }
}

function initFlexibleBentoGrid(gridBody, cards, initialCardRects) {
  if (!gridBody || cards.length === 0) return;

  const already2D = gridBody.getAttribute('data-bento-2d') === 'true' && cards.every(c =>
    c.dataset.bentoStartCol && c.dataset.bentoSpan && c.dataset.bentoStartRow && c.dataset.bentoRowSpan
  );
  if (already2D) {
    cards.forEach(c => {
      const b = getBento2DCoords(c);
      applyBento2DCoords(c, b.cs, b.cw, b.rs, b.rh);
    });
    syncBento2DMultiRowClass(gridBody);
    return;
  }

  const gridRect = gridBody.getBoundingClientRect();
  const gbCs = window.getComputedStyle(gridBody);
  const padX = (parseFloat(gbCs.paddingLeft) || 0) + (parseFloat(gbCs.paddingRight) || 0);
  const totalW = Math.max(300, gridRect.width - padX);
  const rects = initialCardRects && initialCardRects.length === cards.length
    ? initialCardRects
    : cards.map(c => c.getBoundingClientRect());
  const rows = groupCardsIntoVisualRows(cards, rects);
  const rawRowSumH = rows.reduce((acc, r) => acc + Math.max(1, r.height), 0);

  stripLegacyGridClasses(gridBody, cards);

  const rowSpans = rows.map(r => Math.max(4, Math.round((Math.max(1, r.height) / Math.max(1, rawRowSumH)) * 24)));
  let rowSum = rowSpans.reduce((a, b) => a + b, 0);
  if (rowSpans.length > 0 && rowSum !== 24) {
    rowSpans[rowSpans.length - 1] = Math.max(4, rowSpans[rowSpans.length - 1] + (24 - rowSum));
    while (rowSpans.reduce((a, b) => a + b, 0) > 24) {
      const maxI = rowSpans.indexOf(Math.max(...rowSpans));
      if (rowSpans[maxI] <= 4) break;
      rowSpans[maxI]--;
    }
  }

  let rowCursor = 1;
  rows.forEach((row, rIdx) => {
    const rh = rowSpans[rIdx] || Math.max(4, Math.floor(24 / Math.max(1, rows.length)));
    const rawColSpans = row.items.map(it => Math.max(3, Math.min(24, Math.round((Math.max(1, it.rect.width) / totalW) * 24))));
    const colSum = rawColSpans.reduce((a, b) => a + b, 0);
    if (colSum !== 24 && rawColSpans.length > 0) {
      rawColSpans[rawColSpans.length - 1] = Math.max(3, rawColSpans[rawColSpans.length - 1] + (24 - colSum));
    }
    let colCursor = 1;
    row.items.forEach((it, i) => {
      const cw = rawColSpans[i];
      applyBento2DCoords(it.card, colCursor, cw, rowCursor, rh);
      colCursor += cw;
    });
    rowCursor += rh;
  });

  gridBody.setAttribute('data-bento-2d', 'true');
  gridBody.style.display = 'grid';
  gridBody.style.gridTemplateColumns = 'repeat(24, minmax(0, 1fr))';
  gridBody.style.gridTemplateRows = 'repeat(24, minmax(0, 1fr))';
  gridBody.style.gridAutoFlow = 'row';
  gridBody.style.alignContent = 'stretch';
  gridBody.style.overflowY = 'hidden';
  syncBento2DMultiRowClass(gridBody);
}

function resizeGridCardProportionally(card, dir, dx, dy, gridBody, initialCardRects, initialMarginTop) {
  const cards = Array.from(gridBody.querySelectorAll(':scope > .slide-card'));
  const cardIdx = cards.indexOf(card);
  if (cardIdx === -1) return;

  if (gridBody.getAttribute('data-bento-2d') !== 'true') {
    initFlexibleBentoGrid(gridBody, cards, initialCardRects);
  }

  if (!card._bentoDragInit) {
    cards.forEach(c => { c._bentoDragInit = getBento2DCoords(c); });
  }

  const gridRect = gridBody.getBoundingClientRect();
  const gbCs = window.getComputedStyle(gridBody);
  const padX = (parseFloat(gbCs.paddingLeft) || 0) + (parseFloat(gbCs.paddingRight) || 0);
  const padY = (parseFloat(gbCs.paddingTop) || 0) + (parseFloat(gbCs.paddingBottom) || 0);
  const totalW = Math.max(240, gridRect.width - padX);
  const totalH = Math.max(160, gridRect.height - padY);
  const deltaCols = Math.round(dx / (totalW / 24));
  const deltaRows = Math.round(dy / (totalH / 24));

  const work = new Map();
  cards.forEach(c => {
    const init = c._bentoDragInit || getBento2DCoords(c);
    work.set(c, { cs: init.cs, cw: init.cw, rs: init.rs, rh: init.rh, cEnd: init.cEnd, rEnd: init.rEnd });
  });

  const meInit = card._bentoDragInit;
  const meWork = work.get(card);

  const clampAgainstObstaclesX = (targetCard, nextCs, nextCEnd, ignoreSet) => {
    let cs = nextCs, cEnd = nextCEnd;
    const tb = targetCard._bentoDragInit;
    cards.forEach(o => {
      if (o === targetCard || ignoreSet.has(o)) return;
      const ob = o._bentoDragInit;
      if (ob.rs < tb.rEnd && ob.rEnd > tb.rs) {
        if (dir.includes('e') && ob.cs >= tb.cEnd && cEnd > ob.cs) cEnd = ob.cs;
        if (dir.includes('w') && ob.cEnd <= tb.cs && cs < ob.cEnd) cs = ob.cEnd;
      }
    });
    return { cs, cEnd };
  };

  const clampAgainstObstaclesY = (targetCard, nextRs, nextREnd, ignoreSet) => {
    let rs = nextRs, rEnd = nextREnd;
    const tb = targetCard._bentoDragInit;
    cards.forEach(o => {
      if (o === targetCard || ignoreSet.has(o)) return;
      const ob = o._bentoDragInit;
      if (ob.cs < tb.cEnd && ob.cEnd > tb.cs) {
        if (dir.includes('s') && ob.rs >= tb.rEnd && rEnd > ob.rs) rEnd = ob.rs;
        if (dir.includes('n') && ob.rEnd <= tb.rs && rs < ob.rEnd) rs = ob.rEnd;
      }
    });
    return { rs, rEnd };
  };

  // 1. Horizontal 2D Seam Resize (East / West)
  if (dir.includes('e')) {
    const seam = meInit.cEnd;
    const rightNeighbors = isCardLinkedResizeEnabled
      ? cards.filter(o => o !== card && o._bentoDragInit.cs === seam && o._bentoDragInit.rs < meInit.rEnd && o._bentoDragInit.rEnd > meInit.rs)
      : [];
    if (rightNeighbors.length > 0) {
      const rMinRow = Math.min(meInit.rs, ...rightNeighbors.map(o => o._bentoDragInit.rs));
      const rMaxRow = Math.max(meInit.rEnd, ...rightNeighbors.map(o => o._bentoDragInit.rEnd));
      const leftGroup = cards.filter(o => o._bentoDragInit.cEnd === seam && o._bentoDragInit.rs < rMaxRow && o._bentoDragInit.rEnd > rMinRow);
      const rightGroup = cards.filter(o => o._bentoDragInit.cs === seam && o._bentoDragInit.rs < rMaxRow && o._bentoDragInit.rEnd > rMinRow);
      const maxShrink = Math.min(...leftGroup.map(o => o._bentoDragInit.cw - 3));
      const maxGrow = Math.min(...rightGroup.map(o => o._bentoDragInit.cw - 3));
      const clamped = Math.max(-maxShrink, Math.min(maxGrow, deltaCols));
      leftGroup.forEach(o => { const w = work.get(o); w.cw = o._bentoDragInit.cw + clamped; w.cEnd = w.cs + w.cw; });
      rightGroup.forEach(o => { const w = work.get(o); w.cs = o._bentoDragInit.cs + clamped; w.cw = o._bentoDragInit.cw - clamped; w.cEnd = w.cs + w.cw; });
    } else {
      const rawEnd = Math.max(meInit.cs + 3, Math.min(25, meInit.cEnd + deltaCols));
      const { cEnd } = clampAgainstObstaclesX(card, meInit.cs, rawEnd, new Set());
      meWork.cw = Math.max(3, cEnd - meInit.cs);
      meWork.cEnd = meWork.cs + meWork.cw;
    }
  } else if (dir.includes('w')) {
    const seam = meInit.cs;
    const leftNeighbors = isCardLinkedResizeEnabled
      ? cards.filter(o => o !== card && o._bentoDragInit.cEnd === seam && o._bentoDragInit.rs < meInit.rEnd && o._bentoDragInit.rEnd > meInit.rs)
      : [];
    if (leftNeighbors.length > 0) {
      const rMinRow = Math.min(meInit.rs, ...leftNeighbors.map(o => o._bentoDragInit.rs));
      const rMaxRow = Math.max(meInit.rEnd, ...leftNeighbors.map(o => o._bentoDragInit.rEnd));
      const leftGroup = cards.filter(o => o._bentoDragInit.cEnd === seam && o._bentoDragInit.rs < rMaxRow && o._bentoDragInit.rEnd > rMinRow);
      const rightGroup = cards.filter(o => o._bentoDragInit.cs === seam && o._bentoDragInit.rs < rMaxRow && o._bentoDragInit.rEnd > rMinRow);
      const maxLeftShrink = Math.min(...leftGroup.map(o => o._bentoDragInit.cw - 3));
      const maxRightShrink = Math.min(...rightGroup.map(o => o._bentoDragInit.cw - 3));
      const clamped = Math.max(-maxLeftShrink, Math.min(maxRightShrink, deltaCols));
      leftGroup.forEach(o => { const w = work.get(o); w.cw = o._bentoDragInit.cw + clamped; w.cEnd = w.cs + w.cw; });
      rightGroup.forEach(o => { const w = work.get(o); w.cs = o._bentoDragInit.cs + clamped; w.cw = o._bentoDragInit.cw - clamped; w.cEnd = w.cs + w.cw; });
    } else {
      const rawStart = Math.max(1, Math.min(meInit.cEnd - 3, meInit.cs + deltaCols));
      const { cs } = clampAgainstObstaclesX(card, rawStart, meInit.cEnd, new Set());
      meWork.cs = cs;
      meWork.cw = Math.max(3, meInit.cEnd - cs);
      meWork.cEnd = meWork.cs + meWork.cw;
    }
  }

  // 2. Vertical 2D Seam Resize (South / North) — Leaves adjacent full-height columns untouched!
  if (dir.includes('s')) {
    const seam = meInit.rEnd;
    const bottomNeighbors = isCardLinkedResizeEnabled
      ? cards.filter(o => o !== card && o._bentoDragInit.rs === seam && o._bentoDragInit.cs < meInit.cEnd && o._bentoDragInit.cEnd > meInit.cs)
      : [];
    if (bottomNeighbors.length > 0) {
      const cMinCol = Math.min(meInit.cs, ...bottomNeighbors.map(o => o._bentoDragInit.cs));
      const cMaxCol = Math.max(meInit.cEnd, ...bottomNeighbors.map(o => o._bentoDragInit.cEnd));
      const topGroup = cards.filter(o => o._bentoDragInit.rEnd === seam && o._bentoDragInit.cs < cMaxCol && o._bentoDragInit.cEnd > cMinCol);
      const bottomGroup = cards.filter(o => o._bentoDragInit.rs === seam && o._bentoDragInit.cs < cMaxCol && o._bentoDragInit.cEnd > cMinCol);
      const maxShrink = Math.min(...topGroup.map(o => o._bentoDragInit.rh - 3));
      const maxGrow = Math.min(...bottomGroup.map(o => o._bentoDragInit.rh - 3));
      const clamped = Math.max(-maxShrink, Math.min(maxGrow, deltaRows));
      topGroup.forEach(o => { const w = work.get(o); w.rh = o._bentoDragInit.rh + clamped; w.rEnd = w.rs + w.rh; });
      bottomGroup.forEach(o => { const w = work.get(o); w.rs = o._bentoDragInit.rs + clamped; w.rh = o._bentoDragInit.rh - clamped; w.rEnd = w.rs + w.rh; });
    } else {
      const rawEnd = Math.max(meInit.rs + 3, Math.min(25, meInit.rEnd + deltaRows));
      const { rEnd } = clampAgainstObstaclesY(card, meInit.rs, rawEnd, new Set());
      meWork.rh = Math.max(3, rEnd - meInit.rs);
      meWork.rEnd = meWork.rs + meWork.rh;
    }
  } else if (dir.includes('n')) {
    const seam = meInit.rs;
    const topNeighbors = isCardLinkedResizeEnabled
      ? cards.filter(o => o !== card && o._bentoDragInit.rEnd === seam && o._bentoDragInit.cs < meInit.cEnd && o._bentoDragInit.cEnd > meInit.cs)
      : [];
    if (topNeighbors.length > 0) {
      const cMinCol = Math.min(meInit.cs, ...topNeighbors.map(o => o._bentoDragInit.cs));
      const cMaxCol = Math.max(meInit.cEnd, ...topNeighbors.map(o => o._bentoDragInit.cEnd));
      const topGroup = cards.filter(o => o._bentoDragInit.rEnd === seam && o._bentoDragInit.cs < cMaxCol && o._bentoDragInit.cEnd > cMinCol);
      const bottomGroup = cards.filter(o => o._bentoDragInit.rs === seam && o._bentoDragInit.cs < cMaxCol && o._bentoDragInit.cEnd > cMinCol);
      const maxTopShrink = Math.min(...topGroup.map(o => o._bentoDragInit.rh - 3));
      const maxBottomShrink = Math.min(...bottomGroup.map(o => o._bentoDragInit.rh - 3));
      const clamped = Math.max(-maxTopShrink, Math.min(maxBottomShrink, deltaRows));
      topGroup.forEach(o => { const w = work.get(o); w.rh = o._bentoDragInit.rh + clamped; w.rEnd = w.rs + w.rh; });
      bottomGroup.forEach(o => { const w = work.get(o); w.rs = o._bentoDragInit.rs + clamped; w.rh = o._bentoDragInit.rh - clamped; w.rEnd = w.rs + w.rh; });
    } else {
      const rawStart = Math.max(1, Math.min(meInit.rEnd - 3, meInit.rs + deltaRows));
      const { rs } = clampAgainstObstaclesY(card, rawStart, meInit.rEnd, new Set());
      meWork.rs = rs;
      meWork.rh = Math.max(3, meInit.rEnd - rs);
      meWork.rEnd = meWork.rs + meWork.rh;
    }
  }

  cards.forEach(c => {
    const w = work.get(c);
    applyBento2DCoords(c, w.cs, w.cw, w.rs, w.rh);
  });
  syncBento2DMultiRowClass(gridBody);
}

function resizeMultipleGridCardsProportionally(selectedCards, dir, dx, dy, gridBody, allCards, initialAllRects, initialMarginTops) {
  if (!gridBody || selectedCards.length === 0) return;

  if (gridBody.getAttribute('data-bento-2d') !== 'true') {
    initFlexibleBentoGrid(gridBody, allCards, initialAllRects);
  }

  // Snapshot all cards' initial 2D coords on the first move tick
  if (!selectedCards[0]._bentoDragInit) {
    allCards.forEach(c => { c._bentoDragInit = getBento2DCoords(c); });
  }

  const gridRect = gridBody.getBoundingClientRect();
  const gbCs = window.getComputedStyle(gridBody);
  const padX = (parseFloat(gbCs.paddingLeft) || 0) + (parseFloat(gbCs.paddingRight) || 0);
  const padY = (parseFloat(gbCs.paddingTop) || 0) + (parseFloat(gbCs.paddingBottom) || 0);
  const totalW = Math.max(240, gridRect.width - padX);
  const totalH = Math.max(160, gridRect.height - padY);
  const deltaCols = Math.round(dx / (totalW / 24));
  const deltaRows = Math.round(dy / (totalH / 24));

  const selectedSet = new Set(selectedCards);
  selectedCards.forEach(card => {
    const init = card._bentoDragInit || getBento2DCoords(card);
    let cs = init.cs, cw = init.cw, rs = init.rs, rh = init.rh;

    if (dir.includes('e')) {
      let rawEnd = Math.max(init.cs + 3, Math.min(25, init.cEnd + deltaCols));
      allCards.forEach(o => {
        if (selectedSet.has(o)) return;
        const ob = o._bentoDragInit || getBento2DCoords(o);
        if (ob.rs < init.rEnd && ob.rEnd > init.rs && ob.cs >= init.cEnd && rawEnd > ob.cs) rawEnd = ob.cs;
      });
      cw = Math.max(3, rawEnd - cs);
    } else if (dir.includes('w')) {
      let rawStart = Math.max(1, Math.min(init.cEnd - 3, init.cs + deltaCols));
      allCards.forEach(o => {
        if (selectedSet.has(o)) return;
        const ob = o._bentoDragInit || getBento2DCoords(o);
        if (ob.rs < init.rEnd && ob.rEnd > init.rs && ob.cEnd <= init.cs && rawStart < ob.cEnd) rawStart = ob.cEnd;
      });
      cs = rawStart;
      cw = Math.max(3, init.cEnd - cs);
    }

    if (dir.includes('s')) {
      let rawEnd = Math.max(init.rs + 3, Math.min(25, init.rEnd + deltaRows));
      allCards.forEach(o => {
        if (selectedSet.has(o)) return;
        const ob = o._bentoDragInit || getBento2DCoords(o);
        if (ob.cs < (cs + cw) && ob.cEnd > cs && ob.rs >= init.rEnd && rawEnd > ob.rs) rawEnd = ob.rs;
      });
      rh = Math.max(3, rawEnd - rs);
    } else if (dir.includes('n')) {
      let rawStart = Math.max(1, Math.min(init.rEnd - 3, init.rs + deltaRows));
      allCards.forEach(o => {
        if (selectedSet.has(o)) return;
        const ob = o._bentoDragInit || getBento2DCoords(o);
        if (ob.cs < (cs + cw) && ob.cEnd > cs && ob.rEnd <= init.rs && rawStart < ob.rEnd) rawStart = ob.rEnd;
      });
      rs = rawStart;
      rh = Math.max(3, init.rEnd - rs);
    }

    applyBento2DCoords(card, cs, cw, rs, rh);
  });
  syncBento2DMultiRowClass(gridBody);
}

function applyGroupProportionalTransform(snapshots, initGroupRect, dir, dx, dy, slideRect, unlockAspect, fromCenter) {
  let anchorX = initGroupRect.left;
  let anchorY = initGroupRect.top;
  if (fromCenter) {
    anchorX = initGroupRect.left + initGroupRect.width / 2;
    anchorY = initGroupRect.top + initGroupRect.height / 2;
  } else {
    if (dir.includes('w')) anchorX = initGroupRect.right;
    if (dir.includes('n')) anchorY = initGroupRect.bottom;
  }

  const mult = fromCenter ? 2 : 1;
  let targetW = initGroupRect.width;
  let targetH = initGroupRect.height;

  if (dir.includes('e')) targetW = Math.max(24, initGroupRect.width + dx * mult);
  if (dir.includes('w')) targetW = Math.max(24, initGroupRect.width - dx * mult);
  if (dir.includes('s')) targetH = Math.max(24, initGroupRect.height + dy * mult);
  if (dir.includes('n')) targetH = Math.max(24, initGroupRect.height - dy * mult);

  let scaleX = targetW / Math.max(1, initGroupRect.width);
  let scaleY = targetH / Math.max(1, initGroupRect.height);

  const isCorner = (dir === 'nw' || dir === 'ne' || dir === 'se' || dir === 'sw');
  if (isCorner && !unlockAspect) {
    const uniformScale = Math.abs(dx) >= Math.abs(dy) ? scaleX : scaleY;
    scaleX = uniformScale;
    scaleY = uniformScale;
  } else if (!isCorner && unlockAspect) {
    const uniformScale = (dir === 'e' || dir === 'w') ? scaleX : scaleY;
    scaleX = uniformScale;
    scaleY = uniformScale;
  }

  const uniformFontScale = Math.sqrt(Math.max(0.15, scaleX * scaleY));

  snapshots.forEach(snap => {
    const el = snap.el;
    const newLeftPx = anchorX + (snap.rect.left - anchorX) * scaleX;
    const newTopPx = anchorY + (snap.rect.top - anchorY) * scaleY;
    const newWidthPx = Math.max(14, snap.rect.width * scaleX);
    const newHeightPx = Math.max(14, snap.rect.height * scaleY);

    if (el.classList.contains('ppt-free-obj')) {
      el.style.left = (((newLeftPx - slideRect.left) / slideRect.width) * 100).toFixed(2) + '%';
      el.style.top = (((newTopPx - slideRect.top) / slideRect.height) * 100).toFixed(2) + '%';
      el.style.width = ((newWidthPx / slideRect.width) * 100).toFixed(2) + '%';
      el.style.height = ((newHeightPx / slideRect.height) * 100).toFixed(2) + '%';
    } else {
      const stScale = typeof getStageScale === 'function' ? getStageScale() : 1;
      const deltaX = (newLeftPx - snap.rect.left) / stScale;
      const deltaY = (newTopPx - snap.rect.top) / stScale;
      applyTextOffsetXY(el, Math.round(snap.initOffX + deltaX), Math.round(snap.initOffY + deltaY));
      if (el.classList.contains('image-slot-box') || el.classList.contains('card-inline-media')) {
        delete el.dataset.lockedHeight;
        el.style.maxHeight = 'none';
        el.style.width = Math.round(newWidthPx / stScale) + 'px';
        el.style.minHeight = Math.round(newHeightPx / stScale) + 'px';
        el.style.height = Math.round(newHeightPx / stScale) + 'px';
      }
    }

    snap.fontNodes.forEach(fn => {
      const nextPx = Math.max(9, Math.min(160, Math.round(fn.initFontPx * uniformFontScale)));
      fn.node.style.setProperty('font-size', nextPx + 'px', 'important');
    });
  });
}
