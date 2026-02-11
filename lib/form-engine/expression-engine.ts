import { compileExpression } from 'filtrex'

const MAX_EXPRESSION_LENGTH = 500

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ALLOWED_FUNCTIONS: Record<string, (...args: any[]) => any> = {
  round: (v: number, d = 0) => {
    const f = Math.pow(10, d)
    return Math.round(v * f) / f
  },
  floor: Math.floor,
  ceil: Math.ceil,
  abs: Math.abs,
  min: Math.min,
  max: Math.max,
  sqrt: Math.sqrt,
  pow: Math.pow,
  lower: (s: unknown) => String(s).toLowerCase(),
  upper: (s: unknown) => String(s).toUpperCase(),
  length: (s: unknown) => (typeof s === 'string' ? s.length : Array.isArray(s) ? s.length : 0),
  if: (cond: unknown, a: unknown, b: unknown) => (cond ? a : b),
}

// Match {fieldId} or {formSlug.fieldId} references in expressions
const FIELD_REF_REGEX = /\{([a-z][a-z0-9_.]*)\}/g

/**
 * Resolves {fieldId} placeholders in an expression to variable names
 * that filtrex can evaluate.
 */
export function resolveFieldRefs(expression: string): {
  resolved: string
  fieldRefs: string[]
} {
  const fieldRefs: string[] = []
  const resolved = expression.replace(FIELD_REF_REGEX, (_, ref: string) => {
    fieldRefs.push(ref)
    // Replace dots with double underscores for filtrex variable names
    return ref.replace(/\./g, '__')
  })
  return { resolved, fieldRefs }
}

/**
 * Builds the data context for expression evaluation.
 * Maps field references to their values.
 */
export function buildExpressionContext(
  data: Record<string, unknown>,
  crossFormData?: Record<string, Record<string, unknown>>
): Record<string, unknown> {
  const context: Record<string, unknown> = { ...data }

  if (crossFormData) {
    for (const [formSlug, formData] of Object.entries(crossFormData)) {
      for (const [fieldId, value] of Object.entries(formData)) {
        context[`${formSlug}__${fieldId}`] = value
      }
    }
  }

  return context
}

/**
 * Compiles and evaluates a filtrex expression with field data.
 * Returns the result or null if evaluation fails.
 * Enforces a timeout for safety.
 */
export function evaluateExpression(
  expression: string,
  data: Record<string, unknown>,
  crossFormData?: Record<string, Record<string, unknown>>
): unknown {
  if (!expression || expression.length > MAX_EXPRESSION_LENGTH) {
    return null
  }

  try {
    const { resolved } = resolveFieldRefs(expression)
    const context = buildExpressionContext(data, crossFormData)

    const fn = compileExpression(resolved, {
      extraFunctions: ALLOWED_FUNCTIONS as Record<string, Function>,
    })

    const result = fn(context)
    return result
  } catch {
    return null
  }
}

/**
 * Evaluates a boolean expression (for visibility, validation, etc.)
 */
export function evaluateBooleanExpression(
  expression: string,
  data: Record<string, unknown>,
  crossFormData?: Record<string, Record<string, unknown>>
): boolean {
  const result = evaluateExpression(expression, data, crossFormData)
  return Boolean(result)
}

/**
 * Extract all field references from an expression.
 */
export function extractFieldRefs(expression: string): string[] {
  const { fieldRefs } = resolveFieldRefs(expression)
  return fieldRefs
}
