import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Nama kategori wajib diisi'],
            unique: true,
            trim: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model('Categories', categorySchema);