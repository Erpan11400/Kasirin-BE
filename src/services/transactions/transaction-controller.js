import InvariantError from "../../exceptions/invariant-error.js";
import NotFoundError from "../../exceptions/not-found-error.js";
import AuthenticationError from "../../exceptions/authentication-error.js";
import Products from "../../models/Products.js";
import Transactions from "../../models/Transactions.js";
import response from "../../utils/response.js";

const generateInvoiceNumber = async () => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `INV-${dateStr}-`;

    const lastTransaction = await Transactions.findOne({
        invoiceNumber: { $regex: `^${prefix}` }
    }).sort({ invoiceNumber: -1 });

    let nextNumber = 1;
    if (lastTransaction && lastTransaction.invoiceNumber) {
        const parts = lastTransaction.invoiceNumber.split('-');
        const lastSequence = parseInt(parts[2], 10);
        if (!isNaN(lastSequence)) {
            nextNumber = lastSequence + 1;
        }
    }

    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
};

const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

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


export const createTransactions = async (req, res, next) => {
    try {
        const { items, paymentMethod, paidAmount } = req.body;
        const cashierId = req.user?.id;

        if (!cashierId) {
            return next(new AuthenticationError("Kasir tidak teridentifikasi. Silakan login kembali"));
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return next(new InvariantError("Daftar item transaksi wajib diisi"));
        }

        const validPaymentMethods = ['cash', 'qris', 'transfer'];
        if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
            return next(new InvariantError("Metode pembayaran harus salah satu dari: cash, qris, transfer"));
        }

        if (paidAmount === undefined || paidAmount === null || typeof paidAmount !== 'number' || paidAmount < 0) {
            return next(new InvariantError("Nominal pembayaran harus berupa angka dan tidak boleh negatif"));
        }

        const processedItems = [];
        let totalAmount = 0;

        // Validasi ketersediaan produk & stok
        for (const item of items) {
            if (!item.productId) {
                return next(new InvariantError("ID produk pada setiap item transaksi wajib diisi"));
            }

            const quantity = parseInt(item.quantity, 10);
            if (!quantity || quantity < 1) {
                return next(new InvariantError("Kuantitas setiap produk minimal 1"));
            }

            const product = await Products.findById(item.productId);
            if (!product) {
                return next(new NotFoundError(`Produk dengan ID ${item.productId} tidak ditemukan`));
            }

            if (product.isActive === false) {
                return next(new InvariantError(`Produk "${product.name}" saat ini tidak aktif`));
            }

            if (product.stock < quantity) {
                return next(new InvariantError(`Stok produk "${product.name}" tidak mencukupi (Tersisa: ${product.stock}, diminta: ${quantity})`));
            }

            const subtotal = product.price * quantity;
            totalAmount += subtotal;

            processedItems.push({
                productId: product._id,
                productName: product.name,
                price: product.price,
                quantity,
                subtotal,
            });
        }

        if (paidAmount < totalAmount) {
            return next(new InvariantError(`Nominal pembayaran kurang. Total tagihan: ${totalAmount}, dibayarkan: ${paidAmount}`));
        }

        const changeAmount = paidAmount - totalAmount;
        const invoiceNumber = await generateInvoiceNumber();

        // Kurangi stok masing-masing produk
        for (const item of processedItems) {
            await Products.findByIdAndUpdate(item.productId, {
                $inc: { stock: -item.quantity },
            });
        }

        // Simpan transaksi
        const newTransaction = await Transactions.create({
            invoiceNumber,
            items: processedItems,
            totalAmount,
            paymentMethod,
            paidAmount,
            changeAmount,
            cashierId,
        });

        const result = await Transactions.findById(newTransaction._id).populate('cashierId', 'name email');

        return response(res, 201, "Transaksi berhasil dibuat", result);
    } catch (error) {
        return next(error);
    }
};

