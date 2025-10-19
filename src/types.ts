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
  ignores?: string[]       // 忽略模式（glob patterns）
  dictionaries?: string[]  // 舊的詞庫設定方式（向後相容）
  domains?: string[]       // 新的領域設定方式
  rules?: Record<string, 'error' | 'warning' | 'info' | 'off'>
}

// 支援單一設定或設定陣列（ESLint flat config 風格）
export type TWLintUserConfig = TWLintConfig | TWLintConfig[]

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