/**
 * VendorCard Component
 *
 * Mobile-optimized card view for vendor information.
 * Displays vendor details in a touch-friendly card layout.
 *
 * @param {Object} props.vendor - Vendor object
 * @param {function} props.onSync - Sync callback
 * @param {function} props.onClick - Card click callback
 * @param {boolean} props.syncing - Sync status
 */

import React from 'react';
import StatusIcon from './atoms/StatusIcon';

const VendorCard = ({ vendor, onSync, onClick, syncing = false }) => {
  // Get risk color
  const getRiskColor = (score) => {
    if (score >= 80) return { color: '#10B981', label: 'Low' };
    if (score >= 60) return { color: '#F59E0B', label: 'Medium' };
    if (score >= 40) return { color: '#EF4444', label: 'High' };
    return { color: '#DC2626', label: 'Critical' };
  };

  // Get tier color
  const getTierColor = (tier) => {
    const colors = {
      critical: '#DC2626',
      high: '#EF4444',
      medium: '#F59E0B',
      low: '#10B981'
    };
    return colors[tier?.toLowerCase()] || '#5c6066';
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const riskInfo = getRiskColor(vendor.riskScore);

  return (
    <div
      onClick={() => onClick?.(vendor)}
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        border: '1px solid #ebecf0',
        padding: 16,
        marginBottom: 12,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        minHeight: 180,
        display: 'flex',
        flexDirection: 'column'
      }}
      onTouchStart={(e) => {
        e.currentTarget.style.transform = 'scale(0.98)';
        e.currentTarget.style.backgroundColor = '#F9FAFB';
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.backgroundColor = '#FFFFFF';
      }}
    >
      {/* Card Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#0b0c0e',
            margin: '0 0 4px 0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {vendor.name}
          </h3>
          {vendor.description && (
            <p style={{
              fontSize: 12,
              color: '#5c6066',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {vendor.description}
            </p>
          )}
        </div>

        <span style={{
          display: 'inline-block',
          padding: '4px 8px',
          backgroundColor: `${getTierColor(vendor.tier)}20`,
          color: getTierColor(vendor.tier),
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'capitalize',
          marginLeft: 8,
          flexShrink: 0
        }}>
          {vendor.tier || 'Unknown'}
        </span>
      </div>

      {/* Card Body */}
      <div style={{ flex: 1, marginBottom: 12 }}>
        {/* Risk Score */}
        <div style={{ marginBottom: 12 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 4
          }}>
            <span style={{ fontSize: 12, color: '#5c6066', fontWeight: 500 }}>
              Risk Score
            </span>
            <span style={{
              fontSize: 14,
              fontWeight: 600,
              color: riskInfo.color
            }}>
              {vendor.riskScore}/100
            </span>
          </div>
          <div style={{
            height: 8,
            backgroundColor: '#F3F4F6',
            borderRadius: 4,
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${vendor.riskScore}%`,
              backgroundColor: riskInfo.color,
              borderRadius: 4,
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{
            fontSize: 11,
            color: riskInfo.color,
            fontWeight: 500,
            marginTop: 2
          }}>
            {riskInfo.label} Risk
          </div>
        </div>

        {/* Status and Last Sync */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <StatusIcon status={vendor.status} size={12} />
            <span style={{
              color: '#5c6066',
              fontWeight: 500,
              textTransform: 'capitalize'
            }}>
              {vendor.status}
            </span>
          </div>
          <span style={{ color: '#5c6066' }}>
            {formatTimestamp(vendor.lastSync)}
          </span>
        </div>

        {/* Grade */}
        {vendor.grade && (
          <div style={{
            marginTop: 8,
            display: 'inline-block',
            padding: '4px 8px',
            backgroundColor: '#F3F4F6',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
            color: '#5c6066'
          }}>
            Grade: {vendor.grade}
          </div>
        )}
      </div>

      {/* Card Footer - Sync Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSync?.(vendor);
        }}
        disabled={syncing}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: syncing ? '#F3F4F6' : '#5e6ad2',
          color: syncing ? '#8b9098' : '#FFFFFF',
          border: 'none',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: syncing ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8
        }}
      >
        {syncing ? (
          <>
            <div style={{
              width: 16,
              height: 16,
              border: '2px solid #8b9098',
              borderTopColor: '#5e6ad2',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            Syncing...
          </>
        ) : (
          <>
            <span>Sync Now</span>
            <span>↻</span>
          </>
        )}
      </button>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default VendorCard;
