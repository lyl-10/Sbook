"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";
import type { Database } from "../database.types";

export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabaseConfig();
  return createBrowserClient<Database>(url, anonKey);
}