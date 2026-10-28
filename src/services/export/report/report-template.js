/**
 * Utility untuk format mata uang Rupiah
 */
export const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(number || 0);
};

/**
 * Utility untuk format nominal tanpa simbol Rp (untuk sel tabel yang sudah ber-header Rp)
 */
export const formatNominal = (number) => {
    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(number || 0);
};

/**
 * Utility untuk format tanggal standar Indonesia (DD/MM/YYYY)
 */
export const formatDateIndo = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
};

/**
 * Utility untuk format tanggal & waktu (DD/MM/YYYY HH:mm)
 */
export const formatDateTimeIndo = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

/**
 * Utility untuk format waktu teks lengkap: "17 Oktober 2026, 10:15 WIB"
 */
export const formatPrintedTimestamp = (date = new Date()) => {
    const d = new Date(date);
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    const dd = d.getDate();
    const mm = months[d.getMonth()] || '';
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd} ${mm} ${yyyy}, ${hh}:${min} WIB`;
};

/**
 * Mendapatkan 2 huruf inisial dari nama toko
 */
export const getStoreInitials = (name) => {
    if (!name) return 'KI';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
};

/**
 * Menghasilkan HTML string untuk dokumen PDF Laporan KasirIn
 * Presisi 100% selaras dengan token warna, padding, tipografi, dan layout ReportPrintTemplate.tsx
 */
export const generateReportHtml = ({
    store = {},
    meta = {},
    summary = {},
    data = [],
}) => {
    const isLandscape = meta.orientation === 'landscape';
    const storeName = store.name || store.storeName || 'KASIRIN POINT OF SALE';
    const storeAddress = store.address || '';
    const storePhone = store.phone || '';
    const storeCategory = store.businessCategory || store.category || '';
    const printDateTime = formatPrintedTimestamp(new Date());

    const showKpis = meta.showKpis !== false;
    const showSignatures = meta.showSignatures !== false;

    // Render baris tabel data sesuai tipe laporan
    const renderTableContent = () => {
        if (!data || data.length === 0) {
            const colspan = meta.type === 'transaksi' ? 7 : 6;
            return `
                <tr style="background-color: #ffffff;">
                    <td colspan="${colspan}" style="text-align: center; padding: 36px 12px; color: #64748b; font-style: italic;">
                        Tidak ada data transaksi yang ditemukan pada periode ini.
                    </td>
                </tr>
            `;
        }

        if (meta.type === 'transaksi') {
            return data.map((item, index) => {
                const itemsList = item.items || [];
                const isEven = index % 2 === 1;
                const rowBg = isEven ? '#f8fafc' : '#ffffff';

                // Format rincian produk: nama di kiri, x{qty} bold #475569, dan @{harga} font mono #64748b
                const itemsHtml = itemsList.length > 0
                    ? itemsList.map(i => `
                        <div style="line-height: 1.4; margin-bottom: 2px;">
                            ${i.productName} 
                            <strong style="color: #475569; margin-left: 2px;">x${i.quantity}</strong> 
                            <span class="mono" style="color: #64748b; font-size: 10px; margin-left: 4px;">@${formatNominal(i.price)}</span>
                        </div>
                    `).join('')
                    : '<span style="color: #94a3b8;">-</span>';

                const methodLabel = {
                    cash: 'Tunai',
                    tunai: 'Tunai',
                    qris: 'QRIS',
                    transfer: 'Transfer',
                }[(item.paymentMethod || '').toLowerCase()] || (item.paymentMethod || '-');

                return `
                <tr style="background-color: ${rowBg}; border-bottom: 1px solid #e2e8f0; font-size: 11px;">
                    <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; text-align: center; color: #64748b;" class="mono">${index + 1}</td>
                    <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; color: #334155; white-space: nowrap;">
                        ${formatDateTimeIndo(item.createdAt)}
                    </td>
                    <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; font-weight: bold; color: #0f172a; white-space: nowrap;" class="mono">
                        ${item.invoiceNumber || '-'}
                    </td>
                    <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; color: #334155;">
                        ${item.cashierName || '-'}
                    </td>
                    <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; color: #0f172a;">
                        ${itemsHtml}
                    </td>
                    <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: #334155;">
                        ${methodLabel}
                    </td>
                    <td style="padding: 8px 12px; text-align: right; font-weight: bold; color: #0f172a; white-space: nowrap;" class="mono">
                        ${formatNominal(item.totalAmount)}
                    </td>
                </tr>
                `;
            }).join('');
        }

        if (meta.type === 'harian') {
            return data.map((item, index) => {
                const isEven = index % 2 === 1;
                const rowBg = isEven ? '#f8fafc' : '#ffffff';
                const topProducts = (item.productSales || []).slice(0, 3)
                    .map(p => `${p.productName} (${p.quantity})`)
                    .join(', ');

                return `
                <tr style="background-color: ${rowBg}; border-bottom: 1px solid #e2e8f0; font-size: 11px;">
                    <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; text-align: center; color: #64748b;" class="mono">${index + 1}</td>
                    <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; font-weight: bold; color: #0f172a; white-space: nowrap;">
                        ${item.dayDate || '-'}
                    </td>
                    <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: #0f172a;" class="mono">
                        ${item.trxCount || 0} Trx
                    </td>
                    <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; color: #334155;">
                        ${topProducts || '<span style="color:#94a3b8;">-</span>'}
                    </td>
                    <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; text-align: center; color: #334155;">
                        <strong>${item.dominantMethod?.type || '-'}</strong>
                        <span style="font-size: 10px; color: #64748b;">(${item.dominantMethod?.percentage || 0}%)</span>
                    </td>
                    <td style="padding: 8px 12px; text-align: right; font-weight: bold; color: #0f172a; white-space: nowrap;" class="mono">
                        ${formatNominal(item.totalRevenue)}
                    </td>
                </tr>
                `;
            }).join('');
        }

        if (meta.type === 'bulanan') {
            return data.map((item, index) => {
                const isEven = index % 2 === 1;
                const rowBg = isEven ? '#f8fafc' : '#ffffff';
                const totalItemCount = (item.productSales || []).reduce((acc, curr) => acc + (curr.quantity || 0), 0);
                const topProducts = (item.productSales || []).slice(0, 3)
                    .map(p => `${p.productName} (${p.quantity})`)
                    .join(', ');

                return `
                <tr style="background-color: ${rowBg}; border-bottom: 1px solid #e2e8f0; font-size: 11px;">
                    <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; text-align: center; color: #64748b;" class="mono">${index + 1}</td>
                    <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; font-weight: bold; color: #0f172a; white-space: nowrap;">
                        ${item.period || '-'}
                    </td>
                    <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: #0f172a;" class="mono">
                        ${item.trxCount || 0} Trx
                    </td>
                    <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; color: #0f172a;">
                        <span style="font-weight: 600;">${totalItemCount} item terjual</span>
                        <div style="font-size: 10px; color: #64748b; margin-top: 1px;">Top: ${topProducts || '-'}</div>
                    </td>
                    <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; text-align: center; color: #334155; font-weight: 600;">
                        ${item.isCurrent ? 'Bulan Berjalan' : 'Selesai'}
                    </td>
                    <td style="padding: 8px 12px; text-align: right; font-weight: bold; color: #0f172a; white-space: nowrap;" class="mono">
                        ${formatNominal(item.grossRevenue)}
                    </td>
                </tr>
                `;
            }).join('');
        }
    };

    // Header Kolom Tabel
    const renderTableHeaders = () => {
        if (meta.type === 'transaksi') {
            return `
                <tr style="background-color: #f1f5f9; color: #1e293b; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #cbd5e1;">
                    <th style="padding: 10px 12px; border-right: 1px solid #cbd5e1; width: 40px; text-align: center;">No</th>
                    <th style="padding: 10px 12px; border-right: 1px solid #cbd5e1; width: 110px; text-align: left;">Waktu / Tgl</th>
                    <th style="padding: 10px 12px; border-right: 1px solid #cbd5e1; width: 130px; text-align: left;">No. Invoice</th>
                    <th style="padding: 10px 12px; border-right: 1px solid #cbd5e1; width: 100px; text-align: left;">Kasir</th>
                    <th style="padding: 10px 12px; border-right: 1px solid #cbd5e1; text-align: left;">Rincian Item Terjual</th>
                    <th style="padding: 10px 12px; border-right: 1px solid #cbd5e1; width: 95px; text-align: center;">Metode</th>
                    <th style="padding: 10px 12px; width: 120px; text-align: right;">Total (Rp)</th>
                </tr>
            `;
        }
        if (meta.type === 'harian') {
            return `
                <tr style="background-color: #f1f5f9; color: #1e293b; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #cbd5e1;">
                    <th style="padding: 10px 12px; border-right: 1px solid #cbd5e1; width: 40px; text-align: center;">No</th>
                    <th style="padding: 10px 12px; border-right: 1px solid #cbd5e1; width: 140px; text-align: left;">Hari & Tanggal</th>
                    <th style="padding: 10px 12px; border-right: 1px solid #cbd5e1; width: 100px; text-align: center;">Jml Trx</th>
                    <th style="padding: 10px 12px; border-right: 1px solid #cbd5e1; text-align: left;">Penjualan Produk</th>
                    <th style="padding: 10px 12px; border-right: 1px solid #cbd5e1; width: 120px; text-align: center;">Metode Dominan</th>
                    <th style="padding: 10px 12px; width: 130px; text-align: right;">Total Omset (Rp)</th>
                </tr>
            `;
        }
        return `
            <tr style="background-color: #f1f5f9; color: #1e293b; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #cbd5e1;">
                <th style="padding: 10px 12px; border-right: 1px solid #cbd5e1; width: 40px; text-align: center;">No</th>
                <th style="padding: 10px 12px; border-right: 1px solid #cbd5e1; width: 140px; text-align: left;">Periode Bulan</th>
                <th style="padding: 10px 12px; border-right: 1px solid #cbd5e1; width: 100px; text-align: center;">Jml Trx</th>
                <th style="padding: 10px 12px; border-right: 1px solid #cbd5e1; text-align: left;">Volume Penjualan Produk</th>
                <th style="padding: 10px 12px; border-right: 1px solid #cbd5e1; width: 110px; text-align: center;">Status</th>
                <th style="padding: 10px 12px; width: 130px; text-align: right;">Total Pendapatan (Rp)</th>
            </tr>
        `;
    };

    // TFoot Grand Total Baris
    const renderTableFooter = () => {
        if (!data || data.length === 0) return '';

        if (meta.type === 'transaksi') {
            return `
                <tr style="background-color: #f1f5f9; font-weight: bold; color: #0f172a; border-top: 2px solid #94a3b8; font-size: 11px;">
                    <td colspan="4" style="padding: 10px 12px; text-align: right; text-transform: uppercase;">Grand Total Keseluruhan:</td>
                    <td style="padding: 10px 12px; border-right: 1px solid #cbd5e1; color: #475569;">${summary.totalItems || 0} Item Produk Terjual</td>
                    <td style="padding: 10px 12px; border-right: 1px solid #cbd5e1; text-align: center; color: #475569;" class="mono">${summary.totalTransactions || 0} Trx</td>
                    <td style="padding: 10px 12px; text-align: right; font-size: 13px; font-weight: 800; color: #0f172a;" class="mono">${formatRupiah(summary.totalRevenue)}</td>
                </tr>
            `;
        }
        if (meta.type === 'harian') {
            return `
                <tr style="background-color: #f1f5f9; font-weight: bold; color: #0f172a; border-top: 2px solid #94a3b8; font-size: 11px;">
                    <td colspan="2" style="padding: 10px 12px; text-align: right; text-transform: uppercase;">Grand Total Keseluruhan:</td>
                    <td style="padding: 10px 12px; border-right: 1px solid #cbd5e1; text-align: center; color: #475569;" class="mono">${summary.totalTransactions || 0} Trx</td>
                    <td colspan="2" style="padding: 10px 12px; border-right: 1px solid #cbd5e1; color: #475569;">${data.length} Hari Transaksi • ${summary.totalItems || 0} Item Produk</td>
                    <td style="padding: 10px 12px; text-align: right; font-size: 13px; font-weight: 800; color: #0f172a;" class="mono">${formatRupiah(summary.totalRevenue)}</td>
                </tr>
            `;
        }
        return `
            <tr style="background-color: #f1f5f9; font-weight: bold; color: #0f172a; border-top: 2px solid #94a3b8; font-size: 11px;">
                <td colspan="2" style="padding: 10px 12px; text-align: right; text-transform: uppercase;">Grand Total Keseluruhan:</td>
                <td style="padding: 10px 12px; border-right: 1px solid #cbd5e1; text-align: center; color: #475569;" class="mono">${summary.totalTransactions || 0} Trx</td>
                <td colspan="2" style="padding: 10px 12px; border-right: 1px solid #cbd5e1; color: #475569;">${data.length} Bulan • ${summary.totalItems || 0} Item Terjual</td>
                <td style="padding: 10px 12px; text-align: right; font-size: 13px; font-weight: 800; color: #0f172a;" class="mono">${formatRupiah(summary.totalRevenue)}</td>
            </tr>
        `;
    };

    return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>${meta.reportTitle || 'Laporan Penjualan - KasirIn POS'}</title>
  <style>
    @page {
      size: A4 ${meta.orientation || 'portrait'};
      margin: ${isLandscape ? '8mm 10mm 8mm 10mm' : '10mm 12mm 10mm 12mm'};
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: #ffffff;
      color: #0f172a;
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .mono { font-family: 'Courier New', Courier, monospace; }
    .avoid-break { break-inside: avoid; page-break-inside: avoid; }
    table { width: 100%; border-collapse: collapse; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
  </style>
</head>
<body style="padding: 4px;">
  <!-- ================= 1. KOP DOKUMEN: IDENTITAS KASIRIN & TOKO ================= -->
  <div style="display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 18px; margin-bottom: 16px;">
    <div style="display: flex; align-items: flex-start; gap: 16px;">
      <!-- Logo Brand KasirIn Web (Pill Variant) -->
      <div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0;">
        <div style="width: 38px; height: 38px; border-radius: 10px; background: linear-gradient(135deg, #006948 0%, #059669 50%, #14b8a6 100%); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0, 105, 72, 0.25);">
          <span style="color: #ffffff; font-weight: 900; font-size: 17px; line-height: 1; letter-spacing: -0.5px; font-family: sans-serif;">
            K<span style="color: #a7f3d0; margin-left: 1px;">•</span>
          </span>
        </div>
        <div style="display: flex; flex-direction: column; justify-content: center; line-height: 1.1;">
          <div style="display: flex; align-items: center; gap: 4px;">
            <span style="font-weight: 900; font-size: 18px; color: #0f172a; letter-spacing: -0.5px; font-family: sans-serif;">Kasir</span>
            <span style="background-color: #006948; color: #ffffff; font-size: 11px; font-weight: 800; padding: 2px 6px; border-radius: 6px; letter-spacing: 0.5px; font-family: sans-serif; line-height: 1;">IN</span>
          </div>
          <span style="font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; margin-top: 3px; font-family: sans-serif;">SMART POS UMKM</span>
        </div>
      </div>

      <!-- Divider Pemisah -->
      <div style="width: 1px; min-height: 42px; background-color: #cbd5e1; margin: 0 4px; align-self: stretch;"></div>

      <!-- Detail Toko / Merchant -->
      <div style="display: flex; flex-direction: column; gap: 2px;">
        <h1 style="margin: 0; font-size: 16px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: -0.3px; font-family: sans-serif;">
          ${storeName}
        </h1>
        ${storeCategory ? `
        <span style="font-size: 11px; font-weight: 600; color: #475569; text-transform: uppercase;">
          ${storeCategory}
        </span>
        ` : ''}
        ${storeAddress ? `
        <span style="font-size: 11px; color: #64748b; max-width: 320px; line-height: 1.3;">
          ${storeAddress}
        </span>
        ` : ''}
        ${storePhone ? `
        <span style="font-size: 11px; color: #64748b; font-weight: 500;">
          Telp: ${storePhone}
        </span>
        ` : ''}
      </div>
    </div>

    <!-- Sisi Kanan: Info Dokumen -->
    <div style="text-align: right;">
      <div style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; font-family: sans-serif;">
        Dokumen Resmi
      </div>
      <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 5px; text-transform: uppercase;">
        ${meta.reportTitle || 'LAPORAN TRANSAKSI PENJUALAN'}
      </div>
      <div style="font-size: 11px; color: #64748b; margin-top: 3px; line-height: 1.4;">
        <div>Periode: <strong>${meta.periodLabel || 'Semua Periode'}</strong></div>
        <div>Operator: <strong>${meta.printedBy || 'Admin Kasir'}</strong></div>
        <div>Dicetak: <strong>${printDateTime}</strong></div>
      </div>
    </div>
  </div>

  <!-- ================= 2. FILTER & METADATA BAR ================= -->
  <div style="margin-top: 12px; background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px 14px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #334155;">
    <div>
      <strong>Metode Pembayaran:</strong> ${meta.paymentMethodLabel || 'Semua'}
    </div>
    <div style="font-weight: 600; color: #1e293b;">
      Status Data: <span style="color: #047857; font-weight: bold;">Sinkron &amp; Terverifikasi</span>
    </div>
  </div>

  <!-- ================= 3. RINGKASAN FINANSIAL (4 KPI CARDS) ================= -->
  ${showKpis ? `
  <div style="margin-top: 20px;" class="avoid-break">
    <h3 style="font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
      Ringkasan Finansial Eksekutif
    </h3>
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
      <!-- Card 1 -->
      <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background-color: #f8fafc;">
        <span style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Total Pendapatan (Omset)</span>
        <span style="font-size: 18px; font-weight: 800; color: #0f172a; display: block; margin-top: 4px;">${formatRupiah(summary.totalRevenue)}</span>
        <span style="font-size: 10px; color: #64748b; display: block; margin-top: 2px;">Akumulasi seluruh transaksi</span>
      </div>
      <!-- Card 2 -->
      <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background-color: #f8fafc;">
        <span style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Jumlah Transaksi</span>
        <span style="font-size: 18px; font-weight: 800; color: #0f172a; display: block; margin-top: 4px;">${summary.totalTransactions || 0} <span style="font-size: 12px; font-weight: normal; color: #475569;">Trx</span></span>
        <span style="font-size: 10px; color: #64748b; display: block; margin-top: 2px;">${summary.totalItems || 0} item produk terjual</span>
      </div>
      <!-- Card 3 -->
      <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background-color: #f8fafc;">
        <span style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Rata-rata Order (AOV)</span>
        <span style="font-size: 18px; font-weight: 800; color: #0f172a; display: block; margin-top: 4px;">${formatRupiah(summary.aov)}</span>
        <span style="font-size: 10px; color: #64748b; display: block; margin-top: 2px;">Per struk transaksi</span>
      </div>
      <!-- Card 4 -->
      <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background-color: #f8fafc;">
        <span style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Penerimaan Pembayaran</span>
        <div style="font-size: 11px; margin-top: 4px; line-height: 1.4;">
          <div style="display: flex; justify-content: space-between; color: #334155;">
            <span>Tunai (${summary.breakdown?.cash?.count || 0}):</span> 
            <strong>${formatRupiah(summary.breakdown?.cash?.total)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; color: #334155;">
            <span>QRIS (${summary.breakdown?.qris?.count || 0}):</span> 
            <strong>${formatRupiah(summary.breakdown?.qris?.total)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; color: #334155;">
            <span>Transfer (${summary.breakdown?.transfer?.count || 0}):</span> 
            <strong>${formatRupiah(summary.breakdown?.transfer?.total)}</strong>
          </div>
        </div>
      </div>
    </div>
  </div>
  ` : ''}

  <!-- ================= 4. TABEL DATA UTAMA ================= -->
  <div style="margin-top: 24px;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <h3 style="font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">
        Rincian Data Dokumen
      </h3>
      <span style="font-size: 11px; color: #64748b;">Total ${data.length} Baris Data</span>
    </div>
    <table style="border: 1px solid #cbd5e1;">
      <thead>
        ${renderTableHeaders()}
      </thead>
      <tbody>
        ${renderTableContent()}
      </tbody>
      <tfoot>
        ${renderTableFooter()}
      </tfoot>
    </table>
  </div>

  <!-- ================= 5. CATATAN & MEMO ================= -->
  ${(meta.customNotes || store.footerNote) ? `
  <div style="margin-top: 20px; border: 1px solid #e2e8f0; border-radius: 4px; padding: 12px; background-color: #f8fafc; font-size: 11px;" class="avoid-break">
    ${meta.customNotes ? `
      <div style="font-size: 10px; font-weight: bold; color: #1e293b; text-transform: uppercase; letter-spacing: 0.05em;">
        Catatan Khusus / Memo Finansial:
      </div>
      <p style="color: #334155; margin-top: 2px;">
        ${meta.customNotes}
      </p>
    ` : ''}
    ${store.footerNote ? `
      <div style="font-size: 10px; font-weight: bold; color: #1e293b; text-transform: uppercase; letter-spacing: 0.05em; margin-top: ${meta.customNotes ? '8px' : '0'};">
        Kebijakan & Ketentuan Toko:
      </div>
      <p style="color: #334155; margin-top: 2px;">
        ${store.footerNote}
      </p>
    ` : ''}
  </div>
  ` : ''}

  <!-- ================= 6. LEMBAR VALIDASI & TANDA TANGAN (3 KOLOM) ================= -->
  ${showSignatures ? `
  <div class="avoid-break" style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #cbd5e1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; text-align: center; font-size: 12px;">
    <!-- Kolom 1 -->
    <div>
      <span style="font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; display: block;">Dibuat Oleh:</span>
      <span style="font-weight: bold; color: #1e293b;">Petugas Kasir / Pelapor</span>
      <div style="height: 64px;"></div>
      <div style="width: 175px; margin: 0 auto; border-bottom: 1px solid #94a3b8;"></div>
      <span style="display: block; margin-top: 4px; font-weight: bold; color: #0f172a; font-size: 11px;">${meta.printedBy || 'Admin Kasir'}</span>
      <span style="font-size: 10px; color: #64748b; display: block; margin-top: 2px;">Tanggal: ____ / ____ / ________</span>
    </div>
    <!-- Kolom 2 -->
    <div>
      <span style="font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; display: block;">Diperiksa Oleh:</span>
      <span style="font-weight: bold; color: #1e293b;">Supervisor / Finance</span>
      <div style="height: 64px;"></div>
      <div style="width: 175px; margin: 0 auto; border-bottom: 1px solid #94a3b8;"></div>
      <span style="display: block; margin-top: 4px; font-weight: bold; color: #0f172a; font-size: 11px;">( ................................ )</span>
      <span style="font-size: 10px; color: #64748b; display: block; margin-top: 2px;">Tanggal: ____ / ____ / ________</span>
    </div>
    <!-- Kolom 3 -->
    <div>
      <span style="font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; display: block;">Disetujui Oleh:</span>
      <span style="font-weight: bold; color: #1e293b;">Owner / Store Manager</span>
      <div style="height: 64px;"></div>
      <div style="width: 175px; margin: 0 auto; border-bottom: 1px solid #94a3b8;"></div>
      <span style="display: block; margin-top: 4px; font-weight: bold; color: #0f172a; font-size: 11px;">${meta.approverName || '( ................................ )'}</span>
      <span style="font-size: 10px; color: #64748b; display: block; margin-top: 2px;">Tanggal: ____ / ____ / ________</span>
    </div>
  </div>
  ` : ''}

  <!-- ================= 7. FOOTER RESMI ================= -->
  <div style="margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #64748b;" class="avoid-break">
    <div>
      Laporan ini dihasilkan secara otomatis oleh <strong>KasirIn POS</strong>. Dokumen finansial resmi &amp; sah.
    </div>
    <div class="mono">
      Dokumen 1 / 1
    </div>
  </div>
</body>
</html>
    `;
};

export default {
    formatRupiah,
    formatNominal,
    formatDateIndo,
    formatDateTimeIndo,
    formatPrintedTimestamp,
    getStoreInitials,
    generateReportHtml,
};
