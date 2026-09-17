// multi-xlsx_merge — 主程式（DOM 與流程）
// 純函式在 lib.js（可在 Node 測），這裡只負責畫面、檔案讀取與彙總流程。

const Lib = typeof XlsxMergeLib !== 'undefined' ? XlsxMergeLib : require('./lib.js');

// --- 基金資料庫 (可被匯入覆蓋) ---
let fundDetailsMap = {
    '行政院國家發展基金': { '業別': '投融資、開發及住宅業務', '主管別': '行政院' },
    '營建建設基金': { '業別': '投融資、開發及住宅業務', '主管別': '內政部' },
    '實施平均地權基金': { '業別': '投融資、開發及住宅業務', '主管別': '內政部' },
    '國軍生產及服務作業基金': { '業別': '醫療服務', '主管別': '國防部' },
    '國軍老舊眷村改建基金': { '業別': '產銷業務', '主管別': '國防部' },
    '國防醫學大學軍事教育基金': { '業別': '教育文化服務', '主管別': '國防部' },
    '國立大學校院校務基金': { '業別': '教育文化服務', '主管別': '教育部' },
    '國立臺灣大學附設醫院作業基金': { '業別': '醫療服務', '主管別': '教育部' },
    '國立成功大學附設醫院作業基金': { '業別': '醫療服務', '主管別': '教育部' },
    '國立陽明交通大學附設醫院作業基金': { '業別': '醫療服務', '主管別': '教育部' },
    '教育部所屬機構作業基金': { '業別': '教育文化服務', '主管別': '教育部' },
    '國立高級中等學校校務基金': { '業別': '教育文化服務', '主管別': '教育部' },
    '法務部矯正機關作業基金': { '業別': '產銷業務', '主管別': '法務部' },
    '經濟作業基金': { '業別': '公共建設及設施', '主管別': '經濟部' },
    '水資源作業基金': { '業別': '產銷業務', '主管別': '經濟部' },
    '交通作業基金': { '業別': '公共建設及設施', '主管別': '交通部' },
    '國軍退除役官兵安置基金': { '業別': '產銷業務', '主管別': '退輔會' },
    '榮民醫療作業基金': { '業別': '醫療服務', '主管別': '退輔會' },
    '科學園區管理局作業基金': { '業別': '公共建設及設施', '主管別': '國科會' },
    '農業作業基金': { '業別': '產銷業務', '主管別': '農業部' },
    '農田水利事業作業基金': { '業別': '公共建設及設施', '主管別': '農業部' },
    '勞工保險局作業基金': { '業別': '社會保險', '主管別': '勞動部' },
    '醫療藥品基金': { '業別': '醫療服務', '主管別': '衛生福利部' },
    '管制藥品製藥工廠作業基金': { '業別': '產銷業務', '主管別': '衛生福利部' },
    '全民健康保險基金': { '業別': '社會保險', '主管別': '衛生福利部' },
    '國民年金保險基金': { '業別': '社會保險', '主管別': '衛生福利部' },
    '國立文化機構作業基金': { '業別': '教育文化服務', '主管別': '文化部' },
    '故宮文物藝術發展基金': { '業別': '產銷業務', '主管別': '國立故宮博物院' },
    '原住民族綜合發展基金': { '業別': '其他', '主管別': '原民會' },
    '考選業務基金': { '業別': '其他', '主管別': '考試院考選部' }
};

// 版型設定 (為了支援 JSON 匯出，將 mappingLogic 改為資料屬性 `excludeKeywords`)
let TEMPLATE_CONFIG = {
    'op_income': {
        name: '作業基金 - 收支餘絀表',
        range: 'A4:I38', headerRows: 2, keyName: '科目', sortType: 'op_income',
        sourceMode: 'cell', sourceCell: 'A1', excludeKeywords: ['%', '增減']
    },
    'special_cash': {
        name: '特別收入基金 - 現金流量表',
        range: 'A4:E48', headerRows: 2, keyName: '項目', sortType: 'special_cash',
        sourceMode: 'cell', sourceCell: 'A1', excludeKeywords: ['小計']
    },
    'op_cash': {
        name: '作業基金 - 現金流量表',
        range: 'A4:E49', headerRows: 2, keyName: '科目', sortType: 'op_cash',
        sourceMode: 'cell', sourceCell: 'A1', excludeKeywords: ['小計']
    },
    'op_surplus': {
        name: '作業基金 - 餘絀撥補表',
        range: 'A4:G29', headerRows: 2, keyName: '科目', sortType: 'op_surplus',
        sourceMode: 'cell', sourceCell: 'A1', excludeKeywords: ['%', '增減']
    }
};

let ORDER_LISTS = {
    'op_income': ["業務收入","勞務收入","銷貨收入","教學收入","租金及權利金收入","投融資業務收入","醫療收入","徵收及依法分配收入","保險收入","規費收入","其他業務收入","業務成本與費用","勞務成本","銷貨成本","教學成本","出租資產成本","投融資業務成本","醫療成本","保險成本","其他業務成本","業務費用","管理及總務費用","研究發展及訓練費用","其他業務費用","業務賸餘(短絀)","業務外收入","財務收入","其他業務外收入","業務外費用","財務費用","其他業務外費用","業務外賸餘(短絀)","本期賸餘(短絀)"],
    'special_cash': ["本期賸餘","折舊","攤銷","出售資產利益","應收帳款","存貨","預付款項","應付帳款","預收款項","應計退休金負債","其他","業務活動之淨現金流入","減少（增加）短期投資","出售長期投資","出售資產","存出保證金","投資活動之淨現金流入","增加（減少）短期債務","長期債務舉借","長期債務償還","基金（資本）之撥入","基金（資本）之撥出","融資活動之淨現金流入","現金及約當現金之淨增（減）數","期初現金及約當現金餘額","期末現金及約當現金餘額"],
    'op_surplus': ["賸餘之部","本期賸餘","前期未分配賸餘","追溯適用及追溯重編之影響數","公積轉列數","其他轉入數","分配之部","填補累積短絀","提存公積","賸餘撥充基金數","解繳公庫淨額","其他依法分配數","未分配賸餘","短絀之部","本期短絀","前期待填補之短絀","追溯適用及追溯重編之影響數","其他轉入數","填補之部","撥用賸餘","撥用公積","折減基金","公庫撥款","待填補之短絀"]
};

