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
import { PencilIcon, Loader2Icon, TrashIcon } from 'lucide-react'
import { updateOptionList, deleteOptionList } from '@/server/actions/option-lists'
import type { OptionListRow } from '@/types/database'

interface EditOptionListDialogProps {
  optionList: OptionListRow
  studyId: string
}

export function EditOptionListDialog({ optionList, studyId }: EditOptionListDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState(optionList.label)
  const [bulkOptions, setBulkOptions] = useState(
    optionList.options.map((o) => `${o.value}|${o.label}`).join('\n')
  )
  const [isSearchable, setIsSearchable] = useState(optionList.is_searchable)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
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
      const result = await updateOptionList({
        id: optionList.id,
        studyId,
        label: label.trim(),
        options,
        is_searchable: isSearchable,
      })

      if (!result.success) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success('Option list updated')
      setOpen(false)
      router.refresh()
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteOptionList(optionList.id, studyId)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success('Option list deleted')
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <PencilIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Option List</DialogTitle>
          <DialogDescription>
            Update &quot;{optionList.label}&quot; ({optionList.slug})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-ol-label">Label</Label>
            <Input
              id="edit-ol-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-ol-options">Options (value|label, one per line)</Label>
            <Textarea
              id="edit-ol-options"
              value={bulkOptions}
              onChange={(e) => setBulkOptions(e.target.value)}
              rows={8}
              className="font-mono text-sm"
              disabled={isPending}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="edit-ol-searchable">Searchable</Label>
            <Switch
              id="edit-ol-searchable"
              checked={isSearchable}
              onCheckedChange={setIsSearchable}
              disabled={isPending}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
          >
            <TrashIcon className="h-4 w-4" />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending && <Loader2Icon className="animate-spin" />}
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
