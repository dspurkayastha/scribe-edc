'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DownloadIcon, Loader2Icon } from 'lucide-react'
import { exportAllFormsAsCsv } from '@/server/actions/form-export'

interface ExportCsvButtonProps {
  studyId: string
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function ExportCsvButton({ studyId }: ExportCsvButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleExport() {
    startTransition(async () => {
      const result = await exportAllFormsAsCsv(studyId)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      downloadCsv(result.data, `data-dictionary-${new Date().toISOString().slice(0, 10)}.csv`)
      toast.success('Data dictionary exported')
    })
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={isPending}>
      {isPending ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <DownloadIcon className="h-4 w-4" />}
      Export All
    </Button>
  )
}
