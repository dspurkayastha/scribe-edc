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
import { createStudySite } from '@/server/actions/study'
import { PlusIcon, Loader2Icon } from 'lucide-react'

interface AddSiteDialogProps {
  studyId: string
}

export function AddSiteDialog({ studyId }: AddSiteDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
    setName('')
    setCode('')
    setError(null)
  }

  function handleSubmit() {
    if (!name.trim() || !code.trim()) {
      setError('Name and code are required')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await createStudySite(studyId, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
      })

      if (!result.success) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success(`Site "${result.data.name}" created`)
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
          Add Site
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Study Site</DialogTitle>
          <DialogDescription>
            Add a new participating site for this study. Sites represent institutions or clinics.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="site-name">Site Name</Label>
            <Input
              id="site-name"
              placeholder="e.g. City General Hospital"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="site-code">Site Code</Label>
            <Input
              id="site-code"
              placeholder="e.g. CGH-01"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              A short unique identifier for this site. Will be converted to uppercase.
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
            {isPending ? 'Creating...' : 'Create Site'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
