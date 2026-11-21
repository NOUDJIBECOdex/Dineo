import React, { Suspense, lazy, useEffect, useState } from 'react';
import { AppErrorBoundary } from './components/common/AppErrorBoundary';
import { CartProvider } from './store/cart.context';
import { ErpProvider } from './store/erp.context';
import { OrderProvider } from './store/order.context';

// Code-splitting par espace métier : sur smartphone 3G à Maroua,
// un client QR ne télécharge QUE l'interface Client, jamais tout l'ERP Restaurant !
const RestaurantDashboardPage = lazy(() =>
  import('./pages/restaurant/RestaurantDashboardPage').then((m) => ({ default: m.RestaurantDashboardPage }))
);
const ClientMobileApp = lazy(() =>
  import('./pages/client/ClientMobileApp').then((m) => ({ default: m.ClientMobileApp }))
);
const DriverMobileApp = lazy(() =>
  import('./pages/driver/DriverMobileApp').then((m) => ({ default: m.DriverMobileApp }))
);
const DemoLauncherPage = lazy(() =>
  import('./pages/demo/DemoLauncherPage').then((m) => ({ default: m.DemoLauncherPage }))
);

const RouteLoadingFallback: React.FC = () => (
  <div
    className="min-h-screen flex flex-col items-center justify-center gap-3"
    style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--ink-muted)' }}
  >
    <div
      className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
      style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
    />
    <span className="text-[13px] font-medium">Chargement de Dineo...</span>
  </div>
);

export function AppContent() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname || '/');
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const renderSpace = () => {
    if (currentPath === '/demo') {
      return <DemoLauncherPage />;
    }

    // Espace Livreur Mobile-First (/livreur ou /driver)
    if (currentPath === '/livreur' || currentPath === '/driver') {
      return <DriverMobileApp onBackToDashboard={() => navigate('/')} />;
    }

    // Espace Client Mobile-First (via QR Code Table /table/T-01 ou lien direct /menu)
    const tableMatch = currentPath.match(/^\/table\/(.+)/);
    if (tableMatch) {
      const tableNum = decodeURIComponent(tableMatch[1]);
      return (
        <ClientMobileApp
          key={`table-${tableNum}`}
          initialTableNumber={tableNum}
          initialChannel="SUR_PLACE"
          onBackToDashboard={() => navigate('/')}
        />
      );
    }

    if (
      currentPath === '/menu' ||
      currentPath === '/client' ||
      currentPath.startsWith('/tracking') ||
      currentPath === '/checkout'
    ) {
      return (
        <ClientMobileApp
          key="client-menu"
          initialChannel="LIVRAISON"
          onBackToDashboard={() => navigate('/')}
        />
      );
    }

    // Default route & /restaurant: Complete Restaurant Dashboard
    return (
      <RestaurantDashboardPage
        onSwitchToClient={() => navigate('/menu')}
        onSwitchToDriver={() => navigate('/livreur')}
        onOpenDemoSplit={() => navigate('/demo')}
        onTestTableQr={(tableNum) => navigate(`/table/${encodeURIComponent(tableNum)}`)}
      />
    );
  };

  return <Suspense fallback={<RouteLoadingFallback />}>{renderSpace()}</Suspense>;
}

export default function App() {
  return (
    <AppErrorBoundary>
      <ErpProvider>
        <OrderProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </OrderProvider>
      </ErpProvider>
    </AppErrorBoundary>
  );
}
