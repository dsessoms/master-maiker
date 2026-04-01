-- 1. Relax user_id on recipe, ingredient, and instruction to allow catalog
--    recipes (and their child rows) to have no owner.
ALTER TABLE public.recipe      ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.ingredient  ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.instruction ALTER COLUMN user_id DROP NOT NULL;

-- 2. Track whether a recipe is user-owned or from the catalog, and optionally
--    which catalog recipe a user recipe was copied from for provenance.
ALTER TABLE public.recipe
  ADD COLUMN source text NOT NULL DEFAULT 'user',
  ADD COLUMN source_catalog_id uuid REFERENCES public.recipe(id);

-- 3. Restrict source to known values via check constraint rather than an enum.
--    This makes adding or removing values a simple constraint modification
--    rather than an ALTER TYPE migration.
ALTER TABLE public.recipe
  ADD CONSTRAINT recipe_source_values
  CHECK (source IN ('user', 'catalog'));

-- 4. Enforce that user-owned recipes must still have a user_id, even though
--    the column is now nullable. Catalog recipes are exempt.
ALTER TABLE public.recipe
  ADD CONSTRAINT recipe_user_id_required_for_user_source
  CHECK (source != 'user' OR user_id IS NOT NULL);

-- 5. Catalog-specific metadata lives in a side-car table rather than on recipe
--    directly. This keeps the recipe table clean and avoids a growing set of
--    columns that are always NULL on user recipes.
CREATE TABLE public.catalog_recipe_meta (
  recipe_id uuid PRIMARY KEY REFERENCES public.recipe(id) ON DELETE CASCADE,
  needs_manual_review boolean NOT NULL DEFAULT false,
  reviewed_at timestamptz,
  curator_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Reuse the existing updated_at trigger function from feature_flags migration.
CREATE TRIGGER update_catalog_recipe_meta_updated_at
  BEFORE UPDATE ON public.catalog_recipe_meta
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. RLS for catalog_recipe_meta.
--    All authenticated users (and anon) can read catalog metadata so they can
--    discover catalog recipes. Only service_role may write.
ALTER TABLE public.catalog_recipe_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anyone to read catalog recipe meta"
  ON public.catalog_recipe_meta
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow service role to manage catalog recipe meta"
  ON public.catalog_recipe_meta
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON TABLE public.catalog_recipe_meta TO anon;
GRANT SELECT ON TABLE public.catalog_recipe_meta TO authenticated;
GRANT ALL ON TABLE public.catalog_recipe_meta TO service_role;

-- 7. Update recipe RLS policies to account for catalog recipes.
--    Catalog recipes have user_id = NULL, so the old "auth.uid() = user_id"
--    check never matches them. We add "source = 'catalog'" as a second read
--    path and ensure only service_role can write catalog rows.

-- SELECT: authenticated users can read their own recipes, public recipes, and
--         all catalog recipes.
DROP POLICY IF EXISTS "Enable read access to owners and public recipes" ON public.recipe;

CREATE POLICY "Enable read access to owners and public recipes"
  ON public.recipe
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR visibility = 'public'
    OR source = 'catalog'
  );

-- SELECT: anonymous users can only read public user recipes.
--         Catalog recipes require authentication.
DROP POLICY IF EXISTS "Allow anonymous viewing of public recipes" ON public.recipe;

CREATE POLICY "Allow anonymous viewing of public recipes"
  ON public.recipe
  FOR SELECT
  TO anon
  USING (visibility = 'public' AND source = 'user');

-- INSERT: authenticated users may only insert their own (user-source) recipes.
--         Catalog inserts are handled exclusively by service_role.
DROP POLICY IF EXISTS "Enable insert access to owners only" ON public.recipe;

CREATE POLICY "Enable insert access to owners only"
  ON public.recipe
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND source = 'user');

