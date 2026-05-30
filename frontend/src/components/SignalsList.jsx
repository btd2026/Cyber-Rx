/**
 * SignalsList Component
 *
 * Table/list view of recent vendor risk signals with filtering and sorting.
 * Shows signal details, severity, source, and observed date.
 */

import React, { useState } from 'react';

const SignalsList = ({ signals, onSignalClick }) => {
  const [filter, setFilter] = useState('all'); // all, critical, high, medium, low
  const [expanded, setExpanded] = useState(null);

  if (!signals || signals.length === 0) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#6B7280',
        fontSize: 12
      }}>
        No signals to display
      </div>
    );
  }

  // Severity colors
  const severityColors = {
    Critical: '#EF4545',
    High: '#F5A623',
    Medium: '#3B9EFF',
    Low: '#10B981',
    Info: '#6B7280'
  };

  // Filter signals
  const filteredSignals = signals.filter(signal => {
    if (filter === 'all') return true;
    return signal.severity === filter.charAt(0).toUpperCase() + filter.slice(1);
  });

  // Format date
  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const daysAgo = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (daysAgo === 0) return 'Today';
    if (daysAgo === 1) return 'Yesterday';
    if (daysAgo < 7) return `${daysAgo} days ago`;
    return d.toLocaleDateString();
  };

  return (
    <div>
      {/* Filter controls */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 12,
        flexWrap: 'wrap'
      }}>
        {['all', 'critical', 'high', 'medium', 'low'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '4px 10px',
              border: '1px solid #E5E7EB',
              borderRadius: 5,
              backgroundColor: filter === f ? '#2563EB' : '#FFFFFF',
              color: filter === f ? '#FFFFFF' : '#374151',
              fontSize: 9,
              fontWeight: filter === f ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textTransform: 'capitalize'
            }}
          >
            {f} ({f === 'all' ? signals.length : signals.filter(s =>
              s.severity === f.charAt(0).toUpperCase() + f.slice(1)
            ).length})
          </button>
        ))}
      </div>

      {/* Signals list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredSignals.map((signal, idx) => (
          <div
            key={signal.id || idx}
            style={{
              border: '1px solid #E5E7EB',
              borderRadius: 6,
              backgroundColor: '#FFFFFF',
              overflow: 'hidden',
              transition: 'border-color 0.2s ease'
            }}
          >
            {/* Signal summary (always visible) */}
            <div
              onClick={() => onSignalClick ? onSignalClick(signal) : null}
              style={{
                padding: 10,
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                cursor: onSignalClick ? 'pointer' : 'default'
              }}
            >
              {/* Severity indicator */}
              <div style={{
                minWidth: 4,
                height: 40,
                borderRadius: 2,
                backgroundColor: severityColors[signal.severity] || '#6B7280'
              }} />

              {/* Signal details */}
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 4
                }}>
                  <div style={{
                    color: '#111827',
                    fontSize: 11,
                    fontWeight: 600
                  }}>
                    {signal.signalName}
                  </div>
                  <div style={{
                    padding: '2px 6px',
                    borderRadius: 4,
                    backgroundColor: `${severityColors[signal.severity] || '#6B7280'}15`,
                    color: severityColors[signal.severity] || '#6B7280',
                    fontSize: 8,
                    fontWeight: 600
                  }}>
                    {signal.severity}
                  </div>
                </div>

                <div style={{
                  color: '#6B7280',
                  fontSize: 9,
                  marginBottom: 4
                }}>
                  {signal.description}
                </div>

                <div style={{
                  display: 'flex',
                  gap: 12,
                  fontSize: 8,
                  color: '#9CA3AF'
                }}>
                  <span>Source: {signal.sourceName}</span>
                  <span>Category: {signal.signalCategory}</span>
                  <span>{formatDate(signal.observedAt)}</span>
                </div>
              </div>
            </div>

            {/* Expandable details */}
            {expanded === idx && (
              <div style={{
                borderTop: '1px solid #E5E7EB',
                padding: 10,
                backgroundColor: '#F9FAFB'
              }}>
                {signal.recommendedAction && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                      Recommended Action:
                    </div>
                    <div style={{ fontSize: 9, color: '#6B7280' }}>
                      {signal.recommendedAction}
                    </div>
                  </div>
                )}

                {signal.evidenceUrl && (
                  <div style={{ marginBottom: 8 }}>
                    <a
                      href={signal.evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 9,
                        color: '#2563EB',
                        textDecoration: 'none'
                      }}
                    >
                      View Evidence →
                    </a>
                  </div>
                )}

                {signal.mappedFrameworks && signal.mappedFrameworks.length > 0 && (
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                      Mapped Frameworks:
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {signal.mappedFrameworks.map((fw, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: '2px 6px',
                            borderRadius: 3,
                            backgroundColor: '#E5E7EB',
                            fontSize: 8,
                            color: '#374151'
                          }}
                        >
                          {fw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Show count when filtered */}
      {filter !== 'all' && (
        <div style={{
          marginTop: 8,
          fontSize: 9,
          color: '#6B7280',
          textAlign: 'center'
        }}>
          Showing {filteredSignals.length} of {signals.length} signals
        </div>
      )}
    </div>
  );
};

export default SignalsList;
