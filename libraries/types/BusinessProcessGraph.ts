/**
 * BusinessProcessGraph - Maps systems to payer operations for impact analysis.
 *
 * CRITICAL: This is customer-specific. Built during onboarding (T-PILOT-002).
 * Each customer has different systems and processes.
 *
 * The graph enables blast radius calculation and crown jewel tiering.
 *
 * @packageDocumentation
 */

/**
 * Node types in the graph.
 */
export enum NodeType {
  /** Server, application, database, infrastructure */
  SYSTEM = "system",
  /** Business process (claims adjudication, enrollment, etc.) */
  PROCESS = "process",
  /** Specific operation within a process */
  OPERATION = "operation"
}

/**
 * System types for SYSTEM nodes.
 */
export enum SystemType {
  /** Claims processing system */
  CLAIMS_SYSTEM = "claims_system",
  /** Member enrollment platform */
  ENROLLMENT_PLATFORM = "enrollment_platform",
  /** EDI transaction gateway */
  EDI_GATEWAY = "edi_gateway",
  /** Provider portal */
  PROVIDER_PORTAL = "provider_portal",
  /** Member portal */
  MEMBER_PORTAL = "member_portal",
  /** Pharmacy Benefit Management interface */
  PBM_INTERFACE = "pbm_interface",
  /** Claims clearinghouse interface */
  CLEARINGHOUSE = "clearinghouse",
  /** Actuarial modeling system */
  ACTUARIAL_SYSTEM = "actuarial_system",
  /** Database server */
  DATABASE = "database",
  /** Authentication/identity system */
  AUTHENTICATION = "authentication"
}

/**
 * Process types for PROCESS nodes.
 */
export enum ProcessType {
  /** Claims adjudication workflow */
  CLAIMS_ADJUDICATION = "claims_adjudication",
  /** Member enrollment process */
  ENROLLMENT = "enrollment",
  /** Provider payment processing */
  PROVIDER_PAYMENT = "provider_payment",
  /** Premium billing process */
  PREMIUM_BILLING = "premium_billing",
  /** Prior authorization workflow */
  PRIOR_AUTHORIZATION = "prior_authorization",
  /** Care management workflow */
  CARE_MANAGEMENT = "care_management",
  /** EDI 837 claim submission */
  EDI_837 = "edi_837",
  /** EDI 835 payment advice */
  EDI_835 = "edi_835"
}

/**
 * Operation types for OPERATION nodes.
 */
export enum OperationType {
  /** Submit a claim for processing */
  SUBMIT_CLAIM = "submit_claim",
  /** Check member eligibility */
  CHECK_ELIGIBILITY = "check_eligibility",
  /** Process a payment */
  PROCESS_PAYMENT = "process_payment",
  /** Verify coverage details */
  VERIFY_COVERAGE = "verify_coverage",
  /** Authorize a medical service */
  AUTHORIZE_SERVICE = "authorize_service"
}

/**
 * Edge types in the graph.
 */
export enum EdgeType {
  /** System A depends on System B */
  DEPENDENCY = "dependency",
  /** Data flows from A to B */
  DATA_FLOW = "data_flow",
  /** A controls B */
  CONTROL = "control"
}

/**
 * Crown jewel tiering (1 = most critical).
 */
export enum Tier {
  /** Crown jewel - business-critical */
  CROWN_JEWEL = 1,
  /** Critical - important but not crown jewel */
  CRITICAL = 2,
  /** Important - moderate impact if down */
  IMPORTANT = 3,
  /** Standard - low impact if down */
  STANDARD = 4
}

/**
 * Node in the business process graph.
 *
 * Represents a system, process, or operation in the payer's infrastructure.
 */
export interface ProcessNode {
  /** Unique node identifier */
  id: string;
  /** Node type (SYSTEM | PROCESS | OPERATION) */
  type: NodeType;
  /** Display name */
  name: string;

  // System-specific
  /** System type (required if type === SYSTEM) */
  system_type?: SystemType;
  /** Hostname (required if type === SYSTEM) */
  hostname?: string;
  /** IP address (required if type === SYSTEM) */
  ip_address?: string;

  // Process-specific
  /** Process type (required if type === PROCESS) */
  process_type?: ProcessType;

