-- Make fat_secret_id nullable in serving table
-- This allows creating custom serving entries without requiring FatSecret integration

ALTER TABLE "public"."serving" 
ALTER COLUMN "fat_secret_id" DROP NOT NULL;