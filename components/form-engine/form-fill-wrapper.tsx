'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FormRenderer } from './form-renderer'
import { parseFormSchema } from '@/lib/form-engine/schema-parser'
import { saveFormDraft, submitForm } from '@/server/actions/forms'
import { verifyForm, lockForm, unlockForm, editCompletedForm } from '@/server/actions/form-workflow'
import { signForm } from '@/server/actions/signatures'
import { ReasonForChangeDialog } from './reason-for-change-dialog'
import type { FormDefinitionRow, FormResponseRow, FormResponseStatus, SignatureRow, MemberRole } from '@/types/database'
import type { Rule } from '@/types/form-schema'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Loader2Icon,
  CheckCircle2Icon,
  ShieldCheckIcon,
  LockIcon,
  UnlockIcon,
  PenLineIcon,
  PencilIcon,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FormFillWrapperProps {
  formDefinition: FormDefinitionRow
  existingResponse: FormResponseRow | null
  participantId: string
  studyId: string
  signatures: SignatureRow[]
  userRole: MemberRole
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FormFillWrapper({
  formDefinition,
  existingResponse,
  participantId,
  studyId,
  signatures,
  userRole,
}: FormFillWrapperProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Track local response so we can update status/updatedAt after actions
  const [response, setResponse] = useState<FormResponseRow | null>(existingResponse)

  // Dialog state
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false)
  const [unlockReason, setUnlockReason] = useState('')
  const [signDialogOpen, setSignDialogOpen] = useState(false)
  const [signMeaning, setSignMeaning] = useState('')
  const [signPassword, setSignPassword] = useState('')
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  // Derived state
  const status: FormResponseStatus = response?.status ?? 'draft'
  const isReadOnly = status === 'locked' || status === 'signed'
  const canEditCompleted =
    (userRole === 'pi' || userRole === 'co_investigator') &&
    (status === 'complete' || status === 'verified' || status === 'locked')

  // Parse the schema once
  const schema = parseFormSchema(formDefinition.schema as any)
  const rules = (formDefinition.rules ?? []) as Rule[]

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function handleSaveDraft(data: Record<string, unknown>) {
    startTransition(async () => {
      const result = await saveFormDraft({
        studyId,
        participantId,
        formId: formDefinition.id,
        formVersion: formDefinition.version,
        data,
      })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      setResponse(result.data)
      toast.success('Draft saved')
    })
  }

  function handleSubmit(data: Record<string, unknown>) {
    startTransition(async () => {
      const result = await submitForm({
        studyId,
        participantId,
        formId: formDefinition.id,
        formVersion: formDefinition.version,
        data,
      })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      setResponse(result.data)
      toast.success('Form submitted successfully')
      router.refresh()
    })
  }

  function handleVerify() {
    if (!response) return
    startTransition(async () => {
      const result = await verifyForm(response.id, studyId, response.updated_at)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success('Form verified')
      router.refresh()
    })
  }

  function handleLock() {
    if (!response) return
    startTransition(async () => {
      const result = await lockForm(response.id, studyId, response.updated_at)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success('Form locked')
      router.refresh()
    })
  }

  function handleUnlock() {
    if (!response) return
    if (unlockReason.trim().length < 5) {
      toast.error('Reason must be at least 5 characters')
      return
    }

    startTransition(async () => {
      const result = await unlockForm(response.id, studyId, unlockReason, response.updated_at)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success('Form unlocked')
      setUnlockDialogOpen(false)
      setUnlockReason('')
      router.refresh()
    })
  }

  function handleSign() {
    if (!response) return
    if (!signMeaning.trim()) {
      toast.error('Signature meaning is required')
      return
    }
    if (!signPassword) {
      toast.error('Password is required for electronic signature')
      return
    }

    startTransition(async () => {
      const result = await signForm({
        studyId,
        formResponseId: response.id,
        meaning: signMeaning,
        password: signPassword,
      })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success('Form signed successfully')
      setSignDialogOpen(false)
      setSignMeaning('')
      setSignPassword('')
      router.refresh()
    })
  }

  function handleEditCompleted(reason: string) {
    if (!response) return

    startTransition(async () => {
      const currentData = (response.data as Record<string, unknown>) ?? {}
      const result = await editCompletedForm(
        response.id,
        studyId,
        reason,
        currentData,
        response.updated_at,
      )

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success('Form returned to draft for editing')
      setEditDialogOpen(false)
      router.refresh()
    })
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Form renderer */}
      <FormRenderer
        schema={schema}
        rules={rules}
        defaultValues={(response?.data as Record<string, unknown>) ?? {}}
        status={status}
        onSaveDraft={!isReadOnly ? handleSaveDraft : undefined}
        onSubmit={!isReadOnly && status === 'draft' ? handleSubmit : undefined}
        readOnly={isReadOnly}
      />

      {/* Workflow action buttons */}
      {response && (
        <>
          <Separator />
          <div className="flex flex-wrap items-center gap-3">
            {/* Complete -> Verify */}
            {status === 'complete' && (
              <Button onClick={handleVerify} disabled={isPending}>
                {isPending ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <CheckCircle2Icon />
                )}
                Verify
              </Button>
            )}

            {/* Verified -> Lock */}
            {status === 'verified' && (
              <Button onClick={handleLock} disabled={isPending}>
                {isPending ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <ShieldCheckIcon />
                )}
                Lock
              </Button>
            )}

            {/* Locked -> Sign / Unlock */}
            {status === 'locked' && (
              <>
                <Button
                  onClick={() => setSignDialogOpen(true)}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <PenLineIcon />
                  )}
                  Sign
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setUnlockDialogOpen(true)}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <UnlockIcon />
                  )}
                  Unlock
                </Button>
              </>
            )}

            {/* Signed status - show existing signatures */}
            {status === 'signed' && (
              <Button
                variant="outline"
                onClick={() => setUnlockDialogOpen(true)}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <UnlockIcon />
                )}
                Unlock
              </Button>
            )}

            {/* Edit completed form (PI / Co-Investigator only) */}
            {canEditCompleted && (
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(true)}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <PencilIcon />
                )}
                Edit
              </Button>
            )}
          </div>
        </>
      )}

      {/* Existing signatures display */}
      {signatures.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Signatures
          </h3>
          <div className="space-y-2">
            {signatures.map((sig) => (
              <div
                key={sig.id}
                className="flex items-center gap-3 rounded-md border px-4 py-2 text-sm"
              >
                <LockIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {sig.signer_name}{' '}
                    <span className="text-muted-foreground font-normal">
                      ({sig.signer_role})
                    </span>
                  </p>
                  <p className="text-muted-foreground truncate">
                    {sig.meaning}
                  </p>
                </div>
                <time className="text-xs text-muted-foreground shrink-0">
                  {new Date(sig.signed_at).toLocaleString()}
                </time>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unlock dialog */}
      <Dialog open={unlockDialogOpen} onOpenChange={(v) => { setUnlockDialogOpen(v); if (!v) setUnlockReason('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock Form</DialogTitle>
            <DialogDescription>
              Unlocking this form will return it to draft status. A reason is
              required and will be recorded in the audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="unlock-reason">Reason for unlocking</Label>
            <Textarea
              id="unlock-reason"
              placeholder="Enter the reason for unlocking this form..."
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUnlockDialogOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUnlock}
              disabled={isPending || unlockReason.trim().length < 5}
            >
              {isPending && <Loader2Icon className="animate-spin" />}
              {isPending ? 'Unlocking...' : 'Unlock Form'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign dialog */}
      <Dialog open={signDialogOpen} onOpenChange={(v) => { setSignDialogOpen(v); if (!v) { setSignMeaning(''); setSignPassword('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Electronic Signature</DialogTitle>
            <DialogDescription>
              By signing below you confirm the accuracy and completeness of the
              data in this form. Your password is required to authenticate this
              signature per 21 CFR Part 11.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="sign-meaning">Meaning of signature</Label>
              <Input
                id="sign-meaning"
                placeholder="e.g. I have reviewed and approve this data"
                value={signMeaning}
                onChange={(e) => setSignMeaning(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sign-password">Password</Label>
              <Input
                id="sign-password"
                type="password"
                placeholder="Enter your account password"
                value={signPassword}
                onChange={(e) => setSignPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSignDialogOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSign}
              disabled={isPending || !signMeaning.trim() || !signPassword}
            >
              {isPending && <Loader2Icon className="animate-spin" />}
              {isPending ? 'Signing...' : 'Apply Signature'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reason for change dialog (edit completed form) */}
      <ReasonForChangeDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSubmit={handleEditCompleted}
        isPending={isPending}
      />
    </div>
  )
}
