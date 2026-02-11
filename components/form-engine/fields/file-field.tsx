'use client'

import { useCallback, useRef, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import type { Field } from '@/types/form-schema'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  uploadFormFile,
  deleteFormFile,
  getSignedUrl,
} from '@/server/actions/file-upload'

interface FileFieldProps {
  field: Field
  readOnly?: boolean
  namePrefix?: string
  studyId: string
  participantId: string
}

interface FileValue {
  filename: string
  path: string
  size: number
  mimeType?: string
}

const DEFAULT_ACCEPT =
  '.pdf,.png,.jpg,.jpeg,.gif,.webp,.csv,.docx,.xlsx,.doc,.xls,.txt'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileField({
  field,
  readOnly,
  namePrefix,
  studyId,
  participantId,
}: FileFieldProps) {
  const { setValue, watch } = useFormContext()
  const fieldName = namePrefix ? `${namePrefix}.${field.id}` : field.id
  const disabled = readOnly || field.disabled === true

  const currentValue = watch(fieldName) as FileValue | null | undefined
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const maxSize = field.maxFileSize ?? 50 * 1024 * 1024 // 50MB default
  const accept = field.accept ?? DEFAULT_ACCEPT

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null)

      // Client-side size check
      if (file.size > maxSize) {
        setError(`File size (${formatFileSize(file.size)}) exceeds the maximum of ${formatFileSize(maxSize)}`)
        return
      }

      setUploading(true)
      setUploadProgress(10)

      try {
        const formData = new FormData()
        formData.append('file', file)

        // Simulate progress since server actions don't support streaming progress
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 15, 85))
        }, 300)

        const result = await uploadFormFile(studyId, participantId, field.id, formData)

        clearInterval(progressInterval)

        if (!result.success) {
          setError(result.error)
          setUploadProgress(0)
          return
        }

        setUploadProgress(100)

        const fileData: FileValue = {
          filename: result.data.filename,
          path: result.data.path,
          size: result.data.size,
          mimeType: result.data.mimeType,
        }

        setValue(fieldName, fileData, { shouldValidate: true })

        // Reset progress after a moment
        setTimeout(() => setUploadProgress(0), 500)
      } catch (err) {
        setError('An unexpected error occurred during upload')
        setUploadProgress(0)
      } finally {
        setUploading(false)
      }
    },
    [studyId, participantId, field.id, fieldName, maxSize, setValue]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleUpload(file)
      }
      // Reset input so the same file can be re-selected
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    },
    [handleUpload]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)

      if (disabled || uploading) return

      const file = e.dataTransfer.files?.[0]
      if (file) {
        handleUpload(file)
      }
    },
    [disabled, uploading, handleUpload]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled && !uploading) {
        setDragOver(true)
      }
    },
    [disabled, uploading]
  )

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleDelete = useCallback(async () => {
    if (!currentValue?.path) return
    setError(null)

    const result = await deleteFormFile(studyId, currentValue.path)
    if (!result.success) {
      setError(result.error)
      return
    }

    setValue(fieldName, null, { shouldValidate: true })
  }, [currentValue, studyId, fieldName, setValue])

  const handleDownload = useCallback(async () => {
    if (!currentValue?.path) return
    setDownloadLoading(true)

    try {
      const result = await getSignedUrl(currentValue.path)
      if (!result.success) {
        setError(result.error)
        return
      }
      window.open(result.data, '_blank')
    } catch {
      setError('Failed to generate download link')
    } finally {
      setDownloadLoading(false)
    }
  }, [currentValue])

  // Existing file view
  if (currentValue?.path) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
          <FileIcon mimeType={currentValue.mimeType} />
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{currentValue.filename}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(currentValue.size)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={downloadLoading}
            >
              {downloadLoading ? 'Loading...' : 'Download'}
            </Button>
            {!disabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDelete}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
        {!disabled && (
          <p className="text-xs text-muted-foreground">
            Remove the current file to upload a new one.
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }

  // Upload zone
  return (
    <div className="space-y-2">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-md border-2 border-dashed p-8 text-center transition-colors',
          dragOver && !disabled
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25',
          disabled && 'cursor-not-allowed opacity-50',
          !disabled && !uploading && 'cursor-pointer hover:border-primary/50 hover:bg-muted/30'
        )}
        onClick={() => {
          if (!disabled && !uploading) {
            inputRef.current?.click()
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled && !uploading) {
            inputRef.current?.click()
          }
        }}
        aria-label={`Upload file for ${field.label}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          className="hidden"
          aria-hidden="true"
        />

        {uploading ? (
          <div className="w-full max-w-xs space-y-3">
            <p className="text-sm text-muted-foreground">Uploading...</p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
          </div>
        ) : (
          <>
            <UploadIcon />
            <p className="mt-2 text-sm font-medium">
              {dragOver ? 'Drop file here' : 'Click or drag a file to upload'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Max size: {formatFileSize(maxSize)}
            </p>
          </>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

function UploadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-muted-foreground"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function FileIcon({ mimeType }: { mimeType?: string }) {
  const isPdf = mimeType === 'application/pdf'
  const isImage = mimeType?.startsWith('image/')

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        'shrink-0',
        isPdf ? 'text-red-500' : isImage ? 'text-blue-500' : 'text-muted-foreground'
      )}
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
  )
}
