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
  }>
}

export interface Rule {
  name: string
  check(text: string): Promise<Issue[]>
  fix?(text: string): Promise<string>
}

export interface Formatter {
  format(results: LintResult[]): string
}