/* ==================== CHARTS, GRAPHS & DATA TABLES (POINT COLOR SYNC + PER-CELL FILL, MERGE, SORT & CSV) ==================== */
const DEFAULT_CHART_PALETTE = ['#0055FF', '#111111', '#059669', '#D97706', '#E11D48', '#7C3AED'];

function getDefaultChartData(type) {
  return {
    type,
    title: type === 'table' ? '핵심 경쟁력 비교표' : type === 'kpi' ? '핵심 성과 지표 (KPI)' : '데이터 비교 분석 차트',
    syncAccent: true, valuePrefix: '', valueSuffix: '',
    legendPosition: type === 'donut' ? 'right' : 'none',
    showHeaderRow: true, highlightFirstCol: false, zebraStriping: true,
    cellPadding: '7px 10px', colAligns: {},
    tableBorder: { style: 'solid', width: 1, color: '#E2E4E9' },
    merges: {}, hiddenCells: {}, summaryRowIndices: [],
    items: [
      { label: '핵심 솔루션 A', value: 92, sub: '최고 효율 · 추천', color: '#0055FF' },
      { label: '비교 대안 B', value: 74, sub: '표준 성능', color: '#111111' },
      { label: '비교 대안 C', value: 61, sub: '비용 부담', color: '#059669' },
      { label: '비교 대안 D', value: 48, sub: '기능 제약', color: '#D97706' }
    ],
    tableHeaders: ['구분 항목', '신규 제안 (Solution)', '기존 방식 (Legacy)'],
    tableRows: [
      ['도입 비용 및 효율', '초기 비용 60% 절감', '높은 유지보수 비용'],
      ['작업 생산성', '실시간 자동화 처리', '수동 반복 작업 필요'],
      ['확장성 및 호환성', '다양한 포맷 즉시 연동', '단일 환경 종속']
    ],
    colWidths: [], rowHeights: {}, cellStyles: {}
  };
}
function resolveChartItemColor(data, idx) {
  if (data.syncAccent) {
    if (idx === 0) return 'var(--accent-color, #0055FF)';
    const shades = ['0.78', '0.56', '0.38', '0.24', '0.16'];
    return `color-mix(in srgb, var(--accent-color, #0055FF) ${Math.round(Number(shades[idx % shades.length]) * 100)}%, #111111)`;
  }
  return (data.items[idx] && data.items[idx].color) || DEFAULT_CHART_PALETTE[idx % DEFAULT_CHART_PALETTE.length];
}
function formatChartValueDisplay(rawVal, data) {
  const pre = escapeAttr((data && data.valuePrefix) || ''), suf = escapeAttr((data && data.valueSuffix) || '');
  const num = Number(rawVal), numStr = !isNaN(num) ? num.toLocaleString('ko-KR') : escapeAttr(String(rawVal ?? ''));
  return `${pre}${numStr}${suf}`;
}
function buildChartLegendHtml(data, editableAttr) {
  const pos = (data && data.legendPosition) || 'none';
  if (pos === 'none' || !Array.isArray(data.items) || data.items.length === 0) return '';
  const isH = pos === 'top' || pos === 'bottom';
  const wrapClass = isH ? 'flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-1' : 'space-y-1.5 min-w-[110px] max-w-[155px] shrink-0';
  return `<div class="${wrapClass}">${data.items.map((it, idx) => `<div class="inline-flex items-center gap-1.5 text-[11px] font-bold text-ink truncate"><span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${resolveChartItemColor(data, idx)};"></span><span ${editableAttr} data-on-blur="onChartLabelInlineEdit(this, ${idx})" class="truncate">${escapeAttr(it.label)}</span></div>`).join('')}</div>`;
}
function formatTableCellHtml(rawText) { return escapeAttr(rawText).replace(/\r?\n/g, '<br>'); }
function extractEditableCellText(el) { const c = el.cloneNode(true); c.querySelectorAll('.table-col-resizer, .table-row-resizer').forEach(r => r.remove()); c.querySelectorAll('br').forEach(br => br.replaceWith('\n')); return c.textContent.trim(); }
function buildCellInlineStyle(data, cellKey, defaultBg, colIdx, rowKey, isFirstColHighlight) {
  const cs = (data.cellStyles && data.cellStyles[cellKey]) || {}, bg = cs.bg || defaultBg || '', color = cs.color || '';
  const colW = (Array.isArray(data.colWidths) && colIdx !== undefined && data.colWidths[colIdx]) ? Number(data.colWidths[colIdx]) : (cs.width ? Number(cs.width) : 0);
  const rowH = (data.rowHeights && rowKey !== undefined && data.rowHeights[rowKey]) ? Number(data.rowHeights[rowKey]) : (cs.height ? Number(cs.height) : 0);
  const tb = data.tableBorder || { style: 'solid', width: 1, color: '#E2E4E9' }, bStyle = tb.style || 'solid', bWidth = Math.max(0, Math.min(6, Number(tb.width ?? 1)));
  const bColor = /^#[0-9a-fA-F]{3,8}$/.test(tb.color || '') ? tb.color : '#E2E4E9';
  const borderCss = (bStyle === 'none' || bWidth === 0) ? 'border: none;' : `border: ${bWidth}px ${bStyle} ${bColor};`;
  const padCss = data.cellPadding ? `padding: ${data.cellPadding};` : '';
  const alignVal = (data.colAligns && colIdx !== undefined && data.colAligns[String(colIdx)]) || '';
  let out = `${borderCss}${padCss}${alignVal ? `text-align: ${alignVal};` : ''}${isFirstColHighlight ? 'font-weight: 800;' : ''}`;
  if (bg) out += `background-color: ${bg} !important;`; else if (isFirstColHighlight) out += `background-color: rgba(0, 85, 255, 0.06);`;
  const fSize = Number(cs.fontSize || data.tableFontSize || 0);
  if (color) out += `color: ${color} !important;`;
  if (fSize > 0) out += `font-size: ${fSize}px !important; line-height: 1.35;`;
  if (colW > 0) out += `width: ${colW}px; min-width: ${colW}px; max-width: ${colW}px;`;
  if (rowH > 0) out += `height: ${rowH}px;`;
  return out;
}
function buildChartScenarioBarHtml(data) {
  if (!data || !data.scenariosEnabled || !Array.isArray(data.scenarios) || data.scenarios.length < 2) return '';
  const activeIdx = Math.max(0, Math.min(data.scenarios.length - 1, Number(data.activeScenarioIdx) || 0));
  return `<div class="chart-scenario-bar">${data.scenarios.map((sc, i) => `<button type="button" class="chart-scenario-btn ${i === activeIdx ? 'is-active' : ''}" data-on-click="event.stopPropagation(); switchChartScenario(this, ${i})">${escapeAttr(sc.name || `안 ${i + 1}`)}</button>`).join('')}</div>`;
}

