import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BellRing,
  Clock,
  Info,
  MapPin,
  Minus,
  Moon,
  Plus,
  QrCode,
  Receipt,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sun,
  Trash2,
  Truck,
  Utensils,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { BillRequestSheet } from '../../components/client/mobile/BillRequestSheet';
import type { MobileCartLine } from '../../components/client/mobile/CartCheckoutSheet';
import { CartCheckoutSheet } from '../../components/client/mobile/CartCheckoutSheet';
import { ClientInfoTab, ClientLoyaltyTab } from '../../components/client/mobile/ClientLoyaltyInfoTabs';
import { ClientTrackingTab } from '../../components/client/mobile/ClientTrackingTab';
import { ProductDetailSheet } from '../../components/client/mobile/ProductDetailSheet';
import { RestaurantLogo } from '../../components/restaurant/ui/Primitives';
import { StorageService } from '../../services/storage.service';
import { useErp } from '../../store/erp.context';
import type { ErpOrder, OrderChannel, Product } from '../../types/erp';
import { MAROUA_NEIGHBORHOODS } from '../../types/erp';
import { formatFCFA } from '../../utils/currency';

type ClientTab = 'MENU' | 'TRACKING' | 'LOYALTY' | 'INFO';

interface ClientMobileAppProps {
  initialTableNumber?: string | null;
  initialChannel?: OrderChannel;
  onBackToDashboard?: () => void;
}

const CLIENT_PROFILE_KEY = 'client_mobile_profile_v1';
const CLIENT_ORDERS_KEY = 'client_mobile_orders_v1';

