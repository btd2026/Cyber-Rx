import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Shield, CheckCircle, ChevronDown, ChevronRight, Info } from 'lucide-react';

const tierDefinitions = {
  tier_1: {
    label: "Crown Jewel",
    description: "Business-critical. Outage halts revenue. Immediate executive attention.",
    criteria: {
      downtime_cost: "≥ $5M/day OR",
      regulatory_impact: "HIPAA required OR",
      business_impact: "Stops claims/payment processing"
    },
    examples: [
      "Claims Adjudication System",
      "EDI Gateway / X12 Translator"
    ],
    sla_requirement: "99.99% uptime (≤ 52 minutes/year downtime)",
    disaster_recovery: "Active-active with < 15 minute RTO"
  },
  tier_2: {
    label: "Critical",
    description: "High impact but business can operate temporarily. Executive attention required.",
    criteria: {
      downtime_cost: "$1M - $5M/day OR",
      regulatory_impact: "Important for compliance OR",
      business_impact: "Significant operational disruption"
    },
    examples: [
      "Payment Processing",
      "Provider Data Management",
      "Pharmacy Benefit Management"
    ],
    sla_requirement: "99.9% uptime (≤ 8.7 hours/year downtime)",
    disaster_recovery: "Active-passive with < 4 hour RTO"
  },
  tier_3: {
    label: "Important",
    description: "Moderate impact. Workarounds available. Manager-level attention.",
    criteria: {
      downtime_cost: "$100K - $1M/day",
      business_impact: "Operational inconvenience"
    },
    examples: [
      "Care Management",
      "Analytics & Reporting",
      "Member Services"
    ],
    sla_requirement: "99% uptime (≤ 3.6 days/year downtime)",
    disaster_recovery: "Backups with < 24 hour RTO"
  },
  tier_4: {
    label: "Support",
    description: "Low impact. No immediate revenue impact. Normal operations.",
    criteria: {
      downtime_cost: "< $100K/day",
      business_impact: "Minimal disruption"
    },
    examples: [
      "Internal Tools",
      "Archive Systems",
      "Development Environments"
    ],
    sla_requirement: "95% uptime (≤ 18 days/year downtime)",
    disaster_recovery: "Backups with < 72 hour RTO"
  }
};

