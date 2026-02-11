'use server'

import { createClient } from '@/lib/supabase/server'
import { requireStudyAccess } from '@/lib/auth/session'
import { canEditData } from '@/lib/auth/permissions'
import type { ServerActionResult } from '@/types/app'

const BUCKET_NAME = 'form-attachments'

const MAX_FILE_SIZE_DEFAULT = 50 * 1024 * 1024 // 50MB

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/msword', // doc
  'application/vnd.ms-excel', // xls
  'text/plain',
]

export interface FileUploadResult {
  filename: string
  path: string
  size: number
  mimeType: string
}

export async function uploadFormFile(
  studyId: string,
  participantId: string,
  fieldId: string,
  formData: FormData
): Promise<ServerActionResult<FileUploadResult>> {
  const { role } = await requireStudyAccess(studyId)

  if (!canEditData(role)) {
    return { success: false, error: 'Insufficient permissions to upload files' }
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return { success: false, error: 'No file provided' }
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE_DEFAULT) {
    return {
      success: false,
      error: `File size exceeds the maximum allowed size of ${MAX_FILE_SIZE_DEFAULT / 1024 / 1024}MB`,
    }
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      success: false,
      error: `File type "${file.type}" is not allowed. Accepted types: PDF, images, CSV, DOCX, XLSX, DOC, XLS, TXT`,
    }
  }

  // Sanitize filename: remove special characters, keep extension
  const sanitizedName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')

  // Build storage path: studyId/participantId/fieldId/timestamp_filename
  const timestamp = Date.now()
  const storagePath = `${studyId}/${participantId}/${fieldId}/${timestamp}_${sanitizedName}`

  const supabase = await createClient()

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    return { success: false, error: `Upload failed: ${error.message}` }
  }

  return {
    success: true,
    data: {
      filename: file.name,
      path: storagePath,
      size: file.size,
      mimeType: file.type,
    },
  }
}

export async function deleteFormFile(
  studyId: string,
  path: string
): Promise<ServerActionResult> {
  const { role } = await requireStudyAccess(studyId)

  if (!canEditData(role)) {
    return { success: false, error: 'Insufficient permissions to delete files' }
  }

  // Verify the path belongs to the study
  if (!path.startsWith(`${studyId}/`)) {
    return { success: false, error: 'Invalid file path for this study' }
  }

  const supabase = await createClient()

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path])

  if (error) {
    return { success: false, error: `Delete failed: ${error.message}` }
  }

  return { success: true, data: undefined }
}

export async function getSignedUrl(
  path: string
): Promise<ServerActionResult<string>> {
  const supabase = await createClient()

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, 60 * 60) // 1 hour expiry

  if (error || !data?.signedUrl) {
    return { success: false, error: `Failed to generate download URL: ${error?.message ?? 'Unknown error'}` }
  }

  return { success: true, data: data.signedUrl }
}