export const ClientMobileApp: React.FC<ClientMobileAppProps> = ({
  initialTableNumber = null,
  initialChannel,
  onBackToDashboard,
}) => {
  const { state, toggleDarkMode } = useErp();

  const [activeTab, setActiveTab] = useState<ClientTab>('MENU');
  const [channel, setChannel] = useState<OrderChannel>(() => {
    if (initialTableNumber) return 'SUR_PLACE';
    return initialChannel || 'LIVRAISON';
  });
  // Si le client n'a pas scanné un QR Table ni cliqué en haut, on lui demande explicitement son mode au checkout
  const [channelConfirmed, setChannelConfirmed] = useState<boolean>(() => Boolean(initialTableNumber));
  const [tableNumber, setTableNumber] = useState<string>(
    () => initialTableNumber || state.tables[0]?.number || 'T-01'
  );
  const [isQrLockedTable, setIsQrLockedTable] = useState<boolean>(Boolean(initialTableNumber));

  const savedProfile = StorageService.get<{
    name: string;
    phone: string;
    neighborhood: string;
    address: string;
  }>(CLIENT_PROFILE_KEY, {
    name: '',
    phone: '+237 6 ',
    neighborhood: 'Domayo',
    address: '',
  });

  const [customerName, setCustomerName] = useState(savedProfile.name);
  const [customerPhone, setCustomerPhone] = useState(savedProfile.phone);
  const [neighborhood, setNeighborhood] = useState(savedProfile.neighborhood);
  const [deliveryAddress, setDeliveryAddress] = useState(savedProfile.address);

  useEffect(() => {
    StorageService.set(CLIENT_PROFILE_KEY, {
      name: customerName,
      phone: customerPhone,
      neighborhood,
      address: deliveryAddress,
    });
  }, [customerName, customerPhone, neighborhood, deliveryAddress]);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [cart, setCart] = useState<MobileCartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [billSheetOpen, setBillSheetOpen] = useState(false);

  const [trackedOrderIds, setTrackedOrderIds] = useState<string[]>(() =>
    StorageService.get<string[]>(CLIENT_ORDERS_KEY, [])
  );
  const [activeTrackedOrderId, setActiveTrackedOrderId] = useState<string | null>(
    () => trackedOrderIds[0] || null
  );

  useEffect(() => {
    StorageService.set(CLIENT_ORDERS_KEY, trackedOrderIds);
  }, [trackedOrderIds]);

  const activeOrdersCount = useMemo(
    () =>
      trackedOrderIds.filter((id) => {
        const o = state.orders.find((x) => x.id === id);
        return o && o.kitchenStatus !== 'SERVIE' && o.kitchenStatus !== 'ANNULEE';
      }).length,
    [trackedOrderIds, state.orders]
  );

  const filteredProducts = useMemo(() => {
    return state.products.filter((p) => {
      if (activeCategory !== 'ALL' && p.categoryId !== activeCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [state.products, activeCategory, search]);

  const signatureProducts = useMemo(
    () => state.products.filter((p) => p.categoryId === 'cat-grillades' && p.isAvailable).slice(0, 4),
    [state.products]
  );

  const cartCount = useMemo(() => cart.reduce((s, l) => s + l.quantity, 0), [cart]);
  const cartSubtotal = useMemo(() => cart.reduce((s, l) => s + l.product.price * l.quantity, 0), [cart]);
  const currentFee = useMemo(() => {
    if (channel !== 'LIVRAISON') return 0;
    return MAROUA_NEIGHBORHOODS.find((n) => n.name === neighborhood)?.fee ?? state.settings.defaultDeliveryFee;
  }, [channel, neighborhood, state.settings.defaultDeliveryFee]);

  const addProductToCart = (product: Product, quantity = 1, optionLabel?: string, note?: string) => {
    if (product.stock <= 0 || !product.isAvailable) return;
    setCart((prev) => {
      const key = `${product.id}__${optionLabel || ''}__${note || ''}`;
      const existing = prev.find((l) => l.lineId === key);
      if (existing) {
        return prev.map((l) =>
          l.lineId === key ? { ...l, quantity: Math.min(product.stock, l.quantity + quantity) } : l
        );
      }
      return [...prev, { lineId: key, product, quantity, optionLabel, note }];
    });
  };

  const updateCartLineQty = (lineId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => (l.lineId === lineId ? { ...l, quantity: Math.min(l.product.stock, l.quantity + delta) } : l))
        .filter((l) => l.quantity > 0)
    );
  };

  const quickAdjustProduct = (product: Product, delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const matching = cart.find((l) => l.product.id === product.id);
    if (delta > 0) {
      if (matching) updateCartLineQty(matching.lineId, 1);
      else addProductToCart(product, 1);
    } else if (matching) {
      updateCartLineQty(matching.lineId, -1);
    }
  };

  const handleOrderCreated = (order: ErpOrder) => {
    setCartOpen(false);
    setTrackedOrderIds((prev) => [order.id, ...prev.filter((id) => id !== order.id)]);
    setActiveTrackedOrderId(order.id);
    setActiveTab('TRACKING');
    try {
      confetti({ particleCount: 55, spread: 60, origin: { y: 0.7 } });
    } catch {
      // ignore
    }
  };

  const getProductQtyInCart = (productId: string) =>
    cart.filter((l) => l.product.id === productId).reduce((s, l) => s + l.quantity, 0);

  return (
    <div
      className="min-h-[100dvh] flex flex-col"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--ink-primary)' }}
    >
      {/* Sticky Responsive Header (100% mobile-first on phones, full-width structured nav on desktop) */}
      <header
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
        className="sticky top-0 z-30 border-b"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-3 pb-2.5 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            {/* Brand */}
            <div className="flex items-center gap-2.5 min-w-0">
              <RestaurantLogo logoUrl={state.settings.logoUrl} name={state.settings.name} size="md" />
              <div className="min-w-0">
                <h1 className="text-[15px] sm:text-[16px] font-semibold tracking-[-0.02em] truncate leading-tight">
                  {state.settings.name}
                </h1>
                <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: state.settings.isOpen ? 'var(--ok-dot)' : 'var(--err-dot)' }}
                  />
                  <span>{state.settings.isOpen ? 'Ouvert' : 'Fermé'}</span>
                  <span>·</span>
                  <span className="truncate">{state.settings.city}</span>
                </div>
              </div>
            </div>

            {/* Desktop Inline Tab Navigation (hidden on mobile < md where bottom bar is used) */}
            <nav className="hidden md:flex items-center gap-1">
              {(
                [
                  { id: 'MENU', label: 'Menu', icon: UtensilsCrossed },
                  { id: 'TRACKING', label: 'Suivi', icon: Clock, badge: activeOrdersCount },
                  { id: 'LOYALTY', label: 'Fidélité', icon: Award },
                  { id: 'INFO', label: 'Infos', icon: Info },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                const badge = 'badge' in item ? item.badge : 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    style={{
                      backgroundColor: active ? 'var(--bg-subtle)' : 'transparent',
                      color: active ? 'var(--ink-primary)' : 'var(--ink-muted)',
                    }}
                    className="px-3 py-1.5 rounded-lg text-[13px] font-medium flex items-center gap-1.5 cursor-pointer hover:bg-[var(--bg-subtle)] transition-colors"
                  >
                    <Icon className="w-4 h-4" style={{ color: active ? 'var(--accent)' : undefined }} />
                    <span>{item.label}</span>
                    {badge > 0 && (
                      <span
                        style={{ backgroundColor: 'var(--accent)' }}
                        className="min-w-[17px] h-[17px] px-1 rounded-full text-[10px] font-semibold text-white flex items-center justify-center tabular-nums"
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              {channel === 'SUR_PLACE' && (
                <button
                  type="button"
                  onClick={() => setBillSheetOpen(true)}
                  style={{
                    backgroundColor: 'var(--accent-soft)',
                    borderColor: 'var(--accent-border)',
                    color: 'var(--accent)',
                  }}
                  className="h-8 px-2.5 sm:px-3 rounded-full border text-[11.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                  title="Demander l’addition ou appeler un serveur"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Addition / Serveur</span>
                </button>
              )}

              <button
                type="button"
                onClick={toggleDarkMode}
                style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink-secondary)' }}
                className="w-8 h-8 rounded-full border flex items-center justify-center cursor-pointer"
                aria-label="Changer de thème"
              >
                {state.darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {onBackToDashboard && (
                <button
                  type="button"
                  onClick={onBackToDashboard}
                  style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink-secondary)' }}
                  className="hidden sm:inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border text-[12px] font-medium cursor-pointer hover:bg-[var(--bg-subtle)]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Dashboard
                </button>
              )}
            </div>
          </div>

          {/* Context Switcher Bar (Table QR / Livraison Maroua / Emporter) */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={() => {
                  setChannel('SUR_PLACE');
                  setChannelConfirmed(true);
                }}
                style={{
                  backgroundColor: channelConfirmed && channel === 'SUR_PLACE' ? 'var(--ink-primary)' : 'var(--bg-subtle)',
                  color: channelConfirmed && channel === 'SUR_PLACE' ? 'var(--ink-inverse)' : 'var(--ink-secondary)',
                }}
                className="h-8 px-3 rounded-full text-[12px] font-medium inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Table {tableNumber}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setChannel('LIVRAISON');
                  setChannelConfirmed(true);
                }}
                style={{
                  backgroundColor: channelConfirmed && channel === 'LIVRAISON' ? 'var(--ink-primary)' : 'var(--bg-subtle)',
                  color: channelConfirmed && channel === 'LIVRAISON' ? 'var(--ink-inverse)' : 'var(--ink-secondary)',
                }}
                className="h-8 px-3 rounded-full text-[12px] font-medium inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Livraison · {neighborhood}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setChannel('EMPORTER');
                  setChannelConfirmed(true);
                }}
                style={{
                  backgroundColor: channelConfirmed && channel === 'EMPORTER' ? 'var(--ink-primary)' : 'var(--bg-subtle)',
                  color: channelConfirmed && channel === 'EMPORTER' ? 'var(--ink-inverse)' : 'var(--ink-secondary)',
                }}
                className="h-8 px-3 rounded-full text-[12px] font-medium inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>À emporter</span>
              </button>
            </div>

            {isQrLockedTable && channel === 'SUR_PLACE' && (
              <span
                className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border shrink-0"
                style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink-muted)' }}
              >
                <QrCode className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                Connecté par QR Code
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content — Full-width responsive container */}
      <main className="flex-1 max-w-6xl w-full mx-auto">
        {activeTab === 'MENU' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start px-4 sm:px-6 pt-4 pb-36 lg:pb-12">
            {/* Left/Main Menu Column */}
            <div className="lg:col-span-8 space-y-4">
              {/* Delivery Neighborhood Quick Strip */}
              {channel === 'LIVRAISON' && (
                <div
                  className="px-4 py-2.5 rounded-xl border flex items-center justify-between gap-2 text-[12.5px]"
                  style={{ borderColor: 'var(--accent-border)', backgroundColor: 'var(--accent-soft)' }}
                >
                  <div className="flex items-center gap-1.5 min-w-0" style={{ color: 'var(--accent)' }}>
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-medium truncate">Livraison vers</span>
                    <select
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      className="bg-transparent font-semibold underline cursor-pointer focus:outline-none"
                    >
                      {MAROUA_NEIGHBORHOODS.map((n) => (
                        <option key={n.name} value={n.name} style={{ color: '#18181B' }}>
                          {n.name} ({n.fee} F)
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="font-semibold tabular-nums shrink-0" style={{ color: 'var(--accent)' }}>
                    {formatFCFA(currentFee)}
                  </span>
                </div>
              )}

              {/* Search Bar */}
              <div className="relative">
                <Search
                  className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--ink-muted)' }}
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher soya, capitaine, foléré, burger..."
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-hairline)',
                    color: 'var(--ink-primary)',
                  }}
                  className="w-full h-10 pl-10 pr-9 rounded-xl border text-[13.5px] focus:outline-none focus:border-[var(--ink-primary)] placeholder:text-[var(--ink-muted)]"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                    style={{ color: 'var(--ink-muted)' }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setActiveCategory('ALL')}
                  style={{
                    backgroundColor: activeCategory === 'ALL' ? 'var(--accent)' : 'var(--bg-surface)',
                    color: activeCategory === 'ALL' ? '#FFFFFF' : 'var(--ink-secondary)',
                    borderColor: activeCategory === 'ALL' ? 'transparent' : 'var(--border-hairline)',
                  }}
                  className="h-8 px-3.5 rounded-full border text-[12.5px] font-medium shrink-0 cursor-pointer transition-colors"
                >
                  Tout
                </button>
                {state.categories.map((cat) => {
                  const active = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      style={{
                        backgroundColor: active ? 'var(--accent)' : 'var(--bg-surface)',
                        color: active ? '#FFFFFF' : 'var(--ink-secondary)',
                        borderColor: active ? 'transparent' : 'var(--border-hairline)',
                      }}
                      className="h-8 px-3.5 rounded-full border text-[12.5px] font-medium shrink-0 cursor-pointer transition-colors"
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>

              {/* Signature Carousel */}
              {activeCategory === 'ALL' && !search.trim() && signatureProducts.length > 0 && (
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[14.5px] font-semibold tracking-[-0.01em]">Spécialités de Maroua</h2>
                    <span className="text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                      Braisées minute
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {signatureProducts.slice(0, 3).map((prod) => {
                      const qty = getProductQtyInCart(prod.id);
                      const soldOut = prod.stock <= 0;
                      return (
                        <div
                          key={prod.id}
                          onClick={() => setSelectedProduct(prod)}
                          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
                          className="rounded-2xl border overflow-hidden cursor-pointer hover:border-[var(--border-strong)] active:scale-[0.985] transition-all"
                        >
                          <div className="aspect-[16/10] w-full relative" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                            <img src={prod.imageUrl} alt={prod.name} loading="lazy" className="w-full h-full object-cover" />
                            {qty > 0 && (
                              <span
                                style={{ backgroundColor: 'var(--accent)' }}
                                className="absolute top-2 right-2 min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-semibold text-white flex items-center justify-center tabular-nums"
                              >
                                {qty}
                              </span>
                            )}
                          </div>
                          <div className="p-3 space-y-1.5">
                            <div className="text-[13px] font-semibold line-clamp-1">{prod.name}</div>
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] font-semibold tabular-nums" style={{ color: 'var(--accent)' }}>
                                {formatFCFA(prod.price)}
                              </span>
                              <button
                                type="button"
                                disabled={soldOut}
                                onClick={(e) => quickAdjustProduct(prod, 1, e)}
                                style={{
                                  backgroundColor: soldOut ? 'var(--bg-subtle)' : 'var(--ink-primary)',
                                  color: soldOut ? 'var(--ink-muted)' : 'var(--ink-inverse)',
                                }}
                                className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                                aria-label="Ajouter"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Responsive Dish Grid (1 col mobile-first, 2 cols on tablet/desktop) */}
              <section className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-[14.5px] font-semibold tracking-[-0.01em]">
                    {search.trim()
                      ? `Résultats (${filteredProducts.length})`
                      : activeCategory === 'ALL'
                      ? 'Toute la carte'
                      : state.categories.find((c) => c.id === activeCategory)?.name || 'La carte'}
                  </h2>
                  <span className="text-[11.5px] tabular-nums" style={{ color: 'var(--ink-muted)' }}>
                    {filteredProducts.length} plat{filteredProducts.length > 1 ? 's' : ''}
                  </span>
                </div>

                {filteredProducts.length === 0 ? (
                  <div
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
                    className="rounded-2xl border p-8 text-center space-y-2"
                  >
                    <p className="text-[13.5px] font-medium">Aucun plat trouvé</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        setActiveCategory('ALL');
                      }}
                      className="text-[12.5px] font-medium underline cursor-pointer"
                      style={{ color: 'var(--accent)' }}
                    >
                      Afficher toute la carte
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredProducts.map((prod) => {
                      const qty = getProductQtyInCart(prod.id);
                      const soldOut = prod.stock <= 0 || !prod.isAvailable;

                      return (
                        <div
                          key={prod.id}
                          onClick={() => setSelectedProduct(prod)}
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: qty > 0 ? 'var(--accent-border)' : 'var(--border-hairline)',
                          }}
                          className={`rounded-2xl border p-3 flex items-center gap-3 transition-all cursor-pointer hover:border-[var(--border-strong)] active:scale-[0.99] ${
                            soldOut ? 'opacity-60' : ''
                          }`}
                        >
                          <div className="flex-1 min-w-0 space-y-1">
                            <h3 className="text-[14px] font-semibold leading-snug line-clamp-1">{prod.name}</h3>
                            <p className="text-[12px] line-clamp-2 leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
                              {prod.description}
                            </p>
                            <div className="pt-1 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[14px] font-semibold tabular-nums" style={{ color: 'var(--accent)' }}>
                                  {formatFCFA(prod.price)}
                                </span>
                                <span className="text-[11px] inline-flex items-center gap-0.5" style={{ color: 'var(--ink-muted)' }}>
                                  <Clock className="w-3 h-3" />
                                  {prod.preparationMinutes}m
                                </span>
                              </div>

                              {soldOut ? (
                                <span
                                  className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: 'var(--err-bg)', color: 'var(--err-text)' }}
                                >
                                  Épuisé
                                </span>
                              ) : qty > 0 ? (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center rounded-full border h-8 px-1"
                                  style={{ borderColor: 'var(--accent-border)', backgroundColor: 'var(--accent-soft)' }}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => quickAdjustProduct(prod, -1, e)}
                                    className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer"
                                    style={{ color: 'var(--accent)' }}
                                    aria-label="Retirer"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="w-6 text-center text-[12.5px] font-semibold tabular-nums" style={{ color: 'var(--accent)' }}>
                                    {qty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => quickAdjustProduct(prod, 1, e)}
                                    className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer"
                                    style={{ color: 'var(--accent)' }}
                                    aria-label="Ajouter"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => quickAdjustProduct(prod, 1, e)}
                                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-hairline)' }}
                                  className="h-8 px-3 rounded-full border text-[12px] font-semibold inline-flex items-center gap-1 cursor-pointer active:scale-95"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Ajouter
                                </button>
                              )}
                            </div>
                          </div>

                          <div
                            className="w-[84px] h-[84px] rounded-xl overflow-hidden shrink-0 border"
                            style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}
                          >
                            <img src={prod.imageUrl} alt={prod.name} loading="lazy" className="w-full h-full object-cover" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            {/* Right Sticky Live Cart Panel on Desktop (lg+) — Zero dead whitespace on computer! */}
            <aside className="hidden lg:block lg:col-span-4 sticky top-[116px]">
              <div
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
                className="rounded-2xl border overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.03)]"
              >
                <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-hairline)' }}>
                  <div className="flex items-center gap-2 font-semibold text-[14.5px]">
                    <ShoppingCart className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                    <span>Votre panier ({cartCount})</span>
                  </div>
                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCart([])}
                      className="text-[12px] hover:underline cursor-pointer"
                      style={{ color: 'var(--ink-muted)' }}
                    >
                      Vider
                    </button>
                  )}
                </div>

                {cart.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <ShoppingBag className="w-7 h-7 mx-auto opacity-30" />
                    <div className="text-[13.5px] font-medium">Votre panier est vide</div>
                    <p className="text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                      Ajoutez des plats à gauche pour préparer votre commande.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="max-h-72 overflow-y-auto divide-y px-5" style={{ borderColor: 'var(--border-hairline)' }}>
                      {cart.map((line) => (
                        <div key={line.lineId} className="py-3 flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-medium truncate">{line.product.name}</div>
                            <div className="text-[11.5px] tabular-nums" style={{ color: 'var(--ink-muted)' }}>
                              {formatFCFA(line.product.price * line.quantity)}
                            </div>
                          </div>
                          <div className="inline-flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => updateCartLineQty(line.lineId, -1)}
                              className="w-6 h-6 rounded border flex items-center justify-center cursor-pointer"
                              style={{ borderColor: 'var(--border-hairline)' }}
                            >
                              {line.quantity === 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                            </button>
                            <span className="w-5 text-center text-[12px] font-semibold tabular-nums">{line.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateCartLineQty(line.lineId, 1)}
                              className="w-6 h-6 rounded border flex items-center justify-center cursor-pointer"
                              style={{ borderColor: 'var(--border-hairline)' }}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-5 border-t space-y-3" style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}>
                      <div className="space-y-1 text-[13px]">
                        <div className="flex justify-between" style={{ color: 'var(--ink-muted)' }}>
                          <span>Sous-total</span>
                          <span className="tabular-nums">{formatFCFA(cartSubtotal)}</span>
                        </div>
                        {channel === 'LIVRAISON' && (
                          <div className="flex justify-between" style={{ color: 'var(--ink-muted)' }}>
                            <span>Livraison ({neighborhood})</span>
                            <span className="tabular-nums">{formatFCFA(currentFee)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold text-[15px] pt-2 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                          <span>Total</span>
                          <span className="tabular-nums">{formatFCFA(cartSubtotal + currentFee)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setCartOpen(true)}
                        style={{ backgroundColor: 'var(--accent)' }}
                        className="w-full h-11 rounded-xl text-white font-semibold text-[13.5px] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.985]"
                      >
                        <span>Commander</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}

                {channel === 'SUR_PLACE' && (
                  <div className="px-5 py-3 border-t flex items-center justify-between text-[12px]" style={{ borderColor: 'var(--border-hairline)' }}>
                    <span className="flex items-center gap-1.5" style={{ color: 'var(--ink-muted)' }}>
                      <BellRing className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                      Table {tableNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => setBillSheetOpen(true)}
                      className="font-semibold hover:underline cursor-pointer"
                      style={{ color: 'var(--accent)' }}
                    >
                      Demander l’addition
                    </button>
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}

        {activeTab === 'TRACKING' && (
          <div className="max-w-2xl mx-auto">
            <ClientTrackingTab
              trackedOrderIds={trackedOrderIds}
              activeOrderId={activeTrackedOrderId}
              onSelectOrder={setActiveTrackedOrderId}
              onGoToMenu={() => setActiveTab('MENU')}
              onOpenBillSheet={() => setBillSheetOpen(true)}
            />
          </div>
        )}

        {activeTab === 'LOYALTY' && (
          <div className="max-w-2xl mx-auto">
            <ClientLoyaltyTab phone={customerPhone} onChangePhone={setCustomerPhone} />
          </div>
        )}

        {activeTab === 'INFO' && (
          <div className="max-w-2xl mx-auto px-4 sm:px-6">
            <ClientInfoTab
              tableNumber={tableNumber}
              isAtTable={channel === 'SUR_PLACE'}
              customerName={customerName}
              customerPhone={customerPhone}
              onOpenBillSheet={() => setBillSheetOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Mobile/Tablet Floating Cart Bar (hidden on lg+ where sticky cart sidebar is always visible) */}
      {activeTab === 'MENU' && cartCount > 0 && (
        <div className="lg:hidden fixed bottom-[70px] md:bottom-5 inset-x-0 px-4 max-w-xl mx-auto z-30">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            style={{ backgroundColor: 'var(--accent)' }}
            className="w-full h-12 rounded-2xl text-white px-4 shadow-[0_8px_24px_rgba(0,0,0,0.22)] flex items-center justify-between cursor-pointer active:scale-[0.985] transition-transform"
          >
            <div className="flex items-center gap-2.5">
              <span className="min-w-[24px] h-6 px-1.5 rounded-lg bg-white/20 text-[12.5px] font-semibold flex items-center justify-center tabular-nums">
                {cartCount}
              </span>
              <span className="text-[13.5px] font-semibold">Voir mon panier</span>
            </div>
            <span className="text-[14px] font-semibold tabular-nums">
              {formatFCFA(cartSubtotal + currentFee)}
            </span>
          </button>
        </div>
      )}

      {/* Native Mobile Bottom Navigation Bar (only on phones < md) */}
      <nav
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
        className="md:hidden fixed bottom-0 inset-x-0 h-[60px] border-t grid grid-cols-4 z-30 px-2"
      >
        {(
          [
            { id: 'MENU', label: 'Menu', icon: UtensilsCrossed },
            { id: 'TRACKING', label: 'Suivi', icon: Clock, badge: activeOrdersCount },
            { id: 'LOYALTY', label: 'Fidélité', icon: Award },
            { id: 'INFO', label: 'Infos', icon: Info },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          const badge = 'badge' in item ? item.badge : 0;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center justify-center gap-0.5 relative cursor-pointer"
              style={{ color: active ? 'var(--accent)' : 'var(--ink-muted)' }}
            >
              <div className="relative">
                <Icon className="w-[19px] h-[19px]" />
                {badge > 0 && (
                  <span
                    style={{ backgroundColor: 'var(--accent)' }}
                    className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 rounded-full text-[9.5px] font-bold text-white flex items-center justify-center tabular-nums"
                  >
                    {badge}
                  </span>
                )}
              </div>
              <span className={`text-[10.5px] ${active ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Sheets */}
      <ProductDetailSheet
        product={selectedProduct}
        categoryName={state.categories.find((c) => c.id === selectedProduct?.categoryId)?.name}
        onClose={() => setSelectedProduct(null)}
        onAdd={addProductToCart}
      />

      <CartCheckoutSheet
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        onUpdateQty={updateCartLineQty}
        onQuickAddDrink={(drink) => addProductToCart(drink, 1, 'Bien glacé')}
        onClearCart={() => setCart([])}
        channel={channel}
        channelConfirmed={channelConfirmed}
        onChangeChannel={(ch) => {
          setChannel(ch);
          setChannelConfirmed(true);
          if (ch !== 'SUR_PLACE') setIsQrLockedTable(false);
        }}
        tableNumber={tableNumber}
        onChangeTableNumber={setTableNumber}
        isQrLockedTable={isQrLockedTable}
        neighborhood={neighborhood}
        onChangeNeighborhood={setNeighborhood}
        customerName={customerName}
        onChangeCustomerName={setCustomerName}
        customerPhone={customerPhone}
        onChangeCustomerPhone={setCustomerPhone}
        deliveryAddress={deliveryAddress}
        onChangeDeliveryAddress={setDeliveryAddress}
        onOrderCreated={handleOrderCreated}
      />

      <BillRequestSheet
        isOpen={billSheetOpen}
        onClose={() => setBillSheetOpen(false)}
        tableNumber={tableNumber}
        customerName={customerName || undefined}
      />
    </div>
  );
};
