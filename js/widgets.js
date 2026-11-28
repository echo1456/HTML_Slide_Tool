/* ==================== v4.8.0: INTERACTIVE HTML WIDGETS ENGINE (BEFORE/AFTER, HOTSPOT, TABS, 3D FLIP) ==================== */
const IW_DEMO_BEFORE_SVG = "data:image/png;base64,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";
const IW_DEMO_AFTER_SVG = "data:image/png;base64,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";
const IW_DEMO_HOTSPOT_SVG = "data:image/png;base64,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";

function compressImageFileToDataUrl(file, maxDim, onDone) {
  if (!file || typeof onDone !== 'function') return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const probe = new Image();
    probe.onload = () => {
      const limit = Math.max(320, Number(maxDim) || 1400);
      let w = probe.width, h = probe.height;
      if (w > limit || h > limit) {
        if (w > h) { h = Math.round((h * limit) / w); w = limit; }
        else { w = Math.round((w * limit) / h); h = limit; }
      }
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      ctx.drawImage(probe, 0, 0, w, h);
      const lowType = (file.type || '').toLowerCase();
      const preserveAlpha = lowType === 'image/png' || lowType === 'image/webp' || lowType === 'image/gif';
      const outMime = preserveAlpha ? 'image/png' : 'image/jpeg';
      onDone(c.toDataURL(outMime, 0.88), w, h);
    };
    probe.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function buildBeforeAfterWidgetHtml() {
  const ed = isEditMode ? 'data-editable contenteditable="true"' : 'data-editable';
  return `
    <div class="iw-edit-bar">
      <span>⇄ BEFORE / AFTER SLIDER</span>
      <div class="flex items-center gap-1">
        <button type="button" data-on-click="event.stopPropagation(); uploadBeforeAfterImage(this, 'before')">Before 사진</button>
        <button type="button" data-on-click="event.stopPropagation(); uploadBeforeAfterImage(this, 'after')">After 사진</button>
        <button type="button" data-on-click="event.stopPropagation(); resetBeforeAfterSplit(this)">50:50</button>
        <button type="button" class="iw-embed-card-btn" data-on-click="event.stopPropagation(); embedWidgetIntoCard(this)">카드로 넣기</button>
      </div>
    </div>
    <div class="iw-ba-stage" style="--ba-pos: 50%;" data-ba-pos="50">
      <img src="${IW_DEMO_AFTER_SVG}" class="iw-ba-img iw-ba-after-img" alt="After">
      <div class="iw-ba-before-clip">
        <img src="${IW_DEMO_BEFORE_SVG}" class="iw-ba-img iw-ba-before-img" alt="Before">
      </div>
      <span ${ed} class="iw-ba-badge iw-ba-badge-before">BEFORE</span>
      <span ${ed} class="iw-ba-badge iw-ba-badge-after">AFTER</span>
      <div class="iw-ba-divider"></div>
    </div>
  `;
}

function buildHotspotPinHtml(num, xPct, yPct, title, desc, isOpen) {
  const ed = isEditMode ? 'data-editable contenteditable="true"' : 'data-editable';
  const popSide = xPct > 55 ? 'left' : 'right';
  const popV = yPct > 58 ? 'top' : 'bottom';
  return `<div class="iw-hs-pin ${isOpen ? 'is-open' : ''}" data-pop-side="${popSide}" data-pop-v="${popV}" style="left: ${xPct}%; top: ${yPct}%;">
    <div class="iw-hs-dot">${num}</div>
    <div class="iw-hs-popover" data-on-click="event.stopPropagation()">
      <div ${ed} class="iw-hs-pop-title font-extrabold text-xs text-ink mb-1">${escapeAttr(title)}</div>
      <div ${ed} class="iw-hs-pop-desc text-[11px] text-muted leading-relaxed">${escapeAttr(desc)}</div>
    </div>
  </div>`;
}

function buildHotspotWidgetHtml() {
  const pins = [
    buildHotspotPinHtml(1, 30, 50, '01. 핵심 광학·엔진 모듈', '핀을 클릭하면 상세 스펙 말풍선이 열립니다. 편집 모드에서 핀을 드래그해 위치를 바꿀 수 있습니다.', false),
    buildHotspotPinHtml(2, 68, 35, '02. 고효율 프로세싱 유닛', '제품 사진이나 UI 화면을 업로드해 원하는 지점에 번호 핀을 자유롭게 추가하세요.', false),
    buildHotspotPinHtml(3, 66, 68, '03. 실시간 상태 모니터링', '발표 중 핀을 클릭하면 자동으로 화면 밖으로 잘리지 않는 방향으로 말풍선이 펼쳐집니다.', false)
  ].join('');
  return `
    <div class="iw-edit-bar">
      <span>◎ INTERACTIVE HOTSPOT</span>
      <div class="flex items-center gap-1">
        <button type="button" data-on-click="event.stopPropagation(); uploadHotspotBaseImage(this)">배경 사진</button>
        <button type="button" data-on-click="event.stopPropagation(); addHotspotPin(this)">+ 핀 추가</button>
        <button type="button" data-on-click="event.stopPropagation(); deleteActiveHotspotPin(this)">핀 삭제</button>
        <button type="button" class="iw-embed-card-btn" data-on-click="event.stopPropagation(); embedWidgetIntoCard(this)">카드로 넣기</button>
      </div>
    </div>
    <div class="iw-hs-stage">
      <img src="${IW_DEMO_HOTSPOT_SVG}" class="iw-hs-base-img" alt="Hotspot Diagram">
      ${pins}
    </div>
  `;
}

function buildTabbedCardWidgetHtml() {
  const ed = isEditMode ? 'data-editable contenteditable="true"' : 'data-editable';
  const tabs = [
    { label: '안 A · 핵심 전략', badge: 'OPTION 01', heading: '빠른 실행과 즉각적인 성과 확보', body: '초기 도입 비용을 최소화하고 핵심 타깃에 집중해 단기 전환율을 극대화하는 실행 전략입니다.', metric: '예상 ROI +145%' },
    { label: '안 B · 프리미엄', badge: 'OPTION 02', heading: '브랜드 가치와 장기 충성도 강화', body: '차별화된 사용자 경험과 고품질 콘텐츠 파이프라인을 구축해 시장 내 독보적 포지션을 확보합니다.', metric: '고객 유지율 92%' },
    { label: '안 C · 확장 모델', badge: 'OPTION 03', heading: '글로벌·다채널 파트너십 스케일업', body: '검증된 핵심 모델을 외부 채널과 API 생태계로 확장하여 지속 가능한 성장 동력을 마련합니다.', metric: '확장 시장 3.2배' }
  ];
  const btnsHtml = tabs.map((t, i) => `<div role="tab" tabindex="0" class="iw-tab-btn ${i === 0 ? 'is-active' : ''}" data-iw-tab-idx="${i}" data-on-click="event.stopPropagation(); switchIwTab(this, ${i})"><span ${ed}>${t.label}</span></div>`).join('');
  const panelsHtml = tabs.map((t, i) => `<div class="iw-tab-panel ${i === 0 ? 'is-active' : ''}" data-iw-panel-idx="${i}">
    <div>
      <span ${ed} class="font-mono text-[10px] font-extrabold text-gopro uppercase block mb-1">${t.badge}</span>
      <h4 ${ed} class="text-base md:text-lg font-extrabold text-ink mb-2">${t.heading}</h4>
      <p ${ed} class="text-xs md:text-sm text-muted leading-relaxed">${t.body}</p>
    </div>
    <div ${ed} class="pt-2 border-t border-borderline font-mono text-xs font-extrabold text-ink">${t.metric}</div>
  </div>`).join('');
  return `
    <div class="iw-edit-bar">
      <span>▤ TABBED CONTENT CARD</span>
      <div class="flex items-center gap-1">
        <button type="button" data-on-click="event.stopPropagation(); addIwTab(this)">+ 탭</button>
        <button type="button" data-on-click="event.stopPropagation(); uploadIwTabImage(this)">+ 사진</button>
        <button type="button" data-on-click="event.stopPropagation(); insertChartIntoIwTab(this)">+ 차트</button>
        <button type="button" data-on-click="event.stopPropagation(); removeActiveIwTab(this)">탭 삭제</button>
        <button type="button" class="iw-embed-card-btn" data-on-click="event.stopPropagation(); embedWidgetIntoCard(this)">카드로 넣기</button>
      </div>
    </div>
    <div class="iw-tabs-wrap">
      <div class="iw-tabs-header">${btnsHtml}</div>
      <div class="iw-tabs-panels">${panelsHtml}</div>
    </div>
  `;
}

function buildFlipCardWidgetHtml() {
  const ed = isEditMode ? 'data-editable contenteditable="true"' : 'data-editable';
  return `
    <div class="iw-edit-bar">
      <span>↻ 3D FLIP CARD</span>
      <div class="flex items-center gap-1">
        <button type="button" data-on-click="event.stopPropagation(); toggleIwFlipEditSide(this)">↻ 앞/뒷면</button>
        <button type="button" data-on-click="event.stopPropagation(); cycleIwFlipFaceTheme(this)">배경테마</button>
        <button type="button" data-on-click="event.stopPropagation(); uploadIwFlipFaceImage(this)">+ 사진</button>
        <button type="button" class="iw-embed-card-btn" data-on-click="event.stopPropagation(); embedWidgetIntoCard(this)">카드로 넣기</button>
      </div>
    </div>
    <div class="iw-flip-scene">
      <div class="iw-flip-inner">
        <div class="iw-flip-face iw-flip-front">
          <div class="flex items-center justify-between gap-2">
            <span ${ed} class="font-mono text-[10px] font-extrabold text-gopro uppercase">FRONT · 핵심 질문 / 지표</span>
            <span class="iw-flip-cue bg-gopro/10 text-gopro">↻ 클릭하여 뒤집기</span>
          </div>
          <div class="my-auto py-3">
            <h3 ${ed} class="text-2xl md:text-3xl font-black text-ink tracking-tight leading-tight">왜 HTML 슬라이드인가?</h3>
            <p ${ed} class="text-xs md:text-sm text-muted mt-2">카드를 클릭하면 3D로 뒤집히며 뒷면의 핵심 근거가 공개됩니다.</p>
          </div>
          <div ${ed} class="font-mono text-[10px] text-subtle">FRONT SIDE · CLICK TO REVEAL</div>
        </div>
        <div class="iw-flip-face iw-flip-back">
          <div class="flex items-center justify-between gap-2">
            <span ${ed} class="font-mono text-[10px] font-extrabold text-sky-300 uppercase">BACK · 상세 해설 &amp; 근거</span>
            <span class="iw-flip-cue bg-white/15 text-white">↺ 앞면으로</span>
          </div>
          <div class="my-auto py-2 space-y-2">
            <h4 ${ed} class="text-lg md:text-xl font-extrabold text-white">설치 0초 · 100% 살아있는 인터랙션</h4>
            <p ${ed} class="text-xs md:text-sm text-white/80 leading-relaxed">정적인 이미지로 굳어 버리는 PDF·PPT와 달리, 브라우저에서 직접 비교 슬라이더·핫스팟·라이브 차트·팝업 카드를 조작하며 청중의 몰입도를 극대화할 수 있습니다.</p>
          </div>
          <div ${ed} class="font-mono text-[10px] text-sky-300">BACK SIDE · EVIDENCE &amp; INSIGHT</div>
        </div>
      </div>
    </div>
  `;
}

function insertInteractiveWidget(explicitType, explicitTargetMode) {
  const _isFcTarget = typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive();
  if (!_isFcTarget && typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  const sel = $studio('interactiveWidgetTypeSelect') || document.getElementById('ctxInteractiveWidgetSelect');
  const wType = explicitType || (sel ? sel.value : 'before-after') || 'before-after';
  const targetSel = $studio('iwInsertTargetSelect');
  const targetMode = explicitTargetMode || (targetSel ? targetSel.value : 'auto') || 'auto';
  const activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return;

  let innerHtml = '';
  let label = '인터랙티브 위젯';
  let defaultSize = { w: '46%', h: '52%' };
  if (wType === 'before-after') {
    innerHtml = buildBeforeAfterWidgetHtml();
    label = 'Before / After 비교 슬라이더';
    defaultSize = { w: '48%', h: '54%' };
  } else if (wType === 'hotspot') {
    innerHtml = buildHotspotWidgetHtml();
    label = '이미지·다이어그램 핫스팟';
    defaultSize = { w: '50%', h: '56%' };
  } else if (wType === 'tabbed-card') {
    innerHtml = buildTabbedCardWidgetHtml();
    label = '슬라이드 내 탭 전환 카드';
    defaultSize = { w: '48%', h: '48%' };
  } else if (wType === 'flip-card') {
    innerHtml = buildFlipCardWidgetHtml();
    label = '3D 앞/뒷면 플립 카드';
    defaultSize = { w: '38%', h: '48%' };
  } else {
    return;
  }

  if (typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive()) {
    const fcEd = typeof getActiveFcPreviewCanvas === 'function' ? getActiveFcPreviewCanvas() : null;
    if (fcEd) {
      const obj = fcEd.ownerDocument.createElement('div');
      obj.className = 'card-embedded-obj ppt-interactive-widget fc-resizable-item my-3';
      obj.setAttribute('data-iw-type', wType);
      obj.setAttribute('contenteditable', 'false');
      obj.style.width = '100%';
      obj.style.height = '260px';
      obj.style.minHeight = '220px';
      obj.style.padding = '0';
      obj.innerHTML = innerHtml;
      fcEd.appendChild(obj);
      if (typeof makeFcBlockResizable === 'function') makeFcBlockResizable(obj);
      if (typeof selectElementForInspector === 'function') selectElementForInspector(obj, false);
      if (typeof recordFcSnapshot === 'function') recordFcSnapshot();
      showToast(`플로팅 카드 미리보기에 [${label}] 위젯이 삽입되었습니다!`);
      return;
    }
  }

  const selectedCard = typeof getTargetCardForHierarchy === 'function' ? getTargetCardForHierarchy() : null;
  let targetCard = null;
  if (targetMode === 'card') {
    targetCard = selectedCard || activeSlideEl.querySelector('.slide-card');
  } else if (targetMode === 'auto') {
    targetCard = selectedCard || (typeof shouldInsertIntoSelectedCard === 'function' ? shouldInsertIntoSelectedCard() : null);
  }
  let widgetEl;
  if (targetCard) {
    widgetEl = document.createElement('div');
    widgetEl.className = 'card-embedded-obj ppt-interactive-widget my-2';
    widgetEl.setAttribute('data-iw-type', wType);
    widgetEl.setAttribute('data-shape-type', 'interactive');
    widgetEl.style.width = '100%';
    widgetEl.style.height = wType === 'tabbed-card' ? '250px' : '280px';
    widgetEl.style.minHeight = wType === 'tabbed-card' ? '220px' : '240px';
    widgetEl.style.padding = '0';
    widgetEl.innerHTML = innerHtml;
    targetCard.appendChild(widgetEl);
  } else {
    if (typeof ensureFreeLayersOnAllSlides === 'function') ensureFreeLayersOnAllSlides();
    const layer = activeSlideEl.querySelector('.ppt-free-layer');
    if (!layer) return;
    const count = layer.querySelectorAll('.ppt-interactive-widget').length;
    widgetEl = document.createElement('div');
    widgetEl.className = 'ppt-free-obj ppt-interactive-widget shadow-lg';
    widgetEl.setAttribute('data-iw-type', wType);
    widgetEl.setAttribute('data-shape-type', 'interactive');
    widgetEl.style.left = `${22 + (count % 4) * 3}%`;
    widgetEl.style.top = `${18 + (count % 4) * 3}%`;
    widgetEl.style.width = defaultSize.w;
    widgetEl.style.height = defaultSize.h;
    widgetEl.style.zIndex = String(layer.children.length + 24);
    widgetEl.innerHTML = innerHtml;
    layer.appendChild(widgetEl);
  }

  selectElementForInspector(widgetEl);
  if (typeof refreshLayerList === 'function') refreshLayerList();
  saveHistorySnapshot(`${label} 삽입`);
  showToast(`${label}가 삽입되었습니다! 상단 [▶ 즉시 테스트]로 바로 체험해 보세요.`);
}

/* Before / After Helpers */
function recordWidgetChangeHistory(widgetOrChild, label) {
  const inFc = Boolean(
    (widgetOrChild && widgetOrChild.closest && widgetOrChild.closest('#fcRichBodyEditor')) ||
    (typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive())
  );
  if (inFc) {
    if (typeof recordFcSnapshot === 'function') recordFcSnapshot();
  } else if (typeof saveHistorySnapshot === 'function') {
    saveHistorySnapshot(label || '위젯 편집');
  }
}

function isWidgetMutationLocked(btnOrWidget) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return true;
  const widget = btnOrWidget ? (btnOrWidget.classList && btnOrWidget.classList.contains('ppt-interactive-widget') ? btnOrWidget : btnOrWidget.closest('.ppt-interactive-widget')) : null;
  if (widget && widget.getAttribute('data-layer-locked') === 'true') {
    showToast('잠긴 위젯은 편집할 수 없습니다. 배치·레이어 탭에서 잠금을 해제해 주세요.');
    return true;
  }
  return false;
}

function setBeforeAfterPosition(stageEl, pct) {
  if (!stageEl) return;
  let raw = Number(pct);
  if (isNaN(raw)) raw = 50;
  if (raw <= 0.8) raw = 0;
  else if (raw >= 99.2) raw = 100;
  const clamped = Math.max(0, Math.min(100, raw));
  const posStr = clamped.toFixed(2) + '%';
  const rightInset = (100 - clamped).toFixed(2) + '%';
  stageEl.style.setProperty('--ba-pos', posStr);
  stageEl.setAttribute('data-ba-pos', clamped.toFixed(1));
  const clipEl = stageEl.querySelector('.iw-ba-before-clip');
  if (clipEl) {
    clipEl.style.clipPath = `inset(0 ${rightInset} 0 0)`;
    clipEl.style.webkitClipPath = `inset(0 ${rightInset} 0 0)`;
  }
  const divEl = stageEl.querySelector('.iw-ba-divider');
  if (divEl) {
    divEl.style.left = posStr;
    divEl.style.opacity = (clamped <= 0.2 || clamped >= 99.8) ? '0' : '1';
  }
  const bBefore = stageEl.querySelector('.iw-ba-badge-before');
  const bAfter = stageEl.querySelector('.iw-ba-badge-after');
  if (bBefore) bBefore.style.opacity = clamped < 8 ? '0' : '1';
  if (bAfter) bAfter.style.opacity = clamped > 92 ? '0' : '1';
}

function embedWidgetIntoCard(btn) {
  if (isWidgetMutationLocked(btn)) return;
  const widget = btn ? btn.closest('.ppt-interactive-widget') : null;
  if (!widget) return;
  if (widget.closest('#fcRichBodyEditor')) {
    showToast('이미 플로팅 팝업 카드 내부에 배치된 위젯입니다.');
    return;
  }
  if ((widget.closest('.slide-card') || widget.closest('.ppt-free-obj[data-shape-type="freeCard"]')) && widget.classList.contains('card-embedded-obj')) {
    showToast('이미 카드 내부에 배치된 위젯입니다. ⤢ 자유분리로 꺼낼 수 있습니다.');
    return;
  }
  const activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return;
  const cards = Array.from(activeSlideEl.querySelectorAll('.slide-card, .ppt-free-obj[data-shape-type="freeCard"]')).filter(c => c !== widget && !c.contains(widget));
  if (cards.length === 0) {
    showToast('현재 슬라이드에 카드가 없습니다. 먼저 [+ 카드]로 카드를 추가해 주세요.');
    return;
  }
  // Pick card whose center is closest to the widget's center
  const wRect = widget.getBoundingClientRect();
  const wCx = wRect.left + wRect.width / 2, wCy = wRect.top + wRect.height / 2;
  let targetCard = cards[0];
  let bestDist = Infinity;
  cards.forEach(c => {
    const r = c.getBoundingClientRect();
    const d = Math.hypot((r.left + r.width / 2) - wCx, (r.top + r.height / 2) - wCy);
    if (d < bestDist) { bestDist = d; targetCard = c; }
  });
  widget.classList.remove('ppt-free-obj', 'shadow-lg');
  widget.classList.add('card-embedded-obj', 'my-2');
  widget.style.position = 'relative';
  widget.style.left = '';
  widget.style.top = '';
  widget.style.zIndex = '';
  widget.style.width = '100%';
  widget.style.height = '280px';
  widget.style.minHeight = '220px';
  widget.style.padding = '0';
  targetCard.appendChild(widget);
  selectElementForInspector(widget);
  if (typeof refreshLayerList === 'function') refreshLayerList();
  saveHistorySnapshot('위젯 카드 내부 배치');
  showToast('위젯이 카드 내부로 배치되었습니다! 핸들로 높이를 자유롭게 조절할 수 있습니다.');
}
function resetBeforeAfterSplit(btn) {
  if (isWidgetMutationLocked(btn)) return;
  const widget = btn ? btn.closest('.ppt-interactive-widget') : null;
  const stage = widget ? widget.querySelector('.iw-ba-stage') : null;
  if (!stage) return;
  setBeforeAfterPosition(stage, 50);
  recordWidgetChangeHistory(stage, 'Before/After 50:50 초기화');
}
function uploadBeforeAfterImage(btn, side) {
  if (isWidgetMutationLocked(btn)) return;
  const widget = btn ? btn.closest('.ppt-interactive-widget') : null;
  if (!widget) return;
  const imgTarget = widget.querySelector(side === 'before' ? '.iw-ba-before-img' : '.iw-ba-after-img');
  if (!imgTarget) return;
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.onchange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    compressImageFileToDataUrl(file, 1400, (dataUrl) => {
      imgTarget.src = dataUrl;
      recordWidgetChangeHistory(stage, `Before/After ${side === 'before' ? 'Before' : 'After'} 이미지 교체`);
      showToast(`${side === 'before' ? 'Before' : 'After'} 이미지가 적용되었습니다.`);
    });
  };
  inp.click();
}

