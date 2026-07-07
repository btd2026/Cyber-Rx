'use strict';

/**
 * routes/provisioning — real post-go-live readiness for the cockpit provisioning
 * screen. The screen tracks TRUE progress and only hands off when the cockpit can
 * render, so there is no artificial timer here.
 *
 *   GET /api/provisioning/status   one-shot status ({pct,stageIndex,stageLabel,done,error})
 *   GET /api/provisioning/stream   SSE — emits the same object ~every 800ms until done
 *
 * Navigation-adjacent + low-sensitivity: same optional-auth + demo-org resolution
 * as the rest of the read surface, so it works for the demo cockpit too.
 */

const express = require('express');
const router = express.Router();
const { optionalJWT, demoOrg } = require('../middleware/auth');
const logger = require('../utils/logger');
const Prov = require('../services/ProvisioningService');

const orgOf = (req) => req.orgId || req.headers['x-org-id'] || req.query.org_id || req.query.orgId;
const FALLBACK = { pct: 0, stageIndex: 0, stageLabel: 'Starting…', done: false, error: null };

router.get('/status', optionalJWT, demoOrg, async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'Organization required.' });
  try { res.json(await Prov.status(orgId)); }
  catch (e) { logger.debug('provisioning status failed', { error: e.message }); res.json({ ...FALLBACK, error: 'status_failed' }); }
});

router.get('/stream', optionalJWT, demoOrg, async (req, res) => {
  const orgId = orgOf(req);
  if (!orgId) return res.status(400).json({ error: 'Organization required.' });

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // don't let a proxy buffer the stream
  });
  if (res.flushHeaders) { try { res.flushHeaders(); } catch (_) {} }

  let closed = false; let timer = null;
  const send = (obj) => { if (closed) return; try { res.write('data: ' + JSON.stringify(obj) + '\n\n'); } catch (_) {} };
  const stop = () => { closed = true; if (timer) { clearTimeout(timer); timer = null; } };

  const tick = async () => {
    if (closed) return;
    let s;
    try { s = await Prov.status(orgId); }
    catch (e) { logger.debug('provisioning stream tick failed', { error: e.message }); s = { ...FALLBACK }; }
    send(s);
    if (s && s.done) { stop(); try { res.end(); } catch (_) {} return; }
    timer = setTimeout(tick, 800);
  };

  req.on('close', stop);
  res.on('error', stop);
  tick();
});

module.exports = router;
