-- 1. Create the assignments table
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    service_type TEXT NOT NULL,
    file_url TEXT,
    payment_screenshot_url TEXT,
    price INT DEFAULT 0,
    payment_status TEXT DEFAULT 'pending', -- pending, verified, rejected
    order_status TEXT DEFAULT 'waiting_payment_verification', -- waiting_payment_verification, in_progress, payment_failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Allow all operations for the bot/app (Simplified for this project)
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all operations for anon" ON public.assignments;
CREATE POLICY "Enable all operations for anon" ON public.assignments FOR ALL USING (true);

-- 3. Create Storage Buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('assignments', 'assignments', true) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('payments', 'payments', true) 
ON CONFLICT (id) DO NOTHING;

-- 4. Enable public access and uploads for storage buckets
DROP POLICY IF EXISTS "Public Storage Access" ON storage.objects;
CREATE POLICY "Public Storage Access" ON storage.objects FOR ALL USING (bucket_id = 'assignments' OR bucket_id = 'payments' OR bucket_id = 'files');

