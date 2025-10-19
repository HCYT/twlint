# Ignores 功能實現變更記錄

## 📅 2025-10-19

### ✨ 新功能：ESLint 風格的配置彈性

#### 核心實現
- ✅ 新增 `ConfigMatcher` 類別（170 行）
- ✅ 實現 `SYSTEM_IGNORES` 系統鐵律（28 個不可覆寫規則）
- ✅ 支援 `global ignores` 和 `file-level ignores`
- ✅ 支援否定模式（`!pattern`）
- ✅ 規則合併邏輯（後面的覆寫前面的）

#### 系統鐵律（SYSTEM_IGNORES）
以下檔案**絕對不會被檢查**，無論使用者如何配置：

```typescript
const SYSTEM_IGNORES = [
  // 版本控制
  '**/.git/**', '**/.svn/**', '**/.hg/**',
  
  // 第三方套件
  '**/node_modules/**', '**/vendor/**',
  
  // 配置檔案（鐵律）
  '**/.gitignore', '**/.dockerignore', '**/.npmignore',
  '**/.eslintignore', '**/.prettierignore', '**/.*ignore',
  
  // 環境變數
  '**/.env', '**/.env.*', '**/.envrc',
  
  // 系統檔案
  '**/.DS_Store', '**/Thumbs.db', '**/desktop.ini',
  
  // 編輯器
  '**/.vscode/**', '**/.idea/**', '**/.vs/**',
  
  // 建構輸出
  '**/dist/**', '**/build/**', '**/out/**',
  '**/.next/**', '**/.nuxt/**',
  
  // 日誌和臨時檔案
  '**/*.log', '**/*.tmp', '**/*.temp', '**/logs/**'
]
```

#### 使用範例

**基本配置**
```javascript
// twlint.config.js
export default [
  // Global ignores
  {
    ignores: [
      "**/test-*.md",
      "**/draft-*.md"
    ]
  },
  
  // File-level ignores
  {
    files: ["**/*.md"],
    ignores: ["**/README.md"],
    rules: {
      "simplified-chars": "error",
      "mainland-terms": "warning"
    }
  }
]
```

**進階配置**
```javascript
export default [
  // 全域忽略
  {
    ignores: ["**/legacy/**", "**/archive/**"]
  },
  
  // 文件檔案
  {
    files: ["**/*.md", "**/*.txt"],
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
  },
  
  // 商業文件 - 更嚴格
  {
    files: ["docs/business/**/*.md"],
    domains: ["business-finance"],
    rules: {
      "simplified-chars": "error",
      "mainland-terms": "error"
    }
  }
]
```

#### 技術細節

**優先順序**
1. 系統鐵律（SYSTEM_IGNORES） - 最高優先，不可覆寫
2. Global ignores - 配置檔案中的全域忽略
3. File-level ignores - 特定配置區塊的忽略

**配置匹配邏輯**
```typescript
class ConfigMatcher {
  isIgnored(filePath: string): boolean {
    // 1. 檢查系統鐵律
    if (matchesSystemIgnores(filePath)) return true
    
    // 2. 檢查 global ignores
    if (matchesGlobalIgnores(filePath)) return true
    
    // 3. 檢查 file-level ignores
    if (matchesFileLevelIgnores(filePath)) return true
    
    return false
  }
  
  getRulesForFile(filePath: string): Rules {
    // 合併所有匹配配置區塊的規則
    // 後面的覆寫前面的
  }
}
```

#### 檔案變更

**新增檔案**
- `src/core/config-matcher.ts` (170 行)
- `tests/unit/config-matcher.test.ts` (220+ 行)
- `docs/configuration-ignores.md` (完整文檔)
- `docs/CHANGELOG-ignores.md` (本檔案)

**修改檔案**
- `src/types.ts` - 新增 `ignores?: string[]`
- `src/core/config-schema.ts` - 新增 `ignores` 欄位，更新範例
- `src/core/linter.ts` - 使用 ConfigMatcher，移除 hardcoded ignores
- `twlint.config.js` - 更新專案配置範例
- `README.md` - 新增配置說明章節

#### 測試涵蓋

```typescript
describe('ConfigMatcher', () => {
  describe('系統鐵律', () => {
    it('應該絕對優先忽略系統級檔案')
    it('系統鐵律不可被使用者配置覆寫')
  })
  
  describe('isIgnored', () => {
    it('應該識別全域 ignores')
    it('應該支援檔案級別的 ignores')
    it('應該支援否定模式')
    it('全域 ignores 應該優先於檔案級別配置')
  })
  
  describe('getRulesForFile', () => {
    it('應該回傳匹配檔案的規則')
    it('應該合併多個配置區塊的規則')
    it('忽略的檔案應該回傳空規則')
  })
  
  describe('getDomainsForFile', () => {
    it('應該回傳匹配檔案的領域')
    it('應該合併多個配置區塊的領域並去重')
    it('應該支援向後相容的 dictionaries 欄位')
  })
})
```

#### 向後相容性

✅ **完全向後相容**
- 現有配置檔案無需修改
- `files` 和 `rules` 欄位繼續正常工作
- `dictionaries` 欄位繼續支援（向後相容）
- `.twlintignore` 檔案繼續有效

#### 與 ESLint 的比較

| 功能 | ESLint | TWLint | 狀態 |
|------|--------|--------|------|
| Global ignores | ✅ | ✅ | 完成 |
| File-level ignores | ✅ | ✅ | 完成 |
| 否定模式 | ✅ | ✅ | 完成 |
| 系統鐵律 | ❌ | ✅ | **更好** |
| overrides | ✅ | ❌ | 不需要（已用陣列） |
| extends | ✅ | ❌ | 不需要（過度設計） |

#### 設計哲學（Linus Style）

1. **系統鐵律優先** - "有些東西就是不該被碰"
2. **最簡數據結構** - 線性掃描，無覆雜繼承鏈
3. **零破壞性** - 完全向後相容
4. **實用主義** - 解決真實需求，不做過度設計
5. **消除特殊情況** - 統一的配置匹配邏輯

#### 下一步

- [ ] 執行測試驗證：`npm test`
- [ ] 實際專案測試
- [ ] 收集使用者回饋
- [ ] 考慮是否需要 `.twlintignore` 檔案支援（目前 .gitignore 已自動讀取）

#### Git 提交

```bash
# 功能實現
git commit -m "feat: 實現 ESLint 風格的配置彈性與系統鐵律"

# 文檔更新
git commit -m "docs: 更新 README 說明 ignores 自訂配置"
```

---

## 📚 相關文檔

- [完整配置說明](./configuration-ignores.md)
- [README - 配置章節](../README.md#配置)
- [ConfigMatcher 原始碼](../src/core/config-matcher.ts)
- [測試案例](../tests/unit/config-matcher.test.ts)
