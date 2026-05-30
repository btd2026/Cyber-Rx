'use strict';

const express = require('express');
const router = express.Router();
const RemediationTask = require('../models/RemediationTask');

// Middleware to extract org ID from header
const extractOrgId = (req, res, next) => {
  req.orgId = req.headers['x-org-id'] || req.query.org_id;
  next();
};

router.use(extractOrgId);

/**
 * GET /api/tasks
 * List all tasks for an organization with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { org_id } = req.headers;
    const { status, assigned_to, priority, overdue } = req.query;

    if (!org_id) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    const filters = {};
    if (status) filters.status = status;
    if (assigned_to) filters.assignedTo = assigned_to;
    if (priority) filters.priority = priority;
    if (overdue === 'true') filters.overdue = true;

    const tasks = await RemediationTask.findByOrganization(org_id, filters);
    res.json({ data: tasks, total: tasks.length });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tasks
 * Create a new task
 */
router.post('/', async (req, res) => {
  try {
    const { org_id } = req.headers;

    if (!org_id) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    const taskData = { ...req.body, organizationId: org_id };
    const task = await RemediationTask.create(taskData);

    res.status(201).json({ data: task });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tasks/statistics
 * Get task statistics for organization
 */
router.get('/statistics', async (req, res) => {
  try {
    const { org_id } = req.headers;

    if (!org_id) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    const stats = await RemediationTask.getStatistics(org_id);
    res.json({ data: stats });
  } catch (error) {
    console.error('Error fetching task statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tasks/overdue
 * Get overdue tasks
 */
router.get('/overdue', async (req, res) => {
  try {
    const { org_id } = req.headers;

    if (!org_id) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    const tasks = await RemediationTask.findOverdue(org_id);
    res.json({ data: tasks, total: tasks.length });
  } catch (error) {
    console.error('Error fetching overdue tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tasks/assigned-to/:userId
 * Get tasks for a specific user
 */
router.get('/assigned-to/:userId', async (req, res) => {
  try {
    const { org_id } = req.headers;
    const { userId } = req.params;

    if (!org_id) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    const tasks = await RemediationTask.findByAssignedTo(org_id, userId);
    res.json({ data: tasks, total: tasks.length });
  } catch (error) {
    console.error('Error fetching tasks for user:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tasks/from-finding/:findingId
 * Get tasks from a finding
 */
router.get('/from-finding/:findingId', async (req, res) => {
  try {
    const { findingId } = req.params;
    const tasks = await RemediationTask.findByFinding(findingId);
    res.json({ data: tasks, total: tasks.length });
  } catch (error) {
    console.error('Error fetching tasks for finding:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tasks/from-risk/:riskId
 * Get tasks from a risk
 */
router.get('/from-risk/:riskId', async (req, res) => {
  try {
    const { riskId } = req.params;
    const tasks = await RemediationTask.findByRisk(riskId);
    res.json({ data: tasks, total: tasks.length });
  } catch (error) {
    console.error('Error fetching tasks for risk:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tasks/:id
 * Get a single task by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const task = await RemediationTask.findById(id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ data: task });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/tasks/:id
 * Update a task
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const task = await RemediationTask.update(id, req.body);
    res.json({ data: task });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/tasks/:id
 * Delete a task
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await RemediationTask.delete(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tasks/:id/complete
 * Mark task as complete
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { actualCost, notes } = req.body;

    const task = await RemediationTask.markComplete(id, { actualCost, notes });
    res.json({ data: task });
  } catch (error) {
    console.error('Error marking task complete:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tasks/:id/verify
 * Verify task completion
 */
router.post('/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { verified, verifiedBy, notes } = req.body;

    const task = await RemediationTask.verify(id, { verified, verifiedBy, notes });
    res.json({ data: task });
  } catch (error) {
    console.error('Error verifying task:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
