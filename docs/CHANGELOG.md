# Changelog

## [v5.3.2] - 2026-11-23 — 전수 QA 6건 마감 (즉시 테스트 모드 플로팅 카드 자동 닫힘 · 플로팅 카드 복사/붙여넣기·T 단축키·도형/이미지/유튜브/미세이동 잠금 우회 · GitHub Pages 아티팩트 v4 업그레이드)

### Fixed
- **[P0] 즉시 테스트 모드(`Alt+P`) 전환 시 비모달 플로팅 카드 미리보기 패널이 닫히지 않던 누락 수정 (`js/studio.js`)**: `toggleInteractiveTestMode(true)` 내부에 `closeFloatingCardEditor()`를 정확히 배치.
- **[P0] 플로팅 카드 포커스 상태에서 `Ctrl+C` → `Ctrl+V` 붙여넣기 시 배경 슬라이드로 들어가던 결함 해결 (`js/selection.js`)**: `pasteCopiedElements()`가 `isFloatingCardCanvasActive()`를 감지해 `#fcRichBodyEditor` 내부로 안전하게 정화·붙여넣기하고 `recordFcSnapshot()`을 기록하도록 구현.
- **[P0] 배경 슬라이드가 잠긴 상태에서 플로팅 카드에 `T` 단축키 텍스트박스·도형·이미지·웹/유튜브 임베드 삽입 및 방향키 미세 이동이 차단되던 결함 해결 (`js/main.js`, `js/media.js`, `js/selection.js`)**.
- **[P1] GitHub Pages 배포 워크플로 `actions/upload-pages-artifact@v3 → @v4` 업그레이드 (`.github/workflows/deploy-pages.yml`)**: Node.js 24 강제 전환 환경에서의 아티팩트 업로드 호환성 오류 방지.

---

## [v5.3.1] - 2026-11-23 — 비모달 플로팅 카드 통합 편집 자체 QA 4건 해결 및 Playwright E2E Test 09 추가

### Fixed
- **[P0] 도킹된 메인 PPT 스튜디오(`#pptStudioPopup.studio-docked`) `z-index`를 `30 → 60`으로 상향 (`css/studio.css`)**: 플로팅 카드 미리보기 패널(`z-index: 52`)을 우측으로 드래그해도 메인 스튜디오가 절대 가려지지 않도록 계층 완성(`60 > 58 > 56 > 52`).
- **[P0] 발표 모드(`E`)·즉시 테스트 모드(`Alt+P`) 전환 시 비모달 플로팅 카드 미리보기 패널이 화면에 남던 버그 해결 (`js/studio.js`)**: 전환 직전 `closeFloatingCardEditor()` 자동 호출.
- **[P0] `Ctrl+Z`/`Ctrl+Y` 및 `Delete`/`Backspace` 단축키의 컨텍스트 분기 교정 (`js/main.js`)**: 패널이 열려 있더라도 배경 슬라이드를 클릭한 상태에서는 슬라이드 실행 취소/삭제가, 플로팅 카드에 포커스가 있을 때만 카드 실행 취소/삭제가 실행되도록 `isFloatingCardCanvasActive()` 기준으로 통일.
- **[P0] 플로팅 카드 내부 요소의 삭제(`deleteSelectedElement`)·복제(`duplicateSelectedElement`)·그리드 분리 차단(`detachSelectedToFreeCanvas`) 안전화 (`js/selection.js`)**: 배경 슬라이드 잠금과 무관하게 카드 내부 삭제/복제 후 `recordFcSnapshot()`을 기록하고, 카드 요소가 배경 슬라이드로 이탈하는 오동작 차단.

### Testing
- **`tests/e2e.spec.mjs` 확장**: Playwright Chromium E2E Test 09(비모달 플로팅 카드 `z-index` 계층 · 메인 스튜디오 차트/위젯 삽입 · 복제/삭제 · 발표 모드 자동 닫힘) 추가.

---

## [v5.3.0] - 2026-11-23 — 플로팅 카드 비모달 미리보기 패널 전환 & 메인 PPT 스튜디오 통합 편집 아키텍처

### Changed & Added
- **플로팅 카드 창을 비모달(Non-Modal) 드래그 가능 미리보기 패널로 전환 (`index.html`, `css/editor.css`, `js/floating-cards.js`)**:
  - 화면 전체를 가리던 어두운 모달 백드롭을 제거하고, 우측 메인 PPT 스튜디오(`z-index: 60`)·상단 컨텍스트 바(`z-index: 58`)·선택 오버레이(`z-index: 56`)와 동시에 조작 가능한 독립 미리보기 패널(`z-index: 52`, 헤더 드래그 이동 및 5방향 리사이즈 지원)로 재설계.
  - 기존 중복 4탭 편집 바를 기본 접힘 상태(`#fcLegacyPropsDrawer`)로 정리하고, 필요 시 헤더의 `⚙ 카드 속성` 버튼으로 카드 전용 크기·위치·호버 효과만 펼쳐 조절할 수 있도록 다이어트.
- **메인 PPT 스튜디오 단일 편집 통합 (`js/state.js`, `js/media.js`, `js/charts.js`, `js/widgets.js`, `js/main.js`)**:
  - `activeEditingContext` (`'slide'` ↔ `'floating-card'`) 및 메인 스튜디오 상단 상태 배지(`#studioEditContextBadge` · `✦ 카드 편집중`) 도입.
  - 플로팅 카드 미리보기 패널이 활성화된 상태에서 메인 PPT 스튜디오로 도형·이미지·영상·오디오·유튜브 임베드·아이콘·차트·표·4종 인터랙티브 위젯을 삽입하면 플로팅 카드 캔버스(`#fcRichBodyEditor`) 내부로 자동 삽입되며, 내부 요소를 클릭하면 메인 컨텍스트 바와 스튜디오 모든 기능을 그대로 사용해 편집 가능.
  - 배경 슬라이드를 클릭하거나 상태 배지를 클릭하면 즉시 슬라이드 편집 컨텍스트로 복귀.

---

## [v5.2.2] - 2026-11-22 — 자체 심층 QA 결함 9건 일괄 수정 및 Playwright Chromium 회귀 테스트(Test 08) 확장

### Fixed
- **[P0] 3D 플립 카드 뒷면 편집 상태(`is-editing-back`) 발표 모드 전환 시 미해제 결함 해결 (`js/studio.js`)**: `toggleEditMode(false)` 및 `toggleInteractiveTestMode(true)` 진입 시 `.is-editing-back` 제거와 토글 버튼 문구(`↻ 뒷면 편집으로 전환`)를 함께 복구.
- **[P0] 붙여넣기(`Ctrl+V`)·복제(`Ctrl+D`) 잠금 우회·ID/그룹 충돌·크로스탭 정화 누락 해결 (`js/selection.js`)**: 잠긴 슬라이드 붙여넣기 차단, 크로스탭 클립보드 HTML `sanitizeImportedStageHtml()` 정화, `data-layer-locked`·`data-conn-node-id`·`data-trigger-node-id`·`data-group-id` 격리(다중 선택 그룹 복제 시 독립 그룹 ID 자동 재발급) 및 상단 컨텍스트 바 동기화.
- **[P0] 찾기/바꾸기(`Ctrl+F`/`Ctrl+H`) 위젯 UI 오염 및 잠금 슬라이드 무시 결함 해결 (`js/navigation.js`)**: `.embed-widget-drag-bar`·`.yt-local-hint-bar`·`.yt-poster-card`·`.ppt-audio-widget button`·`.deferred-embed-consent`·`.ppt-slide-master-layer` 검색 제외 및 잠긴 슬라이드·레이어 치환 보호.
- **[P1] 표 셀 수치 수정·행 삭제 시 `합계 (SUM)`/`평균 (AVG)` 요약 행 실시간 자동 재계산 (`js/charts.js`)**.
- **[P1] 표 셀·차트 항목 입력 중 즉시 `Ctrl+S` 저장 시 마지막 편집 내용 누락 방지 (`js/main.js`)**: 저장 직전 활성 `contenteditable` 요소 `blur()` 및 `flushDeferredHistoryNow()` 선실행.
- **[P1] `Ctrl+A` 전체 선택 시 잠금 슬라이드 가드 및 상단 컨텍스트 바 동기화 (`js/main.js`)**.
- **[P1] 서식 복사(`applyCopiedFormatTo`) 잠긴 슬라이드·레이어 차단 및 `Esc` 키로 서식 복사 모드 즉시 취소 지원 (`js/text-editor.js`, `js/main.js`)**.
- **[P1] 넘침 사전검사(`scanDeckLayoutOverflows`) 숨김 슬라이드 제외, 전환 효과 정배율 계측(`transition-instant-reset` + `active`), 고정 미디어/임베드 위젯 오탐 방지 (`js/export.js`)**.
- **[P1] 발표자 뷰 미리보기 `.yt-local-hint-bar`/`.ppt-slide-comment-badge` 제거 및 슬라이드 재사용·PPTX 가져오기 시 목차 링크(`data-goto-slide`) 시프트 순서 교정 (`js/navigation.js`, `js/export.js`)**.

### Testing
- **`tests/e2e.spec.mjs` 확장**: Playwright Chromium E2E 테스트를 8개 스위트로 확장(Test 08: 3D 플립 리셋 · 표 합계 자동 재계산 · 찾기/바꾸기 잠금 보호 · 붙여넣기 잠금 및 복제 그룹 격리 · `Esc` 서식 복사 취소 회귀 검증).

---

## [v5.2.1] - 2026-11-22 — Playwright E2E Test 02 선택자 교정 (굵게 ON/OFF 양방향 토글 검증으로 7/7 전원 통과)

### Fixed (Test Suite)
- **`tests/e2e.spec.mjs` Test 02 교정**: 1번 슬라이드의 첫 번째 `<p>`가 기본 `font-bold`(700)여서 `execFormat('bold')` 호출 시 정상적으로 굵게 해제(`400`)되던 선택자 대상을 `p.font-normal` 본문 문단으로 교정하고, 굵게 켜기(`800`) 및 다시 끄기(`400`) 양방향 토글을 모두 검증하도록 보강.

---

## [v5.2.0] - 2026-11-22 — Playwright 실제 Chromium E2E 자동화 · Strict CSP 테스트 서버 · GitHub Actions CI & GitHub Pages 자동 배포 파이프라인 추가

### Added
- **Strict CSP 테스트 서버 (`tests/csp-server.py`)**: `script-src 'self'`(`'unsafe-inline'`/`'unsafe-eval'` 없음) 실제 HTTP 헤더와 PWA MIME 타입(`.webmanifest`, `.js`, `.svg`)을 전송하는 무의존성 Python 3 테스트 서버 추가.
- **Playwright 실제 Chromium E2E 테스트 스위트 (`tests/e2e.spec.mjs`, `playwright.config.mjs`, `package.json`)**:
  - 7개 종합 시나리오 자동 검증: Strict CSP `securitypolicyviolation` 0건 및 Service Worker 등록 · 편집 서식/정렬 및 컨텍스트 바 · 목차 개수 자동 생성 · 2D 벤토/위젯/차트 시나리오 · 실제 Chromium `@media print` 1440×810 인쇄 실측 · HTTP YouTube 임베드 및 발표자 뷰 팝업 크기 조절 · PPTX/단독 HTML 실제 다운로드 및 화면비/Undo/Redo 검증.
- **GitHub Actions CI/CD 분리 워크플로 (`.github/workflows/ci.yml`, `.github/workflows/deploy-pages.yml`, `.gitignore`)**:
  - `ci.yml`: Push/PR마다 `build.py --test` + Playwright Chromium E2E 자동 실행 및 리포트/실패 스크린샷 아티팩트 업로드.
  - `deploy-pages.yml`: `tests/`·`.github/` 등 개발 파일을 제외한 순수 앱 파일만 `_site/`로 조립해 GitHub Pages에 자동 배포.
- **`build.py` 정적 검증 확장**: `package.json`·`manifest.webmanifest` JSON 검증, `tests/csp-server.py` Python AST 구문 검증, `playwright.config.mjs`·`tests/e2e.spec.mjs` JS 어휘 검증 및 41개 배포 패키지 필수 파일 일괄 검증.

---

## [v5.1.1] - 2026-11-22 — 로컬(`file://`) YouTube 팝업 재생 UX 정돈 (`강제 임베드` 버튼 제거 · 편집 모드 오클릭 방지 · 안내 문구 명확화)

### Improved
- **로컬(`file://`) YouTube 카드 UX 일원화 (`js/media.js`, `js/storage.js`)**:
  - 브라우저 `Referer` 삭제 정책상 `file://` 환경에서 무조건 오류 153을 유발하던 `강제 임베드` 버튼(`forceLoadYouTubeIframe`)을 제거하고, 클릭 시 독립 팝업 플레이어로 안전 재생되는 시네마 썸네일 카드 방식으로 일원화 (기존 저장본의 구형 카드도 로드시 자동 업그레이드).
  - 편집 모드에서 썸네일 배경 클릭 시 영상 팝업이 의도치 않게 열리지 않고 위젯 선택/이동만 수행하며, 중앙 빨간 재생 버튼(`▶`) 클릭 시에만 미리보기 재생되도록 개선.
  - 하단 편집 안내 바(`.yt-local-hint-bar`, 발표 모드 및 발표 전용 HTML에서는 자동 숨김/제거)에 "슬라이드 내 인라인 재생은 MP4 삽입 또는 웹(HTTPS) 배포 시 지원" 안내를 명확히 표기.

---

## [v5.1.0] - 2026-11-22 — 2단계 대중 배포 업그레이드: 무번들러 PWA 오프라인 앱 설치(`manifest.webmanifest`, `sw.js`, 앱 아이콘) 및 네이티브 파일 바로 덮어쓰기(`Ctrl+S` / `Ctrl+Shift+S` / `Ctrl+O`, File System Access API)

### Added
- **무번들러 PWA(Progressive Web App) 정식 지원 (`manifest.webmanifest`, `sw.js`, `icons/icon.svg`, `icons/icon-192.png`, `icons/icon-512.png`, `js/pwa-fs.js`)**:
  - 기존 순수 HTML/CSS/JS 작업 방식을 100% 유지하면서 GitHub Pages·Cloudflare Pages·로컬 HTTP 서버 배포 시 원클릭 바탕화면 앱 설치(`#pwaInstallAppBtn`) 및 오프라인 실행 지원.
  - `sw.js`에 Network-First + 오프라인 캐시 전략을 적용하고, `build.py` 실행 시 `CACHE_NAME`을 현재 버전으로 자동 동기화해 로컬 코드 수정 시 구버전 캐시 충돌을 원천 방지 (`file://` 실행 시에는 등록 생략으로 콘솔 오류 0건).
  - PWA OS 파일 연결(`file_handlers` + `window.launchQueue`) 지원으로 설치된 앱에서 `.json` 프로젝트 파일 더블클릭 실행 대응.
- **네이티브 파일 시스템 연동 — `Ctrl+S` 실제 원본 파일 바로 덮어쓰기 (`js/pwa-fs.js`, `js/storage.js`, `js/main.js`, `index.html`)**:
  - **`Ctrl+O` (`openNativeProjectFile`)**: OS 파일 열기 창으로 `.html`·`.json`·`.pptstudio.zip`을 열고 파일 핸들을 자동 연결.
  - **`Ctrl+S` (`saveNativeFileOrQuickSave`)**: 연결된 로컬 원본 파일에 다운로드 폴더 중복 생성 없이 즉시 덮어쓰기 저장 (미연결 시 첫 저장 위치 선택; Safari/Firefox 등 미지원 브라우저에서는 IndexedDB 작업함 저장으로 자동 폴백).
  - **`Ctrl+Shift+S` (`saveNativeFileAs`)**: `.html` / `.json` / `.pptstudio.zip` 형식 선택 후 원하는 폴더에 직접 저장.
  - 상단 헤더(`#headerNativeFileBadge`) 및 작업함 패널(`#studioNativeFileBadge`)에 연결된 파일명과 실시간 미저장(`●`)·저장완료(`✓`) 상태 표시.
  - 새 템플릿 적용·작업함 불러오기 시 파일 핸들 자동 해제로 타 프로젝트 오덮어쓰기 원천 차단.
- **단독 실행 HTML 내보내기 정화 (`build.py`, `js/export.js`)**: 단일 `.html` 내보내기본에서는 외부 `manifest`/`icons` 링크를 자동 제거해 단독 파일 실행 시 404 경고 0건 유지.

---

## [v5.0.20] - 2026-11-22 — 실사용 피드백 4건 반영 (PDF 인쇄 1페이지 좌상단 잘림·변환 밀림 완전 해결 · 목차 개수 입력 → 페이지 자동 생성 및 '+목차 추가' 버튼 제거 · 유튜브 오류 153 해결 · 발표자 뷰 현재 화면 자유 크기 조절)

### Fixed & Added
- **[P0] PDF 인쇄 시 활성/전환효과 슬라이드가 좌상단으로 밀려 잘리던 현상 완전 해결 (`css/print.css`, `js/state.js`, `js/export.js`)**:
  - `css/slides.css`의 `body.scaled-stage .slide.active`(`translate(-50%, -50%) scale(...) !important`)가 `css/print.css`의 `.slide` 규칙보다 선택자 우선순위가 높아 인쇄 미리보기에서 1번 슬라이드가 절반 이상 잘리던 원인을 규명하고, `@media print`에 최고 우선순위(`html body.scaled-stage #slideStage .slide[data-transition].active`) `transform: none !important` 및 `:root` 변수(`--stage-scale: 1`, `--stage-pan-x/y: 0px`) 리셋을 적용.
- **[Feature] 목차 개수(1~15개) 입력 → 목차 카드 & 연동 본문 페이지 자동 생성 (`index.html`, `js/navigation.js`) & 목차 슬라이드 `+ 목차 추가` 버튼 제거**:
  - `슬라이드·덱` 탭에 `목차 개수`·`기본 레이아웃`·`자동 생성` 컨트롤(`generateTocAndSlidesByCount`)을 추가해 입력한 개수에 맞춰 목차 그리드(1~4열 자동 배치)와 연동 본문 슬라이드를 한 번에 생성·연결.
  - 사용자 요청에 따라 목차 슬라이드 상단의 `+ 목차 추가` 버튼을 제거.
- **[P0] YouTube 임베드 오류 153(Video player configuration error) 해결 (`js/media.js`, `js/storage.js`, `js/main.js`, `js/history.js`, `css/slides.css`, `js/export.js`)**:
  - `http://`/`https://` 환경에서는 `youtube-nocookie.com/embed/...` + `origin` 파라미터 + `referrerpolicy="strict-origin-when-cross-origin"`을 적용하고 신뢰된 YouTube/Vimeo iframe의 제한적 `sandbox` 속성을 제거해 오류 153을 차단.
  - YouTube 서버가 Referer 누락으로 임베드를 원천 차단하는 로컬 `file://` 실행 환경에서는 오류 화면 대신 고화질 YouTube 썸네일 시네마 카드(`i.ytimg.com`) + 클릭 시 독립 팝업 플레이어(`openYouTubePopupPlayer`)로 자동 전환하고, 프로토콜에 따라 자동 하이브리드 전환(`hydrateYouTubeEmbedsForProtocol`)되도록 구현.
- **[Feature] 발표자 뷰(`V`) 실시간 현재 화면 자유 크기 조절 (`js/navigation.js`)**:
  - 좌/우 드래그 스플리터(현재 화면 ↔ 발표자 대본), 상/하 드래그 스플리터(현재 화면 ↔ 다음 슬라이드), 상단 `−` / `+` / `기본` / `크게` / `최대` 원클릭 크기 프리셋을 추가하고 사용자 설정 비율을 `localStorage`에 자동 저장.

---

## [v5.0.19] - 2026-11-22 — Strict CSP (`script-src 'self'`) 완전 달성: 10개 JS 모듈의 동적 인라인 이벤트 핸들러 155건 전량 `data-on-*` 전환 · 레거시 파일 정화 시 비활성 파서 선변환 · 빌드 타임 JS 인라인 핸들러 차단 게이트 추가

### Security & Strict CSP Fixed
- **[P0] 10개 JS 모듈에서 동적으로 생성되던 인라인 이벤트 핸들러(`onclick="..."`, `onblur="..."`, `onchange="..."`, `oninput="..."`, `onmousedown="..."`, `ondrag*`, `setAttribute('onclick', ...)`) 총 155건 전량 `data-on-*` 선언형 위임 속성으로 전환 (`js/charts.js`, `js/export.js`, `js/floating-cards.js`, `js/history.js`, `js/media.js`, `js/navigation.js`, `js/selection.js`, `js/state.js`, `js/storage.js`, `js/widgets.js`)**:
  - 기존에는 `index.html`에만 `data-on-*`가 적용되고 동적 JS 템플릿은 `onclick="..."`으로 생성 후 `MutationObserver`가 비동기 치환하던 구조여서, `'unsafe-inline'` 없는 엄격한 CSP(`script-src 'self'`) 환경에서 인라인 이벤트 핸들러 위반 경고가 발생하던 근본 원인을 완전히 제거.
- **[P0] 레거시 저장 파일(`.json`/`.html`/`.pptstudio.zip`) 불러오기 시 비활성 `DOMParser` 내부에서 `on*` → `data-on-*` 사전 변환 (`js/storage.js`)**: 구버전 작업 파일을 열 때도 라이브 DOM에 단 하나의 원시 `on*=` 속성도 삽입되지 않도록 보장.
- **[P1] 빌드 타임 Strict CSP 자동 감사 범위 확대 (`build.py`, `README.md`)**: `verify_strict_csp_compliance()`가 `index.html`뿐 아니라 15개 전체 JS 모듈의 동적 인라인 `on*=` 생성까지 자동 차단하도록 강화.

---

## [v5.0.18] - 2026-11-21 — 최종 전수 인증 6건 해결 (발표자 뷰 시각 미리보기 `!important` 변환 깨짐 수정 · 토스트/목차/차트 툴팁 Z-Index 계층 정비 · PPTX 전환효과 슬라이드 좌표 왜곡 및 발표자 노트 `<p:ph>`·숨김 슬라이드 표준화 · 전체화면 저장 정화)

### Fixed
- **[P0] 발표자 뷰(`V`) 실시간 시각 미리보기에서 `body.scaled-stage .slide.active`의 `!important` `transform`이 축소 스케일을 덮어써 미리보기가 좌상단으로 잘려 보이던 결함 해결 (`js/navigation.js`)**: `fitPresenterPreviewFrames()`와 `cloneSlideForPresenterPreview()`에 `setProperty(..., 'important')`, 전환 속성 제거 및 `data-aspect-ratio` 동기화를 적용.
- **[P0] Z-Index 계층 역전 해결 (`index.html`, `css/slides.css`)**:
  - `#toastBox`를 `z-index: 120`으로 상향해 모달·플로팅 카드 편집기·스튜디오 위에서도 알림 토스트가 항상 보이도록 수정.
  - `#tocModal`을 `z-index: 88`로 상향해 편집 스튜디오(`z-index: 60`) 뒤에 가려지던 현상 해소.
  - `#pptChartTooltip`을 `z-index: 110`으로 상향해 플로팅 라이트박스(`z-index: 95`) 내부 차트 호버 툴팁이 정상 표시되도록 수정.
- **[P0] PPTX 내보내기 시 `zoom`/`flip`/`slide-left`/`slide-up` 전환 효과가 걸린 비활성 슬라이드의 요소 좌표가 88% 축소·왜곡되던 결함 해결 (`js/export.js`)**: 측정 중 일시적으로 `transition-instant-reset` + `active`를 적용해 전 슬라이드를 1:1 정배율로 정밀 계측.
- **[P0] PPTX 발표자 노트(`notesSlide*.xml`)에 OOXML 표준 `<p:ph type="body" idx="1"/>` 플레이스홀더 부여 및 숨김 슬라이드 `show="0"` 속성 출력 (`js/export.js`)**.
- **[P1] 전체화면(`F`) 중 단독 HTML 저장 시 `body.is-fullscreen` 잔류 제거 (`js/export.js`)** 및 **Windows `audio/x-wav`·`audio/flac` 오디오 Data URI 정화 허용 (`js/storage.js`)**.

---

## [v5.0.17] - 2026-11-21 — 최종 전수 점검 5건 마감 (팝아웃 스튜디오 열린 상태 HTML 저장 시 패널 유실 방지 · 2D 벤토 타이틀 카드 겹침 없는 자동 배치 · 위계 블록 카드 배경 레이어 보존 · Undo/Redo 404 토큰 요청 제거 · 카드/서브박스/마퀴 동기화)

### Fixed
- **[P0] 듀얼 모니터 팝아웃 창(스튜디오·플로팅 카드 편집기)이 열린 상태에서 편집 가능 HTML 저장 시 패널 DOM이 파일에서 영구 유실되던 결함 해결 (`js/export.js`)**: 직렬화 직전 `dockStudioBackToMain()`·`dockFcStudioBackToMain()`으로 패널을 안전하게 복귀시키고 `focus-mode`·`fullscreen-mode`·`pasteboard-mode`·`space-pan-*` 등 임시 `body` 클래스를 일괄 정화.
- **[P0] 24×24 2D 벤토 슬라이드에서 `타이틀 카드 추가`(`addTitleCardToCurrentSlide`) 시 기존 1행 카드와 겹치던 버그 해결 (`js/navigation.js`)**: 타이틀 카드를 상단 4행(`1..4`)에 배치하고 기존 2D 카드를 `5..24`행으로 비례 재배치하도록 개선.
- **[P1] 카드 배경사진·호버사진이 적용된 카드에서 `위계 블록 추가`(`addHierarchyTierToCard`) 시 `.card-hover-bg-layer`/`.card-bg-tint`가 첫 번째 블록 안으로 빨려 들어가 배경이 깨지던 버그 수정 (`js/selection.js`)**.
- **[P1] Undo/Redo·최대 히스토리 초과 시 `materializeHistoryFullHtml()`이 라이브 DOM에 `__DATA_URI_TOKEN_*`을 파싱해 404 이미지 요청을 유발하던 현상 제거 (`js/history.js`)**: 비활성 `DOMParser` 문서로 전환해 네트워크 요청 `0건` 달성.
- **[P1] `moveCard()`/`deleteCard()`(`js/navigation.js`)·위계/서브박스 6개 함수(`js/selection.js`) 잠금 보호·미디어 정지·연결선 동기화 및 마퀴 다중 선택 직후 상단 컨텍스트 바 동기화 (`js/main.js`)**.

---

## [v5.0.16] - 2026-11-21 — 전수 UI 컨트롤(3,575회 실구동) · 저장/불러오기 · 화면비 집중 안정화 (P0 0건 수렴 릴리스)

### Fixed
- **[P0] 24×24 2D 벤토 슬라이드에서 `카드 크기·배치 초기화`(`resetCardVerticalGeometry`) 실행 시 `data-bento-2d` 잔류로 모든 카드가 1/24 폭으로 찌그러지던 버그 해결 (`js/selection.js`)**.
- **[P0] `모든 슬라이드에 테마 적용`(`applyThemeToAllSlides`) 시 `.theme-light`·`.slide-bg-layer`·`.slide-bg-overlay`·카드 서피스·발표자 뷰 동기화 누락 및 잠긴 슬라이드 보호 적용 (`js/theme.js`)**.
- **[P0] `카드 스타일 초기화`(`resetSelectedCardStyle`) 시 `.card-theme-dark` 잔류로 흰 배경 위 흰 글자가 되던 버그 및 그라데이션/그림자/여백 잔류 해결 (`js/selection.js`)**.
- **[P1] 다크 슬라이드 카드에 반투명(`toggleSelectedCardGlass`) 적용 시 밝은 흰색 유리 위 흰 글자 가독성 붕괴 해결 (`js/theme.js`)**: 다크 슬라이드 전용 `rgba(30, 41, 59, 0.68)` 글래스모피즘 서피스 자동 적용.
- **[P1] `텍스트 박스 폭 모드 전환`(`toggleTextboxAutoWidth`)이 카드 내부 문단을 32% 폭으로 축소하던 버그 교정 및 버튼 상태 동기화 (`js/text-editor.js`, `js/selection.js`)**.
- **[P1] `텍스트 배경 박스 해제`(`removeTextBackgroundBox`)의 내부 서식 보존·색상 초기화·중첩 `.text-pill-span` 해제 (`js/text-editor.js`), `clearSlideBgImage()` 오버레이/필터 초기화 (`js/theme.js`), 일괄 호버/트랜지션 잠금 보호 (`js/effects.js`)**.

