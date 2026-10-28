import { Router } from "express"
import { createCategories, deleteCategories, getAllCategories, updateCategories } from "./categories-controller.js"
import Authentication from "../../middlewares/authentication.js"
import Authorization, { PermissionAction } from "../../middlewares/authorization.js"

const moduleName = 'categories'

const router = Router()

// Routing untuk category
router.post('/', Authentication, Authorization(moduleName, PermissionAction.Create), createCategories)
router.get('/', Authentication, getAllCategories)
router.put('/:id', Authentication, Authorization(moduleName, PermissionAction.Update), updateCategories)
router.delete('/:id', Authentication, Authorization(moduleName, PermissionAction.Delete), deleteCategories)

export default router