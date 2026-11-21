import {
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  Copy,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
  Utensils,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useErp } from '../../../store/erp.context';
import type { ErpOrder, ErpOrderItem, OrderChannel, PaymentMethod, Product } from '../../../types/erp';
import { MAROUA_NEIGHBORHOODS } from '../../../types/erp';
import { formatFCFA } from '../../../utils/currency';
import { countLocalPhoneDigits, sanitizePhoneInput } from '../../../utils/phone';
import { CashFcfaLogo, MtnMomoLogo, OrangeMoneyLogo } from '../../common/PaymentBrandLogos';
import { SpellcheckTextarea } from '../../common/SpellcheckTextarea';

export interface MobileCartLine {
  lineId: string;
  product: Product;
  quantity: number;
  optionLabel?: string;
  note?: string;
}

interface CartCheckoutSheetProps {
  isOpen: boolean;
  onClose: () => void;
  cart: MobileCartLine[];
  onUpdateQty: (lineId: string, delta: number) => void;
  onQuickAddDrink: (product: Product) => void;
  onClearCart: () => void;
  channel: OrderChannel;
  onChangeChannel: (ch: OrderChannel) => void;
  tableNumber: string;
  onChangeTableNumber: (tbl: string) => void;
  isQrLockedTable: boolean;
  neighborhood: string;
  onChangeNeighborhood: (hood: string) => void;
  customerName: string;
  onChangeCustomerName: (name: string) => void;
  customerPhone: string;
  onChangeCustomerPhone: (phone: string) => void;
  deliveryAddress: string;
  onChangeDeliveryAddress: (addr: string) => void;
  onOrderCreated: (order: ErpOrder) => void;
}

