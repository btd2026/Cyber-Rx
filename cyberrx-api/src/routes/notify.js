'use strict';

/**
 * routes/notify — reminder emails from the CISO cockpit.
 *   GET  /api/notify/status — whether server-side SMTP sending is available
 *   POST /api/notify/draft  — LLM-draft a reminder email {subject, body, engine}
 *   POST /api/notify/send   — send it (SMTP if configured, else mailto fallback)
 *
 * No PII is persisted; drafts and sends are stateless. Sending is best-effort
 * and degrades to a mailto: link the cockpit opens in the sender's own client
 * when SMTP is not configured (see NotificationService).
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const EmailDraft = require('../services/EmailDraftService');
const Notify = require('../services/NotificationService');

router.get('/status', (req, res) => {
  try { res.json(Notify.status()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/draft', async (req, res) => {
  try {
    const out = await EmailDraft.draft(req.body || {});
    res.json(out);
  } catch (e) {
    logger.error(`email draft error: ${e.message}`);
    res.status(500).json({ error: 'Could not draft the email: ' + e.message });
  }
});

router.post('/send', async (req, res) => {
  try {
    const out = await Notify.send(req.body || {});
    // A config gap (mailto fallback) is a normal 200 with sent:false so the
    // cockpit can open the user's mail client; only a genuine transport error is 5xx.
    if (out.method === 'error') return res.status(502).json(out);
    res.json(out);
  } catch (e) {
    logger.error(`email send error: ${e.message}`);
    res.status(500).json({ error: 'Could not send the email: ' + e.message });
  }
});

module.exports = router;
