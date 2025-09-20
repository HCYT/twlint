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
  dictionaries?: string[]
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
}

export interface MatchResult {
  term: string
  replacement: string
  start: number
  end: number
  confidence: number
  rule: string
}

export interface CompiledDict {
  metadata: {
    name: string
    version: string
    entries: number
  }
  lookup: Record<string, {
    taiwan: string
    confidence: number
    category: string
    reason: string
    match_type: MatchType
    context?: ContextRule
  }>
}

export interface MatchStrategy {
  name: MatchType
  match(text: string, term: string, context?: ContextRule): MatchResult[]
}

export interface Rule {
  name: string
  check(text: string): Promise<Issue[]>
  fix?(text: string): Promise<string>
}

export interface Formatter {
  format(results: LintResult[]): string
}