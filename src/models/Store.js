import mongoose from 'mongoose';

const storeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Nama toko wajib diisi'],
            trim: true,
        },
        businessCategory: {
            type: String,
            required: [true, 'Kategori bisnis wajib diisi'],
            trim: true,
        },
        phone: {
            type: String,
            required: [true, 'Nomor telepon toko wajib diisi'],
            trim: true,
        },
        address: {
            type: String,
            required: [true, 'Alamat toko wajib diisi'],
            trim: true,
        },
        imageUrl: {
            type: String,
            default: '',
        },
        footerNote: {
            type: String,
            default: '',
            trim: true,
        },
        showQris: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

export default mongoose.model('Store', storeSchema);