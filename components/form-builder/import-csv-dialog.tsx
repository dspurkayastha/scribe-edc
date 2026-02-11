'use client'

import { useState, useTransition, useRef } from 'react'
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
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { UploadIcon, Loader2Icon, AlertTriangleIcon, CheckCircleIcon } from 'lucide-react'
import { parseRedcapDataDictionary, type ImportResult } from '@/lib/form-engine/redcap-importer'
import { createFormDefinition } from '@/server/actions/form-builder'

interface ImportCsvDialogProps {
  studyId: string
}

export function ImportCsvDialog({ studyId }: ImportCsvDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [parseResult, setParseResult] = useState<ImportResult | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function resetForm() {
    setParseResult(null)
    setImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      try {
        const result = parseRedcapDataDictionary(text)
        setParseResult(result)
      } catch (err) {
        toast.error('Failed to parse CSV file')
        setParseResult(null)
      }
    }
    reader.readAsText(file)
  }

  function handleImport() {
    if (!parseResult || parseResult.forms.length === 0) return

    setImporting(true)
    startTransition(async () => {
      let successCount = 0
      let errorCount = 0

      for (const form of parseResult.forms) {
        const result = await createFormDefinition({
          studyId,
          title: form.title,
          slug: form.slug,
          schema: form.schema as unknown as Record<string, unknown>,
        })

        if (result.success) {
          successCount++
        } else {
          errorCount++
          toast.error(`Failed to import "${form.title}": ${result.error}`)
        }
      }

      if (successCount > 0) {
        toast.success(`Imported ${successCount} form(s)`)
      }
      if (errorCount > 0) {
        toast.warning(`${errorCount} form(s) failed to import`)
      }

      setImporting(false)
      setOpen(false)
      resetForm()
      router.refresh()
    })
  }

  const totalFields = parseResult?.forms.reduce(
    (sum, f) => sum + f.schema.pages.reduce(
      (pSum, p) => pSum + p.sections.reduce((sSum, s) => sSum + s.fields.length, 0),
      0
    ),
    0
  ) ?? 0

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UploadIcon className="h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import REDCap Data Dictionary</DialogTitle>
          <DialogDescription>
            Upload a REDCap data dictionary CSV file to create form definitions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>

          {parseResult && (
            <>
              <div className="flex items-center gap-4 text-sm">
                <Badge variant="outline">
                  {parseResult.forms.length} form(s)
                </Badge>
                <Badge variant="outline">
                  {totalFields} field(s)
                </Badge>
                {parseResult.warnings.length > 0 && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    <AlertTriangleIcon className="h-3 w-3 mr-1" />
                    {parseResult.warnings.length} warning(s)
                  </Badge>
                )}
              </div>

              {parseResult.forms.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Form Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead className="text-center">Sections</TableHead>
                      <TableHead className="text-center">Fields</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parseResult.forms.map((form) => (
                      <TableRow key={form.slug}>
                        <TableCell className="font-medium">{form.title}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {form.slug}
                        </TableCell>
                        <TableCell className="text-center">
                          {form.schema.pages[0]?.sections.length ?? 0}
                        </TableCell>
                        <TableCell className="text-center">
                          {form.schema.pages.reduce(
                            (sum, p) => sum + p.sections.reduce((s, sec) => s + sec.fields.length, 0),
                            0
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {parseResult.warnings.length > 0 && (
                <div className="max-h-32 overflow-auto text-xs text-amber-700 bg-amber-50 rounded p-2 space-y-0.5">
                  {parseResult.warnings.map((w, i) => (
                    <p key={i}>{w}</p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!parseResult || parseResult.forms.length === 0 || isPending}
          >
            {isPending && <Loader2Icon className="animate-spin" />}
            {isPending ? 'Importing...' : `Import ${parseResult?.forms.length ?? 0} Form(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
