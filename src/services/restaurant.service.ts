import { MOCK_RESTAURANT } from '../mocks/restaurant.mock';
import type { MenuCategory, MenuItem, Restaurant, TableInfo } from '../types/restaurant';

export class RestaurantService {
  /**
   * Récupère les données du restaurant principal
   */
  public static async getRestaurant(): Promise<Restaurant> {
    // Simule une micro-latence réseau réaliste pour tester les états de chargement
    await new Promise((resolve) => setTimeout(resolve, 80));
    return { ...MOCK_RESTAURANT };
  }

  /**
   * Récupère le restaurant par son slug
   */
  public static async getRestaurantBySlug(_slug: string): Promise<Restaurant> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return { ...MOCK_RESTAURANT };
  }

  /**
   * Récupère les catégories actives du menu
   */
  public static async getCategories(): Promise<MenuCategory[]> {
    const restaurant = await this.getRestaurant();
    return [...restaurant.categories].sort((a, b) => a.displayOrder - b.displayOrder);
  }

  /**
   * Récupère la liste des produits (avec filtre optionnel par catégorie)
   */
  public static async getMenuItems(categoryId?: string): Promise<MenuItem[]> {
    const restaurant = await this.getRestaurant();
    if (categoryId) {
      return restaurant.items.filter((item) => item.categoryId === categoryId);
    }
    return [...restaurant.items];
  }

  /**
   * Récupère un produit par son identifiant
   */
  public static async getMenuItemById(id: string): Promise<MenuItem | null> {
    const restaurant = await this.getRestaurant();
    const item = restaurant.items.find((i) => i.id === id);
    return item ? { ...item } : null;
  }

  /**
   * Récupère les tables disponibles
   */
  public static async getTables(): Promise<TableInfo[]> {
    const restaurant = await this.getRestaurant();
    return [...restaurant.tables];
  }
}
