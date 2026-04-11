import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://oxrbjnelrabltoidcmad.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cmJqbmVscmFibHRvaWRjbWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NTE2NTksImV4cCI6MjA4NzEyNzY1OX0.PnZhKuK677TiQIZbIB_ZJXyVY9uTQfl6p9uwxPYH6VQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