// --- 應用程式狀態 ---
const state = {
    workbooks: [],            // [{ id, file, workbook, sheet, error }]
    columnMappings: [],
    allFileData: [],
    summaryData: new Map(),
    orderedItemKeys: [],
    isTransposed: false,
    originalData: null,
    transposeKeyIndex: null,
    exportKeyName: null,
    exportValueColumns: [],
    currentTemplate: 'custom',
    busy: false,
};

const els = {
    dropArea: document.getElementById('drop-area'),
    fileInput: document.getElementById('file-input'),
    fileListContainer: document.getElementById('file-list-container'),
    previewArea: document.getElementById('preview-area'),
    mappingFields: document.getElementById('mapping-fields'),
    processBtn: document.getElementById('process-btn'),
    outputArea: document.getElementById('output-area'),
    itemDropdown: document.getElementById('item-dropdown'),
    autoDetectBtn: document.getElementById('auto-detect-btn'),
    dataRangeInput: document.getElementById('data-range-input'),
    headerRowsInput: document.getElementById('header-rows-input'),
    loadHeadersBtn: document.getElementById('load-headers-btn'),
    fileDropdown: document.getElementById('file-dropdown'),
    fileDetailTable: document.getElementById('file-detail-table'),
    detectResult: document.getElementById('detect-result'),
    transposeBtn: document.getElementById('transpose-btn'),
    transposeKeySelect: document.getElementById('transpose-key-select'),
    transposeControls: document.getElementById('transpose-controls'),
    templateSelect: document.getElementById('template-select'),
    sourceNameMode: document.getElementById('source-name-mode'),
    sourceNameCell: document.getElementById('source-name-cell'),
    sourceCellGroup: document.getElementById('source-cell-group'),
    mappingAlert: document.getElementById('mapping-alert'),
    clearBtn: document.getElementById('clear-btn'),
    exportTemplateBtn: document.getElementById('export-template-btn'),
    importTemplateBtn: document.getElementById('import-template-btn'),
    templateFileInput: document.getElementById('template-file-input'),
    status: document.getElementById('status-area'),
};

const esc = Lib.escapeHtml;
const yieldToUI = () => new Promise((resolve) => setTimeout(resolve, 0));

/** 狀態列（取代大部分 alert：不中斷操作、可被螢幕報讀器念出來）。 */
function setStatus(message, type) {
    if (!els.status) return;
    const cls = ['success', 'warning', 'error'].includes(type) ? type : 'info';
    els.status.innerHTML = message ? `<div class="alert alert-${cls}">${message}</div>` : '';
}
const clearStatus = () => setStatus('');

function init() {
    populateTemplateDropdown();
    setupEventListeners();
    updateStep(1);
}

function populateTemplateDropdown() {
    const select = els.templateSelect;
    while (select.options.length > 1) select.remove(1);
    for (const [key, config] of Object.entries(TEMPLATE_CONFIG)) {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = `${config.name || key} (${config.range || '自訂'})`;
        select.appendChild(opt);
    }
}

function setupEventListeners() {
    els.dropArea.addEventListener('click', () => els.fileInput.click());
    els.dropArea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); els.fileInput.click(); }
    });
    ['dragenter', 'dragover'].forEach(e => els.dropArea.addEventListener(e, evt => { evt.preventDefault(); els.dropArea.classList.add('drag-over'); }));
    ['dragleave', 'drop'].forEach(e => els.dropArea.addEventListener(e, evt => { evt.preventDefault(); els.dropArea.classList.remove('drag-over'); }));
    els.dropArea.addEventListener('drop', e => { if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); });
    els.fileInput.addEventListener('change', e => { if (e.target.files.length) handleFiles(e.target.files); });

    // 單檔移除（事件委派，清單重繪後仍有效）
    els.fileListContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-remove-file]');
        if (!btn) return;
        const id = Number(btn.dataset.removeFile);
        state.workbooks = state.workbooks.filter(w => w.id !== id);
        renderFileList();
        if (state.workbooks.length === 0) resetUI();
    });

    els.clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('確定要清除所有已上傳的檔案嗎？')) {
            state.workbooks = [];
            els.fileInput.value = '';
            resetUI();
        }
    });

    els.templateSelect.addEventListener('change', handleTemplateChange);
    els.autoDetectBtn.addEventListener('click', autoDetectBestRange);
    els.loadHeadersBtn.addEventListener('click', loadHeadersAndMapping);
    els.processBtn.addEventListener('click', processData);
    els.itemDropdown.addEventListener('change', renderItemDetailView);
    els.fileDropdown.addEventListener('change', renderFileDetailView);
    [els.dataRangeInput, els.headerRowsInput].forEach(i => i.addEventListener('input', resetMappings));
    els.transposeBtn.addEventListener('click', transposeData);
    els.transposeKeySelect.addEventListener('change', applyTranspose);
    els.sourceNameMode.addEventListener('change', (e) => els.sourceCellGroup.style.display = e.target.value === 'cell' ? 'block' : 'none');

    els.exportTemplateBtn.addEventListener('click', exportTemplates);
    els.importTemplateBtn.addEventListener('click', () => els.templateFileInput.click());
    els.templateFileInput.addEventListener('change', importTemplates);

    document.getElementById('export-json-btn').addEventListener('click', () => exportReport('json'));
    document.getElementById('export-csv-btn').addEventListener('click', () => exportReport('csv'));
    document.getElementById('export-html-btn').addEventListener('click', () => exportReport('html'));
    document.getElementById('export-xlsx-btn').addEventListener('click', () => exportReport('xlsx'));

    document.querySelector('.view-tabs').addEventListener('click', e => {
        if (e.target.classList.contains('tab-btn')) {
            const target = e.target.dataset.view;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.view === target));
            document.querySelectorAll('.view-pane').forEach(p => p.classList.toggle('active', p.id === target));
        }
    });
}

