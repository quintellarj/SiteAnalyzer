import { logger } from "./logger";

interface CacheEntry<T> {
  value: T;
  createdAt: number;
  expiresAt: number;
}

export interface CacheStats {
  size: number;
  maxEntries: number;
  ttlMinutes: number;
  hits: number;
  misses: number;
}

/**
 * Cache LRU leve em memória com TTL configurável.
 * Projetado para processos persistentes Node.js sob Phusion Passenger (cPanel),
 * com limite rígido de entradas para manter baixo consumo de RAM.
 */
export class LRUCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly maxEntries: number;
  private readonly defaultTtlMs: number;
  private hits = 0;
  private misses = 0;

  constructor(options?: { maxEntries?: number; ttlMs?: number }) {
    this.maxEntries = options?.maxEntries ?? 100;
    this.defaultTtlMs = options?.ttlMs ?? 30 * 60 * 1000; // 30 minutos padrão
  }

  get(key: string): { value: T; createdAt: number; expiresAt: number } | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }

    // Atualiza posição LRU (move para o final da ordem de inserção do Map)
    this.store.delete(key);
    this.store.set(key, entry);
    this.hits++;
    return entry;
  }

  set(key: string, value: T, ttlMs?: number): void {
    const now = Date.now();
    const effectiveTtl = ttlMs ?? this.defaultTtlMs;

    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      this.pruneExpired();
      if (this.store.size >= this.maxEntries) {
        // Evicta o item menos recentemente usado (primeiro da fila)
        const oldestKey = this.store.keys().next().value;
        if (oldestKey !== undefined) {
          this.store.delete(oldestKey);
        }
      }
    }

    this.store.set(key, {
      value,
      createdAt: now,
      expiresAt: now + effectiveTtl,
    });
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    const prevSize = this.store.size;
    this.store.clear();
    logger.info("Cache LRU em memória limpo.", { evictedEntries: prevSize });
  }

  pruneExpired(): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        removed++;
      }
    }
    return removed;
  }

  stats(): CacheStats {
    this.pruneExpired();
    return {
      size: this.store.size,
      maxEntries: this.maxEntries,
      ttlMinutes: Math.round(this.defaultTtlMs / 60000),
      hits: this.hits,
      misses: this.misses,
    };
  }
}

export const AUDIT_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos
export const QUICK_TIPS_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

export function buildAuditCacheKey(url: string, device: "mobile" | "desktop"): string {
  const normalized = url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
  return `audit:${normalized}:${device}`;
}
