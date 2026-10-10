import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Flyyti test environment only. Never fall back to the previous production project.
// Publishable keys are browser-safe; never place secret/service_role keys in Vite.
const TEST_URL = 'https://whrnkydylmyjximunncv.supabase.co';
const TEST_PUBLISHABLE_KEY = 'sb_publishable_IDc1zCX_8Eb8qvsYGib5MA_WOlE2AOx';

export const getSupabaseConfig = () => {
  const url = String(import.meta.env.VITE_SUPABASE_URL || TEST_URL).trim();
  const key = String(import.meta.env.VITE_SUPABASE_ANON_KEY || TEST_PUBLISHABLE_KEY).trim();
  return {
    url,
    key,
    isValid: url.startsWith('https://') && key.length > 20
  };
};

const config = getSupabaseConfig();
export const supabase: SupabaseClient = createClient(config.url, config.key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  global: { headers: { 'x-application-name': 'flyyti-store-test' } },
  db: { schema: 'public' }
});

// Disabled on purpose: a localStorage override could silently reconnect to an old DB.
export const saveSupabaseConfig = (_url: string, _key: string) => false;
export const resetSupabaseConfig = () => {
  localStorage.removeItem('VITE_SUPABASE_URL');
  localStorage.removeItem('VITE_SUPABASE_ANON_KEY');
  window.location.reload();
};
