"use client";

import { dataProvider as supabaseDataProvider } from "@refinedev/supabase";
import { supabase } from "@/lib/supabase";

/**
 * Data provider Supabase pour Refine
 * Fournit les opérations CRUD standard sur les tables Supabase
 */
export const dataProvider = supabaseDataProvider(supabase);
