INSERT INTO "public"."dish_types" ("name") VALUES
    -- meal roles
    ('breakfast'), ('brunch'), ('lunch'), ('dinner'), ('snack'),
    ('dessert'), ('appetizer'), ('side dish'), ('main dish'), ('beverage'),

    -- cooking style / effort
    ('quick'),           -- under 30 min
    ('one-pot'),
    ('meal-prep'),
    ('batch-cook'),
    ('slow-cook'),
    ('no-cook'),
    ('make-ahead'),

    -- occasion / vibe
    ('weeknight'),
    ('weekend'),
    ('comfort-food'),
    ('light'),
    ('crowd-pleaser'),
    ('date-night'),
    ('kid-friendly'),
    ('budget-friendly'),

    -- format (only ones that genuinely drive search)
    ('soup'),
    ('salad'),
    ('sandwich'),
    ('wrap'),
    ('bowl'),
    ('pasta'),
    ('smoothie')

ON CONFLICT ("name") DO NOTHING;

INSERT INTO public.diets ("name") VALUES
    ('vegan'),          
    ('vegetarian'),     
    ('gluten free'),    
    ('dairy free'),     
    ('nut free'),
    ('pescatarian'),
    ('paleo'),
    ('high-protein'),
    ('low-calorie'),
    ('low-carb'),
    ('low-fat'),
    ('keto')
ON CONFLICT ("name") DO NOTHING;