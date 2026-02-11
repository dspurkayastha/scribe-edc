'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { PlusIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon } from 'lucide-react'
import type { Option } from '@/types/form-schema'

interface OptionsEditorProps {
  options: Option[]
  optionListSlug?: string
  onChange: (options: Option[], optionListSlug?: string) => void
}

export function OptionsEditor({ options, optionListSlug, onChange }: OptionsEditorProps) {
  const [useExternal, setUseExternal] = useState(!!optionListSlug)
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkText, setBulkText] = useState('')

  if (useExternal) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Use External Option List</Label>
          <Switch checked={useExternal} onCheckedChange={(checked) => {
            setUseExternal(checked)
            if (!checked) onChange(options, undefined)
          }} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="option-list-slug">Option List Slug</Label>
          <Input
            id="option-list-slug"
            value={optionListSlug ?? ''}
            onChange={(e) => onChange([], e.target.value || undefined)}
            placeholder="e.g. countries"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Reference an option list defined in Settings &gt; Option Lists.
          </p>
        </div>
      </div>
    )
  }

  function addOption() {
    const newOpt: Option = { value: `option_${options.length + 1}`, label: `Option ${options.length + 1}` }
    onChange([...options, newOpt], undefined)
  }

  function updateOption(index: number, updates: Partial<Option>) {
    const newOptions = options.map((opt, i) => (i === index ? { ...opt, ...updates } : opt))
    onChange(newOptions, undefined)
  }

  function removeOption(index: number) {
    onChange(options.filter((_, i) => i !== index), undefined)
  }

  function reorderOption(index: number, direction: 'up' | 'down') {
    const newOptions = [...options]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= options.length) return
    ;[newOptions[index], newOptions[swapIndex]] = [newOptions[swapIndex], newOptions[index]]
    onChange(newOptions, undefined)
  }

  function applyBulk() {
    const parsed = bulkText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [value, ...labelParts] = line.split('|')
        const label = labelParts.join('|').trim() || value.trim()
        return { value: value.trim(), label }
      })
    onChange(parsed, undefined)
    setBulkMode(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Label>Inline Options</Label>
          <button
            className="text-xs text-muted-foreground hover:text-foreground underline"
            onClick={() => {
              if (!bulkMode) {
                setBulkText(options.map((o) => `${o.value}|${o.label}`).join('\n'))
              }
              setBulkMode(!bulkMode)
            }}
          >
            {bulkMode ? 'Switch to list' : 'Bulk edit'}
          </button>
        </div>
        <Switch checked={useExternal} onCheckedChange={(checked) => {
          setUseExternal(checked)
          if (checked) onChange([], optionListSlug)
        }} />
      </div>

      {bulkMode ? (
        <div className="space-y-2">
          <Textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={8}
            className="font-mono text-sm"
            placeholder="value|label (one per line)"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={applyBulk}>Apply</Button>
            <Button size="sm" variant="outline" onClick={() => setBulkMode(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {options.map((opt, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={opt.value}
                  onChange={(e) => updateOption(index, { value: e.target.value })}
                  placeholder="value"
                  className="font-mono text-sm w-1/3"
                />
                <Input
                  value={opt.label}
                  onChange={(e) => updateOption(index, { label: e.target.value })}
                  placeholder="label"
                  className="flex-1"
                />
                <button
                  className="p-1 rounded hover:bg-muted"
                  onClick={() => reorderOption(index, 'up')}
                  disabled={index === 0}
                >
                  <ChevronUpIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  className="p-1 rounded hover:bg-muted"
                  onClick={() => reorderOption(index, 'down')}
                  disabled={index === options.length - 1}
                >
                  <ChevronDownIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  className="p-1 rounded hover:bg-destructive/10 text-destructive"
                  onClick={() => removeOption(index)}
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={addOption}>
            <PlusIcon className="h-4 w-4" />
            Add Option
          </Button>
        </>
      )}
    </div>
  )
}
