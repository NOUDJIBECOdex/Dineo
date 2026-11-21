import {
  CheckCircle2,
  CloudOff,
  Database,
  Download,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import React from 'react';
import { useOffline } from '../../store/offline.context';
import { formatShortDateTime } from '../restaurant/ui/Primitives';

/**
 * Pilule minimaliste & Centre Hors-Ligne / Synchronisation Dineo.
 * Discret lorsque tout est en ligne, informatif & rassurant dès qu'internet coupe à Maroua.
 */
export const OfflineStatusWidget: React.FC = () => {
  const {
    isOnline,
    browserOnline,
    simulatedOffline,
    setSimulatedOffline,
    swStatus,
    applySwUpdate,
    canInstallPwa,
    isStandalonePwa,
    installPwa,
    queue,
    pendingCount,
    syncedCount,
    isSyncing,
    lastSyncedAt,
    storageInfo,
    archivedMediaCount,
    syncNow,
    clearSyncedHistory,
    drawerOpen,
    setDrawerOpen,
  } = useOffline();

  const swLabel =
    swStatus === 'READY'
      ? 'Cache PWA prêt hors-ligne'
      : swStatus === 'UPDATE_AVAILABLE'
        ? 'Mise à jour prête'
        : swStatus === 'REGISTERING'
          ? 'Initialisation cache...'
          : 'Mode navigateur standard';

  return (
    <>
      {/* Bandeau ultra-sobre en haut uniquement si hors-ligne ou synchronisation active */}
      {(!isOnline || isSyncing || pendingCount > 0) && (
        <div
          className="no-print sticky top-0 z-40 px-3 py-1.5 border-b text-[12px] flex items-center justify-center gap-2.5 cursor-pointer"
          style={{
            backgroundColor: !isOnline ? 'var(--warn-bg)' : 'var(--accent-soft)',
            borderColor: !isOnline ? 'var(--warn-border)' : 'var(--accent-border)',
            color: !isOnline ? 'var(--warn-text)' : 'var(--accent)',
          }}
          onClick={() => setDrawerOpen(true)}
        >
          {!isOnline ? (
            <>
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium truncate">
                Mode hors-ligne autonome{simulatedOffline ? ' (simulé)' : ''} — Vos ventes, KDS & livraisons continuent
                {pendingCount > 0 ? ` · ${pendingCount} en file` : ''}
              </span>
            </>
          ) : isSyncing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
              <span className="font-medium">Synchronisation de {pendingCount} opération(s) en cours…</span>
            </>
          ) : (
            <>
              <Database className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium">{pendingCount} opération(s) en attente de synchronisation</span>
            </>
          )}
          <span className="underline font-semibold shrink-0">Détails</span>
        </div>
      )}

      {/* Pilule flottante ultra-discrète (en bas à gauche pour ne jamais gêner les CTA à droite) */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        title="Centre Hors-Ligne & Synchronisation Dineo"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: !isOnline ? 'var(--warn-border)' : 'var(--border-hairline)',
          color: 'var(--ink-primary)',
        }}
        className="no-print fixed bottom-[72px] md:bottom-4 left-3 z-30 h-8 px-2.5 rounded-full border shadow-sm flex items-center gap-1.5 text-[11.5px] font-medium cursor-pointer hover:border-[var(--border-strong)] transition-colors"
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{
            backgroundColor: !isOnline
              ? 'var(--warn-dot)'
              : isSyncing
                ? 'var(--accent)'
                : 'var(--ok-dot)',
          }}
        />
        <span className="hidden sm:inline">
          {!isOnline ? 'Hors-ligne' : isSyncing ? 'Synchro...' : 'Offline-First'}
        </span>
        {pendingCount > 0 && (
          <span
            className="px-1.5 py-0 rounded-full text-[10px] font-bold tabular-nums text-white"
            style={{ backgroundColor: !isOnline ? 'var(--warn-dot)' : 'var(--accent)' }}
          >
            {pendingCount}
          </span>
        )}
      </button>

      {/* Centre Hors-Ligne & Synchronisation (Drawer / Modale minimaliste) */}
      {drawerOpen && (
        <div
          className="no-print fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
          style={{ backgroundColor: 'rgba(16, 16, 14, 0.52)', backdropFilter: 'blur(3px)' }}
          onClick={() => setDrawerOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-hairline)',
              color: 'var(--ink-primary)',
            }}
            className="w-full sm:max-w-[480px] max-h-[90dvh] rounded-t-3xl sm:rounded-2xl border flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div
              className="px-4 py-3.5 border-b flex items-center justify-between gap-3 shrink-0"
              style={{ borderColor: 'var(--border-hairline)' }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: isOnline ? 'var(--ok-bg)' : 'var(--warn-bg)',
                    color: isOnline ? 'var(--ok-text)' : 'var(--warn-text)',
                  }}
                >
                  {isOnline ? <Wifi className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-[14.5px] font-semibold leading-tight">Centre Hors-Ligne & Synchro</h3>
                  <p className="text-[11.5px] truncate" style={{ color: 'var(--ink-muted)' }}>
                    {isOnline ? 'Connecté · Réplication active' : 'Autonomie locale 100 % active'} · {swLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--ink-muted)' }}
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
              {/* Mise à jour SW ou Installation PWA */}
              {(swStatus === 'UPDATE_AVAILABLE' || canInstallPwa) && (
                <div className="flex flex-wrap gap-2">
                  {canInstallPwa && (
                    <button
                      type="button"
                      onClick={installPwa}
                      style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
                      className="flex-1 h-10 px-3.5 rounded-xl text-[12.5px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      Installer Dineo sur l’appareil
                    </button>
                  )}
                  {swStatus === 'UPDATE_AVAILABLE' && (
                    <button
                      type="button"
                      onClick={applySwUpdate}
                      style={{ backgroundColor: 'var(--ok-dot)', color: '#FFFFFF' }}
                      className="flex-1 h-10 px-3.5 rounded-xl text-[12.5px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Appliquer la mise à jour
                    </button>
                  )}
                </div>
              )}

              {/* Switch simulation panne réseau (pratique pour tester en conditions réelles Maroua) */}
              <div
                className="p-3.5 rounded-xl border flex items-center justify-between gap-3"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-hairline)' }}
              >
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold">Simuler une coupure internet</div>
                  <div className="text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                    {browserOnline
                      ? 'Testez vos ventes, livraisons et file d’attente sans réseau.'
                      : 'Votre appareil est déjà physiquement hors-ligne.'}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={simulatedOffline}
                  onClick={() => setSimulatedOffline(!simulatedOffline)}
                  style={{
                    backgroundColor: simulatedOffline ? 'var(--warn-dot)' : 'var(--border-strong)',
                  }}
                  className="w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 cursor-pointer relative"
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      simulatedOffline ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Métriques IndexedDB & Cache */}
              <div className="grid grid-cols-3 gap-2.5">
                <div
                  className="p-3 rounded-xl border"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-hairline)' }}
                >
                  <div className="text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                    En attente
                  </div>
                  <div className="text-[18px] font-semibold tabular-nums mt-0.5">{pendingCount}</div>
                </div>
                <div
                  className="p-3 rounded-xl border"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-hairline)' }}
                >
                  <div className="text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                    Synchronisées
                  </div>
                  <div className="text-[18px] font-semibold tabular-nums mt-0.5" style={{ color: 'var(--ok-text)' }}>
                    {syncedCount}
                  </div>
                </div>
                <div
                  className="p-3 rounded-xl border"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-hairline)' }}
                >
                  <div className="text-[11px] flex items-center gap-1" style={{ color: 'var(--ink-muted)' }}>
                    <HardDrive className="w-3 h-3" />
                    Stockage DB
                  </div>
                  <div className="text-[14px] font-semibold tabular-nums mt-1">
                    {storageInfo ? `${storageInfo.usedMb} Mo` : 'IndexedDB'}
                  </div>
                  {archivedMediaCount > 0 && (
                    <div className="text-[10px]" style={{ color: 'var(--ink-muted)' }}>
                      {archivedMediaCount} preuve(s)
                    </div>
                  )}
                </div>
              </div>

              {/* Matrice claire : Autonome hors-ligne vs Réseau requis */}
              <div
                className="p-3.5 rounded-xl border space-y-2.5 text-[12px]"
                style={{ borderColor: 'var(--border-hairline)' }}
              >
                <div className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" style={{ color: 'var(--ok-dot)' }} />
                  Matrice d’autonomie Maroua (0 % internet requis)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ok-text)' }}>
                      100 % Hors-Ligne
                    </div>
                    <ul className="space-y-0.5 text-[11.5px]" style={{ color: 'var(--ink-secondary)' }}>
                      <li>• Caisse POS, Factures 80 mm & A4</li>
                      <li>• Cuisine KDS & Alertes 5 s / 10 s</li>
                      <li>• Déduction automatique des stocks</li>
                      <li>• Preuve Photo GPS, PIN & Signature</li>
                      <li>• Dérogation Caisse par appel GSM</li>
                    </ul>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>
                      Synchro au retour 3G/4G
                    </div>
                    <ul className="space-y-0.5 text-[11.5px]" style={{ color: 'var(--ink-secondary)' }}>
                      <li>• Réplication Cloud multi-appareils</li>
                      <li>• API Orange Money / MTN MoMo</li>
                      <li>• Google Maps & messages WhatsApp</li>
                      <li>• Sauvegarde distante des preuves</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* File de synchronisation (Outbox IndexedDB) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-semibold">
                    File de synchronisation ({queue.length})
                  </span>
                  <div className="flex items-center gap-2">
                    {syncedCount > 0 && (
                      <button
                        type="button"
                        onClick={clearSyncedHistory}
                        className="text-[11.5px] inline-flex items-center gap-1 hover:underline cursor-pointer"
                        style={{ color: 'var(--ink-muted)' }}
                      >
                        <Trash2 className="w-3 h-3" />
                        Purger
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!isOnline || isSyncing || pendingCount === 0}
                      onClick={() => syncNow()}
                      style={{
                        backgroundColor: isOnline && pendingCount > 0 ? 'var(--accent)' : 'var(--bg-subtle)',
                        color: isOnline && pendingCount > 0 ? '#FFFFFF' : 'var(--ink-muted)',
                      }}
                      className="h-7 px-2.5 rounded-lg text-[11.5px] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                      Synchroniser
                    </button>
                  </div>
                </div>

                {queue.length === 0 ? (
                  <div
                    className="p-4 rounded-xl border text-center text-[12px]"
                    style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink-muted)' }}
                  >
                    Aucune opération en attente. Passez en mode hors-ligne simulé et créez une vente ou une livraison pour voir la file IndexedDB en direct.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                    {queue.slice(0, 20).map((item) => (
                      <div
                        key={item.id}
                        className="px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-[12px]"
                        style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">{item.label}</div>
                          <div className="text-[11px] truncate" style={{ color: 'var(--ink-muted)' }}>
                            {item.summary} · {formatShortDateTime(item.createdAt)}
                          </div>
                        </div>
                        <span
                          className="shrink-0 px-2 py-0.5 rounded-full text-[10.5px] font-semibold inline-flex items-center gap-1"
                          style={{
                            backgroundColor:
                              item.status === 'SYNCED'
                                ? 'var(--ok-bg)'
                                : item.status === 'PENDING'
                                  ? 'var(--warn-bg)'
                                  : 'var(--accent-soft)',
                            color:
                              item.status === 'SYNCED'
                                ? 'var(--ok-text)'
                                : item.status === 'PENDING'
                                  ? 'var(--warn-text)'
                                  : 'var(--accent)',
                          }}
                        >
                          {item.status === 'SYNCED' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              Sync
                            </>
                          ) : item.status === 'SYNCING' ? (
                            'Envoi...'
                          ) : (
                            'En file'
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {lastSyncedAt && (
                  <div className="text-[11px] text-center pt-1" style={{ color: 'var(--ink-muted)' }}>
                    Dernière synchronisation : {formatShortDateTime(lastSyncedAt)}
                    {isStandalonePwa ? ' · Application installée (PWA)' : ''}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
