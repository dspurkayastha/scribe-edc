'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { StudyContext } from '@/types/app'

const StudyCtx = createContext<StudyContext | null>(null)

export function StudyContextProvider({
  value,
  children,
}: {
  value: StudyContext
  children: ReactNode
}) {
  return <StudyCtx.Provider value={value}>{children}</StudyCtx.Provider>
}

export function useStudyContext(): StudyContext {
  const ctx = useContext(StudyCtx)
  if (!ctx) throw new Error('useStudyContext must be used within StudyContextProvider')
  return ctx
}
