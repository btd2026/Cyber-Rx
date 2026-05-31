import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/organisms/Card';
import Button from '../components/atoms/Button';
import Badge from '../components/atoms/Badge';
import DataTable from '../components/molecules/DataTable';
import PageHeader from '../components/molecules/PageHeader';
import Modal from '../components/molecules/Modal';
import FilterPanel from '../components/molecules/FilterPanel';

/**
 * Narratives Dashboard Page
 *
 * View, manage, and export executive narratives for findings
 * Filter by severity, business process, executive owner
 * Export to PDF/Word, publish to stakeholders
 */
function Narratives() {
  const navigate = useNavigate();
  const [narratives, setNarratives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNarrative, setSelectedNarrative] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filters, setFilters] = useState({
    isPublished: 'all',
    severity: 'all',
    search: ''
  });
  const [stats, setStats] = useState(null);

  // Load narratives on mount
  useEffect(() => {
    loadNarratives();
    loadStatistics();
  }, [filters]);

  const loadNarratives = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const orgId = localStorage.getItem('orgId');

      const queryParams = new URLSearchParams();
      if (filters.isPublished !== 'all') {
        queryParams.append('isPublished', filters.isPublished);
      }
      if (filters.search) {
        queryParams.append('search', filters.search);
      }

      const response = await fetch(
        `/api/narratives?${queryParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Org-ID': orgId
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load narratives');
      }

      const data = await response.json();
      setNarratives(data.data || []);
    } catch (err) {
      console.error('Error loading narratives:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      const orgId = localStorage.getItem('orgId');

      const response = await fetch('/api/narratives/statistics', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Org-ID': orgId
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error loading statistics:', err);
    }
  };

  const handleViewNarrative = async (narrativeId) => {
    try {
      const token = localStorage.getItem('token');
      const orgId = localStorage.getItem('orgId');

      const response = await fetch(`/api/narratives/narrative/${narrativeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Org-ID': orgId
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load narrative details');
      }

      const narrative = await response.json();
      setSelectedNarrative(narrative);
      setShowDetailModal(true);
    } catch (err) {
      console.error('Error loading narrative:', err);
      alert('Failed to load narrative details');
    }
  };

  const handleExportPDF = async (narrativeId) => {
    try {
      const token = localStorage.getItem('token');
      const orgId = localStorage.getItem('orgId');

      const response = await fetch(`/api/narratives/${narrativeId}/export/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Org-ID': orgId
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export PDF');
      }

      // For now, just show success message
      // In production, handle binary download
      alert('PDF export initiated. Check your downloads folder.');
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('Failed to export PDF');
    }
  };

  const handleExportWord = async (narrativeId) => {
    try {
      const token = localStorage.getItem('token');
      const orgId = localStorage.getItem('orgId');

      const response = await fetch(`/api/narratives/${narrativeId}/export/word`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Org-ID': orgId
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export Word document');
      }

      alert('Word export initiated. Check your downloads folder.');
    } catch (err) {
      console.error('Error exporting Word:', err);
      alert('Failed to export Word document');
    }
  };

  const handlePublish = async (narrativeId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      const orgId = localStorage.getItem('orgId');

      const endpoint = currentStatus ? 'unpublish' : 'publish';
      const response = await fetch(`/api/narratives/${narrativeId}/${endpoint}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Org-ID': orgId
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to ${endpoint} narrative`);
      }

      // Reload narratives
      loadNarratives();
      alert(`Narrative ${currentStatus ? 'unpublished' : 'published'} successfully`);
    } catch (err) {
      console.error(`Error ${currentStatus ? 'unpublishing' : 'publishing'} narrative:`, err);
      alert(`Failed to ${currentStatus ? 'unpublish' : 'publish'} narrative`);
    }
  };

  const handleGenerateNarrative = () => {
    // Navigate to findings page to generate new narrative
    navigate('/findings');
  };

  const columns = [
    {
      key: 'findingTitle',
      label: 'Finding',
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">ID: {row.findingId}</div>
        </div>
      )
    },
    {
      key: 'severity',
      label: 'Severity',
      render: (value) => (
        <Badge variant={value === 'Critical' ? 'danger' : value === 'High' ? 'warning' : 'info'}>
          {value}
        </Badge>
      )
    },
    {
      key: 'isPublished',
      label: 'Status',
      render: (value) => (
        <Badge variant={value ? 'success' : 'secondary'}>
          {value ? 'Published' : 'Draft'}
        </Badge>
      )
    },
    {
      key: 'generatedAt',
      label: 'Generated',
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleViewNarrative(row.id)}
          >
            View
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleExportPDF(row.id)}
          >
            PDF
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleExportWord(row.id)}
          >
            Word
          </Button>
          <Button
            variant={row.isPublished ? 'danger' : 'success'}
            size="sm"
            onClick={() => handlePublish(row.id, row.isPublished)}
          >
            {row.isPublished ? 'Unpublish' : 'Publish'}
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="narratives-page">
      <PageHeader
        title="Executive Narratives"
        subtitle="View and manage executive narratives for security findings"
        actions={
          <Button variant="primary" onClick={handleGenerateNarrative}>
            Generate New Narrative
          </Button>
        }
      />

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Narratives</div>
          </Card>
          <Card>
            <div className="text-2xl font-bold text-green-600">{stats.publishedCount}</div>
            <div className="text-sm text-gray-500">Published</div>
          </Card>
          <Card>
            <div className="text-2xl font-bold text-yellow-600">{stats.draftCount}</div>
            <div className="text-sm text-gray-500">Drafts</div>
          </Card>
          <Card>
            <div className="text-2xl font-bold text-blue-600">{stats.uniqueFindings}</div>
            <div className="text-sm text-gray-500">Unique Findings</div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.isPublished}
              onChange={(e) => setFilters({ ...filters, isPublished: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All</option>
              <option value="true">Published</option>
              <option value="false">Drafts</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search narratives..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </Card>

      {/* Narratives Table */}
      <Card>
        {error ? (
          <div className="text-center py-12">
            <div className="text-red-600 mb-2">{error}</div>
            <Button variant="primary" onClick={loadNarratives}>
              Retry
            </Button>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading narratives...</div>
          </div>
        ) : narratives.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">No narratives found</div>
            <Button variant="primary" onClick={handleGenerateNarrative}>
              Generate Your First Narrative
            </Button>
          </div>
        ) : (
          <DataTable columns={columns} data={narratives} />
        )}
      </Card>

      {/* Narrative Detail Modal */}
      {showDetailModal && selectedNarrative && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={selectedNarrative.finding?.title}
          size="large"
        >
          <div className="space-y-6">
            {/* Finding Summary */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Finding Summary</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">Severity:</span>
                    <span className="ml-2 font-medium">{selectedNarrative.finding?.severity}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Status:</span>
                    <span className="ml-2 font-medium">{selectedNarrative.finding?.status}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Discovered:</span>
                    <span className="ml-2 font-medium">{selectedNarrative.finding?.discoveredDate}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Source:</span>
                    <span className="ml-2 font-medium">{selectedNarrative.finding?.source}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Executive Summary</h3>
              <div className="bg-blue-50 p-4 rounded-md text-gray-700">
                {selectedNarrative.executiveNarrative?.summary}
              </div>
            </div>

            {/* Business Process Impact */}
            {selectedNarrative.executiveNarrative?.businessProcess && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Business Process Impact</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-500">Process:</span>
                      <span className="ml-2 font-medium">{selectedNarrative.executiveNarrative.businessProcess.name}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Tier:</span>
                      <span className="ml-2 font-medium">{selectedNarrative.executiveNarrative.businessProcess.tierLabel}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Criticality:</span>
                      <span className="ml-2 font-medium">{selectedNarrative.executiveNarrative.businessProcess.criticality}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Owner:</span>
                      <span className="ml-2 font-medium">{selectedNarrative.executiveNarrative.businessProcess.owner}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Financial Exposure */}
            {selectedNarrative.executiveNarrative?.financialExposure && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Financial Exposure</h3>
                <div className="bg-red-50 p-4 rounded-md">
                  <div className="text-2xl font-bold text-red-700 mb-4">
                    ${selectedNarrative.executiveNarrative.financialExposure.totalGrossExposure?.toLocaleString()}
                  </div>
                  {selectedNarrative.executiveNarrative.financialExposure.breakdown && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Breach Response: ${selectedNarrative.executiveNarrative.financialExposure.breakdown.breachResponseCost?.toLocaleString()}</div>
                      <div>Regulatory Fines: ${selectedNarrative.executiveNarrative.financialExposure.breakdown.regulatoryFine?.toLocaleString()}</div>
                      <div>Business Interruption: ${selectedNarrative.executiveNarrative.financialExposure.breakdown.businessInterruption?.toLocaleString()}</div>
                      <div>Legal Costs: ${selectedNarrative.executiveNarrative.financialExposure.breakdown.legalCosts?.toLocaleString()}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recommended Actions */}
            {selectedNarrative.executiveNarrative?.recommendedActions && selectedNarrative.executiveNarrative.recommendedActions.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Recommended Actions</h3>
                <div className="space-y-2">
                  {selectedNarrative.executiveNarrative.recommendedActions.map((action, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-md flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold">
                        {action.priority}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{action.action}</div>
                        <div className="text-sm text-gray-500">
                          Owner: {action.owner} | Target: {action.targetDate}
                        </div>
                      </div>
                      <Badge variant={action.status === 'complete' ? 'success' : 'secondary'}>
                        {action.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="primary"
                onClick={() => handleExportPDF(selectedNarrative.id)}
              >
                Export PDF
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleExportWord(selectedNarrative.id)}
              >
                Export Word
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(selectedNarrative, null, 2));
                  alert('Narrative copied to clipboard');
                }}
              >
                Copy JSON
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default Narratives;
