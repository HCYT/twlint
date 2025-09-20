#!/usr/bin/env node

import { Command } from 'commander'
import chalk from 'chalk'
import { writeFile, access } from 'fs/promises'
import { TWLinter } from './core/linter.js'
import { loadConfig } from './core/config-loader.js'
import { createSampleConfig } from './core/config-schema.js'
import { StylishFormatter } from './formatters/stylish.js'
import { JsonFormatter } from './formatters/json.js'
import { formatError } from './utils/error-utils.js'

export interface CLIOptions {
  fix?: boolean
  deep?: boolean
  format?: 'stylish' | 'json'
  dict?: string[]
  config?: string
  verbose?: boolean
}

async function performCheck(linter: TWLinter, files: string[], options: CLIOptions): Promise<void> {
  // 檢查是否找到任何檔案
  if (files.length === 0) {
    console.error(chalk.red('✖ No files found matching the pattern.'))
    process.exit(1)
  }

  const results = await linter.lintFiles(files)

  const formatter = options.format === 'json'
    ? new JsonFormatter()
    : new StylishFormatter()

  const output = formatter.format(results)
  console.log(output)

  const errorCount = results.reduce((sum, result) =>
    sum + result.messages.filter(msg => msg.severity === 'error').length, 0)
  const warningCount = results.reduce((sum, result) =>
    sum + result.messages.filter(msg => msg.severity === 'warning').length, 0)
  const fixableCount = results.reduce((sum, result) =>
    sum + result.messages.filter(msg => msg.fixable !== false).length, 0)

  // 檢查是否所有檔案都載入失敗
  const fileReadErrors = results.filter(result =>
    result.messages.some(msg => msg.rule === 'file-read-error')
  )

  if (fileReadErrors.length === results.length && results.length > 0) {
    // 在顯示詳細錯誤後，再顯示匯總錯誤訊息
    console.error(chalk.red('✖ Failed to read any of the specified files.'))
    process.exit(1)
  }

  // ESLint 風格的修復提示（僅在非 JSON 格式時顯示）
  if (errorCount > 0 || warningCount > 0) {
    if (fixableCount > 0 && options.format !== 'json') {
      console.log(chalk.yellow(`\n  ${fixableCount} problem${fixableCount === 1 ? '' : 's'} potentially fixable with the \`--fix\` option.`))
    }
    process.exit(errorCount > 0 ? 1 : 0)
  }
}

async function performAutoFix(linter: TWLinter, files: string[], options: CLIOptions): Promise<void> {
  const { readFile } = await import('fs/promises')
  let totalFixed = 0

  for (const filePath of files) {
    try {
      const originalContent = await readFile(filePath, 'utf-8')
      const fixedContent = await linter.fixText(originalContent)

      if (originalContent !== fixedContent) {
        await writeFile(filePath, fixedContent, 'utf-8')
        totalFixed++

        if (options.verbose) {
          console.log(chalk.green(`✓ Fixed: ${filePath}`))
        }
      } else if (options.verbose) {
        console.log(chalk.dim(`○ No changes: ${filePath}`))
      }
    } catch (error) {
      console.error(chalk.red(`✗ Error fixing ${filePath}:`), formatError(error))
    }
  }

  console.log(chalk.green(`\n🎉 Fixed ${totalFixed} file(s)`))

  // 修復後重新檢查，顯示剩餘問題
  if (totalFixed > 0) {
    console.log(chalk.dim('\n--- Remaining issues after fix ---'))
    await performCheck(linter, files, { ...options, fix: false })
  }
}

