/**
 * AgentState - Persistent state for AI agents.
 *
 * Agents maintain state across briefings for trend analysis and context.
 * State is tenant-isolated and persists across briefings.
 *
 * @packageDocumentation
 */

/**
 * Agent types.
 */
export enum AgentType {
  /** Chief Financial Officer agent */
  CFO = "cfo",
  /** Chief Risk Officer agent */
  CRO = "cro",
  /** Chief Legal Officer agent */
  CLO = "clo",
  /** Chief Information Officer agent */
  CIO = "cio",
  /** Chief Information Security Officer agent */
  CISO = "ciso",
  /** Board of Directors agent */
  BOARD = "board"
}

/**
 * Risk posture trend.
 */
export enum PostureTrend {
  /** Risk posture is improving */
  IMPROVING = "improving",
  /** Risk posture is stable */
  STABLE = "stable",
  /** Risk posture is degrading */
  DEGRADING = "degrading"
}

/**
 * Threshold severity.
 */
export enum ThresholdSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical"
}

/**
 * Briefing types.
 */
export enum BriefingType {
  /** Scheduled recurring briefing */
  SCHEDULED = "scheduled",
  /** Triggered by threshold breach */
  THRESHOLD_BREACH = "threshold_breach",
  /** On-demand briefing */
  ON_DEMAND = "on_demand"
}

/**
 * Compliance status.
 */
export enum ComplianceStatus {
  /** Compliant with regulation */
  COMPLIANT = "compliant",
  /** At risk of non-compliance */
  AT_RISK = "at_risk",
  /** Non-compliant */
  NON_COMPLIANT = "non_compliant"
}

/**
 * Action status.
 */
export enum ActionStatus {
  /** Action is pending */
  PENDING = "pending",
  /** Action is in progress */
  IN_PROGRESS = "in_progress",
  /** Action is complete */
  COMPLETE = "complete",
  /** Action has been acknowledged */
  ACKNOWLEDGED = "acknowledged"
}

/**
 * Current risk posture.
 */
export interface RiskPosture {
  /** Overall risk score (0.0 - 1.0) */
  overall_score: number;
  /** Risk posture trend */
  trend: PostureTrend;
  /** RiskObject IDs with critical severity */
  critical_risks: string[];
  /** RiskObject IDs with high severity */
  high_risks: string[];
  /** RiskObject IDs with medium severity */
  medium_risks: string[];
  /** RiskObject IDs with low severity */
  low_risks: string[];
}

/**
 * Reserve levels.
 */
export interface ReserveLevels {
  /** Medical loss reserves */
  medical_loss_reserves: number;
  /** Case reserves */
  case_reserves: number;
  /** IBNR reserves */
  ibnr_reserves: number;
  /** Total reserves */
  total_reserves: number;
}

/**
 * Premium revenue by line of business.
 */
export interface PremiumByLOB {
  /** Line of business identifier */
  line_of_business: string;
  /** Monthly premium revenue */
  monthly_premium: number;
  /** Annual premium revenue */
  annual_premium: number;
}

/**
 * Premium revenue.
 */
export interface PremiumRevenue {
  /** Total monthly premium */
  monthly_premium: number;
  /** Total annual premium */
  annual_premium: number;
  /** Premium by line of business */
  by_lob: PremiumByLOB[];
}

/**
 * Financial context for agent.
 */
export interface FinancialContext {
  /** Current MLR ratio */
  mlr_ratio: number;
  /** Target MLR ratio */
  mlr_target: number;
  /** Current stop-loss position */
  stop_loss_position: number;
  /** Stop-loss limit */
  stop_loss_limit: number;
  /** Reserve levels */
  reserve_levels: ReserveLevels;
  /** Premium revenue */
  premium_revenue: PremiumRevenue;
  /** When data was last updated (ISO 8601) */
  last_updated: string;
  /** How fresh the data is (e.g., "24 hours") */
  data_freshness: string;
}

/**
 * Agent thresholds.
 */
export interface AgentThresholds {
  /** Alert if risk score exceeds this value */
  risk_score_threshold: number;
  /** Alert if financial exposure exceeds this value */
  financial_exposure_threshold: number;
  /** Alert if trend degrades beyond this */
  trend_alert_threshold: number;
  /** Custom thresholds keyed by name */
  custom_thresholds: Record<string, number>;
}

/**
 * Threshold breach history.
 */
export interface ThresholdHistory {
  /** Threshold identifier */
  threshold_id: string;
  /** When threshold was triggered (ISO 8601) */
  triggered_at: string;
  /** Threshold value that was breached */
  threshold_value: number;
  /** Actual value that triggered breach */
  actual_value: number;
  /** Severity of the breach */
  severity: ThresholdSeverity;
  /** Whether breach has been acknowledged */
  acknowledged: boolean;
  /** Who acknowledged the breach */
  acknowledged_by?: string;
  /** When breach was acknowledged (ISO 8601) */
  acknowledged_at?: string;
}

/**
 * Risk highlight for briefing.
 */
export interface RiskHighlight {
  /** RiskObject ID */
  risk_object_id: string;
  /** Risk title */
  title: string;
  /** Risk description */
  description: string;
  /** Risk severity */
  severity: ThresholdSeverity;
  /** Business impact description */
  business_impact: string;
}

/**
 * Exposure breakdown.
 */
export interface ExposureBreakdown {
  /** MLR impact */
  mlr_impact: number;
  /** Stop-loss exposure */
  stop_loss_exposure: number;
  /** Reserve at risk */
  reserve_at_risk: number;
  /** Premium revenue risk */
  premium_revenue_risk: number;
}

/**
 * Financial highlight for briefing.
 */
