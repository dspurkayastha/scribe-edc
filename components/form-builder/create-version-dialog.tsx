'use client'

import { useTransition } from 'react'
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
} from '@/components/ui/alert-dialog'
import { Loader2Icon } from 'lucide-react'
import { createFormVersion } from '@/server/actions/form-builder'

interface CreateVersionDialogProps {
  formId: string
  studyId: string
  currentVersion: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateVersionDialog({
  formId,
  studyId,
  currentVersion,
  open,
  onOpenChange,
}: CreateVersionDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleCreate() {
    startTransition(async () => {
      const result = await createFormVersion(formId, studyId)

      if (!result.success) {
        toast.error(result.error)
        onOpenChange(false)
        return
      }

      toast.success(`Version ${result.data.version} created`)
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Create New Version</AlertDialogTitle>
          <AlertDialogDescription>
            This will create version {currentVersion + 1} as a copy of the current
            version {currentVersion}. The current version will be deactivated.
            Existing form responses will remain linked to version {currentVersion}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleCreate} disabled={isPending}>
            {isPending && <Loader2Icon className="animate-spin" />}
            {isPending ? 'Creating...' : 'Create Version'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
