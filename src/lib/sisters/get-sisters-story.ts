import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_SISTERS_STORY,
  parseSistersStory,
  type SistersStorySetting,
} from "@/lib/sisters/sisters";

export async function getSistersStory(): Promise<SistersStorySetting> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "sisters_story")
    .maybeSingle();

  if (error) {
    console.error("sisters_story load failed", error.message);
    return structuredClone(DEFAULT_SISTERS_STORY);
  }

  return parseSistersStory(data?.value ?? DEFAULT_SISTERS_STORY);
}
