import type { Order, OrderStatus } from './order';

export type OrderEventType =
  | 'ORDER_CREATED'
  | 'ORDER_STATUS_CHANGED'
  | 'ORDER_REFUSED'
  | 'ORDER_CANCELLED';

export interface BaseOrderEvent {
  type: OrderEventType;
  timestamp: string;
  restaurantId: string;
}

export interface OrderCreatedEvent extends BaseOrderEvent {
  type: 'ORDER_CREATED';
  order: Order;
}

export interface OrderStatusChangedEvent extends BaseOrderEvent {
  type: 'ORDER_STATUS_CHANGED';
  orderId: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  note?: string;
  order: Order;
}

export interface OrderRefusedEvent extends BaseOrderEvent {
  type: 'ORDER_REFUSED';
  orderId: string;
  reason?: string;
  order: Order;
}

export interface OrderCancelledEvent extends BaseOrderEvent {
  type: 'ORDER_CANCELLED';
  orderId: string;
  reason?: string;
  order: Order;
}

export type OrderEvent =
  | OrderCreatedEvent
  | OrderStatusChangedEvent
  | OrderRefusedEvent
  | OrderCancelledEvent;
