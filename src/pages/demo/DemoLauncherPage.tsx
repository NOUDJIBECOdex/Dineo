import {
  Laptop,
  QrCode,
  Smartphone,
  SplitSquareVertical,
  Volume2,
  VolumeX,
} from 'lucide-react';
import React, { useState } from 'react';
import { useCart } from '../../store/cart.context';
import { useOrders } from '../../hooks/useOrders';
import { ClientCheckoutPage } from '../client/ClientCheckoutPage';
import { ClientMenuPage } from '../client/ClientMenuPage';
import { ClientTrackingPage } from '../client/ClientTrackingPage';
import { RestaurantDashboardPage } from '../restaurant/RestaurantDashboardPage';

export const DemoLauncherPage: React.FC = () => {
  const [activeView, setActiveView] = useState<'SPLIT' | 'CLIENT' | 'RESTAURANT'>('SPLIT');
  const [clientScreen, setClientScreen] = useState<'MENU' | 'CHECKOUT' | 'TRACKING'>('MENU');
  const [currentTrackingOrderId, setCurrentTrackingOrderId] = useState<string | null>(null);

  const { setOrderContext, orderContext } = useCart();
  const { soundEnabled, toggleSound } = useOrders();

  const handleSimulateQrScan = (tableNumber: string, label: string) => {
    setOrderContext({
      type: 'TABLE',
      tableNumber,
      tableName: label,
    });
    setClientScreen('MENU');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Demo Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md z-30">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-base shadow-sm">
            D
          </div>
          <div>
            <h1 className="text-sm font-black text-white flex items-center gap-1.5">
              <span>Dineo — Démonstration Vertical Slice #1</span>
              <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30">
                Temps Réel
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Synchronisation instantanée Smartphone Client ↔ POS Restaurant
            </p>
          </div>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveView('SPLIT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeView === 'SPLIT'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Vue côte à côte"
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Écran Scindé</span>
          </button>

          <button
            onClick={() => setActiveView('CLIENT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeView === 'CLIENT'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Vue Smartphone Client"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Client</span>
          </button>

          <button
            onClick={() => setActiveView('RESTAURANT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeView === 'RESTAURANT'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Vue POS Restaurant"
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Restaurant</span>
          </button>
        </div>

        {/* QR Code Quick Simulator Pills */}
        <div className="hidden lg:flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
            <QrCode className="w-3.5 h-3.5 text-amber-500" />
            <span>Simuler Scan QR :</span>
          </span>
          <button
            onClick={() => handleSimulateQrScan('12', 'Table 12 (Vue Jardin)')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
              orderContext.tableNumber === '12'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            Table 12
          </button>
          <button
            onClick={() => handleSimulateQrScan('4', 'Table 4 (Salle Intérieure)')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
              orderContext.tableNumber === '4'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            Table 4
          </button>
          <button
            onClick={() => handleSimulateQrScan('1', 'Table 1 (Terrasse)')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
              orderContext.tableNumber === '1'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            Table 1
          </button>
        </div>

        {/* Sound Toggle */}
        <button
          onClick={toggleSound}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors cursor-pointer border border-slate-700"
          title={soundEnabled ? 'Son activé' : 'Son désactivé'}
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4 text-amber-400" />
          ) : (
            <VolumeX className="w-4 h-4 text-slate-400" />
          )}
        </button>
      </header>

      {/* Main View Area */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'SPLIT' && (
          <div className="h-[calc(100vh-53px)] grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden bg-slate-900">
            {/* Colonne Gauche : Simulateur Smartphone Client */}
            <div className="lg:col-span-5 h-full flex flex-col items-center justify-center p-3 sm:p-5 bg-gradient-to-b from-slate-900 to-slate-950 border-r border-slate-800">
              <div className="w-full flex items-center justify-between mb-2 max-w-sm px-1">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-amber-500" />
                  <span>Écran Client (Mobile-First)</span>
                </span>
                <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {orderContext.tableName || `Table ${orderContext.tableNumber}`}
                </span>
              </div>

              {/* Cadre Smartphone */}
              <div className="w-full max-w-sm h-[86vh] max-h-[780px] bg-slate-50 rounded-[38px] border-8 border-slate-800 shadow-2xl overflow-hidden flex flex-col relative ring-1 ring-slate-700">
                {/* Dynamic Island / Notch */}
                <div className="h-5 bg-slate-800 flex items-center justify-center">
                  <div className="h-3 w-20 bg-slate-950 rounded-full" />
                </div>

                {/* Smartphone Content Container */}
                <div className="flex-1 overflow-y-auto">
                  {clientScreen === 'MENU' && (
                    <ClientMenuPage
                      onNavigateToCheckout={() => setClientScreen('CHECKOUT')}
                      onNavigateToTracking={(orderId) => {
                        setCurrentTrackingOrderId(orderId);
                        setClientScreen('TRACKING');
                      }}
                    />
                  )}

                  {clientScreen === 'CHECKOUT' && (
                    <ClientCheckoutPage
                      onBackToMenu={() => setClientScreen('MENU')}
                      onOrderSuccess={(orderId) => {
                        setCurrentTrackingOrderId(orderId);
                        setClientScreen('TRACKING');
                      }}
                    />
                  )}

                  {clientScreen === 'TRACKING' && (
                    <ClientTrackingPage
                      orderId={currentTrackingOrderId || 'cmd-init-001'}
                      onBackToMenu={() => setClientScreen('MENU')}
                    />
                  )}
                </div>

                {/* Barre de retour Accueil smartphone */}
                <div className="h-3.5 bg-white flex items-center justify-center shrink-0 border-t border-slate-100">
                  <div className="h-1 w-28 bg-slate-300 rounded-full" />
                </div>
              </div>
            </div>

            {/* Colonne Droite : Dashboard POS Restaurant */}
            <div className="lg:col-span-7 h-full overflow-y-auto bg-slate-100">
              <RestaurantDashboardPage
                onSwitchToClient={() => setActiveView('CLIENT')}
                onOpenDemoSplit={() => setActiveView('SPLIT')}
              />
            </div>
          </div>
        )}

        {/* Mode Client Plein Écran */}
        {activeView === 'CLIENT' && (
          <div className="min-h-screen bg-slate-50">
            {clientScreen === 'MENU' && (
              <ClientMenuPage
                onNavigateToCheckout={() => setClientScreen('CHECKOUT')}
                onNavigateToTracking={(orderId) => {
                  setCurrentTrackingOrderId(orderId);
                  setClientScreen('TRACKING');
                }}
              />
            )}

            {clientScreen === 'CHECKOUT' && (
              <ClientCheckoutPage
                onBackToMenu={() => setClientScreen('MENU')}
                onOrderSuccess={(orderId) => {
                  setCurrentTrackingOrderId(orderId);
                  setClientScreen('TRACKING');
                }}
              />
            )}

            {clientScreen === 'TRACKING' && (
              <ClientTrackingPage
                orderId={currentTrackingOrderId || 'cmd-init-001'}
                onBackToMenu={() => setClientScreen('MENU')}
              />
            )}
          </div>
        )}

        {/* Mode Restaurant Plein Écran */}
        {activeView === 'RESTAURANT' && (
          <RestaurantDashboardPage
            onSwitchToClient={() => setActiveView('CLIENT')}
            onOpenDemoSplit={() => setActiveView('SPLIT')}
          />
        )}
      </div>
    </div>
  );
};
