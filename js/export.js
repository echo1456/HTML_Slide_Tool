/* ==================== SAVE MODAL (EDITABLE HTML vs PRESENTATION-ONLY HTML vs ZIP vs PPTX vs PNG vs PDF) ==================== */
function openSaveModal() {
  const inp = document.getElementById('exportFileNameInput');
  if (inp && (!inp.value.trim() || inp.value.trim() === 'Untitled')) {
    const rawTitle = (document.getElementById('headerDeckTitle')?.textContent || '').trim();
    const cleaned = rawTitle.replace(/[\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 40);
    if (cleaned && cleaned !== 'HTML SLIDE TOOL · PRESENTATION DECK') inp.value = cleaned;
  }
  if (typeof openModalSafe === 'function') { openModalSafe('saveChoiceModal'); return; }
  const modal = document.getElementById('saveChoiceModal');
  if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); modal.style.display = 'flex'; }
}
function closeSaveModal() {
  if (typeof closeModalSafe === 'function') { closeModalSafe('saveChoiceModal'); return; }
  const modal = document.getElementById('saveChoiceModal');
  if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); modal.style.display = 'none'; }
}
function getChosenExportBaseName() {
  const inp = document.getElementById('exportFileNameInput');
  const raw = (inp ? inp.value : 'Untitled').trim() || 'Untitled';
  const withoutExt = raw.replace(/\.(?:html?|zip|pptx|png|jpe?g|pdf)$/i, '').replace(/\.+$/g, '').trim() || 'Untitled';
  const sanitized = withoutExt.replace(/[\\/:*?"<>|]/g, '_').replace(/\.{2,}/g, '.').replace(/^\.+|\.+$/g, '');
  return sanitized || 'Untitled';
}
function triggerDownloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}
function scanDeckLayoutOverflows() {
  const allSlides = Array.from(document.querySelectorAll('#slideStage .slide'));
  const issues = [];
  allSlides.forEach((sEl, idx) => {
    if (sEl.getAttribute('data-slide-hidden') === 'true') return;
    const slideNum = idx + 1, prevDisplay = sEl.style.display, prevVis = sEl.style.visibility, prevPE = sEl.style.pointerEvents, isActive = sEl.classList.contains('active');
    if (!isActive) {
      sEl.style.visibility = 'hidden';
      sEl.style.pointerEvents = 'none';
      sEl.style.display = 'flex';
      sEl.classList.add('transition-instant-reset', 'active');
      void sEl.offsetWidth;
    }
    sEl.querySelectorAll('.slide-card, .ppt-free-obj, .card-inner-textbox').forEach(box => {
      if (box.classList.contains('ppt-interactive-widget') || box.closest('.ppt-interactive-widget')) return;
      if (box.classList.contains('ppt-embed-widget') || box.classList.contains('ppt-audio-widget') || box.classList.contains('ppt-chart-widget')) return;
      if (box.clientHeight > 0 && box.scrollHeight > box.clientHeight + 8) {
        const snippet = (box.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28) || '카드/텍스트 영역';
        issues.push({ slideNum, snippet, diffPx: Math.round(box.scrollHeight - box.clientHeight) });
      }
    });
    if (!isActive) {
      sEl.classList.remove('active', 'transition-instant-reset');
      sEl.style.display = prevDisplay;
      sEl.style.visibility = prevVis;
      sEl.style.pointerEvents = prevPE;
    }
  });
  return issues;
}
function openOverflowAuditModal(explicitIssues) {
  const issues = Array.isArray(explicitIssues) ? explicitIssues : scanDeckLayoutOverflows();
  const modal = document.getElementById('overflowAuditModal'), listEl = document.getElementById('overflowAuditList');
  if (!modal || !listEl) return;
  if (issues.length === 0) {
    listEl.innerHTML = '<div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold text-center">✅ 모든 슬라이드에서 텍스트·카드 넘침(Overflow)이 발견되지 않았습니다!</div>';
  } else {
    listEl.innerHTML = issues.map(it => `<div class="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-2 text-xs"><div class="min-w-0"><span class="font-mono font-extrabold text-rose-700">P.${String(it.slideNum).padStart(2, '0')}</span><span class="font-bold text-ink ml-1.5 truncate">${typeof escapeAttr === 'function' ? escapeAttr(it.snippet) : it.snippet}</span><span class="font-mono text-[10px] text-rose-600 ml-1">(+${it.diffPx}px 초과)</span></div><button type="button" data-on-click="closeOverflowAuditModal(); if(typeof goToSlide==='function') goToSlide(${it.slideNum});" class="px-2.5 py-1 rounded-lg bg-ink text-white text-[10px] font-bold cursor-pointer shrink-0">이동</button></div>`).join('');
  }
  if (typeof openModalSafe === 'function') openModalSafe(modal); else { modal.classList.remove('hidden'); modal.classList.add('flex'); modal.style.display = 'flex'; }
}
function closeOverflowAuditModal() { if (typeof closeModalSafe === 'function') closeModalSafe('overflowAuditModal'); }
function saveAsPDF(includeSpeakerNotes) {
  const wasEditing = isEditMode;
  if (typeof isInteractiveTestMode !== 'undefined' && isInteractiveTestMode && typeof toggleInteractiveTestMode === 'function') toggleInteractiveTestMode(false);
  if (wasEditing && typeof toggleEditMode === 'function') toggleEditMode(false);
  const issues = scanDeckLayoutOverflows();
  if (issues.length > 0 && !window.confirm(`총 ${issues.length}곳에서 카드·텍스트 영역 넘침(Overflow)이 감지되었습니다.\n그대로 PDF 인쇄를 진행할까요? (취소를 누르면 넘침 목록을 확인합니다)`)) {
    if (wasEditing && typeof toggleEditMode === 'function') toggleEditMode(true);
    openOverflowAuditModal(issues);
    return;
  }
  if (typeof closeFloatingCardLightbox === 'function') closeFloatingCardLightbox();
  if (typeof closeFloatingCardEditor === 'function') closeFloatingCardEditor();
  clearSelectionInspector();
  const tocModal = document.getElementById('tocModal');
  if (tocModal) { if (typeof closeModalSafe === 'function') closeModalSafe(tocModal); else { tocModal.classList.add('hidden'); tocModal.classList.remove('flex'); tocModal.style.display = 'none'; } }
  const prevTitle = document.title, baseName = getChosenExportBaseName();
  document.title = baseName;
  if (typeof syncResponsiveElementOffsets === 'function') syncResponsiveElementOffsets();
  if (typeof syncResponsiveCardHeights === 'function') syncResponsiveCardHeights();
  if (includeSpeakerNotes) document.body.classList.add('print-with-notes'); else document.body.classList.remove('print-with-notes');
  showToast(includeSpeakerNotes ? '슬라이드 + 발표자 노트 인쇄 창이 열립니다.' : 'PDF 인쇄 창이 열립니다. 대상을 "PDF로 저장" · 레이아웃 "가로"로 선택하세요.');
  window.scrollTo(0, 0);
  setTimeout(() => { window.print(); setTimeout(() => { document.title = prevTitle; document.body.classList.remove('print-with-notes'); if (wasEditing && typeof toggleEditMode === 'function') toggleEditMode(true); if (typeof updateStageViewportScale === 'function') updateStageViewportScale(); }, 400); }, 280);
}
function collectLiveInlinedAssets() {
  const cssMap = {};
  document.querySelectorAll('style[data-inlined-css]').forEach(st => {
    const k = st.getAttribute('data-inlined-css');
    if (k) cssMap[k] = st.textContent || '';
  });
  const jsMap = {};
  document.querySelectorAll('script[data-inlined-js]').forEach(sc => {
    const k = sc.getAttribute('data-inlined-js');
    if (k) jsMap[k] = sc.textContent || '';
  });
  return { css: cssMap, js: jsMap };
}

function inlineAssetsForStandaloneHTML(clonedRoot, presentationOnly) {
  const staticBundle = window.PPT_STANDALONE_BUNDLE || { css: {}, js: {} };
  const liveBundle = collectLiveInlinedAssets();
  const bundle = {
    css: Object.assign({}, liveBundle.css, staticBundle.css || {}),
    js: Object.assign({}, liveBundle.js, staticBundle.js || {})
  };
  clonedRoot.querySelectorAll('script[src="js/bundle-data.js"], script[data-inlined-js="js/bundle-data.js"], link[rel="manifest"], link[rel="icon"], link[rel="apple-touch-icon"]').forEach(s => s.remove());
  if (presentationOnly) clonedRoot.querySelectorAll('style[data-inlined-css="css/studio.css"]').forEach(st => st.remove());
  clonedRoot.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (presentationOnly && href === 'css/studio.css') { link.remove(); return; }
    if (bundle.css && bundle.css[href]) {
      const styleEl = document.createElement('style'); styleEl.setAttribute('data-inlined-css', href);
      if (link.hasAttribute('media')) styleEl.setAttribute('media', link.getAttribute('media'));
      styleEl.textContent = '\n' + bundle.css[href] + '\n'; link.replaceWith(styleEl);
    }
  });
  clonedRoot.querySelectorAll('script[src*="cdn.tailwindcss.com"]').forEach(s => s.remove());
  clonedRoot.querySelectorAll('script:not([src])').forEach(s => { if ((s.textContent || '').includes('tailwind.config')) s.remove(); });
  const liveTwStyles = Array.from(document.querySelectorAll('style')).filter(s => !s.hasAttribute('data-inlined-css') && s.id !== 'pptRuntimeOfflineUtilities' && s.textContent && (s.textContent.includes('tailwindcss') || s.textContent.includes('--tw-')));
  const clonedHead = clonedRoot.querySelector('head');
  if (clonedHead) {
    clonedHead.querySelectorAll('style').forEach(s => { if (!s.hasAttribute('data-inlined-css') && !s.id && (s.textContent.includes('tailwindcss') || s.textContent.includes('--tw-'))) s.remove(); });
    if (liveTwStyles.length > 0) {
      const compiledTw = document.createElement('style');
      compiledTw.setAttribute('data-compiled-tailwind', 'true');
      compiledTw.textContent = liveTwStyles[liveTwStyles.length - 1].textContent;
      const firstAppCss = clonedHead.querySelector('style[data-inlined-css], link[rel="stylesheet"]');
      if (firstAppCss) clonedHead.insertBefore(compiledTw, firstAppCss);
      else clonedHead.appendChild(compiledTw);
    }
  }
  if (presentationOnly) {
    clonedRoot.querySelectorAll('script[data-inlined-js="js/studio.js"], script[data-inlined-js="js/export.js"], script[data-inlined-js="js/pwa-fs.js"]').forEach(s => s.remove());
    clonedRoot.querySelectorAll('script[data-inlined-js="js/main.js"]').forEach(s => { if (!(s.textContent || '').includes('window.toggleEditMode = function() {};')) s.textContent = (s.textContent || '') + '\nwindow.toggleEditMode = function() {};\n'; });
  }
  clonedRoot.querySelectorAll('script[src]').forEach(scr => {
    const src = scr.getAttribute('src') || '';
    if (src === 'js/bundle-data.js') { scr.remove(); return; }
    if (presentationOnly && (src === 'js/studio.js' || src === 'js/export.js' || src === 'js/pwa-fs.js')) { scr.remove(); return; }
    let code = null;
    if (bundle.js && bundle.js[src]) code = bundle.js[src];
    else if (src === 'js/export.js') code = [openSaveModal.toString(), closeSaveModal.toString(), getChosenExportBaseName.toString(), saveAsPDF.toString(), collectLiveInlinedAssets.toString(), inlineAssetsForStandaloneHTML.toString(), buildSerializedStandaloneHTML.toString(), saveModifiedHTML.toString()].join('\n\n');
    if (code !== null) {
      if (presentationOnly && src === 'js/main.js') code += '\nwindow.toggleEditMode = function() {};\n';
      const inlineScr = document.createElement('script'); inlineScr.setAttribute('data-inlined-js', src);
      inlineScr.textContent = '\n' + code.replace(/<\/script>/gi, '<\\/script>') + '\n'; scr.replaceWith(inlineScr);
    }
  });
}
function buildSerializedStandaloneHTML(presentationOnly) {
  const isReadOnly = Boolean(presentationOnly), wasEditing = isEditMode, savedSlideIndex = currentSlide;
  if (typeof isInteractiveTestMode !== 'undefined' && isInteractiveTestMode && typeof toggleInteractiveTestMode === 'function') toggleInteractiveTestMode(false);
  // Ensure popped-out Studio & Floating Card Studio panels are docked back into main document before serialization!
  if (typeof studioPopupWin !== 'undefined' && studioPopupWin && !studioPopupWin.closed && typeof dockStudioBackToMain === 'function') {
    dockStudioBackToMain(false);
  }
  if (typeof fcStudioPopupWin !== 'undefined' && fcStudioPopupWin && !fcStudioPopupWin.closed && typeof dockFcStudioBackToMain === 'function') {
    dockFcStudioBackToMain(false);
  }
  if (wasEditing && typeof toggleEditMode === 'function') toggleEditMode(false);
  clearSelectionInspector();
  const modal = document.getElementById('tocModal'); if (modal) { if (typeof closeModalSafe === 'function') closeModalSafe(modal); else { modal.classList.add('hidden'); modal.classList.remove('flex'); modal.style.display = 'none'; } }
  const totalCount = document.querySelectorAll('.slide').length; if (totalCount > 0) goToSlide(1);
  const toast = document.getElementById('toastBox'); if (toast) { toast.classList.remove('opacity-100'); toast.classList.add('opacity-0'); }
  const clonedRoot = document.documentElement.cloneNode(true);
  if (clonedRoot.style) {
    clonedRoot.style.setProperty('--stage-zoom', '1');
    clonedRoot.style.setProperty('--stage-pan-x', '0px');
    clonedRoot.style.setProperty('--stage-pan-y', '0px');
  }
  clonedRoot.querySelectorAll('[data-bard-client-injected="true"]').forEach(el => el.remove());
  clonedRoot.querySelectorAll('.video-missing-fallback, .table-col-resizer, .table-row-resizer, .ppt-persistent-guide, #pptLaserDot, #pptBentoDropPreview').forEach(el => el.remove());
  clonedRoot.querySelectorAll('.build-step-pending, .build-step-revealed').forEach(el => el.classList.remove('build-step-pending', 'build-step-revealed'));
  clonedRoot.querySelectorAll('[data-err-bound]').forEach(el => el.removeAttribute('data-err-bound'));
  clonedRoot.querySelectorAll('.ppt-multi-selected, .is-selected').forEach(el => el.classList.remove('ppt-multi-selected', 'is-selected'));
  clonedRoot.querySelectorAll('.iw-flip-scene').forEach(el => el.classList.remove('is-editing-back', 'is-flipped'));
  clonedRoot.querySelectorAll('.iw-hs-pin.is-open').forEach(el => el.classList.remove('is-open'));
  const clonedTooltip = clonedRoot.querySelector('#pptChartTooltip'); if (clonedTooltip) clonedTooltip.style.display = 'none';
  const clonedLb = clonedRoot.querySelector('#floatingCardLightbox');
  if (clonedLb) {
    clonedLb.classList.remove('open', 'fc-multi-open');
    clonedLb.querySelectorAll('.fc-multi-card-item').forEach(n => n.remove());
    const clonedLbBody = clonedLb.querySelector('#floatingCardLightboxBody');
    if (clonedLbBody) clonedLbBody.innerHTML = '';
  }
  const clonedFcEd = clonedRoot.querySelector('#fcRichBodyEditor');
  if (clonedFcEd) clonedFcEd.innerHTML = '';
  ['#pptScreenBlackoutOverlay', '#pptDrawCanvas', '#pptDrawToolbar', '#saveChoiceModal', '#floatingCardEditorModal', '#findReplaceModal', '#overflowAuditModal', '#slideCommentsModal', '#slideSorterModal', '#reuseSlidesModal', '#starterTemplateModal', '#shortcutsHelpModal', '#onboardingGuideModal', '#tocModal', '#pptContextMenu', '#autosaveRecoveryBanner'].forEach(sel => {
    const ov = clonedRoot.querySelector(sel);
    if (ov) { ov.classList.add('hidden'); ov.classList.remove('flex'); ov.style.display = ''; }
  });
  clonedRoot.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
  const clonedOverlay = clonedRoot.querySelector('#pptSelectionOverlay');
  if (clonedOverlay) { clonedOverlay.classList.remove('visible'); if (isReadOnly) clonedOverlay.remove(); }
  const clonedAutoSaveStatus = clonedRoot.querySelector('#autoSaveStatusText'); if (clonedAutoSaveStatus) clonedAutoSaveStatus.textContent = '';
  const clonedBodyAll = clonedRoot.querySelector('body');
  if (clonedBodyAll) {
    clonedBodyAll.classList.remove('edit-mode', 'interactive-test-mode', 'focus-mode', 'pasteboard-mode', 'space-pan-ready', 'space-pan-dragging', 'is-fullscreen', 'fullscreen-mode', 'print-with-notes');
  }
  if (isReadOnly) {
    const clonedBody = clonedRoot.querySelector('body'); if (clonedBody) { clonedBody.classList.remove('edit-mode'); clonedBody.setAttribute('data-presentation-only', 'true'); }
    ['#pptContextualTopBar', '#pptLeftFilmstrip', '#headerNativeFileBadge', '#pwaInstallAppBtn', '#pptStudioPopup', '#pptMarqueeBox', '#pptSmartGuidesLayer', '#floatingCardEditorModal', '#saveChoiceModal', '#starterTemplateModal', '#onboardingGuideModal', '#shortcutsHelpModal', '#findReplaceModal', '#slideSorterModal', '#reuseSlidesModal', '#overflowAuditModal', '#slideCommentsModal', '#pptContextMenu', '#historyDropdownMenu', '#pptRulerTop', '#pptRulerLeft', '#autosaveRecoveryBanner', '#globalImageUploader', '#globalMediaUploader', '#directMediaUploader', '#bgImageUploader', '#projectFileImporter', '#replaceMediaUploader', '#videoPosterUploader', '#audioFileUploader', '#reuseSlidesFileImporter', '#pptxFileImporter'].forEach(sel => { const node = clonedRoot.querySelector(sel); if (node) node.remove(); });
    clonedRoot.querySelectorAll('.card-edit-controls, .img-edit-overlay, .sub-box-del-btn, .card-media-controls, .embed-widget-drag-bar, .ppt-slide-comment-badge, .iw-edit-bar, .ppt-audio-widget button, .yt-local-hint-bar').forEach(el => el.remove());
    clonedRoot.querySelectorAll('button[onclick*="openSaveModal"], button[data-on-click*="openSaveModal"], button[onclick*="toggleShortcutsHelpModal"], button[data-on-click*="toggleShortcutsHelpModal"], button[onclick*="openSlideCommentsPanel"], button[data-on-click*="openSlideCommentsPanel"]').forEach(btn => btn.remove());
    clonedRoot.querySelectorAll('[data-slide-comments]').forEach(s => s.removeAttribute('data-slide-comments'));
  }
  if (typeof rewriteVideoSrcForExport === 'function') rewriteVideoSrcForExport(clonedRoot);
  inlineAssetsForStandaloneHTML(clonedRoot, isReadOnly);
  const safeRestoreIdx = Math.max(1, Math.min(savedSlideIndex, document.querySelectorAll('.slide').length));
  goToSlide(safeRestoreIdx);
  if (wasEditing && typeof toggleEditMode === 'function') toggleEditMode(true);
  return '<!DOCTYPE html>\n' + clonedRoot.outerHTML;
}
function saveModifiedHTML(presentationOnly) {
  try {
    const isReadOnly = Boolean(presentationOnly), serialized = buildSerializedStandaloneHTML(isReadOnly), baseName = getChosenExportBaseName(), fileName = `${baseName}.html`;
    triggerDownloadBlob(new Blob([serialized], { type: 'text/html;charset=utf-8' }), fileName);
    if (typeof markChangesSaved === 'function') markChangesSaved();
    hasUnexportedFileChanges = false;
    showToast(isReadOnly ? `${fileName} 내보내기 완료! (수정·저장 잠금 발표 전용)` : `${fileName} 저장 완료! (단독 실행용 CSS/JS 내장됨)`);
  } catch (err) { console.error('[HTML Slide Tool] HTML 저장 오류:', err); showToast('파일 저장 중 오류가 발생했습니다.'); }
}
const __CRC32_TABLE = (() => { const tbl = new Uint32Array(256); for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); tbl[i] = c >>> 0; } return tbl; })();
function computeCrc32(u8) { let crc = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) crc = __CRC32_TABLE[(crc ^ u8[i]) & 0xFF] ^ (crc >>> 8); return (crc ^ 0xFFFFFFFF) >>> 0; }
function buildZipBlobFromEntries(entries, mimeType) {
  const encoder = new TextEncoder(), localParts = [], centralParts = []; let offset = 0;
  entries.forEach(entry => {
    const nameBytes = encoder.encode(entry.name), dataBytes = entry.data instanceof Uint8Array ? entry.data : encoder.encode(String(entry.data || '')), crc = computeCrc32(dataBytes), size = dataBytes.length;
    const lh = new Uint8Array(30 + nameBytes.length), lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x0800, true); lv.setUint32(14, crc, true); lv.setUint32(18, size, true); lv.setUint32(22, size, true); lv.setUint16(26, nameBytes.length, true); lh.set(nameBytes, 30);
    localParts.push(lh, dataBytes);
    const ch = new Uint8Array(46 + nameBytes.length), cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true); cv.setUint32(16, crc, true); cv.setUint32(20, size, true); cv.setUint32(24, size, true); cv.setUint16(28, nameBytes.length, true); cv.setUint32(42, offset, true); ch.set(nameBytes, 46);
    centralParts.push(ch); offset += lh.length + size;
  });
  const centralStart = offset; let centralSize = 0; centralParts.forEach(p => { centralSize += p.length; });
  const eocd = new Uint8Array(22), ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, entries.length, true); ev.setUint16(10, entries.length, true); ev.setUint32(12, centralSize, true); ev.setUint32(16, centralStart, true);
  return new Blob([...localParts, ...centralParts, eocd], { type: mimeType || 'application/zip' });
}
async function exportDeckAsZipPackage(presentationOnly) {
  try {
    const baseName = getChosenExportBaseName(), htmlContent = buildSerializedStandaloneHTML(Boolean(presentationOnly)), entries = [{ name: `${baseName}.html`, data: htmlContent }], mediaNames = new Set();
    document.querySelectorAll('#slideStage video[data-media-name], #slideStage audio[data-media-name]').forEach(el => { const m = (el.getAttribute('data-media-name') || '').trim(); if (m) mediaNames.add(m); });
    document.querySelectorAll('#slideStage video[src], #slideStage audio[src]').forEach(el => { const s = (el.getAttribute('src') || '').trim(); if (s.startsWith('media/')) mediaNames.add(s.slice(6)); });
    const blobMap = window.__pptSessionMediaBlobs instanceof Map ? window.__pptSessionMediaBlobs : new Map(); let count = 0;
    for (const mName of mediaNames) {
      if (blobMap.has(mName)) { entries.push({ name: `media/${mName}`, data: new Uint8Array(await blobMap.get(mName).arrayBuffer()) }); count++; }
      else { try { const resp = await fetch(`media/${mName}`); if (resp.ok) { entries.push({ name: `media/${mName}`, data: new Uint8Array(await resp.arrayBuffer()) }); count++; } } catch (e) {} }
    }
    triggerDownloadBlob(buildZipBlobFromEntries(entries, 'application/zip'), `${baseName}.zip`);
    if (typeof markChangesSaved === 'function') markChangesSaved();
    hasUnexportedFileChanges = false;
    showToast(`${baseName}.zip 패키징 완료! (HTML 1개 + 미디어 ${count}개 동봉)`);
  } catch (err) { console.error('[HTML Slide Tool] ZIP 패키징 오류:', err); showToast('ZIP 패키징 중 오류가 발생했습니다.'); }
}
function escapeXml(str) { return String(str || '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;'); }
function cssColorToHex6(rawColor, fallback) {
  const fb = fallback || 'FFFFFF'; if (!rawColor) return fb; const s = String(rawColor).trim();
  if (s.startsWith('#')) { const h = s.slice(1); if (h.length === 3) return (h[0]+h[0]+h[1]+h[1]+h[2]+h[2]).toUpperCase(); if (h.length >= 6) return h.slice(0, 6).toUpperCase(); }
  const rgbMatch = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) { const toHex = (n) => Math.max(0, Math.min(255, parseInt(n, 10) || 0)).toString(16).padStart(2, '0'); return (toHex(rgbMatch[1]) + toHex(rgbMatch[2]) + toHex(rgbMatch[3])).toUpperCase(); }
  return fb;
}
function dataUrlToUint8Array(dataUrl) {
  const m = String(dataUrl || '').match(/^data:image\/(png|jpe?g|gif|webp);base64,([A-Za-z0-9+/=]+)$/i); if (!m) return null;
  const ext = m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase(), binStr = atob(m[2]), bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
  return { ext, bytes };
}
/* ==================== HIGH-FIDELITY CANVAS CHART, SHAPE & GRADIENT RENDERER (v4.7.0) ==================== */
function parseCssGradientForCanvas(ctx, cssBg, x, y, w, h) {
  if (!cssBg || !cssBg.includes('gradient(')) return null;
  const isRadial = cssBg.includes('radial-gradient(');
  const colorMatches = cssBg.match(/(?:rgba?\([^)]+\)|#[0-9a-fA-F]{3,8})/g);
  if (!colorMatches || colorMatches.length < 2) return null;
  let grad;
  if (isRadial) {
    grad = ctx.createRadialGradient(x + w / 2, y + h / 2, 2, x + w / 2, y + h / 2, Math.max(w, h) * 0.65);
  } else {
    const degM = cssBg.match(/(-?\d+(?:\.\d+)?)deg/i);
    const deg = degM ? parseFloat(degM[1]) : 135;
    const rad = ((deg - 90) * Math.PI) / 180;
    const cx = x + w / 2, cy = y + h / 2;
    const dx = Math.cos(rad) * (w / 2), dy = Math.sin(rad) * (h / 2);
    grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
  }
  colorMatches.forEach((col, i) => {
    grad.addColorStop(i / Math.max(1, colorMatches.length - 1), col);
  });
  return grad;
}

function drawRoundedRectPath(ctx, x, y, w, h, r) {
  const rad = Math.max(0, Math.min(r || 0, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function drawFreeShapePathOnCanvas(ctx, shapeType, x, y, w, h, radius) {
  if (shapeType === 'circle') {
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.closePath();
  } else if (shapeType === 'pill') {
    drawRoundedRectPath(ctx, x, y, w, h, Math.min(w, h) / 2);
  } else if (shapeType === 'triangle') {
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  } else if (shapeType === 'diamond') {
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w, y + h / 2);
    ctx.lineTo(x + w / 2, y + h);
    ctx.lineTo(x, y + h / 2);
    ctx.closePath();
  } else if (shapeType === 'star') {
    const cx = x + w / 2, cy = y + h / 2, rx = w / 2, ry = h / 2;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + (i * Math.PI) / 5;
      const mult = i % 2 === 0 ? 1 : 0.42;
      const px = cx + Math.cos(ang) * rx * mult;
      const py = cy + Math.sin(ang) * ry * mult;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else if (shapeType === 'arrow' || shapeType === 'arrowRight') {
    const headX = x + w * 0.78, barTop = y + h * 0.34, barBot = y + h * 0.66;
    ctx.beginPath();
    ctx.moveTo(x, barTop);
    ctx.lineTo(headX, barTop);
    ctx.lineTo(headX, y);
    ctx.lineTo(x + w, y + h / 2);
    ctx.lineTo(headX, y + h);
    ctx.lineTo(headX, barBot);
    ctx.lineTo(x, barBot);
    ctx.closePath();
  } else if (shapeType === 'arrowBoth') {
    const leftHeadX = x + w * 0.18, rightHeadX = x + w * 0.82, barTop = y + h * 0.34, barBot = y + h * 0.66;
    ctx.beginPath();
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(leftHeadX, y);
    ctx.lineTo(leftHeadX, barTop);
    ctx.lineTo(rightHeadX, barTop);
    ctx.lineTo(rightHeadX, y);
    ctx.lineTo(x + w, y + h / 2);
    ctx.lineTo(rightHeadX, y + h);
    ctx.lineTo(rightHeadX, barBot);
    ctx.lineTo(leftHeadX, barBot);
    ctx.lineTo(leftHeadX, y + h);
    ctx.closePath();
  } else if (shapeType === 'speech' || shapeType === 'callout') {
    const bodyH = h * 0.74, r = Math.min(12, w * 0.1, bodyH * 0.2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + bodyH - r);
    ctx.arcTo(x + w, y + bodyH, x + w - r, y + bodyH, r);
    ctx.lineTo(x + w * 0.36, y + bodyH);
    ctx.lineTo(x + w * 0.20, y + h);
    ctx.lineTo(x + w * 0.24, y + bodyH);
    ctx.lineTo(x + r, y + bodyH);
    ctx.arcTo(x, y + bodyH, x, y + bodyH - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  } else if (shapeType === 'line') {
    ctx.beginPath();
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x + w, y + h / 2);
  } else {
    drawRoundedRectPath(ctx, x, y, w, h, radius);
  }
}

function drawChartWidgetOnCanvas(ctx, widgetEl, x, y, w, h) {
  if (!widgetEl || typeof readChartData !== 'function') return false;
  const data = readChartData(widgetEl);
  if (!data) return false;
  const accentHex = (document.documentElement.style.getPropertyValue('--accent-color') || '#0055FF').trim();
  const palette = ['#0055FF', '#111111', '#059669', '#D97706', '#7C3AED', '#E11D48'];
  const getItemColor = (it, idx) => data.syncAccent ? accentHex : (it.color || palette[idx % palette.length]);
  const fmtVal = (v) => `${data.valuePrefix || ''}${Number(v).toLocaleString('ko-KR')}${data.valueSuffix || ''}`;

  ctx.save();
  drawRoundedRectPath(ctx, x, y, w, h, 14);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#E2E4E9';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.clip();

  const pad = 16;
  // Title
  ctx.font = '800 14px Pretendard, Malgun Gothic, sans-serif';
  ctx.fillStyle = '#111111';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(String(data.title || 'DATA CHART').slice(0, 48), x + pad, y + pad);
  ctx.font = '700 10px JetBrains Mono, monospace';
  ctx.fillStyle = '#9CA3AF';
  ctx.textAlign = 'right';
  ctx.fillText(String(data.type || 'CHART').toUpperCase(), x + w - pad, y + pad + 2);

  const plotX = x + pad;
  const plotY = y + pad + 26;
  const plotW = Math.max(40, w - pad * 2);
  const plotH = Math.max(40, h - pad * 2 - 26);
  const items = Array.isArray(data.items) ? data.items : [];
  const maxVal = Math.max(1, ...items.map(it => Math.abs(Number(it.value) || 0)));

  if (data.type === 'bar-v' && items.length > 0) {
    // Gridlines
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 3; g++) {
      const gy = plotY + (plotH - 28) * (g / 3);
      ctx.beginPath(); ctx.moveTo(plotX, gy); ctx.lineTo(plotX + plotW, gy); ctx.stroke();
    }
    const barSlot = plotW / items.length;
    const barW = Math.min(54, Math.max(16, barSlot * 0.56));
    const maxBarH = Math.max(20, plotH - 42);
    items.forEach((it, idx) => {
      const val = Math.max(0, Number(it.value) || 0);
      const bh = Math.max(4, (val / maxVal) * maxBarH);
      const bx = plotX + idx * barSlot + (barSlot - barW) / 2;
      const by = plotY + maxBarH - bh + 16;
      drawRoundedRectPath(ctx, bx, by, barW, bh, 6);
      ctx.fillStyle = getItemColor(it, idx);
      ctx.fill();
      ctx.font = '700 11px JetBrains Mono, monospace';
      ctx.fillStyle = '#111111';
      ctx.textAlign = 'center';
      ctx.fillText(fmtVal(val), bx + barW / 2, by - 14);
      ctx.font = '600 11px Pretendard, Malgun Gothic, sans-serif';
      ctx.fillStyle = '#4B5563';
      ctx.fillText(String(it.label || '').slice(0, 10), bx + barW / 2, plotY + maxBarH + 22);
    });
  } else if (data.type === 'bar-h' && items.length > 0) {
    const rowH = Math.min(40, plotH / items.length);
    const labelW = Math.min(110, plotW * 0.3);
    const barAreaW = Math.max(40, plotW - labelW - 56);
    items.forEach((it, idx) => {
      const val = Math.max(0, Number(it.value) || 0);
      const ry = plotY + idx * rowH + 4;
      const bh = Math.max(10, rowH - 14);
      ctx.font = '700 11px Pretendard, Malgun Gothic, sans-serif';
      ctx.fillStyle = '#111111';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(it.label || '').slice(0, 12), plotX, ry + bh / 2);
      drawRoundedRectPath(ctx, plotX + labelW, ry, barAreaW, bh, 5);
      ctx.fillStyle = '#F1F5F9';
      ctx.fill();
      const bw = Math.max(6, (val / maxVal) * barAreaW);
      drawRoundedRectPath(ctx, plotX + labelW, ry, bw, bh, 5);
      ctx.fillStyle = getItemColor(it, idx);
      ctx.fill();
      ctx.font = '700 11px JetBrains Mono, monospace';
      ctx.fillStyle = '#111111';
      ctx.textAlign = 'right';
      ctx.fillText(fmtVal(val), plotX + plotW, ry + bh / 2);
    });
  } else if (data.type === 'line' && items.length > 0) {
    const maxLineH = Math.max(24, plotH - 36);
    const stepX = items.length > 1 ? (plotW - 36) / (items.length - 1) : 0;
    const pts = items.map((it, idx) => ({
      x: plotX + 18 + idx * stepX,
      y: plotY + 14 + maxLineH - ((Math.max(0, Number(it.value) || 0) / maxVal) * maxLineH),
      it, idx
    }));
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 3; g++) {
      const gy = plotY + 14 + maxLineH * (g / 3);
      ctx.beginPath(); ctx.moveTo(plotX, gy); ctx.lineTo(plotX + plotW, gy); ctx.stroke();
    }
    if (pts.length > 1) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, plotY + 14 + maxLineH);
      pts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length - 1].x, plotY + 14 + maxLineH);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 85, 255, 0.10)';
      ctx.fill();

      ctx.beginPath();
      pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.strokeStyle = accentHex;
      ctx.lineWidth = 2.8;
      ctx.stroke();
    }
    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = getItemColor(p.it, p.idx);
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.font = '700 10px JetBrains Mono, monospace';
      ctx.fillStyle = '#111111';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(fmtVal(p.it.value), p.x, p.y - 7);
      ctx.font = '600 10px Pretendard, Malgun Gothic, sans-serif';
      ctx.fillStyle = '#4B5563';
      ctx.textBaseline = 'top';
      ctx.fillText(String(p.it.label || '').slice(0, 10), p.x, plotY + maxLineH + 18);
    });
  } else if (data.type === 'donut' && items.length > 0) {
    const total = Math.max(1, items.reduce((acc, it) => acc + Math.max(0, Number(it.value) || 0), 0));
    const radius = Math.max(24, Math.min(plotH * 0.44, plotW * 0.25));
    const cx = plotX + radius + 14;
    const cy = plotY + plotH / 2;
    let startAng = -Math.PI / 2;
    items.forEach((it, idx) => {
      const v = Math.max(0, Number(it.value) || 0);
      const sweep = (v / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAng, startAng + sweep);
      ctx.closePath();
      ctx.fillStyle = getItemColor(it, idx);
      ctx.fill();
      startAng += sweep;
    });
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.56, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.font = '800 13px JetBrains Mono, monospace';
    ctx.fillStyle = '#111111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fmtVal(total), cx, cy);
    // Legend on right
    const legX = cx + radius + 20;
    const legStep = Math.min(24, plotH / Math.max(1, items.length));
    items.forEach((it, idx) => {
      const ly = plotY + 8 + idx * legStep;
      ctx.fillStyle = getItemColor(it, idx);
      ctx.fillRect(legX, ly + 2, 10, 10);
      ctx.font = '700 11px Pretendard, Malgun Gothic, sans-serif';
      ctx.fillStyle = '#111111';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`${String(it.label || '').slice(0, 12)} (${fmtVal(it.value)})`, legX + 15, ly);
    });
  } else if (data.type === 'kpi' && items.length > 0) {
    const cols = Math.min(4, Math.max(1, items.length));
    const gap = 10;
    const cellW = (plotW - gap * (cols - 1)) / cols;
    const cellH = Math.min(plotH, 130);
    items.slice(0, 4).forEach((it, idx) => {
      const kx = plotX + idx * (cellW + gap);
      const ky = plotY + Math.max(0, (plotH - cellH) / 2);
      drawRoundedRectPath(ctx, kx, ky, cellW, cellH, 10);
      ctx.fillStyle = '#F8FAFC';
      ctx.fill();
      ctx.strokeStyle = '#E2E8F0';
      ctx.stroke();
      ctx.font = '700 10px Pretendard, Malgun Gothic, sans-serif';
      ctx.fillStyle = '#6B7280';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(String(it.label || '').slice(0, 14), kx + 10, ky + 12);
      ctx.font = '900 22px JetBrains Mono, monospace';
      ctx.fillStyle = getItemColor(it, idx);
      ctx.fillText(fmtVal(it.value), kx + 10, ky + 34);
      ctx.font = '600 10px Pretendard, Malgun Gothic, sans-serif';
      ctx.fillStyle = '#4B5563';
      ctx.fillText(String(it.sub || '').slice(0, 16), kx + 10, ky + 66);
    });
  } else if (data.type === 'table') {
    const headers = Array.isArray(data.tableHeaders) ? data.tableHeaders : [];
    const rows = Array.isArray(data.tableRows) ? data.tableRows : [];
    const showHdr = data.showHeaderRow !== false;
    const totalRows = (showHdr ? 1 : 0) + rows.length;
    const colCount = Math.max(1, headers.length);
    const colW = plotW / colCount;
    const rowH = Math.min(34, plotH / Math.max(1, totalRows));
    const hdrBg = (data.cellStyles && data.cellStyles['th-0'] && data.cellStyles['th-0'].bg) || accentHex;
    let curY = plotY;
    if (showHdr) {
      headers.forEach((hTxt, cIdx) => {
        const cellFill = (data.cellStyles && data.cellStyles[`th-${cIdx}`] && data.cellStyles[`th-${cIdx}`].bg) || hdrBg;
        ctx.fillStyle = cellFill;
        ctx.fillRect(plotX + cIdx * colW, curY, colW, rowH);
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.strokeRect(plotX + cIdx * colW, curY, colW, rowH);
        const hdrPx = Math.max(9, Math.min(36, Number((data.cellStyles && data.cellStyles[`th-${cIdx}`] && data.cellStyles[`th-${cIdx}`].fontSize) || data.tableFontSize || 11)));
        ctx.font = `700 ${hdrPx}px Pretendard, Malgun Gothic, sans-serif`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(hTxt || '').slice(0, 18), plotX + cIdx * colW + 8, curY + rowH / 2);
      });
      curY += rowH;
    }
    rows.forEach((rArr, rIdx) => {
      for (let cIdx = 0; cIdx < colCount; cIdx++) {
        const key = `td-${rIdx}-${cIdx}`;
        const customBg = data.cellStyles && data.cellStyles[key] && data.cellStyles[key].bg;
        ctx.fillStyle = customBg || (data.zebraStriping !== false && rIdx % 2 === 1 ? '#F8FAFC' : '#FFFFFF');
        ctx.fillRect(plotX + cIdx * colW, curY, colW, rowH);
        ctx.strokeStyle = '#E2E4E9';
        ctx.strokeRect(plotX + cIdx * colW, curY, colW, rowH);
        const tdPx = Math.max(9, Math.min(36, Number((data.cellStyles && data.cellStyles[key] && data.cellStyles[key].fontSize) || data.tableFontSize || 11)));
        ctx.font = `${(data.highlightFirstCol && cIdx === 0) ? '700' : '500'} ${tdPx}px Pretendard, Malgun Gothic, sans-serif`;
        ctx.fillStyle = '#111111';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(rArr[cIdx] || '').slice(0, 20), plotX + cIdx * colW + 8, curY + rowH / 2);
      }
      curY += rowH;
    });
  }
  ctx.restore();
  return true;
}

