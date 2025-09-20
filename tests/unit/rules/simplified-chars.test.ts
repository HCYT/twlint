import { describe, it, expect, beforeEach } from 'vitest'
import { SimplifiedCharsRule } from '../../../src/core/rules/simplified-chars.js'

describe('SimplifiedCharsRule', () => {
  let rule: SimplifiedCharsRule

  beforeEach(() => {
    rule = new SimplifiedCharsRule()
  })

  describe('check', () => {
    it('should detect simplified characters', async () => {
      const text = '这是简体字'
      const issues = await rule.check(text)

      expect(issues.length).toBeGreaterThan(0)
      expect(issues.every(issue => issue.rule === 'simplified-chars')).toBe(true)
      expect(issues.every(issue => issue.severity === 'error')).toBe(true)
    })

    it('should provide correct line and column positions', async () => {
      const text = '第一行\n这是第二行简体字'
      const issues = await rule.check(text)

      const secondLineIssues = issues.filter(issue => issue.line === 2)
      expect(secondLineIssues.length).toBeGreaterThan(0)
      expect(secondLineIssues.some(issue => issue.column === 1)).toBe(true) // '这' 在第2行第1列
    })

    it('should provide traditional character suggestions', async () => {
      const text = '这'
      const issues = await rule.check(text)

      expect(issues).toHaveLength(1)
      expect(issues[0].suggestions).toContain('這')
    })

    it('should mark all issues as fixable', async () => {
      const text = '这是简体字测试'
      const issues = await rule.check(text)

      expect(issues.length).toBeGreaterThan(0)
      expect(issues.every(issue => issue.fixable)).toBe(true)
    })

    it('should not flag traditional Chinese text', async () => {
      const text = '這是繁體字測試'
      const issues = await rule.check(text)

      expect(issues).toHaveLength(0)
    })

    it('should handle mixed content', async () => {
      const text = 'English 中文繁體 简体字 123'
      const issues = await rule.check(text)

      // 只有簡體字部分應該被標記
      expect(issues.length).toBeGreaterThan(0)
      expect(issues.every(issue => issue.column >= 11)) // 簡體字在後面
    })

    it('should handle empty text', async () => {
      const text = ''
      const issues = await rule.check(text)

      expect(issues).toHaveLength(0)
    })

    it('should handle multiline text', async () => {
      const text = '第一行是繁體\n第二行有简体字\n第三行也是繁體'
      const issues = await rule.check(text)

      expect(issues.length).toBeGreaterThan(0)
      expect(issues.every(issue => issue.line === 2)).toBe(true)
    })
  })

  describe('fix', () => {
    it('should convert simplified characters to traditional', async () => {
      const text = '这是简体字测试'
      const fixed = await rule.fix(text)

      expect(fixed).toBe('這是簡體字測試')
    })

    it('should preserve non-Chinese characters', async () => {
      const text = 'Hello 这是简体字 123'
      const fixed = await rule.fix(text)

      expect(fixed).toBe('Hello 這是簡體字 123')
    })

    it('should handle already traditional text', async () => {
      const text = '這已經是繁體字了'
      const fixed = await rule.fix(text)

      expect(fixed).toBe('這已經是繁體字了')
    })

    it('should handle empty text', async () => {
      const text = ''
      const fixed = await rule.fix(text)

      expect(fixed).toBe('')
    })

    it('should preserve line breaks and formatting', async () => {
      const text = '第一行简体字\n\n第三行也有简体字'
      const fixed = await rule.fix(text)

      expect(fixed).toBe('第一行簡體字\n\n第三行也有簡體字')
    })
  })

  describe('name property', () => {
    it('should have correct rule name', () => {
      expect(rule.name).toBe('simplified-chars')
    })
  })
})