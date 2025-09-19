import { readFile, access } from 'fs/promises'
import { join } from 'path'
import type { TWLintConfig } from '../types.js'

const DEFAULT_CONFIG: TWLintConfig = {
  files: ['**/*.md', '**/*.txt'],
  dictionaries: ['core'],
  rules: {
    'simplified-chars': 'error',
    'mainland-terms': 'warning',
    'context-sensitive': 'info'
  }
}

export async function loadConfig(configPath?: string): Promise<TWLintConfig> {
  const paths = configPath
    ? [configPath]
    : [
        'twlint.config.js',
        'twlint.config.mjs',
        '.twlintrc.json',
        '.twlintrc'
      ]

  for (const path of paths) {
    try {
      await access(path)

      if (path.endsWith('.json') || path.endsWith('.twlintrc')) {
        const content = await readFile(path, 'utf-8')
        const config = JSON.parse(content)
        return mergeConfig(DEFAULT_CONFIG, config)
      }

      if (path.endsWith('.js') || path.endsWith('.mjs')) {
        const fullPath = join(process.cwd(), path)
        const module = await import(fullPath)
        const config = module.default || module
        return mergeConfig(DEFAULT_CONFIG, config)
      }
    } catch (error) {
      if (configPath) {
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(`Failed to load config from "${configPath}": ${message}`)
      }
      // Continue to next path if no specific config was requested
    }
  }

  // Return default config if no config file found
  return DEFAULT_CONFIG
}

function mergeConfig(defaultConfig: TWLintConfig, userConfig: Partial<TWLintConfig>): TWLintConfig {
  return {
    files: userConfig.files || defaultConfig.files,
    dictionaries: userConfig.dictionaries || defaultConfig.dictionaries,
    rules: {
      ...defaultConfig.rules,
      ...userConfig.rules
    }
  }
}