# HTML Slide Tool (`v5.8.9`)

**별도 뷰어나 서버 설치 없이 브라우저 하나로 편집·발표·단독 HTML·PPTX·PDF·PNG 저장까지 완성하는 인터랙티브 HTML 프레젠테이션 툴**

> Interactive, zero-CDN, offline-ready HTML presentation builder & player with 24×24 2D Bento Grid, Live Charts, Floating Popup Cards, Brand Kits, and KO/EN UI.

---

## 빠른 시작 (Quick Start)

1. 압축을 해제한 뒤 `HTML_Slide_Tool/index.html` 파일을 Chrome / Edge / Safari / Firefox 브라우저로 엽니다.
2. **`E` 키**를 눌러 편집 모드(3단 하이브리드 워크스페이스)로 진입합니다.
3. 상단 **`✨ 빈 캔버스 시작`** 또는 `슬라이드·덱 → + 새 발표자료`에서 **인터랙티브 쇼케이스 데모** 포함 5종 스타터 템플릿을 선택해 시작할 수 있습니다.
4. 첫 실행 환영 화면(`10초 가이드`), 단축키 도움말(`?`), 또는 `슬라이드·덱` 탭에서 언제든 **`한국어` / `English`** UI 언어를 전환할 수 있습니다.

---

## 핵심 기능 (Key Features)

* **24×24 2D 비대칭 벤토 그리드**: 카드 경계선 4방향 연동 리사이즈, 빈 영역 자동 채우기, `✥ 드래그 이동`으로 카드 상·하·좌·우 즉시 2분할 및 위치 스왑.
* **하이브리드 3단 워크스페이스**: 기본 우측 고정 도킹(캔버스 미가림) · 원클릭 플로팅 팝업 전환 · 드래그 분리 · 듀얼 모니터 별도 브라우저 창 분리.
* **브랜드 키트 & 슬라이드 마스터 프리셋**: 8종 원클릭 디자인 키트(미니멀 화이트, 다크 테크, 에디토리얼, 네이비, 에메랄드, 옵시디언, 코랄, 슬레이트 모노) + 내 커스텀 키트 저장.
* **오프라인 폰트 폴백 & 로컬 시스템 폰트 지원**: OS별(Windows/macOS/Linux) 고딕·명조·모노 폴백 스택 및 설치된 로컬 폰트 직접 지정.
* **웹 네이티브 인터랙티브 위젯 4종 & 편집 중 즉시 테스트(`Alt+P`)**: Before/After 이미지 비교 슬라이더, 이미지·다이어그램 핫스팟 핀, 슬라이드 내 탭 전환 카드, 3D 앞/뒷면 플립 카드, 클릭 단서 힌트, 편집 중 즉시 테스트 모드.
* **살아 움직이는 데이터 차트 & KPI 카운트업**: 슬라이드 진입 시 KPI 숫자 카운트업, 마우스 호버 수치·비중 툴팁, 발표 중 클릭으로 전환하는 `[기본|낙관적|보수적]` 시나리오 토글.
* **라이브 차트·데이터 표·플로팅 팝업 카드**: 6종 차트/표(세로/가로 막대, 꺾은선, 도넛, KPI, 병합/정렬/합계 비교표), CSV 변환, 클릭 시 열리는 인터랙티브 플로팅 팝업 카드.
* **고충실도 다중 포맷 내보내기**:
  * **편집 가능 단독 HTML (`.html`)** & **발표 전용 잠금 HTML (`.html`)** — CSS/JS 완전 내장, 외부 CDN `0건`
  * **PowerPoint (`.pptx`)** — 차트 2× 고해상도 임베드, 편집 가능 표, 네이티브 벡터 도형, 문단별 서식·정렬, 발표자 노트 포함
  * **PDF 인쇄 (`.pdf`)** — `1440×810` (`16:9`/`4:3`/`9:16`) 1:1 비율 및 발표자 노트 포함 인쇄 지원
  * **고충실도 이미지 (`.png` / `.jpg`)** — 차트·그라데이션·도형·미디어 필터·정렬 포함 렌더링
  * **포터블 프로젝트 아카이브 (`.pptstudio.zip` / `.json`)** — 첨부 동영상·오디오 일괄 패키징 및 복원

