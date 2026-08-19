/**
 * Shared domain types for SHIMAI UI state.
 * Authoritative pricing / payment / delivery live in the database + Edge Functions.
 */

export type {
  PaymentMethod,
  PaymentStatus,
  OrderStatus,
  UserRole,
  Profile,
  Category,
  Product,
  Setting,
  Order,
  OrderItem,
  DriverLocation,
  BankDetailsSetting,
  PaymentMethodsSetting,
  DeliveryConfigSetting,
  DeliveryZone,
  WhatsAppContactSetting,
} from "@/types/database";

export type { Promo, PromoType, PromoValueType, PromosSetting } from "@/lib/promos/promos";

import type { PaymentMethod } from "@/types/database";

/** Cart holds identifiers only — never prices or totals. */
export type CartLineItem = {
  productId: string;
  quantity: number;
};

export type CartState = {
  items: CartLineItem[];
};

/** UI may store selected method id only — validation happens server-side against settings. */
export type SelectedPaymentMethod = PaymentMethod;
