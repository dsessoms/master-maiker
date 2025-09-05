-- Add support for headers in ingredient and instruction tables
-- This allows storing section headers like "for the sauce" alongside actual ingredients/instructions

-- Add type column to ingredient table to distinguish between ingredients and headers
ALTER TABLE "public"."ingredient" 
ADD COLUMN "type" character varying DEFAULT 'ingredient' NOT NULL;

-- Add type column to instruction table to distinguish between instructions and headers
ALTER TABLE "public"."instruction"
ADD COLUMN "type" character varying DEFAULT 'instruction' NOT NULL;

-- Add name column for storing header text (to match the schema)
ALTER TABLE "public"."ingredient"
ADD COLUMN "name" character varying;

ALTER TABLE "public"."instruction"
ADD COLUMN "name" character varying;

-- Make ingredient foreign keys nullable to support headers
ALTER TABLE "public"."ingredient" 
ALTER COLUMN "food_id" DROP NOT NULL,
ALTER COLUMN "serving_id" DROP NOT NULL,
ALTER COLUMN "number_of_servings" DROP NOT NULL;

-- Make instruction value nullable to support headers
ALTER TABLE "public"."instruction"
ALTER COLUMN "value" DROP NOT NULL;

-- Add check constraints to ensure data integrity
-- For ingredients: either it's an ingredient with required fields, or a header with name
ALTER TABLE "public"."ingredient"
ADD CONSTRAINT "ingredient_type_check" CHECK (
  (type = 'ingredient' AND food_id IS NOT NULL AND serving_id IS NOT NULL AND number_of_servings IS NOT NULL AND name IS NULL) OR
  (type = 'header' AND food_id IS NULL AND serving_id IS NULL AND number_of_servings IS NULL AND name IS NOT NULL)
);

-- For instructions: either it's an instruction with value, or a header with name
ALTER TABLE "public"."instruction"
ADD CONSTRAINT "instruction_type_check" CHECK (
  (type = 'instruction' AND value IS NOT NULL AND name IS NULL) OR
  (type = 'header' AND value IS NULL AND name IS NOT NULL)
);

-- Add missing columns that were in the original schema but truncated in the provided migration
ALTER TABLE "public"."instruction"
ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
ADD COLUMN IF NOT EXISTS "recipe_id" "uuid" NOT NULL,
ADD COLUMN IF NOT EXISTS "user_id" "uuid" NOT NULL,
ADD COLUMN IF NOT EXISTS "order" bigint NOT NULL;

ALTER TABLE "public"."recipe"
ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
ADD COLUMN IF NOT EXISTS "name" character varying NOT NULL,
ADD COLUMN IF NOT EXISTS "number_of_servings" double precision NOT NULL,
ADD COLUMN IF NOT EXISTS "user_id" "uuid" NOT NULL,
ADD COLUMN IF NOT EXISTS "description" "text",
ADD COLUMN IF NOT EXISTS "prep_time_hours" bigint,
ADD COLUMN IF NOT EXISTS "prep_time_minutes" bigint,
ADD COLUMN IF NOT EXISTS "cook_time_hours" bigint,
ADD COLUMN IF NOT EXISTS "cook_time_minutes" bigint;

ALTER TABLE "public"."serving"
ADD COLUMN IF NOT EXISTS "measurement_description" character varying NOT NULL,
ADD COLUMN IF NOT EXISTS "number_of_units" double precision NOT NULL,
ADD COLUMN IF NOT EXISTS "calories" double precision NOT NULL,
ADD COLUMN IF NOT EXISTS "carbohydrate" double precision NOT NULL,
ADD COLUMN IF NOT EXISTS "fat" double precision NOT NULL,
ADD COLUMN IF NOT EXISTS "protein" double precision NOT NULL,
ADD COLUMN IF NOT EXISTS "sugar" double precision,
ADD COLUMN IF NOT EXISTS "sodium" double precision,
ADD COLUMN IF NOT EXISTS "fiber" double precision,
ADD COLUMN IF NOT EXISTS "serving_description" character varying NOT NULL,
ADD COLUMN IF NOT EXISTS "is_default" smallint,
ADD COLUMN IF NOT EXISTS "potassium" double precision,
ADD COLUMN IF NOT EXISTS "vitamin_d" double precision,
ADD COLUMN IF NOT EXISTS "vitamin_a" double precision,
ADD COLUMN IF NOT EXISTS "vitamin_c" double precision,
ADD COLUMN IF NOT EXISTS "calcium" double precision,
ADD COLUMN IF NOT EXISTS "iron" double precision,
ADD COLUMN IF NOT EXISTS "trans_fat" double precision,
ADD COLUMN IF NOT EXISTS "cholesterol" double precision,
ADD COLUMN IF NOT EXISTS "saturated_fat" double precision,
ADD COLUMN IF NOT EXISTS "polyunsaturated_fat" double precision,
ADD COLUMN IF NOT EXISTS "monounsaturated_fat" double precision,
ADD COLUMN IF NOT EXISTS "fat_secret_id" bigint NOT NULL,
ADD COLUMN IF NOT EXISTS "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL;

ALTER TABLE "public"."shopping_list"
ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
ADD COLUMN IF NOT EXISTS "name" character varying NOT NULL,
ADD COLUMN IF NOT EXISTS "user_id" "uuid" NOT NULL;

