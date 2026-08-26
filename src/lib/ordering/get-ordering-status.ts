import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_ORDERING_SCHEDULE,
  getOrderingStatus,
  parseOrderingSchedule,
  type OrderingStatus,
} from "@/lib/ordering/schedule";

export async function getOrderingStatusFromDb(): Promise<OrderingStatus> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "ordering_schedule")
    .maybeSingle();

  if (error) {
    console.error("ordering_schedule load failed", error.message);
  }

  const schedule = parseOrderingSchedule(
    data?.value ?? DEFAULT_ORDERING_SCHEDULE,
  );
  return getOrderingStatus(schedule);
}
