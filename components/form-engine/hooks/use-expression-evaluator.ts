'use client'

import { useCallback } from 'react'
import { useWatch } from 'react-hook-form'
import type { FormSchema, Field } from '@/types/form-schema'
import { evaluateExpression, evaluateBooleanExpression } from '@/lib/form-engine/expression-engine'
import { useCrossFormData } from '../cross-form-context'

/**
 * Hook that evaluates visibility expressions and calculated fields
 * based on current form data and cross-form data from other forms.
 */
export function useExpressionEvaluator(schema: FormSchema) {
  const formData = useWatch() as Record<string, unknown>
  const crossFormData = useCrossFormData()

  const isFieldVisible = useCallback(
    (field: Field): boolean => {
      if (!field.visibility || typeof field.visibility !== 'string') return true
      return evaluateBooleanExpression(field.visibility, formData, crossFormData)
    },
    [formData, crossFormData]
  )

  const isSectionVisible = useCallback(
    (visibility?: string): boolean => {
      if (!visibility) return true
      return evaluateBooleanExpression(visibility, formData, crossFormData)
    },
    [formData, crossFormData]
  )

  const isPageVisible = useCallback(
    (visibility?: string): boolean => {
      if (!visibility) return true
      return evaluateBooleanExpression(visibility, formData, crossFormData)
    },
    [formData, crossFormData]
  )

  const getCalculatedValue = useCallback(
    (field: Field): unknown => {
      if (field.type !== 'calculated' || !field.expression) return undefined
      return evaluateExpression(field.expression, formData, crossFormData)
    },
    [formData, crossFormData]
  )

  const isFieldRequired = useCallback(
    (field: Field): boolean => {
      if (typeof field.required === 'boolean') return field.required
      if (typeof field.required === 'string') {
        return evaluateBooleanExpression(field.required, formData, crossFormData)
      }
      return false
    },
    [formData, crossFormData]
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
