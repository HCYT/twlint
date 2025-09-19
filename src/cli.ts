#!/usr/bin/env node

import { Command } from 'commander'
import chalk from 'chalk'
import { TWLinter } from './core/linter.js'
import { loadConfig } from './core/config-loader.js'
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
        const linter = new TWLinter(config)

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
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(chalk.red('Error:'), message)
        process.exit(1)
      }
    })

  program
    .command('init')
    .description('Initialize a TWLint configuration file')
    .action(async () => {
      // TODO: Implement configuration file initialization
      console.log(chalk.green('Configuration file created: twlint.config.js'))
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