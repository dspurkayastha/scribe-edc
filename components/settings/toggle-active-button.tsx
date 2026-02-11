'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Loader2Icon } from 'lucide-react'
import {
  updateStudyArm,
  updateStudySite,
  updateStudyEvent,
  removeStudyMember,
} from '@/server/actions/study'

type EntityType = 'arm' | 'site' | 'event' | 'member'

interface ToggleActiveButtonProps {
  entityType: EntityType
  entityId: string
  studyId: string
  isActive: boolean
  entityName: string
}

export function ToggleActiveButton({
  entityType,
  entityId,
  studyId,
  isActive,
  entityName,
}: ToggleActiveButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  function handleToggle() {
    startTransition(async () => {
      let result: { success: boolean; error?: string }

      switch (entityType) {
        case 'arm':
          result = await updateStudyArm(entityId, studyId, { is_active: !isActive })
          break
        case 'site':
          result = await updateStudySite(entityId, studyId, { is_active: !isActive })
          break
        case 'event':
          result = await updateStudyEvent(entityId, studyId, { is_active: !isActive })
          break
        case 'member':
          // Members use removeStudyMember (set is_active=false) — no re-activate via this button
          result = await removeStudyMember(entityId, studyId)
          break
        default:
          result = { success: false, error: 'Unknown entity type' }
      }

      if (!result.success) {
        toast.error(result.error ?? 'Failed to update')
        setOpen(false)
        return
      }

      const action = isActive ? 'deactivated' : 'activated'
      toast.success(`${entityName} ${action}`)
      setOpen(false)
      router.refresh()
    })
  }

  // If activating, no confirmation needed
  if (!isActive && entityType !== 'member') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          startTransition(async () => {
            let result: { success: boolean; error?: string }
            switch (entityType) {
              case 'arm':
                result = await updateStudyArm(entityId, studyId, { is_active: true })
                break
              case 'site':
                result = await updateStudySite(entityId, studyId, { is_active: true })
                break
              case 'event':
                result = await updateStudyEvent(entityId, studyId, { is_active: true })
                break
              default:
                result = { success: false, error: 'Unknown entity type' }
            }
            if (!result.success) {
              toast.error(result.error ?? 'Failed to activate')
              return
            }
            toast.success(`${entityName} activated`)
            router.refresh()
          })
        }}
        disabled={isPending}
      >
        {isPending && <Loader2Icon className="animate-spin mr-1 h-3 w-3" />}
        Activate
      </Button>
    )
  }

  // Deactivating requires confirmation
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
          {entityType === 'member' ? 'Remove' : 'Deactivate'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {entityType === 'member' ? 'Remove Member' : 'Deactivate'} {entityName}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {entityType === 'member'
              ? `This will remove ${entityName} from the study. They will no longer have access.`
              : `This will deactivate ${entityName}. It will no longer be available for new data entry but existing data will be preserved.`
            }
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleToggle} disabled={isPending}>
            {isPending && <Loader2Icon className="animate-spin mr-1 h-3 w-3" />}
            {entityType === 'member' ? 'Remove' : 'Deactivate'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