function renderChartWidgetToDataUrl(widgetEl, logicalW, logicalH) {
  const w = Math.max(160, Math.round(logicalW || 480));
  const h = Math.max(120, Math.round(logicalH || 280));
  const dpr = 2;
  const c = document.createElement('canvas');
  c.width = w * dpr;
  c.height = h * dpr;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.scale(dpr, dpr);
  if (!drawChartWidgetOnCanvas(ctx, widgetEl, 0, 0, w, h)) return null;
  try { return c.toDataURL('image/png'); } catch (e) { return null; }
}

function renderBeforeAfterToDataUrl(baStage, logicalW, logicalH) {
  if (!baStage) return null;
  const afterImg = baStage.querySelector('.iw-ba-after-img');
  const beforeImg = baStage.querySelector('.iw-ba-before-img');
  if (!afterImg && !beforeImg) return null;
  const w = Math.max(160, Math.round(logicalW || 480));
  const h = Math.max(120, Math.round(logicalH || 280));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const posPct = Math.max(0, Math.min(100, parseFloat(baStage.getAttribute('data-ba-pos') || '50'))) / 100;
  const splitX = Math.round(w * posPct);
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, w, h);
  try {
    if (afterImg && afterImg.complete && afterImg.naturalWidth > 0) ctx.drawImage(afterImg, 0, 0, w, h);
    if (beforeImg && beforeImg.complete && beforeImg.naturalWidth > 0 && splitX > 0) {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, splitX, h); ctx.clip();
      ctx.drawImage(beforeImg, 0, 0, w, h);
      ctx.restore();
    }
    if (splitX > 2 && splitX < w - 2) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(splitX, 0); ctx.lineTo(splitX, h); ctx.stroke();
    }
    return c.toDataURL('image/png');
  } catch (e) {
    return null;
  }
}

