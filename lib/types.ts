/* Shared domain types for the Sofora store. */

export type SofaType = "three" | "corner" | "chair" | "sofa-bed";

export interface Product {
  id: string;
  slug: string;
  name: string;
  sub: string; // short descriptor, e.g. "Easy-clean oat weave"
  description: string;
  price: number; // GBP
  wasPrice?: number; // GBP, when on sale
  category: string; // category slug
  type: SofaType; // drives the illustration
  fabric: string; // illustration fabric colour
  fabricName?: string;
  bg: string; // illustration backdrop colour
  accent: string; // illustration accent colour
  tag?: string; // badge, e.g. "Save £250"
  imageUrl?: string; // optional product photography; falls back to the sofa illustration
  sku?: string;
  seats?: number; // 1, 2, 3, 4 (4 = 4+ seater)
  fabricType?: string; // "Easy-clean weave" | "Velvet" | "Jumbo cord" | "Bouclé"
  colourName?: string; // "Oat" | "Sage" | "Charcoal" | "Terracotta" | "Navy" | "Mink" | "Blush" | "Mustard"
  features?: string[]; // e.g. ["Sofa bed", "Reclining", "Storage"]
  rating?: number;
  reviewCount?: number;
  inStock: boolean;
  featured?: boolean;
  details?: string[]; // bullet specs
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  type: SofaType;
  fabric: string;
  bg: string;
  blurb?: string;
  menu?: string; // navbar menu group label, e.g. "Sofas" — categories without one don't appear in the nav
}

export interface BasketItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  qty: number;
  fabric: string;
  bg: string;
  type: SofaType;
}

export type OrderStatus =
  | "new"
  | "confirmed"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "refused";

export interface Order {
  id: string;
  number: string; // human-friendly, e.g. "SOF-1024"
  items: BasketItem[];
  subtotal: number;
  deliveryFee: number;
  total: number; // amount due on delivery (COD)
  customer: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    postcode: string;
    notes?: string;
  };
  deliverySlot?: string;
  paymentMethod: "cash" | "card" | "bank_transfer";
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  timeline: { status: OrderStatus; at: string; note?: string }[];
}

export interface Faq {
  id: string;
  q: string;
  a: string;
  order: number;
}

export interface Review {
  id: string;
  quote: string;
  author: string;
  location: string;
  rating: number;
  order: number;
}

export interface SiteSettings {
  announcementBar: string[];
  freeDeliveryThreshold: number;
  acceptedPayments: ("cash" | "card" | "bank_transfer")[];
  deliveryTimeText: string;
  confirmationCallText: string;
  refusalPolicy: string;
  phone: string;
  email: string;
  address: string;
  trustpilotRating: string;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "New",
  confirmed: "Confirmed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refused: "Refused at door",
};

export const PAYMENT_METHOD_LABELS: Record<Order["paymentMethod"], string> = {
  cash: "Cash",
  card: "Card machine",
  bank_transfer: "Bank transfer",
};
