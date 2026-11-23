/* ==================== PWA INSTALL, SERVICE WORKER & NATIVE FILE SYSTEM OVERWRITE (v5.1.0) ==================== */
let activeNativeFileHandle = null;
let activeNativeFileName = '';
let activeNativeFileKind = ''; // 'html' | 'json' | 'zip'
let deferredPwaInstallPrompt = null;

function isNativeFileSystemSupported() {
  return typeof window.showOpenFilePicker === 'function' && typeof window.showSaveFilePicker === 'function';
}

function inferNativeFileKindFromName(fileName) {
  const low = String(fileName || '').toLowerCase();
  if (low.endsWith('.json')) return 'json';
  if (low.endsWith('.zip')) return 'zip';
  return 'html';
}

function setActiveNativeFileHandle(handle, explicitKind) {
  activeNativeFileHandle = handle || null;
  activeNativeFileName = (handle && handle.name) ? String(handle.name) : '';
  activeNativeFileKind = handle ? (explicitKind || inferNativeFileKindFromName(activeNativeFileName)) : '';
  updateNativeFileStatusUI();
}

function clearActiveNativeFileHandle() {
  activeNativeFileHandle = null;
  activeNativeFileName = '';
  activeNativeFileKind = '';
  updateNativeFileStatusUI();
}

function updateNativeFileStatusUI() {
  const hdrBadge = document.getElementById('headerNativeFileBadge');
  const studioBadge = $studio('studioNativeFileBadge');
  const isDirty = Boolean(typeof hasUnsavedChanges !== 'undefined' && hasUnsavedChanges);

  if (hdrBadge) {
    if (activeNativeFileHandle && activeNativeFileName) {
      hdrBadge.classList.remove('hidden');
      hdrBadge.classList.add('inline-flex');
      const shortName = activeNativeFileName.length > 22 ? (activeNativeFileName.slice(0, 20) + '…') : activeNativeFileName;
      hdrBadge.textContent = isDirty ? `● ${shortName}` : `✓ ${shortName}`;
      hdrBadge.title = isDirty
        ? `연결된 로컬 파일("${activeNativeFileName}")에 미저장 변경사항 있음 — 클릭하거나 Ctrl+S로 바로 덮어쓰기`
        : `로컬 파일("${activeNativeFileName}") 저장 완료 — Ctrl+S로 바로 덮어쓰기`;
      hdrBadge.classList.toggle('bg-amber-50', isDirty);
      hdrBadge.classList.toggle('border-amber-400', isDirty);
      hdrBadge.classList.toggle('text-amber-900', isDirty);
      hdrBadge.classList.toggle('bg-emerald-50', !isDirty);
      hdrBadge.classList.toggle('border-emerald-300', !isDirty);
      hdrBadge.classList.toggle('text-emerald-800', !isDirty);
    } else {
      hdrBadge.classList.add('hidden');
      hdrBadge.classList.remove('inline-flex');
    }
  }

  if (studioBadge) {
    if (activeNativeFileHandle && activeNativeFileName) {
      studioBadge.textContent = `${isDirty ? '● 미저장' : '✓ 연결됨'} · ${activeNativeFileName}`;
      studioBadge.className = `font-mono text-[9px] font-bold truncate ${isDirty ? 'text-amber-700' : 'text-emerald-700'}`;
    } else if (isNativeFileSystemSupported()) {
      studioBadge.textContent = '로컬 파일 미연결 (Ctrl+S 시 저장 위치 선택)';
      studioBadge.className = 'font-mono text-[9px] text-subtle truncate';
    } else {
      studioBadge.textContent = '브라우저 작업함 저장 모드 (Ctrl+S)';
      studioBadge.className = 'font-mono text-[9px] text-subtle truncate';
    }
  }
}

async function ensureNativeWritePermission(handle) {
  if (!handle) return false;
  try {
    if (typeof handle.queryPermission === 'function') {
      const q = await handle.queryPermission({ mode: 'readwrite' });
      if (q === 'granted') return true;
    }
    if (typeof handle.requestPermission === 'function') {
      const r = await handle.requestPermission({ mode: 'readwrite' });
      return r === 'granted';
    }
    return true;
  } catch (e) {
    return false;
  }
}

