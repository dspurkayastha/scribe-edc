'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { createEventForm, deleteEventForm, updateEventForm } from '@/server/actions/study'
import type { StudyEventRow, FormDefinitionRow, EventFormRow } from '@/types/database'

interface EventFormMatrixProps {
  studyId: string
  events: StudyEventRow[]
  forms: FormDefinitionRow[]
  eventForms: EventFormRow[]
}

export function EventFormMatrix({ studyId, events, forms, eventForms }: EventFormMatrixProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Build a lookup: `${eventId}__${formId}` -> EventFormRow
  const [efMap, setEfMap] = useState(() => {
    const map = new Map<string, EventFormRow>()
    for (const ef of eventForms) {
      map.set(`${ef.event_id}__${ef.form_id}`, ef)
    }
    return map
  })

  function getKey(eventId: string, formId: string) {
    return `${eventId}__${formId}`
  }

  function handleToggleAssignment(eventId: string, formId: string) {
    const key = getKey(eventId, formId)
    const existing = efMap.get(key)

    startTransition(async () => {
      if (existing) {
        // Remove assignment
        const result = await deleteEventForm(studyId, existing.id)
        if (!result.success) {
          toast.error(result.error)
          return
        }
        setEfMap((prev) => {
          const next = new Map(prev)
          next.delete(key)
          return next
        })
      } else {
        // Create assignment
        const result = await createEventForm(studyId, {
          eventId,
          formId,
          isRequired: true,
        })
        if (!result.success) {
          toast.error(result.error)
          return
        }
        setEfMap((prev) => {
          const next = new Map(prev)
          next.set(key, result.data)
          return next
        })
      }
      router.refresh()
    })
  }

  function handleToggleRequired(eventId: string, formId: string) {
    const key = getKey(eventId, formId)
    const existing = efMap.get(key)
    if (!existing) return

    startTransition(async () => {
      const result = await updateEventForm(studyId, existing.id, {
        isRequired: !existing.is_required,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setEfMap((prev) => {
        const next = new Map(prev)
        next.set(key, result.data)
        return next
      })
      router.refresh()
    })
  }

  if (events.length === 0 || forms.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">
          {events.length === 0
            ? 'No events defined yet. Create events first.'
            : 'No forms defined yet. Create forms first.'}
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-background z-10 min-w-[160px]">
              Event / Form
            </TableHead>
            {forms.map((form) => (
              <TableHead key={form.id} className="text-center min-w-[120px]">
                <div className="text-xs font-medium">{form.title}</div>
                <div className="text-[10px] text-muted-foreground font-normal">{form.slug}</div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="sticky left-0 bg-background z-10 font-medium">
                <div className="text-sm">{event.label}</div>
                <div className="text-[10px] text-muted-foreground">{event.name}</div>
              </TableCell>
              {forms.map((form) => {
                const key = getKey(event.id, form.id)
                const ef = efMap.get(key)
                const isAssigned = !!ef

                return (
                  <TableCell key={form.id} className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Checkbox
                        checked={isAssigned}
                        onCheckedChange={() => handleToggleAssignment(event.id, form.id)}
                        disabled={isPending}
                        aria-label={`Assign ${form.title} to ${event.label}`}
                      />
                      {isAssigned && (
                        <button
                          type="button"
                          onClick={() => handleToggleRequired(event.id, form.id)}
                          disabled={isPending}
                          className="cursor-pointer"
                        >
                          <Badge
                            variant="outline"
                            className={
                              ef.is_required
                                ? 'text-[10px] bg-blue-50 text-blue-700 hover:bg-blue-100'
                                : 'text-[10px] bg-gray-50 text-gray-500 hover:bg-gray-100'
                            }
                          >
                            {ef.is_required ? 'Req' : 'Opt'}
                          </Badge>
                        </button>
                      )}
                    </div>
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
