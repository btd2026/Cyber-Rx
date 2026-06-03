import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import './ReviewMappings.module.css';

/**
 * ReviewMappings - Human-in-the-Loop Review UI for Proposed Mappings
 *
 * This component provides a comprehensive review interface for AI-proposed mappings
 * between customer processes and the reference model. It enables:
 * - Bulk acceptance of high-confidence proposals
 * - Individual review and decision on each proposal
 * - Confidence-based filtering to prioritize review effort
 * - Manual override/edit of proposed mappings
 *
 * This is the CORE DIFFERENTIATOR - AI proposes, human confirms.
 */

const ReviewMappings = ({ matchId, goBack }) => {
  const queryClient = useQueryClient();
  const [selectedProposals, setSelectedProposals] = useState(new Set());
  const [confidenceFilter, setConfidenceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [editingProposal, setEditingProposal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch match proposals
  const { data: matchData, isLoading, error } = useQuery({
    queryKey: ['match-proposals', matchId],
    queryFn: async () => {
      const response = await fetch(`/api/match/${matchId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch match proposals: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!matchId,
    refetchInterval: 30000 // Refetch every 30s for status updates
  });

  // Accept mutation
  const acceptMutation = useMutation({
    mutationFn: async (proposalIds) => {
      const response = await fetch('/api/mappings/accept', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          match_id: matchId,
          proposal_ids: proposalIds
        })
      });
      if (!response.ok) {
        throw new Error(`Failed to accept proposals: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['match-proposals', matchId]);
      setSelectedProposals(new Set());
    }
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (proposalIds) => {
      const response = await fetch('/api/mappings/reject', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          match_id: matchId,
          proposal_ids: proposalIds
        })
      });
      if (!response.ok) {
        throw new Error(`Failed to reject proposals: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['match-proposals', matchId]);
      setSelectedProposals(new Set());
    }
  });

  // Edit mutation (manual override)
  const editMutation = useMutation({
    mutationFn: async ({ proposalId, customMapping }) => {
      const response = await fetch(`/api/mappings/${proposalId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(customMapping)
      });
      if (!response.ok) {
        throw new Error(`Failed to update proposal: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['match-proposals', matchId]);
      setEditingProposal(null);
    }
  });

  // Flatten proposals from all rows into a single list
  const allProposals = React.useMemo(() => {
    if (!matchData?.proposals) return [];

    const flattened = [];
    matchData.proposals.forEach(row => {
      if (row.proposed_mappings && row.proposed_mappings.length > 0) {
        row.proposed_mappings.forEach(mapping => {
          flattened.push({
            id: `${row.row_id}-${mapping.reference_id}`, // Composite ID
            row_id: row.row_id,
            customer_data: row.customer_data,
            ...mapping
          });
        });
      }
    });
    return flattened;
  }, [matchData]);

  // Filter proposals based on filters and search
  const filteredProposals = React.useMemo(() => {
    return allProposals.filter(proposal => {
      // Confidence filter
      if (confidenceFilter === 'high' && proposal.confidence < 0.90) return false;
      if (confidenceFilter === 'medium' && (proposal.confidence < 0.70 || proposal.confidence >= 0.90)) return false;
      if (confidenceFilter === 'low' && proposal.confidence >= 0.70) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchText = `${proposal.customer_data?.process_name || ''} ${proposal.reference_name || ''} ${proposal.customer_data?.application_name || ''}`.toLowerCase();
        if (!matchText.includes(query)) return false;
      }

      return true;
    });
  }, [allProposals, confidenceFilter, searchQuery]);

  // Get counts
  const stats = React.useMemo(() => {
    const highConf = filteredProposals.filter(p => p.confidence > 0.90).length;
    const mediumConf = filteredProposals.filter(p => p.confidence >= 0.70 && p.confidence <= 0.90).length;
    const lowConf = filteredProposals.filter(p => p.confidence < 0.70).length;
    const pending = filteredProposals.length; // All are pending initially
    const accepted = 0; // Will be updated from API
    const rejected = 0; // Will be updated from API

    return { highConf, mediumConf, lowConf, pending, accepted, rejected };
  }, [filteredProposals]);

  // Bulk accept high-confidence proposals
  const bulkAcceptHighConfidence = () => {
    const highConfidenceIds = filteredProposals
      .filter(p => p.confidence > 0.90)
      .map(p => p.id);
    if (highConfidenceIds.length > 0) {
      acceptMutation.mutate(highConfidenceIds);
    }
  };

  // Toggle selection
  const toggleSelection = (proposalId) => {
    const newSelection = new Set(selectedProposals);
    if (newSelection.has(proposalId)) {
      newSelection.delete(proposalId);
    } else {
      newSelection.add(proposalId);
    }
    setSelectedProposals(newSelection);
  };

  // Toggle all visible
  const toggleAll = () => {
    if (selectedProposals.size === filteredProposals.length) {
      setSelectedProposals(new Set());
    } else {
      setSelectedProposals(new Set(filteredProposals.map(p => p.id)));
    }
  };

  // Get row class based on confidence
  const getRowClass = (proposal) => {
    if (proposal.confidence >= 0.90) return 'high-confidence';
    if (proposal.confidence >= 0.70) return 'medium-confidence';
    return 'low-confidence';
  };

  // Handle edit
  const handleEdit = (proposal) => {
    setEditingProposal(proposal);
  };

  // Handle edit save
  const handleEditSave = (customMapping) => {
    editMutation.mutate({
      proposalId: editingProposal.id,
      customMapping
    });
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading match proposals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error Loading Proposals</h2>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
        {goBack && <button onClick={goBack}>Go Back</button>}
      </div>
    );
  }

  return (
    <div className="review-mappings-container">
      {/* Header */}
      <header className="review-header">
        <div className="header-left">
          <button className="back-button" onClick={goBack}>← Back</button>
          <div>
            <h1>Review Proposed Mappings</h1>
            <p className="subtitle">
              Match ID: <code>{matchId}</code> •
              {matchData?.summary && (
                <span>
                  {' '}{matchData.summary.matched || 0} matched • {matchData.summary.unmatched || 0} unmatched
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="btn-secondary"
            onClick={bulkAcceptHighConfidence}
            disabled={stats.highConf === 0 || acceptMutation.isLoading}
          >
            Accept High Confidence ({stats.highConf})
          </button>
          <button
            className="btn-primary"
            onClick={() => acceptMutation.mutate(Array.from(selectedProposals))}
            disabled={selectedProposals.size === 0 || acceptMutation.isLoading}
          >
            Accept Selected ({selectedProposals.size})
          </button>
          <button
            className="btn-danger"
            onClick={() => rejectMutation.mutate(Array.from(selectedProposals))}
            disabled={selectedProposals.size === 0 || rejectMutation.isLoading}
          >
            Reject Selected ({selectedProposals.size})
          </button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-label">Total:</span>
          <span className="stat-value">{filteredProposals.length}</span>
        </div>
        <div className="stat-item high">
          <span className="stat-label">High (>90%):</span>
          <span className="stat-value">{stats.highConf}</span>
        </div>
        <div className="stat-item medium">
          <span className="stat-label">Medium (70-90%):</span>
          <span className="stat-value">{stats.mediumConf}</span>
        </div>
        <div className="stat-item low">
          <span className="stat-label">Low (<70%):</span>
          <span className="stat-value">{stats.lowConf}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Pending:</span>
          <span className="stat-value">{stats.pending}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <label>Confidence:</label>
          <select
            value={confidenceFilter}
            onChange={(e) => setConfidenceFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="high">High (&gt;90%)</option>
            <option value="medium">Medium (70-90%)</option>
            <option value="low">Low (&lt;70%)</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Search:</label>
          <input
            type="text"
            placeholder="Search by process, app, or reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Proposals Table */}
      <div className="proposals-table-container">
        <table className="proposals-table">
          <thead>
            <tr>
              <th className="checkbox-column">
                <input
                  type="checkbox"
                  checked={selectedProposals.size === filteredProposals.length && filteredProposals.length > 0}
                  onChange={toggleAll}
                />
              </th>
              <th>Customer Process</th>
              <th>Application</th>
              <th>Proposed Match</th>
              <th>Confidence</th>
              <th>Method</th>
              <th>Rationale</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProposals.length === 0 ? (
              <tr>
                <td colSpan="8" className="no-data">
                  No proposals match the current filters.
                </td>
              </tr>
            ) : (
              filteredProposals.map(proposal => (
                <tr key={proposal.id} className={getRowClass(proposal)}>
                  <td className="checkbox-column">
                    <input
                      type="checkbox"
                      checked={selectedProposals.has(proposal.id)}
                      onChange={() => toggleSelection(proposal.id)}
                    />
                  </td>
                  <td className="customer-process">
                    <div className="primary-text">{proposal.customer_data?.process_name || 'Unknown'}</div>
                    {proposal.customer_data?.owner && (
                      <div className="secondary-text">Owner: {proposal.customer_data.owner}</div>
                    )}
                  </td>
                  <td className="customer-app">
                    {proposal.customer_data?.application_name || '-'}
                  </td>
                  <td className="proposed-match">
                    <div className="match-badge">
                      <span className="entity-type">{proposal.entity_type}</span>
                      <span className="reference-name">{proposal.reference_name}</span>
                    </div>
                    <div className="reference-id">{proposal.reference_id}</div>
                  </td>
                  <td className="confidence-column">
                    <ConfidenceBadge confidence={proposal.confidence} />
                  </td>
                  <td className="method-column">
                    {getMethodBadge(proposal.method)}
                  </td>
                  <td className="rationale-column">
                    {truncateText(proposal.rationale, 100)}
                  </td>
                  <td className="actions-column">
                    <button
                      className="btn-accept"
                      onClick={() => acceptMutation.mutate([proposal.id])}
                      disabled={acceptMutation.isLoading}
                      title="Accept this proposal"
                    >
                      ✓
                    </button>
                    <button
                      className="btn-reject"
                      onClick={() => rejectMutation.mutate([proposal.id])}
                      disabled={rejectMutation.isLoading}
                      title="Reject this proposal"
                    >
                      ✗
                    </button>
                    <button
                      className="btn-edit"
                      onClick={() => handleEdit(proposal)}
                      title="Edit or override this proposal"
                    >
                      ✎
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingProposal && (
        <EditProposalModal
          proposal={editingProposal}
          onSave={handleEditSave}
          onCancel={() => setEditingProposal(null)}
          isLoading={editMutation.isLoading}
        />
      )}
    </div>
  );
};

// Confidence Badge Component
const ConfidenceBadge = ({ confidence }) => {
  const percentage = (confidence * 100).toFixed(0);

  if (confidence >= 0.90) {
    return <span className={`confidence-badge high`}>{percentage}%</span>;
  }
  if (confidence >= 0.70) {
    return <span className={`confidence-badge medium`}>{percentage}%</span>;
  }
  return <span className={`confidence-badge low`}>{percentage}%</span>;
};

// Method Badge Component
const getMethodBadge = (method) => {
  const badges = {
    'llm_assisted': { label: 'LLM', className: 'llm' },
    'vendor_match': { label: 'Vendor', className: 'vendor' },
    'exact_match': { label: 'Exact', className: 'exact' },
    'semantic': { label: 'Semantic', className: 'semantic' },
    'fuzzy': { label: 'Fuzzy', className: 'fuzzy' }
  };

  const badge = badges[method] || { label: method, className: 'default' };
  return <span className={`method-badge ${badge.className}`}>{badge.label}</span>;
};

// Edit Proposal Modal Component
const EditProposalModal = ({ proposal, onSave, onCancel, isLoading }) => {
  const [customReferenceId, setCustomReferenceId] = useState(proposal.reference_id || '');
  const [customReferenceName, setCustomReferenceName] = useState(proposal.reference_name || '');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    onSave({
      reference_id: customReferenceId,
      reference_name: customReferenceName,
      notes: notes || 'User manually selected different match'
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Edit Mapping Proposal</h2>

        <div className="proposal-details">
          <div className="detail-row">
            <strong>Customer Process:</strong> {proposal.customer_data?.process_name}
          </div>
          <div className="detail-row">
            <strong>Application:</strong> {proposal.customer_data?.application_name || '-'}
          </div>
          <div className="detail-row">
            <strong>AI-Proposed Match:</strong> {proposal.reference_name} ({proposal.confidence * 100}%)
          </div>
        </div>

        <div className="form-fields">
          <div className="form-field">
            <label>Custom Reference ID:</label>
            <input
              type="text"
              value={customReferenceId}
              onChange={(e) => setCustomReferenceId(e.target.value)}
              placeholder="Enter custom reference ID"
            />
          </div>
          <div className="form-field">
            <label>Custom Reference Name:</label>
            <input
              type="text"
              value={customReferenceName}
              onChange={(e) => setCustomReferenceName(e.target.value)}
              placeholder="Enter custom reference name"
            />
          </div>
          <div className="form-field">
            <label>Notes:</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Explain why you're overriding the AI proposal..."
              rows="3"
            />
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onCancel} disabled={isLoading}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || !customReferenceId || !customReferenceName}
            className="btn-primary"
          >
            {isLoading ? 'Saving...' : 'Save Override'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Utility function
const truncateText = (text, maxLength) => {
  if (!text) return '-';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export default ReviewMappings;
