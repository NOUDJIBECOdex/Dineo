import { INITIAL_MOCK_ORDERS } from '../mocks/orders.mock';
import type {
  CreateOrderDTO,
  Order,
  OrderItem,
  OrderStatus,
} from '../types/order';
import { ALLOWED_STATUS_TRANSITIONS } from '../types/order';
import { realtimeService } from './realtime';
import { RestaurantService } from './restaurant.service';
import { StorageService } from './storage.service';

const ORDERS_STORAGE_KEY = 'orders_list';
const LAST_ORDER_NUMBER_KEY = 'last_order_num';

export class OrderService {
  /**
   * Initialise les commandes de démonstration en local si non existantes
   */
  private static getStoredOrders(): Order[] {
    const orders = StorageService.get<Order[]>(ORDERS_STORAGE_KEY, []);
    if (!orders || orders.length === 0) {
      StorageService.set(ORDERS_STORAGE_KEY, INITIAL_MOCK_ORDERS);
      return [...INITIAL_MOCK_ORDERS];
    }
    return orders;
  }

  private static saveOrders(orders: Order[]): void {
    StorageService.set(ORDERS_STORAGE_KEY, orders);
  }

  /**
   * Génère un numéro de commande séquentiel et lisible (ex: CMD-00125)
   */
  private static generateOrderNumber(): string {
    const lastNum = StorageService.get<number>(LAST_ORDER_NUMBER_KEY, 124);
    const nextNum = lastNum + 1;
    StorageService.set(LAST_ORDER_NUMBER_KEY, nextNum);
    return `CMD-${nextNum.toString().padStart(5, '0')}`;
  }

