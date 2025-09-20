import { describe, it, expect, beforeEach } from 'vitest'
import { DictionaryManager } from '../../src/core/dictionary-manager.js'

describe('DictionaryManager', () => {
  let dictManager: DictionaryManager

  beforeEach(() => {
    dictManager = new DictionaryManager()
  })

  describe('loadDictionary', () => {
    it('should load core dictionary successfully', async () => {
      await expect(dictManager.loadDictionary('core')).resolves.not.toThrow()
    })

    it('should cache loaded dictionaries', async () => {
      // 第一次載入
      const dict1 = await dictManager.loadDictionary('core')
      // 第二次載入應該從緩存取得
      const dict2 = await dictManager.loadDictionary('core')

      expect(dict1).toBe(dict2) // 應該是同一個物件引用
    })

    it('should throw error for non-existent dictionary', async () => {
      await expect(dictManager.loadDictionary('non-existent')).rejects.toThrow()
    })
  })

  describe('findMatches', () => {
    beforeEach(async () => {
      await dictManager.loadDictionary('core')
    })

    it('should find mainland terms in text', async () => {
      const text = '软件开发需要网络连接'
      const matches = dictManager.findMatches(text)

      expect(matches.length).toBeGreaterThan(0)
      expect(matches.some(match => match.term === '软件')).toBe(true)
      expect(matches.some(match => match.term === '网络')).toBe(true)
    })

    it('should return Taiwan alternatives', async () => {
      const text = '软件'
      const matches = dictManager.findMatches(text)

      expect(matches.length).toBeGreaterThan(0)
      const softwareMatch = matches.find(match => match.term === '软件')
      expect(softwareMatch?.replacement).toBe('軟體')
    })

    it('should include confidence scores', async () => {
      const text = '软件'
      const matches = dictManager.findMatches(text)

      expect(matches.length).toBeGreaterThan(0)
      expect(matches.every(match => typeof match.confidence === 'number')).toBe(true)
      expect(matches.every(match => match.confidence >= 0 && match.confidence <= 1)).toBe(true)
    })

    it('should sort matches by confidence descending', async () => {
      const text = '软件网络程序' // 包含多個詞彙
      const matches = dictManager.findMatches(text)

      expect(matches.length).toBeGreaterThan(1)

      // 檢查是否按信心度降序排列
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i - 1].confidence).toBeGreaterThanOrEqual(matches[i].confidence)
      }
    })

    it('should not return duplicates for same position', async () => {
      const text = '软件软件软件' // 重複的詞彙但在不同位置
      const matches = dictManager.findMatches(text)

      // 檢查沒有重複的位置範圍
      const uniqueRanges = new Set(matches.map(match => `${match.start}-${match.end}`))
      expect(uniqueRanges.size).toBe(matches.length)

      // 應該找到 3 個匹配（不同位置的相同詞彙）
      expect(matches.length).toBe(3)
    })

    it('should return empty array for text without mainland terms', async () => {
      const text = 'Hello World 你好世界'
      const matches = dictManager.findMatches(text)

      expect(matches).toHaveLength(0)
    })
  })

  describe('getAvailableDictionaries', () => {
    it('should return list of available dictionaries', () => {
      const dictionaries = dictManager.getAvailableDictionaries()

      expect(Array.isArray(dictionaries)).toBe(true)
      expect(dictionaries).toContain('core')
    })
  })

  describe('clearCache', () => {
    it('should clear the dictionary cache', async () => {
      // 載入詞庫
      await dictManager.loadDictionary('core')

      // 清理緩存
      dictManager.clearCache()

      // 檢查緩存是否被清空（這裡我們通過重新查找來間接驗證）
      const text = '软件'
      const matches = dictManager.findMatches(text)

      expect(matches).toHaveLength(0) // 緩存清空後應該找不到匹配
    })
  })
})