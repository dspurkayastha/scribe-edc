'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { updateParticipantStatus } from '@/server/actions/participants'
import { ChevronDownIcon, Loader2Icon } from 'lucide-react'
import type { ParticipantStatus } from '@/types/database'

const STATUS_CONFIG: Record<ParticipantStatus, { label: string; color: string }> = {
  screening: { label: 'Screening', color: 'bg-blue-100 text-blue-800' },
  eligible: { label: 'Eligible', color: 'bg-emerald-100 text-emerald-800' },
  ineligible: { label: 'Ineligible', color: 'bg-red-100 text-red-800' },
  enrolled: { label: 'Enrolled', color: 'bg-green-100 text-green-800' },
  randomized: { label: 'Randomized', color: 'bg-violet-100 text-violet-800' },
  on_treatment: { label: 'On Treatment', color: 'bg-indigo-100 text-indigo-800' },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-800' },
  withdrawn: { label: 'Withdrawn', color: 'bg-orange-100 text-orange-800' },
  lost_to_followup: { label: 'Lost to Follow-up', color: 'bg-amber-100 text-amber-800' },
  screen_failure: { label: 'Screen Failure', color: 'bg-rose-100 text-rose-800' },
}

// Define valid transitions from each status
const STATUS_TRANSITIONS: Record<ParticipantStatus, ParticipantStatus[]> = {
  screening: ['eligible', 'ineligible', 'screen_failure', 'withdrawn'],
  eligible: ['enrolled', 'ineligible', 'screen_failure', 'withdrawn'],
  ineligible: ['screening'],
  enrolled: ['randomized', 'on_treatment', 'withdrawn', 'lost_to_followup'],
  randomized: ['on_treatment', 'withdrawn', 'lost_to_followup'],
  on_treatment: ['completed', 'withdrawn', 'lost_to_followup'],
  completed: [],
  withdrawn: [],
  lost_to_followup: [],
  screen_failure: ['screening'],
}

// Statuses that require a reason
const REQUIRES_REASON: Set<ParticipantStatus> = new Set([
  'withdrawn',
  'lost_to_followup',
  'screen_failure',
  'ineligible',
])

interface StatusChangeDropdownProps {
  participantId: string
  currentStatus: ParticipantStatus
}

export function StatusChangeDropdown({ participantId, currentStatus }: StatusChangeDropdownProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<ParticipantStatus | null>(null)
  const [reason, setReason] = useState('')

  const transitions = STATUS_TRANSITIONS[currentStatus] ?? []
  const config = STATUS_CONFIG[currentStatus]

  function handleStatusSelect(newStatus: ParticipantStatus) {
    if (REQUIRES_REASON.has(newStatus)) {
      setPendingStatus(newStatus)
      setReason('')
      setReasonDialogOpen(true)
      return
    }

    commitStatusChange(newStatus)
  }

  function commitStatusChange(newStatus: ParticipantStatus, changeReason?: string) {
    startTransition(async () => {
      const result = await updateParticipantStatus(participantId, newStatus, changeReason)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(`Status changed to ${STATUS_CONFIG[newStatus].label}`)
      setReasonDialogOpen(false)
      setPendingStatus(null)
      setReason('')
      router.refresh()
    })
  }

  function handleReasonSubmit() {
    if (!pendingStatus || !reason.trim()) return
    commitStatusChange(pendingStatus, reason.trim())
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isPending || transitions.length === 0}>
            <Badge className={config.color}>{config.label}</Badge>
            {transitions.length > 0 && <ChevronDownIcon />}
            {isPending && <Loader2Icon className="animate-spin" />}
          </Button>
        </DropdownMenuTrigger>
        {transitions.length > 0 && (
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Change status to</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {transitions.map((status) => {
              const cfg = STATUS_CONFIG[status]
              return (
                <DropdownMenuItem
                  key={status}
                  onClick={() => handleStatusSelect(status)}
                >
                  <Badge className={cfg.color}>{cfg.label}</Badge>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        )}
      </DropdownMenu>

      <Dialog open={reasonDialogOpen} onOpenChange={(v) => { setReasonDialogOpen(v); if (!v) { setPendingStatus(null); setReason('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reason Required</DialogTitle>
            <DialogDescription>
              Changing status to{' '}
              <strong>{pendingStatus ? STATUS_CONFIG[pendingStatus].label : ''}</strong>{' '}
              requires a reason for the audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reason-input">Reason for change</Label>
            <Input
              id="reason-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason..."
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleReasonSubmit} disabled={isPending || !reason.trim()}>
              {isPending && <Loader2Icon className="animate-spin" />}
              {isPending ? 'Updating...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function StatusBadge({ status }: { status: ParticipantStatus }) {
  const config = STATUS_CONFIG[status]
  return <Badge className={config.color}>{config.label}</Badge>
}

export { STATUS_CONFIG }