function renderChartWidgetInnerHtml(data) {
  const editableAttr = (isEditMode && (typeof isInteractiveTestMode === 'undefined' || !isInteractiveTestMode)) ? 'data-editable contenteditable="true"' : '', maxVal = Math.max(1, ...data.items.map(it => Number(it.value) || 0));
  const totalSum = Math.max(1, data.items.reduce((acc, it) => acc + Math.max(0, Number(it.value) || 0), 0));
  const legendPos = data.legendPosition || 'none', legendHtml = buildChartLegendHtml(data, editableAttr);
  const scenarioBarHtml = buildChartScenarioBarHtml(data);
  const chartPartAttrs = (it, idx) => {
    const pct = Math.round((Math.max(0, Number(it.value) || 0) / totalSum) * 100);
    return `data-chart-part="item-${idx}" data-chart-label="${escapeAttr(it.label)}" data-chart-val="${formatChartValueDisplay(it.value, data)}" data-chart-pct="${pct}%" data-chart-sub="${escapeAttr(it.sub || '')}"`;
  };

  if (data.type === 'bar-v') {
    const barsHtml = data.items.map((it, idx) => {
      const hPct = Math.max(6, Math.min(100, Math.round(((Number(it.value) || 0) / maxVal) * 100)));
      return `<div class="flex-1 flex flex-col items-center justify-end h-full gap-1.5 min-w-0"><span ${editableAttr} data-on-blur="onChartValueInlineEdit(this, ${idx})" class="font-mono text-[11px] font-extrabold text-ink">${formatChartValueDisplay(it.value, data)}</span><div ${chartPartAttrs(it, idx)} data-bar-target-h="${hPct}%" data-on-click="selectChartPartForColor(event, this, ${idx})" class="w-full max-w-[44px] rounded-t-lg transition-all duration-300 cursor-pointer" style="height: ${hPct}%; background: ${resolveChartItemColor(data, idx)};"></div><span ${editableAttr} data-on-blur="onChartLabelInlineEdit(this, ${idx})" class="text-[11px] font-bold text-muted truncate w-full text-center">${escapeAttr(it.label)}</span></div>`;
    }).join('');
    const core = `<div class="flex-1 min-h-[130px] flex items-end justify-around gap-3 pt-4 pb-1 border-b border-borderline">${barsHtml}</div>`;
    return `<div class="flex items-center justify-between gap-2 mb-2"><h4 ${editableAttr} data-on-blur="onChartTitleInlineEdit(this)" class="text-sm md:text-base font-extrabold text-ink">${escapeAttr(data.title)}</h4>${scenarioBarHtml || '<span class="font-mono text-[10px] text-subtle">BAR CHART</span>'}</div>${legendPos === 'right' ? `<div class="flex-1 flex items-center gap-3 min-h-0">${core}${legendHtml}</div>` : `${legendPos === 'top' ? legendHtml : ''}${core}${legendPos === 'bottom' ? legendHtml : ''}`}`;
  }
  if (data.type === 'bar-h') {
    const rowsHtml = data.items.map((it, idx) => {
      const wPct = Math.max(6, Math.min(100, Math.round(((Number(it.value) || 0) / maxVal) * 100)));
      return `<div class="space-y-1"><div class="flex items-center justify-between text-xs font-bold"><span ${editableAttr} data-on-blur="onChartLabelInlineEdit(this, ${idx})" class="text-ink">${escapeAttr(it.label)}</span><span ${editableAttr} data-on-blur="onChartValueInlineEdit(this, ${idx})" class="font-mono font-extrabold" style="color:${resolveChartItemColor(data, idx)};">${formatChartValueDisplay(it.value, data)}</span></div><div class="w-full h-3 rounded-full bg-canvas overflow-hidden"><div ${chartPartAttrs(it, idx)} data-bar-target-w="${wPct}%" data-on-click="selectChartPartForColor(event, this, ${idx})" class="h-full rounded-full transition-all duration-300 cursor-pointer" style="width: ${wPct}%; background: ${resolveChartItemColor(data, idx)};"></div></div></div>`;
    }).join('');
    const core = `<div class="flex-1 flex flex-col justify-center gap-2.5">${rowsHtml}</div>`;
    return `<div class="flex items-center justify-between gap-2 mb-2.5"><h4 ${editableAttr} data-on-blur="onChartTitleInlineEdit(this)" class="text-sm md:text-base font-extrabold text-ink">${escapeAttr(data.title)}</h4>${scenarioBarHtml || '<span class="font-mono text-[10px] text-subtle">HORIZONTAL BAR</span>'}</div>${legendPos === 'right' ? `<div class="flex-1 flex items-center gap-3 min-h-0">${core}${legendHtml}</div>` : `${legendPos === 'top' ? legendHtml : ''}${core}${legendPos === 'bottom' ? legendHtml : ''}`}`;
  }
  if (data.type === 'line') {
    const w = 320, h = 120, padX = 28, padY = 18, stepX = data.items.length > 1 ? (w - padX * 2) / (data.items.length - 1) : 0;
    const rawVals = data.items.map(it => Number(it.value) || 0);
    const minLineV = Math.min(0, ...rawVals), maxLineV = Math.max(1, ...rawVals), spanV = Math.max(1, maxLineV - minLineV);
    const pts = data.items.map((it, idx) => ({ x: data.items.length === 1 ? (w / 2) : (padX + idx * stepX), y: h - padY - ((((Number(it.value) || 0) - minLineV) / spanV) * (h - padY * 2)), it, idx }));
    const polyPoints = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const strokeCol = data.syncAccent ? 'var(--accent-color, #0055FF)' : (data.items[0]?.color || '#0055FF');
    const circles = pts.map(p => `<circle ${chartPartAttrs(p.it, p.idx)} data-on-click="selectChartPartForColor(event, this, ${p.idx})" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5.5" fill="${resolveChartItemColor(data, p.idx)}" stroke="#FFFFFF" stroke-width="2" class="cursor-pointer" /><text x="${p.x.toFixed(1)}" y="${Math.max(11, p.y - 8).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="#111111">${formatChartValueDisplay(p.it.value, data)}</text><text x="${p.x.toFixed(1)}" y="${h - 2}" text-anchor="middle" font-size="9" font-weight="600" fill="#4B5563">${escapeAttr(p.it.label.slice(0, 8))}</text>`).join('');
    const coreSvg = `<svg viewBox="0 0 ${w} ${h}" class="w-full flex-1 min-h-[120px] overflow-visible"><polyline fill="none" stroke="${strokeCol}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${polyPoints}" />${circles}</svg>`;
    return `<div class="flex items-center justify-between gap-2 mb-2"><h4 ${editableAttr} data-on-blur="onChartTitleInlineEdit(this)" class="text-sm md:text-base font-extrabold text-ink">${escapeAttr(data.title)}</h4>${scenarioBarHtml || '<span class="font-mono text-[10px] text-subtle">LINE TREND</span>'}</div>${legendPos === 'right' ? `<div class="flex-1 flex items-center gap-3 min-h-0">${coreSvg}${legendHtml}</div>` : `${legendPos === 'top' ? legendHtml : ''}${coreSvg}${legendPos === 'bottom' ? legendHtml : ''}`}`;
  }
  if (data.type === 'donut') {
    const sum = totalSum, r = 42, c = 2 * Math.PI * r; let offset = 0;
    const segments = data.items.map((it, idx) => { const dash = (Math.max(0, Number(it.value) || 0) / sum) * c; const seg = `<circle ${chartPartAttrs(it, idx)} data-on-click="selectChartPartForColor(event, this, ${idx})" cx="55" cy="55" r="${r}" fill="none" stroke="${resolveChartItemColor(data, idx)}" stroke-width="16" stroke-dasharray="${dash.toFixed(2)} ${(c - dash).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" class="cursor-pointer" />`; offset += dash; return seg; }).join('');
    const legends = data.items.map((it, idx) => { const pct = Math.round((Math.max(0, Number(it.value) || 0) / sum) * 100); return `<div class="flex items-center justify-between gap-2 text-xs"><span class="inline-flex items-center gap-1.5 font-bold text-ink truncate"><span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${resolveChartItemColor(data, idx)};"></span><span ${editableAttr} data-on-blur="onChartLabelInlineEdit(this, ${idx})">${escapeAttr(it.label)}</span></span><span class="font-mono text-[11px] font-bold text-muted">${(data.valuePrefix || data.valueSuffix) ? `${formatChartValueDisplay(it.value, data)} (${pct}%)` : `${pct}%`}</span></div>`; }).join('');
    const showLegend = legendPos !== 'none', wrapClass = legendPos === 'bottom' || legendPos === 'top' ? 'flex-1 flex flex-col items-center justify-center gap-2' : 'flex-1 flex items-center justify-center gap-4';
    return `<div class="flex items-center justify-between gap-2 mb-2"><h4 ${editableAttr} data-on-blur="onChartTitleInlineEdit(this)" class="text-sm md:text-base font-extrabold text-ink">${escapeAttr(data.title)}</h4>${scenarioBarHtml || '<span class="font-mono text-[10px] text-subtle">DONUT SHARE</span>'}</div><div class="${wrapClass}">${legendPos === 'top' && showLegend ? `<div class="w-full space-y-1">${legends}</div>` : ''}<svg viewBox="0 0 110 110" class="w-28 h-28 shrink-0 -rotate-90">${segments}</svg>${legendPos !== 'top' && showLegend ? `<div class="flex-1 w-full space-y-1.5 min-w-0">${legends}</div>` : ''}</div>`;
  }
  if (data.type === 'kpi') {
    const cardsHtml = data.items.map((it, idx) => `<div data-cell-key="kpi-${idx}" data-on-click="selectChartCellForFill(event, this)" class="p-3 rounded-xl border border-borderline bg-canvas/70 flex flex-col justify-between cursor-pointer" style="${buildCellInlineStyle(data, `kpi-${idx}`, '')}"><span ${editableAttr} data-on-blur="onChartLabelInlineEdit(this, ${idx})" class="text-[11px] font-bold text-muted">${escapeAttr(it.label)}</span><div ${editableAttr} data-kpi-val="${escapeAttr(String(it.value))}" data-kpi-prefix="${escapeAttr(data.valuePrefix || '')}" data-kpi-suffix="${escapeAttr(data.valueSuffix || '')}" data-on-blur="onChartValueInlineEdit(this, ${idx})" class="text-2xl font-black tracking-tight my-1" style="color:${resolveChartItemColor(data, idx)};">${formatChartValueDisplay(it.value, data)}</div><span ${editableAttr} data-on-blur="onChartSubInlineEdit(this, ${idx})" class="font-mono text-[10px] text-subtle">${escapeAttr(it.sub || 'METRIC')}</span></div>`).join('');
    return `<div class="flex items-center justify-between gap-2 mb-2"><h4 ${editableAttr} data-on-blur="onChartTitleInlineEdit(this)" class="text-sm md:text-base font-extrabold text-ink">${escapeAttr(data.title)}</h4>${scenarioBarHtml || '<span class="font-mono text-[10px] text-subtle">KPI GRID</span>'}</div><div class="flex-1 grid grid-cols-2 gap-2">${cardsHtml}</div>`;
  }
  const hasCustomColW = Array.isArray(data.colWidths) && data.colWidths.some(w => Number(w) > 0), tableStyle = hasCustomColW ? 'style="table-layout: fixed;"' : '';
  const merges = data.merges || {}, hiddenCells = data.hiddenCells || {}, showHeader = data.showHeaderRow !== false, highlightFirst = Boolean(data.highlightFirstCol), zebraClass = data.zebraStriping !== false ? 'zebra-enabled' : '';
  const summarySet = new Set(Array.isArray(data.summaryRowIndices) ? data.summaryRowIndices : []);
  let theadHtml = '';
  if (showHeader) {
    const ths = data.tableHeaders.map((h, colIdx) => {
      const cellKey = `th-${colIdx}`; if (hiddenCells[cellKey]) return '';
      const m = merges[cellKey], spanAttrs = m ? `${m.colspan > 1 ? ` colspan="${m.colspan}"` : ''}${m.rowspan > 1 ? ` rowspan="${m.rowspan}"` : ''}` : '';
      const resizers = (typeof isActiveEditing === 'function' ? isActiveEditing() : isEditMode) ? `<span class="table-col-resizer" contenteditable="false" data-on-mousedown="startTableColResize(event, this, ${colIdx})"></span><span class="table-row-resizer" contenteditable="false" data-on-mousedown="startTableRowResize(event, this, 'header')"></span>` : '';
      return `<th ${editableAttr}${spanAttrs} data-cell-key="${cellKey}" data-col-idx="${colIdx}" data-row-key="header" data-on-click="selectChartCellForFill(event, this)" data-on-blur="onTableHeaderInlineEdit(this, ${colIdx})" style="${buildCellInlineStyle(data, cellKey, resolveChartItemColor(data, colIdx), colIdx, 'header', false)}">${formatTableCellHtml(h)}${resizers}</th>`;
    }).join('');
    const hdrH = (data.rowHeights && data.rowHeights.header) ? Number(data.rowHeights.header) : 0;
    theadHtml = `<thead><tr ${hdrH > 0 ? `style="height: ${hdrH}px;"` : ''}>${ths}</tr></thead>`;
  }
  const trs = data.tableRows.map((row, rIdx) => {
    const rowTint = !data.syncAccent && data.items[rIdx]?.color ? hexToRgba(data.items[rIdx].color, 12) : '', rowH = (data.rowHeights && data.rowHeights[String(rIdx)]) ? Number(data.rowHeights[String(rIdx)]) : 0;
    const tds = row.map((cell, cIdx) => {
      const cellKey = `td-${rIdx}-${cIdx}`; if (hiddenCells[cellKey]) return '';
      const m = merges[cellKey], spanAttrs = m ? `${m.colspan > 1 ? ` colspan="${m.colspan}"` : ''}${m.rowspan > 1 ? ` rowspan="${m.rowspan}"` : ''}` : '';
      const resizers = (typeof isActiveEditing === 'function' ? isActiveEditing() : isEditMode) ? `<span class="table-col-resizer" contenteditable="false" data-on-mousedown="startTableColResize(event, this, ${cIdx})"></span><span class="table-row-resizer" contenteditable="false" data-on-mousedown="startTableRowResize(event, this, '${rIdx}')"></span>` : '';
      return `<td ${editableAttr}${spanAttrs} data-cell-key="${cellKey}" data-col-idx="${cIdx}" data-row-key="${rIdx}" data-on-click="selectChartCellForFill(event, this)" data-on-blur="onTableCellInlineEdit(this, ${rIdx}, ${cIdx})" style="${buildCellInlineStyle(data, cellKey, rowTint, cIdx, String(rIdx), highlightFirst && cIdx === 0)}">${formatTableCellHtml(cell)}${resizers}</td>`;
    }).join('');
    return `<tr${summarySet.has(rIdx) ? ' class="table-summary-row"' : ''} ${rowH > 0 ? `style="height: ${rowH}px;"` : ''}>${tds}</tr>`;
  }).join('');
  const tblTitleFs = Number(data.titleFontSize || 0) > 0 ? ` style="font-size: ${Number(data.titleFontSize)}px !important;"` : '';
  return `<div class="flex items-center justify-between mb-2"><h4 ${editableAttr} data-on-blur="onChartTitleInlineEdit(this)"${tblTitleFs} class="text-sm md:text-base font-extrabold text-ink">${escapeAttr(data.title)}</h4><span class="font-mono text-[10px] text-subtle">DATA TABLE</span></div><div class="flex-1 overflow-x-hidden overflow-y-auto safe-scroll"><table class="ppt-data-table ${zebraClass}" ${tableStyle}>${theadHtml}<tbody>${trs}</tbody></table></div>`;
}
function isFloatingCardStudioOpen() { if (typeof fcStudioPopupWin !== 'undefined' && fcStudioPopupWin && !fcStudioPopupWin.closed) return true; const m = document.getElementById('floatingCardEditorModal'); return Boolean(m && !m.classList.contains('hidden')); }
function getSelectedChartWidget() {
  const isFcActive = (typeof isFloatingCardCanvasActive === 'function') ? isFloatingCardCanvasActive() : isFloatingCardStudioOpen();
  if (isFcActive) {
    const fcEditor = (typeof getActiveFcPreviewCanvas === 'function') ? getActiveFcPreviewCanvas() : document.getElementById('fcRichBodyEditor');
    if (fcEditor) {
      if (selectedElement && fcEditor.contains(selectedElement)) {
        const direct = selectedElement.classList.contains('ppt-chart-widget')
          ? selectedElement
          : (selectedElement.closest('.ppt-chart-widget') || selectedElement.querySelector('.ppt-chart-widget'));
        if (direct && fcEditor.contains(direct)) return direct;
      }
      if (fcEditor.dataset.activeChartId) {
        const fcW = fcEditor.querySelector(`[data-chart-uid="${fcEditor.dataset.activeChartId}"]`);
        if (fcW) return fcW;
      }
    }
    return null;
  }
  if (!selectedElement) return null;
  if (selectedElement.classList.contains('ppt-chart-widget')) return selectedElement;
  return selectedElement.querySelector('.ppt-chart-widget') || selectedElement.closest('.ppt-chart-widget');
}
function readChartData(widget) {
  try {
    const p = JSON.parse(widget.getAttribute('data-chart-json') || '{}');
    if (!p.cellStyles) p.cellStyles = {}; if (!Array.isArray(p.colWidths)) p.colWidths = [];
    if (!p.rowHeights || typeof p.rowHeights !== 'object') p.rowHeights = {}; if (!p.colAligns || typeof p.colAligns !== 'object') p.colAligns = {};
    if (!p.merges || typeof p.merges !== 'object') p.merges = {}; if (!p.hiddenCells || typeof p.hiddenCells !== 'object') p.hiddenCells = {};
    if (!Array.isArray(p.summaryRowIndices)) p.summaryRowIndices = []; if (!p.tableBorder) p.tableBorder = { style: 'solid', width: 1, color: '#E2E4E9' };
    if (p.showHeaderRow === undefined) p.showHeaderRow = true; if (p.zebraStriping === undefined) p.zebraStriping = true;
    if (p.valuePrefix === undefined) p.valuePrefix = ''; if (p.valueSuffix === undefined) p.valueSuffix = '';
    if (!p.legendPosition) p.legendPosition = p.type === 'donut' ? 'right' : 'none';
    return p;
  } catch (e) { return getDefaultChartData('bar-v'); }
}
function isChartMutationLocked(widget, notify) {
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(Boolean(notify))) return true;
  if (widget && (widget.getAttribute('data-layer-locked') === 'true' || (widget.closest && widget.closest('[data-layer-locked="true"]')))) {
    if (notify && typeof showToast === 'function') showToast('잠긴 차트/표 레이어는 편집할 수 없습니다.');
    return true;
  }
  return false;
}
function recordChartChangeHistory(label) { const isFcActive = (typeof isFloatingCardCanvasActive === 'function') ? isFloatingCardCanvasActive() : isFloatingCardStudioOpen(); if (isFcActive) { if (typeof recordFcSnapshot === 'function') recordFcSnapshot(); } else saveHistorySnapshot(label || '차트/표 편집'); }
function writeChartDataAndRender(widget, data) { widget.setAttribute('data-chart-json', JSON.stringify(data)); widget.innerHTML = renderChartWidgetInnerHtml(data); syncChartInspectorUI(widget); }
function syncTableCellSizeInputs(cellEl) {
  if (!cellEl) return;
  const scale = cellEl.closest('#fcRichBodyEditor') ? (typeof getFcPreviewScale === 'function' ? getFcPreviewScale() : 1) : (typeof getStageScale === 'function' ? getStageScale() : 1), rect = cellEl.getBoundingClientRect();
  const wPx = Math.max(24, Math.round(rect.width / scale)), hPx = Math.max(20, Math.round(rect.height / scale));
  if ($studio('tableCellWidthInput')) $studio('tableCellWidthInput').value = String(wPx);
  if ($studio('tableCellHeightInput')) $studio('tableCellHeightInput').value = String(hPx);
}
function startTableColResize(e, handleEl, colIdx) {
  if (!isActiveEditing()) return; e.preventDefault(); e.stopPropagation();
  const cell = handleEl.parentElement, table = cell ? cell.closest('table') : null, widget = cell ? cell.closest('.ppt-chart-widget') : null; if (!cell || !table || !widget) return;
  selectChartCellForFill(e, cell);
  const ownerDoc = cell.ownerDocument || document, scale = cell.closest('#fcRichBodyEditor') ? (typeof getFcPreviewScale === 'function' ? getFcPreviewScale() : 1) : (typeof getStageScale === 'function' ? getStageScale() : 1), data = readChartData(widget);
  const colCount = data.tableHeaders ? data.tableHeaders.length : 1;
  const initWidths = Array.from({ length: colCount }, (_, idx) => { const s = table.querySelector(`[data-col-idx="${idx}"]`); return s ? Math.max(44, Math.round(s.getBoundingClientRect().width / scale)) : 120; });
  table.style.tableLayout = 'fixed'; data.colWidths = [...initWidths]; const startX = e.clientX;
  const onMove = (me) => {
    const nextW = Math.max(44, Math.min(900, Math.round(initWidths[colIdx] + (me.clientX - startX) / scale))); data.colWidths[colIdx] = nextW;
    table.querySelectorAll(`th[data-col-idx="${colIdx}"], td[data-col-idx="${colIdx}"]`).forEach(c => { if (!c.hasAttribute('colspan')) { c.style.width = `${nextW}px`; c.style.minWidth = `${nextW}px`; c.style.maxWidth = `${nextW}px`; } });
    syncTableCellSizeInputs(cell); if (typeof positionSelectionOverlay === 'function') positionSelectionOverlay();
  };
  const onUp = () => { ownerDoc.removeEventListener('mousemove', onMove); ownerDoc.removeEventListener('mouseup', onUp); widget.setAttribute('data-chart-json', JSON.stringify(data)); recordChartChangeHistory('표 열 너비 조절'); };
  startManagedDragSession(ownerDoc, onMove, onUp);
}
function startTableRowResize(e, handleEl, rowKey) {
  if (!isActiveEditing()) return; e.preventDefault(); e.stopPropagation();
  const cell = handleEl.parentElement, tr = cell ? cell.closest('tr') : null, widget = cell ? cell.closest('.ppt-chart-widget') : null; if (!cell || !tr || !widget) return;
  selectChartCellForFill(e, cell);
  const ownerDoc = cell.ownerDocument || document, scale = cell.closest('#fcRichBodyEditor') ? (typeof getFcPreviewScale === 'function' ? getFcPreviewScale() : 1) : (typeof getStageScale === 'function' ? getStageScale() : 1), initH = Math.max(24, Math.round(tr.getBoundingClientRect().height / scale)), data = readChartData(widget);
  if (!data.rowHeights) data.rowHeights = {}; const startY = e.clientY;
  const onMove = (me) => {
    const nextH = Math.max(24, Math.min(480, Math.round(initH + (me.clientY - startY) / scale))); data.rowHeights[String(rowKey)] = nextH;
    tr.style.height = `${nextH}px`; tr.querySelectorAll('th, td').forEach(c => { c.style.height = `${nextH}px`; });
    syncTableCellSizeInputs(cell); if (typeof positionSelectionOverlay === 'function') positionSelectionOverlay();
  };
  const onUp = () => { ownerDoc.removeEventListener('mousemove', onMove); ownerDoc.removeEventListener('mouseup', onUp); widget.setAttribute('data-chart-json', JSON.stringify(data)); recordChartChangeHistory('표 행 높이 조절'); };
  startManagedDragSession(ownerDoc, onMove, onUp);
}
function applySelectedTableCellDimension(dim, rawVal) { if (isChartMutationLocked(getSelectedChartWidget(), true)) return;
  const widget = getSelectedChartWidget(); if (!widget || !activeChartCellTarget || !widget.contains(activeChartCellTarget)) return;
  const data = readChartData(widget); if (data.type !== 'table') return;
  const colIdx = parseInt(activeChartCellTarget.getAttribute('data-col-idx') || '-1', 10), rowKey = activeChartCellTarget.getAttribute('data-row-key'), px = Math.max(24, Math.min(900, Number(rawVal) || 80));
  if (dim === 'width' && colIdx >= 0) { if (!Array.isArray(data.colWidths)) data.colWidths = []; data.colWidths[colIdx] = px; }
  else if (dim === 'height' && rowKey !== null) { if (!data.rowHeights) data.rowHeights = {}; data.rowHeights[String(rowKey)] = px; }
  writeChartDataAndRender(widget, data);
  const restored = widget.querySelector(`[data-cell-key="${activeChartCellTarget.getAttribute('data-cell-key')}"]`);
  if (restored) { restored.classList.add('chart-cell-selected'); activeChartCellTarget = restored; syncTableCellSizeInputs(restored); }
  recordChartChangeHistory('표 셀 크기 변경');
}
let selectedTableCellKeys = new Set();
function selectChartCellForFill(e, cellEl) {
  if (!isActiveEditing()) return;
  const widget = cellEl.closest('.ppt-chart-widget'); if (!widget) return;
  const fcEditor = cellEl.closest('#fcRichBodyEditor');
  if (fcEditor && widget.dataset.chartUid) { fcEditor.dataset.activeChartId = widget.dataset.chartUid; }
  else if (!widget.closest('.ppt-free-obj')) selectElementForInspector(widget);
  const cellKey = cellEl.getAttribute('data-cell-key') || '', isShift = Boolean(e && e.shiftKey);
  if (isShift && cellKey && activeChartCellTarget && widget.contains(activeChartCellTarget)) {
    if (selectedTableCellKeys.has(cellKey) && selectedTableCellKeys.size > 1) { selectedTableCellKeys.delete(cellKey); cellEl.classList.remove('chart-cell-selected'); }
    else { selectedTableCellKeys.add(cellKey); cellEl.classList.add('chart-cell-selected'); }
  } else {
    document.querySelectorAll('.chart-cell-selected').forEach(el => el.classList.remove('chart-cell-selected'));
    if (fcEditor) fcEditor.querySelectorAll('.chart-cell-selected').forEach(el => el.classList.remove('chart-cell-selected'));
    selectedTableCellKeys.clear(); if (cellKey) selectedTableCellKeys.add(cellKey); cellEl.classList.add('chart-cell-selected');
  }
  activeChartCellTarget = cellEl; syncTableCellSizeInputs(cellEl); syncChartInspectorUI(widget); if (typeof syncToolbarWithTarget === 'function') syncToolbarWithTarget(cellEl);
}
function selectChartPartForColor(e, partEl, itemIdx) {
  if (!isActiveEditing()) return;
  const widget = partEl.closest('.ppt-chart-widget'); if (!widget) return;
  const fcEditor = partEl.closest('#fcRichBodyEditor');
  if (fcEditor && widget.dataset.chartUid) { fcEditor.dataset.activeChartId = widget.dataset.chartUid; }
  else if (!widget.closest('.ppt-free-obj')) selectElementForInspector(widget);
  selectedTableCellKeys.clear(); activeChartCellTarget = partEl; partEl.setAttribute('data-item-idx', String(itemIdx)); syncChartInspectorUI(widget);
}
function applyChartCellFillColor(hexColor, isLiveInput) { if (isChartMutationLocked(getSelectedChartWidget(), !isLiveInput)) return;
  const widget = getSelectedChartWidget(); if (!widget) return;
  const data = readChartData(widget);
  if (selectedTableCellKeys.size > 1) {
    if (!data.cellStyles) data.cellStyles = {};
    selectedTableCellKeys.forEach(k => { data.cellStyles[k] = { ...(data.cellStyles[k] || {}), bg: hexColor }; const cEl = widget.querySelector(`[data-cell-key="${k}"]`); if (cEl) cEl.style.setProperty('background-color', hexColor, 'important'); });
    widget.setAttribute('data-chart-json', JSON.stringify(data)); if (!isLiveInput) recordChartChangeHistory('다중 셀 채우기 색상'); return;
  }
  if (activeChartCellTarget && widget.contains(activeChartCellTarget)) {
    const cellKey = activeChartCellTarget.getAttribute('data-cell-key');
    if (cellKey) { if (!data.cellStyles) data.cellStyles = {}; data.cellStyles[cellKey] = { ...(data.cellStyles[cellKey] || {}), bg: hexColor }; activeChartCellTarget.style.setProperty('background-color', hexColor, 'important'); widget.setAttribute('data-chart-json', JSON.stringify(data)); if (!isLiveInput) recordChartChangeHistory('셀 채우기 색상'); return; }
    const itemIdx = activeChartCellTarget.getAttribute('data-item-idx');
    if (itemIdx !== null && data.items[Number(itemIdx)]) { data.syncAccent = false; data.items[Number(itemIdx)].color = hexColor; writeChartDataAndRender(widget, data); if (!isLiveInput) recordChartChangeHistory('차트 요소 색상'); return; }
  }
  widget.style.backgroundColor = hexColor; if (!isLiveInput) recordChartChangeHistory('차트 배경색');
}
function applyChartCellTextColor(hexColor, isLiveInput) { if (isChartMutationLocked(getSelectedChartWidget(), !isLiveInput)) return;
  const widget = getSelectedChartWidget(); if (!widget) return;
  const data = readChartData(widget);
  if (selectedTableCellKeys.size > 1) {
    if (!data.cellStyles) data.cellStyles = {};
    selectedTableCellKeys.forEach(k => { data.cellStyles[k] = { ...(data.cellStyles[k] || {}), color: hexColor }; const cEl = widget.querySelector(`[data-cell-key="${k}"]`); if (cEl) cEl.style.setProperty('color', hexColor, 'important'); });
    widget.setAttribute('data-chart-json', JSON.stringify(data)); if (!isLiveInput) recordChartChangeHistory('다중 셀 글자색'); return;
  }
  if (activeChartCellTarget && widget.contains(activeChartCellTarget)) {
    const cellKey = activeChartCellTarget.getAttribute('data-cell-key');
    if (cellKey) { if (!data.cellStyles) data.cellStyles = {}; data.cellStyles[cellKey] = { ...(data.cellStyles[cellKey] || {}), color: hexColor }; activeChartCellTarget.style.setProperty('color', hexColor, 'important'); widget.setAttribute('data-chart-json', JSON.stringify(data)); if (!isLiveInput) recordChartChangeHistory('셀 글자색'); return; }
  }
  widget.style.color = hexColor; if (!isLiveInput) recordChartChangeHistory('차트 글자색');
}
function insertChartOrTable(type, targetMode) {
  if (typeof isFloatingCardCanvasActive === 'function' && isFloatingCardCanvasActive()) {
    const fcEd = typeof getActiveFcPreviewCanvas === 'function' ? getActiveFcPreviewCanvas() : null;
    if (fcEd) {
      const uid = 'chart_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const cw = fcEd.ownerDocument.createElement('div');
      cw.className = 'ppt-chart-widget fc-resizable-item my-3 p-3 rounded-xl border border-borderline bg-white';
      cw.setAttribute('data-chart-uid', uid);
      cw.setAttribute('contenteditable', 'false');
      cw.style.width = '100%';
      fcEd.appendChild(cw);
      fcEd.dataset.activeChartId = uid;
      const data = getDefaultChartData(type || 'bar-v');
      writeChartDataAndRender(cw, data);
      if (typeof makeFcBlockResizable === 'function') makeFcBlockResizable(cw);
      if (typeof selectElementForInspector === 'function') selectElementForInspector(cw, false);
      if (typeof recordFcSnapshot === 'function') recordFcSnapshot();
      showToast('플로팅 카드 미리보기에 라이브 차트/표가 삽입되었습니다!');
      return;
    }
  }
  if (typeof isCurrentSlideLocked === 'function' && isCurrentSlideLocked(true)) return;
  if (typeof isInteractiveTestMode !== 'undefined' && isInteractiveTestMode && typeof toggleInteractiveTestMode === 'function') toggleInteractiveTestMode(false);
  if (!isEditMode && typeof toggleEditMode === 'function') toggleEditMode(true);
  const uiTargetSel = $studio('chartInsertTargetSelect');
  const resolvedMode = (targetMode && targetMode !== 'auto') ? targetMode : (uiTargetSel ? uiTargetSel.value : 'auto');
  const data = getDefaultChartData(type || 'bar-v'), widget = document.createElement('div');
  widget.className = 'ppt-chart-widget mt-3'; widget.setAttribute('data-chart-uid', 'chart_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7));
  widget.setAttribute('data-chart-json', JSON.stringify(data)); widget.innerHTML = renderChartWidgetInnerHtml(data);

  let targetCard = null;
  if (resolvedMode === 'card') {
    targetCard = typeof getTargetCardForHierarchy === 'function' ? getTargetCardForHierarchy() : null;
  } else if (resolvedMode === 'auto') {
    targetCard = typeof shouldInsertIntoSelectedCard === 'function' ? shouldInsertIntoSelectedCard() : null;
  }

  if (targetCard) {
    widget.style.minHeight = '190px';
    targetCard.appendChild(widget);
    selectElementForInspector(widget);
    if (typeof refreshLayerList === 'function') refreshLayerList();
    recordChartChangeHistory('카드 내 차트/표 삽입');
    showToast('선택한 카드 내부에 그래프/표가 삽입되었습니다.');
    return;
  }

  const activeSlideEl = document.querySelector('#slideStage .slide.active') || slides[currentSlide - 1];
  if (!activeSlideEl) return;
  if (typeof ensureFreeLayersOnAllSlides === 'function') ensureFreeLayersOnAllSlides();
  let layer = activeSlideEl.querySelector('.ppt-free-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'ppt-free-layer';
    activeSlideEl.appendChild(layer);
  }
  const existingCharts = layer.querySelectorAll('.ppt-free-obj[data-shape-type="chart"]').length;
  const offsetPct = (existingCharts % 5) * 3;
  const freeObj = document.createElement('div');
  freeObj.className = 'ppt-free-obj shadow-lg'; freeObj.setAttribute('data-shape-type', 'chart');
  freeObj.style.left = `${20 + offsetPct}%`; freeObj.style.top = `${20 + offsetPct}%`;
  freeObj.style.width = '56%'; freeObj.style.height = '48%';
  freeObj.style.padding = '14px'; freeObj.style.backgroundColor = '#FFFFFF';
  freeObj.style.borderRadius = '16px'; freeObj.style.border = '1.5px solid #E2E4E9';
  freeObj.style.zIndex = String(layer.children.length + 24);
  widget.classList.remove('mt-3');
  widget.style.width = '100%'; widget.style.height = '100%'; widget.style.display = 'flex'; widget.style.flexDirection = 'column';
  freeObj.appendChild(widget); layer.appendChild(freeObj);
  selectElementForInspector(freeObj);
  if (typeof refreshLayerList === 'function') refreshLayerList();
  recordChartChangeHistory('차트/표 삽입');
  showToast('슬라이드에 그래프/표가 삽입되었습니다.');
}
function changeSelectedChartType(nextType) { if (isChartMutationLocked(getSelectedChartWidget(), true)) return; const w = getSelectedChartWidget(); if (!w) return; const d = readChartData(w); d.type = nextType; if (nextType === 'donut' && d.legendPosition === 'none') d.legendPosition = 'right'; writeChartDataAndRender(w, d); recordChartChangeHistory('차트 유형 전환'); }
function toggleChartAccentSync(checked) { if (isChartMutationLocked(getSelectedChartWidget(), true)) return; const w = getSelectedChartWidget(); if (!w) return; const d = readChartData(w); d.syncAccent = Boolean(checked); if (!d.syncAccent && Array.isArray(d.items)) d.items.forEach((it, i) => { if (!it.color) it.color = DEFAULT_CHART_PALETTE[i % DEFAULT_CHART_PALETTE.length]; }); writeChartDataAndRender(w, d); recordChartChangeHistory('차트 포인트 컬러 연동'); }
function syncActiveScenarioFromChartData(d, structuralOp, itemOrIdx) {
  if (!d || !d.scenariosEnabled || !Array.isArray(d.scenarios) || d.scenarios.length === 0) return;
  const activeIdx = Math.max(0, Math.min(d.scenarios.length - 1, Number(d.activeScenarioIdx) || 0));
  if (d.scenarios[activeIdx]) {
    d.scenarios[activeIdx].items = (d.items || []).map(it => Object.assign({}, it));
  }
  if (structuralOp === 'add' && itemOrIdx) {
    d.scenarios.forEach((sc, sIdx) => {
      if (sIdx !== activeIdx && Array.isArray(sc.items)) sc.items.push(Object.assign({}, itemOrIdx));
    });
  } else if (structuralOp === 'remove' && typeof itemOrIdx === 'number') {
    d.scenarios.forEach((sc, sIdx) => {
      if (sIdx !== activeIdx && Array.isArray(sc.items) && sc.items.length > 1 && itemOrIdx < sc.items.length) {
        sc.items.splice(itemOrIdx, 1);
      }
    });
  }
}

function updateChartItemField(idx, field, val, isLiveInput) { if (isChartMutationLocked(getSelectedChartWidget(), !isLiveInput)) return;
  const w = getSelectedChartWidget(); if (!w) return; const d = readChartData(w); if (!d.items || !d.items[idx]) return;
  if (field === 'value') d.items[idx].value = Math.max(-100000000, Math.min(100000000, Number(val) || 0));
  else if (field === 'color') { d.syncAccent = false; d.items[idx].color = val; } else d.items[idx][field] = val;
  syncActiveScenarioFromChartData(d); w.setAttribute('data-chart-json', JSON.stringify(d)); w.innerHTML = renderChartWidgetInnerHtml(d);
  if (!isLiveInput) { syncChartInspectorUI(w); recordChartChangeHistory('차트 항목 수정'); }
}
function setChartValueAffix(kind, rawVal) { if (isChartMutationLocked(getSelectedChartWidget(), true)) return; const w = getSelectedChartWidget(); if (!w) return; const d = readChartData(w), c = String(rawVal || '').slice(0, 12); if (kind === 'prefix') d.valuePrefix = c; else d.valueSuffix = c; writeChartDataAndRender(w, d); recordChartChangeHistory('차트 데이터 단위 설정'); }
function setChartLegendPosition(pos) { if (isChartMutationLocked(getSelectedChartWidget(), true)) return; const w = getSelectedChartWidget(); if (!w) return; const d = readChartData(w); d.legendPosition = pos || 'none'; writeChartDataAndRender(w, d); recordChartChangeHistory('차트 범례 위치 변경'); }
function toggleCsvPastePanel() { const p = $studio('csvPasteImportPanel'); if (!p) return; p.classList.toggle('hidden'); if (!p.classList.contains('hidden')) { const ta = $studio('csvPasteTextarea'); if (ta) ta.focus(); } }
function parseDelimitedTableText(rawText) {
  const text = String(rawText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!text) return [];
  const delim = (text.split('\n')[0] || '').includes('\t') ? '\t' : ',';
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === delim) { row.push(field.trim()); field = ''; }
      else if (ch === '\n') { row.push(field.trim()); if (row.some(c => c.length > 0)) rows.push(row); row = []; field = ''; }
      else field += ch;
    }
  }
  row.push(field.trim());
  if (row.some(c => c.length > 0)) rows.push(row);
  return rows;
}
function applyCsvPasteToChartOrTable(explicitText) { if (isChartMutationLocked(getSelectedChartWidget(), true)) return;
  const ta = $studio('csvPasteTextarea'), raw = explicitText !== undefined ? explicitText : (ta ? ta.value : ''), parsedRows = parseDelimitedTableText(raw);
  if (parsedRows.length === 0) {
    showToast('붙여넣을 엑셀·CSV 데이터를 입력해 주세요.');
    return;
  }
  let w = getSelectedChartWidget(); if (!w) { insertChartOrTable('table', 'slide'); w = getSelectedChartWidget(); } if (!w) return;
  const d = readChartData(w);
  if (d.type === 'table') {
    const maxCols = Math.max(...parsedRows.map(r => r.length)), headers = parsedRows[0].map((h, i) => h || `열 ${i + 1}`);
    while (headers.length < maxCols) headers.push(`열 ${headers.length + 1}`);
    d.tableHeaders = headers; d.tableRows = parsedRows.length > 1 ? parsedRows.slice(1).map(r => { const p = [...r]; while (p.length < maxCols) p.push(''); return p; }) : [Array.from({ length: maxCols }, () => '데이터 입력')];
    d.merges = {}; d.hiddenCells = {}; d.colWidths = []; d.rowHeights = {}; d.summaryRowIndices = []; d.cellStyles = {}; d.colAligns = {};
    writeChartDataAndRender(w, d); recordChartChangeHistory('엑셀/CSV 표 데이터 반영');
    showToast(`엑셀/CSV 데이터(${d.tableRows.length}행 × ${headers.length}열)가 표에 반영되었습니다.`);
  } else {
    const startIdx = (parsedRows.length > 1 && isNaN(parseFloat(String(parsedRows[0][1] || '').replace(/[^0-9.-]/g, '')))) ? 1 : 0;
    const items = parsedRows.slice(startIdx).map((r, i) => { const n = parseFloat(String(r[1] || '0').replace(/[^0-9.-]/g, '')); return { label: r[0] || `항목 ${i + 1}`, value: !isNaN(n) ? n : 0, sub: r[2] || 'DATA', color: DEFAULT_CHART_PALETTE[i % DEFAULT_CHART_PALETTE.length] }; });
    if (items.length > 0) {
      d.items = items;
      if (d.scenariosEnabled && Array.isArray(d.scenarios) && d.scenarios[d.activeScenarioIdx || 0]) {
        d.scenarios[d.activeScenarioIdx || 0].items = items.map(it => Object.assign({}, it));
      }
      writeChartDataAndRender(w, d); recordChartChangeHistory('엑셀/CSV 차트 데이터 반영');
      showToast(`엑셀/CSV 데이터(${items.length}개 항목)가 차트에 반영되었습니다.`);
    }
  }
  if (ta) ta.value = '';
  const panel = $studio('csvPasteImportPanel');
  if (panel) panel.classList.add('hidden');
}
function resetTableMerges(data) { data.merges = {}; data.hiddenCells = {}; }
function getSelectedTableCellCoords() {
  if (!activeChartCellTarget) return { section: null, rIdx: -1, cIdx: -1, cellKey: null };
  const cellKey = activeChartCellTarget.getAttribute('data-cell-key') || '', cIdx = parseInt(activeChartCellTarget.getAttribute('data-col-idx') || '-1', 10), rowKey = activeChartCellTarget.getAttribute('data-row-key');
  if (rowKey === 'header') return { section: 'th', rIdx: 0, cIdx, cellKey };
  const rIdx = parseInt(rowKey || '-1', 10); return { section: rIdx >= 0 ? 'td' : null, rIdx, cIdx, cellKey };
}
function mergeSelectedTableCells() { if (isChartMutationLocked(getSelectedChartWidget(), true)) return;
  const w = getSelectedChartWidget(); if (!w) return; const d = readChartData(w); if (d.type !== 'table') return;
  if (!d.merges) d.merges = {};
  if (!d.hiddenCells) d.hiddenCells = {};
  const colTotal = Array.isArray(d.tableHeaders) ? d.tableHeaders.length : 0;
  const rowTotal = Array.isArray(d.tableRows) ? d.tableRows.length : 0;
  const tdKeys = Array.from(selectedTableCellKeys).filter(k => k.startsWith('td-')), thKeys = Array.from(selectedTableCellKeys).filter(k => k.startsWith('th-'));

  if (thKeys.length >= 2) {
    const cols = thKeys.map(k => parseInt(k.split('-')[1], 10)).filter(n => !isNaN(n));
    let cMin = Math.min(...cols), cMax = Math.max(...cols);
    // Expand across any overlapping existing header merges
    let expanded = true;
    while (expanded) {
      expanded = false;
      Object.keys(d.merges).forEach(mk => {
        if (!mk.startsWith('th-')) return;
        const mc = parseInt(mk.split('-')[1], 10), m = d.merges[mk];
        const mcEnd = mc + (m.colspan || 1) - 1;
        if (mc <= cMax && mcEnd >= cMin) {
          if (mc < cMin) { cMin = mc; expanded = true; }
          if (mcEnd > cMax) { cMax = mcEnd; expanded = true; }
        }
      });
    }
    const colspan = cMax - cMin + 1;
    if (colspan >= 2) {
      const mergedTexts = [];
      for (let c = cMin; c <= cMax; c++) { const t = (d.tableHeaders[c] || '').trim(); if (t && !mergedTexts.includes(t)) mergedTexts.push(t); if (c > cMin) { d.hiddenCells[`th-${c}`] = true; delete d.merges[`th-${c}`]; } }
      d.tableHeaders[cMin] = mergedTexts.join(' / '); d.merges[`th-${cMin}`] = { colspan, rowspan: 1 }; delete d.hiddenCells[`th-${cMin}`];
      selectedTableCellKeys = new Set([`th-${cMin}`]); writeChartDataAndRender(w, d); recordChartChangeHistory('표 헤더 셀 병합'); return;
    }
  }

  if (tdKeys.length >= 2) {
    const coords = tdKeys.map(k => { const p = k.split('-'); return { r: parseInt(p[1], 10), c: parseInt(p[2], 10) }; }).filter(o => !isNaN(o.r) && !isNaN(o.c));
    let rMin = Math.min(...coords.map(o => o.r)), rMax = Math.max(...coords.map(o => o.r));
    let cMin = Math.min(...coords.map(o => o.c)), cMax = Math.max(...coords.map(o => o.c));
    // Expand bounding box to completely enclose any intersecting existing body merges
    let expanded = true;
    while (expanded) {
      expanded = false;
      Object.keys(d.merges).forEach(mk => {
        if (!mk.startsWith('td-')) return;
        const p = mk.split('-'), mr = parseInt(p[1], 10), mc = parseInt(p[2], 10), m = d.merges[mk];
        const mrEnd = mr + (m.rowspan || 1) - 1, mcEnd = mc + (m.colspan || 1) - 1;
        if (mr <= rMax && mrEnd >= rMin && mc <= cMax && mcEnd >= cMin) {
          if (mr < rMin) { rMin = mr; expanded = true; }
          if (mrEnd > rMax) { rMax = mrEnd; expanded = true; }
          if (mc < cMin) { cMin = mc; expanded = true; }
          if (mcEnd > cMax) { cMax = mcEnd; expanded = true; }
        }
      });
    }
    const rowspan = rMax - rMin + 1, colspan = cMax - cMin + 1;
    if (rowspan * colspan >= 2) {
      const mergedTexts = [];
      for (let r = rMin; r <= rMax; r++) for (let c = cMin; c <= cMax; c++) { const k = `td-${r}-${c}`, t = (d.tableRows[r] && d.tableRows[r][c] ? String(d.tableRows[r][c]) : '').trim(); if (t && !mergedTexts.includes(t)) mergedTexts.push(t); if (!(r === rMin && c === cMin)) { d.hiddenCells[k] = true; delete d.merges[k]; } }
      d.tableRows[rMin][cMin] = mergedTexts.join(' / '); const anchorKey = `td-${rMin}-${cMin}`; delete d.hiddenCells[anchorKey]; d.merges[anchorKey] = { colspan, rowspan };
      selectedTableCellKeys = new Set([anchorKey]); writeChartDataAndRender(w, d); recordChartChangeHistory('표 셀 병합'); return;
    }
  }

  const { section, rIdx, cIdx, cellKey } = getSelectedTableCellCoords(); if (!section || cIdx < 0) return;
  const curMerge = d.merges[cellKey] || { colspan: 1, rowspan: 1 }, nextCol = cIdx + curMerge.colspan; if (nextCol >= colTotal) return;
  if (section === 'th') {
    const nextMerge = d.merges[`th-${nextCol}`] || { colspan: 1, rowspan: 1 };
    const addSpan = Math.min(colTotal - nextCol, nextMerge.colspan || 1);
    const rt = (d.tableHeaders[nextCol] || '').trim();
    if (rt) d.tableHeaders[cIdx] = `${d.tableHeaders[cIdx]} / ${rt}`;
    for (let c = nextCol; c < nextCol + addSpan; c++) { d.hiddenCells[`th-${c}`] = true; delete d.merges[`th-${c}`]; }
    d.merges[cellKey] = { colspan: curMerge.colspan + addSpan, rowspan: 1 };
  } else if (section === 'td' && d.tableRows[rIdx]) {
    const rowEnd = Math.min(rowTotal - 1, rIdx + (curMerge.rowspan || 1) - 1);
    const mergedTexts = [];
    const baseT = (d.tableRows[rIdx][cIdx] || '').trim();
    if (baseT) mergedTexts.push(baseT);
    // Also check if any cell in nextCol along our rowspan has its own colspan/rowspan
    let colEnd = nextCol;
    let finalRowEnd = rowEnd;
    for (let r = rIdx; r <= finalRowEnd; r++) {
      const mNext = d.merges[`td-${r}-${nextCol}`];
      if (mNext) {
        colEnd = Math.max(colEnd, nextCol + (mNext.colspan || 1) - 1);
        finalRowEnd = Math.max(finalRowEnd, Math.min(rowTotal - 1, r + (mNext.rowspan || 1) - 1));
      }
    }
    for (let r = rIdx; r <= finalRowEnd; r++) {
      for (let c = cIdx; c <= colEnd; c++) {
        if (r === rIdx && c === cIdx) continue;
        const k = `td-${r}-${c}`;
        const t = (d.tableRows[r] && d.tableRows[r][c] ? String(d.tableRows[r][c]) : '').trim();
        if (t && !mergedTexts.includes(t)) mergedTexts.push(t);
        d.hiddenCells[k] = true;
        delete d.merges[k];
      }
    }
    d.tableRows[rIdx][cIdx] = mergedTexts.join(' / ');
    d.merges[cellKey] = { colspan: colEnd - cIdx + 1, rowspan: finalRowEnd - rIdx + 1 };
  }
  writeChartDataAndRender(w, d); recordChartChangeHistory('표 인접 셀 병합');
}
function splitSelectedTableCell() { if (isChartMutationLocked(getSelectedChartWidget(), true)) return;
  const w = getSelectedChartWidget(); if (!w) return; const d = readChartData(w); if (d.type !== 'table') return;
  const { section, rIdx, cIdx, cellKey } = getSelectedTableCellCoords();
  if (cellKey && d.merges[cellKey]) {
    const m = d.merges[cellKey];
    if (section === 'th') { for (let c = cIdx + 1; c < cIdx + m.colspan; c++) delete d.hiddenCells[`th-${c}`]; }
    else if (section === 'td') { for (let r = rIdx; r < rIdx + m.rowspan; r++) for (let c = cIdx; c < cIdx + m.colspan; c++) if (!(r === rIdx && c === cIdx)) delete d.hiddenCells[`td-${r}-${c}`]; }
    delete d.merges[cellKey]; writeChartDataAndRender(w, d); recordChartChangeHistory('표 셀 분할'); return;
  }
  if (Object.keys(d.merges).length > 0) { resetTableMerges(d); writeChartDataAndRender(w, d); recordChartChangeHistory('표 전체 셀 분할'); }
}
function shiftTableCellStylesOnRow(data, pivotRow, delta) {
  if (!data) return;
  if (data.cellStyles && typeof data.cellStyles === 'object') {
    const nextStyles = {};
    Object.keys(data.cellStyles).forEach(k => {
      const m = k.match(/^td-(\d+)-(\d+)$/);
      if (!m) { nextStyles[k] = data.cellStyles[k]; return; }
      const r = parseInt(m[1], 10), c = parseInt(m[2], 10);
      if (delta < 0 && r === pivotRow) return;
      const nextR = (delta > 0 && r >= pivotRow) ? (r + 1) : ((delta < 0 && r > pivotRow) ? (r - 1) : r);
      nextStyles[`td-${nextR}-${c}`] = data.cellStyles[k];
    });
    data.cellStyles = nextStyles;
  }
  if (data.rowHeights && typeof data.rowHeights === 'object') {
    const nextHeights = {};
    Object.keys(data.rowHeights).forEach(k => {
      if (k === 'header') { nextHeights.header = data.rowHeights.header; return; }
      const r = parseInt(k, 10);
      if (isNaN(r)) return;
      if (delta < 0 && r === pivotRow) return;
      const nextR = (delta > 0 && r >= pivotRow) ? (r + 1) : ((delta < 0 && r > pivotRow) ? (r - 1) : r);
      nextHeights[String(nextR)] = data.rowHeights[k];
    });
    data.rowHeights = nextHeights;
  }
}

