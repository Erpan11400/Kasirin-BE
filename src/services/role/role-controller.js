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
        const { name, isSystemRole, permissions } = req.body;

        // 1. Cek apakah nama role sudah diisi
        if (!name) return response(res, 400, 'Nama role wajib di-isi')

        // 2. Cek apakah nama role sudah ada di database (karena unique: true)
        const existingRole = await Role.findOne({ name: name.trim() });
        if (existingRole) return response(res, 400, 'Nama role sudah ada')

        // 3. Buat role baru
        const newRole = await Role.create({ name, isSystemRole, permissions });

        // 4. Kirim respon sukses
        return response(res, 201, 'Role Created Success', { id: newRole.id })
    } catch (error) {
        // Penanganan error Mongoose Validation
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((val) => val.message);
            return response(res, 400, messages)
        }

        // Penanganan error server/database lainnya
        return next(error)
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