import {
  AlertTriangle,
  Bike,
  Camera,
  Check,
  CheckCircle2,
  ChefHat,
  Clock,
  KeyRound,
  MapPin,
  Phone,
  Radio,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Utensils,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { useErp } from '../../../store/erp.context';
import type { ErpOrder } from '../../../types/erp';
import { formatFCFA } from '../../../utils/currency';
import { compressAndWatermarkProofPhoto } from '../../../utils/image';
import { PaymentMethodMark } from '../../common/PaymentBrandLogos';
import { SpellcheckTextarea } from '../../common/SpellcheckTextarea';
import {
  StatusPill,
  channelLabel,
  formatShortDateTime,
  paymentStatusMeta,
} from '../../restaurant/ui/Primitives';

interface ClientTrackingTabProps {
  trackedOrderIds: string[];
  activeOrderId: string | null;
  onSelectOrder: (id: string) => void;
  onGoToMenu: () => void;
  onOpenBillSheet?: () => void;
}

export const ClientTrackingTab: React.FC<ClientTrackingTabProps> = ({
  trackedOrderIds,
  activeOrderId,
  onSelectOrder,
  onGoToMenu,
  onOpenBillSheet,
}) => {
  const { state, confirmClientDeliveryReceipt } = useErp();

  // Client delivery receipt confirmation state
  const [confirmMode, setConfirmMode] = useState<'RECEIVED_OK' | 'ISSUE_REPORTED'>('RECEIVED_OK');
  const [rating, setRating] = useState<number>(5);
  const [clientPhoto, setClientPhoto] = useState<string>('');
  const [clientComment, setClientComment] = useState<string>('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const clientCamRef = useRef<HTMLInputElement | null>(null);

  // Retrieve live synced orders from ErpState
  const myOrders: ErpOrder[] = trackedOrderIds
    .map((id) => state.orders.find((o) => o.id === id))
    .filter((o): o is ErpOrder => Boolean(o));

  const currentOrder = myOrders.find((o) => o.id === activeOrderId) || myOrders[0] || null;

  if (!currentOrder) {
    return (
      <div className="px-4 py-12 text-center space-y-4">
        <div
          className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center border"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)', color: 'var(--ink-muted)' }}
        >
          <Clock className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-[16px] font-semibold">Aucune commande en cours</h2>
          <p className="text-[13px] max-w-xs mx-auto" style={{ color: 'var(--ink-muted)' }}>
            Passez votre commande depuis la carte pour suivre en direct sa préparation en cuisine et sa livraison.
          </p>
        </div>
        <button
          type="button"
          onClick={onGoToMenu}
          style={{ backgroundColor: 'var(--accent)' }}
          className="h-11 px-6 rounded-xl text-white text-[13.5px] font-semibold cursor-pointer active:scale-95 transition-transform"
        >
          Parcourir le menu
        </button>
      </div>
    );
  }

  const isDelivery = currentOrder.channel === 'LIVRAISON';
  const assignedDriver = currentOrder.driverId
    ? state.drivers.find((d) => d.id === currentOrder.driverId)
    : undefined;

  let stepIndex = 0;
  if (currentOrder.kitchenStatus === 'NOUVELLE') stepIndex = 0;
  else if (currentOrder.kitchenStatus === 'EN_PREPARATION') stepIndex = 1;
  else if (currentOrder.kitchenStatus === 'PRETE') stepIndex = 2;
  else if (currentOrder.kitchenStatus === 'SERVIE') stepIndex = isDelivery ? 4 : 3;

  if (isDelivery) {
    if (currentOrder.deliveryStatus === 'EN_ROUTE') stepIndex = 3;
    if (currentOrder.deliveryStatus === 'LIVREE') stepIndex = 4;
  }

  const steps = isDelivery
    ? [
      { label: 'Reçue', desc: 'Transmise au restaurant', icon: Radio },
      { label: 'En cuisine', desc: 'Vos plats sont en préparation', icon: ChefHat },
      { label: 'Prête', desc: 'Emballée, en attente du livreur', icon: ShoppingBag },
      { label: 'En route', desc: assignedDriver ? `Livreur : ${assignedDriver.name}` : 'En chemin vers votre quartier', icon: Bike },
      { label: 'Livrée', desc: 'Bon appétit !', icon: Sparkles },
    ]
    : [
      { label: 'Reçue', desc: 'Confirmée à la caisse', icon: Radio },
      { label: 'En cuisine', desc: 'Le chef prépare votre commande', icon: ChefHat },
      { label: 'Prête', desc: currentOrder.channel === 'SUR_PLACE' ? 'Arrive à votre table' : 'Prête au comptoir', icon: Utensils },
      { label: 'Servie', desc: 'Bon appétit ! Merci de votre visite', icon: Sparkles },
    ];

  const payMeta = paymentStatusMeta(currentOrder.paymentStatus);

  const handleCaptureClientPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoBusy(true);
    try {
      const nowLabel = new Date().toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const stamped = await compressAndWatermarkProofPhoto(
        file,
        `Réception Client · ${currentOrder.orderNumber}`,
        `${nowLabel} · ${currentOrder.customerName}`
      );
      setClientPhoto(stamped);
    } catch {
      // ignore
    } finally {
      setPhotoBusy(false);
      e.target.value = '';
    }
  };

  const handleSubmitClientConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    confirmClientDeliveryReceipt({
      orderId: currentOrder.id,
      status: confirmMode,
      rating: confirmMode === 'RECEIVED_OK' ? rating : undefined,
      photoDataUrl: clientPhoto || undefined,
      comment: clientComment.trim() || undefined,
    });
    setClientPhoto('');
    setClientComment('');
  };

  return (
    <div className="px-4 py-4 space-y-4 pb-28 md:pb-8">
      {/* Order switcher if client placed multiple orders */}
      {myOrders.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {myOrders.map((o) => {
            const active = o.id === currentOrder.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => onSelectOrder(o.id)}
                style={{
                  backgroundColor: active ? 'var(--ink-primary)' : 'var(--bg-surface)',
                  color: active ? 'var(--ink-inverse)' : 'var(--ink-secondary)',
                  borderColor: active ? 'transparent' : 'var(--border-hairline)',
                }}
                className="px-3 py-1.5 rounded-full border text-[12px] font-mono font-medium shrink-0 cursor-pointer"
              >
                {o.orderNumber}
              </button>
            );
          })}
        </div>
      )}

      {/* SECRET 4-DIGIT DELIVERY PIN CARD (Visible ONLY to Client while delivery is active) */}
      {isDelivery &&
        currentOrder.deliveryCode &&
        currentOrder.deliveryStatus !== 'LIVREE' &&
        currentOrder.kitchenStatus !== 'ANNULEE' && (
          <div
            style={{
              backgroundColor: 'var(--accent-soft)',
              borderColor: 'var(--accent-border)',
            }}
            className="rounded-2xl border p-4 flex items-center justify-between gap-3"
          >
            <div className="space-y-0.5 min-w-0">
              <div className="text-[12px] font-semibold flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
                <KeyRound className="w-4 h-4 shrink-0" />
                <span>Code secret de remise</span>
              </div>
              <p className="text-[11.5px] leading-snug" style={{ color: 'var(--ink-secondary)' }}>
                Ne communiquez ce code au livreur qu’au moment où vous recevez votre colis en main propre.
              </p>
            </div>
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--accent-border)',
                color: 'var(--ink-primary)',
              }}
              className="px-3.5 py-2 rounded-xl border font-mono text-[20px] font-bold tracking-[0.2em] shrink-0 tabular-nums"
            >
              {currentOrder.deliveryCode}
            </div>
          </div>
        )}

      {/* Live Status Hero Card */}
      <div
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
        className="rounded-2xl border p-5 space-y-5 shadow-[0_1px_2px_rgba(16,16,14,0.03)]"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-medium" style={{ color: 'var(--ok-text)' }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--ok-dot)' }} />
              Suivi en direct · {channelLabel(currentOrder.channel)}
              {currentOrder.tableNumber ? ` (${currentOrder.tableNumber})` : ''}
            </div>
            <h2 className="text-[20px] font-semibold tracking-[-0.02em] mt-1">
              {currentOrder.kitchenStatus === 'ANNULEE'
                ? 'Commande annulée'
                : steps[Math.min(stepIndex, steps.length - 1)].label}
            </h2>
            <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>
              {currentOrder.kitchenStatus === 'ANNULEE'
                ? 'Contactez le restaurant pour plus d’informations.'
                : steps[Math.min(stepIndex, steps.length - 1)].desc}
            </p>
          </div>
          <div className="text-right">
            <span className="font-mono text-[12px] font-semibold block">{currentOrder.orderNumber}</span>
            <span className="text-[11px]" style={{ color: 'var(--ink-muted)' }}>
              {formatShortDateTime(currentOrder.createdAt)}
            </span>
          </div>
        </div>

        {/* Clean Vertical Progress Timeline */}
        {currentOrder.kitchenStatus !== 'ANNULEE' && (
          <div className="space-y-3.5 pt-1">
            {steps.map((st, idx) => {
              const done = idx < stepIndex;
              const current = idx === stepIndex;
              const Icon = st.icon;
              return (
                <div key={st.label} className="flex items-start gap-3 relative">
                  {idx < steps.length - 1 && (
                    <span
                      className="absolute left-[15px] top-8 bottom-[-14px] w-[1.5px]"
                      style={{ backgroundColor: done ? 'var(--accent)' : 'var(--border-hairline)' }}
                    />
                  )}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-colors"
                    style={{
                      backgroundColor: done || current ? 'var(--accent)' : 'var(--bg-subtle)',
                      borderColor: done || current ? 'var(--accent)' : 'var(--border-hairline)',
                      color: done || current ? '#FFFFFF' : 'var(--ink-muted)',
                    }}
                  >
                    {done ? <Check className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <div className="pt-1 flex-1 min-w-0">
                    <div
                      className="text-[13.5px] leading-tight"
                      style={{
                        color: done || current ? 'var(--ink-primary)' : 'var(--ink-muted)',
                        fontWeight: current ? 600 : 500,
                      }}
                    >
                      {st.label}
                    </div>
                    <div className="text-[12px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                      {st.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PROOF OF DELIVERY PHOTO + CLIENT CONFIRMATION CARD (When Delivered) */}
      {isDelivery && currentOrder.deliveryStatus === 'LIVREE' && (
        <div
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
          className="rounded-2xl border p-4 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[13.5px] font-semibold">
              <ShieldCheck className="w-4 h-4" style={{ color: 'var(--ok-dot)' }} />
              <span>Preuve & Confirmation de réception</span>
            </div>
            {currentOrder.deliveryProof?.verifiedByPin && (
              <StatusPill tone="ok">PIN vérifié</StatusPill>
            )}
          </div>

          {/* Driver's timestamped photo proof */}
          {currentOrder.deliveryProof?.photoDataUrl && (
            <div className="space-y-1.5">
              <div className="text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                Photo de remise déposée par {currentOrder.deliveryProof.capturedBy} :
              </div>
              <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-hairline)' }}>
                <img
                  src={currentOrder.deliveryProof.photoDataUrl}
                  alt="Preuve de livraison"
                  className="w-full max-h-52 object-cover"
                />
              </div>
            </div>
          )}

          {/* Client confirmation form OR confirmed summary */}
          {currentOrder.clientConfirmation ? (
            <div
              className="p-3.5 rounded-xl border space-y-2"
              style={{
                backgroundColor:
                  currentOrder.clientConfirmation.status === 'RECEIVED_OK' ? 'var(--ok-bg)' : 'var(--err-bg)',
                borderColor:
                  currentOrder.clientConfirmation.status === 'RECEIVED_OK' ? 'var(--ok-border)' : 'var(--err-border)',
              }}
            >
              <div
                className="text-[13px] font-semibold flex items-center gap-1.5"
                style={{
                  color:
                    currentOrder.clientConfirmation.status === 'RECEIVED_OK' ? 'var(--ok-text)' : 'var(--err-text)',
                }}
              >
                {currentOrder.clientConfirmation.status === 'RECEIVED_OK' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Réception confirmée — Merci !{' '}
                    {currentOrder.clientConfirmation.rating ? `(${currentOrder.clientConfirmation.rating}/5 ★)` : ''}
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    Incident signalé au restaurant — notre équipe vous rappelle.
                  </>
                )}
              </div>
              {currentOrder.clientConfirmation.comment && (
                <p className="text-[12px]" style={{ color: 'var(--ink-primary)' }}>
                  « {currentOrder.clientConfirmation.comment} »
                </p>
              )}
              {currentOrder.clientConfirmation.photoDataUrl && (
                <img
                  src={currentOrder.clientConfirmation.photoDataUrl}
                  alt="Photo confirmation client"
                  className="w-full max-h-40 object-cover rounded-lg border"
                  style={{ borderColor: 'var(--border-hairline)' }}
                />
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmitClientConfirmation} className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
              <div className="text-[12.5px] font-medium">Avez-vous bien reçu votre commande conforme ?</div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmMode('RECEIVED_OK')}
                  style={{
                    backgroundColor: confirmMode === 'RECEIVED_OK' ? 'var(--ok-bg)' : 'var(--bg-subtle)',
                    borderColor: confirmMode === 'RECEIVED_OK' ? 'var(--ok-border)' : 'var(--border-hairline)',
                    color: confirmMode === 'RECEIVED_OK' ? 'var(--ok-text)' : 'var(--ink-secondary)',
                  }}
                  className="h-10 rounded-xl border text-[12.5px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Oui, bien reçu
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmMode('ISSUE_REPORTED')}
                  style={{
                    backgroundColor: confirmMode === 'ISSUE_REPORTED' ? 'var(--err-bg)' : 'var(--bg-subtle)',
                    borderColor: confirmMode === 'ISSUE_REPORTED' ? 'var(--err-border)' : 'var(--border-hairline)',
                    color: confirmMode === 'ISSUE_REPORTED' ? 'var(--err-text)' : 'var(--ink-secondary)',
                  }}
                  className="h-10 rounded-xl border text-[12.5px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Signaler souci
                </button>
              </div>

              {confirmMode === 'RECEIVED_OK' && (
                <div className="flex items-center justify-between px-1">
                  <span className="text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                    Noter la livraison :
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRating(s)}
                        className="p-1 cursor-pointer"
                        aria-label={`${s} étoiles`}
                      >
                        <Star
                          className="w-5 h-5"
                          fill={s <= rating ? '#D97706' : 'none'}
                          stroke={s <= rating ? '#D97706' : 'var(--ink-muted)'}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Optional Client Photo Capture */}
              <div className="space-y-1.5">
                <input
                  ref={clientCamRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleCaptureClientPhoto}
                />
                {clientPhoto ? (
                  <div className="relative rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-hairline)' }}>
                    <img src={clientPhoto} alt="Photo client" className="w-full max-h-40 object-cover" />
                    <button
                      type="button"
                      onClick={() => setClientPhoto('')}
                      className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/65 text-white text-[11px] cursor-pointer"
                    >
                      Retirer
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={photoBusy}
                    onClick={() => clientCamRef.current?.click()}
                    style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)', color: 'var(--ink-secondary)' }}
                    className="w-full h-10 rounded-xl border border-dashed text-[12px] font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    {photoBusy ? 'Traitement photo...' : 'Joindre une photo de mon colis (optionnel)'}
                  </button>
                )}
              </div>

              <SpellcheckTextarea
                rows={2}
                value={clientComment}
                onChange={setClientComment}
                placeholder={
                  confirmMode === 'RECEIVED_OK'
                    ? 'Un mot pour l’équipe ou le livreur (optionnel)...'
                    : 'Décrivez le problème constaté (plat manquant, colis abîmé...)...'
                }
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border-hairline)',
                  color: 'var(--ink-primary)',
                }}
              />

              <button
                type="submit"
                style={{
                  backgroundColor: confirmMode === 'RECEIVED_OK' ? 'var(--ok-dot)' : 'var(--err-dot)',
                  color: '#FFFFFF',
                }}
                className="w-full h-11 rounded-xl text-[13px] font-semibold cursor-pointer active:scale-[0.985] transition-transform"
              >
                {confirmMode === 'RECEIVED_OK' ? 'Confirmer la réception' : 'Envoyer le signalement au restaurant'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Assigned Driver Card (if delivery) */}
      {isDelivery && (
        <div
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
          className="rounded-2xl border p-4 space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
              Livraison Maroua
            </span>
            <StatusPill tone={assignedDriver ? 'ok' : 'warn'}>
              {assignedDriver ? 'Livreur assigné' : 'Attribution en cours'}
            </StatusPill>
          </div>
          <div className="flex items-start gap-2 text-[13px]">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
            <div>
              <span className="font-semibold">{currentOrder.deliveryNeighborhood}</span>
              {currentOrder.deliveryAddress && (
                <span style={{ color: 'var(--ink-secondary)' }}> — {currentOrder.deliveryAddress}</span>
              )}
            </div>
          </div>
          {assignedDriver && (
            <div
              className="p-3 rounded-xl border flex items-center justify-between gap-2"
              style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}
            >
              <div>
                <div className="text-[13px] font-semibold">{assignedDriver.name}</div>
                <div className="text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                  {assignedDriver.vehicleInfo}
                </div>
              </div>
              <a
                href={`tel:${assignedDriver.phone}`}
                style={{ backgroundColor: 'var(--ink-primary)', color: 'var(--ink-inverse)' }}
                className="h-9 px-3 rounded-lg text-[12px] font-medium inline-flex items-center gap-1.5 shrink-0"
              >
                <Phone className="w-3.5 h-3.5" />
                Appeler
              </a>
            </div>
          )}
        </div>
      )}

      {/* Order Receipt Summary */}
      <div
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
        className="rounded-2xl border p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-[13.5px] font-semibold">Détail de votre commande</span>
          <StatusPill tone={payMeta.tone}>{payMeta.label}</StatusPill>
        </div>

        <div className="divide-y text-[13px]" style={{ borderColor: 'var(--border-hairline)' }}>
          {currentOrder.items.map((item) => (
            <div key={item.id} className="py-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="font-mono font-semibold mr-1.5" style={{ color: 'var(--accent)' }}>
                  {item.quantity}×
                </span>
                <span>{item.name}</span>
                {item.notes && (
                  <div className="text-[11.5px] italic mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                    {item.notes}
                  </div>
                )}
              </div>
              <span className="font-medium tabular-nums shrink-0">{formatFCFA(item.totalPrice)}</span>
            </div>
          ))}
        </div>

        <div className="pt-2.5 border-t space-y-1 text-[13px]" style={{ borderColor: 'var(--border-hairline)' }}>
          {currentOrder.deliveryFee > 0 && (
            <div className="flex justify-between" style={{ color: 'var(--ink-muted)' }}>
              <span>Livraison</span>
              <span className="tabular-nums">{formatFCFA(currentOrder.deliveryFee)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-[15px]">
            <span>Total</span>
            <span className="tabular-nums">{formatFCFA(currentOrder.total)}</span>
          </div>
          <div className="flex items-center justify-between text-[12px] pt-1" style={{ color: 'var(--ink-muted)' }}>
            <span>Règlement choisi</span>
            <PaymentMethodMark method={currentOrder.paymentMethod} size="xs" showLabel />
          </div>
        </div>

        {currentOrder.channel === 'SUR_PLACE' && currentOrder.paymentStatus !== 'PAYE' && onOpenBillSheet && (
          <button
            type="button"
            onClick={onOpenBillSheet}
            style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
            className="w-full h-11 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.985] transition-transform"
          >
            <Receipt className="w-4 h-4" />
            Demander l’addition ({formatFCFA(Math.max(0, currentOrder.total - currentOrder.amountPaid))})
          </button>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2.5">
        <a
          href={`tel:${state.settings.phone}`}
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)', color: 'var(--ink-primary)' }}
          className="h-11 rounded-xl border text-[13px] font-medium flex items-center justify-center gap-2"
        >
          <Phone className="w-4 h-4" />
          Appeler resto
        </a>
        <button
          type="button"
          onClick={onGoToMenu}
          style={{ backgroundColor: 'var(--ink-primary)', color: 'var(--ink-inverse)' }}
          className="h-11 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2 cursor-pointer"
        >
          <Utensils className="w-4 h-4" />
          Recommander
        </button>
      </div>
    </div>
  );
};
