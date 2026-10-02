import mongoose from 'mongoose';

// Sub-schema untuk aksi modul (view, create, update, delete)
const modulePermissionSchema = new mongoose.Schema(
    {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
    },
    { _id: false }
);

const roleSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Nama role wajib diisi'],
            unique: true,
            trim: true, // Contoh: "Administrator", "Kasir", "Manajer Toko"
        },
        isSystemRole: {
            type: Boolean,
            default: false, // Role bawaan sistem (Admin) tidak bisa dihapus
        },
        // Matriks Hak Akses Berdasarkan Modul
        permissions: {
            categories: modulePermissionSchema,
            products: modulePermissionSchema,
            store: modulePermissionSchema,
            transactions: modulePermissionSchema,
            roles: modulePermissionSchema,
            users: modulePermissionSchema,
        },
    },
    { timestamps: true }
);

export default mongoose.model('Roles', roleSchema);