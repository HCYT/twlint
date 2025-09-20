# TWLint

> 檢測簡體中文用語並建議臺灣繁體替代方案的 CLI 工具

TWLint 幫助臺灣開發者和內容創作者檢測並修正意外使用的大陸用語，確保你使用了正確的用語，提升文件品質。

## 特色功能

- **自動檢測簡體字**：使用 OpenCC 引擎進行簡繁轉換
- **大陸用語檢測**：識別大陸特有用語並提供臺灣替代建議
- **自動修復**：支援 `--fix` 參數自動修正可修復的問題
- **多種輸出格式**：支援 stylish、json 等格式
- **靈活配置**：支援專案級配置檔案

## 安裝

```bash
npm install -g @termdock/twlint
```

## 快速開始

### 基本檢查
```bash
twlint check README.md
twlint check "src/**/*.md"
```

### 自動修復
```bash
twlint check README.md --fix
```

### 初始化配置檔案
```bash
twlint init
```

## 使用範例

假設有以下檔案內容（包含大陸用語）：
```markdown
# 项目介绍
这个软件的质量很好，我们使用了先进的算法。
```

執行檢查：
```bash
$ twlint check example.md

example.md
  1:3   error    簡體字 '项' 建議使用繁體字 '項'          simplified-chars
  1:4   error    簡體字 '目' 建議使用繁體字 '目'          simplified-chars
  1:5   error    簡體字 '介' 建議使用繁體字 '介'          simplified-chars
  1:6   error    簡體字 '绍' 建議使用繁體字 '紹'          simplified-chars
  2:1   error    簡體字 '这' 建議使用繁體字 '這'          simplified-chars
  2:2   error    簡體字 '个' 建議使用繁體字 '個'          simplified-chars
  2:3   error    簡體字 '软' 建議使用繁體字 '軟'          simplified-chars
  2:4   error    簡體字 '件' 建議使用繁體字 '件'          simplified-chars
  1:3   warning  大陸用語 '項目' 建議使用臺灣用語 '專案'   mainland-terms
  2:3   warning  大陸用語 '軟件' 建議使用臺灣用語 '軟體'   mainland-terms
  2:7   warning  大陸用語 '質量' 建議使用臺灣用語 '品質'   mainland-terms
  2:18  warning  大陸用語 '算法' 建議使用臺灣用語 '演算法' mainland-terms

✖ 12 problems (8 errors, 4 warnings)
  12 problems potentially fixable with the `--fix` option.
```

自動修復後：
```bash
$ twlint check example.md --fix

✓ Fixed: example.md

# 專案介紹
這個軟體的品質很好，我們使用了先進的演算法。
```

## 配置

### 專案配置檔案

建立 `twlint.config.js`：

```javascript
export default [
  {
    // 檢查的檔案類型
    files: ["**/*.md", "**/*.txt"],

    // 使用的詞庫
    dictionaries: ["core"],

    // 規則配置
    rules: {
      "simplified-chars": "error",      // 簡體字檢測（自動修復）
      "mainland-terms": "warning"       // 大陸用語檢測（提供建議）
    }
  }
]
```

### CLI 選項

```bash
twlint check <files...> [options]

Options:
  --fix                自動修復可修復的問題
  --format <type>      輸出格式 (stylish, json)
  --dict <names...>    指定使用的詞庫
  --config <path>      配置檔案路徑
  --verbose           顯示詳細輸出
  --deep              深度模式（載入所有詞庫）
```

## 詞庫

TWLint 包含以下內建詞庫：

- **core**：核心技術用語（預設載入）
- **academic**：學術用語
- **extended**：擴充功能用語集

使用特定詞庫：
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
- **可修復**：是

### mainland-terms
檢測大陸特有用語並建議臺灣慣用詞彙。
- **嚴重度**：warning
- **可修復**：部分

## 授權

Apache License 2.0

詳見 [LICENSE](LICENSE) 檔案。

**讓我們一起維護臺灣繁體中文的純正性！**