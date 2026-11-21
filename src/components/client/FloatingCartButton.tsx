import { ShoppingBag } from 'lucide-react';
import React from 'react';
import { useCart } from '../../store/cart.context';
import { formatFCFA } from '../../utils/currency';

export const FloatingCartButton: React.FC = () => {
  const { totalCount, totalAmount, openCartDrawer } = useCart();

  if (totalCount === 0) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 max-w-lg mx-auto z-40 animate-in slide-in-from-bottom-5 duration-300">
      <button
        onClick={openCartDrawer}
        className="w-full bg-slate-900 hover:bg-slate-950 text-white rounded-2xl p-3.5 shadow-2xl shadow-slate-950/40 flex items-center justify-between transition-all duration-200 active:scale-[0.99] border border-slate-700/50 cursor-pointer"
        aria-label="Voir le panier"
      >
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center h-10 w-10 rounded-xl bg-amber-600 text-white font-black text-sm shadow-sm">
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-xs">
              {totalCount}
            </span>
          </div>
          <div className="text-left">
            <p className="text-xs text-slate-300 font-medium">Panier en cours</p>
            <p className="text-sm font-extrabold text-amber-400">
              {formatFCFA(totalAmount)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-xl text-xs font-bold tracking-wide uppercase transition-colors">
          <span>Voir le panier</span>
          <span>→</span>
        </div>
      </button>
    </div>
  );
};