function shiftTableCellStylesOnCol(data, pivotCol, delta) {
  if (!data) return;
  if (data.cellStyles && typeof data.cellStyles === 'object') {
    const nextStyles = {};
    Object.keys(data.cellStyles).forEach(k => {
      const mTh = k.match(/^th-(\d+)$/);
      if (mTh) {
        const c = parseInt(mTh[1], 10);
        if (delta < 0 && c === pivotCol) return;
        const nextC = (delta > 0 && c >= pivotCol) ? (c + 1) : ((delta < 0 && c > pivotCol) ? (c - 1) : c);
        nextStyles[`th-${nextC}`] = data.cellStyles[k];
        return;
      }
      const mTd = k.match(/^td-(\d+)-(\d+)$/);
      if (mTd) {
        const r = parseInt(mTd[1], 10), c = parseInt(mTd[2], 10);
        if (delta < 0 && c === pivotCol) return;
        const nextC = (delta > 0 && c >= pivotCol) ? (c + 1) : ((delta < 0 && c > pivotCol) ? (c - 1) : c);
        nextStyles[`td-${r}-${nextC}`] = data.cellStyles[k];
        return;
      }
      nextStyles[k] = data.cellStyles[k];
    });
    data.cellStyles = nextStyles;
  }
  if (data.colAligns && typeof data.colAligns === 'object') {
    const nextAligns = {};
    Object.keys(data.colAligns).forEach(k => {
      const c = parseInt(k, 10);
      if (isNaN(c)) return;
      if (delta < 0 && c === pivotCol) return;
      const nextC = (delta > 0 && c >= pivotCol) ? (c + 1) : ((delta < 0 && c > pivotCol) ? (c - 1) : c);
      nextAligns[String(nextC)] = data.colAligns[k];
    });
    data.colAligns = nextAligns;
  }
}

