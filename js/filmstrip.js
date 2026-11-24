/* ==================== LEFT FILMSTRIP THUMBNAILS, MULTI-SELECT & SLIDE CLIPBOARD (v5.5.2 Modularized) ==================== */
let selectedFilmstripSlides = new Set();
let __copiedSlideOuterHtml = null;

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