---

## [v5.0.15] - 2026-11-21 — 실사용 핵심 UX 결함 9건 해결 (상단 컨텍스트 바·자동 탭 전환 미작동 복구 · 텍스트 모서리 리사이즈/그룹 축소/자동맞춤/카드 여백 `!important` 충돌 해소 · 2D 벤토 높이 보호 · 9:16 세로형 그리드 자동 적응 · 레이어 패널 위젯/아이콘 이름 정리 · 목차 모달 숨김 슬라이드 필터링)

### Fixed
- **[P0] 요소 선택·해제 시 상단 컨텍스트 바(`#ctxBar-*`) 및 `선택 요소별 자동 탭 전환` 미작동 복구 + `currentStudioTab` 미선언 `ReferenceError` 해결 (`js/selection.js`, `js/state.js`)**: `js/state.js`에 `let currentStudioTab = 'design';` 선언을 추가하고 `updateContextualTopBar()`·`autoSwitchStudioTabForElement()`를 `selectElementForInspector()`/`clearSelectionInspector()`에 정식 연결했으며, 카드·도형·위젯 선택 시 `#ctxBar-shape`가 정확히 표시되도록 분류 로직 교정.
- **[P1] 자유 배치 반응 실행 버튼·인터랙티브 링크 버튼 추가 시 `deck` 탭으로 오이동하던 버그 수정 (`js/floating-cards.js`)**: `motion` 탭 전환 및 `motion-trigger` 아코디언 자동 전개로 통일.
- **[P0] `body.scaled-stage`의 `font-size`/`padding` `!important` 규칙이 텍스트 모서리 드래그 크기 조절·다중 선택 그룹 비례 리사이즈·텍스트 자동 맞춤(`runAutoFitOnElement`)·카드 내부 여백(`#inspPaddingPx`)을 덮어 무력화하던 결함 해결 (`css/slides.css`, `css/print.css`, `js/main.js`, `js/selection.js`, `js/text-editor.js`)**: `.md:text-*`에 `:not([style*="font-size"])`, `.md:p-*`·`.has-multi-rows > .slide-card`에 `:not([style*="padding"])`을 적용하고 드래그·자동맞춤 경로에 `setProperty('font-size', ..., 'important')` 적용.
- **[P0] 창 리사이즈·줌 시 `syncResponsiveCardHeights()`가 `data-bento-2d="true"` 2D 벤토 카드에 구형 픽셀 높이를 덮어쓰던 경로 차단 (`js/state.js`)**.
- **[P1] `9:16` 세로형(810×1440) 화면비 전환 시 3단·4단·12단 그리드가 좁은 세로 띠로 찌그러지던 현상 개선 (`css/slides.css`)**: 4단 → 2×2, 3단·12단 → 1열 세로 스택 자동 적응 규칙 추가.
- **[P1] 레이어 패널(`getCardInnerLayerChildren`, `getLayerItemsForCurrentSlide`)에서 4종 인터랙티브 위젯과 SVG 아이콘의 편집 바 텍스트가 노출되던 문제를 `[위젯] Before/After 비교`, `[아이콘] star` 등 깔끔한 이름으로 정리 (`js/selection.js`)**.
- **[P1] 자유 요소 비율 잠금/Shift 모서리 리사이즈 `nextH` 경계 클램핑(`[3%, 100%]`, `js/main.js`), 하단 진행바 스크럽 시 텍스트 드래그 선택 방지 및 목차 모달(`tocModal`) 발표 중 숨김 슬라이드 제외 (`js/navigation.js`)**.

---

## [v5.0.14] - 2026-11-21 — 실사용 심층 결함 8건 해결 (카드 그라데이션 2중 중첩 고착 버그 해결 · PNG/JPG 슬라이드·카드 그라데이션 & 단일 선택 텍스트 출력 복구 · PPTX/PNG 부모 카드 자식 SVG 색상 탈취 차단 · Before/After 이미지 보정 오작동 차단 · Undo/Redo 플로팅/트리거 드롭다운 동기화 · 잠긴 슬라이드 contenteditable 완전 봉쇄)

### Fixed
- **[P0] 카드 그라데이션 각도·색상 재조절 시 첫 그라데이션이 `.card-bg-layer`에 굳고 새 그라데이션이 `.card-bg-tint`에 2중 중첩되던 버그 수정 (`js/theme.js`)**: `hasBgImg` 판별을 `url(` 포함 여부로 교정하고, 슬라이드 배경사진 위 그라데이션은 `.slide-bg-overlay`에 합성해 업로드 사진을 보존.
- **[P0] PPTX·PNG 내보내기 시 카드 내부에 삽입된 도형(`.shape-fill`) 색상을 부모 `.slide-card`가 탈취해 카드 전체를 칠해버리던 버그 차단 (`js/export.js`)**.
- **[P0] PNG/JPG 이미지 내보내기(`exportSlideOrElementAsImage`) 시 슬라이드·카드 컬러 그라데이션 누락 및 단일 선택 텍스트 요소(`h1`/`p`) 빈 이미지 출력 수정 (`js/export.js`)**.
- **[P0] Before/After 위젯 선택 시 이미지 보정·반전·교체 도구가 After 이미지만 단독 변조하던 버그 차단 (`js/media.js`, `js/selection.js`)**: `getActiveImageElement()`에서 `.iw-ba-img` 제외, 위젯 선택 시 `#ctxBar-shape` 표시, 블러 슬라이더 UI 동기화/초기화 및 이미지 보정 6개 함수 잠금 가드 추가.
- **[P1] Undo/Redo·히스토리 점프·불러오기(`restoreStageHtml`) 시 플로팅 카드·트리거 대상 드롭다운 자동 갱신 및 `isActiveEditing()` 준수 (`js/history.js`)**.
- **[P1] 슬라이드 잠금(`toggleCurrentSlideLock`) 시 내부 `[contenteditable]` 비활성화(`false`)로 키보드 `Tab` 포커스 편집까지 원천 봉쇄 (`js/selection.js`, `js/text-editor.js`)**.
- **[P1] 비-2D 그리드 슬라이드에서 `크기 동일 맞추기`(`matchSelectedElementsSize`) 첫 실행 시 기준 카드 2D 좌표 오계산 수정 (`js/selection.js`)**.
- **[P1] 화면 비율 전환(`setDeckAspectRatio`) 시 열려 있는 발표자 뷰 실시간 동기화 (`js/state.js`) 및 전체 글꼴 교체 시 잠긴 슬라이드/레이어 보호 (`js/navigation.js`, `js/text-editor.js`)**.

---

## [v5.0.13] - 2026-11-21 — 실사용 심층 결함 8건 해결 (다크 표지·쇼케이스 라이트 테마 전환 시 흰 글자 투명화 해결 · 라이트 슬라이드 내 다크 카드 고대비 자동 반전 · 템플릿/파일 가져오기 후 Ctrl+S 이전 작업함 덮어쓰기 데이터 유실 차단 및 초기 원본 갱신 · 위젯/텍스트/선택 인스펙터 잠금 및 상태 완결성 보강)

### Fixed
- **[P0] 다크 표지·섹션·인용구·쇼케이스 슬라이드에 라이트 브랜드 키트나 `라이트` 테마 적용 시 `text-white*` 글자가 흰 배경에 묻혀 사라지던 가독성 결함 해결 (`css/slides.css`, `js/theme.js`)**: `.slide.theme-light` 전용 고대비 적응 규칙(의도된 다크 배지·버튼·플립 뒷면 보호)을 추가하고, 브랜드 키트·단일 테마 전환 시 `#slideStage` 배경·카드 배경사진 `.card-bg-tint`·발표자 뷰를 실시간 동기화.
- **[P0] 라이트 슬라이드에서 개별 카드를 어두운 배경색으로 바꿀 때 `.text-ink` 검정 글자가 어두운 카드에 묻히던 결함 해결 (`css/slides.css`, `js/theme.js`, `js/media.js`)**: `card-theme-dark` 클래스를 자동 부여해 다크 카드 내부 텍스트·테두리를 밝은 고대비로 자동 반전(형광펜·플립 앞면·핫스팟 말풍선 보호).
- **[P0] 새 스타터 템플릿 선택 또는 `.json`/`.html`/`.pptstudio.zip` 가져오기 직후 `Ctrl+S` 실행 시 이전 작업함 프로젝트를 조용히 덮어쓰던 데이터 유실 버그 및 `초기 원본 복원` 오작동 해결 (`js/storage.js`)**: 템플릿/외부 파일 로드 시 `activeWorkspaceProjectId = null` 초기화, 기본 메타 복원 및 `initialDeckStageHtml`을 새 덱 기준으로 갱신.
- **[P0] `selectElementForInspector()` 즉시 테스트 모드 격리, 다른 요소 선택 시 이전 `savedTextSelectionRange` 잔류 초기화, 중복 `syncVideoSourceInspectorUI()` 제거 (`js/selection.js`)**.
- **[P1] 4종 인터랙티브 위젯 12개 편집 동작(`js/widgets.js`), 텍스트 서식 8개 함수(`js/text-editor.js`), `resetCurrentSlideToInitial()`(`js/navigation.js`)에 잠긴 슬라이드·레이어 보호 가드 완비**.
- **[P1] 슬라이드 이동 시 `#slideBgColorPicker` 색상 자동 동기화(`js/navigation.js`), `setAccentColor()` 발표자 뷰 동기화(`js/theme.js`), `removeCoreKeyword()` 내부 굵게/기울임 서식 보존(`js/text-editor.js`)**.

---

## [v5.0.12] - 2026-11-21 — 실사용 심층 결함 8건 해결 (문단 클릭 이동 후 이전 드래그 범위 서식 오적용 제거 · 모달/플로팅 카드 붙여넣기 격리 및 줄바꿈 보존 · 12개 삽입 진입점 잠금 슬라이드 완전 보호 · 그룹 비례 리사이즈 위젯 크롬 보호 · SVG 벡터 아이콘 PNG/PPTX 내보내기 지원 · 플로팅 스튜디오 창 리사이즈 화면 클램핑)

### Fixed
- **[P0] 텍스트 구간 드래그 후 다른 문단을 클릭했을 때 이전 드래그 범위에 색상·굵게·형광펜이 오적용되던 버그 수정 (`js/text-editor.js`)**: `#slideStage` 내부 커서 클릭(`sel.isCollapsed`) 시 `savedTextSelectionRange`/`activeLiveColorSpan`/`activeLiveHighlightSpan`을 초기화(툴바·컬러 피커 클릭 시에는 유지)하고, `applyTextColor()`에서 위젯·차트·형광펜 내부 스팬을 보호.
- **[P0] 모달·플로팅 카드 편집기 열림 중 `Ctrl+V` 붙여넣기 및 다중 행 붙여넣기 결함 수정 (`js/main.js`)**:
  - 플로팅 카드 편집기 열림 중 스크린샷 붙여넣기 시 뒷면 슬라이드가 아닌 플로팅 카드 내부로 압축 삽입하고, 다른 모달 열림 중에는 뒷면 슬라이드 붙여넣기를 차단.
  - `[contenteditable]` 내 다중 행 일반 텍스트 붙여넣기 시 줄바꿈(`
?
`)을 `<br>`로 보존(`insertPlainTextPreservingNewlines`)하고, 잠긴 슬라이드에서의 붙여넣기·파일 드롭을 차단.
- **[P0] 다중 선택 그룹 비례 리사이즈 시 위젯 편집 바·핫스팟 핀·차트 글자 크기가 왜곡되던 버그 차단 (`js/main.js`)**.
- **[P0] 잠긴 슬라이드(`data-slide-locked="true"`) 우회 삽입 차단 (`js/state.js`, `js/main.js`, `js/media.js`, `js/charts.js`, `js/widgets.js`, `js/floating-cards.js`, `js/navigation.js`)**: 공통 헬퍼 `isCurrentSlideLocked()`로 텍스트박스·도형·아이콘·이미지·영상·오디오·임베드·위젯·차트·반응버튼·링크버튼·카드 12개 삽입 경로 일괄 보호.
- **[P1] 자유 SVG 벡터 아이콘(`data-shape-type="svg-icon"`) PNG/JPG·PPTX 내보내기 출력 지원(`renderSvgIconToDataUrl`) 및 브랜드 포인트 컬러 자동 연동 (`js/export.js`, `js/media.js`)**.
- **[P1] 오디오 위젯 연속재생 버튼 발표 모드/발표 전용 HTML 숨김 및 드래그 간섭 차단 (`css/slides.css`, `js/main.js`, `js/export.js`)**.
- **[P1] 플로팅 스튜디오 패널 브라우저 축소 시 화면 밖 이탈 방지(`clampFloatingStudioToViewport`, `js/studio.js`)** 및 **레이어 목록 팝아웃 `ownerDocument` 대응·숨김 시 잔여 선택 오버레이 해제 (`js/selection.js`)**.

---

## [v5.0.11] - 2026-11-21 — 실사용 심층 결함 6건 해결 (PPTX·PNG 벡터 도형 투명/누락 완전 복구 · 플로팅 카드 편집기 이전 텍스트 색상/크기 고착 버그 해결 · 프로젝트 전환 시 크롬/화면비 누출 차단 · 카드 그림자 버튼 활성화 및 도형 잠금 보호)

### Fixed
- **[P0] PPTX·PNG 내보내기 시 SVG 벡터 도형(`triangle`, `diamond`, `star`, `speech`, `arrowRight`, `arrowBoth`, `line`)이 투명하게 사라지던 결함 완전 해결 (`js/export.js`)**: `shapeGeomMap`에 `arrowRight`/`arrowBoth`/`speech`를 정식 매핑하고, PPTX·캔버스 모두 `.shape-fill`/`shape-stroke` SVG 색상·선 두께와 양방향 화살표·말풍선 경로를 정확히 추출해 출력.
- **[P0] 플로팅 카드 스튜디오 부분 글자색(`execFcForeColor`)·크기(`setFcFontSizePx`) 적용 후 다른 문단을 수정해도 이전 단어만 계속 바뀌던 고착 버그 수정 (`js/floating-cards.js`)**: 확정 시 및 커서 이동 시 `activeFcLiveColorSpan`/`activeFcLiveFontSpan`을 초기화하고, 팝아웃 창 `execFcFormat()` 계산 스타일 및 다크 카드 형광펜 글자 대비(`#111111`) 보정.
- **[P0] 다크 테마·9:16 덱에서 다른 프로젝트로 전환 시 이전 상/하단 바 색상·포인트 컬러·화면비가 남아 오염되던 버그 수정 (`js/storage.js`)**: `restoreDeckMetaPayload()`가 빈 메타 필드를 기본 라이트·16:9로 안전 복원하고, 작업함 저장 시 IndexedDB 연결(`db.close()`)을 깔끔히 반납.
- **[P0] 선택 카드(`slide-card`)에 `#ctxBar-shape` `그림자` 버튼이 무반응이던 버그 및 카드 배경사진 위 채우기 색상 동기화 수정 (`js/media.js`)**: `toggleSelectedShapeShadow()`에 `.slide-card`를 포함하고, 도형 스타일/레이어 순서 잠금 보호 및 `setCardMediaDockPosition()`의 `.card-hover-bg-layer`/`.card-bg-tint` 앞 삽입 방지 적용.
- **[P1] 반응형 모션·등장 순서·서브박스·텍스트박스 추가 경로에 잠긴 슬라이드/레이어 보호 가드 완비 (`js/effects.js`, `js/selection.js`)**.

---

## [v5.0.10] - 2026-11-21 — 실사용 심층 결함 8건 해결 (단일 텍스트 굵게·기울임·밑줄·취소선·좌/중/우/양쪽 정렬 먹통 복구 · PPTX 카드 배경 Z-순서 역전 해결 및 병합 표 OOXML 정합성 완성 · PDF 숨김 슬라이드·빈 마지막 페이지·발표자 노트 클리핑 해결 · 단독 HTML 확대/패닝 상태 초기화 · 차트 시나리오 편집 실시간 동기화)

### Fixed
- **[P0] 단일 텍스트 선택 시 `B`/`I`/`U`/`S` 및 모든 `좌`/`중`/`우`/`양` 정렬 버튼이 무반응이던 치명 결함 수정 (`js/text-editor.js`)**: `execFormat()`이 단일·다중 텍스트 블록 모두에 정렬과 굵게·기울임·밑줄·취소선을 즉시 적용하도록 복구하고, 밑줄+취소선 동시 조합 보존 및 잠금 가드를 추가.
- **[P0] `.pptx` 내보내기 시 흰색 카드 배경(`<p:sp>`)이 내부 차트·표·이미지·Before/After 위젯을 덮어 가리던 Z-순서 역전 버그 및 병합 표 OOXML 손상 해결 (`js/export.js`)**:
  - 카드 배경 도형을 최하단에 먼저 배치한 뒤 Before/After·차트·표·이미지를 그 위에 출력하도록 순서를 교정하고, 선(`line`) 도형 테두리 두께를 정확히 반영.
  - 병합된 데이터 표에 OOXML 표준 `gridSpan`·`rowSpan`·`hMerge="1"`·`vMerge="1"` 속성을 정확히 생성해 PowerPoint에서 깨짐 없이 열리도록 완성.
- **[P0] PDF 인쇄(`css/print.css`) 시 숨긴 슬라이드 노출, 마지막 빈 페이지 추가, 빈 발표자 노트 배너 및 노트 잘림 해결 (`css/print.css`)**: `.slide[data-slide-hidden="true"]`·`#floatingCardLightbox` 인쇄 제외, `.slide:last-of-type` 페이지 넘김 해제, `data-speaker-notes`가 있는 슬라이드에만 노트 영역 출력 및 `overflow: visible` 적용.
- **[P0] 캔버스 확대(150%)·패닝 상태에서 단독 HTML 저장 시 열린 파일이 화면 밖으로 밀린 채 시작되던 버그 수정 (`js/export.js`)**: `clonedRoot`의 `--stage-zoom`/`--stage-pan-x`/`--stage-pan-y`를 기본값(`1`, `0px`)으로 초기화.
- **[P1] 라이브 시나리오가 켜진 차트에서 수치·항목명·부제목·행 추가/삭제 시 시나리오 데이터 불일치 수정 (`js/charts.js`)**: `syncActiveScenarioFromChartData()`로 모든 변경을 활성 시나리오와 타 시나리오 구조에 실시간 동기화.
- **[P1] `applyCustomSlideBg()`의 `theme-light`·스테이지 배경 동기화 및 3자리 HEX `isDarkHexColor()` 지원 (`js/theme.js`), `positionSelectionOverlay()` 즉시 테스트 모드 격리 (`js/selection.js`), `toggleSubSup()` 빈 선택 스냅샷 방지 (`js/text-editor.js`)**.

---

## [v5.0.9] - 2026-11-21 — 실사용 심층 결함 9건 해결 (빈 슬라이드 레이아웃 적용 시 카드 1/24 축소 붕괴 해결 · Cover/Section/Quote 슬라이드 PPTX/PNG 빈 화면 출력 수정 · PPTX `<br>` 줄바꿈/기울임/발표자노트 단락 보존 · 표 열 정렬 시프트 및 CSV 스타일 정화 · 인라인 중첩 contenteditable 커서 갇힘 제거 · 단독 HTML 저장 시 열린 오버레이 정화)

### Fixed
- **[P0] 빈 슬라이드에서 `setSlideLayout()` 실행 시 새 카드가 1/24 × 1/24 크기로 찌그러지던 버그 해결 (`js/navigation.js`)**: 카드 자동 생성 후 잔존하던 `data-bento-2d` 속성을 제거하고 잠긴 슬라이드 보호 및 단일 Undo 스냅샷으로 통합.
- **[P0] `Cover` · `Section` · `Quote` 슬라이드가 PPTX·PNG 내보내기 시 빈 화면으로 출력되고 `<blockquote>`가 누락되던 결함 해결 (`js/export.js`)**: `collectExportableSlideBlocks()`로 카드 없는 직속 콘텐츠 블록을 포착하고 `blockquote`를 PPTX/PNG 텍스트 추출 대상에 추가.
- **[P0] PPTX 내보내기 시 `<br>` 줄바꿈이 띄어쓰기 없이 한 단어로 합쳐지고 기울임·다중 행 발표자 노트가 누락되던 결함 수정 (`js/export.js`)**: `extractVisualLinesFromTextEl()`로 `<br>`을 개별 `<a:p>` 문단으로 분리하고 `italic` 속성 및 발표자 노트 다중 `<a:p>` 생성 지원.
- **[P0] 표 열 삽입·삭제 시 열 정렬(`d.colAligns`) 어긋남 및 CSV 붙여넣기 시 이전 셀 색상 잔류 해결 (`js/charts.js`)**: `shiftTableCellStylesOnCol()`에 `colAligns` 시프트를 추가하고, `applyCsvPasteToChartOrTable()`에서 `cellStyles`/`colAligns` 초기화·시나리오 동기화·안내 토스트·패널 자동 닫힘 적용.
- **[P0] 부분 글자색(`applyTextColor`)·배경 박스(`applyTextBackgroundBox`) 적용 시 중첩 `contenteditable="true"`로 인해 방향키·백스페이스 커서가 갇히던 버그 수정 (`js/text-editor.js`)**.
- **[P0] 단독 HTML 내보내기(`buildSerializedStandaloneHTML`) 시 열려 있던 라이트박스·암전 오버레이·판서 캔버스·모달이 열린 채로 저장되던 현상 정화 (`js/export.js`)**.
- **[P1] 새 목차 카드 추가(`addNewTocCard`)의 하드코딩된 3번 슬라이드 교정·이동/삭제 컨트롤 추가·잠금 보호, 슬라이드 복사(`copyCurrentSlideToClipboard`) 임시 편집상태 정화, 슬라이드 삭제 시 재생 중 미디어 자동 정지 (`js/navigation.js`)**.

---

## [v5.0.8] - 2026-11-21 — 실사용 심층 결함 9건 해결 (카드 내 위젯·차트 자유분리 시 텍스트박스 손상 방지 · 플로팅 카드 리스너 중복 누적 및 팝아웃 DOM 수정 · 3자리 HEX 색상 변환 오류 교정 · 최근 색상 스와치 컨텍스트 라우팅 및 팝아웃 동기화 · 발표 중 이미지 드롭 차단 · 서식·효과 초기화 단일 스냅샷 통합)

### Fixed
- **[P0] 카드 내부 인터랙티브 위젯(`.ppt-interactive-widget`)·차트(`.ppt-chart-widget`) 자유분리 시 점선 텍스트박스로 손상되던 버그 및 잠금 우회 수정 (`js/selection.js`)**: `detachElementToFreeLayer()`에 위젯·차트 전용 무손상 자유분리 경로와 잠긴 슬라이드/레이어 보호, 레이어 목록 동기화를 추가하고 `detachAllCardsInCurrentSlide()`를 단일 Undo 스냅샷으로 통합.
- **[P0] 플로팅 카드 스튜디오 내부 블록 리스너 중복 누적 및 팝아웃 창 크로스-도큐먼트 버그 수정 (`js/floating-cards.js`)**: `makeFcBlockResizable()`에 `dataset.fcClickBound` 중복 방지, `ownerDocument.createElement` 적용, 차트/버튼 `contenteditable` 오염 차단을 적용하고 `applyLinkActionToSelected()`에서 위험 URL 스킴(`javascript:`/`vbscript:`/`data:`) 차단.
- **[P0] 발표·즉시 테스트 모드 중 이미지 슬롯 파일 드롭 변조 차단 및 WebP/GIF 투명 채널 보존 (`js/media.js`)**: `handleImageDrop()`에 `isActiveEditing()` 및 잠금 슬라이드 가드를 추가하고, `executeReplaceMediaPreserveProps()`·`insertDirectImageFile()`의 알파 채널 보존 및 `0×0` 경계 방어·레이어 동기화 보강.
- **[P0] 3자리 단축 HEX(`#FFF` 등) `hexToRgba()` 색상 오변환(주황색 깨짐) 및 `NaN` 알파 방어 (`js/state.js`)**.
- **[P1] 최근 사용 색상 스와치 팝아웃 창 동기화 및 도형 바(`#ctxBar-shape`) 채우기 색상 라우팅 수정 (`js/state.js`)**.
- **[P1] `서식·효과 초기화`(`resetCurrentContextStyle`) 3중 Undo 스냅샷·토스트 중복 제거 및 등장 모션(`data-anim`)·필터 초기화·잠금 보호 추가 (`js/text-editor.js`)**.
- **[P1] `applyGradientPreset()` 미선택 시 안내 토스트 추가 (`js/theme.js`) 및 `applyElementPaddingPx()` 잠금·위젯 외곽 보호 (`js/selection.js`)**.

---

## [v5.0.7] - 2026-11-21 — 실사용 심층 결함 10건 해결 (다크 테마 슬라이드 내 위젯·형광펜·꺾은선 차트 글자 가독성 복구 · 표 정렬 시 합계행 고정 및 셀 색상 시프트 · 다중 행 병합 안전화 · 선택 오버레이 잠금 가드 · Space 패닝 창 이탈 해제 · 인라인 슬라이드 링크 동기화 · 그룹 해제 완결성 · PPTX 발표순서/래스터 필터링)

### Fixed
- **[P0] 다크 테마(`.theme-dark`) 슬라이드에서 인터랙티브 위젯·형광펜(`.hl-mark`)·꺾은선 차트 SVG 라벨 글자가 배경에 묻혀 안 보이던 가독성 결함 해결 (`css/slides.css`)**: 형광펜 글자를 검정(`#111111`)으로 유지하고, 꺾은선 차트 SVG 텍스트를 밝은 색(`#E2E8F0`)으로 전환했으며, 탭 카드는 다크 서피스, 3D 플립 앞면·핫스팟 말풍선은 선명한 고대비 텍스트로 자동 보정.
- **[P0] 표 정렬(`sortTableBySelectedColumn`) 시 `합계(SUM)`/`평균(AVG)` 행이 데이터 중간으로 섞이고 셀 색상(`cellStyles`)·행 높이(`rowHeights`)가 어긋나던 버그 해결 (`js/charts.js`)**: 요약 행을 하단에 고정하고 데이터 행 순열에 맞춰 셀 색상과 행 높이를 자동 재매핑.
- **[P0] 표 셀 병합(`mergeSelectedTableCells`) 시 기존 병합과 겹치거나 `rowspan > 1` 셀을 우측 병합할 때 표 행 구조가 깨지던 버그 해결 (`js/charts.js`)**.
- **[P0] 선택 오버레이 8방향 리사이즈 핸들 및 `✥ 드래그 이동`이 잠긴 레이어/슬라이드 보호를 우회하던 결함 차단 (`js/main.js`)**.
- **[P1] `Space` 패닝 중 `Alt+Tab` 등 창 포커스 이탈 시 패닝 모드가 영구 고정되던 버그 수정 (`js/main.js`)**.
- **[P1] 슬라이드 추가·삭제·이동 시 본문 인라인 링크(`a[data-inline-link][href^="#slide-"]`)도 `[data-goto-slide]`와 함께 자동 동기화 (`js/navigation.js`)**.
- **[P1] 슬라이드 복제(`regenerateClonedSlideInternalIds`, `duplicateCurrentSlide`) 시 인터랙티브 트리거 ID(`data-trigger-node-id`/`data-trigger-target`) 재발급 및 임시 선택/플립 상태 정화 (`js/navigation.js`)**.
- **[P1] 격리된 그룹(`isolatedGroupId`)에서 `그룹 해제` 실행 시 나머지 그룹원까지 일괄 해제 및 격리 상태 초기화 (`js/selection.js`)**.
- **[P1] PPTX/ZIP 가져오기 안정성 강화 (`js/export.js`)**: `ppt/presentation.xml`의 실제 슬라이드 순서(`sldIdLst`)를 우선 존중하고, 비래스터 이미지(`.emf`/`.wmf`) 오인식 및 빈/디렉터리 ZIP 항목 예외를 안전하게 차단.
- **[P2] 상단 섹션 배지(`#headerSectionBadge`) 직접 수정 시 미저장 상태·필름스트립·히스토리 즉시 동기화 (`js/main.js`)**.

---

