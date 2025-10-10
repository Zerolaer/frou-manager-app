import { logger } from '@/lib/monitoring'
import type { Cat } from '@/types/shared'

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
    csv += `${cat.name},${cat.values.join(',')},${total}\n`
  })
  
  const incomeTotal = income.reduce((sum, cat) => sum + cat.values.reduce((s, v) => s + v, 0), 0)
  csv += `TOTAL INCOME,${income.reduce((sums, cat) => cat.values.map((v, i) => (sums[i] || 0) + v), Array(12).fill(0) as number[]).join(',')},${incomeTotal}\n`
  
  csv += '\n'
  
  // Expense section
  csv += 'EXPENSE\n'
  csv += `Category,${months.join(',')},Total\n`
  
  expense.forEach(cat => {
    const total = cat.values.reduce((sum, val) => sum + val, 0)
    csv += `${cat.name},${cat.values.join(',')},${total}\n`
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
    if (!data.income || !data.expense || !data.year) {
      throw new Error('Invalid data structure')
    }
    
    return {
      income: data.income,
      expense: data.expense,
      year: data.year
    }
  } catch (error) {
    logger.error('Failed to parse JSON:', error)
    return null
  }
}

