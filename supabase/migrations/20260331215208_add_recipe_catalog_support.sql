-- Update add_recipe to support catalog recipes (source = 'catalog').
--
-- Key behavioural differences when source = 'catalog':
--   • current_user_id is NULL  – catalog rows are unowned
--   • recipe.source is set to 'catalog'
--   • food dedup uses spoonacular_id + user_id IS NULL instead of fat_secret_id
--   • serving dedup uses measurement_description instead of fat_secret_id
--   • food / serving / ingredient / instruction rows all have user_id = NULL

-- Drop the current signature so we can add the new `source` parameter.
DROP FUNCTION IF EXISTS "public"."add_recipe"(
  character varying,
  double precision,
  "json"[],
  "json"[],
  "uuid",
  integer,
  integer,
  integer,
  integer,
  "text",
  "uuid",
  character varying,
  integer[],
  integer[],
  integer[],
  text[]
);

CREATE OR REPLACE FUNCTION "public"."add_recipe"(
  "recipe_name"     character varying,
  "number_of_servings" double precision,
  "ingredients"     "json"[],
  "instructions"    "json"[]     DEFAULT NULL::"json"[],
  "recipe_id"       "uuid"       DEFAULT "gen_random_uuid"(),
  "prep_time_hours"   integer    DEFAULT NULL::integer,
  "prep_time_minutes" integer    DEFAULT NULL::integer,
  "cook_time_hours"   integer    DEFAULT NULL::integer,
  "cook_time_minutes" integer    DEFAULT NULL::integer,
  "description"     "text"       DEFAULT NULL::"text",
  "image_id"        "uuid"       DEFAULT NULL::"uuid",
  "source_url"      character varying DEFAULT NULL::character varying,
  "cuisine_ids"     integer[]    DEFAULT NULL::integer[],
  "diet_ids"        integer[]    DEFAULT NULL::integer[],
  "dish_type_ids"   integer[]    DEFAULT NULL::integer[],
  "tag_names"       text[]       DEFAULT NULL::text[],
  "source"          text         DEFAULT 'user'
) RETURNS "uuid"
  LANGUAGE "plpgsql"
  SECURITY DEFINER
  AS $$
  declare
    -- For user recipes this is auth.uid(); for catalog recipes it is NULL.
    current_user_id uuid;
    food_uuid       uuid;
    serving_uuid    uuid;
    serving_json    json;
    tag_id_val      integer;
    tag_name_val    text;
  begin
    -- Validate source value
    if add_recipe.source not in ('user', 'catalog') then
      raise exception 'Invalid source value: %. Must be ''user'' or ''catalog''.', add_recipe.source;
    end if;

    if add_recipe.source = 'catalog' then
      current_user_id := null;
    else
      current_user_id := auth.uid();
      if current_user_id is null then
        raise exception 'User must be authenticated to save a user recipe.';
      end if;
    end if;

    -- Delete old child rows so re-imports are idempotent
    delete from ingredient  where ingredient.recipe_id  = add_recipe.recipe_id;
    delete from instruction where instruction.recipe_id = add_recipe.recipe_id;

    -- Delete old classification associations
    delete from recipe_cuisines   where recipe_cuisines.recipe_id   = add_recipe.recipe_id;
    delete from recipe_diets      where recipe_diets.recipe_id      = add_recipe.recipe_id;
    delete from recipe_dish_types where recipe_dish_types.recipe_id = add_recipe.recipe_id;
    delete from recipe_tags       where recipe_tags.recipe_id       = add_recipe.recipe_id;

    insert into recipe(
      id, name, description, number_of_servings,
      prep_time_hours, prep_time_minutes, cook_time_hours, cook_time_minutes,
      image_id, source_url, source, user_id
    )
    values (
      add_recipe.recipe_id, add_recipe.recipe_name, add_recipe.description, add_recipe.number_of_servings,
      add_recipe.prep_time_hours, add_recipe.prep_time_minutes, add_recipe.cook_time_hours, add_recipe.cook_time_minutes,
      add_recipe.image_id, add_recipe.source_url, add_recipe.source, current_user_id
    )
    ON CONFLICT (id) DO UPDATE SET
      name                = excluded.name,
      description         = excluded.description,
      number_of_servings  = excluded.number_of_servings,
      prep_time_hours     = excluded.prep_time_hours,
      prep_time_minutes   = excluded.prep_time_minutes,
      cook_time_hours     = excluded.cook_time_hours,
      cook_time_minutes   = excluded.cook_time_minutes,
      image_id            = excluded.image_id,
      source_url          = excluded.source_url,
      source              = excluded.source;

    -- Cuisines
    if cuisine_ids is not null and array_length(cuisine_ids, 1) > 0 then
      insert into recipe_cuisines (recipe_id, cuisine_id)
      select add_recipe.recipe_id, unnest(cuisine_ids);
    end if;

    -- Diets
    if diet_ids is not null and array_length(diet_ids, 1) > 0 then
      insert into recipe_diets (recipe_id, diet_id)
      select add_recipe.recipe_id, unnest(diet_ids);
    end if;

    -- Dish types
    if dish_type_ids is not null and array_length(dish_type_ids, 1) > 0 then
      insert into recipe_dish_types (recipe_id, dish_type_id)
      select add_recipe.recipe_id, unnest(dish_type_ids);
    end if;

    -- Tags (user recipes only – catalog recipes don't have per-user tags)
    if add_recipe.source = 'user'
       and tag_names is not null
       and array_length(tag_names, 1) > 0
    then
      foreach tag_name_val in array tag_names
      loop
        tag_name_val := lower(trim(tag_name_val));

        insert into tags ("name", user_id)
        values (tag_name_val, current_user_id)
        on conflict ("name", user_id) do nothing;

        select tags.id into tag_id_val
        from tags
        where tags.name = tag_name_val and tags.user_id = current_user_id;

        insert into recipe_tags (recipe_id, tag_id)
        values (add_recipe.recipe_id, tag_id_val)
        on conflict do nothing;
      end loop;
    end if;

    -- Instructions
    if instructions is not null and array_length(instructions, 1) > 0 then
      for i in 1..array_length(instructions, 1)
      loop
        if instructions[i]::json->>'type' = 'header' then
          insert into instruction(recipe_id, user_id, "order", type, "name")
          values (add_recipe.recipe_id, current_user_id, i, 'header', instructions[i]::json->>'name');
        else
          insert into instruction(recipe_id, user_id, "order", type, value)
          values (add_recipe.recipe_id, current_user_id, i, 'instruction', instructions[i]::json->>'value');
        end if;
      end loop;
    end if;

    -- Ingredients
    if ingredients is not null and array_length(ingredients, 1) > 0 then
      for i in 1..array_length(ingredients, 1)
      loop
        if ingredients[i]::json->>'type' = 'header' then
          insert into ingredient(recipe_id, user_id, "order", type, "name")
          values (add_recipe.recipe_id, current_user_id, i, 'header', ingredients[i]::json->>'name');
        else
          food_uuid := null;

          if add_recipe.source = 'catalog' then
            -- Catalog: deduplicate food by spoonacular_id among unowned rows
            if ingredients[i]::json->>'spoonacular_id' is not null then
              select f.id into food_uuid
              from food f
              where f.user_id is null
                and f.spoonacular_id = cast(ingredients[i]::json->>'spoonacular_id' as bigint)
              limit 1;
            end if;
          else
            -- User recipe: deduplicate food by fat_secret_id among the user's rows
            if ingredients[i]::json->>'fat_secret_id' is not null then
              select f.id into food_uuid
              from food f
              where f.user_id = current_user_id
                and f.fat_secret_id = cast(ingredients[i]::json->>'fat_secret_id' as bigint)
              limit 1;
            end if;
          end if;

          -- Create food if not found
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

          serving_json := ingredients[i]::json->'serving';
          serving_uuid := null;

          if serving_json is not null then
            if add_recipe.source = 'catalog' then
              -- Catalog: deduplicate serving by measurement_description
              select s.id into serving_uuid
              from serving s
              where s.food_id = food_uuid
                and s.measurement_description = serving_json->>'measurement_description'
              limit 1;
            else
              -- User recipe: deduplicate serving by fat_secret_id
              if serving_json->>'fat_secret_id' is not null then
                select s.id into serving_uuid
                from serving s
                where s.food_id = food_uuid
                  and s.fat_secret_id = cast(serving_json->>'fat_secret_id' as bigint)
                limit 1;
              end if;
            end if;

            -- Create serving if not found
            if serving_uuid is null then
              serving_uuid := gen_random_uuid();
              insert into serving(
                id, food_id, measurement_description, number_of_units,
                calories, carbohydrate, fat, protein,
                sugar, sodium, fiber, potassium,
                vitamin_d, vitamin_a, vitamin_c, calcium, iron,
                trans_fat, cholesterol, saturated_fat,
                polyunsaturated_fat, monounsaturated_fat,
                serving_description, metric_serving_amount, metric_serving_unit,
                user_id, fat_secret_id
              )
              values (
                serving_uuid, food_uuid,
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
          end if;

          insert into ingredient(recipe_id, user_id, "order", type, meta, number_of_servings, food_id, serving_id, original_name)
          values (
            add_recipe.recipe_id, current_user_id, i, 'ingredient',
            ingredients[i]::json->>'meta',
            cast(ingredients[i]::json->>'number_of_servings' as double precision),
            food_uuid, serving_uuid,
            ingredients[i]::json->>'original_name'
          );
        end if;
      end loop;
    end if;

    return add_recipe.recipe_id;
  end;
$$;

-- Grant execute to all roles (mirrors previous grants)
GRANT EXECUTE ON FUNCTION "public"."add_recipe"(
  character varying, double precision, "json"[], "json"[], "uuid",
  integer, integer, integer, integer, "text", "uuid",
  character varying, integer[], integer[], integer[], text[], text
) TO anon;
GRANT EXECUTE ON FUNCTION "public"."add_recipe"(
  character varying, double precision, "json"[], "json"[], "uuid",
  integer, integer, integer, integer, "text", "uuid",
  character varying, integer[], integer[], integer[], text[], text
) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."add_recipe"(
  character varying, double precision, "json"[], "json"[], "uuid",
  integer, integer, integer, integer, "text", "uuid",
  character varying, integer[], integer[], integer[], text[], text
) TO service_role;
