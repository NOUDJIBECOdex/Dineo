import type { OrderEvent } from '../../types/events';

export type EventCallback = (event: OrderEvent) => void;

export interface IRealtimeService {
  /**
   * S'abonne aux événements d'un restaurant spécifique ou global
   * Retourne une fonction de désabonnement
   */
  subscribe(restaurantId: string, callback: EventCallback): () => void;

  /**
   * Diffuse un événement temps réel (création, changement de statut, refus)
   */
  publish(event: OrderEvent): void;
}