export const getKPI = async (_, res, next) => {
    try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-based: 0 = Januari, 11 = Desember

        // Rentang waktu bulan ini yang sedang berjalan (tanggal 1 s/d akhir bulan ini)
        const startOfMonth = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

        // Rentang waktu bulan lalu untuk pembanding (tanggal 1 s/d akhir bulan lalu)
        const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0);
        const endOfLastMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

        // Aggregation bulan ini: Total Pendapatan, Total Transaksi, Top Produk, & Total Item Terjual
        const currentMonthStats = await Transactions.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfMonth, $lte: endOfMonth },
                },
            },
            {
                $facet: {
                    totals: [
                        {
                            $group: {
                                _id: null,
                                totalRevenue: { $sum: "$totalAmount" },
                                totalTransactions: { $sum: 1 },
                            },
                        },
                    ],
                    topProduct: [
                        { $unwind: "$items" },
                        {
                            $group: {
                                _id: "$items.productId",
                                productName: { $first: "$items.productName" },
                                totalSold: { $sum: "$items.quantity" },
                            },
                        },
                        { $sort: { totalSold: -1 } },
                        { $limit: 1 },
                    ],
                    totalItems: [
                        { $unwind: "$items" },
                        {
                            $group: {
                                _id: null,
                                totalItemsSold: { $sum: "$items.quantity" },
                            },
                        },
                    ],
                },
            },
        ]);

        // Aggregation bulan lalu: Total Pendapatan & Total Transaksi
        const lastMonthStats = await Transactions.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
                },
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$totalAmount" },
                    totalTransactions: { $sum: 1 },
                },
            },
        ]);

        const facetResult = currentMonthStats[0] || {};
        const currentTotals = facetResult.totals?.[0] || { totalRevenue: 0, totalTransactions: 0 };
        const topProductStat = facetResult.topProduct?.[0] || null;
        const totalItemsSold = facetResult.totalItems?.[0]?.totalItemsSold || 0;

        const lastMonthTotals = lastMonthStats[0] || { totalRevenue: 0, totalTransactions: 0 };

        const totalRevenue = currentTotals.totalRevenue || 0;
        const totalTransactions = currentTotals.totalTransactions || 0;
        const lastMonthRevenue = lastMonthTotals.totalRevenue || 0;
        const lastMonthTransactions = lastMonthTotals.totalTransactions || 0;

        // Card 1: Total Pendapatan & Pertumbuhan vs Bulan Lalu
        const revenueDifference = totalRevenue - lastMonthRevenue;
        let revenueGrowthPercentage = 0;
        if (lastMonthRevenue > 0) {
            revenueGrowthPercentage = Number((((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1));
        } else if (totalRevenue > 0) {
            revenueGrowthPercentage = 100;
        }

        // Card 2: Total Transaksi
        const transactionDifference = totalTransactions - lastMonthTransactions;
        let transactionGrowthPercentage = 0;
        if (lastMonthTransactions > 0) {
            transactionGrowthPercentage = Number((((totalTransactions - lastMonthTransactions) / lastMonthTransactions) * 100).toFixed(1));
        } else if (totalTransactions > 0) {
            transactionGrowthPercentage = 100;
        }

        // Card 4: Nilai Rata-rata Belanja (AOV - Average Order Value)
        const currentAverage = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;
        const lastMonthAverage = lastMonthTransactions > 0 ? Math.round(lastMonthRevenue / lastMonthTransactions) : 0;
        const aovDifference = currentAverage - lastMonthAverage;

        const kpiData = {
            revenue: {
                total: totalRevenue,
                lastMonth: lastMonthRevenue,
                difference: revenueDifference,
                growthPercentage: revenueGrowthPercentage,
            },
            transactions: {
                total: totalTransactions,
                lastMonth: lastMonthTransactions,
                difference: transactionDifference,
                growthPercentage: transactionGrowthPercentage,
                period: "Bulan Ini",
            },
            topProduct: {
                id: topProductStat?._id || null,
                name: topProductStat?.productName || "-",
                soldCount: topProductStat?.totalSold || 0,
                totalItemsSold,
            },
            aov: {
                currentAverage,
                difference: aovDifference,
            },
        };

        return response(res, 200, "Data KPI transaksi berhasil diambil", kpiData);
    } catch (error) {
        return next(error);
    }
};

export const getTransactions = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const filter = {};

        if (startDate || endDate) {
            filter.createdAt = {};

            if (startDate) {
                const start = new Date(startDate);
                if (!isNaN(start.getTime())) {
                    start.setHours(0, 0, 0, 0);
                    filter.createdAt.$gte = start;
                }
            }

            if (endDate) {
                const end = new Date(endDate);
                if (!isNaN(end.getTime())) {
                    end.setHours(23, 59, 59, 999);
                    filter.createdAt.$lte = end;
                }
            }
        }

        const transactions = await Transactions.find(filter)
            .populate('cashierId', 'name email')
            .sort({ createdAt: -1 })
            .lean();

        const formattedTransactions = transactions.map((trx) => {
            const { createdAt, updatedAt, created_at, updated_at, __v, ...rest } = trx;
            return {
                ...rest,
                dayDate: formatDayDate(createdAt || created_at),
                ...(__v !== undefined ? { __v } : {}),
            };
        });

        return response(res, 200, "Data transaksi berhasil diambil", formattedTransactions);
    } catch (error) {
        return next(error);
    }
};

