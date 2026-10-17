import Transactions from '../../../models/Transactions.js';
import response from '../../../utils/response.js';
import {
    parseDateParam,
    flattenTransactionsToRows,
    buildRawTransactionsWorkbook,
    generateExcelFileName,
} from './excel-generator.service.js';

/**
 * Controller untuk Export Data Mentah Transaksi ke format Excel (.xlsx) untuk Analisis Tren & BI
 * Mendukung pemanggilan via GET (query params) atau POST (body json / query params)
 */
export const exportRawTransactionsExcel = async (req, res, next) => {
    try {
        const params = req.method === 'POST' ? { ...req.query, ...req.body } : req.query;
        const { startDate, endDate, paymentMethod } = params;

        // 1. Susun Filter Transaksi Tanggal & Metode Bayar
        const matchFilter = {};
        const start = parseDateParam(startDate, false);
        const end = parseDateParam(endDate, true);

        if (start || end) {
            matchFilter.createdAt = {};
            if (start) matchFilter.createdAt.$gte = start;
            if (end) matchFilter.createdAt.$lte = end;
        }

        if (paymentMethod && paymentMethod.toLowerCase() !== 'all') {
            matchFilter.paymentMethod = paymentMethod.toLowerCase();
        }

        // 2. Query Transaksi beserta Relasi Kasir (Urutkan secara kronologis untuk analisis tren)
        const transactions = await Transactions.find(matchFilter)
            .populate('cashierId', 'name email')
            .sort({ createdAt: 1, _id: 1 })
            .lean();

        // 3. Flattening Data ke Tingkat Item (Item-Level Granularity)
        const flatRows = flattenTransactionsToRows(transactions);

        // 4. Bangun Workbook ExcelJS (Pure Raw Tabular Data, Freeze Panes, AutoFilter, Auto Width)
        const workbook = buildRawTransactionsWorkbook(flatRows);

        // 5. Susun Nama File Excel
        const fileName = generateExcelFileName(startDate, endDate);

        // 6. Set HTTP Response Headers untuk Streaming Download File Excel
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${fileName}"`
        );
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // 7. Tulis ke Stream Response
        await workbook.xlsx.write(res);
        return res.end();
    } catch (error) {
        console.error('[Export Raw Transactions Excel Error]:', error);
        if (!res.headersSent) {
            return response(
                res,
                500,
                `Gagal mengekspor data mentah transaksi ke Excel: ${error.message}`,
                null
            );
        }
        return next(error);
    }
};

export default {
    exportRawTransactionsExcel,
};
