import {
  BellRing,
  Check,
  ChefHat,
  Clock,
  MessageSquare,
  QrCode,
  ShoppingBag,
  Truck,
  Utensils,
  VolumeX,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useErp } from '../../../store/erp.context';
import type { ErpOrder } from '../../../types/erp';
import { formatTimeAgo } from '../../../utils/date';
import { soundNotifier } from '../../../utils/sound';
import {
  Btn,
  EmptyState,
  FilterTabs,
  PageHeader,
  StatusPill,
  Surface,
  channelLabel,
  kitchenStatusMeta,
} from '../ui/Primitives';

export const KdsView: React.FC = () => {
  const { state, updateKitchenStatus } = useErp();
  const [filter, setFilter] = useState<'ACTIVE' | 'NOUVELLE' | 'EN_PREPARATION' | 'PRETE' | 'SERVIE'>('ACTIVE');
  const [kitchenAlarmRinging, setKitchenAlarmRinging] = useState(false);

  const newOrderIds = useMemo(
    () => state.orders.filter((o) => o.kitchenStatus === 'NOUVELLE').map((o) => o.id),
    [state.orders]
  );

  // Déclenche la sonnerie cuisine (5 secondes) lorsqu'une nouvelle commande entre en file KDS
  const prevNewIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    const prev = prevNewIdsRef.current;
    const hasBrandNew = initializedRef.current && newOrderIds.some((id) => !prev.has(id));
    prevNewIdsRef.current = new Set(newOrderIds);
    initializedRef.current = true;

    if (hasBrandNew) {
      queueMicrotask(() => setKitchenAlarmRinging(true));
      soundNotifier.playKitchenNewOrderAlarm(5, () => {
        setKitchenAlarmRinging(false);
      });
    }
  }, [newOrderIds]);

  useEffect(() => {
    return () => {
      soundNotifier.stopKitchenNewOrderAlarm();
    };
  }, []);

  const handleToggleKitchenTest = () => {
    soundNotifier.unlockAudio();
    if (kitchenAlarmRinging) {
      soundNotifier.stopKitchenNewOrderAlarm();
      setKitchenAlarmRinging(false);
    } else {
      setKitchenAlarmRinging(true);
      soundNotifier.playKitchenNewOrderAlarm(5, () => {
        setKitchenAlarmRinging(false);
      });
    }
  };

  const handleStartOrder = (orderId: string) => {
    soundNotifier.unlockAudio();
    soundNotifier.stopKitchenNewOrderAlarm();
    setKitchenAlarmRinging(false);
    updateKitchenStatus(orderId, 'EN_PREPARATION');
  };

  const counts = useMemo(
    () => ({
      ACTIVE: state.orders.filter((o) => ['NOUVELLE', 'EN_PREPARATION', 'PRETE'].includes(o.kitchenStatus)).length,
      NOUVELLE: state.orders.filter((o) => o.kitchenStatus === 'NOUVELLE').length,
      EN_PREPARATION: state.orders.filter((o) => o.kitchenStatus === 'EN_PREPARATION').length,
      PRETE: state.orders.filter((o) => o.kitchenStatus === 'PRETE').length,
      SERVIE: state.orders.filter((o) => o.kitchenStatus === 'SERVIE').length,
    }),
    [state.orders]
  );

  const visibleOrders = useMemo(() => {
    if (filter === 'ACTIVE') {
      return state.orders.filter((o) => ['NOUVELLE', 'EN_PREPARATION', 'PRETE'].includes(o.kitchenStatus));
    }
    return state.orders.filter((o) => o.kitchenStatus === filter);
  }, [state.orders, filter]);

  const renderCard = (ord: ErpOrder) => {
    const meta = kitchenStatusMeta(ord.kitchenStatus);
    const ChannelIcon =
      ord.channel === 'SUR_PLACE' ? Utensils : ord.channel === 'LIVRAISON' ? Truck : ShoppingBag;

    return (
      <Surface key={ord.id} padding="none" className="flex flex-col justify-between overflow-hidden">
        {/* Top bar */}
        <div
          className="px-4 py-3 border-b flex items-center justify-between gap-2"
          style={{
            borderColor: 'var(--border-hairline)',
            backgroundColor: ord.kitchenStatus === 'NOUVELLE' ? 'var(--warn-bg)' : 'var(--bg-subtle)',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono font-semibold text-[14px]">{ord.orderNumber}</span>
            <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
          </div>
          <div className="flex items-center gap-1 text-[11.5px] shrink-0" style={{ color: 'var(--ink-muted)' }}>
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTimeAgo(ord.createdAt)}</span>
          </div>
        </div>

        {/* Context */}
        <div className="p-4 flex-1 space-y-3">
          <div className="flex items-center justify-between gap-2 text-[12.5px]">
            <div className="flex items-center gap-1.5 font-medium">
              <ChannelIcon className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
              <span>
                {channelLabel(ord.channel)}
                {ord.tableNumber ? ` · ${ord.tableNumber}` : ''}
                {ord.deliveryNeighborhood ? ` · ${ord.deliveryNeighborhood}` : ''}
              </span>
            </div>
            {ord.source === 'QR_TABLE' && (
              <span
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border"
                style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink-muted)' }}
              >
                <QrCode className="w-3 h-3" />
                QR
              </span>
            )}
          </div>

          <div className="text-[12px]" style={{ color: 'var(--ink-muted)' }}>
            Client : <span style={{ color: 'var(--ink-primary)' }}>{ord.customerName}</span>
          </div>

          {/* Items list */}
          <div
            className="rounded-lg border divide-y text-[13px]"
            style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-canvas)' }}
          >
            {ord.items.map((item) => (
              <div key={item.id} className="px-3 py-2 flex items-start gap-2.5">
                <span
                  className="font-mono font-semibold text-[12px] px-1.5 py-0.5 rounded shrink-0 tabular-nums"
                  style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--accent)' }}
                >
                  {item.quantity}×
                </span>
                <div className="flex-1 leading-snug">
                  <div className="font-medium">{item.name}</div>
                  {item.notes && (
                    <div className="text-[11.5px] italic mt-0.5" style={{ color: 'var(--warn-text)' }}>
                      {item.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {ord.notes && (
            <div
              className="p-2.5 rounded-lg border text-[12px] flex items-start gap-2"
              style={{ borderColor: 'var(--warn-border)', backgroundColor: 'var(--warn-bg)', color: 'var(--warn-text)' }}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{ord.notes}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 py-3 border-t flex items-center justify-end gap-2" style={{ borderColor: 'var(--border-hairline)' }}>
          {ord.kitchenStatus === 'NOUVELLE' && (
            <>
              <Btn variant="danger" size="sm" onClick={() => updateKitchenStatus(ord.id, 'ANNULEE')}>
                Annuler
              </Btn>
              <Btn
                variant="accent"
                size="sm"
                leftIcon={<ChefHat className="w-3.5 h-3.5" />}
                onClick={() => handleStartOrder(ord.id)}
              >
                Démarrer
              </Btn>
            </>
          )}
          {ord.kitchenStatus === 'EN_PREPARATION' && (
            <Btn
              variant="primary"
              size="sm"
              leftIcon={<Check className="w-3.5 h-3.5" />}
              onClick={() => updateKitchenStatus(ord.id, 'PRETE')}
            >
              Prêt à servir
            </Btn>
          )}
          {ord.kitchenStatus === 'PRETE' && (
            <Btn
              variant="secondary"
              size="sm"
              leftIcon={<Check className="w-3.5 h-3.5" />}
              onClick={() => updateKitchenStatus(ord.id, 'SERVIE')}
            >
              Marquer servie
            </Btn>
          )}
          {ord.kitchenStatus === 'SERVIE' && (
            <span className="text-[12px]" style={{ color: 'var(--ink-muted)' }}>
              Service terminé
            </span>
          )}
        </div>
      </Surface>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cuisine (KDS)"
        description="Écran en direct avec alerte sonore 5 s à chaque nouvelle commande — Caisse POS, QR Tables & Mobile"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Btn
              variant={kitchenAlarmRinging ? 'accent' : 'secondary'}
              size="sm"
              leftIcon={kitchenAlarmRinging ? <VolumeX className="w-3.5 h-3.5" /> : <BellRing className="w-3.5 h-3.5" />}
              onClick={handleToggleKitchenTest}
            >
              {kitchenAlarmRinging ? 'Couper l’alerte (5 s)' : 'Test son cuisine (5 s)'}
            </Btn>
            <FilterTabs
              activeId={filter}
              onChange={(id) => setFilter(id as typeof filter)}
              tabs={[
                { id: 'ACTIVE', label: 'Actives', count: counts.ACTIVE },
                { id: 'NOUVELLE', label: 'Nouvelles', count: counts.NOUVELLE },
                { id: 'EN_PREPARATION', label: 'En cuisine', count: counts.EN_PREPARATION },
                { id: 'PRETE', label: 'Prêtes', count: counts.PRETE },
                { id: 'SERVIE', label: 'Servies', count: counts.SERVIE },
              ]}
            />
          </div>
        }
      />

      {visibleOrders.length === 0 ? (
        <EmptyState
          icon={<ChefHat className="w-5 h-5" />}
          title="Aucune commande dans cette file"
          description="Les nouvelles commandes saisies en caisse ou scannées par QR Code à table apparaîtront automatiquement ici."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleOrders.map(renderCard)}
        </div>
      )}
    </div>
  );
};
