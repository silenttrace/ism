import { Router } from 'express';
import { ControlController } from '../controllers/ControlController';

const router = Router();
const controlController = new ControlController();

// Load controls
router.post('/load', (req, res) => controlController.loadControls(req, res));

// Get loading status
router.get('/status', (req, res) => controlController.getLoadingStatus(req, res));

// Search controls (must be before ID routes)
router.get('/ism/search', (req, res) => controlController.searchISMControls(req, res));
router.get('/nist/search', (req, res) => controlController.searchNISTControls(req, res));

// Get all controls
router.get('/ism', (req, res) => controlController.getISMControls(req, res));
router.get('/nist', (req, res) => controlController.getNISTControls(req, res));

// Get control by ID
router.get('/ism/:id', (req, res) => controlController.getISMControlById(req, res));
router.get('/nist/:id', (req, res) => controlController.getNISTControlById(req, res));

// Get control families
router.get('/families', (req, res) => controlController.getControlFamilies(req, res));

export default router;