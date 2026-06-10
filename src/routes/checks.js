'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const checksController = require('../controllers/checks.controller');

const router = Router();

// Both endpoints require a valid JWT
router.get('/monitors/:id/checks', authenticate, checksController.getChecks);
router.get('/monitors/:id/status', authenticate, checksController.getLatestStatus);

module.exports = router;
