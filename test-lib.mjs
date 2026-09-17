// node test-lib.mjs — 純函式回歸測試（免安裝、秒級）
//
// 這些案例全部來自實際踩到的問題：
//   - 會計報表的括號負數 (1,234)：舊版 parseFloat → NaN → 0，把虧損算成零
//   - 表格後方的文字附註區被當成資料列
//   - 兩側零星雜訊欄沒有收斂
//   - 合併儲存格的多列標頭只抓到 1 列
//   - 批次中少數檔案多了手算欄，多數決要蓋過它
import assert from 'node:assert';
import './lib.js';   // UMD：在 Node 會掛到 globalThis.XlsxMergeLib

const L = globalThis.XlsxMergeLib;
assert.ok(L, 'lib.js 沒有正確輸出 API');

const col = (n) => { let s = ''; n++; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - 1 - m) / 26; } return s; };
const XLSX_UTILS = {
    sheet_to_json: (sh) => sh.rows,                       // 忽略 range：測試資料本來就是整張
    encode_range: (r) => `${col(r.s.c)}${r.s.r + 1}:${col(r.e.c)}${r.e.r + 1}`,
};
const sheetOf = (rows, ref = 'A1:ZZ999') => ({ '!ref': ref, rows });
const detect = (rows, ref) => L.detectRangeInSheet(sheetOf(rows, ref), XLSX_UTILS);
const run = (...files) => L.voteBestRange(files.map(f => sheetOf(f)), XLSX_UTILS);

let passed = 0;
const ok = (name, fn) => { fn(); passed++; console.log(`PASS  ${name}`); };

console.log('=== A. 數字解析（會計報表格式） ===');
ok('括號負數：半形、全形、含千分位都算成負數', () => {
    assert.strictEqual(L.toNumber('(1,234)'), -1234);
    assert.strictEqual(L.toNumber('（1,234）'), -1234);
    assert.strictEqual(L.toNumber('(1234)'), -1234);
    assert.strictEqual(L.toNumber('(1,234,567)'), -1234567);
});
ok('千分位、全形數字、全形負號、單位後綴', () => {
    assert.strictEqual(L.toNumber('1,234'), 1234);
    assert.strictEqual(L.toNumber('１２３４'), 1234);
    assert.strictEqual(L.toNumber('－1,234'), -1234);
    assert.strictEqual(L.toNumber('−1,234'), -1234);
    assert.strictEqual(L.toNumber('1,234元'), 1234);
    assert.strictEqual(L.toNumber(' 1 234 '.replace(' ', '')), 1234);
});
ok('0 不會被誤判成空值（舊版 r[k] || "" 會讓 0 消失）', () => {
    assert.strictEqual(L.toNumber(0), 0);
    assert.strictEqual(L.toNumber('0'), 0);
    assert.strictEqual(L.toNumberOrZero('0'), 0);
});
ok('非數字回傳 null：百分比、日期、文字、空值', () => {
    for (const v of ['', null, undefined, 'abc', '55%', '2024/01/01', '1,5', '小計']) {
        assert.strictEqual(L.toNumber(v), null, `${v} 應為 null`);
    }
    assert.strictEqual(L.toNumberOrZero('55%'), 0);
});

