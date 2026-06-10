'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const metricsController = require('../controllers/metrics.controller');

const router = Router();

router.get('/monitors/:id/metrics', authenticate, metricsController.getMetrics);

module.exports = router;
