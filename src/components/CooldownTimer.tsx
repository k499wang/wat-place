"use client";

interface CooldownTimerProps {
  remainingSeconds: number;
  totalSeconds: number;
}

export default function CooldownTimer({
  remainingSeconds,
  totalSeconds,
}: CooldownTimerProps) {
  const progress = ((totalSeconds - remainingSeconds) / totalSeconds) * 100;

  if (remainingSeconds <= 0) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-green-400 text-sm font-medium">Ready</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 min-w-[160px]">
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-[var(--text-secondary)]">Cooldown</span>
          <span className="text-[var(--text-primary)] font-mono">{remainingSeconds}s</span>
        </div>
        <div className="h-1.5 bg-[var(--background)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--accent)] transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
