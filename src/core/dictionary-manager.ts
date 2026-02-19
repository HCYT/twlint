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
    // Deduplication using Interval Merging (O(N log N) or O(N) since already sorted by length?)
    // Actually, simply maintaining a list of disjoint intervals is enough.
    // Since matches are sorted by Length DESC, we iterate and check if the current match
    // overlaps with ANY already accepted match.
    // To do this efficiently:
    // We can use a simple boolean array if text is short, but text can be long.
    // Better: Maintain a sorted list of accepted intervals [start, end).
    // For each candidate, check if it overlaps with any interval in the list.
    // Since we process in priority order, if it doesn't overlap, we add it.

    const acceptedMatches: MatchResult[] = []

    // 為了效能，我們實作一個簡單的區間檢查
    // 由於我們可能有大量的匹配，線性掃描 acceptedMatches (O(M)) 對每個候選 (N) -> O(NM)。
    // 如果 M 很大，這會慢。
    // 優化：使用一個簡單的遮罩或區間樹？
    // 考量到 JS 的 overhead，對於一般長度的文本，線性掃描可能已經足夠快。
    // 但 Reviewer 提到效能，我們來做一個稍微好一點的檢查。
    // 我們可以使用一個 Uint8Array 來標記被佔用的位置，如果文本長度允許 (e.g. < 1MB)。
    // 這是 O(1) 檢查，O(L) 標記。

    // 如果文本太長，回退到區間檢查。
    // 假設大部分檢查的文本都在 100KB 以內。

    if (text.length < 100000) {
      const occupied = new Uint8Array(text.length)
      for (const candidate of allMatches) {
        let isOverlapping = false
        // Check overlap
        for (let i = candidate.start; i < candidate.end; i++) {
          if (occupied[i] === 1) {
            isOverlapping = true
            break
          }
        }

        if (!isOverlapping) {
          acceptedMatches.push(candidate)
          // Mark occupied
          for (let i = candidate.start; i < candidate.end; i++) {
            occupied[i] = 1
          }
        }
      }
    } else {
      // Fallback for very long text: Interval List
      // Keep intervals sorted by start
      const acceptedIntervals: { start: number, end: number }[] = []

      for (const candidate of allMatches) {
        // Binary search or linear scan? Linear scan is O(M).
        // Check overlap with any accepted interval
        const isOverlapping = acceptedIntervals.some(interval =>
          candidate.start < interval.end && candidate.end > interval.start
        )

        if (!isOverlapping) {
          acceptedMatches.push(candidate)
          acceptedIntervals.push({ start: candidate.start, end: candidate.end })
          // No need to sort acceptedIntervals every time if we just use .some()
          // But for binary search we would need to maintain order.
          // Given the typical number of matches, .some() is acceptable here compared to strict O(N^2) if M is small.
          // Wait, previous logic WAS O(N*M) where M is accepted count. This is same.
          // But Uint8Array is O(N * Len).
        }
      }
    }

    // 3. 最終排序：按位置輸出，符合閱讀順序
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