import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bnftqmpnwnbdvuxvvcoc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJuZnRxbXBud25iZHZ1eHZ2Y29jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNzE4NjMsImV4cCI6MjEwMzk0Nzg2M30.Dc3QJLFEhC519hze52pQxbPE5T8x2rbzk7spxmHdJjM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);