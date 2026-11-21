import {
  AlertCircle,
  CheckCircle2,
  ChefHat,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';
import React from 'react';
import { useOrders } from '../../hooks/useOrders';
import type { OrderStatus } from '../../types/order';

export type FilterStatus = OrderStatus | 'ALL' | 'ACTIVE';

interface OrderStatsBarProps {
  currentFilter: FilterStatus;
  onSelectFilter: (filter: FilterStatus) => void;
}

export const OrderStatsBar: React.FC<OrderStatsBarProps> = ({
  currentFilter,
  onSelectFilter,
}) => {
  const { stats, orders } = useOrders();

  const cards = [
    {
      id: 'PENDING' as FilterStatus,
      label: 'Nouvelles',
      count: stats.pendingCount,
      icon: <AlertCircle className="w-5 h-5 text-amber-500" />,
      badgeBg: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      activeBorder: 'border-amber-500 ring-2 ring-amber-500/20',
      isPulsing: stats.pendingCount > 0,
    },
    {
      id: 'IN_PREPARATION' as FilterStatus,
      label: 'En préparation',
      count: stats.inPreparationCount,
      icon: <ChefHat className="w-5 h-5 text-purple-500" />,
      badgeBg: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      activeBorder: 'border-purple-500 ring-2 ring-purple-500/20',
      isPulsing: false,
    },
    {
      id: 'READY' as FilterStatus,
      label: 'Prêtes au passe',
      count: stats.readyCount,
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      badgeBg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20',
      isPulsing: false,
    },
    {
      id: 'COMPLETED' as FilterStatus,
      label: 'Terminées',
      count: stats.completedCount,
      icon: <Sparkles className="w-5 h-5 text-slate-500" />,
      badgeBg: 'bg-slate-100 text-slate-600 border-slate-200',
      activeBorder: 'border-slate-500 ring-2 ring-slate-500/20',
      isPulsing: false,
    },
  ];

  return (
    <div className="space-y-3">
      {/* 4 Cartes de statut KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((card) => {
          const isSelected = currentFilter === card.id;
          return (
            <button
              key={card.id}
              onClick={() => onSelectFilter(card.id)}
              className={`p-4 rounded-2xl bg-white border text-left transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer ${
                isSelected ? card.activeBorder : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {card.label}
                </span>
                <div className="p-1.5 rounded-xl bg-slate-50 border border-slate-100">
                  {card.icon}
                </div>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {card.count}
                </span>
                {card.isPulsing && (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                    Action requise
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Tabs filtres rapides */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2">
        <button
          onClick={() => onSelectFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
            currentFilter === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Toutes ({orders.length})</span>
        </button>

        <button
          onClick={() => onSelectFilter('ACTIVE')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
            currentFilter === 'ACTIVE'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>En cours actives ({stats.totalActiveCount})</span>
        </button>
      </div>
    </div>
  );
};
