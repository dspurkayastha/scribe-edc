'use client'

import type { Section } from '@/types/form-schema'
import { FormField } from './form-field'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface FormSectionProps {
  section: Section
  readOnly?: boolean
  namePrefix?: string
  /** Passed through to FormField for file upload storage pathing */
  studyId?: string
  /** Passed through to FormField for file upload storage pathing */
  participantId?: string
}

export function FormSection({ section, readOnly, namePrefix, studyId, participantId }: FormSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{section.title}</CardTitle>
        {section.description && (
          <CardDescription>{section.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {section.fields.map((field) => (
          <FormField
            key={field.id}
            field={field}
            readOnly={readOnly}
            namePrefix={namePrefix}
            studyId={studyId}
            participantId={participantId}
          />
        ))}
      </CardContent>
    </Card>
  )
}
