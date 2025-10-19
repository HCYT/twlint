# TWLint

**關於 TWLint **

目前各大 LLM 訓練語料裡面繁體中文資料的比例非常的少，透過 LLM 產生的各種內容會混雜不同版本的中文，TWLint 目的在幫助開發者統一專案中文件中文字，確保使用台灣繁體中文和用語。

## ✨ 核心特色

### 統一中文用法
- **簡體字清除**：自動檢測並轉換所有簡體字為繁體字
- **大陸用語替換**：識別並建議台灣本土用語替代方案
- **技術詞彙本土化**：軟件→軟體、網絡→網路、用戶→使用者

### 檢索引擎
- **語境偵測**：根據上下文精確識別同形異義詞
- **領域專門詞庫**：1,062+ 詞目涵蓋 AI、軟體開發、商業金融等
- **程式碼檢查**：支援註解、字串、UI 文字等程式碼中的中文內容

### 🛠️ 開發者友善
- **ESLint 風格配置**：支援 `ignores`、`files`、`rules` 彈性配置
- **系統鐵律保護**：自動忽略 `.env`、`.gitignore` 等敏感檔案
- **遵循 .gitignore**：智慧跳過不需要的檔案和目錄
- **多種輸出格式**：stylish、json 格式滿足不同需求
- **npm script 整合**：像使用 ESLint 一樣簡單

## 🚀 快速開始

### 全域安裝
```bash
npm install -g @termdock/twlint
```

### 基本使用
```bash
# 檢查文件（ESLint 風格：預設只檢查不修復）
twlint check README.md
twlint check "docs/**/*.md"

# 自動修復（需要明確指定 --fix）
twlint check README.md --fix

# 檢查程式碼中的中文（註解、字串等）
twlint check "src/**/*.{js,ts,jsx,tsx,vue}"

# 初始化專案配置
twlint init
```

### 整合到專案（推薦）
```bash
# 1. 初始化配置檔案
twlint init

# 2. 編輯 twlint.config.js 自訂規則和忽略模式
#    支援 global ignores 和 file-level ignores
#    詳見「配置」章節

# 3. 加入 package.json scripts
{
  "scripts": {
    "twlint": "twlint check **/*.md **/*.txt",
    "twlint:fix": "twlint check **/*.md **/*.txt --fix",
    "twlint:code": "twlint check 'src/**/*.{js,ts,jsx,tsx,vue}'",
    "twlint:all": "twlint check **/*.md **/*.txt 'src/**/*.{js,ts,jsx,tsx,vue}'"
  }
}

# 4. 簡易的使用方式
npm run twlint      # 檢查文件
npm run twlint:fix  # 檢查並修復文件
npm run twlint:all  # 檢查所有檔案
```

## Demo

###  文件檢查範例
假設有以下包含大陸用語的檔案：
```markdown
# 软件开发项目
这个软件的质量很好，我们使用了先进的算法。
```

**第一步：檢查問題（ESLint 風格：預設只檢查）**
```bash
$ twlint check example.md

example.md
  1:3   ✖ error    簡體字 '软' 建議使用繁體字 '軟'          simplified-chars
  1:6   ✖ error    簡體字 '开' 建議使用繁體字 '開'          simplified-chars
  1:8   ✖ error    簡體字 '项' 建議使用繁體字 '項'          simplified-chars
  2:1   ✖ error    簡體字 '这' 建議使用繁體字 '這'          simplified-chars
  2:2   ✖ error    簡體字 '个' 建議使用繁體字 '個'          simplified-chars
  1:3   ⚠ warning  大陸用語 '軟件' 建議使用臺灣用語 '軟體'   mainland-terms
  1:8   ⚠ warning  大陸用語 '項目' 建議使用臺灣用語 '專案'   mainland-terms
  2:7   ⚠ warning  大陸用語 '質量' 建議使用臺灣用語 '品質'   mainland-terms
  2:18  ⚠ warning  大陸用語 '算法' 建議使用臺灣用語 '演算法' mainland-terms

✖ 12 problems (8 errors, 4 warnings)

  12 problems potentially fixable with the `--fix` option.
```

**第二步：自動修復（明確使用 --fix）**
```bash
$ twlint check example.md --fix

🎉 Fixed 1 file(s)

--- Remaining issues after fix ---
✓ No problems found!
```

**修復結果：完全台灣本土化**
```markdown
# 軟體開發專案
這個軟體的品質很好，我們使用了先進的演算法。
```

### 💻 程式碼檢查範例
對於程式碼中的註解和字串：
```javascript
/**
 * 这个软件用于处理用户数据
 */
function processData(data) {
  console.log("网络连接失败");
  throw new Error("文件读取失败");
}
```

```bash
$ twlint check src/utils.js --fix

# 自動修復為台灣用語
/**
 * 這個軟體用於處理使用者資料
 */
function processData(data) {
  console.log("網路連線失敗");
  throw new Error("檔案讀取失敗");
}
```

## 配置

### 專案配置檔案

建立 `twlint.config.js`：

