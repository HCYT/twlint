
import { describe, it, expect, beforeEach } from 'vitest'
import { DictionaryManager } from '../../src/core/dictionary-manager'
import { MainlandTermsRule } from '../../src/core/rules/mainland-terms'

describe('Issue #3: Partial Loop / Recursion Regression', () => {
    let rule: MainlandTermsRule
    let manager: DictionaryManager

    beforeEach(async () => {
        manager = new DictionaryManager()
        await manager.loadDictionary('core')
        await manager.loadDictionary('software-development') // Assuming '算法' is in this dict
        rule = new MainlandTermsRule(manager)
    })

    it('should not flag "演算法" just because it contains "算法"', async () => {
        const text = '我們使用演算法來解決問題。'
        const issues = await rule.check(text)

        // Since we don't have index/length in Issue interface easily available without casting,
        // we check if any issue's message contains '算法' and suggestion is '演算法'
        // AND if the coverage matches the specific location.
        // For now, simple check: does it error on "演算法" (which is valid)?

        // If "演算法" triggers an error, it means "算法" inside it was matched.
        // The error message for "算法" -> "演算法" would be present.

        const incorrectMatch = issues.find(i => i.message.includes('演算法') && text.substring(i.column - 1, i.column - 1 + 2) === '算法')

        expect(incorrectMatch).toBeUndefined()
    })

    it('should correctly flag "算法" when it stands alone', async () => {
        const text = '這個算法效率很高。'
        const issues = await rule.check(text)

        expect(issues).toHaveLength(1)
        expect(issues[0].message).toContain('演算法')
    })

    it('should handle "類別" (Class) vs "類" (Category/Type)', async () => {
        const text = '這是一個類別。' // Valid
        const issues = await rule.check(text)
        expect(issues).toHaveLength(0)
    })

    it('should handle "雲端" (Cloud) vs "雲" (Cloud)', async () => {
        const text = '雲端技術。' // Valid
        const issues = await rule.check(text)
        expect(issues).toHaveLength(0)
    })
})
