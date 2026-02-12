'use client'

import type { VisitWindowInfo, VisitStatus } from '@/lib/visit-scheduling'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const STATUS_COLORS: Record<VisitStatus, string> = {
  completed: 'bg-green-500',
  partial: 'bg-yellow-500',
  pending: 'bg-gray-300',
  overdue: 'bg-red-500',
  upcoming: 'bg-blue-300',
}

const STATUS_RING: Record<VisitStatus, string> = {
  completed: 'ring-green-200',
  partial: 'ring-yellow-200',
  pending: 'ring-gray-200',
  overdue: 'ring-red-200',
  upcoming: 'ring-blue-200',
}

const STATUS_LABELS: Record<VisitStatus, string> = {
  completed: 'Completed',
  partial: 'Partial',
  pending: 'Pending',
  overdue: 'Overdue',
  upcoming: 'Upcoming',
}

function formatDate(date: Date | null): string {
  if (!date) return '--'
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

interface VisitTimelineProps {
  timeline: VisitWindowInfo[]
}

export function VisitTimeline({ timeline }: VisitTimelineProps) {
  if (timeline.length === 0) return null

  return (
    <TooltipProvider delayDuration={200}>
      <div className="overflow-x-auto pb-2">
        <div className="flex items-center gap-1 min-w-max px-2 py-3">
          {timeline.map((visit, idx) => (
            <div key={`${visit.eventId}-${visit.instanceNumber}`} className="flex items-center">
              {/* Node */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center gap-1 min-w-[70px]">
                    <div
                      className={`h-6 w-6 rounded-full ${STATUS_COLORS[visit.status]} ring-2 ${STATUS_RING[visit.status]} flex items-center justify-center`}
                    >
                      {visit.status === 'completed' && (
                        <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" />
                        </svg>
                      )}
                      {visit.status === 'overdue' && (
                        <span className="text-white text-[10px] font-bold">!</span>
                      )}
                    </div>
                    <span className="text-[10px] text-center text-muted-foreground leading-tight max-w-[70px] truncate">
                      {visit.eventName}
                    </span>
                    {visit.dueDate && (
                      <span className="text-[9px] text-muted-foreground/70">
                        {formatDate(visit.dueDate)}
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <div className="space-y-1">
                    <p className="font-medium">{visit.eventName}</p>
                    <p>Status: {STATUS_LABELS[visit.status]}</p>
                    <p>Forms: {visit.formsCompleted}/{visit.formsTotal}</p>
                    {visit.dueDate && <p>Due: {formatDate(visit.dueDate)}</p>}
                    {visit.windowStart && visit.windowEnd && (
                      <p>Window: {formatDate(visit.windowStart)} - {formatDate(visit.windowEnd)}</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>

              {/* Connector line */}
              {idx < timeline.length - 1 && (
                <div className="h-px w-6 bg-muted-foreground/20 mx-0.5" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground px-2">
        {(['completed', 'partial', 'pending', 'upcoming', 'overdue'] as VisitStatus[]).map((status) => (
          <div key={status} className="flex items-center gap-1">
            <div className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[status]}`} />
            <span>{STATUS_LABELS[status]}</span>
          </div>
        ))}
      </div>
    </TooltipProvider>
  )
}
