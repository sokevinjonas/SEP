export interface ParsedReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  categoryId: string;
  categoryName: string;
  selected: boolean;
}

export interface ParsedReceiptResult {
  merchant: string;
  currency: 'GHS' | 'XOF';
  amount: number;
  date: string;
  transactionReference: string;
  amountPaid?: number;
  change?: number;
  itemQty?: number;
  items: ParsedReceiptItem[];
  confidence: {
    amount: boolean;
    merchant: boolean;
    category: boolean;
    reference: boolean;
  };
  uncertainNote?: string;
}

export function parseReceiptText(rawText: string, fallbackFileName: string = ''): ParsedReceiptResult {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Merchant Detection
  let merchant = 'Campus Store';
  for (const l of lines.slice(0, 10)) {
    if (/ALL\s*NE\s*EDS/i.test(l) || /LEGON/i.test(l)) {
      merchant = 'ALL NEEDS LEGON';
      break;
    }
    if (/SUPERMARKET|MART|EATERY|SHOP|CHOP|STORE|RESTAURANT|BOOKSHOP/i.test(l)) {
      const cleaned = l.replace(/[^A-Za-z0-9\s]/g, '').trim();
      if (cleaned.length > 3) {
        merchant = cleaned;
        break;
      }
    }
  }

  // 2. Receipt Reference
  let transactionReference = `REC-${Date.now().toString().slice(-6)}`;
  const rcMatch = rawText.match(/RECEIPT\s*NO\.?\s*:\s*([A-Za-z0-9\-]+)/i);
  if (rcMatch) {
    transactionReference = rcMatch[1].trim();
  } else {
    const tillMatch = rawText.match(/(TILL[0-9\-]+)/i);
    if (tillMatch) {
      transactionReference = tillMatch[1].trim();
    } else {
      const txnMatch = rawText.match(/(?:TXN|REF|ID)[\s\:\-]+([A-Za-z0-9\-]+)/i);
      if (txnMatch) transactionReference = txnMatch[1].trim();
    }
  }

  // 3. Date & Time
  let date = new Date().toISOString();
  const dateMatch = rawText.match(/(\d{1,2}\/\d{1,2}\/\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)?)/i);
  if (dateMatch) {
    const parsed = new Date(dateMatch[1]);
    if (!isNaN(parsed.getTime())) date = parsed.toISOString();
  }

  // 4. Totals, Paid, Change
  let totalAmount = 0;
  let amountPaid = 0;
  let change = 0;
  let itemQty = 0;

  const paidMatch = rawText.match(/Amount\s*Paid\s+([0-9]+\.[0-9]{2})/i);
  if (paidMatch) amountPaid = parseFloat(paidMatch[1]);

  const changeMatch = rawText.match(/Change\s+([0-9]+\.[0-9]{2})/i);
  if (changeMatch) change = parseFloat(changeMatch[1]);

  // Extract Total (prefer line specifically starting with TOTAL or containing TOTAL <amount>)
  for (const l of lines) {
    if (/^.*?\bTOTAL\s+([0-9]+\.[0-9]{2})/i.test(l) && !/NET/i.test(l)) {
      const m = l.match(/TOTAL\s+([0-9]+\.[0-9]{2})/i);
      if (m) totalAmount = parseFloat(m[1]);
    }
  }

  const qtyMatch = rawText.match(/Item\s*Qty\s+(\d+)/i);
  if (qtyMatch) itemQty = parseInt(qtyMatch[1], 10);

  // 5. Line items parsing
  const items: ParsedReceiptItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip subtotal summaries or taxes
    if (/NET\s*TOTAL|GETFUND|NHIL|VAT\s*@|Discount|Amount\s*Paid|Change|Item\s*Qty/i.test(line)) {
      continue;
    }

    // Match lines ending with two currency decimal amounts: [unitPrice] [subtotal]
    const priceMatch = line.match(/([0-9]+\.[0-9]{2})\s+([0-9]+\.[0-9]{2})$/);
    if (priceMatch) {
      const unitPrice = parseFloat(priceMatch[1]);
      const totalPrice = parseFloat(priceMatch[2]);
      const quantity = Math.max(1, Math.round(totalPrice / (unitPrice || 1)));

      // Extract description before the prices
      let rawDesc = line.substring(0, priceMatch.index).trim();
      rawDesc = rawDesc.replace(/\b(?:slipcs|pcs|uom|pkt|pack|i\s*pcs)\b/gi, '').trim();
      // Clean leading noise characters (like "a ", "/ BE ", etc.)
      rawDesc = rawDesc.replace(/^[^a-zA-Z0-9]+/, '').replace(/^[a-zA-Z]\s+/, '').replace(/^BE\s+/i, '').trim();

      // Check if subsequent line has continuation info (e.g. "ASST. 175G")
      if (i + 1 < lines.length) {
        const next = lines[i + 1];
        if (!/[0-9]+\.[0-9]{2}/.test(next) && !/Discount|TOTAL|Net|Getfund|Vat|Change|Amount|P\.M/i.test(next) && !/[\=\-\_\*\#]{3,}/.test(next)) {
          let cleanNext = next.replace(/[\=\-\_\*\#\:\;]+.*$/, '').replace(/^[^a-zA-Z0-9]+/, '').trim();
          cleanNext = cleanNext.replace(/^[0-9]+\s+/, '').replace(/\b(?:re|ee|ie|tt)\b/gi, '').trim();
          if (cleanNext.length > 2 && cleanNext.length < 35 && !/^[0-9\s]+$/.test(cleanNext)) {
            rawDesc = `${rawDesc} ${cleanNext}`.trim();
          }
        }
      }
      rawDesc = rawDesc.replace(/\s+\d+\s*re$/i, '').trim();

      // Intelligent category matching
      let categoryId = 'cat-food';
      let categoryName = 'Food & Chop';
      const lower = rawDesc.toLowerCase();

      if (lower.includes('soap') || lower.includes('tissue') || lower.includes('paste') || lower.includes('brush') || lower.includes('cream') || lower.includes('detergent')) {
        categoryId = 'cat-other';
        categoryName = 'Hygiene & Personal Care';
      } else if (lower.includes('book') || lower.includes('pen') || lower.includes('paper') || lower.includes('print') || lower.includes('copy')) {
        categoryId = 'cat-books';
        categoryName = 'Books & Copies';
      } else if (lower.includes('trotro') || lower.includes('transport') || lower.includes('bus') || lower.includes('ride')) {
        categoryId = 'cat-transport';
        categoryName = 'Transport & Trotro';
      } else if (lower.includes('drink') || lower.includes('water') || lower.includes('snack') || lower.includes('chop') || lower.includes('rice')) {
        categoryId = 'cat-food';
        categoryName = 'Food & Chop';
      }

      items.push({
        id: `item-${items.length + 1}`,
        name: rawDesc || `Article ${items.length + 1}`,
        quantity,
        unitPrice,
        totalPrice,
        categoryId,
        categoryName,
        selected: true
      });
    }
  }

  // Fallback: If totalAmount is missing or 0, compute from items
  if (totalAmount === 0 && items.length > 0) {
    totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
  }

  if (itemQty === 0) {
    itemQty = items.reduce((sum, item) => sum + item.quantity, 0);
  }

  return {
    merchant,
    currency: 'GHS',
    amount: totalAmount > 0 ? totalAmount : 25.0,
    date,
    transactionReference,
    amountPaid: amountPaid > 0 ? amountPaid : undefined,
    change: change > 0 ? change : undefined,
    itemQty: itemQty > 0 ? itemQty : items.length,
    items,
    confidence: {
      amount: totalAmount > 0,
      merchant: merchant !== 'Campus Store',
      category: true,
      reference: transactionReference !== 'REC-DEFAULT'
    }
  };
}
