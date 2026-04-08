import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-PY', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('es-PY', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export async function generateCodigo(lastCodigo: string | null): Promise<string> {
  if (!lastCodigo) return '0001'
  const num = parseInt(lastCodigo, 10) + 1
  return num.toString().padStart(4, '0')
}

export function generateTicketNumero(year: number, sequence: number): string {
  return `TKT-${year}-${sequence.toString().padStart(6, '0')}`
}

export function generateSolicitudNumero(year: number, sequence: number): string {
  return `SOL-${year}-${sequence.toString().padStart(6, '0')}`
}
