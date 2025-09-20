import { readFile } from 'fs/promises'
import { join } from 'path'
import type { CompiledDict, DictEntry, MatchResult } from '../types.js'
import { MatchStrategyRegistry } from './matching/match-strategies.js'

export class DictionaryManager {
  private cache = new Map<string, CompiledDict>()
  private readonly dictionariesPath: string
  private readonly strategyRegistry: MatchStrategyRegistry

  constructor(dictionariesPath?: string) {
    this.dictionariesPath = dictionariesPath || join(process.cwd(), 'src', 'dictionaries')
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
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to load dictionary "${name}": ${message}`)
    }
  }

  findMatches(text: string): MatchResult[] {
    const allMatches: MatchResult[] = []
    const processedRanges = new Set<string>()

    for (const dict of this.cache.values()) {
      for (const [term, entry] of Object.entries(dict.lookup)) {
        const strategy = this.strategyRegistry.getStrategy(entry.match_type || 'exact')
        if (!strategy) continue

        const matches = strategy.match(text, term, entry.context)

        for (const match of matches) {
          const rangeKey = `${match.start}-${match.end}`

          // 避免重複匹配同一個位置
          if (!processedRanges.has(rangeKey)) {
            processedRanges.add(rangeKey)

            allMatches.push({
              ...match,
              replacement: entry.taiwan,
              confidence: entry.confidence,
              rule: `${dict.metadata.name}-${entry.match_type}`
            })
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