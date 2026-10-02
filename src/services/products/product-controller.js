import InvariantError from "../../exceptions/invariant-error.js"
import NotFoundError from "../../exceptions/not-found-error.js"
import Categories from "../../models/Categories.js"
import Product from "../../models/Products.js"
import response from "../../utils/response.js"

export const createProducts = async (req, res, next) => {
    try {
        const { name, price, stock, image, categoryId } = req.body
        if (!name || price === 0) return next(new InvariantError("Nama dan Harga wajib diisi"))

        const existProduct = await Product.findOne({ name })
        if (existProduct) return next(new InvariantError("Produk sudah ada"))

        const existCategory = await Categories.findById(categoryId)
        if (!existCategory) return next(new NotFoundError("Kategori tidak ditemukan"))

        const newProduct = await Product.create({
            name,
            price,
            stock,
            image,
            categoryId
        })

        return response(res, 201, "Produk berhasil ditambahkan", { id: newProduct._id })

    } catch (error) {
        return next(error)
    }
}

export const getAllProducts = async (req, res, next) => {
    try {
        const products = await Product.find().populate('categoryId', 'name')
        return response(res, 200, "Produk berhasil diambil", products)
    } catch (error) {
        return next(error)
    }
}

export const updateProducts = async (req, res, next) => {
    try {
        const { id } = req.params
        if(!id) return next(new InvariantError("ID produk wajib diisi"))

        const existProduct = await Product.findById(id)
        if (!existProduct) return next(new NotFoundError("Produk tidak ditemukan"))

        const { name, price, stock, image, categoryId } = req.body
        if (!name || price === 0) return next(new InvariantError("Nama dan Harga wajib diisi"))

        const existCategory = await Categories.findById(categoryId)
        if (!existCategory) return next(new InvariantError("Kategori tidak ditemukan"))

        await Product.updateOne({ _id: id }, {
            name,
            price,
            stock,
            image,
            categoryId
        })
        return response(res, 200, "Produk berhasil diupdate")
    } catch (error) {
        return next(error)
    }
}

export const deleteProducts = async (req, res, next) => {
    try {
        const { id } = req.params
        if (!id) return next(new InvariantError("ID produk wajib diisi"))

        const existProduct = await Product.findById(id)
        if (!existProduct) return next(new NotFoundError("Produk tidak ditemukan"))

        await Product.deleteOne({ _id: id })
        return response(res, 200, "Produk berhasil dihapus", { id: existProduct._id })
    } catch (error) {
        return next(error)
    }
}