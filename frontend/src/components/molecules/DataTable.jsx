/**
 * DataTable Component
 *
 * Reusable data table with sorting, filtering, and pagination.
 * Supports custom cell renderers and row actions.
 *
 * @param {Array} props.data - Table data array
 * @param {Array} props.columns - Column configuration
 * @param {function} props.onRowClick - Row click callback
 * @param {boolean} props.sortable - Enable sorting
 * @param {boolean} props.selectable - Enable row selection
 * @param {function} props.onSelectionChange - Selection change callback
 * @param {Object} props.pagination - Pagination config { page, pageSize, total }
 */

import React, { useState } from 'react';

const DataTable = ({
  data = [],
  columns = [],
  onRowClick,
  sortable = true,
  selectable = false,
  onSelectionChange,
  pagination
}) => {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedRows, setSelectedRows] = useState(new Set());

  // Handle sorting
  const handleSort = (column) => {
    if (!sortable) return;

    const isAsc = sortColumn === column.id && sortDirection === 'asc';
    setSortColumn(column.id);
    setSortDirection(isAsc ? 'desc' : 'asc');
  };

  // Get sorted data
  const getSortedData = () => {
    if (!sortColumn) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal === bVal) return 0;
      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  // Handle row selection
  const handleRowSelect = (rowId) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(rowId)) {
      newSelection.delete(rowId);
    } else {
      newSelection.add(rowId);
    }
    setSelectedRows(newSelection);
    onSelectionChange?.(Array.from(newSelection));
  };

  const sortedData = getSortedData();
  const displayData = pagination
    ? sortedData.slice(
        (pagination.page - 1) * pagination.pageSize,
        pagination.page * pagination.pageSize
      )
    : sortedData;

  return (
    <div
      style={{
        border: '1px solid #E5E7EB',
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden'
      }}
    >
      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 11
          }}
        >
          {/* Header */}
          <thead>
            <tr
              style={{
                backgroundColor: '#F9FAFB',
                borderBottom: '2px solid #E5E7EB'
              }}
            >
              {selectable && (
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: '#374151',
                    fontSize: 10,
                    width: 40
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedRows.size === data.length && data.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allIds = data.map((row) => row.id);
                        setSelectedRows(new Set(allIds));
                        onSelectionChange?.(allIds);
                      } else {
                        setSelectedRows(new Set());
                        onSelectionChange?.([]);
                      }
                    }}
                    style={{ margin: 0 }}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.id}
                  onClick={() => sortable && handleSort(column)}
                  style={{
                    padding: '10px 12px',
                    textAlign: column.align || 'left',
                    fontWeight: 600,
                    color: '#374151',
                    fontSize: 10,
                    cursor: sortable ? 'pointer' : 'default',
                    userSelect: sortable ? 'none' : 'auto',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      justifyContent: column.align === 'right' ? 'flex-end' : 'flex-start'
                    }}
                  >
                    {column.label}
                    {sortable && sortColumn === column.id && (
                      <span style={{ color: '#6B7280', fontSize: 9 }}>
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {displayData.map((row, rowIndex) => (
              <tr
                key={row.id || rowIndex}
                onClick={() => !selectable && onRowClick?.(row)}
                style={{
                  borderBottom:
                    rowIndex < displayData.length - 1 ? '1px solid #E5E7EB' : 'none',
                  backgroundColor: selectedRows.has(row.id) ? '#F0F9FF' : '#FFFFFF',
                  cursor: onRowClick && !selectable ? 'pointer' : 'default',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseOver={(e) => {
                  if (!selectedRows.has(row.id)) {
                    e.target.style.backgroundColor = '#F9FAFB';
                  }
                }}
                onMouseOut={(e) => {
                  if (!selectedRows.has(row.id)) {
                    e.target.style.backgroundColor = '#FFFFFF';
                  }
                }}
              >
                {selectable && (
                  <td
                    style={{
                      padding: '10px 12px',
                      verticalAlign: 'top'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRows.has(row.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleRowSelect(row.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ margin: 0 }}
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td
                    key={column.id}
                    style={{
                      padding: '10px 12px',
                      verticalAlign: 'top',
                      textAlign: column.align || 'left',
                      color: '#6B7280'
                    }}
                  >
                    {column.render ? column.render(row[column.id], row) : row[column.id]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #E5E7EB',
            backgroundColor: '#F9FAFB',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 10
          }}
        >
          <div style={{ color: '#6B7280' }}>
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} entries
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              style={{
                padding: '4px 8px',
                fontSize: 10,
                border: '1px solid #D1D5DB',
                borderRadius: 4,
                backgroundColor: pagination.page === 1 ? '#F3F4F6' : '#FFFFFF',
                cursor: pagination.page === 1 ? 'not-allowed' : 'pointer',
                color: pagination.page === 1 ? '#9CA3AF' : '#374151'
              }}
            >
              Previous
            </button>
            {Array.from({ length: Math.ceil(pagination.total / pagination.pageSize) }, (_, i) => {
              const pageNum = i + 1;
              const showPage =
                pageNum === 1 ||
                pageNum === Math.ceil(pagination.total / pagination.pageSize) ||
                (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1);

              if (!showPage) return null;

              return (
                <button
                  key={pageNum}
                  onClick={() => pagination.onPageChange(pageNum)}
                  style={{
                    padding: '4px 8px',
                    fontSize: 10,
                    border: '1px solid #D1D5DB',
                    borderRadius: 4,
                    backgroundColor: pagination.page === pageNum ? '#3B9EFF' : '#FFFFFF',
                    color: pagination.page === pageNum ? '#FFFFFF' : '#374151',
                    cursor: 'pointer'
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page === Math.ceil(pagination.total / pagination.pageSize)}
              style={{
                padding: '4px 8px',
                fontSize: 10,
                border: '1px solid #D1D5DB',
                borderRadius: 4,
                backgroundColor:
                  pagination.page === Math.ceil(pagination.total / pagination.pageSize)
                    ? '#F3F4F6'
                    : '#FFFFFF',
                cursor:
                  pagination.page === Math.ceil(pagination.total / pagination.pageSize)
                    ? 'not-allowed'
                    : 'pointer',
                color:
                  pagination.page === Math.ceil(pagination.total / pagination.pageSize)
                    ? '#9CA3AF'
                    : '#374151'
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
