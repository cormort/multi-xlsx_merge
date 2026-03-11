// --- 全域變數與資料庫 ---

// 基金資料庫 (可被匯入覆蓋)
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
        range: 'A4:I38', 
        headerRows: 2, 
        keyName: '科目', 
        sortType: 'op_income',
        sourceMode: 'cell', 
        sourceCell: 'A1',
        excludeKeywords: ['%', '增減'] // 使用資料定義排除邏輯
    },
    'special_cash': { 
        name: '特別收入基金 - 現金流量表',
        range: 'A4:E48', 
        headerRows: 2, 
        keyName: '項目', 
        sortType: 'special_cash',
        sourceMode: 'cell', 
        sourceCell: 'A1',
        excludeKeywords: ['小計']
    },
    'op_cash': { 
        name: '作業基金 - 現金流量表',
        range: 'A4:E49', 
        headerRows: 2, 
        keyName: '科目', 
        sortType: 'op_cash',
        sourceMode: 'cell', 
        sourceCell: 'A1',
        excludeKeywords: ['小計']
    },
    'op_surplus': { 
        name: '作業基金 - 餘絀撥補表',
        range: 'A4:G29', 
        headerRows: 2, 
        keyName: '科目', 
        sortType: 'op_surplus',
        sourceMode: 'cell', 
        sourceCell: 'A1',
        excludeKeywords: ['%', '增減']
    }
};

// 排序清單 (可被匯入覆蓋)
let ORDER_LISTS = {
    'op_income': ["業務收入","勞務收入","銷貨收入","教學收入","租金及權利金收入","投融資業務收入","醫療收入","徵收及依法分配收入","保險收入","規費收入","其他業務收入","業務成本與費用","勞務成本","銷貨成本","教學成本","出租資產成本","投融資業務成本","醫療成本","保險成本","其他業務成本","業務費用","管理及總務費用","研究發展及訓練費用","其他業務費用","業務賸餘(短絀)","業務外收入","財務收入","其他業務外收入","業務外費用","財務費用","其他業務外費用","業務外賸餘(短絀)","本期賸餘(短絀)"],
    'special_cash': ["本期賸餘","折舊","攤銷","出售資產利益","應收帳款","存貨","預付款項","應付帳款","預收款項","應計退休金負債","其他","業務活動之淨現金流入","減少（增加）短期投資","出售長期投資","出售資產","存出保證金","投資活動之淨現金流入","增加（減少）短期債務","長期債務舉借","長期債務償還","基金（資本）之撥入","基金（資本）之撥出","融資活動之淨現金流入","現金及約當現金之淨增（減）數","期初現金及約當現金餘額","期末現金及約當現金餘額"],
    'op_surplus': ["賸餘之部","本期賸餘","前期未分配賸餘","追溯適用及追溯重編之影響數","公積轉列數","其他轉入數","分配之部","填補累積短絀","提存公積","賸餘撥充基金數","解繳公庫淨額","其他依法分配數","未分配賸餘","短絀之部","本期短絀","前期待填補之短絀","追溯適用及追溯重編之影響數","其他轉入數","填補之部","撥用賸餘","撥用公積","折減基金","公庫撥款","待填補之短絀"]
};

// --- 應用程式狀態 ---
const state = { 
    workbooks: [], columnMappings: [], allFileData: [], 
    summaryData: new Map(), orderedItemKeys: [], isTransposed: false, 
    originalData: null, transposeKeyIndex: null, exportKeyName: null, 
    exportValueColumns: [], currentTemplate: 'custom'
};

// DOM 元素
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
    templateFileInput: document.getElementById('template-file-input')
};

// 初始化
function init() {
    populateTemplateDropdown();
    setupEventListeners();
    updateStep(1);
}

// 填充版型下拉選單
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

// 事件監聽設定
function setupEventListeners() {
    els.dropArea.addEventListener('click', () => els.fileInput.click());
    ['dragenter', 'dragover'].forEach(e => els.dropArea.addEventListener(e, evt => { evt.preventDefault(); els.dropArea.classList.add('drag-over'); }));
    ['dragleave', 'drop'].forEach(e => els.dropArea.addEventListener(e, evt => { evt.preventDefault(); els.dropArea.classList.remove('drag-over'); }));
    els.dropArea.addEventListener('drop', e => { if(e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); });
    els.fileInput.addEventListener('change', e => { if(e.target.files.length) handleFiles(e.target.files); });
    
    els.clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if(confirm('確定要清除所有已上傳的檔案嗎？')) {
            state.workbooks = []; els.fileInput.value = ''; resetUI();
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
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    triggerDownload(blob, '基金彙總版型設定.json');
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
            alert(`✅ 設定匯入成功！已更新版型、排序清單與基金資料庫。`);
            els.templateFileInput.value = ''; 
        } catch (err) {
            alert(`❌ 匯入失敗：格式錯誤 (${err.message})`);
        }
    };
    reader.readAsText(file);
}

