# TWLint CSV 格式指南（新版）

## 📋 完整欄位定義

TWLint 2.0 支援完整的 CSV 格式，包含語境感知和自動修復功能：

```csv
id,taiwan,china_simplified,china_traditional,english,confidence,category,reason,domain,match_type,context_before,context_after,context_exclude,autofix_safe
```

### 簡化版本（向後相容）
```csv
id,taiwan,china_simplified,china_traditional,english,confidence,category,reason,domain
```

### 完整欄位說明

| 欄位 | 必填 | 說明 | 範例 |
|------|------|------|------|
| `id` | ✅ | 唯一識別碼 | `software-term-1` |
| `taiwan` | ✅ | 台灣建議用語 | `軟體` |
| `china_simplified` | ✅ | 大陸簡體用語 | `软件` |
| `china_traditional` | ✅ | 大陸繁體用語 | `軟件` |
| `english` | ❌ | 英文對照 | `software` |
| `confidence` | ✅ | 信心度 (0.0-1.0) | `0.95` |
| `category` | ✅ | 分類標籤 | `mainland-term` |
| `reason` | ✅ | 建議理由 | `台灣技術標準用語` |
| `domain` | ✅ | 領域標識 | `tech` |
| `match_type` | ❌ | 匹配模式 | `exact`/`context_sensitive` |
| `context_before` | ❌ | 前置語境（逗號分隔） | `開發,設計,系統` |
| `context_after` | ❌ | 後置語境（逗號分隔） | `工程師,架構,管理` |
| `context_exclude` | ❌ | 排除語境（逗號分隔） | `硬體,物理` |
| `autofix_safe` | ❌ | 安全自動修復 | `true`/`false` |

## 🔧 轉換工具使用

### 1. 建議使用新架構

直接使用完整格式建立新詞庫：

```bash
# 建立領域範本
npm run dict:template domains software-development

# 編輯產生的 CSV 檔案
vim dictionaries-csv/domains/software-development.csv

# 建構詞庫
npm run dict:build
```

### 2. 轉換舊格式 CSV

工具會自動檢測以下欄位名稱：

#### 基本欄位對應
- **台灣用語**: `taiwan`, `tw`, `台灣`, `繁體`, `正體`, `traditional`
- **大陸用語**: `china`, `cn`, `大陸`, `簡體`, `simplified`, `mainland`
- **英文**: `english`, `en`, `eng`, `英文`
- **信心度**: `confidence`, `conf`, `信心度`, `score`
- **分類**: `category`, `type`, `分類`, `類別`
- **理由**: `reason`, `note`, `理由`, `說明`, `description`

#### 進階欄位對應
- **匹配模式**: `match_type`, `match`, `匹配類型`
- **語境資訊**: `context_*`, `語境*`, `context`
- **安全修復**: `autofix_safe`, `safe_fix`, `安全修復`

### 3. 實用範例

#### 建立新領域詞庫
```bash
# 建立自定義領域
npm run dict:template domains my-domain

# 建立傳統格式詞庫
npm run dict:template extended my-category
```

#### 轉換舊格式 CSV
```bash
# 轉換到新領域架構
npm run dict:convert your-file.csv domains

# 轉換到傳統架構（向後相容）
npm run dict:convert your-data.csv extended
```

#### 驗證和建構
```bash
# 檢查 CSV 格式
npm run dict:check dictionaries-csv/domains/software-development.csv

# 建構所有詞庫
npm run dict:build

# 驗證建構結果
npm run dict:validate
```

#### 管理和監控
```bash
# 清單所有詞庫
npm run dict:list

# 查看詞庫統計
npm run dict:stats
```

## 📝 新版格式範例

### 格式 1: 完整新版格式
```csv
id,taiwan,china_simplified,china_traditional,english,confidence,category,reason,domain,match_type,context_before,context_after,context_exclude,autofix_safe
software-basic,軟體,软件,軟件,software,0.95,mainland-term,台灣技術標準用語,tech,exact,,,，true
quality-business,品質,质量,質量,quality,0.90,mainland-term,商業品質管理,business,context_sensitive,"產品,服務","控制,管理",物理,false
quality-physics,質量,质量,質量,mass,0.95,mainland-term,物理學質量單位,physics,context_sensitive,"密度,重量","守恆,轉換",商業,false
```

