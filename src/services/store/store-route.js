import { Router } from "express";
import { getStore, updateStore } from "./store-controller.js";
import Authentication from "../../middlewares/authentication.js";
import Authorization, { PermissionAction } from "../../middlewares/authorization.js";

const nameModule = 'store';

const router = Router();

router.get('/', Authentication, getStore);
router.get('/:id', Authentication, Authorization(nameModule, PermissionAction.View), getStore);
router.put('/', Authentication, Authorization(nameModule, PermissionAction.Update), updateStore);
router.put('/:id', Authentication, Authorization(nameModule, PermissionAction.Update), updateStore);

export default router;
