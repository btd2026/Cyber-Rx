/**
 * RiskObjectExplorer Component
 *
 * Searchable and filterable risk object explorer
 * Shows all security risks with sorting and filtering capabilities
 */

import React, { useState, useEffect } from 'react';
import { Search, Filter, SortAsc, SortDesc, AlertTriangle, Shield, TrendingUp } from 'lucide-react';

const RiskObjectExplorer = ({ briefing, apiEndpoint, token, orgId }) => {
  const [riskObjects, setRiskObjects] = useState([]);
  const [filteredRisks, setFilteredRisks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState('severity');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedRisk, setSelectedRisk] = useState(null);

  useEffect(() => {
    if (briefing?.risk_objects) {
      setRiskObjects(briefing.risk_objects);
    } else {
      fetchRiskObjects();
    }
  }, [briefing]);

  useEffect(() => {
    filterAndSortRisks();
  }, [riskObjects, searchTerm, severityFilter, categoryFilter, sortField, sortDirection]);

  const fetchRiskObjects = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${apiEndpoint}/risk-objects?org_id=${orgId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Org-Id': orgId
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRiskObjects(data.risk_objects || data || []);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching risk objects:', err);
      setLoading(false);
    }
  };

  const filterAndSortRisks = () => {
    let filtered = [...riskObjects];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(risk =>
        (risk.name || risk.risk_name || '').toLowerCase().includes(term) ||
        (risk.description || '').toLowerCase().includes(term) ||
        (risk.category || '').toLowerCase().includes(term)
      );
    }

    // Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(risk =>
        (risk.severity || 'medium').toLowerCase() === severityFilter.toLowerCase()
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(risk =>
        (risk.category || 'general').toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal = a[sortField] || 0;
      let bVal = b[sortField] || 0;

      // Handle severity ordering
      if (sortField === 'severity') {
        const order = { critical: 4, high: 3, medium: 2, low: 1 };
        aVal = order[aVal?.toLowerCase()] || 0;
        bVal = order[bVal?.toLowerCase()] || 0;
      }

      // Handle numeric fields
      if (typeof aVal === 'string' && !isNaN(aVal)) aVal = parseFloat(aVal);
      if (typeof bVal === 'string' && !isNaN(bVal)) bVal = parseFloat(bVal);

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredRisks(filtered);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'critical': { bg: '#fef2f2', text: '#991b1b', icon: '#dc2626' },
      'high': { bg: '#fee2e2', text: '#dc2626', icon: '#ef4444' },
      'medium': { bg: '#fef3c7', text: '#92400e', icon: '#f59e0b' },
      'low': { bg: '#d1fae5', text: '#065f46', icon: '#22c55e' }
    };
    return colors[severity?.toLowerCase()] || colors['medium'];
  };

  const categories = [...new Set(riskObjects.map(r => r.category || 'general').filter(Boolean))];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <div style={{ fontSize: '18px', color: '#6b7280' }}>Loading risk objects...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Risk Object Explorer</h3>
          <p style={{ fontSize: '13px', color: '#6b7280' }}>
            {filteredRisks.length} risk object{filteredRisks.length !== 1 ? 's' : ''} found
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 300, display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}
            />
            <input
              type="text"
              placeholder="Search risks..."
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
        </div>

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
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            padding: '10px 16px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: 'white',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Risk Table */}
      <div
        style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}
      >
        {filteredRisks.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            <Shield size={48} style={{ margin: '0 auto 16px' }} />
            <p>No risk objects found</p>
            <p style={{ fontSize: '13px' }}>Try adjusting your search or filters</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    <button
                      onClick={() => handleSort('name')}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#374151',
                        padding: 0
                      }}
                    >
                      Risk Name
                      {sortField === 'name' && (
                        sortDirection === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />
                      )}
                    </button>
                  </th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    <button
                      onClick={() => handleSort('severity')}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#374151',
                        padding: 0,
                        margin: '0 auto'
                      }}
                    >
                      Severity
                      {sortField === 'severity' && (
                        sortDirection === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />
                      )}
                    </button>
                  </th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    <button
                      onClick={() => handleSort('likelihood')}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#374151',
                        padding: 0,
                        margin: '0 auto'
                      }}
                    >
                      Likelihood
                      {sortField === 'likelihood' && (
                        sortDirection === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />
                      )}
                    </button>
                  </th>
                  <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    <button
                      onClick={() => handleSort('financial_impact')}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#374151',
                        padding: 0,
                        marginLeft: 'auto'
                      }}
                    >
                      Financial Impact
                      {sortField === 'financial_impact' && (
                        sortDirection === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />
                      )}
                    </button>
                  </th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    Category
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRisks.map((risk, index) => {
                  const severityColor = getSeverityColor(risk.severity);
                  return (
                    <tr
                      key={index}
                      onClick={() => setSelectedRisk(risk)}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        cursor: 'pointer',
                        backgroundColor: selectedRisk === risk ? '#eff6ff' : 'white',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedRisk !== risk) {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedRisk !== risk) {
                          e.currentTarget.style.backgroundColor = 'white';
                        }
                      }}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <AlertTriangle size={16} style={{ color: severityColor.icon }} />
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
                              {risk.name || risk.risk_name || 'Unnamed Risk'}
                            </div>
                            {risk.description && (
                              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                {risk.description.substring(0, 60)}...
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '700',
                            backgroundColor: severityColor.bg,
                            color: severityColor.text,
                            textTransform: 'uppercase'
                          }}
                        >
                          {risk.severity || 'Medium'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', color: '#6b7280' }}>
                        {risk.likelihood || 'N/A'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                        ${formatCurrency(risk.financial_impact || 0)}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6b7280' }}>
                        {risk.category || 'General'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Risk Detail Panel */}
      {selectedRisk && (
        <div
          style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
            <h4 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
              {selectedRisk.name || selectedRisk.risk_name}
            </h4>
            <button
              onClick={() => setSelectedRisk(null)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              Close
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Severity</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                {selectedRisk.severity || 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Likelihood</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                {selectedRisk.likelihood || 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Financial Impact</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                ${formatCurrency(selectedRisk.financial_impact || 0)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Category</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                {selectedRisk.category || 'General'}
              </div>
            </div>
          </div>

          {selectedRisk.description && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Description</div>
              <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#374151' }}>
                {selectedRisk.description}
              </div>
            </div>
          )}

          {selectedRisk.mitigation && (
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Mitigation</div>
              <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#374151' }}>
                {selectedRisk.mitigation}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const formatCurrency = (value) => {
  if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
  if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
  return value.toFixed(0);
};

export default RiskObjectExplorer;
