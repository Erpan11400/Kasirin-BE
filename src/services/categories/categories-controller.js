import InvariantError from "../../exceptions/invariant-error.js";
import NotFoundError from "../../exceptions/not-found-error.js";
import response from "../../utils/response.js";
import Categories from "../../models/Categories.js";

export const createCategories = async (req, res, next) => {
    try {
        const { name, isActive } = req.body
        if (!name) return next(new InvariantError("Nama kategori wajib diisi"))

        const existingCategories = await Categories.findOne({ name: name.trim() })
        if (existingCategories) return next(new InvariantError("Nama kategori sudah digunakan"))

        const newCategories = await Categories.create({
            name: name.trim(),
            isActive: isActive !== undefined ? Boolean(isActive) : true,
        })

        return response(res, 201, 'Tambah kategori berhasil', { id: newCategories.id })
    } catch (error) {
        return next(error)
    }
}

export const getAllCategories = async (_, res, next) => {
    try {
        const categories = await Categories.find()
        return response(res, 200, 'Get all categories success', categories)
    } catch (error) {
        return next(error)
    }
}

export const updateCategories = async (req, res, next) => {
    try {
        const { id } = req.params
        if (!id) return next(new InvariantError("ID kategori wajib diisi"))
        const { name, isActive } = req.body
        if (!name && isActive === undefined) return next(new InvariantError("Data kategori yang diupdate wajib diisi"))

        const existingCategories = await Categories.findById(id)
        if (!existingCategories) return next(new NotFoundError("Kategori tidak ditemukan"))

        if (name !== undefined) {
            const trimmedName = name.trim()
            if (!trimmedName) return next(new InvariantError("Nama kategori wajib diisi"))

            if (trimmedName !== existingCategories.name) {
                const duplicateName = await Categories.findOne({ name: trimmedName, _id: { $ne: id } })
                if (duplicateName) return next(new InvariantError("Nama kategori sudah digunakan"))
            }
            existingCategories.name = trimmedName
        }

        if (isActive !== undefined) {
            existingCategories.isActive = Boolean(isActive)
        }

        await existingCategories.save()

        return response(res, 200, 'Kategori berhasil diupdate')
    } catch (error) {
        return next(error)
    }
}

export const deleteCategories = async (req, res, next) => {
    try {
        const { id } = req.params
        if (!id) return next(new InvariantError("ID kategori wajib diisi"))

        const existingCategory = await Categories.findById(id)
        if (!existingCategory) return next(new NotFoundError("Kategori tidak ditemukan"))

        existingCategory.isActive = false
        await existingCategory.save()

        return response(res, 200, 'Kategori berhasil dinonaktifkan')
    } catch (error) {
        return next(error)
    }
}