import { useReducer, useCallback, useRef } from 'react'
import type { FormSchema, Page, Section, Field, FieldType } from '@/types/form-schema'

// ─── Types ───

export type NodeType = 'page' | 'section' | 'field'

export interface SelectedNode {
  type: NodeType
  pageId: string
  sectionId?: string
  fieldId?: string
}

export interface EditorState {
  schema: FormSchema
  originalSchema: FormSchema
  selectedNode: SelectedNode | null
  isDirty: boolean
  validationErrors: string[]
  isSaving: boolean
}

export type EditorAction =
  | { type: 'SELECT_NODE'; node: SelectedNode | null }
  | { type: 'SET_SCHEMA'; schema: FormSchema }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_SUCCESS'; schema: FormSchema }
  | { type: 'SAVE_ERROR' }
  | { type: 'SET_VALIDATION_ERRORS'; errors: string[] }
  // Page actions
  | { type: 'ADD_PAGE'; page: Page }
  | { type: 'UPDATE_PAGE'; pageId: string; updates: Partial<Omit<Page, 'id' | 'sections'>> }
  | { type: 'DELETE_PAGE'; pageId: string }
  | { type: 'REORDER_PAGE'; pageId: string; direction: 'up' | 'down' }
  // Section actions
  | { type: 'ADD_SECTION'; pageId: string; section: Section }
  | { type: 'UPDATE_SECTION'; pageId: string; sectionId: string; updates: Partial<Omit<Section, 'id' | 'fields'>> }
  | { type: 'DELETE_SECTION'; pageId: string; sectionId: string }
  | { type: 'REORDER_SECTION'; pageId: string; sectionId: string; direction: 'up' | 'down' }
  // Field actions
  | { type: 'ADD_FIELD'; pageId: string; sectionId: string; field: Field }
  | { type: 'UPDATE_FIELD'; pageId: string; sectionId: string; fieldId: string; updates: Partial<Omit<Field, 'id'>> }
  | { type: 'DELETE_FIELD'; pageId: string; sectionId: string; fieldId: string }
  | { type: 'REORDER_FIELD'; pageId: string; sectionId: string; fieldId: string; direction: 'up' | 'down' }

// ─── Helpers ───

function reorder<T>(arr: T[], index: number, direction: 'up' | 'down'): T[] {
  const newArr = [...arr]
  const swapIndex = direction === 'up' ? index - 1 : index + 1
  if (swapIndex < 0 || swapIndex >= arr.length) return arr
  ;[newArr[index], newArr[swapIndex]] = [newArr[swapIndex], newArr[index]]
  return newArr
}

function updatePages(schema: FormSchema, updater: (pages: Page[]) => Page[]): FormSchema {
  return { ...schema, pages: updater(schema.pages) }
}

function updatePageSections(
  schema: FormSchema,
  pageId: string,
  updater: (sections: Section[]) => Section[]
): FormSchema {
  return updatePages(schema, (pages) =>
    pages.map((p) => (p.id === pageId ? { ...p, sections: updater(p.sections) } : p))
  )
}

function updateSectionFields(
  schema: FormSchema,
  pageId: string,
  sectionId: string,
  updater: (fields: Field[]) => Field[]
): FormSchema {
  return updatePageSections(schema, pageId, (sections) =>
    sections.map((s) => (s.id === sectionId ? { ...s, fields: updater(s.fields) } : s))
  )
}

