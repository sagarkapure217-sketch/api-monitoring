'use strict';

const metricsService = require('../services/metrics.service');

/**
 * GET /monitors/:id/metrics
 * Returns aggregated health check metrics for the authenticated user's monitor.
 */
async function getMetrics(req, res) {
  const { id } = req.params;
  const userId  = req.user.id;

  try {
    const metrics = await metricsService.getMonitorMetrics(id, userId);
    return res.status(200).json(metrics);
  } catch (err) {
    if (err.code === 'MONITOR_NOT_FOUND') {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    console.error('[metrics.controller] getMetrics error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getMetrics };
