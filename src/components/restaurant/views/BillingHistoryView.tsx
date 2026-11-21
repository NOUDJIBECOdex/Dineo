import { CheckCircle2, FileText, Printer, Receipt } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useErp } from '../../../store/erp.context';
import type { ErpOrder, OrderChannel, PaymentMethod, PaymentStatus } from '../../../types/erp';
import { formatFCFA } from '../../../utils/currency';
import { InvoiceA4Modal, Receipt80mmModal } from '../print/PrintModals';
import {
  Btn,
  DialogModal,
  EmptyState,
  Field,
  FilterTabs,
  KpiCard,
  PageHeader,
  SearchInput,
  StatusPill,
  Surface,
  channelLabel,
  formatShortDateTime,
  inputBaseClass,
  inputBaseStyle,
  kitchenStatusMeta,
  paymentMethodLabel,
  paymentStatusMeta,
} from '../ui/Primitives';

interface BillingHistoryViewProps {
  mode: 'billing' | 'history';
}

export const BillingHistoryView: React.FC<BillingHistoryViewProps> = ({ mode }) => {
  const { state, recordOrderPayment } = useErp();

  const [search, setSearch] = useState('');
  const [payFilter, setPayFilter] = useState<'ALL' | PaymentStatus>(mode === 'billing' ? 'ALL' : 'ALL');
  const [channelFilter, setChannelFilter] = useState<'ALL' | OrderChannel>('ALL');

  // Encaissement modal
  const [collectOrder, setCollectOrder] = useState<ErpOrder | null>(null);
  const [collectAmount, setCollectAmount] = useState<number>(0);
  const [collectMethod, setCollectMethod] = useState<PaymentMethod>('ESPECES');
  const [collectNote, setCollectNote] = useState('');

  // Print previews
  const [receiptOrder, setReceiptOrder] = useState<ErpOrder | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<ErpOrder | null>(null);

  const openCollectModal = (order: ErpOrder) => {
    setCollectOrder(order);
    setCollectAmount(Math.max(0, order.total - order.amountPaid));
    setCollectMethod(order.paymentMethod || 'ESPECES');
    setCollectNote('');
  };

  const handleConfirmCollect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectOrder || collectAmount <= 0) return;
    recordOrderPayment(collectOrder.id, collectAmount, collectMethod, collectNote.trim() || undefined);
    // Re-read updated representation for instant receipt if desired
    const updatedOrder: ErpOrder = {
      ...collectOrder,
      amountPaid: Math.min(collectOrder.total, collectOrder.amountPaid + collectAmount),
      paymentStatus:
        collectOrder.amountPaid + collectAmount >= collectOrder.total ? 'PAYE' : 'PARTIEL',
      paymentMethod: collectMethod,
    };
    setCollectOrder(null);
    setReceiptOrder(updatedOrder);
  };

  const filteredOrders = useMemo(() => {
    return state.orders.filter((o) => {
      if (payFilter !== 'ALL' && o.paymentStatus !== payFilter) return false;
      if (channelFilter !== 'ALL' && o.channel !== channelFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          (o.tableNumber && o.tableNumber.toLowerCase().includes(q)) ||
          (o.deliveryNeighborhood && o.deliveryNeighborhood.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [state.orders, payFilter, channelFilter, search]);

  const stats = useMemo(() => {
    const totalBilled = state.orders.reduce((s, o) => s + o.total, 0);
    const totalPaid = state.orders.reduce((s, o) => s + o.amountPaid, 0);
    const unpaidCount = state.orders.filter((o) => o.paymentStatus !== 'PAYE').length;
    return { totalBilled, totalPaid, pendingAmount: Math.max(0, totalBilled - totalPaid), unpaidCount };
  }, [state.orders]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={mode === 'billing' ? 'Facturation & Encaissements' : 'Historique des ventes'}
        description={
          mode === 'billing'
            ? 'Encaissez les commandes en attente et imprimez vos reçus 80 mm ou factures A4.'
            : 'Consultez, filtrez et réimprimez l’ensemble des commandes passées au restaurant.'
        }
      />

      {mode === 'billing' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard label="Total facturé" value={formatFCFA(stats.totalBilled)} helper={`${state.orders.length} factures`} />
          <KpiCard label="Déjà encaissé" value={formatFCFA(stats.totalPaid)} tone="ok" helper="Espèces, Orange Money & MoMo" />
          <KpiCard
            label="Reste à encaisser"
            value={formatFCFA(stats.pendingAmount)}
            tone={stats.pendingAmount > 0 ? 'warn' : 'ok'}
            helper={`${stats.unpaidCount} facture(s) non soldée(s)`}
          />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterTabs
            activeId={payFilter}
            onChange={(id) => setPayFilter(id as typeof payFilter)}
            tabs={[
              { id: 'ALL', label: 'Toutes', count: state.orders.length },
              { id: 'IMPAYE', label: 'Non payées', count: state.orders.filter((o) => o.paymentStatus === 'IMPAYE').length },
              { id: 'PARTIEL', label: 'Partielles', count: state.orders.filter((o) => o.paymentStatus === 'PARTIEL').length },
              { id: 'PAYE', label: 'Payées', count: state.orders.filter((o) => o.paymentStatus === 'PAYE').length },
            ]}
          />

          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value as typeof channelFilter)}
            style={inputBaseStyle}
            className="h-9 px-3 rounded-lg border text-[12.5px] focus:outline-none"
          >
            <option value="ALL">Tous les canaux</option>
            <option value="SUR_PLACE">Sur place</option>
            <option value="EMPORTER">À emporter</option>
            <option value="LIVRAISON">Livraison</option>
          </select>
        </div>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="N° commande, client, table, quartier..."
          className="w-full lg:w-72"
        />
      </div>

      {/* Table */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-5 h-5" />}
          title="Aucune facture trouvée"
          description="Ajustez vos filtres ou effectuez une nouvelle vente en Caisse (POS)."
        />
      ) : (
        <Surface padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr
                  className="border-b text-[11px] uppercase tracking-[0.05em]"
                  style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink-muted)', backgroundColor: 'var(--bg-subtle)' }}
                >
                  <th className="py-3 px-4 font-medium">N° & Date</th>
                  <th className="py-3 px-4 font-medium">Client & Canal</th>
                  <th className="py-3 px-4 font-medium">Cuisine</th>
                  <th className="py-3 px-4 font-medium">Statut Paiement</th>
                  <th className="py-3 px-4 font-medium text-right">Total / Payé</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
                {filteredOrders.map((ord) => {
                  const pMeta = paymentStatusMeta(ord.paymentStatus);
                  const kMeta = kitchenStatusMeta(ord.kitchenStatus);
                  const rest = Math.max(0, ord.total - ord.amountPaid);

                  return (
                    <tr key={ord.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-semibold text-[12.5px]">{ord.orderNumber}</div>
                        <div className="text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                          {formatShortDateTime(ord.createdAt)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium">{ord.customerName}</div>
                        <div className="text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                          {channelLabel(ord.channel)}
                          {ord.tableNumber ? ` · ${ord.tableNumber}` : ''}
                          {ord.deliveryNeighborhood ? ` · ${ord.deliveryNeighborhood}` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusPill tone={kMeta.tone}>{kMeta.label}</StatusPill>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col items-start gap-1">
                          <StatusPill tone={pMeta.tone}>{pMeta.label}</StatusPill>
                          <span className="text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                            {paymentMethodLabel(ord.paymentMethod)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums">
                        <div className="font-semibold">{formatFCFA(ord.total)}</div>
                        {rest > 0 ? (
                          <div className="text-[11.5px]" style={{ color: 'var(--warn-text)' }}>
                            Reste {formatFCFA(rest)}
                          </div>
                        ) : (
                          <div className="text-[11.5px]" style={{ color: 'var(--ok-text)' }}>
                            Soldé
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {ord.paymentStatus !== 'PAYE' && (
                            <Btn
                              variant="accent"
                              size="xs"
                              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                              onClick={() => openCollectModal(ord)}
                            >
                              Encaisser
                            </Btn>
                          )}
                          <Btn
                            variant="secondary"
                            size="xs"
                            leftIcon={<Printer className="w-3.5 h-3.5" />}
                            onClick={() => setReceiptOrder(ord)}
                            title="Ticket 80 mm"
                          >
                            80mm
                          </Btn>
                          <Btn
                            variant="secondary"
                            size="xs"
                            leftIcon={<FileText className="w-3.5 h-3.5" />}
                            onClick={() => setInvoiceOrder(ord)}
                            title="Facture A4"
                          >
                            A4
                          </Btn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Surface>
      )}

      {/* Encaisser Modal */}
      <DialogModal
        isOpen={Boolean(collectOrder)}
        onClose={() => setCollectOrder(null)}
        title={`Encaisser — ${collectOrder?.orderNumber || ''}`}
        subtitle={collectOrder ? `Client : ${collectOrder.customerName} · Reste à payer : ${formatFCFA(Math.max(0, collectOrder.total - collectOrder.amountPaid))}` : ''}
        maxWidth="sm"
      >
        {collectOrder && (
          <form onSubmit={handleConfirmCollect} className="space-y-4">
            <Field label="Montant encaissé (FCFA)" required>
              <input
                type="number"
                required
                min={1}
                max={Math.max(1, collectOrder.total - collectOrder.amountPaid)}
                value={collectAmount}
                onChange={(e) => setCollectAmount(Number(e.target.value))}
                style={inputBaseStyle}
                className={`${inputBaseClass} tabular-nums font-semibold`}
              />
            </Field>
            <Field label="Moyen de paiement">
              <div className="grid grid-cols-3 gap-1.5">
                {(['ESPECES', 'ORANGE_MONEY', 'MTN_MOMO'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setCollectMethod(m)}
                    style={{
                      backgroundColor: collectMethod === m ? 'var(--ink-primary)' : 'var(--bg-surface)',
                      color: collectMethod === m ? 'var(--ink-inverse)' : 'var(--ink-secondary)',
                      borderColor: collectMethod === m ? 'transparent' : 'var(--border-hairline)',
                    }}
                    className="h-9 rounded-lg border text-[12px] font-medium cursor-pointer"
                  >
                    {paymentMethodLabel(m)}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Référence / Note (optionnel)">
              <input
                type="text"
                value={collectNote}
                onChange={(e) => setCollectNote(e.target.value)}
                placeholder="Ex: Réf transaction Orange Money..."
                style={inputBaseStyle}
                className={inputBaseClass}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Btn type="button" variant="secondary" onClick={() => setCollectOrder(null)}>
                Annuler
              </Btn>
              <Btn type="submit" variant="accent">
                Confirmer l’encaissement
              </Btn>
            </div>
          </form>
        )}
      </DialogModal>

      <Receipt80mmModal order={receiptOrder} settings={state.settings} onClose={() => setReceiptOrder(null)} />
      <InvoiceA4Modal order={invoiceOrder} settings={state.settings} onClose={() => setInvoiceOrder(null)} />
    </div>
  );
};
