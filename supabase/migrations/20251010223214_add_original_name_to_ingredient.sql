-- Add original_name field to ingredient table
ALTER TABLE "public"."ingredient" 
ADD COLUMN "original_name" character varying;

-- Add comment to explain the purpose of the field
COMMENT ON COLUMN "public"."ingredient"."original_name" IS 'The original user-entered or parsed name for the ingredient';
