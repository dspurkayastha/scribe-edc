'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { FormSchema } from '@/types/form-schema'
import type { FormDefinitionRow } from '@/types/database'
import { useFormEditor } from './hooks/use-form-editor'
import { EditorToolbar } from './editor-toolbar'
import { StructureTree } from './structure-tree'
import { PageEditorPanel } from './panels/page-editor-panel'
import { SectionEditorPanel } from './panels/section-editor-panel'
import { FieldEditorPanel } from './panels/field-editor-panel'
import { FormPreviewDialog } from './form-preview-dialog'
import { updateFormDefinition } from '@/server/actions/form-builder'
import { validateFormSchema } from '@/lib/form-engine/schema-validator'

interface FormEditorShellProps {
  form: FormDefinitionRow
  studyId: string
  basePath: string
}

export function FormEditorShell({ form, studyId, basePath }: FormEditorShellProps) {
  const router = useRouter()
  const schema = form.schema as unknown as FormSchema
  const { state, dispatch, addPage, addSection, addField } = useFormEditor(schema)
  const [showPreview, setShowPreview] = useState(false)

  const handleSave = useCallback(async () => {
    // Validate before saving
    const errors = validateFormSchema(state.schema)
    dispatch({ type: 'SET_VALIDATION_ERRORS', errors: errors.map((e) => `${e.field}: ${e.message}`) })

    if (errors.length > 0) {
      toast.error(`Schema has ${errors.length} validation error(s)`)
      return
    }

    dispatch({ type: 'SAVE_START' })

    const result = await updateFormDefinition({
      formId: form.id,
      studyId,
      schema: state.schema as unknown as Record<string, unknown>,
    })

    if (!result.success) {
      dispatch({ type: 'SAVE_ERROR' })
      toast.error(result.error)
      return
    }

    dispatch({ type: 'SAVE_SUCCESS', schema: state.schema })
    toast.success('Form saved')
    router.refresh()
  }, [state.schema, form.id, studyId, dispatch, router])

  // Get the selected node data
  const selectedPage = state.selectedNode
    ? state.schema.pages.find((p) => p.id === state.selectedNode!.pageId)
    : null

  const selectedSection =
    state.selectedNode?.sectionId && selectedPage
      ? selectedPage.sections.find((s) => s.id === state.selectedNode!.sectionId)
      : null

  const selectedField =
    state.selectedNode?.fieldId && selectedSection
      ? selectedSection.fields.find((f) => f.id === state.selectedNode!.fieldId)
      : null

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <EditorToolbar
        formTitle={form.title}
        formSlug={form.slug}
        isDirty={state.isDirty}
        isSaving={state.isSaving}
        validationErrorCount={state.validationErrors.length}
        onSave={handleSave}
        onPreview={() => setShowPreview(true)}
        onVersionHistory={() => {}}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — Structure Tree */}
        <div className="w-72 border-r bg-muted/30 overflow-hidden">
          <StructureTree
            schema={state.schema}
            selectedNode={state.selectedNode}
            dispatch={dispatch}
            onAddPage={addPage}
            onAddSection={addSection}
            onAddField={addField}
          />
        </div>

        {/* Main Panel */}
        <div className="flex-1 overflow-auto p-6">
          {!state.selectedNode && (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Select a page, section, or field from the tree to edit it.
            </div>
          )}

          {state.selectedNode?.type === 'page' && selectedPage && (
            <PageEditorPanel
              page={selectedPage}
              dispatch={dispatch}
            />
          )}

          {state.selectedNode?.type === 'section' && selectedSection && (
            <SectionEditorPanel
              section={selectedSection}
              pageId={state.selectedNode.pageId}
              dispatch={dispatch}
            />
          )}

          {state.selectedNode?.type === 'field' && selectedField && state.selectedNode.sectionId && (
            <FieldEditorPanel
              field={selectedField}
              pageId={state.selectedNode.pageId}
              sectionId={state.selectedNode.sectionId}
              schema={state.schema}
              dispatch={dispatch}
            />
          )}
        </div>
      </div>

      {showPreview && (
        <FormPreviewDialog
          schema={state.schema}
          open={showPreview}
          onOpenChange={setShowPreview}
        />
      )}
    </div>
  )
}
