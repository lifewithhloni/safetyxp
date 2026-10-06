import { createBrowserClient } from "@supabase/ssr";

const safeUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const safeKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "placeholder-publishable-key";

export function createClient() {
  return createBrowserClient(safeUrl, safeKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        return;
      },
    },
  });
}

export const supabaseBrowser = createClient();
