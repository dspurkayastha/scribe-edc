'use client'

import { useFieldArray, useFormContext } from 'react-hook-form'
import type { Section } from '@/types/form-schema'
import { FormSection } from './form-section'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-react'

interface RepeatableSectionProps {
  section: Section
  readOnly?: boolean
  /** Passed through to FormField for file upload storage pathing */
  studyId?: string
  /** Passed through to FormField for file upload storage pathing */
  participantId?: string
}

export function RepeatableSection({ section, readOnly, studyId, participantId }: RepeatableSectionProps) {
  const { control } = useFormContext()
  const { fields, append, remove } = useFieldArray({
    control,
    name: section.id,
  })

  const canAdd = !section.maxRepeat || fields.length < section.maxRepeat
  const canRemove = !section.minRepeat || fields.length > section.minRepeat

  const getEmptyItem = () => {
    const item: Record<string, unknown> = {}
    for (const field of section.fields) {
      if (field.type !== 'descriptive') {
        item[field.id] = field.defaultValue ?? ''
      }
    }
    return item
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{section.title}</CardTitle>
            {section.description && (
              <CardDescription>{section.description}</CardDescription>
            )}
          </div>
          {!readOnly && canAdd && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append(getEmptyItem())}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No items yet. Click &quot;Add&quot; to create one.
          </p>
        )}
        {fields.map((item, index) => (
          <div key={item.id} className="relative rounded-lg border p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {section.repeatLabel
                  ? section.repeatLabel.replace('#{n}', String(index + 1))
                  : `#${index + 1}`}
              </span>
              {!readOnly && canRemove && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
            <div className="space-y-4">
              {section.fields.map((field) => (
                <FormSection
                  key={`${section.id}.${index}.${field.id}`}
                  section={{ ...section, fields: [field], repeatable: false }}
                  namePrefix={`${section.id}.${index}`}
                  readOnly={readOnly}
                  studyId={studyId}
                  participantId={participantId}
                />
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
