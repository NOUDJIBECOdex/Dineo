import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';
import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Garde-fou de production : empêche tout écran blanc en cas d'exception inattendue
 * et offre une récupération propre sans perte définitive de l'interface.
 */
export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'Erreur applicative inattendue.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Dineo ErrorBoundary]', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearAndReload = () => {
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('dineo_'));
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#F7F6F3] text-[#18181B]">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E7E4DD] p-6 shadow-md space-y-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#FDF1F1] text-[#A62626] mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-[18px] font-semibold">Incident technique détecté</h1>
              <p className="text-[13px] text-[#787770] mt-1">
                L’application s’est protégée contre une erreur inattendue. Rechargez simplement la page pour reprendre.
              </p>
              {this.state.message && (
                <p className="text-[11.5px] font-mono bg-[#F2F0EC] text-[#52525B] rounded-lg p-2.5 mt-3 break-words">
                  {this.state.message}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 h-10 rounded-lg bg-[#18181B] text-white text-[13px] font-medium flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Recharger la page
              </button>
              <button
                type="button"
                onClick={this.handleClearAndReload}
                className="flex-1 h-10 rounded-lg border border-[#E7E4DD] bg-white text-[#52525B] text-[13px] font-medium flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Réparer le cache
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
