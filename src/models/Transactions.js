import mongoose from 'mongoose';

const transactionItemSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        productName: {
            type: String,
            required: true, // Snapshot nama produk saat transaksi
        },
        price: {
            type: Number,
            required: true, // Snapshot harga satuan produk saat transaksi
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, 'Kuantitas minimal 1'],
        },
        subtotal: {
            type: Number,
            required: true, // quantity * price
        },
    },
    { _id: false }
);

const transactionSchema = new mongoose.Schema(
    {
        invoiceNumber: {
            type: String,
            required: true,
            unique: true, // Contoh: INV-20260907-001
        },
        items: [transactionItemSchema],
        totalAmount: {
            type: Number,
            required: true,
        },
        paymentMethod: {
            type: String,
            enum: ['cash', 'qris', 'transfer'],
            required: true,
        },
        paidAmount: {
            type: Number,
            required: true, // Nominal uang yang dibayarkan
        },
        changeAmount: {
            type: Number,
            required: true, // Kembalian (paidAmount - totalAmount)
        },
        cashierId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Users',
            required: true, // Petugas kasir yang melayani
        },
    },
    { timestamps: true }
);

export default mongoose.model('Transactions', transactionSchema);