## [v5.0.6] - 2026-11-21 — 실사용 심층 결함 9건 해결 (열린 모달 뒤 단축키 누출 차단 · 슬라이드 트랜지션 '효과 없음/기본' 강제 덮어쓰기 및 이중 .active 레이스 해결 · PNG/JPG 배경사진·핫스팟핀·연결선 완전 렌더링 · 서식지우기 위젯/차트 보호 · 간편모드 자동전개 표시 · 플로팅 라이트박스 표 리사이저 정화 · 작업함 ID/IDB 정리)

### Fixed
- **[P0] 열린 모달 뒤로 전역 단축키(`Delete`, `Space`, 방향키, `T`, `E`, `H`, `F`, `M` 등)가 관통해 뒷면 슬라이드를 삭제·변경하던 버그 해결 (`js/main.js`)**: 11개 모달이 열려 있을 때는 `Esc` 닫기(및 플로팅 카드 편집기 내부 `Ctrl+Z`/`Ctrl+Y`/`Delete` 블록 삭제)만 허용하도록 격리.
- **[P0] 슬라이드 트랜지션 `효과 없음('none')` / `기본('default')` 설정이 즉시 `'slide-left'`로 덮어써지던 버그 및 빠른 슬라이드 전환 시 이중 `.active` 레이스 수정 (`js/effects.js`)**: 실제 전환 효과 선택 시에만 미리보기를 재생하고 45ms 타이머 실행 전 현재 슬라이드 일치 여부를 검증.
- **[P0/P1] PNG/JPG 이미지 내보내기(`exportSlideOrElementAsImage`)에 슬라이드 배경사진(`.slide-bg-layer`), 카드 배경사진(`.card-bg-layer`), 핫스팟 번호 핀(`.iw-hs-pin`), 자석 연결선 화살표(`svg.ppt-connectors-layer`) 렌더링 완비 (`js/export.js`)**.
- **[P1] `전체 서식 지우기`(`clearAllTextFormatting`) 실행 시 인터랙티브 위젯 배지·차트 범례 점·목차 번호 스팬이 파괴되던 버그 차단 (`js/text-editor.js`)**.
- **[P1] 플로팅 팝업 카드 저장·라이트박스 열기 시 표 리사이저(`.table-col-resizer`/`.table-row-resizer`)·셀 선택선 정화 및 라이트박스 내부 KPI/차트 애니메이션 재생 지원 (`js/floating-cards.js`)**.
- **[P1] 간편 모드(`studio-compact-mode`)에서 차트·미디어 선택 시 자동 전개된 섹션이 숨겨져 빈 인스펙터가 보이던 문제 해결(`.compact-force-show`) 및 영문 UI 토글 문구 일관성 보강 (`css/studio.css`, `js/studio.js`)**.
- **[P1] 작업함 삭제·비우기 시 `activeWorkspaceProjectId` 초기화 및 IndexedDB 연결 정상 종료 (`js/storage.js`)**.
- **[P1] `getActiveImageElement()`의 숨김 플레이스홀더(`.slot-img.hidden`) 오감지 차단, 자석 연결선 브랜드 포인트 컬러 연동, 동영상 경로 위험 프로토콜 차단 (`js/media.js`)**.

---

## [v5.0.5] - 2026-11-21 — 실사용 심층 결함 10건 해결 (탭 카드 스페이스바 편집 먹통 해결 · 위젯 투명 PNG 검은 배경 방지 · 플로팅 카드 팝아웃 DOM/이미지 압축 · PPTX 제어문자 손상 방지 · PDF 넘침 검사 오탐 제거 · 요소 복제 UID 충돌 방지 · 저장본 임시 편집상태 일괄 정화)

### Fixed
- **[P0] 슬라이드 내 탭 전환 카드 라벨 편집 시 스페이스바·엔터 키 오작동 수정 (`js/widgets.js`, `js/main.js`)**: `.iw-tab-btn`을 `<button>` 대신 `<div role="tab" tabindex="0">`로 전환해 라벨 편집 중 공백 입력이 정상 동작하고 `Enter`로 한 줄 편집을 깔끔히 마무리하도록 개선.
- **[P0] 4종 인터랙티브 위젯 투명 PNG 업로드 시 배경이 검은색으로 깨지던 현상 해결 (`js/widgets.js`)**: `compressImageFileToDataUrl()` 공통 헬퍼를 도입해 PNG/WebP/GIF의 알파 투명 채널을 100% 보존하면서 고해상도 이미지를 1400px 이하로 최적화.
- **[P0] 플로팅 카드 스튜디오 팝아웃 창 크로스-도큐먼트 DOM 생성 버그 및 대용량 이미지 비압축 저장 해결 (`js/floating-cards.js`)**: `insertChartIntoFloatingCardEditor()`/`insertImageIntoFloatingCardEditor()`가 `getFcStudioDoc().createElement`를 사용하고 `activeChartId`를 즉시 바인딩하며, 배경/호버/본문 이미지에 자동 리사이즈 압축 적용.
- **[P0] PDF/Word 복사 텍스트에 섞인 제어문자로 인한 `.pptx` 파일 손상 방지 (`js/export.js`)**: `escapeXml()`에서 XML 1.0 비허용 제어문자(`\x00-\x08`, `\x0B`, `\x0C`, `\x0E-\x1F`, `\x7F`)를 사전 제거.
- **[P0] PDF 인쇄 시 편집 바 높이 때문에 발생하던 넘침(Overflow) 오탐 경고 해결 (`js/export.js`)**: `saveAsPDF()`에서 편집 모드 종료 후 넘침 검사를 수행하고 `.ppt-interactive-widget` 오탐을 제외.
- **[P1] `Ctrl+D` 요소 복제 시 차트·연결선·트리거 UID 중복 및 잠긴 슬라이드 복제 차단 (`js/selection.js`)**.
- **[P1] 인스펙터 수치 입력(`applyInspectorGeometry`, `applyInspectorPixelGeometry`)의 잠긴 레이어/슬라이드 보호, `NaN`/빈값 방어, 연결선 동기화 및 팝아웃 창 `activeElement` 대응 (`js/selection.js`)**.
- **[P1] 작업함·`.json`·`.pptstudio.zip`·IndexedDB 자동저장 시 선택 테두리·플립 뒷면편집·핫스팟 열림·`contenteditable` 임시 상태가 저장본에 남던 문제 일괄 정화 (`js/storage.js`)**.
- **[P1] 핫스팟 10번 이상 핀 제목 `010.` 오표기 수정 (`js/widgets.js`)** 및 **Zero-Eval 선언형 엔진 `blur` 비버블링 가드·지연 `stopPropagation` 래핑 최적화 (`js/main.js`)**.

---

## [v5.0.4] - 2026-11-21 — 실사용 심층 감사 결함 10건 추가 해결 (찾기 다음 항목 이동 먹통 & 차트/표 바꾸기 영속 동기화 · 그라데이션 초기화 시 업로드 배경사진 보호 · 동일 크기 맞추기 2D 벤토/자유분리 수정 · px 자유요소 인스펙터 수치 폭발 방지 · 이미지 블러 필터 보존 · 가이드선 동적 재정렬 · 필름스트립 키보드 복사 활성화 · ZIP 미디어 MIME 복원)

### Fixed
- **[P0] 찾기/바꾸기(`Ctrl+F`) `다음 찾기` 및 항목 클릭 시 항상 0번 항목으로 리셋되던 버그 수정 (`js/navigation.js`)**: `jumpToFindMatch()`에서 활성 인덱스를 유지하고 카운터 배지(`현재 / 전체`)를 정확히 표시하도록 교정.
- **[P0] 찾기/바꾸기로 차트·데이터 표 텍스트 치환 시 `data-chart-json` 미동기화로 편집·내보내기 시 원복되던 버그 수정 (`js/navigation.js`)**: `syncChartJsonAfterTextNodeEdit()`로 제목·항목명·부제목·표 셀 변경을 즉시 JSON에 반영.
- **[P0] 그라데이션 `초기화` / `서식·효과 초기화` 실행 시 업로드한 슬라이드·카드 배경 사진(`url(...)`)까지 삭제되던 버그 수정 (`js/theme.js`)**: `gradient(` 값만 선별 제거하고 선택 요소가 있을 때는 슬라이드 배경을 건드리지 않도록 보호.
- **[P0] `크기 동일 맞추기`(`matchSelectedElementsSize`)의 자유분리 후 고아 노드 스타일 적용 및 2D 벤토 미대응 수정 (`js/selection.js`)**: `detachElementToFreeLayer()` 반환 노드를 받아 크기를 적용하고, 2D 벤토 카드는 `applyBento2DCoords()`로 정밀 동기화.
- **[P1] `fit-content`/`px` 자유 요소(링크 버튼 등)의 인스펙터 `%` 수치 오표시 및 크기 폭발 방지 (`js/selection.js`)**.
- **[P1] 이미지 블러 슬라이더(`onBlurSliderChange`)가 밝기·대비·흑백 필터를 지워버리던 버그 수정 (`js/theme.js`)**.
- **[P1] 정렬·균등 분배의 잠긴 레이어/슬라이드 보호 및 연결선 동기화, 창 크기·줌 변경 시 영구 가이드선(`.ppt-persistent-guide`) 자동 재정렬 (`js/selection.js`)**.
- **[P1] 좌측 필름스트립 썸네일 카드 `tabindex="0"` 및 클릭 포커스 부여로 키보드 `Ctrl+C`/`Ctrl+V` 슬라이드 복사 활성화 (`js/navigation.js`)**.
- **[P1] `.pptstudio.zip` 불러오기 시 동영상/오디오 확장자별 MIME 타입 지정(Safari/Firefox 재생 안정화), 대소문자 무관 `.JSON` 지원 및 헤더 파란 점 보존 (`js/storage.js`)**.
- **[P2] 탭 삭제 후 중복 `onclick` 속성 제거 (`js/widgets.js`) 및 이벤트 위임 `e.stopPropagation` 중첩 래핑 제거 (`js/main.js`)**.

---

## [v5.0.3] - 2026-11-21 — 실사용 심층 결함 10건 추가 해결 (슬라이드·팝업 동영상 백그라운드 소리 누출 차단 · 편집 진입 시 키오스크 자동전환 중지 · 즉시 테스트 판서/숨김슬라이드/종료 정리 · 필름스트립 드래그 및 가져오기 목차 자동 재매핑 · 슬라이드 마스터 페이지 번호 자동 동기화 · KPI 부제목 저장 및 음수/단일 차트 안정화 · 부분 링크 바 레이아웃 보정)

### Fixed
- **[P0] 슬라이드 이동 및 플로팅 팝업 닫기 시 재생 중이던 `<video>`/`<audio>` 백그라운드 소리 누출 차단 (`js/navigation.js`, `js/floating-cards.js`)**.
- **[P0] 키오스크 자동 전환(`autoPlayKioskTimer`) 실행 중 편집 모드(`E`) 진입 시 자동 정지 처리 (`js/studio.js`)**: 편집 중 슬라이드가 자동으로 넘어가는 현상 방지.
- **[P0] 즉시 테스트 모드(`Alt+P`) 완성도 보강 (`js/navigation.js`, `js/studio.js`, `js/charts.js`, `js/media.js`)**:
  - 즉시 테스트 중 `P`(라이브 판서) 실행 시 편집 세션이 종료되지 않도록 수정하고, 숨김 슬라이드를 발표 모드와 동일하게 건너뛰도록 통일.
  - 즉시 테스트 종료 시 열려 있던 암전·판서·레이저 포인터·플로팅 라이트박스를 자동 정리하고, 찾기 치환·차트 삽입·연결선 추가 시 즉시 테스트를 안전하게 종료 후 편집 모드로 복귀.
- **[P1] 필름스트립 드래그 순서 변경(`onFilmstripDrop`), PPTX 가져오기(`triggerImportPptxFile`), 슬라이드 재사용(`importSelectedSlidesFromModal`) 시 목차 `[data-goto-slide]`·`#slide-N` 링크 자동 재매핑 및 재사용 슬라이드 내부 UID 중복 방지 (`js/navigation.js`, `js/export.js`)**.
- **[P1] 슬라이드 마스터 페이지 번호 자동 동기화 (`js/navigation.js`)**: `applySlideMasterConfig()`의 페이지 번호 요소에 `data-slide-number-token="true"`를 부여해 슬라이드 추가·삭제·이동 후에도 항상 정확한 `현재 / 전체` 번호 유지.
- **[P1] KPI 차트 부제목 인라인 수정 저장(`onChartSubInlineEdit`) 및 음수·단일 항목 꺾은선/도넛 차트 렌더링 안정화 (`js/charts.js`, `js/storage.js`)**.
- **[P1] 부분 하이퍼링크 바(`#inlineTextLinkBar`) `flex` 가로 정렬 복구 및 미선택 안내·적용 완료 토스트/자동 닫힘 보강 (`js/text-editor.js`)**.
- **[P2] 쇼케이스 데모 플로팅 카드 속성(`data-fc-opacity`, `data-fc-radius`, `data-fc-width-class`) 정규화로 편집기 100% 라운드트립 일치 (`js/storage.js`)**.

---

## [v5.0.2] - 2026-11-21 — 실사용 심층 감사 결함 10건 해결 (프로젝트 불러오기/복구 후 Undo 데이터 유실 방지 · 즉시 테스트 모드 완벽 격리 및 Esc/빌드스텝/목차 정상화 · 모바일 Before/After 스와이프 충돌 해결 · 잠긴 레이어/슬라이드 삭제·이동 보호 · PPTX Before/After 합성 & 숨긴 탭 차트 필터링)

### Fixed
- **[P0] 프로젝트 불러오기·가져오기·자동저장 복구 직후 `Ctrl+Z` 시 불러온 프로젝트 전체가 이전 덱으로 롤백·소실되던 치명 결함 수정 (`js/history.js`, `js/storage.js`)**: `restoreStageHtml(entryOrHtml, fromHistory)`가 외부 로드 시 증분 Diff 캐시를 무효화하여 직후 `saveHistorySnapshot()`이 반드시 새 `full` 기준 스냅샷을 기록하도록 교정.
- **[P0] `Alt+P` 즉시 테스트 모드에서 `Esc` 입력 시 편집 복귀 대신 발표 모드로 튕겨 나가던 위치 오류 수정 (`js/main.js`)**.
- **[P0] `Alt+P` 즉시 테스트 모드에서 클릭 순서 단계 등장(`data-build-order`) 미작동 수정 (`js/effects.js`)** 및 **`isActiveEditing()` 헬퍼 도입으로 즉시 테스트 중 편집 기능 누출 전면 차단 (`js/state.js`, `js/main.js`, `js/navigation.js`, `js/charts.js`, `js/media.js`)**: `Space` 슬라이드/스텝 진행 정상화(패닝 차단), `T`/`Tab`/더블클릭/우클릭/차트 편집 오버레이/미디어 업로드 창 차단, 목차 카드(`handleTocCardClick`) 점프 및 `B`/`W`/`L`/`P`/`C` 라이브 단축키 지원.
- **[P1] 모바일·태블릿에서 Before/After 슬라이더를 좌우로 드래그할 때 슬라이드가 넘어가던 제스처 충돌 해결 (`js/main.js`)**.
- **[P1] 잠긴 레이어(`data-layer-locked="true"`) 및 잠긴 슬라이드(`data-slide-locked="true"`)의 `Delete`·화살표 이동·슬라이드 삭제 보호 가드 추가 (`js/selection.js`, `js/navigation.js`)**.
- **[P1] PPTX·PNG 내보내기 시 비활성 탭 내부의 숨겨진 차트가 유령 차트로 출력되던 현상 차단 및 PPTX Before/After 50:50 분할 합성 출력 지원 (`js/export.js`)**.
- **[P2] `m.youtube.com`·`youtube.com/live/`·다중 쿼리(`watch?list=...&v=ID`) URL 임베드 파싱 강화 (`js/media.js`)** 및 **프로젝트/템플릿 로드 시 상단 헤더 상태 점 보존 (`js/storage.js`)**.

---

## [v5.0.1] - 2026-11-21 — 실사용 전수 감사 결함 13건 일괄 수정 (찾기 모달 재오픈 · 플로팅 팝아웃 배경막 잠김 · 발표 전용 차트 툴팁 보존 · 2D 벤토 다중 리사이즈/붙여넣기 · 카드 내 위젯 높이 리사이즈 · 즉시 테스트 편집잠금 · 발표자 뷰 상태 동기화)

### Fixed
- **[P0] 찾기/바꾸기(`Ctrl+F`) 모달 1회 닫기 후 영구 미오픈 수정 (`js/navigation.js`)**: `openFindReplaceModal()`이 `openModalSafe()`를 사용하도록 교정.
- **[P0] 플로팅 카드 스튜디오 `새 창 분리` 시 메인 창 배경막 영구 잠김 수정 (`js/floating-cards.js`, `js/export.js`)**: `openExternalFloatingCardWindow()` 및 `#tocModal` 닫기 경로를 `closeModalSafe()`로 통일.
- **[P0] 발표 전용 HTML 내보내기 시 라이브 차트 호버 툴팁(`#pptChartTooltip`) 증발 및 위젯 임시 상태 누출 수정 (`js/export.js`)**: 발표 전용 제거 목록에서 `#pptChartTooltip`을 제외하고 직렬화 전 3D 플립(`.is-editing-back`/`.is-flipped`)·핫스팟(`.is-open`) 임시 상태를 깔끔히 초기화.
- **[P0] 24×24 2D 벤토 그리드 다중 카드 선택 리사이즈 및 `Ctrl+V` 붙여넣기 붕괴 수정 (`js/selection.js`, `js/main.js`)**: `resizeMultipleGridCardsProportionally()`를 2D 좌표 기반(`applyBento2DCoords`)으로 업그레이드하고, 꽉 찬 2D 벤토 슬라이드에 카드 붙여넣기 시 기존 비대칭 배치를 유지한 채 선택/최대 카드를 자동 2분할.
- **[P1] 카드 내부 인터랙티브 위젯 높이 드래그 무시 및 위젯 편집 바 드래그 간섭 수정 (`js/main.js`)**: Case C 리사이즈에서 `flex: 0 0 auto`를 명시하고, `.iw-edit-bar`·`.chart-scenario-bar`·`.iw-tab-btn` 클릭 시 부모 드래그를 차단.
- **[P1] 편집 중 즉시 테스트(`Alt+P`) 차트 시나리오 전환 시 텍스트 편집 풀림 수정 (`js/charts.js`)** 및 **브랜드 키트 후 `라이트`/`다크` 단일 테마 전환 시 카드 배경색 자동 동기화 (`js/theme.js`)**.
- **[P2] 미정의 `closeOnboardingGuideModal()` 호출 교정 (`js/storage.js`), 찾기/글꼴 치환/`makeAllTextEditable` 위젯 크롬 보호 (`js/navigation.js`, `js/text-editor.js`), 발표자 뷰 `H`/`B` 실시간 동기화 및 팝아웃 창 `--accent-color` 동기화 (`js/navigation.js`, `js/studio.js`, `js/floating-cards.js`)**.

---

## [v5.0.0] - 2026-11-21 — 정식 대중 배포 릴리스: `new Function()` / `eval()` / `with()` 완전 제거(Zero-Eval 안전 선언형 이벤트 엔진) 및 Strict CSP 보안 달성

### Changed & Security Hardened
- **Zero-Eval 재귀 하강 안전 선언형 이벤트 엔진 도입 (`js/main.js`)**:
  - 기존 `initDeclarativeEventSystem()`의 `new Function()` 및 `with(ctx)` 호출을 완전히 제거하고, AST 캐싱 기반의 무-eval 안전 표현식 파서·실행기(`tokenizeSafeExpr`, `parseSafeProgram`, `evalSafeNode`, `evaluateSafeDeclarativeCode`)로 전면 교체.
  - `__proto__`, `prototype`, `constructor`, `eval`, `Function`, `setTimeout`, `setInterval` 접근을 엔진 레벨에서 차단해 프로토타입 오염 및 스크립트 탈출을 원천 봉쇄.
  - 기존 `data-on-*` 마크업, 150개 동적 위젯/차트 핸들러, 구버전 저장 파일(`.html`/`.json`/`.zip`) 및 듀얼 모니터 팝아웃 창과 100% 하위 호환 유지.
- **팝아웃 창 구형 `with(window.opener)` 문자열 래핑 제거 (`js/studio.js`, `js/floating-cards.js`)**: Zero-Eval 이벤트 위임이 `ctx = window` 및 `el.ownerDocument`를 자동 해석하도록 일원화.
- **빌드 타임 Strict CSP 자동 검증 게이트 추가 (`build.py`)**: `verify_strict_csp_compliance()`가 전체 15개 JS 모듈의 `new Function()`, `eval()`, `with()` 잔존 여부와 `index.html`의 인라인 `on*=` 속성을 자동 차단.
- **정식 `v5.0.0` 버전 메타데이터 및 Strict CSP 서버 배포 가이드 수록 (`index.html`, `js/state.js`, `README.md`, `docs/*`)**.

---

## [v5.0.0-rc1] - 2026-11-21 — 2단계 무손상 아키텍처 리팩터링 (`js/effects.js` 226KB 단일 모듈 → 4개 전문 모듈 분할: `theme.js` · `effects.js` · `floating-cards.js` · `widgets.js`)

### Refactored (Zero Logic Regression)
- **대형 단일 모듈 `js/effects.js` (4,676줄 · 226.2 KB) 4분할 구조 정비 (`index.html`, `build.py`, `js/theme.js`, `js/effects.js`, `js/floating-cards.js`, `js/widgets.js`, `docs/PROJECT_GUIDE.md`)**:
  - `js/theme.js` (41.3 KB · 40개 함수): 그라데이션·페이드 마스크, 블러, 슬라이드/카드 테마·배경, 통합 배경 컨트롤, 브랜드 키트 8종 & 커스텀 저장.
  - `js/effects.js` (30.1 KB · 28개 함수): 호버·클릭 반응형 모션 11종, 페이지 전환 트랜지션, 렌즈 화면비 전환, 등장 모션 14종 & 클릭 순서.
  - `js/floating-cards.js` (105.8 KB · 80개 함수): 인터랙티브 버튼 트리거·링크, 플로팅 팝업 카드 스튜디오(듀얼 창 분리·히스토리·내부 블록), 라이트박스.
  - `js/widgets.js` (43.7 KB · 26개 함수): Before/After 비교 슬라이더, 이미지 핫스팟 핀, 슬라이드 내 탭 전환 카드, 3D 앞/뒷면 플립 카드, 클릭 힌트.
  - 총 174개 함수와 26개 최상위 상태 변수를 100% 무손실 이관(누락 0건 · 중복 0건)하고 `build.py`의 `JS_FILES`(15개), `REQUIRED_PACKAGE_FILES`(28개), semver 프리릴리스(`v5.0.0-rc1`) 패키징 지원 추가.

---

## [v4.9.0] - 2026-11-21 — 발표자 뷰 실시간 시각 슬라이드 미리보기 · 단일 슬라이드 12종 레이아웃 갤러리 · 3D 플립/탭 카드 미디어·테마 고도화 · 영구 한/영 언어 전환 & 모바일 뷰어 최적화

### Added & Improved
- **발표자 뷰(`V`) 실시간 시각 미리보기 업그레이드 (`js/navigation.js`)**:
  - 기존 텍스트 요약 대신 메인 문서의 CSS/변수를 오프라인 1:1 복제해 **현재 슬라이드 및 다음 슬라이드의 실제 축소 화면**을 실시간 렌더링(`cloneSlideForPresenterPreview`, `fitPresenterPreviewFrames`).
  - 미리보기 내부 중복 ID 제거, 동영상/오디오 자동 음소거·일시정지(이중 재생 방지), `<iframe>` 안전 플레이스홀더 치환, 현재 시각 시계, 발표자 대본 글자 크기(`A-`/`A+`) 조절 추가.
- **단일 슬라이드 레이아웃 갤러리 6종 확장 (`index.html`, `js/navigation.js`)**: `+ 새 슬라이드` 목록에 **2D 비대칭 벤토형(1+2)**, **Before / After 비교형**, **제품·구조 핫스팟 소개형**, **KPI 대시보드 + 라이브 차트형**, **4단계 타임라인·로드맵형**, **대형 인용구·핵심 메시지형** 6종을 추가(총 12종)하고, 모든 신규 슬라이드에 `.slide-bg-layer`/`.slide-bg-overlay`를 기본 포함.
- **인터랙티브 위젯 디테일 고도화 (`js/effects.js`, `js/storage.js`, `css/slides.css`)**:
  - **3D 플립 카드**: 앞면·뒷면 개별 배경 테마 4종 순환(`cycleIwFlipFaceTheme`: 화이트/다크 네이비/포인트 블루/에디토리얼 크림) 및 양면 이미지 삽입(`uploadIwFlipFaceImage`) 지원.
  - **탭 전환 카드**: 활성 탭 내부에 이미지(`uploadIwTabImage`) 및 편집 가능한 라이브 차트(`insertChartIntoIwTab`) 삽입 지원.
- **영구 한/영 언어 전환 진입점 및 모바일 뷰어 최적화 (`index.html`, `css/slides.css`, `README.md`)**: 상단 바를 간결하게 유지하면서 `?` 단축키 도움말 모달과 `슬라이드·덱` 탭 내부에 `한국어 | English` 전환 버튼을 상시 제공하고, 767px 이하 모바일 발표 화면의 헤더·푸터·팝업 카드 여백을 최적화.

---

## [v4.8.1] - 2026-11-21 — Before/After 슬라이더 0%~100% 풀스윕 및 중앙 단추 제거 · 인터랙티브 위젯 카드 내부 삽입 전면 지원 · 한/영 언어 선택을 첫 실행 환영 화면으로 이동

### Fixed & Improved
- **Before / After 비교 슬라이더 좌우 끝(0% ~ 100%) 풀스윕 및 미니멀 분할선 개선 (`css/slides.css`, `js/effects.js`, `js/main.js`, `js/export.js`)**:
  - 중앙 원형 단추(`.iw-ba-handle`)를 제거해 군더더기 없는 수직 헤어라인 분할선으로 정돈.
  - 기존 `2%~98%` 제한을 해제하고 `window` 레벨 드래그 추적과 `0%`/`100%` 끝점 스냅, 인라인 `clipPath`/`left` 직접 갱신, 끝점 배지 자동 페이드를 적용해 좌우 끝까지 정확히 도달하도록 개선.
- **모든 인터랙티브 위젯의 카드 내부 배치 전면 지원 (`index.html`, `css/slides.css`, `js/effects.js`, `js/storage.js`)**:
  - 카드를 선택한 상태(`#ctxBar-shape`, `#ctxBar-text`)에서도 상단 바에서 즉시 **`+ 카드에 위젯`**과 **`▶ 즉시 테스트`**를 실행할 수 있도록 추가.
  - `모션·연동` 탭에 위젯 배치 위치 선택(`자동` / `선택 카드 내부` / `페이지 자유 배치`)을 추가하고, 이미 배치된 자유 위젯을 원클릭으로 카드 안으로 넣는 `카드로 넣기`(`embedWidgetIntoCard`) 기능 및 `.card-embedded-obj.ppt-interactive-widget` 정렬 보정 적용.
- **한/영 언어 선택을 상단 헤더에서 첫 실행 환영 화면(`#onboardingGuideModal`)으로 이동 (`index.html`, `js/studio.js`, `README.md`)**: 상단 바를 간결하게 유지하고 첫 진입 가이드에서 `한국어` / `English`를 바로 선택할 수 있도록 개선.

---

## [v4.8.0] - 2026-11-21 — 웹 네이티브 인터랙티브 위젯 4종(Before/After 비교 슬라이더 · 이미지 핫스팟 핀 · 슬라이드 내 탭 카드 · 3D 앞/뒷면 플립 카드) · 살아 움직이는 차트(호버 툴팁 · KPI 카운트업 · 시나리오 토글) · 편집 중 즉시 테스트(`Alt+P`) & 클릭 단서 힌트

### Added
- **Before / After 이미지 비교 슬라이더 위젯 (`js/effects.js`, `js/main.js`, `css/slides.css`, `css/print.css`, `js/export.js`)**: Before/After 이미지 개별 업로드, 마우스·터치 드래그 세로 분할 핸들, 50:50 초기화 및 PDF/PNG 50:50 분할 안전 폴백 지원.
- **이미지·다이어그램 핫스팟(인터랙티브 핀) 위젯 (`js/effects.js`, `js/main.js`, `css/slides.css`)**: 배경 이미지 교체, 번호 펄스 핀 추가/삭제, 편집 모드 핀 드래그 이동, 화면 경계 자동 반전 말풍선 팝오버 지원.
- **슬라이드 내 탭 전환 카드 & 진짜 앞/뒷면 3D 플립 카드 (`js/effects.js`, `js/main.js`, `css/slides.css`)**:
  - 탭 카드: 탭 추가/삭제 및 발표·편집 중 즉시 탭 전환과 인라인 편집 지원.
  - 3D 플립 카드: `preserve-3d` / `rotateY(180deg)` 3D 회전 전환 및 편집 모드 전용 앞/뒷면 거울반전 없는 평면 편집 전환 지원.
