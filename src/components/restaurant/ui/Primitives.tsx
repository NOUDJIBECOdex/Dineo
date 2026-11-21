import { Search, X } from 'lucide-react';
import React, { useEffect } from 'react';
import type { KitchenStatus, OrderChannel, PaymentMethod, PaymentStatus } from '../../../types/erp';

export type PillTone = 'ok' | 'warn' | 'err' | 'neutral' | 'accent';

export const StatusPill: React.FC<{
  tone?: PillTone;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ tone = 'neutral', dot = true, children, className = '' }) => {
  const toneStyles: Record<PillTone, React.CSSProperties> = {
    ok: { color: 'var(--ok-text)', backgroundColor: 'var(--ok-bg)', borderColor: 'var(--ok-border)' },
    warn: { color: 'var(--warn-text)', backgroundColor: 'var(--warn-bg)', borderColor: 'var(--warn-border)' },
    err: { color: 'var(--err-text)', backgroundColor: 'var(--err-bg)', borderColor: 'var(--err-border)' },
    accent: { color: 'var(--accent)', backgroundColor: 'var(--accent-soft)', borderColor: 'var(--accent-border)' },
    neutral: { color: 'var(--ink-secondary)', backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-hairline)' },
  };
  const dotColor: Record<PillTone, string> = {
    ok: 'var(--ok-dot)',
    warn: 'var(--warn-dot)',
    err: 'var(--err-dot)',
    accent: 'var(--accent)',
    neutral: 'var(--ink-muted)',
  };

  return (
    <span
      style={toneStyles[tone]}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-medium border leading-5 whitespace-nowrap ${className}`}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor[tone] }} />}
      {children}
    </span>
  );
};

export interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Btn: React.FC<BtnProps> = ({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  className = '',
  children,
  style,
  ...props
}) => {
  const sizeCls = {
    xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
    sm: 'h-8 px-3 text-[12.5px] gap-1.5 rounded-lg',
    md: 'h-9 px-3.5 text-[13px] gap-2 rounded-lg',
  }[size];

  const variantStyle: Record<NonNullable<BtnProps['variant']>, React.CSSProperties> = {
    primary: {
      backgroundColor: 'var(--ink-primary)',
      color: 'var(--ink-inverse)',
      borderColor: 'transparent',
    },
    accent: {
      backgroundColor: 'var(--accent)',
      color: '#FFFFFF',
      borderColor: 'transparent',
    },
    secondary: {
      backgroundColor: 'var(--bg-surface)',
      color: 'var(--ink-primary)',
      borderColor: 'var(--border-hairline)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--ink-secondary)',
      borderColor: 'transparent',
    },
    danger: {
      backgroundColor: 'var(--err-bg)',
      color: 'var(--err-text)',
      borderColor: 'var(--err-border)',
    },
  };

  return (
    <button
      style={{ ...variantStyle[variant], ...style }}
      className={`inline-flex items-center justify-center font-medium border transition-all duration-150 cursor-pointer select-none hover:opacity-90 active:scale-[0.985] disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap ${sizeCls} ${className}`}
      {...props}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
};

export const RestaurantLogo: React.FC<{
  logoUrl?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ logoUrl, name, size = 'md' }) => {
  const dim = { sm: 'w-7 h-7 text-[12px] rounded-md', md: 'w-8 h-8 text-[14px] rounded-lg', lg: 'w-12 h-12 text-[18px] rounded-xl' }[size];
  const initial = (name.trim()[0] || 'D').toUpperCase();

  if (logoUrl) {
    return (
      <div
        className={`${dim} overflow-hidden shrink-0 border flex items-center justify-center bg-white`}
        style={{ borderColor: 'var(--border-hairline)' }}
      >
        <img src={logoUrl} alt={name} className="w-full h-full object-contain p-0.5" />
      </div>
    );
  }

  return (
    <div
      className={`${dim} flex items-center justify-center font-semibold text-white shrink-0`}
      style={{ backgroundColor: 'var(--accent)' }}
    >
      {initial}
    </div>
  );
};

export const Surface: React.FC<{
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}> = ({ children, className = '', padding = 'md', hoverable = false }) => {
  const pad = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' }[padding];
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-hairline)',
      }}
      className={`rounded-xl border shadow-[0_1px_2px_rgba(16,16,14,0.03)] transition-all duration-200 ${
        hoverable ? 'hover:border-[var(--border-strong)] hover:shadow-[0_6px_20px_rgba(16,16,14,0.05)]' : ''
      } ${pad} ${className}`}
    >
      {children}
    </div>
  );
};

export const PageHeader: React.FC<{
  title: string;
  description?: string;
  actions?: React.ReactNode;
}> = ({ title, description, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
    <div>
      <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.02em]" style={{ color: 'var(--ink-primary)' }}>
        {title}
      </h1>
      {description && (
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>
          {description}
        </p>
      )}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

export const KpiCard: React.FC<{
  label: string;
  value: string | number;
  helper?: string;
  icon?: React.ReactNode;
  tone?: 'default' | 'accent' | 'ok' | 'warn' | 'err';
  onClick?: () => void;
}> = ({ label, value, helper, icon, tone = 'default', onClick }) => {
  const helperColor =
    tone === 'ok'
      ? 'var(--ok-text)'
      : tone === 'warn'
      ? 'var(--warn-text)'
      : tone === 'err'
      ? 'var(--err-text)'
      : tone === 'accent'
      ? 'var(--accent)'
      : 'var(--ink-muted)';

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-hairline)',
      }}
      className={`group rounded-xl border p-4 sm:p-5 shadow-[0_1px_2px_rgba(16,16,14,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[0_8px_24px_rgba(16,16,14,0.06)] ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium transition-colors group-hover:text-[var(--ink-primary)]" style={{ color: 'var(--ink-muted)' }}>
          {label}
        </span>
        {icon && (
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200 group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent)]"
            style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--ink-secondary)' }}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2.5 text-[22px] sm:text-[24px] font-semibold tracking-[-0.02em] tabular-nums" style={{ color: 'var(--ink-primary)' }}>
        {value}
      </div>
      {helper && (
        <p className="mt-1 text-[12px] truncate" style={{ color: helperColor }}>
          {helper}
        </p>
      )}
    </div>
  );
};

export const SearchInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder = 'Rechercher...', className = '' }) => (
  <div className={`relative ${className}`}>
    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ink-muted)' }} />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-hairline)',
        color: 'var(--ink-primary)',
      }}
      className="w-full h-9 pl-9 pr-8 rounded-lg border text-[13px] focus:outline-none focus:border-[var(--ink-primary)] transition-colors placeholder:text-[var(--ink-muted)]"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:opacity-75 cursor-pointer"
        style={{ color: 'var(--ink-muted)' }}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);

