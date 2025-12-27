"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface CanvasConfig {
  width: number;
  height: number;
  cooldown_seconds: number;
}

interface PixelUpdate {
  x: number;
  y: number;
  color: string;
}

interface PixelToPlace {
  x: number;
  y: number;
  color: string;
}

export function useCanvas() {
  const [pixels, setPixels] = useState<Map<string, string>>(new Map());
  const [config, setConfig] = useState<CanvasConfig>({
    width: 1000,
    height: 1000,
    cooldown_seconds: 30,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Load initial canvas state
  const loadCanvas = useCallback(async () => {
    try {
      setLoading(true);

      // Load canvas config
      const { data: configData, error: configError } = await supabase
        .from("canvas_config")
        .select("*")
        .single();

      if (configError) {
        console.warn("Could not load config, using defaults:", configError.message);
      } else if (configData) {
        setConfig(configData);
      }

      // Load all pixels
      const { data: pixelsData, error: pixelsError } = await supabase
        .from("pixels")
        .select("x, y, color");

      if (pixelsError) {
        console.warn("Could not load pixels:", pixelsError.message);
      }

      const pixelMap = new Map<string, string>();
      pixelsData?.forEach((pixel) => {
        pixelMap.set(`${pixel.x},${pixel.y}`, pixel.color);
      });

      setPixels(pixelMap);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load canvas");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Subscribe to real-time updates
  useEffect(() => {
    loadCanvas();

    let channel: RealtimeChannel;

    const setupRealtime = () => {
      channel = supabase
        .channel("pixels-channel")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "pixels",
          },
          (payload) => {
            if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
              const { x, y, color } = payload.new as PixelUpdate;
              setPixels((prev) => {
                const next = new Map(prev);
                next.set(`${x},${y}`, color);
                return next;
              });
            }
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase, loadCanvas]);

  // Place multiple pixels using the secure server-side function
  const placePixels = useCallback(
    async (pixelsToPlace: PixelToPlace[]) => {
      try {
        // Call the secure PostgreSQL function
        const { data, error: rpcError } = await supabase.rpc("place_pixels", {
          pixel_data: pixelsToPlace,
        });

        if (rpcError) {
          throw rpcError;
        }

        // The function returns { success: boolean, error?: string, pixels_placed?: number }
        if (!data.success) {
          return { success: false, error: data.error || "Failed to place pixels" };
        }

        // Optimistically update the local state (realtime will also update)
        setPixels((prev) => {
          const next = new Map(prev);
          pixelsToPlace.forEach((p) => {
            next.set(`${p.x},${p.y}`, p.color);
          });
          return next;
        });

        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to place pixels";
        return { success: false, error: message };
      }
    },
    [supabase]
  );

  return {
    pixels,
    config,
    loading,
    error,
    placePixels,
    refresh: loadCanvas,
  };
}
