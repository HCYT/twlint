import { describe, it, expect, beforeEach } from 'vitest'
import { MainlandTermsRule } from '../../../src/core/rules/mainland-terms.js'
import { DictionaryManager } from '../../../src/core/dictionary-manager.js'

describe('MainlandTermsRule - Real-world Code & Documentation Scenarios', () => {
  let rule: MainlandTermsRule
  let dictManager: DictionaryManager

  beforeEach(() => {
    dictManager = new DictionaryManager()
    rule = new MainlandTermsRule(dictManager)
  })

  it('should filter false positives in JSDoc comments', async () => {
    const codeText = `/**
 * 配置 Docker 容器的環境變數
 * @param {Object} config - 配置對象
 * @param {string} network - 網絡名稱
 * @returns {Container} 容器實例
 */
function setupContainer(config, network) {
  // 初始化容器配置
  const container = new Container(config);
  container.attachNetwork(network);
  return container;
}`

    // 模擬：配置、容器是假陽性，網絡→網路是真實匹配
    dictManager.findMatches = () => [
      { term: '配置', replacement: '配置', start: 7, end: 9, confidence: 0.9, rule: 'core-exact', autofix_safe: true },
      { term: '容器', replacement: '容器', start: 17, end: 19, confidence: 0.8, rule: 'core-exact', autofix_safe: true },
      { term: '配置', replacement: '配置', start: 43, end: 45, confidence: 0.9, rule: 'core-exact', autofix_safe: true },
      { term: '對象', replacement: '物件', start: 45, end: 47, confidence: 0.95, rule: 'core-exact', autofix_safe: true },
      { term: '網絡', replacement: '網路', start: 66, end: 68, confidence: 0.95, rule: 'core-exact', autofix_safe: true },
      { term: '容器', replacement: '容器', start: 86, end: 88, confidence: 0.8, rule: 'core-exact', autofix_safe: true },
      { term: '容器', replacement: '容器', start: 109, end: 111, confidence: 0.8, rule: 'core-exact', autofix_safe: true },
      { term: '配置', replacement: '配置', start: 119, end: 121, confidence: 0.9, rule: 'core-exact', autofix_safe: true }
    ]

    const issues = await rule.check(codeText)
    const fixedText = await rule.fix(codeText)

    // 只報告真實的大陸用語
    expect(issues).toHaveLength(2) // 對象→物件, 網絡→網路
    expect(issues.some(i => i.message.includes('對象') && i.message.includes('物件'))).toBe(true)
    expect(issues.some(i => i.message.includes('網絡') && i.message.includes('網路'))).toBe(true)

    // 修復後應該只替換真實匹配，保留假陽性
    expect(fixedText).toContain('物件')
    expect(fixedText).toContain('網路')
    expect(fixedText).toContain('配置') // 保留
    expect(fixedText).toContain('容器') // 保留
  })

  it('should handle README documentation with mixed terms', async () => {
    const readmeText = `# 項目簡介

這是一個用於處理用戶數據的開源軟件。

## 特性

- 支持多種數據庫連接
- 提供 REST API 接口
- 內置緩存機制提升性能
- 完整的錯誤處理和日志記錄

## 安裝

使用 npm 安裝此軟件包：

\`\`\`bash
npm install @example/data-processor
\`\`\`

## 配置示例

\`\`\`json
{
  "database": {
    "host": "localhost",
    "port": 5432
  },
  "cache": {
    "enabled": true
  }
}
\`\`\``

    // 模擬匹配：項目→專案, 用戶→使用者/用戶(假陽性), 數據→資料, 軟件→軟體, 數據庫→資料庫, 接口→介面, 緩存→快取, 日志→日誌, 軟件包→套件
    dictManager.findMatches = () => [
      { term: '項目', replacement: '專案', start: 2, end: 4, confidence: 0.95, rule: 'core-exact', autofix_safe: true },
      { term: '用戶', replacement: '用戶', start: 17, end: 19, confidence: 0.9, rule: 'core-exact', autofix_safe: false },
      { term: '數據', replacement: '資料', start: 19, end: 21, confidence: 0.95, rule: 'core-exact', autofix_safe: true },
      { term: '軟件', replacement: '軟體', start: 26, end: 28, confidence: 0.95, rule: 'core-exact', autofix_safe: true },
      { term: '數據庫', replacement: '資料庫', start: 40, end: 43, confidence: 0.95, rule: 'core-exact', autofix_safe: true },
      { term: '接口', replacement: '介面', start: 57, end: 59, confidence: 0.95, rule: 'core-exact', autofix_safe: true },
      { term: '緩存', replacement: '快取', start: 65, end: 67, confidence: 0.9, rule: 'core-exact', autofix_safe: true },
      { term: '日志', replacement: '日誌', start: 82, end: 84, confidence: 0.9, rule: 'core-exact', autofix_safe: true },
      { term: '軟件', replacement: '軟體', start: 100, end: 102, confidence: 0.95, rule: 'core-exact', autofix_safe: true },
      { term: '配置', replacement: '配置', start: 126, end: 128, confidence: 0.9, rule: 'core-exact', autofix_safe: true }
    ]

    const issues = await rule.check(readmeText)
    const fixedText = await rule.fix(readmeText)

    // 應該報告所有真實的大陸用語，過濾假陽性（用戶、配置）
    expect(issues.length).toBeGreaterThan(6)
    expect(issues.every(i => !i.message.includes('配置 → 配置'))).toBe(true)

    // 修復後應包含台灣用語
    expect(fixedText).toContain('專案')
    expect(fixedText).toContain('資料')
    expect(fixedText).toContain('軟體')
    expect(fixedText).toContain('資料庫')
    expect(fixedText).toContain('介面')
    expect(fixedText).toContain('快取')
    expect(fixedText).toContain('日誌')
    // 保留假陽性的配置
    expect(fixedText).toContain('配置')
  })

  it('should handle technical blog post with context-sensitive terms', async () => {
    const blogText = `# 深度學習框架性能對比

## 質量評估

本文從質量和性能兩個維度評估主流框架。質量守恆定律在物理學中很重要，
但在評估軟件質量時，我們關注的是代碼質量、測試覆蓋率等指標。

## 性能測試

我們測試了各框架在圖像識別任務中的性能表現。`

    // 模擬語境敏感匹配：質量在不同語境下的處理
    dictManager.findMatches = () => [
      { term: '框架', replacement: '框架', start: 10, end: 12, confidence: 0.75, rule: 'core-exact', autofix_safe: true },
      { term: '對比', replacement: '比較', start: 15, end: 17, confidence: 0.85, rule: 'core-exact', autofix_safe: true },
      { term: '質量', replacement: '質量', start: 21, end: 23, confidence: 0.95, rule: 'core-context_sensitive', autofix_safe: false }, // 物理語境
      { term: '質量', replacement: '質量', start: 31, end: 33, confidence: 0.95, rule: 'core-context_sensitive', autofix_safe: false },
      { term: '框架', replacement: '框架', start: 43, end: 45, confidence: 0.75, rule: 'core-exact', autofix_safe: true },
      { term: '質量', replacement: '質量', start: 46, end: 48, confidence: 0.95, rule: 'core-context_sensitive', autofix_safe: false }, // 物理語境
      { term: '軟件', replacement: '軟體', start: 69, end: 71, confidence: 0.95, rule: 'core-exact', autofix_safe: true },
      { term: '質量', replacement: '品質', start: 71, end: 73, confidence: 0.9, rule: 'core-context_sensitive', autofix_safe: false }, // 商業語境
      { term: '質量', replacement: '品質', start: 83, end: 85, confidence: 0.9, rule: 'core-context_sensitive', autofix_safe: false },
      { term: '框架', replacement: '框架', start: 109, end: 111, confidence: 0.75, rule: 'core-exact', autofix_safe: true }
    ]

    const issues = await rule.check(blogText)
    const fixedText = await rule.fix(blogText)

    // 應該報告真實匹配，過濾所有假陽性（包括語境敏感的質量→質量）
    const realIssues = issues.filter(i => i.message.includes('對比') || i.message.includes('軟件'))
    expect(realIssues.length).toBeGreaterThan(0)

    // 修復後：對比→比較, 軟件→軟體，但框架和質量保持原樣
    expect(fixedText).toContain('比較')
    expect(fixedText).toContain('軟體')
    expect(fixedText).toContain('框架') // 保留假陽性
    expect(fixedText).toContain('質量') // 保留語境敏感的假陽性
  })

  it('should handle error messages in production code', async () => {
    const errorCode = `class DatabaseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DatabaseError';
  }
}

function connectDatabase(config) {
  try {
    const connection = createConnection(config);
    return connection;
  } catch (error) {
    throw new DatabaseError(
      \`無法連接到數據庫: \${config.host}:\${config.port}. \\n\` +
      \`請檢查網絡連接和服務器配置。\\n\` +
      \`錯誤信息: \${error.message}\`
    );
  }
}`

    dictManager.findMatches = () => [
      { term: '數據庫', replacement: '資料庫', start: 165, end: 168, confidence: 0.95, rule: 'core-exact', autofix_safe: true },
      { term: '配置', replacement: '配置', start: 175, end: 177, confidence: 0.9, rule: 'core-exact', autofix_safe: true },
      { term: '配置', replacement: '配置', start: 188, end: 190, confidence: 0.9, rule: 'core-exact', autofix_safe: true },
      { term: '網絡', replacement: '網路', start: 201, end: 203, confidence: 0.95, rule: 'core-exact', autofix_safe: true },
      { term: '服務器', replacement: '伺服器', start: 207, end: 210, confidence: 0.95, rule: 'core-exact', autofix_safe: true },
      { term: '配置', replacement: '配置', start: 210, end: 212, confidence: 0.9, rule: 'core-exact', autofix_safe: true },
      { term: '信息', replacement: '資訊', start: 219, end: 221, confidence: 0.9, rule: 'core-exact', autofix_safe: true }
    ]

    const issues = await rule.check(errorCode)
    const fixedText = await rule.fix(errorCode)

    // 過濾假陽性（配置），只報告真實大陸用語
    expect(issues.length).toBe(4) // 數據庫、網絡、服務器、信息
    expect(issues.every(i => !i.message.includes('配置 → 配置'))).toBe(true)

    // 修復後應該替換真實匹配
    expect(fixedText).toContain('資料庫')
    expect(fixedText).toContain('網路')
    expect(fixedText).toContain('伺服器')
    expect(fixedText).toContain('資訊')
    expect(fixedText).toContain('配置') // 保留假陽性
  })

  it('should handle TypeScript interface definitions', async () => {
    const tsCode = `interface UserConfig {
  /** 用戶唯一標識符 */
  userId: string;
  
  /** 用戶顯示名稱 */
  username: string;
  
  /** 配置選項 */
  options: {
    /** 是否啟用緩存 */
    enableCache: boolean;
    
    /** 數據源配置 */
    dataSource: DatabaseConfig;
  };
}

interface DatabaseConfig {
  host: string;
  port: number;
  /** 連接超時時間（毫秒） */
  timeout: number;
}`

    dictManager.findMatches = () => [
      { term: '用戶', replacement: '用戶', start: 29, end: 31, confidence: 0.9, rule: 'core-exact', autofix_safe: false },
      { term: '用戶', replacement: '用戶', start: 59, end: 61, confidence: 0.9, rule: 'core-exact', autofix_safe: false },
      { term: '配置', replacement: '配置', start: 91, end: 93, confidence: 0.9, rule: 'core-exact', autofix_safe: true },
      { term: '緩存', replacement: '快取', start: 125, end: 127, confidence: 0.9, rule: 'core-exact', autofix_safe: true },
      { term: '數據', replacement: '資料', start: 157, end: 159, confidence: 0.95, rule: 'core-exact', autofix_safe: true },
      { term: '配置', replacement: '配置', start: 161, end: 163, confidence: 0.9, rule: 'core-exact', autofix_safe: true }
    ]

    const issues = await rule.check(tsCode)
    const fixedText = await rule.fix(tsCode)

    // 過濾假陽性（用戶、配置），只報告真實匹配
    expect(issues.length).toBe(2) // 緩存→快取, 數據→資料
    expect(issues.some(i => i.message.includes('緩存') && i.message.includes('快取'))).toBe(true)
    expect(issues.some(i => i.message.includes('數據') && i.message.includes('資料'))).toBe(true)

    // 修復應該保留假陽性
    expect(fixedText).toContain('快取')
    expect(fixedText).toContain('資料')
    expect(fixedText).toContain('用戶') // 保留
    expect(fixedText).toContain('配置') // 保留
  })
})
