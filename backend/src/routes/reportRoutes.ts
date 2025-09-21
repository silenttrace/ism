import { Router } from 'express';
import { ReportController } from '../controllers/ReportController';

const router = Router();
const reportController = new ReportController();

// Export report in specified format
router.get('/export/:format', (req, res) => reportController.exportReport(req, res));

// Get summary statistics
router.get('/summary', (req, res) => reportController.getSummaryStats(req, res));

// Preview report data
router.get('/preview', (req, res) => reportController.previewReport(req, res));

// Get available export formats
router.get('/formats', (req, res) => reportController.getExportFormats(req, res));

export default router;