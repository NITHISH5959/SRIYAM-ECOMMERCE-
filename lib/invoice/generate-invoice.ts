import { PDFDocument, PDFFont, PDFPage, rgb, PageSizes } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import { BUSINESS, STORE_NAME, STORE_TAGLINE } from './constants';

// ── Types ───────────────────────────────────────────────────────────────────
export interface InvoiceItem {
  name: string;
  size?: string;
  quantity: number;
  price: number;
}

export interface ShippingAddress {
  name?: string;
  phone?: string;
  email?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

export interface InvoiceOrder {
  id: string;
  order_number: string;
  created_at: string;
  contact_email?: string | null;
  items: InvoiceItem[];
  subtotal: number;
  discount_amount: number;
  coupon_code?: string;
  shipping_fee: number;
  total: number;
  status: string;
  razorpay_payment_id?: string;
  shipping_address: ShippingAddress;
}

// ── Safe Helpers ────────────────────────────────────────────────────────────

function s(v: unknown): string {
  if (v === undefined || v === null) return '';
  const str = String(v).trim();
  if (str === 'undefined' || str === 'null') return '';
  return str;
}

/** Format number in Indian style with 2 decimals: 1,23,456.00 */
function formatINR(n: number): string {
  const fixed = Math.abs(n).toFixed(2);
  const [intPart, dec] = fixed.split('.');
  let result = '';
  const digits = intPart.split('');
  const len = digits.length;
  for (let i = 0; i < len; i++) {
    const posFromEnd = len - i;
    if (i > 0 && posFromEnd === 3) result += ',';
    else if (i > 0 && posFromEnd > 3 && (posFromEnd - 3) % 2 === 0) result += ',';
    result += digits[i];
  }
  return (n < 0 ? '-' : '') + (result || '0') + '.' + dec;
}

/** Convert number to Indian English words (for invoice total line) */
function numberToWords(n: number): string {
  if (n === 0) return 'Rupees Zero Only';
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertGroup(num: number): string {
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' and ' + convertGroup(num % 100) : '');
    return '';
  }

  function convert(num: number): string {
    if (num < 1000) return convertGroup(num);
    if (num < 100000) {
      const thousands = Math.floor(num / 1000);
      const rem = num % 1000;
      return convertGroup(thousands) + ' Thousand' + (rem ? ' ' + convertGroup(rem) : '');
    }
    if (num < 10000000) {
      const lakhs = Math.floor(num / 100000);
      const rem = num % 100000;
      return convertGroup(lakhs) + ' Lakh' + (rem ? ' ' + convert(rem) : '');
    }
    const crores = Math.floor(num / 10000000);
    const rem = num % 10000000;
    return convertGroup(crores) + ' Crore' + (rem ? ' ' + convert(rem) : '');
  }

  const intPart = Math.floor(Math.abs(n));
  const decimal = Math.round((Math.abs(n) - intPart) * 100);
  let result = 'Rupees ' + convert(intPart);
  if (decimal > 0) {
    result += ' and ' + convertGroup(decimal) + ' Paise';
  }
  result += ' Only';
  return result;
}

/** Robust word wrapping helper that also splits oversized single words */
function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (!word) continue;

    // Check if the single word is wider than maxWidth
    const wordWidth = font.widthOfTextAtSize(word, fontSize);
    if (wordWidth > maxWidth) {
      // Flush currentLine first
      if (currentLine) {
        lines.push(currentLine);
        currentLine = '';
      }
      // Split the word by characters
      let chunk = '';
      for (const char of word) {
        const testChunk = chunk + char;
        if (font.widthOfTextAtSize(testChunk, fontSize) > maxWidth && chunk) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk = testChunk;
        }
      }
      if (chunk) {
        currentLine = chunk;
      }
      continue;
    }

    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// ── Main Invoice PDF Generator ──────────────────────────────────────────────

