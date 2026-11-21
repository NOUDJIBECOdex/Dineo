import React, { createContext, useContext, useEffect, useState } from 'react';
import { StorageService } from '../services/storage.service';
import type { OrderContext, SelectedOptionChoice } from '../types/order';
import type { MenuItem } from '../types/restaurant';

export interface CartItem {
  id: string; // unique cart entry ID (based on item ID + options hash)
  menuItem: MenuItem;
  quantity: number;
  selectedChoices?: SelectedOptionChoice[];
  specialInstructions?: string;
  unitPrice: number;
  totalPrice: number;
}

interface CartContextType {
  items: CartItem[];
  orderContext: OrderContext;
  isCartDrawerOpen: boolean;
  totalCount: number;
  totalAmount: number;
  addItem: (
    menuItem: MenuItem,
    quantity?: number,
    selectedChoices?: SelectedOptionChoice[],
    specialInstructions?: string
  ) => void;
  updateQuantity: (cartItemId: string, newQuantity: number) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;
  setOrderContext: (context: OrderContext) => void;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'client_cart_items';
const CONTEXT_STORAGE_KEY = 'client_order_context';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() =>
    StorageService.get<CartItem[]>(CART_STORAGE_KEY, [])
  );

  const [orderContext, setOrderContextState] = useState<OrderContext>(() =>
    StorageService.get<OrderContext>(CONTEXT_STORAGE_KEY, {
      type: 'TABLE',
      tableNumber: '12',
      tableName: 'Table 12 (Vue Jardin)',
    })
  );

  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  useEffect(() => {
    StorageService.set(CART_STORAGE_KEY, items);
  }, [items]);

  useEffect(() => {
    StorageService.set(CONTEXT_STORAGE_KEY, orderContext);
  }, [orderContext]);

  const setOrderContext = (context: OrderContext) => {
    setOrderContextState(context);
  };

  const addItem = (
    menuItem: MenuItem,
    quantity = 1,
    selectedChoices?: SelectedOptionChoice[],
    specialInstructions?: string
  ) => {
    const extraPrice = (selectedChoices || []).reduce((sum, c) => sum + (c.extraPrice || 0), 0);
    const unitPrice = menuItem.price + extraPrice;

    // Créer une clé d'identification unique basée sur les options
    const choicesKey = (selectedChoices || [])
      .map((c) => `${c.optionId}:${c.choiceId}`)
      .sort()
      .join('|');
    const entryId = `${menuItem.id}__${choicesKey}__${specialInstructions || ''}`;

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((i) => i.id === entryId);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        const newQty = updated[existingIndex].quantity + quantity;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          totalPrice: unitPrice * newQty,
        };
        return updated;
      } else {
        return [
          ...prevItems,
          {
            id: entryId,
            menuItem,
            quantity,
            selectedChoices,
            specialInstructions,
            unitPrice,
            totalPrice: unitPrice * quantity,
          },
        ];
      }
    });
  };

  const updateQuantity = (cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(cartItemId);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === cartItemId) {
          return {
            ...item,
            quantity: newQuantity,
            totalPrice: item.unitPrice * newQuantity,
          };
        }
        return item;
      })
    );
  };

  const removeItem = (cartItemId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== cartItemId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        orderContext,
        isCartDrawerOpen,
        totalCount,
        totalAmount,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        setOrderContext,
        openCartDrawer: () => setIsCartDrawerOpen(true),
        closeCartDrawer: () => setIsCartDrawerOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart doit être utilisé à l\'intérieur d\'un CartProvider');
  }
  return context;
};
