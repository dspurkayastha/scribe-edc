'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ExpressionInput } from '../expression-input'
import type { Section } from '@/types/form-schema'
import type { EditorAction } from '../hooks/use-form-editor'

interface SectionEditorPanelProps {
  section: Section
  pageId: string
  dispatch: React.Dispatch<EditorAction>
}

export function SectionEditorPanel({ section, pageId, dispatch }: SectionEditorPanelProps) {
  function update(updates: Partial<Omit<Section, 'id' | 'fields'>>) {
    dispatch({ type: 'UPDATE_SECTION', pageId, sectionId: section.id, updates })
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">Section Settings</h3>
        <p className="text-sm text-muted-foreground">Configure the section properties.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="section-id">Section ID</Label>
          <Input id="section-id" value={section.id} disabled className="font-mono text-sm" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="section-title">Title</Label>
          <Input
            id="section-title"
            value={section.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Section title"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="section-description">Description</Label>
          <Textarea
            id="section-description"
            value={section.description ?? ''}
            onChange={(e) => update({ description: e.target.value || undefined })}
            placeholder="Optional description"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Visibility Expression</Label>
          <ExpressionInput
            value={section.visibility ?? ''}
            onChange={(value) => update({ visibility: value || undefined })}
            placeholder="e.g. {include_labs} == 1"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label htmlFor="section-repeatable">Repeatable Section</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Allow multiple instances of this section (e.g. medications, adverse events).
            </p>
          </div>
          <Switch
            id="section-repeatable"
            checked={section.repeatable ?? false}
            onCheckedChange={(checked) => update({ repeatable: checked })}
          />
        </div>

        {section.repeatable && (
          <div className="space-y-4 pl-4 border-l-2 border-muted">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="section-min-repeat">Min Repeats</Label>
                <Input
                  id="section-min-repeat"
                  type="number"
                  min={0}
                  value={section.minRepeat ?? 1}
                  onChange={(e) => update({ minRepeat: parseInt(e.target.value, 10) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="section-max-repeat">Max Repeats</Label>
                <Input
                  id="section-max-repeat"
                  type="number"
                  min={1}
                  value={section.maxRepeat ?? 10}
                  onChange={(e) => update({ maxRepeat: parseInt(e.target.value, 10) || 10 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="section-repeat-label">Repeat Label</Label>
              <Input
                id="section-repeat-label"
                value={section.repeatLabel ?? ''}
                onChange={(e) => update({ repeatLabel: e.target.value || undefined })}
                placeholder="e.g. Medication #{n}"
              />
              <p className="text-xs text-muted-foreground">
                Use {'#{n}'} for the instance number.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
