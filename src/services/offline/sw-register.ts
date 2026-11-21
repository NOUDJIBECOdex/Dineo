export type SwStatus = 'UNSUPPORTED' | 'REGISTERING' | 'READY' | 'UPDATE_AVAILABLE' | 'ERROR';

export interface SwRegistrationHandle {
  applyUpdate: () => void;
}

/**
 * Enregistre le Service Worker Dineo (/sw.js) pour rendre l'application
 * entièrement disponible sans connexion internet (mode avion / panne 3G Maroua).
 */
export function registerDineoServiceWorker(
  onStatusChange: (status: SwStatus) => void
): SwRegistrationHandle {
  let waitingWorker: ServiceWorker | null = null;

  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    onStatusChange('UNSUPPORTED');
    return { applyUpdate: () => {} };
  }

  onStatusChange('REGISTERING');

  const doRegister = () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        if (reg.waiting) {
          waitingWorker = reg.waiting;
          onStatusChange('UPDATE_AVAILABLE');
        } else if (reg.active) {
          onStatusChange('READY');
        }

        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                waitingWorker = installing;
                onStatusChange('UPDATE_AVAILABLE');
              } else {
                onStatusChange('READY');
              }
            }
          });
        });

        // Assurer l'état READY après contrôle actif
        navigator.serviceWorker.ready
          .then(() => {
            if (!waitingWorker) onStatusChange('READY');
          })
          .catch(() => {});
      })
      .catch(() => {
        onStatusChange('ERROR');
      });
  };

  if (document.readyState === 'complete') {
    doRegister();
  } else {
    window.addEventListener('load', doRegister, { once: true });
  }

  return {
    applyUpdate: () => {
      if (waitingWorker) {
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    },
  };
}
