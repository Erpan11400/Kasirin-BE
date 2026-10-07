import User from "../../models/Users.js";
import response from "../../utils/response.js";
import bcrypt from "bcrypt"

// Controller untuk user
export const createUser = async (req, res, next) => {
    try {
        const { name, email, password, roleId } = req.body;

        if (!name || !email || !password || !roleId) {
            return response(res, 400, 'Semua field wajib diisi')
        }

        if (!email.includes('@')) return response(res, 400, 'Format email tidak valid')

        const existingUser = await User.findOne({ email })
        if (existingUser) return response(res, 400, 'Email sudah digunakan')

        const hashedPass = await bcrypt.hash(password, 10);

        const newUser = await User.create({ name, email, password: hashedPass, roleId });
        return response(res, 201, 'User Created Success', { id: newUser.id });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((val) => val.message);
            return response(res, 400, messages)
        }
        return next(error)
    }
}

export const getAllUser = async (_, res, next) => {
    try {
        const users = await User.find();
        return response(res, 200, 'Get All User Success', users)
    } catch (error) {
        return next(error)
    }
}

export const deleteUser = async (req, res, next) => {
    const { id } = req.params;

    if (!id) return response(res, 400, 'User ID is required')

    const checkUser = await User.findById(id)
    if (!checkUser) return response(res, 400, 'User is not found')

    try {
        await User.deleteOne({ _id: id })

        return response(res, 200, 'User Deleted Successfully')
    } catch (error) {
        return next(error)
    }
}

export const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, email, password, roleId, isActive } = req.body;

        if (!id) return response(res, 400, 'User ID is required');

        const user = await User.findById(id);
        if (!user) return response(res, 404, 'User is not found');

        const updateData = {};

        if (name !== undefined) updateData.name = name;
        if (roleId !== undefined) updateData.roleId = roleId;
        if (isActive !== undefined) updateData.isActive = isActive;

        if (email !== undefined) {
            if (!email.includes('@')) {
                return response(res, 400, 'Format email tidak valid');
            }
            const existingEmail = await User.findOne({ email, _id: { $ne: id } });
            if (existingEmail) {
                return response(res, 400, 'Email sudah digunakan');
            }
            updateData.email = email;
        }

        // Jika password dikirimkan dan tidak kosong, hash password baru
        if (password && password.trim() !== '') {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const updatedUser = await User.findByIdAndUpdate(id, updateData, {
            returnDocument: 'after',
            runValidators: true,
        });

        return response(res, 200, 'User Updated Successfully', { id: updatedUser._id });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((val) => val.message);
            return response(res, 400, messages);
        }
        return next(error);
    }
};

