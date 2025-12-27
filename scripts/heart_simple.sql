-- Massive Heart for WaterlooPlace Canvas
-- Run this in your Supabase SQL Editor

-- First, you may need to temporarily disable RLS or use a service role key
-- ALTER TABLE pixels DISABLE ROW LEVEL SECURITY;

-- Generate and insert heart pixels
-- Center: (500, 450), approximately 200px wide, red color

DO $$
DECLARE
  dx INT;
  dy INT;
  cx INT := 500;  -- center X
  cy INT := 450;  -- center Y
  scale FLOAT := 80;  -- size multiplier
  nx FLOAT;
  ny FLOAT;
  heart_val FLOAT;
BEGIN
  FOR dx IN -100..100 LOOP
    FOR dy IN -100..100 LOOP
      nx := dx::float / scale;
      ny := (dy::float - 20) / scale;

      -- Heart equation: (x² + y² - 1)³ - x²y³ < 0
      heart_val := POWER(POWER(nx, 2) + POWER(ny, 2) - 1, 3) - POWER(nx, 2) * POWER(ny, 3);

      IF heart_val < 0 THEN
        INSERT INTO pixels (x, y, color)
        VALUES (cx + dx, cy + dy, '#FF0000')
        ON CONFLICT (x, y) DO UPDATE SET color = '#FF0000', updated_at = NOW();
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Re-enable RLS if you disabled it
-- ALTER TABLE pixels ENABLE ROW LEVEL SECURITY;

-- Verify: Count heart pixels
SELECT COUNT(*) as heart_pixels FROM pixels WHERE color = '#FF0000';
