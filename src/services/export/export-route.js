import { Router } from "express";
import { exportReportPdf } from "./report/report-controller.js";
import { exportRawTransactionsExcel } from "./raw_data/raw-data-controller.js";
import Authentication from "../../middlewares/authentication.js";
import Authorization, { PermissionAction } from "../../middlewares/authorization.js";

const router = Router();
const moduleName = 'transactions';
const guards = [Authentication, Authorization(moduleName, PermissionAction.View)];

// ===== Report (PDF) =====
// GET  /api/export/report/pdf (query parameters)
// POST /api/export/report/pdf (body json parameters jika filter kompleks)
router.get('/report/pdf', ...guards, exportReportPdf);
router.post('/report/pdf', ...guards, exportReportPdf);

// ===== Raw Data (Excel) =====
// GET  /api/export/raw-data/excel (query parameters)
// POST /api/export/raw-data/excel (body json / query parameters)
router.get('/raw-data/excel', ...guards, exportRawTransactionsExcel);
router.post('/raw-data/excel', ...guards, exportRawTransactionsExcel);

export default router;
