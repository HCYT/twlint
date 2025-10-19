import { describe, it, expect, beforeEach } from 'vitest'
import { MainlandTermsRule } from '../../../src/core/rules/mainland-terms.js'
import { DictionaryManager } from '../../../src/core/dictionary-manager.js'

describe('MainlandTermsRule - False Positive Filter (Real-world Scenarios)', () => {
  let rule: MainlandTermsRule
  let dictManager: DictionaryManager

  beforeEach(() => {
    dictManager = new DictionaryManager()
    rule = new MainlandTermsRule(dictManager)
  })

  it('should filter false positives in code comments', async () => {
    // 真實場景：程式碼註解中的假陽性
    const text = `/**
 * 設定 Docker 容器的環境變數
 * @param {Object} config - 設定對象
 * @returns {Container} 容器實例
 */
function setupContainer(config) {
  // 初始化容器設定
  const container = new Container(config);
  return container;
}`

    // 模擬詞庫匹配：設定、容器都是假陽性（簡繁轉換後相同）
    dictManager.findMatches = (text) => [
      { term: '配置', replacement: '配置', start: 7, end: 9, confidence: 0.9, rule: 'core-exact', autofix_safe: true },
      { term: '容器', replacement: '容器', start: 17, end: 19, confidence: 0.8, rule: 'core-exact', autofix_safe: true },
      { term: '配置', replacement: '配置', start: 43, end: 45, confidence: 0.9, rule: 'core-exact', autofix_safe: true },
      { term: '容器', replacement: '容器', start: 56, end: 58, confidence: 0.8, rule: 'core-exact', autofix_safe: true },
      { term: '容器', replacement: '容器', start: 79, end: 81, confidence: 0.8, rule: 'core-exact', autofix_safe: true },
      { term: '配置', replacement: '配置', start: 89, end: 91, confidence: 0.9, rule: 'core-exact', autofix_safe: true }
    ]

    const issues = await rule.check(text)
    const fixedText = await rule.fix(text)

    // 所有假陽性應該被過濾，不產生任何警告
    expect(issues).toHaveLength(0)
    // 文本應該保持不變
    expect(fixedText).toBe(text)
  })

  it('should detect and fix mainland terms in API documentation', async () => {
    // 真實場景：API 文檔中的大陸用語
    const text = `## 用戶認證接口

本接口用于驗證用戶身份和獲取訪問令牌。

### 請求參數

- **用戶名**: 字符串類型，必填
- **密碼**: 字符串類型，必填

### 返回數據

成功時返回包含訪問令牌的 JSON 對象。

### 錯誤處理

當認證失敗時，服務器會返回 401 狀態碼。`

    // 模擬真實匹配：用戶→用戶(假陽性)、接口→介面、認證→驗證、訪問→存取
    dictManager.findMatches = (text) => [
      { term: '用戶', replacement: '用戶', start: 3, end: 5, confidence: 0.9, rule: 'core-exact', autofix_safe: true },
      { term: '認證', replacement: '驗證', start: 5, end: 7, confidence: 0.9, rule: 'core-exact', autofix_safe: true },
      { term: '接口', replacement: '介面', start: 7, end: 9, confidence: 0.95, rule: 'core-exact', autofix_safe: true },
      { term: '用于', replacement: '用於', start: 15, end: 17, confidence: 0.95, rule: 'core-exact', autofix_safe: true },
      { term: '用戶', replacement: '用戶', start: 19, end: 21, confidence: 0.9, rule: 'core-exact', autofix_safe: true },
      { term: '訪問', replacement: '存取', start: 28, end: 30, confidence: 0.95, rule: 'core-exact', autofix_safe: true },
      { term: '用戶', replacement: '用戶', start: 41, end: 43, confidence: 0.9, rule: 'core-exact', autofix_safe: true },
      { term: '字符串', replacement: '字串', start: 48, end: 51, confidence: 0.95, rule: 'core-exact', autofix_safe: true },
      { term: '字符串', replacement: '字串', start: 64, end: 67, confidence: 0.95, rule: 'core-exact', autofix_safe: true },
      { term: '數據', replacement: '資料', start: 78, end: 80, confidence: 0.95, rule: 'core-exact', autofix_safe: true },
      { term: '訪問', replacement: '存取', start: 88, end: 90, confidence: 0.95, rule: 'core-exact', autofix_safe: true },
      { term: '對象', replacement: '物件', start: 100, end: 102, confidence: 0.95, rule: 'core-exact', autofix_safe: true },
      { term: '認證', replacement: '驗證', start: 112, end: 114, confidence: 0.9, rule: 'core-exact', autofix_safe: true },
      { term: '服務器', replacement: '伺服器', start: 119, end: 122, confidence: 0.95, rule: 'core-exact', autofix_safe: true }
    ]

    const issues = await rule.check(text)
    const fixedText = await rule.fix(text)

    // 只報告真實的大陸用語，過濾假陽性
    const validIssues = issues.filter(i => !i.message.includes('用戶 → 用戶'))
    expect(validIssues.length).toBeGreaterThan(0)
    
    // 修復後應該替換大陸用語，但保留假陽性
    expect(fixedText).toContain('介面')
    expect(fixedText).toContain('用於')
    expect(fixedText).toContain('存取')
    expect(fixedText).toContain('字串')
    expect(fixedText).toContain('資料')
    expect(fixedText).toContain('物件')
    expect(fixedText).toContain('伺服器')
  })

  it('should not fix text when term equals replacement', async () => {
    const mockMatches = [
      {
        term: '容器',
        replacement: '容器', // 假陽性
        start: 0,
        end: 2,
        confidence: 0.8,
        rule: 'test-exact',
        autofix_safe: true
      }
    ]

    dictManager.findMatches = () => mockMatches

    const originalText = '容器技術'
    const fixedText = await rule.fix(originalText)

    // 文本應該保持不變
    expect(fixedText).toBe(originalText)
  })

  it('should fix valid replacements', async () => {
    const mockMatches = [
      {
        term: '網絡',
        replacement: '網路',
        start: 0,
        end: 2,
        confidence: 0.95,
        rule: 'test-exact',
        autofix_safe: true
      }
    ]

    dictManager.findMatches = () => mockMatches

    const originalText = '網絡技術'
    const fixedText = await rule.fix(originalText)

    // 應該正確替換
    expect(fixedText).toBe('網路技術')
  })

  it('should handle mixed matches: filter false positives but keep valid ones', async () => {
    // 混合匹配：既有假陽性也有真實匹配
    const mockMatches = [
      {
        term: '容器',
        replacement: '容器', // 假陽性
        start: 0,
        end: 2,
        confidence: 0.8,
        rule: 'test-exact',
        autofix_safe: true
      },
      {
        term: '軟件',
        replacement: '軟體', // 真實匹配
        start: 3,
        end: 5,
        confidence: 0.95,
        rule: 'test-exact',
        autofix_safe: true
      },
      {
        term: '框架',
        replacement: '框架', // 假陽性
        start: 8,
        end: 10,
        confidence: 0.75,
        rule: 'test-exact',
        autofix_safe: true
      }
    ]

    dictManager.findMatches = () => mockMatches

    const text = '容器和軟件的框架設計'
    const issues = await rule.check(text)

    // 只應該報告真實匹配（軟件 → 軟體）
    expect(issues).toHaveLength(1)
    expect(issues[0].message).toContain('軟件')
    expect(issues[0].message).toContain('軟體')
  })

  it('should handle multiple valid replacements in same text', async () => {
    const mockMatches = [
      {
        term: '軟件',
        replacement: '軟體',
        start: 0,
        end: 2,
        confidence: 0.95,
        rule: 'test-exact',
        autofix_safe: true
      },
      {
        term: '網絡',
        replacement: '網路',
        start: 2,
        end: 4,
        confidence: 0.95,
        rule: 'test-exact',
        autofix_safe: true
      },
      {
        term: '數據庫',
        replacement: '資料庫',
        start: 4,
        end: 7,
        confidence: 0.95,
        rule: 'test-exact',
        autofix_safe: true
      }
    ]

    dictManager.findMatches = () => mockMatches

    const text = '軟件網絡數據庫'
    const fixedText = await rule.fix(text)

    // 應該全部替換
    expect(fixedText).toBe('軟體網路資料庫')
  })

  it('should not report issues for context-sensitive false positives', async () => {
    // 語境敏感的假陽性（用於語境區分，但這個語境下保持原樣）
    const mockMatches = [
      {
        term: '質量',
        replacement: '質量', // 物理語境下保持「質量」
        start: 0,
        end: 2,
        confidence: 0.95,
        rule: 'test-context_sensitive',
        autofix_safe: false
      }
    ]

    dictManager.findMatches = () => mockMatches

    const text = '質量守恆定律'
    const issues = await rule.check(text)

    // 應該過濾掉（term === replacement）
    expect(issues).toHaveLength(0)
  })

  it('should preserve text with only false positive matches', async () => {
    const mockMatches = [
      {
        term: 'JSON',
        replacement: 'JSON',
        start: 0,
        end: 4,
        confidence: 0.8,
        rule: 'test-exact',
        autofix_safe: true
      },
      {
        term: 'API',
        replacement: 'API',
        start: 5,
        end: 8,
        confidence: 0.8,
        rule: 'test-exact',
        autofix_safe: true
      }
    ]

    dictManager.findMatches = () => mockMatches

    const originalText = 'JSON API 設計'
    const fixedText = await rule.fix(originalText)

    // 文本應該完全不變
    expect(fixedText).toBe(originalText)
  })

  it('should handle empty matches array', async () => {
    dictManager.findMatches = () => []

    const text = '這是一段純台灣用語的文本'
    const issues = await rule.check(text)
    const fixedText = await rule.fix(text)

    expect(issues).toHaveLength(0)
    expect(fixedText).toBe(text)
  })

  it('should filter false positives even when autofix_safe is false', async () => {
    // 即使是不安全修復的假陽性也應該過濾
    const mockMatches = [
      {
        term: '元素',
        replacement: '元素',
        start: 0,
        end: 2,
        confidence: 0.75,
        rule: 'test-exact',
        autofix_safe: false // 不安全修復
      }
    ]

    dictManager.findMatches = () => mockMatches

    const text = '元素選擇器'
    const issues = await rule.check(text)

    // 應該過濾掉
    expect(issues).toHaveLength(0)
  })
})
