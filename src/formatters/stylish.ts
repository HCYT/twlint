import chalk from 'chalk'
import type { LintResult, Formatter } from '../types.js'

export class StylishFormatter implements Formatter {
  format(results: LintResult[]): string {
    let output = ''
    let totalErrors = 0
    let totalWarnings = 0

    for (const result of results) {
      if (result.messages.length === 0) continue

      output += `\n${chalk.underline(result.filePath)}\n`

      for (const message of result.messages) {
        const { line, column, severity, message: msg, rule } = message
        const icon = severity === 'error' ? chalk.red('✖') : chalk.yellow('⚠')
        const severityText = severity === 'error' ? chalk.red('error') : chalk.yellow('warning')

        output += `  ${String(line).padStart(3)}:${String(column).padEnd(3)} ${icon} ${severityText}  ${msg}  ${chalk.dim(rule)}\n`

        if (severity === 'error') totalErrors++
        if (severity === 'warning') totalWarnings++
      }
    }

    if (totalErrors > 0 || totalWarnings > 0) {
      output += `\n${chalk.red('✖')} ${totalErrors + totalWarnings} problems (${totalErrors} errors, ${totalWarnings} warnings)`

      const fixableErrors = results.reduce((sum, result) =>
        sum + result.messages.filter(msg => msg.fixable && msg.severity === 'error').length, 0)
      const fixableWarnings = results.reduce((sum, result) =>
        sum + result.messages.filter(msg => msg.fixable && msg.severity === 'warning').length, 0)

      if (fixableErrors > 0 || fixableWarnings > 0) {
        output += `\n  ${fixableErrors + fixableWarnings} problems potentially fixable with the \`--fix\` option`
        if (fixableErrors > 0 && fixableWarnings > 0) {
          output += ` (${fixableErrors} errors, ${fixableWarnings} warnings).`
        } else if (fixableErrors > 0) {
          output += ` (${fixableErrors} errors).`
        } else {
          output += ` (${fixableWarnings} warnings).`
        }
      }
    } else {
      output += `\n${chalk.green('✓')} No problems found!`
    }

    return output
  }
}