async function buildNativeFileContentByKind(kind) {
  if (kind === 'json') {
    if (typeof buildProjectJsonPayloadObject === 'function') {
      return new Blob([JSON.stringify(buildProjectJsonPayloadObject())], { type: 'application/json;charset=utf-8' });
    }
    throw new Error('JSON 직렬화 함수를 찾을 수 없습니다.');
  }
  if (kind === 'zip') {
    if (typeof buildProjectPackageZipBlob === 'function') {
      const built = await buildProjectPackageZipBlob();
      return built ? built.blob : null;
    }
    throw new Error('ZIP 패키징 함수를 찾을 수 없습니다.');
  }
  if (typeof buildSerializedStandaloneHTML === 'function') {
    const htmlOut = buildSerializedStandaloneHTML(false);
    return new Blob([htmlOut], { type: 'text/html;charset=utf-8' });
  }
  throw new Error('HTML 직렬화 함수를 찾을 수 없습니다.');
}

async function writeDeckToNativeFileHandle(handle, kind) {
  if (!handle || typeof handle.createWritable !== 'function') return false;
  const permitted = await ensureNativeWritePermission(handle);
  if (!permitted) {
    showToast('파일 덮어쓰기 권한이 거부되었습니다. 다시 시도하거나 다른 이름으로 저장해 주세요.');
    return false;
  }
  const resolvedKind = kind || inferNativeFileKindFromName(handle.name);
  const contentBlob = await buildNativeFileContentByKind(resolvedKind);
  if (!contentBlob) return false;

  const writable = await handle.createWritable();
  try {
    await writable.write(contentBlob);
    await writable.close();
  } catch (writeErr) {
    try { if (typeof writable.abort === 'function') await writable.abort(); } catch (e) {}
    throw writeErr;
  }

  setActiveNativeFileHandle(handle, resolvedKind);
  if (typeof markChangesSaved === 'function') markChangesSaved();
  hasUnexportedFileChanges = false;
  updateNativeFileStatusUI();
  const now = new Date();
  const tm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  showToast(`💾 "${handle.name}" 원본 파일 덮어쓰기 저장 완료! (${tm})`);
  return true;
}

async function openNativeProjectFile() {
  if (!isNativeFileSystemSupported()) {
    if (typeof triggerImportProjectFile === 'function') triggerImportProjectFile();
    return false;
  }
  try {
    const picked = await window.showOpenFilePicker({
      multiple: false,
      excludeAcceptAllOption: false,
      types: [
        {
          description: 'HTML Slide Tool 프레젠테이션 (.html, .json, .zip)',
          accept: {
            'text/html': ['.html', '.htm'],
            'application/json': ['.json'],
            'application/zip': ['.zip']
          }
        }
      ]
    });
    const handle = Array.isArray(picked) ? picked[0] : picked;
    if (!handle) return false;
    const file = await handle.getFile();
    if (!file) return false;
    if (typeof importProjectFileObject === 'function') {
      const ok = await importProjectFileObject(file, handle);
      return Boolean(ok);
    }
    return false;
  } catch (err) {
    if (err && err.name === 'AbortError') return false;
    console.warn('[HTML Slide Tool] 네이티브 파일 열기 폴백:', err);
    if (typeof triggerImportProjectFile === 'function') triggerImportProjectFile();
    return false;
  }
}

async function saveNativeFileAs(preferredKind) {
  const kind = (preferredKind === 'json' || preferredKind === 'zip') ? preferredKind : 'html';
  const baseName = typeof getChosenExportBaseName === 'function'
    ? getChosenExportBaseName()
    : ((document.getElementById('headerDeckTitle')?.textContent || 'presentation').trim().replace(/[^a-zA-Z0-9\uAC00-\uD7A3_-]/g, '_').slice(0, 32) || 'presentation');

  if (!isNativeFileSystemSupported()) {
    if (kind === 'json' && typeof exportProjectJsonFile === 'function') exportProjectJsonFile();
    else if (kind === 'zip' && typeof exportProjectPackageZip === 'function') await exportProjectPackageZip();
    else if (typeof saveModifiedHTML === 'function') saveModifiedHTML(false);
    return false;
  }

  const typeHtml = { description: '편집 가능 단독 HTML 프레젠테이션 (.html)', accept: { 'text/html': ['.html'] } };
  const typeJson = { description: '프로젝트 작업 파일 (.json)', accept: { 'application/json': ['.json'] } };
  const typeZip = { description: '미디어 동봉 프로젝트 패키지 (.pptstudio.zip)', accept: { 'application/zip': ['.zip'] } };
  const orderedTypes = kind === 'json'
    ? [typeJson, typeHtml, typeZip]
    : (kind === 'zip' ? [typeZip, typeHtml, typeJson] : [typeHtml, typeJson, typeZip]);
  const suggestedName = kind === 'json'
    ? `${baseName}_작업파일.json`
    : (kind === 'zip' ? `${baseName}.pptstudio.zip` : `${baseName}.html`);

  try {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: orderedTypes
    });
    if (!handle) return false;
    const chosenKind = inferNativeFileKindFromName(handle.name);
    return await writeDeckToNativeFileHandle(handle, chosenKind);
  } catch (err) {
    if (err && err.name === 'AbortError') return false;
    console.error('[HTML Slide Tool] 다른 이름으로 저장 오류:', err);
    showToast('파일 저장 중 오류가 발생했습니다. 내보내기 모달에서 다운로드를 이용해 주세요.');
    return false;
  }
}

