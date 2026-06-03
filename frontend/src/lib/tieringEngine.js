/**
 * Tiering Engine for Crown Jewel Classification
 *
 * Classifies processes into 4 tiers based on:
 * - Downtime cost per day
 * - Criticality level
 * - Regulatory impact (HIPAA)
 */

/**
 * Tier classification based on weighted scoring
 * @param {Object} process - Process object with downtime_cost, criticality, hipaa_required
 * @param {Object} benchmarkLibrary - Benchmark library for cost thresholds
 * @returns {Object} Tier classification with label, color, and rationale
 */
export const tieringEngine = (process, benchmarkLibrary) => {
  // Extract process factors
  const downtimeCost = process.downtime_cost_per_day?.estimated_value || 0;
  const criticality = process.criticality || 'standard';
  const hipaaRequired = process.hipaa_required || false;
  const processType = process.process_type || '';

  // Define weights (sum = 1.0)
  const weights = {
    downtime_cost: 0.50,
    criticality: 0.30,
    regulatory: 0.20
  };

  // Normalize downtime cost (0-1 scale, $10M max)
  const normalizedCost = Math.min(downtimeCost / 10000000, 1.0);

  // Normalize criticality (0-1 scale)
  const criticalityScore = {
    'crown-jewel': 1.0,
    'critical': 0.75,
    'important': 0.5,
    'standard': 0.25,
    'low': 0.1
  }[criticality] || 0.5;

  // Normalize regulatory impact (0-1 scale)
  const regulatoryScore = hipaaRequired ? 1.0 : 0.3;

  // Calculate weighted score (0-1)
  const tierScore =
    (normalizedCost * weights.downtime_cost) +
    (criticalityScore * weights.criticality) +
    (regulatoryScore * weights.regulatory);

  // Tier classification thresholds
  // Tier 1 (Crown Jewel): Score ≥ 0.8 OR downtime ≥ $5M
  // Tier 2 (Critical): Score ≥ 0.5 OR downtime ≥ $1M
  // Tier 3 (Important): Score ≥ 0.3
  // Tier 4 (Support): Score < 0.3

  let tier, label, color, rationale;

  if (tierScore >= 0.8 || downtimeCost >= 5000000) {
    tier = 'tier_1';
    label = 'Crown Jewel';
    color = 'red';

    const reasons = [];
    if (downtimeCost >= 5000000) {
      reasons.push(`$${(downtimeCost / 1000000).toFixed(1)}M/day downtime cost exceeds $5M threshold`);
    } else if (tierScore >= 0.8) {
      reasons.push(`high composite score (${(tierScore * 100).toFixed(0)}%)`);
    }
    if (criticality === 'crown-jewel') {
      reasons.push('business-critical designation');
    }
    if (hipaaRequired) {
      reasons.push('HIPAA required');
    }
    if (isCrownJewelProcess(processType)) {
      reasons.push('core payer process');
    }
    rationale = `Crown jewel due to ${reasons.join(' + ')}. Immediate executive attention required for outages.`;
  }
  else if (tierScore >= 0.5 || downtimeCost >= 1000000) {
    tier = 'tier_2';
    label = 'Critical';
    color = 'orange';

    const reasons = [];
    if (downtimeCost >= 1000000) {
      reasons.push(`$${(downtimeCost / 1000000).toFixed(1)}M/day downtime cost`);
    } else if (tierScore >= 0.5) {
      reasons.push(`moderate-high composite score (${(tierScore * 100).toFixed(0)}%)`);
    }
    if (hipaaRequired) {
      reasons.push('HIPAA impact');
    }
    rationale = `Critical system: ${reasons.join(' + ')}. Executive attention required for outages.`;
  }
  else if (tierScore >= 0.3) {
    tier = 'tier_3';
    label = 'Important';
    color = 'yellow';

    const reasons = [];
    reasons.push(`composite score ${(tierScore * 100).toFixed(0)}%`);
    if (downtimeCost >= 100000) {
      reasons.push(`$${(downtimeCost / 1000).toFixed(0)}K/day downtime cost`);
    }
    rationale = `Important system: ${reasons.join(' + ')}. Manager-level attention sufficient.`;
  }
  else {
    tier = 'tier_4';
    label = 'Support';
    color = 'green';

    const reasons = [];
    reasons.push(`low composite score (${(tierScore * 100).toFixed(0)}%)`);
    if (downtimeCost < 100000) {
      reasons.push(`low downtime cost ($${(downtimeCost / 1000).toFixed(0)}K/day)`);
    }
    rationale = `Support system: ${reasons.join(' + ')}. Normal operational procedures apply.`;
  }

  return {
    tier,
    label,
    color,
    tier_score: tierScore,
    rationale,
    factors: {
      downtime_cost: {
        value: downtimeCost,
        normalized: normalizedCost,
        weight: weights.downtime_cost,
        contribution: normalizedCost * weights.downtime_cost
      },
      criticality: {
        value: criticality,
        normalized: criticalityScore,
        weight: weights.criticality,
        contribution: criticalityScore * weights.criticality
      },
      regulatory: {
        value: hipaaRequired,
        normalized: regulatoryScore,
        weight: weights.regulatory,
        contribution: regulatoryScore * weights.regulatory
      }
    }
  };
};

/**
 * Check if process type is a crown jewel process
 * @param {string} processType - Process type identifier
 * @returns {boolean}
 */
