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

        // info 級別用不同圖示和顏色
        const infoIcon = severity === 'info' ? chalk.blue('ℹ') : icon
        const infoSeverityText = severity === 'info' ? chalk.blue('info') : severityText

        output += `  ${String(line).padStart(3)}:${String(column).padEnd(3)} ${infoIcon} ${infoSeverityText}  ${msg}  ${chalk.dim(rule)}\n`

        if (severity === 'error') totalErrors++
        if (severity === 'warning') totalWarnings++
      }
    }

    if (totalErrors > 0 || totalWarnings > 0) {
      output += `\n${chalk.red('✖')} ${totalErrors + totalWarnings} problems (${totalErrors} errors, ${totalWarnings} warnings)`

      // 修復提示由 CLI 統一處理，這裡不輸出
    } else {
      output += `\n${chalk.green('✓')} No problems found!`
    }

    return output
  }
}