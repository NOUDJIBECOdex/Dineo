import {
  Activity,
  Award,
  BarChart3,
  Bell,
  Boxes,
  CalendarClock,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  ExternalLink,
  History,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Menu,
  Moon,
  PackageCheck,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sun,
  Truck,
  UserCog,
  Users,
  UtensilsCrossed,
  Volume2,
  VolumeX,
  Wallet,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useErp } from '../../../store/erp.context';
import type { NavModuleId } from '../../../types/erp';
import { Btn, RestaurantLogo } from '../ui/Primitives';

interface NavItemDef {
  id: NavModuleId;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

interface NavGroupDef {
  title: string;
  items: NavItemDef[];
}

export const NAV_GROUPS: NavGroupDef[] = [
  {
    title: 'Principal',
    items: [
      { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
      { id: 'pos', label: 'Caisse (POS)', icon: ShoppingCart },
      { id: 'kds', label: 'Cuisine (KDS)', icon: ChefHat },
    ],
  },
  {
    title: 'Ventes & Clients',
    items: [
      { id: 'billing', label: 'Facturation', icon: Receipt },
      { id: 'history', label: 'Historique', icon: History },
      { id: 'deliveries', label: 'Livraisons', icon: Truck },
      { id: 'tables', label: 'Tables', icon: LayoutGrid },
      { id: 'reservations', label: 'Réservations', icon: CalendarClock },
      { id: 'loyalty', label: 'Fidélité', icon: Award },
      { id: 'customers', label: 'Clients', icon: Users },
    ],
  },
  {
    title: 'Gestion & Stock',
    items: [
      { id: 'products', label: 'Menu & Produits', icon: UtensilsCrossed },
      { id: 'stock', label: 'Stock', icon: Boxes },
      { id: 'purchases', label: 'Achats', icon: ShoppingBag },
      { id: 'suppliers', label: 'Fournisseurs', icon: PackageCheck },
    ],
  },
  {
    title: 'Finance',
    items: [
      { id: 'reports', label: 'Rapports', icon: BarChart3 },
      { id: 'expenses', label: 'Dépenses', icon: Wallet },
      { id: 'salaries', label: 'Salaires', icon: CreditCard },
      { id: 'partial_payments', label: 'Paiements partiels', icon: Receipt },
    ],
  },
  {
    title: 'Administration',
    items: [
      { id: 'staff', label: 'Personnel', icon: UserCog },
      { id: 'users', label: 'Utilisateurs', icon: ShieldCheck },
      { id: 'audit', label: 'Audit', icon: Activity },
      { id: 'settings', label: 'Paramètres', icon: Settings },
    ],
  },
];

interface RestaurantShellProps {
  activeModule: NavModuleId;
  onSelectModule: (id: NavModuleId) => void;
  onOpenClientPreview?: () => void;
  onOpenDriverSpace?: () => void;
  children: React.ReactNode;
}

export const RestaurantShell: React.FC<RestaurantShellProps> = ({
  activeModule,
  onSelectModule,
  onOpenClientPreview,
  onOpenDriverSpace,
  children,
}) => {
  const { state, currentUser, switchUser, logout, resolveWaiterCall, hasPermission, toggleDarkMode, soundEnabled, toggleSound } = useErp();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const badges = useMemo(() => {
    const kdsPending = state.orders.filter(
      (o) => o.kitchenStatus === 'NOUVELLE' || o.kitchenStatus === 'EN_PREPARATION'
    ).length;
    const lowStock =
      state.stockItems.filter((s) => s.quantity <= s.minQuantity).length +
      state.products.filter((p) => !p.useRecipe && p.stock <= p.minStock).length;
    const partialCount = state.orders.filter((o) => o.paymentStatus === 'PARTIEL').length;
    const deliveryPending = state.orders.filter(
      (o) => o.channel === 'LIVRAISON' && o.deliveryStatus !== 'LIVREE'
    ).length;
    const activeWaiterCalls = (state.waiterCalls || []).filter((w) => !w.resolved);
    return { kdsPending, lowStock, partialCount, deliveryPending, activeWaiterCalls };
  }, [state.orders, state.stockItems, state.products, state.waiterCalls]);

  const activeNavLabel = useMemo(() => {
    for (const g of NAV_GROUPS) {
      const found = g.items.find((i) => i.id === activeModule);
      if (found) return { group: g.title, label: found.label };
    }
    return { group: 'Principal', label: 'Tableau de bord' };
  }, [activeModule]);

  const getBadgeCount = (id: NavModuleId): number => {
    if (id === 'kds') return badges.kdsPending;
    if (id === 'stock') return badges.lowStock;
    if (id === 'partial_payments') return badges.partialCount;
    if (id === 'deliveries') return badges.deliveryPending;
    return 0;
  };

  const totalAlerts = badges.kdsPending + badges.lowStock + badges.activeWaiterCalls.length;

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full">
      {/* Brand header */}
      <div
        className="h-14 px-3.5 flex items-center justify-between border-b shrink-0"
        style={{ borderColor: 'var(--border-hairline)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <RestaurantLogo logoUrl={state.settings.logoUrl} name={state.settings.name} size="md" />
          {(!collapsed || isMobile) && (
            <div className="min-w-0">
              <div className="text-[14px] font-semibold tracking-[-0.02em] truncate" style={{ color: 'var(--ink-primary)' }}>
                Dineo
              </div>
              <div className="text-[11px] truncate" style={{ color: 'var(--ink-muted)' }}>
                {state.settings.name}
              </div>
            </div>
          )}
        </div>

        {isMobile ? (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg cursor-pointer"
            style={{ color: 'var(--ink-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 rounded-md transition-colors cursor-pointer hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--ink-muted)' }}
            title={collapsed ? 'Déplier le menu' : 'Réduire le menu'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-5">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) => hasPermission(item.id));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title}>
              {(!collapsed || isMobile) && (
                <div
                  className="px-2.5 mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.07em]"
                  style={{ color: 'var(--ink-muted)' }}
                >
                  {group.title}
                </div>
              )}

              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeModule === item.id;
                  const count = getBadgeCount(item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectModule(item.id);
                        if (isMobile) setMobileOpen(false);
                      }}
                      title={collapsed && !isMobile ? item.label : undefined}
                      style={{
                        backgroundColor: isActive ? 'var(--bg-hover)' : 'transparent',
                        color: isActive ? 'var(--ink-primary)' : 'var(--ink-secondary)',
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-colors cursor-pointer relative hover:bg-[var(--bg-hover)] ${isActive ? 'font-semibold' : 'font-normal'
                        } ${collapsed && !isMobile ? 'justify-center' : ''}`}
                    >
                      {isActive && (
                        <span
                          className="absolute left-0 top-2 bottom-2 w-[2.5px] rounded-r-full"
                          style={{ backgroundColor: 'var(--accent)' }}
                        />
                      )}
                      <Icon
                        className="w-[17px] h-[17px] shrink-0"
                        style={{ color: isActive ? 'var(--accent)' : 'var(--ink-muted)' }}
                      />
                      {(!collapsed || isMobile) && (
                        <>
                          <span className="truncate flex-1 text-left">{item.label}</span>
                          {count > 0 && (
                            <span
                              className="text-[11px] font-medium tabular-nums px-1.5 py-0.2 rounded-full"
                              style={{
                                backgroundColor:
                                  item.id === 'stock' || item.id === 'partial_payments'
                                    ? 'var(--warn-bg)'
                                    : 'var(--accent-soft)',
                                color:
                                  item.id === 'stock' || item.id === 'partial_payments'
                                    ? 'var(--warn-text)'
                                    : 'var(--accent)',
                              }}
                            >
                              {count}
                            </span>
                          )}
                        </>
                      )}
                      {collapsed && !isMobile && count > 0 && (
                        <span
                          className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                          style={{ backgroundColor: 'var(--accent)' }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom User / Role Switcher + Déconnexion */}
      <div className="p-2.5 border-t relative shrink-0 space-y-1" style={{ borderColor: 'var(--border-hairline)' }}>
        <button
          type="button"
          onClick={() => setUserMenuOpen((o) => !o)}
          className="w-full flex items-center gap-2.5 p-2 rounded-lg transition-colors cursor-pointer hover:bg-[var(--bg-hover)]"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold shrink-0 border"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-hairline)',
              color: 'var(--ink-primary)',
            }}
          >
            {currentUser.fullName
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>
          {(!collapsed || isMobile) && (
            <div className="min-w-0 flex-1 text-left">
              <div className="text-[12.5px] font-medium truncate" style={{ color: 'var(--ink-primary)' }}>
                {currentUser.fullName}
              </div>
              <div className="text-[11px] truncate" style={{ color: 'var(--ink-muted)' }}>
                {currentUser.roleLabel}
              </div>
            </div>
          )}
        </button>

        {/* Bouton Déconnexion dans la barre du menu */}
        <button
          type="button"
          onClick={() => {
            setUserMenuOpen(false);
            if (isMobile) setMobileOpen(false);
            logout();
          }}
          title={collapsed && !isMobile ? 'Déconnexion' : undefined}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] font-medium transition-colors cursor-pointer hover:bg-[var(--err-bg)] ${collapsed && !isMobile ? 'justify-center' : ''
            }`}
          style={{ color: 'var(--err-text)' }}
        >
          <LogOut className="w-[16px] h-[16px] shrink-0" />
          {(!collapsed || isMobile) && <span>Déconnexion</span>}
        </button>

        {userMenuOpen && (
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-hairline)',
            }}
            className="absolute bottom-full left-2.5 right-2.5 mb-2 rounded-xl border shadow-lg p-1.5 z-40 min-w-[210px]"
          >
            <div className="px-2.5 py-1.5 text-[10.5px] uppercase tracking-wider font-medium" style={{ color: 'var(--ink-muted)' }}>
              Changer de profil (RBAC)
            </div>
            {state.users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  switchUser(u.id);
                  setUserMenuOpen(false);
                  if (!u.permissions.includes(activeModule) && u.permissions.length > 0) {
                    onSelectModule(u.permissions[0]);
                  }
                }}
                style={{
                  backgroundColor: u.id === currentUser.id ? 'var(--bg-subtle)' : 'transparent',
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg text-[12.5px] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="font-medium" style={{ color: 'var(--ink-primary)' }}>
                    {u.fullName}
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                    {u.roleLabel} · {u.permissions.length} pages
                  </div>
                </div>
                {u.id === currentUser.id && (
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--ink-primary)' }}
    >
      {/* Desktop Sidebar */}
      <aside
        style={{
          backgroundColor: 'var(--bg-sidebar)',
          borderColor: 'var(--border-hairline)',
          width: collapsed ? '68px' : '248px',
        }}
        className="hidden lg:flex flex-col border-r shrink-0 sticky top-0 h-screen transition-[width] duration-200 z-30"
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside
            style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border-hairline)' }}
            className="relative w-[264px] max-w-[85vw] h-full border-r z-10"
          >
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Minimalist Top Bar */}
        <header
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-hairline)',
          }}
          className="h-14 border-b px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-20"
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border cursor-pointer"
              style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink-primary)' }}
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-[13px] min-w-0">
              <span className="hidden sm:inline" style={{ color: 'var(--ink-muted)' }}>
                {activeNavLabel.group}
              </span>
              <span className="hidden sm:inline" style={{ color: 'var(--border-strong)' }}>
                /
              </span>
              <span className="font-medium truncate" style={{ color: 'var(--ink-primary)' }}>
                {activeNavLabel.label}
              </span>
            </div>

            <span
              className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] border"
              style={{
                borderColor: 'var(--border-hairline)',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--ink-muted)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: state.settings.isOpen ? 'var(--ok-dot)' : 'var(--err-dot)' }}
              />
              {state.settings.city} · {state.settings.isOpen ? 'Ouvert' : 'Fermé'}
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {hasPermission('pos') && activeModule !== 'pos' && (
              <Btn
                variant="accent"
                size="sm"
                leftIcon={<ShoppingCart className="w-3.5 h-3.5" />}
                onClick={() => onSelectModule('pos')}
                className="hidden sm:inline-flex"
              >
                Nouvelle vente
              </Btn>
            )}

