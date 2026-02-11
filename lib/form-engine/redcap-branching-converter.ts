/**
 * Converts REDCap branching logic to filtrex expression syntax.
 *
 * REDCap branching syntax differences from filtrex:
 * - [field] → {field}
 * - = → ==
 * - <> → !=
 * - [checkbox(code)]='1' → "code" in {checkbox}
 * - Single quotes → double quotes for string literals
 * - OR/AND → or/and (case insensitive, filtrex uses lowercase)
 */

export function convertRedcapBranching(expr: string): string {
  if (!expr || !expr.trim()) return ''

  let result = expr.trim()

  // Handle checkbox references: [checkbox(code)]='1' → "code" in {checkbox}
  result = result.replace(
    /\[(\w+)\((\w+)\)\]\s*=\s*'1'/g,
    '"$2" in {$1}'
  )
  // Handle negated checkbox: [checkbox(code)]='0' → not ("code" in {checkbox})
  result = result.replace(
    /\[(\w+)\((\w+)\)\]\s*=\s*'0'/g,
    'not ("$2" in {$1})'
  )

  // Replace [field_name] → {field_name}
  result = result.replace(/\[(\w+)\]/g, '{$1}')

  // Replace <> with !=
  result = result.replace(/<>/g, '!=')

  // Replace single = with == (but not != or >=, <=)
  result = result.replace(/(?<![!><])=(?!=)/g, '==')

  // Replace single quotes with double quotes for string values
  result = result.replace(/'([^']*)'/g, '"$1"')

  // Normalize AND/OR to lowercase
  result = result.replace(/\bAND\b/gi, 'and')
  result = result.replace(/\bOR\b/gi, 'or')
  result = result.replace(/\bNOT\b/gi, 'not')

  return result
}
