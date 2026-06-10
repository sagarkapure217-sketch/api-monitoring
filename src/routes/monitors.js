'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const monitorController = require('../controllers/monitor.controller');

const router = Router();

router.post('/monitors', authenticate, monitorController.create);
router.get('/monitors', authenticate, monitorController.list);
router.patch('/monitors/:id', authenticate, monitorController.update);
router.delete('/monitors/:id', authenticate, monitorController.remove);

module.exports = router;