/* Hotspot Helpers */
function syncHotspotPinPopoverSide(pinEl) {
  if (!pinEl) return;
  const x = parseFloat(pinEl.style.left) || 50;
  const y = parseFloat(pinEl.style.top) || 50;
  pinEl.setAttribute('data-pop-side', x > 55 ? 'left' : 'right');
  pinEl.setAttribute('data-pop-v', y > 58 ? 'top' : 'bottom');
}
function renumberHotspotPins(stageEl) {
  if (!stageEl) return;
  stageEl.querySelectorAll('.iw-hs-pin').forEach((p, idx) => {
    const dot = p.querySelector('.iw-hs-dot');
    if (dot) dot.textContent = String(idx + 1);
  });
}
function uploadHotspotBaseImage(btn) {
  if (isWidgetMutationLocked(btn)) return;
  const widget = btn ? btn.closest('.ppt-interactive-widget') : null;
  const imgTarget = widget ? widget.querySelector('.iw-hs-base-img') : null;
  if (!imgTarget) return;
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.onchange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    compressImageFileToDataUrl(file, 1400, (dataUrl) => {
      imgTarget.src = dataUrl;
      recordWidgetChangeHistory(stage, '핫스팟 배경 이미지 변경');
      showToast('핫스팟 배경 이미지가 교체되었습니다.');
    });
  };
  inp.click();
}
function addHotspotPin(btn, xPct, yPct) {
  if (isWidgetMutationLocked(btn)) return;
  const widget = btn ? btn.closest('.ppt-interactive-widget') : null;
  const stage = widget ? widget.querySelector('.iw-hs-stage') : null;
  if (!stage) return;
  const existing = stage.querySelectorAll('.iw-hs-pin');
  const nextNum = existing.length + 1;
  const px = typeof xPct === 'number' ? xPct : Math.min(82, 24 + ((nextNum - 1) * 16) % 58);
  const py = typeof yPct === 'number' ? yPct : Math.min(78, 28 + ((nextNum - 1) * 14) % 48);
  existing.forEach(p => p.classList.remove('is-open'));
  const wrap = document.createElement('div');
  wrap.innerHTML = buildHotspotPinHtml(nextNum, px, py, `${String(nextNum).padStart(2, '0')}. 새 포인트 제목`, '여기에 해당 부위에 대한 핵심 설명을 입력하세요.', true);
  const pin = wrap.firstElementChild;
  if (pin) {
    stage.appendChild(pin);
    renumberHotspotPins(stage);
    recordWidgetChangeHistory(stage, '핫스팟 핀 추가');
    showToast(`핫스팟 핀 #${nextNum}이 추가되었습니다. 드래그하여 위치를 조절하세요.`);
  }
}
function deleteActiveHotspotPin(btn) {
  if (isWidgetMutationLocked(btn)) return;
  const widget = btn ? btn.closest('.ppt-interactive-widget') : null;
  const stage = widget ? widget.querySelector('.iw-hs-stage') : null;
  if (!stage) return;
  const pins = Array.from(stage.querySelectorAll('.iw-hs-pin'));
  if (pins.length <= 1) { showToast('최소 1개의 핫스팟 핀은 유지되어야 합니다.'); return; }
  const target = stage.querySelector('.iw-hs-pin.is-open') || pins[pins.length - 1];
  target.remove();
  renumberHotspotPins(stage);
  recordWidgetChangeHistory(stage, '핫스팟 핀 삭제');
  showToast('선택한 핫스팟 핀이 삭제되었습니다.');
}
function toggleHotspotPin(pinEl) {
  if (!pinEl) return;
  const stage = pinEl.closest('.iw-hs-stage');
  const willOpen = !pinEl.classList.contains('is-open');
  if (stage) stage.querySelectorAll('.iw-hs-pin').forEach(p => p.classList.remove('is-open'));
  if (willOpen) {
    syncHotspotPinPopoverSide(pinEl);
    pinEl.classList.add('is-open');
  }
}

