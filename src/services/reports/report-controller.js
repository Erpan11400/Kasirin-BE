import Store from '../../models/Store.js';
import Transactions from '../../models/Transactions.js';
import InvariantError from '../../exceptions/invariant-error.js';
import { generatePdfFromHtml } from './pdf-generator.service.js';
import { generateReportHtml } from './report-template.js';

const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const formatDayDate = (date) => {
    try {
        if (!date) return '-';
        let dateObj;
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            const [year, month, day] = date.split('-').map(Number);
            dateObj = new Date(year, month - 1, day);
        } else {
            dateObj = new Date(date);
        }
        if (isNaN(dateObj.getTime())) return typeof date === 'string' ? date : '-';
        const dayName = dayNames[dateObj.getDay()];
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        return `${dayName}, ${dd}/${mm}/${year}`;
    } catch {
        return typeof date === 'string' ? date : '-';
    }
};

const formatMonthPeriod = (periodStr) => {
    try {
        const [yearStr, monthStr] = periodStr.split('-');
        const y = parseInt(yearStr, 10);
        const mIdx = parseInt(monthStr, 10) - 1;
        const mName = monthNames[mIdx] || monthStr;
        return `${mName} ${y}`;
    } catch {
        return periodStr;
    }
};

/**
 * Controller untuk Export Laporan ke format PDF (Direct Download)
 * Mendukung pemanggilan via GET (query params) atau POST (body json)
 */