  // Operation-specific
  /** Operation type (required if type === OPERATION) */
  operation_type?: OperationType;

  // Financial
  /**
   * Downtime cost per day.
   *
   * Dollar amount if this node goes down for a day.
   * Used for financial impact calculations.
   */
  downtime_cost_per_day: number;
  /**
   * Source for downtime cost.
   *
   * Benchmark or analysis that produced the cost estimate.
   */
  downtime_cost_source: string;
  /**
   * Confidence in downtime cost (0.0 - 1.0).
   */
  downtime_cost_confidence: number;

  // Metadata
  /** IDs of nodes this node depends on */
  dependencies: string[];
  /** IDs of nodes that depend on this node */
  dependents: string[];
  /**
   * Crown jewel tier.
   *
   * 1 = Crown jewel (most critical)
   * 4 = Standard (least critical)
   */
  tier: Tier;

  // Audit
  /** When this node was created (ISO 8601) */
  created_at: string;
  /** When this node was last updated (ISO 8601) */
  updated_at: string;
  /** Where this node definition came from */
  source: string;
}

/**
 * Edge in the business process graph.
 *
 * Represents relationships between nodes.
 */
export interface ProcessEdge {
  /** Unique edge identifier */
  id: string;
  /** Source node ID */
  from_node: string;
  /** Target node ID */
  to_node: string;
  /** Edge type (DEPENDENCY | DATA_FLOW | CONTROL) */
  edge_type: EdgeType;

  // Characteristics
  /**
   * How critical this edge is (0.0 - 1.0).
   *
   * Higher values = more critical to operations.
   */
  criticality: number;
  /**
   * Blast radius impact if this edge fails (0.0 - 1.0).
   *
   * Higher values = larger downstream impact.
   */
  blast_radius_impact: number;

  // Metadata
  /** When this edge was created (ISO 8601) */
  created_at: string;
  /** When this edge was last updated (ISO 8601) */
  updated_at: string;
}

/**
 * Graph metadata.
 */
export interface GraphMetadata {
  /** Graph version */
  version: string;
  /** When the graph was last updated (ISO 8601) */
  last_updated: string;
  /** Which customer this graph is for */
  customer_id: string;
  /** Total number of nodes in the graph */
  total_nodes: number;
  /** Total number of edges in the graph */
  total_edges: number;
  /** IDs of crown jewel processes (Tier 1) */
  crown_jewels: string[];
}

/**
 * Business process graph mapping systems to payer operations.
 *
 * CRITICAL: This is customer-specific. Built during onboarding (T-PILOT-002).
 *
 * The graph enables:
 * - Blast radius calculation for risk objects
 * - Crown jewel tiering for prioritization
 * - Business process impact analysis
 * - Financial impact calculation
 *
 * @example
 * ```typescript
 * const graph: BusinessProcessGraph = {
 *   nodes: [
 *     {
 *       id: "claims-system-1",
 *       type: NodeType.SYSTEM,
 *       name: "Claims Adjudication System",
 *       system_type: SystemType.CLAIMS_SYSTEM,
 *       hostname: "claims-prod-1",
 *       ip_address: "10.0.1.10",
 *       downtime_cost_per_day: 500000,
 *       downtime_cost_source: "Business impact analysis 2024",
 *       downtime_cost_confidence: 0.85,
 *       dependencies: ["database-1", "edi-gateway"],
 *       dependents: ["provider-portal"],
 *       tier: Tier.CROWN_JEWEL,
 *       created_at: "2025-06-05T12:00:00Z",
 *       updated_at: "2025-06-05T12:00:00Z",
 *       source: "Customer onboarding"
 *     }
 *   ],
 *   edges: [
 *     {
 *       id: "edge-1",
 *       from_node: "claims-system-1",
 *       to_node: "database-1",
 *       edge_type: EdgeType.DEPENDENCY,
 *       criticality: 0.95,
 *       blast_radius_impact: 0.90,
 *       created_at: "2025-06-05T12:00:00Z",
 *       updated_at: "2025-06-05T12:00:00Z"
 *     }
 *   ],
 *   metadata: {
 *     version: "1.0.0",
 *     last_updated: "2025-06-05T12:00:00Z",
 *     customer_id: "customer-123",
 *     total_nodes: 15,
 *     total_edges: 28,
 *     crown_jewels: ["claims-system-1", "edi-gateway", "database-1"]
 *   }
 * };
 * ```
 */
