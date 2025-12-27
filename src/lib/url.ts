/**
 * Get the site URL dynamically
 * - Client-side: Uses window.location.origin
 * - Server-side: Falls back to NEXT_PUBLIC_SITE_URL or localhost
 */
export function getSiteUrl(): string {
  // Client-side: use the current browser URL
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  // Server-side: check for Vercel deployment URL first
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // Fall back to the configured site URL or localhost
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}
