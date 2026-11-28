/* ==================== PRESENTER VIEW, SPEAKER NOTES, BLACKOUT, LASER & SCREEN DRAW (v5.5.2 Modularized) ==================== */
function updateCurrentSlideSpeakerNotes(val, isLiveInput) {
  const activeSlideEl = slides[currentSlide - 1]; if (!activeSlideEl) return;
  const cleaned = String(val || '').replace(/[<>]/g, '').slice(0, 4000);
  if (cleaned.trim()) activeSlideEl.setAttribute('data-speaker-notes', cleaned); else activeSlideEl.removeAttribute('data-speaker-notes');
  syncPresenterWindowState(); if (!isLiveInput) saveHistorySnapshot('발표자 노트 수정');
}
function syncSpeakerNotesUI() { const activeSlideEl = slides[currentSlide - 1], ta = $studio('speakerNotesTextarea'); if (ta) ta.value = activeSlideEl ? (activeSlideEl.getAttribute('data-speaker-notes') || '') : ''; }
function cloneSlideForPresenterPreview(srcSlideEl, targetDoc, isNextPreview) {
  if (!srcSlideEl || !targetDoc) return null;
  const cloned = targetDoc.importNode(srcSlideEl, true);
  cloned.removeAttribute('id');
  cloned.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
  cloned.querySelectorAll('[contenteditable]').forEach(n => n.removeAttribute('contenteditable'));
  cloned.querySelectorAll('.card-edit-controls, .img-edit-overlay, .sub-box-del-btn, .card-media-controls, .table-col-resizer, .table-row-resizer, .embed-widget-drag-bar, .iw-edit-bar, .ppt-persistent-guide, .yt-local-hint-bar, .ppt-slide-comment-badge').forEach(n => n.remove());
  cloned.querySelectorAll('.ppt-multi-selected, .is-selected, .anim-preview-playing').forEach(n => n.classList.remove('ppt-multi-selected', 'is-selected', 'anim-preview-playing'));
  if (isNextPreview) {
    cloned.querySelectorAll('.build-step-pending, .build-step-revealed').forEach(n => n.classList.remove('build-step-pending', 'build-step-revealed'));
  }
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
  const cleanupPresenterPopup = () => {
    try { w.clearInterval(timerInterval); } catch (e) {}
    if (presenterPopupWin === w) presenterPopupWin = null;
  };
  w.addEventListener('beforeunload', cleanupPresenterPopup, { once: true });
  w.addEventListener('pagehide', cleanupPresenterPopup, { once: true });
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

  const mountVisual = (boxId, srcSlideEl, emptyText, isNextPreview) => {
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
    const previewSlide = cloneSlideForPresenterPreview(srcSlideEl, doc, Boolean(isNextPreview));
    if (previewSlide) holder.appendChild(previewSlide);
    box.appendChild(holder);
  };

  mountVisual('pvCurrentVisualBox', curSlideEl, '(슬라이드 없음)', false);
  mountVisual('pvNextVisualBox', nextSlideEl, '마지막 슬라이드입니다 (END)', true);
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
let isLaserPointerEnabled = false, __laserMoveHandler = null, __laserTouchHandler = null;
function toggleLaserPointer(forceState) {
  const nextState = forceState !== undefined ? Boolean(forceState) : !isLaserPointerEnabled; isLaserPointerEnabled = nextState;
  let dot = document.getElementById('pptLaserDot');
  if (nextState) {
    if (!dot) { dot = document.createElement('div'); dot.id = 'pptLaserDot'; document.body.appendChild(dot); }
    dot.classList.remove('hidden');
    if (!__laserMoveHandler) {
      __laserMoveHandler = (e) => { const d = document.getElementById('pptLaserDot'); if (d) { d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; } };
      document.addEventListener('mousemove', __laserMoveHandler);
    }
    if (!__laserTouchHandler) {
      __laserTouchHandler = (e) => { const t = e.touches && e.touches[0]; const d = document.getElementById('pptLaserDot'); if (t && d) { d.style.left = t.clientX + 'px'; d.style.top = t.clientY + 'px'; } };
      document.addEventListener('touchmove', __laserTouchHandler, { passive: true });
    }
  } else {
    if (dot) dot.classList.add('hidden');
    if (__laserMoveHandler) { document.removeEventListener('mousemove', __laserMoveHandler); __laserMoveHandler = null; }
    if (__laserTouchHandler) { document.removeEventListener('touchmove', __laserTouchHandler); __laserTouchHandler = null; }
  }
}
let isScreenDrawMode = false, activeScreenDrawColor = '#EF4444';
function toggleScreenDrawMode(forceState) {
  const nextState = forceState !== undefined ? Boolean(forceState) : !isScreenDrawMode; isScreenDrawMode = nextState;
  const canvas = document.getElementById('pptDrawCanvas'), toolbar = document.getElementById('pptDrawToolbar');
  if (!canvas) return;
  if (nextState) {
    if ((typeof isActiveEditing === 'function' ? isActiveEditing() : isEditMode) && typeof toggleEditMode === 'function') toggleEditMode(false);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    canvas.style.touchAction = 'none';
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas.classList.remove('hidden');
    if (toolbar) toolbar.classList.remove('hidden');
    bindScreenDrawCanvas(canvas);
  } else {
    canvas.classList.add('hidden');
    if (toolbar) toolbar.classList.add('hidden');
  }
}
function setScreenDrawColor(hex) { activeScreenDrawColor = hex || '#EF4444'; }
function clearScreenDrawing(silent) {
  const c = document.getElementById('pptDrawCanvas');
  if (c) {
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.restore();
    }
  }
}
function bindScreenDrawCanvas(canvas) {
  if (canvas.dataset.bound === 'true') return; canvas.dataset.bound = 'true'; let drawing = false; const ctx = canvas.getContext('2d');
  const startAt = (x, y) => {
    drawing = true;
    ctx.strokeStyle = activeScreenDrawColor;
    ctx.lineWidth = activeScreenDrawColor === '#FFE600' ? 14 : 4;
    ctx.globalAlpha = activeScreenDrawColor === '#FFE600' ? 0.45 : 0.95;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  canvas.addEventListener('mousedown', (e) => { if (!isScreenDrawMode) return; startAt(e.clientX, e.clientY); });
  canvas.addEventListener('mousemove', (e) => { if (!drawing || !isScreenDrawMode) return; ctx.lineTo(e.clientX, e.clientY); ctx.stroke(); });
  const stopDraw = () => { drawing = false; };
  canvas.addEventListener('mouseup', stopDraw);
  canvas.addEventListener('mouseleave', stopDraw);
  canvas.addEventListener('touchstart', (e) => { if (!isScreenDrawMode || !e.touches[0]) return; e.preventDefault(); startAt(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
  canvas.addEventListener('touchmove', (e) => { if (!drawing || !isScreenDrawMode || !e.touches[0]) return; e.preventDefault(); ctx.lineTo(e.touches[0].clientX, e.touches[0].clientY); ctx.stroke(); }, { passive: false });
  canvas.addEventListener('touchend', stopDraw);
  canvas.addEventListener('touchcancel', stopDraw);
}
