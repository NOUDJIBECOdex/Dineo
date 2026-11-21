import {
  Bell,
  BellOff,
  ExternalLink,
  Radio,
  Store,
} from 'lucide-react';
import React from 'react';
import { useOrders } from '../../hooks/useOrders';

interface RestaurantNavProps {
  onSwitchToClient?: () => void;
  onOpenDemoSplit?: () => void;
}

export const RestaurantNav: React.FC<RestaurantNavProps> = ({
  onSwitchToClient,
  onOpenDemoSplit,
}) => {
  const { soundEnabled, toggleSound } = useOrders();

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-lg shadow-sm">
            D
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight flex items-center gap-1.5">
                <span>Dineo POS</span>
                <span className="text-[11px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-md">
                  Restaurant
                </span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Store className="w-3 h-3 text-slate-400" />
              <span>Le Baobab Grill & Lounge</span>
            </p>
          </div>
        </div>

        {/* Live sync indicator & controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Direct Sync Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Réception Directe</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              soundEnabled
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
            title={soundEnabled ? 'Sonnerie active' : 'Sonnerie coupée'}
          >
            {soundEnabled ? (
              <>
                <Bell className="w-4 h-4 text-amber-400" />
                <span className="hidden md:inline">Son actif</span>
              </>
            ) : (
              <>
                <BellOff className="w-4 h-4 text-slate-400" />
                <span className="hidden md:inline">Silencieux</span>
              </>
            )}
          </button>

          {/* Switch to Split Screen Demo */}
          {onOpenDemoSplit && (
            <button
              onClick={onOpenDemoSplit}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>Mode Démo 2-en-1</span>
            </button>
          )}

          {/* Switch to Client menu */}
          {onSwitchToClient && (
            <button
              onClick={onSwitchToClient}
              className="hidden lg:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
            >
              <span>Vue Client</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
