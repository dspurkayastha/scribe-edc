import safe from 'safe-regex2'

const MAX_PATTERN_LENGTH = 200

/**
 * Check if a regex pattern is vulnerable to ReDoS.
 * Returns true if the pattern is potentially dangerous.
 */
export function isReDoSVulnerable(pattern: string): boolean {
  if (pattern.length > MAX_PATTERN_LENGTH) return true

  try {
    // safe-regex2 returns true if safe, false if potentially dangerous
    return !safe(pattern)
  } catch {
    // If we can't analyze it, consider it dangerous
    return true
  }
}

/**
 * Validate a regex pattern for safety.
 * Returns error message or null if safe.
 */
export function validateRegexPattern(pattern: string): string | null {
  if (pattern.length > MAX_PATTERN_LENGTH) {
    return `Pattern too long (max ${MAX_PATTERN_LENGTH} characters)`
  }

  try {
    new RegExp(pattern)
  } catch (e) {
    return `Invalid regex: ${e instanceof Error ? e.message : 'Unknown error'}`
  }

  if (isReDoSVulnerable(pattern)) {
    return 'Pattern is vulnerable to ReDoS attacks'
  }

  return null
}
