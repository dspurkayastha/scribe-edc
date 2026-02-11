'use client'

import { useFormContext } from 'react-hook-form'
import type { Field } from '@/types/form-schema'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface SignatureFieldProps {
  field: Field
  readOnly?: boolean
  namePrefix?: string
}

interface SignatureValue {
  name: string
  confirmed: boolean
  timestamp: string | null
}

export function SignatureField({ field, readOnly, namePrefix }: SignatureFieldProps) {
  const { setValue, watch } = useFormContext()
  const fieldName = namePrefix ? `${namePrefix}.${field.id}` : field.id
  const disabled = readOnly || field.disabled === true

  const currentValue = (watch(fieldName) as SignatureValue | undefined) ?? {
    name: '',
    confirmed: false,
    timestamp: null,
  }

  const handleNameChange = (name: string) => {
    setValue(
      fieldName,
      {
        ...currentValue,
        name,
        // Unconfirm when name changes
        confirmed: false,
        timestamp: null,
      },
      { shouldValidate: true }
    )
  }

  const handleConfirmChange = (confirmed: boolean) => {
    setValue(
      fieldName,
      {
        ...currentValue,
        confirmed,
        timestamp: confirmed ? new Date().toISOString() : null,
      },
      { shouldValidate: true }
    )
  }

  return (
    <div className="space-y-4">
      {/* Name input */}
      <div className="space-y-2">
        <Label htmlFor={`${fieldName}-name`}>Full Name</Label>
        <Input
          id={`${fieldName}-name`}
          value={currentValue.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Type your full name"
          disabled={disabled}
        />
      </div>

      {/* Signature preview */}
      {currentValue.name.length > 0 && (
        <div
          className={cn(
            'rounded-md border bg-muted/30 p-6 text-center',
            currentValue.confirmed && 'border-primary/40 bg-primary/5'
          )}
        >
          <p
            className="text-2xl italic text-foreground"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
          >
            {currentValue.name}
          </p>
          {currentValue.confirmed && currentValue.timestamp && (
            <p className="mt-2 text-xs text-muted-foreground">
              Signed electronically on{' '}
              {new Date(currentValue.timestamp).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Confirmation checkbox */}
      <div className="flex items-start space-x-2">
        <Checkbox
          id={`${fieldName}-confirm`}
          checked={currentValue.confirmed}
          disabled={disabled || currentValue.name.length < 2}
          onCheckedChange={(checked) => handleConfirmChange(checked === true)}
        />
        <Label
          htmlFor={`${fieldName}-confirm`}
          className={cn(
            'text-sm font-normal leading-snug',
            (disabled || currentValue.name.length < 2) && 'text-muted-foreground'
          )}
        >
          I confirm this is my electronic signature and that the information
          provided is accurate and complete.
        </Label>
      </div>

      {/* Read-only display of existing signature */}
      {readOnly && currentValue.confirmed && (
        <div className="rounded-md border-l-4 border-primary bg-primary/5 p-3 text-sm text-muted-foreground">
          This form was electronically signed by{' '}
          <span className="font-medium text-foreground">{currentValue.name}</span>
          {currentValue.timestamp && (
            <>
              {' '}on {new Date(currentValue.timestamp).toLocaleString()}
            </>
          )}
        </div>
      )}
    </div>
  )
}
