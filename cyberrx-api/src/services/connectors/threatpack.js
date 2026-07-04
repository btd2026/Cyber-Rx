'use strict';

// Shared helpers for threat-intel connectors: normalize an actor into the compact
// {n,t,m} shape the CISO threat panel renders, and pack the top actors into the
// `threat_actors_json` signal (a JSON string stored in signal_sync as text) so a
// live feed can repopulate the actor list — not just the count.
const { nowIso } = require('./http');

function actorObj(n, t, m) {
  return { n: String(n || '').slice(0, 60), t: String(t || 'Threat actor').slice(0, 50), m: String(m || '').slice(0, 180) };
}

function actorsSignal(list) {
  const top = (list || []).slice(0, 8);
  return { key: 'threat_actors_json', value: JSON.stringify(top), asOf: nowIso(), raw: { count: list ? list.length : 0 } };
}

module.exports = { actorObj, actorsSignal };
