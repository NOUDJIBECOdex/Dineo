import { useEffect, useState } from 'react';
import { OrderService } from '../services/order.service';
import { realtimeService } from '../services/realtime';
import type { OrderEvent } from '../types/events';
import type { Order } from '../types/order';

export function useOrderTracking(orderId: string | null) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadOrder = async () => {
      try {
        setLoading(true);
        const data = await OrderService.getOrderById(orderId);
        if (isMounted) {
          if (data) {
            setOrder(data);
            setError(null);
          } else {
            setError(`Commande #${orderId} introuvable.`);
          }
        }
      } catch {
        if (isMounted) {
          setError('Erreur de chargement de la commande.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadOrder();

    // Abonnement temps réel aux changements de la commande
    const unsubscribe = realtimeService.subscribe('rest-001', (event: OrderEvent) => {
      if (
        (event.type === 'ORDER_STATUS_CHANGED' ||
          event.type === 'ORDER_REFUSED' ||
          event.type === 'ORDER_CANCELLED') &&
        event.orderId === orderId
      ) {
        if (isMounted) {
          setOrder(event.order);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [orderId]);

  const cancelOrder = async (reason = 'Annulé par le client') => {
    if (!orderId) return;
    try {
      const updated = await OrderService.cancelOrder(orderId, reason);
      setOrder(updated);
    } catch (err) {
      console.error('Impossible d\'annuler la commande:', err);
      throw err;
    }
  };

  return {
    order,
    loading,
    error,
    cancelOrder,
  };
}
