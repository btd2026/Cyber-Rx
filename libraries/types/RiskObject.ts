/**
 * RiskObject - Core risk data structure for CyberRX platform.
 *
 * This is the canonical representation of risk that flows through the entire system.
 * All connectors normalize their data to this schema before publishing to the event bus.
 *
 * CRITICAL: This is the core data structure. Get this right, everything else becomes easier.
 *
 * @packageDocumentation
 */

/**
 * Risk category classification.
 */
export enum RiskCategory {
  THREAT = "threat",
  VULNERABILITY = "vulnerability",
  COMPLIANCE = "compliance",
  VENDOR = "vendor",
  OPERATIONAL = "operational"
}

/**
 * Current status of the risk.
 */
export enum RiskStatus {
  ACTIVE = "active",
  REMEDIATED = "remediated",
  ACCEPTED = "accepted",
  ESCALATED = "escalated"
}

/**
 * Audit trail for how a risk object was created and enriched.
 *
 * CRITICAL: This enables CFO board-meeting defensibility by tracking
 * every step of the normalization and enrichment process.
 */
export interface MethodologyTrail {
  /** Sequential steps taken to normalize this risk */
  normalization_steps: string[];
  /** Timestamps for each enrichment operation */
  enrichment_timestamps: string[];
  /** Data sources that contributed to this risk object */
  data_sources: string[];
  /** Calculation methods used (e.g., "blast_radius_algorithm_v1") */
  calculation_methods: string[];
  /** Key assumptions made during normalization */
  assumptions: string[];
  /** Confidence scores for each major step */
  confidence_scores: number[];
}

/**
 * Regulatory trigger associated with a risk.
 */
export interface Regulation {
  /** Unique regulation identifier (e.g., "CMS-10743") */
  regulation_id: string;
  /** Regulation name (e.g., "HIPAA 45 CFR §164.312") */
  name: string;
  /** Specific obligation triggered by this risk */
  obligation: string;
  /** Deadline for compliance (ISO 8601) */
  deadline: string;
  /** Current compliance status */
  status: "compliant" | "at_risk" | "non_compliant";
  /** Whether notification to regulators is required */
  notification_required: boolean;
  /** Timeline for notification (e.g., "60 days") */
  notification_timeline: string;
  /** CMS form required if applicable (e.g., "CMS-10743") */
  cms_form_required?: string;
}

/**
 * Threshold breach associated with a risk.
 */
export interface Threshold {
  /** Unique threshold identifier */
  threshold_id: string;
  /** Human-readable threshold name */
  threshold_name: string;
  /** Type of threshold breached */
  threshold_type: "risk_score" | "financial_exposure" | "trend" | "custom";
  /** Threshold value that was breached */
  threshold_value: number;
  /** Actual value that triggered the breach */
  actual_value: number;
  /** Severity of the breach */
  severity: "low" | "medium" | "high" | "critical";
  /** When the threshold was breached (ISO 8601) */
  triggered_at: string;
  /** Whether the breach has been acknowledged */
  acknowledged: boolean;
  /** Who acknowledged the breach */
  acknowledged_by?: string;
  /** When the breach was acknowledged (ISO 8601) */
  acknowledged_at?: string;
}

/**
 * Core risk data structure that flows through the entire CyberRX system.
 *
 * This is the canonical representation of risk. All connectors normalize
 * their data to this schema before publishing to the event bus.
 *
 * CRITICAL FIELDS:
 * - financial_exposure: Must be CFO board-meeting defensible
 * - methodology_trail: Complete audit trail for all calculations
 * - business_process_map: Links to business process graph for impact analysis
 * - blast_radius: Downstream systems reachable by this risk
 *
 * @example
 * ```typescript
 * const riskObject: RiskObject = {
 *   id: "uuid",
 *   source: "splunk",
 *   source_event_id: "splunk-event-123",
 *   category: RiskCategory.THREAT,
 *   affected_assets: ["server-1", "server-2"],
 *   business_process_map: ["claims-adjudication"],
 *   likelihood_score: 0.8,
 *   blast_radius: ["database-1", "edi-gateway"],
 *   financial_exposure: { ... },
 *   regulatory_triggers: [ ... ],
 *   threshold_breaches: [ ... ],
 *   remediation_owner: "security-team",
 *   status: RiskStatus.ACTIVE,
 *   created_at: "2025-06-05T12:00:00Z",
 *   updated_at: "2025-06-05T12:00:00Z",
 *   first_detected_at: "2025-06-05T12:00:00Z",
 *   confidence: 0.9,
 *   methodology_trail: { ... },
 *   normalization_notes: "Normalized from Splunk alert format"
 * };
 * ```
 */
