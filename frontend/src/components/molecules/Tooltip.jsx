/**
 * Tooltip Component
 *
 * Hover tooltip with positioning and customization.
 * Supports top, bottom, left, right positions.
 *
 * @param {ReactNode} props.children - Content to show tooltip on
 * @param {string} props.content - Tooltip text
 * @param {string} props.position - Tooltip position: 'top' | 'bottom' (default) | 'left' | 'right'
 * @param {number} props.delay - Show delay in ms (default: 200)
 * @param {string} props.variant - Color variant: 'dark' (default) | 'light'
 */

import React, { useState, useRef } from 'react';

const Tooltip = ({ children, content, position = 'bottom', delay = 200, variant = 'dark' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const variants = {
    dark: {
      backgroundColor: '#1F2937',
      color: '#FFFFFF'
    },
    light: {
      backgroundColor: '#FFFFFF',
      color: '#1F2937',
      border: '1px solid #E5E7EB',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
    }
  };

  const variantStyle = variants[variant] || variants.dark;

  const positions = {
    top: {
      bottom: '100%',
      marginBottom: 8,
      left: '50%',
      transform: 'translateX(-50%)'
    },
    bottom: {
      top: '100%',
      marginTop: 8,
      left: '50%',
      transform: 'translateX(-50%)'
    },
    left: {
      right: '100%',
      marginRight: 8,
      top: '50%',
      transform: 'translateY(-50%)'
    },
    right: {
      left: '100%',
      marginLeft: 8,
      top: '50%',
      transform: 'translateY(-50%)'
    }
  };

  const positionStyle = positions[position] || positions.bottom;

  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {isVisible && (
        <div
          style={{
            position: 'absolute',
            ...positionStyle,
            ...variantStyle,
            padding: '6px 10px',
            borderRadius: 5,
            fontSize: 10,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            zIndex: 1000,
            pointerEvents: 'none',
            maxWidth: 200,
            whiteSpace: 'normal',
            textAlign: 'center'
          }}
        >
          {content}

          {/* Arrow */}
          <div
            style={{
              position: 'absolute',
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              ...(position === 'top' && {
                bottom: -5,
                left: '50%',
                transform: 'translateX(-50%)',
                borderTop: `5px solid ${variantStyle.backgroundColor}`
              }),
              ...(position === 'bottom' && {
                top: -5,
                left: '50%',
                transform: 'translateX(-50%)',
                borderBottom: `5px solid ${variantStyle.backgroundColor}`
              }),
              ...(position === 'left' && {
                right: -5,
                top: '50%',
                transform: 'translateY(-50%)',
                borderLeft: `5px solid ${variantStyle.backgroundColor}`
              }),
              ...(position === 'right' && {
                left: -5,
                top: '50%',
                transform: 'translateY(-50%)',
                borderRight: `5px solid ${variantStyle.backgroundColor}`
              })
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Tooltip;
