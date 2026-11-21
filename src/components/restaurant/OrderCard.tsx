import {
  Check,
  ChefHat,
  Clock,
  MessageSquare,
  QrCode,
  ShoppingBag,
  Utensils,
  X,
} from 'lucide-react';
import React from 'react';
import type { Order } from '../../types/order';
import { formatFCFA } from '../../utils/currency';
import { formatOrderTime, formatTimeAgo } from '../../utils/date';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../ui/Button';

interface OrderCardProps {
  order: Order;
  onOpenDetails: (order: Order) => void;
  onAccept: (orderId: string, e: React.MouseEvent) => void;
  onRefuse: (order: Order, e: React.MouseEvent) => void;
  onStartPreparation: (orderId: string, e: React.MouseEvent) => void;
  onMarkReady: (orderId: string, e: React.MouseEvent) => void;
  onMarkCompleted: (orderId: string, e: React.MouseEvent) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onOpenDetails,
  onAccept,
  onRefuse,
  onStartPreparation,
  onMarkReady,
  onMarkCompleted,
}) => {
  const isPending = order.status === 'PENDING';
  const isAccepted = order.status === 'ACCEPTED';
  const isInPrep = order.status === 'IN_PREPARATION';
  const isReady = order.status === 'READY';
  const isCompleted = order.status === 'COMPLETED';

  return (
    <div
      onClick={() => onOpenDetails(order)}
      className={`rounded-2xl border bg-white p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between ${
        isPending
          ? 'border-amber-400/90 ring-2 ring-amber-500/20 bg-amber-50/20'
          : isReady
          ? 'border-emerald-300 bg-emerald-50/20'
          : 'border-slate-200/80 hover:border-slate-300'
      }`}
    >
      <div>
        {/* Header: Numéro, Statut, Heure */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 text-base sm:text-lg tracking-tight">
                {order.orderNumber}
              </span>
              <StatusBadge status={order.status} view="restaurant" size="sm" />
            </div>

            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatOrderTime(order.createdAt)}</span>
              <span>•</span>
              <span>{formatTimeAgo(order.createdAt)}</span>
            </div>
          </div>

          {/* Source badge (QR / Direct) */}
          <span
            className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 shrink-0"
            title={order.source}
          >
            {order.source === 'QR_TABLE' ? (
              <>
                <QrCode className="w-3 h-3 text-amber-600" />
                <span>QR</span>
              </>
            ) : (
              <span>Web</span>
            )}
          </span>
        </div>

        {/* Contexte & Client */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Table / Emporter */}
          <div className="flex items-center gap-1.5 font-bold text-slate-800 bg-slate-100/80 px-2.5 py-1 rounded-lg">
            {order.context.type === 'TABLE' ? (
              <>
                <Utensils className="w-3.5 h-3.5 text-amber-600" />
                <span>{order.context.tableName || `Table ${order.context.tableNumber}`}</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
                <span>À emporter</span>
              </>
            )}
          </div>

          {/* Client Name */}
          <span className="font-semibold text-slate-600 truncate max-w-[150px]">
            {order.customer.name}
          </span>
        </div>

        {/* Aperçu des plats */}
        <div className="mt-3 space-y-1 bg-slate-50/70 rounded-xl p-2.5 text-xs text-slate-700">
          {order.items.slice(0, 3).map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="truncate pr-2">
                <span className="font-bold text-slate-900 mr-1.5">{item.quantity}×</span>
                <span>{item.name}</span>
              </div>
              <span className="font-medium text-slate-500 shrink-0">
                {formatFCFA(item.totalPrice)}
              </span>
            </div>
          ))}
          {order.items.length > 3 && (
            <p className="text-[11px] text-slate-400 font-medium italic pt-0.5">
              +{order.items.length - 3} autre{order.items.length - 3 > 1 ? 's' : ''} plat{order.items.length - 3 > 1 ? 's' : ''}...
            </p>
          )}
        </div>

        {/* Note spéciale éventuelle */}
        {order.customer.notes && (
          <div className="mt-2 text-[11px] text-amber-900 bg-amber-50/80 rounded-lg p-2 flex items-start gap-1.5 border border-amber-200/50">
            <MessageSquare className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
            <span className="italic truncate">Note: « {order.customer.notes} »</span>
          </div>
        )}
      </div>

      {/* Footer: Montant total & Actions contextuelles selon machine d'état */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total</span>
          <span className="font-black text-sm sm:text-base text-slate-900">
            {formatFCFA(order.total)}
          </span>
        </div>

        {/* Boutons d'action rapides */}
        <div className="flex items-center gap-1.5">
          {isPending && (
            <>
              <button
                onClick={(e) => onRefuse(order, e)}
                className="px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all cursor-pointer"
                title="Refuser"
              >
                <X className="w-4 h-4" />
              </button>
              <Button
                variant="success"
                size="sm"
                onClick={(e) => onAccept(order.id, e)}
                leftIcon={<Check className="w-3.5 h-3.5" />}
              >
                Accepter
              </Button>
            </>
          )}

          {isAccepted && (
            <Button
              variant="primary"
              size="sm"
              onClick={(e) => onStartPreparation(order.id, e)}
              leftIcon={<ChefHat className="w-3.5 h-3.5" />}
            >
              En cuisine
            </Button>
          )}

          {isInPrep && (
            <Button
              variant="success"
              size="sm"
              onClick={(e) => onMarkReady(order.id, e)}
              leftIcon={<Check className="w-3.5 h-3.5" />}
            >
              Marquer Prête
            </Button>
          )}

          {isReady && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => onMarkCompleted(order.id, e)}
              leftIcon={<Check className="w-3.5 h-3.5" />}
            >
              Terminer
            </Button>
          )}

          {isCompleted && (
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
              <Check className="w-4 h-4 text-emerald-500" />
              Clôturée
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
