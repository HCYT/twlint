import { glob } from 'glob'
import { readFile } from 'fs/promises'
import { DictionaryManager } from './dictionary-manager.js'
import { SimplifiedCharsRule } from './rules/simplified-chars.js'
import { MainlandTermsRule } from './rules/mainland-terms.js'
import { PositionMapper } from './position-mapper.js'
import type { LintResult, Issue, TWLintConfig, Rule } from '../types.js'
import { formatError, ErrorHandler } from '../utils/error-utils.js'
import { DictLoadStrategyFactory } from './dictionary-loading-strategies.js'

export class TWLinter {
  private dictManager: DictionaryManager
  private rules = new Map<string, Rule>()
  private config: TWLintConfig
  private deepMode = false

  constructor(config: TWLintConfig, options?: { deep?: boolean }) {
    this.config = config
    this.deepMode = options?.deep || false
    this.dictManager = new DictionaryManager()
    this.initializeRules()
  }

  private initializeRules(): void {
    // 註冊簡體字檢測規則
    this.rules.set('simplified-chars', new SimplifiedCharsRule())

    // 註冊大陸用語檢測規則 (需要詞庫管理器)
    this.rules.set('mainland-terms', new MainlandTermsRule(this.dictManager))
  }

  async lintFiles(patterns: string[]): Promise<LintResult[]> {
    const files = await this.expandFilePatterns(patterns)
    const results: LintResult[] = []

    for (const filePath of files) {
      try {
        const content = await readFile(filePath, 'utf-8')
        const issues = await this.lintText(content, filePath)
        results.push({
          filePath,
          messages: issues
        })
      } catch (error) {
        results.push({
          filePath,
          messages: [{
            line: 1,
            column: 1,
            message: `Failed to read file: ${formatError(error)}`,
            severity: 'error',
            rule: 'file-read-error',
            fixable: false
          }]
        })
      }
    }

    return results
  }

  async lintText(text: string, _filePath?: string): Promise<Issue[]> {
    await this.loadDictionaries(this.deepMode)

    const issues: Issue[] = []
    const activeRules = this.getActiveRules()

    // Process all active rules with unified preprocessing
    for (const rule of activeRules) {
      try {
        // Let rule handle its own text preprocessing
        const context = rule.preprocess
          ? await rule.preprocess(text)
          : { originalText: text, processedText: text }

        const ruleIssues = await rule.check(context.processedText)

        // Adjust positions if rule used text conversion
        const adjustedIssues = context.positionMapper
          ? this.adjustPositionsWithMapper(ruleIssues, context.positionMapper)
          : ruleIssues

        issues.push(...adjustedIssues)
      } catch (error) {
        ErrorHandler.handle(error, `Rule "${rule.name}"`)
      }
    }

    return issues
  }

  async fixText(text: string): Promise<string> {
    await this.loadDictionaries(this.deepMode)

    const activeRules = this.getActiveRules().filter(rule => rule.fix)
    let result = text

    // 按規則順序依次應用修復
    for (const rule of activeRules) {
      try {
        result = await rule.fix!(result)
      } catch (error) {
        ErrorHandler.handle(error, `Rule ${rule.name} fix`)
      }
    }

    return result
  }

  private async expandFilePatterns(patterns: string[]): Promise<string[]> {
    const files: string[] = []
    const ignorePatterns = await this.getIgnorePatterns()

    for (const pattern of patterns) {
      // 檢查是否為明確的檔案路徑（沒有萬用字元）
      const hasWildcards = pattern.includes('*') || pattern.includes('?') || pattern.includes('[')

      if (!hasWildcards) {
        // 明確的檔案路徑：直接加入，讓後續的檔案讀取來處理錯誤
        files.push(pattern)
      } else {
        // 萬用字元模式：使用 glob 擴展，遵循 .gitignore 規則
        const matches = await glob(pattern, {
          ignore: ignorePatterns,
          dot: false // 預設不包含隱藏檔案
        })
        files.push(...matches)
      }
    }

    return [...new Set(files)] // Remove duplicates
  }

  private async getIgnorePatterns(): Promise<string[]> {
    const defaultIgnores = [
      'node_modules/**',
      '.git/**',
      '.next/**',
      '.nuxt/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'logs/**',
      '*.log',
      '.env*',
      '.DS_Store',
      '.vscode/**',
      '.idea/**',
      'test-temp/**',
      '*.tmp'
    ]

    try {
      const { readFile } = await import('fs/promises')
      const gitignoreContent = await readFile('.gitignore', 'utf-8')

      const gitignorePatterns = gitignoreContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#')) // 排除空行和註解
        .map(line => {
          // 處理目錄模式
          if (line.endsWith('/')) {
            return line + '**'
          }
          // 處理檔案模式
          if (!line.includes('*') && !line.includes('/')) {
            return '**/' + line
          }
          return line
        })

      return [...defaultIgnores, ...gitignorePatterns]
    } catch {
      // 沒有 .gitignore 或讀取失敗，使用預設規則
      return defaultIgnores
    }
  }

  private async loadDictionaries(deep?: boolean): Promise<void> {
    const strategy = DictLoadStrategyFactory.create(this.config, deep)
    const dictNames = await strategy.getDictionaries(this.config, this.dictManager)

    for (const name of dictNames) {
      try {
        await this.dictManager.loadDictionary(name)
      } catch (error) {
        // 忽略無法載入的詞庫，但記錄警告
        ErrorHandler.handle(error, `Failed to load dictionary "${name}"`)
      }
    }
  }


  private getActiveRules(): Rule[] {
    const activeRules: Rule[] = []
    const rules = this.config.rules || {
      'simplified-chars': 'error',
      'mainland-terms': 'warning'
    }

    for (const [ruleName, severity] of Object.entries(rules)) {
      if (severity !== 'off') {
        const rule = this.rules.get(ruleName)
        if (rule) {
          activeRules.push(rule)
        }
      }
    }

    return activeRules
  }


  /**
   * 檢查規則是否啟用
   */
  private isRuleActive(ruleName: string): boolean {
    const rules = this.config.rules || {}
    return rules[ruleName] !== 'off'
  }

  /**
   * 使用 PositionMapper 調整位置映射
   */
  private adjustPositionsWithMapper(issues: Issue[], mapper: PositionMapper): Issue[] {
    return issues.map(issue => {
      const originalPos = mapper.mapToOriginal(issue.line, issue.column)
      return {
        ...issue,
        line: originalPos.line,
        column: originalPos.column
      }
    })
  }
}