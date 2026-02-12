'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateStudyPeriod } from '@/server/actions/study'
import { PencilIcon, Loader2Icon } from 'lucide-react'
import type { StudyPeriodRow, PeriodType } from '@/types/database'

const PERIOD_TYPE_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: 'treatment', label: 'Treatment' },
  { value: 'washout', label: 'Washout' },
  { value: 'run_in', label: 'Run-in' },
  { value: 'follow_up', label: 'Follow-up' },
]

interface EditPeriodDialogProps {
  period: StudyPeriodRow
  studyId: string
}

export function EditPeriodDialog({ period, studyId }: EditPeriodDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(period.name)
  const [label, setLabel] = useState(period.label)
  const [periodType, setPeriodType] = useState<PeriodType>(period.period_type)
  const [durationDays, setDurationDays] = useState(period.duration_days?.toString() ?? '')
  const [sortOrder, setSortOrder] = useState(String(period.sort_order))
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
    setName(period.name)
    setLabel(period.label)
    setPeriodType(period.period_type)
    setDurationDays(period.duration_days?.toString() ?? '')
    setSortOrder(String(period.sort_order))
    setError(null)
  }

  function handleSubmit() {
    if (!name.trim() || !label.trim()) {
      setError('Name and label are required')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await updateStudyPeriod(period.id, studyId, {
        name: name.trim(),
        label: label.trim(),
        periodType,
        durationDays: durationDays.trim() !== '' ? parseInt(durationDays, 10) : null,
        sortOrder: parseInt(sortOrder, 10) || 0,
      })

      if (!result.success) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success(`Period "${result.data.label}" updated`)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <PencilIcon className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Period</DialogTitle>
          <DialogDescription>
            Update the configuration for {period.label}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-period-name">Name</Label>
              <Input
                id="edit-period-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-period-label">Label</Label>
              <Input
                id="edit-period-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-period-type">Period Type</Label>
              <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
                <SelectTrigger id="edit-period-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-period-duration">Duration (days)</Label>
              <Input
                id="edit-period-duration"
                type="number"
                min={1}
                placeholder="Optional"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-period-sort">Sort Order</Label>
            <Input
              id="edit-period-sort"
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              disabled={isPending}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2Icon className="animate-spin" />}
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
