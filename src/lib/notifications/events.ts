export type NotificationEventKind =
  | "order_assigned"
  | "order_preparing"
  | "order_ready"
  | "order_in_transit"
  | "order_delivered"
  | "driver_nearby";

export type NotificationAudience = "driver" | "client";

export type NotificationPayload = {
  kind: NotificationEventKind;
  orderId: string;
  title: string;
  body: string;
  url: string;
  tag?: string;
};

export function copyForOrderStatus(
  status: string,
  orderId: string,
): NotificationPayload | null {
  const shortId = orderId.slice(0, 8);
  switch (status) {
    case "preparing":
      return {
        kind: "order_preparing",
        orderId,
        title: "Preparando tu pedido",
        body: "Las hermanas ya están en cocina con tu orden.",
        url: `/tracker/${orderId}`,
        tag: `order-${orderId}-preparing`,
      };
    case "ready_for_pickup":
      return {
        kind: "order_ready",
        orderId,
        title: "Pedido listo",
        body: "Tu pedido está listo — pronto sale hacia ti.",
        url: `/tracker/${orderId}`,
        tag: `order-${orderId}-ready`,
      };
    case "in_transit":
      return {
        kind: "order_in_transit",
        orderId,
        title: "Tu pedido va en camino",
        body: "El repartidor ya salió con tu orden.",
        url: `/tracker/${orderId}`,
        tag: `order-${orderId}-transit`,
      };
    case "delivered":
      return {
        kind: "order_delivered",
        orderId,
        title: "Entregado · ¡buen provecho!",
        body: `Pedido ${shortId} — gracias por confiar en SHIMAI.`,
        url: `/tracker/${orderId}`,
        tag: `order-${orderId}-delivered`,
      };
    default:
      return null;
  }
}

export function copyDriverAssigned(
  orderId: string,
  totalMxn: string,
): NotificationPayload {
  return {
    kind: "order_assigned",
    orderId,
    title: "Nuevo reparto asignado",
    body: `Pedido listo para recoger · ${totalMxn}`,
    url: `/driver/orders/${orderId}`,
    tag: `driver-assign-${orderId}`,
  };
}

export function copyDriverNearby(orderId: string): NotificationPayload {
  return {
    kind: "driver_nearby",
    orderId,
    title: "Tu repartidor está cerca",
    body: "Llegará en unos minutos — ten listo tu pedido.",
    url: `/tracker/${orderId}`,
    // No permanent tag: cooldown is enforced in maybeNotifyDriverNearby
  };
}
