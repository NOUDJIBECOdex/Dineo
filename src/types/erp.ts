export type NavModuleId =
  | 'dashboard'
  | 'pos'
  | 'kds'
  | 'billing'
  | 'history'
  | 'deliveries'
  | 'tables'
  | 'reservations'
  | 'loyalty'
  | 'customers'
  | 'products'
  | 'stock'
  | 'purchases'
  | 'suppliers'
  | 'reports'
  | 'expenses'
  | 'salaries'
  | 'partial_payments'
  | 'staff'
  | 'users'
  | 'audit'
  | 'settings';

export type OrderChannel = 'SUR_PLACE' | 'EMPORTER' | 'LIVRAISON';
export type KitchenStatus = 'NOUVELLE' | 'EN_PREPARATION' | 'PRETE' | 'SERVIE' | 'ANNULEE';
export type PaymentStatus = 'PAYE' | 'PARTIEL' | 'IMPAYE';
export type PaymentMethod = 'ESPECES' | 'ORANGE_MONEY' | 'MTN_MOMO';
export type DeliveryStatus = 'EN_ATTENTE' | 'ASSIGNEE' | 'EN_ROUTE' | 'LIVREE';
export type TableStatus = 'LIBRE' | 'OCCUPEE' | 'RESERVEE';
export type ReservationStatus = 'CONFIRMEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';

export type BrandPaletteId = 'terracotta' | 'forest' | 'indigo' | 'ochre' | 'burgundy' | 'charcoal';

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
}

export interface RecipeIngredient {
  stockItemId: string;
  quantity: number;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number; // FCFA
  imageUrl: string;
  stock: number;
  minStock: number;
  isAvailable: boolean;
  useRecipe: boolean;
  recipe: RecipeIngredient[];
  /** Lien direct 1:1 avec un article de Gestion de Stock (ex: bouteille d'eau, boisson) */
  linkedStockItemId?: string;
  preparationMinutes: number;
}

export interface StockItem {
  id: string;
  name: string;
  category: string;
  unit: string; // kg, L, pièce, sac, bouteille
  quantity: number;
  minQuantity: number;
  unitCost: number; // FCFA
  supplierId?: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  stockItemId: string;
  stockItemName: string;
  type: 'ENTREE' | 'SORTIE' | 'VENTE' | 'ACHAT' | 'AJUSTEMENT';
  quantity: number;
  unit: string;
  reason: string;
  actor: string;
  createdAt: string;
}

export interface DiningTable {
  id: string;
  number: string; // e.g. T-01
  name: string; // e.g. Table T-01
  zone: 'Salle Principale' | 'Terrasse Sahel' | 'Espace Famille' | 'Salon VIP';
  seats: number;
  status: TableStatus;
  currentOrderId?: string;
}

export interface Reservation {
  id: string;
  customerName: string;
  customerPhone: string;
  tableId: string;
  tableNumber: string;
  guests: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: ReservationStatus;
  notes?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  neighborhood: string; // Quartier à Maroua
  address?: string;
  points: number;
  ordersCount: number;
  totalSpent: number;
  createdAt: string;
}

export interface LoyaltyTier {
  id: string;
  name: string;
  minPoints: number;
  discountPercent: number;
  perk: string;
}

export interface LoyaltyConfig {
  pointsPerStep: number; // ex: 1 point
  amountPerStep: number; // ex: 1000 FCFA
  tiers: LoyaltyTier[];
}

export interface DeliveryDriver {
  id: string;
  name: string;
  phone: string;
  vehicleInfo: string; // ex: Moto Sanili — EN-4821-MA
  zone: string;
  isAvailable: boolean;
  deliveriesCompleted: number;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  note?: string;
  recordedBy: string;
}

export interface ErpOrderItem {
  id: string;
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  notes?: string;
}

export interface GeoSnapshot {
  lat: number;
  lng: number;
  accuracy: number; // précision en mètres
  capturedAt: string;
}

export interface DeliveryProof {
  photoDataUrl: string;
  capturedAt: string;
  capturedBy: string;
  verifiedByPin: boolean;
  /** Mode de vérification : PIN client standard ou Dérogation autorisée par la caisse + signature */
  verificationMode?: 'CLIENT_PIN' | 'MANAGER_OVERRIDE';
  /** Score qualité forensique calculé hors-ligne (0..100) */
  photoQualityScore?: number;
  /** Signalement manuel par le gérant si la photo ne correspond pas à un colis du restaurant */
  flaggedReason?: string;
  flaggedAt?: string;
  flaggedBy?: string;
  /** Coordonnées GPS capturées au moment de la photo */
  geo?: GeoSnapshot;
  /** Nom + signature manuscrite obligatoires en cas de dérogation sans téléphone client */
  recipientName?: string;
  recipientSignature?: string;
  overrideReason?: string;
  note?: string;
}

