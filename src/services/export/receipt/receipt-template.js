/**
 * Template struk thermal KasirIn (backend / Puppeteer).
 * Mengacu pada spesifikasi visual komponen frontend ThermalReceipt.tsx.
 */

/**
 * Layout struk per ukuran kertas.
 * - layoutPx : lebar layout (CSS px) sesuai frontend (380px untuk 80mm, 320px untuk 58mm)
 * - paperMm  : lebar fisik kertas
 * - scale    : skala agar layout frontend pas dengan lebar kertas fisik (96 dpi)
 */
export const getReceiptLayout = (paperWidth = '80mm') => {
    const is58 = paperWidth === '58mm';
    const layoutPx = is58 ? 320 : 380;
    const paperMm = is58 ? 58 : 80;
    const paperPx = (paperMm / 25.4) * 96;
    return { layoutPx, paperMm, paperPx, scale: paperPx / layoutPx };
};

export const formatRupiah = (number) => {
    const n = Number(number);
    if (!Number.isFinite(n)) return 'Rp 0';
    return `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)}`;
};

export const escapeHtml = (text) => {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

/** Format id-ID: DD/MM/YYYY, HH.mm (zona Asia/Jakarta) */
const formatReceiptDate = (value) => {
    const d = new Date(value || Date.now());
    if (isNaN(d.getTime())) return '-';
    const parts = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(d).reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});
    return `${parts.day}/${parts.month}/${parts.year}, ${parts.hour}.${parts.minute}`;
};

