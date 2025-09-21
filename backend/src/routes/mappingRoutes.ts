import { Router } from 'express';
import { MappingController } from '../controllers/MappingController';

const router = Router();
const mappingController = new MappingController();

// Processing operations
router.post('/process', (req, res) => mappingController.startProcessing(req, res));
router.get('/status/:jobId', (req, res) => mappingController.getJobStatus(req, res));
router.get('/results/:jobId', (req, res) => mappingController.getNewResults(req, res));

// Mapping results
router.get('/', (req, res) => mappingController.getAllMappings(req, res));
router.get('/:controlId', (req, res) => mappingController.getMappingByControlId(req, res));

// Manual overrides
router.put('/:controlId/override', (req, res) => mappingController.applyManualOverride(req, res));
router.delete('/:controlId/override/:nistControlId', (req, res) => mappingController.removeManualOverride(req, res));

// Statistics and monitoring
router.get('/stats/processing', (req, res) => mappingController.getProcessingStats(req, res));
router.get('/test/ai', (req, res) => mappingController.testAI(req, res));

// Reset operations
router.post('/reset', (req, res) => mappingController.resetMappings(req, res));

// Debug endpoints
router.get('/debug/prompt/:controlId', (req, res) => mappingController.getPromptPreview(req, res));
router.get('/debug/info', (req, res) => mappingController.getDebugInfo(req, res));

export default router;