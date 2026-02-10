'use client'

import { useState, useCallback } from 'react'
import type { FormSchema } from '@/types/form-schema'

export function useFormPagination(schema: FormSchema) {
  const [currentPage, setCurrentPage] = useState(0)
  const totalPages = schema.pages.length

  const goToNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1))
  }, [totalPages])

  const goToPrevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 0))
  }, [])

  const goToPage = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalPages) {
        setCurrentPage(index)
      }
    },
    [totalPages]
  )

  const isFirstPage = currentPage === 0
  const isLastPage = currentPage === totalPages - 1

  return {
    currentPage,
    totalPages,
    goToNextPage,
    goToPrevPage,
    goToPage,
    isFirstPage,
    isLastPage,
    currentPageData: schema.pages[currentPage],
  }
}
