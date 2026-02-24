-- Add visibility enum type
CREATE TYPE public.recipe_visibility AS ENUM ('owner', 'public');

-- Add visibility column to recipe table
ALTER TABLE public.recipe 
ADD COLUMN visibility public.recipe_visibility NOT NULL DEFAULT 'owner';

-- Add index for public recipes for better query performance
CREATE INDEX idx_recipe_visibility ON public.recipe(visibility) WHERE visibility = 'public';

-- Update RLS policies for recipe table
-- Drop existing "Enable access to data owners" policy and replace with one that supports public recipes
DROP POLICY IF EXISTS "Enable access to data owners" ON public.recipe;

-- Create policy for authenticated users: can view own recipes OR public recipes
CREATE POLICY "Enable read access to owners and public recipes" 
ON public.recipe
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR visibility = 'public');

-- Create policy for authenticated users: can only insert their own recipes
CREATE POLICY "Enable insert access to owners only" 
ON public.recipe
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create policy for authenticated users: can only update/delete their own recipes
CREATE POLICY "Enable update delete access to owners only" 
ON public.recipe
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete access to owners only" 
ON public.recipe
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create policy for anonymous users: can only view public recipes
CREATE POLICY "Allow anonymous viewing of public recipes"
ON public.recipe
FOR SELECT
TO anon
USING (visibility = 'public');

-- Update the ingredient table RLS to allow viewing ingredients of public recipes
DROP POLICY IF EXISTS "Enable access to data owners" ON public.ingredient;

-- Create policy for authenticated users: can view own ingredients OR public recipe ingredients
CREATE POLICY "Enable read access to owners and public recipe ingredients"
ON public.ingredient
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.recipe 
    WHERE recipe.id = ingredient.recipe_id 
    AND recipe.visibility = 'public'
  )
);

-- Create policy for authenticated users: can only insert their own ingredients
CREATE POLICY "Enable insert access to ingredient owners only"
ON public.ingredient
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create policy for authenticated users: can only update their own ingredients
CREATE POLICY "Enable update access to ingredient owners only"
ON public.ingredient
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create policy for authenticated users: can only delete their own ingredients
CREATE POLICY "Enable delete access to ingredient owners only"
ON public.ingredient
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create policy for anonymous users: can only view public recipe ingredients
CREATE POLICY "Allow anonymous viewing of public recipe ingredients"
ON public.ingredient
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.recipe 
    WHERE recipe.id = ingredient.recipe_id 
    AND recipe.visibility = 'public'
  )
);

-- Update the instruction table RLS to allow viewing instructions of public recipes
DROP POLICY IF EXISTS "Enable access to data owners" ON public.instruction;

-- Create policy for authenticated users: can view own instructions OR public recipe instructions
CREATE POLICY "Enable read access to owners and public recipe instructions"
ON public.instruction
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.recipe 
    WHERE recipe.id = instruction.recipe_id 
    AND recipe.visibility = 'public'
  )
);

-- Create policy for authenticated users: can only insert their own instructions
CREATE POLICY "Enable insert access to instruction owners only"
ON public.instruction
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create policy for authenticated users: can only update their own instructions
CREATE POLICY "Enable update access to instruction owners only"
ON public.instruction
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create policy for authenticated users: can only delete their own instructions
CREATE POLICY "Enable delete access to instruction owners only"
ON public.instruction
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create policy for anonymous users: can only view public recipe instructions
CREATE POLICY "Allow anonymous viewing of public recipe instructions"
ON public.instruction
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.recipe 
    WHERE recipe.id = instruction.recipe_id 
    AND recipe.visibility = 'public'
  )
);

-- Allow anonymous users to view food data for public recipe ingredients
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
  )
);

-- Allow authenticated users to view food data for public recipe ingredients
CREATE POLICY "Allow authenticated viewing of public recipe food"
ON public.food
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ingredient
    JOIN public.recipe ON recipe.id = ingredient.recipe_id
    WHERE ingredient.food_id = food.id
    AND recipe.visibility = 'public'
  )
);

-- Allow anonymous users to view serving data for public recipe ingredients
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
  )
);

-- Allow authenticated users to view serving data for public recipe ingredients
CREATE POLICY "Allow authenticated viewing of public recipe servings"
ON public.serving
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ingredient
    JOIN public.recipe ON recipe.id = ingredient.recipe_id
    WHERE ingredient.serving_id = serving.id
    AND recipe.visibility = 'public'
  )
);
