/**
 * Moteur de persistance IndexedDB haute capacité pour Dineo (Offline-First).
 * Stocke localement jusqu'à plusieurs centaines de Mo de façon asynchrone :
 * - erp_snapshots : sauvegarde complète de l'état ERP (résistant aux coupures & saturations localStorage)
 * - media_blobs : photos de preuve GPS & signatures manuscrites (évite de saturer localStorage à 5 Mo)
 * - sync_outbox : file d'attente transactionnelle FIFO synchronisée automatiquement dès le retour 3G/4G
 */

export type SyncOperationType =
  | 'POS_ORDER'
  | 'CLIENT_ORDER'
  | 'KITCHEN_STATUS'
  | 'DELIVERY_STATUS'
  | 'DELIVERY_PROOF'
  | 'CLIENT_CONFIRMATION'
  | 'PAYMENT'
  | 'EXPENSE'
  | 'WAITER_CALL';

export interface SyncQueueItem {
  id: string;
  type: SyncOperationType;
  entityId: string;
  label: string;
  summary: string;
  payloadSizeKb: number;
  createdAt: string;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  attempts: number;
  syncedAt?: string;
  lastError?: string;
}

const DB_NAME = 'dineo_offline_db_v1';
const DB_VERSION = 1;
const STORE_SNAPSHOTS = 'erp_snapshots';
const STORE_MEDIA = 'media_blobs';
const STORE_OUTBOX = 'sync_outbox';

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openOfflineDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
          db.createObjectStore(STORE_SNAPSHOTS);
        }
        if (!db.objectStoreNames.contains(STORE_MEDIA)) {
          db.createObjectStore(STORE_MEDIA);
        }
        if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
          const outbox = db.createObjectStore(STORE_OUTBOX, { keyPath: 'id' });
          outbox.createIndex('createdAt', 'createdAt', { unique: false });
          outbox.createIndex('status', 'status', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  return dbPromise;
}

export const OfflineDb = {
  async saveErpSnapshot<T>(key: string, data: T): Promise<void> {
    const db = await openOfflineDb();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
        tx.objectStore(STORE_SNAPSHOTS).put(data, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  },

  async loadErpSnapshot<T>(key: string): Promise<T | null> {
    const db = await openOfflineDb();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_SNAPSHOTS, 'readonly');
        const req = tx.objectStore(STORE_SNAPSHOTS).get(key);
        req.onsuccess = () => resolve((req.result as T) ?? null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  },

  async saveMedia(key: string, dataUrl: string): Promise<void> {
    const db = await openOfflineDb();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_MEDIA, 'readwrite');
        tx.objectStore(STORE_MEDIA).put({ dataUrl, savedAt: new Date().toISOString() }, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  },

  async countMedia(): Promise<number> {
    const db = await openOfflineDb();
    if (!db) return 0;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_MEDIA, 'readonly');
        const req = tx.objectStore(STORE_MEDIA).count();
        req.onsuccess = () => resolve(req.result || 0);
        req.onerror = () => resolve(0);
      } catch {
        resolve(0);
      }
    });
  },

  async putOutboxItem(item: SyncQueueItem): Promise<void> {
    const db = await openOfflineDb();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_OUTBOX, 'readwrite');
        tx.objectStore(STORE_OUTBOX).put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  },

  async listOutboxItems(): Promise<SyncQueueItem[]> {
    const db = await openOfflineDb();
    if (!db) return [];
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_OUTBOX, 'readonly');
        const req = tx.objectStore(STORE_OUTBOX).getAll();
        req.onsuccess = () => {
          const items = (req.result as SyncQueueItem[]) || [];
          items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          resolve(items);
        };
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  },

  async clearSyncedOutbox(): Promise<void> {
    const db = await openOfflineDb();
    if (!db) return;
    const all = await this.listOutboxItems();
    const toDelete = all.filter((i) => i.status === 'SYNCED').map((i) => i.id);
    if (toDelete.length === 0) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_OUTBOX, 'readwrite');
        const store = tx.objectStore(STORE_OUTBOX);
        for (const id of toDelete) {
          store.delete(id);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  },

  async estimateStorageUsage(): Promise<{ usedMb: number; quotaMb: number } | null> {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
    try {
      const est = await navigator.storage.estimate();
      const usedMb = Math.round(((est.usage || 0) / (1024 * 1024)) * 100) / 100;
      const quotaMb = Math.round(((est.quota || 0) / (1024 * 1024)) * 10) / 10;
      return { usedMb, quotaMb };
    } catch {
      return null;
    }
  },
};
