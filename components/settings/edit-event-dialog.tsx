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
import { updateStudyEvent } from '@/server/actions/study'
import { PencilIcon, Loader2Icon } from 'lucide-react'
import type { StudyEventRow, StudyArmRow, StudyPeriodRow, EventType, EventAnchor } from '@/types/database'

const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'unscheduled', label: 'Unscheduled' },
  { value: 'repeating', label: 'Repeating' },
  { value: 'as_needed', label: 'As Needed' },
]

const ANCHOR_OPTIONS: { value: EventAnchor; label: string }[] = [
  { value: 'enrollment', label: 'Enrollment' },
  { value: 'randomization', label: 'Randomization' },
  { value: 'surgery', label: 'Surgery' },
  { value: 'custom', label: 'Custom (another event)' },
]

interface EditEventDialogProps {
  event: StudyEventRow
  studyId: string
  arms: StudyArmRow[]
  periods: StudyPeriodRow[]
  otherEvents: StudyEventRow[]
}

export function EditEventDialog({ event, studyId, arms, periods, otherEvents }: EditEventDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(event.name)
  const [label, setLabel] = useState(event.label)
  const [eventType, setEventType] = useState<EventType>(event.event_type)
  const [dayOffset, setDayOffset] = useState(event.day_offset?.toString() ?? '')
  const [windowBefore, setWindowBefore] = useState(String(event.window_before))
  const [windowAfter, setWindowAfter] = useState(String(event.window_after))
  const [sortOrder, setSortOrder] = useState(String(event.sort_order))
  const [armId, setArmId] = useState(event.arm_id ?? '__all__')
  const [periodId, setPeriodId] = useState(event.period_id ?? '__none__')
  const [anchor, setAnchor] = useState<EventAnchor>(event.anchor)
  const [anchorEventId, setAnchorEventId] = useState(event.anchor_event_id ?? '__none__')
  const [maxRepeats, setMaxRepeats] = useState(event.max_repeats?.toString() ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
    setName(event.name)
    setLabel(event.label)
    setEventType(event.event_type)
    setDayOffset(event.day_offset?.toString() ?? '')
    setWindowBefore(String(event.window_before))
    setWindowAfter(String(event.window_after))
    setSortOrder(String(event.sort_order))
    setArmId(event.arm_id ?? '__all__')
    setPeriodId(event.period_id ?? '__none__')
    setAnchor(event.anchor)
    setAnchorEventId(event.anchor_event_id ?? '__none__')
    setMaxRepeats(event.max_repeats?.toString() ?? '')
    setError(null)
  }

  function handleSubmit() {
    if (!name.trim() || !label.trim()) {
      setError('Name and label are required')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await updateStudyEvent(event.id, studyId, {
        name: name.trim(),
        label: label.trim(),
        event_type: eventType,
        day_offset: dayOffset.trim() !== '' ? parseInt(dayOffset, 10) : null,
        window_before: parseInt(windowBefore, 10) || 0,
        window_after: parseInt(windowAfter, 10) || 0,
        sort_order: parseInt(sortOrder, 10) || 0,
        arm_id: armId === '__all__' ? null : armId,
        period_id: periodId === '__none__' ? null : periodId,
        anchor,
        anchor_event_id: anchor === 'custom' && anchorEventId !== '__none__' ? anchorEventId : null,
        max_repeats: eventType === 'repeating' && maxRepeats.trim() !== '' ? parseInt(maxRepeats, 10) : null,
      })

      if (!result.success) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success(`Event "${result.data.label}" updated`)
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
          <DialogDescription>
            Update the configuration for {event.label}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-event-name">Name</Label>
              <Input
                id="edit-event-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-event-label">Label</Label>
              <Input
                id="edit-event-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-event-type">Event Type</Label>
              <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
                <SelectTrigger id="edit-event-type" className="w-full">
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
              <Label htmlFor="edit-event-sort">Sort Order</Label>
              <Input
                id="edit-event-sort"
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          {/* Arm scoping */}
          {arms.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="edit-event-arm">Arm (scope)</Label>
              <Select value={armId} onValueChange={setArmId}>
                <SelectTrigger id="edit-event-arm" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Arms</SelectItem>
                  {arms.filter((a) => a.is_active).map((arm) => (
                    <SelectItem key={arm.id} value={arm.id}>
                      {arm.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Period scoping */}
          {periods.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="edit-event-period">Period</Label>
              <Select value={periodId} onValueChange={setPeriodId}>
                <SelectTrigger id="edit-event-period" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No Period</SelectItem>
                  {periods.filter((p) => p.is_active).map((period) => (
                    <SelectItem key={period.id} value={period.id}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Anchor */}
          <div className="space-y-2">
            <Label htmlFor="edit-event-anchor">Anchor</Label>
            <Select value={anchor} onValueChange={(v) => setAnchor(v as EventAnchor)}>
              <SelectTrigger id="edit-event-anchor" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANCHOR_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom anchor event */}
          {anchor === 'custom' && otherEvents.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="edit-event-anchor-event">Anchor Event</Label>
              <Select value={anchorEventId} onValueChange={setAnchorEventId}>
                <SelectTrigger id="edit-event-anchor-event" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select an event...</SelectItem>
                  {otherEvents.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Day offset + windows */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-event-day-offset">Day Offset</Label>
              <Input
                id="edit-event-day-offset"
                type="number"
                value={dayOffset}
                onChange={(e) => setDayOffset(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-event-window-before">Window Before</Label>
              <Input
                id="edit-event-window-before"
                type="number"
                min={0}
                value={windowBefore}
                onChange={(e) => setWindowBefore(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-event-window-after">Window After</Label>
              <Input
                id="edit-event-window-after"
                type="number"
                min={0}
                value={windowAfter}
                onChange={(e) => setWindowAfter(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          {/* Max repeats (shown for repeating type) */}
          {eventType === 'repeating' && (
            <div className="space-y-2">
              <Label htmlFor="edit-event-max-repeats">Max Repeats</Label>
              <Input
                id="edit-event-max-repeats"
                type="number"
                min={1}
                placeholder="Unlimited if empty"
                value={maxRepeats}
                onChange={(e) => setMaxRepeats(e.target.value)}
                disabled={isPending}
              />
            </div>
          )}

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
