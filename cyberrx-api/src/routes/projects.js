'use strict';

/**
 * routes/projects — current cybersecurity projects/portfolio + ROI projections.
 *   POST /api/projects/upload        { fileName, contentBase64 | text } → parse + persist
 *   POST /api/projects/jira/import   { baseUrl, email, apiToken, jql }  → pull from Jira
 *   GET  /api/projects               list projects (with analysis)
 *   GET  /api/projects/portfolio     portfolio rollup: ROI, milestones, delay impact
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const logger = require('../utils/logger');
const Portfolio = require('../services/ProjectPortfolioService');

router.use(optionalJWT, demoOrg);
const orgOf = (req) => req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId || (req.body && req.body.org_id);

router.post('/upload', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  const { fileName, contentBase64, text } = req.body || {};
  if (!contentBase64 && !text) return res.status(400).json({ error: 'Provide a project inventory file or text.' });
  try {
    const parsed = await Portfolio.parseInventory(fileName, contentBase64, text);
    if (!parsed.length) return res.status(422).json({ error: 'No projects could be read from that file. Try a CSV/Excel with a project name column.' });
    const saved = await Portfolio.saveProjects(orgId, parsed.map((p) => Object.assign({ source: 'upload' }, p)));
    res.json({ imported: saved.length, projects: await Portfolio.analyze(orgId) });
  } catch (e) { logger.warn('project upload failed', { error: e.message }); res.status(500).json({ error: 'Unable to read the project inventory.' }); }
});

router.post('/jira/import', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try {
    const projects = await Portfolio.importFromJira(orgId, req.body || {});
    if (!projects.length) return res.status(422).json({ error: 'No projects/epics returned. Adjust the JQL or check permissions.' });
    await Portfolio.saveProjects(orgId, projects.map((p) => Object.assign({ source: 'jira' }, p)));
    res.json({ imported: projects.length, projects: await Portfolio.analyze(orgId) });
  } catch (e) { logger.warn('jira import failed', { error: e.message }); res.status(502).json({ error: e.message || 'Jira import failed.' }); }
});

router.get('/', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json({ projects: await Portfolio.analyze(orgId) }); }
  catch (e) { res.status(500).json({ error: 'Unable to load projects.' }); }
});

router.get('/portfolio', async (req, res) => {
  const orgId = orgOf(req); if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await Portfolio.portfolio(orgId)); }
  catch (e) { res.status(500).json({ error: 'Unable to compute portfolio.' }); }
});

module.exports = router;
