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

export const createTransaction = async (req, res, next) => {
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
