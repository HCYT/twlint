#!/usr/bin/env tsx

// TWLint 詞庫建構工具
// 將 CSV 詞庫轉換為優化的 JSON 格式供運行時使用

import { readFile, writeFile, readdir, mkdir } from 'fs/promises'
import { join, basename } from 'path'
import Papa from 'papaparse'
import type { DictEntry, CompiledDict, DictLookupEntry } from '../src/types.js'

interface CSVRow {
  id: string
  taiwan: string
  china_simplified: string
  china_traditional: string
  english?: string
  confidence: string
  category: string
  reason: string
  domain: string
  match_type?: string
  context_before?: string
  context_after?: string
  context_exclude?: string
  autofix_safe?: string
}

class DictBuilder {
  private readonly csvDir = join(process.cwd(), 'dictionaries-csv')
  private readonly domainsDir = join(process.cwd(), 'dictionaries-csv', 'domains')
  private readonly outputDir = join(process.cwd(), 'src', 'dictionaries')

  async buildAll(): Promise<void> {
    console.log('🔨 開始建構 TWLint 詞庫...')

    // 確保輸出目錄存在
    await mkdir(this.outputDir, { recursive: true })

    // 建構核心詞庫（如果存在）
    await this.buildCoreDict()

    // 建構領域詞庫
    await this.buildDomainDictionaries()

    // 建構學術詞庫（保持向後相容）
    await this.buildAcademicDict()

    // 建構擴展詞庫（保持向後相容）
    await this.buildExtendedDict()

    // 建構索引文件
    await this.generateIndex()

    console.log('✅ 詞庫建構完成！')
  }

  async buildCoreDict(): Promise<void> {
    console.log('📚 建構核心詞庫...')

    const coreDir = join(this.csvDir, 'core')
    const csvFiles = await this.findCSVFiles(coreDir)

    // 只載入 core.csv，不包含 plus.csv（plus.csv 已經分拆到領域詞庫）
    const coreFiles = csvFiles.filter(file => basename(file) === 'core.csv')

    if (coreFiles.length === 0) {
      console.log('⚠️  未找到核心詞庫 core.csv，建立示例文件')
      await this.createSampleCSV()
      return
    }

    const dict = await this.compileDict(coreFiles, 'core')
    await this.saveDict(dict, 'core')

    console.log(`✅ 核心詞庫建構完成 (${dict.metadata.entries} 條目)`)
  }

  async buildAcademicDict(): Promise<void> {
    console.log('🎓 建構學術詞庫...')

    const academicFile = join(this.csvDir, 'extended', 'academic.csv')

    try {
      await readFile(academicFile, 'utf-8')
      const dict = await this.compileDict([academicFile], 'academic')
      await this.saveDict(dict, 'academic')
      console.log(`✅ 學術詞庫建構完成 (${dict.metadata.entries} 條目)`)
    } catch {
      console.log('ℹ️  未找到學術詞庫，跳過')
    }
  }

  async buildDomainDictionaries(): Promise<void> {
    console.log('🌐 建構領域詞庫...')

    try {
      const domainFiles = await this.findCSVFiles(this.domainsDir)

      if (domainFiles.length === 0) {
        console.log('ℹ️  未找到領域詞庫，跳過')
        return
      }

      for (const domainFile of domainFiles) {
        const domainName = basename(domainFile, '.csv')
        console.log(`  📂 建構領域: ${domainName}`)

        const dict = await this.compileDict([domainFile], domainName)
        await this.saveDict(dict, domainName)

        console.log(`  ✅ ${domainName} 完成 (${dict.metadata.entries} 條目)`)
      }

      console.log(`✅ 所有領域詞庫建構完成`)
    } catch (error) {
      console.log('ℹ️  領域詞庫目錄不存在，跳過')
    }
  }

