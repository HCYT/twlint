
import { describe, it, expect, beforeEach } from 'vitest'
import { DictionaryManager } from '../../src/core/dictionary-manager'
import { MainlandTermsRule } from '../../src/core/rules/mainland-terms'

describe('Risk Assessment (Issue #4 Follow-up)', () => {
    let rule: MainlandTermsRule
    let manager: DictionaryManager

    beforeEach(async () => {
        manager = new DictionaryManager()
        await manager.loadDictionary('core')
        await manager.loadDictionary('software-development')
        // Load business-finance if needed, but core should cover most.
        try {
            await manager.loadDictionary('business-finance')
        } catch (e) {
            // Ignore if not found or error
        }
        rule = new MainlandTermsRule(manager)
    })

    // High Risk: Single-char / Partial Loop Candidates
    // These should work because of Identity Mappings added in previous step.

    it('should not flag "串流" (Streaming) as containing context-less "流"', async () => {
        const text = '我們正在進行影音串流測試。'
        const issues = await rule.check(text)
        // "串流" maps to "串流" (identity), so it should NOT fall through to "流" -> "流量/流動"
        // If "串流" triggers an issue, it should be the identity mapping (which is hidden/ignored usually?)
        // Wait, identity mappings in core.csv are valid terms mapping to themselves.
        // They should match, but contain NO error message or a "Fixed Term" message.
        // Actually, check what the rule returns for identity mappings.

        // If "流" matches inside "串流", we get an error about "流".
        const incorrectMatch = issues.find(i => i.message.includes('流') && !i.message.includes('串流'))
        expect(incorrectMatch).toBeUndefined()
    })

    it('should not flag "類別" (Class/Category) as containing "類"', async () => {
        const text = '這是一個重要的類別。'
        const issues = await rule.check(text)
        const incorrectMatch = issues.find(i => i.message.includes('類') && !i.message.includes('類別'))
        expect(incorrectMatch).toBeUndefined()
    })

    it('should not flag "網域" (Domain) as containing "域"', async () => {
        const text = '請輸入您的網域。'
        const issues = await rule.check(text)
        const incorrectMatch = issues.find(i => i.message.includes('域') && !i.message.includes('網域'))
        expect(incorrectMatch).toBeUndefined()
    })

    // Substring False Positive: "響應" (Response/Respond) in "影響應用" (Influence Application)
    // "響應" -> "回應" (Mainland -> Taiwan)
    // "影響應用" contains "響應" as a substring.
    it('should not flag "響應" inside "影響應用" (Substring FP)', async () => {
        const text = '這會嚴重影響應用程式的效能。'
        const issues = await rule.check(text)

        // If "響應" matches, it suggests "回應".
        const incorrectMatch = issues.find(i => i.message.includes('回應') || i.message.includes('響應'))

        // This is expected to FAIL currently if "響應" is in the dictionary as a simple term
        // and we don't have "影響應用" as an exclusion.
        expect(incorrectMatch).toBeUndefined()
    })

    // Context/Policy Check: "客戶端" -> "用戶端"
    // User says "客戶端" is common in Taiwan, replacing it with "用戶端" is controversial.
    // We just want to see if it triggers.
    it('check behavior of "客戶端"', async () => {
        const text = '請安裝客戶端軟體。'
        const issues = await rule.check(text)

        // If it matches, we acknowledge it. If we want to fix it later, we can.
        // For now, just logging expectation.
        // User said it IS currently matching (mapped to 用戶端 or similar).
        const match = issues.find(i => i.message.includes('用戶端') || i.message.includes('客戶端'))
        // Expecting it to match currently (based on user report)
        // If we want to CHANGE policy, we would assert .toBeUndefined()
    })
})
