'use strict';

const checksService = require('../services/checks.service');

/**
 * GET /monitors/:id/checks
 * Returns the latest 100 check results for the authenticated user's monitor.
 */
async function getChecks(req, res) {
  const { id } = req.params;
  const userId  = req.user.id;

  try {
    const checks = await checksService.getChecks(id, userId);
    return res.status(200).json({ checks });
  } catch (err) {
    if (err.code === 'MONITOR_NOT_FOUND') {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    console.error('[checks.controller] getChecks error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /monitors/:id/status
 * Returns the single most recent check for the authenticated user's monitor.
 */
async function getLatestStatus(req, res) {
  const { id } = req.params;
  const userId  = req.user.id;

  try {
    const check = await checksService.getLatestCheck(id, userId);

    if (check === null) {
      return res.status(200).json({ check: null, message: 'No checks recorded yet' });
    }

    return res.status(200).json({ check });
  } catch (err) {
    if (err.code === 'MONITOR_NOT_FOUND') {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    console.error('[checks.controller] getLatestStatus error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getChecks, getLatestStatus };
