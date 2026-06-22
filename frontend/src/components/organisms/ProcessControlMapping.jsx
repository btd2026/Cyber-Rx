/**
 * ProcessControlMapping Component
 *
 * Checklist interface for mapping controls to business processes.
 * Groups controls by framework and shows control status.
 *
 * @param {Object} props
 * @param {Array} props.availableControls - All available controls
 * @param {Array} props.mappedControls - Currently mapped control IDs
 * @param {Function} props.onMappingChange - Callback when mapping changes
 * @param {boolean} props.loading - Loading state
 */

import React, { useState, useMemo } from 'react';
import Button from '../atoms/Button';
import Badge from '../atoms/Badge';

const ProcessControlMapping = ({
  availableControls = [],
  mappedControls = [],
  onMappingChange,
  loading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedControlIds, setSelectedControlIds] = useState(mappedControls);
  const [expandedFrameworks, setExpandedFrameworks] = useState(['NIST', 'HIPAA']);

  // Filter controls by search query
  const filteredControls = useMemo(() => {
    if (!searchQuery) return availableControls;
    const query = searchQuery.toLowerCase();
    return availableControls.filter(control =>
      control.name?.toLowerCase().includes(query) ||
      control.controlId?.toLowerCase().includes(query) ||
      control.framework?.toLowerCase().includes(query) ||
      control.description?.toLowerCase().includes(query)
    );
  }, [availableControls, searchQuery]);

  // Group controls by framework
  const groupedControls = useMemo(() => {
    const groups = {};
    filteredControls.forEach(control => {
      const framework = control.framework || 'Other';
      if (!groups[framework]) {
        groups[framework] = [];
      }
      groups[framework].push(control);
    });
    return groups;
  }, [filteredControls]);

  // Get frameworks in priority order
  const frameworks = useMemo(() => {
    const priorityOrder = ['NIST', 'HIPAA', 'ISO 27001', 'SOC 2', 'PCI DSS', 'GDPR', 'CCPA', 'Other'];
    return Object.keys(groupedControls).sort((a, b) => {
      const indexA = priorityOrder.indexOf(a);
      const indexB = priorityOrder.indexOf(b);
      const orderA = indexA === -1 ? priorityOrder.length : indexA;
      const orderB = indexB === -1 ? priorityOrder.length : indexB;
      return orderA - orderB;
    });
  }, [groupedControls]);

  const handleToggleControl = (controlId) => {
    setSelectedControlIds(prev => {
      const newSelection = prev.includes(controlId)
        ? prev.filter(id => id !== controlId)
        : [...prev, controlId];

      // Notify parent of change
      if (onMappingChange) {
        onMappingChange(newSelection);
      }

      return newSelection;
    });
  };

  const handleToggleFramework = (framework) => {
    setExpandedFrameworks(prev => {
      if (prev.includes(framework)) {
        return prev.filter(f => f !== framework);
      } else {
        return [...prev, framework];
      }
    });
  };

  const handleSelectAllFramework = (framework) => {
    const frameworkControls = groupedControls[framework];
    const frameworkIds = frameworkControls.map(c => c.id);
    const newSelection = [...new Set([...selectedControlIds, ...frameworkIds])];
    setSelectedControlIds(newSelection);
    if (onMappingChange) {
      onMappingChange(newSelection);
    }
  };

  const handleClearAllFramework = (framework) => {
    const frameworkControls = groupedControls[framework];
    const frameworkIds = frameworkControls.map(c => c.id);
    const newSelection = selectedControlIds.filter(id => !frameworkIds.includes(id));
    setSelectedControlIds(newSelection);
    if (onMappingChange) {
      onMappingChange(newSelection);
    }
  };

  const getFrameworkColor = (framework) => {
    const colors = {
      'NIST': '#3B82F6',
      'HIPAA': '#EF4444',
      'ISO 27001': '#10B981',
      'SOC 2': '#F59E0B',
      'PCI DSS': '#243044',
      'GDPR': '#EC4899',
      'CCPA': '#06B6D4',
      'Other': '#6B7280'
    };
    return colors[framework] || '#6B7280';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'implemented': return '#10B981';
      case 'partial': return '#F59E0B';
      case 'gap': return '#EF4444';
      case 'not_applicable': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'implemented': return 'Implemented';
      case 'partial': return 'Partial';
      case 'gap': return 'Gap';
      case 'not_applicable': return 'N/A';
      default: return 'Unknown';
    }
  };

  const getFrameworkStats = (framework) => {
    const controls = groupedControls[framework] || [];
    const mappedCount = controls.filter(c => selectedControlIds.includes(c.id)).length;
    const implementedCount = controls.filter(c =>
      selectedControlIds.includes(c.id) && c.status === 'implemented'
    ).length;
    return { total: controls.length, mapped: mappedCount, implemented: implementedCount };
  };

  const ControlCard = ({ control, isMapped }) => (
    <div
      key={control.id}
      onClick={() => !loading && handleToggleControl(control.id)}
      style={{
        padding: 10,
        backgroundColor: isMapped ? '#EFF6FF' : '#FFFFFF',
        border: `1px solid ${isMapped ? '#3B82F6' : '#E5E7EB'}`,
        borderRadius: 6,
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s ease',
        opacity: loading ? 0.6 : 1
      }}
      onMouseOver={(e) => {
        if (!loading) {
          e.currentTarget.style.borderColor = isMapped ? '#2563EB' : '#D1D5DB';
        }
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = isMapped ? '#3B82F6' : '#E5E7EB';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        {/* Checkbox */}
        <div
          style={{
            width: 16,
            height: 16,
            border: `2px solid ${isMapped ? '#3B82F6' : '#D1D5DB'}`,
            borderRadius: 3,
            backgroundColor: isMapped ? '#3B82F6' : '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: 2
          }}
        >
          {isMapped && (
            <svg width={10} height={10} viewBox="0 0 10 10" fill="none">
              <path
                d="M2 5L3.5 6.5L8 2"
                stroke="white"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
              {control.controlId} - {control.name}
            </div>

            {/* Status Badge */}
            {control.status && (
              <Badge
                variant={control.status === 'implemented' ? 'success' : control.status === 'gap' ? 'danger' : 'warning'}
                label={getStatusLabel(control.status)}
                style={{
                  backgroundColor: `${getStatusColor(control.status)}15`,
                  color: getStatusColor(control.status),
                  fontSize: 9,
                  padding: '2px 6px',
                  flexShrink: 0
                }}
              />
            )}
          </div>

          {/* Description */}
          {control.description && (
            <div
              style={{
                fontSize: 11,
                color: '#6B7280',
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {control.description}
            </div>
          )}

          {/* Category */}
          {control.category && (
            <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>
              {control.category}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const FrameworkGroup = ({ framework }) => {
    const controls = groupedControls[framework];
    const stats = getFrameworkStats(framework);
    const isExpanded = expandedFrameworks.includes(framework);
    const color = getFrameworkColor(framework);

    return (
      <div style={{ marginBottom: 16 }}>
        {/* Framework Header */}
        <div
          onClick={() => handleToggleFramework(framework)}
          style={{
            padding: '12px 16px',
            backgroundColor: `${color}08`,
            border: `1px solid ${color}30`,
            borderRadius: 6,
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            transition: 'background-color 0.15s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = `${color}15`;
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = `${color}08`;
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Badge
              variant="info"
              label={framework}
              style={{
                backgroundColor: `${color}15`,
                color: color,
                fontSize: 11,
                padding: '4px 10px',
                fontWeight: 700
              }}
            />
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
              {framework} Controls
            </div>
            <Badge
              variant="info"
              label={`${stats.mapped}/${stats.total} mapped`}
              style={{
                backgroundColor: stats.mapped === stats.total ? '#ECFDF5' : '#F3F4F6',
                color: stats.mapped === stats.total ? '#059669' : '#6B7280',
                fontSize: 11,
                padding: '2px 8px'
              }}
            />
            {stats.implemented > 0 && (
              <Badge
                variant="success"
                label={`${stats.implemented} implemented`}
                style={{
                  backgroundColor: '#D1FAE5',
                  color: '#059669',
                  fontSize: 11,
                  padding: '2px 8px'
                }}
              />
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isExpanded && (
              <>
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectAllFramework(framework);
                  }}
                  disabled={loading || stats.mapped === stats.total}
                >
                  Select All
                </Button>
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearAllFramework(framework);
                  }}
                  disabled={loading || stats.mapped === 0}
                >
                  Clear
                </Button>
              </>
            )}
            <svg
              width={20}
              height={20}
              viewBox="0 0 20 20"
              fill="none"
              style={{
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
                color: '#6B7280'
              }}
            >
              <path
                d="M5 7.5L10 12.5L15 7.5"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Controls */}
        {isExpanded && (
          <div
            style={{
              marginTop: 8,
              marginLeft: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 8
            }}
          >
            {controls.map(control => (
              <ControlCard
                key={control.id}
                control={control}
                isMapped={selectedControlIds.includes(control.id)}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: 8, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #E5E7EB',
        backgroundColor: '#F9FAFB'
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
          Map Controls to Process
        </div>
        <div style={{ fontSize: 13, color: '#6B7280' }}>
          Select controls that govern this business process
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex',
          gap: 16,
          marginTop: 12,
          fontSize: 13
        }}>
          <div style={{ color: '#6B7280' }}>
            Total Controls: <strong style={{ color: '#111827' }}>{availableControls.length}</strong>
          </div>
          <div style={{ color: '#6B7280' }}>
            Mapped: <strong style={{ color: '#3B82F6' }}>{selectedControlIds.length}</strong>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '16px', borderBottom: '1px solid #E5E7EB' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search controls by ID, name, framework, or description..."
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #D1D5DB',
            borderRadius: 6,
            fontSize: 13,
            color: '#111827'
          }}
        />
      </div>

      {/* Controls */}
      <div style={{ padding: 16, backgroundColor: '#F9FAFB' }}>
        {frameworks.length > 0 ? (
          frameworks.map(framework => <FrameworkGroup key={framework} framework={framework} />)
        ) : (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#6B7280' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              No controls found
            </div>
            <div style={{ fontSize: 13 }}>
              {searchQuery ? 'Try a different search term' : 'No controls available'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessControlMapping;
