/**
 * 詞庫載入策略 - 消除 linter.ts 中的特殊情況處理
 */

import type { TWLintConfig } from '../types.js'
import type { DictionaryManager } from './dictionary-manager.js'

export interface DictLoadStrategy {
  getDictionaries(config: TWLintConfig, manager: DictionaryManager): Promise<string[]>
}

/**
 * 基本策略：只載入核心詞庫
 */
export class CoreDictStrategy implements DictLoadStrategy {
  async getDictionaries(): Promise<string[]> {
    return ['core']
  }
}

/**
 * 自訂詞庫策略：載入用戶指定的詞庫
 */
export class CustomDictStrategy implements DictLoadStrategy {
  constructor(private dictionaries: string[]) {}

  async getDictionaries(): Promise<string[]> {
    return this.dictionaries
  }
}

/**
 * 領域策略：載入指定領域的詞庫（包含核心詞庫）
 */
export class DomainDictStrategy implements DictLoadStrategy {
  constructor(private domains: string[]) {}

  async getDictionaries(): Promise<string[]> {
    const dictNames = [...this.domains]
    if (!dictNames.includes('core')) {
      dictNames.unshift('core')
    }
    return dictNames
  }
}

/**
 * 深度策略：載入所有可用詞庫
 */
export class DeepDictStrategy implements DictLoadStrategy {
  constructor(private baseStrategy: DictLoadStrategy) {}

  async getDictionaries(config: TWLintConfig, manager: DictionaryManager): Promise<string[]> {
    const baseDicts = await this.baseStrategy.getDictionaries(config, manager)
    const availableDicts = await manager.scanAvailableDictionaries()
    return [...new Set([...baseDicts, ...availableDicts])]
  }
}

/**
 * 策略工廠：根據配置選擇適當的策略
 */
export class DictLoadStrategyFactory {
  static create(config: TWLintConfig, deep?: boolean): DictLoadStrategy {
    let baseStrategy: DictLoadStrategy

    if (config.domains) {
      baseStrategy = new DomainDictStrategy(config.domains)
    } else if (config.dictionaries) {
      baseStrategy = new CustomDictStrategy(config.dictionaries)
    } else {
      baseStrategy = new CoreDictStrategy()
    }

    if (deep) {
      return new DeepDictStrategy(baseStrategy)
    }

    return baseStrategy
  }
}