- **살아 움직이는 데이터 차트 & KPI 카운트업 (`js/charts.js`, `js/navigation.js`, `js/main.js`)**: 슬라이드 진입 시 KPI 숫자 카운트업 및 막대 성장 애니메이션, 차트 요소 호버 시 실시간 수치·비중 툴팁(`#pptChartTooltip`), 발표 중 클릭으로 모핑되는 `[기본|낙관적|보수적]` 시나리오 토글 지원.
- **편집 중 즉시 테스트 모드(`Alt+P`) & 인터랙션 클릭 단서 힌트 (`js/studio.js`, `js/main.js`, `css/studio.css`, `index.html`)**: 편집 세션을 종료하지 않고 상단 `▶ 즉시 테스트` 버튼 또는 `Alt+P`로 현재 슬라이드의 모든 위젯·호버·팝업·차트를 즉시 체험하고 `Esc`/`Alt+P`로 원복하는 워크플로우 구축.
- **5P 인터랙티브 쇼케이스 데모 확장 & 정화 필터/내보내기 호환 완비 (`js/storage.js`, `js/export.js`)**.

---

## [v4.7.0] - 2026-11-21 — 대중 배포 공식 기능 고도화 (원클릭 브랜드 키트 8종 & 커스텀 저장 · 오프라인 폰트 폴백 및 로컬 시스템 폰트 선택기 · 고충실도 차트/도형/그라데이션 PNG·PPTX 내보내기 · KO/EN 다국어 UI 전환 · 인터랙티브 쇼케이스 데모 & README.md)

### Added & Improved
- **브랜드 키트 & 슬라이드 마스터 프리셋 8종 + 커스텀 키트 저장 (`index.html`, `js/effects.js`, `css/studio.css`)**: 미니멀 화이트, 다크 테크, 에디토리얼 베이지, 코퍼레이트 네이비, 에메랄드 스튜디오, 옵시디언 골드, 코랄 크리에이티브, 슬레이트 모노 8종을 원클릭으로 현재 슬라이드 또는 전체 덱에 일괄 적용(`applyBrandKitPreset`)하고 내 디자인을 `localStorage`에 저장(`saveCustomBrandKit`) 지원. (`applyThemePreset('light'|'dark')` 버그도 함께 수정)
- **웹폰트 오프라인 폴백 스택 & 로컬 시스템 폰트 선택기 (`css/base.css`, `js/text-editor.js`, `index.html`)**: Windows·macOS·Linux별 고딕/명조/모노 오프라인 폴백 스택을 완비하고, 설치된 로컬 폰트 이름을 직접 입력·선택해 선택 영역(`applyCustomLocalFont`) 또는 전체 덱(`applyCustomLocalFontToDeck`)에 적용하는 입력 UI 추가.
- **고충실도 차트·도형·그라데이션·미디어 PNG/JPG 및 PPTX 내보내기 엔진 (`js/export.js`)**:
  - 6종 차트/표(`bar-v`, `bar-h`, `line`, `donut`, `kpi`, `table`)를 2× 고해상도 캔버스로 정밀 렌더링해 PNG/JPG 및 PPTX 슬라이드에 그대로 임베드(표는 셀 색상·정렬이 유지되는 네이티브 편집 가능 PPTX 표로 변환).
  - 자유 도형 10종을 네이티브 OOXML 프리셋 도형(`ellipse`, `triangle`, `diamond`, `star5`, `rightArrow` 등) 및 캔버스 경로로 출력하고, 문단별 실제 글꼴 크기·색상·굵기·정렬, 그라데이션 배경, 이미지 `cover`/`contain`·반전·필터를 충실히 반영.
- **다국어(KO / EN) UI 전환, 인터랙티브 쇼케이스 데모 덱 & `README.md` (`index.html`, `js/studio.js`, `js/storage.js`, `js/main.js`, `README.md`, `build.py`)**: 상단 `KO · EN` 버튼으로 단색 SVG 아이콘과 기능 계약을 유지한 채 한/영 UI를 즉시 전환하고, 2D 비대칭 벤토·라이브 차트·스포트라이트·플로팅 팝업 카드가 시연되는 5번째 쇼케이스 데모 템플릿과 경량 `README.md`(단축키 치트시트 포함)를 패키지에 포함.

---

## [v4.6.2] - 2026-11-21 — 편집 모드 좌측 노란 알약 버그 완전 제거 · 24×24 2D 벤토 그리드(비대칭 카드 리사이즈·빈 영역 자동배치·드래그 분할) 엔진 도입 · HTML Slide Tool 공식 리브랜딩

### Fixed & Added
- **편집 모드 진입 시 좌측 중앙 반투명 노란 알약 도형 노출 버그 완전 해결 (`css/base.css`, `index.html`)**: `#pptTailwindSafelist` 더미 요소에 포함된 `.card-embedded-obj`·`.ppt-slide-comment-badge`·`-rotate-90` 클래스가 편집 모드 전환 시 `.hidden`을 덮어쓰며 노출되던 근본 원인을 차단(`display: none !important; visibility: hidden !important; pointer-events: none !important`).
- **24×24 2D 벤토 그리드 엔진 도입 — 비대칭 2D 카드 레이아웃 자유 구성 (`css/slides.css`, `css/editor.css`, `js/selection.js`, `js/navigation.js`, `js/main.js`)**:
  - 모든 카드에 2D 좌표(`bentoStartCol`, `bentoSpan`, `bentoStartRow`, `bentoRowSpan`)와 `grid-template-rows: repeat(24, minmax(0, 1fr))`를 도입해 좌측 1개 세로 전체 + 우측 2개 상/하 분할 등 모든 비대칭 레이아웃을 버튼 추가 없이 직접 구성 가능.
  - **2D 경계선 연동 리사이즈**: 아래에 인접 카드가 없을 때 카드 하단을 위로 줄이면 옆 열의 전체 높이 카드는 유지된 채 해당 카드만 축소되며, 맞닿은 경계선을 드래그하면 해당 경계에 접한 카드 그룹만 정밀 연동.
  - **빈 2D 영역 자동 탐색 배치**: 축소로 생긴 빈 영역에서 `+ 카드`를 누르면 최대 빈 사각 영역을 자동 계산해 즉시 채워 넣으며, 카드 삭제 시 인접 카드가 빈자리를 깔끔하게 확장.
  - **직접 드래그 분할 & 빈 영역 이동**: 카드의 `✥ 드래그 이동` 핸들로 다른 카드의 상·하·좌·우 가장자리에 드롭하면 즉시 2분할 배치되고, 중앙에 드롭하면 위치 맞바꾸기, 빈 영역에 드롭하면 해당 빈 칸으로 이동(실시간 파란색 `#pptBentoDropPreview` 안내).
- **공식 브랜드 명칭 `HTML Slide Tool` 전면 전환 (`index.html`, `js/*.js`, `build.py`, `docs/*`)**: 브라우저 타이틀, 상단 헤더, 인스펙터 타이틀, 토스트 알림, 팝아웃 창, 문서, 단독실행본 및 배포 패키지명(`HTML_Slide_Tool_v4.6.2.zip`)을 모두 `HTML Slide Tool`로 통일(기존 314개 DOM ID·527개 UI 핸들러 불변성 계약 100% 유지).

---

## [v4.6.1] - 2026-11-21 — PPT Studio 하이브리드 3단 워크스페이스 도킹 전환 (기본 우측 고정 사이드바 + 원클릭 플로팅 전환 + 드래그 분리 + 듀얼 모니터 새 창 분리)

### Changed & Added
- **PPT Studio 기본 우측 고정 도킹(3단 워크스페이스) 통합 (`index.html`, `css/studio.css`, `js/studio.js`, `js/main.js`)**:
  - `#pptStudioPopup`을 `#pptWorkspaceShell` 내부 우측 슬롯으로 통합해 편집 모드 진입 시 슬라이드 캔버스를 전혀 가리지 않는 3단 워크스페이스(좌측 썸네일 · 중앙 캔버스 · 우측 인스펙터)를 기본 제공.
  - 타이틀 바 우측에 **도킹 ↔ 플로팅 전환 버튼(`#studioDockToggleBtn`)**을 추가하고, 도킹 상태에서 타이틀 바를 12px 이상 드래그하면 자연스럽게 플로팅 팝업으로 분리되는 스마트 드래그-오프 지원.
  - 도킹 상태 좌측 경계선(`col-resize`) 드래그로 사이드바 폭(`340px~560px`)을 조절하거나 접기(`—`)로 40px 슬림 레일로 축소할 때마다 중앙 슬라이드 배율(`updateStageViewportScale`)과 선택 오버레이(`positionSelectionOverlay`)를 실시간 동기화.
  - 듀얼 모니터 `새 창` 분리 및 `↙ 메인 복귀` 시에도 사용자의 도킹/플로팅 선호 상태(`localStorage`)와 저장된 사이드바 폭을 그대로 복원.
  - UI 불변성 계약(314개 기준 DOM ID · 527개 고유 UI 핸들러) 100% 통과 검증 완료.

---

## [v4.6.0] - 2026-11-21 — Figma UI3 / Canva / Keynote 레퍼런스 기반 무손상 프로 SaaS UI 디자인 시스템 전환 (314개 ID·527개 핸들러 불변성 자동 검증 게이트 · 단색 SVG 아이콘 통일 · 커스텀 폼 컨트롤 · 2D 그라데이션·마스크 방향 미리보기 위젯 · 선택 요소 연동 아코디언 패널)

### Changed & Added
- **빌드 타임 UI 불변성 계약 게이트 도입 (`build.py`)**: 기준 스냅샷의 314개 DOM ID 및 527개 고유 UI 이벤트 핸들러가 단 1건이라도 누락되거나 변경되면 빌드를 즉시 차단하는 `verify_ui_invariance_contract()` 검증기를 내장해 UI 개편 시 기능 먹통·버튼 증발을 원천 차단.
- **프로 SaaS 디자인 시스템 및 커스텀 폼 컨트롤 적용 (`css/studio.css`)**: Figma UI3·Canva·Keynote 레퍼런스를 반영해 정제된 무채색 서피스(`#FFFFFF`/`#F8F9FB`), 세그먼트 탭 바, 커스텀 4px 레인지 슬라이더, 라운드 컬러 스와치, 단정한 버튼 위계 적용.
- **UI 크롬 원색 OS 이모지 → 통일된 13px 단색 SVG 아이콘 교체 (`index.html`, `css/studio.css`)**: 상·하단 바, 빠른 삽입 바, 스튜디오 인스펙터, 플로팅 카드 편집기, 저장 모달, 우클릭 메뉴의 원색 이모지를 균일한 1.85px 선 굵기의 단색 벡터 아이콘(`.ui-ico`)으로 치환(사용자 삽입용 기호 팔레트는 원형 유지).
- **그라데이션 & 페이드 마스크 2D 시각 미리보기 위젯 대개편 (`index.html`, `css/studio.css`, `js/effects.js`, `js/main.js`)**: 기존 10px 실선 미리보기를 `68px` 체크무늬 투명 배경 + 실시간 회전 방향 화살표(`#gradDirectionArrow`) + 6방향 원클릭 프리셋(`0°~270°`) + `⇄ 반전` 버튼 + 풀폭 투명도 슬라이더 및 `%` 수치 표시로 확장.
- **선택 요소 연동 접이식 아코디언 인스펙터 (`index.html`, `css/studio.css`, `js/studio.js`, `js/selection.js`)**: 4개 탭의 16개 섹션을 접고 펼칠 수 있는 아코디언으로 구성하고, 캔버스에서 텍스트·이미지·차트·카드를 클릭하면 해당 섹션만 자동으로 펼쳐지도록 연동(상단 `모두 펼치기` 버튼 제공).

---

## [v4.5.3] - 2026-11-21 — Tailwind Play CDN 완전 제거 및 프로덕션 정적 CSS(`css/tailwind.built.css`) 전환 (100% UI 디자인 동일 유지 · 반응형 하단 바 복구 · 팝아웃 창 스타일 완비)

### Changed & Fixed
- **Tailwind Play CDN 스크립트(`cdn.tailwindcss.com`) 완전 제거 및 정적 빌드 CSS(`css/tailwind.built.css`) 전환 (`index.html`, `build.py`, `css/tailwind.built.css`)**:
  - `build.py`의 정적 Tailwind 컴파일러를 공식 Tailwind v3 계단식 레이어 순서(Preflight → Base Shorthands/Longhands → Display & `hidden` → Pseudo Variants(`hover:`, `focus:`, `focus-within:`, `group-hover:`, `disabled:`) → `@media sm` → `@media md` → `@media lg`)로 전면 재설계해 독립 파일 `css/tailwind.built.css`로 생성.
  - 기존 `build.py`의 알파벳 정렬로 인해 `md:`/`lg:` 규칙이 기본 모바일 클래스에 덮어써지던 버그와 `disabled:opacity-40`/`group-hover:` 미적용 버그, 누락 유틸리티(`border-emerald-300`, `text-amber-700`, `overflow-x-hidden`, `py-0.2`)를 모두 해결.
  - `build.py --test` 게이트에 `cdn.tailwindcss.com` 잔존 차단 검증을 추가하고 배포 패키지 필수 파일(24개)에 `css/tailwind.built.css`를 편입.
- **반응형 숨김 요소(`hidden sm:flex` 진행률 바, `hidden md:inline` 상단 부제목, `hidden md:inline-flex` 확대/축소 바, `hidden sm:inline-flex` 전체화면 버튼) 표시 복구 (`css/base.css`)**: 반응형 표시를 덮어쓰던 `.hidden { display: none !important; }` 규칙을 제거하고 정적 Tailwind 레이어 캐스케이드로 정상화.
- **팝아웃 창(`🖥 새 창 분리`) 정적 CSS 동기화 및 단독 저장본 중복 제거 (`js/state.js`, `js/studio.js`, `js/effects.js`, `js/export.js`)**: `cloneDocumentStylesToPopup()` 헬퍼로 외부 `<link>` 및 인라인 `<style>`을 팝아웃 창에 오프라인에서도 100% 복사하도록 개선.

---

## [v4.5.2] - 2026-11-21 — 단독 HTML 저장본 CSS 우선순위·화면비 영속 복원 · 플로팅 카드 히스토리 누락 방지 · 이미지 비율 1.5배 왜곡 수정 · 차트/표 셀 스타일 시프트 & 양방향 정렬 · 라이브 판서 터치 지원

### Fixed
- **플로팅 카드 저장/편집 시 증분 히스토리 누락 및 Undo 시 유실 방지 (`js/history.js`, `js/effects.js`)**: `saveHistorySnapshot()`이 `#pptFloatingCardsStore` 변경 여부(`__lastCommittedStoreHtml`)를 함께 추적해 플로팅 카드 변경 시 항상 전체 스냅샷과 미저장 상태를 기록하도록 수정.
- **단독 실행 HTML 저장본(`4:3`·`9:16`) 재실행 및 HTML 가져오기 시 화면비·포인트컬러·상/하단 바 색상 영속 복원 (`js/state.js`, `js/main.js`, `js/storage.js`)**.
- **단독 HTML 저장본의 Tailwind CSS 계단식 우선순위 역전 해결 (`js/export.js`)**: `inlineAssetsForStandaloneHTML()`이 컴파일된 Tailwind 스타일을 `<head>` 맨 끝이 아닌 `css/base.css` 직전에 삽입해 앱 전용 스타일(`slides.css`, `studio.css`, `print.css`)이 덮어써지지 않도록 수정하고 `.is-selected` 및 발표 전용 `#pptxFileImporter`를 정리.
- **자유 배치 이미지 업로드 및 `원본비율` 복원 시 스테이지 축소 비율에 따른 세로 1.5배 왜곡 해결 (`js/media.js`)**: 논리 픽셀(`offsetWidth`)을 논리 높이(`clientHeight || LOGICAL_STAGE_HEIGHT`) 기준으로 계산하도록 교정.
- **차트·표 편집 정확도 3종 개선 (`js/charts.js`)**: 표 행·열 삽입/삭제 시 `cellStyles`와 `rowHeights` 자동 시프트, `removeChartDataRow(idx)` 정확 행 삭제, 비테이블 차트에서도 `+아래행`/`-행삭제` 연동 및 `▲정렬` 오름/내림차순 자동 토글 지원.
- **라이브 발표 도구 완성도 보강 (`js/navigation.js`, `js/selection.js`)**: 화면 암전 중앙 정렬(`openModalSafe`), 태블릿 터치/스타일러스 라이브 판서, 슬라이드 숨김·잠금 시 좌측 필름스트립 아이콘 즉시 동기화.

---

## [v4.5.1] - 2026-11-21 — 대중 배포 품질 고도화 & 실사용 결함 8건 일괄 수정 (스타터 템플릿 전 카드 컨트롤 복원 · 화면비/포인트컬러 영속 저장 · 자유요소 px/auto 리사이즈 폭발 수정 · Delete/그리드분리 자동 재배분 · 필름스트립 목차 링크 자동 보정 · PPTX 가져오기 스트림/노트/경로 보강 · 연결선 다중 비율 대응)

### Fixed
- **4종 스타터 템플릿(총 31개 카드) 상단 `[◀ 이전 | ▶ 다음 | ×]` 편집 컨트롤 누락 및 플로팅 카드 저장소 유실 해결 (`js/storage.js`)**: `ensureCardControlsOnContainer()`를 도입해 템플릿 적용 시 모든 카드에 편집 컨트롤과 호버 속성을 자동 주입하고 `#pptFloatingCardsStore`를 보존.
- **작업함·`.json`·`.pptstudio.zip`·IndexedDB 자동저장 시 화면비(`4:3`/`9:16`) 및 포인트 컬러(`--accent-color`) 유실 해결 (`js/storage.js`)**: `captureDeckMetaPayload()` / `restoreDeckMetaPayload()`로 저장·복원 시 화면비와 브랜드 색상이 완벽히 유지되도록 개선.
- **링크 버튼·자동폭 텍스트박스 등 `px`/`fit-content`/`auto` 자유 요소 리사이즈 시 크기 폭발(점프) 해결 (`js/main.js`, `js/selection.js`)**: 인라인 `%`가 아닌 요소는 실제 렌더링 경계(`getBoundingClientRect`) 기준으로 초기 비율을 계산하고, 리사이즈 중 `inspPxW`/`inspPxH` 및 연결선을 실시간 동기화하며 픽셀 직접 입력 시에도 `🔒 비율잠금`을 반영.
- **`Delete` 키·오버레이 `삭제`·`⤢ 그리드 분리` 실행 시 남은 카드 높이 자동 재배분 및 0카드 빈 그리드 숨김 (`js/selection.js`)**.
- **필름스트립·레이아웃 슬라이드 추가/복제/붙여넣기/삭제 시 목차 링크(`data-goto-slide`) 자동 동기화 및 복제 슬라이드 내부 UID(차트·연결선) 충돌 방지 (`js/navigation.js`)**.
- **`.pptx` 가져오기 안정화 (`js/export.js`)**: 대용량 DEFLATE 해제를 논블로킹 스트림 파이프로 교체하고, 선행 슬래시(`/ppt/media/...`) 이미지 경로 정규화·발표자 노트 가져오기·가져온 카드 컨트롤 및 배경 레이어 자동 포함.
- **자석 연결선(`svg.ppt-connectors-layer`) `4:3`·`9:16` 화면비 동적 `viewBox` 대응 (`js/media.js`, `js/state.js`)** 및 삭제된 하단 바 버튼 잔여 DOM 참조 정리 (`js/navigation.js`).

---

## [v4.5.0] - 2026-11-21 — 대중 배포 공식 전환(범용 4P 스타터 덱 및 개인 과제/브랜드 잔존 완전 제거) · 증분 슬라이드 히스토리 엔진 · 실사용 치명 결함 8건 전면 해결

### Changed (대중 배포용 구조 개선)
- **특정 개인 과제·브랜드 강결합 완전 해소 (`index.html`, `js/charts.js`, `js/navigation.js`, `js/storage.js`, `js/studio.js`, `js/effects.js`, `build.py`)**: `<title>`, 상단 헤더, 초기 덱, 기본 차트/비교표 샘플 데이터, 신규 카드 플레이스홀더, 팝아웃 창 이름 및 `build.py` 출력 파일명에서 개인 성명·특정 수업명·특정 제품명을 완전히 제거하고 범용 4장 스타터 덱으로 전환.
- **슬라이드 단위 증분(Diff) 히스토리 스냅샷 엔진 도입 (`js/history.js`)**: 단일 슬라이드 수정 시 전체 덱이 아닌 변경된 1개 슬라이드만 경량 Diff 스냅샷으로 저장해 대규모 덱(30~50장 이상)에서의 Undo/Redo 메모리 점유와 타이핑 지연을 대폭 개선.

### Fixed (실사용 결함 8건 수정)
- **편집 모드 `Ctrl+C`/`Ctrl+V` 캡처 리스너가 슬라이드 간 요소 복사·외부 클립보드 붙여넣기를 가로채던 치명 결함 수정 (`js/main.js`)**: 슬라이드 단위 복사/붙여넣기 단축키가 좌측 필름스트립(`#pptLeftFilmstrip`) 포커스 시에만 작동하도록 분리.
- **팝아웃 스튜디오 & 플로팅 카드 스튜디오의 `↙ 메인 창으로 복귀` 버튼 먹통 수정 (`js/studio.js`, `js/effects.js`)**: 선언형 위임 컨텍스트(`with(window)`)와 충돌하던 `window.opener.` 접두어를 제거해 복귀 버튼이 정상 작동하도록 수정.
- **`PNG`/`JPG` 이미지 내보내기 텍스트 2배 비대화(이중 스케일링)·화면비 미반영·하이라이트 텍스트 누락 해결 (`js/export.js`)**.
- **`PPTX` 내보내기 시 4:3/9:16 화면비 미반영 및 복합 카드(이미지+텍스트)의 텍스트 소실 해결 (`js/export.js`)**.
- **`Esc` 키 입력 시 열려 있는 모달을 닫지 않고 편집 모드를 종료하던 버그 해결 (`js/main.js`)**: 11개 전체 모달 중 열린 창을 최우선으로 닫은 뒤 선택 해제 → 편집 종료 순으로 동작하도록 교정.
- **자유 텍스트박스 내 `Enter` 줄바꿈 시 박스 높이가 스테이지 축소 비율만큼 과도 팽창하던 버그 해결 (`js/main.js`)**.
- **저장 모달(`openSaveModal`) 파일명 자동 동기화 & 전체 모달 `openModalSafe`/`closeModalSafe` 100% 통일 (`js/export.js`, `js/navigation.js`, `js/storage.js`)**.
- **표 셀 `Tab` 이동 시 열/행 리사이저 핸들이 선택 범위에 포함되지 않도록 보완 (`js/main.js`)**.

---

## [v4.4.13] - 2026-11-20 — 오직 발표용 HTML 내보내기 시 편집 UI(상단 빠른 삽입 바·좌측 필름스트립·저장/댓글/단축키 버튼) 잔존 현상 해결

### Fixed
- **발표 전용 HTML(`saveModifiedHTML(true)`) 내보내기 시 편집 전용 UI 잔존 해결 (`js/export.js`)**:
  - 발표 전용 직렬화 제거 목록에 상단 빠른 삽입 컨텍스트 바(`#pptContextualTopBar`)와 좌측 슬라이드 썸네일 필름스트립(`#pptLeftFilmstrip`)을 추가.
  - `v4.4.9`의 선언형 이벤트 속성(`data-on-click`) 전환 이후 매칭되지 않던 `저장`, `💬 댓글`, `?` 단축키 버튼 제거 셀렉터를 `button[data-on-click*="..."]`까지 확장해 발표 전용 파일에서 모든 편집 UI가 완전히 제거되도록 수정.

---

## [v4.4.12] - 2026-11-20 — 호버 그림자 기준(박스기준 vs 내용기준) 옵션 복원 · 신규 슬라이드·새 카드 반응형 모션 정규화 · PDF 인쇄(1440×810 1:1 비율 및 데스크톱 그리드 고정) 일치화

### Fixed & Restored
- **호버 그림자·애니메이션 기준 옵션(`박스기준` vs `내용기준` · `단어해제` · `그룹연동` · `일괄적용`) 복원 (`index.html`, `css/slides.css`, `js/effects.js`)**: `✨ 모션·연동` 탭에 5버튼 기준 설정 바를 복원하고, `[data-fx-basis="content"]:not([data-fx-shadow="off"]):hover` 규칙을 보완해 `내용기준` 선택 즉시 텍스트·도형·투명 이미지 윤곽선을 따라 드롭 섀도우가 적용되도록 개선.
- **새 발표 자료·새 슬라이드·새 카드·인라인 요소의 반응형 모션 오류 수정 (`js/effects.js`, `js/selection.js`, `js/main.js`, `js/navigation.js`, `js/storage.js`, `css/slides.css`)**:
  - 신규 템플릿·신규 슬라이드의 카드에 `hover-reactive` 기본 속성을 자동 초기화하고, `display: inline` 텍스트 요소에 반응형 모션 적용 시 `inline-block`으로 자동 전환해 `transform` 애니메이션이 누락되지 않도록 보완.
  - 위치 이동 오프셋(`data-offset-x/y`)이 적용된 요소에서 `hover-lift`·`hover-zoom`·`hover-tilt` 실행 시 기존 오프셋(`--el-tx`, `--el-ty`)과 합성되어 제자리로 튀는 현상을 방지.
- **PDF 인쇄 시 화면과 레이아웃·요소 뒤틀림 해결 (`css/print.css`, `js/state.js`, `js/export.js`)**: 인쇄 용지 및 슬라이드 크기를 논리 캔버스와 동일한 `1440px × 810px` (`15in × 8.4375in`)로 일치시키고, `@media print` 내부에 상단·좌측 워크스페이스 바 숨김 및 데스크톱 다단 그리드(`md:grid-cols-*`, `md:col-span-*`) 고정 규칙을 추가하여 화면과 1:1 동일한 PDF가 출력되도록 교정.

---

## [v4.4.11] - 2026-11-20 — 외부 앱·다른 탭·슬라이드 간 범용 복사/붙여넣기 엔진 완성 · 카드 붙여넣기 자동 높이 재배분 · 레이아웃 전환(1단/2단/3단) 상태 초기화 및 0카드 슬라이드 지원

### Fixed & Added
- **외부 텍스트·이미지·다른 탭·다른 슬라이드 간 범용 복사/붙여넣기 지원 (`js/selection.js`, `js/main.js`, `index.html`)**:
  - 브라우저·메모장·Word·Notion 등 외부에서 복사한 텍스트를 슬라이드 위에서 `Ctrl+V` 또는 우클릭 `붙여넣기` 할 때 편집 가능한 텍스트 상자(또는 선택 카드 내부 텍스트 블록)로 자동 삽입(`insertExternalPastedTextToSlide`)되도록 개선.
  - 내부 요소 복사(`copySelectedElements`) 시 `localStorage`(`ppt_studio_shared_clipboard_v1`)와 시스템 클립보드에 동시 동기화하여 서로 다른 PPT Studio 탭/창 간 복사·붙여넣기 및 외부 앱으로의 텍스트 붙여넣기를 지원.
  - 복사한 `.slide-card`를 다른 슬라이드에 붙여넣을 때 `rebalanceSlideGridLayout()`을 자동 호출해 슬라이드 하단 경계를 넘지 않도록 보정.
- **레이아웃 전환(`1단`·`2단`·`3단`) 카드 높이·여백 초기화 및 빈 슬라이드 카드 자동 생성 (`js/navigation.js`)**: `setSlideLayout()` 실행 시 이전 다중 행에서 설정된 고정 높이와 상단 여백을 초기화하고, 0카드 빈 슬라이드에서도 선택한 단 수만큼 카드를 자동 생성하도록 개선.
- **팝아웃 스튜디오 & 플로팅 카드 스튜디오 복귀 버튼(`data-on-click`) 및 모달 표시 상태 동기화 (`js/studio.js`, `js/effects.js`)**.

