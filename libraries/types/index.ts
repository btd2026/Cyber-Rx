/**
 * Central export point for all CyberRX type definitions.
 *
 * This module exports all core data types for the CyberRX platform.
 * Import types from here to ensure consistent typing across the codebase.
 *
 * @packageDocumentation
 */

// RiskObject
export {
  RiskObject,
  RiskCategory,
  RiskStatus,
  validateRiskObject
} from './RiskObject';
export type { MethodologyTrail, Regulation, Threshold } from './RiskObject';

// FinancialImpact
export {
  FinancialImpact,
  ReserveType,
  validateFinancialImpact,
  calculateTotalExposure
} from './FinancialImpact';
export type { FinancialSource } from './FinancialImpact';

// BusinessProcessGraph
export {
  BusinessProcessGraph,
  ProcessNode,
  ProcessEdge,
  GraphMetadata,
  NodeType,
  SystemType,
  ProcessType,
  OperationType,
  EdgeType,
  Tier,
  validateProcessNode,
  validateProcessEdge,
  validateBusinessProcessGraph,
  getBlastRadius,
  getCrownJewelNodes
} from './BusinessProcessGraph';

// AgentState
export {
  AgentState,
  RiskPosture,
  FinancialContext,
  ReserveLevels,
  PremiumRevenue,
  AgentThresholds,
  ThresholdHistory,
  Briefing,
  BriefingContent,
  BriefingHistory,
  AgentType,
  PostureTrend,
  ThresholdSeverity,
  BriefingType,
  ComplianceStatus,
  ActionStatus,
  validateAgentState
} from './AgentState';
export type {
  PremiumByLOB,
  RiskHighlight,
  ExposureBreakdown,
  FinancialHighlight,
  RegulatoryHighlight,
  ActionItem
} from './AgentState';