const isCrownJewelProcess = (processType) => {
  const crownJewelProcesses = [
    'claims-adjudication',
    'claims-intake',
    'claims-auto-adjudication',
    'claims-payment-determination',
    'edi-gateway',
    'x12-translator',
    'payment-processing',
    'payment-generation',
    'pharmacy-benefits',
    'pharmacy-claims-adjudication'
  ];

  return crownJewelProcesses.includes(processType);
};

/**
 * Calculate tier for all processes in a mapping
 * @param {Array} processes - Array of process objects
 * @param {Object} benchmarkLibrary - Benchmark library
 * @returns {Object} Tiered processes with counts
 */
export const calculateAllTiers = (processes, benchmarkLibrary = {}) => {
  const tieredProcesses = {
    tier_1: [],
    tier_2: [],
    tier_3: [],
    tier_4: []
  };

  const systems = processes.map(process => {
    const tierResult = tieringEngine(process, benchmarkLibrary);

    const system = {
      id: process.id,
      name: process.name,
      process_type: process.process_type,
      ...tierResult,
      downtime_cost: process.downtime_cost_per_day?.estimated_value || 0,
      applications: process.applications || [],
      tier_rationale: tierResult.rationale
    };

    tieredProcesses[tierResult.tier].push(system);

    return system;
  });

  const tierCounts = {
    tier_1: tieredProcesses.tier_1.length,
    tier_2: tieredProcesses.tier_2.length,
    tier_3: tieredProcesses.tier_3.length,
    tier_4: tieredProcesses.tier_4.length
  };

  return {
    systems,
    tier_counts: tierCounts,
    total_count: systems.length,
    tiered: tieredProcesses
  };
};

/**
 * Get tier definition by tier ID
 * @param {string} tier - Tier ID (tier_1, tier_2, etc.)
 * @returns {Object} Tier definition
 */
export const getTierDefinition = (tier) => {
  const definitions = {
    tier_1: {
      label: "Crown Jewel",
      description: "Business-critical. Outage halts revenue. Immediate executive attention.",
      criteria: {
        downtime_cost: "≥ $5M/day OR",
        regulatory_impact: "HIPAA required OR",
        business_impact: "Stops claims/payment processing"
      },
      examples: [
        "Claims Adjudication System",
        "EDI Gateway / X12 Translator"
      ],
      sla_requirement: "99.99% uptime (≤ 52 minutes/year downtime)",
      disaster_recovery: "Active-active with < 15 minute RTO",
      color: "red"
    },
    tier_2: {
      label: "Critical",
      description: "High impact but business can operate temporarily. Executive attention required.",
      criteria: {
        downtime_cost: "$1M - $5M/day OR",
        regulatory_impact: "Important for compliance OR",
        business_impact: "Significant operational disruption"
      },
      examples: [
        "Payment Processing",
        "Provider Data Management",
        "Pharmacy Benefit Management"
      ],
      sla_requirement: "99.9% uptime (≤ 8.7 hours/year downtime)",
      disaster_recovery: "Active-passive with < 4 hour RTO",
      color: "orange"
    },
    tier_3: {
      label: "Important",
      description: "Moderate impact. Workarounds available. Manager-level attention.",
      criteria: {
        downtime_cost: "$100K - $1M/day",
        business_impact: "Operational inconvenience"
      },
      examples: [
        "Care Management",
        "Analytics & Reporting",
        "Member Services"
      ],
      sla_requirement: "99% uptime (≤ 3.6 days/year downtime)",
      disaster_recovery: "Backups with < 24 hour RTO",
      color: "yellow"
    },
    tier_4: {
      label: "Support",
      description: "Low impact. No immediate revenue impact. Normal operations.",
      criteria: {
        downtime_cost: "< $100K/day",
        business_impact: "Minimal disruption"
      },
      examples: [
        "Internal Tools",
        "Archive Systems",
        "Development Environments"
      ],
      sla_requirement: "95% uptime (≤ 18 days/year downtime)",
      disaster_recovery: "Backups with < 72 hour RTO",
      color: "green"
    }
  };

  return definitions[tier] || definitions.tier_4;
};

/**
 * Validate tier calculation for debugging
 * @param {Object} process - Process object
 * @param {Object} tierResult - Result from tieringEngine
 * @returns {Object} Validation details
 */
export const validateTierCalculation = (process, tierResult) => {
  const { factors, tier_score, tier } = tierResult;

  return {
    process_id: process.id,
    process_name: process.name,
    tier_assigned: tier,
    tier_score,
    factor_breakdown: {
      downtime_cost: {
        raw_value: factors.downtime_cost.value,
        normalized: factors.downtime_cost.normalized.toFixed(3),
        weight: factors.downtime_cost.weight,
        contribution: factors.downtime_cost.contribution.toFixed(3)
      },
      criticality: {
        raw_value: factors.criticality.value,
        normalized: factors.criticality.normalized.toFixed(3),
        weight: factors.criticality.weight,
        contribution: factors.criticality.contribution.toFixed(3)
      },
      regulatory: {
        raw_value: factors.regulatory.value,
        normalized: factors.regulatory.normalized.toFixed(3),
        weight: factors.regulatory.weight,
        contribution: factors.regulatory.contribution.toFixed(3)
      }
    },
    total_score_check: (
      factors.downtime_cost.contribution +
      factors.criticality.contribution +
      factors.regulatory.contribution
    ).toFixed(3),
    threshold_check: {
      score_meets_tier_1: tier_score >= 0.8,
      downtime_meets_tier_1: factors.downtime_cost.value >= 5000000,
      score_meets_tier_2: tier_score >= 0.5,
      downtime_meets_tier_2: factors.downtime_cost.value >= 1000000,
      score_meets_tier_3: tier_score >= 0.3
    }
  };
};
