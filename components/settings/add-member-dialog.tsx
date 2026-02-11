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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { addStudyMember } from '@/server/actions/study'
import { PlusIcon, Loader2Icon } from 'lucide-react'
import type { MemberRole } from '@/types/database'

const ROLE_OPTIONS: { value: MemberRole; label: string }[] = [
  { value: 'pi', label: 'Principal Investigator' },
  { value: 'co_investigator', label: 'Co-Investigator' },
  { value: 'data_entry', label: 'Data Entry' },
  { value: 'read_only', label: 'Read Only' },
  { value: 'monitor', label: 'Monitor' },
]

interface Site {
  id: string
  name: string
  code: string
}

interface AddMemberDialogProps {
  studyId: string
  sites: Site[]
}

export function AddMemberDialog({ studyId, sites }: AddMemberDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('data_entry')
  const [siteId, setSiteId] = useState<string | undefined>(undefined)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
    setEmail('')
    setRole('data_entry')
    setSiteId(undefined)
    setError(null)
  }

  function handleSubmit() {
    if (!email.trim()) {
      setError('Email is required')
      return
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await addStudyMember(studyId, {
        email: email.trim().toLowerCase(),
        role,
        siteId: siteId || undefined,
      })

      if (!result.success) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success(`Member added with role ${role}`)
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
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Add a user to this study by their email address. The user must already have an account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="member-email">Email Address</Label>
            <Input
              id="member-email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="member-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
              <SelectTrigger id="member-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {sites.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="member-site">Site Assignment (optional)</Label>
              <Select value={siteId ?? ''} onValueChange={(v) => setSiteId(v || undefined)}>
                <SelectTrigger id="member-site" className="w-full">
                  <SelectValue placeholder="All sites" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.code} - {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Leave blank to grant access to all sites.
              </p>
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
            {isPending ? 'Adding...' : 'Add Member'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
