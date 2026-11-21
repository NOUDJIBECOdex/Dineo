import {
  CheckCircle2,
  MapPin,
  Minus,
  Percent,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  Truck,
  UserPlus,
  Utensils,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useErp } from '../../../store/erp.context';
import type { ErpOrder, ErpOrderItem, OrderChannel, PaymentMethod } from '../../../types/erp';
import { MAROUA_NEIGHBORHOODS } from '../../../types/erp';
import { formatFCFA } from '../../../utils/currency';
import { sanitizePhoneInput } from '../../../utils/phone';
import { PaymentMethodMark } from '../../common/PaymentBrandLogos';
import { Receipt80mmModal } from '../print/PrintModals';
import {
  Btn,
  DialogModal,
  Field,
  SearchInput,
  Surface,
  inputBaseClass,
  inputBaseStyle,
} from '../ui/Primitives';

interface CartLine {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export const PosView: React.FC = () => {
  const { state, createPosOrder, saveCustomer } = useErp();

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);

  // Order metadata
  const [channel, setChannel] = useState<OrderChannel>('SUR_PLACE');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [walkInName, setWalkInName] = useState('');
  const [selectedTableId, setSelectedTableId] = useState<string>(
    () => state.tables.find((t) => t.status === 'LIBRE')?.id || state.tables[0]?.id || ''
  );
  const [deliveryNeighborhood, setDeliveryNeighborhood] = useState<string>('Domayo');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [deliveryFee, setDeliveryFee] = useState<number>(500);
  const [notes, setNotes] = useState('');

  // Discount
  const [discountType, setDiscountType] = useState<'NONE' | 'PERCENT' | 'AMOUNT'>('NONE');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Payment
  const [paymentMode, setPaymentMode] = useState<'FULL' | 'PARTIAL' | 'UNPAID'>('FULL');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ESPECES');
  const [partialAmount, setPartialAmount] = useState<number>(0);

