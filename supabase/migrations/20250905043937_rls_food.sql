-- filepath: /Users/davidsessoms/Developer/master-maiker-supa/supabase/migrations/20250905043937_rls_food.sql
-- Update food table to include user_id and modify RLS policies

-- Add user_id column to food table
ALTER TABLE "public"."food" 
ADD COLUMN "user_id" "uuid";

-- Add foreign key constraint to reference auth.users
ALTER TABLE "public"."food"
ADD CONSTRAINT "food_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Drop the existing RLS policy for food table
DROP POLICY IF EXISTS "Enable select for authenticated users only" ON "public"."food";

-- Create new RLS policies for food table
-- Allow users to read their own food items or system/shared foods (user_id is null)
CREATE POLICY "Enable read access for data owners and shared foods" ON "public"."food"
    FOR SELECT TO "authenticated" USING ("auth"."uid"() = "user_id" OR "user_id" IS NULL);

-- Allow users to insert their own food items
CREATE POLICY "Enable insert for data owners" ON "public"."food"
    FOR INSERT TO "authenticated" WITH CHECK ("auth"."uid"() = "user_id");

-- Allow users to update their own food items
CREATE POLICY "Enable update for data owners" ON "public"."food"
    FOR UPDATE TO "authenticated" USING ("auth"."uid"() = "user_id") WITH CHECK ("auth"."uid"() = "user_id");

-- Allow users to delete their own food items
CREATE POLICY "Enable delete for data owners" ON "public"."food"
    FOR DELETE TO "authenticated" USING ("auth"."uid"() = "user_id");