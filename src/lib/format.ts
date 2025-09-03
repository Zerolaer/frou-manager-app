/**
 * Formatting helpers used across the app.
 * Keep exports backwards-compatible: formatCurrencyEUR, formatEUR, formatCurrency, formatNumber, formatDate.
 */

export const formatCurrencyEUR = (n: number, options: Intl.NumberFormatOptions = {}) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2, ...options }).format(n)

// Back-compat aliases
export const formatEUR = (n: number, options: Intl.NumberFormatOptions = {}) => formatCurrencyEUR(n, options)
export const formatCurrency = (n: number, options: Intl.NumberFormatOptions = {}) => formatCurrencyEUR(n, options)

export const formatNumber = (n: number, options: Intl.NumberFormatOptions = {}) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2, ...options }).format(n)

export const formatDate = (d: Date | string | number, opts: Intl.DateTimeFormatOptions = {}) => {
  const date = d instanceof Date ? d : new Date(d)
  return new Intl.DateTimeFormat('ru-RU', { ...opts }).format(date)
}