export interface RiskObject {
  // Identity
  /** Unique identifier (UUID) */
  id: string;
  /** Connector that produced this risk (e.g., "splunk", "crowdstrike") */
  source: string;
  /** Original event ID from source system */
  source_event_id: string;
  /** Risk category classification */
  category: RiskCategory;

  // What's affected
  /** Systems, assets, hostnames, IPs affected by this risk */
  affected_assets: string[];
  /** Business process IDs impacted (links to BusinessProcessGraph) */
  business_process_map: string[];

  // Risk assessment
  /** Probability of exploitation (0.0 - 1.0) */
  likelihood_score: number;
  /** Downstream systems reachable from affected assets */
  blast_radius: string[];
  /** Financial impact calculation (CFO board-meeting defensible) */
  financial_exposure: FinancialImpact;
  /** Regulatory obligations triggered by this risk */
  regulatory_triggers: Regulation[];
  /** Thresholds breached by this risk */
  threshold_breaches: Threshold[];

  // Resolution
  /** Team or person responsible for remediation */
  remediation_owner: string;
  /** Current status of the risk */
  status: RiskStatus;

  // Metadata
  /** When this risk object was created (ISO 8601) */
  created_at: string;
  /** When this risk object was last updated (ISO 8601) */
  updated_at: string;
  /** When the risk was first detected (ISO 8601) */
  first_detected_at: string;
  /** Confidence in the assessment (0.0 - 1.0) */
  confidence: number;

  // Audit trail
  /** Complete methodology trail for CFO defensibility */
  methodology_trail: MethodologyTrail;
  /** Notes on normalization from source format */
  normalization_notes: string;
}

/**
 * Forward declaration for FinancialImpact.
 * This will be imported from the FinancialImpact module.
 */
export interface FinancialImpact {
  mlr_impact: number;
  mlr_impact_confidence: number;
  stop_loss_exposure: number;
  stop_loss_attachment: number;
  stop_loss_aggregate: number;
  stop_loss_remaining: number;
  reserve_at_risk: number;
  reserve_type: string;
  premium_revenue_risk: number;
  line_of_business: string;
  total_exposure: number;
  total_exposure_confidence: number;
  methodology: string;
  methodology_version: string;
  calculation_timestamp: string;
  sources: any[];
  assumptions: string[];
}

/**
 * Validate RiskObject constraints.
 *
 * @param riskObject - The risk object to validate
 * @throws {Error} If validation fails
 * @returns True if validation passes
 */
export function validateRiskObject(riskObject: RiskObject): boolean {
  // Check score ranges
  if (riskObject.likelihood_score < 0 || riskObject.likelihood_score > 1) {
    throw new Error(`Invalid likelihood_score: ${riskObject.likelihood_score}`);
  }
  if (riskObject.confidence < 0 || riskObject.confidence > 1) {
    throw new Error(`Invalid confidence: ${riskObject.confidence}`);
  }

  // Check required fields
  if (!riskObject.affected_assets || riskObject.affected_assets.length === 0) {
    throw new Error("affected_assets cannot be empty");
  }
  if (!riskObject.business_process_map || riskObject.business_process_map.length === 0) {
    throw new Error("business_process_map cannot be empty");
  }
  if (!riskObject.remediation_owner) {
    throw new Error("remediation_owner cannot be empty");
  }

  return true;
}
