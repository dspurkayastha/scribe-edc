'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function StudyError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-xl font-bold">Error loading study</h2>
      <p className="text-muted-foreground max-w-md text-center">
        {error.message || 'An unexpected error occurred while loading study data.'}
      </p>
      <Button onClick={reset}>Retry</Button>
    </div>
  )
}
