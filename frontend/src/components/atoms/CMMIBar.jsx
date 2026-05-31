/**
 * CMMIBar Component
 *
 * Displays CMMI maturity level as a visual progress bar with 5 levels.
 * Shows both the level indicator and the numeric score progression.
 *
 * @param {number} props.score - Maturity score (0-100)
 * @param {number} props.width - Bar width in pixels (default: 200)
 */

import React from 'react';
import { CMMI_LEVELS, getCMMILevel } from './CMMIBadge';

const CMMIBar = ({ score, width = 200 }) => {
  const currentLevel = getCMMILevel(score);

  return (
    <div style={{ width: width, display: 'inline-block' }}>
      {/* Level segments */}
      <div
        style={{
          height: 6,
          background: '#1a2030',
          borderRadius: 3,
          overflow: 'hidden',
          display: 'flex',
          marginBottom: 3
        }}
      >
        {CMMI_LEVELS.map((lvl, i) => {
          const isActive = currentLevel.level === lvl.level;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: '100%',
                background: isActive ? lvl.color : 'transparent',
                borderRight: i < 4 ? '1px solid #2a3040' : ''
              }}
            />
          );
        })}
      </div>

      {/* Level labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {CMMI_LEVELS.map((lvl, i) => {
          const isActive = currentLevel.level === lvl.level;
          return (
            <div
              key={i}
              style={{
                fontSize: 7,
                color: isActive ? lvl.color : '#3a4050',
                fontWeight: isActive ? 800 : 400,
                textAlign: 'center',
                width: '20%'
              }}
            >
              L{lvl.level}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CMMIBar;
