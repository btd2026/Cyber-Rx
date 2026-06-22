/**
 * Timeline Component
 *
 * Vertical timeline for audit trails, incident response, and activity history.
 * Supports different event types and status indicators.
 *
 * @param {Array} props.events - Timeline events array
 * @param {boolean} props.compact - Compact layout
 * @param {function} props.onEventClick - Event click callback
 */

import React from 'react';
import StatusIcon from '../atoms/StatusIcon';
import { formatDateRelative } from '../shared/formatters';

const Timeline = ({ events = [], compact = false, onEventClick }) => {
  const getEventIcon = (type) => {
    const iconMap = {
      created: '📝',
      updated: '✏️',
      deleted: '🗑️',
      approved: '✓',
      rejected: '✗',
      routed: '→',
      comment: '💬',
      attachment: '📎',
      evidence: '📁',
      finding: '⚠️',
      remediation: '🔧',
      incident: '🚨',
      scan: '🔍',
      sync: '⟳',
      test: '🧪',
      deploy: '🚀'
    };
    return iconMap[type] || '•';
  };

  const getEventColor = (type) => {
    const colorMap = {
      created: '#3B9EFF',
      updated: '#F5A623',
      deleted: '#EF4545',
      approved: '#0FBB80',
      rejected: '#EF4545',
      routed: '#243044',
      incident: '#EF4545',
      remediation: '#F5A623'
    };
    return colorMap[type] || '#6B7280';
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Timeline line */}
      <div
        style={{
          position: 'absolute',
          left: compact ? 12 : 16,
          top: 0,
          bottom: 0,
          width: 2,
          backgroundColor: '#E5E7EB'
        }}
      />

      {/* Events */}
      {events.map((event, index) => (
        <div
          key={event.id || index}
          onClick={() => onEventClick?.(event)}
          style={{
            display: 'flex',
            gap: 16,
            marginBottom: index < events.length - 1 ? 16 : 0,
            position: 'relative',
            cursor: onEventClick ? 'pointer' : 'default'
          }}
        >
          {/* Event icon */}
          <div
            style={{
              width: compact ? 24 : 32,
              height: compact ? 24 : 32,
              borderRadius: '50%',
              backgroundColor: `${getEventColor(event.type)}15`,
              border: `2px solid ${getEventColor(event.type)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: compact ? 12 : 16,
              flexShrink: 0,
              zIndex: 1,
              position: 'relative',
              left: 0
            }}
          >
            {getEventIcon(event.type)}
          </div>

          {/* Event content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Title and timestamp */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 4,
                gap: 8
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: compact ? 11 : 12,
                    fontWeight: 600,
                    color: '#111827',
                    marginBottom: 2
                  }}
                >
                  {event.title || event.type}
                </div>
                {event.description && !compact && (
                  <div
                    style={{
                      fontSize: 11,
                      color: '#6B7280',
                      lineHeight: 1.4
                    }}
                  >
                    {event.description}
                  </div>
                )}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: '#9CA3AF',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                {formatDateRelative(event.timestamp)}
              </div>
            </div>

            {/* Event details */}
            {event.details && !compact && (
              <div
                style={{
                  padding: 8,
                  backgroundColor: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: 4,
                  fontSize: 10,
                  color: '#6B7280'
                }}
              >
                {typeof event.details === 'string'
                  ? event.details
                  : Object.entries(event.details).map(([key, value]) => (
                      <div key={key} style={{ marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, color: '#374151' }}>
                          {key}:
                        </span>{' '}
                        {value}
                      </div>
                    ))}
              </div>
            )}

            {/* Actor */}
            {event.actor && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 4
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: '#0891B2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    fontWeight: 600,
                    color: '#FFFFFF'
                  }}
                >
                  {event.actor.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: 10, color: '#6B7280' }}>
                  {event.actor}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Empty state */}
      {events.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: 32,
            color: '#9CA3AF',
            fontSize: 11
          }}
        >
          No activity yet
        </div>
      )}
    </div>
  );
};

export default Timeline;