  async buildExtendedDict(): Promise<void> {
    console.log('📖 建構擴展詞庫...')

    const extendedDir = join(this.csvDir, 'extended')
    const allCsvFiles = await this.findCSVFiles(extendedDir)

    // 排除 academic.csv，因為它已經被單獨處理了
    const csvFiles = allCsvFiles.filter(file => !file.endsWith('academic.csv'))

    if (csvFiles.length === 0) {
      console.log('ℹ️  未找到其他擴展詞庫，跳過')
      return
    }

    const dict = await this.compileDict(csvFiles, 'extended')
    await this.saveDict(dict, 'extended')

    console.log(`✅ 擴展詞庫建構完成 (${dict.metadata.entries} 條目)`)
  }

  async generateIndex(): Promise<void> {
    console.log('📝 生成詞庫索引...')

    // 掃描實際生成的詞庫文件
    const builtDictionaries = []

    try {
      const files = await readdir(this.outputDir)
      const dictFiles = files.filter(f => f.endsWith('.json') && f !== 'index.json')

      for (const file of dictFiles) {
        const name = basename(file, '.json')
        const dictPath = join(this.outputDir, file)
        const content = await readFile(dictPath, 'utf-8')
        const dict = JSON.parse(content)

        // 根據名稱判斷類型和描述
        let description = name
        let required = false
        let type = 'domain'

        if (name === 'core') {
          description = '核心詞庫'
          required = true
          type = 'core'
        } else if (name === 'academic') {
          description = '學術詞庫'
          type = 'extended'
        } else if (name === 'extended') {
          description = '擴展詞庫'
          type = 'extended'
        } else {
          // 領域詞庫，美化名稱
          description = this.formatDomainName(name)
          type = 'domain'
        }

        builtDictionaries.push({
          name,
          description,
          type,
          required,
          entries: dict.metadata?.entries || 0
        })
      }
    } catch (error) {
      console.warn('Warning: Failed to scan dictionary files')
    }

    const index = {
      dictionaries: builtDictionaries,
      version: '1.2.2',
      buildTime: new Date().toISOString()
    }

    await writeFile(
      join(this.outputDir, 'index.json'),
      JSON.stringify(index, null, 2),
      'utf-8'
    )

    console.log('✅ 詞庫索引生成完成')
  }

  private formatDomainName(domainName: string): string {
    const nameMap: Record<string, string> = {
      'software-development': '軟體開發',
      'hardware-3c': '硬體3C',
      'network-cloud': '網路雲端',
      'business-finance': '商業金融',
      'user-interface': '使用者介面',
      'operating-system': '作業系統',
      'social-media': '社群媒體',
      'ai-emerging-tech': 'AI新興技術'
    }
    return nameMap[domainName] || domainName
  }

  private async findCSVFiles(dir: string): Promise<string[]> {
    try {
      const files = await readdir(dir)
      return files
        .filter(file => file.endsWith('.csv'))
        .map(file => join(dir, file))
    } catch {
      return []
    }
  }

  private async compileDict(csvFiles: string[], name: string): Promise<CompiledDict> {
    const entries: DictEntry[] = []

    for (const csvFile of csvFiles) {
      const content = await readFile(csvFile, 'utf-8')
      const { data } = Papa.parse<CSVRow>(content, {
        header: true,
        skipEmptyLines: true
      })

      const validRows = data.filter(row => this.validateCSVRow(row))
      const processedEntries = validRows.map(row => this.createDictEntry(row))
      entries.push(...processedEntries)
    }

    return {
      metadata: {
        name,
        version: '1.2.2',
        entries: entries.length
      },
      lookup: this.optimizeForLookup(entries)
    }
  }

  private parseContext(row: CSVRow): { before?: string[], after?: string[], exclude?: string[] } {
    const context: { before?: string[], after?: string[], exclude?: string[] } = {}

    if (row.context_before && row.context_before.trim()) {
      context.before = row.context_before.split(',').map(s => s.trim()).filter(Boolean)
    }

    if (row.context_after && row.context_after.trim()) {
      context.after = row.context_after.split(',').map(s => s.trim()).filter(Boolean)
    }

    if (row.context_exclude && row.context_exclude.trim()) {
      context.exclude = row.context_exclude.split(',').map(s => s.trim()).filter(Boolean)
    }

    return context
  }

