'use strict';

/**
 * Collector coverage + safety invariants across ALL connectors. Guarantees:
 * every connector a control depends on has an evidence collector, each collector
 * has a clean shape, and none fabricates evidence from empty credentials.
 */

const fs = require('fs');
const path = require('path');
const { CONNECTOR_COLLECTORS } = require('../../src/control-assessment/collection/connectorCollectors');
const { REGISTRIES } = require('../../src/control-assessment/registries');

const COLLECTOR_DIR = path.join(__dirname, '../../src/control-assessment/collection/collectors');
const controlReferencedConnectors = () => {
  const s = new Set();
  Object.values(REGISTRIES).forEach((r) => Object.values(r.REGISTRY).forEach((c) => (c.supported_connectors || []).forEach((k) => s.add(k))));
  return [...s];
};

describe('collector coverage', () => {
  test('every connector a control depends on has an evidence collector', () => {
    const missing = controlReferencedConnectors().filter((k) => typeof CONNECTOR_COLLECTORS[k] !== 'function');
    expect(missing).toEqual([]);
  });

  test('all collectors are functions', () => {
    Object.keys(CONNECTOR_COLLECTORS).forEach((k) => expect(typeof CONNECTOR_COLLECTORS[k]).toBe('function'));
    expect(Object.keys(CONNECTOR_COLLECTORS).length).toBeGreaterThanOrEqual(34);
  });

  test('each collector file exports a key matching its filename', () => {
    fs.readdirSync(COLLECTOR_DIR).filter((f) => f.endsWith('.js')).forEach((f) => {
      const mod = require(path.join(COLLECTOR_DIR, f));
      expect(mod.key).toBe(f.replace(/\.js$/, ''));
      expect(typeof mod.collect).toBe('function');
    });
  });
});

describe('no fabrication', () => {
  const denyHttp = async () => ({ ok: false, status: 401, json: async () => ({}), text: async () => '' });

  test('every collector returns {} with empty creds (nothing invented)', async () => {
    for (const k of Object.keys(CONNECTOR_COLLECTORS)) {
      const out = await CONNECTOR_COLLECTORS[k]({ creds: {}, http: denyHttp, period: { start: '2026-04-01', end: '2026-06-30' } });
      expect(out && typeof out).toBe('object');
      expect(Object.keys(out).length).toBe(0);
    }
  });

  test('collectors never throw on an unreachable API (each call is isolated)', async () => {
    const throwHttp = async () => { throw new Error('network down'); };
    for (const k of Object.keys(CONNECTOR_COLLECTORS)) {
      await expect(CONNECTOR_COLLECTORS[k]({ creds: { baseUrl: 'https://x', token: 't', client_id: 'a', client_secret: 'b', tenantId: 't', clientId: 'a', clientSecret: 'b', orgUrl: 'https://x.okta.com', apiToken: 't' }, http: throwHttp, period: { start: '2026-04-01', end: '2026-06-30' } })).resolves.toBeDefined();
    }
  });
});
