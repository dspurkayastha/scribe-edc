'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateStudyMemberRole } from '@/server/actions/study'
import type { MemberRole } from '@/types/database'

const ROLE_OPTIONS: { value: MemberRole; label: string }[] = [
  { value: 'pi', label: 'PI' },
  { value: 'co_investigator', label: 'Co-Investigator' },
  { value: 'data_entry', label: 'Data Entry' },
  { value: 'read_only', label: 'Read Only' },
  { value: 'monitor', label: 'Monitor' },
]

interface RoleChangeSelectProps {
  memberId: string
  studyId: string
  currentRole: MemberRole
}

export function RoleChangeSelect({ memberId, studyId, currentRole }: RoleChangeSelectProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleRoleChange(newRole: string) {
    if (newRole === currentRole) return

    startTransition(async () => {
      const result = await updateStudyMemberRole(memberId, studyId, newRole as MemberRole)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(`Role updated to ${ROLE_OPTIONS.find((r) => r.value === newRole)?.label ?? newRole}`)
      router.refresh()
    })
  }

  return (
    <Select value={currentRole} onValueChange={handleRoleChange} disabled={isPending}>
      <SelectTrigger size="sm" className="w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLE_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