// --- 核心功能函式 ---

function updateStep(stepNum, status = 'active') {
    document.querySelectorAll('.step').forEach((step, i) => {
        step.classList.remove('active', 'completed');
        if (i + 1 < stepNum) step.classList.add('completed');
        if (i + 1 === stepNum) step.classList.add(status);
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

async function handleFiles(fileList) {
    resetUI();
    els.previewArea.innerHTML = '<div class="empty-state">正在讀取檔案...</div>';
    try {
        state.workbooks = await Promise.all(Array.from(fileList).map(readFile));
        const fileListHtml = `
            <details class="file-list-details">
                <summary class="file-list-summary">✓ 已載入 ${state.workbooks.length} 個檔案 (點擊查看清單)</summary>
                <div class="file-list">${state.workbooks.map(wb => `<div class="file-item"><span>${wb.file.name}</span></div>`).join('')}</div>
            </details>`;
        els.fileListContainer.innerHTML = fileListHtml;
        generatePreview(state.workbooks[0].workbook.Sheets[state.workbooks[0].workbook.SheetNames[0]]);
        document.getElementById('section-preview').style.display = 'block';
        els.clearBtn.style.display = 'inline-flex';
        updateStep(2);
        
        if (els.templateSelect.value !== 'custom') handleTemplateChange();
    } catch(err) {
        els.previewArea.innerHTML = `<div class="empty-state" style="color:#dc3545;">檔案解析失敗：${err.message}</div>`;
    }
}

function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve({file, workbook: XLSX.read(e.target.result, {type: 'array'})});
        reader.onerror = err => reject(err);
        reader.readAsArrayBuffer(file);
    });
}

function generatePreview(sheet) {
    if (!sheet || !sheet['!ref']) { els.previewArea.innerHTML = '<div class="empty-state">工作表為空</div>'; return; }
    const range = XLSX.utils.decode_range(sheet['!ref']);
    range.e.r = Math.min(range.e.r, range.s.r + 50);
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, range: range, defval: '' });
    let html = '<table><thead><tr><th></th>';
    for (let C = range.s.c; C <= range.e.c; ++C) html += `<th>${XLSX.utils.encode_col(C)}</th>`;
    html += '</tr></thead><tbody>';
    data.forEach((row, i) => {
        html += `<tr><th>${range.s.r + i + 1}</th>`;
        (row || []).forEach(cell => html += `<td>${cell ?? ''}</td>`);
        html += '</tr>';
    });
    els.previewArea.innerHTML = html + '</tbody></table>';
}

function handleTemplateChange() {
    const key = els.templateSelect.value;
    state.currentTemplate = key;
    const tmpl = TEMPLATE_CONFIG[key];
    
    if (key !== 'custom' && tmpl) {
        els.dataRangeInput.value = tmpl.range;
        els.headerRowsInput.value = tmpl.headerRows;
        showDetectResult(`✅ 已套用版型範圍：${tmpl.name}`, 'success');
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
    if (state.workbooks.length === 0) return;
    resetMappings();
    const sheet = state.workbooks[0].workbook.Sheets[state.workbooks[0].workbook.SheetNames[0]];
    if (!sheet || !sheet['!ref']) return showDetectResult('工作表為空', 'error');
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    let headerRowIdx = -1, lastDataRowIdx = -1, firstCol = Infinity, lastCol = -1;
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
        if ((rows[i]?.filter(c => c != null && String(c).trim() !== '').length || 0) > 2) { headerRowIdx = i; break; }
    }
    if (headerRowIdx === -1) return showDetectResult('找不到有效的標頭列', 'error');
    
    for (let i = rows.length - 1; i > headerRowIdx; i--) {
        if (rows[i] && rows[i].some(c => c != null && String(c).trim() !== '')) { lastDataRowIdx = i; break; }
    }
    
    for (let r = headerRowIdx; r <= lastDataRowIdx; r++) {
        if (!rows[r]) continue;
        rows[r].forEach((cell, c) => {
            if (cell != null && String(cell).trim() !== '') {
                firstCol = Math.min(firstCol, c);
                lastCol = Math.max(lastCol, c);
            }
        });
    }
    
    const rangeStr = XLSX.utils.encode_range({ s: { r: headerRowIdx, c: firstCol }, e: { r: lastDataRowIdx, c: lastCol } });
    els.dataRangeInput.value = rangeStr;
    els.headerRowsInput.value = 1;
    showDetectResult(`成功偵測到範圍：${rangeStr}`, 'success');
    document.getElementById('section-range').style.display = 'block';
    updateStep(2, 'completed');
    updateStep(3);
}

