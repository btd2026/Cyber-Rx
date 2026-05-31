/**
 * Card Component
 *
 * Reusable card container with header, body, and footer sections.
 * Supports various layouts and styling options.
 *
 * @param {ReactNode} props.children - Card content
 * @param {string} props.title - Card title
 * @param {ReactNode} props.header - Custom header content
 * @param {ReactNode} props.footer - Card footer content
 * @param {boolean} props.bordered - Show border
 * @param {boolean} props.hoverable - Add hover effect
 * @param {string} props.padding - Custom padding
 */

import React from 'react';

const Card = ({
  children,
  title,
  header,
  footer,
  bordered = true,
  hoverable = false,
  padding = '16px',
  style
}) => {
  const baseStyle = {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    transition: hoverable ? 'box-shadow 0.2s ease, border-color 0.2s ease' : 'none',
    ...style
  };

  const borderStyle = bordered ? {
    border: '1px solid #E5E7EB'
  } : {};

  const hoverStyle = hoverable ? {
    cursor: 'pointer',
    ':hover': {
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
      borderColor: '#D1D5DB'
    }
  } : {};

  return (
    <div style={{ ...baseStyle, ...borderStyle, ...hoverStyle }}>
      {/* Header */}
      {(title || header) && (
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid #E5E7EB',
            backgroundColor: '#F9FAFB'
          }}
        >
          {title ? (
            <h3
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 700,
                color: '#111827'
              }}
            >
              {title}
            </h3>
          ) : (
            header
          )}
        </div>
      )}

      {/* Body */}
      <div style={{ padding }}>
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #E5E7EB',
            backgroundColor: '#F9FAFB'
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
