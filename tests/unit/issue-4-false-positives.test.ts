
import { describe, it, expect, beforeEach } from 'vitest'
import { DictionaryManager } from '../../src/core/dictionary-manager'
import { MainlandTermsRule } from '../../src/core/rules/mainland-terms'

describe('Issue #4: False Positives (ACGN/Net Slang/Common Words)', () => {
    let dictManager: DictionaryManager
    let rule: MainlandTermsRule

    beforeEach(async () => {
        dictManager = new DictionaryManager()
        await dictManager.loadDictionary('core') // Load core dictionary for exemptions
        await dictManager.loadDictionary('software-development') // Contains "包" -> "套件"
        rule = new MainlandTermsRule(dictManager)
    })

    it('should not replace "包" in "包含" (contain)', async () => {
        const text = '這個功能包含多個模組'
        const issues = await rule.check(text)

        // Should NOT have any issues for "包含"
        const issue = issues.find(i => i.message.includes('包'))
        expect(issue).toBeUndefined()
    })

    it('should not replace "包" in "包括" (include)', async () => {
        const text = '其中包括三個部分'
        const issues = await rule.check(text)

        expect(issues.find(i => i.message.includes('包'))).toBeUndefined()
    })

    it('should still replace "软件包" (software package) or "包" when it means package', async () => {
        const text = '請下載這個源碼包'
        // "源碼包" -> Source Package. "包" here means Package.
        // If "源碼包" is not in dict, "包" should be matched.

        const issues = await rule.check(text)
        expect(issues.length).toBeGreaterThan(0)
        expect(issues[0].suggestions).toContain('套件')
    })
})
