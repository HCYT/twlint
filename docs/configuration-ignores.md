# TWLint 忽略模式配置

## 系統鐵律（SYSTEM_IGNORES）

**"有些東西就是不該被碰。配置檔案就是其中之一。"**

TWLint 有一套**不可覆寫**的系統級忽略規則，確保以下檔案永遠不會被檢查：

### 配置檔案
- `.gitignore`, `.dockerignore`, `.npmignore`
- `.eslintignore`, `.prettierignore`
- 任何 `.*ignore` 檔案

### 環境變數和敏感資訊
- `.env`, `.env.*`, `.envrc`

### 版本控制系統
- `.git/`, `.svn/`, `.hg/`

### 第三方套件
- `node_modules/`, `vendor/`

### 建構輸出
- `dist/`, `build/`, `out/`
- `.next/`, `.nuxt/`

### 編輯器配置
- `.vscode/`, `.idea/`, `.vs/`

### 日誌和臨時檔案
- `*.log`, `*.tmp`, `*.temp`
- `logs/`

### 系統檔案
- `.DS_Store`, `Thumbs.db`, `desktop.ini`

---

## 使用者自訂忽略

在系統鐵律之外，你可以透過配置檔案自訂專案特定的忽略規則。

### Global Ignores（全域忽略）

只有 `ignores` 屬性的配置區塊會被視為全域忽略：

```javascript
// twlint.config.js
export default [
  // 全域忽略 - 套用到所有檔案
  {
    ignores: [
      "**/test-*.md",      // 測試檔案
      "**/draft-*.md",     // 草稿檔案
      "**/legacy/**"       // 舊版程式碼
    ]
  }
]
```

### File-Level Ignores（檔案級別忽略）

在特定配置區塊內的 `ignores` 只對該區塊生效：

```javascript
export default [
  {
    files: ["**/*.md"],
    ignores: ["**/README.md"],  // 只有 .md 檔案會檢查這個規則
    rules: {
      "simplified-chars": "error"
    }
  }
]
```

### 完整範例

```javascript
// twlint.config.js
export default [
  // 全域忽略
  {
    ignores: [
      "**/test-*.md",
      "**/draft-*.md"
    ]
  },

  // 文件檔案
  {
    files: ["**/*.md", "**/*.txt"],
    ignores: ["**/README.md"],
    domains: ["software-development"],
    rules: {
      "simplified-chars": "error",
      "mainland-terms": "warning"
    }
  },

  // 程式碼檔案
  {
    files: ["src/**/*.{js,ts}"],
    domains: ["software-development"],
    rules: {
      "simplified-chars": "error",
      "mainland-terms": "warning"
    }
  },

  // 測試檔案 - 放寬規則
  {
    files: ["tests/**/*.{js,ts,md}"],
    rules: {
      "mainland-terms": "off"
    }
  }
]
```

---

## 忽略優先順序

TWLint 按以下順序檢查忽略規則：

1. **系統鐵律（SYSTEM_IGNORES）** - 最高優先，絕對不可覆寫
2. **Global Ignores** - 配置檔案中的全域忽略
3. **File-Level Ignores** - 特定配置區塊的忽略規則

### 範例：優先順序運作方式

```javascript
export default [
  {
    ignores: ["**/temp/**"]  // 全域忽略
  },
  {
    files: ["**/*.md"],
    ignores: ["**/draft.md"],  // 檔案級別忽略
    rules: { "simplified-chars": "error" }
  }
]
```

檔案檢查流程：
- `.env` → ❌ 系統鐵律阻擋
- `temp/file.md` → ❌ 全域 ignores 阻擋
- `draft.md` → ❌ 檔案級別 ignores 阻擋
- `guide.md` → ✅ 通過，執行檢查

---

## 否定模式（Negation Patterns）

使用 `!` 前綴來明確排除某些檔案：

```javascript
export default [
  {
    ignores: [
      "*.test.js",           // 忽略所有測試檔案
      "!important.test.js"   // 但保留這個重要的測試
    ]
  }
]
```

**注意**：否定模式無法覆寫系統鐵律。

---

## 與 .gitignore 的關係

TWLint 會自動讀取專案根目錄的 `.gitignore` 檔案，並在 glob 擴展時使用這些模式進行初步過濾。

系統鐵律的設計確保：
- 即使 `.gitignore` 未排除某些敏感檔案，TWLint 也會自動保護它們
- 使用者無需擔心意外檢查到配置檔案或環境變數

---

## 最佳實踐

1. **依賴系統鐵律** - 不需要重複設定 `node_modules/`, `.env` 等常見忽略
2. **只設定專案特定規則** - 使用 `ignores` 處理專案特有的檔案模式
3. **使用全域 + 檔案級別組合** - 清楚區分不同範圍的忽略規則
4. **測試優先** - 對測試檔案使用更寬鬆的規則，而非完全忽略

### ❌ 不推薦
```javascript
{
  ignores: [
    "node_modules/**",  // 已被系統鐵律處理
    ".env",             // 已被系統鐵律處理
    "dist/**"           // 已被系統鐵律處理
  ]
}
```

### ✅ 推薦
```javascript
{
  ignores: [
    "**/test-*.md",     // 專案特定模式
    "**/draft-*.md",    // 專案特定模式
    "**/legacy/**"      // 專案特定目錄
  ]
}
```
