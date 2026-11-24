/* ==================== CARD INLINE RESIZABLE & MOVABLE MEDIA (IMAGE / VIDEO) ==================== */
function buildCleanCardMediaHtml(captionText) {
  return `
    <div class="card-media-placeholder flex flex-col items-center justify-center text-center p-4 cursor-pointer w-full h-full" data-on-click="event.stopPropagation(); uploadCardInlineMedia(this.closest('.card-inline-media'), 'image')">
      <div class="w-10 h-10 rounded-full bg-white border border-borderline flex items-center justify-center text-gopro mb-2 shadow-2xs">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
      </div>
      <p class="text-xs font-extrabold text-ink">${captionText || '미디어 프레임 — 클릭하여 사진 또는 동영상 첨부'}</p>
      <div class="flex items-center justify-center gap-1.5 mt-2">
        <button type="button" data-on-click="event.stopPropagation(); uploadCardInlineMedia(this.closest('.card-inline-media'), 'image')" class="px-2.5 py-1 rounded-full bg-gopro text-white text-[11px] font-bold cursor-pointer">🖼 사진 첨부</button>
        <button type="button" data-on-click="event.stopPropagation(); uploadCardInlineMedia(this.closest('.card-inline-media'), 'video')" class="px-2.5 py-1 rounded-full bg-ink text-white text-[11px] font-bold cursor-pointer">🎬 동영상 첨부</button>
      </div>
    </div>
    <div class="card-media-controls absolute top-2.5 right-2.5 bg-ink/85 backdrop-blur-xs text-white rounded-full px-2.5 py-1 items-center gap-1 text-[10px] shadow-md z-10" data-on-click="event.stopPropagation()">
      <button type="button" data-on-click="setCardMediaDockPosition('top', this.closest('.card-inline-media'))" class="px-1.5 py-0.5 rounded-full bg-white/15 hover:bg-white/30 cursor-pointer" title="상단 배치">상단</button>
      <button type="button" data-on-click="setCardMediaDockPosition('bottom', this.closest('.card-inline-media'))" class="px-1.5 py-0.5 rounded-full bg-white/15 hover:bg-white/30 cursor-pointer" title="하단 배치">하단</button>
      <button type="button" data-on-click="setCardMediaDockPosition('left', this.closest('.card-inline-media'))" class="px-1.5 py-0.5 rounded-full bg-white/15 hover:bg-white/30 cursor-pointer" title="좌측 분할">좌측</button>
      <button type="button" data-on-click="setCardMediaDockPosition('right', this.closest('.card-inline-media'))" class="px-1.5 py-0.5 rounded-full bg-white/15 hover:bg-white/30 cursor-pointer" title="우측 분할">우측</button>
      <button type="button" data-on-click="adjustSlotMediaScale(this.closest('.card-inline-media'), -10)" class="px-1.5 py-0.5 rounded-full bg-white/15 hover:bg-white/30 cursor-pointer" title="카드 고정 · 미디어 축소">축소-</button>
      <button type="button" data-on-click="adjustSlotMediaScale(this.closest('.card-inline-media'), 10)" class="px-1.5 py-0.5 rounded-full bg-white/15 hover:bg-white/30 cursor-pointer" title="카드 고정 · 미디어 확대">확대+</button>
      <button type="button" data-on-click="toggleCardInlineMediaFit(this.closest('.card-inline-media'))" class="px-1.5 py-0.5 rounded-full bg-white/15 hover:bg-white/30 cursor-pointer" title="채우기/맞추기">맞춤</button>
      <button type="button" data-on-click="uploadCardInlineMedia(this.closest('.card-inline-media'), 'image')" class="px-1.5 py-0.5 rounded-full bg-gopro font-bold cursor-pointer">사진</button>
      <button type="button" data-on-click="uploadCardInlineMedia(this.closest('.card-inline-media'), 'video')" class="px-1.5 py-0.5 rounded-full bg-indigo-500 font-bold cursor-pointer">영상</button>
      <button type="button" data-on-click="this.closest('.card-inline-media').closest('.slide-card')?.classList.remove('card-media-split-left','card-media-split-right'); this.closest('.card-inline-media').remove(); refreshLayerList(); saveHistorySnapshot();" class="px-1.5 py-0.5 rounded-full bg-rose-600 font-bold cursor-pointer">✕</button>
    </div>
  `;
}

function insertMediaBoxIntoCard() {
  if (typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive()) {
    if (typeof insertImageIntoFloatingCardEditor === 'function') insertImageIntoFloatingCardEditor();
    return;
  }
  const card = getTargetCardForHierarchy();
  if (!card) {
    showToast('먼저 사진이나 동영상을 넣을 텍스트 카드를 클릭해 주세요.');
    return;
  }
  const mediaBox = document.createElement('div');
  mediaBox.className = 'card-inline-media mb-5';
  mediaBox.innerHTML = buildCleanCardMediaHtml();

  const firstContent = card.querySelector(':scope > div:not(.card-bg-layer):not(.card-edit-controls)');
  if (firstContent) {
    card.insertBefore(mediaBox, firstContent);
  } else {
    card.appendChild(mediaBox);
  }
  selectElementForInspector(mediaBox);
  refreshLayerList();
  saveHistorySnapshot();
  showToast('텍스트 카드 상단에 깔끔한 미디어 프레임이 삽입되었습니다. 상단/하단/좌측/우측 위치 및 크기를 자유롭게 조절하세요.');
}

function setCardMediaDockPosition(pos, explicitMediaBox) {
  const mediaBox = explicitMediaBox || (selectedElement && (selectedElement.classList.contains('card-inline-media') ? selectedElement : selectedElement.querySelector('.card-inline-media')));
  if (!mediaBox) {
    showToast('먼저 위치를 변경할 카드 내 미디어를 클릭해 주세요.');
    return;
  }
  const card = mediaBox.closest('.slide-card');
  if (!card) return;

  card.classList.remove('card-media-split-left', 'card-media-split-right');
  mediaBox.classList.remove('mb-5', 'mt-5');

  if (pos === 'top') {
    mediaBox.classList.add('mb-5');
    const firstNonCtrl = Array.from(card.children).find(ch => !ch.classList.contains('card-bg-layer') && !ch.classList.contains('card-hover-bg-layer') && !ch.classList.contains('card-bg-tint') && !ch.classList.contains('card-edit-controls'));
    if (firstNonCtrl && firstNonCtrl !== mediaBox) {
      card.insertBefore(mediaBox, firstNonCtrl);
    }
  } else if (pos === 'bottom') {
    mediaBox.classList.add('mt-5');
    card.appendChild(mediaBox);
  } else if (pos === 'left') {
    const firstNonCtrl = Array.from(card.children).find(ch => !ch.classList.contains('card-bg-layer') && !ch.classList.contains('card-hover-bg-layer') && !ch.classList.contains('card-bg-tint') && !ch.classList.contains('card-edit-controls'));
    if (firstNonCtrl && firstNonCtrl !== mediaBox) {
      card.insertBefore(mediaBox, firstNonCtrl);
    }
    card.classList.add('card-media-split-left');
  } else if (pos === 'right') {
    card.classList.add('card-media-split-right');
  }

  positionSelectionOverlay();
  saveHistorySnapshot();
  showToast(`미디어 프레임 위치가 [${pos === 'top' ? '상단' : pos === 'bottom' ? '하단' : pos === 'left' ? '좌측 분할' : '우측 분할'}]으로 이동되었습니다.`);
}

function setCardMediaSizeValue(val) {
  const px = Number(val) || 220;
  const lbl = $studio('cardMediaSizeLabel');
  if (lbl) lbl.textContent = `${px}px`;
  const mediaBox = selectedElement && (selectedElement.classList.contains('card-inline-media') ? selectedElement : selectedElement.querySelector('.card-inline-media'));
  if (!mediaBox) return;
  const card = mediaBox.closest('.slide-card');
  if (card && (card.classList.contains('card-media-split-left') || card.classList.contains('card-media-split-right'))) {
    const pct = Math.max(25, Math.min(70, Math.round((px / 460) * 65)));
    card.style.setProperty('--media-split-ratio', `${pct}%`);
  } else {
    mediaBox.style.height = `${px}px`;
  }
  positionSelectionOverlay();
}

function getActiveMediaBoxAndElement() {
  if (!selectedElement) return { box: null, media: null };
  const box = selectedElement.classList.contains('image-slot-box') || selectedElement.classList.contains('card-inline-media')
    ? selectedElement
    : (selectedElement.querySelector('.image-slot-box, .card-inline-media') || selectedElement.closest('.image-slot-box, .card-inline-media'));
  if (!box) return { box: null, media: null };
  const media = box.querySelector('.slot-img:not(.hidden), video.slot-video, .inline-media-el');
  return { box, media };
}

function setInnerMediaScale(pctVal, isLiveInput) {
  const pct = Math.max(20, Math.min(150, Number(pctVal) || 100));
  const slider = $studio('innerMediaScaleSlider');
  const lbl = $studio('innerMediaScaleLabel');
  if (slider) slider.value = String(pct);
  if (lbl) lbl.textContent = `${pct}%`;

  const { box, media } = getActiveMediaBoxAndElement();
  if (!box || !media) {
    if (!isLiveInput) showToast('먼저 내부 미디어 크기를 조절할 미디어 카드(또는 사진·영상)를 클릭해 주세요.');
    return;
  }

  if (!box.dataset.lockedHeight) {
    const curH = box.offsetHeight || 240;
    box.dataset.lockedHeight = `${curH}px`;
  }
  box.style.height = box.dataset.lockedHeight;
  box.style.minHeight = box.dataset.lockedHeight;
  box.style.maxHeight = box.dataset.lockedHeight;
  box.style.overflow = 'hidden';
  box.style.display = 'flex';
  box.style.alignItems = 'center';
  box.style.justifyContent = 'center';
  box.setAttribute('data-inner-scale', String(pct));

  media.classList.remove('absolute', 'inset-0', 'object-cover');
  media.classList.add('object-contain');
  media.style.position = 'relative';
  media.style.width = `${pct}%`;
  media.style.height = `${pct}%`;
  media.style.maxWidth = 'none';
  media.style.maxHeight = 'none';
  media.style.margin = 'auto';
  media.style.transition = 'width 0.15s ease, height 0.15s ease';

  positionSelectionOverlay();
  if (!isLiveInput) saveHistorySnapshot();
}

function adjustSlotMediaScale(slotEl, deltaPct) {
  if (!slotEl) return;
  selectedElement = slotEl;
  const curScale = Number(slotEl.getAttribute('data-inner-scale') || '100');
  setInnerMediaScale(curScale + deltaPct);
  showToast(`미디어 카드 크기 고정 · 내부 미디어 배율 ${Math.max(20, Math.min(150, curScale + deltaPct))}%`);
}

function toggleCardInlineMediaFit(mediaBox) {
  if (!mediaBox) return;
  const el = mediaBox.querySelector('.inline-media-el');
  if (!el) return;
  if (el.classList.contains('object-cover')) {
    el.classList.remove('object-cover');
    el.classList.add('object-contain');
    showToast('원본 비율 맞춤 (Contain)');
  } else {
    el.classList.remove('object-contain');
    el.classList.add('object-cover');
    showToast('프레임 꽉 채우기 (Cover)');
  }
  saveHistorySnapshot();
}

function uploadCardInlineMedia(mediaBox, kind) {
  if (!isActiveEditing() || !mediaBox) return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = kind === 'video' ? 'video/*' : 'image/*';
  input.onchange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const placeholder = mediaBox.querySelector('.card-media-placeholder');
    mediaBox.querySelectorAll('img.inline-media-el, video.inline-media-el').forEach(el => el.remove());

    if (kind === 'video') {
      if (window.__pptSessionMediaBlobs instanceof Map) window.__pptSessionMediaBlobs.set(file.name, file);
      const url = URL.createObjectURL(file);
      const vid = document.createElement('video');
      vid.src = url;
      vid.setAttribute('data-media-name', file.name);
      vid.controls = true;
      vid.playsInline = true;
      vid.loop = true;
      vid.className = 'inline-media-el w-full h-auto object-contain block';
      vid.onloadedmetadata = () => {
        mediaBox.style.height = 'auto';
        positionSelectionOverlay();
        saveHistorySnapshot();
      };
      if (placeholder) placeholder.classList.add('hidden');
      mediaBox.classList.add('has-media');
      mediaBox.insertBefore(vid, mediaBox.firstChild);
      initVideoErrorFallbacks(mediaBox);
      syncVideoSourceInspectorUI(mediaBox);
      saveHistorySnapshot();
      showToast('저장 후 HTML과 같은 폴더의 media/ 에 파일을 두세요.');
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const imgObj = new Image();
        imgObj.onload = () => {
          const maxDim = 1600;
          let w = imgObj.width;
          let h = imgObj.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(imgObj, 0, 0, w, h);

          const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const resizedDataUrl = canvas.toDataURL(mime, 0.88);

          const img = document.createElement('img');
          img.src = resizedDataUrl;
          img.setAttribute('data-img-nat-w', String(w));
          img.setAttribute('data-img-nat-h', String(h));
          img.alt = '카드 내 첨부 이미지';
          img.className = 'inline-media-el w-full h-auto object-contain block';
          img.onload = () => {
            mediaBox.style.height = 'auto';
            positionSelectionOverlay();
            saveHistorySnapshot();
          };
          if (placeholder) placeholder.classList.add('hidden');
          mediaBox.classList.add('has-media');
          mediaBox.insertBefore(img, mediaBox.firstChild);
          saveHistorySnapshot();
          showToast('카드 내 사진이 1600px 최적화 및 원본 비율로 첨부되었습니다.');
        };
        imgObj.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  };
  input.click();
}

