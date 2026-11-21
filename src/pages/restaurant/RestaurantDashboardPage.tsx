import React, { useState } from 'react';
import { RestaurantLoginScreen } from '../../components/restaurant/auth/RestaurantLoginScreen';
import { RestaurantShell } from '../../components/restaurant/layout/RestaurantShell';
import { AdminView } from '../../components/restaurant/views/AdminView';
import { BillingHistoryView } from '../../components/restaurant/views/BillingHistoryView';
import { CustomersLoyaltyView } from '../../components/restaurant/views/CustomersLoyaltyView';
import { DashboardOverviewView } from '../../components/restaurant/views/DashboardOverviewView';
import { DeliveriesView } from '../../components/restaurant/views/DeliveriesView';
import { FinanceView } from '../../components/restaurant/views/FinanceView';
import { KdsView } from '../../components/restaurant/views/KdsView';
import { PosView } from '../../components/restaurant/views/PosView';
import { ProductsStockView } from '../../components/restaurant/views/ProductsStockView';
import { PurchasesSuppliersView } from '../../components/restaurant/views/PurchasesSuppliersView';
import { TablesReservationsView } from '../../components/restaurant/views/TablesReservationsView';
import { useErp } from '../../store/erp.context';
import type { NavModuleId } from '../../types/erp';

interface RestaurantDashboardPageProps {
  onSwitchToClient?: () => void;
  onSwitchToDriver?: () => void;
  onOpenDemoSplit?: () => void;
  onTestTableQr?: (tableNumber: string) => void;
}

export const RestaurantDashboardPage: React.FC<RestaurantDashboardPageProps> = ({
  onSwitchToClient,
  onSwitchToDriver,
  onTestTableQr,
}) => {
  const { isAuthenticated, currentUser, hasPermission } = useErp();
  const [selectedModule, setSelectedModule] = useState<NavModuleId>('dashboard');

  if (!isAuthenticated) {
    return (
      <RestaurantLoginScreen
        onOpenClientSpace={onSwitchToClient}
        onOpenDriverSpace={onSwitchToDriver}
      />
    );
  }

  const activeModule: NavModuleId = hasPermission(selectedModule)
    ? selectedModule
    : currentUser.permissions[0] || 'dashboard';

  const setActiveModule = (id: NavModuleId) => {
    setSelectedModule(id);
  };

  const renderActiveView = () => {
    switch (activeModule) {
      case 'dashboard':
        return <DashboardOverviewView onNavigate={setActiveModule} />;
      case 'pos':
        return <PosView />;
      case 'kds':
        return <KdsView />;
      case 'billing':
        return <BillingHistoryView mode="billing" />;
      case 'history':
        return <BillingHistoryView mode="history" />;
      case 'deliveries':
        return <DeliveriesView />;
      case 'tables':
        return <TablesReservationsView mode="tables" onTestTableQr={onTestTableQr} />;
      case 'reservations':
        return <TablesReservationsView mode="reservations" />;
      case 'loyalty':
        return <CustomersLoyaltyView mode="loyalty" />;
      case 'customers':
        return <CustomersLoyaltyView mode="customers" />;
      case 'products':
        return <ProductsStockView mode="products" />;
      case 'stock':
        return <ProductsStockView mode="stock" />;
      case 'purchases':
        return <PurchasesSuppliersView mode="purchases" />;
      case 'suppliers':
        return <PurchasesSuppliersView mode="suppliers" />;
      case 'reports':
        return <FinanceView mode="reports" />;
      case 'expenses':
        return <FinanceView mode="expenses" />;
      case 'salaries':
        return <FinanceView mode="salaries" />;
      case 'partial_payments':
        return <FinanceView mode="partial_payments" />;
      case 'staff':
        return <AdminView mode="staff" />;
      case 'users':
        return <AdminView mode="users" onAfterUserSwitch={setActiveModule} />;
      case 'audit':
        return <AdminView mode="audit" />;
      case 'settings':
        return <AdminView mode="settings" />;
      default:
        return <DashboardOverviewView onNavigate={setActiveModule} />;
    }
  };

  return (
    <RestaurantShell
      activeModule={activeModule}
      onSelectModule={setActiveModule}
      onOpenClientPreview={onSwitchToClient}
      onOpenDriverSpace={onSwitchToDriver}
    >
      {renderActiveView()}
    </RestaurantShell>
  );
};
