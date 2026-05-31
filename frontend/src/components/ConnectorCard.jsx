/**
 * ConnectorCard Component
 *
 * Displays a single connector service with status, actions, and metadata.
 * Shows connection status, last sync time, signal count, and action buttons.
 * Integrates with ConnectorCredentialModal for credential configuration.
 */

import React, { useState } from 'react';
import ConnectorCredentialModal from './ConnectorCredentialModal';

const ConnectorCard = ({ connector, connection, onConnect, onTest, onSync, api_url, authToken, orgId }) => {
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const status = connection?.status || 'not_connected';
  const lastSync = connection?.lastSync;
  const signalCount = connection?.signalCount || 0;
  const riskContribution = connection?.riskContribution || null;

  // Status colors following healthcare BCBS professional palette
  const statusColors = {
    connected: '#0FBB80',
    error: '#EF4545',
    syncing: '#F5A623',
    manual_entry_required: '#F5A623',
    not_connected: '#888888'
  };

  const statusLabels = {
    connected: 'Connected',
    error: 'Error',
    syncing: 'Syncing...',
    manual_entry_required: 'Manual Entry Required',
    not_connected: 'Not Connected'
  };

  const statusColor = statusColors[status] || statusColors.not_connected;
  const statusLabel = statusLabels[status] || 'Unknown';

  // Format last sync date
  const formatLastSync = (date) => {
    if (!date) return 'Never';
    const syncDate = new Date(date);
    const now = new Date();
    const daysAgo = Math.floor((now - syncDate) / (1000 * 60 * 60 * 24));
    if (daysAgo === 0) return 'Today';
    if (daysAgo === 1) return 'Yesterday';
    if (daysAgo < 7) return `${daysAgo} days ago`;
    return syncDate.toLocaleDateString();
  };

  // Risk contribution color
  const getRiskColor = (contribution) => {
    if (!contribution) return '#888';
    if (contribution > 0.5) return '#EF4545'; // High contribution
    if (contribution > 0.3) return '#F5A623'; // Medium contribution
    return '#0FBB80'; // Low contribution
  };

  return (
    <div
      style={{
        border: status === 'not_connected' ? '1px solid #E5E7EB' : '1.5px solid #D1D5DB',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#FFFFFF',
        transition: 'border-color 0.2s ease',
        ...(status === 'connected' && { borderLeftColor: statusColor, borderLeftWidth: '4px' })
      }}
    >
      {/* Header with icon, name, status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>
          {connector.icon || '🔌'}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#111827', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {connector.name}
          </div>
          <div style={{ color: '#6B7280', fontSize: 9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {connector.purpose}
          </div>
        </div>

        {/* Status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: statusColor,
            ...(status === 'syncing' && {
              animation: 'pulse 1.5s infinite'
            })
          }} />
          <span style={{ color: statusColor, fontSize: 8, fontWeight: 600 }}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Details for connected connectors */}
      {status !== 'not_connected' && (
        <div style={{ fontSize: 9, color: '#6B7280', marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Last sync:</span>
            <span style={{ fontWeight: 500, color: '#374151' }}>
              {formatLastSync(lastSync)}
            </span>
          </div>
          {signalCount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Signals:</span>
              <span style={{ fontWeight: 500, color: '#374151' }}>
                {signalCount}
              </span>
            </div>
          )}
          {riskContribution !== null && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Risk contribution:</span>
              <span style={{ fontWeight: 600, color: getRiskColor(riskContribution) }}>
                {Math.round(riskContribution * 100)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 6 }}>
        {status === 'not_connected' ? (
          <button
            onClick={() => setShowCredentialModal(true)}
            style={{
              flex: 1,
              backgroundColor: '#2563EB',
              border: 'none',
              color: '#FFFFFF',
              borderRadius: 5,
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: 9,
              fontWeight: 600,
              transition: 'background-color 0.2s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#1D4ED8'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#2563EB'}
          >
            Connect
          </button>
        ) : (
          <>
            <button
              onClick={onSync}
              disabled={status === 'syncing'}
              style={{
                flex: 1,
                backgroundColor: status === 'syncing' ? '#F5A623' : '#3B9EFF',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: 5,
                padding: '4px 8px',
                cursor: status === 'syncing' ? 'not-allowed' : 'pointer',
                fontSize: 9,
                fontWeight: 600,
                opacity: status === 'syncing' ? 0.7 : 1
              }}
            >
              {status === 'syncing' ? 'Syncing...' : 'Sync Now'}
            </button>
            <button
              onClick={onTest}
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                border: '1px solid #D1D5DB',
                color: '#6B7280',
                borderRadius: 5,
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: 9,
                transition: 'border-color 0.2s ease, color 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.borderColor = '#9CA3AF';
                e.target.style.color = '#374151';
              }}
              onMouseOut={(e) => {
                e.target.style.borderColor = '#D1D5DB';
                e.target.style.color = '#6B7280';
              }}
            >
              Test
            </button>
          </>
        )}
      </div>

      {/* Manual entry badge when applicable */}
      {status === 'manual_entry_required' && (
        <div style={{
          marginTop: 8,
          padding: '4px 8px',
          backgroundColor: '#FEF3C7',
          borderRadius: 4,
          fontSize: 8,
          color: '#92400E',
          textAlign: 'center',
          fontWeight: 500
        }}>
          ⚠️ Manual entry required - web scraping blocked
        </div>
      )}

      {/* Credential configuration modal */}
      <ConnectorCredentialModal
        isOpen={showCredentialModal}
        onClose={() => setShowCredentialModal(false)}
        connector={connector}
        api_url={api_url}
        authToken={authToken}
        orgId={orgId}
        onSuccess={(connectorId, syncFrequency) => {
          // Trigger parent callback to refresh connection status
          if (onConnect) {
            onConnect(connectorId, syncFrequency);
          }
        }}
      />
    </div>
  );
};

export default ConnectorCard;
