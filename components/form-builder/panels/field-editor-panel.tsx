'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ExpressionInput } from '../expression-input'
import { OptionsEditor } from './options-editor'
import { FieldTypeSelector } from './field-type-selector'
import { ValidationRulesEditor } from './validation-rules-editor'
import { ChevronDownIcon } from 'lucide-react'
import type { Field, FieldType, FormSchema, ValidationRules, Option } from '@/types/form-schema'
import type { EditorAction } from '../hooks/use-form-editor'

interface FieldEditorPanelProps {
  field: Field
  pageId: string
  sectionId: string
  schema: FormSchema
  dispatch: React.Dispatch<EditorAction>
}

export function FieldEditorPanel({ field, pageId, sectionId, schema, dispatch }: FieldEditorPanelProps) {
  function update(updates: Partial<Omit<Field, 'id'>>) {
    dispatch({ type: 'UPDATE_FIELD', pageId, sectionId, fieldId: field.id, updates })
  }

  const hasOptions = ['radio', 'checkbox', 'dropdown', 'lookup'].includes(field.type)
  const isCalculated = field.type === 'calculated'
  const isFile = field.type === 'file'
  const isTextarea = field.type === 'textarea'
  const isSlider = field.type === 'slider' || field.type === 'likert'
  const isMatrix = field.type === 'matrix'
  const isDescriptive = field.type === 'descriptive'

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">Field Settings</h3>
        <p className="text-sm text-muted-foreground">Configure the field properties.</p>
      </div>

      {/* Basic section */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium py-2 hover:text-foreground">
          <ChevronDownIcon className="h-4 w-4 transition-transform" />
          Basic
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="field-id">Field ID</Label>
            <Input
              id="field-id"
              value={field.id}
              onChange={(e) => {
                // Updating field ID requires delete + add (complex), so show as read-only for now
              }}
              disabled
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Must match ^[a-z][a-z0-9_]*$ (set at creation, read-only).
            </p>
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <FieldTypeSelector
              value={field.type}
              onChange={(type) => update({ type })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="field-label">Label</Label>
            <Input
              id="field-label"
              value={field.label}
              onChange={(e) => update({ label: e.target.value })}
              placeholder="Field label shown to users"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="field-description">Description</Label>
            <Textarea
              id="field-description"
              value={field.description ?? ''}
              onChange={(e) => update({ description: e.target.value || undefined })}
              placeholder="Help text shown below the field"
              rows={2}
            />
          </div>

          {!isDescriptive && !isCalculated && (
            <div className="space-y-2">
              <Label htmlFor="field-placeholder">Placeholder</Label>
              <Input
                id="field-placeholder"
                value={field.placeholder ?? ''}
                onChange={(e) => update({ placeholder: e.target.value || undefined })}
                placeholder="Placeholder text"
              />
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Data Rules section */}
      {!isDescriptive && (
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium py-2 hover:text-foreground">
            <ChevronDownIcon className="h-4 w-4 transition-transform" />
            Data Rules
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-2">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="field-required">Required</Label>
              <Switch
                id="field-required"
                checked={field.required === true}
                onCheckedChange={(checked) => update({ required: checked })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="field-disabled">Disabled</Label>
              <Switch
                id="field-disabled"
                checked={field.disabled === true}
                onCheckedChange={(checked) => update({ disabled: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label>Visibility Expression</Label>
              <ExpressionInput
                value={typeof field.visibility === 'string' ? field.visibility : ''}
                onChange={(value) => update({ visibility: value || undefined })}
                placeholder="e.g. {sex} == 'female'"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="field-default">Default Value</Label>
              <Input
                id="field-default"
                value={field.defaultValue != null ? String(field.defaultValue) : ''}
                onChange={(e) => update({ defaultValue: e.target.value || undefined })}
                placeholder="Default value"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Validation section */}
      {!isDescriptive && !isCalculated && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium py-2 hover:text-foreground">
            <ChevronDownIcon className="h-4 w-4 transition-transform" />
            Validation
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <ValidationRulesEditor
              fieldType={field.type}
              validation={field.validation}
              onChange={(validation) => update({ validation })}
            />
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Options section (radio, checkbox, dropdown, lookup) */}
      {hasOptions && (
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium py-2 hover:text-foreground">
            <ChevronDownIcon className="h-4 w-4 transition-transform" />
            Options
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <OptionsEditor
              options={field.options ?? []}
              optionListSlug={field.optionListSlug}
              onChange={(options, optionListSlug) =>
                update({ options: options.length > 0 ? options : undefined, optionListSlug })
              }
            />
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Type-specific settings */}
      {(isCalculated || isTextarea || isSlider || isFile) && (
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium py-2 hover:text-foreground">
            <ChevronDownIcon className="h-4 w-4 transition-transform" />
            Type-Specific
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-2">
            {isTextarea && (
              <div className="space-y-2">
                <Label htmlFor="textarea-rows">Rows</Label>
                <Input
                  id="textarea-rows"
                  type="number"
                  min={2}
                  max={20}
                  value={field.rows ?? 3}
                  onChange={(e) => update({ rows: parseInt(e.target.value, 10) || 3 })}
                />
              </div>
            )}

            {isSlider && (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="slider-min">Min</Label>
                  <Input
                    id="slider-min"
                    type="number"
                    value={field.min ?? 0}
                    onChange={(e) => update({ min: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slider-max">Max</Label>
                  <Input
                    id="slider-max"
                    type="number"
                    value={field.max ?? 100}
                    onChange={(e) => update({ max: parseFloat(e.target.value) || 100 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slider-step">Step</Label>
                  <Input
                    id="slider-step"
                    type="number"
                    value={field.step ?? 1}
                    onChange={(e) => update({ step: parseFloat(e.target.value) || 1 })}
                  />
                </div>
              </div>
            )}

            {isCalculated && (
              <>
                <div className="space-y-2">
                  <Label>Calculation Expression</Label>
                  <ExpressionInput
                    value={field.expression ?? ''}
                    onChange={(value) => update({ expression: value || undefined })}
                    placeholder="e.g. {weight} / ({height}/100)^2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="field-depends-on">Depends On (comma-separated field IDs)</Label>
                  <Input
                    id="field-depends-on"
                    value={(field.dependsOn ?? []).join(', ')}
                    onChange={(e) =>
                      update({
                        dependsOn: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="e.g. weight, height"
                    className="font-mono text-sm"
                  />
                </div>
              </>
            )}

            {isFile && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="file-accept">Accepted MIME Types</Label>
                  <Input
                    id="file-accept"
                    value={field.accept ?? ''}
                    onChange={(e) => update({ accept: e.target.value || undefined })}
                    placeholder="e.g. image/*,application/pdf"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file-max-size">Max File Size (bytes)</Label>
                  <Input
                    id="file-max-size"
                    type="number"
                    value={field.maxFileSize ?? ''}
                    onChange={(e) =>
                      update({ maxFileSize: e.target.value ? parseInt(e.target.value, 10) : undefined })
                    }
                    placeholder="e.g. 10485760 (10 MB)"
                  />
                </div>
              </>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}
