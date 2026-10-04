import { logger } from '@/lib/monitoring'
import type { Cat } from '@/types/shared'

function csvCell(value: string | number): string {
  const raw = String(value)
  const formulaUnsafe = /^[=+\-@\t\r]/.test(raw)
  const escaped = `"${raw.replace(/"/g, '""')}"`
  return formulaUnsafe ? `"'${raw.replace(/"/g, '""')}"` : ( /[",\n]/.test(raw) ? escaped : raw )
}

function remapImportedCategories(cats: Cat[]): Cat[] {
  const idMap = new Map<string, string>()
  cats.forEach((cat) => {
    idMap.set(cat.id, crypto.randomUUID())
  })
  return cats.map((cat) => ({
    ...cat,
    id: idMap.get(cat.id) || crypto.randomUUID(),
    parent_id: cat.parent_id ? idMap.get(cat.parent_id) ?? null : null,
    values: Array.isArray(cat.values) ? cat.values.slice(0, 12).map((v) => Number(v) || 0) : Array(12).fill(0),
  }))
}

interface ExportData {
  year: number
  exportDate: string
  income: Cat[]
  expense: Cat[]
}

/**
 * Export finance data to JSON
 */
export function exportToJSON(income: Cat[], expense: Cat[], year: number): string {
  const data: ExportData = {
    year,
    exportDate: new Date().toISOString(),
    income,
    expense
  }
  
  return JSON.stringify(data, null, 2)
}

/**
 * Export finance data to CSV
 */
export function exportToCSV(income: Cat[], expense: Cat[], year: number): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  let csv = `Finance Data Export - ${year}\n\n`
  
  // Income section
  csv += 'INCOME\n'
  csv += `Category,${months.join(',')},Total\n`
  
  income.forEach(cat => {
    const total = cat.values.reduce((sum, val) => sum + val, 0)
    csv += `${csvCell(cat.name)},${cat.values.map((v) => csvCell(v)).join(',')},${csvCell(total)}\n`
  })
  
  const incomeTotal = income.reduce((sum, cat) => sum + cat.values.reduce((s, v) => s + v, 0), 0)
  csv += `TOTAL INCOME,${income.reduce((sums, cat) => cat.values.map((v, i) => (sums[i] || 0) + v), Array(12).fill(0) as number[]).join(',')},${incomeTotal}\n`
  
  csv += '\n'
  
  // Expense section
  csv += 'EXPENSE\n'
  csv += `Category,${months.join(',')},Total\n`
  
  expense.forEach(cat => {
    const total = cat.values.reduce((sum, val) => sum + val, 0)
    csv += `${csvCell(cat.name)},${cat.values.map((v) => csvCell(v)).join(',')},${csvCell(total)}\n`
  })
  
  const expenseTotal = expense.reduce((sum, cat) => sum + cat.values.reduce((s, v) => s + v, 0), 0)
  csv += `TOTAL EXPENSE,${expense.reduce((sums, cat) => cat.values.map((v, i) => (sums[i] || 0) + v), Array(12).fill(0) as number[]).join(',')},${expenseTotal}\n`
  
  csv += '\n'
  
  // Balance
  csv += 'BALANCE\n'
  csv += `Month,${months.join(',')},Total\n`
  const balanceByMonth = months.map((_, i) => {
    const inc = income.reduce((sum, cat) => sum + (cat.values[i] || 0), 0)
    const exp = expense.reduce((sum, cat) => sum + (cat.values[i] || 0), 0)
    return inc - exp
  })
  const balanceTotal = balanceByMonth.reduce((sum, val) => sum + val, 0)
  csv += `Balance,${balanceByMonth.join(',')},${balanceTotal}\n`
  
  return csv
}

/**
 * Download file to user's device
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Parse imported JSON data
 */
export function parseJSONImport(jsonString: string): { income: Cat[], expense: Cat[], year: number } | null {
  try {
    const data = JSON.parse(jsonString) as ExportData
    
    // Validate structure
    if (!Array.isArray(data.income) || !Array.isArray(data.expense) || typeof data.year !== 'number') {
      throw new Error('Invalid data structure')
    }

    return {
      income: remapImportedCategories(data.income),
      expense: remapImportedCategories(data.expense),
      year: data.year
    }
  } catch (error) {
    logger.error('Failed to parse JSON:', error)
    return null
  }
}

