'use strict';

/**
 * cae/fieldSplit — derive the user-facing connection fields from a connector's
 * Connector_Settings_JSON_Template + Auth_Type.
 *
 * The template MIXES two things: credentials/identity the user must supply
 * (tenant_url, client_id, client_secret, region, ...) and internal scoping /
 * thresholds the engine uses but the user must never see (indexes,
 * privileged_roles, stale_days, critical_zones, severity_sla, ...).
 *
 * This module splits them deterministically so the UI can render ONLY the
 * connection fields, while the internal config stays hidden.
 *
 * Output: { fields: [{ field_key, label, field_type, is_secret, required, options }], internalConfig: {} }
 */

// Credential keys -> always a secret field.
const SECRET_KEYS = new Set([
  'client_secret', 'secret', 'secret_key', 'access_key', 'api_token', 'token',
  'api_key', 'apikey', 'password', 'pat', 'service_account_token',
]);

// Identity / endpoint keys -> a visible (non-secret) field. Value = field_type.
const IDENTITY_TYPES = {
  base_url: 'url', tenant_url: 'url', instance_url: 'url', api_url: 'url',
  panorama_url: 'url', pvwa_url: 'url', cluster_url: 'url', url: 'url',
  tenant_id: 'text', client_id: 'text', workspace_id: 'text', org: 'text',
  account_id: 'text', customer_id: 'text', subscription_id: 'text',
  region: 'region', cloud: 'region', platform: 'region',
};

// Anything else in a template is internal config (hidden from users).
// (indexes, critical_sourcetypes, tables, owner_field, device_group, vsys,
//  privileged_roles, mfa_required_groups, stale_days, critical_zones,
//  asset_tags, label_scope, dlp_policies_required, required_safes,
//  critical_objects_tag, restore_test_days, severity_sla, projects,
//  account_groups, auth, auth_type, repos_scope, branch, critical_groups, ...)

const LABELS = {
  base_url: 'Base URL', tenant_url: 'Tenant URL', instance_url: 'Instance URL',
  api_url: 'API URL', panorama_url: 'Panorama URL', pvwa_url: 'PVWA URL',
  cluster_url: 'Cluster URL', url: 'URL', tenant_id: 'Tenant ID',
  client_id: 'Client ID', client_secret: 'Client Secret', workspace_id: 'Workspace ID',
  access_key: 'Access Key', secret_key: 'Secret Key', api_token: 'API Token',
  api_key: 'API Key', token: 'Token', password: 'Password', pat: 'Personal Access Token',
  service_account_token: 'Service Account Token', region: 'Region', cloud: 'Cloud / Region',
  platform: 'Platform', org: 'Organization', account_id: 'Account ID', customer_id: 'Customer ID',
};

const labelFor = (k) => LABELS[k] || k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Per-auth augmentation: ensure the fields an auth scheme needs even if the
// template did not list them explicitly.
function authFields(authType) {
  const a = String(authType || '').toLowerCase();
  const out = [];
  const add = (k) => out.push(k);
  if (/oauth2|client id\/secret|app registration|client_credentials/.test(a)) { add('client_id'); add('client_secret'); }
  if (/api token|token|ssws/.test(a)) add('api_token');
  if (/api key|api keys|api-key/.test(a)) add('api_key');
  if (/basic/.test(a)) { add('username'); add('password'); }
  if (/pat|github app/.test(a)) add('pat');
  return out;
}

function deriveFields(settingsTemplate, authType) {
  const tpl = settingsTemplate && typeof settingsTemplate === 'object' ? settingsTemplate : {};
  const fields = new Map();          // field_key -> field def (dedup, ordered)
  const internalConfig = {};

  const addField = (key, opts = {}) => {
    if (fields.has(key)) return;
    const isSecret = SECRET_KEYS.has(key) || opts.is_secret;
    const type = isSecret ? 'secret' : (IDENTITY_TYPES[key] || opts.field_type || 'text');
    fields.set(key, {
      field_key: key, label: labelFor(key), field_type: type,
      is_secret: !!isSecret, required: opts.required !== false, options: opts.options || [],
    });
  };

  for (const [key, val] of Object.entries(tpl)) {
    if (SECRET_KEYS.has(key)) { addField(key); continue; }
    if (Object.prototype.hasOwnProperty.call(IDENTITY_TYPES, key)) {
      // region/cloud/platform: if the template value is a concrete enum, offer it.
      const opts = (IDENTITY_TYPES[key] === 'region' && typeof val === 'string' && val) ? [val] : [];
      addField(key, { options: opts });
      continue;
    }
    internalConfig[key] = val;       // everything else stays hidden
  }

  // Make sure auth-required fields exist even when absent from the template.
  authFields(authType).forEach((k) => addField(k));

  // Every connector also gets an explicit read-only confirmation field.
  fields.set('read_only_ack', {
    field_key: 'read_only_ack', label: 'I confirm these credentials are read-only',
    field_type: 'boolean', is_secret: false, required: true, options: [],
  });

  // Stable display order: URLs first, then ids, then secrets, ack last.
  const order = (f) => (f.field_key === 'read_only_ack' ? 99 : f.field_type === 'url' ? 0 : f.is_secret ? 2 : 1);
  const list = Array.from(fields.values())
    .sort((a, b) => order(a) - order(b))
    .map((f, i) => ({ ...f, display_order: i }));

  return { fields: list, internalConfig };
}

module.exports = { deriveFields, SECRET_KEYS, IDENTITY_TYPES };