            <button
              type="button"
              onClick={toggleSound}
              className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors cursor-pointer hover:bg-[var(--bg-subtle)]"
              style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink-secondary)' }}
              title={soundEnabled ? 'Alertes sonores actives' : 'Alertes sonores coupées'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={toggleDarkMode}
              className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors cursor-pointer hover:bg-[var(--bg-subtle)]"
              style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink-secondary)' }}
              title={state.darkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
            >
              {state.darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notifications Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((o) => !o)}
                className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors cursor-pointer hover:bg-[var(--bg-subtle)] relative"
                style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink-secondary)' }}
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {totalAlerts > 0 && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-semibold text-white flex items-center justify-center tabular-nums"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    {totalAlerts}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                  <div
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-hairline)',
                    }}
                    className="absolute right-0 mt-2 w-80 rounded-xl border shadow-xl z-40 overflow-hidden"
                  >
                    <div
                      className="px-4 py-3 border-b flex items-center justify-between"
                      style={{ borderColor: 'var(--border-hairline)' }}
                    >
                      <span className="text-[13px] font-semibold">Alertes en cours</span>
                      <span className="text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                        {totalAlerts} active{totalAlerts > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="divide-y max-h-72 overflow-y-auto" style={{ borderColor: 'var(--border-hairline)' }}>
                      {badges.activeWaiterCalls.map((call) => (
                        <div
                          key={call.id}
                          className="px-4 py-3 flex items-start justify-between gap-2"
                          style={{ backgroundColor: 'var(--accent-soft)' }}
                        >
                          <div className="min-w-0">
                            <div className="text-[12.5px] font-semibold" style={{ color: 'var(--accent)' }}>
                              Appel serveur · {call.tableNumber}
                            </div>
                            <div className="text-[11.5px]" style={{ color: 'var(--ink-primary)' }}>
                              {call.reason}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => resolveWaiterCall(call.id)}
                            className="text-[11px] font-medium px-2 py-1 rounded border shrink-0 cursor-pointer bg-white text-[#18181B]"
                            style={{ borderColor: 'var(--border-hairline)' }}
                          >
                            Traité
                          </button>
                        </div>
                      ))}
                      {badges.kdsPending > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectModule('kds');
                            setNotifOpen(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                        >
                          <div className="text-[12.5px] font-medium">
                            {badges.kdsPending} commande{badges.kdsPending > 1 ? 's' : ''} en cuisine
                          </div>
                          <div className="text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                            Ouvrir l’écran Cuisine (KDS) pour suivre la préparation
                          </div>
                        </button>
                      )}
                      {state.stockItems
                        .filter((s) => s.quantity <= s.minQuantity)
                        .map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              onSelectModule('stock');
                              setNotifOpen(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                          >
                            <div className="text-[12.5px] font-medium" style={{ color: 'var(--warn-text)' }}>
                              Stock bas : {item.name}
                            </div>
                            <div className="text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                              Reste {item.quantity} {item.unit} (seuil {item.minQuantity} {item.unit})
                            </div>
                          </button>
                        ))}
                      {totalAlerts === 0 && (
                        <div className="px-4 py-6 text-center text-[12.5px]" style={{ color: 'var(--ink-muted)' }}>
                          Aucune alerte en attente. Tout est sous contrôle.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {onOpenClientPreview && (
              <button
                type="button"
                onClick={onOpenClientPreview}
                className="hidden md:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[12px] font-medium transition-colors cursor-pointer hover:bg-[var(--bg-subtle)]"
                style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink-secondary)' }}
                title="Ouvrir l’Espace Client Mobile & QR"
              >
                <span>Client</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}

            {onOpenDriverSpace && (
              <button
                type="button"
                onClick={onOpenDriverSpace}
                className="hidden md:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[12px] font-medium transition-colors cursor-pointer hover:bg-[var(--bg-subtle)]"
                style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink-secondary)' }}
                title="Ouvrir l’Espace Livreur Mobile"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Livreur</span>
              </button>
            )}
          </div>
        </header>

        {/* Main View Canvas */}
        <main className={`flex-1 ${activeModule === 'pos' ? 'p-4 sm:p-5' : 'p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto'}`}>
          {children}
        </main>
      </div>
    </div>
  );
};
