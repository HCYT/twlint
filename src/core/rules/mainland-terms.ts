import type { Rule, Issue } from '../../types.js'
import type { DictionaryManager } from '../dictionary-manager.js'

export class MainlandTermsRule implements Rule {
  readonly name = 'mainland-terms'
  private dictManager: DictionaryManager

  constructor(dictManager: DictionaryManager) {
    this.dictManager = dictManager
  }

  async check(text: string): Promise<Issue[]> {
    const issues: Issue[] = []
    const matches = this.dictManager.findMatches(text)

    for (const match of matches) {
      const lineInfo = this.getLineInfo(text, match.start)

      issues.push({
        line: lineInfo.line,
        column: lineInfo.column,
        message: `大陸用語 '${match.term}' 建議使用臺灣用語 '${match.replacement}'`,
        severity: 'warning',
        rule: this.name,
        suggestions: [match.replacement],
        fixable: true
      })
    }

    return issues
  }

  async fix(text: string): Promise<string> {
    let fixedText = text
    const matches = this.dictManager.findMatches(text)

    // Sort by position (from end to start) to avoid offset issues
    const sortedMatches = matches.sort((a, b) => b.start - a.start)

    for (const match of sortedMatches) {
      // Replace using precise position information
      fixedText = fixedText.substring(0, match.start) +
                  match.replacement +
                  fixedText.substring(match.end)
    }

    return fixedText
  }

  private getLineInfo(text: string, offset: number): { line: number; column: number } {
    const lines = text.substring(0, offset).split('\n')
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1
    }
  }
}