/**
 * ThreatIntelligenceFeed Component
 *
 * Real-time threat intelligence feed from CISA KEV, NIST NVD, and EPSS
 * Shows relevant threats matched against your attack surface
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, Clock, ExternalLink, RefreshCw, Filter, Search } from 'lucide-react';

const ThreatIntelligenceFeed = ({ threats, onRefresh }) => {
  const [filteredThreats, setFilteredThreats] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    setFilteredThreats(threats || []);
  }, [threats]);

  useEffect(() => {
    filterThreats();
  }, [threats, searchTerm, sourceFilter, severityFilter]);

  // Auto-refresh every 5 minutes if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (onRefresh) {
        onRefresh();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [autoRefresh, onRefresh]);

  const filterThreats = () => {
    let filtered = [...(threats || [])];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(threat =>
        (threat.cve_id || '').toLowerCase().includes(term) ||
        (threat.description || '').toLowerCase().includes(term) ||
        (threat.name || '').toLowerCase().includes(term)
      );
    }

    // Source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(threat =>
        (threat.source || '').toLowerCase() === sourceFilter.toLowerCase()
      );
    }

    // Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(threat => {
        const score = threat.cvss_score || 0;
        if (severityFilter === 'critical') return score >= 9.0;
        if (severityFilter === 'high') return score >= 7.0 && score < 9.0;
        if (severityFilter === 'medium') return score >= 4.0 && score < 7.0;
        if (severityFilter === 'low') return score < 4.0;
        return true;
      });
    }

    setFilteredThreats(filtered);
  };

  const getSeverityColor = (cvssScore) => {
    if (cvssScore >= 9.0) return { bg: '#fef2f2', text: '#991b1b', label: 'Critical' };
    if (cvssScore >= 7.0) return { bg: '#fee2e2', text: '#dc2626', label: 'High' };
    if (cvssScore >= 4.0) return { bg: '#fef3c7', text: '#92400e', label: 'Medium' };
    return { bg: '#d1fae5', text: '#065f46', label: 'Low' };
  };

  const getSourceColor = (source) => {
    const colors = {
      'CISA KEV': { bg: '#fef3c7', text: '#92400e' },
      'NIST NVD': { bg: '#dbeafe', text: '#1e40af' },
      'EPSS': { bg: '#e0e7ff', text: '#3730a3' }
    };
    return colors[source] || { bg: '#f3f4f6', text: '#374151' };
  };

  const sortedThreats = [...filteredThreats].sort((a, b) => {
    // Sort by CVSS score descending, then by date
    const scoreDiff = (b.cvss_score || 0) - (a.cvss_score || 0);
    if (scoreDiff !== 0) return scoreDiff;
    return new Date(b.published_date || 0) - new Date(a.published_date || 0);
  });

  const matchedThreats = sortedThreats.filter(t => t.matched_assets && t.matched_assets.length > 0);
  const unmatchedThreats = sortedThreats.filter(t => !t.matched_assets || t.matched_assets.length === 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Threat Intelligence Feed</h3>
          <p style={{ fontSize: '13px', color: '#6b7280' }}>
            {matchedThreats.length} relevant threat{matchedThreats.length !== 1 ? 's' : ''} matched to your attack surface
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#6b7280' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Auto-refresh
          </label>
          <button
            onClick={() => onRefresh && onRefresh()}
            style={{
              padding: '8px 12px',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px'
            }}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 250, position: 'relative' }}>
          <Search
            size={18}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}
          />
          <input
            type="text"
            placeholder="Search by CVE, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          style={{
            padding: '10px 16px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: 'white',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Sources</option>
          <option value="CISA KEV">CISA KEV</option>
          <option value="NIST NVD">NIST NVD</option>
          <option value="EPSS">EPSS</option>
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          style={{
            padding: '10px 16px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: 'white',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical (9.0+)</option>
          <option value="high">High (7.0-8.9)</option>
          <option value="medium">Medium (4.0-6.9)</option>
          <option value="low">Low (&lt;4.0)</option>
        </select>
      </div>

      {/* Matched Threats */}
      {matchedThreats.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Shield size={18} style={{ color: '#ef4444' }} />
            <h4 style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>
              Matched to Your Assets ({matchedThreats.length})
            </h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {matchedThreats.map((threat, index) => {
              const severityColor = getSeverityColor(threat.cvss_score || 0);
              const sourceColor = getSourceColor(threat.source);

              return (
                <div
                  key={index}
                  onClick={() => setSelectedThreat(threat)}
                  style={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#fbbf24';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '700',
                            backgroundColor: severityColor.bg,
                            color: severityColor.text,
                            textTransform: 'uppercase'
                          }}
                        >
                          {severityColor.label} {threat.cvss_score?.toFixed(1) || 'N/A'}
                        </span>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            backgroundColor: sourceColor.bg,
                            color: sourceColor.text
                          }}
                        >
                          {threat.source || 'Unknown'}
                        </span>
                        {threat.cve_id && (
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937' }}>
                            {threat.cve_id}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '14px', color: '#374151', marginBottom: '8px' }}>
                        {threat.description || threat.name || 'No description available'}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#6b7280' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={14} />
                          {threat.published_date ? new Date(threat.published_date).toLocaleDateString() : 'Unknown date'}
                        </span>
                        {threat.matched_assets && (
                          <span>
                            {threat.matched_assets.length} asset{threat.matched_assets.length !== 1 ? 's' : ''} affected
                          </span>
                        )}
                        {threat.epss_score && (
                          <span>
                            EPSS: {(threat.epss_score * 100).toFixed(2)}%
                          </span>
                        )}
                      </div>
                    </div>

                    {threat.vendor_advisory && (
                      <a
                        href={threat.vendor_advisory}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: '#eff6ff',
                          color: '#3b82f6',
                          border: '1px solid #bfdbfe',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        Details <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unmatched Threats */}
      {unmatchedThreats.length > 0 && (
        <details style={{ cursor: 'pointer' }}>
          <summary style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>
            <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
            Other Active Threats ({unmatchedThreats.length})
          </summary>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            {unmatchedThreats.map((threat, index) => (
              <div
                key={index}
                style={{
                  padding: '12px',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '13px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    {threat.cve_id && (
                      <span style={{ fontWeight: '600', marginRight: '8px' }}>{threat.cve_id}</span>
                    )}
                    <span style={{ color: '#6b7280' }}>
                      {threat.description?.substring(0, 80) || 'No description'}...
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    CVSS: {threat.cvss_score?.toFixed(1) || 'N/A'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Empty State */}
      {sortedThreats.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <Shield size={48} style={{ color: '#9ca3af', margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7280', marginBottom: '8px' }}>No threats found</p>
          <p style={{ fontSize: '13px', color: '#9ca3af' }}>
            Threat intelligence will appear here when CVEs are published
          </p>
        </div>
      )}

      {/* Threat Detail Modal */}
      {selectedThreat && (
        <div
          onClick={() => setSelectedThreat(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                {selectedThreat.cve_id || 'Threat Details'}
              </h3>
              <button
                onClick={() => setSelectedThreat(null)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#374151' }}>
              {selectedThreat.description || 'No description available.'}
            </div>

            {selectedThreat.matched_assets && selectedThreat.matched_assets.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Affected Assets</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedThreat.matched_assets.map((asset, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        borderRadius: '16px',
                        fontSize: '12px'
                      }}
                    >
                      {asset}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedThreat.vendor_advisory && (
              <div style={{ marginTop: '16px' }}>
                <a
                  href={selectedThreat.vendor_advisory}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px'
                  }}
                >
                  View Advisory <ExternalLink size={16} />
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreatIntelligenceFeed;
