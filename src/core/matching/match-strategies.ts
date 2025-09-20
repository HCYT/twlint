import type { MatchStrategy, MatchResult, ContextRule, MatchType } from '../../types.js'

/**
 * 匹配策略基類 - 統一上下文驗證邏輯
 */
abstract class BaseMatchStrategy implements MatchStrategy {
  abstract readonly name: MatchType
  abstract match(text: string, term: string, context?: ContextRule): MatchResult[]

  protected validateContext(text: string, term: string, index: number, context?: ContextRule): boolean {
    if (!context) return true

    const contextRange = this.getContextRange()
    const beforeText = text.substring(Math.max(0, index - contextRange), index)
    const afterText = text.substring(index + term.length, Math.min(text.length, index + term.length + contextRange))

    // Check exclude patterns
    if (context.exclude) {
      const surroundingText = beforeText + term + afterText
      for (const excludePattern of context.exclude) {
        if (surroundingText.includes(excludePattern)) {
          return false
        }
      }
    }

    // Check before context
    if (context.before) {
      const hasValidBefore = context.before.some(pattern => beforeText.includes(pattern))
      if (!hasValidBefore) return false
    }

    // Check after context
    if (context.after) {
      const hasValidAfter = context.after.some(pattern => afterText.includes(pattern))
      if (!hasValidAfter) return false
    }

    return true
  }

  protected getContextRange(): number {
    return 20 // 預設上下文檢查範圍
  }

  protected escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}

export class ExactMatchStrategy extends BaseMatchStrategy {
  readonly name = 'exact' as const

  match(text: string, term: string, context?: ContextRule): MatchResult[] {
    const results: MatchResult[] = []
    let startIndex = 0

     
    while (true) {
      const index = text.indexOf(term, startIndex)
      if (index === -1) break

      if (this.validateContext(text, term, index, context)) {
        results.push({
          term,
          replacement: '', // Will be filled by caller
          start: index,
          end: index + term.length,
          confidence: 1.0,
          rule: 'exact-match'
        })
      }

      startIndex = index + 1
    }

    return results
  }

}

export class WordBoundaryStrategy extends BaseMatchStrategy {
  readonly name = 'word_boundary' as const

  match(text: string, term: string, context?: ContextRule): MatchResult[] {
    const results: MatchResult[] = []

    // For Chinese text, word boundary is different from English \b
    // We need to check if the term is surrounded by non-Chinese characters or string boundaries
    const chineseWordPattern = new RegExp(`(?<![\\u4e00-\\u9fff])${this.escapeRegExp(term)}(?![\\u4e00-\\u9fff])`, 'g')

    let match: RegExpExecArray | null
    while ((match = chineseWordPattern.exec(text)) !== null) {
      const index = match.index

      if (this.validateContext(text, term, index, context)) {
        results.push({
          term,
          replacement: '', // Will be filled by caller
          start: index,
          end: index + term.length,
          confidence: 0.9,
          rule: 'word-boundary'
        })
      }
    }

    return results
  }

}

export class ContextSensitiveStrategy extends BaseMatchStrategy {
  readonly name = 'context_sensitive' as const

  match(text: string, term: string, context?: ContextRule): MatchResult[] {
    if (!context || (!context.before && !context.after)) {
      // Fallback to word boundary if no context specified
      return new WordBoundaryStrategy().match(text, term, context)
    }

    const results: MatchResult[] = []
    let startIndex = 0

     
    while (true) {
      const index = text.indexOf(term, startIndex)
      if (index === -1) break

      if (this.validateContext(text, term, index, context)) {
        results.push({
          term,
          replacement: '', // Will be filled by caller
          start: index,
          end: index + term.length,
          confidence: 0.8,
          rule: 'context-sensitive'
        })
      }

      startIndex = index + 1
    }

    return results
  }

  protected getContextRange(): number {
    return 50 // 語境敏感策略需要更大的檢查範圍
  }
}

export class MatchStrategyRegistry {
  private strategies = new Map<string, MatchStrategy>()

  constructor() {
    this.registerDefaults()
  }

  private registerDefaults(): void {
    this.register(new ExactMatchStrategy())
    this.register(new WordBoundaryStrategy())
    this.register(new ContextSensitiveStrategy())
  }

  register(strategy: MatchStrategy): void {
    this.strategies.set(strategy.name, strategy)
  }

  getStrategy(name: string): MatchStrategy | undefined {
    return this.strategies.get(name)
  }

  getAllStrategies(): MatchStrategy[] {
    return Array.from(this.strategies.values())
  }
}