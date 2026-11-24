# HTML Slide Tool — 모듈러 아키텍처 가이드
> **현재 버전**: `v5.6.9` (대중 배포용 HTML Slide Studio 대규모 개편 완결판 — 전체화면(`F`/`F11`) 엣지-투-엣지(`100vw×100vh`) 여백 제거, Figma/Canva/PowerPoint 3단 워크스페이스 & 상단 컨텍스트 바 & 4대 핵심 탭 통합, 좌측 필름스트립 썸네일 사이드바, 레이아웃별 슬라이드 추가, 16:9/4:3/9:16 비율 전환, 최근 색상/스포이드, 클립보드 스크린샷·드래그 앤 드롭 삽입, 표 Tab 이동, PPTX 내보내기/가져오기, 자동 슬라이드 번호 토큰, 화면비 고정 잠금 & px 크기 입력)

## 1. 프로젝트 개요
단일 HTML 파일로 구성되었던 **프레젠테이션 스튜디오(HTML Slide Tool)** 웹 애플리케이션을 유지보수성과 확장성이 뛰어난 모듈러 구조(`HTML / CSS / JS`, 총 15개 JS 모듈)로 분할한 프로젝트입니다.

## 2. 디렉토리 구조
```text
HTML_Slide_Tool/
├── index.html              # 기본 뼈대, 슬라이드 마크업, 모달 및 모듈 로드 진입점
├── build.py                # css/ 및 js/ 자산을 단일 HTML 파일로 번들링하는 빌드 스크립트
├── css/
│   ├── tailwind.built.css  # 빌드 시 자동 생성되는 프로덕션 정적 Tailwind CSS (Preflight + 유틸리티, 무-CDN)
│   ├── base.css            # 전역 CSS 변수(--accent-color), 박스 모델 리셋, 스크롤바
│   ├── slides.css          # 슬라이드 전환(Transition), 다크 테마, 카드/레이어 구조, 애니메이션·차트 스타일
│   ├── editor.css          # 편집 모드(body.edit-mode) 가이드라인, 마퀴 선택 박스, 8방향 오버레이, 스마트 가이드
│   ├── studio.css          # 플로팅 드래그형 HTML Slide Tool 인스펙터 패널 및 탭 스타일
│   └── print.css           # 16:9 가로형(13.333in x 7.5in) PDF/인쇄 전용 스타일
├── js/
│   ├── state.js            # 전역 상태 변수 및 공통 DOM/색상/레이어 헬퍼 함수
│   ├── history.js          # Base64 Data URI 토큰화, 미참조 토큰 정리(GC) 및 Undo/Redo 스냅샷 관리
│   ├── storage.js          # LocalStorage 작업함, XSS 정화 필터 및 IndexedDB 실시간 자동저장/복구
│   ├── navigation.js       # 슬라이드 이동, 진행률 바 스크러빙, 목차 번호 정리 및 이동 대상 자동 갱신, 슬라이드/카드 CRUD
│   ├── text-editor.js      # 글꼴, 크기, 정렬, 형광펜(토글/해제), 핵심 키워드(.kw), 서식 복사, 라운드 강조 박스(투명도 포함)
│   ├── selection.js        # 단일/다중 선택 오버레이, 24컬럼 벤토 그리드 리사이즈, 정렬·균등 분배(2개 이상)·그룹화, 레이어/위계 관리
│   ├── media.js            # 카드 내 미디어 프레임, 이미지 리사이징/내장, 동영상 경로 관리, 자유 도형 삽입, 요소 불투명도 조절
│   ├── charts.js           # 6종(막대 가로/세로, 선, 도넛, 표, KPI) 차트 생성 및 브랜드 포인트 컬러 연동/개별 색상 편집
│   ├── theme.js            # 그라데이션/페이드 마스크, 블러, 테마/배경, 브랜드 키트 8종 & 커스텀 키트
│   ├── effects.js          # 호버·클릭 반응형 모션 11종, 슬라이드 트랜지션, 화면비 전환, 등장 애니메이션 14종 & 클릭 순서
│   ├── floating-cards.js   # 인터랙티브 버튼 트리거/링크, 플로팅 팝업 카드 스튜디오, 라이트박스(페이지형/동시표시)
│   ├── widgets.js          # 웹 네이티브 인터랙티브 위젯 4종(Before/After, 핫스팟, 탭 카드, 3D 플립) & 클릭 힌트
│   ├── export.js           # 저장 선택 모달 및 3가지 저장 방식(편집 가능 HTML / 발표 전용 HTML / PDF 인쇄) 지원
│   ├── studio.js           # HTML Slide Tool 팝업 드래그, 탭 제어, 편집 모드 토글, 듀얼 모니터 새 창 분리/복귀
│   └── main.js             # 스마트 스냅 엔진, 스테이지 마우스/키보드/터치 이벤트 바인딩 및 DOMContentLoaded 초기화
└── docs/
    ├── PROJECT_GUIDE.md    # 아키텍처 및 12개 모듈 의존성 설명서
    ├── CHANGELOG.md        # 버전별 변경 이력
    └── ROADMAP_PROGRESS.md # 대중 배포용 8단계 개편 로드맵 및 진행 기록
```

