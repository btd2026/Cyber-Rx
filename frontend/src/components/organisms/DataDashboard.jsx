/**
 * DataDashboard Component
 *
 * Executive-level dashboard showing data exposure across the organization.
 * Displays classification summary, high-value data objects, and control coverage.
 *
 * @param {Object} props
 * @param {string} props.organizationId - Organization ID
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardShell from './DashboardShell';
import Badge from '../atoms/Badge';
import StatusIcon from '../atoms/StatusIcon';

const DataDashboard = ({ organizationId }) => {
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [highValueData, setHighValueData] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDataDashboard();
  }, [organizationId]);

  const loadDataDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load classification summary
      const summaryRes = await api.get('/api/data-objects/summary/classification');
      setSummary(summaryRes.data.data);

      // Load high-value data objects
      const highValueRes = await api.get('/api/data-objects/high-value');
      setHighValueData(highValueRes.data.data);
    } catch (err) {
      console.error('Failed to load data dashboard:', err);
      setError('Failed to load data dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getDataTypeColor = (type) => {
    const colors = {
      'PHI': '#EF4545',
      'PII': '#F5A623',
      'PCI': '#7C3AED',
      'Financial': '#0EA5E9',
      'Legal': '#6366F1',
      'Confidential': '#6B7280'
    };
    return colors[type] || '#6B7280';
  };

  const getSensitivityColor = (sensitivity) => {
    const colors = {
      'Critical': '#EF4545',
      'High': '#F5A623',
      'Medium': '#FFC107',
      'Low': '#0FBB80'
    };
    return colors[sensitivity] || '#6B7280';
  };

  if (loading) {
    return (
      <DashboardShell title="Data Classification Dashboard">
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <StatusIcon status="loading" />
          <p style={{ marginTop: '16px', color: '#6B7280' }}>Loading data dashboard...</p>
        </div>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell title="Data Classification Dashboard">
        <div style={{ padding: '32px', textAlign: 'center', color: '#EF4545' }}>
          {error}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Data Classification Dashboard">
      <div style={{ padding: '24px' }}>
        {/* Summary Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {/* Total Data Objects */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' }}>
              Total Data Objects
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1F2937' }}>
              {summary?.total || 0}
            </div>
          </div>

          {/* High-Value Data Objects */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' }}>
              High-Value Data (PHI/PII/PCI Critical/High)
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#EF4545' }}>
              {summary?.highValueCount || 0}
            </div>
          </div>

          {/* Total Records */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' }}>
              Total Records
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1F2937' }}>
              {(summary?.totalRecords || 0).toLocaleString()}
            </div>
          </div>

          {/* Control Coverage */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' }}>
              Control Coverage
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: summary?.controlCoverage >= 80 ? '#0FBB80' : '#F5A623' }}>
              {summary?.controlCoverage || 0}%
            </div>
          </div>
        </div>

        {/* Data Type Distribution */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Data Type Distribution</h3>
          <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
            {Object.entries(summary?.byType || {}).map(([type, count]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid #E5E7EB' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getDataTypeColor(type), marginRight: '12px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', color: '#1F2937' }}>{type}</div>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1F2937' }}>{count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sensitivity Distribution */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Sensitivity Distribution</h3>
          <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
            {Object.entries(summary?.bySensitivity || {}).map(([sensitivity, count]) => (
              <div key={sensitivity} style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid #E5E7EB' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getSensitivityColor(sensitivity), marginRight: '12px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', color: '#1F2937' }}>{sensitivity}</div>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1F2937' }}>{count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* High-Value Data Objects */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>High-Value Data Objects</h3>
          {highValueData.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #E5E7EB', padding: '32px', textAlign: 'center', color: '#6B7280' }}>
              No high-value data objects found
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
              {highValueData.map(dataObject => (
                <div key={dataObject.id} style={{ padding: '16px', borderBottom: '1px solid #E5E7EB', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <Badge
                      text={dataObject.type}
                      backgroundColor={getDataTypeColor(dataObject.type)}
                      style={{ marginRight: '8px' }}
                    />
                    <Badge
                      text={dataObject.sensitivity}
                      backgroundColor={getSensitivityColor(dataObject.sensitivity)}
                      style={{ marginRight: '8px' }}
                    />
                  </div>
                  <div style={{ fontWeight: '600', color: '#1F2937', marginBottom: '4px' }}>{dataObject.name}</div>
                  <div style={{ fontSize: '14px', color: '#6B7280' }}>
                    {(dataObject.recordCount || 0).toLocaleString()} records
                    {dataObject.description && ` • ${dataObject.description}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
};

export default DataDashboard;