  /**
   * Récupère toutes les commandes d'un restaurant
   */
  public static async getOrders(restaurantId?: string): Promise<Order[]> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const orders = this.getStoredOrders();
    if (restaurantId) {
      return orders.filter((o) => o.restaurantId === restaurantId);
    }
    return orders;
  }

  /**
   * Récupère une commande par son ID
   */
  public static async getOrderById(orderId: string): Promise<Order | null> {
    await new Promise((resolve) => setTimeout(resolve, 30));
    const orders = this.getStoredOrders();
    const found = orders.find((o) => o.id === orderId);
    return found ? { ...found } : null;
  }

  /**
   * Crée une nouvelle commande client
   */
  public static async createOrder(dto: CreateOrderDTO): Promise<Order> {
    const restaurant = await RestaurantService.getRestaurant();
    const nowIso = new Date().toISOString();

    // Construction et calcul côté service des items commandés
    const calculatedItems: OrderItem[] = [];
    let subtotal = 0;

    for (const itemDto of dto.items) {
      const menuItem = restaurant.items.find((i) => i.id === itemDto.menuItemId);
      if (!menuItem) {
        throw new Error(`Produit introuvable : ${itemDto.menuItemId}`);
      }

      let extraPriceTotal = 0;
      if (itemDto.selectedChoices && itemDto.selectedChoices.length > 0) {
        for (const choice of itemDto.selectedChoices) {
          extraPriceTotal += choice.extraPrice || 0;
        }
      }

      const unitPrice = menuItem.price + extraPriceTotal;
      const itemTotal = unitPrice * itemDto.quantity;
      subtotal += itemTotal;

      calculatedItems.push({
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        menuItemId: menuItem.id,
        name: menuItem.name,
        unitPrice,
        quantity: itemDto.quantity,
        selectedChoices: itemDto.selectedChoices,
        specialInstructions: itemDto.specialInstructions,
        totalPrice: itemTotal,
      });
    }

    const orderNumber = this.generateOrderNumber();
    const newOrder: Order = {
      id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      orderNumber,
      restaurantId: dto.restaurantId,
      status: 'PENDING',
      context: dto.context,
      source: dto.source,
      customer: dto.customer,
      items: calculatedItems,
      subtotal,
      total: subtotal,
      statusHistory: [
        {
          status: 'PENDING',
          timestamp: nowIso,
          note: dto.context.type === 'TABLE'
            ? `Commande passée à la ${dto.context.tableName || `Table ${dto.context.tableNumber}`}`
            : 'Commande passée à emporter',
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const orders = this.getStoredOrders();
    orders.unshift(newOrder); // Placer en tête de liste
    this.saveOrders(orders);

    // Diffusion de l'événement temps réel
    realtimeService.publish({
      type: 'ORDER_CREATED',
      order: newOrder,
      restaurantId: newOrder.restaurantId,
      timestamp: nowIso,
    });

    return newOrder;
  }

  /**
   * Fait évoluer le statut d'une commande selon la machine d'états
   */
  public static async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    note?: string
  ): Promise<Order> {
    const orders = this.getStoredOrders();
    const orderIndex = orders.findIndex((o) => o.id === orderId);

    if (orderIndex === -1) {
      throw new Error(`Commande ${orderId} introuvable`);
    }

    const order = orders[orderIndex];
    const previousStatus = order.status;

    // Validation stricte des transitions autorisées
    const allowed = ALLOWED_STATUS_TRANSITIONS[previousStatus];
    if (!allowed.includes(newStatus)) {
      throw new Error(
        `Transition de statut non autorisée de "${previousStatus}" vers "${newStatus}"`
      );
    }

    const nowIso = new Date().toISOString();
    order.status = newStatus;
    order.updatedAt = nowIso;
    order.statusHistory.push({
      status: newStatus,
      timestamp: nowIso,
      note,
    });

    orders[orderIndex] = order;
    this.saveOrders(orders);

    // Publication temps réel
    realtimeService.publish({
      type: 'ORDER_STATUS_CHANGED',
      orderId,
      previousStatus,
      newStatus,
      note,
      order: { ...order },
      restaurantId: order.restaurantId,
      timestamp: nowIso,
    });

    return { ...order };
  }

  /**
   * Refuse une commande avec motif
   */
  public static async refuseOrder(orderId: string, reason: string): Promise<Order> {
    const orders = this.getStoredOrders();
    const orderIndex = orders.findIndex((o) => o.id === orderId);

    if (orderIndex === -1) {
      throw new Error(`Commande ${orderId} introuvable`);
    }

    const order = orders[orderIndex];
    if (order.status !== 'PENDING') {
      throw new Error('Seule une commande en attente (PENDING) peut être refusée');
    }

    const nowIso = new Date().toISOString();
    order.status = 'REFUSED';
    order.rejectionReason = reason;
    order.updatedAt = nowIso;
    order.statusHistory.push({
      status: 'REFUSED',
      timestamp: nowIso,
      note: `Commande refusée : ${reason}`,
    });

    orders[orderIndex] = order;
    this.saveOrders(orders);

    realtimeService.publish({
      type: 'ORDER_REFUSED',
      orderId,
      reason,
      order: { ...order },
      restaurantId: order.restaurantId,
      timestamp: nowIso,
    });

    return { ...order };
  }

  /**
   * Annule une commande (côté client ou caisse)
   */
  public static async cancelOrder(orderId: string, reason: string): Promise<Order> {
    const orders = this.getStoredOrders();
    const orderIndex = orders.findIndex((o) => o.id === orderId);

    if (orderIndex === -1) {
      throw new Error(`Commande ${orderId} introuvable`);
    }

    const order = orders[orderIndex];
    if (order.status === 'READY' || order.status === 'COMPLETED') {
      throw new Error('Une commande déjà prête ou terminée ne peut plus être annulée');
    }

    const nowIso = new Date().toISOString();
    order.status = 'CANCELLED';
    order.updatedAt = nowIso;
    order.statusHistory.push({
      status: 'CANCELLED',
      timestamp: nowIso,
      note: `Commande annulée : ${reason}`,
    });

    orders[orderIndex] = order;
    this.saveOrders(orders);

    realtimeService.publish({
      type: 'ORDER_CANCELLED',
      orderId,
      reason,
      order: { ...order },
      restaurantId: order.restaurantId,
      timestamp: nowIso,
    });

    return { ...order };
  }
}
