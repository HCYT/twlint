import { describe, it, expect } from 'vitest'
import { ConfigMatcher } from '../../src/core/config-matcher.js'
import type { TWLintConfigRule } from '../../src/core/config-schema.js'

describe('ConfigMatcher', () => {
  describe('系統鐵律（SYSTEM_IGNORES）', () => {
    it('應該絕對優先忽略系統級檔案', () => {
      const config: TWLintConfigRule[] = [
        {
          files: ['**/*'],
          rules: { 'simplified-chars': 'error' }
        }
      ]

      const matcher = new ConfigMatcher(config)

      // 設定檔案 - 絕對不檢查
      expect(matcher.isIgnored('.gitignore')).toBe(true)
      expect(matcher.isIgnored('.dockerignore')).toBe(true)
      expect(matcher.isIgnored('config/.eslintignore')).toBe(true)

      // 環境變數 - 絕對不檢查
      expect(matcher.isIgnored('.env')).toBe(true)
      expect(matcher.isIgnored('.env.local')).toBe(true)
      expect(matcher.isIgnored('backend/.env.production')).toBe(true)

      // 版本控制 - 絕對不檢查
      expect(matcher.isIgnored('.git/config')).toBe(true)
      expect(matcher.isIgnored('node_modules/package/index.js')).toBe(true)

      // 建構輸出 - 絕對不檢查
      expect(matcher.isIgnored('dist/bundle.js')).toBe(true)
      expect(matcher.isIgnored('build/output.js')).toBe(true)

      // 日誌檔案 - 絕對不檢查
      expect(matcher.isIgnored('debug.log')).toBe(true)
      expect(matcher.isIgnored('temp.tmp')).toBe(true)
    })

    it('系統鐵律不可被使用者設定覆寫', () => {
      const config: TWLintConfigRule[] = [
        {
          // 即使使用者明確指定要檢查 .env
          files: ['**/.env*'],
          rules: { 'simplified-chars': 'error' }
        }
      ]

      const matcher = new ConfigMatcher(config)

      // 系統鐵律依然生效
      expect(matcher.isIgnored('.env')).toBe(true)
      expect(matcher.isIgnored('.env.local')).toBe(true)
    })
  })

  describe('isIgnored', () => {
    it('應該識別全域 ignores', () => {
      const config: TWLintConfigRule[] = [
        {
          ignores: ['node_modules/**', 'dist/**']
        },
        {
          files: ['**/*.md'],
          rules: { 'simplified-chars': 'error' }
        }
      ]

      const matcher = new ConfigMatcher(config)

      expect(matcher.isIgnored('node_modules/package.json')).toBe(true)
      expect(matcher.isIgnored('dist/output.js')).toBe(true)
      expect(matcher.isIgnored('src/index.md')).toBe(false)
    })

    it('應該支援檔案級別的 ignores', () => {
      const config: TWLintConfigRule[] = [
        {
          files: ['**/*.md'],
          ignores: ['**/README.md'],
          rules: { 'simplified-chars': 'error' }
        }
      ]

      const matcher = new ConfigMatcher(config)

      expect(matcher.isIgnored('README.md')).toBe(true)
      expect(matcher.isIgnored('docs/README.md')).toBe(true)
      expect(matcher.isIgnored('docs/guide.md')).toBe(false)
    })

    it('應該支援否定模式', () => {
      const config: TWLintConfigRule[] = [
        {
          ignores: ['*.test.js', '!important.test.js']
        }
      ]

      const matcher = new ConfigMatcher(config)

      expect(matcher.isIgnored('foo.test.js')).toBe(true)
      expect(matcher.isIgnored('important.test.js')).toBe(false)
    })

    it('全域 ignores 應該優先於檔案級別設定', () => {
      const config: TWLintConfigRule[] = [
        {
          ignores: ['**/*.tmp']
        },
        {
          files: ['**/*.tmp'],
          rules: { 'simplified-chars': 'error' }
        }
      ]

      const matcher = new ConfigMatcher(config)

      expect(matcher.isIgnored('test.tmp')).toBe(true)
    })
  })

  describe('getRulesForFile', () => {
    it('應該回傳匹配檔案的規則', () => {
      const config: TWLintConfigRule[] = [
        {
          files: ['**/*.md'],
          rules: { 'simplified-chars': 'error' }
        }
      ]

      const matcher = new ConfigMatcher(config)
      const rules = matcher.getRulesForFile('docs/guide.md')

      expect(rules).toEqual({ 'simplified-chars': 'error' })
    })

    it('應該合併多個設定區塊的規則（後面的覆寫前面的）', () => {
      const config: TWLintConfigRule[] = [
        {
          files: ['**/*.md'],
          rules: { 'simplified-chars': 'error', 'mainland-terms': 'warning' }
        },
        {
          files: ['tests/**/*.md'],
          rules: { 'mainland-terms': 'off' }
        }
      ]

      const matcher = new ConfigMatcher(config)
      const rules = matcher.getRulesForFile('tests/example.md')

      expect(rules).toEqual({
        'simplified-chars': 'error',
        'mainland-terms': 'off'
      })
    })

    it('忽略的檔案應該回傳空規則', () => {
      const config: TWLintConfigRule[] = [
        {
          ignores: ['**/*.tmp']
        },
        {
          files: ['**/*'],
          rules: { 'simplified-chars': 'error' }
        }
      ]

      const matcher = new ConfigMatcher(config)
      const rules = matcher.getRulesForFile('test.tmp')

      expect(rules).toEqual({})
    })

    it('應該正確處理檔案級別的 ignores', () => {
      const config: TWLintConfigRule[] = [
        {
          files: ['**/*.md'],
          ignores: ['**/README.md'],
          rules: { 'simplified-chars': 'error' }
        }
      ]

      const matcher = new ConfigMatcher(config)

      expect(matcher.getRulesForFile('docs/guide.md')).toEqual({
        'simplified-chars': 'error'
      })
      expect(matcher.getRulesForFile('docs/README.md')).toEqual({})
    })
  })

  describe('getDomainsForFile', () => {
    it('應該回傳匹配檔案的領域', () => {
      const config: TWLintConfigRule[] = [
        {
          files: ['**/*.md'],
          domains: ['software-development', 'user-interface']
        }
      ]

      const matcher = new ConfigMatcher(config)
      const domains = matcher.getDomainsForFile('docs/guide.md')

      expect(domains).toEqual(['software-development', 'user-interface'])
    })

    it('應該合併多個設定區塊的領域並去重', () => {
      const config: TWLintConfigRule[] = [
        {
          files: ['**/*.md'],
          domains: ['software-development']
        },
        {
          files: ['docs/**/*.md'],
          domains: ['user-interface', 'software-development']
        }
      ]

      const matcher = new ConfigMatcher(config)
      const domains = matcher.getDomainsForFile('docs/guide.md')

      expect(domains).toEqual(['software-development', 'user-interface'])
    })

    it('應該支援向後相容的 dictionaries 欄位', () => {
      const config: TWLintConfigRule[] = [
        {
          files: ['**/*.md'],
          dictionaries: ['core', 'plus']
        }
      ]

      const matcher = new ConfigMatcher(config)
      const domains = matcher.getDomainsForFile('docs/guide.md')

      expect(domains).toEqual(['core', 'plus'])
    })
  })

  describe('.twlintignore 支援', () => {
    it('應該支援 .twlintignore 模式', () => {
      const config: TWLintConfigRule[] = [
        {
          files: ['**/*.md'],
          rules: { 'simplified-chars': 'error' }
        }
      ]

      const matcher = new ConfigMatcher(config)
      
      // 設定 .twlintignore 模式
      matcher.setTwlintignorePatterns([
        'test-*.md',
        'draft/**'
      ])

      expect(matcher.isIgnored('test-example.md')).toBe(true)
      expect(matcher.isIgnored('draft/notes.md')).toBe(true)
      expect(matcher.isIgnored('docs/guide.md')).toBe(false)
    })

    it('.twlintignore 應該優先於設定檔案的 ignores', () => {
      const config: TWLintConfigRule[] = [
        {
          files: ['**/*.md'],
          rules: { 'simplified-chars': 'error' }
        }
      ]

      const matcher = new ConfigMatcher(config)
      matcher.setTwlintignorePatterns(['*.md'])

      // .twlintignore 設定忽略所有 .md，設定檔案無法覆寫
      expect(matcher.isIgnored('any-file.md')).toBe(true)
    })

    it('系統鐵律仍然優先於 .twlintignore', () => {
      const config: TWLintConfigRule[] = []
      const matcher = new ConfigMatcher(config)
      
      // 即使 .twlintignore 沒有設定，系統鐵律依然生效
      expect(matcher.isIgnored('.env')).toBe(true)
      expect(matcher.isIgnored('node_modules/package.json')).toBe(true)
    })
  })

  describe('邊界情況', () => {
    it('應該處理單一設定物件（非陣列）', () => {
      const config: TWLintConfigRule = {
        files: ['**/*.md'],
        rules: { 'simplified-chars': 'error' }
      }

      const matcher = new ConfigMatcher(config)
      const rules = matcher.getRulesForFile('test.md')

      expect(rules).toEqual({ 'simplified-chars': 'error' })
    })

    it('應該處理空設定陣列', () => {
      const config: TWLintConfigRule[] = []

      const matcher = new ConfigMatcher(config)

      expect(matcher.isIgnored('test.md')).toBe(false)
      expect(matcher.getRulesForFile('test.md')).toEqual({})
      expect(matcher.getDomainsForFile('test.md')).toEqual([])
    })

    it('應該處理沒有 files 模式的設定', () => {
      const config: TWLintConfigRule[] = [
        {
          rules: { 'simplified-chars': 'error' }
        }
      ]

      const matcher = new ConfigMatcher(config)
      const rules = matcher.getRulesForFile('any-file.md')

      // 沒有 files 模式 = 匹配所有檔案
      expect(rules).toEqual({ 'simplified-chars': 'error' })
    })
  })
})
