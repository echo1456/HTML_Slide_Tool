/* ==================== NAVIGATION & PROGRESS UI ==================== */
function getSlideTitle(index) {
  const slideEl = slides[index];
  if (!slideEl) return `Slide ${index + 1}`;
  const heading = slideEl.querySelector('h1, h2');
  const rawText = heading
    ? heading.textContent.trim().replace(/\s+/g, ' ')
    : (slideEl.getAttribute('data-section') || `슬라이드 ${index + 1}`);
  return `${String(index + 1).padStart(2, '0')}. ${rawText.slice(0, 24)}`;
}

function buildProgressDots() {
  const fill = document.getElementById('progressBarFill');
  const pct = totalSlides > 0 ? Math.max(2, Math.min(100, Math.round((currentSlide / totalSlides) * 100))) : 0;
  if (fill) {
    fill.style.width = `${pct}%`;
  }
}

function startProgressBarScrub(e, containerEl) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  const track = containerEl.querySelector('div') || containerEl;
  const jumpFromClientX = (clientX) => {
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(0.9999, (clientX - rect.left) / Math.max(1, rect.width)));
    const targetPage = Math.max(1, Math.min(totalSlides, Math.floor(ratio * totalSlides) + 1));
    if (targetPage !== currentSlide) {
      goToSlide(targetPage);
    }
  };
  jumpFromClientX(e.clientX);
  const onMove = (me) => jumpFromClientX(me.clientX);
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function buildModalGrid() {
  const grid = document.getElementById('modalSlideGrid');
  if (!grid) return;
  grid.innerHTML = '';

  if (tocModalMode === 'synced') {
    const primaryTocGrid = document.querySelector('[data-toc-grid]') || document.querySelector('.slide[data-slide="2"]');
    const tocCards = primaryTocGrid ? Array.from(primaryTocGrid.querySelectorAll('.toc-card')) : [];
    if (tocCards.length > 0) {
      tocCards.forEach((card, idx) => {
        const targetSlide = Math.max(1, Math.min(totalSlides, parseInt(card.getAttribute('data-goto-slide') || '1', 10)));
        const numLabel = card.querySelector('.toc-num')?.textContent.trim() || `${String(idx + 1).padStart(2, '0')} →`;
        const titleLabel = card.querySelector('.toc-title')?.textContent.trim() || `목차 항목 ${idx + 1}`;
        const subLabel = card.querySelector('.toc-sub')?.textContent.trim() || `SLIDE ${String(targetSlide).padStart(2, '0')}`;

        const btn = document.createElement('button');
        btn.className = 'text-left p-3.5 rounded-xl border border-borderline hover:border-gopro hover:bg-canvas transition cursor-pointer flex flex-col justify-between';
        btn.innerHTML = `
          <div class="flex items-center justify-between gap-1">
            <span class="font-mono text-[11px] font-bold text-gopro">${escapeAttr(numLabel)}</span>
            <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-gopro/10 text-gopro font-bold">P.${String(targetSlide).padStart(2, '0')}</span>
          </div>
          <div class="text-xs font-extrabold text-ink mt-1.5 line-clamp-1">${escapeAttr(titleLabel)}</div>
          <div class="font-mono text-[10px] text-subtle mt-0.5">${escapeAttr(subLabel)}</div>
        `;
        btn.onclick = () => {
          goToSlide(targetSlide);
          toggleTocModal();
        };
        grid.appendChild(btn);
      });
      return;
    }
  }

  const editingNow = typeof isActiveEditing === 'function' ? isActiveEditing() : isEditMode;
  slides.forEach((sEl, idx) => {
    const isHid = sEl.getAttribute('data-slide-hidden') === 'true';
    if (!editingNow && isHid) return;
    const num = idx + 1;
    const title = getSlideTitle(idx);
    const btn = document.createElement('button');
    btn.className = `text-left p-3 rounded-xl border border-borderline hover:border-gopro hover:bg-canvas transition cursor-pointer ${isHid ? 'opacity-55' : ''}`;
    btn.innerHTML = `<div class="flex items-center justify-between gap-1 font-mono text-[11px] font-bold text-gopro"><span>SLIDE ${String(num).padStart(2, '0')}</span>${isHid ? '<span class="text-[9px] text-amber-600">👁‍🗨 숨김</span>' : ''}</div><div class="text-xs font-bold text-ink mt-0.5 line-clamp-1">${escapeAttr(title.replace(/^\d+\.\s*/, ''))}</div>`;
    btn.onclick = () => {
      goToSlide(num);
      toggleTocModal();
    };
    grid.appendChild(btn);
  });
}

function setTocModalMode(mode) {
  tocModalMode = mode;
  const syncedBtn = document.getElementById('tocTabSyncedBtn');
  const allBtn = document.getElementById('tocTabAllBtn');
  if (syncedBtn && allBtn) {
    if (mode === 'synced') {
      syncedBtn.className = 'px-3 py-1 rounded-full bg-gopro text-white text-xs font-bold cursor-pointer';
      allBtn.className = 'px-3 py-1 rounded-full bg-canvas text-muted hover:text-ink border border-borderline text-xs font-bold cursor-pointer';
    } else {
      allBtn.className = 'px-3 py-1 rounded-full bg-gopro text-white text-xs font-bold cursor-pointer';
      syncedBtn.className = 'px-3 py-1 rounded-full bg-canvas text-muted hover:text-ink border border-borderline text-xs font-bold cursor-pointer';
    }
  }
  buildModalGrid();
}

/* ==================== TOC CARD CLICK & TARGET SLIDE CONFIG ==================== */
function handleTocCardClick(e, cardEl) {
  if (isActiveEditing()) {
    selectElementForInspector(cardEl);
    return;
  }
  const target = parseInt(cardEl.getAttribute('data-goto-slide') || '1', 10);
  if (!isNaN(target)) {
    goToSlide(target);
  }
}

function updateTocCardTargetSlide(slideNumStr) {
  if (!selectedElement || !selectedElement.classList.contains('toc-card')) return;
  const num = Math.max(1, Math.min(totalSlides, parseInt(slideNumStr, 10) || 1));
  selectedElement.setAttribute('data-goto-slide', String(num));
  const subEl = selectedElement.querySelector('.toc-sub');
  if (subEl) {
    subEl.textContent = `SLIDE ${String(num).padStart(2, '0')}`;
  }
  buildModalGrid();
  saveHistorySnapshot();
  showToast(`목차 이동 페이지가 ${num}번 슬라이드로 설정되었습니다.`);
}


function buildTocSlideMarkup(tocItemsHtml, gridColsClass) {
  return `<div class="slide-bg-layer"></div><div class="slide-bg-overlay"></div>
    <div class="slide-header-bar px-6 md:px-12 pt-5 pb-4 border-b border-borderline flex items-center justify-between shrink-0">
      <div>
        <span data-editable class="font-mono text-xs text-gopro font-bold uppercase tracking-wider">AGENDA · CONTENTS</span>
        <h2 data-editable class="text-2xl md:text-4xl font-extrabold tracking-tight mt-0.5">발표 목차 구성</h2>
      </div>
    </div>
    <div data-toc-grid="true" class="slide-grid-body flex-1 grid grid-cols-1 ${gridColsClass} overflow-y-auto safe-scroll">${tocItemsHtml}</div>
    <div class="ppt-free-layer"></div>`;
}

function generateTocAndSlidesByCount(explicitCount, explicitLayout) {
  const stage = document.getElementById('slideStage');
  if (!stage) return;
  const rawCount = explicitCount !== undefined ? explicitCount : ($studio('tocAutoPageCountInput')?.value || '4');
  const count = Math.max(1, Math.min(15, parseInt(rawCount, 10) || 4));
  if ($studio('tocAutoPageCountInput')) $studio('tocAutoPageCountInput').value = String(count);
  const layoutKey = explicitLayout || $studio('tocAutoPageLayoutSelect')?.value || '2col';

  slides = Array.from(document.querySelectorAll('#slideStage .slide'));
  let tocSlideEl = slides.find(s => Boolean(s.querySelector('[data-toc-grid]')));
  let tocIdx = tocSlideEl ? slides.indexOf(tocSlideEl) : -1;

  // Create a clean TOC slide after Slide 1 if none exists yet
  if (!tocSlideEl) {
    tocSlideEl = document.createElement('section');
    tocSlideEl.className = 'slide theme-light';
    tocSlideEl.style.backgroundColor = '#F5F5F7';
    tocSlideEl.setAttribute('data-section', '01 · CONTENTS');
    tocSlideEl.innerHTML = buildTocSlideMarkup('', 'md:grid-cols-2');
    if (slides[0]) {
      slides[0].insertAdjacentElement('afterend', tocSlideEl);
      tocIdx = 1;
    } else {
      stage.appendChild(tocSlideEl);
      tocIdx = 0;
    }
    slides = Array.from(document.querySelectorAll('#slideStage .slide'));
  }

  // Capture any existing custom TOC titles before rebuilding
  const prevTocTitles = Array.from(tocSlideEl.querySelectorAll('.toc-card .toc-title')).map(el => el.textContent.trim()).filter(Boolean);

  // Count content slides currently after the TOC slide
  let contentSlidesAfterToc = slides.slice(tocIdx + 1);
  const prevDefer = typeof __deferHistoryDuringLiveDrag !== 'undefined' ? __deferHistoryDuringLiveDrag : false;
  if (typeof __deferHistoryDuringLiveDrag !== 'undefined') __deferHistoryDuringLiveDrag = true;
  try {
    if (contentSlidesAfterToc.length < count) {
      const needed = count - contentSlidesAfterToc.length;
      const startPartNum = contentSlidesAfterToc.length + 1;
      for (let i = 0; i < needed; i++) {
        slides = Array.from(document.querySelectorAll('#slideStage .slide'));
        currentSlide = slides.length;
        addSlideWithLayout(layoutKey);
        slides = Array.from(document.querySelectorAll('#slideStage .slide'));
        const created = slides[slides.length - 1];
        if (created) {
          const partNum = startPartNum + i;
          const secLabel = `${String(partNum + 1).padStart(2, '0')} · PART ${String(partNum).padStart(2, '0')}`;
          created.setAttribute('data-section', secLabel);
          const badge = created.querySelector('.slide-header-bar span[data-editable]');
          if (badge) badge.textContent = secLabel;
          const h2 = created.querySelector('.slide-header-bar h2, h1, h2');
          if (h2) h2.textContent = prevTocTitles[partNum - 1] || `목차 ${String(partNum).padStart(2, '0')} 핵심 주제`;
        }
      }
    } else if (contentSlidesAfterToc.length > count) {
      const excessCount = contentSlidesAfterToc.length - count;
      const lockedInExcess = contentSlidesAfterToc.slice(count).some(s => s.getAttribute('data-slide-locked') === 'true');
      if (!lockedInExcess && window.confirm(`목차 이후 본문 슬라이드가 현재 ${contentSlidesAfterToc.length}장입니다.\n목차 개수(${count}개)에 맞춰 뒤쪽 ${excessCount}장을 삭제할까요? (취소를 누르면 기존 슬라이드는 유지하고 목차만 ${count}개로 맞춥니다)`)) {
        contentSlidesAfterToc.slice(count).forEach(s => {
          s.querySelectorAll('video, audio').forEach(m => { try { if (!m.paused) m.pause(); } catch (e) {} });
          s.remove();
        });
      }
    }

    slides = Array.from(document.querySelectorAll('#slideStage .slide'));
    tocIdx = slides.indexOf(tocSlideEl);
    const tocSlideNum = tocIdx + 1;
    const gridColsClass = count === 1
      ? 'md:grid-cols-1'
      : ((count === 2 || count === 4) ? 'md:grid-cols-2' : ((count === 3 || count === 5 || count === 6 || count === 9) ? 'md:grid-cols-3' : 'md:grid-cols-4'));
    const padClass = count > 6 ? 'p-5' : (count > 4 ? 'p-6' : 'p-8');
    const titleSizeClass = count > 8 ? 'text-base md:text-lg' : (count > 4 ? 'text-lg md:text-xl' : 'text-xl md:text-2xl');
    const edAttr = (typeof isActiveEditing === 'function' ? isActiveEditing() : isEditMode) ? 'data-editable contenteditable="true"' : 'data-editable';

    const tocCardsHtml = Array.from({ length: count }, (_, idx) => {
      const targetNum = Math.min(slides.length, tocSlideNum + idx + 1);
      const targetSlideEl = slides[targetNum - 1];
      const headingEl = targetSlideEl ? targetSlideEl.querySelector('h1, h2, h3') : null;
      const derivedTitle = prevTocTitles[idx] || (headingEl ? headingEl.textContent.trim().slice(0, 34) : '') || `목차 ${String(idx + 1).padStart(2, '0')} 핵심 주제`;
      return `<div data-goto-slide="${targetNum}" class="slide-card toc-card hover-reactive cursor-pointer ${padClass} border-b md:border-r border-borderline flex flex-col justify-between bg-white" data-hover-init="true" data-on-click="handleTocCardClick(event, this)">
        <div class="card-edit-controls items-center justify-end gap-1 mb-2">
          <button type="button" class="px-2 py-0.5 rounded bg-canvas border border-borderline text-[11px] font-mono" data-on-click="event.stopPropagation(); moveCard(this, -1)" aria-label="이전 위치로 이동" title="이전 위치로 이동">◀ 이전</button>
          <button type="button" class="px-2 py-0.5 rounded bg-canvas border border-borderline text-[11px] font-mono" data-on-click="event.stopPropagation(); moveCard(this, 1)" aria-label="다음 위치로 이동" title="다음 위치로 이동">▶ 다음</button>
          <button type="button" class="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[11px] font-bold" data-on-click="event.stopPropagation(); deleteCard(this)" aria-label="카드 삭제" title="카드 삭제">×</button>
        </div>
        <span class="toc-num font-mono text-xs font-bold text-gopro" ${edAttr}>${String(idx + 1).padStart(2, '0')} →</span>
        <div>
          <div ${edAttr} class="toc-title ${titleSizeClass} font-extrabold text-ink">${escapeAttr(derivedTitle)}</div>
          <div class="toc-sub font-mono text-xs text-subtle mt-1" ${edAttr}>SLIDE ${String(targetNum).padStart(2, '0')}</div>
        </div>
      </div>`;
    }).join('');

    const tocGrid = tocSlideEl.querySelector('[data-toc-grid]');
    if (tocGrid) {
      tocGrid.removeAttribute('data-bento-2d');
      tocGrid.className = `slide-grid-body flex-1 grid grid-cols-1 ${gridColsClass} overflow-y-auto safe-scroll`;
      tocGrid.style.gridTemplateColumns = '';
      tocGrid.style.gridTemplateRows = '';
      tocGrid.innerHTML = tocCardsHtml;
    } else {
      tocSlideEl.innerHTML = buildTocSlideMarkup(tocCardsHtml, gridColsClass);
    }
    // Remove any legacy "+ 목차 추가" button if present on older loaded decks
    tocSlideEl.querySelectorAll('button[data-on-click*="addNewTocCard"]').forEach(b => b.remove());
  } finally {
    if (typeof __deferHistoryDuringLiveDrag !== 'undefined') __deferHistoryDuringLiveDrag = prevDefer;
  }

  if ((typeof isActiveEditing === 'function' ? isActiveEditing() : isEditMode) && typeof makeAllTextEditable === 'function') {
    makeAllTextEditable(true);
  }
  goToSlide(tocIdx + 1);
  saveHistorySnapshot(`목차·페이지 ${count}개 자동 구성`, true);
  showToast(`목차 ${count}개와 연동 본문 페이지(${count}장)가 자동 구성되었습니다!`);
}

function addNewTocCard() {
  const activeSlideEl = slides[currentSlide - 1];
  if (activeSlideEl && activeSlideEl.getAttribute('data-slide-locked') === 'true') {
    showToast('잠긴 슬라이드에는 목차 카드를 추가할 수 없습니다.');
    return;
  }
  const tocGrid = (activeSlideEl && activeSlideEl.querySelector('[data-toc-grid]')) || document.querySelector('[data-toc-grid]') || getActiveGridBody();
  if (!tocGrid) return;
  const count = tocGrid.querySelectorAll('.toc-card').length + 1;
  const targetNum = Math.min(Math.max(1, totalSlides || 1), Math.max(1, count + 1));
  const edAttr = (typeof isActiveEditing === 'function' ? isActiveEditing() : isEditMode) ? 'data-editable contenteditable="true"' : 'data-editable';
  const card = document.createElement('div');
  card.setAttribute('data-goto-slide', String(targetNum));
  card.setAttribute('data-hover-init', 'true');
  card.setAttribute('data-on-click', 'handleTocCardClick(event, this)');
  card.className = 'slide-card toc-card hover-reactive cursor-pointer text-left p-5 md:p-7 border-b border-r border-borderline transition group flex flex-col justify-between';
  card.innerHTML = `
    <div class="card-edit-controls items-center justify-end gap-1 mb-2"><button type="button" data-on-click="event.stopPropagation(); moveCard(this, -1)" class="px-2 py-0.5 rounded bg-canvas border border-borderline text-[11px] font-mono">◀ 이전</button><button type="button" data-on-click="event.stopPropagation(); moveCard(this, 1)" class="px-2 py-0.5 rounded bg-canvas border border-borderline text-[11px] font-mono">▶ 다음</button><button type="button" data-on-click="event.stopPropagation(); deleteCard(this)" class="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[11px] font-bold">×</button></div>
    <span class="toc-num font-mono text-xs font-bold text-gopro" ${edAttr}>${String(count).padStart(2, '0')} →</span>
    <div>
      <div ${edAttr} class="toc-title text-lg md:text-xl font-bold text-ink group-hover:text-gopro transition-colors">새 목차 항목</div>
      <div class="toc-sub font-mono text-[11px] text-subtle mt-1" ${edAttr}>SLIDE ${String(targetNum).padStart(2, '0')}</div>
    </div>
  `;
  tocGrid.appendChild(card);
  selectElementForInspector(card);
  buildModalGrid();
  saveHistorySnapshot();
  showToast('새 목차 카드가 추가되었습니다. 상단 바에서 이동할 슬라이드 번호를 지정하세요.');
}