const CrownJewelView = ({ matchId }) => {
  const [selectedTier, setSelectedTier] = useState('all');
  const [expandedCards, setExpandedCards] = useState(new Set());

  const { data: tierData, isLoading, error } = useQuery({
    queryKey: ['crown-jewels', matchId],
    queryFn: () => fetch(`/api/mappings/${matchId}/tier-analysis`).then(r => r.json()),
    enabled: !!matchId
  });

  const toggleCard = (systemId) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(systemId)) {
        next.delete(systemId);
      } else {
        next.add(systemId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="crown-jewel-view">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading tier analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="crown-jewel-view">
        <div className="error-state">
          <AlertTriangle className="icon" />
          <p>Error loading tier analysis: {error.message}</p>
        </div>
      </div>
    );
  }

  const filteredSystems = tierData?.systems?.filter(s =>
    selectedTier === 'all' || s.tier === selectedTier
  ) || [];

  return (
    <div className="crown-jewel-view">
      <header className="view-header">
        <div className="header-content">
          <div className="header-top">
            <h1>Crown Jewel Analysis</h1>
            <div className="header-badge">
              <AlertTriangle className="icon" />
              {tierData?.tier_counts?.tier_1 || 0} Crown Jewels Identified
            </div>
          </div>
          <p className="subtitle">
            Tier 1 systems are business-critical. Outage halts revenue.
            Tier classification based on downtime cost, regulatory impact, and business criticality.
          </p>
        </div>
      </header>

      {/* Tier Filters */}
      <div className="tier-filters">
        <button
          className={`filter-button ${selectedTier === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedTier('all')}
        >
          All Systems ({tierData?.total_count || 0})
        </button>
        <button
          className={`filter-button tier-1 ${selectedTier === 'tier_1' ? 'active' : ''}`}
          onClick={() => setSelectedTier('tier_1')}
        >
          <AlertTriangle className="icon" />
          Crown Jewels ({tierData?.tier_counts?.tier_1 || 0})
        </button>
        <button
          className={`filter-button tier-2 ${selectedTier === 'tier_2' ? 'active' : ''}`}
          onClick={() => setSelectedTier('tier_2')}
        >
          <Shield className="icon" />
          Critical ({tierData?.tier_counts?.tier_2 || 0})
        </button>
        <button
          className={`filter-button tier-3 ${selectedTier === 'tier_3' ? 'active' : ''}`}
          onClick={() => setSelectedTier('tier_3')}
        >
          <CheckCircle className="icon" />
          Important ({tierData?.tier_counts?.tier_3 || 0})
        </button>
        <button
          className={`filter-button tier-4 ${selectedTier === 'tier_4' ? 'active' : ''}`}
          onClick={() => setSelectedTier('tier_4')}
        >
          Support ({tierData?.tier_counts?.tier_4 || 0})
        </button>
      </div>

      {/* Systems Grid */}
      {filteredSystems.length === 0 ? (
        <div className="empty-state">
          <Info className="icon" />
          <p>No systems found for the selected tier.</p>
        </div>
      ) : (
        <div className="systems-grid">
          {filteredSystems.map(system => (
            <SystemCard
              key={system.id}
              system={system}
              isExpanded={expandedCards.has(system.id)}
              onToggle={() => toggleCard(system.id)}
            />
          ))}
        </div>
      )}

      {/* Tier Summary Stats */}
      <div className="tier-summary">
        <h2>Tier Distribution</h2>
        <div className="stats-grid">
          {Object.entries(tierData?.tier_counts || {}).map(([tier, count]) => {
            const definition = tierDefinitions[tier];
            if (!definition || count === 0) return null;

            return (
              <div key={tier} className={`stat-card ${tier}`}>
                <div className="stat-header">
                  <span className="count">{count}</span>
                  <span className="label">{definition.label}</span>
                </div>
                <div className="stat-details">
                  <p className="description">{definition.description}</p>
                  {tier === 'tier_1' && (
                    <div className="crown-jewel-badge">
                      <AlertTriangle className="icon" />
                      <span>Executive Attention Required</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tier Reference Guide */}
      <div className="tier-reference">
        <h2>Tier Reference Guide</h2>
        <div className="reference-grid">
          {Object.entries(tierDefinitions).map(([tier, definition]) => (
            <div key={tier} className={`reference-card ${tier}`}>
              <div className="reference-header">
                <h3>{definition.label}</h3>
                <div className="tier-badge">{tier.replace('_', ' ').toUpperCase()}</div>
              </div>
              <p className="description">{definition.description}</p>
              <div className="criteria">
                <h4>Criteria:</h4>
                <ul>
                  {Object.entries(definition.criteria).map(([key, value]) => (
                    <li key={key}>
                      <strong>{key.replace(/_/g, ' ')}:</strong> {value}
                    </li>
                  ))}
                )}
              </ul>
              <div className="examples">
                <h4>Examples:</h4>
                <ul>
                  {definition.examples.map((example, idx) => (
                    <li key={idx}>{example}</li>
                  ))}
                </ul>
              </div>
              <div className="requirements">
                <div className="requirement">
                  <strong>SLA:</strong> {definition.sla_requirement}
                </div>
                <div className="requirement">
                  <strong>DR:</strong> {definition.disaster_recovery}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SystemCard = ({ system, isExpanded, onToggle }) => {
  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  const getTierColor = (tier) => {
    switch(tier) {
      case 'tier_1': return 'red';
      case 'tier_2': return 'orange';
      case 'tier_3': return 'yellow';
      case 'tier_4': return 'green';
      default: return 'gray';
    }
  };

  return (
    <div className={`system-card tier-${system.tier}`}>
      <div className="card-header" onClick={onToggle}>
        <div className="card-header-left">
          <div
            className="tier-badge"
            style={{
              backgroundColor: `var(--tier-${getTierColor(system.tier)}-color, #${getTierColor(system.tier) === 'red' ? 'ef4444' : getTierColor(system.tier) === 'orange' ? 'f97316' : getTierColor(system.tier) === 'yellow' ? 'eab308' : '22c55e'})`
            }}
          >
            {system.tier_label}
          </div>
          <h3>{system.name}</h3>
        </div>
        <span className="expand-icon">
          {isExpanded ? <ChevronDown /> : <ChevronRight />}
        </span>
      </div>

      {isExpanded && (
        <div className="card-details">
          <div className="detail-row">
            <span className="label">Downtime Cost:</span>
            <span className="value cost">{formatCurrency(system.downtime_cost)}/day</span>
          </div>
          <div className="detail-row">
            <span className="label">Tier Score:</span>
            <div className="score-container">
              <div className="score-bar">
                <div
                  className="score-fill"
                  style={{ width: `${system.tier_score * 100}%` }}
                />
              </div>
              <span className="score-value">{(system.tier_score * 100).toFixed(0)}%</span>
            </div>
          </div>
          {system.applications && system.applications.length > 0 && (
            <div className="detail-row">
              <span className="label">Applications:</span>
              <div className="applications">
                {system.applications.map(app => (
                  <span key={app.id} className="app-tag">
                    {app.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="detail-row full-width">
            <span className="label">Tier Rationale:</span>
            <p className="rationale">{system.tier_rationale}</p>
          </div>
          <div className="card-actions">
            <button className="action-button primary" onClick={() => window.location.href = `/process/${system.id}`}>
              View Full Details →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrownJewelView;
