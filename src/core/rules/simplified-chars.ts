import { Converter } from 'opencc-js'
import type { Rule, Issue } from '../../types.js'

export class SimplifiedCharsRule implements Rule {
  readonly name = 'simplified-chars'
  private converter: ReturnType<typeof Converter>

  constructor() {
    // 簡體到繁體的轉換器
    this.converter = Converter({ from: 'cn', to: 'tw' })
  }

  async check(text: string): Promise<Issue[]> {
    const issues: Issue[] = []
    const lines = text.split('\n')

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex]
      const convertedLine = this.converter(line)

      // 如果轉換後的內容不同，表示原文包含簡體字
      if (line !== convertedLine) {
        const differences = this.findDifferences(line, convertedLine)

        for (const diff of differences) {
          issues.push({
            line: lineIndex + 1,
            column: diff.column + 1,
            message: `簡體字 '${diff.simplified}' 建議使用繁體字 '${diff.traditional}'`,
            severity: 'error',
            rule: this.name,
            suggestions: [diff.traditional],
            fixable: true
          })
        }
      }
    }

    return issues
  }

  async fix(text: string): Promise<string> {
    // 使用 opencc 進行簡繁轉換
    return this.converter(text)
  }

  private findDifferences(
    original: string,
    converted: string
  ): Array<{ simplified: string; traditional: string; column: number }> {
    const differences: Array<{ simplified: string; traditional: string; column: number }> = []

    for (let i = 0; i < Math.min(original.length, converted.length); i++) {
      if (original[i] !== converted[i]) {
        differences.push({
          simplified: original[i],
          traditional: converted[i],
          column: i
        })
      }
    }

    return differences
  }
}