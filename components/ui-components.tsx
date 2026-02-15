'use client'

import React, { forwardRef, useState } from 'react'
import {
  ChevronDown,
  AlertTriangle,
  MapPin,
  Loader2,
  LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// ============================================================================
// InputField
// ============================================================================

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  unit?: string
  error?: string
  warning?: string
  hint?: string
  maxWidth?: string
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  (
    { label, unit, error, warning, hint, maxWidth, className, id, ...props },
    ref
  ) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="space-y-2">
        <label
          htmlFor={inputId}
          className="text-foreground block text-sm font-medium"
        >
          {label}
        </label>
        <div className={cn('relative', maxWidth)}>
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'bg-input text-foreground w-full rounded-lg border px-4 py-3 font-mono text-lg',
              'placeholder:text-muted-foreground',
              'focus:ring-ring focus:border-transparent focus:ring-2 focus:outline-none',
              'transition-colors',
              error && 'border-destructive focus:ring-destructive',
              warning && !error && 'border-warning focus:ring-warning',
              !error && !warning && 'border-border',
              unit && 'pr-14',
              className
            )}
            {...props}
          />
          {unit && (
            <span className="text-muted-foreground absolute top-1/2 right-4 -translate-y-1/2 text-sm font-medium">
              {unit}
            </span>
          )}
        </div>
        {hint && !error && !warning && (
          <p className="text-muted-foreground text-xs">{hint}</p>
        )}
        {warning && !error && (
          <p className="text-warning flex items-center gap-1.5 text-xs">
            <AlertTriangle className="h-3 w-3" />
            {warning}
          </p>
        )}
        {error && <p className="text-destructive text-xs">{error}</p>}
      </div>
    )
  }
)
InputField.displayName = 'InputField'

// ============================================================================
// TemperatureField
// ============================================================================

interface TemperatureFieldProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onFetchGeo: () => Promise<void>
  isLoadingGeo: boolean
  geoError: string | null
  error?: string
  warning?: string
}

export function TemperatureField({
  value,
  onChange,
  onFetchGeo,
  isLoadingGeo,
  geoError,
  error,
  warning,
}: TemperatureFieldProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor="temperatura"
        className="text-foreground block text-sm font-medium"
      >
        Temperatura
      </label>
      <div className="flex items-center gap-2">
        <div className="relative max-w-[180px]">
          <input
            id="temperatura"
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="20"
            value={value}
            onChange={onChange}
            className={cn(
              'bg-input text-foreground w-full rounded-lg border px-4 py-3 pr-14 font-mono text-lg',
              'placeholder:text-muted-foreground',
              'focus:ring-ring focus:border-transparent focus:ring-2 focus:outline-none',
              'transition-colors',
              error && 'border-destructive focus:ring-destructive',
              warning && !error && 'border-warning focus:ring-warning',
              !error && !warning && 'border-border'
            )}
          />
          <span className="text-muted-foreground absolute top-1/2 right-4 -translate-y-1/2 text-sm font-medium">
            °C
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onFetchGeo}
          disabled={isLoadingGeo}
          className="hover:bg-primary/10 hover:text-foreground h-[50px] shrink-0 gap-2 bg-transparent"
          title="Obtener temperatura local"
        >
          {isLoadingGeo ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        Temperatura ambiente del líquido
      </p>
      {warning && !error && (
        <p className="text-warning flex items-center gap-1.5 text-xs">
          <AlertTriangle className="h-3 w-3" />
          {warning}
        </p>
      )}
      {error && <p className="text-destructive text-xs">{error}</p>}
      {geoError && <p className="text-destructive text-xs">{geoError}</p>}
    </div>
  )
}

// ============================================================================
// ResultDisplay
// ============================================================================

interface ResultDisplayProps {
  label: string
  value: string | number
  unit?: string
  highlight?: boolean
  className?: string
  dragData?: Record<string, string>
}

export function ResultDisplay({
  label,
  value,
  unit,
  highlight = false,
  className,
  dragData,
}: ResultDisplayProps) {
  return (
    <div
      draggable={!!dragData}
      onDragStart={(e) => {
        if (dragData) {
          e.dataTransfer.setData('application/json', JSON.stringify(dragData))
          e.dataTransfer.effectAllowed = 'copy'
        }
      }}
      className={cn(
        'rounded-lg border p-4',
        highlight ? 'border-primary bg-primary/10' : 'border-border bg-card',
        dragData && 'cursor-grab active:cursor-grabbing',
        className
      )}
    >
      <p className="text-muted-foreground mb-1 text-sm">{label}</p>
      <p
        className={cn(
          'font-mono text-2xl font-semibold',
          highlight ? 'text-primary' : 'text-foreground'
        )}
      >
        {value}
        {unit && (
          <span className="text-muted-foreground ml-2 text-base font-normal">
            {unit}
          </span>
        )}
      </p>
    </div>
  )
}

// ============================================================================
// NerdCard (collapsible calculation details)
// ============================================================================

interface NerdCardProps {
  children: React.ReactNode
  className?: string
}

export function NerdCard({ children, className }: NerdCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div
      className={cn('border-border bg-card mt-4 rounded-lg border', className)}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium transition-colors"
        aria-expanded={isOpen}
      >
        <span>Ver cálculo detallado</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="border-border text-muted-foreground space-y-2 border-t px-4 py-3 font-mono text-xs">
          {children}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// ModuleCard
// ============================================================================

interface ModuleCardProps {
  title: string
  description: string
  icon: LucideIcon
  active?: boolean
  onClick?: () => void
  onDrop?: (e: React.DragEvent) => void
}

export function ModuleCard({
  title,
  description,
  icon: Icon,
  active = false,
  onClick,
  onDrop,
}: ModuleCardProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  return (
    <button
      type="button"
      onClick={onClick}
      onDragOver={(e) => {
        if (onDrop) {
          e.preventDefault()
          setIsDragOver(true)
        }
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        if (onDrop) {
          e.preventDefault()
          setIsDragOver(false)
          onDrop(e)
        }
      }}
      className={cn(
        'flex w-full items-start gap-4 rounded-lg border p-4 text-left transition-all',
        'hover:border-primary/50 hover:bg-primary/5',
        active ? 'border-primary bg-primary/10' : 'border-border bg-card',
        isDragOver && 'border-primary ring-primary/20 bg-primary/20 ring-2'
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          active
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground'
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <h3 className="text-foreground font-medium">{title}</h3>
        <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
          {description}
        </p>
      </div>
    </button>
  )
}