export const FilterTabs: React.FC<{
  tabs: Array<{ id: string; label: string; count?: number }>;
  activeId: string;
  onChange: (id: string) => void;
}> = ({ tabs, activeId, onChange }) => (
  <div
    className="inline-flex items-center p-1 rounded-lg border gap-0.5 overflow-x-auto max-w-full"
    style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-hairline)' }}
  >
    {tabs.map((tab) => {
      const active = tab.id === activeId;
      return (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          style={{
            backgroundColor: active ? 'var(--bg-surface)' : 'transparent',
            color: active ? 'var(--ink-primary)' : 'var(--ink-muted)',
            boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
          }}
          className="px-3 py-1.5 rounded-md text-[12.5px] font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5"
        >
          <span>{tab.label}</span>
          {typeof tab.count === 'number' && (
            <span
              className="text-[11px] tabular-nums px-1.5 py-0 rounded-full"
              style={{
                backgroundColor: active ? 'var(--bg-subtle)' : 'transparent',
                color: 'var(--ink-muted)',
              }}
            >
              {tab.count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export const Field: React.FC<{
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, hint, required, children }) => (
  <div className="space-y-1.5">
    <label className="block text-[12.5px] font-medium" style={{ color: 'var(--ink-secondary)' }}>
      {label}
      {required && <span style={{ color: 'var(--accent)' }} className="ml-0.5">*</span>}
    </label>
    {children}
    {hint && (
      <p className="text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
        {hint}
      </p>
    )}
  </div>
);

export const inputBaseStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-surface)',
  borderColor: 'var(--border-hairline)',
  color: 'var(--ink-primary)',
};

export const inputBaseClass =
  'w-full h-9 px-3 rounded-lg border text-[13px] focus:outline-none focus:border-[var(--ink-primary)] transition-colors placeholder:text-[var(--ink-muted)]';

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div
    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
    className="rounded-xl border py-12 px-6 text-center flex flex-col items-center justify-center"
  >
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
      style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--ink-muted)' }}
    >
      {icon}
    </div>
    <h3 className="text-[14.5px] font-semibold" style={{ color: 'var(--ink-primary)' }}>
      {title}
    </h3>
    <p className="text-[13px] mt-1 max-w-sm" style={{ color: 'var(--ink-muted)' }}>
      {description}
    </p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const DialogModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ isOpen, onClose, title, subtitle, maxWidth = 'md', children, footer }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthCls = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-3xl',
    '2xl': 'max-w-4xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-hairline)',
          color: 'var(--ink-primary)',
        }}
        className={`relative w-full ${widthCls} rounded-xl border shadow-[0_16px_48px_rgba(0,0,0,0.16)] z-10 overflow-hidden my-auto max-h-[92vh] flex flex-col`}
      >
        <div
          className="px-5 py-4 border-b flex items-start justify-between gap-4 shrink-0"
          style={{ borderColor: 'var(--border-hairline)' }}
        >
          <div>
            <h2 className="text-[15.5px] font-semibold tracking-[-0.01em]">{title}</h2>
            {subtitle && (
              <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:opacity-80 cursor-pointer"
            style={{ color: 'var(--ink-muted)', backgroundColor: 'var(--bg-subtle)' }}
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">{children}</div>

        {footer && (
          <div
            className="px-5 py-3.5 border-t flex items-center justify-end gap-2 shrink-0"
            style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// Shared domain label formatters
export const paymentMethodLabel = (m: PaymentMethod): string => {
  switch (m) {
    case 'ESPECES':
      return 'Espèces';
    case 'ORANGE_MONEY':
      return 'Orange Money';
    case 'MTN_MOMO':
      return 'MTN MoMo';
  }
};

export const channelLabel = (c: OrderChannel): string => {
  switch (c) {
    case 'SUR_PLACE':
      return 'Sur place';
    case 'EMPORTER':
      return 'À emporter';
    case 'LIVRAISON':
      return 'Livraison';
  }
};

export const kitchenStatusMeta = (s: KitchenStatus): { label: string; tone: PillTone } => {
  switch (s) {
    case 'NOUVELLE':
      return { label: 'Nouvelle', tone: 'warn' };
    case 'EN_PREPARATION':
      return { label: 'En cuisine', tone: 'accent' };
    case 'PRETE':
      return { label: 'Prête', tone: 'ok' };
    case 'SERVIE':
      return { label: 'Servie', tone: 'neutral' };
    case 'ANNULEE':
      return { label: 'Annulée', tone: 'err' };
  }
};

export const paymentStatusMeta = (s: PaymentStatus): { label: string; tone: PillTone } => {
  switch (s) {
    case 'PAYE':
      return { label: 'Payé', tone: 'ok' };
    case 'PARTIEL':
      return { label: 'Partiel', tone: 'warn' };
    case 'IMPAYE':
      return { label: 'Non payé', tone: 'err' };
  }
};

export const formatShortDateTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};
