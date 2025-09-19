import { readFile, access } from 'fs/promises'
import { join } from 'path'
import { validateConfig, DEFAULT_CONFIG } from './config-schema.js'
import type { TWLintConfig } from '../types.js'

export async function loadConfig(configPath?: string): Promise<TWLintConfig> {
  const paths = configPath
    ? [configPath]
    : [
        'twlint.config.js',
        'twlint.config.mjs',
        'twlint.config.ts',
        '.twlintrc.json',
        '.twlintrc'
      ]

  for (const path of paths) {
    try {
      await access(path)

      if (path.endsWith('.json') || path.endsWith('.twlintrc')) {
        const content = await readFile(path, 'utf-8')
        const userConfig = JSON.parse(content)
        return validateConfig(userConfig)
      }

      if (path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.ts')) {
        const fullPath = join(process.cwd(), path)

        try {
          const module = await import(fullPath)
          const userConfig = module.default || module
          return validateConfig(userConfig)
        } catch (importError) {
          // 如果是 ES module 匯入問題，嘗試其他方式
          if (path.endsWith('.js') || path.endsWith('.mjs')) {
            const content = await readFile(path, 'utf-8')

            // 簡單的配置檔案執行（僅支援 export default）
            if (content.includes('export default')) {
              console.warn(`Config file ${path} found but unable to import. Using default config.`)
              return DEFAULT_CONFIG
            }
          }
          throw importError
        }
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