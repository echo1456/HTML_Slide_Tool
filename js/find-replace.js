/* ==================== GLOBAL FIND & REPLACE ACROSS ALL SLIDES (v5.5.2 Modularized) ==================== */
let __findMatchesList = [], __activeFindMatchIdx = -1;
function openFindReplaceModal(focusReplace) {
  const modal = document.getElementById('findReplaceModal'); if (!modal) return;
  if (typeof openModalSafe === 'function') openModalSafe(modal);
  else { modal.classList.remove('hidden'); modal.classList.add('flex'); modal.style.display = 'flex'; }
  const findInp = document.getElementById('findQueryInput'), repInp = document.getElementById('replaceQueryInput');
  if (focusReplace && repInp) { repInp.focus(); repInp.select(); } else if (findInp) { findInp.focus(); findInp.select(); }
  runSlideFindSearch();
}
function closeFindReplaceModal() { const m = document.getElementById('findReplaceModal'); if (m) { if (typeof closeModalSafe === 'function') closeModalSafe(m); else { m.classList.add('hidden'); m.classList.remove('flex'); m.style.display = 'none'; } } }
function collectSlideTextMatches(query, caseSensitive) {
  const results = []; if (!query) return results;
  const needle = caseSensitive ? query : query.toLowerCase();
  slides.forEach((slideEl, sIdx) => {
    const walker = document.createTreeWalker(slideEl, NodeFilter.SHOW_TEXT, { acceptNode(node) { const p = node.parentElement; if (!p || p.closest('.card-edit-controls, .img-edit-overlay, .sub-box-del-btn, .card-media-controls, .table-col-resizer, .table-row-resizer, .iw-edit-bar, .chart-scenario-bar, .iw-flip-cue, .iw-hs-dot, .ppt-slide-comment-badge, .embed-widget-drag-bar, .yt-local-hint-bar, .yt-poster-card, .ppt-audio-widget button, .deferred-embed-consent, .ppt-slide-master-layer, [data-slide-number-token="true"]')) return NodeFilter.FILTER_REJECT; return node.nodeValue && node.nodeValue.trim().length > 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; } });
    let textNode;
    while ((textNode = walker.nextNode())) {
      const hay = caseSensitive ? textNode.nodeValue : textNode.nodeValue.toLowerCase(); let pos = 0;
      while ((pos = hay.indexOf(needle, pos)) !== -1) {
        const snippet = textNode.nodeValue.slice(Math.max(0, pos - 14), Math.min(textNode.nodeValue.length, pos + query.length + 18)).replace(/\s+/g, ' ');
        results.push({ slideNum: sIdx + 1, textNode, offset: pos, length: query.length, snippet }); pos += Math.max(1, needle.length);
      }
    }
  });
  return results;
}
function syncChartJsonAfterTextNodeEdit(textNode) {
  const el = textNode && textNode.parentElement ? textNode.parentElement : null;
  if (!el) return;
  const widget = el.closest('.ppt-chart-widget');
  if (!widget || typeof readChartData !== 'function') return;
  const d = readChartData(widget);
  if (!d) return;
  const titleH4 = widget.querySelector('h4');
  if (titleH4 && titleH4.contains(textNode)) {
    d.title = titleH4.textContent.trim();
  }
  const cellEl = el.closest('th[data-cell-key], td[data-cell-key]');
  if (cellEl && d.type === 'table') {
    const colIdx = parseInt(cellEl.getAttribute('data-col-idx') || '-1', 10);
    const rowKey = cellEl.getAttribute('data-row-key');
    const txt = typeof extractEditableCellText === 'function' ? extractEditableCellText(cellEl) : cellEl.textContent.trim();
    if (rowKey === 'header' && d.tableHeaders && colIdx >= 0 && colIdx < d.tableHeaders.length) {
      d.tableHeaders[colIdx] = txt;
    } else {
      const rIdx = parseInt(rowKey || '-1', 10);
      if (d.tableRows && d.tableRows[rIdx] && colIdx >= 0 && colIdx < d.tableRows[rIdx].length) {
        d.tableRows[rIdx][colIdx] = txt;
        const isSummaryRow = Array.isArray(d.summaryRowIndices) && d.summaryRowIndices.includes(rIdx);
        if (!isSummaryRow && typeof recalculateTableSummaryRows === 'function' && recalculateTableSummaryRows(d)) {
          d.summaryRowIndices.forEach(sIdx => {
            const sRow = d.tableRows[sIdx];
            if (!sRow) return;
            sRow.forEach((val, col) => {
              const tdEl = widget.querySelector(`td[data-cell-key="td-${sIdx}-${col}"]`);
              if (tdEl && tdEl !== cellEl) {
                const resizers = Array.from(tdEl.querySelectorAll('.table-col-resizer, .table-row-resizer'));
                tdEl.textContent = val;
                resizers.forEach(rz => tdEl.appendChild(rz));
              }
            });
          });
        }
      }
    }
  }
  const blurAttr = el.getAttribute('data-on-blur') || el.getAttribute('onblur') || '';
  const mLbl = blurAttr.match(/onChartLabelInlineEdit\(this,\s*(\d+)\)/);
  if (mLbl && d.items && d.items[parseInt(mLbl[1], 10)]) {
    d.items[parseInt(mLbl[1], 10)].label = el.textContent.trim();
  }
  const mSub = blurAttr.match(/onChartSubInlineEdit\(this,\s*(\d+)\)/);
  if (mSub && d.items && d.items[parseInt(mSub[1], 10)]) {
    d.items[parseInt(mSub[1], 10)].sub = el.textContent.trim();
  }
  widget.setAttribute('data-chart-json', JSON.stringify(d));
}