  private validateCSVRow(row: CSVRow): boolean {
    return !!(
      row.id &&
      row.taiwan &&
      row.china_simplified &&
      row.confidence &&
      row.category
    )
  }

  private createDictEntry(row: CSVRow): DictEntry {
    const context = this.parseContext(row)
    const matchType = (row.match_type || 'exact') as 'exact' | 'word_boundary' | 'context_sensitive'

    return {
      id: row.id,
      taiwan: row.taiwan,
      china_simplified: row.china_simplified,
      china_traditional: row.china_traditional,
      english: row.english,
      confidence: parseFloat(row.confidence),
      category: row.category,
      reason: row.reason,
      domain: row.domain,
      match_type: matchType,
      context: Object.keys(context).length > 0 ? context : undefined,
      autofix_safe: row.autofix_safe === 'true'
    }
  }

  private optimizeForLookup(entries: DictEntry[]): Record<string, DictLookupEntry> {
    const lookup: Record<string, DictLookupEntry> = {}

    for (const entry of entries) {
      const entryData = {
        taiwan: entry.taiwan,
        confidence: entry.confidence,
        category: entry.category,
        reason: entry.reason,
        match_type: entry.match_type || 'exact',
        autofix_safe: entry.autofix_safe || false,
        ...(entry.context && { context: entry.context })
      }

      // 使用 ID 作為唯一鍵來避免覆蓋，但保留原始詞彙作為主鍵
      const mainKey = entry.china_simplified
      const uniqueKey = `${mainKey}_${entry.id.replace(/[^a-zA-Z0-9]/g, '_')}`

      // 主鍵：原始簡體字（保持向後相容）
      if (!lookup[mainKey] || entry.match_type === 'exact') {
        // exact 匹配優先，或者第一次出現
        lookup[mainKey] = entryData
      }

      // 唯一鍵：用於語境特殊匹配
      lookup[uniqueKey] = entryData

      // 如果有不同的繁體寫法，也加入查找表
      if (entry.china_traditional !== entry.china_simplified) {
        const traditionalKey = entry.china_traditional
        const traditionalUniqueKey = `${traditionalKey}_${entry.id.replace(/[^a-zA-Z0-9]/g, '_')}`

        if (!lookup[traditionalKey] || entry.match_type === 'exact') {
          lookup[traditionalKey] = entryData
        }
        lookup[traditionalUniqueKey] = entryData
      }
    }

    return lookup
  }

  private async saveDict(dict: CompiledDict, name: string): Promise<void> {
    const filePath = join(this.outputDir, `${name}.json`)
    await writeFile(filePath, JSON.stringify(dict, null, 2), 'utf-8')
  }

  private async createSampleCSV(): Promise<void> {
    const sampleData = `id,taiwan,china_simplified,china_traditional,english,confidence,category,reason,domain
software-term,軟體,软件,軟件,software,0.95,mainland-term,台灣技術標準用語,tech
network-term,網路,网络,網絡,network,0.90,mainland-term,台灣慣用語,tech
program-term,程式,程序,程序,program,0.85,mainland-term,台灣標準用語,tech`

    const coreDir = join(this.csvDir, 'core')
    await mkdir(coreDir, { recursive: true })

    await writeFile(
      join(coreDir, 'tech-basic.csv'),
      sampleData,
      'utf-8'
    )

    console.log('📝 已建立示例詞庫文件: dictionaries-csv/core/tech-basic.csv')
  }
}

// 執行建構
if (import.meta.url.endsWith(process.argv[1])) {
  const builder = new DictBuilder()
  builder.buildAll().catch(error => {
    console.error('❌ 詞庫建構失敗:', error.message)
    throw error  // 讓上層決定是否退出
  })
}
