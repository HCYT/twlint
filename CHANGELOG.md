# Changelog

All notable changes to TWLint will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-03-30

### Changed
- 重新調整用語規則策略，從「盡量全抓」改成優先降低誤判與不自然建議
- `mainland-terms` 停用單一字匹配，避免 `包`、`流`、`域`、`類` 等高噪音命中
- 移除多個高爭議或語境依賴過強的詞條，例如 `解析 -> 剖析`、`客戶端 -> 用戶端`、`本地 -> 本機`、`支持 -> 支援`、`渲染 -> 算繪`
- 移除部分 UI/文件型噪音詞條與中間態建議，例如 `文檔 -> 文件`、`收藏 -> 我的最愛`、`消息 -> 訊息`、`生成 -> 產生`
- `simplified-chars` 改為忽略非必要的單字異體差異，目前包含 `了 -> 瞭`、`布 -> 佈`
- CLI 現在會跳過目錄輸入，不再把目錄當成檔案報 `file-read-error`

### 🐛 Fixed
- 取消 `mainland-terms` 的單一字匹配，降低 `包`、`流`、`域`、`類` 等高誤判噪音
- 保留 `simplified-chars` 的單一簡體字檢查，維持字形層級的高置信檢測
- 移除只為單一字誤判補洞的 fixed-term 詞庫項目，保留仍需要的非單字保護詞
- 修正 CLI 版本讀取在 ESLint 下的 `URL` 未定義問題

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