function insertTableRowAt(offset) { if (isChartMutationLocked(getSelectedChartWidget(), true)) return;
  const w = getSelectedChartWidget(); if (!w) return; const d = readChartData(w);
  if (d.type !== 'table') { addChartDataRow(); return; }
  const { section, rIdx } = getSelectedTableCellCoords(), colCount = d.tableHeaders ? d.tableHeaders.length : 3;
  const insertIdx = (section === 'td' && rIdx >= 0) ? Math.max(0, Math.min(d.tableRows.length, rIdx + offset)) : d.tableRows.length;
  d.tableRows.splice(insertIdx, 0, Array.from({ length: colCount }, (_, i) => i === 0 ? `새 항목 ${insertIdx + 1}` : '내용 입력'));
  shiftTableCellStylesOnRow(d, insertIdx, 1);
  resetTableMerges(d); d.summaryRowIndices = (d.summaryRowIndices || []).map(idx => idx >= insertIdx ? idx + 1 : idx);
  recalculateTableSummaryRows(d);
  writeChartDataAndRender(w, d); recordChartChangeHistory('표 중간 행 삽입');
}
function insertTableColAt(offset) { if (isChartMutationLocked(getSelectedChartWidget(), true)) return;
  const w = getSelectedChartWidget(); if (!w) return; const d = readChartData(w); if (d.type !== 'table') return;
  const { cIdx } = getSelectedTableCellCoords(), insertIdx = cIdx >= 0 ? Math.max(0, Math.min(d.tableHeaders.length, cIdx + offset)) : d.tableHeaders.length;
  d.tableHeaders.splice(insertIdx, 0, `새 열 ${insertIdx + 1}`); d.tableRows.forEach(row => row.splice(insertIdx, 0, '내용 입력'));
  if (Array.isArray(d.colWidths) && d.colWidths.length > 0) d.colWidths.splice(insertIdx, 0, 120);
  shiftTableCellStylesOnCol(d, insertIdx, 1);
  resetTableMerges(d); recalculateTableSummaryRows(d); writeChartDataAndRender(w, d); recordChartChangeHistory('표 중간 열 삽입');
}
function removeSelectedTableCol() { if (isChartMutationLocked(getSelectedChartWidget(), true)) return;
  const w = getSelectedChartWidget(); if (!w) return; const d = readChartData(w); if (d.type !== 'table' || !Array.isArray(d.tableHeaders) || d.tableHeaders.length <= 1) return;
  const { cIdx } = getSelectedTableCellCoords(), targetCol = (cIdx >= 0 && cIdx < d.tableHeaders.length) ? cIdx : (d.tableHeaders.length - 1);
  d.tableHeaders.splice(targetCol, 1); d.tableRows.forEach(row => { if (targetCol < row.length) row.splice(targetCol, 1); });
  if (Array.isArray(d.colWidths) && targetCol < d.colWidths.length) d.colWidths.splice(targetCol, 1);
  shiftTableCellStylesOnCol(d, targetCol, -1);
  resetTableMerges(d); recalculateTableSummaryRows(d); activeChartCellTarget = null; selectedTableCellKeys.clear();
  writeChartDataAndRender(w, d); recordChartChangeHistory('표 선택 열 삭제');
}
function removeSelectedTableRow() { if (isChartMutationLocked(getSelectedChartWidget(), true)) return;
  const w = getSelectedChartWidget(); if (!w) return; const d = readChartData(w);
  if (d.type !== 'table') { if (Array.isArray(d.items) && d.items.length > 1) removeChartDataRow(d.items.length - 1); return; }
  if (!Array.isArray(d.tableRows) || d.tableRows.length <= 1) return;
  const { section, rIdx } = getSelectedTableCellCoords(), targetRow = (section === 'td' && rIdx >= 0 && rIdx < d.tableRows.length) ? rIdx : (d.tableRows.length - 1);
  d.tableRows.splice(targetRow, 1); d.summaryRowIndices = (d.summaryRowIndices || []).filter(idx => idx !== targetRow).map(idx => idx > targetRow ? idx - 1 : idx);
  shiftTableCellStylesOnRow(d, targetRow, -1);
  resetTableMerges(d); recalculateTableSummaryRows(d); activeChartCellTarget = null; selectedTableCellKeys.clear();
  writeChartDataAndRender(w, d); recordChartChangeHistory('표 선택 행 삭제');
}
function toggleTableOption(optName) { if (isChartMutationLocked(getSelectedChartWidget(), true)) return; const w = getSelectedChartWidget(); if (!w) return; const d = readChartData(w); if (d.type !== 'table') return; if (optName === 'header') d.showHeaderRow = !(d.showHeaderRow !== false); else if (optName === 'firstCol') d.highlightFirstCol = !d.highlightFirstCol; else if (optName === 'zebra') d.zebraStriping = !(d.zebraStriping !== false); writeChartDataAndRender(w, d); recordChartChangeHistory('표 스타일 옵션 변경'); }
function setTableCellPaddingPreset(padStr) { if (isChartMutationLocked(getSelectedChartWidget(), true)) return; const w = getSelectedChartWidget(); if (!w) return; const d = readChartData(w); if (d.type !== 'table') return; d.cellPadding = padStr || '7px 10px'; writeChartDataAndRender(w, d); recordChartChangeHistory('표 셀 여백 변경'); }
function setTableColumnAlign(alignVal) { if (isChartMutationLocked(getSelectedChartWidget(), true)) return; const w = getSelectedChartWidget(); if (!w) return; const d = readChartData(w); if (d.type !== 'table') return; if (!d.colAligns) d.colAligns = {}; const { cIdx } = getSelectedTableCellCoords(); if (cIdx >= 0) d.colAligns[String(cIdx)] = alignVal; else d.tableHeaders.forEach((_, idx) => { d.colAligns[String(idx)] = alignVal; }); writeChartDataAndRender(w, d); recordChartChangeHistory('표 열 정렬 변경'); }
function updateTableBorderStyle(prop, val) { if (isChartMutationLocked(getSelectedChartWidget(), true)) return; const w = getSelectedChartWidget(); if (!w) return; const d = readChartData(w); if (d.type !== 'table') return; if (!d.tableBorder) d.tableBorder = { style: 'solid', width: 1, color: '#E2E4E9' }; if (prop === 'style') d.tableBorder.style = val; else if (prop === 'width') d.tableBorder.width = Math.max(0, Math.min(6, Number(val) || 0)); else if (prop === 'color') d.tableBorder.color = val; writeChartDataAndRender(w, d); recordChartChangeHistory('표 테두리 스타일 변경'); }
function equalizeTableColWidths() { if (isChartMutationLocked(getSelectedChartWidget(), true)) return;
  const w = getSelectedChartWidget(); if (!w) return;
  const d = readChartData(w); if (d.type !== 'table' || !Array.isArray(d.tableHeaders) || d.tableHeaders.length === 0) return;
  const tableEl = w.querySelector('table.ppt-data-table');
  const scale = w.closest('#fcRichBodyEditor') ? (typeof getFcPreviewScale === 'function' ? getFcPreviewScale() : 1) : (typeof getStageScale === 'function' ? getStageScale() : 1);
  // Estimate minimum column width needed for adjusted text size so text never collapses
  let maxFontPx = Number(d.tableFontSize || 12);
  if (d.cellStyles) Object.values(d.cellStyles).forEach(cs => { if (cs && Number(cs.fontSize) > maxFontPx) maxFontPx = Number(cs.fontSize); });
  const minTextW = Math.max(64, Math.round(maxFontPx * 4.5));
  const measuredW = tableEl && tableEl.getBoundingClientRect().width > 0 ? Math.round(tableEl.getBoundingClientRect().width / scale) : (d.tableHeaders.length * 130);
  const eachW = Math.max(minTextW, Math.floor(measuredW / d.tableHeaders.length));
  d.colWidths = d.tableHeaders.map(() => eachW);
  writeChartDataAndRender(w, d);
  recordChartChangeHistory('표 열 너비 균등 배분');
  showToast(`텍스트 크기(${maxFontPx}px)에 맞춰 열 너비가 ${eachW}px로 균등 배분되었습니다.`);
}
function equalizeTableRowHeights() { if (isChartMutationLocked(getSelectedChartWidget(), true)) return;
  const w = getSelectedChartWidget(); if (!w) return;
  const d = readChartData(w); if (d.type !== 'table') return;
  const tableEl = w.querySelector('table.ppt-data-table');
  const scale = w.closest('#fcRichBodyEditor') ? (typeof getFcPreviewScale === 'function' ? getFcPreviewScale() : 1) : (typeof getStageScale === 'function' ? getStageScale() : 1);
  let maxNaturalH = 34;
  if (tableEl) {
    const trs = Array.from(tableEl.querySelectorAll('tr'));
    trs.forEach(tr => {
      const prevH = tr.style.height;
      tr.style.height = 'auto';
      Array.from(tr.children).forEach(cell => {
        const prevCellH = cell.style.height;
        cell.style.height = 'auto';
        const cellRectH = Math.ceil(cell.getBoundingClientRect().height / scale);
        const cellFont = parseFloat(window.getComputedStyle(cell).fontSize) || 12;
        const minByFont = Math.ceil(cellFont * 1.9 + 14);
        maxNaturalH = Math.max(maxNaturalH, cellRectH, minByFont);
        cell.style.height = prevCellH;
      });
      tr.style.height = prevH;
    });
  }
  const targetH = Math.max(32, Math.min(260, Math.round(maxNaturalH)));
  d.rowHeights = { header: targetH };
  (d.tableRows || []).forEach((_, idx) => { d.rowHeights[String(idx)] = targetH; });
  writeChartDataAndRender(w, d);
  recordChartChangeHistory('표 행 높이 균등 배분');
  showToast(`조절된 텍스트 크기에 맞춰 모든 행 높이가 ${targetH}px로 균등 배분되었습니다.`);
}
function sortTableBySelectedColumn(dir) {
  const w = getSelectedChartWidget(); if (!w) return; const d = readChartData(w); if (d.type !== 'table' || !Array.isArray(d.tableRows) || d.tableRows.length < 2) return;
  const { cIdx } = getSelectedTableCellCoords(), sortCol = (cIdx >= 0 && cIdx < d.tableHeaders.length) ? cIdx : 0;
  const effectiveDir = (d.lastSortCol === sortCol && d.lastSortDir === 'asc' && dir === 'asc') ? 'desc' : (dir || 'asc');
  const mult = effectiveDir === 'desc' ? -1 : 1;
  const parseNum = (str) => { const c = String(str || '').replace(/[,₩$%원건명개\s]/g, ''); return (c && /^-?\d+(?:\.\d+)?$/.test(c)) ? parseFloat(c) : null; };

  const summarySet = new Set(Array.isArray(d.summaryRowIndices) ? d.summaryRowIndices : []);
  const dataEntries = [];
  const summaryEntries = [];
  d.tableRows.forEach((row, origIdx) => {
    if (summarySet.has(origIdx)) summaryEntries.push({ row, origIdx });
    else dataEntries.push({ row, origIdx });
  });
  if (dataEntries.length < 2) return;

  dataEntries.sort((ea, eb) => {
    const a = ea.row, b = eb.row;
    const nA = parseNum(a[sortCol]), nB = parseNum(b[sortCol]);
    if (nA !== null && nB !== null) return (nA - nB) * mult;
    return String(a[sortCol] || '').localeCompare(String(b[sortCol] || ''), 'ko') * mult;
  });

  const combined = dataEntries.concat(summaryEntries);
  const oldToNewRow = new Map();
  combined.forEach((entry, newIdx) => oldToNewRow.set(entry.origIdx, newIdx));

  d.tableRows = combined.map(entry => entry.row);
  d.summaryRowIndices = summaryEntries.map((_, i) => dataEntries.length + i);

  // Remap cellStyles & rowHeights so custom cell fills move with their sorted rows!
  if (d.cellStyles && typeof d.cellStyles === 'object') {
    const nextStyles = {};
    Object.keys(d.cellStyles).forEach(k => {
      const m = k.match(/^td-(\d+)-(\d+)$/);
      if (!m) { nextStyles[k] = d.cellStyles[k]; return; }
      const oldR = parseInt(m[1], 10), col = m[2];
      const newR = oldToNewRow.has(oldR) ? oldToNewRow.get(oldR) : oldR;
      nextStyles[`td-${newR}-${col}`] = d.cellStyles[k];
    });
    d.cellStyles = nextStyles;
  }
  if (d.rowHeights && typeof d.rowHeights === 'object') {
    const nextHeights = {};
    Object.keys(d.rowHeights).forEach(k => {
      if (k === 'header') { nextHeights.header = d.rowHeights.header; return; }
      const oldR = parseInt(k, 10);
      if (isNaN(oldR)) return;
      const newR = oldToNewRow.has(oldR) ? oldToNewRow.get(oldR) : oldR;
      nextHeights[String(newR)] = d.rowHeights[k];
    });
    d.rowHeights = nextHeights;
  }

  d.lastSortCol = sortCol; d.lastSortDir = effectiveDir;
  resetTableMerges(d); writeChartDataAndRender(w, d);
  recordChartChangeHistory(`표 열 정렬 (${effectiveDir === 'desc' ? '내림차순' : '오름차순'})`);
  showToast(`열 기준 ${effectiveDir === 'desc' ? '내림차순' : '오름차순'}으로 정렬되었습니다.`);
}
function computeSummaryRowCells(dataRowsOnly, colCount, aggType, existingLabel) {
  return Array.from({ length: colCount }, (_, cIdx) => {
    if (cIdx === 0) return existingLabel || (aggType === 'avg' ? '평균 (AVG)' : '합계 (SUM)');
    const nums = [];
    dataRowsOnly.forEach(r => {
      const c = String(r[cIdx] || '').replace(/[,₩$%원건명개\s]/g, '');
      if (c && /^-?\d+(?:\.\d+)?$/.test(c)) nums.push(parseFloat(c));
    });
    if (nums.length === 0) return '-';
    const sum = nums.reduce((acc, v) => acc + v, 0);
    return (Math.round((aggType === 'avg' ? (sum / nums.length) : sum) * 100) / 100).toLocaleString('ko-KR');
  });
}

