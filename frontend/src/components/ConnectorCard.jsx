/**
 * ConnectorCard Component
 *
 * Displays a single connector service with status, actions, and metadata.
 * Shows connection status, last sync time, signal count, and action buttons.
 * Integrates with ConnectorCredentialModal for credential configuration.
 *
 * Connection States:
 * - not_connected: Default state, no credentials configured
 * - connecting: During initial connection attempt
 * - connected: Successfully connected and operational
 * - failed: Connection attempt failed
 * - syncing: Data synchronization in progress
 * - sync_failed: Sync operation failed (distinct from connection failure)
 * - manual_entry_required: API blocked, requires manual data entry
 */

import React, { useState } from 'react';
import ConnectorCredentialModal from './ConnectorCredentialModal';

const ConnectorCard = ({ connector, connection, onConnect, onTest, onSync, api_url, authToken, orgId }) => {
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const status = connection?.status || 'not_connected';
  const lastSync = connection?.lastSync;
  const signalCount = connection?.signalCount || 0;
  const riskContribution = connection?.riskContribution || null;
  const errorMessage = connection?.errorMessage;

  // Status colors following healthcare BCBS professional palette
  const statusColors = {
    connected: '#0FBB80',
    connecting: '#3B9EFF',
    failed: '#EF4545',
    syncing: '#F5A623',
    sync_failed: '#DC2626',
    manual_entry_required: '#F5A623',
    not_connected: '#888888'
  };

  const statusLabels = {
    connected: 'Connected',
    connecting: 'Connecting...',
    failed: 'Connection Failed',
    syncing: 'Syncing...',
    sync_failed: 'Sync Failed',
    manual_entry_required: 'Manual Entry Required',
    not_connected: 'Not Connected'
  };

  // Status icons for better visual communication
  const StatusIcon = ({ status }) => {
    const iconSize = 14;

    // Animated spinner for connecting/syncing states
    if (status === 'connecting' || status === 'syncing') {
      return (
        <div
          style={{
            width: iconSize,
            height: iconSize,
            border: '2px solid rgba(255,255,255,0.3)',
            borderTop: `2px solid ${statusColors[status]}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
          role="status"
          aria-label={status === 'connecting' ? 'Connecting in progress' : 'Syncing in progress'}
        />
      );
    }

    // Static icons for other states
    const icons = {
      connected: (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          role="img"
          aria-label="Connected"
        >
          <circle cx="12" cy="12" r="10" fill={statusColors.connected} />
          <path
            d="M8 12l3 3 5-5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      failed: (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          role="img"
          aria-label="Connection failed"
        >
          <circle cx="12" cy="12" r="10" fill={statusColors.failed} />
          <path
            d="M15 9l-6 6M9 9l6 6"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
      sync_failed: (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          role="img"
          aria-label="Sync failed"
        >
          <circle cx="12" cy="12" r="10" fill={statusColors.sync_failed} />
          <path
            d="M15 9l-6 6M9 9l6 6"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M12 7v5l3 3"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
      not_connected: (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          role="img"
          aria-label="Not connected"
        >
          <circle cx="12" cy="12" r="10" fill={statusColors.not_connected} />
          <path
            d="M12 8v4M12 16h.01"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
      manual_entry_required: (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          role="img"
          aria-label="Manual entry required"
        >
          <circle cx="12" cy="12" r="10" fill={statusColors.manual_entry_required} />
          <path
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    };

    return icons[status] || icons.not_connected;
  };

  const statusColor = statusColors[status] || statusColors.not_connected;
  const statusLabel = statusLabels[status] || 'Unknown';

  // Enhanced format last sync date with more granularity
  const formatLastSync = (date) => {
    if (!date) return 'Never';

    const syncDate = new Date(date);
    const now = new Date();
    const diffMs = now - syncDate;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return syncDate.toLocaleDateString();
  };

  // Get full timestamp for title attribute
  const getFullTimestamp = (date) => {
    if (!date) return 'No sync data';
    return new Date(date).toLocaleString();
  };

  // Risk contribution color
  const getRiskColor = (contribution) => {
    if (!contribution) return '#888';
    if (contribution > 0.5) return '#EF4545'; // High contribution
    if (contribution > 0.3) return '#F5A623'; // Medium contribution
    return '#0FBB80'; // Low contribution
  };

  // Determine if action buttons should be disabled
  const isActionDisabled = status === 'connecting' || status === 'syncing';

  return (
    <div
      style={{
        border: status === 'not_connected' ? '1px solid #E5E7EB' : '1.5px solid #D1D5DB',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#FFFFFF',
        transition: 'border-color 0.2s ease',
        position: 'relative',
        ...(status === 'connected' && { borderLeftColor: statusColor, borderLeftWidth: '4px' }),
        ...(status === 'failed' && { borderLeftColor: statusColor, borderLeftWidth: '4px' }),
        ...(status === 'sync_failed' && { borderLeftColor: statusColor, borderLeftWidth: '4px' })
      }}
      role="article"
      aria-label={`${connector.name} connector - ${statusLabel}`}
    >
      {/* Header with icon, name, status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18, lineHeight: 1 }} role="img" aria-label="Connector icon">
          {connector.icon || '🔌'}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: '#111827',
            fontSize: 11,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {connector.name}
          </div>
          <div style={{
            color: '#6B7280',
            fontSize: 9,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {connector.purpose}
          </div>
        </div>

        {/* Status indicator with icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 6px',
            borderRadius: 4,
            backgroundColor: `${statusColor}15`,
            border: `1px solid ${statusColor}30`
          }}
          role="status"
          aria-label={`Connection status: ${statusLabel}`}
        >
          <StatusIcon status={status} />
          <span style={{ color: statusColor, fontSize: 8, fontWeight: 600 }}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Details for connected/connecting/failed/syncing/sync_failed states */}
      {status !== 'not_connected' && status !== 'manual_entry_required' && (
        <div style={{ fontSize: 9, color: '#6B7280', marginBottom: 8 }}>
          <div
            style={{ display: 'flex', justifyContent: 'space-between' }}
            title={getFullTimestamp(lastSync)}
          >
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

      {/* Error message display */}
      {errorMessage && (status === 'failed' || status === 'sync_failed') && (
        <div style={{
          marginBottom: 8,
          padding: '4px 6px',
          backgroundColor: '#FEE2E2',
          borderRadius: 4,
          fontSize: 8,
          color: '#991B1B',
          border: '1px solid #FECACA'
        }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>
            {status === 'failed' ? 'Connection Error' : 'Sync Error'}
          </div>
          <div style={{ fontStyle: 'italic' }}>
            {errorMessage}
          </div>
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
            aria-label="Connect connector"
          >
            Connect
          </button>
        ) : status === 'connecting' ? (
          <button
            disabled
            style={{
              flex: 1,
              backgroundColor: statusColors.connecting,
              border: 'none',
              color: '#FFFFFF',
              borderRadius: 5,
              padding: '4px 8px',
              cursor: 'not-allowed',
              fontSize: 9,
              fontWeight: 600,
              opacity: 0.8
            }}
            aria-label="Connecting in progress"
          >
            Connecting...
          </button>
        ) : (
          <>
            <button
              onClick={onSync}
              disabled={isActionDisabled}
              style={{
                flex: 1,
                backgroundColor: isActionDisabled ? '#9CA3AF' : '#3B9EFF',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: 5,
                padding: '4px 8px',
                cursor: isActionDisabled ? 'not-allowed' : 'pointer',
                fontSize: 9,
                fontWeight: 600,
                opacity: isActionDisabled ? 0.7 : 1,
                transition: isActionDisabled ? 'none' : 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!isActionDisabled) e.target.style.backgroundColor = '#2563EB';
              }}
              onMouseLeave={(e) => {
                if (!isActionDisabled) e.target.style.backgroundColor = '#3B9EFF';
              }}
              aria-label={status === 'syncing' ? 'Sync in progress' : 'Sync now'}
            >
              {status === 'syncing' ? 'Syncing...' : 'Sync Now'}
            </button>
            <button
              onClick={onTest}
              disabled={isActionDisabled}
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                border: '1px solid #D1D5DB',
                color: isActionDisabled ? '#9CA3AF' : '#6B7280',
                borderRadius: 5,
                padding: '4px 8px',
                cursor: isActionDisabled ? 'not-allowed' : 'pointer',
                fontSize: 9,
                transition: 'border-color 0.2s ease, color 0.2s ease'
              }}
              onMouseOver={(e) => {
                if (!isActionDisabled) {
                  e.target.style.borderColor = '#9CA3AF';
                  e.target.style.color = '#374151';
                }
              }}
              onMouseOut={(e) => {
                e.target.style.borderColor = '#D1D5DB';
                e.target.style.color = '#6B7280';
              }}
              aria-label="Test connection"
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
          fontWeight: 500,
          border: '1px solid #FDE68A'
        }}
        role="alert"
        aria-label="Manual entry required warning"
        >
          <span style={{ marginRight: 4 }}>⚠️</span>
          Manual entry required - web scraping blocked
        </div>
      )}

      {/* Retry button for failed states */}
      {(status === 'failed' || status === 'sync_failed') && (
        <button
          onClick={onTest}
          style={{
            marginTop: 8,
            width: '100%',
            backgroundColor: 'transparent',
            border: `1px solid ${statusColor}`,
            color: statusColor,
            borderRadius: 5,
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: 8,
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = `${statusColor}15`;
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}
          aria-label={`Retry ${status === 'failed' ? 'connection' : 'sync'}`}
        >
          {status === 'failed' ? 'Retry Connection' : 'Retry Sync'}
        </button>
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

      {/* Global styles for animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ConnectorCard;
