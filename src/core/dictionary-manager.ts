import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { CompiledDict, MatchResult, DictLookupEntry } from '../types.js'
import { formatError } from '../utils/error-utils.js'
import { MatchStrategyRegistry } from './matching/match-strategies.js'
import { LRUCache } from './lru-cache.js'

export class DictionaryManager {
  private cache = new LRUCache<string, CompiledDict>(20) // 限制快取 20 個詞庫
  private readonly dictionariesPath: string
  private readonly strategyRegistry: MatchStrategyRegistry

  constructor(dictionariesPath?: string, maxCacheSize?: number) {
    // 初始化快取，支援自定義大小
    this.cache = new LRUCache<string, CompiledDict>(maxCacheSize || 20)

    if (dictionariesPath) {
      this.dictionariesPath = dictionariesPath
    } else {
      // 動態解析詞庫路徑：相對於編譯後的 JS 檔案位置
      const currentDir = dirname(fileURLToPath(import.meta.url))
      this.dictionariesPath = join(currentDir, '..', 'dictionaries')
    }
    this.strategyRegistry = new MatchStrategyRegistry()
  }

  async loadDictionary(name: string): Promise<CompiledDict> {
    if (this.cache.has(name)) {
      return this.cache.get(name)!
    }

    try {
      const dictPath = join(this.dictionariesPath, `${name}.json`)
      const content = await readFile(dictPath, 'utf-8')
      const dict: CompiledDict = JSON.parse(content)

      this.cache.set(name, dict)
      return dict
    } catch (error) {
      throw new Error(`Failed to load dictionary "${name}": ${formatError(error)}`)
    }
  }

  findMatches(text: string): MatchResult[] {
    const allMatches: MatchResult[] = []

    for (const dict of this.cache.values()) {
      // 先處理所有基本詞彙匹配
      const basicTerms = Object.keys(dict.lookup).filter(term => !term.includes('_'))
      const contextVariants = Object.keys(dict.lookup).filter(term => term.includes('_'))

      // 處理基本詞彙
      for (const term of basicTerms) {
        const entry = dict.lookup[term]
        const strategy = this.strategyRegistry.getStrategy(entry.match_type || 'exact')
        if (!strategy) continue

        const matches = strategy.match(text, term, entry.context)

        for (const match of matches) {
          this.addMatch(allMatches, match, entry, dict.metadata.name)
        }

        // 對於語境敏感詞彙，同時檢查其變體
        if (entry.match_type === 'context_sensitive') {
          const variants = contextVariants.filter(variant =>
            variant.startsWith(term + '_') || variant.startsWith(term.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '') + '_')
          )

          for (const variant of variants) {
            const variantEntry = dict.lookup[variant]
            const variantStrategy = this.strategyRegistry.getStrategy(variantEntry.match_type || 'exact')
            if (!variantStrategy) continue

            const variantMatches = variantStrategy.match(text, term, variantEntry.context)

            for (const match of variantMatches) {
              this.addMatch(allMatches, match, variantEntry, dict.metadata.name, true)
            }
          }
        }
      }
    }

    // 1. 排序：優先長度，其次信心度，最後位置
    // Sort logic: Longest length > Higher confidence > Earlier position
    allMatches.sort((a, b) => {
      const lenA = a.end - a.start
      const lenB = b.end - b.start
      if (lenA !== lenB) return lenB - lenA // Longest first

      if (Math.abs(a.confidence - b.confidence) > 0.01) {
        return b.confidence - a.confidence // Higher confidence first
      }

      return a.start - b.start // Earlier position first
    })

    // 2. 去重：過濾掉與高優先級匹配重疊的結果
    // Deduplication: Filter out overlapping matches
    const acceptedMatches: MatchResult[] = []

    for (const candidate of allMatches) {
      const isOverlapping = acceptedMatches.some(accepted => {
        // Check for overlap: 
        // candidate starts before accepted ends AND candidate ends after accepted starts
        return candidate.start < accepted.end && candidate.end > accepted.start
      })

      if (!isOverlapping) {
        acceptedMatches.push(candidate)
      }
    }

    // 3. 最終排序：按位置輸出，符合閱讀順序
    // Final sort: By position for readability
    return acceptedMatches.sort((a, b) => a.start - b.start)
  }

  private addMatch(
    allMatches: MatchResult[],
    match: MatchResult,
    entry: DictLookupEntry,
    dictName: string,
    isVariant = false
  ): void {
    allMatches.push({
      ...match,
      replacement: entry.taiwan,
      confidence: entry.confidence,
      rule: `${dictName}-${entry.match_type || 'exact'}${isVariant ? '-variant' : ''}`,
      autofix_safe: entry.autofix_safe || false
    })
  }

  async scanAvailableDictionaries(): Promise<string[]> {
    try {
      const { readdir } = await import('fs/promises')
      const files = await readdir(this.dictionariesPath)

      return files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''))
        .filter(name => name !== 'index') // 排除索引文件
    } catch {
      console.warn(`Failed to scan dictionary directory: ${this.dictionariesPath}`)
      return []
    }
  }

  getLoadedDictionaries(): string[] {
    return Array.from(this.cache.keys())
  }

  clearCache(): void {
    this.cache.clear()
  }

  // Legacy method for backward compatibility - delegates to scanAvailableDictionaries
  getAvailableDictionaries(): string[] {
    console.warn('getAvailableDictionaries() is deprecated. Use scanAvailableDictionaries() instead.')
    return ['core', 'academic', 'extended'] // Fallback hardcoded list
  }
}