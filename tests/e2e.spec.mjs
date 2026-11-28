import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

test.describe('HTML Slide Tool — Real Chromium E2E & Strict CSP Suite', () => {
  let pageErrors = [];
  let cspViolations = [];

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    cspViolations = [];

    // Pre-mark onboarding guide as seen & attach Strict CSP violation listener before app scripts run
    await page.addInitScript(() => {
      try {
        localStorage.setItem('html_slide_studio_onboarding_seen_v1', 'true');
      } catch (e) {}
      window.__e2eCspViolations = [];
      document.addEventListener('securitypolicyviolation', (ev) => {
        window.__e2eCspViolations.push({
          directive: ev.violatedDirective,
          effective: ev.effectiveDirective,
          blockedURI: ev.blockedURI,
          sample: ev.sample || '',
        });
      });
    });

    page.on('pageerror', (err) => {
      pageErrors.push(`${err.name}: ${err.message}`);
    });

    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#slideStage .slide.active')).toHaveCount(1);
  });

  test.afterEach(async ({ page }) => {
    const domViolations = await page.evaluate(() => window.__e2eCspViolations || []).catch(() => []);
    cspViolations.push(...domViolations);
    expect(pageErrors, `Uncaught pageerror(s): ${JSON.stringify(pageErrors)}`).toEqual([]);
    expect(cspViolations, `Strict CSP violation(s): ${JSON.stringify(cspViolations)}`).toEqual([]);
  });

  test('01. Strict CSP Header, Zero Inline on*= Handlers & PWA Service Worker Registration', async ({ page, request }) => {
    const resp = await request.get('/index.html');
    expect(resp.status()).toBe(200);
    const csp = resp.headers()['content-security-policy'] || '';
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");

    const manifestResp = await request.get('/manifest.webmanifest');
    expect(manifestResp.status()).toBe(200);
    const manifestJson = await manifestResp.json();
    expect(manifestJson.display).toBe('standalone');

    const rawInlineCount = await page.evaluate(() => {
      const evts = ['onclick', 'oninput', 'onchange', 'onmousedown', 'onkeydown', 'onblur', 'ondrop'];
      let hits = 0;
      document.querySelectorAll('*').forEach((el) => {
        for (const attr of Array.from(el.attributes || [])) {
          if (evts.includes(attr.name.toLowerCase())) hits++;
        }
      });
      return hits;
    });
    expect(rawInlineCount).toBe(0);

    const swRegistered = await page.evaluate(async () => {
      if (!navigator.serviceWorker) return false;
      const reg = await navigator.serviceWorker.ready;
      return Boolean(reg && reg.active);
    });
    expect(swRegistered).toBe(true);
  });

  test('02. Edit Mode, Contextual Top Bar, Single-Element Formatting & Alignment', async ({ page }) => {
    await page.keyboard.press('e');
    await expect(page.locator('body')).toHaveClass(/edit-mode/);
    await expect(page.locator('#pptStudioPopup')).toHaveClass(/open/);

    // Click Card -> Contextual Shape Bar & Design-Card section
    const firstCard = page.locator('.slide.active .slide-card').first();
    await firstCard.click({ position: { x: 24, y: 24 } });
    await expect(page.locator('#ctxBar-shape')).toBeVisible();

    // Click normal-weight body paragraph (1st <p> is already font-bold eyebrow) -> Contextual Text Bar & Formatting
    const para = page.locator('.slide.active p.font-normal').first();
    await para.click();
    await expect(page.locator('#ctxBar-text')).toBeVisible();

    await page.evaluate(() => {
      window.getSelection().removeAllRanges();
      execFormat('bold');
      execFormat('italic');
      execFormat('justifyCenter');
    });

    const styles = await para.evaluate((el) => ({
      fw: el.style.fontWeight,
      fs: el.style.fontStyle,
      ta: el.style.textAlign,
    }));
    expect(styles.fw).toBe('800');
    expect(styles.fs).toBe('italic');
    expect(styles.ta).toBe('center');

    // Toggle bold back OFF -> 400
    await page.evaluate(() => {
      window.getSelection().removeAllRanges();
      execFormat('bold');
    });
    const fwAfterToggleOff = await para.evaluate((el) => el.style.fontWeight);
    expect(fwAfterToggleOff).toBe('400');

    // Alt+P Live Test Mode hides selection overlay cleanly
    await page.keyboard.press('Alt+p');
    await expect(page.locator('body')).toHaveClass(/interactive-test-mode/);
    await expect(page.locator('#pptSelectionOverlay')).not.toHaveClass(/visible/);
    await page.keyboard.press('Alt+p');
    await expect(page.locator('body')).toHaveClass(/edit-mode/);
  });

  test('03. TOC Auto-Page Generator (Count -> Slides) & Removal of Legacy "+ 목차 추가" Button', async ({ page }) => {
    await page.keyboard.press('e');
    await expect(page.locator('#slideStage button[data-on-click*="addNewTocCard"]')).toHaveCount(0);

    await page.evaluate(() => {
      switchStudioTab('deck');
      const inp = document.getElementById('tocAutoPageCountInput');
      if (inp) inp.value = '5';
      generateTocAndSlidesByCount();
    });

    // Cover (1) + TOC (1) + 5 Content Slides = 7 Slides
    await expect(page.locator('#slideStage .slide')).toHaveCount(7);
    await expect(page.locator('#slideStage [data-toc-grid] .toc-card')).toHaveCount(5);

    const targets = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#slideStage [data-toc-grid] .toc-card')).map((el) =>
        el.getAttribute('data-goto-slide')
      )
    );
    expect(targets).toEqual(['3', '4', '5', '6', '7']);
  });

  test('04. 2D Bento Grid, All 4 Interactive Widgets & Live Chart Scenarios (Zero CSP Violations)', async ({ page }) => {
    await page.keyboard.press('e');
    await page.evaluate(() => {
      addSlideWithLayout('bento-2d');
      addTitleCardToCurrentSlide();
    });
    const bentoTitleOk = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.slide.active .slide-grid-body > .slide-card'));
      const first = getBento2DCoords(cards[0]);
      return cards.length === 4 && first.rs === 1 && first.rh === 4 && cards.slice(1).every((c) => getBento2DCoords(c).rs >= 5);
    });
    expect(bentoTitleOk).toBe(true);

    // Tabbed Card & Hotspot & KPI Scenarios
    await page.evaluate(() => {
      addSlideWithLayout('hotspot');
      clearSelectionInspector();
      insertInteractiveWidget('tabbed-card', 'slide');
    });
    const tab2Btn = page.locator('.slide.active .iw-tab-btn').nth(1);
    await tab2Btn.click();
    await expect(page.locator('.slide.active .iw-tab-panel').nth(1)).toHaveClass(/is-active/);

    await page.evaluate(() => {
      addSlideWithLayout('kpi-dashboard');
    });
    await page.locator('.slide.active .chart-scenario-btn').nth(1).click();
    await expect(page.locator('.slide.active .chart-scenario-btn').nth(1)).toHaveClass(/is-active/);
  });

  test('05. Real Chromium @media print Layout Verification (Zero Top-Left Shift or Clipping)', async ({ page }) => {
    await page.emulateMedia({ media: 'print' });

    const rects = await page.evaluate(() => {
      const s1 = document.querySelector('#slideStage .slide[data-slide="1"]');
      const s2 = document.querySelector('#slideStage .slide[data-slide="2"]');
      const cs1 = window.getComputedStyle(s1);
      const r1 = s1.getBoundingClientRect();
      const r2 = s2.getBoundingClientRect();
      return {
        s1Transform: cs1.transform,
        s1Left: Math.round(r1.left),
        s1Top: Math.round(r1.top),
        s1W: Math.round(r1.width),
        s1H: Math.round(r1.height),
        s2W: Math.round(r2.width),
        s2H: Math.round(r2.height),
      };
    });

    expect(rects.s1Transform).toBe('none');
    expect(rects.s1Left).toBe(0);
    expect(rects.s1Top).toBe(0);
    expect(rects.s1W).toBe(1440);
    expect(rects.s1H).toBe(810);
    expect(rects.s2W).toBe(1440);
    expect(rects.s2H).toBe(810);

    await page.emulateMedia({ media: 'screen' });
  });

  test('06. YouTube Embed on HTTP Origin & Presenter View Resizable Popup', async ({ page, context }) => {
    await page.keyboard.press('e');
    await page.evaluate(() => {
      goToSlide(3);
      clearSelectionInspector();
      insertWebEmbedWidget('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    const ytIframe = page.locator('.slide.active .ppt-embed-widget iframe').first();
    await expect(ytIframe).toBeVisible();
    const ytAttrs = await ytIframe.evaluate((el) => ({
      src: el.getAttribute('src') || '',
      hasSandbox: el.hasAttribute('sandbox'),
      refPolicy: el.getAttribute('referrerpolicy') || '',
    }));
    expect(ytAttrs.src).toContain('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(ytAttrs.src).toContain('origin=');
    expect(ytAttrs.hasSandbox).toBe(false);
    expect(ytAttrs.refPolicy).toBe('strict-origin-when-cross-origin');

    // Open Presenter View Popup & verify resizable Current Slide controls
    const popupPromise = context.waitForEvent('page');
    await page.evaluate(() => openPresenterViewWindow());
    const pvPage = await popupPromise;
    await pvPage.waitForLoadState('domcontentloaded');

    await expect(pvPage.locator('#pvCurrentVisualBox .slide')).toHaveCount(1);
    await pvPage.locator('#pvPresetMaxBtn').click();
    await expect(pvPage.locator('#pvNextPanel')).toBeHidden();
    await pvPage.locator('#pvPresetDefaultBtn').click();
    await expect(pvPage.locator('#pvNextPanel')).toBeVisible();
    await pvPage.close();
  });

  test('07. Real Downloads (PPTX Binary Magic + Standalone Presentation HTML) & Aspect Ratios + Undo/Redo', async ({ page }) => {
    await page.keyboard.press('e');

    // Test Aspect Ratio switching (16:9 -> 4:3 -> 9:16 -> 16:9)
    for (const [ratio, expW, expH] of [
      ['4:3', '1080px', '810px'],
      ['9:16', '810px', '1440px'],
      ['16:9', '1440px', '810px'],
    ]) {
      await page.evaluate((r) => setDeckAspectRatio(r, true), ratio);
      const dims = await page.evaluate(() => ({
        w: document.documentElement.style.getPropertyValue('--stage-w').trim(),
        h: document.documentElement.style.getPropertyValue('--stage-h').trim(),
      }));
      expect(dims).toEqual({ w: expW, h: expH });
    }

    // Trigger real PPTX download and verify valid ZIP/OOXML magic header (PK\x03\x04)
    const pptxDownloadPromise = page.waitForEvent('download');
    await page.evaluate(() => exportDeckAsPPTX());
    const pptxDl = await pptxDownloadPromise;
    expect(pptxDl.suggestedFilename()).toMatch(/\.pptx$/i);
    const pptxPath = await pptxDl.path();
    const pptxBuf = await fs.readFile(pptxPath);
    expect(pptxBuf.length).toBeGreaterThan(2000);
    expect(pptxBuf[0]).toBe(0x50); // 'P'
    expect(pptxBuf[1]).toBe(0x4b); // 'K'

    // Trigger Presentation-Only Standalone HTML download and verify editor chrome & manifest stripped
    const htmlDownloadPromise = page.waitForEvent('download');
    await page.evaluate(() => saveModifiedHTML(true));
    const htmlDl = await htmlDownloadPromise;
    expect(htmlDl.suggestedFilename()).toMatch(/\.html$/i);
    const htmlPath = await htmlDl.path();
    const htmlText = await fs.readFile(htmlPath, 'utf8');
    expect(htmlText).toContain('data-presentation-only="true"');
    expect(htmlText).not.toContain('id="pptStudioPopup"');
    expect(htmlText).not.toContain('rel="manifest"');

    // Undo / Redo check
    await page.evaluate(() => {
      goToSlide(1);
      const h1 = document.querySelector('.slide.active h1');
      h1.textContent = 'Playwright 수정 제목';
      saveHistorySnapshot('Playwright 테스트 수정');
    });
    await expect(page.locator('.slide.active h1')).toContainText('Playwright 수정 제목');
    await page.evaluate(() => undoAction());
    await expect(page.locator('.slide.active h1')).not.toContainText('Playwright 수정 제목');
    await page.evaluate(() => redoAction());
    await expect(page.locator('.slide.active h1')).toContainText('Playwright 수정 제목');
  });

  test('08. v5.2.2 QA Regressions (3D Flip Reset, Paste/Duplicate Isolation, Find/Replace Locks, Table SUM Auto-Recalc, Overflow Hidden Skip)', async ({ page }) => {
    await page.keyboard.press('e');

    // A. 3D Flip Card resets is-editing-back & button text on leaving Edit Mode
    const flipResetOk = await page.evaluate(() => {
      goToSlide(3);
      clearSelectionInspector();
      insertInteractiveWidget('flip-card', 'slide');
      const w = document.querySelector('.slide.active [data-iw-type="flip-card"]');
      const btn = w.querySelector('button[data-on-click*="toggleIwFlipEditSide"]');
      toggleIwFlipEditSide(btn);
      const wasBack = w.querySelector('.iw-flip-scene').classList.contains('is-editing-back');
      toggleEditMode(false);
      const clearedOnPres = !w.querySelector('.iw-flip-scene').classList.contains('is-editing-back') &&
                            btn.textContent.includes('뒷면 편집');
      toggleEditMode(true);
      return wasBack && clearedOnPres;
    });
    expect(flipResetOk).toBe(true);

    // B. Table Summary Row (SUM) auto-recalculates when body cell changes
    const summaryRecalcOk = await page.evaluate(() => {
      clearSelectionInspector();
      insertChartOrTable('table', 'slide');
      const w = getSelectedChartWidget();
      const d = readChartData(w);
      d.tableRows = [['A', '10', '20'], ['B', '30', '40']];
      writeChartDataAndRender(w, d);
      appendTableSummaryRow('sum');
      const cellA = w.querySelector('td[data-cell-key="td-0-1"]');
      cellA.textContent = '50';
      onTableCellInlineEdit(cellA, 0, 1);
      const sumCell = w.querySelector('td[data-cell-key="td-2-1"]');
      const dAfter = readChartData(w);
      return sumCell && sumCell.textContent.trim() === '80' && dAfter.tableRows[2][1] === '80';
    });
    expect(summaryRecalcOk).toBe(true);

    // C. Find & Replace skips locked slides & excludes widget UI chrome
    const findLockOk = await page.evaluate(() => {
      slides[0].setAttribute('data-slide-locked', 'true');
      const origH1 = slides[0].querySelector('h1').textContent;
      document.getElementById('findQueryInput').value = '프레젠테이션';
      document.getElementById('replaceQueryInput').value = 'CHANGED_TEXT';
      replaceAllFindMatches();
      const untouched = slides[0].querySelector('h1').textContent === origH1;
      slides[0].removeAttribute('data-slide-locked');
      return untouched;
    });
    expect(findLockOk).toBe(true);

    // D. Paste on locked slide is blocked & duplicate isolates group IDs
    const pasteAndDupOk = await page.evaluate(async () => {
      goToSlide(3);
      clearSelectionInspector();
      insertFreeShape('rect');
      const s1 = selectedElement;
      insertFreeShape('circle');
      const s2 = selectedElement;
      selectElementForInspector(s1, false);
      selectElementForInspector(s2, true);
      groupSelectedElements();
      const origGid = s1.getAttribute('data-group-id');

      // Duplicate single element from group -> clone must NOT share origGid
      selectElementForInspector(s1, false);
      duplicateSelectedElement();
      const singleCloneGid = selectedElement.getAttribute('data-group-id');

      // Paste onto locked slide -> blocked!
      copySelectedElements();
      const cntBefore = slides[2].querySelectorAll('.ppt-free-obj').length;
      slides[2].setAttribute('data-slide-locked', 'true');
      await pasteCopiedElements(false);
      const blockedOnLock = slides[2].querySelectorAll('.ppt-free-obj').length === cntBefore;
      slides[2].removeAttribute('data-slide-locked');
      return Boolean(origGid) && !singleCloneGid && blockedOnLock;
    });
    expect(pasteAndDupOk).toBe(true);

    // E. Format Painter cancels on Escape & Overflow Audit skips hidden slides
    const escAndOverflowOk = await page.evaluate(() => {
      goToSlide(1);
      selectElementForInspector(document.querySelector('.slide.active p.font-normal'), false);
      toggleFormatPainter();
      const wasActive = isFormatPainterActive === true;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      const cancelledByEsc = isFormatPainterActive === false;
      return wasActive && cancelledByEsc;
    });
    expect(escAndOverflowOk).toBe(true);
  });

  test('09. v5.3.1 Non-Modal Floating Card Preview Panel & Unified Main Studio Editing', async ({ page }) => {
    await page.keyboard.press('e');
    await page.evaluate(() => openFloatingCardEditor(null));

    const zOrderOk = await page.evaluate(() => {
      const z = (id) => parseInt(window.getComputedStyle(document.getElementById(id)).zIndex, 10) || 0;
      return activeEditingContext === 'floating-card' &&
             z('pptStudioPopup') >= 60 &&
             z('pptStudioPopup') > z('pptSelectionOverlay') &&
             z('pptSelectionOverlay') > z('floatingCardEditorModal') &&
             z('floatingCardEditorModal') > z('pptContextualTopBar');
    });
    expect(zOrderOk).toBe(true);

    // Insert Chart & Interactive Widget via Main Studio -> lands inside #fcRichBodyEditor
    const insertedOk = await page.evaluate(() => {
      const fcEd = document.getElementById('fcRichBodyEditor');
      insertChartOrTable('bar-v');
      insertInteractiveWidget('tabbed-card');
      const hasBoth = fcEd.querySelectorAll('.ppt-chart-widget').length === 1 &&
                      fcEd.querySelectorAll('.ppt-interactive-widget').length === 1;
      // Duplicate & Delete inside FC canvas cleanly
      duplicateSelectedElement();
      const duped = fcEd.querySelectorAll('.ppt-interactive-widget').length === 2;
      deleteSelectedElement();
      const deleted = fcEd.querySelectorAll('.ppt-interactive-widget').length === 1;
      return hasBoth && duped && deleted;
    });
    expect(insertedOk).toBe(true);

    // Leaving Edit Mode auto-closes Non-Modal Floating Card Preview Panel
    await page.evaluate(() => toggleEditMode(false));
    await expect(page.locator('#floatingCardEditorModal')).toHaveClass(/hidden/);
  });

  test('10. v5.4.0 User-Reported Fixes (Free Card Resize/Inner Delete, Table Font Export & Equalize, Header Bar Style/Resize, FC Separate Textboxes, 4-Target Blur/Opacity & Focal/Fit)', async ({ page }) => {
    await page.keyboard.press('e');

    const allFixedOk = await page.evaluate(() => {
      goToSlide(3);

      // 1. Top title bar (.slide-header-bar) accepts background color change
      const hdr = slides[2].querySelector('.slide-header-bar');
      selectElementForInspector(hdr, false);
      applySelectedCardBgColor('#1E293B', false);
      const hdrColored = hdr.getAttribute('data-card-bg-hex') === '#1E293B';

      // 2. Unified BG Focal & Fit apply to actual .slide-bg-layer (not parent slide)
      const bgSel = document.getElementById('unifiedBgTargetSelect');
      if (bgSel) bgSel.value = 'slide';
      setBackgroundFocalPosition('top center');
      setBackgroundFitMode('contain');
      const bgLayer = slides[2].querySelector(':scope > .slide-bg-layer');
      const focalFitOk = bgLayer && bgLayer.style.backgroundPosition.includes('top') && bgLayer.style.backgroundSize === 'contain';

      // 3. 4-target Opacity & Blur apply to slide bg
      document.getElementById('cardBgOpacitySlider').value = '60';
      applyOpacityToTarget('slide');
      document.getElementById('blurRangeSlider').value = '8';
      applyBlurToTarget('slide');
      const opBlurOk = bgLayer && bgLayer.style.opacity === '0.6' && bgLayer.style.filter.includes('blur(8px)');

      // 4. Table fontSize persists into data-chart-json & survives equalizeTableRowHeights()
      clearSelectionInspector();
      insertChartOrTable('table', 'slide');
      const tblW = getSelectedChartWidget();
      const firstTd = tblW.querySelector('td[data-cell-key="td-0-0"]');
      selectChartCellForFill({ stopPropagation() {}, shiftKey: false }, firstTd);
      setSelectedFontSizePx(26, false);
      equalizeTableRowHeights();
      const dAfter = readChartData(tblW);
      const tableFontPersisted = dAfter.cellStyles && dAfter.cellStyles['td-0-0'] && dAfter.cellStyles['td-0-0'].fontSize === 26 && dAfter.rowHeights && Number(dAfter.rowHeights['0']) >= 48;

      // 5. Floating Card opens with SEPARATE .fc-text-box blocks (not monolithic contenteditable) & accepts Interactive Widget + Main Studio BG Color
      openFloatingCardEditor(null);
      const fcEd = document.getElementById('fcRichBodyEditor');
      const sepTextBoxes = fcEd.getAttribute('contenteditable') === 'false' && fcEd.querySelectorAll('.fc-text-box').length >= 3;
      insertInteractiveWidget('before-after');
      const hasFcWidget = fcEd.querySelectorAll('.ppt-interactive-widget').length === 1;
      applySelectedCardBgColor('#0F172A', false);
      const fcBgStyled = document.getElementById('fcBgColorInput').value.toLowerCase() === '#0f172a';
      closeFloatingCardEditor();

      // 6. Detached freeCard allows selecting inner textbox, shows ▣ 카드선택, and deletes inner textbox cleanly
      const gCard = slides[2].querySelector('.slide-card');
      selectElementForInspector(gCard, false);
      addTextBoxToSelectedCard('자유카드 내부 텍스트박스');
      const freeCard = detachElementToFreeLayer(gCard);
      const innerTb = freeCard && freeCard.querySelector('.card-inner-textbox');
      if (innerTb) innerTb.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
      const selectedInner = Boolean(innerTb && selectedElement === innerTb);
      const parentBtnShown = !document.getElementById('ovSelectParentCardBtn').classList.contains('hidden');
      deleteSelectedElement();
      const deletedInner = Boolean(freeCard && innerTb && !freeCard.contains(innerTb));

      return hdrColored && focalFitOk && opBlurOk && tableFontPersisted && sepTextBoxes && hasFcWidget && fcBgStyled && selectedInner && parentBtnShown && deletedInner;
    });
    expect(allFixedOk).toBe(true);
  });

  test('11. v5.6.4 Five-Phase Exhaustive Audit Regression Guard (FC Gradient/Mask Persist, Lightbox Interactive Widgets, Detached FreeCard Style, Export Bloat Prevention)', async ({ page }) => {
    await page.keyboard.press('e');

    const phase5Ok = await page.evaluate(() => {
      goToSlide(3);

      // Phase 2: Detached freeCard preserves dark theme + bg layer + borderRadius + fx
      const card = slides[2].querySelector('.slide-card');
      selectElementForInspector(card, false);
      applySelectedCardBgColor('#0F172A', false);
      card.style.borderRadius = '24px';
      card.setAttribute('data-fx', 'hover-lift');
      const freeCard = detachElementToFreeLayer(card);
      const detachOk = freeCard && freeCard.getAttribute('data-shape-type') === 'freeCard' &&
                       freeCard.classList.contains('card-theme-dark') &&
                       freeCard.style.borderRadius === '24px' &&
                       freeCard.getAttribute('data-fx') === 'hover-lift';

      // Phase 4 & 5: Floating Card gradient + mask persist through Save -> Sanitizer -> Presentation Lightbox + Live Widgets!
      openFloatingCardEditor(null);
      setGradientMode('fill');
      applyGradientToTarget('card');
      setGradientMode('mask');
      applyGradientToTarget('card');
      insertInteractiveWidget('flip-card');
      insertInteractiveWidget('hotspot');
      insertInteractiveWidget('before-after');
      const savedFcId = activeEditingFloatingCardId;
      saveFloatingCardFromEditor();

      // Verify sanitizer preserves FC gradient & mask attributes on export/reload!
      const rawStore = document.getElementById('pptFloatingCardsStore').outerHTML;
      const sanitizedStore = sanitizeImportedStageHtml(rawStore);
      const sanOk = sanitizedStore.includes('data-fc-bg-img="linear-gradient(') &&
                    sanitizedStore.includes('data-fc-bg-mask="linear-gradient(');

      // Verify standalone HTML export clears #fcRichBodyEditor & #floatingCardLightboxBody (zero stale bloat)
      const standaloneHtml = buildSerializedStandaloneHTML(false);
      const noStaleBloat = standaloneHtml.includes('id="fcRichBodyEditor"') && !standaloneHtml.includes('id="floatingCardLightboxBody"><div');

      // Switch to Presentation Mode & test live 3D Flip + Hotspot + Before/After Slider inside #floatingCardLightbox!
      toggleEditMode(false);
      openFloatingCardLightbox(savedFcId);
      const lbContent = document.getElementById('floatingCardLightboxContent');
      const lbBody = document.getElementById('floatingCardLightboxBody');
      const lbBgLayer = lbContent.querySelector('.fc-bg-img-layer');
      const lbGradOk = Boolean(lbBgLayer && lbBgLayer.style.backgroundImage.includes('gradient(') && (lbBgLayer.style.maskImage || lbBgLayer.style.webkitMaskImage || '').includes('gradient('));

      const flipScene = lbBody.querySelector('.iw-flip-scene');
      flipScene.click();
      const flipOk = flipScene.classList.contains('is-flipped');

      const hsDot = lbBody.querySelector('.iw-hs-dot');
      hsDot.click();
      const hsOk = hsDot.closest('.iw-hs-pin').classList.contains('is-open');

      const baStage = lbBody.querySelector('.iw-ba-stage');
      const r = baStage.getBoundingClientRect();
      const tx = r.left + r.width * 0.25;
      baStage.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, clientX: tx, clientY: r.top + 10 }));
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, button: 0, clientX: tx, clientY: r.top + 10 }));
      const baOk = parseFloat(baStage.getAttribute('data-ba-pos') || '50') < 35;

      closeFloatingCardLightbox();
      return detachOk && sanOk && noStaleBloat && lbGradOk && flipOk && hsOk && baOk;
    });
    expect(phase5Ok).toBe(true);
  });
});
