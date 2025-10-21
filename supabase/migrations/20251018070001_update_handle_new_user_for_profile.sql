-- Update handle_new_user function to create a primary profile for new users
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
    shopping_list_id uuid := gen_random_uuid();
    default_shopping_list_id uuid := gen_random_uuid();
begin
  -- Create default shopping list
  insert into public.shopping_list (id, user_id, name, is_default)
  values (shopping_list_id, new.id, 'Shopping List', true);

  -- Create primary profile with user's email as default name
  insert into public.profile (user_id, name, is_primary)
  values (new.id, new.email, true);

  return new;
end;
$$;

ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

-- Grant permissions
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";