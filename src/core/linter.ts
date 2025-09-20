import { glob } from 'glob'
import { readFile } from 'fs/promises'
import { DictionaryManager } from './dictionary-manager.js'
import { SimplifiedCharsRule } from './rules/simplified-chars.js'
import { MainlandTermsRule } from './rules/mainland-terms.js'
import { PositionMapper } from './position-mapper.js'
import { Converter } from 'opencc-js'
import type { LintResult, Issue, TWLintConfig, Rule } from '../types.js'

export class TWLinter {
  private dictManager: DictionaryManager
  private rules = new Map<string, Rule>()
  private config: TWLintConfig
  private deepMode = false
  private converter: ReturnType<typeof Converter>

  constructor(config: TWLintConfig, options?: { deep?: boolean }) {
    this.config = config
    this.deepMode = options?.deep || false
    this.dictManager = new DictionaryManager()
    this.converter = Converter({ from: 'cn', to: 'tw' })
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
        const message = error instanceof Error ? error.message : String(error)
        results.push({
          filePath,
          messages: [{
            line: 1,
            column: 1,
            message: `Failed to read file: ${message}`,
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
    await this.loadDictionaries(this.deepMode)

    const issues: Issue[] = []
    const activeRules = this.getActiveRules()

    // Process all active rules
    for (const rule of activeRules) {
      try {
        let textToCheck = text
        let positionMapper: PositionMapper | undefined

        // Apply text conversion if needed (for mainland-terms rule)
        if (rule.name === 'mainland-terms') {
          const convertedText = this.convertToTraditional(text)
          textToCheck = convertedText
          positionMapper = new PositionMapper(text, convertedText)
        }

        const ruleIssues = await rule.check(textToCheck)

        // Adjust positions if we used converted text
        const adjustedIssues = positionMapper
          ? this.adjustPositionsWithMapper(ruleIssues, positionMapper)
          : ruleIssues

        issues.push(...adjustedIssues)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`Warning: Rule "${rule.name}" failed: ${message}`)
      }
    }

    return issues
  }

  async fixText(text: string): Promise<string> {
    // 確保詞庫已載入
    await this.loadDictionaries(this.deepMode)

    let fixedText = text

    // 階段1：簡繁轉換修復
    const simplifiedRule = this.rules.get('simplified-chars')
    if (simplifiedRule && this.isRuleActive('simplified-chars') && simplifiedRule.fix) {
      try {
        fixedText = await simplifiedRule.fix(fixedText)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`Warning: Failed to apply simplified-chars fix: ${message}`)
      }
    }

    // 階段2：大陸用語修復（在轉換後的文本上進行）
    const mainlandRule = this.rules.get('mainland-terms')
    if (mainlandRule && this.isRuleActive('mainland-terms') && mainlandRule.fix) {
      try {
        fixedText = await mainlandRule.fix(fixedText)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`Warning: Failed to apply mainland-terms fix: ${message}`)
      }
    }


    return fixedText
  }

  private async expandFilePatterns(patterns: string[]): Promise<string[]> {
    const files: string[] = []

    for (const pattern of patterns) {
      const matches = await glob(pattern, { ignore: 'node_modules/**' })
      files.push(...matches)
    }

    return [...new Set(files)] // Remove duplicates
  }

  private async loadDictionaries(deep?: boolean): Promise<void> {
    let dictNames = this.config.dictionaries || ['core']

    // 深度模式：載入所有可用詞庫
    if (deep) {
      const availableDicts = this.dictManager.getAvailableDictionaries()
      dictNames = [...new Set([...dictNames, ...availableDicts])]
    }

    for (const name of dictNames) {
      try {
        await this.dictManager.loadDictionary(name)
      } catch (error) {
        // 忽略無法載入的詞庫，但記錄警告
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`Warning: Failed to load dictionary "${name}": ${message}`)
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
   * 使用 opencc-js 將簡體中文轉換為繁體中文
   */
  private convertToTraditional(text: string): string {
    return this.converter(text)
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