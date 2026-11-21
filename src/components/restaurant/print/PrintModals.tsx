import { Award, Copy, Check, Download, ExternalLink, Printer, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import React, { useEffect, useState } from 'react';
import type {
  Customer,
  DiningTable,
  ErpOrder,
  LoyaltyConfig,
  PurchaseOrder,
  RestaurantSettings,
  SalarySlip,
} from '../../../types/erp';
import { formatFCFA } from '../../../utils/currency';
import {
  Btn,
  DialogModal,
  RestaurantLogo,
  channelLabel,
  formatShortDateTime,
  inputBaseClass,
  inputBaseStyle,
  paymentMethodLabel,
} from '../ui/Primitives';

const triggerPrint = () => {
  window.print();
};

/** 1) Ticket Thermique 80mm */
export const Receipt80mmModal: React.FC<{
  order: ErpOrder | null;
  settings: RestaurantSettings;
  onClose: () => void;
}> = ({ order, settings, onClose }) => {
  if (!order) return null;
  const remaining = Math.max(0, order.total - order.amountPaid);

  return (
    <DialogModal
      isOpen={Boolean(order)}
      onClose={onClose}
      title={`Ticket 80 mm — ${order.orderNumber}`}
      subtitle="Format caisse thermique standard"
      maxWidth="sm"
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>
            Fermer
          </Btn>
          <Btn variant="primary" leftIcon={<Printer className="w-4 h-4" />} onClick={triggerPrint}>
            Imprimer (80 mm)
          </Btn>
        </>
      }
    >
      <div
        id="dineo-printable-area"
        className="mx-auto w-[300px] bg-white text-[#18181B] border border-dashed border-[#D6D2C8] rounded-lg p-5 font-mono text-[11.5px] leading-relaxed"
      >
        <div className="text-center border-b border-dashed border-[#D6D2C8] pb-3 mb-3 flex flex-col items-center">
          {settings.logoUrl && (
            <img
              src={settings.logoUrl}
              alt={settings.name}
              className="w-12 h-12 object-contain mb-2 rounded"
            />
          )}
          <div className="text-[14px] font-bold tracking-tight uppercase">{settings.name}</div>
          <div className="text-[10.5px] text-[#52525B]">{settings.address}</div>
          <div className="text-[10.5px] text-[#52525B]">
            {settings.city}, {settings.region}
          </div>
          <div className="text-[10.5px] text-[#52525B]">Tél : {settings.phone}</div>
        </div>

        <div className="space-y-0.5 border-b border-dashed border-[#D6D2C8] pb-2.5 mb-2.5 text-[11px]">
          <div className="flex justify-between">
            <span>N° Commande</span>
            <span className="font-semibold">{order.orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Date</span>
            <span>{formatShortDateTime(order.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span>Type</span>
            <span>
              {channelLabel(order.channel)}
              {order.tableNumber ? ` (${order.tableNumber})` : ''}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Client</span>
            <span className="truncate max-w-[160px] text-right">{order.customerName}</span>
          </div>
          {order.deliveryNeighborhood && (
            <div className="flex justify-between">
              <span>Quartier</span>
              <span>{order.deliveryNeighborhood}</span>
            </div>
          )}
        </div>

        <div className="border-b border-dashed border-[#D6D2C8] pb-2.5 mb-2.5 space-y-1.5">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between gap-2">
              <span className="flex-1">
                {item.quantity}x {item.name}
              </span>
              <span className="tabular-nums shrink-0">{formatFCFA(item.totalPrice)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-1 text-[11px] border-b border-dashed border-[#D6D2C8] pb-2.5 mb-3">
          <div className="flex justify-between">
            <span>Sous-total</span>
            <span className="tabular-nums">{formatFCFA(order.subtotal)}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between">
              <span>Remise</span>
              <span className="tabular-nums">-{formatFCFA(order.discountAmount)}</span>
            </div>
          )}
          {order.deliveryFee > 0 && (
            <div className="flex justify-between">
              <span>Livraison</span>
              <span className="tabular-nums">{formatFCFA(order.deliveryFee)}</span>
            </div>
          )}
          <div className="flex justify-between text-[13px] font-bold pt-1.5 border-t border-dashed border-[#D6D2C8]">
            <span>TOTAL</span>
            <span className="tabular-nums">{formatFCFA(order.total)}</span>
          </div>
          <div className="flex justify-between pt-1">
            <span>Payé ({paymentMethodLabel(order.paymentMethod)})</span>
            <span className="tabular-nums">{formatFCFA(order.amountPaid)}</span>
          </div>
          {remaining > 0 && (
            <div className="flex justify-between font-bold">
              <span>RESTE À PAYER</span>
              <span className="tabular-nums">{formatFCFA(remaining)}</span>
            </div>
          )}
        </div>

        <div className="text-center mb-3">
          <span className="inline-block px-3 py-0.5 border border-[#18181B] font-bold text-[11px] uppercase tracking-wider">
            {order.paymentStatus === 'PAYE'
              ? 'STATUT : PAYÉ'
              : order.paymentStatus === 'PARTIEL'
              ? 'STATUT : PAIEMENT PARTIEL'
              : 'STATUT : NON PAYÉ'}
          </span>
        </div>

        <div className="text-center text-[10px] text-[#52525B] space-y-0.5">
          <div>OM : {settings.orangeMoneyMerchant}</div>
          <div>MoMo : {settings.mtnMomoMerchant}</div>
          <div className="pt-2 italic">{settings.receiptFooter}</div>
        </div>
      </div>
    </DialogModal>
  );
};

/** 2) Facture A4 Officielle */
export const InvoiceA4Modal: React.FC<{
  order: ErpOrder | null;
  settings: RestaurantSettings;
  onClose: () => void;
}> = ({ order, settings, onClose }) => {
  if (!order) return null;
  const remaining = Math.max(0, order.total - order.amountPaid);

  return (
    <DialogModal
      isOpen={Boolean(order)}
      onClose={onClose}
      title={`Facture A4 — ${order.orderNumber}`}
      subtitle="Document commercial prêt à l’impression ou enregistrement PDF"
      maxWidth="xl"
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>
            Fermer
          </Btn>
          <Btn variant="primary" leftIcon={<Printer className="w-4 h-4" />} onClick={triggerPrint}>
            Imprimer / PDF (A4)
          </Btn>
        </>
      }
    >
      <div
        id="dineo-printable-area"
        className="bg-white text-[#18181B] border border-[#E7E4DD] rounded-lg p-7 space-y-6 text-[13px]"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E7E4DD] pb-5">
          <div>
            <div className="flex items-center gap-3">
              <RestaurantLogo logoUrl={settings.logoUrl} name={settings.name} size="lg" />
              <div>
                <h3 className="text-[17px] font-semibold tracking-tight">{settings.name}</h3>
                <p className="text-[11.5px] text-[#787770]">{settings.tagline}</p>
              </div>
            </div>
            <div className="mt-3 text-[12px] text-[#52525B] space-y-0.5">
              <div>{settings.address}</div>
              <div>
                {settings.city}, {settings.region}
              </div>
              <div>
                Tél : {settings.phone} · {settings.email}
              </div>
              <div>{settings.taxNumber}</div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[11px] uppercase tracking-widest text-[#787770] font-medium">Facture</div>
            <div className="text-[18px] font-semibold font-mono mt-0.5">{order.orderNumber}</div>
            <div className="text-[12px] text-[#52525B] mt-1">Émise le {formatShortDateTime(order.createdAt)}</div>
            <div className="mt-2 inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-[#D6D2C8]">
              {order.paymentStatus === 'PAYE'
                ? 'Réglée intégralement'
                : order.paymentStatus === 'PARTIEL'
                ? 'Paiement partiel'
                : 'En attente de règlement'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#FAF9F7] p-4 rounded-lg border border-[#EAE7E0]">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#787770] font-medium">Facturé à</div>
            <div className="font-semibold text-[14px] mt-1">{order.customerName}</div>
            {order.customerPhone && <div className="text-[12px] text-[#52525B]">{order.customerPhone}</div>}
            {order.deliveryAddress && (
              <div className="text-[12px] text-[#52525B]">
                {order.deliveryNeighborhood ? `${order.deliveryNeighborhood} — ` : ''}
                {order.deliveryAddress}
              </div>
            )}
          </div>
          <div className="sm:text-right">
            <div className="text-[11px] uppercase tracking-wider text-[#787770] font-medium">Détails du service</div>
            <div className="mt-1 text-[12.5px]">
              Canal : <strong>{channelLabel(order.channel)}</strong>
              {order.tableNumber ? ` (${order.tableNumber})` : ''}
            </div>
            <div className="text-[12px] text-[#52525B]">Mode : {paymentMethodLabel(order.paymentMethod)}</div>
            <div className="text-[12px] text-[#52525B]">Établie par : {order.createdBy}</div>
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E7E4DD] text-[11px] uppercase tracking-wider text-[#787770]">
              <th className="py-2.5 font-medium">Désignation</th>
              <th className="py-2.5 font-medium text-right">Qté</th>
              <th className="py-2.5 font-medium text-right">Prix unitaire</th>
              <th className="py-2.5 font-medium text-right">Montant</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0EEE9]">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="py-2.5 font-medium">{item.name}</td>
                <td className="py-2.5 text-right tabular-nums">{item.quantity}</td>
                <td className="py-2.5 text-right tabular-nums text-[#52525B]">{formatFCFA(item.unitPrice)}</td>
                <td className="py-2.5 text-right tabular-nums font-medium">{formatFCFA(item.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-full sm:w-72 space-y-1.5 text-[13px] pt-2 border-t border-[#E7E4DD]">
            <div className="flex justify-between text-[#52525B]">
              <span>Sous-total</span>
              <span className="tabular-nums">{formatFCFA(order.subtotal)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-[#52525B]">
                <span>Remise</span>
                <span className="tabular-nums">-{formatFCFA(order.discountAmount)}</span>
              </div>
            )}
            {order.deliveryFee > 0 && (
              <div className="flex justify-between text-[#52525B]">
                <span>Frais de livraison</span>
                <span className="tabular-nums">{formatFCFA(order.deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between text-[15px] font-semibold pt-2 border-t border-[#E7E4DD]">
              <span>Total Net à Payer</span>
              <span className="tabular-nums">{formatFCFA(order.total)}</span>
            </div>
            <div className="flex justify-between text-[12.5px] text-[#1B6342]">
              <span>Montant encaissé</span>
              <span className="tabular-nums font-medium">{formatFCFA(order.amountPaid)}</span>
            </div>
            {remaining > 0 && (
              <div className="flex justify-between text-[12.5px] text-[#A62626] font-semibold">
                <span>Solde restant</span>
                <span className="tabular-nums">{formatFCFA(remaining)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-[#E7E4DD] flex flex-wrap justify-between gap-4 text-[11.5px] text-[#787770]">
          <div>
            <div>Paiements Mobile Money acceptés :</div>
            <div>
              Orange Money ({settings.orangeMoneyMerchant}) · MTN MoMo ({settings.mtnMomoMerchant})
            </div>
          </div>
          <div className="text-right italic">{settings.receiptFooter}</div>
        </div>
      </div>
    </DialogModal>
  );
};

/** 3) Bulletin de Salaire (Fiche de Paie) */
export const SalarySlipModal: React.FC<{
  slip: SalarySlip | null;
  settings: RestaurantSettings;
  onClose: () => void;
}> = ({ slip, settings, onClose }) => {
  if (!slip) return null;

  return (
    <DialogModal
      isOpen={Boolean(slip)}
      onClose={onClose}
      title={`Fiche de paie — ${slip.reference}`}
      subtitle={`${slip.employeeName} · ${slip.month}`}
      maxWidth="lg"
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>
            Fermer
          </Btn>
          <Btn variant="primary" leftIcon={<Printer className="w-4 h-4" />} onClick={triggerPrint}>
            Imprimer la fiche
          </Btn>
        </>
      }
    >
      <div id="dineo-printable-area" className="bg-white text-[#18181B] border border-[#E7E4DD] rounded-lg p-6 space-y-5 text-[13px]">
        <div className="flex items-start justify-between border-b border-[#E7E4DD] pb-4">
          <div className="flex items-center gap-3">
            <RestaurantLogo logoUrl={settings.logoUrl} name={settings.name} size="md" />
            <div>
              <div className="text-[16px] font-semibold">{settings.name}</div>
              <div className="text-[12px] text-[#52525B]">
                {settings.address}, {settings.city} · {settings.phone}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-[#787770]">Bulletin de Paie</div>
            <div className="font-mono font-semibold text-[15px]">{slip.reference}</div>
            <div className="text-[12px] text-[#52525B]">Période : {slip.month}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 bg-[#FAF9F7] p-3.5 rounded-lg border border-[#EAE7E0]">
          <div>
            <div className="text-[11px] uppercase text-[#787770]">Employé</div>
            <div className="font-semibold text-[14px]">{slip.employeeName}</div>
            <div className="text-[12px] text-[#52525B]">{slip.employeeRole}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase text-[#787770]">Date de règlement</div>
            <div className="font-medium">{slip.paidAt}</div>
            <div className="text-[12px] text-[#52525B]">Via {paymentMethodLabel(slip.paymentMethod)}</div>
          </div>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#E7E4DD] text-[11px] uppercase text-[#787770]">
              <th className="py-2 text-left font-medium">Rubrique</th>
              <th className="py-2 text-right font-medium">Gains</th>
              <th className="py-2 text-right font-medium">Retenues</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0EEE9]">
            <tr>
              <td className="py-2.5">Salaire de base</td>
              <td className="py-2.5 text-right tabular-nums">{formatFCFA(slip.baseSalary)}</td>
              <td className="py-2.5 text-right text-[#787770]">—</td>
            </tr>
            <tr>
              <td className="py-2.5">Commissions</td>
              <td className="py-2.5 text-right tabular-nums">{formatFCFA(slip.commission)}</td>
              <td className="py-2.5 text-right text-[#787770]">—</td>
            </tr>
            <tr>
              <td className="py-2.5">Primes & indemnités</td>
              <td className="py-2.5 text-right tabular-nums">{formatFCFA(slip.bonus)}</td>
              <td className="py-2.5 text-right text-[#787770]">—</td>
            </tr>
            <tr>
              <td className="py-2.5">Déductions / Avances sur salaire</td>
              <td className="py-2.5 text-right text-[#787770]">—</td>
              <td className="py-2.5 text-right tabular-nums text-[#A62626]">-{formatFCFA(slip.deduction)}</td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-between items-center bg-[#FAF9F7] px-4 py-3 rounded-lg border border-[#E7E4DD]">
          <span className="font-semibold text-[14px]">NET À PAYER</span>
          <span className="font-semibold text-[18px] tabular-nums">{formatFCFA(slip.netSalary)}</span>
        </div>

        <div className="grid grid-cols-2 gap-8 pt-6 text-[12px] text-[#787770]">
          <div className="border-t border-dashed border-[#D6D2C8] pt-2">Signature de la Direction</div>
          <div className="border-t border-dashed border-[#D6D2C8] pt-2 text-right">Signature de l’Employé</div>
        </div>
      </div>
    </DialogModal>
  );
};

/** 4) Bon de Commande Fournisseur */
export const PurchaseOrderModal: React.FC<{
  po: PurchaseOrder | null;
  settings: RestaurantSettings;
  onClose: () => void;
}> = ({ po, settings, onClose }) => {
  if (!po) return null;

  return (
    <DialogModal
      isOpen={Boolean(po)}
      onClose={onClose}
      title={`Bon de commande — ${po.reference}`}
      subtitle={`Fournisseur : ${po.supplierName}`}
      maxWidth="lg"
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>
            Fermer
          </Btn>
          <Btn variant="primary" leftIcon={<Printer className="w-4 h-4" />} onClick={triggerPrint}>
            Imprimer le bon
          </Btn>
        </>
      }
    >
      <div id="dineo-printable-area" className="bg-white text-[#18181B] border border-[#E7E4DD] rounded-lg p-6 space-y-5 text-[13px]">
        <div className="flex justify-between border-b border-[#E7E4DD] pb-4">
          <div className="flex items-center gap-3">
            <RestaurantLogo logoUrl={settings.logoUrl} name={settings.name} size="md" />
            <div>
              <div className="text-[16px] font-semibold">{settings.name}</div>
              <div className="text-[12px] text-[#52525B]">
                {settings.address}, {settings.city} · {settings.phone}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-[#787770]">Bon de Commande</div>
            <div className="font-mono font-semibold text-[15px]">{po.reference}</div>
            <div className="text-[12px] text-[#52525B]">Date : {po.date}</div>
          </div>
        </div>

        <div className="bg-[#FAF9F7] p-3.5 rounded-lg border border-[#EAE7E0] flex justify-between">
          <div>
            <div className="text-[11px] uppercase text-[#787770]">Fournisseur</div>
            <div className="font-semibold text-[14px]">{po.supplierName}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase text-[#787770]">Validé par</div>
            <div className="font-medium">{po.createdBy}</div>
          </div>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#E7E4DD] text-[11px] uppercase text-[#787770]">
              <th className="py-2 text-left font-medium">Article</th>
              <th className="py-2 text-right font-medium">Quantité</th>
              <th className="py-2 text-right font-medium">P.U.</th>
              <th className="py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0EEE9]">
            {po.items.map((item, i) => (
              <tr key={i}>
                <td className="py-2.5 font-medium">{item.stockItemName}</td>
                <td className="py-2.5 text-right tabular-nums">
                  {item.quantity} {item.unit}
                </td>
                <td className="py-2.5 text-right tabular-nums text-[#52525B]">{formatFCFA(item.unitPrice)}</td>
                <td className="py-2.5 text-right tabular-nums font-medium">{formatFCFA(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-center pt-3 border-t border-[#E7E4DD]">
          <span className="text-[12px] text-[#52525B]">{po.notes || 'Réception conforme et ajoutée au stock.'}</span>
          <div className="text-right">
            <span className="text-[11px] uppercase text-[#787770] block">Total Commande</span>
            <span className="text-[17px] font-semibold tabular-nums">{formatFCFA(po.total)}</span>
          </div>
        </div>
      </div>
    </DialogModal>
  );
};

/** 5) Carte de Fidélité Client */
export const LoyaltyCardModal: React.FC<{
  customer: Customer | null;
  loyaltyConfig: LoyaltyConfig;
  settings: RestaurantSettings;
  onClose: () => void;
}> = ({ customer, loyaltyConfig, settings, onClose }) => {
  if (!customer) return null;

  const sortedTiers = [...loyaltyConfig.tiers].sort((a, b) => a.minPoints - b.minPoints);
  const currentTier = [...sortedTiers].reverse().find((t) => customer.points >= t.minPoints) || sortedTiers[0];
  const nextTier = sortedTiers.find((t) => t.minPoints > customer.points);
  const progress = nextTier
    ? Math.min(100, Math.round(((customer.points - currentTier.minPoints) / Math.max(1, nextTier.minPoints - currentTier.minPoints)) * 100))
    : 100;

  return (
    <DialogModal
      isOpen={Boolean(customer)}
      onClose={onClose}
      title="Carte de Fidélité Membre"
      subtitle={`Client : ${customer.name}`}
      maxWidth="md"
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>
            Fermer
          </Btn>
          <Btn variant="primary" leftIcon={<Printer className="w-4 h-4" />} onClick={triggerPrint}>
            Imprimer la carte
          </Btn>
        </>
      }
    >
      <div id="dineo-printable-area" className="mx-auto max-w-[400px]">
        <div className="rounded-2xl bg-[#18181B] text-[#F4F3EE] p-6 border border-[#2D2D2A] shadow-lg space-y-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <RestaurantLogo logoUrl={settings.logoUrl} name={settings.name} size="md" />
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.14em] text-[#B5B4AC]">Carte Membre Privilège</div>
                <div className="text-[15.5px] font-semibold mt-0.5">{settings.name}</div>
                <div className="text-[11px] text-[#84837B]">{settings.city} · Cameroun</div>
              </div>
            </div>
            <div
              className="px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 border"
              style={{ borderColor: 'var(--accent-border)', backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              <Award className="w-3.5 h-3.5" />
              {currentTier.name}
            </div>
          </div>

          <div className="flex items-end justify-between pt-2">
            <div>
              <div className="text-[11px] text-[#84837B]">Titulaire</div>
              <div className="text-[16px] font-semibold tracking-tight">{customer.name}</div>
              <div className="text-[11.5px] text-[#B5B4AC] font-mono">{customer.phone}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-[#84837B]">Solde Points</div>
              <div className="text-[24px] font-semibold tabular-nums leading-none">{customer.points}</div>
              <div className="text-[10.5px] text-[#B5B4AC] mt-0.5">points cumulés</div>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-[#2D2D2A]">
            <div className="flex justify-between text-[11px] text-[#B5B4AC]">
              <span>Avantage actif : {currentTier.discountPercent > 0 ? `-${currentTier.discountPercent}%` : 'Standard'}</span>
              <span>{nextTier ? `${nextTier.minPoints - customer.points} pts → ${nextTier.name}` : 'Niveau maximum atteint'}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#2C2C29] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: 'var(--accent)' }} />
            </div>
          </div>

          <div className="flex items-center justify-between text-[10.5px] text-[#84837B] font-mono pt-1">
            <span>ID : {customer.id.toUpperCase()}</span>
            <span>{customer.ordersCount} visites</span>
          </div>
        </div>
      </div>
    </DialogModal>
  );
};

/** 6) VRAI QR Code Scannable ISO/IEC 18004 pour Chevalet de Table */
export const TableQrModal: React.FC<{
  table: DiningTable | null;
  settings: RestaurantSettings;
  onClose: () => void;
  onTestScan?: (tableNumber: string) => void;
}> = ({ table, settings, onClose, onTestScan }) => {
  const [baseUrl, setBaseUrl] = useState(() => (settings.publicBaseUrl || window.location.origin).replace(/\/$/, ''));
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const qrUrl = table ? `${baseUrl}/table/${encodeURIComponent(table.number)}` : '';

  useEffect(() => {
    if (!qrUrl) return;
    let active = true;
    QRCode.toDataURL(qrUrl, {
      width: 520,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#18181B', light: '#FFFFFF' },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch((err) => console.error('QR generation failed:', err));
    return () => {
      active = false;
    };
  }, [qrUrl]);

  if (!table) return null;

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR-${table.number}-${settings.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <DialogModal
      isOpen={Boolean(table)}
      onClose={onClose}
      title={`QR Code Scannable — ${table.name}`}
      subtitle="Norme ISO/IEC 18004 haute tolérance — prêt à scanner ou imprimer"
      maxWidth="md"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          {onTestScan ? (
            <Btn
              variant="secondary"
              size="sm"
              leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
              onClick={() => {
                onClose();
                onTestScan(table.number);
              }}
            >
              Tester le scan (Vue Client)
            </Btn>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Btn variant="secondary" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />} onClick={handleDownloadPng}>
              PNG HD
            </Btn>
            <Btn variant="primary" size="sm" leftIcon={<Printer className="w-3.5 h-3.5" />} onClick={triggerPrint}>
              Imprimer chevalet
            </Btn>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Editable Domain / Local Wi-Fi IP helper (hidden on print) */}
        <div className="no-print space-y-1.5">
          <label className="text-[11.5px] font-medium block" style={{ color: 'var(--ink-muted)' }}>
            Domaine ou adresse IP Wi-Fi encodée dans le QR Code
          </label>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value.trim())}
              placeholder="https://sahelgourmand.cm ou http://192.168.1.10:5175"
              style={inputBaseStyle}
              className={`${inputBaseClass} font-mono text-[12px] flex-1`}
            />
            <Btn variant="secondary" size="sm" onClick={handleCopy} leftIcon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}>
              {copied ? 'Copié' : 'Copier'}
            </Btn>
          </div>
        </div>

        {/* Printable Table Tent Card */}
        <div
          id="dineo-printable-area"
          className="mx-auto max-w-[310px] bg-white text-[#18181B] border border-[#E7E4DD] rounded-2xl p-6 text-center space-y-4 shadow-xs"
        >
          <div className="flex flex-col items-center">
            <RestaurantLogo logoUrl={settings.logoUrl} name={settings.name} size="md" />
            <div className="text-[11px] uppercase tracking-[0.14em] font-semibold mt-2" style={{ color: 'var(--accent)' }}>
              {settings.name}
            </div>
            <div className="text-[20px] font-semibold tracking-tight mt-0.5">{table.name}</div>
            <div className="text-[12px] text-[#787770]">
              {table.zone} · {table.seats} places
            </div>
          </div>

          <div className="mx-auto w-52 h-52 p-2.5 rounded-xl border border-[#E7E4DD] bg-white flex items-center justify-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR ${table.number}`} className="w-full h-full object-contain" />
            ) : (
              <span className="text-xs text-[#787770]">Génération...</span>
            )}
          </div>

          <div className="space-y-1">
            <div className="text-[13px] font-semibold flex items-center justify-center gap-1.5">
              <QrCode className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              Scannez pour voir le menu & commander
            </div>
            <p className="text-[11px] text-[#787770]">Sans application · Commande transmise direct en cuisine</p>
            <p className="text-[10px] text-[#9A9990] font-mono break-all pt-1">{qrUrl}</p>
          </div>
        </div>
      </div>
    </DialogModal>
  );
};

/** 7) Planche A4 complète de TOUS les QR Codes (Tables + Commande à Domicile) */
export const AllTablesQrSheetModal: React.FC<{
  isOpen: boolean;
  tables: DiningTable[];
  settings: RestaurantSettings;
  onClose: () => void;
}> = ({ isOpen, tables, settings, onClose }) => {
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const baseUrl = (settings.publicBaseUrl || window.location.origin).replace(/\/$/, '');

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const entries = [
      { id: '__HOME__', url: `${baseUrl}/menu` },
      ...tables.map((t) => ({ id: t.id, url: `${baseUrl}/table/${encodeURIComponent(t.number)}` })),
    ];
    Promise.all(
      entries.map(async (e) => {
        const data = await QRCode.toDataURL(e.url, { width: 320, margin: 1, errorCorrectionLevel: 'H' });
        return [e.id, data] as const;
      })
    ).then((pairs) => {
      if (active) setQrMap(Object.fromEntries(pairs));
    });
    return () => {
      active = false;
    };
  }, [isOpen, tables, baseUrl]);

  if (!isOpen) return null;

  return (
    <DialogModal
      isOpen={isOpen}
      onClose={onClose}
      title="Planche A4 — Tous les QR Codes du restaurant"
      subtitle="Prête à envoyer chez l’imprimeur à Maroua (plastification / chevalets de table)"
      maxWidth="2xl"
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>
            Fermer
          </Btn>
          <Btn variant="primary" leftIcon={<Printer className="w-4 h-4" />} onClick={triggerPrint}>
            Imprimer toute la planche (A4)
          </Btn>
        </>
      }
    >
      <div id="dineo-printable-area" className="bg-white text-[#18181B] p-4 rounded-lg">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* QR Commande à Domicile / Flyers */}
          <div className="border border-dashed border-[#B84A27] rounded-xl p-4 text-center space-y-2 bg-[#FAF9F7]">
            <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--accent)' }}>
              {settings.name}
            </div>
            <div className="font-semibold text-[13.5px]">Livraison & Emporter</div>
            <div className="w-32 h-32 mx-auto bg-white p-1.5 rounded-lg border border-[#E7E4DD]">
              {qrMap.__HOME__ && <img src={qrMap.__HOME__} alt="QR Menu Général" className="w-full h-full object-contain" />}
            </div>
            <div className="text-[10.5px] text-[#52525B]">Pour flyers, WhatsApp & vitrine</div>
          </div>

          {/* QR de chaque table */}
          {tables.map((tbl) => (
            <div key={tbl.id} className="border border-[#E7E4DD] rounded-xl p-4 text-center space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-[#787770] font-medium">{settings.name}</div>
              <div className="font-semibold text-[14px] font-mono">{tbl.name}</div>
              <div className="w-32 h-32 mx-auto bg-white p-1.5 rounded-lg border border-[#E7E4DD]">
                {qrMap[tbl.id] && <img src={qrMap[tbl.id]} alt={`QR ${tbl.number}`} className="w-full h-full object-contain" />}
              </div>
              <div className="text-[10.5px] text-[#52525B]">
                {tbl.zone} · {tbl.seats} places
              </div>
            </div>
          ))}
        </div>
      </div>
    </DialogModal>
  );
};
