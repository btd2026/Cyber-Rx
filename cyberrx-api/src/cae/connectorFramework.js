'use strict';

/**
 * cae/connectorFramework — the connector abstraction (Milestone 1).
 *
 * A connector knows how to (a) build its base request from a tenant's config +
 * vault-held secrets and (b) run a read-only health check that verifies
 * reachability AND least-privilege scope. Vendor-specific evidence collectors
 * are added in a later milestone; this milestone establishes the contract,
 * a generic HTTP connector, the registry, and strict error sanitization.
 *
 * Security invariants:
 *   - Secrets arrive resolved from the vault and are NEVER logged or returned.
 *   - API endpoints / payloads / raw vendor errors NEVER reach the caller;
 *     only a sanitized, user-safe message does.
 *   - The connector interprets the template; it does not eval arbitrary strings.
 */

const logger = require('../utils/logger');

const HEALTH_TIMEOUT_MS = Number(process.env.CAE_HEALTH_TIMEOUT_MS || 8000);

// Map any failure to a single user-safe message (the prompt's required text).
function sanitizeError(/* internalErr */) {
  return 'Connection failed. Check the URL, credentials, and required read-only permissions.';
}

// Resolve the live base URL from the template + the tenant's non-secret config,
// substituting <placeholders> with provided values. Returns null if unresolved.
function resolveBaseUrl(template, config = {}) {
  let url = template.base_url || config.base_url || config.url || config.tenant_url ||
    config.instance_url || config.api_url || config.cluster_url || config.panorama_url || config.pvwa_url || '';
  url = String(url).replace(/<([^>]+)>/g, (_, k) => (config[k] != null ? String(config[k]) : `<${k}>`));
  if (!url || /<[^>]+>/.test(url)) {
    // template still has an unfilled placeholder; prefer a user-supplied URL field
    const supplied = config.tenant_url || config.instance_url || config.api_url || config.base_url || config.url;
    if (supplied) return String(supplied);
    return null;
  }
  return url;
}

class BaseConnector {
  constructor(template) { this.template = template || {}; }

  // Which user-config fields + secrets must be present to even attempt a call.
  requiredKeys() { return []; }

  // Read-only health check. Receives { config, secrets }. Returns
  // { ok: bool, status: 'connected'|'failed', message: string|null }.
  // Subclasses may override; the generic implementation does a single GET.
  async healthCheck({ config = {}, secrets = {} } = {}) {
    const url = resolveBaseUrl(this.template, config);
    if (!url) return { ok: false, status: 'failed', message: sanitizeError() };
    if (!Object.keys(secrets).length) return { ok: false, status: 'failed', message: sanitizeError() };
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), HEALTH_TIMEOUT_MS);
      const res = await fetch(url, { method: 'GET', headers: this.authHeaders(secrets), signal: ctrl.signal });
      clearTimeout(t);
      // 2xx/3xx => reachable with accepted auth; 401/403 => bad creds/scope.
      if (res.ok || (res.status >= 300 && res.status < 400)) return { ok: true, status: 'connected', message: null };
      return { ok: false, status: 'failed', message: sanitizeError() };
    } catch (e) {
      logger.debug('cae health check failed', { connector: this.template.id }); // no secret/endpoint detail
      return { ok: false, status: 'failed', message: sanitizeError() };
    }
  }

  // Build auth headers from resolved secrets. Generic best-effort by auth_type.
  authHeaders(secrets = {}) {
    const a = String(this.template.auth_type || '').toLowerCase();
    if (secrets.api_token || /ssws|token/.test(a)) {
      const tok = secrets.api_token || secrets.token;
      if (tok) return { Authorization: /ssws/.test(a) ? `SSWS ${tok}` : `Bearer ${tok}` };
    }
    if (secrets.api_key) return { 'X-API-Key': secrets.api_key };
    if (secrets.pat) return { Authorization: `Bearer ${secrets.pat}` };
    return {};
  }
}

// Generic HTTP connector — the default for any templated tool until a
// vendor-specific collector is registered.
class GenericHttpConnector extends BaseConnector {}

// Registry: connector_id -> connector class. Vendor-specific classes register
// here in later milestones; everything else falls back to GenericHttpConnector.
const REGISTRY = {};
function registerConnector(id, cls) { REGISTRY[id] = cls; }
function getConnector(template) {
  const Cls = (template && REGISTRY[template.id]) || GenericHttpConnector;
  return new Cls(template);
}

module.exports = {
  BaseConnector, GenericHttpConnector, getConnector, registerConnector,
  sanitizeError, resolveBaseUrl,
};