function showDetectResult(message, type) {
    els.detectResult.innerHTML = `<div class="alert alert-${type === 'success' ? 'success' : 'info'}">${message}</div>`;
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

// --- 關鍵修正：欄位讀取與防重複命名邏輯 ---
function loadHeadersAndMapping() {
    const rangeStr = els.dataRangeInput.value.trim().toUpperCase();
    const headerRows = parseInt(els.headerRowsInput.value, 10);
    if (!rangeStr || headerRows < 1) return alert('設定無效');
    
    try {
        const sheet = state.workbooks[0].workbook.Sheets[state.workbooks[0].workbook.SheetNames[0]];
        const range = XLSX.utils.decode_range(rangeStr);
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
        state.originalData = { headers, data: unmergeAndFill(dataRows, sheet, dataRange), range, headerRows, sheet };
        
        // --- 新增：重複名稱偵測與重新命名 (Fix for duplicate merged headers) ---
        const usedNames = new Set();
        
        state.columnMappings = headers.map((h, i) => {
            const excelCol = XLSX.utils.encode_col(range.s.c + i);
            let baseName = h || `(空白 ${excelCol})`;
            let uniqueName = baseName;
            let counter = 2;
            
            // 如果名稱已存在，自動添加後綴 _2, _3 ...
            while (usedNames.has(uniqueName)) {
                uniqueName = `${baseName}_${counter}`;
                counter++;
            }
            usedNames.add(uniqueName);

            let role = (i === 0) ? 'key' : (!h ? 'ignore' : 'value');
            
            return { 
                excelCol, 
                autoHeader: h || `(空白 ${excelCol})`, // 保留原始顯示
                customName: uniqueName, // 使用唯一名稱作為 key
                role, 
                include: role !== 'ignore' 
            };
        });
        // --- 修正結束 ---

        state.isTransposed = false;
        els.transposeControls.style.display = 'none';
        els.transposeBtn.textContent = '🔄 欄列轉置';
        renderMappingTable();
        
        els.mappingAlert.className = 'alert alert-info';
        els.mappingAlert.innerHTML = '💡 請確認主要分析欄位 (項目/科目) 及要加總的數值欄位 (重複欄位已自動編號)。';
        
        document.getElementById('section-mapping').style.display = 'block';
        updateStep(3, 'completed');
    } catch(err) {
        showDetectResult(`錯誤：${err.message}`, 'error');
    }
}

function renderMappingTable() {
    let html = `<div class="mapping-table-wrapper"><table class="mapping-table"><thead><tr><th>Excel 欄位</th><th>原始標頭</th><th>報表欄位名稱</th><th>角色</th><th>使用</th></tr></thead><tbody>`;
    state.columnMappings.forEach((col, i) => {
        html += `<tr>
            <td><span class="excel-col">${col.excelCol}</span></td>
            <td>${col.autoHeader}</td>
            <td><input type="text" data-idx="${i}" class="custom-name-input" value="${col.customName}"></td>
            <td><select data-idx="${i}" class="role-select">
                <option value="ignore" ${col.role==='ignore'?'selected':''}>忽略</option>
                <option value="key" ${col.role==='key'?'selected':''}>分析欄位</option>
                <option value="value" ${col.role==='value'?'selected':''}>加總</option>
            </select></td>
            <td><input type="checkbox" data-idx="${i}" class="include-checkbox" ${col.include?'checked':''}></td>
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
    if (!state.originalData) return alert('請先讀取欄位');
    if (state.isTransposed) return loadHeadersAndMapping(); 
    
    const { headers, range } = state.originalData;
    els.transposeKeySelect.innerHTML = '<option value="">--- 請選擇分析欄位 ---</option>' + 
        headers.map((h, i) => `<option value="${i}">${h || `欄位 ${i+1}`}</option>`).join('');
    els.transposeControls.style.display = 'flex';
    els.transposeBtn.textContent = '↩️ 還原';
    alert('✅ 請選擇一個欄位作為轉置後的分析欄位');
}

function applyTranspose() {
    const idx = parseInt(els.transposeKeySelect.value);
    if (isNaN(idx)) return;
    const { headers, range } = state.originalData;
    
    state.columnMappings = headers.map((h, i) => {
        if (i === idx) return null;
        const name = h || `欄位 ${i+1}`;
        return { 
            excelCol: XLSX.utils.encode_col(range.s.c + i), 
            autoHeader: name, customName: name, 
            role: 'value', include: true, isTransposeHeader: true 
        };
    }).filter(Boolean);
    state.columnMappings[0].role = 'key';
    
    state.isTransposed = true;
    state.transposeKeyIndex = idx;
    renderMappingTable();
}

function findFundDetails(name) {
    if (!name) return null;
    const clean = name.replace(/[\s_]/g, '');
    for (const k in fundDetailsMap) if (clean.includes(k) || k.includes(clean)) return fundDetailsMap[k];
    return null;
}

function processData() {
    const keyCol = state.columnMappings.find(c => c.role === 'key' && c.include);
    const valCols = state.columnMappings.filter(c => c.role === 'value' && c.include);
    if (!keyCol || valCols.length === 0) return alert('設定錯誤：需有一個分析欄位與至少一個加總欄位');
    
    const keyName = keyCol.customName || keyCol.autoHeader;
    const useCell = els.sourceNameMode.value === 'cell';
    const cellAddr = els.sourceNameCell.value.trim().toUpperCase();
    if (useCell && !cellAddr) return alert('請輸入來源名稱儲存格');

    state.allFileData = []; state.summaryData = new Map(); state.orderedItemKeys = [];
    const excluded = [];
    
    try {
        const range = XLSX.utils.decode_range(els.dataRangeInput.value);
        const dataRange = { s: { r: range.s.r + parseInt(els.headerRowsInput.value), c: range.s.c }, e: range.e };

        state.workbooks.forEach(wb => {
            const sheet = wb.workbook.Sheets[wb.workbook.SheetNames[0]];
            if (wb.file.name !== state.workbooks[0].file.name && (!sheet || !sheet['!ref'])) return excluded.push(wb.file.name);

            let sourceName = wb.file.name;
            if (useCell && sheet[cellAddr]?.v) sourceName = String(sheet[cellAddr].v).replace(/\s+/g, '');
            const fundInfo = findFundDetails(sourceName);

            let rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, range: dataRange, defval: null });
            rawData = unmergeAndFill(rawData, sheet, dataRange);
            
            let processed = [];
            if (state.isTransposed) {
                const valid = rawData.filter(r => r.some(c => c != null));
                state.columnMappings.forEach(map => {
                    const cIdx = XLSX.utils.decode_col(map.excelCol) - range.s.c;
                    const rowData = { [keyName]: map.customName, '主管別': fundInfo?.['主管別']||'-', '業別': fundInfo?.['業別']||'-' };
                    valid.forEach(r => {
                        const k = String(r[state.transposeKeyIndex]||'').replace(/\s+/g, '');
                        if(k) rowData[k] = parseFloat(String(r[cIdx]).replace(/,/g, '')) || 0;
                    });
                    processed.push(rowData);
                });
            } else {
                const kIdx = XLSX.utils.decode_col(keyCol.excelCol) - range.s.c;
                processed = rawData.map(r => {
                    if (!r || !r[kIdx]) return null;
                    const d = { [keyName]: String(r[kIdx]).trim(), '主管別': fundInfo?.['主管別']||'-', '業別': fundInfo?.['業別']||'-' };
                    valCols.forEach(vc => {
                        const vIdx = XLSX.utils.decode_col(vc.excelCol) - range.s.c;
                        d[vc.customName] = parseFloat(String(r[vIdx]).replace(/,/g, '')) || 0;
                    });
                    return d;
                }).filter(Boolean);
            }
            
            state.allFileData.push({ fileName: wb.file.name, sourceName, fundInfo, data: processed });
        });

        state.allFileData.forEach(f => f.data.forEach(r => {
            const k = r[keyName];
            if (!state.orderedItemKeys.includes(k)) state.orderedItemKeys.push(k);
            
            const cols = state.isTransposed ? Object.keys(r).filter(x => ![keyName, '主管別', '業別'].includes(x)) : valCols.map(c => c.customName);
            
            let sum = state.summaryData.get(k) || { [keyName]: k, ...Object.fromEntries(cols.map(c=>[c,0])) };
            cols.forEach(c => sum[c] = (sum[c]||0) + (r[c]||0));
            state.summaryData.set(k, sum);
        }));

        const tmpl = TEMPLATE_CONFIG[state.currentTemplate];
        if (tmpl?.sortType && ORDER_LISTS[tmpl.sortType]) {
            const order = new Map(ORDER_LISTS[tmpl.sortType].map((k,i) => [k,i]));
            state.orderedItemKeys.sort((a,b) => (order.get(a)??999) - (order.get(b)??999));
        }

        state.exportKeyName = keyName;
        state.exportValueColumns = state.isTransposed ? Object.keys(state.summaryData.get(state.orderedItemKeys[0])).filter(k=>k!==keyName) : valCols.map(c=>c.customName);

        renderOutput();
        document.getElementById('validation-warnings').innerHTML = excluded.length ? `<div class="alert alert-warning">${excluded.length} 個檔案被忽略</div>` : '';
        els.outputArea.style.display = 'block';
        updateStep(4, 'completed');
        els.outputArea.scrollIntoView({ behavior: 'smooth' });
        alert(`✅ 彙總完成！共 ${state.allFileData.length} 個檔案`);
    } catch(err) {
        alert('處理失敗: ' + err.message); console.error(err);
    }
}

function renderOutput() {
    const cols = [state.exportKeyName, ...state.exportValueColumns];
    const sumData = state.orderedItemKeys.map(k => state.summaryData.get(k));
    document.getElementById('summary-view').innerHTML = `<h3>📊 總表</h3>` + generateHtmlTable(sumData, cols, true);
    
    els.fileDropdown.innerHTML = '<option value="">請選擇檔案</option>' + state.allFileData.map(f => `<option value="${f.fileName}">${f.sourceName}</option>`).join('');
    els.itemDropdown.innerHTML = '<option value="">請選擇項目</option>' + state.orderedItemKeys.map(k => `<option value="${k}">${k}</option>`).join('');
}

function generateHtmlTable(data, headers, fmt) {
    let h = '<table class="report-table"><thead><tr>' + headers.map(x=>`<th>${x}</th>`).join('') + '</tr></thead><tbody>';
    data.forEach((r, i) => {
        h += `<tr class="${i===0&&fmt?'total-row':''}">` + headers.map(k => {
            const v = r[k];
            return `<td class="${typeof v==='number'?'number':''}">${typeof v==='number'&&fmt ? v.toLocaleString() : (v??'')}</td>`;
        }).join('') + '</tr>';
    });
    return h + '</tbody></table>';
}

function renderFileDetailView() {
    const f = state.allFileData.find(x => x.fileName === els.fileDropdown.value);
    if(f) els.fileDetailTable.innerHTML = `<h3>${f.sourceName}</h3>` + generateHtmlTable(f.data, [state.exportKeyName, '主管別', '業別', ...state.exportValueColumns], true);
}
function renderItemDetailView() {
    const k = els.itemDropdown.value;
    if(!k) return;
    const d = state.allFileData.map(f => ({ 
        '來源': f.sourceName, '主管別': f.fundInfo?.['主管別']||'-', '業別': f.fundInfo?.['業別']||'-',
        ...state.exportValueColumns.reduce((acc, c) => ({...acc, [c]: f.data.find(r=>r[state.exportKeyName]===k)?.[c]||0}), {})
    }));
    const sum = state.summaryData.get(k);
    d.unshift({ '來源': '合計', '主管別':'', '業別':'', ...sum });
    document.getElementById('item-detail-table').innerHTML = `<h3>項目: ${k}</h3>` + generateHtmlTable(d, ['來源', '主管別', '業別', ...state.exportValueColumns], true);
}

function triggerDownload(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
function exportReport(type) {
    if(!state.summaryData.size) return alert('無資料');
    const data = state.orderedItemKeys.map(k => state.summaryData.get(k));
    const headers = [state.exportKeyName, ...state.exportValueColumns];
    
    if(type === 'json') triggerDownload(new Blob([JSON.stringify(data,null,2)], {type:'application/json'}), 'report.json');
    else if(type === 'csv') {
        const csv = [headers.join(',')].concat(data.map(r => headers.map(k => `"${r[k]||''}"`).join(','))).join('\n');
        triggerDownload(new Blob(['\uFEFF'+csv], {type:'text/csv'}), 'report.csv');
    } else if(type === 'html') {
        triggerDownload(new Blob([`<html><body>${generateHtmlTable(data, headers, true)}</body></html>`], {type:'text/html'}), 'report.html');
    } else {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data, {header:headers}), "Sheet1");
        XLSX.writeFile(wb, 'report.xlsx');
    }
}

// 啟動程式
init();
