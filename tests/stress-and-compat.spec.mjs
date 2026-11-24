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
});