export interface BusinessProcessGraph {
  /** All nodes in the graph */
  nodes: ProcessNode[];
  /** All edges in the graph */
  edges: ProcessEdge[];
  /** Graph metadata */
  metadata: GraphMetadata;
}

/**
 * Validate ProcessNode constraints.
 *
 * @param node - The node to validate
 * @throws {Error} If validation fails
 * @returns True if validation passes
 */
export function validateProcessNode(node: ProcessNode): boolean {
  if (node.type === NodeType.SYSTEM && !node.system_type) {
    throw new Error(`SYSTEM node requires system_type: ${node.id}`);
  }
  if (node.type === NodeType.PROCESS && !node.process_type) {
    throw new Error(`PROCESS node requires process_type: ${node.id}`);
  }
  if (node.type === NodeType.OPERATION && !node.operation_type) {
    throw new Error(`OPERATION node requires operation_type: ${node.id}`);
  }

  if (node.downtime_cost_confidence < 0 || node.downtime_cost_confidence > 1) {
    throw new Error(`Invalid downtime_cost_confidence: ${node.downtime_cost_confidence}`);
  }

  return true;
}

/**
 * Validate ProcessEdge constraints.
 *
 * @param edge - The edge to validate
 * @throws {Error} If validation fails
 * @returns True if validation passes
 */
export function validateProcessEdge(edge: ProcessEdge): boolean {
  if (edge.criticality < 0 || edge.criticality > 1) {
    throw new Error(`Invalid criticality: ${edge.criticality}`);
  }
  if (edge.blast_radius_impact < 0 || edge.blast_radius_impact > 1) {
    throw new Error(`Invalid blast_radius_impact: ${edge.blast_radius_impact}`);
  }

  return true;
}

/**
 * Validate BusinessProcessGraph constraints.
 *
 * @param graph - The graph to validate
 * @throws {Error} If validation fails
 * @returns True if validation passes
 */
export function validateBusinessProcessGraph(graph: BusinessProcessGraph): boolean {
  // Validate all nodes
  for (const node of graph.nodes) {
    validateProcessNode(node);
  }

  // Validate all edges
  for (const edge of graph.edges) {
    validateProcessEdge(edge);
  }

  // Check edge references
  const nodeIds = new Set(graph.nodes.map(n => n.id));
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.from_node)) {
      throw new Error(`Edge from_node not found: ${edge.from_node}`);
    }
    if (!nodeIds.has(edge.to_node)) {
      throw new Error(`Edge to_node not found: ${edge.to_node}`);
    }
  }

  // Validate metadata
  if (graph.metadata.total_nodes !== graph.nodes.length) {
    throw new Error(
      `Metadata total_nodes mismatch: ${graph.metadata.total_nodes} !== ${graph.nodes.length}`
    );
  }
  if (graph.metadata.total_edges !== graph.edges.length) {
    throw new Error(
      `Metadata total_edges mismatch: ${graph.metadata.total_edges} !== ${graph.edges.length}`
    );
  }

  return true;
}

/**
 * Calculate blast radius for a node.
 *
 * Returns list of downstream node IDs reachable from this node.
 *
 * @param graph - The business process graph
 * @param nodeId - The node to calculate blast radius for
 * @returns List of downstream node IDs
 */
export function getBlastRadius(graph: BusinessProcessGraph, nodeId: string): string[] {
  const downstream = new Set<string>();
  const toVisit: string[] = [nodeId];
  const visited = new Set<string>();

  while (toVisit.length > 0) {
    const current = toVisit.shift()!;
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    // Find all edges from current node
    for (const edge of graph.edges) {
      if (edge.from_node === current) {
        downstream.add(edge.to_node);
        toVisit.push(edge.to_node);
      }
    }
  }

  return Array.from(downstream);
}

/**
 * Get all crown jewel nodes.
 *
 * @param graph - The business process graph
 * @returns List of crown jewel nodes (Tier 1)
 */
export function getCrownJewelNodes(graph: BusinessProcessGraph): ProcessNode[] {
  return graph.nodes.filter(node => node.tier === Tier.CROWN_JEWEL);
}
