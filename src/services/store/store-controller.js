import InvariantError from "../../exceptions/invariant-error.js";
import NotFoundError from "../../exceptions/not-found-error.js";
import Store from "../../models/Store.js";
import response from "../../utils/response.js";

/**
 * Mendapatkan data toko (Single Store)
 */
export const getStore = async (req, res, next) => {
    try {
        const { id } = req.params;

        let store;
        if (id) {
            store = await Store.findById(id);
            if (!store) {
                return next(new NotFoundError("Data toko tidak ditemukan"));
            }
        } else {
            store = await Store.findOne();
        }

        // Jika belum ada toko sama sekali di database, buat data default awal
        if (!store) {
            store = await Store.create({
                name: "KasirIn Store",
                businessCategory: "Retail",
                phone: "081234567890",
                address: "Jl. Utama No. 1",
                imageUrl: "",
                footerNote: "Terima kasih atas kunjungan Anda!",
                showQris: false,
            });
        }

        return response(res, 200, "Berhasil mengambil data toko", store);
    } catch (error) {
        return next(error);
    }
};

/**
 * Memperbarui data toko (Single Store)
 */
export const updateStore = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            name,
            businessCategory,
            phone,
            address,
            imageUrl,
            footerNote,
            showQris,
        } = req.body;

        // Validasi input
        if (!name || !name.trim()) {
            return next(new InvariantError("Nama toko wajib diisi"));
        }
        if (!businessCategory || !businessCategory.trim()) {
            return next(new InvariantError("Kategori bisnis wajib diisi"));
        }
        if (!phone || !phone.trim()) {
            return next(new InvariantError("Nomor telepon toko wajib diisi"));
        }
        if (!address || !address.trim()) {
            return next(new InvariantError("Alamat toko wajib diisi"));
        }

        let store;
        if (id) {
            store = await Store.findById(id);
            if (!store) {
                return next(new NotFoundError("Data toko tidak ditemukan"));
            }
        } else {
            store = await Store.findOne();
        }

        const updateData = {
            name: name.trim(),
            businessCategory: businessCategory.trim(),
            phone: phone.trim(),
            address: address.trim(),
            imageUrl: imageUrl !== undefined ? imageUrl : (store?.imageUrl || ""),
            footerNote: footerNote !== undefined ? footerNote.trim() : (store?.footerNote || ""),
            showQris: showQris !== undefined ? Boolean(showQris) : (store?.showQris ?? false),
        };

        if (!store) {
            store = await Store.create(updateData);
        } else {
            store = await Store.findByIdAndUpdate(
                store._id,
                { $set: updateData },
                { new: true, runValidators: true }
            );
        }

        return response(res, 200, "Data toko berhasil diperbarui", store);
    } catch (error) {
        return next(error);
    }
};