function moveCardInlineMedia(mediaBox, dir) {
  if (!mediaBox || !mediaBox.parentElement) return;
  const parent = mediaBox.parentElement;
  if (dir === -1 && mediaBox.previousElementSibling && !mediaBox.previousElementSibling.classList.contains('card-edit-controls') && !mediaBox.previousElementSibling.classList.contains('card-bg-layer')) {
    parent.insertBefore(mediaBox, mediaBox.previousElementSibling);
  } else if (dir === 1 && mediaBox.nextElementSibling) {
    parent.insertBefore(mediaBox.nextElementSibling, mediaBox);
  }
  positionSelectionOverlay();
  saveHistorySnapshot();
}

function resizeCardInlineMedia(mediaBox, dWidthPct, dHeightPx) {
  if (!mediaBox) return;
  if (dWidthPct !== 0) {
    const curW = parseFloat(mediaBox.style.width) || 100;
    const nextW = Math.max(25, Math.min(100, curW + dWidthPct));
    mediaBox.style.width = nextW + '%';
  }
  if (dHeightPx !== 0) {
    const curH = mediaBox.offsetHeight || 190;
    const nextH = Math.max(90, Math.min(560, curH + dHeightPx));
    mediaBox.style.height = nextH + 'px';
  }
  positionSelectionOverlay();
  saveHistorySnapshot();
}

/* ==================== FREEFORM SHAPES & OBJECTS ==================== */
function shouldInsertIntoSelectedCard() {
  if (typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive()) {
    return typeof getActiveFcPreviewCanvas === 'function' ? getActiveFcPreviewCanvas() : null;
  }
  const chk = $studio('insertIntoCardCheckbox');
  const wantsCard = chk ? Boolean(chk.checked) : true;
  if (!wantsCard) return null;
  return getTargetCardForHierarchy();
}

