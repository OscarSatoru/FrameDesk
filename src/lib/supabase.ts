import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Keep the client constructible in deployments that use local storage only.
// Storage operations already catch failed remote requests and fall back locally.
const clientUrl = supabaseUrl || 'https://placeholder.supabase.co';
const clientAnonKey = supabaseAnonKey || 'missing-supabase-anon-key';

export const supabase = createClient(clientUrl, clientAnonKey);