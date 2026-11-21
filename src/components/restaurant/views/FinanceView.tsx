import {
  Activity,
  Calendar,
  CheckCircle2,
  CreditCard,
  Download,
  FileSpreadsheet,
  Plus,
  Printer,
  ShoppingBag,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useErp } from '../../../store/erp.context';
import type { ErpOrder, Expense, PaymentMethod, SalarySlip } from '../../../types/erp';
import { formatFCFA } from '../../../utils/currency';
import { SalarySlipModal } from '../print/PrintModals';
import {
  Btn,
  DialogModal,
  EmptyState,
  Field,
  KpiCard,
  PageHeader,
  StatusPill,
  Surface,
  channelLabel,
  formatShortDateTime,
  inputBaseClass,
  inputBaseStyle,
  paymentMethodLabel,
  paymentStatusMeta,
} from '../ui/Primitives';

interface FinanceViewProps {
  mode: 'reports' | 'expenses' | 'salaries' | 'partial_payments';
}

type ReportPeriod = 'TODAY' | '7D' | 'MONTH' | 'YEAR' | 'CUSTOM';

const EXPENSE_CATEGORIES: Expense['category'][] = [
  'Approvisionnement',
  'Énergie & Eau (ENEO/CAMWATER)',
  'Gaz & Charbon',
  'Livraison & Transport',
  'Entretien & Loyer',
  'Divers',
];

const DONUT_COLORS = ['var(--accent)', '#18181B', '#238255', '#C4751B', '#64748B', '#A8A29E'];

