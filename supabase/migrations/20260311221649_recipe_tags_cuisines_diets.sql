-- Fixed lookup tables (seeded by the app, not user-editable)
CREATE TABLE IF NOT EXISTS "public"."cuisines" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE  -- e.g. 'Chinese', 'Italian'
);

ALTER TABLE "public"."cuisines" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."diets" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE  -- e.g. 'gluten free', 'vegan'
);

ALTER TABLE "public"."diets" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."dish_types" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE  -- e.g. 'main dish', 'dessert'
);

ALTER TABLE "public"."dish_types" OWNER TO "postgres";

-- User-generated tags (created on demand)
CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    UNIQUE("name", "user_id")  -- unique per user
);

ALTER TABLE "public"."tags" OWNER TO "postgres";

-- Junction tables
CREATE TABLE IF NOT EXISTS "public"."recipe_cuisines" (
    "recipe_id" UUID NOT NULL REFERENCES "public"."recipe"("id") ON DELETE CASCADE,
    "cuisine_id" INTEGER NOT NULL REFERENCES "public"."cuisines"("id") ON DELETE CASCADE,
    PRIMARY KEY ("recipe_id", "cuisine_id")
);

ALTER TABLE "public"."recipe_cuisines" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."recipe_diets" (
    "recipe_id" UUID NOT NULL REFERENCES "public"."recipe"("id") ON DELETE CASCADE,
    "diet_id" INTEGER NOT NULL REFERENCES "public"."diets"("id") ON DELETE CASCADE,
    PRIMARY KEY ("recipe_id", "diet_id")
);

ALTER TABLE "public"."recipe_diets" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."recipe_dish_types" (
    "recipe_id" UUID NOT NULL REFERENCES "public"."recipe"("id") ON DELETE CASCADE,
    "dish_type_id" INTEGER NOT NULL REFERENCES "public"."dish_types"("id") ON DELETE CASCADE,
    PRIMARY KEY ("recipe_id", "dish_type_id")
);

ALTER TABLE "public"."recipe_dish_types" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."recipe_tags" (
    "recipe_id" UUID NOT NULL REFERENCES "public"."recipe"("id") ON DELETE CASCADE,
    "tag_id" INTEGER NOT NULL REFERENCES "public"."tags"("id") ON DELETE CASCADE,
    PRIMARY KEY ("recipe_id", "tag_id")
);

ALTER TABLE "public"."recipe_tags" OWNER TO "postgres";

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_recipe_cuisines_recipe_id" ON "public"."recipe_cuisines"("recipe_id");
CREATE INDEX IF NOT EXISTS "idx_recipe_cuisines_cuisine_id" ON "public"."recipe_cuisines"("cuisine_id");
CREATE INDEX IF NOT EXISTS "idx_recipe_diets_recipe_id" ON "public"."recipe_diets"("recipe_id");
CREATE INDEX IF NOT EXISTS "idx_recipe_diets_diet_id" ON "public"."recipe_diets"("diet_id");
CREATE INDEX IF NOT EXISTS "idx_recipe_dish_types_recipe_id" ON "public"."recipe_dish_types"("recipe_id");
CREATE INDEX IF NOT EXISTS "idx_recipe_dish_types_dish_type_id" ON "public"."recipe_dish_types"("dish_type_id");
CREATE INDEX IF NOT EXISTS "idx_recipe_tags_recipe_id" ON "public"."recipe_tags"("recipe_id");
CREATE INDEX IF NOT EXISTS "idx_recipe_tags_tag_id" ON "public"."recipe_tags"("tag_id");

-- Enable Row Level Security on all tables
ALTER TABLE "public"."cuisines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."diets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."dish_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."recipe_cuisines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."recipe_diets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."recipe_dish_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."recipe_tags" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cuisines (read-only for all authenticated users)
CREATE POLICY "Allow all authenticated users to read cuisines"
    ON "public"."cuisines"
    FOR SELECT
    TO authenticated
    USING (true);

-- RLS Policies for diets (read-only for all authenticated users)
CREATE POLICY "Allow all authenticated users to read diets"
    ON "public"."diets"
    FOR SELECT
    TO authenticated
    USING (true);

-- RLS Policies for dish_types (read-only for all authenticated users)
CREATE POLICY "Allow all authenticated users to read dish_types"
    ON "public"."dish_types"
    FOR SELECT
    TO authenticated
    USING (true);

