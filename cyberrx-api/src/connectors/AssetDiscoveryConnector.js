'use strict';

const BaseConnector = require('./BaseConnector');
const Asset = require('../models/Asset');
const { v4: uuidv4 } = require('uuid');

/**
 * Asset Discovery Connector
 *
 * Discovers infrastructure assets from multiple sources:
 * - CrowdStrike (endpoints)
 * - Okta (applications)
 * - AWS (cloud resources)
 * 
 * Extends BaseConnector to leverage standard signal collection framework
 */
class AssetDiscoveryConnector extends BaseConnector {
  constructor(config) {
    super({
      connectorType: 'asset-discovery',
      sourceType: 'api',
      ...config
    });
    this.organizationId = config.organizationId;
    this.source = config.source || 'unknown';
  }

  /**
   * Collect assets from the configured source
   * @returns {Promise<Array>} Array of discovered assets
   */
  async collectSignals() {
    const discoveredAssets = [];

    try {
      switch (this.source) {
        case 'crowdstrike':
          discoveredAssets.push(...await this.discoverFromCrowdStrike());
          break;
        case 'okta':
          discoveredAssets.push(...await this.discoverFromOkta());
          break;
        case 'aws':
          discoveredAssets.push(...await this.discoverFromAWS());
          break;
        default:
          throw new Error(`Unsupported discovery source: ${this.source}`);
      }

      return discoveredAssets;
    } catch (error) {
      console.error(`Asset discovery error from ${this.source}:`, error.message);
      return [];
    }
  }

  /**
   * Test connection to the discovery source
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection() {
    try {
      switch (this.source) {
        case 'crowdstrike':
          return await this.testCrowdStrikeConnection();
        case 'okta':
          return await this.testOktaConnection();
        case 'aws':
          return await this.testAWSConnection();
        default:
          return {
            status: 'error',
            message: `Unsupported source: ${this.source}`,
            connectorType: this.connectorType
          };
      }
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        connectorType: this.connectorType,
        source: this.source
      };
    }
  }

  /**
   * Discover assets from CrowdStrike
   * @private
   */
  async discoverFromCrowdStrike() {
    // Integrate with CrowdStrike API
    // For now, return mock endpoint data
    return [
      {
        name: 'Endpoint-WS-001',
        type: 'endpoint',
        hostname: 'ws-001.corp.internal',
        ipAddress: '10.0.1.100',
        owner: 'CIO-EndpointManagement',
        description: 'Corporate workstation - CrowdStrike agent active',
        source: 'crowdstrike',
        discoveredAt: new Date().toISOString(),
        os: 'Windows 11',
        agentVersion: '6.44.17301',
        lastSeen: new Date().toISOString(),
        status: 'online'
      },
      {
        name: 'Endpoint-WS-002',
        type: 'endpoint',
        hostname: 'ws-002.corp.internal',
        ipAddress: '10.0.1.101',
        owner: 'CIO-EndpointManagement',
        description: 'Corporate workstation - CrowdStrike agent active',
        source: 'crowdstrike',
        discoveredAt: new Date().toISOString(),
        os: 'Windows 10',
        agentVersion: '6.44.17301',
        lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'online'
      },
      {
        name: 'Server-APP-001',
        type: 'server',
        hostname: 'app-01.prod.internal',
        ipAddress: '10.0.2.50',
        owner: 'CIO-Servers',
        description: 'Application server - CrowdStrike sensor active',
        source: 'crowdstrike',
        discoveredAt: new Date().toISOString(),
        os: 'Windows Server 2019',
        agentVersion: '6.44.17301',
        lastSeen: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        status: 'online'
      }
    ];
  }

  /**
   * Discover assets from Okta
   * @private
   */
  async discoverFromOkta() {
    // Integrate with Okta API
    return [
      {
        name: 'Okta SSO Dashboard',
        type: 'app',
        hostname: 'bcbs.okta.com',
        owner: 'CIO-Identity',
        description: 'SSO dashboard and identity provider',
        source: 'okta',
        discoveredAt: new Date().toISOString(),
        category: 'Identity Management',
        users: 15000,
        status: 'active'
      },
      {
        name: 'Salesforce Health Cloud',
        type: 'app',
        hostname: 'bcbs.okta.com',
        owner: 'CIO-MemberServices',
        description: 'Member services CRM',
        source: 'okta',
        discoveredAt: new Date().toISOString(),
        category: 'CRM',
        users: 3500,
        status: 'active'
      },
      {
        name: 'ServiceNow ITSM',
        type: 'app',
        hostname: 'bcbs.okta.com',
        owner: 'CIO-ITSM',
        description: 'IT service management platform',
        source: 'okta',
        discoveredAt: new Date().toISOString(),
        category: 'ITSM',
        users: 500,
        status: 'active'
      }
    ];
  }

