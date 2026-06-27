'use strict';

/**
 * ingest/loadControlCorpus — Stage 2 entrypoint.
 * Builds and persists the §4 control corpus (800-53 spine + 800-53A
 * determinations + CSF 2.0 target + crosswalk) into control_corpus.
 * Run after load80053 / loadCsf80053 have populated requirement_crosswalks.
 *
 *   node -e "require('./src/utils/db').init().then(()=>require('./src/ingest/loadControlCorpus').load()).then(r=>{console.log(JSON.stringify(r,null,2));process.exit(0)})"
 */

const Corpus = require('../services/ControlCorpusService');

async function load() { return Corpus.load(); }

module.exports = { load };