---

## [v4.4.10] - 2026-11-20 — 선언형 이벤트 위임 초기화 순서(TDZ) 치명 결함 수정 · 동적 생성 버튼 자동 ARIA 라벨 부여 · 패딩 슬라이드 다중 카드 높이 재계산 보정

### Fixed
- **선언형 이벤트 위임 시스템 초기화 순서(Temporal Dead Zone) 수정 (`js/main.js`)**: `initDeclarativeEventSystem()` 호출 시점에 `DECLARATIVE_EVENT_TYPES` 상수가 미초기화 상태(`ReferenceError`)로 참조되던 버그를 해결해 모든 `data-on-*` 버튼·입력 핸들러가 즉시 정상 작동하도록 복구.
- **동적 생성 버튼 자동 접근성 라벨(`aria-label`, `title`) 및 외부 링크 `rel` 보강 (`js/main.js`)**: `upgradeInlineOnAttributesToData()` 및 `MutationObserver`가 런타임에 생성되는 최근 색상 스와치, 레이어 목록, 카드 컨트롤 버튼 등 모든 동적 `<button>`에 한국어 `aria-label`과 `title`을 자동 부여하도록 개선.
- **패딩 슬라이드 내 다중 카드 추가/복제 시 슬라이드 상·하단 여백 반영 (`js/selection.js`)**: `rebalanceSlideGridLayout()`이 슬라이드 자체 상·하단 패딩(`slidePadY`)을 차감한 유효 높이를 기준으로 행 높이를 분배하도록 보정.

---

## [v4.4.9] - 2026-11-20 — 보안·안정성·접근성·빌드 무결성 전면 고도화 (외부 임베드 호스트 화이트리스트 및 클릭 동의 게이트 · 첫 크래시 자동저장 영구 보존 · 인라인 on* 핸들러 0건 CSP 선언형 위임 전환 · 전 버튼 ARIA 라벨 및 다이얼로그 role 완비 · 단독 저장본 js/bundle-data.js 참조 제거 · build.py Python 경고 0건 · execCommand/queryCommandState 현대화)

### Security & Stability
- **외부 `<iframe>` 호스트 화이트리스트 및 클릭-투-로드 보안 게이트 (`js/storage.js`, `js/media.js`)**: 가져온 파일 내 `data-safe-embed="true"` 속성이 있더라도 신뢰된 임베드 도메인(YouTube, Vimeo, Google Docs/Drive, Figma, CodePen, CodeSandbox, Miro) 이외의 외부 HTTPS 사이트는 자동 로드를 차단하고 사용자 클릭 승인 카드(`loadDeferredEmbedIframe`)로 전환하도록 보안 강화.
- **자동 저장 배너 무시 후 편집·재접속 시 첫 크래시 작업 영구 보존 (`js/storage.js`)**: `AUTOSAVE_FIRST_CRASH_KEY` 전용 슬롯을 도입해 사용자가 복구 배너를 무시하고 새 편집·재접속을 반복하더라도 최초 미저장 크래시 작업이 덮어씌워지지 않도록 해결하고, `visibilitychange`/`pagehide` 즉시 저장 및 800ms 디바운스 적용.
- **인라인 `on*=` 핸들러 전면 제거(`0건`) 및 CSP 대응 선언형 이벤트 위임 엔진 도입 (`index.html`, `js/main.js`, `js/studio.js`, `js/effects.js`)**: `index.html`의 780여 개 인라인 이벤트 속성을 `data-on-*` 선언형 속성과 `initDeclarativeEventSystem()` 위임 디스패처로 전환.
- **저장본 HTML 내 `js/bundle-data.js` 불필요 참조 제거 및 다회 재저장 지원 (`js/export.js`)**: `inlineAssetsForStandaloneHTML()`에서 `script[src="js/bundle-data.js"]`를 제거해 폴더 외부에서 단독 실행 시 발생하던 콘솔 로드 오류를 해결하고, `collectLiveInlinedAssets()`로 저장본 재저장 지원.

### Accessibility, Modernization & Build Quality
- **접근성(ARIA) 전수 보강 (`index.html`)**: 모든 버튼에 한국어 `aria-label`과 `title` 툴팁을 부여하고, 11개 모달에 `role="dialog"`·`aria-modal="true"`, 컨텍스트 메뉴에 `role="menu"`/`menuitem`, 탭 바에 `role="tablist"`/`tab`, 토스트에 `role="status"`·`aria-live="polite"` 적용.
- **`build.py` Python `SyntaxWarning`/`DeprecationWarning` 0건 해결 (`build.py`)**: 245·247번 줄 정규식 이스케이프 문자열을 raw string(`r"..."`)으로 교정해 `python3 -W error` 통과.
- **`target="_blank"` `rel="noopener noreferrer"` 강제 및 폐기 예정 `execCommand`/`queryCommandState` 현대화 (`js/text-editor.js`, `js/effects.js`, `js/main.js`, `js/storage.js`)**.

---

## [v4.4.8] - 2026-11-20 — 실사용 핵심 결함 4건 수정 (새 슬라이드·새 카드 폰트 크기/색상 즉시 적용 · .json 저장 버튼 복원 · 표 하단 불필요 스크롤바 제거 · 새 레이아웃 슬라이드 카드 컨트롤 추가)

### Fixed
- **새 슬라이드에서 새 카드의 폰트 크기 및 다크 테마 글자 색상 미적용 해결 (`css/slides.css`, `js/text-editor.js`, `index.html`)**: `css/slides.css`의 `.md:text-*` 및 `.has-multi-rows` 규칙에 `:not([style*="font-size"])`를 적용하고 `setSelectedFontSizePx()`/`adjustSelectedFontSize()`가 `setProperty('font-size', ..., 'important')`로 설정하도록 수정해 새 슬라이드·새 카드 및 드래그 선택 텍스트 모두 즉시 크기가 변경되도록 복구.
- **`.json` 작업 파일 저장 버튼 복원 (`index.html`)**: `📑 슬라이드·덱` 작업함 영역과 하단 `저장` 모달(`#saveChoiceModal`) 양쪽에 `⬇ JSON 백업` / `⬇ JSON 저장`(`exportProjectJsonFile()`) 버튼을 복원해 `.json`과 `.pptstudio.zip` 저장을 모두 지원.
- **표 하단 가로 스크롤바 발생 해결 (`css/slides.css`, `js/charts.js`)**: 편집 모드 열/행 리사이저 핸들의 외곽 돌출(`right: -3px`, `bottom: -3px`)을 내부 경계(`0px`)로 정렬하고 표 래퍼에 `overflow-x-hidden`을 적용해 불필요한 하단 스크롤바 제거.
- **새 레이아웃 슬라이드(`addSlideWithLayout`) 카드 상단 `[◀ 이전 | ▶ 다음 | ×]` 컨트롤 추가 (`js/navigation.js`)**.

---

## [v4.4.7] - 2026-11-19 — 전체 탭 및 플로팅 카드 팝업 스튜디오 UI 원상 복구 (Tailwind 런타임 및 Preflight CSS 리셋 복원 · PPT STUDIO 상단 헤더 겹침 해결)

### Fixed
- **전체 탭 및 플로팅 카드 팝업 스튜디오 UI 스타일 변경 복구 (`index.html`, `build.py`)**: `v4.4.5`에서 외부 Tailwind 스크립트를 제거하면서 Tailwind Preflight CSS 리셋(`button`, `input`, `select`, `h1~h4`, `p`, `ul` 기본 여백·글꼴 초기화) 및 동적 유틸리티가 빠져 모든 탭과 모달 버튼 크기가 변형되던 문제를 해결. 온라인용 Tailwind 런타임과 오프라인용 Preflight 포함 정적 폴백 CSS를 동시에 제공해 온·오프라인 모두 원래 디자인 그대로 렌더링되도록 복원.
- **`PPT STUDIO` 타이틀 바 버튼 겹침 해결 (`index.html`, `css/studio.css`, `js/studio.js`)**: 스튜디오 폭을 `424px`로 조정하고 헤더 좌·우측 그룹에 `shrink-0`을 적용해 `🖥 새 창 분리`·`간편 모드` 버튼과 우측 아이콘 버튼이 겹치지 않고 한 줄에 깔끔하게 정렬되도록 수정.

---

## [v4.4.6] - 2026-11-19 — 하단 바 발표 도구 버튼 정리(단축키 전용 전환) · PPT STUDIO 헤더/인스펙터 줄바꿈 깨짐 수정 · .hidden 강제 규칙 확립

### Changed & Fixed
- **하단 컨트롤 바(`#appBottomFooter`)에서 레이저·판서·암전·발표자 뷰 버튼 제거 및 단축키 전용화 (`index.html`, `js/main.js`)**: 하단 바 UI를 간결하게 정리하고 발표 모드 단축키(`L`: 레이저 포인터, `P`/`C`: 라이브 판서/지우기, `B`/`W`: 블랙/화이트 암전, `V`: 듀얼 모니터 발표자 뷰)로 동작하도록 통합.
- **우측 `PPT STUDIO` 타이틀 바 및 인스펙터 버튼 줄바꿈 깨짐 수정 (`index.html`, `css/studio.css`, `js/studio.js`)**: 스튜디오 기본 폭을 `408px`로 최적화하고 헤더·인스펙터 버튼에 `whitespace-nowrap shrink-0`을 적용해 2~3줄로 찌그러지던 라벨을 모두 한 줄로 정렬.
- **`.hidden { display: none !important; }` 전역 우선순위 강제 (`css/base.css`)**: 편집 모드 전환 시 숨김 처리된 오버레이나 툴바가 의도치 않게 노출되는 가능성을 원천 차단.

---

## [v4.4.5] - 2026-11-19 — 대중 배포 아키텍처 고도화 마감판 (플로팅 카드 에디터 스코프 오류 수정 · 외부 Tailwind CDN 완전 제거 및 정적 컴파일 CSS 일원화 · .pptstudio.zip 포터블 미디어 패키지 백업/복원 · 태블릿/터치 브리지 · 1-클릭 빈 캔버스 시작 · build.py --test 자동 검증 스위트)

### Fixed
- **플로팅 팝업 카드 스튜디오(`openFloatingCardEditor`) 종료 시점 `ReferenceError` 수정 (`js/effects.js`)**: `const editor = $fc('fcRichBodyEditor')` 선언을 `try` 블록 외부 상단으로 이동해 `setTimeout` 자동 포커스 시 블록 스코프 참조 오류가 발생하지 않도록 수정.

### Changed & Added (대중 배포용 구조 개선 5종)
- **외부 Tailwind CDN 스크립트 완전 제거 및 100% 정적 컴파일 CSS 일원화 (`index.html`, `build.py`)**: 빌드 시점 컴파일러(`compile_single_utility`)에 전체 유틸리티 매트릭스를 완비하고 외부 CDN 스크립트를 제거해 초기 렌더링 FOUC(스타일 깜빡임) 및 오프라인 네트워크 지연 제거.
- **포터블 프로젝트 아카이브(`.pptstudio.zip`) 내보내기 및 미디어 일괄 복원 (`js/storage.js`, `index.html`)**: 슬라이드 JSON과 첨부 동영상·오디오 바이너리를 하나의 `.pptstudio.zip`으로 저장(`exportProjectPackageZip`)하고, 불러오기 시 모든 미디어 블롭을 자동 복원(`initStorageListeners`)하도록 개선.
- **태블릿·터치 스크린 입력 브리지 (`js/main.js`)**: `initTouchPointerBridge()`를 추가해 아이패드·갤럭시 탭·터치 노트북에서 요소 드래그 이동, 8방향 리사이즈 핸들, 진행률 바 스크러빙을 지원.
- **범용 1-클릭 빈 캔버스 시작 (`index.html`, `js/storage.js`)**: 상단 컨텍스트 바에 `✨ 빈 캔버스 시작`(`startBlankUniversalDeck`) 버튼을 배치해 일반 사용자가 즉시 1장짜리 깨끗한 백지에서 작업을 시작할 수 있도록 개선.
- **원클릭 자동 회귀 테스트 게이트 (`build.py --test`)**: JS 구문/어휘, DOM ID 유일성, 이벤트 핸들러 매핑, 번들 동기화 및 필수 파일 구성을 한 번에 검증하는 `--test` 모드 추가.

---

## [v4.4.4] - 2026-11-19 — 전수 코드 점검 발견 경미 결함(P2) 2건 마감 (보조 모달 3종 openModalSafe 통일 · 구형 WebKit 정규식 유니코드 이스케이프 호환성 확보)

### Fixed
- **보조 모달 3종(`slideSorterModal`, `reuseSlidesModal`, `slideCommentsModal`) 표시 상태 통일 (`js/navigation.js`)**: `openSlideSorterModal()`, `openReuseSlidesModal()`, `openSlideCommentsPanel()` 및 각 닫기 함수가 `openModalSafe()` / `closeModalSafe()`를 통해 `style.display = 'flex'`를 명시적으로 제어하도록 통일해 CSS 클래스 우선순위 충돌 가능성을 제거.
- **백업 파일명 정제 정규식 구형 WebKit 엔진 호환성 보강 (`js/storage.js`)**: `exportProjectBackupJson()` 내부 한글 범위 표기 `/[^a-zA-Z0-9가-힣_-]/g`를 `/[^a-zA-Z0-9\uAC00-\uD7A3_-]/g` 유니코드 이스케이프로 교체해 구형·신형 모든 브라우저 엔진에서 경고 없이 파싱되도록 개선.

---

## [v4.4.3] - 2026-11-19 — 그래프·차트·표 삽입 구문 오류(js/charts.js) 근본 해결 · 카드 우측 핸들(e) 좌측 고정 및 연동 리사이즈 ON/OFF 복원 · 엄격 정규식/문자열 빌드 게이트 강화

### Fixed
- **그래프·데이터 표·비교표 삽입 무반응 근본 원인 해결 (`js/charts.js`)**: `parseDelimitedTableText()` 내부 정규식·문자열 리터럴에 섞여 있던 리터럴 개행 구문 오류(`SyntaxError`)를 복구해 `insertChartOrTable()`, `getDefaultChartData()`가 브라우저에 정상 로드되도록 수정. PPT Studio(페이지 및 카드 내부)와 플로팅 카드 팝업 스튜디오(`+ 차트/표 삽입`) 양쪽 모두 정상 삽입됨을 확인.
- **카드 우측 핸들(`e`) 리사이즈 오작동 및 좌측 동시 확장 해결 & `연동리사이즈` ON/OFF 복원 (`js/selection.js`, `index.html`)**: 우측 핸들 조작 시 좌측 시작 열(`initStart`)을 고정해 우측 경계만 이동하도록 수정하고, 우측 끝 카드의 리사이즈와 `🔗 연동리사이즈` 체크박스(`toggleCardLinkedResize`)를 복원.

### Added
- **엄격 정규식·문자열 리터럴 구문 검증기 강화 (`build.py`)**: `verify_js_lexical_syntax()`가 줄바꿈이 포함된 미종료 정규식(`/...`)과 문자열 리터럴을 즉시 차단하도록 업그레이드.

---

## [v4.4.2] - 2026-11-19 — 카드 추가·복제 시 슬라이드 하단 이탈 방지(자동 행 높이 재배분) · 그래프/데이터 표 페이지 및 카드 내 삽입 지원 · 플로팅 카드 팝업 드래그/개별 텍스트 폰트 크기·색상 적용 수정

### Fixed
- **카드 추가(`+ 카드`) 및 복제(`복제`) 시 페이지 밖으로 이탈하는 현상 해결 (`js/selection.js`, `js/navigation.js`, `css/slides.css`)**:
  - 단일 카드가 남아 있을 때(`span 16`) 강제로 `24`컬럼 전체 폭으로 확장하던 규칙을 교정해 남은 열 공간에 새 카드가 나란히 배치되도록 수정.
  - `rebalanceSlideGridLayout()` 및 다중 행 자동 여백 축소(`.slide-grid-body.has-multi-rows`)를 도입하고 `duplicateSelectedElement()`에서도 동일하게 호출해, 카드를 여러 번 추가하거나 복제해도 슬라이드 하단 경계를 절대 벗어나지 않도록 보장.
- **그래프·데이터 표·비교표 6개 버튼 삽입(`세로막대`·`가로막대`·`꺾은선`·`도넛`·`비교표`·`KPI`) 페이지 자유배치 및 카드 내 삽입 모두 정상화 (`js/charts.js`, `index.html`)**:
  - 삽입 대상 선택 드롭다운(`자동(카드선택시 내부)` / `페이지 자유배치` / `선택 카드 내부`)을 추가하고, 활성 슬라이드 조회를 `#slideStage .slide.active` 우선으로 보강해 슬라이드 위와 카드 내부 모두 즉시 삽입되도록 수정.
- **플로팅 카드 팝업(`#floatingCardEditorModal`) 내 개별 텍스트 및 드래그 영역 폰트 크기·색상 적용 오류 해결 (`js/effects.js`, `index.html`)**:
  - 텍스트 노드 단위 범위 분할 래퍼(`styleFcRangeTextNodes`), `mouseup`/`keyup` 선택 영역 캡처, `#fcFontSizeInput` 실시간 입력(`oninput` + `Enter`) 및 연속 크기 조절 시 활성 `span` 기준 유지 로직을 적용해 드래그한 일부 글자나 클릭한 텍스트 블록의 크기·색상이 즉시 정확히 변경되도록 수정.

---

## [v4.4.1] - 2026-11-19 — 그래프·표 레이어 z-index 가림 해결 · 플로팅 팝업 카드 스튜디오 내부 모달 강제 오픈 · 카드 좌측 핸들(w) 우측 경계 고정 · 선택된 신규 카드 우측 상단 컨트롤 상시 표시

### Fixed
- **그래프·데이터 표 6개 버튼 삽입 시 화면 미표시 해결 (`css/slides.css`)**: `.ppt-free-layer`에 `z-index: 18`을 지정해 기본 카드 레이어(`.slide-grid-body`, `z-index: 10`) 위로 모든 그래프와 표가 즉시 렌더링되도록 수정.
- **플로팅 팝업 카드 스튜디오(`+ 새카드`) 내부 모달 오픈 보장 (`js/effects.js`, `js/state.js`)**: 닫힌 팝업 창 참조(`fcStudioPopupWin.closed`) 초기화 및 초기 동기화 예외 방어(`try/catch`) 후 `openModalSafe()`로 내부 모달(`#floatingCardEditorModal`)의 `display: flex; visibility: visible; opacity: 1`을 무조건 강제 적용하도록 수정.
- **카드 좌측 핸들(`w`) 리사이즈 시 우측 경계 고정 및 좌측 고정 현상 해결 (`js/selection.js`)**: `gridAutoFlow`를 `'row'`로 변경하고 좌측 핸들 드래그 시 카드의 우측 끝 열(`rightEnd`)을 고정한 채 시작 열(`nextStartCol`)과 동일 행 형제 카드의 열 좌표를 명시 고정하도록 수정.
- **새로 추가된 카드의 우측 상단 `[◀ 이전 | ▶ 다음 | ×]` 컨트롤 표시 복원 (`css/editor.css`, `js/selection.js`)**: 단일 선택된 요소에도 `.is-selected` 클래스를 부여해 마우스를 떼어도 선택된 카드 우측 상단에 `[◀ 이전 | ▶ 다음 | ×]` 컨트롤이 항상 표시되도록 개선.

---

## [v4.4.0] - 2026-11-18 — 핵심 기초 안정화 완결판 (저장 버튼 복구·카드 리사이즈 12컬럼 충돌/상단·좌측 핸들 수정·플로팅 카드 모달·키워드 해제·그라데이션 초기화 및 크기 고정·페이지 전환/미리보기·차트/표 삽입·새 카드 컨트롤·0카드 슬라이드·전체화면 하단 바·JS 어휘 구문 게이트)

### Fixed
- **저장 버튼(`openSaveModal`) 먹통 해결 (`js/export.js`, `js/state.js`)**: `js/export.js` 하단 미종료 문자열 찌꺼기(`"}};`) 제거 및 `openModalSafe()`/`closeModalSafe()`로 모든 모달의 `display: flex`를 강제 보장.
- **카드 리사이즈 첫 클릭 시 화면 전체 확장 및 상단/좌측 핸들 역방향 축소 해결 (`js/selection.js`, `js/main.js`, `css/editor.css`)**: `initFlexibleBentoGrid()`에서 `.slide-grid-body`의 `md:grid-cols-12` 등 `!important` 클래스를 함께 제거해 24컬럼 그리드가 정상 적용되도록 하고, 상단(`n`)·좌측(`w`) 핸들 드래그 시 반대편(하단·우측) 경계가 고정되도록 보정.
- **플로팅 팝업 카드(`+ 새카드`) 편집 모달 오픈 및 자동 연결 패널 표시 (`js/effects.js`)**.
- **핵심 키워드(`.kw`) 해제 버튼 추가 (`index.html`)**, **그라데이션/마스크 버튼 크기 팽창 해결 및 `초기화` 버튼 복원 (`index.html`, `js/effects.js`)**, **페이지 전환 트랜지션 및 `▶ 효과 미리보기` 복원 (`css/slides.css`, `js/effects.js`, `index.html`)**.
- **차트/표 삽입 무반응 및 오타(`세로막대`·`가로막대`·`꺾은선`) 수정 (`index.html`, `js/charts.js`)**, **신규 카드 상단 `[◀ 이전 | ▶ 다음 | ×]` 컨트롤 직계 자식 배치 복구 및 마지막 1개 카드 삭제(0카드 슬라이드) 허용 (`js/navigation.js`, `js/selection.js`)**.
- **전체화면 하단 호버 바 가로 한 줄 유지 (`css/slides.css`)**, **유튜브 임베드 `referrerpolicy`·새 탭 폴백 버튼 추가 및 `포스터` 버튼 안내 보강 (`js/media.js`, `js/storage.js`)**.

### Added & Changed
- **전 JS 파일 어휘·구문 스캐너(`verify_js_lexical_syntax`) 빌드 게이트 내장 (`build.py`)** 및 **배포 패키지에서 단독 실행본 HTML 제외 (모듈형 23개 파일 구성)**.

---

## [v4.3.3] - 2026-11-18 — 포렌식 감사(Forensic Audit) 기반 잔여 미작동 기능 3건 완벽 해결 (클립보드 스크린샷 및 드래그 앤 드롭 이미지 삽입기 추가·통합 서식 초기화 그라데이션 복원·편집 모드 중 모달/메뉴 `z-index` 최상단 상향)

### Fixed
- **클립보드 스크린샷(`Ctrl+V`) 및 탐색기 이미지 파일 드래그 앤 드롭 무반응 해결 (`js/media.js`)**: 이미지 파일을 직접 카드 내부나 캔버스에 드롭하거나 클립보드에서 붙여넣었을 때 호출되는 `insertDirectImageFile()` 함수를 신규 구현해 즉시 리사이즈 및 자유/소속 배치가 정상 작동하도록 보완.
- **통합 `🧹 서식·효과 초기화` 버튼 클릭 시 그라데이션 및 페이드 마스크 미해제 해결 (`js/text-editor.js`)**: `resetCurrentContextStyle()` 내부에서 존재하지 않던 `resetElementGradientAndMask()` 함수 호출을 실제 구현된 `clearAppliedGradient()`로 바르게 연결하여 효과 초기화 기능 정상화.
- **편집 모드 중 `목차` 모달·`히스토리` 드롭다운·`복구 배너` 가림 현상 해결 (`index.html`)**: 스튜디오 인스펙터(`z-index: 60`)보다 낮거나 동적이었던 `#tocModal`, `#historyDropdownMenu`, `#autosaveRecoveryBanner`, `#saveChoiceModal`의 `z-index`를 `92`로 상향하여 스튜디오 창 위 최상단에 항상 노출되도록 수정.

---

## [v4.3.1] - 2026-11-18 — 대중 배포 아키텍처 안정화 패치 (번들 데이터 모듈 분리 및 단독 실행본 중복 번들 제거·IndexedDB 대용량 작업함 전환·런타임 오프라인 유틸리티 보강·인스펙터 컨트롤 전수 복원)

### Fixed
- **WebKit 브라우저 실구동 검증 중 탐지된 인라인 스크립트 구문 오류(`js/export.js` 1번 줄 및 `build.py` 리터럴 `\n` 이스케이프) 및 오프라인 `tailwind` 미정의 오류(`index.html`) 수정**: 실제 WebKit 엔진(`wkhtmltoimage --debug-javascript`) 오프라인 실행 테스트에서 발견된 `SyntaxError: Invalid escape in identifier` 및 `ReferenceError: Can't find variable: tailwind`를 완전 제거.
- **거대 단일 파일(`js/export.js`) 분리 및 단독 실행본 내 중복 번들 페이로드 제거 (`build.py`, `index.html`, `js/bundle-data.js`, `js/export.js`)**: `window.PPT_STANDALONE_BUNDLE` 데이터를 전용 자동 생성 파일 `js/bundle-data.js`로 분리해 `js/export.js`를 순수 로직 모듈(~92.6KB)로 경량화하고, 단독 실행본 빌드 시에는 이미 인라인된 `<style data-inlined-css>`·`<script data-inlined-js>`를 재사용(`collectLiveInlinedAssets`)하여 중복 번들 페이로드를 완전 제거.
- **4대 기둥 인스펙터 통합 과정에서 누락된 세부 컨트롤 29종 전수 복원 (`index.html`)**: 그라데이션 시작/중간/끝 색상·투명도·각도 슬라이더 및 미리보기 바, 블러 슬라이더, 상·하단 바 개별 컬러 피커, 카드 불투명도, 동영상 경로·포스터 배지, 카드 내 미디어 높이·배율, 표 셀 `px` 크기, 차트 포인트 컬러 연동, 선택 카드 소속 체크박스, 호버 배경·그림자·테두리 FX, 다중 플로팅 카드 표시 방식·수정·삭제, 텍스트 오프셋 X/Y(px) 컨트롤을 모두 복원.

### Changed
- **브라우저 작업함 `localStorage` 5MB 한계 해소 (`js/storage.js`, `js/main.js`)**: 다중 프로젝트 작업함 저장소를 대용량 **IndexedDB (`PPTStudioWorkspaceDB_v1`, 최대 20개 보관)**로 전환하고 기존 `localStorage` 작업 내역을 자동 이관하도록 개선.
- **오프라인 Tailwind 컴파일러 매트릭스 확장 및 런타임 동적 클래스 감지기 추가 (`build.py`, `js/state.js`)**: 런타임에 추가되는 임의 유틸리티 클래스(`bg-[#...]`, `text-[...]`)를 오프라인에서도 즉시 CSS로 생성하는 `initOfflineRuntimeUtilityObserver()` 및 `file://` 환경 안내 추가.

---

## [v4.3.0] - 2026-11-18 — 전체화면 좌우 여백 제거(`incident noted_14`) · 3단 SaaS 워크스페이스(좌측 필름스트립·상단 컨텍스트 바·4대 핵심 탭 통합) · 로드맵 전 항목(PPTX 가져오기·자동 번호 토큰 포함) 100% 완결

### Fixed
- **전체화면(`F`/`F11`) 좌우 여백 제거 및 비전체화면↔전체화면 1:1 비율 일치 (`css/slides.css`, `js/state.js`)**: `fullscreenchange` 및 `F11` 뷰포트 감지(`isBrowserInFullscreen`) 시 상단 헤더·컨텍스트 바·좌측 필름스트립을 숨기고 `#slideStage`를 `100vw × 100vh`로 확장하여 16:9 모니터 전체화면에서 좌우 여백 없이 꽉 차게 렌더링되며, 비전체화면 편집 모드와 내부 요소 비율·크기·위치가 100% 동일하게 유지되도록 수정.

### Changed
- **Figma · Canva · PowerPoint 레퍼런스 기반 3단 워크스페이스 및 중복 버튼 통합 (`index.html`, `css/studio.css`, `js/studio.js`, `js/selection.js`)**:
  - 상단 **컨텍스트 퀵 액션 바(`#pptContextualTopBar`)**를 신설해 선택 대상(없음/텍스트/미디어/도형·카드/차트·표)에 따라 핵심 도구만 1줄로 자동 표시.
  - 기존 8개 탭을 **`🎨 디자인` · `✨ 모션·연동` · `📐 배치·레이어` · `📑 슬라이드·덱`** 4대 핵심 기둥으로 통합하고 선택 요소별 자동 탭 전환 옵션 추가.
  - 흩어져 있던 5종 초기화 버튼을 **`🧹 서식·효과 초기화`**로, 3종 배경 이미지 업로드/제거 버튼을 **대상 선택형 통합 배경 블록(초점 위치 + `Cover`/`Contain` 맞춤 포함)**으로, 8종 카드·블록 생성 버튼을 통합 UI로 단순화.

