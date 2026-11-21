import {
  AlertTriangle,
  CheckCircle2,
  ChefHat,
  Clock,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';
import React from 'react';
import type { Order, OrderStatus } from '../../types/order';
import { CLIENT_STATUS_LABELS } from '../../types/order';
import { formatFCFA } from '../../utils/currency';
import { formatOrderTime } from '../../utils/date';
import { StatusBadge } from '../common/StatusBadge';

interface OrderStatusTrackerProps {
  order: Order;
}

interface StepInfo {
  status: OrderStatus;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
}

export const OrderStatusTracker: React.FC<OrderStatusTrackerProps> = ({ order }) => {
  const steps: StepInfo[] = [
    {
      status: 'PENDING',
      label: '1. Commande reçue',
      sublabel: 'Transmise instantanément au restaurant',
      icon: <Clock className="w-5 h-5" />,
    },
    {
      status: 'ACCEPTED',
      label: '2. Acceptée',
      sublabel: 'Validée par le responsable de salle',
      icon: <CheckCircle2 className="w-5 h-5" />,
    },
    {
      status: 'IN_PREPARATION',
      label: '3. En préparation',
      sublabel: 'En cours de cuisson par le chef',
      icon: <ChefHat className="w-5 h-5" />,
    },
    {
      status: 'READY',
      label: '4. Prête',
      sublabel: 'Dressée et en route vers votre table',
      icon: <UtensilsCrossed className="w-5 h-5" />,
    },
    {
      status: 'COMPLETED',
      label: '5. Terminée',
      sublabel: 'Servie ! Bon appétit',
      icon: <Sparkles className="w-5 h-5" />,
    },
  ];

  const currentStepIndex = CLIENT_STATUS_LABELS[order.status]?.stepIndex || 1;
  const isRefused = order.status === 'REFUSED';
  const isCancelled = order.status === 'CANCELLED';

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
      {/* Header Banner */}
      <div
        className={`p-6 text-white ${
          isRefused || isCancelled
            ? 'bg-rose-900'
            : order.status === 'READY' || order.status === 'COMPLETED'
            ? 'bg-emerald-900'
            : 'bg-slate-900'
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-amber-400">
              Suivi de commande en direct
            </span>
            <h2 className="text-2xl font-black mt-0.5 tracking-tight">
              {order.orderNumber}
            </h2>
          </div>
          <StatusBadge status={order.status} view="client" size="md" />
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-y-2 justify-between text-xs text-slate-300">
          <div>
            <span>Contexte : </span>
            <strong className="text-white">
              {order.context.type === 'TABLE'
                ? order.context.tableName || `Table ${order.context.tableNumber}`
                : 'À emporter'}
            </strong>
          </div>
          <div>
            <span>Heure : </span>
            <strong className="text-white">{formatOrderTime(order.createdAt)}</strong>
          </div>
          <div>
            <span>Total : </span>
            <strong className="text-amber-400 font-bold">{formatFCFA(order.total)}</strong>
          </div>
        </div>
      </div>

      {/* Rejection / Cancellation Alert */}
      {(isRefused || isCancelled) && (
        <div className="m-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-rose-900 text-sm">
              {isRefused ? 'Commande refusée par le restaurant' : 'Commande annulée'}
            </h4>
            <p className="text-xs text-rose-700 mt-1">
              {order.rejectionReason ||
                'Le restaurant ne peut pas honorer cette commande actuellement. Veuillez vous adresser à un serveur.'}
            </p>
          </div>
        </div>
      )}

      {/* Main Stepper Timeline */}
      {!isRefused && !isCancelled && (
        <div className="p-6">
          <div className="relative pl-8 space-y-8 before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {steps.map((step, index) => {
              const stepNumber = index + 1;
              const isPast = stepNumber < currentStepIndex;
              const isCurrent = stepNumber === currentStepIndex;

              return (
                <div key={step.status} className="relative flex items-start gap-4">
                  {/* Step Dot / Icon */}
                  <div
                    className={`absolute -left-8 flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all duration-300 ${
                      isPast
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isCurrent
                        ? 'bg-amber-600 text-white ring-4 ring-amber-500/20 shadow-md animate-soft-pulse'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : step.icon}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between">
                      <h4
                        className={`text-sm font-bold ${
                          isCurrent
                            ? 'text-amber-700 font-extrabold'
                            : isPast
                            ? 'text-slate-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {step.label}
                      </h4>
                      {isCurrent && (
                        <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                          En cours
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs mt-0.5 ${
                        isCurrent
                          ? 'text-slate-700 font-medium'
                          : isPast
                          ? 'text-slate-500'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.sublabel}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recap of Ordered Items */}
      <div className="p-6 bg-slate-50/80 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Articles de votre commande
        </h4>
        <div className="space-y-2">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-xs py-1.5 border-b border-slate-200/50 last:border-0"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 bg-white border border-slate-200 px-1.5 py-0.5 rounded-md">
                  {item.quantity}×
                </span>
                <span className="text-slate-700 font-medium">{item.name}</span>
              </div>
              <span className="font-semibold text-slate-900">
                {formatFCFA(item.totalPrice)}
              </span>
            </div>
          ))}
        </div>

        {order.customer.notes && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/40 text-xs text-amber-900">
            <strong>Votre note : </strong> « {order.customer.notes} »
          </div>
        )}
      </div>
    </div>
  );
};
