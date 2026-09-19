const PDFDocument = require('pdfkit');

/**
 * Creates a standard styled PDF document header
 */
function drawHeader(doc, title, subtitle) {
  doc
    .fillColor('#0d6efd')
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('PING', 50, 40)
    .fillColor('#333333')
    .fontSize(14)
    .text(title, 50, 65, { align: 'right' })
    .fontSize(9)
    .fillColor('#666666')
    .text(subtitle || new Date().toLocaleDateString(), 50, 82, { align: 'right' })
    .moveDown();

  doc
    .strokeColor('#0d6efd')
    .lineWidth(2)
    .moveTo(50, 100)
    .lineTo(550, 100)
    .stroke();
}

/**
 * Generate Purchase Order PDF stream
 */
function createPOPDFStream(poData) {
  const doc = new PDFDocument({ margin: 50 });

  drawHeader(doc, 'PURCHASE ORDER', `PO #: ${poData.poNumber || poData._id}`);

  doc.fontSize(10).fillColor('#333333').font('Helvetica');
  doc.text(`Vendor: ${poData.vendorName || 'N/A'}`, 50, 120);
  doc.text(`Status: ${(poData.status || '').toUpperCase()}`, 50, 135);
  doc.text(`Date Created: ${new Date(poData.createdAt || Date.now()).toLocaleDateString()}`, 50, 150);
  doc.text(`Total Amount: NGN ${(poData.totalAmount || 0).toLocaleString()}`, 350, 120);
  doc.text(`Payment Status: ${(poData.paymentStatus || 'pending').toUpperCase()}`, 350, 135);

  // Table header
  let y = 180;
  doc.fillColor('#0d6efd').rect(50, y, 500, 20).fill();
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
  doc.text('Item Description', 60, y + 5);
  doc.text('Qty', 320, y + 5);
  doc.text('Unit Price', 380, y + 5);
  doc.text('Total', 480, y + 5);

  y += 25;
  doc.fillColor('#333333').font('Helvetica').fontSize(9);

  const items = poData.items || [];
  items.forEach((item) => {
    doc.text(item.itemName || 'Item', 60, y);
    doc.text(String(item.quantity || 0), 320, y);
    doc.text(`NGN ${(item.unitPrice || 0).toLocaleString()}`, 380, y);
    doc.text(`NGN ${(item.totalPrice || (item.quantity * item.unitPrice) || 0).toLocaleString()}`, 480, y);
    y += 20;
  });

  doc.moveTo(50, y).lineTo(550, y).strokeColor('#cccccc').stroke();
  y += 10;
  doc.font('Helvetica-Bold').text(`Total Amount: NGN ${(poData.totalAmount || 0).toLocaleString()}`, 380, y, { align: 'right' });

  doc.moveDown(4);
  doc.fontSize(8).fillColor('#888888').text('This is an electronically generated Purchase Order.', 50, 700, { align: 'center' });

  return doc;
}

/**
 * Generate RFQ PDF stream
 */
function createRFQPDFStream(rfqData) {
  const doc = new PDFDocument({ margin: 50 });

  drawHeader(doc, 'REQUEST FOR QUOTATION', `RFQ #: ${rfqData.rfqNumber || rfqData._id}`);

  doc.fontSize(10).fillColor('#333333').font('Helvetica');
  doc.text(`Vendor: ${rfqData.vendorName || rfqData.vendorId || 'N/A'}`, 50, 120);
  doc.text(`Status: ${(rfqData.status || '').toUpperCase()}`, 50, 135);
  doc.text(`Date: ${new Date(rfqData.createdAt || Date.now()).toLocaleDateString()}`, 50, 150);

  let y = 180;
  doc.fillColor('#0d6efd').rect(50, y, 500, 20).fill();
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
  doc.text('Requested Item', 60, y + 5);
  doc.text('Quantity Required', 380, y + 5);

  y += 25;
  doc.fillColor('#333333').font('Helvetica').fontSize(9);

  const items = rfqData.items || [];
  items.forEach((item) => {
    doc.text(item.itemName || 'Item', 60, y);
    doc.text(String(item.quantity || 0), 380, y);
    y += 20;
  });

  doc.moveDown(4);
  doc.fontSize(8).fillColor('#888888').text('Please return your quotations prior to the deadline.', 50, 700, { align: 'center' });

  return doc;
}

/**
 * Generate Payment Receipt PDF Stream
 */
function createPaymentReceiptPDFStream(paymentData) {
  const doc = new PDFDocument({ margin: 50 });

  drawHeader(doc, 'PAYMENT RECEIPT', `Receipt #: ${paymentData.receiptNumber || paymentData._id}`);

  doc.fontSize(10).fillColor('#333333').font('Helvetica');
  doc.text(`PO Number: ${paymentData.poNumber || paymentData.purchaseOrder || 'N/A'}`, 50, 120);
  doc.text(`Payment Method: ${(paymentData.paymentMethod || 'N/A').toUpperCase()}`, 50, 135);
  doc.text(`Payment Type: ${(paymentData.paymentType || 'full').toUpperCase()}`, 50, 150);
  doc.text(`Date Paid: ${new Date(paymentData.paymentDate || Date.now()).toLocaleDateString()}`, 350, 120);
  doc.text(`Amount Paid: NGN ${(paymentData.amount || 0).toLocaleString()}`, 350, 135);

  doc.moveDown(4);
  doc.fontSize(8).fillColor('#888888').text('Thank you for your transaction.', 50, 700, { align: 'center' });

  return doc;
}

/**
 * Generate GRN (Goods Receipt Note) PDF Stream
 */
function createGRNPDFStream(receiptData) {
  const doc = new PDFDocument({ margin: 50 });

  drawHeader(doc, 'GOODS RECEIPT NOTE (GRN)', `GRN #: ${receiptData.receiptNumber || receiptData.grnNumber || receiptData._id}`);

  doc.fontSize(10).fillColor('#333333').font('Helvetica');
  doc.text(`PO Number: ${receiptData.poNumber || receiptData.purchaseOrder || 'N/A'}`, 50, 120);
  doc.text(`Received Date: ${new Date(receiptData.receivedDate || Date.now()).toLocaleDateString()}`, 50, 135);
  doc.text(`Store Location: ${receiptData.storeLocation?.locationName || 'Main Warehouse'}`, 350, 120);

  let y = 180;
  doc.fillColor('#0d6efd').rect(50, y, 500, 20).fill();
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
  doc.text('Item Description', 60, y + 5);
  doc.text('Qty Received', 320, y + 5);
  doc.text('Condition', 420, y + 5);

  y += 25;
  doc.fillColor('#333333').font('Helvetica').fontSize(9);

  const items = receiptData.receivedItems || [];
  items.forEach((item) => {
    doc.text(item.itemName || 'Item', 60, y);
    doc.text(String(item.quantity || 0), 320, y);
    doc.text((item.condition || 'good').toUpperCase(), 420, y);
    y += 20;
  });

  doc.moveDown(4);
  doc.fontSize(8).fillColor('#888888').text('Inventory has been updated according to this receipt note.', 50, 700, { align: 'center' });

  return doc;
}

module.exports = {
  createPOPDFStream,
  createRFQPDFStream,
  createPaymentReceiptPDFStream,
  createGRNPDFStream,
};
