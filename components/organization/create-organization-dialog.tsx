'use client'

import { useState, useTransition, useEffect } from 'react'
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
import { createOrganization } from '@/server/actions/organization'
import { Building2, Loader2Icon } from 'lucide-react'

interface CreateOrganizationDialogProps {
  /** Content to render as the trigger. If omitted, a default button is rendered. */
  trigger?: React.ReactNode
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

const SLUG_REGEX = /^[a-z0-9-]+$/

export function CreateOrganizationDialog({ trigger }: CreateOrganizationDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  // Auto-generate slug from name unless the user has manually edited the slug
  useEffect(() => {
    if (!slugTouched) {
      setSlug(slugify(name))
    }
  }, [name, slugTouched])

  function resetForm() {
    setName('')
    setSlug('')
    setSlugTouched(false)
    setError(null)
    setFieldErrors({})
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true)
    // Allow the user to type freely but only keep valid characters
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
  }

  function validate(): boolean {
    const errors: Record<string, string[]> = {}

    if (!name.trim() || name.trim().length < 2) {
      errors.name = ['Organization name must be at least 2 characters']
    }
    if (name.trim().length > 200) {
      errors.name = ['Organization name must be 200 characters or fewer']
    }

    if (!slug || slug.length < 2) {
      errors.slug = ['Slug must be at least 2 characters']
    } else if (slug.length > 50) {
      errors.slug = ['Slug must be 50 characters or fewer']
    } else if (!SLUG_REGEX.test(slug)) {
      errors.slug = ['Slug may only contain lowercase letters, numbers, and hyphens']
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  function handleSubmit() {
    if (!validate()) return

    setError(null)
    setFieldErrors({})

    startTransition(async () => {
      const result = await createOrganization({
        name: name.trim(),
        slug,
      })

      if (!result.success) {
        setError(result.error)
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors)
        }
        toast.error(result.error)
        return
      }

      toast.success(`Organization "${result.data.name}" created`)
      setOpen(false)
      resetForm()
      router.push(`/org/${result.data.slug}/studies/new`)
    })
  }

  const defaultTrigger = (
    <Button>
      <Building2 className="mr-2 h-4 w-4" />
      Create Organization
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
      <DialogTrigger asChild>
        {trigger ?? defaultTrigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>
            An organization groups your clinical studies together. You can create studies within it once it exists.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              placeholder="e.g. Acme Clinical Research"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              autoFocus
            />
            {fieldErrors.name && (
              <p className="text-xs text-destructive">{fieldErrors.name[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-slug">URL Slug</Label>
            <Input
              id="org-slug"
              placeholder="e.g. acme-clinical-research"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              This will appear in your URLs: /org/<span className="font-mono">{slug || '...'}</span>/
            </p>
            {fieldErrors.slug && (
              <p className="text-xs text-destructive">{fieldErrors.slug[0]}</p>
            )}
          </div>

          {error && !fieldErrors.name && !fieldErrors.slug && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2Icon className="animate-spin" />}
            {isPending ? 'Creating...' : 'Create Organization'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
