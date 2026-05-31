/**
 * FrameworkSelector Component
 *
 * Multi-framework selector with grouping and filtering.
 * Supports HIPAA, NIST, ISO, SOC 2, CIS, PCI DSS, etc.
 *
 * @param {Array} props.frameworks - Framework data array
 * @param {Array} props.selected - Selected framework IDs
 * @param {function} props.onChange - Selection change callback
 * @param {string} props.groupBy - Group by: 'category' | 'domain' | 'none'
 * @param {boolean} props.showScores - Show compliance scores
 */

import React, { useState } from 'react';
import Tag from '../atoms/Tag';
import Badge from '../atoms/Badge';

const FrameworkSelector = ({
  frameworks = [],
  selected = [],
  onChange,
  groupBy = 'category',
  showScores = true
}) => {
  const [filter, setFilter] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});

  // Group frameworks
  const groupedFrameworks = React.useMemo(() => {
    if (groupBy === 'none') {
      return { All: frameworks };
    }

    return frameworks.reduce((groups, fw) => {
      const key = fw[groupBy] || 'Other';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(fw);
      return groups;
    }, {});
  }, [frameworks, groupBy]);

  // Filter frameworks
  const filteredFrameworks = React.useMemo(() => {
    if (!filter) return groupedFrameworks;

    const lowerFilter = filter.toLowerCase();

    return Object.entries(groupedFrameworks).reduce((acc, [group, items]) => {
      const filtered = items.filter(
        (fw) =>
          fw.name.toLowerCase().includes(lowerFilter) ||
          (fw.description && fw.description.toLowerCase().includes(lowerFilter))
      );

      if (filtered.length > 0) {
        acc[group] = filtered;
      }

      return acc;
    }, {});
  }, [groupedFrameworks, filter]);

  // Toggle group expansion
  const toggleGroup = (group) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  // Toggle framework selection
  const toggleFramework = (fwId) => {
    if (selected.includes(fwId)) {
      onChange(selected.filter((id) => id !== fwId));
    } else {
      onChange([...selected, fwId]);
    }
  };

  // Select/deselect all in group
  const toggleGroupAll = (groupItems) => {
    const allSelected = groupItems.every((fw) => selected.includes(fw.id));
    if (allSelected) {
      onChange(selected.filter((id) => !groupItems.some((fw) => fw.id === id)));
    } else {
      onChange([...new Set([...selected, ...groupItems.map((fw) => fw.id)])]);
    }
  };

  return (
    <div
      style={{
        border: '1px solid #E5E7EB',
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden'
      }}
    >
      {/* Header with filter */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #E5E7EB',
          backgroundColor: '#F9FAFB'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>
            Frameworks
            {selected.length > 0 && (
              <Badge variant="primary" style={{ marginLeft: 8 }}>
                {selected.length}
              </Badge>
            )}
          </div>
          {selected.length > 0 && (
            <button
              onClick={() => onChange([])}
              style={{
                background: 'none',
                border: 'none',
                color: '#6B7280',
                fontSize: 10,
                cursor: 'pointer',
                padding: 0
              }}
            >
              Clear all
            </button>
          )}
        </div>

        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search frameworks..."
          style={{
            width: '100%',
            padding: '6px 10px',
            fontSize: 11,
            border: '1px solid #D1D5DB',
            borderRadius: 5,
            backgroundColor: '#FFFFFF'
          }}
        />
      </div>

      {/* Framework groups */}
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {Object.entries(filteredFrameworks).map(([group, items]) => {
          const isExpanded = expandedGroups[group] !== false;
          const groupSelected = items.filter((fw) => selected.includes(fw.id)).length;

          return (
            <div key={group}>
              {/* Group header */}
              <div
                onClick={() => toggleGroup(group)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F9FAFB',
                  borderBottom: '1px solid #E5E7EB',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, color: '#6B7280' }}>
                    {isExpanded ? '▼' : '▶'}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>
                    {group}
                  </span>
                  {groupSelected > 0 && (
                    <Badge variant="primary">{groupSelected}</Badge>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGroupAll(items);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6B7280',
                    fontSize: 9,
                    cursor: 'pointer',
                    padding: '2px 6px'
                  }}
                >
                  {groupSelected === items.length ? 'Deselect' : 'Select'}
                </button>
              </div>

              {/* Group items */}
              {isExpanded && (
                <div style={{ padding: '8px 16px' }}>
                  {items.map((fw) => (
                    <label
                      key={fw.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 0',
                        cursor: 'pointer',
                        ':hover': { backgroundColor: '#F9FAFB' }
                      }}
                      onMouseOver={(e) => {
                        e.target.style.backgroundColor = '#F9FAFB';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(fw.id)}
                        onChange={() => toggleFramework(fw.id)}
                        style={{ margin: 0 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: '#374151'
                          }}
                        >
                          {fw.name}
                        </div>
                        {showScores && fw.score !== undefined && (
                          <div
                            style={{
                              fontSize: 9,
                              color:
                                fw.score >= 80
                                  ? '#0FBB80'
                                  : fw.score >= 60
                                  ? '#F5A623'
                                  : '#EF4545',
                              fontWeight: 600
                            }}
                          >
                            Score: {fw.score}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FrameworkSelector;