// --- 版面匯入匯出邏輯 ---
function exportTemplates() {
    const data = {
        version: "1.0",
        templateConfig: TEMPLATE_CONFIG,
        orderLists: ORDER_LISTS,
        fundDetails: fundDetailsMap
    };
    triggerDownload(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), '基金彙總版型設定.json');
}

function importTemplates(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const data = JSON.parse(evt.target.result);
            if (data.templateConfig) TEMPLATE_CONFIG = { ...TEMPLATE_CONFIG, ...data.templateConfig };
            if (data.orderLists) ORDER_LISTS = { ...ORDER_LISTS, ...data.orderLists };
            if (data.fundDetails) fundDetailsMap = { ...fundDetailsMap, ...data.fundDetails };

            populateTemplateDropdown();
            setStatus('設定匯入成功，已更新版型、排序清單與基金資料庫。', 'success');
            els.templateFileInput.value = '';
        } catch (err) {
            setStatus(`匯入失敗：格式錯誤（${esc(err.message)}）`, 'error');
        }
    };
    reader.readAsText(file);
}

// --- 核心流程 ---
function updateStep(stepNum, status = 'active') {
    document.querySelectorAll('.step').forEach((step, i) => {
        step.classList.remove('active', 'completed');
        if (i + 1 < stepNum) step.classList.add('completed');
        if (i + 1 === stepNum) step.classList.add(status);
        step.setAttribute('aria-current', i + 1 === stepNum ? 'step' : 'false');
    });
}

function resetUI() {
    resetMappings();
    els.dataRangeInput.value = '';
    els.headerRowsInput.value = '1';
    els.detectResult.innerHTML = '';
    els.fileListContainer.innerHTML = '';
    document.getElementById('section-preview').style.display = 'none';
    document.getElementById('section-range').style.display = 'none';
    document.getElementById('section-mapping').style.display = 'none';
    els.clearBtn.style.display = 'none';
    clearStatus();
    updateStep(1);
}

function resetMappings() {
    document.getElementById('section-mapping').style.display = 'none';
    state.columnMappings = [];
    state.isTransposed = false;
    state.originalData = null;
    state.transposeKeyIndex = null;
    els.transposeControls.style.display = 'none';
    els.transposeBtn.textContent = '🔄 欄列轉置';
    els.processBtn.disabled = true;
    els.outputArea.style.display = 'none';
}

/** 讀取單一檔案；解析失敗時回傳 error 而不是讓整批失敗。 */
function readFile(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workbook = XLSX.read(e.target.result, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const sheet = sheetName ? workbook.Sheets[sheetName] : null;
                // 檔名是 .xlsx 但內容不是（或只有一個空白儲存格）時，SheetJS 不一定會丟錯，
                // 這裡主動判定為解析失敗，避免它安靜地貢獻 0 筆資料。
                if (!sheet || !sheet['!ref']) {
                    resolve({ file, workbook: null, sheet: null, error: '找不到可讀取的工作表（檔案格式可能不符）' });
                    return;
                }
                const span = XLSX.utils.decode_range(sheet['!ref']);
                if (span.s.r === span.e.r && span.s.c === span.e.c) {
                    resolve({ file, workbook: null, sheet: null, error: '看起來不是報表（工作表只有一個儲存格）' });
                    return;
                }
                resolve({ file, workbook, sheet, error: null });
            } catch (err) {
                resolve({ file, workbook: null, sheet: null, error: err.message || '解析失敗' });
            }
        };
        reader.onerror = () => resolve({ file, workbook: null, sheet: null, error: '讀取失敗' });
        reader.readAsArrayBuffer(file);
    });
}

/** 逐檔讀取並回報進度：舊版用 Promise.all 一次全上，單檔壞掉就整批失敗。 */
async function readFilesSequentially(files, onProgress, startIndex) {
    const out = [];
    for (let i = 0; i < files.length; i++) {
        const parsed = await readFile(files[i]);
        out.push(parsed);
        if (onProgress) onProgress(i + 1, files.length, startIndex + i + 1);
        if (i % 5 === 4) await yieldToUI();   // 讓畫面有機會更新
    }
    return out;
}

