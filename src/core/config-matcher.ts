import { minimatch } from 'minimatch'
import type { TWLintConfigRule } from './config-schema.js'

/**
 * 系統級忽略模式 - 鐵律，無論如何都不檢查這些檔案
 * 
 * "有些東西就是不該被碰。設定檔案就是其中之一。"
 * 
 * 這些模式優先於任何使用者設定，確保：
 * 1. 不會誤檢查敏感設定檔案（.env, .gitignore 等）
 * 2. 不會進入版本控制系統目錄（.git, .svn）
 * 3. 不會掃描第三方套件（node_modules）
 */
const SYSTEM_IGNORES = [
  // 版本控制系統
  '**/.git/**',
  '**/.svn/**',
  '**/.hg/**',
  
  // 第三方套件和相依性
  '**/node_modules/**',
  '**/vendor/**',
  
  // 設定檔案（鐵律：絕對不檢查）
  '**/.gitignore',
  '**/.dockerignore',
  '**/.npmignore',
  '**/.eslintignore',
  '**/.prettierignore',
  '**/.*ignore',  // 任何 *ignore 檔案
  
  // 環境變數和敏感資訊
  '**/.env',
  '**/.env.*',
  '**/.envrc',
  
  // 系統檔案
  '**/.DS_Store',
  '**/Thumbs.db',
  '**/desktop.ini',
  
  // 編輯器和 IDE 設定
  '**/.vscode/**',
  '**/.idea/**',
  '**/.vs/**',
  
  // 建構輸出
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/.next/**',
  '**/.nuxt/**',
  
  // 日誌和臨時檔案
  '**/*.log',
  '**/*.tmp',
  '**/*.temp',
  '**/logs/**'
] as const

/**
 * ConfigMatcher - 判斷檔案該套用哪些設定規則
 * 
 * 設計原則（Linus style）：
 * 1. 系統鐵律優先（SYSTEM_IGNORES 絕對不可覆寫）
 * 2. .twlintignore 檔案模式
 * 3. 線性掃描所有設定區塊
 * 4. 收集所有匹配的規則
 * 5. 後面的規則覆寫前面的（ESLint flat config 風格）
 */
export class ConfigMatcher {
  private twlintignorePatterns: string[] = []

  constructor(private configs: TWLintConfigRule | TWLintConfigRule[]) {}

  /**
   * 設定 .twlintignore 檔案的模式
   * 
   * 應該在建構後立即呼叫，從外部載入
   */
  setTwlintignorePatterns(patterns: string[]): void {
    this.twlintignorePatterns = patterns
  }

  /**
   * 判斷檔案是否應該被忽略
   * 
   * 邏輯：
   * 1. 系統鐵律（SYSTEM_IGNORES）最優先 - 絕對不可覆寫
   * 2. .twlintignore 檔案模式
   * 3. Global ignores（只有 ignores 屬性的設定）
   * 4. 檔案級別的 ignores
   */
  isIgnored(filePath: string): boolean {
    // 第一層：系統鐵律檢查（絕對優先）
    if (this.matchesAnyPattern(filePath, SYSTEM_IGNORES as readonly string[] as string[])) {
      return true
    }

    // 第二層：.twlintignore 檔案模式
    if (this.twlintignorePatterns.length > 0) {
      if (this.matchesAnyPattern(filePath, this.twlintignorePatterns)) {
        return true
      }
    }

    const configArray = Array.isArray(this.configs) ? this.configs : [this.configs]

    // 第三層：收集所有 global ignores（只有 ignores 屬性，沒有 files/rules）
    const globalIgnores = configArray
      .filter(config => config.ignores && !config.files && !config.rules)
      .flatMap(config => config.ignores!)

    // 檢查 global ignores
    if (this.matchesAnyPattern(filePath, globalIgnores)) {
      return true
    }

    // 檢查每個設定區塊的 ignores
    for (const config of configArray) {
      // 跳過 global ignore 區塊
      if (config.ignores && !config.files && !config.rules) {
        continue
      }

      // 如果有 files 限制，先檢查是否匹配
      if (config.files && !this.matchesAnyPattern(filePath, config.files)) {
        continue
      }

      // 檢查此區塊的 ignores
      if (config.ignores && this.matchesAnyPattern(filePath, config.ignores)) {
        return true
      }
    }

    return false
  }