/* Tabbed Card Helpers */
function switchIwTab(btn, tabIdx) {
  const widget = btn ? btn.closest('.ppt-interactive-widget') : null;
  if (!widget) return;
  const btns = Array.from(widget.querySelectorAll('.iw-tab-btn'));
  const panels = Array.from(widget.querySelectorAll('.iw-tab-panel'));
  const idx = typeof tabIdx === 'number' ? tabIdx : btns.indexOf(btn);
  if (idx < 0 || idx >= panels.length) return;
  btns.forEach((b, i) => b.classList.toggle('is-active', i === idx));
  panels.forEach((p, i) => p.classList.toggle('is-active', i === idx));
}
function addIwTab(btn) {
  if (isWidgetMutationLocked(btn)) return;
  const widget = btn ? btn.closest('.ppt-interactive-widget') : null;
  if (!widget) return;
  const hdr = widget.querySelector('.iw-tabs-header');
  const body = widget.querySelector('.iw-tabs-panels');
  if (!hdr || !body) return;
  const nextIdx = hdr.querySelectorAll('.iw-tab-btn').length;
  if (nextIdx >= 6) { showToast('탭은 최대 6개까지 추가할 수 있습니다.'); return; }
  const ed = isEditMode ? 'data-editable contenteditable="true"' : 'data-editable';
  const newBtn = document.createElement('div');
  newBtn.setAttribute('role', 'tab');
  newBtn.setAttribute('tabindex', '0');
  newBtn.className = 'iw-tab-btn';
  newBtn.setAttribute('data-iw-tab-idx', String(nextIdx));
  newBtn.setAttribute('data-on-click', `event.stopPropagation(); switchIwTab(this, ${nextIdx})`);
  newBtn.innerHTML = `<span ${ed}>탭 ${nextIdx + 1}</span>`;
  hdr.appendChild(newBtn);

  const newPanel = document.createElement('div');
  newPanel.className = 'iw-tab-panel';
  newPanel.setAttribute('data-iw-panel-idx', String(nextIdx));
  newPanel.innerHTML = `<div><span ${ed} class="font-mono text-[10px] font-extrabold text-gopro uppercase block mb-1">OPTION 0${nextIdx + 1}</span><h4 ${ed} class="text-base md:text-lg font-extrabold text-ink mb-2">새 탭 제목을 입력하세요</h4><p ${ed} class="text-xs md:text-sm text-muted leading-relaxed">이 탭을 클릭했을 때 보여줄 상세 설명을 작성하세요.</p></div><div ${ed} class="pt-2 border-t border-borderline font-mono text-xs font-extrabold text-ink">KEY METRIC</div>`;
  body.appendChild(newPanel);
  switchIwTab(newBtn, nextIdx);
  recordWidgetChangeHistory(widget, '탭 카드 탭 추가');
}
function removeActiveIwTab(btn) {
  if (isWidgetMutationLocked(btn)) return;
  const widget = btn ? btn.closest('.ppt-interactive-widget') : null;
  if (!widget) return;
  const hdr = widget.querySelector('.iw-tabs-header');
  const body = widget.querySelector('.iw-tabs-panels');
  if (!hdr || !body) return;
  const btns = Array.from(hdr.querySelectorAll('.iw-tab-btn'));
  const panels = Array.from(body.querySelectorAll('.iw-tab-panel'));
  if (btns.length <= 2) { showToast('탭 카드는 최소 2개의 탭을 유지해야 합니다.'); return; }
  const activeIdx = Math.max(0, btns.findIndex(b => b.classList.contains('is-active')));
  btns[activeIdx].remove();
  if (panels[activeIdx]) panels[activeIdx].remove();
  // Re-index remaining tabs
  const remBtns = Array.from(hdr.querySelectorAll('.iw-tab-btn'));
  const remPanels = Array.from(body.querySelectorAll('.iw-tab-panel'));
  remBtns.forEach((b, i) => {
    b.setAttribute('data-iw-tab-idx', String(i));
    b.removeAttribute('onclick');
    b.setAttribute('data-on-click', `event.stopPropagation(); switchIwTab(this, ${i})`);
  });
  remPanels.forEach((p, i) => p.setAttribute('data-iw-panel-idx', String(i)));
  switchIwTab(remBtns[0], 0);
  recordWidgetChangeHistory(widget, '탭 카드 탭 삭제');
}