function insertFreeShape(type) {
  const _isFcTarget = typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive();
  if (!_isFcTarget && typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const targetCard = shouldInsertIntoSelectedCard();
  if (targetCard) {
    if (type === 'textbox') {
      if (_isFcTarget && typeof insertTextBoxIntoFloatingCardEditor === 'function') insertTextBoxIntoFloatingCardEditor();
      else addTextBoxToSelectedCard('텍스트 내용을 입력하세요');
      return;
    }
    const obj = document.createElement('div');
    obj.className = 'card-embedded-obj my-2';
    obj.setAttribute('data-shape-type', type);
    obj.style.opacity = '1';

    if (type === 'image') {
      obj.style.width = '100%';
      obj.style.height = '180px';
      obj.style.padding = '0px';
      obj.style.backgroundColor = '#FFFFFF';
      obj.style.border = '2px solid #0055FF';
      obj.style.borderRadius = '14px';
      obj.innerHTML = `
        <div class="image-slot-box relative w-full h-full rounded-xl overflow-hidden flex flex-col items-center justify-center text-center p-3 cursor-pointer"
             data-on-click="triggerImageUpload(this)"
             data-on-dragover="event.preventDefault(); this.classList.add('border-gopro')"
             data-on-dragleave="this.classList.remove('border-gopro')"
             data-on-drop="handleImageDrop(event, this)">
          <img class="slot-img hidden w-full h-full object-cover absolute inset-0" alt="카드 내 이미지" />
          <div class="slot-placeholder flex flex-col items-center pointer-events-none">
            <span class="text-xs font-bold text-ink">클릭하여 이미지·영상 삽입</span>
            <span class="text-[10px] text-muted mt-0.5">선택한 카드에 소속된 미디어 슬롯입니다</span>
          </div>
          <div class="img-edit-overlay absolute bottom-2 inset-x-2 bg-ink/85 text-white rounded-lg px-2 py-1 flex items-center justify-between gap-1 text-[10px] z-10" data-on-click="event.stopPropagation()">
            <button data-on-click="triggerImageUpload(this.closest('.image-slot-box'))" class="px-1.5 py-0.5 rounded bg-gopro font-bold cursor-pointer">변경</button>
            <button data-on-click="toggleImageFit(this.closest('.image-slot-box'))" class="px-1.5 py-0.5 rounded bg-white/15 cursor-pointer">맞춤</button>
          </div>
        </div>`;
    } else if (type === 'rect' || type === 'roundRect') {
      obj.style.width = '75%';
      obj.style.height = '76px';
      obj.style.backgroundColor = '#0055FF';
      obj.style.border = '2px solid #003EC2';
      obj.style.borderRadius = type === 'roundRect' ? '16px' : '0px';
      obj.style.color = '#FFFFFF';
      obj.innerHTML = `<div data-editable contenteditable="true" class="shape-inner-text text-sm font-bold text-center">도형 텍스트</div>`;
    } else if (type === 'circle') {
      obj.style.width = '110px';
      obj.style.height = '110px';
      obj.style.backgroundColor = '#FFE600';
      obj.style.border = '2px solid #111111';
      obj.style.borderRadius = '9999px';
      obj.style.color = '#111111';
      obj.innerHTML = `<div data-editable contenteditable="true" class="shape-inner-text text-sm font-extrabold text-center">강조</div>`;
    } else if (type === 'pill') {
      obj.style.width = 'fit-content';
      obj.style.minWidth = '130px';
      obj.style.height = '36px';
      obj.style.padding = '4px 16px';
      obj.style.backgroundColor = '#111111';
      obj.style.border = '0px solid transparent';
      obj.style.borderRadius = '9999px';
      obj.style.color = '#FFFFFF';
      obj.innerHTML = `<div data-editable contenteditable="true" class="shape-inner-text text-xs font-mono font-bold text-center">KEY BADGE</div>`;
    } else if (type === 'line') {
      obj.style.width = '100%';
      obj.style.height = '20px';
      obj.style.padding = '0px';
      obj.innerHTML = `<svg class="w-full h-full overflow-visible" viewBox="0 0 200 24" preserveAspectRatio="none"><line class="shape-stroke" x1="0" y1="12" x2="200" y2="12" stroke="#111111" stroke-width="4" stroke-linecap="round"/></svg>`;
    } else if (type === 'arrowRight') {
      obj.style.width = '80%';
      obj.style.height = '28px';
      obj.style.padding = '0px';
      obj.innerHTML = `<svg class="w-full h-full overflow-visible" viewBox="0 0 200 32" preserveAspectRatio="none"><line class="shape-stroke" x1="2" y1="16" x2="184" y2="16" stroke="#0055FF" stroke-width="4" stroke-linecap="round"/><polygon class="shape-fill" points="182,6 200,16 182,26" fill="#0055FF"/></svg>`;
    } else if (type === 'arrowBoth') {
      obj.style.width = '80%'; obj.style.height = '28px'; obj.style.padding = '0px';
      obj.innerHTML = `<svg class="w-full h-full overflow-visible" viewBox="0 0 200 32" preserveAspectRatio="none"><polygon class="shape-fill" points="18,6 0,16 18,26" fill="#0055FF"/><line class="shape-stroke" x1="16" y1="16" x2="184" y2="16" stroke="#0055FF" stroke-width="4" stroke-linecap="round"/><polygon class="shape-fill" points="182,6 200,16 182,26" fill="#0055FF"/></svg>`;
    } else if (type === 'triangle') {
      obj.style.width = '120px'; obj.style.height = '106px'; obj.style.padding = '0px'; obj.style.color = '#FFFFFF';
      obj.innerHTML = `<svg class="w-full h-full overflow-visible" viewBox="0 0 200 180" preserveAspectRatio="none"><polygon class="shape-fill shape-stroke" points="100,8 192,172 8,172" fill="#0055FF" stroke="#003EC2" stroke-width="4" stroke-linejoin="round"/></svg><div data-editable contenteditable="true" class="shape-inner-text absolute inset-x-3 bottom-3 text-xs font-bold text-center">삼각형</div>`;
    } else if (type === 'diamond') {
      obj.style.width = '120px'; obj.style.height = '120px'; obj.style.padding = '0px'; obj.style.color = '#111111';
      obj.innerHTML = `<svg class="w-full h-full overflow-visible" viewBox="0 0 200 200" preserveAspectRatio="none"><polygon class="shape-fill shape-stroke" points="100,8 192,100 100,192 8,100" fill="#FFE600" stroke="#111111" stroke-width="4" stroke-linejoin="round"/></svg><div data-editable contenteditable="true" class="shape-inner-text absolute inset-4 flex items-center justify-center text-xs font-extrabold text-center">조건/분기</div>`;
    } else if (type === 'speech') {
      obj.style.width = '180px'; obj.style.height = '96px'; obj.style.padding = '0px'; obj.style.color = '#111111';
      obj.innerHTML = `<svg class="w-full h-full overflow-visible" viewBox="0 0 200 120" preserveAspectRatio="none"><path class="shape-fill shape-stroke" d="M16,8 H184 A10,10 0 0 1 194,18 V76 A10,10 0 0 1 184,86 H68 L42,112 L48,86 H16 A10,10 0 0 1 6,76 V18 A10,10 0 0 1 16,8 Z" fill="#FFFFFF" stroke="#0055FF" stroke-width="4" stroke-linejoin="round"/></svg><div data-editable contenteditable="true" class="shape-inner-text absolute inset-x-3 top-3 bottom-8 flex items-center justify-center text-xs font-bold text-center">말풍선 코멘트</div>`;
    } else if (type === 'star') {
      obj.style.width = '115px'; obj.style.height = '115px'; obj.style.padding = '0px'; obj.style.color = '#111111';
      obj.innerHTML = `<svg class="w-full h-full overflow-visible" viewBox="0 0 200 200" preserveAspectRatio="none"><polygon class="shape-fill shape-stroke" points="100,8 127,68 192,75 143,119 157,184 100,150 43,184 57,119 8,75 73,68" fill="#FFE600" stroke="#D97706" stroke-width="4" stroke-linejoin="round"/></svg><div data-editable contenteditable="true" class="shape-inner-text absolute inset-5 flex items-center justify-center text-xs font-black text-center">POINT</div>`;
    }

    targetCard.appendChild(obj);
    selectElementForInspector(obj);
    refreshLayerList();
    saveHistorySnapshot();
    showToast('선택한 카드 내부에 요소가 소속되어 추가되었습니다! 카드 영역 내에서 자유 이동·크기 조절이 가능합니다.');
    return;
  }

  const activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return;
  ensureFreeLayersOnAllSlides();
  const layer = activeSlideEl.querySelector('.ppt-free-layer');

  const shape = document.createElement('div');
  shape.className = 'ppt-free-obj';
  shape.setAttribute('data-shape-type', type);
  shape.style.left = '34%';
  shape.style.top = '32%';
  shape.style.zIndex = String(layer.children.length + 20);
  shape.style.opacity = '1';

  if (type === 'textbox') {
    shape.style.width = '30%';
    shape.style.height = '14%';
    shape.style.backgroundColor = 'rgba(255, 255, 255, 0.94)';
    shape.style.border = '1.5px dashed #0055FF';
    shape.style.borderRadius = '10px';
    shape.style.color = '#111111';
    shape.innerHTML = `<div data-editable contenteditable="true" class="shape-inner-text text-base font-bold text-center">자유 텍스트 입력 (클릭 수정)</div>`;
  } else if (type === 'image') {
    shape.style.width = '30%';
    shape.style.height = '32%';
    shape.style.padding = '0px';
    shape.style.backgroundColor = '#FFFFFF';
    shape.style.border = '2px solid #0055FF';
    shape.style.borderRadius = '14px';
    shape.innerHTML = `
      <div class="image-slot-box relative w-full h-full rounded-xl overflow-hidden flex flex-col items-center justify-center text-center p-3 cursor-pointer"
           data-on-click="triggerImageUpload(this)"
           data-on-dragover="event.preventDefault(); this.classList.add('border-gopro')"
           data-on-dragleave="this.classList.remove('border-gopro')"
           data-on-drop="handleImageDrop(event, this)">
        <img class="slot-img hidden w-full h-full object-cover absolute inset-0" alt="자유 이미지" />
        <div class="slot-placeholder flex flex-col items-center pointer-events-none">
          <span class="text-xs font-bold text-ink">클릭하여 이미지 삽입</span>
          <span class="text-[10px] text-muted mt-0.5">카드 뒤 배경으로 쓰려면 상단 '맨뒤(카드뒤)' 클릭</span>
        </div>
        <div class="img-edit-overlay absolute bottom-2 inset-x-2 bg-ink/85 text-white rounded-lg px-2 py-1 flex items-center justify-between gap-1 text-[10px] z-10" data-on-click="event.stopPropagation()">
          <button data-on-click="triggerImageUpload(this.closest('.image-slot-box'))" class="px-1.5 py-0.5 rounded bg-gopro font-bold cursor-pointer">변경</button>
          <button data-on-click="toggleImageFit(this.closest('.image-slot-box'))" class="px-1.5 py-0.5 rounded bg-white/15 cursor-pointer">맞춤</button>
        </div>
      </div>`;
  } else if (type === 'rect' || type === 'roundRect') {
    shape.style.width = '24%';
    shape.style.height = '18%';
    shape.style.backgroundColor = '#0055FF';
    shape.style.border = '2px solid #003EC2';
    shape.style.borderRadius = type === 'roundRect' ? '16px' : '0px';
    shape.style.color = '#FFFFFF';
    shape.innerHTML = `<div data-editable contenteditable="true" class="shape-inner-text text-sm font-bold text-center">도형 텍스트</div>`;
  } else if (type === 'circle') {
    shape.style.width = '16%';
    shape.style.height = '24%';
    shape.style.backgroundColor = '#FFE600';
    shape.style.border = '2px solid #111111';
    shape.style.borderRadius = '9999px';
    shape.style.color = '#111111';
    shape.innerHTML = `<div data-editable contenteditable="true" class="shape-inner-text text-sm font-extrabold text-center">강조</div>`;
  } else if (type === 'pill') {
    shape.style.width = '20%';
    shape.style.height = '8%';
    shape.style.backgroundColor = '#111111';
    shape.style.border = '0px solid transparent';
    shape.style.borderRadius = '9999px';
    shape.style.color = '#FFFFFF';
    shape.innerHTML = `<div data-editable contenteditable="true" class="shape-inner-text text-xs font-mono font-bold text-center">KEY BADGE</div>`;
  } else if (type === 'line') {
    shape.style.width = '28%';
    shape.style.height = '6%';
    shape.style.padding = '0px';
    shape.innerHTML = `<svg class="w-full h-full overflow-visible" viewBox="0 0 200 24" preserveAspectRatio="none"><line class="shape-stroke" x1="0" y1="12" x2="200" y2="12" stroke="#111111" stroke-width="4" stroke-linecap="round"/></svg>`;
  } else if (type === 'arrowRight') {
    shape.style.width = '28%';
    shape.style.height = '8%';
    shape.style.padding = '0px';
    shape.innerHTML = `<svg class="w-full h-full overflow-visible" viewBox="0 0 200 32" preserveAspectRatio="none"><line class="shape-stroke" x1="2" y1="16" x2="184" y2="16" stroke="#0055FF" stroke-width="4" stroke-linecap="round"/><polygon class="shape-fill" points="182,6 200,16 182,26" fill="#0055FF"/></svg>`;
  } else if (type === 'arrowBoth') {
    shape.style.width = '28%'; shape.style.height = '8%'; shape.style.padding = '0px';
    shape.innerHTML = `<svg class="w-full h-full overflow-visible" viewBox="0 0 200 32" preserveAspectRatio="none"><polygon class="shape-fill" points="18,6 0,16 18,26" fill="#0055FF"/><line class="shape-stroke" x1="16" y1="16" x2="184" y2="16" stroke="#0055FF" stroke-width="4" stroke-linecap="round"/><polygon class="shape-fill" points="182,6 200,16 182,26" fill="#0055FF"/></svg>`;
  } else if (type === 'triangle') {
    shape.style.width = '18%'; shape.style.height = '24%'; shape.style.padding = '0px'; shape.style.color = '#FFFFFF';
    shape.innerHTML = `<svg class="w-full h-full overflow-visible" viewBox="0 0 200 180" preserveAspectRatio="none"><polygon class="shape-fill shape-stroke" points="100,8 192,172 8,172" fill="#0055FF" stroke="#003EC2" stroke-width="4" stroke-linejoin="round"/></svg><div data-editable contenteditable="true" class="shape-inner-text absolute inset-x-4 bottom-4 text-sm font-bold text-center">삼각형</div>`;
  } else if (type === 'diamond') {
    shape.style.width = '18%'; shape.style.height = '26%'; shape.style.padding = '0px'; shape.style.color = '#111111';
    shape.innerHTML = `<svg class="w-full h-full overflow-visible" viewBox="0 0 200 200" preserveAspectRatio="none"><polygon class="shape-fill shape-stroke" points="100,8 192,100 100,192 8,100" fill="#FFE600" stroke="#111111" stroke-width="4" stroke-linejoin="round"/></svg><div data-editable contenteditable="true" class="shape-inner-text absolute inset-6 flex items-center justify-center text-sm font-extrabold text-center">조건/분기</div>`;
  } else if (type === 'speech') {
    shape.style.width = '24%'; shape.style.height = '18%'; shape.style.padding = '0px'; shape.style.color = '#111111';
    shape.innerHTML = `<svg class="w-full h-full overflow-visible" viewBox="0 0 200 120" preserveAspectRatio="none"><path class="shape-fill shape-stroke" d="M16,8 H184 A10,10 0 0 1 194,18 V76 A10,10 0 0 1 184,86 H68 L42,112 L48,86 H16 A10,10 0 0 1 6,76 V18 A10,10 0 0 1 16,8 Z" fill="#FFFFFF" stroke="#0055FF" stroke-width="4" stroke-linejoin="round"/></svg><div data-editable contenteditable="true" class="shape-inner-text absolute inset-x-4 top-3 bottom-8 flex items-center justify-center text-sm font-bold text-center">말풍선 코멘트</div>`;
  } else if (type === 'star') {
    shape.style.width = '17%'; shape.style.height = '26%'; shape.style.padding = '0px'; shape.style.color = '#111111';
    shape.innerHTML = `<svg class="w-full h-full overflow-visible" viewBox="0 0 200 200" preserveAspectRatio="none"><polygon class="shape-fill shape-stroke" points="100,8 127,68 192,75 143,119 157,184 100,150 43,184 57,119 8,75 73,68" fill="#FFE600" stroke="#D97706" stroke-width="4" stroke-linejoin="round"/></svg><div data-editable contenteditable="true" class="shape-inner-text absolute inset-6 flex items-center justify-center text-xs font-black text-center">POINT</div>`;
  }

  layer.appendChild(shape);
  selectElementForInspector(shape);
  saveHistorySnapshot();
  showToast('자유 오브젝트가 추가되었습니다. 드래그하여 위치·크기를 조절하세요.');
}

function updateSelectedShapeStyle(prop, val, isLiveInput) {
  const activeSlideEl = slides[currentSlide - 1];
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(false)) return;
  const rawTargets = selectedElements.length > 0 ? selectedElements : (selectedElement ? [selectedElement] : []);
  const targets = rawTargets.filter(el => el && el.getAttribute('data-layer-locked') !== 'true' && (el.classList.contains('ppt-free-obj') || el.classList.contains('card-embedded-obj') || el.classList.contains('sub-box') || el.classList.contains('card-inner-textbox') || el.classList.contains('slide-card')));
  if (targets.length === 0) return;
  targets.forEach(el => {
    const type = el.getAttribute('data-shape-type');
    const isLineVector = type === 'line' || type === 'arrowRight' || type === 'arrowBoth';
    const isPolyVector = type === 'triangle' || type === 'diamond' || type === 'speech' || type === 'star';
    const isSvgIcon = type === 'svg-icon';
    if (prop === 'fill') {
      if (el.classList.contains('ppt-interactive-widget')) return;
      if (isLineVector || isSvgIcon) { el.style.color = val; el.querySelectorAll('.shape-stroke').forEach(s => s.setAttribute('stroke', val)); el.querySelectorAll('.shape-fill').forEach(s => s.setAttribute('fill', val)); }
      else if (isPolyVector) el.querySelectorAll('.shape-fill').forEach(s => s.setAttribute('fill', val));
      else if (el.classList.contains('slide-card')) {
        const darkFill = typeof isDarkHexColor === 'function' ? isDarkHexColor(val) : false;
        el.classList.toggle('card-theme-dark', darkFill);
        el.style.color = darkFill ? '#F9FAFB' : '';
        el.setAttribute('data-card-bg-hex', val);
        el.style.setProperty('--card-bg-color', val);
        const hasBgImg = Boolean(el.querySelector('.card-bg-layer')?.style.backgroundImage);
        if (hasBgImg && typeof ensureCardBgTintLayer === 'function') {
          el.style.backgroundColor = 'transparent';
          ensureCardBgTintLayer(el).style.backgroundColor = val;
        } else {
          el.style.backgroundColor = val;
        }
      } else el.style.backgroundColor = val;
    } else if (prop === 'borderColor') {
      if (isLineVector || isSvgIcon) { el.style.color = val; el.querySelectorAll('.shape-stroke').forEach(s => s.setAttribute('stroke', val)); el.querySelectorAll('.shape-fill').forEach(s => s.setAttribute('fill', val)); }
      else if (isPolyVector) el.querySelectorAll('.shape-stroke').forEach(s => s.setAttribute('stroke', val));
      else { if (!el.style.borderStyle || el.style.borderStyle === 'none') el.style.borderStyle = 'solid'; el.style.borderColor = val; }
    } else if (prop === 'borderWidth') {
      if (val) {
        const pxNum = parseFloat(val) || 0;
        if (isLineVector || isPolyVector || isSvgIcon) el.querySelectorAll('.shape-stroke').forEach(s => s.setAttribute('stroke-width', String(Math.max(1, pxNum))));
        else { if (pxNum === 0) el.style.borderStyle = 'none'; else if (!el.style.borderStyle || el.style.borderStyle === 'none') el.style.borderStyle = 'solid'; el.style.borderWidth = val; }
      }
    } else if (prop === 'borderStyle') {
      if (val) {
        if (isLineVector || isPolyVector) {
          const dash = val === 'dashed' ? '10 6' : (val === 'dotted' ? '2 6' : '');
          el.querySelectorAll('.shape-stroke').forEach(s => { if (dash) s.setAttribute('stroke-dasharray', dash); else s.removeAttribute('stroke-dasharray'); });
        } else { el.style.borderStyle = val; if (val !== 'none' && (!el.style.borderWidth || el.style.borderWidth === '0px')) el.style.borderWidth = '2px'; }
      }
    } else if (prop === 'arrowHead') {
      if (isLineVector) {
        const col = el.querySelector('.shape-stroke')?.getAttribute('stroke') || '#0055FF';
        const sw = el.querySelector('.shape-stroke')?.getAttribute('stroke-width') || '4';
        const dash = el.querySelector('.shape-stroke')?.getAttribute('stroke-dasharray') || '';
        const dashAttr = dash ? ` stroke-dasharray="${dash}"` : '';
        if (val === 'none') { el.setAttribute('data-shape-type', 'line'); el.innerHTML = `<svg class="w-full h-full overflow-visible" viewBox="0 0 200 24" preserveAspectRatio="none"><line class="shape-stroke" x1="0" y1="12" x2="200" y2="12" stroke="${col}" stroke-width="${sw}" stroke-linecap="round"${dashAttr}/></svg>`; }
        else if (val === 'end') { el.setAttribute('data-shape-type', 'arrowRight'); el.innerHTML = `<svg class="w-full h-full overflow-visible" viewBox="0 0 200 32" preserveAspectRatio="none"><line class="shape-stroke" x1="2" y1="16" x2="184" y2="16" stroke="${col}" stroke-width="${sw}" stroke-linecap="round"${dashAttr}/><polygon class="shape-fill" points="182,6 200,16 182,26" fill="${col}"/></svg>`; }
        else if (val === 'both') { el.setAttribute('data-shape-type', 'arrowBoth'); el.innerHTML = `<svg class="w-full h-full overflow-visible" viewBox="0 0 200 32" preserveAspectRatio="none"><polygon class="shape-fill" points="18,6 0,16 18,26" fill="${col}"/><line class="shape-stroke" x1="16" y1="16" x2="184" y2="16" stroke="${col}" stroke-width="${sw}" stroke-linecap="round"${dashAttr}/><polygon class="shape-fill" points="182,6 200,16 182,26" fill="${col}"/></svg>`; }
      }
    } else if (prop === 'radius') { if (val) el.style.borderRadius = val; }
    else if (prop === 'textColor') { el.style.color = val; const inner = el.querySelector('.shape-inner-text'); if (inner) inner.style.color = val; }
    else if (prop === 'opacity') { el.style.opacity = String(Number(val) / 100); }
  });
  positionSelectionOverlay();
  if (!isLiveInput) saveHistorySnapshot('도형/외형 스타일 변경');
}

function toggleSelectedShapeShadow() {
  const activeSlideEl = slides[currentSlide - 1];
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const rawTargets = selectedElements.length > 0 ? selectedElements : (selectedElement ? [selectedElement] : []);
  const targets = rawTargets.filter(el => el && el.getAttribute('data-layer-locked') !== 'true' && (el.classList.contains('ppt-free-obj') || el.classList.contains('card-embedded-obj') || el.classList.contains('sub-box') || el.classList.contains('slide-card')));
  if (targets.length === 0) return;
  targets.forEach(el => {
    el.style.boxShadow = el.style.boxShadow ? '' : '0 14px 30px rgba(0, 0, 0, 0.18)';
  });
  saveHistorySnapshot('그림자 효과 전환');
}

function changeSelectedShapeLayer(direction) {
  const activeSlideEl = slides[currentSlide - 1];
  if (activeSlideEl && activeSlideEl.getAttribute('data-slide-locked') === 'true') { showToast('잠긴 슬라이드에서는 레이어 순서를 변경할 수 없습니다.'); return; }
  const rawTargets = selectedElements.length > 0 ? selectedElements : (selectedElement ? [selectedElement] : []);
  const targets = rawTargets.filter(el => el && el.getAttribute('data-layer-locked') !== 'true' && el.classList.contains('ppt-free-obj'));
  if (targets.length === 0) return;
  targets.forEach(el => {
    const parent = el.parentElement;
    const curZ = parseInt(el.style.zIndex || '20', 10);
    if (direction === 'front') {
      parent.appendChild(el);
      el.style.zIndex = '50';
    } else if (direction === 'up') {
      el.style.zIndex = String(curZ + 5);
    } else if (direction === 'down') {
      el.style.zIndex = String(Math.max(2, curZ - 8));
    } else {
      parent.insertBefore(el, parent.firstChild);
      el.style.zIndex = '2';
    }
  });
  showToast('자유 오브젝트 레이어 순서가 변경되었습니다.');
  saveHistorySnapshot();
}

