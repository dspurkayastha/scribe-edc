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
import { Input } from '@/components/ui/input'
import { Loader2Icon, Trash2Icon } from 'lucide-react'
import { softDeleteParticipant } from '@/server/actions/participants'

interface DeleteParticipantDialogProps {
  participantId: string
  studyNumber: string
  participantsListUrl: string
}

export function DeleteParticipantDialog({
  participantId,
  studyNumber,
  participantsListUrl,
}: DeleteParticipantDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')

  function handleDelete() {
    if (!reason.trim()) return

    startTransition(async () => {
      const result = await softDeleteParticipant(participantId, reason.trim())

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(`Participant ${studyNumber} deleted`)
      setOpen(false)
      setReason('')
      router.push(participantsListUrl)
      router.refresh()
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) setReason('')
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
          <Trash2Icon className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Delete Participant</DialogTitle>
          <DialogDescription>
            This will soft-delete participant <strong>{studyNumber}</strong>. The record will be
            marked as deleted and hidden from active views. A reason is required for the audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="delete-reason">Reason for deletion</Label>
          <Input
            id="delete-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for deletion..."
            autoFocus
          />
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
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending || !reason.trim()}
          >
            {isPending && <Loader2Icon className="h-4 w-4 animate-spin mr-1" />}
            {isPending ? 'Deleting...' : 'Delete Participant'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
