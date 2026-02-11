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
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { duplicateFormDefinition } from '@/server/actions/form-builder'
import { Loader2Icon } from 'lucide-react'

interface DuplicateFormDialogProps {
  formId: string
  studyId: string
  originalTitle: string
  originalSlug: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DuplicateFormDialog({
  formId,
  studyId,
  originalTitle,
  originalSlug,
  open,
  onOpenChange,
}: DuplicateFormDialogProps) {
  const router = useRouter()
  const [title, setTitle] = useState(`${originalTitle} (Copy)`)
  const [slug, setSlug] = useState(`${originalSlug}-copy`)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
    setTitle(`${originalTitle} (Copy)`)
    setSlug(`${originalSlug}-copy`)
    setError(null)
  }

  function handleSubmit() {
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!slug.trim() || !/^[a-z][a-z0-9-]*$/.test(slug)) {
      setError('Slug must start with a letter and contain only lowercase letters, numbers, and hyphens')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await duplicateFormDefinition({
        formId,
        studyId,
        newTitle: title.trim(),
        newSlug: slug.trim(),
      })

      if (!result.success) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success(`Form duplicated as "${result.data.title}"`)
      onOpenChange(false)
      resetForm()
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate Form</DialogTitle>
          <DialogDescription>
            Create a copy of &quot;{originalTitle}&quot; with a new slug.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="dup-title">New Title</Label>
            <Input
              id="dup-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dup-slug">New Slug</Label>
            <Input
              id="dup-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={isPending}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2Icon className="animate-spin" />}
            {isPending ? 'Duplicating...' : 'Duplicate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
