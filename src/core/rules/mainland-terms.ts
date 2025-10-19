import type { Rule, Issue, TextProcessingContext } from '../../types.js'
import type { DictionaryManager } from '../dictionary-manager.js'
import { PositionMapper } from '../position-mapper.js'
import { Converter } from 'opencc-js'

export class MainlandTermsRule implements Rule {
  readonly name = 'mainland-terms'
  private dictManager: DictionaryManager
  private converter: ReturnType<typeof Converter>

  constructor(dictManager: DictionaryManager) {
    this.dictManager = dictManager
    this.converter = Converter({ from: 'cn', to: 'tw' })
  }

  async preprocess(text: string): Promise<TextProcessingContext> {
    // Convert simplified to traditional for better matching
    const convertedText = this.converter(text)
    const positionMapper = new PositionMapper(text, convertedText)

    return {
      originalText: text,
      processedText: convertedText,
      positionMapper
    }
  }

  async check(text: string): Promise<Issue[]> {
    const issues: Issue[] = []
    const matches = this.dictManager.findMatches(text)

    for (const match of matches) {
      // 過濾假陽性：如果建議詞和原詞相同，跳過
      if (match.term === match.replacement) {
        continue
      }

      const lineInfo = this.getLineInfo(text, match.start)

      // 根據 autofix_safe 決定訊息和可修復性
      const isContextSensitive = match.rule.includes('context_sensitive')
      const message = isContextSensitive
        ? `可能的大陸用語 '${match.term}' 建議使用臺灣用語 '${match.replacement}' (請確認語境)`
        : `大陸用語 '${match.term}' 建議使用臺灣用語 '${match.replacement}'`

      issues.push({
        line: lineInfo.line,
        column: lineInfo.column,
        message,
        severity: match.autofix_safe ? 'warning' : 'info',
        rule: this.name,
        suggestions: [match.replacement],
        fixable: match.autofix_safe || false
      })
    }

    return issues
  }

  async fix(text: string): Promise<string> {
    let fixedText = text
    const matches = this.dictManager.findMatches(text)

    // 只修正標記為安全的詞彙，並過濾假陽性（term === replacement）
    const safeMatches = matches.filter(match => 
      match.autofix_safe && match.term !== match.replacement
    )

    // Sort by position (from end to start) to avoid offset issues
    const sortedMatches = safeMatches.sort((a, b) => b.start - a.start)

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