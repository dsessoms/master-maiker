SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

COMMENT ON SCHEMA "public" IS 'standard public schema';

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

CREATE TYPE "public"."food_entry_type" AS ENUM (
    'Recipe',
    'Food'
);

ALTER TYPE "public"."food_entry_type" OWNER TO "postgres";

CREATE TYPE "public"."food_type" AS ENUM (
    'Brand',
    'Generic'
);

ALTER TYPE "public"."food_type" OWNER TO "postgres";

CREATE TYPE "public"."meal_type_enum" AS ENUM (
    'Breakfast',
    'Lunch',
    'Dinner',
    'Snack'
);

ALTER TYPE "public"."meal_type_enum" OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."add_recipe"("name" character varying, "number_of_servings" double precision, "instructions" character varying[], "ingredients" "json"[], "recipe_id" "uuid" DEFAULT "gen_random_uuid"(), "prep_time_hours" integer DEFAULT NULL::integer, "prep_time_minutes" integer DEFAULT NULL::integer, "cook_time_hours" integer DEFAULT NULL::integer, "cook_time_minutes" integer DEFAULT NULL::integer, "description" "text" DEFAULT NULL::"text", "image_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
  declare
    user_id uuid := auth.uid();
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
        insert into instruction(recipe_id, user_id, "order", value)
        values (recipe_id, user_id, i, instructions[i]);
      END LOOP;
    end if;

    if ingredients is not null and array_length(ingredients,1) > 0 then
      for i in 1..array_length(ingredients,1)
      LOOP
        insert into ingredient(recipe_id, user_id, "order", meta, number_of_servings, food_id, serving_id)
        values (recipe_id, user_id, i, ingredients[i]::json->>'meta', cast(ingredients[i]::json->>'number_of_servings' as double precision), cast(ingredients[i]::json->>'food_id' as uuid), cast(ingredients[i]::json->>'serving_id' as uuid));
      END LOOP;
    end if;

    return recipe_id;
  end;
$$;

ALTER FUNCTION "public"."add_recipe"("name" character varying, "number_of_servings" double precision, "instructions" character varying[], "ingredients" "json"[], "recipe_id" "uuid", "prep_time_hours" integer, "prep_time_minutes" integer, "cook_time_hours" integer, "cook_time_minutes" integer, "description" "text", "image_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
    shopping_list_id uuid := gen_random_uuid();
    default_shopping_list_id uuid := gen_random_uuid();
begin
  insert into public.shopping_list (id, user_id, name, is_default)
  values (shopping_list_id, new.id, 'Shopping List', true);

  return new;
end;
$$;

ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."set_default_shopping_list"("shopping_list_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
  begin
    update shopping_list set is_default = null where is_default = true;

    update shopping_list set is_default = true where id = shopping_list_id;
  end;
$$;

ALTER FUNCTION "public"."set_default_shopping_list"("shopping_list_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."food" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "food_name" character varying NOT NULL,
    "food_type" "public"."food_type" DEFAULT 'Generic'::"public"."food_type" NOT NULL,
    "brand_name" character varying,
    "fat_secret_id" bigint NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);

ALTER TABLE "public"."food" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."food_entry" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "date" "date" NOT NULL,
    "type" "public"."food_entry_type" NOT NULL,
    "food_id" "uuid",
    "serving_id" "uuid",
    "recipe_id" "uuid",
    "number_of_servings" double precision NOT NULL,
    "meal_type" "public"."meal_type_enum" DEFAULT 'Dinner'::"public"."meal_type_enum" NOT NULL,
    "user_id" "uuid" NOT NULL
);

ALTER TABLE "public"."food_entry" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."ingredient" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recipe_id" "uuid" NOT NULL,
    "number_of_servings" double precision NOT NULL,
    "meta" character varying,
    "order" bigint NOT NULL,
    "food_id" "uuid" NOT NULL,
    "serving_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL
);

ALTER TABLE "public"."ingredient" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."instruction" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recipe_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "order" bigint NOT NULL,
    "value" character varying NOT NULL
);

