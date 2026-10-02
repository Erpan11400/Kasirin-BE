import { Router } from "express";
import response from "../../utils/response.js";

const router = Router()

router.get('/', (req, res, next) => {
    return response(res, 200, "Data Transaksi Berhasil Diambill")
})

export default router