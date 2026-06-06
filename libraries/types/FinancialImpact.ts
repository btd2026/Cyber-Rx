/**
 * FinancialImpact - Financial impact calculation for risk objects.
 *
 * CRITICAL: Every dollar figure must have a complete audit trail for
 * CFO board-meeting defensibility.
 *
 * The CFO must be able to defend these numbers in a board meeting.
 * No LLM in the calculation path - all calculations must be deterministic
 * and traceable to source data.
 *
 * @packageDocumentation
 */

/**
 * Reserve types for reserve_at_risk calculation.
 */
export enum ReserveType {
  /** Medical Loss Reserves */
  MEDICAL_LOSS = "medical_loss",
  /** Case Reserves */
  CASE_RESERVE = "case_reserve",
  /** Incurred But Not Reported */
  IBNR = "ibnr"
}

/**
 * Financial data source with quality score.
 *
 * Every dollar figure must be traceable to its source data.
 */
export interface FinancialSource {
  /** Source identifier (e.g., "actuarial_export", "claims_data") */
  source: string;
  /** When the data was exported (ISO 8601) */
  timestamp: string;
  /** Quality score for the data (0.0 - 1.0) */
  data_quality_score: number;
}

/**
 * Financial impact calculation for a risk object.
 *
 * CRITICAL: Every dollar figure must have a complete audit trail.
 * The CFO must be able to defend these numbers in a board meeting.
 *
 * FOUR IMPACT COMPONENTS:
 * 1. MLR Impact: Medical Loss Ratio effect
 * 2. Stop-Loss Exposure: Reinsurance position impact
 * 3. Reserve at Risk: Reserve implications
 * 4. Premium Revenue Risk: Revenue implications
 *
 * TOTAL EXPOSURE = Sum of all four components
 *
 * @example
 * ```typescript
 * const financialImpact: FinancialImpact = {
 *   mlr_impact: 0.02,  // 2 percentage points
 *   mlr_impact_confidence: 0.85,
 *   stop_loss_exposure: 500000,  // $500K against position
 *   stop_loss_attachment: 250000,
 *   stop_loss_aggregate: 5000000,
 *   stop_loss_remaining: 4500000,
 *   reserve_at_risk: 750000,
 *   reserve_type: ReserveType.CASE_RESERVE,
 *   premium_revenue_risk: 1200000,
 *   line_of_business: "Commercial",
 *   total_exposure: 2700000,  // Sum of all components
 *   total_exposure_confidence: 0.82,
 *   methodology: "Deterministic calculation engine v1.0",
 *   methodology_version: "1.0.0",
 *   calculation_timestamp: "2025-06-05T12:00:00Z",
 *   sources: [ ... ],
 *   assumptions: [ ... ]
 * };
 * ```
 */
export interface FinancialImpact {
  // MLR Impact
  /**
   * Estimated effect on MLR ratio (percentage points).
   *
   * Example: If current MLR is 0.82 and this risk adds 0.02,
   * the MLR would increase to 0.84.
   */
  mlr_impact: number;
  /**
   * Confidence in MLR impact calculation (0.0 - 1.0).
   *
   * Based on data quality and methodology certainty.
   */
  mlr_impact_confidence: number;

  // Stop-Loss Exposure
  /**
   * Dollar amount against stop-loss position.
   *
   * This represents the potential hit to the stop-loss layer
   * if this risk materializes.
   */
  stop_loss_exposure: number;
  /**
   * Current attachment point for stop-loss.
   *
   * The dollar amount at which stop-loss coverage begins.
   */
  stop_loss_attachment: number;
  /**
   * Aggregate limit for stop-loss.
   *
   * Maximum amount the stop-loss will pay in aggregate.
   */
  stop_loss_aggregate: number;
  /**
   * How much stop-loss capacity remains.
   *
   * Calculated as: aggregate - current_position
   */
  stop_loss_remaining: number;

  // Reserve at Risk
  /**
   * Dollar amount of reserves implicated by this risk.
   *
   * This represents the reserve impact if the risk materializes.
   */
  reserve_at_risk: number;
  /**
   * Type of reserve at risk.
   *
   * Determines which reserve bucket is impacted.
   */
  reserve_type: ReserveType;

  // Premium Revenue Risk
  /**
   * Potential premium revenue at risk.
   *
   * This represents the revenue impact if the risk materializes
   * (e.g., member attrition due to service disruption).
   */
  premium_revenue_risk: number;
  /**
   * Line of business affected.
   *
   * Commercial, Medicare, Medicaid, Marketplace, etc.
   */
  line_of_business: string;

