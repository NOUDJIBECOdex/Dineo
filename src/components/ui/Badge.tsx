import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'amber' | 'emerald' | 'blue' | 'purple' | 'rose' | 'slate';
  size?: 'sm' | 'md';
  hasDot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  size = 'md',
  hasDot = false,
  className = '',
}) => {
  const variantStyles = {
    amber: 'bg-amber-50 text-amber-800 border-amber-200/60 ring-amber-500/20',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200/60 ring-emerald-500/20',
    blue: 'bg-blue-50 text-blue-800 border-blue-200/60 ring-blue-500/20',
    purple: 'bg-purple-50 text-purple-800 border-purple-200/60 ring-purple-500/20',
    rose: 'bg-rose-50 text-rose-800 border-rose-200/60 ring-rose-500/20',
    slate: 'bg-slate-100 text-slate-700 border-slate-200 ring-slate-400/20',
  };

  const dotColors = {
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    rose: 'bg-rose-500',
    slate: 'bg-slate-400',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {hasDot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]} shrink-0`}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  );
};
