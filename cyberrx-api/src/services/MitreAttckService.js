'use strict';

const axios = require('axios');

/**
 * MITRE ATT&CK Service
 *
 * Integrates with MITRE ATT&CK Enterprise matrix to provide:
 * - Tactics, Techniques, and Procedures (TTPs)
 * - Technique search and details
 * - Tactic browsing
 *
 * Uses MITRE ATT&CK REST API: https://attack.mitre.org/resources/api/
 */
class MitreAttckService {
  constructor(logger) {
    this.logger = logger;
    this.baseUrl = 'https://attack.mitre.org/api';
    this.enterpriseTacticsUrl = `${this.baseUrl}/enterprise/tactics`;
    this.enterpriseTechniquesUrl = `${this.baseUrl}/enterprise/techniques`;
    this.cache = new Map();
    this.cacheTtl = 1000 * 60 * 60; // 1 hour cache
  }

  /**
   * Get all MITRE ATT&CK enterprise tactics
   * @returns {Promise<Array>} Array of tactics
   */
  async getAllTactics() {
    try {
      const cacheKey = 'all_tactics';
      const cached = this.getCached(cacheKey);
      if (cached) return cached;

      const response = await axios.get(this.enterpriseTacticsUrl, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json'
        }
      });

      const tactics = response.data.map(tactic => ({
        id: tactic.id,
        name: tactic.name,
        url: `https://attack.mitre.org/tactics/${tactic.id}`,
        description: tactic.description || '',
        techniques: []
      }));

      this.setCache(cacheKey, tactics);
      this.logger?.logInfo('Fetched MITRE tactics', { count: tactics.length });

