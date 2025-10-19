import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFile, unlink, mkdir, rmdir } from 'fs/promises'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

describe('CLI Integration Tests', () => {
  const testDir = join(process.cwd(), 'test-temp')
  const testFile = join(testDir, 'sample.md')
  const cliPath = join(process.cwd(), 'dist', 'cli.js')

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    try {
      await unlink(testFile)
      await rmdir(testDir)
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('check command', () => {
    it('should detect issues in simplified Chinese text', async () => {
      const content = '# 测试文档\n\n这是一个简体字测试。\n\n使用软件开发。'
      await writeFile(testFile, content, 'utf-8')

      try {
        await execAsync(`node ${cliPath} check ${testFile}`)
        expect.fail('Should have exited with error code')
      } catch (error: any) {
        expect(error.code).toBe(1)
        expect(error.stdout).toContain('simplified-chars')
        expect(error.stdout).toContain('mainland-terms')
        expect(error.stdout).toContain('problems')
      }
    })

    it('should output JSON format when requested', async () => {
      const content = '简体字测试'
      await writeFile(testFile, content, 'utf-8')

      try {
        await execAsync(`node ${cliPath} check ${testFile} --format json`)
        expect.fail('Should have exited with error code')
      } catch (error: any) {
        expect(error.code).toBe(1)
        expect(() => JSON.parse(error.stdout)).not.toThrow()

        const result = JSON.parse(error.stdout)
        expect(Array.isArray(result)).toBe(true)
        expect(result[0]).toHaveProperty('filePath')
        expect(result[0]).toHaveProperty('messages')
      }
    })

    it('should exit with error code when issues found', async () => {
      const content = '简体字测试'
      await writeFile(testFile, content, 'utf-8')

      try {
        await execAsync(`node ${cliPath} check ${testFile}`)
        expect.fail('Should have exited with error code')
      } catch (error: any) {
        expect(error.code).toBe(1)
      }
    })

    it('should exit with success when no issues found', async () => {
      const content = '繁體字測試'
      await writeFile(testFile, content, 'utf-8')

      const result = await execAsync(`node ${cliPath} check ${testFile}`)
      // 當沒有錯誤時，應該顯示成功訊息
      expect(result.stdout).toContain('✓ No problems found!')
    })
  })

  describe('fix command', () => {
    it('should fix simplified characters automatically', async () => {
      const originalContent = '# 测试文档\n\n这是简体字测试。'
      await writeFile(testFile, originalContent, 'utf-8')

      await execAsync(`node ${cliPath} check ${testFile} --fix`)

      const { readFile } = await import('fs/promises')
      const fixedContent = await readFile(testFile, 'utf-8')

      expect(fixedContent).not.toBe(originalContent)
      expect(fixedContent).toContain('測試')
      expect(fixedContent).toContain('這是')
      expect(fixedContent).toContain('簡體字')
    })

    it('should show verbose output when requested', async () => {
      const content = '简体字测试'
      await writeFile(testFile, content, 'utf-8')

      const { stdout } = await execAsync(`node ${cliPath} check ${testFile} --fix --verbose`)

      expect(stdout).toContain('Fixed:')
      expect(stdout).toContain('file(s)')
    })

    it('should not modify files with no issues', async () => {
      const originalContent = '繁體字測試'
      await writeFile(testFile, originalContent, 'utf-8')

      await execAsync(`node ${cliPath} check ${testFile} --fix`)

      const { readFile } = await import('fs/promises')
      const finalContent = await readFile(testFile, 'utf-8')

      expect(finalContent).toBe(originalContent)
    })
  })

  describe('help command', () => {
    it('should show help information', async () => {
      const { stdout } = await execAsync(`node ${cliPath} --help`)

      expect(stdout).toContain('Usage:')
      expect(stdout).toContain('Commands:')
      expect(stdout).toContain('check')
      expect(stdout).toContain('init')
    })

    it('should show check command help', async () => {
      const { stdout } = await execAsync(`node ${cliPath} check --help`)

      expect(stdout).toContain('Check files for Chinese term issues')
      expect(stdout).toContain('--fix')
      expect(stdout).toContain('--format')
      expect(stdout).toContain('--deep')
    })
  })

  describe('version command', () => {
    it('should show version information', async () => {
      const { stdout } = await execAsync(`node ${cliPath} --version`)

      expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/)
    })
  })

  describe('error handling', () => {
    it('should handle non-existent files gracefully', async () => {
      try {
        await execAsync(`node ${cliPath} check non-existent-file.md`)
        expect.fail('Should have exited with error code')
      } catch (error: any) {
        expect(error.code).toBe(1)
        // 檢查是否包含檔案讀取錯誤的信息
        expect(error.stdout).toContain('Failed to read file')
      }
    })

    it('should handle invalid options gracefully', async () => {
      try {
        await execAsync(`node ${cliPath} check ${testFile} --invalid-option`)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.code).toBe(1)
      }
    })
  })
})