## 3. 스크립트 로드 순서 및 의존성 규칙 (12개 JS 모듈)
본 프로젝트는 번들러 없이 브라우저에서 직접 실행(`file://` 또는 정적 웹 서버)되도록 설계되었으며, 전역 스코프 공유를 위해 아래 12개 스크립트 로드 순서를 반드시 유지해야 합니다.

1. `js/state.js` — 모든 모듈이 참조하는 상태 변수 및 유틸리티 함수 정의
2. `js/history.js` — `state.js`의 스택/토큰 맵을 사용하여 상태 스냅샷 저장, 토큰 GC 및 복원
3. `js/storage.js` — `history.js`의 `restoreStageHtml`, XSS 정화 필터 및 `state.js`의 자동저장 상태 참조
4. `js/navigation.js` — 슬라이드 이동, 목차(`data-toc-grid`) 번호 정리 및 슬라이드 추가/복제/삭제/이동 시 이동 대상(`data-goto-slide`) 자동 갱신
5. `js/text-editor.js` — 텍스트 서식, 형광펜 토글/해제, 핵심 키워드 및 라운드 박스(투명도 조절 포함) 편집
6. `js/selection.js` — 선택 오버레이, 다중 그리드 리사이즈, 정렬·균등 분배(2개 이상)·그룹화, 그리드 분리, 폴더형 레이어 트리 관리
7. `js/media.js` — 카드 내/자유 미디어 삽입, 비율 고정 배율 조절, 도형 삽입 및 불투명도 조절
8. `js/charts.js` — 6종(막대 가로/세로, 선, 도넛, 표, KPI) 위젯 렌더링, 인라인 편집 및 포인트 컬러 연동 (`selection.js`의 `syncChartInspectorUI` 호출 대상)
9. `js/theme.js` — 그라데이션/페이드 마스크, 블러, 배경/테마 및 브랜드 키트 프리셋
10. `js/effects.js` — 반응형 모션 11종, 등장 모션 14종, 트랜지션 및 화면비 전환(`data-lens-box`)
11. `js/floating-cards.js` — 트리거·링크 액션, 플로팅 팝업 카드 스튜디오 및 라이트박스
12. `js/widgets.js` — Before/After 비교 슬라이더, 핫스팟 핀, 탭 전환 카드, 3D 플립 카드
13. `js/export.js` — 3가지 저장 방식(편집 가능 수정본 HTML / 발표 전용 Read-Only HTML / 16:9 가로형 PDF 인쇄) 제공
14. `js/studio.js` — HTML Slide Tool 인스펙터 창 드래그, 탭 전환, 편집 모드 토글 및 새 창 분리
15. `js/main.js` — 모든 모듈 함수가 정의된 후 마지막에 로드되어 스마트 가이드·스냅, 이벤트 바인딩 및 `init()` 실행

