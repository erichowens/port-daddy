/**
 * Shared Utilities for Port Daddy
 */

type TimeUnit = 's' | 'm' | 'h' | 'd';

const UNITS: Record<TimeUnit, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000
} as const;

/**
 * Parse expiration string to milliseconds
 * Examples: "1h", "30m", "2h30m", "1d"
 */
export function parseExpires(str: string | number): number | null {
  if (typeof str === 'number') return str;

  // Security: Limit string length to prevent ReDoS
  if (typeof str !== 'string' || str.length > 50) return null;

  let total = 0;
  const regex = /(\d+)([smhd])/g;
  let match;

  while ((match = regex.exec(str)) !== null) {
    const value = parseInt(match[1], 10);
    const unit = match[2] as TimeUnit;
    total += value * UNITS[unit];
  }

  return total || null;
}

/**
 * Try to parse JSON, return original string if not JSON
 */
export function tryParseJson(str: string): unknown {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}
