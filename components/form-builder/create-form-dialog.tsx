'use client'

import { useState, useTransition, useCallback } from 'react'
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
import { createFormDefinition } from '@/server/actions/form-builder'
import { PlusIcon, Loader2Icon } from 'lucide-react'
import { TemplatePicker } from './template-picker'
import type { FormTemplate } from '@/lib/templates/form-templates'
import type { FormSchema } from '@/types/form-schema'

interface CreateFormDialogProps {
  studyId: string
  basePath: string
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

export function CreateFormDialog({ studyId, basePath }: CreateFormDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null)

  function resetForm() {
    setTitle('')
    setSlug('')
    setSlugManuallyEdited(false)
    setError(null)
    setSelectedTemplateId(null)
    setSelectedTemplate(null)
  }

  const handleTitleChange = useCallback((value: string) => {
    setTitle(value)
    if (!slugManuallyEdited) {
      setSlug(slugify(value))
    }
  }, [slugManuallyEdited])

  function handleSubmit() {
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!slug.trim()) {
      setError('Slug is required')
      return
    }
    if (!/^[a-z][a-z0-9-]*$/.test(slug)) {
      setError('Slug must start with a letter and contain only lowercase letters, numbers, and hyphens')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await createFormDefinition({
        studyId,
        title: title.trim(),
        slug: slug.trim(),
        schema: selectedTemplate?.schema as unknown as Record<string, unknown>,
      })

      if (!result.success) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success(`Form "${result.data.title}" created`)
      setOpen(false)
      resetForm()
      router.push(`${basePath}/settings/forms/${result.data.slug}/edit`)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon />
          Create Form
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Form Definition</DialogTitle>
          <DialogDescription>
            Create a new CRF form for this study.
          </DialogDescription>
        </DialogHeader>

        <TemplatePicker
          selected={selectedTemplateId}
          onSelect={(template) => {
            if (template) {
              setSelectedTemplateId(template.id)
              setSelectedTemplate(template)
              if (!title) handleTitleChange(template.name)
            } else {
              setSelectedTemplateId(null)
              setSelectedTemplate(null)
            }
          }}
        />

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="form-title">Title</Label>
            <Input
              id="form-title"
              placeholder="e.g. Demographics"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="form-slug">Slug</Label>
            <Input
              id="form-slug"
              placeholder="e.g. demographics"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value)
                setSlugManuallyEdited(true)
              }}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              URL-safe identifier. Auto-generated from title.
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
            {isPending ? 'Creating...' : 'Create Form'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
