const { ProcessMapping } = require('../models');
const tieringEngine = require('../utils/tieringEngine');

/**
 * Tier Analysis Controller
 * Handles tier classification and crown jewel analysis
 */

/**
 * GET /api/mappings/:matchId/tier-analysis
 * Get tier analysis for all processes in a mapping
 */
exports.getTierAnalysis = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { processType, tier } = req.query;

    // Fetch mapping with processes
    const mapping = await ProcessMapping.findOne({
      where: { id: matchId },
      include: ['processes', 'applications']
    });

    if (!mapping) {
      return res.status(404).json({
        error: 'Mapping not found',
        message: `No mapping found with ID: ${matchId}`
      });
    }

    // Calculate tiers for all processes
    const tierResult = tieringEngine.calculateAllTiers(
      mapping.processes || [],
      mapping.benchmark_library || {}
    );

    // Apply filters if provided
    let filteredSystems = tierResult.systems;
    if (processType) {
      filteredSystems = filteredSystems.filter(s =>
        s.process_type === processType
      );
    }
    if (tier) {
      filteredSystems = filteredSystems.filter(s => s.tier === tier);
    }

    res.json({
      systems: filteredSystems,
      tier_counts: tierResult.tier_counts,
      total_count: filteredSystems.length,
      mapping_id: matchId,
      calculated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error calculating tier analysis:', error);
    res.status(500).json({
      error: 'Failed to calculate tier analysis',
      message: error.message
    });
  }
};

/**
 * GET /api/mappings/:matchId/tier-analysis/:processId
 * Get detailed tier analysis for a specific process
 */
exports.getProcessTierDetails = async (req, res) => {
  try {
    const { matchId, processId } = req.params;

    // Fetch mapping and specific process
    const mapping = await ProcessMapping.findOne({
      where: { id: matchId },
      include: ['processes', 'applications']
    });

    if (!mapping) {
      return res.status(404).json({
        error: 'Mapping not found',
        message: `No mapping found with ID: ${matchId}`
      });
    }

    const process = (mapping.processes || []).find(p => p.id === processId);
    if (!process) {
      return res.status(404).json({
        error: 'Process not found',
        message: `No process found with ID: ${processId}`
      });
    }

    // Calculate tier for this process
    const tierResult = tieringEngine.tieringEngine(
      process,
      mapping.benchmark_library || {}
    );

    // Validate calculation for transparency
    const validation = tieringEngine.validateTierCalculation(process, tierResult);

    res.json({
      process: {
        id: process.id,
        name: process.name,
        process_type: process.process_type,
        description: process.description
      },
      tier_result: tierResult,
      factor_breakdown: tierResult.factors,
      validation,
      benchmark_library_used: mapping.benchmark_library || {}
    });
  } catch (error) {
    console.error('Error calculating process tier details:', error);
    res.status(500).json({
      error: 'Failed to calculate process tier details',
      message: error.message
    });
  }
};

/**
 * POST /api/mappings/:matchId/recalculate-tiers
 * Recalculate tiers for all processes (e.g., after benchmark update)
 */
exports.recalculateTiers = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { benchmarkLibrary } = req.body;

    // Fetch mapping
    const mapping = await ProcessMapping.findOne({
      where: { id: matchId },
      include: ['processes', 'applications']
    });

    if (!mapping) {
      return res.status(404).json({
        error: 'Mapping not found',
        message: `No mapping found with ID: ${matchId}`
      });
    }

    // Use provided benchmarks or existing ones
    const benchmarks = benchmarkLibrary || mapping.benchmark_library || {};

    // Recalculate all tiers
    const tierResult = tieringEngine.calculateAllTiers(
      mapping.processes || [],
      benchmarks
    );

    // Update mapping if new benchmarks were provided
    if (benchmarkLibrary) {
      await mapping.update({
        benchmark_library: benchmarkLibrary,
        tier_analysis: tierResult,
        tier_calculated_at: new Date()
      });
    }

    res.json({
      ...tierResult,
      mapping_id: matchId,
      recalculated_at: new Date().toISOString(),
      benchmark_library_updated: !!benchmarkLibrary
    });
  } catch (error) {
    console.error('Error recalculating tiers:', error);
    res.status(500).json({
      error: 'Failed to recalculate tiers',
      message: error.message
    });
  }
};

/**
 * GET /api/tier-definitions
 * Get tier definitions and criteria
 */
exports.getTierDefinitions = async (req, res) => {
  try {
    const definitions = tieringEngine.getTierDefinitions();

    res.json({
      definitions,
      version: '1.0.0',
      last_updated: '2025-06-03'
    });
  } catch (error) {
    console.error('Error retrieving tier definitions:', error);
    res.status(500).json({
      error: 'Failed to retrieve tier definitions',
      message: error.message
    });
  }
};
