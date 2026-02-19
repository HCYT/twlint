import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DictionaryManager } from '../../src/core/dictionary-manager.js'
import { readFile } from 'fs/promises'

// Mock fs/promises
vi.mock('fs/promises', () => ({
    readFile: vi.fn(),
    readdir: vi.fn().mockResolvedValue([])
}))

describe('Issue #3 Reproduction: Longest Match First', () => {
    let dictManager: DictionaryManager

    beforeEach(() => {
        vi.clearAllMocks()
        dictManager = new DictionaryManager()
    })

    it('should prioritize longer matches and avoid overlapping short matches', async () => {
        // Mock dictionary content to include both "Algorithm" (演算法) and "Arithmetic/Algorithm" (算法)
        // Note: In real world, "算法" (suanfa) is Mainland for Algorithm, "演算法" is TW.
        // If input is "演算法", we don't want to flag "算法" inside it.
        const mockDict = {
            metadata: { name: 'issue3-dict', version: '1.0' },
            lookup: {
                '算法': {
                    taiwan: '演算法',
                    confidence: 0.8,
                    match_type: 'exact'
                },
                '演算法': {
                    taiwan: '演算法',
                    confidence: 1.0,
                    match_type: 'exact'
                }
            }
        }

        vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockDict))

        await dictManager.loadDictionary('issue3-dict')

        const text = '我們正在研究新的演算法設計'
        const matches = dictManager.findMatches(text)

        // Current behavior (Pre-fix): Returns both "演算法" and "算法"
        // Desired behavior (Post-fix): Should ONLY match "演算法"

        const terms = matches.map(m => m.term)

        // This expectation should FAIL before the fix
        expect(terms).toContain('演算法')
        expect(terms).not.toContain('算法')
    })

    it('should still match short terms when they are valid standalone', async () => {
        const mockDict = {
            metadata: { name: 'issue3-dict', version: '1.0' },
            lookup: {
                '算法': {
                    taiwan: '演算法',
                    confidence: 0.8,
                    match_type: 'exact'
                }
            }
        }

        vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockDict))
        await dictManager.loadDictionary('issue3-dict')

        const text = '這個算法很複雜'
        const matches = dictManager.findMatches(text)

        const terms = matches.map(m => m.term)
        expect(terms).toContain('算法')
    })
    it('should handle triple overlap (Short < Medium < Long)', async () => {
        // Scenario: "電" (Electricity) < "電腦" (Computer) < "個人電腦" (Personal Computer)
        // Text: "這是一台個人電腦"
        // Expected: Only "個人電腦" matches.
        const mockDict = {
            metadata: { name: 'triple-overlap', version: '1.0' },
            lookup: {
                '電': { taiwan: '電', confidence: 0.5 },
                '電腦': { taiwan: '電腦', confidence: 0.8 },
                '個人電腦': { taiwan: '個人電腦', confidence: 1.0 }
            }
        }

        vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockDict))
        await dictManager.loadDictionary('triple-overlap')

        const text = '這是一台個人電腦'
        const matches = dictManager.findMatches(text)
        const terms = matches.map(m => m.term)

        expect(terms).toContain('個人電腦')
        expect(terms).not.toContain('電腦')
        expect(terms).not.toContain('電')
        expect(matches).toHaveLength(1)
    })

    it('should handle partial overlap where longer term wins', async () => {
        // Scenario: "ABC" (Length 3) vs "BCD" (Length 3, but lower confidence?) or "BCDE" (Length 4)
        // Text: "ABCDE"
        // Case 1: "ABCD" (4) vs "BCDE" (4). If length same, check confidence.
        // Let's test Length wins first.
        // Dict: "ABC" (3), "BCDE" (4)
        // Text: "ABCDE"
        // "ABC" matches [0, 3], "BCDE" matches [1, 5]
        // "BCDE" (Len 4) > "ABC" (Len 3). "BCDE" wins.
        // "ABC" overlaps with "BCDE" ([0,3] vs [1,5] -> overlap 1-3).
        // Since "BCDE" is accepted first, "ABC" should be rejected.

        const mockDict = {
            metadata: { name: 'partial-overlap', version: '1.0' },
            lookup: {
                'ABC': { taiwan: 'ABC_TW', confidence: 0.9 },
                'BCDE': { taiwan: 'BCDE_TW', confidence: 0.9 }
            }
        }

        vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockDict))
        await dictManager.loadDictionary('partial-overlap')

        const text = 'ABCDE'
        const matches = dictManager.findMatches(text)
        const terms = matches.map(m => m.term)

        expect(terms).toContain('BCDE') // Longer term
        expect(terms).not.toContain('ABC') // Short overlapping term discarded
    })

    it('should handle adjacent terms (No overlap)', async () => {
        // Scenario: "算法" "設計"
        // Text: "算法設計"
        // Expected: Both "算法" and "設計" match.
        const mockDict = {
            metadata: { name: 'adjacent', version: '1.0' },
            lookup: {
                '算法': { taiwan: '演算法', confidence: 0.8 },
                '設計': { taiwan: '設計', confidence: 0.8 }
            }
        }

        vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockDict))
        await dictManager.loadDictionary('adjacent')

        const text = '算法設計'
        const matches = dictManager.findMatches(text)
        const terms = matches.map(m => m.term)

        expect(terms).toContain('算法')
        expect(terms).toContain('設計')
        expect(matches).toHaveLength(2)

        // Ensure order is preserved by position
        expect(terms[0]).toBe('算法')
        expect(terms[1]).toBe('設計')
    })
})
