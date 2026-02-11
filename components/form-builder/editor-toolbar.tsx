'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SaveIcon, EyeIcon, HistoryIcon, Loader2Icon, AlertCircleIcon } from 'lucide-react'

interface EditorToolbarProps {
  formTitle: string
  formSlug: string
  isDirty: boolean
  isSaving: boolean
  validationErrorCount: number
  onSave: () => void
  onPreview: () => void
  onVersionHistory: () => void
}

export function EditorToolbar({
  formTitle,
  formSlug,
  isDirty,
  isSaving,
  validationErrorCount,
  onSave,
  onPreview,
  onVersionHistory,
}: EditorToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-2 bg-background">
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-sm font-medium">{formTitle}</h2>
          <p className="text-xs text-muted-foreground font-mono">{formSlug}</p>
        </div>
        {isDirty && (
          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
            Unsaved changes
          </Badge>
        )}
        {validationErrorCount > 0 && (
          <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
            <AlertCircleIcon className="h-3 w-3 mr-1" />
            {validationErrorCount} error{validationErrorCount !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onVersionHistory}>
          <HistoryIcon className="h-4 w-4" />
          Versions
        </Button>
        <Button variant="outline" size="sm" onClick={onPreview}>
          <EyeIcon className="h-4 w-4" />
          Preview
        </Button>
        <Button size="sm" onClick={onSave} disabled={!isDirty || isSaving}>
          {isSaving ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SaveIcon className="h-4 w-4" />}
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
