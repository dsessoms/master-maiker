-- Fix ambiguous user_id column reference in RLS policy and function
-- Drop the existing policy
DROP POLICY IF EXISTS "Enable access to profile owners" ON "public"."profile_food_entry";

-- Recreate the policy with explicit table references
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

-- Fix the PL/pgSQL function to use non-conflicting variable names
CREATE OR REPLACE FUNCTION "public"."create_food_entry_with_profiles"(
    "entry_date" date,
    "entry_type" "public"."food_entry_type",
    "entry_meal_type" "public"."meal_type_enum",
    "entry_food_id" uuid DEFAULT NULL,
    "entry_serving_id" uuid DEFAULT NULL,
    "entry_recipe_id" uuid DEFAULT NULL,
    "profile_servings" jsonb DEFAULT '[]'::jsonb
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

