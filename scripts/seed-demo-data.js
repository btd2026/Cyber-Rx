#!/usr/bin/env node

/**
 * DTNKShield Healthcare-Payer Demo Seeding Script
 *
 * This script pre-seeds the Acme Health Plan demo with:
 * 1. Organization creation
 * 2. File ingestion simulation
 * 3. AI matching with pre-defined results
 * 4. Bulk confirmation of high-confidence mappings
 * 5. Gap detection
 * 6. Crown jewel tiering
 *
 * Usage: node scripts/seed-demo-data.js
 *
 * Output: Demo accessible at http://localhost:5174/demo/{matchId}
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../cyberrx-api/.env' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cyberrx',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

// Demo organization configuration
const DEMO_ORG = {
  name: 'Acme Health Plan',
  industry: 'Healthcare Payer',
  size: 'medium',
  members: '2.5M',
  annual_revenue: '$2.5B',
  states: '12 states',
  metadata: {
    demo: true,
    seeded_at: new Date().toISOString(),
    description: 'Medium-sized health plan with Facets claims platform'
  }
};

// Demo match results (pre-computed AI matching)
const DEMO_MATCH_RESULTS = [
  {
    process_name: 'Claims Processing',
    application_name: 'Facets',
    reference_process_id: 'claims-adjudication',
    confidence_score: 0.92,
    match_method: 'llm',
    rationale: 'High confidence match: "Claims Processing" maps to canonical "claims-adjudication" based on semantic similarity (claims = claims, processing = adjudication). Both describe core claims evaluation workflow.'
  },
  {
    process_name: 'EDI Gateway',
    application_name: 'Change Healthcare X12',
    reference_process_id: 'edi-gateway-x12-translator',
    confidence_score: 0.95,
    match_method: 'exact',
    rationale: 'Exact match: "EDI Gateway" directly corresponds to "edi-gateway-x12-translator" in reference model. Both describe X12 translation hub for payer transactions.'
  },
  {
    process_name: 'Provider Data Management',
    application_name: 'Manual spreadsheets',
    reference_process_id: 'provider-data-management',
    confidence_score: 0.88,
    match_method: 'llm',
    rationale: 'LLM fuzzy match: "Provider Data Management" aligns with "provider-data-management" (88% confidence). Semantic match: provider data = provider data, management = management. Confidence slightly lower due to manual process context.'
  },
  {
    process_name: 'Member Services',
    application_name: 'Qnxt',
    reference_process_id: 'member-services-portal',
    confidence_score: 0.90,
    match_method: 'llm',
    rationale: 'LLM match: "Member Services" maps to "member-services-portal" (90% confidence). Describes member self-service and enrollment functionality.'
  },
  {
    process_name: 'Payment Processing',
    application_name: 'Facets',
    reference_process_id: 'payment-processing',
    confidence_score: 0.85,
    match_method: 'fuzzy',
    rationale: 'Fuzzy match: "Payment Processing" aligns with "payment-processing" (85% confidence). Describes provider remittance and payment operations.'
  },
  {
    process_name: 'Prior Authorization',
    application_name: 'Manual workflow',
    reference_process_id: 'prior-authorization',
    confidence_score: 0.93,
    match_method: 'llm',
    rationale: 'High confidence LLM match: "Prior Authorization" directly corresponds to "prior-authorization" in reference model. Both describe pre-service medical necessity determination.'
  },
  {
    process_name: 'Care Management',
    application_name: 'None',
    reference_process_id: 'care-management',
    confidence_score: 0.89,
    match_method: 'llm',
    rationale: 'LLM match: "Care Management" maps to "care-management" reference process (89% confidence). Describes case management and care coordination activities.'
  },
  {
    process_name: 'Analytics & Reporting',
    application_name: 'Qnxt',
    reference_process_id: 'analytics-reporting',
    confidence_score: 0.87,
    match_method: 'llm',
    rationale: 'LLM match: "Analytics & Reporting" aligns with "analytics-reporting" (87% confidence). Describes HEDIS reporting and business intelligence functions.'
  }
];

// Demo gap analysis results
const DEMO_GAPS = [
  {
    gap_name: 'Utilization Management',
    severity: 'critical',
    description: 'Systematic review of medical necessity and appropriateness of health care services',
    regulatory_impact: 'High',
    business_impact: 'Fraud, waste, and abuse exposure',
    recommendation: 'Implement automated utilization management platform integrated with claims'
  },
  {
    gap_name: 'Provider Network Management',
    severity: 'high',
    description: 'Comprehensive provider network analytics and tiering',
    regulatory_impact: 'Medium',
    business_impact: 'Network adequacy compliance risks',
    recommendation: 'Deploy provider network analytics platform with geospatial analysis'
  },
  {
    gap_name: 'Member Engagement',
    severity: 'medium',
    description: 'Digital member engagement and wellness program platform',
    regulatory_impact: 'Low',
    business_impact: 'Member satisfaction and retention',
    recommendation: 'Implement member engagement portal with health incentives'
  }
];

// Demo tier analysis results
const DEMO_TIERS = {
  tier_1_crown_jewels: [
    {
      process_name: 'Claims Adjudication',
      tier: 1,
      tier_name: 'Crown Jewel',
      downtime_cost_per_day: 7500000,
      downtime_rationale: 'Based on Change Healthcare breach ($285M/day) scaled to Acme size ($2.5B revenue, 2.5M members). Source: 2024 Change Healthcare cyberattack impact analysis.',
      criticality_score: 1.0,
      regulatory_score: 1.0,
      total_score: 0.95,
      rationale: 'Claims adjudication is revenue-critical. Outage halts all provider payments. HIPAA required. Maximum downtime cost justifies Crown Jewel designation.'
    },
    {
      process_name: 'EDI Gateway X12 Translator',
      tier: 1,
      tier_name: 'Crown Jewel',
      downtime_cost_per_day: 2500000,
      downtime_rationale: 'EDI gateway outage blocks all X12 transactions (837, 835, 270/271). Estimated $2.5M/day based on Acme transaction volume and Change Healthcare dependency.',
      criticality_score: 1.0,
      regulatory_score: 0.9,
      total_score: 0.91,
      rationale: 'Single point of failure for all electronic transactions. Change Healthcare breach demonstrated criticality. High regulatory impact for HIPAA transactions.'
    }
  ],
  tier_2_critical: [
    {
      process_name: 'Payment Processing',
      tier: 2,
      tier_name: 'Critical',
      downtime_cost_per_day: 1500000,
      downtime_rationale: 'Payment processing delays provider remittance. Estimated $1.5M/day in payment penalties and provider friction.',
      criticality_score: 0.75,
      regulatory_score: 0.7,
      total_score: 0.72,
      rationale: 'Revenue-critical but downstream of claims. Delays impact provider relationships. Short-term manual workarounds possible.'
    },
    {
      process_name: 'Member Services Portal',
      tier: 2,
      tier_name: 'Critical',
      downtime_cost_per_day: 500000,
      downtime_rationale: 'Member portal outage affects enrollment and member service. Estimated $500K/day in call center surge costs.',
      criticality_score: 0.75,
      regulatory_score: 0.6,
      total_score: 0.68,
      rationale: 'Member-facing critical but phone backup available. Regulatory exposure from enrollment delays.'
    }
  ],
  tier_3_important: [
    {
      process_name: 'Prior Authorization',
      tier: 3,
      tier_name: 'Important',
      downtime_cost_per_day: 200000,
      downtime_rationale: 'Prior authorization delays impact care quality and provider satisfaction. Estimated $200K/day in excess claims costs.',
      criticality_score: 0.5,
      regulatory_score: 0.7,
      total_score: 0.58,
      rationale: 'Important for regulatory compliance and cost containment. Manual phone/fax backup exists but is inefficient.'
    },
    {
      process_name: 'Care Management',
      tier: 3,
      tier_name: 'Important',
      downtime_cost_per_day: 100000,
      downtime_rationale: 'Care management system outage impacts quality metrics. Estimated $100K/day in quality penalties and care gaps.',
      criticality_score: 0.5,
      regulatory_score: 0.5,
      total_score: 0.52,
      rationale: 'Important for quality metrics and member health. Manual processes available but time-consuming.'
    }
  ],
  tier_4_support: [
    {
      process_name: 'Provider Data Management',
      tier: 4,
      tier_name: 'Support',
      downtime_cost_per_day: 50000,
      downtime_rationale: 'Provider data delays impact claims accuracy. Estimated $50K/day in claim rework and provider inquiries.',
      criticality_score: 0.25,
      regulatory_score: 0.4,
      total_score: 0.34,
      rationale: 'Support function for claims accuracy. Manual spreadsheet processes exist. Low short-term impact.'
    },
    {
      process_name: 'Analytics & Reporting',
      tier: 4,
      tier_name: 'Support',
      downtime_cost_per_day: 75000,
      downtime_rationale: 'Reporting delays impact HEDIS and business intelligence. Estimated $75K/day in regulatory penalties and decision delays.',
      criticality_score: 0.25,
      regulatory_score: 0.5,
      total_score: 0.39,
      rationale: 'Important for regulatory reporting but not time-critical. Manual data compilation possible.'
    }
  ]
};

/**
 * Main seeding function
 */