export async function generateInvoicePdf(order: InvoiceOrder): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  // ── 1. Asset Resolution ───────────────────────────────────────────────────
  const resolveAsset = (name: string): string => {
    const candidates = [
      path.join(__dirname, 'assets', name),
      path.resolve(process.cwd(), 'lib', 'invoice', 'assets', name),
      path.resolve(process.cwd(), 'public', name),
    ];
    for (const cand of candidates) {
      if (fs.existsSync(cand)) return cand;
    }
    throw new Error(`Asset not found: ${name}`);
  };

  const regularBytes = fs.readFileSync(resolveAsset('Inter-Regular.ttf'));
  const boldBytes = fs.readFileSync(resolveAsset('Inter-Bold.ttf'));
  const fontRegular = await doc.embedFont(regularBytes);
  const fontBold = await doc.embedFont(boldBytes);

  let logoImage: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
  try {
    let logoPath = '';
    try {
      logoPath = resolveAsset('logo-trimmed.png');
    } catch {
      logoPath = resolveAsset('logo.png');
    }
    const logoBytes = fs.readFileSync(logoPath);
    logoImage = await doc.embedPng(logoBytes);
  } catch {
    // Graceful fallback to text-only header
    logoImage = null;
  }

  // ── 2. Page System Constants ──────────────────────────────────────────────
  const [PAGE_W, PAGE_H] = PageSizes.A4; // 595.28 × 841.89
  const MM = 2.83464567; // 1 mm in points
  const MARGIN_X = 15 * MM; // 42.52 pt
  const MARGIN_TOP = 14 * MM; // 39.69 pt
  const MARGIN_BOTTOM = 14 * MM; // 39.69 pt
  const CONTENT_W = PAGE_W - MARGIN_X * 2; // 510.24 pt
  const FOOTER_RESERVED_H = 56; // Footer reservation height in pt
  const MIN_CONTENT_Y = MARGIN_BOTTOM + FOOTER_RESERVED_H; // ~95.69 pt

  // Colors per spec
  const COLOR_TEXT = rgb(0x1A / 255, 0x1A / 255, 0x1A / 255); // #1A1A1A
  const COLOR_SECONDARY = rgb(0x6B / 255, 0x6B / 255, 0x6B / 255); // #6B6B6B
  const COLOR_HAIRLINE = rgb(0xD9 / 255, 0xD9 / 255, 0xD9 / 255); // #D9D9D9
  const COLOR_LIGHT_FILL = rgb(0xF4 / 255, 0xF1 / 255, 0xEC / 255); // #F4F1EC
  const COLOR_ACCENT = rgb(0x9A / 255, 0x4A / 255, 0x12 / 255); // #9A4A12
  const COLOR_WHITE = rgb(1, 1, 1);
  const RUPEE = '\u20B9';

  const pages: PDFPage[] = [];

  function createNewPage(): { page: PDFPage; startY: number } {
    const p = doc.addPage([PAGE_W, PAGE_H]);
    pages.push(p);
    return { page: p, startY: PAGE_H - MARGIN_TOP };
  }

  let { page: currentPage, startY: currentY } = createNewPage();

  // ── 3. Header Rendering ───────────────────────────────────────────────────
  const LOGO_HEIGHT = 22 * MM; // 22 mm ≈ 62.36 pt
  let logoW = 0;
  let textStartX = MARGIN_X;

  if (logoImage) {
    const aspect = logoImage.width / logoImage.height;
    logoW = LOGO_HEIGHT * aspect;
    currentPage.drawImage(logoImage, {
      x: MARGIN_X,
      y: currentY - LOGO_HEIGHT,
      width: logoW,
      height: LOGO_HEIGHT,
    });
    // 5 mm gap between logo and text block
    textStartX = MARGIN_X + logoW + 5 * MM;
  }

  // Left column text block: Sriyam Store (20pt bold), tagline (9.5pt), parent line (8.5pt)
  // Total text block height ≈ 42pt, vertically centered against the 62.36pt logo
  const textBlockH = 42;
  const topPad = logoImage ? (LOGO_HEIGHT - textBlockH) / 2 : 0;
  const storeNameY = currentY - topPad - 16;
  const taglineY = storeNameY - 15;
  const parentLineY = taglineY - 13;

  currentPage.drawText(STORE_NAME, {
    x: textStartX,
    y: storeNameY,
    size: 20,
    font: fontBold,
    color: COLOR_TEXT,
  });

  currentPage.drawText(STORE_TAGLINE, {
    x: textStartX,
    y: taglineY,
    size: 9.5,
    font: fontRegular,
    color: COLOR_SECONDARY,
  });

  currentPage.drawText(BUSINESS.parentLine, {
    x: textStartX,
    y: parentLineY,
    size: 8.5,
    font: fontRegular,
    color: COLOR_SECONDARY,
  });

  // Right column: INVOICE title in accent color #9A4A12, plus Invoice No.
  const invoiceTitle = 'INVOICE';
  const invoiceTitleSize = 26;
  const invoiceTitleW = fontBold.widthOfTextAtSize(invoiceTitle, invoiceTitleSize);
  currentPage.drawText(invoiceTitle, {
    x: PAGE_W - MARGIN_X - invoiceTitleW,
    y: currentY - 22,
    size: invoiceTitleSize,
    font: fontBold,
    color: COLOR_ACCENT,
  });

  const invNumText = `Invoice No. ${s(order.order_number)}`;
  const invNumSize = 9;
  const invNumW = fontRegular.widthOfTextAtSize(invNumText, invNumSize);
  currentPage.drawText(invNumText, {
    x: PAGE_W - MARGIN_X - invNumW,
    y: currentY - 38,
    size: invNumSize,
    font: fontRegular,
    color: COLOR_SECONDARY,
  });

  // Header bottom & 1 pt accent rule across full content width, 8 mm below logo bottom
  const lowestHeaderY = Math.min(
    logoImage ? currentY - LOGO_HEIGHT : parentLineY - 5,
    parentLineY - 5,
  );
  const ruleY = lowestHeaderY - 8 * MM;

  currentPage.drawLine({
    start: { x: MARGIN_X, y: ruleY },
    end: { x: PAGE_W - MARGIN_X, y: ruleY },
    thickness: 1,
    color: COLOR_ACCENT,
  });

  currentY = ruleY - 10;

  // ── 4. Order Details Strip ────────────────────────────────────────────────
  const stripH = 34;
  const stripY = currentY - stripH;

  // Rounded background box
  currentPage.drawRectangle({
    x: MARGIN_X,
    y: stripY,
    width: CONTENT_W,
    height: stripH,
    color: COLOR_LIGHT_FILL,
    borderColor: COLOR_HAIRLINE,
    borderWidth: 0.5,
  });

  const colW = CONTENT_W / 4;
  const labelY = stripY + stripH - 12;
  const valY = stripY + 7;

  // Col 1: Order No
  currentPage.drawText('ORDER NO.', {
    x: MARGIN_X + 10,
    y: labelY,
    size: 7.5,
    font: fontBold,
    color: COLOR_SECONDARY,
  });
  currentPage.drawText(s(order.order_number), {
    x: MARGIN_X + 10,
    y: valY,
    size: 9.5,
    font: fontBold,
    color: COLOR_TEXT,
  });

  // Col 2: Order Date
  const dateStr = order.created_at
    ? new Date(order.created_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';
  currentPage.drawText('ORDER DATE', {
    x: MARGIN_X + colW + 10,
    y: labelY,
    size: 7.5,
    font: fontBold,
    color: COLOR_SECONDARY,
  });
  currentPage.drawText(dateStr, {
    x: MARGIN_X + colW + 10,
    y: valY,
    size: 9,
    font: fontRegular,
    color: COLOR_TEXT,
  });

  // Col 3: Payment Method
  currentPage.drawText('PAYMENT METHOD', {
    x: MARGIN_X + colW * 2 + 10,
    y: labelY,
    size: 7.5,
    font: fontBold,
    color: COLOR_SECONDARY,
  });
  currentPage.drawText('Razorpay', {
    x: MARGIN_X + colW * 2 + 10,
    y: valY,
    size: 9,
    font: fontRegular,
    color: COLOR_TEXT,
  });

  // Col 4: Payment Status (PAID Pill)
  currentPage.drawText('PAYMENT STATUS', {
    x: MARGIN_X + colW * 3 + 10,
    y: labelY,
    size: 7.5,
    font: fontBold,
    color: COLOR_SECONDARY,
  });

  const statusText = (order.status || 'PAID').toUpperCase();
  const pillW = fontBold.widthOfTextAtSize(statusText, 7.5) + 14;
  const pillH = 14;
  const pillX = MARGIN_X + colW * 3 + 10;
  const pillY = valY - 2;

  currentPage.drawRectangle({
    x: pillX,
    y: pillY,
    width: pillW,
    height: pillH,
    color: COLOR_WHITE,
    borderColor: COLOR_TEXT,
    borderWidth: 0.75,
  });

  currentPage.drawText(statusText, {
    x: pillX + 7,
    y: pillY + 3.5,
    size: 7.5,
    font: fontBold,
    color: COLOR_TEXT,
  });

  currentY = stripY - 10;

  // Payment ID line in full on its own line below the strip
  if (order.razorpay_payment_id) {
    currentPage.drawText(`Payment ID: ${order.razorpay_payment_id}`, {
      x: MARGIN_X + 2,
      y: currentY,
      size: 8,
      font: fontRegular,
      color: COLOR_SECONDARY,
    });
    currentY -= 14;
  } else {
    currentY -= 4;
  }

  // ── 5. Address Blocks (FROM & SHIP TO) ─────────────────────────────────────
  const addrGap = 8 * MM; // 8 mm ≈ 22.68 pt
  const addrColW = (CONTENT_W - addrGap) / 2; // ≈ 243.78 pt
  const innerPad = 5 * MM; // 5 mm ≈ 14.17 pt
  const innerW = addrColW - innerPad * 2; // ≈ 215.44 pt

  // Prepare FROM lines
  const fromLines: Array<{ text: string; size: number; bold: boolean; color: typeof COLOR_TEXT }> = [
    { text: BUSINESS.legalName, size: 10.5, bold: true, color: COLOR_TEXT },
    { text: `Trading as ${BUSINESS.brandName}`, size: 8.5, bold: false, color: COLOR_SECONDARY },
  ];

  const fromAddrWrapped = wrapText(BUSINESS.address, fontRegular, 8.5, innerW);
  for (const al of fromAddrWrapped) {
    fromLines.push({ text: al, size: 8.5, bold: false, color: COLOR_TEXT });
  }

  if (BUSINESS.phone) {
    fromLines.push({ text: `Phone: ${BUSINESS.phone}`, size: 8.5, bold: false, color: COLOR_TEXT });
  }
  if (BUSINESS.email) {
    fromLines.push({ text: `Email: ${BUSINESS.email}`, size: 8.5, bold: false, color: COLOR_TEXT });
  }
  if (BUSINESS.gstin) {
    fromLines.push({ text: `GSTIN: ${BUSINESS.gstin}`, size: 8.5, bold: true, color: COLOR_TEXT });
  }

  // Prepare SHIP TO lines
  const shipAddr = order.shipping_address || {};
  const custName = s(shipAddr.name) || 'Customer';
  const custPhone = s(shipAddr.phone);
  const custEmail = s(order.contact_email) || s(shipAddr.email);

  const shipLines: Array<{ text: string; size: number; bold: boolean; color: typeof COLOR_TEXT }> = [];

  // Wrap customer name so long names never breach the box border
  const wrappedCustName = wrapText(custName, fontBold, 12, innerW);
  for (const cn of wrappedCustName) {
    shipLines.push({ text: cn, size: 12, bold: true, color: COLOR_TEXT });
  }

  // Address lines (avoiding duplicates or repeating city)
  const rawAddrParts: string[] = [];
  if (s(shipAddr.line1)) rawAddrParts.push(s(shipAddr.line1));
  if (s(shipAddr.line2)) rawAddrParts.push(s(shipAddr.line2));

  const city = s(shipAddr.city);
  const state = s(shipAddr.state);
  const pincode = s(shipAddr.pincode);
  const country = s(shipAddr.country) || 'India';

  // Check if city already appears in line1 or line2
  const allLinesText = rawAddrParts.join(' ').toLowerCase();
  let cityStateLine = '';
  if (city && !allLinesText.includes(city.toLowerCase())) {
    cityStateLine = state ? `${city}, ${state}` : city;
  } else if (state) {
    cityStateLine = state;
  }

  if (cityStateLine) rawAddrParts.push(cityStateLine);
  if (pincode) rawAddrParts.push(`PIN: ${pincode}`);
  if (country && !allLinesText.includes(country.toLowerCase())) rawAddrParts.push(country);

  for (const part of rawAddrParts) {
    const wrapped = wrapText(part, fontRegular, 9.5, innerW);
    for (const wl of wrapped) {
      shipLines.push({ text: wl, size: 9.5, bold: false, color: COLOR_TEXT });
    }
  }

  if (custPhone) {
    shipLines.push({ text: `Phone: ${custPhone}`, size: 9.5, bold: true, color: COLOR_TEXT });
  }
  if (custEmail) {
    const wrappedEmail = wrapText(custEmail, fontRegular, 8.5, innerW);
    for (const we of wrappedEmail) {
      shipLines.push({ text: we, size: 8.5, bold: false, color: COLOR_SECONDARY });
    }
  }

  // Calculate box heights
  let fromContentH = 14; // Header label height
  for (const fl of fromLines) {
    fromContentH += fl.size + 3.5;
  }

  let shipContentH = 14;
  for (const sl of shipLines) {
    shipContentH += sl.size + 3.5;
  }

  const boxH = Math.max(fromContentH, shipContentH) + innerPad * 2;
  const boxY = currentY - boxH;

  const fromBoxX = MARGIN_X;
  const shipBoxX = MARGIN_X + addrColW + addrGap;

  // FROM box (0.75 pt hairline border)
  currentPage.drawRectangle({
    x: fromBoxX,
    y: boxY,
    width: addrColW,
    height: boxH,
    borderColor: COLOR_HAIRLINE,
    borderWidth: 0.75,
  });

  currentPage.drawText('FROM', {
    x: fromBoxX + innerPad,
    y: boxY + boxH - innerPad - 8,
    size: 7.5,
    font: fontBold,
    color: COLOR_SECONDARY,
  });

  let drawFromY = boxY + boxH - innerPad - 22;
  for (const fl of fromLines) {
    currentPage.drawText(fl.text, {
      x: fromBoxX + innerPad,
      y: drawFromY,
      size: fl.size,
      font: fl.bold ? fontBold : fontRegular,
      color: fl.color,
    });
    drawFromY -= fl.size + 3.5;
  }

  // SHIP TO box (1.2 pt heavier border so courier sees it first)
  currentPage.drawRectangle({
    x: shipBoxX,
    y: boxY,
    width: addrColW,
    height: boxH,
    borderColor: COLOR_TEXT,
    borderWidth: 1.2,
  });

  currentPage.drawText('SHIP TO', {
    x: shipBoxX + innerPad,
    y: boxY + boxH - innerPad - 8,
    size: 7.5,
    font: fontBold,
    color: COLOR_SECONDARY,
  });

  let drawShipY = boxY + boxH - innerPad - 22;
  for (const sl of shipLines) {
    currentPage.drawText(sl.text, {
      x: shipBoxX + innerPad,
      y: drawShipY,
      size: sl.size,
      font: sl.bold ? fontBold : fontRegular,
      color: sl.color,
    });
    drawShipY -= sl.size + 3.5;
  }

  currentY = boxY - 14;

  // ── 6. Items Table ────────────────────────────────────────────────────────
  // Column Widths (% of CONTENT_W): # 8%, Product 42%, Size 12%, Qty 8%, Unit price 14%, Amount 16%
  const colDef = {
    idx: { x: MARGIN_X, w: CONTENT_W * 0.08 },
    product: { x: MARGIN_X + CONTENT_W * 0.08, w: CONTENT_W * 0.42 },
    size: { x: MARGIN_X + CONTENT_W * 0.50, w: CONTENT_W * 0.12 },
    qty: { x: MARGIN_X + CONTENT_W * 0.62, w: CONTENT_W * 0.08 },
    unit: { x: MARGIN_X + CONTENT_W * 0.70, w: CONTENT_W * 0.14 },
    amount: { x: MARGIN_X + CONTENT_W * 0.84, w: CONTENT_W * 0.16 },
  };

  const TABLE_PAD_X = 3 * MM; // 3 mm inner padding ≈ 8.5 pt
  const TABLE_HEADER_H = 22;

  function drawTableHeader(p: PDFPage, atY: number) {
    // Light fill background for header
    p.drawRectangle({
      x: MARGIN_X,
      y: atY - TABLE_HEADER_H,
      width: CONTENT_W,
      height: TABLE_HEADER_H,
      color: COLOR_LIGHT_FILL,
    });
    // Borders above and below
    p.drawLine({
      start: { x: MARGIN_X, y: atY },
      end: { x: PAGE_W - MARGIN_X, y: atY },
      thickness: 0.75,
      color: COLOR_HAIRLINE,
    });
    p.drawLine({
      start: { x: MARGIN_X, y: atY - TABLE_HEADER_H },
      end: { x: PAGE_W - MARGIN_X, y: atY - TABLE_HEADER_H },
      thickness: 0.75,
      color: COLOR_HAIRLINE,
    });

    const textY = atY - TABLE_HEADER_H + 7;

    // #
    p.drawText('#', {
      x: colDef.idx.x + TABLE_PAD_X,
      y: textY,
      size: 8,
      font: fontBold,
      color: COLOR_TEXT,
    });

    // Product
    p.drawText('Product', {
      x: colDef.product.x + TABLE_PAD_X,
      y: textY,
      size: 8,
      font: fontBold,
      color: COLOR_TEXT,
    });

    // Size
    p.drawText('Size', {
      x: colDef.size.x + TABLE_PAD_X,
      y: textY,
      size: 8,
      font: fontBold,
      color: COLOR_TEXT,
    });

    // Qty (centered)
    const qtyHeader = 'Qty';
    const qtyHW = fontBold.widthOfTextAtSize(qtyHeader, 8);
    p.drawText(qtyHeader, {
      x: colDef.qty.x + (colDef.qty.w - qtyHW) / 2,
      y: textY,
      size: 8,
      font: fontBold,
      color: COLOR_TEXT,
    });

    // Unit Price (right aligned)
    const unitHeader = 'Unit Price';
    const unitHW = fontBold.widthOfTextAtSize(unitHeader, 8);
    p.drawText(unitHeader, {
      x: colDef.unit.x + colDef.unit.w - TABLE_PAD_X - unitHW,
      y: textY,
      size: 8,
      font: fontBold,
      color: COLOR_TEXT,
    });

    // Amount (right aligned)
    const amtHeader = 'Amount';
    const amtHW = fontBold.widthOfTextAtSize(amtHeader, 8);
    p.drawText(amtHeader, {
      x: colDef.amount.x + colDef.amount.w - TABLE_PAD_X - amtHW,
      y: textY,
      size: 8,
      font: fontBold,
      color: COLOR_TEXT,
    });
  }

  // Draw initial table header
  drawTableHeader(currentPage, currentY);
  currentY -= TABLE_HEADER_H;

  // Process rows
  const items = order.items || [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const name = s(item.name) || 'Product';
    const size = s(item.size) || '—';
    const qty = Number(item.quantity) || 1;
    const price = Number(item.price) || 0;
    const lineAmt = qty * price;

    // Wrap product name inside its column width (minus 2*padding)
    const prodMaxW = colDef.product.w - TABLE_PAD_X * 2;
    const nameLines = wrapText(name, fontRegular, 8.5, prodMaxW);

    // Also wrap size inside its column width (minus 2*padding)
    const sizeMaxW = colDef.size.w - TABLE_PAD_X * 2;
    const sizeLines = wrapText(size, fontRegular, 8.5, sizeMaxW);

    const maxLineCount = Math.max(1, nameLines.length, sizeLines.length);

    // Row height: 9 mm ≈ 25.5 pt minimum, plus space for extra wrapped lines
    const rowH = Math.max(25.5, maxLineCount * 11 + 12);

    // If row doesn't fit on this page, advance to next page
    if (currentY - rowH < MIN_CONTENT_Y) {
      // Close table on current page
      currentPage.drawLine({
        start: { x: MARGIN_X, y: currentY },
        end: { x: PAGE_W - MARGIN_X, y: currentY },
        thickness: 0.5,
        color: COLOR_HAIRLINE,
      });

      const next = createNewPage();
      currentPage = next.page;
      currentY = next.startY;

      // Repeat table header on continuation page
      drawTableHeader(currentPage, currentY);
      currentY -= TABLE_HEADER_H;
    }

    const rowMidY = currentY - rowH / 2;
    const baseTextY = rowMidY - 3;

    // # Index
    currentPage.drawText(String(i + 1), {
      x: colDef.idx.x + TABLE_PAD_X,
      y: baseTextY,
      size: 8.5,
      font: fontRegular,
      color: COLOR_SECONDARY,
    });

    // Product lines (vertically centered in row)
    const prodTotalTextH = nameLines.length * 11;
    let prodLineY = currentY - (rowH - prodTotalTextH) / 2 - 8;
    for (const pl of nameLines) {
      currentPage.drawText(pl, {
        x: colDef.product.x + TABLE_PAD_X,
        y: prodLineY,
        size: 8.5,
        font: fontRegular,
        color: COLOR_TEXT,
      });
      prodLineY -= 11;
    }

    // Size lines (vertically centered in row)
    const sizeTotalTextH = sizeLines.length * 11;
    let sizeLineY = currentY - (rowH - sizeTotalTextH) / 2 - 8;
    for (const sl of sizeLines) {
      currentPage.drawText(sl, {
        x: colDef.size.x + TABLE_PAD_X,
        y: sizeLineY,
        size: 8.5,
        font: fontRegular,
        color: COLOR_TEXT,
      });
      sizeLineY -= 11;
    }

    // Qty (centered)
    const qtyStr = String(qty);
    const qtyW = fontRegular.widthOfTextAtSize(qtyStr, 8.5);
    currentPage.drawText(qtyStr, {
      x: colDef.qty.x + (colDef.qty.w - qtyW) / 2,
      y: baseTextY,
      size: 8.5,
      font: fontRegular,
      color: COLOR_TEXT,
    });

    // Unit Price (right aligned with 3 mm inner padding)
    const unitPriceStr = `${RUPEE}${formatINR(price)}`;
    const unitW = fontRegular.widthOfTextAtSize(unitPriceStr, 8.5);
    currentPage.drawText(unitPriceStr, {
      x: colDef.unit.x + colDef.unit.w - TABLE_PAD_X - unitW,
      y: baseTextY,
      size: 8.5,
      font: fontRegular,
      color: COLOR_TEXT,
    });

    // Amount (right aligned with 3 mm inner padding)
    const amtStr = `${RUPEE}${formatINR(lineAmt)}`;
    const amtW = fontBold.widthOfTextAtSize(amtStr, 8.5);
    currentPage.drawText(amtStr, {
      x: colDef.amount.x + colDef.amount.w - TABLE_PAD_X - amtW,
      y: baseTextY,
      size: 8.5,
      font: fontBold,
      color: COLOR_TEXT,
    });

    // Bottom hairline for this row
    currentY -= rowH;
    currentPage.drawLine({
      start: { x: MARGIN_X, y: currentY },
      end: { x: PAGE_W - MARGIN_X, y: currentY },
      thickness: 0.5,
      color: COLOR_HAIRLINE,
    });
  }

  // ── 7. Totals & Words Block ───────────────────────────────────────────────
  const totalsBlockNeededH = 120; // Height required for totals, words, and notes
  if (currentY - totalsBlockNeededH < MIN_CONTENT_Y) {
    const next = createNewPage();
    currentPage = next.page;
    currentY = next.startY;
  }

  currentY -= 14;

  const rightAlignX = colDef.amount.x + colDef.amount.w - TABLE_PAD_X; // 544.26 pt
  const totalsLeftX = MARGIN_X + CONTENT_W * 0.58; // ≈ 338 pt

  // Left side: AMOUNT IN WORDS box (~55% width)
  const wordsBoxW = CONTENT_W * 0.54;
  const inWords = numberToWords(order.total);
  const wordsLines = wrapText(inWords, fontBold, 9.5, wordsBoxW - 16);
  const wordsBoxH = Math.max(50, wordsLines.length * 13 + 24);
  const wordsBoxY = currentY - wordsBoxH;

  currentPage.drawRectangle({
    x: MARGIN_X,
    y: wordsBoxY,
    width: wordsBoxW,
    height: wordsBoxH,
    color: COLOR_LIGHT_FILL,
    borderColor: COLOR_HAIRLINE,
    borderWidth: 0.5,
  });

  currentPage.drawText('AMOUNT IN WORDS', {
    x: MARGIN_X + 10,
    y: wordsBoxY + wordsBoxH - 14,
    size: 7.5,
    font: fontBold,
    color: COLOR_SECONDARY,
  });

  let wordsLineY = wordsBoxY + wordsBoxH - 28;
  for (const wl of wordsLines) {
    currentPage.drawText(wl, {
      x: MARGIN_X + 10,
      y: wordsLineY,
      size: 9.5,
      font: fontBold,
      color: COLOR_TEXT,
    });
    wordsLineY -= 13;
  }

  // Right side: Totals calculations
  let totalsY = currentY - 2;

  // Subtotal
  currentPage.drawText('Subtotal', {
    x: totalsLeftX,
    y: totalsY,
    size: 9,
    font: fontRegular,
    color: COLOR_SECONDARY,
  });
  const subtotalStr = `${RUPEE}${formatINR(order.subtotal)}`;
  const subtotalW = fontRegular.widthOfTextAtSize(subtotalStr, 9);
  currentPage.drawText(subtotalStr, {
    x: rightAlignX - subtotalW,
    y: totalsY,
    size: 9,
    font: fontRegular,
    color: COLOR_TEXT,
  });
  totalsY -= 14;

  // Discount (if any)
  if (order.discount_amount > 0) {
    const discLabel = order.coupon_code ? `Discount (${order.coupon_code})` : 'Discount';
    currentPage.drawText(discLabel, {
      x: totalsLeftX,
      y: totalsY,
      size: 9,
      font: fontRegular,
      color: COLOR_SECONDARY,
    });
    const discStr = `-${RUPEE}${formatINR(order.discount_amount)}`;
    const discW = fontRegular.widthOfTextAtSize(discStr, 9);
    currentPage.drawText(discStr, {
      x: rightAlignX - discW,
      y: totalsY,
      size: 9,
      font: fontRegular,
      color: COLOR_TEXT,
    });
    totalsY -= 14;
  }

  // Shipping
  currentPage.drawText('Shipping', {
    x: totalsLeftX,
    y: totalsY,
    size: 9,
    font: fontRegular,
    color: COLOR_SECONDARY,
  });
  const shippingStr = order.shipping_fee === 0 ? 'Free' : `${RUPEE}${formatINR(order.shipping_fee)}`;
  const shippingW = fontRegular.widthOfTextAtSize(shippingStr, 9);
  currentPage.drawText(shippingStr, {
    x: rightAlignX - shippingW,
    y: totalsY,
    size: 9,
    font: fontRegular,
    color: COLOR_TEXT,
  });
  totalsY -= 16;

  // GRAND TOTAL bar (full width of totals column)
  const grandTotalBarH = 26;
  const grandTotalBarY = totalsY - grandTotalBarH + 5;
  const grandTotalBarW = PAGE_W - MARGIN_X - totalsLeftX + 6;

  currentPage.drawRectangle({
    x: totalsLeftX - 6,
    y: grandTotalBarY,
    width: grandTotalBarW,
    height: grandTotalBarH,
    color: COLOR_LIGHT_FILL,
    borderColor: COLOR_HAIRLINE,
    borderWidth: 0.5,
  });

  currentPage.drawText('GRAND TOTAL', {
    x: totalsLeftX,
    y: grandTotalBarY + 8,
    size: 9.5,
    font: fontBold,
    color: COLOR_TEXT,
  });

  const grandTotalStr = `${RUPEE}${formatINR(order.total)}`;
  const grandTotalW = fontBold.widthOfTextAtSize(grandTotalStr, 14);
  currentPage.drawText(grandTotalStr, {
    x: rightAlignX - grandTotalW,
    y: grandTotalBarY + 6.5,
    size: 14,
    font: fontBold,
    color: COLOR_TEXT,
  });

  currentY = Math.min(wordsBoxY, grandTotalBarY) - 16;

  // ── 8. Notes Block ────────────────────────────────────────────────────────
  if (currentY - 40 >= MIN_CONTENT_Y) {
    currentPage.drawText('NOTES', {
      x: MARGIN_X,
      y: currentY,
      size: 7.5,
      font: fontBold,
      color: COLOR_SECONDARY,
    });
    currentY -= 12;

    currentPage.drawText(
      'Thank you for shopping with Sriyam Store. For any help with your order, contact us on WhatsApp or email.',
      {
        x: MARGIN_X,
        y: currentY,
        size: 8.5,
        font: fontRegular,
        color: COLOR_SECONDARY,
      },
    );
    currentY -= 12;

    const contactLine = `${BUSINESS.phone}  |  ${BUSINESS.email}`;
    currentPage.drawText(contactLine, {
      x: MARGIN_X,
      y: currentY,
      size: 8.5,
      font: fontBold,
      color: COLOR_TEXT,
    });
  }

  // ── 9. Footer on Every Page ───────────────────────────────────────────────
  const totalPageCount = pages.length;

  for (let pageIdx = 0; pageIdx < totalPageCount; pageIdx++) {
    const p = pages[pageIdx];
    const footerRuleY = MARGIN_BOTTOM + 38;

    // Hairline rule
    p.drawLine({
      start: { x: MARGIN_X, y: footerRuleY },
      end: { x: PAGE_W - MARGIN_X, y: footerRuleY },
      thickness: 0.5,
      color: COLOR_HAIRLINE,
    });

    // 3 centered lines in 8 pt secondary color
    const line1 = `${BUSINESS.brandName} is a unit of ${BUSINESS.legalName}, ${BUSINESS.address}`;
    const line2 = `${BUSINESS.email} | ${BUSINESS.phone}`;
    const line3 = 'This is a computer generated invoice and does not require a signature.';

    const l1W = fontRegular.widthOfTextAtSize(line1, 8);
    const l2W = fontRegular.widthOfTextAtSize(line2, 8);
    const l3W = fontRegular.widthOfTextAtSize(line3, 8);

    p.drawText(line1, {
      x: (PAGE_W - l1W) / 2,
      y: footerRuleY - 11,
      size: 8,
      font: fontRegular,
      color: COLOR_SECONDARY,
    });

    p.drawText(line2, {
      x: (PAGE_W - l2W) / 2,
      y: footerRuleY - 21,
      size: 8,
      font: fontRegular,
      color: COLOR_SECONDARY,
    });

    p.drawText(line3, {
      x: (PAGE_W - l3W) / 2,
      y: footerRuleY - 31,
      size: 8,
      font: fontRegular,
      color: COLOR_SECONDARY,
    });

    // "Page X of N" at the right only if totalPageCount > 1
    if (totalPageCount > 1) {
      const pageNumText = `Page ${pageIdx + 1} of ${totalPageCount}`;
      const pageNumW = fontRegular.widthOfTextAtSize(pageNumText, 8);
      p.drawText(pageNumText, {
        x: PAGE_W - MARGIN_X - pageNumW,
        y: footerRuleY - 31,
        size: 8,
        font: fontRegular,
        color: COLOR_SECONDARY,
      });
    }
  }

  return doc.save();
}
