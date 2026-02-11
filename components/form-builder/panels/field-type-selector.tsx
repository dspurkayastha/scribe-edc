'use client'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { FieldType } from '@/types/form-schema'

interface FieldTypeSelectorProps {
  value: FieldType
  onChange: (type: FieldType) => void
}

const FIELD_TYPE_GROUPS: { label: string; types: { value: FieldType; label: string }[] }[] = [
  {
    label: 'Text',
    types: [
      { value: 'text', label: 'Text' },
      { value: 'textarea', label: 'Textarea' },
    ],
  },
  {
    label: 'Choices',
    types: [
      { value: 'radio', label: 'Radio Buttons' },
      { value: 'checkbox', label: 'Checkboxes' },
      { value: 'dropdown', label: 'Dropdown' },
      { value: 'lookup', label: 'Lookup (searchable)' },
    ],
  },
  {
    label: 'Numeric',
    types: [
      { value: 'number', label: 'Number' },
      { value: 'integer', label: 'Integer' },
      { value: 'slider', label: 'Slider' },
      { value: 'likert', label: 'Likert Scale' },
    ],
  },
  {
    label: 'Date/Time',
    types: [
      { value: 'date', label: 'Date' },
      { value: 'datetime', label: 'Date & Time' },
      { value: 'time', label: 'Time' },
    ],
  },
  {
    label: 'Special',
    types: [
      { value: 'calculated', label: 'Calculated' },
      { value: 'file', label: 'File Upload' },
      { value: 'signature', label: 'Signature' },
      { value: 'descriptive', label: 'Descriptive Text' },
      { value: 'matrix', label: 'Matrix' },
    ],
  },
]

export function FieldTypeSelector({ value, onChange }: FieldTypeSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as FieldType)}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {FIELD_TYPE_GROUPS.map((group) => (
          <SelectGroup key={group.label}>
            <SelectLabel>{group.label}</SelectLabel>
            {group.types.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