### Added
- **로드맵(`대형 개편.pdf`) 잔여 편의 기능 100% 구현 (`index.html`, `js/navigation.js`, `js/selection.js`, `js/text-editor.js`, `js/effects.js`, `js/main.js`, `js/export.js`, `js/storage.js`)**:
  - 좌측 슬라이드 썸네일 필름스트립 사이드바(`renderLeftFilmstripThumbnails`, 드래그 순서 변경, 다중 선택 복제/삭제), 레이아웃별 새 슬라이드 추가(`addSlideWithLayout`), 슬라이드 복사/붙여넣기(`Ctrl+C`/`Ctrl+V` 및 버튼), 동적 슬라이드 번호 자동 토큰(`insertSlideNumberToken`), `.pptx` 파일 직접 가져오기(`triggerImportPptxFile`, 무의존성 PKZIP + OpenXML 파서), 현재 슬라이드/전체 덱 초기 원본 복원(`resetCurrentSlideToInitial`, `resetEntireDeckToInitial`), 전체 슬라이드 글꼴 일괄 교체(`replaceFontAcrossDeck`), 화면 비율 전환(`setDeckAspectRatio`: 16:9/4:3/9:16 + 인쇄/PPTX 규격 연동), 최근 사용 색상(`recordRecentColor`) & `EyeDropper` 스포이드(`pickColorWithEyeDropper`), 클립보드 스크린샷 바로 붙여넣기 & 서식 없는 텍스트 붙여넣기 & 데스크톱 파일 드래그 앤 드롭 삽입, 표 셀 `Tab`/`Shift+Tab` 이동(`navigateTableCellWithTab`), 화면비 고정 잠금(`toggleElementAspectLock`), 픽셀(`px`) 크기·안쪽 여백 직접 입력(`applyInspectorPixelGeometry`, `applyElementPaddingPx`), 단일 요소 `Alt` 중심 대칭 리사이즈, 텍스트 박스 자동 폭 토글(`toggleTextboxAutoWidth`).

---

## [v4.3.0] - 2026-11-18 — 전체화면 좌우 여백 제거(`incident noted_14`) · 3단 SaaS 워크스페이스(좌측 필름스트립·상단 컨텍스트 바·4대 핵심 탭 통합) · 로드맵 전 항목(PPTX 가져오기·자동 번호 토큰 포함) 100% 완결

### Fixed
- **전체화면(`F`/`F11`) 좌우 여백 제거 및 비전체화면↔전체화면 1:1 비율 일치 (`css/slides.css`, `js/state.js`)**: `fullscreenchange` 및 `F11` 뷰포트 감지(`isBrowserInFullscreen`) 시 상단 헤더·컨텍스트 바·좌측 필름스트립을 숨기고 `#slideStage`를 `100vw × 100vh`로 확장하여 16:9 모니터 전체화면에서 좌우 여백 없이 꽉 차게 렌더링되며, 비전체화면 편집 모드와 내부 요소 비율·크기·위치가 100% 동일하게 유지되도록 수정.

### Changed
- **Figma · Canva · PowerPoint 레퍼런스 기반 3단 워크스페이스 및 중복 버튼 통합 (`index.html`, `css/studio.css`, `js/studio.js`, `js/selection.js`)**:
  - 상단 **컨텍스트 퀵 액션 바(`#pptContextualTopBar`)**를 신설해 선택 대상(없음/텍스트/미디어/도형·카드/차트·표)에 따라 핵심 도구만 1줄로 자동 표시.
  - 기존 8개 탭을 **`🎨 디자인` · `✨ 모션·연동` · `📐 배치·레이어` · `📑 슬라이드·덱`** 4대 핵심 기둥으로 통합하고 선택 요소별 자동 탭 전환 옵션 추가.
  - 흩어져 있던 5종 초기화 버튼을 **`🧹 서식·효과 초기화`**로, 3종 배경 이미지 업로드/제거 버튼을 **대상 선택형 통합 배경 블록(초점 위치 + `Cover`/`Contain` 맞춤 포함)**으로, 8종 카드·블록 생성 버튼을 통합 UI로 단순화.

### Added
- **로드맵(`대형 개편.pdf`) 잔여 편의 기능 100% 구현 (`index.html`, `js/navigation.js`, `js/selection.js`, `js/text-editor.js`, `js/effects.js`, `js/main.js`, `js/export.js`, `js/storage.js`)**:
  - 좌측 슬라이드 썸네일 필름스트립 사이드바(`renderLeftFilmstripThumbnails`, 드래그 순서 변경, 다중 선택 복제/삭제), 레이아웃별 새 슬라이드 추가(`addSlideWithLayout`), 슬라이드 복사/붙여넣기(`Ctrl+C`/`Ctrl+V` 및 버튼), 동적 슬라이드 번호 자동 토큰(`insertSlideNumberToken`), `.pptx` 파일 직접 가져오기(`triggerImportPptxFile`, 무의존성 PKZIP + OpenXML 파서), 현재 슬라이드/전체 덱 초기 원본 복원(`resetCurrentSlideToInitial`, `resetEntireDeckToInitial`), 전체 슬라이드 글꼴 일괄 교체(`replaceFontAcrossDeck`), 화면 비율 전환(`setDeckAspectRatio`: 16:9/4:3/9:16 + 인쇄/PPTX 규격 연동), 최근 사용 색상(`recordRecentColor`) & `EyeDropper` 스포이드(`pickColorWithEyeDropper`), 클립보드 스크린샷 바로 붙여넣기 & 서식 없는 텍스트 붙여넣기 & 데스크톱 파일 드래그 앤 드롭 삽입, 표 셀 `Tab`/`Shift+Tab` 이동(`navigateTableCellWithTab`), 화면비 고정 잠금(`toggleElementAspectLock`), 픽셀(`px`) 크기·안쪽 여백 직접 입력(`applyInspectorPixelGeometry`, `applyElementPaddingPx`), 단일 요소 `Alt` 중심 대칭 리사이즈, 텍스트 박스 자동 폭 토글(`toggleTextboxAutoWidth`).

---

## [v4.2.0] - 2026-11-18 — 대중 배포용 HTML Slide Studio 대규모 개편 Phase 8 완결 (UI/팝업 레이아웃 개편·완전 오프라인 Tailwind CSS 기본 내장·원클릭 ZIP 패키징·PowerPoint(.pptx) & PNG/JPG 내보내기·레이아웃 넘침 사전 검사·발표자 노트 인쇄·슬라이드별 협업 댓글)

### Added
- **빌드 시 컴파일된 Tailwind CSS 기본 내장 (`build.py`, `index.html`)**: `build_compiled_tailwind_css()`를 추가해 원본 `index.html` 및 단독 실행본 HTML 내부에 컴파일된 유틸리티 CSS(`<style id="pptCompiledTailwindBase" data-compiled-tailwind="true">`)를 기본 탑재하여 완전 오프라인 초기 실행 보장.
- **UI/팝업 레이아웃 개편 & 간편 모드 (`index.html`, `css/studio.css`, `js/studio.js`)**: 스튜디오 팝업·모달의 카드 위계·포커스 링·여백 디자인 시스템을 정비하고 초보자를 위한 `간편 모드` 토글(`toggleStudioCompactMode`) 추가.
- **원클릭 HTML + `media/` `.zip` 패키징 & `.pptx` (PowerPoint) OpenXML 내보내기 (`index.html`, `js/export.js`, `js/media.js`, `js/state.js`)**: 무의존성 순수 JS PKZIP 빌더(`buildZipBlobFromEntries`)로 단독 실행 HTML과 세션 미디어 파일을 자동 묶는 `exportDeckAsZipPackage()` 및 슬라이드·카드·표·이미지·발표자 노트를 OpenXML 포맷으로 변환하는 `exportDeckAsPPTX()` 구현.
- **단일 슬라이드/선택 요소 `PNG`·`JPG` 이미지 내보내기, 레이아웃 넘침 사전 검사, 발표자 노트 포함 인쇄 & 슬라이드별 협업 댓글 (`index.html`, `css/slides.css`, `css/print.css`, `js/export.js`, `js/navigation.js`, `js/storage.js`)**: `exportSlideOrElementAsImage()`, `scanDeckLayoutOverflows()`·`openOverflowAuditModal()`, `saveAsPDF(true)`(`body.print-with-notes`), `openSlideCommentsPanel()` 및 `data-slide-comments` XSS 화이트리스트 정화 구현.

## [v4.1.0] - 2026-11-18 — 대중 배포용 HTML Slide Studio 개편 Phase 7 (확장 애니메이션 25종·클릭 순서별 단계적 등장·발표자 노트 & 듀얼 모니터 발표자 전용 뷰·레이저 포인터/라이브 판서/화면 암전·슬라이드 일람표/마스터/숨기기/재사용/자동 전환 타이머)

### Added
- **반응형 애니메이션 11종·일반 애니메이션 14종 확장, 클릭 순서별 단계적 등장(`setElementBuildOrder`, `advanceSlideBuildStep`), 발표자 노트 & 듀얼 모니터 발표자 전용 뷰(`openPresenterViewWindow`), 레이저 포인터(`L`), 라이브 판서(`P`/`C`), 화면 암전(`B`/`W`), 슬라이드 숨기기, 일람표(`Slide Sorter`), 마스터, 슬라이드 가져오기 & 자동 전환 타이머** 구현.

## [v4.0.5] - 2026-11-18 — 대중 배포용 HTML Slide Studio 개편 Phase 6 (데이터 표 셀 병합/분할·중간 행/열 삽입·선택 열/행 삭제·테두리·헤더/첫열/줄무늬·균등 배분·열 정렬/합계/평균 & 차트 단위/범례·엑셀/CSV 붙여넣기 변환)

### Added
- **표 셀 병합(`mergeSelectedTableCells`) 및 분할(`splitSelectedTableCell`), 중간 행/열 삽입(`insertTableRowAt`, `insertTableColAt`), 선택 열/행 삭제(`removeSelectedTableCol`, `removeSelectedTableRow`), 테두리·스타일 옵션, 균등 배분, 열 기준 정렬(`sortTableBySelectedColumn`) 및 자동 합계/평균 행(`appendTableSummaryRow`), 차트 단위/범례 제어 및 엑셀/CSV 붙여넣기 변환(`applyCsvPasteToChartOrTable`)** 구현.

## [v4.0.0] - 2026-11-18 — 대중 배포용 HTML Slide Studio 개편 Phase 5 (이미지 크롭·위치 이동(Pan)·상하/좌우 반전·밝기/대비/흑백 필터·속성 유지 교체·원본 비율 복원 + 동영상 재생 옵션·오디오 연속 재생·유튜브/웹 임베드)

### Added
- **이미지 크롭·위치 팬(`setSelectedImageCropAndPan`), 상하/좌우 반전(`toggleSelectedImageFlip`), 밝기/대비/흑백 필터 & 블러 합성(`setSelectedImageFilter`), 속성 유지 미디어 교체(`triggerReplaceMediaPreserveProps`), 원본 비율 복원(`resetSelectedImageAspectRatio`), 동영상 재생 옵션(`toggleVideoPlaybackOption`, `triggerVideoPosterUpload`), 오디오 연속 재생(`triggerAudioInsert`, `toggleAudioPersist`) 및 유튜브·비메오·HTTPS 웹 임베드(`insertWebEmbedWidget`)** 구현.

## [v3.9.5] - 2026-11-18 — 대중 배포용 HTML Slide Studio 개편 Phase 4 (카드 자유 좌표 생성·대지 보관, 삼각형/다이아몬드/말풍선/별 도형·SVG 아이콘·자석 연결선, 눈금자/가이드, 동일 크기 맞추기, 그룹 격리 편집, 레이어 이름 변경 & 슬라이드 잠금)

### Added
- **카드 자유 좌표 생성 & 대지 보관(`addCardToCurrentSlide`, `togglePasteboardMode`), 확장 도형 & 단색 SVG 아이콘 10종(`insertFreeSvgIcon`), 점선/파선 테두리 & 화살촉, 자석 연결선(`startConnectorLinkMode`, `updateSlideConnectors`), 눈금자 & 영구 가이드선(`toggleStageRulers`, `addPersistentGuide`), 동일 크기 맞추기(`matchSelectedElementsSize`), 그룹 격리 편집(`isolatedGroupId`), 레이어 이름 변경(`renameLayerElement`), 일괄 잠금 해제(`unlockAllLayersInSlide`) & 슬라이드 잠금(`toggleCurrentSlideLock`)** 구현.

## [v3.9.0] - 2026-11-17 — 대중 배포용 HTML Slide Studio 개편 Phase 3 (우클릭 컨텍스트 메뉴, 캔버스 확대/축소 & 패닝, 히스토리 드롭다운·수정 슬라이드 자동 이동, 1px 미세 이동·Tab/Alt+클릭/T키/F4 반복, 찾기/바꾸기 & Ctrl+S 빠른 저장)

### Added
- **우클릭 컨텍스트 메뉴(`openStageContextMenu`), 캔버스 확대/축소(`setStageZoom`) & `Space + 드래그` 패닝, 히스토리 드롭다운(`jumpToHistoryIndex`) & 수정 슬라이드 자동 이동, `1px` 방향키 이동, `Tab` 순차 선택(`cycleSlideElementSelection`), `Alt + 클릭` 관통 선택, `T` 키/더블클릭 텍스트박스 생성(`insertFreeTextboxAtClientPoint`), `F4` 작업 반복(`repeatLastAction`), 전체 슬라이드 찾기/바꾸기(`openFindReplaceModal`), 페이지 번호 클릭 점프(`openSlidePageJumpInput`), `Ctrl+S` 빠른 덮어쓰기 저장 & 맞춤법 밑줄 토글(`toggleSpellcheckMode`)** 구현.

## [v3.8.5] - 2026-11-17 — 대중 배포용 HTML Slide Studio 개편 Phase 2 (텍스트·문단 편집기 대개편)

### Added
- **글머리 기호(`•`) · 번호 매기기(`1.2.3.`) 목록 및 `Tab` / `Shift+Tab` 들여쓰기(`toggleTextList`, `adjustListIndent`), 통합 서식 지우기(`clearAllTextFormatting`), 문단 여백·세로/양쪽 정렬·어절 줄바꿈 토글, 대소문자 변환·위/아래첨자·글자 그림자·외곽선, 수치 행간/자간·실시간 글자 수 카운터·텍스트 자동 맞춤(`runAutoFitOnElement`)·부분 하이퍼링크(`applyInlineTextLink`)·특수문자 팔레트(`insertSymbolAtCursor`)** 구현.

---

## [v3.8.0] - 2026-11-17 — 대중 배포용 HTML Slide Studio 개편 Phase 1 (상단 타이틀바 선택 지원, 상·하단 바 색상 커스텀, 전 해상도 16:9 비율 통일, 플로팅 카드 글자 크기·개별 색상 분리 & 스타터 템플릿·온보딩 가이드)

### Added
- **상단 바(`<header>`) 및 하단 바(`<footer>`) 색상 커스터마이징 (`index.html`, `css/base.css`, `css/slides.css`, `js/effects.js`, `js/storage.js`)**: `배경·효과` 탭에 상·하단 바 배경색·글자색 피커 및 5종 프리셋(기본 그레이, 화이트, 다크 블랙, 딥 네이비, 슬레이트, 슬라이드 배경과 통일)을 추가하고 프로젝트 작업함·JSON 저장/복원에 함께 보존되도록 구현.
- **4종 범용 스타터 템플릿 갤러리 (`index.html`, `js/storage.js`)**: `+ 새 발표자료 생성` 실행 시 `깨끗한 빈 슬라이드(2P)`, `비즈니스·프로젝트 제안서(6P)`, `크리에이터·디자인 포트폴리오(5P)`, `데이터 분석·성과 리포트(4P)` 중 선택하여 즉시 시작할 수 있는 템플릿 갤러리 모달 추가.
- **첫 실행 10초 온보딩 웰컴 가이드 & `[?]` 전체 단축키 일람표 모달 (`index.html`, `js/storage.js`, `js/main.js`, `js/export.js`)**: 일반 배포 사용자를 위해 `[E]` 편집, `[H]` 키워드 강조, `[M]` 목차 이동, `[?]` 단축키 안내를 한눈에 보여주는 온보딩 가이드와 단축키 일람표를 추가(발표 전용 내보내기 시 자동 제거).
- **플로팅 팝업 카드 스튜디오 글자 크기(`A-` / `A+` / `px` 입력) 조절 (`index.html`, `js/effects.js`)**: 드래그한 텍스트 구간 또는 클릭한 개별 문단·제목 블록의 글자 크기를 `10~96px` 범위로 조절할 수 있도록 추가.

### Fixed
- **기존 슬라이드(2~17P) 상단 타이틀 영역(`.slide-header-bar`) 클릭 선택·편집 불가 해결 (`css/editor.css`, `js/state.js`, `js/selection.js`, `js/main.js`, `js/navigation.js`)**: 기존 슬라이드 상단 타이틀 바에 `.slide-header-bar` 클래스를 부여·자동 감지하여 클릭 시 선택 오버레이, 배경색·투명도·테두리 편집, 레이어 트리 제어 및 하위 텍스트 선택 후 `▣ 카드선택` 전환이 가능하도록 수정.
- **창 모드 ↔ 전체화면 ↔ 태블릿/모바일 16:9 비율 일관성 통일 (`css/slides.css`, `js/state.js`)**: 모든 뷰포트에서 슬라이드가 `1440×810` 16:9 고정 논리 해상도를 유지한 채 화면 크기에 맞춰 비례 스케일링(`body.scaled-stage`, `--stage-scale`)되도록 통일하여 창 모드와 전체화면 전환 시 카드·글자·요소 비율이 달라지는 문제를 해결.
- **플로팅 팝업 카드 스튜디오 메인/서브 텍스트 색상 동시 변경 해결 (`js/effects.js`)**: 드래그 범위가 없는 상태에서 제목(`<h3>`)이나 본문(`<p>`)을 클릭해 글자색을 바꿀 때 카드 전체가 아닌 클릭한 개별 문단 블록(`lastFocusedFcTextEl`)에만 색상이 적용되도록 개선.
- **프로젝트 저장소 키 범용화 및 기존 데이터 자동 마이그레이션 (`js/storage.js`)**: `localStorage` 및 `IndexedDB` 키를 범용 이름(`html_slide_studio_projects_v1`, `HTMLSlideStudioAutoSaveDB`)으로 전환하고 기존 저장 데이터(`gopro_deck_studio_projects_v1`)를 자동 이관하도록 보완.

---

## [v3.7.7] - 2026-11-17 — v3.7.6 자체 점검 패치 (축소·모바일 뷰포트 맞춤 정렬·균등 분배 여백 비례 스케일링 & 다중 선택 시 반응형 효과 일괄 적용 우선순위 보정)

### Fixed
- **축소·모바일 뷰포트(`--stage-scale < 1`)에서 단일 요소 맞춤 정렬·2개 요소 균등 분배 여백 비례 보정 (`js/selection.js`)**: `alignSelectedElements()`의 좌·우·상·하 슬라이드 여백(`24px`) 및 `distributeSelectedElements()`의 최소 간격(`12px`)에 `getStageScale()`을 곱해 좁은 창이나 스마트폰 브라우저에서도 논리 좌표 기준으로 정확하게 정렬·분배되도록 개선.
- **다중 선택(`Shift+클릭` / 마퀴 드래그) 상태에서 반응형 애니메이션 일괄 적용 우선순위 보정 (`js/effects.js`)**: 여러 카드·도형을 다중 선택한 상태에서 이전에 드래그했던 텍스트 선택 범위가 남아 있더라도 선택된 모든 요소에 반응형 효과가 우선 일괄 적용되도록 조건 분기 보완.

---

## [v3.7.6] - 2026-11-17 — v3.7.5 자체 점검 패치 (실행 취소 시 focusout 재진입 Redo 소실 방지, 카드 하위 요소 선택 시 Glass 토글 지원, 카드 스타일 초기화 속성 정리 & 표 리사이저 임포트 보존)

### Fixed
- **텍스트 포커스 상태에서 실행 취소(`undoAction`) 시 `focusout` 재진입으로 Redo가 소실되던 버그 수정 (`js/history.js`)**: `contenteditable` 텍스트 요소에 포커스가 남아 있는 상태에서 실행 취소를 누를 때 `stage.innerHTML` 교체로 발생하는 동기 `focusout` 이벤트가 `saveHistorySnapshot()`을 재호출하여 `redoStack`을 초기화하던 문제를 `__isRestoringHistory` 재진입 가드로 원천 차단.
- **카드 내부 텍스트·요소 선택 시 `🪟 카드 반투명(Glass)` 토글 지원 (`js/effects.js`)**: `toggleSelectedCardGlass()`가 카드 루트뿐만 아니라 카드 내부 텍스트·요소를 선택한 상태에서도 `getTargetCardForHierarchy()`를 통해 상위 카드를 찾아 즉시 적용되도록 개선.
- **카드 스타일 초기화(`resetSelectedCardStyle`) 잔여 투명도·호버 속성 완전 정리 (`js/selection.js`)**: 초기화 시 `data-card-bg-alpha`, `data-hover-bg-hex`, `data-hover-bg-alpha` 속성을 함께 제거하여 재설정 시 이전 투명도가 잔류하지 않도록 보완.
- **불러오기 보안 필터(`sanitizeImportedStageHtml`) 표 경계 리사이저 `onmousedown` 보존 (`js/storage.js`)**: 화이트리스트에 등록된 `startTableColResize`, `startTableRowResize`가 파일 불러오기 및 자동저장 복구 시에도 유지되도록 이벤트 속성 허용 목록에 `onmousedown`을 추가.

---

## [v3.7.5] - 2026-11-17 — v3.7.4 자체 점검 패치 (반응 버튼 대상 클릭 지정 전 요소 확장, 플로팅 카드 새 창 분리 동적 차트 핸들러 바인딩, CSS 주석 우회 차단 & 키보드 슬라이더 Undo 병합)

### Security
- **인라인 `style` 속성 CSS 주석 우회 및 비정상 `url(...)` 구문 정화 강화 (`js/storage.js`)**: `sanitizeImportedStageHtml()`에서 `style` 속성의 `url(...)` 검사 전 CSS 블록 주석(`/* ... */`)을 먼저 제거하고, 닫는 괄호가 생략된 변형 구문 등으로 추출된 URL이 0건인 경우에도 `style` 속성을 제거하도록 보안 필터 강화.

### Fixed
- **반응 버튼 `🎯 슬라이드에서 대상 클릭 지정` 전 요소 유형 지원 및 `Esc` 취소 (`js/main.js`)**: 대상 클릭 지정 모드(`isPickingTriggerTarget`)에서 일반 텍스트·빈 카드뿐 아니라 자유 도형(`.ppt-free-obj`), 차트·표(`.ppt-chart-widget`), 서브박스(`.sub-box`), 카드 내 텍스트박스(`.card-inner-textbox`), 카드 소속 요소(`.card-embedded-obj`), 카드 내 미디어(`.card-inline-media`), 위계 블록(`.hierarchy-tier`)을 클릭해도 즉시 반응 대상으로 연결되도록 수정하고 `Esc` 키로 지정 모드를 취소할 수 있도록 보완.
- **플로팅 카드 스튜디오 `🖥 새 창 분리` 시 동적 차트·표 핸들러 및 `onkeydown` 바인딩 (`js/effects.js`, `js/studio.js`)**: 독립 창으로 분리된 플로팅 카드 스튜디오 내부에서 동적으로 삽입되는 차트·표의 셀 선택, 항목 색상·수치 수정, 표 열·행 경계 드래그 리사이즈 핸들러가 `ReferenceError` 없이 실행되도록 팝업 창 전역에 바인딩하고, 두 스튜디오 모두 `[onkeydown]` 속성을 래핑 목록에 추가.
- **제한된 브라우저·샌드박스 환경(`localStorage` 비활성/차단) 초기화 중단 방지 (`js/storage.js`)**: `renderSavedProjectsList()`, `deleteProjectFromWorkspace()`, `clearAllWorkspaceProjects()`의 `localStorage` 접근을 `try/catch`로 보호하여 로컬 파일(`file://`) 샌드박스나 스토리지 차단 환경에서도 `init()`이 중단되지 않도록 수정.
- **키보드 화살표 슬라이더 조절 시 Undo 스냅샷 개별 누적 방지 (`index.html`, `js/media.js`, `js/effects.js`)**: 미디어 내부 배율, 요소 불투명도, 모서리 라운드, 카드 배경 투명도, 호버 배경 투명도 슬라이더의 `oninput`과 `onchange`를 `isLiveInput` 인자로 분리하여 키보드 미세 조절 중에도 확정 시점에만 1회 히스토리가 기록되도록 개선.

---

## [v3.7.4] - 2026-11-17 — v3.7.3 자체 점검 패치 (차트 히스토리 무한 재귀 수정, 플로팅 카드 배경 이미지 XSS 차단, 새 창 분리 onkeydown·리사이즈 경계 보정 & 0% 좌표 복원)

### Security
- **플로팅 팝업 카드 배경 이미지 속성(`data-fc-bg-img`, `data-fc-hover-bg-img`) 임포트 정화 (`js/storage.js`)**: `sanitizeImportedStageHtml()`에서 `data:image/*;base64` 및 로컬 `media/` 경로 이외의 외부 URL이나 비정상 CSS 구문이 포함된 플로팅 카드 배경 이미지 속성을 차단하도록 보안 필터 강화.

### Fixed
- **일반 슬라이드 차트·표 편집 시 무한 재귀 호출(`RangeError`) 수정 (`js/charts.js`)**: 플로팅 카드 스튜디오가 닫힌 상태에서 차트·표를 삽입하거나 행·열을 추가·삭제할 때 `recordChartChangeHistory()`가 자기 자신을 재귀 호출하던 치명적 결함을 `saveHistorySnapshot()` 호출로 수정하고, 표 셀·차트 요소 색상 변경 시에도 플로팅 카드 전용 히스토리와 분리되도록 연결.
- **새 창 분리(`🖥 새 창 분리`) 시 `onkeydown` 핸들러 및 패널 리사이즈 창 경계 보정 (`js/studio.js`, `js/effects.js`)**: 독립 창으로 분리된 PPT Studio 및 Floating Card Studio에서 `onkeydown` 인라인 핸들러(동영상 경로 입력 후 `Enter` 적용 등)가 정상 작동하도록 연결하고, `startResizablePanelDrag()`가 메인 창이 아닌 분리된 팝업 창(`doc.defaultView`)의 뷰포트 크기를 기준으로 최대 크기를 계산하도록 수정.
- **플로팅 팝업 카드 `0%` 좌표 복원 및 빈 입력 오판 방지 (`js/effects.js`)**: `restoreFcEditorState()`에서 `0%` 좌표가 `50%`로 덮어씌워지던 문제와, 빈 문자열(`''`) 좌표 입력 시 `0%`로 오판되던 문제를 엄격한 빈 값·숫자 검증으로 수정.

---

## [v3.7.3] - 2026-11-17 — v3.7.2 자체 점검 패치 (단독 실행본 발표 전용 재내보내기 잠금 완결, 플로팅 팝업 0% 좌표·3D 틸트 미리보기 & 차트 히스토리 분리)

### Fixed
- **단독 실행본에서 '오직 발표용 HTML 내보내기' 실행 시 편집 스크립트·스타일 완전 제거 (`js/export.js`, `js/main.js`)**: 이미 자산이 인라인된 단독 실행 HTML(`data-inlined-css`, `data-inlined-js`)을 다시 열어 발표 전용 HTML(`saveModifiedHTML(true)`)로 내보낼 때도 `css/studio.css`, `js/studio.js`, `js/export.js`가 완전히 제거되고 `toggleEditMode` 잠금 및 읽기 전용 모드에서 불필요한 IndexedDB 자동저장·복구 배너 호출이 차단되도록 수정.
- **플로팅 팝업 카드 사용자 좌표 `0%` 입력 오류 수정 & 3D 커서틸트 실시간 미리보기 추가 (`js/effects.js`)**: 팝업 위치 `사용자 좌표(X%, Y%)`에 `0`을 입력했을 때 falsy 판정으로 `50%`로 초기화되던 문제를 `Number.isFinite()` 검사로 수정하고, 플로팅 카드 스튜디오 미리보기 캔버스에서도 `4. 3D 커서틸트` 효과를 즉시 체험할 수 있도록 개선.
- **플로팅 카드 스튜디오 차트 편집 시 메인 슬라이드 Undo 스택 오염 방지 (`js/charts.js`)**: 플로팅 카드 스튜디오 내부에서 차트·표 행/열 추가·삭제·유형 변경·색상 변경 시 메인 스테이지 `undoStack` 대신 플로팅 카드 전용 히스토리(`recordFcSnapshot`)에만 기록되도록 분리.