  // Quick Add Customer Modal
  const [addCustOpen, setAddCustOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('+237 6 ');
  const [newCustNeighborhood, setNewCustNeighborhood] = useState('Domayo');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Receipt Modal after validating
  const [createdReceipt, setCreatedReceipt] = useState<ErpOrder | null>(null);

  const filteredProducts = useMemo(() => {
    return state.products.filter((p) => {
      if (!p.isAvailable) return false;
      if (selectedCategory !== 'ALL' && p.categoryId !== selectedCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [state.products, selectedCategory, search]);

  const addToCart = (productId: string) => {
    const prod = state.products.find((p) => p.id === productId);
    if (!prod) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      if (existing) {
        return prev.map((l) => (l.productId === productId ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { productId: prod.id, name: prod.name, unitPrice: prod.price, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => (l.productId === productId ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0)
    );
  };

  const selectedCustomer = state.customers.find((c) => c.id === selectedCustomerId);

  const handleSelectCustomer = (custId: string) => {
    setSelectedCustomerId(custId);
    const found = state.customers.find((c) => c.id === custId);
    if (found && channel === 'LIVRAISON') {
      setDeliveryNeighborhood(found.neighborhood || 'Domayo');
      setDeliveryAddress(found.address || '');
      const nInfo = MAROUA_NEIGHBORHOODS.find((n) => n.name === found.neighborhood);
      if (nInfo) setDeliveryFee(nInfo.fee);
    }
  };

  const handleNeighborhoodChange = (hood: string) => {
    setDeliveryNeighborhood(hood);
    const info = MAROUA_NEIGHBORHOODS.find((n) => n.name === hood);
    if (info) setDeliveryFee(info.fee);
  };

  const subtotal = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const discountAmount =
    discountType === 'PERCENT'
      ? Math.round((subtotal * Math.min(100, Math.max(0, discountValue))) / 100)
      : discountType === 'AMOUNT'
      ? Math.min(subtotal, Math.max(0, discountValue))
      : 0;
  const effectiveDeliveryFee = channel === 'LIVRAISON' ? Math.max(0, deliveryFee) : 0;
  const total = Math.max(0, subtotal - discountAmount + effectiveDeliveryFee);

  const handleValidateOrder = () => {
    if (cart.length === 0) return;
    const orderItems: ErpOrderItem[] = cart.map((l) => ({
      id: `oi-${l.productId}-${Date.now()}`,
      productId: l.productId,
      name: l.name,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      totalPrice: l.unitPrice * l.quantity,
    }));

    const order = createPosOrder({
      channel,
      items: orderItems,
      discountType,
      discountValue,
      deliveryFee: effectiveDeliveryFee,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name || walkInName.trim() || 'Client de passage',
      customerPhone: selectedCustomer?.phone,
      tableId: channel === 'SUR_PLACE' ? selectedTableId : undefined,
      deliveryNeighborhood: channel === 'LIVRAISON' ? deliveryNeighborhood : undefined,
      deliveryAddress: channel === 'LIVRAISON' ? deliveryAddress : undefined,
      notes: notes.trim() || undefined,
      paymentMode,
      paymentMethod,
      amountPaidNow: paymentMode === 'PARTIAL' ? partialAmount : paymentMode === 'FULL' ? total : 0,
    });

    setCreatedReceipt(order);
    setCart([]);
    setDiscountType('NONE');
    setDiscountValue(0);
    setNotes('');
    setPartialAmount(0);
    setPaymentMode('FULL');
  };

  const handleQuickAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    const created = saveCustomer({
      name: newCustName.trim(),
      phone: newCustPhone.trim() || '+237 6 ',
      neighborhood: newCustNeighborhood,
      address: newCustAddress.trim(),
    });
    setSelectedCustomerId(created.id);
    if (channel === 'LIVRAISON') {
      setDeliveryNeighborhood(created.neighborhood);
      setDeliveryAddress(created.address || '');
      const info = MAROUA_NEIGHBORHOODS.find((n) => n.name === created.neighborhood);
      if (info) setDeliveryFee(info.fee);
    }
    setNewCustName('');
    setNewCustPhone('+237 6 ');
    setNewCustAddress('');
    setAddCustOpen(false);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
      {/* Left: Catalog */}
      <div className="xl:col-span-8 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Rechercher un plat, boisson, grillade..."
            className="flex-1"
          />
          <div className="text-[12.5px] shrink-0" style={{ color: 'var(--ink-muted)' }}>
            {filteredProducts.length} article{filteredProducts.length > 1 ? 's' : ''} disponible{filteredProducts.length > 1 ? 's' : ''}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            style={{
              backgroundColor: selectedCategory === 'ALL' ? 'var(--ink-primary)' : 'var(--bg-surface)',
              color: selectedCategory === 'ALL' ? 'var(--ink-inverse)' : 'var(--ink-secondary)',
              borderColor: selectedCategory === 'ALL' ? 'transparent' : 'var(--border-hairline)',
            }}
            className="h-8 px-3 rounded-lg border text-[12.5px] font-medium transition-colors cursor-pointer whitespace-nowrap"
          >
            Tous ({state.products.length})
          </button>
          {state.categories.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  backgroundColor: active ? 'var(--ink-primary)' : 'var(--bg-surface)',
                  color: active ? 'var(--ink-inverse)' : 'var(--ink-secondary)',
                  borderColor: active ? 'transparent' : 'var(--border-hairline)',
                }}
                className="h-8 px-3 rounded-lg border text-[12.5px] font-medium transition-colors cursor-pointer whitespace-nowrap"
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {filteredProducts.map((prod) => {
            const inCart = cart.find((c) => c.productId === prod.id);
            const low = prod.stock <= prod.minStock;
            return (
              <button
                key={prod.id}
                type="button"
                onClick={() => addToCart(prod.id)}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: inCart ? 'var(--accent)' : 'var(--border-hairline)',
                }}
                className="group rounded-xl border overflow-hidden text-left transition-all cursor-pointer hover:border-[var(--border-strong)] flex flex-col relative"
              >
                {inCart && (
                  <span
                    className="absolute top-2 right-2 z-10 min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-semibold text-white flex items-center justify-center tabular-nums shadow-sm"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    {inCart.quantity}
                  </span>
                )}
                <div className="aspect-[4/3] w-full overflow-hidden" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                  <img
                    src={prod.imageUrl}
                    alt={prod.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                </div>
                <div className="p-3 flex-1 flex flex-col justify-between gap-2">
                  <div className="text-[13px] font-medium leading-snug line-clamp-2" style={{ color: 'var(--ink-primary)' }}>
                    {prod.name}
                  </div>
                  <div className="flex items-center justify-between gap-1 pt-0.5">
                    <span className="text-[13px] font-semibold tabular-nums" style={{ color: 'var(--accent)' }}>
                      {formatFCFA(prod.price)}
                    </span>
                    <span
                      className="text-[11px] tabular-nums"
                      style={{ color: low ? 'var(--warn-text)' : 'var(--ink-muted)' }}
                    >
                      {prod.stock} en stock
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Cart & Checkout Panel */}
      <Surface padding="none" className="xl:col-span-4 xl:sticky xl:top-[76px] overflow-hidden">
        {/* Header + Channel Switcher */}
        <div className="p-4 border-b space-y-3" style={{ borderColor: 'var(--border-hairline)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-[14.5px]">
              <ShoppingCart className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span>Panier en cours</span>
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

          <div
            className="grid grid-cols-3 p-1 rounded-lg border gap-1"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-hairline)' }}
          >
            {(
              [
                { id: 'SUR_PLACE', label: 'Sur place', icon: Utensils },
                { id: 'EMPORTER', label: 'Emporter', icon: ShoppingBag },
                { id: 'LIVRAISON', label: 'Livraison', icon: Truck },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon;
              const active = channel === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setChannel(opt.id)}
                  style={{
                    backgroundColor: active ? 'var(--bg-surface)' : 'transparent',
                    color: active ? 'var(--ink-primary)' : 'var(--ink-muted)',
                  }}
                  className="py-1.5 px-2 rounded-md text-[12px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cart Lines */}
        <div className="max-h-[260px] overflow-y-auto divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
          {cart.length === 0 ? (
            <div className="py-10 px-4 text-center">
              <ShoppingCart className="w-7 h-7 mx-auto mb-2 opacity-35" />
              <p className="text-[13px] font-medium" style={{ color: 'var(--ink-secondary)' }}>
                Votre panier est vide
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                Cliquez sur un plat à gauche pour l’ajouter
              </p>
            </div>
          ) : (
            cart.map((line) => (
              <div key={line.productId} className="px-4 py-3 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium truncate">{line.name}</div>
                  <div className="text-[11.5px] tabular-nums" style={{ color: 'var(--ink-muted)' }}>
                    {formatFCFA(line.unitPrice)} × {line.quantity}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateQty(line.productId, -1)}
                    className="w-6 h-6 rounded border flex items-center justify-center cursor-pointer hover:bg-[var(--bg-subtle)]"
                    style={{ borderColor: 'var(--border-hairline)' }}
                  >
                    {line.quantity === 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  </button>
                  <span className="w-6 text-center text-[12.5px] font-medium tabular-nums">{line.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQty(line.productId, 1)}
                    className="w-6 h-6 rounded border flex items-center justify-center cursor-pointer hover:bg-[var(--bg-subtle)]"
                    style={{ borderColor: 'var(--border-hairline)' }}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <span className="w-20 text-right text-[12.5px] font-semibold tabular-nums">
                    {formatFCFA(line.unitPrice * line.quantity)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Order Context Form */}
        <div className="p-4 border-t space-y-3" style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}>
          {/* Client */}
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[11.5px] font-medium uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
                Client
              </label>
              <button
                type="button"
                onClick={() => setAddCustOpen(true)}
                className="text-[11.5px] font-medium flex items-center gap-1 hover:underline cursor-pointer"
                style={{ color: 'var(--accent)' }}
              >
                <UserPlus className="w-3 h-3" />
                Nouveau client
              </button>
            </div>
            <select
              value={selectedCustomerId}
              onChange={(e) => handleSelectCustomer(e.target.value)}
              style={inputBaseStyle}
              className={inputBaseClass}
            >
              <option value="">Client de passage</option>
              {state.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.neighborhood} ({c.points} pts)
                </option>
              ))}
            </select>
            {!selectedCustomerId && (
              <input
                type="text"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                placeholder="Nom du client (optionnel)"
                style={inputBaseStyle}
                className={inputBaseClass}
              />
            )}
          </div>

          {/* Table selector for SUR_PLACE */}
          {channel === 'SUR_PLACE' && (
            <div className="space-y-1">
              <label className="text-[11.5px] font-medium uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
                Table assignée
              </label>
              <select
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                style={inputBaseStyle}
                className={inputBaseClass}
              >
                {state.tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.number} — {t.zone} ({t.seats} pl. · {t.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Delivery details for LIVRAISON */}
          {channel === 'LIVRAISON' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11.5px] font-medium uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--ink-muted)' }}>
                    <MapPin className="w-3 h-3" />
                    Quartier Maroua
                  </label>
                  <select
                    value={deliveryNeighborhood}
                    onChange={(e) => handleNeighborhoodChange(e.target.value)}
                    style={inputBaseStyle}
                    className={inputBaseClass}
                  >
                    {MAROUA_NEIGHBORHOODS.map((n) => (
                      <option key={n.name} value={n.name}>
                        {n.name} ({n.fee} F)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11.5px] font-medium uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
                    Frais livraison
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(Number(e.target.value))}
                    style={inputBaseStyle}
                    className={`${inputBaseClass} tabular-nums`}
                  />
                </div>
              </div>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Repère / Adresse précise à Maroua..."
                style={inputBaseStyle}
                className={inputBaseClass}
              />
            </div>
          )}

          {/* Remise */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11.5px] font-medium uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--ink-muted)' }}>
                <Percent className="w-3 h-3" />
                Remise
              </label>
              <select
                value={discountType}
                onChange={(e) => {
                  const val = e.target.value as 'NONE' | 'PERCENT' | 'AMOUNT';
                  setDiscountType(val);
                  if (val === 'NONE') setDiscountValue(0);
                }}
                style={inputBaseStyle}
                className={inputBaseClass}
              >
                <option value="NONE">Aucune</option>
                <option value="PERCENT">Pourcentage (%)</option>
                <option value="AMOUNT">Montant (FCFA)</option>
              </select>
            </div>
            {discountType !== 'NONE' && (
              <div className="space-y-1">
                <label className="text-[11.5px] font-medium uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
                  Valeur ({discountType === 'PERCENT' ? '%' : 'FCFA'})
                </label>
                <input
                  type="number"
                  min={0}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  style={inputBaseStyle}
                  className={`${inputBaseClass} tabular-nums`}
                />
              </div>
            )}
          </div>

          {/* Payment Status & Method */}
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  { id: 'FULL', label: 'Payé' },
                  { id: 'PARTIAL', label: 'Partiel' },
                  { id: 'UNPAID', label: 'À encaisser' },
                ] as const
              ).map((pm) => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => {
                    setPaymentMode(pm.id);
                    if (pm.id === 'PARTIAL' && partialAmount === 0) {
                      setPartialAmount(Math.round(total / 2));
                    }
                  }}
                  style={{
                    backgroundColor: paymentMode === pm.id ? 'var(--ink-primary)' : 'var(--bg-surface)',
                    color: paymentMode === pm.id ? 'var(--ink-inverse)' : 'var(--ink-secondary)',
                    borderColor: paymentMode === pm.id ? 'transparent' : 'var(--border-hairline)',
                  }}
                  className="h-8 rounded-md border text-[12px] font-medium cursor-pointer transition-colors"
                >
                  {pm.label}
                </button>
              ))}
            </div>

            {paymentMode !== 'UNPAID' && (
              <div className="grid grid-cols-3 gap-1">
                {(['ESPECES', 'ORANGE_MONEY', 'MTN_MOMO'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    style={{
                      backgroundColor: paymentMethod === m ? 'var(--accent-soft)' : 'var(--bg-surface)',
                      color: paymentMethod === m ? 'var(--ink-primary)' : 'var(--ink-secondary)',
                      borderColor: paymentMethod === m ? 'var(--accent)' : 'var(--border-hairline)',
                    }}
                    className="h-9 px-1.5 rounded-md border text-[11px] font-medium cursor-pointer transition-colors flex items-center justify-center gap-1"
                  >
                    <PaymentMethodMark method={m} size="xs" />
                    <span className="truncate">{m === 'ORANGE_MONEY' ? 'OM' : m === 'MTN_MOMO' ? 'MoMo' : 'Cash'}</span>
                  </button>
                ))}
              </div>
            )}

            {paymentMode === 'PARTIAL' && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                  <span>Acompte versé (FCFA)</span>
                  <span>Reste : {formatFCFA(Math.max(0, total - partialAmount))}</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={total}
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(Number(e.target.value))}
                  style={inputBaseStyle}
                  className={`${inputBaseClass} tabular-nums`}
                />
              </div>
            )}
          </div>

          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Note cuisine (ex: sans piment, bien cuit)..."
            style={inputBaseStyle}
            className={inputBaseClass}
          />
        </div>

        {/* Totals & Validate */}
        <div className="p-4 border-t space-y-2.5" style={{ borderColor: 'var(--border-hairline)' }}>
          <div className="space-y-1 text-[12.5px]">
            <div className="flex justify-between" style={{ color: 'var(--ink-muted)' }}>
              <span>Sous-total</span>
              <span className="tabular-nums">{formatFCFA(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between" style={{ color: 'var(--ok-text)' }}>
                <span>Remise</span>
                <span className="tabular-nums">-{formatFCFA(discountAmount)}</span>
              </div>
            )}
            {effectiveDeliveryFee > 0 && (
              <div className="flex justify-between" style={{ color: 'var(--ink-muted)' }}>
                <span>Livraison ({deliveryNeighborhood})</span>
                <span className="tabular-nums">{formatFCFA(effectiveDeliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between text-[16px] font-semibold pt-2 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
              <span>Total</span>
              <span className="tabular-nums">{formatFCFA(total)}</span>
            </div>
          </div>

          <Btn
            variant="accent"
            className="w-full h-10 text-[13.5px]"
            disabled={cart.length === 0}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
            onClick={handleValidateOrder}
          >
            Valider & Imprimer Ticket
          </Btn>
        </div>
      </Surface>

      {/* Quick Create Customer Modal */}
      <DialogModal
        isOpen={addCustOpen}
        onClose={() => setAddCustOpen(false)}
        title="Nouveau client"
        subtitle="Ajout rapide pour la caisse et la livraison"
        maxWidth="sm"
      >
        <form onSubmit={handleQuickAddCustomer} className="space-y-3.5">
          <Field label="Nom complet" required>
            <input
              type="text"
              required
              value={newCustName}
              onChange={(e) => setNewCustName(e.target.value)}
              placeholder="ex: Salifou Bello"
              style={inputBaseStyle}
              className={inputBaseClass}
            />
          </Field>
          <Field label="Téléphone" required>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9+\s]*"
              required
              value={newCustPhone}
              onChange={(e) => setNewCustPhone(sanitizePhoneInput(e.target.value))}
              placeholder="+237 6 99 00 00 00"
              style={inputBaseStyle}
              className={`${inputBaseClass} font-mono`}
            />
          </Field>
          <Field label="Quartier (Maroua)">
            <select
              value={newCustNeighborhood}
              onChange={(e) => setNewCustNeighborhood(e.target.value)}
              style={inputBaseStyle}
              className={inputBaseClass}
            >
              {MAROUA_NEIGHBORHOODS.map((n) => (
                <option key={n.name} value={n.name}>
                  {n.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Adresse / Repère">
            <input
              type="text"
              value={newCustAddress}
              onChange={(e) => setNewCustAddress(e.target.value)}
              placeholder="Ex: Face station Total Domayo"
              style={inputBaseStyle}
              className={inputBaseClass}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Btn type="button" variant="secondary" onClick={() => setAddCustOpen(false)}>
              Annuler
            </Btn>
            <Btn type="submit" variant="primary">
              Enregistrer
            </Btn>
          </div>
        </form>
      </DialogModal>

      {/* 80mm Ticket Preview right after validating POS sale */}
      <Receipt80mmModal
        order={createdReceipt}
        settings={state.settings}
        onClose={() => setCreatedReceipt(null)}
      />
    </div>
  );
};
