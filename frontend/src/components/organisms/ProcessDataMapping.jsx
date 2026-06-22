/**
 * ProcessDataMapping Component
 *
 * Tree view interface for mapping data objects to business processes.
 * Groups data objects by type (PHI, PII, PCI, etc.) and shows sensitivity levels.
 *
 * @param {Object} props
 * @param {Array} props.availableDataObjects - All available data objects
 * @param {Array} props.mappedDataObjects - Currently mapped data object IDs
 * @param {Function} props.onMappingChange - Callback when mapping changes
 * @param {boolean} props.loading - Loading state
 */

import React, { useState, useMemo } from 'react';
import Button from '../atoms/Button';
import Badge from '../atoms/Badge';

const ProcessDataMapping = ({
  availableDataObjects = [],
  mappedDataObjects = [],
  onMappingChange,
  loading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDataObjectIds, setSelectedDataObjectIds] = useState(mappedDataObjects);
  const [expandedTypes, setExpandedTypes] = useState(['PHI', 'PII']);

  // Filter data objects by search query
  const filteredDataObjects = useMemo(() => {
    if (!searchQuery) return availableDataObjects;
    const query = searchQuery.toLowerCase();
    return availableDataObjects.filter(obj =>
      obj.name?.toLowerCase().includes(query) ||
      obj.type?.toLowerCase().includes(query) ||
      obj.description?.toLowerCase().includes(query)
    );
  }, [availableDataObjects, searchQuery]);

  // Group data objects by type
  const groupedDataObjects = useMemo(() => {
    const groups = {};
    filteredDataObjects.forEach(obj => {
      const type = obj.type || 'Other';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(obj);
    });
    return groups;
  }, [filteredDataObjects]);

  // Get data object types in priority order
  const dataTypes = useMemo(() => {
    const priorityOrder = ['PHI', 'PII', 'PCI', 'Financial', 'Legal', 'Confidential', 'Other'];
    return Object.keys(groupedDataObjects).sort((a, b) => {
      const indexA = priorityOrder.indexOf(a);
      const indexB = priorityOrder.indexOf(b);
      const orderA = indexA === -1 ? priorityOrder.length : indexA;
      const orderB = indexB === -1 ? priorityOrder.length : indexB;
      return orderA - orderB;
    });
  }, [groupedDataObjects]);

  const handleToggleDataObject = (dataObjectId) => {
    setSelectedDataObjectIds(prev => {
      const newSelection = prev.includes(dataObjectId)
        ? prev.filter(id => id !== dataObjectId)
        : [...prev, dataObjectId];

      // Notify parent of change
      if (onMappingChange) {
        onMappingChange(newSelection);
      }

      return newSelection;
    });
  };

  const handleToggleType = (type) => {
    setExpandedTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const handleSelectAllType = (type) => {
    const typeObjects = groupedDataObjects[type];
    const typeIds = typeObjects.map(obj => obj.id);
    const newSelection = [...new Set([...selectedDataObjectIds, ...typeIds])];
    setSelectedDataObjectIds(newSelection);
    if (onMappingChange) {
      onMappingChange(newSelection);
    }
  };

  const handleClearAllType = (type) => {
    const typeObjects = groupedDataObjects[type];
    const typeIds = typeObjects.map(obj => obj.id);
    const newSelection = selectedDataObjectIds.filter(id => !typeIds.includes(id));
    setSelectedDataObjectIds(newSelection);
    if (onMappingChange) {
      onMappingChange(newSelection);
    }
  };

  const getDataTypeColor = (type) => {
    const colors = {
      'PHI': '#EF4444',
      'PII': '#F59E0B',
      'PCI': '#8B5CF6',
      'Financial': '#10B981',
      'Legal': '#3B82F6',
      'Confidential': '#EC4899',
      'Other': '#6B7280'
    };
    return colors[type] || '#6B7280';
  };

  const getSensitivityColor = (sensitivity) => {
    switch (sensitivity) {
      case 'Critical': return '#EF4545';
      case 'High': return '#F5A623';
      case 'Medium': return '#FFC107';
      case 'Low': return '#0FBB80';
      default: return '#6B7280';
    }
  };

  const getTypeStats = (type) => {
    const objects = groupedDataObjects[type] || [];
    const mappedCount = objects.filter(obj => selectedDataObjectIds.includes(obj.id)).length;
    return { total: objects.length, mapped: mappedCount };
  };

  const DataObjectCard = ({ dataObject, isMapped }) => (
    <div
      key={dataObject.id}
      onClick={() => !loading && handleToggleDataObject(dataObject.id)}
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
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
            {dataObject.name}
          </div>

          {/* Badges */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            {dataObject.sensitivity && (
              <Badge
                variant={dataObject.sensitivity === 'Critical' ? 'danger' : 'warning'}
                label={dataObject.sensitivity}
                style={{
                  backgroundColor: `${getSensitivityColor(dataObject.sensitivity)}15`,
                  color: getSensitivityColor(dataObject.sensitivity),
                  fontSize: 9,
                  padding: '2px 6px'
                }}
              />
            )}
            {dataObject.recordCount && (
              <Badge
                variant="info"
                label={`${dataObject.recordCount.toLocaleString()} records`}
                style={{
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  fontSize: 9,
                  padding: '2px 6px'
                }}
              />
            )}
          </div>

          {/* Description */}
          {dataObject.description && (
            <div
              style={{
                fontSize: 11,
                color: '#6B7280',
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {dataObject.description}
            </div>
          )}

          {/* Retention */}
          {dataObject.retentionPeriod && (
            <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>
              Retention: {dataObject.retentionPeriod}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const TypeGroup = ({ type }) => {
    const objects = groupedDataObjects[type];
    const stats = getTypeStats(type);
    const isExpanded = expandedTypes.includes(type);
    const color = getDataTypeColor(type);

    return (
      <div style={{ marginBottom: 16 }}>
        {/* Type Header */}
        <div
          onClick={() => handleToggleType(type)}
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
              label={type}
              style={{
                backgroundColor: `${color}15`,
                color: color,
                fontSize: 11,
                padding: '4px 10px',
                fontWeight: 700
              }}
            />
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
              {type} Data Objects
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
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isExpanded && (
              <>
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectAllType(type);
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
                    handleClearAllType(type);
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

        {/* Data Objects */}
        {isExpanded && (
          <div
            style={{
              marginTop: 8,
              marginLeft: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 8
            }}
          >
            {objects.map(obj => (
              <DataObjectCard
                key={obj.id}
                dataObject={obj}
                isMapped={selectedDataObjectIds.includes(obj.id)}
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
          Map Data Objects to Process
        </div>
        <div style={{ fontSize: 13, color: '#6B7280' }}>
          Select data objects that this business process creates or manages
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex',
          gap: 16,
          marginTop: 12,
          fontSize: 13
        }}>
          <div style={{ color: '#6B7280' }}>
            Total Objects: <strong style={{ color: '#111827' }}>{availableDataObjects.length}</strong>
          </div>
          <div style={{ color: '#6B7280' }}>
            Mapped: <strong style={{ color: '#3B82F6' }}>{selectedDataObjectIds.length}</strong>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '16px', borderBottom: '1px solid #E5E7EB' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search data objects by name, type, or description..."
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

      {/* Data Objects */}
      <div style={{ padding: 16, backgroundColor: '#F9FAFB' }}>
        {dataTypes.length > 0 ? (
          dataTypes.map(type => <TypeGroup key={type} type={type} />)
        ) : (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#6B7280' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              No data objects found
            </div>
            <div style={{ fontSize: 13 }}>
              {searchQuery ? 'Try a different search term' : 'No data objects available'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessDataMapping;
