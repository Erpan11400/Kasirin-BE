import { Router } from "express";
import { createProducts, deleteProducts, getAllProducts, updateProducts } from "./product-controller.js";
import Authentication from "../../middlewares/authentication.js";
import Authorization, { PermissionAction } from "../../middlewares/authorization.js";

const nameModule = 'products'

const router = Router()

router.post('/', Authentication, Authorization(nameModule, PermissionAction.Create), createProducts)
router.get('/', Authentication, Authorization(nameModule, PermissionAction.View), getAllProducts)
router.put('/:id', Authentication, Authorization(nameModule, PermissionAction.Update), updateProducts)
router.delete('/:id', Authentication, Authorization(nameModule, PermissionAction.Delete), deleteProducts)

export default router