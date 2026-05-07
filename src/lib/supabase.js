import { createClient } from "@supabase/supabase-js";

const PUBLIC_URL="https://eycuakkufbolyyawlpno.supabase.co";
const PUBLIC_KEY="sb_publishable_EwqIIW0ZKZnm-5dMEoYVug_5zKo0txU";

export const supabase=createClient(PUBLIC_URL,PUBLIC_KEY)