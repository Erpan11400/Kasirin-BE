import { Router } from "express";
import { createUser, deleteUser, getAllUser, updateUser } from "./users-controller.js";
import Authentication from "../../middlewares/authentication.js";
import Authorization, { PermissionAction } from "../../middlewares/authorization.js";

const key = 'users'

const router = Router()

router.post('/', Authentication, Authorization(key, PermissionAction.Create), createUser)
router.get('/', Authentication, Authorization(key, PermissionAction.View), getAllUser)
router.put('/:id', Authentication, Authorization(key, PermissionAction.Update), updateUser)
router.delete('/:id', Authentication, Authorization(key, PermissionAction.Delete), deleteUser)

export default router