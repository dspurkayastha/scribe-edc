import { Skeleton } from '@/components/ui/skeleton'

export default function SelectStudyLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <Skeleton className="h-8 w-64" />
      <div className="grid w-full max-w-3xl gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  )
}
