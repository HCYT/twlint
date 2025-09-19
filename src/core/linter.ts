import { glob } from 'glob'
import { readFile } from 'fs/promises'
import { DictionaryManager } from './dictionary-manager.js'
import { SimplifiedCharsRule } from './rules/simplified-chars.js'
import { MainlandTermsRule } from './rules/mainland-terms.js'
import type { LintResult, Issue, TWLintConfig, Rule } from '../types.js'

export class TWLinter {
  private dictManager: DictionaryManager
  private rules = new Map<string, Rule>()
  private config: TWLintConfig

  constructor(config: TWLintConfig) {
    this.config = config
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
    // Load dictionaries based on configuration
    await this.loadDictionaries()

    const issues: Issue[] = []
    const activeRules = this.getActiveRules()

    for (const rule of activeRules) {
      const ruleIssues = await rule.check(text)
      issues.push(...ruleIssues)
    }

    return issues
  }

  async fixText(text: string): Promise<string> {
    // 確保詞庫已載入
    await this.loadDictionaries()

    let fixedText = text
    const activeRules = this.getActiveRules()

    // 按照優先級排序：先修復簡體字，再修復大陸用語
    const orderedRules = activeRules.sort((a, b) => {
      const priority = { 'simplified-chars': 1, 'mainland-terms': 2 }
      return (priority[a.name as keyof typeof priority] || 99) -
             (priority[b.name as keyof typeof priority] || 99)
    })

    for (const rule of orderedRules) {
      if (rule.fix) {
        try {
          fixedText = await rule.fix(fixedText)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          console.warn(`Warning: Failed to apply fix for rule ${rule.name}: ${message}`)
        }
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

  private async loadDictionaries(): Promise<void> {
    const dictNames = this.config.dictionaries || ['core']

    for (const name of dictNames) {
      await this.dictManager.loadDictionary(name)
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
}