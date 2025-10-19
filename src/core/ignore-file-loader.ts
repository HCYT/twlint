import { readFile, access } from 'fs/promises'
import { resolve } from 'path'

/**
 * IgnoreFileLoader - 載入 .twlintignore 檔案
 * 
 * 類似 ESLint 的 .eslintignore 功能
 */
export class IgnoreFileLoader {
  /**
   * 嘗試載入 .twlintignore 檔案
   * 
   * @param cwd 當前工作目錄
   * @returns ignore patterns 陣列，找不到檔案時回傳空陣列
   */
  static async load(cwd: string = process.cwd()): Promise<string[]> {
    const ignoreFilePath = resolve(cwd, '.twlintignore')

    try {
      await access(ignoreFilePath)
      const content = await readFile(ignoreFilePath, 'utf-8')
      return this.parseIgnoreFile(content)
    } catch {
      // 找不到 .twlintignore 檔案，回傳空陣列
      return []
    }
  }

  /**
   * 解析 .twlintignore 檔案內容
   * 
   * 格式規則：
   * - 每行一個 glob pattern
   * - # 開頭為註解
   * - 空行會被忽略
   * - 目錄結尾 / 會自動轉換為 /**
   */
  private static parseIgnoreFile(content: string): string[] {
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => {
        // 過濾空行和註解
        if (!line) return false
        if (line.startsWith('#')) return false
        return true
      })
      .map(line => {
        // 處理目錄模式（結尾 /）
        if (line.endsWith('/')) {
          return line + '**'
        }
        
        // 如果模式不包含 / 和 *，加上 **/ 前綴以匹配任何深度
        if (!line.includes('/') && !line.includes('*')) {
          return '**/' + line
        }
        
        return line
      })
  }

  /**
   * 檢查 .twlintignore 檔案是否存在
   */
  static async exists(cwd: string = process.cwd()): Promise<boolean> {
    const ignoreFilePath = resolve(cwd, '.twlintignore')
    try {
      await access(ignoreFilePath)
      return true
    } catch {
      return false
    }
  }
}