// ─── Reducer ───

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SELECT_NODE':
      return { ...state, selectedNode: action.node }

    case 'SET_SCHEMA':
      return { ...state, schema: action.schema, originalSchema: action.schema, isDirty: false }

    case 'SAVE_START':
      return { ...state, isSaving: true }

    case 'SAVE_SUCCESS':
      return { ...state, isSaving: false, isDirty: false, originalSchema: action.schema }

    case 'SAVE_ERROR':
      return { ...state, isSaving: false }

    case 'SET_VALIDATION_ERRORS':
      return { ...state, validationErrors: action.errors }

    // ─── Page ───

    case 'ADD_PAGE': {
      const schema = updatePages(state.schema, (pages) => [...pages, action.page])
      return { ...state, schema, isDirty: true, selectedNode: { type: 'page', pageId: action.page.id } }
    }

    case 'UPDATE_PAGE': {
      const schema = updatePages(state.schema, (pages) =>
        pages.map((p) => (p.id === action.pageId ? { ...p, ...action.updates } : p))
      )
      return { ...state, schema, isDirty: true }
    }

    case 'DELETE_PAGE': {
      const schema = updatePages(state.schema, (pages) => pages.filter((p) => p.id !== action.pageId))
      const selectedNode = state.selectedNode?.pageId === action.pageId ? null : state.selectedNode
      return { ...state, schema, isDirty: true, selectedNode }
    }

    case 'REORDER_PAGE': {
      const idx = state.schema.pages.findIndex((p) => p.id === action.pageId)
      if (idx === -1) return state
      const schema = updatePages(state.schema, (pages) => reorder(pages, idx, action.direction))
      return { ...state, schema, isDirty: true }
    }

    // ─── Section ───

    case 'ADD_SECTION': {
      const schema = updatePageSections(state.schema, action.pageId, (sections) => [
        ...sections,
        action.section,
      ])
      return {
        ...state,
        schema,
        isDirty: true,
        selectedNode: { type: 'section', pageId: action.pageId, sectionId: action.section.id },
      }
    }

    case 'UPDATE_SECTION': {
      const schema = updatePageSections(state.schema, action.pageId, (sections) =>
        sections.map((s) => (s.id === action.sectionId ? { ...s, ...action.updates } : s))
      )
      return { ...state, schema, isDirty: true }
    }

    case 'DELETE_SECTION': {
      const schema = updatePageSections(state.schema, action.pageId, (sections) =>
        sections.filter((s) => s.id !== action.sectionId)
      )
      const selectedNode =
        state.selectedNode?.sectionId === action.sectionId ? { type: 'page' as const, pageId: action.pageId } : state.selectedNode
      return { ...state, schema, isDirty: true, selectedNode }
    }

    case 'REORDER_SECTION': {
      const page = state.schema.pages.find((p) => p.id === action.pageId)
      if (!page) return state
      const idx = page.sections.findIndex((s) => s.id === action.sectionId)
      if (idx === -1) return state
      const schema = updatePageSections(state.schema, action.pageId, (sections) =>
        reorder(sections, idx, action.direction)
      )
      return { ...state, schema, isDirty: true }
    }

    // ─── Field ───

    case 'ADD_FIELD': {
      const schema = updateSectionFields(state.schema, action.pageId, action.sectionId, (fields) => [
        ...fields,
        action.field,
      ])
      return {
        ...state,
        schema,
        isDirty: true,
        selectedNode: {
          type: 'field',
          pageId: action.pageId,
          sectionId: action.sectionId,
          fieldId: action.field.id,
        },
      }
    }

    case 'UPDATE_FIELD': {
      const schema = updateSectionFields(state.schema, action.pageId, action.sectionId, (fields) =>
        fields.map((f) => (f.id === action.fieldId ? { ...f, ...action.updates } : f))
      )
      return { ...state, schema, isDirty: true }
    }

    case 'DELETE_FIELD': {
      const schema = updateSectionFields(state.schema, action.pageId, action.sectionId, (fields) =>
        fields.filter((f) => f.id !== action.fieldId)
      )
      const selectedNode =
        state.selectedNode?.fieldId === action.fieldId
          ? { type: 'section' as const, pageId: action.pageId, sectionId: action.sectionId }
          : state.selectedNode
      return { ...state, schema, isDirty: true, selectedNode }
    }

    case 'REORDER_FIELD': {
      const page = state.schema.pages.find((p) => p.id === action.pageId)
      const section = page?.sections.find((s) => s.id === action.sectionId)
      if (!section) return state
      const idx = section.fields.findIndex((f) => f.id === action.fieldId)
      if (idx === -1) return state
      const schema = updateSectionFields(state.schema, action.pageId, action.sectionId, (fields) =>
        reorder(fields, idx, action.direction)
      )
      return { ...state, schema, isDirty: true }
    }

    default:
      return state
  }
}

// ─── Hook ───

export function useFormEditor(initialSchema: FormSchema) {
  const [state, dispatch] = useReducer(editorReducer, {
    schema: initialSchema,
    originalSchema: initialSchema,
    selectedNode: null,
    isDirty: false,
    validationErrors: [],
    isSaving: false,
  })

  const idCounter = useRef(0)

  const generateId = useCallback((prefix: string) => {
    idCounter.current++
    return `${prefix}_${Date.now()}_${idCounter.current}`
  }, [])

  const addPage = useCallback(() => {
    const id = generateId('page')
    dispatch({
      type: 'ADD_PAGE',
      page: {
        id,
        title: 'New Page',
        sections: [{ id: generateId('section'), title: 'New Section', fields: [] }],
      },
    })
  }, [generateId])

  const addSection = useCallback((pageId: string) => {
    dispatch({
      type: 'ADD_SECTION',
      pageId,
      section: { id: generateId('section'), title: 'New Section', fields: [] },
    })
  }, [generateId])

  const addField = useCallback((pageId: string, sectionId: string, type: FieldType = 'text') => {
    const id = generateId('field').replace(/-/g, '_')
    dispatch({
      type: 'ADD_FIELD',
      pageId,
      sectionId,
      field: {
        id,
        type,
        label: 'New Field',
        required: false,
      },
    })
  }, [generateId])

  return { state, dispatch, addPage, addSection, addField }
}
