import { MenuItem } from "./shop";

// Cart types
export interface CartItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  shopId: string;
  shopName: string;
}

export interface CartState {
  items: CartItem[];
  totalPrice: number;
  totalItems: number;
}
