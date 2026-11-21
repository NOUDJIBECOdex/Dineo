import type { OrderEvent } from '../../types/events';
import type { EventCallback, IRealtimeService } from './realtime.interface';

const CHANNEL_NAME = 'dineo_order_sync_channel';
const STORAGE_SYNC_KEY = 'dineo_realtime_event_dispatch';

export class BroadcastRealtimeAdapter implements IRealtimeService {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private globalListeners: Set<EventCallback> = new Set();

  constructor() {
    this.initChannel();
    this.initStorageFallback();
  }

  private initChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event: MessageEvent<OrderEvent>) => {
          if (event && event.data) {
            this.dispatchLocally(event.data);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel not available, falling back to storage events', err);
      }
    }
  }

  private initStorageFallback() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_SYNC_KEY && event.newValue) {
          try {
            const parsedEvent = JSON.parse(event.newValue) as OrderEvent;
            this.dispatchLocally(parsedEvent);
          } catch {
            // ignore JSON parse errors
          }
        }
      });
    }
  }

  public subscribe(restaurantId: string, callback: EventCallback): () => void {
    if (!this.listeners.has(restaurantId)) {
      this.listeners.set(restaurantId, new Set());
    }
    this.listeners.get(restaurantId)!.add(callback);
    this.globalListeners.add(callback);

    return () => {
      this.listeners.get(restaurantId)?.delete(callback);
      this.globalListeners.delete(callback);
    };
  }

  public publish(event: OrderEvent): void {
    // 1. Notifier les auditeurs locaux de l'onglet courant
    this.dispatchLocally(event);

    // 2. Diffuser via BroadcastChannel aux autres onglets
    if (this.channel) {
      try {
        this.channel.postMessage(event);
      } catch (err) {
        console.error('BroadcastChannel postMessage failed:', err);
      }
    }

    // 3. Diffuser via Storage Event (redondance fiable)
    try {
      localStorage.setItem(STORAGE_SYNC_KEY, JSON.stringify(event));
    } catch {
      // ignore
    }
  }

  private dispatchLocally(event: OrderEvent): void {
    const restaurantListeners = this.listeners.get(event.restaurantId);
    if (restaurantListeners) {
      restaurantListeners.forEach((cb) => {
        try {
          cb(event);
        } catch (e) {
          console.error('Error in order event listener callback:', e);
        }
      });
    }

    // Notifier également les écouteurs globaux
    this.globalListeners.forEach((cb) => {
      if (!restaurantListeners || !restaurantListeners.has(cb)) {
        try {
          cb(event);
        } catch (e) {
          console.error('Error in global event listener callback:', e);
        }
      }
    });
  }
}
