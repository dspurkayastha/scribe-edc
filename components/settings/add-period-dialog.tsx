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
import { createStudyPeriod } from '@/server/actions/study'
import { PlusIcon, Loader2Icon } from 'lucide-react'
import type { PeriodType } from '@/types/database'

const PERIOD_TYPE_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: 'treatment', label: 'Treatment' },
  { value: 'washout', label: 'Washout' },
  { value: 'run_in', label: 'Run-in' },
  { value: 'follow_up', label: 'Follow-up' },
]

interface AddPeriodDialogProps {
  studyId: string
  nextSortOrder: number
}

export function AddPeriodDialog({ studyId, nextSortOrder }: AddPeriodDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [label, setLabel] = useState('')
  const [periodType, setPeriodType] = useState<PeriodType>('treatment')
  const [durationDays, setDurationDays] = useState('')
  const [sortOrder, setSortOrder] = useState(String(nextSortOrder))
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
    setName('')
    setLabel('')
    setPeriodType('treatment')
    setDurationDays('')
    setSortOrder(String(nextSortOrder))
    setError(null)
  }

  function handleSubmit() {
    if (!name.trim() || !label.trim()) {
      setError('Name and label are required')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await createStudyPeriod(studyId, {
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

      toast.success(`Period "${result.data.label}" created`)
      setOpen(false)
      resetForm()
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon />
          Add Period
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Study Period</DialogTitle>
          <DialogDescription>
            Define a new period for crossover or multi-phase study designs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period-name">Name</Label>
              <Input
                id="period-name"
                placeholder="e.g. treatment_a"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period-label">Label</Label>
              <Input
                id="period-label"
                placeholder="e.g. Treatment Period A"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period-type">Period Type</Label>
              <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
                <SelectTrigger id="period-type" className="w-full">
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
              <Label htmlFor="period-duration">Duration (days)</Label>
              <Input
                id="period-duration"
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
            <Label htmlFor="period-sort">Sort Order</Label>
            <Input
              id="period-sort"
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
            {isPending ? 'Creating...' : 'Create Period'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
