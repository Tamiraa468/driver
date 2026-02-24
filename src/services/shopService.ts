import { Shop, MenuItem } from "../types";

// Mock shops data
const mockShops: Shop[] = [
  {
    id: "1",
    name: "Burger Palace",
    description: "Амттай бургер, шарсан төмс",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400",
    rating: 4.5,
    deliveryTime: "25-35 мин",
    deliveryFee: 2500,
    category: "Фаст фүүд",
  },
  {
    id: "2",
    name: "Pizza House",
    description: "Итали пицца, паста",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400",
    rating: 4.7,
    deliveryTime: "30-40 мин",
    deliveryFee: 3000,
    category: "Итали",
  },
  {
    id: "3",
    name: "Sushi Master",
    description: "Шинэхэн суши, сашими",
    image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400",
    rating: 4.8,
    deliveryTime: "35-45 мин",
    deliveryFee: 3500,
    category: "Япон",
  },
  {
    id: "4",
    name: "Mongolian BBQ",
    description: "Монгол хоол, хуушуур",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400",
    rating: 4.3,
    deliveryTime: "20-30 мин",
    deliveryFee: 2000,
    category: "Монгол",
  },
  {
    id: "5",
    name: "Green Salad Bar",
    description: "Эрүүл хоол, салат",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400",
    rating: 4.6,
    deliveryTime: "15-25 мин",
    deliveryFee: 2500,
    category: "Эрүүл хоол",
  },
];

// Mock menu items data
const mockMenuItems: MenuItem[] = [
  // Burger Palace items
  {
    id: "101",
    shopId: "1",
    name: "Classic Burger",
    description: "Үхрийн мах, салат, улаан лооль, сонгино",
    price: 12000,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400",
    category: "Бургер",
    isAvailable: true,
  },
  {
    id: "102",
    shopId: "1",
    name: "Cheese Burger",
    description: "Бяслаг, үхрийн мах, тусгай соус",
    price: 14000,
    image: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400",
    category: "Бургер",
    isAvailable: true,
  },
  {
    id: "103",
    shopId: "1",
    name: "French Fries",
    description: "Шарсан төмс, кетчуп",
    price: 5000,
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400",
    category: "Хажуу хоол",
    isAvailable: true,
  },
  // Pizza House items
  {
    id: "201",
    shopId: "2",
    name: "Margherita Pizza",
    description: "Моцарелла, улаан лооль, базилик",
    price: 18000,
    image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400",
    category: "Пицца",
    isAvailable: true,
  },
  {
    id: "202",
    shopId: "2",
    name: "Pepperoni Pizza",
    description: "Пепперони, моцарелла, улаан лооль соус",
    price: 22000,
    image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400",
    category: "Пицца",
    isAvailable: true,
  },
  {
    id: "203",
    shopId: "2",
    name: "Pasta Carbonara",
    description: "Спагетти, гахай, өндөг, пармезан",
    price: 16000,
    image: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400",
    category: "Паста",
    isAvailable: true,
  },
  // Sushi Master items
  {
    id: "301",
    shopId: "3",
    name: "Salmon Sushi Set",
    description: "8ш лососс суши",
    price: 28000,
    image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400",
    category: "Суши",
    isAvailable: true,
  },
  {
    id: "302",
    shopId: "3",
    name: "California Roll",
    description: "6ш Калифорни ролл",
    price: 18000,
    image: "https://images.unsplash.com/photo-1617196034183-421b4917c92d?w=400",
    category: "Ролл",
    isAvailable: true,
  },
  // Mongolian BBQ items
  {
    id: "401",
    shopId: "4",
    name: "Хуушуур",
    description: "4ш хуушуур",
    price: 8000,
    image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400",
    category: "Монгол",
    isAvailable: true,
  },
  {
    id: "402",
    shopId: "4",
    name: "Цуйван",
    description: "Үхрийн мах, гоймон, хүнсний ногоо",
    price: 12000,
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400",
    category: "Монгол",
    isAvailable: true,
  },
  // Green Salad Bar items
  {
    id: "501",
    shopId: "5",
    name: "Caesar Salad",
    description: "Ромэйн салат, пармезан, крутон",
    price: 14000,
    image: "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400",
    category: "Салат",
    isAvailable: true,
  },
  {
    id: "502",
    shopId: "5",
    name: "Greek Salad",
    description: "Грек салат, фета бяслаг",
    price: 13000,
    image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400",
    category: "Салат",
    isAvailable: true,
  },
];

// Get all shops
export const getShops = async (): Promise<Shop[]> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockShops;
};

// Get shop by ID
export const getShopById = async (shopId: string): Promise<Shop | null> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockShops.find((shop) => shop.id === shopId) || null;
};

// Get menu items by shop ID
export const getMenuItemsByShopId = async (
  shopId: string
): Promise<MenuItem[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockMenuItems.filter((item) => item.shopId === shopId);
};

// Get menu item by ID
export const getMenuItemById = async (
  itemId: string
): Promise<MenuItem | null> => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return mockMenuItems.find((item) => item.id === itemId) || null;
};

// Search shops
export const searchShops = async (query: string): Promise<Shop[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const lowerQuery = query.toLowerCase();
  return mockShops.filter(
    (shop) =>
      shop.name.toLowerCase().includes(lowerQuery) ||
      shop.description.toLowerCase().includes(lowerQuery) ||
      shop.category.toLowerCase().includes(lowerQuery)
  );
};
