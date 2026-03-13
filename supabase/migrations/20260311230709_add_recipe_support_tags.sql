-- Update add_recipe function to support cuisines, diets, dish_types, and tags
CREATE OR REPLACE FUNCTION "public"."add_recipe"(
  "recipe_name" character varying, 
  "number_of_servings" double precision, 
  "ingredients" "json"[], 
  "instructions" "json"[] DEFAULT NULL::"json"[], 
  "recipe_id" "uuid" DEFAULT "gen_random_uuid"(), 
  "prep_time_hours" integer DEFAULT NULL::integer, 
  "prep_time_minutes" integer DEFAULT NULL::integer, 
  "cook_time_hours" integer DEFAULT NULL::integer, 
  "cook_time_minutes" integer DEFAULT NULL::integer, 
  "description" "text" DEFAULT NULL::"text", 
  "image_id" "uuid" DEFAULT NULL::"uuid",
  "source_url" character varying DEFAULT NULL::character varying,
  "cuisine_ids" integer[] DEFAULT NULL::integer[],
  "diet_ids" integer[] DEFAULT NULL::integer[],
  "dish_type_ids" integer[] DEFAULT NULL::integer[],
  "tag_names" text[] DEFAULT NULL::text[]
) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
  declare
    current_user_id uuid := auth.uid();
    food_uuid uuid;
    serving_uuid uuid;
    serving_json json;
    tag_id_val integer;
    tag_name_val text;
  begin
    -- Delete old ingredients and instructions
    delete from ingredient where ingredient.recipe_id = add_recipe.recipe_id;
    delete from instruction where instruction.recipe_id = add_recipe.recipe_id;
    
    -- Delete old classification associations
    delete from recipe_cuisines where recipe_cuisines.recipe_id = add_recipe.recipe_id;
    delete from recipe_diets where recipe_diets.recipe_id = add_recipe.recipe_id;
    delete from recipe_dish_types where recipe_dish_types.recipe_id = add_recipe.recipe_id;
    delete from recipe_tags where recipe_tags.recipe_id = add_recipe.recipe_id;
    
    insert into recipe(id, name, description, number_of_servings, prep_time_hours, prep_time_minutes, cook_time_hours, cook_time_minutes, image_id, source_url, user_id) 
    values (add_recipe.recipe_id, add_recipe.recipe_name, add_recipe.description, add_recipe.number_of_servings, add_recipe.prep_time_hours, add_recipe.prep_time_minutes, add_recipe.cook_time_hours, add_recipe.cook_time_minutes, add_recipe.image_id, add_recipe.source_url, current_user_id) 
    ON CONFLICT (id) DO UPDATE SET 
    name=excluded.name, 
    description=excluded.description, 
    number_of_servings=excluded.number_of_servings, 
    prep_time_hours=excluded.prep_time_hours, 
    prep_time_minutes=excluded.prep_time_minutes, 
    cook_time_hours=excluded.cook_time_hours, 
    cook_time_minutes=excluded.cook_time_minutes, 
    image_id=excluded.image_id,
    source_url=excluded.source_url;

    -- Handle cuisines
    if cuisine_ids is not null and array_length(cuisine_ids, 1) > 0 then
      insert into recipe_cuisines (recipe_id, cuisine_id)
      select add_recipe.recipe_id, unnest(cuisine_ids);
    end if;

    -- Handle diets
    if diet_ids is not null and array_length(diet_ids, 1) > 0 then
      insert into recipe_diets (recipe_id, diet_id)
      select add_recipe.recipe_id, unnest(diet_ids);
    end if;

    -- Handle dish_types
    if dish_type_ids is not null and array_length(dish_type_ids, 1) > 0 then
      insert into recipe_dish_types (recipe_id, dish_type_id)
      select add_recipe.recipe_id, unnest(dish_type_ids);
    end if;

    -- Handle tags (create if they don't exist)
    if tag_names is not null and array_length(tag_names, 1) > 0 then
      foreach tag_name_val in array tag_names
      loop
        -- Normalize tag name (lowercase and trim)
        tag_name_val := lower(trim(tag_name_val));
        
        -- Insert tag if it doesn't exist, get its id
        insert into tags ("name", user_id)
        values (tag_name_val, current_user_id)
        on conflict ("name", user_id) do nothing;
        
        -- Get the tag id (fully qualify the column name to avoid ambiguity)
        select tags.id into tag_id_val from tags where tags.name = tag_name_val and tags.user_id = current_user_id;
        
        -- Associate tag with recipe
        insert into recipe_tags (recipe_id, tag_id)
        values (add_recipe.recipe_id, tag_id_val)
        on conflict do nothing;
      end loop;
    end if;

    -- Handle instructions (JSON format with headers and values)
    if instructions is not null and array_length(instructions,1) > 0 then
      for i in 1..array_length(instructions,1)
      LOOP
        if instructions[i]::json->>'type' = 'header' then
          insert into instruction(recipe_id, user_id, "order", type, "name")
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
          insert into ingredient(recipe_id, user_id, "order", type, "name")
          values (add_recipe.recipe_id, current_user_id, i, 'header', ingredients[i]::json->>'name');
        else
          -- Check if food already exists for this user by fat_secret_id only
          select f.id into food_uuid
          from food f
          where f.user_id = current_user_id
            and ingredients[i]::json->>'fat_secret_id' is not null 
            and f.fat_secret_id = cast(ingredients[i]::json->>'fat_secret_id' as bigint)
          limit 1;
          
          -- Create food entry if it doesn't exist
          if food_uuid is null then
            food_uuid := gen_random_uuid();
            insert into food(id, food_name, food_type, user_id, image_url, aisle, fat_secret_id, spoonacular_id)
            values (
              food_uuid, 
              ingredients[i]::json->>'name', 
              COALESCE(cast(ingredients[i]::json->>'food_type' as public.food_type), 'Generic'::public.food_type),
              current_user_id, 
              ingredients[i]::json->>'image_url',
              ingredients[i]::json->>'aisle',
              cast(ingredients[i]::json->>'fat_secret_id' as bigint),
              cast(ingredients[i]::json->>'spoonacular_id' as bigint)
            );
          end if;
          
          -- Extract serving data
          serving_json := ingredients[i]::json->'serving';
          
          -- Check if serving already exists for this food by fat_secret_id only
          select s.id into serving_uuid
          from serving s
          where s.food_id = food_uuid
            and serving_json->>'fat_secret_id' is not null 
            and s.fat_secret_id = cast(serving_json->>'fat_secret_id' as bigint)
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
              sugar,
              sodium,
              fiber,
              potassium,
              vitamin_d,
              vitamin_a,
              vitamin_c,
              calcium,
              iron,
              trans_fat,
              cholesterol,
              saturated_fat,
              polyunsaturated_fat,
              monounsaturated_fat,
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
              cast(serving_json->>'sugar_grams' as double precision),
              cast(serving_json->>'sodium_mg' as double precision),
              cast(serving_json->>'fiber_grams' as double precision),
              cast(serving_json->>'potassium_mg' as double precision),
              cast(serving_json->>'vitamin_d_mcg' as double precision),
              cast(serving_json->>'vitamin_a_mcg' as double precision),
              cast(serving_json->>'vitamin_c_mg' as double precision),
              cast(serving_json->>'calcium_mg' as double precision),
              cast(serving_json->>'iron_mg' as double precision),
              cast(serving_json->>'trans_fat_grams' as double precision),
              cast(serving_json->>'cholesterol_mg' as double precision),
              cast(serving_json->>'saturated_fat_grams' as double precision),
              cast(serving_json->>'polyunsaturated_fat_grams' as double precision),
              cast(serving_json->>'monounsaturated_fat_grams' as double precision),
              COALESCE(serving_json->>'serving_description', serving_json->>'measurement_description'),
              cast(serving_json->>'metric_serving_amount' as double precision),
              serving_json->>'metric_serving_unit',
              current_user_id,
              cast(serving_json->>'fat_secret_id' as bigint)
            );
          end if;
          
          -- Create ingredient entry with references to the created food and serving
          insert into ingredient(recipe_id, user_id, "order", type, meta, number_of_servings, food_id, serving_id, original_name)
          values (add_recipe.recipe_id, current_user_id, i, 'ingredient', ingredients[i]::json->>'meta', cast(ingredients[i]::json->>'number_of_servings' as double precision), food_uuid, serving_uuid, ingredients[i]::json->>'original_name');
        end if;
      END LOOP;
    end if;

    return add_recipe.recipe_id;
  end;
$$;
