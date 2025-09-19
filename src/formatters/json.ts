import type { LintResult, Formatter } from '../types.js'

export class JsonFormatter implements Formatter {
  format(results: LintResult[]): string {
    const output = results.map(result => ({
      filePath: result.filePath,
      messages: result.messages.map(message => ({
        line: message.line,
        column: message.column,
        message: message.message,
        severity: message.severity,
        rule: message.rule,
        suggestions: message.suggestions || [],
        fixable: message.fixable
      }))
    }))

    return JSON.stringify(output, null, 2)
  }
}