/* ==================== VIDEO FALLBACKS, PATH EDITOR & MEDIA SLOTS ==================== */
function showVideoMissingFallback(vid) {
  if (!vid || !vid.parentElement) return;
  const parent = vid.parentElement;
  if (window.getComputedStyle(parent).position === 'static') {
    parent.style.position = 'relative';
  }
  const rawSrc = vid.getAttribute('src') || '';
  const mediaName = vid.getAttribute('data-media-name') || '';
  const displayPath = rawSrc || (mediaName ? 'media/' + mediaName : '알 수 없는 경로');

  let fallback = parent.querySelector('.video-missing-fallback');
  if (!fallback) {
    fallback = document.createElement('div');
    fallback.className = 'video-missing-fallback absolute inset-0 bg-black text-white flex flex-col items-center justify-center text-center p-4 z-10 pointer-events-none select-none';
    parent.appendChild(fallback);
  }
  fallback.innerHTML = `
    <span class="font-mono text-xs font-bold text-rose-400 mb-1">VIDEO NOT FOUND</span>
    <span class="text-xs md:text-sm font-bold text-white break-all">영상 파일 없음: ${escapeAttr(displayPath)}</span>
  `;
}

function clearVideoMissingFallback(vid) {
  if (!vid || !vid.parentElement) return;
  const fallback = vid.parentElement.querySelector('.video-missing-fallback');
  if (fallback) fallback.remove();
}

function initVideoErrorFallbacks(rootEl) {
  const scope = rootEl || document;
  scope.querySelectorAll('video').forEach(vid => {
    if (!vid.hasAttribute('data-err-bound')) {
      vid.setAttribute('data-err-bound', 'true');
      vid.addEventListener('error', () => showVideoMissingFallback(vid));
      vid.addEventListener('loadeddata', () => clearVideoMissingFallback(vid));
    }
    if (vid.error || (vid.networkState === 3 && !vid.currentSrc)) {
      showVideoMissingFallback(vid);
    }
  });
}

function getSelectedVideoElement() {
  if (!selectedElement) return null;
  if (selectedElement.tagName === 'VIDEO') return selectedElement;
  return selectedElement.querySelector('video');
}

function syncVideoSourceInspectorUI(el) {
  const inp = $studio('videoSourcePathInput');
  const vid = el ? (el.tagName === 'VIDEO' ? el : el.querySelector('video')) : null;
  if (inp) {
    if (vid) { const m = vid.getAttribute('data-media-name'), r = vid.getAttribute('src') || ''; inp.value = (r.startsWith('blob:') && m) ? ('media/' + m) : r; }
    else inp.value = '';
  }
  const apBtn = $studio('vidOptAutoplayBtn'), muBtn = $studio('vidOptMutedBtn'), lpBtn = $studio('vidOptLoopBtn'), posterBadge = $studio('vidPosterStatusBadge');
  if (apBtn) apBtn.classList.toggle('is-active', Boolean(vid && (vid.autoplay || vid.hasAttribute('autoplay'))));
  if (muBtn) muBtn.classList.toggle('is-active', Boolean(vid && (vid.muted || vid.hasAttribute('muted'))));
  if (lpBtn) lpBtn.classList.toggle('is-active', Boolean(vid && (vid.loop || vid.hasAttribute('loop'))));
  if (posterBadge) posterBadge.textContent = (vid && vid.getAttribute('poster')) ? '포스터 설정됨' : '포스터 없음';
}

function applyVideoSourcePathFromStudio() {
  const vid = getSelectedVideoElement();
  const inp = $studio('videoSourcePathInput');
  if (!vid || !inp) {
    showToast('먼저 경로를 수정할 동영상을 클릭해 주세요.');
    return;
  }
  const nextPath = inp.value.trim();
  if (!nextPath) {
    showToast('동영상 경로 또는 URL을 입력해 주세요.');
    return;
  }
  if (/^(?:javascript|vbscript|data:text\/html):/i.test(nextPath)) {
    showToast('보안상 허용되지 않는 동영상 URL 형식입니다.');
    return;
  }
  clearVideoMissingFallback(vid);
  if (nextPath.startsWith('media/')) {
    vid.setAttribute('data-media-name', nextPath.slice(6));
  } else {
    vid.removeAttribute('data-media-name');
  }
  vid.setAttribute('src', nextPath);
  initVideoErrorFallbacks(vid.parentElement);
  vid.load();
  saveHistorySnapshot();
  showToast(`동영상 경로가 "${nextPath}"(으)로 적용되었습니다.`);
}

function insertDirectVideoFile(file) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  if (file && window.__pptSessionMediaBlobs instanceof Map) window.__pptSessionMediaBlobs.set(file.name, file);
  const videoUrl = URL.createObjectURL(file);
  const probe = document.createElement('video');
  probe.preload = 'metadata';
  probe.onloadedmetadata = function () {
    const vw = probe.videoWidth || 1280;
    const vh = probe.videoHeight || 720;

    const targetCard = shouldInsertIntoSelectedCard();
    if (targetCard) {
      const cardRect = targetCard.getBoundingClientRect();
      const stScale = typeof getStageScale === 'function' ? getStageScale() : 1;
      const targetW = Math.max(140, (cardRect.width / stScale) - 48);
      const targetH = Math.max(110, Math.min(360, Math.round(targetW * (vh / vw))));
      const obj = document.createElement('div');
      obj.className = 'card-embedded-obj my-2 shadow-sm';
      obj.setAttribute('data-shape-type', 'video');
      obj.style.width = '100%';
      obj.style.height = targetH + 'px';
      obj.style.padding = '0px';
      obj.style.backgroundColor = '#000000';
      obj.style.borderRadius = '12px';
      obj.style.overflow = 'hidden';
      obj.innerHTML = `<video src="${videoUrl}" data-media-name="${escapeAttr(file.name)}" controls playsinline loop class="w-full h-full object-contain block"></video>`;
      targetCard.appendChild(obj);
      initVideoErrorFallbacks(obj);
      selectElementForInspector(obj);
      refreshLayerList();
      saveHistorySnapshot();
      showToast('선택한 카드 내부에 동영상이 소속 삽입되었습니다! (저장 후 HTML과 같은 폴더의 media/ 에 파일을 두세요)');
      return;
    }

    const activeSlideEl = slides[currentSlide - 1];
    if (!activeSlideEl) return;
    ensureFreeLayersOnAllSlides();
    const layer = activeSlideEl.querySelector('.ppt-free-layer');
    const slideRect = activeSlideEl.getBoundingClientRect();

    const targetWidthPx = Math.min(slideRect.width * 0.48, Math.max(220, vw));
    const targetHeightPx = targetWidthPx * (vh / vw);
    const widthPct = Math.min(88, (targetWidthPx / slideRect.width) * 100);
    const heightPct = Math.min(88, (targetHeightPx / slideRect.height) * 100);

    const obj = document.createElement('div');
    obj.className = 'ppt-free-obj shadow-lg';
    obj.setAttribute('data-shape-type', 'video');
    obj.style.left = '26%';
    obj.style.top = '20%';
    obj.style.width = widthPct.toFixed(2) + '%';
    obj.style.height = heightPct.toFixed(2) + '%';
    obj.style.padding = '0px';
    obj.style.backgroundColor = '#000000';
    obj.style.borderRadius = '12px';
    obj.style.overflow = 'hidden';
    obj.style.zIndex = String(layer.children.length + 24);
    obj.innerHTML = `<video src="${videoUrl}" data-media-name="${escapeAttr(file.name)}" controls playsinline loop class="w-full h-full object-contain block"></video>`;

    layer.appendChild(obj);
    initVideoErrorFallbacks(obj);
    selectElementForInspector(obj);
    saveHistorySnapshot();
    showToast('저장 후 HTML과 같은 폴더의 media/ 에 파일을 두세요.');
  };
  probe.src = videoUrl;
}

function triggerDirectMediaInsert() {
  const inp = document.getElementById('directMediaUploader');
  if (!inp) return;
  inp.value = '';
  inp.click();
}

function triggerImageUpload(slotEl) {
  if (!isActiveEditing()) return;
  activeImageSlot = slotEl;
  const picker = document.getElementById('globalMediaUploader') || document.getElementById('globalImageUploader');
  if (!picker) return;
  picker.value = '';
  picker.click();
}

function handleImageDrop(e, slotEl) {
  e.preventDefault();
  if (slotEl) slotEl.classList.remove('border-gopro');
  if (typeof isActiveEditing === 'function' ? !isActiveEditing() : !isEditMode) return;
  const activeSlideEl = slides[currentSlide - 1];
  if (activeSlideEl && activeSlideEl.getAttribute('data-slide-locked') === 'true') return;
  const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (!file) return;
  if (file.type.startsWith('video/')) {
    applyVideoToSlot(slotEl, file);
  } else if (file.type.startsWith('image/')) {
    processImageFile(file, slotEl);
  }
}

function applyVideoToSlot(slotEl, file) {
  if (file && window.__pptSessionMediaBlobs instanceof Map) window.__pptSessionMediaBlobs.set(file.name, file);
  const videoUrl = URL.createObjectURL(file);
  const placeholder = slotEl.querySelector('.slot-placeholder');
  const imgEl = slotEl.querySelector('.slot-img');
  if (imgEl) {
    imgEl.src = '';
    imgEl.classList.add('hidden');
  }
  slotEl.querySelectorAll('video.slot-video').forEach(v => v.remove());

  const vid = document.createElement('video');
  vid.src = videoUrl;
  vid.setAttribute('data-media-name', file.name);
  vid.controls = true;
  vid.playsInline = true;
  vid.loop = true;
  vid.className = 'slot-video w-full h-full object-contain absolute inset-0 bg-black';
  vid.onloadedmetadata = () => {
    const vw = vid.videoWidth || 1280;
    const vh = vid.videoHeight || 720;
    const curSlotW = slotEl.offsetWidth || 320;
    const targetH = Math.max(160, Math.min(540, Math.round(curSlotW * (vh / vw))));
    slotEl.style.minHeight = targetH + 'px';
    slotEl.style.height = targetH + 'px';
    positionSelectionOverlay();
    saveHistorySnapshot();
  };
  if (placeholder) placeholder.classList.add('hidden');
  slotEl.classList.add('has-image', 'border-solid');
  slotEl.classList.remove('border-dashed');
  slotEl.insertBefore(vid, slotEl.firstChild);
  initVideoErrorFallbacks(slotEl);
  syncVideoSourceInspectorUI(slotEl);
  showToast('저장 후 HTML과 같은 폴더의 media/ 에 파일을 두세요.');
}