async function saveNativeFileOrQuickSave(forceSaveAs) {
  if (forceSaveAs) {
    return await saveNativeFileAs(activeNativeFileKind || 'html');
  }
  if (activeNativeFileHandle) {
    try {
      return await writeDeckToNativeFileHandle(activeNativeFileHandle, activeNativeFileKind);
    } catch (err) {
      console.error('[HTML Slide Tool] 원본 파일 덮어쓰기 오류:', err);
      showToast('원본 파일 덮어쓰기에 실패했습니다. 다른 이름으로 저장해 주세요.');
      return false;
    }
  }
  if (typeof activeWorkspaceProjectId !== 'undefined' && activeWorkspaceProjectId) {
    if (typeof saveCurrentProjectToWorkspace === 'function') {
      await saveCurrentProjectToWorkspace(true);
      return true;
    }
  }
  if (isNativeFileSystemSupported()) {
    return await saveNativeFileAs('html');
  }
  if (typeof saveCurrentProjectToWorkspace === 'function') {
    await saveCurrentProjectToWorkspace(true);
    return true;
  }
  return false;
}

async function triggerPwaAppInstall() {
  if (!deferredPwaInstallPrompt) {
    showToast('이미 앱으로 설치되었거나 브라우저 주소창의 설치 아이콘을 이용해 주세요.');
    return;
  }
  try {
    deferredPwaInstallPrompt.prompt();
    const choice = await deferredPwaInstallPrompt.userChoice;
    deferredPwaInstallPrompt = null;
    const btn = document.getElementById('pwaInstallAppBtn');
    if (btn) { btn.classList.add('hidden'); btn.classList.remove('inline-flex'); }
    if (choice && choice.outcome === 'accepted') {
      showToast('HTML Slide Tool이 바탕화면 앱(PWA)으로 설치되었습니다!');
    }
  } catch (e) {}
}

function initPwaAndNativeFileSystem() {
  updateNativeFileStatusUI();
  if (document.body && document.body.getAttribute('data-presentation-only') === 'true') return;

  // 1. Register Service Worker only on HTTP(S) / localhost origins (never on file://)
  const proto = window.location ? window.location.protocol : '';
  const host = window.location ? window.location.hostname : '';
  const isSwEligible = (proto === 'https:' || host === 'localhost' || host === '127.0.0.1');
  if (isSwEligible && navigator.serviceWorker && typeof navigator.serviceWorker.register === 'function') {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('[HTML Slide Tool] Service Worker 등록 생략:', err);
    });
  }

  // 2. Capture PWA install prompt for 1-click header install button
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaInstallPrompt = e;
    const btn = document.getElementById('pwaInstallAppBtn');
    if (btn) {
      btn.classList.remove('hidden');
      btn.classList.add('inline-flex');
    }
  });
  window.addEventListener('appinstalled', () => {
    deferredPwaInstallPrompt = null;
    const btn = document.getElementById('pwaInstallAppBtn');
    if (btn) {
      btn.classList.add('hidden');
      btn.classList.remove('inline-flex');
    }
  });

  // 3. PWA OS File Handling API (launchQueue): double-clicking .json opens & binds native file handle!
  if (window.launchQueue && typeof window.launchQueue.setConsumer === 'function') {
    window.launchQueue.setConsumer(async (launchParams) => {
      if (!launchParams || !Array.isArray(launchParams.files) || launchParams.files.length === 0) return;
      const handle = launchParams.files[0];
      if (!handle || typeof handle.getFile !== 'function') return;
      try {
        const file = await handle.getFile();
        if (file && typeof importProjectFileObject === 'function') {
          await importProjectFileObject(file, handle);
        }
      } catch (e) {
        console.warn('[HTML Slide Tool] PWA 파일 실행 처리 오류:', e);
      }
    });
  }
}
