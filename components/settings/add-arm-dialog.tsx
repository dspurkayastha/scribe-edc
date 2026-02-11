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
import { createStudyArm } from '@/server/actions/study'
import { PlusIcon, Loader2Icon } from 'lucide-react'

interface AddArmDialogProps {
  studyId: string
}

export function AddArmDialog({ studyId }: AddArmDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [label, setLabel] = useState('')
  const [allocation, setAllocation] = useState('1')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
    setName('')
    setLabel('')
    setAllocation('1')
    setError(null)
  }

  function handleSubmit() {
    if (!name.trim() || !label.trim()) {
      setError('Name and label are required')
      return
    }

    const allocationNum = parseInt(allocation, 10)
    if (isNaN(allocationNum) || allocationNum < 1) {
      setError('Allocation ratio must be a positive number')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await createStudyArm(studyId, {
        name: name.trim(),
        label: label.trim(),
        allocation: allocationNum,
      })

      if (!result.success) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success(`Arm "${result.data.name}" created`)
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
          Add Arm
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Study Arm</DialogTitle>
          <DialogDescription>
            Create a new treatment arm for this study. Arms define the treatment groups for randomization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="arm-name">Name</Label>
            <Input
              id="arm-name"
              placeholder="e.g. treatment_a"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="arm-label">Label</Label>
            <Input
              id="arm-label"
              placeholder="e.g. Treatment Group A"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="arm-allocation">Allocation Ratio</Label>
            <Input
              id="arm-allocation"
              type="number"
              min={1}
              placeholder="1"
              value={allocation}
              onChange={(e) => setAllocation(e.target.value)}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Relative allocation weight. Use 1:1 for equal allocation, 2:1 for 2-to-1, etc.
            </p>
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
            {isPending ? 'Creating...' : 'Create Arm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
