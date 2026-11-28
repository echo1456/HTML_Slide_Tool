import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import zlib from 'node:zlib';

/**
 * Zero-dependency ZIP reader (Store method 0 & Deflate method 8)
 * used to deeply inspect exported PPTX OOXML XML parts in CI.
 */
function parseZipEntries(buf) {
  const entries = new Map();
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65558); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error('Invalid ZIP: EOCD signature not found');
  const cdSize = buf.readUInt32LE(eocdOffset + 12);
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  let pos = cdOffset;
  const cdEnd = cdOffset + cdSize;
  while (pos + 46 <= cdEnd) {
    if (buf.readUInt32LE(pos) !== 0x02014b50) break;
    const method = buf.readUInt16LE(pos + 10);
    const compSize = buf.readUInt32LE(pos + 20);
    const nameLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const commentLen = buf.readUInt16LE(pos + 32);
    const localHeaderOffset = buf.readUInt32LE(pos + 42);
    const name = buf.subarray(pos + 46, pos + 46 + nameLen).toString('utf8');

    const lhNameLen = buf.readUInt16LE(localHeaderOffset + 26);
    const lhExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + lhNameLen + lhExtraLen;
    const rawSlice = buf.subarray(dataStart, dataStart + compSize);
    const data = method === 8 ? zlib.inflateRawSync(rawSlice) : Buffer.from(rawSlice);
    entries.set(name, data);

    pos += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

test.describe('HTML Slide Tool — Extended CI Suite (Real Pointer, Stress, Deep Export/Round-Trip, Multi-Viewport & Offline PWA)', () => {
  let pageErrors = [];
  let cspViolations = [];

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    cspViolations = [];

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

  test('12. [Area 1] Real Pointer Interactions: 8-Way Freeform Resize, Marquee Multi-Select & Before/After Full-Sweep Drag', async ({ page }) => {
    await page.keyboard.press('e');
    await expect(page.locator('body')).toHaveClass(/edit-mode/);

    // Create a clean blank slide with two freeform shapes positioned cleanly
    await page.evaluate(() => {
      addSlideWithLayout('blank');
      clearSelectionInspector();
      insertFreeShape('rect');
      const s1 = selectedElement;
      s1.style.left = '15%';
      s1.style.top = '22%';
      s1.style.width = '16%';
      s1.style.height = '18%';

      insertFreeShape('circle');
      const s2 = selectedElement;
      s2.style.left = '44%';
      s2.style.top = '22%';
      s2.style.width = '16%';
      s2.style.height = '18%';
      selectElementForInspector(s1, false);
    });

    // 1) Real mouse drag on SE resize handle of the first freeform shape
    const widthBefore = await page.evaluate(() => parseFloat(selectedElement.style.width) || 0);
    const seBox = await page.locator('#pptSelectionOverlay .ov-se').boundingBox();
    expect(seBox).not.toBeNull();
    await page.mouse.move(seBox.x + seBox.width / 2, seBox.y + seBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(seBox.x + seBox.width / 2 + 75, seBox.y + seBox.height / 2 + 55, { steps: 8 });
    await page.mouse.up();
    const widthAfter = await page.evaluate(() => parseFloat(selectedElement.style.width) || 0);
    expect(widthAfter).toBeGreaterThan(widthBefore + 2);

    // 2) Real mouse rubber-band Marquee drag across both shapes on the blank slide
    await page.evaluate(() => clearSelectionInspector());
    const slideRect = await page.locator('#slideStage .slide.active').boundingBox();
    expect(slideRect).not.toBeNull();
    await page.mouse.move(slideRect.x + slideRect.width * 0.08, slideRect.y + slideRect.height * 0.12);
    await page.mouse.down();
    await page.mouse.move(slideRect.x + slideRect.width * 0.68, slideRect.y + slideRect.height * 0.58, { steps: 10 });
    await page.mouse.up();
    const marqueeSelectedCount = await page.evaluate(() => selectedElements.length);
    expect(marqueeSelectedCount).toBeGreaterThanOrEqual(2);

    // 3) Real mouse full-sweep drag on Before/After Slider in Live Interactive Test Mode (Alt+P)
    await page.evaluate(() => {
      clearSelectionInspector();
      insertInteractiveWidget('before-after', 'slide');
      toggleInteractiveTestMode(true);
    });
    const baBox = await page.locator('.slide.active .iw-ba-stage').first().boundingBox();
    expect(baBox).not.toBeNull();
    // Sweep left (~12%)
    await page.mouse.move(baBox.x + baBox.width * 0.5, baBox.y + baBox.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(baBox.x + baBox.width * 0.12, baBox.y + baBox.height * 0.5, { steps: 6 });
    await page.mouse.up();
    const posLeft = await page.evaluate(() => parseFloat(document.querySelector('.slide.active .iw-ba-stage')?.getAttribute('data-ba-pos') || '50'));
    expect(posLeft).toBeLessThan(25);

    // Sweep right (~88%)
    await page.mouse.move(baBox.x + baBox.width * 0.12, baBox.y + baBox.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(baBox.x + baBox.width * 0.88, baBox.y + baBox.height * 0.5, { steps: 6 });
    await page.mouse.up();
    const posRight = await page.evaluate(() => parseFloat(document.querySelector('.slide.active .iw-ba-stage')?.getAttribute('data-ba-pos') || '50'));
    expect(posRight).toBeGreaterThan(75);

    await page.evaluate(() => toggleInteractiveTestMode(false));
  });

  test('13. [Area 1] Rapid 15-Step Undo/Redo Stress Loop & 22-Slide Large Mixed Deck Stability', async ({ page }) => {
    await page.keyboard.press('e');

    // 1) Rapid 15-step Undo/Redo stress loop
    const undoRedoStressOk = await page.evaluate(() => {
      goToSlide(3);
      clearSelectionInspector();
      const baseShapes = slides[2].querySelectorAll('.ppt-free-obj[data-shape-type="rect"]').length;
      for (let i = 0; i < 15; i++) {
        insertFreeShape('rect');
        if (selectedElement) {
          selectedElement.style.left = `${10 + (i % 5) * 14}%`;
          selectedElement.style.top = `${15 + Math.floor(i / 5) * 20}%`;
          selectedElement.setAttribute('data-stress-idx', String(i));
        }
      }
      const afterInsert = slides[2].querySelectorAll('.ppt-free-obj[data-shape-type="rect"]').length;
      for (let i = 0; i < 15; i++) undoAction();
      const after15Undo = slides[2].querySelectorAll('.ppt-free-obj[data-shape-type="rect"]').length;
      for (let i = 0; i < 15; i++) redoAction();
      const after15Redo = slides[2].querySelectorAll('.ppt-free-obj[data-shape-type="rect"]').length;
      return afterInsert === baseShapes + 15 && after15Undo === baseShapes && after15Redo === baseShapes + 15;
    });
    expect(undoRedoStressOk).toBe(true);

    // 2) Large 22-slide mixed deck stress (charts + tables + widgets + floating cards + full traversal)
    const largeDeckResult = await page.evaluate(() => {
      const targetSlides = 22;
      let guard = 0;
      while (slides.length < targetSlides && guard < 30) {
        addSlideWithLayout(guard % 2 === 0 ? '2col' : 'blank');
        if (guard % 4 === 0) insertChartOrTable('bar-v', 'slide');
        else if (guard % 4 === 1) insertChartOrTable('table', 'slide');
        else if (guard % 4 === 2) insertInteractiveWidget('flip-card', 'slide');
        guard++;
      }
      // Create & save 2 floating cards in the large deck
      openFloatingCardEditor(null);
      insertChartOrTable('donut');
      saveFloatingCardFromEditor();

      // Traverse all slides rapidly
      const total = slides.length;
      for (let n = 1; n <= total; n++) {
        goToSlide(n);
      }
      const issues = scanDeckLayoutOverflows();
      const jsonPayload = buildProjectJsonPayloadObject();
      return {
        totalSlides: total,
        activeSlide: currentSlide,
        overflowsMeasured: Array.isArray(issues),
        jsonValid: Boolean(jsonPayload && jsonPayload.stageHtml && jsonPayload.stageHtml.length > 5000),
      };
    });

    expect(largeDeckResult.totalSlides).toBeGreaterThanOrEqual(22);
    expect(largeDeckResult.activeSlide).toBe(largeDeckResult.totalSlides);
    expect(largeDeckResult.overflowsMeasured).toBe(true);
    expect(largeDeckResult.jsonValid).toBe(true);
  });

  test('14. [Area 2] Deep PPTX Binary & OOXML XML Audit (Table Cell Font Size sz="1950", Merged Cells & Valid Slide XMLs)', async ({ page }) => {
    await page.keyboard.press('e');

    // Insert a data table on Slide 3, set cell text, set cell font size to 26px (OOXML sz = 26 * 75 = 1950), and merge cells
    await page.evaluate(() => {
      goToSlide(3);
      clearSelectionInspector();
      insertChartOrTable('table', 'slide');
      const tblW = getSelectedChartWidget();
      const d = readChartData(tblW);
      d.tableRows[0][0] = 'PPTX_XML_VERIFY_26PX';
      writeChartDataAndRender(tblW, d);

      const td0 = tblW.querySelector('td[data-cell-key="td-0-0"]');
      selectChartCellForFill({ stopPropagation() {}, shiftKey: false }, td0);
      setSelectedFontSizePx(26, false);

      // Select td-1-0 and td-1-1 and merge them
      selectedTableCellKeys = new Set(['td-1-0', 'td-1-1']);
      mergeSelectedTableCells();
    });

    const downloadPromise = page.waitForEvent('download');
    await page.evaluate(() => exportDeckAsPPTX());
    const dl = await downloadPromise;
    expect(dl.suggestedFilename()).toMatch(/\.pptx$/i);
    const pptxBuf = await fs.readFile(await dl.path());

    // Deeply unpack and inspect the PPTX ZIP OOXML parts!
    const entries = parseZipEntries(pptxBuf);
    expect(entries.has('[Content_Types].xml')).toBe(true);
    expect(entries.has('ppt/presentation.xml')).toBe(true);
    expect(entries.has('ppt/slides/slide1.xml')).toBe(true);
    expect(entries.has('ppt/slides/slide3.xml')).toBe(true);

    const slide3Xml = entries.get('ppt/slides/slide3.xml').toString('utf8');
    expect(slide3Xml).toContain('<a:tbl>');
    expect(slide3Xml).toContain('PPTX_XML_VERIFY_26PX');
    expect(slide3Xml).toContain('sz="1950"');
    expect(slide3Xml).toContain('gridSpan="2"');
  });

  test('15. [Area 2] Full Export -> Re-Import Round-Trip Integrity (JSON Workspace File & Editable Standalone HTML)', async ({ page }) => {
    await page.keyboard.press('e');

    // Customize deck state: title, 4:3 aspect ratio, accent color, custom slide table, and Floating Card with gradient
    await page.evaluate(() => {
      setHeaderDeckTitleSafely('ROUNDTRIP_VERIFIED_DECK');
      setDeckAspectRatio('4:3', true);
      setAccentColor('#E11D48', false);
      goToSlide(3);
      clearSelectionInspector();
      insertChartOrTable('table', 'slide');
      const tblW = getSelectedChartWidget();
      const d = readChartData(tblW);
      d.tableRows[0][0] = 'ROUNDTRIP_CELL_TOKEN';
      writeChartDataAndRender(tblW, d);

      openFloatingCardEditor(null);
      document.getElementById('fcTitleInput').value = 'ROUNDTRIP_FC_CARD';
      setGradientMode('fill');
      applyGradientToTarget('card');
      saveFloatingCardFromEditor();
    });

    const expectedSlideCount = await page.evaluate(() => slides.length);
    expect(expectedSlideCount).toBeGreaterThan(2);

    // Part A: JSON Export -> Reset to Blank -> Re-Import JSON via real <input type="file">
    const jsonDlPromise = page.waitForEvent('download');
    await page.evaluate(() => exportProjectJsonFile());
    const jsonDl = await jsonDlPromise;
    const jsonPath = await jsonDl.path();
    const jsonBuf = await fs.readFile(jsonPath);
    const exportedJson = JSON.parse(jsonBuf.toString('utf8'));
    expect(exportedJson.aspectRatio).toBe('4:3');
    expect(exportedJson.accentColor.toLowerCase()).toBe('#e11d48');

    // Wipe stage to blank 2-slide starter deck, then import exported JSON with explicit .json filename!
    await page.evaluate(() => startBlankUniversalDeck());
    await expect(page.locator('#slideStage .slide')).toHaveCount(2);

    await page.locator('#projectFileImporter').setInputFiles({
      name: jsonDl.suggestedFilename() || 'roundtrip_test.json',
      mimeType: 'application/json',
      buffer: jsonBuf,
    });
    await expect(page.locator('#slideStage .slide')).toHaveCount(expectedSlideCount);

    const jsonRestored = await page.evaluate(() => {
      const store = document.getElementById('pptFloatingCardsStore');
      const fcRec = store ? store.querySelector('[data-fc-title="ROUNDTRIP_FC_CARD"]') : null;
      return {
        title: (document.getElementById('headerDeckTitle')?.textContent || '').trim(),
        aspect: currentDeckAspectMode,
        hasCellToken: document.getElementById('slideStage').innerHTML.includes('ROUNDTRIP_CELL_TOKEN'),
        hasFcWithGrad: Boolean(fcRec && (fcRec.getAttribute('data-fc-bg-img') || '').includes('gradient(')),
      };
    });
    expect(jsonRestored.title).toContain('ROUNDTRIP_VERIFIED_DECK');
    expect(jsonRestored.aspect).toBe('4:3');
    expect(jsonRestored.hasCellToken).toBe(true);
    expect(jsonRestored.hasFcWithGrad).toBe(true);

    // Part B: Editable Standalone HTML Export -> Reset to Blank -> Re-Import HTML via real <input type="file">
    const htmlDlPromise = page.waitForEvent('download');
    await page.evaluate(() => saveModifiedHTML(false));
    const htmlDl = await htmlDlPromise;
    const htmlPath = await htmlDl.path();
    const htmlBuf = await fs.readFile(htmlPath);
    const htmlContent = htmlBuf.toString('utf8');
    expect(htmlContent).toContain('data-inlined-js="js/safe-events.js"');
    expect(htmlContent).not.toContain('data-presentation-only="true"');

    await page.evaluate(() => startBlankUniversalDeck());
    await expect(page.locator('#slideStage .slide')).toHaveCount(2);

    await page.locator('#projectFileImporter').setInputFiles({
      name: htmlDl.suggestedFilename() || 'roundtrip_test.html',
      mimeType: 'text/html',
      buffer: htmlBuf,
    });
    await expect(page.locator('#slideStage .slide')).toHaveCount(expectedSlideCount);
    const htmlRestoredHasToken = await page.evaluate(() =>
      document.getElementById('slideStage').innerHTML.includes('ROUNDTRIP_CELL_TOKEN')
    );
    expect(htmlRestoredHasToken).toBe(true);
  });

  test('16. [Area 3] Multi-Viewport Responsive Audit (1280x720 Laptop & 390x844 Mobile) + Multi-Ratio @media print', async ({ page }) => {
    // 1) Laptop 1280x720 (Presentation + Docked Edit Mode)
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.evaluate(() => updateStageViewportScale());
    const laptopPres = await page.evaluate(() => {
      const stageR = document.getElementById('slideStage').getBoundingClientRect();
      return {
        overflowX: document.documentElement.scrollWidth > window.innerWidth + 2,
        stageW: stageR.width,
        stageH: stageR.height,
      };
    });
    expect(laptopPres.overflowX).toBe(false);
    expect(laptopPres.stageW).toBeGreaterThan(500);
    expect(laptopPres.stageH).toBeGreaterThan(250);

    await page.keyboard.press('e');
    await expect(page.locator('body')).toHaveClass(/edit-mode/);
    const laptopEdit = await page.evaluate(() => {
      const stageR = document.getElementById('slideStage').getBoundingClientRect();
      const studioR = document.getElementById('pptStudioPopup').getBoundingClientRect();
      return {
        overflowX: document.documentElement.scrollWidth > window.innerWidth + 2,
        stageW: stageR.width,
        studioW: studioR.width,
      };
    });
    expect(laptopEdit.overflowX).toBe(false);
    expect(laptopEdit.stageW).toBeGreaterThan(350);
    expect(laptopEdit.studioW).toBeGreaterThan(240);
    await page.keyboard.press('e');

    // 2) Mobile Portrait 390x844 (Presentation Mode viewing & navigation)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => updateStageViewportScale());
    const mobileAudit = await page.evaluate(() => {
      const s1 = document.querySelector('#slideStage .slide.active');
      const r = s1 ? s1.getBoundingClientRect() : { width: 0, height: 0 };
      nextSlide();
      const movedTo2 = currentSlide === 2;
      prevSlide();
      return {
        overflowX: document.documentElement.scrollWidth > window.innerWidth + 2,
        slideVisible: r.width > 200 && r.height > 100 && r.width <= window.innerWidth + 2,
        movedTo2,
      };
    });
    expect(mobileAudit.overflowX).toBe(false);
    expect(mobileAudit.slideVisible).toBe(true);
    expect(mobileAudit.movedTo2).toBe(true);

    // 3) Multi-Ratio @media print exact geometry verification (16:9, 4:3, 9:16)
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const [ratio, expW, expH] of [
      ['16:9', 1440, 810],
      ['4:3', 1080, 810],
      ['9:16', 810, 1440],
    ]) {
      await page.evaluate((r) => setDeckAspectRatio(r, true), ratio);
      await page.emulateMedia({ media: 'print' });
      const pr = await page.evaluate(() => {
        const s1 = document.querySelector('#slideStage .slide[data-slide="1"]');
        const cs = window.getComputedStyle(s1);
        const rect = s1.getBoundingClientRect();
        return {
          transform: cs.transform,
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
        };
      });
      expect(pr).toEqual({ transform: 'none', left: 0, top: 0, w: expW, h: expH });
      await page.emulateMedia({ media: 'screen' });
    }
    await page.evaluate(() => setDeckAspectRatio('16:9', true));
  });

  test('17. [Area 4] True Offline PWA & Service Worker Network-Cut Survival Test', async ({ page, context }) => {
    // 1) Wait for Service Worker activation & Cache Storage warm-up
    const swReady = await page.evaluate(async () => {
      if (!navigator.serviceWorker) return false;
      const reg = await navigator.serviceWorker.ready;
      return Boolean(reg && reg.active);
    });
    expect(swReady).toBe(true);

    // Reload once online so the active SW takes control of the page
    await page.reload({ waitUntil: 'domcontentloaded' });
    const hasController = await page.evaluate(async () => {
      if (!navigator.serviceWorker) return false;
      await navigator.serviceWorker.ready;
      return Boolean(navigator.serviceWorker.controller);
    });
    expect(hasController).toBe(true);

    // 2) Cut network completely & reload from Service Worker offline cache!
    try {
      await context.setOffline(true);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.locator('#slideStage .slide.active')).toHaveCount(1);

      const offlineWorks = await page.evaluate(() => {
        const booted = typeof goToSlide === 'function' &&
                       typeof initDeclarativeEventSystem === 'function' &&
                       slides.length >= 2;
        if (!booted) return false;
        nextSlide();
        const at2 = currentSlide === 2;
        prevSlide();
        const back1 = currentSlide === 1;
        return at2 && back1;
      });
      expect(offlineWorks).toBe(true);
    } finally {
      await context.setOffline(false);
    }
  });

  test('18. v5.6.8 User-Reported Fixes (Top Title Bar Fill Color & Dark Contrast + Floating Card Comparison Table Font Size Persistence Across Reopen & Card Switch)', async ({ page }) => {
    await page.keyboard.press('e');

    const v568Ok = await page.evaluate(() => {
      goToSlide(3);

      // 1) Top Title Bar (.slide-header-bar): fill color via updateSelectedShapeStyle('fill') AND inner h2 selection fallback!
      const hdr = slides[2].querySelector('.slide-header-bar');
      selectElementForInspector(hdr, false);
      updateSelectedShapeStyle('fill', '#0F172A', false);
      const hdrDirectFillOk = hdr.getAttribute('data-card-bg-hex') === '#0F172A' &&
                              hdr.classList.contains('card-theme-dark') &&
                              hdr.style.backgroundColor.includes('15, 23, 42');

      // Select inner <h2> inside title bar and change fill color -> falls back cleanly to parent .slide-header-bar!
      const hdrH2 = hdr.querySelector('h2');
      selectElementForInspector(hdrH2, false);
      updateSelectedShapeStyle('fill', '#1D4ED8', false);
      const hdrChildFallbackOk = hdr.getAttribute('data-card-bg-hex') === '#1D4ED8' &&
                                 hdr.style.backgroundColor.includes('29, 78, 216');

      // 2) Floating Card Comparison Table: resize via A+ (adjustSelectedFontSize) + px input + reopen + switch to another card!
      openFloatingCardEditor(null);
      document.getElementById('fcTitleInput').value = 'FC_TABLE_FONT_CARD_A';
      insertChartOrTable('table');
      const fcEd = document.getElementById('fcRichBodyEditor');
      const tblW = fcEd.querySelector('.ppt-chart-widget');
      const td0 = tblW.querySelector('td[data-cell-key="td-0-0"]');
      selectChartCellForFill({ stopPropagation() {}, shiftKey: false }, td0);

      // Test A+ button (adjustSelectedFontSize) twice (+4px) then setSelectedFontSizePx(26) on td-0-1
      adjustSelectedFontSize(2);
      const pxAfterAPlus = parseInt(td0.style.fontSize, 10) || 0;
      const td1 = tblW.querySelector('td[data-cell-key="td-0-1"]');
      selectChartCellForFill({ stopPropagation() {}, shiftKey: false }, td1);
      setSelectedFontSizePx(26, false);

      const cardAId = activeEditingFloatingCardId;
      saveFloatingCardFromEditor();

      // Open & edit ANOTHER floating card (Card B) and save it!
      openFloatingCardEditor(null);
      document.getElementById('fcTitleInput').value = 'FC_OTHER_CARD_B';
      saveFloatingCardFromEditor();

      // Re-open Card A -> verify BOTH td-0-0 (A+) and td-0-1 (26px) font sizes are 100% preserved!
      openFloatingCardEditor(cardAId);
      const tblReopened = document.getElementById('fcRichBodyEditor').querySelector('.ppt-chart-widget');
      const dReopened = readChartData(tblReopened);
      const td0Reopened = tblReopened.querySelector('td[data-cell-key="td-0-0"]');
      const td1Reopened = tblReopened.querySelector('td[data-cell-key="td-0-1"]');
      const persistedInEditor = Boolean(
        dReopened.cellStyles &&
        dReopened.cellStyles['td-0-0'] && dReopened.cellStyles['td-0-0'].fontSize === pxAfterAPlus && pxAfterAPlus >= 16 &&
        dReopened.cellStyles['td-0-1'] && dReopened.cellStyles['td-0-1'].fontSize === 26 &&
        td0Reopened && parseInt(td0Reopened.style.fontSize, 10) === pxAfterAPlus &&
        td1Reopened && parseInt(td1Reopened.style.fontSize, 10) === 26
      );
      closeFloatingCardEditor();

      // Also verify in Presentation Mode Lightbox!
      toggleEditMode(false);
      openFloatingCardLightbox(cardAId);
      const lbTd1 = document.getElementById('floatingCardLightboxBody').querySelector('td[data-cell-key="td-0-1"]');
      const persistedInLightbox = Boolean(lbTd1 && parseInt(lbTd1.style.fontSize, 10) === 26);
      closeFloatingCardLightbox();

      return hdrDirectFillOk && hdrChildFallbackOk && persistedInEditor && persistedInLightbox;
    });
    expect(v568Ok).toBe(true);
  });

  test('19. v5.6.9 Stage-Synced Floating Card Lightbox Scaling Across PC (1440x900), Tablet (1024x768 & 768x1024) & Mobile (390x844)', async ({ page }) => {
    await page.keyboard.press('e');

    // Create a wide 900px custom Floating Card pinned to center-right + a second card for multi-card check
    const fcIds = await page.evaluate(() => {
      openFloatingCardEditor(null);
      document.getElementById('fcTitleInput').value = 'SYNC_SCALE_WIDE_CARD';
      const presetToggle = document.getElementById('fcUseWidthPresetToggle');
      if (presetToggle) { presetToggle.checked = false; onFcWidthPresetToggle(false); }
      document.getElementById('fcCustomWidthInput').value = '900';
      document.getElementById('fcPositionPresetSelect').value = 'center-right';
      insertChartOrTable('table');
      const id1 = activeEditingFloatingCardId;
      saveFloatingCardFromEditor();

      openFloatingCardEditor(null);
      document.getElementById('fcTitleInput').value = 'SYNC_SCALE_CARD_2';
      const id2 = activeEditingFloatingCardId;
      saveFloatingCardFromEditor();

      toggleEditMode(false);
      return { id1, id2 };
    });

    // Open single wide card and verify 1:1 --stage-scale ratio across PC, Tablet Landscape, Tablet Portrait & Mobile Portrait
    await page.evaluate((id) => openFloatingCardLightbox(id), fcIds.id1);
    await page.waitForTimeout(380);

    for (const vp of [
      { width: 1440, height: 900, label: 'desktop' },
      { width: 1024, height: 768, label: 'tablet-landscape' },
      { width: 768, height: 1024, label: 'tablet-portrait' },
      { width: 390, height: 844, label: 'mobile-portrait' },
    ]) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.evaluate(() => updateStageViewportScale());

      const m = await page.evaluate(() => {
        const lb = document.getElementById('floatingCardLightbox');
        const stg = document.getElementById('floatingCardLightboxStage');
        const box = document.getElementById('floatingCardLightboxContent');
        const stageScale = parseFloat(document.documentElement.style.getPropertyValue('--stage-scale') || '1');
        const lbScale = parseFloat(lb.style.getPropertyValue('--fc-lb-scale') || '1');
        const r = box.getBoundingClientRect();
        const stgR = stg.getBoundingClientRect();
        return {
          stageScale,
          lbScale,
          boxW: r.width,
          boxLeft: r.left,
          boxRight: r.right,
          boxTop: r.top,
          boxBottom: r.bottom,
          stgRight: stgR.right,
          scrollW: document.documentElement.scrollWidth,
          innerW: window.innerWidth,
        };
      });

      // Exact 1:1 scale parity with the slide!
      expect(Math.abs(m.lbScale - m.stageScale), `${vp.label} lbScale must match slide stageScale`).toBeLessThan(0.002);
      // Rendered 900px card width matches 900 * stageScale!
      expect(Math.abs(m.boxW - 900 * m.stageScale), `${vp.label} rendered card width must equal 900 * stageScale`).toBeLessThan(6);
      // Zero viewport clipping or horizontal page overflow!
      expect(m.boxLeft, `${vp.label} left`).toBeGreaterThanOrEqual(-1);
      expect(m.boxRight, `${vp.label} right`).toBeLessThanOrEqual(vp.width + 1);
      expect(m.boxTop, `${vp.label} top`).toBeGreaterThanOrEqual(-1);
      expect(m.boxBottom, `${vp.label} bottom`).toBeLessThanOrEqual(vp.height + 1);
      expect(m.scrollW, `${vp.label} horizontal overflow`).toBeLessThanOrEqual(m.innerW + 2);
    }

    // Verify backdrop click outside card closes Lightbox cleanly on Mobile!
    await page.mouse.click(10, 10);
    await expect(page.locator('#floatingCardLightbox')).not.toHaveClass(/open/);

    // Verify Simultaneous Multi-Card mode also scales inside #floatingCardLightboxStage on Mobile with zero overflow!
    await page.evaluate(({ id1, id2 }) => openFloatingCardLightbox([id1, id2], [id1, id2], 'multi'), fcIds);
    await page.waitForTimeout(380);
    const multiOk = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('#floatingCardLightboxStage .fc-multi-card-item'));
      return items.length === 2 &&
             items.every(el => {
               const r = el.getBoundingClientRect();
               return r.width > 50 && r.left >= -2 && r.right <= window.innerWidth + 2;
             });
    });
    expect(multiOk).toBe(true);
    await page.evaluate(() => closeFloatingCardLightbox());

    // v5.6.11 Regression: Verify dead-zone combinations NEVER explode to full-screen w-full (1392px)
    // and explicit 600x400 custom dimensions render at exact 600*scale x 400*scale on Desktop!
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => updateStageViewportScale());
    const v5611SizeCheck = await page.evaluate(() => {
      const store = ensureFloatingCardsStore();
      // Case A: !useWidthPreset && customW=0 (previously caused by vertical-only 's' drag) -> must fall back to max-w-2xl (672px), NOT 1392px!
      const recA = document.createElement('div');
      recA.setAttribute('data-fc-id', 'fc_deadzone_a');
      recA.setAttribute('data-fc-use-width-preset', 'false');
      recA.setAttribute('data-fc-custom-w', '0');
      recA.setAttribute('data-fc-custom-h', '360');
      recA.setAttribute('data-fc-width-class', 'max-w-2xl');
      recA.innerHTML = '<p>Deadzone A test</p>';
      store.appendChild(recA);

      // Case B: useWidthPreset=true && stale customW=1800 -> must honor preset max-w-lg (512px), NOT 1392px!
      const recB = document.createElement('div');
      recB.setAttribute('data-fc-id', 'fc_deadzone_b');
      recB.setAttribute('data-fc-use-width-preset', 'true');
      recB.setAttribute('data-fc-custom-w', '1800');
      recB.setAttribute('data-fc-width-class', 'max-w-lg');
      recB.innerHTML = '<p>Deadzone B test</p>';
      store.appendChild(recB);

      // Case C: Explicit custom 600x400 -> must render at exact 600*scale x 400*scale!
      const recC = document.createElement('div');
      recC.setAttribute('data-fc-id', 'fc_custom_600x400');
      recC.setAttribute('data-fc-use-width-preset', 'false');
      recC.setAttribute('data-fc-custom-w', '600');
      recC.setAttribute('data-fc-custom-h', '400');
      recC.innerHTML = '<p>Custom 600x400 test</p>';
      store.appendChild(recC);

      const scale = parseFloat(document.documentElement.style.getPropertyValue('--stage-scale') || '1');
      const box = document.getElementById('floatingCardLightboxContent');
      // Disable zoom-in animation for immediate accurate bbox read
      box.style.animation = 'none';

      openFloatingCardLightbox('fc_deadzone_a');
      const wA = box.getBoundingClientRect().width;
      openFloatingCardLightbox('fc_deadzone_b');
      const wB = box.getBoundingClientRect().width;
      openFloatingCardLightbox('fc_custom_600x400');
      const rC = box.getBoundingClientRect();
      closeFloatingCardLightbox();
      box.style.animation = '';

      return {
        scale,
        wA,
        wB,
        wC: rC.width,
        hC: rC.height,
        okA: Math.abs(wA - 672 * scale) < 8,
        okB: Math.abs(wB - 512 * scale) < 8,
        okC: Math.abs(rC.width - 600 * scale) < 8 && Math.abs(rC.height - 400 * scale) < 8,
      };
    });
    expect(v5611SizeCheck.okA, `Deadzone A width=${v5611SizeCheck.wA}`).toBe(true);
    expect(v5611SizeCheck.okB, `Deadzone B width=${v5611SizeCheck.wB}`).toBe(true);
    expect(v5611SizeCheck.okC, `Custom 600x400=${v5611SizeCheck.wC}x${v5611SizeCheck.hC}`).toBe(true);
  });

  test('20. v5.6.12 Floating Card Studio Safe Workspace (Zero Top-Bar/Filmstrip/Studio Overlap), Maximize, Unified Canvas Binding, No Duplicate Link Button & Shortcut Isolation', async ({ page }) => {
    await page.keyboard.press('e');
    await expect(page.locator('body')).toHaveClass(/edit-mode/);

    // 1) Open Floating Card Editor & verify zero occlusion by #pptContextualTopBar, #pptLeftFilmstrip, #pptStudioPopup & #appBottomFooter
    //    AND verify unified selection/hotspot/scroll listener is immediately bound on open (no longer trapped inside clearFloatingCardBgImage!)
    await page.evaluate(() => openFloatingCardEditor(null));
    const openBounds = await page.evaluate(() => {
      const panel = document.getElementById('fcEditorDialogPanel');
      const hdr = document.getElementById('fcPreviewDragHeader');
      const fcEd = document.getElementById('fcRichBodyEditor');
      const ctxBar = document.getElementById('pptContextualTopBar');
      const film = document.getElementById('pptLeftFilmstrip');
      const studio = document.getElementById('pptStudioPopup');
      const footer = document.getElementById('appBottomFooter');
      const pr = panel.getBoundingClientRect();
      const hr = hdr.getBoundingClientRect();
      const cr = ctxBar.getBoundingClientRect();
      const flr = film.getBoundingClientRect();
      const sr = studio.getBoundingClientRect();
      const fr = footer.getBoundingClientRect();
      return {
        belowTopBar: hr.top >= cr.bottom - 1,
        rightOfFilmstrip: pr.left >= flr.right - 1,
        leftOfStudio: pr.right <= sr.left + 1,
        aboveFooter: pr.bottom <= fr.top + 1,
        headerVisible: hr.height >= 28,
        unifiedBoundOnOpen: fcEd.dataset.unifiedMainBound === 'true',
      };
    });
    expect(openBounds).toEqual({
      belowTopBar: true,
      rightOfFilmstrip: true,
      leftOfStudio: true,
      aboveFooter: true,
      headerVisible: true,
      unifiedBoundOnOpen: true,
    });

    // 2) Maximize Floating Card Studio -> header MUST still sit cleanly below #pptContextualTopBar & never slide under #pptStudioPopup!
    await page.evaluate(() => toggleFcDialogMaximize());
    const maxBounds = await page.evaluate(() => {
      const panel = document.getElementById('fcEditorDialogPanel');
      const hdr = document.getElementById('fcPreviewDragHeader');
      const ctxBar = document.getElementById('pptContextualTopBar');
      const studio = document.getElementById('pptStudioPopup');
      const footer = document.getElementById('appBottomFooter');
      const pr = panel.getBoundingClientRect();
      const hr = hdr.getBoundingClientRect();
      const cr = ctxBar.getBoundingClientRect();
      const sr = studio.getBoundingClientRect();
      const fr = footer.getBoundingClientRect();
      return {
        belowTopBar: hr.top >= cr.bottom - 1,
        leftOfStudio: pr.right <= sr.left + 1,
        aboveFooter: pr.bottom <= fr.top + 1,
        isMaximized: panel.classList.contains('fc-maximized'),
      };
    });
    expect(maxBounds).toEqual({
      belowTopBar: true,
      leftOfStudio: true,
      aboveFooter: true,
      isMaximized: true,
    });

    // 3) Keyboard isolation: ArrowRight / 'e' while FC preview has focus (non-typing) MUST NOT switch background slide or exit edit mode!
    const slideBeforeKey = await page.evaluate(() => {
      if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur();
      setActiveEditingContext('floating-card');
      return currentSlide;
    });
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('e');
    const afterKeys = await page.evaluate(() => ({ slide: currentSlide, editing: isEditMode }));
    expect(afterKeys.slide).toBe(slideBeforeKey);
    expect(afterKeys.editing).toBe(true);

    // 4) Re-editing an ALREADY linked card without selecting its trigger MUST NOT spawn a duplicate blue link button!
    const noDupBtnOk = await page.evaluate(() => {
      document.getElementById('fcTitleInput').value = 'NO_DUP_BTN_CARD';
      const cardId = activeEditingFloatingCardId;
      saveFloatingCardFromEditor(); // brand-new card -> spawns 1 button
      const countAfterFirstSave = document.querySelectorAll('#slideStage .ppt-free-obj[data-shape-type="linkButton"]').length;

      // Clear selection, reopen the same card & save again -> MUST NOT spawn a 2nd button!
      clearSelectionInspector();
      openFloatingCardEditor(cardId);
      saveFloatingCardFromEditor();
      const countAfterSecondSave = document.querySelectorAll('#slideStage .ppt-free-obj[data-shape-type="linkButton"]').length;
      return countAfterFirstSave >= 1 && countAfterSecondSave === countAfterFirstSave;
    });
    expect(noDupBtnOk).toBe(true);
  });

  test('21. v5.6.13 Audit2 Phase 1 (Managed Drag Blur Abort, Unified Z-Index Stack, Main Studio Undo/Redo FC Routing & Floating Studio Top-Bar Clamp)', async ({ page }) => {
    await page.keyboard.press('e');
    await expect(page.locator('body')).toHaveClass(/edit-mode/);

    const p1Ok = await page.evaluate(() => {
      // 1) Unified Z-Index hierarchy: ContextualTopBar(44) < FloatingCardModal(54) < SelectionOverlay(56) < StudioPopup(60)
      const zOf = (id) => parseInt(window.getComputedStyle(document.getElementById(id)).zIndex, 10) || 0;
      const zCtx = zOf('pptContextualTopBar');
      const zFc = zOf('floatingCardEditorModal');
      const zOv = zOf('pptSelectionOverlay');
      const zSt = zOf('pptStudioPopup');
      const zHierarchyOk = zCtx < zFc && zFc < zOv && zOv < zSt;

      // 2) startManagedDragSession aborts cleanly on window blur (zero stuck mousemove listeners!)
      let moveHits = 0;
      let endHits = 0;
      startManagedDragSession(document, () => { moveHits++; }, () => { endHits++; });
      document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 50, clientY: 50 }));
      window.dispatchEvent(new Event('blur'));
      document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 80, clientY: 80 }));
      const dragBlurOk = moveHits === 1 && endHits === 1;

      // 3) Floating Studio top clamp never overlaps #appTopHeader
      setStudioDockMode('floating', true);
      const studio = document.getElementById('pptStudioPopup');
      studio.style.left = '20px';
      studio.style.top = '0px';
      clampFloatingStudioToViewport();
      const hdrBottom = Math.ceil(document.getElementById('appTopHeader').getBoundingClientRect().bottom);
      const studioClampOk = parseFloat(studio.style.top) >= hdrBottom;
      setStudioDockMode('docked', true);

      // 4) Main Studio undoAction()/redoAction() route directly to Floating Card when FC is active (without mutating slide undoStack!)
      const slideUndoBefore = undoStack.length;
      openFloatingCardEditor(null);
      const fcTitleInp = document.getElementById('fcTitleInput');
      const origTitle = fcTitleInp.value;
      fcTitleInp.value = 'P1_ROUTED_UNDO_TITLE';
      recordFcSnapshot();
      undoAction();
      const undoneFc = fcTitleInp.value === origTitle;
      redoAction();
      const redoneFc = fcTitleInp.value === 'P1_ROUTED_UNDO_TITLE';
      const slideUntouched = undoStack.length === slideUndoBefore;
      closeFloatingCardEditor();

      // 5) Tracked auto-save interval handle exists
      const timerTracked = Boolean(window.__pptAutoSaveIntervalId);

      return { zHierarchyOk, dragBlurOk, studioClampOk, undoneFc, redoneFc, slideUntouched, timerTracked };
    });

    expect(p1Ok.zHierarchyOk).toBe(true);
    expect(p1Ok.dragBlurOk).toBe(true);
    expect(p1Ok.studioClampOk).toBe(true);
    expect(p1Ok.undoneFc).toBe(true);
    expect(p1Ok.redoneFc).toBe(true);
    expect(p1Ok.slideUntouched).toBe(true);
    expect(p1Ok.timerTracked).toBe(true);
  });

  test('22. v5.6.14 Audit2 Phase 2 (Locked Bento Seam Guard, Header-Bar FreeCard Detach, Layer Order Lock, Filmstrip Cleanup, Group-ID Clone Remap & Persistent Guide Snap)', async ({ page }) => {
    await page.keyboard.press('e');
    await expect(page.locator('body')).toHaveClass(/edit-mode/);

    const p2Ok = await page.evaluate(() => {
      // 1) Bento 2D locked neighbor protection on seam resize
      addSlideWithLayout('bento-2d');
      const bentoSlide = slides[currentSlide - 1];
      const gb = bentoSlide.querySelector('.slide-grid-body');
      const cards = Array.from(gb.querySelectorAll(':scope > .slide-card'));
      initFlexibleBentoGrid(gb, cards, cards.map(c => c.getBoundingClientRect()));
      const c0 = cards[0];
      const c1 = cards.find(c => c !== c0 && getBento2DCoords(c).cs === getBento2DCoords(c0).cEnd);
      let bentoLockOk = true;
      if (c1) {
        const initC1 = getBento2DCoords(c1);
        c1.setAttribute('data-layer-locked', 'true');
        // Attempt to grow c0 eastward into locked c1 -> c1 MUST NOT shrink/move!
        resizeGridCardProportionally(c0, 'e', 180, 0, gb, cards.map(c => c.getBoundingClientRect()), 0);
        const afterC1 = getBento2DCoords(c1);
        bentoLockOk = afterC1.cs === initC1.cs && afterC1.cw === initC1.cw;
        cards.forEach(c => { delete c._bentoDragInit; });
        c1.removeAttribute('data-layer-locked');
      }

      // 2) Detaching .slide-header-bar promotes cleanly to freeCard (preserving dark theme & bg)
      goToSlide(3);
      const hdr = slides[2].querySelector('.slide-header-bar');
      selectElementForInspector(hdr, false);
      updateSelectedShapeStyle('fill', '#0F172A', false);
      const detHdr = detachElementToFreeLayer(hdr);
      const headerDetachOk = Boolean(
        detHdr &&
        detHdr.getAttribute('data-shape-type') === 'freeCard' &&
        detHdr.classList.contains('card-theme-dark') &&
        detHdr.getAttribute('data-card-bg-hex') === '#0F172A'
      );

      // 3) changeSelectedLayerOrder refuses locked layer
      detHdr.style.zIndex = '15';
      detHdr.setAttribute('data-layer-locked', 'true');
      selectedElement = detHdr;
      selectedElements = [detHdr];
      changeSelectedLayerOrder('front');
      const layerOrderLockOk = detHdr.style.zIndex === '15';
      detHdr.removeAttribute('data-layer-locked');

      // 4) Duplicate locked slide -> clone is unlocked & remaps data-group-id
      insertFreeShape('rect');
      const g1 = selectedElement;
      insertFreeShape('circle');
      const g2 = selectedElement;
      selectedElements = [g1, g2];
      selectedElement = g2;
      groupSelectedElements();
      const origGid = g1.getAttribute('data-group-id');
      slides[2].setAttribute('data-slide-locked', 'true');
      duplicateCurrentSlide();
      const dupSlide = slides[currentSlide - 1];
      const dupGid = dupSlide.querySelector('[data-group-id]')?.getAttribute('data-group-id');
      const dupCleanOk = dupSlide.getAttribute('data-slide-locked') !== 'true' && Boolean(origGid && dupGid && dupGid !== origGid);
      slides[2].removeAttribute('data-slide-locked');

      // 5) Filmstrip multi-delete clears selection overlay cleanly
      selectedFilmstripSlides = new Set([currentSlide]);
      deleteSelectedFilmstripSlides();
      const filmDeleteClean = selectedElement === null && !document.getElementById('pptSelectionOverlay').classList.contains('visible');

      // 6) Persistent ruler guide magnetic snap in smart-guides.js
      addPersistentGuide('x', 500);
      const activeS = slides[currentSlide - 1];
      const sRect = activeS.getBoundingClientRect();
      const sc = getStageScale();
      const probeEl = document.createElement('div');
      probeEl.className = 'ppt-free-obj';
      const snapRes = computeAndRenderSmartGuides([probeEl], sRect.left + 500 * sc + 2, sRect.top + 100 * sc, 120 * sc, 80 * sc, activeS, null);
      const guideSnapOk = Math.abs(snapRes.snappedLeftPx - (sRect.left + 500 * sc)) < 1.5;
      clearPersistentGuides();

      // 7) Parameterized Data URI (charset=utf-8;base64) tokenized cleanly in history.js
      const paramUri = 'data:image/svg+xml;charset=utf-8;base64,PHN2Zy8+';
      const tok = tokenizeDataUris(`<img src="${paramUri}">`);
      const tokOk = tok.includes('__DATA_URI_TOKEN_') && detokenizeDataUris(tok).includes(paramUri);

      return { bentoLockOk, headerDetachOk, layerOrderLockOk, dupCleanOk, filmDeleteClean, guideSnapOk, tokOk };
    });

    expect(p2Ok.bentoLockOk).toBe(true);
    expect(p2Ok.headerDetachOk).toBe(true);
    expect(p2Ok.layerOrderLockOk).toBe(true);
    expect(p2Ok.dupCleanOk).toBe(true);
    expect(p2Ok.filmDeleteClean).toBe(true);
    expect(p2Ok.guideSnapOk).toBe(true);
    expect(p2Ok.tokOk).toBe(true);
  });

  test('23. v5.6.15 Audit2 Phase 3 (Dark/Light !important Inline-Style Preservation, Nested Pill/Link Unwrap, Find-Replace Edit Transition & Table SUM Recalc, Spotlight & BrandKit Locks)', async ({ page }) => {
    await page.keyboard.press('e');
    await expect(page.locator('body')).toHaveClass(/edit-mode/);

    const p3Ok = await page.evaluate(() => {
      goToSlide(3);
      const s3 = slides[2];

      // 1) Dark Slide .bg-white custom inline background MUST NOT be clobbered by !important
      applyThemePreset('dark');
      const card0 = s3.querySelector('.slide-card');
      card0.classList.add('bg-white');
      selectElementForInspector(card0, false);
      applySelectedCardBgColor('#1D4ED8', false);
      const darkCustomBg = window.getComputedStyle(card0).backgroundColor;
      const darkBgPreserved = darkCustomBg.includes('29, 78, 216');

      // 2) Light Slide preserves user inline color on .text-white AND keeps .card-theme-dark .text-white crisp white!
      applyThemePreset('light');
      const testDarkCard = s3.querySelector('.slide-card');
      selectElementForInspector(testDarkCard, false);
      applySelectedCardBgColor('#0F172A', false);
      const whiteHeading = document.createElement('h4');
      whiteHeading.className = 'text-white';
      whiteHeading.textContent = 'DARK_CARD_WHITE_TEXT';
      testDarkCard.appendChild(whiteHeading);
      const darkCardWhiteOk = window.getComputedStyle(whiteHeading).color === 'rgb(255, 255, 255)';

      const customColEl = document.createElement('p');
      customColEl.className = 'text-white';
      customColEl.style.color = 'rgb(225, 29, 72)';
      customColEl.textContent = 'CUSTOM_RED_ON_LIGHT';
      s3.appendChild(customColEl);
      const lightInlineColorOk = window.getComputedStyle(customColEl).color === 'rgb(225, 29, 72)';
      whiteHeading.remove();
      customColEl.remove();

      // 3) Nested .text-pill-span unwrap + nested <a> unwrap + clearAllTextFormatting preserves slide-number token!
      const pEl = card0.querySelector('p[data-editable]') || card0.querySelector('[data-editable]');
      pEl.innerHTML = '테스트 <span class="text-pill-span">알약</span> <a href="https://example.com" data-inline-link="true">링크</a> <span data-slide-number-token="true">03 / 05</span>';
      const rAll = document.createRange();
      rAll.selectNodeContents(pEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(rAll);
      applyTextBackgroundBox();
      const noNestedPills = pEl.querySelectorAll('.text-pill-span .text-pill-span').length === 0;

      const rLink = document.createRange();
      rLink.selectNodeContents(pEl);
      sel.removeAllRanges();
      sel.addRange(rLink);
      const linkInp = document.getElementById('inlineTextLinkInput');
      if (linkInp) linkInp.value = 'https://openai.com';
      applyInlineTextLink();
      const noNestedLinks = pEl.querySelectorAll('a a').length === 0;

      sel.removeAllRanges();
      savedTextSelectionRange = null;
      selectElementForInspector(pEl, false);
      clearAllTextFormatting();
      const tokenSurvivedClear = pEl.querySelectorAll('[data-slide-number-token="true"]').length === 1;

      // 4) Find & Replace from Presentation Mode -> auto-enters Edit Mode & still replaces inside Table + recalculates SUM!
      clearSelectionInspector();
      insertChartOrTable('table', 'slide');
      const tblW = getSelectedChartWidget();
      const tdData = readChartData(tblW);
      tdData.tableRows[0][1] = '100';
      tdData.tableRows[1][1] = '200';
      writeChartDataAndRender(tblW, tdData);
      appendTableSummaryRow('sum');
      toggleEditMode(false);
      document.getElementById('findQueryInput').value = '100';
      document.getElementById('replaceQueryInput').value = '350';
      runSlideFindSearch(false);
      replaceCurrentFindMatch();
      const sumAfterReplace = readChartData(tblW).tableRows[readChartData(tblW).summaryRowIndices[0]][1];
      const findReplaceTableSumOk = String(sumAfterReplace).includes('550');

      // 5) Spotlight excludes .card-bg-layer / .card-hover-bg-layer / .card-bg-tint
      ensureCardBgLayer(card0);
      ensureCardHoverBgLayer(card0);
      ensureCardBgTintLayer(card0);
      selectElementForInspector(pEl, false);
      applySpotlightToSiblingGroup();
      const spotCleanBgLayers = !card0.querySelector('.card-hover-bg-layer')?.hasAttribute('data-fx') &&
                                !card0.querySelector('.card-bg-tint')?.hasAttribute('data-fx');

      // 6) Locked slide Brand Kit (!applyAll) does NOT mutate global accent color
      const prevAccent = document.documentElement.style.getPropertyValue('--accent-color').trim() || '#0055FF';
      const applyAllChk = document.getElementById('brandKitApplyAllChk');
      if (applyAllChk) applyAllChk.checked = false;
      s3.setAttribute('data-slide-locked', 'true');
      applyBrandKitPreset('midnight');
      const brandKitLockOk = (document.documentElement.style.getPropertyValue('--accent-color').trim() || '#0055FF') === prevAccent;
      s3.removeAttribute('data-slide-locked');
      if (applyAllChk) applyAllChk.checked = true;

      return { darkBgPreserved, darkCardWhiteOk, lightInlineColorOk, noNestedPills, noNestedLinks, tokenSurvivedClear, findReplaceTableSumOk, spotCleanBgLayers, brandKitLockOk };
    });

    expect(p3Ok.darkBgPreserved).toBe(true);
    expect(p3Ok.darkCardWhiteOk).toBe(true);
    expect(p3Ok.lightInlineColorOk).toBe(true);
    expect(p3Ok.noNestedPills).toBe(true);
    expect(p3Ok.noNestedLinks).toBe(true);
    expect(p3Ok.tokenSurvivedClear).toBe(true);
    expect(p3Ok.findReplaceTableSumOk).toBe(true);
    expect(p3Ok.spotCleanBgLayers).toBe(true);
    expect(p3Ok.brandKitLockOk).toBe(true);
  });

  test('24. v5.6.16 Audit2 Phase 4 (Media Blob URL Tracking & Safe Revoke, Widget FC Undo Routing, Table Insert/Col Summary Recalc, HiDPI Draw Canvas & Safari -webkit-backdrop-filter)', async ({ page }) => {
    await page.keyboard.press('e');
    await expect(page.locator('body')).toHaveClass(/edit-mode/);

    const p4Ok = await page.evaluate(() => {
      // 1) Tracked Media Blob URL lifecycle: create -> still-used stays alive -> unused revokes cleanly
      const b1 = new Blob(['test-media-1'], { type: 'video/mp4' });
      const u1 = createTrackedMediaBlobUrl(b1);
      const trackedCreated = window.__pptTrackedMediaBlobUrls.has(u1);
      const tempVid = document.createElement('video');
      tempVid.setAttribute('src', u1);
      slides[0].appendChild(tempVid);
      const keptWhileUsed = revokeMediaBlobUrlIfUnused(u1) === false && window.__pptTrackedMediaBlobUrls.has(u1);
      tempVid.remove();
      const revokedWhenUnused = revokeMediaBlobUrlIfUnused(u1) === true && !window.__pptTrackedMediaBlobUrls.has(u1);

      // 2) Interactive Widget inside Floating Card records to FC Undo stack (NOT background slide!)
      const slideUndo0 = undoStack.length;
      openFloatingCardEditor(null);
      insertInteractiveWidget('tabbed-card');
      const fcTabWid = document.getElementById('fcRichBodyEditor').querySelector('[data-iw-type="tabbed-card"]');
      const addTabBtn = fcTabWid.querySelector('button[data-on-click*="addIwTab"]');
      const tabsBefore = fcTabWid.querySelectorAll('.iw-tab-btn').length;
      const fcUndoBefore = fcUndoStack.length;
      addIwTab(addTabBtn);
      const tabAddedInFc = fcTabWid.querySelectorAll('.iw-tab-btn').length === tabsBefore + 1 && fcUndoStack.length > fcUndoBefore;
      fcUndoAction();
      const tabUndoneInFc = document.getElementById('fcRichBodyEditor').querySelector('[data-iw-type="tabbed-card"]').querySelectorAll('.iw-tab-btn').length === tabsBefore;
      const slideUntouchedByFcWidget = undoStack.length === slideUndo0;
      closeFloatingCardEditor();

      // 3) Table insertTableRowAt / insertTableColAt recalculate SUM summary row automatically
      goToSlide(3);
      clearSelectionInspector();
      insertChartOrTable('table', 'slide');
      const tblW = getSelectedChartWidget();
      const d0 = readChartData(tblW);
      d0.tableRows[0][1] = '50';
      d0.tableRows[1][1] = '70';
      writeChartDataAndRender(tblW, d0);
      appendTableSummaryRow('sum');
      const td0 = tblW.querySelector('td[data-cell-key="td-0-1"]');
      selectChartCellForFill({ stopPropagation() {}, shiftKey: false }, td0);
      insertTableColAt(1);
      const dAfterCol = readChartData(tblW);
      const sumRowAfterCol = dAfterCol.tableRows[dAfterCol.summaryRowIndices[0]];
      const tableColSumOk = Array.isArray(sumRowAfterCol) && sumRowAfterCol.length === dAfterCol.tableHeaders.length && String(sumRowAfterCol[1]).includes('120');

      // 4) HiDPI Screen Draw Canvas + touchAction='none' + Smartpad Progress Bar touchScrubBound
      toggleScreenDrawMode(true);
      const drawCanvas = document.getElementById('pptDrawCanvas');
      const drawCanvasOk = drawCanvas && drawCanvas.style.touchAction === 'none' && drawCanvas.width >= window.innerWidth;
      toggleScreenDrawMode(false);
      const progressTouchOk = document.getElementById('progressBarContainer')?.dataset.touchScrubBound === 'true';

      return { trackedCreated, keptWhileUsed, revokedWhenUnused, tabAddedInFc, tabUndoneInFc, slideUntouchedByFcWidget, tableColSumOk, drawCanvasOk, progressTouchOk };
    });

    expect(p4Ok.trackedCreated).toBe(true);
    expect(p4Ok.keptWhileUsed).toBe(true);
    expect(p4Ok.revokedWhenUnused).toBe(true);
    expect(p4Ok.tabAddedInFc).toBe(true);
    expect(p4Ok.tabUndoneInFc).toBe(true);
    expect(p4Ok.slideUntouchedByFcWidget).toBe(true);
    expect(p4Ok.tableColSumOk).toBe(true);
    expect(p4Ok.drawCanvasOk).toBe(true);
    expect(p4Ok.progressTouchOk).toBe(true);
  });

  test('25. v5.6.17 Audit2 Phase 5 Final Certification (Hidden Layer Export Exclusion, Standalone HTML Base64 Bloat Strip, Lightbox Bitmap Release, Table Canvas Custom Color/TitleSize & Sanitizer Parity)', async ({ page }) => {
    await page.keyboard.press('e');
    await expect(page.locator('body')).toHaveClass(/edit-mode/);

    // 1) Hidden layer must be excluded from collectExportableSlideBlocks AND PPTX slide XML!
    await page.evaluate(() => {
      goToSlide(3);
      clearSelectionInspector();
      insertFreeShape('rect');
      const hiddenObj = selectedElement;
      hiddenObj.innerHTML = '<div data-editable class="shape-inner-text">SECRET_HIDDEN_LAYER_TOKEN</div>';
      hiddenObj.setAttribute('data-layer-hidden', 'true');
      hiddenObj.style.visibility = 'hidden';
    });

    const hiddenExcluded = await page.evaluate(() => {
      const blocks = collectExportableSlideBlocks(slides[2]);
      return blocks.every(b => !b.textContent.includes('SECRET_HIDDEN_LAYER_TOKEN'));
    });
    expect(hiddenExcluded).toBe(true);

    const pptxDlPromise = page.waitForEvent('download');
    await page.evaluate(() => exportDeckAsPPTX());
    const pptxDl = await pptxDlPromise;
    const pptxEntries = parseZipEntries(await fs.readFile(await pptxDl.path()));
    const slide3Xml = pptxEntries.get('ppt/slides/slide3.xml').toString('utf8');
    expect(slide3Xml).not.toContain('SECRET_HIDDEN_LAYER_TOKEN');

    // 2) Standalone HTML strips stale Lightbox/FC preview base64 background layers & stage-rescaling class!
    const bloatAndCanvasOk = await page.evaluate(() => {
      const fakeBgDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      openFloatingCardEditor(null);
      const fcEd = document.getElementById('fcRichBodyEditor');
      fcEd.setAttribute('data-fc-bg-img-url', fakeBgDataUrl);
      updateFloatingCardPreviewStyle();
      const fcId = activeEditingFloatingCardId;
      saveFloatingCardFromEditor();

      // Open & close lightbox -> verify closeFloatingCardLightbox releases .fc-bg-img-layer backgroundImage!
      toggleEditMode(false);
      openFloatingCardLightbox(fcId);
      const lbBgLayer = document.getElementById('floatingCardLightboxContent').querySelector('.fc-bg-img-layer');
      const hadBgOpen = Boolean(lbBgLayer && lbBgLayer.style.backgroundImage.includes('data:image/png'));
      closeFloatingCardLightbox();
      const clearedOnClose = Boolean(lbBgLayer && !lbBgLayer.style.backgroundImage);

      // Re-open lightbox & inject stage-rescaling class, then serialize Standalone HTML -> zero leaked preview base64!
      openFloatingCardLightbox(fcId);
      document.body.classList.add('stage-rescaling');
      const standalone = buildSerializedStandaloneHTML(false);
      document.body.classList.remove('stage-rescaling');
      closeFloatingCardLightbox();

      // Parse serialized standalone HTML to verify zero leaked preview/lightbox base64 & clean body classes!
      const parsedOut = new DOMParser().parseFromString(standalone, 'text/html');
      const lbBgClean = !(parsedOut.querySelector('#floatingCardLightboxContent .fc-bg-img-layer')?.style.backgroundImage || '').includes('data:image');
      const fcPrevClean = !(parsedOut.querySelector('#fcEditorBgPreviewLayer')?.style.backgroundImage || '').includes('data:image');
      const storeHasBg = Boolean((parsedOut.querySelector('#pptFloatingCardsStore')?.innerHTML || '').includes(fakeBgDataUrl));
      const occurrences = (lbBgClean && fcPrevClean && storeHasBg) ? 1 : 0;
      const noStageRescaling = !parsedOut.body.classList.contains('stage-rescaling');

      // 3) drawChartWidgetOnCanvas renders table with titleFontSize + custom cellStyles.color without error
      toggleEditMode(true);
      goToSlide(3);
      clearSelectionInspector();
      insertChartOrTable('table', 'slide');
      const tblW = getSelectedChartWidget();
      const td = readChartData(tblW);
      td.titleFontSize = 20;
      td.cellStyles = { 'th-0': { color: '#FFE600', bg: '#0F172A' }, 'td-0-0': { color: '#E11D48', fontSize: 16 } };
      writeChartDataAndRender(tblW, td);
      const canvasUrl = renderChartWidgetToDataUrl(tblW, 480, 260);
      const canvasChartOk = typeof canvasUrl === 'string' && canvasUrl.startsWith('data:image/png;base64,');

      // 4) Sanitizer preserves all v5.6.x attributes cleanly
      const rawMarkup = '<div class="slide" data-slide="1"><div class="slide-card" data-title-card="true" data-card-bg-hex="#0F172A" data-card-bg-alpha="90"></div><div id="pptFloatingCardsStore"><div data-fc-id="fc_p5" data-fc-use-width-preset="false" data-fc-custom-w="640" data-fc-custom-h="420" data-fc-bg-mask="linear-gradient(180deg, rgba(0,0,0,1), rgba(0,0,0,0))"></div></div></div>';
      const san = sanitizeImportedStageHtml(rawMarkup);
      const sanOk = san.includes('data-title-card="true"') &&
                    san.includes('data-card-bg-hex="#0F172A"') &&
                    san.includes('data-fc-use-width-preset="false"') &&
                    san.includes('data-fc-custom-w="640"') &&
                    san.includes('data-fc-bg-mask="linear-gradient(');

      return { hadBgOpen, clearedOnClose, occurrences, noStageRescaling, canvasChartOk, sanOk };
    });

    expect(bloatAndCanvasOk.hadBgOpen).toBe(true);
    expect(bloatAndCanvasOk.clearedOnClose).toBe(true);
    expect(bloatAndCanvasOk.occurrences).toBe(1);
    expect(bloatAndCanvasOk.noStageRescaling).toBe(true);
    expect(bloatAndCanvasOk.canvasChartOk).toBe(true);
    expect(bloatAndCanvasOk.sanOk).toBe(true);
  });
});
