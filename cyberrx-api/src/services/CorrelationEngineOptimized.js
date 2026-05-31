'use strict';

const {
  BusinessProcess,
  Asset,
  DataObject,
  ThreatScenario,
  LegalObligation,
  ExecutiveOwner,
  Risk,
  Finding,
  FinancialImpact
} = require('../models');

/**
 * Redis Cache Service for Correlation Engine
 * Provides high-performance caching for correlation results and lookups
 */
class RedisCacheService {
  constructor(redisClient) {
    this.redis = redisClient;
    this.defaultTTL = 3600; // 1 hour
  }

  /**
   * Get cached correlation result
   * @param {string} findingId - Finding ID
   * @returns {Promise<Object|null>} Cached result or null
   */
  async getCachedCorrelation(findingId) {
    try {
      const key = `correlation:result:${findingId}`;
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error('Redis cache get error:', err.message);
      return null;
    }
  }

  /**
   * Cache correlation result
   * @param {string} findingId - Finding ID
   * @param {Object} result - Correlation result
   * @returns {Promise<void>}
   */
  async cacheCorrelation(findingId, result) {
    try {
      const key = `correlation:result:${findingId}`;
      await this.redis.setex(key, this.defaultTTL, JSON.stringify(result));
    } catch (err) {
      console.error('Redis cache set error:', err.message);
    }
  }

  /**
   * Invalidate finding correlation cache
   * @param {string} findingId - Finding ID
   * @returns {Promise<void>}
   */
  async invalidateFinding(findingId) {
    try {
      const key = `correlation:result:${findingId}`;
      await this.redis.del(key);
    } catch (err) {
      console.error('Redis cache invalidate error:', err.message);
    }
  }

  /**
   * Get cached business process
   * @param {string} processId - Process ID
   * @returns {Promise<Object|null>} Cached process or null
   */
  async getCachedProcess(processId) {
    try {
      const key = `correlation:process:${processId}`;
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error('Redis cache get error:', err.message);
      return null;
    }
  }

  /**
   * Cache business process
   * @param {string} processId - Process ID
   * @param {Object} process - Business process
   * @returns {Promise<void>}
   */
  async cacheProcess(processId, process) {
    try {
      const key = `correlation:process:${processId}`;
      await this.redis.setex(key, this.defaultTTL, JSON.stringify(process));
    } catch (err) {
      console.error('Redis cache set error:', err.message);
    }
  }

  /**
   * Get cached data object
   * @param {string} dataObjectId - Data object ID
   * @returns {Promise<Object|null>} Cached data object or null
   */
  async getCachedDataObject(dataObjectId) {
    try {
      const key = `correlation:data:${dataObjectId}`;
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error('Redis cache get error:', err.message);
      return null;
    }
  }

  /**
   * Cache data object
   * @param {string} dataObjectId - Data object ID
   * @param {Object} dataObject - Data object
   * @returns {Promise<void>}
   */
  async cacheDataObject(dataObjectId, dataObject) {
    try {
      const key = `correlation:data:${dataObjectId}`;
      await this.redis.setex(key, this.defaultTTL, JSON.stringify(dataObject));
    } catch (err) {
      console.error('Redis cache set error:', err.message);
    }
  }

  /**
   * Get cached executive owner
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Cached owner or null
   */
  async getCachedOwner(userId) {
    try {
      const key = `correlation:owner:${userId}`;
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error('Redis cache get error:', err.message);
      return null;
    }
  }

  /**
   * Cache executive owner
   * @param {string} userId - User ID
   * @param {Object} owner - Executive owner
   * @returns {Promise<void>}
   */
  async cacheOwner(userId, owner) {
    try {
      const key = `correlation:owner:${userId}`;
      await this.redis.setex(key, this.defaultTTL, JSON.stringify(owner));
    } catch (err) {
      console.error('Redis cache set error:', err.message);
    }
  }

