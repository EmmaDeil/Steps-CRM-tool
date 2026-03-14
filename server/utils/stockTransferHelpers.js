/**
 * Shared helpers for stock transfer operations.
 * Extracted here to avoid circular imports between
 * stockTransfer.routes.js and procurement.routes.js
 */

const StockTransfer = require('../models/StockTransfer');

// ── Stock level helpers ──────────────────────────────────────────────────────

/**
 * Get the quantity available for a specific item at a specific location.
 * Returns aggregate `quantity` when no stockLevels entry exists for that location,
 * ensuring backwards-compatibility with items that haven't been location-tracked yet.
 */
function getStockAtLocation(item, locationId) {
  if (!locationId) return item.quantity;
  if (!item.stockLevels || item.stockLevels.length === 0) {
    // Legacy item — no per-location data; fall back to aggregate quantity
    return item.quantity;
  }
  const level = item.stockLevels.find(
    (sl) => sl.locationId && sl.locationId.toString() === locationId.toString()
  );
  return level ? level.quantity : 0;
}

/**
 * Update (or create) a stock level entry for a location on an item.
 * Mutates the item in place — caller must call item.save().
 *
 * @param {Object}  item         Mongoose InventoryItem document
 * @param {string}  locationId   StoreLocation _id (string or ObjectId)
 * @param {string}  locationName Human-readable location name (for display)
 * @param {number}  delta        Positive = stock in, Negative = stock out
 */
function updateStockLevel(item, locationId, locationName, delta) {
  if (!item.stockLevels) item.stockLevels = [];
  const idx = item.stockLevels.findIndex(
    (sl) => sl.locationId && sl.locationId.toString() === locationId.toString()
  );
  if (idx >= 0) {
    item.stockLevels[idx].quantity = Math.max(0, item.stockLevels[idx].quantity + delta);
  } else {
    if (delta > 0) {
      item.stockLevels.push({ locationId, locationName, quantity: delta });
    }
  }
  // Keep aggregate in sync
  item.quantity = item.stockLevels.reduce((s, sl) => s + sl.quantity, 0);
  item.lastUpdated = new Date();
}

// ── Waybill helpers ──────────────────────────────────────────────────────────

/** Auto-generate a unique waybill number (WB-YYMM-XXXXX) */
async function generateWaybillNumber() {
  const yearMonth = new Date().toISOString().slice(2, 7).replace('-', '');
  const count = await StockTransfer.countDocuments({ waybillNumber: { $ne: null } });
  return `WB-${yearMonth}-${String(count + 1).padStart(5, '0')}`;
}

/** Build and return printable waybill HTML string */
function buildWaybillHTML(transfer, companyName = 'Steps CRM') {
  const rows = transfer.lineItems
    .map(
      (li) => `
    <tr>
      <td>${li.itemCode}</td>
      <td>${li.itemName}</td>
      <td style="text-align:center">${li.transferredQty || li.requestedQty}</td>
      <td style="text-align:center">${li.unit}</td>
      <td>${li.notes || ''}</td>
    </tr>`
    )
    .join('');

  const qrData = encodeURIComponent(
    `${transfer.waybillNumber} | ${transfer.transferNumber} | ${transfer.fromLocationName} \u2192 ${transfer.toLocationName}`
  );
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${qrData}&margin=4&format=svg`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Waybill ${transfer.waybillNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .company { font-size: 22px; font-weight: bold; color: #1d4ed8; }
    .doc-info { text-align: right; display: flex; align-items: flex-start; gap: 16px; }
    .doc-info-text { text-align: right; }
    .doc-info h2 { font-size: 18px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; color: #374151; }
    .doc-info p { margin-top: 4px; color: #6b7280; }
    .qr-box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 4px; background: #fff; }
    .qr-label { font-size: 8px; text-align: center; color: #9ca3af; margin-top: 2px; font-weight: bold; text-transform: uppercase; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .meta-item label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #6b7280; display: block; margin-bottom: 2px; }
    .meta-item span { font-size: 13px; font-weight: 600; }
    .route { background: #dbeafe; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; display: flex; align-items: center; gap: 16px; }
    .route-box { flex: 1; }
    .route-box label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #1d4ed8; }
    .route-box span { display: block; font-size: 14px; font-weight: bold; }
    .arrow { font-size: 24px; color: #1d4ed8; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
    th { background: #1d4ed8; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
    td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) td { background: #f9fafb; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 32px; }
    .sig-box { border-top: 2px solid #111; padding-top: 8px; }
    .sig-box label { font-size: 10px; text-transform: uppercase; color: #6b7280; }
    .footer { margin-top: 24px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
    @media print { button { display: none !important; } body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company">${companyName}</div>
      <div style="color:#6b7280;margin-top:4px;">Stock Transfer Waybill</div>
    </div>
    <div class="doc-info">
      <div class="doc-info-text">
        <h2>Waybill</h2>
        <p><strong>${transfer.waybillNumber}</strong></p>
        <p>Transfer: ${transfer.transferNumber}</p>
        <p>Date: ${new Date(transfer.completedAt || transfer.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
      </div>
      <div class="qr-box">
        <img src="${qrUrl}" width="100" height="100" alt="QR Code" />
        <div class="qr-label">Scan to verify</div>
      </div>
    </div>
  </div>
  <div class="route">
    <div class="route-box"><label>From</label><span>${transfer.fromLocationName}</span></div>
    <div class="arrow">&#10132;</div>
    <div class="route-box"><label>To</label><span>${transfer.toLocationName}</span></div>
  </div>
  <div class="meta-grid">
    <div class="meta-item"><label>Requested By</label><span>${transfer.requestedByName || '—'}</span></div>
    <div class="meta-item"><label>Approved By</label><span>${transfer.approvedByName || '—'}</span></div>
    <div class="meta-item"><label>Status</label><span style="text-transform:capitalize">${transfer.status}</span></div>
    <div class="meta-item"><label>Notes</label><span>${transfer.notes || '—'}</span></div>
  </div>
  <table>
    <thead><tr>
      <th>Item Code</th><th>Item Name</th>
      <th style="text-align:center">Qty</th><th style="text-align:center">Unit</th><th>Notes</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="sig-grid">
    <div class="sig-box"><label>Issued By</label><br/><br/><br/><span style="font-size:10px;color:#6b7280">Name &amp; Signature / Date</span></div>
    <div class="sig-box"><label>Received By</label><br/><br/><br/><span style="font-size:10px;color:#6b7280">Name &amp; Signature / Date</span></div>
    <div class="sig-box"><label>Logistics / Driver</label><br/><br/><br/><span style="font-size:10px;color:#6b7280">Name &amp; Signature / Date</span></div>
  </div>
  <div class="footer">
    Generated by ${companyName} &bull; ${transfer.waybillNumber} &bull; ${new Date().toLocaleString()}
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;
}

module.exports = { getStockAtLocation, updateStockLevel, generateWaybillNumber, buildWaybillHTML };
