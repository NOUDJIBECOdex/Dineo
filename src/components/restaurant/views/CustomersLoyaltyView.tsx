import { Award, CreditCard, MapPin, Phone, Plus, Save, Users } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useErp } from '../../../store/erp.context';
import type { Customer, LoyaltyConfig } from '../../../types/erp';
import { MAROUA_NEIGHBORHOODS } from '../../../types/erp';
import { formatFCFA } from '../../../utils/currency';
import { LoyaltyCardModal } from '../print/PrintModals';
import {
  Btn,
  DialogModal,
  Field,
  KpiCard,
  PageHeader,
  SearchInput,
  StatusPill,
  Surface,
  inputBaseClass,
  inputBaseStyle,
} from '../ui/Primitives';

interface CustomersLoyaltyViewProps {
  mode: 'customers' | 'loyalty';
}

export const CustomersLoyaltyView: React.FC<CustomersLoyaltyViewProps> = ({ mode }) => {
  const { state, saveCustomer, updateLoyaltyConfig, adjustCustomerPoints } = useErp();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [cardCustomer, setCardCustomer] = useState<Customer | null>(null);

  // Customer form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+237 6 ');
  const [neighborhood, setNeighborhood] = useState('Domayo');
  const [address, setAddress] = useState('');

  // Loyalty rule draft
  const [ruleDraft, setRuleDraft] = useState<LoyaltyConfig>(state.loyaltyConfig);
  const [savedBanner, setSavedBanner] = useState(false);

  const getTierForPoints = (pts: number) => {
    const sorted = [...state.loyaltyConfig.tiers].sort((a, b) => a.minPoints - b.minPoints);
    return [...sorted].reverse().find((t) => pts >= t.minPoints) || sorted[0];
  };

  const filteredCustomers = useMemo(() => {
    return state.customers.filter((c) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.neighborhood.toLowerCase().includes(q)
      );
    });
  }, [state.customers, search]);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('+237 6 ');
    setNeighborhood('Domayo');
    setAddress('');
    setModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setNeighborhood(c.neighborhood);
    setAddress(c.address || '');
    setModalOpen(true);
  };

  const handleSubmitCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    saveCustomer(
      { name: name.trim(), phone: phone.trim(), neighborhood, address: address.trim() },
      editingCustomer?.id
    );
    setModalOpen(false);
  };

  const handleSaveLoyalty = (e: React.FormEvent) => {
    e.preventDefault();
    updateLoyaltyConfig(ruleDraft);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2500);
  };

  if (mode === 'loyalty') {
    const totalPoints = state.customers.reduce((s, c) => s + c.points, 0);

    return (
      <div className="space-y-6">
        <PageHeader
          title="Programme de Fidélité"
          description="Définissez le barème de points en FCFA, les paliers membres et imprimez les cartes fidélité."
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard label="Membres inscrits" value={state.customers.length} icon={<Users className="w-4 h-4" />} />
          <KpiCard label="Points en circulation" value={totalPoints} icon={<Award className="w-4 h-4" />} />
          <KpiCard
            label="Règle active"
            value={`${state.loyaltyConfig.pointsPerStep} pt / ${formatFCFA(state.loyaltyConfig.amountPerStep)}`}
            helper="Attribution automatique en Caisse"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Config panel */}
          <Surface className="lg:col-span-5 space-y-4">
            <h2 className="text-[14.5px] font-semibold">Barème & Paliers</h2>
            <form onSubmit={handleSaveLoyalty} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Points gagnés">
                  <input
                    type="number"
                    min={1}
                    value={ruleDraft.pointsPerStep}
                    onChange={(e) => setRuleDraft({ ...ruleDraft, pointsPerStep: Number(e.target.value) })}
                    style={inputBaseStyle}
                    className={`${inputBaseClass} tabular-nums`}
                  />
                </Field>
                <Field label="Par tranche de (FCFA)">
                  <input
                    type="number"
                    min={100}
                    step={100}
                    value={ruleDraft.amountPerStep}
                    onChange={(e) => setRuleDraft({ ...ruleDraft, amountPerStep: Number(e.target.value) })}
                    style={inputBaseStyle}
                    className={`${inputBaseClass} tabular-nums`}
                  />
                </Field>
              </div>

              <div className="space-y-2.5 pt-2">
                <div className="text-[11.5px] font-medium uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
                  Niveaux de la carte
                </div>
                {ruleDraft.tiers.map((tier, idx) => (
                  <div
                    key={tier.id}
                    className="p-3 rounded-lg border space-y-2"
                    style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[13px]">{tier.name}</span>
                      <div className="flex items-center gap-2 text-[12px]">
                        <label className="flex items-center gap-1" style={{ color: 'var(--ink-muted)' }}>
                          Seuil :
                          <input
                            type="number"
                            min={0}
                            value={tier.minPoints}
                            onChange={(e) => {
                              const next = [...ruleDraft.tiers];
                              next[idx] = { ...tier, minPoints: Number(e.target.value) };
                              setRuleDraft({ ...ruleDraft, tiers: next });
                            }}
                            style={inputBaseStyle}
                            className="w-16 h-7 px-2 rounded border text-right tabular-nums"
                          />
                          pts
                        </label>
                        <label className="flex items-center gap-1" style={{ color: 'var(--ink-muted)' }}>
                          Remise :
                          <input
                            type="number"
                            min={0}
                            max={50}
                            value={tier.discountPercent}
                            onChange={(e) => {
                              const next = [...ruleDraft.tiers];
                              next[idx] = { ...tier, discountPercent: Number(e.target.value) };
                              setRuleDraft({ ...ruleDraft, tiers: next });
                            }}
                            style={inputBaseStyle}
                            className="w-14 h-7 px-2 rounded border text-right tabular-nums"
                          />
                          %
                        </label>
                      </div>
                    </div>
                    <div className="text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                      {tier.perk}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                {savedBanner ? (
                  <span className="text-[12px] font-medium" style={{ color: 'var(--ok-text)' }}>
                    Configuration enregistrée.
                  </span>
                ) : (
                  <span />
                )}
                <Btn type="submit" variant="primary" leftIcon={<Save className="w-3.5 h-3.5" />}>
                  Enregistrer le barème
                </Btn>
              </div>
            </form>
          </Surface>

          {/* Members list */}
          <Surface padding="none" className="lg:col-span-7 overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-hairline)' }}>
              <h2 className="text-[14.5px] font-semibold">Cartes & Soldes membres</h2>
              <span className="text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                Classé par points
              </span>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
              {[...state.customers]
                .sort((a, b) => b.points - a.points)
                .map((c) => {
                  const tier = getTierForPoints(c.points);
                  return (
                    <div key={c.id} className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-[var(--bg-subtle)]">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[13.5px]">{c.name}</span>
                          <StatusPill tone={tier.discountPercent >= 10 ? 'accent' : tier.discountPercent > 0 ? 'ok' : 'neutral'}>
                            {tier.name}
                          </StatusPill>
                        </div>
                        <div className="text-[12px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                          {c.ordersCount} commandes · {formatFCFA(c.totalSpent)} cumulés
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[15px] tabular-nums mr-1">{c.points} pts</span>
                        <Btn
                          variant="secondary"
                          size="xs"
                          onClick={() => adjustCustomerPoints(c.id, 10, 'Bonus fidélité')}
                          title="Ajouter 10 points bonus"
                        >
                          +10
                        </Btn>
                        <Btn
                          variant="primary"
                          size="xs"
                          leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                          onClick={() => setCardCustomer(c)}
                        >
                          Carte
                        </Btn>
                      </div>
                    </div>
                  );
                })}
            </div>
          </Surface>
        </div>

        <LoyaltyCardModal
          customer={cardCustomer}
          loyaltyConfig={state.loyaltyConfig}
          settings={state.settings}
          onClose={() => setCardCustomer(null)}
        />
      </div>
    );
  }

  // CUSTOMERS VIEW
  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Répertoire clients, adresses de livraison à Maroua et historique de fidélité."
        actions={
          <Btn variant="accent" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
            Ajouter un client
          </Btn>
        }
      />

      <div className="flex items-center justify-between gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Nom, téléphone, quartier..." className="w-full sm:w-80" />
        <span className="text-[12.5px] shrink-0" style={{ color: 'var(--ink-muted)' }}>
          {filteredCustomers.length} client(s)
        </span>
      </div>

      <Surface padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr
                className="border-b text-[11px] uppercase tracking-[0.05em]"
                style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink-muted)', backgroundColor: 'var(--bg-subtle)' }}
              >
                <th className="py-3 px-4 font-medium">Client</th>
                <th className="py-3 px-4 font-medium">Quartier & Adresse</th>
                <th className="py-3 px-4 font-medium">Fidélité</th>
                <th className="py-3 px-4 font-medium text-right">Dépenses</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
              {filteredCustomers.map((c) => {
                const tier = getTierForPoints(c.points);
                return (
                  <tr key={c.id} className="hover:bg-[var(--bg-subtle)]">
                    <td className="py-3.5 px-4">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-[11.5px] font-mono flex items-center gap-1" style={{ color: 'var(--ink-muted)' }}>
                        <Phone className="w-3 h-3" />
                        {c.phone}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 font-medium">
                        <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                        {c.neighborhood}
                      </div>
                      {c.address && (
                        <div className="text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                          {c.address}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <StatusPill tone={tier.discountPercent > 0 ? 'ok' : 'neutral'}>{tier.name}</StatusPill>
                        <span className="text-[12px] tabular-nums" style={{ color: 'var(--ink-muted)' }}>
                          {c.points} pts
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums">
                      <div className="font-semibold">{formatFCFA(c.totalSpent)}</div>
                      <div className="text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                        {c.ordersCount} commande(s)
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Btn variant="secondary" size="xs" onClick={() => setCardCustomer(c)}>
                          Carte
                        </Btn>
                        <Btn variant="ghost" size="xs" onClick={() => openEditModal(c)}>
                          Modifier
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

      <DialogModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCustomer ? 'Modifier le client' : 'Nouveau client'}
        maxWidth="sm"
      >
        <form onSubmit={handleSubmitCustomer} className="space-y-3.5">
          <Field label="Nom complet" required>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} style={inputBaseStyle} className={inputBaseClass} />
          </Field>
          <Field label="Téléphone" required>
            <input type="text" required value={phone} onChange={(e) => setPhone(e.target.value)} style={inputBaseStyle} className={inputBaseClass} />
          </Field>
          <Field label="Quartier (Maroua)">
            <select value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} style={inputBaseStyle} className={inputBaseClass}>
              {MAROUA_NEIGHBORHOODS.map((n) => (
                <option key={n.name} value={n.name}>
                  {n.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Adresse / Repère">
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} style={inputBaseStyle} className={inputBaseClass} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Btn type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Annuler
            </Btn>
            <Btn type="submit" variant="primary">
              Enregistrer
            </Btn>
          </div>
        </form>
      </DialogModal>

      <LoyaltyCardModal
        customer={cardCustomer}
        loyaltyConfig={state.loyaltyConfig}
        settings={state.settings}
        onClose={() => setCardCustomer(null)}
      />
    </div>
  );
};