      return tactics;
    } catch (error) {
      this.logger?.logError('Failed to fetch MITRE tactics', { error: error.message });
      // Return fallback tactics if API fails
      return this.getFallbackTactics();
    }
  }

  /**
   * Get tactic details with techniques
   * @param {string} tacticName - Tactic name (e.g., 'Initial Access')
   * @returns {Promise<Object>} Tactic details
   */
  async getTacticDetails(tacticName) {
    try {
      const tactics = await this.getAllTactics();
      const tactic = tactics.find(t => t.name.toLowerCase() === tacticName.toLowerCase());

      if (!tactic) {
        throw new Error(`Tactic ${tacticName} not found`);
      }

      // Get techniques for this tactic
      const techniques = await this.getTechniquesByTactic(tactic.name);
      tactic.techniques = techniques;

      return tactic;
    } catch (error) {
      this.logger?.logError('Failed to get tactic details', { error: error.message });
      return null;
    }
  }

  /**
   * Get all MITRE ATT&CK enterprise techniques
   * @returns {Promise<Array>} Array of techniques
   */
  async getAllTechniques() {
    try {
      const cacheKey = 'all_techniques';
      const cached = this.getCached(cacheKey);
      if (cached) return cached;

      const response = await axios.get(this.enterpriseTechniquesUrl, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json'
        }
      });

      const techniques = response.data.map(technique => ({
        id: technique.id,
        name: technique.name,
        url: `https://attack.mitre.org/techniques/${technique.id.replace('T', 'T')}`,
        description: technique.description || '',
        tactics: technique.tactics || [],
        detection: technique.detection || [],
        mitigation: technique.mitigation || []
      }));

      this.setCache(cacheKey, techniques);
      this.logger?.logInfo('Fetched MITRE techniques', { count: techniques.length });

      return techniques;
    } catch (error) {
      this.logger?.logError('Failed to fetch MITRE techniques', { error: error.message });
      // Return fallback techniques if API fails
      return this.getFallbackTechniques();
    }
  }

  /**
   * Get technique details by ID
   * @param {string} techniqueId - Technique ID (e.g., 'T1486')
   * @returns {Promise<Object>} Technique details
   */
  async getTechniqueDetails(techniqueId) {
    try {
      const cacheKey = `technique_${techniqueId}`;
      const cached = this.getCached(cacheKey);
      if (cached) return cached;

      // Format technique ID (e.g., 'T1486' -> 'T1486')
      const formattedId = techniqueId.toUpperCase().startsWith('T') ? techniqueId : `T${techniqueId}`;

      const techniques = await this.getAllTechniques();
      const technique = techniques.find(t => t.id === formattedId);

      if (!technique) {
        throw new Error(`Technique ${techniqueId} not found`);
      }

      this.setCache(cacheKey, technique);
      return technique;
    } catch (error) {
      this.logger?.logError('Failed to get technique details', { error: error.message });
      return null;
    }
  }

  /**
   * Get techniques by tactic
   * @param {string} tacticName - Tactic name
   * @returns {Promise<Array>} Array of techniques
   */
  async getTechniquesByTactic(tacticName) {
    try {
      const techniques = await this.getAllTechniques();
      return techniques.filter(t =>
        t.tactics.some(tactic => tactic.toLowerCase() === tacticName.toLowerCase())
      );
    } catch (error) {
      this.logger?.logError('Failed to get techniques by tactic', { error: error.message });
      return [];
    }
  }

  /**
   * Search techniques by query
   * @param {string} query - Search query
   * @returns {Promise<Array>} Array of matching techniques
   */
  async searchTechniques(query) {
    try {
      const techniques = await this.getAllTechniques();
      const lowerQuery = query.toLowerCase();

      return techniques.filter(technique =>
        technique.name.toLowerCase().includes(lowerQuery) ||
        technique.id.toLowerCase().includes(lowerQuery) ||
        (technique.description && technique.description.toLowerCase().includes(lowerQuery))
      );
    } catch (error) {
      this.logger?.logError('Failed to search techniques', { error: error.message });
      return [];
    }
  }

  /**
   * Get techniques by sub-technique
   * @param {string} techniqueId - Parent technique ID
   * @returns {Promise<Array>} Array of sub-techniques
   */
  async getSubTechniques(techniqueId) {
    try {
      const techniques = await this.getAllTechniques();
      const parentTechnique = techniques.find(t => t.id === techniqueId);

      if (!parentTechnique) {
        return [];
      }

      // Filter sub-techniques (e.g., 'T1564.001' is a sub-technique of 'T1564')
      return techniques.filter(t =>
        t.id.startsWith(`${techniqueId}.`) &&
        t.id.length > techniqueId.length
      );
    } catch (error) {
      this.logger?.logError('Failed to get sub-techniques', { error: error.message });
      return [];
    }
  }

  /**
   * Get cached value
   * @private
   */
  getCached(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheTtl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cached value
   * @private
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get fallback tactics if API fails
   * @private
   */
  getFallbackTactics() {
    return [
      { id: 'TA0001', name: 'Initial Access', url: 'https://attack.mitre.org/tactics/TA0001' },
      { id: 'TA0002', name: 'Execution', url: 'https://attack.mitre.org/tactics/TA0002' },
      { id: 'TA0003', name: 'Persistence', url: 'https://attack.mitre.org/tactics/TA0003' },
      { id: 'TA0004', name: 'Privilege Escalation', url: 'https://attack.mitre.org/tactics/TA0004' },
      { id: 'TA0005', name: 'Defense Evasion', url: 'https://attack.mitre.org/tactics/TA0005' },
      { id: 'TA0006', name: 'Credential Access', url: 'https://attack.mitre.org/tactics/TA0006' },
      { id: 'TA0007', name: 'Discovery', url: 'https://attack.mitre.org/tactics/TA0007' },
      { id: 'TA0008', name: 'Lateral Movement', url: 'https://attack.mitre.org/tactics/TA0008' },
      { id: 'TA0009', name: 'Collection', url: 'https://attack.mitre.org/tactics/TA0009' },
      { id: 'TA0010', name: 'Exfiltration', url: 'https://attack.mitre.org/tactics/TA0010' },
      { id: 'TA0011', name: 'Command and Control', url: 'https://attack.mitre.org/tactics/TA0011' },
      { id: 'TA0040', name: 'Impact', url: 'https://attack.mitre.org/tactics/TA0040' }
    ];
  }

  /**
   * Get fallback techniques if API fails
   * @private
   */
  getFallbackTechniques() {
    return [
      {
        id: 'T1486',
        name: 'Data Encrypted for Impact',
        url: 'https://attack.mitre.org/techniques/T1486',
        tactics: ['Impact'],
        description: 'Ransomware and other data destruction techniques'
      },
      {
        id: 'T1566',
        name: 'Phishing',
        url: 'https://attack.mitre.org/techniques/T1566',
        tactics: ['Initial Access'],
        description: 'Phishing and related social engineering attacks'
      },
      {
        id: 'T1567',
        name: 'Exfiltration Over Web Service',
        url: 'https://attack.mitre.org/techniques/T1567',
        tactics: ['Exfiltration'],
        description: 'Data exfiltration via web services'
      },
      {
        id: 'T1078',
        name: 'Valid Accounts',
        url: 'https://attack.mitre.org/techniques/T1078',
        tactics: ['Initial Access', 'Persistence', 'Privilege Escalation', 'Defense Evasion'],
        description: 'Use of valid credentials for access'
      },
      {
        id: 'T1190',
        name: 'Exploit Public-Facing Application',
        url: 'https://attack.mitre.org/techniques/T1190',
        tactics: ['Initial Access'],
        description: 'Exploitation of public-facing vulnerabilities'
      },
      {
        id: 'T1195',
        name: 'Supply Chain Compromise',
        url: 'https://attack.mitre.org/techniques/T1195',
        tactics: ['Initial Access'],
        description: 'Supply chain and third-party compromises'
      },
      {
        id: 'T1530',
        name: 'Data from Cloud Storage Object',
        url: 'https://attack.mitre.org/techniques/T1530',
        tactics: ['Collection'],
        description: 'Data extraction from cloud storage'
      },
      {
        id: 'T1070',
        name: 'Indicator Removal on Host',
        url: 'https://attack.mitre.org/techniques/T1070',
        tactics: ['Defense Evasion'],
        description: 'Techniques to remove indicators of compromise'
      },
      {
        id: 'T1059',
        name: 'Command and Scripting Interpreter',
        url: 'https://attack.mitre.org/techniques/T1059',
        tactics: ['Execution'],
        description: 'Command-line and script execution'
      },
      {
        id: 'T1133',
        name: 'External Remote Services',
        url: 'https://attack.mitre.org/techniques/T1133',
        tactics: ['Initial Access', 'Persistence'],
        description: 'Remote services like VPN and RDP'
      }
    ];
  }
}

module.exports = MitreAttckService;