async function handleFiles(fileList) {
    if (state.busy) return;
    const incoming = Array.from(fileList).filter(f => /\.(xlsx|xls|xlsm|csv)$/i.test(f.name) || f.type.includes('sheet') || f.type.includes('excel'));
    const rejected = Array.from(fileList).filter(f => !incoming.includes(f));
    if (incoming.length === 0) {
        setStatus('沒有可用的 Excel 檔案（支援 .xlsx / .xls）。', 'warning');
        els.fileInput.value = '';
        return;
    }

    state.busy = true;
    els.previewArea.innerHTML = '<div class="empty-state">正在讀取檔案…</div>';
    const baseIndex = state.workbooks.length;
    setStatus(`正在讀取 ${incoming.length} 個檔案…`);
    try {
        const parsed = await readFilesSequentially(incoming, (done, total, overall) =>
            setStatus(`正在讀取檔案… ${done}/${total}（累計 ${overall} 個）`), baseIndex);

        // 追加而非覆蓋：合併工具通常會分批拖進來；同名且同大小視為重複。
        const existing = new Set(state.workbooks.map(w => `${w.file.name}|${w.file.size}`));
        let nextId = state.workbooks.reduce((m, w) => Math.max(m, w.id), 0) + 1;
        const added = [];
        const skipped = [];
        for (const p of parsed) {
            if (p.error) { added.push({ ...p, id: nextId++ }); continue; }
            const key = `${p.file.name}|${p.file.size}`;
            if (existing.has(key)) { skipped.push(p.file.name); continue; }
            existing.add(key);
            added.push({ ...p, id: nextId++ });
        }
        state.workbooks = state.workbooks.concat(added);
        renderFileList();
        els.fileInput.value = '';    // 允許重新選擇同一個檔案

        if (state.workbooks.filter(w => w.workbook).length === 0) {
            els.previewArea.innerHTML = '<div class="empty-state" style="color:#dc3545;">所有檔案都無法解析，請確認是否為有效的 Excel 檔。</div>';
            setStatus('所有檔案都無法解析。', 'error');
            return;
        }

        const first = state.workbooks.find(w => w.workbook);
        generatePreview(first.sheet);
        document.getElementById('section-preview').style.display = 'block';
        els.clearBtn.style.display = 'inline-flex';
        updateStep(2);

        const failed = state.workbooks.filter(w => w.error);
        if (failed.length) {
            setStatus(`${failed.length} 個檔案解析失敗（已略過）：${esc(failed.map(f => f.file.name).join('、'))}`, 'warning');
        } else if (skipped.length) {
            setStatus(`已載入 ${added.length} 個檔案，${skipped.length} 個重複檔案已略過。`, 'info');
        } else {
            setStatus(`已載入 ${added.length} 個檔案。`, 'success');
        }
        if (els.templateSelect.value !== 'custom') handleTemplateChange();
    } catch (err) {
        els.previewArea.innerHTML = `<div class="empty-state" style="color:#dc3545;">檔案解析失敗：${esc(err.message)}</div>`;
        setStatus(`檔案解析失敗：${esc(err.message)}`, 'error');
    } finally {
        state.busy = false;
    }
}

function formatBytes(n) {
    if (!Number.isFinite(n)) return '';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function renderFileList() {
    if (state.workbooks.length === 0) { els.fileListContainer.innerHTML = ''; return; }
    const okCount = state.workbooks.filter(w => !w.error).length;
    const items = state.workbooks.map(w => {
        // workbook 在彙總後會被釋放（降低記憶體尖峰），這不是錯誤，需要時會自動重新讀取。
        const badge = w.error
            ? `<span class="file-badge error">讀取失敗</span>`
            : w.workbook
                ? `<span class="file-badge">${esc((w.sheet && w.sheet['!ref']) || '空工作表')}</span>`
                : `<span class="file-badge">已處理</span>`;
        return `<div class="file-item${w.error ? ' is-error' : ''}">
            <span class="file-name">${esc(w.file.name)}</span>
            <span class="file-meta">${formatBytes(w.file.size)}</span>
            ${badge}
            <button type="button" class="file-remove" data-remove-file="${w.id}" aria-label="移除 ${esc(w.file.name)}">✕</button>
        </div>`;
    }).join('');
    els.fileListContainer.innerHTML = `
        <details class="file-list-details" open>
            <summary class="file-list-summary">✓ 已載入 ${okCount} / ${state.workbooks.length} 個檔案（可個別移除）</summary>
            <div class="file-list">${items}</div>
        </details>`;
}

function generatePreview(sheet) {
    if (!sheet || !sheet['!ref']) { els.previewArea.innerHTML = '<div class="empty-state">工作表為空</div>'; return; }
    const range = XLSX.utils.decode_range(sheet['!ref']);
    range.e.r = Math.min(range.e.r, range.s.r + 50);
    range.e.c = Math.min(range.e.c, range.s.c + 30);
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, range: range, defval: '' });
    let html = '<div class="table-wrapper"><table><thead><tr><th></th>';
    for (let C = range.s.c; C <= range.e.c; ++C) html += `<th>${XLSX.utils.encode_col(C)}</th>`;
    html += '</tr></thead><tbody>';
    data.forEach((row, i) => {
        html += `<tr><th>${range.s.r + i + 1}</th>`;
        (row || []).forEach(cell => html += `<td>${esc(cell ?? '')}</td>`);
        html += '</tr>';
    });
    els.previewArea.innerHTML = html + '</tbody></table></div>';
}

