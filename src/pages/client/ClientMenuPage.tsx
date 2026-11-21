import { Search } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { CategoryNav } from '../../components/client/CategoryNav';
import { FloatingCartButton } from '../../components/client/FloatingCartButton';
import { MenuItemCard } from '../../components/client/MenuItemCard';
import { MenuItemModal } from '../../components/client/MenuItemModal';
import { OrderContextBanner } from '../../components/client/OrderContextBanner';
import { RestaurantHeader } from '../../components/client/RestaurantHeader';
import { RestaurantService } from '../../services/restaurant.service';
import { useCart } from '../../store/cart.context';
import type { MenuItem, Restaurant } from '../../types/restaurant';

interface ClientMenuPageProps {
  onNavigateToCheckout: () => void;
  onNavigateToTracking?: (orderId: string) => void;
}

export const ClientMenuPage: React.FC<ClientMenuPageProps> = () => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const { addItem, setOrderContext } = useCart();

  useEffect(() => {
    // Vérifier les paramètres d'URL (ex: ?table=12 ou ?table=4)
    const params = new URLSearchParams(window.location.search);
    const tableParam = params.get('table');

    const loadData = async () => {
      try {
        const data = await RestaurantService.getRestaurant();
        setRestaurant(data);
        if (data.categories.length > 0) {
          setActiveCategoryId(data.categories[0].id);
        }

        if (tableParam) {
          const matchedTable = data.tables.find((t) => t.number === tableParam);
          if (matchedTable) {
            setOrderContext({
              type: 'TABLE',
              tableNumber: matchedTable.number,
              tableName: matchedTable.label,
            });
          } else {
            setOrderContext({
              type: 'TABLE',
              tableNumber: tableParam,
              tableName: `Table ${tableParam}`,
            });
          }
        }
      } catch (err) {
        console.error('Erreur chargement restaurant:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [setOrderContext]);

  // Filtrage des articles par recherche et catégorie
  const filteredItems = useMemo(() => {
    if (!restaurant) return [];

    let items = restaurant.items;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
      );
    }

    if (activeCategoryId) {
      items = items.filter((item) => item.categoryId === activeCategoryId);
    }

    return items;
  }, [restaurant, searchQuery, activeCategoryId]);

  const handleQuickAdd = (item: MenuItem, e: React.MouseEvent) => {
    e.stopPropagation();
    // Si l'item a des options obligatoires, on ouvre plutôt la modale
    if (item.options && item.options.length > 0) {
      setSelectedItem(item);
    } else {
      addItem(item, 1);
    }
  };

  if (loading || !restaurant) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-600 border-t-transparent" />
        <p className="mt-4 text-sm font-semibold text-slate-600">
          Chargement de la carte Dineo...
        </p>
      </div>
    );
  }

  const activeCategory = restaurant.categories.find((c) => c.id === activeCategoryId);

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* En-tête restaurant */}
      <RestaurantHeader restaurant={restaurant} />

      {/* Bannière du contexte Table / Emporter */}
      <OrderContextBanner availableTables={restaurant.tables} />

      {/* Barre de recherche */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un plat, une boisson ou un dessert..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* Navigation par catégories (masquée si recherche active) */}
      {!searchQuery && (
        <CategoryNav
          categories={restaurant.categories}
          activeCategoryId={activeCategoryId}
          onSelectCategory={setActiveCategoryId}
        />
      )}

      {/* Section des plats */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
        {/* Titre de section */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900">
              {searchQuery
                ? `Résultats pour « ${searchQuery} »`
                : activeCategory?.name || 'Notre Carte'}
            </h2>
            {activeCategory?.description && !searchQuery && (
              <p className="text-xs text-slate-500 mt-0.5">
                {activeCategory.description}
              </p>
            )}
          </div>
          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
            {filteredItems.length} plat{filteredItems.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Grille des plats */}
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
            <p className="text-slate-600 font-medium text-sm">
              Aucun plat ne correspond à votre recherche.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-3 text-xs text-amber-600 font-bold hover:underline"
            >
              Réinitialiser la recherche
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
            {filteredItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                onSelectItem={(it) => setSelectedItem(it)}
                onQuickAdd={handleQuickAdd}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modale de détail et d'options du plat */}
      <MenuItemModal
        item={selectedItem}
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        onAddToCart={(it, qty, choices, instructions) => {
          addItem(it, qty, choices, instructions);
        }}
      />

      {/* Bouton flottant mobile panier */}
      <FloatingCartButton />
    </div>
  );
};
