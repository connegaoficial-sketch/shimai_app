/**
 * Public ordering schedule — rest day(s) in Mexico City time.
 * closed_weekdays: 0 = domingo … 6 = sábado (same as Date#getDay).
 */

export const ORDERING_TIMEZONE = "America/Mexico_City" as const;

export type OrderingScheduleSetting = {
  timezone: string;
  /** JS weekday indices that do not accept orders */
  closed_weekdays: number[];
  /** Manual override: no orders regardless of weekday */
  force_closed: boolean;
};

export type OrderingStatus = {
  acceptingOrders: boolean;
  forceClosed: boolean;
  isRestDay: boolean;
  weekday: number;
  timezone: string;
  closedWeekdays: number[];
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
  hoursRange = "de 10 am a 10 pm",
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
 * Copy: warm, clear, MX Spanish — rest day without sounding cold or corporate.
 */
export function buildClosedCopy(input: {
  forceClosed: boolean;
  weekday: number;
  closedWeekdays: number[];
}): { headline: string; body: string } {
  if (input.forceClosed) {
    return {
      headline: "Hoy no recibimos pedidos",
      body: "La cocina está en pausa por ahora. Vuelve más tarde o mañana y arma tu mesa con calma.",
    };
  }

  const when = nextOpenDayLabel(input.weekday, input.closedWeekdays);
  return {
    headline: "Hoy descansamos",
    body: `Es nuestro día de descanso. Puedes mirar la carta; los pedidos vuelven ${when}, de 10 am a 10 pm.`,
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
  const acceptingOrders = !forceClosed && !isRestDay;
  const copy = acceptingOrders
    ? { headline: "", body: "" }
    : buildClosedCopy({ forceClosed, weekday, closedWeekdays });

  return {
    acceptingOrders,
    forceClosed,
    isRestDay,
    weekday,
    timezone,
    closedWeekdays,
    headline: copy.headline,
    body: copy.body,
    hoursDetail: formatHoursDetail(closedWeekdays),
  };
}