async function performInit(force?: boolean): Promise<void> {
  const configFile = 'twlint.config.js'

  // 檢查是否已存在配置檔案
  try {
    await access(configFile)
    if (!force) {
      console.log(chalk.yellow(`⚠️  Configuration file ${configFile} already exists.`))
      console.log(chalk.dim('Use --force to overwrite it.'))
      return
    }
  } catch {
    // 檔案不存在，可以繼續建立
  }

  // 建立配置檔案
  const configContent = createSampleConfig()
  await writeFile(configFile, configContent, 'utf-8')

  console.log(chalk.green(`✅ Created ${configFile}`))

  // 檢查是否有 package.json，提供 npm script 整合建議
  try {
    await access('package.json')
    console.log(chalk.dim('\n📦 Detected package.json - Add these scripts for better integration:'))
    console.log(chalk.cyan(`
{
  "scripts": {
    "twlint": "twlint check **/*.md **/*.txt",
    "twlint:fix": "twlint check **/*.md **/*.txt --fix",
    "twlint:code": "twlint check 'src/**/*.{js,ts,jsx,tsx,vue}'",
    "twlint:all": "twlint check **/*.md **/*.txt 'src/**/*.{js,ts,jsx,tsx,vue}'",
    "twlint:all:fix": "twlint check **/*.md **/*.txt 'src/**/*.{js,ts,jsx,tsx,vue}' --fix"
  }
}`))
    console.log(chalk.dim('Then run:'))
    console.log(chalk.dim('• npm run twlint        # 檢查文件'))
    console.log(chalk.dim('• npm run twlint:fix    # 檢查並修復文件'))
    console.log(chalk.dim('• npm run twlint:code   # 檢查程式碼中的中文'))
    console.log(chalk.dim('• npm run twlint:all    # 檢查所有檔案'))
    console.log(chalk.dim('• npm run twlint:all:fix # 檢查並修復所有檔案'))
  } catch {
    // 沒有 package.json，顯示一般指引
  }

  console.log(chalk.dim('\n🚀 Next steps:'))
  console.log(chalk.dim('1. Customize the configuration to fit your needs'))
  console.log(chalk.dim('2. Run: twlint check **/*.md'))
  console.log(chalk.dim('3. Use --fix to automatically fix issues'))
}

async function main() {
  const program = new Command()

  program
    .name('twlint')
    .description('A CLI tool for detecting simplified Chinese terms and suggesting Taiwan traditional alternatives')
    .version('1.0.0')

  program
    .command('check')
    .description('Check files for Chinese term issues')
    .argument('<files...>', 'Files or patterns to check')
    .option('--fix', 'Automatically fix issues where possible')
    .option('--deep', 'Enable deep checking with all dictionaries')
    .option('--format <type>', 'Output format (stylish, json)', 'stylish')
    .option('--dict <names...>', 'Specify dictionaries to use')
    .option('--config <path>', 'Path to configuration file')
    .option('--verbose', 'Enable verbose output')
    .action(async (files: string[], options: CLIOptions) => {
      try {
        const config = await loadConfig(options.config)

        // 如果指定了 --dict 選項，覆蓋配置中的詞庫設定
        if (options.dict) {
          config.dictionaries = options.dict
        }

        const linter = new TWLinter(config, { deep: options.deep })

        if (options.deep && options.verbose) {
          console.log(chalk.dim('🔍 Deep mode enabled - loading all available dictionaries'))
        }

        if (options.fix) {
          // 自動修復模式
          await performAutoFix(linter, files, options)
        } else {
          // 檢查模式
          await performCheck(linter, files, options)
        }
      } catch (error) {
        console.error(chalk.red('Error:'), formatError(error))
        process.exit(1)
      }
    })

  program
    .command('init')
    .description('Initialize a TWLint configuration file')
    .option('--force', 'Overwrite existing configuration file')
    .action(async (options: { force?: boolean }) => {
      try {
        await performInit(options.force)
      } catch (error) {
        console.error(chalk.red('Error:'), formatError(error))
        process.exit(1)
      }
    })

  await program.parseAsync()
}

// 當作為主模組執行時啟動 CLI
if (import.meta.url === `file://${process.argv[1]}` ||
    process.argv[1]?.endsWith('cli.js')) {
  main().catch(error => {
    console.error(chalk.red('Fatal error:'), formatError(error))
    process.exit(1)
  })
}