---

## [v3.7.2] - 2026-11-17 — v3.7.1 자체 점검 패치 (플로팅 카드 스튜디오 호버·그림자·테두리 라이브 미리보기, 슬라이더 Undo 완결 & CSS URL 보안 강화)

### Security
- **인라인 `style` 속성 `url(...)` 심층 정화 및 런타임 외부 URL 스킴 검증 (`js/storage.js`, `js/main.js`)**: `sanitizeImportedStageHtml()`에서 `data:image/*;base64` 이외의 비이미지 `data:` URI와 백슬래시(`\`) CSS 이스케이프 우회를 차단하고, 발표 모드 `data-goto-url` 클릭 시에도 `https?://` 프로토콜을 재검증하도록 강화.

### Fixed
- **플로팅 카드 스튜디오 반응형·호버배경·그림자·테두리 실시간 라이브 미리보기 (`index.html`, `css/editor.css`, `js/effects.js`)**: `반응형 · 팝업위치` 탭의 호버 배경색·투명도·그림자·호버테두리 설정이 하단 라이브 미리보기 캔버스(`#fcPreviewResizeBox`)에 즉시 반영되도록 연결하여 저장 전에도 마우스 호버로 연출을 직접 확인할 수 있도록 개선.
- **플로팅 카드 스튜디오 표 셀 너비·높이(px) 입력기 추가 (`index.html`)**: `차트 · 데이터 표` 탭에 `셀폭px`·`셀높이px` 입력기를 추가해 플로팅 카드 내 데이터 표에서도 셀 크기를 수치로 정밀 조절할 수 있도록 보완.
- **전역 슬라이더 조작 후 Undo/Redo 히스토리 기록 누락 보완 (`index.html`, `js/studio.js`)**: 배경 투명도, 카드 미디어 프레임 높이, 블러, 그라데이션 각도, 강조 박스 둥글기 슬라이더에 `onchange="saveHistorySnapshot()"`를 연결해 드래그 종료 시 실행 취소가 정상 동작하도록 수정하고, `openExternalStudioWindow()` 분리 시 `onblur` 핸들러 변환을 추가.

---

## [v3.7.1] - 2026-11-17 — v3.7.0 자체 점검 패치 (플로팅 스튜디오 복귀 폭·Undo 차트 동기화, 트리거 대상 확장 & 분리 창 포인트 컬러 연동)

### Fixed
- **플로팅 카드 스튜디오 새 창 복귀 폭 일치 & Undo/Redo 차트 목록 자동 동기화 (`js/effects.js`)**: 독립 창 분리 후 메인 창 복귀 시 다이얼로그 폭이 `760px`로 일관되게 복원되도록 수정하고, 플로팅 카드 편집기 내 실행 취소/다시 실행(`fcUndoAction`/`fcRedoAction`) 시 내부 차트·데이터 표 항목 편집기(`#fcChartItemsEditorList`)도 즉시 재동기화되도록 보완.
- **인터랙티브 반응 버튼 연결 대상 확장 (`js/effects.js`)**: `populateTriggerTargetSelect()` 목록에 카드 내 텍스트박스(`.card-inner-textbox`), 카드 소속 요소(`.card-embedded-obj`), 차트·표(`.ppt-chart-widget`)를 추가하여 모든 신규 요소 유형을 반응 버튼 트리거로 연결할 수 있도록 개선.
- **새 창 분리 스튜디오 포인트 컬러 실시간 연동 & 슬라이드 복제 선택 잔상 제거 (`js/effects.js`, `js/navigation.js`)**: 브랜드 포인트 컬러 변경 시 분리된 PPT Studio 및 Floating Card Studio 창에도 `--accent-color`가 즉시 반영되도록 연결하고, 슬라이드 복제 시 `.ppt-multi-selected` 잔상이 복제본에 남지 않도록 정리.

---

## [v3.7.0] - 2026-11-17 — PPT Studio(8대 카테고리) & 플로팅 팝업 카드 스튜디오(4대 카테고리) 기능 세심 재분류

### Changed
- **PPT Studio 인스펙터 8대 전문 카테고리(4×2 그리드) 재분류 (`index.html`, `js/studio.js`, `js/effects.js`)**: 기존 5개 탭에 혼재되어 있던 기능을 역할별로 세분화하여 **`텍스트` · `카드·위계` · `정렬·레이어` · `미디어·도형` · `차트·표` · `배경·효과` · `애니메이션` · `링크·덱관리`**의 8개 독립 탭으로 재구성.
  - `정렬·레이어` 전용 탭 분리: 6방향 맞춤 정렬, 슬라이드 중앙 배치, 가로/세로 간격 균등 분배, 다중 그룹화/해제, 폴더형 레이어 트리를 한눈에 조작 가능.
  - `차트·표` 전용 탭 분리: 6종 그래프/표 삽입, 유형 전환, 행·열 추가/삭제, 셀 채우기·글자색, 셀 너비·높이(px) 및 항목 데이터 편집을 전용 공간으로 분리.
  - `애니메이션` vs `링크·덱관리` 분리: 요소 반응형(7종)·호버 배경/그림자/테두리·일반 애니메이션(8종)·페이지 트랜지션을 `애니메이션` 탭으로 모으고, 인터랙티브 버튼·플로팅 카드 다중 연결·슬라이드 CRUD·프로젝트 작업함을 `링크·덱관리` 탭으로 정돈.
- **FLOATING POPUP CARD STUDIO 4대 카테고리 서브 탭 재분류 (`index.html`, `js/effects.js`, `js/charts.js`, `css/editor.css`)**: 상단 10줄 이상 나열되던 컨트롤을 **`본문 · 박스삽입` · `카드 외형 · 배경` · `차트 · 데이터 표` · `반응형 · 팝업위치`**의 4개 서브 탭(`switchFcStudioTab`)으로 재분류하고, 라이브 리사이즈 캔버스(`#fcPreviewResizeBox`)가 항상 상단 탭 바로 아래에 즉시 노출되도록 개선.

---

## [v3.6.6] - 2026-11-17 — 카드 하단 이탈·저장 깨짐 방지, 텍스트박스 Enter 줄바꿈 유지, 표 열/셀 리사이즈, 플로팅 카드 스튜디오 확장 & 핵심 키워드 박스 제거

### Fixed
- **전 슬라이드(1·6·7·13페이지 포함) 카드 세로 크기 하단 이탈 및 HTML/JSON 저장·불러오기 깨짐 방지 (`css/slides.css`, `js/selection.js`, `js/navigation.js`, `js/state.js`)**: `.slide-grid-body`에 `min-height: 0 !important`를 적용하고 `getGridBodyInnerHeight()`·`setCardProportionalHeightPx()`로 실제 가용 높이 이내로 카드 리사이즈를 엄격히 제한하며, `data-bento-h-ratio` 정규화 비율과 `syncResponsiveCardHeights()`를 연동해 저장·불러오기 및 창 크기 변경 시에도 레이아웃이 깨지지 않도록 개선.
- **텍스트 박스 내 `Enter` 줄바꿈 시 텍스트 박스 이탈·분리 현상 해결 (`js/main.js`, `css/slides.css`, `js/text-editor.js`)**: 편집 모드 `Enter` 입력 시 별개 블록 노드로 쪼개지지 않고 동일 텍스트 박스 내부에 `<br>` 줄바꿈(`insertCleanLineBreakInEditable()`)이 삽입되도록 통일하고, 카드 내 텍스트박스와 자유 텍스트박스가 줄 수에 맞춰 자동 확장되도록 수정.
- **핵심 키워드(`.kw`) 지정 시 별도 선택 박스·테두리 생성 현상 해결 (`js/text-editor.js`, `js/main.js`, `css/editor.css`, `index.html`)**: 인라인 `<span class="kw">`에서 개별 `data-editable` 및 편집 모드 박스 아웃라인을 제거해 문장 흐름 속에 자연스럽게 유지되도록 개선.
- **플로팅 팝업 카드 호버 배경 오작동 수정 (`css/slides.css`, `js/effects.js`)**: `반응형 효과`가 `없음(none)`일 때 마우스를 올려도 호버 배경 이미지나 호버 배경색이 활성화되지 않도록 `data-fc-has-hover` 및 `hydrateFloatingCardSurface()` 조건 분기를 적용.

- **저장·복원 후 표 셀 경계 리사이저 자동 재수화 & 다중 행/중앙 카드 리사이즈·보안 정화 보완 (`js/text-editor.js`, `js/history.js`, `js/charts.js`, `js/selection.js`, `js/storage.js`, `js/effects.js`, `js/main.js`)**: HTML/JSON 저장 및 실행 취소 후 편집 모드 진입 시 표 열·행 경계 드래그 핸들(`.table-col-resizer`, `.table-row-resizer`)이 자동 복원되도록 보완하고, 표 셀 내 줄바꿈(`<br>`) 유지, 10·17페이지 중앙 카드 가로 리사이즈 중앙 정렬 유지, 다중 행 독립 세로 리사이즈 하단 이탈 차단, `srcset` 다중 후보 및 `data-goto-url` 스킴 검증을 강화.

### Added
- **표(Table) 열 추가/삭제 및 개별 셀 너비·높이 조절 (`js/charts.js`, `css/slides.css`, `index.html`)**: `+ 열 추가` / `- 열 삭제` 기능과 표 셀 우측·하단 경계 드래그 리사이저(`startTableColResize`, `startTableRowResize`), 선택 셀 너비·높이(px) 수치 입력기를 추가.
- **플로팅 팝업 카드 스튜디오 내부 박스 생성 & 드래그 텍스트 색상 변경 (`js/effects.js`, `index.html`)**: `+ 텍스트박스`, `+ 긴 박스`, `+ 서브박스` 생성과 선택 블록 스타일(배경·테두리·둥글기) 편집, 그리고 `savedFcTextSelectionRange` 기반 드래그 텍스트 전용 글자색 변경 기능을 추가.

---

## [v3.6.5] - 2026-11-17 — v3.6.4 자체 점검 패치 (도형 컬러 피커 oninput/onchange 분리 완결, 미디어 배율 ReferenceError 수정, 모바일 다단 그리드 유지 & 다중 플로팅 ID 정화)

### Security
- **다중 플로팅 카드 속성(`data-floating-card-ids`, `data-floating-card-mode`) 임포트 검증 (`js/storage.js`)**: `sanitizeImportedStageHtml()`에서 쉼표 구분 플로팅 카드 ID 목록과 표시 모드(`paged`/`multi`) 형식을 엄격히 검증하도록 보완.

### Fixed
- **도형 컬러 피커 `oninput`/`onchange` 분리 완결 및 미디어 배율 `ReferenceError` 해결 (`js/media.js`)**: `setInnerMediaScale()` 내부에 잘못 삽입되었던 `isLiveInput` 참조(`ReferenceError`)를 제거하고, `updateSelectedShapeStyle()`에 `if (!isLiveInput) saveHistorySnapshot()`을 정상 적용하여 도형 3종 컬러 피커(채우기·테두리·글자색) 역시 확정 시점에만 1회 히스토리가 기록되도록 수정.
- **스마트폰 축소 뷰포트(`body.mobile-scaled-stage`) 다단 그리드 유지 (`css/slides.css`)**: `960px` 미만 스마트폰 브라우저에서 `1280×720` 데스크톱 스테이지를 비례 축소할 때 좁은 뷰포트 미디어 쿼리로 인해 다단 카드(`md:grid-cols-12`, `lg:grid-cols-12`, `md:grid-cols-3` 등)가 1열로 세로 붕괴되지 않도록 데스크톱 컬럼 비율을 유지.
- **구버전 저장본 요소 이동 오프셋 비례 스케일링 하위 호환 (`js/state.js`)**: 이전 버전에서 `data-offset-x`/`data-offset-y`만 저장된 요소도 창 크기 변경 및 전체화면 전환 시 자동으로 정규화 비율(`data-offset-rx`/`data-offset-ry`)을 계산·동기화하도록 개선.

---

## [v3.6.4] - 2026-11-17 — PC 전체화면 꽉 찬 비율 복원·모바일 데스크톱 레이아웃 유지 & 전체 28종 컬러 피커 oninput/onchange 완전 분리

### Fixed
- **PC 전체화면·창 모드 꽉 찬 스테이지 복원 및 창 전환 좌표 비례 동기화 (`css/base.css`, `css/slides.css`, `js/state.js`, `js/selection.js`)**: PC 데스크톱 환경(`960px` 이상)에서 슬라이드가 좌우 여백이나 그림자 박스 없이 `#slideStage` 전체(`100% × 100%`)를 꽉 채우도록 복원하고, 비전체화면 창과 전체화면 간 전환 시에도 요소 이동 오프셋(`data-offset-rx`/`data-offset-ry`)이 스테이지 비율에 맞춰 자동 재계산되도록 개선. 동시에 스마트폰 등 `960px` 미만 좁은 화면에서는 데스크톱 1280×720 레이아웃을 비례 축소(`body.mobile-scaled-stage`)하여 모바일 브라우저에서도 다단 그리드 레이아웃이 무너지지 않도록 유지.
- **전체 28종 컬러 피커 `oninput` / `onchange` 완전 분리 (`index.html`, `js/text-editor.js`, `js/effects.js`, `js/media.js`, `js/selection.js`, `js/charts.js`)**: 모든 컬러 피커의 `oninput`(드래그 중 실시간 미리보기)에서는 `saveHistorySnapshot()`을 호출하지 않고, 색상 확정 후 창을 닫는 `onchange` 시점에만 단 1회 히스토리를 기록하도록 구조를 분리하여 OS·브라우저 종류와 무관하게 Undo/Redo 중간 기록 누적 버그의 재발 가능성을 원천 차단.

---

## [v3.6.3] - 2026-11-17 — v3.6.2 자체 감사 패치 (축소 뷰포트/모바일 좌표 보정, 단축키 붙여넣기·새창 동기화 & 목차/플로팅ID XSS 방어)

### Security
- **목차 빠른 이동 모달 HTML 이스케이프 (`js/navigation.js`)**: `buildModalGrid()`에서 목차 번호·제목·부제를 `escapeAttr()`로 이스케이프 처리하여 사용자 입력/임포트 제목을 통한 2차 DOM XSS를 차단.
- **플로팅 카드·트리거 식별자 형식 검증 (`js/storage.js`, `js/effects.js`)**: `sanitizeImportedStageHtml()`에서 `data-fc-id`, `data-floating-card-id`, `data-trigger-node-id`, `data-trigger-target`의 허용 문자 집합(`/^[a-zA-Z0-9_-]+$/`)을 검증하여 인라인 핸들러 속성 주입을 원천 차단.

### Fixed
- **비전체화면·스마트폰 뷰포트(`--stage-scale < 1`)에서 카드 내 이동 경계·리사이즈 좌표 보정 (`js/selection.js`, `js/main.js`, `js/media.js`)**: `clampOffsetToParentCard()`, `setElementLeftTopPx()`, `applyGroupProportionalTransform()`, `resizeGridCardProportionally()`, `resizeMultipleGridCardsProportionally()` 및 카드 내 요소 8방향 리사이즈가 화면 픽셀과 `1440×810` 논리 픽셀을 혼합 계산하던 문제를 수정하여 축소 창이나 모바일 해상도에서도 카드 전체 영역 이동 및 비율 리사이즈가 100% 정확하게 동작하도록 개선.
- **`Ctrl+C` / `Ctrl+V` 및 분리된 스튜디오 창 단축키 통일 (`js/main.js`, `js/studio.js`)**: 편집 모드에서 카드 내 텍스트에 포커스가 남아 있는 상태에서도 `Ctrl+V`가 오버레이 `붙여넣기` 버튼과 동일하게 작동하도록 수정하고, `🖥 새 창 분리`로 띄운 스튜디오 창에서도 `Ctrl+Z` / `Ctrl+Y` / `Ctrl+C` / `Ctrl+V` 단축키가 동일하게 동작하도록 연결.

---

## [v3.6.2] - 2026-11-17 — 컬러 피커 Undo/Redo 근본 해결, Shift 직교 드래그, 단축키 통일, 16:9 고정 비율 스테이지 & 스마트 스냅 개선

### Fixed
- **네이티브 컬러 피커 Undo/Redo 중간 기록 누적 근본 해결 (`js/history.js`, `js/effects.js`)**: OS 기본 컬러 피커 창이 열릴 때 마우스 버튼 `pointerup`으로 인해 지연 플래그가 조기 해제되던 문제를 수정하여, 컬러 피커 창이 닫힐 때(`change`/`blur`/창 복귀)까지 단일 변경 이력으로 병합되도록 개선.
- **Shift 키 조합 가로/세로 직교 이동 잠금 (`js/main.js`, `js/effects.js`)**: 포토샵·일러스트레이터와 동일하게 `Shift` 키를 누른 채 요소를 드래그할 때 이동량이 큰 축(가로 또는 세로)으로 수직·수평 직교 이동하도록 구현.
- **단축키(`Ctrl+Z`, `Ctrl+Y`, `Ctrl+C`, `Ctrl+V`, `E`, `H`)와 UI 버튼 동작 1:1 통일 (`js/main.js`)**: 한글 입력기(IME) 상태에서도 `e.code` 기반으로 단축키가 즉시 작동하며, 편집 모드에서 `contenteditable` 요소가 포커스된 상태에서도 `Ctrl+Z`/`Ctrl+Y`/`Ctrl+C`/`Ctrl+V`가 상단·오버레이 버튼과 완전히 동일하게 실행되도록 통일.
- **전체화면·창 모드·스마트폰 브라우저 16:9 고정 비율 스케일링 (`css/base.css`, `css/slides.css`, `css/print.css`, `js/state.js`, `js/navigation.js`, `js/main.js`)**: 모든 슬라이드를 `1440×810` 16:9 고정 논리 해상도로 렌더링하고 뷰포트 크기에 맞춰 비례 축소·확대(`--stage-scale`)하여 창 모드와 전체화면 전환 시 좌표 틀어짐과 모바일 브라우저에서의 레이아웃 붕괴를 원천 차단.
- **스마트 스냅 및 간격 가이드 정밀화 (`js/main.js`)**: 카드 내부 요소 이동 시 소속 카드 중앙·여백 기준 스냅, 최인접 요소 기준 가로/세로 간격(`px`) 표시, 숨김 레이어 제외 및 `Shift` 직교 잠금 축 보존을 적용.

---

## [v3.6.1] - 2026-11-17 — v3.6 자체 보안·기능 감사 패치 (전체 요소 카드 소속 확장, 직접 드래그 이동, 다단 텍스트 포커스 & 외부 CSS URL 차단)

### Security
- **불러오기 스타일 속성 외부 URL 차단 (`js/storage.js`)**: `sanitizeImportedStageHtml()`의 `style` 속성 검사에 `url(http://...)`, `url(https://...)`, `url(//...)` 등 외부 원격 URL 차단을 추가하여 임포트된 HTML/JSON을 통한 외부 트래킹 픽셀·비콘 요청을 원천 차단.
- **복사·붙여넣기 차트 UID 충돌 방지 (`js/selection.js`)**: `pasteCopiedElements()` 실행 시 복제된 차트 위젯의 `data-chart-uid`를 고유 값으로 재생성하여 동일 슬라이드 내 복붙 후에도 차트 인스펙터가 독립적으로 동작하도록 보장.

### Fixed
- **직접 미디어(사진·동영상) 및 반응·링크 버튼 카드 소속 지원 확장 (`js/media.js`, `js/effects.js`)**: `선택 카드에 소속` 옵션이 켜진 상태에서 `🖼🎬 미디어 삽입 (사진·동영상 박스없이 바로삽입)`, `+ 반응 버튼`, `+ 링크 버튼`을 실행할 때도 선택한 카드 내부에 직접 소속되도록 확장.
- **카드 내 요소 직접 마우스 드래그 이동 및 경계 클램핑 (`js/main.js`)**: `✥ 드래그 이동` 핸들뿐 아니라 카드 내부의 미디어 프레임, 텍스트박스, 카드 도형, 서브박스, 차트를 마우스로 직접 드래그해 카드 내부에서 자유롭게 이동(스마트 스냅 및 카드 경계 이탈 방지 포함)할 수 있도록 개선.
- **다중 텍스트 블록(서브박스·긴 박스) 내 클릭한 문단 우선 서식 적용 (`js/text-editor.js`)**: 서브박스나 긴 박스 내부의 두 번째 문단을 클릭한 뒤 글자 크기·색상·정렬을 변경할 때 첫 번째 라벨이 아닌 실제 포커스된 문단(`lastFocusedEditable`)에 정확히 적용되도록 수정.
- **초기 로드 발표 모드 정합성 (`index.html`)**: 정적 HTML에 남아 있던 `contenteditable="true"` 속성을 제거하여 파일 오픈 직후 순수 발표 모드로 열리고 `[E]` 키 입력 시에만 편집 모드가 활성화되도록 통일.

---

## [v3.6.0] - 2026-11-17 — 카드 소속 요소·긴 박스·드래그 부분 색상·복사/붙여넣기·다중 선택 일괄 적용 & 슬라이드/반응형 효과 정비

### Added
- **카드 내 텍스트 박스(`+ 텍스트박스`) & 가로 전체 폭 긴 강조 박스(`+ 긴 박스`) 생성 (`index.html`, `js/selection.js`, `css/slides.css`)**: 선택한 카드 내부에 기본 텍스트 박스와 동일한 동작(8방향 크기 조절, 자유 위치 이동, 카드 경계 이탈 방지 클램핑)을 지원하는 텍스트 박스와, QnA 체크포인트 형태의 가로 전체 폭 긴 강조 박스를 즉시 삽입할 수 있도록 추가.
- **모든 사용자 생성 요소의 카드 소속 지원 (`index.html`, `js/media.js`)**: `미디어·도형` 탭에 `선택 카드에 소속` 토글을 추가하여 텍스트박스, 도형, 배지, 미디어 슬롯 등을 선택한 카드 내부에 직접 소속시켜 생성 가능.
- **전역 요소 복사 / 붙여넣기 (`Ctrl+C` / `Ctrl+V` 및 오버레이 `복사`·`붙여넣기` 버튼) (`index.html`, `js/selection.js`, `js/main.js`)**: 동일 슬라이드 내 복붙은 물론, 다른 슬라이드로 이동해 붙여넣기(`Ctrl+V`)해도 자유 레이어·카드 내부·그리드 카드 구조를 유지한 채 복원.
- **문장 내 드래그한 텍스트 부분 색상 변경 (`js/text-editor.js`)**: 문장 중 특정 단어·구간을 드래그한 뒤 컬러 피커(`oninput`/`onchange`)를 조작해도 선택 범위가 풀리지 않고 드래그한 텍스트에만 글자 색상이 정확히 적용되도록 개선.

### Fixed
- **4페이지(`02 · 브랜드 소개`) '기존 주요 고객층' 카드 통일 및 중복 5페이지 삭제·목차 동기화 (`index.html`)**: 4페이지의 `기존 주요 고객층` 카드를 기존 5페이지와 동일한 헤더·컨트롤·하단 푸터 구조로 통일하고, 중복·오류 슬라이드였던 구 5페이지를 제거한 뒤 전체 19장 슬라이드 번호와 2페이지 목차(`data-goto-slide` 및 `SLIDE XX`)를 완벽히 재동기화.
- **카드 내 미디어 하단 핸들 크기 조절 시 상단 축소/이동 및 드래그 이동 불가 해결 (`css/editor.css`, `js/main.js`)**: 편집 모드 CSS의 `transform: none !important`가 카드 내 미디어·서브박스의 이동(`translate`)을 차단하던 문제를 수정하고, 하단 핸들 리사이즈 시 카드 상단 기준점 고정(`justify-start`·`flex-shrink: 0`) 및 내부 미디어 비율 동기화를 적용.
- **기존 카드 내 모든 요소의 선택·삭제·이동·크기 조절 지원 (`js/main.js`)**: 이미 생성된 카드 내부의 모든 텍스트·배지·리스트·메타데이터 블록을 클릭해 선택하고 `Delete` 키 또는 오버레이 버튼으로 삭제·이동·리사이즈할 수 있도록 개선.
- **다중 선택(`Shift+클릭` / 마퀴 드래그) 시 서식·색상·효과 일괄 적용 (`js/text-editor.js`, `js/effects.js`, `js/media.js`, `js/selection.js`)**: 다중 선택 상태에서 글꼴, 글자 크기, 글자 색상, 형광펜, 정렬, 카드 배경·호버 색, 반응형·일반 애니메이션, 도형 스타일, 레이어 순서가 마지막 요소뿐 아니라 선택된 모든 요소에 동시 적용되도록 수정.
- **첫 페이지(및 전 슬라이드) 반응형 효과 해제 완전 복구 및 호버 들뜸 이중 부상 방지 (`css/slides.css`, `js/effects.js`)**: 중첩 제목(`h1 > div > span`)에 적용된 반응형 효과와 `.hover-reactive` 클래스가 `전체 효과 해제` 시 완전히 제거되도록 수정하고, 카드 내부 요소에 `hover-lift` 적용 시 부모 카드의 기본 호버와 이중으로 떠오르던 현상을 차단.

---

## [v3.5.0] - 2026-11-16 — 자체 보안·기능 감사 패치 (SVG/CSS 주입 차단, 플로팅 스튜디오 전체 Undo/Redo & 상단 타이틀 행 패킹)

### Security
- **불러오기 보안 필터(`sanitizeImportedStageHtml`) SVG/CSS 심층 방어 (`js/storage.js`)**: `<foreignObject>`, `<animate>`, `<set>`, `<animateTransform>`, `<animateMotion>`, `<use>` 태그 및 임포트 스테이지 내 `<style>` 태그를 전면 제거하여 SVG 속성 변이를 통한 `javascript:` URI 우회 및 CSS `url()`/오버레이 스푸핑을 원천 차단.

### Fixed
- **플로팅 카드 스튜디오 Undo/Redo 전체 속성 동기화 (`index.html`, `js/effects.js`)**: `captureFcEditorState()` 및 `restoreFcEditorState()`가 반응형 효과(`fcFx`), 효과 기준(`fcFxBasis`), 호버 배경색·투명도, 그림자·호버테두리 옵션, 팝업 표시 위치(`posPreset`, `X%`, `Y%`)까지 모두 스냅샷에 저장·복원하도록 보완.
- **상단 타이틀 카드 추가 시 다중 행 오버플로 방지 (`js/navigation.js`)**: `addTitleCardToCurrentSlide()`에도 24컬럼 벤토 행 패킹 계산을 적용하여 3~5개 이상의 카드가 배치된 상태에서 상단 타이틀 카드를 추가해도 슬라이드 영역 밖으로 넘치지 않도록 개선.
- **플로팅 팝업 라이트박스 클릭 애니메이션 다중 카드 지원 (`js/main.js`)**: 단일 팝업뿐 아니라 `여러 개 동시에 띄우기` 모드(`.fc-multi-card-item`)에서도 `click-pulse` 및 `click-highlight` 반응형 효과가 동작하도록 이벤트 위임 개선.

---

## [v3.4.0] - 2026-11-16 — 보안 하드닝(XSS 차단), 누락 함수 4종 복구, 팝업 창 분리 안정화 & 연속 카드 추가 오버플로 해결

### Security
- **불러오기 보안 필터(`sanitizeImportedStageHtml`) 전면 강화 (`js/storage.js`)**: 인라인 이벤트 핸들러(`on*`)를 세미콜론 단위 구문 분해 후 화이트리스트 정규식으로 전체 앵커링 검증하여 `deleteCard(this);악성코드`·`goToSlide(1);악성코드` 우회를 원천 차단하고, SVG `xlink:href`, `formaction`, `action`, `poster`, `srcset` URI 검증 및 `<style>` 내 `@import`·`expression()` 제거를 적용.
- **작업함 저장형 XSS 차단 및 덮어쓰기 경고·0슬라이드 검증 (`js/storage.js`)**: `renderSavedProjectsList()`에서 프로젝트 제목·시각·ID를 이스케이프 처리하여 스크립트 실행을 방지하고, 8개 초과 저장 시 사용자 확인 경고(`confirm`)를 표시하며, `.slide`가 0개인 손상 파일 불러오기·복구를 차단.

### Fixed
- **플로팅 카드 스튜디오·연동 함수 4종 구현 및 속성 저장 완결 (`js/effects.js`)**: `clearFloatingCardHoverBgImage()`, `onFcHoverBgBlurChange()`, `onFcInnerImageBlurChange()`, `setSelectedFloatingCardDisplayMode()`를 구현하고 `data-fc-hover-bg-blur` 및 `data-floating-card-mode` 저장·복원을 연결하여 페이지 전환(`1/N`) 및 다중 동시 띄우기 모드가 즉시 작동하도록 수정.
- **단독 저장본 콘솔 에러 제거 및 오프라인 Tailwind 클래스 보강 (`js/export.js`, `index.html`)**: 단독 HTML 내보내기 시 `tailwind.config` 인라인 스크립트를 함께 제거하여 `ReferenceError: tailwind is not defined` 콘솔 오류를 없애고, `#pptTailwindSafelist`에 `bg-black/10`, `hover:opacity-100`, `ml-3`, `opacity-75`, `float-right`를 추가.
- **헤드리스/오프라인 환경 새 창 분리(`document.body` null) 오류 해결 (`js/studio.js`, `js/effects.js`)**: 팝업 HTML 템플릿에서 블로킹 외부 CDN `<script>`를 제거하고 메인 창의 컴파일된 스타일을 복제·주입하여 `win.document.body`가 항상 즉시 생성되도록 수정.
- **4~5개 이상 카드 연속 추가 시 슬라이드 하단 오버플로 해결 (`js/navigation.js`)**: 24컬럼 벤토 행 패킹 계산과 가용 높이 균등 배분으로 여러 장의 카드를 연속 추가해도 슬라이드 영역 밖으로 넘치지 않도록 수정.
- **차트 입력값 범위 제한 및 고유 UID 충돌 방지 (`js/charts.js`, `js/effects.js`)**: 차트 수치를 `0 ~ 100,000,000` 범위로 제한하고 `Date.now()` + 난수 접미사를 결합해 동일 밀리초 내 차트 생성 시 UID 중복을 방지하며, 죽은 DOM 참조(`focusModeBtn`, `cardHoverToggleBtn`)를 정리.

---

## [v3.3.0] - 2026-11-16 — build.py 멱등성·export.js 문법 복구, 다중 플로팅 팝업 표시 모드, 동시 블러 & 리사이즈 안정화

### Added
- **다중 플로팅 팝업 카드 표시 방식 선택 (`index.html`, `css/slides.css`, `js/effects.js`, `js/main.js`)**: 하나의 요소에 연결된 여러 플로팅 카드를 **`📄 페이지 전환 형식 (1장씩 · 1/N 표기)`** 또는 **`🪟 여러 개 동시에 띄우기 (한 화면에 함께 표시)`** 중 선택할 수 있도록 추가.
- **플로팅 카드 스튜디오 동시 독립 블러 (`index.html`, `css/editor.css`, `js/effects.js`)**: **배경사진 블러**, **호버배경 블러**, **삽입사진 블러**를 각각 독립 슬라이더(`0~30px`)로 동시 조절하고 라이브 미리보기에 즉시 반영되도록 개선.
- **플로팅 카드 스튜디오 호버 배경 사진 삭제 버튼 (`index.html`, `js/effects.js`)**: 호버 배경 사진 전용 삭제(`✕`) 버튼을 추가하여 기본 배경 사진을 유지한 채 호버 배경 사진만 개별 제거 가능.

### Fixed
- **`js/export.js` 문법 오류 복구 및 `build.py` 번들 동기화 멱등성 확보 (`js/export.js`, `build.py`)**: `build.py`가 `window.PPT_STANDALONE_BUNDLE` JSON 내부 문자열의 `SAVE MODAL` 주석을 오인 매칭하던 결함을 수정하여 몇 번을 연속 빌드해도 `js/export.js`가 손상되지 않도록 개선.
- **호버 배경 이미지 투명도 사용자 직접 제어 보존 (`js/effects.js`)**: 호버 배경 이미지 업로드 시 사용자 설정 투명도를 임의의 45%로 덮어쓰지 않고 `투명도` 슬라이더 값을 그대로 사용하도록 수정.
- **플로팅 팝업 라이트박스 불필요 UI 제거 (`js/effects.js`)**: 다중 플로팅 팝업 페이지 전환 시 상단 카드 탭과 `◀`/`▶` 화살표 버튼을 제거하고 미니멀한 `1/N` 페이지 번호 표기만 유지.
- **새 카드 추가 시 세로 밀림 및 리사이즈 잠금 해결 (`js/navigation.js`)**: 새 카드 추가 시에도 24컬럼 벤토 그리드 전환 및 전체 행 높이 정규화를 항상 수행하여 기존·신규 카드 모두 화면 이탈 없이 8방향 크기 조절 가능.
- **플로팅 카드 스튜디오 창 크기 조절 중 창 닫힘 현상 해결 (`index.html`, `js/studio.js`)**: 창 테두리/모서리 리사이즈 드래그 중 마우스가 배경 오버레이 위에서 릴리즈될 때 모달이 닫히지 않도록 드래그 상태 가드 적용.
- **플로팅 카드 내부 요소 크기 조절 안정화 (`index.html`, `css/editor.css`, `js/effects.js`)**: 서브박스 외부 래퍼의 `contenteditable` 간섭을 제거하고 우측·하단·우하단 3방향 핸들 및 폭%/높이 실시간 입력(`oninput`)을 적용해 내부 차트·표·사진·서브박스의 크기를 안정적으로 조절 가능.

---

## [v3.2.0] - 2026-11-16 — 다중 플로팅 카드 연결, 호버 배경 이미지 배치·동작 수정, 플로팅 내부 이동 & 차트 컬러피커 개선

### Added
- **단일 요소에 다중 플로팅 팝업 카드 연결 및 발표 전환 (`index.html`, `js/effects.js`, `js/main.js`)**: 하나의 버튼·텍스트·카드·도형에 여러 개의 플로팅 카드를 순서대로 연결(`+ 연결 추가`)하고 순서를 조정할 수 있으며, 발표 모드에서 팝업을 열었을 때 상단 탭·화살표(`◀`/`▶` 및 `←`/`→` 키)로 연결된 여러 플로팅 카드를 즉시 전환할 수 있도록 업그레이드.
- **플로팅 카드 내부 요소(차트·표·사진·서브박스) 위치 이동 및 경계 제한 (`index.html`, `css/editor.css`, `js/effects.js`)**: 플로팅 카드 편집기 내 각 블록에 `✥ 이동` 드래그 핸들과 `X`/`Y` 좌표·미세 이동 컨트롤을 추가하고, 기존 카드와 동일하게 플로팅 카드 바깥 영역으로 이탈하지 않도록 경계 클램핑 적용.

### Fixed
- **호버 배경 이미지 탭 이동 및 반투명 오버레이 동시 작동 수정 (`index.html`, `css/slides.css`, `js/effects.js`)**: `✨ 호버 배경 이미지` 및 `✕ 호버 배경 제거` 버튼을 `호버 배경색`과 동일한 `액션·덱관리` 탭으로 이동하고, 카드뿐만 아니라 일반 요소에서도 호버 시 배경 이미지 위에 반투명 호버 배경색 오버레이가 겹쳐 나타나도록 수정(슬라이드 배경으로 잘못 적용되던 폴백 차단).
- **그래프·데이터 표·차트 항목 컬러피커 조기 닫힘 해결 (`js/charts.js`)**: 색상 피커 조작(`oninput`) 중 인스펙터 목록 DOM을 재생성하지 않도록 분리하여 원하는 색상을 정확히 선택할 때까지 피커 창이 유지되도록 개선.
- **상단 타이틀 카드 및 새 카드 추가 시 세로 위치 밀림·크기 조절 불가 해결 (`js/navigation.js`)**: 상단 타이틀 카드 또는 새 카드 삽입 시 기존 행 높이를 가용 스테이지 높이에 맞춰 비례 축소 정규화하여 다른 카드가 화면 아래로 밀려나지 않고 모든 카드의 크기 조절이 정상 작동하도록 수정.

---

## [v3.1.0] - 2026-11-16 — 단독 저장본 재저장/PDF 복구, Tailwind 오프라인 세이프리스트, 이중 크래시 보호 & 터치 히스토리 안정화

### Fixed
- **`js/export.js` 중복 함수 제거 및 단독 저장본 재저장/PDF 저장 오류 해결 (`js/export.js`, `build.py`)**: 파일 하단에 중복 선언되어 있던 축소판 `saveModifiedHTML`/`saveAsPDF` 및 줄바꿈 누락(`}function getChosenExportBaseName()`)을 제거하고, `build.py`가 `js/export.js` 본문 전체를 `window.PPT_STANDALONE_BUNDLE['js/export.js']`에 포함하도록 개선. 저장 후 편집 모드 복귀, 목차 모달 숨김, `.video-missing-fallback`·`data-err-bound` 제거, `Untitled` 기본 파일명(및 연속 마침표 정제)과 PDF 출력 시 제목 임시 변경·복원까지 모두 정상 동작하도록 수정.
- **오프라인 단독 실행본 Tailwind 런타임 클래스 누락 방지 (`index.html`)**: 저장 시점 DOM에 존재하지 않아 Tailwind CDN 제거 후 누락될 수 있는 런타임 동적 유틸리티 클래스 46종을 숨김 세이프리스트(`#pptTailwindSafelist`)에 등록.
- **IndexedDB 이중 크래시 복구 슬롯 보존 (`index.html`, `js/storage.js`)**: 복구 배너를 무시하고 새 편집을 진행한 뒤 재접속해도 기존 대기 기록(`_pending`)을 `_pending_prev` 슬롯에 보존하고 배너에서 `최근 기록 복구`와 `이전 크래시 복구`를 모두 선택할 수 있도록 개선.
- **터치·펜 입력 취소(`pointercancel`) 시 히스토리 보류 플러시 (`js/history.js`)**: 컬러 피커·슬라이더 조작 중 `pointercancel` 이벤트 발생 시 지연 플래그를 즉시 해제하고 보류된 스냅샷을 저장하도록 수정.
- **드래그 텍스트 부분 중첩 시 기존 효과 잔여 구간 보존 (`js/effects.js`)**: 이미 반응형 효과가 적용된 텍스트의 일부 구간에만 새 효과를 덮어씌울 때 겹치지 않는 앞·뒤 잔여 텍스트의 기존 반응형 효과를 유지하도록 개선.

---

## [v3.0.0] - 2026-11-16 — 카드 연동 리사이즈 ON/OFF, 드래그 텍스트 비중첩, 호버 배경 이미지+틴트/블러/마스크 & Untitled 내보내기

### Added
- **카드 연동 리사이즈 ON/OFF (`index.html`, `js/state.js`, `js/selection.js`)**: `카드·배치` 탭에 `연동 리사이즈` 토글을 추가하여, ON 상태에서는 상단 타이틀 카드나 일반 카드의 상하·좌우 크기 조절 시 인접 행/열의 비율을 자동 보정해 레이아웃 이탈과 페이지 스크롤을 원천 차단하고, OFF 상태에서는 선택한 카드만 독립 조절할 수 있도록 구현.
- **호버 배경 이미지 + 호버 배경색(투명도 오버레이) + 블러 + 그라데이션/투명화 마스크 동시 지원 (`css/slides.css`, `index.html`, `js/state.js`, `js/effects.js`)**: 단색 카드에 마우스를 올릴 때 호버 배경 이미지(`.card-hover-bg-layer`)와 반투명 호버 배경색(`.card-bg-tint`), 흐림 효과(Blur), 그라데이션·투명화 마스크가 동시에 작동하도록 업그레이드.
- **FLOATING POPUP CARD STUDIO Undo/Redo, 내부 요소 리사이즈 & 흐림 효과 (`index.html`, `css/editor.css`, `js/effects.js`)**: 플로팅 카드 편집기 전용 `↶`/`↷` 실행 취소/다시 실행 스택, 삽입한 그래프·표·사진·서브박스의 드래그/수치 크기 조절, 배경 이미지 및 삽입 사진 흐림 효과(Blur), 호버 배경 이미지 지원 추가.
- **내보내기 파일 이름 사용자 지정 & 기본값 `Untitled` (`index.html`, `js/export.js`)**: 저장 모달에서 파일 이름을 직접 입력할 수 있으며 기본 저장 파일명을 `Untitled.html`로 설정.

### Fixed
- **드래그 텍스트 반응형 효과 중첩 방지 (`js/effects.js`)**: 기존 `.fx-text-span`과 겹치거나 포함된 텍스트 구간을 드래그해 새 효과를 적용할 때 기존 효과 범위를 자동 분할·해제한 뒤 단일 효과만 적용하도록 수정.
- **차트 개별 사용자 지정 컬러 모드 독립 동작 (`js/charts.js`)**: `포인트컬러 연동` 해제 시 각 항목의 사용자 지정 색상이 브랜드 포인트 컬러에 덮어씌워지지 않도록 수정.

---

## [v2.9.0] - 2026-11-16 — 카드 배경이미지+배경색 동시 레이어링, 상하 리사이즈 고정, 스튜디오 창 크기조절 & 차트/표 셀 채우기

### Added
- **카드 배경 이미지 + 카드 배경색 오버레이 동시 지원 (`css/slides.css`, `js/state.js`, `js/effects.js`)**: 카드 및 플로팅 팝업 카드에 배경 이미지를 넣은 상태에서도 배경색과 투명도를 조절해 반투명 컬러 오버레이를 얹을 수 있도록 `.card-bg-tint` 및 `.fc-bg-tint-layer` 레이어링 구현.
- **PPT STUDIO & FLOATING POPUP CARD STUDIO 창 크기 조절 + 플로팅 스튜디오 새 창 분리 (`index.html`, `css/studio.css`, `css/editor.css`, `js/studio.js`, `js/effects.js`)**: 두 스튜디오 팝업 모두 좌·우·하단·모서리 드래그로 크기를 자유롭게 조절할 수 있으며, `FLOATING POPUP CARD STUDIO`도 `🖥 새 창 분리` 및 최대화(`⛶`)를 지원.
- **플로팅 팝업 카드 내 그래프·데이터 표·차트 삽입 & 칸별 채우기 (`index.html`, `js/charts.js`, `js/effects.js`)**: 플로팅 팝업 카드 내부에도 6종 차트/표를 삽입·편집할 수 있으며, 일반 슬라이드와 플로팅 카드 모두에서 표의 개별 칸(`td`/`th`) 및 차트 요소를 클릭해 원하는 채우기 색상과 글자색을 직접 입힐 수 있도록 개선.

### Fixed
- **드래그 텍스트 반응형 효과 박스·위치 이탈 충돌 완전 해결 (`css/slides.css`, `js/effects.js`, `js/selection.js`, `js/main.js`)**: 인라인 단어(`.fx-text-span`)에 별도 이동/리사이즈 박스가 씌워져 드래그 시 본래 위치와 효과 시작점이 분리되던 문제를 원천 차단하고, `단어 효과 해제` 전용 버튼을 추가.
- **상단 타이틀 카드 및 일반 카드 상하 리사이즈 시 행 간격 이탈 해결 (`js/selection.js`)**: CSS Grid 행 트랙을 `align-content: start; grid-auto-rows: minmax(min-content, auto)`로 제어하고 동일 행 카드 높이를 동기화하여 상하 크기 조절 시 아래 카드들이 밀리거나 빈 공백이 생기지 않도록 수정.
- **카드 내부 차트·표 유형 선택 삽입 및 상시 크기 조절 해결 (`index.html`, `js/main.js`, `js/charts.js`)**: `+ 선택 카드 내부에 삽입` 시 6종 차트/표 유형을 선택할 수 있으며, 삽입 이후에도 언제든 8방향 핸들로 크기를 조절할 수 있도록 개선.

---

## [v2.8.0] - 2026-11-16 — 호버 레이아웃 시프트 완전 차단, 플로팅 카드 확장, 상단 타이틀 카드 & Undo 컬러 피커 최적화

### Added
- **페이지 상단 타이틀 카드 추가 (`index.html`, `js/navigation.js`, `css/slides.css`)**: `카드·배치` 탭에 `+ 상단 타이틀카드` 버튼을 추가하여 기존 카드들과 동일한 크기 조절·배경·애니메이션·자유배치 호환성을 갖춘 상단 타이틀 카드를 생성할 수 있도록 지원.
- **플로팅 팝업 카드 전체 반응형 효과 & 자유 크기 조절 (`index.html`, `js/effects.js`, `css/editor.css`)**: 플로팅 카드에 7종 반응형 애니메이션, 박스/텍스트 기준 선택, 호버 배경색·그림자·테두리 커스텀을 추가하고, 카드폭 프리셋 ON/OFF 토글 + 가로/세로 직접 입력 및 라이브 드래그 리사이즈 핸들 구현.
- **자유 도형·요소 모서리 라운드 정밀 제어 (`index.html`, `js/media.js`)**: `0~80px` 슬라이더, 숫자 직접 입력, 6종 프리셋(`0px`, `6px`, `12px`, `24px`, `40px`, `원/알약`) 추가.

### Fixed
- **편집 모드 호버 시 카드 크기·간격 급변 완전 차단 (`css/slides.css`, `css/editor.css`)**: `.slide-card > :not(.card-bg-layer):not(.card-edit-controls)` 선택자 보완으로 호버 시 나타나는 카드 컨트롤 바(`.card-edit-controls`)가 `position: relative`로 밀려나며 카드 내부 레이아웃을 밀어내던 근본 원인 해결.
- **드래그 텍스트 반응형 효과 박스/삭제 충돌 및 테두리 OFF 버그 해결 (`css/slides.css`, `js/effects.js`, `js/selection.js`)**: `.fx-text-span`의 점선 박스 테두리를 제거하고 삭제(`Delete`) 시 텍스트가 지워지지 않고 효과만 해제되도록 개선. 또한 `hover-glow`/`hover-spotlight`의 기본 `2px` 테두리 그림자를 제거하여 `테두리 선` 체크 해제 시 테두리가 완전히 사라지도록 수정.
- **카드 내 요소 크기 조절 시 형제 요소 간섭 차단 (`js/main.js`)**: 카드 내부 텍스트·요소 크기 조절 시 다른 요소의 위치·비율에 영향을 주지 않도록 독립 스케일링 처리.
- **컬러 피커·슬라이더 드래그 시 Undo/Redo 중간 기록 누적 방지 (`js/history.js`, `js/main.js`, `js/studio.js`)**: 연속 입력(`input`) 중 중간 스냅샷을 병합하여 최종 확정 시점 1회만 히스토리에 기록되도록 개선.

---

## [v2.7.0] - 2026-11-16 — 자동저장 분리, build.py 번들 자동화, 내부요소 리사이즈 & 플로팅 카드 고도화

### Added
- **카드 내 모든 요소 8방향 크기 조절 (`js/main.js`)**: 카드 내부의 제목(`h1~h4`), 본문(`p`), 라벨(`span`), 위계블록, 차트 등 모든 요소 선택 시 8방향 핸들로 가로·세로 크기 및 모서리 비례 폰트 스케일링이 가능하도록 개선.
- **반응형 애니메이션 그림자·테두리 세부 커스텀 (`index.html`, `js/effects.js`, `css/slides.css`)**: 요소 반응형 애니메이션 적용 시 그림자 ON/OFF·색상·투명도 및 테두리 선 ON/OFF·색상·굵기(`1~8px`)를 개별 조절할 수 있는 UI 추가.
- **플로팅 팝업 카드 위치 지정 & 반응형 애니메이션 (`index.html`, `js/effects.js`, `js/main.js`, `css/slides.css`)**: 팝업 카드별 화면 표시 위치(정중앙, 상·하·좌·우 9분할 프리셋 및 X%/Y% 사용자 좌표)와 반응형 애니메이션(호버 들뜸/줌/광채/3D 틸트/클릭 펄스) 설정 추가.
- **`build.py` 번들 자동 동기화 (`build.py`)**: `python build.py` 실행 시 `js/export.js`의 `window.PPT_STANDALONE_BUNDLE`을 최신 `css/`·`js/` 원본으로부터 자동 재생성하도록 개선.

### Changed
- **핵심 키워드 강조 단축키 전환 (`index.html`, `js/main.js`, `js/navigation.js`)**: 하단 `핵심 키워드 강조` 버튼을 제거하고 단축키 **`H`** (및 편집 중 **`Alt + H`**)로 즉시 토글되도록 변경.
- **플로팅 팝업 닫기 UX 개선 (`index.html`, `js/main.js`)**: 팝업 우측 상단 `✕` 버튼을 제거하여 카드 디자인을 보존하고, 팝업 바깥 영역 클릭 또는 **`Enter` / `Space` / `Esc`** 키로 닫히도록 개선.
- **오프라인 HTML 내보내기 완결성 강화 (`js/export.js`, `css/base.css`)**: 단독 실행 HTML 저장 시 외부 Tailwind CDN 스크립트 태그를 제거하고 시스템 한글/영문 폴백 폰트 스택을 적용하여 완전 오프라인 구동 보장.

### Fixed
- **자동 저장 복구 대기 상태 분리 (`js/storage.js`)**: 복구 안내 배너가 표시된 상태에서도 새 편집 내역이 독립 키에 정상 자동 저장되도록 `AUTOSAVE_PENDING_KEY` 구조로 분리.
- **드래그 텍스트 포커스·주변약화 해제/Undo 시 문장 이탈 해결 (`js/effects.js`, `css/slides.css`)**: `.fx-text-span`을 `display: inline` 흐름으로 유지하고 해제/Undo 시 노드를 정규화(`normalize()`)하여 기존 문장에서 이탈하지 않도록 수정.
- **플로팅 카드 편집기 텍스트 입력 불가 해결 (`css/editor.css`, `js/effects.js`)**: 링크 대상 미선택 상태에서 `+ 새 카드` 생성 시 본문 및 서브박스 텍스트에 `user-select: text` 및 `contenteditable="true"`를 명시 적용.
- **편집 모드 호버 시 카드·요소 크기 급변 차단 (`css/editor.css`)**: 편집 모드 호버 상태에서 `transform`/`scale`/`zoom` 변형을 원천 차단.

---

## [v2.5.1] - 2026-11-16 — 저장본 초기화·목차 동기화·정화 필터 안정화 패치

### Fixed
- **편집용 저장본 오버레이 보존**: `saveModifiedHTML(false)` 실행 시 `#pptSelectionOverlay`가 DOM에서 삭제되어 저장본 재오픈 후 선택·드래그·클릭 이벤트가 무력화되던 치명적 버그 수정 (`#pptSelectionOverlay`는 숨김 처리만 수행하고 발표 전용본에서만 제거).
- **발표 전용본 초기화 중단(`ReferenceError`) 해결**: `js/studio.js`가 제외되는 발표 전용 HTML에서 `init()`의 `bindStudioPopupDrag()` 및 `toggleEditMode()`, `switchStudioTab()` 호출부에 `typeof` 안전 가드를 적용하여 키보드(`←`/`→`/`Space`), 터치, 클릭 트리거가 정상 작동하도록 수정.
- **목차 이동 대상(`data-goto-slide`) 자동 추적·갱신**: 슬라이드 추가(`addNewBlankSlide`), 복제(`duplicateCurrentSlide`), 삭제(`deleteCurrentSlide`), 순서 이동(`moveCurrentSlide`) 시 목차 카드 및 링크 요소의 이동 대상 페이지 번호가 밀리지 않고 자동 갱신되도록 개선.
- **정화 필터(`SAFE_HANDLER_RE`) 버튼 보존**: `storage.js`의 XSS 정화 필터 화이트리스트에 `addNewTocCard`를 추가하여 자동저장 복구 및 파일 불러오기 후에도 `+ 목차 카드 추가` 버튼이 정상 동작하도록 수정.
- **목차 슬라이드 복제 시 모달 중복 방지**: `buildModalGrid()`가 첫 번째 목차 그리드(`[data-toc-grid]`)만 기준으로 항목을 렌더링하도록 수정하여 2번 슬라이드 복제 시 목차 팝업 항목이 24개로 중복되던 현상 해결.

---

## [v2.5.0] - 2026-11-15 — 단독 실행형 저장, 플로팅 카드, 스마트 스냅 & 드래그 텍스트 애니메이션

### Added
- **단독 실행형 HTML 저장 & 발표 전용 내보내기 (`js/export.js`)**: `window.PPT_STANDALONE_BUNDLE`을 통해 외부 폴더 없이 단일 `.html`로 저장하는 **편집용 수정본 저장**과 에디터/단축키를 완전히 제거한 **발표 전용(Read-Only) HTML 내보내기** 추가.
- **CLI 단일 파일 빌더 (`build.py`)**: `css/`와 `js/` 모듈을 `index.html`에 인라인 병합하는 빌드 스크립트 추가.
- **플로팅 팝업 카드 스튜디오 (`index.html`, `js/effects.js`, `css/slides.css`)**: 별도 슬라이드 없이 독립 팝업 카드를 생성·커스텀(배경·투명도·테두리·둥글기·폭·서식·사진·서브박스·배경이미지)하고 발표 중 클릭 시 중앙 확대 라이트박스로 띄우는 기능 추가.
- **드래그한 특정 텍스트 영역 반응형 애니메이션 (`js/effects.js`, `css/slides.css`)**: 텍스트 박스 내 특정 단어만 마우스로 드래그하여 `.fx-text-span`으로 래핑하고 반응형 효과(호버 들뜸/줌/광채/포커스·주변약화 등)를 적용하는 기능 추가.
- **정렬·균등 분배(2개 이상)·그룹화 및 스마트 가이드·자석 스냅 (`js/selection.js`, `js/main.js`, `css/editor.css`)**: 2개 이상 요소의 가로/세로 간격 균등 분배, 6방향 정렬, 그룹화/해제 및 드래그 시 빨간 가이드선과 `px` 간격 배지를 표시하는 자석 스냅 엔진 추가.
- **텍스트 강조 배경 박스 투명도 & 요소 불투명도 조절 (`js/text-editor.js`, `js/media.js`)**: 텍스트 강조 박스 배경 투명도 슬라이더 및 미디어·도형·텍스트박스·카드 불투명도 조절 기능 추가.

### Improved
- **보안 정화 필터 (`js/storage.js`)**: 작업함 불러오기 및 IndexedDB 복구 시 위험 태그(`script`, `iframe` 등)와 비인가 이벤트 핸들러를 제거하는 `sanitizeImportedStageHtml()` 도입.
- **Base64 Data URI 토큰 가비지 컬렉션 (`js/history.js`)**: `undoStack`/`redoStack`에서 더 이상 참조되지 않는 이미지 토큰을 자동 정리하는 `cleanupUnusedDataUriTokens()` 추가.

---

## [v2.0.0] - 2026-11-15 — 모듈러 아키텍처 리팩토링 완료

### Added
- **CSS 모듈 5종 분리 (`css/`)**: `base.css`, `slides.css`, `editor.css`, `studio.css`, `print.css`로 역할별 스타일 분리.
- **JS 모듈 12종 분리 (`js/`)**: 상태(`state.js`), 히스토리(`history.js`), 저장소(`storage.js`), 내비게이션(`navigation.js`), 텍스트 편집(`text-editor.js`), 선택/리사이즈(`selection.js`), 미디어/도형(`media.js`), 차트(`charts.js`), 시각 효과/인터랙션(`effects.js`), 내보내기(`export.js`), 스튜디오 UI(`studio.js`), 초기화(`main.js`)로 기능별 분리.
- **초기화 안전성 강화**: `initStorageListeners()`, `initMediaListeners()`, `initBgUploaderListener()`, `bindKeyboardAndTouchListeners()`로 이벤트 바인딩을 캡슐화하여 `DOMContentLoaded` 시점에 안전하게 초기화되도록 개선.
- **프로젝트 문서 추가 (`docs/`)**: `PROJECT_GUIDE.md` 및 `CHANGELOG.md` 작성.
