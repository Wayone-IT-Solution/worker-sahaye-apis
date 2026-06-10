type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

class SimpleCache {
  private store = new Map<string, CacheEntry<any>>();
  private readonly defaultTtlMs: number;

  constructor(stdTTLSeconds = 300) {
    this.defaultTtlMs = stdTTLSeconds * 1000;
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds?: number): void {
    const ttlMs =
      typeof ttlSeconds === "number" && ttlSeconds > 0
        ? ttlSeconds * 1000
        : this.defaultTtlMs;

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  del(key: string): void {
    this.store.delete(key);
  }

  flushAll(): void {
    this.store.clear();
  }
}

export const cache = new SimpleCache(300);

const modelCacheVersions = new Map<string, number>();
const modelCacheKeys = new Map<string, Set<string>>();

export const getModelCacheVersion = (modelName: string): number =>
  modelCacheVersions.get(modelName) ?? 0;

export const bumpModelCacheVersion = (modelName: string): number => {
  const nextVersion = getModelCacheVersion(modelName) + 1;
  modelCacheVersions.set(modelName, nextVersion);
  return nextVersion;
};

export const registerModelCacheKey = (
  modelName: string,
  cacheKey: string
): void => {
  const normalizedModelName = String(modelName || "UnknownModel");
  const existingKeys = modelCacheKeys.get(normalizedModelName) ?? new Set<string>();
  existingKeys.add(cacheKey);
  modelCacheKeys.set(normalizedModelName, existingKeys);
};

export const invalidateModelCache = (modelName: string): number => {
  const normalizedModelName = String(modelName || "UnknownModel");
  const keys = modelCacheKeys.get(normalizedModelName);

  if (keys && keys.size > 0) {
    for (const key of keys) {
      cache.del(key);
    }
    keys.clear();
  }

  modelCacheKeys.delete(normalizedModelName);
  return bumpModelCacheVersion(normalizedModelName);
};

export const invalidateAllCache = (): void => {
  cache.flushAll();
  modelCacheVersions.clear();
  modelCacheKeys.clear();
};
