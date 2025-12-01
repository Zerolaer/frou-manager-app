import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrencyEUR } from '@/lib/format'

type ItemType = 'product' | 'service_period' | 'hourly'

interface InvoiceItem {
  id: string
  description: string
  period?: string
  quantity: number
  price: number
  price_per_hour?: number
  hours?: number
  total: number
  item_type?: ItemType
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

export async function exportInvoiceToPDF(invoice: Invoice, headerColor?: string) {
  const doc = new jsPDF()
  
  // Colors
  // Parse header color from hex to RGB
  let primaryColor: [number, number, number] = [31, 41, 55] // gray-800 default
  if (headerColor) {
    const hex = headerColor.replace('#', '')
    primaryColor = [
      parseInt(hex.substring(0, 2), 16),
      parseInt(hex.substring(2, 4), 16),
      parseInt(hex.substring(4, 6), 16)
    ]
  }
  const lightGray: [number, number, number] = [243, 244, 246] // gray-100
  
  // Header with dark background
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(0, 0, 210, 45, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', 20, 28)
  
  // Invoice number
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Invoice #${invoice.invoice_number}`, 150, 28)
  
  // Reset text color
  doc.setTextColor(0, 0, 0)
  
  // Format date as DD.MM.YYYY
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}.${month}.${year}`
  }
  
  // FROM and TO sections side by side
  let yPos = 55
  let fromYPos = 55
  const hasFromData = invoice.from_name || invoice.from_country || invoice.from_city
  
  // FROM section (left side)
  if (hasFromData) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 100, 100)
    doc.text('FROM', 20, fromYPos)
    
    fromYPos += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    
    if (invoice.from_name) {
      doc.setFont('helvetica', 'bold')
      doc.text(invoice.from_name, 20, fromYPos)
      fromYPos += 6
    }
    
    doc.setFont('helvetica', 'normal')
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
      fromYPos += 4
      doc.setFontSize(9)
      if (invoice.from_account_number) {
        doc.text(`Account: ${invoice.from_account_number}`, 20, fromYPos)
        fromYPos += 4
      }
      if (invoice.from_routing_number) {
        doc.text(`Routing: ${invoice.from_routing_number}`, 20, fromYPos)
        fromYPos += 4
      }
      if (invoice.from_swift_bic) {
        doc.text(`SWIFT/BIC: ${invoice.from_swift_bic}`, 20, fromYPos)
        fromYPos += 4
      }
      if (invoice.from_bank_name) {
        doc.text(invoice.from_bank_name, 20, fromYPos)
        fromYPos += 4
      }
      if (invoice.from_bank_address) {
        doc.text(invoice.from_bank_address, 20, fromYPos)
        fromYPos += 4
      }
      doc.setFontSize(11)
    }
    
    yPos = Math.max(yPos, fromYPos)
  }
  
  // TO section (right side)
  let toYPos = 55
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('TO', 105, toYPos)
  
  toYPos += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text(invoice.client_name, 105, toYPos)
  
  toYPos += 6
  doc.setFont('helvetica', 'normal')
  if (invoice.client_email) {
    doc.text(invoice.client_email, 105, toYPos)
    toYPos += 5
  }
  
  if (invoice.client_phone) {
    doc.text(invoice.client_phone, 105, toYPos)
    toYPos += 5
  }
  
  if (invoice.client_address) {
    const addressLines = invoice.client_address.split('\n')
    addressLines.forEach(line => {
      doc.text(line, 105, toYPos)
      toYPos += 5
    })
  }
  
  // Invoice details (below addresses)
  yPos = Math.max(yPos, toYPos) + 12
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text('INVOICE DETAILS', 20, yPos)
  
  yPos += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text(`Date: ${formatDate(invoice.date)}`, 20, yPos)
  
  yPos += 5
  doc.text(`Due Date: ${formatDate(invoice.due_date)}`, 20, yPos)
  
  // Items table
  const tableStartY = Math.max(100, yPos + 12)
  
  // Determine which columns to show based on item types
  const hasPeriod = invoice.items.some(item => item.item_type === 'service_period' || item.period)
  const hasHours = invoice.items.some(item => item.item_type === 'hourly' || item.hours)
  const hasQuantity = invoice.items.some(item => item.item_type === 'product' || (!item.item_type && item.quantity > 1))
  
  const tableHead: string[][] = [['Description']]
  if (hasPeriod) tableHead[0].push('Period')
  if (hasQuantity) tableHead[0].push('Qty')
  if (hasHours) tableHead[0].push('Hours')
  tableHead[0].push('Price', 'Total')
  
  const tableBody = invoice.items.map(item => {
    const itemType = item.item_type || 'product'
    const row: string[] = [item.description]
    
    if (hasPeriod) {
      if (itemType === 'service_period' && item.period) {
        row.push(item.period)
      } else {
        row.push(item.period || '-')
      }
    }
    
    if (hasQuantity) {
      if (itemType === 'product') {
        row.push(item.quantity.toString())
      } else {
        row.push('-')
      }
    }
    
    if (hasHours) {
      if (itemType === 'hourly' && item.hours) {
        row.push(item.hours.toString())
      } else {
        row.push(item.hours ? item.hours.toString() : '-')
      }
    }
    
    row.push(formatCurrencyEUR(item.price))
    row.push(formatCurrencyEUR(item.total))
    return row
  })
  
  // Calculate column widths
  const columnStyles: any = {
    0: { cellWidth: hasPeriod || hasHours || hasQuantity ? 60 : 100 }
  }
  let colIndex = 1
  if (hasPeriod) {
    columnStyles[colIndex] = { cellWidth: 50 }
    colIndex++
  }
  if (hasQuantity) {
    columnStyles[colIndex] = { cellWidth: 20, halign: 'right' }
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
      fillColor: [primaryColor[0], primaryColor[1], primaryColor[2]],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 10
    },
    styles: {
      lineColor: [primaryColor[0], primaryColor[1], primaryColor[2]],
      lineWidth: 0.1
    },
    bodyStyles: {
      fontSize: 9
    },
    alternateRowStyles: {
      fillColor: [lightGray[0], lightGray[1], lightGray[2]]
    },
    columnStyles,
    margin: { left: 20, right: 20 }
  })
  
  // Totals section
  const finalY = (doc as any).lastAutoTable.finalY + 12
  
  // Draw a line above totals
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.5)
  doc.line(150, finalY - 2, 190, finalY - 2)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  
  let totalsY = finalY
  doc.text('Subtotal:', 150, totalsY)
  doc.text(formatCurrencyEUR(invoice.subtotal), 190, totalsY, { align: 'right' })
  
  if (invoice.tax_rate > 0) {
    totalsY += 6
    doc.text(`Tax (${invoice.tax_rate}%):`, 150, totalsY)
    doc.text(formatCurrencyEUR(invoice.tax_amount), 190, totalsY, { align: 'right' })
  }
  
  totalsY += 8
  // Draw a line before total
  doc.setDrawColor(150, 150, 150)
  doc.setLineWidth(0.8)
  doc.line(150, totalsY - 2, 190, totalsY - 2)
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Total:', 150, totalsY)
  doc.text(formatCurrencyEUR(invoice.total), 190, totalsY, { align: 'right' })
  
  // Notes
  if (invoice.notes) {
    totalsY += 15
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text('NOTES', 20, totalsY)
    
    totalsY += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    const notesLines = doc.splitTextToSize(invoice.notes, 170)
    doc.text(notesLines, 20, totalsY)
  }
  
  // Footer
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('Thank you for your business!', 105, pageHeight - 15, { align: 'center' })
  
  // Save PDF
  doc.save(`invoice-${invoice.invoice_number}.pdf`)
}

