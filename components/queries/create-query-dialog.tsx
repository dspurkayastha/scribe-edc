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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2Icon, PlusIcon } from 'lucide-react'
import { createQuery } from '@/server/actions/queries'
import type { QueryPriority } from '@/types/database'

interface Participant {
  id: string
  study_number: string
}

interface CreateQueryDialogProps {
  studyId: string
  participants: Participant[]
}

const PRIORITY_OPTIONS: { value: QueryPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

export function CreateQueryDialog({ studyId, participants }: CreateQueryDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [participantId, setParticipantId] = useState('')
  const [queryText, setQueryText] = useState('')
  const [priority, setPriority] = useState<QueryPriority>('normal')

  function handleSubmit() {
    if (!participantId || !queryText.trim()) return

    startTransition(async () => {
      const result = await createQuery(studyId, {
        participantId,
        queryText: queryText.trim(),
        priority,
      })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success('Query created successfully')
      setOpen(false)
      resetForm()
      router.refresh()
    })
  }

  function resetForm() {
    setParticipantId('')
    setQueryText('')
    setPriority('normal')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) resetForm()
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon className="h-4 w-4 mr-1" />
          Raise Query
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Raise Data Query</DialogTitle>
          <DialogDescription>
            Create a new data query for a participant. Queries are tracked and require a response.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="query-participant">Participant</Label>
            <Select value={participantId} onValueChange={setParticipantId}>
              <SelectTrigger id="query-participant">
                <SelectValue placeholder="Select participant" />
              </SelectTrigger>
              <SelectContent>
                {participants.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.study_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="query-priority">Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as QueryPriority)}>
              <SelectTrigger id="query-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="query-text">Query Text</Label>
            <Textarea
              id="query-text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Describe the data issue or question..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !participantId || !queryText.trim()}
          >
            {isPending && <Loader2Icon className="h-4 w-4 animate-spin mr-1" />}
            {isPending ? 'Creating...' : 'Create Query'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
