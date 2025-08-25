/* General utility functions (exposes cn) */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges multiple class names into a single string
 * @param inputs - Array of class names
 * @returns Merged class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date string to Brazilian format (DD/MM/YYYY)
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR')
  } catch (error) {
    return ''
  }
}

/**
 * Formats a date string to Brazilian format with time (DD/MM/YYYY HH:mm)
 * @param dateString - ISO date string
 * @returns Formatted date string with time
 */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch (error) {
    return ''
  }
}

/**
 * Formats a number as Brazilian currency (R$ 0.000,00)
 * @param value - Number to format
 * @returns Formatted currency string
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

/**
 * Formats a number as compact Brazilian currency (R$ 1,2K, R$ 1,5M)
 * @param value - Number to format
 * @returns Formatted compact currency string
 */
export function formatCompactCurrency(value: number): string {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`
  } else if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}K`
  } else {
    return formatCurrency(value)
  }
}

// Add any other utility functions here
