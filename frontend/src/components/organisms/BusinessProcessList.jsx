/**
 * BusinessProcessList Component
 *
 * Displays business processes in a table format with filtering, sorting, and pagination.
 * Shows process health scores, control coverage, and risk counts.
 *
 * @param {Object} props
 * @param {Array} props.processes - Business processes to display
 * @param {Function} props.onProcessClick - Click handler for process row
 * @param {Function} props.onEdit - Edit handler
 * @param {Function} props.onDelete - Delete handler
 * @param {boolean} props.loading - Loading state
 */

import React, { useState, useMemo } from 'react';
import { CMMIBadge, CMMIBar } from '../atoms/CMMIBadge';
import StatusIcon from '../atoms/StatusIcon';
import Badge from '../atoms/Badge';
import Button from '../atoms/Button';

const BusinessProcessList = ({
  processes = [],
  onProcessClick,
  onEdit,
  onDelete,
  loading = false
}) => {
  const [filters, setFilters] = useState({
    tier: 'all',
    criticality: 'all',
    owner: 'all'
  });
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Filter processes
  const filteredProcesses = useMemo(() => {
    return processes.filter(process => {
      if (filters.tier !== 'all' && process.tier !== filters.tier) return false;
      if (filters.criticality !== 'all' && process.criticality !== filters.criticality) return false;
      if (filters.owner !== 'all' && process.owner !== filters.owner) return false;
      return true;
    });
  }, [processes, filters]);

  // Sort processes
  const sortedProcesses = useMemo(() => {
    return [...filteredProcesses].sort((a, b) => {
      let compare = 0;

      if (sortBy === 'name') {
        compare = a.name.localeCompare(b.name);
      } else if (sortBy === 'criticality') {
        const criticalityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
        compare = criticalityOrder[a.criticality] - criticalityOrder[b.criticality];
      } else if (sortBy === 'healthScore') {
        compare = (a.healthScore || 0) - (b.healthScore || 0);
      } else if (sortBy === 'owner') {
        compare = a.owner.localeCompare(b.owner);
      }

      return sortOrder === 'asc' ? compare : -compare;
    });
  }, [filteredProcesses, sortBy, sortOrder]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
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

  const getTierColor = (tier) => {
    return tier === 'Primary' ? '#1E40AF' : '#243044';
  };

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#6B7280' }}>
        Loading business processes...
      </div>
    );
  }

  if (sortedProcesses.length === 0) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#6B7280' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
        <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
          No business processes found
        </div>
        <div style={{ fontSize: '14px' }}>
          {processes.length === 0
            ? 'Create your first business process to get started'
            : 'Try adjusting your filters'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: 8, border: '1px solid #E5E7EB' }}>
      {/* Filters */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: 200, fontSize: '14px', fontWeight: 600, color: '#111827' }}>
          {sortedProcesses.length} Business Process{sortedProcesses.length !== 1 ? 'es' : ''}
        </div>

        {/* Tier Filter */}
        <select
          value={filters.tier}
          onChange={(e) => setFilters({ ...filters, tier: e.target.value })}
          style={{
            padding: '6px 12px',
            border: '1px solid #D1D5DB',
            borderRadius: 6,
            fontSize: '14px',
            color: '#374151'
          }}
        >
          <option value="all">All Tiers</option>
          <option value="Primary">Primary</option>
          <option value="Strategic">Strategic</option>
        </select>

        {/* Criticality Filter */}
        <select
          value={filters.criticality}
          onChange={(e) => setFilters({ ...filters, criticality: e.target.value })}
          style={{
            padding: '6px 12px',
            border: '1px solid #D1D5DB',
            borderRadius: 6,
            fontSize: '14px',
            color: '#374151'
          }}
        >
          <option value="all">All Criticality</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        {/* Owner Filter */}
        <select
          value={filters.owner}
          onChange={(e) => setFilters({ ...filters, owner: e.target.value })}
          style={{
            padding: '6px 12px',
            border: '1px solid #D1D5DB',
            borderRadius: 6,
            fontSize: '14px',
            color: '#374151'
          }}
        >
          <option value="all">All Owners</option>
          <option value="CIO">CIO</option>
          <option value="CISO">CISO</option>
          <option value="CFO">CFO</option>
          <option value="CRO">CRO</option>
          <option value="CTO">CTO</option>
        </select>
      </div>

      {/* Table Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 100px 100px 80px 120px 100px 120px 80px',
        padding: '12px 16px',
        backgroundColor: '#F9FAFB',
        borderBottom: '1px solid #E5E7EB',
        fontSize: '12px',
        fontWeight: 600,
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        <div
          onClick={() => handleSort('name')}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          Process Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
        </div>
        <div>Tier</div>
        <div
          onClick={() => handleSort('criticality')}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          Criticality {sortBy === 'criticality' && (sortOrder === 'asc' ? '↑' : '↓')}
        </div>
        <div
          onClick={() => handleSort('owner')}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          Owner {sortBy === 'owner' && (sortOrder === 'asc' ? '↑' : '↓')}
        </div>
        <div
          onClick={() => handleSort('healthScore')}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          Health {sortBy === 'healthScore' && (sortOrder === 'asc' ? '↑' : '↓')}
        </div>
        <div>Controls</div>
        <div>Systems</div>
        <div>Actions</div>
      </div>

      {/* Table Body */}
      {sortedProcesses.map((process, index) => (
        <div
          key={process.id}
          onClick={() => onProcessClick && onProcessClick(process)}
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 100px 100px 80px 120px 100px 120px 80px',
            padding: '12px 16px',
            borderBottom: index < sortedProcesses.length - 1 ? '1px solid #E5E7EB' : 'none',
            fontSize: '13px',
            cursor: onProcessClick ? 'pointer' : 'default',
            transition: 'background-color 0.15s ease',
            ':hover': onProcessClick ? { backgroundColor: '#F9FAFB' } : {}
          }}
          onMouseOver={(e) => {
            if (onProcessClick) {
              e.currentTarget.style.backgroundColor = '#F9FAFB';
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {/* Process Name */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 500,
            color: '#111827',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            <StatusIcon status={process.healthScore >= 80 ? 'healthy' : process.healthScore >= 60 ? 'warning' : 'critical'} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {process.name}
            </span>
          </div>

          {/* Tier */}
          <div>
            <Badge
              variant="info"
              label={process.tier}
              style={{ backgroundColor: `${getTierColor(process.tier)}15`, color: getTierColor(process.tier) }}
            />
          </div>

          {/* Criticality */}
          <div>
            <Badge
              variant={process.criticality === 'Critical' ? 'danger' : process.criticality === 'High' ? 'warning' : 'info'}
              label={process.criticality}
              style={{ backgroundColor: `${getCriticalityColor(process.criticality)}15`, color: getCriticalityColor(process.criticality) }}
            />
          </div>

          {/* Owner */}
          <div style={{ color: '#374151', fontWeight: 500 }}>
            {process.owner}
          </div>

          {/* Health Score */}
          <div>
            <CMMIBadge score={process.healthScore || 0} size="sm" />
          </div>

          {/* Controls */}
          <div style={{ color: '#6B7280' }}>
            {process.governedByControls?.length || 0}
            {process.controlGap > 0 && (
              <span style={{ color: '#EF4545', marginLeft: '4px' }}>
                (-{process.controlGap})
              </span>
            )}
          </div>

          {/* Systems */}
          <div style={{ color: '#6B7280' }}>
            {process.supportedBySystems?.length || 0}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {onEdit && (
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(process);
                }}
                style={{ padding: '4px 8px', fontSize: '12px' }}
              >
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="danger"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete ${process.name}?`)) {
                    onDelete(process);
                  }
                }}
                style={{ padding: '4px 8px', fontSize: '12px' }}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default BusinessProcessList;
