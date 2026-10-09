import { Router } from "express";
import { createTransaction } from "./transaction-controller.js";
import Authentication from "../../middlewares/authentication.js";
import Authorization, { PermissionAction } from "../../middlewares/authorization.js";
import response from "../../utils/response.js";

const nameModule = 'transactions';
const router = Router();

router.post('/', Authentication, Authorization(nameModule, PermissionAction.Create), createTransaction);
router.get('/', Authentication, Authorization(nameModule, PermissionAction.View), (req, res, next) => {
    return response(res, 200, "Data Transaksi Berhasil Diambil");
});

export default router;