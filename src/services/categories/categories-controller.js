import InvariantError from "../../exceptions/invariant-error.js";
import NotFoundError from "../../exceptions/not-found-error.js";
import response from "../../utils/response.js";
import Categories from "../../models/Categories.js";

export const createCategories = async (req, res, next) => {
    try {
        const { name } = req.body
        if (!name) return next(new InvariantError("Nama kategori wajib diisi"))

        const existingCategories = await Categories.findOne({ name })
        if (existingCategories) return next(new InvariantError("Nama kategori sudah digunakan"))

        const newCategories = await Categories.create({
            name
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
        const { name } = req.body
        if (!name) return next(new InvariantError("Nama kategori wajib diisi"))

        const existingCategories = await Categories.findById(id)
        if (!existingCategories) return next(new NotFoundError("Kategori tidak ditemukan"))

        if (existingCategories.name === name) return next(new InvariantError("Nama kategori sudah digunakan"))

        existingCategories.name = name
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

        await Categories.deleteOne({ _id: id })
        return response(res, 200, 'Kategori berhasil dihapus')
    } catch (error) {
        return next(error)
    }
}