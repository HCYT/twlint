#!/usr/bin/env node

import { Command } from 'commander'
import chalk from 'chalk'
import { writeFile, access } from 'fs/promises'
import { TWLinter } from './core/linter.js'
import { loadConfig } from './core/config-loader.js'
import { createSampleConfig } from './core/config-schema.js'
import { StylishFormatter } from './formatters/stylish.js'
import { JsonFormatter } from './formatters/json.js'

export interface CLIOptions {
  fix?: boolean
  deep?: boolean
  format?: 'stylish' | 'json'
  dict?: string[]
  config?: string
  verbose?: boolean
}

async function performCheck(linter: TWLinter, files: string[], options: CLIOptions): Promise<void> {
  const results = await linter.lintFiles(files)

  const formatter = options.format === 'json'
    ? new JsonFormatter()
    : new StylishFormatter()

  const output = formatter.format(results)
  console.log(output)

  const errorCount = results.reduce((sum, result) =>
    sum + result.messages.filter(msg => msg.severity === 'error').length, 0)

  if (errorCount > 0) {
    process.exit(1)
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
      const message = error instanceof Error ? error.message : String(error)
      console.error(chalk.red(`✗ Error fixing ${filePath}:`), message)
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
  console.log(chalk.dim('\nNext steps:'))
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
        const message = error instanceof Error ? error.message : String(error)
        console.error(chalk.red('Error:'), message)
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
        const message = error instanceof Error ? error.message : String(error)
        console.error(chalk.red('Error:'), message)
        process.exit(1)
      }
    })

  await program.parseAsync()
}

if (import.meta.url.endsWith(process.argv[1])) {
  main().catch(error => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(chalk.red('Fatal error:'), message)
    process.exit(1)
  })
}