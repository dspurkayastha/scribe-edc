'use client'

import type { Page } from '@/types/form-schema'
import { FormSection } from './form-section'
import { RepeatableSection } from './repeatable-section'
import { useExpressionEvaluator } from './hooks/use-expression-evaluator'

interface FormPageProps {
  page: Page
  readOnly?: boolean
  /** Passed through to FormField for file upload storage pathing */
  studyId?: string
  /** Passed through to FormField for file upload storage pathing */
  participantId?: string
}

export function FormPage({ page, readOnly, studyId, participantId }: FormPageProps) {
  return (
    <div className="space-y-6">
      {page.title && (
        <div>
          <h2 className="text-lg font-semibold">{page.title}</h2>
          {page.description && (
            <p className="text-sm text-muted-foreground">{page.description}</p>
          )}
        </div>
      )}

      {page.sections.map((section) => {
        if (section.repeatable) {
          return (
            <RepeatableSection
              key={section.id}
              section={section}
              readOnly={readOnly}
              studyId={studyId}
              participantId={participantId}
            />
          )
        }
        return (
          <FormSection
            key={section.id}
            section={section}
            readOnly={readOnly}
            studyId={studyId}
            participantId={participantId}
          />
        )
      })}
    </div>
  )
}
