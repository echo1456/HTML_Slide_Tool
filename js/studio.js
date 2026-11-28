/* ==================== HYBRID DOCKED / FLOATING / DUAL-MONITOR HTML SLIDE TOOL (v4.6.1) ==================== */
const STUDIO_DOCK_MODE_STORAGE_KEY = 'ppt_studio_dock_mode_v1';
const STUDIO_DOCK_WIDTH_STORAGE_KEY = 'ppt_studio_docked_width_v1';
let studioDockMode = 'docked'; // 'docked' (default 3-pane) | 'floating'

function getFloatingStudioMinTopPx() {
  const hdr = document.getElementById('appTopHeader');
  if (hdr) {
    const cs = window.getComputedStyle(hdr);
    if (cs.display !== 'none' && cs.visibility !== 'hidden') {
      const r = hdr.getBoundingClientRect();
      if (r.height > 0 && r.bottom > 0) return Math.ceil(r.bottom) + 4;
    }
  }
  return 8;
}

function clampFloatingStudioToViewport() {
  if (studioPopupWin && !studioPopupWin.closed) return;
  const popup = document.getElementById('pptStudioPopup');
  if (!popup || !popup.classList.contains('studio-floating') || !popup.classList.contains('open')) return;
  const r = popup.getBoundingClientRect();
  if (r.width <= 0) return;
  const minT = getFloatingStudioMinTopPx();
  const maxL = Math.max(8, window.innerWidth - Math.min(r.width, window.innerWidth - 16) - 8);
  const maxT = Math.max(minT, window.innerHeight - 56);
  if (popup.style.left && popup.style.left !== 'auto') {
    const curL = parseFloat(popup.style.left) || 8;
    const curT = parseFloat(popup.style.top) || Math.max(106, minT);
    popup.style.left = Math.max(8, Math.min(maxL, curL)) + 'px';
    popup.style.top = Math.max(minT, Math.min(maxT, curT)) + 'px';
  }
}
window.addEventListener('resize', clampFloatingStudioToViewport);

function syncWorkspaceLayoutAfterStudioChange() {
  clampFloatingStudioToViewport();
  if (typeof updateStageViewportScale === 'function') updateStageViewportScale();
  if (typeof positionSelectionOverlay === 'function') positionSelectionOverlay();
  if (typeof updateSlideConnectors === 'function') updateSlideConnectors();
  requestAnimationFrame(() => {
    if (typeof updateStageViewportScale === 'function') updateStageViewportScale();
    if (typeof positionSelectionOverlay === 'function') positionSelectionOverlay();
  });
}

function getSavedStudioDockedWidth() {
  try {
    const raw = parseInt(localStorage.getItem(STUDIO_DOCK_WIDTH_STORAGE_KEY) || '', 10);
    if (!isNaN(raw) && raw >= 340 && raw <= 560) return raw;
  } catch (e) {}
  return window.innerWidth <= 1380 ? 368 : 396;
}

function updateStudioDockToggleButtonUI() {
  const btn = $studio('studioDockToggleBtn');
  if (!btn) return;
  const isDocked = studioDockMode === 'docked';
  btn.title = isDocked ? '플로팅 팝업 창으로 전환 (또는 타이틀 바를 드래그해 분리)' : '우측 고정 사이드바로 도킹';
  btn.setAttribute('aria-label', btn.title);
  btn.innerHTML = isDocked
    ? '<svg class="ui-ico ui-ico-only" viewBox="0 0 24 24"><rect width="14" height="14" x="8" y="8" rx="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>'
    : '<svg class="ui-ico ui-ico-only" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M15 3v18"></path></svg>';
}

function setStudioDockMode(mode, silent) {
  const nextMode = mode === 'floating' ? 'floating' : 'docked';
  studioDockMode = nextMode;
  try { localStorage.setItem(STUDIO_DOCK_MODE_STORAGE_KEY, nextMode); } catch (e) {}
  const popup = document.getElementById('pptStudioPopup');
  if (!popup) return;

  popup.classList.toggle('studio-docked', nextMode === 'docked');
  popup.classList.toggle('studio-floating', nextMode === 'floating');
  popup.classList.remove('minimized');

  const minBtn = $studio('studioMinimizeBtn');
  if (minBtn) minBtn.textContent = '—';

  if (nextMode === 'docked') {
    const shell = document.getElementById('pptWorkspaceShell');
    if (shell && popup.parentElement !== shell) shell.appendChild(popup);
    popup.style.position = '';
    popup.style.top = '';
    popup.style.right = '';
    popup.style.left = '';
    popup.style.height = '';
    popup.style.maxHeight = '';
    popup.style.width = `${getSavedStudioDockedWidth()}px`;
  } else {
    popup.style.position = '';
    popup.style.width = '416px';
    popup.style.height = 'auto';
    popup.style.maxHeight = 'calc(100vh - 158px)';
    if (!popup.style.left || popup.style.left === 'auto') {
      popup.style.right = '14px';
      popup.style.top = '106px';
    }
  }
  updateStudioDockToggleButtonUI();
  syncWorkspaceLayoutAfterStudioChange();
  if (!silent) {
    showToast(nextMode === 'docked'
      ? 'HTML Slide Tool이 우측 사이드바에 고정(도킹)되었습니다.'
      : 'HTML Slide Tool이 플로팅 팝업 모드로 전환되었습니다.');
  }
}