## 4. 운영 및 배포 빌드 규칙
- **앱 내 저장 (단독 실행 파일 생성)**: 앱 하단 `저장` 버튼을 통한 **편집용 HTML 저장** 및 **발표 전용 HTML 내보내기**는 `css/`와 `js/` 자산을 내부에 인라인으로 내장한 단독 실행 파일이므로, 외부 폴더 없이 어느 경로에서든 단독으로 열립니다.
- **CLI 단일 파일 배포 빌드**: 터미널에서 `python build.py`를 실행하면 `css/`와 `js/`를 병합한 `GoPro_중간발표_수입산브랜드_단독실행본.html`이 생성되며, `export.js` 내부의 `window.PPT_STANDALONE_BUNDLE` 사본을 포함하므로 앱 내 저장본보다 용량이 더 큽니다(약 1.1MB).

## 5. 모듈 수정 시 필수 규칙
1. **번들 동기화 필수**: `css/` 또는 `js/` 파일을 수정하면 `python build.py`를 실행해 `js/export.js` 1번 줄의 `window.PPT_STANDALONE_BUNDLE`을 자동 재생성해야 합니다. (재생성하지 않으면 앱 내 저장본에 수정 전 옛 코드가 포함됩니다.)
2. **내보내기 소스 자동 번들링**: `python build.py` 실행 시 `js/export.js` 본문 전체가 `window.PPT_STANDALONE_BUNDLE['js/export.js']`로 자동 포함되어 단독 저장본 재저장 시에도 모든 내보내기 헬퍼 함수가 누락 없이 인라인됩니다.
3. **발표 전용본 `typeof` 안전 가드**: 발표 전용 HTML 내보내기(`saveModifiedHTML(true)`)는 `js/studio.js`와 `js/export.js`를 제외합니다. 다른 모듈에서 이 두 파일의 함수를 호출할 때는 반드시 `typeof fn === 'function'` 가드를 사용해야 합니다.
4. **슬라이드 내부 `id` 사용 금지**: 슬라이드 복제(`duplicateCurrentSlide`) 시 중복 ID 충돌을 방지하기 위해 `.slide` 내부 요소에는 `id` 속성을 사용하지 않고 `data-*` 속성과 활성 슬라이드(`.slide.active`) 범위 검색을 사용합니다.

## 6. 주요 단축키 안내
- **`E`** 또는 **`Alt + E`** : HTML Slide Tool 편집 모드 열기 / 닫기 (발표 전용본에서는 비활성화)
- **`H`** 또는 **`Alt + H`** : 핵심 키워드(`.kw`) 형광 강조 ON / OFF 토글
- **`←` / `→` / `Space` / `PageUp` / `PageDown`** : 이전 / 다음 슬라이드 이동 (발표 모드)
- **`↑` / `↓` / `←` / `→` (`Shift` 조합 시 10px)** : 선택 요소 미세 위치 이동 (편집 모드)
- **`Esc` / `Enter` / `Space`** : 플로팅 팝업 카드가 열려 있을 때 팝업 닫기 (`Esc`는 선택 해제·모달 닫기·편집 종료 겸용)
- **`M`** : 목차 빠른 이동 모달 열기 / 닫기
- **`F`** : 전체화면 전환
- **`Ctrl + Z` / `Ctrl + Y`** : 실행 취소 (Undo) / 다시 실행 (Redo)
- **`Ctrl + D` / `Delete`** : 선택 요소 복제 / 삭제 (편집 모드)
- **`Shift + 클릭` 또는 빈 공간 드래그** : 다중 요소 선택 및 그룹 비례 크기 조절