function collectExportableSlideBlocks(slideEl) {
  if (!slideEl) return [];
  const std = Array.from(slideEl.querySelectorAll('.slide-header-bar, .slide-card, .ppt-free-obj'));
  const directExtras = Array.from(slideEl.children).filter(ch => {
    if (ch.nodeType !== 1 || ch.tagName !== 'DIV') return false;
    if (ch.classList.contains('slide-bg-layer') || ch.classList.contains('slide-bg-overlay') || ch.classList.contains('slide-grid-body') || ch.classList.contains('ppt-free-layer') || ch.classList.contains('ppt-slide-master-layer') || ch.classList.contains('slide-header-bar') || ch.classList.contains('slide-card')) return false;
    return !std.includes(ch) && (ch.textContent || '').trim().length > 0;
  });
  return directExtras.concat(std);
}

function extractVisualLinesFromTextEl(el) {
  if (!el) return [];
  const c = el.cloneNode(true);
  c.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
  return (c.textContent || '')
    .split(/\r?\n/)
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .filter(line => line.length > 0);
}

async function renderSvgIconToDataUrl(iconWrapEl, logicalW, logicalH) {
  if (!iconWrapEl) return null;
  const svgEl = iconWrapEl.querySelector('svg');
  if (!svgEl) return null;
  const cs = window.getComputedStyle(iconWrapEl);
  const col = cs.color || iconWrapEl.style.color || '#0055FF';
  const cloneSvg = svgEl.cloneNode(true);
  cloneSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const w = Math.max(48, Math.round(logicalW || 96));
  const h = Math.max(48, Math.round(logicalH || 96));
  cloneSvg.setAttribute('width', String(w * 2));
  cloneSvg.setAttribute('height', String(h * 2));
  let xml = new XMLSerializer().serializeToString(cloneSvg);
  xml = xml.replace(/currentColor/g, col);
  const svgUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
  const img = await loadCanvasImageAsync(svgUri);
  if (!img) return null;
  try {
    const c = document.createElement('canvas');
    c.width = w * 2;
    c.height = h * 2;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } catch (e) {
    return null;
  }
}

