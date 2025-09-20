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
      expect(fixed).toContain('程式')
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