import { ArrowRight, ExternalLink, Lock, ShieldCheck, User } from 'lucide-react';
import React, { useState } from 'react';
import { useErp } from '../../../store/erp.context';
import { Btn, Field, RestaurantLogo, inputBaseClass, inputBaseStyle } from '../ui/Primitives';

interface RestaurantLoginScreenProps {
  onOpenClientSpace?: () => void;
  onOpenDriverSpace?: () => void;
}

export const RestaurantLoginScreen: React.FC<RestaurantLoginScreenProps> = ({
  onOpenClientSpace,
  onOpenDriverSpace,
}) => {
  const { state, login, quickLogin } = useErp();
  const [username, setUsername] = useState(state.users[0]?.username || 'ousmane.admin');
  const [password, setPassword] = useState('••••••••');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = login(username.trim(), password);
    if (!res.ok) {
      setError(res.error || 'Identifiants incorrects.');
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--ink-primary)' }}
    >
      <div className="w-full max-w-[410px] space-y-6">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center space-y-2.5">
          <RestaurantLogo logoUrl={state.settings.logoUrl} name={state.settings.name} size="lg" />
          <div>
            <h1 className="text-[20px] font-semibold tracking-[-0.02em]">{state.settings.name}</h1>
            <p className="text-[13px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>
              Espace Gestion · {state.settings.city}, {state.settings.region}
            </p>
          </div>
        </div>

        {/* Login card */}
        <div
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
          className="rounded-2xl border p-6 shadow-[0_8px_32px_rgba(16,16,14,0.06)] space-y-5"
        >
          <div>
            <h2 className="text-[15.5px] font-semibold">Connexion à votre poste</h2>
            <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>
              Saisissez votre identifiant employé pour ouvrir votre session.
            </p>
          </div>

          {error && (
            <div
              className="px-3.5 py-2.5 rounded-lg border text-[12.5px] font-medium"
              style={{
                backgroundColor: 'var(--err-bg)',
                borderColor: 'var(--err-border)',
                color: 'var(--err-text)',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Identifiant (Login)" required>
              <div className="relative">
                <User
                  className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--ink-muted)' }}
                />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ex: ousmane.admin"
                  style={inputBaseStyle}
                  className={`${inputBaseClass} pl-9 h-10`}
                />
              </div>
            </Field>

            <Field label="Mot de passe" required>
              <div className="relative">
                <Lock
                  className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--ink-muted)' }}
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={inputBaseStyle}
                  className={`${inputBaseClass} pl-9 h-10`}
                />
              </div>
            </Field>

            <Btn
              type="submit"
              variant="accent"
              className="w-full h-10 text-[13.5px]"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Se connecter
            </Btn>
          </form>

          {/* Quick Demo Account Switcher */}
          <div className="pt-4 border-t space-y-2.5" style={{ borderColor: 'var(--border-hairline)' }}>
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-medium" style={{ color: 'var(--ink-muted)' }}>
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
              Accès rapide par profil
            </div>
            <div className="space-y-1.5">
              {state.users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => quickLogin(u.id)}
                  style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}
                  className="w-full px-3 py-2 rounded-lg border text-left transition-all hover:border-[var(--border-strong)] cursor-pointer flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-medium truncate">{u.fullName}</div>
                    <div className="text-[11px] font-mono truncate" style={{ color: 'var(--ink-muted)' }}>
                      @{u.username} · {u.roleLabel}
                    </div>
                  </div>
                  <span className="text-[11px] font-medium shrink-0" style={{ color: 'var(--accent)' }}>
                    Ouvrir →
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {(onOpenClientSpace || onOpenDriverSpace) && (
          <div className="flex flex-wrap items-center justify-center gap-4 text-[12.5px]">
            {onOpenClientSpace && (
              <button
                type="button"
                onClick={onOpenClientSpace}
                className="inline-flex items-center gap-1.5 font-medium hover:underline cursor-pointer"
                style={{ color: 'var(--ink-muted)' }}
              >
                <span>Espace Client (QR & Menu)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
            {onOpenDriverSpace && (
              <button
                type="button"
                onClick={onOpenDriverSpace}
                className="inline-flex items-center gap-1.5 font-medium hover:underline cursor-pointer"
                style={{ color: 'var(--ink-muted)' }}
              >
                <span>Espace Livreur</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
