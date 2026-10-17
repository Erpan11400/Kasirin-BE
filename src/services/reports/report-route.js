import { Router } from "express";
import { exportReportPdf } from "./report-controller.js";
import Authentication from "../../middlewares/authentication.js";
import Authorization, { PermissionAction } from "../../middlewares/authorization.js";

const router = Router();
const moduleName = 'transactions';

// Mendukung GET /api/reports/export-pdf (query parameters)
router.get(
    '/export-pdf',
    Authentication,
    Authorization(moduleName, PermissionAction.View),
    exportReportPdf
);

// Mendukung POST /api/reports/export-pdf (body json parameters jika filter kompleks)
router.post(
    '/export-pdf',
    Authentication,
    Authorization(moduleName, PermissionAction.View),
    exportReportPdf
);

export default router;
