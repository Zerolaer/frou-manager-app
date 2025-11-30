import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrencyEUR } from '@/lib/format'

interface InvoiceItem {
  id: string
  description: string
  period?: string
  quantity: number
  price: number
  price_per_hour?: number
  hours?: number
  total: number
}

interface Invoice {
  id: string
  invoice_number: string
  date: string
  due_date: string
  notes: string
  // FROM (отправитель) данные
  from_name?: string
  from_country?: string
  from_city?: string
  from_province?: string
  from_address_line1?: string
  from_address_line2?: string
  from_postal_code?: string
  from_account_number?: string
  from_routing_number?: string
  from_swift_bic?: string
  from_bank_name?: string
  from_bank_address?: string
  // TO (клиент) данные
  client_name: string
  client_email?: string
  client_address?: string
  client_phone?: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  items: InvoiceItem[]
}

export async function exportInvoiceToPDF(invoice: Invoice) {
  const doc = new jsPDF()
  
  // Colors
  const primaryColor = [31, 41, 55] // gray-800
  const lightGray = [243, 244, 246] // gray-100
  
  // Header
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, 210, 40, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', 20, 25)
  
  // Invoice number
  doc.setFontSize(14)
  doc.text(`Invoice #${invoice.invoice_number}`, 150, 25)
  
  // Reset text color
  doc.setTextColor(0, 0, 0)
  
  // FROM section (отправитель)
  let yPos = 50
  let fromYPos = 50
  const hasFromData = invoice.from_name || invoice.from_country || invoice.from_city
  
  if (hasFromData) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('From:', 20, fromYPos)
    
    fromYPos += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    
    if (invoice.from_name) {
      doc.text(invoice.from_name, 20, fromYPos)
      fromYPos += 5
    }
    
    // Address (proper order: address lines, then city/province/postal, then country)
    if (invoice.from_address_line1) {
      doc.text(invoice.from_address_line1, 20, fromYPos)
      fromYPos += 5
    }
    if (invoice.from_address_line2) {
      doc.text(invoice.from_address_line2, 20, fromYPos)
      fromYPos += 5
    }
    
    // City, Province, Postal Code
    const cityProvincePostal: string[] = []
    if (invoice.from_city) cityProvincePostal.push(invoice.from_city)
    if (invoice.from_province) cityProvincePostal.push(invoice.from_province)
    if (invoice.from_postal_code) cityProvincePostal.push(invoice.from_postal_code)
    if (cityProvincePostal.length > 0) {
      doc.text(cityProvincePostal.join(', '), 20, fromYPos)
      fromYPos += 5
    }
    
    // Country
    if (invoice.from_country) {
      doc.text(invoice.from_country, 20, fromYPos)
      fromYPos += 5
    }
    
    // Banking information
    if (invoice.from_account_number || invoice.from_routing_number || invoice.from_swift_bic || invoice.from_bank_name) {
      fromYPos += 3
      const bankingParts: string[] = []
      if (invoice.from_account_number) bankingParts.push(`Account: ${invoice.from_account_number}`)
      if (invoice.from_routing_number) bankingParts.push(`Routing: ${invoice.from_routing_number}`)
      if (invoice.from_swift_bic) bankingParts.push(`SWIFT/BIC: ${invoice.from_swift_bic}`)
      if (invoice.from_bank_name) bankingParts.push(invoice.from_bank_name)
      if (invoice.from_bank_address) bankingParts.push(invoice.from_bank_address)
      
      bankingParts.forEach(part => {
        doc.text(part, 20, fromYPos)
        fromYPos += 4
      })
    }
    
    yPos = Math.max(yPos, fromYPos)
  }
  
  // TO section (получатель)
  let toYPos = 50
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('To Client:', 105, toYPos)
  
  toYPos += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(invoice.client_name, 105, toYPos)
  
  if (invoice.client_email) {
    toYPos += 5
    doc.text(invoice.client_email, 105, toYPos)
  }
  
  if (invoice.client_phone) {
    toYPos += 5
    doc.text(invoice.client_phone, 105, toYPos)
  }
  
  if (invoice.client_address) {
    const addressLines = invoice.client_address.split('\n')
    addressLines.forEach(line => {
      toYPos += 5
      doc.text(line, 105, toYPos)
    })
  }
  
  // Invoice details
  yPos = Math.max(yPos, toYPos) + 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Invoice Details:', 20, yPos)
  
  yPos += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Date: ${new Date(invoice.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 20, yPos)
  
  yPos += 5
  doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 20, yPos)
  
  // Items table
  const tableStartY = Math.max(90, yPos + 15)
  
  // Determine which columns to show based on item data
  const hasPeriod = invoice.items.some(item => item.period)
  const hasHours = invoice.items.some(item => item.hours)
  
  const tableHead: string[][] = [['Description']]
  if (hasPeriod) tableHead[0].push('Period')
  if (hasHours) tableHead[0].push('Hours')
  tableHead[0].push('Price', 'Total')
  
  const tableBody = invoice.items.map(item => {
    const row: string[] = [item.description]
    if (hasPeriod) row.push(item.period || '-')
    if (hasHours) row.push(item.hours ? item.hours.toString() : '-')
    row.push(formatCurrencyEUR(item.price))
    row.push(formatCurrencyEUR(item.total))
    return row
  })
  
  // Calculate column widths
  const columnStyles: any = {
    0: { cellWidth: hasPeriod || hasHours ? 70 : 100 }
  }
  let colIndex = 1
  if (hasPeriod) {
    columnStyles[colIndex] = { cellWidth: 50 }
    colIndex++
  }
  if (hasHours) {
    columnStyles[colIndex] = { cellWidth: 25, halign: 'right' }
    colIndex++
  }
  columnStyles[colIndex] = { halign: 'right', cellWidth: 30 }
  columnStyles[colIndex + 1] = { halign: 'right', cellWidth: 30 }
  
  autoTable(doc, {
    startY: tableStartY,
    head: tableHead,
    body: tableBody,
    headStyles: {
      fillColor: primaryColor,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 9
    },
    alternateRowStyles: {
      fillColor: lightGray
    },
    columnStyles,
    margin: { left: 20, right: 20 }
  })
  
  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  let totalsY = finalY
  doc.text('Subtotal:', 150, totalsY)
  doc.text(formatCurrencyEUR(invoice.subtotal), 180, totalsY, { align: 'right' })
  
  if (invoice.tax_rate > 0) {
    totalsY += 5
    doc.text(`Tax (${invoice.tax_rate}%):`, 150, totalsY)
    doc.text(formatCurrencyEUR(invoice.tax_amount), 180, totalsY, { align: 'right' })
  }
  
  totalsY += 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Total:', 150, totalsY)
  doc.text(formatCurrencyEUR(invoice.total), 180, totalsY, { align: 'right' })
  
  // Notes
  if (invoice.notes) {
    totalsY += 15
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Notes:', 20, totalsY)
    
    totalsY += 5
    doc.setFont('helvetica', 'normal')
    const notesLines = doc.splitTextToSize(invoice.notes, 170)
    doc.text(notesLines, 20, totalsY)
  }
  
  // Footer
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(8)
  doc.setTextColor(128, 128, 128)
  doc.text('Thank you for your business!', 105, pageHeight - 20, { align: 'center' })
  
  // Save PDF
  doc.save(`invoice-${invoice.invoice_number}.pdf`)
}