function processImageFile(file, slotEl) {
  const reader = new FileReader();
  reader.onload = function (event) {
    const imgObj = new Image();
    imgObj.onload = function () {
      const maxDim = 1600;
      let w = imgObj.width;
      let h = imgObj.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imgObj, 0, 0, w, h);

      const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const base64Data = canvas.toDataURL(mime, 0.88);

      applyImageToSlot(slotEl, base64Data, w, h);
      saveHistorySnapshot();
      showToast('이미지가 원본 비율에 맞춰 슬라이드에 내장되었습니다.');
    };
    imgObj.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function applyImageToSlot(slotEl, dataUrl, natW, natH) {
  const imgEl = slotEl.querySelector('.slot-img');
  const placeholder = slotEl.querySelector('.slot-placeholder');
  imgEl.src = dataUrl;
  imgEl.classList.remove('hidden');
  imgEl.classList.remove('object-cover');
  imgEl.classList.add('object-contain');
  if (placeholder) placeholder.classList.add('hidden');
  slotEl.classList.add('has-image', 'border-solid');
  slotEl.classList.remove('border-dashed');

  if (natW && natH && imgEl) { imgEl.setAttribute('data-img-nat-w', String(natW)); imgEl.setAttribute('data-img-nat-h', String(natH)); }
  if (natW && natH) {
    const freeParent = slotEl.closest('.ppt-free-obj');
    if (freeParent && freeParent.parentElement) {
      const stageW = (typeof LOGICAL_STAGE_WIDTH === 'number' && LOGICAL_STAGE_WIDTH > 0) ? LOGICAL_STAGE_WIDTH : 1440;
      const stageH = (typeof LOGICAL_STAGE_HEIGHT === 'number' && LOGICAL_STAGE_HEIGHT > 0) ? LOGICAL_STAGE_HEIGHT : 810;
      const layerH = freeParent.parentElement.clientHeight || stageH;
      const curWpx = freeParent.offsetWidth || (((parseFloat(freeParent.style.width) || 30) / 100) * stageW);
      const nextHpx = Math.min(layerH * 0.85, curWpx * (natH / natW));
      freeParent.style.height = ((nextHpx / layerH) * 100).toFixed(2) + '%';
    } else {
      const curSlotW = slotEl.offsetWidth || 320;
      const targetH = Math.max(140, Math.min(540, Math.round(curSlotW * (natH / natW))));
      slotEl.style.minHeight = targetH + 'px';
      slotEl.style.height = targetH + 'px';
    }
    positionSelectionOverlay();
  }
}

function toggleImageFit(slotEl) {
  const mediaEl = slotEl.querySelector('.slot-img:not(.hidden), video.slot-video');
  if (!mediaEl) return;
  if (mediaEl.classList.contains('object-cover')) {
    mediaEl.classList.remove('object-cover');
    mediaEl.classList.add('object-contain', 'bg-neutral-900');
    showToast('미디어 비율 맞춤 (Contain)');
  } else {
    mediaEl.classList.add('object-cover');
    mediaEl.classList.remove('object-contain', 'bg-neutral-900');
    showToast('미디어 꽉 채우기 (Cover)');
  }
  saveHistorySnapshot();
}

function adjustSlotHeight(slotEl, deltaPx) {
  const currentH = slotEl.offsetHeight || 240;
  const nextH = Math.max(120, Math.min(640, currentH + deltaPx));
  slotEl.style.minHeight = nextH + 'px';
  slotEl.style.height = nextH + 'px';
  positionSelectionOverlay();
  saveHistorySnapshot();
}

function clearImageSlot(slotEl) {
  const imgEl = slotEl.querySelector('.slot-img');
  const placeholder = slotEl.querySelector('.slot-placeholder');
  if (imgEl) {
    imgEl.src = '';
    imgEl.classList.add('hidden');
  }
  slotEl.querySelectorAll('video.slot-video').forEach(v => v.remove());
  if (placeholder) placeholder.classList.remove('hidden');
  slotEl.classList.remove('has-image', 'border-solid');
  slotEl.classList.add('border-dashed');
  saveHistorySnapshot();
  showToast('미디어가 제거되었습니다.');
}

function initMediaListeners() {
  const directUploader = document.getElementById('directMediaUploader');
  if (directUploader && !directUploader.dataset.bound) {
    directUploader.dataset.bound = 'true';
    directUploader.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (file.type.startsWith('video/')) {
        insertDirectVideoFile(file);
        return;
      }
      const reader = new FileReader();
      reader.onload = function (event) {
        const imgObj = new Image();
        imgObj.onload = function () {
          const maxDim = 1600;
          let w = imgObj.width;
          let h = imgObj.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
            else { w = Math.round((w * maxDim) / h); h = maxDim; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(imgObj, 0, 0, w, h);
          const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const base64Data = canvas.toDataURL(mime, 0.9);

          const targetCard = shouldInsertIntoSelectedCard();
          if (targetCard) {
            const cardRect = targetCard.getBoundingClientRect();
            const stScale = typeof getStageScale === 'function' ? getStageScale() : 1;
            const targetW = Math.max(120, (cardRect.width / stScale) - 48);
            const targetH = Math.max(100, Math.min(360, Math.round(targetW * (h / w))));
            const obj = document.createElement('div');
            obj.className = 'card-embedded-obj my-2';
            obj.setAttribute('data-shape-type', 'directImage');
            obj.style.width = '100%';
            obj.style.height = targetH + 'px';
            obj.style.padding = '0px';
            obj.style.backgroundColor = 'transparent';
            obj.style.border = 'none';
            obj.innerHTML = `
              <div class="image-slot-box has-image relative w-full h-full overflow-hidden">
                <img src="${base64Data}" data-img-nat-w="${w}" data-img-nat-h="${h}" class="slot-img w-full h-full object-contain block" alt="삽입 이미지" />
                <div class="media-gradient-overlay"></div>
              </div>`;
            targetCard.appendChild(obj);
            selectElementForInspector(obj);
            refreshLayerList();
            saveHistorySnapshot();
            showToast('선택한 카드 내부에 사진이 소속 삽입되었습니다! 카드 영역 내에서 자유 이동·크기 조절이 가능합니다.');
            return;
          }

          const activeSlideEl = slides[currentSlide - 1];
          if (!activeSlideEl) return;
          ensureFreeLayersOnAllSlides();
          const layer = activeSlideEl.querySelector('.ppt-free-layer');
          const slideRect = activeSlideEl.getBoundingClientRect();

          const targetWidthPx = Math.min(slideRect.width * 0.42, Math.max(160, w));
          const targetHeightPx = targetWidthPx * (h / w);
          const widthPct = Math.min(85, (targetWidthPx / slideRect.width) * 100);
          const heightPct = Math.min(85, (targetHeightPx / slideRect.height) * 100);

          const obj = document.createElement('div');
          obj.className = 'ppt-free-obj';
          obj.setAttribute('data-shape-type', 'directImage');
          obj.style.left = '29%';
          obj.style.top = '22%';
          obj.style.width = widthPct.toFixed(2) + '%';
          obj.style.height = heightPct.toFixed(2) + '%';
          obj.style.padding = '0px';
          obj.style.backgroundColor = 'transparent';
          obj.style.border = 'none';
          obj.style.zIndex = String(layer.children.length + 22);
          obj.innerHTML = `
            <div class="image-slot-box has-image relative w-full h-full overflow-hidden">
              <img src="${base64Data}" data-img-nat-w="${w}" data-img-nat-h="${h}" class="slot-img w-full h-full object-contain block" alt="삽입 이미지" />
              <div class="media-gradient-overlay"></div>
            </div>`;
          layer.appendChild(obj);
          selectElementForInspector(obj);
          saveHistorySnapshot();
          showToast('사진이 원본 비율 그대로 슬라이드에 바로 삽입되었습니다.');
        };
        imgObj.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  const globalMedia = document.getElementById('globalMediaUploader');
  if (globalMedia && !globalMedia.dataset.bound) {
    globalMedia.dataset.bound = 'true';
    globalMedia.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file && activeImageSlot) {
        if (file.type.startsWith('video/')) {
          applyVideoToSlot(activeImageSlot, file);
        } else {
          processImageFile(file, activeImageSlot);
        }
      }
    });
  }

  const globalImage = document.getElementById('globalImageUploader');
  if (globalImage && !globalImage.dataset.bound) {
    globalImage.dataset.bound = 'true';
    globalImage.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file && activeImageSlot) {
        processImageFile(file, activeImageSlot);
      }
    });
  }

  const replaceUploader = document.getElementById('replaceMediaUploader');
  if (replaceUploader && !replaceUploader.dataset.bound) { replaceUploader.dataset.bound = 'true'; replaceUploader.addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (f) executeReplaceMediaPreserveProps(f); }); }
  const posterUploader = document.getElementById('videoPosterUploader');
  if (posterUploader && !posterUploader.dataset.bound) { posterUploader.dataset.bound = 'true'; posterUploader.addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (f) applyVideoPosterFile(f); }); }
  const audioUploader = document.getElementById('audioFileUploader');
  if (audioUploader && !audioUploader.dataset.bound) { audioUploader.dataset.bound = 'true'; audioUploader.addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (f) insertAudioFile(f); }); }
}

/* ==================== UNIVERSAL ELEMENT OPACITY CONTROL ==================== */
function setSelectedElementOpacity(val, isLiveInput) {
  const pct = Math.max(5, Math.min(100, Number(val) || 100));
  const slider = $studio('elementOpacitySlider');
  const lbl = $studio('elementOpacityLabel');
  if (slider) slider.value = String(pct);
  if (lbl) lbl.textContent = `${pct}%`;

  const targets = selectedElements.length > 0 ? selectedElements : (selectedElement ? [selectedElement] : []);
  if (targets.length === 0) {
    if (!isLiveInput) showToast('불투명도를 조절할 미디어·도형·텍스트박스·카드를 먼저 선택해 주세요.');
    return;
  }
  targets.forEach(el => {
    el.style.opacity = (pct / 100).toFixed(2);
  });
  if (!isLiveInput) saveHistorySnapshot();
}

function syncElementOpacityUI(el) {
  const slider = $studio('elementOpacitySlider');
  const lbl = $studio('elementOpacityLabel');
  if (!slider || !lbl) return;
  if (!el) {
    slider.value = '100';
    lbl.textContent = '100%';
    return;
  }
  const raw = el.style.opacity !== '' ? parseFloat(el.style.opacity) : 1;
  const pct = Math.round((isNaN(raw) ? 1 : raw) * 100);
  slider.value = String(pct);
  lbl.textContent = `${pct}%`;
}

function setSelectedElementRadiusPx(val, isLiveInput) {
  const num = Math.max(0, Math.min(9999, Number(val) || 0));
  const radStr = num >= 9999 ? '9999px' : `${num}px`;
  const slider = $studio('shapeRadiusRangeSlider');
  const numInp = $studio('shapeRadiusNumberInput');
  if (slider) slider.value = String(Math.min(80, num));
  if (numInp) numInp.value = String(num);

  const targets = selectedElements.length > 0 ? selectedElements : (selectedElement ? [selectedElement] : []);
  if (targets.length === 0) {
    if (!isLiveInput) showToast('모서리 둥글기를 조절할 도형·텍스트박스·미디어·카드를 먼저 선택해 주세요.');
    return;
  }
  targets.forEach(el => {
    el.style.borderRadius = radStr;
    const innerSlot = el.querySelector('.image-slot-box');
    if (innerSlot) {
      innerSlot.classList.remove('rounded-xl', 'rounded-2xl');
      innerSlot.style.borderRadius = radStr;
    }
  });
  positionSelectionOverlay();
  if (!isLiveInput) saveHistorySnapshot();
}

function syncElementRadiusUI(el) {
  const slider = $studio('shapeRadiusRangeSlider');
  const numInp = $studio('shapeRadiusNumberInput');
  if (!slider || !numInp || !el) return;
  const raw = el.style.borderRadius || window.getComputedStyle(el).borderRadius || '0px';
  const parsed = parseInt(raw, 10) || 0;
  slider.value = String(Math.min(80, parsed));
  numInp.value = String(parsed);
}

