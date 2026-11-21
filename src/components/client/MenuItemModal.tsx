import { Minus, Plus } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { SelectedOptionChoice } from '../../types/order';
import type { MenuItem } from '../../types/restaurant';
import { formatFCFA } from '../../utils/currency';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface MenuItemModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (
    item: MenuItem,
    quantity: number,
    selectedChoices?: SelectedOptionChoice[],
    specialInstructions?: string
  ) => void;
}

export const MenuItemModal: React.FC<MenuItemModalProps> = ({
  item,
  isOpen,
  onClose,
  onAddToCart,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedChoices, setSelectedChoices] = useState<Record<string, SelectedOptionChoice>>({});
  const [instructions, setInstructions] = useState('');

  // Initialiser les choix par défaut lors de l'ouverture
  useEffect(() => {
    if (item) {
      setQuantity(1);
      setInstructions('');
      const defaultChoices: Record<string, SelectedOptionChoice> = {};
      if (item.options) {
        item.options.forEach((opt) => {
          if (opt.choices.length > 0) {
            defaultChoices[opt.id] = {
              optionId: opt.id,
              optionName: opt.name,
              choiceId: opt.choices[0].id,
              choiceName: opt.choices[0].name,
              extraPrice: opt.choices[0].extraPrice || 0,
            };
          }
        });
      }
      setSelectedChoices(defaultChoices);
    }
  }, [item, isOpen]);

  if (!item) return null;

  const handleChoiceChange = (
    optionId: string,
    optionName: string,
    choiceId: string,
    choiceName: string,
    extraPrice: number
  ) => {
    setSelectedChoices((prev) => ({
      ...prev,
      [optionId]: {
        optionId,
        optionName,
        choiceId,
        choiceName,
        extraPrice,
      },
    }));
  };

  const extraTotal = Object.values(selectedChoices).reduce(
    (sum, c) => sum + (c.extraPrice || 0),
    0
  );
  const unitPrice = item.price + extraTotal;
  const totalPrice = unitPrice * quantity;

  const handleConfirm = () => {
    onAddToCart(item, quantity, Object.values(selectedChoices), instructions.trim() || undefined);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md">
      <div className="space-y-4">
        {/* Photo du plat */}
        <div className="relative -mx-6 -mt-4 h-48 sm:h-56 bg-slate-100 overflow-hidden">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Détails du plat */}
        <div>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">{item.name}</h2>
            <span className="text-lg font-black text-amber-600 shrink-0">
              {formatFCFA(item.price)}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
            {item.description}
          </p>
        </div>

        {/* Options de personnalisation simples */}
        {item.options && item.options.length > 0 && (
          <div className="space-y-4 pt-3 border-t border-slate-100">
            {item.options.map((option) => (
              <div key={option.id}>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  {option.name}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {option.choices.map((choice) => {
                    const isSelected = selectedChoices[option.id]?.choiceId === choice.id;
                    return (
                      <button
                        type="button"
                        key={choice.id}
                        onClick={() =>
                          handleChoiceChange(
                            option.id,
                            option.name,
                            choice.id,
                            choice.name,
                            choice.extraPrice
                          )
                        }
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-all ${
                          isSelected
                            ? 'border-amber-600 bg-amber-50/80 text-amber-950 font-bold ring-1 ring-amber-600/30'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{choice.name}</span>
                        {choice.extraPrice > 0 && (
                          <span className="text-amber-700 font-semibold">
                            +{formatFCFA(choice.extraPrice)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Instructions spéciales */}
        <div className="pt-2 border-t border-slate-100">
          <label
            htmlFor="special-instructions"
            className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
          >
            Instructions spéciales pour la cuisine (optionnel)
          </label>
          <input
            id="special-instructions"
            type="text"
            placeholder="Ex: Sans oignon, piment à part, bien cuit..."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        {/* Quantité & Bouton Ajouter */}
        <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
          {/* Compteur quantité */}
          <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-white disabled:opacity-30 transition-all cursor-pointer"
              aria-label="Diminuer la quantité"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-bold text-sm text-slate-900">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-white transition-all cursor-pointer"
              aria-label="Augmenter la quantité"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Bouton d'ajout */}
          <Button
            onClick={handleConfirm}
            className="flex-1"
            size="md"
          >
            Ajouter • {formatFCFA(totalPrice)}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