ALTER TABLE "public"."instruction" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."recipe" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" character varying NOT NULL,
    "number_of_servings" double precision NOT NULL,
    "user_id" "uuid" NOT NULL,
    "description" "text",
    "prep_time_hours" bigint,
    "prep_time_minutes" bigint,
    "cook_time_hours" bigint,
    "cook_time_minutes" bigint,
    "image_id" "uuid"
);

ALTER TABLE "public"."recipe" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."serving" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "measurement_description" character varying NOT NULL,
    "number_of_units" double precision NOT NULL,
    "calories" double precision NOT NULL,
    "carbohydrate" double precision NOT NULL,
    "fat" double precision NOT NULL,
    "protein" double precision NOT NULL,
    "sugar" double precision,
    "sodium" double precision,
    "fiber" double precision,
    "serving_description" character varying NOT NULL,
    "is_default" smallint,
    "potassium" double precision,
    "vitamin_d" double precision,
    "vitamin_a" double precision,
    "vitamin_c" double precision,
    "calcium" double precision,
    "iron" double precision,
    "trans_fat" double precision,
    "cholesterol" double precision,
    "saturated_fat" double precision,
    "polyunsaturated_fat" double precision,
    "monounsaturated_fat" double precision,
    "fat_secret_id" bigint NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "food_id" "uuid" NOT NULL
);

ALTER TABLE "public"."serving" OWNER TO "postgres";

CREATE OR REPLACE VIEW "public"."recipe_macros" AS
 SELECT "ingredient"."recipe_id",
    "round"("sum"((("serving"."calories" * "ingredient"."number_of_servings") / "recipe"."number_of_servings"))) AS "calories",
    "round"("sum"((("serving"."carbohydrate" * "ingredient"."number_of_servings") / "recipe"."number_of_servings"))) AS "carbohydrate",
    "round"("sum"((("serving"."protein" * "ingredient"."number_of_servings") / "recipe"."number_of_servings"))) AS "protein",
    "round"("sum"((("serving"."fat" * "ingredient"."number_of_servings") / "recipe"."number_of_servings"))) AS "fat",
    "round"("sum"((("serving"."fiber" * "ingredient"."number_of_servings") / "recipe"."number_of_servings"))) AS "fiber",
    "round"("sum"((("serving"."sugar" * "ingredient"."number_of_servings") / "recipe"."number_of_servings"))) AS "sugar",
    "round"("sum"((("serving"."potassium" * "ingredient"."number_of_servings") / "recipe"."number_of_servings"))) AS "potassium",
    "round"("sum"((("serving"."vitamin_d" * "ingredient"."number_of_servings") / "recipe"."number_of_servings"))) AS "vitamin_d",
    "round"("sum"((("serving"."vitamin_a" * "ingredient"."number_of_servings") / "recipe"."number_of_servings"))) AS "vitamin_a",
    "round"("sum"((("serving"."vitamin_c" * "ingredient"."number_of_servings") / "recipe"."number_of_servings"))) AS "vitamin_c",
    "round"("sum"((("serving"."calcium" * "ingredient"."number_of_servings") / "recipe"."number_of_servings"))) AS "calcium",
    "round"("sum"((("serving"."iron" * "ingredient"."number_of_servings") / "recipe"."number_of_servings"))) AS "iron",
    "round"("sum"((("serving"."trans_fat" * "ingredient"."number_of_servings") / "recipe"."number_of_servings"))) AS "trans_fat",
    "round"("sum"((("serving"."cholesterol" * "ingredient"."number_of_servings") / "recipe"."number_of_servings"))) AS "cholesterol",
    "round"("sum"((("serving"."saturated_fat" * "ingredient"."number_of_servings") / "recipe"."number_of_servings"))) AS "saturated_fat",
    "round"("sum"((("serving"."polyunsaturated_fat" * "ingredient"."number_of_servings") / "recipe"."number_of_servings"))) AS "polyunsaturated_fat",
    "round"("sum"((("serving"."monounsaturated_fat" * "ingredient"."number_of_servings") / "recipe"."number_of_servings"))) AS "monounsaturated_fat"
   FROM (("public"."ingredient" "ingredient"
     JOIN "public"."recipe" "recipe" ON (("recipe"."id" = "ingredient"."recipe_id")))
     JOIN "public"."serving" "serving" ON (("ingredient"."serving_id" = "serving"."id")))
  GROUP BY "ingredient"."recipe_id";

