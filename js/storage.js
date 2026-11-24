/* ==================== MULTI-PROJECT WORKSPACE (INDEXEDDB + LOCALSTORAGE MIGRATION) ==================== */
const STORAGE_KEY_PROJECTS = 'html_slide_studio_projects_v1';
const LEGACY_STORAGE_KEY_PROJECTS = 'gopro_deck_studio_projects_v1';
const IDB_WORKSPACE_NAME = 'PPTStudioWorkspaceDB_v1';
const IDB_WORKSPACE_STORE = 'projects';
let __workspaceProjectsCache = {};
let __workspaceDbReady = false;

function openWorkspaceProjectsDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const req = indexedDB.open(IDB_WORKSPACE_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_WORKSPACE_STORE)) {
        db.createObjectStore(IDB_WORKSPACE_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function readLegacyLocalStorageProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECTS) || localStorage.getItem(LEGACY_STORAGE_KEY_PROJECTS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

async function initWorkspaceProjectsStore() {
  const legacyMap = readLegacyLocalStorageProjects();
  try {
    const db = await openWorkspaceProjectsDB();
    const allItems = await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_WORKSPACE_STORE, 'readonly');
      const req = tx.objectStore(IDB_WORKSPACE_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    const map = {};
    allItems.forEach(item => { if (item && item.id) map[item.id] = item; });
    const legacyKeys = Object.keys(legacyMap);
    if (legacyKeys.length > 0) {
      const txW = db.transaction(IDB_WORKSPACE_STORE, 'readwrite');
      const storeW = txW.objectStore(IDB_WORKSPACE_STORE);
      legacyKeys.forEach(k => {
        if (!map[k] && legacyMap[k]) {
          map[k] = legacyMap[k];
          storeW.put(legacyMap[k]);
        }
      });
      try {
        localStorage.removeItem(STORAGE_KEY_PROJECTS);
        localStorage.removeItem(LEGACY_STORAGE_KEY_PROJECTS);
      } catch (e) {}
    }
    __workspaceProjectsCache = map;
    __workspaceDbReady = true;
    renderSavedProjectsList();
  } catch (err) {
    __workspaceProjectsCache = legacyMap;
    __workspaceDbReady = true;
    renderSavedProjectsList();
  }
}

function getSavedProjectsMap() {
  if (!__workspaceDbReady && Object.keys(__workspaceProjectsCache).length === 0) {
    __workspaceProjectsCache = readLegacyLocalStorageProjects();
  }
  return __workspaceProjectsCache;
}

function cloneCleanStageForPersistence(stage) {
  const stageClone = stage.cloneNode(true);
  stageClone.querySelectorAll('.video-missing-fallback, .table-col-resizer, .table-row-resizer, #pptBentoDropPreview').forEach(el => el.remove());
  stageClone.querySelectorAll('[data-err-bound], [contenteditable]').forEach(el => {
    el.removeAttribute('data-err-bound');
    el.removeAttribute('contenteditable');
  });
  stageClone.querySelectorAll('.ppt-multi-selected, .is-selected, .build-step-pending, .build-step-revealed').forEach(el => {
    el.classList.remove('ppt-multi-selected', 'is-selected', 'build-step-pending', 'build-step-revealed');
  });
  stageClone.querySelectorAll('.iw-flip-scene').forEach(el => el.classList.remove('is-editing-back', 'is-flipped'));
  stageClone.querySelectorAll('.iw-hs-pin.is-open').forEach(el => el.classList.remove('is-open'));
  rewriteVideoSrcForExport(stageClone);
  return stageClone;
}

function setHeaderDeckTitleSafely(titleText) {
  const el = document.getElementById('headerDeckTitle');
  if (!el) return;
  const cleanTitle = String(titleText || 'HTML SLIDE TOOL · PRESENTATION DECK').trim();
  const dot = el.querySelector('span.rounded-full');
  el.textContent = '';
  if (dot) {
    el.appendChild(dot);
  } else {
    const newDot = document.createElement('span');
    newDot.className = 'w-2 h-2 rounded-full bg-gopro inline-block';
    el.appendChild(newDot);
  }
  el.appendChild(document.createTextNode(' ' + cleanTitle));
}

function ensureCardControlsOnContainer(rootEl) {
  if (!rootEl) return;
  rootEl.querySelectorAll('.slide-card').forEach(card => {
    if (!card.hasAttribute('data-hover-init')) {
      card.setAttribute('data-hover-init', 'true');
      card.classList.add('hover-reactive');
    }
    if (!card.querySelector(':scope > .card-edit-controls')) {
      const ctrl = document.createElement('div');
      ctrl.className = 'card-edit-controls items-center justify-end gap-1 mb-2';
      const isToc = card.classList.contains('toc-card');
      const stopPrefix = isToc ? 'event.stopPropagation(); ' : '';
      ctrl.innerHTML = `<button type="button" data-on-click="${stopPrefix}moveCard(this, -1)" class="px-2 py-0.5 rounded bg-canvas border border-borderline text-[11px] font-mono">◀ 이전</button><button type="button" data-on-click="${stopPrefix}moveCard(this, 1)" class="px-2 py-0.5 rounded bg-canvas border border-borderline text-[11px] font-mono">▶ 다음</button><button type="button" data-on-click="${stopPrefix}deleteCard(this)" class="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[11px] font-bold">×</button>`;
      card.insertBefore(ctrl, card.firstChild);
    }
  });
}

function captureDeckMetaPayload() {
  return {
    headerBg: document.documentElement.style.getPropertyValue('--header-bg') || '',
    headerFg: document.documentElement.style.getPropertyValue('--header-fg') || '',
    footerBg: document.documentElement.style.getPropertyValue('--footer-bg') || '',
    footerFg: document.documentElement.style.getPropertyValue('--footer-fg') || '',
    accentColor: document.documentElement.style.getPropertyValue('--accent-color') || '',
    aspectRatio: (typeof currentDeckAspectMode !== 'undefined' && currentDeckAspectMode) ? currentDeckAspectMode : '16:9'
  };
}

function restoreDeckMetaPayload(meta) {
  const m = (meta && typeof meta === 'object') ? meta : {};
  const hBg = (m.headerBg || '').trim() || '#F5F5F7';
  const hFg = (m.headerFg || '').trim() || '#111111';
  const fBg = (m.footerBg || '').trim() || '#F5F5F7';
  const fFg = (m.footerFg || '').trim() || '#111111';
  const acc = (m.accentColor || '').trim() || '#0055FF';
  const ratio = ['16:9', '4:3', '9:16'].includes(m.aspectRatio) ? m.aspectRatio : '16:9';

  if (typeof applyChromeBarColors === 'function') {
    applyChromeBarColors('header', 'bg', hBg, true);
    applyChromeBarColors('header', 'fg', hFg, true);
    applyChromeBarColors('footer', 'bg', fBg, true);
    applyChromeBarColors('footer', 'fg', fFg, true);
  }
  if (typeof setAccentColor === 'function') {
    setAccentColor(acc, true);
  } else {
    document.documentElement.style.setProperty('--accent-color', acc);
  }
  if (typeof setDeckAspectRatio === 'function') {
    setDeckAspectRatio(ratio, true);
  }
}

let activeWorkspaceProjectId = null;
async function saveCurrentProjectToWorkspace(overwriteActive) {
  const stage = document.getElementById('slideStage');
  if (!stage) return;
  const defaultTitle = (document.getElementById('headerDeckTitle')?.textContent || '새 발표자료').trim().slice(0, 32);
  const map = getSavedProjectsMap();
  const isOverwrite = Boolean(overwriteActive && activeWorkspaceProjectId && map[activeWorkspaceProjectId]);
  const id = isOverwrite ? activeWorkspaceProjectId : ('proj_' + Date.now());
  if (!isOverwrite) {
    const keys = Object.keys(map);
    if (keys.length >= 20) {
      const oldestTitle = map[keys[0]]?.title || '가장 오래된 작업';
      if (!window.confirm(`작업함 최대 보관 개수(20개)가 가득 찼습니다.\n계속 저장하면 가장 오래된 작업("${oldestTitle}")이 삭제됩니다. 진행할까요?`)) return;
      const oldId = keys[0];
      delete map[oldId];
      try {
        const db = await openWorkspaceProjectsDB();
        await new Promise((resolve) => {
          const tx = db.transaction(IDB_WORKSPACE_STORE, 'readwrite');
          tx.objectStore(IDB_WORKSPACE_STORE).delete(oldId);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
        db.close();
      } catch (e) {}
    }
  }

  const stageClone = cloneCleanStageForPersistence(stage);

  const projObj = {
    id,
    title: defaultTitle,
    subtitle: (document.getElementById('headerDeckSubtitle')?.textContent || '').trim(),
    ...captureDeckMetaPayload(),
    savedAt: new Date().toLocaleString('ko-KR'),
    slideCount: slides.length,
    stageHtml: stageClone.innerHTML
  };
  map[id] = projObj;
  __workspaceProjectsCache = map;

  try {
    const db = await openWorkspaceProjectsDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_WORKSPACE_STORE, 'readwrite');
      tx.objectStore(IDB_WORKSPACE_STORE).put(projObj);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    activeWorkspaceProjectId = id;
    markChangesSaved();
    renderSavedProjectsList();
    showToast(isOverwrite ? `"${defaultTitle}" 작업함에 빠른 덮어쓰기 저장 완료! (Ctrl+S)` : `"${defaultTitle}" 작업이 IndexedDB 작업함에 안전하게 저장되었습니다.`);
  } catch (err) {
    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(map));
      activeWorkspaceProjectId = id;
      markChangesSaved();
      renderSavedProjectsList();
      showToast(`"${defaultTitle}" 작업이 브라우저 작업함에 저장되었습니다.`);
    } catch (lsErr) {
      showToast('브라우저 저장 공간이 부족하여 파일(.json) 백업으로 자동 저장합니다.');
      exportProjectJsonFile();
    }
  }
}

function hasValidSlideMarkup(sanitizedHtml) {
  if (!sanitizedHtml || typeof sanitizedHtml !== 'string') return false;
  const probe = document.createElement('div');
  probe.innerHTML = sanitizedHtml;
  return probe.querySelectorAll('.slide').length > 0;
}

function loadProjectFromWorkspace(projId) {
  const map = getSavedProjectsMap();
  const proj = map[projId];
  if (!proj) return;
  const sanitized = sanitizeImportedStageHtml(proj.stageHtml);
  if (!hasValidSlideMarkup(sanitized)) {
    showToast('유효한 슬라이드(.slide)가 없는 손상된 작업 데이터입니다.');
    return;
  }
  setHeaderDeckTitleSafely(proj.title);
  if (document.getElementById('headerDeckSubtitle')) document.getElementById('headerDeckSubtitle').textContent = proj.subtitle;
  restoreDeckMetaPayload(proj);
  activeWorkspaceProjectId = projId;
  if (typeof clearActiveNativeFileHandle === 'function') clearActiveNativeFileHandle();
  currentSlide = 1;
  restoreStageHtml(sanitized);
  if (typeof initialDeckStageHtml !== 'undefined') initialDeckStageHtml = document.getElementById('slideStage')?.innerHTML || '';
  saveHistorySnapshot('작업함 불러오기', true);
  markChangesSaved();
  showToast(`"${proj.title}" 작업을 불러왔습니다.`);
}

async function deleteProjectFromWorkspace(projId) {
  const map = getSavedProjectsMap();
  const title = map[projId]?.title || '저장된 작업';
  delete map[projId];
  if (activeWorkspaceProjectId === projId) activeWorkspaceProjectId = null;
  try {
    const db = await openWorkspaceProjectsDB();
    await new Promise((resolve) => {
      const tx = db.transaction(IDB_WORKSPACE_STORE, 'readwrite');
      tx.objectStore(IDB_WORKSPACE_STORE).delete(projId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  } catch (e) {}
  try { localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(map)); } catch (e) {}
  renderSavedProjectsList();
  showToast(`"${title}" 작업이 작업함에서 삭제되었습니다.`);
}

async function clearAllWorkspaceProjects() {
  __workspaceProjectsCache = {};
  activeWorkspaceProjectId = null;
  try {
    const db = await openWorkspaceProjectsDB();
    await new Promise((resolve) => {
      const tx = db.transaction(IDB_WORKSPACE_STORE, 'readwrite');
      tx.objectStore(IDB_WORKSPACE_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  } catch (e) {}
  try {
    localStorage.removeItem(STORAGE_KEY_PROJECTS);
    localStorage.removeItem(LEGACY_STORAGE_KEY_PROJECTS);
  } catch (e) {}
  renderSavedProjectsList();
  showToast('작업함에 저장된 모든 프로젝트가 삭제되어 용량이 정리되었습니다.');
}

function exportWorkspaceItemJson(projId) {
  const map = getSavedProjectsMap();
  const proj = map[projId];
  if (!proj) return;
  const blob = new Blob([JSON.stringify(proj)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(proj.title || 'project').replace(/[^a-zA-Z0-9\uAC00-\uD7A3_-]/g, '_').slice(0, 30)}_백업.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`"${proj.title}" 백업 파일(.json)이 다운로드되었습니다.`);
}

function renderSavedProjectsList() {
  const listEl = $studio('savedProjectsList');
  const infoEl = $studio('workspaceStorageInfo');
  if (!listEl) return;
  const map = getSavedProjectsMap();
  const items = Object.values(map).reverse();
  let totalChars = 0;
  items.forEach(it => { totalChars += (it.stageHtml ? it.stageHtml.length : 0); });
  const sizeKb = Math.round((totalChars * 2) / 1024);
  if (infoEl) {
    infoEl.textContent = `작업함 ${items.length}개 · 약 ${sizeKb >= 1024 ? (sizeKb / 1024).toFixed(1) + 'MB' : sizeKb + 'KB'}`;
  }
  listEl.innerHTML = '';

  if (items.length === 0) {
    listEl.innerHTML = `<div class="text-[10px] text-muted text-center py-1.5">저장된 이전 작업이 없습니다. '작업함에 저장'을 눌러 보관하세요.</div>`;
    return;
  }

  items.forEach(item => {
    const safeId = escapeAttr(String(item.id || '').replace(/[^a-zA-Z0-9_-]/g, ''));
    const safeTitle = escapeAttr(item.title || '제목 없음');
    const safeSavedAt = escapeAttr(item.savedAt || '');
    const safeCount = Number(item.slideCount) || 1;
    const row = document.createElement('div');
    row.className = 'px-2 py-1.5 rounded bg-white border border-borderline flex items-center justify-between gap-1 text-[11px]';
    row.innerHTML = `
      <div class="min-w-0 flex-1">
        <div class="font-bold text-ink truncate">${safeTitle} (${safeCount}P)</div>
        <div class="font-mono text-[9px] text-subtle">${safeSavedAt}</div>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <button type="button" data-on-click="loadProjectFromWorkspace('${safeId}')" class="px-1.5 py-0.5 rounded bg-gopro text-white font-bold text-[10px] cursor-pointer">열기</button>
        <button type="button" data-on-click="exportWorkspaceItemJson('${safeId}')" class="px-1.5 py-0.5 rounded bg-canvas border border-borderline text-ink font-bold text-[10px] cursor-pointer" title="JSON 백업 다운로드">백업</button>
        <button type="button" data-on-click="deleteProjectFromWorkspace('${safeId}')" class="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 hover:bg-rose-600 hover:text-white font-bold text-[10px] cursor-pointer" title="작업함에서 삭제">삭제</button>
      </div>
    `;
    listEl.appendChild(row);
  });
}

function openStarterTemplateModal() { if (typeof openModalSafe === 'function') openModalSafe('starterTemplateModal'); }

function closeStarterTemplateModal() { if (typeof closeModalSafe === 'function') closeModalSafe('starterTemplateModal'); }

function createNewPresentationProject() {
  openStarterTemplateModal();
}

function applyStarterTemplate(templateKey) {
  const stage = document.getElementById('slideStage');
  if (!stage) return;
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
  const todayIso = new Date().toISOString().slice(0, 10);

  let deckTitle = 'NEW PRESENTATION · STRATEGY DECK';
  let deckSub = todayStr;
  let stageHtml = '';

  if (templateKey === 'proposal') {
    deckTitle = 'PROJECT PROPOSAL · BUSINESS DECK';
    deckSub = `사업 및 프로젝트 제안서 · ${todayStr}`;
    stageHtml = `
      <section class="slide active" data-slide="1" data-section="00 · COVER" style="background-color: #F5F5F7;">
        <div class="slide-bg-layer"></div>
        <div class="slide-bg-overlay"></div>
        <div class="slide-grid-body flex-1 grid grid-cols-1 md:grid-cols-12 h-full overflow-y-auto safe-scroll">
          <div class="slide-card hover-reactive md:col-span-8 border-b md:border-b-0 md:border-r border-borderline p-8 md:p-14 flex flex-col justify-between bg-white">
            <div class="flex items-center gap-3">
              <span data-editable class="px-3.5 py-1 rounded-full bg-ink text-white text-xs font-bold">PROPOSAL</span>
              <span data-editable class="font-mono text-xs text-muted">${todayStr}</span>
            </div>
            <div class="my-auto py-6">
              <p data-editable class="font-mono text-xs uppercase tracking-[0.2em] text-gopro font-bold mb-3">STRATEGIC BUSINESS PROPOSAL</p>
              <h1 data-editable class="text-5xl md:text-6xl font-black tracking-tight text-ink leading-[1.1]">프로젝트 핵심 제안서</h1>
              <p data-editable class="mt-4 text-lg text-muted leading-relaxed">클라이언트 및 이해관계자를 설득하는 <span class="kw">핵심 문제 정의와 실행 솔루션</span> 제안</p>
            </div>
            <div class="pt-4 border-t border-borderline font-mono text-xs text-muted" data-editable>PRESS [E] TO EDIT · [H] TO HIGHLIGHT KEYWORDS</div>
          </div>
          <div class="slide-card hover-reactive md:col-span-4 p-8 md:p-10 flex flex-col justify-between bg-canvas">
            <div>
              <span data-editable class="font-mono text-xs text-subtle block mb-2">TEAM / PRESENTER</span>
              <h2 data-editable class="text-2xl font-extrabold text-ink">제안 팀 / 발표자명</h2>
              <p data-editable class="text-xs text-muted mt-1">소속 기관 또는 부서명을 입력하세요</p>
            </div>
            <div class="space-y-2">
              <div class="p-3.5 rounded-xl bg-white border border-borderline">
                <div data-editable class="font-mono text-[10px] font-bold text-gopro">CLIENT / TARGET</div>
                <div data-editable class="font-bold text-sm text-ink mt-0.5">제안 대상 기업 · 기관명</div>
              </div>
              <div class="p-3.5 rounded-xl bg-white border border-borderline">
                <div data-editable class="font-mono text-[10px] font-bold text-gopro">TIMELINE</div>
                <div data-editable class="font-bold text-sm text-ink mt-0.5">2026 Q4 – 2027 Q1</div>
              </div>
            </div>
          </div>
        </div>
        <div class="ppt-free-layer"></div>
      </section>
      <section class="slide" data-slide="2" data-section="INDEX · 목차" style="background-color: #F5F5F7;">
        <div class="slide-bg-layer"></div>
        <div class="slide-bg-overlay"></div>
        <div class="slide-header-bar px-6 md:px-12 pt-5 pb-4 border-b border-borderline flex items-center justify-between shrink-0">
          <div>
            <span data-editable class="font-mono text-xs text-gopro font-bold uppercase tracking-wider">CONTENTS</span>
            <h2 data-editable class="text-2xl md:text-4xl font-extrabold tracking-tight mt-0.5">제안 목차</h2>
          </div>
        </div>
        <div data-toc-grid="true" class="slide-grid-body flex-1 grid grid-cols-1 md:grid-cols-2 overflow-y-auto safe-scroll">
          <div data-goto-slide="3" data-on-click="handleTocCardClick(event, this)" class="slide-card toc-card hover-reactive cursor-pointer p-7 border-b border-r border-borderline flex flex-col justify-between bg-white">
            <span class="toc-num font-mono text-xs font-bold text-gopro" data-editable>01 →</span>
            <div><div data-editable class="toc-title text-xl font-bold text-ink">배경 및 문제 정의</div><div class="toc-sub font-mono text-[11px] text-subtle mt-1" data-editable>SLIDE 03</div></div>
          </div>
          <div data-goto-slide="4" data-on-click="handleTocCardClick(event, this)" class="slide-card toc-card hover-reactive cursor-pointer p-7 border-b border-borderline flex flex-col justify-between bg-white">
            <span class="toc-num font-mono text-xs font-bold text-gopro" data-editable>02 →</span>
            <div><div data-editable class="toc-title text-xl font-bold text-ink">핵심 솔루션 제안</div><div class="toc-sub font-mono text-[11px] text-subtle mt-1" data-editable>SLIDE 04</div></div>
          </div>
          <div data-goto-slide="5" data-on-click="handleTocCardClick(event, this)" class="slide-card toc-card hover-reactive cursor-pointer p-7 border-r border-borderline flex flex-col justify-between bg-white">
            <span class="toc-num font-mono text-xs font-bold text-gopro" data-editable>03 →</span>
            <div><div data-editable class="toc-title text-xl font-bold text-ink">단계별 실행 로드맵</div><div class="toc-sub font-mono text-[11px] text-subtle mt-1" data-editable>SLIDE 05</div></div>
          </div>
          <div data-goto-slide="6" data-on-click="handleTocCardClick(event, this)" class="slide-card toc-card hover-reactive cursor-pointer p-7 flex flex-col justify-between bg-white">
            <span class="toc-num font-mono text-xs font-bold text-gopro" data-editable>04 →</span>
            <div><div data-editable class="toc-title text-xl font-bold text-ink">기대 효과 및 예산</div><div class="toc-sub font-mono text-[11px] text-subtle mt-1" data-editable>SLIDE 06</div></div>
          </div>
        </div>
        <div class="ppt-free-layer"></div>
      </section>
      <section class="slide" data-slide="3" data-section="01 · 문제 정의" style="background-color: #F5F5F7;">
        <div class="slide-bg-layer"></div>
        <div class="slide-bg-overlay"></div>
        <div class="slide-header-bar px-6 md:px-12 pt-5 pb-4 border-b border-borderline flex items-center justify-between shrink-0">
          <div>
            <span data-editable class="font-mono text-xs text-gopro font-bold uppercase tracking-wider">01 · PROBLEM &amp; INSIGHT</span>
            <h2 data-editable class="text-2xl md:text-4xl font-extrabold tracking-tight mt-0.5">시장 현황과 핵심 과제</h2>
          </div>
        </div>
        <div class="slide-grid-body flex-1 grid grid-cols-1 md:grid-cols-3 overflow-y-auto safe-scroll">
          <div class="slide-card hover-reactive p-8 border-b md:border-b-0 md:border-r border-borderline flex flex-col justify-between bg-white">
            <div><span data-editable class="font-mono text-xs font-bold text-gopro block mb-2">PAIN POINT 01</span><h3 data-editable class="text-xl font-extrabold text-ink mb-3">첫 번째 문제점</h3><p data-editable class="text-base text-muted leading-relaxed">현재 시장이나 프로세스에서 발생하는 구체적인 한계를 작성하세요.</p></div>
            <div data-editable class="pt-4 border-t border-borderline font-mono text-xs text-subtle">DATA EVIDENCE 01</div>
          </div>
          <div class="slide-card hover-reactive p-8 border-b md:border-b-0 md:border-r border-borderline flex flex-col justify-between bg-white">
            <div><span data-editable class="font-mono text-xs font-bold text-gopro block mb-2">PAIN POINT 02</span><h3 data-editable class="text-xl font-extrabold text-ink mb-3">두 번째 문제점</h3><p data-editable class="text-base text-muted leading-relaxed">사용자 이탈이나 비용 증가의 원인이 되는 핵심 병목을 정리하세요.</p></div>
            <div data-editable class="pt-4 border-t border-borderline font-mono text-xs text-subtle">DATA EVIDENCE 02</div>
          </div>
          <div class="slide-card hover-reactive p-8 flex flex-col justify-between bg-ink text-white">
            <div><span data-editable class="font-mono text-xs font-bold text-marker block mb-2">OPPORTUNITY</span><h3 data-editable class="text-xl font-extrabold mb-3">핵심 기회 요인</h3><p data-editable class="text-base text-white/80 leading-relaxed">우리가 해결했을 때 확보할 수 있는 <span class="kw">차별화된 시장 가치</span>를 강조하세요.</p></div>
            <div data-editable class="pt-4 border-t border-white/15 font-mono text-xs text-white/60">KEY INSIGHT</div>
          </div>
        </div>
        <div class="ppt-free-layer"></div>
      </section>
      <section class="slide" data-slide="4" data-section="02 · 핵심 솔루션" style="background-color: #F5F5F7;">
        <div class="slide-bg-layer"></div>
        <div class="slide-bg-overlay"></div>
        <div class="slide-header-bar px-6 md:px-12 pt-5 pb-4 border-b border-borderline flex items-center justify-between shrink-0">
          <div>
            <span data-editable class="font-mono text-xs text-gopro font-bold uppercase tracking-wider">02 · CORE SOLUTION</span>
            <h2 data-editable class="text-2xl md:text-4xl font-extrabold tracking-tight mt-0.5">핵심 솔루션 및 차별화 전략</h2>
          </div>
        </div>
        <div class="slide-grid-body flex-1 grid grid-cols-1 md:grid-cols-12 overflow-y-auto safe-scroll">
          <div class="slide-card hover-reactive md:col-span-7 p-8 border-b md:border-b-0 md:border-r border-borderline flex flex-col justify-between bg-white">
            <div>
              <span data-editable class="font-mono text-xs font-bold text-gopro block mb-2">VALUE PROPOSITION</span>
              <h3 data-editable class="text-2xl font-extrabold text-ink mb-4">원스톱 맞춤형 해결 방안</h3>
              <p data-editable class="text-base text-ink leading-relaxed">제안하는 솔루션의 작동 원리와 기존 대안 대비 우위를 명확하게 설명하세요.</p>
            </div>
            <div data-editable class="pt-4 border-t border-borderline font-mono text-xs text-subtle">CORE ARCHITECTURE</div>
          </div>
          <div class="slide-card hover-reactive md:col-span-5 p-8 flex flex-col justify-between bg-canvas">
            <div class="space-y-3">
              <div class="p-4 rounded-xl bg-white border border-borderline"><div data-editable class="font-mono text-[10px] font-bold text-gopro">FEATURE 01</div><div data-editable class="font-bold text-ink mt-1">핵심 기능 및 강점 1</div></div>
              <div class="p-4 rounded-xl bg-white border border-borderline"><div data-editable class="font-mono text-[10px] font-bold text-gopro">FEATURE 02</div><div data-editable class="font-bold text-ink mt-1">핵심 기능 및 강점 2</div></div>
              <div class="p-4 rounded-xl bg-white border border-borderline"><div data-editable class="font-mono text-[10px] font-bold text-gopro">FEATURE 03</div><div data-editable class="font-bold text-ink mt-1">핵심 기능 및 강점 3</div></div>
            </div>
          </div>
        </div>
        <div class="ppt-free-layer"></div>
      </section>
      <section class="slide" data-slide="5" data-section="03 · 실행 로드맵" style="background-color: #F5F5F7;">
        <div class="slide-bg-layer"></div>
        <div class="slide-bg-overlay"></div>
        <div class="slide-header-bar px-6 md:px-12 pt-5 pb-4 border-b border-borderline flex items-center justify-between shrink-0">
          <div>
            <span data-editable class="font-mono text-xs text-gopro font-bold uppercase tracking-wider">03 · ROADMAP</span>
            <h2 data-editable class="text-2xl md:text-4xl font-extrabold tracking-tight mt-0.5">단계별 추진 일정</h2>
          </div>
        </div>
        <div class="slide-grid-body flex-1 grid grid-cols-1 md:grid-cols-3 overflow-y-auto safe-scroll">
          <div class="slide-card hover-reactive p-8 border-b md:border-b-0 md:border-r border-borderline flex flex-col justify-between bg-white">
            <div><span data-editable class="font-mono text-xs font-bold text-gopro block mb-2">PHASE 01 · 1개월차</span><h3 data-editable class="text-xl font-extrabold text-ink mb-3">기획 및 설계</h3><p data-editable class="text-base text-muted leading-relaxed">요구사항 분석, 세부 일정 수립 및 프로토타입 설계 완료</p></div>
            <div data-editable class="pt-4 border-t border-borderline font-mono text-xs text-subtle">MILESTONE 01</div>
          </div>
          <div class="slide-card hover-reactive p-8 border-b md:border-b-0 md:border-r border-borderline flex flex-col justify-between bg-white">
            <div><span data-editable class="font-mono text-xs font-bold text-gopro block mb-2">PHASE 02 · 2개월차</span><h3 data-editable class="text-xl font-extrabold text-ink mb-3">구축 및 테스트</h3><p data-editable class="text-base text-muted leading-relaxed">핵심 모듈 개발, 내부 검증 및 사용자 피드백 반영</p></div>
            <div data-editable class="pt-4 border-t border-borderline font-mono text-xs text-subtle">MILESTONE 02</div>
          </div>
          <div class="slide-card hover-reactive p-8 flex flex-col justify-between bg-white">
            <div><span data-editable class="font-mono text-xs font-bold text-gopro block mb-2">PHASE 03 · 3개월차</span><h3 data-editable class="text-xl font-extrabold text-ink mb-3">런칭 및 성과 확산</h3><p data-editable class="text-base text-muted leading-relaxed">정식 오픈, 운영 안정화 및 KPI 달성 리포트 공유</p></div>
            <div data-editable class="pt-4 border-t border-borderline font-mono text-xs text-subtle">MILESTONE 03</div>
          </div>
        </div>
        <div class="ppt-free-layer"></div>
      </section>
      <section class="slide" data-slide="6" data-section="04 · 기대 효과" style="background-color: #111111;">
        <div class="slide-bg-layer"></div>
        <div class="slide-bg-overlay"></div>
        <div class="slide-grid-body flex-1 p-10 md:p-16 flex flex-col justify-between text-white">
          <span data-editable class="font-mono text-xs font-bold text-marker uppercase tracking-widest">04 · EXPECTED IMPACT</span>
          <div class="my-auto max-w-3xl">
            <h2 data-editable class="text-4xl md:text-6xl font-black tracking-tight leading-tight">함께 만드는 다음 단계의 성장</h2>
            <p data-editable class="mt-4 text-lg text-white/75 leading-relaxed">본 제안을 통해 예상되는 정량적 성과와 장기적 파트너십 비전을 요약합니다.</p>
          </div>
          <div class="pt-6 border-t border-white/15 flex items-center justify-between text-xs font-mono text-white/60">
            <span data-editable>THANK YOU · Q&amp;A</span>
            <button type="button" data-on-click="goToSlide(1)" class="px-4 py-2 rounded-full bg-gopro text-white font-bold cursor-pointer">↺ 처음으로</button>
          </div>
        </div>
        <div class="ppt-free-layer"></div>
      </section>
    `;
  } else if (templateKey === 'portfolio') {
    deckTitle = 'CREATIVE PORTFOLIO · WORK SHOWCASE';
    deckSub = `크리에이터 · 디자인 포트폴리오 · ${todayStr}`;
    stageHtml = `
      <section class="slide active" data-slide="1" data-section="00 · PORTFOLIO COVER" style="background-color: #111111;">
        <div class="slide-bg-layer"></div>
        <div class="slide-bg-overlay"></div>
        <div class="slide-grid-body flex-1 p-10 md:p-16 flex flex-col justify-between text-white">
          <div class="flex items-center justify-between">
            <span data-editable class="px-3.5 py-1 rounded-full bg-gopro text-white font-mono text-xs font-bold">PORTFOLIO 2026</span>
            <span data-editable class="font-mono text-xs text-white/60">${todayStr}</span>
          </div>
          <div class="my-auto max-w-4xl">
            <p data-editable class="font-mono text-xs uppercase tracking-[0.25em] text-marker font-bold mb-3">DESIGN · MOTION · VISUAL DIRECTION</p>
            <h1 data-editable class="text-5xl md:text-7xl font-black tracking-tight leading-[1.06]">홍길동 포트폴리오</h1>
            <p data-editable class="mt-5 text-lg text-white/75 leading-relaxed">브랜드의 핵심 메시지를 감각적인 비주얼과 <span class="kw">인터랙티브 스토리텔링</span>으로 구현합니다.</p>
          </div>
          <div class="pt-4 border-t border-white/15 flex items-center justify-between font-mono text-xs text-white/60">
            <span data-editable>CONTACT · creator@example.com</span>
            <span data-editable>PRESS [E] TO CUSTOMIZE</span>
          </div>
        </div>
        <div class="ppt-free-layer"></div>
      </section>
      <section class="slide" data-slide="2" data-section="01 · ABOUT & SKILLS" style="background-color: #F5F5F7;">
        <div class="slide-bg-layer"></div>
        <div class="slide-bg-overlay"></div>
        <div class="slide-header-bar px-6 md:px-12 pt-5 pb-4 border-b border-borderline flex items-center justify-between shrink-0">
          <div>
            <span data-editable class="font-mono text-xs text-gopro font-bold uppercase tracking-wider">01 · PROFILE</span>
            <h2 data-editable class="text-2xl md:text-4xl font-extrabold tracking-tight mt-0.5">소개 및 핵심 역량</h2>
          </div>
        </div>
        <div class="slide-grid-body flex-1 grid grid-cols-1 md:grid-cols-12 overflow-y-auto safe-scroll">
          <div class="slide-card hover-reactive md:col-span-5 p-8 border-b md:border-b-0 md:border-r border-borderline flex flex-col justify-between bg-white">
            <div>
              <span data-editable class="font-mono text-xs font-bold text-gopro block mb-2">ABOUT ME</span>
              <h3 data-editable class="text-2xl font-extrabold text-ink mb-3">디자이너 / 크리에이터</h3>
              <p data-editable class="text-base text-muted leading-relaxed">학력, 주요 수상 경력 및 작업 철학을 간결하고 임팩트 있게 소개하세요.</p>
            </div>
            <div data-editable class="pt-4 border-t border-borderline font-mono text-xs text-subtle">EXPERIENCE &amp; AWARDS</div>
          </div>
          <div class="slide-card hover-reactive md:col-span-7 p-8 flex flex-col justify-between bg-canvas">
            <span data-editable class="font-mono text-xs font-bold text-gopro block mb-3">TOOLS &amp; CAPABILITIES</span>
            <div class="grid grid-cols-2 gap-3 my-auto">
              <div class="p-4 rounded-xl bg-white border border-borderline"><div data-editable class="font-extrabold text-ink">3D &amp; Motion</div><div data-editable class="text-xs text-muted mt-1">Cinema 4D · Redshift · After Effects</div></div>
              <div class="p-4 rounded-xl bg-white border border-borderline"><div data-editable class="font-extrabold text-ink">Brand &amp; Visual</div><div data-editable class="text-xs text-muted mt-1">Illustrator · Photoshop · Figma</div></div>
              <div class="p-4 rounded-xl bg-white border border-borderline"><div data-editable class="font-extrabold text-ink">Interactive Web</div><div data-editable class="text-xs text-muted mt-1">HTML/CSS · Motion Prototyping</div></div>
              <div class="p-4 rounded-xl bg-white border border-borderline"><div data-editable class="font-extrabold text-ink">Film &amp; Sound</div><div data-editable class="text-xs text-muted mt-1">Directing · Editing · Sound Design</div></div>
            </div>
          </div>
        </div>
        <div class="ppt-free-layer"></div>
      </section>
      <section class="slide" data-slide="3" data-section="02 · PROJECT 01" style="background-color: #F5F5F7;">
        <div class="slide-bg-layer"></div>
        <div class="slide-bg-overlay"></div>
        <div class="slide-header-bar px-6 md:px-12 pt-5 pb-4 border-b border-borderline flex items-center justify-between shrink-0">
          <div>
            <span data-editable class="font-mono text-xs text-gopro font-bold uppercase tracking-wider">02 · SELECTED WORK 01</span>
            <h2 data-editable class="text-2xl md:text-4xl font-extrabold tracking-tight mt-0.5">대표 프로젝트 쇼케이스</h2>
          </div>
        </div>
        <div class="slide-grid-body flex-1 grid grid-cols-1 md:grid-cols-12 overflow-y-auto safe-scroll">
          <div class="slide-card hover-reactive md:col-span-7 p-8 border-b md:border-b-0 md:border-r border-borderline flex flex-col justify-between bg-white">
            <div class="image-slot-box relative flex-1 min-h-[240px] rounded-2xl border-2 border-dashed border-borderline hover:border-gopro bg-canvas overflow-hidden flex flex-col items-center justify-center text-center p-6 cursor-pointer" data-on-click="triggerImageUpload(this)">
              <img class="slot-img hidden w-full h-full object-cover absolute inset-0" alt="작품 이미지">
              <div class="slot-placeholder pointer-events-none">
                <p class="text-sm font-bold text-ink">클릭하여 대표 작업물 이미지 또는 영상 업로드</p>
                <p class="text-xs text-muted mt-1">편집 모드(E)에서 클릭하면 즉시 첨부됩니다</p>
              </div>
            </div>
          </div>
          <div class="slide-card hover-reactive md:col-span-5 p-8 flex flex-col justify-between bg-white">
            <div>
              <span data-editable class="font-mono text-xs font-bold text-gopro block mb-2">PROJECT OVERVIEW</span>
              <h3 data-editable class="text-2xl font-extrabold text-ink mb-3">작품 타이틀</h3>
              <p data-editable class="text-base text-muted leading-relaxed">기획 의도, 비주얼 콘셉트, 사용 툴 및 본인 기여도를 상세히 기술하세요.</p>
            </div>
            <div class="pt-4 border-t border-borderline font-mono text-xs text-subtle" data-editable>ROLE: ART DIRECTION · 100%</div>
          </div>
        </div>
        <div class="ppt-free-layer"></div>
      </section>
      <section class="slide" data-slide="4" data-section="03 · PROCESS" style="background-color: #F5F5F7;">
        <div class="slide-bg-layer"></div>
        <div class="slide-bg-overlay"></div>
        <div class="slide-header-bar px-6 md:px-12 pt-5 pb-4 border-b border-borderline flex items-center justify-between shrink-0">
          <div>
            <span data-editable class="font-mono text-xs text-gopro font-bold uppercase tracking-wider">03 · WORKFLOW</span>
            <h2 data-editable class="text-2xl md:text-4xl font-extrabold tracking-tight mt-0.5">작업 프로세스</h2>
          </div>
        </div>
        <div class="slide-grid-body flex-1 grid grid-cols-1 md:grid-cols-3 overflow-y-auto safe-scroll">
          <div class="slide-card hover-reactive p-8 border-b md:border-b-0 md:border-r border-borderline flex flex-col justify-between bg-white">
            <div><span data-editable class="font-mono text-xs font-bold text-gopro block mb-2">STEP 01</span><h3 data-editable class="text-xl font-extrabold text-ink mb-3">리서치 &amp; 콘셉트</h3><p data-editable class="text-base text-muted leading-relaxed">브랜드 분석과 레퍼런스 수집을 통한 핵심 시각 방향 도출</p></div>
          </div>
          <div class="slide-card hover-reactive p-8 border-b md:border-b-0 md:border-r border-borderline flex flex-col justify-between bg-white">
            <div><span data-editable class="font-mono text-xs font-bold text-gopro block mb-2">STEP 02</span><h3 data-editable class="text-xl font-extrabold text-ink mb-3">디자인 &amp; 프로토타이핑</h3><p data-editable class="text-base text-muted leading-relaxed">룩앤필 시안 제작, 모션 테스트 및 인터랙션 구현</p></div>
          </div>
          <div class="slide-card hover-reactive p-8 flex flex-col justify-between bg-white">
            <div><span data-editable class="font-mono text-xs font-bold text-gopro block mb-2">STEP 03</span><h3 data-editable class="text-xl font-extrabold text-ink mb-3">파이널 렌더링 &amp; 배포</h3><p data-editable class="text-base text-muted leading-relaxed">최종 디테일 보정 및 멀티 플랫폼 최적화 납품</p></div>
          </div>
        </div>
        <div class="ppt-free-layer"></div>
      </section>
      <section class="slide" data-slide="5" data-section="04 · CONTACT" style="background-color: #F5F5F7;">
        <div class="slide-bg-layer"></div>
        <div class="slide-bg-overlay"></div>
        <div class="slide-grid-body flex-1 p-10 md:p-16 flex flex-col justify-between">
          <span data-editable class="font-mono text-xs font-bold text-gopro uppercase">04 · GET IN TOUCH</span>
          <div class="my-auto">
            <h2 data-editable class="text-4xl md:text-6xl font-black tracking-tight text-ink">감사합니다.</h2>
            <p data-editable class="mt-4 text-lg text-muted">협업 및 프로젝트 문의: creator@example.com</p>
          </div>
          <div class="pt-4 border-t border-borderline flex items-center justify-between text-xs font-mono text-muted">
            <span data-editable>© 2026 PORTFOLIO</span>
            <button type="button" data-on-click="goToSlide(1)" class="px-4 py-2 rounded-full bg-ink text-white font-bold cursor-pointer">↺ 처음으로</button>
          </div>
        </div>
        <div class="ppt-free-layer"></div>
      </section>
    `;
  } else if (templateKey === 'report') {
    deckTitle = 'ANALYTICS & RESEARCH REPORT';
    deckSub = `데이터 분석 및 성과 리포트 · ${todayStr}`;
    stageHtml = `
      <section class="slide active" data-slide="1" data-section="00 · REPORT COVER" style="background-color: #0B192C;">
        <div class="slide-bg-layer"></div>
        <div class="slide-bg-overlay"></div>
        <div class="slide-grid-body flex-1 p-10 md:p-16 flex flex-col justify-between text-white">
          <div class="flex items-center gap-3">
            <span data-editable class="px-3.5 py-1 rounded-full bg-gopro text-white font-mono text-xs font-bold">RESEARCH REPORT</span>
            <span data-editable class="font-mono text-xs text-white/60">${todayStr}</span>
          </div>
          <div class="my-auto max-w-4xl">
            <p data-editable class="font-mono text-xs uppercase tracking-[0.2em] text-sky-300 font-bold mb-3">DATA INSIGHT &amp; PERFORMANCE REVIEW</p>
            <h1 data-editable class="text-5xl md:text-6xl font-black tracking-tight leading-[1.1]">데이터 분석 및 성과 리포트</h1>
            <p data-editable class="mt-4 text-lg text-white/80 leading-relaxed">핵심 지표(KPI) 분석과 데이터 기반의 <span class="kw">차기 액션 플랜</span> 보고</p>
          </div>
          <div class="pt-4 border-t border-white/15 font-mono text-xs text-white/60" data-editable>ANALYTICS TEAM · CONFIDENTIAL</div>
        </div>
        <div class="ppt-free-layer"></div>
      </section>
      <section class="slide" data-slide="2" data-section="01 · EXECUTIVE SUMMARY" style="background-color: #F5F5F7;">
        <div class="slide-bg-layer"></div>
        <div class="slide-bg-overlay"></div>
        <div class="slide-header-bar px-6 md:px-12 pt-5 pb-4 border-b border-borderline flex items-center justify-between shrink-0">
          <div>
            <span data-editable class="font-mono text-xs text-gopro font-bold uppercase tracking-wider">01 · KEY METRICS</span>
            <h2 data-editable class="text-2xl md:text-4xl font-extrabold tracking-tight mt-0.5">핵심 성과 요약 (KPI)</h2>
          </div>
        </div>
        <div class="slide-grid-body flex-1 grid grid-cols-1 md:grid-cols-3 overflow-y-auto safe-scroll">
          <div class="slide-card hover-reactive p-8 border-b md:border-b-0 md:border-r border-borderline flex flex-col justify-between bg-white">
            <span data-editable class="font-mono text-xs font-bold text-muted">METRIC 01 · 성장률</span>
            <div data-editable class="text-5xl font-black text-gopro my-4">+142%</div>
            <p data-editable class="text-sm text-muted">전년 동기 대비 핵심 전환 지표 상승</p>
          </div>
          <div class="slide-card hover-reactive p-8 border-b md:border-b-0 md:border-r border-borderline flex flex-col justify-between bg-white">
            <span data-editable class="font-mono text-xs font-bold text-muted">METRIC 02 · 만족도</span>
            <div data-editable class="text-5xl font-black text-ink my-4">4.8 / 5.0</div>
            <p data-editable class="text-sm text-muted">타깃 사용자 설문 평균 만족도 점수</p>
          </div>
          <div class="slide-card hover-reactive p-8 flex flex-col justify-between bg-white">
            <span data-editable class="font-mono text-xs font-bold text-muted">METRIC 03 · 비용 절감</span>
            <div data-editable class="text-5xl font-black text-emerald-600 my-4">-34%</div>
            <p data-editable class="text-sm text-muted">프로세스 자동화를 통한 운영 비용 단축</p>
          </div>
        </div>
        <div class="ppt-free-layer"></div>
      </section>
      <section class="slide" data-slide="3" data-section="02 · COMPARISON TABLE" style="background-color: #F5F5F7;">
        <div class="slide-bg-layer"></div>
        <div class="slide-bg-overlay"></div>
        <div class="slide-header-bar px-6 md:px-12 pt-5 pb-4 border-b border-borderline flex items-center justify-between shrink-0">
          <div>
            <span data-editable class="font-mono text-xs text-gopro font-bold uppercase tracking-wider">02 · BENCHMARK</span>
            <h2 data-editable class="text-2xl md:text-4xl font-extrabold tracking-tight mt-0.5">세부 항목 비교 분석</h2>
          </div>
        </div>
        <div class="slide-grid-body flex-1 grid grid-cols-1 overflow-y-auto safe-scroll">
          <div class="slide-card hover-reactive p-8 flex flex-col justify-between bg-white">
            <div class="ppt-chart-widget" data-chart-uid="chart_tpl_report_1" data-chart-json='{"type":"table","title":"주요 지표 비교표","syncAccent":true,"items":[{"label":"항목 A","value":90,"sub":"","color":"#0055FF"},{"label":"항목 B","value":75,"sub":"","color":"#111111"},{"label":"항목 C","value":85,"sub":"","color":"#059669"}],"tableHeaders":["평가 항목","당사 솔루션","기존 방식"],"tableRows":[["처리 속도","평균 1.2초","평균 8.5초"],["도입 비용","합리적 구독형","초기 고액 구축"],["유지보수","자동 업데이트","수동 패치 필요"]],"colWidths":[],"rowHeights":{},"cellStyles":{}}'>
              <div class="flex items-center justify-between mb-2">
                <h4 data-editable class="text-base font-extrabold text-ink">주요 지표 비교표</h4>
                <span class="font-mono text-[10px] text-subtle">DATA TABLE</span>
              </div>
              <div class="flex-1 overflow-auto">
                <table class="ppt-data-table">
                  <thead><tr><th>평가 항목</th><th>당사 솔루션</th><th>기존 방식</th></tr></thead>
                  <tbody>
                    <tr><td>처리 속도</td><td>평균 1.2초</td><td>평균 8.5초</td></tr>
                    <tr><td>도입 비용</td><td>합리적 구독형</td><td>초기 고액 구축</td></tr>
                    <tr><td>유지보수</td><td>자동 업데이트</td><td>수동 패치 필요</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div class="ppt-free-layer"></div>
      </section>
      <section class="slide" data-slide="4" data-section="03 · ACTION PLAN" style="background-color: #F5F5F7;">
        <div class="slide-bg-layer"></div>
        <div class="slide-bg-overlay"></div>
        <div class="slide-header-bar px-6 md:px-12 pt-5 pb-4 border-b border-borderline flex items-center justify-between shrink-0">
          <div>
            <span data-editable class="font-mono text-xs text-gopro font-bold uppercase tracking-wider">03 · CONCLUSION</span>
            <h2 data-editable class="text-2xl md:text-4xl font-extrabold tracking-tight mt-0.5">결론 및 향후 실행 제언</h2>
          </div>
        </div>
        <div class="slide-grid-body flex-1 grid grid-cols-1 md:grid-cols-2 overflow-y-auto safe-scroll">
          <div class="slide-card hover-reactive p-8 border-b md:border-b-0 md:border-r border-borderline flex flex-col justify-between bg-white">
            <div><span data-editable class="font-mono text-xs font-bold text-gopro block mb-2">KEY TAKEAWAY</span><h3 data-editable class="text-2xl font-extrabold text-ink mb-3">핵심 분석 결론</h3><p data-editable class="text-base text-muted leading-relaxed">데이터 분석을 통해 도출된 가장 중요한 시사점을 요약하세요.</p></div>
          </div>
          <div class="slide-card hover-reactive p-8 flex flex-col justify-between bg-white">
            <div><span data-editable class="font-mono text-xs font-bold text-gopro block mb-2">NEXT STEP</span><h3 data-editable class="text-2xl font-extrabold text-ink mb-3">차기 실행 과제</h3><p data-editable class="text-base text-muted leading-relaxed">즉시 착수해야 할 우선순위 액션 아이템 2~3가지를 정리하세요.</p></div>
          </div>
        </div>
        <div class="ppt-free-layer"></div>
      </section>
    `;
  } else if (templateKey === 'showcase') {
    deckTitle = 'HTML SLIDE TOOL · INTERACTIVE SHOWCASE';
    deckSub = `인터랙티브 데모 갤러리 · ${todayStr}`;
    const demoChartJson = JSON.stringify({
      type: 'bar-v',
      title: '포맷별 제작 효율 비교 (시나리오 전환 체험)',
      scenariosEnabled: true,
      activeScenarioIdx: 0,
      scenarios: [
        { name: '기본', items: [{ label: 'HTML Slide Tool', value: 96, sub: '단독 실행 · 2D 벤토', color: '#0055FF' }, { label: '전통 데스크톱 PPT', value: 72, sub: '설치 필요', color: '#111111' }, { label: '클라우드 웹 툴', value: 78, sub: '인터넷 종속', color: '#059669' }, { label: '정적 PDF 문서', value: 54, sub: '인터랙션 불가', color: '#D97706' }] },
        { name: '오프라인 발표', items: [{ label: 'HTML Slide Tool', value: 100, sub: '100% 무-CDN 오프라인', color: '#0055FF' }, { label: '전통 데스크톱 PPT', value: 85, sub: '뷰어 설치 필요', color: '#111111' }, { label: '클라우드 웹 툴', value: 25, sub: '네트워크 단절 시 불가', color: '#059669' }, { label: '정적 PDF 문서', value: 65, sub: '정적 문서만 가능', color: '#D97706' }] },
        { name: '인터랙션', items: [{ label: 'HTML Slide Tool', value: 98, sub: '비교슬라이더·핫스팟·3D플립', color: '#0055FF' }, { label: '전통 데스크톱 PPT', value: 42, sub: '단순 전환 위주', color: '#111111' }, { label: '클라우드 웹 툴', value: 58, sub: '제한적 애니메이션', color: '#059669' }, { label: '정적 PDF 문서', value: 10, sub: '인터랙션 없음', color: '#D97706' }] }
      ],
      syncAccent: false,
      valuePrefix: '',
      valueSuffix: '점',
      items: [
        { label: 'HTML Slide Tool', value: 96, sub: '단독 실행 · 2D 벤토', color: '#0055FF' },
        { label: '전통 데스크톱 PPT', value: 72, sub: '설치 필요', color: '#111111' },
        { label: '클라우드 웹 툴', value: 78, sub: '인터넷 종속', color: '#059669' },
        { label: '정적 PDF 문서', value: 54, sub: '인터랙션 불가', color: '#D97706' }
      ]
    }).replace(/"/g, '&quot;');
    stageHtml = `
      <section class="slide active theme-dark" data-slide="1" data-section="00 · SHOWCASE" style="background-color: #0F172A;">
        <div class="slide-bg-layer"></div>
        <div class="slide-bg-overlay"></div>
        <div class="slide-grid-body flex-1 grid grid-cols-1 md:grid-cols-12 h-full overflow-y-auto safe-scroll">
          <div class="slide-card hover-reactive md:col-span-8 p-8 md:p-14 border-b md:border-b-0 md:border-r border-borderline flex flex-col justify-between" style="background-color: #1E293B;">
            <div class="flex items-center gap-2">
              <span data-editable class="px-3.5 py-1 rounded-full bg-gopro text-white font-mono text-xs font-bold">INTERACTIVE DEMO</span>
              <span data-editable class="font-mono text-xs text-subtle">${todayStr}</span>
            </div>
            <div class="my-auto py-6">
              <p data-editable class="font-mono text-xs uppercase tracking-[0.2em] text-sky-300 font-bold mb-3">HTML SLIDE TOOL v4.7.0 SHOWCASE</p>
              <h1 data-editable class="text-5xl md:text-6xl font-black tracking-tight text-white leading-tight">브라우저 하나로 완성하는<br>인터랙티브 프레젠테이션</h1>
              <p data-editable class="mt-5 text-base md:text-lg text-white/80 max-w-xl leading-relaxed">
                <span class="kw">24×24 2D 비대칭 벤토</span>, <span class="kw">실시간 차트</span>, <span class="kw">플로팅 팝업 카드</span>, <span class="kw">원클릭 브랜드 키트</span>를 직접 체험해 보세요.
              </p>
            </div>
            <div data-editable class="pt-4 border-t border-white/15 font-mono text-xs text-white/70">PRESS [H] FOR KEYWORDS · [E] TO EDIT · [→] NEXT SLIDE</div>
          </div>
          <div class="slide-card hover-reactive md:col-span-4 p-8 md:p-10 flex flex-col justify-between" style="background-color: #111827;">
            <div>
              <span data-editable class="font-mono text-xs text-sky-300 font-bold block mb-3">WHAT'S INSIDE</span>
              <h2 data-editable class="text-2xl font-extrabold text-white mb-4">4단계 인터랙티브 시연</h2>
              <ul class="space-y-3 text-sm text-white/80">
                <li data-editable>01. 다크 테크 표지 &amp; 키워드 강조 (H)</li>
                <li data-editable>02. 24×24 비대칭 2D 벤토 레이아웃</li>
                <li data-editable>03. 편집 가능한 라이브 차트 &amp; 스포트라이트</li>
                <li data-editable>04. 클릭 시 열리는 플로팅 팝업 카드</li>
              </ul>
            </div>
            <div data-editable class="p-3 rounded-xl bg-white/10 border border-white/15 font-mono text-xs text-white/80">ZERO CDN · 100% OFFLINE READY</div>
          </div>
        </div>
        <div class="ppt-free-layer"></div>
      </section>

      <section class="slide" data-slide="2" data-section="01 · 2D BENTO" style="background-color: #F5F5F7;">
        <div class="slide-bg-layer"></div>
        <div class="slide-bg-overlay"></div>
        <div class="slide-header-bar px-6 md:px-12 pt-5 pb-4 border-b border-borderline flex items-center justify-between shrink-0">
          <div>
            <span data-editable class="font-mono text-xs text-gopro font-bold uppercase tracking-wider">01 · ASYMMETRIC 2D BENTO GRID</span>
            <h2 data-editable class="text-2xl md:text-4xl font-extrabold tracking-tight mt-0.5">24×24 비대칭 2D 벤토 레이아웃 시연</h2>
          </div>
        </div>
        <div class="slide-grid-body flex-1 grid" data-bento-2d="true" style="display: grid; grid-template-columns: repeat(24, minmax(0, 1fr)); grid-template-rows: repeat(24, minmax(0, 1fr)); overflow-y: hidden;">
          <div class="slide-card hover-reactive p-8 md:p-10 border-r border-borderline flex flex-col justify-between bg-white" data-bento-start-col="1" data-bento-span="13" data-bento-start-row="1" data-bento-row-span="24" style="grid-column: 1 / span 13; grid-row: 1 / span 24; height: 100%; min-height: 0; max-height: none; margin-top: 0; align-self: stretch;">
            <div>
              <span data-editable class="font-mono text-xs font-bold text-gopro block mb-3">LEFT HERO · FULL HEIGHT (24 ROWS)</span>
              <h3 data-editable class="text-2xl md:text-3xl font-extrabold text-ink mb-4">좌측 전체 높이 + 우측 상·하 2분할 구조</h3>
              <p data-editable class="text-base text-muted leading-relaxed">편집 모드(E)에서 각 카드의 경계선을 드래그하면 맞닿은 카드들이 2D 그리드 단위로 정밀 연동됩니다. 카드를 다른 카드의 상·하·좌·우로 드래그해 즉시 2분할할 수도 있습니다.</p>
            </div>
            <div data-editable class="pt-4 border-t border-borderline font-mono text-xs text-subtle">COL 1–13 · ROW 1–24</div>
          </div>
          <div class="slide-card hover-reactive p-6 md:p-8 border-b border-borderline flex flex-col justify-between bg-white" data-bento-start-col="14" data-bento-span="11" data-bento-start-row="1" data-bento-row-span="12" style="grid-column: 14 / span 11; grid-row: 1 / span 12; height: 100%; min-height: 0; max-height: none; margin-top: 0; align-self: stretch;">
            <div>
              <span data-editable class="font-mono text-xs font-bold text-emerald-600 block mb-2">TOP RIGHT · 12 ROWS</span>
              <h3 data-editable class="text-xl font-extrabold text-ink mb-2">우측 상단 카드 (카드 2)</h3>
              <p data-editable class="text-sm text-muted leading-relaxed">하단 경계선을 위·아래로 조절해도 좌측 히어로 카드는 고정된 채 우측 두 카드만 비율이 바뀝니다.</p>
            </div>
          </div>
          <div class="slide-card hover-reactive p-6 md:p-8 flex flex-col justify-between bg-white" data-bento-start-col="14" data-bento-span="11" data-bento-start-row="13" data-bento-row-span="12" style="grid-column: 14 / span 11; grid-row: 13 / span 12; height: 100%; min-height: 0; max-height: none; margin-top: 0; align-self: stretch;">
            <div>
              <span data-editable class="font-mono text-xs font-bold text-indigo-600 block mb-2">BOTTOM RIGHT · 12 ROWS</span>
              <h3 data-editable class="text-xl font-extrabold text-ink mb-2">우측 하단 카드 (카드 3)</h3>
              <p data-editable class="text-sm text-muted leading-relaxed">카드를 삭제하면 맞닿아 있는 위쪽 카드가 빈 영역을 깔끔하게 메워줍니다.</p>
            </div>
          </div>
        </div>
        <div class="ppt-free-layer"></div>
      </section>

      <section class="slide" data-slide="3" data-section="02 · LIVE CHART" style="background-color: #F5F5F7;">
        <div class="slide-bg-layer"></div>
        <div class="slide-bg-overlay"></div>
        <div class="slide-header-bar px-6 md:px-12 pt-5 pb-4 border-b border-borderline flex items-center justify-between shrink-0">
          <div>
            <span data-editable class="font-mono text-xs text-gopro font-bold uppercase tracking-wider">02 · LIVE CHART &amp; HIGH-FIDELITY EXPORT</span>
            <h2 data-editable class="text-2xl md:text-4xl font-extrabold tracking-tight mt-0.5">편집 가능한 라이브 차트 &amp; 고충실도 내보내기</h2>
          </div>
        </div>
        <div class="slide-grid-body flex-1 grid grid-cols-1 md:grid-cols-12 overflow-y-auto safe-scroll">
          <div class="slide-card hover-reactive md:col-span-7 p-6 md:p-8 border-b md:border-b-0 md:border-r border-borderline flex flex-col justify-center bg-white">
            <div class="ppt-chart-widget" data-chart-uid="demo_chart_01" data-chart-json="${demoChartJson}"></div>
          </div>
          <div class="slide-card hover-reactive md:col-span-5 p-6 md:p-8 flex flex-col justify-between bg-white" data-spotlight-group="true">
            <div class="space-y-3">
              <div class="p-4 rounded-xl bg-canvas border border-borderline" data-fx="hover-spotlight">
                <div data-editable class="font-mono text-xs font-bold text-gopro">FEATURE A</div>
                <div data-editable class="font-extrabold text-ink mt-1">고충실도 PNG · PPTX 내보내기</div>
                <div data-editable class="text-xs text-muted mt-1">차트·도형·그라데이션이 선명하게 출력됩니다.</div>
              </div>
              <div class="p-4 rounded-xl bg-canvas border border-borderline" data-fx="hover-spotlight">
                <div data-editable class="font-mono text-xs font-bold text-gopro">FEATURE B</div>
                <div data-editable class="font-extrabold text-ink mt-1">원클릭 브랜드 키트 전환</div>
                <div data-editable class="text-xs text-muted mt-1">디자인 탭 5번에서 8종의 테마를 즉시 체험하세요.</div>
              </div>
            </div>
            <div data-editable class="pt-3 border-t border-borderline font-mono text-xs text-subtle">HOVER CARDS ABOVE IN PRESENTATION MODE</div>
          </div>
        </div>
        <div class="ppt-free-layer"></div>
      </section>

      <section class="slide" data-slide="4" data-section="03 · INTERACTIVE" style="background-color: #F5F5F7;">
        <div class="slide-bg-layer"></div>
        <div class="slide-bg-overlay"></div>
        <div class="slide-header-bar px-6 md:px-12 pt-5 pb-4 border-b border-borderline flex items-center justify-between shrink-0">
          <div>
            <span data-editable class="font-mono text-xs text-gopro font-bold uppercase tracking-wider">03 · FLOATING POPUP CARD DEMO</span>
            <h2 data-editable class="text-2xl md:text-4xl font-extrabold tracking-tight mt-0.5">발표 중 클릭으로 열리는 플로팅 팝업 카드</h2>
          </div>
        </div>
        <div class="slide-grid-body flex-1 grid grid-cols-1 md:grid-cols-2 overflow-y-auto safe-scroll">
          <div class="slide-card hover-reactive p-8 md:p-12 border-b md:border-b-0 md:border-r border-borderline flex flex-col justify-between bg-white">
            <div>
              <span data-editable class="font-mono text-xs font-bold text-gopro block mb-3">INTERACTIVE POPUP</span>
              <h3 data-editable class="text-2xl font-extrabold text-ink mb-4">핵심 근거 자료를 팝업으로 숨겨두기</h3>
              <p data-editable class="text-base text-muted leading-relaxed">발표 모드에서 오른쪽 카드를 클릭하면 보충 설명과 세부 스펙이 담긴 플로팅 팝업 카드가 즉시 펼쳐집니다. Esc·Enter·Space 키로 깔끔하게 닫을 수 있습니다.</p>
            </div>
            <div data-editable class="pt-4 border-t border-borderline font-mono text-xs text-subtle">TRY CLICKING THE RIGHT CARD IN PRESENTATION MODE</div>
          </div>
          <div class="slide-card hover-reactive p-8 md:p-12 flex flex-col items-center justify-center text-center bg-white cursor-pointer" data-floating-card-ids="fc_showcase_demo_1" data-floating-card-id="fc_showcase_demo_1" data-fx="hover-lift">
            <span data-editable class="px-3 py-1 rounded-full bg-gopro/10 text-gopro font-mono text-xs font-bold mb-4">CLICK TO OPEN POPUP</span>
            <h3 data-editable class="text-2xl font-extrabold text-ink mb-2">상세 스펙 플로팅 카드 열기 →</h3>
            <p data-editable class="text-sm text-muted max-w-sm">발표 모드에서 이 카드를 클릭해 플로팅 팝업 카드 인터랙션을 확인해 보세요.</p>
          </div>
        </div>
        <div class="ppt-free-layer"></div>
      </section>
      <section class="slide" data-slide="5" data-section="04 · WIDGETS" style="background-color: #F5F5F7;">
        <div class="slide-bg-layer"></div>
        <div class="slide-bg-overlay"></div>
        <div class="slide-header-bar px-6 md:px-12 pt-5 pb-4 border-b border-borderline flex items-center justify-between shrink-0">
          <div>
            <span data-editable class="font-mono text-xs text-gopro font-bold uppercase tracking-wider">04 · WEB-NATIVE INTERACTIVE WIDGETS</span>
            <h2 data-editable class="text-2xl md:text-4xl font-extrabold tracking-tight mt-0.5">Before/After 비교 슬라이더 &amp; 3D 앞/뒷면 플립 카드</h2>
          </div>
        </div>
        <div class="slide-grid-body flex-1 grid grid-cols-1 md:grid-cols-12 overflow-y-auto safe-scroll">
          <div class="slide-card hover-reactive md:col-span-7 p-5 md:p-6 border-b md:border-b-0 md:border-r border-borderline flex flex-col justify-center bg-white">
            <div class="card-embedded-obj ppt-interactive-widget" data-iw-type="before-after" data-shape-type="interactive" style="width:100%; height:100%; min-height:280px; padding:0;">${typeof buildBeforeAfterWidgetHtml === 'function' ? buildBeforeAfterWidgetHtml() : ''}</div>
          </div>
          <div class="slide-card hover-reactive md:col-span-5 p-5 md:p-6 flex flex-col justify-center bg-white">
            <div class="card-embedded-obj ppt-interactive-widget" data-iw-type="flip-card" data-shape-type="interactive" style="width:100%; height:100%; min-height:280px; padding:0;">${typeof buildFlipCardWidgetHtml === 'function' ? buildFlipCardWidgetHtml() : ''}</div>
          </div>
        </div>
        <div class="ppt-free-layer"></div>
      </section>
    `;
  } else {
    // 'blank': Clean minimal 2-slide starter deck
    stageHtml = `
      <section class="slide active" data-slide="1" data-section="00 · COVER" style="background-color: #F5F5F7;">
        <div class="slide-bg-layer"></div>
        <div class="slide-bg-overlay"></div>
        <div class="slide-grid-body flex-1 grid grid-cols-1 md:grid-cols-12 h-full overflow-y-auto safe-scroll">
          <div class="slide-card hover-reactive md:col-span-8 border-b md:border-b-0 md:border-r border-borderline p-8 md:p-14 flex flex-col justify-between bg-white">
            <div class="flex items-center gap-3">
              <span data-editable class="px-3.5 py-1 rounded-full bg-ink text-white text-xs font-bold">NEW PROJECT</span>
              <span data-editable class="font-mono text-xs text-muted">${todayIso}</span>
            </div>
            <div class="my-auto py-6">
              <p data-editable class="font-mono text-xs uppercase tracking-[0.2em] text-gopro font-bold mb-3">PRESENTATION TITLE</p>
              <h1 data-editable class="text-5xl md:text-6xl font-black tracking-tight text-ink leading-[1.1]">새 프레젠테이션 제목</h1>
              <p data-editable class="mt-4 text-lg text-muted">부제목 또는 핵심 기획 의도를 입력하세요.</p>
            </div>
            <div class="pt-4 border-t border-borderline font-mono text-xs text-muted" data-editable>PRESS [E] TO OPEN STUDIO · [?] FOR SHORTCUTS</div>
          </div>
          <div class="slide-card hover-reactive md:col-span-4 p-8 md:p-10 flex flex-col justify-between bg-canvas">
            <div>
              <span data-editable class="font-mono text-xs text-subtle block mb-2">TEAM / AUTHOR</span>
              <h2 data-editable class="text-2xl font-extrabold text-ink">발표자 / 팀명</h2>
            </div>
            <div class="p-4 rounded-xl bg-white border border-borderline">
              <div data-editable class="font-bold text-ink">구성원 / 역할</div>
              <div data-editable class="text-xs text-muted mt-1">클릭하여 자유롭게 수정하세요</div>
            </div>
          </div>
        </div>
        <div class="ppt-free-layer"></div>
      </section>
      <section class="slide" data-slide="2" data-section="01 · 본문 슬라이드" style="background-color: #F5F5F7;">
        <div class="slide-bg-layer"></div>
        <div class="slide-bg-overlay"></div>
        <div class="slide-header-bar px-6 md:px-12 pt-5 pb-4 border-b border-borderline flex items-center justify-between shrink-0">
          <div>
            <span data-editable class="font-mono text-xs text-gopro font-bold uppercase tracking-wider">01 · SECTION</span>
            <h2 data-editable class="text-2xl md:text-4xl font-extrabold tracking-tight mt-0.5">핵심 내용 슬라이드</h2>
          </div>
        </div>
        <div class="slide-grid-body flex-1 grid grid-cols-1 md:grid-cols-2 overflow-y-auto safe-scroll">
          <div class="slide-card hover-reactive p-6 md:p-10 border-b md:border-b-0 md:border-r border-borderline flex flex-col justify-between bg-white">
            <div>
              <span data-editable class="font-mono text-xs font-bold text-gopro block mb-3">POINT 01</span>
              <h3 data-editable class="text-2xl font-extrabold text-ink mb-4">첫 번째 주제</h3>
              <p data-editable class="text-base md:text-lg text-ink leading-relaxed">텍스트를 클릭해 수정하거나 HTML Slide Tool에서 카드·도형·미디어를 추가하세요.</p>
            </div>
            <div class="pt-4 mt-6 border-t border-borderline font-mono text-xs text-subtle" data-editable>SLIDE 02</div>
          </div>
          <div class="slide-card hover-reactive p-6 md:p-10 flex flex-col justify-between bg-white">
            <div>
              <span data-editable class="font-mono text-xs font-bold text-gopro block mb-3">POINT 02</span>
              <h3 data-editable class="text-2xl font-extrabold text-ink mb-4">두 번째 주제</h3>
              <p data-editable class="text-base md:text-lg text-ink leading-relaxed">슬라이드 추가, 레이아웃 변경, 트랜지션 효과를 자유롭게 구성할 수 있습니다.</p>
            </div>
            <div class="pt-4 mt-6 border-t border-borderline font-mono text-xs text-subtle" data-editable>SLIDE 02</div>
          </div>
        </div>
        <div class="ppt-free-layer"></div>
      </section>
    `;
  }

  setHeaderDeckTitleSafely(deckTitle);
  if (document.getElementById('headerDeckSubtitle')) document.getElementById('headerDeckSubtitle').textContent = deckSub;
  const showcaseStoreHtml = templateKey === 'showcase'
    ? `<div id="pptFloatingCardsStore" class="hidden" aria-hidden="true"><div data-fc-id="fc_showcase_demo_1" data-fc-title="HTML Slide Tool 핵심 아키텍처 상세" data-fc-use-width-preset="true" data-fc-width-class="max-w-2xl" data-fc-custom-w="640" data-fc-bg="#FFFFFF" data-fc-opacity="100" data-fc-color="#111111" data-fc-radius="20px" data-fc-border-color="#111111" data-fc-border-width="2px" data-fc-shadow="on"><span class="font-mono text-xs font-bold text-gopro uppercase block mb-2">FLOATING POPUP CARD · LIVE DEMO</span><h3 class="text-2xl font-extrabold text-ink mb-3">별도 뷰어 없이 브라우저에서 완성되는 발표 경험</h3><p class="text-sm text-muted leading-relaxed mb-4">이 팝업 카드는 발표 중 청중의 질문에 답하거나 추가 데이터·이미지·차트를 즉시 띄울 때 사용할 수 있습니다. 편집 모드 → [모션·연동] 탭에서 누구나 쉽게 만들고 연결할 수 있습니다.</p><div class="p-3.5 rounded-xl bg-canvas border border-borderline text-xs text-ink font-semibold">• 완전 오프라인 단독 HTML 저장 (.html)<br>• PowerPoint (.pptx) · PDF · PNG/JPG 내보내기<br>• 24×24 비대칭 2D 벤토 그리드 및 원클릭 브랜드 키트</div></div></div>`
    : '<div id="pptFloatingCardsStore" class="hidden" aria-hidden="true"></div>';
  stage.innerHTML = showcaseStoreHtml + stageHtml;
  if (typeof writeChartDataAndRender === 'function') {
    stage.querySelectorAll('.ppt-chart-widget[data-chart-json]').forEach(w => {
      try { writeChartDataAndRender(w, JSON.parse(w.getAttribute('data-chart-json'))); } catch (e) {}
    });
  }
  currentSlide = 1;
  clearSelectionInspector();
  ensureCardControlsOnContainer(stage);
  if (typeof ensureFreeLayersOnAllSlides === 'function') ensureFreeLayersOnAllSlides();
  activeWorkspaceProjectId = null;
  if (typeof clearActiveNativeFileHandle === 'function') clearActiveNativeFileHandle();
  if (typeof restoreDeckMetaPayload === 'function') {
    restoreDeckMetaPayload({ headerBg: '#F5F5F7', headerFg: '#111111', footerBg: '#F5F5F7', footerFg: '#111111', accentColor: '#0055FF', aspectRatio: '16:9' });
  }
  if (typeof initialDeckStageHtml !== 'undefined') initialDeckStageHtml = stage.innerHTML;
  if (isEditMode && typeof makeAllTextEditable === 'function') makeAllTextEditable(true);
  updateSlideUI();
  saveHistorySnapshot('스타터 템플릿 적용', true);
  markChangesSaved();
  closeStarterTemplateModal();
  showToast('새 프레젠테이션 템플릿이 적용되었습니다!');
}

/* ==================== ONBOARDING WELCOME GUIDE & SHORTCUTS HELP MODAL ==================== */
const ONBOARDING_SEEN_KEY = 'html_slide_studio_onboarding_seen_v1';

function maybeShowOnboardingGuide() {
  try {
    if (localStorage.getItem(ONBOARDING_SEEN_KEY) === 'true') return;
  } catch (e) {}
  openOnboardingGuide();
}

function openOnboardingGuide() { if (typeof openModalSafe === 'function') openModalSafe('onboardingGuideModal'); }

function closeOnboardingGuide(dontShowAgain) { if (dontShowAgain) { try { localStorage.setItem(ONBOARDING_SEEN_KEY, 'true'); } catch (e) {} } if (typeof closeModalSafe === 'function') closeModalSafe('onboardingGuideModal'); }

function toggleShortcutsHelpModal() {
  const modal = document.getElementById('shortcutsHelpModal');
  if (!modal) return;
  if (modal.classList.contains('hidden')) {
    if (typeof openModalSafe === 'function') openModalSafe(modal);
  } else {
    if (typeof closeModalSafe === 'function') closeModalSafe(modal);
  }
}

function buildProjectJsonPayloadObject() {
  const stage = document.getElementById('slideStage');
  const title = (document.getElementById('headerDeckTitle')?.textContent || 'presentation_project').trim();
  const stageClone = stage ? cloneCleanStageForPersistence(stage) : null;
  return {
    version: 2,
    title,
    subtitle: (document.getElementById('headerDeckSubtitle')?.textContent || '').trim(),
    ...captureDeckMetaPayload(),
    exportedAt: new Date().toISOString(),
    stageHtml: stageClone ? stageClone.innerHTML : ''
  };
}

function exportProjectJsonFile() {
  const stage = document.getElementById('slideStage');
  if (!stage) return;
  const payload = buildProjectJsonPayloadObject();
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${payload.title.replace(/[^a-zA-Z0-9\uAC00-\uD7A3_-]/g, '_').slice(0, 30)}_작업파일.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  markChangesSaved();
  hasUnexportedFileChanges = false;
  showToast('프로젝트 작업 파일(.json)이 다운로드되었습니다.');
}

async function buildProjectPackageZipBlob() {
  const stage = document.getElementById('slideStage');
  if (!stage || typeof buildZipBlobFromEntries !== 'function') return null;
  const title = (document.getElementById('headerDeckTitle')?.textContent || 'presentation_project').trim();
  const stageClone = cloneCleanStageForPersistence(stage);

  const payload = {
    version: 3,
    format: 'pptstudio-archive',
    title,
    subtitle: (document.getElementById('headerDeckSubtitle')?.textContent || '').trim(),
    ...captureDeckMetaPayload(),
    exportedAt: new Date().toISOString(),
    stageHtml: stageClone.innerHTML
  };

  const entries = [{ name: 'project.json', data: JSON.stringify(payload) }];
  const mediaNames = new Set();
  stageClone.querySelectorAll('video[data-media-name], audio[data-media-name]').forEach(el => {
    const m = (el.getAttribute('data-media-name') || '').trim();
    if (m) mediaNames.add(m);
  });
  stageClone.querySelectorAll('video[src], audio[src]').forEach(el => {
    const s = (el.getAttribute('src') || '').trim();
    if (s.startsWith('media/')) mediaNames.add(s.slice(6));
  });

  const blobMap = window.__pptSessionMediaBlobs instanceof Map ? window.__pptSessionMediaBlobs : new Map();
  let mediaCount = 0;
  for (const mName of mediaNames) {
    if (blobMap.has(mName)) {
      entries.push({ name: `media/${mName}`, data: new Uint8Array(await blobMap.get(mName).arrayBuffer()) });
      mediaCount++;
    } else {
      try {
        const resp = await fetch(`media/${mName}`);
        if (resp.ok) {
          entries.push({ name: `media/${mName}`, data: new Uint8Array(await resp.arrayBuffer()) });
          mediaCount++;
        }
      } catch (e) {}
    }
  }
  const safeName = `${title.replace(/[^a-zA-Z0-9\uAC00-\uD7A3_-]/g, '_').slice(0, 30)}.pptstudio.zip`;
  if (typeof buildZipBlobFromEntries !== 'function') { showToast('ZIP 패키징 모듈을 찾을 수 없습니다.'); return null; }
  return { blob: buildZipBlobFromEntries(entries, 'application/zip'), safeName, mediaCount };
}

async function exportProjectPackageZip() {
  const built = await buildProjectPackageZipBlob();
  if (built && typeof triggerDownloadBlob === 'function') {
    triggerDownloadBlob(built.blob, built.safeName);
    markChangesSaved();
    hasUnexportedFileChanges = false;
    showToast(`프로젝트 패키지(${built.safeName}) 저장 완료! (슬라이드 + 미디어 ${built.mediaCount}개 동봉)`);
  } else {
    exportProjectJsonFile();
  }
}

function startBlankUniversalDeck() {
  applyStarterTemplate('blank');
  if (typeof closeOnboardingGuide === 'function') closeOnboardingGuide(false);
  if (!isEditMode && typeof toggleEditMode === 'function') toggleEditMode(true);
}

function triggerImportProjectFile() {
  const inp = document.getElementById('projectFileImporter');
  if (!inp) return;
  inp.value = '';
  inp.click();
}

function isSafeInlineStatement(stmt) {
  const s = (stmt || '').trim();
  if (!s) return true;
  if (/[`\\]|\b(?:eval|Function|window|document|globalThis|self|top|parent|frames|fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|cookie|alert|confirm|prompt|import)\b/.test(s)) {
    return false;
  }
  const EXACT_ALLOWED_STATEMENTS = [
    /^event\.stopPropagation\(\)$/,
    /^event\.preventDefault\(\)$/,
    /^this\.classList\.(?:add|remove)\('[a-zA-Z0-9_-]+'\)$/,
    /^this\.closest\('\.card-inline-media'\)\.closest\('\.slide-card'\)\?\.classList\.remove\('card-media-split-left'\s*,\s*'card-media-split-right'\)$/,
    /^this\.closest\('\.card-inline-media'\)\.remove\(\)$/,
    /^refreshLayerList\(\)$/,
    /^saveHistorySnapshot\(\)$/,
    /^addNewTocCard\(\)$/,
    /^moveCard\(this,\s*-?1\)$/,
    /^deleteCard\(this\)$/,
    /^triggerImageUpload\((?:this|this\.closest\('\.[a-zA-Z0-9_-]+'\))\)$/,
    /^handleImageDrop\(event,\s*this\)$/,
    /^toggleImageFit\(this\.closest\('\.[a-zA-Z0-9_-]+'\)\)$/,
    /^adjustSlotMediaScale\(this\.closest\('\.[a-zA-Z0-9_-]+'\),\s*-?\d+\)$/,
    /^adjustSlotHeight\(this\.closest\('\.[a-zA-Z0-9_-]+'\),\s*-?\d+\)$/,
    /^clearImageSlot\(this\.closest\('\.[a-zA-Z0-9_-]+'\)\)$/,
    /^addSubBoxInContainer\(this\.closest\('div'\)\.(?:nextElementSibling|parentElement\.querySelector\('\.[a-zA-Z0-9_-]+'\)),\s*'(?:role|chip|row)'\)$/,
    /^removeSubBox\(this\)$/,
    /^handleTocCardClick\(event,\s*this\)$/,
    /^toggleAspectRatio\(this\)$/,
    /^setLensAspectStage\(\d+,\s*this\)$/,
    /^goToSlide\(\d+\)$/,
    /^uploadCardInlineMedia\(this\.closest\('\.card-inline-media'\),\s*'(?:image|video)'\)$/,
    /^setCardMediaDockPosition\('(?:top|bottom|left|right)',\s*this\.closest\('\.card-inline-media'\)\)$/,
    /^toggleCardInlineMediaFit\(this\.closest\('\.card-inline-media'\)\)$/,
    /^onChartTitleInlineEdit\(this\)$/,
    /^onChartLabelInlineEdit\(this,\s*\d+\)$/,
    /^onChartValueInlineEdit\(this,\s*\d+\)$/,
    /^onChartSubInlineEdit\(this,\s*\d+\)$/,
    /^onTableHeaderInlineEdit\(this,\s*\d+\)$/,
    /^onTableCellInlineEdit\(this,\s*\d+,\s*\d+\)$/,
    /^selectChartPartForColor\(event,\s*this,\s*\d+\)$/,
    /^selectChartCellForFill\(event,\s*this\)$/,
    /^startTableColResize\(event,\s*this,\s*\d+\)$/,
    /^startTableRowResize\(event,\s*this,\s*'[a-zA-Z0-9_-]+'\)$/,
    /^switchFloatingCardLightboxIndex\(-?\d+\)$/,
    /^toggleAudioPersist\(this\)$/,
    /^openSlideCommentsPanel\(\)$/,
    /^loadDeferredEmbedIframe\(this\)$/,
    /^openYouTubePopupPlayer\(this(?:,\s*true)?\)$/,
    /^uploadBeforeAfterImage\(this,\s*'(?:before|after)'\)$/,
    /^resetBeforeAfterSplit\(this\)$/,
    /^uploadHotspotBaseImage\(this\)$/,
    /^addHotspotPin\(this\)$/,
    /^deleteActiveHotspotPin\(this\)$/,
    /^switchIwTab\(this,\s*\d+\)$/,
    /^addIwTab\(this\)$/,
    /^removeActiveIwTab\(this\)$/,
    /^toggleIwFlipEditSide\(this\)$/,
    /^switchChartScenario\(this,\s*\d+\)$/,
    /^embedWidgetIntoCard\(this\)$/,
    /^uploadIwTabImage\(this\)$/,
    /^insertChartIntoIwTab\(this\)$/,
    /^cycleIwFlipFaceTheme\(this\)$/,
    /^uploadIwFlipFaceImage\(this\)$/
  ];
  return EXACT_ALLOWED_STATEMENTS.some(re => re.test(s));
}

function isUnsafeUriValue(rawVal) {
  const normalized = String(rawVal || '').replace(/[\s\u0000-\u001F]+/g, '').toLowerCase();
  if (!normalized) return false;
  if (normalized.startsWith('javascript:') || normalized.startsWith('vbscript:')) return true;
  if (normalized.startsWith('data:')) {
    return !/^data:(?:image\/(?:png|jpe?g|gif|webp)|audio\/(?:mpeg|mp3|wav|x-wav|ogg|webm|aac|mp4|x-m4a|flac));base64,[a-z0-9+/=]+$/i.test(normalized);
  }
  return false;
}

function sanitizeImportedStageHtml(rawHtml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${rawHtml || ''}</body>`, 'text/html');
  const body = doc.body;

  body.querySelectorAll('script, object, embed, form, meta, link, base, template, slot, math, style, foreignobject, animate, set, animatetransform, animatemotion, use').forEach(el => el.remove());
  const TRUSTED_EMBED_HOSTS = new Set([
    'youtube.com', 'www.youtube.com', 'www.youtube-nocookie.com', 'm.youtube.com',
    'vimeo.com', 'player.vimeo.com',
    'docs.google.com', 'drive.google.com',
    'figma.com', 'www.figma.com',
    'codepen.io', 'codesandbox.io', 'miro.com'
  ]);
  const isTrustedEmbedHost = (urlStr) => {
    try {
      const u = new URL(urlStr);
      if (u.protocol !== 'https:') return false;
      const host = u.hostname.toLowerCase();
      return TRUSTED_EMBED_HOSTS.has(host) || Array.from(TRUSTED_EMBED_HOSTS).some(h => host.endsWith('.' + h));
    } catch (e) {
      return false;
    }
  };

  body.querySelectorAll('iframe').forEach(ifr => {
    const isMarkedSafe = ifr.getAttribute('data-safe-embed') === 'true';
    const rawSrc = (ifr.getAttribute('src') || '').trim();
    if (!isMarkedSafe || !/^https:\/\//i.test(rawSrc)) {
      ifr.remove();
      return;
    }
    const isVideoPlayerHost = /^https:\/\/(?:www\.)?(?:youtube\.com|youtube-nocookie\.com|player\.vimeo\.com)\//i.test(rawSrc);
    if (isVideoPlayerHost) ifr.removeAttribute('sandbox');
    else ifr.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-popups allow-forms');
    ifr.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    if (!isTrustedEmbedHost(rawSrc)) {
      // Prevent automatic loading of untrusted external hosts on file import; require explicit click consent
      ifr.removeAttribute('src');
      ifr.setAttribute('data-deferred-embed-src', rawSrc);
      ifr.classList.add('hidden');
      const gate = doc.createElement('div');
      gate.className = 'deferred-embed-consent p-4 flex flex-col items-center justify-center text-center gap-2 bg-canvas border border-borderline rounded-xl w-full flex-1';
      let hostLabel = rawSrc;
      try { hostLabel = new URL(rawSrc).hostname; } catch (e) {}
      gate.innerHTML = `<div class="font-mono text-[10px] font-extrabold text-amber-700 uppercase">EXTERNAL EMBED SHIELD</div><div class="text-xs font-bold text-ink">외부 사이트 자동 로드가 보안상 차단되었습니다 (${escapeAttr(hostLabel)})</div><button type="button" data-on-click="loadDeferredEmbedIframe(this)" class="px-3 py-1.5 rounded-lg bg-ink text-white text-xs font-bold cursor-pointer">외부 콘텐츠 허용 및 로드</button>`;
      if (ifr.parentNode) ifr.parentNode.insertBefore(gate, ifr);
    }
  });

  body.querySelectorAll('a[target="_blank"]').forEach(aEl => {
    aEl.setAttribute('rel', 'noopener noreferrer');
  });

  const URI_ATTRS = new Set(['href', 'xlink:href', 'src', 'formaction', 'action', 'poster', 'data', 'data-goto-url', 'srcset']);

  body.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      const name = attr.name.toLowerCase();
      const val = (attr.value || '').trim();

      if (name === 'srcdoc') {
        el.removeAttribute(attr.name);
        return;
      }

      if (name === 'data-fc-id' || name === 'data-floating-card-id' || name === 'data-trigger-node-id' || name === 'data-trigger-target') {
        if (!/^[a-zA-Z0-9_-]+$/.test(val)) {
          el.removeAttribute(attr.name);
        }
        return;
      }

      if (name === 'data-floating-card-ids') {
        if (!/^[a-zA-Z0-9_-]+(?:\s*,\s*[a-zA-Z0-9_-]+)*$/.test(val)) {
          el.removeAttribute(attr.name);
        }
        return;
      }

      if (name === 'data-floating-card-mode') {
        if (val !== 'paged' && val !== 'multi') {
          el.removeAttribute(attr.name);
        }
        return;
      }

      if (name === 'data-fc-bg-img' || name === 'data-fc-hover-bg-img') {
        const isSafeUrl = /^url\(\s*["']?(?:data:image\/(?:png|jpe?g|gif|webp);base64,[a-zA-Z0-9+/=]+|media\/[a-zA-Z0-9._-]+)["']?\s*\)$/i.test(val);
        const isSafeGrad = /^(?:linear|radial)-gradient\([a-zA-Z0-9#%,.\s()-]+\)$/i.test(val) && !/url\s*\(|expression\s*\(|javascript:/i.test(val);
        if (val && !isSafeUrl && !isSafeGrad) {
          el.removeAttribute(attr.name);
        }
        return;
      }
      if (name === 'data-fc-bg-mask' || name === 'data-fc-hover-bg-mask') {
        const isSafeMask = /^(?:linear|radial)-gradient\([a-zA-Z0-9#%,.\s()-]+\)$/i.test(val) && !/url\s*\(|expression\s*\(|javascript:/i.test(val);
        if (val && !isSafeMask) {
          el.removeAttribute(attr.name);
        }
        return;
      }

      if (name === 'colspan' || name === 'rowspan' || name === 'data-build-order') {
        if (!/^\d{1,2}$/.test(val)) el.removeAttribute(attr.name);
        return;
      }
      if (name === 'data-text-autofit' || name === 'data-inline-link' || name === 'data-aspect-lock' || name === 'data-auto-width' || name === 'data-slide-number-token' || name === 'data-slide-locked' || name === 'data-slide-hidden' || name === 'data-img-flip-x' || name === 'data-img-flip-y' || name === 'data-audio-persist' || name === 'data-safe-embed') {
        if (val !== 'true') el.removeAttribute(attr.name);
        return;
      }
      if (name === 'data-autofit-max-px' || name === 'data-img-zoom' || name === 'data-img-pan-x' || name === 'data-img-pan-y' || name === 'data-img-brightness' || name === 'data-img-contrast' || name === 'data-img-grayscale' || name === 'data-img-blur' || name === 'data-img-nat-w' || name === 'data-img-nat-h') {
        if (!/^\d{1,4}$/.test(val)) el.removeAttribute(attr.name);
        return;
      }
      if (name === 'data-conn-node-id' || name === 'data-connector-from' || name === 'data-connector-to' || name === 'data-icon-key') {
        if (!/^[a-zA-Z0-9_-]+$/.test(val)) el.removeAttribute(attr.name);
        return;
      }
      if (name === 'data-connector-color') {
        if (!/^#[0-9a-fA-F]{3,8}$/.test(val)) el.removeAttribute(attr.name);
        return;
      }
      if (name === 'data-layer-name') {
        const cleanName = val.replace(/[<>]/g, '').slice(0, 40);
        if (cleanName) el.setAttribute(attr.name, cleanName);
        else el.removeAttribute(attr.name);
        return;
      }
      if (name === 'data-speaker-notes') {
        const cleanNotes = val.replace(/[<>]/g, '').slice(0, 4000);
        if (cleanNotes) el.setAttribute(attr.name, cleanNotes);
        else el.removeAttribute(attr.name);
        return;
      }
      if (name === 'data-slide-comments') {
        try {
          const arr = JSON.parse(val);
          if (!Array.isArray(arr)) throw new Error('bad');
          const sanitizedArr = arr.slice(0, 40).map(item => ({
            id: String(item.id || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || ('cmt_' + Date.now()),
            author: String(item.author || '팀원').replace(/[<>]/g, '').slice(0, 20),
            text: String(item.text || '').replace(/[<>]/g, '').slice(0, 400),
            resolved: Boolean(item.resolved),
            createdAt: String(item.createdAt || '').replace(/[<>]/g, '').slice(0, 30)
          })).filter(c => c.text.trim().length > 0);
          if (sanitizedArr.length > 0) el.setAttribute(attr.name, JSON.stringify(sanitizedArr));
          else el.removeAttribute(attr.name);
        } catch (err) {
          el.removeAttribute(attr.name);
        }
        return;
      }
      if (name === 'data-guide-axis') {
        if (val !== 'x' && val !== 'y') el.removeAttribute(attr.name);
        return;
      }
      if (name === 'data-guide-pos') {
        if (!/^\d+(?:\.\d+)?$/.test(val)) el.removeAttribute(attr.name);
        return;
      }

      if (name.startsWith('on') || name.startsWith('data-on-')) {
        const normEvt = name.startsWith('data-on-') ? ('on' + name.slice(8)) : name;
        if (!['onclick', 'ondragover', 'ondragleave', 'ondrop', 'onblur', 'onmousedown'].includes(normEvt)) {
          el.removeAttribute(attr.name);
          return;
        }
        const statements = val.split(';').map(s => s.trim()).filter(Boolean);
        if (statements.length === 0 || !statements.every(isSafeInlineStatement)) {
          el.removeAttribute(attr.name);
          return;
        }
        if (!name.startsWith('data-on-')) {
          el.setAttribute('data-on-' + name.slice(2), val);
          el.removeAttribute(attr.name);
        }
        return;
      }

      if (URI_ATTRS.has(name) || name.endsWith(':href')) {
        if (name === 'data-goto-url') {
          if (val && !/^https?:\/\//i.test(val)) {
            el.removeAttribute(attr.name);
          }
          return;
        }
        if (name === 'srcset') {
          const candidates = val.split(',').map(part => part.trim().split(/\s+/)[0]).filter(Boolean);
          if (candidates.some(u => isUnsafeUriValue(u))) {
            el.removeAttribute(attr.name);
          }
          return;
        }
        if (name === 'href' && el.tagName === 'A') {
          if (val && !/^https?:\/\//i.test(val) && !/^#slide-\d+$/i.test(val)) el.removeAttribute(attr.name);
          return;
        }
        if (isUnsafeUriValue(val)) el.removeAttribute(attr.name);
        return;
      }

      if (name === 'style') {
        const cleanStyle = val.replace(/\/\*[\s\S]*?\*\//g, '');
        if (/@import|expression\s*\(|javascript:|vbscript:|behavior\s*:|-moz-binding/i.test(cleanStyle)) {
          el.removeAttribute(attr.name);
        } else if (/url\s*\(/i.test(cleanStyle)) {
          const urls = Array.from(cleanStyle.matchAll(/url\s*\(\s*['"]?([^'")]+)['"]?\s*\)/gi)).map(m => m[1].trim());
          const hasUnsafeCssUrl = urls.length === 0 || urls.some(u =>
            /\\/.test(u) ||
            /^(?:https?:|\/\/|file:|ftp:|javascript:|vbscript:)/i.test(u) ||
            (u.toLowerCase().startsWith('data:') && !/^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=]+$/i.test(u))
          );
          if (hasUnsafeCssUrl) {
            el.removeAttribute(attr.name);
          }
        }
      }
    });
  });

  return body.innerHTML;
}

async function importProjectFileObject(file, nativeHandle) {
  if (!file) return false;
  const lowerName = (file.name || '').toLowerCase();
  if (lowerName.endsWith('.zip') && typeof extractZipEntriesFromBuffer === 'function') {
    try {
      const buf = await file.arrayBuffer();
      const entries = await extractZipEntriesFromBuffer(buf);
      const projBytes = entries.get('project.json');
      if (!projBytes) {
        showToast('유효한 .pptstudio.zip 패키지(project.json 포함)가 아닙니다.');
        return false;
      }
      const data = JSON.parse(new TextDecoder('utf-8').decode(projBytes));
      if (!data || !data.stageHtml) {
        showToast('패키지 내부에 슬라이드 데이터가 없습니다.');
        return false;
      }
      const sanitizedStage = sanitizeImportedStageHtml(data.stageHtml);
      if (!hasValidSlideMarkup(sanitizedStage)) {
        showToast('패키지에 유효한 슬라이드(.slide)가 없습니다.');
        return false;
      }
      if (!(window.__pptSessionMediaBlobs instanceof Map)) window.__pptSessionMediaBlobs = new Map();
      let restoredMedia = 0;
      entries.forEach((bytes, entryName) => {
        if (entryName.startsWith('media/') && entryName.length > 6) {
          const mName = entryName.slice(6);
          const ext = (mName.split('.').pop() || '').toLowerCase();
          const mimeMap = { mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', ogg: 'audio/ogg', mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', aac: 'audio/aac', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };
          const blob = new Blob([bytes], { type: mimeMap[ext] || 'application/octet-stream' });
          window.__pptSessionMediaBlobs.set(mName, blob);
          restoredMedia++;
        }
      });
      if (data.title) setHeaderDeckTitleSafely(data.title);
      if (data.subtitle !== undefined && document.getElementById('headerDeckSubtitle')) document.getElementById('headerDeckSubtitle').textContent = data.subtitle;
      restoreDeckMetaPayload(data);
      currentSlide = 1;
      restoreStageHtml(sanitizedStage);
      document.querySelectorAll('#slideStage video, #slideStage audio').forEach(el => {
        const mName = (el.getAttribute('data-media-name') || '').trim() || ((el.getAttribute('src') || '').startsWith('media/') ? el.getAttribute('src').slice(6) : '');
        if (mName && window.__pptSessionMediaBlobs.has(mName)) {
          el.src = URL.createObjectURL(window.__pptSessionMediaBlobs.get(mName));
        }
      });
      activeWorkspaceProjectId = null;
      if (nativeHandle && typeof setActiveNativeFileHandle === 'function') setActiveNativeFileHandle(nativeHandle, 'zip');
      else if (typeof clearActiveNativeFileHandle === 'function') clearActiveNativeFileHandle();
      if (typeof initialDeckStageHtml !== 'undefined') initialDeckStageHtml = document.getElementById('slideStage')?.innerHTML || '';
      saveHistorySnapshot('프로젝트 패키지(.zip) 불러오기', true);
      markChangesSaved();
      showToast(`"${data.title || file.name}" 패키지 복원 완료! (미디어 ${restoredMedia}개 연결됨${nativeHandle ? ' · Ctrl+S 바로 덮어쓰기 지원' : ''})`);
      return true;
    } catch (err) {
      console.error('[HTML Slide Tool] 패키지 불러오기 오류:', err);
      showToast('ZIP 패키지를 읽는 중 오류가 발생했습니다.');
      return false;
    }
  }

  const text = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(String(ev.target.result || ''));
    reader.onerror = () => reject(new Error('파일 읽기 오류'));
    reader.readAsText(file);
  });

  if (lowerName.endsWith('.json')) {
    try {
      const data = JSON.parse(text);
      if (!data || !data.stageHtml) {
        showToast('유효한 작업(.json) 파일이 아닙니다.');
        return false;
      }
      const sanitizedJsonStage = sanitizeImportedStageHtml(data.stageHtml);
      if (!hasValidSlideMarkup(sanitizedJsonStage)) {
        showToast('불러온 JSON 파일에 유효한 슬라이드(.slide)가 없습니다.');
        return false;
      }
      if (data.title) setHeaderDeckTitleSafely(data.title);
      if (data.subtitle !== undefined && document.getElementById('headerDeckSubtitle')) {
        document.getElementById('headerDeckSubtitle').textContent = data.subtitle;
      }
      restoreDeckMetaPayload(data);
      currentSlide = 1;
      activeWorkspaceProjectId = null;
      restoreStageHtml(sanitizedJsonStage);
      if (nativeHandle && typeof setActiveNativeFileHandle === 'function') setActiveNativeFileHandle(nativeHandle, 'json');
      else if (typeof clearActiveNativeFileHandle === 'function') clearActiveNativeFileHandle();
      if (typeof initialDeckStageHtml !== 'undefined') initialDeckStageHtml = document.getElementById('slideStage')?.innerHTML || '';
      saveHistorySnapshot('작업 파일(.json) 불러오기', true);
      markChangesSaved();
      showToast(`"${data.title || file.name}" 작업 파일을 불러왔습니다.${nativeHandle ? ' (Ctrl+S 바로 덮어쓰기 지원)' : ''}`);
      return true;
    } catch (err) {
      showToast('JSON 작업 파일 파싱 중 오류가 발생했습니다.');
      return false;
    }
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    const importedStage = doc.getElementById('slideStage');
    if (!importedStage) {
      showToast('불러올 수 있는 슬라이드 데이터가 없는 HTML 파일입니다.');
      return false;
    }
    const sanitizedHtmlStage = sanitizeImportedStageHtml(importedStage.innerHTML);
    if (!hasValidSlideMarkup(sanitizedHtmlStage)) {
      showToast('불러온 HTML 파일에 유효한 슬라이드(.slide)가 없습니다.');
      return false;
    }
    const importedTitle = doc.getElementById('headerDeckTitle');
    const importedSub = doc.getElementById('headerDeckSubtitle');
    if (importedTitle) setHeaderDeckTitleSafely(importedTitle.textContent);
    if (importedSub && document.getElementById('headerDeckSubtitle')) {
      document.getElementById('headerDeckSubtitle').textContent = importedSub.textContent;
    }
    const impRootStyle = doc.documentElement ? doc.documentElement.style : null;
    restoreDeckMetaPayload({
      headerBg: impRootStyle ? impRootStyle.getPropertyValue('--header-bg') : '',
      headerFg: impRootStyle ? impRootStyle.getPropertyValue('--header-fg') : '',
      footerBg: impRootStyle ? impRootStyle.getPropertyValue('--footer-bg') : '',
      footerFg: impRootStyle ? impRootStyle.getPropertyValue('--footer-fg') : '',
      accentColor: impRootStyle ? impRootStyle.getPropertyValue('--accent-color') : '',
      aspectRatio: importedStage.getAttribute('data-aspect-ratio') || (doc.body ? doc.body.getAttribute('data-aspect-ratio') : '') || '16:9'
    });
    currentSlide = 1;
    activeWorkspaceProjectId = null;
    restoreStageHtml(sanitizedHtmlStage);
    if (nativeHandle && typeof setActiveNativeFileHandle === 'function') setActiveNativeFileHandle(nativeHandle, 'html');
    else if (typeof clearActiveNativeFileHandle === 'function') clearActiveNativeFileHandle();
    if (typeof initialDeckStageHtml !== 'undefined') initialDeckStageHtml = document.getElementById('slideStage')?.innerHTML || '';
    saveHistorySnapshot('HTML 프레젠테이션 불러오기', true);
    markChangesSaved();
    showToast(`"${file.name}" HTML 프레젠테이션을 불러왔습니다.${nativeHandle ? ' (Ctrl+S 바로 덮어쓰기 지원)' : ''}`);
    return true;
  } catch (err) {
    showToast('HTML 파일 불러오기 중 오류가 발생했습니다.');
    return false;
  }
}

function initStorageListeners() {
  const importer = document.getElementById('projectFileImporter');
  if (importer && !importer.dataset.bound) {
    importer.dataset.bound = 'true';
    importer.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        await importProjectFileObject(file, null);
      } finally {
        e.target.value = '';
      }
    });
  }
}

/* ==================== INDEXEDDB AUTO-SAVE & UNLOAD WARNING ==================== */
const AUTOSAVE_DB_NAME = 'HTMLSlideStudioAutoSaveDB';
const AUTOSAVE_STORE_NAME = 'sessions';
const AUTOSAVE_RECORD_KEY = 'session_' + location.href.split('#')[0];
const AUTOSAVE_PENDING_KEY = AUTOSAVE_RECORD_KEY + '_pending';
const AUTOSAVE_PENDING_PREV_KEY = AUTOSAVE_RECORD_KEY + '_pending_prev';
const AUTOSAVE_FIRST_CRASH_KEY = AUTOSAVE_RECORD_KEY + '_first_crash';

function updateAutoSaveStatus(ok) {
  const statusEl = $studio('autoSaveStatusText');
  if (!statusEl) return;
  if (ok) {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    statusEl.textContent = `자동 저장됨 ${hh}:${mm}`;
    statusEl.classList.remove('text-rose-600');
    statusEl.classList.add('text-subtle');
  } else {
    statusEl.textContent = '자동 저장 불가';
    statusEl.classList.remove('text-subtle');
    statusEl.classList.add('text-rose-600');
  }
}

function openAutoSaveDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB unsupported'));
      return;
    }
    const req = indexedDB.open(AUTOSAVE_DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(AUTOSAVE_STORE_NAME)) {
        db.createObjectStore(AUTOSAVE_STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function writeAutoSaveToIndexedDB(unsavedFlag) {
  const stage = document.getElementById('slideStage');
  if (!stage) return;
  try {
    const db = await openAutoSaveDB();
    const stageClone = cloneCleanStageForPersistence(stage);

    const record = {
      id: AUTOSAVE_RECORD_KEY,
      title: (document.getElementById('headerDeckTitle')?.textContent || '새 프레젠테이션').trim(),
      subtitle: (document.getElementById('headerDeckSubtitle')?.textContent || '').trim(),
      ...captureDeckMetaPayload(),
      currentSlide,
      slideCount: slides.length,
      stageHtml: stageClone.innerHTML,
      savedAt: new Date().toLocaleString('ko-KR'),
      hasUnsaved: Boolean(unsavedFlag)
    };

    await new Promise((resolve, reject) => {
      const tx = db.transaction(AUTOSAVE_STORE_NAME, 'readwrite');
      tx.objectStore(AUTOSAVE_STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
    db.close();
    updateAutoSaveStatus(true);
  } catch (e) {
    console.error('IndexedDB 자동 저장 실패:', e);
    updateAutoSaveStatus(false);
  }
}

function markUnsavedChanges() {
  hasUnsavedChanges = true;
  hasUnexportedFileChanges = true;
  if (typeof updateNativeFileStatusUI === 'function') updateNativeFileStatusUI();
  scheduleIndexedDbAutoSave();
}

function renderAutoSaveRecoveryBannerState() {
  const banner = document.getElementById('autosaveRecoveryBanner');
  const meta = document.getElementById('autosaveRecoveryMeta');
  const prevBtn = document.getElementById('recoverPrevCrashBtn');
  const latestRec = window.__pendingAutoSaveRecord || null;
  const firstOrPrevRec = window.__pendingFirstCrashRecord || window.__pendingPrevAutoSaveRecord || null;

  if (!latestRec && !firstOrPrevRec) {
    if (banner) {
      banner.classList.add('hidden');
      banner.classList.remove('flex');
      banner.style.display = 'none';
    }
    if (prevBtn) prevBtn.classList.add('hidden');
    return;
  }

  const primary = latestRec || firstOrPrevRec;
  const secondary = (latestRec && firstOrPrevRec && latestRec.stageHtml !== firstOrPrevRec.stageHtml) ? firstOrPrevRec : null;

  if (meta) {
    if (secondary) {
      meta.textContent = `최근: "${primary.title}" (${primary.savedAt}) · 첫 크래시 보존본: "${secondary.title}" (${secondary.savedAt})`;
    } else {
      meta.textContent = `"${primary.title}" (${primary.slideCount}P) · ${primary.savedAt}`;
    }
  }
  if (prevBtn) {
    if (secondary) {
      prevBtn.classList.remove('hidden');
      prevBtn.textContent = '첫 크래시 복구';
    } else {
      prevBtn.classList.add('hidden');
    }
  }
  if (banner) {
    if (typeof openModalSafe === 'function') openModalSafe(banner);
    else { banner.classList.remove('hidden'); banner.classList.add('flex'); banner.style.display = 'flex'; }
  }
}

async function clearPendingRecoveryRecord(slotFilter) {
  const clearAll = !slotFilter || slotFilter === 'all';
  if (clearAll || slotFilter === 'latest') {
    window.__pendingAutoSaveRecord = null;
  }
  if (clearAll || slotFilter === 'prev' || slotFilter === 'first') {
    window.__pendingPrevAutoSaveRecord = null;
    window.__pendingFirstCrashRecord = null;
  }
  renderAutoSaveRecoveryBannerState();
  try {
    const db = await openAutoSaveDB();
    await new Promise((resolve) => {
      const tx = db.transaction(AUTOSAVE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(AUTOSAVE_STORE_NAME);
      if (clearAll || slotFilter === 'latest') store.delete(AUTOSAVE_PENDING_KEY);
      if (clearAll || slotFilter === 'prev' || slotFilter === 'first') {
        store.delete(AUTOSAVE_PENDING_PREV_KEY);
        store.delete(AUTOSAVE_FIRST_CRASH_KEY);
      }
      tx.oncomplete = () => resolve();
    });
    db.close();
  } catch (e) {}
}

function markChangesSaved() {
  hasUnsavedChanges = false;
  if (typeof updateNativeFileStatusUI === 'function') updateNativeFileStatusUI();
  clearTimeout(autoSaveDebounceTimer);
  clearPendingRecoveryRecord('all');
  writeAutoSaveToIndexedDB(false);
}

function scheduleIndexedDbAutoSave() {
  clearTimeout(autoSaveDebounceTimer);
  autoSaveDebounceTimer = setTimeout(() => {
    if (hasUnsavedChanges) {
      writeAutoSaveToIndexedDB(true);
    }
  }, 800);
}

async function checkAndPromptAutoSaveRecovery() {
  try {
    const db = await openAutoSaveDB();
    const { activeRec, pendingRec, prevRec, firstRec } = await new Promise((resolve, reject) => {
      const tx = db.transaction(AUTOSAVE_STORE_NAME, 'readonly');
      const store = tx.objectStore(AUTOSAVE_STORE_NAME);
      const r1 = store.get(AUTOSAVE_RECORD_KEY);
      const r2 = store.get(AUTOSAVE_PENDING_KEY);
      const r3 = store.get(AUTOSAVE_PENDING_PREV_KEY);
      const r4 = store.get(AUTOSAVE_FIRST_CRASH_KEY);
      tx.oncomplete = () => resolve({ activeRec: r1.result, pendingRec: r2.result, prevRec: r3.result, firstRec: r4.result });
      tx.onerror = (e) => reject(e.target.error);
    });

    const hasNewCrash = Boolean(activeRec && activeRec.hasUnsaved && activeRec.stageHtml);
    let latestSlot = pendingRec && pendingRec.stageHtml ? pendingRec : null;
    let prevSlot = prevRec && prevRec.stageHtml ? prevRec : null;
    let firstSlot = firstRec && firstRec.stageHtml ? firstRec : null;

    if (hasNewCrash) {
      // Lock the very first unrecovered crash snapshot so ignoring banners & editing later NEVER erases it!
      if (!firstSlot) {
        const seedFirst = latestSlot || activeRec;
        firstSlot = { ...seedFirst, id: AUTOSAVE_FIRST_CRASH_KEY, hasUnsaved: true };
      }
      if (latestSlot && latestSlot.stageHtml !== activeRec.stageHtml) {
        prevSlot = { ...latestSlot, id: AUTOSAVE_PENDING_PREV_KEY, hasUnsaved: true };
      }
      latestSlot = { ...activeRec, id: AUTOSAVE_PENDING_KEY, hasUnsaved: true };

      await new Promise((resolve) => {
        const tx = db.transaction(AUTOSAVE_STORE_NAME, 'readwrite');
        const store = tx.objectStore(AUTOSAVE_STORE_NAME);
        store.put(latestSlot);
        if (prevSlot) store.put(prevSlot);
        if (firstSlot) store.put(firstSlot);
        // Clear hasUnsaved on active record so subsequent reloads distinguish new sessions
        store.put({ ...activeRec, hasUnsaved: false });
        tx.oncomplete = () => resolve();
      });
    }

    window.__pendingAutoSaveRecord = latestSlot || prevSlot || firstSlot || null;
    window.__pendingPrevAutoSaveRecord = prevSlot || null;
    window.__pendingFirstCrashRecord = firstSlot || prevSlot || null;
    renderAutoSaveRecoveryBannerState();
    db.close();
  } catch (e) {}
}

async function recoverFromAutoSave(slotMode) {
  const isFirstOrPrev = slotMode === 'prev' || slotMode === 'first';
  const record = isFirstOrPrev
    ? (window.__pendingFirstCrashRecord || window.__pendingPrevAutoSaveRecord)
    : window.__pendingAutoSaveRecord;
  await clearPendingRecoveryRecord(isFirstOrPrev ? 'first' : 'latest');
  if (!record || !record.stageHtml) return;

  if (record.title) setHeaderDeckTitleSafely(record.title);
  if (record.subtitle !== undefined && document.getElementById('headerDeckSubtitle')) {
    document.getElementById('headerDeckSubtitle').textContent = record.subtitle;
  }
  const sanitizedAutoStage = sanitizeImportedStageHtml(record.stageHtml);
  if (!hasValidSlideMarkup(sanitizedAutoStage)) {
    showToast('자동 저장 데이터에 유효한 슬라이드가 없어 복구를 건너뜁니다.');
    return;
  }
  restoreDeckMetaPayload(record);
  currentSlide = record.currentSlide || 1;
  restoreStageHtml(sanitizedAutoStage);
  saveHistorySnapshot();
  hasUnsavedChanges = true;
  writeAutoSaveToIndexedDB(true);
  showToast(isFirstOrPrev ? '첫 크래시 보존본(초기 미저장 작업)을 복구했습니다.' : '최근 자동 저장 내역을 복구했습니다.');
}

async function discardAutoSave() {
  await clearPendingRecoveryRecord('all');
  try {
    const db = await openAutoSaveDB();
    await new Promise((resolve) => {
      const tx = db.transaction(AUTOSAVE_STORE_NAME, 'readwrite');
      tx.objectStore(AUTOSAVE_STORE_NAME).delete(AUTOSAVE_RECORD_KEY);
      tx.oncomplete = () => resolve();
    });
    db.close();
  } catch (e) {}
  showToast('자동 저장 기록이 모두 삭제되었습니다.');
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && hasUnsavedChanges) {
    writeAutoSaveToIndexedDB(true);
  }
});

window.addEventListener('pagehide', () => {
  if (hasUnsavedChanges) {
    writeAutoSaveToIndexedDB(true);
  }
});

window.addEventListener('beforeunload', (e) => {
  if (hasUnsavedChanges || hasUnexportedFileChanges) {
    if (hasUnsavedChanges) writeAutoSaveToIndexedDB(true);
    e.preventDefault();
    e.returnValue = '';
  }
});
