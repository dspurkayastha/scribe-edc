'use client'

import { useFormContext } from 'react-hook-form'
import type { Field, Option } from '@/types/form-schema'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface MatrixFieldProps {
  field: Field
  readOnly?: boolean
  namePrefix?: string
}

export function MatrixField({ field, readOnly, namePrefix }: MatrixFieldProps) {
  const { setValue, watch } = useFormContext()
  const fieldName = namePrefix ? `${namePrefix}.${field.id}` : field.id

  const rows = field.matrixRows ?? []
  const columns = (field.columns ?? []).flatMap((col) => col.options ?? [])

  // If columns are defined directly on the MatrixColumn (without nested options),
  // fall back to using columns as the option set
  const columnOptions: Option[] =
    columns.length > 0
      ? columns
      : (field.columns ?? []).map((col) => ({ value: col.id, label: col.label }))

  const currentValues = watch(fieldName) as Record<string, string> | undefined

  const handleChange = (rowValue: string, colValue: string) => {
    const current = currentValues ?? {}
    setValue(fieldName, { ...current, [rowValue]: colValue }, { shouldValidate: true })
  }

  if (rows.length === 0 || columnOptions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Matrix field is not configured (missing rows or columns).
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Desktop: table layout */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]" />
              {columnOptions.map((col) => (
                <TableHead key={col.value} className="text-center">
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const selectedValue = currentValues?.[row.value] ?? ''
              return (
                <TableRow key={row.value}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  {columnOptions.map((col) => (
                    <TableCell key={col.value} className="text-center">
                      <div className="flex items-center justify-center">
                        <input
                          type="radio"
                          name={`${fieldName}.${row.value}`}
                          value={col.value}
                          checked={selectedValue === col.value}
                          disabled={readOnly || field.disabled === true}
                          onChange={() => handleChange(row.value, col.value)}
                          className={cn(
                            'size-4 cursor-pointer accent-primary',
                            (readOnly || field.disabled === true) && 'cursor-not-allowed opacity-50'
                          )}
                          aria-label={`${row.label}: ${col.label}`}
                        />
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: stacked layout */}
      <div className="block sm:hidden space-y-6">
        {rows.map((row) => {
          const selectedValue = currentValues?.[row.value] ?? ''
          return (
            <div key={row.value} className="space-y-2">
              <Label className="text-sm font-medium">{row.label}</Label>
              <RadioGroup
                value={selectedValue}
                onValueChange={(val) => handleChange(row.value, val)}
                disabled={readOnly || field.disabled === true}
                className="space-y-1.5"
              >
                {columnOptions.map((col) => (
                  <div key={col.value} className="flex items-center space-x-2">
                    <RadioGroupItem
                      value={col.value}
                      id={`${fieldName}-${row.value}-${col.value}`}
                    />
                    <Label
                      htmlFor={`${fieldName}-${row.value}-${col.value}`}
                      className="font-normal"
                    >
                      {col.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )
        })}
      </div>
    </div>
  )
}
