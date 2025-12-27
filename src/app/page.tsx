"use client";

import { useState, useEffect } from "react";
import Canvas from "@/components/Canvas";
import { COLORS } from "@/components/ColorPalette";
import CooldownTimer from "@/components/CooldownTimer";
import Logo from "@/components/Logo";
import { useCanvas } from "@/hooks/useCanvas";
import { useCooldown } from "@/hooks/useCooldown";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const MAX_PIXELS = 10;

interface SelectedPixel {
  x: number;
  y: number;
  color: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedColor, setSelectedColor] = useState("#E50000"); // Red default
  const [selectedPixels, setSelectedPixels] = useState<SelectedPixel[]>([]);
  const [placingPixels, setPlacingPixels] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isClosingPicker, setIsClosingPicker] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginMessage, setLoginMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supabase = createClient();
  const { pixels, config, loading, error, placePixels } = useCanvas();
  const { remainingSeconds, isOnCooldown, startCooldown } = useCooldown(config.cooldown_seconds);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setShowLoginModal(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handlePixelClick = (x: number, y: number) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (isOnCooldown) {
      setNotification({ type: "error", text: "Wait for cooldown" });
      setTimeout(() => setNotification(null), 2000);
      return;
    }

    const existingIndex = selectedPixels.findIndex(p => p.x === x && p.y === y);

    if (existingIndex !== -1) {
      setSelectedPixels(prev => prev.filter((_, i) => i !== existingIndex));
    } else if (selectedPixels.length < MAX_PIXELS) {
      setSelectedPixels(prev => [...prev, { x, y, color: selectedColor }]);
    } else {
      setNotification({ type: "error", text: `Max ${MAX_PIXELS} pixels` });
      setTimeout(() => setNotification(null), 2000);
    }
  };

  const handlePlacePixels = async () => {
    if (selectedPixels.length === 0 || isOnCooldown || placingPixels) return;

    setPlacingPixels(true);
    const result = await placePixels(selectedPixels);

    if (result.success) {
      startCooldown();
      setNotification({ type: "success", text: `Placed ${selectedPixels.length} pixel${selectedPixels.length > 1 ? 's' : ''}` });
      setSelectedPixels([]);
    } else {
      setNotification({ type: "error", text: result.error || "Failed" });
    }

    setTimeout(() => setNotification(null), 2000);
    setPlacingPixels(false);
  };

  const handleClear = () => {
    setIsClosingPicker(true);
    setTimeout(() => {
      setSelectedPixels([]);
      setIsClosingPicker(false);
    }, 250);
  };

  const handleRemovePixel = (index: number) => {
    setSelectedPixels(prev => prev.filter((_, i) => i !== index));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginMessage(null);

    if (!loginEmail.endsWith("@uwaterloo.ca")) {
      setLoginMessage({ type: "error", text: "Only @uwaterloo.ca emails" });
      setLoginLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: loginEmail,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setLoginMessage({ type: "error", text: error.message });
    } else {
      setLoginMessage({ type: "success", text: "Check your email!" });
    }
    setLoginLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSelectedPixels([]);
  };

  const selectedPixelMap = new Map<string, string>();
  selectedPixels.forEach(p => selectedPixelMap.set(`${p.x},${p.y}`, p.color));

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[var(--background)]">
        <Logo size={48} className="mb-4 animate-pulse" />
        <p className="text-[var(--text-secondary)] text-xs">Loading canvas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--background)]">
        <div className="panel p-6 text-center">
          <Logo size={40} className="mx-auto mb-4" />
          <p className="text-red-400 mb-4 text-sm">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[var(--background)]">
      <Canvas
        pixels={pixels}
        selectedColor={selectedColor}
        selectedPixels={selectedPixelMap}
        onPixelClick={handlePixelClick}
        canvasWidth={config.width}
        canvasHeight={config.height}
      />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between pointer-events-none">
        <div className="panel px-2.5 py-1.5 pointer-events-auto">
          <Logo size={28} showText />
        </div>

        <div className="pointer-events-auto">
          {user ? (
            <div className="panel px-3 py-2 flex items-center gap-3">
              <span className="text-xs text-[var(--text-secondary)] hidden sm:block">
                {user.email?.split('@')[0]}
              </span>
              <button
                onClick={handleSignOut}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button onClick={() => setShowLoginModal(true)} className="btn-primary">
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Toast */}
      {notification && (
        <div
          className={`absolute top-16 left-1/2 -translate-x-1/2 panel px-4 py-2 text-sm animate-fade-in ${
            notification.type === "success" ? "text-green-400" : "text-red-400"
          }`}
        >
          {notification.text}
        </div>
      )}

      {/* Cooldown */}
      {user && isOnCooldown && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 panel p-4 animate-fade-in">
          <CooldownTimer remainingSeconds={remainingSeconds} totalSeconds={config.cooldown_seconds} />
        </div>
      )}

      {/* Color Picker Panel */}
      {(selectedPixels.length > 0 || isClosingPicker) && (
        <div className={`absolute bottom-0 left-0 right-0 ${isClosingPicker ? 'animate-slide-down' : 'animate-slide-up'}`}>
          <div className="max-w-lg mx-auto p-3">
            <div className="panel p-4">
              {/* Selected pixels row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-secondary)]">
                    {selectedPixels.length}/{MAX_PIXELS}
                  </span>
                  <div className="flex gap-1">
                    {selectedPixels.map((pixel, index) => (
                      <button
                        key={`${pixel.x}-${pixel.y}`}
                        onClick={() => handleRemovePixel(index)}
                        className="w-6 h-6 rounded border border-[var(--border)] hover:border-red-500 transition-colors relative group"
                        style={{ backgroundColor: pixel.color }}
                      >
                        <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/60 text-white text-xs rounded">
                          ×
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleClear}
                  className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Clear
                </button>
              </div>

              {/* Color palette */}
              <div className="flex flex-wrap gap-1.5 justify-center mb-4">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`color-swatch ${selectedColor === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                {/* Custom color picker */}
                <label
                  className={`color-swatch relative cursor-pointer overflow-hidden ${
                    !COLORS.includes(selectedColor) ? 'selected' : ''
                  }`}
                  style={{
                    background: !COLORS.includes(selectedColor)
                      ? selectedColor
                      : 'conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)'
                  }}
                  title="Custom color"
                >
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value.toUpperCase())}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </label>
              </div>

              {/* Place button */}
              <button
                onClick={handlePlacePixels}
                disabled={placingPixels || !user}
                className="btn-primary w-full py-2.5"
              >
                {!user
                  ? "Sign in to place"
                  : placingPixels
                    ? "Placing..."
                    : `Place ${selectedPixels.length} pixel${selectedPixels.length > 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="panel p-5 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <Logo size={32} showText />
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setLoginMessage(null);
                  setLoginEmail("");
                }}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xl leading-none"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Sign in with your UWaterloo email
            </p>

            <form onSubmit={handleLogin} className="space-y-3">
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="userid@uwaterloo.ca"
                required
                className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
              />

              <button type="submit" disabled={loginLoading} className="btn-primary w-full py-2.5">
                {loginLoading ? "Sending..." : "Send Magic Link"}
              </button>
            </form>

            {loginMessage && (
              <div
                className={`mt-3 p-2.5 rounded-lg text-xs ${
                  loginMessage.type === "success"
                    ? "bg-green-900/30 text-green-400 border border-green-800"
                    : "bg-red-900/30 text-red-400 border border-red-800"
                }`}
              >
                {loginMessage.text}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
