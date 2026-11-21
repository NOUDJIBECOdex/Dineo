export interface TableInfo {
  id: string;
  number: string;
  label: string;
}

export interface MenuItemChoice {
  id: string;
  name: string;
  extraPrice: number;
}

export interface MenuItemOption {
  id: string;
  name: string;
  required?: boolean;
  choices: MenuItemChoice[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number; // en FCFA
  imageUrl: string;
  isAvailable: boolean;
  isChefSpecial?: boolean;
  preparationTimeMinutes?: number;
  options?: MenuItemOption[];
}

export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  displayOrder: number;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  currency: string; // "FCFA"
  logoUrl: string;
  coverImageUrl: string;
  address: string;
  city: string;
  phone: string;
  isOpen: boolean;
  openingHours: string;
  categories: MenuCategory[];
  items: MenuItem[];
  tables: TableInfo[];
}
