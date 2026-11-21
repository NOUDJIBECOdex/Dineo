import React, { createContext, useContext, useEffect, useState } from 'react';
import { OrderService } from '../services/order.service';
import { realtimeService } from '../services/realtime';
import type { OrderEvent } from '../types/events';
import type { Order } from '../types/order';
import { soundNotifier } from '../utils/sound';

interface OrderStats {
  pendingCount: number;
  inPreparationCount: number;
  readyCount: number;
  completedCount: number;
  totalActiveCount: number;
}

interface OrderContextType {
  orders: Order[];
  loading: boolean;
  stats: OrderStats;
  soundEnabled: boolean;
  toggleSound: () => void;
  refreshOrders: () => Promise<void>;
  acceptOrder: (orderId: string) => Promise<Order>;
  refuseOrder: (orderId: string, reason: string) => Promise<Order>;
  startPreparation: (orderId: string) => Promise<Order>;
  markReady: (orderId: string) => Promise<Order>;
  markCompleted: (orderId: string) => Promise<Order>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const fetchOrders = async () => {
    try {
      const data = await OrderService.getOrders();
      setOrders(data);
    } catch (err) {
      console.error('Erreur lors du chargement des commandes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Abonnement temps réel
    const unsubscribe = realtimeService.subscribe('rest-001', (event: OrderEvent) => {
      if (event.type === 'ORDER_CREATED') {
        setOrders((prev) => {
          // Éviter les doublons
          if (prev.some((o) => o.id === event.order.id)) return prev;
          return [event.order, ...prev];
        });
        // Déclencher le carillon d'alerte pour le restaurant
        soundNotifier.playNewOrderChime();
      } else if (
        event.type === 'ORDER_STATUS_CHANGED' ||
        event.type === 'ORDER_REFUSED' ||
        event.type === 'ORDER_CANCELLED'
      ) {
        setOrders((prev) =>
          prev.map((ord) => (ord.id === event.order.id ? { ...event.order } : ord))
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundNotifier.setSoundEnabled(next);
  };

  const acceptOrder = async (orderId: string) => {
    const updated = await OrderService.updateOrderStatus(
      orderId,
      'ACCEPTED',
      'Commande acceptée par le restaurant'
    );
    setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    return updated;
  };

  const refuseOrder = async (orderId: string, reason: string) => {
    const updated = await OrderService.refuseOrder(orderId, reason);
    setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    return updated;
  };

  const startPreparation = async (orderId: string) => {
    const updated = await OrderService.updateOrderStatus(
      orderId,
      'IN_PREPARATION',
      'Préparation lancée en cuisine'
    );
    setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    return updated;
  };

  const markReady = async (orderId: string) => {
    const updated = await OrderService.updateOrderStatus(
      orderId,
      'READY',
      'Plats prêts au passe / comptoir'
    );
    setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    return updated;
  };

  const markCompleted = async (orderId: string) => {
    const updated = await OrderService.updateOrderStatus(
      orderId,
      'COMPLETED',
      'Commande remise et clôturée'
    );
    setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    return updated;
  };

  const stats: OrderStats = {
    pendingCount: orders.filter((o) => o.status === 'PENDING').length,
    inPreparationCount: orders.filter((o) => o.status === 'IN_PREPARATION').length,
    readyCount: orders.filter((o) => o.status === 'READY').length,
    completedCount: orders.filter((o) => o.status === 'COMPLETED').length,
    totalActiveCount: orders.filter((o) =>
      ['PENDING', 'ACCEPTED', 'IN_PREPARATION', 'READY'].includes(o.status)
    ).length,
  };

  return (
    <OrderContext.Provider
      value={{
        orders,
        loading,
        stats,
        soundEnabled,
        toggleSound,
        refreshOrders: fetchOrders,
        acceptOrder,
        refuseOrder,
        startPreparation,
        markReady,
        markCompleted,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = (): OrderContextType => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders doit être utilisé à l\'intérieur d\'un OrderProvider');
  }
  return context;
};