export const CartCheckoutSheet: React.FC<CartCheckoutSheetProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQty,
  onQuickAddDrink,
  onClearCart,
  channel,
  onChangeChannel,
  tableNumber,
  onChangeTableNumber,
  isQrLockedTable,
  neighborhood,
  onChangeNeighborhood,
  customerName,
  onChangeCustomerName,
  customerPhone,
  onChangeCustomerPhone,
  deliveryAddress,
  onChangeDeliveryAddress,
  onOrderCreated,
}) => {
  const { state, createClientOrder } = useErp();
  const [step, setStep] = useState<'CART' | 'CHECKOUT'>('CART');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ESPECES');
  const [orderNotes, setOrderNotes] = useState('');
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const deliveryFee = useMemo(() => {
    if (channel !== 'LIVRAISON') return 0;
    const found = MAROUA_NEIGHBORHOODS.find((n) => n.name === neighborhood);
    return found ? found.fee : state.settings.defaultDeliveryFee;
  }, [channel, neighborhood, state.settings.defaultDeliveryFee]);

  const subtotal = useMemo(
    () => cart.reduce((sum, l) => sum + l.product.price * l.quantity, 0),
    [cart]
  );
  const total = subtotal + deliveryFee;

  // Suggest fresh drinks not yet in cart
  const drinkSuggestions = useMemo(() => {
    const inCartIds = new Set(cart.map((c) => c.product.id));
    return state.products
      .filter((p) => p.categoryId === 'cat-boissons' && p.isAvailable && p.stock > 0 && !inCartIds.has(p.id))
      .slice(0, 3);
  }, [state.products, cart]);

  // Recognize returning Loyalty member by phone number
  const matchedMember = useMemo(() => {
    const digits = customerPhone.replace(/\s+/g, '');
    if (digits.length < 8) return null;
    return (
      state.customers.find((c) => c.phone.replace(/\s+/g, '').endsWith(digits.slice(-8))) || null
    );
  }, [customerPhone, state.customers]);

  const earnedPoints =
    state.loyaltyConfig.amountPerStep > 0
      ? Math.floor(total / state.loyaltyConfig.amountPerStep) * state.loyaltyConfig.pointsPerStep
      : 0;

  if (!isOpen) return null;

  const handleClose = () => {
    setStep('CART');
    setError('');
    onClose();
  };

  const handleCopyMerchant = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (cart.length === 0) return;
    if (!customerName.trim()) {
      setError('Indiquez votre prénom ou nom pour le service.');
      return;
    }
    if (channel === 'LIVRAISON' && countLocalPhoneDigits(customerPhone) < 9) {
      setError('Veuillez saisir un numéro camerounais valide à 9 chiffres (ex: +237 6 99 12 34 56).');
      return;
    }
    if (channel === 'LIVRAISON' && !deliveryAddress.trim()) {
      setError('Précisez un repère ou une adresse dans votre quartier à Maroua.');
      return;
    }

    const items: ErpOrderItem[] = cart.map((l) => {
      const noteParts = [l.optionLabel, l.note].filter(Boolean);
      return {
        id: `ci-${l.lineId}`,
        productId: l.product.id,
        name: l.product.name,
        unitPrice: l.product.price,
        quantity: l.quantity,
        totalPrice: l.product.price * l.quantity,
        notes: noteParts.length > 0 ? noteParts.join(' · ') : undefined,
      };
    });

    const created = createClientOrder({
      channel,
      source: channel === 'SUR_PLACE' && isQrLockedTable ? 'QR_TABLE' : 'EN_LIGNE',
      items,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      tableNumber: channel === 'SUR_PLACE' ? tableNumber : undefined,
      deliveryNeighborhood: channel === 'LIVRAISON' ? neighborhood : undefined,
      deliveryAddress: channel === 'LIVRAISON' ? deliveryAddress.trim() : undefined,
      deliveryFee,
      paymentMethod,
      notes: orderNotes.trim() || undefined,
    });

    onClearCart();
    setOrderNotes('');
    setStep('CART');
    onOrderCreated(created);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px]" onClick={handleClose} />

      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--ink-primary)',
          borderColor: 'var(--border-hairline)',
        }}
        className="relative z-10 w-full max-w-[460px] rounded-t-3xl sm:rounded-2xl border shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden"
      >
        {/* Mobile grabber */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border-strong)' }} />
        </div>

        {/* Sheet Header */}
        <div
          className="px-5 py-3.5 border-b flex items-center justify-between gap-2 shrink-0"
          style={{ borderColor: 'var(--border-hairline)' }}
        >
          <div className="flex items-center gap-2.5">
            {step === 'CHECKOUT' && (
              <button
                type="button"
                onClick={() => {
                  setStep('CART');
                  setError('');
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                style={{ backgroundColor: 'var(--bg-subtle)' }}
                aria-label="Retour au panier"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="text-[16px] font-semibold tracking-[-0.01em]">
                {step === 'CART' ? 'Votre panier' : 'Finaliser la commande'}
              </h2>
              <p className="text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                {step === 'CART'
                  ? `${cart.reduce((s, l) => s + l.quantity, 0)} article(s) sélectionné(s)`
                  : 'Transmission instantanée au restaurant'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
            style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--ink-muted)' }}
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP 1 : PANIER */}
        {step === 'CART' ? (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {cart.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <ShoppingBag className="w-8 h-8 mx-auto opacity-30" />
                  <div className="text-[14px] font-medium">Votre panier est vide</div>
                  <p className="text-[12.5px]" style={{ color: 'var(--ink-muted)' }}>
                    Parcourez la carte pour choisir vos plats et boissons.
                  </p>
                </div>
              ) : (
                <>
                  <div className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
                    {cart.map((line) => (
                      <div key={line.lineId} className="py-3.5 first:pt-0 flex items-start gap-3">
                        <img
                          src={line.product.imageUrl}
                          alt={line.product.name}
                          className="w-14 h-14 rounded-xl object-cover shrink-0 border"
                          style={{ borderColor: 'var(--border-hairline)' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-[13.5px] font-medium leading-snug">{line.product.name}</div>
                          {(line.optionLabel || line.note) && (
                            <div className="text-[11.5px] mt-0.5 truncate" style={{ color: 'var(--ink-muted)' }}>
                              {[line.optionLabel, line.note].filter(Boolean).join(' · ')}
                            </div>
                          )}
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="text-[13px] font-semibold tabular-nums" style={{ color: 'var(--accent)' }}>
                              {formatFCFA(line.product.price * line.quantity)}
                            </span>
                            <div
                              className="inline-flex items-center rounded-lg border h-8 px-1"
                              style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}
                            >
                              <button
                                type="button"
                                onClick={() => onUpdateQty(line.lineId, -1)}
                                className="w-7 h-7 flex items-center justify-center cursor-pointer"
                                aria-label="Retirer"
                              >
                                {line.quantity === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                              </button>
                              <span className="w-6 text-center text-[12.5px] font-semibold tabular-nums">
                                {line.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateQty(line.lineId, 1)}
                                className="w-7 h-7 flex items-center justify-center cursor-pointer"
                                aria-label="Ajouter"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quick Drink Upsell */}
                  {drinkSuggestions.length > 0 && (
                    <div className="space-y-2.5 pt-1">
                      <div className="text-[12px] font-semibold" style={{ color: 'var(--ink-secondary)' }}>
                        Ajouter une boisson fraîche ?
                      </div>
                      <div className="flex gap-2.5 overflow-x-auto pb-1">
                        {drinkSuggestions.map((drink) => (
                          <button
                            key={drink.id}
                            type="button"
                            onClick={() => onQuickAddDrink(drink)}
                            style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}
                            className="shrink-0 w-44 p-2 rounded-xl border flex items-center gap-2.5 text-left cursor-pointer active:scale-[0.98] transition-transform"
                          >
                            <img src={drink.imageUrl} alt={drink.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="text-[12px] font-medium truncate">{drink.name}</div>
                              <div className="text-[11.5px] font-semibold tabular-nums" style={{ color: 'var(--accent)' }}>
                                +{formatFCFA(drink.price)}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  <div
                    className="p-4 rounded-2xl border space-y-1.5 text-[13px]"
                    style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}
                  >
                    <div className="flex justify-between" style={{ color: 'var(--ink-secondary)' }}>
                      <span>Sous-total</span>
                      <span className="tabular-nums">{formatFCFA(subtotal)}</span>
                    </div>
                    {channel === 'LIVRAISON' && (
                      <div className="flex justify-between" style={{ color: 'var(--ink-secondary)' }}>
                        <span>Livraison ({neighborhood})</span>
                        <span className="tabular-nums">{formatFCFA(deliveryFee)}</span>
                      </div>
                    )}
                    <div
                      className="flex justify-between font-semibold text-[15px] pt-2 border-t"
                      style={{ borderColor: 'var(--border-hairline)' }}
                    >
                      <span>Total estimé</span>
                      <span className="tabular-nums">{formatFCFA(total)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t shrink-0" style={{ borderColor: 'var(--border-hairline)' }}>
                <button
                  type="button"
                  onClick={() => setStep('CHECKOUT')}
                  style={{ backgroundColor: 'var(--accent)' }}
                  className="w-full h-12 rounded-xl text-white font-semibold text-[14px] flex items-center justify-between px-5 cursor-pointer active:scale-[0.985] transition-transform"
                >
                  <span>Continuer vers la validation</span>
                  <span className="flex items-center gap-1.5 tabular-nums">
                    {formatFCFA(total)}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
              </div>
            )}
          </>
        ) : (
          /* STEP 2 : VALIDATION & PAIEMENT */
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {error && (
                <div
                  className="px-3.5 py-2.5 rounded-xl border text-[12.5px] font-medium"
                  style={{ backgroundColor: 'var(--err-bg)', borderColor: 'var(--err-border)', color: 'var(--err-text)' }}
                >
                  {error}
                </div>
              )}

              {/* Service Mode */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold block" style={{ color: 'var(--ink-secondary)' }}>
                  Mode de commande
                </label>
                <div
                  className="grid grid-cols-3 p-1 rounded-xl border gap-1"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-hairline)' }}
                >
                  {(
                    [
                      { id: 'SUR_PLACE', label: 'À table', icon: Utensils },
                      { id: 'LIVRAISON', label: 'Livraison', icon: Truck },
                      { id: 'EMPORTER', label: 'Emporter', icon: ShoppingBag },
                    ] as const
                  ).map((opt) => {
                    const Icon = opt.icon;
                    const active = channel === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onChangeChannel(opt.id)}
                        style={{
                          backgroundColor: active ? 'var(--bg-surface)' : 'transparent',
                          color: active ? 'var(--ink-primary)' : 'var(--ink-muted)',
                        }}
                        className="h-10 rounded-lg text-[12.5px] font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: active ? 'var(--accent)' : undefined }} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Table or Delivery Neighborhood */}
              {channel === 'SUR_PLACE' && (
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium block" style={{ color: 'var(--ink-secondary)' }}>
                    Votre table {isQrLockedTable ? '(détectée via QR Code)' : ''}
                  </label>
                  <select
                    value={tableNumber}
                    onChange={(e) => onChangeTableNumber(e.target.value)}
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderColor: 'var(--border-hairline)',
                      color: 'var(--ink-primary)',
                    }}
                    className="w-full h-11 px-3.5 rounded-xl border text-[13.5px] focus:outline-none focus:border-[var(--ink-primary)]"
                  >
                    {state.tables.map((t) => (
                      <option key={t.id} value={t.number}>
                        {t.name} — {t.zone} ({t.seats} places)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {channel === 'LIVRAISON' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium flex items-center gap-1" style={{ color: 'var(--ink-secondary)' }}>
                      <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                      Quartier à Maroua
                    </label>
                    <select
                      value={neighborhood}
                      onChange={(e) => onChangeNeighborhood(e.target.value)}
                      style={{
                        backgroundColor: 'var(--bg-subtle)',
                        borderColor: 'var(--border-hairline)',
                        color: 'var(--ink-primary)',
                      }}
                      className="w-full h-11 px-3.5 rounded-xl border text-[13.5px] focus:outline-none focus:border-[var(--ink-primary)]"
                    >
                      {MAROUA_NEIGHBORHOODS.map((n) => (
                        <option key={n.name} value={n.name}>
                          {n.name} — Livraison {formatFCFA(n.fee)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium block" style={{ color: 'var(--ink-secondary)' }}>
                      Repère / Adresse précise *
                    </label>
                    <input
                      type="text"
                      required
                      value={deliveryAddress}
                      onChange={(e) => onChangeDeliveryAddress(e.target.value)}
                      placeholder="Ex: Près du Carrefour Domayo, immeuble bleu"
                      style={{
                        backgroundColor: 'var(--bg-subtle)',
                        borderColor: 'var(--border-hairline)',
                        color: 'var(--ink-primary)',
                      }}
                      className="w-full h-11 px-3.5 rounded-xl border text-[13.5px] focus:outline-none focus:border-[var(--ink-primary)]"
                    />
                  </div>
                </div>
              )}

              {channel === 'EMPORTER' && (
                <div
                  className="p-3.5 rounded-xl border text-[12.5px]"
                  style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}
                >
                  <div className="font-semibold">Retrait au comptoir (0 FCFA)</div>
                  <div className="mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                    {state.settings.address}, {state.settings.city}
                  </div>
                </div>
              )}

              {/* Contact info */}
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium block" style={{ color: 'var(--ink-secondary)' }}>
                    Votre nom ou prénom *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => onChangeCustomerName(e.target.value)}
                    placeholder="Ex: Aminatou Bouba"
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderColor: 'var(--border-hairline)',
                      color: 'var(--ink-primary)',
                    }}
                    className="w-full h-11 px-3.5 rounded-xl border text-[13.5px] focus:outline-none focus:border-[var(--ink-primary)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium block" style={{ color: 'var(--ink-secondary)' }}>
                    Téléphone {channel === 'LIVRAISON' ? '*' : '(chiffres uniquement · fidélité)'}
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9+\s]*"
                    required={channel === 'LIVRAISON'}
                    value={customerPhone}
                    onChange={(e) => onChangeCustomerPhone(sanitizePhoneInput(e.target.value))}
                    placeholder="+237 6 99 00 00 00"
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderColor: 'var(--border-hairline)',
                      color: 'var(--ink-primary)',
                    }}
                    className="w-full h-11 px-3.5 rounded-xl border text-[13.5px] font-mono focus:outline-none focus:border-[var(--ink-primary)]"
                  />
                  {earnedPoints > 0 && (
                    <div className="flex items-center gap-1.5 text-[11.5px]" style={{ color: 'var(--ok-text)' }}>
                      <Award className="w-3.5 h-3.5" />
                      {matchedMember
                        ? `Membre reconnu (${matchedMember.points} pts) · +${earnedPoints} pts sur cette commande`
                        : `+${earnedPoints} points fidélité crédités avec votre numéro`}
                    </div>
                  )}
                </div>
              </div>

              {/* Local Payment Method with OFFICIAL Orange Money & MTN MoMo Logos */}
              <div className="space-y-2">
                <label className="text-[12px] font-semibold block" style={{ color: 'var(--ink-secondary)' }}>
                  Moyen de règlement souhaité
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'ESPECES', label: 'Espèces', sub: 'Sur place / Livr.', logo: <CashFcfaLogo size="md" /> },
                      { id: 'ORANGE_MONEY', label: 'Orange Money', sub: 'Code marchand', logo: <OrangeMoneyLogo size="md" /> },
                      { id: 'MTN_MOMO', label: 'MTN MoMo', sub: 'Mobile Money', logo: <MtnMomoLogo size="md" /> },
                    ] as const
                  ).map((m) => {
                    const active = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        style={{
                          backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-subtle)',
                          borderColor: active ? 'var(--accent)' : 'var(--border-hairline)',
                          color: active ? 'var(--ink-primary)' : 'var(--ink-secondary)',
                        }}
                        className="p-2.5 rounded-xl border flex flex-col items-center text-center gap-1 cursor-pointer transition-colors"
                      >
                        {m.logo}
                        <div className="text-[12px] font-semibold leading-tight mt-0.5">{m.label}</div>
                        <div className="text-[10px] opacity-75">{m.sub}</div>
                      </button>
                    );
                  })}
                </div>

                {paymentMethod !== 'ESPECES' && (
                  <div
                    className="p-3 rounded-xl border flex items-center justify-between gap-2 text-[12px]"
                    style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}
                  >
                    <div className="min-w-0">
                      <div className="font-medium">
                        {paymentMethod === 'ORANGE_MONEY' ? 'Marchand Orange Money' : 'Numéro MTN MoMo'}
                      </div>
                      <div className="font-mono text-[11.5px] truncate" style={{ color: 'var(--ink-muted)' }}>
                        {paymentMethod === 'ORANGE_MONEY'
                          ? state.settings.orangeMoneyMerchant
                          : state.settings.mtnMomoMerchant}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyMerchant(
                          paymentMethod === 'ORANGE_MONEY'
                            ? state.settings.orangeMoneyMerchant
                            : state.settings.mtnMomoMerchant
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg border text-[11.5px] font-medium flex items-center gap-1 shrink-0 cursor-pointer"
                      style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-surface)' }}
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCode ? 'Copié' : 'Copier'}
                    </button>
                  </div>
                )}
              </div>

              {/* General note with live French spellcheck & red underline */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium block" style={{ color: 'var(--ink-secondary)' }}>
                  Note générale (optionnel — correction orthographique active)
                </label>
                <SpellcheckTextarea
                  rows={2}
                  value={orderNotes}
                  onChange={setOrderNotes}
                  placeholder="Ex: Appeler en arrivant au portail, sans piment..."
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderColor: 'var(--border-hairline)',
                    color: 'var(--ink-primary)',
                  }}
                />
              </div>
            </div>

            {/* Sticky Confirm CTA */}
            <div className="p-4 border-t shrink-0 space-y-2" style={{ borderColor: 'var(--border-hairline)' }}>
              <div className="flex justify-between text-[13px] px-1">
                <span style={{ color: 'var(--ink-muted)' }}>Total à régler</span>
                <span className="font-semibold text-[15px] tabular-nums">{formatFCFA(total)}</span>
              </div>
              <button
                type="submit"
                style={{ backgroundColor: 'var(--accent)' }}
                className="w-full h-12 rounded-xl text-white font-semibold text-[14px] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.985] transition-transform"
              >
                <Check className="w-4 h-4" />
                <span>Confirmer la commande · {formatFCFA(total)}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