  // Total Exposure
  /**
   * Total dollar exposure (sum of all components).
   *
   * Formula: total_exposure = mlr_impact + stop_loss_exposure +
   *           reserve_at_risk + premium_revenue_risk
   *
   * NOTE: This is a simplified calculation. The actual calculation
   * engine (T-MVP-006) will implement more sophisticated logic.
   */
  total_exposure: number;
  /**
   * Confidence in total exposure calculation (0.0 - 1.0).
   *
   * This is the aggregated confidence across all components.
   */
  total_exposure_confidence: number;

  // Methodology (CRITICAL FOR AUDIT TRAIL)
  /**
   * How this was calculated.
   *
   * CRITICAL: This must describe the deterministic algorithm used.
   * NO LLM in the calculation path.
   *
   * Example: "Calculation engine v1.0: Sum of MLR impact ($ derived from
   * actuarial model) + Stop-loss exposure (attachment analysis) +
   * Reserve at risk (reserve model) + Premium revenue risk (attrition model)"
   */
  methodology: string;
  /**
   * Version of calculation engine.
   *
   * Used for reproducibility and audit trails.
   * Format: "major.minor.patch"
   */
  methodology_version: string;
  /**
   * When the calculation was performed (ISO 8601).
   *
   * Critical for temporal analysis and data freshness.
   */
  calculation_timestamp: string;

  // Source Data
  /**
   * What data was used for this calculation.
   *
   * Every dollar figure must be traceable to source data.
   */
  sources: FinancialSource[];
  /**
   * Key assumptions made during calculation.
   *
   * Critical for board-meeting defensibility.
   */
  assumptions: string[];
}

/**
 * Validate FinancialImpact constraints.
 *
 * @param financialImpact - The financial impact to validate
 * @throws {Error} If validation fails
 * @returns True if validation passes
 */
export function validateFinancialImpact(financialImpact: FinancialImpact): boolean {
  // Check confidence ranges
  if (financialImpact.mlr_impact_confidence < 0 || financialImpact.mlr_impact_confidence > 1) {
    throw new Error(`Invalid mlr_impact_confidence: ${financialImpact.mlr_impact_confidence}`);
  }
  if (financialImpact.total_exposure_confidence < 0 || financialImpact.total_exposure_confidence > 1) {
    throw new Error(`Invalid total_exposure_confidence: ${financialImpact.total_exposure_confidence}`);
  }

  // Check for negative values
  if (financialImpact.stop_loss_exposure < 0) {
    throw new Error(`Invalid stop_loss_exposure (negative): ${financialImpact.stop_loss_exposure}`);
  }
  if (financialImpact.reserve_at_risk < 0) {
    throw new Error(`Invalid reserve_at_risk (negative): ${financialImpact.reserve_at_risk}`);
  }
  if (financialImpact.premium_revenue_risk < 0) {
    throw new Error(`Invalid premium_revenue_risk (negative): ${financialImpact.premium_revenue_risk}`);
  }
  if (financialImpact.total_exposure < 0) {
    throw new Error(`Invalid total_exposure (negative): ${financialImpact.total_exposure}`);
  }

  // Check methodology fields (CRITICAL FOR AUDIT TRAIL)
  if (!financialImpact.methodology) {
    throw new Error("methodology cannot be empty");
  }
  if (!financialImpact.methodology_version) {
    throw new Error("methodology_version cannot be empty");
  }
  if (!financialImpact.calculation_timestamp) {
    throw new Error("calculation_timestamp cannot be empty");
  }

  // Check sources
  if (!financialImpact.sources || financialImpact.sources.length === 0) {
    throw new Error("sources cannot be empty");
  }

  return true;
}

/**
 * Calculate total exposure as sum of all components.
 *
 * Formula: total_exposure = mlr_impact + stop_loss_exposure +
 *           reserve_at_risk + premium_revenue_risk
 *
 * NOTE: This is a simplified calculation. The actual calculation engine
 * (T-MVP-006) will implement more sophisticated logic based on
 * actuarial principles.
 *
 * @param financialImpact - The financial impact to calculate
 * @returns The total exposure
 */
export function calculateTotalExposure(financialImpact: FinancialImpact): number {
  const total =
    financialImpact.mlr_impact +
    financialImpact.stop_loss_exposure +
    financialImpact.reserve_at_risk +
    financialImpact.premium_revenue_risk;

  financialImpact.total_exposure = total;
  return total;
}
