/*!
 * lib.js — multi-xlsx_merge 的純函式層（不碰 DOM，可在 Node 直接測）
 *
 * 這裡放的是「跟畫面無關、但錯了會讓報表數字錯」的邏輯：
 *   - toNumber：Excel 儲存格轉數字（括號負數、千分位、全形數字…）
 *   - detectRangeInSheet：自動偵測資料範圍
 *   - toCsv / escapeHtml：匯出與渲染前的字串處理
 *   - buildFundIndex / findFundDetails：基金名稱比對
 *
 * 以 UMD 形式輸出：瀏覽器用 window.XlsxMergeLib，Node 用 import './lib.js'。
 */
(function (root, factory) {
    const api = factory();
    // 同時提供 CommonJS 與全域（瀏覽器 <script> 與 Node 的 ESM 測試都能用）
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.XlsxMergeLib = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    // --- 數字解析 ---------------------------------------------------------

    const FULLWIDTH_DIGITS = /[\uFF10-\uFF19]/g;

    function normalizeNumberString(input) {
        let s = String(input);
        // 全形數字與全形符號 → 半形
        s = s.replace(FULLWIDTH_DIGITS, (d) => String.fromCharCode(d.charCodeAt(0) - 0xFEE0));
        s = s.replace(/[\uFF0D\u2212\u2013\u2014\uFE63]/g, '-'); // － − – — ﹣ → -
        s = s.replace(/[\uFF08]/g, '(').replace(/[\uFF09]/g, ')');
        s = s.replace(/[\uFF0C\u3001]/g, ',');                    // ，、 → ,
        s = s.replace(/[\s\u00A0]/g, '');                         // 空白與不斷行空白
        s = s.replace(/(?:NT\$|US\$|\$|元|千元|百萬元)/gi, '');    // 常見單位後綴
        // 千分位：只移除「後面剛好三位數字」的逗號，避免把 1,5 這種小數逗號吃掉
        let prev;
        do { prev = s; s = s.replace(/(\d),(?=\d{3}(?:\D|$))/g, '$1'); } while (s !== prev);
        s = s.replace(/[*,]+$/g, '');                             // 附註星號、尾逗號
        return s;
    }

    /**
     * 把 Excel 儲存格轉成數字；無法判定為數字時回傳 null（不是 0）。
     *
     * 會計報表最常見的負數寫法是括號：`(1,234)`、`（1,234）`、`(1234)`。
     * 舊版只做 `parseFloat(String(v).replace(/,/g,''))`，括號負數會變成 NaN → 0，
     * 等於把「虧損」默默算成「零」，這是本工具最嚴重的數字風險，因此獨立成函式。
     */
    function toNumber(value) {
        if (value == null) return null;
        if (typeof value === 'number') return Number.isFinite(value) ? value : null;
        if (typeof value === 'boolean') return value ? 1 : 0;
        let s = normalizeNumberString(value);
        if (s === '') return null;
        let negative = false;
        if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1); }
        if (s.startsWith('-')) { negative = true; s = s.slice(1); }
        else if (s.startsWith('+')) s = s.slice(1);
        if (s === '' || !/^\d*\.?\d+$/.test(s)) return null;   // 百分比、文字、日期一律不吃
        const n = Number(s);
        if (!Number.isFinite(n)) return null;
        return negative ? -n : n;
    }

    /** 數字或 0（加總用）：無法解析時視為 0，避免 NaN 污染總計。 */
    function toNumberOrZero(value) {
        const n = toNumber(value);
        return n == null ? 0 : n;
    }

    /** 是否為「看起來像數字」的儲存格（範圍偵測用，寬鬆判定）。 */
    function isNumericCell(value) {
        return toNumber(value) != null;
    }

    // --- 範圍偵測 ---------------------------------------------------------

    // 欄位填充率低於此值視為雜訊欄。實測：真實資料欄 >=55%，雜訊欄 <1%。
    const SPARSE_COL_THRESHOLD = 0.1;
    const DEFAULT_SCAN_ROWS = 2000;

    /** 解析 "A1:ZZ999" 這種位址（不依賴 XLSX.utils，方便測試）。 */
    function parseRef(ref) {
        const m = /^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/i.exec(String(ref || '').replace(/\$/g, '').trim());
        if (!m) return null;
        const col = (letters) => letters.toUpperCase().split('').reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
        const s = { r: Number(m[2]) - 1, c: col(m[1]) };
        const e = m[3] ? { r: Number(m[4]) - 1, c: col(m[3]) } : { ...s };
        if (e.r < s.r) [s.r, e.r] = [e.r, s.r];
        if (e.c < s.c) [s.c, e.c] = [e.c, s.c];
        return { s, e };
    }

    /**
     * 偵測單一工作表的資料範圍，回傳 { range, headerRows } 或 null。
     *
     * utils 由外部注入（瀏覽器傳 XLSX.utils，測試傳假物件），因此此函式可在 Node 測。
     * scanRows 限制掃描列數：舊版對整張工作表做 sheet_to_json，遇到上萬列的工作表
     * 會在多檔批次中拖垮瀏覽器；範圍偵測只需要前段資料。
     */
    function detectRangeInSheet(sheet, utils, options) {
        if (!sheet || !sheet['!ref']) return null;
        const full = parseRef(sheet['!ref']);
        if (!full) return null;
        const maxScanRows = (options && options.scanRows) || DEFAULT_SCAN_ROWS;
        const scanEndRow = Math.min(full.e.r, full.s.r + maxScanRows);

        const parsed = utils.sheet_to_json(sheet, {
            header: 1, defval: null, blankrows: true,
            range: { s: { r: full.s.r, c: full.s.c }, e: { r: scanEndRow, c: full.e.c } },
        });
        const rows = Array.isArray(parsed) ? parsed : [];
        const colOffset = full.s.c;
        const cellAt = (i, c) => (rows[i] ? rows[i][c - colOffset] : null);
        const isFilled = (i, c) => cellAt(i, c) != null && String(cellAt(i, c)).trim() !== '';

        const countFilled = (i) => (rows[i] ? rows[i].filter((c) => c != null && String(c).trim() !== '').length : 0);
        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(rows.length, 30); i++) {
            if (countFilled(i) > 2) { headerRowIdx = i; break; }
        }
        // 只有兩欄的窄表（例如「項目／金額」）不會有任何一列填滿 3 格，
        // 因此退一步：≥2 格、且下一列有數值，就視為標頭列。
        if (headerRowIdx === -1) {
            for (let i = 0; i < Math.min(rows.length - 1, 30); i++) {
                if (countFilled(i) >= 2 && rows[i + 1] && rows[i + 1].some(isNumericCell)) { headerRowIdx = i; break; }
            }
        }
        if (headerRowIdx === -1) return null;

        let lastDataRowIdx = -1;
        for (let i = rows.length - 1; i > headerRowIdx; i--) {
            if (rows[i] && rows[i].some((c) => c != null && String(c).trim() !== '')) { lastDataRowIdx = i; break; }
        }

        // 表格後方常接著純文字附註區塊，往回收斂到最後一列「含數值」的資料列。
        // 找不到任何數值列時維持原本結果（整張表可能都是文字）。
        for (let i = lastDataRowIdx; i > headerRowIdx; i--) {
            if (rows[i] && rows[i].some(isNumericCell)) { lastDataRowIdx = i; break; }
        }
        if (lastDataRowIdx === -1) return null;

        let firstCol = Infinity, lastCol = -1;
        for (let r = headerRowIdx; r <= lastDataRowIdx; r++) {
            const row = rows[r];
            if (!row) continue;
            row.forEach((cell, idx) => {
                if (cell != null && String(cell).trim() !== '') {
                    const c = idx + colOffset;
                    if (c < firstCol) firstCol = c;
                    if (c > lastCol) lastCol = c;
                }
            });
        }
        if (lastCol === -1) return null;

        // 兩側常有零星雜訊欄（整欄只有一兩格有值），依資料列填充率由外往內收斂。
        const dataRowCount = lastDataRowIdx - headerRowIdx;
        if (dataRowCount > 0) {
            const countInCol = (c) => {
                let n = 0;
                for (let r = headerRowIdx + 1; r <= lastDataRowIdx; r++) if (isFilled(r, c)) n++;
                return n;
            };
            // 雜訊欄的判定：填充率低於門檻，或整欄只有一格有值（資料列少時 1/5 也會超過門檻，
            // 只看比例會漏掉手算欄）。至少保留一欄，避免把整個表格裁掉。
            const isNoise = (c) => {
                const n = countInCol(c);
                if (n === 0) return true;
                if (n === 1 && dataRowCount >= 3) return true;
                return n / dataRowCount < SPARSE_COL_THRESHOLD;
            };
            while (firstCol < lastCol && isNoise(firstCol)) firstCol++;
            while (lastCol > firstCol && isNoise(lastCol)) lastCol--;
        }

        // 標頭常跨多列（合併儲存格），自標頭列起算連續「非空白且不含數值」的列數即為標頭列數。
        let headerRows = 0;
        for (let r = headerRowIdx; r <= lastDataRowIdx; r++) {
            const row = rows[r] || [];
            if (!row.some((c) => c != null && String(c).trim() !== '')) break;
            if (row.some(isNumericCell)) break;
            headerRows++;
        }

        return {
            range: utils.encode_range({
                s: { r: full.s.r + headerRowIdx, c: firstCol },
                e: { r: full.s.r + lastDataRowIdx, c: lastCol },
            }),
            headerRows: Math.max(headerRows, 1),
        };
    }

    /**
     * 逐檔偵測後取多數決。本工具的用途是彙整「大量相同版面」的檔案，
     * 個別檔案旁邊的暫存欄位／手算欄不應影響整批的範圍。
     */
    function voteBestRange(sheets, utils, options) {
        const votes = new Map();
        sheets.forEach((sheet, i) => {
            const result = detectRangeInSheet(sheet, utils, options);
            const key = result ? `${result.range}|${result.headerRows}` : '';
            if (!votes.has(key)) votes.set(key, []);
            votes.get(key).push(i);
        });
        const valid = [...votes].filter(([key]) => key !== '');
        if (valid.length === 0) return null;
        valid.sort((a, b) => b[1].length - a[1].length);
        const [winner, winners] = valid[0];
        const [range, headerRows] = winner.split('|');
        const outliers = valid.slice(1).flatMap(([, idx]) => idx)
            .concat(votes.get('') ? votes.get('') : []);
        return { range, headerRows: Number(headerRows), winners, outliers };
    }

    // --- 字串處理 ---------------------------------------------------------

    function escapeHtml(value) {
        if (value == null) return '';
        return String(value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    /** 匯出 CSV：正確轉義引號與換行，保留 0（舊版 `r[k]||''` 會讓 0 變空白）。 */
    function toCsv(headers, rows, options) {
        const eol = (options && options.eol) || '\r\n';
        const cell = (v) => {
            if (v == null) return '';
            if (typeof v === 'number' && Number.isFinite(v)) return String(v);
            const s = String(v);
            return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const lines = [headers.map(cell).join(',')];
        rows.forEach((r) => lines.push(headers.map((h) => cell(r[h])).join(',')));
        return lines.join(eol);
    }

    /** 下載檔名安全化（檔名可能來自使用者上傳的檔案）。 */
    function safeFileName(name, fallback) {
        const s = String(name == null ? '' : name).replace(/[\\/:*?"<>|\u0000-\u001F]/g, '_').trim();
        return s || (fallback || 'download');
    }

    // --- 基金名稱比對 -----------------------------------------------------

    function normalizeName(name) {
        return String(name == null ? '' : name).replace(/[\s_（）()]/g, '');
    }

    /** 依 key 長度由長到短建立索引，避免短名誤匹配長名（舊版 first-match 會選錯基金）。 */
    function buildFundIndex(fundDetailsMap) {
        return Object.keys(fundDetailsMap || {})
            .map((key) => ({ key, normalized: normalizeName(key), info: fundDetailsMap[key] }))
            .sort((a, b) => b.normalized.length - a.normalized.length);
    }

    function findFundDetails(index, name) {
        const clean = normalizeName(name);
        if (!clean) return null;
        for (const entry of index) {
            if (!entry.normalized) continue;
            if (clean.includes(entry.normalized)) return entry.info;
        }
        return null;
    }

    return {
        toNumber, toNumberOrZero, isNumericCell, normalizeNumberString,
        parseRef, detectRangeInSheet, voteBestRange, SPARSE_COL_THRESHOLD, DEFAULT_SCAN_ROWS,
        escapeHtml, toCsv, safeFileName,
        normalizeName, buildFundIndex, findFundDetails,
    };
});
