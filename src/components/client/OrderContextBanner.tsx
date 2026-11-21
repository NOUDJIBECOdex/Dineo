import { QrCode, ShoppingBag, Utensils } from 'lucide-react';
import React, { useState } from 'react';
import { useCart } from '../../store/cart.context';
import type { TableInfo } from '../../types/restaurant';
import { Modal } from '../ui/Modal';

interface OrderContextBannerProps {
  availableTables: TableInfo[];
}

export const OrderContextBanner: React.FC<OrderContextBannerProps> = ({ availableTables }) => {
  const { orderContext, setOrderContext } = useCart();
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  return (
    <>
      <div className="bg-amber-50/80 border-y border-amber-200/60 px-4 py-2.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-600 text-white shrink-0 shadow-2xs">
              {orderContext.type === 'TABLE' ? (
                <Utensils className="h-3.5 w-3.5" />
              ) : (
                <ShoppingBag className="h-3.5 w-3.5" />
              )}
            </span>
            <div>
              <p className="font-semibold text-amber-950 flex items-center gap-1.5">
                {orderContext.type === 'TABLE' ? (
                  <>
                    <span>Service à table :</span>
                    <strong className="text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                      {orderContext.tableName || `Table ${orderContext.tableNumber}`}
                    </strong>
                  </>
                ) : (
                  <span>Commande à emporter</span>
                )}
              </p>
              <p className="text-[11px] text-amber-800/80 flex items-center gap-1 mt-0.5">
                <QrCode className="w-3 h-3 text-amber-700 inline" />
                <span>Identifié par QR Code Dineo</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSelectorOpen(true)}
            className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline underline-offset-2 cursor-pointer shrink-0"
          >
            Changer
          </button>
        </div>
      </div>

      {/* Modal de sélection de contexte (utile pour tester différents QR / tables) */}
      <Modal
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        title="Contexte de votre commande"
        description="Sélectionnez votre table ou le mode à emporter pour la démonstration"
      >
        <div className="space-y-3 pt-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Tables disponibles (QR Codes)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {availableTables.map((table) => {
              const isSelected =
                orderContext.type === 'TABLE' && orderContext.tableNumber === table.number;
              return (
                <button
                  key={table.id}
                  onClick={() => {
                    setOrderContext({
                      type: 'TABLE',
                      tableNumber: table.number,
                      tableName: table.label,
                    });
                    setIsSelectorOpen(false);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-amber-600 bg-amber-50/80 ring-2 ring-amber-500/20'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{table.label}</span>
                    <Utensils className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-600' : 'text-slate-400'}`} />
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-1">Scan QR direct</span>
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <button
              onClick={() => {
                setOrderContext({
                  type: 'TAKEAWAY',
                });
                setIsSelectorOpen(false);
              }}
              className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                orderContext.type === 'TAKEAWAY'
                  ? 'border-amber-600 bg-amber-50/80 ring-2 ring-amber-500/20'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div>
                <span className="font-bold text-slate-900 text-sm block">Commande à emporter</span>
                <span className="text-[11px] text-slate-500">Retrait au comptoir du restaurant</span>
              </div>
              <ShoppingBag className={`w-4 h-4 ${orderContext.type === 'TAKEAWAY' ? 'text-amber-600' : 'text-slate-400'}`} />
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
