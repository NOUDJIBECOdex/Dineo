import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  Camera,
  ChefHat,
  ImagePlus,
  Link2,
  Pencil,
  Plus,
  Tag,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';
import { useErp } from '../../../store/erp.context';
import type { Product, RecipeIngredient } from '../../../types/erp';
import { formatFCFA } from '../../../utils/currency';
import { compressImageToDataUrl } from '../../../utils/image';
import {
  Btn,
  DialogModal,
  Field,
  FilterTabs,
  KpiCard,
  PageHeader,
  SearchInput,
  StatusPill,
  Surface,
  formatShortDateTime,
  inputBaseClass,
  inputBaseStyle,
} from '../ui/Primitives';

interface ProductsStockViewProps {
  mode: 'products' | 'stock';
}

const PRESET_PHOTOS = [
  { label: 'Poulet braisé', url: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&auto=format&fit=crop&q=80' },
  { label: 'Poisson braisé', url: 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=600&auto=format&fit=crop&q=80' },
  { label: 'Grillades / Soya', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80' },
  { label: 'Burger', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80' },
  { label: 'Eau / Boisson', url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80' },
  { label: 'Jus frais', url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80' },
];

export const ProductsStockView: React.FC<ProductsStockViewProps> = ({ mode }) => {
  const { state, addCategory, saveProduct, deleteProduct, addStockItem, recordStockMovement } = useErp();

  // Products state
  const [selectedCat, setSelectedCat] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  const [prodModalOpen, setProdModalOpen] = useState(false);
  const [editingProdId, setEditingProdId] = useState<string | undefined>(undefined);
  const [pName, setPName] = useState('');
  const [pCat, setPCat] = useState(state.categories[0]?.id || '');
  const [pPrice, setPPrice] = useState(2500);
  const [pStock, setPStock] = useState(20);
  const [pMinStock, setPMinStock] = useState(5);
  const [pDesc, setPDesc] = useState('');
  const [pImg, setPImg] = useState(PRESET_PHOTOS[0].url);
  const [pImgError, setPImgError] = useState('');
  const [pUseRecipe, setPUseRecipe] = useState(false);
  const [pRecipe, setPRecipe] = useState<RecipeIngredient[]>([]);
  const [pLinkedStockId, setPLinkedStockId] = useState<string>('');
  const [pAutoCreateStock, setPAutoCreateStock] = useState<boolean>(true);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // Stock state
  const [stockTab, setStockTab] = useState<'ITEMS' | 'MOVEMENTS'>('ITEMS');
  const [stockSearch, setStockSearch] = useState('');
  const [addIngOpen, setAddIngOpen] = useState(false);
  const [ingName, setIngName] = useState('');
  const [ingCat, setIngCat] = useState('Boissons & Eaux');
  const [ingUnit, setIngUnit] = useState('bouteille');
  const [ingQty, setIngQty] = useState(24);
  const [ingMin, setIngMin] = useState(6);
  const [ingCost, setIngCost] = useState(400);

  const [movModalOpen, setMovModalOpen] = useState(false);
  const [movItemId, setMovItemId] = useState(state.stockItems[0]?.id || '');
  const [movType, setMovType] = useState<'ENTREE' | 'SORTIE'>('ENTREE');
  const [movQty, setMovQty] = useState(5);
  const [movReason, setMovReason] = useState('');

  const filteredProducts = useMemo(() => {
    return state.products.filter((p) => {
      if (selectedCat !== 'ALL' && p.categoryId !== selectedCat) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [state.products, selectedCat, search]);

  const openNewProduct = () => {
    setEditingProdId(undefined);
    setPName('');
    setPCat(state.categories[0]?.id || '');
    setPPrice(1500);
    setPStock(24);
    setPMinStock(6);
    setPDesc('');
    setPImg(PRESET_PHOTOS[0].url);
    setPImgError('');
    setPUseRecipe(false);
    setPRecipe([]);
    setPLinkedStockId('');
    setPAutoCreateStock(true);
    setProdModalOpen(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProdId(p.id);
    setPName(p.name);
    setPCat(p.categoryId);
    setPPrice(p.price);
    setPStock(p.stock);
    setPMinStock(p.minStock);
    setPDesc(p.description);
    setPImg(p.imageUrl);
    setPImgError('');
    setPUseRecipe(p.useRecipe);
    setPRecipe(p.recipe);
    setPLinkedStockId(p.linkedStockItemId || '');
    setPAutoCreateStock(!p.linkedStockItemId);
    setProdModalOpen(true);
  };

  const handleProductPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPImgError('');
    try {
      const dataUrl = await compressImageToDataUrl(file, { maxDimension: 640, quality: 0.82 });
      setPImg(dataUrl);
    } catch {
      setPImgError('Impossible de charger cette image. Utilisez JPG, PNG ou WebP.');
    } finally {
      e.target.value = '';
    }
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    addCategory(catName.trim(), catDesc.trim() || undefined);
    setCatName('');
    setCatDesc('');
    setCatModalOpen(false);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim()) return;
    saveProduct(
      {
        categoryId: pCat,
        name: pName.trim(),
        description: pDesc.trim(),
        price: Math.max(0, pPrice),
        imageUrl: pImg.trim() || PRESET_PHOTOS[0].url,
        stock: Math.max(0, pStock),
        minStock: Math.max(0, pMinStock),
        isAvailable: true,
        useRecipe: pUseRecipe,
        recipe: pUseRecipe ? pRecipe.filter((r) => r.quantity > 0) : [],
        linkedStockItemId: !pUseRecipe && pLinkedStockId ? pLinkedStockId : undefined,
        preparationMinutes: 15,
      },
      editingProdId,
      !pUseRecipe && !pLinkedStockId && pAutoCreateStock
    );
    setProdModalOpen(false);
  };

  const addRecipeRow = () => {
    const first = state.stockItems[0];
    if (!first) return;
    setPRecipe((prev) => [...prev, { stockItemId: first.id, quantity: 0.2 }]);
  };

  const handleAddIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingName.trim()) return;
    addStockItem({
      name: ingName.trim(),
      category: ingCat,
      unit: ingUnit,
      quantity: Math.max(0, ingQty),
      minQuantity: Math.max(0, ingMin),
      unitCost: Math.max(0, ingCost),
    });
    setIngName('');
    setAddIngOpen(false);
  };

  const handleSaveMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movItemId || movQty <= 0) return;
    recordStockMovement(movItemId, movType, movQty, movReason.trim());
    setMovReason('');
    setMovModalOpen(false);
  };

  // STOCK VIEW
  if (mode === 'stock') {
    const lowCount = state.stockItems.filter((s) => s.quantity <= s.minQuantity).length;
    const totalValuation = state.stockItems.reduce((sum, s) => sum + s.quantity * s.unitCost, 0);
    const filteredStock = state.stockItems.filter(
      (s) =>
        !stockSearch.trim() ||
        s.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
        s.category.toLowerCase().includes(stockSearch.toLowerCase())
    );

    return (
      <div className="space-y-6">
        <PageHeader
          title="Gestion des Stocks & Ingrédients"
          description="Suivi unifié des boissons, produits finis et matières premières — chaque vente génère automatiquement une sortie."
          actions={
            <>
              <Btn
                variant="secondary"
                leftIcon={<ArrowUpRight className="w-4 h-4" />}
                onClick={() => {
                  setMovItemId(state.stockItems[0]?.id || '');
                  setMovType('ENTREE');
                  setMovQty(5);
                  setMovModalOpen(true);
                }}
              >
                Entrée / Sortie
              </Btn>
              <Btn variant="accent" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setAddIngOpen(true)}>
                Nouvel article stock
              </Btn>
            </>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard label="Références suivies" value={state.stockItems.length} icon={<Boxes className="w-4 h-4" />} />
          <KpiCard
            label="Articles en alerte"
            value={lowCount}
            tone={lowCount > 0 ? 'warn' : 'ok'}
            helper={lowCount > 0 ? 'Sous le seuil minimum' : 'Niveaux optimaux'}
          />
          <KpiCard label="Valorisation stock" value={formatFCFA(totalValuation)} helper="Coût d’achat estimé" />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <FilterTabs
            activeId={stockTab}
            onChange={(id) => setStockTab(id as typeof stockTab)}
            tabs={[
              { id: 'ITEMS', label: 'Inventaire complet', count: state.stockItems.length },
              { id: 'MOVEMENTS', label: 'Journal entrées & sorties', count: state.stockMovements.length },
            ]}
          />
          {stockTab === 'ITEMS' && (
            <SearchInput value={stockSearch} onChange={setStockSearch} placeholder="Rechercher eau, viande, oignon..." className="w-full sm:w-72" />
          )}
        </div>

        {stockTab === 'ITEMS' ? (
          <Surface padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr
                    className="border-b text-[11px] uppercase tracking-[0.05em]"
                    style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink-muted)', backgroundColor: 'var(--bg-subtle)' }}
                  >
                    <th className="py-3 px-4 font-medium">Article / Matière</th>
                    <th className="py-3 px-4 font-medium">Catégorie</th>
                    <th className="py-3 px-4 font-medium text-right">Stock actuel</th>
                    <th className="py-3 px-4 font-medium text-right">Seuil min.</th>
                    <th className="py-3 px-4 font-medium text-right">Coût unit.</th>
                    <th className="py-3 px-4 font-medium">État</th>
                    <th className="py-3 px-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
                  {filteredStock.map((item) => {
                    const status =
                      item.quantity <= 0
                        ? { label: 'Rupture', tone: 'err' as const }
                        : item.quantity <= item.minQuantity
                        ? { label: 'Stock bas', tone: 'warn' as const }
                        : { label: 'Optimal', tone: 'ok' as const };
                    const linkedProd = state.products.find((p) => p.linkedStockItemId === item.id);
                    return (
                      <tr key={item.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-medium flex items-center gap-1.5">
                            <span>{item.name}</span>
                            {linkedProd && (
                              <span
                                className="inline-flex items-center gap-0.5 text-[10.5px] px-1.5 py-0.5 rounded border"
                                style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink-muted)' }}
                                title="Synchronisé 1:1 avec la Caisse POS"
                              >
                                <Link2 className="w-2.5 h-2.5" />
                                POS
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4" style={{ color: 'var(--ink-muted)' }}>
                          {item.category}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold tabular-nums">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-3.5 px-4 text-right tabular-nums" style={{ color: 'var(--ink-muted)' }}>
                          {item.minQuantity} {item.unit}
                        </td>
                        <td className="py-3.5 px-4 text-right tabular-nums">{formatFCFA(item.unitCost)}</td>
                        <td className="py-3.5 px-4">
                          <StatusPill tone={status.tone}>{status.label}</StatusPill>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex gap-1">
                            <Btn
                              variant="secondary"
                              size="xs"
                              onClick={() => {
                                setMovItemId(item.id);
                                setMovType('ENTREE');
                                setMovQty(5);
                                setMovModalOpen(true);
                              }}
                            >
                              + Entrée
                            </Btn>
                            <Btn
                              variant="ghost"
                              size="xs"
                              onClick={() => {
                                setMovItemId(item.id);
                                setMovType('SORTIE');
                                setMovQty(1);
                                setMovModalOpen(true);
                              }}
                            >
                              − Sortie
                            </Btn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Surface>
        ) : (
          <Surface padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr
                    className="border-b text-[11px] uppercase tracking-[0.05em]"
                    style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink-muted)', backgroundColor: 'var(--bg-subtle)' }}
                  >
                    <th className="py-3 px-4 font-medium">Date</th>
                    <th className="py-3 px-4 font-medium">Article</th>
                    <th className="py-3 px-4 font-medium">Type</th>
                    <th className="py-3 px-4 font-medium text-right">Variation</th>
                    <th className="py-3 px-4 font-medium">Motif & Acteur</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
                  {state.stockMovements.map((m) => (
                    <tr key={m.id} className="hover:bg-[var(--bg-subtle)]">
                      <td className="py-3 px-4 text-[12px] tabular-nums" style={{ color: 'var(--ink-muted)' }}>
                        {formatShortDateTime(m.createdAt)}
                      </td>
                      <td className="py-3 px-4 font-medium">{m.stockItemName}</td>
                      <td className="py-3 px-4">
                        <StatusPill tone={m.quantity >= 0 ? 'ok' : m.type === 'VENTE' ? 'accent' : 'warn'}>
                          {m.type}
                        </StatusPill>
                      </td>
                      <td
                        className="py-3 px-4 text-right font-mono font-semibold tabular-nums"
                        style={{ color: m.quantity >= 0 ? 'var(--ok-text)' : 'var(--err-text)' }}
                      >
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {m.unit}
                      </td>
                      <td className="py-3 px-4">
                        <div>{m.reason}</div>
                        <div className="text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                          Par {m.actor}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Surface>
        )}

        {/* Modal Entrée / Sortie */}
        <DialogModal
          isOpen={movModalOpen}
          onClose={() => setMovModalOpen(false)}
          title="Mouvement de stock"
          subtitle="Enregistrez une entrée marchandise ou une sortie cuisine / perte"
          maxWidth="sm"
        >
          <form onSubmit={handleSaveMovement} className="space-y-3.5">
            <Field label="Type de mouvement">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMovType('ENTREE')}
                  style={{
                    backgroundColor: movType === 'ENTREE' ? 'var(--ok-bg)' : 'var(--bg-surface)',
                    color: movType === 'ENTREE' ? 'var(--ok-text)' : 'var(--ink-secondary)',
                    borderColor: movType === 'ENTREE' ? 'var(--ok-border)' : 'var(--border-hairline)',
                  }}
                  className="h-9 rounded-lg border text-[12.5px] font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  Entrée stock
                </button>
                <button
                  type="button"
                  onClick={() => setMovType('SORTIE')}
                  style={{
                    backgroundColor: movType === 'SORTIE' ? 'var(--warn-bg)' : 'var(--bg-surface)',
                    color: movType === 'SORTIE' ? 'var(--warn-text)' : 'var(--ink-secondary)',
                    borderColor: movType === 'SORTIE' ? 'var(--warn-border)' : 'var(--border-hairline)',
                  }}
                  className="h-9 rounded-lg border text-[12.5px] font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Sortie stock
                </button>
              </div>
            </Field>
            <Field label="Article en stock" required>
              <select value={movItemId} onChange={(e) => setMovItemId(e.target.value)} style={inputBaseStyle} className={inputBaseClass}>
                {state.stockItems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Actuel : {s.quantity} {s.unit})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Quantité" required>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={movQty}
                onChange={(e) => setMovQty(Number(e.target.value))}
                style={inputBaseStyle}
                className={`${inputBaseClass} tabular-nums`}
              />
            </Field>
            <Field label="Motif">
              <input
                type="text"
                value={movReason}
                onChange={(e) => setMovReason(e.target.value)}
                placeholder="Ex: Livraison SABC, achat marché Abattoir, casse..."
                style={inputBaseStyle}
                className={inputBaseClass}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Btn type="button" variant="secondary" onClick={() => setMovModalOpen(false)}>
                Annuler
              </Btn>
              <Btn type="submit" variant="primary">
                Valider le mouvement
              </Btn>
            </div>
          </form>
        </DialogModal>

        {/* Modal Nouvel Article Stock */}
        <DialogModal isOpen={addIngOpen} onClose={() => setAddIngOpen(false)} title="Nouvel article / ingrédient en stock" maxWidth="sm">
          <form onSubmit={handleAddIngredient} className="space-y-3.5">
            <Field label="Désignation" required>
              <input type="text" required value={ingName} onChange={(e) => setIngName(e.target.value)} placeholder="ex: Eau Supermont 1.5L ou Piment sec" style={inputBaseStyle} className={inputBaseClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Catégorie">
                <input type="text" value={ingCat} onChange={(e) => setIngCat(e.target.value)} style={inputBaseStyle} className={inputBaseClass} />
              </Field>
              <Field label="Unité">
                <select value={ingUnit} onChange={(e) => setIngUnit(e.target.value)} style={inputBaseStyle} className={inputBaseClass}>
                  <option value="bouteille">bouteille</option>
                  <option value="pièce">pièce</option>
                  <option value="portion">portion</option>
                  <option value="kg">kg</option>
                  <option value="L">L</option>
                  <option value="sac">sac</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <Field label="Stock initial">
                <input type="number" step="0.5" min={0} value={ingQty} onChange={(e) => setIngQty(Number(e.target.value))} style={inputBaseStyle} className={`${inputBaseClass} tabular-nums`} />
              </Field>
              <Field label="Seuil alerte">
                <input type="number" step="0.5" min={0} value={ingMin} onChange={(e) => setIngMin(Number(e.target.value))} style={inputBaseStyle} className={`${inputBaseClass} tabular-nums`} />
              </Field>
              <Field label="Coût (FCFA)">
                <input type="number" step={50} min={0} value={ingCost} onChange={(e) => setIngCost(Number(e.target.value))} style={inputBaseStyle} className={`${inputBaseClass} tabular-nums`} />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Btn type="button" variant="secondary" onClick={() => setAddIngOpen(false)}>
                Annuler
              </Btn>
              <Btn type="submit" variant="primary">
                Ajouter au stock
              </Btn>
            </div>
          </form>
        </DialogModal>
      </div>
    );
  }

  // MENU & PRODUCTS VIEW
  return (
    <div className="space-y-6">
      <PageHeader
        title="Menu & Produits"
        description="Gérez votre carte, importez vos photos produits et reliez chaque article au stock ou aux recettes."
        actions={
          <>
            <Btn variant="secondary" leftIcon={<Tag className="w-4 h-4" />} onClick={() => setCatModalOpen(true)}>
              Nouvelle catégorie
            </Btn>
            <Btn variant="accent" leftIcon={<Plus className="w-4 h-4" />} onClick={openNewProduct}>
              Ajouter un produit
            </Btn>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Categories Rail */}
        <Surface padding="sm" className="lg:col-span-3 space-y-1">
          <div className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.06em]" style={{ color: 'var(--ink-muted)' }}>
            Catégories
          </div>
          <button
            type="button"
            onClick={() => setSelectedCat('ALL')}
            style={{
              backgroundColor: selectedCat === 'ALL' ? 'var(--ink-primary)' : 'transparent',
              color: selectedCat === 'ALL' ? 'var(--ink-inverse)' : 'var(--ink-secondary)',
            }}
            className="w-full px-3 py-2 rounded-lg text-[13px] font-medium flex items-center justify-between cursor-pointer transition-colors"
          >
            <span>Tous les produits</span>
            <span className="text-[11.5px] tabular-nums opacity-80">{state.products.length}</span>
          </button>
          {state.categories.map((cat) => {
            const active = selectedCat === cat.id;
            const count = state.products.filter((p) => p.categoryId === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCat(cat.id)}
                style={{
                  backgroundColor: active ? 'var(--ink-primary)' : 'transparent',
                  color: active ? 'var(--ink-inverse)' : 'var(--ink-secondary)',
                }}
                className="w-full px-3 py-2 rounded-lg text-[13px] font-medium flex items-center justify-between cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
              >
                <span className="truncate pr-2">{cat.name}</span>
                <span className="text-[11.5px] tabular-nums opacity-75">{count}</span>
              </button>
            );
          })}
        </Surface>

        {/* Right Products Grid */}
        <div className="lg:col-span-9 space-y-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un plat, boisson ou spécialité..." />

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProducts.map((p) => {
              const low = p.stock <= p.minStock;
              return (
                <Surface key={p.id} padding="none" hoverable className="overflow-hidden flex flex-col">
                  <div className="aspect-[16/10] w-full overflow-hidden relative" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                    <img src={p.imageUrl} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                    {p.useRecipe ? (
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1 bg-white/95 text-[#18181B] shadow-xs">
                        <ChefHat className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                        Recette ({p.recipe.length})
                      </span>
                    ) : p.linkedStockItemId ? (
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1 bg-white/95 text-[#18181B] shadow-xs">
                        <Link2 className="w-3 h-3" style={{ color: 'var(--ok-dot)' }} />
                        Stock lié
                      </span>
                    ) : null}
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-[14px] leading-snug">{p.name}</h3>
                        <span className="font-semibold text-[13.5px] tabular-nums shrink-0" style={{ color: 'var(--accent)' }}>
                          {formatFCFA(p.price)}
                        </span>
                      </div>
                      <p className="text-[12px] mt-1 line-clamp-2" style={{ color: 'var(--ink-muted)' }}>
                        {p.description || 'Aucune description'}
                      </p>
                    </div>

                    <div className="pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: 'var(--border-hairline)' }}>
                      <StatusPill tone={low ? 'warn' : 'ok'}>
                        {p.stock} en stock
                      </StatusPill>
                      <div className="flex items-center gap-1">
                        <Btn variant="secondary" size="xs" leftIcon={<Pencil className="w-3 h-3" />} onClick={() => openEditProduct(p)}>
                          Modifier
                        </Btn>
                        <button
                          type="button"
                          onClick={() => deleteProduct(p.id)}
                          className="p-1.5 rounded-md hover:bg-[var(--err-bg)] cursor-pointer"
                          style={{ color: 'var(--ink-muted)' }}
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Surface>
              );
            })}
          </div>
        </div>
      </div>

      {/* Category Modal */}
      <DialogModal isOpen={catModalOpen} onClose={() => setCatModalOpen(false)} title="Nouvelle catégorie" maxWidth="sm">
        <form onSubmit={handleSaveCategory} className="space-y-3.5">
          <Field label="Nom de la catégorie" required>
            <input type="text" required value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="ex: Pizzas & Gratinés" style={inputBaseStyle} className={inputBaseClass} />
          </Field>
          <Field label="Description">
            <input type="text" value={catDesc} onChange={(e) => setCatDesc(e.target.value)} style={inputBaseStyle} className={inputBaseClass} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Btn type="button" variant="secondary" onClick={() => setCatModalOpen(false)}>
              Annuler
            </Btn>
            <Btn type="submit" variant="primary">
              Créer
            </Btn>
          </div>
        </form>
      </DialogModal>

      {/* Product + Photo Upload + Stock/Recipe Link Modal */}
      <DialogModal
        isOpen={prodModalOpen}
        onClose={() => setProdModalOpen(false)}
        title={editingProdId ? 'Modifier le produit' : 'Ajouter un produit'}
        subtitle="Importez une photo, définissez le prix et reliez la déduction de stock"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          {/* Photo Upload Card with Camera / ImagePlus icon */}
          <div className="p-3.5 rounded-xl border flex flex-col sm:flex-row items-center gap-4" style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="group relative w-28 h-24 rounded-lg overflow-hidden border shrink-0 cursor-pointer flex items-center justify-center bg-white"
              style={{ borderColor: 'var(--border-hairline)' }}
              title="Cliquer pour choisir une photo"
            >
              {pImg ? (
                <img src={pImg} alt="Aperçu produit" className="w-full h-full object-cover" />
              ) : (
                <ImagePlus className="w-6 h-6" style={{ color: 'var(--ink-muted)' }} />
              )}
              <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] font-medium gap-1">
                <Camera className="w-4 h-4" />
                <span>Changer</span>
              </div>
            </button>

            <div className="flex-1 w-full space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[13px] font-semibold">Photo du produit</div>
                  <div className="text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                    Importez depuis votre ordinateur/téléphone ou choisissez un visuel
                  </div>
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProductPhotoUpload}
                />
                <Btn
                  type="button"
                  variant="secondary"
                  size="xs"
                  leftIcon={<ImagePlus className="w-3.5 h-3.5" />}
                  onClick={() => photoInputRef.current?.click()}
                >
                  Importer une photo
                </Btn>
              </div>

              {pImgError && (
                <div className="text-[11.5px]" style={{ color: 'var(--err-text)' }}>
                  {pImgError}
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {PRESET_PHOTOS.map((ph) => (
                  <button
                    key={ph.label}
                    type="button"
                    onClick={() => setPImg(ph.url)}
                    className="px-2 py-0.5 rounded border text-[11px] cursor-pointer hover:bg-[var(--bg-surface)]"
                    style={{
                      borderColor: pImg === ph.url ? 'var(--accent)' : 'var(--border-hairline)',
                      backgroundColor: pImg === ph.url ? 'var(--accent-soft)' : 'var(--bg-surface)',
                    }}
                  >
                    {ph.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Field label="Nom du produit" required>
              <input type="text" required value={pName} onChange={(e) => setPName(e.target.value)} placeholder="ex: Eau Supermont 1.5L ou Cabri Braisé" style={inputBaseStyle} className={inputBaseClass} />
            </Field>
            <Field label="Catégorie" required>
              <select value={pCat} onChange={(e) => setPCat(e.target.value)} style={inputBaseStyle} className={inputBaseClass}>
                {state.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Prix de vente (FCFA)" required>
              <input type="number" required min={0} step={100} value={pPrice} onChange={(e) => setPPrice(Number(e.target.value))} style={inputBaseStyle} className={`${inputBaseClass} tabular-nums`} />
            </Field>
            <Field label="Stock initial">
              <input type="number" min={0} value={pStock} onChange={(e) => setPStock(Number(e.target.value))} style={inputBaseStyle} className={`${inputBaseClass} tabular-nums`} />
            </Field>
            <Field label="Stock minimum">
              <input type="number" min={0} value={pMinStock} onChange={(e) => setPMinStock(Number(e.target.value))} style={inputBaseStyle} className={`${inputBaseClass} tabular-nums`} />
            </Field>
          </div>

          <Field label="Description">
            <input type="text" value={pDesc} onChange={(e) => setPDesc(e.target.value)} placeholder="Description courte visible sur la carte..." style={inputBaseStyle} className={inputBaseClass} />
          </Field>

          {/* Liaison Stock / Recette (100% connecté aux ventes) */}
          <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}>
            <div className="text-[13px] font-semibold flex items-center gap-1.5">
              <UtensilsCrossed className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              Suivi de stock automatique lors des ventes
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPUseRecipe(false)}
                style={{
                  backgroundColor: !pUseRecipe ? 'var(--bg-surface)' : 'transparent',
                  borderColor: !pUseRecipe ? 'var(--accent)' : 'var(--border-hairline)',
                }}
                className="p-3 rounded-lg border text-left cursor-pointer transition-all"
              >
                <div className="text-[12.5px] font-semibold flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                  Stock direct (Article unitaire)
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                  Idéal pour boissons, bouteilles d’eau, canettes : −1 en stock à chaque vente.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPUseRecipe(true)}
                style={{
                  backgroundColor: pUseRecipe ? 'var(--bg-surface)' : 'transparent',
                  borderColor: pUseRecipe ? 'var(--accent)' : 'var(--border-hairline)',
                }}
                className="p-3 rounded-lg border text-left cursor-pointer transition-all"
              >
                <div className="text-[12.5px] font-semibold flex items-center gap-1.5">
                  <ChefHat className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                  Gestion par recette (Ingrédients)
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                  Idéal pour plats cuisinés : déduit viande, oignons, mil, huile… automatiquement.
                </div>
              </button>
            </div>

            {!pUseRecipe ? (
              <div className="space-y-2.5 pt-2 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                <Field label="Article lié dans Gestion de Stock">
                  <select
                    value={pLinkedStockId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPLinkedStockId(val);
                      const found = state.stockItems.find((s) => s.id === val);
                      if (found) {
                        setPStock(found.quantity);
                        setPMinStock(found.minQuantity);
                      }
                    }}
                    style={inputBaseStyle}
                    className={inputBaseClass}
                  >
                    <option value="">Créer automatiquement une fiche Stock dédiée</option>
                    {state.stockItems.map((s) => (
                      <option key={s.id} value={s.id}>
                        Lier à : {s.name} ({s.quantity} {s.unit})
                      </option>
                    ))}
                  </select>
                </Field>
                {!pLinkedStockId && (
                  <label className="inline-flex items-center gap-2 text-[12px] cursor-pointer" style={{ color: 'var(--ink-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={pAutoCreateStock}
                      onChange={(e) => setPAutoCreateStock(e.target.checked)}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    Créer et suivre automatiquement cet article dans Gestion de Stock (sortie auto à chaque vente)
                  </label>
                )}
              </div>
            ) : (
              <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                {pRecipe.map((row, idx) => {
                  const stockItem = state.stockItems.find((s) => s.id === row.stockItemId);
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={row.stockItemId}
                        onChange={(e) => {
                          const next = [...pRecipe];
                          next[idx] = { ...row, stockItemId: e.target.value };
                          setPRecipe(next);
                        }}
                        style={inputBaseStyle}
                        className={`${inputBaseClass} flex-1`}
                      >
                        {state.stockItems.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.unit})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.05"
                        min="0.01"
                        value={row.quantity}
                        onChange={(e) => {
                          const next = [...pRecipe];
                          next[idx] = { ...row, quantity: Number(e.target.value) };
                          setPRecipe(next);
                        }}
                        style={inputBaseStyle}
                        className="w-24 h-9 px-2.5 rounded-lg border text-right tabular-nums text-[13px]"
                      />
                      <span className="text-[12px] w-14" style={{ color: 'var(--ink-muted)' }}>
                        {stockItem?.unit || 'u.'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPRecipe(pRecipe.filter((_, i) => i !== idx))}
                        className="p-1.5 rounded hover:bg-[var(--err-bg)] cursor-pointer"
                        style={{ color: 'var(--ink-muted)' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                <Btn type="button" variant="secondary" size="xs" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={addRecipeRow}>
                  Ajouter un ingrédient
                </Btn>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Btn type="button" variant="secondary" onClick={() => setProdModalOpen(false)}>
              Annuler
            </Btn>
            <Btn type="submit" variant="accent">
              {editingProdId ? 'Enregistrer les modifications' : 'Créer le produit'}
            </Btn>
          </div>
        </form>
      </DialogModal>
    </div>
  );
};
