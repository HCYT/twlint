import { glob } from 'glob'
import { readFile } from 'fs/promises'
import { DictionaryManager } from './dictionary-manager.js'
import { SimplifiedCharsRule } from './rules/simplified-chars.js'
import { MainlandTermsRule } from './rules/mainland-terms.js'
import { PositionMapper } from './position-mapper.js'
import { ConfigMatcher } from './config-matcher.js'
import { IgnoreFileLoader } from './ignore-file-loader.js'
import type { LintResult, Issue, TWLintConfig, Rule } from '../types.js'
import { formatError, ErrorHandler } from '../utils/error-utils.js'
import { DictLoadStrategyFactory } from './dictionary-loading-strategies.js'

export class TWLinter {
  private dictManager: DictionaryManager
  private rules = new Map<string, Rule>()
  private config: TWLintConfig
  private deepMode = false
  private configMatcher: ConfigMatcher
  private twlintignoreLoaded = false

  constructor(config: TWLintConfig, options?: { deep?: boolean }) {
    this.config = config
    this.deepMode = options?.deep || false
    this.dictManager = new DictionaryManager()
    this.configMatcher = new ConfigMatcher(config)
    this.initializeRules()
  }

  /**
   * 載入 .twlintignore 檔案（如果存在）
   * 
   * 這個方法會在第一次需要時自動呼叫
   */
  private async loadTwlintignore(): Promise<void> {
    if (this.twlintignoreLoaded) return

    const patterns = await IgnoreFileLoader.load()
    if (patterns.length > 0) {
      this.configMatcher.setTwlintignorePatterns(patterns)
    }

    this.twlintignoreLoaded = true
  }

  private initializeRules(): void {
    // 註冊簡體字檢測規則
    this.rules.set('simplified-chars', new SimplifiedCharsRule())

    // 註冊大陸用語檢測規則 (需要詞庫管理器)
    this.rules.set('mainland-terms', new MainlandTermsRule(this.dictManager))
  }

  async lintFiles(patterns: string[]): Promise<LintResult[]> {
    // 載入 .twlintignore（如果存在）
    await this.loadTwlintignore()

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
    const baseIgnorePatterns = await this.getBaseIgnorePatterns()

    for (const pattern of patterns) {
      // 檢查是否為明確的檔案路徑（沒有萬用字元）
      const hasWildcards = pattern.includes('*') || pattern.includes('?') || pattern.includes('[')

      if (!hasWildcards) {
        // 明確的檔案路徑：直接加入，但要檢查配置的 ignores
        if (!this.configMatcher.isIgnored(pattern)) {
          files.push(pattern)
        }
      } else {
        // 萬用字元模式：使用 glob 擴展
        const matches = await glob(pattern, {
          ignore: baseIgnorePatterns,
          dot: false // 預設不包含隱藏檔案
        })
        // 過濾掉配置中 ignores 的檔案
        const filtered = matches.filter(file => !this.configMatcher.isIgnored(file))
        files.push(...filtered)
      }
    }

    return [...new Set(files)] // Remove duplicates
  }

  /**
   * 取得基礎忽略模式（僅用於 glob 擴展時的初步過濾）
   * 
   * 注意：
   * - 系統鐵律（SYSTEM_IGNORES）已在 ConfigMatcher 處理
   * - 這裡只需要最基本的過濾，避免 glob 擴展時掃描過多檔案
   */
  private async getBaseIgnorePatterns(): Promise<string[]> {
    // 只保留最基本的過濾，其餘交給 ConfigMatcher
    const baseIgnores = [
      'node_modules/**',
      '.git/**'
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

      return [...baseIgnores, ...gitignorePatterns]
    } catch {
      // 沒有 .gitignore 或讀取失敗，使用預設規則
      return baseIgnores
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