```javascript
export default [
  // Global ignores - 全域忽略模式
  {
    ignores: [
      "**/test-*.md",      // 測試檔案
      "**/draft-*.md",     // 草稿檔案
      "**/legacy/**"       // 舊版程式碼
    ]
  },

  {
    // 檢查的檔案類型
    files: ["**/*.md", "**/*.txt"],

    // 使用的領域詞庫（新架構）
    domains: ["software-development", "user-interface"],

    // 或使用舊的詞庫配置（向後相容）
    // dictionaries: ["core", "academic"],

    // 規則配置
    rules: {
      "simplified-chars": "error",      // 簡體字檢測（自動修復）
      "mainland-terms": "warning"       // 大陸用語檢測（提供建議）
    }
  },

  {
    // 程式碼檔案
    files: ["src/**/*.{js,ts,jsx,tsx,vue}"],
    domains: ["software-development"],
    rules: {
      "simplified-chars": "error",
      "mainland-terms": "warning"
    }
  }
]
```

### 自訂忽略規則

TWLint 提供三種方式設定忽略規則：

#### 1. `.twlintignore` 檔案（推薦）

類似 `.eslintignore`，在專案根目錄建立：

```
# .twlintignore

# 測試文件
test-*.md
tests/

# 草稿文件
draft-*.md
temp/
```

#### 2. 配置檔案 Global Ignores

```javascript
export default [
  {
    ignores: [
      "**/test-*.md",
      "**/draft-*.md"
    ]
  }
]
```

#### 3. File-Level Ignores

```javascript
export default [
  {
    files: ["**/*.md"],
    ignores: ["**/README.md"],  // 排除所有 README.md
    rules: {
      "simplified-chars": "error"
    }
  }
]
```

**忽略優先順序**

1. **系統鐵律** - 最高優先（不可覆寫）
   - 配置檔案：`.gitignore`, `.dockerignore`, `.env*`, `.*ignore`
   - 版本控制：`.git/`, `.svn/`, `node_modules/`
   - 建構輸出：`dist/`, `build/`, `.next/`
   - 日誌檔案：`*.log`, `*.tmp`

2. **`.twlintignore` 檔案** - TWLint 專用忽略規則
3. **Global Ignores** - 配置檔案中的全域忽略
4. **File-Level Ignores** - 特定配置區塊的忽略規則

> 📖 完整說明請參考 [docs/configuration-ignores.md](docs/configuration-ignores.md)

### CLI 選項

```bash
twlint check <files...> [options]

Options:
  --fix                自動修復可修復的問題（僅安全修復）
  --format <type>      輸出格式 (stylish, json)
  --domains <names...> 指定使用的領域詞庫（推薦）
  --dict <names...>    指定使用的詞庫（向後相容）
  --config <path>      配置檔案路徑
  --verbose           顯示詳細輸出
  --deep              深度模式（載入所有詞庫）
```

## 詞庫架構

### 領域專門詞庫（新架構）

TWLint 採用領域導向的詞庫架構，提供更精確的用語檢測：

| 領域 | 描述 | 詞目數量 |
|------|------|----------|
| core | 核心詞庫（必載） | 150 |
| software-development | 軟體開發 | 139 |
| user-interface | 使用者介面 | 119 |
| network-cloud | 網路雲端 | 113 |
| social-media | 社群媒體 | 106 |
| operating-system | 作業系統 | 101 |
| hardware-3c | 硬體3C | 91 |
| business-finance | 商業金融 | 123 |
| ai-emerging-tech | AI新興技術 | 108 |

### 配置範例

**領域專門配置**（推薦）：
```bash
# 軟體開發專案
twlint check src/ --domains software-development user-interface

# 商業文件
twlint check docs/ --domains business-finance

# AI 技術文檔
twlint check papers/ --domains ai-emerging-tech network-cloud
```

**深度掃描**（載入所有詞庫）：
```bash
twlint check README.md --deep
```

### 傳統詞庫（向後相容）

仍支援舊的詞庫配置方式：
- **core**：核心技術用語
- **academic**：學術用語
- **extended**：擴充功能用語集

```bash
twlint check file.md --dict core academic
```

## 開發

### 環境需求
- Node.js 18+
- TypeScript 5.0+

### 本機開發
```bash
git clone https://github.com/HCYT/twlint.git
cd twlint
npm install
npm run build
npm run test
```

### 建構詞庫
```bash
npm run dict:build
npm run dict:validate
```

## 規則說明

### simplified-chars
檢測簡體字並自動轉換為繁體字。
- **嚴重度**：error
- **可修復**：是（完全自動）

### mainland-terms
檢測大陸特有用語並建議臺灣慣用詞彙。
- **嚴重度**：warning（安全修復）/ info（需人工判斷）
- **可修復**：智慧分級修復

## 進階功能

### 語境感知檢測

TWLint 支援根據上下文精確檢測同形異義詞：

```javascript
// 範例：「質量」的語境檢測
{
  taiwan: "品質",        // 商業語境下的建議
  china_simplified: "质量",
  match_type: "context_sensitive",
  context: {
    before: ["產品", "服務", "商品"],
    after: ["控制", "管理", "標準"],
    exclude: ["物理"]     // 排除物理學語境
  }
}
```

### 自動修復分級

- **安全修復**（`autofix_safe: true`）：確定無誤的用詞替換
  - 例：「軟件」→「軟體」、「網絡」→「網路」
  - 自動執行 `--fix` 時會修復

- **建議修復**（`autofix_safe: false`）：需人工確認的替換
  - 例：語境敏感詞、專業術語
  - 僅提供建議，不會自動修復

## 授權

Apache License 2.0

詳見 [LICENSE](LICENSE) 檔案。

**讓我們一起維護臺灣繁體中文的純正性！**