### 格式 2: 簡化版本（向後相容）
```csv
id,taiwan,china_simplified,china_traditional,english,confidence,category,reason,domain
basic-software,軟體,软件,軟件,software,0.95,mainland-term,台灣技術標準用語,tech
basic-program,程式,程序,程序,program,0.95,mainland-term,台灣技術標準用語,tech
basic-network,網路,网络,網絡,network,0.90,mainland-term,台灣慣用語,tech
```

### 格式 3: 語境感知範例
```csv
id,taiwan,china_simplified,china_traditional,english,confidence,category,reason,domain,match_type,context_before,context_after,context_exclude,autofix_safe
mass-physics,質量,质量,質量,mass,0.95,mainland-term,物理學質量單位,physics,context_sensitive,"物理,密度,重量,公斤","守恆,轉換,定律,公式","品質,管理,商業",false
quality-business,品質,质量,質量,quality,0.90,mainland-term,商業品質管理,business,context_sensitive,"產品,服務,商品,客戶","控制,管理,標準,檢驗,提升","物理,密度,重量",false
```

### 格式 4: 舊版對照表（將被轉換）
```csv
台灣用語,大陸用語,英文,說明
程式,程序,program,技術術語
軟體,软件,software,技術術語
演算法,算法,algorithm,學術標準
```

## ⚙️ 智慧轉換特性

### 自動完成功能
1. **欄位映射**: 智慧識別各種欄位名稱
2. **ID 生成**: 自動產生 `domain-sequence` 格式
3. **預設值設定**:
   - `confidence`: 0.8
   - `category`: "mainland-term"
   - `reason`: "台灣慣用語"
   - `match_type`: "exact"
   - `autofix_safe`: false
4. **語境解析**: 自動識別語境相關欄位
5. **格式驗證**: 完整檢查所有欄位和資料類型
6. **重複檢測**: 防止建立重複條目

### 語境增強特性
- **自動語境推理**: 根據異同語境自動分割同形異義詞
- **安全等級評估**: 智慧判斷是否適合自動修復
- **信心度調整**: 根據語境複雜度調整信心度

## 🎯 新版最佳實踐

### 詞庫分類原則
1. **領域專一性**: 一個詞目只屬於一個領域
2. **語境明確性**: 同形異義詞必須設定語境規則
3. **安全等級**: 不確定的替換一律設為 `autofix_safe: false`

### 信心度分級標準
- **0.95-1.0**: 絕對標準用語（如：軟件→軟體）
- **0.85-0.94**: 高度確定的慣用語（如：網絡→網路）
- **0.70-0.84**: 中等信心，需考慮語境（如：質量→品質/質量）
- **0.50-0.69**: 低信心，僅提供建議

### 匹配模式選擇
- **exact**: 標準替換，99% 的情況
- **word_boundary**: 避免部分匹配問題
- **context_sensitive**: 同形異義詞必用

### 自動修復原則
- **true**: 僅用於 100% 確定的替換
- **false**: 需人工判斷的情況

### 語境設定技巧
1. **正向語境**: `context_before` 和 `context_after` 使用 OR 邏輯
2. **排除語境**: `context_exclude` 使用 AND 邏輯
3. **簡繁並用**: 考慮簡體和繁體字形差異

## 🚀 快速上手指南

### 方案 A: 建立新領域詞庫（推薦）
```bash
# 1. 建立領域範本
npm run dict:template domains my-domain

# 2. 編輯產生的 CSV
vim dictionaries-csv/domains/my-domain.csv

# 3. 新增完整詞目（包含語境資訊）
# 參考上方格式範例

# 4. 建構和測試
npm run dict:build
npm run dict:validate
twlint check README.md --domains my-domain
```

### 方案 B: 轉換現有資料
```bash
# 1. 轉換舊格式 CSV
npm run dict:convert existing-data.csv domains

# 2. 手動完善語境資訊
vim dictionaries-csv/domains/existing-data.csv

# 3. 新增進階欄位（match_type, context_*, autofix_safe）

# 4. 驗證和部署
npm run dict:check dictionaries-csv/domains/existing-data.csv
npm run dict:build
```

### 方案 C: 向後相容模式
```bash
# 使用傳統格式（適合輕量級使用）
npm run dict:template extended my-category
vim dictionaries-csv/extended/my-category.csv
npm run dict:build
twlint check README.md --dict core my-category
```

---

**讓詞庫管理變得簡單！** 🎉