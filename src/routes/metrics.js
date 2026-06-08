'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const metricsController = require('../controllers/metrics.controller');

const router = Router();

router.use(authenticate);

router.get('/monitors/:id/metrics', metricsController.getMetrics);

module.exports = router;
