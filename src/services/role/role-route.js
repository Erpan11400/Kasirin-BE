import { Router } from "express";
import { createRole, deleteRole, getAllRole, updateRole } from "./role-controller.js";
import Authentication from "../../middlewares/authentication.js";
import Authorization, { PermissionAction } from "../../middlewares/authorization.js";

const moduleName = 'roles'

const router = Router()

router.get('/', Authentication, Authorization(moduleName, PermissionAction.View), getAllRole)
router.post('/', Authentication, Authorization(moduleName, PermissionAction.Create), createRole)
router.put('/:id', Authentication, Authorization(moduleName, PermissionAction.Update), updateRole)
router.delete('/:id', Authentication, Authorization(moduleName, PermissionAction.Delete), deleteRole)

export default router