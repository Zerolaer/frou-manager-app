import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrencyEUR } from '@/lib/format'

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  price: number
  total: number
}

interface Invoice {
  id: string
  invoice_number: string
  client_name: string
  client_email: string
  client_address: string
  date: string
  due_date: string
  notes: string
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
  
  // Bill To section
  let yPos = 50
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Bill To:', 20, yPos)
  
  yPos += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(invoice.client_name, 20, yPos)
  
  if (invoice.client_email) {
    yPos += 5
    doc.text(invoice.client_email, 20, yPos)
  }
  
  if (invoice.client_address) {
    const addressLines = invoice.client_address.split('\n')
    addressLines.forEach(line => {
      yPos += 5
      doc.text(line, 20, yPos)
    })
  }
  
  // Invoice details
  yPos = 50
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Invoice Details:', 150, yPos)
  
  yPos += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Date: ${new Date(invoice.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 150, yPos)
  
  yPos += 5
  doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 150, yPos)
  
  // Items table
  const tableStartY = Math.max(90, yPos + 15)
  
  autoTable(doc, {
    startY: tableStartY,
    head: [['Description', 'Quantity', 'Price', 'Total']],
    body: invoice.items.map(item => [
      item.description,
      item.quantity.toString(),
      formatCurrencyEUR(item.price),
      formatCurrencyEUR(item.total)
    ]),
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
    columnStyles: {
      0: { cellWidth: 100 },
      1: { halign: 'right', cellWidth: 25 },
      2: { halign: 'right', cellWidth: 30 },
      3: { halign: 'right', cellWidth: 30 }
    },
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

