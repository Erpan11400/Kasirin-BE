import ExcelJS from 'exceljs';

const TIMEZONE = 'Asia/Jakarta';

/**
 * Parsing parameter tanggal (YYYY-MM-DD atau DD/MM/YYYY) ke objek Date UTC+7
 * @param {string} dateStr 
 * @param {boolean} isEndOfDay 
 * @returns {Date|null}
 */
export const parseDateParam = (dateStr, isEndOfDay = false) => {
    if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim()) {
        return null;
    }
    const trimmed = dateStr.trim();
    let y, m, d;

    if (trimmed.includes('/')) {
        // Format DD/MM/YYYY
        const parts = trimmed.split('/');
        if (parts.length === 3) {
            d = parts[0].padStart(2, '0');
            m = parts[1].padStart(2, '0');
            y = parts[2];
        }
    } else if (trimmed.includes('-')) {
        // Format YYYY-MM-DD
        const parts = trimmed.split('T')[0].split('-');
        if (parts.length === 3) {
            y = parts[0];
            m = parts[1].padStart(2, '0');
            d = parts[2].padStart(2, '0');
        }
    }

    if (y && m && d) {
        const timePart = isEndOfDay ? '23:59:59.999' : '00:00:00.000';
        const parsed = new Date(`${y}-${m}-${d}T${timePart}+07:00`);
        if (!isNaN(parsed.getTime())) {
            return parsed;
        }
    }

    const fallback = new Date(trimmed);
    if (!isNaN(fallback.getTime())) {
        if (isEndOfDay) {
            fallback.setHours(23, 59, 59, 999);
        } else {
            fallback.setHours(0, 0, 0, 0);
        }
        return fallback;
    }

    return null;
};

/**
 * Ekstraksi atribut analisis tren dari tanggal (Timezone Asia/Jakarta)
 * @param {Date|string} dateInput 
 */
