'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MoreHorizontalIcon, PencilIcon, CopyIcon, LockIcon, UnlockIcon, TrashIcon, DownloadIcon } from 'lucide-react'
import { lockFormDefinition, unlockFormDefinition } from '@/server/actions/form-builder'
import { exportSingleFormAsCsv } from '@/server/actions/form-export'
import { DeleteFormDialog } from './delete-form-dialog'
import { DuplicateFormDialog } from './duplicate-form-dialog'
import type { FormDefinitionRow } from '@/types/database'

interface FormActionsMenuProps {
  form: FormDefinitionRow
  studyId: string
  basePath: string
}

export function FormActionsMenu({ form, studyId, basePath }: FormActionsMenuProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)

  function handleExport() {
    startTransition(async () => {
      const result = await exportSingleFormAsCsv(form.id, studyId)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${form.slug}-data-dictionary.csv`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Form exported')
    })
  }

  function handleLockToggle() {
    startTransition(async () => {
      const action = form.is_locked ? unlockFormDefinition : lockFormDefinition
      const result = await action(form.id, studyId)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(form.is_locked ? 'Form unlocked' : 'Form locked')
      router.refresh()
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(`${basePath}/settings/forms/${form.slug}/edit`)}>
            <PencilIcon className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowDuplicateDialog(true)}>
            <CopyIcon className="mr-2 h-4 w-4" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExport} disabled={isPending}>
            <DownloadIcon className="mr-2 h-4 w-4" />
            Export CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLockToggle} disabled={isPending}>
            {form.is_locked ? (
              <>
                <UnlockIcon className="mr-2 h-4 w-4" />
                Unlock
              </>
            ) : (
              <>
                <LockIcon className="mr-2 h-4 w-4" />
                Lock
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <TrashIcon className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteFormDialog
        formId={form.id}
        studyId={studyId}
        formTitle={form.title}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      />

      <DuplicateFormDialog
        formId={form.id}
        studyId={studyId}
        originalTitle={form.title}
        originalSlug={form.slug}
        open={showDuplicateDialog}
        onOpenChange={setShowDuplicateDialog}
      />
    </>
  )
}
