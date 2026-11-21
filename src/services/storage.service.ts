const STORAGE_PREFIX = 'dineo_';

export class StorageService {
  private static memoryFallback: Map<string, string> = new Map();

  private static isStorageAvailable(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  public static get<T>(key: string, defaultValue: T): T {
    try {
      if (!this.isStorageAvailable()) {
        const memoryVal = this.memoryFallback.get(key);
        return memoryVal ? (JSON.parse(memoryVal) as T) : defaultValue;
      }
      const item = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      if (!item) return defaultValue;
      return JSON.parse(item) as T;
    } catch {
      return defaultValue;
    }
  }

  public static set<T>(key: string, value: T): boolean {
    try {
      const serialized = JSON.stringify(value);
      if (!this.isStorageAvailable()) {
        this.memoryFallback.set(key, serialized);
        return true;
      }
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, serialized);
      return true;
    } catch (e) {
      // Protection production contre QuotaExceededError (ex: nombreuses photos de preuves)
      try {
        if (value && typeof value === 'object' && 'orders' in (value as Record<string, unknown>)) {
          const clone = structuredClone(value) as Record<string, unknown>;
          const orders = clone.orders as Array<Record<string, unknown>>;
          if (Array.isArray(orders) && orders.length > 15) {
            // Libère les anciennes photos sur les commandes archivées > 15 pour ne jamais perdre de données financières
            clone.orders = orders.map((o, idx) => {
              if (idx < 15) return o;
              const copy = { ...o };
              if (copy.deliveryProof && typeof copy.deliveryProof === 'object') {
                copy.deliveryProof = { ...(copy.deliveryProof as Record<string, unknown>), photoDataUrl: '' };
              }
              if (copy.clientConfirmation && typeof copy.clientConfirmation === 'object') {
                copy.clientConfirmation = { ...(copy.clientConfirmation as Record<string, unknown>), photoDataUrl: '' };
              }
              return copy;
            });
            localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(clone));
            return true;
          }
        }
      } catch {
        // fallback mémoire
      }
      console.error('StorageService set error:', e);
      return false;
    }
  }

  public static remove(key: string): void {
    try {
      if (!this.isStorageAvailable()) {
        this.memoryFallback.delete(key);
        return;
      }
      localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    } catch (e) {
      console.error('StorageService remove error:', e);
    }
  }
}
