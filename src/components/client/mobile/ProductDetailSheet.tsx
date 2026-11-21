import { Clock, Flame, Minus, Plus, Snowflake, X } from 'lucide-react';
import React, { useState } from 'react';
import type { Product } from '../../../types/erp';
import { formatFCFA } from '../../../utils/currency';
import { SpellcheckTextarea } from '../../common/SpellcheckTextarea';

interface ProductDetailSheetProps {
  product: Product | null;
  categoryName?: string;
  onClose: () => void;
  onAdd: (product: Product, quantity: number, optionLabel?: string, note?: string) => void;
}

export const ProductDetailSheet: React.FC<ProductDetailSheetProps> = ({
  product,
  categoryName,
  onClose,
  onAdd,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [note, setNote] = useState('');

  if (!product) return null;

  const isDrink =
    product.categoryId === 'cat-boissons' ||
    /jus|eau|coca|boisson|foléré|gingembre/i.test(product.name);

  const optionChoices = isDrink
    ? ['Bien glacé', 'Frais sans glaçons', 'Température ambiante']
    : ['Piment doux à part', 'Kankankan épicé', 'Sans piment'];

  const activeChoice = selectedOption || optionChoices[0];
  const isOutOfStock = product.stock <= 0 || !product.isAvailable;

  const handleConfirm = () => {
    if (isOutOfStock) return;
    onAdd(product, quantity, activeChoice, note.trim() || undefined);
    setQuantity(1);
    setSelectedOption('');
    setNote('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />

      {/* Bottom Sheet */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--ink-primary)',
          borderColor: 'var(--border-hairline)',
        }}
        className="relative z-10 w-full max-w-[460px] rounded-t-3xl sm:rounded-2xl border overflow-hidden shadow-2xl max-h-[90dvh] flex flex-col"
      >
        {/* Drag handle (mobile feel) */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border-strong)' }} />
        </div>

        {/* Image Header */}
        <div className="relative aspect-[16/10] w-full shrink-0" style={{ backgroundColor: 'var(--bg-subtle)' }}>
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/55 text-white flex items-center justify-center backdrop-blur-xs cursor-pointer active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
            {categoryName && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-black/60 text-white backdrop-blur-xs">
                {categoryName}
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/95 text-[#18181B] flex items-center gap-1">
              <Clock className="w-3 h-3" />~{product.preparationMinutes} min
            </span>
          </div>
        </div>

        {/* Scrollable Details */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-[18px] font-semibold tracking-[-0.02em] leading-snug">{product.name}</h3>
              <span className="text-[16px] font-semibold tabular-nums shrink-0" style={{ color: 'var(--accent)' }}>
                {formatFCFA(product.price)}
              </span>
            </div>
            {product.description && (
              <p className="text-[13px] leading-relaxed mt-1.5" style={{ color: 'var(--ink-secondary)' }}>
                {product.description}
              </p>
            )}
            {product.stock > 0 && product.stock <= 5 && (
              <p className="text-[12px] font-medium mt-2" style={{ color: 'var(--warn-text)' }}>
                Plus que {product.stock} disponible{product.stock > 1 ? 's' : ''} aujourd’hui
              </p>
            )}
          </div>

          {/* Local preference chips */}
          <div className="space-y-2">
            <div className="text-[12px] font-semibold flex items-center gap-1.5" style={{ color: 'var(--ink-secondary)' }}>
              {isDrink ? <Snowflake className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} /> : <Flame className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />}
              {isDrink ? 'Température de service' : 'Préférence piment & assaisonnement'}
            </div>
            <div className="flex flex-wrap gap-2">
              {optionChoices.map((choice) => {
                const active = activeChoice === choice;
                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => setSelectedOption(choice)}
                    style={{
                      backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-subtle)',
                      borderColor: active ? 'var(--accent)' : 'var(--border-hairline)',
                      color: active ? 'var(--accent)' : 'var(--ink-primary)',
                    }}
                    className="px-3 py-2 rounded-xl border text-[12.5px] font-medium transition-colors cursor-pointer"
                  >
                    {choice}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Special note with live French spellcheck */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium block" style={{ color: 'var(--ink-secondary)' }}>
              Instruction pour la cuisine (optionnel)
            </label>
            <SpellcheckTextarea
              rows={2}
              value={note}
              onChange={setNote}
              placeholder="Ex: Bien cuit, sans oignons, sauce à part..."
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-hairline)',
                color: 'var(--ink-primary)',
              }}
            />
          </div>
        </div>

        {/* Sticky Thumb-Zone Footer */}
        <div
          className="px-5 py-3.5 border-t flex items-center gap-3 shrink-0"
          style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-surface)' }}
        >
          <div
            className="flex items-center rounded-xl border h-12 px-1.5 shrink-0"
            style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}
          >
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer active:scale-95"
              aria-label="Diminuer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-semibold text-[14px] tabular-nums">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(Math.max(1, product.stock), q + 1))}
              className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer active:scale-95"
              aria-label="Augmenter"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            disabled={isOutOfStock}
            onClick={handleConfirm}
            style={{ backgroundColor: isOutOfStock ? 'var(--border-strong)' : 'var(--accent)' }}
            className="flex-1 h-12 rounded-xl text-white font-semibold text-[14px] flex items-center justify-between px-4 cursor-pointer active:scale-[0.985] transition-transform disabled:cursor-not-allowed"
          >
            <span>{isOutOfStock ? 'Épuisé' : 'Ajouter au panier'}</span>
            {!isOutOfStock && <span className="tabular-nums">{formatFCFA(product.price * quantity)}</span>}
          </button>
        </div>
      </div>
    </div>
  );
};