function recalculateTableSummaryRows(d) {
  if (!d || d.type !== 'table' || !Array.isArray(d.tableHeaders) || !Array.isArray(d.tableRows) || !Array.isArray(d.summaryRowIndices) || d.summaryRowIndices.length === 0) return false;
  const colCount = d.tableHeaders.length;
  const sumSet = new Set(d.summaryRowIndices);
  const dataRowsOnly = d.tableRows.filter((_, idx) => !sumSet.has(idx));
  let updated = false;
  d.summaryRowIndices.forEach(sIdx => {
    if (!d.tableRows[sIdx]) return;
    const label = String(d.tableRows[sIdx][0] || '');
    const isAvg = /평균|AVG/i.test(label);
    d.tableRows[sIdx] = computeSummaryRowCells(dataRowsOnly, colCount, isAvg ? 'avg' : 'sum', label);
    updated = true;
  });
  return updated;
}

function appendTableSummaryRow(aggType) {
  const w = getSelectedChartWidget(); if (!w) return; const d = readChartData(w); if (d.type !== 'table' || !Array.isArray(d.tableHeaders)) return;
  const colCount = d.tableHeaders.length, existingSet = new Set(Array.isArray(d.summaryRowIndices) ? d.summaryRowIndices : []), dataRowsOnly = d.tableRows.filter((_, idx) => !existingSet.has(idx));
  const summaryRow = computeSummaryRowCells(dataRowsOnly, colCount, aggType);
  const newIdx = d.tableRows.length; d.tableRows.push(summaryRow); if (!Array.isArray(d.summaryRowIndices)) d.summaryRowIndices = []; d.summaryRowIndices.push(newIdx);
  writeChartDataAndRender(w, d); recordChartChangeHistory(aggType === 'avg' ? '표 평균 행 추가' : '표 합계 행 추가');
}
function addChartDataCol() { if (isChartMutationLocked(getSelectedChartWidget(), true)) return; const w = getSelectedChartWidget(); if (!w) return; const d = readChartData(w); if (d.type !== 'table') return; if (!Array.isArray(d.tableHeaders)) d.tableHeaders = ['구분 항목', '항목 1']; const nextColNum = d.tableHeaders.length + 1; d.tableHeaders.push(`새 열 ${nextColNum}`); if (!Array.isArray(d.tableRows)) d.tableRows = []; d.tableRows.forEach(row => { while (row.length < d.tableHeaders.length) row.push('내용 입력'); }); if (Array.isArray(d.colWidths) && d.colWidths.length > 0) d.colWidths.push(130); writeChartDataAndRender(w, d); recordChartChangeHistory('표 열 추가'); }
function removeChartDataCol() { if (isChartMutationLocked(getSelectedChartWidget(), true)) return; removeSelectedTableCol(); }
function addChartDataRow() { if (isChartMutationLocked(getSelectedChartWidget(), true)) return;
  const w = getSelectedChartWidget(); if (!w) return; const d = readChartData(w);
  if (d.type === 'table') { const colCount = d.tableHeaders ? d.tableHeaders.length : 3; d.tableRows.push(Array.from({ length: colCount }, (_, i) => i === 0 ? `새 비교 항목 ${d.tableRows.length + 1}` : '내용 입력')); const nextIdx = d.items.length; d.items.push({ label: `행 ${d.tableRows.length}`, value: 70, sub: 'ROW', color: DEFAULT_CHART_PALETTE[nextIdx % DEFAULT_CHART_PALETTE.length] }); }
  else { const nextIdx = d.items.length; const addedItem = { label: `항목 ${nextIdx + 1}`, value: 75, sub: 'NEW DATA', color: DEFAULT_CHART_PALETTE[nextIdx % DEFAULT_CHART_PALETTE.length] }; d.items.push(addedItem); syncActiveScenarioFromChartData(d, 'add', addedItem); }
  writeChartDataAndRender(w, d); recordChartChangeHistory('차트/표 행 추가');
}
function removeChartDataRow(idx) { if (isChartMutationLocked(getSelectedChartWidget(), true)) return;
  const w = getSelectedChartWidget(); if (!w) return; const d = readChartData(w);
  if (d.type === 'table') {
    if (d.tableRows.length <= 1) return;
    const rIdx = (typeof idx === 'number' && idx >= 0 && idx < d.tableRows.length) ? idx : (d.tableRows.length - 1);
    d.tableRows.splice(rIdx, 1);
    if (Array.isArray(d.items) && d.items.length > 1) d.items.splice(Math.min(rIdx, d.items.length - 1), 1);
    shiftTableCellStylesOnRow(d, rIdx, -1);
    d.summaryRowIndices = (d.summaryRowIndices || []).filter(i => i !== rIdx).map(i => i > rIdx ? i - 1 : i);
    resetTableMerges(d);
    recalculateTableSummaryRows(d);
  } else {
    if (d.items.length <= 1) return;
    d.items.splice(idx, 1);
    syncActiveScenarioFromChartData(d, 'remove', idx);
  }
  writeChartDataAndRender(w, d); recordChartChangeHistory('차트/표 항목 삭제');
}
function syncChartInspectorUI(el) {
  const widget = el ? (el.classList.contains('ppt-chart-widget') ? el : el.querySelector('.ppt-chart-widget')) : getSelectedChartWidget();
  const listWrap = $studio('chartItemsEditorList'), syncChk = $studio('chartSyncAccentCheckbox');
  if (!widget) { if (listWrap) listWrap.innerHTML = `<div class="text-[10px] text-muted text-center py-1">그래프/표를 선택하면 항목과 색상을 편집할 수 있습니다.</div>`; return; }
  const data = readChartData(widget);
  if (syncChk) syncChk.checked = Boolean(data.syncAccent);
  if ($studio('chartPrefixInput')) $studio('chartPrefixInput').value = data.valuePrefix || '';
  if ($studio('chartSuffixInput')) $studio('chartSuffixInput').value = data.valueSuffix || '';
  if ($studio('chartLegendPosSelect')) $studio('chartLegendPosSelect').value = data.legendPosition || 'none';
  if ($studio('tblHeaderToggleBtn')) $studio('tblHeaderToggleBtn').classList.toggle('is-active', data.showHeaderRow !== false);
  if ($studio('tblFirstColToggleBtn')) $studio('tblFirstColToggleBtn').classList.toggle('is-active', Boolean(data.highlightFirstCol));
  if ($studio('tblZebraToggleBtn')) $studio('tblZebraToggleBtn').classList.toggle('is-active', data.zebraStriping !== false);
  const itemsHtml = data.items.map((it, idx) => `<div class="flex items-center gap-1 bg-white border border-borderline rounded px-1.5 py-1 text-[10px]"><input type="color" value="${it.color || DEFAULT_CHART_PALETTE[idx % DEFAULT_CHART_PALETTE.length]}" data-on-input="updateChartItemField(${idx}, 'color', this.value, true)" data-on-change="updateChartItemField(${idx}, 'color', this.value, false)" class="w-4 h-4 border-0 bg-transparent cursor-pointer shrink-0"><input type="text" value="${escapeAttr(it.label)}" data-on-change="updateChartItemField(${idx}, 'label', this.value)" class="flex-1 min-w-0 px-1 py-0.5 bg-canvas rounded font-bold"><input type="number" value="${it.value}" data-on-change="updateChartItemField(${idx}, 'value', this.value)" class="w-12 px-1 py-0.5 bg-canvas rounded font-mono text-right font-bold"><button type="button" data-on-click="removeChartDataRow(${idx})" class="px-1 text-rose-600 font-bold cursor-pointer">✕</button></div>`).join('');
  if (listWrap) listWrap.innerHTML = itemsHtml;
}
function onChartTitleInlineEdit(el) { const w = el.closest('.ppt-chart-widget'); if (!w) return; const d = readChartData(w); d.title = el.textContent.trim(); w.setAttribute('data-chart-json', JSON.stringify(d)); recordChartChangeHistory('차트/표 제목 수정'); }
function onChartSubInlineEdit(el, idx) { const w = el.closest('.ppt-chart-widget'); if (!w) return; const d = readChartData(w); if (d.items[idx]) d.items[idx].sub = el.textContent.trim(); syncActiveScenarioFromChartData(d); w.setAttribute('data-chart-json', JSON.stringify(d)); recordChartChangeHistory('KPI 부제목 수정'); }
function onChartLabelInlineEdit(el, idx) { const w = el.closest('.ppt-chart-widget'); if (!w) return; const d = readChartData(w); if (d.items[idx]) d.items[idx].label = el.textContent.trim(); syncActiveScenarioFromChartData(d); w.setAttribute('data-chart-json', JSON.stringify(d)); syncChartInspectorUI(w); recordChartChangeHistory('차트 항목명 수정'); }
function onChartValueInlineEdit(el, idx) { const w = el.closest('.ppt-chart-widget'); if (!w) return; const d = readChartData(w), n = parseFloat(el.textContent.replace(/[^0-9.-]/g, '')); if (d.items[idx] && !isNaN(n)) d.items[idx].value = Math.max(-100000000, Math.min(100000000, n)); syncActiveScenarioFromChartData(d); writeChartDataAndRender(w, d); recordChartChangeHistory('차트 수치 수정'); }
function onTableHeaderInlineEdit(el, colIdx) { const w = el.closest('.ppt-chart-widget'); if (!w) return; const d = readChartData(w); if (d.tableHeaders && d.tableHeaders[colIdx] !== undefined) { d.tableHeaders[colIdx] = extractEditableCellText(el); w.setAttribute('data-chart-json', JSON.stringify(d)); recordChartChangeHistory('표 헤더 수정'); } }
function onTableCellInlineEdit(el, rIdx, cIdx) {
  const w = el.closest('.ppt-chart-widget'); if (!w) return;
  const d = readChartData(w);
  if (d.tableRows && d.tableRows[rIdx] && d.tableRows[rIdx][cIdx] !== undefined) {
    d.tableRows[rIdx][cIdx] = extractEditableCellText(el);
    const isSummaryRow = Array.isArray(d.summaryRowIndices) && d.summaryRowIndices.includes(rIdx);
    if (!isSummaryRow && recalculateTableSummaryRows(d)) {
      d.summaryRowIndices.forEach(sIdx => {
        const sRow = d.tableRows[sIdx];
        if (!sRow) return;
        sRow.forEach((val, col) => {
          const tdEl = w.querySelector(`td[data-cell-key="td-${sIdx}-${col}"]`);
          if (tdEl && tdEl !== el) {
            const resizers = Array.from(tdEl.querySelectorAll('.table-col-resizer, .table-row-resizer'));
            tdEl.textContent = val;
            resizers.forEach(rz => tdEl.appendChild(rz));
          }
        });
      });
    }
    w.setAttribute('data-chart-json', JSON.stringify(d));
    recordChartChangeHistory('표 셀 내용 수정');
  }
}

