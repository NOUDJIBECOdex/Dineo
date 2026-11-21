import React from 'react';
import type { MenuCategory } from '../../types/restaurant';

interface CategoryNavProps {
  categories: MenuCategory[];
  activeCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  categories,
  activeCategoryId,
  onSelectCategory,
}) => {
  return (
    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <nav
          className="flex space-x-2 py-3 overflow-x-auto no-scrollbar scroll-smooth"
          aria-label="Catégories du menu"
        >
          {categories.map((category) => {
            const isActive = category.id === activeCategoryId;
            return (
              <button
                key={category.id}
                onClick={() => onSelectCategory(category.id)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {category.name}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
