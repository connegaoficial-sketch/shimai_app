"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

import type { OrderingStatus } from "@/lib/ordering/schedule";

const OrderingGateContext = createContext<OrderingStatus | null>(null);

export function OrderingGateProvider({
  status,
  children,
}: {
  status: OrderingStatus;
  children: ReactNode;
}) {
  return (
    <OrderingGateContext.Provider value={status}>
      {children}
    </OrderingGateContext.Provider>
  );
}

export function useOrderingGate(): OrderingStatus {
  const ctx = useContext(OrderingGateContext);
  if (!ctx) {
    return {
      acceptingOrders: true,
      forceClosed: false,
      isRestDay: false,
      weekday: 0,
      timezone: "America/Mexico_City",
      closedWeekdays: [],
      headline: "",
      body: "",
      hoursDetail: "De 10 am a 10 pm",
    };
  }
  return ctx;
}
