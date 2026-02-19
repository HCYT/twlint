
import { describe, it, expect, beforeEach } from 'vitest'
import { DictionaryManager } from '../../src/core/dictionary-manager'
import { MainlandTermsRule } from '../../src/core/rules/mainland-terms'

describe('Single Character Hazards (Issue #4)', () => {
    let rule: MainlandTermsRule
    let dictManager: DictionaryManager

    beforeEach(async () => {
        dictManager = new DictionaryManager()
        await dictManager.loadDictionary('core')
        await dictManager.loadDictionary('software-development')
        rule = new MainlandTermsRule(dictManager)
    })

    it('should not replace "类" in "人类" (Human)', async () => {
        const text = '为了人类的未来'
        const issues = await rule.check(text)
        // Should NOT contain "類別" (Class)
        expect(issues.find(i => i.message.includes('類別'))).toBeUndefined()
    })

    it('should not replace "云" in "多云" (Cloudy)', async () => {
        const text = '今天天气多云'
        const issues = await rule.check(text)
        // Should NOT contain "雲端" (Cloud)
        expect(issues.find(i => i.message.includes('雲端'))).toBeUndefined()
    })

    it('should not replace "域" in "区域" (Region)', async () => {
        const text = '这是一个危险区域'
        const issues = await rule.check(text)
        // Should NOT contain "網域" (Domain)
        expect(issues.find(i => i.message.includes('網域'))).toBeUndefined()
    })

    it('should not replace "栈" in "客栈" (Inn)', async () => {
        const text = '我们在客栈休息'
        const issues = await rule.check(text)
        // Should NOT contain "堆疊" (Stack)
        expect(issues.find(i => i.message.includes('堆疊'))).toBeUndefined()
    })

    it('should not replace "流" in "河流" (River)', async () => {
        const text = '河流很长'
        const issues = await rule.check(text)
        // Should NOT contain "串流" (Stream)
        expect(issues.find(i => i.message.includes('串流'))).toBeUndefined()
    })

    it('should not replace "卷" in "考卷" (Exam Paper)', async () => {
        const text = '发考卷了'
        const issues = await rule.check(text)
        // Should NOT contain "磁碟區" (Volume)
        expect(issues.find(i => i.message.includes('磁碟區'))).toBeUndefined()
    })
})
