import InvariantError from "../../exceptions/invariant-error.js"
import NotFoundError from "../../exceptions/not-found-error.js"
import Categories from "../../models/Categories.js"
import Product from "../../models/Products.js"
import response from "../../utils/response.js"

export const createProducts = async (req, res, next) => {
    try {
        const { name, code, price, stock, unit, categoryId, isActive } = req.body
        if (!name || price === undefined || price === null || price < 0) {
            return next(new InvariantError("Nama dan Harga wajib diisi dengan benar"))
        }
        if (stock === undefined || stock === null || stock < 0) {
            return next(new InvariantError("Stok wajib diisi dengan benar"))
        }
        if (!categoryId) {
            return next(new InvariantError("Kategori produk wajib dipilih"))
        }

        const existProduct = await Product.findOne({ name: name.trim() })
        if (existProduct) return next(new InvariantError("Produk sudah ada"))

        if (code && code.trim() !== '') {
            const existCode = await Product.findOne({ code: code.trim() })
            if (existCode) return next(new InvariantError("Kode produk sudah digunakan"))
        }

        const existCategory = await Categories.findById(categoryId)
        if (!existCategory) return next(new NotFoundError("Kategori tidak ditemukan"))
        if (existCategory.isActive === false) return next(new InvariantError("Kategori yang dipilih tidak aktif"))

        const newProduct = await Product.create({
            name: name.trim(),
            code: code ? code.trim() : '',
            price,
            stock,
            unit: unit ? unit.trim() : 'pcs',
            categoryId,
            isActive: isActive !== undefined ? Boolean(isActive) : true,
        })

        return response(res, 201, "Produk berhasil ditambahkan", { id: newProduct._id })

    } catch (error) {
        return next(error)
    }
}

export const getAllProducts = async (_, res, next) => {
    try {
        const products = await Product.find().populate('categoryId', 'name isActive')
        return response(res, 200, "Produk berhasil diambil", products)
    } catch (error) {
        return next(error)
    }
}

export const updateProducts = async (req, res, next) => {
    try {
        const { id } = req.params
        if (!id) return next(new InvariantError("ID produk wajib diisi"))

        const existProduct = await Product.findById(id)
        if (!existProduct) return next(new NotFoundError("Produk tidak ditemukan"))

        const { name, code, price, stock, unit, categoryId, isActive } = req.body

        if (price !== undefined && (price === null || price < 0)) {
            return next(new InvariantError("Harga tidak boleh bernilai negatif"))
        }

        if (stock !== undefined && (stock === null || stock < 0)) {
            return next(new InvariantError("Stok tidak boleh bernilai negatif"))
        }

        if (code !== undefined && code.trim() !== '') {
            const existCode = await Product.findOne({ code: code.trim(), _id: { $ne: id } })
            if (existCode) return next(new InvariantError("Kode produk sudah digunakan oleh produk lain"))
        }

        if (name !== undefined && name.trim() !== '' && name.trim() !== existProduct.name) {
            const duplicateName = await Product.findOne({ name: name.trim(), _id: { $ne: id } })
            if (duplicateName) return next(new InvariantError("Nama produk sudah ada"))
        }

        if (categoryId !== undefined && categoryId !== existProduct.categoryId?.toString()) {
            const existCategory = await Categories.findById(categoryId)
            if (!existCategory) return next(new NotFoundError("Kategori tidak ditemukan"))
            if (existCategory.isActive === false) return next(new InvariantError("Kategori yang dipilih tidak aktif"))
        }

        await Product.updateOne({ _id: id }, {
            name: name !== undefined ? name.trim() : existProduct.name,
            code: code !== undefined ? code.trim() : existProduct.code,
            price: price !== undefined ? price : existProduct.price,
            stock: stock !== undefined ? stock : existProduct.stock,
            unit: unit !== undefined ? unit.trim() : (existProduct.unit || 'pcs'),
            categoryId: categoryId !== undefined ? categoryId : existProduct.categoryId,
            isActive: isActive !== undefined ? Boolean(isActive) : existProduct.isActive,
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

        existProduct.isActive = false
        await existProduct.save()

        return response(res, 200, "Produk berhasil dinonaktifkan", { id: existProduct._id })
    } catch (error) {
        return next(error)
    }
}

export const getProductNames = async (_, res, next) => {
    try {
        const products = await Product.find().select('_id name isActive').sort({ name: 1 })
        return response(res, 200, "Data nama produk berhasil diambil", products)
    } catch (error) {
        return next(error)
    }
}