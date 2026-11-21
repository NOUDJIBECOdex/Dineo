import {
  Award,
  BellRing,
  CalendarClock,
  Check,
  Clock,
  MapPin,
  Phone,
  Search,
  Wallet,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useErp } from '../../../store/erp.context';
import { formatFCFA } from '../../../utils/currency';
import { sanitizePhoneInput } from '../../../utils/phone';
import { MtnMomoLogo, OrangeMoneyLogo } from '../../common/PaymentBrandLogos';
import { RestaurantLogo } from '../../restaurant/ui/Primitives';

/** TAB FIDÉLITÉ MOBILE */
export const ClientLoyaltyTab: React.FC<{
  phone: string;
  onChangePhone: (p: string) => void;
}> = ({ phone, onChangePhone }) => {
  const { state } = useErp();
  const [queryPhone, setQueryPhone] = useState(phone);

  const member = useMemo(() => {
    const clean = queryPhone.replace(/\s+/g, '');
    if (clean.length < 6) return null;
    return state.customers.find((c) => c.phone.replace(/\s+/g, '').includes(clean.slice(-8))) || null;
  }, [queryPhone, state.customers]);

  const sortedTiers = [...state.loyaltyConfig.tiers].sort((a, b) => a.minPoints - b.minPoints);
  const currentTier = member
    ? [...sortedTiers].reverse().find((t) => member.points >= t.minPoints) || sortedTiers[0]
    : sortedTiers[0];
  const nextTier = member ? sortedTiers.find((t) => t.minPoints > member.points) : sortedTiers[1];
  const progress =
    member && nextTier
      ? Math.min(100, Math.round(((member.points - currentTier.minPoints) / Math.max(1, nextTier.minPoints - currentTier.minPoints)) * 100))
      : member
      ? 100
      : 0;

  return (
    <div className="px-4 py-4 space-y-5 pb-28">
      <div>
        <h2 className="text-[18px] font-semibold tracking-[-0.02em]">Ma Carte Fidélité</h2>
        <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>
          Cumulez {state.loyaltyConfig.pointsPerStep} pt par tranche de {formatFCFA(state.loyaltyConfig.amountPerStep)} commandés.
        </p>
      </div>

      {/* Phone lookup */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-muted)' }} />
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9+\s]*"
            value={queryPhone}
            onChange={(e) => {
              const clean = sanitizePhoneInput(e.target.value);
              setQueryPhone(clean);
              onChangePhone(clean);
            }}
            placeholder="Votre numéro (ex: +237 6 99 12 34 56)"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-hairline)',
              color: 'var(--ink-primary)',
            }}
            className="w-full h-11 pl-10 pr-4 rounded-xl border text-[13.5px] font-mono focus:outline-none focus:border-[var(--ink-primary)]"
          />
        </div>

        {/* Demo quick test chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-[11px] shrink-0" style={{ color: 'var(--ink-muted)' }}>
            Démo :
          </span>
          {state.customers.slice(0, 3).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setQueryPhone(c.phone);
                onChangePhone(c.phone);
              }}
              style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-surface)' }}
              className="px-2.5 py-1 rounded-full border text-[11.5px] shrink-0 cursor-pointer"
            >
              {c.name.split(' ')[0]} ({c.points} pts)
            </button>
          ))}
        </div>
      </div>

      {/* Digital Member Card */}
      {member ? (
        <div className="rounded-2xl bg-[#18181B] text-[#F4F3EE] p-5 border border-[#2D2D2A] shadow-lg space-y-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <RestaurantLogo logoUrl={state.settings.logoUrl} name={state.settings.name} size="md" />
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-[#A1A1AA]">Membre Fidélité</div>
                <div className="text-[15px] font-semibold">{state.settings.name}</div>
              </div>
            </div>
            <span
              className="px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 border"
              style={{ borderColor: 'var(--accent-border)', backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              <Award className="w-3.5 h-3.5" />
              {currentTier.name}
            </span>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <div className="text-[11px] text-[#A1A1AA]">Titulaire</div>
              <div className="text-[16px] font-semibold">{member.name}</div>
              <div className="text-[11.5px] font-mono text-[#A1A1AA]">{member.phone}</div>
            </div>
            <div className="text-right">
              <div className="text-[28px] font-semibold tabular-nums leading-none">{member.points}</div>
              <div className="text-[11px] text-[#A1A1AA] mt-0.5">points disponibles</div>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-[#2D2D2A]">
            <div className="flex justify-between text-[11px] text-[#D4D4D8]">
              <span>Avantage : {currentTier.discountPercent > 0 ? `−${currentTier.discountPercent}%` : 'Cumul actif'}</span>
              <span>{nextTier ? `${nextTier.minPoints - member.points} pts → ${nextTier.name}` : 'Palier max atteint'}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#2C2C29] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: 'var(--accent)' }} />
            </div>
          </div>

          <div className="flex justify-between text-[11px] text-[#A1A1AA]">
            <span>{member.ordersCount} commandes</span>
            <span>{formatFCFA(member.totalSpent)} cumulés</span>
          </div>
        </div>
      ) : (
        <div
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
          className="rounded-2xl border p-5 text-center space-y-2"
        >
          <Award className="w-7 h-7 mx-auto" style={{ color: 'var(--accent)' }} />
          <div className="text-[14px] font-semibold">Pas encore membre ?</div>
          <p className="text-[12.5px]" style={{ color: 'var(--ink-muted)' }}>
            Renseignez simplement votre numéro de téléphone lors de votre prochaine commande pour activer votre carte automatiquement.
          </p>
        </div>
      )}

      {/* Tier Ladder */}
      <div className="space-y-2">
        <h3 className="text-[13px] font-semibold" style={{ color: 'var(--ink-secondary)' }}>
          Paliers & avantages
        </h3>
        <div className="space-y-2">
          {sortedTiers.map((t) => {
            const unlocked = member ? member.points >= t.minPoints : false;
            return (
              <div
                key={t.id}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: unlocked ? 'var(--accent-border)' : 'var(--border-hairline)',
                }}
                className="p-3.5 rounded-xl border flex items-center justify-between gap-3"
              >
                <div>
                  <div className="text-[13.5px] font-semibold flex items-center gap-1.5">
                    <span>{t.name}</span>
                    {t.discountPercent > 0 && (
                      <span className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>
                        −{t.discountPercent}%
                      </span>
                    )}
                  </div>
                  <div className="text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                    {t.perk}
                  </div>
                </div>
                <span className="text-[12px] font-mono font-semibold shrink-0 tabular-nums" style={{ color: 'var(--ink-secondary)' }}>
                  {t.minPoints} pts
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/** TAB INFOS, APPEL SERVEUR & RÉSERVATION MOBILE */
export const ClientInfoTab: React.FC<{
  tableNumber: string;
  isAtTable: boolean;
  customerName: string;
  customerPhone: string;
  onOpenBillSheet?: () => void;
}> = ({ tableNumber, isAtTable, customerName, customerPhone, onOpenBillSheet }) => {
  const { state, callWaiter, addReservation } = useErp();

  const [waiterSent, setWaiterSent] = useState<string | null>(null);
  const [resName, setResName] = useState(customerName);
  const [resPhone, setResPhone] = useState(customerPhone || '+237 6 ');
  const [resGuests, setResGuests] = useState(4);
  const [resDate, setResDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [resTime, setResTime] = useState('19:30');
  const [resSent, setResSent] = useState(false);

  const handleCallWaiter = (reason: string) => {
    callWaiter(tableNumber || 'T-01', reason, customerName || undefined);
    setWaiterSent(reason);
    setTimeout(() => setWaiterSent(null), 4000);
  };

  const handleReserve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resName.trim()) return;
    const freeTable = state.tables.find((t) => t.seats >= resGuests && t.status === 'LIBRE') || state.tables[0];
    addReservation({
      customerName: resName.trim(),
      customerPhone: resPhone.trim(),
      tableId: freeTable?.id || 'tbl-1',
      tableNumber: freeTable?.number || 'T-01',
      guests: resGuests,
      date: resDate,
      time: resTime,
      notes: 'Réservée depuis l’Espace Client Mobile',
    });
    setResSent(true);
    setTimeout(() => setResSent(false), 4000);
  };

  return (
    <div className="py-4 space-y-5 pb-28 md:pb-8">
      {/* Quick Waiter Call & Smart Bill Request (if dining at table) */}
      {isAtTable && (
        <div
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--accent-border)' }}
          className="rounded-2xl border p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <h3 className="text-[14.5px] font-semibold">Service à table · {tableNumber}</h3>
            </div>
          </div>
          <p className="text-[12px]" style={{ color: 'var(--ink-muted)' }}>
            Préparez votre addition (partage, monnaie, OM/MoMo) ou appelez un serveur en 1 clic.
          </p>

          {waiterSent ? (
            <div
              className="p-3 rounded-xl border text-[12.5px] font-medium flex items-center gap-2"
              style={{ backgroundColor: 'var(--ok-bg)', borderColor: 'var(--ok-border)', color: 'var(--ok-text)' }}
            >
              <Check className="w-4 h-4" />
              Demande envoyée ({waiterSent}). Un serveur arrive !
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => (onOpenBillSheet ? onOpenBillSheet() : handleCallWaiter('Demande d’addition'))}
                style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
                className="h-10 rounded-xl text-[12.5px] font-semibold cursor-pointer active:scale-95 transition-transform"
              >
                Demander l’addition
              </button>
              <button
                type="button"
                onClick={() => handleCallWaiter('Appel serveur à table')}
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-hairline)' }}
                className="h-10 rounded-xl border text-[12.5px] font-medium cursor-pointer active:scale-95 transition-transform"
              >
                Appeler le serveur
              </button>
            </div>
          )}
        </div>
      )}

      {/* Restaurant Identity Card */}
      <div
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
        className="rounded-2xl border p-4 space-y-3.5"
      >
        <div className="flex items-center gap-3">
          <RestaurantLogo logoUrl={state.settings.logoUrl} name={state.settings.name} size="lg" />
          <div>
            <h2 className="text-[16px] font-semibold">{state.settings.name}</h2>
            <p className="text-[12px]" style={{ color: 'var(--ink-muted)' }}>
              {state.settings.tagline}
            </p>
          </div>
        </div>

        <div className="space-y-2.5 text-[13px] pt-2 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
            <span>
              {state.settings.address}, {state.settings.city} ({state.settings.region})
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 shrink-0" style={{ color: 'var(--ink-muted)' }} />
            <span>{state.settings.openingHours}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Phone className="w-4 h-4 shrink-0" style={{ color: 'var(--ink-muted)' }} />
            <a href={`tel:${state.settings.phone}`} className="font-mono font-medium hover:underline">
              {state.settings.phone}
            </a>
          </div>
          <div className="flex items-start gap-2.5">
            <Wallet className="w-4 h-4 shrink-0 mt-1" style={{ color: 'var(--ink-muted)' }} />
            <div className="space-y-1.5 text-[12px]" style={{ color: 'var(--ink-secondary)' }}>
              <div className="flex items-center gap-2">
                <OrangeMoneyLogo size="xs" />
                <span className="font-mono">{state.settings.orangeMoneyMerchant}</span>
              </div>
              <div className="flex items-center gap-2">
                <MtnMomoLogo size="xs" />
                <span className="font-mono">{state.settings.mtnMomoMerchant}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Mobile Table Reservation */}
      <div
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
        className="rounded-2xl border p-4 space-y-3.5"
      >
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <h3 className="text-[14.5px] font-semibold">Réserver une table</h3>
        </div>

        {resSent ? (
          <div
            className="p-3.5 rounded-xl border text-[13px] font-medium flex items-center gap-2"
            style={{ backgroundColor: 'var(--ok-bg)', borderColor: 'var(--ok-border)', color: 'var(--ok-text)' }}
          >
            <Check className="w-4 h-4 shrink-0" />
            Réservation enregistrée ! Nous vous attendons le {resDate} à {resTime}.
          </div>
        ) : (
          <form onSubmit={handleReserve} className="space-y-3">
            <input
              type="text"
              required
              value={resName}
              onChange={(e) => setResName(e.target.value)}
              placeholder="Votre nom complet *"
              style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-hairline)', color: 'var(--ink-primary)' }}
              className="w-full h-10 px-3.5 rounded-xl border text-[13px]"
            />
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9+\s]*"
              required
              value={resPhone}
              onChange={(e) => setResPhone(sanitizePhoneInput(e.target.value))}
              placeholder="Téléphone (+237 6 99 00 00 00)"
              style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-hairline)', color: 'var(--ink-primary)' }}
              className="w-full h-10 px-3.5 rounded-xl border text-[13px] font-mono"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="date"
                value={resDate}
                onChange={(e) => setResDate(e.target.value)}
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-hairline)', color: 'var(--ink-primary)' }}
                className="h-10 px-2.5 rounded-xl border text-[12px]"
              />
              <input
                type="time"
                value={resTime}
                onChange={(e) => setResTime(e.target.value)}
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-hairline)', color: 'var(--ink-primary)' }}
                className="h-10 px-2.5 rounded-xl border text-[12px]"
              />
              <select
                value={resGuests}
                onChange={(e) => setResGuests(Number(e.target.value))}
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-hairline)', color: 'var(--ink-primary)' }}
                className="h-10 px-2.5 rounded-xl border text-[12px]"
              >
                {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                  <option key={n} value={n}>
                    {n} pers.
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              style={{ backgroundColor: 'var(--ink-primary)', color: 'var(--ink-inverse)' }}
              className="w-full h-11 rounded-xl text-[13.5px] font-semibold cursor-pointer active:scale-[0.985] transition-transform"
            >
              Confirmer la réservation
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
