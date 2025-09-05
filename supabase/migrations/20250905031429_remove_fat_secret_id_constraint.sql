-- Remove NOT NULL constraint from fat_secret_id column in food table
-- The column will remain unique when a value is provided

ALTER TABLE "public"."food" 
ALTER COLUMN "fat_secret_id" DROP NOT NULL;