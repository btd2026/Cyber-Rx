/**
 * ProcessSystemMapping Component
 *
 * Drag-drop interface for mapping systems to business processes.
 * Shows available systems and currently mapped systems.
 *
 * @param {Object} props
 * @param {Array} props.availableSystems - All available systems
 * @param {Array} props.mappedSystems - Currently mapped system IDs
 * @param {Function} props.onMappingChange - Callback when mapping changes
 * @param {boolean} props.loading - Loading state
 */

import React, { useState, useMemo } from 'react';
import Button from '../atoms/Button';
import Badge from '../atoms/Badge';

const ProcessSystemMapping = ({
  availableSystems = [],
  mappedSystems = [],
  onMappingChange,
  loading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSystemIds, setSelectedSystemIds] = useState(mappedSystems);

  // Filter systems by search query
  const filteredSystems = useMemo(() => {
    if (!searchQuery) return availableSystems;
    const query = searchQuery.toLowerCase();
    return availableSystems.filter(system =>
      system.name?.toLowerCase().includes(query) ||
      system.type?.toLowerCase().includes(query) ||
      system.description?.toLowerCase().includes(query)
    );
  }, [availableSystems, searchQuery]);

  // Separate mapped and unmapped systems
  const mapped = useMemo(() => {
    return filteredSystems.filter(system => selectedSystemIds.includes(system.id));
  }, [filteredSystems, selectedSystemIds]);

  const unmapped = useMemo(() => {
    return filteredSystems.filter(system => !selectedSystemIds.includes(system.id));
  }, [filteredSystems, selectedSystemIds]);

  const handleToggleSystem = (systemId) => {
    setSelectedSystemIds(prev => {
      const newSelection = prev.includes(systemId)
        ? prev.filter(id => id !== systemId)
        : [...prev, systemId];

      // Notify parent of change
      if (onMappingChange) {
        onMappingChange(newSelection);
      }

      return newSelection;
    });
  };

  const handleSelectAll = () => {
    const allIds = filteredSystems.map(s => s.id);
    setSelectedSystemIds(allIds);
    if (onMappingChange) {
      onMappingChange(allIds);
    }
  };

  const handleClearAll = () => {
    setSelectedSystemIds([]);
    if (onMappingChange) {
      onMappingChange([]);
    }
  };

  const getSystemTypeColor = (type) => {
    const colors = {
      'Application': '#3B82F6',
      'Database': '#8B5CF6',
      'Infrastructure': '#10B981',
      'Cloud': '#F59E0B',
      'Network': '#EF4444',
      'Security': '#EC4899'
    };
    return colors[type] || '#6B7280';
  };

  const getCriticalityColor = (criticality) => {
    switch (criticality) {
      case 'Critical': return '#EF4545';
      case 'High': return '#F5A623';
      case 'Medium': return '#FFC107';
      case 'Low': return '#0FBB80';
      default: return '#6B7280';
    }
  };

  const SystemCard = ({ system, isMapped }) => (
    <div
      key={system.id}
      onClick={() => !loading && handleToggleSystem(system.id)}
      style={{
        padding: 12,
        backgroundColor: isMapped ? '#EFF6FF' : '#FFFFFF',
        border: `2px solid ${isMapped ? '#3B82F6' : '#E5E7EB'}`,
        borderRadius: 8,
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s ease',
        opacity: loading ? 0.6 : 1
      }}
      onMouseOver={(e) => {
        if (!loading) {
          e.currentTarget.style.borderColor = isMapped ? '#2563EB' : '#D1D5DB';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
        }
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = isMapped ? '#3B82F6' : '#E5E7EB';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
            {system.name}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {system.type && (
              <Badge
                variant="info"
                label={system.type}
                style={{
                  backgroundColor: `${getSystemTypeColor(system.type)}15`,
                  color: getSystemTypeColor(system.type),
                  fontSize: 10,
                  padding: '2px 8px'
                }}
              />
            )}
            {system.criticality && (
              <Badge
                variant={system.criticality === 'Critical' ? 'danger' : 'warning'}
                label={system.criticality}
                style={{
                  backgroundColor: `${getCriticalityColor(system.criticality)}15`,
                  color: getCriticalityColor(system.criticality),
                  fontSize: 10,
                  padding: '2px 8px'
                }}
              />
            )}
          </div>
        </div>

        {/* Checkbox */}
        <div
          style={{
            width: 20,
            height: 20,
            border: `2px solid ${isMapped ? '#3B82F6' : '#D1D5DB'}`,
            borderRadius: 4,
            backgroundColor: isMapped ? '#3B82F6' : '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginLeft: 8
          }}
        >
          {isMapped && (
            <svg width={12} height={12} viewBox="0 0 12 12" fill="none">
              <path
                d="M2 6L4.5 8.5L10 3"
                stroke="white"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Description */}
      {system.description && (
        <div
          style={{
            fontSize: 12,
            color: '#6B7280',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {system.description}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: '#6B7280' }}>
        {system.ipAddress && (
          <div>IP: {system.ipAddress}</div>
        )}
        {system.location && (
          <div>Location: {system.location}</div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: 8, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #E5E7EB',
        backgroundColor: '#F9FAFB'
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
          Map Systems to Process
        </div>
        <div style={{ fontSize: 13, color: '#6B7280' }}>
          Select systems that support this business process
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex',
          gap: 16,
          marginTop: 12,
          fontSize: 13
        }}>
          <div style={{ color: '#6B7280' }}>
            Total Systems: <strong style={{ color: '#111827' }}>{availableSystems.length}</strong>
          </div>
          <div style={{ color: '#6B7280' }}>
            Mapped: <strong style={{ color: '#3B82F6' }}>{selectedSystemIds.length}</strong>
          </div>
          <div style={{ color: '#6B7280' }}>
            Unmapped: <strong style={{ color: '#6B7280' }}>{availableSystems.length - selectedSystemIds.length}</strong>
          </div>
        </div>
      </div>

      {/* Search and Actions */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search systems by name, type, or description..."
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: 6,
              fontSize: 13,
              color: '#111827'
            }}
          />
        </div>

        {/* Actions */}
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSelectAll}
          disabled={loading || filteredSystems.length === 0}
        >
          Select All
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleClearAll}
          disabled={loading || selectedSystemIds.length === 0}
        >
          Clear All
        </Button>
      </div>

      {/* Systems List */}
      <div style={{ padding: 16, backgroundColor: '#F9FAFB' }}>
        {/* Mapped Systems */}
        {mapped.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#3B82F6',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Mapped Systems ({mapped.length})
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 12
              }}
            >
              {mapped.map(system => (
                <SystemCard key={system.id} system={system} isMapped={true} />
              ))}
            </div>
          </div>
        )}

        {/* Unmapped Systems */}
        {unmapped.length > 0 && (
          <div>
            <div style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#6B7280',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Available Systems ({unmapped.length})
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 12
              }}
            >
              {unmapped.map(system => (
                <SystemCard key={system.id} system={system} isMapped={false} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredSystems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#6B7280' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              No systems found
            </div>
            <div style={{ fontSize: 13 }}>
              {searchQuery ? 'Try a different search term' : 'No systems available'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessSystemMapping;
