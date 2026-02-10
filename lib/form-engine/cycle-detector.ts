import type { FormSchema, Field, Section } from '@/types/form-schema'
import { extractFieldRefs } from './expression-engine'

interface DependencyEdge {
  from: string
  to: string
}

/**
 * Detects circular dependencies in form field expressions.
 * Uses Kahn's algorithm for topological sort.
 * Returns an array of error messages for any cycles found.
 */
export function detectExpressionCycles(schema: FormSchema): string[] {
  const edges: DependencyEdge[] = []
  const allFieldIds = new Set<string>()

  // Collect all field IDs and build dependency edges
  for (const page of schema.pages) {
    for (const section of page.sections) {
      collectFieldDependencies(section, allFieldIds, edges)
    }
  }

  // Build adjacency list and in-degree count
  const adjacency = new Map<string, Set<string>>()
  const inDegree = new Map<string, number>()

  for (const fieldId of allFieldIds) {
    adjacency.set(fieldId, new Set())
    inDegree.set(fieldId, 0)
  }

  for (const edge of edges) {
    // Only consider edges between known fields
    if (!allFieldIds.has(edge.from) || !allFieldIds.has(edge.to)) continue

    // Only count each edge once (Set prevents duplicates in adjacency)
    const neighbors = adjacency.get(edge.from)!
    if (!neighbors.has(edge.to)) {
      neighbors.add(edge.to)
      inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1)
    }
  }

  // Kahn's algorithm
  const queue: string[] = []
  for (const [node, degree] of inDegree) {
    if (degree === 0) queue.push(node)
  }

  let visited = 0
  while (queue.length > 0) {
    const node = queue.shift()!
    visited++

    for (const neighbor of adjacency.get(node) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1
      inDegree.set(neighbor, newDegree)
      if (newDegree === 0) queue.push(neighbor)
    }
  }

  // If not all nodes visited, there's a cycle
  if (visited < allFieldIds.size) {
    const cycleNodes = [...inDegree.entries()]
      .filter(([, degree]) => degree > 0)
      .map(([node]) => node)

    return [`Circular dependency detected involving fields: ${cycleNodes.join(', ')}`]
  }

  return []
}

function collectFieldDependencies(
  section: Section,
  allFieldIds: Set<string>,
  edges: DependencyEdge[]
) {
  for (const field of section.fields) {
    if (field.type === 'descriptive') continue

    const fieldId = section.repeatable ? `${section.id}.${field.id}` : field.id
    allFieldIds.add(fieldId)

    // Explicit dependencies
    if (field.dependsOn) {
      for (const dep of field.dependsOn) {
        edges.push({ from: dep, to: fieldId })
      }
    }

    // Expression dependencies (calculated fields)
    if (field.expression) {
      const refs = extractFieldRefs(field.expression)
      for (const ref of refs) {
        // Only local refs (no dots = same form)
        if (!ref.includes('.')) {
          edges.push({ from: ref, to: fieldId })
        }
      }
    }

    // Visibility expression dependencies
    if (typeof field.visibility === 'string') {
      const refs = extractFieldRefs(field.visibility)
      for (const ref of refs) {
        if (!ref.includes('.')) {
          edges.push({ from: ref, to: fieldId })
        }
      }
    }
  }
}
