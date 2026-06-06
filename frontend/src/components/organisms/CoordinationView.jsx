/**
 * CoordinationView Component
 *
 * Displays unified action plans and cross-team coordination
 * Shows mitigation efforts across different functions
 */

import React, { useState } from 'react';
import { Users, CheckCircle, Clock, AlertTriangle, TrendingUp, Calendar, User, Building } from 'lucide-react';

const CoordinationView = ({ actionPlans, briefing, onRefresh }) => {
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');

  const teams = [...new Set((actionPlans || []).map(a => a.team || a.owner).filter(Boolean))];
  const priorities = ['critical', 'high', 'medium', 'low'];
  const statuses = ['open', 'in-progress', 'completed', 'blocked'];

  const filteredActions = (actionPlans || []).filter(action => {
    if (selectedTeam !== 'all' && action.team !== selectedTeam && action.owner !== selectedTeam) return false;
    if (selectedStatus !== 'all' && action.status !== selectedStatus) return false;
    if (selectedPriority !== 'all' && action.priority !== selectedPriority) return false;
    return true;
  });

  const getPriorityColor = (priority) => {
    const colors = {
      'critical': { bg: '#fef2f2', text: '#991b1b', icon: '#dc2626' },
      'high': { bg: '#fee2e2', text: '#dc2626', icon: '#ef4444' },
      'medium': { bg: '#fef3c7', text: '#92400e', icon: '#f59e0b' },
      'low': { bg: '#d1fae5', text: '#065f46', icon: '#22c55e' }
    };
    return colors[priority?.toLowerCase()] || colors['medium'];
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return <CheckCircle size={16} style={{ color: '#22c55e' }} />;
      case 'in-progress': return <Clock size={16} style={{ color: '#3b82f6' }} />;
      case 'blocked': return <AlertTriangle size={16} style={{ color: '#ef4444' }} />;
      default: return <Clock size={16} style={{ color: '#9ca3af' }} />;
    }
  };

  const stats = {
    total: actionPlans?.length || 0,
    completed: actionPlans?.filter(a => a.status === 'completed').length || 0,
    inProgress: actionPlans?.filter(a => a.status === 'in-progress').length || 0,
    blocked: actionPlans?.filter(a => a.status === 'blocked').length || 0,
    open: actionPlans?.filter(a => a.status === 'open').length || 0
  };

  // Group actions by team
  const actionsByTeam = teams.reduce((acc, team) => {
    const teamActions = filteredActions.filter(a => a.team === team || a.owner === team);
    acc[team] = teamActions;
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>Unified Action Plan</h3>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          Cross-functional coordination for security remediation
        </p>
      </div>

      {/* Stats Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
        <div
          style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937' }}>{stats.total}</div>
          <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Total Actions</div>
        </div>

        <div
          style={{
            backgroundColor: '#d1fae5',
            border: '1px solid #34d399',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#065f46' }}>{stats.completed}</div>
          <div style={{ fontSize: '13px', color: '#059669', marginTop: '4px' }}>Completed</div>
        </div>

        <div
          style={{
            backgroundColor: '#dbeafe',
            border: '1px solid #60a5fa',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e40af' }}>{stats.inProgress}</div>
          <div style={{ fontSize: '13px', color: '#2563eb', marginTop: '4px' }}>In Progress</div>
        </div>

        <div
          style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #fbbf24',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#92400e' }}>{stats.blocked}</div>
          <div style={{ fontSize: '13px', color: '#b45309', marginTop: '4px' }}>Blocked</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          style={{
            padding: '10px 16px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: 'white',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Teams</option>
          {teams.map(team => (
            <option key={team} value={team}>{team}</option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          style={{
            padding: '10px 16px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: 'white',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Statuses</option>
          {statuses.map(status => (
            <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
          ))}
        </select>

        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          style={{
            padding: '10px 16px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: 'white',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Priorities</option>
          {priorities.map(priority => (
            <option key={priority} value={priority}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Team-based View */}
      {selectedTeam === 'all' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {teams.map(team => {
            const teamActions = actionsByTeam[team] || [];
            if (teamActions.length === 0) return null;

            const teamCompleted = teamActions.filter(a => a.status === 'completed').length;
            const teamProgress = teamActions.length > 0 ? (teamCompleted / teamActions.length) * 100 : 0;

            return (
              <div
                key={team}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Building size={20} style={{ color: '#3b82f6' }} />
                    <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>{team}</h4>
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    {teamCompleted}/{teamActions.length} completed ({teamProgress.toFixed(0)}%)
                  </div>
                </div>

                <div style={{ backgroundColor: '#e5e7eb', borderRadius: '4px', height: '8px', marginBottom: '16px', overflow: 'hidden' }}>
                  <div
                    style={{
                      backgroundColor: teamProgress === 100 ? '#22c55e' : '#3b82f6',
                      height: '100%',
                      width: `${teamProgress}%`,
                      transition: 'width 0.3s'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {teamActions.slice(0, 5).map((action, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '12px',
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937', marginBottom: '4px' }}>
                          {action.title || action.action || 'Untitled Action'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {action.description || action.mitigation || 'No description'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '700',
                            backgroundColor: getPriorityColor(action.priority).bg,
                            color: getPriorityColor(action.priority).text,
                            textTransform: 'uppercase'
                          }}
                        >
                          {action.priority || 'Medium'}
                        </span>

                        {getStatusIcon(action.status)}
                      </div>
                    </div>
                  ))}

                  {teamActions.length > 5 && (
                    <div style={{ textAlign: 'center', fontSize: '13px', color: '#6b7280', padding: '8px' }}>
                      +{teamActions.length - 5} more actions
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Single Team View */
        <div
          style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Users size={20} style={{ color: '#3b82f6' }} />
            <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>{selectedTeam} Actions</h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredActions.map((action, index) => (
              <div
                key={index}
                style={{
                  padding: '16px',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  display: 'flex',
                  gap: '16px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <h5 style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>
                      {action.title || action.action || 'Untitled Action'}
                    </h5>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '700',
                        backgroundColor: getPriorityColor(action.priority).bg,
                        color: getPriorityColor(action.priority).text,
                        textTransform: 'uppercase'
                      }}
                    >
                      {action.priority || 'Medium'}
                    </span>
                  </div>

                  <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 12px 0', lineHeight: '1.5' }}>
                    {action.description || action.mitigation || 'No description'}
                  </p>

                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#6b7280' }}>
                    {action.assignee && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={14} />
                        {action.assignee}
                      </span>
                    )}
                    {action.target_date && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} />
                        {new Date(action.target_date).toLocaleDateString()}
                      </span>
                    )}
                    {action.effort_hours && (
                      <span>
                        {action.effort_hours}h effort
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {getStatusIcon(action.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredActions.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <Users size={48} style={{ color: '#9ca3af', margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7280', marginBottom: '8px' }}>No action plans found</p>
          <p style={{ fontSize: '13px', color: '#9ca3af' }}>
            Action plans will be generated from security briefings
          </p>
        </div>
      )}

      {/* Coordination Matrix */}
      {briefing?.coordination_points && briefing.coordination_points.length > 0 && (
        <div
          style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
            Cross-Team Coordination Points
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {briefing.coordination_points.map((point, index) => (
              <div
                key={index}
                style={{
                  padding: '12px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#1e40af'
                }}
              >
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                  {point.teams?.join(' + ') || 'Multiple Teams'}
                </div>
                <div style={{ color: '#1e40af' }}>{point.description || point.coordination_needed}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CoordinationView;
