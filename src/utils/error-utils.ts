/**
 * 統一錯誤處理工具 - 消除重複的錯誤處理代碼
 */

export function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export class ErrorHandler {
  static handle(error: unknown, context: string): void {
    console.warn(`Warning: ${context} failed: ${formatError(error)}`)
  }

  static throw(error: unknown, context: string): never {
    throw new Error(`${context}: ${formatError(error)}`)
  }
}