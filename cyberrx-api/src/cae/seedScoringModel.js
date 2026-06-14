'use strict';

/**
 * cae/seedScoringModel — load the Scoring_Model + Evidence_Schema config from the
 * in-repo JSON into cae_scoring_model / cae_evidence_schema. INTERNAL config.
 * Idempotent (truncate + reload, tiny tables).
 */

const fs = require('fs');
const path = require('path');
const db = require('../utils/db');
const schema = require('./schema');

const DATA_DIR = path.join(__dirname, '..', 'data', 'cae');
const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));

async function seed() {
  await schema.init();
  const sm = read('scoring_model.json');
  const es = read('evidence_schema.json');
  await db.query('DELETE FROM cae_scoring_model');
  for (const r of sm) {
    await db.query(
      'INSERT INTO cae_scoring_model (component, weight, description, formula) VALUES ($1,$2,$3,$4)',
      [r.Score_Component, Number(r.Weight) || 0, r.Description || null, r['Generic Formula / Logic'] || null]);
  }
  await db.query('DELETE FROM cae_evidence_schema');
  for (const r of es) {
    await db.query(
      'INSERT INTO cae_evidence_schema (object, field, type, required, description, example) VALUES ($1,$2,$3,$4,$5,$6)',
      [r.Object, r.Field, r.Type, r.Required, r.Description, String(r.Example == null ? '' : r.Example)]);
  }
  return { scoringComponents: sm.length, evidenceFields: es.length };
}

module.exports = { seed };

if (require.main === module) {
  db.init().then(seed).then((s) => { console.log('seedScoringModel:', JSON.stringify(s)); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}
