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
} from '@/components/ui/alert-dialog'
import { Loader2Icon } from 'lucide-react'
import { deleteFormDefinition } from '@/server/actions/form-builder'

interface DeleteFormDialogProps {
  formId: string
  studyId: string
  formTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteFormDialog({
  formId,
  studyId,
  formTitle,
  open,
  onOpenChange,
}: DeleteFormDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteFormDefinition(formId, studyId)

      if (!result.success) {
        toast.error(result.error)
        onOpenChange(false)
        return
      }

      toast.success(`Form "${formTitle}" deleted`)
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Form</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{formTitle}&quot;? This action cannot be undone.
            Forms with existing responses cannot be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2Icon className="animate-spin" />}
            {isPending ? 'Deleting...' : 'Delete Form'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
