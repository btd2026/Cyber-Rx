/**
 * ListPage Template
 *
 * Standard list page layout with filters, search, and data table.
 * Used for findings, controls, evidence, and other list views.
 *
 * @param {string} props.title - Page title
 * @param {string} props.subtitle - Page subtitle
 * @param {ReactNode} props.filters - Filter panel component
 * @param {ReactNode} props.toolbar - Toolbar with actions
 * @param {Array} props.columns - Table columns configuration
 * @param {Array} props.data - Table data
 * @param {Object} props.pagination - Pagination config
 * @param {boolean} props.selectable - Enable row selection
 * @param {function} props.onSelectionChange - Selection change callback
 */

import React from 'react';
import PageHeader from '../molecules/PageHeader';
import DataTable from '../molecules/DataTable';
import Input from '../molecules/Input';

const ListPage = ({
  title,
  subtitle,
  filters,
  toolbar,
  columns = [],
  data = [],
  pagination,
  selectable = false,
  onSelectionChange,
  onSearch,
  searchPlaceholder = 'Search...'
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <PageHeader title={title} subtitle={subtitle} />

      {/* Content layout with filters */}
      <div style={{ display: 'flex', gap: 24 }}>
        {/* Filter sidebar */}
        {filters && (
          <div style={{ width: 280, flexShrink: 0 }}>{filters}</div>
        )}

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Toolbar with search and actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              gap: 16
            }}
          >
            {/* Search */}
            <div style={{ flex: 1, maxWidth: 400 }}>
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                style={{ marginBottom: 0 }}
              />
            </div>

            {/* Actions */}
            {toolbar && (
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {toolbar}
              </div>
            )}
          </div>

          {/* Data table */}
          <DataTable
            columns={columns}
            data={data}
            pagination={pagination}
            selectable={selectable}
            onSelectionChange={onSelectionChange}
          />

          {/* Empty state */}
          {data.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: 40,
                backgroundColor: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: 8
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                No items found
              </div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>
                {searchQuery
                  ? `No results matching "${searchQuery}"`
                  : 'Get started by adding your first item'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListPage;