  /**
   * 取得檔案適用的規則
   * 
   * 合併所有匹配設定區塊的規則，後面的覆寫前面的
   */
  getRulesForFile(filePath: string): Record<string, 'error' | 'warning' | 'info' | 'off'> {
    if (this.isIgnored(filePath)) {
      return {}
    }

    const configArray = Array.isArray(this.configs) ? this.configs : [this.configs]
    let mergedRules: Record<string, 'error' | 'warning' | 'info' | 'off'> = {}

    for (const config of configArray) {
      // 跳過 global ignore 區塊
      if (config.ignores && !config.files && !config.rules) {
        continue
      }

      // 檢查 files 模式
      if (config.files && !this.matchesAnyPattern(filePath, config.files)) {
        continue
      }

      // 檢查 ignores 模式
      if (config.ignores && this.matchesAnyPattern(filePath, config.ignores)) {
        continue
      }

      // 合併規則（後面的覆寫前面的）
      if (config.rules) {
        mergedRules = { ...mergedRules, ...config.rules }
      }
    }

    return mergedRules
  }

  /**
   * 取得檔案適用的詞庫/領域
   */
  getDomainsForFile(filePath: string): string[] {
    if (this.isIgnored(filePath)) {
      return []
    }

    const configArray = Array.isArray(this.configs) ? this.configs : [this.configs]
    const domains: string[] = []

    for (const config of configArray) {
      // 跳過 global ignore 區塊
      if (config.ignores && !config.files && !config.rules) {
        continue
      }

      // 檢查 files 模式
      if (config.files && !this.matchesAnyPattern(filePath, config.files)) {
        continue
      }

      // 檢查 ignores 模式
      if (config.ignores && this.matchesAnyPattern(filePath, config.ignores)) {
        continue
      }

      // 收集 domains（向後相容 dictionaries）
      if (config.domains) {
        domains.push(...config.domains)
      } else if (config.dictionaries) {
        domains.push(...config.dictionaries)
      }
    }

    return [...new Set(domains)] // 去重
  }

  /**
   * 檢查檔案路徑是否匹配任何 glob 模式
   * 
   * 邏輯：
   * 1. 分離正向模式和否定模式
   * 2. 先檢查正向模式是否匹配
   * 3. 如果匹配，檢查否定模式是否排除
   * 
   * "好品味"：消除 if/else 特殊情況，分離兩種邏輯
   */
  private matchesAnyPattern(filePath: string, patterns: string[]): boolean {
    const positivePatterns: string[] = []
    const negativePatterns: string[] = []

    // 分離正向和否定模式
    for (const pattern of patterns) {
      if (pattern.startsWith('!')) {
        negativePatterns.push(pattern.slice(1))
      } else {
        positivePatterns.push(pattern)
      }
    }

    // 檢查正向模式
    let matched = false
    for (const pattern of positivePatterns) {
      if (this.matchPattern(filePath, pattern)) {
        matched = true
        break
      }
    }

    // 如果沒有匹配任何正向模式，直接返回 false
    if (!matched) {
      return false
    }

    // 如果匹配了正向模式，檢查否定模式是否排除
    for (const pattern of negativePatterns) {
      if (this.matchPattern(filePath, pattern)) {
        return false // 被否定模式排除
      }
    }

    return true
  }

  /**
   * 使用 minimatch 進行 glob 匹配
   */
  private matchPattern(filePath: string, pattern: string): boolean {
    return minimatch(filePath, pattern, {
      dot: true,           // 匹配 .gitignore 等隱藏檔案
      matchBase: true,     // 允許不加 **/ 的模式匹配子目錄
    })
  }
}
