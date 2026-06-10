'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const checksController = require('../controllers/checks.controller');

const router = Router();

// Both endpoints require a valid JWT
router.use('/monitors', authenticate);

router.get('/monitors/:id/checks', checksController.getChecks);
router.get('/monitors/:id/status', checksController.getLatestStatus);

module.exports = router;
