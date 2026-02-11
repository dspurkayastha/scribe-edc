'use client'

import { useFormContext } from 'react-hook-form'
import type { Field } from '@/types/form-schema'
import { useExpressionEvaluator } from './hooks/use-expression-evaluator'
import { FormControl, FormDescription, FormField as ShadcnFormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { MatrixField } from './fields/matrix-field'
import { SignatureField } from './fields/signature-field'
import { FileField } from './fields/file-field'
import type { FormSchema } from '@/types/form-schema'

interface FormFieldProps {
  field: Field
  readOnly?: boolean
  namePrefix?: string
  /** Required for file uploads — the study ID for storage pathing */
  studyId?: string
  /** Required for file uploads — the participant ID for storage pathing */
  participantId?: string
}

export function FormField({ field, readOnly, namePrefix, studyId, participantId }: FormFieldProps) {
  const { control } = useFormContext()
  const fieldName = namePrefix ? `${namePrefix}.${field.id}` : field.id

  // Don't render descriptive fields as form fields
  if (field.type === 'descriptive') {
    return (
      <div className="py-2">
        <p className="text-sm font-medium">{field.label}</p>
        {field.description && (
          <p className="text-sm text-muted-foreground">{field.description}</p>
        )}
      </div>
    )
  }

  // Complex field types that manage their own form state via useFormContext
  // These do not use the ShadcnFormField render prop pattern because they
  // write to nested keys (e.g. fieldName.rowValue for matrix).
  if (field.type === 'matrix') {
    return (
      <div className="space-y-2">
        <Label>
          {field.label}
          {field.required === true && <span className="text-destructive"> *</span>}
        </Label>
        <MatrixField field={field} readOnly={readOnly} namePrefix={namePrefix} />
        {field.description && (
          <p className="text-sm text-muted-foreground">{field.description}</p>
        )}
      </div>
    )
  }

  if (field.type === 'signature') {
    return (
      <div className="space-y-2">
        <Label>
          {field.label}
          {field.required === true && <span className="text-destructive"> *</span>}
        </Label>
        <SignatureField field={field} readOnly={readOnly} namePrefix={namePrefix} />
        {field.description && (
          <p className="text-sm text-muted-foreground">{field.description}</p>
        )}
      </div>
    )
  }

  if (field.type === 'file') {
    return (
      <div className="space-y-2">
        <Label>
          {field.label}
          {field.required === true && <span className="text-destructive"> *</span>}
        </Label>
        <FileField
          field={field}
          readOnly={readOnly}
          namePrefix={namePrefix}
          studyId={studyId ?? ''}
          participantId={participantId ?? ''}
        />
        {field.description && (
          <p className="text-sm text-muted-foreground">{field.description}</p>
        )}
      </div>
    )
  }

  return (
    <ShadcnFormField
      control={control}
      name={fieldName}
      render={({ field: formField }) => (
        <FormItem>
          <FormLabel>
            {field.label}
            {field.required === true && <span className="text-destructive"> *</span>}
          </FormLabel>
          <FormControl>
            {renderFieldInput(field, formField, readOnly)}
          </FormControl>
          {field.description && <FormDescription>{field.description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function renderFieldInput(
  field: Field,
  formField: { value: unknown; onChange: (value: unknown) => void; onBlur: () => void; name: string },
  readOnly?: boolean
) {
  const disabled = readOnly || field.disabled === true

  switch (field.type) {
    case 'text':
      return (
        <Input
          {...formField}
          value={(formField.value as string) ?? ''}
          placeholder={field.placeholder}
          disabled={disabled}
        />
      )

    case 'textarea':
      return (
        <Textarea
          {...formField}
          value={(formField.value as string) ?? ''}
          placeholder={field.placeholder}
          rows={field.rows ?? 3}
          disabled={disabled}
        />
      )

    case 'number':
    case 'integer':
      return (
        <Input
          type="number"
          {...formField}
          value={formField.value !== null && formField.value !== undefined ? String(formField.value) : ''}
          onChange={(e) => {
            const val = e.target.value
            if (val === '') {
              formField.onChange(null)
            } else {
              formField.onChange(field.type === 'integer' ? parseInt(val, 10) : parseFloat(val))
            }
          }}
          step={field.type === 'integer' ? 1 : field.step}
          min={field.validation?.min}
          max={field.validation?.max}
          placeholder={field.placeholder}
          disabled={disabled}
        />
      )

    case 'date':
      return (
        <Input
          type="date"
          {...formField}
          value={(formField.value as string) ?? ''}
          disabled={disabled}
        />
      )

    case 'datetime':
      return (
        <Input
          type="datetime-local"
          {...formField}
          value={(formField.value as string) ?? ''}
          disabled={disabled}
        />
      )

    case 'time':
      return (
        <Input
          type="time"
          {...formField}
          value={(formField.value as string) ?? ''}
          disabled={disabled}
        />
      )

    case 'radio':
      return (
        <RadioGroup
          value={(formField.value as string) ?? ''}
          onValueChange={formField.onChange}
          disabled={disabled}
          className="space-y-2"
        >
          {(field.options ?? []).map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={`${formField.name}-${option.value}`} />
              <Label htmlFor={`${formField.name}-${option.value}`} className="font-normal">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      )

    case 'checkbox':
      return (
        <div className="space-y-2">
          {(field.options ?? []).map((option) => {
            const values = (formField.value as string[]) ?? []
            return (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${formField.name}-${option.value}`}
                  checked={values.includes(option.value)}
                  disabled={disabled}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      formField.onChange([...values, option.value])
                    } else {
                      formField.onChange(values.filter((v: string) => v !== option.value))
                    }
                  }}
                />
                <Label htmlFor={`${formField.name}-${option.value}`} className="font-normal">
                  {option.label}
                </Label>
              </div>
            )
          })}
        </div>
      )

    case 'dropdown':
    case 'lookup':
      return (
        <Select
          value={(formField.value as string) ?? ''}
          onValueChange={formField.onChange}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder ?? 'Select...'} />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    case 'slider':
    case 'likert':
      return (
        <div className="space-y-2">
          <Slider
            value={[typeof formField.value === 'number' ? formField.value : (field.min ?? 0)]}
            onValueChange={([val]) => formField.onChange(val)}
            min={field.min ?? 0}
            max={field.max ?? 100}
            step={field.step ?? 1}
            disabled={disabled}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{field.min ?? 0}</span>
            <span className="font-medium">{formField.value as number ?? ''}</span>
            <span>{field.max ?? 100}</span>
          </div>
        </div>
      )

    case 'calculated':
      return (
        <Input
          value={formField.value != null ? String(formField.value) : ''}
          disabled
          className="bg-muted"
        />
      )

    default:
      return (
        <Input
          {...formField}
          value={(formField.value as string) ?? ''}
          disabled={disabled}
        />
      )
  }
}