export const exportReportPdf = async (req, res, next) => {
    try {
        // Ambil parameter dari query (GET) atau body (POST)
        const params = req.method === 'POST' ? req.body : req.query;

        const type = (params.type || 'transaksi').toLowerCase();
        const validTypes = ['transaksi', 'harian', 'bulanan'];
        if (!validTypes.includes(type)) {
            return next(new InvariantError("Parameter 'type' harus salah satu dari: 'transaksi', 'harian', 'bulanan'"));
        }

        const {
            startDate,
            endDate,
            paymentMethod,
            approverName,
            customNotes,
            operatorName,
            creatorName,
            reporterName,
            createdBy,
        } = params;

        const orientation = (params.orientation || 'portrait').toLowerCase() === 'landscape' ? 'landscape' : 'portrait';
        const showSignatures = params.showSignatures !== false && params.showSignatures !== 'false' && params.showSignatures !== '0';
        const showKpis = params.showKpis !== false && params.showKpis !== 'false' && params.showKpis !== '0';

        // 1. Ambil data Toko aktif
        let store = await Store.findOne();
        if (!store) {
            store = {
                name: "KasirIn Store",
                businessCategory: "Retail",
                phone: "081234567890",
                address: "Jl. Utama No. 1",
                imageUrl: "",
                footerNote: "Terima kasih atas kunjungan Anda!",
            };
        }

        // 2. Susun Filter Transaksi Tanggal & Metode Bayar
        const matchFilter = {};

        if (startDate || endDate) {
            matchFilter.createdAt = {};

            if (startDate) {
                const start = new Date(startDate);
                if (!isNaN(start.getTime())) {
                    start.setHours(0, 0, 0, 0);
                    matchFilter.createdAt.$gte = start;
                }
            }

            if (endDate) {
                const end = new Date(endDate);
                if (!isNaN(end.getTime())) {
                    end.setHours(23, 59, 59, 999);
                    matchFilter.createdAt.$lte = end;
                }
            }
        }

        if (paymentMethod && paymentMethod.toLowerCase() !== 'all') {
            matchFilter.paymentMethod = paymentMethod.toLowerCase();
        }

        // Timezone calculation (+07:00 WIB dsb)
        const timezoneOffsetMinutes = -new Date().getTimezoneOffset();
        const sign = timezoneOffsetMinutes >= 0 ? '+' : '-';
        const hours = String(Math.floor(Math.abs(timezoneOffsetMinutes) / 60)).padStart(2, '0');
        const minutes = String(Math.abs(timezoneOffsetMinutes) % 60).padStart(2, '0');
        const timezoneString = `${sign}${hours}:${minutes}`;

        // 3. Query & Agregasi Data Sesuai Type
        let reportData = [];
        let summary = {
            totalRevenue: 0,
            totalTransactions: 0,
            totalItems: 0,
            aov: 0,
            breakdown: {
                cash: { count: 0, total: 0 },
                qris: { count: 0, total: 0 },
                transfer: { count: 0, total: 0 },
            },
        };

        // Hitung rekap KPI keseluruhan untuk periode ini
        const allTransactions = await Transactions.find(matchFilter)
            .populate('cashierId', 'name email')
            .sort({ createdAt: -1 })
            .lean();

        summary.totalTransactions = allTransactions.length;
        allTransactions.forEach((trx) => {
            const amount = trx.totalAmount || 0;
            summary.totalRevenue += amount;

            const itemsCount = (trx.items || []).reduce((acc, curr) => acc + (curr.quantity || 0), 0);
            summary.totalItems += itemsCount;

            const method = (trx.paymentMethod || '').toLowerCase();
            if (summary.breakdown[method]) {
                summary.breakdown[method].count += 1;
                summary.breakdown[method].total += amount;
            }
        });

        summary.aov = summary.totalTransactions > 0 
            ? Math.round(summary.totalRevenue / summary.totalTransactions) 
            : 0;

        // Susun detail data berdasarkan tipe laporan
        if (type === 'transaksi') {
            reportData = allTransactions.map((trx) => ({
                invoiceNumber: trx.invoiceNumber,
                createdAt: trx.createdAt,
                cashierName: trx.cashierId?.name || 'Kasir',
                paymentMethod: trx.paymentMethod,
                items: trx.items || [],
                totalAmount: trx.totalAmount,
            }));
        } else if (type === 'harian') {
            const dailyStats = await Transactions.aggregate([
                { $match: matchFilter },
                {
                    $project: {
                        dayDate: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$createdAt",
                                timezone: timezoneString,
                            },
                        },
                        totalAmount: 1,
                        paymentMethod: 1,
                        items: 1,
                    },
                },
                {
                    $group: {
                        _id: "$dayDate",
                        trxCount: { $sum: 1 },
                        totalRevenue: { $sum: "$totalAmount" },
                        paymentMethods: { $push: "$paymentMethod" },
                        allItems: { $push: "$items" },
                    },
                },
                { $sort: { _id: -1 } },
            ]);

            const methodDisplayMap = { cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer' };

            reportData = dailyStats.map((day) => {
                const methodCount = {};
                (day.paymentMethods || []).forEach((m) => {
                    methodCount[m] = (methodCount[m] || 0) + 1;
                });

                let dominantKey = '';
                let maxCount = 0;
                for (const [m, c] of Object.entries(methodCount)) {
                    if (c > maxCount) {
                        maxCount = c;
                        dominantKey = m;
                    }
                }
                const percentage = day.trxCount > 0 ? Math.round((maxCount / day.trxCount) * 100) : 0;

                const productSalesMap = {};
                (day.allItems || []).flat().forEach((item) => {
                    if (!item) return;
                    const pId = String(item.productId || item.productName);
                    if (!productSalesMap[pId]) {
                        productSalesMap[pId] = { productName: item.productName || '', quantity: 0 };
                    }
                    productSalesMap[pId].quantity += item.quantity || 0;
                });

                const productSales = Object.values(productSalesMap).sort((a, b) => b.quantity - a.quantity);

                return {
                    dayDate: formatDayDate(day._id),
                    trxCount: day.trxCount,
                    totalRevenue: day.totalRevenue,
                    dominantMethod: {
                        type: methodDisplayMap[dominantKey] || dominantKey || '-',
                        percentage,
                    },
                    productSales,
                };
            });
        } else if (type === 'bulanan') {
            const monthlyStats = await Transactions.aggregate([
                { $match: matchFilter },
                {
                    $project: {
                        monthPeriod: {
                            $dateToString: {
                                format: "%Y-%m",
                                date: "$createdAt",
                                timezone: timezoneString,
                            },
                        },
                        totalAmount: 1,
                        items: 1,
                    },
                },
                {
                    $group: {
                        _id: "$monthPeriod",
                        trxCount: { $sum: 1 },
                        grossRevenue: { $sum: "$totalAmount" },
                        allItems: { $push: "$items" },
                    },
                },
                { $sort: { _id: -1 } },
            ]);

            const now = new Date();
            const currentPeriodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            reportData = monthlyStats.map((month) => {
                const productSalesMap = {};
                (month.allItems || []).flat().forEach((item) => {
                    if (!item) return;
                    const pId = String(item.productId || item.productName);
                    if (!productSalesMap[pId]) {
                        productSalesMap[pId] = { productName: item.productName || '', quantity: 0 };
                    }
                    productSalesMap[pId].quantity += item.quantity || 0;
                });

                const productSales = Object.values(productSalesMap).sort((a, b) => b.quantity - a.quantity);

                return {
                    period: formatMonthPeriod(month._id),
                    isCurrent: month._id === currentPeriodKey,
                    trxCount: month.trxCount,
                    grossRevenue: month.grossRevenue,
                    productSales,
                };
            });
        }

        // 4. Susun Label Periode & Teks Metadata
        let periodLabel = 'Semua Periode';
        if (startDate && endDate) {
            periodLabel = `${startDate} s/d ${endDate}`;
        } else if (startDate) {
            periodLabel = `Sejak ${startDate}`;
        } else if (endDate) {
            periodLabel = `Hingga ${endDate}`;
        }

        const typeTitleMap = {
            transaksi: 'LAPORAN RINCIAN TRANSAKSI PENJUALAN',
            harian: 'LAPORAN REKAPITULASI PENJUALAN HARIAN',
            bulanan: 'LAPORAN REKAPITULASI PENJUALAN BULANAN',
        };

        const paymentLabelMap = {
            all: 'Semua Metode',
            cash: 'Tunai',
            qris: 'QRIS',
            transfer: 'Transfer',
        };

        const meta = {
            type,
            reportTitle: typeTitleMap[type] || 'LAPORAN PENJUALAN',
            periodLabel,
            paymentMethodLabel: paymentLabelMap[paymentMethod?.toLowerCase()] || (paymentMethod ? paymentMethod.toUpperCase() : 'Semua Metode'),
            orientation,
            showSignatures,
            showKpis,
            approverName: approverName || '',
            printedBy: operatorName || creatorName || reporterName || createdBy || req.user?.name || 'Admin Kasir',
            customNotes: customNotes || '',
        };

        // 5. Generate Dokumen HTML
        const html = generateReportHtml({
            store,
            meta,
            summary,
            data: reportData,
        });

        // 6. Generate Binary Buffer PDF via Puppeteer
        const pdfBuffer = await generatePdfFromHtml({
            html,
            orientation,
        });

        // 7. Siapkan Format Nama File untuk Direct Download
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const fileName = `Laporan_${type.charAt(0).toUpperCase() + type.slice(1)}_${dateStr}.pdf`;

        // 8. Kirim Response Headers untuk Direct Download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        return res.end(pdfBuffer);
    } catch (error) {
        console.error('[Export Report PDF Error]:', error);
        return next(error);
    }
};

export default {
    exportReportPdf,
};
