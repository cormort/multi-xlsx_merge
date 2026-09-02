// node test-detect.mjs — 範圍自動偵測的回歸檢查。
// 兩組 fixture 來自真實檔案的失敗案例（現流08 的文字附註區、平衡表的雜訊欄）。
import assert from 'node:assert';
import fs from 'node:fs';

const src = fs.readFileSync(new URL('./scripts.js', import.meta.url), 'utf8');
const body = src.slice(src.indexOf('// 欄位填充率低於此值'), src.indexOf('function showDetectResult'));

const col = n => { let s = ''; n++; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - 1 - m) / 26; } return s; };
const XLSX = { utils: {
    sheet_to_json: sh => sh.rows,
    encode_range: r => `${col(r.s.c)}${r.s.r + 1}:${col(r.e.c)}${r.e.r + 1}`,
} };
const state = { workbooks: [] }, els = { dataRangeInput: {}, headerRowsInput: {} };
const doc = { getElementById: () => ({ style: {} }) };
const autoDetectBestRange = new Function(
    'state', 'els', 'XLSX', 'resetMappings', 'showDetectResult', 'updateStep', 'document',
    `${body}; return autoDetectBestRange;`,
)(state, els, XLSX, resetMappings => {}, () => {}, () => {}, doc);

const run = (...files) => {
    state.workbooks = files.map((rows, i) => ({ file: { name: `f${i}.xlsx` }, workbook: { SheetNames: ['s'], Sheets: { s: { '!ref': 'A1:ZZ999', rows } } } }));
    autoDetectBestRange();
    return `${els.dataRangeInput.value}/${els.headerRowsInput.value}`;
};

// 表格後接純文字附註：範圍應止於最後一列含數值的資料列。
const notes = [
    ['國立大學校院', null, null],
    ['中華民國116年度', '單位:新臺幣千元', null],
    ['項目', '預算數', '說明'],
    ['業務活動之現金流量', 10111672, null],
    ['本期賸餘', -5609663, null],
    ['國立臺東專科學校', null, null],
    ['一、國庫撥款增撥基金', null, null],
];
assert.strictEqual(run(notes), 'A3:B5/1', '文字附註區未被排除');

// 兩側雜訊欄：填充率低於門檻的邊欄應被收斂掉（真實檔案 20 列中僅 1 列有值）。
const sparse = [['114年實際數', '科目', '116年預算數', null, null]];
for (let i = 0; i < 20; i++) sparse.push([443430401 + i, `科目${i}`, 450610347 + i, i === 0 ? 0 : null, null]);
assert.strictEqual(run(sparse), 'A1:C21/1', '雜訊欄未被收斂');

// 標頭跨多列（合併儲存格）：標頭列數應為 3，非固定的 1。
const multi = [
    ['中央政府各機關作業基金', null, null, null],
    ['基金名稱：某某基金', null, null, '單位：新臺幣千元'],
    ['項目', '112年度決算數', '113年度', null],
    [null, null, '預算數', '截至6月底'],
    [null, null, null, '止實際數'],
];
for (let i = 0; i < 20; i++) multi.push([`一、業務總收入${i}`, 33065615 + i, 28771530 + i, 12345 + i]);
assert.strictEqual(run(multi), 'A3:D25/3', '多列標頭未被偵測');

// 相同版面的整批檔案：少數檔案旁的手算欄應被多數決蓋過。
const scratch = multi.map((r, i) => i === 0 ? [...r, null] : [...r, i > 4 ? 999 : null]);
assert.strictEqual(run(multi, multi, multi, scratch), 'A3:D25/3', '多數決未蓋過離群檔案');

console.log('ok');
