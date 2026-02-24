import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
} from "react";
import { CartItem, MenuItem } from "../types";

interface CartContextType {
  items: CartItem[];
  totalPrice: number;
  totalItems: number;
  addItem: (menuItem: MenuItem, shopId: string, shopName: string) => void;
  removeItem: (itemId: string) => void;
  updateQty: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getItemQuantity: (itemId: string) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const totalPrice = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + item.menuItem.price * item.quantity,
      0
    );
  }, [items]);

  const totalItems = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const addItem = (menuItem: MenuItem, shopId: string, shopName: string) => {
    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.menuItem.id === menuItem.id
      );

      if (existingItem) {
        return currentItems.map((item) =>
          item.menuItem.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      const newItem: CartItem = {
        id: `cart-${menuItem.id}-${Date.now()}`,
        menuItem,
        quantity: 1,
        shopId,
        shopName,
      };

      return [...currentItems, newItem];
    });
  };

  const removeItem = (itemId: string) => {
    setItems((currentItems) =>
      currentItems.filter((item) => item.menuItem.id !== itemId)
    );
  };

  const updateQty = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.menuItem.id === itemId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getItemQuantity = (itemId: string): number => {
    const item = items.find((item) => item.menuItem.id === itemId);
    return item?.quantity || 0;
  };

  return (
    <CartContext.Provider
      value={{
        items,
        totalPrice,
        totalItems,
        addItem,
        removeItem,
        updateQty,
        clearCart,
        getItemQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

export default CartContext;
