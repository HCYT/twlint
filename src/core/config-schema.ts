// TWLint 配置檔案結構定義和驗證

export interface TWLintConfigRule {
  files?: string[]
  dictionaries?: string[]
  rules?: Record<string, 'error' | 'warning' | 'info' | 'off'>
}

export type TWLintConfigArray = TWLintConfigRule[]
export type TWLintConfigSingle = TWLintConfigRule

// 支援單一配置物件或配置陣列
export type TWLintUserConfig = TWLintConfigSingle | TWLintConfigArray

export const DEFAULT_CONFIG: TWLintConfigSingle = {
  files: ['**/*.md', '**/*.txt'],
  dictionaries: ['core'],
  rules: {
    'simplified-chars': 'error',
    'mainland-terms': 'warning'
  }
}

export function validateConfig(config: unknown): TWLintConfigSingle {
  if (!config || typeof config !== 'object') {
    return DEFAULT_CONFIG
  }

  // 如果是陣列，合併所有配置
  if (Array.isArray(config)) {
    return mergeConfigs(config)
  }

  // 單一配置物件
  return mergeConfig(DEFAULT_CONFIG, config as Partial<TWLintConfigSingle>)
}

function mergeConfigs(configs: unknown[]): TWLintConfigSingle {
  let merged = { ...DEFAULT_CONFIG }

  for (const config of configs) {
    if (config && typeof config === 'object') {
      merged = mergeConfig(merged, config as Partial<TWLintConfigSingle>)
    }
  }

  return merged
}

function mergeConfig(
  defaultConfig: TWLintConfigSingle,
  userConfig: Partial<TWLintConfigSingle>
): TWLintConfigSingle {
  return {
    files: userConfig.files || defaultConfig.files,
    dictionaries: userConfig.dictionaries || defaultConfig.dictionaries,
    rules: {
      ...defaultConfig.rules,
      ...userConfig.rules
    }
  }
}

export function createSampleConfig(): string {
  return `// TWLint 配置檔案
// 專注於核心功能：簡繁轉換 + 大陸用語檢測

export default [
  {
    // 檢查的檔案類型
    files: ["**/*.md", "**/*.txt"],

    // 使用的詞庫
    dictionaries: ["core"],

    // 規則配置
    rules: {
      "simplified-chars": "error",      // 簡體字檢測（自動修復）
      "mainland-terms": "warning"       // 大陸用語檢測（提供建議）
    }
  }
]

// 使用方式:
// twlint check **/*.md                // 檢查檔案
// twlint check **/*.md --fix          // 自動修復`
}