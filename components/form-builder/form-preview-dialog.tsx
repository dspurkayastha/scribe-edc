'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MonitorIcon, TabletIcon, SmartphoneIcon, AlertCircleIcon } from 'lucide-react'
import { FormRenderer } from '@/components/form-engine/form-renderer'
import { validateFormSchema } from '@/lib/form-engine/schema-validator'
import type { FormSchema } from '@/types/form-schema'
import { cn } from '@/lib/utils'

interface FormPreviewDialogProps {
  schema: FormSchema
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ViewMode = 'desktop' | 'tablet' | 'mobile'

const viewWidths: Record<ViewMode, string> = {
  desktop: 'max-w-full',
  tablet: 'max-w-[768px]',
  mobile: 'max-w-[375px]',
}

export function FormPreviewDialog({ schema, open, onOpenChange }: FormPreviewDialogProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('desktop')
  const errors = validateFormSchema(schema)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Form Preview</SheetTitle>
            <div className="flex items-center gap-1 border rounded-lg p-0.5">
              <Button
                variant={viewMode === 'desktop' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setViewMode('desktop')}
                title="Desktop"
              >
                <MonitorIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'tablet' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setViewMode('tablet')}
                title="Tablet"
              >
                <TabletIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'mobile' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setViewMode('mobile')}
                title="Mobile"
              >
                <SmartphoneIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {errors.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 text-sm font-medium mb-1">
              <AlertCircleIcon className="h-4 w-4" />
              Schema Validation Errors
            </div>
            <ul className="text-xs text-red-600 space-y-0.5 list-disc list-inside">
              {errors.map((err, i) => (
                <li key={i}>{err.field}: {err.message}</li>
              ))}
            </ul>
          </div>
        )}

        <div className={cn('mt-6 mx-auto transition-all', viewWidths[viewMode])}>
          <Badge variant="outline" className="mb-4 text-xs">
            Preview Mode — submissions are not saved
          </Badge>
          <FormRenderer
            schema={schema}
            onSaveDraft={() => toast.info('Preview mode: draft not saved')}
            onSubmit={() => toast.info('Preview mode: submission not saved')}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
