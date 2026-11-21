import { BellRing, Check, Copy, Receipt, Users, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useErp } from '../../../store/erp.context';
import type { PaymentMethod } from '../../../types/erp';
import { formatFCFA } from '../../../utils/currency';
import { CashFcfaLogo, MtnMomoLogo, OrangeMoneyLogo } from '../../common/PaymentBrandLogos';

interface BillRequestSheetProps {
  isOpen: boolean;
  onClose: () => void;
  tableNumber: string;
  customerName?: string;
}

export const BillRequestSheet: React.FC<BillRequestSheetProps> = ({
  isOpen,
  onClose,
  tableNumber,
  customerName,
}) => {
  const { state, callWaiter } = useErp();

  const [mode, setMode] = useState<'BILL' | 'WAITER'>('BILL');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('ESPECES');
  const [changeFor, setChangeFor] = useState<'EXACT' | '5000' | '10000'>('EXACT');
  const [tip, setTip] = useState<number>(0);
  const [splitCount, setSplitCount] = useState<number>(1);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Calcule automatiquement la note impayée en direct pour cette table
  const tableUnpaidOrders = useMemo(() => {
    const normalized = tableNumber.toLowerCase();
    return state.orders.filter(
      (o) =>
        o.channel === 'SUR_PLACE' &&
        o.kitchenStatus !== 'ANNULEE' &&
        o.paymentStatus !== 'PAYE' &&
        (o.tableNumber || '').toLowerCase() === normalized
    );
  }, [state.orders, tableNumber]);

  const subtotalDue = useMemo(
    () => tableUnpaidOrders.reduce((s, o) => s + Math.max(0, o.total - o.amountPaid), 0),
    [tableUnpaidOrders]
  );

  const grandTotal = subtotalDue + tip;
  const perPerson = splitCount > 1 && grandTotal > 0 ? Math.ceil(grandTotal / splitCount) : grandTotal;

  if (!isOpen) return null;

  const handleCopy = (val: string) => {
    navigator.clipboard?.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleRequestBill = () => {
    const methodLabel =
      payMethod === 'ORANGE_MONEY'
        ? 'Orange Money'
        : payMethod === 'MTN_MOMO'
        ? 'MTN MoMo'
        : changeFor === 'EXACT'
        ? 'Espèces (monnaie exacte)'
        : `Espèces (prévoir monnaie sur ${Number(changeFor).toLocaleString('fr-FR')} FCFA)`;

    const amountPart = subtotalDue > 0 ? `${formatFCFA(grandTotal)}` : 'Note de table';
    const tipPart = tip > 0 ? ` dont pourboire +${formatFCFA(tip)}` : '';
    const splitPart = splitCount > 1 ? ` · Partagée en ${splitCount}` : '';
    const summary = `Addition ${amountPart}${tipPart} — ${methodLabel}${splitPart}`;

    callWaiter(tableNumber, summary, customerName);
    setSentMessage('Votre demande d’addition a été transmise à la caisse et au serveur !');
    setTimeout(() => {
      setSentMessage(null);
      onClose();
    }, 2200);
  };

  const handleQuickService = (reason: string) => {
    callWaiter(tableNumber, reason, customerName);
    setSentMessage(`Demande envoyée : ${reason}`);
    setTimeout(() => {
      setSentMessage(null);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />

      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--ink-primary)',
          borderColor: 'var(--border-hairline)',
        }}
        className="relative z-10 w-full max-w-[460px] rounded-t-3xl sm:rounded-2xl border shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden"
      >
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border-strong)' }} />
        </div>

        {/* Header */}
        <div
          className="px-5 py-3.5 border-b flex items-center justify-between gap-2 shrink-0"
          style={{ borderColor: 'var(--border-hairline)' }}
        >
          <div>
            <h2 className="text-[16px] font-semibold">Service à table · {tableNumber}</h2>
            <p className="text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
              Addition préparée ou appel serveur en 1 clic
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
            style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--ink-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="px-5 pt-4">
          <div
            className="grid grid-cols-2 p-1 rounded-xl border gap-1"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-hairline)' }}
          >
            <button
              type="button"
              onClick={() => setMode('BILL')}
              style={{
                backgroundColor: mode === 'BILL' ? 'var(--bg-surface)' : 'transparent',
                color: mode === 'BILL' ? 'var(--ink-primary)' : 'var(--ink-muted)',
              }}
              className="h-9 rounded-lg text-[12.5px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5" style={{ color: mode === 'BILL' ? 'var(--accent)' : undefined }} />
              Demander l’addition
            </button>
            <button
              type="button"
              onClick={() => setMode('WAITER')}
              style={{
                backgroundColor: mode === 'WAITER' ? 'var(--bg-surface)' : 'transparent',
                color: mode === 'WAITER' ? 'var(--ink-primary)' : 'var(--ink-muted)',
              }}
              className="h-9 rounded-lg text-[12.5px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <BellRing className="w-3.5 h-3.5" style={{ color: mode === 'WAITER' ? 'var(--accent)' : undefined }} />
              Appeler le serveur
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {sentMessage ? (
            <div
              className="p-5 rounded-2xl border text-center space-y-2"
              style={{ backgroundColor: 'var(--ok-bg)', borderColor: 'var(--ok-border)', color: 'var(--ok-text)' }}
            >
              <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center bg-white/80">
                <Check className="w-5 h-5" />
              </div>
              <div className="text-[14px] font-semibold">{sentMessage}</div>
            </div>
          ) : mode === 'BILL' ? (
            <>
              {/* Live Table Bill Summary */}
              <div
                className="p-4 rounded-2xl border space-y-2.5"
                style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}
              >
                <div className="flex items-center justify-between text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                  <span>Note en cours ({tableNumber})</span>
                  <span>{tableUnpaidOrders.length} commande(s) à régler</span>
                </div>

                {tableUnpaidOrders.length > 0 ? (
                  <div className="space-y-1 text-[12.5px] pt-1 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                    {tableUnpaidOrders.flatMap((o) => o.items).slice(0, 5).map((item, idx) => (
                      <div key={`${item.id}-${idx}`} className="flex justify-between gap-2">
                        <span className="truncate">
                          {item.quantity}× {item.name}
                        </span>
                        <span className="tabular-nums shrink-0">{formatFCFA(item.totalPrice)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                    Le serveur apportera le récapitulatif complet de votre table.
                  </p>
                )}

                <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-hairline)' }}>
                  <span className="font-semibold text-[13.5px]">Total estimé</span>
                  <span className="text-[18px] font-semibold tabular-nums" style={{ color: 'var(--accent)' }}>
                    {subtotalDue > 0 ? formatFCFA(grandTotal) : 'Sur facture'}
                  </span>
                </div>
              </div>

              {/* Split bill + Tip (only if amount known) */}
              {subtotalDue > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="text-[11.5px] font-medium flex items-center gap-1" style={{ color: 'var(--ink-muted)' }}>
                      <Users className="w-3.5 h-3.5" />
                      Partager l’addition
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[1, 2, 3, 4].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setSplitCount(n)}
                          style={{
                            backgroundColor: splitCount === n ? 'var(--ink-primary)' : 'var(--bg-subtle)',
                            color: splitCount === n ? 'var(--ink-inverse)' : 'var(--ink-secondary)',
                          }}
                          className="h-8 rounded-lg text-[12px] font-semibold cursor-pointer"
                        >
                          {n === 1 ? '1' : `÷${n}`}
                        </button>
                      ))}
                    </div>
                    {splitCount > 1 && (
                      <div className="text-[11px] font-medium tabular-nums" style={{ color: 'var(--accent)' }}>
                        ≈ {formatFCFA(perPerson)} / pers.
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[11.5px] font-medium" style={{ color: 'var(--ink-muted)' }}>
                      Pourboire équipe (opt.)
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {[0, 500, 1000].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTip(t)}
                          style={{
                            backgroundColor: tip === t ? 'var(--accent-soft)' : 'var(--bg-subtle)',
                            borderColor: tip === t ? 'var(--accent)' : 'var(--border-hairline)',
                            color: tip === t ? 'var(--accent)' : 'var(--ink-secondary)',
                          }}
                          className="h-8 rounded-lg border text-[11px] font-semibold cursor-pointer"
                        >
                          {t === 0 ? 'Non' : `+${t}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Payment method choice with OFFICIAL logos */}
              <div className="space-y-2">
                <div className="text-[12px] font-semibold" style={{ color: 'var(--ink-secondary)' }}>
                  Comment souhaitez-vous régler ?
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'ESPECES', label: 'Espèces', logo: <CashFcfaLogo size="md" /> },
                      { id: 'ORANGE_MONEY', label: 'Orange Money', logo: <OrangeMoneyLogo size="md" /> },
                      { id: 'MTN_MOMO', label: 'MTN MoMo', logo: <MtnMomoLogo size="md" /> },
                    ] as const
                  ).map((m) => {
                    const active = payMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPayMethod(m.id)}
                        style={{
                          backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-subtle)',
                          borderColor: active ? 'var(--accent)' : 'var(--border-hairline)',
                        }}
                        className="p-2.5 rounded-xl border flex flex-col items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        {m.logo}
                        <span className="text-[11.5px] font-semibold">{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Smart Change request for Cash in Cameroon */}
                {payMethod === 'ESPECES' && (
                  <div className="pt-1 space-y-1.5">
                    <div className="text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                      Pour gagner du temps, le serveur peut déjà venir avec la monnaie :
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: 'EXACT', label: 'Monnaie exacte' },
                          { id: '5000', label: 'Billet 5 000 F' },
                          { id: '10000', label: 'Billet 10 000 F' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setChangeFor(opt.id)}
                          style={{
                            backgroundColor: changeFor === opt.id ? 'var(--ink-primary)' : 'var(--bg-subtle)',
                            color: changeFor === opt.id ? 'var(--ink-inverse)' : 'var(--ink-secondary)',
                          }}
                          className="h-8 rounded-lg text-[11px] font-medium cursor-pointer"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {payMethod !== 'ESPECES' && (
                  <div
                    className="p-3 rounded-xl border flex items-center justify-between gap-2 text-[12px]"
                    style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold">
                        {payMethod === 'ORANGE_MONEY' ? 'Code Marchand Orange Money' : 'Compte MTN MoMo'}
                      </div>
                      <div className="font-mono text-[11.5px] truncate" style={{ color: 'var(--ink-muted)' }}>
                        {payMethod === 'ORANGE_MONEY'
                          ? state.settings.orangeMoneyMerchant
                          : state.settings.mtnMomoMerchant}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          payMethod === 'ORANGE_MONEY'
                            ? state.settings.orangeMoneyMerchant
                            : state.settings.mtnMomoMerchant
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg border text-[11.5px] font-medium inline-flex items-center gap-1 shrink-0 cursor-pointer"
                      style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-surface)' }}
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copié' : 'Copier'}
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleRequestBill}
                style={{ backgroundColor: 'var(--accent)' }}
                className="w-full h-12 rounded-xl text-white font-semibold text-[14px] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.985] transition-transform"
              >
                <Receipt className="w-4 h-4" />
                <span>Envoyer la demande d’addition</span>
              </button>
            </>
          ) : (
            /* Quick Waiter Service Buttons */
            <div className="space-y-2.5">
              <p className="text-[12.5px]" style={{ color: 'var(--ink-muted)' }}>
                Sélectionnez votre besoin : le serveur reçoit votre numéro de table instantanément.
              </p>
              {[
                { title: 'Appeler un serveur à table', desc: 'Question sur la carte ou commande orale' },
                { title: 'Besoin d’eau, couverts ou serviettes', desc: 'Mise en place rapide' },
                { title: 'Demande de piment / sauce supplémentaire', desc: 'Kankankan ou sauce maison' },
                { title: 'Débarrasser / nettoyer la table', desc: 'Entretien de table' },
              ].map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => handleQuickService(item.title)}
                  style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}
                  className="w-full p-3.5 rounded-xl border text-left hover:border-[var(--border-strong)] transition-all cursor-pointer flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-[13.5px] font-semibold">{item.title}</div>
                    <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                      {item.desc}
                    </div>
                  </div>
                  <BellRing className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
