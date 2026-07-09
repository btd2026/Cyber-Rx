'use strict';

/**
 * vault — per-tenant credential store for connected security tools.
 *
 * Three tiers, chosen automatically:
 *   1. AWS mode (AWS_REGION set, VAULT_MODE !== 'local')  → AWS Secrets Manager.
 *   2. Otherwise                                          → encrypted rows in
 *      Postgres (integration_secrets), so a customer connects a tool ONCE and
 *      the credential survives restarts and every new day. This is the tier
 *      that fixes "the API key is empty again this morning".
 *   3. Read-only fallback for get(): tools configured through the deployment's
 *      own environment variables (e.g. OKTA_APITOKEN) still resolve, so
 *      operator-provisioned integrations keep working unchanged.
 *
 * Credentials at rest are AES-256-GCM encrypted with a key derived from (in
 * order) CREDENTIAL_ENCRYPTION_KEY, then JWT_SECRET / SESSION_SECRET /
 * ADMIN_API_KEY, then a random key persisted to VAULT_KEY_PATH. The stored
 * ciphertext is iv.tag.ciphertext, base64 per part.
 */

const crypto = require('crypto');
const isAWS = !!(process.env.AWS_REGION && process.env.VAULT_MODE !== 'local');

// ---- encryption key (stable across restarts) ---------------------------------
let _key = null;
function encKey() {
  if (_key) return _key;
  const explicit = process.env.CREDENTIAL_ENCRYPTION_KEY
    || process.env.JWT_SECRET || process.env.SESSION_SECRET || process.env.ADMIN_API_KEY;
  if (explicit) { _key = crypto.createHash('sha256').update(String(explicit)).digest(); return _key; }
  // No configured secret: persist a generated key so decryption still works
  // after a restart (stable as long as the volume persists). Warn once.
  try {
    const fs = require('fs');
    const path = require('path');
    const keyPath = process.env.VAULT_KEY_PATH || path.join(process.cwd(), '.cyberrx-vault-key');
    if (fs.existsSync(keyPath)) {
      _key = crypto.createHash('sha256').update(fs.readFileSync(keyPath)).digest();
    } else {
      const seed = crypto.randomBytes(48);
      try { fs.writeFileSync(keyPath, seed, { mode: 0o600 }); } catch (_) {}
      // eslint-disable-next-line no-console
      console.warn('[vault] No CREDENTIAL_ENCRYPTION_KEY/JWT_SECRET set — generated a persistent key at ' + keyPath + '. Set CREDENTIAL_ENCRYPTION_KEY in production.');
      _key = crypto.createHash('sha256').update(seed).digest();
    }
  } catch (_) {
    // Last resort (read-only fs): derive a process-stable key. Persistence
    // across restarts still needs a configured secret.
    _key = crypto.createHash('sha256').update('cyberrx-default-vault-key').digest();
  }
  return _key;
}

function encrypt(obj) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encKey(), iv);
  const ct = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join('.');
}

function decrypt(blob) {
  const [ivB, tagB, ctB] = String(blob).split('.');
  if (!ivB || !tagB || !ctB) return null;
  const decipher = crypto.createDecipheriv('aes-256-gcm', encKey(), Buffer.from(ivB, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB, 'base64'));
  const pt = Buffer.concat([decipher.update(Buffer.from(ctB, 'base64')), decipher.final()]);
  return JSON.parse(pt.toString('utf8'));
}

// ---- Postgres-backed store ---------------------------------------------------
let _tableReady = null;
async function ensureTable() {
  if (_tableReady) return _tableReady;
  const db = require('./db');
  _tableReady = db.query(`CREATE TABLE IF NOT EXISTS integration_secrets (
    org_id TEXT NOT NULL, tool TEXT NOT NULL, secret TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(), PRIMARY KEY (org_id, tool))`).catch(() => {});
  return _tableReady;
}