/* 3D Flip Card Helpers */
function toggleIwFlipCard(sceneOrChild) {
  const scene = sceneOrChild ? (sceneOrChild.classList.contains('iw-flip-scene') ? sceneOrChild : sceneOrChild.closest('.iw-flip-scene')) : null;
  if (!scene) return;
  scene.classList.toggle('is-flipped');
}
function toggleIwFlipEditSide(btn) {
  const widget = btn ? btn.closest('.ppt-interactive-widget') : null;
  const scene = widget ? widget.querySelector('.iw-flip-scene') : null;
  if (!scene) return;
  const editingBack = scene.classList.toggle('is-editing-back');
  btn.textContent = editingBack ? '↺ 앞면 편집으로 돌아가기' : '↻ 뒷면 편집으로 전환';
  showToast(editingBack ? '3D 플립 카드의 [뒷면]을 편집 중입니다.' : '3D 플립 카드의 [앞면]을 편집 중입니다.');
}


function uploadIwTabImage(btn) {
  if (isWidgetMutationLocked(btn)) return;
  const widget = btn ? btn.closest('.ppt-interactive-widget') : null;
  const activePanel = widget ? widget.querySelector('.iw-tab-panel.is-active') : null;
  if (!activePanel) return;
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.onchange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    compressImageFileToDataUrl(file, 1200, (dataUrl) => {
      let imgEl = activePanel.querySelector('img.iw-panel-media');
      if (!imgEl) {
        imgEl = document.createElement('img');
        imgEl.className = 'iw-panel-media w-full rounded-lg object-cover my-2';
        imgEl.style.maxHeight = '140px';
        imgEl.alt = '탭 이미지';
        activePanel.insertBefore(imgEl, activePanel.firstChild);
      }
      imgEl.src = dataUrl;
      recordWidgetChangeHistory(widget, '탭 카드 이미지 삽입');
      showToast('현재 활성 탭에 이미지가 삽입되었습니다.');
    });
  };
  inp.click();
}

