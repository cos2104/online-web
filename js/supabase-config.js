// Supabase 설정 - 실제 값으로 교체하세요
const SUPABASE_URL = 'https://wwlcaxgbaokryzcmxeqq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3bGNheGdiYW9rcnl6Y214ZXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMDQ3MjQsImV4cCI6MjEwMjU4MDcyNH0.kQTXRm0GCZ9xzUg1ivTn9e-hQAeUMK3Agc9tJES2dLA';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
