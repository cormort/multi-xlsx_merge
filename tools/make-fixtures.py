#!/usr/bin/env python3
"""產生端對端測試用的 Excel 檔案（tools/make-fixtures.py）。

刻意包含真實公務報表常見的格式地雷：
  1. 表格下方有純文字附註列（範圍偵測要停在第 8 列）
  2. 右側有零星雜訊欄（只有一列有值；要被收斂掉）
  3. 數字以文字呈現、含千分位「1,234,567」
  4. 負數寫成括號「(123,456)」——舊版會算成 0
  5. 三個檔案只有 A1 的基金名稱不同（用來測基金資料庫比對）

輸出：fixtures/*.xlsx 與 stdout 的期望總和（JSON），供端對端測試比對。
"""
import json
import os
from openpyxl import Workbook

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'fixtures')

FILES = [
    ('fixture-A.xlsx', '國立大學校院校務基金', [
        ('業務收入', '1,234,567', '(123,456)', '本年度'),
        ('業務成本', '987,654', '111,111', ''),
        ('業務賸餘', '246,913', '(12,345)', ''),
        ('業務外收入', '5,000', '6,000', '利息'),
        ('本期賸餘', '251,913', '(6,345)', ''),
    ]),
    ('fixture-B.xlsx', '交通作業基金', [
        ('業務收入', '2,000,000', '2,100,000', '本年度'),
        ('業務成本', '1,500,000', '(50,000)', ''),
        ('業務賸餘', '500,000', '2,050,000', ''),
        ('業務外收入', '1,000', '2,000', '利息'),
        ('本期賸餘', '501,000', '2,052,000', ''),
    ]),
    ('fixture-C.xlsx', '農業作業基金', [
        ('業務收入', '300', '400', '本年度'),
        ('業務成本', '100', '(20)', ''),
        ('業務賸餘', '200', '420', ''),
        ('業務外收入', '0', '0', '利息'),
        ('本期賸餘', '200', '420', ''),
    ]),
]

NOTE_ROW = '註：本表數字係自結數，未經審計。'   # 純文字附註：範圍偵測要停在這之前


def num(s):
    """把 fixture 裡的字串金額轉成數字（括號 = 負數），用來算期望值。"""
    s = s.replace(',', '')
    if s.startswith('(') and s.endswith(')'):
        return -int(s[1:-1])
    return int(s)


def main():
    os.makedirs(OUT, exist_ok=True)
    expected = {'columns': ['112年度決算數', '113年度預算數'], 'sums': {}, 'total': {}}
    per_col = {'112年度決算數': 0, '113年度預算數': 0}
    per_item = {}

    for name, fund_line, rows in FILES:
        wb = Workbook()
        ws = wb.active
        ws.title = '報表'
        ws['A1'] = fund_line          # 基金名稱放 A1：對應版型的 sourceCell
        ws['A2'] = '中央政府各機關作業基金'
        ws['D2'] = '單位：新臺幣千元'
        ws['A3'], ws['B3'], ws['C3'], ws['D3'] = '項目', '112年度決算數', '113年度預算數', '說明'
        for i, (item, a, b, note) in enumerate(rows):
            r = 4 + i
            ws.cell(row=r, column=1, value=item)
            ws.cell(row=r, column=2, value=a)          # 文字型數字（含千分位／括號）
            ws.cell(row=r, column=3, value=b)
            ws.cell(row=r, column=4, value=note)
            # 第 7 列右側多一欄手算值（雜訊欄：20 列中只有 1 列有值）
            if i == 3:
                ws.cell(row=r, column=6, value=999)
            if item not in per_item:
                per_item[item] = {'112年度決算數': 0, '113年度預算數': 0}
            per_item[item]['112年度決算數'] += num(a)
            per_item[item]['113年度預算數'] += num(b)
            per_col['112年度決算數'] += num(a)
            per_col['113年度預算數'] += num(b)
        ws.cell(row=4 + len(rows) + 1, column=1, value=NOTE_ROW)
        wb.save(os.path.join(OUT, name))

    expected['sums'] = per_item
    expected['total'] = per_col
    expected['files'] = [f[0] for f in FILES]
    print(json.dumps(expected, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
