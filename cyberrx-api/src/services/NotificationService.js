'use strict';

/**
 * NotificationService — sends reminder emails from the cockpit.
 *
 * Transport is SMTP via nodemailer, configured entirely from environment:
 *   SMTP_HOST, SMTP_PORT (default 587), SMTP_SECURE (true|false),
 *   SMTP_USER, SMTP_PASS, SMTP_FROM (default "Nerion <no-reply@…>")
 *
 * If SMTP is not configured, or nodemailer is not installed, send() does NOT
 * fail — it returns { sent:false, method:'mailto' } so the cockpit falls back
 * to opening the sender's own mail client with the draft pre-filled (a real
 * "send from the cockpit" path that needs no server credentials). This keeps
 * the piping working in every environment and lets a deployment turn on true
 * server-side sending just by setting the SMTP_* vars.
 */

const logger = require('../utils/logger');

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return {
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || Number(process.env.SMTP_PORT) === 465,
    auth: (process.env.SMTP_USER && process.env.SMTP_PASS) ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    from: process.env.SMTP_FROM || `Nerion <no-reply@${(host || 'localhost').replace(/^smtp\./, '')}>`,
  };
}

/** Whether true server-side sending is available in this environment. */
function status() {
  const cfg = smtpConfig();
  let nodemailer = false;
  try { require.resolve('nodemailer'); nodemailer = true; } catch (_) { nodemailer = false; }
  return { configured: !!(cfg && nodemailer), smtp: !!cfg, nodemailer, from: cfg ? cfg.from : null };
}

const isEmail = (s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(s || '').trim());

let _transport;
function transport(cfg, deps = {}) {
  if (deps.transport) return deps.transport;
  if (_transport) return _transport;
  const nodemailer = require('nodemailer'); // may throw → caught by caller
  _transport = nodemailer.createTransport({ host: cfg.host, port: cfg.port, secure: cfg.secure, auth: cfg.auth });
  return _transport;
}

/**
 * Send an email. Resolves to a result object; never throws for a config gap.
 *   { sent:true, method:'smtp', messageId }
 *   { sent:false, method:'mailto', reason }
 *   { sent:false, method:'error', reason }  (only for a genuine transport error)
 */
async function send(payload, deps = {}) {
  const p = payload || {};
  const to = String(p.to || '').trim();
  const subject = String(p.subject || '').slice(0, 200);
  const body = String(p.body || '').slice(0, 8000);
  const cc = String(p.cc || '').trim();
  if (!isEmail(to)) return { sent: false, method: 'error', reason: 'A valid recipient email is required.' };
  if (!subject || !body) return { sent: false, method: 'error', reason: 'Subject and body are required.' };

  const cfg = smtpConfig();
  if (!cfg) return { sent: false, method: 'mailto', reason: 'SMTP not configured — open your mail client to send.' };

  let t;
  try { t = transport(cfg, deps); }
  catch (e) { logger.warn(`nodemailer unavailable: ${e.message}`); return { sent: false, method: 'mailto', reason: 'Mail transport unavailable — open your mail client to send.' }; }

  try {
    const info = await t.sendMail({
      from: p.from || cfg.from,
      to,
      cc: isEmail(cc) ? cc : undefined,
      subject,
      text: body,
      replyTo: isEmail(p.replyTo) ? p.replyTo : undefined,
    });
    logger.info('reminder email sent', { to, subject });
    return { sent: true, method: 'smtp', messageId: info && info.messageId };
  } catch (e) {
    logger.error(`email send failed: ${e.message}`);
    return { sent: false, method: 'error', reason: e.message };
  }
}

module.exports = { send, status, smtpConfig, isEmail };
