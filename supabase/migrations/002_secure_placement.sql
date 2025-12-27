-- SECURE PIXEL PLACEMENT
-- This migration removes direct write access and creates a secure function
-- Run this AFTER 001_initial.sql

-- Drop existing unsafe policies
DROP POLICY IF EXISTS "Authenticated users can insert pixels" ON pixels;
DROP POLICY IF EXISTS "Authenticated users can update pixels" ON pixels;
DROP POLICY IF EXISTS "Authenticated users can insert pixel history" ON pixel_history;
DROP POLICY IF EXISTS "Users can insert their own cooldown" ON user_cooldowns;
DROP POLICY IF EXISTS "Users can update their own cooldown" ON user_cooldowns;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS place_pixels(JSONB);
DROP FUNCTION IF EXISTS public.place_pixels(JSONB);

-- Create the secure pixel placement function in public schema
CREATE OR REPLACE FUNCTION public.place_pixels(pixel_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_cooldown_seconds INTEGER;
  v_last_placement TIMESTAMP WITH TIME ZONE;
  v_seconds_since_last NUMERIC;
  v_remaining_seconds INTEGER;
  v_pixel JSONB;
  v_canvas_w INTEGER;
  v_canvas_h INTEGER;
  v_pixels_placed INTEGER := 0;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- Verify email domain
  IF v_user_email IS NULL OR NOT v_user_email LIKE '%@uwaterloo.ca' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only @uwaterloo.ca emails are allowed');
  END IF;

  -- Get canvas config
  SELECT width, height, cooldown_seconds
  INTO v_canvas_w, v_canvas_h, v_cooldown_seconds
  FROM canvas_config
  WHERE id = 1;

  -- Use defaults if config not found
  IF v_cooldown_seconds IS NULL THEN
    v_cooldown_seconds := 30;
    v_canvas_w := 1000;
    v_canvas_h := 1000;
  END IF;

  -- Check cooldown
  SELECT last_pixel_at INTO v_last_placement
  FROM user_cooldowns
  WHERE user_id = v_user_id;

  IF v_last_placement IS NOT NULL THEN
    v_seconds_since_last := EXTRACT(EPOCH FROM (NOW() - v_last_placement));

    IF v_seconds_since_last < v_cooldown_seconds THEN
      v_remaining_seconds := CEIL(v_cooldown_seconds - v_seconds_since_last);
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Cooldown active. Wait ' || v_remaining_seconds || ' more seconds.'
      );
    END IF;
  END IF;

  -- Validate and place each pixel
  FOR v_pixel IN SELECT * FROM jsonb_array_elements(pixel_data)
  LOOP
    -- Validate pixel data
    IF NOT (v_pixel ? 'x' AND v_pixel ? 'y' AND v_pixel ? 'color') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid pixel data');
    END IF;

    -- Validate coordinates
    IF (v_pixel->>'x')::INTEGER < 0 OR (v_pixel->>'x')::INTEGER >= v_canvas_w OR
       (v_pixel->>'y')::INTEGER < 0 OR (v_pixel->>'y')::INTEGER >= v_canvas_h THEN
      RETURN jsonb_build_object('success', false, 'error', 'Pixel coordinates out of bounds');
    END IF;

    -- Validate color format (hex color)
    IF NOT (v_pixel->>'color' ~ '^#[0-9A-Fa-f]{6}$') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid color format');
    END IF;

    -- Limit to 10 pixels per batch
    IF v_pixels_placed >= 10 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Maximum 10 pixels per placement');
    END IF;

    -- Upsert the pixel
    INSERT INTO pixels (x, y, color, user_id, updated_at)
    VALUES (
      (v_pixel->>'x')::INTEGER,
      (v_pixel->>'y')::INTEGER,
      v_pixel->>'color',
      v_user_id,
      NOW()
    )
    ON CONFLICT (x, y) DO UPDATE SET
      color = EXCLUDED.color,
      user_id = EXCLUDED.user_id,
      updated_at = EXCLUDED.updated_at;

    -- Log to history
    INSERT INTO pixel_history (x, y, color, user_id, placed_at)
    VALUES (
      (v_pixel->>'x')::INTEGER,
      (v_pixel->>'y')::INTEGER,
      v_pixel->>'color',
      v_user_id,
      NOW()
    );

    v_pixels_placed := v_pixels_placed + 1;
  END LOOP;

  -- Update cooldown
  INSERT INTO user_cooldowns (user_id, last_pixel_at)
  VALUES (v_user_id, NOW())
  ON CONFLICT (user_id) DO UPDATE SET last_pixel_at = NOW();

  RETURN jsonb_build_object('success', true, 'pixels_placed', v_pixels_placed);
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.place_pixels(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_pixels(JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.place_pixels(JSONB) TO service_role;