function toggleStudioDockMode() {
  if (studioPopupWin && !studioPopupWin.closed) {
    dockStudioBackToMain(false);
    return;
  }
  setStudioDockMode(studioDockMode === 'docked' ? 'floating' : 'docked', false);
}

function initStudioDockModePreference() {
  let preferred = 'docked';
  try {
    const saved = localStorage.getItem(STUDIO_DOCK_MODE_STORAGE_KEY);
    if (saved === 'floating' || saved === 'docked') preferred = saved;
  } catch (e) {}
  setStudioDockMode(preferred, true);
}

function openExternalStudioWindow(silentFallback) {
  const popupEl = document.getElementById('pptStudioPopup');
  if (!popupEl) return false;

  if (studioPopupWin && !studioPopupWin.closed) {
    studioPopupWin.focus();
    return true;
  }

  const win = window.open('', 'PPTStudioInspectorWin', 'width=460,height=840,left=60,top=60,resizable=yes,scrollbars=yes');
  if (!win) {
    if (!silentFallback) {
      showToast('브라우저 팝업 차단이 감지되어 페이지 내 스튜디오로 열렸습니다. 주소창 우측 팝업 허용 시 새 창으로 열립니다.');
    }
    return false;
  }

  studioPopupWin = win;
  win.document.open();
  win.document.write(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>✦ HTML SLIDE TOOL — 듀얼 모니터 컨트롤러</title>
  <style>
    :root { --accent-color: #0055FF; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #F5F5F7;
      color: #111111;
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Malgun Gothic', sans-serif;
      overflow: hidden;
    }
    #pptStudioPopup {
      position: static !important;
      width: 100% !important;
      max-width: 100% !important;
      height: 100vh !important;
      max-height: 100vh !important;
      display: flex !important;
      flex-direction: column !important;
      border-radius: 0 !important;
      border: none !important;
      box-shadow: none !important;
      background: #FFFFFF !important;
      color: #111111 !important;
    }
    #studioDockToggleBtn { display: none !important; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 9999px; }
  </style>
</head>
<body></body>
</html>`);
  win.document.close();

  const targetBody = win.document.body || win.document.documentElement;
  const adopted = win.document.adoptNode(popupEl);
  adopted.classList.remove('minimized');


  const popBtn = adopted.querySelector('#popoutStudioBtn');
  if (popBtn) {
    popBtn.textContent = '↙ 메인 복귀';
    popBtn.setAttribute('data-on-click', 'dockStudioBackToMain()');
  }

  targetBody.appendChild(adopted);
  if (typeof initDeclarativeEventSystem === 'function') initDeclarativeEventSystem(win.document, window);
  if (typeof cloneDocumentStylesToPopup === 'function') cloneDocumentStylesToPopup(win);
  ['--accent-color', '--header-bg', '--header-fg', '--footer-bg', '--footer-fg'].forEach(v => {
    const val = document.documentElement.style.getPropertyValue(v);
    if (val) win.document.documentElement.style.setProperty(v, val);
  });
  if (typeof bindHistoryCoalesceListeners === 'function') bindHistoryCoalesceListeners(win.document);
  win.document.addEventListener('keydown', (ke) => {
    const t = win.document.activeElement;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
    const mod = ke.ctrlKey || ke.metaKey;
    if (!mod) return;
    if (ke.code === 'KeyZ' && !ke.shiftKey) {
      ke.preventDefault();
      if (typeof flushDeferredHistoryNow === 'function') flushDeferredHistoryNow();
      undoAction();
    } else if (ke.code === 'KeyY' || (ke.code === 'KeyZ' && ke.shiftKey)) {
      ke.preventDefault();
      if (typeof flushDeferredHistoryNow === 'function') flushDeferredHistoryNow();
      redoAction();
    } else if (ke.code === 'KeyC' && (selectedElements.length > 0 || selectedElement)) {
      ke.preventDefault();
      copySelectedElements();
    } else if (ke.code === 'KeyV' && Array.isArray(window.__pptElementClipboard) && window.__pptElementClipboard.length > 0) {
      ke.preventDefault();
      pasteCopiedElements();
    }
  });
  let studioDockedOnce = false;
  const dockOnce = () => {
    if (studioDockedOnce) return;
    studioDockedOnce = true;
    dockStudioBackToMain(true);
  };
  win.addEventListener('beforeunload', dockOnce);
  win.addEventListener('pagehide', dockOnce);

  syncWorkspaceLayoutAfterStudioChange();
  if (!silentFallback) {
    showToast('HTML Slide Tool이 별도 브라우저 창으로 분리되었습니다. 보조 모니터로 이동하세요!');
  }
  return true;
}

function bindStudioPopupDrag() {
  const popup = $studio('pptStudioPopup');
  const header = $studio('pptStudioDragHeader');
  if (!popup || !header) return;

  header.addEventListener('mousedown', (e) => {
    if (studioPopupWin && !studioPopupWin.closed) return;
    if (e.target.closest('button')) return;
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const initRect = popup.getBoundingClientRect();
    const wasDocked = popup.classList.contains('studio-docked');
    let offsetX = startX - initRect.left;
    let offsetY = startY - initRect.top;
    let isDraggingFloat = !wasDocked;

    if (isDraggingFloat) {
      popup.style.right = 'auto';
      popup.style.left = initRect.left + 'px';
      popup.style.top = initRect.top + 'px';
    }

    const onMove = (me) => {
      if (!isDraggingFloat) {
        if (Math.hypot(me.clientX - startX, me.clientY - startY) < 12) return;
        // Dragging the docked title bar >12px smoothly detaches into Floating Mode!
        isDraggingFloat = true;
        setStudioDockMode('floating', true);
        const fRect = popup.getBoundingClientRect();
        offsetX = Math.min(fRect.width - 40, Math.max(40, startX - initRect.left));
        offsetY = 18;
        popup.style.right = 'auto';
      }
      const nextL = Math.max(8, Math.min(window.innerWidth - popup.offsetWidth - 8, me.clientX - offsetX));
      const minT = getFloatingStudioMinTopPx();
      const nextT = Math.max(minT, Math.min(window.innerHeight - 48, me.clientY - offsetY));
      popup.style.left = nextL + 'px';
      popup.style.top = nextT + 'px';
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    startManagedDragSession(document, onMove, onUp);
  });
}

function dockStudioBackToMain(fromUnload) {
  if (!studioPopupWin) return;
  const win = studioPopupWin;
  studioPopupWin = null;
  try {
    const popupEl = win.document.getElementById('pptStudioPopup');
    if (popupEl) {
      const adoptedBack = document.adoptNode(popupEl);



      const popBtn = adoptedBack.querySelector('#popoutStudioBtn');
      if (popBtn) {
        popBtn.innerHTML = '<svg class="ui-ico" viewBox="0 0 24 24"><rect width="20" height="14" x="2" y="3" rx="2"></rect><path d="M8 21h8"></path><path d="M12 17v4"></path></svg>새 창';
        popBtn.setAttribute('data-on-click', 'openExternalStudioWindow()');
      }

      const shell = document.getElementById('pptWorkspaceShell');
      if (shell) shell.appendChild(adoptedBack);
      else {
        const header = document.querySelector('header');
        if (header) header.insertAdjacentElement('afterend', adoptedBack);
      }
      setStudioDockMode(studioDockMode, true);
    }
    if (!fromUnload && !win.closed) win.close();
  } catch (e) {}
  if (isEditMode) {
    const p = document.getElementById('pptStudioPopup');
    if (p) p.classList.add('open');
  }
  syncWorkspaceLayoutAfterStudioChange();
}

function switchStudioTab(tabKey) {
  const aliasMap = {
    slide: 'deck', layout: 'cards',
    text: 'design', cards: 'design', media: 'design', charts: 'design', bg: 'design',
    anim: 'motion'
  };
  const resolvedKey = aliasMap[tabKey] || tabKey;
  currentStudioTab = resolvedKey;
  const rootDoc = (studioPopupWin && !studioPopupWin.closed) ? studioPopupWin.document : document;
  rootDoc.querySelectorAll('.studio-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === resolvedKey);
  });
  rootDoc.querySelectorAll('.studio-tab-pane').forEach(pane => {
    pane.classList.toggle('hidden', pane.id !== 'studioTab-' + resolvedKey);
  });
  if (resolvedKey === 'arrange' && typeof refreshLayerList === 'function') {
    refreshLayerList();
  } else if (resolvedKey === 'design' && typeof syncChartInspectorUI === 'function') {
    syncChartInspectorUI();
  }
}

function toggleStudioMinimize() {
  const popup = $studio('pptStudioPopup');
  if (!popup) return;
  const isMin = popup.classList.toggle('minimized');
  const minBtn = $studio('studioMinimizeBtn');
  if (minBtn) {
    minBtn.textContent = isMin ? (popup.classList.contains('studio-docked') ? '◀' : '▢') : '—';
  }
  if (popup.classList.contains('studio-docked')) {
    syncWorkspaceLayoutAfterStudioChange();
  }
}

function toggleStudioCompactMode() {
  const popup = $studio('pptStudioPopup'); if (!popup) return;
  const isCompact = popup.classList.toggle('studio-compact-mode');
  const btn = $studio('studioCompactToggleBtn');
  if (btn) {
    const isEn = typeof currentUiLanguage !== 'undefined' && currentUiLanguage === 'en';
    btn.textContent = isCompact ? (isEn ? 'Full' : '전체') : (isEn ? 'Simple' : '간편');
    btn.classList.toggle('bg-gopro', isCompact);
  }
  if (!isCompact) popup.querySelectorAll('.compact-force-show').forEach(el => el.classList.remove('compact-force-show'));
  showToast(isCompact ? '간편 모드 ON — 핵심 편집 도구만 간결하게 표시합니다.' : '전체 전문가 도구 모드로 전환되었습니다.');
}

function toggleEditMode(forceState) {
  if (typeof cancelBuildSequencePreview === 'function') cancelBuildSequencePreview();
  isEditMode = typeof forceState === 'boolean' ? forceState : !isEditMode;
  document.body.classList.toggle('edit-mode', isEditMode);
  const popup = $studio('pptStudioPopup');

  if (isEditMode) {
    if (typeof autoPlayKioskTimer !== 'undefined' && autoPlayKioskTimer && typeof toggleAutoPlayKiosk === 'function') toggleAutoPlayKiosk();
    document.querySelectorAll('.build-step-pending, .build-step-revealed').forEach(el => el.classList.remove('build-step-pending', 'build-step-revealed'));
    if (typeof toggleScreenDrawMode === 'function' && typeof isScreenDrawMode !== 'undefined' && isScreenDrawMode) toggleScreenDrawMode(false);
    if (typeof toggleLaserPointer === 'function' && typeof isLaserPointerEnabled !== 'undefined' && isLaserPointerEnabled) toggleLaserPointer(false);
    ensureFreeLayersOnAllSlides(); makeAllTextEditable(true);
    if (studioPopupWin && !studioPopupWin.closed) {
      studioPopupWin.focus();
    } else if (popup) {
      popup.classList.add('open');
      setStudioDockMode(studioDockMode, true);
    }
    syncWorkspaceLayoutAfterStudioChange();
    showToast(studioDockMode === 'docked'
      ? 'HTML Slide Tool이 우측 패널로 열렸습니다. (상단 도킹/새 창 버튼으로 분리 가능)'
      : 'HTML Slide Tool이 플로팅 모드로 열렸습니다.');
  } else {
    if (isInteractiveTestMode) { isInteractiveTestMode = false; document.body.classList.remove('interactive-test-mode'); }
    makeAllTextEditable(false); clearSelectionInspector(); isFormatPainterActive = false; updateFormatPainterUI();
    document.querySelectorAll('.iw-flip-scene.is-editing-back').forEach(s => {
      s.classList.remove('is-editing-back');
      const w = s.closest('.ppt-interactive-widget');
      const flipBtn = w ? w.querySelector('button[data-on-click*="toggleIwFlipEditSide"]') : null;
      if (flipBtn) flipBtn.textContent = '↻ 뒷면 편집으로 전환';
    });
    const activeSlideEl = slides[currentSlide - 1]; if (activeSlideEl && typeof initSlideBuildSteps === 'function') initSlideBuildSteps(activeSlideEl);
    if (typeof closeFloatingCardEditor === 'function') closeFloatingCardEditor();
    if (studioPopupWin && !studioPopupWin.closed) dockStudioBackToMain(false);
    const dockedPopup = document.getElementById('pptStudioPopup'); if (dockedPopup) dockedPopup.classList.remove('open');
    syncWorkspaceLayoutAfterStudioChange();
    showToast('발표 모드로 전환되었습니다.');
  }
}

/* ==================== RESIZABLE STUDIO & FLOATING CARD POPUP WINDOWS ==================== */
function startResizablePanelDrag(e, panelId, dir) {
  e.preventDefault();
  e.stopPropagation();
  const doc = (panelId === 'pptStudioPopup' && studioPopupWin && !studioPopupWin.closed)
    ? studioPopupWin.document
    : ((panelId === 'fcEditorDialogPanel' && fcStudioPopupWin && !fcStudioPopupWin.closed) ? fcStudioPopupWin.document : document);
  const panel = doc.getElementById(panelId);
  if (!panel) return;
  if (panelId === 'fcEditorDialogPanel' && panel.classList.contains('fc-maximized') && (!fcStudioPopupWin || fcStudioPopupWin.closed)) return;

  const targetWin = doc.defaultView || window;
  const rect = panel.getBoundingClientRect();
  const startX = e.clientX;
  const startY = e.clientY;
  const initW = rect.width;
  const initH = rect.height;
  const initL = rect.left;
  const isDockedStudio = panelId === 'pptStudioPopup' && panel.classList.contains('studio-docked') && (!studioPopupWin || studioPopupWin.closed);

  if (panelId === 'pptStudioPopup' && !isDockedStudio && (!studioPopupWin || studioPopupWin.closed)) {
    panel.style.right = 'auto';
    panel.style.left = initL + 'px';
  }

  const onMove = (me) => {
    const dx = me.clientX - startX;
    const dy = me.clientY - startY;
    if (isDockedStudio) {
      if (dir.includes('w')) {
        const nextW = Math.max(340, Math.min(560, Math.round(initW - dx)));
        panel.style.width = nextW + 'px';
        try { localStorage.setItem(STUDIO_DOCK_WIDTH_STORAGE_KEY, String(nextW)); } catch (err) {}
        if (typeof updateStageViewportScale === 'function') updateStageViewportScale();
        if (typeof fitFloatingCardPanelToSafeWorkspace === 'function') fitFloatingCardPanelToSafeWorkspace('clamp');
        if (typeof positionSelectionOverlay === 'function') positionSelectionOverlay();
      }
      return;
    }
    const fcSafe = (panelId === 'fcEditorDialogPanel' && (!fcStudioPopupWin || fcStudioPopupWin.closed) && typeof getFloatingCardSafeWorkspaceRect === 'function')
      ? getFloatingCardSafeWorkspaceRect()
      : null;
    if (dir.includes('e')) {
      const maxW = fcSafe ? Math.max(340, fcSafe.right - rect.left) : (targetWin.innerWidth - 24);
      const nextW = Math.max(340, Math.min(maxW, Math.round(initW + dx)));
      panel.style.width = nextW + 'px';
    }
    if (dir.includes('w')) {
      const minL = fcSafe ? fcSafe.left : 8;
      const maxW = fcSafe ? Math.max(340, rect.right - minL) : (targetWin.innerWidth - 24);
      const nextW = Math.max(340, Math.min(maxW, Math.round(initW - dx)));
      const appliedDelta = initW - nextW;
      panel.style.width = nextW + 'px';
      if (panelId === 'pptStudioPopup' || panelId === 'fcEditorDialogPanel') {
        panel.style.left = Math.max(minL, Math.round(initL + appliedDelta)) + 'px';
      }
    }
    if (dir.includes('s')) {
      const maxH = fcSafe ? Math.max(260, fcSafe.bottom - rect.top) : (targetWin.innerHeight - 24);
      const nextH = Math.max(260, Math.min(maxH, Math.round(initH + dy)));
      panel.style.height = nextH + 'px';
      panel.style.maxHeight = fcSafe ? (fcSafe.height + 'px') : 'none';
    }
    if (fcSafe && typeof positionSelectionOverlay === 'function' && selectedElement && panel.contains(selectedElement)) {
      positionSelectionOverlay();
    }
  };

  window.__isResizingPanel = true;
  const onUp = () => {
    window.__isResizingPanel = false;
    window.__lastPanelResizeEnd = Date.now();
    doc.removeEventListener('mousemove', onMove);
    doc.removeEventListener('mouseup', onUp);
    if (isDockedStudio) syncWorkspaceLayoutAfterStudioChange();
  };

  startManagedDragSession(doc, onMove, onUp);
}

/* ==================== CONTEXT-AWARE COLLAPSIBLE ACCORDION SECTIONS (v4.6.0) ==================== */
function toggleStudioAccordion(headerOrBtn) {
  const sec = headerOrBtn ? headerOrBtn.closest('.studio-acc-sec') : null;
  if (!sec) return;
  sec.classList.toggle('is-collapsed');
}

function expandStudioAccordionSection(secKey, collapseSiblings) {
  const rootDoc = (studioPopupWin && !studioPopupWin.closed) ? studioPopupWin.document : document;
  const target = rootDoc.querySelector(`.studio-acc-sec[data-acc-sec="${secKey}"]`);
  if (!target) return;
  if (target.parentElement) {
    target.parentElement.querySelectorAll(':scope > .studio-acc-sec').forEach(sib => {
      sib.classList.toggle('compact-force-show', sib === target);
      if (collapseSiblings) sib.classList.toggle('is-collapsed', sib !== target);
    });
  }
  target.classList.remove('is-collapsed');
}

function toggleAllStudioAccordions() {
  const rootDoc = (studioPopupWin && !studioPopupWin.closed) ? studioPopupWin.document : document;
  const activePane = rootDoc.querySelector('.studio-tab-pane:not(.hidden)');
  if (!activePane) return;
  const secs = Array.from(activePane.querySelectorAll(':scope > .studio-acc-sec'));
  if (secs.length === 0) return;
  const anyCollapsed = secs.some(s => s.classList.contains('is-collapsed'));
  secs.forEach(s => s.classList.toggle('is-collapsed', !anyCollapsed));
  const btn = $studio('studioAccToggleAllBtn');
  if (btn) {
    const isEn = typeof currentUiLanguage !== 'undefined' && currentUiLanguage === 'en';
    btn.textContent = anyCollapsed ? (isEn ? 'Collapse All' : '모두 접기') : (isEn ? 'Expand All' : '모두 펼치기');
  }
}

/* ==================== BILINGUAL (KO / EN) UI LANGUAGE SWITCHER (v4.7.0) ==================== */
const UI_LANG_STORAGE_KEY = 'html_slide_tool_lang_v1';
let currentUiLanguage = 'ko';

const UI_I18N_DICT = {
  '빠른 삽입': 'Quick Insert',
  'T 텍스트(T)': 'T Text(T)',
  '+ 카드': '+ Card',
  '사진·영상': 'Media',
  '▢ 도형': '▢ Shape',
  '차트·표': 'Chart/Table',
  '화면비율:': 'Ratio:',
  '빈 캔버스 시작': 'Blank Deck',
  '찾기/바꾸기': 'Find/Replace',
  '▶ 즉시 테스트': '▶ Live Test',
  '✎ 편집 복귀 (Alt+P)': '✎ Back to Edit (Alt+P)',
  '+ 위젯': '+ Widget',
  '인터랙션 힌트 표시': 'Show Click Hints',
  '+ 카드에 위젯': '+ Card Widget',
  '시나리오': 'Scenarios',
  '로컬적용': 'Local Font',
  '현재 스타일 키트 저장': 'Save Brand Kit',
  '내 브랜드 키트 적용': 'Apply My Kit',
  'UI 언어 (Language)': 'UI Language',
  '댓글': 'Notes',
  '+ 슬라이드': '+ Slide',
  '복제': 'Dup',
  '삭제': 'Del',
  '◀ 이전': '◀ Prev',
  '다음 ▶': 'Next ▶',
  '☰ 목차': '☰ Index',
  '저장': 'Export',
  '새 창': 'Popout',
  '간편': 'Simple',
  '전체': 'Full',
  '디자인': 'Design',
  '모션·연동': 'Motion',
  '배치·레이어': 'Arrange',
  '슬라이드·덱': 'Deck',
  '선택 요소별 자동 탭 전환': 'Auto-focus active section',
  '모두 펼치기': 'Expand All',
  '모두 접기': 'Collapse All',
  '서식·효과 초기화': 'Reset Style',
  '1. 텍스트 · 문단 · 목록': '1. Typography & Lists',
  '2. 카드 · 도형 · 아이콘 & 외형': '2. Cards, Shapes & Icons',
  '3. 사진 크롭·보정 · 영상 · 오디오 · 임베드': '3. Media, Audio & Embeds',
  '4. 그래프 · 데이터 표 & CSV': '4. Charts, Tables & CSV',
  '5. 테마 · 상/하단 바 · 통합 배경 이미지': '5. Brand Kits, Theme & BG',
  '1. 호버·클릭 반응형 모션 (11종)': '1. Reactive Motion (11)',
  '2. 등장 모션 (14종) & 클릭 순서': '2. Entrance & Build Order',
  '3. 인터랙티브 버튼 & 팝업 카드 연결': '3. Interactive Popup Cards',
  '4. 페이지 전환 트랜지션': '4. Slide Transitions',
  '1. 정확한 크기(px/%) · 화면비 잠금 · 여백': '1. Size, Aspect Lock & Pad',
  '2. 맞춤 정렬 · 동일 크기 · 균등 분배 · 그룹': '2. Align, Distribute & Group',
  '3. 레이어 순서 (Z-Index) & 잠금': '3. Layer Order & Lock',
  '1. 슬라이드 비율 · 레이아웃 추가 · 초기화': '1. Ratio & Slide Layouts',
  '2. 전체 슬라이드 글꼴 일괄 교체 & 마스터': '2. Global Font & Master',
  '3. 발표자 노트 · 발표자 뷰 · 자동 전환': '3. Speaker Notes & Presenter',
  '4. 프로젝트 작업함 & 덱 초기화': '4. Workspace & Backups',
  '프레젠테이션 내보내기 & 패키징': 'Export & Package Presentation',
  '새 프레젠테이션 템플릿 선택': 'Choose a Starter Template',
  '편집 스튜디오 열기 / 닫기': 'Open / Close Editor',
  '핵심 키워드 형광 강조': 'Highlight Key Terms',
  '목차 빠른 이동': 'Quick Slide Index',
  '전체 단축키 일람표': 'Keyboard Shortcuts Cheat Sheet',
  '다시 보지 않기': "Don't show again",
  '바로 시작하기': 'Start Now',
  '템플릿으로 시작하기': 'Start from Template',
  '별도 뷰어 없이 브라우저 하나로 편집·발표·단독 HTML 저장까지 가능한 인터랙티브 슬라이드 스튜디오입니다.': 'An interactive, offline-ready HTML presentation studio with editing, live widgets, and standalone HTML/PPTX/PDF export.',
  'HTML Slide Tool에 오신 것을 환영합니다': 'Welcome to HTML Slide Tool',
  '전체 슬라이드 찾기 및 바꾸기': 'Find & Replace Across Deck',
  '전체 슬라이드 일람표 · 순서 및 숨김 관리': 'Slide Sorter & Visibility',
  '레이아웃 텍스트·카드 넘침 사전 검사': 'Pre-flight Overflow Audit'
};

function applyUiLanguageToRoot(rootDoc, targetLang) {
  if (!rootDoc) return;
  const lang = targetLang === 'en' ? 'en' : 'ko';
  const selectors = [
    '#appTopHeader button', '#appTopHeader span',
    '#pptContextualTopBar button', '#pptContextualTopBar span',
    '#pptLeftFilmstrip button',
    '#pptStudioPopup button', '#pptStudioPopup span',
    '#appBottomFooter button',
    '#saveChoiceModal h3', '#starterTemplateModal h3', '#shortcutsHelpModal h3',
    '#onboardingGuideModal h3', '#onboardingGuideModal p', '#onboardingGuideModal div', '#onboardingGuideModal button', '#findReplaceModal h3', '#slideSorterModal h3', '#overflowAuditModal h3'
  ].join(', ');

  rootDoc.querySelectorAll(selectors).forEach(el => {
    let targetNode = null;
    for (let i = 0; i < el.childNodes.length; i++) {
      const n = el.childNodes[i];
      if (n.nodeType === 3 && n.nodeValue && n.nodeValue.trim().length > 0) {
        targetNode = n;
        break;
      }
    }
    if (!targetNode) return;
    const rawText = targetNode.nodeValue.trim();
    if (!el.dataset.i18nKo) {
      if (UI_I18N_DICT[rawText]) {
        el.dataset.i18nKo = rawText;
        el.dataset.i18nEn = UI_I18N_DICT[rawText];
      } else {
        return;
      }
    }
    const nextTxt = lang === 'en' ? el.dataset.i18nEn : el.dataset.i18nKo;
    if (nextTxt) targetNode.nodeValue = nextTxt;
  });

  rootDoc.querySelectorAll('[data-lang-choice]').forEach(btn => {
    const isSel = btn.getAttribute('data-lang-choice') === lang;
    btn.classList.toggle('bg-gopro', isSel);
    btn.classList.toggle('text-white', isSel);
    btn.classList.toggle('border-gopro', isSel);
    btn.classList.toggle('bg-white', !isSel);
    btn.classList.toggle('text-ink', !isSel);
  });
}

function applyUiLanguage(lang, silent) {
  currentUiLanguage = lang === 'en' ? 'en' : 'ko';
  try { localStorage.setItem(UI_LANG_STORAGE_KEY, currentUiLanguage); } catch (e) {}
  document.documentElement.lang = currentUiLanguage;
  applyUiLanguageToRoot(document, currentUiLanguage);
  if (studioPopupWin && !studioPopupWin.closed) {
    applyUiLanguageToRoot(studioPopupWin.document, currentUiLanguage);
  }
  if (!silent) {
    showToast(currentUiLanguage === 'en'
      ? 'UI language switched to English (EN).'
      : 'UI 언어가 한국어(KO)로 전환되었습니다.');
  }
}

function toggleUiLanguage() {
  applyUiLanguage(currentUiLanguage === 'ko' ? 'en' : 'ko', false);
}

function initUiLanguagePreference() {
  let saved = 'ko';
  try {
    const raw = localStorage.getItem(UI_LANG_STORAGE_KEY);
    if (raw === 'en' || raw === 'ko') saved = raw;
  } catch (e) {}
  applyUiLanguage(saved, true);
}

/* ==================== LIVE INTERACTIVE TEST MODE INSIDE EDIT SESSION (v4.8.0) ==================== */
function toggleInteractiveTestMode(forceState) {
  if (!isEditMode) {
    if (forceState === false) isInteractiveTestMode = false;
    return;
  }
  const next = typeof forceState === 'boolean' ? forceState : !isInteractiveTestMode;
  if (next === isInteractiveTestMode) return;
  isInteractiveTestMode = next;

  const activeSlideEl = slides[currentSlide - 1];
  if (isInteractiveTestMode) {
    if (typeof cancelBuildSequencePreview === 'function') cancelBuildSequencePreview();
    if (typeof flushDeferredHistoryNow === 'function') flushDeferredHistoryNow();
    if (typeof closeFloatingCardEditor === 'function') closeFloatingCardEditor();
    makeAllTextEditable(false);
    clearSelectionInspector();
    // Reset edit-only flip states so 3D flip cards test cleanly from front face
    document.querySelectorAll('.iw-flip-scene.is-editing-back').forEach(s => {
      s.classList.remove('is-editing-back');
      const w = s.closest('.ppt-interactive-widget');
      const flipBtn = w ? w.querySelector('button[data-on-click*="toggleIwFlipEditSide"]') : null;
      if (flipBtn) flipBtn.textContent = '↻ 뒷면 편집으로 전환';
    });
    document.body.classList.remove('edit-mode');
    document.body.classList.add('interactive-test-mode');
    if (activeSlideEl) {
      if (typeof initSlideBuildSteps === 'function') initSlideBuildSteps(activeSlideEl);
      if (typeof animateSlideKpisAndCharts === 'function') animateSlideKpisAndCharts(activeSlideEl);
    }
    syncWorkspaceLayoutAfterStudioChange();
    showToast('▶ 즉시 테스트 모드 ON — 슬라이드 위젯·호버·팝업·차트를 바로 조작해 보세요! (종료: Alt+P / Esc)');
  } else {
    if (typeof activeScreenBlackoutMode !== 'undefined' && activeScreenBlackoutMode && typeof toggleScreenBlackout === 'function') toggleScreenBlackout(activeScreenBlackoutMode);
    if (typeof isScreenDrawMode !== 'undefined' && isScreenDrawMode && typeof toggleScreenDrawMode === 'function') toggleScreenDrawMode(false);
    if (typeof isLaserPointerEnabled !== 'undefined' && isLaserPointerEnabled && typeof toggleLaserPointer === 'function') toggleLaserPointer(false);
    if (typeof closeFloatingCardLightbox === 'function') closeFloatingCardLightbox();
    document.body.classList.remove('interactive-test-mode');
    document.body.classList.add('edit-mode');
    document.querySelectorAll('.build-step-pending, .build-step-revealed').forEach(el => el.classList.remove('build-step-pending', 'build-step-revealed'));
    const tt = document.getElementById('pptChartTooltip');
    if (tt) tt.style.display = 'none';
    makeAllTextEditable(true);
    syncWorkspaceLayoutAfterStudioChange();
    showToast('✎ 편집 모드로 복귀했습니다.');
  }
}
