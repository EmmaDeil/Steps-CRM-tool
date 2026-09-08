function parseOptionalDate(value) {
  if (!value) return null;
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function parseOptionalString(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function buildBatchId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rnd = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `BATCH-${stamp}-${rnd}`;
}

function ensureBatchesFromLegacy(item) {
  if (!item.batches) item.batches = [];
  if (item.batches.length === 0 && Number(item.quantity) > 0) {
    item.batches.push({
      batchId: buildBatchId(),
      quantity: Number(item.quantity),
      receivedDate: item.createdAt || new Date(),
      manufacturingDate: item.manufacturingDate || null,
      productionDate: item.manufacturingDate || item.productionDate || null,
      expiryDate: item.expiryDate || null,
      lotNumber: item.lotNumber || '',
      refNumber: item.refNumber || '',
      locationName: item.location || '',
    });
  }
}

function getBatchSortDate(batch) {
  return (
    batch.manufacturingDate ||
    batch.productionDate ||
    batch.receivedDate ||
    batch.expiryDate ||
    new Date(0)
  );
}

function syncItemQuantityAndDates(item) {
  if (!item.batches) item.batches = [];
  item.batches = item.batches.filter((b) => Number(b.quantity) > 0);

  const totalQty = item.batches.reduce((sum, b) => sum + Number(b.quantity || 0), 0);
  item.quantity = totalQty;

  if (item.batches.length > 0) {
    const sortedByExpiry = [...item.batches]
      .filter((b) => b.expiryDate)
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    if (sortedByExpiry.length > 0) {
      item.expiryDate = sortedByExpiry[0].expiryDate;
    }

    const sortedByMfg = [...item.batches]
      .filter((b) => b.manufacturingDate)
      .sort((a, b) => new Date(a.manufacturingDate) - new Date(b.manufacturingDate));
    if (sortedByMfg.length > 0) {
      item.manufacturingDate = sortedByMfg[0].manufacturingDate;
      item.productionDate = sortedByMfg[0].manufacturingDate;
    }

    const sortedByProd = [...item.batches]
      .filter((b) => b.productionDate)
      .sort((a, b) => new Date(a.productionDate) - new Date(b.productionDate));
    if (!item.manufacturingDate && sortedByProd.length > 0) {
      item.manufacturingDate = sortedByProd[0].productionDate;
      item.productionDate = sortedByProd[0].productionDate;
    }

    const batchWithLot = item.batches.find((b) => b.lotNumber && String(b.lotNumber).trim());
    item.lotNumber = batchWithLot ? String(batchWithLot.lotNumber).trim() : '';

    const batchWithRef = item.batches.find((b) => b.refNumber && String(b.refNumber).trim());
    item.refNumber = batchWithRef ? String(batchWithRef.refNumber).trim() : '';
  }

  item.lastUpdated = new Date();
}

function addBatch(item, options = {}) {
  const qty = Number(options.quantity || 0);
  if (qty <= 0) return null;

  if (!item.batches) item.batches = [];

  const batch = {
    batchId: options.batchId || buildBatchId(),
    quantity: qty,
    receivedDate: parseOptionalDate(options.receivedDate) || new Date(),
    lotNumber: parseOptionalString(options.lotNumber),
    refNumber: parseOptionalString(options.refNumber),
    manufacturingDate: parseOptionalDate(options.manufacturingDate || options.productionDate),
    productionDate: parseOptionalDate(options.manufacturingDate || options.productionDate),
    expiryDate: parseOptionalDate(options.expiryDate),
    locationId: options.locationId || null,
    locationName: options.locationName || item.location || '',
  };

  item.batches.push(batch);
  syncItemQuantityAndDates(item);
  return batch;
}

function consumeBatchesFIFO(item, quantityToConsume, options = {}) {
  const requested = Number(quantityToConsume || 0);
  if (requested <= 0) {
    return { consumed: [], requested: 0, consumedQty: 0, remaining: 0 };
  }

  ensureBatchesFromLegacy(item);

  const byLocation = options.locationName ? String(options.locationName).trim().toLowerCase() : null;

  const indexed = item.batches
    .map((batch, index) => ({ batch, index }))
    .filter(({ batch }) => Number(batch.quantity || 0) > 0)
    .filter(({ batch }) => {
      if (!byLocation) return true;
      return String(batch.locationName || '').trim().toLowerCase() === byLocation;
    })
    .sort((a, b) => new Date(getBatchSortDate(a.batch)) - new Date(getBatchSortDate(b.batch)));

  let remaining = requested;
  const consumed = [];

  for (const entry of indexed) {
    if (remaining <= 0) break;
    const available = Number(item.batches[entry.index].quantity || 0);
    if (available <= 0) continue;

    const take = Math.min(available, remaining);
    item.batches[entry.index].quantity = available - take;
    remaining -= take;

    consumed.push({
      batchId: item.batches[entry.index].batchId,
      quantity: take,
      lotNumber: item.batches[entry.index].lotNumber || '',
      refNumber: item.batches[entry.index].refNumber || '',
      productionDate: item.batches[entry.index].productionDate || null,
      manufacturingDate: item.batches[entry.index].manufacturingDate || null,
      expiryDate: item.batches[entry.index].expiryDate || null,
      locationId: item.batches[entry.index].locationId || null,
      locationName: item.batches[entry.index].locationName || '',
      receivedDate: item.batches[entry.index].receivedDate || null,
    });
  }

  syncItemQuantityAndDates(item);

  return {
    consumed,
    requested,
    consumedQty: requested - remaining,
    remaining,
  };
}

module.exports = {
  addBatch,
  consumeBatchesFIFO,
  parseOptionalDate,
  syncItemQuantityAndDates,
};
