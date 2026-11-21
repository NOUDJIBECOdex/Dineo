import {
  Check,
  ChefHat,
  Clock,
  History,
  MessageSquare,
  Phone,
  QrCode,
  ShoppingBag,
  User,
  Utensils,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import type { Order } from '../../types/order';
import { formatFCFA } from '../../utils/currency';
import { formatOrderTime, formatTimeAgo } from '../../utils/date';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onAccept: (orderId: string) => void;
  onRefuse: (orderId: string, reason: string) => void;
  onStartPreparation: (orderId: string) => void;
  onMarkReady: (orderId: string) => void;
  onMarkCompleted: (orderId: string) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  isOpen,
  onClose,
  onAccept,
  onRefuse,
  onStartPreparation,
  onMarkReady,
  onMarkCompleted,
}) => {
  const [isRefuseDialogOpen, setIsRefuseDialogOpen] = useState(false);
  const [refusalReason, setRefusalReason] = useState('Plats en rupture de stock');

  if (!order) return null;

  const handleRefuseConfirm = () => {
    onRefuse(order.id, refusalReason);
    setIsRefuseDialogOpen(false);
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} maxWidth="lg">
        <div className="space-y-6">
          {/* Header de la commande */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  {order.orderNumber}
                </h2>
                <StatusBadge status={order.status} view="restaurant" size="md" />
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Reçue à {formatOrderTime(order.createdAt)} ({formatTimeAgo(order.createdAt)})
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  {order.source === 'QR_TABLE' ? (
                    <>
                      <QrCode className="w-3 h-3 text-amber-600" />
                      <span>Scan QR Table</span>
                    </>
                  ) : (
                    <span>Lien direct</span>
                  )}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-bold text-slate-400 uppercase block">Total</span>
              <span className="text-xl font-black text-slate-900">
                {formatFCFA(order.total)}
              </span>
            </div>
          </div>

          {/* Client & Contexte Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 rounded-2xl p-4 border border-slate-200/70 text-xs">
            {/* Table / Emporter */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
                {order.context.type === 'TABLE' ? (
                  <Utensils className="w-4 h-4" />
                ) : (
                  <ShoppingBag className="w-4 h-4" />
                )}
              </div>
              <div>
                <span className="font-semibold text-slate-400 block text-[10px] uppercase">
                  Destination
                </span>
                <strong className="text-slate-900 text-sm">
                  {order.context.type === 'TABLE'
                    ? order.context.tableName || `Table ${order.context.tableNumber}`
                    : 'Commande à emporter'}
                </strong>
              </div>
            </div>

            {/* Nom client & Téléphone */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-700 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-slate-400 block text-[10px] uppercase">
                  Client
                </span>
                <div className="flex items-center gap-2">
                  <strong className="text-slate-900 text-sm">{order.customer.name}</strong>
                  {order.customer.phone && (
                    <a
                      href={`tel:${order.customer.phone}`}
                      className="text-blue-600 hover:underline flex items-center gap-0.5 text-[11px]"
                    >
                      <Phone className="w-3 h-3" />
                      {order.customer.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Note cuisine si présente */}
          {order.customer.notes && (
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200/70 text-xs text-amber-900 flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Instructions spéciales : </strong>
                <span>« {order.customer.notes} »</span>
              </div>
            </div>
          )}

          {/* Liste détaillée des articles */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Détail des plats commandés ({order.items.length})
            </h3>
            <div className="border border-slate-200/80 rounded-2xl overflow-hidden divide-y divide-slate-100">
              {order.items.map((item) => (
                <div key={item.id} className="p-3.5 flex items-start justify-between gap-4 text-xs sm:text-sm">
                  <div className="flex items-start gap-3">
                    <span className="font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md text-xs mt-0.5">
                      {item.quantity}×
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900">{item.name}</h4>
                      {item.selectedChoices && item.selectedChoices.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.selectedChoices.map((c) => (
                            <span
                              key={c.choiceId}
                              className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                            >
                              {c.choiceName}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.specialInstructions && (
                        <p className="text-[10px] text-amber-800 italic mt-0.5">
                          « {item.specialInstructions} »
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="font-bold text-slate-900 shrink-0">
                    {formatFCFA(item.totalPrice)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Historique du statut (Audit Trail) */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span>Historique des étapes</span>
            </h3>
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/70 space-y-2">
              {order.statusHistory.map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="font-bold text-slate-800">{entry.status}</span>
                    {entry.note && <span className="text-slate-500">— {entry.note}</span>}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {formatOrderTime(entry.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Boutons d'actions selon la machine d'état */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2.5">
            {order.status === 'PENDING' && (
              <>
                <Button
                  variant="danger"
                  size="md"
                  onClick={() => setIsRefuseDialogOpen(true)}
                  leftIcon={<X className="w-4 h-4" />}
                >
                  Refuser la commande
                </Button>
                <Button
                  variant="success"
                  size="md"
                  onClick={() => {
                    onAccept(order.id);
                    onClose();
                  }}
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  Accepter la commande
                </Button>
              </>
            )}

            {order.status === 'ACCEPTED' && (
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  onStartPreparation(order.id);
                  onClose();
                }}
                leftIcon={<ChefHat className="w-4 h-4" />}
              >
                Lancer la préparation en cuisine
              </Button>
            )}

            {order.status === 'IN_PREPARATION' && (
              <Button
                variant="success"
                size="md"
                onClick={() => {
                  onMarkReady(order.id);
                  onClose();
                }}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Marquer comme Prête au passe
              </Button>
            )}

            {order.status === 'READY' && (
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  onMarkCompleted(order.id);
                  onClose();
                }}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Terminer et clôturer la commande
              </Button>
            )}

            <Button variant="outline" size="md" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Boîte de dialogue de refus avec choix du motif */}
      <Modal
        isOpen={isRefuseDialogOpen}
        onClose={() => setIsRefuseDialogOpen(false)}
        title="Refuser la commande"
        description="Indiquez le motif du refus qui sera communiqué au client de manière transparente."
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            {[
              'Plats commandés en rupture de stock',
              'Cuisine saturée / temps d\'attente excessif',
              'Établissement complet ou en fermeture',
              'Erreur de commande signalée',
            ].map((reason) => (
              <label
                key={reason}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs font-medium text-slate-700"
              >
                <input
                  type="radio"
                  name="refusalReason"
                  value={reason}
                  checked={refusalReason === reason}
                  onChange={(e) => setRefusalReason(e.target.value)}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span>{reason}</span>
              </label>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRefuseDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleRefuseConfirm}
            >
              Confirmer le refus
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
