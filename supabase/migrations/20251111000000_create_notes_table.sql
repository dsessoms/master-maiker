-- Create note_type enum
CREATE TYPE note_type AS ENUM('day_meal', 'food_entry');

-- Create note table
CREATE TABLE note (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_type note_type NOT NULL,
  
  -- Context fields (mutually exclusive based on note_type)
  date DATE,
  meal_type meal_type_enum, -- Using existing meal_type_enum
  food_entry_id uuid REFERENCES food_entry(id) ON DELETE CASCADE,
  
  -- Note content
  value TEXT NOT NULL,
  is_checkbox BOOLEAN NOT NULL DEFAULT FALSE,
  is_checked BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Metadata
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraints to enforce data integrity
  CONSTRAINT valid_day_meal_note 
    CHECK (
      (note_type = 'day_meal' AND date IS NOT NULL AND meal_type IS NOT NULL AND food_entry_id IS NULL)
      OR
      (note_type = 'food_entry' AND food_entry_id IS NOT NULL AND date IS NULL AND meal_type IS NULL)
    )
);

-- Indexes for efficient querying
CREATE INDEX idx_note_user_date ON note(user_id, date) WHERE note_type = 'day_meal';
CREATE INDEX idx_note_food_entry ON note(food_entry_id) WHERE note_type = 'food_entry';
CREATE INDEX idx_note_user_date_range ON note(user_id, date) WHERE date IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE note ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own notes
CREATE POLICY "Enable access to data owners" ON note
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON TABLE note TO anon;
GRANT ALL ON TABLE note TO authenticated;
GRANT ALL ON TABLE note TO service_role;
