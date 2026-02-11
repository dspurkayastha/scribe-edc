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
import { Loader2Icon, AlertTriangleIcon } from 'lucide-react'
import { createAdverseEvent } from '@/server/actions/adverse-events'
import type { AeSeverity, AeRelatedness, AeOutcome } from '@/types/database'

interface ReportAeDialogProps {
  studyId: string
  participantId: string
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

export function ReportAeDialog({ studyId, participantId }: ReportAeDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const [description, setDescription] = useState('')
  const [onsetDate, setOnsetDate] = useState('')
  const [severity, setSeverity] = useState<AeSeverity>('mild')
  const [relatedness, setRelatedness] = useState<AeRelatedness>('unrelated')
  const [outcome, setOutcome] = useState<AeOutcome>('ongoing')
  const [isSae, setIsSae] = useState(false)
  const [saeCriteria, setSaeCriteria] = useState<string[]>([])

  function resetForm() {
    setDescription('')
    setOnsetDate('')
    setSeverity('mild')
    setRelatedness('unrelated')
    setOutcome('ongoing')
    setIsSae(false)
    setSaeCriteria([])
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
      const result = await createAdverseEvent(studyId, {
        participantId,
        description: description.trim(),
        onsetDate,
        severity,
        relatedness,
        outcome,
        isSae,
        saeCriteria: isSae ? saeCriteria : undefined,
      })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(
        isSae
          ? 'Serious Adverse Event reported successfully'
          : 'Adverse Event reported successfully'
      )
      setOpen(false)
      resetForm()
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
        <Button size="sm" variant="outline">
          <AlertTriangleIcon className="h-4 w-4 mr-1" />
          Report AE
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report Adverse Event</DialogTitle>
          <DialogDescription>
            Document an adverse event for this participant. All fields are required unless noted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ae-description">Description</Label>
            <Textarea
              id="ae-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the adverse event in detail..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ae-onset-date">Onset Date</Label>
            <Input
              id="ae-onset-date"
              type="date"
              value={onsetDate}
              onChange={(e) => setOnsetDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ae-severity">Severity</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as AeSeverity)}>
                <SelectTrigger id="ae-severity">
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
              <Label htmlFor="ae-relatedness">Relatedness</Label>
              <Select value={relatedness} onValueChange={(v) => setRelatedness(v as AeRelatedness)}>
                <SelectTrigger id="ae-relatedness">
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
              <Label htmlFor="ae-outcome">Outcome</Label>
              <Select value={outcome} onValueChange={(v) => setOutcome(v as AeOutcome)}>
                <SelectTrigger id="ae-outcome">
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
              id="ae-is-sae"
              checked={isSae}
              onCheckedChange={(checked) => setIsSae(checked === true)}
            />
            <Label htmlFor="ae-is-sae" className="font-medium">
              This is a Serious Adverse Event (SAE)
            </Label>
          </div>

          {isSae && (
            <div className="space-y-2 pl-6 border-l-2 border-red-200">
              <Label className="text-sm text-red-700">SAE Criteria (select all that apply)</Label>
              {SAE_CRITERIA.map((criteria) => (
                <div key={criteria} className="flex items-center space-x-2">
                  <Checkbox
                    id={`sae-${criteria}`}
                    checked={saeCriteria.includes(criteria)}
                    onCheckedChange={() => toggleSaeCriteria(criteria)}
                  />
                  <Label htmlFor={`sae-${criteria}`} className="text-sm font-normal">
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
            variant={isSae ? 'destructive' : 'default'}
          >
            {isPending && <Loader2Icon className="h-4 w-4 animate-spin mr-1" />}
            {isPending ? 'Reporting...' : isSae ? 'Report SAE' : 'Report AE'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
