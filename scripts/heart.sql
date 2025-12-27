-- Massive Heart for WaterlooPlace Canvas
-- Center: (500, 500), Size: ~200px wide
-- Color: Red (#FF0000)

-- Clear any existing pixels in the heart area first (optional)
-- DELETE FROM pixels WHERE x BETWEEN 350 AND 650 AND y BETWEEN 300 AND 600;

-- Insert heart pixels using the heart curve equation
-- Heart equation: (x² + y² - 1)³ - x²y³ < 0 (scaled and translated)

INSERT INTO pixels (x, y, color, user_id)
SELECT x, y, '#FF0000', '00000000-0000-0000-0000-000000000000'
FROM (
  SELECT
    cx + dx AS x,
    cy + dy AS y
  FROM
    generate_series(-100, 100) AS dx,
    generate_series(-100, 100) AS dy,
    (SELECT 500 AS cx, 480 AS cy) AS center
  WHERE
    -- Heart equation: ((x/a)² + (y/b)² - 1)³ - (x/a)²(y/b)³ < 0
    -- Scaled for pixel art
    POWER(POWER(dx::float / 80, 2) + POWER((dy::float - 20) / 80, 2) - 1, 3)
    - POWER(dx::float / 80, 2) * POWER((dy::float - 20) / 80, 3) < 0
) AS heart_pixels
ON CONFLICT (x, y) DO UPDATE SET color = EXCLUDED.color, updated_at = NOW();
