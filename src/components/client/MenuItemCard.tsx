import { Clock, Plus, Sparkles } from 'lucide-react';
import React from 'react';
import type { MenuItem } from '../../types/restaurant';
import { formatFCFA } from '../../utils/currency';

interface MenuItemCardProps {
  item: MenuItem;
  onSelectItem: (item: MenuItem) => void;
  onQuickAdd: (item: MenuItem, e: React.MouseEvent) => void;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  onSelectItem,
  onQuickAdd,
}) => {
  return (
    <div
      onClick={() => onSelectItem(item)}
      className="group relative bg-white rounded-2xl border border-slate-200/80 hover:border-amber-400 p-3 sm:p-4 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Image & Badges */}
        <div className="relative aspect-4/3 sm:aspect-16/10 w-full rounded-xl overflow-hidden bg-slate-100 mb-3">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {item.isChefSpecial && (
            <div className="absolute top-2 left-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white shadow-xs">
                <Sparkles className="w-3 h-3" />
                Spécialité du Chef
              </span>
            </div>
          )}
          {item.preparationTimeMinutes && (
            <div className="absolute bottom-2 right-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-900/75 text-white backdrop-blur-xs">
                <Clock className="w-2.5 h-2.5" />
                {item.preparationTimeMinutes} min
              </span>
            </div>
          )}
        </div>

        {/* Title & Description */}
        <div className="mb-2">
          <h3 className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-amber-600 transition-colors line-clamp-1">
            {item.name}
          </h3>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>
      </div>

      {/* Price & Add Button */}
      <div className="pt-2 mt-auto border-t border-slate-100 flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-400 block font-medium">Prix</span>
          <span className="font-black text-slate-900 text-sm sm:text-base tracking-tight">
            {formatFCFA(item.price)}
          </span>
        </div>

        <button
          onClick={(e) => onQuickAdd(item, e)}
          className="h-9 w-9 rounded-xl bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white flex items-center justify-center transition-all duration-150 active:scale-95 shadow-2xs cursor-pointer"
          title="Ajouter au panier"
          aria-label={`Ajouter ${item.name} au panier`}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
