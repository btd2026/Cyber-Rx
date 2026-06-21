'use strict';

/**
 * Canonical public-demo organization allowlist.
 *
 * Unauthenticated visitors may explore ONLY these orgs (the public sales demo).
 * Every other org requires an authenticated, org-scoped token. This is the single
 * source of truth used by the tenant-isolation middleware so we never trust an
 * arbitrary X-Org-Id from an anonymous caller.
 *
 * Override in production via PUBLIC_DEMO_ORG_IDS (comma-separated).
 */
const DEFAULT_DEMO_ORG_IDS = [
  'blue-cross-blue-shield-of-massachusetts',
  'cigna-healthcare',
  'meridian-health-plan-demo',
];

const DEMO_ORG_IDS = process.env.PUBLIC_DEMO_ORG_IDS
  ? process.env.PUBLIC_DEMO_ORG_IDS.split(',').map((s) => s.trim()).filter(Boolean)
  : DEFAULT_DEMO_ORG_IDS;

const isDemoOrg = (id) => !!id && DEMO_ORG_IDS.includes(String(id));

module.exports = { DEMO_ORG_IDS, isDemoOrg };
