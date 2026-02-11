'use client'

import { useState, useEffect, useCallback } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CheckCircleIcon, XCircleIcon, InfoIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExpressionInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}

export function ExpressionInput({ value, onChange, placeholder, rows = 2 }: ExpressionInputProps) {
  const [status, setStatus] = useState<'empty' | 'valid' | 'invalid'>('empty')
  const [errorMsg, setErrorMsg] = useState('')

  const validate = useCallback(async (expr: string) => {
    if (!expr.trim()) {
      setStatus('empty')
      setErrorMsg('')
      return
    }

    try {
      // Dynamic import to keep client bundle small
      const { validateExpression } = await import('@/lib/form-engine/expression-safety')
      const errors = validateExpression(expr)
      if (errors.length === 0) {
        setStatus('valid')
        setErrorMsg('')
      } else {
        setStatus('invalid')
        setErrorMsg(errors[0])
      }
    } catch {
      setStatus('invalid')
      setErrorMsg('Could not validate expression')
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => validate(value), 300)
    return () => clearTimeout(timer)
  }, [value, validate])

  return (
    <div className="relative">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          'font-mono text-sm pr-8',
          status === 'valid' && 'border-green-400',
          status === 'invalid' && 'border-red-400'
        )}
      />
      <div className="absolute top-2 right-2 flex items-center gap-1">
        {status === 'valid' && <CheckCircleIcon className="h-4 w-4 text-green-500" />}
        {status === 'invalid' && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <XCircleIcon className="h-4 w-4 text-red-500" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="text-xs">{errorMsg}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <InfoIcon className="h-3.5 w-3.5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-sm">
              <div className="text-xs space-y-1">
                <p className="font-medium">Filtrex Expression Syntax</p>
                <p>Reference fields: <code className="bg-muted px-1 rounded">{'{field_id}'}</code></p>
                <p>Operators: <code className="bg-muted px-1 rounded">==</code> <code className="bg-muted px-1 rounded">!=</code> <code className="bg-muted px-1 rounded">&gt;</code> <code className="bg-muted px-1 rounded">&lt;</code> <code className="bg-muted px-1 rounded">and</code> <code className="bg-muted px-1 rounded">or</code> <code className="bg-muted px-1 rounded">not</code></p>
                <p>Functions: <code className="bg-muted px-1 rounded">round()</code> <code className="bg-muted px-1 rounded">abs()</code> <code className="bg-muted px-1 rounded">min()</code> <code className="bg-muted px-1 rounded">max()</code></p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}
