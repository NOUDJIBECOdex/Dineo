import { BroadcastRealtimeAdapter } from './broadcast.adapter';
import type { IRealtimeService } from './realtime.interface';

// Singleton d'adaptateur temps réel
// Peut être remplacé ultérieurement par un WebSocketRealtimeAdapter sans modifier les composants ni les hooks
export const realtimeService: IRealtimeService = new BroadcastRealtimeAdapter();

export type * from './realtime.interface';
