import { DeliveryProof, Order, OrderCreateData, OrderStatus } from "../types";

const DEFAULT_POD_PHOTO_URL =
  "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?w=800";

const generateOtp = (): string =>
  Math.floor(1000 + Math.random() * 9000).toString();

const buildDeliveryProof = (
  order: Order,
  photoUrl?: string,
  timestamp?: string,
): DeliveryProof => ({
  photoUrl: photoUrl || DEFAULT_POD_PHOTO_URL,
  timestamp: timestamp || new Date().toISOString(),
  courierId: order.courierId || "unassigned",
  courierEmail: order.courierEmail,
});

// In-memory orders store (mock database)
let orders: Order[] = [
  // Sample orders for demo
  {
    id: "order-1",
    customerId: "demo-customer",
    customerEmail: "customer@demo.com",
    supplierId: "1",
    supplierName: "Burger Palace",
    items: [],
    totalPrice: 26000,
    status: "published",
    deliveryAddress: "Улаанбаатар, БЗД, 1-р хороо",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    pickupOtp: "1234",
    dropoffOtp: "5678",
  },
  {
    id: "order-2",
    customerId: "demo-customer",
    customerEmail: "customer@demo.com",
    courierId: "demo-courier",
    courierEmail: "courier@demo.com",
    supplierId: "2",
    supplierName: "Pizza House",
    items: [],
    totalPrice: 40000,
    status: "assigned",
    deliveryAddress: "Улаанбаатар, СБД, 5-р хороо",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    pickupOtp: "2468",
    dropoffOtp: "1357",
  },
  {
    id: "order-3",
    customerId: "demo-customer",
    customerEmail: "customer@demo.com",
    courierId: "demo-courier",
    courierEmail: "courier@demo.com",
    supplierId: "1",
    supplierName: "Burger Palace",
    items: [],
    totalPrice: 32000,
    status: "picked_up",
    deliveryAddress: "Улаанбаатар, ХУД, 8-р хороо",
    createdAt: new Date(Date.now() - 5400000).toISOString(),
    updatedAt: new Date(Date.now() - 2400000).toISOString(),
    pickupOtp: "1111",
    dropoffOtp: "2222",
  },
  {
    id: "order-4",
    customerId: "demo-customer",
    customerEmail: "customer@demo.com",
    courierId: "demo-courier",
    courierEmail: "courier@demo.com",
    supplierId: "2",
    supplierName: "Pizza House",
    items: [],
    totalPrice: 28000,
    status: "delivered",
    deliveryAddress: "Улаанбаатар, БГД, 4-р хороо",
    createdAt: new Date(Date.now() - 10800000).toISOString(),
    updatedAt: new Date(Date.now() - 300000).toISOString(),
    pickupOtp: "3333",
    dropoffOtp: "4444",
    pod: {
      photoUrl: DEFAULT_POD_PHOTO_URL,
      timestamp: new Date(Date.now() - 300000).toISOString(),
      courierId: "demo-courier",
      courierEmail: "courier@demo.com",
    },
  },
];

let orderIdCounter = 5;

// Create a new order
export const createOrder = async (
  customerId: string,
  customerEmail: string,
  orderData: OrderCreateData,
): Promise<Order> => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const newOrder: Order = {
    id: `order-${orderIdCounter++}`,
    customerId,
    customerEmail,
    supplierId: orderData.supplierId,
    supplierName: orderData.supplierName,
    items: orderData.items,
    totalPrice: orderData.totalPrice,
    status: "pending",
    deliveryAddress: orderData.deliveryAddress,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    estimatedDelivery: new Date(Date.now() + 45 * 60000).toISOString(),
    pickupOtp: generateOtp(),
    dropoffOtp: generateOtp(),
  };

  orders.unshift(newOrder);
  return newOrder;
};

// Get orders by customer ID
export const getOrdersByCustomerId = async (
  customerId: string,
): Promise<Order[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return orders.filter((order) => order.customerId === customerId);
};

// Get orders by supplier ID
export const getOrdersBySupplierId = async (
  supplierId: string,
): Promise<Order[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return orders.filter((order) => order.supplierId === supplierId);
};

// Get orders by courier ID
export const getOrdersByCourierId = async (
  courierId: string,
): Promise<Order[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return orders.filter((order) => order.courierId === courierId);
};

// Get available orders for couriers (status: published)
export const getAvailableOrdersForCourier = async (): Promise<Order[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return orders.filter(
    (order) => order.status === "published" && !order.courierId,
  );
};