function handleTemplateChange() {
    const key = els.templateSelect.value;
    state.currentTemplate = key;
    const tmpl = TEMPLATE_CONFIG[key];

    if (key !== 'custom' && tmpl) {
        els.dataRangeInput.value = tmpl.range;
        els.headerRowsInput.value = tmpl.headerRows;
        if (tmpl.sourceMode) els.sourceNameMode.value = tmpl.sourceMode;
        if (tmpl.sourceCell) els.sourceNameCell.value = tmpl.sourceCell;
        els.sourceCellGroup.style.display = els.sourceNameMode.value === 'cell' ? 'block' : 'none';
        showDetectResult(`已套用版型範圍：${esc(tmpl.name)}`, 'success');
        els.autoDetectBtn.style.display = 'none';
        if (state.workbooks.length > 0) {
            document.getElementById('section-range').style.display = 'block';
            updateStep(2, 'completed');
            updateStep(3);
        }
    } else {
        els.autoDetectBtn.style.display = 'inline-block';
        els.detectResult.innerHTML = '';
    }
}

function autoDetectBestRange() {
    const loaded = state.workbooks.filter(w => w.workbook);
    if (loaded.length === 0) { setStatus('請先上傳檔案。', 'warning'); return; }
    resetMappings();

    const vote = Lib.voteBestRange(loaded.map(w => w.sheet), XLSX.utils);
    if (!vote) return showDetectResult('找不到有效的標頭列', 'error');

    els.dataRangeInput.value = vote.range;
    els.headerRowsInput.value = vote.headerRows;

    const oddNames = vote.outliers.map(i => loaded[i] && loaded[i].file.name).filter(Boolean);
    let message = `成功偵測到範圍：${esc(vote.range)}，標頭 ${vote.headerRows} 列`;
    if (oddNames.length > 0) {
        message += `<br><small>⚠️ ${loaded.length} 個檔案中有 ${oddNames.length} 個偵測結果不同，`
            + `已採用多數（${vote.winners.length} 個檔案）的範圍。請確認這些檔案版面是否相同：`
            + `${esc(oddNames.join('、'))}</small>`;
    }
    showDetectResult(message, oddNames.length > 0 ? 'warning' : 'success');
    document.getElementById('section-range').style.display = 'block';
    updateStep(2, 'completed');
    updateStep(3);
}

function showDetectResult(message, type) {
    const cls = ['success', 'warning', 'error'].includes(type) ? type : 'info';
    els.detectResult.innerHTML = `<div class="alert alert-${cls}">${message}</div>`;
}

function unmergeAndFill(data, sheet, range) {
    (sheet['!merges'] || []).forEach(merge => {
        if (merge.s.c > range.e.c || merge.e.c < range.s.c || merge.s.r > range.e.r || merge.e.r < range.s.r) return;
        const s = { r: Math.max(0, merge.s.r - range.s.r), c: Math.max(0, merge.s.c - range.s.c) };
        if (!data[s.r]) return;
        const val = data[s.r][s.c];
        for (let r = s.r; r <= Math.min(data.length - 1, merge.e.r - range.s.r); r++) {
            if (!data[r]) data[r] = [];
            for (let c = s.c; c <= Math.min(range.e.c - range.s.c, merge.e.c - range.s.c); c++) data[r][c] = val;
        }
    });
    return data;
}

/** 解析並驗證「資料範圍 / 標頭列數」輸入。 */
function readRangeInputs() {
    const rangeStr = els.dataRangeInput.value.trim().toUpperCase();
    const headerRows = parseInt(els.headerRowsInput.value, 10);
    if (!rangeStr) return { error: '請輸入資料範圍（例如 A5:G50）' };
    if (!Lib.parseRef(rangeStr)) return { error: `資料範圍格式不正確：${rangeStr}` };
    if (!Number.isFinite(headerRows) || headerRows < 1) return { error: '標頭佔用列數必須是 1 以上的整數' };
    const range = XLSX.utils.decode_range(rangeStr);
    if (range.e.r - range.s.r + 1 <= headerRows) return { error: '資料範圍比標頭列數還短，請確認範圍' };
    return { range, headerRows, rangeStr };
}

// 欄位讀取與防重複命名邏輯
function loadHeadersAndMapping() {
    if (state.workbooks.length === 0) return setStatus('請先上傳檔案。', 'warning');
    const inputs = readRangeInputs();
    if (inputs.error) return setStatus(inputs.error, 'error');

    // 用「版面符合多數」的那個檔案讀標頭：舊版固定用第一個檔案，
    // 若第一個檔案的版面不同，欄位就會抓錯。
    const loaded = state.workbooks.filter(w => w.workbook);
    const vote = Lib.voteBestRange(loaded.map(w => w.sheet), XLSX.utils);
    const source = (vote && loaded[vote.winners[0]]) || loaded[0];
    const sheet = source.sheet;

    try {
        const { range, headerRows } = inputs;
        const headerRange = { s: range.s, e: { c: range.e.c, r: range.s.r + headerRows - 1 } };
        let headerData = XLSX.utils.sheet_to_json(sheet, { header: 1, range: headerRange, defval: null });
        headerData = unmergeAndFill(headerData, sheet, headerRange);

        const headers = Array.from({ length: range.e.c - range.s.c + 1 }, (_, c) =>
            Array.from({ length: headerRows }, (_, r) => headerData[r]?.[c] || '')
            .map(s => String(s).replace(/\s+/g, ''))
            .filter((v, i, a) => v && a.indexOf(v) === i).join('')
        );

        const dataRange = { s: { r: range.s.r + headerRows, c: range.s.c }, e: range.e };
        let dataRows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: dataRange, defval: null });
        const filledData = unmergeAndFill(dataRows, sheet, dataRange);
        state.originalData = { headers, data: filledData, range, headerRows, sheet };

        // 這一欄裡「有值的儲存格」中，有多少比例是數字？純文字欄（例如「說明」）
        // 預設改成忽略，避免它被當成加總欄而讓報表多一欄 0。使用者仍可自行改回。
        const numericRatio = (c) => {
            let filledCount = 0, numericCount = 0;
            filledData.forEach((r) => {
                const v = r ? r[c] : null;
                if (v == null || String(v).trim() === '') return;
                filledCount++;
                if (Lib.isNumericCell(v)) numericCount++;
            });
            return filledCount === 0 ? 0 : numericCount / filledCount;
        };

        // 重複名稱偵測與重新命名 (Fix for duplicate merged headers)
        const usedNames = new Set();
        state.columnMappings = headers.map((h, i) => {
            const excelCol = XLSX.utils.encode_col(range.s.c + i);
            let baseName = h || `(空白 ${excelCol})`;
            let uniqueName = baseName;
            let counter = 2;
            while (usedNames.has(uniqueName)) {
                uniqueName = `${baseName}_${counter}`;
                counter++;
            }
            usedNames.add(uniqueName);

            const isNumericColumn = numericRatio(i) >= 0.5;
            const role = (i === 0) ? 'key' : (!h || !isNumericColumn ? 'ignore' : 'value');
            return {
                excelCol,
                autoHeader: h || `(空白 ${excelCol})`,
                customName: uniqueName,
                role,
                include: role !== 'ignore'
            };
        });

        state.isTransposed = false;
        els.transposeControls.style.display = 'none';
        els.transposeBtn.textContent = '🔄 欄列轉置';
        renderMappingTable();

        els.mappingAlert.className = 'alert alert-info';
        els.mappingAlert.innerHTML = '請確認主要分析欄位（項目／科目）及要加總的數值欄位（重複欄位已自動編號）。';
        setStatus(`欄位讀取完成（標頭來源：${esc(source.file.name)}）。`, 'success');

        document.getElementById('section-mapping').style.display = 'block';
        updateStep(3, 'completed');
    } catch (err) {
        setStatus(`讀取欄位失敗：${esc(err.message)}`, 'error');
    }
}

