import { describe, it, expect, beforeEach } from 'vitest'
import { TWLinter } from '../../src/core/linter.js'
import type { TWLintConfig } from '../../src/types.js'

describe('TWLinter', () => {
  let linter: TWLinter
  const defaultConfig: TWLintConfig = {
    dictionaries: ['core'],
    rules: {
      'simplified-chars': 'error',
      'mainland-terms': 'warning'
    }
  }

  beforeEach(() => {
    linter = new TWLinter(defaultConfig)
  })

  describe('lintText', () => {
    it('should detect simplified characters', async () => {
      const text = '这是一个简体字测试'
      const issues = await linter.lintText(text)

      expect(issues.length).toBeGreaterThan(0)
      expect(issues.some(issue => issue.rule === 'simplified-chars')).toBe(true)
      expect(issues.some(issue => issue.message.includes('簡體字'))).toBe(true)
    })

    it('should detect mainland terms', async () => {
      const text = '软件开发需要使用网络连接'
      const issues = await linter.lintText(text)

      expect(issues.length).toBeGreaterThan(0)
      expect(issues.some(issue => issue.rule === 'mainland-terms')).toBe(true)
      expect(issues.some(issue => issue.message.includes('大陸用語'))).toBe(true)
    })

    it('should not flag traditional Chinese text', async () => {
      const text = '軟體開發需要使用網路連接'
      const issues = await linter.lintText(text)

      // 可能還有其他問題，但不應該有簡體字問題
      expect(issues.filter(issue => issue.rule === 'simplified-chars')).toHaveLength(0)
    })

    it('should provide suggestions for fixes', async () => {
      const text = '软件'
      const issues = await linter.lintText(text)

      expect(issues.length).toBeGreaterThan(0)
      expect(issues.some(issue => issue.suggestions?.includes('軟體'))).toBe(true)
    })

    it('should not flag parse-related wording for generic 解析 text', async () => {
      const text = '這個工具可以解析 JSON 回應'
      const issues = await linter.lintText(text)

      expect(issues.find(issue =>
        issue.rule === 'mainland-terms' &&
        issue.message.includes('解析') &&
        issue.message.includes('剖析')
      )).toBeUndefined()
    })

    it.each([
      ['客戶端', '用戶端'],
      ['本地', '本機'],
      ['全局', '全域'],
      ['支持', '支援'],
      ['渲染', '算繪'],
      ['消息', '訊息'],
      ['构建', '建構'],
      ['生成', '產生'],
      ['实例', '實體'],
      ['对象', '物件'],
      ['預設', '預設集'],
      ['警告', '警示'],
      ['歷史記錄', '歷程記錄'],
      ['字體', '字型'],
      ['主頁', '首頁'],
      ['頁腳', '頁尾'],
      ['標籤頁', '分頁'],
      ['對話框', '對話方塊'],
      ['皮膚', '外觀']
    ])('should not flag high-ambiguity wording %s', async (term, replacement) => {
      const text = `文件提到 ${term} 的一般說法`
      const issues = await linter.lintText(text)

      expect(issues.find(issue =>
        issue.rule === 'mainland-terms' &&
        issue.message.includes(term) &&
        issue.message.includes(replacement)
      )).toBeUndefined()
    })

    it('should not suggest intermediate document wording such as 文檔 -> 文件', async () => {
      const text = '這份 API 文檔已更新'
      const issues = await linter.lintText(text)

      expect(issues.find(issue =>
        issue.rule === 'mainland-terms' &&
        issue.message.includes('文檔') &&
        issue.message.includes('文件')
      )).toBeUndefined()
    })

    it('should flag 類型 in explicit type-system contexts', async () => {
      const text = '函式類型需要與參數類型一致'
      const issues = await linter.lintText(text)

      expect(issues.some(issue =>
        issue.rule === 'mainland-terms' &&
        issue.message.includes('類型') &&
        issue.message.includes('型別')
      )).toBe(true)
    })

    it('should not flag 類型 in general categorization contexts', async () => {
      const text = '請選擇商品類型與膚質類型'
      const issues = await linter.lintText(text)

      expect(issues.find(issue =>
        issue.rule === 'mainland-terms' &&
        issue.message.includes('類型') &&
        issue.message.includes('型別')
      )).toBeUndefined()
    })

    it('should flag 協議 in explicit protocol contexts', async () => {
      const text = 'HTTP 協議與通訊協議需要保持一致'
      const issues = await linter.lintText(text)

      expect(issues.some(issue =>
        issue.rule === 'mainland-terms' &&
        issue.message.includes('協議') &&
        issue.message.includes('協定')
      )).toBe(true)
    })

    it('should not flag 協議 in general agreement contexts', async () => {
      const text = '授權協議與合作協議已更新'
      const issues = await linter.lintText(text)

      expect(issues.find(issue =>
        issue.rule === 'mainland-terms' &&
        issue.message.includes('協議') &&
        issue.message.includes('協定')
      )).toBeUndefined()
    })

    it('should not flag 配置 in common engineering documentation contexts', async () => {
      const text = '請檢查環境配置與模型配置是否正確'
      const issues = await linter.lintText(text)

      expect(issues.find(issue =>
        issue.rule === 'mainland-terms' &&
        issue.message.includes('配置') &&
        (issue.message.includes('設定') || issue.message.includes('組態'))
      )).toBeUndefined()
    })

    it('should not flag 構建 in common engineering writing contexts', async () => {
      const text = '系統會構建查詢與構建提示詞'
      const issues = await linter.lintText(text)

      expect(issues.find(issue =>
        issue.rule === 'mainland-terms' &&
        issue.message.includes('構建') &&
        issue.message.includes('建構')
      )).toBeUndefined()
    })

    it('should not flag 抽象 in common conceptual writing contexts', async () => {
      const text = '這個概念太抽象，不夠具體'
      const issues = await linter.lintText(text)

      expect(issues.find(issue =>
        issue.rule === 'mainland-terms' &&
        issue.message.includes('抽象') &&
        issue.message.includes('抽象化')
      )).toBeUndefined()
    })

    it('should not flag 對象 in common non-OOP contexts', async () => {
      const text = '這個研究的適合對象與回覆對象不同'
      const issues = await linter.lintText(text)

      expect(issues.find(issue =>
        issue.rule === 'mainland-terms' &&
        issue.message.includes('對象') &&
        issue.message.includes('物件')
      )).toBeUndefined()
    })

    // --- Batch 2: context_sensitive false-positive prevention ---

    it.each([
      ['文件', '檔案', '這份政府文件需要簽署'],
      ['添加', '新增', '請添加調味料到湯裡'],
      ['創建', '建立', '他創建了一家公司'],
      ['移動', '行動', '請移動到左邊的位置'],
      ['頭部', '標頭', '他的頭部受了輕傷'],
      ['連接', '連線', '用管子連接兩個水槽'],
      ['響應', '回應', '民眾積極響應號召'],
      ['菜單', '選單', '這家餐廳的菜單很豐富'],
      ['窗口', '視窗', '請到服務窗口辦理'],
      ['程序', '程式', '法律程序已經完成'],
      ['循環', '迴圈', '血液循環系統很重要'],
      ['實現', '實作', '終於實現了夢想'],
      ['運行', '執行', '這列火車正常運行中'],
    ])('should not flag %s in non-tech context: %s', async (term, replacement, text) => {
      const issues = await linter.lintText(text)

      expect(issues.find(issue =>
        issue.rule === 'mainland-terms' &&
        issue.message.includes(term) &&
        issue.message.includes(replacement)
      )).toBeUndefined()
    })

    it.each([
      ['文件', '檔案', '下載系統文件到本機'],
      ['程序', '程式', '這個軟體程序有 bug'],
      ['循環', '迴圈', '這個 for 循環有問題'],
      ['實現', '實作', '這個 API 功能的實現有問題'],
      ['運行', '執行', '程式運行時出現錯誤'],
      ['菜單', '選單', '點擊下拉菜單選擇'],
      ['窗口', '視窗', '彈出窗口顯示錯誤'],
    ])('should flag %s in tech context: %s', async (term, replacement, text) => {
      const issues = await linter.lintText(text)

      expect(issues.some(issue =>
        issue.rule === 'mainland-terms' &&
        issue.message.includes(term) &&
        issue.message.includes(replacement)
      )).toBe(true)
    })

    it('should mark issues as fixable', async () => {
      const text = '软件开发'
      const issues = await linter.lintText(text)

      expect(issues.length).toBeGreaterThan(0)
      expect(issues.every(issue => issue.fixable)).toBe(true)
    })
  })

  describe('fixText', () => {
    it('should convert simplified characters to traditional', async () => {
      const text = '这是一个简体字测试'
      const fixed = await linter.fixText(text)

      expect(fixed).toBe('這是一個簡體字測試')
    })

    it('should replace mainland terms with Taiwan terms', async () => {
      const text = '软件开发'
      const fixed = await linter.fixText(text)

      expect(fixed).toContain('軟體')
      expect(fixed).not.toContain('软件')
    })

    it('should handle mixed content correctly', async () => {
      const text = '使用软件来开发网络程序'
      const fixed = await linter.fixText(text)

      expect(fixed).toContain('軟體')
      expect(fixed).toContain('開發')
      expect(fixed).toContain('網路')
      // 程序 now context_sensitive (autofix_safe=false), detected but not auto-fixed
      expect(fixed).toContain('程序')
    })

    it('should preserve content that does not need fixing', async () => {
      const text = 'Hello World 你好世界'
      const fixed = await linter.fixText(text)

      expect(fixed).toBe('Hello World 你好世界')
    })
  })

  describe('rule configuration', () => {
    it('should respect disabled rules', async () => {
      const configWithDisabledRule: TWLintConfig = {
        dictionaries: ['core'],
        rules: {
          'simplified-chars': 'off',
          'mainland-terms': 'warning'
        }
      }

      const linterWithDisabledRule = new TWLinter(configWithDisabledRule)
      const text = '这是简体字'
      const issues = await linterWithDisabledRule.lintText(text)

      expect(issues.filter(issue => issue.rule === 'simplified-chars')).toHaveLength(0)
    })

    it('should apply different severity levels', async () => {
      const text = '软件开发使用简体字'
      const issues = await linter.lintText(text)

      const simplifiedIssues = issues.filter(issue => issue.rule === 'simplified-chars')
      const mainlandIssues = issues.filter(issue => issue.rule === 'mainland-terms')

      expect(simplifiedIssues.some(issue => issue.severity === 'error')).toBe(true)
      expect(mainlandIssues.some(issue => issue.severity === 'warning')).toBe(true)
    })
  })
})
