import { glob } from 'glob'
import { readFile } from 'fs/promises'
import { DictionaryManager } from './dictionary-manager.js'
import { SimplifiedCharsRule } from './rules/simplified-chars.js'
import { MainlandTermsRule } from './rules/mainland-terms.js'
import { PositionMapper } from './position-mapper.js'
import { ConfigMatcher } from './config-matcher.js'
import { IgnoreFileLoader } from './ignore-file-loader.js'
import type { LintResult, Issue, TWLintUserConfig, Rule } from '../types.js'
import { formatError, ErrorHandler } from '../utils/error-utils.js'
import { DictLoadStrategyFactory } from './dictionary-loading-strategies.js'

export class TWLinter {
  private dictManager: DictionaryManager
  private rules = new Map<string, Rule>()
  private config: TWLintUserConfig
  private deepMode = false
  private configMatcher: ConfigMatcher
  private twlintignoreLoaded = false

  constructor(config: TWLintUserConfig, options?: { deep?: boolean }) {
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

  async lintText(text: string, filePath?: string): Promise<Issue[]> {
    // 根據檔案路徑載入對應的詞庫
    await this.loadDictionariesForFile(filePath)

    const issues: Issue[] = []
    const activeRules = this.getActiveRulesForFile(filePath)

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

  async fixText(text: string, filePath?: string): Promise<string> {
    await this.loadDictionariesForFile(filePath)

    const activeRules = this.getActiveRulesForFile(filePath).filter(rule => rule.fix)
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
        // 明確的檔案路徑：直接加入，但要檢查設定的 ignores
        if (!this.configMatcher.isIgnored(pattern)) {
          files.push(pattern)
        }
      } else {
        // 萬用字元模式：使用 glob 擴展
        const matches = await glob(pattern, {
          ignore: baseIgnorePatterns,
          dot: false // 預設不包含隱藏檔案
        })
        // 過濾掉設定中 ignores 的檔案
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

  /**
   * 根據檔案路徑載入對應的詞庫
   */
  private async loadDictionariesForFile(filePath?: string): Promise<void> {
    if (this.deepMode) {
      // Deep mode: 載入所有可用詞庫
      const strategy = DictLoadStrategyFactory.create(Array.isArray(this.config) ? this.config[0] : this.config, true)
      const dictNames = await strategy.getDictionaries(Array.isArray(this.config) ? this.config[0] : this.config, this.dictManager)
      for (const name of dictNames) {
        try {
          await this.dictManager.loadDictionary(name)
        } catch (error) {
          ErrorHandler.handle(error, `Failed to load dictionary "${name}"`)
        }
      }
      return
    }

    // 根據檔案獲取對應的 domains
    const domains = filePath ? this.configMatcher.getDomainsForFile(filePath) : []
    
    // 組合要載入的詞庫：core (永遠載入) + domains
    const dictNames: string[] = ['core']  // 永遠包含 core
    
    if (domains.length > 0) {
      dictNames.push(...domains)
    } else {
      // 如果沒有指定 domains，使用設定中的 dictionaries
      const defaultDicts = this.getDefaultDictionaries().filter(d => d !== 'core')
      dictNames.push(...defaultDicts)
    }

    for (const name of dictNames) {
      try {
        await this.dictManager.loadDictionary(name)
      } catch (error) {
        ErrorHandler.handle(error, `Failed to load dictionary "${name}"`)
      }
    }
  }

  /**
   * 取得預設詞庫列表
   */
  private getDefaultDictionaries(): string[] {
    const config = Array.isArray(this.config) ? this.config[0] : this.config
    return config.dictionaries || ['core']
  }

  /**
   * 舊方法保留向後相容
   */
  private async loadDictionaries(deep?: boolean): Promise<void> {
    const config = Array.isArray(this.config) ? this.config[0] : this.config
    const strategy = DictLoadStrategyFactory.create(config, deep)
    const dictNames = await strategy.getDictionaries(config, this.dictManager)

    for (const name of dictNames) {
      try {
        await this.dictManager.loadDictionary(name)
      } catch (error) {
        // 忽略無法載入的詞庫，但記錄警告
        ErrorHandler.handle(error, `Failed to load dictionary "${name}"`)
      }
    }
  }


  /**
   * 根據檔案路徑獲取適用的規則
   */
  private getActiveRulesForFile(filePath?: string): Rule[] {
    const activeRules: Rule[] = []
    
    // 如果有檔案路徑，使用 ConfigMatcher 獲取檔案特定的規則
    const rules = filePath 
      ? this.configMatcher.getRulesForFile(filePath)
      : this.getDefaultRules()

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
   * 取得預設規則
   */
  private getDefaultRules(): Record<string, 'error' | 'warning' | 'info' | 'off'> {
    const config = Array.isArray(this.config) ? this.config[0] : this.config
    return config.rules || {
      'simplified-chars': 'error',
      'mainland-terms': 'warning'
    }
  }

  /**
   * 舊方法保留向後相容
   */
  private getActiveRules(): Rule[] {
    return this.getActiveRulesForFile(undefined)
  }


  /**
   * 檢查規則是否啟用
   */
  private isRuleActive(ruleName: string): boolean {
    const config = Array.isArray(this.config) ? this.config[0] : this.config
    const rules = config.rules || {}
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