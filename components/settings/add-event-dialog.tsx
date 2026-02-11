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
import { createStudyEvent } from '@/server/actions/study'
import { PlusIcon, Loader2Icon } from 'lucide-react'
import type { EventType } from '@/types/database'

const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'unscheduled', label: 'Unscheduled' },
  { value: 'repeating', label: 'Repeating' },
  { value: 'as_needed', label: 'As Needed' },
]

interface AddEventDialogProps {
  studyId: string
  nextSortOrder: number
}

export function AddEventDialog({ studyId, nextSortOrder }: AddEventDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [label, setLabel] = useState('')
  const [eventType, setEventType] = useState<EventType>('scheduled')
  const [dayOffset, setDayOffset] = useState('')
  const [windowBefore, setWindowBefore] = useState('0')
  const [windowAfter, setWindowAfter] = useState('0')
  const [sortOrder, setSortOrder] = useState(String(nextSortOrder))
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
    setName('')
    setLabel('')
    setEventType('scheduled')
    setDayOffset('')
    setWindowBefore('0')
    setWindowAfter('0')
    setSortOrder(String(nextSortOrder))
    setError(null)
  }

  function handleSubmit() {
    if (!name.trim() || !label.trim()) {
      setError('Name and label are required')
      return
    }

    const sortNum = parseInt(sortOrder, 10)
    if (isNaN(sortNum) || sortNum < 0) {
      setError('Sort order must be a non-negative number')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await createStudyEvent(studyId, {
        name: name.trim(),
        label: label.trim(),
        event_type: eventType,
        day_offset: dayOffset.trim() !== '' ? parseInt(dayOffset, 10) : undefined,
        window_before: parseInt(windowBefore, 10) || 0,
        window_after: parseInt(windowAfter, 10) || 0,
        sort_order: sortNum,
      })

      if (!result.success) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success(`Event "${result.data.label}" created`)
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
          Add Event
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Study Event</DialogTitle>
          <DialogDescription>
            Define a new visit or event in the study schedule.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-name">Name</Label>
              <Input
                id="event-name"
                placeholder="e.g. visit_1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-label">Label</Label>
              <Input
                id="event-label"
                placeholder="e.g. Visit 1 (Baseline)"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-type">Event Type</Label>
              <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
                <SelectTrigger id="event-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-sort">Sort Order</Label>
              <Input
                id="event-sort"
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-day-offset">Day Offset</Label>
              <Input
                id="event-day-offset"
                type="number"
                placeholder="e.g. 0"
                value={dayOffset}
                onChange={(e) => setDayOffset(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-window-before">Window Before</Label>
              <Input
                id="event-window-before"
                type="number"
                min={0}
                value={windowBefore}
                onChange={(e) => setWindowBefore(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-window-after">Window After</Label>
              <Input
                id="event-window-after"
                type="number"
                min={0}
                value={windowAfter}
                onChange={(e) => setWindowAfter(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Day offset is relative to the study anchor (e.g. enrollment). Window values define the acceptable visit window in days.
          </p>

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
            {isPending ? 'Creating...' : 'Create Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
