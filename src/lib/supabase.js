import { createClient } from "@supabase/supabase-js";

const PUBLIC_URL="https://bjsykihxmfleisfffszc.supabase.co";
const PUBLIC_KEY="sb_publishable_JBXGX5DcRZVTWw2u_RYE3A_l59gRCdk";

export const supabase=createClient(PUBLIC_URL,PUBLIC_KEY)