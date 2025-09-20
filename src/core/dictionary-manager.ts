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
    const processedRanges = new Map<string, MatchResult>() // 改為 Map 來追蹤最佳匹配

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
          this.addMatchWithPriority(allMatches, processedRanges, match, entry, dict.metadata.name)
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
              this.addMatchWithPriority(allMatches, processedRanges, match, variantEntry, dict.metadata.name, true)
            }
          }
        }
      }
    }

    // 按信心度和位置排序：高信心度優先，相同信心度則按位置順序
    return allMatches.sort((a, b) => {
      if (Math.abs(a.confidence - b.confidence) > 0.01) {
        return b.confidence - a.confidence
      }
      return a.start - b.start
    })
  }

  private addMatchWithPriority(
    allMatches: MatchResult[],
    processedRanges: Map<string, MatchResult>,
    match: MatchResult,
    entry: DictLookupEntry,
    dictName: string,
    isVariant = false
  ): void {
    const rangeKey = `${match.start}-${match.end}`

    const newMatch: MatchResult = {
      ...match,
      replacement: entry.taiwan,
      confidence: entry.confidence,
      rule: `${dictName}-${entry.match_type || 'exact'}${isVariant ? '-variant' : ''}`,
      autofix_safe: entry.autofix_safe || false
    }

    // 如果這個範圍還沒有匹配，或者新匹配的信心度更高
    const existingMatch = processedRanges.get(rangeKey)
    if (!existingMatch || newMatch.confidence > existingMatch.confidence) {
      if (existingMatch) {
        // 移除舊的匹配
        const index = allMatches.indexOf(existingMatch)
        if (index > -1) {
          allMatches.splice(index, 1)
        }
      }

      processedRanges.set(rangeKey, newMatch)
      allMatches.push(newMatch)
    }
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