export const getDailyTransactions = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const filter = {};

        if (startDate || endDate) {
            filter.createdAt = {};

            if (startDate) {
                const start = new Date(startDate);
                if (!isNaN(start.getTime())) {
                    start.setHours(0, 0, 0, 0);
                    filter.createdAt.$gte = start;
                }
            }

            if (endDate) {
                const end = new Date(endDate);
                if (!isNaN(end.getTime())) {
                    end.setHours(23, 59, 59, 999);
                    filter.createdAt.$lte = end;
                }
            }
        } else {
            // Default bulan berjalan jika query startDate & endDate tidak diberikan
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            filter.createdAt = { $gte: startOfMonth, $lte: endOfMonth };
        }

        // Tentukan timezone offset lokal server (misal: +07:00 untuk WIB)
        const timezoneOffsetMinutes = -new Date().getTimezoneOffset();
        const sign = timezoneOffsetMinutes >= 0 ? '+' : '-';
        const hours = String(Math.floor(Math.abs(timezoneOffsetMinutes) / 60)).padStart(2, '0');
        const minutes = String(Math.abs(timezoneOffsetMinutes) % 60).padStart(2, '0');
        const timezoneString = `${sign}${hours}:${minutes}`;

        const dailyStats = await Transactions.aggregate([
            {
                $match: filter,
            },
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
            {
                $sort: { _id: -1 }, // Urutkan tanggal terbaru ke terlama
            },
        ]);

        const methodDisplayMap = {
            cash: 'Tunai',
            qris: 'QRIS',
            transfer: 'Transfer',
        };


        const result = dailyStats.map((day) => {
            // 1. Hitung metode pembayaran dominan
            const methodCount = {};
            (day.paymentMethods || []).forEach((method) => {
                methodCount[method] = (methodCount[method] || 0) + 1;
            });

            let dominantTypeKey = '';
            let maxCount = 0;

            for (const [method, count] of Object.entries(methodCount)) {
                if (count > maxCount) {
                    maxCount = count;
                    dominantTypeKey = method;
                }
            }

            const totalTrx = day.trxCount || 0;
            const percentage = totalTrx > 0 ? Math.round((maxCount / totalTrx) * 100) : 0;
            const dominantType = methodDisplayMap[dominantTypeKey] || dominantTypeKey || '-';

            // 2. Rekap penjualan setiap produk (id produk, nama produk, & jumlah produk terjual)
            const productSalesMap = {};
            (day.allItems || []).flat().forEach((item) => {
                if (!item) return;
                const pId = String(item.productId || '');
                if (!pId) return;

                if (!productSalesMap[pId]) {
                    productSalesMap[pId] = {
                        productId: item.productId,
                        productName: item.productName || '',
                        quantity: 0,
                    };
                }
                productSalesMap[pId].quantity += item.quantity || 0;
            });

            // Urutkan produk dari kuantitas penjualan tertinggi
            const productSales = Object.values(productSalesMap).sort((a, b) => b.quantity - a.quantity);

            return {
                id: day._id, // Format: "2026-09-05"
                dayDate: formatDayDate(day._id), // Format: "Sabtu, 05/09/2026"
                trxCount: day.trxCount,
                productSales,
                dominantMethod: {
                    type: dominantType,
                    percentage,
                },
                totalRevenue: day.totalRevenue,
            };
        });

        return response(res, 200, "Data rekap harian transaksi berhasil diambil", result);
    } catch (error) {
        return next(error);
    }
};

export const getMonthlyTransactions = async (_, res, next) => {
    try {
        // Tentukan timezone offset lokal server (misal: +07:00 untuk WIB)
        const timezoneOffsetMinutes = -new Date().getTimezoneOffset();
        const sign = timezoneOffsetMinutes >= 0 ? '+' : '-';
        const hours = String(Math.floor(Math.abs(timezoneOffsetMinutes) / 60)).padStart(2, '0');
        const minutes = String(Math.abs(timezoneOffsetMinutes) % 60).padStart(2, '0');
        const timezoneString = `${sign}${hours}:${minutes}`;

        const monthlyStats = await Transactions.aggregate([
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
            {
                $sort: { _id: -1 }, // Urutkan dari bulan terbaru ke terlama
            },
        ]);

        const monthNames = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
        ];

        const formatPeriod = (periodStr) => {
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

        const now = new Date();
        const currentPeriodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const result = monthlyStats.map((month) => {
            // Rekap penjualan setiap produk dalam bulan ini
            const productSalesMap = {};
            (month.allItems || []).flat().forEach((item) => {
                if (!item) return;
                const pId = String(item.productId || '');
                if (!pId) return;

                if (!productSalesMap[pId]) {
                    productSalesMap[pId] = {
                        productId: item.productId,
                        productName: item.productName || '',
                        quantity: 0,
                    };
                }
                productSalesMap[pId].quantity += item.quantity || 0;
            });

            const productSales = Object.values(productSalesMap).sort((a, b) => b.quantity - a.quantity);

            return {
                id: month._id, // Format: "2026-09"
                period: formatPeriod(month._id), // Format: "September 2026"
                isCurrent: month._id === currentPeriodKey,
                trxCount: month.trxCount,
                productSales,
                grossRevenue: month.grossRevenue,
            };
        });

        return response(res, 200, "Data rekap bulanan transaksi berhasil diambil", result);
    } catch (error) {
        return next(error);
    }
};


