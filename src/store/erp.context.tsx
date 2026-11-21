import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  INITIAL_AUDIT_LOGS,
  INITIAL_CATEGORIES,
  INITIAL_CUSTOMERS,
  INITIAL_DRIVERS,
  INITIAL_EMPLOYEES,
  INITIAL_EXPENSES,
  INITIAL_LOYALTY_CONFIG,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_PURCHASES,
  INITIAL_RESERVATIONS,
  INITIAL_SALARIES,
  INITIAL_SETTINGS,
  INITIAL_STOCK_ITEMS,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_SUPPLIERS,
  INITIAL_TABLES,
  INITIAL_USERS,
} from '../mocks/maroua.seed';
import { OfflineDb } from '../services/offline/indexeddb';
import { realtimeService } from '../services/realtime';
import { StorageService } from '../services/storage.service';
import type {
  AppUser,
  AuditLogEntry,
  Customer,
  DeliveryDriver,
  DeliveryStatus,
  DiningTable,
  Employee,
  ErpOrder,
  ErpOrderItem,
  Expense,
  GeoSnapshot,
  KitchenStatus,
  LoyaltyConfig,
  NavModuleId,
  OrderChannel,
  PaymentMethod,
  Product,
  ProductCategory,
  PurchaseOrder,
  PurchaseOrderItem,
  Reservation,
  ReservationStatus,
  RestaurantSettings,
  SalarySlip,
  StockItem,
  StockMovement,
  Supplier,
  TableStatus,
  WaiterCallAlert,
} from '../types/erp';
import type { OrderEvent } from '../types/events';
import { soundNotifier } from '../utils/sound';
import { emitOfflineOperation } from './offline.context';
import { applyBrandTheme } from '../utils/theme';

const STORE_KEY = 'erp_state_v3';
const SYNC_CHANNEL_NAME = 'dineo_erp_sync_v3';

interface ErpState {
  settings: RestaurantSettings;
  categories: ProductCategory[];
  products: Product[];
  stockItems: StockItem[];
  stockMovements: StockMovement[];
  tables: DiningTable[];
  reservations: Reservation[];
  customers: Customer[];
  loyaltyConfig: LoyaltyConfig;
  drivers: DeliveryDriver[];
  orders: ErpOrder[];
  suppliers: Supplier[];
  purchases: PurchaseOrder[];
  expenses: Expense[];
  employees: Employee[];
  salaries: SalarySlip[];
  users: AppUser[];
  auditLogs: AuditLogEntry[];
  waiterCalls: WaiterCallAlert[];
  lastOrderSeq: number;
  lastPurchaseSeq: number;
  lastSalarySeq: number;
  darkMode: boolean;
}

const getInitialState = (): ErpState => ({
  settings: INITIAL_SETTINGS,
  categories: INITIAL_CATEGORIES,
  products: INITIAL_PRODUCTS,
  stockItems: INITIAL_STOCK_ITEMS,
  stockMovements: INITIAL_STOCK_MOVEMENTS,
  tables: INITIAL_TABLES,
  reservations: INITIAL_RESERVATIONS,
  customers: INITIAL_CUSTOMERS,
  loyaltyConfig: INITIAL_LOYALTY_CONFIG,
  drivers: INITIAL_DRIVERS,
  orders: INITIAL_ORDERS,
  suppliers: INITIAL_SUPPLIERS,
  purchases: INITIAL_PURCHASES,
  expenses: INITIAL_EXPENSES,
  employees: INITIAL_EMPLOYEES,
  salaries: INITIAL_SALARIES,
  users: INITIAL_USERS,
  auditLogs: INITIAL_AUDIT_LOGS,
  waiterCalls: [],
  lastOrderSeq: 144,
  lastPurchaseSeq: 14,
  lastSalarySeq: 102,
  darkMode: false,
});

export interface CreatePosOrderInput {
  channel: OrderChannel;
  items: ErpOrderItem[];
  discountType: 'NONE' | 'PERCENT' | 'AMOUNT';
  discountValue: number;
  deliveryFee: number;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  tableId?: string;
  deliveryNeighborhood?: string;
  deliveryAddress?: string;
  notes?: string;
  paymentMode: 'FULL' | 'PARTIAL' | 'UNPAID';
  paymentMethod: PaymentMethod;
  amountPaidNow: number;
}

export interface CreateClientOrderInput {
  channel: OrderChannel;
  source: 'QR_TABLE' | 'EN_LIGNE';
  items: ErpOrderItem[];
  customerName: string;
  customerPhone: string;
  tableNumber?: string;
  deliveryNeighborhood?: string;
  deliveryAddress?: string;
  deliveryFee: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface CompleteDeliveryProofInput {
  orderId: string;
  photoDataUrl: string;
  photoQualityScore?: number;
  geo?: GeoSnapshot;
  pinEntered?: string;
  bypassPinReason?: string;
  /** Code de dérogation à 4 chiffres dicté par la caisse au téléphone en cas de client sans téléphone */
  managerOverrideEntered?: string;
  /** Nom complet + signature manuscrite du réceptionnaire en mode dérogation */
  recipientName?: string;
  recipientSignature?: string;
  paymentCollected?: { amount: number; method: PaymentMethod };
  note?: string;
  driverName: string;
}

export interface ConfirmClientReceiptInput {
  orderId: string;
  status: 'RECEIVED_OK' | 'ISSUE_REPORTED';
  rating?: number;
  photoDataUrl?: string;
  comment?: string;
}

interface ErpContextValue {
  state: ErpState;
  isAuthenticated: boolean;
  currentUser: AppUser;
  login: (username: string, password?: string) => { ok: boolean; error?: string };
  quickLogin: (userId: string) => void;
  logout: () => void;
  switchUser: (userId: string) => void;
  hasPermission: (module: NavModuleId) => boolean;
  toggleDarkMode: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;

  // Orders / POS / Client Mobile / KDS / Billing / Partial Payments / Deliveries
  createPosOrder: (input: CreatePosOrderInput) => ErpOrder;
  createClientOrder: (input: CreateClientOrderInput) => ErpOrder;
  callWaiter: (tableNumber: string, reason: string, customerName?: string) => void;
  resolveWaiterCall: (id: string) => void;
  updateKitchenStatus: (orderId: string, status: KitchenStatus) => void;
  recordOrderPayment: (orderId: string, amount: number, method: PaymentMethod, note?: string) => void;
  assignDriver: (orderId: string, driverId: string | null) => void;
  updateDeliveryStatus: (orderId: string, status: DeliveryStatus) => void;
  completeDeliveryWithProof: (input: CompleteDeliveryProofInput) => { ok: boolean; error?: string };
  confirmClientDeliveryReceipt: (input: ConfirmClientReceiptInput) => void;
  flagDeliveryProof: (orderId: string, reason: string) => void;

  // Products & Categories
  addCategory: (name: string, description?: string) => void;
  saveProduct: (product: Omit<Product, 'id'>, existingId?: string, autoCreateStock?: boolean) => void;
  deleteProduct: (id: string) => void;

  // Stock & Movements
  addStockItem: (item: Omit<StockItem, 'id' | 'updatedAt'>) => void;
  recordStockMovement: (stockItemId: string, type: 'ENTREE' | 'SORTIE' | 'AJUSTEMENT', quantity: number, reason: string) => void;

  // Tables & Reservations
  saveTable: (table: Omit<DiningTable, 'id'>, existingId?: string) => void;
  updateTableStatus: (tableId: string, status: TableStatus) => void;
  deleteTable: (tableId: string) => void;
  addReservation: (res: Omit<Reservation, 'id' | 'createdAt' | 'status'>) => void;
  updateReservationStatus: (resId: string, status: ReservationStatus) => void;

  // Customers & Loyalty
  saveCustomer: (customer: Omit<Customer, 'id' | 'points' | 'ordersCount' | 'totalSpent' | 'createdAt'>, existingId?: string) => Customer;
  updateLoyaltyConfig: (config: LoyaltyConfig) => void;
  adjustCustomerPoints: (customerId: string, delta: number, reason: string) => void;

  // Drivers
  addDriver: (driver: Omit<DeliveryDriver, 'id' | 'deliveriesCompleted'>) => void;
  toggleDriverAvailability: (driverId: string) => void;

  // Suppliers & Purchases
  saveSupplier: (supplier: Omit<Supplier, 'id' | 'totalPurchased'>, existingId?: string) => void;
  createPurchaseOrder: (input: { supplierId: string; items: PurchaseOrderItem[]; notes?: string }) => PurchaseOrder;

  // Finance: Expenses & Salaries
  addExpense: (expense: Omit<Expense, 'id' | 'createdBy'>) => void;
  deleteExpense: (id: string) => void;
  createSalarySlip: (input: {
    employeeId: string;
    month: string;
    baseSalary: number;
    commission: number;
    bonus: number;
    deduction: number;
    paymentMethod: PaymentMethod;
  }) => SalarySlip;

  // Admin: Staff, Users, Settings
  saveEmployee: (emp: Omit<Employee, 'id'>, existingId?: string) => void;
  saveUser: (usr: Omit<AppUser, 'id'>, existingId?: string) => void;
  deleteUser: (id: string) => void;
  updateSettings: (settings: RestaurantSettings) => void;
  resetDemoData: () => void;
}

const ErpContext = createContext<ErpContextValue | undefined>(undefined);

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const generateDeliveryCode = () => String(Math.floor(1000 + Math.random() * 9000));

const fallbackDeliveryCode = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) % 9000;
  }
  return String(1000 + Math.abs(h));
};

