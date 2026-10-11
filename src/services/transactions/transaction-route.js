import { Router } from "express";
import { createTransactions, getKPI, getTransactions, getDailyTransactions, getMonthlyTransactions } from "./transaction-controller.js";
import Authentication from "../../middlewares/authentication.js";
import Authorization, { PermissionAction } from "../../middlewares/authorization.js";

const nameModule = 'transactions';
const router = Router();

router.post('/', Authentication, Authorization(nameModule, PermissionAction.Create), createTransactions);
router.get('/kpi', Authentication, Authorization(nameModule, PermissionAction.View), getKPI);
router.get('/daily', Authentication, Authorization(nameModule, PermissionAction.View), getDailyTransactions);
router.get('/monthly', Authentication, Authorization(nameModule, PermissionAction.View), getMonthlyTransactions);
router.get('/', Authentication, Authorization(nameModule, PermissionAction.View), getTransactions);

export default router;