console.log('\n=== B. 範圍自動偵測 ===');
ok('表格後接純文字附註：範圍止於最後一列含數值的資料列', () => {
    const notes = [
        ['國立大學校院', null, null],
        ['中華民國116年度', '單位:新臺幣千元', null],
        ['項目', '預算數', '說明'],
        ['業務活動之現金流量', 10111672, null],
        ['本期賸餘', -5609663, null],
        ['國立臺東專科學校', null, null],
        ['一、國庫撥款增撥基金', null, null],
    ];
    assert.strictEqual(detect(notes).range, 'A3:B5');
    assert.strictEqual(detect(notes).headerRows, 1);
});
ok('兩側雜訊欄（填充率 <10%）會被收斂掉', () => {
    const sparse = [['114年實際數', '科目', '116年預算數', null, null]];
    for (let i = 0; i < 20; i++) sparse.push([443430401 + i, `科目${i}`, 450610347 + i, i === 0 ? 0 : null, null]);
    const r = detect(sparse);
    assert.strictEqual(r.range, 'A1:C21');
});
ok('合併儲存格的多列標頭：標頭列數為 3，非固定 1', () => {
    const multi = [
        ['中央政府各機關作業基金', null, null, null],
        ['基金名稱：某某基金', null, null, '單位：新臺幣千元'],
        ['項目', '112年度決算數', '113年度', null],
        [null, null, '預算數', '截至6月底'],
        [null, null, null, '止實際數'],
    ];
    for (let i = 0; i < 20; i++) multi.push([`一、業務總收入${i}`, 33065615 + i, 28771530 + i, 12345 + i]);
    const r = detect(multi);
    assert.strictEqual(r.range, 'A3:D25');
    assert.strictEqual(r.headerRows, 3);
});
ok('括號負數也被視為數值列（範圍不會提早收斂）', () => {
    const rows = [['項目', '金額'], ['收入', 100], ['支出', '(1,200)']];
    assert.strictEqual(detect(rows).range, 'A1:B3');
});
ok('工作表 !ref 不是從 A1 開始時，欄位位移正確', () => {
    const rows = [['項目', '金額'], ['收入', 100]];
    const r = detect(rows, 'C3:D4');
    assert.strictEqual(r.range, 'C3:D4');
});
ok('空工作表／沒有標頭列回傳 null', () => {
    assert.strictEqual(L.detectRangeInSheet(null, XLSX_UTILS), null);
    assert.strictEqual(L.detectRangeInSheet({ '!ref': 'A1:B2' }, XLSX_UTILS), null);
    assert.strictEqual(detect([['只有一欄'], ['x']]), null);
});

console.log('\n=== C. 多數決（批次中少數檔案版面不同） ===');
ok('多數決蓋過離群檔案，並列出離群者', () => {
    const multi = [
        ['中央政府各機關作業基金', null, null, null],
        ['基金名稱：某某基金', null, null, '單位：新臺幣千元'],
        ['項目', '112年度決算數', '113年度', null],
        [null, null, '預算數', '截至6月底'],
        [null, null, null, '止實際數'],
    ];
    for (let i = 0; i < 20; i++) multi.push([`一、業務總收入${i}`, 33065615 + i, 28771530 + i, 12345 + i]);
    const scratch = multi.map((r, i) => (i === 0 ? [...r, null] : [...r, i > 4 ? 999 : null]));
    const vote = run(multi, multi, multi, scratch);
    assert.strictEqual(vote.range, 'A3:D25');
    assert.strictEqual(vote.headerRows, 3);
    assert.deepStrictEqual(vote.outliers, [3]);
    assert.strictEqual(vote.winners.length, 3);
});
ok('全部無效時回傳 null', () => {
    assert.strictEqual(run([['只有一欄']]), null);
});

console.log('\n=== D. 匯出字串處理 ===');
ok('CSV：逗號、引號、換行正確轉義，且 0 保留為 0', () => {
    const csv = L.toCsv(['項目', '金額'], [{ 項目: 'a,b', 金額: 0 }, { 項目: 'he said "hi"', 金額: '(1,234)' }]);
    const lines = csv.split('\r\n');
    assert.strictEqual(lines[0], '項目,金額');
    assert.strictEqual(lines[1], '"a,b",0');
    assert.strictEqual(lines[2], '"he said ""hi""","(1,234)"');
});
ok('HTML 轉義（檔名／標頭／儲存格都可能來自使用者檔案）', () => {
    assert.strictEqual(L.escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
    assert.strictEqual(L.escapeHtml('a"b'), 'a&quot;b');
});
ok('下載檔名安全化', () => {
    assert.strictEqual(L.safeFileName('a/b:c*.xlsx'), 'a_b_c_.xlsx');
    assert.strictEqual(L.safeFileName('   '), 'download');
});

console.log('\n=== E. 基金名稱比對 ===');
ok('長名優先：不會被短名搶先匹配', () => {
    const index = L.buildFundIndex({
        '國立大學校院校務基金': { 主管別: '教育部' },
        '大學校務基金': { 主管別: '錯的' },
    });
    assert.strictEqual(L.findFundDetails(index, '國立大學校院校務基金114年度決算').主管別, '教育部');
});
ok('全形括號與空白不影響比對', () => {
    const index = L.buildFundIndex({ '國軍生產及服務作業基金': { 主管別: '國防部' } });
    assert.strictEqual(L.findFundDetails(index, ' 國軍生產及服務作業基金（114） ').主管別, '國防部');
    assert.strictEqual(L.findFundDetails(index, '不存在的基金'), null);
});

console.log(`\n${passed} passed`);
