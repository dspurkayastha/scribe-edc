'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileTextIcon, CheckIcon } from 'lucide-react'
import { formTemplates, type FormTemplate } from '@/lib/templates/form-templates'
import { cn } from '@/lib/utils'

interface TemplatePickerProps {
  selected: string | null
  onSelect: (template: FormTemplate | null) => void
}

export function TemplatePicker({ selected, onSelect }: TemplatePickerProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Start from a template or create a blank form.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {/* Blank form option */}
        <Card
          className={cn(
            'cursor-pointer transition-all hover:border-primary/50',
            selected === null && 'border-primary ring-1 ring-primary'
          )}
          onClick={() => onSelect(null)}
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <FileTextIcon className="h-4 w-4 text-muted-foreground" />
              {selected === null && <CheckIcon className="h-4 w-4 text-primary" />}
            </div>
            <p className="text-sm font-medium mt-2">Blank Form</p>
            <p className="text-xs text-muted-foreground">Start from scratch</p>
          </CardContent>
        </Card>

        {/* Template cards */}
        {formTemplates.map((template) => (
          <Card
            key={template.id}
            className={cn(
              'cursor-pointer transition-all hover:border-primary/50',
              selected === template.id && 'border-primary ring-1 ring-primary'
            )}
            onClick={() => onSelect(template)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">
                  {template.fieldCount} fields
                </Badge>
                {selected === template.id && <CheckIcon className="h-4 w-4 text-primary" />}
              </div>
              <p className="text-sm font-medium mt-2">{template.name}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
