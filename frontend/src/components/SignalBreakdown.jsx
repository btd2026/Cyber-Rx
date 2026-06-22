/**
 * SignalBreakdown Component
 *
 * Visual breakdown of vendor risk signals by category with severity distribution.
 * Shows category name, total signals, and severity breakdown.
 */

import React from 'react';

const SignalBreakdown = ({ signalsByCategory }) => {
  if (!signalsByCategory || Object.keys(signalsByCategory).length === 0) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#5c6066',
        fontSize: 12
      }}>
        No signals available
      </div>
    );
  }

  const categoryColors = {
    'External Attack Surface': '#3B9EFF',
    'Breach/Incident Intelligence': '#EF4545',
    'Dark Web/Credential Exposure': '#243044',
    'Regulatory Breach Disclosure': '#F59E0B',
    'Compliance Evidence': '#10B981',
    'Questionnaire/Attestation': '#64748B',
    'Fourth-Party Risk': '#EC4899',
    'Policy Drift': '#14B8A6',
    'Business Criticality': '#F97316'
  };

  const severityColors = {
    critical: '#EF4545',
    high: '#F5A623',
    medium: '#3B9EFF',
    low: '#10B981',
    info: '#5c6066'
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: 12
    }}>
      {Object.entries(signalsByCategory).map(([category, data]) => (
        <div
          key={category}
          style={{
            border: '1px solid #ebecf0',
            borderRadius: 8,
            padding: 12,
            backgroundColor: '#FFFFFF'
          }}
        >
          {/* Category header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8
          }}>
            <div style={{
              color: '#0b0c0e',
              fontSize: 10,
              fontWeight: 700,
              flex: 1
            }}>
              {category}
            </div>
            <div style={{
              padding: '2px 6px',
              borderRadius: 4,
              backgroundColor: `${categoryColors[category] || '#5c6066'}15`,
              color: categoryColors[category] || '#5c6066',
              fontSize: 9,
              fontWeight: 600
            }}>
              {data.total}
            </div>
          </div>

          {/* Severity breakdown */}
          {data.total > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {data.critical > 0 && (
                <div style={{
                  padding: '2px 6px',
                  borderRadius: 3,
                  backgroundColor: `${severityColors.critical}15`,
                  color: severityColors.critical,
                  fontSize: 8,
                  fontWeight: 600
                }}>
                  C: {data.critical}
                </div>
              )}
              {data.high > 0 && (
                <div style={{
                  padding: '2px 6px',
                  borderRadius: 3,
                  backgroundColor: `${severityColors.high}15`,
                  color: severityColors.high,
                  fontSize: 8,
                  fontWeight: 600
                }}>
                  H: {data.high}
                </div>
              )}
              {data.medium > 0 && (
                <div style={{
                  padding: '2px 6px',
                  borderRadius: 3,
                  backgroundColor: `${severityColors.medium}15`,
                  color: severityColors.medium,
                  fontSize: 8,
                  fontWeight: 600
                }}>
                  M: {data.medium}
                </div>
              )}
              {data.low > 0 && (
                <div style={{
                  padding: '2px 6px',
                  borderRadius: 3,
                  backgroundColor: `${severityColors.low}15`,
                  color: severityColors.low,
                  fontSize: 8,
                  fontWeight: 600
                }}>
                  L: {data.low}
                </div>
              )}
              {data.info > 0 && (
                <div style={{
                  padding: '2px 6px',
                  borderRadius: 3,
                  backgroundColor: `${severityColors.info}15`,
                  color: severityColors.info,
                  fontSize: 8,
                  fontWeight: 600
                }}>
                  I: {data.info}
                </div>
              )}
            </div>
          )}

          {data.total === 0 && (
            <div style={{ fontSize: 9, color: '#8b9098', fontStyle: 'italic' }}>
              No active signals
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default SignalBreakdown;