---

## 단축키 치트시트 (Keyboard Shortcuts Cheat Sheet)

### 발표 모드 (Presentation Mode)
| 단축키 | 동작 |
|---|---|
| `←` / `→` / `Space` / `PageUp` / `PageDown` | 이전 / 다음 슬라이드 이동 (클릭 순서 단계 등장 포함) |
| `F` | 전체화면(100vw × 100vh 무여백) 전환 |
| `H` / `Alt + H` | 핵심 키워드(`.kw`) 형광 강조 ON / OFF |
| `M` | 목차 빠른 이동 모달 열기 / 닫기 |
| `L` | 레이저 포인터 ON / OFF |
| `P` / `C` | 라이브 화면 판서 ON / OFF / 판서 지우기 |
| `B` / `W` | 화면 암전 (블랙 / 화이트) |
| `V` | 듀얼 모니터 발표자 전용 뷰 열기 |
| `Esc` / `Enter` / `Space` | 열린 플로팅 팝업 카드 닫기 |
| `?` | 전체 단축키 일람표 모달 열기 / 닫기 |

### 편집 모드 (Edit Mode)
| 단축키 | 동작 |
|---|---|
| `E` / `Alt + E` | 편집 모드 열기 / 닫기 |
| `Alt + P` | 편집 중 즉시 테스트 모드 ON / OFF (`Esc`로 편집 복귀) |
| `Ctrl + Z` / `Ctrl + Y` | 실행 취소 (Undo) / 다시 실행 (Redo) |
| `Ctrl + C` / `Ctrl + V` | 요소·슬라이드·외부 텍스트/스크린샷 복사 및 붙여넣기 |
| `Ctrl + D` / `Delete` | 선택 요소 즉시 복제 / 삭제 |
| `Ctrl + A` / `Shift + 클릭` | 슬라이드 전체 요소 선택 / 다중 선택 및 그룹 비례 리사이즈 |
| `↑` `↓` `←` `→` (`Shift`: 10px / `Ctrl`: 1px) | 선택 요소 미세 위치 이동 |
| `T` / `Tab` / `Alt + 클릭` | 텍스트박스 즉시 생성 / 요소 순차 선택 / 겹친 요소 관통 선택 |
| `Space + 드래그` | 캔버스 패닝 이동 |
| `Ctrl + F` / `Ctrl + H` | 전체 슬라이드 찾기 및 바꾸기 |
| `Ctrl + S` / `F4` | 작업함 빠른 저장 / 직전 서식 작업 반복 |

---

## 개발 및 배포 빌드 (Build & Verification)

```bash
# 정적 Tailwind CSS 생성, 번들 동기화, 314개 ID·527개 핸들러 불변성 & 구문 자동 검증
python3 -W error build.py --test

# 단독 실행본 빌드 + 검증된 배포 ZIP 패키지 생성
python3 -W error build.py --package
```

---

## 보안 및 Strict CSP 배포 가이드 (Zero-Eval / Zero-CDN)

`HTML Slide Tool v5.0.19`은 `index.html`은 물론 15개 JS 모듈이 동적으로 생성하는 모든 마크업에서도 인라인 `on*=` 이벤트 핸들러, `eval()`, `new Function()`, `with()`, 외부 Tailwind Play CDN을 100% 제거한 **Zero-Eval · Zero-Inline-Handler Strict CSP 아키텍처**입니다 (`script-src 'self'`에서 `'unsafe-inline'`·`'unsafe-eval'` 모두 불필요). 웹 서버(Nginx, GitHub Pages, 사내 인트라넷 등)에 배포할 때 아래의 엄격한 CSP 헤더를 그대로 적용할 수 있습니다.

```http
Content-Security-Policy: default-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' data: blob: https:; frame-src https:;
```

*(참고: 단일 파일로 저장하는 단독 실행 `.html` 내보내기본은 인라인 `<script>` 태그를 포함하므로 브라우저 로컬 실행(`file://`) 환경에서 별도 서버 없이 즉시 동작합니다.)*