function renderSlideFindResultsList() {
  const query = document.getElementById('findQueryInput')?.value || '';
  const countEl = document.getElementById('findMatchCountBadge'), listEl = document.getElementById('findMatchResultsList');
  if (countEl) {
    countEl.textContent = query
      ? (__findMatchesList.length > 0 ? `${Math.max(1, __activeFindMatchIdx + 1)} / ${__findMatchesList.length}건` : '0건 일치')
      : '검색어 입력';
  }
  if (!listEl) return;
  if (!query) { listEl.innerHTML = '<div class="text-[11px] text-muted text-center py-4">전체 슬라이드에서 찾을 단어나 문장을 입력하세요.</div>'; return; }
  if (__findMatchesList.length === 0) { listEl.innerHTML = '<div class="text-[11px] text-rose-600 font-bold text-center py-4">일치하는 텍스트가 없습니다.</div>'; return; }
  listEl.innerHTML = __findMatchesList.slice(0, 60).map((m, idx) => `<button type="button" data-on-click="jumpToFindMatch(${idx})" class="w-full px-3 py-2 rounded-lg border ${idx === __activeFindMatchIdx ? 'border-gopro bg-gopro/10' : 'border-borderline bg-white hover:border-gopro'} text-left flex items-center justify-between gap-2 text-xs cursor-pointer"><span class="truncate text-ink">...${escapeAttr(m.snippet)}...</span><span class="font-mono text-[10px] font-bold text-gopro shrink-0">P.${String(m.slideNum).padStart(2, '0')}</span></button>`).join('');
}

function runSlideFindSearch(preserveActiveIdx) {
  const query = document.getElementById('findQueryInput')?.value || '', caseSensitive = Boolean(document.getElementById('findCaseSensitiveChk')?.checked);
  __findMatchesList = collectSlideTextMatches(query, caseSensitive);
  if (__findMatchesList.length === 0) {
    __activeFindMatchIdx = -1;
  } else if (preserveActiveIdx && __activeFindMatchIdx >= 0) {
    __activeFindMatchIdx = Math.min(__activeFindMatchIdx, __findMatchesList.length - 1);
  } else {
    __activeFindMatchIdx = 0;
  }
  renderSlideFindResultsList();
}

function jumpToFindMatch(idx) {
  if (__findMatchesList.length === 0) return;
  const safeIdx = ((idx % __findMatchesList.length) + __findMatchesList.length) % __findMatchesList.length;
  __activeFindMatchIdx = safeIdx;
  const match = __findMatchesList[safeIdx]; if (!match) return;
  goToSlide(match.slideNum);
  const rawParent = match.textNode && match.textNode.parentElement ? match.textNode.parentElement : null;
  const targetEl = rawParent ? (rawParent.closest('th[data-cell-key], td[data-cell-key], [data-editable]') || rawParent) : null;
  if (targetEl && (typeof isActiveEditing === 'function' ? isActiveEditing() : isEditMode) && typeof selectElementForInspector === 'function') {
    selectElementForInspector(targetEl);
  }
  renderSlideFindResultsList();
}

