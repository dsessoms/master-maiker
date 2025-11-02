-- Add profile_food_entry junction table to support multiple profiles per food entry
-- This allows tracking individual servings per profile for shared meals

-- Create profile_food_entry junction table
CREATE TABLE IF NOT EXISTS "public"."profile_food_entry" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "food_entry_id" "uuid" NOT NULL,
    "number_of_servings" double precision NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."profile_food_entry" OWNER TO "postgres";

-- Add primary key constraint
ALTER TABLE ONLY "public"."profile_food_entry"
    ADD CONSTRAINT "profile_food_entry_pkey" PRIMARY KEY ("id");

-- Add unique constraint to prevent duplicate profile-food_entry combinations
ALTER TABLE ONLY "public"."profile_food_entry"
    ADD CONSTRAINT "profile_food_entry_unique" UNIQUE ("profile_id", "food_entry_id");

-- Add foreign key constraints
ALTER TABLE ONLY "public"."profile_food_entry"
    ADD CONSTRAINT "profile_food_entry_profile_id_fkey" 
    FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."profile_food_entry"
    ADD CONSTRAINT "profile_food_entry_food_entry_id_fkey" 
    FOREIGN KEY ("food_entry_id") REFERENCES "public"."food_entry"("id") ON DELETE CASCADE;

-- Add indexes for better query performance
CREATE INDEX "profile_food_entry_profile_id_idx" ON "public"."profile_food_entry" USING "btree" ("profile_id");
CREATE INDEX "profile_food_entry_food_entry_id_idx" ON "public"."profile_food_entry" USING "btree" ("food_entry_id");

-- Enable Row Level Security
ALTER TABLE "public"."profile_food_entry" ENABLE ROW LEVEL SECURITY;

-- Add RLS policy - users can only access their own profiles' food entries
CREATE POLICY "Enable access to profile owners" ON "public"."profile_food_entry" 
USING (
    EXISTS (
        SELECT 1 FROM "public"."profile" 
        WHERE "public"."profile"."id" = "public"."profile_food_entry"."profile_id" 
        AND "public"."profile"."user_id" = "auth"."uid"()
    )
) 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "public"."profile" 
        WHERE "public"."profile"."id" = "public"."profile_food_entry"."profile_id" 
        AND "public"."profile"."user_id" = "auth"."uid"()
    )
);

-- Grant permissions
GRANT ALL ON TABLE "public"."profile_food_entry" TO "anon";
GRANT ALL ON TABLE "public"."profile_food_entry" TO "authenticated";
GRANT ALL ON TABLE "public"."profile_food_entry" TO "service_role";

-- Migration: Move existing number_of_servings data to profile_food_entry table
-- This creates profile_food_entry records for existing food_entry records using the primary profile
INSERT INTO "public"."profile_food_entry" ("profile_id", "food_entry_id", "number_of_servings")
SELECT 
    p.id as profile_id,
    fe.id as food_entry_id,
    fe.number_of_servings
FROM "public"."food_entry" fe
JOIN "public"."profile" p ON p.user_id = fe.user_id AND p.is_primary = true
WHERE NOT EXISTS (
    SELECT 1 FROM "public"."profile_food_entry" pfe 
    WHERE pfe.food_entry_id = fe.id
);

-- Remove number_of_servings from food_entry table (now stored in junction table)
ALTER TABLE "public"."food_entry" DROP COLUMN IF EXISTS "number_of_servings";

-- Add a function to create food entries with multiple profiles
CREATE OR REPLACE FUNCTION "public"."create_food_entry_with_profiles"(
    "entry_date" date,
    "entry_type" "public"."food_entry_type",
    "entry_meal_type" "public"."meal_type_enum",
    "entry_food_id" uuid DEFAULT NULL,
    "entry_serving_id" uuid DEFAULT NULL,
    "entry_recipe_id" uuid DEFAULT NULL,
    "profile_servings" jsonb DEFAULT '[]'::jsonb -- Format: [{"profile_id": "uuid", "servings": 2.0}]
) RETURNS uuid
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
DECLARE
    v_food_entry_id uuid := gen_random_uuid();
    v_profile_serving jsonb;
    v_user_id uuid := auth.uid();
BEGIN
    -- Validate v_user_id
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Validate profile_servings is not empty
    IF jsonb_array_length(profile_servings) = 0 THEN
        RAISE EXCEPTION 'At least one profile serving must be provided';
    END IF;

    -- Insert the main food entry
    INSERT INTO "public"."food_entry" (
        "id", "date", "type", "meal_type", "food_id", "serving_id", "recipe_id", "user_id"
    ) VALUES (
        v_food_entry_id, entry_date, entry_type, entry_meal_type, 
        entry_food_id, entry_serving_id, entry_recipe_id, v_user_id
    );

    -- Insert profile-specific servings
    FOR v_profile_serving IN SELECT * FROM jsonb_array_elements(profile_servings)
    LOOP
        -- Validate that the profile belongs to the current user
        IF NOT EXISTS (
            SELECT 1 FROM "public"."profile" 
            WHERE "public"."profile"."id" = (v_profile_serving->>'profile_id')::uuid 
            AND "public"."profile"."user_id" = v_user_id
        ) THEN
            RAISE EXCEPTION 'Profile does not belong to the current user';
        END IF;

        INSERT INTO "public"."profile_food_entry" (
            "profile_id", "food_entry_id", "number_of_servings"
        ) VALUES (
            (v_profile_serving->>'profile_id')::uuid,
            v_food_entry_id,
            (v_profile_serving->>'servings')::double precision
        );
    END LOOP;

    RETURN v_food_entry_id;
END;
$$;

-- Grant permissions for the function
GRANT ALL ON FUNCTION "public"."create_food_entry_with_profiles"(date, "public"."food_entry_type", "public"."meal_type_enum", uuid, uuid, uuid, jsonb) TO "anon";
GRANT ALL ON FUNCTION "public"."create_food_entry_with_profiles"(date, "public"."food_entry_type", "public"."meal_type_enum", uuid, uuid, uuid, jsonb) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_food_entry_with_profiles"(date, "public"."food_entry_type", "public"."meal_type_enum", uuid, uuid, uuid, jsonb) TO "service_role";