export const getTrendDateTimeParts = (dateInput) => {
    const d = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(d.getTime())) {
        return {
            tanggal: '-',
            waktu: '-',
            tahun: 0,
            bulan: '-',
            hari: '-',
            jam: 0,
        };
    }

    const tanggal = new Intl.DateTimeFormat('en-CA', {
        timeZone: TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(d);

    const waktu = new Intl.DateTimeFormat('en-GB', {
        timeZone: TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).format(d);

    const tahun = parseInt(
        new Intl.DateTimeFormat('en-CA', {
            timeZone: TIMEZONE,
            year: 'numeric',
        }).format(d),
        10
    );

    const rawBulan = new Intl.DateTimeFormat('id-ID', {
        timeZone: TIMEZONE,
        month: 'long',
    }).format(d);
    const bulan = rawBulan ? rawBulan.charAt(0).toUpperCase() + rawBulan.slice(1) : '-';

    const rawHari = new Intl.DateTimeFormat('id-ID', {
        timeZone: TIMEZONE,
        weekday: 'long',
    }).format(d);
    const hari = rawHari ? rawHari.charAt(0).toUpperCase() + rawHari.slice(1) : '-';

    const jam = parseInt(
        new Intl.DateTimeFormat('en-GB', {
            timeZone: TIMEZONE,
            hour: 'numeric',
            hourCycle: 'h23',
        }).format(d),
        10
    );

    return { tanggal, waktu, tahun, bulan, hari, jam };
};

/**
 * Format label metode pembayaran agar seragam
 * @param {string} method 
 */
export const formatPaymentMethod = (method) => {
    if (!method) return '-';
    const m = method.toLowerCase();
    if (m === 'cash') return 'Cash';
    if (m === 'qris') return 'QRIS';
    if (m === 'transfer') return 'Transfer';
    return method.toUpperCase();
};

/**
 * Mengubah data transaksi database menjadi deretan baris flat (Item-Level Granularity)
 * @param {Array} transactions 
 * @returns {Array<Object>}
 */
export const flattenTransactionsToRows = (transactions = []) => {
    const rows = [];

    for (const trx of transactions) {
        const invoiceId = trx.invoiceNumber || '-';
        const cashierName = trx.cashierId?.name || 'Kasir';
        const paymentMethodStr = formatPaymentMethod(trx.paymentMethod);
        const totalAmount = Number(trx.totalAmount) || 0;
        const paidAmount = Number(trx.paidAmount) || 0;
        const changeAmount = Number(trx.changeAmount) || 0;

        const { tanggal, waktu, tahun, bulan, hari, jam } = getTrendDateTimeParts(trx.createdAt);

        const items = Array.isArray(trx.items) && trx.items.length > 0 ? trx.items : [null];

        for (const item of items) {
            if (item) {
                const productIdStr = item.productId?._id
                    ? item.productId._id.toString()
                    : item.productId
                    ? item.productId.toString()
                    : '-';

                const price = Number(item.price) || 0;
                const quantity = Number(item.quantity) || 0;
                const subtotal = item.subtotal !== undefined && item.subtotal !== null
                    ? Number(item.subtotal)
                    : price * quantity;

                rows.push({
                    invoice_id: invoiceId,
                    tanggal,
                    waktu,
                    tahun,
                    bulan,
                    hari,
                    jam,
                    kasir: cashierName,
                    metode_pembayaran: paymentMethodStr,
                    id_produk: productIdStr,
                    nama_produk: item.productName || '-',
                    harga_satuan: price,
                    qty: quantity,
                    subtotal,
                    total_transaksi: totalAmount,
                    uang_diterima: paidAmount,
                    kembalian: changeAmount,
                });
            } else {
                rows.push({
                    invoice_id: invoiceId,
                    tanggal,
                    waktu,
                    tahun,
                    bulan,
                    hari,
                    jam,
                    kasir: cashierName,
                    metode_pembayaran: paymentMethodStr,
                    id_produk: '-',
                    nama_produk: '-',
                    harga_satuan: 0,
                    qty: 0,
                    subtotal: 0,
                    total_transaksi: totalAmount,
                    uang_diterima: paidAmount,
                    kembalian: changeAmount,
                });
            }
        }
    }

    return rows;
};

/**
 * Membangun ExcelJS Workbook untuk data mentah transaksi
 * @param {Array<Object>} rows Flat row data
 * @returns {ExcelJS.Workbook}
 */
export const buildRawTransactionsWorkbook = (rows = []) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'KasirIn System';
    workbook.lastModifiedBy = 'KasirIn System';
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet('RAW_DATA_TRANSAKSI', {
        views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
    });

    // 17 Kolom Flat Tabular Data
    worksheet.columns = [
        { header: 'No Invoice', key: 'invoice_id' },
        { header: 'Tanggal', key: 'tanggal' },
        { header: 'Waktu', key: 'waktu' },
        { header: 'Tahun', key: 'tahun' },
        { header: 'Bulan', key: 'bulan' },
        { header: 'Hari', key: 'hari' },
        { header: 'Jam (0-23)', key: 'jam' },
        { header: 'Kasir', key: 'kasir' },
        { header: 'Metode Pembayaran', key: 'metode_pembayaran' },
        { header: 'ID Produk', key: 'id_produk' },
        { header: 'Nama Produk', key: 'nama_produk' },
        { header: 'Harga Satuan', key: 'harga_satuan', style: { numFmt: '#,##0' } },
        { header: 'Qty', key: 'qty', style: { numFmt: '#,##0' } },
        { header: 'Subtotal', key: 'subtotal', style: { numFmt: '#,##0' } },
        { header: 'Total Transaksi', key: 'total_transaksi', style: { numFmt: '#,##0' } },
        { header: 'Uang Diterima', key: 'uang_diterima', style: { numFmt: '#,##0' } },
        { header: 'Kembalian', key: 'kembalian', style: { numFmt: '#,##0' } },
    ];

    // Freeze Header Row
    worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

    // Auto-Filter A1:Q1
    worksheet.autoFilter = 'A1:Q1';

    // Header Styling (Background #1E293B, teks putih tebal)
    const headerRow = worksheet.getRow(1);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1E293B' },
        };
        cell.font = {
            name: 'Calibri',
            size: 11,
            bold: true,
            color: { argb: 'FFFFFFFF' },
        };
        cell.alignment = {
            vertical: 'middle',
            horizontal: 'center',
            wrapText: false,
        };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FF334155' } },
            left: { style: 'thin', color: { argb: 'FF334155' } },
            bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
            right: { style: 'thin', color: { argb: 'FF334155' } },
        };
    });

    // Masukkan data baris (Row 2 ke bawah)
    rows.forEach((rowData) => {
        const row = worksheet.addRow(rowData);
        row.height = 20;

        // Alignment per kolom data
        row.getCell('invoice_id').alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell('tanggal').alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('waktu').alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('tahun').alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('bulan').alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell('hari').alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell('jam').alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('kasir').alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell('metode_pembayaran').alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('id_produk').alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell('nama_produk').alignment = { vertical: 'middle', horizontal: 'left' };

        // Kolom nominal angka diformat #,##0 dan right-aligned
        const numericKeys = ['harga_satuan', 'qty', 'subtotal', 'total_transaksi', 'uang_diterima', 'kembalian'];
        numericKeys.forEach((key) => {
            const cell = row.getCell(key);
            cell.numFmt = '#,##0';
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
        });
    });

    // Auto-fit Column Width (Panjang karakter terpanjang + padding, minimal 15)
    worksheet.columns.forEach((column) => {
        let maxLength = column.header ? column.header.toString().length : 10;
        column.eachCell({ includeEmpty: false }, (cell) => {
            const cellVal = cell.value;
            if (cellVal !== null && cellVal !== undefined) {
                const strVal = typeof cellVal === 'number'
                    ? cellVal.toLocaleString('id-ID')
                    : cellVal.toString();
                if (strVal.length > maxLength) {
                    maxLength = strVal.length;
                }
            }
        });
        column.width = Math.max(maxLength + 4, 15);
    });

    return workbook;
};

/**
 * Buat nama file Excel yang aman untuk header Content-Disposition
 * @param {string} startDate 
 * @param {string} endDate 
 * @returns {string}
 */
export const generateExcelFileName = (startDate, endDate) => {
    const sanitize = (str) => (str ? str.toString().trim().replace(/[\/\\]/g, '-') : '');
    const cleanStart = sanitize(startDate);
    const cleanEnd = sanitize(endDate);

    if (cleanStart && cleanEnd) {
        return `Data_Mentah_Transaksi_${cleanStart}_sd_${cleanEnd}.xlsx`;
    } else if (cleanStart) {
        return `Data_Mentah_Transaksi_${cleanStart}_sd_Terbaru.xlsx`;
    } else if (cleanEnd) {
        return `Data_Mentah_Transaksi_Awal_sd_${cleanEnd}.xlsx`;
    }

    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date());
    return `Data_Mentah_Transaksi_Semua_${todayStr}.xlsx`;
};