function findNextMatch() {
  if (__findMatchesList.length === 0) {
    runSlideFindSearch(false);
    if (__findMatchesList.length === 0) return;
    jumpToFindMatch(0);
    return;
  }
  jumpToFindMatch(__activeFindMatchIdx + 1);
}

function isFindMatchLocked(textNode) {
  const el = textNode && textNode.parentElement ? textNode.parentElement : null;
  if (!el) return false;
  return Boolean(el.closest('.slide[data-slide-locked="true"], [data-layer-locked="true"]'));
}

function replaceCurrentFindMatch() {
  const switchedIntoEdit = !isEditMode;
  if (typeof isInteractiveTestMode !== 'undefined' && isInteractiveTestMode && typeof toggleInteractiveTestMode === 'function') toggleInteractiveTestMode(false);
  if (switchedIntoEdit && typeof toggleEditMode === 'function') toggleEditMode(true);
  const query = document.getElementById('findQueryInput')?.value || '', replaceWith = document.getElementById('replaceQueryInput')?.value ?? ''; if (!query) return;
  if (switchedIntoEdit || __findMatchesList.length === 0) runSlideFindSearch(true);
  if (__findMatchesList.length === 0) return;
  const curIdx = Math.max(0, Math.min(__activeFindMatchIdx, __findMatchesList.length - 1));
  const match = __findMatchesList[curIdx]; if (!match || !match.textNode || !match.textNode.parentNode) return;
  if (isFindMatchLocked(match.textNode)) {
    showToast('잠긴 슬라이드 또는 잠긴 레이어의 텍스트는 치환할 수 없습니다.');
    return;
  }
  const orig = match.textNode.nodeValue;
  match.textNode.nodeValue = orig.slice(0, match.offset) + replaceWith + orig.slice(match.offset + match.length);
  syncChartJsonAfterTextNodeEdit(match.textNode);
  saveHistorySnapshot(`텍스트 바꾸기 ("${query.slice(0, 12)}")`);
  __activeFindMatchIdx = curIdx;
  runSlideFindSearch(true);
  if (__findMatchesList.length > 0) jumpToFindMatch(Math.min(curIdx, __findMatchesList.length - 1));
}

function replaceAllFindMatches() {
  if (typeof isInteractiveTestMode !== 'undefined' && isInteractiveTestMode && typeof toggleInteractiveTestMode === 'function') toggleInteractiveTestMode(false);
  if (!isEditMode && typeof toggleEditMode === 'function') toggleEditMode(true);
  const query = document.getElementById('findQueryInput')?.value || '', replaceWith = document.getElementById('replaceQueryInput')?.value ?? '', caseSensitive = Boolean(document.getElementById('findCaseSensitiveChk')?.checked);
  if (!query) return;
  const matches = collectSlideTextMatches(query, caseSensitive); if (matches.length === 0) return;
  const byNode = new Map();
  let replacedCount = 0;
  let skippedLocked = 0;
  matches.forEach(m => {
    if (isFindMatchLocked(m.textNode)) { skippedLocked++; return; }
    if (!byNode.has(m.textNode)) byNode.set(m.textNode, []);
    byNode.get(m.textNode).push(m);
    replacedCount++;
  });
  if (replacedCount === 0) {
    showToast(`일치 항목 ${skippedLocked}건이 모두 잠긴 슬라이드/레이어에 있어 치환되지 않았습니다.`);
    return;
  }
  byNode.forEach((nodeMatches, textNode) => {
    let val = textNode.nodeValue;
    nodeMatches.sort((a, b) => b.offset - a.offset).forEach(m => { val = val.slice(0, m.offset) + replaceWith + val.slice(m.offset + m.length); });
    textNode.nodeValue = val;
    syncChartJsonAfterTextNodeEdit(textNode);
  });
  saveHistorySnapshot(`모두 바꾸기 (${replacedCount}건)`); runSlideFindSearch(false);
  showToast(skippedLocked > 0
    ? `총 ${replacedCount}건 치환 완료 (잠긴 슬라이드·레이어 ${skippedLocked}건 보호됨)`
    : `전체 슬라이드에서 총 ${replacedCount}건이 일괄 치환되었습니다!`);
}
