import { readFile } from 'fs/promises'
import { join } from 'path'
import type { CompiledDict, DictEntry } from '../types.js'

export class DictionaryManager {
  private cache = new Map<string, CompiledDict>()
  private readonly dictionariesPath = join(process.cwd(), 'src', 'dictionaries')

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

  findMatches(text: string): DictEntry[] {
    const matches: DictEntry[] = []
    const foundTerms = new Set<string>() // 避免重複匹配

    for (const dict of this.cache.values()) {
      for (const [term, entry] of Object.entries(dict.lookup)) {
        if (text.includes(term) && !foundTerms.has(term)) {
          foundTerms.add(term)

          matches.push({
            id: `${dict.metadata.name}-${term}`,
            taiwan: entry.taiwan,
            china_simplified: term,
            china_traditional: term,
            confidence: entry.confidence,
            category: entry.category,
            reason: entry.reason,
            domain: dict.metadata.name
          })
        }
      }
    }

    // 按照信心度排序，高信心度的優先
    return matches.sort((a, b) => b.confidence - a.confidence)
  }

  getAvailableDictionaries(): string[] {
    // TODO: Scan dictionaries directory and return available dictionary names
    return ['core', 'academic', 'extended']
  }

  clearCache(): void {
    this.cache.clear()
  }
}