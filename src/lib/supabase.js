import { createClient }
from '@supabase/supabase-js';

const supabaseUrl =
  "https://eycuakkufbolyyawlpno.supabase.co";

const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5Y3Vha2t1ZmJvbHl5YXdscG5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMjkyODMsImV4cCI6MjA2OTgwNTI4M30.cfZgo625Au9Ss0dSJYMuEMWUvuzD-4mOBD1dvnfp_tI";

export const supabase =
  createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {

        persistSession: true,

        autoRefreshToken: true,

        detectSessionInUrl: true,

        storageKey: 'joel-global-auth',
      },
    }
  );