'use strict';

/**
 * cae/projection — the privacy boundary. Every value that reaches a normal user
 * passes through here. It WHITELISTS the user-safe fields and drops everything
 * internal (endpoints, settings JSON, scopes, internal config, validation /
 * scoring logic, mappings, raw evidence).
 *
 * Rule of thumb: if a field is not explicitly listed below, the user never sees it.
 */

// Tool: user sees category + name only.
function projectTool(row) {
  if (!row) return null;
  return { category: row.category, name: row.name, has_connector: !!row.has_connector };
}

// Connection field: user sees label/type/required/secret — never the raw key’s purpose,
// endpoint, or internal config. (field_key is a UI form key only, no logic leaks.)
function projectConnectorField(f) {
  if (!f) return null;
  return {
    key: f.field_key,
    label: f.label,
    type: f.field_type,            // url | text | secret | region | boolean
    required: !!f.required,
    secret: !!f.is_secret,
    options: Array.isArray(f.options_json) ? f.options_json : (Array.isArray(f.options) ? f.options : []),
  };
}

// Connection status: user sees status + a sanitized message only. Never the
// vault ref, internal config, or raw vendor error.
function projectConnectionStatus(row) {
  if (!row) return null;
  return {
    tool_name: row.tool_name,
    status: row.status,                                   // not_connected|connecting|connected|failed
    message: row.last_error_sanitized || null,
    last_checked: row.last_health_check || null,
  };
}

module.exports = { projectTool, projectConnectorField, projectConnectionStatus };
