/**
 * DashboardPage Template
 *
 * Standard dashboard page layout with header, metrics grid, and content sections.
 * Used as base for CISO, CIO, CLO, and other dashboards.
 *
 * @param {string} props.title - Page title
 * @param {string} props.subtitle - Page subtitle
 * @param {string} props.icon - Page icon (emoji)
 * @param {Array} props.metrics - Metrics array for top row
 * @param {ReactNode} props.children - Main content
 * @param {ReactNode} props.sidebar - Sidebar content (optional)
 * @param {ReactNode} props.actions - Header actions (optional)
 */

import React from 'react';
import PageHeader from '../molecules/PageHeader';
import MetricCard from '../MetricCard';

const DashboardPage = ({
  title,
  subtitle,
  icon,
  metrics = [],
  children,
  sidebar,
  actions
}) => {
  return (
    <div style={{ maxWidth: '100%', margin: '0 auto' }}>
      {/* Page Header */}
      <PageHeader title={title} subtitle={subtitle} icon={icon} actions={actions} />

      {/* Metrics Grid */}
      {metrics && metrics.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 24
          }}
        >
          {metrics.map((metric, index) => (
            <MetricCard key={index} metric={metric} />
          ))}
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ display: 'flex', gap: 24 }}>
        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>

        {/* Sidebar (optional) */}
        {sidebar && (
          <div style={{ width: 320, flexShrink: 0 }}>{sidebar}</div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
