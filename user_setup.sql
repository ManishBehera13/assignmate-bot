-- 1. Create the users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    telegram_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for anon" ON public.users;
CREATE POLICY "Enable all access for anon" ON public.users FOR ALL USING (true);

-- 3. Create a view for user statistics
-- This view aggregates total orders and total spent from the assignments table
CREATE OR REPLACE VIEW public.user_stats AS
SELECT 
    u.id,
    u.telegram_id,
    u.name,
    u.phone,
    u.created_at,
    COUNT(a.id) AS total_orders,
    COALESCE(SUM(CASE WHEN a.payment_status = 'verified' THEN a.price ELSE 0 END), 0) AS total_spent
FROM 
    public.users u
LEFT JOIN 
    public.assignments a ON u.telegram_id = a.user_id
GROUP BY 
    u.id, u.telegram_id, u.name, u.phone, u.created_at;
