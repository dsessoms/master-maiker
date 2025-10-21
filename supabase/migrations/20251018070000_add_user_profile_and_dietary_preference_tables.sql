-- Add user profile tables with improved structure

-- Create enums for gender and activity level
CREATE TYPE "public"."gender_enum" AS ENUM (
    'male',
    'female',
    'other'
);

CREATE TYPE "public"."activity_level_enum" AS ENUM (
    'sedentary',
    'lightly_active',
    'moderately_active',
    'very_active',
    'extremely_active'
);

CREATE TYPE "public"."calorie_target_type_enum" AS ENUM (
    'gain',
    'maintain',
    'lose'
);

ALTER TYPE "public"."gender_enum" OWNER TO "postgres";
ALTER TYPE "public"."activity_level_enum" OWNER TO "postgres";
ALTER TYPE "public"."calorie_target_type_enum" OWNER TO "postgres";

-- Table: Profile (collapsed from 3 tables)
CREATE TABLE IF NOT EXISTS "public"."profile" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" text NOT NULL,
    "avatar_id" "uuid",
    "birthday" date,
    "liked_food" text[],
    "disliked_food" text[],
    "is_primary" boolean DEFAULT false NOT NULL,
    -- Physical Stats
    "weight_lb" decimal(5,2),
    "height_in" decimal(4,1),
    "gender" "public"."gender_enum",
    "activity_level" "public"."activity_level_enum",
    -- Nutrition Goals
    "calorie_target_type" "public"."calorie_target_type_enum",
    "daily_calorie_goal" integer,
    "goal_lbs_per_week" decimal(2,1),
    "protein_grams" integer,
    "carbs_grams" integer,
    "fat_grams" integer,
    -- Timestamps
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."profile" OWNER TO "postgres";

-- Add primary key constraint
ALTER TABLE ONLY "public"."profile"
    ADD CONSTRAINT "profile_pkey" PRIMARY KEY ("id");

-- Add partial unique index to ensure only one primary profile per user
CREATE UNIQUE INDEX "profile_user_id_primary_unique" ON "public"."profile" ("user_id") WHERE "is_primary" = true;

-- Add foreign key constraint
ALTER TABLE ONLY "public"."profile"
    ADD CONSTRAINT "profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Add constraint to validate macros match calories (within 100 calorie tolerance)
ALTER TABLE ONLY "public"."profile"
    ADD CONSTRAINT "macros_match_calories" CHECK (
        (protein_grams IS NULL AND carbs_grams IS NULL AND fat_grams IS NULL) OR
        (daily_calorie_goal IS NULL) OR
        abs((COALESCE(protein_grams, 0) * 4 + COALESCE(carbs_grams, 0) * 4 + COALESCE(fat_grams, 0) * 9)) <= (daily_calorie_goal + 100)
    );

-- Add indexes for better query performance
CREATE INDEX "profile_is_primary_key" ON "public"."profile" USING "btree" ("is_primary");
CREATE INDEX "profile_user_id_key" ON "public"."profile" USING "btree" ("user_id");

-- Enable Row Level Security
ALTER TABLE "public"."profile" ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for profile
CREATE POLICY "Enable access to data owners" ON "public"."profile" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

-- Grant permissions
GRANT ALL ON TABLE "public"."profile" TO "anon";
GRANT ALL ON TABLE "public"."profile" TO "authenticated";
GRANT ALL ON TABLE "public"."profile" TO "service_role";