'use client'

import { useCallback, useMemo } from 'react'
import { useWatch } from 'react-hook-form'
import type { FormSchema, Field } from '@/types/form-schema'
import { evaluateExpression, evaluateBooleanExpression } from '@/lib/form-engine/expression-engine'

/**
 * Hook that evaluates visibility expressions and calculated fields
 * based on current form data.
 */
export function useExpressionEvaluator(schema: FormSchema) {
  const formData = useWatch() as Record<string, unknown>

  const isFieldVisible = useCallback(
    (field: Field): boolean => {
      if (!field.visibility || typeof field.visibility !== 'string') return true
      return evaluateBooleanExpression(field.visibility, formData)
    },
    [formData]
  )

  const isSectionVisible = useCallback(
    (visibility?: string): boolean => {
      if (!visibility) return true
      return evaluateBooleanExpression(visibility, formData)
    },
    [formData]
  )

  const isPageVisible = useCallback(
    (visibility?: string): boolean => {
      if (!visibility) return true
      return evaluateBooleanExpression(visibility, formData)
    },
    [formData]
  )

  const getCalculatedValue = useCallback(
    (field: Field): unknown => {
      if (field.type !== 'calculated' || !field.expression) return undefined
      return evaluateExpression(field.expression, formData)
    },
    [formData]
  )

  const isFieldRequired = useCallback(
    (field: Field): boolean => {
      if (typeof field.required === 'boolean') return field.required
      if (typeof field.required === 'string') {
        return evaluateBooleanExpression(field.required, formData)
      }
      return false
    },
    [formData]
  )

  return {
    isFieldVisible,
    isSectionVisible,
    isPageVisible,
    getCalculatedValue,
    isFieldRequired,
    formData,
  }
}
