import { ArrowLeft, Radio, RefreshCw, Utensils } from 'lucide-react';
import React from 'react';
import { OrderStatusTracker } from '../../components/client/OrderStatusTracker';
import { Button } from '../../components/ui/Button';
import { useOrderTracking } from '../../hooks/useOrderTracking';

interface ClientTrackingPageProps {
  orderId: string;
  onBackToMenu: () => void;
}

export const ClientTrackingPage: React.FC<ClientTrackingPageProps> = ({
  orderId,
  onBackToMenu,
}) => {
  const { order, loading, error } = useOrderTracking(orderId);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mb-3" />
        <h2 className="font-bold text-slate-800 text-sm">Chargement du statut en direct...</h2>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="font-bold text-slate-900 text-base">Commande introuvable</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">{error || 'Cette commande n\'existe pas.'}</p>
        <Button onClick={onBackToMenu} size="sm" className="mt-4">
          Retourner au menu
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBackToMenu}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Menu</span>
          </button>

          {/* Indicateur de synchro en direct */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[11px] font-bold">
            <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
            <span>Direct Restaurant</span>
          </div>
        </div>
      </header>

      {/* Corps du suivi */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <OrderStatusTracker order={order} />

        {/* CTA retour ou nouvelle commande */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={onBackToMenu}
            leftIcon={<Utensils className="w-4 h-4" />}
          >
            Consulter à nouveau le menu
          </Button>
        </div>
      </main>
    </div>
  );
};