const PPT_SVG_ICONS = {
  check: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.8-5.2"/></svg>',
  alert: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L2.5 20h19L12 3z"/><line x1="12" y1="9" x2="12" y2="14"/><circle cx="12" cy="17.2" r="0.8" fill="currentColor"/></svg>',
  star: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.7 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2"/></svg>',
  pin: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 1 1 13 0c0 5.2-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg>',
  play: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5" fill="none"/><polygon points="10 8 16.5 12 10 16 10 8"/></svg>',
  bolt: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><polygon points="13 2 4 14 11 14 10 22 20 10 13 10 13 2"/></svg>',
  heart: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 20.5s-7.5-4.8-9.2-9.4C1.5 7.6 4 4.5 7.3 4.5c2 0 3.7 1.1 4.7 2.7 1-1.6 2.7-2.7 4.7-2.7 3.3 0 5.8 3.1 4.5 6.6-1.7 4.6-9.2 9.4-9.2 9.4z"/></svg>',
  user: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>',
  rocket: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4.5c3 0 5 2 5 5 0 4.5-4.5 9-9 9l-4-4c0-4.5 4.5-9 8-10z"/><path d="M6.5 14.5L4 20l5.5-2.5"/><circle cx="14" cy="10" r="1.5" fill="currentColor"/></svg>',
  chart: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="20" x2="20" y2="20"/><rect x="6" y="12" width="2.8" height="8" fill="currentColor"/><rect x="10.6" y="7" width="2.8" height="13" fill="currentColor"/><rect x="15.2" y="4" width="2.8" height="16" fill="currentColor"/></svg>'
};
function insertFreeSvgIcon(iconKey) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const svgBody = PPT_SVG_ICONS[iconKey] || PPT_SVG_ICONS.check;
  if (typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive()) {
    const fcEd = typeof getActiveFcPreviewCanvas === 'function' ? getActiveFcPreviewCanvas() : null;
    if (fcEd) {
      const obj = fcEd.ownerDocument.createElement('div');
      obj.className = 'card-embedded-obj fc-resizable-item inline-flex items-center justify-center p-2 my-2 rounded-xl border border-borderline bg-white';
      obj.setAttribute('data-shape-type', 'svg-icon');
      obj.setAttribute('data-icon-key', iconKey);
      obj.setAttribute('contenteditable', 'false');
      obj.style.width = '72px'; obj.style.height = '72px'; obj.style.color = '#0055FF';
      obj.innerHTML = `<svg viewBox="0 0 24 24" class="w-full h-full" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgBody}</svg>`;
      fcEd.appendChild(obj);
      if (typeof makeFcBlockResizable === 'function') makeFcBlockResizable(obj);
      if (typeof selectElementForInspector === 'function') selectElementForInspector(obj, false);
      if (typeof recordFcSnapshot === 'function') recordFcSnapshot();
      showToast('플로팅 카드에 벡터 아이콘이 삽입되었습니다.');
      return;
    }
  }
  const activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return;
  ensureFreeLayersOnAllSlides();
  const layer = activeSlideEl.querySelector('.ppt-free-layer'); if (!layer) return;
  const obj = document.createElement('div');
  obj.className = 'ppt-free-obj'; obj.setAttribute('data-shape-type', 'svg-icon'); obj.setAttribute('data-icon-key', iconKey);
  obj.style.left = '44%'; obj.style.top = '38%'; obj.style.width = '7%'; obj.style.height = '12.5%'; obj.style.padding = '4px';
  obj.style.zIndex = String(layer.children.length + 22); obj.style.color = (document.documentElement.style.getPropertyValue('--accent-color') || '#0055FF').trim() || '#0055FF'; obj.innerHTML = svgBody;
  layer.appendChild(obj); selectElementForInspector(obj, false); if (typeof refreshLayerList === 'function') refreshLayerList(); saveHistorySnapshot(`아이콘 삽입 (${iconKey})`);
}
let isPickingConnectorMode = false, connectorSourceNode = null;
function startConnectorLinkMode() { if (typeof isInteractiveTestMode !== 'undefined' && isInteractiveTestMode && typeof toggleInteractiveTestMode === 'function') toggleInteractiveTestMode(false); if (!isEditMode && typeof toggleEditMode === 'function') toggleEditMode(true); isPickingConnectorMode = true; connectorSourceNode = null; const btn = $studio('startConnectorBtn'); if (btn) btn.textContent = '1단계: 시작 도형/카드 클릭...'; }
function cancelConnectorLinkMode() { isPickingConnectorMode = false; connectorSourceNode = null; const btn = $studio('startConnectorBtn'); if (btn) btn.textContent = '🔗 자석 연결선 추가'; }
function handleConnectorPickClick(targetEl) {
  if (!isPickingConnectorMode || !targetEl) return false;
  if (!connectorSourceNode) { connectorSourceNode = targetEl; const btn = $studio('startConnectorBtn'); if (btn) btn.textContent = '2단계: 도착 도형/카드 클릭...'; return true; }
  if (connectorSourceNode === targetEl) return true;
  createConnectorBetweenElements(connectorSourceNode, targetEl); cancelConnectorLinkMode(); return true;
}
function ensureConnectorNodeId(el) { let id = el.getAttribute('data-conn-node-id'); if (!id) { id = 'cnode_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6); el.setAttribute('data-conn-node-id', id); } return id; }
function createConnectorBetweenElements(srcEl, dstEl) {
  const activeSlideEl = slides[currentSlide - 1]; if (!activeSlideEl || !srcEl || !dstEl) return;
  const fromId = ensureConnectorNodeId(srcEl), toId = ensureConnectorNodeId(dstEl);
  let svgLayer = activeSlideEl.querySelector('svg.ppt-connectors-layer');
  if (!svgLayer) { svgLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svgLayer.setAttribute('class', 'ppt-connectors-layer'); svgLayer.setAttribute('viewBox', `0 0 ${LOGICAL_STAGE_WIDTH || 1440} ${LOGICAL_STAGE_HEIGHT || 810}`); svgLayer.setAttribute('preserveAspectRatio', 'none'); activeSlideEl.appendChild(svgLayer); }
  const grp = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const connCol = (document.documentElement.style.getPropertyValue('--accent-color') || '#0055FF').trim() || '#0055FF';
  grp.setAttribute('class', 'ppt-connector-item'); grp.setAttribute('data-connector-from', fromId); grp.setAttribute('data-connector-to', toId); grp.setAttribute('data-connector-color', connCol);
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line'); line.setAttribute('stroke', connCol); line.setAttribute('stroke-width', '3.5'); line.setAttribute('stroke-linecap', 'round');
  const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon'); arrow.setAttribute('fill', connCol);
  grp.appendChild(line); grp.appendChild(arrow); svgLayer.appendChild(grp);
  updateSlideConnectors(activeSlideEl); saveHistorySnapshot('자석 연결선 추가');
}
function updateSlideConnectors(slideEl) {
  const targetSlide = slideEl || slides[currentSlide - 1] || document.querySelector('.slide.active'); if (!targetSlide) return;
  const svgLayer = targetSlide.querySelector('svg.ppt-connectors-layer'); if (!svgLayer) return;
  const stageW = (typeof LOGICAL_STAGE_WIDTH === 'number' && LOGICAL_STAGE_WIDTH > 0) ? LOGICAL_STAGE_WIDTH : 1440;
  const stageH = (typeof LOGICAL_STAGE_HEIGHT === 'number' && LOGICAL_STAGE_HEIGHT > 0) ? LOGICAL_STAGE_HEIGHT : 810;
  svgLayer.setAttribute('viewBox', `0 0 ${stageW} ${stageH}`);
  const sRect = targetSlide.getBoundingClientRect(), scale = typeof getStageScale === 'function' ? getStageScale() : 1;
  const getLogicalBox = (el) => {
    const r = el.getBoundingClientRect(); let x = 0, y = 0, w = 0, h = 0;
    if (sRect.width > 0 && sRect.height > 0 && r.width > 0 && r.height > 0) { x = (r.left - sRect.left) / scale; y = (r.top - sRect.top) / scale; w = r.width / scale; h = r.height / scale; }
    else if (el.classList.contains('ppt-free-obj')) { x = ((parseFloat(el.style.left) || 0) / 100) * stageW; y = ((parseFloat(el.style.top) || 0) / 100) * stageH; w = ((parseFloat(el.style.width) || 15) / 100) * stageW; h = ((parseFloat(el.style.height) || 15) / 100) * stageH; }
    return { anchors: [{ x: x + w / 2, y: y }, { x: x + w, y: y + h / 2 }, { x: x + w / 2, y: y + h }, { x: x, y: y + h / 2 }] };
  };
  Array.from(svgLayer.querySelectorAll('.ppt-connector-item')).forEach(grp => {
    const fromId = grp.getAttribute('data-connector-from'), toId = grp.getAttribute('data-connector-to');
    const srcEl = fromId ? targetSlide.querySelector(`[data-conn-node-id="${fromId}"]`) : null, dstEl = toId ? targetSlide.querySelector(`[data-conn-node-id="${toId}"]`) : null;
    if (!srcEl || !dstEl) { grp.remove(); return; }
    const b1 = getLogicalBox(srcEl), b2 = getLogicalBox(dstEl);
    let bestP1 = b1.anchors[1], bestP2 = b2.anchors[3], bestDist = Infinity;
    b1.anchors.forEach(p1 => { b2.anchors.forEach(p2 => { const d = Math.hypot(p2.x - p1.x, p2.y - p1.y); if (d < bestDist) { bestDist = d; bestP1 = p1; bestP2 = p2; } }); });
    const line = grp.querySelector('line'), arrow = grp.querySelector('polygon');
    if (line) { line.setAttribute('x1', bestP1.x.toFixed(1)); line.setAttribute('y1', bestP1.y.toFixed(1)); line.setAttribute('x2', bestP2.x.toFixed(1)); line.setAttribute('y2', bestP2.y.toFixed(1)); }
    if (arrow) {
      const ang = Math.atan2(bestP2.y - bestP1.y, bestP2.x - bestP1.x);
      arrow.setAttribute('points', `${(bestP2.x - 14 * Math.cos(ang - 0.45)).toFixed(1)},${(bestP2.y - 14 * Math.sin(ang - 0.45)).toFixed(1)} ${bestP2.x.toFixed(1)},${bestP2.y.toFixed(1)} ${(bestP2.x - 14 * Math.cos(ang + 0.45)).toFixed(1)},${(bestP2.y - 14 * Math.sin(ang + 0.45)).toFixed(1)}`);
    }
  });
}
function removeConnectorsOnSelected() {
  const activeSlideEl = slides[currentSlide - 1], targets = selectedElements.length > 0 ? selectedElements : (selectedElement ? [selectedElement] : []);
  if (!activeSlideEl || targets.length === 0) return;
  const ids = new Set(targets.map(el => el.getAttribute('data-conn-node-id')).filter(Boolean));
  let removed = 0;
  activeSlideEl.querySelectorAll('.ppt-connector-item').forEach(grp => { if (ids.has(grp.getAttribute('data-connector-from')) || ids.has(grp.getAttribute('data-connector-to'))) { grp.remove(); removed++; } });
  if (removed > 0) saveHistorySnapshot('자석 연결선 제거');
}
function getActiveImageElement() {
  if (!selectedElement) return null;
  if (selectedElement.classList.contains('ppt-interactive-widget') && selectedElement.getAttribute('data-iw-type') === 'before-after') return null;
  if (selectedElement.tagName === 'IMG') return selectedElement.classList.contains('iw-ba-img') ? null : selectedElement;
  const candidate = selectedElement.querySelector('img.slot-img:not(.hidden), img.inline-media-el:not(.hidden), img.iw-hs-base-img:not(.hidden), img:not(.hidden):not(.iw-ba-img)');
  return (candidate && !candidate.closest('.ppt-chart-widget')) ? candidate : null;
}
function syncImageCssTransformAndFilter(imgEl) {
  if (!imgEl) return;
  const zoom = Math.max(100, Math.min(300, Number(imgEl.getAttribute('data-img-zoom') || '100') || 100));
  const panX = Math.max(0, Math.min(100, Number(imgEl.getAttribute('data-img-pan-x') ?? '50')));
  const panY = Math.max(0, Math.min(100, Number(imgEl.getAttribute('data-img-pan-y') ?? '50')));
  const flipX = imgEl.getAttribute('data-img-flip-x') === 'true', flipY = imgEl.getAttribute('data-img-flip-y') === 'true';
  const brightness = Math.max(20, Math.min(200, Number(imgEl.getAttribute('data-img-brightness') ?? '100')));
  const contrast = Math.max(20, Math.min(200, Number(imgEl.getAttribute('data-img-contrast') ?? '100')));
  const grayscale = Math.max(0, Math.min(100, Number(imgEl.getAttribute('data-img-grayscale') ?? '0')));
  const blurPx = Math.max(0, Math.min(30, Number(imgEl.getAttribute('data-img-blur') ?? '0')));
  imgEl.style.objectPosition = `${panX}% ${panY}%`; imgEl.style.transformOrigin = `${panX}% ${panY}%`;
  const transforms = []; if (flipX) transforms.push('scaleX(-1)'); if (flipY) transforms.push('scaleY(-1)'); if (zoom > 100) transforms.push(`scale(${(zoom / 100).toFixed(2)})`);
  imgEl.style.transform = transforms.join(' ');
  const filters = []; if (brightness !== 100) filters.push(`brightness(${brightness}%)`); if (contrast !== 100) filters.push(`contrast(${contrast}%)`); if (grayscale > 0) filters.push(`grayscale(${grayscale}%)`); if (blurPx > 0) filters.push(`blur(${blurPx}px)`);
  imgEl.style.filter = filters.join(' ');
}
function syncImageAdjustmentInspectorUI(el) {
  const imgEl = el ? (el.tagName === 'IMG' ? el : el.querySelector('img.slot-img:not(.hidden), img.inline-media-el:not(.hidden), img.iw-hs-base-img:not(.hidden), img:not(.hidden):not(.iw-ba-img)')) : null;
  const zoom = imgEl ? (Number(imgEl.getAttribute('data-img-zoom') || '100') || 100) : 100;
  const blurVal = imgEl ? (Number(imgEl.getAttribute('data-img-blur') ?? '0') || 0) : 0;
  if ($studio('imgCropZoomSlider')) $studio('imgCropZoomSlider').value = String(zoom);
  if ($studio('imgCropZoomLabel')) $studio('imgCropZoomLabel').textContent = `${zoom}%`;
  if ($studio('imgPanXSlider')) $studio('imgPanXSlider').value = String(imgEl ? Number(imgEl.getAttribute('data-img-pan-x') ?? '50') : 50);
  if ($studio('imgPanYSlider')) $studio('imgPanYSlider').value = String(imgEl ? Number(imgEl.getAttribute('data-img-pan-y') ?? '50') : 50);
  if ($studio('imgBrightnessSlider')) $studio('imgBrightnessSlider').value = String(imgEl ? Number(imgEl.getAttribute('data-img-brightness') ?? '100') : 100);
  if ($studio('imgContrastSlider')) $studio('imgContrastSlider').value = String(imgEl ? Number(imgEl.getAttribute('data-img-contrast') ?? '100') : 100);
  if ($studio('imgGrayscaleSlider')) $studio('imgGrayscaleSlider').value = String(imgEl ? Number(imgEl.getAttribute('data-img-grayscale') ?? '0') : 0);
  if ($studio('blurRangeSlider')) $studio('blurRangeSlider').value = String(blurVal);
  if ($studio('blurAmountLabel')) $studio('blurAmountLabel').textContent = `${blurVal}px`;
}
function setSelectedImageCropAndPan(prop, rawVal, isLiveInput) {
  if ((typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(!isLiveInput)) || (selectedElement && selectedElement.getAttribute('data-layer-locked') === 'true')) return;
  const imgEl = getActiveImageElement(); if (!imgEl) return;
  const val = Math.round(Number(rawVal) || 0);
  if (prop === 'zoom') { const c = Math.max(100, Math.min(300, val)); imgEl.setAttribute('data-img-zoom', String(c)); if ($studio('imgCropZoomLabel')) $studio('imgCropZoomLabel').textContent = `${c}%`; }
  else if (prop === 'panX') imgEl.setAttribute('data-img-pan-x', String(Math.max(0, Math.min(100, val))));
  else if (prop === 'panY') imgEl.setAttribute('data-img-pan-y', String(Math.max(0, Math.min(100, val))));
  if (imgEl.classList.contains('object-contain')) { imgEl.classList.remove('object-contain'); imgEl.classList.add('object-cover'); }
  syncImageCssTransformAndFilter(imgEl); if (!isLiveInput) saveHistorySnapshot('이미지 크롭/위치 조정');
}
function toggleSelectedImageFlip(axis) {
  if ((typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) || (selectedElement && selectedElement.getAttribute('data-layer-locked') === 'true')) return;
  const imgEl = getActiveImageElement(); if (!imgEl) return;
  const attrName = axis === 'y' ? 'data-img-flip-y' : 'data-img-flip-x';
  if (imgEl.getAttribute(attrName) !== 'true') imgEl.setAttribute(attrName, 'true'); else imgEl.removeAttribute(attrName);
  syncImageCssTransformAndFilter(imgEl); saveHistorySnapshot(axis === 'y' ? '이미지 상하 반전' : '이미지 좌우 반전');
}
function setSelectedImageFilter(prop, rawVal, isLiveInput) {
  if ((typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(!isLiveInput)) || (selectedElement && selectedElement.getAttribute('data-layer-locked') === 'true')) return;
  const imgEl = getActiveImageElement(); if (!imgEl) return;
  const val = Math.round(Number(rawVal) || 0);
  if (prop === 'brightness') imgEl.setAttribute('data-img-brightness', String(Math.max(20, Math.min(200, val))));
  else if (prop === 'contrast') imgEl.setAttribute('data-img-contrast', String(Math.max(20, Math.min(200, val))));
  else if (prop === 'grayscale') imgEl.setAttribute('data-img-grayscale', String(Math.max(0, Math.min(100, val))));
  syncImageCssTransformAndFilter(imgEl); if (!isLiveInput) saveHistorySnapshot('이미지 색감/밝기 보정');
}
function resetSelectedImageAdjustments() {
  if ((typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) || (selectedElement && selectedElement.getAttribute('data-layer-locked') === 'true')) return;
  const imgEl = getActiveImageElement(); if (!imgEl) return;
  ['data-img-zoom', 'data-img-pan-x', 'data-img-pan-y', 'data-img-flip-x', 'data-img-flip-y', 'data-img-brightness', 'data-img-contrast', 'data-img-grayscale', 'data-img-blur'].forEach(a => imgEl.removeAttribute(a));
  imgEl.style.transform = ''; imgEl.style.filter = ''; imgEl.style.objectPosition = '';
  syncImageAdjustmentInspectorUI(selectedElement); saveHistorySnapshot('이미지 보정 초기화');
}
function resetSelectedImageAspectRatio() {
  if ((typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) || (selectedElement && selectedElement.getAttribute('data-layer-locked') === 'true')) return;
  const imgEl = getActiveImageElement(); if (!imgEl) return;
  const natW = imgEl.naturalWidth || parseInt(imgEl.getAttribute('data-img-nat-w') || '0', 10), natH = imgEl.naturalHeight || parseInt(imgEl.getAttribute('data-img-nat-h') || '0', 10);
  if (!natW || !natH) return;
  const box = imgEl.closest('.ppt-free-obj, .image-slot-box, .card-inline-media, .card-embedded-obj'); if (!box) return;
  if (box.classList.contains('ppt-free-obj') && box.parentElement) {
    const stageW = (typeof LOGICAL_STAGE_WIDTH === 'number' && LOGICAL_STAGE_WIDTH > 0) ? LOGICAL_STAGE_WIDTH : 1440;
    const stageH = (typeof LOGICAL_STAGE_HEIGHT === 'number' && LOGICAL_STAGE_HEIGHT > 0) ? LOGICAL_STAGE_HEIGHT : 810;
    const curWpx = box.offsetWidth || (((parseFloat(box.style.width) || 30) / 100) * stageW);
    const layerH = box.parentElement.clientHeight || stageH;
    box.style.height = ((Math.min(layerH * 0.88, curWpx * (natH / natW)) / layerH) * 100).toFixed(2) + '%';
  } else {
    const nextHpx = Math.max(90, Math.min(540, Math.round((box.offsetWidth || 320) * (natH / natW))));
    box.style.height = `${nextHpx}px`; box.style.minHeight = `${nextHpx}px`; box.style.maxHeight = `${nextHpx}px`;
  }
  imgEl.classList.remove('object-cover'); imgEl.classList.add('object-contain'); positionSelectionOverlay(); saveHistorySnapshot('이미지 원본 비율 복원');
}
function triggerReplaceMediaPreserveProps() {
  if ((typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) || (selectedElement && selectedElement.getAttribute('data-layer-locked') === 'true')) return;
  if (!getActiveImageElement() && !getSelectedVideoElement()) return;
  const inp = document.getElementById('replaceMediaUploader'); if (!inp) return;
  inp.value = ''; inp.click();
}
function executeReplaceMediaPreserveProps(file) {
  if (!file) return;
  const imgEl = getActiveImageElement(), vidEl = getSelectedVideoElement();
  if (file.type.startsWith('video/') && vidEl) {
    if (window.__pptSessionMediaBlobs instanceof Map) window.__pptSessionMediaBlobs.set(file.name, file);
    vidEl.setAttribute('src', URL.createObjectURL(file)); vidEl.setAttribute('data-media-name', file.name);
    clearVideoMissingFallback(vidEl); initVideoErrorFallbacks(vidEl.parentElement); syncVideoSourceInspectorUI(vidEl); vidEl.load();
    saveHistorySnapshot('동영상 속성 유지 교체'); return;
  }
  if (file.type.startsWith('image/') && imgEl) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const probe = new Image();
      probe.onload = () => {
        const maxDim = 1600; let w = probe.width, h = probe.height;
        if (w > maxDim || h > maxDim) { if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; } else { w = Math.round((w * maxDim) / h); h = maxDim; } }
        const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(probe, 0, 0, w, h);
        const preserveAlpha = /^(?:image\/png|image\/webp|image\/gif)$/i.test(file.type || ''); imgEl.src = canvas.toDataURL(preserveAlpha ? 'image/png' : 'image/jpeg', 0.9);
        imgEl.setAttribute('data-img-nat-w', String(w)); imgEl.setAttribute('data-img-nat-h', String(h));
        imgEl.classList.remove('hidden'); syncImageCssTransformAndFilter(imgEl); saveHistorySnapshot('이미지 속성 유지 교체');
      };
      probe.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }
}
function toggleVideoPlaybackOption(optName) {
  const vid = getSelectedVideoElement(); if (!vid) return;
  const nextVal = !(vid[optName] || vid.hasAttribute(optName));
  vid[optName] = nextVal; if (nextVal) vid.setAttribute(optName, ''); else vid.removeAttribute(optName);
  if (optName === 'autoplay' && nextVal) { vid.muted = true; vid.setAttribute('muted', ''); }
  syncVideoSourceInspectorUI(vid); saveHistorySnapshot(`동영상 ${optName} 설정`);
}
function triggerVideoPosterUpload() {
  let vid = getSelectedVideoElement();
  if (!vid) {
    const activeSlideEl = slides[currentSlide - 1];
    vid = activeSlideEl ? activeSlideEl.querySelector('video') : null;
    if (vid && typeof selectElementForInspector === 'function') {
      selectElementForInspector(vid.closest('.ppt-free-obj, .card-embedded-obj, .image-slot-box') || vid);
    }
  }
  if (!vid) {
    showToast('먼저 슬라이드에 동영상을 삽입한 뒤 포스터(썸네일) 이미지를 지정해 주세요.');
    return;
  }
  const inp = document.getElementById('videoPosterUploader');
  if (!inp) return;
  inp.value = '';
  inp.click();
}
function applyVideoPosterFile(file) {
  const vid = getSelectedVideoElement(); if (!vid || !file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = Math.min(1280, img.width); c.height = Math.round(img.height * (c.width / Math.max(1, img.width)));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      vid.setAttribute('poster', c.toDataURL('image/jpeg', 0.85)); syncVideoSourceInspectorUI(vid); saveHistorySnapshot('동영상 포스터 지정');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}
function clearVideoPoster() { const vid = getSelectedVideoElement(); if (!vid) return; vid.removeAttribute('poster'); syncVideoSourceInspectorUI(vid); saveHistorySnapshot('동영상 포스터 제거'); }
function triggerAudioInsert() { const inp = document.getElementById('audioFileUploader'); if (!inp) return; inp.value = ''; inp.click(); }
function insertAudioFile(file) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  if (!file) return;
  if (window.__pptSessionMediaBlobs instanceof Map) window.__pptSessionMediaBlobs.set(file.name, file);
  const finishInsert = (audioSrc, isBlob) => {
    const safeTitle = escapeAttr(file.name.replace(/\.[^.]+$/, '')), mediaNameAttr = isBlob ? ` data-media-name="${escapeAttr(file.name)}"` : '';
    const innerHtml = `<div class="flex items-center justify-between gap-2 text-xs"><span data-editable contenteditable="true" class="font-bold text-ink truncate">🎵 ${safeTitle}</span><button type="button" data-on-click="toggleAudioPersist(this)" class="px-2 py-0.5 rounded bg-canvas hover:border-gopro border border-borderline font-mono text-[10px] font-bold text-ink cursor-pointer shrink-0">🔁 슬라이드 연속재생 OFF</button></div><audio controls preload="metadata" src="${audioSrc}"${mediaNameAttr} class="w-full h-8"></audio>`;
    const targetCard = shouldInsertIntoSelectedCard();
    if (targetCard) {
      const obj = document.createElement('div'); obj.className = 'card-embedded-obj ppt-audio-widget my-2 shadow-xs'; obj.setAttribute('data-shape-type', 'audio');
      obj.style.width = '100%'; obj.style.height = 'auto'; obj.innerHTML = innerHtml;
      targetCard.appendChild(obj); selectElementForInspector(obj); refreshLayerList(); saveHistorySnapshot('오디오 삽입'); return;
    }
    const activeSlideEl = slides[currentSlide - 1]; if (!activeSlideEl) return;
    ensureFreeLayersOnAllSlides();
    const layer = activeSlideEl.querySelector('.ppt-free-layer'), obj = document.createElement('div');
    obj.className = 'ppt-free-obj ppt-audio-widget shadow-md'; obj.setAttribute('data-shape-type', 'audio');
    obj.style.left = '32%'; obj.style.top = '42%'; obj.style.width = '34%'; obj.style.height = '13%'; obj.style.zIndex = String(layer.children.length + 24);
    obj.innerHTML = innerHtml; layer.appendChild(obj); selectElementForInspector(obj); refreshLayerList(); saveHistorySnapshot('오디오 삽입');
  };
  if (file.size <= 8 * 1024 * 1024) { const reader = new FileReader(); reader.onload = (ev) => finishInsert(ev.target.result, false); reader.readAsDataURL(file); }
  else finishInsert(URL.createObjectURL(file), true);
}
function toggleAudioPersist(btn) {
  const wrap = btn ? btn.closest('.ppt-audio-widget') : null, aud = wrap ? wrap.querySelector('audio') : null;
  if (!aud) return;
  const nextPersist = aud.getAttribute('data-audio-persist') !== 'true';
  if (nextPersist) { aud.setAttribute('data-audio-persist', 'true'); aud.loop = true; btn.textContent = '🔁 슬라이드 연속재생 ON'; btn.classList.add('bg-gopro', 'text-white'); }
  else { aud.removeAttribute('data-audio-persist'); btn.textContent = '🔁 슬라이드 연속재생 OFF'; btn.classList.remove('bg-gopro', 'text-white'); }
  saveHistorySnapshot('오디오 연속재생 설정');
}
function extractYouTubeVideoId(rawUrl) {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return '';
  let urlStr = /^https?:\/\//i.test(trimmed) ? trimmed : ('https://' + trimmed);
  try {
    const u = new URL(urlStr);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com' || host === 'youtube-nocookie.com') {
      const vParam = u.searchParams ? u.searchParams.get('v') : null;
      if (vParam && /^[a-zA-Z0-9_-]{6,}$/.test(vParam)) return vParam;
      const pathM = u.pathname.match(/^\/(?:shorts|live|embed)\/([a-zA-Z0-9_-]{6,})/i);
      if (pathM) return pathM[1];
    } else if (host === 'youtu.be') {
      const idM = u.pathname.match(/^\/([a-zA-Z0-9_-]{6,})/);
      if (idM) return idM[1];
    }
  } catch (e) {}
  // Regex fallback for browsers/WebViews without URL.searchParams
  const rxWatch = urlStr.match(/(?:youtube\.com|youtube-nocookie\.com)\/watch\?(?:[^#]*&)?v=([a-zA-Z0-9_-]{6,})/i);
  if (rxWatch) return rxWatch[1];
  const rxPath = urlStr.match(/(?:youtube\.com|youtube-nocookie\.com)\/(?:shorts|live|embed)\/([a-zA-Z0-9_-]{6,})/i);
  if (rxPath) return rxPath[1];
  const rxShort = urlStr.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/i);
  if (rxShort) return rxShort[1];
  return '';
}

function buildYouTubeEmbedSrc(vidId) {
  const base = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(vidId)}?rel=0&playsinline=1`;
  try {
    if (window.location && /^https?:$/i.test(window.location.protocol) && window.location.origin && window.location.origin !== 'null') {
      return `${base}&origin=${encodeURIComponent(window.location.origin)}`;
    }
  } catch (e) {}
  return base;
}

function normalizeEmbedUrl(rawUrl) {
  const trimmed = (rawUrl || '').trim(); if (!trimmed) return '';
  let urlStr = /^https?:\/\//i.test(trimmed) ? trimmed : ('https://' + trimmed);
  if (!/^https:\/\//i.test(urlStr)) return '';
  const ytId = extractYouTubeVideoId(urlStr);
  if (ytId) return buildYouTubeEmbedSrc(ytId);
  try {
    const u = new URL(urlStr);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'vimeo.com') {
      const vm = u.pathname.match(/^\/(\d+)/);
      if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
    }
  } catch (e) {
    return '';
  }
  return urlStr;
}

function buildYouTubeIframeHtml(vidId) {
  const safeSrc = escapeAttr(buildYouTubeEmbedSrc(vidId));
  return `<iframe src="${safeSrc}" data-safe-embed="true" data-yt-iframe="true" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy" class="w-full flex-1 border-0 bg-black"></iframe>`;
}

