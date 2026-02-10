-- Add aisle column to food table
ALTER TABLE "public"."food" ADD COLUMN IF NOT EXISTS "aisle" character varying;

-- Update add_recipe function to include aisle when saving food items
CREATE OR REPLACE FUNCTION "public"."add_recipe"("name" character varying, "number_of_servings" double precision, "ingredients" "json"[], "instructions" "json"[] DEFAULT NULL::"json"[], "recipe_id" "uuid" DEFAULT "gen_random_uuid"(), "prep_time_hours" integer DEFAULT NULL::integer, "prep_time_minutes" integer DEFAULT NULL::integer, "cook_time_hours" integer DEFAULT NULL::integer, "cook_time_minutes" integer DEFAULT NULL::integer, "description" "text" DEFAULT NULL::"text", "image_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
  declare
    current_user_id uuid := auth.uid();
    food_uuid uuid;
    serving_uuid uuid;
    serving_json json;
  begin
    -- Delete old ingredients and instructions
    delete from ingredient where ingredient.recipe_id = add_recipe.recipe_id;
    delete from instruction where instruction.recipe_id = add_recipe.recipe_id;
    
    insert into recipe(id, name, description, number_of_servings, prep_time_hours, prep_time_minutes, cook_time_hours, cook_time_minutes, image_id, user_id) 
    values (add_recipe.recipe_id, add_recipe.name, add_recipe.description, add_recipe.number_of_servings, add_recipe.prep_time_hours, add_recipe.prep_time_minutes, add_recipe.cook_time_hours, add_recipe.cook_time_minutes, add_recipe.image_id, current_user_id) 
    ON CONFLICT (id) DO UPDATE SET 
    name=excluded.name, 
    description=excluded.description, 
    number_of_servings=excluded.number_of_servings, 
    prep_time_hours=excluded.prep_time_hours, 
    prep_time_minutes=excluded.prep_time_minutes, 
    cook_time_hours=excluded.cook_time_hours, 
    cook_time_minutes=excluded.cook_time_minutes, 
    image_id=excluded.image_id;

    -- Handle instructions (JSON format with headers and values)
    if instructions is not null and array_length(instructions,1) > 0 then
      for i in 1..array_length(instructions,1)
      LOOP
        if instructions[i]::json->>'type' = 'header' then
          insert into instruction(recipe_id, user_id, "order", type, name)
          values (add_recipe.recipe_id, current_user_id, i, 'header', instructions[i]::json->>'name');
        else
          insert into instruction(recipe_id, user_id, "order", type, value)
          values (add_recipe.recipe_id, current_user_id, i, 'instruction', instructions[i]::json->>'value');
        end if;
      END LOOP;
    end if;

    if ingredients is not null and array_length(ingredients,1) > 0 then
      for i in 1..array_length(ingredients,1)
      LOOP
        if ingredients[i]::json->>'type' = 'header' then
          insert into ingredient(recipe_id, user_id, "order", type, name)
          values (add_recipe.recipe_id, current_user_id, i, 'header', ingredients[i]::json->>'name');
        else
          -- Check if food already exists for this user by spoonacular_id or fat_secret_id
          select f.id into food_uuid
          from food f
          where f.user_id = current_user_id
            and (
              (ingredients[i]::json->>'spoonacular_id' is not null 
               and f.spoonacular_id = cast(ingredients[i]::json->>'spoonacular_id' as bigint))
              or
              (ingredients[i]::json->>'fat_secret_id' is not null 
               and f.fat_secret_id = cast(ingredients[i]::json->>'fat_secret_id' as bigint))
            )
          limit 1;
          
          -- Create food entry if it doesn't exist
          if food_uuid is null then
            food_uuid := gen_random_uuid();
            insert into food(id, food_name, food_type, user_id, image_url, aisle, fat_secret_id, spoonacular_id)
            values (
              food_uuid, 
              ingredients[i]::json->>'name', 
              'Generic', 
              current_user_id, 
              ingredients[i]::json->>'image_url',
              ingredients[i]::json->>'aisle',
              cast(ingredients[i]::json->>'fat_secret_id' as bigint),
              cast(ingredients[i]::json->>'spoonacular_id' as bigint)
            );
          end if;
          
          -- Extract serving data
          serving_json := ingredients[i]::json->'serving';
          
          -- Check if serving already exists for this food
          select s.id into serving_uuid
          from serving s
          where s.food_id = food_uuid
            and (
              (serving_json->>'fat_secret_id' is not null 
               and s.fat_secret_id = cast(serving_json->>'fat_secret_id' as bigint))
              or
              (s.measurement_description = serving_json->>'measurement_description')
            )
          limit 1;
          
          -- Create serving entry if it doesn't exist
          if serving_uuid is null then
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
              metric_serving_amount,
              metric_serving_unit,
              user_id,
              fat_secret_id
            )
            values (
              serving_uuid,
              food_uuid,
              serving_json->>'measurement_description',
              cast(serving_json->>'number_of_units' as double precision),
              cast(serving_json->>'calories' as double precision),
              cast(serving_json->>'carbohydrate_grams' as double precision),
              cast(serving_json->>'fat_grams' as double precision),
              cast(serving_json->>'protein_grams' as double precision),
              COALESCE(serving_json->>'serving_description', serving_json->>'measurement_description'),
              cast(serving_json->>'metric_serving_amount' as double precision),
              serving_json->>'metric_serving_unit',
              current_user_id,
              cast(serving_json->>'fat_secret_id' as bigint)
            );
          end if;
          
          -- Create ingredient entry with references to the created food and serving
          insert into ingredient(recipe_id, user_id, "order", type, meta, number_of_servings, food_id, serving_id)
          values (add_recipe.recipe_id, current_user_id, i, 'ingredient', ingredients[i]::json->>'meta', cast(ingredients[i]::json->>'number_of_servings' as double precision), food_uuid, serving_uuid);
        end if;
      END LOOP;
    end if;

    return add_recipe.recipe_id;
  end;
$$;
