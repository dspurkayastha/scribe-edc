'use client'

import { createContext, useContext } from 'react'

type CrossFormData = Record<string, Record<string, unknown>>

const CrossFormContext = createContext<CrossFormData | undefined>(undefined)

export function CrossFormProvider({
  value,
  children,
}: {
  value: CrossFormData | undefined
  children: React.ReactNode
}) {
  return (
    <CrossFormContext.Provider value={value}>
      {children}
    </CrossFormContext.Provider>
  )
}

export function useCrossFormData(): CrossFormData | undefined {
  return useContext(CrossFormContext)
}
