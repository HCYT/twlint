import type { MatchStrategy, MatchResult, ContextRule } from '../../types.js'

export class ExactMatchStrategy implements MatchStrategy {
  name = 'exact' as const

  match(text: string, term: string, context?: ContextRule): MatchResult[] {
    const results: MatchResult[] = []
    let startIndex = 0

    while (true) {
      const index = text.indexOf(term, startIndex)
      if (index === -1) break

      if (this.isValidMatch(text, term, index, context)) {
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

  private isValidMatch(text: string, term: string, index: number, context?: ContextRule): boolean {
    if (!context) return true

    const beforeText = text.substring(Math.max(0, index - 20), index)
    const afterText = text.substring(index + term.length, Math.min(text.length, index + term.length + 20))

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
}

export class WordBoundaryStrategy implements MatchStrategy {
  name = 'word_boundary' as const

  match(text: string, term: string, context?: ContextRule): MatchResult[] {
    const results: MatchResult[] = []

    // For Chinese text, word boundary is different from English \b
    // We need to check if the term is surrounded by non-Chinese characters or string boundaries
    const chineseWordPattern = new RegExp(`(?<![\\u4e00-\\u9fff])${this.escapeRegExp(term)}(?![\\u4e00-\\u9fff])`, 'g')

    let match: RegExpExecArray | null
    while ((match = chineseWordPattern.exec(text)) !== null) {
      const index = match.index

      if (this.isValidMatch(text, term, index, context)) {
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

  private isValidMatch(text: string, term: string, index: number, context?: ContextRule): boolean {
    if (!context) return true

    const beforeText = text.substring(Math.max(0, index - 20), index)
    const afterText = text.substring(index + term.length, Math.min(text.length, index + term.length + 20))

    // Check exclude patterns
    if (context.exclude) {
      const surroundingText = beforeText + term + afterText
      for (const excludePattern of context.exclude) {
        if (surroundingText.includes(excludePattern)) {
          return false
        }
      }
    }

    return true
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}

export class ContextSensitiveStrategy implements MatchStrategy {
  name = 'context_sensitive' as const

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

      if (this.isValidContext(text, term, index, context)) {
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

  private isValidContext(text: string, term: string, index: number, context: ContextRule): boolean {
    const beforeText = text.substring(Math.max(0, index - 50), index)
    const afterText = text.substring(index + term.length, Math.min(text.length, index + term.length + 50))

    // Check exclude patterns first
    if (context.exclude) {
      const surroundingText = beforeText + term + afterText
      for (const excludePattern of context.exclude) {
        if (surroundingText.includes(excludePattern)) {
          return false
        }
      }
    }

    // Must match before context if specified
    if (context.before) {
      const hasValidBefore = context.before.some(pattern => beforeText.includes(pattern))
      if (!hasValidBefore) return false
    }

    // Must match after context if specified
    if (context.after) {
      const hasValidAfter = context.after.some(pattern => afterText.includes(pattern))
      if (!hasValidAfter) return false
    }

    return true
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