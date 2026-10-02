import { Router } from 'express';
import bcrypt from 'bcrypt';
import Role from '../../models/Roles.js';
import User from '../../models/Users.js';
import response from '../../utils/response.js';

const router = Router();

export const adminRoleData = {
    name: 'Admin',
    isSystemRole: true,
    permissions: {
        categories: {
            view: true,
            create: true,
            update: true,
            delete: true,
        },
        products: {
            view: true,
            create: true,
            update: true,
            delete: true,
        },
        store: {
            view: true,
            create: true,
            update: true,
            delete: true,
        },
        transactions: {
            view: true,
            create: true,
            update: true,
            delete: true,
        },
        roles: {
            view: true,
            create: true,
            update: true,
            delete: true,
        },
        users: {
            view: true,
            create: true,
            update: true,
            delete: true,
        },
    },
};

router.post('/', async (req, res, next) => {
    try {
        // 1. Inisialisasi Role Admin (Create jika belum ada, Update jika sudah ada)
        let adminRole = await Role.findOne({ name: adminRoleData.name });

        if (!adminRole) {
            adminRole = await Role.create(adminRoleData);
        } else {
            adminRole = await Role.findOneAndUpdate(
                { name: adminRoleData.name },
                { $set: adminRoleData },
                { new: true }
            );
        }

        // 2. Inisialisasi User Admin default (bisa custom via req.body)
        const name = req.body?.name || 'Administrator';
        const email = req.body?.email || 'admin@kasirin.com';
        const rawPassword = req.body?.password || 'admin123';

        let adminUser = await User.findOne({ email });

        if (!adminUser) {
            const hashedPassword = await bcrypt.hash(rawPassword, 10);
            adminUser = await User.create({
                name,
                email,
                password: hashedPassword,
                roleId: adminRole._id,
                isActive: true,
            });
        } else {
            // Pastikan roleId user mengarah ke role Admin yang valid
            adminUser.roleId = adminRole._id;
            adminUser.isActive = true;
            await adminUser.save();
        }

        return response(res, 201, 'Inisialisasi Role Admin dan Pengguna berhasil', {
            role: {
                id: adminRole._id,
                name: adminRole.name,
                isSystemRole: adminRole.isSystemRole,
                permissions: adminRole.permissions,
            },
            user: {
                id: adminUser._id,
                name: adminUser.name,
                email: adminUser.email,
                roleId: adminUser.roleId,
                isActive: adminUser.isActive,
                defaultPassword: rawPassword, // Sebagai informasi saat inisialisasi awal
            },
        });
    } catch (error) {
        return next(error);
    }
});

export default router;