const PAYMENT_LABELS = { cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer' };

const BARCODE_WIDTHS = [2, 1, 3, 1, 4, 2, 1, 3, 2, 4, 1, 2];

export const generateThermalReceiptHtml = ({
    transaction = {},
    store = {},
    paperWidth = '80mm',
    cashierOverride,
    customNotes,
}) => {
    const { layoutPx } = getReceiptLayout(paperWidth);

    // ===== Data toko =====
    const storeName = String(store.storeName || store.name || '').trim() || 'NAMA TOKO';
    const category = String(store.category || store.businessCategory || '').trim();
    const address = String(store.address || '').trim();
    const phone = String(store.phone || '').trim();
    const footerNote = String(customNotes || store.footerNote || '').trim();
    const showQris = Boolean(store.showQris);

    // ===== Data transaksi =====
    const invoiceNumber = transaction.invoiceNumber || '-';
    const cashier = cashierOverride || transaction.cashierId?.name || transaction.cashierName || '-';
    const dateStr = transaction.dayDate || formatReceiptDate(transaction.createdAt);

    const method = String(transaction.paymentMethod || 'cash').toLowerCase();
    const isCash = method === 'cash';
    const methodLabel = PAYMENT_LABELS[method] || String(transaction.paymentMethod).toUpperCase();

    const items = Array.isArray(transaction.items) ? transaction.items : [];
    const tax = Number(transaction.tax) || 0;
    const total = Number(transaction.totalAmount ?? transaction.total) || 0;
    const paid = isCash ? (Number(transaction.paidAmount ?? transaction.cashGiven) || total) : total;
    const change = isCash ? Math.max(0, Number(transaction.changeAmount ?? transaction.change) || 0) : 0;

    const itemsHtml = items.map((item) => {
        const qty = Number(item.quantity ?? item.qty) || 1;
        const price = Number(item.price) || 0;
        const lineTotal = Number(item.subtotal ?? item.total) || price * qty;
        return `
        <div class="item">
          <div class="row item-top">
            <span class="item-name">${escapeHtml(item.productName || item.name || 'Produk')}</span>
            <span class="item-total">${formatRupiah(lineTotal)}</span>
          </div>
          <div class="item-sub">${qty} x ${formatRupiah(price)}</div>
        </div>`;
    }).join('');

    const barcodeHtml = BARCODE_WIDTHS
        .map((w) => `<span class="bar" style="width:${w}px"></span>`).join('');

    return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Struk - ${escapeHtml(invoiceNumber)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { background: #FFFFFF; }
  body {
    width: ${layoutPx}px;
    color: #1E293B;
    font-family: 'Courier New', Courier, Consolas, 'Liberation Mono', monospace;
    font-size: 13px;
    line-height: 1.625;
  }
  .receipt { width: 100%; display: flex; flex-direction: column; background: #FFFFFF; padding: 20px 24px; }
  .row { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
  .divider { border-top: 1px dashed #CBD5E1; margin: 6px 0; width: 100%; }

  /* 1. Header */
  .header { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 4px; padding-bottom: 12px; }
  .logo { display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 8px; transform: scale(0.95); }
  .logo-mark { width: 24px; height: 24px; border-radius: 6px; background: #000000; color: #FFFFFF;
    font-weight: 800; font-size: 15px; line-height: 24px; text-align: center; }
  .logo-text { font-size: 16px; color: #000000; letter-spacing: -0.3px; font-weight: 400; }
  .logo-text b { font-weight: 800; }
  .store-name { font-size: 15px; font-weight: 700; text-transform: uppercase; color: #000000; line-height: 1.3; }
  .store-category { font-family: Helvetica, Arial, sans-serif; font-size: 11px; color: #64748B;
    text-transform: uppercase; letter-spacing: 0.12em; }
  .store-address { font-size: 11px; color: #475569; line-height: 1.3; }
  .store-phone { font-size: 11px; font-weight: 600; color: #334155; }

  /* 2. Meta */
  .meta { font-size: 11px; color: #475569; }

  /* 3. Items */
  .items { font-size: 12px; }
  .item { margin-bottom: 8px; }
  .item:last-child { margin-bottom: 0; }
  .item-top { font-weight: 600; color: #0F172A; }
  .item-name { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .item-total { flex-shrink: 0; }
  .item-sub { font-size: 11px; color: #64748B; }

  /* 4. Totals */
  .totals { font-size: 12px; display: flex; flex-direction: column; gap: 4px; }
  .tax { color: #475569; }
  .total { font-size: 14px; font-weight: 700; color: #000000; }
  .paid { font-size: 11px; color: #475569; }
  .change { font-size: 11px; font-weight: 600; color: #065F46; }

  /* 5. QRIS */
  .qris { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px; }
  .qris-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #334155; letter-spacing: 0.1em; }
  .qris-frame { background: #FFFFFF; padding: 8px; border: 1px solid #E2E8F0; border-radius: 4px; line-height: 0; }
  .qris-store { font-size: 9px; color: #64748B; }

  /* 6. Footer note */
  .footer-note { text-align: center; font-size: 11px; color: #334155; padding-top: 8px; }

  /* 7. Barcode */
  .barcode-wrap { display: flex; justify-content: center; margin-top: 8px; }
  .barcode { display: inline-flex; align-items: center; justify-content: center; gap: 2px;
    height: 24px; padding: 0 6px; border: 1px solid #E2E8F0; }
  .bar { display: inline-block; height: 20px; background: #000000; }
</style>
</head>
<body>
  <div class="receipt">
    <!-- 1. Header toko -->
    <div class="header">
      <div class="logo"><div class="logo-mark">K</div><div class="logo-text"><b>Kasir</b>In</div></div>
      <div class="store-name">${escapeHtml(storeName)}</div>
      ${category ? `<div class="store-category">${escapeHtml(category)}</div>` : ''}
      ${address ? `<div class="store-address">${escapeHtml(address)}</div>` : ''}
      ${phone ? `<div class="store-phone">Telp / WA: ${escapeHtml(phone)}</div>` : ''}
    </div>

    <div class="divider"></div>

    <!-- 2. Meta transaksi -->
    <div class="meta">
      <div class="row"><span>No: ${escapeHtml(invoiceNumber)}</span><span>Kasir: ${escapeHtml(cashier)}</span></div>
      <div class="row"><span>Tgl: ${escapeHtml(dateStr)}</span><span>Metode: ${escapeHtml(methodLabel)}</span></div>
    </div>

    <div class="divider"></div>

    <!-- 3. Daftar item -->
    <div class="items">${itemsHtml}</div>

    <div class="divider"></div>

    <!-- 4. Total & pembayaran -->
    <div class="totals">
      ${tax > 0 ? `<div class="row tax"><span>Pajak</span><span>${formatRupiah(tax)}</span></div>` : ''}
      <div class="row total"><span>TOTAL</span><span>${formatRupiah(total)}</span></div>
      <div class="row paid"><span>Bayar (${escapeHtml(methodLabel)})</span><span>${formatRupiah(paid)}</span></div>
      <div class="row change"><span>Kembali</span><span>${formatRupiah(change)}</span></div>
    </div>

    <div class="divider"></div>

    <!-- 5. QRIS -->
    ${showQris ? `
    <div class="qris">
      <div class="qris-label">QRIS STANDAR PEMBAYARAN</div>
      <div class="qris-frame">
        <svg width="96" height="96" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <rect fill="#000" width="30" height="30" x="0" y="0"/><rect fill="#fff" width="20" height="20" x="5" y="5"/><rect fill="#000" width="10" height="10" x="10" y="10"/>
          <rect fill="#000" width="30" height="30" x="70" y="0"/><rect fill="#fff" width="20" height="20" x="75" y="5"/><rect fill="#000" width="10" height="10" x="80" y="10"/>
          <rect fill="#000" width="30" height="30" x="0" y="70"/><rect fill="#fff" width="20" height="20" x="5" y="75"/><rect fill="#000" width="10" height="10" x="10" y="80"/>
          <rect fill="#000" width="8" height="8" x="40" y="10"/><rect fill="#000" width="8" height="8" x="52" y="10"/>
          <rect fill="#000" width="16" height="16" x="42" y="42"/><rect fill="#000" width="20" height="12" x="75" y="70"/>
        </svg>
      </div>
      <div class="qris-store">${escapeHtml(store.storeName || store.name || 'KasirIn Store')}</div>
    </div>` : ''}

    <!-- 6. Catatan kaki -->
    ${footerNote ? `<div class="footer-note">${escapeHtml(footerNote)}</div>` : ''}

    <!-- 7. Barcode dekoratif -->
    <div class="barcode-wrap"><div class="barcode">${barcodeHtml}</div></div>
  </div>
</body>
</html>`;
};

export default {
    getReceiptLayout,
    formatRupiah,
    escapeHtml,
    generateThermalReceiptHtml,
};