/* ==================== v4.8.0: LIVE CHART SCENARIOS & KPI COUNT-UP ANIMATION ==================== */
function toggleChartScenariosOnSelected() { if (isChartMutationLocked(getSelectedChartWidget(), true)) return;
  const w = getSelectedChartWidget();
  if (!w) { showToast('먼저 시나리오 토글을 추가할 차트나 KPI를 선택해 주세요.'); return; }
  const d = readChartData(w);
  if (d.type === 'table') { showToast('시나리오 토글은 막대·꺾은선·도넛·KPI 차트에서 지원됩니다.'); return; }
  d.scenariosEnabled = !d.scenariosEnabled;
  if (d.scenariosEnabled && (!Array.isArray(d.scenarios) || d.scenarios.length < 2)) {
    const baseItems = (d.items || []).map(it => Object.assign({}, it));
    d.scenarios = [
      { name: '기본', items: baseItems.map(it => Object.assign({}, it)) },
      { name: '낙관적', items: baseItems.map(it => Object.assign({}, it, { value: Math.round((Number(it.value) || 0) * 1.25) })) },
      { name: '보수적', items: baseItems.map(it => Object.assign({}, it, { value: Math.max(1, Math.round((Number(it.value) || 0) * 0.78)) })) }
    ];
    d.activeScenarioIdx = 0;
  }
  writeChartDataAndRender(w, d);
  recordChartChangeHistory(d.scenariosEnabled ? '차트 시나리오 토글 ON' : '차트 시나리오 토글 OFF');
  showToast(d.scenariosEnabled ? '차트 상단에 [기본 | 낙관적 | 보수적] 라이브 시나리오 토글이 추가되었습니다!' : '차트 시나리오 토글이 해제되었습니다.');
}

