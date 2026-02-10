import { compileExpression } from 'filtrex'
import { resolveFieldRefs } from './expression-engine'

const MAX_EXPRESSION_LENGTH = 500
const MAX_NESTING_DEPTH = 10

/**
 * Validates an expression for safety before saving to database.
 * Returns array of error messages (empty if valid).
 */
export function validateExpression(expression: string): string[] {
  const errors: string[] = []

  if (!expression || typeof expression !== 'string') {
    errors.push('Expression is required')
    return errors
  }

  // Length check
  if (expression.length > MAX_EXPRESSION_LENGTH) {
    errors.push(`Expression exceeds maximum length of ${MAX_EXPRESSION_LENGTH} characters`)
    return errors
  }

  // Nesting depth check
  let maxDepth = 0
  let currentDepth = 0
  for (const char of expression) {
    if (char === '(') {
      currentDepth++
      maxDepth = Math.max(maxDepth, currentDepth)
    } else if (char === ')') {
      currentDepth--
    }
  }
  if (maxDepth > MAX_NESTING_DEPTH) {
    errors.push(`Expression nesting depth exceeds maximum of ${MAX_NESTING_DEPTH}`)
  }

  // Unbalanced parentheses
  if (currentDepth !== 0) {
    errors.push('Unbalanced parentheses')
  }

  // Try to compile (catches syntax errors)
  try {
    const { resolved } = resolveFieldRefs(expression)
    compileExpression(resolved)
  } catch (e) {
    errors.push(`Invalid expression syntax: ${e instanceof Error ? e.message : 'Unknown error'}`)
  }

  return errors
}
