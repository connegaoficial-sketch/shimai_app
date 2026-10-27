/**
 * Public ordering schedule — rest day(s) and operating hours in Mexico City time.
 * closed_weekdays: 0 = domingo … 6 = sábado (same as Date#getDay).
 */

export const ORDERING_TIMEZONE = "America/Mexico_City" as const;

export type OrderingScheduleSetting = {
  timezone: string;
  /** JS weekday indices that do not accept orders */
  closed_weekdays: number[];
  /** Manual override: no orders regardless of weekday */
  force_closed: boolean;
  /** Opening time "HH:mm" (24h format), e.g. "12:00" */
  open_time: string;
  /** Closing time "HH:mm" (24h format), e.g. "22:00" */
  close_time: string;
};

export type OrderingStatus = {
  acceptingOrders: boolean;
  forceClosed: boolean;
  isRestDay: boolean;
  isOutsideHours: boolean;
  isBeforeOpen: boolean;
  isAfterClose: boolean;
  weekday: number;
  timezone: string;
  closedWeekdays: number[];
  openTime: string;
  closeTime: string;
  /** Public headline when closed */
  headline: string;
  /** Public support line when closed */
  body: string;
  /** Public hours line derived from closed days (admin-driven) */
  hoursDetail: string;
};

export const DEFAULT_ORDERING_SCHEDULE: OrderingScheduleSetting = {
  timezone: ORDERING_TIMEZONE,
  closed_weekdays: [2], // martes
  force_closed: false,
  open_time: "12:00",
  close_time: "22:00",
};

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const WEEKDAY_OPTIONS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
] as const;

function sanitizeTimeString(val: unknown, fallback: string): string {
  if (typeof val !== "string") return fallback;
  const trimmed = val.trim();
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

export function parseOrderingSchedule(raw: unknown): OrderingScheduleSetting {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_ORDERING_SCHEDULE };
  }
  const obj = raw as Record<string, unknown>;
  const closed = Array.isArray(obj.closed_weekdays)
    ? obj.closed_weekdays
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
    : DEFAULT_ORDERING_SCHEDULE.closed_weekdays;

  return {
    timezone:
      typeof obj.timezone === "string" && obj.timezone.trim()
        ? obj.timezone.trim()
        : ORDERING_TIMEZONE,
    closed_weekdays: [...new Set(closed)].sort((a, b) => a - b),
    force_closed: Boolean(obj.force_closed),
    open_time: sanitizeTimeString(obj.open_time, DEFAULT_ORDERING_SCHEDULE.open_time),
    close_time: sanitizeTimeString(obj.close_time, DEFAULT_ORDERING_SCHEDULE.close_time),
  };
}

/** Weekday 0–6 in the given IANA timezone. */
export function getZonedWeekday(
  date: Date,
  timeZone: string = ORDERING_TIMEZONE,
): number {
  const short = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  const key = short.slice(0, 3) as (typeof WEEKDAY_SHORT)[number];
  const idx = WEEKDAY_SHORT.indexOf(key);
  return idx >= 0 ? idx : date.getUTCDay();
}

/** Get hour (0-23) and minute (0-59) in the given IANA timezone. */
export function getZonedTimeParts(
  date: Date,
  timeZone: string = ORDERING_TIMEZONE,
): { hours: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  let hours = 0;
  let minutes = 0;
  for (const p of parts) {
    if (p.type === "hour") {
      const parsed = parseInt(p.value, 10);
      hours = parsed === 24 ? 0 : parsed;
    }
    if (p.type === "minute") {
      minutes = parseInt(p.value, 10);
    }
  }
  return { hours, minutes };
}

function timeStringToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Format "12:00" -> "12 pm", "22:00" -> "10 pm", "14:30" -> "2:30 pm".
 */
export function formatTimeLabel(timeStr: string): string {
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr ?? "0", 10);
  const m = parseInt(mStr ?? "0", 10);
  const suffix = h >= 12 ? "pm" : "am";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const minutePart = m > 0 ? `:${String(m).padStart(2, "0")}` : "";
  return `${hour12}${minutePart} ${suffix}`;
}

export function formatHoursRange(openTime: string, closeTime: string): string {
  return `de ${formatTimeLabel(openTime)} a ${formatTimeLabel(closeTime)}`;
}

function weekdayLabel(day: number): string {
  return WEEKDAY_OPTIONS.find((o) => o.value === day)?.label ?? "mañana";
}

function formatClosedDaysList(closed: number[]): string {
  const labels = closed
    .slice()
    .sort((a, b) => a - b)
    .map((d) => weekdayLabel(d).toLowerCase());
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0]!;
  if (labels.length === 2) return `${labels[0]} y ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} y ${labels[labels.length - 1]}`;
}