function switchChartScenario(btn, targetIdx) {
  const w = btn ? btn.closest('.ppt-chart-widget') : null;
  if (!w) return;
  const d = readChartData(w);
  if (!Array.isArray(d.scenarios) || !d.scenarios[targetIdx]) return;
  const prevIdx = Number(d.activeScenarioIdx) || 0;
  // Save any edits made to the current scenario before switching
  if (d.scenarios[prevIdx]) {
    d.scenarios[prevIdx].items = (d.items || []).map(it => Object.assign({}, it));
  }
  d.activeScenarioIdx = targetIdx;
  d.items = d.scenarios[targetIdx].items.map(it => Object.assign({}, it));
  writeChartDataAndRender(w, d);
  if (typeof animateSlideKpisAndCharts === 'function') {
    animateSlideKpisAndCharts(w.closest('.slide') || w);
  }
  if (isEditMode && !isInteractiveTestMode) {
    recordChartChangeHistory(`차트 시나리오 전환 (${d.scenarios[targetIdx].name})`);
  }
}

function animateSlideKpisAndCharts(containerEl) {
  if (!containerEl) return;
  if (isEditMode && (typeof isInteractiveTestMode === 'undefined' || !isInteractiveTestMode)) return;

  // 1. KPI Count-Up (both .ppt-chart-widget KPI values & standalone numeric .text-5xl metric cards)
  const kpiNodes = Array.from(containerEl.querySelectorAll('[data-kpi-val]'));
  const standaloneMetrics = Array.from(containerEl.querySelectorAll('.slide-card .text-5xl')).filter(el => !el.hasAttribute('data-kpi-val'));
  const runCountUp = (el, targetNum, prefix, suffix, decimals) => {
    const startTs = performance.now();
    const duration = 640;
    const step = (now) => {
      const t = Math.min(1, (now - startTs) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = targetNum * eased;
      const formatted = decimals > 0 ? cur.toFixed(decimals) : Math.round(cur).toLocaleString('ko-KR');
      el.textContent = `${prefix}${formatted}${suffix}`;
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = `${prefix}${decimals > 0 ? targetNum.toFixed(decimals) : targetNum.toLocaleString('ko-KR')}${suffix}`;
    };
    requestAnimationFrame(step);
  };

  kpiNodes.forEach(el => {
    const raw = parseFloat(el.getAttribute('data-kpi-val') || '');
    if (isNaN(raw)) return;
    const pre = el.getAttribute('data-kpi-prefix') || '';
    const suf = el.getAttribute('data-kpi-suffix') || '';
    const dec = String(raw).includes('.') ? String(raw).split('.')[1].length : 0;
    runCountUp(el, raw, pre, suf, dec);
  });

  standaloneMetrics.forEach(el => {
    const txt = (el.textContent || '').trim();
    const m = txt.match(/^([+\-₩$€£]?)(\d[\d,]*(?:\.\d+)?)(%|배|초|명|건|점|억|만|K|M|\+)?$/);
    if (!m) return;
    const num = parseFloat(m[2].replace(/,/g, ''));
    if (isNaN(num) || num === 0) return;
    const dec = m[2].includes('.') ? m[2].split('.')[1].length : 0;
    runCountUp(el, num, m[1] || '', m[3] || '', dec);
  });

  // 2. Smooth Bar Growth Animation
  containerEl.querySelectorAll('[data-bar-target-h]').forEach(bar => {
    const targetH = bar.getAttribute('data-bar-target-h');
    bar.style.transition = 'none';
    bar.style.height = '4%';
    void bar.offsetHeight;
    bar.style.transition = 'height 0.55s cubic-bezier(0.22, 1, 0.36, 1), filter 0.15s ease, transform 0.15s ease';
    bar.style.height = targetH;
  });
  containerEl.querySelectorAll('[data-bar-target-w]').forEach(bar => {
    const targetW = bar.getAttribute('data-bar-target-w');
    bar.style.transition = 'none';
    bar.style.width = '4%';
    void bar.offsetWidth;
    bar.style.transition = 'width 0.55s cubic-bezier(0.22, 1, 0.36, 1), filter 0.15s ease';
    bar.style.width = targetW;
  });
}
