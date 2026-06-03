// Browser-side helpers for loading/saving site_content rows.
import { supabase } from "@/integrations/supabase/client";
import { DEFAULTS_BY_KEY } from "./cms";

export async function loadCmsKey<T>(key: string): Promise<T> {
  const { data, error } = await supabase
    .from("site_content")
    .select("data")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.data as T) ?? (DEFAULTS_BY_KEY[key] as T);
}

export async function saveCmsKey<T>(key: string, value: T): Promise<void> {
  const { error } = await supabase
    .from("site_content")
    .upsert(
      { key, data: value as never, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
  if (error) throw new Error(error.message);
}
