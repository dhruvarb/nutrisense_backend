-- 1. Users Table (Stores onboarding info)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  name TEXT,
  age INT,
  height DECIMAL,
  weight DECIMAL,
  diet_type TEXT,
  lifestyle TEXT[],
  allergies TEXT[],
  goals TEXT[],
  activity_level TEXT,
  sleep_quality TEXT,
  water_intake DECIMAL,
  medical_conditions TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Blood Reports Table
CREATE TABLE reports (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  hb TEXT,
  vitamin_d TEXT,
  iron TEXT,
  deficiencies JSONB,
  ai_analysis TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Meals Table
CREATE TABLE meals (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  food_name TEXT,
  calories INT,
  protein INT,
  clinical_advice TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
