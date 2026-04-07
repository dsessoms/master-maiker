-- Fix RLS policies for recipe_cuisines, recipe_diets, and recipe_dish_types
-- to also allow access to catalog recipes (source = 'catalog')

-- recipe_cuisines
DROP POLICY IF EXISTS "Users can view recipe cuisines for accessible recipes" ON "public"."recipe_cuisines";
CREATE POLICY "Users can view recipe cuisines for accessible recipes"
    ON "public"."recipe_cuisines"
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "public"."recipe" r
            WHERE r.id = recipe_id
            AND (r.user_id = auth.uid() OR r.visibility = 'public' OR r.source = 'catalog')
        )
    );

-- recipe_diets
DROP POLICY IF EXISTS "Users can view recipe diets for accessible recipes" ON "public"."recipe_diets";
CREATE POLICY "Users can view recipe diets for accessible recipes"
    ON "public"."recipe_diets"
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "public"."recipe" r
            WHERE r.id = recipe_id
            AND (r.user_id = auth.uid() OR r.visibility = 'public' OR r.source = 'catalog')
        )
    );

-- recipe_dish_types
DROP POLICY IF EXISTS "Users can view recipe dish_types for accessible recipes" ON "public"."recipe_dish_types";
CREATE POLICY "Users can view recipe dish_types for accessible recipes"
    ON "public"."recipe_dish_types"
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "public"."recipe" r
            WHERE r.id = recipe_id
            AND (r.user_id = auth.uid() OR r.visibility = 'public' OR r.source = 'catalog')
        )
    );
