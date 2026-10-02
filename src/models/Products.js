import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Nama produk wajib diisi'],
            trim: true,
        },
        price: {
            type: Number,
            required: [true, 'Harga produk wajib diisi'],
            min: [0, 'Harga tidak boleh negatif'],
        },
        stock: {
            type: Number,
            required: [true, 'Stok produk wajib diisi'],
            min: [0, 'Stok tidak boleh negatif'],
            default: 0,
        },
        imageUrl: {
            type: String,
            default: '',
        },
        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Categories',
            required: [true, 'Kategori produk wajib dipilih'],
        },
    },
    { timestamps: true }
);

export default mongoose.model('Products', productSchema);