/** Public hours copy from admin closed days — never hardcode a weekday here. */
export function formatHoursDetail(
  closedWeekdays: number[],
  hoursRange = "de 12 pm a 10 pm",
): string {
  if (closedWeekdays.length === 0) {
    return `Todos los días, ${hoursRange}`;
  }
  if (closedWeekdays.length === 1) {
    return `Todos los días excepto ${formatClosedDaysList(closedWeekdays)}, ${hoursRange}`;
  }
  return `Abierto todos los días excepto ${formatClosedDaysList(closedWeekdays)}, ${hoursRange}`;
}

function nextOpenDayLabel(
  weekday: number,
  closed: number[],
): string {
  for (let i = 1; i <= 7; i++) {
    const d = (weekday + i) % 7;
    if (!closed.includes(d)) {
      if (i === 1) return "mañana";
      return weekdayLabel(d).toLowerCase();
    }
  }
  return "pronto";
}

/**
 * Copy: warm, clear, MX Spanish — rest day / outside hours without sounding cold.
 */
export function buildClosedCopy(input: {
  forceClosed: boolean;
  isRestDay: boolean;
  isBeforeOpen: boolean;
  isAfterClose: boolean;
  weekday: number;
  closedWeekdays: number[];
  openTime: string;
  closeTime: string;
}): { headline: string; body: string } {
  if (input.forceClosed) {
    return {
      headline: "Hoy no recibimos pedidos",
      body: "La cocina está en pausa por ahora. Vuelve más tarde o mañana y arma tu mesa con calma.",
    };
  }

  const range = formatHoursRange(input.openTime, input.closeTime);
  const when = nextOpenDayLabel(input.weekday, input.closedWeekdays);

  if (input.isRestDay) {
    return {
      headline: "Hoy descansamos",
      body: `Es nuestro día de descanso. Puedes mirar la carta; los pedidos vuelven ${when}, ${range}.`,
    };
  }

  if (input.isBeforeOpen) {
    return {
      headline: `Abrimos a las ${formatTimeLabel(input.openTime)}`,
      body: `Nuestra cocina abre hoy ${range}. Puedes mirar la carta y armar tu pedido.`,
    };
  }

  if (input.isAfterClose) {
    return {
      headline: "Cocina cerrada por hoy",
      body: `Cerramos pedidos por hoy. Volvemos ${when}, ${range}.`,
    };
  }

  return {
    headline: "Hoy no recibimos pedidos",
    body: "La cocina está fuera de horario de servicio.",
  };
}

export function getOrderingStatus(
  schedule: OrderingScheduleSetting,
  now: Date = new Date(),
): OrderingStatus {
  const timezone = schedule.timezone || ORDERING_TIMEZONE;
  const weekday = getZonedWeekday(now, timezone);
  const closedWeekdays = schedule.closed_weekdays;
  const forceClosed = schedule.force_closed;
  const isRestDay = closedWeekdays.includes(weekday);

  const openTime = schedule.open_time || DEFAULT_ORDERING_SCHEDULE.open_time;
  const closeTime = schedule.close_time || DEFAULT_ORDERING_SCHEDULE.close_time;

  const currentParts = getZonedTimeParts(now, timezone);
  const currentMinutes = currentParts.hours * 60 + currentParts.minutes;
  const openMinutes = timeStringToMinutes(openTime);
  const closeMinutes = timeStringToMinutes(closeTime);

  let isBeforeOpen = false;
  let isAfterClose = false;
  let isOutsideHours = false;

  if (openMinutes < closeMinutes) {
    isBeforeOpen = currentMinutes < openMinutes;
    isAfterClose = currentMinutes >= closeMinutes;
    isOutsideHours = isBeforeOpen || isAfterClose;
  } else {
    // Overnight window (e.g. 18:00 to 02:00)
    const isOpen = currentMinutes >= openMinutes || currentMinutes < closeMinutes;
    isOutsideHours = !isOpen;
    isBeforeOpen = false;
    isAfterClose = isOutsideHours;
  }

  const acceptingOrders = !forceClosed && !isRestDay && !isOutsideHours;
  const hoursRangeText = formatHoursRange(openTime, closeTime);

  const copy = acceptingOrders
    ? { headline: "", body: "" }
    : buildClosedCopy({
        forceClosed,
        isRestDay,
        isBeforeOpen,
        isAfterClose,
        weekday,
        closedWeekdays,
        openTime,
        closeTime,
      });

  return {
    acceptingOrders,
    forceClosed,
    isRestDay,
    isOutsideHours,
    isBeforeOpen,
    isAfterClose,
    weekday,
    timezone,
    closedWeekdays,
    openTime,
    closeTime,
    headline: copy.headline,
    body: copy.body,
    hoursDetail: formatHoursDetail(closedWeekdays, hoursRangeText),
  };
}
