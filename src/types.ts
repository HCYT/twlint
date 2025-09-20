// Import PositionMapper directly to avoid type issues
import type { PositionMapper } from './core/position-mapper.js'

export interface Issue {
  line: number
  column: number
  message: string
  severity: 'error' | 'warning' | 'info'
  rule: string
  suggestions?: string[]
  fixable: boolean
}

export interface LintResult {
  filePath: string
  messages: Issue[]
}

export interface TWLintConfig {
  files?: string[]
  dictionaries?: string[]  // 舊的詞庫配置方式（向後相容）
  domains?: string[]       // 新的領域配置方式
  rules?: Record<string, 'error' | 'warning' | 'info' | 'off'>
}

export type MatchType = 'exact' | 'word_boundary' | 'context_sensitive'

export interface ContextRule {
  before?: string[]
  after?: string[]
  exclude?: string[]
}

export interface DictEntry {
  id: string
  taiwan: string
  china_simplified: string
  china_traditional: string
  english?: string
  confidence: number
  category: string
  reason: string
  domain: string
  match_type: MatchType
  context?: ContextRule
  autofix_safe?: boolean  // 是否可安全自動修正
}

export interface MatchResult {
  term: string
  replacement: string
  start: number
  end: number
  confidence: number
  rule: string
  autofix_safe?: boolean
}

export interface DictLookupEntry {
  taiwan: string
  confidence: number
  category: string
  reason: string
  match_type: MatchType
  context?: ContextRule
  autofix_safe?: boolean
}

export interface CompiledDict {
  metadata: {
    name: string
    version: string
    entries: number
  }
  lookup: Record<string, DictLookupEntry>
}

export interface MatchStrategy {
  name: MatchType
  match(text: string, term: string, context?: ContextRule): MatchResult[]
}

export interface TextProcessingContext {
  originalText: string
  processedText: string
  positionMapper?: PositionMapper
}

export interface Rule {
  name: string
  preprocess?(text: string): Promise<TextProcessingContext>
  check(text: string): Promise<Issue[]>
  fix?(text: string): Promise<string>
}

export interface Formatter {
  format(results: LintResult[]): string
}