export const FinanceView: React.FC<FinanceViewProps> = ({ mode }) => {
  const { state, addExpense, deleteExpense, createSalarySlip, recordOrderPayment } = useErp();

  // Reports period filter
  const [todayIso] = useState(() => new Date().toISOString().slice(0, 10));
  const [period, setPeriod] = useState<ReportPeriod>('MONTH');
  const [customStart, setCustomStart] = useState(() =>
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [hoveredBucket, setHoveredBucket] = useState<string | null>(null);
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);

  // Expense Modal
  const [expModalOpen, setExpModalOpen] = useState(false);
  const [eLabel, setELabel] = useState('');
  const [eCat, setECat] = useState<Expense['category']>('Divers');
  const [eAmount, setEAmount] = useState(5000);
  const [eMethod, setEMethod] = useState<PaymentMethod>('ESPECES');
  const [eDate, setEDate] = useState(todayIso);
  const [eNotes, setENotes] = useState('');

  // Salary Modal
  const [salModalOpen, setSalModalOpen] = useState(false);
  const [salEmpId, setSalEmpId] = useState(state.employees[0]?.id || '');
  const [salMonth, setSalMonth] = useState('Novembre 2026');
  const [salBase, setSalBase] = useState(state.employees[0]?.baseSalary || 50000);
  const [salComm, setSalComm] = useState(0);
  const [salBonus, setSalBonus] = useState(0);
  const [salDed, setSalDed] = useState(0);
  const [salMethod, setSalMethod] = useState<PaymentMethod>('ESPECES');
  const [previewSlip, setPreviewSlip] = useState<SalarySlip | null>(null);

  // Partial payment modal
  const [payModalOrder, setPayModalOrder] = useState<ErpOrder | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('ORANGE_MONEY');
  const [payNote, setPayNote] = useState('');

  // Period-aware analytics calculation
  const reportData = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1;

    let startMs = startOfToday;
    let endMs = endOfToday;

    if (period === '7D') {
      startMs = startOfToday - 6 * 24 * 60 * 60 * 1000;
    } else if (period === 'MONTH') {
      startMs = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    } else if (period === 'YEAR') {
      startMs = new Date(now.getFullYear(), 0, 1).getTime();
    } else if (period === 'CUSTOM') {
      startMs = new Date(`${customStart}T00:00:00`).getTime();
      endMs = new Date(`${customEnd}T23:59:59`).getTime();
    }

    const inRange = (isoDate: string) => {
      const t = new Date(isoDate.length === 10 ? `${isoDate}T12:00:00` : isoDate).getTime();
      return t >= startMs && t <= endMs;
    };

    const validOrders = state.orders.filter((o) => o.kitchenStatus !== 'ANNULEE' && inRange(o.createdAt));
    const filteredExpenses = state.expenses.filter((e) => inRange(e.date));

    const revenue = validOrders.reduce((s, o) => s + o.total, 0);
    const collected = validOrders.reduce((s, o) => s + o.amountPaid, 0);
    const expensesTotal = filteredExpenses.reduce((s, e) => s + e.amount, 0);
    const salariesTotal = state.salaries.reduce((s, x) => s + x.netSalary, 0);
    const netProfit = revenue - expensesTotal;
    const marginPct = revenue > 0 ? Math.round((netProfit / revenue) * 1000) / 10 : expensesTotal > 0 ? -100 : 0;
    const avgBasket = validOrders.length > 0 ? Math.round(revenue / validOrders.length) : 0;

    // Top products on period
    const prodMap = new Map<string, { name: string; qty: number; rev: number }>();
    for (const o of validOrders) {
      for (const it of o.items) {
        const cur = prodMap.get(it.productId) || { name: it.name, qty: 0, rev: 0 };
        cur.qty += it.quantity;
        cur.rev += it.totalPrice;
        prodMap.set(it.productId, cur);
      }
    }
    const topProducts = Array.from(prodMap.values()).sort((a, b) => b.rev - a.rev);

    const byChannel = {
      SUR_PLACE: validOrders.filter((o) => o.channel === 'SUR_PLACE').reduce((s, o) => s + o.total, 0),
      EMPORTER: validOrders.filter((o) => o.channel === 'EMPORTER').reduce((s, o) => s + o.total, 0),
      LIVRAISON: validOrders.filter((o) => o.channel === 'LIVRAISON').reduce((s, o) => s + o.total, 0),
    };

    const byPayment = {
      ESPECES: 0,
      ORANGE_MONEY: 0,
      MTN_MOMO: 0,
    };
    for (const ord of validOrders) {
      for (const p of ord.payments) {
        byPayment[p.method] += p.amount;
      }
    }

    // Build dynamic timeline buckets based on period
    const buckets: Array<{ key: string; label: string; revenue: number; expense: number }> = [];
    if (period === 'TODAY') {
      const slots = ['08h', '11h', '13h', '15h', '18h', '21h'];
      slots.forEach((lbl, idx) => {
        const minH = idx === 0 ? 0 : idx === 1 ? 10 : idx === 2 ? 12 : idx === 3 ? 14 : idx === 4 ? 17 : 20;
        const maxH = idx === 0 ? 10 : idx === 1 ? 12 : idx === 2 ? 14 : idx === 3 ? 17 : idx === 4 ? 20 : 24;
        const rev = validOrders
          .filter((o) => {
            const h = new Date(o.createdAt).getHours();
            return h >= minH && h < maxH;
          })
          .reduce((s, o) => s + o.total, 0);
        const exp = idx === 2 ? expensesTotal : 0;
        buckets.push({ key: lbl, label: lbl, revenue: rev, expense: exp });
      });
    } else if (period === '7D') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(startOfToday - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit' });
        const rev = validOrders.filter((o) => o.createdAt.slice(0, 10) === key).reduce((s, o) => s + o.total, 0);
        const exp = filteredExpenses.filter((e) => e.date === key).reduce((s, e) => s + e.amount, 0);
        buckets.push({ key, label, revenue: rev, expense: exp });
      }
    } else if (period === 'MONTH') {
      const weeks = [
        { key: 'S1', label: 'Sem. 1', minDay: 1, maxDay: 7 },
        { key: 'S2', label: 'Sem. 2', minDay: 8, maxDay: 14 },
        { key: 'S3', label: 'Sem. 3', minDay: 15, maxDay: 21 },
        { key: 'S4', label: 'Sem. 4', minDay: 22, maxDay: 31 },
      ];
      weeks.forEach((w) => {
        const rev = validOrders
          .filter((o) => {
            const day = new Date(o.createdAt).getDate();
            return day >= w.minDay && day <= w.maxDay;
          })
          .reduce((s, o) => s + o.total, 0);
        const exp = filteredExpenses
          .filter((e) => {
            const day = new Date(`${e.date}T12:00:00`).getDate();
            return day >= w.minDay && day <= w.maxDay;
          })
          .reduce((s, e) => s + e.amount, 0);
        buckets.push({ key: w.key, label: w.label, revenue: rev, expense: exp });
      });
    } else if (period === 'YEAR') {
      const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
      // Show last 6 months up to current month
      const curMonth = now.getMonth();
      for (let offset = 5; offset >= 0; offset--) {
        const mIdx = (curMonth - offset + 12) % 12;
        const rev = validOrders
          .filter((o) => new Date(o.createdAt).getMonth() === mIdx)
          .reduce((s, o) => s + o.total, 0);
        const exp = filteredExpenses
          .filter((e) => new Date(`${e.date}T12:00:00`).getMonth() === mIdx)
          .reduce((s, e) => s + e.amount, 0);
        buckets.push({ key: `${mIdx}`, label: monthNames[mIdx], revenue: rev, expense: exp });
      }
    } else {
      // CUSTOM: split into up to 6 even buckets
      const span = Math.max(1, endMs - startMs);
      const count = 6;
      for (let i = 0; i < count; i++) {
        const bStart = startMs + (span * i) / count;
        const bEnd = startMs + (span * (i + 1)) / count;
        const label = new Date(bStart).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        const rev = validOrders
          .filter((o) => {
            const t = new Date(o.createdAt).getTime();
            return t >= bStart && t <= bEnd;
          })
          .reduce((s, o) => s + o.total, 0);
        const exp = filteredExpenses
          .filter((e) => {
            const t = new Date(`${e.date}T12:00:00`).getTime();
            return t >= bStart && t <= bEnd;
          })
          .reduce((s, e) => s + e.amount, 0);
        buckets.push({ key: `c-${i}`, label, revenue: rev, expense: exp });
      }
    }

    return {
      revenue,
      collected,
      expensesTotal,
      salariesTotal,
      netProfit,
      marginPct,
      avgBasket,
      topProducts,
      byChannel,
      byPayment,
      validOrders,
      buckets,
    };
  }, [state.orders, state.expenses, state.salaries, period, customStart, customEnd]);

  const handleExportCsv = () => {
    const rows = [
      ['Commande', 'Date', 'Client', 'Canal', 'Statut Paiement', 'Moyen', 'Total (FCFA)', 'Encaissé (FCFA)'],
      ...reportData.validOrders.map((o) => [
        o.orderNumber,
        o.createdAt.slice(0, 16).replace('T', ' '),
        o.customerName,
        channelLabel(o.channel),
        o.paymentStatus,
        paymentMethodLabel(o.paymentMethod),
        String(o.total),
        String(o.amountPaid),
      ]),
    ];
    const csv = '\uFEFF' + rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-dineo-${period.toLowerCase()}-${todayIso}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eLabel.trim() || eAmount <= 0) return;
    addExpense({
      label: eLabel.trim(),
      category: eCat,
      amount: eAmount,
      paymentMethod: eMethod,
      date: eDate,
      notes: eNotes.trim() || undefined,
    });
    setELabel('');
    setENotes('');
    setExpModalOpen(false);
  };

  const handleCreateSalary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!salEmpId) return;
    const slip = createSalarySlip({
      employeeId: salEmpId,
      month: salMonth,
      baseSalary: salBase,
      commission: salComm,
      bonus: salBonus,
      deduction: salDed,
      paymentMethod: salMethod,
    });
    setSalModalOpen(false);
    setSalComm(0);
    setSalBonus(0);
    setSalDed(0);
    setPreviewSlip(slip);
  };

  const handleRecordInstallment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalOrder || payAmount <= 0) return;
    recordOrderPayment(payModalOrder.id, payAmount, payMethod, payNote.trim() || 'Versement partiel');
    setPayModalOrder(null);
    setPayNote('');
  };

  // 1) REPORTS (Rapports Analytiques multi-périodes + Donut + Performance financière)
  if (mode === 'reports') {
    const maxBucketVal = Math.max(
      1000,
      ...reportData.buckets.map((b) => Math.max(b.revenue, b.expense))
    );
    const topSliceList = reportData.topProducts.slice(0, 6);
    const topTotalRev = Math.max(1, topSliceList.reduce((s, x) => s + x.rev, 0));
    const totalChannelRev = Math.max(
      1,
      reportData.byChannel.SUR_PLACE + reportData.byChannel.EMPORTER + reportData.byChannel.LIVRAISON
    );

    // SVG Donut math
    const radius = 64;
    const circumference = 2 * Math.PI * radius;
    const donutSlices = topSliceList.reduce<
      Array<{ name: string; qty: number; rev: number; pct: number; length: number; offset: number; color: string }>
    >((acc, item, idx) => {
      const pct = Math.round((item.rev / topTotalRev) * 100);
      const length = (item.rev / topTotalRev) * circumference;
      const offset = acc.reduce((sum, prev) => sum + prev.length, 0);
      acc.push({
        ...item,
        pct,
        length,
        offset,
        color: DONUT_COLORS[idx % DONUT_COLORS.length],
      });
      return acc;
    }, []);

    return (
      <div className="space-y-6" id="dineo-printable-area">
        <PageHeader
          title="Rapports Analytiques"
          description="Performance globale de votre établissement par période : journalier, hebdomadaire, mensuel ou annuel."
          actions={
            <div className="flex flex-wrap items-center gap-2 no-print">
              {/* Period Segmented Switcher */}
              <div
                className="inline-flex items-center p-1 rounded-lg border gap-0.5 overflow-x-auto max-w-full"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-hairline)' }}
              >
                {(
                  [
                    { id: 'TODAY', label: 'Aujourd’hui' },
                    { id: '7D', label: '7 jours' },
                    { id: 'MONTH', label: 'Ce mois' },
                    { id: 'YEAR', label: 'Cette année' },
                    { id: 'CUSTOM', label: 'Perso' },
                  ] as const
                ).map((p) => {
                  const active = period === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPeriod(p.id)}
                      style={{
                        backgroundColor: active ? 'var(--accent)' : 'transparent',
                        color: active ? '#FFFFFF' : 'var(--ink-secondary)',
                      }}
                      className="px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-all cursor-pointer whitespace-nowrap"
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              <Btn variant="secondary" size="sm" leftIcon={<FileSpreadsheet className="w-4 h-4" />} onClick={handleExportCsv} title="Exporter en CSV / Excel">
                Excel
              </Btn>
              <Btn variant="primary" size="sm" leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()} title="Imprimer ou enregistrer en PDF">
                PDF
              </Btn>
            </div>
          }
        />

        {/* Custom Date Range Bar */}
        {period === 'CUSTOM' && (
          <Surface padding="sm" className="no-print flex flex-wrap items-center gap-3">
            <span className="text-[12.5px] font-medium flex items-center gap-1.5" style={{ color: 'var(--ink-secondary)' }}>
              <Calendar className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              Période personnalisée :
            </span>
            <div className="flex items-center gap-2 text-[12.5px]">
              <span style={{ color: 'var(--ink-muted)' }}>Du</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                style={inputBaseStyle}
                className="h-8 px-2.5 rounded-lg border text-[12.5px]"
              />
              <span style={{ color: 'var(--ink-muted)' }}>au</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                style={inputBaseStyle}
                className="h-8 px-2.5 rounded-lg border text-[12.5px]"
              />
            </div>
          </Surface>
        )}

        {/* 4 Analytical KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            label="Revenu total"
            value={formatFCFA(reportData.revenue)}
            helper={`${formatFCFA(reportData.collected)} encaissés sur la période`}
            tone="ok"
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <KpiCard
            label="Dépenses"
            value={formatFCFA(reportData.expensesTotal)}
            helper="Charges d’exploitation enregistrées"
            tone="warn"
            icon={<Wallet className="w-4 h-4" />}
          />
          <KpiCard
            label="Bénéfice net"
            value={formatFCFA(reportData.netProfit)}
            helper={`Marge nette : ${reportData.marginPct}%`}
            tone={reportData.netProfit >= 0 ? 'ok' : 'err'}
            icon={<Activity className="w-4 h-4" />}
          />
          <KpiCard
            label="Panier moyen"
            value={formatFCFA(reportData.avgBasket)}
            helper={`${reportData.validOrders.length} commande(s) sur la période`}
            icon={<ShoppingBag className="w-4 h-4" />}
          />
        </div>

        {/* Financial Performance + Top Products Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Performance Financière Chart */}
          <Surface hoverable className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-[14.5px] font-semibold">Performance Financière</h2>
                <p className="text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                  Comparaison Revenus vs Dépenses sur la période sélectionnée
                </p>
              </div>
              <div className="flex items-center gap-4 text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: 'var(--accent)' }} />
                  Revenus
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: 'var(--border-strong)' }} />
                  Dépenses
                </span>
              </div>
            </div>

            <div className="grid gap-3 items-end h-56 pt-10" style={{ gridTemplateColumns: `repeat(${Math.max(1, reportData.buckets.length)}, minmax(0, 1fr))` }}>
              {reportData.buckets.map((b) => {
                const revH = Math.max(b.revenue > 0 ? 8 : 2, Math.round((b.revenue / maxBucketVal) * 100));
                const expH = Math.max(b.expense > 0 ? 8 : 0, Math.round((b.expense / maxBucketVal) * 100));
                const isHover = hoveredBucket === b.key;

                return (
                  <div
                    key={b.key}
                    onMouseEnter={() => setHoveredBucket(b.key)}
                    onMouseLeave={() => setHoveredBucket(null)}
                    className="h-full flex flex-col items-center justify-end gap-2 relative cursor-pointer"
                  >
                    {isHover && (
                      <div
                        style={{ backgroundColor: 'var(--ink-primary)', color: 'var(--ink-inverse)' }}
                        className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap tabular-nums shadow-md z-10"
                      >
                        CA {formatFCFA(b.revenue)} · Dép. {formatFCFA(b.expense)}
                      </div>
                    )}

                    <div className="flex-1 w-full flex items-end justify-center gap-1.5 max-w-[54px]">
                      <div
                        className="flex-1 rounded-t-md transition-all duration-200"
                        style={{
                          height: `${revH}%`,
                          backgroundColor: 'var(--accent)',
                          opacity: hoveredBucket && !isHover ? 0.5 : 1,
                        }}
                      />
                      {expH > 0 && (
                        <div
                          className="flex-1 rounded-t-md transition-all duration-200"
                          style={{
                            height: `${expH}%`,
                            backgroundColor: 'var(--border-strong)',
                            opacity: hoveredBucket && !isHover ? 0.5 : 1,
                          }}
                        />
                      )}
                    </div>
                    <span
                      className="text-[11px] truncate max-w-full"
                      style={{ color: isHover ? 'var(--ink-primary)' : 'var(--ink-muted)', fontWeight: isHover ? 600 : 400 }}
                    >
                      {b.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </Surface>

          {/* Top Products Donut Chart */}
          <Surface hoverable className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[14.5px] font-semibold">Top Produits (Ventes)</h2>
                <p className="text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                  Part du chiffre d’affaires par plat
                </p>
              </div>
              <span className="text-[11.5px] tabular-nums" style={{ color: 'var(--ink-muted)' }}>
                {reportData.topProducts.length} réf.
              </span>
            </div>

            {donutSlices.length === 0 ? (
              <div className="py-12 text-center text-[12.5px]" style={{ color: 'var(--ink-muted)' }}>
                Aucune vente enregistrée sur cette période.
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="relative w-40 h-40 shrink-0">
                  <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                    <circle cx="80" cy="80" r={radius} fill="none" stroke="var(--bg-subtle)" strokeWidth="18" />
                    {donutSlices.map((sl, idx) => (
                      <circle
                        key={sl.name}
                        cx="80"
                        cy="80"
                        r={radius}
                        fill="none"
                        stroke={sl.color}
                        strokeWidth={hoveredSlice === idx ? 21 : 18}
                        strokeDasharray={`${sl.length} ${circumference}`}
                        strokeDashoffset={-sl.offset}
                        className="transition-all duration-200 cursor-pointer"
                        onMouseEnter={() => setHoveredSlice(idx)}
                        onMouseLeave={() => setHoveredSlice(null)}
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                    <span className="text-[10.5px] uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
                      {hoveredSlice !== null ? `${donutSlices[hoveredSlice].pct}%` : 'Total Top'}
                    </span>
                    <span className="text-[13px] font-semibold tabular-nums leading-tight mt-0.5">
                      {hoveredSlice !== null
                        ? formatFCFA(donutSlices[hoveredSlice].rev)
                        : formatFCFA(topTotalRev)}
                    </span>
                  </div>
                </div>

                <div className="flex-1 w-full space-y-2">
                  {donutSlices.map((sl, idx) => (
                    <div
                      key={sl.name}
                      onMouseEnter={() => setHoveredSlice(idx)}
                      onMouseLeave={() => setHoveredSlice(null)}
                      style={{ backgroundColor: hoveredSlice === idx ? 'var(--bg-subtle)' : 'transparent' }}
                      className="flex items-center justify-between gap-2 px-2 py-1 rounded-md text-[12px] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sl.color }} />
                        <span className="truncate font-medium">{sl.name}</span>
                      </div>
                      <span className="tabular-nums shrink-0" style={{ color: 'var(--ink-muted)' }}>
                        {sl.qty}× · <strong style={{ color: 'var(--ink-primary)' }}>{sl.pct}%</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Surface>
        </div>

        {/* Bottom Row: Channel & Payment Breakdown + Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <Surface hoverable className="lg:col-span-5 space-y-4">
            <h2 className="text-[14.5px] font-semibold">Canaux & Moyens d’encaissement</h2>
            <div className="space-y-3">
              {(
                [
                  { id: 'SUR_PLACE', label: 'Sur place (Salle & QR)', value: reportData.byChannel.SUR_PLACE },
                  { id: 'LIVRAISON', label: 'Livraison Maroua', value: reportData.byChannel.LIVRAISON },
                  { id: 'EMPORTER', label: 'À emporter (Comptoir)', value: reportData.byChannel.EMPORTER },
                ] as const
              ).map((row) => {
                const pct = Math.round((row.value / totalChannelRev) * 100);
                return (
                  <div key={row.id} className="space-y-1">
                    <div className="flex justify-between text-[12.5px]">
                      <span>{row.label}</span>
                      <span className="font-semibold tabular-nums">
                        {formatFCFA(row.value)} <span style={{ color: 'var(--ink-muted)' }}>({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: 'var(--accent)' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t space-y-2 text-[12.5px]" style={{ borderColor: 'var(--border-hairline)' }}>
              {(['ORANGE_MONEY', 'ESPECES', 'MTN_MOMO'] as const).map((m) => (
                <div key={m} className="flex justify-between">
                  <span style={{ color: 'var(--ink-muted)' }}>{paymentMethodLabel(m)}</span>
                  <span className="font-medium tabular-nums">{formatFCFA(reportData.byPayment[m])}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                <span style={{ color: 'var(--ink-muted)' }}>Masse salariale enregistrée</span>
                <span className="font-semibold tabular-nums">{formatFCFA(reportData.salariesTotal)}</span>
              </div>
            </div>
          </Surface>

          <Surface padding="none" hoverable className="lg:col-span-7 overflow-hidden">
            <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-hairline)' }}>
              <h2 className="text-[14.5px] font-semibold">Transactions de la période</h2>
              <Btn variant="ghost" size="xs" leftIcon={<Download className="w-3.5 h-3.5" />} onClick={handleExportCsv} className="no-print">
                CSV
              </Btn>
            </div>
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left border-collapse text-[12.5px]">
                <thead>
                  <tr
                    className="border-b text-[11px] uppercase tracking-[0.05em]"
                    style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink-muted)', backgroundColor: 'var(--bg-subtle)' }}
                  >
                    <th className="py-2.5 px-4 font-medium">N°</th>
                    <th className="py-2.5 px-4 font-medium">Client</th>
                    <th className="py-2.5 px-4 font-medium">Statut</th>
                    <th className="py-2.5 px-4 font-medium text-right">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
                  {reportData.validOrders.slice(0, 10).map((ord) => {
                    const pm = paymentStatusMeta(ord.paymentStatus);
                    return (
                      <tr key={ord.id} className="hover:bg-[var(--bg-subtle)]">
                        <td className="py-2.5 px-4 font-mono font-medium">
                          {ord.orderNumber}
                          <div className="text-[10.5px] font-sans" style={{ color: 'var(--ink-muted)' }}>
                            {formatShortDateTime(ord.createdAt)}
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-medium">{ord.customerName}</div>
                          <div className="text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                            {channelLabel(ord.channel)}
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <StatusPill tone={pm.tone}>{pm.label}</StatusPill>
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold tabular-nums">{formatFCFA(ord.total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Surface>
        </div>
      </div>
    );
  }

  // 2) EXPENSES
  if (mode === 'expenses') {
    const totalExp = state.expenses.reduce((s, e) => s + e.amount, 0);

    return (
      <div className="space-y-6">
        <PageHeader
          title="Dépenses du Restaurant"
          description="Suivez toutes vos charges : ENEO, eau, gaz, charbon, entretien et frais de livraison."
          actions={
            <Btn variant="accent" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setExpModalOpen(true)}>
              Ajouter une dépense
            </Btn>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KpiCard label="Total dépenses enregistrées" value={formatFCFA(totalExp)} tone="warn" icon={<Wallet className="w-4 h-4" />} />
          <KpiCard label="Nombre d’opérations" value={state.expenses.length} />
        </div>

        <Surface padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr
                  className="border-b text-[11px] uppercase tracking-[0.05em]"
                  style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink-muted)', backgroundColor: 'var(--bg-subtle)' }}
                >
                  <th className="py-3 px-4 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium">Libellé</th>
                  <th className="py-3 px-4 font-medium">Catégorie</th>
                  <th className="py-3 px-4 font-medium">Règlement</th>
                  <th className="py-3 px-4 font-medium text-right">Montant</th>
                  <th className="py-3 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
                {state.expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-[var(--bg-subtle)]">
                    <td className="py-3.5 px-4 tabular-nums" style={{ color: 'var(--ink-muted)' }}>
                      {exp.date}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium">{exp.label}</div>
                      {exp.notes && (
                        <div className="text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                          {exp.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusPill tone="neutral" dot={false}>
                        {exp.category}
                      </StatusPill>
                    </td>
                    <td className="py-3.5 px-4" style={{ color: 'var(--ink-secondary)' }}>
                      {paymentMethodLabel(exp.paymentMethod)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold tabular-nums">{formatFCFA(exp.amount)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => deleteExpense(exp.id)}
                        className="p-1.5 rounded hover:bg-[var(--err-bg)] cursor-pointer"
                        style={{ color: 'var(--ink-muted)' }}
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>

        <DialogModal isOpen={expModalOpen} onClose={() => setExpModalOpen(false)} title="Enregistrer une dépense" maxWidth="sm">
          <form onSubmit={handleAddExpense} className="space-y-3.5">
            <Field label="Libellé de la dépense" required>
              <input type="text" required value={eLabel} onChange={(e) => setELabel(e.target.value)} placeholder="ex: Achat charbon ou carburant moto" style={inputBaseStyle} className={inputBaseClass} />
            </Field>
            <Field label="Catégorie">
              <select value={eCat} onChange={(e) => setECat(e.target.value as Expense['category'])} style={inputBaseStyle} className={inputBaseClass}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Montant (FCFA)" required>
                <input type="number" required min={100} step={100} value={eAmount} onChange={(e) => setEAmount(Number(e.target.value))} style={inputBaseStyle} className={`${inputBaseClass} tabular-nums`} />
              </Field>
              <Field label="Date">
                <input type="date" value={eDate} onChange={(e) => setEDate(e.target.value)} style={inputBaseStyle} className={inputBaseClass} />
              </Field>
            </div>
            <Field label="Moyen de paiement">
              <select value={eMethod} onChange={(e) => setEMethod(e.target.value as PaymentMethod)} style={inputBaseStyle} className={inputBaseClass}>
                <option value="ESPECES">Espèces</option>
                <option value="ORANGE_MONEY">Orange Money</option>
                <option value="MTN_MOMO">MTN MoMo</option>
              </select>
            </Field>
            <Field label="Note (optionnel)">
              <input type="text" value={eNotes} onChange={(e) => setENotes(e.target.value)} style={inputBaseStyle} className={inputBaseClass} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Btn type="button" variant="secondary" onClick={() => setExpModalOpen(false)}>
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

  // 3) SALARIES
  if (mode === 'salaries') {
    const totalPayroll = state.salaries.reduce((s, x) => s + x.netSalary, 0);
    const draftNet = Math.max(0, salBase + salComm + salBonus - salDed);

    return (
      <div className="space-y-6">
        <PageHeader
          title="Salaires & Fiches de Paie"
          description="Calculez les salaires (base, commissions, primes, déductions) et imprimez les bulletins."
          actions={
            <Btn
              variant="accent"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                const first = state.employees[0];
                if (first) {
                  setSalEmpId(first.id);
                  setSalBase(first.baseSalary);
                }
                setSalModalOpen(true);
              }}
            >
              Générer une fiche de paie
            </Btn>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KpiCard label="Total salaires versés" value={formatFCFA(totalPayroll)} icon={<CreditCard className="w-4 h-4" />} />
          <KpiCard label="Bulletins émis" value={state.salaries.length} />
        </div>

        <Surface padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr
                  className="border-b text-[11px] uppercase tracking-[0.05em]"
                  style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink-muted)', backgroundColor: 'var(--bg-subtle)' }}
                >
                  <th className="py-3 px-4 font-medium">Réf.</th>
                  <th className="py-3 px-4 font-medium">Employé</th>
                  <th className="py-3 px-4 font-medium">Période</th>
                  <th className="py-3 px-4 font-medium text-right">Base</th>
                  <th className="py-3 px-4 font-medium text-right">Primes & Comm.</th>
                  <th className="py-3 px-4 font-medium text-right">Déductions</th>
                  <th className="py-3 px-4 font-medium text-right">Net payé</th>
                  <th className="py-3 px-4 font-medium text-right">Bulletin</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
                {state.salaries.map((sl) => (
                  <tr key={sl.id} className="hover:bg-[var(--bg-subtle)]">
                    <td className="py-3.5 px-4 font-mono text-[12px] font-semibold">{sl.reference}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium">{sl.employeeName}</div>
                      <div className="text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                        {sl.employeeRole}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">{sl.month}</td>
                    <td className="py-3.5 px-4 text-right tabular-nums">{formatFCFA(sl.baseSalary)}</td>
                    <td className="py-3.5 px-4 text-right tabular-nums" style={{ color: 'var(--ok-text)' }}>
                      +{formatFCFA(sl.commission + sl.bonus)}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums" style={{ color: 'var(--err-text)' }}>
                      -{formatFCFA(sl.deduction)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold tabular-nums">{formatFCFA(sl.netSalary)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <Btn variant="secondary" size="xs" leftIcon={<Printer className="w-3.5 h-3.5" />} onClick={() => setPreviewSlip(sl)}>
                        Fiche
                      </Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>

        <DialogModal isOpen={salModalOpen} onClose={() => setSalModalOpen(false)} title="Créer une fiche de paie" maxWidth="md">
          <form onSubmit={handleCreateSalary} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Employé" required>
                <select
                  value={salEmpId}
                  onChange={(e) => {
                    setSalEmpId(e.target.value);
                    const emp = state.employees.find((x) => x.id === e.target.value);
                    if (emp) setSalBase(emp.baseSalary);
                  }}
                  style={inputBaseStyle}
                  className={inputBaseClass}
                >
                  {state.employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.fullName} ({e.role})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Mois concerné" required>
                <input type="text" required value={salMonth} onChange={(e) => setSalMonth(e.target.value)} style={inputBaseStyle} className={inputBaseClass} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Salaire de base (FCFA)">
                <input type="number" min={0} step={1000} value={salBase} onChange={(e) => setSalBase(Number(e.target.value))} style={inputBaseStyle} className={`${inputBaseClass} tabular-nums`} />
              </Field>
              <Field label="Commissions (FCFA)">
                <input type="number" min={0} step={500} value={salComm} onChange={(e) => setSalComm(Number(e.target.value))} style={inputBaseStyle} className={`${inputBaseClass} tabular-nums`} />
              </Field>
              <Field label="Primes (FCFA)">
                <input type="number" min={0} step={500} value={salBonus} onChange={(e) => setSalBonus(Number(e.target.value))} style={inputBaseStyle} className={`${inputBaseClass} tabular-nums`} />
              </Field>
              <Field label="Déductions / Avances (FCFA)">
                <input type="number" min={0} step={500} value={salDed} onChange={(e) => setSalDed(Number(e.target.value))} style={inputBaseStyle} className={`${inputBaseClass} tabular-nums`} />
              </Field>
            </div>
            <Field label="Mode de versement">
              <select value={salMethod} onChange={(e) => setSalMethod(e.target.value as PaymentMethod)} style={inputBaseStyle} className={inputBaseClass}>
                <option value="ESPECES">Espèces</option>
                <option value="ORANGE_MONEY">Orange Money</option>
                <option value="MTN_MOMO">MTN MoMo</option>
              </select>
            </Field>
            <div className="p-3.5 rounded-lg border flex items-center justify-between" style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}>
              <span className="font-medium text-[13px]">Net à payer</span>
              <span className="font-semibold text-[18px] tabular-nums">{formatFCFA(draftNet)}</span>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Btn type="button" variant="secondary" onClick={() => setSalModalOpen(false)}>
                Annuler
              </Btn>
              <Btn type="submit" variant="accent">
                Valider & Imprimer la fiche
              </Btn>
            </div>
          </form>
        </DialogModal>

        <SalarySlipModal slip={previewSlip} settings={state.settings} onClose={() => setPreviewSlip(null)} />
      </div>
    );
  }

  // 4) PARTIAL PAYMENTS
  const partialOrders = state.orders.filter((o) => o.paymentStatus === 'PARTIEL' || o.paymentStatus === 'IMPAYE');
  const totalDue = partialOrders.reduce((s, o) => s + Math.max(0, o.total - o.amountPaid), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paiements Partiels & En Attente"
        description="Suivez les acomptes clients, échéanciers et soldes restants à encaisser."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KpiCard label="Dossiers non soldés" value={partialOrders.length} tone={partialOrders.length > 0 ? 'warn' : 'ok'} />
        <KpiCard label="Montant total restant dû" value={formatFCFA(totalDue)} tone={totalDue > 0 ? 'warn' : 'ok'} />
      </div>

      {partialOrders.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="w-5 h-5" />}
          title="Aucun paiement en attente"
          description="Toutes les commandes enregistrées au restaurant sont intégralement soldées."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {partialOrders.map((ord) => {
            const remaining = Math.max(0, ord.total - ord.amountPaid);
            const pct = ord.total > 0 ? Math.round((ord.amountPaid / ord.total) * 100) : 0;

            return (
              <Surface key={ord.id} hoverable className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-[14px]">{ord.orderNumber}</span>
                      <StatusPill tone={ord.paymentStatus === 'PARTIEL' ? 'warn' : 'err'}>
                        {ord.paymentStatus === 'PARTIEL' ? 'Paiement partiel' : 'Impayé'}
                      </StatusPill>
                    </div>
                    <div className="text-[13px] font-medium mt-1">{ord.customerName}</div>
                    <div className="text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                      {formatShortDateTime(ord.createdAt)} · {channelLabel(ord.channel)}
                    </div>
                  </div>
                  <div className="text-right tabular-nums">
                    <div className="text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                      Reste à payer
                    </div>
                    <div className="text-[17px] font-semibold" style={{ color: 'var(--warn-text)' }}>
                      {formatFCFA(remaining)}
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[12px] tabular-nums">
                    <span style={{ color: 'var(--ink-muted)' }}>Versé : {formatFCFA(ord.amountPaid)}</span>
                    <span>Total : {formatFCFA(ord.total)} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: 'var(--accent)' }} />
                  </div>
                </div>

                {/* Installments history */}
                {ord.payments.length > 0 && (
                  <div className="p-3 rounded-lg border text-[12px] space-y-1.5" style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}>
                    <div className="text-[11px] uppercase tracking-wider font-medium" style={{ color: 'var(--ink-muted)' }}>
                      Versements reçus
                    </div>
                    {ord.payments.map((p) => (
                      <div key={p.id} className="flex justify-between">
                        <span>
                          {formatShortDateTime(p.date)} · {paymentMethodLabel(p.method)}
                        </span>
                        <span className="font-semibold tabular-nums">{formatFCFA(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end">
                  <Btn
                    variant="accent"
                    size="sm"
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setPayModalOrder(ord);
                      setPayAmount(remaining);
                      setPayMethod('ORANGE_MONEY');
                    }}
                  >
                    Enregistrer un versement
                  </Btn>
                </div>
              </Surface>
            );
          })}
        </div>
      )}

      <DialogModal
        isOpen={Boolean(payModalOrder)}
        onClose={() => setPayModalOrder(null)}
        title={`Enregistrer un versement — ${payModalOrder?.orderNumber || ''}`}
        maxWidth="sm"
      >
        {payModalOrder && (
          <form onSubmit={handleRecordInstallment} className="space-y-3.5">
            <Field label="Montant versé (FCFA)" required>
              <input
                type="number"
                required
                min={1}
                max={Math.max(1, payModalOrder.total - payModalOrder.amountPaid)}
                value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value))}
                style={inputBaseStyle}
                className={`${inputBaseClass} tabular-nums font-semibold`}
              />
            </Field>
            <Field label="Moyen de paiement">
              <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)} style={inputBaseStyle} className={inputBaseClass}>
                <option value="ESPECES">Espèces</option>
                <option value="ORANGE_MONEY">Orange Money</option>
                <option value="MTN_MOMO">MTN MoMo</option>
              </select>
            </Field>
            <Field label="Note / Référence">
              <input type="text" value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Ex: Solde réglé à la livraison" style={inputBaseStyle} className={inputBaseClass} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Btn type="button" variant="secondary" onClick={() => setPayModalOrder(null)}>
                Annuler
              </Btn>
              <Btn type="submit" variant="primary">
                Valider le versement
              </Btn>
            </div>
          </form>
        )}
      </DialogModal>
    </div>
  );
};
