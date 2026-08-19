/**
 * Generated-by-hand Database types for schema `shimai`.
 * Keep in sync with supabase/migrations/00001_initial_schema.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "client" | "admin" | "driver";

export type OrderStatus =
  | "pending_payment"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "in_transit"
  | "delivered"
  | "cancelled";

export type PaymentMethod =
  | "card_online"
  | "cash"
  | "bank_transfer"
  | "card_terminal";

export type PaymentStatus =
  | "pending"
  | "awaiting_proof"
  | "paid"
  | "failed"
  | "refunded";

export type BankDetailsSetting = {
  bank_name: string;
  clabe: string;
  account_number: string;
  holder_name: string;
};

export type PaymentMethodsSetting = {
  card_online: boolean;
  cash: boolean;
  bank_transfer: boolean;
  card_terminal: boolean;
};

export type DeliveryZone = {
  radius_km: number;
  fee: number;
};

export type DeliveryConfigSetting = {
  kitchen_coordinates: {
    lat: number;
    lng: number;
  };
  zones: DeliveryZone[];
  max_radius_km: number;
};

export type DeliveryAddress = {
  text?: string;
  full_name?: string;
  street?: string;
  colony?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  references?: string;
  lat?: number;
  lng?: number;
  [key: string]: Json | undefined;
};

export type Database = {
  shimai: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          role?: UserRole;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          description: string | null;
          price: number;
          image_url: string | null;
          is_available: boolean;
          is_signature: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          description?: string | null;
          price: number;
          image_url?: string | null;
          is_available?: boolean;
          is_signature?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          image_url?: string | null;
          is_available?: boolean;
          is_signature?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      settings: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          value?: Json;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          client_id: string | null;
          driver_id: string | null;
          status: OrderStatus;
          payment_method: PaymentMethod;
          payment_status: PaymentStatus;
          total: number;
          delivery_fee: number;
          delivery_lat: number | null;
          delivery_lng: number | null;
          delivery_distance_km: number | null;
          delivery_address: Json | null;
          delivery_notes: string | null;
          client_phone: string | null;
          stripe_session_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id?: string | null;
          driver_id?: string | null;
          status?: OrderStatus;
          payment_method: PaymentMethod;
          payment_status?: PaymentStatus;
          total?: number;
          delivery_fee?: number;
          delivery_lat?: number | null;
          delivery_lng?: number | null;
          delivery_distance_km?: number | null;
          delivery_address?: Json | null;
          delivery_notes?: string | null;
          client_phone?: string | null;
          stripe_session_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string | null;
          driver_id?: string | null;
          status?: OrderStatus;
          payment_method?: PaymentMethod;
          payment_status?: PaymentStatus;
          total?: number;
          delivery_fee?: number;
          delivery_lat?: number | null;
          delivery_lng?: number | null;
          delivery_distance_km?: number | null;
          delivery_address?: Json | null;
          delivery_notes?: string | null;
          client_phone?: string | null;
          stripe_session_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          quantity: number;
          unit_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          quantity: number;
          unit_price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          quantity?: number;
          unit_price?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      driver_locations: {
        Row: {
          id: string;
          driver_id: string;
          order_id: string;
          lat: number;
          lng: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          order_id: string;
          lat: number;
          lng: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          driver_id?: string;
          order_id?: string;
          lat?: number;
          lng?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "driver_locations_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "driver_locations_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      tracker_presence: {
        Row: {
          order_id: string;
          status: OrderStatus;
          updated_at: string;
        };
        Insert: {
          order_id: string;
          status: OrderStatus;
          updated_at?: string;
        };
        Update: {
          order_id?: string;
          status?: OrderStatus;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tracker_presence_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_driver: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      order_status: OrderStatus;
      payment_method: PaymentMethod;
      payment_status: PaymentStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

/** Convenience row aliases */
export type Profile = Database["shimai"]["Tables"]["profiles"]["Row"];
export type Category = Database["shimai"]["Tables"]["categories"]["Row"];
export type Product = Database["shimai"]["Tables"]["products"]["Row"];
export type Setting = Database["shimai"]["Tables"]["settings"]["Row"];
export type Order = Database["shimai"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["shimai"]["Tables"]["order_items"]["Row"];
export type DriverLocation =
  Database["shimai"]["Tables"]["driver_locations"]["Row"];
