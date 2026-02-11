'use client'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  PlusIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  FileTextIcon,
  LayoutListIcon,
  FormInputIcon,
} from 'lucide-react'
import type { FormSchema } from '@/types/form-schema'
import type { SelectedNode, EditorAction } from './hooks/use-form-editor'
import type { FieldType } from '@/types/form-schema'
import { cn } from '@/lib/utils'

interface StructureTreeProps {
  schema: FormSchema
  selectedNode: SelectedNode | null
  dispatch: React.Dispatch<EditorAction>
  onAddPage: () => void
  onAddSection: (pageId: string) => void
  onAddField: (pageId: string, sectionId: string) => void
}

export function StructureTree({
  schema,
  selectedNode,
  dispatch,
  onAddPage,
  onAddSection,
  onAddField,
}: StructureTreeProps) {
  const isSelected = (type: SelectedNode['type'], pageId: string, sectionId?: string, fieldId?: string) => {
    if (!selectedNode) return false
    if (selectedNode.type !== type) return false
    if (selectedNode.pageId !== pageId) return false
    if (type === 'section' && selectedNode.sectionId !== sectionId) return false
    if (type === 'field' && (selectedNode.sectionId !== sectionId || selectedNode.fieldId !== fieldId)) return false
    return true
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="text-sm font-medium">Structure</h3>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onAddPage} title="Add page">
          <PlusIcon className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {schema.pages.map((page, pageIndex) => (
            <div key={page.id}>
              {/* Page node */}
              <div
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-sm cursor-pointer hover:bg-accent group',
                  isSelected('page', page.id) && 'bg-accent font-medium'
                )}
                onClick={() => dispatch({ type: 'SELECT_NODE', node: { type: 'page', pageId: page.id } })}
              >
                <FileTextIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate flex-1">{page.title}</span>
                <div className="hidden group-hover:flex items-center gap-0.5">
                  <button
                    className="p-0.5 rounded hover:bg-muted"
                    onClick={(e) => { e.stopPropagation(); dispatch({ type: 'REORDER_PAGE', pageId: page.id, direction: 'up' }) }}
                    disabled={pageIndex === 0}
                    title="Move up"
                  >
                    <ChevronUpIcon className="h-3 w-3" />
                  </button>
                  <button
                    className="p-0.5 rounded hover:bg-muted"
                    onClick={(e) => { e.stopPropagation(); dispatch({ type: 'REORDER_PAGE', pageId: page.id, direction: 'down' }) }}
                    disabled={pageIndex === schema.pages.length - 1}
                    title="Move down"
                  >
                    <ChevronDownIcon className="h-3 w-3" />
                  </button>
                  <button
                    className="p-0.5 rounded hover:bg-muted"
                    onClick={(e) => { e.stopPropagation(); onAddSection(page.id) }}
                    title="Add section"
                  >
                    <PlusIcon className="h-3 w-3" />
                  </button>
                  {schema.pages.length > 1 && (
                    <button
                      className="p-0.5 rounded hover:bg-destructive/10 text-destructive"
                      onClick={(e) => { e.stopPropagation(); dispatch({ type: 'DELETE_PAGE', pageId: page.id }) }}
                      title="Delete page"
                    >
                      <TrashIcon className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Sections */}
              {page.sections.map((section, sectionIndex) => (
                <div key={section.id} className="ml-4">
                  <div
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded text-sm cursor-pointer hover:bg-accent group',
                      isSelected('section', page.id, section.id) && 'bg-accent font-medium'
                    )}
                    onClick={() =>
                      dispatch({
                        type: 'SELECT_NODE',
                        node: { type: 'section', pageId: page.id, sectionId: section.id },
                      })
                    }
                  >
                    <LayoutListIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate flex-1">{section.title}</span>
                    <div className="hidden group-hover:flex items-center gap-0.5">
                      <button
                        className="p-0.5 rounded hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation()
                          dispatch({ type: 'REORDER_SECTION', pageId: page.id, sectionId: section.id, direction: 'up' })
                        }}
                        disabled={sectionIndex === 0}
                        title="Move up"
                      >
                        <ChevronUpIcon className="h-3 w-3" />
                      </button>
                      <button
                        className="p-0.5 rounded hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation()
                          dispatch({ type: 'REORDER_SECTION', pageId: page.id, sectionId: section.id, direction: 'down' })
                        }}
                        disabled={sectionIndex === page.sections.length - 1}
                        title="Move down"
                      >
                        <ChevronDownIcon className="h-3 w-3" />
                      </button>
                      <button
                        className="p-0.5 rounded hover:bg-muted"
                        onClick={(e) => { e.stopPropagation(); onAddField(page.id, section.id) }}
                        title="Add field"
                      >
                        <PlusIcon className="h-3 w-3" />
                      </button>
                      <button
                        className="p-0.5 rounded hover:bg-destructive/10 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          dispatch({ type: 'DELETE_SECTION', pageId: page.id, sectionId: section.id })
                        }}
                        title="Delete section"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Fields */}
                  {section.fields.map((field, fieldIndex) => (
                    <div
                      key={field.id}
                      className={cn(
                        'flex items-center gap-1 ml-4 px-2 py-1 rounded text-sm cursor-pointer hover:bg-accent group',
                        isSelected('field', page.id, section.id, field.id) && 'bg-accent font-medium'
                      )}
                      onClick={() =>
                        dispatch({
                          type: 'SELECT_NODE',
                          node: { type: 'field', pageId: page.id, sectionId: section.id, fieldId: field.id },
                        })
                      }
                    >
                      <FormInputIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate flex-1">
                        {field.label}
                        <span className="text-xs text-muted-foreground ml-1">({field.type})</span>
                      </span>
                      <div className="hidden group-hover:flex items-center gap-0.5">
                        <button
                          className="p-0.5 rounded hover:bg-muted"
                          onClick={(e) => {
                            e.stopPropagation()
                            dispatch({
                              type: 'REORDER_FIELD',
                              pageId: page.id,
                              sectionId: section.id,
                              fieldId: field.id,
                              direction: 'up',
                            })
                          }}
                          disabled={fieldIndex === 0}
                          title="Move up"
                        >
                          <ChevronUpIcon className="h-3 w-3" />
                        </button>
                        <button
                          className="p-0.5 rounded hover:bg-muted"
                          onClick={(e) => {
                            e.stopPropagation()
                            dispatch({
                              type: 'REORDER_FIELD',
                              pageId: page.id,
                              sectionId: section.id,
                              fieldId: field.id,
                              direction: 'down',
                            })
                          }}
                          disabled={fieldIndex === section.fields.length - 1}
                          title="Move down"
                        >
                          <ChevronDownIcon className="h-3 w-3" />
                        </button>
                        <button
                          className="p-0.5 rounded hover:bg-destructive/10 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            dispatch({
                              type: 'DELETE_FIELD',
                              pageId: page.id,
                              sectionId: section.id,
                              fieldId: field.id,
                            })
                          }}
                          title="Delete field"
                        >
                          <TrashIcon className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
