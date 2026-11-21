import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { OfflineDb, type SyncOperationType, type SyncQueueItem } from '../services/offline/indexeddb';
import { registerDineoServiceWorker, type SwStatus } from '../services/offline/sw-register';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface OfflineContextValue {
  /** Vrai si le navigateur est connecté ET que la simulation hors-ligne est désactivée */
  isOnline: boolean;
  /** Vrai si le réseau physique du navigateur est connecté */
  browserOnline: boolean;
  /** Mode test manuel pour simuler une coupure 3G/4G à tout moment */
  simulatedOffline: boolean;
  setSimulatedOffline: (offline: boolean) => void;
  /** Statut du Service Worker PWA */
  swStatus: SwStatus;
  applySwUpdate: () => void;
  /** Installation PWA sur l'écran d'accueil */
  canInstallPwa: boolean;
  isStandalonePwa: boolean;
  installPwa: () => Promise<void>;
  /** File de synchronisation hors-ligne (Outbox IndexedDB) */
  queue: SyncQueueItem[];
  pendingCount: number;
  syncedCount: number;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  storageInfo: { usedMb: number; quotaMb: number } | null;
  archivedMediaCount: number;
  /** Enregistre une opération métier dans la file Outbox IndexedDB */
  enqueueOperation: (input: {
    type: SyncOperationType;
    entityId: string;
    label: string;
    summary: string;
    payloadSizeKb?: number;
  }) => void;
  /** Lance immédiatement la synchronisation de la file d'attente */
  syncNow: () => Promise<void>;
  /** Nettoie les éléments déjà synchronisés de l'historique outbox */
  clearSyncedHistory: () => Promise<void>;
  /** Ouvre/ferme le Centre Hors-Ligne */
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
}

const OfflineContext = createContext<OfflineContextValue | undefined>(undefined);

const SIM_OFFLINE_KEY = 'dineo_sim_offline_v1';
const LAST_SYNC_KEY = 'dineo_last_sync_v1';

// Bus global ultra-léger permettant à ErpProvider (même monté au-dessus) de pousser dans la file Outbox
type QueuePushListener = (item: {
  type: SyncOperationType;
  entityId: string;
  label: string;
  summary: string;
  payloadSizeKb?: number;
}) => void;

const queueListeners = new Set<QueuePushListener>();

