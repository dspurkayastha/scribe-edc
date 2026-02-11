'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ExpressionInput } from '../expression-input'
import type { FieldType, ValidationRules } from '@/types/form-schema'

interface ValidationRulesEditorProps {
  fieldType: FieldType
  validation?: ValidationRules
  onChange: (validation: ValidationRules | undefined) => void
}

export function ValidationRulesEditor({ fieldType, validation, onChange }: ValidationRulesEditorProps) {
  function update(updates: Partial<ValidationRules>) {
    const merged = { ...validation, ...updates }
    // Remove undefined/empty values
    const cleaned = Object.fromEntries(
      Object.entries(merged).filter(([, v]) => v !== undefined && v !== '' && v !== null)
    ) as ValidationRules
    onChange(Object.keys(cleaned).length > 0 ? cleaned : undefined)
  }

  const isText = fieldType === 'text' || fieldType === 'textarea'
  const isNumeric = fieldType === 'number' || fieldType === 'integer' || fieldType === 'slider' || fieldType === 'likert'

  return (
    <div className="space-y-4">
      {isText && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="val-min-length">Min Length</Label>
            <Input
              id="val-min-length"
              type="number"
              min={0}
              value={validation?.minLength ?? ''}
              onChange={(e) => update({ minLength: e.target.value ? parseInt(e.target.value, 10) : undefined })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="val-max-length">Max Length</Label>
            <Input
              id="val-max-length"
              type="number"
              min={0}
              value={validation?.maxLength ?? ''}
              onChange={(e) => update({ maxLength: e.target.value ? parseInt(e.target.value, 10) : undefined })}
            />
          </div>
        </div>
      )}

      {isText && (
        <>
          <div className="space-y-2">
            <Label htmlFor="val-pattern">Pattern (Regex)</Label>
            <Input
              id="val-pattern"
              value={validation?.pattern ?? ''}
              onChange={(e) => update({ pattern: e.target.value || undefined })}
              placeholder="e.g. ^[A-Z]{2}[0-9]{4}$"
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="val-pattern-msg">Pattern Error Message</Label>
            <Input
              id="val-pattern-msg"
              value={validation?.patternMessage ?? ''}
              onChange={(e) => update({ patternMessage: e.target.value || undefined })}
              placeholder="e.g. Must be 2 letters followed by 4 digits"
            />
          </div>
        </>
      )}

      {isNumeric && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="val-min">Min Value</Label>
            <Input
              id="val-min"
              type="number"
              value={validation?.min ?? ''}
              onChange={(e) => update({ min: e.target.value ? parseFloat(e.target.value) : undefined })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="val-max">Max Value</Label>
            <Input
              id="val-max"
              type="number"
              value={validation?.max ?? ''}
              onChange={(e) => update({ max: e.target.value ? parseFloat(e.target.value) : undefined })}
            />
          </div>
        </div>
      )}

      {/* Custom validation for all non-descriptive types */}
      <div className="space-y-2">
        <Label>Custom Validation Expression</Label>
        <ExpressionInput
          value={validation?.custom ?? ''}
          onChange={(value) => update({ custom: value || undefined })}
          placeholder="e.g. {diastolic_bp} < {systolic_bp}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="val-custom-msg">Custom Validation Message</Label>
        <Input
          id="val-custom-msg"
          value={validation?.customMessage ?? ''}
          onChange={(e) => update({ customMessage: e.target.value || undefined })}
          placeholder="Error message when validation fails"
        />
      </div>
    </div>
  )
}
