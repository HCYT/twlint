# Changelog

All notable changes to TWLint will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-10-19

### ✨ Added

#### ESLint 風格設定系統
- **`.twlintignore` 檔案支援** - 類別似 `.eslintignore`，簡單直覺的忽略檔案方式
- **檔案級別設定** - 支援針對不同檔案型別型設定不同規則和詞庫
- **系統鐵律保護** - 28+ 個系統級忽略規則，自動保護敏感檔案（`.env`, `.gitignore`, `node_modules` 等）
- **ConfigMatcher 類別別** - 完整的設定匹配和規則合併邏輯

#### 設定彈性
- 支援設定陣列（ESLint flat config 風格）
- `global ignores` - 全網域忽略模式
- `file-level ignores` - 特定檔案型別型的忽略規則
- 否定模式（`!pattern`）支援
- 規則優先級：系統鐵律 > .twlintignore > global ignores > file-level ignores

#### 詞庫系統改進
- 檔案級別 `domains` 設定支援
- 永遠載入 `core` 詞庫 + 檔案特定的領網域詞庫
- 修正詞庫載入邏輯，確保基礎術語正常檢測

### 🐛 Fixed
- 修正設定陣列被錯誤合併的問題
- 修正 `getRulesForFile` 和 `getDomainsForFile` 從未被呼叫的問題
- 修正詞庫載入不完整導致部分術語無法檢測的問題
- 修正測試檔案名稱與設定 ignore 模式衝突的問題

### 📝 Documentation
- 新增完整的 `.twlintignore` 使用說明
- 更新 README 開頭段落，更有情緒共鳴
- 新增 `docs/configuration-ignores.md` 完整設定文件
- 新增 `docs/CHANGELOG-ignores.md` 功能實作細節

### 🧪 Testing
- 19 個 ConfigMatcher 單元測試
- 所有 82 個測試通過

---

## [1.0.3] - 2025-10-19

### 🐛 Fixed
- 修正假陽性過濾與詞庫資料結構
- 更新詞庫建構時間戳

---

## [1.0.2] - Previous Release

### 🐛 Fixed
- 修正 "JavaScript" 拼寫
- 移除領網域詞庫中的重複和常用術語

---

## [1.0.0] - Initial Release

### ✨ Features
- 簡體字自動檢測與轉換
- 大陸用語檢測與建議
- 領網域專門詞庫（AI、軟體開發、商業金融等）
- CLI 命令列工具
- 自動修復功能
- 多種輸出格式（stylish、json）
