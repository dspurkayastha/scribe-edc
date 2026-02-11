import { z } from 'zod'

/**
 * Permissive UUID schema that accepts any 8-4-4-4-12 hex string.
 * Zod 4's z.string().uuid() enforces strict RFC 4122 (version + variant bits),
 * which rejects non-standard UUIDs like those from seed data.
 */
export const zUUID = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  'Invalid UUID'
)