async function dbSet(orgId, tool, creds) {
  const db = require('./db');
  await ensureTable();
  await db.query(
    `INSERT INTO integration_secrets (org_id, tool, secret, updated_at) VALUES ($1,$2,$3,NOW())
     ON CONFLICT (org_id, tool) DO UPDATE SET secret=EXCLUDED.secret, updated_at=NOW()`,
    [orgId, tool, encrypt(creds)]);
}

async function dbGet(orgId, tool) {
  const db = require('./db');
  await ensureTable();
  const rows = await db.query('SELECT secret FROM integration_secrets WHERE org_id=$1 AND tool=$2', [orgId, tool]);
  if (!rows || !rows.length) return null;
  try { return decrypt(rows[0].secret); } catch (_) { return null; }
}

async function dbDel(orgId, tool) {
  const db = require('./db');
  await ensureTable();
  await db.query('DELETE FROM integration_secrets WHERE org_id=$1 AND tool=$2', [orgId, tool]);
}

// ---- env-var fallback (operator-provisioned tools) ---------------------------
function envCreds(tool) {
  const prefix = tool.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const apiKey = process.env[prefix + '_APIKEY'] || process.env[prefix + '_APITOKEN'] || process.env[prefix + '_TOKEN'];
  const domain = process.env[prefix + '_DOMAIN'] || process.env[prefix + '_INSTANCE'] || process.env[prefix + '_HOST'];
  if (!apiKey && !domain) return null;
  return {
    apiKey, apiToken: apiKey, token: apiKey,
    domain, instance: domain, host: domain,
    user: process.env[prefix + '_USER'],
    password: process.env[prefix + '_PASSWORD'],
    clientId: process.env[prefix + '_CLIENT_ID'],
    clientSecret: process.env[prefix + '_CLIENT_SECRET'],
    accessKey: process.env[prefix + '_ACCESS_KEY'],
    secretKey: process.env[prefix + '_SECRET_KEY'],
    assignGroup: process.env[prefix + '_ASSIGN_GROUP'] || 'IT Security',
    project: process.env[prefix + '_PROJECT'] || 'SEC',
    email: process.env[prefix + '_EMAIL'],
    port: process.env[prefix + '_PORT'],
  };
}

// ---- public API --------------------------------------------------------------
async function get(orgId, tool) {
  if (isAWS) {
    const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
    const client = new SecretsManagerClient({ region: process.env.AWS_REGION });
    try {
      const resp = await client.send(new GetSecretValueCommand({ SecretId: `cyberrx/${orgId}/${tool}` }));
      return JSON.parse(resp.SecretString);
    } catch (e) {
      if (e.name === 'ResourceNotFoundException') return null;
      throw e;
    }
  }
  // Durable store first, then operator env vars.
  try { const c = await dbGet(orgId, tool); if (c) return c; } catch (_) {}
  return envCreds(tool);
}

async function set(orgId, tool, creds) {
  if (isAWS) {
    const { SecretsManagerClient, CreateSecretCommand, UpdateSecretCommand } = require('@aws-sdk/client-secrets-manager');
    const client = new SecretsManagerClient({ region: process.env.AWS_REGION });
    const secretId = `cyberrx/${orgId}/${tool}`;
    const secretString = JSON.stringify(creds);
    try {
      await client.send(new UpdateSecretCommand({ SecretId: secretId, SecretString: secretString }));
    } catch (e) {
      if (e.name === 'ResourceNotFoundException') {
        await client.send(new CreateSecretCommand({ Name: secretId, SecretString: secretString }));
      } else throw e;
    }
    return;
  }
  // Persist durably to Postgres (encrypted) — connect once, stays connected.
  await dbSet(orgId, tool, creds);
}

async function del(orgId, tool) {
  if (isAWS) {
    const { SecretsManagerClient, DeleteSecretCommand } = require('@aws-sdk/client-secrets-manager');
    const client = new SecretsManagerClient({ region: process.env.AWS_REGION });
    await client.send(new DeleteSecretCommand({
      SecretId: `cyberrx/${orgId}/${tool}`,
      ForceDeleteWithoutRecovery: true,
    }));
    return;
  }
  await dbDel(orgId, tool).catch(() => {});
}

module.exports = { get, set, delete: del };