export function emitOfflineOperation(input: {
  type: SyncOperationType;
  entityId: string;
  label: string;
  summary: string;
  payloadSizeKb?: number;
}) {
  for (const fn of queueListeners) {
    fn(input);
  }
}

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [browserOnline, setBrowserOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [simulatedOffline, setSimulatedOfflineState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIM_OFFLINE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [swStatus, setSwStatus] = useState<SwStatus>('REGISTERING');
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LAST_SYNC_KEY);
    } catch {
      return null;
    }
  });
  const [storageInfo, setStorageInfo] = useState<{ usedMb: number; quotaMb: number } | null>(null);
  const [archivedMediaCount, setArchivedMediaCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalonePwa] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((window.navigator as unknown as { standalone?: boolean }).standalone)
    );
  });

  const swHandleRef = useRef<{ applyUpdate: () => void }>({ applyUpdate: () => {} });
  const isOnline = browserOnline && !simulatedOffline;
  const isOnlineRef = useRef(isOnline);
  const syncingRef = useRef(false);

  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  const refreshMetrics = useCallback(async () => {
    const [est, mediaCnt] = await Promise.all([
      OfflineDb.estimateStorageUsage(),
      OfflineDb.countMedia(),
    ]);
    if (est) setStorageInfo(est);
    setArchivedMediaCount(mediaCnt);
  }, []);

  // 1. Enregistrement du Service Worker + écoute connectivité + prompt d'installation PWA
  useEffect(() => {
    swHandleRef.current = registerDineoServiceWorker(setSwStatus);

    const onOnline = () => setBrowserOnline(true);
    const onOffline = () => setBrowserOnline(false);
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // Hydrate la file IndexedDB & les métriques de stockage de façon asynchrone
    Promise.all([
      OfflineDb.listOutboxItems(),
      OfflineDb.estimateStorageUsage(),
      OfflineDb.countMedia(),
    ]).then(([items, est, mediaCnt]) => {
      setQueue(items);
      if (est) setStorageInfo(est);
      setArchivedMediaCount(mediaCnt);
    });

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  }, []);

  const setSimulatedOffline = useCallback((offline: boolean) => {
    setSimulatedOfflineState(offline);
    try {
      localStorage.setItem(SIM_OFFLINE_KEY, offline ? '1' : '0');
    } catch {
      // ignore
    }
  }, []);

  // 2. Synchronisation FIFO de la file Outbox dès retour du réseau
  const syncNow = useCallback(async () => {
    if (!isOnlineRef.current || syncingRef.current) return;
    const allItems = await OfflineDb.listOutboxItems();
    const pending = allItems
      .filter((i) => i.status === 'PENDING' || i.status === 'FAILED')
      .reverse(); // FIFO chronologique

    if (pending.length === 0) return;

    syncingRef.current = true;
    setIsSyncing(true);

    try {
      for (const item of pending) {
        if (!isOnlineRef.current) break;

        const syncingItem: SyncQueueItem = { ...item, status: 'SYNCING', attempts: item.attempts + 1 };
        await OfflineDb.putOutboxItem(syncingItem);
        setQueue((prev) => prev.map((q) => (q.id === item.id ? syncingItem : q)));

        // Délai réaliste de confirmation serveur / réplication cloud (léger & fluide)
        await new Promise((r) => window.setTimeout(r, 240));

        const nowIso = new Date().toISOString();
        const syncedItem: SyncQueueItem = {
          ...syncingItem,
          status: 'SYNCED',
          syncedAt: nowIso,
          lastError: undefined,
        };
        await OfflineDb.putOutboxItem(syncedItem);
        setQueue((prev) => prev.map((q) => (q.id === item.id ? syncedItem : q)));
      }

      const doneIso = new Date().toISOString();
      setLastSyncedAt(doneIso);
      try {
        localStorage.setItem(LAST_SYNC_KEY, doneIso);
      } catch {
        // ignore
      }
      await refreshMetrics();
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [refreshMetrics]);

  // 3. Auto-synchronisation dès que la connexion revient
  useEffect(() => {
    if (isOnline) {
      const timer = window.setTimeout(() => {
        syncNow();
      }, 450);
      return () => window.clearTimeout(timer);
    }
  }, [isOnline, syncNow]);

  // 4. Enregistrement des opérations métier dans l'Outbox IndexedDB
  const enqueueOperation = useCallback(
    (input: {
      type: SyncOperationType;
      entityId: string;
      label: string;
      summary: string;
      payloadSizeKb?: number;
    }) => {
      const nowIso = new Date().toISOString();
      const onlineNow = isOnlineRef.current;
      const item: SyncQueueItem = {
        id: `sync-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        type: input.type,
        entityId: input.entityId,
        label: input.label,
        summary: input.summary,
        payloadSizeKb: input.payloadSizeKb ?? 2,
        createdAt: nowIso,
        // Hors-ligne -> reste en file PENDING jusqu'au retour 3G/4G ; En ligne -> marqué SYNCED instantanément
        status: onlineNow ? 'SYNCED' : 'PENDING',
        attempts: onlineNow ? 1 : 0,
        syncedAt: onlineNow ? nowIso : undefined,
      };

      OfflineDb.putOutboxItem(item).then(() => {
        refreshMetrics();
      });

      setQueue((prev) => [item, ...prev].slice(0, 60));

      if (onlineNow) {
        setLastSyncedAt(nowIso);
        try {
          localStorage.setItem(LAST_SYNC_KEY, nowIso);
        } catch {
          // ignore
        }
      }
    },
    [refreshMetrics]
  );

  // Branche le bus global émis par ErpProvider
  useEffect(() => {
    queueListeners.add(enqueueOperation);
    return () => {
      queueListeners.delete(enqueueOperation);
    };
  }, [enqueueOperation]);

  const clearSyncedHistory = useCallback(async () => {
    await OfflineDb.clearSyncedOutbox();
    const remaining = await OfflineDb.listOutboxItems();
    setQueue(remaining);
    await refreshMetrics();
  }, [refreshMetrics]);

  const installPwa = useCallback(async () => {
    if (!installPromptEvent) return;
    await installPromptEvent.prompt();
    try {
      await installPromptEvent.userChoice;
    } finally {
      setInstallPromptEvent(null);
    }
  }, [installPromptEvent]);

  const pendingCount = useMemo(
    () => queue.filter((i) => i.status === 'PENDING' || i.status === 'SYNCING' || i.status === 'FAILED').length,
    [queue]
  );
  const syncedCount = useMemo(() => queue.filter((i) => i.status === 'SYNCED').length, [queue]);

  const value: OfflineContextValue = {
    isOnline,
    browserOnline,
    simulatedOffline,
    setSimulatedOffline,
    swStatus,
    applySwUpdate: () => swHandleRef.current.applyUpdate(),
    canInstallPwa: Boolean(installPromptEvent) && !isStandalonePwa,
    isStandalonePwa,
    installPwa,
    queue,
    pendingCount,
    syncedCount,
    isSyncing,
    lastSyncedAt,
    storageInfo,
    archivedMediaCount,
    enqueueOperation,
    syncNow,
    clearSyncedHistory,
    drawerOpen,
    setDrawerOpen,
  };

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
};

export const useOffline = (): OfflineContextValue => {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error('useOffline must be used inside OfflineProvider');
  return ctx;
};
