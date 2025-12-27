"use client";

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export default function Logo({ size = 32, showText = false, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background rounded square */}
        <rect width="32" height="32" rx="6" fill="#ffd54f" />

        {/* Pixel grid pattern forming a "W" */}
        {/* Row 1 */}
        <rect x="4" y="6" width="4" height="4" fill="#0a0a0a" />
        <rect x="24" y="6" width="4" height="4" fill="#0a0a0a" />

        {/* Row 2 */}
        <rect x="4" y="10" width="4" height="4" fill="#0a0a0a" />
        <rect x="24" y="10" width="4" height="4" fill="#0a0a0a" />

        {/* Row 3 */}
        <rect x="4" y="14" width="4" height="4" fill="#0a0a0a" />
        <rect x="14" y="14" width="4" height="4" fill="#0a0a0a" />
        <rect x="24" y="14" width="4" height="4" fill="#0a0a0a" />

        {/* Row 4 */}
        <rect x="6" y="18" width="4" height="4" fill="#0a0a0a" />
        <rect x="12" y="18" width="4" height="4" fill="#0a0a0a" />
        <rect x="16" y="18" width="4" height="4" fill="#0a0a0a" />
        <rect x="22" y="18" width="4" height="4" fill="#0a0a0a" />

        {/* Row 5 */}
        <rect x="8" y="22" width="4" height="4" fill="#0a0a0a" />
        <rect x="20" y="22" width="4" height="4" fill="#0a0a0a" />
      </svg>

      {showText && (
        <span className="font-bold tracking-tight">
          <span className="text-[var(--accent)]">wat</span>
          <span className="text-[var(--text-primary)]">place</span>
        </span>
      )}
    </div>
  );
}