ALTER TABLE "public"."recipe_macros" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."shopping_list" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" character varying NOT NULL,
    "user_id" "uuid" NOT NULL,
    "is_default" boolean
);

ALTER TABLE "public"."shopping_list" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."shopping_list_item" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "shopping_list_id" "uuid" NOT NULL,
    "is_checked" boolean DEFAULT false NOT NULL,
    "name" character varying,
    "recipe_id" "uuid",
    "food_id" "uuid",
    "serving_id" "uuid",
    "number_of_servings" double precision,
    "notes" character varying,
    CONSTRAINT "food_id_check" CHECK (((("food_id" IS NULL) AND ("serving_id" IS NULL)) OR (("food_id" IS NOT NULL) AND ("serving_id" IS NOT NULL) AND ("number_of_servings" IS NOT NULL)))),
    CONSTRAINT "name_check" CHECK ((("name" IS NOT NULL) OR ("recipe_id" IS NOT NULL) OR ("food_id" IS NOT NULL))),
    CONSTRAINT "recipe_id_check" CHECK ((("recipe_id" IS NULL) OR (("recipe_id" IS NOT NULL) AND ("number_of_servings" IS NOT NULL))))
);

ALTER TABLE "public"."shopping_list_item" OWNER TO "postgres";

ALTER TABLE ONLY "public"."instruction"
    ADD CONSTRAINT "Instruction_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."food_entry"
    ADD CONSTRAINT "food_entry_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."food"
    ADD CONSTRAINT "food_fat_secret_id_key" UNIQUE ("fat_secret_id");

ALTER TABLE ONLY "public"."food"
    ADD CONSTRAINT "food_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."ingredient"
    ADD CONSTRAINT "ingredient_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."recipe"
    ADD CONSTRAINT "recipe_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."serving"
    ADD CONSTRAINT "serving_fat_secret_id_key" UNIQUE ("fat_secret_id");

ALTER TABLE ONLY "public"."serving"
    ADD CONSTRAINT "serving_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."shopping_list_item"
    ADD CONSTRAINT "shopping_list_item_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."shopping_list"
    ADD CONSTRAINT "shopping_list_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."shopping_list"
    ADD CONSTRAINT "shopping_list_user_id_is_default_key" UNIQUE ("user_id", "is_default");

CREATE INDEX "shopping_list_is_default_key" ON "public"."shopping_list" USING "btree" ("is_default");

ALTER TABLE ONLY "public"."food_entry"
    ADD CONSTRAINT "food_entry_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "public"."food"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."food_entry"
    ADD CONSTRAINT "food_entry_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."food_entry"
    ADD CONSTRAINT "food_entry_serving_id_fkey" FOREIGN KEY ("serving_id") REFERENCES "public"."serving"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."food_entry"
    ADD CONSTRAINT "food_entry_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."ingredient"
    ADD CONSTRAINT "ingredient_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "public"."food"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."ingredient"
    ADD CONSTRAINT "ingredient_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."ingredient"
    ADD CONSTRAINT "ingredient_serving_id_fkey" FOREIGN KEY ("serving_id") REFERENCES "public"."serving"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."ingredient"
    ADD CONSTRAINT "ingredient_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."instruction"
    ADD CONSTRAINT "instruction_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."instruction"
    ADD CONSTRAINT "instruction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."recipe"
    ADD CONSTRAINT "recipe_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."serving"
    ADD CONSTRAINT "serving_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "public"."food"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."shopping_list_item"
    ADD CONSTRAINT "shopping_list_item_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "public"."food"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."shopping_list_item"
    ADD CONSTRAINT "shopping_list_item_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."shopping_list_item"
    ADD CONSTRAINT "shopping_list_item_serving_id_fkey" FOREIGN KEY ("serving_id") REFERENCES "public"."serving"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."shopping_list_item"
    ADD CONSTRAINT "shopping_list_item_shopping_list_id_fkey" FOREIGN KEY ("shopping_list_id") REFERENCES "public"."shopping_list"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."shopping_list_item"
    ADD CONSTRAINT "shopping_list_item_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."shopping_list"
    ADD CONSTRAINT "shopping_list_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