function insertChartIntoIwTab(btn) {
  if (isWidgetMutationLocked(btn)) return;
  const widget = btn ? btn.closest('.ppt-interactive-widget') : null;
  const activePanel = widget ? widget.querySelector('.iw-tab-panel.is-active') : null;
  if (!activePanel || typeof getDefaultChartData !== 'function' || typeof writeChartDataAndRender !== 'function') return;
  const existing = activePanel.querySelector('.ppt-chart-widget');
  if (existing) {
    existing.remove();
    recordWidgetChangeHistory(widget, '탭 내부 차트 제거');
    showToast('현재 탭 내부의 차트가 제거되었습니다.');
    return;
  }
  const cw = document.createElement('div');
  cw.className = 'ppt-chart-widget my-2';
  cw.setAttribute('data-chart-uid', 'chart_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6));
  const data = getDefaultChartData('bar-h');
  data.title = '탭 세부 데이터 비교';
  activePanel.appendChild(cw);
  writeChartDataAndRender(cw, data);
  recordWidgetChangeHistory(widget, '탭 내부 차트 삽입');
  showToast('현재 활성 탭 내부에 편집 가능한 라이브 차트가 삽입되었습니다!');
}

const IW_FLIP_THEMES = [
  { key: 'light', name: '화이트', bg: '#FFFFFF', fg: '#111111', border: '#E2E8F0', muted: '#4B5563' },
  { key: 'dark', name: '다크 네이비', bg: '#111827', fg: '#F9FAFB', border: '#1E293B', muted: '#CBD5E1' },
  { key: 'accent', name: '포인트 블루', bg: 'var(--accent-color, #0055FF)', fg: '#FFFFFF', border: 'transparent', muted: 'rgba(255,255,255,0.85)' },
  { key: 'warm', name: '에디토리얼 크림', bg: '#FFFBEB', fg: '#292524', border: '#FDE68A', muted: '#78350F' }
];

function cycleIwFlipFaceTheme(btn) {
  if (isWidgetMutationLocked(btn)) return;
  const widget = btn ? btn.closest('.ppt-interactive-widget') : null;
  const scene = widget ? widget.querySelector('.iw-flip-scene') : null;
  if (!scene) return;
  const isBack = scene.classList.contains('is-editing-back');
  const face = scene.querySelector(isBack ? '.iw-flip-back' : '.iw-flip-front');
  if (!face) return;
  const curKey = face.getAttribute('data-flip-theme') || (isBack ? 'dark' : 'light');
  const curIdx = IW_FLIP_THEMES.findIndex(t => t.key === curKey);
  const next = IW_FLIP_THEMES[(curIdx + 1) % IW_FLIP_THEMES.length];
  face.setAttribute('data-flip-theme', next.key);
  face.style.background = next.bg;
  face.style.color = next.fg;
  face.style.borderColor = next.border;
  face.querySelectorAll('h3, h4').forEach(h => { h.style.color = next.fg; });
  face.querySelectorAll('p').forEach(p => { p.style.color = next.muted; });
  recordWidgetChangeHistory(widget, `3D 플립 카드 ${isBack ? '뒷면' : '앞면'} 배경 변경 (${next.name})`);
  showToast(`3D 플립 카드 [${isBack ? '뒷면' : '앞면'}] 테마가 "${next.name}"으로 변경되었습니다.`);
}

function uploadIwFlipFaceImage(btn) {
  if (isWidgetMutationLocked(btn)) return;
  const widget = btn ? btn.closest('.ppt-interactive-widget') : null;
  const scene = widget ? widget.querySelector('.iw-flip-scene') : null;
  if (!scene) return;
  const isBack = scene.classList.contains('is-editing-back');
  const face = scene.querySelector(isBack ? '.iw-flip-back' : '.iw-flip-front');
  if (!face) return;
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.onchange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    compressImageFileToDataUrl(file, 1200, (dataUrl) => {
      let imgEl = face.querySelector('img.iw-flip-media');
      if (!imgEl) {
        imgEl = document.createElement('img');
        imgEl.className = 'iw-flip-media w-full rounded-lg object-cover my-2';
        imgEl.style.maxHeight = '120px';
        imgEl.alt = '플립 카드 이미지';
        const midBlock = face.children[1];
        if (midBlock) face.insertBefore(imgEl, midBlock);
        else face.appendChild(imgEl);
      }
      imgEl.src = dataUrl;
      recordWidgetChangeHistory(widget, `3D 플립 카드 ${isBack ? '뒷면' : '앞면'} 이미지 삽입`);
      showToast(`3D 플립 카드 [${isBack ? '뒷면' : '앞면'}]에 이미지가 삽입되었습니다.`);
    });
  };
  inp.click();
}

/* Interactive Affordance Hints Toggle */
function toggleInteractiveHints(checked) {
  const isOn = Boolean(checked);
  if (document.body) {
    if (isOn) document.body.removeAttribute('data-interactive-hints');
    else document.body.setAttribute('data-interactive-hints', 'off');
  }
  showToast(isOn ? '발표 중 인터랙션 클릭 단서(힌트)가 표시됩니다.' : '인터랙션 클릭 단서(힌트)를 숨겼습니다.');
}