-- UPDATE / DELETE: authenticated users may only touch their own recipes.
--                  Catalog recipe mutations remain service_role-only.
--                  (Existing policies already restrict to auth.uid() = user_id,
--                   so they remain correct; we just replace them for clarity.)
DROP POLICY IF EXISTS "Enable update delete access to owners only" ON public.recipe;
DROP POLICY IF EXISTS "Enable delete access to owners only" ON public.recipe;

CREATE POLICY "Enable update access to owners only"
  ON public.recipe
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND source = 'user')
  WITH CHECK (auth.uid() = user_id AND source = 'user');

CREATE POLICY "Enable delete access to owners only"
  ON public.recipe
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND source = 'user');

-- 8. Update ingredient / instruction / food / serving SELECT policies so that
--    catalog recipe content is visible alongside public-recipe content.

-- ingredient
DROP POLICY IF EXISTS "Enable read access to owners and public recipe ingredients" ON public.ingredient;

CREATE POLICY "Enable read access to owners and public recipe ingredients"
  ON public.ingredient
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.recipe
      WHERE recipe.id = ingredient.recipe_id
        AND (recipe.visibility = 'public' OR recipe.source = 'catalog')
    )
  );

DROP POLICY IF EXISTS "Allow anonymous viewing of public recipe ingredients" ON public.ingredient;

CREATE POLICY "Allow anonymous viewing of public recipe ingredients"
  ON public.ingredient
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.recipe
      WHERE recipe.id = ingredient.recipe_id
        AND recipe.visibility = 'public'
        AND recipe.source = 'user'
    )
  );

-- instruction
DROP POLICY IF EXISTS "Enable read access to owners and public recipe instructions" ON public.instruction;

CREATE POLICY "Enable read access to owners and public recipe instructions"
  ON public.instruction
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.recipe
      WHERE recipe.id = instruction.recipe_id
        AND (recipe.visibility = 'public' OR recipe.source = 'catalog')
    )
  );

DROP POLICY IF EXISTS "Allow anonymous viewing of public recipe instructions" ON public.instruction;

CREATE POLICY "Allow anonymous viewing of public recipe instructions"
  ON public.instruction
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.recipe
      WHERE recipe.id = instruction.recipe_id
        AND recipe.visibility = 'public'
        AND recipe.source = 'user'
    )
  );

-- food (read path for recipe ingredients)
DROP POLICY IF EXISTS "Allow authenticated viewing of public recipe food" ON public.food;

CREATE POLICY "Allow authenticated viewing of public recipe food"
  ON public.food
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ingredient
      JOIN public.recipe ON recipe.id = ingredient.recipe_id
      WHERE ingredient.food_id = food.id
        AND (recipe.visibility = 'public' OR recipe.source = 'catalog')
    )
  );

DROP POLICY IF EXISTS "Allow anonymous viewing of public recipe food" ON public.food;

CREATE POLICY "Allow anonymous viewing of public recipe food"
  ON public.food
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.ingredient
      JOIN public.recipe ON recipe.id = ingredient.recipe_id
      WHERE ingredient.food_id = food.id
        AND recipe.visibility = 'public'
        AND recipe.source = 'user'
    )
  );

-- serving (read path for recipe ingredients)
DROP POLICY IF EXISTS "Allow authenticated viewing of public recipe servings" ON public.serving;

CREATE POLICY "Allow authenticated viewing of public recipe servings"
  ON public.serving
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ingredient
      JOIN public.recipe ON recipe.id = ingredient.recipe_id
      WHERE ingredient.serving_id = serving.id
        AND (recipe.visibility = 'public' OR recipe.source = 'catalog')
    )
  );

DROP POLICY IF EXISTS "Allow anonymous viewing of public recipe servings" ON public.serving;

CREATE POLICY "Allow anonymous viewing of public recipe servings"
  ON public.serving
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.ingredient
      JOIN public.recipe ON recipe.id = ingredient.recipe_id
      WHERE ingredient.serving_id = serving.id
        AND recipe.visibility = 'public'
        AND recipe.source = 'user'
    )
  );