function updateSingleSlideSubLabel(el, oldNum, newNum) {
  const subEl = el.querySelector('.toc-sub');
  if (!subEl) return;
  const txt = subEl.textContent.trim();
  const singleMatch = txt.match(/^SLIDE\s*0?(\d+)$/i);
  if (singleMatch && parseInt(singleMatch[1], 10) === oldNum) {
    subEl.textContent = `SLIDE ${String(newNum).padStart(2, '0')}`;
  }
}

function shiftGotoSlideTargetsOnInsert(insertedSlideNum) {
  document.querySelectorAll('[data-goto-slide]').forEach(el => {
    const cur = parseInt(el.getAttribute('data-goto-slide') || '0', 10);
    if (!isNaN(cur) && cur >= insertedSlideNum) {
      const next = cur + 1;
      el.setAttribute('data-goto-slide', String(next));
      updateSingleSlideSubLabel(el, cur, next);
    }
  });
  document.querySelectorAll('a[data-inline-link][href^="#slide-"]').forEach(aEl => {
    const m = (aEl.getAttribute('href') || '').match(/^#slide-(\d+)$/i);
    if (!m) return;
    const cur = parseInt(m[1], 10);
    if (cur >= insertedSlideNum) aEl.setAttribute('href', `#slide-${cur + 1}`);
  });
}

function shiftGotoSlideTargetsOnDelete(deletedSlideNum, newTotalSlides) {
  document.querySelectorAll('[data-goto-slide]').forEach(el => {
    const cur = parseInt(el.getAttribute('data-goto-slide') || '0', 10);
    if (isNaN(cur) || cur <= 0) return;
    if (cur > deletedSlideNum) {
      const next = Math.max(1, cur - 1);
      el.setAttribute('data-goto-slide', String(next));
      updateSingleSlideSubLabel(el, cur, next);
    } else if (cur === deletedSlideNum) {
      const clamped = Math.max(1, Math.min(newTotalSlides, deletedSlideNum));
      el.setAttribute('data-goto-slide', String(clamped));
      updateSingleSlideSubLabel(el, cur, clamped);
    }
  });
  document.querySelectorAll('a[data-inline-link][href^="#slide-"]').forEach(aEl => {
    const m = (aEl.getAttribute('href') || '').match(/^#slide-(\d+)$/i);
    if (!m) return;
    const cur = parseInt(m[1], 10);
    if (cur > deletedSlideNum) aEl.setAttribute('href', `#slide-${Math.max(1, cur - 1)}`);
    else if (cur === deletedSlideNum) aEl.setAttribute('href', `#slide-${Math.max(1, Math.min(newTotalSlides, deletedSlideNum))}`);
  });
}

function remapGotoSlideTargetsOnReorder(fromNum, toNum) {
  if (fromNum === toNum) return;
  const remapNum = (n) => {
    if (n === fromNum) return toNum;
    if (fromNum < toNum && n > fromNum && n <= toNum) return n - 1;
    if (fromNum > toNum && n >= toNum && n < fromNum) return n + 1;
    return n;
  };
  document.querySelectorAll('[data-goto-slide]').forEach(el => {
    const cur = parseInt(el.getAttribute('data-goto-slide') || '0', 10);
    if (isNaN(cur) || cur <= 0) return;
    const next = remapNum(cur);
    if (next !== cur) {
      el.setAttribute('data-goto-slide', String(next));
      updateSingleSlideSubLabel(el, cur, next);
    }
  });
  document.querySelectorAll('a[data-inline-link][href^="#slide-"]').forEach(aEl => {
    const m = (aEl.getAttribute('href') || '').match(/^#slide-(\d+)$/i);
    if (!m) return;
    const cur = parseInt(m[1], 10);
    const next = remapNum(cur);
    if (next !== cur) aEl.setAttribute('href', `#slide-${next}`);
  });
}

function swapGotoSlideTargets(slideNumA, slideNumB) {
  document.querySelectorAll('[data-goto-slide]').forEach(el => {
    const cur = parseInt(el.getAttribute('data-goto-slide') || '0', 10);
    if (cur === slideNumA) {
      el.setAttribute('data-goto-slide', String(slideNumB));
      updateSingleSlideSubLabel(el, slideNumA, slideNumB);
    } else if (cur === slideNumB) {
      el.setAttribute('data-goto-slide', String(slideNumA));
      updateSingleSlideSubLabel(el, slideNumB, slideNumA);
    }
  });
  document.querySelectorAll('a[data-inline-link][href^="#slide-"]').forEach(aEl => {
    const m = (aEl.getAttribute('href') || '').match(/^#slide-(\d+)$/i);
    if (!m) return;
    const cur = parseInt(m[1], 10);
    if (cur === slideNumA) aEl.setAttribute('href', `#slide-${slideNumB}`);
    else if (cur === slideNumB) aEl.setAttribute('href', `#slide-${slideNumA}`);
  });
}

function syncTocCardsOrderAndLabels() {
  document.querySelectorAll('[data-toc-grid]').forEach(grid => {
    const cards = Array.from(grid.querySelectorAll('.toc-card'));
    cards.forEach((card, idx) => {
      const numEl = card.querySelector('.toc-num');
      if (numEl) {
        numEl.textContent = `${String(idx + 1).padStart(2, '0')} →`;
      }
      const rawTarget = parseInt(card.getAttribute('data-goto-slide') || '1', 10);
      const clampedTarget = Math.max(1, Math.min(Math.max(1, totalSlides), isNaN(rawTarget) ? 1 : rawTarget));
      card.setAttribute('data-goto-slide', String(clampedTarget));
    });
  });
}

function updateSlideUI() {
  slides = Array.from(document.querySelectorAll('.slide'));
  totalSlides = slides.length;
  if (totalSlides > 0) {
    if (currentSlide < 1) currentSlide = 1;
    if (currentSlide > totalSlides) currentSlide = totalSlides;
  }
  slides.forEach((slide, idx) => {
    const slideNum = idx + 1;
    slide.setAttribute('data-slide', String(slideNum));
    if (slideNum === currentSlide) {
      slide.classList.add('active');
    } else {
      slide.classList.remove('active');
    }
  });

  const curNumEl = document.getElementById('currentSlideNum');
  const totNumEl = document.getElementById('totalSlideNum');
  const secBadgeEl = document.getElementById('headerSectionBadge');
  if (curNumEl) curNumEl.textContent = String(currentSlide).padStart(2, '0');
  if (totNumEl) totNumEl.textContent = String(totalSlides).padStart(2, '0');
  const activeSection = slides[currentSlide - 1] ? (slides[currentSlide - 1].getAttribute('data-section') || '') : '';
  if (secBadgeEl) secBadgeEl.textContent = activeSection;

  if (typeof updateStageViewportScale === 'function') updateStageViewportScale();
  syncTocCardsOrderAndLabels();
  buildProgressDots();
  buildModalGrid();
  refreshLayerList();
  syncTransitionUI();
  syncSpeakerNotesUI();
  syncSlideHiddenUI();
  syncSlideCommentsBadge();
  if (typeof syncSlideNumberTokens === 'function') syncSlideNumberTokens();
  if (typeof renderLeftFilmstripThumbnails === 'function') renderLeftFilmstripThumbnails();
  if (typeof syncSlideLockUI === 'function') syncSlideLockUI();
  const bgPicker = $studio('slideBgColorPicker');
  if (bgPicker && slides[currentSlide - 1] && typeof rgbToHex === 'function') {
    const curBgHex = rgbToHex(slides[currentSlide - 1].style.backgroundColor || window.getComputedStyle(slides[currentSlide - 1]).backgroundColor);
    if (curBgHex && /^#[0-9a-fA-F]{6}$/.test(curBgHex)) bgPicker.value = curBgHex;
  }
  if (typeof syncBuildOrderUI === 'function') syncBuildOrderUI(selectedElement);
  syncPresenterWindowState();
}

function handleSlideAudioTransition(prevNum, nextNum) {
  if (prevNum === nextNum) return;
  const prevSlideEl = slides[prevNum - 1]; if (!prevSlideEl) return;
  prevSlideEl.querySelectorAll('audio').forEach(aud => { if (aud.getAttribute('data-audio-persist') !== 'true' && !aud.paused) { try { aud.pause(); } catch (e) {} } });
  prevSlideEl.querySelectorAll('video').forEach(vid => { if (!vid.paused) { try { vid.pause(); } catch (e) {} } });
}

function findNextVisibleSlideIndex(startNum, dir) {
  let idx = startNum + dir;
  while (idx >= 1 && idx <= totalSlides) {
    const el = slides[idx - 1];
    const activeEdit = typeof isActiveEditing === 'function' ? isActiveEditing() : isEditMode;
    if (activeEdit || !el || el.getAttribute('data-slide-hidden') !== 'true') return idx;
    idx += dir;
  }
  return -1;
}

function goToSlide(num) {
  slides = Array.from(document.querySelectorAll('.slide'));
  totalSlides = slides.length;
  if (num < 1) num = 1;
  if (num > totalSlides) num = totalSlides;
  const prevNum = currentSlide;
  currentSlide = num;
  handleSlideAudioTransition(prevNum, currentSlide);
  clearSelectionInspector();
  if (typeof clearScreenDrawing === 'function') clearScreenDrawing(true);
  const targetSlideEl = slides[currentSlide - 1];
  if (targetSlideEl && typeof initSlideBuildSteps === 'function') initSlideBuildSteps(targetSlideEl);
  updateSlideUI();
  if (targetSlideEl && (!isEditMode || isInteractiveTestMode) && typeof animateSlideKpisAndCharts === 'function') {
    requestAnimationFrame(() => animateSlideKpisAndCharts(targetSlideEl));
  }
}

function nextSlide() {
  const activeSlideEl = slides[currentSlide - 1];
  if ((!isEditMode || isInteractiveTestMode) && activeSlideEl && typeof advanceSlideBuildStep === 'function') {
    if (advanceSlideBuildStep(activeSlideEl)) { syncPresenterWindowState(); return; }
  }
  const nextVisible = findNextVisibleSlideIndex(currentSlide, 1);
  if (nextVisible !== -1) goToSlide(nextVisible);
  else showToast('마지막 슬라이드입니다.');
}

function prevSlide() {
  const activeSlideEl = slides[currentSlide - 1];
  if ((!isEditMode || isInteractiveTestMode) && activeSlideEl && typeof rewindSlideBuildStep === 'function') {
    if (rewindSlideBuildStep(activeSlideEl)) { syncPresenterWindowState(); return; }
  }
  const prevVisible = findNextVisibleSlideIndex(currentSlide, -1);
  if (prevVisible !== -1) goToSlide(prevVisible);
  else showToast('첫 번째 슬라이드입니다.');
}

/* ==================== FOCUS HIGHLIGHT, MODAL & FULLSCREEN ==================== */
function toggleFocusMode() {
  document.body.classList.toggle('focus-mode');
  const active = document.body.classList.contains('focus-mode');
  if (typeof syncPresenterWindowState === 'function') syncPresenterWindowState();
  showToast(active
    ? '✦ 핵심 키워드 형광 강조 ON (단축키: H)'
    : '핵심 키워드 형광 강조 OFF');
}

function toggleTocModal() {
  const modal = document.getElementById('tocModal');
  if (!modal) return;
  if (modal.classList.contains('hidden')) {
    if (typeof openModalSafe === 'function') openModalSafe(modal);
    else { modal.classList.remove('hidden'); modal.classList.add('flex'); modal.style.display = 'flex'; }
  } else {
    if (typeof closeModalSafe === 'function') closeModalSafe(modal);
    else { modal.classList.add('hidden'); modal.classList.remove('flex'); modal.style.display = 'none'; }
  }
}

function toggleFullScreen() {
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    if (typeof isEditMode !== 'undefined' && isEditMode && typeof toggleEditMode === 'function') {
      __wasEditingBeforeFullscreen = true;
      toggleEditMode(false);
    }
    const reqFs = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
    if (reqFs) {
      reqFs.call(document.documentElement).catch(() => {
        showToast('브라우저에서 F11 키를 눌러 전체화면을 실행해 주세요.');
      });
    } else {
      showToast('브라우저에서 F11 키를 눌러 전체화면을 실행해 주세요.');
    }
  } else {
    const exitFs = document.exitFullscreen || document.webkitExitFullscreen;
    if (exitFs) exitFs.call(document);
  }
}

/* ==================== GRID LAYOUT, CARD & SLIDE MANAGEMENT ==================== */
function setSlideLayout(mode) {
  const activeSlideEl = slides[currentSlide - 1];
  if (activeSlideEl && activeSlideEl.getAttribute('data-slide-locked') === 'true') {
    showToast('잠긴 슬라이드의 레이아웃은 변경할 수 없습니다.');
    return;
  }
  const gridBody = getActiveGridBody();
  if (!gridBody) return;
  gridBody.removeAttribute('data-bento-2d');
  gridBody.style.display = '';
  gridBody.className = 'slide-grid-body flex-1 grid overflow-y-auto safe-scroll ';
  gridBody.style.gridTemplateColumns = '';
  gridBody.style.gridTemplateRows = '';
  gridBody.style.gridAutoFlow = '';
  gridBody.style.alignContent = '';
  gridBody.style.gridAutoRows = '';
  let cards = Array.from(gridBody.querySelectorAll(':scope > .slide-card'));
  if (cards.length === 0 && typeof addCardToCurrentSlide === 'function') {
    const needed = mode === '3col' ? 3 : (mode === '1col' ? 1 : 2);
    const prevDefer = typeof __deferHistoryDuringLiveDrag !== 'undefined' ? __deferHistoryDuringLiveDrag : false;
    if (typeof __deferHistoryDuringLiveDrag !== 'undefined') __deferHistoryDuringLiveDrag = true;
    try {
      for (let k = 0; k < needed; k++) addCardToCurrentSlide('text');
    } finally {
      if (typeof __deferHistoryDuringLiveDrag !== 'undefined') __deferHistoryDuringLiveDrag = prevDefer;
    }
    cards = Array.from(gridBody.querySelectorAll(':scope > .slide-card'));
    gridBody.removeAttribute('data-bento-2d');
    gridBody.className = 'slide-grid-body flex-1 grid overflow-y-auto safe-scroll ';
    gridBody.style.gridTemplateColumns = '';
    gridBody.style.gridTemplateRows = '';
    gridBody.style.gridAutoFlow = '';
    gridBody.style.alignContent = '';
    gridBody.style.gridAutoRows = '';
  }
  cards.forEach(c => {
    delete c.dataset.bentoSpan;
    delete c.dataset.bentoStartCol;
    delete c.dataset.bentoStartRow;
    delete c.dataset.bentoRowSpan;
    delete c.dataset.bentoHRatio;
    c.style.gridColumn = '';
    c.style.gridRow = '';
    c.style.height = '';
    c.style.minHeight = '';
    c.style.maxHeight = '';
    c.style.marginTop = '';
    c.style.alignSelf = '';
    c.classList.remove('md:col-span-8', 'md:col-span-4', 'lg:col-span-5', 'lg:col-span-7', 'md:col-span-2');
  });

  if (mode === '1col') {
    gridBody.classList.add('grid-cols-1');
  } else if (mode === '2col-equal') {
    gridBody.classList.add('grid-cols-1', 'md:grid-cols-2');
  } else if (mode === '2col-left') {
    gridBody.classList.add('grid-cols-1', 'md:grid-cols-12');
    if (cards[0]) cards[0].classList.add('md:col-span-7');
    if (cards[1]) cards[1].classList.add('md:col-span-5');
  } else if (mode === '2col-right') {
    gridBody.classList.add('grid-cols-1', 'md:grid-cols-12');
    if (cards[0]) cards[0].classList.add('md:col-span-5');
    if (cards[1]) cards[1].classList.add('md:col-span-7');
  } else if (mode === '3col') {
    gridBody.classList.add('grid-cols-1', 'md:grid-cols-3');
  }
  positionSelectionOverlay();
  saveHistorySnapshot();
  showToast('슬라이드 그리드 레이아웃이 변경되었습니다.');
}

function moveCard(btn, dir) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const card = btn.closest('.slide-card');
  const parent = card ? card.parentElement : null;
  if (!card || !parent) return;
  if (card.getAttribute('data-layer-locked') === 'true') { showToast('잠긴 카드는 이동할 수 없습니다.'); return; }
  const sibling = dir === -1 ? card.previousElementSibling : card.nextElementSibling;
  if (sibling && sibling.classList.contains('slide-card')) {
    if (sibling.getAttribute('data-layer-locked') === 'true') { showToast('인접 카드가 잠겨 있어 순서를 바꿀 수 없습니다.'); return; }
    if (parent.getAttribute('data-bento-2d') === 'true' && typeof getBento2DCoords === 'function' && typeof applyBento2DCoords === 'function') {
      const a = getBento2DCoords(card), b = getBento2DCoords(sibling);
      applyBento2DCoords(card, b.cs, b.cw, b.rs, b.rh);
      applyBento2DCoords(sibling, a.cs, a.cw, a.rs, a.rh);
    }
    if (dir === -1) parent.insertBefore(card, sibling);
    else parent.insertBefore(sibling, card);
  }
  syncTocCardsOrderAndLabels();
  buildModalGrid();
  positionSelectionOverlay();
  if (typeof updateSlideConnectors === 'function') updateSlideConnectors();
  saveHistorySnapshot('카드 순서 변경');
}

function deleteCard(btn) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const card = btn.closest('.slide-card');
  if (!card) return;
  if (card.getAttribute('data-layer-locked') === 'true') { showToast('잠긴 카드는 삭제할 수 없습니다.'); return; }
  card.querySelectorAll('video, audio').forEach(m => { try { if (!m.paused) m.pause(); } catch (e) {} });
  const parent = card.parentElement;
  const vacated = (parent && parent.getAttribute('data-bento-2d') === 'true' && typeof getBento2DCoords === 'function') ? getBento2DCoords(card) : null;
  card.remove();
  if (parent) {
    if (vacated && typeof fillVacatedBentoRect === 'function') fillVacatedBentoRect(parent, vacated);
    if (typeof rebalanceSlideGridLayout === 'function') rebalanceSlideGridLayout(parent);
    else if (parent.querySelectorAll('.slide-card').length === 0) parent.style.display = 'none';
  }
  syncTocCardsOrderAndLabels();
  buildModalGrid();
  clearSelectionInspector();
  if (typeof updateSlideConnectors === 'function') updateSlideConnectors();
  saveHistorySnapshot('카드 삭제');
  showToast('카드가 삭제되었습니다.');
}


function addTitleCardToCurrentSlide() {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return;
  const gridBody = getActiveGridBody();
  if (!gridBody) return;
  gridBody.style.display = '';

  const sectionLabel = (activeSlideEl.getAttribute('data-section') || 'SECTION TITLE').toUpperCase();
  const titleCard = document.createElement('div');
  titleCard.setAttribute('data-hover-init', 'true');
  titleCard.setAttribute('data-title-card', 'true');
  titleCard.dataset.bentoSpan = '24';
  titleCard.style.gridColumn = 'span 24 / span 24';
  titleCard.className = 'slide-card slide-title-card hover-reactive px-6 md:px-12 py-4 md:py-5 border-b border-borderline bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0';
  titleCard.innerHTML = `
    <div class="card-edit-controls items-center justify-end gap-1">
      <button data-on-click="moveCard(this, -1)" class="px-2 py-0.5 rounded bg-canvas border border-borderline text-[11px] font-mono">◀ 이전</button>
      <button data-on-click="moveCard(this, 1)" class="px-2 py-0.5 rounded bg-canvas border border-borderline text-[11px] font-mono">▶ 다음</button>
      <button data-on-click="deleteCard(this)" class="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[11px] font-bold">×</button>
    </div>
    <div>
      <span data-editable contenteditable="true" class="font-mono text-xs text-gopro font-bold uppercase tracking-wider block">${escapeAttr(sectionLabel)}</span>
      <h2 data-editable contenteditable="true" class="text-xl md:text-3xl font-extrabold tracking-tight text-ink mt-0.5">페이지 상단 타이틀을 입력하세요</h2>
    </div>
    <span data-editable contenteditable="true" class="font-mono text-xs text-muted">SUBTITLE · 핵심 요약</span>
  `;

  const existingCards = Array.from(gridBody.querySelectorAll(':scope > .slide-card'));
  const existingRects = existingCards.map(c => c.getBoundingClientRect());
  if (gridBody.getAttribute('data-bento-2d') !== 'true' && typeof initFlexibleBentoGrid === 'function') {
    initFlexibleBentoGrid(gridBody, existingCards, existingRects);
  }

  gridBody.insertBefore(titleCard, gridBody.firstChild);

  // Native 24x24 2D Bento placement: place Title Card in top 4 rows & shift existing cards cleanly into rows 5..24!
  if (gridBody.getAttribute('data-bento-2d') === 'true' && typeof applyBento2DCoords === 'function' && typeof getBento2DCoords === 'function') {
    const titleRows = 4;
    const remainRows = 24 - titleRows;
    existingCards.forEach(c => {
      const b = getBento2DCoords(c);
      const nextRs = titleRows + 1 + Math.floor(((b.rs - 1) / 24) * remainRows);
      const nextEnd = titleRows + 1 + Math.round(((b.rs - 1 + b.rh) / 24) * remainRows);
      const clampedRs = Math.max(titleRows + 1, Math.min(22, nextRs));
      const clampedRh = Math.max(3, Math.min(25 - clampedRs, nextEnd - clampedRs));
      applyBento2DCoords(c, b.cs, b.cw, clampedRs, clampedRh);
    });
    applyBento2DCoords(titleCard, 1, 24, 1, titleRows);
    if (typeof syncBento2DMultiRowClass === 'function') syncBento2DMultiRowClass(gridBody);
    if (typeof selectElementForInspector === 'function') selectElementForInspector(titleCard, false);
    if (typeof refreshLayerList === 'function') refreshLayerList();
    saveHistorySnapshot('타이틀 카드 추가');
    showToast('상단 타이틀 카드가 2D 벤토 상단에 겹침 없이 추가되었습니다!');
    return;
  }

  // Deterministically pack all body rows so titleCard + body rows NEVER overflow gridBody!
  const totalH = Math.max(200, gridBody.clientHeight || gridBody.getBoundingClientRect().height);
  const titleH = Math.max(58, Math.min(120, Math.round(titleCard.getBoundingClientRect().height || 80)));
  titleCard.style.height = `${titleH}px`;
  titleCard.style.minHeight = `${titleH}px`;
  titleCard.style.maxHeight = `${titleH}px`;
  titleCard.setAttribute('data-bento-h-ratio', (titleH / totalH).toFixed(6));

  const bodyCards = existingCards.filter(c => !c.hasAttribute('data-title-card') && !c.classList.contains('slide-title-card'));
  if (bodyCards.length > 0) {
    const packedRows = [];
    let curRow = [];
    let curCols = 0;
    bodyCards.forEach(c => {
      const sp = Math.max(3, Math.min(24, parseInt(c.dataset.bentoSpan || '8', 10) || 8));
      if (curCols + sp > 24 && curRow.length > 0) {
        packedRows.push(curRow);
        curRow = [];
        curCols = 0;
      }
      curRow.push(c);
      curCols += sp;
    });
    if (curRow.length > 0) packedRows.push(curRow);

    const availBodyH = Math.max(96, totalH - titleH);
    const rowCount = Math.max(1, packedRows.length);
    const perRowH = Math.max(52, Math.floor(availBodyH / rowCount));
    packedRows.forEach((rowItems, rIdx) => {
      const rowH = (rIdx === rowCount - 1)
        ? Math.max(52, availBodyH - perRowH * (rowCount - 1))
        : perRowH;
      rowItems.forEach(c => {
        c.style.alignSelf = 'stretch';
        c.style.height = `${rowH}px`;
        c.style.minHeight = `${rowH}px`;
        c.style.maxHeight = `${rowH}px`;
        c.setAttribute('data-bento-h-ratio', (rowH / totalH).toFixed(6));
      });
    });
  }

  selectElementForInspector(titleCard);
  refreshLayerList();
  saveHistorySnapshot();
  showToast('페이지 상단 타이틀 카드가 추가되었습니다! 기존 카드와 동일하게 크기·배경·효과 편집이 가능합니다.');
}

function addCardToCurrentSlide(type, forceFreeCanvas) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return;
  const gridBody = getActiveGridBody();
  if (!gridBody) return;
  gridBody.style.display = '';

  const card = document.createElement('div');
  card.setAttribute('data-hover-init', 'true');
  card.className = 'slide-card hover-reactive p-6 md:p-10 border-b border-r border-borderline flex flex-col justify-between bg-white';
  if (type === 'hybrid') {
    card.innerHTML = `
      <div class="card-edit-controls items-center justify-end gap-1 mb-2">
        <button data-on-click="moveCard(this, -1)" class="px-2 py-0.5 rounded bg-canvas border border-borderline text-[11px] font-mono">◀ 이전</button>
        <button data-on-click="moveCard(this, 1)" class="px-2 py-0.5 rounded bg-canvas border border-borderline text-[11px] font-mono">▶ 다음</button>
        <button data-on-click="deleteCard(this)" class="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[11px] font-bold">×</button>
      </div>
      <div class="card-inline-media mb-5" style="height: 210px;">
        ${buildCleanCardMediaHtml('클릭하여 카드 상단 사진 또는 동영상 첨부')}
      </div>
      <div class="flex-1 flex flex-col justify-between">
        <div>
          <span data-editable contenteditable="true" class="font-mono text-xs font-bold text-gopro block mb-2">MEDIA + TEXT CARD</span>
          <h3 data-editable contenteditable="true" class="text-xl md:text-2xl font-extrabold text-ink mb-3">미디어 + 텍스트 복합 카드</h3>
          <p data-editable contenteditable="true" class="text-sm md:text-base text-muted leading-relaxed">사진·동영상 프레임을 상단, 하단, 좌측, 우측으로 자유롭게 이동하고 높이와 비율을 조절할 수 있습니다.</p>
        </div>
        <div class="pt-4 mt-5 border-t border-borderline flex items-center justify-between text-xs text-muted">
          <span data-editable contenteditable="true" class="font-mono">FIG. VISUAL &amp; COPY</span>
          <span data-editable contenteditable="true" class="font-mono text-gopro font-bold">EDITABLE LAYOUT</span>
        </div>
      </div>
    `;
  } else if (type === 'text') {
    card.innerHTML = `
      <div class="card-edit-controls items-center justify-end gap-1 mb-2">
        <button data-on-click="moveCard(this, -1)" class="px-2 py-0.5 rounded bg-canvas border border-borderline text-[11px] font-mono">◀ 이전</button>
        <button data-on-click="moveCard(this, 1)" class="px-2 py-0.5 rounded bg-canvas border border-borderline text-[11px] font-mono">▶ 다음</button>
        <button data-on-click="deleteCard(this)" class="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[11px] font-bold">×</button>
      </div>
      <div>
        <span data-editable contenteditable="true" class="font-mono text-xs font-bold text-gopro block mb-3">NEW SECTION</span>
        <h3 data-editable contenteditable="true" class="text-xl md:text-2xl font-extrabold text-ink mb-4">새 텍스트 카드 제목</h3>
        <p data-editable contenteditable="true" class="text-base md:text-lg text-ink leading-relaxed">여기를 클릭하여 원하는 기획 내용이나 메모를 자유롭게 입력하세요.</p>
      </div>
      <div data-editable contenteditable="true" class="pt-4 mt-6 border-t border-borderline font-mono text-xs text-subtle">CUSTOM BLOCK</div>
    `;
  } else {
    card.innerHTML = `
      <div class="card-edit-controls items-center justify-end gap-1 mb-2">
        <button data-on-click="moveCard(this, -1)" class="px-2 py-0.5 rounded bg-canvas border border-borderline text-[11px] font-mono">◀ 이전</button>
        <button data-on-click="moveCard(this, 1)" class="px-2 py-0.5 rounded bg-canvas border border-borderline text-[11px] font-mono">▶ 다음</button>
        <button data-on-click="deleteCard(this)" class="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[11px] font-bold">×</button>
      </div>
      <div class="image-slot-box relative flex-1 min-h-[200px] rounded-2xl border-2 border-dashed border-borderline hover:border-gopro bg-canvas overflow-hidden flex flex-col items-center justify-center text-center p-6 transition cursor-pointer"
           data-on-click="triggerImageUpload(this)"
           data-on-dragover="event.preventDefault(); this.classList.add('border-gopro')"
           data-on-dragleave="this.classList.remove('border-gopro')"
           data-on-drop="handleImageDrop(event, this)">
        <img class="slot-img hidden w-full h-full object-cover absolute inset-0" alt="업로드 미디어" />
        <div class="slot-placeholder flex flex-col items-center pointer-events-none">
          <p class="text-sm font-bold text-ink">미디어 슬롯 — 클릭하여 사진 또는 동영상 업로드</p>
          <p class="text-xs text-muted mt-1">사진(JPG, PNG, WEBP) 및 동영상(MP4, WEBM, MOV) 지원</p>
        </div>
        <div class="img-edit-overlay absolute bottom-3 inset-x-3 bg-ink/85 text-white rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-xs z-10" data-on-click="event.stopPropagation()">
          <button data-on-click="triggerImageUpload(this.closest('.image-slot-box'))" class="px-2 py-1 rounded bg-gopro font-bold cursor-pointer">사진/영상 변경</button>
          <div class="flex items-center gap-1">
            <button data-on-click="toggleImageFit(this.closest('.image-slot-box'))" class="px-2 py-1 rounded bg-white/15 cursor-pointer">채우기/맞추기</button>
            <button data-on-click="adjustSlotHeight(this.closest('.image-slot-box'), 40)" class="px-2 py-1 rounded bg-white/15 cursor-pointer">H+</button>
            <button data-on-click="adjustSlotHeight(this.closest('.image-slot-box'), -40)" class="px-2 py-1 rounded bg-white/15 cursor-pointer">H-</button>
            <button data-on-click="clearImageSlot(this.closest('.image-slot-box'))" class="px-2 py-1 rounded bg-rose-600 font-bold cursor-pointer">삭제</button>
          </div>
        </div>
      </div>
      <div data-editable contenteditable="true" class="mt-3 font-mono text-xs text-muted">FIG. 미디어 캡션 입력</div>
    `;
  }

  const useFreeCardMode = Boolean(forceFreeCanvas || $studio('insertCardFreeModeCheckbox')?.checked);
  if (useFreeCardMode) {
    if (typeof ensureFreeLayersOnAllSlides === 'function') ensureFreeLayersOnAllSlides();
    const layer = activeSlideEl.querySelector('.ppt-free-layer');
    if (layer) {
      const idxOffset = (layer.querySelectorAll('.ppt-free-obj.slide-card').length % 5) * 4;
      card.classList.remove('border-b', 'border-r');
      card.classList.add('ppt-free-obj', 'rounded-2xl', 'border', 'shadow-lg');
      card.style.position = 'absolute'; card.style.left = `${14 + idxOffset}%`; card.style.top = `${18 + idxOffset}%`;
      card.style.width = '38%'; card.style.height = type === 'hybrid' ? '48%' : '36%';
      card.style.zIndex = String(layer.children.length + 20);
      layer.appendChild(card); selectElementForInspector(card); if (typeof refreshLayerList === 'function') refreshLayerList();
      saveHistorySnapshot('자유 배치 카드 추가'); showToast('자유 좌표 카드가 추가되었습니다!'); return;
    }
  }
  const prevCards = Array.from(gridBody.querySelectorAll(':scope > .slide-card'));
  const prevRects = prevCards.map(c => c.getBoundingClientRect());
  if (prevCards.length > 0 && gridBody.getAttribute('data-bento-2d') !== 'true' && typeof initFlexibleBentoGrid === 'function') {
    initFlexibleBentoGrid(gridBody, prevCards, prevRects);
  }

  let placedIn2D = false;
  if (prevCards.length === 0 && typeof applyBento2DCoords === 'function') {
    gridBody.setAttribute('data-bento-2d', 'true');
    gridBody.style.display = 'grid';
    gridBody.style.gridTemplateColumns = 'repeat(24, minmax(0, 1fr))';
    gridBody.style.gridTemplateRows = 'repeat(24, minmax(0, 1fr))';
    applyBento2DCoords(card, 1, 24, 1, 24);
    gridBody.appendChild(card);
    placedIn2D = true;
  } else if (gridBody.getAttribute('data-bento-2d') === 'true' && typeof findLargestEmptyBentoRect === 'function') {
    const emptySlot = findLargestEmptyBentoRect(gridBody);
    if (emptySlot) {
      applyBento2DCoords(card, emptySlot.cs, emptySlot.cw, emptySlot.rs, emptySlot.rh);
      gridBody.appendChild(card);
      placedIn2D = true;
    } else {
      // Check if user already built an asymmetric 2D layout (varying row spans) -> split selected or largest card cleanly!
      const rowSpans = prevCards.map(c => getBento2DCoords(c).rh);
      const isAsymmetric = rowSpans.some(rh => rh !== rowSpans[0]);
      if (isAsymmetric) {
        const splitTarget = (selectedElement && selectedElement.classList.contains('slide-card') && selectedElement.parentElement === gridBody)
          ? selectedElement
          : prevCards.slice().sort((a, b) => (getBento2DCoords(b).cw * getBento2DCoords(b).rh) - (getBento2DCoords(a).cw * getBento2DCoords(a).rh))[0];
        if (splitTarget) {
          const tb = getBento2DCoords(splitTarget);
          if (tb.rh >= tb.cw && tb.rh >= 8) {
            const topH = Math.floor(tb.rh / 2);
            applyBento2DCoords(splitTarget, tb.cs, tb.cw, tb.rs, topH);
            applyBento2DCoords(card, tb.cs, tb.cw, tb.rs + topH, tb.rh - topH);
            gridBody.appendChild(card);
            placedIn2D = true;
          } else if (tb.cw >= 8) {
            const leftW = Math.floor(tb.cw / 2);
            applyBento2DCoords(splitTarget, tb.cs, leftW, tb.rs, tb.rh);
            applyBento2DCoords(card, tb.cs + leftW, tb.cw - leftW, tb.rs, tb.rh);
            gridBody.appendChild(card);
            placedIn2D = true;
          }
        }
      }
    }
  }

  if (!placedIn2D) {
    // Standard uniform multi-column / multi-row rebalance
    const nextCount = prevCards.length + 1;
    if (nextCount <= 3 && prevCards.every(c => getBento2DCoords(c).rh >= 22)) {
      const eachW = Math.floor(24 / nextCount);
      prevCards.forEach((c, idx) => { c.dataset.bentoSpan = String(eachW); delete c.dataset.bentoStartCol; delete c.dataset.bentoStartRow; delete c.dataset.bentoRowSpan; });
      card.dataset.bentoSpan = String(24 - eachW * prevCards.length);
    } else {
      card.dataset.bentoSpan = '8';
    }
    gridBody.appendChild(card);
    if (typeof rebalanceSlideGridLayout === 'function') {
      rebalanceSlideGridLayout(gridBody, true);
    }
  } else if (typeof syncBento2DMultiRowClass === 'function') {
    syncBento2DMultiRowClass(gridBody);
  }
  selectElementForInspector(card);
  saveHistorySnapshot();
  showToast(type === 'hybrid' ? '미디어+텍스트 복합 카드가 추가되었습니다.' : type === 'text' ? '새 텍스트 카드가 추가되었습니다.' : '새 미디어 카드(사진·동영상)가 추가되었습니다.');
}

function addNewBlankSlide() {
  const activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return;
  const newNum = currentSlide + 1;
  const sec = document.createElement('section');
  sec.className = 'slide';
  sec.setAttribute('data-slide', String(newNum));
  sec.setAttribute('data-section', 'NEW · 새 슬라이드');
  sec.style.backgroundColor = '#F5F5F7';
  sec.innerHTML = `
    <div class="slide-bg-layer"></div>
    <div class="slide-bg-overlay"></div>
    <div class="slide-header-bar px-6 md:px-12 pt-5 pb-4 border-b border-borderline flex items-center justify-between shrink-0">
      <div>
        <span data-editable contenteditable="true" class="font-mono text-xs text-gopro font-bold uppercase tracking-wider">NEW SLIDE · SECTION</span>
        <h2 data-editable contenteditable="true" class="text-2xl md:text-4xl font-extrabold tracking-tight mt-0.5">새 슬라이드 제목을 입력하세요</h2>
      </div>
      <span data-editable contenteditable="true" class="px-3 py-1 rounded-full bg-ink text-white font-mono text-xs font-bold">CUSTOM</span>
    </div>
    <div class="slide-grid-body flex-1 grid grid-cols-1 md:grid-cols-2 overflow-y-auto safe-scroll">
      <div class="slide-card hover-reactive p-6 md:p-10 border-b md:border-b-0 md:border-r border-borderline flex flex-col justify-between bg-white">
        <div>
          <span data-editable contenteditable="true" class="font-mono text-xs font-bold text-gopro block mb-3">01 · POINT</span>
          <h3 data-editable contenteditable="true" class="text-xl md:text-2xl font-extrabold text-ink mb-4">첫 번째 핵심 내용</h3>
          <p data-editable contenteditable="true" class="text-base md:text-lg text-ink leading-relaxed">클릭하여 본문 텍스트를 자유롭게 편집하세요.</p>
        </div>
        <div class="pt-4 mt-6 border-t border-borderline font-mono text-xs text-subtle" data-editable contenteditable="true">PRESENTATION DECK</div>
      </div>
      <div class="slide-card hover-reactive p-6 md:p-10 flex flex-col justify-between bg-white">
        <div>
          <span data-editable contenteditable="true" class="font-mono text-xs font-bold text-gopro block mb-3">02 · POINT</span>
          <h3 data-editable contenteditable="true" class="text-xl md:text-2xl font-extrabold text-ink mb-4">두 번째 핵심 내용</h3>
          <p data-editable contenteditable="true" class="text-base md:text-lg text-ink leading-relaxed">스튜디오에서 도형, 사진, 동영상, 링크 버튼을 추가할 수 있습니다.</p>
        </div>
        <div class="pt-4 mt-6 border-t border-borderline font-mono text-xs text-subtle" data-editable contenteditable="true">PRESENTATION DECK</div>
      </div>
    </div>
    <div class="ppt-free-layer"></div>
  `;
  activeSlideEl.insertAdjacentElement('afterend', sec);
  shiftGotoSlideTargetsOnInsert(newNum);
  goToSlide(newNum);
  saveHistorySnapshot();
  showToast('새 슬라이드가 추가되었습니다.');
}

function regenerateClonedSlideInternalIds(slideEl) {
  if (!slideEl) return;
  slideEl.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
  slideEl.querySelectorAll('[data-chart-uid]').forEach(el => {
    el.setAttribute('data-chart-uid', 'chart_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7));
  });
  const nodeMap = new Map();
  slideEl.querySelectorAll('[data-conn-node-id]').forEach(el => {
    const oldId = el.getAttribute('data-conn-node-id');
    const newId = 'cn_' + Math.random().toString(36).slice(2, 9);
    nodeMap.set(oldId, newId);
    el.setAttribute('data-conn-node-id', newId);
  });
  slideEl.querySelectorAll('[data-connector-from], [data-connector-to]').forEach(el => {
    const f = el.getAttribute('data-connector-from');
    const t = el.getAttribute('data-connector-to');
    if (f && nodeMap.has(f)) el.setAttribute('data-connector-from', nodeMap.get(f));
    if (t && nodeMap.has(t)) el.setAttribute('data-connector-to', nodeMap.get(t));
  });
  const trigMap = new Map();
  slideEl.querySelectorAll('[data-trigger-node-id]').forEach(el => {
    const oldId = el.getAttribute('data-trigger-node-id');
    const newId = 'tn_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
    trigMap.set(oldId, newId);
    el.setAttribute('data-trigger-node-id', newId);
  });
  slideEl.querySelectorAll('[data-trigger-target]').forEach(el => {
    const tgt = el.getAttribute('data-trigger-target');
    if (tgt && trigMap.has(tgt)) el.setAttribute('data-trigger-target', trigMap.get(tgt));
  });
}

function duplicateCurrentSlide() {
  const activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return;
  const clone = activeSlideEl.cloneNode(true);
  clone.classList.remove('active', 'ppt-multi-selected', 'is-selected');
  clone.querySelectorAll('.ppt-multi-selected, .is-selected').forEach(el => el.classList.remove('ppt-multi-selected', 'is-selected'));
  clone.querySelectorAll('.iw-flip-scene').forEach(el => el.classList.remove('is-editing-back', 'is-flipped'));
  clone.querySelectorAll('.iw-hs-pin.is-open').forEach(el => el.classList.remove('is-open'));
  regenerateClonedSlideInternalIds(clone);
  activeSlideEl.insertAdjacentElement('afterend', clone);
  shiftGotoSlideTargetsOnInsert(currentSlide + 1);
  goToSlide(currentSlide + 1);
  saveHistorySnapshot();
  showToast('현재 슬라이드가 복제되었습니다.');
}

function moveCurrentSlide(dir) {
  const idx = currentSlide - 1;
  const activeSlideEl = slides[idx];
  if (!activeSlideEl) return;
  if (dir === -1 && idx > 0) {
    activeSlideEl.parentElement.insertBefore(activeSlideEl, slides[idx - 1]);
    swapGotoSlideTargets(currentSlide, currentSlide - 1);
    goToSlide(currentSlide - 1);
    saveHistorySnapshot();
  } else if (dir === 1 && idx < slides.length - 1) {
    activeSlideEl.parentElement.insertBefore(slides[idx + 1], activeSlideEl);
    swapGotoSlideTargets(currentSlide, currentSlide + 1);
    goToSlide(currentSlide + 1);
    saveHistorySnapshot();
  }
}

function deleteCurrentSlide() {
  if (slides.length <= 1) {
    showToast('최소 1장의 슬라이드는 유지되어야 합니다.');
    return;
  }
  const deletedNum = currentSlide;
  const activeSlideEl = slides[deletedNum - 1];
  if (!activeSlideEl) return;
  if (activeSlideEl.getAttribute('data-slide-locked') === 'true') { showToast('잠긴 슬라이드는 잠금 해제 후 삭제할 수 있습니다.'); return; }
  activeSlideEl.querySelectorAll('video, audio').forEach(m => { try { if (!m.paused) m.pause(); } catch (e) {} });
  activeSlideEl.remove();
  const remainingCount = slides.length - 1;
  shiftGotoSlideTargetsOnDelete(deletedNum, remainingCount);
  const nextIdx = Math.min(deletedNum, remainingCount);
  goToSlide(nextIdx);
  saveHistorySnapshot();
  showToast('슬라이드가 삭제되었습니다.');
}

function openSlidePageJumpInput() {
  const pill = document.getElementById('headerSlideCounterPill'); if (!pill || pill.querySelector('input')) return;
  const origHtml = pill.innerHTML;
  pill.innerHTML = `<input id="slidePageJumpInput" type="number" min="1" max="${totalSlides}" value="${currentSlide}" class="w-12 text-center bg-canvas border border-gopro rounded font-mono text-xs font-extrabold text-ink focus:outline-none"> <span class="text-subtle">/ ${String(totalSlides).padStart(2, '0')}</span>`;
  const inp = document.getElementById('slidePageJumpInput'); if (!inp) return;
  inp.focus(); inp.select(); let done = false;
  const restorePill = () => { if (done) return; done = true; pill.innerHTML = origHtml; updateSlideUI(); };
  const commitJump = () => { const val = parseInt(inp.value, 10); restorePill(); if (!isNaN(val) && val >= 1 && val <= totalSlides && val !== currentSlide) goToSlide(val); };
  inp.addEventListener('keydown', (ke) => { ke.stopPropagation(); if (ke.key === 'Enter') { ke.preventDefault(); commitJump(); } else if (ke.key === 'Escape') { ke.preventDefault(); restorePill(); } });
  inp.addEventListener('blur', restorePill);
}
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
    const walker = document.createTreeWalker(slideEl, NodeFilter.SHOW_TEXT, { acceptNode(node) { const p = node.parentElement; if (!p || p.closest('.card-edit-controls, .img-edit-overlay, .sub-box-del-btn, .card-media-controls, .table-col-resizer, .table-row-resizer, .iw-edit-bar, .chart-scenario-bar, .iw-flip-cue, .iw-hs-dot, .ppt-slide-comment-badge, .embed-widget-drag-bar, .yt-local-hint-bar, .yt-poster-card, .ppt-audio-widget button, .deferred-embed-consent, .ppt-slide-master-layer')) return NodeFilter.FILTER_REJECT; return node.nodeValue && node.nodeValue.trim().length > 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; } });
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
  const targetEl = match.textNode && match.textNode.parentElement ? match.textNode.parentElement : null;
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
  if (typeof isInteractiveTestMode !== 'undefined' && isInteractiveTestMode && typeof toggleInteractiveTestMode === 'function') toggleInteractiveTestMode(false);
  if (!isEditMode && typeof toggleEditMode === 'function') toggleEditMode(true);
  const query = document.getElementById('findQueryInput')?.value || '', replaceWith = document.getElementById('replaceQueryInput')?.value ?? ''; if (!query) return;
  if (__findMatchesList.length === 0) runSlideFindSearch(false);
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
function updateCurrentSlideSpeakerNotes(val, isLiveInput) {
  const activeSlideEl = slides[currentSlide - 1]; if (!activeSlideEl) return;
  const cleaned = String(val || '').replace(/[<>]/g, '').slice(0, 4000);
  if (cleaned.trim()) activeSlideEl.setAttribute('data-speaker-notes', cleaned); else activeSlideEl.removeAttribute('data-speaker-notes');
  syncPresenterWindowState(); if (!isLiveInput) saveHistorySnapshot('발표자 노트 수정');
}
function syncSpeakerNotesUI() { const activeSlideEl = slides[currentSlide - 1], ta = $studio('speakerNotesTextarea'); if (ta) ta.value = activeSlideEl ? (activeSlideEl.getAttribute('data-speaker-notes') || '') : ''; }
function cloneSlideForPresenterPreview(srcSlideEl, targetDoc) {
  if (!srcSlideEl || !targetDoc) return null;
  const cloned = targetDoc.importNode(srcSlideEl, true);
  cloned.removeAttribute('id');
  cloned.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
  cloned.querySelectorAll('[contenteditable]').forEach(n => n.removeAttribute('contenteditable'));
  cloned.querySelectorAll('.card-edit-controls, .img-edit-overlay, .sub-box-del-btn, .card-media-controls, .table-col-resizer, .table-row-resizer, .embed-widget-drag-bar, .iw-edit-bar, .ppt-persistent-guide, .yt-local-hint-bar, .ppt-slide-comment-badge').forEach(n => n.remove());
  cloned.querySelectorAll('.ppt-multi-selected, .is-selected').forEach(n => n.classList.remove('ppt-multi-selected', 'is-selected'));
  // Prevent double audio/video playback & external iframe reload inside Presenter View
  cloned.querySelectorAll('video, audio').forEach(m => {
    m.removeAttribute('autoplay');
    m.muted = true;
    m.controls = false;
    try { m.pause(); } catch (e) {}
  });
  cloned.querySelectorAll('iframe').forEach(ifr => {
    const ph = targetDoc.createElement('div');
    ph.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#1E293B;color:#94A3B8;font-family:monospace;font-size:16px;font-weight:700;border-radius:10px;';
    ph.textContent = '🌐 WEB / VIDEO EMBED';
    ifr.replaceWith(ph);
  });
  cloned.removeAttribute('data-transition');
  cloned.classList.add('active', 'transition-instant-reset');
  const stageW = (typeof LOGICAL_STAGE_WIDTH === 'number' && LOGICAL_STAGE_WIDTH > 0) ? LOGICAL_STAGE_WIDTH : 1440;
  const stageH = (typeof LOGICAL_STAGE_HEIGHT === 'number' && LOGICAL_STAGE_HEIGHT > 0) ? LOGICAL_STAGE_HEIGHT : 810;
  cloned.style.setProperty('position', 'absolute', 'important');
  cloned.style.setProperty('left', '0px', 'important');
  cloned.style.setProperty('top', '0px', 'important');
  cloned.style.setProperty('width', `${stageW}px`, 'important');
  cloned.style.setProperty('height', `${stageH}px`, 'important');
  cloned.style.opacity = '1';
  cloned.style.visibility = 'visible';
  cloned.style.pointerEvents = 'none';
  cloned.style.boxShadow = 'none';
  cloned.style.margin = '0';
  return cloned;
}

function fitPresenterPreviewFrames(doc) {
  if (!doc) return;
  const stageW = (typeof LOGICAL_STAGE_WIDTH === 'number' && LOGICAL_STAGE_WIDTH > 0) ? LOGICAL_STAGE_WIDTH : 1440;
  const stageH = (typeof LOGICAL_STAGE_HEIGHT === 'number' && LOGICAL_STAGE_HEIGHT > 0) ? LOGICAL_STAGE_HEIGHT : 810;
  ['pvCurrentVisualBox', 'pvNextVisualBox'].forEach(boxId => {
    const box = doc.getElementById(boxId);
    if (!box) return;
    const slideNode = box.querySelector('.slide');
    if (!slideNode) return;
    const availW = Math.max(80, box.clientWidth - 12);
    const availH = Math.max(60, box.clientHeight - 12);
    const sc = Math.min(availW / stageW, availH / stageH);
    const scaledW = Math.round(stageW * sc);
    const scaledH = Math.round(stageH * sc);
    const holder = slideNode.parentElement;
    if (holder && holder.classList.contains('pv-slide-holder')) {
      holder.style.width = `${scaledW}px`;
      holder.style.height = `${scaledH}px`;
    }
    slideNode.style.setProperty('transform-origin', 'top left', 'important');
    slideNode.style.setProperty('transform', `scale(${sc.toFixed(4)})`, 'important');
    slideNode.style.setProperty('left', '0px', 'important');
    slideNode.style.setProperty('top', '0px', 'important');
  });
}

function openPresenterViewWindow() {
  if (isEditMode && typeof toggleEditMode === 'function') toggleEditMode(false);
  const w = window.open('', 'PPTStudioPresenterView', 'width=1320,height=800,resizable=yes,scrollbars=yes');
  if (!w) { showToast('팝업 차단을 해제한 뒤 다시 발표자 뷰를 열어 주세요.'); return; }
  presenterPopupWin = w; const doc = w.document; doc.open();
  doc.write(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>HTML Slide Tool — 발표자 전용 뷰</title><style>
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{width:100%;height:100vh;overflow:hidden;font-family:'Pretendard','Malgun Gothic',sans-serif;background:#0B1120;color:#F8FAFC;display:flex;flex-direction:column}
    .pv-header{height:54px;background:#111827;border-bottom:1px solid #1E293B;padding:0 18px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:12px}
    .pv-timer{font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:800;color:#38BDF8}
    .pv-clock{font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:#94A3B8;padding:4px 9px;border-radius:7px;background:#1E293B;border:1px solid #334155}
    .pv-btn{padding:6px 12px;border-radius:8px;border:1px solid #334155;background:#1E293B;color:#F8FAFC;font-weight:700;font-size:12px;cursor:pointer;white-space:nowrap}
    .pv-btn:hover{background:#334155}
    .pv-btn-xs{padding:3px 7px;border-radius:6px;font-size:10px}
    .pv-btn-active{background:#0055FF;border-color:#38BDF8;color:#FFFFFF}
    .pv-btn-primary{background:#0055FF;border-color:#0055FF;color:#FFFFFF}
    .pv-btn-primary:hover{background:#003EC2}
    .pv-main{flex:1;display:flex;align-items:stretch;padding:12px;min-height:0;overflow:hidden;gap:0}
    .pv-col{display:flex;flex-direction:column;min-width:260px;min-height:0;flex-shrink:0}
    .pv-notes-col{flex:1;min-width:220px;display:flex;flex-direction:column;min-height:0}
    .pv-panel{background:#111827;border:1px solid #1E293B;border-radius:14px;padding:10px 12px;display:flex;flex-direction:column;min-height:0;overflow:hidden}
    .pv-panel-head{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:7px;flex-shrink:0;flex-wrap:wrap}
    .pv-panel-title{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:800;color:#94A3B8;letter-spacing:0.04em}
    .pv-sec-tag{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;color:#38BDF8;background:rgba(56,189,248,0.12);padding:2px 8px;border-radius:9999px;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .pv-splitter-v{width:12px;cursor:col-resize;display:flex;align-items:center;justify-content:center;flex-shrink:0;user-select:none}
    .pv-splitter-v::after{content:'';width:4px;height:44px;border-radius:9999px;background:#334155;transition:background 0.15s}
    .pv-splitter-v:hover::after,.pv-splitter-v.is-dragging::after{background:#38BDF8}
    .pv-splitter-h{height:12px;cursor:row-resize;display:flex;align-items:center;justify-content:center;flex-shrink:0;user-select:none}
    .pv-splitter-h::after{content:'';height:4px;width:54px;border-radius:9999px;background:#334155;transition:background 0.15s}
    .pv-splitter-h:hover::after,.pv-splitter-h.is-dragging::after{background:#38BDF8}
    .pv-visual-box{flex:1;min-height:0;background:#020617;border:1px solid #1E293B;border-radius:10px;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;padding:6px}
    .pv-slide-holder{position:relative;overflow:hidden;border-radius:6px;box-shadow:0 12px 30px rgba(0,0,0,0.48);background:#FFFFFF;flex-shrink:0}
    body.scaled-stage .pv-slide-holder > .slide, body.scaled-stage .pv-slide-holder > .slide.active{left:0 !important;top:0 !important;transition:none !important;}
    .pv-empty-msg{font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:#64748B}
    .pv-notes-box{flex:1;background:#0F172A;border:1px solid #1E293B;border-radius:10px;padding:16px;overflow-y:auto;font-size:19px;line-height:1.68;white-space:pre-wrap;color:#F1F5F9}
    .pv-notes-box::-webkit-scrollbar{width:6px}
    .pv-notes-box::-webkit-scrollbar-thumb{background:#334155;border-radius:9999px}
  </style></head><body class="scaled-stage">
    <div class="pv-header">
      <div style="display:flex;align-items:center;gap:12px">
        <span id="pvSlideCounter" style="font-family:'JetBrains Mono',monospace;font-size:17px;font-weight:800;color:#FFE600">SLIDE 01 / 04</span>
        <span id="pvTimerDisplay" class="pv-timer">00:00</span>
        <button id="pvTimerToggleBtn" class="pv-btn">일시정지</button>
        <button id="pvTimerResetBtn" class="pv-btn">초기화</button>
        <span id="pvWallClock" class="pv-clock">00:00:00</span>
      </div>
      <div style="display:flex;align-items:center;gap:7px">
        <button id="pvBlackBtn" class="pv-btn">암전 (B)</button>
        <button id="pvPrevBtn" class="pv-btn">◀ 이전</button>
        <button id="pvNextBtn" class="pv-btn pv-btn-primary">다음 / 스텝 진행 ▶</button>
      </div>
    </div>
    <div id="pvMainGrid" class="pv-main">
      <div id="pvLeftCol" class="pv-col" style="width:62%">
        <div id="pvCurrentPanel" class="pv-panel" style="height:68%">
          <div class="pv-panel-head">
            <div style="display:flex;align-items:center;gap:8px">
              <span class="pv-panel-title">CURRENT SLIDE · 실시간 현재 화면</span>
              <span id="pvCurrentSecTag" class="pv-sec-tag">00 · COVER</span>
            </div>
            <div style="display:flex;align-items:center;gap:4px">
              <button id="pvSizeMinusBtn" class="pv-btn pv-btn-xs" title="현재 화면 축소">−</button>
              <button id="pvSizePlusBtn" class="pv-btn pv-btn-xs" title="현재 화면 확대">+</button>
              <button id="pvPresetDefaultBtn" class="pv-btn pv-btn-xs" title="기본 비율">기본</button>
              <button id="pvPresetLargeBtn" class="pv-btn pv-btn-xs" title="현재 화면 크게">크게</button>
              <button id="pvPresetMaxBtn" class="pv-btn pv-btn-xs" title="현재 화면 최대화">최대</button>
            </div>
          </div>
          <div id="pvCurrentVisualBox" class="pv-visual-box"></div>
        </div>
        <div id="pvRowSplitter" class="pv-splitter-h" title="상하 드래그하여 현재 화면 / 다음 슬라이드 크기 조절"></div>
        <div id="pvNextPanel" class="pv-panel" style="flex:1">
          <div class="pv-panel-head">
            <span class="pv-panel-title">NEXT SLIDE · 다음 슬라이드 예고</span>
            <span id="pvNextSecTag" class="pv-sec-tag">-</span>
          </div>
          <div id="pvNextVisualBox" class="pv-visual-box"></div>
        </div>
      </div>
      <div id="pvColSplitter" class="pv-splitter-v" title="좌우 드래그하여 현재 화면 / 발표자 대본 폭 조절"></div>
      <div class="pv-notes-col">
        <div class="pv-panel" style="flex:1">
          <div class="pv-panel-head">
            <span class="pv-panel-title">SPEAKER NOTES · 발표자 대본</span>
            <div style="display:flex;align-items:center;gap:4px">
              <button id="pvNoteZoomOut" class="pv-btn pv-btn-xs">A-</button>
              <button id="pvNoteZoomIn" class="pv-btn pv-btn-xs">A+</button>
            </div>
          </div>
          <div id="pvNotesBody" class="pv-notes-box">현재 슬라이드에 작성된 발표자 노트가 없습니다.</div>
        </div>
      </div>
    </div>
  </body></html>`);
  doc.close();

  // Clone all main document styles & CSS variables so previews match the live stage 1:1 offline!
  if (typeof cloneDocumentStylesToPopup === 'function') cloneDocumentStylesToPopup(w);
  ['--accent-color', '--header-bg', '--header-fg', '--footer-bg', '--footer-fg', '--stage-w', '--stage-h'].forEach(v => {
    const val = document.documentElement.style.getPropertyValue(v);
    if (val) doc.documentElement.style.setProperty(v, val);
  });

  // Restore saved presenter split layout (leftColPct, curRowPct)
  const PV_LAYOUT_KEY = 'ppt_presenter_layout_v1';
  let leftColPct = 62, curRowPct = 68;
  try {
    const saved = JSON.parse(localStorage.getItem(PV_LAYOUT_KEY) || 'null');
    if (saved && Number.isFinite(saved.leftColPct)) leftColPct = Math.max(32, Math.min(84, saved.leftColPct));
    if (saved && Number.isFinite(saved.curRowPct)) curRowPct = Math.max(30, Math.min(100, saved.curRowPct));
  } catch (e) {}

  const applyPvLayout = (save) => {
    const leftCol = doc.getElementById('pvLeftCol');
    const curPanel = doc.getElementById('pvCurrentPanel');
    const nextPanel = doc.getElementById('pvNextPanel');
    const rowSplit = doc.getElementById('pvRowSplitter');
    const hideNext = curRowPct >= 96;
    if (leftCol) leftCol.style.width = `${leftColPct.toFixed(1)}%`;
    if (curPanel) curPanel.style.height = hideNext ? '100%' : `${curRowPct.toFixed(1)}%`;
    if (nextPanel) nextPanel.style.display = hideNext ? 'none' : 'flex';
    if (rowSplit) rowSplit.style.display = hideNext ? 'none' : 'flex';
    if (save) {
      try { localStorage.setItem(PV_LAYOUT_KEY, JSON.stringify({ leftColPct, curRowPct })); } catch (e) {}
    }
    fitPresenterPreviewFrames(doc);
    if (typeof w.requestAnimationFrame === 'function') w.requestAnimationFrame(() => fitPresenterPreviewFrames(doc));
  };

  // Interactive Vertical Splitter (Left Slide Column <-> Right Speaker Notes)
  const colSplitter = doc.getElementById('pvColSplitter');
  const mainGrid = doc.getElementById('pvMainGrid');
  if (colSplitter && mainGrid) {
    colSplitter.onmousedown = (me) => {
      me.preventDefault();
      colSplitter.classList.add('is-dragging');
      const onMove = (ev) => {
        const rect = mainGrid.getBoundingClientRect();
        if (rect.width <= 0) return;
        leftColPct = Math.max(32, Math.min(84, ((ev.clientX - rect.left) / rect.width) * 100));
        applyPvLayout(false);
      };
      const onUp = () => {
        colSplitter.classList.remove('is-dragging');
        doc.removeEventListener('mousemove', onMove);
        doc.removeEventListener('mouseup', onUp);
        applyPvLayout(true);
      };
      doc.addEventListener('mousemove', onMove);
      doc.addEventListener('mouseup', onUp);
    };
  }

  // Interactive Horizontal Splitter (Current Slide <-> Next Slide)
  const rowSplitter = doc.getElementById('pvRowSplitter');
  const leftColEl = doc.getElementById('pvLeftCol');
  if (rowSplitter && leftColEl) {
    rowSplitter.onmousedown = (me) => {
      me.preventDefault();
      rowSplitter.classList.add('is-dragging');
      const onMove = (ev) => {
        const rect = leftColEl.getBoundingClientRect();
        if (rect.height <= 0) return;
        curRowPct = Math.max(30, Math.min(92, ((ev.clientY - rect.top) / rect.height) * 100));
        applyPvLayout(false);
      };
      const onUp = () => {
        rowSplitter.classList.remove('is-dragging');
        doc.removeEventListener('mousemove', onMove);
        doc.removeEventListener('mouseup', onUp);
        applyPvLayout(true);
      };
      doc.addEventListener('mousemove', onMove);
      doc.addEventListener('mouseup', onUp);
    };
  }

  // Quick size step & preset buttons for Current Slide Live Preview
  doc.getElementById('pvSizeMinusBtn').onclick = () => {
    if (curRowPct >= 96) curRowPct = 82;
    else curRowPct = Math.max(35, curRowPct - 8);
    leftColPct = Math.max(38, leftColPct - 5);
    applyPvLayout(true);
  };
  doc.getElementById('pvSizePlusBtn').onclick = () => {
    curRowPct = Math.min(92, curRowPct + 8);
    leftColPct = Math.min(82, leftColPct + 5);
    applyPvLayout(true);
  };
  doc.getElementById('pvPresetDefaultBtn').onclick = () => { leftColPct = 62; curRowPct = 68; applyPvLayout(true); };
  doc.getElementById('pvPresetLargeBtn').onclick = () => { leftColPct = 74; curRowPct = 80; applyPvLayout(true); };
  doc.getElementById('pvPresetMaxBtn').onclick = () => { leftColPct = 80; curRowPct = 100; applyPvLayout(true); };

  let elapsedSec = 0, timerRunning = true, noteFontSize = 19;
  const updateClock = () => {
    const now = new Date();
    const clk = doc.getElementById('pvWallClock');
    if (clk) clk.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  };
  updateClock();
  const timerInterval = w.setInterval(() => {
    if (w.closed) { w.clearInterval(timerInterval); return; }
    updateClock();
    if (timerRunning) {
      elapsedSec++;
      const tEl = doc.getElementById('pvTimerDisplay');
      if (tEl) tEl.textContent = `${String(Math.floor(elapsedSec / 60)).padStart(2, '0')}:${String(elapsedSec % 60).padStart(2, '0')}`;
    }
  }, 1000);
  doc.getElementById('pvTimerToggleBtn').onclick = () => { timerRunning = !timerRunning; doc.getElementById('pvTimerToggleBtn').textContent = timerRunning ? '일시정지' : '재개'; };
  doc.getElementById('pvTimerResetBtn').onclick = () => { elapsedSec = 0; doc.getElementById('pvTimerDisplay').textContent = '00:00'; };
  doc.getElementById('pvBlackBtn').onclick = () => toggleScreenBlackout('black');
  doc.getElementById('pvPrevBtn').onclick = () => prevSlide();
  doc.getElementById('pvNextBtn').onclick = () => nextSlide();
  doc.getElementById('pvNoteZoomOut').onclick = () => { noteFontSize = Math.max(13, noteFontSize - 2); const n = doc.getElementById('pvNotesBody'); if (n) n.style.fontSize = noteFontSize + 'px'; };
  doc.getElementById('pvNoteZoomIn').onclick = () => { noteFontSize = Math.min(34, noteFontSize + 2); const n = doc.getElementById('pvNotesBody'); if (n) n.style.fontSize = noteFontSize + 'px'; };
  w.addEventListener('resize', () => fitPresenterPreviewFrames(doc));
  w.addEventListener('keydown', (ke) => {
    if (ke.key === 'ArrowRight' || ke.key === ' ') { ke.preventDefault(); nextSlide(); }
    else if (ke.key === 'ArrowLeft') { ke.preventDefault(); prevSlide(); }
    else if (ke.key === 'b' || ke.key === 'B') { toggleScreenBlackout('black'); }
  });
  applyPvLayout(false);
  syncPresenterWindowState();
}

function syncPresenterWindowState() {
  if (!presenterPopupWin || presenterPopupWin.closed) return;
  const doc = presenterPopupWin.document;
  const curSlideEl = slides[currentSlide - 1];
  const nextIdx = findNextVisibleSlideIndex(currentSlide, 1);
  const nextSlideEl = nextIdx !== -1 ? slides[nextIdx - 1] : null;

  // Sync live accent color in case user changed brand kit
  const curAccent = document.documentElement.style.getPropertyValue('--accent-color');
  if (curAccent) doc.documentElement.style.setProperty('--accent-color', curAccent);
  if (doc.body) {
    doc.body.classList.toggle('focus-mode', document.body.classList.contains('focus-mode'));
    const ratioNow = document.body.getAttribute('data-aspect-ratio') || '16:9';
    doc.body.setAttribute('data-aspect-ratio', ratioNow);
  }
  const pvBlackBtn = doc.getElementById('pvBlackBtn');
  if (pvBlackBtn) {
    const isBlk = Boolean(activeScreenBlackoutMode);
    pvBlackBtn.style.background = isBlk ? '#E11D48' : '';
    pvBlackBtn.style.borderColor = isBlk ? '#E11D48' : '';
    pvBlackBtn.textContent = isBlk ? '암전 해제 (B)' : '암전 (B)';
  }

  const cntEl = doc.getElementById('pvSlideCounter');
  if (cntEl) cntEl.textContent = `SLIDE ${String(currentSlide).padStart(2, '0')} / ${String(totalSlides).padStart(2, '0')}`;

  const curSec = doc.getElementById('pvCurrentSecTag');
  if (curSec) curSec.textContent = curSlideEl ? (curSlideEl.getAttribute('data-section') || `P.${String(currentSlide).padStart(2, '0')}`) : '-';
  const nextSec = doc.getElementById('pvNextSecTag');
  if (nextSec) nextSec.textContent = nextSlideEl ? `P.${String(nextIdx).padStart(2, '0')} · ${nextSlideEl.getAttribute('data-section') || ''}` : 'END OF DECK';

  const mountVisual = (boxId, srcSlideEl, emptyText) => {
    const box = doc.getElementById(boxId);
    if (!box) return;
    box.innerHTML = '';
    if (!srcSlideEl) {
      const msg = doc.createElement('div');
      msg.className = 'pv-empty-msg';
      msg.textContent = emptyText;
      box.appendChild(msg);
      return;
    }
    const holder = doc.createElement('div');
    holder.className = 'pv-slide-holder';
    const previewSlide = cloneSlideForPresenterPreview(srcSlideEl, doc);
    if (previewSlide) holder.appendChild(previewSlide);
    box.appendChild(holder);
  };

  mountVisual('pvCurrentVisualBox', curSlideEl, '(슬라이드 없음)');
  mountVisual('pvNextVisualBox', nextSlideEl, '마지막 슬라이드입니다 (END)');
  fitPresenterPreviewFrames(doc);
  if (presenterPopupWin && typeof presenterPopupWin.requestAnimationFrame === 'function') {
    presenterPopupWin.requestAnimationFrame(() => fitPresenterPreviewFrames(doc));
  }

  const notesEl = doc.getElementById('pvNotesBody');
  if (notesEl) {
    const notes = curSlideEl ? (curSlideEl.getAttribute('data-speaker-notes') || '').trim() : '';
    notesEl.textContent = notes || '현재 슬라이드에 작성된 발표자 노트가 없습니다.';
  }
}

let activeScreenBlackoutMode = null;
function toggleScreenBlackout(mode) {
  const ov = document.getElementById('pptScreenBlackoutOverlay'); if (!ov) return;
  const targetMode = mode || 'black';
  if (activeScreenBlackoutMode === targetMode) {
    activeScreenBlackoutMode = null;
    if (typeof closeModalSafe === 'function') closeModalSafe(ov);
    else { ov.classList.add('hidden'); ov.classList.remove('flex'); ov.style.display = 'none'; }
    if (typeof syncPresenterWindowState === 'function') syncPresenterWindowState();
    return;
  }
  activeScreenBlackoutMode = targetMode;
  ov.style.backgroundColor = targetMode === 'white' ? '#FFFFFF' : '#000000';
  ov.style.color = targetMode === 'white' ? '#111111' : '#FFFFFF';
  if (typeof openModalSafe === 'function') openModalSafe(ov);
  else { ov.classList.remove('hidden'); ov.classList.add('flex'); ov.style.display = 'flex'; }
  if (typeof syncPresenterWindowState === 'function') syncPresenterWindowState();
}
let isLaserPointerEnabled = false, __laserMoveHandler = null;
function toggleLaserPointer(forceState) {
  const nextState = forceState !== undefined ? Boolean(forceState) : !isLaserPointerEnabled; isLaserPointerEnabled = nextState;
  let dot = document.getElementById('pptLaserDot');
  if (nextState) { if (!dot) { dot = document.createElement('div'); dot.id = 'pptLaserDot'; document.body.appendChild(dot); } dot.classList.remove('hidden'); if (!__laserMoveHandler) { __laserMoveHandler = (e) => { const d = document.getElementById('pptLaserDot'); if (d) { d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; } }; document.addEventListener('mousemove', __laserMoveHandler); } }
  else { if (dot) dot.classList.add('hidden'); if (__laserMoveHandler) { document.removeEventListener('mousemove', __laserMoveHandler); __laserMoveHandler = null; } }
}
let isScreenDrawMode = false, activeScreenDrawColor = '#EF4444';
function toggleScreenDrawMode(forceState) {
  const nextState = forceState !== undefined ? Boolean(forceState) : !isScreenDrawMode; isScreenDrawMode = nextState;
  const canvas = document.getElementById('pptDrawCanvas'), toolbar = document.getElementById('pptDrawToolbar');
  if (!canvas) return;
  if (nextState) { if ((typeof isActiveEditing === 'function' ? isActiveEditing() : isEditMode) && typeof toggleEditMode === 'function') toggleEditMode(false); canvas.width = window.innerWidth; canvas.height = window.innerHeight; canvas.classList.remove('hidden'); if (toolbar) toolbar.classList.remove('hidden'); bindScreenDrawCanvas(canvas); }
  else { canvas.classList.add('hidden'); if (toolbar) toolbar.classList.add('hidden'); }
}
function setScreenDrawColor(hex) { activeScreenDrawColor = hex || '#EF4444'; }
function clearScreenDrawing(silent) { const c = document.getElementById('pptDrawCanvas'); if (c) { const ctx = c.getContext('2d'); if (ctx) ctx.clearRect(0, 0, c.width, c.height); } }
function bindScreenDrawCanvas(canvas) {
  if (canvas.dataset.bound === 'true') return; canvas.dataset.bound = 'true'; let drawing = false; const ctx = canvas.getContext('2d');
  canvas.addEventListener('mousedown', (e) => { if (!isScreenDrawMode) return; drawing = true; ctx.strokeStyle = activeScreenDrawColor; ctx.lineWidth = activeScreenDrawColor === '#FFE600' ? 14 : 4; ctx.globalAlpha = activeScreenDrawColor === '#FFE600' ? 0.45 : 0.95; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(e.clientX, e.clientY); });
  canvas.addEventListener('mousemove', (e) => { if (!drawing || !isScreenDrawMode) return; ctx.lineTo(e.clientX, e.clientY); ctx.stroke(); });
  const stopDraw = () => { drawing = false; }; canvas.addEventListener('mouseup', stopDraw); canvas.addEventListener('mouseleave', stopDraw);
  canvas.addEventListener('touchstart', (e) => { if (!isScreenDrawMode || !e.touches[0]) return; e.preventDefault(); const t = e.touches[0]; drawing = true; ctx.strokeStyle = activeScreenDrawColor; ctx.lineWidth = activeScreenDrawColor === '#FFE600' ? 14 : 4; ctx.globalAlpha = activeScreenDrawColor === '#FFE600' ? 0.45 : 0.95; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(t.clientX, t.clientY); }, { passive: false });
  canvas.addEventListener('touchmove', (e) => { if (!drawing || !isScreenDrawMode || !e.touches[0]) return; e.preventDefault(); const t = e.touches[0]; ctx.lineTo(t.clientX, t.clientY); ctx.stroke(); }, { passive: false });
  canvas.addEventListener('touchend', stopDraw);
}
function toggleCurrentSlideHidden() {
  const activeSlideEl = slides[currentSlide - 1]; if (!activeSlideEl) return;
  const nextHidden = activeSlideEl.getAttribute('data-slide-hidden') !== 'true';
  if (nextHidden) activeSlideEl.setAttribute('data-slide-hidden', 'true'); else activeSlideEl.removeAttribute('data-slide-hidden');
  syncSlideHiddenUI(); if (typeof renderLeftFilmstripThumbnails === 'function') renderLeftFilmstripThumbnails(); saveHistorySnapshot(nextHidden ? '슬라이드 숨기기' : '슬라이드 숨김 해제');
}
function syncSlideHiddenUI() {
  const activeSlideEl = slides[currentSlide - 1], isHidden = Boolean(activeSlideEl && activeSlideEl.getAttribute('data-slide-hidden') === 'true'), btn = $studio('slideHideToggleBtn');
  if (btn) { btn.classList.toggle('is-active', isHidden); btn.textContent = isHidden ? '👁‍🗨 슬라이드 숨김됨' : '👁 슬라이드 숨기기'; }
}
function openSlideSorterModal() { const m = document.getElementById('slideSorterModal'); if (!m) return; renderSlideSorterGrid(); if (typeof openModalSafe === 'function') openModalSafe(m); else { m.classList.remove('hidden'); m.classList.add('flex'); m.style.display = 'flex'; } }
function closeSlideSorterModal() { const m = document.getElementById('slideSorterModal'); if (m) { if (typeof closeModalSafe === 'function') closeModalSafe(m); else { m.classList.add('hidden'); m.classList.remove('flex'); m.style.display = 'none'; } } }
function renderSlideSorterGrid() {
  const grid = document.getElementById('slideSorterGrid'); if (!grid) return; slides = Array.from(document.querySelectorAll('.slide'));
  grid.innerHTML = slides.map((sEl, idx) => {
    const num = idx + 1, isCur = num === currentSlide, isHid = sEl.getAttribute('data-slide-hidden') === 'true', sec = sEl.getAttribute('data-section') || '', h = sEl.querySelector('h1, h2, h3'), title = h ? h.textContent.trim().slice(0, 26) : `슬라이드 ${num}`;
    return `<div class="p-3 rounded-xl border-2 ${isCur ? 'border-gopro bg-gopro/5' : 'border-borderline bg-white'} ${isHid ? 'opacity-60' : ''} flex flex-col justify-between gap-2 shadow-xs"><div data-on-click="goToSlide(${num}); closeSlideSorterModal();" class="cursor-pointer space-y-1"><div class="flex items-center justify-between font-mono text-[10px] font-bold"><span class="px-1.5 py-0.5 rounded bg-ink text-white">P.${String(num).padStart(2, '0')}</span><span class="text-gopro truncate max-w-[110px]">${escapeAttr(sec)}</span></div><div class="text-xs font-extrabold text-ink line-clamp-2 min-h-[32px]">${escapeAttr(title)}</div></div><div class="flex items-center justify-between gap-1 pt-1 border-t border-borderline text-[10px] font-bold"><button type="button" data-on-click="goToSlide(${num}); moveCurrentSlide(-1); renderSlideSorterGrid();" class="px-1.5 py-0.5 rounded bg-canvas border border-borderline cursor-pointer">◀</button><button type="button" data-on-click="goToSlide(${num}); moveCurrentSlide(1); renderSlideSorterGrid();" class="px-1.5 py-0.5 rounded bg-canvas border border-borderline cursor-pointer">▶</button><button type="button" data-on-click="goToSlide(${num}); toggleCurrentSlideHidden(); renderSlideSorterGrid();" class="px-1.5 py-0.5 rounded ${isHid ? 'bg-rose-600 text-white' : 'bg-canvas border border-borderline'} cursor-pointer">${isHid ? '숨김해제' : '숨김'}</button><button type="button" data-on-click="goToSlide(${num}); duplicateCurrentSlide(); renderSlideSorterGrid();" class="px-1.5 py-0.5 rounded bg-canvas border border-borderline cursor-pointer">복제</button></div></div>`;
  }).join('');
}
function applySlideMasterConfig() {
  const logoTxt = ($studio('masterHeaderLogoInput')?.value || '').trim(), footerTxt = ($studio('masterFooterTextInput')?.value || '').trim(), showPageNum = Boolean($studio('masterShowPageNumChk')?.checked), skipCover = Boolean($studio('masterSkipCoverChk')?.checked);
  slides = Array.from(document.querySelectorAll('.slide')); const total = slides.length;
  slides.forEach((sEl, idx) => {
    sEl.querySelectorAll('.ppt-slide-master-layer').forEach(old => old.remove());
    if (skipCover && idx === 0) return; if (!logoTxt && !footerTxt && !showPageNum) return;
    const isDark = sEl.classList.contains('theme-dark'), txtColor = isDark ? 'rgba(255,255,255,0.62)' : 'rgba(17,17,17,0.52)', layer = document.createElement('div');
    layer.className = 'ppt-slide-master-layer';
    layer.innerHTML = `${logoTxt ? `<div style="position:absolute;top:14px;right:28px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:800;letter-spacing:0.06em;color:${txtColor};">${escapeAttr(logoTxt)}</div>` : ''}${footerTxt ? `<div style="position:absolute;bottom:12px;left:28px;font-size:11px;font-weight:600;color:${txtColor};">${escapeAttr(footerTxt)}</div>` : ''}${showPageNum ? `<div data-slide-number-token="true" style="position:absolute;bottom:12px;right:28px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:${txtColor};">${String(idx + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</div>` : ''}`;
    sEl.appendChild(layer);
  });
  saveHistorySnapshot('슬라이드 마스터 일괄 적용');
}
function clearSlideMasterConfig() { document.querySelectorAll('.ppt-slide-master-layer').forEach(el => el.remove()); saveHistorySnapshot('슬라이드 마스터 제거'); }
let __reuseCandidateSlidesHtml = [];
function triggerReuseSlidesImport() {
  const inp = document.getElementById('reuseSlidesFileImporter'); if (!inp) return;
  if (!inp.dataset.bound) {
    inp.dataset.bound = 'true';
    inp.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const raw = String(ev.target.result || ''); let stageHtml = '';
        if (file.name.toLowerCase().endsWith('.json')) { try { stageHtml = JSON.parse(raw).stageHtml || ''; } catch (err) {} }
        else { const doc = new DOMParser().parseFromString(raw, 'text/html'); const st = doc.getElementById('slideStage'); stageHtml = st ? st.innerHTML : raw; }
        const safeStage = typeof sanitizeImportedStageHtml === 'function' ? sanitizeImportedStageHtml(stageHtml) : stageHtml;
        const temp = document.createElement('div'); temp.innerHTML = safeStage;
        const importedSlides = Array.from(temp.querySelectorAll('.slide')); if (importedSlides.length === 0) return;
        __reuseCandidateSlidesHtml = importedSlides.map((s, idx) => { const h = s.querySelector('h1, h2, h3'); return { title: h ? h.textContent.trim().slice(0, 36) : `가져온 슬라이드 ${idx + 1}`, section: s.getAttribute('data-section') || '', outerHtml: s.outerHTML }; });
        openReuseSlidesModal();
      };
      reader.readAsText(file);
    });
  }
  inp.value = ''; inp.click();
}
function openReuseSlidesModal() { const m = document.getElementById('reuseSlidesModal'), list = document.getElementById('reuseSlidesList'); if (!m || !list) return; list.innerHTML = __reuseCandidateSlidesHtml.map((item, idx) => `<label class="flex items-center gap-2.5 p-2.5 rounded-xl bg-canvas border border-borderline hover:border-gopro text-xs cursor-pointer"><input type="checkbox" class="reuse-slide-chk cursor-pointer" value="${idx}" checked><span class="font-mono text-[10px] font-bold text-gopro shrink-0">P.${String(idx + 1).padStart(2, '0')}</span><span class="font-bold text-ink truncate flex-1">${escapeAttr(item.title)}</span><span class="font-mono text-[10px] text-muted shrink-0">${escapeAttr(item.section)}</span></label>`).join(''); if (typeof openModalSafe === 'function') openModalSafe(m); else { m.classList.remove('hidden'); m.classList.add('flex'); m.style.display = 'flex'; } }
function closeReuseSlidesModal() { const m = document.getElementById('reuseSlidesModal'); if (m) { if (typeof closeModalSafe === 'function') closeModalSafe(m); else { m.classList.add('hidden'); m.classList.remove('flex'); m.style.display = 'none'; } } }
function importSelectedSlidesFromModal() {
  const chks = Array.from(document.querySelectorAll('.reuse-slide-chk:checked')); if (chks.length === 0) return;
  const activeSlideEl = slides[currentSlide - 1], stage = document.getElementById('slideStage'); if (!stage) return;
  let insertAnchor = activeSlideEl;
  let insertedCount = 0;
  chks.forEach(chk => {
    const item = __reuseCandidateSlidesHtml[parseInt(chk.value, 10)]; if (!item) return;
    const wrap = document.createElement('div'); wrap.innerHTML = item.outerHtml;
    const newSlide = wrap.firstElementChild;
    if (newSlide) {
      newSlide.classList.remove('active', 'ppt-multi-selected', 'is-selected');
      if (typeof regenerateClonedSlideInternalIds === 'function') regenerateClonedSlideInternalIds(newSlide);
      if (insertAnchor && insertAnchor.parentNode === stage) {
        shiftGotoSlideTargetsOnInsert(currentSlide + 1 + insertedCount);
        insertAnchor.insertAdjacentElement('afterend', newSlide);
        insertAnchor = newSlide;
        insertedCount++;
      } else {
        stage.appendChild(newSlide);
      }
    }
  });
  closeReuseSlidesModal(); if (isEditMode && typeof makeAllTextEditable === 'function') makeAllTextEditable(true); updateSlideUI(); saveHistorySnapshot(`슬라이드 ${chks.length}장 가져오기`);
}
function toggleAutoPlayKiosk() {
  const btn = $studio('autoPlayKioskToggleBtn');
  if (autoPlayKioskTimer) { clearInterval(autoPlayKioskTimer); autoPlayKioskTimer = null; if (btn) { btn.classList.remove('is-active'); btn.textContent = '▶ 자동 전환 시작'; } return; }
  if (isEditMode && typeof toggleEditMode === 'function') toggleEditMode(false);
  const sec = Math.max(2, Math.min(120, parseInt($studio('autoPlayIntervalInput')?.value || '5', 10) || 5));
  if (btn) { btn.classList.add('is-active'); btn.textContent = `⏹ 자동 재생 중 (${sec}초)`; }
  autoPlayKioskTimer = setInterval(() => {
    const activeSlideEl = slides[currentSlide - 1];
    if (activeSlideEl && typeof advanceSlideBuildStep === 'function' && advanceSlideBuildStep(activeSlideEl)) { syncPresenterWindowState(); return; }
    const nextVisible = findNextVisibleSlideIndex(currentSlide, 1);
    if (nextVisible !== -1) goToSlide(nextVisible); else { const firstVisible = findNextVisibleSlideIndex(0, 1); if (firstVisible !== -1) goToSlide(firstVisible); }
  }, sec * 1000);
}
function getSlideCommentsArray(slideEl) { if (!slideEl) return []; try { const p = JSON.parse(slideEl.getAttribute('data-slide-comments') || '[]'); return Array.isArray(p) ? p : []; } catch (e) { return []; } }
function setSlideCommentsArray(slideEl, arr) { if (!slideEl) return; if (!arr || arr.length === 0) slideEl.removeAttribute('data-slide-comments'); else slideEl.setAttribute('data-slide-comments', JSON.stringify(arr)); syncSlideCommentsBadge(); }
function syncSlideCommentsBadge() {
  const activeSlideEl = slides[currentSlide - 1]; if (!activeSlideEl) return;
  activeSlideEl.querySelectorAll('.ppt-slide-comment-badge').forEach(b => b.remove());
  const comments = getSlideCommentsArray(activeSlideEl), openCount = comments.filter(c => !c.resolved).length, headerBadge = document.getElementById('headerCommentCountBadge');
  if (headerBadge) { headerBadge.textContent = comments.length > 0 ? String(comments.length) : ''; headerBadge.classList.toggle('hidden', comments.length === 0); }
  if (comments.length > 0) { const badge = document.createElement('button'); badge.type = 'button'; badge.className = 'ppt-slide-comment-badge'; badge.setAttribute('data-on-click', 'openSlideCommentsPanel()'); badge.textContent = openCount > 0 ? `💬 리뷰 메모 ${openCount}건` : `✅ 리뷰 완료 (${comments.length}건)`; activeSlideEl.appendChild(badge); }
}
function openSlideCommentsPanel() { const m = document.getElementById('slideCommentsModal'); if (!m) return; renderSlideCommentsList(); if (typeof openModalSafe === 'function') openModalSafe(m); else { m.classList.remove('hidden'); m.classList.add('flex'); m.style.display = 'flex'; } }
function closeSlideCommentsPanel() { const m = document.getElementById('slideCommentsModal'); if (m) { if (typeof closeModalSafe === 'function') closeModalSafe(m); else { m.classList.add('hidden'); m.classList.remove('flex'); m.style.display = 'none'; } } }
function renderSlideCommentsList() {
  const listEl = document.getElementById('slideCommentsList'), titleEl = document.getElementById('slideCommentsModalTitle'), activeSlideEl = slides[currentSlide - 1];
  if (titleEl) titleEl.textContent = `P.${String(currentSlide).padStart(2, '0')} 슬라이드 협업 리뷰 · 피드백 메모`;
  if (!listEl || !activeSlideEl) return;
  const comments = getSlideCommentsArray(activeSlideEl);
  if (comments.length === 0) { listEl.innerHTML = '<div class="text-xs text-muted text-center py-6">이 슬라이드에 등록된 팀 피드백/댓글이 없습니다. 아래에서 새 메모를 남겨보세요.</div>'; return; }
  listEl.innerHTML = comments.map((c, idx) => `<div class="p-3 rounded-xl border ${c.resolved ? 'bg-canvas border-borderline opacity-65' : 'bg-amber-50/75 border-amber-300'} space-y-1"><div class="flex items-center justify-between gap-2 text-[11px]"><span class="font-extrabold text-ink">👤 ${escapeAttr(c.author || '팀원')} <span class="font-mono text-[10px] font-normal text-muted ml-1">${escapeAttr(c.createdAt || '')}</span></span><div class="flex items-center gap-1"><button type="button" data-on-click="toggleSlideCommentResolved(${idx})" class="px-2 py-0.5 rounded ${c.resolved ? 'bg-emerald-600 text-white' : 'bg-white border border-borderline text-ink'} text-[10px] font-bold cursor-pointer">${c.resolved ? '✓ 해결됨' : '해결 표시'}</button><button type="button" data-on-click="deleteSlideReviewComment(${idx})" class="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-bold cursor-pointer">삭제</button></div></div><div class="text-xs text-ink leading-relaxed ${c.resolved ? 'line-through' : ''}">${escapeAttr(c.text)}</div></div>`).join('');
}
function addSlideReviewComment() {
  const activeSlideEl = slides[currentSlide - 1], authorInp = document.getElementById('slideCommentAuthorInput'), textInp = document.getElementById('slideCommentTextInput'); if (!activeSlideEl || !textInp) return;
  const rawText = (textInp.value || '').replace(/[<>]/g, '').trim().slice(0, 400); if (!rawText) return;
  const rawAuthor = ((authorInp ? authorInp.value : '') || '팀원').replace(/[<>]/g, '').trim().slice(0, 20) || '팀원';
  const now = new Date(), stamp = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const comments = getSlideCommentsArray(activeSlideEl); comments.push({ id: 'cmt_' + Date.now(), author: rawAuthor, text: rawText, resolved: false, createdAt: stamp });
  setSlideCommentsArray(activeSlideEl, comments); textInp.value = ''; renderSlideCommentsList(); saveHistorySnapshot('슬라이드 리뷰 댓글 추가');
}
function toggleSlideCommentResolved(idx) { const s = slides[currentSlide - 1]; if (!s) return; const c = getSlideCommentsArray(s); if (!c[idx]) return; c[idx].resolved = !c[idx].resolved; setSlideCommentsArray(s, c); renderSlideCommentsList(); saveHistorySnapshot('슬라이드 댓글 상태 변경'); }
function deleteSlideReviewComment(idx) { const s = slides[currentSlide - 1]; if (!s) return; const c = getSlideCommentsArray(s); c.splice(idx, 1); setSlideCommentsArray(s, c); renderSlideCommentsList(); saveHistorySnapshot('슬라이드 댓글 삭제'); }

let selectedFilmstripSlides = new Set();
let __copiedSlideOuterHtml = null;

function syncSlideNumberTokens() {
  slides = Array.from(document.querySelectorAll('.slide'));
  const totalStr = String(slides.length).padStart(2, '0');
  slides.forEach((sEl, idx) => {
    const numStr = String(idx + 1).padStart(2, '0');
    sEl.querySelectorAll('[data-slide-number-token="true"]').forEach(tok => {
      tok.textContent = `${numStr} / ${totalStr}`;
    });
  });
}

function insertSlideNumberToken() {
  const tokenHtml = `<span data-slide-number-token="true" contenteditable="false" class="inline-block px-2 py-0.5 rounded bg-ink text-white font-mono text-[11px] font-extrabold mx-1">${String(currentSlide).padStart(2, '0')} / ${String(totalSlides).padStart(2, '0')}</span>`;
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const r = sel.getRangeAt(0);
    const anc = r.commonAncestorContainer.nodeType === 3 ? r.commonAncestorContainer.parentElement : r.commonAncestorContainer;
    if (anc && anc.closest('#slideStage')) {
      r.deleteContents();
      const wrap = document.createElement('span');
      wrap.innerHTML = tokenHtml;
      const node = wrap.firstElementChild;
      if (node) {
        r.insertNode(node);
        syncSlideNumberTokens();
        saveHistorySnapshot('슬라이드 번호 토큰 삽입');
        showToast('슬라이드 번호 자동 토큰이 삽입되었습니다.');
        return;
      }
    }
  }
  const activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return;
  let layer = activeSlideEl.querySelector('.ppt-free-layer');
  if (!layer) { layer = document.createElement('div'); layer.className = 'ppt-free-layer'; activeSlideEl.appendChild(layer); }
  const obj = document.createElement('div');
  obj.className = 'ppt-free-obj';
  obj.setAttribute('data-shape-type', 'textbox');
  obj.style.left = '88%'; obj.style.top = '91%'; obj.style.width = 'fit-content'; obj.style.height = 'auto';
  obj.style.padding = '2px 4px'; obj.style.zIndex = String(layer.children.length + 25);
  obj.innerHTML = tokenHtml;
  layer.appendChild(obj);
  syncSlideNumberTokens();
  saveHistorySnapshot('슬라이드 번호 배지 삽입');
  showToast('우측 하단에 자동 슬라이드 번호 배지가 삽입되었습니다.');
}

function toggleLeftFilmstrip() {
  const aside = document.getElementById('pptLeftFilmstrip');
  if (!aside) return;
  const collapsed = aside.classList.toggle('filmstrip-collapsed');
  const btn = document.getElementById('filmstripCollapseBtn');
  if (btn) btn.textContent = collapsed ? '▶' : '◀';
  setTimeout(() => { if (typeof updateStageViewportScale === 'function') updateStageViewportScale(); }, 20);
}

function renderLeftFilmstripThumbnails() {
  const listEl = document.getElementById('leftFilmstripList');
  if (!listEl) return;
  slides = Array.from(document.querySelectorAll('.slide'));
  listEl.innerHTML = slides.map((sEl, idx) => {
    const num = idx + 1;
    const isCur = num === currentSlide;
    const isMulti = selectedFilmstripSlides.has(num);
    const isHid = sEl.getAttribute('data-slide-hidden') === 'true';
    const isLocked = sEl.getAttribute('data-slide-locked') === 'true';
    const sec = sEl.getAttribute('data-section') || '';
    const h = sEl.querySelector('h1, h2, h3');
    const title = h ? h.textContent.trim().slice(0, 22) : `슬라이드 ${num}`;
    return `<div tabindex="0" draggable="true" data-film-idx="${idx}" data-on-dragstart="onFilmstripDragStart(event, ${idx})" data-on-dragover="event.preventDefault()" data-on-drop="onFilmstripDrop(event, ${idx})" data-on-click="onFilmstripCardClick(event, ${num})" class="filmstrip-thumb-card ${isCur ? 'is-active-slide' : ''} ${isMulti ? 'is-multi-slide' : ''} ${isHid ? 'opacity-55' : ''}">
      <div class="flex items-center justify-between gap-1 font-mono text-[9px] font-extrabold mb-1">
        <span class="px-1.5 py-0.2 rounded ${isCur ? 'bg-gopro text-white' : 'bg-ink text-white'}">P.${String(num).padStart(2, '0')}</span>
        <span class="truncate text-muted">${isLocked ? '🔒 ' : ''}${isHid ? '👁‍🗨 ' : ''}${escapeAttr(sec)}</span>
      </div>
      <div class="text-[11px] font-bold text-ink line-clamp-2 leading-snug">${escapeAttr(title)}</div>
    </div>`;
  }).join('');
}

let __dragFilmIdx = -1;
function onFilmstripDragStart(e, idx) {
  __dragFilmIdx = idx;
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
}
function onFilmstripDrop(e, targetIdx) {
  e.preventDefault();
  if (__dragFilmIdx < 0 || __dragFilmIdx === targetIdx) return;
  const stage = document.getElementById('slideStage');
  const all = Array.from(document.querySelectorAll('.slide'));
  const movingEl = all[__dragFilmIdx];
  const targetEl = all[targetIdx];
  if (!stage || !movingEl || !targetEl) return;
  const fromNum = __dragFilmIdx + 1;
  const toNum = targetIdx + 1;
  if (__dragFilmIdx < targetIdx) targetEl.insertAdjacentElement('afterend', movingEl);
  else targetEl.insertAdjacentElement('beforebegin', movingEl);
  __dragFilmIdx = -1;
  remapGotoSlideTargetsOnReorder(fromNum, toNum);
  currentSlide = toNum;
  updateSlideUI();
  saveHistorySnapshot('슬라이드 드래그 순서 변경');
}

function onFilmstripCardClick(e, slideNum) {
  if (e && (e.shiftKey || e.ctrlKey || e.metaKey)) {
    if (selectedFilmstripSlides.has(slideNum)) selectedFilmstripSlides.delete(slideNum);
    else selectedFilmstripSlides.add(slideNum);
    renderLeftFilmstripThumbnails();
    return;
  }
  selectedFilmstripSlides.clear();
  selectedFilmstripSlides.add(slideNum);
  goToSlide(slideNum);
  const focusCard = document.querySelector(`#leftFilmstripList .filmstrip-thumb-card[data-film-idx="${slideNum - 1}"]`);
  if (focusCard && typeof focusCard.focus === 'function') focusCard.focus({ preventScroll: true });
}

function duplicateSelectedFilmstripSlides() {
  const targets = selectedFilmstripSlides.size > 0 ? Array.from(selectedFilmstripSlides).sort((a, b) => b - a) : [currentSlide];
  const all = Array.from(document.querySelectorAll('.slide'));
  targets.forEach(num => {
    const s = all[num - 1];
    if (s) {
      const clone = s.cloneNode(true);
      clone.classList.remove('active', 'ppt-multi-selected', 'is-selected');
      regenerateClonedSlideInternalIds(clone);
      s.insertAdjacentElement('afterend', clone);
      shiftGotoSlideTargetsOnInsert(num + 1);
    }
  });
  selectedFilmstripSlides.clear();
  if (isEditMode && typeof makeAllTextEditable === 'function') makeAllTextEditable(true);
  updateSlideUI();
  saveHistorySnapshot(`슬라이드 ${targets.length}장 복제`);
  showToast(`선택한 슬라이드 ${targets.length}장이 복제되었습니다.`);
}

function deleteSelectedFilmstripSlides() {
  const all = Array.from(document.querySelectorAll('.slide'));
  const rawTargets = selectedFilmstripSlides.size > 0 ? Array.from(selectedFilmstripSlides).sort((a, b) => b - a) : [currentSlide];
  const targets = rawTargets.filter(num => { const s = all[num - 1]; return s && s.getAttribute('data-slide-locked') !== 'true'; });
  if (rawTargets.length > 0 && targets.length === 0) { showToast('잠긴 슬라이드는 잠금 해제 후 삭제할 수 있습니다.'); return; }
  if (all.length - targets.length < 1) {
    showToast('최소 1장의 슬라이드는 유지해야 합니다.');
    return;
  }
  let remCount = all.length;
  targets.forEach(num => {
    const s = all[num - 1];
    if (s) {
      s.querySelectorAll('video, audio').forEach(m => { try { if (!m.paused) m.pause(); } catch (e) {} });
      s.remove();
      remCount--;
      shiftGotoSlideTargetsOnDelete(num, Math.max(1, remCount));
    }
  });
  selectedFilmstripSlides.clear();
  slides = Array.from(document.querySelectorAll('.slide'));
  totalSlides = slides.length;
  currentSlide = Math.max(1, Math.min(currentSlide, totalSlides));
  updateSlideUI();
  saveHistorySnapshot(`슬라이드 ${targets.length}장 삭제`);
  showToast(`선택한 슬라이드 ${targets.length}장이 삭제되었습니다.`);
}

function copyCurrentSlideToClipboard() {
  const s = slides[currentSlide - 1];
  if (!s) return;
  const cleanClone = s.cloneNode(true);
  cleanClone.classList.remove('active', 'ppt-multi-selected', 'is-selected');
  cleanClone.querySelectorAll('.ppt-multi-selected, .is-selected').forEach(el => el.classList.remove('ppt-multi-selected', 'is-selected'));
  cleanClone.querySelectorAll('.iw-flip-scene').forEach(el => el.classList.remove('is-editing-back', 'is-flipped'));
  cleanClone.querySelectorAll('.iw-hs-pin.is-open').forEach(el => el.classList.remove('is-open'));
  cleanClone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
  __copiedSlideOuterHtml = cleanClone.outerHTML;
  showToast(`현재 슬라이드(P.${String(currentSlide).padStart(2, '0')})가 클립보드에 복사되었습니다.`);
}

function pasteCopiedSlide() {
  if (!__copiedSlideOuterHtml) {
    showToast('먼저 복사할 슬라이드를 선택해 복사해 주세요.');
    return;
  }
  const s = slides[currentSlide - 1];
  if (!s) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = __copiedSlideOuterHtml;
  const newSlide = wrap.firstElementChild;
  if (!newSlide) return;
  newSlide.classList.remove('active', 'ppt-multi-selected', 'is-selected');
  regenerateClonedSlideInternalIds(newSlide);
  s.insertAdjacentElement('afterend', newSlide);
  shiftGotoSlideTargetsOnInsert(currentSlide + 1);
  if (isEditMode && typeof makeAllTextEditable === 'function') makeAllTextEditable(true);
  goToSlide(currentSlide + 1);
  saveHistorySnapshot('복사한 슬라이드 붙여넣기');
  showToast('복사한 슬라이드가 다음 페이지에 삽입되었습니다.');
}

function addSlideWithLayout(layoutKey) {
  const key = layoutKey || $studio('newSlideLayoutSelect')?.value || '2col';
  const curSlideEl = slides[currentSlide - 1];
  const stage = document.getElementById('slideStage');
  if (!stage) return;
  const sectionLabel = curSlideEl ? (curSlideEl.getAttribute('data-section') || 'NEW SECTION') : 'NEW SECTION';
  const newSlide = document.createElement('section');
  newSlide.className = 'slide theme-light px-8 md:px-14 pt-6 pb-8 flex flex-col justify-between';
  newSlide.style.backgroundColor = '#F5F5F7';
  newSlide.setAttribute('data-section', sectionLabel);

  const cardCtrlHtml = `<div class="card-edit-controls items-center justify-end gap-1 mb-2"><button type="button" data-on-click="moveCard(this, -1)" class="px-2 py-0.5 rounded bg-canvas border border-borderline text-[11px] font-mono">◀ 이전</button><button type="button" data-on-click="moveCard(this, 1)" class="px-2 py-0.5 rounded bg-canvas border border-borderline text-[11px] font-mono">▶ 다음</button><button type="button" data-on-click="deleteCard(this)" class="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[11px] font-bold">×</button></div>`;
  const bgLayersHtml = `<div class="slide-bg-layer"></div><div class="slide-bg-overlay"></div>`;

  const makeHeaderHtml = (badgeTxt, titleTxt) => `<div class="slide-header-bar flex items-end justify-between border-b border-borderline pb-3.5 shrink-0">
    <div>
      <span data-editable class="font-mono text-xs font-extrabold tracking-widest text-gopro uppercase">${escapeAttr(badgeTxt || sectionLabel)}</span>
      <h2 data-editable class="text-2xl md:text-3xl font-extrabold tracking-tight text-ink mt-1">${escapeAttr(titleTxt || '새 슬라이드 타이틀을 입력하세요')}</h2>
    </div>
  </div>`;

  let bodyHtml = '';
  let needsChartHydration = false;

  if (key === 'cover') {
    newSlide.className = 'slide theme-dark px-12 md:px-20 py-14 flex flex-col justify-center';
    newSlide.style.backgroundColor = '#0F172A';
    bodyHtml = `<div class="max-w-4xl space-y-5">
      <span data-editable class="inline-block px-3 py-1 rounded-full bg-gopro text-white font-mono text-xs font-bold tracking-wider uppercase">PRESENTATION COVER</span>
      <h1 data-editable class="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">프레젠테이션 메인 타이틀</h1>
      <p data-editable class="text-lg md:text-xl text-white/75 font-medium">부제목 · 발표자 이름 · 날짜를 입력하세요</p>
    </div>`;
  } else if (key === 'section') {
    newSlide.className = 'slide theme-dark px-12 md:px-20 py-14 flex flex-col justify-center items-center text-center';
    newSlide.style.backgroundColor = '#111111';
    bodyHtml = `<div class="max-w-3xl space-y-4">
      <span data-editable class="font-mono text-sm font-extrabold tracking-widest text-marker uppercase">PART 01</span>
      <h1 data-editable class="text-4xl md:text-5xl font-black tracking-tight text-white">섹션 구분 타이틀</h1>
      <p data-editable class="text-base md:text-lg text-white/70">이 파트에서 다룰 핵심 주제를 한 줄로 요약하세요.</p>
    </div>`;
  } else if (key === 'quote') {
    newSlide.className = 'slide theme-dark px-12 md:px-20 py-14 flex flex-col justify-center items-center text-center';
    newSlide.style.backgroundColor = '#0F172A';
    bodyHtml = `<div class="max-w-4xl space-y-6">
      <span data-editable class="inline-block px-3.5 py-1 rounded-full bg-white/10 border border-white/20 text-sky-300 font-mono text-xs font-extrabold tracking-widest uppercase">KEY INSIGHT · QUOTE</span>
      <blockquote data-editable class="text-3xl md:text-5xl font-black tracking-tight text-white leading-snug">“좋은 프레젠테이션은 정보를 나열하지 않고,<br>청중이 직접 경험하게 만듭니다.”</blockquote>
      <div data-editable class="font-mono text-sm text-white/70 pt-2">— 발표자 · 핵심 인용구 출처</div>
    </div>`;
  } else if (key === 'blank') {
    bodyHtml = `<div class="slide-grid-body flex-1 grid grid-cols-1 gap-4 pt-4"></div>`;
  } else if (key === '1col') {
    bodyHtml = `${makeHeaderHtml(sectionLabel, '핵심 주제 타이틀')}<div class="slide-grid-body flex-1 grid grid-cols-1 gap-5 pt-5 overflow-y-auto safe-scroll">
      <div class="slide-card bg-white border border-borderline rounded-2xl p-7 flex flex-col justify-center space-y-3">
        ${cardCtrlHtml}
        <span data-editable class="font-mono text-xs font-bold text-gopro uppercase">KEY MESSAGE</span>
        <h3 data-editable class="text-2xl font-extrabold text-ink">핵심 본문 제목</h3>
        <p data-editable class="text-base text-muted leading-relaxed">여기에 핵심 내용, 인사이트, 근거 데이터를 자유롭게 작성하세요.</p>
      </div>
    </div>`;
  } else if (key === '3col') {
    bodyHtml = `${makeHeaderHtml(sectionLabel, '3단 핵심 요약')}<div class="slide-grid-body flex-1 grid grid-cols-1 md:grid-cols-3 gap-5 pt-5 overflow-y-auto safe-scroll">
      ${[1, 2, 3].map(n => `<div class="slide-card bg-white border border-borderline rounded-2xl p-6 flex flex-col justify-between space-y-3">
        ${cardCtrlHtml}
        <div>
          <span data-editable class="font-mono text-xs font-bold text-gopro">0${n}</span>
          <h3 data-editable class="text-xl font-extrabold text-ink mt-1">핵심 포인트 ${n}</h3>
          <p data-editable class="text-sm text-muted leading-relaxed mt-2">세부 설명 내용을 입력하세요.</p>
        </div>
      </div>`).join('')}
    </div>`;
  } else if (key === 'bento-2d') {
    bodyHtml = `${makeHeaderHtml('ASYMMETRIC 2D BENTO', '2D 비대칭 벤토 레이아웃')}<div class="slide-grid-body flex-1 grid gap-4 pt-5" data-bento-2d="true" style="display: grid; grid-template-columns: repeat(24, minmax(0, 1fr)); grid-template-rows: repeat(24, minmax(0, 1fr)); overflow-y: hidden;">
      <div class="slide-card bg-white border border-borderline rounded-2xl p-7 flex flex-col justify-between" data-bento-start-col="1" data-bento-span="13" data-bento-start-row="1" data-bento-row-span="24" style="grid-column: 1 / span 13; grid-row: 1 / span 24; height: 100%; min-height: 0; max-height: none; margin-top: 0; align-self: stretch;">
        ${cardCtrlHtml}
        <div>
          <span data-editable class="font-mono text-xs font-bold text-gopro block mb-2">MAIN HERO · 24 ROWS</span>
          <h3 data-editable class="text-2xl md:text-3xl font-extrabold text-ink mb-3">좌측 메인 핵심 영역</h3>
          <p data-editable class="text-sm md:text-base text-muted leading-relaxed">메인 비주얼, 핵심 전략 또는 인터랙티브 위젯을 배치하는 영역입니다. 경계선을 드래그해 우측 두 카드와 비율을 자유롭게 조절할 수 있습니다.</p>
        </div>
        <div data-editable class="pt-3 border-t border-borderline font-mono text-xs text-subtle">COL 1–13 · FULL HEIGHT</div>
      </div>
      <div class="slide-card bg-white border border-borderline rounded-2xl p-6 flex flex-col justify-between" data-bento-start-col="14" data-bento-span="11" data-bento-start-row="1" data-bento-row-span="12" style="grid-column: 14 / span 11; grid-row: 1 / span 12; height: 100%; min-height: 0; max-height: none; margin-top: 0; align-self: stretch;">
        ${cardCtrlHtml}
        <div>
          <span data-editable class="font-mono text-xs font-bold text-emerald-600 block mb-1">SUB POINT 01</span>
          <h3 data-editable class="text-xl font-extrabold text-ink mb-1.5">우측 상단 보충 포인트</h3>
          <p data-editable class="text-sm text-muted leading-relaxed">핵심 근거 데이터나 첫 번째 세부 지표를 정리하세요.</p>
        </div>
      </div>
      <div class="slide-card bg-white border border-borderline rounded-2xl p-6 flex flex-col justify-between" data-bento-start-col="14" data-bento-span="11" data-bento-start-row="13" data-bento-row-span="12" style="grid-column: 14 / span 11; grid-row: 13 / span 12; height: 100%; min-height: 0; max-height: none; margin-top: 0; align-self: stretch;">
        ${cardCtrlHtml}
        <div>
          <span data-editable class="font-mono text-xs font-bold text-indigo-600 block mb-1">SUB POINT 02</span>
          <h3 data-editable class="text-xl font-extrabold text-ink mb-1.5">우측 하단 실행 액션</h3>
          <p data-editable class="text-sm text-muted leading-relaxed">기대 효과나 다음 단계 액션을 간결하게 배치하세요.</p>
        </div>
      </div>
    </div>`;
  } else if (key === 'before-after') {
    const baHtml = typeof buildBeforeAfterWidgetHtml === 'function' ? buildBeforeAfterWidgetHtml() : '';
    bodyHtml = `${makeHeaderHtml('BEFORE / AFTER COMPARISON', '개선 전 · 후 시각 비교')}<div class="slide-grid-body flex-1 grid grid-cols-1 md:grid-cols-12 gap-5 pt-5 overflow-y-auto safe-scroll">
      <div class="slide-card md:col-span-8 bg-white border border-borderline rounded-2xl p-4 flex flex-col justify-center">
        ${cardCtrlHtml}
        <div class="card-embedded-obj ppt-interactive-widget" data-iw-type="before-after" data-shape-type="interactive" style="width:100%; height:100%; min-height:280px; padding:0;">${baHtml}</div>
      </div>
      <div class="slide-card md:col-span-4 bg-white border border-borderline rounded-2xl p-6 flex flex-col justify-between">
        ${cardCtrlHtml}
        <div class="space-y-4">
          <span data-editable class="font-mono text-xs font-bold text-gopro uppercase">KEY CHANGES</span>
          <h3 data-editable class="text-xl font-extrabold text-ink">무엇이 달라졌는가?</h3>
          <ul class="space-y-2.5 text-sm text-muted">
            <li data-editable>• <b class="text-ink">시각적 명확성:</b> 핵심 요소 대비를 2배 강화</li>
            <li data-editable>• <b class="text-ink">구조 단순화:</b> 불필요한 단계를 제거해 즉시 이해</li>
            <li data-editable>• <b class="text-ink">인터랙티브 비교:</b> 발표 중 좌우 드래그로 실시간 시연</li>
          </ul>
        </div>
        <div data-editable class="pt-3 border-t border-borderline font-mono text-xs text-subtle">DRAG SLIDER LEFT ↔ RIGHT</div>
      </div>
    </div>`;
  } else if (key === 'hotspot') {
    const hsHtml = typeof buildHotspotWidgetHtml === 'function' ? buildHotspotWidgetHtml() : '';
    bodyHtml = `${makeHeaderHtml('INTERACTIVE PRODUCT TOUR', '제품 · 구조 핫스팟 상세 분석')}<div class="slide-grid-body flex-1 grid grid-cols-1 md:grid-cols-12 gap-5 pt-5 overflow-y-auto safe-scroll">
      <div class="slide-card md:col-span-8 bg-white border border-borderline rounded-2xl p-4 flex flex-col justify-center">
        ${cardCtrlHtml}
        <div class="card-embedded-obj ppt-interactive-widget" data-iw-type="hotspot" data-shape-type="interactive" style="width:100%; height:100%; min-height:280px; padding:0;">${hsHtml}</div>
      </div>
      <div class="slide-card md:col-span-4 bg-white border border-borderline rounded-2xl p-6 flex flex-col justify-between">
        ${cardCtrlHtml}
        <div class="space-y-3">
          <span data-editable class="font-mono text-xs font-bold text-gopro uppercase">SPEC HIGHLIGHTS</span>
          <h3 data-editable class="text-xl font-extrabold text-ink">핵심 부위별 포인트</h3>
          <p data-editable class="text-sm text-muted leading-relaxed">좌측 이미지의 번호 핀을 클릭하면 각 부위의 상세 스펙과 설명이 말풍선으로 펼쳐집니다. 배경 이미지를 교체하고 핀을 드래그해 원하는 위치에 배치하세요.</p>
        </div>
        <div data-editable class="pt-3 border-t border-borderline font-mono text-xs text-subtle">CLICK NUMBERED PINS TO INSPECT</div>
      </div>
    </div>`;
  } else if (key === 'kpi-dashboard') {
    needsChartHydration = true;
    const kpiChartJson = escapeAttr(JSON.stringify({
      type: 'bar-v',
      title: '분기별 성과 추이 (시나리오 전환 지원)',
      syncAccent: false,
      valuePrefix: '',
      valueSuffix: '%',
      scenariosEnabled: true,
      activeScenarioIdx: 0,
      scenarios: [
        { name: '기본', items: [{ label: '1분기', value: 64, sub: '도입기', color: '#0055FF' }, { label: '2분기', value: 78, sub: '확산기', color: '#059669' }, { label: '3분기', value: 89, sub: '안정기', color: '#7C3AED' }, { label: '4분기', value: 96, sub: '목표 달성', color: '#111111' }] },
        { name: '낙관적', items: [{ label: '1분기', value: 72, sub: '조기 안착', color: '#0055FF' }, { label: '2분기', value: 88, sub: '고성장', color: '#059669' }, { label: '3분기', value: 95, sub: '초과 달성', color: '#7C3AED' }, { label: '4분기', value: 100, sub: '최고 실적', color: '#111111' }] }
      ],
      items: [{ label: '1분기', value: 64, sub: '도입기', color: '#0055FF' }, { label: '2분기', value: 78, sub: '확산기', color: '#059669' }, { label: '3분기', value: 89, sub: '안정기', color: '#7C3AED' }, { label: '4분기', value: 96, sub: '목표 달성', color: '#111111' }]
    }));
    const kpiItems = [
      { tag: 'REVENUE GROWTH', val: '+148%', desc: '전년 동기 대비 매출 성장률' },
      { tag: 'ACTIVE USERS', val: '94.2%', desc: '핵심 사용자 월간 리텐션' },
      { tag: 'EFFICIENCY', val: '3.4배', desc: '작업 시간 단축 및 자동화율' }
    ];
    bodyHtml = `${makeHeaderHtml('KPI DASHBOARD', '핵심 성과 지표 및 추이 분석')}<div class="slide-grid-body flex-1 grid gap-4 pt-5" data-bento-2d="true" style="display: grid; grid-template-columns: repeat(24, minmax(0, 1fr)); grid-template-rows: repeat(24, minmax(0, 1fr)); overflow-y: hidden;">
      ${kpiItems.map((m, i) => `<div class="slide-card bg-white border border-borderline rounded-2xl p-5 flex flex-col justify-between" data-bento-start-col="${1 + i * 8}" data-bento-span="8" data-bento-start-row="1" data-bento-row-span="9" style="grid-column: ${1 + i * 8} / span 8; grid-row: 1 / span 9; height: 100%; min-height: 0; max-height: none; margin-top: 0; align-self: stretch;">
        ${cardCtrlHtml}
        <span data-editable class="font-mono text-[10px] font-bold text-gopro">${m.tag}</span>
        <div data-editable class="text-5xl font-black text-ink tracking-tight">${m.val}</div>
        <p data-editable class="text-xs text-muted">${m.desc}</p>
      </div>`).join('')}
      <div class="slide-card bg-white border border-borderline rounded-2xl p-5 flex flex-col justify-center" data-bento-start-col="1" data-bento-span="24" data-bento-start-row="10" data-bento-row-span="15" style="grid-column: 1 / span 24; grid-row: 10 / span 15; height: 100%; min-height: 0; max-height: none; margin-top: 0; align-self: stretch;">
        ${cardCtrlHtml}
        <div class="ppt-chart-widget" data-chart-uid="chart_${Date.now()}_${Math.random().toString(36).slice(2, 6)}" data-chart-json="${kpiChartJson}"></div>
      </div>
    </div>`;
  } else if (key === 'timeline') {
    const steps = [
      { num: 'STEP 01', period: 'WEEK 1–2', title: '리서치 및 문제 정의', desc: '핵심 사용자 인터뷰와 시장 데이터를 수집해 우선순위 과제를 도출합니다.' },
      { num: 'STEP 02', period: 'WEEK 3–4', title: '전략 수립 및 프로토타입', desc: '솔루션 시안을 설계하고 인터랙티브 프로토타입으로 빠르게 검증합니다.' },
      { num: 'STEP 03', period: 'WEEK 5–6', title: '개발 및 파일럿 테스트', desc: '실사용 환경에서 피드백을 수집하고 병목 구간을 집중 개선합니다.' },
      { num: 'STEP 04', period: 'WEEK 7–8', title: '정식 배포 및 성과 확산', desc: '전체 대상 론칭 후 핵심 KPI를 추적하며 지속 고도화를 진행합니다.' }
    ];
    bodyHtml = `${makeHeaderHtml('PROJECT TIMELINE', '단계별 실행 로드맵 (4-STEP)')}<div class="slide-grid-body flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 pt-5 overflow-y-auto safe-scroll">
      ${steps.map(st => `<div class="slide-card bg-white border border-borderline rounded-2xl p-5 flex flex-col justify-between">
        ${cardCtrlHtml}
        <div>
          <div class="flex items-center justify-between gap-2 mb-3">
            <span data-editable class="px-2.5 py-0.5 rounded-full bg-gopro text-white font-mono text-[10px] font-extrabold">${st.num}</span>
            <span data-editable class="font-mono text-[10px] font-bold text-subtle">${st.period}</span>
          </div>
          <h3 data-editable class="text-lg font-extrabold text-ink mb-2">${st.title}</h3>
          <p data-editable class="text-xs md:text-sm text-muted leading-relaxed">${st.desc}</p>
        </div>
        <div data-editable class="pt-3 mt-4 border-t border-borderline font-mono text-[10px] text-gopro font-bold">DELIVERABLE READY →</div>
      </div>`).join('')}
    </div>`;
  } else {
    bodyHtml = `${makeHeaderHtml(sectionLabel, '2단 비교 슬라이드')}<div class="slide-grid-body flex-1 grid grid-cols-1 md:grid-cols-2 gap-5 pt-5 overflow-y-auto safe-scroll">
      ${[1, 2].map(n => `<div class="slide-card bg-white border border-borderline rounded-2xl p-6 flex flex-col justify-between space-y-3">
        ${cardCtrlHtml}
        <div>
          <span data-editable class="font-mono text-xs font-bold text-gopro">POINT 0${n}</span>
          <h3 data-editable class="text-xl font-extrabold text-ink mt-1">비교 항목 ${n}</h3>
          <p data-editable class="text-sm text-muted leading-relaxed mt-2">좌우 비교 내용을 입력하세요.</p>
        </div>
      </div>`).join('')}
    </div>`;
  }

  newSlide.innerHTML = bgLayersHtml + bodyHtml + `<div class="ppt-free-layer"></div>`;
  newSlide.querySelectorAll('.slide-card').forEach(c => { c.setAttribute('data-hover-init', 'true'); c.classList.add('hover-reactive'); });
  if (needsChartHydration && typeof writeChartDataAndRender === 'function') {
    newSlide.querySelectorAll('.ppt-chart-widget[data-chart-json]').forEach(w => {
      try { writeChartDataAndRender(w, JSON.parse(w.getAttribute('data-chart-json'))); } catch (e) {}
    });
  }
  if (curSlideEl && curSlideEl.parentNode === stage) {
    curSlideEl.insertAdjacentElement('afterend', newSlide);
    shiftGotoSlideTargetsOnInsert(currentSlide + 1);
  } else {
    stage.appendChild(newSlide);
  }
  if (isEditMode && typeof makeAllTextEditable === 'function') makeAllTextEditable(true);
  goToSlide(curSlideEl ? currentSlide + 1 : document.querySelectorAll('.slide').length);
  saveHistorySnapshot(`새 슬라이드 추가 (${key})`);
}

function resetCurrentSlideToInitial() {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  if (!initialDeckStageHtml) {
    showToast('복원할 초기 슬라이드 원본 데이터가 없습니다.');
    return;
  }
  const temp = document.createElement('div');
  temp.innerHTML = initialDeckStageHtml;
  const origSlides = Array.from(temp.querySelectorAll('.slide'));
  const targetOrig = origSlides[currentSlide - 1];
  const curSlideEl = slides[currentSlide - 1];
  if (!targetOrig || !curSlideEl) {
    showToast('새로 추가된 슬라이드는 초기 원본에 존재하지 않습니다.');
    return;
  }
  const clone = targetOrig.cloneNode(true);
  clone.classList.add('active');
  curSlideEl.replaceWith(clone);
  if (isEditMode && typeof makeAllTextEditable === 'function') makeAllTextEditable(true);
  clearSelectionInspector();
  updateSlideUI();
  saveHistorySnapshot(`P.${String(currentSlide).padStart(2, '0')} 초기 상태 복원`);
  showToast(`현재 슬라이드(P.${String(currentSlide).padStart(2, '0')})가 초기 원본으로 복원되었습니다.`);
}

function resetEntireDeckToInitial() {
  if (!initialDeckStageHtml) return;
  if (!window.confirm('모든 슬라이드의 편집 내용을 버리고 처음 불러온 초기 원본 상태로 되돌릴까요?')) return;
  restoreStageHtml(initialDeckStageHtml);
  goToSlide(1);
  saveHistorySnapshot('전체 덱 초기 원본 복원');
  showToast('전체 프레젠테이션이 초기 원본 상태로 복원되었습니다.');
}

function replaceFontAcrossDeck() {
  const fromFont = $studio('replaceFontFromSelect')?.value || '';
  const toFont = $studio('replaceFontToSelect')?.value || '';
  if (!toFont) return;
  let changed = 0;
  document.querySelectorAll('#slideStage [data-editable], #slideStage h1, #slideStage h2, #slideStage h3, #slideStage h4, #slideStage p, #slideStage li, #slideStage span').forEach(el => {
    if (el.closest('.slide[data-slide-locked="true"], [data-layer-locked="true"], .card-edit-controls, .img-edit-overlay, .sub-box-del-btn, .iw-edit-bar, .chart-scenario-bar, .iw-flip-cue, .iw-hs-dot, .ppt-slide-comment-badge')) return;
    const curFamily = (el.style.fontFamily || window.getComputedStyle(el).fontFamily || '');
    if (!fromFont || curFamily.includes(fromFont)) {
      el.style.fontFamily = toFont;
      changed++;
    }
  });
  saveHistorySnapshot('전체 슬라이드 글꼴 일괄 변경');
  showToast(`전체 슬라이드에서 총 ${changed}개 텍스트의 글꼴이 일괄 변경되었습니다!`);
}
