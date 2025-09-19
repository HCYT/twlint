#!/usr/bin/env tsx

// TWLint 詞庫建構工具
// 將 CSV 詞庫轉換為優化的 JSON 格式供運行時使用

import { readFile, writeFile, readdir, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import Papa from 'papaparse'
import type { DictEntry, CompiledDict } from '../src/types.js'

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
}

class DictBuilder {
  private readonly csvDir = join(process.cwd(), 'dictionaries-csv')
  private readonly outputDir = join(process.cwd(), 'src', 'dictionaries')

  async buildAll(): Promise<void> {
    console.log('🔨 開始建構 TWLint 詞庫...')

    // 確保輸出目錄存在
    await mkdir(this.outputDir, { recursive: true })

    // 建構核心詞庫
    await this.buildCoreDict()

    // 建構擴展詞庫
    await this.buildExtendedDict()

    // 建構索引文件
    await this.generateIndex()

    console.log('✅ 詞庫建構完成！')
  }

  async buildCoreDict(): Promise<void> {
    console.log('📚 建構核心詞庫...')

    const coreDir = join(this.csvDir, 'core')
    const csvFiles = await this.findCSVFiles(coreDir)

    if (csvFiles.length === 0) {
      console.log('⚠️  未找到核心詞庫 CSV 文件，建立示例文件')
      await this.createSampleCSV()
      return
    }

    const dict = await this.compileDict(csvFiles, 'core')
    await this.saveDict(dict, 'core')

    console.log(`✅ 核心詞庫建構完成 (${dict.metadata.entries} 條目)`)
  }

  async buildExtendedDict(): Promise<void> {
    console.log('📖 建構擴展詞庫...')

    const extendedDir = join(this.csvDir, 'extended')
    const csvFiles = await this.findCSVFiles(extendedDir)

    if (csvFiles.length === 0) {
      console.log('ℹ️  未找到擴展詞庫，跳過')
      return
    }

    const dict = await this.compileDict(csvFiles, 'extended')
    await this.saveDict(dict, 'extended')

    console.log(`✅ 擴展詞庫建構完成 (${dict.metadata.entries} 條目)`)
  }

  async generateIndex(): Promise<void> {
    console.log('📝 生成詞庫索引...')

    const index = {
      dictionaries: [
        { name: 'core', description: '核心詞庫', required: true },
        { name: 'extended', description: '擴展詞庫', required: false }
      ],
      version: '1.0.0',
      buildTime: new Date().toISOString()
    }

    await writeFile(
      join(this.outputDir, 'index.json'),
      JSON.stringify(index, null, 2),
      'utf-8'
    )

    console.log('✅ 詞庫索引生成完成')
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

      for (const row of data) {
        if (this.validateCSVRow(row)) {
          entries.push({
            id: row.id,
            taiwan: row.taiwan,
            china_simplified: row.china_simplified,
            china_traditional: row.china_traditional,
            english: row.english,
            confidence: parseFloat(row.confidence),
            category: row.category,
            reason: row.reason,
            domain: row.domain
          })
        }
      }
    }

    return {
      metadata: {
        name,
        version: '1.0.0',
        entries: entries.length
      },
      lookup: this.optimizeForLookup(entries)
    }
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

  private optimizeForLookup(entries: DictEntry[]): Record<string, any> {
    const lookup: Record<string, any> = {}

    for (const entry of entries) {
      // 簡體字作為查找鍵
      lookup[entry.china_simplified] = {
        taiwan: entry.taiwan,
        confidence: entry.confidence,
        category: entry.category,
        reason: entry.reason
      }

      // 如果有不同的繁體寫法，也加入查找表
      if (entry.china_traditional !== entry.china_simplified) {
        lookup[entry.china_traditional] = {
          taiwan: entry.taiwan,
          confidence: entry.confidence,
          category: entry.category,
          reason: entry.reason
        }
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
    process.exit(1)
  })
}