export interface FinancialHighlight {
  /** Total exposure */
  total_exposure: number;
  /** Exposure breakdown by component */
  exposure_breakdown: ExposureBreakdown;
  /** Trend description */
  trend: string;
  /** Methodology description */
  methodology: string;
}

/**
 * Regulatory highlight for briefing.
 */
export interface RegulatoryHighlight {
  /** Regulation ID */
  regulation_id: string;
  /** Obligation description */
  obligation: string;
  /** Compliance deadline */
  deadline: string;
  /** Compliance status */
  status: ComplianceStatus;
}

/**
 * Action item for briefing.
 */
export interface ActionItem {
  /** Action item ID */
  id: string;
  /** Priority (lower = more urgent) */
  priority: number;
  /** Action title */
  title: string;
  /** Action description */
  description: string;
  /** Who owns this action */
  owner: string;
  /** When action is due (ISO 8601) */
  due_date: string;
  /** Action status */
  status: ActionStatus;
}

/**
 * Briefing content.
 */
export interface BriefingContent {
  /** Executive summary */
  executive_summary: string;
  /** Key risk highlights */
  key_risks: RiskHighlight[];
  /** Financial exposure summary */
  financial_exposure: FinancialHighlight;
  /** Regulatory compliance items */
  regulatory_items: RegulatoryHighlight[];
  /** Recommended actions */
  recommended_actions: ActionItem[];
  /** Methodology trail */
  methodology_trail: string;
}

/**
 * Complete briefing.
 */
export interface Briefing {
  /** Briefing ID */
  id: string;
  /** Agent type that generated this briefing */
  agent_type: AgentType;
  /** Briefing type */
  briefing_type: BriefingType;
  /** Briefing content */
  content: BriefingContent;
  /** When briefing was generated (ISO 8601) */
  generated_at: string;
  /** When briefing expires (ISO 8601) */
  expires_at: string;
}

/**
 * Briefing history entry.
 */
export interface BriefingHistory {
  /** Briefing ID */
  briefing_id: string;
  /** When briefing was generated (ISO 8601) */
  generated_at: string;
  /** Briefing type */
  briefing_type: BriefingType;
  /** Number of risk objects in briefing */
  risk_object_count: number;
  /** Number of threshold breaches */
  threshold_breach_count: number;
  /** Briefing summary */
  summary: string;
}

/**
 * Persistent state for AI agents.
 *
 * Agents maintain state across briefings for trend analysis and context.
 * State is tenant-isolated by customer_id.
 *
 * @example
 * ```typescript
 * const agentState: AgentState = {
 *   agent_id: "cfo-agent-1",
 *   agent_type: AgentType.CFO,
 *   customer_id: "customer-123",
 *   current_risk_objects: ["risk-1", "risk-2"],
 *   risk_posture: {
 *     overall_score: 0.65,
 *     trend: PostureTrend.STABLE,
 *     critical_risks: ["risk-1"],
 *     high_risks: ["risk-2"],
 *     medium_risks: [],
 *     low_risks: []
 *   },
 *   threshold_history: [],
 *   financial_context: {
 *     mlr_ratio: 0.82,
 *     mlr_target: 0.80,
 *     stop_loss_position: 150000,
 *     stop_loss_limit: 5000000,
 *     reserve_levels: { ... },
 *     premium_revenue: { ... },
 *     last_updated: "2025-06-05T12:00:00Z",
 *     data_freshness: "24 hours"
 *   },
 *   briefing_history: [],
 *   last_briefing: null,
 *   thresholds: {
 *     risk_score_threshold: 0.7,
 *     financial_exposure_threshold: 1000000,
 *     trend_alert_threshold: 0.1,
 *     custom_thresholds: {}
 *   },
 *   created_at: "2025-06-05T12:00:00Z",
 *   updated_at: "2025-06-05T12:00:00Z"
 * };
 * ```
 */
export interface AgentState {
  /** Agent identifier */
  agent_id: string;
  /** Agent type */
  agent_type: AgentType;
  /** Customer identifier (for tenant isolation) */
  customer_id: string;

  // Current State
  /** IDs of active risk objects */
  current_risk_objects: string[];
  /** Current risk posture */
  risk_posture: RiskPosture;
  /** Threshold breach history */
  threshold_history: ThresholdHistory[];

  // Financial Context
  /** Financial context for agent */
  financial_context: FinancialContext;

  // Briefing History
  /** Historical briefings */
  briefing_history: BriefingHistory[];
  /** Most recent briefing (if any) */
  last_briefing: Briefing | null;

  // Calibration
  /** Agent thresholds */
  thresholds: AgentThresholds;

  // Metadata
  /** When agent state was created (ISO 8601) */
  created_at: string;
  /** When agent state was last updated (ISO 8601) */
  updated_at: string;
}

/**
 * Validate AgentState constraints.
 *
 * @param state - The agent state to validate
 * @throws {Error} If validation fails
 * @returns True if validation passes
 */
export function validateAgentState(state: AgentState): boolean {
  // Check score ranges
  if (state.risk_posture.overall_score < 0 || state.risk_posture.overall_score > 1) {
    throw new Error(`Invalid overall_score: ${state.risk_posture.overall_score}`);
  }

  // Check MLR ratio
  if (state.financial_context.mlr_ratio < 0 || state.financial_context.mlr_ratio > 1) {
    throw new Error(`Invalid mlr_ratio: ${state.financial_context.mlr_ratio}`);
  }

  // Check threshold values
  if (state.thresholds.risk_score_threshold < 0 || state.thresholds.risk_score_threshold > 1) {
    throw new Error(`Invalid risk_score_threshold: ${state.thresholds.risk_score_threshold}`);
  }

  return true;
}
