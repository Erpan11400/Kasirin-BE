import Role from '../../models/Roles.js'
import response from '../../utils/response.js';

export const getAllRole = async (_, res, next) => {
    try {
        const roles = await Role.find()
        return response(res, 200, 'Get All Role Success', roles)
    } catch (error) {
        return next(error)
    }
}

export const createRole = async (req, res, next) => {
    try {
        const { name, description, isSystemRole, permissions } = req.body;

        // 1. Cek apakah nama role sudah diisi
        if (!name) return response(res, 400, 'Nama role wajib di-isi')

        // 2. Cek apakah nama role sudah ada di database (karena unique: true)
        const existingRole = await Role.findOne({ name: name.trim() });
        if (existingRole) return response(res, 400, 'Nama role sudah ada')

        // 3. Buat role baru
        const newRole = await Role.create({ name, description, isSystemRole, permissions });

        // 4. Kirim respon sukses
        return response(res, 201, 'Role Created Success', { id: newRole.id })
    } catch (error) {
        // Penanganan error Mongoose Validation
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((val) => val.message);
            return response(res, 400, messages)
        }

        // Penanganan error server/database lainnya
        return next(error);
    }
};

export const updateRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, isSystemRole, permissions } = req.body;

        if (!id) return response(res, 400, 'Id role wajib diisi');

        const role = await Role.findById(id);
        if (!role) return response(res, 404, 'Role tidak ditemukan');

        // 1. Cek jika nama diubah dan apakah sudah ada di database
        if (name && name.trim() !== role.name) {
            const existingRole = await Role.findOne({ name: name.trim(), _id: { $ne: id } });
            if (existingRole) return response(res, 400, 'Nama role sudah ada');
            role.name = name.trim();
        }

        // 2. Update description jika ada
        if (description !== undefined) {
            role.description = description;
        }

        // 3. Update isSystemRole jika ada
        if (typeof isSystemRole === 'boolean') {
            role.isSystemRole = isSystemRole;
        }

        // 4. Update permissions jika ada
        if (permissions) {
            role.permissions = {
                ...(role.permissions?.toObject?.() || role.permissions || {}),
                ...permissions,
            };
            role.markModified('permissions');
        }

        // 5. Simpan perubahan
        const updatedRole = await role.save();

        return response(res, 200, 'Role berhasil diperbarui', updatedRole);
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((val) => val.message);
            return response(res, 400, messages);
        }

        return next(error);
    }
};


export const deleteRole = async (req, res, next) => {
    const { id } = req.params

    if (!id) return response(res, 400, 'Id is required')

    const role = await Role.findById(id)
    if (!role) return response(res, 404, 'Role not found')

    if (role.isSystemRole) return response(res, 400, 'System role cannot be deleted')

    try {
        await Role.findByIdAndDelete(id)
        return response(res, 200, 'Role deleted successfully')
    } catch (error) {
        return next(error)
    }
}