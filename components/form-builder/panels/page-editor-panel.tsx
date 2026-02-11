'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ExpressionInput } from '../expression-input'
import type { Page } from '@/types/form-schema'
import type { EditorAction } from '../hooks/use-form-editor'

interface PageEditorPanelProps {
  page: Page
  dispatch: React.Dispatch<EditorAction>
}

export function PageEditorPanel({ page, dispatch }: PageEditorPanelProps) {
  function update(updates: Partial<Omit<Page, 'id' | 'sections'>>) {
    dispatch({ type: 'UPDATE_PAGE', pageId: page.id, updates })
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">Page Settings</h3>
        <p className="text-sm text-muted-foreground">Configure the page properties.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="page-id">Page ID</Label>
          <Input id="page-id" value={page.id} disabled className="font-mono text-sm" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="page-title">Title</Label>
          <Input
            id="page-title"
            value={page.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Page title"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="page-description">Description</Label>
          <Textarea
            id="page-description"
            value={page.description ?? ''}
            onChange={(e) => update({ description: e.target.value || undefined })}
            placeholder="Optional description shown at the top of the page"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Visibility Expression</Label>
          <ExpressionInput
            value={page.visibility ?? ''}
            onChange={(value) => update({ visibility: value || undefined })}
            placeholder="e.g. {study_type} == 'interventional'"
          />
          <p className="text-xs text-muted-foreground">
            If set, this page is only visible when the expression evaluates to true.
          </p>
        </div>
      </div>
    </div>
  )
}
