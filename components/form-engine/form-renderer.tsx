'use client'

import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { FormSchema, Rule } from '@/types/form-schema'
import type { FormResponseStatus } from '@/types/database'
import { generateZodSchema } from '@/lib/form-engine/zod-generator'
import { FormPage } from './form-page'
import { useFormPagination } from './hooks/use-form-pagination'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface FormRendererProps {
  schema: FormSchema
  rules?: Rule[]
  defaultValues?: Record<string, unknown>
  status?: FormResponseStatus
  onSaveDraft?: (data: Record<string, unknown>) => void
  onSubmit?: (data: Record<string, unknown>) => void
  readOnly?: boolean
  /** Required for file upload fields — the study ID for storage pathing */
  studyId?: string
  /** Required for file upload fields — the participant ID for storage pathing */
  participantId?: string
}

export function FormRenderer({
  schema,
  defaultValues = {},
  status = 'draft',
  onSaveDraft,
  onSubmit,
  readOnly = false,
  studyId,
  participantId,
}: FormRendererProps) {
  const zodSchema = generateZodSchema(schema)

  const form = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: defaultValues as Record<string, unknown>,
    mode: 'onBlur',
  })

  const pagination = useFormPagination(schema)

  const handleSubmit = form.handleSubmit((data) => {
    onSubmit?.(data as Record<string, unknown>)
  })

  const handleSaveDraft = () => {
    const data = form.getValues()
    onSaveDraft?.(data as Record<string, unknown>)
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-800',
    complete: 'bg-blue-100 text-blue-800',
    verified: 'bg-green-100 text-green-800',
    locked: 'bg-gray-100 text-gray-800',
    signed: 'bg-purple-100 text-purple-800',
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Status bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={statusColors[status]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
            {pagination.totalPages > 1 && (
              <span className="text-sm text-muted-foreground">
                Page {pagination.currentPage + 1} of {pagination.totalPages}
              </span>
            )}
          </div>
        </div>

        {/* Current page */}
        <FormPage
          page={pagination.currentPageData}
          readOnly={readOnly}
          studyId={studyId}
          participantId={participantId}
        />

        {/* Navigation + actions */}
        <div className="flex items-center justify-between border-t pt-4">
          <div className="flex gap-2">
            {!pagination.isFirstPage && (
              <Button type="button" variant="outline" onClick={pagination.goToPrevPage}>
                Previous
              </Button>
            )}
            {!pagination.isLastPage && (
              <Button type="button" variant="outline" onClick={pagination.goToNextPage}>
                Next
              </Button>
            )}
          </div>

          {!readOnly && (
            <div className="flex gap-2">
              {onSaveDraft && (
                <Button type="button" variant="outline" onClick={handleSaveDraft}>
                  Save Draft
                </Button>
              )}
              {pagination.isLastPage && onSubmit && (
                <Button type="submit">Submit</Button>
              )}
            </div>
          )}
        </div>
      </form>
    </FormProvider>
  )
}