function buildYouTubePosterCardHtml(vidId) {
  const safeId = escapeAttr(vidId);
  const thumbUrl = `https://i.ytimg.com/vi/${safeId}/hqdefault.jpg`;
  return `<div class="yt-poster-card relative w-full flex-1 bg-slate-950 overflow-hidden flex flex-col items-center justify-center cursor-pointer select-none" data-yt-poster="${safeId}" data-on-click="openYouTubePopupPlayer(this)">
    <img src="${thumbUrl}" alt="YouTube 썸네일" class="absolute inset-0 w-full h-full object-cover opacity-85 pointer-events-none">
    <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/35 pointer-events-none"></div>
    <button type="button" data-on-click="event.stopPropagation(); openYouTubePopupPlayer(this, true)" class="relative z-10 w-16 h-11 rounded-2xl bg-red-600 hover:bg-red-500 text-white shadow-2xl flex items-center justify-center cursor-pointer transition-transform hover:scale-105" aria-label="유튜브 팝업 플레이어로 재생" title="클릭하여 YouTube 팝업 플레이어로 재생">
      <svg viewBox="0 0 24 24" class="w-7 h-7 fill-current ml-0.5"><polygon points="6,4 20,12 6,20"></polygon></svg>
    </button>
    <div class="relative z-10 mt-2.5 px-3 py-1 rounded-full bg-black/75 text-white font-mono text-[11px] font-bold">▶ 클릭하여 YouTube 팝업 재생</div>
    <div class="yt-local-hint-bar absolute bottom-2 inset-x-2 z-10 flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/75 text-white/90 text-[10px] text-center" data-on-click="event.stopPropagation()">
      <span class="truncate">로컬(file://)에서는 팝업으로 안전 재생됩니다 · 슬라이드 내 인라인 재생은 MP4 삽입 또는 웹(HTTPS) 배포 시 지원</span>
    </div>
  </div>`;
}