function renderMappingTable() {
    let html = `<div class="mapping-table-wrapper"><table class="mapping-table"><thead><tr><th>Excel 欄位</th><th>原始標頭</th><th>報表欄位名稱</th><th>角色</th><th>使用</th></tr></thead><tbody>`;
    state.columnMappings.forEach((col, i) => {
        html += `<tr>
            <td><span class="excel-col">${esc(col.excelCol)}</span></td>
            <td>${esc(col.autoHeader)}</td>
            <td><input type="text" data-idx="${i}" class="custom-name-input" value="${esc(col.customName)}"></td>
            <td><select data-idx="${i}" class="role-select">
                <option value="ignore" ${col.role === 'ignore' ? 'selected' : ''}>忽略</option>
                <option value="key" ${col.role === 'key' ? 'selected' : ''}>分析欄位</option>
                <option value="value" ${col.role === 'value' ? 'selected' : ''}>加總</option>
            </select></td>
            <td><input type="checkbox" data-idx="${i}" class="include-checkbox" ${col.include ? 'checked' : ''}></td>
        </tr>`;
    });
    els.mappingFields.innerHTML = html + '</tbody></table></div>';

    els.mappingFields.querySelectorAll('.custom-name-input').forEach(el => el.oninput = e => state.columnMappings[e.target.dataset.idx].customName = e.target.value.trim());
    els.mappingFields.querySelectorAll('.include-checkbox').forEach(el => el.onchange = e => state.columnMappings[e.target.dataset.idx].include = e.target.checked);
    els.mappingFields.querySelectorAll('.role-select').forEach(el => el.onchange = e => {
        const idx = e.target.dataset.idx, val = e.target.value;
        state.columnMappings[idx].role = val;
        state.columnMappings[idx].include = (val !== 'ignore');
        els.mappingFields.querySelector(`.include-checkbox[data-idx="${idx}"]`).checked = (val !== 'ignore');
    });
    els.processBtn.disabled = false;
}

function transposeData() {
    if (!state.originalData) return setStatus('請先讀取欄位。', 'warning');
    if (state.isTransposed) return loadHeadersAndMapping();

    const { headers } = state.originalData;
    els.transposeKeySelect.innerHTML = '<option value="">--- 請選擇分析欄位 ---</option>' +
        headers.map((h, i) => `<option value="${i}">${esc(h || `欄位 ${i + 1}`)}</option>`).join('');
    els.transposeControls.style.display = 'flex';
    els.transposeBtn.textContent = '↩️ 還原';
    setStatus('請選擇一個欄位作為轉置後的分析欄位，再按「開始彙總處理」。', 'info');
}

function applyTranspose() {
    const idx = parseInt(els.transposeKeySelect.value, 10);
    if (isNaN(idx)) return;
    const { headers, range } = state.originalData;

    const mappings = headers.map((h, i) => {
        if (i === idx) return null;
        const name = h || `欄位 ${i + 1}`;
        return {
            excelCol: XLSX.utils.encode_col(range.s.c + i),
            autoHeader: name, customName: name,
            role: 'value', include: true, isTransposeHeader: true
        };
    }).filter(Boolean);
    if (mappings.length === 0) return setStatus('至少要保留一個數值欄位才能轉置。', 'error');

    mappings[0].role = 'key';
    state.columnMappings = mappings;
    state.isTransposed = true;
    state.transposeKeyIndex = idx;
    renderMappingTable();
}

function findFundDetails(name) {
    return Lib.findFundDetails(Lib.buildFundIndex(fundDetailsMap), name);
}

