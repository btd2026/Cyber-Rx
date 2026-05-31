/**
 * RiskMatrix Component
 *
 * Visual risk assessment matrix (likelihood vs impact).
 * Used for risk analysis and prioritization.
 *
 * @param {Array} props.risks - Risk data array
 * @param {function} props.onRiskClick - Risk click callback
 * @param {boolean} props.showCounts - Show risk counts in cells
 */

import React from 'react';

const RiskMatrix = ({ risks = [], onRiskClick, showCounts = true }) => {
  // Matrix configuration
  const likelihoodLabels = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Certain'];
  const impactLabels = ['Negligible', 'Minor', 'Moderate', 'Major', 'Severe'];

  // Calculate risk levels
  const getRiskLevel = (likelihood, impact) => {
    // Likelihood: 1-5, Impact: 1-5
    const score = likelihood * impact;
    if (score >= 20) return 'critical';
    if (score >= 12) return 'high';
    if (score >= 6) return 'medium';
    return 'low';
  };

  // Get risk level color
  const getRiskColor = (level) => {
    const colors = {
      critical: '#DC2626',
      high: '#F59E0B',
      medium: '#3B9EFF',
      low: '#10B981'
    };
    return colors[level] || '#6B7280';
  };

  // Group risks by matrix position
  const matrix = React.useMemo(() => {
    const grid = Array(5)
      .fill(null)
      .map(() => Array(5).fill(null).map(() => []));

    risks.forEach((risk) => {
      const likelihood = Math.min(5, Math.max(1, risk.likelihood || 3));
      const impact = Math.min(5, Math.max(1, risk.impact || 3));
      grid[likelihood - 1][impact - 1].push(risk);
    });

    return grid;
  }, [risks]);

  return (
    <div
      style={{
        padding: 16,
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: 8
      }}
    >
      {/* Matrix title */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#111827',
          marginBottom: 16,
          textAlign: 'center'
        }}
      >
        Risk Assessment Matrix
      </div>

      {/* Matrix */}
      <div style={{ display: 'flex', gap: 2 }}>
        {/* Y-axis label */}
        <div
          style={{
            width: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 600,
            color: '#6B7280',
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'rotate(180deg)'
          }}
        >
          LIKELIHOOD
        </div>

        {/* Matrix grid */}
        <div>
          {/* Column headers (Impact) */}
          <div style={{ display: 'flex', marginBottom: 4, marginLeft: 40 }}>
            {impactLabels.map((label, i) => (
              <div
                key={label}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: 8,
                  fontWeight: 600,
                  color: '#6B7280',
                  transform: i % 2 === 0 ? 'none' : 'translateY(8px)',
                  height: i % 2 === 0 ? 16 : 24
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Matrix rows */}
          {matrix.map((row, rowIndex) => (
            <div key={rowIndex} style={{ display: 'flex', gap: 2, marginBottom: 2 }}>
              {/* Row label (Likelihood) */}
              <div
                style={{
                  width: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  fontSize: 8,
                  fontWeight: 600,
                  color: '#6B7280',
                  paddingRight: 8
                }}
              >
                {likelihoodLabels[4 - rowIndex]}
              </div>

              {/* Cells */}
              {row.map((cellRisks, colIndex) => {
                const riskLevel = getRiskLevel(rowIndex + 1, colIndex + 1);
                const bgColor = getRiskColor(riskLevel);
                const count = cellRisks.length;

                return (
                  <div
                    key={colIndex}
                    onClick={() => {
                      if (count > 0 && onRiskClick) {
                        onRiskClick(cellRisks);
                      }
                    }}
                    style={{
                      flex: 1,
                      height: 50,
                      backgroundColor: count > 0 ? bgColor : `${bgColor}20`,
                      border: `1px solid ${bgColor}40`,
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: count > 0 && onRiskClick ? 'pointer' : 'default',
                      transition: 'all 0.15s ease',
                      position: 'relative'
                    }}
                    onMouseOver={(e) => {
                      if (count > 0) {
                        e.target.style.transform = 'scale(1.05)';
                        e.target.style.boxShadow = `0 4px 12px ${bgColor}40`;
                      }
                    }}
                    onMouseOut={(e) => {
                      e.target.style.transform = 'scale(1)';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    {showCounts && count > 0 && (
                      <>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: '#FFFFFF',
                            lineHeight: 1
                          }}
                        >
                          {count}
                        </div>
                        {count === 1 && (
                          <div
                            style={{
                              position: 'absolute',
                              fontSize: 6,
                              color: '#FFFFFF',
                              opacity: 0.8,
                              bottom: 2
                            }}
                          >
                            RISK
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* X-axis label */}
      <div
        style={{
          marginTop: 8,
          marginLeft: 20,
          textAlign: 'center',
          fontSize: 10,
          fontWeight: 600,
          color: '#6B7280'
        }}
      >
        IMPACT →
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 16,
          marginTop: 16,
          paddingTop: 12,
          borderTop: '1px solid #E5E7EB'
        }}
      >
        {[
          { level: 'critical', label: 'Critical (20-25)' },
          { level: 'high', label: 'High (12-16)' },
          { level: 'medium', label: 'Medium (6-9)' },
          { level: 'low', label: 'Low (1-4)' }
        ].map(({ level, label }) => (
          <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                backgroundColor: getRiskColor(level)
              }}
            />
            <span style={{ fontSize: 9, color: '#6B7280' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RiskMatrix;
