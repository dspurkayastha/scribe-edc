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
import { updateStudyDetails } from '@/server/actions/study-settings'
import type { StudyRow, StudyType, StudyStatus } from '@/types/database'
import { PencilIcon, Loader2Icon } from 'lucide-react'

const STUDY_TYPE_OPTIONS: { value: StudyType; label: string }[] = [
  { value: 'parallel_rct', label: 'Parallel RCT' },
  { value: 'crossover_rct', label: 'Crossover RCT' },
  { value: 'factorial', label: 'Factorial' },
  { value: 'cluster_rct', label: 'Cluster RCT' },
  { value: 'single_arm', label: 'Single Arm' },
  { value: 'observational', label: 'Observational' },
  { value: 'case_control', label: 'Case-Control' },
  { value: 'registry', label: 'Registry' },
]

const STATUS_OPTIONS: { value: StudyStatus; label: string }[] = [
  { value: 'setup', label: 'Setup' },
  { value: 'recruiting', label: 'Recruiting' },
  { value: 'paused', label: 'Paused' },
  { value: 'closed', label: 'Closed' },
  { value: 'archived', label: 'Archived' },
]

const BLINDING_OPTIONS = [
  { value: 'open_label', label: 'Open Label' },
  { value: 'single_blind', label: 'Single Blind' },
  { value: 'double_blind', label: 'Double Blind' },
  { value: 'triple_blind', label: 'Triple Blind' },
  { value: 'none', label: 'None / Not Applicable' },
]

const PHASE_OPTIONS = [
  { value: 'phase_1', label: 'Phase I' },
  { value: 'phase_1_2', label: 'Phase I/II' },
  { value: 'phase_2', label: 'Phase II' },
  { value: 'phase_2_3', label: 'Phase II/III' },
  { value: 'phase_3', label: 'Phase III' },
  { value: 'phase_4', label: 'Phase IV' },
  { value: 'not_applicable', label: 'Not Applicable' },
]

interface EditStudySettingsDialogProps {
  study: StudyRow
}

export function EditStudySettingsDialog({ study }: EditStudySettingsDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Form state pre-populated from the study
  const [name, setName] = useState(study.name)
  const [shortName, setShortName] = useState(study.short_name)
  const [studyType, setStudyType] = useState<StudyType>(study.study_type)
  const [status, setStatus] = useState<StudyStatus>(study.status)
  const [blinding, setBlinding] = useState<string>(
    (study.settings?.blinding as string) ?? ''
  )
  const [phase, setPhase] = useState<string>(
    (study.settings?.phase as string) ?? ''
  )

  function resetForm() {
    setName(study.name)
    setShortName(study.short_name)
    setStudyType(study.study_type)
    setStatus(study.status)
    setBlinding((study.settings?.blinding as string) ?? '')
    setPhase((study.settings?.phase as string) ?? '')
    setError(null)
  }

  function handleSubmit() {
    if (!name.trim()) {
      setError('Study name is required')
      return
    }
    if (!shortName.trim()) {
      setError('Short name is required')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await updateStudyDetails(study.id, {
        name: name.trim(),
        shortName: shortName.trim(),
        studyType,
        status,
        blinding: blinding || undefined,
        phase: phase || undefined,
      })

      if (!result.success) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success('Study settings updated')
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PencilIcon className="h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Study Settings</DialogTitle>
          <DialogDescription>
            Update the core study configuration. Changes will take effect immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Study Name */}
          <div className="space-y-2">
            <Label htmlFor="study-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="study-name"
              placeholder="e.g. Phase III Trial of Drug X"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
            />
          </div>

          {/* Short Name */}
          <div className="space-y-2">
            <Label htmlFor="study-short-name">
              Short Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="study-short-name"
              placeholder="e.g. DRUG-X-301"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              A concise identifier shown in navigation and headers.
            </p>
          </div>

          {/* Study Type */}
          <div className="space-y-2">
            <Label htmlFor="study-type">Study Type</Label>
            <Select
              value={studyType}
              onValueChange={(v) => setStudyType(v as StudyType)}
              disabled={isPending}
            >
              <SelectTrigger id="study-type" className="w-full">
                <SelectValue placeholder="Select study type" />
              </SelectTrigger>
              <SelectContent>
                {STUDY_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="study-status">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as StudyStatus)}
              disabled={isPending}
            >
              <SelectTrigger id="study-status" className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Blinding */}
          <div className="space-y-2">
            <Label htmlFor="study-blinding">Blinding</Label>
            <Select
              value={blinding}
              onValueChange={(v) => setBlinding(v)}
              disabled={isPending}
            >
              <SelectTrigger id="study-blinding" className="w-full">
                <SelectValue placeholder="Select blinding type" />
              </SelectTrigger>
              <SelectContent>
                {BLINDING_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Phase */}
          <div className="space-y-2">
            <Label htmlFor="study-phase">Phase</Label>
            <Select
              value={phase}
              onValueChange={(v) => setPhase(v)}
              disabled={isPending}
            >
              <SelectTrigger id="study-phase" className="w-full">
                <SelectValue placeholder="Select study phase" />
              </SelectTrigger>
              <SelectContent>
                {PHASE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
