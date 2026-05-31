/**
 * FilterPanel Component
 *
 * Sidebar filter panel with collapsible sections.
 * Used for filtering data tables, dashboards, and lists.
 *
 * @param {Array} props.filters - Filter configuration array
 * @param {Object} props.values - Current filter values
 * @param {function} props.onChange - Filter change callback
 * @param {function} props.onReset - Reset filters callback
 * @param {boolean} props.collapsed - Start collapsed
 */

import React, { useState } from 'react';

const FilterPanel = ({ filters, values, onChange, onReset, collapsed = false }) => {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  const activeCount = Object.values(values).filter(
    (v) => v !== undefined && v !== null && v !== ''
  ).length;

  return (
    <div
      style={{
        width: 280,
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: 8,
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #E5E7EB',
          backgroundColor: '#F9FAFB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <span>🔍 Filters</span>
          {activeCount > 0 && (
            <span
              style={{
                backgroundColor: '#3B9EFF',
                color: '#FFFFFF',
                fontSize: 9,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 10,
                minWidth: 18,
                textAlign: 'center'
              }}
            >
              {activeCount}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {activeCount > 0 && (
            <button
              onClick={onReset}
              style={{
                background: 'none',
                border: 'none',
                color: '#6B7280',
                fontSize: 10,
                cursor: 'pointer',
                padding: 0
              }}
            >
              Reset
            </button>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              background: 'none',
              border: 'none',
              color: '#6B7280',
              fontSize: 10,
              cursor: 'pointer',
              padding: 0
            }}
          >
            {isCollapsed ? '▶' : '▼'}
          </button>
        </div>
      </div>

      {/* Filters */}
      {!isCollapsed && (
        <div style={{ padding: 16 }}>
          {filters.map((filter) => (
            <div key={filter.id} style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: 6
                }}
              >
                {filter.label}
              </label>

              {filter.type === 'select' && (
                <select
                  value={values[filter.id] || ''}
                  onChange={(e) => onChange(filter.id, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    fontSize: 11,
                    border: '1px solid #D1D5DB',
                    borderRadius: 5,
                    backgroundColor: '#FFFFFF'
                  }}
                >
                  <option value="">All</option>
                  {filter.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}

              {filter.type === 'multiselect' && (
                <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                  {filter.options.map((opt) => (
                    <label
                      key={opt.value}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 10,
                        color: '#374151',
                        marginBottom: 4,
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={(values[filter.id] || []).includes(opt.value)}
                        onChange={(e) => {
                          const current = values[filter.id] || [];
                          const updated = e.target.checked
                            ? [...current, opt.value]
                            : current.filter((v) => v !== opt.value);
                          onChange(filter.id, updated);
                        }}
                        style={{ margin: 0 }}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              )}

              {filter.type === 'text' && (
                <input
                  type="text"
                  value={values[filter.id] || ''}
                  onChange={(e) => onChange(filter.id, e.target.value)}
                  placeholder={filter.placeholder}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    fontSize: 11,
                    border: '1px solid #D1D5DB',
                    borderRadius: 5,
                    backgroundColor: '#FFFFFF'
                  }}
                />
              )}

              {filter.type === 'date' && (
                <input
                  type="date"
                  value={values[filter.id] || ''}
                  onChange={(e) => onChange(filter.id, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    fontSize: 11,
                    border: '1px solid #D1D5DB',
                    borderRadius: 5,
                    backgroundColor: '#FFFFFF'
                  }}
                />
              )}

              {filter.type === 'daterange' && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="date"
                    value={values[filter.id]?.start || ''}
                    onChange={(e) =>
                      onChange(filter.id, {
                        ...(values[filter.id] || {}),
                        start: e.target.value
                      })
                    }
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      fontSize: 11,
                      border: '1px solid #D1D5DB',
                      borderRadius: 5,
                      backgroundColor: '#FFFFFF'
                    }}
                  />
                  <span style={{ fontSize: 10, color: '#6B7280' }}>to</span>
                  <input
                    type="date"
                    value={values[filter.id]?.end || ''}
                    onChange={(e) =>
                      onChange(filter.id, {
                        ...(values[filter.id] || {}),
                        end: e.target.value
                      })
                    }
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      fontSize: 11,
                      border: '1px solid #D1D5DB',
                      borderRadius: 5,
                      backgroundColor: '#FFFFFF'
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FilterPanel;
