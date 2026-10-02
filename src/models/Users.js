import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Nama user wajib diisi'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Email wajib diisi'],
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: [true, 'Password wajib diisi'],
            select: false, // Menjaga agar password hashed tidak otomatis ikut saat query GET
        },
        roleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Roles',
            required: [true, 'Role user wajib dipilih'],
        },
        isActive: {
            type: Boolean,
            default: true, // Soft-delete / pembekuan akun
        },
    },
    { timestamps: true }
);

export default mongoose.model('Users', userSchema);