const express = require('express');
const router = express.Router();
const tieringController = require('../controllers/tieringController');

/**
 * Tier Analysis Routes
 * Provides crown jewel classification and tier analysis for mapped processes
 */

/**
 * GET /api/mappings/:matchId/tier-analysis
 * Get tier analysis for all processes in a mapping
 *
 * Query params:
 * - processType: Filter by process type (optional)
 * - tier: Filter by tier (optional)
 *
 * Response:
 * {
 *   "systems": [
 *     {
 *       "id": "claims-adjudication",
 *       "name": "Claims Adjudication",
 *       "tier": "tier_1",
 *       "tier_label": "Crown Jewel",
 *       "tier_score": 0.92,
 *       "downtime_cost": 15000000,
 *       "applications": [...],
 *       "tier_rationale": "Crown jewel due to $15M/day downtime cost + HIPAA required + business-critical operations"
 *     }
 *   ],
 *   "tier_counts": {
 *     "tier_1": 2,
 *     "tier_2": 5,
 *     "tier_3": 8,
 *     "tier_4": 10
 *   },
 *   "total_count": 25
 * }
 */
router.get('/mappings/:matchId/tier-analysis', tieringController.getTierAnalysis);

/**
 * GET /api/mappings/:matchId/tier-analysis/:processId
 * Get detailed tier analysis for a specific process
 *
 * Response:
 * {
 *   "process": { ... },
 *   "tier_result": { ... },
 *   "factor_breakdown": { ... },
 *   "validation": { ... }
 * }
 */
router.get('/mappings/:matchId/tier-analysis/:processId', tieringController.getProcessTierDetails);

/**
 * POST /api/mappings/:matchId/recalculate-tiers
 * Recalculate tiers for all processes (e.g., after benchmark update)
 *
 * Body:
 * {
 *   "benchmarkLibrary": { ... }, // Optional: override default benchmarks
 * }
 *
 * Response:
 * {
 *   "systems": [...],
 *   "tier_counts": { ... },
 *   "total_count": 25,
 *   "recalculated_at": "2025-06-03T..."
 * }
 */
router.post('/mappings/:matchId/recalculate-tiers', tieringController.recalculateTiers);

/**
 * GET /api/tier-definitions
 * Get tier definitions and criteria
 *
 * Response:
 * {
 *   "tier_1": {
 *     "label": "Crown Jewel",
 *     "description": "...",
 *     "criteria": { ... },
 *     "examples": [...],
 *     "sla_requirement": "...",
 *     "disaster_recovery": "..."
 *   },
 *   ...
 * }
 */
router.get('/tier-definitions', tieringController.getTierDefinitions);

module.exports = router;
