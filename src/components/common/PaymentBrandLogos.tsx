import React from 'react';
import type { PaymentMethod } from '../../types/erp';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const SIZE_MAP = {
  xs: { box: 'h-4 w-4', wide: 'h-4 w-7' },
  sm: { box: 'h-5 w-5', wide: 'h-5 w-8' },
  md: { box: 'h-6 w-6', wide: 'h-6 w-10' },
};

/**
 * Logo officiel miniaturisé Orange Money (carré #FF7900 + double flèche blanche/noire + wordmark orange)
 */
export const OrangeMoneyLogo: React.FC<LogoProps> = ({ size = 'sm', className = '' }) => (
  <svg
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`${SIZE_MAP[size].box} rounded-[4px] shrink-0 ${className}`}
    aria-label="Orange Money"
  >
    <rect width="36" height="36" rx="5" fill="#FF7900" />
    {/* Flèche montante blanche (haut-droite) */}
    <path
      d="M11 14.5H23.5M23.5 14.5L19 10M23.5 14.5L19 19"
      stroke="#FFFFFF"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Flèche descendante noire (bas-gauche) */}
    <path
      d="M25 22.5H12.5M12.5 22.5L17 18M12.5 22.5L17 27"
      stroke="#111111"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Bandelette signature orange */}
    <rect x="6" y="30" width="24" height="2.2" rx="1.1" fill="#FFFFFF" opacity="0.92" />
  </svg>
);

/**
 * Logo officiel miniaturisé MTN Mobile Money (jaune #FFCC00 + ovale MTN bleu nuit/noir + bandelette MoMo)
 */
export const MtnMomoLogo: React.FC<LogoProps> = ({ size = 'sm', className = '' }) => (
  <svg
    viewBox="0 0 44 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`${SIZE_MAP[size].wide} rounded-[4px] shrink-0 ${className}`}
    aria-label="MTN Mobile Money"
  >
    <rect width="44" height="28" rx="5" fill="#FFCC00" />
    {/* Ovale officiel MTN */}
    <ellipse cx="22" cy="14" rx="17.5" ry="9.5" stroke="#003D5B" strokeWidth="2.1" fill="#FFCC00" />
    <text
      x="22"
      y="17.3"
      textAnchor="middle"
      fill="#003D5B"
      fontFamily="Inter, Arial, sans-serif"
      fontWeight="900"
      fontSize="9.8"
      letterSpacing="-0.3"
    >
      MTN
    </text>
    {/* Petit trait rouge officiel sous le T */}
    <rect x="19" y="19.3" width="6" height="1.6" rx="0.8" fill="#E30613" />
  </svg>
);

/**
 * Symbole sobre Espèces FCFA (billet vert forêt)
 */
export const CashFcfaLogo: React.FC<LogoProps> = ({ size = 'sm', className = '' }) => (
  <svg
    viewBox="0 0 36 26"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`${SIZE_MAP[size].wide} rounded-[4px] shrink-0 ${className}`}
    aria-label="Espèces FCFA"
  >
    <rect width="36" height="26" rx="4.5" fill="#1B6342" />
    <rect x="3" y="3" width="30" height="20" rx="2.5" stroke="#ECF7F1" strokeWidth="1.2" strokeOpacity="0.55" />
    <circle cx="18" cy="13" r="5" fill="#ECF7F1" fillOpacity="0.2" />
    <text
      x="18"
      y="15.8"
      textAnchor="middle"
      fill="#FFFFFF"
      fontFamily="Inter, Arial, sans-serif"
      fontWeight="700"
      fontSize="8.2"
    >
      CFA
    </text>
  </svg>
);

export const PaymentMethodMark: React.FC<{
  method: PaymentMethod;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
}> = ({ method, size = 'sm', showLabel = false }) => {
  const label =
    method === 'ORANGE_MONEY'
      ? 'Orange Money'
      : method === 'MTN_MOMO'
      ? 'MTN MoMo'
      : 'Espèces';

  return (
    <span className="inline-flex items-center gap-1.5">
      {method === 'ORANGE_MONEY' && <OrangeMoneyLogo size={size} />}
      {method === 'MTN_MOMO' && <MtnMomoLogo size={size} />}
      {method === 'ESPECES' && <CashFcfaLogo size={size} />}
      {showLabel && <span>{label}</span>}
    </span>
  );
};
