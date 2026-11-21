export type OrderStatus =
  | 'PENDING'         // Commande passée par le client, en attente de validation
  | 'ACCEPTED'        // Validée par le restaurant
  | 'IN_PREPARATION'  // En cours de préparation en cuisine
  | 'READY'           // Prête à être servie ou retirée
  | 'COMPLETED'       // Servie / Clôturée
  | 'REFUSED'         // Refusée par le restaurant
  | 'CANCELLED';      // Annulée par le client

export type OrderSource = 'QR_TABLE' | 'DIRECT_LINK' | 'COUNTER';
export type OrderContextType = 'TABLE' | 'TAKEAWAY' | 'ONLINE';

export interface OrderContext {
  type: OrderContextType;
  tableNumber?: string;
  tableName?: string;
}

export interface CustomerInfo {
  name: string;
  phone?: string;
  notes?: string;
}

export interface SelectedOptionChoice {
  optionId: string;
  optionName: string;
  choiceId: string;
  choiceName: string;
  extraPrice: number;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  selectedChoices?: SelectedOptionChoice[];
  specialInstructions?: string;
  totalPrice: number;
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

export interface Order {
  id: string;
  orderNumber: string; // ex: "CMD-00125"
  restaurantId: string;
  status: OrderStatus;
  statusHistory: StatusHistoryEntry[];
  context: OrderContext;
  source: OrderSource;
  customer: CustomerInfo;
  items: OrderItem[];
  subtotal: number;
  total: number;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderDTO {
  restaurantId: string;
  context: OrderContext;
  source: OrderSource;
  customer: CustomerInfo;
  items: Array<{
    menuItemId: string;
    quantity: number;
    selectedChoices?: SelectedOptionChoice[];
    specialInstructions?: string;
  }>;
}

// Machine d'états : Transitions légales autorisées
export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['ACCEPTED', 'REFUSED', 'CANCELLED'],
  ACCEPTED: ['IN_PREPARATION', 'CANCELLED'],
  IN_PREPARATION: ['READY', 'CANCELLED'],
  READY: ['COMPLETED'],
  COMPLETED: [],
  REFUSED: [],
  CANCELLED: [],
};

// Libellés clairs et rassurants côté client
export const CLIENT_STATUS_LABELS: Record<OrderStatus, { title: string; description: string; stepIndex: number }> = {
  PENDING: {
    title: 'Commande transmise',
    description: 'En attente de confirmation par le restaurant...',
    stepIndex: 1,
  },
  ACCEPTED: {
    title: 'Commande acceptée',
    description: 'Le restaurant a validé votre commande.',
    stepIndex: 2,
  },
  IN_PREPARATION: {
    title: 'En préparation',
    description: 'Le chef et la brigade préparent vos plats.',
    stepIndex: 3,
  },
  READY: {
    title: 'Commande prête !',
    description: 'Vos plats sont prêts à vous être servis à table.',
    stepIndex: 4,
  },
  COMPLETED: {
    title: 'Commande terminée',
    description: 'Bon appétit ! Merci de votre visite.',
    stepIndex: 5,
  },
  REFUSED: {
    title: 'Commande non acceptée',
    description: 'Le restaurant ne peut pas honorer cette commande actuellement.',
    stepIndex: -1,
  },
  CANCELLED: {
    title: 'Commande annulée',
    description: 'Cette commande a été annulée.',
    stepIndex: -1,
  },
};

// Libellés côté restaurant
export const RESTAURANT_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Nouvelle',
  ACCEPTED: 'Acceptée',
  IN_PREPARATION: 'En préparation',
  READY: 'Prête',
  COMPLETED: 'Terminée',
  REFUSED: 'Refusée',
  CANCELLED: 'Annulée',
};
