import { Router } from "express";
import { addTransaction } from "./kasir-controller.js";
import Authorization, { PermissionAction } from "../../middlewares/authorization.js";
import Authentication from "../../middlewares/authentication.js";

const moduleName = 'pos'

const router = Router()

// Routing untuk kasir
router.post('/', Authentication, Authorization(moduleName, PermissionAction.Create), addTransaction)

export default router