export type UserRole = "customer" | "merchant" | "rider" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  merchantId?: string;
  riderId?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  description?: string;
  cuisine: string;
  etaMinutes: number; // estimated prep + pickup buffer
  rating: number; // 1-5
  imageUrl?: string;
  zone: string;
  latitude: number;
  longitude: number;
  isOpen: boolean;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  priceUsd: number;
  available: boolean;
  imageUrl?: string;
  cuisineTag?: string;
}

export interface SmartFindProduct {
  id: string;
  name: string;
  description?: string;
  priceUsd: number;
  stock: number;
  category: "Automotive" | "Mobile & Tech" | "Home" | "Lifestyle";
  imageUrl?: string;
  tags?: string[];
}

export type RiderStatus = "offline" | "online" | "busy";

export interface Rider {
  id: string;
  name: string;
  status: RiderStatus;
  reliabilityPercent: number; // 0..100
  latitude: number;
  longitude: number;
  earningsTodayUsd: number;
}

export type OrderStatus =
  | "placed"
  | "restaurant_accepted"
  | "preparing"
  | "rider_searching"
  | "rider_assigned"
  | "going_to_restaurant"
  | "arrived"
  | "picked_up"
  | "delivering"
  | "delivered"
  | "cancelled";

export type PaymentMethod = "Mobile Money" | "Cash on delivery" | "Card";

export type OrderItemKind = "food" | "smart_find";

export interface OrderItem {
  id: string;
  kind: OrderItemKind;
  restaurantId?: string;
  menuItemId?: string;
  productId?: string;
  name: string;
  quantity: number;
  unitPriceUsd: number;
  imageUrl?: string;
}

export interface Rating {
  stars: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  createdAt: number;
}

export interface SupportNote {
  id: string;
  orderId: string;
  note: string;
  createdBy: string; // user id or 'admin'
  createdAt: number;
}

export interface Order {
  id: string;
  customerId: string;
  restaurantId?: string; // food anchor; smart-find-only orders allowed
  riderId?: string;
  items: OrderItem[];
  subtotalUsd: number;
  deliveryFeeUsd: number;
  totalUsd: number;
  address: string;
  addressNotes?: string; // landmark / instructions for the rider
  customerPhone?: string; // E.164, +243XXXXXXXXX
  zone: string; // e.g., Gombe
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  pin: string; // delivery confirmation
  createdAt: number;
  updatedAt: number;
  rating?: Rating;
  supportNotes?: SupportNote[];
}

export interface DispatchOffer {
  orderId: string;
  riderId: string;
  pickupDistanceKm: number;
  deliveryDistanceKm: number;
  etaMinutes: number;
  earningsUsd: number;
  expiresAt: number; // epoch ms
}

