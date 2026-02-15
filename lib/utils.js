/**
 * Shared Utilities for Port Daddy
 */

/**
 * Parse expiration string to milliseconds
 * Examples: "1h", "30m", "2h30m", "1d"
 * @param {string|number} str - Duration string or milliseconds
 * @returns {number|null} Duration in milliseconds or null if invalid
 */
export function parseExpires(str) {
  if (typeof str === 'number') return str;

  // Security: Limit string length to prevent ReDoS
  if (typeof str !== 'string' || str.length > 50) return null;

  const units = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  let total = 0;
  const regex = /(\d+)([smhd])/g;
  let match;

  while ((match = regex.exec(str)) !== null) {
    const value = parseInt(match[1], 10);
    const unit = match[2];
    total += value * units[unit];
  }

  return total || null;
}

/**
 * Try to parse JSON, return original string if not JSON
 * @param {string} str - String to parse
 * @returns {any} Parsed JSON or original string
 */
export function tryParseJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}
