'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const monitorController = require('../controllers/monitor.controller');

const router = Router();

// All monitor routes require a valid JWT
router.use(authenticate);

router.post('/monitors', monitorController.create);
router.get('/monitors', monitorController.list);
router.patch('/monitors/:id', monitorController.update);
router.delete('/monitors/:id', monitorController.remove);

module.exports = router;
