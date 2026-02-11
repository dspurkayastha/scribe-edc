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
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2Icon, ShuffleIcon, CheckCircle2Icon } from 'lucide-react'
import { randomizeParticipant } from '@/server/actions/randomization'

interface RandomizeDialogProps {
  studyId: string
  participantId: string
  participantNumber: string
}

export function RandomizeDialog({
  studyId,
  participantId,
  participantNumber,
}: RandomizeDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<{ armLabel: string; armName: string } | null>(null)

  function handleRandomize() {
    startTransition(async () => {
      const res = await randomizeParticipant(studyId, participantId)

      if (!res.success) {
        toast.error(res.error)
        return
      }

      setResult({
        armLabel: res.data.arm.label,
        armName: res.data.arm.name,
      })
      toast.success(`Participant randomized to ${res.data.arm.label}`)
      router.refresh()
    })
  }

  function handleClose() {
    setOpen(false)
    setResult(null)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) setResult(null)
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="default">
          <ShuffleIcon className="h-4 w-4 mr-1" />
          Randomize
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Randomize Participant</DialogTitle>
          <DialogDescription>
            {result
              ? 'Randomization complete.'
              : `This will randomly assign ${participantNumber} to a treatment arm. This action cannot be undone.`}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <CheckCircle2Icon className="h-8 w-8 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Assigned to</p>
                  <p className="text-lg font-semibold">{result.armLabel}</p>
                  <Badge variant="outline" className="mt-1">{result.armName}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              Participant <strong>{participantNumber}</strong> will be randomly assigned
              to a treatment arm based on the study&apos;s allocation ratios.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              The participant&apos;s status will be updated to <Badge className="bg-violet-100 text-violet-800">Randomized</Badge>.
            </p>
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRandomize}
                disabled={isPending}
              >
                {isPending && <Loader2Icon className="h-4 w-4 animate-spin mr-1" />}
                {isPending ? 'Randomizing...' : 'Confirm Randomization'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface AllocationDisplayProps {
  armLabel: string
  armName: string
  randomizedAt: string
}

export function AllocationDisplay({ armLabel, armName, randomizedAt }: AllocationDisplayProps) {
  return (
    <Card className="border-violet-200">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Treatment Arm</p>
            <p className="text-lg font-semibold">{armLabel}</p>
            <Badge variant="outline" className="mt-1">{armName}</Badge>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Randomized</p>
            <p className="text-sm">
              {new Date(randomizedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