/**
 * Génère de façon déterministe et 100 % hors-ligne le code de dérogation Caisse (4 chiffres),
 * toujours différent du code PIN client. Visible uniquement sur le tableau de bord Restaurant.
 */
const deriveManagerOverrideCode = (seed: string, clientPin?: string) => {
  const salted = `SAHEL-OVERRIDE::${seed}::MAROUA`;
  let h = 17;
  for (let i = 0; i < salted.length; i++) {
    h = (h * 37 + salted.charCodeAt(i) * 13) % 9000;
  }
  let code = String(1000 + Math.abs(h));
  if (clientPin && code === clientPin) {
    code = String(1000 + ((Number(code) - 1000 + 137) % 9000));
  }
  return code;
};

const ensureDeliveryCodes = (orders: ErpOrder[]): ErpOrder[] =>
  orders.map((o) => {
    if (o.channel !== 'LIVRAISON') return o;
    const deliveryCode = o.deliveryCode || fallbackDeliveryCode(o.orderNumber || o.id);
    const managerOverrideCode =
      o.managerOverrideCode || deriveManagerOverrideCode(o.orderNumber || o.id, deliveryCode);
    if (deliveryCode === o.deliveryCode && managerOverrideCode === o.managerOverrideCode) return o;
    return { ...o, deliveryCode, managerOverrideCode };
  });

const isRestaurantSurface = (): boolean => {
  if (typeof window === 'undefined') return false;
  const p = window.location.pathname;
  return p === '/' || p === '/restaurant' || p.startsWith('/restaurant/');
};

/**
 * Synchronise automatiquement le stock affiché sur les produits reliés 1:1
 * à un article de Gestion de Stock (ex: bouteille d'eau Tangui, SABC, alloco).
 */
function syncLinkedProductsWithStock(products: Product[], stockItems: StockItem[]): Product[] {
  const map = new Map(stockItems.map((s) => [s.id, s]));
  return products.map((p) => {
    if (!p.useRecipe && p.linkedStockItemId) {
      const linked = map.get(p.linkedStockItemId);
      if (linked) {
        return { ...p, stock: linked.quantity, minStock: linked.minQuantity };
      }
    }
    return p;
  });
}

/**
 * Applique les déductions automatiques de stock (recette OU lien direct 1:1)
 * et produit systématiquement les lignes de mouvement de type VENTE.
 */
function applySaleStockDeductions(
  products: Product[],
  stockItems: StockItem[],
  orderedItems: ErpOrderItem[],
  orderNumber: string,
  actor: string,
  nowIso: string
): { nextProducts: Product[]; nextStockItems: StockItem[]; newMovements: StockMovement[] } {
  const deductions = new Map<string, { qty: number; reasons: string[] }>();

  for (const ordered of orderedItems) {
    const prod = products.find((p) => p.id === ordered.productId);
    if (!prod) continue;

    if (prod.useRecipe && prod.recipe.length > 0) {
      // Mode recette : déduit chaque ingrédient
      for (const ing of prod.recipe) {
        const cur = deductions.get(ing.stockItemId) || { qty: 0, reasons: [] };
        cur.qty += ing.quantity * ordered.quantity;
        cur.reasons.push(`Recette ${prod.name} (×${ordered.quantity})`);
        deductions.set(ing.stockItemId, cur);
      }
    } else if (prod.linkedStockItemId) {
      // Mode stock direct 1:1 (ex: bouteille d'eau Tangui, soda, portion)
      const cur = deductions.get(prod.linkedStockItemId) || { qty: 0, reasons: [] };
      cur.qty += ordered.quantity;
      cur.reasons.push(`Vente directe ${prod.name} (×${ordered.quantity})`);
      deductions.set(prod.linkedStockItemId, cur);
    }
  }

  const newMovements: StockMovement[] = [];
  const nextStockItems = stockItems.map((si) => {
    const ded = deductions.get(si.id);
    if (!ded || ded.qty <= 0) return si;
    const rounded = Math.round(ded.qty * 100) / 100;
    newMovements.push({
      id: uid('mov'),
      stockItemId: si.id,
      stockItemName: si.name,
      type: 'VENTE',
      quantity: -rounded,
      unit: si.unit,
      reason: `${ded.reasons.join(', ')} — ${orderNumber}`,
      actor,
      createdAt: nowIso,
    });
    return {
      ...si,
      quantity: Math.max(0, Math.round((si.quantity - rounded) * 100) / 100),
      updatedAt: nowIso,
    };
  });

  // Décrémenter aussi product.stock pour les plats sans lien direct, puis resynchroniser les liés
  const decrementedProducts = products.map((p) => {
    const ordered = orderedItems.find((i) => i.productId === p.id);
    if (!ordered) return p;
    return { ...p, stock: Math.max(0, p.stock - ordered.quantity) };
  });

  const nextProducts = syncLinkedProductsWithStock(decrementedProducts, nextStockItems);

  return { nextProducts, nextStockItems, newMovements };
}

