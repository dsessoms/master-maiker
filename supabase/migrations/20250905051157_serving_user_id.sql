-- filepath: /Users/davidsessoms/Developer/master-maiker-supa/supabase/migrations/20250905051157_serving_user_id.sql
-- Update serving table to include user_id and modify RLS policies

-- Add user_id column to serving table
ALTER TABLE "public"."serving" 
ADD COLUMN "user_id" "uuid";

-- Add foreign key constraint to reference auth.users
ALTER TABLE "public"."serving"
ADD CONSTRAINT "serving_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Drop the existing RLS policy for serving table
DROP POLICY IF EXISTS "Enable select for authenticated users only" ON "public"."serving";

-- Create new RLS policies for serving table
-- Allow users to read their own serving items or system/shared servings (user_id is null)
CREATE POLICY "Enable read access for data owners and shared servings" ON "public"."serving"
    FOR SELECT TO "authenticated" USING ("auth"."uid"() = "user_id" OR "user_id" IS NULL);

-- Allow users to insert their own serving items
CREATE POLICY "Enable insert for data owners" ON "public"."serving"
    FOR INSERT TO "authenticated" WITH CHECK ("auth"."uid"() = "user_id");

-- Allow users to update their own serving items
CREATE POLICY "Enable update for data owners" ON "public"."serving"
    FOR UPDATE TO "authenticated" USING ("auth"."uid"() = "user_id") WITH CHECK ("auth"."uid"() = "user_id");

-- Allow users to delete their own serving items
CREATE POLICY "Enable delete for data owners" ON "public"."serving"
    FOR DELETE TO "authenticated" USING ("auth"."uid"() = "user_id");