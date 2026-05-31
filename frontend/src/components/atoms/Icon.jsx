/**
 * Icon Component
 *
 * Display icon with size and color customization.
 * Supports emoji icons and custom styling.
 *
 * @param {string} props.icon - Icon (emoji or character)
 * @param {number} props.size - Icon size in pixels (default: 16)
 * @param {string} props.color - Icon color (hex code)
 * @param {string} props.title - Accessibility title
 */

import React from 'react';

const Icon = ({ icon, size = 16, color, title }) => {
  return (
    <span
      title={title}
      style={{
        fontSize: size,
        lineHeight: 1,
        color: color || 'inherit',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {icon}
    </span>
  );
};

export default Icon;
