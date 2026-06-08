'use strict';

const monitorService = require('../services/monitor.service');

/**
 * POST /monitors
 */
async function create(req, res) {
  const { name, url, interval_minutes } = req.body;
  const userId = req.user.id;

  if (!name || !url || interval_minutes === undefined) {
    return res.status(400).json({ error: 'name, url, and interval_minutes are required' });
  }

  if (typeof interval_minutes !== 'number' || interval_minutes <= 0) {
    return res.status(400).json({ error: 'interval_minutes must be a positive number' });
  }

  try {
    const monitor = await monitorService.createMonitor(userId, { name, url, interval_minutes });
    return res.status(201).json({ monitor });
  } catch (err) {
    console.error('[monitor.controller] create error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /monitors
 */
async function list(req, res) {
  const userId = req.user.id;

  try {
    const monitors = await monitorService.getMonitorsByUser(userId);
    return res.status(200).json({ monitors });
  } catch (err) {
    console.error('[monitor.controller] list error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PATCH /monitors/:id
 */
async function update(req, res) {
  const { id } = req.params;
  const userId = req.user.id;
  const { name, interval_minutes, is_active } = req.body;

  if (interval_minutes !== undefined) {
    if (typeof interval_minutes !== 'number' || interval_minutes <= 0) {
      return res.status(400).json({ error: 'interval_minutes must be a positive number' });
    }
  }

  if (is_active !== undefined && typeof is_active !== 'boolean') {
    return res.status(400).json({ error: 'is_active must be a boolean' });
  }

  try {
    const monitor = await monitorService.updateMonitor(id, userId, { name, interval_minutes, is_active });
    return res.status(200).json({ monitor });
  } catch (err) {
    if (err.code === 'MONITOR_NOT_FOUND') {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    if (err.code === 'NO_UPDATE_FIELDS') {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }
    console.error('[monitor.controller] update error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * DELETE /monitors/:id
 */
async function remove(req, res) {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    await monitorService.deleteMonitor(id, userId);
    return res.status(200).json({ message: 'Monitor deleted successfully' });
  } catch (err) {
    if (err.code === 'MONITOR_NOT_FOUND') {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    console.error('[monitor.controller] delete error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { create, list, update, remove };
