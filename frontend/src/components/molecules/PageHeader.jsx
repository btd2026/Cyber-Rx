/**
 * PageHeader Component
 *
 * Standard page header with title, subtitle, and actions.
 * Provides consistent layout for all pages.
 *
 * @param {string} props.title - Page title
 * @param {string} props.subtitle - Page subtitle/description
 * @param {ReactNode} props.actions - Action buttons or controls
 * @param {string} props.icon - Page icon (emoji)
 */

import React from 'react';

const PageHeader = ({ title, subtitle, actions, icon }) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
        paddingBottom: 16,
        borderBottom: '1px solid #E2E8F0'
      }}
    >
      {/* Title section */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 4
          }}
        >
          {icon && (
            <span style={{ fontSize: 24, lineHeight: 1 }}>{icon}</span>
          )}
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#0F172A',
              margin: 0,
              lineHeight: 1.2
            }}
          >
            {title}
          </h1>
        </div>
        {subtitle && (
          <p
            style={{
              fontSize: 12,
              color: '#64748B',
              margin: 0,
              lineHeight: 1.4
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Actions section */}
      {actions && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexShrink: 0
          }}
        >
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