async function exportDeckAsPPTX() {
  try {
    const baseName = getChosenExportBaseName(), deckTitle = (document.getElementById('headerDeckTitle')?.textContent || baseName).trim(), allSlides = Array.from(document.querySelectorAll('#slideStage .slide'));
    if (allSlides.length === 0) return;
    const stageW = (typeof LOGICAL_STAGE_WIDTH === 'number' && LOGICAL_STAGE_WIDTH > 0) ? LOGICAL_STAGE_WIDTH : 1440;
    const stageH = (typeof LOGICAL_STAGE_HEIGHT === 'number' && LOGICAL_STAGE_HEIGHT > 0) ? LOGICAL_STAGE_HEIGHT : 810;
    const SLIDE_W_EMU = Math.round(stageW * 9525), SLIDE_H_EMU = Math.round(stageH * 9525);
    const pxToEmuX = (px) => Math.round((px / stageW) * SLIDE_W_EMU), pxToEmuY = (px) => Math.round((px / stageH) * SLIDE_H_EMU);
    const accentHex = cssColorToHex6(document.documentElement.style.getPropertyValue('--accent-color') || '#0055FF', '0055FF');
    const shapeGeomMap = {
      rect: 'rect', roundRect: 'roundRect', circle: 'ellipse', pill: 'round2SameRect',
      triangle: 'triangle', diamond: 'diamond', star: 'star5',
      speech: 'wedgeRoundRectCallout', callout: 'wedgeRoundRectCallout',
      arrow: 'rightArrow', arrowRight: 'rightArrow', arrowBoth: 'leftRightArrow',
      line: 'line', textbox: 'rect', freeCard: 'roundRect'
    };

    const entries = [], mediaImages = [], slideCount = allSlides.length;
    const contentTypesOverrides = ['<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>', '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>', '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>', '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>'];
    const presRels = ['<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>', '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>'], presSldIdList = [];

    for (let idx = 0; idx < allSlides.length; idx++) {
      const sEl = allSlides[idx];
      const sNum = idx + 1, rId = `rId${sNum + 2}`;
      presRels.push(`<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${sNum}.xml"/>`);
      presSldIdList.push(`<p:sldId id="${255 + sNum}" r:id="${rId}"/>`);
      contentTypesOverrides.push(`<Override PartName="/ppt/slides/slide${sNum}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`, `<Override PartName="/ppt/notesSlides/notesSlide${sNum}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>`);
      const prevDisplay = sEl.style.display, prevVis = sEl.style.visibility, prevPE = sEl.style.pointerEvents, isActive = sEl.classList.contains('active');
      if (!isActive) { sEl.style.visibility = 'hidden'; sEl.style.pointerEvents = 'none'; sEl.style.display = 'flex'; sEl.classList.add('transition-instant-reset', 'active'); void sEl.offsetWidth; }
      const sRect = sEl.getBoundingClientRect(), scale = typeof getStageScale === 'function' ? getStageScale() : 1;
      const bgHex = cssColorToHex6(sEl.style.backgroundColor || window.getComputedStyle(sEl).backgroundColor, sEl.classList.contains('theme-dark') ? '111111' : 'F5F5F7');
      const slideRelItems = ['<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>', `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide${sNum}.xml"/>`];
      let relCounter = 3, shapeIdCounter = 2; const spTreeXml = [];

      const embedDataUrlPic = (dataUrl, xE, yE, wE, hE, label) => {
        const decoded = dataUrlToUint8Array(dataUrl);
        if (!decoded) return false;
        const imgFileName = `image${mediaImages.length + 1}.${decoded.ext}`;
        mediaImages.push({ name: imgFileName, bytes: decoded.bytes, ext: decoded.ext });
        const imgRelId = `rId${relCounter++}`;
        slideRelItems.push(`<Relationship Id="${imgRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${imgFileName}"/>`);
        const picId = shapeIdCounter++;
        spTreeXml.push(`<p:pic><p:nvPicPr><p:cNvPr id="${picId}" name="${escapeXml(label || ('Picture ' + picId))}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${imgRelId}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="${xE}" y="${yE}"/><a:ext cx="${wE}" cy="${hE}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`);
        return true;
      };

      const getLogicalBox = (el) => {
        const r = el.getBoundingClientRect();
        return (sRect.width > 0 && sRect.height > 0 && r.width > 0 && r.height > 0)
          ? { x: Math.max(0, (r.left - sRect.left) / scale), y: Math.max(0, (r.top - sRect.top) / scale), w: Math.min(stageW, r.width / scale), h: Math.min(stageH, r.height / scale) }
          : { x: 80, y: 80, w: 400, h: 160 };
      };

      // Optional slide background image (.slide-bg-layer)
      const bgLayer = sEl.querySelector(':scope > .slide-bg-layer');
      if (bgLayer && bgLayer.style.backgroundImage) {
        const urlM = bgLayer.style.backgroundImage.match(/url\(["']?(data:image\/[^"')]+)["']?\)/i);
        if (urlM) embedDataUrlPic(urlM[1], 0, 0, SLIDE_W_EMU, SLIDE_H_EMU, 'SlideBackground');
      }

      const exportBlocks = collectExportableSlideBlocks(sEl);
      for (let bi = 0; bi < exportBlocks.length; bi++) {
        const blk = exportBlocks[bi];
        const box = getLogicalBox(blk), xEmu = pxToEmuX(box.x), yEmu = pxToEmuY(box.y), wEmu = Math.max(100000, pxToEmuX(box.w)), hEmu = Math.max(60000, pxToEmuY(box.h));
        const shapeType = blk.getAttribute('data-shape-type') || '';
        const isFreeObj = blk.classList.contains('ppt-free-obj');

        const baStagePptx = blk.querySelector('.iw-ba-stage');
        const rawChartWidget = blk.classList.contains('ppt-chart-widget') ? blk : blk.querySelector('.ppt-chart-widget');
        const chartWidget = (rawChartWidget && !rawChartWidget.closest('.iw-tab-panel:not(.is-active)')) ? rawChartWidget : null;
        const chartData = (chartWidget && typeof readChartData === 'function') ? readChartData(chartWidget) : null;
        const rawTableEl = blk.querySelector('table.ppt-data-table');
        const tableEl = (rawTableEl && !rawTableEl.closest('.iw-tab-panel:not(.is-active)')) ? rawTableEl : null;
        const rawImgEl = blk.querySelector('img.slot-img:not(.hidden), img.inline-media-el, img.iw-hs-base-img, img:not(.iw-ba-img)');
        const imgEl = (rawImgEl && !rawImgEl.closest('.iw-tab-panel:not(.is-active), .iw-flip-back')) ? rawImgEl : null;

        // Determine if this is a pure freeform media/chart/table/before-after wrapper (skip redundant background box)
        const isSvgIconObj = shapeType === 'svg-icon' && Boolean(blk.querySelector('svg'));
        if (isSvgIconObj) {
          const icoPng = await renderSvgIconToDataUrl(blk, box.w, box.h);
          if (icoPng) embedDataUrlPic(icoPng, xEmu, yEmu, wEmu, hEmu, 'VectorIcon');
          continue;
        }
        const isPureFreeWidget = isFreeObj && (
          Boolean(baStagePptx) ||
          Boolean(chartWidget) ||
          Boolean(tableEl) ||
          (Boolean(imgEl) && (!blk.textContent || !blk.textContent.trim()))
        );

        // STEP 1 (BACK LAYER): Native OOXML Vector Shapes & Cards with Exact Per-Paragraph Typography
        if (!isPureFreeWidget) {
          const blkCs = window.getComputedStyle(blk);
          const isVectorShapeBlk = Boolean(shapeType) && !blk.classList.contains('slide-card');
          const svgFillNode = isVectorShapeBlk ? blk.querySelector('svg .shape-fill') : null;
          const svgStrokeNode = isVectorShapeBlk ? blk.querySelector('svg .shape-stroke') : null;
          const svgFillAttr = svgFillNode ? (svgFillNode.getAttribute('fill') || '') : '';
          const svgStrokeAttr = svgStrokeNode ? (svgStrokeNode.getAttribute('stroke') || '') : '';
          const svgStrokeW = svgStrokeNode ? (parseFloat(svgStrokeNode.getAttribute('stroke-width') || '0') || 0) : 0;
          const isArrowShape = shapeType === 'arrow' || shapeType === 'arrowRight' || shapeType === 'arrowBoth';
          const rawBg = (svgFillAttr && svgFillAttr !== 'none') ? svgFillAttr : (blk.style.backgroundColor || blkCs.backgroundColor);
          const isTransparent = !rawBg || rawBg === 'transparent' || rawBg === 'rgba(0, 0, 0, 0)';
          const cardBg = cssColorToHex6(rawBg, sEl.classList.contains('theme-dark') ? '1E293B' : 'FFFFFF');
          const fillXml = (isTransparent || shapeType === 'line') ? '<a:noFill/>' : `<a:solidFill><a:srgbClr val="${cardBg}"/></a:solidFill>`;
          const borderCol = cssColorToHex6((svgStrokeAttr && svgStrokeAttr !== 'none') ? svgStrokeAttr : (blkCs.borderTopColor || blkCs.borderColor || '#E2E4E9'), 'E2E4E9');
          const borderPx = svgStrokeW > 0 ? svgStrokeW : Math.max(parseFloat(blkCs.borderTopWidth) || 0, parseFloat(blkCs.borderWidth) || 0, shapeType === 'line' ? 3 : 0);
          const lnXml = (borderPx > 0 && !isArrowShape) ? `<a:ln w="${Math.round(borderPx * 12700)}"><a:solidFill><a:srgbClr val="${borderCol}"/></a:solidFill></a:ln>` : '<a:ln><a:noFill/></a:ln>';
          const prstGeom = shapeGeomMap[shapeType] || 'roundRect';

          const liveTextNodes = Array.from(blk.querySelectorAll('h1, h2, h3, h4, p, blockquote, li, .shape-inner-text, .card-inner-textbox, span[data-editable], div[data-editable]')).filter(el => {
            if (el.closest('.card-edit-controls, .img-edit-overlay, .sub-box-del-btn, .card-media-controls, .iw-edit-bar, .iw-flip-back, .iw-tab-panel:not(.is-active), .iw-hs-popover:not(.is-open), .ppt-chart-widget, table')) return false;
            if (el.querySelector('h1, h2, h3, h4, p, blockquote, li, table, .ppt-chart-widget')) return false;
            return !el.parentElement || !el.parentElement.closest('h1, h2, h3, h4, p, blockquote, li');
          });
          const lines = [];
          liveTextNodes.forEach(el => {
            const tcs = window.getComputedStyle(el);
            const px = Math.max(9, Math.min(84, Math.round(parseFloat(tcs.fontSize) || 16)));
            const sz100 = Math.round(px * 75);
            const bold = (parseInt(tcs.fontWeight, 10) >= 700 || tcs.fontWeight === 'bold') ? '1' : '0';
            const italic = tcs.fontStyle === 'italic' ? '1' : '0';
            const colorHex = cssColorToHex6(tcs.color, sEl.classList.contains('theme-dark') ? 'F9FAFB' : '111111');
            const align = tcs.textAlign === 'center' ? 'ctr' : (tcs.textAlign === 'right' ? 'r' : 'l');
            extractVisualLinesFromTextEl(el).forEach(seg => {
              lines.push({ text: seg, sz100, bold, italic, colorHex, align });
            });
          });

          const spId = shapeIdCounter++;
          const parasXml = lines.length > 0
            ? lines.map(l => `<a:p><a:pPr algn="${l.align}"/><a:r><a:rPr lang="ko-KR" sz="${l.sz100}" b="${l.bold}" i="${l.italic}"><a:solidFill><a:srgbClr val="${l.colorHex}"/></a:solidFill></a:rPr><a:t>${escapeXml(l.text)}</a:t></a:r></a:p>`).join('')
            : '<a:p><a:endParaRPr lang="ko-KR"/></a:p>';
          spTreeXml.push(`<p:sp><p:nvSpPr><p:cNvPr id="${spId}" name="Shape ${spId}"/><p:cNvSpPr txBox="${shapeType === 'textbox' ? '1' : '0'}"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${xEmu}" y="${yEmu}"/><a:ext cx="${wEmu}" cy="${hEmu}"/></a:xfrm><a:prstGeom prst="${prstGeom}"><a:avLst/></a:prstGeom>${fillXml}${lnXml}</p:spPr><p:txBody><a:bodyPr wrap="square" lIns="120000" tIns="100000" rIns="120000" bIns="100000"/><a:lstStyle/>${parasXml}</p:txBody></p:sp>`);
        }

        // STEP 2 (FRONT LAYER): Before / After Composite PNG ON TOP of card
        if (baStagePptx) {
          const baBox = getLogicalBox(baStagePptx);
          const baUrl = renderBeforeAfterToDataUrl(baStagePptx, baBox.w, baBox.h);
          if (baUrl) embedDataUrlPic(baUrl, pxToEmuX(baBox.x), pxToEmuY(baBox.y), Math.max(120000, pxToEmuX(baBox.w)), Math.max(80000, pxToEmuY(baBox.h)), 'BeforeAfter');
        }

        // STEP 3 (FRONT LAYER): High-Fidelity Chart Widget (Non-table -> 2x Retina PNG) ON TOP of card
        if (chartWidget && chartData && chartData.type !== 'table') {
          const cBox = getLogicalBox(chartWidget);
          const cxE = pxToEmuX(cBox.x), cyE = pxToEmuY(cBox.y), cwE = Math.max(120000, pxToEmuX(cBox.w)), chE = Math.max(80000, pxToEmuY(cBox.h));
          const chartPng = renderChartWidgetToDataUrl(chartWidget, cBox.w, cBox.h);
          if (chartPng) embedDataUrlPic(chartPng, cxE, cyE, cwE, chE, `Chart_${chartData.type}`);
        }

        // STEP 4 (FRONT LAYER): Native PowerPoint Editable Data Table with Exact OOXML Merged Cells ON TOP of card
        if (tableEl) {
          const wData = chartData;
          const headers = (wData && Array.isArray(wData.tableHeaders) && wData.tableHeaders.length > 0) ? wData.tableHeaders : null;
          const bodyRows = (wData && Array.isArray(wData.tableRows)) ? wData.tableRows : null;
          const showHdr = !wData || wData.showHeaderRow !== false;
          const domRows = Array.from(tableEl.querySelectorAll('tr'));
          const colCount = headers ? headers.length : Math.max(1, ...domRows.map(tr => tr.children.length));
          const totalRows = headers ? ((showHdr ? 1 : 0) + (bodyRows ? bodyRows.length : 0)) : domRows.length;
          if (totalRows > 0 && colCount > 0) {
            const tBox = getLogicalBox(tableEl);
            const txE = pxToEmuX(tBox.x), tyE = pxToEmuY(tBox.y), twE = Math.max(120000, pxToEmuX(tBox.w)), thE = Math.max(80000, pxToEmuY(tBox.h));
            const colW = Math.floor(twE / colCount), rowH = Math.floor(thE / totalRows);
            const gridCols = Array.from({ length: colCount }, () => `<a:gridCol w="${colW}"/>`).join('');
            const merges = (wData && wData.merges) || {};
            const hiddenCells = (wData && wData.hiddenCells) || {};
            const cellStyles = (wData && wData.cellStyles) || {};
            const colAligns = (wData && wData.colAligns) || {};

            const buildCellXml = (txt, isTh, cellKey, cIdx, rowOrd, mergeObj, isHidden, coveredByCol, coveredByRow) => {
              const mergeAttrs = [
                mergeObj && mergeObj.colspan > 1 ? ` gridSpan="${mergeObj.colspan}"` : '',
                mergeObj && mergeObj.rowspan > 1 ? ` rowSpan="${mergeObj.rowspan}"` : '',
                isHidden && coveredByCol ? ' hMerge="1"' : '',
                isHidden && coveredByRow ? ' vMerge="1"' : ''
              ].join('');
              const customBg = (cellStyles[cellKey] && cellStyles[cellKey].bg) ? cssColorToHex6(cellStyles[cellKey].bg, '') : '';
              const customFg = (cellStyles[cellKey] && cellStyles[cellKey].color) ? cssColorToHex6(cellStyles[cellKey].color, '') : '';
              const fillHex = customBg || (isTh ? accentHex : (rowOrd % 2 === 1 ? 'FFFFFF' : 'F5F5F7'));
              const txtHex = customFg || (isTh ? 'FFFFFF' : '111111');
              const colAlign = colAligns[String(cIdx)] || 'left';
              const algn = colAlign === 'center' ? 'ctr' : (colAlign === 'right' ? 'r' : 'l');
              const domCellEl = tableEl ? tableEl.querySelector(`[data-cell-key="${cellKey}"]`) : null;
              const domPx = domCellEl ? parseFloat(window.getComputedStyle(domCellEl).fontSize) : 0;
              const cellFontPx = Number((cellStyles[cellKey] && cellStyles[cellKey].fontSize) || (wData && wData.tableFontSize) || domPx || 15);
              const ooxmlSz = Math.max(800, Math.min(7200, Math.round(cellFontPx * 75)));
              const safeTxt = isHidden ? '' : String(txt || '').trim();
              return `<a:tc${mergeAttrs}><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:pPr algn="${algn}"/><a:r><a:rPr lang="ko-KR" sz="${ooxmlSz}" b="${isTh ? '1' : '0'}"><a:solidFill><a:srgbClr val="${txtHex}"/></a:solidFill></a:rPr><a:t>${escapeXml(safeTxt)}</a:t></a:r></a:p></a:txBody><a:tcPr><a:solidFill><a:srgbClr val="${fillHex}"/></a:solidFill></a:tcPr></a:tc>`;
            };

            const trXmlParts = [];
            if (headers && bodyRows) {
              if (showHdr) {
                const cells = Array.from({ length: colCount }, (_, cIdx) => {
                  const ck = `th-${cIdx}`;
                  const isHid = Boolean(hiddenCells[ck]);
                  return buildCellXml(headers[cIdx], true, ck, cIdx, 0, merges[ck], isHid, isHid, false);
                }).join('');
                trXmlParts.push(`<a:tr h="${rowH}">${cells}</a:tr>`);
              }
              bodyRows.forEach((rArr, rIdx) => {
                const cells = Array.from({ length: colCount }, (_, cIdx) => {
                  const ck = `td-${rIdx}-${cIdx}`;
                  const isHid = Boolean(hiddenCells[ck]);
                  let byCol = false, byRow = false;
                  if (isHid) {
                    Object.keys(merges).forEach(mk => {
                      if (!mk.startsWith('td-')) return;
                      const p = mk.split('-'), mr = parseInt(p[1], 10), mc = parseInt(p[2], 10), m = merges[mk];
                      if (rIdx >= mr && rIdx < mr + (m.rowspan || 1) && cIdx >= mc && cIdx < mc + (m.colspan || 1)) {
                        if (cIdx > mc) byCol = true;
                        if (rIdx > mr) byRow = true;
                      }
                    });
                    if (!byCol && !byRow) byCol = true;
                  }
                  return buildCellXml(rArr[cIdx], false, ck, cIdx, rIdx + 1, merges[ck], isHid, byCol, byRow);
                }).join('');
                trXmlParts.push(`<a:tr h="${rowH}">${cells}</a:tr>`);
              });
            } else {
              domRows.forEach((tr, rIdx) => {
                const cells = Array.from({ length: colCount }, (_, cIdx) => {
                  const cell = tr.children[cIdx];
                  const isTh = Boolean(cell && cell.tagName === 'TH');
                  return buildCellXml(cell ? cell.textContent.trim() : '', isTh, cell ? (cell.getAttribute('data-cell-key') || '') : '', cIdx, rIdx, null, false, false, false);
                }).join('');
                trXmlParts.push(`<a:tr h="${rowH}">${cells}</a:tr>`);
              });
            }
            const tblId = shapeIdCounter++;
            spTreeXml.push(`<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="${tblId}" name="Table ${tblId}"/><p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="${txE}" y="${tyE}"/><a:ext cx="${twE}" cy="${thE}"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblPr firstRow="1" bandRow="1"/><a:tblGrid>${gridCols}</a:tblGrid>${trXmlParts.join('')}</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`);
          }
        }

        // STEP 5 (FRONT LAYER): Embedded Images ON TOP of card
        if (imgEl && imgEl.src && imgEl.src.startsWith('data:image/')) {
          const imgBox = getLogicalBox(imgEl);
          const ixEmu = pxToEmuX(imgBox.x), iyEmu = pxToEmuY(imgBox.y), iwEmu = Math.max(80000, pxToEmuX(imgBox.w)), ihEmu = Math.max(60000, pxToEmuY(imgBox.h));
          embedDataUrlPic(imgEl.src, ixEmu, iyEmu, iwEmu, ihEmu, `Image_${shapeIdCounter}`);
        }
      }

      if (!isActive) { sEl.classList.remove('active', 'transition-instant-reset'); sEl.style.display = prevDisplay; sEl.style.visibility = prevVis; sEl.style.pointerEvents = prevPE; }
      const speakerNotes = (sEl.getAttribute('data-speaker-notes') || '').trim();
      const hiddenSlideAttr = sEl.getAttribute('data-slide-hidden') === 'true' ? ' show="0"' : '';
      entries.push(
        { name: `ppt/slides/slide${sNum}.xml`, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld${hiddenSlideAttr} xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="${bgHex}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${spTreeXml.join('')}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>` },
        { name: `ppt/slides/_rels/slide${sNum}.xml.rels`, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${slideRelItems.join('')}</Relationships>` },
        { name: `ppt/notesSlides/notesSlide${sNum}.xml`, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/><p:sp><p:nvSpPr><p:cNvPr id="2" name="Notes Placeholder 2"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>${(speakerNotes ? speakerNotes.split(/\r?\n/) : ['']).map(nl => `<a:p><a:r><a:rPr lang="ko-KR" sz="1200"/><a:t>${escapeXml(nl)}</a:t></a:r></a:p>`).join('')}</p:txBody></p:sp></p:spTree></p:cSld></p:notes>` },
        { name: `ppt/notesSlides/_rels/notesSlide${sNum}.xml.rels`, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="../slides/slide${sNum}.xml"/></Relationships>` }
      );
    }
    mediaImages.forEach(img => entries.push({ name: `ppt/media/${img.name}`, data: img.bytes }));
    entries.unshift(
      { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-officedocument.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="gif" ContentType="image/gif"/><Default Extension="webp" ContentType="image/webp"/>${contentTypesOverrides.join('')}</Types>` },
      { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>' },
      { name: 'ppt/presentation.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${presSldIdList.join('')}</p:sldIdLst><p:sldSz cx="${SLIDE_W_EMU}" cy="${SLIDE_H_EMU}"/><p:notesSz cx="${SLIDE_H_EMU}" cy="${SLIDE_W_EMU}"/></p:presentation>` },
      { name: 'ppt/_rels/presentation.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${presRels.join('')}</Relationships>` },
      { name: 'ppt/slideMasters/slideMaster1.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>' },
      { name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>' },
      { name: 'ppt/slideLayouts/slideLayout1.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld></p:sldLayout>' },
      { name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>' },
      { name: 'ppt/theme/theme1.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="${escapeXml(deckTitle)}"><a:themeElements><a:clrScheme name="Office"><a:dk1><a:srgbClr val="111111"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1E293B"/></a:dk2><a:lt2><a:srgbClr val="F5F5F7"/></a:lt2><a:accent1><a:srgbClr val="${accentHex}"/></a:accent1><a:accent2><a:srgbClr val="059669"/></a:accent2><a:accent3><a:srgbClr val="D97706"/></a:accent3><a:accent4><a:srgbClr val="7C3AED"/></a:accent4><a:accent5><a:srgbClr val="E11D48"/></a:accent5><a:accent6><a:srgbClr val="0284C7"/></a:accent6><a:hlink><a:srgbClr val="${accentHex}"/></a:hlink><a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink></a:clrScheme><a:fontScheme name="Office"><a:majorFont><a:latin typeface="Pretendard"/></a:majorFont><a:minorFont><a:latin typeface="Pretendard"/></a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>` }
    );
    triggerDownloadBlob(buildZipBlobFromEntries(entries, 'application/vnd.openxmlformats-officedocument.presentationml.presentation'), `${baseName}.pptx`);
    showToast(`${baseName}.pptx 고충실도 PowerPoint 내보내기 완료! (${slideCount}장)`);
  } catch (err) { console.error('[HTML Slide Tool] PPTX 내보내기 오류:', err); showToast('PPTX 파일 생성 중 오류가 발생했습니다.'); }
}

function extractCssBgImageUrl(cssBgStr) {
  if (!cssBgStr || !cssBgStr.includes('url(')) return '';
  const m = cssBgStr.match(/url\(\s*["']?([^"')]+)["']?\s*\)/i);
  return m ? m[1].trim() : '';
}

function loadCanvasImageAsync(srcUrl) {
  return new Promise((resolve) => {
    if (!srcUrl) { resolve(null); return; }
    const img = new Image();
    const timer = setTimeout(() => resolve(null), 1500);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = srcUrl;
  });
}

function drawCoverImageOnCanvas(ctx, img, x, y, w, h, fitMode) {
  if (!img || !img.naturalWidth || !img.naturalHeight) return;
  const nw = img.naturalWidth, nh = img.naturalHeight;
  const srcRatio = nw / Math.max(1, nh), dstRatio = w / Math.max(1, h);
  if (fitMode === 'contain') {
    let dw = w, dh = h;
    if (srcRatio > dstRatio) dh = w / srcRatio; else dw = h * srcRatio;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  } else {
    let sx = 0, sy = 0, sw = nw, sh = nh;
    if (srcRatio > dstRatio) { sw = nh * dstRatio; sx = (nw - sw) / 2; }
    else { sh = nw / dstRatio; sy = (nh - sh) / 2; }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }
}

async function exportSlideOrElementAsImage(scope, format) {
  const fmt = format === 'jpg' ? 'jpg' : 'png', mime = fmt === 'jpg' ? 'image/jpeg' : 'image/png', activeSlideEl = slides[currentSlide - 1];
  if (!activeSlideEl) return;
  const stageW = (typeof LOGICAL_STAGE_WIDTH === 'number' && LOGICAL_STAGE_WIDTH > 0) ? LOGICAL_STAGE_WIDTH : 1440;
  const stageH = (typeof LOGICAL_STAGE_HEIGHT === 'number' && LOGICAL_STAGE_HEIGHT > 0) ? LOGICAL_STAGE_HEIGHT : 810;
  const targetBox = (scope === 'selected' && selectedElement && activeSlideEl.contains(selectedElement)) ? selectedElement : activeSlideEl;
  const sRect = activeSlideEl.getBoundingClientRect(), tRect = targetBox.getBoundingClientRect(), scale = typeof getStageScale === 'function' ? getStageScale() : 1;
  const logicalW = targetBox === activeSlideEl ? stageW : Math.max(120, Math.round(tRect.width / scale));
  const logicalH = targetBox === activeSlideEl ? stageH : Math.max(80, Math.round(tRect.height / scale));
  const offsetX = targetBox === activeSlideEl ? 0 : Math.round((tRect.left - sRect.left) / scale);
  const offsetY = targetBox === activeSlideEl ? 0 : Math.round((tRect.top - sRect.top) / scale);
  const canvas = document.createElement('canvas'); canvas.width = logicalW; canvas.height = logicalH; const ctx = canvas.getContext('2d');

  // 1. Slide Solid / Gradient / Photo Background (.slide-bg-layer)
  if (fmt === 'jpg' || targetBox === activeSlideEl) {
    const sCs = window.getComputedStyle(activeSlideEl);
    const slideBgLayer = activeSlideEl.querySelector(':scope > .slide-bg-layer');
    const slideBgOverlay = activeSlideEl.querySelector(':scope > .slide-bg-overlay');
    const sGradCss = [activeSlideEl.style.backgroundImage, slideBgLayer && slideBgLayer.style.backgroundImage, sCs.backgroundImage].find(v => v && v.includes('gradient(')) || '';
    const sGrad = parseCssGradientForCanvas(ctx, sGradCss, 0, 0, logicalW, logicalH);
    ctx.fillStyle = sGrad || activeSlideEl.style.backgroundColor || sCs.backgroundColor || '#F5F5F7';
    ctx.fillRect(0, 0, logicalW, logicalH);
    const slideBgUrl = extractCssBgImageUrl((slideBgLayer && slideBgLayer.style.backgroundImage) || activeSlideEl.style.backgroundImage || '');
    if (slideBgUrl) {
      const bgImgObj = await loadCanvasImageAsync(slideBgUrl);
      if (bgImgObj) {
        ctx.save();
        const blCs = slideBgLayer ? window.getComputedStyle(slideBgLayer) : sCs;
        const blOp = parseFloat(blCs.opacity);
        if (!isNaN(blOp) && blOp < 1) ctx.globalAlpha = Math.max(0.05, blOp);
        if (blCs.filter && blCs.filter !== 'none') ctx.filter = blCs.filter;
        drawCoverImageOnCanvas(ctx, bgImgObj, -offsetX, -offsetY, stageW, stageH, blCs.backgroundSize === 'contain' ? 'contain' : 'cover');
        ctx.restore();
      }
    }
    if (slideBgOverlay && slideBgOverlay.style.backgroundImage && slideBgOverlay.style.backgroundImage.includes('gradient(')) {
      const ovGrad = parseCssGradientForCanvas(ctx, slideBgOverlay.style.backgroundImage, 0, 0, logicalW, logicalH);
      if (ovGrad) { ctx.fillStyle = ovGrad; ctx.fillRect(0, 0, logicalW, logicalH); }
    }
  }

  // 2. Render Cards, Headers, Freeform Shapes, Charts, Media & Hotspot Pins in DOM stacking order
  const blocks = targetBox === activeSlideEl ? collectExportableSlideBlocks(activeSlideEl) : [targetBox];
  const cardBgImageMap = new Map();
  for (let bi = 0; bi < blocks.length; bi++) {
    const bNode = blocks[bi];
    const cBgLayer = bNode.querySelector(':scope > .card-bg-layer');
    const cUrl = extractCssBgImageUrl((cBgLayer && cBgLayer.style.backgroundImage) || bNode.style.backgroundImage || '');
    if (cUrl) {
      const loaded = await loadCanvasImageAsync(cUrl);
      if (loaded) cardBgImageMap.set(bNode, { img: loaded, layer: cBgLayer });
    }
    if (bNode.getAttribute('data-shape-type') === 'svg-icon' && bNode.querySelector('svg')) {
      const br0 = bNode.getBoundingClientRect();
      const icoUrl = await renderSvgIconToDataUrl(bNode, Math.max(48, br0.width / scale), Math.max(48, br0.height / scale));
      if (icoUrl) {
        const icoImg = await loadCanvasImageAsync(icoUrl);
        if (icoImg) cardBgImageMap.set(bNode, { img: icoImg, isSvgIcon: true });
      }
    }
  }
  blocks.forEach(blk => {
    const br = blk.getBoundingClientRect(), bx = Math.round((br.left - sRect.left) / scale) - offsetX, by = Math.round((br.top - sRect.top) / scale) - offsetY, bw = Math.round(br.width / scale), bh = Math.round(br.height / scale);
    if (bw <= 0 || bh <= 0) return;
    const cs = window.getComputedStyle(blk);
    const opacityVal = parseFloat(cs.opacity);
    const radius = parseFloat(cs.borderRadius) || 12;
    const shapeType = blk.getAttribute('data-shape-type') || '';

    ctx.save();
    if (!isNaN(opacityVal) && opacityVal < 1) ctx.globalAlpha = Math.max(0.05, opacityVal);

    // Draw surface (solid, gradient, OR SVG vector .shape-fill/.shape-stroke) & shape geometry
    const isVectorShapeBlk = Boolean(shapeType) && !blk.classList.contains('slide-card');
    const svgFillEl = isVectorShapeBlk ? blk.querySelector('svg .shape-fill') : null;
    const svgStrokeEl = isVectorShapeBlk ? blk.querySelector('svg .shape-stroke') : null;
    const svgFillCol = svgFillEl ? (svgFillEl.getAttribute('fill') || '') : '';
    const svgStrokeCol = svgStrokeEl ? (svgStrokeEl.getAttribute('stroke') || '') : '';
    const svgStrokeWidth = svgStrokeEl ? (parseFloat(svgStrokeEl.getAttribute('stroke-width') || '0') || 0) : 0;
    const cBgLayerEl = blk.querySelector(':scope > .card-bg-layer');
    const cBgTintEl = blk.querySelector(':scope > .card-bg-tint');
    const blkGradCss = [blk.style.backgroundImage, cBgTintEl && cBgTintEl.style.backgroundImage, cBgLayerEl && cBgLayerEl.style.backgroundImage, cs.backgroundImage].find(v => v && v.includes('gradient(')) || '';
    const bgGrad = parseCssGradientForCanvas(ctx, blkGradCss, bx, by, bw, bh);
    const bgCol = (svgFillCol && svgFillCol !== 'none') ? svgFillCol : cs.backgroundColor;
    const hasSolidBg = bgCol && bgCol !== 'rgba(0, 0, 0, 0)' && bgCol !== 'transparent';
    if (shapeType === 'line') {
      drawFreeShapePathOnCanvas(ctx, 'line', bx, by, bw, bh, radius);
      ctx.strokeStyle = (svgStrokeCol && svgStrokeCol !== 'none') ? svgStrokeCol : (cs.borderTopColor || '#111111');
      ctx.lineWidth = Math.max(2, svgStrokeWidth || parseFloat(cs.borderTopWidth) || 3);
      ctx.lineCap = 'round';
      ctx.stroke();
    } else if (bgGrad || hasSolidBg) {
      drawFreeShapePathOnCanvas(ctx, shapeType, bx, by, bw, bh, radius);
      ctx.fillStyle = bgGrad || bgCol;
      ctx.fill();
      const isArrowS = shapeType === 'arrow' || shapeType === 'arrowRight' || shapeType === 'arrowBoth';
      const bW = svgStrokeWidth > 0 ? svgStrokeWidth : (parseFloat(cs.borderTopWidth) || 1);
      if (bW > 0 && !isArrowS) {
        if (cs.borderTopStyle === 'dashed') ctx.setLineDash([6, 4]);
        else if (cs.borderTopStyle === 'dotted') ctx.setLineDash([2, 3]);
        ctx.strokeStyle = (svgStrokeCol && svgStrokeCol !== 'none') ? svgStrokeCol : (cs.borderTopColor || '#E2E4E9');
        ctx.lineWidth = bW;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw uploaded Card Background Photo (.card-bg-layer) OR Vector SVG Icon
    if (cardBgImageMap.has(blk)) {
      const bgInfo = cardBgImageMap.get(blk);
      try {
        ctx.save();
        if (bgInfo.isSvgIcon) {
          drawCoverImageOnCanvas(ctx, bgInfo.img, bx, by, bw, bh, 'contain');
        } else {
          drawFreeShapePathOnCanvas(ctx, shapeType, bx, by, bw, bh, radius);
          ctx.clip();
          const lCs = bgInfo.layer ? window.getComputedStyle(bgInfo.layer) : cs;
          const lOp = parseFloat(lCs.opacity);
          if (!isNaN(lOp) && lOp < 1) ctx.globalAlpha *= Math.max(0.05, lOp);
          if (lCs.filter && lCs.filter !== 'none') ctx.filter = lCs.filter;
          drawCoverImageOnCanvas(ctx, bgInfo.img, bx, by, bw, bh, lCs.backgroundSize === 'contain' ? 'contain' : 'cover');
        }
        ctx.restore();
      } catch (e) {}
    }

    // Draw high-fidelity chart/table widget if present (skip hidden inactive tab panels!)
    const rawChartW = blk.classList.contains('ppt-chart-widget') ? blk : blk.querySelector('.ppt-chart-widget');
    const chartW = (rawChartW && !rawChartW.closest('.iw-tab-panel:not(.is-active)')) ? rawChartW : null;
    if (chartW) {
      const cr = chartW.getBoundingClientRect();
      const cx = Math.round((cr.left - sRect.left) / scale) - offsetX;
      const cy = Math.round((cr.top - sRect.top) / scale) - offsetY;
      const cw = Math.round(cr.width / scale);
      const ch = Math.round(cr.height / scale);
      drawChartWidgetOnCanvas(ctx, chartW, cx, cy, cw, ch);
    }

    // Draw Before / After comparison widget cleanly (respects split position!)
    const baStage = blk.querySelector('.iw-ba-stage');
    if (baStage) {
      const afterImg = baStage.querySelector('.iw-ba-after-img');
      const beforeImg = baStage.querySelector('.iw-ba-before-img');
      const barRect = baStage.getBoundingClientRect();
      const ux = Math.round((barRect.left - sRect.left) / scale) - offsetX;
      const uy = Math.round((barRect.top - sRect.top) / scale) - offsetY;
      const uw = Math.max(20, Math.round(barRect.width / scale));
      const uh = Math.max(20, Math.round(barRect.height / scale));
      const posPct = Math.max(0, Math.min(100, parseFloat(baStage.getAttribute('data-ba-pos') || '50'))) / 100;
      const splitX = ux + Math.round(uw * posPct);
      try {
        ctx.save();
        drawRoundedRectPath(ctx, ux, uy, uw, uh, 12);
        ctx.clip();
        if (afterImg && afterImg.complete && afterImg.naturalWidth > 0) ctx.drawImage(afterImg, ux, uy, uw, uh);
        if (beforeImg && beforeImg.complete && beforeImg.naturalWidth > 0) {
          ctx.save();
          ctx.beginPath(); ctx.rect(ux, uy, splitX - ux, uh); ctx.clip();
          ctx.drawImage(beforeImg, ux, uy, uw, uh);
          ctx.restore();
        }
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(splitX, uy); ctx.lineTo(splitX, uy + uh); ctx.stroke();
        ctx.restore();
      } catch (e) {}
    }

    // Draw images or video frames with cover/contain + flip + CSS filters
    const mediaEl = blk.querySelector('img.slot-img:not(.hidden), img.inline-media-el, img.iw-hs-base-img, img:not(.iw-ba-img), video');
    if (mediaEl && !mediaEl.closest('.ppt-chart-widget')) {
      const isVid = mediaEl.tagName === 'VIDEO';
      const ready = isVid ? (mediaEl.readyState >= 2 && mediaEl.videoWidth > 0) : (mediaEl.complete && mediaEl.naturalWidth > 0);
      if (ready) {
        const ir = mediaEl.getBoundingClientRect(), ix = Math.round((ir.left - sRect.left) / scale) - offsetX, iy = Math.round((ir.top - sRect.top) / scale) - offsetY, iw = Math.max(10, Math.round(ir.width / scale)), ih = Math.max(10, Math.round(ir.height / scale));
        const nw = isVid ? mediaEl.videoWidth : mediaEl.naturalWidth, nh = isVid ? mediaEl.videoHeight : mediaEl.naturalHeight;
        const isContain = window.getComputedStyle(mediaEl).objectFit === 'contain';
        try {
          ctx.save();
          drawRoundedRectPath(ctx, ix, iy, iw, ih, Math.max(4, radius - 4));
          ctx.clip();
          const mCs = window.getComputedStyle(mediaEl);
          if (mCs.filter && mCs.filter !== 'none') ctx.filter = mCs.filter;
          const flipX = mediaEl.getAttribute('data-img-flip-x') === 'true' ? -1 : 1;
          const flipY = mediaEl.getAttribute('data-img-flip-y') === 'true' ? -1 : 1;
          if (flipX < 0 || flipY < 0) {
            ctx.translate(ix + iw / 2, iy + ih / 2);
            ctx.scale(flipX, flipY);
            ctx.translate(-(ix + iw / 2), -(iy + ih / 2));
          }
          const srcRatio = nw / Math.max(1, nh), dstRatio = iw / Math.max(1, ih);
          if (isContain) {
            let dw = iw, dh = ih;
            if (srcRatio > dstRatio) dh = iw / srcRatio; else dw = ih * srcRatio;
            ctx.drawImage(mediaEl, ix + (iw - dw) / 2, iy + (ih - dh) / 2, dw, dh);
          } else {
            let sx = 0, sy = 0, sw = nw, sh = nh;
            if (srcRatio > dstRatio) { sw = nh * dstRatio; sx = (nw - sw) / 2; }
            else { sh = nw / dstRatio; sy = (nh - sh) / 2; }
            ctx.drawImage(mediaEl, sx, sy, sw, sh, ix, iy, iw, ih);
          }
          ctx.restore();
        } catch (e) {}
      }
    }

    // Draw crisp typography with alignment, font-family, weight & line wrapping
    const textSel = 'h1, h2, h3, h4, p, blockquote, li, .shape-inner-text, .card-inner-textbox, span[data-editable], div[data-editable]';
    const rawTextCandidates = blk.matches(textSel) ? [blk, ...Array.from(blk.querySelectorAll(textSel))] : Array.from(blk.querySelectorAll(textSel));
    const textNodes = rawTextCandidates.filter(el => {
      if (el.closest('.card-edit-controls, .img-edit-overlay, .card-media-controls, .iw-edit-bar, .iw-flip-back, .iw-tab-panel:not(.is-active), .iw-hs-popover, .ppt-chart-widget, table')) return false;
      if (el.querySelector('h1, h2, h3, h4, p, blockquote, li, .shape-inner-text, .card-inner-textbox, .ppt-chart-widget')) return false;
      return !el.parentElement || !el.parentElement.closest('h1, h2, h3, h4, p, blockquote, li');
    });
    textNodes.forEach(tEl => {
      const tr = tEl.getBoundingClientRect(), tx = Math.round((tr.left - sRect.left) / scale) - offsetX, ty = Math.round((tr.top - sRect.top) / scale) - offsetY, tw = Math.max(40, Math.round(tr.width / scale)), tcs = window.getComputedStyle(tEl);
      const fontSize = Math.max(10, Math.min(140, Math.round(parseFloat(tcs.fontSize) || 16)));
      const fontWeight = (parseInt(tcs.fontWeight, 10) >= 700 || tcs.fontWeight === 'bold') ? '800' : '500';
      const fontStyle = tcs.fontStyle === 'italic' ? 'italic ' : '';
      const fontFam = (tcs.fontFamily || 'Pretendard, Malgun Gothic, sans-serif');
      const align = tcs.textAlign === 'center' ? 'center' : (tcs.textAlign === 'right' ? 'right' : 'left');
      const anchorX = align === 'center' ? (tx + tw / 2) : (align === 'right' ? (tx + tw) : tx);

      ctx.save();
      ctx.font = `${fontStyle}${fontWeight} ${fontSize}px ${fontFam}`;
      ctx.fillStyle = tcs.color || '#111111';
      ctx.textAlign = align;
      ctx.textBaseline = 'top';
      const paragraphs = (tEl.innerText || tEl.textContent || '').split(/\n/);
      let cursorY = ty;
      const lineStep = Math.round(fontSize * 1.35);
      paragraphs.forEach(para => {
        const words = para.trim().split(/\s+/).filter(Boolean);
        if (words.length === 0) { cursorY += Math.round(lineStep * 0.6); return; }
        let line = '';
        words.forEach(word => {
          const test = line ? `${line} ${word}` : word;
          if (ctx.measureText(test).width > tw && line) {
            ctx.fillText(line, anchorX, cursorY);
            line = word;
            cursorY += lineStep;
          } else {
            line = test;
          }
        });
        if (line) { ctx.fillText(line, anchorX, cursorY); cursorY += lineStep; }
      });
      ctx.restore();
    });
    ctx.restore();
  });

  // 3. Draw Hotspot Numbered Pins (.iw-hs-pin) on top of media
  const hsPins = Array.from(targetBox.querySelectorAll('.iw-hs-pin'));
  const accentHexPin = (document.documentElement.style.getPropertyValue('--accent-color') || '#0055FF').trim();
  hsPins.forEach((pin, pIdx) => {
    const pr = pin.getBoundingClientRect();
    if (pr.width <= 0 || pr.height <= 0) return;
    const pcx = Math.round(((pr.left + pr.width / 2) - sRect.left) / scale) - offsetX;
    const pcy = Math.round(((pr.top + pr.height / 2) - sRect.top) / scale) - offsetY;
    const dotTxt = (pin.querySelector('.iw-hs-dot')?.textContent || String(pIdx + 1)).trim();
    ctx.save();
    ctx.beginPath();
    ctx.arc(pcx, pcy, 14, 0, Math.PI * 2);
    ctx.fillStyle = accentHexPin;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
    ctx.font = '900 11px JetBrains Mono, monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(dotTxt, pcx, pcy + 0.5);
    ctx.restore();
  });

  // 4. Draw Magnetic Connectors (svg.ppt-connectors-layer) on Slide Export
  if (targetBox === activeSlideEl) {
    activeSlideEl.querySelectorAll('svg.ppt-connectors-layer .ppt-connector-item').forEach(grp => {
      const ln = grp.querySelector('line'), poly = grp.querySelector('polygon');
      const col = grp.getAttribute('data-connector-color') || (ln && ln.getAttribute('stroke')) || accentHexPin;
      ctx.save();
      if (ln) {
        const x1 = parseFloat(ln.getAttribute('x1') || '0'), y1 = parseFloat(ln.getAttribute('y1') || '0');
        const x2 = parseFloat(ln.getAttribute('x2') || '0'), y2 = parseFloat(ln.getAttribute('y2') || '0');
        ctx.strokeStyle = col;
        ctx.lineWidth = parseFloat(ln.getAttribute('stroke-width') || '3.5') || 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      if (poly) {
        const pts = (poly.getAttribute('points') || '').trim().split(/\s+/).map(p => p.split(',').map(Number)).filter(a => a.length === 2 && !isNaN(a[0]) && !isNaN(a[1]));
        if (pts.length >= 3) {
          ctx.fillStyle = col;
          ctx.beginPath();
          pts.forEach((pt, idx) => { if (idx === 0) ctx.moveTo(pt[0], pt[1]); else ctx.lineTo(pt[0], pt[1]); });
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
    });
  }

  const baseName = getChosenExportBaseName(), suffix = scope === 'selected' ? `P${String(currentSlide).padStart(2, '0')}_선택요소` : `P${String(currentSlide).padStart(2, '0')}_슬라이드`, fileName = `${baseName}_${suffix}.${fmt}`;
  canvas.toBlob((blob) => { if (!blob) return; triggerDownloadBlob(blob, fileName); showToast(`${fileName} 고충실도 이미지 내보내기 완료!`); }, mime, 0.94);
}

async function extractZipEntriesFromBuffer(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  const decoder = new TextDecoder('utf-8');
  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65558); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocdOffset = i; break; }
  }
  if (eocdOffset === -1) throw new Error('Invalid ZIP/PPTX archive');
  const cdOffset = view.getUint32(eocdOffset + 16, true);
  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const map = new Map();
  let ptr = cdOffset;
  for (let idx = 0; idx < totalEntries; idx++) {
    if (ptr + 46 > bytes.length || view.getUint32(ptr, true) !== 0x02014b50) break;
    const method = view.getUint16(ptr + 10, true);
    const compSize = view.getUint32(ptr + 20, true);
    const nameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localOffset = view.getUint32(ptr + 42, true);
    const entryName = decoder.decode(bytes.slice(ptr + 46, ptr + 46 + nameLen));
    ptr += 46 + nameLen + extraLen + commentLen;

    if (localOffset + 30 <= bytes.length && view.getUint32(localOffset, true) === 0x04034b50) {
      const lNameLen = view.getUint16(localOffset + 26, true);
      const lExtraLen = view.getUint16(localOffset + 28, true);
      const dataStart = localOffset + 30 + lNameLen + lExtraLen;
      if (entryName.endsWith('/')) continue;
      const compBytes = bytes.slice(dataStart, dataStart + compSize);
      if (method === 0) {
        map.set(entryName, compBytes);
      } else if (method === 8 && typeof DecompressionStream === 'function') {
        if (compBytes.length === 0) { map.set(entryName, new Uint8Array(0)); continue; }
        try {
          const stream = new Blob([compBytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
          const outBuf = await new Response(stream).arrayBuffer();
          map.set(entryName, new Uint8Array(outBuf));
        } catch (entryErr) {
          console.warn('[HTML Slide Tool] ZIP 항목 압축 해제 건너뜀:', entryName, entryErr);
        }
      }
    }
  }
  return map;
}

function uint8ToDataUrl(u8, ext) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    bin += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
  }
  const mime = ext === 'png' ? 'image/png' : (ext === 'gif' ? 'image/gif' : (ext === 'webp' ? 'image/webp' : 'image/jpeg'));
  return `data:${mime};base64,${btoa(bin)}`;
}

function triggerImportPptxFile() {
  const inp = document.getElementById('pptxFileImporter');
  if (!inp) return;
  if (!inp.dataset.bound) {
    inp.dataset.bound = 'true';
    inp.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const buf = await file.arrayBuffer();
        const entries = await extractZipEntriesFromBuffer(buf);
        const decoder = new TextDecoder('utf-8');
        const parser = new DOMParser();
        let slideKeys = [];
        if (entries.has('ppt/presentation.xml') && entries.has('ppt/_rels/presentation.xml.rels')) {
          try {
            const pDoc = parser.parseFromString(decoder.decode(entries.get('ppt/presentation.xml')), 'application/xml');
            const prDoc = parser.parseFromString(decoder.decode(entries.get('ppt/_rels/presentation.xml.rels')), 'application/xml');
            const prMap = new Map();
            Array.from(prDoc.getElementsByTagName('Relationship')).forEach(r => prMap.set(r.getAttribute('Id'), r.getAttribute('Target')));
            Array.from(pDoc.getElementsByTagNameNS('*', 'sldId')).forEach(sNode => {
              const rid = sNode.getAttribute('r:id') || sNode.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
              const tgt = rid ? prMap.get(rid) : null;
              if (tgt) {
                const normKey = 'ppt/' + tgt.replace(/^\/+/, '').replace(/^\.\.\//, '').replace(/^ppt\//i, '');
                if (entries.has(normKey) && !slideKeys.includes(normKey)) slideKeys.push(normKey);
              }
            });
          } catch (ordErr) {}
        }
        if (slideKeys.length === 0) {
          slideKeys = Array.from(entries.keys())
            .filter(k => /^ppt\/slides\/slide\d+\.xml$/i.test(k))
            .sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));
        }
        if (slideKeys.length === 0) {
          showToast('PPTX 파일에서 슬라이드 데이터를 찾을 수 없습니다.');
          return;
        }
        const stage = document.getElementById('slideStage');
        const anchorSlide = slides[currentSlide - 1];
        let insertAfter = anchorSlide;
        const deckLabel = typeof escapeAttr === 'function' ? escapeAttr(file.name.replace(/\.pptx$/i, '').slice(0, 24)) : 'PPTX IMPORT';

        for (let i = 0; i < slideKeys.length; i++) {
          const sKey = slideKeys[i];
          const sNumStr = sKey.match(/\d+/)[0];
          const xmlDoc = parser.parseFromString(decoder.decode(entries.get(sKey)), 'application/xml');
          const relMap = new Map();
          const relKey = `ppt/slides/_rels/slide${sNumStr}.xml.rels`;
          if (entries.has(relKey)) {
            const relDoc = parser.parseFromString(decoder.decode(entries.get(relKey)), 'application/xml');
            Array.from(relDoc.getElementsByTagName('Relationship')).forEach(r => {
              relMap.set(r.getAttribute('Id'), r.getAttribute('Target'));
            });
          }

          const paragraphs = [];
          Array.from(xmlDoc.getElementsByTagNameNS('*', 'p')).forEach(pNode => {
            const txt = Array.from(pNode.getElementsByTagNameNS('*', 't')).map(t => t.textContent || '').join('').trim();
            if (txt) paragraphs.push(txt);
          });

          const imgDataUrls = [];
          Array.from(xmlDoc.getElementsByTagNameNS('*', 'blip')).forEach(blip => {
            const rId = blip.getAttribute('r:embed') || blip.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed');
            const target = rId ? relMap.get(rId) : null;
            if (target) {
              const cleanedTarget = target.replace(/^\/+/, '').replace(/^\.\.\//, '').replace(/^ppt\//i, '');
              const normPath = 'ppt/' + cleanedTarget;
              if (entries.has(normPath)) {
                const ext = (normPath.split('.').pop() || '').toLowerCase();
                if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
                  imgDataUrls.push(uint8ToDataUrl(entries.get(normPath), ext));
                }
              }
            }
          });

          // Extract speaker notes if present in PPTX
          let importedNotes = '';
          const notesKey = `ppt/notesSlides/notesSlide${sNumStr}.xml`;
          if (entries.has(notesKey)) {
            const notesDoc = parser.parseFromString(decoder.decode(entries.get(notesKey)), 'application/xml');
            importedNotes = Array.from(notesDoc.getElementsByTagNameNS('*', 'p'))
              .map(pn => Array.from(pn.getElementsByTagNameNS('*', 't')).map(t => t.textContent || '').join('').trim())
              .filter(Boolean).join('\n');
          }

          const titleTxt = paragraphs[0] || `가져온 슬라이드 ${i + 1}`;
          const bodyList = paragraphs.slice(1, 24);
          const newSlide = document.createElement('section');
          newSlide.className = 'slide theme-light px-8 md:px-14 pt-6 pb-8 flex flex-col justify-between';
          newSlide.setAttribute('data-section', deckLabel);
          if (importedNotes) newSlide.setAttribute('data-speaker-notes', importedNotes);

          const hasImg = imgDataUrls.length > 0;
          const bodyHtml = bodyList.length > 0
            ? `<ul class="ppt-bullet-list text-sm md:text-base text-ink space-y-1.5">${bodyList.map(line => `<li data-editable>${typeof escapeAttr === 'function' ? escapeAttr(line) : line}</li>`).join('')}</ul>`
            : `<p data-editable class="text-sm text-muted">내용을 편집하세요.</p>`;

          const cardCtrlHtml = `<div class="card-edit-controls items-center justify-end gap-1 mb-2"><button type="button" data-on-click="moveCard(this, -1)" class="px-2 py-0.5 rounded bg-canvas border border-borderline text-[11px] font-mono">◀ 이전</button><button type="button" data-on-click="moveCard(this, 1)" class="px-2 py-0.5 rounded bg-canvas border border-borderline text-[11px] font-mono">▶ 다음</button><button type="button" data-on-click="deleteCard(this)" class="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[11px] font-bold">×</button></div>`;
          const mediaCardHtml = hasImg
            ? `<div class="slide-card hover-reactive bg-white border border-borderline rounded-2xl p-4 flex items-center justify-center overflow-hidden" data-hover-init="true">${cardCtrlHtml}<img src="${imgDataUrls[0]}" class="slot-img w-full h-full object-contain rounded-xl" alt="PPTX 이미지"></div>`
            : '';

          newSlide.innerHTML = `<div class="slide-bg-layer"></div><div class="slide-bg-overlay"></div><div class="slide-header-bar flex items-end justify-between border-b border-borderline pb-3.5 shrink-0">
              <div>
                <span data-editable class="font-mono text-xs font-extrabold tracking-widest text-gopro uppercase">${deckLabel} · P.${String(i + 1).padStart(2, '0')}</span>
                <h2 data-editable class="text-2xl md:text-3xl font-extrabold tracking-tight text-ink mt-1">${typeof escapeAttr === 'function' ? escapeAttr(titleTxt) : titleTxt}</h2>
              </div>
            </div>
            <div class="slide-grid-body flex-1 grid grid-cols-1 ${hasImg ? 'md:grid-cols-2' : 'grid-cols-1'} gap-5 pt-5 overflow-y-auto safe-scroll">
              <div class="slide-card hover-reactive bg-white border border-borderline rounded-2xl p-6 flex flex-col justify-center space-y-3" data-hover-init="true">${cardCtrlHtml}${bodyHtml}</div>
              ${mediaCardHtml}
            </div>
            <div class="ppt-free-layer"></div>`;

          if (insertAfter && insertAfter.parentNode === stage) {
            if (typeof shiftGotoSlideTargetsOnInsert === 'function') shiftGotoSlideTargetsOnInsert(currentSlide + 1 + i);
            insertAfter.insertAdjacentElement('afterend', newSlide);
            insertAfter = newSlide;
          } else {
            stage.appendChild(newSlide);
          }
        }

        if (isEditMode && typeof makeAllTextEditable === 'function') makeAllTextEditable(true);
        if (typeof updateSlideUI === 'function') updateSlideUI();
        if (typeof saveHistorySnapshot === 'function') saveHistorySnapshot(`PPTX 슬라이드 ${slideKeys.length}장 가져오기`);
        showToast(`"${file.name}"에서 총 ${slideKeys.length}장의 슬라이드를 가져왔습니다!`);
      } catch (err) {
        console.error('[HTML Slide Tool] PPTX 가져오기 오류:', err);
        showToast('PPTX 파일을 읽는 중 오류가 발생했습니다.');
      }
    });
  }
  inp.value = '';
  inp.click();
}