export const ErpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ErpState>(() => {
    const saved = StorageService.get<ErpState | null>(STORE_KEY, null);
    if (saved && saved.settings && Array.isArray(saved.orders)) {
      return {
        ...getInitialState(),
        ...saved,
        orders: ensureDeliveryCodes(saved.orders),
        settings: { ...INITIAL_SETTINGS, ...saved.settings },
        waiterCalls: Array.isArray(saved.waiterCalls) ? saved.waiterCalls : [],
      };
    }
    const init = getInitialState();
    return { ...init, orders: ensureDeliveryCodes(init.orders) };
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return StorageService.get<boolean>('erp_auth_v1', true);
  });
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return StorageService.get<string>('erp_user_id_v1', state.users[0]?.id || 'usr-admin');
  });
  const [soundEnabled, setSoundEnabled] = useState(true);

  const tabIdRef = useRef<string>(uid('tab'));
  const skipBroadcastRef = useRef<boolean>(false);
  const prevOrdersCountRef = useRef<number>(state.orders.length);
  const prevWaiterCountRef = useRef<number>(state.waiterCalls.filter((w) => !w.resolved).length);

  // Récupération de secours depuis IndexedDB si localStorage était vide/nettoyé hors-ligne
  useEffect(() => {
    const hasLocal = StorageService.get<ErpState | null>(STORE_KEY, null);
    if (hasLocal) return;
    OfflineDb.loadErpSnapshot<ErpState>(STORE_KEY).then((snap) => {
      if (snap && snap.settings && Array.isArray(snap.orders)) {
        skipBroadcastRef.current = true;
        setState({
          ...getInitialState(),
          ...snap,
          orders: ensureDeliveryCodes(snap.orders),
          settings: { ...INITIAL_SETTINGS, ...snap.settings },
          waiterCalls: Array.isArray(snap.waiterCalls) ? snap.waiterCalls : [],
        });
      }
    });
  }, []);

  // Persistence (localStorage + miroir IndexedDB haute capacité) + BroadcastChannel realtime sync
  useEffect(() => {
    StorageService.set(STORE_KEY, state);
    OfflineDb.saveErpSnapshot(STORE_KEY, state).catch(() => {});
    if (skipBroadcastRef.current) {
      skipBroadcastRef.current = false;
      return;
    }
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
        ch.postMessage({ sender: tabIdRef.current, state });
        ch.close();
      } catch {
        // ignore
      }
    }
  }, [state]);

  useEffect(() => {
    const handleRemoteState = (incoming: ErpState) => {
      const incomingActiveCalls = (incoming.waiterCalls || []).filter((w) => !w.resolved).length;
      if (isRestaurantSurface()) {
        if (incoming.orders.length > prevOrdersCountRef.current) {
          soundNotifier.playKitchenNewOrderAlarm(5);
        } else if (incomingActiveCalls > prevWaiterCountRef.current) {
          soundNotifier.playSoftConfirmChime();
        }
      }
      prevOrdersCountRef.current = incoming.orders.length;
      prevWaiterCountRef.current = incomingActiveCalls;
      skipBroadcastRef.current = true;
      setState({
        ...getInitialState(),
        ...incoming,
        orders: ensureDeliveryCodes(incoming.orders),
        settings: { ...INITIAL_SETTINGS, ...incoming.settings },
        waiterCalls: Array.isArray(incoming.waiterCalls) ? incoming.waiterCalls : [],
      });
    };

    let ch: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
        ch.onmessage = (ev) => {
          if (ev.data?.sender && ev.data.sender !== tabIdRef.current && ev.data.state) {
            handleRemoteState(ev.data.state as ErpState);
          }
        };
      } catch {
        // ignore
      }
    }

    const onStorage = (ev: StorageEvent) => {
      if (ev.key === `dineo_${STORE_KEY}` && ev.newValue) {
        try {
          handleRemoteState(JSON.parse(ev.newValue) as ErpState);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);
      ch?.close();
    };
  }, []);

  useEffect(() => {
    StorageService.set('erp_auth_v1', isAuthenticated);
  }, [isAuthenticated]);

  useEffect(() => {
    StorageService.set('erp_user_id_v1', currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    const root = document.documentElement;
    if (state.darkMode) {
      root.classList.add('dark-theme');
    } else {
      root.classList.remove('dark-theme');
    }
    applyBrandTheme(state.settings.accentPalette, state.darkMode);
  }, [state.darkMode, state.settings.accentPalette]);

  const currentUser = useMemo(() => {
    return state.users.find((u) => u.id === currentUserId) || state.users[0] || INITIAL_USERS[0];
  }, [state.users, currentUserId]);

  const appendAudit = useCallback(
    (
      prev: ErpState,
      module: string,
      action: string,
      details: string,
      actorOverride?: { name: string; role: string }
    ): AuditLogEntry[] => {
      const entry: AuditLogEntry = {
        id: uid('aud'),
        timestamp: new Date().toISOString(),
        actorName: actorOverride?.name || currentUser.fullName,
        actorRole: actorOverride?.role || currentUser.roleLabel,
        module,
        action,
        details,
      };
      return [entry, ...prev.auditLogs].slice(0, 250);
    },
    [currentUser]
  );

  // Live bridge: listen to QR orders placed in the Client space & deduct stock automatically
  useEffect(() => {
    const unsub = realtimeService.subscribe('rest-001', (event: OrderEvent) => {
      if (event.type === 'ORDER_CREATED') {
        const incoming = event.order;
        const nowIso = new Date().toISOString();
        setState((prev) => {
          if (prev.orders.some((o) => o.id === incoming.id || o.orderNumber === incoming.orderNumber)) {
            return prev;
          }
          const matchedTable = prev.tables.find(
            (t) =>
              t.number === incoming.context.tableNumber ||
              t.number === `T-0${incoming.context.tableNumber}` ||
              t.number === `T-${incoming.context.tableNumber}`
          );
          const erpItems: ErpOrderItem[] = incoming.items.map((it) => ({
            id: it.id,
            productId: it.menuItemId,
            name: it.name,
            unitPrice: it.unitPrice,
            quantity: it.quantity,
            totalPrice: it.totalPrice,
            notes: it.specialInstructions,
          }));
          const erpOrder: ErpOrder = {
            id: incoming.id,
            orderNumber: incoming.orderNumber,
            source: incoming.source === 'QR_TABLE' ? 'QR_TABLE' : 'EN_LIGNE',
            channel: incoming.context.type === 'TABLE' ? 'SUR_PLACE' : 'EMPORTER',
            kitchenStatus: 'NOUVELLE',
            items: erpItems,
            subtotal: incoming.subtotal,
            discountType: 'NONE',
            discountValue: 0,
            discountAmount: 0,
            deliveryFee: 0,
            total: incoming.total,
            customerName: incoming.customer.name || 'Client QR',
            customerPhone: incoming.customer.phone,
            tableId: matchedTable?.id,
            tableNumber: matchedTable?.number || incoming.context.tableNumber,
            notes: incoming.customer.notes,
            paymentStatus: 'IMPAYE',
            paymentMethod: 'ESPECES',
            amountPaid: 0,
            payments: [],
            createdAt: incoming.createdAt,
            updatedAt: incoming.updatedAt,
            createdBy:
              incoming.source === 'QR_TABLE'
                ? `Client QR (${incoming.context.tableNumber || 'Table'})`
                : 'Commande Web',
          };

          const { nextProducts, nextStockItems, newMovements } = applySaleStockDeductions(
            prev.products,
            prev.stockItems,
            erpItems,
            erpOrder.orderNumber,
            erpOrder.createdBy,
            nowIso
          );

          const updatedTables = matchedTable
            ? prev.tables.map((t) =>
              t.id === matchedTable.id ? { ...t, status: 'OCCUPEE' as TableStatus, currentOrderId: erpOrder.id } : t
            )
            : prev.tables;

          soundNotifier.playNewOrderChime();

          return {
            ...prev,
            orders: [erpOrder, ...prev.orders],
            products: nextProducts,
            stockItems: nextStockItems,
            stockMovements: [...newMovements, ...prev.stockMovements],
            tables: updatedTables,
            auditLogs: appendAudit(
              prev,
              'Cuisine (KDS)',
              'Commande QR reçue en direct',
              `${erpOrder.orderNumber} — ${erpOrder.customerName} (${erpOrder.total.toLocaleString('fr-FR')} FCFA) · ${newMovements.length} sortie(s) stock`,
              { name: erpOrder.createdBy, role: 'QR Table' }
            ),
          };
        });
      }
    });
    return () => unsub();
  }, [appendAudit]);

  const switchUser = useCallback((userId: string) => {
    setCurrentUserId(userId);
    setIsAuthenticated(true);
  }, []);

  const login = useCallback(
    (username: string, password?: string): { ok: boolean; error?: string } => {
      const normalized = username.toLowerCase().trim();
      const matched = state.users.find(
        (u) => u.isActive && (u.username.toLowerCase() === normalized || u.fullName.toLowerCase() === normalized)
      );
      if (!matched) {
        return { ok: false, error: 'Identifiant introuvable ou compte inactif.' };
      }
      if (password && matched.password !== '••••••••' && matched.password !== password) {
        return { ok: false, error: 'Mot de passe incorrect.' };
      }
      setCurrentUserId(matched.id);
      setIsAuthenticated(true);
      setState((prev) => ({
        ...prev,
        auditLogs: appendAudit(
          prev,
          'Sécurité',
          'Connexion session',
          `@${matched.username} (${matched.roleLabel})`,
          { name: matched.fullName, role: matched.roleLabel }
        ),
      }));
      return { ok: true };
    },
    [state.users, appendAudit]
  );

  const quickLogin = useCallback(
    (userId: string) => {
      const matched = state.users.find((u) => u.id === userId);
      if (!matched) return;
      setCurrentUserId(matched.id);
      setIsAuthenticated(true);
      setState((prev) => ({
        ...prev,
        auditLogs: appendAudit(
          prev,
          'Sécurité',
          'Connexion session',
          `@${matched.username} (${matched.roleLabel})`,
          { name: matched.fullName, role: matched.roleLabel }
        ),
      }));
    },
    [state.users, appendAudit]
  );

  const logout = useCallback(() => {
    setState((prev) => ({
      ...prev,
      auditLogs: appendAudit(prev, 'Sécurité', 'Déconnexion', `Fermeture de session @${currentUser.username}`),
    }));
    setIsAuthenticated(false);
  }, [appendAudit, currentUser]);

  const createClientOrder = useCallback(
    (input: CreateClientOrderInput): ErpOrder => {
      const nowIso = new Date().toISOString();
      let createdOrder!: ErpOrder;

      setState((prev) => {
        const nextSeq = prev.lastOrderSeq + 1;
        const orderNumber = `CMD-${String(nextSeq).padStart(5, '0')}`;
        const subtotal = input.items.reduce((sum, i) => sum + i.totalPrice, 0);
        const deliveryFee = input.channel === 'LIVRAISON' ? Math.max(0, input.deliveryFee) : 0;
        const total = subtotal + deliveryFee;

        const cleanPhone = input.customerPhone.replace(/\s+/g, '');
        const matchedCustomer = prev.customers.find(
          (c) => c.phone.replace(/\s+/g, '').endsWith(cleanPhone.slice(-8)) && cleanPhone.length >= 8
        );

        const matchedTable =
          input.channel === 'SUR_PLACE' && input.tableNumber
            ? prev.tables.find(
              (t) =>
                t.number.toLowerCase() === input.tableNumber!.toLowerCase() ||
                t.number.toLowerCase() === `t-0${input.tableNumber!.toLowerCase()}` ||
                t.number.toLowerCase() === `t-${input.tableNumber!.toLowerCase()}`
            )
            : undefined;

        const actorLabel =
          input.source === 'QR_TABLE'
            ? `Client QR (${matchedTable?.number || input.tableNumber || 'Table'})`
            : 'Client Mobile';

        const newDeliveryCode = input.channel === 'LIVRAISON' ? generateDeliveryCode() : undefined;
        const order: ErpOrder = {
          id: uid('ord'),
          orderNumber,
          source: input.source,
          channel: input.channel,
          kitchenStatus: 'NOUVELLE',
          items: input.items,
          subtotal,
          discountType: 'NONE',
          discountValue: 0,
          discountAmount: 0,
          deliveryFee,
          total,
          customerId: matchedCustomer?.id,
          customerName: input.customerName.trim() || matchedCustomer?.name || 'Client Mobile',
          customerPhone: input.customerPhone.trim(),
          tableId: matchedTable?.id,
          tableNumber: matchedTable?.number || input.tableNumber,
          deliveryNeighborhood: input.channel === 'LIVRAISON' ? input.deliveryNeighborhood : undefined,
          deliveryAddress: input.channel === 'LIVRAISON' ? input.deliveryAddress : undefined,
          deliveryStatus: input.channel === 'LIVRAISON' ? 'EN_ATTENTE' : undefined,
          deliveryCode: newDeliveryCode,
          managerOverrideCode: newDeliveryCode
            ? deriveManagerOverrideCode(orderNumber, newDeliveryCode)
            : undefined,
          notes: input.notes?.trim() || undefined,
          paymentStatus: 'IMPAYE',
          paymentMethod: input.paymentMethod,
          amountPaid: 0,
          payments: [],
          createdAt: nowIso,
          updatedAt: nowIso,
          createdBy: actorLabel,
        };

        createdOrder = order;

        // Déduction automatique du stock (boissons unitaires + recettes)
        const { nextProducts, nextStockItems, newMovements } = applySaleStockDeductions(
          prev.products,
          prev.stockItems,
          input.items,
          orderNumber,
          actorLabel,
          nowIso
        );

        // Mettre la table en OCCUPÉE
        const nextTables = matchedTable
          ? prev.tables.map((t) =>
            t.id === matchedTable.id ? { ...t, status: 'OCCUPEE' as TableStatus, currentOrderId: order.id } : t
          )
          : prev.tables;

        // Créditer ou enregistrer le client pour la fidélité
        const earnedPoints =
          prev.loyaltyConfig.amountPerStep > 0
            ? Math.floor(total / prev.loyaltyConfig.amountPerStep) * prev.loyaltyConfig.pointsPerStep
            : 0;

        let nextCustomers = prev.customers;
        if (matchedCustomer) {
          nextCustomers = prev.customers.map((c) =>
            c.id === matchedCustomer.id
              ? {
                ...c,
                points: c.points + earnedPoints,
                ordersCount: c.ordersCount + 1,
                totalSpent: c.totalSpent + total,
                neighborhood: input.deliveryNeighborhood || c.neighborhood,
                address: input.deliveryAddress || c.address,
              }
              : c
          );
        } else if (input.customerName.trim() && input.customerPhone.trim().length >= 8) {
          const newCus: Customer = {
            id: uid('cus'),
            name: input.customerName.trim(),
            phone: input.customerPhone.trim(),
            neighborhood: input.deliveryNeighborhood || 'Domayo',
            address: input.deliveryAddress,
            points: earnedPoints,
            ordersCount: 1,
            totalSpent: total,
            createdAt: nowIso,
          };
          order.customerId = newCus.id;
          nextCustomers = [newCus, ...prev.customers];
        }

        // Confirmation sonore discrète côté Client (l'alerte cuisine 5 s sonne sur l'onglet Restaurant/KDS)
        soundNotifier.playSoftConfirmChime();

        emitOfflineOperation({
          type: 'CLIENT_ORDER',
          entityId: order.id,
          label: `Commande ${orderNumber} · ${total.toLocaleString('fr-FR')} FCFA`,
          summary: `${order.customerName} (${order.channel})`,
          payloadSizeKb: 3,
        });

        return {
          ...prev,
          lastOrderSeq: nextSeq,
          orders: [order, ...prev.orders],
          products: nextProducts,
          stockItems: nextStockItems,
          stockMovements: [...newMovements, ...prev.stockMovements],
          tables: nextTables,
          customers: nextCustomers,
          auditLogs: appendAudit(
            prev,
            input.source === 'QR_TABLE' ? 'QR Table' : 'Commande Mobile',
            `Nouvelle commande ${orderNumber}`,
            `${order.customerName} · ${total.toLocaleString('fr-FR')} FCFA (${order.channel}) · ${newMovements.length} sortie(s) stock`,
            { name: actorLabel, role: 'Client' }
          ),
        };
      });

      return createdOrder;
    },
    [appendAudit]
  );

  const callWaiter = useCallback(
    (tableNumber: string, reason: string, customerName?: string) => {
      const nowIso = new Date().toISOString();
      const alert: WaiterCallAlert = {
        id: uid('call'),
        tableNumber,
        reason,
        customerName,
        createdAt: nowIso,
        resolved: false,
      };
      soundNotifier.playNewOrderChime();
      setState((prev) => ({
        ...prev,
        waiterCalls: [alert, ...prev.waiterCalls].slice(0, 30),
        auditLogs: appendAudit(
          prev,
          'Salle & Tables',
          `Appel serveur (${tableNumber})`,
          `${reason}${customerName ? ` — ${customerName}` : ''}`,
          { name: customerName || `Table ${tableNumber}`, role: 'QR Table' }
        ),
      }));
    },
    [appendAudit]
  );

  const resolveWaiterCall = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      waiterCalls: prev.waiterCalls.map((w) => (w.id === id ? { ...w, resolved: true } : w)),
    }));
  }, []);

  const hasPermission = useCallback(
    (module: NavModuleId) => {
      return currentUser.permissions.includes(module);
    },
    [currentUser]
  );

  const toggleDarkMode = useCallback(() => {
    setState((prev) => ({ ...prev, darkMode: !prev.darkMode }));
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      soundNotifier.setSoundEnabled(next);
      return next;
    });
  }, []);

  const createPosOrder = useCallback(
    (input: CreatePosOrderInput): ErpOrder => {
      const nowIso = new Date().toISOString();
      let createdOrder!: ErpOrder;

      setState((prev) => {
        const nextSeq = prev.lastOrderSeq + 1;
        const orderNumber = `CMD-${String(nextSeq).padStart(5, '0')}`;
        const subtotal = input.items.reduce((sum, i) => sum + i.totalPrice, 0);
        const discountAmount =
          input.discountType === 'PERCENT'
            ? Math.round((subtotal * Math.min(100, Math.max(0, input.discountValue))) / 100)
            : input.discountType === 'AMOUNT'
              ? Math.min(subtotal, Math.max(0, input.discountValue))
              : 0;
        const deliveryFee = input.channel === 'LIVRAISON' ? Math.max(0, input.deliveryFee) : 0;
        const total = Math.max(0, subtotal - discountAmount + deliveryFee);

        const amountPaid =
          input.paymentMode === 'FULL'
            ? total
            : input.paymentMode === 'PARTIAL'
              ? Math.min(total, Math.max(0, input.amountPaidNow))
              : 0;

        const paymentStatus = amountPaid >= total && total > 0 ? 'PAYE' : amountPaid > 0 ? 'PARTIEL' : 'IMPAYE';

        const selectedTable = input.tableId ? prev.tables.find((t) => t.id === input.tableId) : undefined;

        const posDeliveryCode = input.channel === 'LIVRAISON' ? generateDeliveryCode() : undefined;
        const order: ErpOrder = {
          id: uid('ord'),
          orderNumber,
          source: 'POS',
          channel: input.channel,
          kitchenStatus: 'NOUVELLE',
          items: input.items,
          subtotal,
          discountType: input.discountType,
          discountValue: input.discountValue,
          discountAmount,
          deliveryFee,
          total,
          customerId: input.customerId,
          customerName: input.customerName || 'Client de passage',
          customerPhone: input.customerPhone,
          tableId: selectedTable?.id,
          tableNumber: selectedTable?.number,
          deliveryNeighborhood: input.deliveryNeighborhood,
          deliveryAddress: input.deliveryAddress,
          deliveryStatus: input.channel === 'LIVRAISON' ? 'EN_ATTENTE' : undefined,
          deliveryCode: posDeliveryCode,
          managerOverrideCode: posDeliveryCode
            ? deriveManagerOverrideCode(orderNumber, posDeliveryCode)
            : undefined,
          notes: input.notes,
          paymentStatus,
          paymentMethod: input.paymentMethod,
          amountPaid,
          payments:
            amountPaid > 0
              ? [
                {
                  id: uid('pay'),
                  amount: amountPaid,
                  method: input.paymentMethod,
                  date: nowIso,
                  note: paymentStatus === 'PARTIEL' ? 'Acompte POS' : 'Règlement complet POS',
                  recordedBy: currentUser.fullName,
                },
              ]
              : [],
          createdAt: nowIso,
          updatedAt: nowIso,
          createdBy: currentUser.fullName,
        };

        createdOrder = order;

        // 1) Déductions stock automatiques (recettes + ventes unitaires directes ex: bouteille d'eau)
        const { nextProducts, nextStockItems, newMovements } = applySaleStockDeductions(
          prev.products,
          prev.stockItems,
          input.items,
          orderNumber,
          currentUser.fullName,
          nowIso
        );

        // 2) Update table status if dine-in
        const nextTables = selectedTable
          ? prev.tables.map((t) =>
            t.id === selectedTable.id ? { ...t, status: 'OCCUPEE' as TableStatus, currentOrderId: order.id } : t
          )
          : prev.tables;

        // 3) Accrue loyalty points if customer attached
        const earnedPoints =
          prev.loyaltyConfig.amountPerStep > 0
            ? Math.floor(total / prev.loyaltyConfig.amountPerStep) * prev.loyaltyConfig.pointsPerStep
            : 0;
        const nextCustomers = input.customerId
          ? prev.customers.map((c) =>
            c.id === input.customerId
              ? {
                ...c,
                points: c.points + earnedPoints,
                ordersCount: c.ordersCount + 1,
                totalSpent: c.totalSpent + total,
              }
              : c
          )
          : prev.customers;

        // Déclencher l'alerte cuisine 5 secondes dès validation d'une nouvelle commande POS
        soundNotifier.playKitchenNewOrderAlarm(5);

        emitOfflineOperation({
          type: 'POS_ORDER',
          entityId: order.id,
          label: `Vente POS ${orderNumber} · ${total.toLocaleString('fr-FR')} FCFA`,
          summary: `${order.customerName} (${paymentStatus})`,
          payloadSizeKb: 3,
        });

        return {
          ...prev,
          lastOrderSeq: nextSeq,
          orders: [order, ...prev.orders],
          products: nextProducts,
          stockItems: nextStockItems,
          stockMovements: [...newMovements, ...prev.stockMovements],
          tables: nextTables,
          customers: nextCustomers,
          auditLogs: appendAudit(
            prev,
            'Caisse (POS)',
            `Vente ${orderNumber} (${paymentStatus})`,
            `${order.customerName} · ${total.toLocaleString('fr-FR')} FCFA · ${newMovements.length} sortie(s) stock`
          ),
        };
      });

      return createdOrder;
    },
    [appendAudit, currentUser]
  );

  const updateKitchenStatus = useCallback(
    (orderId: string, status: KitchenStatus) => {
      const nowIso = new Date().toISOString();
      setState((prev) => {
        const target = prev.orders.find((o) => o.id === orderId);
        if (!target) return prev;

        const nextOrders = prev.orders.map((o) =>
          o.id === orderId ? { ...o, kitchenStatus: status, updatedAt: nowIso } : o
        );

        const shouldFreeTable =
          target.tableId && (status === 'ANNULEE' || (status === 'SERVIE' && target.paymentStatus === 'PAYE'));
        const nextTables = shouldFreeTable
          ? prev.tables.map((t) =>
            t.id === target.tableId ? { ...t, status: 'LIBRE' as TableStatus, currentOrderId: undefined } : t
          )
          : prev.tables;

        return {
          ...prev,
          orders: nextOrders,
          tables: nextTables,
          auditLogs: appendAudit(
            prev,
            'Cuisine (KDS)',
            `Statut cuisine → ${status}`,
            `${target.orderNumber} (${target.customerName})`
          ),
        };
      });
    },
    [appendAudit]
  );

  const recordOrderPayment = useCallback(
    (orderId: string, amount: number, method: PaymentMethod, note?: string) => {
      const nowIso = new Date().toISOString();
      setState((prev) => {
        const target = prev.orders.find((o) => o.id === orderId);
        if (!target || amount <= 0) return prev;

        const newPaid = Math.min(target.total, target.amountPaid + amount);
        const newStatus = newPaid >= target.total ? 'PAYE' : 'PARTIEL';
        const record = {
          id: uid('pay'),
          amount,
          method,
          date: nowIso,
          note,
          recordedBy: currentUser.fullName,
        };

        const nextOrders = prev.orders.map((o) =>
          o.id === orderId
            ? {
              ...o,
              amountPaid: newPaid,
              paymentStatus: newStatus as ErpOrder['paymentStatus'],
              paymentMethod: method,
              payments: [...o.payments, record],
              updatedAt: nowIso,
            }
            : o
        );

        const shouldFreeTable = target.tableId && newStatus === 'PAYE' && target.kitchenStatus === 'SERVIE';
        const nextTables = shouldFreeTable
          ? prev.tables.map((t) =>
            t.id === target.tableId ? { ...t, status: 'LIBRE' as TableStatus, currentOrderId: undefined } : t
          )
          : prev.tables;

        return {
          ...prev,
          orders: nextOrders,
          tables: nextTables,
          auditLogs: appendAudit(
            prev,
            'Facturation',
            `Encaissement ${amount.toLocaleString('fr-FR')} FCFA`,
            `${target.orderNumber} via ${method} — Statut: ${newStatus}`
          ),
        };
      });
    },
    [appendAudit, currentUser]
  );

  const assignDriver = useCallback(
    (orderId: string, driverId: string | null) => {
      const nowIso = new Date().toISOString();
      setState((prev) => {
        const target = prev.orders.find((o) => o.id === orderId);
        if (!target) return prev;
        const driver = driverId ? prev.drivers.find((d) => d.id === driverId) : undefined;

        const nextOrders = prev.orders.map((o) =>
          o.id === orderId
            ? {
              ...o,
              driverId: driver?.id,
              driverName: driver?.name,
              deliveryStatus: (driver ? 'ASSIGNEE' : 'EN_ATTENTE') as DeliveryStatus,
              updatedAt: nowIso,
            }
            : o
        );

        return {
          ...prev,
          orders: nextOrders,
          auditLogs: appendAudit(
            prev,
            'Livraisons',
            driver ? 'Livreur assigné' : 'Livreur désassigné',
            driver ? `${target.orderNumber} → ${driver.name}` : `${target.orderNumber} remis en attente`
          ),
        };
      });
    },
    [appendAudit]
  );

  const updateDeliveryStatus = useCallback(
    (orderId: string, status: DeliveryStatus) => {
      const nowIso = new Date().toISOString();
      setState((prev) => {
        const target = prev.orders.find((o) => o.id === orderId);
        if (!target) return prev;

        // Garde-fou métier strict : impossible de partir en livraison ou de livrer tant que la cuisine n'a pas validé "PRETE"
        const isKitchenReady = target.kitchenStatus === 'PRETE' || target.kitchenStatus === 'SERVIE';
        if ((status === 'EN_ROUTE' || status === 'LIVREE') && !isKitchenReady) {
          return prev;
        }

        const nextOrders = prev.orders.map((o) =>
          o.id === orderId
            ? {
              ...o,
              deliveryStatus: status,
              kitchenStatus: status === 'LIVREE' ? 'SERVIE' : o.kitchenStatus,
              updatedAt: nowIso,
            }
            : o
        );

        const nextDrivers =
          target.driverId
            ? prev.drivers.map((d) => {
              if (d.id !== target.driverId) return d;
              if (status === 'EN_ROUTE') {
                return { ...d, isAvailable: false };
              }
              if (status === 'LIVREE' && target.deliveryStatus !== 'LIVREE') {
                return { ...d, deliveriesCompleted: d.deliveriesCompleted + 1, isAvailable: true };
              }
              return d;
            })
            : prev.drivers;

        return {
          ...prev,
          orders: nextOrders,
          drivers: nextDrivers,
          auditLogs: appendAudit(
            prev,
            'Livraisons',
            `Livraison → ${status}`,
            `${target.orderNumber} (${target.deliveryNeighborhood || 'Maroua'})`
          ),
        };
      });
    },
    [appendAudit]
  );

  const completeDeliveryWithProof = useCallback(
    (input: CompleteDeliveryProofInput): { ok: boolean; error?: string } => {
      const target = state.orders.find((o) => o.id === input.orderId);
      if (!target) {
        return { ok: false, error: 'Commande introuvable.' };
      }
      const isKitchenReady = target.kitchenStatus === 'PRETE' || target.kitchenStatus === 'SERVIE';
      if (!isKitchenReady) {
        return { ok: false, error: 'La cuisine n’a pas encore validé cette commande comme Prête.' };
      }
      if (!input.photoDataUrl) {
        return { ok: false, error: 'Une photo de preuve prise sur place est obligatoire.' };
      }

      const expectedCode = (target.deliveryCode || '').trim();
      const expectedOverride =
        (target.managerOverrideCode || '').trim() ||
        deriveManagerOverrideCode(target.orderNumber || target.id, expectedCode);
      const enteredPin = (input.pinEntered || '').trim();
      const isOverrideFlow = Boolean(input.bypassPinReason?.trim());

      let verifiedByPin = false;
      let verificationMode: 'CLIENT_PIN' | 'MANAGER_OVERRIDE' = 'CLIENT_PIN';

      if (!isOverrideFlow) {
        if (expectedCode && enteredPin !== expectedCode) {
          return {
            ok: false,
            error:
              'Code de remise client incorrect. Vérifiez les 4 chiffres affichés sur le téléphone du client.',
          };
        }
        verifiedByPin = Boolean(expectedCode);
        verificationMode = 'CLIENT_PIN';
      } else {
        // Procédure anti-fraude stricte (impossible au livreur d'inventer seul un "client sans téléphone") :
        // exige le code de dérogation dicté par la Caisse + Nom complet + Signature manuscrite du réceptionnaire
        const enteredOverride = (input.managerOverrideEntered || '').trim();
        if (enteredOverride !== expectedOverride) {
          return {
            ok: false,
            error:
              'Code de dérogation Caisse incorrect. Appelez la caisse du restaurant pour obtenir le code à 4 chiffres.',
          };
        }
        if (!input.recipientName || input.recipientName.trim().length < 2) {
          return {
            ok: false,
            error: 'Indiquez le nom complet de la personne qui réceptionne le colis.',
          };
        }
        if (!input.recipientSignature) {
          return {
            ok: false,
            error: 'Faites signer le réceptionnaire sur l’écran avant de clôturer en mode dérogation.',
          };
        }
        verifiedByPin = false;
        verificationMode = 'MANAGER_OVERRIDE';
      }

      const nowIso = new Date().toISOString();
      const mediaSizeKb = Math.max(
        15,
        Math.round((input.photoDataUrl.length + (input.recipientSignature?.length || 0)) / 1024)
      );
      OfflineDb.saveMedia(`driver-proof:${target.id}`, input.photoDataUrl).catch(() => {});
      if (input.recipientSignature) {
        OfflineDb.saveMedia(`driver-sig:${target.id}`, input.recipientSignature).catch(() => {});
      }

      setState((prev) => {
        const cur = prev.orders.find((o) => o.id === input.orderId);
        if (!cur) return prev;

        let nextAmountPaid = cur.amountPaid;
        let nextPaymentStatus = cur.paymentStatus;
        let nextPaymentMethod = cur.paymentMethod;
        const nextPayments = [...cur.payments];

        if (input.paymentCollected && input.paymentCollected.amount > 0) {
          nextAmountPaid = Math.min(cur.total, cur.amountPaid + input.paymentCollected.amount);
          nextPaymentStatus = nextAmountPaid >= cur.total ? 'PAYE' : 'PARTIEL';
          nextPaymentMethod = input.paymentCollected.method;
          nextPayments.push({
            id: uid('pay'),
            amount: input.paymentCollected.amount,
            method: input.paymentCollected.method,
            date: nowIso,
            note: `Encaissé à la livraison (${input.driverName})${input.note ? ` · ${input.note}` : ''}`,
            recordedBy: input.driverName,
          });
        }

        const nextOrders = prev.orders.map((o) =>
          o.id === input.orderId
            ? {
              ...o,
              deliveryStatus: 'LIVREE' as DeliveryStatus,
              kitchenStatus: 'SERVIE' as KitchenStatus,
              amountPaid: nextAmountPaid,
              paymentStatus: nextPaymentStatus,
              paymentMethod: nextPaymentMethod,
              payments: nextPayments,
              deliveryProof: {
                photoDataUrl: input.photoDataUrl,
                capturedAt: nowIso,
                capturedBy: input.driverName,
                verifiedByPin,
                verificationMode,
                photoQualityScore: input.photoQualityScore,
                geo: input.geo,
                recipientName: input.recipientName?.trim() || undefined,
                recipientSignature: input.recipientSignature || undefined,
                overrideReason: input.bypassPinReason?.trim() || undefined,
                note: input.note?.trim() || undefined,
              },
              updatedAt: nowIso,
            }
            : o
        );

        const nextDrivers = cur.driverId
          ? prev.drivers.map((d) =>
            d.id === cur.driverId
              ? {
                ...d,
                deliveriesCompleted: cur.deliveryStatus !== 'LIVREE' ? d.deliveriesCompleted + 1 : d.deliveriesCompleted,
                isAvailable: true,
              }
              : d
          )
          : prev.drivers;

        const geoSummary = input.geo
          ? ` · GPS ${input.geo.lat.toFixed(4)},${input.geo.lng.toFixed(4)} (±${input.geo.accuracy}m)`
          : ' · GPS non capté';

        return {
          ...prev,
          orders: nextOrders,
          drivers: nextDrivers,
          auditLogs: appendAudit(
            prev,
            'Livraisons',
            verifiedByPin
              ? 'Livraison clôturée (Photo GPS + PIN Client)'
              : 'Livraison clôturée (Dérogation Caisse + Signature)',
            `${cur.orderNumber} par ${input.driverName}${input.paymentCollected?.amount
              ? ` · Encaissé ${input.paymentCollected.amount.toLocaleString('fr-FR')} FCFA (${input.paymentCollected.method})`
              : ''
            }${isOverrideFlow ? ` · Reçu par ${input.recipientName?.trim()} (${input.bypassPinReason})` : ''}${geoSummary}`,
            { name: input.driverName, role: 'Livreur' }
          ),
        };
      });

      emitOfflineOperation({
        type: 'DELIVERY_PROOF',
        entityId: target.id,
        label: `Preuve livraison ${target.orderNumber}`,
        summary: `${input.driverName} · ${verifiedByPin ? 'Photo GPS + PIN' : 'Dérogation Caisse + Signature'}`,
        payloadSizeKb: mediaSizeKb,
      });

      return { ok: true };
    },
    [state.orders, appendAudit]
  );

  const confirmClientDeliveryReceipt = useCallback(
    (input: ConfirmClientReceiptInput) => {
      const nowIso = new Date().toISOString();
      if (input.photoDataUrl) {
        OfflineDb.saveMedia(`client-proof:${input.orderId}`, input.photoDataUrl).catch(() => {});
      }
      setState((prev) => {
        const cur = prev.orders.find((o) => o.id === input.orderId);
        if (!cur) return prev;

        emitOfflineOperation({
          type: 'CLIENT_CONFIRMATION',
          entityId: cur.id,
          label: `Avis client ${cur.orderNumber}`,
          summary:
            input.status === 'RECEIVED_OK'
              ? `Bien reçu${input.rating ? ` (${input.rating}/5 ★)` : ''}`
              : 'Incident signalé',
          payloadSizeKb: input.photoDataUrl ? Math.max(10, Math.round(input.photoDataUrl.length / 1024)) : 1,
        });

        const nextOrders = prev.orders.map((o) =>
          o.id === input.orderId
            ? {
              ...o,
              clientConfirmation: {
                confirmedAt: nowIso,
                status: input.status,
                rating: input.rating,
                photoDataUrl: input.photoDataUrl,
                comment: input.comment?.trim() || undefined,
              },
              updatedAt: nowIso,
            }
            : o
        );

        return {
          ...prev,
          orders: nextOrders,
          auditLogs: appendAudit(
            prev,
            'Livraisons',
            input.status === 'RECEIVED_OK' ? 'Réception confirmée par le client' : 'Incident signalé par le client',
            `${cur.orderNumber} (${cur.customerName})${input.rating ? ` · Note ${input.rating}/5` : ''}${input.comment ? ` — ${input.comment}` : ''
            }`,
            { name: cur.customerName, role: 'Client' }
          ),
        };
      });
    },
    [appendAudit]
  );

  const flagDeliveryProof = useCallback(
    (orderId: string, reason: string) => {
      const cleanReason = reason.trim() || 'Photo non conforme au colis du restaurant';
      const nowIso = new Date().toISOString();
      setState((prev) => {
        const cur = prev.orders.find((o) => o.id === orderId);
        if (!cur || !cur.deliveryProof) return prev;
        return {
          ...prev,
          orders: prev.orders.map((o) =>
            o.id === orderId && o.deliveryProof
              ? {
                ...o,
                deliveryProof: {
                  ...o.deliveryProof,
                  flaggedReason: cleanReason,
                  flaggedAt: nowIso,
                  flaggedBy: currentUser.fullName,
                },
                updatedAt: nowIso,
              }
              : o
          ),
          auditLogs: appendAudit(
            prev,
            'Sécurité Livraison',
            `Preuve photo contestée (${cur.orderNumber})`,
            `Livreur : ${cur.driverName || cur.deliveryProof.capturedBy} · Motif : ${cleanReason}`
          ),
        };
      });
    },
    [appendAudit, currentUser.fullName]
  );

  const addCategory = useCallback(
    (name: string, description?: string) => {
      setState((prev) => ({
        ...prev,
        categories: [...prev.categories, { id: uid('cat'), name, description }],
        auditLogs: appendAudit(prev, 'Menu & Produits', 'Catégorie ajoutée', name),
      }));
    },
    [appendAudit]
  );

  const saveProduct = useCallback(
    (product: Omit<Product, 'id'>, existingId?: string, autoCreateStock = true) => {
      const nowIso = new Date().toISOString();
      setState((prev) => {
        const isEdit = Boolean(existingId);
        let nextStockItems = prev.stockItems;
        let nextMovements = prev.stockMovements;
        let linkedId = product.linkedStockItemId;

        // Si le produit n'est pas en mode recette et n'est pas encore lié à un article de stock,
        // on crée automatiquement sa fiche dans Gestion de Stock pour garantir les sorties à chaque vente !
        if (!product.useRecipe && !linkedId && autoCreateStock) {
          const catObj = prev.categories.find((c) => c.id === product.categoryId);
          const newStkId = uid('stk');
          const unit = catObj?.name.toLowerCase().includes('boisson') ? 'bouteille' : 'pièce';
          const newStockItem: StockItem = {
            id: newStkId,
            name: product.name,
            category: catObj?.name || 'Produits finis',
            unit,
            quantity: product.stock,
            minQuantity: product.minStock,
            unitCost: Math.round(product.price * 0.55),
            updatedAt: nowIso,
          };
          linkedId = newStkId;
          nextStockItems = [newStockItem, ...prev.stockItems];
          if (product.stock > 0) {
            nextMovements = [
              {
                id: uid('mov'),
                stockItemId: newStkId,
                stockItemName: product.name,
                type: 'ENTREE',
                quantity: product.stock,
                unit,
                reason: 'Stock initial à la création du produit',
                actor: currentUser.fullName,
                createdAt: nowIso,
              },
              ...prev.stockMovements,
            ];
          }
        } else if (!product.useRecipe && linkedId) {
          // Mettre à jour le stock lié si modifié depuis la fiche produit
          nextStockItems = prev.stockItems.map((s) =>
            s.id === linkedId ? { ...s, quantity: product.stock, minQuantity: product.minStock, updatedAt: nowIso } : s
          );
        }

        const prepared: Omit<Product, 'id'> = {
          ...product,
          linkedStockItemId: product.useRecipe ? undefined : linkedId,
        };

        const rawProducts = isEdit
          ? prev.products.map((p) => (p.id === existingId ? { ...prepared, id: existingId! } : p))
          : [{ ...prepared, id: uid('prod') }, ...prev.products];

        return {
          ...prev,
          products: syncLinkedProductsWithStock(rawProducts, nextStockItems),
          stockItems: nextStockItems,
          stockMovements: nextMovements,
          auditLogs: appendAudit(
            prev,
            'Menu & Produits',
            isEdit ? 'Produit modifié' : 'Produit ajouté',
            `${product.name} (${product.price.toLocaleString('fr-FR')} FCFA) — ${product.useRecipe ? `Recette (${product.recipe.length} ing.)` : 'Suivi stock direct'
            }`
          ),
        };
      });
    },
    [appendAudit, currentUser]
  );

  const deleteProduct = useCallback(
    (id: string) => {
      setState((prev) => {
        const found = prev.products.find((p) => p.id === id);
        return {
          ...prev,
          products: prev.products.filter((p) => p.id !== id),
          auditLogs: appendAudit(prev, 'Menu & Produits', 'Produit supprimé', found?.name || id),
        };
      });
    },
    [appendAudit]
  );

  const addStockItem = useCallback(
    (item: Omit<StockItem, 'id' | 'updatedAt'>) => {
      const nowIso = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        stockItems: [{ ...item, id: uid('stk'), updatedAt: nowIso }, ...prev.stockItems],
        auditLogs: appendAudit(prev, 'Stock', 'Ingrédient ajouté', `${item.name} (${item.quantity} ${item.unit})`),
      }));
    },
    [appendAudit]
  );

  const recordStockMovement = useCallback(
    (stockItemId: string, type: 'ENTREE' | 'SORTIE' | 'AJUSTEMENT', quantity: number, reason: string) => {
      const nowIso = new Date().toISOString();
      setState((prev) => {
        const target = prev.stockItems.find((s) => s.id === stockItemId);
        if (!target) return prev;
        const delta = type === 'SORTIE' ? -Math.abs(quantity) : type === 'ENTREE' ? Math.abs(quantity) : quantity;
        const nextQty = Math.max(0, Math.round((target.quantity + delta) * 100) / 100);
        const movement: StockMovement = {
          id: uid('mov'),
          stockItemId,
          stockItemName: target.name,
          type,
          quantity: delta,
          unit: target.unit,
          reason: reason || (type === 'ENTREE' ? 'Entrée manuelle' : 'Sortie manuelle'),
          actor: currentUser.fullName,
          createdAt: nowIso,
        };
        const nextStockItems = prev.stockItems.map((s) =>
          s.id === stockItemId ? { ...s, quantity: nextQty, updatedAt: nowIso } : s
        );
        return {
          ...prev,
          stockItems: nextStockItems,
          products: syncLinkedProductsWithStock(prev.products, nextStockItems),
          stockMovements: [movement, ...prev.stockMovements],
          auditLogs: appendAudit(
            prev,
            'Stock',
            `Mouvement stock (${type})`,
            `${target.name}: ${delta > 0 ? '+' : ''}${delta} ${target.unit} — ${movement.reason}`
          ),
        };
      });
    },
    [appendAudit, currentUser]
  );

  const saveTable = useCallback(
    (table: Omit<DiningTable, 'id'>, existingId?: string) => {
      setState((prev) => {
        const nextTables = existingId
          ? prev.tables.map((t) => (t.id === existingId ? { ...table, id: existingId } : t))
          : [...prev.tables, { ...table, id: uid('tbl') }];
        return {
          ...prev,
          tables: nextTables,
          auditLogs: appendAudit(prev, 'Tables', existingId ? 'Table modifiée' : 'Table créée', `${table.number} (${table.seats} places)`),
        };
      });
    },
    [appendAudit]
  );

  const updateTableStatus = useCallback(
    (tableId: string, status: TableStatus) => {
      setState((prev) => {
        const tbl = prev.tables.find((t) => t.id === tableId);
        return {
          ...prev,
          tables: prev.tables.map((t) => (t.id === tableId ? { ...t, status } : t)),
          auditLogs: appendAudit(prev, 'Tables', `Table → ${status}`, tbl?.number || tableId),
        };
      });
    },
    [appendAudit]
  );

  const deleteTable = useCallback(
    (tableId: string) => {
      setState((prev) => {
        const tbl = prev.tables.find((t) => t.id === tableId);
        return {
          ...prev,
          tables: prev.tables.filter((t) => t.id !== tableId),
          auditLogs: appendAudit(prev, 'Tables', 'Table supprimée', tbl?.number || tableId),
        };
      });
    },
    [appendAudit]
  );

  const addReservation = useCallback(
    (res: Omit<Reservation, 'id' | 'createdAt' | 'status'>) => {
      const nowIso = new Date().toISOString();
      setState((prev) => {
        const newRes: Reservation = {
          ...res,
          id: uid('res'),
          status: 'CONFIRMEE',
          createdAt: nowIso,
        };
        const nextTables = prev.tables.map((t) =>
          t.id === res.tableId && t.status === 'LIBRE' ? { ...t, status: 'RESERVEE' as TableStatus } : t
        );
        return {
          ...prev,
          reservations: [newRes, ...prev.reservations],
          tables: nextTables,
          auditLogs: appendAudit(
            prev,
            'Réservations',
            'Nouvelle réservation',
            `${res.customerName} — ${res.tableNumber} (${res.guests} pers. le ${res.date} à ${res.time})`
          ),
        };
      });
    },
    [appendAudit]
  );

  const updateReservationStatus = useCallback(
    (resId: string, status: ReservationStatus) => {
      setState((prev) => {
        const found = prev.reservations.find((r) => r.id === resId);
        if (!found) return prev;
        const nextTables =
          status === 'TERMINEE' || status === 'ANNULEE'
            ? prev.tables.map((t) => (t.id === found.tableId && t.status === 'RESERVEE' ? { ...t, status: 'LIBRE' as TableStatus } : t))
            : status === 'EN_COURS'
              ? prev.tables.map((t) => (t.id === found.tableId ? { ...t, status: 'OCCUPEE' as TableStatus } : t))
              : prev.tables;

        return {
          ...prev,
          reservations: prev.reservations.map((r) => (r.id === resId ? { ...r, status } : r)),
          tables: nextTables,
          auditLogs: appendAudit(prev, 'Réservations', `Réservation → ${status}`, `${found.customerName} (${found.tableNumber})`),
        };
      });
    },
    [appendAudit]
  );

  const saveCustomer = useCallback(
    (customer: Omit<Customer, 'id' | 'points' | 'ordersCount' | 'totalSpent' | 'createdAt'>, existingId?: string): Customer => {
      const nowIso = new Date().toISOString();
      let result: Customer = {
        ...customer,
        id: existingId || uid('cus'),
        points: 0,
        ordersCount: 0,
        totalSpent: 0,
        createdAt: nowIso,
      };
      setState((prev) => {
        if (existingId) {
          const existing = prev.customers.find((c) => c.id === existingId);
          if (existing) {
            result = { ...existing, ...customer };
          }
          return {
            ...prev,
            customers: prev.customers.map((c) => (c.id === existingId ? result : c)),
            auditLogs: appendAudit(prev, 'Clients', 'Client modifié', customer.name),
          };
        }
        return {
          ...prev,
          customers: [result, ...prev.customers],
          auditLogs: appendAudit(prev, 'Clients', 'Nouveau client', `${customer.name} (${customer.neighborhood})`),
        };
      });
      return result;
    },
    [appendAudit]
  );

  const updateLoyaltyConfig = useCallback(
    (config: LoyaltyConfig) => {
      setState((prev) => ({
        ...prev,
        loyaltyConfig: config,
        auditLogs: appendAudit(
          prev,
          'Fidélité',
          'Programme fidélité mis à jour',
          `${config.pointsPerStep} pt / ${config.amountPerStep} FCFA`
        ),
      }));
    },
    [appendAudit]
  );

  const adjustCustomerPoints = useCallback(
    (customerId: string, delta: number, reason: string) => {
      setState((prev) => {
        const c = prev.customers.find((x) => x.id === customerId);
        if (!c) return prev;
        return {
          ...prev,
          customers: prev.customers.map((x) => (x.id === customerId ? { ...x, points: Math.max(0, x.points + delta) } : x)),
          auditLogs: appendAudit(prev, 'Fidélité', 'Ajustement points', `${c.name}: ${delta > 0 ? '+' : ''}${delta} pts (${reason})`),
        };
      });
    },
    [appendAudit]
  );

  const addDriver = useCallback(
    (driver: Omit<DeliveryDriver, 'id' | 'deliveriesCompleted'>) => {
      setState((prev) => ({
        ...prev,
        drivers: [{ ...driver, id: uid('drv'), deliveriesCompleted: 0 }, ...prev.drivers],
        auditLogs: appendAudit(prev, 'Livraisons', 'Livreur ajouté', `${driver.name} (${driver.phone})`),
      }));
    },
    [appendAudit]
  );

  const toggleDriverAvailability = useCallback((driverId: string) => {
    setState((prev) => ({
      ...prev,
      drivers: prev.drivers.map((d) => (d.id === driverId ? { ...d, isAvailable: !d.isAvailable } : d)),
    }));
  }, []);

  const saveSupplier = useCallback(
    (supplier: Omit<Supplier, 'id' | 'totalPurchased'>, existingId?: string) => {
      setState((prev) => {
        if (existingId) {
          return {
            ...prev,
            suppliers: prev.suppliers.map((s) => (s.id === existingId ? { ...s, ...supplier } : s)),
            auditLogs: appendAudit(prev, 'Fournisseurs', 'Fournisseur modifié', supplier.name),
          };
        }
        return {
          ...prev,
          suppliers: [{ ...supplier, id: uid('sup'), totalPurchased: 0 }, ...prev.suppliers],
          auditLogs: appendAudit(prev, 'Fournisseurs', 'Fournisseur ajouté', `${supplier.name} (${supplier.neighborhood})`),
        };
      });
    },
    [appendAudit]
  );

  const createPurchaseOrder = useCallback(
    (input: { supplierId: string; items: PurchaseOrderItem[]; notes?: string }): PurchaseOrder => {
      const nowIso = new Date().toISOString();
      const today = nowIso.slice(0, 10);
      let created!: PurchaseOrder;

      setState((prev) => {
        const nextSeq = prev.lastPurchaseSeq + 1;
        const reference = `ACH-2026-${String(nextSeq).padStart(3, '0')}`;
        const supplier = prev.suppliers.find((s) => s.id === input.supplierId);
        const total = input.items.reduce((sum, i) => sum + i.total, 0);

        created = {
          id: uid('po'),
          reference,
          supplierId: input.supplierId,
          supplierName: supplier?.name || 'Fournisseur',
          items: input.items,
          total,
          status: 'RECU',
          date: today,
          notes: input.notes,
          createdBy: currentUser.fullName,
        };

        const newMovements: StockMovement[] = [];
        const nextStockItems = prev.stockItems.map((si) => {
          const line = input.items.find((i) => i.stockItemId === si.id);
          if (!line) return si;
          newMovements.push({
            id: uid('mov'),
            stockItemId: si.id,
            stockItemName: si.name,
            type: 'ACHAT',
            quantity: line.quantity,
            unit: si.unit,
            reason: `Approvisionnement ${supplier?.name || ''} (${reference})`,
            actor: currentUser.fullName,
            createdAt: nowIso,
          });
          return {
            ...si,
            quantity: Math.round((si.quantity + line.quantity) * 100) / 100,
            unitCost: line.unitPrice,
            updatedAt: nowIso,
          };
        });

        const nextSuppliers = prev.suppliers.map((s) =>
          s.id === input.supplierId ? { ...s, totalPurchased: s.totalPurchased + total } : s
        );

        return {
          ...prev,
          lastPurchaseSeq: nextSeq,
          purchases: [created, ...prev.purchases],
          stockItems: nextStockItems,
          products: syncLinkedProductsWithStock(prev.products, nextStockItems),
          stockMovements: [...newMovements, ...prev.stockMovements],
          suppliers: nextSuppliers,
          auditLogs: appendAudit(
            prev,
            'Achats',
            `Bon de commande ${reference}`,
            `${created.supplierName} · ${total.toLocaleString('fr-FR')} FCFA (ajouté au stock)`
          ),
        };
      });

      return created;
    },
    [appendAudit, currentUser]
  );

  const addExpense = useCallback(
    (expense: Omit<Expense, 'id' | 'createdBy'>) => {
      setState((prev) => ({
        ...prev,
        expenses: [{ ...expense, id: uid('exp'), createdBy: currentUser.fullName }, ...prev.expenses],
        auditLogs: appendAudit(
          prev,
          'Dépenses',
          'Dépense enregistrée',
          `${expense.label} — ${expense.amount.toLocaleString('fr-FR')} FCFA`
        ),
      }));
    },
    [appendAudit, currentUser]
  );

  const deleteExpense = useCallback(
    (id: string) => {
      setState((prev) => {
        const exp = prev.expenses.find((e) => e.id === id);
        return {
          ...prev,
          expenses: prev.expenses.filter((e) => e.id !== id),
          auditLogs: appendAudit(prev, 'Dépenses', 'Dépense supprimée', exp?.label || id),
        };
      });
    },
    [appendAudit]
  );

  const createSalarySlip = useCallback(
    (input: {
      employeeId: string;
      month: string;
      baseSalary: number;
      commission: number;
      bonus: number;
      deduction: number;
      paymentMethod: PaymentMethod;
    }): SalarySlip => {
      const today = new Date().toISOString().slice(0, 10);
      let created!: SalarySlip;

      setState((prev) => {
        const nextSeq = prev.lastSalarySeq + 1;
        const emp = prev.employees.find((e) => e.id === input.employeeId);
        const netSalary = Math.max(0, input.baseSalary + input.commission + input.bonus - input.deduction);
        created = {
          id: uid('sal'),
          reference: `PAIE-2026-${nextSeq}`,
          employeeId: input.employeeId,
          employeeName: emp?.fullName || 'Employé',
          employeeRole: emp?.role || 'Personnel',
          month: input.month,
          baseSalary: input.baseSalary,
          commission: input.commission,
          bonus: input.bonus,
          deduction: input.deduction,
          netSalary,
          paymentMethod: input.paymentMethod,
          paidAt: today,
          createdBy: currentUser.fullName,
        };
        return {
          ...prev,
          lastSalarySeq: nextSeq,
          salaries: [created, ...prev.salaries],
          auditLogs: appendAudit(
            prev,
            'Salaires',
            `Salaire payé (${created.reference})`,
            `${created.employeeName} — ${input.month} : Net ${netSalary.toLocaleString('fr-FR')} FCFA`
          ),
        };
      });

      return created;
    },
    [appendAudit, currentUser]
  );

  const saveEmployee = useCallback(
    (emp: Omit<Employee, 'id'>, existingId?: string) => {
      setState((prev) => {
        const next = existingId
          ? prev.employees.map((e) => (e.id === existingId ? { ...emp, id: existingId } : e))
          : [{ ...emp, id: uid('emp') }, ...prev.employees];
        return {
          ...prev,
          employees: next,
          auditLogs: appendAudit(prev, 'Personnel', existingId ? 'Employé modifié' : 'Employé ajouté', `${emp.fullName} (${emp.role})`),
        };
      });
    },
    [appendAudit]
  );

  const saveUser = useCallback(
    (usr: Omit<AppUser, 'id'>, existingId?: string) => {
      setState((prev) => {
        const next = existingId
          ? prev.users.map((u) => (u.id === existingId ? { ...usr, id: existingId } : u))
          : [...prev.users, { ...usr, id: uid('usr') }];
        return {
          ...prev,
          users: next,
          auditLogs: appendAudit(
            prev,
            'Utilisateurs',
            existingId ? 'Permissions mises à jour' : 'Utilisateur créé',
            `${usr.fullName} (@${usr.username}) — ${usr.permissions.length} modules`
          ),
        };
      });
    },
    [appendAudit]
  );

  const deleteUser = useCallback(
    (id: string) => {
      setState((prev) => {
        if (prev.users.length <= 1) return prev;
        const u = prev.users.find((x) => x.id === id);
        return {
          ...prev,
          users: prev.users.filter((x) => x.id !== id),
          auditLogs: appendAudit(prev, 'Utilisateurs', 'Compte supprimé', u?.username || id),
        };
      });
    },
    [appendAudit]
  );

  const updateSettings = useCallback(
    (settings: RestaurantSettings) => {
      setState((prev) => ({
        ...prev,
        settings,
        auditLogs: appendAudit(prev, 'Paramètres', 'Paramètres enregistrés', `${settings.name} (${settings.city})`),
      }));
    },
    [appendAudit]
  );

  const resetDemoData = useCallback(() => {
    const fresh = getInitialState();
    StorageService.set(STORE_KEY, fresh);
    setState(fresh);
    setCurrentUserId(fresh.users[0].id);
  }, []);

  const value = useMemo<ErpContextValue>(
    () => ({
      state,
      isAuthenticated,
      currentUser,
      login,
      quickLogin,
      logout,
      switchUser,
      hasPermission,
      toggleDarkMode,
      soundEnabled,
      toggleSound,
      createPosOrder,
      createClientOrder,
      callWaiter,
      resolveWaiterCall,
      updateKitchenStatus,
      recordOrderPayment,
      assignDriver,
      updateDeliveryStatus,
      completeDeliveryWithProof,
      confirmClientDeliveryReceipt,
      flagDeliveryProof,
      addCategory,
      saveProduct,
      deleteProduct,
      addStockItem,
      recordStockMovement,
      saveTable,
      updateTableStatus,
      deleteTable,
      addReservation,
      updateReservationStatus,
      saveCustomer,
      updateLoyaltyConfig,
      adjustCustomerPoints,
      addDriver,
      toggleDriverAvailability,
      saveSupplier,
      createPurchaseOrder,
      addExpense,
      deleteExpense,
      createSalarySlip,
      saveEmployee,
      saveUser,
      deleteUser,
      updateSettings,
      resetDemoData,
    }),
    [
      state,
      isAuthenticated,
      currentUser,
      login,
      quickLogin,
      logout,
      switchUser,
      hasPermission,
      toggleDarkMode,
      soundEnabled,
      toggleSound,
      createPosOrder,
      createClientOrder,
      callWaiter,
      resolveWaiterCall,
      updateKitchenStatus,
      recordOrderPayment,
      assignDriver,
      updateDeliveryStatus,
      completeDeliveryWithProof,
      confirmClientDeliveryReceipt,
      flagDeliveryProof,
      addCategory,
      saveProduct,
      deleteProduct,
      addStockItem,
      recordStockMovement,
      saveTable,
      updateTableStatus,
      deleteTable,
      addReservation,
      updateReservationStatus,
      saveCustomer,
      updateLoyaltyConfig,
      adjustCustomerPoints,
      addDriver,
      toggleDriverAvailability,
      saveSupplier,
      createPurchaseOrder,
      addExpense,
      deleteExpense,
      createSalarySlip,
      saveEmployee,
      saveUser,
      deleteUser,
      updateSettings,
      resetDemoData,
    ]
  );

  return <ErpContext.Provider value={value}>{children}</ErpContext.Provider>;
};

export const useErp = (): ErpContextValue => {
  const ctx = useContext(ErpContext);
  if (!ctx) throw new Error('useErp doit être utilisé dans un ErpProvider');
  return ctx;
};
