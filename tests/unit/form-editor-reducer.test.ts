import { describe, it, expect } from 'vitest'
import { editorReducer, type EditorState } from '@/components/form-builder/hooks/use-form-editor'
import type { FormSchema, Page, Section, Field } from '@/types/form-schema'

function makeState(schema?: FormSchema): EditorState {
  const s = schema ?? {
    pages: [{
      id: 'p1',
      title: 'Page 1',
      sections: [{
        id: 's1',
        title: 'Section 1',
        fields: [
          { id: 'f1', type: 'text' as const, label: 'Field 1' },
          { id: 'f2', type: 'number' as const, label: 'Field 2' },
        ],
      }, {
        id: 's2',
        title: 'Section 2',
        fields: [],
      }],
    }, {
      id: 'p2',
      title: 'Page 2',
      sections: [{
        id: 's3',
        title: 'Section 3',
        fields: [{ id: 'f3', type: 'date' as const, label: 'Field 3' }],
      }],
    }],
  }
  return {
    schema: s,
    originalSchema: s,
    selectedNode: null,
    isDirty: false,
    validationErrors: [],
    isSaving: false,
  }
}

// ═══════════════════════════════════════════════════════════════
// Node Selection
// ═══════════════════════════════════════════════════════════════

describe('SELECT_NODE', () => {
  it('selects a page', () => {
    const state = makeState()
    const next = editorReducer(state, { type: 'SELECT_NODE', node: { type: 'page', pageId: 'p1' } })
    expect(next.selectedNode).toEqual({ type: 'page', pageId: 'p1' })
  })

  it('selects a field', () => {
    const state = makeState()
    const next = editorReducer(state, {
      type: 'SELECT_NODE',
      node: { type: 'field', pageId: 'p1', sectionId: 's1', fieldId: 'f1' },
    })
    expect(next.selectedNode).toEqual({ type: 'field', pageId: 'p1', sectionId: 's1', fieldId: 'f1' })
  })

  it('deselects', () => {
    const state = makeState()
    const next = editorReducer(state, { type: 'SELECT_NODE', node: null })
    expect(next.selectedNode).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════
// Schema Management
// ═══════════════════════════════════════════════════════════════

describe('SET_SCHEMA', () => {
  it('sets schema and resets dirty flag', () => {
    const state = { ...makeState(), isDirty: true }
    const newSchema: FormSchema = { pages: [] }
    const next = editorReducer(state, { type: 'SET_SCHEMA', schema: newSchema })
    expect(next.schema).toBe(newSchema)
    expect(next.originalSchema).toBe(newSchema)
    expect(next.isDirty).toBe(false)
  })
})

describe('SAVE_START / SAVE_SUCCESS / SAVE_ERROR', () => {
  it('handles save lifecycle', () => {
    let state = { ...makeState(), isDirty: true }
    state = editorReducer(state, { type: 'SAVE_START' })
    expect(state.isSaving).toBe(true)

    state = editorReducer(state, { type: 'SAVE_SUCCESS', schema: state.schema })
    expect(state.isSaving).toBe(false)
    expect(state.isDirty).toBe(false)
  })

  it('handles save error', () => {
    let state = editorReducer(makeState(), { type: 'SAVE_START' })
    state = editorReducer(state, { type: 'SAVE_ERROR' })
    expect(state.isSaving).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// Page Actions
// ═══════════════════════════════════════════════════════════════

describe('ADD_PAGE', () => {
  it('adds a page and selects it', () => {
    const state = makeState()
    const newPage: Page = { id: 'p3', title: 'Page 3', sections: [] }
    const next = editorReducer(state, { type: 'ADD_PAGE', page: newPage })
    expect(next.schema.pages).toHaveLength(3)
    expect(next.schema.pages[2].id).toBe('p3')
    expect(next.isDirty).toBe(true)
    expect(next.selectedNode).toEqual({ type: 'page', pageId: 'p3' })
  })
})

describe('UPDATE_PAGE', () => {
  it('updates page title', () => {
    const state = makeState()
    const next = editorReducer(state, { type: 'UPDATE_PAGE', pageId: 'p1', updates: { title: 'Renamed' } })
    expect(next.schema.pages[0].title).toBe('Renamed')
    expect(next.isDirty).toBe(true)
  })
})

describe('DELETE_PAGE', () => {
  it('deletes a page', () => {
    const state = makeState()
    const next = editorReducer(state, { type: 'DELETE_PAGE', pageId: 'p2' })
    expect(next.schema.pages).toHaveLength(1)
    expect(next.isDirty).toBe(true)
  })

  it('clears selection when deleting selected page', () => {
    let state = makeState()
    state = editorReducer(state, { type: 'SELECT_NODE', node: { type: 'page', pageId: 'p2' } })
    const next = editorReducer(state, { type: 'DELETE_PAGE', pageId: 'p2' })
    expect(next.selectedNode).toBeNull()
  })

  it('preserves selection when deleting different page', () => {
    let state = makeState()
    state = editorReducer(state, { type: 'SELECT_NODE', node: { type: 'page', pageId: 'p1' } })
    const next = editorReducer(state, { type: 'DELETE_PAGE', pageId: 'p2' })
    expect(next.selectedNode).toEqual({ type: 'page', pageId: 'p1' })
  })
})

describe('REORDER_PAGE', () => {
  it('moves page down', () => {
    const state = makeState()
    const next = editorReducer(state, { type: 'REORDER_PAGE', pageId: 'p1', direction: 'down' })
    expect(next.schema.pages[0].id).toBe('p2')
    expect(next.schema.pages[1].id).toBe('p1')
    expect(next.isDirty).toBe(true)
  })

  it('moves page up', () => {
    const state = makeState()
    const next = editorReducer(state, { type: 'REORDER_PAGE', pageId: 'p2', direction: 'up' })
    expect(next.schema.pages[0].id).toBe('p2')
    expect(next.schema.pages[1].id).toBe('p1')
  })

  it('does not move first page up', () => {
    const state = makeState()
    const next = editorReducer(state, { type: 'REORDER_PAGE', pageId: 'p1', direction: 'up' })
    expect(next.schema.pages[0].id).toBe('p1')
  })

  it('does not move last page down', () => {
    const state = makeState()
    const next = editorReducer(state, { type: 'REORDER_PAGE', pageId: 'p2', direction: 'down' })
    expect(next.schema.pages[1].id).toBe('p2')
  })
})

// ═══════════════════════════════════════════════════════════════
// Section Actions
// ═══════════════════════════════════════════════════════════════

describe('ADD_SECTION', () => {
  it('adds a section to a page', () => {
    const state = makeState()
    const section: Section = { id: 's_new', title: 'New Section', fields: [] }
    const next = editorReducer(state, { type: 'ADD_SECTION', pageId: 'p1', section })
    expect(next.schema.pages[0].sections).toHaveLength(3)
    expect(next.selectedNode).toEqual({ type: 'section', pageId: 'p1', sectionId: 's_new' })
  })
})

describe('UPDATE_SECTION', () => {
  it('updates section title', () => {
    const state = makeState()
    const next = editorReducer(state, {
      type: 'UPDATE_SECTION',
      pageId: 'p1',
      sectionId: 's1',
      updates: { title: 'Updated Section' },
    })
    expect(next.schema.pages[0].sections[0].title).toBe('Updated Section')
  })

  it('toggles repeatable', () => {
    const state = makeState()
    const next = editorReducer(state, {
      type: 'UPDATE_SECTION',
      pageId: 'p1',
      sectionId: 's1',
      updates: { repeatable: true, minRepeat: 1, maxRepeat: 5 },
    })
    expect(next.schema.pages[0].sections[0].repeatable).toBe(true)
    expect(next.schema.pages[0].sections[0].maxRepeat).toBe(5)
  })
})

describe('DELETE_SECTION', () => {
  it('deletes a section', () => {
    const state = makeState()
    const next = editorReducer(state, { type: 'DELETE_SECTION', pageId: 'p1', sectionId: 's2' })
    expect(next.schema.pages[0].sections).toHaveLength(1)
  })

  it('selects parent page when deleting selected section', () => {
    let state = makeState()
    state = editorReducer(state, { type: 'SELECT_NODE', node: { type: 'section', pageId: 'p1', sectionId: 's2' } })
    const next = editorReducer(state, { type: 'DELETE_SECTION', pageId: 'p1', sectionId: 's2' })
    expect(next.selectedNode).toEqual({ type: 'page', pageId: 'p1' })
  })
})

describe('REORDER_SECTION', () => {
  it('reorders sections within a page', () => {
    const state = makeState()
    const next = editorReducer(state, {
      type: 'REORDER_SECTION',
      pageId: 'p1',
      sectionId: 's1',
      direction: 'down',
    })
    expect(next.schema.pages[0].sections[0].id).toBe('s2')
    expect(next.schema.pages[0].sections[1].id).toBe('s1')
  })
})

// ═══════════════════════════════════════════════════════════════
// Field Actions
// ═══════════════════════════════════════════════════════════════

describe('ADD_FIELD', () => {
  it('adds a field to a section', () => {
    const state = makeState()
    const field: Field = { id: 'f_new', type: 'text', label: 'New Field' }
    const next = editorReducer(state, { type: 'ADD_FIELD', pageId: 'p1', sectionId: 's1', field })
    expect(next.schema.pages[0].sections[0].fields).toHaveLength(3)
    expect(next.selectedNode).toEqual({ type: 'field', pageId: 'p1', sectionId: 's1', fieldId: 'f_new' })
  })
})

describe('UPDATE_FIELD', () => {
  it('updates field label', () => {
    const state = makeState()
    const next = editorReducer(state, {
      type: 'UPDATE_FIELD',
      pageId: 'p1',
      sectionId: 's1',
      fieldId: 'f1',
      updates: { label: 'Updated Label' },
    })
    expect(next.schema.pages[0].sections[0].fields[0].label).toBe('Updated Label')
  })

  it('updates field type', () => {
    const state = makeState()
    const next = editorReducer(state, {
      type: 'UPDATE_FIELD',
      pageId: 'p1',
      sectionId: 's1',
      fieldId: 'f1',
      updates: { type: 'textarea' },
    })
    expect(next.schema.pages[0].sections[0].fields[0].type).toBe('textarea')
  })

  it('updates validation rules', () => {
    const state = makeState()
    const next = editorReducer(state, {
      type: 'UPDATE_FIELD',
      pageId: 'p1',
      sectionId: 's1',
      fieldId: 'f1',
      updates: { validation: { minLength: 2, maxLength: 100 } },
    })
    expect(next.schema.pages[0].sections[0].fields[0].validation).toEqual({ minLength: 2, maxLength: 100 })
  })
})

describe('DELETE_FIELD', () => {
  it('deletes a field', () => {
    const state = makeState()
    const next = editorReducer(state, { type: 'DELETE_FIELD', pageId: 'p1', sectionId: 's1', fieldId: 'f2' })
    expect(next.schema.pages[0].sections[0].fields).toHaveLength(1)
    expect(next.schema.pages[0].sections[0].fields[0].id).toBe('f1')
  })

  it('selects parent section when deleting selected field', () => {
    let state = makeState()
    state = editorReducer(state, {
      type: 'SELECT_NODE',
      node: { type: 'field', pageId: 'p1', sectionId: 's1', fieldId: 'f1' },
    })
    const next = editorReducer(state, { type: 'DELETE_FIELD', pageId: 'p1', sectionId: 's1', fieldId: 'f1' })
    expect(next.selectedNode).toEqual({ type: 'section', pageId: 'p1', sectionId: 's1' })
  })
})

describe('REORDER_FIELD', () => {
  it('moves field down', () => {
    const state = makeState()
    const next = editorReducer(state, {
      type: 'REORDER_FIELD',
      pageId: 'p1',
      sectionId: 's1',
      fieldId: 'f1',
      direction: 'down',
    })
    expect(next.schema.pages[0].sections[0].fields[0].id).toBe('f2')
    expect(next.schema.pages[0].sections[0].fields[1].id).toBe('f1')
  })

  it('moves field up', () => {
    const state = makeState()
    const next = editorReducer(state, {
      type: 'REORDER_FIELD',
      pageId: 'p1',
      sectionId: 's1',
      fieldId: 'f2',
      direction: 'up',
    })
    expect(next.schema.pages[0].sections[0].fields[0].id).toBe('f2')
    expect(next.schema.pages[0].sections[0].fields[1].id).toBe('f1')
  })

  it('does not move first field up', () => {
    const state = makeState()
    const next = editorReducer(state, {
      type: 'REORDER_FIELD',
      pageId: 'p1',
      sectionId: 's1',
      fieldId: 'f1',
      direction: 'up',
    })
    expect(next.schema.pages[0].sections[0].fields[0].id).toBe('f1')
  })
})

// ═══════════════════════════════════════════════════════════════
// Validation Errors
// ═══════════════════════════════════════════════════════════════

describe('SET_VALIDATION_ERRORS', () => {
  it('sets validation errors', () => {
    const state = makeState()
    const next = editorReducer(state, { type: 'SET_VALIDATION_ERRORS', errors: ['Error 1', 'Error 2'] })
    expect(next.validationErrors).toHaveLength(2)
  })

  it('clears validation errors', () => {
    let state = makeState()
    state = editorReducer(state, { type: 'SET_VALIDATION_ERRORS', errors: ['Error'] })
    const next = editorReducer(state, { type: 'SET_VALIDATION_ERRORS', errors: [] })
    expect(next.validationErrors).toHaveLength(0)
  })
})
