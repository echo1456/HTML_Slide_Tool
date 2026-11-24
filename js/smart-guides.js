/* ==================== SHIFT AXIS LOCK & SMART GUIDES / MAGNETIC SNAP ENGINE ==================== */
function applyShiftAxisLock(rawDx, rawDy, isShiftHeld) {
  if (!isShiftHeld) return { dx: rawDx, dy: rawDy, lockedAxis: null };
  if (Math.abs(rawDx) <= 4 && Math.abs(rawDy) <= 4) {
    return { dx: rawDx, dy: rawDy, lockedAxis: null };
  }
  if (Math.abs(rawDx) >= Math.abs(rawDy)) {
    return { dx: rawDx, dy: 0, lockedAxis: 'x' };
  }
  return { dx: 0, dy: rawDy, lockedAxis: 'y' };
}

function clearSmartGuides() {
  const layer = document.getElementById('pptSmartGuidesLayer');
  if (layer) layer.innerHTML = '';
}

function computeAndRenderSmartGuides(movingEls, proposedLeftPx, proposedTopPx, groupW, groupH, slideEl, lockedAxis) {
  clearSmartGuides();
  if (!isSnapEnabled || !slideEl) {
    return { snappedLeftPx: proposedLeftPx, snappedTopPx: proposedTopPx };
  }
  const layer = document.getElementById('pptSmartGuidesLayer');
  const sRect = slideEl.getBoundingClientRect();
  const scale = getStageScale();
  const SNAP_TOL = Math.max(5, Math.round(7 * scale));

  let snapX = proposedLeftPx;
  let snapY = proposedTopPx;
  let matchedVLine = null;
  let matchedHLine = null;
  let gapHint = null;

  const movingSet = new Set(movingEls);
  const firstEl = movingEls[0];
  const parentCard = (firstEl && !firstEl.classList.contains('ppt-free-obj') && !firstEl.classList.contains('slide-card'))
    ? firstEl.closest('.slide-card')
    : null;

  const vCandidates = [];
  const hCandidates = [];

  if (parentCard) {
    const cRect = parentCard.getBoundingClientRect();
    const padPx = 20 * scale;
    vCandidates.push(
      { pos: cRect.left + cRect.width / 2 },
      { pos: cRect.left + padPx },
      { pos: cRect.right - padPx }
    );
    hCandidates.push(
      { pos: cRect.top + cRect.height / 2 },
      { pos: cRect.top + padPx },
      { pos: cRect.bottom - padPx }
    );
  } else {
    const marginPx = 24 * scale;
    vCandidates.push(
      { pos: sRect.left + sRect.width / 2 },
      { pos: sRect.left + marginPx },
      { pos: sRect.right - marginPx }
    );
    hCandidates.push(
      { pos: sRect.top + sRect.height / 2 },
      { pos: sRect.top + marginPx },
      { pos: sRect.bottom - marginPx }
    );
  }

  const scopeEl = parentCard || slideEl;
  const selector = parentCard
    ? '.sub-box, .card-inline-media, .ppt-chart-widget, .card-inner-textbox, .card-embedded-obj, .hierarchy-tier'
    : '.ppt-free-obj, .slide-card';

  const others = Array.from(scopeEl.querySelectorAll(selector)).filter(el => {
    if (el.style.visibility === 'hidden' || el.style.display === 'none') return false;
    for (const m of movingSet) {
      if (m === el || m.contains(el) || el.contains(m)) return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });

  others.forEach(o => {
    const r = o.getBoundingClientRect();
    vCandidates.push({ pos: r.left }, { pos: r.left + r.width / 2 }, { pos: r.right });
    hCandidates.push({ pos: r.top }, { pos: r.top + r.height / 2 }, { pos: r.bottom });
  });

  if (lockedAxis !== 'y') {
    const myXPoints = [proposedLeftPx, proposedLeftPx + groupW / 2, proposedLeftPx + groupW];
    let bestDx = SNAP_TOL + 1;
    for (const val of myXPoints) {
      for (const cand of vCandidates) {
        const diff = cand.pos - val;
        if (Math.abs(diff) < bestDx) {
          bestDx = Math.abs(diff);
          snapX = proposedLeftPx + diff;
          matchedVLine = cand.pos;
        }
      }
    }
  }

  if (lockedAxis !== 'x') {
    const myYPoints = [proposedTopPx, proposedTopPx + groupH / 2, proposedTopPx + groupH];
    let bestDy = SNAP_TOL + 1;
    for (const val of myYPoints) {
      for (const cand of hCandidates) {
        const diff = cand.pos - val;
        if (Math.abs(diff) < bestDy) {
          bestDy = Math.abs(diff);
          snapY = proposedTopPx + diff;
          matchedHLine = cand.pos;
        }
      }
    }
  }

  // Nearest-neighbor gap distance badge (horizontal or vertical)
  const myRight = snapX + groupW;
  const myBottom = snapY + groupH;
  const maxGapScreen = 160 * scale;
  let bestGapDist = maxGapScreen + 1;

  for (const o of others) {
    const r = o.getBoundingClientRect();
    const verticalOverlap = !(myBottom < r.top + 2 || snapY > r.bottom - 2);
    const horizontalOverlap = !(myRight < r.left + 2 || snapX > r.right - 2);

    if (verticalOverlap && lockedAxis !== 'y') {
      if (snapX >= r.right - 1 && (snapX - r.right) < bestGapDist) {
        bestGapDist = snapX - r.right;
        const logicalPx = Math.round(bestGapDist / scale);
        if (logicalPx > 0) {
          gapHint = { x: (r.right + snapX) / 2, y: Math.max(snapY, r.top) + Math.min(groupH, r.height) / 2, text: `${logicalPx}px` };
        }
      } else if (r.left >= myRight - 1 && (r.left - myRight) < bestGapDist) {
        bestGapDist = r.left - myRight;
        const logicalPx = Math.round(bestGapDist / scale);
        if (logicalPx > 0) {
          gapHint = { x: (myRight + r.left) / 2, y: Math.max(snapY, r.top) + Math.min(groupH, r.height) / 2, text: `${logicalPx}px` };
        }
      }
    }
    if (horizontalOverlap && lockedAxis !== 'x') {
      if (snapY >= r.bottom - 1 && (snapY - r.bottom) < bestGapDist) {
        bestGapDist = snapY - r.bottom;
        const logicalPx = Math.round(bestGapDist / scale);
        if (logicalPx > 0) {
          gapHint = { x: Math.max(snapX, r.left) + Math.min(groupW, r.width) / 2, y: (r.bottom + snapY) / 2, text: `${logicalPx}px` };
        }
      } else if (r.top >= myBottom - 1 && (r.top - myBottom) < bestGapDist) {
        bestGapDist = r.top - myBottom;
        const logicalPx = Math.round(bestGapDist / scale);
        if (logicalPx > 0) {
          gapHint = { x: Math.max(snapX, r.left) + Math.min(groupW, r.width) / 2, y: (myBottom + r.top) / 2, text: `${logicalPx}px` };
        }
      }
    }
  }

  const boundRect = parentCard ? parentCard.getBoundingClientRect() : sRect;
  if (layer) {
    if (matchedVLine !== null) {
      const vEl = document.createElement('div');
      vEl.className = 'smart-guide-line-v';
      vEl.style.left = Math.round(matchedVLine) + 'px';
      vEl.style.top = Math.round(boundRect.top) + 'px';
      vEl.style.height = Math.round(boundRect.height) + 'px';
      layer.appendChild(vEl);
    }
    if (matchedHLine !== null) {
      const hEl = document.createElement('div');
      hEl.className = 'smart-guide-line-h';
      hEl.style.top = Math.round(matchedHLine) + 'px';
      hEl.style.left = Math.round(boundRect.left) + 'px';
      hEl.style.width = Math.round(boundRect.width) + 'px';
      layer.appendChild(hEl);
    }
    if (gapHint) {
      const bEl = document.createElement('div');
      bEl.className = 'smart-guide-gap-badge';
      bEl.style.left = Math.round(gapHint.x) + 'px';
      bEl.style.top = Math.round(gapHint.y) + 'px';
      bEl.textContent = gapHint.text;
      layer.appendChild(bEl);
    }
  }

  return { snappedLeftPx: snapX, snappedTopPx: snapY };
}