  /**
   * Discover assets from AWS
   * @private
   */
  async discoverFromAWS() {
    // Integrate with AWS API
    return [
      {
        name: 'Claims-DB-Primary',
        type: 'database',
        hostname: 'claims-db.prod.aws.internal',
        cloudProvider: 'AWS',
        location: 'us-east-1',
        owner: 'CIO-Database',
        description: 'Primary claims processing database',
        source: 'aws',
        discoveredAt: new Date().toISOString(),
        instanceType: 'db.r5.4xlarge',
        engine: 'PostgreSQL',
        version: '14.7',
        status: 'available'
      },
      {
        name: 'Enrollment-App-Primary',
        type: 'app',
        hostname: 'enrollment-app-01.prod.aws.internal',
        cloudProvider: 'AWS',
        location: 'us-east-1',
        owner: 'CIO-Applications',
        description: 'Enrollment application server',
        source: 'aws',
        discoveredAt: new Date().toISOString(),
        instanceType: 't3.xlarge',
        os: 'Amazon Linux 2',
        status: 'running'
      },
      {
        name: 'Analytics-Data-Lake',
        type: 'cloud',
        hostname: 's3://cyberrx-analytics-prod/',
        cloudProvider: 'AWS',
        location: 'us-east-1',
        owner: 'CIO-Analytics',
        description: 'Analytics data lake - S3 bucket',
        source: 'aws',
        discoveredAt: new Date().toISOString(),
        storageClass: 'STANDARD',
        size: '5.2 TB',
        status: 'active'
      },
      {
        name: 'Payment-API-Gateway',
        type: 'API',
        hostname: 'api-gateway.prod.aws.internal',
        cloudProvider: 'AWS',
        location: 'us-east-1',
        owner: 'CIO-API',
        description: 'Payment processing API gateway',
        source: 'aws',
        discoveredAt: new Date().toISOString(),
        type: 'REST',
        status: 'deployed'
      }
    ];
  }

  /**
   * Test CrowdStrike connection
   * @private
   */
  async testCrowdStrikeConnection() {
    // Mock connection test
    // In production, would call CrowdStrike API health endpoint
    return {
      status: 'success',
      message: 'CrowdStrike API connection successful',
      connectorType: this.connectorType,
      source: 'crowdstrike',
      apiVersion: '6.44.17301',
      sensors: 15234,
      lastSync: new Date().toISOString()
    };
  }

  /**
   * Test Okta connection
   * @private
   */
  async testOktaConnection() {
    // Mock connection test
    return {
      status: 'success',
      message: 'Okta API connection successful',
      connectorType: this.connectorType,
      source: 'okta',
      apiVersion: '1.5.0',
      applications: 234,
      users: 15000,
      lastSync: new Date().toISOString()
    };
  }

  /**
   * Test AWS connection
   * @private
   */
  async testAWSConnection() {
    // Mock connection test
    return {
      status: 'success',
      message: 'AWS API connection successful',
      connectorType: this.connectorType,
      source: 'aws',
      region: 'us-east-1',
      resources: 487,
      lastSync: new Date().toISOString()
    };
  }

  /**
   * Normalize discovered asset to standard format
   * @param {Object} discoveredAsset - Raw asset from source
   * @returns {Object} Normalized asset
   */
  normalizeDiscoveredAsset(discoveredAsset) {
    return {
      name: discoveredAsset.name,
      type: discoveredAsset.type,
      hostname: discoveredAsset.hostname,
      ipAddress: discoveredAsset.ipAddress,
      owner: discoveredAsset.owner,
      description: discoveredAsset.description,
      cloudProvider: discoveredAsset.cloudProvider,
      location: discoveredAsset.location,
      organizationId: this.organizationId,
      businessProcessIds: [],
      applicationIds: [],
      dataClassification: [],
      discoveredAt: discoveredAsset.discoveredAt || new Date().toISOString(),
      source: discoveredAsset.source,
      metadata: {
        os: discoveredAsset.os,
        agentVersion: discoveredAsset.agentVersion,
        status: discoveredAsset.status,
        lastSeen: discoveredAsset.lastSeen
      }
    };
  }

  /**
   * Import discovered assets into database
   * @param {Array} discoveredAssets - Array of discovered assets
   * @param {Object} options - Import options
   * @returns {Promise<Array>} Array of imported assets
   */
  async importDiscoveredAssets(discoveredAssets, options = {}) {
    const importedAssets = [];

    for (const discoveredAsset of discoveredAssets) {
      try {
        const normalizedAsset = this.normalizeDiscoveredAsset(discoveredAsset);
        
        const asset = await Asset.create({
          id: `asset-${uuidv4()}`,
          ...normalizedAsset
        });

        importedAssets.push(asset);
      } catch (error) {
        console.error(`Error importing asset ${discoveredAsset.name}:`, error.message);
      }
    }

    return importedAssets;
  }

  /**
   * Sync discovered assets (discover + import)
   * @returns {Promise<Object>} Sync result
   */
  async sync() {
    try {
      const discoveredAssets = await this.collectSignals();
      const importedAssets = await this.importDiscoveredAssets(discoveredAssets);

      return {
        connectorType: this.connectorType,
        source: this.source,
        organizationId: this.organizationId,
        status: 'success',
        discoveredCount: discoveredAssets.length,
        importedCount: importedAssets.length,
        discoveredAssets,
        importedAssets,
        syncedAt: new Date().toISOString()
      };
    } catch (error) {
      return {
        connectorType: this.connectorType,
        source: this.source,
        organizationId: this.organizationId,
        status: 'error',
        error: error.message,
        discoveredCount: 0,
        importedCount: 0,
        syncedAt: new Date().toISOString()
      };
    }
  }
}

module.exports = AssetDiscoveryConnector;