/** 處理前確保已解析：處理完會釋放 workbook 以降低記憶體尖峰，需要時再讀一次。 */
async function ensureWorkbooksLoaded() {
    const needReload = state.workbooks.filter(w => !w.workbook && !w.error);
    if (needReload.length === 0) return;
    setStatus(`重新讀取 ${needReload.length} 個檔案…`);
    for (let i = 0; i < needReload.length; i++) {
        const parsed = await readFile(needReload[i].file);
        Object.assign(needReload[i], { workbook: parsed.workbook, sheet: parsed.sheet, error: parsed.error });
        if (i % 5 === 4) await yieldToUI();
    }
}

async function processData() {
    const keyCol = state.columnMappings.find(c => c.role === 'key' && c.include);
    const valCols = state.columnMappings.filter(c => c.role === 'value' && c.include);
    if (!keyCol || valCols.length === 0) return setStatus('設定錯誤：需要一個分析欄位與至少一個加總欄位。', 'error');

    const inputs = readRangeInputs();
    if (inputs.error) return setStatus(inputs.error, 'error');

    const keyName = keyCol.customName || keyCol.autoHeader;
    const useCell = els.sourceNameMode.value === 'cell';
    const cellAddr = els.sourceNameCell.value.trim().toUpperCase();
    if (useCell && !Lib.parseRef(cellAddr)) return setStatus('來源名稱儲存格格式不正確（例如 B2）。', 'error');

    if (state.busy) return;
    state.busy = true;
    els.processBtn.disabled = true;
    clearStatus();
    try {
        await ensureWorkbooksLoaded();
        const { range, headerRows } = inputs;
        const dataRange = { s: { r: range.s.r + headerRows, c: range.s.c }, e: range.e };

        state.allFileData = [];
        state.summaryData = new Map();
        state.orderedItemKeys = [];
        const keySeen = new Set();
        const excluded = [];
        const emptyResults = [];
        const targets = state.workbooks.filter(w => w.workbook);
        const fundIndex = Lib.buildFundIndex(fundDetailsMap);
        setStatus(`正在彙總 ${targets.length} 個檔案…`);

        for (let fi = 0; fi < targets.length; fi++) {
            const wb = targets[fi];
            const sheet = wb.sheet;
            if (!sheet || !sheet['!ref']) { excluded.push(wb.file.name); continue; }

            let sourceName = wb.file.name;
            if (useCell && sheet[cellAddr]?.v != null) sourceName = String(sheet[cellAddr].v).replace(/\s+/g, '');
            const fundInfo = Lib.findFundDetails(fundIndex, sourceName);

            let rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, range: dataRange, defval: null });
            rawData = unmergeAndFill(rawData, sheet, dataRange);

            let processed = [];
            if (state.isTransposed) {
                const valid = rawData.filter(r => r.some(c => c != null));
                state.columnMappings.forEach(map => {
                    const cIdx = XLSX.utils.decode_col(map.excelCol) - range.s.c;
                    const rowData = { [keyName]: map.customName, '主管別': fundInfo?.['主管別'] || '-', '業別': fundInfo?.['業別'] || '-' };
                    valid.forEach(r => {
                        const k = String(r[state.transposeKeyIndex] || '').replace(/\s+/g, '');
                        if (k) rowData[k] = Lib.toNumberOrZero(r[cIdx]);
                    });
                    processed.push(rowData);
                });
            } else {
                const kIdx = XLSX.utils.decode_col(keyCol.excelCol) - range.s.c;
                processed = rawData.map(r => {
                    if (!r || !r[kIdx]) return null;
                    const d = { [keyName]: String(r[kIdx]).trim(), '主管別': fundInfo?.['主管別'] || '-', '業別': fundInfo?.['業別'] || '-' };
                    valCols.forEach(vc => {
                        const vIdx = XLSX.utils.decode_col(vc.excelCol) - range.s.c;
                        d[vc.customName] = Lib.toNumberOrZero(r[vIdx]);
                    });
                    return d;
                }).filter(Boolean);
            }

            if (processed.length === 0) emptyResults.push(wb.file.name);
            state.allFileData.push({ fileName: wb.file.name, sourceName, fundInfo, data: processed });
            wb.workbook = null; wb.sheet = null;      // 釋放：彙總結果已在 allFileData
            if (fi % 5 === 4) {
                setStatus(`正在彙總… ${fi + 1}/${targets.length}`);
                await yieldToUI();
            }
        }

        state.allFileData.forEach(f => f.data.forEach(r => {
            const k = r[keyName];
            if (!keySeen.has(k)) { keySeen.add(k); state.orderedItemKeys.push(k); }

            const cols = state.isTransposed
                ? Object.keys(r).filter(x => ![keyName, '主管別', '業別'].includes(x))
                : valCols.map(c => c.customName);

            const sum = state.summaryData.get(k) || { [keyName]: k, ...Object.fromEntries(cols.map(c => [c, 0])) };
            cols.forEach(c => sum[c] = (sum[c] || 0) + (r[c] || 0));
            state.summaryData.set(k, sum);
        }));

        const tmpl = TEMPLATE_CONFIG[state.currentTemplate];
        if (tmpl?.sortType && ORDER_LISTS[tmpl.sortType]) {
            const order = new Map(ORDER_LISTS[tmpl.sortType].map((k, i) => [k, i]));
            state.orderedItemKeys.sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999));
        }

        state.exportKeyName = keyName;
        const firstKey = state.orderedItemKeys[0];
        state.exportValueColumns = state.isTransposed
            ? Object.keys(state.summaryData.get(firstKey) || {}).filter(k => k !== keyName)
            : valCols.map(c => c.customName);

        renderOutput();
        const warningParts = [];
        if (excluded.length) warningParts.push(`${excluded.length} 個檔案沒有可讀取的工作表，已忽略：${esc(excluded.join('、'))}`);
        if (emptyResults.length) warningParts.push(`${emptyResults.length} 個檔案在指定範圍內沒有任何資料列（請確認版面或範圍是否相同）：${esc(emptyResults.join('、'))}`);
        document.getElementById('validation-warnings').innerHTML = warningParts.length
            ? warningParts.map(t => `<div class="alert alert-warning">${t}</div>`).join('')
            : '';
        els.outputArea.style.display = 'block';
        updateStep(4, 'completed');
        setStatus(`彙總完成：${state.allFileData.length} 個檔案、${state.orderedItemKeys.length} 個項目。`, 'success');
        els.outputArea.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        setStatus(`處理失敗：${esc(err.message)}`, 'error');
        console.error(err);
    } finally {
        state.busy = false;
        els.processBtn.disabled = false;
    }
}

