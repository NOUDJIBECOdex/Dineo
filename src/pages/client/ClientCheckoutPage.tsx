import confetti from 'canvas-confetti';
import { ArrowLeft, CheckCircle2, ShieldCheck, Utensils } from 'lucide-react';
import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { OrderService } from '../../services/order.service';
import { useCart } from '../../store/cart.context';
import { formatFCFA } from '../../utils/currency';

interface ClientCheckoutPageProps {
  onBackToMenu: () => void;
  onOrderSuccess: (orderId: string) => void;
}

export const ClientCheckoutPage: React.FC<ClientCheckoutPageProps> = ({
  onBackToMenu,
  onOrderSuccess,
}) => {
  const { items, totalAmount, orderContext, clearCart } = useCart();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setError('Veuillez renseigner votre nom pour le service.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const createdOrder = await OrderService.createOrder({
        restaurantId: 'rest-001',
        context: orderContext,
        source: orderContext.type === 'TABLE' ? 'QR_TABLE' : 'DIRECT_LINK',
        customer: {
          name: customerName.trim(),
          phone: customerPhone.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        items: items.map((i) => ({
          menuItemId: i.menuItem.id,
          quantity: i.quantity,
          selectedChoices: i.selectedChoices,
          specialInstructions: i.specialInstructions,
        })),
      });

      // Animation festive confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#d97706', '#059669', '#2563eb', '#f59e0b'],
        });
      } catch {
        // ignore if not supported
      }

      // Vider le panier
      clearCart();

      // Rediriger vers la page de suivi
      onOrderSuccess(createdOrder.id);
    } catch (err) {
      console.error('Erreur lors de la création de la commande:', err);
      setError('Une erreur est survenue lors de l\'envoi de votre commande.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-slate-900">Votre panier est vide</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Vous devez avoir au moins un plat dans votre panier pour valider votre commande.
        </p>
        <Button onClick={onBackToMenu} className="mt-6" size="md">
          Retourner au menu
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={onBackToMenu}
            className="p-1.5 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Retour au menu"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-black text-slate-900">Finaliser ma commande</h1>
            <p className="text-[11px] text-slate-500">
              Vérifiez vos articles et renseignez vos coordonnées
            </p>
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Rappel du Contexte de commande */}
        <div className="bg-amber-500/10 border border-amber-300/60 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Lieu du service
            </span>
            <p className="text-sm font-black text-amber-950">
              {orderContext.type === 'TABLE'
                ? orderContext.tableName || `Table ${orderContext.tableNumber}`
                : 'Commande à emporter (Retrait au comptoir)'}
            </p>
          </div>
        </div>

        {/* Récapitulatif des articles */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Récapitulatif des plats ({items.length})
          </h2>

          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
                <div className="flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md text-xs">
                      {item.quantity}×
                    </span>
                    <span className="font-bold text-slate-900">{item.menuItem.name}</span>
                  </div>

                  {item.selectedChoices && item.selectedChoices.length > 0 && (
                    <div className="mt-1 pl-7 flex flex-wrap gap-1">
                      {item.selectedChoices.map((c) => (
                        <span
                          key={c.choiceId}
                          className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded"
                        >
                          {c.choiceName}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.specialInstructions && (
                    <p className="text-[10px] text-amber-800 italic mt-0.5 pl-7">
                      « {item.specialInstructions} »
                    </p>
                  )}
                </div>

                <span className="font-bold text-slate-900 shrink-0">
                  {formatFCFA(item.totalPrice)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="font-bold text-slate-700 text-sm">Total à payer</span>
            <span className="font-black text-lg text-amber-600">
              {formatFCFA(totalAmount)}
            </span>
          </div>
        </div>

        {/* Formulaire coordonnées client */}
        <form
          onSubmit={handleSubmitOrder}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4"
        >
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Informations pour le service
          </h2>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <Input
            label="Votre nom ou prénom *"
            placeholder="Ex: Jean Manga"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />

          <Input
            label="Numéro de téléphone (optionnel)"
            type="tel"
            placeholder="Ex: +237 6 90 00 00 00"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            helperText="Utile si le restaurant doit vous joindre"
          />

          <Textarea
            label="Remarques ou allergies éventuelles (optionnel)"
            placeholder="Ex: Allergique aux arachides, piment très doux..."
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="pt-3 flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Votre commande est transmise directement en salle & en cuisine.</span>
          </div>

          <Button
            type="submit"
            isLoading={isSubmitting}
            className="w-full"
            size="lg"
            rightIcon={<CheckCircle2 className="w-5 h-5" />}
          >
            Envoyer ma commande • {formatFCFA(totalAmount)}
          </Button>
        </form>
      </main>
    </div>
  );
};