function openYouTubePopupPlayer(triggerEl, explicitPlayBtn) {
  const activeEdit = typeof isActiveEditing === 'function' ? isActiveEditing() : (typeof isEditMode !== 'undefined' && isEditMode);
  if (activeEdit && !explicitPlayBtn) return;
  const widget = triggerEl ? triggerEl.closest('.ppt-embed-widget') : null;
  const poster = triggerEl ? (triggerEl.closest('[data-yt-poster]') || (widget && widget.querySelector('[data-yt-poster]'))) : null;
  const vidId = (widget && widget.getAttribute('data-yt-vid-id')) || (poster && poster.getAttribute('data-yt-poster')) || '';
  if (!vidId || !/^[a-zA-Z0-9_-]{6,}$/.test(vidId)) return;
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(vidId)}`;
  const pop = window.open(watchUrl, 'PPTStudioYouTubePlayer', 'width=1080,height=660,resizable=yes,scrollbars=yes');
  if (!pop) {
    const a = document.createElement('a');
    a.href = watchUrl; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.click();
  }
}

function hydrateYouTubeEmbedsForProtocol(rootNode) {
  const root = rootNode || document;
  const isLocal = typeof isLocalFileProtocol === 'function' ? isLocalFileProtocol() : (window.location.protocol === 'file:');
  root.querySelectorAll('.ppt-embed-widget').forEach(widget => {
    let vidId = widget.getAttribute('data-yt-vid-id') || '';
    if (!vidId) {
      const ifr = widget.querySelector('iframe[src]');
      if (ifr) vidId = extractYouTubeVideoId(ifr.getAttribute('src') || '');
      if (vidId) widget.setAttribute('data-yt-vid-id', vidId);
    }
    if (!vidId) return;
    if (isLocal) {
      const ifr = widget.querySelector('iframe');
      const existingPoster = widget.querySelector('.yt-poster-card');
      if (ifr && !existingPoster) {
        const wrap = document.createElement('div');
        wrap.innerHTML = buildYouTubePosterCardHtml(vidId);
        if (wrap.firstElementChild) ifr.replaceWith(wrap.firstElementChild);
      } else if (existingPoster && existingPoster.querySelector('[data-on-click*="forceLoadYouTubeIframe"]')) {
        const wrap = document.createElement('div');
        wrap.innerHTML = buildYouTubePosterCardHtml(vidId);
        if (wrap.firstElementChild) existingPoster.replaceWith(wrap.firstElementChild);
      }
    } else {
      const poster = widget.querySelector('.yt-poster-card');
      if (poster && !widget.querySelector('iframe')) {
        const wrap = document.createElement('div');
        wrap.innerHTML = buildYouTubeIframeHtml(vidId);
        if (wrap.firstElementChild) poster.replaceWith(wrap.firstElementChild);
      } else {
        const ifr = widget.querySelector('iframe');
        if (ifr) {
          ifr.removeAttribute('sandbox');
          ifr.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
          const desired = buildYouTubeEmbedSrc(vidId);
          if ((ifr.getAttribute('src') || '') !== desired) ifr.setAttribute('src', desired);
        }
      }
    }
  });
}

function insertWebEmbedWidget(explicitUrl) {
  if (!(typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive()) && typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const inp = $studio('webEmbedUrlInput'), raw = explicitUrl !== undefined ? explicitUrl : (inp ? inp.value : '');
  const embedSrc = normalizeEmbedUrl(raw);
  if (!embedSrc) { showToast('유효한 HTTPS 웹 주소 또는 유튜브·비메오 URL을 입력해 주세요.'); return; }
  const ytId = extractYouTubeVideoId(raw || embedSrc);
  const isLocal = typeof isLocalFileProtocol === 'function' ? isLocalFileProtocol() : (window.location.protocol === 'file:');
  const safeSrc = escapeAttr(embedSrc);
  const watchUrl = escapeAttr(ytId ? `https://www.youtube.com/watch?v=${ytId}` : ((raw || embedSrc).trim().startsWith('http') ? (raw || embedSrc).trim() : embedSrc));
  const dragBarHtml = `<div class="embed-widget-drag-bar px-3 py-1 bg-ink text-white font-mono text-[10px] font-bold flex items-center justify-between gap-2 shrink-0 cursor-move"><span>${ytId ? '▶ YOUTUBE VIDEO' : '🌐 WEB / VIDEO EMBED'}</span><a href="${watchUrl}" target="_blank" rel="noopener noreferrer" data-on-click="event.stopPropagation()" class="px-2 py-0.5 rounded bg-gopro text-white text-[9px] font-bold no-underline shrink-0">↗ 새 탭 열기</a></div>`;

  let bodyEmbedHtml = '';
  if (ytId) {
    bodyEmbedHtml = isLocal ? buildYouTubePosterCardHtml(ytId) : buildYouTubeIframeHtml(ytId);
  } else {
    const isVimeo = /^https:\/\/player\.vimeo\.com\//i.test(embedSrc);
    const sandboxAttr = isVimeo ? '' : ' sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms"';
    bodyEmbedHtml = `<iframe src="${safeSrc}" data-safe-embed="true" referrerpolicy="strict-origin-when-cross-origin"${sandboxAttr} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy" class="w-full flex-1 border-0 bg-white"></iframe>`;
  }
  const innerHtml = dragBarHtml + bodyEmbedHtml;

  const targetCard = shouldInsertIntoSelectedCard();
  if (targetCard) {
    const obj = document.createElement('div'); obj.className = 'card-embedded-obj ppt-embed-widget my-2 shadow-sm'; obj.setAttribute('data-shape-type', 'embed');
    if (ytId) obj.setAttribute('data-yt-vid-id', ytId);
    obj.style.width = '100%'; obj.style.height = '240px'; obj.style.padding = '0px'; obj.innerHTML = innerHtml;
    targetCard.appendChild(obj); selectElementForInspector(obj); refreshLayerList(); saveHistorySnapshot('웹/유튜브 임베드 삽입');
    if (ytId && isLocal) showToast('로컬(file://) 환경에서는 클릭 시 팝업으로 안전 재생되는 YouTube 카드로 삽입됩니다. (웹 배포 시 인라인 자동 전환)');
    return;
  }
  const activeSlideEl = slides[currentSlide - 1]; if (!activeSlideEl) return;
  ensureFreeLayersOnAllSlides();
  const layer = activeSlideEl.querySelector('.ppt-free-layer'), obj = document.createElement('div');
  obj.className = 'ppt-free-obj ppt-embed-widget shadow-lg'; obj.setAttribute('data-shape-type', 'embed');
  if (ytId) obj.setAttribute('data-yt-vid-id', ytId);
  obj.style.left = '24%'; obj.style.top = '18%'; obj.style.width = '50%'; obj.style.height = '52%'; obj.style.padding = '0px';
  obj.style.zIndex = String(layer.children.length + 24); obj.innerHTML = innerHtml;
  layer.appendChild(obj); selectElementForInspector(obj); refreshLayerList(); saveHistorySnapshot('웹/유튜브 임베드 삽입');
  if (ytId && isLocal) showToast('로컬(file://) 환경에서는 클릭 시 팝업으로 안전 재생되는 YouTube 카드로 삽입됩니다. (웹 배포 시 인라인 자동 전환)');
}

function insertDirectImageFile(file) {
  if (!(typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive()) && typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const dataUrl = ev.target.result;
    const probe = new Image();
    probe.onload = () => {
      const maxDim = 1600;
      let w = probe.width, h = probe.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
        else { w = Math.round((w * maxDim) / h); h = maxDim; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(probe, 0, 0, w, h);
      const preserveAlpha = /^(?:image\/png|image\/webp|image\/gif)$/i.test(file.type || ''); const resizedDataUrl = canvas.toDataURL(preserveAlpha ? 'image/png' : 'image/jpeg', 0.9);

      const targetCard = typeof shouldInsertIntoSelectedCard === 'function' ? shouldInsertIntoSelectedCard() : null;
      if (targetCard) {
        const obj = document.createElement('div');
        obj.className = 'card-embedded-obj my-2 shadow-sm overflow-hidden rounded-xl border border-borderline';
        obj.setAttribute('data-shape-type', 'image');
        obj.style.width = '100%'; obj.style.height = 'auto';
        obj.innerHTML = `<img src="${resizedDataUrl}" data-img-nat-w="${w}" data-img-nat-h="${h}" class="w-full h-auto object-contain block" alt="첨부 이미지">`;
        targetCard.appendChild(obj);
        selectElementForInspector(obj);
        refreshLayerList();
        saveHistorySnapshot('카드 내 이미지 직접 삽입');
        return;
      }

      const activeSlideEl = slides[currentSlide - 1];
      if (!activeSlideEl) return;
      ensureFreeLayersOnAllSlides();
      const layer = activeSlideEl.querySelector('.ppt-free-layer');
      const slideRect = activeSlideEl.getBoundingClientRect();
      const safeSW = slideRect.width > 0 ? slideRect.width : (LOGICAL_STAGE_WIDTH || 1440);
      const safeSH = slideRect.height > 0 ? slideRect.height : (LOGICAL_STAGE_HEIGHT || 810);
      const targetWidthPx = Math.min(safeSW * 0.45, Math.max(200, w));
      const targetHeightPx = targetWidthPx * (h / Math.max(1, w));
      const widthPct = Math.max(8, Math.min(85, (targetWidthPx / safeSW) * 100));
      const heightPct = Math.max(8, Math.min(85, (targetHeightPx / safeSH) * 100));

      const obj = document.createElement('div');
      obj.className = 'ppt-free-obj shadow-lg overflow-hidden rounded-xl border border-borderline bg-white';
      obj.setAttribute('data-shape-type', 'image');
      obj.style.left = '26%'; obj.style.top = '22%';
      obj.style.width = widthPct.toFixed(2) + '%';
      obj.style.height = heightPct.toFixed(2) + '%';
      obj.style.zIndex = String(layer.children.length + 24);
      obj.innerHTML = `<img src="${resizedDataUrl}" data-img-nat-w="${w}" data-img-nat-h="${h}" class="w-full h-full object-contain block" alt="자유 배치 이미지">`;

      layer.appendChild(obj);
      selectElementForInspector(obj);
      if (typeof refreshLayerList === 'function') refreshLayerList();
      saveHistorySnapshot('자유 이미지 직접 삽입');
    };
    probe.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

function loadDeferredEmbedIframe(btn) {
  const consentBox = btn ? btn.closest('.deferred-embed-consent') : null;
  const wrap = consentBox ? consentBox.parentElement : null;
  const ifr = wrap ? wrap.querySelector('iframe[data-deferred-embed-src]') : null;
  if (!ifr) return;
  const deferredUrl = (ifr.getAttribute('data-deferred-embed-src') || '').trim();
  if (!/^https:\/\//i.test(deferredUrl)) return;
  ifr.setAttribute('src', deferredUrl);
  ifr.removeAttribute('data-deferred-embed-src');
  ifr.classList.remove('hidden');
  if (consentBox) consentBox.remove();
  showToast('사용자 승인으로 외부 임베드 콘텐츠를 로드했습니다.');
}
