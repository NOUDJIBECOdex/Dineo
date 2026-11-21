import {
  Bike,
  Camera,
  Check,
  ChefHat,
  KeyRound,
  Lock,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  Truck,
  UserCheck,
  UserMinus,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useErp } from '../../../store/erp.context';
import type { DeliveryStatus, ErpOrder } from '../../../types/erp';
import { formatFCFA } from '../../../utils/currency';
import {
  Btn,
  DialogModal,
  EmptyState,
  Field,
  FilterTabs,
  KpiCard,
  PageHeader,
  StatusPill,
  Surface,
  formatShortDateTime,
  inputBaseClass,
  inputBaseStyle,
  kitchenStatusMeta,
  paymentStatusMeta,
} from '../ui/Primitives';
import type { PillTone } from '../ui/Primitives';

const deliveryMeta = (s?: DeliveryStatus): { label: string; tone: PillTone } => {
  switch (s) {
    case 'ASSIGNEE':
      return { label: 'Assignée', tone: 'neutral' };
    case 'EN_ROUTE':
      return { label: 'En route', tone: 'accent' };
    case 'LIVREE':
      return { label: 'Livrée', tone: 'ok' };
    default:
      return { label: 'En attente', tone: 'warn' };
  }
};

export const DeliveriesView: React.FC = () => {
  const { state, assignDriver, updateDeliveryStatus, addDriver, toggleDriverAvailability } = useErp();

  const [tab, setTab] = useState<'ORDERS' | 'DRIVERS'>('ORDERS');
  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [proofViewOrder, setProofViewOrder] = useState<ErpOrder | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+237 6 ');
  const [vehicleInfo, setVehicleInfo] = useState('Moto Sanili 125 · EN-');
  const [zone, setZone] = useState('Domayo · Maroua Centre');

  const deliveryOrders = useMemo(
    () => state.orders.filter((o) => o.channel === 'LIVRAISON'),
    [state.orders]
  );

  const pendingCount = deliveryOrders.filter((o) => o.deliveryStatus !== 'LIVREE').length;
  const deliveredCount = deliveryOrders.filter((o) => o.deliveryStatus === 'LIVREE').length;
  const availableDrivers = state.drivers.filter((d) => d.isAvailable).length;

  const handleAddDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addDriver({
      name: name.trim(),
      phone: phone.trim(),
      vehicleInfo: vehicleInfo.trim(),
      zone: zone.trim(),
      isAvailable: true,
    });
    setName('');
    setPhone('+237 6 ');
    setVehicleInfo('Moto Sanili 125 · EN-');
    setDriverModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Livraisons & Livreurs"
        description="Dispatching des commandes à domicile dans les quartiers de Maroua"
        actions={
          <div className="flex items-center gap-2">
            <FilterTabs
              activeId={tab}
              onChange={(id) => setTab(id as typeof tab)}
              tabs={[
                { id: 'ORDERS', label: 'Courses', count: deliveryOrders.length },
                { id: 'DRIVERS', label: 'Livreurs', count: state.drivers.length },
              ]}
            />
            <Btn variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setDriverModalOpen(true)}>
              Ajouter livreur
            </Btn>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Livraisons en cours" value={pendingCount} tone={pendingCount > 0 ? 'warn' : 'ok'} icon={<Truck className="w-4 h-4" />} />
        <KpiCard label="Livraisons terminées" value={deliveredCount} tone="ok" icon={<Check className="w-4 h-4" />} />
        <KpiCard
          label="Livreurs disponibles"
          value={`${availableDrivers} / ${state.drivers.length}`}
          icon={<Bike className="w-4 h-4" />}
        />
      </div>

      {tab === 'ORDERS' ? (
        deliveryOrders.length === 0 ? (
          <EmptyState
            icon={<Truck className="w-5 h-5" />}
            title="Aucune commande en livraison"
            description="Les commandes créées en mode Livraison depuis la Caisse POS apparaîtront ici pour assignation."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {deliveryOrders.map((ord) => {
              const dMeta = deliveryMeta(ord.deliveryStatus);
              const pMeta = paymentStatusMeta(ord.paymentStatus);
              const kMeta = kitchenStatusMeta(ord.kitchenStatus);
              const isKitchenReady = ord.kitchenStatus === 'PRETE' || ord.kitchenStatus === 'SERVIE';
              return (
                <Surface key={ord.id} className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono font-semibold text-[14px]">{ord.orderNumber}</span>
                        <StatusPill tone={kMeta.tone}>Cuisine : {kMeta.label}</StatusPill>
                        <StatusPill tone={dMeta.tone}>{dMeta.label}</StatusPill>
                        <StatusPill tone={pMeta.tone}>{pMeta.label}</StatusPill>
                      </div>
                      <div className="text-[12px] mt-1" style={{ color: 'var(--ink-muted)' }}>
                        {formatShortDateTime(ord.createdAt)} · {ord.items.length} article(s)
                      </div>
                    </div>
                    <div className="text-right tabular-nums">
                      <div className="font-semibold text-[15px]">{formatFCFA(ord.total)}</div>
                      <div className="text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                        dont {formatFCFA(ord.deliveryFee)} livr.
                      </div>
                    </div>
                  </div>

                  <div
                    className="p-3 rounded-lg border text-[12.5px] space-y-1"
                    style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}
                  >
                    <div className="font-medium flex items-center justify-between">
                      <span>{ord.customerName}</span>
                      {ord.customerPhone && (
                        <span className="text-[12px] font-mono flex items-center gap-1" style={{ color: 'var(--ink-muted)' }}>
                          <Phone className="w-3 h-3" />
                          {ord.customerPhone}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5" style={{ color: 'var(--ink-secondary)' }}>
                      <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
                      <span>
                        <strong>{ord.deliveryNeighborhood || 'Maroua'}</strong>
                        {ord.deliveryAddress ? ` — ${ord.deliveryAddress}` : ''}
                      </span>
                    </div>
                    {(ord.deliveryCode || ord.deliveryProof || ord.clientConfirmation) && (
                      <div className="pt-2 mt-1.5 border-t flex flex-wrap items-center justify-between gap-2 text-[11.5px]" style={{ borderColor: 'var(--border-hairline)' }}>
                        <div className="flex flex-wrap items-center gap-2">
                          {ord.deliveryCode && (
                            <span className="inline-flex items-center gap-1 font-mono font-semibold px-2 py-0.5 rounded bg-white/80 text-[#18181B] border border-[#E7E4DD]">
                              <KeyRound className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                              PIN : {ord.deliveryCode}
                            </span>
                          )}
                          {ord.deliveryProof && (
                            <StatusPill tone={ord.deliveryProof.verifiedByPin ? 'ok' : 'warn'}>
                              {ord.deliveryProof.verifiedByPin ? 'Photo + PIN OK' : 'Photo (Sans PIN)'}
                            </StatusPill>
                          )}
                          {ord.clientConfirmation && (
                            <StatusPill tone={ord.clientConfirmation.status === 'RECEIVED_OK' ? 'ok' : 'err'}>
                              {ord.clientConfirmation.status === 'RECEIVED_OK'
                                ? `Client OK${ord.clientConfirmation.rating ? ` (${ord.clientConfirmation.rating}★)` : ''}`
                                : 'Incident client'}
                            </StatusPill>
                          )}
                        </div>
                        {(ord.deliveryProof || ord.clientConfirmation) && (
                          <button
                            type="button"
                            onClick={() => setProofViewOrder(ord)}
                            className="inline-flex items-center gap-1 font-semibold hover:underline cursor-pointer"
                            style={{ color: 'var(--accent)' }}
                          >
                            <Camera className="w-3.5 h-3.5" />
                            Voir preuves
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Driver assignment & actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                      <select
                        value={ord.driverId || ''}
                        disabled={ord.deliveryStatus === 'LIVREE'}
                        onChange={(e) => assignDriver(ord.id, e.target.value || null)}
                        style={inputBaseStyle}
                        className={`${inputBaseClass} h-8 text-[12.5px]`}
                      >
                        <option value="">Assigner un livreur...</option>
                        {state.drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.isAvailable ? 'Dispo' : 'En course'})
                          </option>
                        ))}
                      </select>

                      {ord.driverId && ord.deliveryStatus !== 'LIVREE' && (
                        <Btn
                          variant="ghost"
                          size="xs"
                          onClick={() => assignDriver(ord.id, null)}
                          title="Désassigner ce livreur"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </Btn>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isKitchenReady && ord.deliveryStatus !== 'LIVREE' ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11.5px] font-medium"
                          style={{
                            borderColor: 'var(--border-hairline)',
                            backgroundColor: 'var(--bg-subtle)',
                            color: 'var(--ink-muted)',
                          }}
                          title="La cuisine doit d'abord marquer cette commande comme Prête dans Cuisine (KDS)"
                        >
                          <Lock className="w-3 h-3" />
                          <ChefHat className="w-3.5 h-3.5" />
                          En attente cuisine prête
                        </span>
                      ) : (
                        <>
                          {ord.driverId && ord.deliveryStatus === 'ASSIGNEE' && (
                            <Btn
                              variant="secondary"
                              size="sm"
                              onClick={() => updateDeliveryStatus(ord.id, 'EN_ROUTE')}
                            >
                              Départ course
                            </Btn>
                          )}
                          {ord.deliveryStatus !== 'LIVREE' && (
                            <Btn
                              variant="primary"
                              size="sm"
                              leftIcon={<Check className="w-3.5 h-3.5" />}
                              onClick={() => updateDeliveryStatus(ord.id, 'LIVREE')}
                            >
                              Marquer livrée
                            </Btn>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Surface>
              );
            })}
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {state.drivers.map((drv) => (
            <Surface key={drv.id} className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-[14.5px]">{drv.name}</div>
                  <div className="text-[12px] font-mono mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                    {drv.phone}
                  </div>
                </div>
                <StatusPill tone={drv.isAvailable ? 'ok' : 'warn'}>
                  {drv.isAvailable ? 'Disponible' : 'En course'}
                </StatusPill>
              </div>
              <div className="text-[12.5px] space-y-1" style={{ color: 'var(--ink-secondary)' }}>
                <div>Engin : {drv.vehicleInfo}</div>
                <div>Secteur : {drv.zone}</div>
                <div className="tabular-nums">Courses effectuées : <strong>{drv.deliveriesCompleted}</strong></div>
              </div>
              <div className="pt-2 border-t flex justify-end" style={{ borderColor: 'var(--border-hairline)' }}>
                <Btn
                  variant="secondary"
                  size="xs"
                  leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                  onClick={() => toggleDriverAvailability(drv.id)}
                >
                  {drv.isAvailable ? 'Marquer en course' : 'Marquer disponible'}
                </Btn>
              </div>
            </Surface>
          ))}
        </div>
      )}

      <DialogModal
        isOpen={driverModalOpen}
        onClose={() => setDriverModalOpen(false)}
        title="Ajouter un livreur"
        subtitle="Moto-livreur rattaché au restaurant à Maroua"
        maxWidth="sm"
      >
        <form onSubmit={handleAddDriver} className="space-y-3.5">
          <Field label="Nom complet" required>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Boubakari Issa"
              style={inputBaseStyle}
              className={inputBaseClass}
            />
          </Field>
          <Field label="Téléphone" required>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={inputBaseStyle}
              className={inputBaseClass}
            />
          </Field>
          <Field label="Moto / Immatriculation">
            <input
              type="text"
              value={vehicleInfo}
              onChange={(e) => setVehicleInfo(e.target.value)}
              style={inputBaseStyle}
              className={inputBaseClass}
            />
          </Field>
          <Field label="Quartiers couverts">
            <input
              type="text"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="Domayo · Pitoaré · Kakataré"
              style={inputBaseStyle}
              className={inputBaseClass}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Btn type="button" variant="secondary" onClick={() => setDriverModalOpen(false)}>
              Annuler
            </Btn>
            <Btn type="submit" variant="primary">
              Enregistrer
            </Btn>
          </div>
        </form>
      </DialogModal>
      <DialogModal
        isOpen={Boolean(proofViewOrder)}
        onClose={() => setProofViewOrder(null)}
        title={`Dossier Preuves Livraison — ${proofViewOrder?.orderNumber || ''}`}
        subtitle={proofViewOrder ? `${proofViewOrder.customerName} · ${proofViewOrder.deliveryNeighborhood || 'Maroua'}` : ''}
        maxWidth="lg"
      >
        {proofViewOrder && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Driver Proof */}
            <div className="p-3.5 rounded-xl border space-y-2.5" style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  Preuve Livreur
                </span>
                {proofViewOrder.deliveryProof && (
                  <StatusPill tone={proofViewOrder.deliveryProof.verifiedByPin ? 'ok' : 'warn'}>
                    {proofViewOrder.deliveryProof.verifiedByPin ? 'PIN vérifié' : 'Sans PIN'}
                  </StatusPill>
                )}
              </div>
              {proofViewOrder.deliveryProof?.photoDataUrl ? (
                <img
                  src={proofViewOrder.deliveryProof.photoDataUrl}
                  alt="Preuve photo livreur"
                  className="w-full rounded-lg border object-cover max-h-64"
                  style={{ borderColor: 'var(--border-hairline)' }}
                />
              ) : (
                <div className="py-10 text-center text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                  Aucune photo déposée par le livreur.
                </div>
              )}
              {proofViewOrder.deliveryProof && (
                <div className="text-[11.5px] space-y-0.5" style={{ color: 'var(--ink-muted)' }}>
                  <div>Par : <strong>{proofViewOrder.deliveryProof.capturedBy}</strong></div>
                  <div>Le : {formatShortDateTime(proofViewOrder.deliveryProof.capturedAt)}</div>
                  {proofViewOrder.deliveryProof.note && <div>Note : {proofViewOrder.deliveryProof.note}</div>}
                </div>
              )}
            </div>

            {/* Client Confirmation */}
            <div className="p-3.5 rounded-xl border space-y-2.5" style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-semibold">Confirmation Client</span>
                {proofViewOrder.clientConfirmation ? (
                  <StatusPill tone={proofViewOrder.clientConfirmation.status === 'RECEIVED_OK' ? 'ok' : 'err'}>
                    {proofViewOrder.clientConfirmation.status === 'RECEIVED_OK'
                      ? `Reçu${proofViewOrder.clientConfirmation.rating ? ` (${proofViewOrder.clientConfirmation.rating}/5 ★)` : ''}`
                      : 'Incident signalé'}
                  </StatusPill>
                ) : (
                  <StatusPill tone="neutral">En attente</StatusPill>
                )}
              </div>
              {proofViewOrder.clientConfirmation?.photoDataUrl ? (
                <img
                  src={proofViewOrder.clientConfirmation.photoDataUrl}
                  alt="Preuve photo client"
                  className="w-full rounded-lg border object-cover max-h-64"
                  style={{ borderColor: 'var(--border-hairline)' }}
                />
              ) : (
                <div className="py-10 text-center text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                  {proofViewOrder.clientConfirmation
                    ? 'Confirmée sans photo supplémentaire.'
                    : 'Le client n’a pas encore confirmé sur son téléphone.'}
                </div>
              )}
              {proofViewOrder.clientConfirmation && (
                <div className="text-[11.5px] space-y-0.5" style={{ color: 'var(--ink-muted)' }}>
                  <div>Le : {formatShortDateTime(proofViewOrder.clientConfirmation.confirmedAt)}</div>
                  {proofViewOrder.clientConfirmation.comment && (
                    <div style={{ color: 'var(--ink-primary)' }}>« {proofViewOrder.clientConfirmation.comment} »</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogModal>
    </div>
  );
};