// Get all orders (for suppliers to see all)
export const getAllOrders = async (): Promise<Order[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return orders;
};

// Get order by ID
export const getOrderById = async (orderId: string): Promise<Order | null> => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return orders.find((order) => order.id === orderId) || null;
};

// Update order status
export const updateOrderStatus = async (
  orderId: string,
  status: OrderStatus,
  options?: { pod?: DeliveryProof },
): Promise<Order | null> => {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const orderIndex = orders.findIndex((order) => order.id === orderId);
  if (orderIndex === -1) return null;

  const existingOrder = orders[orderIndex];
  const pod =
    status === "delivered"
      ? options?.pod || existingOrder.pod || buildDeliveryProof(existingOrder)
      : existingOrder.pod;

  orders[orderIndex] = {
    ...existingOrder,
    status,
    pod,
    updatedAt: new Date().toISOString(),
  };

  return orders[orderIndex];
};

// Assign courier to order
export const assignCourierToOrder = async (
  orderId: string,
  courierId: string,
  courierEmail: string,
): Promise<Order | null> => {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const orderIndex = orders.findIndex((order) => order.id === orderId);
  if (orderIndex === -1) return null;

  orders[orderIndex] = {
    ...orders[orderIndex],
    courierId,
    courierEmail,
    status: "assigned",
    updatedAt: new Date().toISOString(),
  };

  return orders[orderIndex];
};

// Verify pickup OTP and mark order as picked up
export const verifyPickupOtp = async (
  orderId: string,
  otp: string,
): Promise<Order | null> => {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const orderIndex = orders.findIndex((order) => order.id === orderId);
  if (orderIndex === -1) return null;

  const order = orders[orderIndex];
  if (order.status !== "assigned") {
    throw new Error("Захиалгын төлөв буруу байна");
  }

  if (order.pickupOtp !== otp) {
    throw new Error("Pickup OTP буруу байна");
  }

  orders[orderIndex] = {
    ...order,
    status: "picked_up",
    updatedAt: new Date().toISOString(),
  };

  return orders[orderIndex];
};

// Verify dropoff OTP, attach POD, and mark order as delivered
export const verifyDropoffOtp = async (
  orderId: string,
  otp: string,
  photoUrl?: string,
): Promise<Order | null> => {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const orderIndex = orders.findIndex((order) => order.id === orderId);
  if (orderIndex === -1) return null;

  const order = orders[orderIndex];
  if (order.status !== "picked_up") {
    throw new Error("Захиалгын төлөв буруу байна");
  }

  if (order.dropoffOtp !== otp) {
    throw new Error("Dropoff OTP буруу байна");
  }

  const pod = buildDeliveryProof(order, photoUrl);

  orders[orderIndex] = {
    ...order,
    status: "delivered",
    pod,
    updatedAt: new Date().toISOString(),
  };

  return orders[orderIndex];
};

// Cancel order
export const cancelOrder = async (orderId: string): Promise<Order | null> => {
  return updateOrderStatus(orderId, "cancelled");
};

// Get order statistics for supplier dashboard
export const getSupplierStats = async (supplierId: string) => {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const supplierOrders = orders.filter((o) => o.supplierId === supplierId);
  const today = new Date().toDateString();
  const todayOrders = supplierOrders.filter(
    (o) => new Date(o.createdAt).toDateString() === today,
  );

  return {
    totalOrders: supplierOrders.length,
    todayOrders: todayOrders.length,
    pendingOrders: supplierOrders.filter((o) => o.status === "pending").length,
    preparingOrders: supplierOrders.filter((o) =>
      ["confirmed", "preparing", "published", "assigned", "picked_up"].includes(
        o.status,
      ),
    ).length,
    completedOrders: supplierOrders.filter((o) => o.status === "delivered")
      .length,
    totalRevenue: supplierOrders.reduce((sum, o) => sum + o.totalPrice, 0),
    todayRevenue: todayOrders.reduce((sum, o) => sum + o.totalPrice, 0),
  };
};

// Get courier statistics
export const getCourierStats = async (courierId: string) => {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const courierOrders = orders.filter((o) => o.courierId === courierId);
  const today = new Date().toDateString();
  const todayDeliveries = courierOrders.filter(
    (o) =>
      new Date(o.updatedAt).toDateString() === today &&
      o.status === "delivered",
  );

  return {
    totalDeliveries: courierOrders.filter((o) => o.status === "delivered")
      .length,
    todayDeliveries: todayDeliveries.length,
    activeOrders: courierOrders.filter(
      (o) => o.status === "assigned" || o.status === "picked_up",
    ).length,
  };
};
