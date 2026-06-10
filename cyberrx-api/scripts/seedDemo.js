'use strict';

/**
 * CLI entry point for the executive-brief demo seeder.
 *
 *   npm run seed:demo            # seed if empty, then regenerate briefs
 *   npm run seed:demo -- --force # re-run the SQL even if data exists
 *   npm run seed:demo -- --org=<orgId>
 */

require('dotenv').config();
const { seedExecutiveDemo, DEMO_ORG_ID } = require('../src/utils/seedDemo');

const args = process.argv.slice(2);
const force = args.includes('--force');
const orgArg = args.find((a) => a.startsWith('--org='));
const orgId = orgArg ? orgArg.split('=')[1] : DEMO_ORG_ID;

seedExecutiveDemo({ force, orgId })
  .then((briefs) => {
    console.log(`Seeded demo data and regenerated ${briefs.length} executive briefs for ${orgId}.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Demo seed failed:', err.message);
    process.exit(1);
  });