CREATE POLICY "Enable access to data owners" ON "public"."food_entry" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Enable access to data owners" ON "public"."ingredient" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Enable access to data owners" ON "public"."instruction" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Enable access to data owners" ON "public"."recipe" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Enable all data owners" ON "public"."shopping_list" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Enable all data owners" ON "public"."shopping_list_item" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Enable select for authenticated users only" ON "public"."food" FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "Enable select for authenticated users only" ON "public"."serving" FOR SELECT TO "authenticated" USING (true);

ALTER TABLE "public"."food" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."food_entry" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."ingredient" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."instruction" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."recipe" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."serving" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."shopping_list" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."shopping_list_item" ENABLE ROW LEVEL SECURITY;

ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT ALL ON FUNCTION "public"."add_recipe"("name" character varying, "number_of_servings" double precision, "instructions" character varying[], "ingredients" "json"[], "recipe_id" "uuid", "prep_time_hours" integer, "prep_time_minutes" integer, "cook_time_hours" integer, "cook_time_minutes" integer, "description" "text", "image_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."add_recipe"("name" character varying, "number_of_servings" double precision, "instructions" character varying[], "ingredients" "json"[], "recipe_id" "uuid", "prep_time_hours" integer, "prep_time_minutes" integer, "cook_time_hours" integer, "cook_time_minutes" integer, "description" "text", "image_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_recipe"("name" character varying, "number_of_servings" double precision, "instructions" character varying[], "ingredients" "json"[], "recipe_id" "uuid", "prep_time_hours" integer, "prep_time_minutes" integer, "cook_time_hours" integer, "cook_time_minutes" integer, "description" "text", "image_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";
GRANT ALL ON FUNCTION "public"."set_default_shopping_list"("shopping_list_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_default_shopping_list"("shopping_list_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_default_shopping_list"("shopping_list_id" "uuid") TO "service_role";
GRANT ALL ON TABLE "public"."food" TO "anon";
GRANT ALL ON TABLE "public"."food" TO "authenticated";
GRANT ALL ON TABLE "public"."food" TO "service_role";
GRANT ALL ON TABLE "public"."food_entry" TO "anon";
GRANT ALL ON TABLE "public"."food_entry" TO "authenticated";
GRANT ALL ON TABLE "public"."food_entry" TO "service_role";
GRANT ALL ON TABLE "public"."ingredient" TO "anon";
GRANT ALL ON TABLE "public"."ingredient" TO "authenticated";
GRANT ALL ON TABLE "public"."ingredient" TO "service_role";
GRANT ALL ON TABLE "public"."instruction" TO "anon";
GRANT ALL ON TABLE "public"."instruction" TO "authenticated";
GRANT ALL ON TABLE "public"."instruction" TO "service_role";
GRANT ALL ON TABLE "public"."recipe" TO "anon";
GRANT ALL ON TABLE "public"."recipe" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe" TO "service_role";
GRANT ALL ON TABLE "public"."serving" TO "anon";
GRANT ALL ON TABLE "public"."serving" TO "authenticated";
GRANT ALL ON TABLE "public"."serving" TO "service_role";
GRANT ALL ON TABLE "public"."recipe_macros" TO "anon";
GRANT ALL ON TABLE "public"."recipe_macros" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe_macros" TO "service_role";
GRANT ALL ON TABLE "public"."shopping_list" TO "anon";
GRANT ALL ON TABLE "public"."shopping_list" TO "authenticated";
GRANT ALL ON TABLE "public"."shopping_list" TO "service_role";
GRANT ALL ON TABLE "public"."shopping_list_item" TO "anon";
GRANT ALL ON TABLE "public"."shopping_list_item" TO "authenticated";
GRANT ALL ON TABLE "public"."shopping_list_item" TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";

RESET ALL;

--
-- Dumped schema changes for auth and storage
--

CREATE OR REPLACE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();

CREATE POLICY "Give users authenticated access to folder 1uy8qe8_0" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'recipe-photos'::"text") AND ("auth"."role"() = 'authenticated'::"text")));
