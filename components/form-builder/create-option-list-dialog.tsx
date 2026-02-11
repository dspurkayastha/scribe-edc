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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { PlusIcon, Loader2Icon } from 'lucide-react'
import { createOptionList } from '@/server/actions/option-lists'

interface CreateOptionListDialogProps {
  studyId: string
}

export function CreateOptionListDialog({ studyId }: CreateOptionListDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [slug, setSlug] = useState('')
  const [bulkOptions, setBulkOptions] = useState('')
  const [isSearchable, setIsSearchable] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
    setLabel('')
    setSlug('')
    setBulkOptions('')
    setIsSearchable(false)
    setError(null)
  }

  function handleSubmit() {
    if (!label.trim() || !slug.trim()) {
      setError('Label and slug are required')
      return
    }

    const options = bulkOptions
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [value, ...labelParts] = line.split('|')
        return { value: value.trim(), label: (labelParts.join('|').trim() || value.trim()) }
      })

    if (options.length === 0) {
      setError('At least one option is required')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await createOptionList({
        studyId,
        slug: slug.trim(),
        label: label.trim(),
        options,
        is_searchable: isSearchable,
      })

      if (!result.success) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success(`Option list "${result.data.label}" created`)
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
          Create Option List
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Option List</DialogTitle>
          <DialogDescription>
            Create a reusable list of options for dropdown, radio, or checkbox fields.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ol-label">Label</Label>
            <Input
              id="ol-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Countries"
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ol-slug">Slug</Label>
            <Input
              id="ol-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. countries"
              disabled={isPending}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ol-options">Options (value|label, one per line)</Label>
            <Textarea
              id="ol-options"
              value={bulkOptions}
              onChange={(e) => setBulkOptions(e.target.value)}
              placeholder={"us|United States\nuk|United Kingdom\nca|Canada"}
              rows={6}
              className="font-mono text-sm"
              disabled={isPending}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="ol-searchable">Searchable</Label>
            <Switch
              id="ol-searchable"
              checked={isSearchable}
              onCheckedChange={setIsSearchable}
              disabled={isPending}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2Icon className="animate-spin" />}
            {isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