ALTER TABLE "public"."shopping_list_item"
ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
ADD COLUMN IF NOT EXISTS "user_id" "uuid" NOT NULL,
ADD COLUMN IF NOT EXISTS "shopping_list_id" "uuid" NOT NULL,
ADD COLUMN IF NOT EXISTS "is_checked" boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS "name" character varying,
ADD COLUMN IF NOT EXISTS "recipe_id" "uuid",
ADD COLUMN IF NOT EXISTS "food_id" "uuid",
ADD COLUMN IF NOT EXISTS "serving_id" "uuid",
ADD COLUMN IF NOT EXISTS "number_of_servings" double precision,
ADD COLUMN IF NOT EXISTS "notes" character varying;

-- Update the add_recipe function to support headers and accept full food/serving JSON
-- The function now expects ingredients and instructions as json[] to support headers:
-- For headers: { "type": "header", "name": "For the sauce" }
-- For ingredients: { "type": "ingredient", "name": "Chicken Breast", "serving": {...}, "numberOfServings": 2.0, "meta": "optional" }
-- For instructions: { "type": "instruction", "value": "Mix ingredients together" }
CREATE OR REPLACE FUNCTION "public"."add_recipe"("name" character varying, "number_of_servings" double precision, "instructions" "json"[], "ingredients" "json"[], "recipe_id" "uuid" DEFAULT "gen_random_uuid"(), "prep_time_hours" integer DEFAULT NULL::integer, "prep_time_minutes" integer DEFAULT NULL::integer, "cook_time_hours" integer DEFAULT NULL::integer, "cook_time_minutes" integer DEFAULT NULL::integer, "description" "text" DEFAULT NULL::"text", "image_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
  declare
    user_id uuid := auth.uid();
    food_uuid uuid;
    serving_uuid uuid;
    serving_json json;
  begin
    delete from instruction where instruction.recipe_id = add_recipe.recipe_id;
    delete from ingredient where ingredient.recipe_id = add_recipe.recipe_id;
    
    insert into recipe(id, name, description, number_of_servings, prep_time_hours, prep_time_minutes, cook_time_hours, cook_time_minutes, image_id, user_id) 
    values (recipe_id, add_recipe.name, add_recipe.description, add_recipe.number_of_servings, add_recipe.prep_time_hours, add_recipe.prep_time_minutes, add_recipe.cook_time_hours, add_recipe.cook_time_minutes, add_recipe.image_id, user_id) 
    ON CONFLICT (id) DO UPDATE SET 
    name=excluded.name, 
    description=excluded.description, 
    number_of_servings=excluded.number_of_servings, 
    prep_time_hours=excluded.prep_time_hours, 
    prep_time_minutes=excluded.prep_time_minutes, 
    cook_time_hours=excluded.cook_time_hours, 
    cook_time_minutes=excluded.cook_time_minutes, 
    image_id=excluded.image_id;

    if instructions is not null and array_length(instructions,1) > 0 then
      for i in 1..array_length(instructions,1)
      LOOP
        if instructions[i]::json->>'type' = 'header' then
          insert into instruction(recipe_id, user_id, "order", type, name)
          values (recipe_id, user_id, i, 'header', instructions[i]::json->>'name');
        else
          insert into instruction(recipe_id, user_id, "order", type, value)
          values (recipe_id, user_id, i, 'instruction', instructions[i]::json->>'value');
        end if;
      END LOOP;
    end if;

    if ingredients is not null and array_length(ingredients,1) > 0 then
      for i in 1..array_length(ingredients,1)
      LOOP
        if ingredients[i]::json->>'type' = 'header' then
          insert into ingredient(recipe_id, user_id, "order", type, name)
          values (recipe_id, user_id, i, 'header', ingredients[i]::json->>'name');
        else
          -- Create food entry first
          food_uuid := gen_random_uuid();
          insert into food(id, food_name, food_type, user_id)
          values (food_uuid, ingredients[i]::json->>'name', 'Generic', user_id);
          
          -- Extract serving data and create serving entry
          serving_json := ingredients[i]::json->'serving';
          serving_uuid := gen_random_uuid();
          insert into serving(
            id, 
            food_id, 
            measurement_description, 
            number_of_units, 
            calories, 
            carbohydrate, 
            fat, 
            protein,
            serving_description,
            user_id
          )
          values (
            serving_uuid,
            food_uuid,
            serving_json->>'measurementDescription',
            cast(serving_json->>'numberOfUnits' as double precision),
            cast(serving_json->>'calories' as double precision),
            cast(serving_json->>'carbohydrateGrams' as double precision),
            cast(serving_json->>'fatGrams' as double precision),
            cast(serving_json->>'proteinGrams' as double precision),
            serving_json->>'measurementDescription', -- Use measurement as description for now
            user_id
          );
          
          -- Create ingredient entry with references to the created food and serving
          insert into ingredient(recipe_id, user_id, "order", type, meta, number_of_servings, food_id, serving_id)
          values (recipe_id, user_id, i, 'ingredient', ingredients[i]::json->>'meta', cast(ingredients[i]::json->>'numberOfServings' as double precision), food_uuid, serving_uuid);
        end if;
      END LOOP;
    end if;

    return recipe_id;
  end;
$$;