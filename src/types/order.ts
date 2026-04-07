import { CartItem } from "./cart";

// Order types
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "published"
  | "assigned"
  | "picked_up"
  | "delivered"
  | "cancelled";

export type CourierOrderStatus =
  | "available"
  | "accepted"
  | "picked_up"
  | "on_way"
  | "delivered";

export interface Order {
  id: string;
  customerId: string;
  customerEmail?: string;
  courierId?: string;
  courierEmail?: string;
  supplierId: string;
  supplierName: string;
  items: CartItem[];
  totalPrice: number;
  status: OrderStatus;
  deliveryAddress: string;
  createdAt: string;
  updatedAt: string;
  estimatedDelivery?: string;
  pickupOtp?: string;
  dropoffOtp?: string;
  pod?: DeliveryProof;
}

// Courier-specific order interface
export interface CourierOrder {
  id: string;
  restaurantName: string;
  pickupLocation: string;
  dropoffLocation: string;
  distance: number; // km
  deliveryFee: number;
  totalPrice: number;
  status: CourierOrderStatus;
  customerPhone?: string;
  customerName?: string;
  instructions?: string;
  createdAt: string;
  estimatedPickupTime?: string;
  estimatedDeliveryTime?: string;
}

export interface DeliveryProof {
  photoUrl: string;
  timestamp: string;
  courierId: string;
  courierEmail?: string;
}

export interface CourierEarning {
  id: string;
  orderId: string;
  amount: number;
  deliveryDistance: number;
  completedAt: string;
}

// Available Task - from available_tasks table (using get_available_tasks RPC)
export interface AvailableTask {
  task_id: string;
  order_id: string;
  pickup_location_id: string;
  dropoff_location_id: string;
  pickup_address: string | null; // From locations join
  dropoff_address: string | null; // From locations join
  pickup_note: string | null;
  dropoff_note: string | null;
  note: string | null;
  package_value: number | null;
  delivery_fee: number;
  suggested_fee: number | null;
  receiver_name: string | null;
  receiver_phone: string | null;
  receiver_email: string | null;
  created_at: string;
}

// Delivery Task Status Type
export type DeliveryTaskStatus =
  | "draft"
  | "published"
  | "assigned"
  | "picked_up"
  | "delivered"
  | "cancelled"
  | "completed";

export type CourierTaskEarningStatus =
  | DeliveryTaskStatus
  | "claimed"
  | "in_transit"
  | "completed"
  | "on_way";

// Full Delivery Task - from delivery_tasks table
export interface DeliveryTask {
  id: string;
  order_id: string;
  merchant_id: string;
  courier_id: string | null;
  pickup_address: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  pickup_contact_name: string | null;
  pickup_contact_phone: string | null;
  dropoff_address: string;
  dropoff_latitude: number | null;
  dropoff_longitude: number | null;
  dropoff_contact_name: string | null;
  dropoff_contact_phone: string | null;
  distance_km: number | null;
  delivery_fee: number;
  receiver_email: string | null;
  instructions: string | null;
  status: DeliveryTaskStatus;
  published_at: string | null;
  assigned_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourierDashboardTask {
  id: string;
  courier_id: string | null;
  status: CourierTaskEarningStatus;
  delivery_fee: number;
  accepted_at: string | null;
  assigned_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  pickup_address: string;
  dropoff_address: string;
  created_at: string;
  updated_at: string;
}

// Claim Task Response
export interface ClaimTaskResponse {
  success: boolean;
  message: string;
  task_id: string;
  courier_id?: string;
}

// ePOD RPC response
export interface EpodOtpResponse {
  success: boolean;
  message?: string;
  task_id?: string;
  otp_plain?: string;
  customer_email?: string;
  expires_at?: string;
}

export interface CourierSummaryProfile {
  id: string;
  name: string;
  phone: string;
  vehicleType: "bike" | "scooter" | "car";
  rating: number;
  totalDeliveries: number;
  avatar?: string;
  isOnline: boolean;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
}

export interface OrderCreateData {
  items: CartItem[];
  totalPrice: number;
  supplierId: string;
  supplierName: string;
  deliveryAddress: string;
}
