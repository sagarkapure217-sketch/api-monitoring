'use strict';

const { Router } = require('express');
const monitorQueue = require('../queues/monitor.queue');

const router = Router();

router.post('/test-job', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    const job = await monitorQueue.add('test', { message });
    return res.status(201).json({
      jobId: job.id,
      status: 'queued',
    });
  } catch (err) {
    console.error('[test-job] Failed to enqueue job:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