-- RLS Policies for tags (read for all, insert/update for authenticated)
CREATE POLICY "Allow all authenticated users to read tags"
    ON "public"."tags"
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Allow authenticated users to create tags"
    ON "public"."tags"
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow authenticated users to delete their own tags"
    ON "public"."tags"
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- RLS Policies for recipe_cuisines (users can manage their own recipes' cuisines)
CREATE POLICY "Users can view recipe cuisines for accessible recipes"
    ON "public"."recipe_cuisines"
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "public"."recipe" r
            WHERE r.id = recipe_id
            AND (r.user_id = auth.uid() OR r.visibility = 'public')
        )
    );

CREATE POLICY "Users can insert recipe cuisines for their own recipes"
    ON "public"."recipe_cuisines"
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "public"."recipe" r
            WHERE r.id = recipe_id
            AND r.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete recipe cuisines for their own recipes"
    ON "public"."recipe_cuisines"
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "public"."recipe" r
            WHERE r.id = recipe_id
            AND r.user_id = auth.uid()
        )
    );

-- RLS Policies for recipe_diets (users can manage their own recipes' diets)
CREATE POLICY "Users can view recipe diets for accessible recipes"
    ON "public"."recipe_diets"
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "public"."recipe" r
            WHERE r.id = recipe_id
            AND (r.user_id = auth.uid() OR r.visibility = 'public')
        )
    );

CREATE POLICY "Users can insert recipe diets for their own recipes"
    ON "public"."recipe_diets"
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "public"."recipe" r
            WHERE r.id = recipe_id
            AND r.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete recipe diets for their own recipes"
    ON "public"."recipe_diets"
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "public"."recipe" r
            WHERE r.id = recipe_id
            AND r.user_id = auth.uid()
        )
    );

-- RLS Policies for recipe_dish_types (users can manage their own recipes' dish types)
CREATE POLICY "Users can view recipe dish_types for accessible recipes"
    ON "public"."recipe_dish_types"
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "public"."recipe" r
            WHERE r.id = recipe_id
            AND (r.user_id = auth.uid() OR r.visibility = 'public')
        )
    );

CREATE POLICY "Users can insert recipe dish_types for their own recipes"
    ON "public"."recipe_dish_types"
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "public"."recipe" r
            WHERE r.id = recipe_id
            AND r.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete recipe dish_types for their own recipes"
    ON "public"."recipe_dish_types"
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "public"."recipe" r
            WHERE r.id = recipe_id
            AND r.user_id = auth.uid()
        )
    );

-- RLS Policies for recipe_tags (users can manage their own recipes' tags)
CREATE POLICY "Users can view recipe tags for accessible recipes"
    ON "public"."recipe_tags"
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "public"."recipe" r
            WHERE r.id = recipe_id
            AND (r.user_id = auth.uid() OR r.visibility = 'public')
        )
    );

CREATE POLICY "Users can insert recipe tags for their own recipes"
    ON "public"."recipe_tags"
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "public"."recipe" r
            WHERE r.id = recipe_id
            AND r.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete recipe tags for their own recipes"
    ON "public"."recipe_tags"
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "public"."recipe" r
            WHERE r.id = recipe_id
            AND r.user_id = auth.uid()
        )
    );

-- Seed supported cuisines
INSERT INTO "public"."cuisines" ("name") VALUES
    ('African'),
    ('Asian'),
    ('American'),
    ('British'),
    ('Cajun'),
    ('Caribbean'),
    ('Chinese'),
    ('Eastern European'),
    ('European'),
    ('French'),
    ('German'),
    ('Greek'),
    ('Indian'),
    ('Irish'),
    ('Italian'),
    ('Japanese'),
    ('Jewish'),
    ('Korean'),
    ('Latin American'),
    ('Mediterranean'),
    ('Mexican'),
    ('Middle Eastern'),
    ('Nordic'),
    ('Southern'),
    ('Spanish'),
    ('Thai'),
    ('Vietnamese')
ON CONFLICT ("name") DO NOTHING;

-- Seed supported diets
INSERT INTO "public"."diets" ("name") VALUES
    ('vegan'),
    ('vegetarian'),
    ('gluten free'),
    ('dairy free')
ON CONFLICT ("name") DO NOTHING;

-- Seed supported dish types
INSERT INTO "public"."dish_types" ("name") VALUES
    ('main dish'),
    ('side dish'),
    ('dessert'),
    ('breakfast'),
    ('lunch'),
    ('dinner'),
    ('snack')
ON CONFLICT ("name") DO NOTHING;