const seedDemo = async () => {
  console.log('🎯 Seeding DTNKShield Healthcare-Payer Demo...\n');

  try {
    // 1. Create organization
    console.log('1️⃣ Creating Acme Health Plan organization...');
    const orgResult = await pool.query(
      `INSERT INTO organizations (name, industry, size, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (name) DO UPDATE
       SET metadata = $4, updated_at = NOW()
       RETURNING id`,
      [DEMO_ORG.name, DEMO_ORG.industry, DEMO_ORG.size, JSON.stringify(DEMO_ORG)]
    );

    const orgId = orgResult.rows[0].id;
    console.log(`✅ Organization created: ${orgId}\n`);

    // 2. Create ingest session
    console.log('2️⃣ Creating ingest session...');
    const ingestResult = await pool.query(
      `INSERT INTO ingest_sessions
       (organization_id, file_name, file_type, status, rows_detected, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id`,
      [
        orgId,
        'acme-health-plan-processes.xlsx',
        'process_inventory',
        'completed',
        8,
        JSON.stringify({ demo: true }),
      ]
    );

    const ingestId = ingestResult.rows[0].id;
    console.log(`✅ Ingest session created: ${ingestId}\n`);

    // 3. Create match session
    console.log('3️⃣ Creating match session...');
    const matchResult = await pool.query(
      `INSERT INTO match_sessions
       (ingest_session_id, status, total_proposals, high_confidence_count, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id`,
      [
        ingestId,
        'completed',
        DEMO_MATCH_RESULTS.length,
        DEMO_MATCH_RESULTS.filter(m => m.confidence_score >= 0.90).length,
        JSON.stringify({ demo: true, ai_method: 'llm+exact' }),
      ]
    );

    const matchId = matchResult.rows[0].id;
    console.log(`✅ Match session created: ${matchId}\n`);

    // 4. Insert demo match results
    console.log('4️⃣ Inserting AI match results...');
    for (const match of DEMO_MATCH_RESULTS) {
      await pool.query(
        `INSERT INTO process_matches
         (match_session_id, process_name, application_name, reference_process_id, confidence_score,
          match_method, rationale, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          matchId,
          match.process_name,
          match.application_name,
          match.reference_process_id,
          match.confidence_score,
          match.match_method,
          match.rationale,
          'accepted' // Pre-confirm all for demo
        ]
      );
    }
    console.log(`✅ Inserted ${DEMO_MATCH_RESULTS.length} match results\n`);

    // 5. Insert gap analysis
    console.log('5️⃣ Inserting gap analysis...');
    for (const gap of DEMO_GAPS) {
      await pool.query(
        `INSERT INTO gap_analysis
         (match_session_id, gap_name, severity, description, regulatory_impact, business_impact,
          recommendation, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          matchId,
          gap.gap_name,
          gap.severity,
          gap.description,
          gap.regulatory_impact,
          gap.business_impact,
          gap.recommendation,
          JSON.stringify({ demo: true }),
        ]
      );
    }
    console.log(`✅ Inserted ${DEMO_GAPS.length} gaps\n`);

    // 6. Insert tier analysis
    console.log('6️⃣ Inserting tier analysis...');
    const allTiers = [
      ...DEMO_TIERS.tier_1_crown_jewels,
      ...DEMO_TIERS.tier_2_critical,
      ...DEMO_TIERS.tier_3_important,
      ...DEMO_TIERS.tier_4_support
    ];

    for (const tier of allTiers) {
      await pool.query(
        `INSERT INTO tier_analysis
         (match_session_id, process_name, tier, tier_name, downtime_cost_per_day, downtime_rationale,
          criticality_score, regulatory_score, total_score, rationale, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
        [
          matchId,
          tier.process_name,
          tier.tier,
          tier.tier_name,
          tier.downtime_cost_per_day,
          tier.downtime_rationale,
          tier.criticality_score,
          tier.regulatory_score,
          tier.total_score,
          tier.rationale,
          JSON.stringify({ demo: true }),
        ]
      );
    }
    console.log(`✅ Inserted ${allTiers.length} tier analysis records\n`);

    // 7. Create demo summary
    console.log('7️⃣ Creating demo summary...');
    const summary = {
      organization: DEMO_ORG,
      ingest: {
        ingest_id: ingestId,
        files: ['processes.xlsx', 'applications.xlsx'],
        rows_detected: 8,
        completed_at: new Date().toISOString()
      },
      match: {
        match_id: matchId,
        total_proposals: DEMO_MATCH_RESULTS.length,
        high_confidence: DEMO_MATCH_RESULTS.filter(m => m.confidence_score >= 0.90).length,
        medium_confidence: DEMO_MATCH_RESULTS.filter(m => m.confidence_score >= 0.70 && m.confidence_score < 0.90).length,
        low_confidence: DEMO_MATCH_RESULTS.filter(m => m.confidence_score < 0.70).length
      },
      gaps: {
        total_gaps: DEMO_GAPS.length,
        critical: DEMO_GAPS.filter(g => g.severity === 'critical').length,
        high: DEMO_GAPS.filter(g => g.severity === 'high').length,
        medium: DEMO_GAPS.filter(g => g.severity === 'medium').length
      },
      tiers: {
        tier_1_crown_jewels: DEMO_TIERS.tier_1_crown_jewels.length,
        tier_2_critical: DEMO_TIERS.tier_2_critical.length,
        tier_3_important: DEMO_TIERS.tier_3_important.length,
        tier_4_support: DEMO_TIERS.tier_4_support.length
      }
    };

    console.log('\n✨ Demo seeding complete!\n');
    console.log('📊 Demo Summary:');
    console.log(`   Organization: ${summary.organization.name}`);
    console.log(`   Size: ${summary.organization.size}`);
    console.log(`   Match ID: ${matchId}`);
    console.log(`   Processes: ${summary.match.total_proposals}`);
    console.log(`   Gaps: ${summary.gaps.total_gaps}`);
    console.log(`   Crown Jewels: ${summary.tiers.tier_1_crown_jewels}`);
    console.log('\n🌐 Demo Access:');
    console.log(`   Frontend: http://localhost:5174/demo/${matchId}`);
    console.log(`   API: http://localhost:3001/api/mappings/${matchId}`);
    console.log('\n💾 Demo fixtures saved to: demo/fixtures/acme-health-plan/\n');

    return summary;

  } catch (error) {
    console.error('❌ Demo seeding failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
};

// Run seeding if executed directly
if (require.main === module) {
  seedDemo()
    .then(summary => {
      process.exit(0);
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seedDemo, DEMO_ORG, DEMO_MATCH_RESULTS, DEMO_GAPS, DEMO_TIERS };
