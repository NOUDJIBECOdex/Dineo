import type { BrandPaletteId } from '../types/erp';

export interface BrandPaletteDefinition {
  id: BrandPaletteId;
  name: string;
  description: string;
  swatch: string;
  light: {
    accent: string;
    accentHover: string;
    accentSoft: string;
    accentBorder: string;
  };
  dark: {
    accent: string;
    accentHover: string;
    accentSoft: string;
    accentBorder: string;
  };
}

export const BRAND_PALETTES: BrandPaletteDefinition[] = [
  {
    id: 'terracotta',
    name: 'Terre du Sahel',
    description: 'Chaleureux, authentique & gourmand',
    swatch: '#B84A27',
    light: {
      accent: '#B84A27',
      accentHover: '#9E3D1E',
      accentSoft: '#FBF1EC',
      accentBorder: '#EED2C5',
    },
    dark: {
      accent: '#D96843',
      accentHover: '#E57A57',
      accentSoft: 'rgba(217, 104, 67, 0.14)',
      accentBorder: 'rgba(217, 104, 67, 0.30)',
    },
  },
  {
    id: 'forest',
    name: 'Forêt Émeraude',
    description: 'Frais, naturel & équilibré',
    swatch: '#1F6B4E',
    light: {
      accent: '#1F6B4E',
      accentHover: '#17543D',
      accentSoft: '#ECF6F1',
      accentBorder: '#C5E4D6',
    },
    dark: {
      accent: '#4AB58A',
      accentHover: '#60C59C',
      accentSoft: 'rgba(74, 181, 138, 0.14)',
      accentBorder: 'rgba(74, 181, 138, 0.30)',
    },
  },
  {
    id: 'indigo',
    name: 'Ardoise Marine',
    description: 'Structuré, moderne & professionnel',
    swatch: '#2557A7',
    light: {
      accent: '#2557A7',
      accentHover: '#1D4688',
      accentSoft: '#EEF3FB',
      accentBorder: '#C9D9F2',
    },
    dark: {
      accent: '#5B8EE6',
      accentHover: '#75A1EE',
      accentSoft: 'rgba(91, 142, 230, 0.15)',
      accentBorder: 'rgba(91, 142, 230, 0.30)',
    },
  },
  {
    id: 'ochre',
    name: 'Ambre Doré',
    description: 'Lumineux, épicé & accueillant',
    swatch: '#B26A18',
    light: {
      accent: '#B26A18',
      accentHover: '#945611',
      accentSoft: '#FCF5EB',
      accentBorder: '#EFD8B6',
    },
    dark: {
      accent: '#E0963E',
      accentHover: '#EBA654',
      accentSoft: 'rgba(224, 150, 62, 0.15)',
      accentBorder: 'rgba(224, 150, 62, 0.30)',
    },
  },
  {
    id: 'burgundy',
    name: 'Bordeaux Foléré',
    description: 'Raffiné, gastronomique & élégant',
    swatch: '#8C2D48',
    light: {
      accent: '#8C2D48',
      accentHover: '#73233A',
      accentSoft: '#FAEEF2',
      accentBorder: '#E9C6D0',
    },
    dark: {
      accent: '#D46683',
      accentHover: '#E07D97',
      accentSoft: 'rgba(212, 102, 131, 0.15)',
      accentBorder: 'rgba(212, 102, 131, 0.30)',
    },
  },
  {
    id: 'charcoal',
    name: 'Carbone Minimal',
    description: 'Monochrome éditorial haute précision',
    swatch: '#27272A',
    light: {
      accent: '#27272A',
      accentHover: '#18181B',
      accentSoft: '#F1F0EC',
      accentBorder: '#D6D3CB',
    },
    dark: {
      accent: '#D4D3CE',
      accentHover: '#ECEBE6',
      accentSoft: 'rgba(212, 211, 206, 0.12)',
      accentBorder: 'rgba(212, 211, 206, 0.25)',
    },
  },
];

export function applyBrandTheme(paletteId: BrandPaletteId | undefined, darkMode: boolean): void {
  const palette = BRAND_PALETTES.find((p) => p.id === paletteId) || BRAND_PALETTES[0];
  const tokens = darkMode ? palette.dark : palette.light;
  const root = document.documentElement;
  root.style.setProperty('--accent', tokens.accent);
  root.style.setProperty('--accent-hover', tokens.accentHover);
  root.style.setProperty('--accent-soft', tokens.accentSoft);
  root.style.setProperty('--accent-border', tokens.accentBorder);
}
