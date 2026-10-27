import type { StorageLike } from '@/lib/auth-session'

/** Minimal browser-storage stand-in for deterministic tests. */
export class FakeStorage implements StorageLike {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  get size(): number {
    return this.values.size
  }
}
