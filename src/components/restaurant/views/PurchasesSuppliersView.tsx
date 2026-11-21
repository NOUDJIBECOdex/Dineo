import { MapPin, PackageCheck, Phone, Plus, Printer, ShoppingBag, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { useErp } from '../../../store/erp.context';
import type { PurchaseOrder, PurchaseOrderItem, Supplier } from '../../../types/erp';
import { formatFCFA } from '../../../utils/currency';
import { PurchaseOrderModal } from '../print/PrintModals';
import {
  Btn,
  DialogModal,
  Field,
  KpiCard,
  PageHeader,
  StatusPill,
  Surface,
  inputBaseClass,
  inputBaseStyle,
} from '../ui/Primitives';

interface PurchasesSuppliersViewProps {
  mode: 'purchases' | 'suppliers';
}

export const PurchasesSuppliersView: React.FC<PurchasesSuppliersViewProps> = ({ mode }) => {
  const { state, saveSupplier, createPurchaseOrder } = useErp();

  // Supplier modal
  const [supModalOpen, setSupModalOpen] = useState(false);
  const [editingSup, setEditingSup] = useState<Supplier | null>(null);
  const [sName, setSName] = useState('');
  const [sContact, setSContact] = useState('');
  const [sPhone, setSPhone] = useState('+237 6 ');
  const [sCat, setSCat] = useState('Viandes & Poissons');
  const [sHood, setSHood] = useState('Domayo, Maroua');

  // Purchase modal
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [poSupplierId, setPoSupplierId] = useState(state.suppliers[0]?.id || '');
  const [poNotes, setPoNotes] = useState('');
  const [poLines, setPoLines] = useState<Array<{ stockItemId: string; quantity: number; unitPrice: number }>>(() => {
    const first = state.stockItems[0];
    return first ? [{ stockItemId: first.id, quantity: 10, unitPrice: first.unitCost }] : [];
  });
  const [previewPo, setPreviewPo] = useState<PurchaseOrder | null>(null);

  const openNewSupplier = () => {
    setEditingSup(null);
    setSName('');
    setSContact('');
    setSPhone('+237 6 ');
    setSCat('Légumes & Épices');
    setSHood('Marché Abattoir, Maroua');
    setSupModalOpen(true);
  };

  const openEditSupplier = (s: Supplier) => {
    setEditingSup(s);
    setSName(s.name);
    setSContact(s.contactName);
    setSPhone(s.phone);
    setSCat(s.category);
    setSHood(s.neighborhood);
    setSupModalOpen(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sName.trim()) return;
    saveSupplier(
      {
        name: sName.trim(),
        contactName: sContact.trim(),
        phone: sPhone.trim(),
        category: sCat.trim(),
        neighborhood: sHood.trim(),
      },
      editingSup?.id
    );
    setSupModalOpen(false);
  };

  const handleCreatePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!poSupplierId || poLines.length === 0) return;
    const items: PurchaseOrderItem[] = poLines
      .filter((l) => l.quantity > 0)
      .map((l) => {
        const si = state.stockItems.find((s) => s.id === l.stockItemId);
        return {
          stockItemId: l.stockItemId,
          stockItemName: si?.name || 'Article',
          quantity: l.quantity,
          unit: si?.unit || 'u.',
          unitPrice: l.unitPrice,
          total: Math.round(l.quantity * l.unitPrice),
        };
      });
    if (items.length === 0) return;
    const created = createPurchaseOrder({ supplierId: poSupplierId, items, notes: poNotes.trim() || undefined });
    setPoModalOpen(false);
    setPoNotes('');
    setPreviewPo(created);
  };

  if (mode === 'suppliers') {
    const totalVolume = state.suppliers.reduce((sum, s) => sum + s.totalPurchased, 0);

    return (
      <div className="space-y-6">
        <PageHeader
          title="Fournisseurs"
          description="Vos partenaires d’approvisionnement locaux à Maroua et dans l’Extrême-Nord."
          actions={
            <Btn variant="accent" leftIcon={<Plus className="w-4 h-4" />} onClick={openNewSupplier}>
              Ajouter un fournisseur
            </Btn>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KpiCard label="Fournisseurs actifs" value={state.suppliers.length} icon={<PackageCheck className="w-4 h-4" />} />
          <KpiCard label="Volume cumulé achats" value={formatFCFA(totalVolume)} icon={<ShoppingBag className="w-4 h-4" />} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {state.suppliers.map((s) => (
            <Surface key={s.id} className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-[14.5px]">{s.name}</h3>
                  <div className="text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                    {s.category}
                  </div>
                </div>
                <Btn variant="ghost" size="xs" onClick={() => openEditSupplier(s)}>
                  Modifier
                </Btn>
              </div>
              <div className="text-[12.5px] space-y-1" style={{ color: 'var(--ink-secondary)' }}>
                <div>Contact : {s.contactName}</div>
                <div className="flex items-center gap-1.5 font-mono text-[12px]">
                  <Phone className="w-3.5 h-3.5" style={{ color: 'var(--ink-muted)' }} />
                  {s.phone}
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                  {s.neighborhood}
                </div>
              </div>
              <div className="pt-2.5 border-t flex items-center justify-between text-[12.5px]" style={{ borderColor: 'var(--border-hairline)' }}>
                <span style={{ color: 'var(--ink-muted)' }}>Total approvisionné</span>
                <span className="font-semibold tabular-nums">{formatFCFA(s.totalPurchased)}</span>
              </div>
            </Surface>
          ))}
        </div>

        <DialogModal
          isOpen={supModalOpen}
          onClose={() => setSupModalOpen(false)}
          title={editingSup ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
          maxWidth="sm"
        >
          <form onSubmit={handleSaveSupplier} className="space-y-3.5">
            <Field label="Raison sociale / Nom" required>
              <input type="text" required value={sName} onChange={(e) => setSName(e.target.value)} style={inputBaseStyle} className={inputBaseClass} />
            </Field>
            <Field label="Interlocuteur">
              <input type="text" value={sContact} onChange={(e) => setSContact(e.target.value)} style={inputBaseStyle} className={inputBaseClass} />
            </Field>
            <Field label="Téléphone" required>
              <input type="text" required value={sPhone} onChange={(e) => setSPhone(e.target.value)} style={inputBaseStyle} className={inputBaseClass} />
            </Field>
            <Field label="Catégorie fournie">
              <input type="text" value={sCat} onChange={(e) => setSCat(e.target.value)} style={inputBaseStyle} className={inputBaseClass} />
            </Field>
            <Field label="Quartier / Localisation">
              <input type="text" value={sHood} onChange={(e) => setSHood(e.target.value)} style={inputBaseStyle} className={inputBaseClass} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Btn type="button" variant="secondary" onClick={() => setSupModalOpen(false)}>
                Annuler
              </Btn>
              <Btn type="submit" variant="primary">
                Enregistrer
              </Btn>
            </div>
          </form>
        </DialogModal>
      </div>
    );
  }

  // PURCHASES VIEW
  const totalPurchases = state.purchases.reduce((s, p) => s + p.total, 0);
  const draftTotal = poLines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Achats & Réapprovisionnements"
        description="Générez vos bons de commande fournisseurs et alimentez automatiquement votre stock."
        actions={
          <Btn variant="accent" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setPoModalOpen(true)}>
            Nouvel approvisionnement
          </Btn>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KpiCard label="Bons de commande enregistrés" value={state.purchases.length} icon={<ShoppingBag className="w-4 h-4" />} />
        <KpiCard label="Montant total achats" value={formatFCFA(totalPurchases)} />
      </div>

      <Surface padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr
                className="border-b text-[11px] uppercase tracking-[0.05em]"
                style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink-muted)', backgroundColor: 'var(--bg-subtle)' }}
              >
                <th className="py-3 px-4 font-medium">Référence</th>
                <th className="py-3 px-4 font-medium">Fournisseur</th>
                <th className="py-3 px-4 font-medium">Date</th>
                <th className="py-3 px-4 font-medium">Articles</th>
                <th className="py-3 px-4 font-medium">Statut</th>
                <th className="py-3 px-4 font-medium text-right">Montant</th>
                <th className="py-3 px-4 font-medium text-right">Bon</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
              {state.purchases.map((po) => (
                <tr key={po.id} className="hover:bg-[var(--bg-subtle)]">
                  <td className="py-3.5 px-4 font-mono font-semibold text-[12.5px]">{po.reference}</td>
                  <td className="py-3.5 px-4 font-medium">{po.supplierName}</td>
                  <td className="py-3.5 px-4 tabular-nums" style={{ color: 'var(--ink-muted)' }}>
                    {po.date}
                  </td>
                  <td className="py-3.5 px-4" style={{ color: 'var(--ink-secondary)' }}>
                    {po.items.map((i) => `${i.stockItemName} (${i.quantity} ${i.unit})`).join(', ')}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusPill tone="ok">Reçu en stock</StatusPill>
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold tabular-nums">{formatFCFA(po.total)}</td>
                  <td className="py-3.5 px-4 text-right">
                    <Btn variant="secondary" size="xs" leftIcon={<Printer className="w-3.5 h-3.5" />} onClick={() => setPreviewPo(po)}>
                      Bon
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Surface>

      <DialogModal
        isOpen={poModalOpen}
        onClose={() => setPoModalOpen(false)}
        title="Nouvel approvisionnement fournisseur"
        subtitle="Les quantités validées seront directement ajoutées à votre stock"
        maxWidth="lg"
      >
        <form onSubmit={handleCreatePurchase} className="space-y-4">
          <Field label="Fournisseur" required>
            <select value={poSupplierId} onChange={(e) => setPoSupplierId(e.target.value)} style={inputBaseStyle} className={inputBaseClass}>
              {state.suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.neighborhood}
                </option>
              ))}
            </select>
          </Field>

          <div className="space-y-2">
            <div className="text-[12px] font-medium" style={{ color: 'var(--ink-secondary)' }}>
              Articles à réapprovisionner
            </div>
            {poLines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <select
                  value={line.stockItemId}
                  onChange={(e) => {
                    const si = state.stockItems.find((s) => s.id === e.target.value);
                    const next = [...poLines];
                    next[idx] = { ...line, stockItemId: e.target.value, unitPrice: si?.unitCost || 1000 };
                    setPoLines(next);
                  }}
                  style={inputBaseStyle}
                  className={`${inputBaseClass} col-span-5`}
                >
                  {state.stockItems.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.unit})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={line.quantity}
                  onChange={(e) => {
                    const next = [...poLines];
                    next[idx] = { ...line, quantity: Number(e.target.value) };
                    setPoLines(next);
                  }}
                  placeholder="Qté"
                  style={inputBaseStyle}
                  className={`${inputBaseClass} col-span-3 tabular-nums text-right`}
                />
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={line.unitPrice}
                  onChange={(e) => {
                    const next = [...poLines];
                    next[idx] = { ...line, unitPrice: Number(e.target.value) };
                    setPoLines(next);
                  }}
                  placeholder="P.U."
                  style={inputBaseStyle}
                  className={`${inputBaseClass} col-span-3 tabular-nums text-right`}
                />
                <button
                  type="button"
                  onClick={() => setPoLines(poLines.filter((_, i) => i !== idx))}
                  className="col-span-1 flex justify-center p-1.5 rounded hover:bg-[var(--err-bg)] cursor-pointer"
                  style={{ color: 'var(--ink-muted)' }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <Btn
              type="button"
              variant="secondary"
              size="xs"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                const first = state.stockItems[0];
                if (first) setPoLines([...poLines, { stockItemId: first.id, quantity: 5, unitPrice: first.unitCost }]);
              }}
            >
              Ajouter une ligne
            </Btn>
          </div>

          <Field label="Note de réception">
            <input type="text" value={poNotes} onChange={(e) => setPoNotes(e.target.value)} placeholder="Ex: Livré le matin, payé espèces..." style={inputBaseStyle} className={inputBaseClass} />
          </Field>

          <div
            className="p-3.5 rounded-lg border flex items-center justify-between"
            style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}
          >
            <span className="text-[13px] font-medium">Total du bon de commande</span>
            <span className="text-[16px] font-semibold tabular-nums">{formatFCFA(draftTotal)}</span>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Btn type="button" variant="secondary" onClick={() => setPoModalOpen(false)}>
              Annuler
            </Btn>
            <Btn type="submit" variant="accent">
              Valider & Ajouter au stock
            </Btn>
          </div>
        </form>
      </DialogModal>

      <PurchaseOrderModal po={previewPo} settings={state.settings} onClose={() => setPreviewPo(null)} />
    </div>
  );
};
