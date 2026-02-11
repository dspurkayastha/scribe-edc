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
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2Icon, PencilIcon } from 'lucide-react'
import { updateAdverseEvent } from '@/server/actions/adverse-events'
import type { AdverseEventRow, AeSeverity, AeRelatedness, AeOutcome } from '@/types/database'

interface EditAeDialogProps {
  ae: AdverseEventRow
  studyId: string
}

const SEVERITY_OPTIONS: { value: AeSeverity; label: string }[] = [
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
]

const RELATEDNESS_OPTIONS: { value: AeRelatedness; label: string }[] = [
  { value: 'unrelated', label: 'Unrelated' },
  { value: 'unlikely', label: 'Unlikely' },
  { value: 'possible', label: 'Possible' },
  { value: 'probable', label: 'Probable' },
  { value: 'definite', label: 'Definite' },
]

const OUTCOME_OPTIONS: { value: AeOutcome; label: string }[] = [
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'resolved_with_sequelae', label: 'Resolved with Sequelae' },
  { value: 'fatal', label: 'Fatal' },
  { value: 'unknown', label: 'Unknown' },
]

const SAE_CRITERIA = [
  'Death',
  'Life-threatening',
  'Inpatient hospitalization or prolongation',
  'Persistent or significant disability/incapacity',
  'Congenital anomaly/birth defect',
  'Important medical event',
]

export function EditAeDialog({ ae, studyId }: EditAeDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const [description, setDescription] = useState(ae.description)
  const [onsetDate, setOnsetDate] = useState(ae.onset_date)
  const [resolutionDate, setResolutionDate] = useState(ae.resolution_date ?? '')
  const [severity, setSeverity] = useState<AeSeverity>(ae.severity)
  const [relatedness, setRelatedness] = useState<AeRelatedness>(ae.relatedness)
  const [outcome, setOutcome] = useState<AeOutcome>(ae.outcome)
  const [isSae, setIsSae] = useState(ae.is_sae)
  const [saeCriteria, setSaeCriteria] = useState<string[]>(ae.sae_criteria ?? [])

  // Re-sync form state when the AE prop changes (e.g. after a refresh)
  useEffect(() => {
    setDescription(ae.description)
    setOnsetDate(ae.onset_date)
    setResolutionDate(ae.resolution_date ?? '')
    setSeverity(ae.severity)
    setRelatedness(ae.relatedness)
    setOutcome(ae.outcome)
    setIsSae(ae.is_sae)
    setSaeCriteria(ae.sae_criteria ?? [])
  }, [ae])

  function resetForm() {
    setDescription(ae.description)
    setOnsetDate(ae.onset_date)
    setResolutionDate(ae.resolution_date ?? '')
    setSeverity(ae.severity)
    setRelatedness(ae.relatedness)
    setOutcome(ae.outcome)
    setIsSae(ae.is_sae)
    setSaeCriteria(ae.sae_criteria ?? [])
  }

  function toggleSaeCriteria(criteria: string) {
    setSaeCriteria((prev) =>
      prev.includes(criteria)
        ? prev.filter((c) => c !== criteria)
        : [...prev, criteria]
    )
  }

  function handleSubmit() {
    if (!description.trim() || !onsetDate) return

    startTransition(async () => {
      const result = await updateAdverseEvent(ae.id, studyId, {
        description: description.trim(),
        onsetDate,
        resolutionDate: resolutionDate || null,
        severity,
        relatedness,
        outcome,
        isSae,
        saeCriteria: isSae ? saeCriteria : null,
      })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success('Adverse Event updated successfully')
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) resetForm()
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
          <PencilIcon className="h-3.5 w-3.5" />
          <span className="sr-only">Edit adverse event</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Adverse Event #{ae.event_number}</DialogTitle>
          <DialogDescription>
            Update the details of this adverse event. All fields are required unless noted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor={`edit-ae-description-${ae.id}`}>Description</Label>
            <Textarea
              id={`edit-ae-description-${ae.id}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the adverse event in detail..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`edit-ae-onset-date-${ae.id}`}>Onset Date</Label>
              <Input
                id={`edit-ae-onset-date-${ae.id}`}
                type="date"
                value={onsetDate}
                onChange={(e) => setOnsetDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`edit-ae-resolution-date-${ae.id}`}>
                Resolution Date <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id={`edit-ae-resolution-date-${ae.id}`}
                type="date"
                value={resolutionDate}
                onChange={(e) => setResolutionDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`edit-ae-severity-${ae.id}`}>Severity</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as AeSeverity)}>
                <SelectTrigger id={`edit-ae-severity-${ae.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`edit-ae-relatedness-${ae.id}`}>Relatedness</Label>
              <Select value={relatedness} onValueChange={(v) => setRelatedness(v as AeRelatedness)}>
                <SelectTrigger id={`edit-ae-relatedness-${ae.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELATEDNESS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`edit-ae-outcome-${ae.id}`}>Outcome</Label>
              <Select value={outcome} onValueChange={(v) => setOutcome(v as AeOutcome)}>
                <SelectTrigger id={`edit-ae-outcome-${ae.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTCOME_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id={`edit-ae-is-sae-${ae.id}`}
              checked={isSae}
              onCheckedChange={(checked) => setIsSae(checked === true)}
            />
            <Label htmlFor={`edit-ae-is-sae-${ae.id}`} className="font-medium">
              This is a Serious Adverse Event (SAE)
            </Label>
          </div>

          {isSae && (
            <div className="space-y-2 pl-6 border-l-2 border-red-200">
              <Label className="text-sm text-red-700">SAE Criteria (select all that apply)</Label>
              {SAE_CRITERIA.map((criteria) => (
                <div key={criteria} className="flex items-center space-x-2">
                  <Checkbox
                    id={`edit-sae-${ae.id}-${criteria}`}
                    checked={saeCriteria.includes(criteria)}
                    onCheckedChange={() => toggleSaeCriteria(criteria)}
                  />
                  <Label htmlFor={`edit-sae-${ae.id}-${criteria}`} className="text-sm font-normal">
                    {criteria}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !description.trim() || !onsetDate}
          >
            {isPending && <Loader2Icon className="h-4 w-4 animate-spin mr-1" />}
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
