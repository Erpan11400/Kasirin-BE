import mongoose from 'mongoose';
import Store from '../../../models/Store.js';
import Transactions from '../../../models/Transactions.js';
import InvariantError from '../../../exceptions/invariant-error.js';
import NotFoundError from '../../../exceptions/not-found-error.js';
import { generateThermalReceiptPdf } from './receipt-pdf.service.js';
import { generateThermalReceiptHtml } from './receipt-template.js';

/**
 * Controller untuk Mengekspor dan Mengunduh Struk Transaksi (Receipt)
 * dalam format PDF Kertas Thermal Kasir (58mm / 80mm)
 * 
 * Mendukung POST (body JSON) dan GET (query parameters)
 */
export const exportReceiptPdf = async (req, res, next) => {
    try {
        const params = req.method === 'POST' ? req.body : req.query;
        const {
            transactionId,
            paperWidth = '80mm',
            cashierName,
            customNotes,
        } = params;

        // 1. Validasi Keberadaan transactionId
        if (!transactionId || !String(transactionId).trim()) {
            return next(new InvariantError("transactionId wajib disertakan dalam request body"));
        }

        const cleanId = String(transactionId).trim();
        const normalizedPaperWidth = String(paperWidth).toLowerCase().trim() === '58mm' ? '58mm' : '80mm';

        // 2. Query Transaksi (Mendukung ObjectId maupun invoiceNumber)
        const isObjectId = mongoose.Types.ObjectId.isValid(cleanId);
        const query = isObjectId
            ? { $or: [{ _id: cleanId }, { invoiceNumber: cleanId }] }
            : { invoiceNumber: cleanId };

        const transaction = await Transactions.findOne(query).populate('cashierId', 'name username email');

        if (!transaction) {
            return next(new NotFoundError("Transaksi tidak ditemukan"));
        }

        // 3. Query Profil Toko / Outlet Aktif
        let store = await Store.findOne();
        if (!store) {
            store = {
                name: "KasirIn Store",
                businessCategory: "Retail",
                phone: "081234567890",
                address: "Jl. Utama No. 1",
                imageUrl: "",
                footerNote: "Terima kasih atas kunjungan Anda!",
                showQris: false,
            };
        }

        // 4. Render HTML Template Struk Thermal
        const html = generateThermalReceiptHtml({
            transaction,
            store,
            paperWidth: normalizedPaperWidth,
            cashierOverride: cashierName,
            customNotes,
        });

        // 5. Generate Buffer PDF Thermal Roll via Puppeteer
        const pdfBuffer = await generateThermalReceiptPdf({
            html,
            paperWidth: normalizedPaperWidth,
        });

        // 6. Set Header Response & Stream File Binary PDF
        const safeInvoice = (transaction.invoiceNumber || 'Transaksi').replace(/[^a-zA-Z0-9-_]/g, '_');
        const fileName = `Struk_${safeInvoice}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        return res.end(pdfBuffer);
    } catch (error) {
        console.error('[Export Receipt PDF Error]:', error);
        return next(error);
    }
};

export default {
    exportReceiptPdf,
};