---

## PWA 오프라인 앱 설치 및 네이티브 파일 저장 (`v5.1.0`)

`HTML Slide Tool v5.1.0`은 별도 번들러(Webpack/Vite) 없는 순수 HTML/CSS/JS 작업 방식을 그대로 유지하면서 **PWA(Progressive Web App)**와 **네이티브 파일 덮어쓰기 저장(File System Access API)**을 지원합니다.

1. **원클릭 웹 배포 및 앱 설치**:
   * 이 폴더(`HTML_Slide_Tool/`)를 GitHub Pages, Cloudflare Pages, Netlify 등 정적 호스팅에 그대로 업로드하면 별도 빌드 없이 즉시 배포됩니다.
   * 웹 주소(`https://` 또는 `http://localhost`)로 접속하면 상단 헤더에 **`📲 앱 설치`** 버튼이 나타나며, 클릭 한 번으로 바탕화면/작업표시줄 독립 앱으로 설치해 오프라인에서도 실행할 수 있습니다.
   * 로컬에서 PWA·유튜브 인라인 재생·네이티브 저장을 바로 테스트하려면 폴더에서 아래 명령어 한 줄만 실행하세요:
     ```bash
     python3 -m http.server 8080
     ```
     이후 Chrome/Edge에서 `http://localhost:8080/index.html` 접속.

2. **네이티브 파일 바로 덮어쓰기 단축키 (Chrome / Edge 데스크톱)**:
   * **`Ctrl+O`**: OS 파일 열기 창으로 `.html` / `.json` / `.pptstudio.zip` 파일 열기 (열린 파일이 상단 헤더에 표시됨)
   * **`Ctrl+S`**: 연결된 원본 파일에 **다운로드 폴더 중복 생성 없이 바로 덮어쓰기 저장** (미연결 상태에서는 첫 저장 위치 선택 창 표시; 미지원 브라우저는 작업함 저장으로 자동 폴백)
   * **`Ctrl+Shift+S`**: 다른 이름으로 파일 저장 (`.html` / `.json` / `.pptstudio.zip` 선택)

---

## Playwright Chromium E2E 자동 검증 & GitHub Actions CI/CD (`v5.2.0`)

기존 순수 HTML/CSS/JS 무번들러 구조를 그대로 유지하면서, GitHub에 코드를 올릴 때마다 **실제 최신 Chromium 브라우저 + Strict CSP HTTP 서버**로 자동 검증 및 GitHub Pages 배포를 수행할 수 있습니다.

* **포함된 자동화 구성**:
  * `.github/workflows/ci.yml`: Push/PR마다 `build.py --test` 정적 감사 + `Playwright Chromium E2E` 7개 핵심 시나리오 자동 실행 (실패 시 스크린샷·리포트 아티팩트 저장)
  * `.github/workflows/deploy-pages.yml`: 정적 검증 통과 후 `tests/`·`.github/` 등을 제외한 깨끗한 웹 앱 파일만 `_site/`로 묶어 GitHub Pages에 자동 배포
  * `tests/csp-server.py`: `script-src 'self'` Strict CSP 헤더를 실제 전송하는 무의존성 Python 테스트 서버
  * `tests/e2e.spec.mjs`: Strict CSP 위반 감시, PWA Service Worker, 편집 서식/정렬, 목차 개수 자동 생성, 2D 벤토·4종 위젯, `@media print` 1440×810 인쇄 실측, HTTP YouTube 임베드, 발표자 뷰 팝업 크기 조절, PPTX·단독 HTML 다운로드, Undo/Redo 자동 검증
* **GitHub 저장소에서 자동 배포 켜기**:
  * GitHub 저장소의 **`Settings → Pages → Build and deployment → Source`**를 **`GitHub Actions`**로 선택하면 이후 Push마다 자동 배포됩니다.
* **내 PC에서 직접 Playwright E2E 실행하기 (Node.js 설치 시)**:
  ```bash
  npm install
  npx playwright install chromium
  npm run test:e2e
  ```
