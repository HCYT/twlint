# TWLint 詞庫擴充指南

## 📚 詞庫架構設計

### 目錄結構
```
dictionaries-csv/
├── core/              # 核心詞庫（必備）
│   ├── tech-basic.csv
│   └── tech-comprehensive.csv
├── tech/              # 技術領域
│   ├── programming.csv     # 程式設計
│   ├── web-dev.csv        # 網頁開發
│   ├── mobile-dev.csv     # 行動開發
│   ├── database.csv       # 資料庫
│   └── devops.csv         # DevOps
├── business/          # 商業領域
│   ├── marketing.csv      # 行銷
│   ├── finance.csv        # 金融
│   ├── management.csv     # 管理
│   └── ecommerce.csv      # 電商
├── academic/          # 學術領域
│   ├── science.csv        # 科學
│   ├── medicine.csv       # 醫學
│   ├── law.csv           # 法律
│   └── education.csv      # 教育
├── media/             # 媒體領域
│   ├── journalism.csv     # 新聞
│   ├── entertainment.csv  # 娛樂
│   └── social-media.csv   # 社群媒體
└── lifestyle/         # 生活領域
    ├── food.csv          # 美食
    ├── travel.csv        # 旅遊
    ├── fashion.csv       # 時尚
    └── sports.csv        # 運動
```

## 📝 詞庫格式標準

### CSV 欄位定義
```csv
id,taiwan,china_simplified,china_traditional,english,confidence,category,reason,domain
```

### 欄位說明
- **id**: 唯一識別碼 (domain-number 格式，如 tech-001)
- **taiwan**: 台灣慣用詞彙
- **china_simplified**: 大陸簡體用詞
- **china_traditional**: 大陸繁體用詞
- **english**: 英文對應詞（可選）
- **confidence**: 信心度 (0.0-1.0)
- **category**: 分類標籤
- **reason**: 建議理由
- **domain**: 領域標識

### 範例：程式設計詞庫
```csv
id,taiwan,china_simplified,china_traditional,english,confidence,category,reason,domain
prog-001,程式,程序,程序,program,0.95,mainland-term,台灣技術標準用語,programming
prog-002,軟體,软件,軟件,software,0.95,mainland-term,台灣技術標準用語,programming
prog-003,資料庫,数据库,數據庫,database,0.90,mainland-term,台灣慣用語,programming
prog-004,演算法,算法,算法,algorithm,0.95,mainland-term,台灣學術標準,programming
prog-005,變數,变量,變量,variable,0.85,mainland-term,台灣程式術語,programming
```

## 🔧 詞庫管理工具

### 新增領域詞庫
```bash
# 建立新領域目錄
mkdir dictionaries-csv/新領域名

# 建立詞庫檔案
touch dictionaries-csv/新領域名/sub-category.csv

# 重新建構詞庫
npm run dict:build
```

### 詞庫驗證
```bash
# 驗證 CSV 格式
npm run dict:validate

# 檢查重複項目
npm run dict:check-duplicates

# 測試新詞庫
npm run dict:test 新領域名
```

## 📊 詞庫分級系統

### 1. 核心詞庫 (Core)
- **必備載入**：預設啟用
- **內容**：最基本的簡繁轉換和常見大陸用語
- **目標用戶**：所有使用者

### 2. 專業詞庫 (Professional)
- **選擇性載入**：`--dict` 參數指定
- **內容**：特定領域專業術語
- **目標用戶**：該領域專業人士

### 3. 擴展詞庫 (Extended)
- **深度模式**：`--deep` 參數啟用
- **內容**：全面的詞彙對照
- **目標用戶**：需要全面檢查的場景

## 🚀 使用方式

### 基本使用
```bash
# 使用核心詞庫
twlint check *.md

# 指定技術詞庫
twlint check *.md --dict core tech

# 使用商業詞庫
twlint check *.md --dict core business

# 深度模式（載入所有詞庫）
twlint check *.md --deep
```

### 配置檔案
```javascript
// twlint.config.js
export default [
  {
    files: ["**/*.md"],
    dictionaries: ["core", "tech", "business"],
    rules: {
      "simplified-chars": "error",
      "mainland-terms": "warning"
    }
  },
  {
    files: ["docs/api/**/*.md"],
    dictionaries: ["core", "tech/programming", "tech/database"],
    rules: {
      "simplified-chars": "error",
      "mainland-terms": "error"  // API 文件更嚴格
    }
  }
]
```

## 📈 詞庫貢獻流程

### 1. 準備階段
- Fork TWLint 專案
- 在 `dictionaries-csv/` 下建立或編輯對應領域 CSV
- 遵循命名規範和格式標準

### 2. 內容標準
- **準確性**：確保台灣用語的正確性
- **完整性**：提供完整的欄位資訊
- **一致性**：遵循既有的分類和格式

### 3. 測試驗證
```bash
# 建構詞庫
npm run dict:build

# 驗證格式
npm run dict:validate

# 測試實際效果
npm run test
```

### 4. 提交 PR
- 標題：`feat(dict): 新增 [領域名] 詞庫`
- 內容包含：
  - 新增詞彙數量
  - 覆蓋領域說明
  - 測試結果截圖

## 🎯 詞庫優先順序

### Phase 1: 技術基礎 ✅
- ✅ 核心技術用語
- 🔄 程式設計進階詞彙
- 📋 網頁開發用語
- 📋 資料庫專業術語

### Phase 2: 商業應用
- 📋 數位行銷用語
- 📋 電商平台術語
- 📋 金融科技詞彙
- 📋 專案管理用語

### Phase 3: 學術專業
- 📋 電腦科學論文用語
- 📋 工程技術標準
- 📋 研究方法術語

### Phase 4: 日常應用
- 📋 社群媒體用語
- 📋 生活消費詞彙
- 📋 新聞媒體用語

---

**歡迎社群貢獻各領域詞庫，讓 TWLint 更加完善！** 🚀