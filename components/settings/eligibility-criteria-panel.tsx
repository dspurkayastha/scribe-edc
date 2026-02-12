'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createEligibilityCriteria,
  updateEligibilityCriteria,
  deleteEligibilityCriteria,
} from '@/server/actions/study'
import { PlusIcon, PencilIcon, TrashIcon, Loader2Icon, CheckIcon, XIcon } from 'lucide-react'
import type { EligibilityCriteriaRow, EligibilityCriteriaType } from '@/types/database'

interface EligibilityCriteriaPanelProps {
  studyId: string
  criteria: EligibilityCriteriaRow[]
}

export function EligibilityCriteriaPanel({ studyId, criteria }: EligibilityCriteriaPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Inline add form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [addLabel, setAddLabel] = useState('')
  const [addRule, setAddRule] = useState('')
  const [addType, setAddType] = useState<EligibilityCriteriaType>('inclusion')

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editRule, setEditRule] = useState('')
  const [editType, setEditType] = useState<EligibilityCriteriaType>('inclusion')

  const inclusion = criteria.filter((c) => c.type === 'inclusion')
  const exclusion = criteria.filter((c) => c.type === 'exclusion')

  function handleAdd() {
    if (!addLabel.trim() || !addRule.trim()) {
      toast.error('Label and rule are required')
      return
    }

    startTransition(async () => {
      const nextSort = criteria.length > 0
        ? Math.max(...criteria.map((c) => c.sort_order)) + 1
        : 1

      const result = await createEligibilityCriteria(studyId, {
        label: addLabel.trim(),
        rule: addRule.trim(),
        type: addType,
        sortOrder: nextSort,
      })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success('Criteria added')
      setShowAddForm(false)
      setAddLabel('')
      setAddRule('')
      setAddType('inclusion')
      router.refresh()
    })
  }

  function startEdit(item: EligibilityCriteriaRow) {
    setEditingId(item.id)
    setEditLabel(item.label)
    setEditRule(item.rule)
    setEditType(item.type)
  }

  function handleUpdate() {
    if (!editingId || !editLabel.trim() || !editRule.trim()) {
      toast.error('Label and rule are required')
      return
    }

    startTransition(async () => {
      const result = await updateEligibilityCriteria(editingId, studyId, {
        label: editLabel.trim(),
        rule: editRule.trim(),
        type: editType,
      })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success('Criteria updated')
      setEditingId(null)
      router.refresh()
    })
  }

  function handleDelete(criteriaId: string) {
    startTransition(async () => {
      const result = await deleteEligibilityCriteria(criteriaId, studyId)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('Criteria deleted')
      router.refresh()
    })
  }

  function renderCriteriaList(items: EligibilityCriteriaRow[], typeLabel: string) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Badge
            variant="outline"
            className={typeLabel === 'Inclusion' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}
          >
            {typeLabel}
          </Badge>
          <span className="text-muted-foreground text-xs">{items.length} criteria</span>
        </h3>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground pl-2">No {typeLabel.toLowerCase()} criteria defined.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="rounded-md border px-4 py-3">
                {editingId === item.id ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Label</Label>
                      <Input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        disabled={isPending}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Rule (filtrex expression)</Label>
                      <Input
                        value={editRule}
                        onChange={(e) => setEditRule(e.target.value)}
                        disabled={isPending}
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select value={editType} onValueChange={(v) => setEditType(v as EligibilityCriteriaType)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inclusion">Inclusion</SelectItem>
                          <SelectItem value="exclusion">Exclusion</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleUpdate} disabled={isPending}>
                        {isPending ? <Loader2Icon className="animate-spin h-3 w-3" /> : <CheckIcon className="h-3 w-3" />}
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)} disabled={isPending}>
                        <XIcon className="h-3 w-3" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1 truncate">{item.rule}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(item)} disabled={isPending}>
                        <PencilIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(item.id)}
                        disabled={isPending}
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {renderCriteriaList(inclusion, 'Inclusion')}
      <Separator />
      {renderCriteriaList(exclusion, 'Exclusion')}

      {/* Add form */}
      {showAddForm ? (
        <div className="rounded-md border p-4 space-y-3">
          <h4 className="text-sm font-medium">Add Criteria</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Label</Label>
              <Input
                placeholder="e.g. Age >= 18 years"
                value={addLabel}
                onChange={(e) => setAddLabel(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={addType} onValueChange={(v) => setAddType(v as EligibilityCriteriaType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inclusion">Inclusion</SelectItem>
                  <SelectItem value="exclusion">Exclusion</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Rule (filtrex expression)</Label>
            <Input
              placeholder='e.g. age >= 18'
              value={addRule}
              onChange={(e) => setAddRule(e.target.value)}
              disabled={isPending}
              className="font-mono text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={isPending}>
              {isPending ? <Loader2Icon className="animate-spin h-3 w-3" /> : <CheckIcon className="h-3 w-3" />}
              Add
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowAddForm(false); setAddLabel(''); setAddRule('') }} disabled={isPending}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
          <PlusIcon className="h-4 w-4" />
          Add Criteria
        </Button>
      )}
    </div>
  )
}
