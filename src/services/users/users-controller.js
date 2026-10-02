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
