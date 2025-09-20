/**
 * 簡單的 LRU 快取實現
 * 避免記憶體洩漏，限制快取大小
 */
export class LRUCache<K, V> {
  private readonly maxSize: number
  private readonly cache = new Map<K, V>()

  constructor(maxSize: number = 10) {
    this.maxSize = maxSize
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key)
    if (value !== undefined) {
      // 移動到最後（最近使用）
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      // 更新現有值
      this.cache.delete(key)
      this.cache.set(key, value)
    } else {
      // 新增值，檢查大小限制
      if (this.cache.size >= this.maxSize) {
        // 刪除最舊的項目（第一個）
        const firstKey = this.cache.keys().next().value
        if (firstKey !== undefined) {
          this.cache.delete(firstKey)
        }
      }
      this.cache.set(key, value)
    }
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }

  keys(): IterableIterator<K> {
    return this.cache.keys()
  }

  values(): IterableIterator<V> {
    return this.cache.values()
  }
}