/** 總表：第一列為真正的合計列（舊版把第一筆項目當成合計列上色）。 */
function buildSummaryRows() {
    const cols = state.exportValueColumns;
    const rows = state.orderedItemKeys.map(k => state.summaryData.get(k));
    const total = { [state.exportKeyName]: '合計' };
    cols.forEach(c => {
        const hasNumber = rows.some(r => typeof r[c] === 'number');
        total[c] = hasNumber ? rows.reduce((s, r) => s + (Number(r[c]) || 0), 0) : '';
    });
    return { rows, total };
}

function renderOutput() {
    const cols = [state.exportKeyName, ...state.exportValueColumns];
    const { total } = buildSummaryRows();
    const sumData = state.orderedItemKeys.map(k => state.summaryData.get(k));
    document.getElementById('summary-view').innerHTML = `<h3>總表</h3>` + generateHtmlTable(sumData, cols, true, total);

    els.fileDropdown.innerHTML = '<option value="">請選擇檔案</option>' +
        state.allFileData.map((f, i) => `<option value="${i}">${esc(f.sourceName)}</option>`).join('');
    els.itemDropdown.innerHTML = '<option value="">請選擇項目</option>' +
        state.orderedItemKeys.map(k => `<option value="${esc(k)}">${esc(k)}</option>`).join('');
}

function generateHtmlTable(data, headers, fmt, totalRow) {
    let h = '<div class="table-wrapper"><table class="report-table"><thead><tr>' + headers.map(x => `<th>${esc(x)}</th>`).join('') + '</tr></thead><tbody>';
    if (totalRow) {
        h += '<tr class="total-row">' + headers.map(k => {
            const v = totalRow[k];
            return `<td class="${typeof v === 'number' ? 'number' : ''}">${typeof v === 'number' ? v.toLocaleString() : esc(v ?? '')}</td>`;
        }).join('') + '</tr>';
    }
    data.forEach((r) => {
        h += '<tr>' + headers.map(k => {
            const v = r ? r[k] : undefined;
            return `<td class="${typeof v === 'number' ? 'number' : ''}">${typeof v === 'number' && fmt ? v.toLocaleString() : esc(v ?? '')}</td>`;
        }).join('') + '</tr>';
    });
    return h + '</tbody></table></div>';
}

function renderFileDetailView() {
    const idx = parseInt(els.fileDropdown.value, 10);
    const f = state.allFileData[idx];
    if (f) els.fileDetailTable.innerHTML = `<h3>${esc(f.sourceName)}</h3>` +
        generateHtmlTable(f.data, [state.exportKeyName, '主管別', '業別', ...state.exportValueColumns], true);
}

function renderItemDetailView() {
    const k = els.itemDropdown.value;
    if (!k) return;
    const d = state.allFileData.map(f => ({
        '來源': f.sourceName, '主管別': f.fundInfo?.['主管別'] || '-', '業別': f.fundInfo?.['業別'] || '-',
        ...state.exportValueColumns.reduce((acc, c) => ({ ...acc, [c]: f.data.find(r => r[state.exportKeyName] === k)?.[c] || 0 }), {})
    }));
    const sum = state.summaryData.get(k);
    d.unshift({ '來源': '合計', '主管別': '', '業別': '', ...sum });
    document.getElementById('item-detail-table').innerHTML = `<h3>項目：${esc(k)}</h3>` +
        generateHtmlTable(d, ['來源', '主管別', '業別', ...state.exportValueColumns], true);
}

function triggerDownload(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = Lib.safeFileName(name, 'download');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function exportReport(type) {
    if (!state.summaryData.size) return setStatus('尚無可匯出的資料。', 'warning');
    const { rows, total } = buildSummaryRows();
    const data = [total, ...rows];
    const headers = [state.exportKeyName, ...state.exportValueColumns];
    const stamp = new Date().toISOString().slice(0, 10);

    try {
        if (type === 'json') {
            triggerDownload(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `report-${stamp}.json`);
        } else if (type === 'csv') {
            const csv = '\uFEFF' + Lib.toCsv(headers, data);
            triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `report-${stamp}.csv`);
        } else if (type === 'html') {
            const html = `<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8"><title>彙總報告</title></head><body>`
                + generateHtmlTable(rows, headers, true, total) + `</body></html>`;
            triggerDownload(new Blob([html], { type: 'text/html;charset=utf-8' }), `report-${stamp}.html`);
        } else {
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data, { header: headers }), 'Sheet1');
            XLSX.writeFile(wb, `report-${stamp}.xlsx`);
        }
        setStatus(`已匯出 ${type.toUpperCase()}。`, 'success');
    } catch (err) {
        setStatus(`匯出失敗：${esc(err.message)}`, 'error');
    }
}

// 啟動程式
init();
