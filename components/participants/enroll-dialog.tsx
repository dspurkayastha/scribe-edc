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
import { createParticipant } from '@/server/actions/participants'
import { PlusIcon, Loader2Icon } from 'lucide-react'

interface Site {
  id: string
  name: string
  code: string
}

interface EnrollDialogProps {
  studyId: string
  sites: Site[]
}

export function EnrollDialog({ studyId, sites }: EnrollDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [siteId, setSiteId] = useState<string | undefined>(undefined)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await createParticipant({
        studyId,
        siteId: siteId || undefined,
      })

      if (!result.success) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success(`Participant ${result.data.study_number} created`)
      setOpen(false)
      setSiteId(undefined)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setError(null); setSiteId(undefined) } }}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon />
          Enroll Participant
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enroll New Participant</DialogTitle>
          <DialogDescription>
            A new participant will be created with an auto-generated study number and set to screening status.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {sites.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="site-select">Site (optional)</Label>
              <Select value={siteId ?? ''} onValueChange={(v) => setSiteId(v || undefined)}>
                <SelectTrigger id="site-select" className="w-full">
                  <SelectValue placeholder="Select a site..." />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.code} - {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            {isPending ? 'Creating...' : 'Create Participant'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
