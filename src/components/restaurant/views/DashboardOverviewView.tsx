import {
  AlertTriangle,
  ArrowRight,
  ChefHat,
  CreditCard,
  ShoppingCart,
  TrendingUp,
  Truck,
  Utensils,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useErp } from '../../../store/erp.context';
import type { NavModuleId } from '../../../types/erp';
import { formatFCFA } from '../../../utils/currency';
import { PaymentMethodMark } from '../../common/PaymentBrandLogos';
import {
  Btn,
  KpiCard,
  PageHeader,
  StatusPill,
  Surface,
  channelLabel,
  formatShortDateTime,
  kitchenStatusMeta,
  paymentStatusMeta,
} from '../ui/Primitives';

interface DashboardOverviewViewProps {
  onNavigate: (module: NavModuleId) => void;
}

export const DashboardOverviewView: React.FC<DashboardOverviewViewProps> = ({ onNavigate }) => {
  const { state } = useErp();
  const [hoveredHour, setHoveredHour] = useState<string | null>(null);

  const metrics = useMemo(() => {
    const validOrders = state.orders.filter((o) => o.kitchenStatus !== 'ANNULEE');
    const totalSales = validOrders.reduce((s, o) => s + o.total, 0);
    const totalCollected = validOrders.reduce((s, o) => s + o.amountPaid, 0);
    const totalExpenses = state.expenses.reduce((s, e) => s + e.amount, 0);
    const avgBasket = validOrders.length > 0 ? Math.round(totalSales / validOrders.length) : 0;
    const unpaidAmount = validOrders.reduce((s, o) => s + Math.max(0, o.total - o.amountPaid), 0);
    const activeKitchen = validOrders.filter((o) =>
      ['NOUVELLE', 'EN_PREPARATION', 'PRETE'].includes(o.kitchenStatus)
    ).length;

    const channels = {
      SUR_PLACE: validOrders.filter((o) => o.channel === 'SUR_PLACE').length,
      EMPORTER: validOrders.filter((o) => o.channel === 'EMPORTER').length,
      LIVRAISON: validOrders.filter((o) => o.channel === 'LIVRAISON').length,
    };

    const paymentBreakdown = {
      ESPECES: 0,
      ORANGE_MONEY: 0,
      MTN_MOMO: 0,
    };
    for (const ord of validOrders) {
      for (const p of ord.payments) {
        paymentBreakdown[p.method] += p.amount;
      }
    }

    const lowStockItems = state.stockItems.filter((s) => s.quantity <= s.minQuantity);
    const occupiedTables = state.tables.filter((t) => t.status === 'OCCUPEE').length;

    return {
      totalSales,
      totalCollected,
      totalExpenses,
      netProfit: totalCollected - totalExpenses,
      ordersCount: validOrders.length,
      avgBasket,
      unpaidAmount,
      activeKitchen,
      channels,
      paymentBreakdown,
      lowStockItems,
      occupiedTables,
    };
  }, [state.orders, state.expenses, state.stockItems, state.tables]);

  // Hourly rhythm preview (realistic Maroua restaurant service hours 09h-21h)
  const hourlySeries = [
    { h: '09h', v: 18, amount: 14500, orders: 3 },
    { h: '11h', v: 32, amount: 28000, orders: 5 },
    { h: '13h', v: 82, amount: 74500, orders: 11 },
    { h: '15h', v: 45, amount: 39000, orders: 6 },
    { h: '17h', v: 38, amount: 31200, orders: 5 },
    { h: '19h', v: 92, amount: 88400, orders: 13 },
    { h: '21h', v: 66, amount: 61500, orders: 9 },
  ];

  const maxChannel = Math.max(1, metrics.ordersCount);
  const totalPayments = Math.max(
    1,
    metrics.paymentBreakdown.ESPECES +
    metrics.paymentBreakdown.ORANGE_MONEY +
    metrics.paymentBreakdown.MTN_MOMO
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        description={`Vue d’ensemble opérationnelle — ${state.settings.name}, ${state.settings.city}`}
        actions={
          <>
            <Btn variant="secondary" leftIcon={<ChefHat className="w-4 h-4" />} onClick={() => onNavigate('kds')}>
              Cuisine ({metrics.activeKitchen})
            </Btn>
            <Btn variant="accent" leftIcon={<ShoppingCart className="w-4 h-4" />} onClick={() => onNavigate('pos')}>
              Ouvrir la Caisse
            </Btn>
          </>
        }
      />

      {/* Primary KPI Row (with refined lift hover) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Chiffre d’affaires"
          value={formatFCFA(metrics.totalSales)}
          helper={`${formatFCFA(metrics.totalCollected)} encaissés`}
          icon={<TrendingUp className="w-4 h-4" />}
          tone="ok"
          onClick={() => onNavigate('reports')}
        />
        <KpiCard
          label="Commandes enregistrées"
          value={metrics.ordersCount}
          helper={`Panier moyen : ${formatFCFA(metrics.avgBasket)}`}
          icon={<ShoppingCart className="w-4 h-4" />}
          onClick={() => onNavigate('history')}
        />
        <KpiCard
          label="Solde à encaisser"
          value={formatFCFA(metrics.unpaidAmount)}
          helper={metrics.unpaidAmount > 0 ? 'Impayés & paiements partiels' : 'Toutes les commandes réglées'}
          icon={<CreditCard className="w-4 h-4" />}
          tone={metrics.unpaidAmount > 0 ? 'warn' : 'ok'}
          onClick={() => onNavigate('partial_payments')}
        />
        <KpiCard
          label="Salle & Tables"
          value={`${metrics.occupiedTables} / ${state.tables.length}`}
          helper={`${state.reservations.filter((r) => r.status === 'CONFIRMEE').length} réservation(s) confirmée(s)`}
          icon={<Utensils className="w-4 h-4" />}
          onClick={() => onNavigate('tables')}
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 8 cols */}
        <div className="lg:col-span-8 space-y-5">
          {/* Activity Rhythm Chart with interactive bar hover tooltips */}
          <Surface hoverable>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[14.5px] font-semibold">Affluence par tranche horaire</h2>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                  Survolez une tranche pour afficher le détail du service à Maroua
                </p>
              </div>
              <Btn
                variant="ghost"
                size="xs"
                rightIcon={<ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />}
                onClick={() => onNavigate('reports')}
                className="group"
              >
                Rapports complets
              </Btn>
            </div>

            <div className="grid grid-cols-7 gap-3 items-end h-52 pt-10">
              {hourlySeries.map((pt) => {
                const isPeak = pt.v >= 75;
                const isHovered = hoveredHour === pt.h;
                return (
                  <div
                    key={pt.h}
                    onMouseEnter={() => setHoveredHour(pt.h)}
                    onMouseLeave={() => setHoveredHour(null)}
                    className="flex flex-col items-center gap-2 h-full justify-end relative cursor-pointer group"
                  >
                    {/* Floating hover tooltip */}
                    <div
                      style={{
                        backgroundColor: 'var(--ink-primary)',
                        color: 'var(--ink-inverse)',
                        opacity: isHovered ? 1 : 0,
                        transform: isHovered ? 'translateY(0)' : 'translateY(6px)',
                      }}
                      className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-md text-[11px] font-medium tabular-nums shadow-md transition-all duration-150 z-10"
                    >
                      {formatFCFA(pt.amount)} · {pt.orders} cmd
                    </div>

                    <div className="w-full max-w-[44px] flex-1 flex items-end">
                      <div
                        className="w-full rounded-t-md transition-all duration-200"
                        style={{
                          height: `${pt.v}%`,
                          backgroundColor: isHovered || isPeak ? 'var(--accent)' : 'var(--bg-hover)',
                          opacity: hoveredHour && !isHovered ? 0.55 : 1,
                          transform: isHovered ? 'scaleY(1.03)' : 'scaleY(1)',
                          transformOrigin: 'bottom',
                          border: `1px solid ${isHovered || isPeak ? 'var(--accent)' : 'var(--border-hairline)'}`,
                        }}
                      />
                    </div>
                    <span
                      className="text-[11.5px] tabular-nums transition-colors"
                      style={{
                        color: isHovered ? 'var(--ink-primary)' : 'var(--ink-muted)',
                        fontWeight: isHovered ? 600 : 400,
                      }}
                    >
                      {pt.h}
                    </span>
                  </div>
                );
              })}
            </div>
          </Surface>

          {/* Recent Orders Table */}
          <Surface padding="none" hoverable>
            <div
              className="px-5 py-4 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--border-hairline)' }}
            >
              <div>
                <h2 className="text-[14.5px] font-semibold">Dernières commandes</h2>
                <p className="text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                  Synchronisation en temps réel Caisse POS & QR Tables
                </p>
              </div>
              <Btn variant="ghost" size="xs" rightIcon={<ArrowRight className="w-3.5 h-3.5" />} onClick={() => onNavigate('billing')}>
                Tout voir
              </Btn>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr
                    className="border-b text-[11px] uppercase tracking-[0.05em]"
                    style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink-muted)', backgroundColor: 'var(--bg-subtle)' }}
                  >
                    <th className="py-2.5 px-5 font-medium">Commande</th>
                    <th className="py-2.5 px-4 font-medium">Client & Canal</th>
                    <th className="py-2.5 px-4 font-medium">Cuisine</th>
                    <th className="py-2.5 px-4 font-medium">Paiement</th>
                    <th className="py-2.5 px-5 font-medium text-right">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
                  {state.orders.slice(0, 6).map((ord) => {
                    const kMeta = kitchenStatusMeta(ord.kitchenStatus);
                    const pMeta = paymentStatusMeta(ord.paymentStatus);
                    return (
                      <tr
                        key={ord.id}
                        className="group hover:bg-[var(--bg-subtle)] transition-colors duration-150 cursor-pointer"
                        onClick={() => onNavigate('billing')}
                      >
                        <td className="py-3 px-5">
                          <div className="font-mono font-medium text-[12.5px] transition-colors group-hover:text-[var(--accent)]">
                            {ord.orderNumber}
                          </div>
                          <div className="text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                            {formatShortDateTime(ord.createdAt)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium truncate max-w-[180px]">{ord.customerName}</div>
                          <div className="text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                            {channelLabel(ord.channel)}
                            {ord.tableNumber ? ` · ${ord.tableNumber}` : ''}
                            {ord.deliveryNeighborhood ? ` · ${ord.deliveryNeighborhood}` : ''}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <StatusPill tone={kMeta.tone}>{kMeta.label}</StatusPill>
                        </td>
                        <td className="py-3 px-4">
                          <StatusPill tone={pMeta.tone}>{pMeta.label}</StatusPill>
                        </td>
                        <td className="py-3 px-5 text-right font-semibold tabular-nums">
                          {formatFCFA(ord.total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Surface>
        </div>

        {/* Right 4 cols */}
        <div className="lg:col-span-4 space-y-5">
          {/* Channels Split */}
          <Surface hoverable>
            <h2 className="text-[14.5px] font-semibold mb-4">Répartition des ventes</h2>
            <div className="space-y-3">
              {(
                [
                  { label: 'Sur place (Salle)', count: metrics.channels.SUR_PLACE },
                  { label: 'Livraison Maroua', count: metrics.channels.LIVRAISON },
                  { label: 'À emporter', count: metrics.channels.EMPORTER },
                ] as const
              ).map((row) => {
                const pct = Math.round((row.count / maxChannel) * 100);
                return (
                  <div
                    key={row.label}
                    className="space-y-1.5 p-2 -mx-2 rounded-lg transition-colors duration-150 hover:bg-[var(--bg-subtle)]"
                  >
                    <div className="flex items-center justify-between text-[12.5px]">
                      <span style={{ color: 'var(--ink-secondary)' }}>{row.label}</span>
                      <span className="font-medium tabular-nums">
                        {row.count} <span style={{ color: 'var(--ink-muted)' }}>({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%`, backgroundColor: 'var(--ink-primary)' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Surface>

          {/* Payment Methods Breakdown with official logos */}
          <Surface hoverable>
            <h2 className="text-[14.5px] font-semibold mb-3.5">Encaissements par moyen</h2>
            <div className="space-y-1.5">
              {(['ORANGE_MONEY', 'ESPECES', 'MTN_MOMO'] as const).map((method) => {
                const amt = metrics.paymentBreakdown[method];
                const pct = Math.round((amt / totalPayments) * 100);
                return (
                  <div
                    key={method}
                    className="flex items-center justify-between text-[12.5px] p-2 -mx-2 rounded-lg transition-colors duration-150 hover:bg-[var(--bg-subtle)]"
                  >
                    <div className="flex items-center gap-2" style={{ color: 'var(--ink-secondary)' }}>
                      <PaymentMethodMark method={method} size="xs" showLabel />
                    </div>
                    <div className="tabular-nums font-medium">
                      {formatFCFA(amt)} <span className="text-[11px]" style={{ color: 'var(--ink-muted)' }}>({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Surface>

          {/* Stock Alerts */}
          <Surface hoverable>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-[14.5px] font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" style={{ color: 'var(--warn-dot)' }} />
                Alertes de stock
              </h2>
              <Btn variant="ghost" size="xs" onClick={() => onNavigate('purchases')}>
                Commander
              </Btn>
            </div>

            {metrics.lowStockItems.length === 0 ? (
              <p className="text-[12.5px]" style={{ color: 'var(--ink-muted)' }}>
                Tous vos stocks sont au-dessus des seuils minimums.
              </p>
            ) : (
              <div className="space-y-2">
                {metrics.lowStockItems.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate('stock')}
                    className="w-full text-left flex items-center justify-between p-2.5 rounded-lg border text-[12.5px] transition-all duration-150 hover:-translate-y-0.5 cursor-pointer"
                    style={{ borderColor: 'var(--warn-border)', backgroundColor: 'var(--warn-bg)' }}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-medium truncate" style={{ color: 'var(--ink-primary)' }}>
                        {item.name}
                      </div>
                      <div className="text-[11px]" style={{ color: 'var(--warn-text)' }}>
                        Seuil min : {item.minQuantity} {item.unit}
                      </div>
                    </div>
                    <span className="font-semibold tabular-nums shrink-0" style={{ color: 'var(--warn-text)' }}>
                      {item.quantity} {item.unit}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 pt-3.5 border-t flex items-center justify-between text-[12px]" style={{ borderColor: 'var(--border-hairline)' }}>
              <span className="flex items-center gap-1.5" style={{ color: 'var(--ink-muted)' }}>
                <Truck className="w-3.5 h-3.5" />
                {state.orders.filter((o) => o.channel === 'LIVRAISON' && o.deliveryStatus !== 'LIVREE').length} livraison(s) active(s)
              </span>
              <button
                type="button"
                onClick={() => onNavigate('deliveries')}
                className="font-medium hover:underline cursor-pointer"
                style={{ color: 'var(--accent)' }}
              >
                Suivre →
              </button>
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
};
