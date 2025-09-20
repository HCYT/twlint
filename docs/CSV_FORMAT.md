# TWLint CSV 轉換格式指南

## 📋 標準欄位定義

TWLint 使用以下標準 CSV 格式：

```csv
id,taiwan,china_simplified,china_traditional,english,confidence,category,reason,domain
```

### 欄位說明

| 欄位 | 必填 | 說明 | 範例 |
|------|------|------|------|
| `id` | ✅ | 唯一識別碼 | `tech-001` |
| `taiwan` | ✅ | 台灣慣用詞彙 | `程式` |
| `china_simplified` | ✅ | 大陸簡體用詞 | `程序` |
| `china_traditional` | ⚪ | 大陸繁體用詞 | `程序` |
| `english` | ⚪ | 英文對應詞 | `program` |
| `confidence` | ✅ | 信心度 (0.0-1.0) | `0.95` |
| `category` | ✅ | 分類標籤 | `mainland-term` |
| `reason` | ✅ | 建議理由 | `台灣技術標準用語` |
| `domain` | ✅ | 領域標識 | `tech` |

## 🔧 轉換工具使用

### 1. 自動轉換任意 CSV

工具會自動檢測以下欄位名稱：

#### 台灣用語 (taiwan)
- `taiwan`, `tw`, `台灣`, `繁體`, `正體`, `traditional`

#### 大陸用語 (china_simplified)
- `china`, `cn`, `大陸`, `簡體`, `simplified`, `mainland`

#### 英文 (english)
- `english`, `en`, `eng`, `英文`

#### 其他欄位
- 信心度: `confidence`, `conf`, `信心度`, `score`
- 分類: `category`, `type`, `分類`, `類別`
- 理由: `reason`, `note`, `理由`, `說明`, `description`

### 2. 使用範例

#### 建立範本
```bash
# 建立技術領域的程式設計範本
npm run dict:template tech programming

# 建立商業領域的行銷範本
npm run dict:template business marketing
```

#### 轉換現有 CSV
```bash
# 轉換你的 CSV 到技術領域
npm run dict:convert your-file.csv tech

# 轉換到商業領域
npm run dict:convert your-data.csv business
```

#### 驗證格式
```bash
# 檢查 CSV 格式是否正確
npm run dict:check dictionaries-csv/tech/programming.csv
```

#### 合併多個檔案
```bash
# 合併多個 CSV 到同一領域
npm run dict:merge file1.csv file2.csv file3.csv -d tech -o merged-tech.csv
```

#### 查看現有詞庫
```bash
npm run dict:list
```

## 📝 常見輸入格式範例

### 格式 1: 簡單對照表
```csv
台灣用語,大陸用語,英文
程式,程序,program
軟體,软件,software
演算法,算法,algorithm
```

### 格式 2: 詳細說明表
```csv
正體中文,簡體中文,說明,信心度
資料庫,数据库,台灣慣用語,0.9
網路,网络,台灣標準用語,0.95
滑鼠,鼠标,台灣硬體術語,0.8
```

### 格式 3: 多語言對照
```csv
Taiwan,China,Traditional,English,Note
程式設計,程序设计,程序設計,programming,技術術語
使用者,用户,用戶,user,介面術語
檔案,文件,文件,file,系統術語
```

### 格式 4: 學術論文詞彙
```csv
term_tw,term_cn,category,confidence,domain
演算法,算法,學術標準,0.95,computer-science
資料結構,数据结构,學術標準,0.90,computer-science
機器學習,机器学习,新興技術,0.85,ai
```

## ⚙️ 自動轉換邏輯

轉換工具會：

1. **自動檢測欄位**: 根據欄位名稱智慧映射
2. **生成 ID**: 自動產生 `domain-001` 格式的 ID
3. **設定預設值**:
   - `confidence`: 0.8
   - `category`: "mainland-term"
   - `reason`: "台灣慣用語"
4. **去除重複**: 合併時自動去除重複條目
5. **格式驗證**: 檢查必填欄位和資料格式

## 🎯 最佳實踐

### 準備資料時
1. **欄位命名**: 使用容易識別的欄位名稱
2. **資料清理**: 移除多餘空格和特殊字元
3. **編碼確認**: 確保 CSV 使用 UTF-8 編碼

### 設定信心度
- **0.9-1.0**: 絕對確定的標準用語 (如：程式 vs 程序)
- **0.7-0.9**: 普遍認同的慣用語 (如：軟體 vs 软件)
- **0.5-0.7**: 有爭議但傾向台灣用法
- **0.3-0.5**: 語境相關，需要判斷

### 分類標籤
- `mainland-term`: 大陸特有用語
- `simplified-char`: 簡體字轉換
- `variant`: 同義詞變體
- `technical`: 技術術語
- `academic`: 學術標準

## 🚀 快速開始

```bash
# 1. 建立你的領域範本
npm run dict:template mycompany products

# 2. 編輯生成的 CSV 檔案
# edit dictionaries-csv/mycompany/products.csv

# 3. 或轉換現有資料
npm run dict:convert my-existing-data.csv mycompany

# 4. 驗證格式
npm run dict:check dictionaries-csv/mycompany/products.csv

# 5. 重新建構詞庫
npm run dict:build

# 6. 測試使用
npx twlint check README.md --dict core mycompany
```

---

**讓詞庫管理變得簡單！** 🎉