export interface ClientDeliveryConfirmation {
  confirmedAt: string;
  status: 'RECEIVED_OK' | 'ISSUE_REPORTED';
  rating?: number; // 1..5
  photoDataUrl?: string;
  comment?: string;
}

export interface ErpOrder {
  id: string;
  orderNumber: string; // CMD-00142
  source: 'POS' | 'QR_TABLE' | 'EN_LIGNE';
  channel: OrderChannel;
  kitchenStatus: KitchenStatus;
  items: ErpOrderItem[];
  subtotal: number;
  discountType: 'NONE' | 'PERCENT' | 'AMOUNT';
  discountValue: number;
  discountAmount: number;
  deliveryFee: number;
  total: number;

  // Customer & Table / Delivery
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  tableId?: string;
  tableNumber?: string;
  deliveryNeighborhood?: string;
  deliveryAddress?: string;
  driverId?: string;
  driverName?: string;
  deliveryStatus?: DeliveryStatus;
  /** Code PIN secret à 4 chiffres communiqué uniquement au client pour sécuriser la remise */
  deliveryCode?: string;
  /** Code de dérogation Caisse/Gérant (4 chiffres) visible UNIQUEMENT au restaurant — impossible à deviner par le livreur */
  managerOverrideCode?: string;
  /** Preuve photo horodatée + géolocalisée prise par le livreur à la remise */
  deliveryProof?: DeliveryProof;
  /** Confirmation (et photo/avis optionnels) envoyée par le client */
  clientConfirmation?: ClientDeliveryConfirmation;
  notes?: string;

  // Payment
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  payments: PaymentRecord[];

  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  category: string;
  neighborhood: string;
  notes?: string;
  totalPurchased: number;
}

export interface PurchaseOrderItem {
  stockItemId: string;
  stockItemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  reference: string; // ACH-2026-001
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  total: number;
  status: 'RECU' | 'EN_ATTENTE';
  date: string;
  notes?: string;
  createdBy: string;
}

export interface Expense {
  id: string;
  label: string;
  category: 'Approvisionnement' | 'Énergie & Eau (ENEO/CAMWATER)' | 'Gaz & Charbon' | 'Livraison & Transport' | 'Entretien & Loyer' | 'Divers';
  amount: number;
  paymentMethod: PaymentMethod;
  date: string;
  notes?: string;
  createdBy: string;
}

export interface Employee {
  id: string;
  fullName: string;
  role: 'Gérant' | 'Chef Cuisinier' | 'Cuisinier' | 'Caissier' | 'Serveur' | 'Livreur';
  phone: string;
  baseSalary: number;
  hireDate: string;
  status: 'ACTIF' | 'CONGE' | 'INACTIF';
}

export interface SalarySlip {
  id: string;
  reference: string; // PAIE-2026-001
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  month: string; // ex: "Novembre 2026"
  baseSalary: number;
  commission: number;
  bonus: number;
  deduction: number;
  netSalary: number;
  paymentMethod: PaymentMethod;
  paidAt: string;
  createdBy: string;
}

export interface AppUser {
  id: string;
  username: string;
  fullName: string;
  roleLabel: string;
  password: string;
  isActive: boolean;
  permissions: NavModuleId[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  module: string;
  action: string;
  details: string;
}

export interface WaiterCallAlert {
  id: string;
  tableNumber: string;
  reason: string;
  customerName?: string;
  createdAt: string;
  resolved: boolean;
}

export interface RestaurantSettings {
  name: string;
  tagline: string;
  logoUrl?: string;
  accentPalette: BrandPaletteId;
  publicBaseUrl?: string;
  address: string;
  city: string;
  region: string;
  phone: string;
  email: string;
  currency: string;
  receiptFooter: string;
  defaultDeliveryFee: number;
  orangeMoneyMerchant: string;
  mtnMomoMerchant: string;
  taxNumber: string;
  openingHours: string;
  isOpen: boolean;
}

export const ALL_NAV_MODULES: NavModuleId[] = [
  'dashboard',
  'pos',
  'kds',
  'billing',
  'history',
  'deliveries',
  'tables',
  'reservations',
  'loyalty',
  'customers',
  'products',
  'stock',
  'purchases',
  'suppliers',
  'reports',
  'expenses',
  'salaries',
  'partial_payments',
  'staff',
  'users',
  'audit',
  'settings',
];

export const MAROUA_NEIGHBORHOODS: Array<{ name: string; fee: number }> = [
  { name: 'Domayo', fee: 500 },
  { name: 'Maroua Centre', fee: 500 },
  { name: 'Pitoaré', fee: 700 },
  { name: 'Kakataré', fee: 700 },
  { name: 'Dougoï', fee: 800 },
  { name: 'Djarengol', fee: 800 },
  { name: 'Hardé', fee: 1000 },
  { name: 'Zokok', fee: 1000 },
  { name: 'Palar', fee: 1000 },
  { name: 'Ouro-Tchédé', fee: 1200 },
  { name: 'Kongola', fee: 1500 },
  { name: 'Comice', fee: 1000 },
];
