'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2Icon } from 'lucide-react'

const MIN_REASON_LENGTH = 10

interface ReasonForChangeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (reason: string) => void
  isPending: boolean
}

export function ReasonForChangeDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: ReasonForChangeDialogProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const trimmedLength = reason.trim().length
  const isValid = trimmedLength >= MIN_REASON_LENGTH

  function handleOpenChange(value: boolean) {
    onOpenChange(value)
    if (!value) {
      setReason('')
      setError(null)
    }
  }

  function handleSubmit() {
    if (!isValid) {
      setError(`Reason must be at least ${MIN_REASON_LENGTH} characters`)
      return
    }
    setError(null)
    onSubmit(reason.trim())
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reason for Change</DialogTitle>
          <DialogDescription>
            Editing a completed form requires a reason. This will be recorded in
            the audit trail and the form will return to draft status for editing.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="reason-for-change">Reason</Label>
          <Textarea
            id="reason-for-change"
            placeholder="Describe why this form needs to be edited..."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              if (error) setError(null)
            }}
            rows={3}
          />
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {trimmedLength}/{MIN_REASON_LENGTH} characters minimum
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !isValid}
          >
            {isPending && <Loader2Icon className="animate-spin" />}
            {isPending ? 'Submitting...' : 'Submit & Edit Form'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
