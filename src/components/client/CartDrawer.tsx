import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, Utensils } from 'lucide-react';
import React from 'react';
import { useCart } from '../../store/cart.context';
import { formatFCFA } from '../../utils/currency';
import { Button } from '../ui/Button';
import { Drawer } from '../ui/Drawer';

interface CartDrawerProps {
  onGoToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onGoToCheckout }) => {
  const {
    items,
    isCartDrawerOpen,
    closeCartDrawer,
    updateQuantity,
    removeItem,
    clearCart,
    totalCount,
    totalAmount,
    orderContext,
  } = useCart();

  const handleCheckout = () => {
    closeCartDrawer();
    onGoToCheckout();
  };

  return (
    <Drawer
      isOpen={isCartDrawerOpen}
      onClose={closeCartDrawer}
      title="Votre Panier Dineo"
      subtitle={`${totalCount} article${totalCount > 1 ? 's' : ''} sélectionné${totalCount > 1 ? 's' : ''}`}
      footer={
        items.length > 0 ? (
          <div className="space-y-3">
            {/* Total & Subtotal */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-500 text-xs">
                <span>Sous-total articles</span>
                <span>{formatFCFA(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 pt-1 border-t border-slate-100">
                <span>Total à régler</span>
                <span className="text-amber-600">{formatFCFA(totalAmount)}</span>
              </div>
            </div>

            {/* Action CTA */}
            <Button
              onClick={handleCheckout}
              className="w-full"
              size="lg"
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              Commander maintenant
            </Button>
          </div>
        ) : null
      }
    >
      {items.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4">
          <div className="h-16 w-16 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 mb-4">
            <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">Votre panier est vide</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            Parcourez le menu et ajoutez de délicieux plats pour débuter votre commande.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-6"
            onClick={closeCartDrawer}
          >
            Explorer le menu
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Contexte rappel */}
          <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-200/50 flex items-center gap-2.5 text-xs text-amber-900">
            <Utensils className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Destination :{' '}
              <strong>
                {orderContext.type === 'TABLE'
                  ? orderContext.tableName || `Table ${orderContext.tableNumber}`
                  : 'À emporter'}
              </strong>
            </span>
          </div>

          {/* Liste des articles */}
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div key={item.id} className="py-3 flex gap-3 items-start">
                <img
                  src={item.menuItem.imageUrl}
                  alt={item.menuItem.name}
                  className="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-100"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-sm text-slate-900 line-clamp-1">
                      {item.menuItem.name}
                    </h4>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                      title="Supprimer du panier"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Options sélectionnées */}
                  {item.selectedChoices && item.selectedChoices.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.selectedChoices.map((c) => (
                        <span
                          key={c.choiceId}
                          className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium"
                        >
                          {c.choiceName}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Instructions */}
                  {item.specialInstructions && (
                    <p className="text-[10px] text-amber-800 italic mt-0.5">
                      Note : « {item.specialInstructions} »
                    </p>
                  )}

                  {/* Prix & Contrôles Quantité */}
                  <div className="flex items-center justify-between mt-2 pt-1">
                    <span className="font-black text-xs text-slate-900">
                      {formatFCFA(item.totalPrice)}
                    </span>

                    <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="h-6 w-6 flex items-center justify-center text-slate-600 hover:bg-white rounded-l transition-all cursor-pointer"
                        aria-label="Diminuer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-bold text-xs text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="h-6 w-6 flex items-center justify-center text-slate-600 hover:bg-white rounded-r transition-all cursor-pointer"
                        aria-label="Augmenter"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 text-right">
            <button
              onClick={clearCart}
              className="text-xs text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
            >
              Vider tout le panier
            </button>
          </div>
        </div>
      )}
    </Drawer>
  );
};
