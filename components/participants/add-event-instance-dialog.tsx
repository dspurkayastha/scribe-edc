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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getNextInstanceNumber } from '@/server/actions/event-instances'
import { PlusIcon, Loader2Icon } from 'lucide-react'
import type { StudyEventRow } from '@/types/database'

interface AddEventInstanceDialogProps {
  participantId: string
  studyId: string
  /** Events that can be repeated (type=repeating or unscheduled) */
  eligibleEvents: StudyEventRow[]
  /** Existing instance counts per event, used to check max_repeats */
  instanceCounts: Record<string, number>
  basePath: string
}

export function AddEventInstanceDialog({
  participantId,
  studyId,
  eligibleEvents,
  instanceCounts,
  basePath,
}: AddEventInstanceDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState('__none__')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Filter to events that haven't reached their max_repeats
  const availableEvents = eligibleEvents.filter((event) => {
    if (!event.max_repeats) return true // No limit
    const currentCount = instanceCounts[event.id] ?? 0
    return currentCount < event.max_repeats
  })

  function handleAdd() {
    if (selectedEventId === '__none__') {
      setError('Please select an event')
      return
    }

    const event = availableEvents.find((e) => e.id === selectedEventId)
    if (!event) return

    setError(null)
    startTransition(async () => {
      const nextInstance = await getNextInstanceNumber(participantId, selectedEventId, studyId)

      // Get the first form assigned to this event to navigate to
      // We redirect to the participant page with a special query param
      const url = `${basePath}/participants/${participantId}?newInstance=${selectedEventId}&instanceNumber=${nextInstance}`
      toast.success(`Instance #${nextInstance} added for ${event.label}`)
      setOpen(false)
      setSelectedEventId('__none__')
      router.push(url)
      router.refresh()
    })
  }

  if (availableEvents.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSelectedEventId('__none__'); setError(null) } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PlusIcon className="h-4 w-4" />
          Add Visit Instance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Visit Instance</DialogTitle>
          <DialogDescription>
            Add a new instance of a repeating or unscheduled visit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="instance-event">Event</Label>
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger id="instance-event" className="w-full">
                <SelectValue placeholder="Select an event..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select an event...</SelectItem>
                {availableEvents.map((event) => {
                  const count = instanceCounts[event.id] ?? 0
                  const limit = event.max_repeats ? ` (${count}/${event.max_repeats})` : ` (${count})`
                  return (
                    <SelectItem key={event.id} value={event.id}>
                      {event.label}{limit}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={isPending || selectedEventId === '__none__'}>
            {isPending && <Loader2Icon className="animate-spin" />}
            {isPending ? 'Adding...' : 'Add Instance'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