  /**
   * Batch cache multiple items
   * @param {Object} cacheMap - Map of cache keys to values
   * @returns {Promise<void>}
   */
  async cacheBatch(cacheMap) {
    const pipeline = this.redis.pipeline();

    for (const [key, value] of Object.entries(cacheMap)) {
      pipeline.setex(key, this.defaultTTL, JSON.stringify(value));
    }

    try {
      await pipeline.exec();
    } catch (err) {
      console.error('Redis batch cache error:', err.message);
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache stats
   */
  async getStats() {
    try {
      const info = await this.redis.info('stats');
      return {
        uptime: info.match(/uptime_in_days:(\d+)/)?.[1] || 'unknown',
        hits: info.match(/keyspace_hits:(\d+)/)?.[1] || '0',
        misses: info.match(/keyspace_misses:(\d+)/)?.[1] || '0'
      };
    } catch (err) {
      console.error('Redis stats error:', err.message);
      return { uptime: 'unknown', hits: '0', misses: '0' };
    }
  }
}

/**
 * Performance Monitoring Service
 * Tracks correlation performance metrics
 */
class PerformanceMonitor {
  constructor(logger) {
    this.logger = logger;
    this.metrics = {
      correlationCount: 0,
      totalTime: 0,
      slowQueries: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  /**
   * Start timing a correlation
   * @returns {Object} Timer object
   */
  startTimer() {
    return {
      startTime: Date.now(),
      queries: [],
      cacheAccess: []
    };
  }

  /**
   * End timing and log results
   * @param {Object} timer - Timer object
   * @param {string} findingId - Finding ID
   * @param {boolean} cacheHit - Whether cache was hit
   */
  endTimer(timer, findingId, cacheHit = false) {
    const duration = Date.now() - timer.startTime;

    this.metrics.correlationCount++;
    this.metrics.totalTime += duration;

    if (cacheHit) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }

    if (duration > 3000) {
      this.metrics.slowQueries++;
      this.logger.warn(`Slow correlation: Finding ${findingId} took ${duration}ms`);
    } else {
      this.logger.info(`Correlation: Finding ${findingId} took ${duration}ms (cache: ${cacheHit ? 'HIT' : 'MISS'})`);
    }

    // Send to Datadog if available
    if (global.Datadog) {
      global.Datadog.distribution('correlation.duration_seconds', duration / 1000, [
        `cache_hit:${cacheHit}`,
        duration > 3000 ? 'slow:true' : 'slow:false'
      ]);
    }
  }

  /**
   * Get performance metrics
   * @returns {Object} Metrics
   */
  getMetrics() {
    const avgTime = this.metrics.correlationCount > 0
      ? this.metrics.totalTime / this.metrics.correlationCount
      : 0;

    const cacheHitRate = this.metrics.cacheHits + this.metrics.cacheMisses > 0
      ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100
      : 0;

    return {
      ...this.metrics,
      avgTime,
      cacheHitRate: cacheHitRate.toFixed(2) + '%'
    };
  }
}

/**
 * Optimized Correlation Engine Service
 *
 * Takes a technical finding and produces the executive narrative
 * Correlates: business process, data, threat, financial, frameworks, legal, owners, audit
 *
 * Performance optimizations:
 * - Redis caching for all correlation results and lookups
 * - Batch database queries to eliminate N+1 problem
 * - Parallel batch correlation processing
 * - Performance monitoring and metrics
 */
class CorrelationEngineOptimized {
  static redisCache = null;
  static performanceMonitor = null;

  /**
   * Initialize the correlation engine with Redis and monitoring
   * @param {Object} redisClient - Redis client instance
   * @param {Object} logger - Logger instance
   */
  static initialize(redisClient, logger) {
    this.redisCache = new RedisCacheService(redisClient);
    this.performanceMonitor = new PerformanceMonitor(logger);
  }

  /**
   * Generate executive narrative for a finding (optimized)
   * @param {string} findingId - Finding ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Executive narrative
   */
  static async generateExecutiveNarrative(findingId, organizationId) {
    const timer = this.performanceMonitor.startTimer();

    try {
      // Check cache first
      const cached = await this.redisCache.getCachedCorrelation(findingId);
      if (cached) {
        this.performanceMonitor.endTimer(timer, findingId, true);
        return cached;
      }

      // Step 1: Get the finding with all relationships
      const finding = await Finding.findById(findingId);
      if (!finding) {
        throw new Error('Finding not found');
      }
      if (finding.organizationId !== organizationId) {
        throw new Error('Access denied');
      }

      // Step 2: Get related risk if exists
      let risk = null;
      if (finding.riskId) {
        risk = await Risk.findById(finding.riskId);
      }

      // Step 3-8: Run correlation steps in parallel where possible
      const [businessProcess, dataObjects, threatScenario, financialImpact, legalObligations, owners] =
        await Promise.all([
          this._getBusinessProcessOptimized(finding, risk),
          this._getDataObjectsOptimized(finding, risk, businessProcess),
          this._getThreatScenario(risk),
          this._getFinancialImpact(risk, threatScenario),
          this._getLegalObligationsOptimized(risk, threatScenario),
          this._getOwnersOptimized(risk, businessProcess)
        ]);

      // Step 9: Get audit evidence requirements (sync - fast)
      const auditEvidence = this._getAuditEvidence(risk);

      // Step 10: Build the executive narrative
      const result = this._buildNarrative({
        finding,
        risk,
        businessProcess,
        dataObjects,
        threatScenario,
        financialImpact,
        frameworkMappings: risk?.frameworkMappings || [],
        legalObligations,
        owners,
        auditEvidence
      });

      // Cache the result
      await this.redisCache.cacheCorrelation(findingId, result);

      this.performanceMonitor.endTimer(timer, findingId, false);
      return result;
    } catch (err) {
      this.performanceMonitor.endTimer(timer, findingId, false);
      throw err;
    }
  }

  /**
   * Get business process for the finding (optimized with caching)
   * @private
   */
  static async _getBusinessProcessOptimized(finding, risk) {
    // First try finding's business process
    let processId = finding.businessProcessId;

    // Then try risk's business processes
    if (!processId && risk && risk.businessProcessIds && risk.businessProcessIds.length > 0) {
      processId = risk.businessProcessIds[0];
    }

    // Then try via asset
    if (!processId && finding.assetId) {
      const asset = await Asset.findById(finding.assetId);
      if (asset && asset.businessProcessIds && asset.businessProcessIds.length > 0) {
        processId = asset.businessProcessIds[0];
      }
    }

    if (processId) {
      // Try cache first
      const cached = await this.redisCache.getCachedProcess(processId);
      if (cached) {
        return cached;
      }

      const process = await BusinessProcess.findById(processId);
      if (process) {
        await this.redisCache.cacheProcess(processId, process);
      }
      return process;
    }

    return null;
  }

  /**
   * Get data objects for the finding (optimized with batch queries and caching)
   * @private
   */
  static async _getDataObjectsOptimized(finding, risk, businessProcess) {
    const dataObjectIds = new Set();

    // From risk
    if (risk && risk.dataObjectIds) {
      risk.dataObjectIds.forEach(id => dataObjectIds.add(id));
    }

    // From business process
    if (businessProcess && businessProcess.createsDataObjects) {
      businessProcess.createsDataObjects.forEach(id => dataObjectIds.add(id));
    }

    // From asset
    if (finding.assetId) {
      const asset = await Asset.findById(finding.assetId);
      if (asset) {
        // Get data objects that reside in this asset
        const assetDataObjects = await DataObject.findByAssetId(finding.assetId);
        assetDataObjects.forEach(obj => dataObjectIds.add(obj.id));
      }
    }

    // Batch fetch all data objects with cache optimization
    const dataObjects = [];
    const uncachedIds = [];

    // Check cache for each ID
    for (const id of dataObjectIds) {
      const cached = await this.redisCache.getCachedDataObject(id);
      if (cached) {
        dataObjects.push(cached);
      } else {
        uncachedIds.push(id);
      }
    }

    // Batch fetch uncached data objects
    if (uncachedIds.length > 0) {
      const objects = await this._batchFetchDataObjects(uncachedIds);

      // Cache the fetched objects
      const cacheMap = {};
      for (const obj of objects) {
        dataObjects.push(obj);
        cacheMap[`correlation:data:${obj.id}`] = obj;
      }

      if (Object.keys(cacheMap).length > 0) {
        await this.redisCache.cacheBatch(cacheMap);
      }
    }

    return dataObjects;
  }

  /**
   * Batch fetch data objects by IDs
   * @private
   */
  static async _batchFetchDataObjects(ids) {
    if (ids.length === 0) return [];

    const { query } = require('../utils/db');
    const result = await query(
      `SELECT * FROM data_objects WHERE id = ANY($1)`,
      [ids]
    );

    return result.map(row => DataObject._transformFromDb(row));
  }

  /**
   * Get threat scenario for the finding
   * @private
   */
  static async _getThreatScenario(risk) {
    if (!risk || !risk.threatScenarioId) {
      return null;
    }
    return await ThreatScenario.findById(risk.threatScenarioId);
  }

  /**
   * Get financial impact for the finding
   * @private
   */
  static async _getFinancialImpact(risk, threatScenario) {
    if (!risk) {
      return null;
    }

    // Try to get existing financial impact
    let financialImpact = await FinancialImpact.findByRiskId(risk.id);

    // If not exists, create basic impact from risk data
    if (!financialImpact && risk.financialExposure) {
      // Estimate impact based on severity and threat
      const baseExposure = risk.financialExposure;

      // Estimate components based on threat type
      let breachResponseCost = baseExposure * 0.3;
      let regulatoryFine = baseExposure * 0.2;
      let businessInterruption = baseExposure * 0.25;
      let reputationalLoss = baseExposure * 0.15;
      let legalCost = baseExposure * 0.1;
      let fraudLoss = 0;

      // Adjust based on threat scenario
      if (threatScenario) {
        switch (threatScenario.type) {
          case 'ransomware':
            breachResponseCost = baseExposure * 0.4;
            businessInterruption = baseExposure * 0.35;
            break;
          case 'phishing':
            fraudLoss = baseExposure * 0.3;
            break;
          case 'supply_chain':
            businessInterruption = baseExposure * 0.4;
            regulatoryFine = baseExposure * 0.25;
            break;
        }
      }

      financialImpact = {
        totalGross: baseExposure,
        breachResponseCost,
        regulatoryFine,
        businessInterruption,
        fraudLoss,
        reputationalLoss,
        legalCost,
        recoveryCost: 0,
        insuranceCoverage: 0,
        netExposure: baseExposure
      };
    }

    return financialImpact;
  }

  /**
   * Get legal obligations for the finding (optimized with batch queries)
   * @private
   */
  static async _getLegalObligationsOptimized(risk, threatScenario) {
    const obligations = [];

    // From risk - batch fetch with cache
    if (risk && risk.legalObligationIds && risk.legalObligationIds.length > 0) {
      const uncachedIds = [];

      // Check cache first
      for (const id of risk.legalObligationIds) {
        const cached = await this.redisCache.getCachedDataObject(id); // Using same cache pattern
        if (cached) {
          obligations.push(cached);
        } else {
          uncachedIds.push(id);
        }
      }

      // Batch fetch uncached obligations
      if (uncachedIds.length > 0) {
        const { query } = require('../utils/db');
        const result = await query(
          `SELECT * FROM legal_obligations WHERE id = ANY($1)`,
          [uncachedIds]
        );

        for (const row of result) {
          const obligation = LegalObligation._transformFromDb(row);
          obligations.push(obligation);
          await this.redisCache.cacheDataObject(row.id, obligation);
        }
      }
    }

    // From threat scenario (if HIPAA-related data is involved)
    if (threatScenario && obligations.length === 0) {
      const hipaaObligations = await LegalObligation.getHIPAAObligations(risk?.organizationId || '');
      obligations.push(...hipaaObligations.slice(0, 3)); // Top 3 HIPAA obligations
    }

    return obligations;
  }

  /**
   * Get owners for the finding (optimized with caching)
   * @private
   */
  static async _getOwnersOptimized(risk, businessProcess) {
    const owners = {
      executive: null,
      remediation: null,
      evidence: null,
      businessProcessOwner: null
    };

    // From risk
    if (risk) {
      if (risk.executiveOwner) {
        // Try cache first
        const cached = await this.redisCache.getCachedOwner(risk.executiveOwner);
        if (cached) {
          owners.executive = cached;
        } else {
          const execOwner = await ExecutiveOwner.findByUserId(risk.executiveOwner);
          if (execOwner) {
            await this.redisCache.cacheOwner(risk.executiveOwner, execOwner);
            owners.executive = execOwner;
          }
        }
      }
      owners.remediation = risk.remediationOwner;
      owners.evidence = risk.evidenceOwner;
    }

    // From business process
    if (businessProcess) {
      owners.businessProcessOwner = businessProcess.owner;

      // If no executive owner from risk, try to find by role
      if (!owners.executive && businessProcess.owner) {
        const roleOwner = await ExecutiveOwner.findByRole(businessProcess.owner, risk?.organizationId || '');
        if (roleOwner) {
          owners.executive = roleOwner;
        }
      }
    }

    return owners;
  }

  /**
   * Get audit evidence requirements
   * @private
   */
  static async _getAuditEvidence(risk) {
    if (!risk) {
      return {
        required: false,
        description: null,
        testIds: []
      };
    }

    return {
      required: !!risk.auditEvidenceRequired,
      description: risk.auditEvidenceRequired,
      testIds: risk.auditTestIds || []
    };
  }

  /**
   * Build the executive narrative
   * @private
   */
  static _buildNarrative(data) {
    const {
      finding,
      risk,
      businessProcess,
      dataObjects,
      threatScenario,
      financialImpact,
      frameworkMappings,
      legalObligations,
      owners,
      auditEvidence
    } = data;

    // Build narrative summary
    const summary = this._buildSummary({
      finding,
      businessProcess,
      dataObjects,
      threatScenario
    });

    // Build financial summary
    const financialSummary = this._buildFinancialSummary(financialImpact, risk);

    // Build regulatory summary
    const regulatorySummary = this._buildRegulatorySummary(
      legalObligations,
      frameworkMappings
    );

    // Build ownership summary
    const ownershipSummary = this._buildOwnershipSummary(owners);

    return {
      finding: {
        id: finding.id,
        title: finding.title,
        severity: finding.severity,
        status: finding.status,
        discoveredDate: finding.discoveredDate,
        source: finding.tool || finding.source
      },
      executiveNarrative: {
        summary,
        businessProcess: businessProcess ? {
          id: businessProcess.id,
          name: businessProcess.name,
          tier: businessProcess.tier,
          criticality: businessProcess.criticality,
          owner: businessProcess.owner
        } : null,
        dataInvolvement: dataObjects.map(obj => ({
          type: obj.type,
          sensitivity: obj.sensitivity,
          classification: obj.type === 'PHI' ? 'Protected Health Information' :
                         obj.type === 'PII' ? 'Personally Identifiable Information' :
                         obj.type === 'PCI' ? 'Payment Card Information' : obj.type
        })),
        threat: threatScenario ? {
          type: threatScenario.type,
          name: threatScenario.name,
          probability: threatScenario.probability,
          impact: threatScenario.impactLevel,
          mitreTechnique: threatScenario.mitreTechnique
        } : null,
        financialExposure: financialSummary,
        regulatory: regulatorySummary,
        ownership: ownershipSummary,
        auditEvidence: auditEvidence
      },
      correlation: {
        riskId: risk?.id || null,
        assetId: finding.assetId || null,
        applicationId: finding.applicationId || null,
        businessProcessId: businessProcess?.id || null,
        threatScenarioId: threatScenario?.id || null
      },
      correlationMetadata: {
        correlatedAt: new Date().toISOString(),
        performanceMetrics: this.performanceMonitor.getMetrics()
      }
    };
  }

  /**
   * Build narrative summary
   * @private
   */
  static _buildSummary({ finding, businessProcess, dataObjects, threatScenario }) {
    let summary = `${finding.title} detected`;

    if (businessProcess) {
      summary += ` affecting ${businessProcess.name} (${businessProcess.tier} tier)`;
    }

    if (dataObjects.length > 0) {
      const dataTypes = [...new Set(dataObjects.map(d => d.type))].join(', ');
      summary += ` involving ${dataTypes}`;
    }

    if (threatScenario) {
      summary += ` with potential for ${threatScenario.type}`;
    }

    return summary;
  }

  /**
   * Build financial summary
   * @private
   */
  static _buildFinancialSummary(financialImpact, risk) {
    if (!financialImpact) {
      return risk?.financialExposure ? {
        totalExposure: risk.financialExposure,
        breakdown: null
      } : null;
    }

    return {
      totalGrossExposure: financialImpact.totalGross,
      netExposure: financialImpact.netExposure,
      insuranceCoverage: financialImpact.insuranceCoverage,
      breakdown: {
        breachResponseCost: financialImpact.breachResponseCost,
        regulatoryFines: financialImpact.regulatoryFine,
        businessInterruption: financialImpact.businessInterruption,
        fraudLoss: financialImpact.fraudLoss,
        reputationalLoss: financialImpact.reputationalLoss,
        legalCosts: financialImpact.legalCost,
        recoveryCost: financialImpact.recoveryCost
      }
    };
  }

  /**
   * Build regulatory summary
   * @private
   */
  static _buildRegulatorySummary(legalObligations, frameworkMappings) {
    return {
      frameworks: frameworkMappings || [],
      obligations: legalObligations.map(obl => ({
        name: obl.name,
        source: obl.source,
        notificationTimeline: obl.notificationTimeline,
        citation: obl.citation,
        maxPenalty: obl.maxPenaltyAmount
      })),
      urgentNotifications: legalObligations
        .filter(obl => obl.notificationTimeline && (
          obl.notificationTimeline.includes('hour') ||
          obl.notificationTimeline.includes('24') ||
          obl.notificationTimeline.includes('48') ||
          obl.notificationTimeline.includes('72')
        ))
        .map(obl => ({
          obligation: obl.name,
          timeline: obl.notificationTimeline
        }))
    };
  }

  /**
   * Build ownership summary
   * @private
   */
  static _buildOwnershipSummary(owners) {
    return {
      executive: owners.executive ? {
        roleId: owners.executive.roleId,
        name: owners.executive.name,
        email: owners.executive.email
      } : null,
      remediationOwner: owners.remediationOwner,
      evidenceOwner: owners.evidence,
      businessProcessOwner: owners.businessProcessOwner
    };
  }

  /**
   * Batch correlate multiple findings (optimized with parallel processing)
   * @param {string[]} findingIds - Array of finding IDs
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of executive narratives
   */
  static async batchCorrelate(findingIds, organizationId) {
    const startTime = Date.now();

    // Process all findings in parallel with concurrency limit
    const concurrencyLimit = 10;
    const results = [];

    for (let i = 0; i < findingIds.length; i += concurrencyLimit) {
      const batch = findingIds.slice(i, i + concurrencyLimit);

      const batchResults = await Promise.allSettled(
        batch.map(findingId =>
          this.generateExecutiveNarrative(findingId, organizationId)
            .catch(err => ({
              findingId,
              error: err.message
            }))
        )
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      }
    }

    const duration = Date.now() - startTime;
    const avgPerFinding = duration / findingIds.length;

    this.performanceMonitor.logger.info(
      `Batch correlation: ${findingIds.length} findings in ${duration}ms (avg: ${avgPerFinding.toFixed(0)}ms per finding)`
    );

    return results;
  }

  /**
   * Get organization risk summary
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Risk summary
   */
  static async getOrganizationRiskSummary(organizationId) {
    // Get all risks
    const risks = await Risk.findByOrganization(organizationId);

    // Get financial impact totals
    const financialTotals = await FinancialImpact.getTotalExposure(organizationId);

    // Get repeat findings
    const repeatFindings = await Finding.findRepeats(organizationId);

    // Get high-value data objects
    const highValueData = await DataObject.getHighValueDataObjects(organizationId);

    // Get high-probability threats
    const highProbThreats = await ThreatScenario.getHighProbabilityThreats(organizationId, 70);

    // Get executive roster
    const executiveRoster = await ExecutiveOwner.getExecutiveRoster(organizationId);

    return {
      organizationId,
      summary: {
        totalRisks: risks.length,
        openRisks: risks.filter(r => r.status === 'open').length,
        criticalRisks: risks.filter(r => r.severity === 'Critical').length,
        repeatFindings: repeatFindings.length
      },
      financialExposure: financialTotals,
      topRisks: risks.slice(0, 10),
      repeatFindings: repeatFindings.slice(0, 5),
      highValueData: highValueData,
      highProbabilityThreats: highProbThreats,
      executiveRoster
    };
  }

  /**
   * Invalidate correlation cache for a finding
   * @param {string} findingId - Finding ID
   * @returns {Promise<void>}
   */
  static async invalidateCache(findingId) {
    await this.redisCache.invalidateFinding(findingId);
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  static getPerformanceMetrics() {
    return this.performanceMonitor.getMetrics();
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache stats
   */
  static async getCacheStats() {
    return await this.redisCache.getStats();
  }
}

module.exports = CorrelationEngineOptimized;
