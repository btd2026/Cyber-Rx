/**
 * BlastRadiusDiagram Component
 *
 * Displays blast radius analysis showing dependency trees
 * and impact cascades for compromised assets
 */

import React, { useState, useEffect, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { Radio, AlertOctagon, ZoomIn, ZoomOut, RefreshCw, Download, Search } from 'lucide-react';

const BlastRadiusDiagram = ({ blastRadius, briefing, apiEndpoint, token, orgId }) => {
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [blastData, setBlastData] = useState(blastRadius);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const cyRef = useRef(null);

  useEffect(() => {
    if (blastRadius) {
      setBlastData(blastRadius);
    }
  }, [blastRadius]);

  const calculateBlastRadius = async (assetId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${apiEndpoint}/blast-radius/${assetId}?org_id=${orgId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Org-Id': orgId
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setBlastData(data);
      setSelectedAsset(assetId);
      setLoading(false);
    } catch (err) {
      console.error('Error calculating blast radius:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm) return;
    await calculateBlastRadius(searchTerm);
  };

  const handleExport = () => {
    if (!cyRef.current) return;

    const png = cyRef.current.png({ full: true, scale: 2 });
    const link = document.createElement('a');
    link.href = png;
    link.download = `blast-radius-${selectedAsset || 'overview'}.png`;
    link.click();
  };

  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.2);
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.8);
    }
  };

  const handleReset = () => {
    if (cyRef.current) {
      cyRef.current.fit();
    }
  };

  // Convert blast radius data to Cytoscape format
  const graphData = {
    nodes: [],
    edges: []
  };

  if (blastData?.dependencies) {
    // Root node (compromised asset)
    graphData.nodes.push({
      data: {
        id: 'root',
        label: blastData.root_asset?.name || 'Compromised Asset',
        type: 'compromised',
        impactLevel: 'critical',
        blastRadius: blastData.total_impacted_assets || 0
      }
    });

    // Dependency tree
    blastData.dependencies.forEach((dep, index) => {
      const nodeId = `dep-${index}`;

      graphData.nodes.push({
        data: {
          id: nodeId,
          label: dep.name || dep.asset_name || 'Unknown',
          type: dep.type || 'dependency',
          impactLevel: dep.impact_level || 'medium',
          distance: dep.distance || 1
        }
      });

      graphData.edges.push({
        data: {
          id: `edge-${index}`,
          source: 'root',
          target: nodeId,
          dependencyType: dep.dependency_type || 'uses'
        }
      });

      // Add nested dependencies
      if (dep.dependencies) {
        dep.dependencies.forEach((nested, nestedIndex) => {
          const nestedId = `nested-${index}-${nestedIndex}`;

          graphData.nodes.push({
            data: {
              id: nestedId,
              label: nested.name || 'Unknown',
              type: 'nested',
              impactLevel: nested.impact_level || 'low',
              distance: (dep.distance || 1) + 1
            }
          });

          graphData.edges.push({
            data: {
              id: `nested-edge-${index}-${nestedIndex}`,
              source: nodeId,
              target: nestedId,
              dependencyType: nested.dependency_type || 'uses'
            }
          });
        });
      }
    });
  }

  // Cytoscape layout
  const layout = {
    name: 'concentric',
    concentric: (node) => {
      const dist = node.data('distance') || 0;
      return -dist; // Root at center
    },
    minNodeSpacing: 80,
    padding: 50,
    animate: true
  };

  // Stylesheet for blast radius visualization
  const stylesheet = [
    {
      selector: 'node',
      style: {
        'background-color': '#e5e7eb',
        'label': 'data(label)',
        'width': 50,
        'height': 50,
        'font-size': '11px',
        'font-weight': '600',
        'text-valign': 'center',
        'text-halign': 'center',
        'border-width': 2,
        'border-color': '#9ca3af',
        'color': '#1f2937'
      }
    },
    {
      selector: 'node[type = "compromised"]',
      style: {
        'background-color': '#fecaca',
        'border-color': '#ef4444',
        'border-width': 4,
        'width': 70,
        'height': 70,
        'font-size': '13px'
      }
    },
    {
      selector: 'node[impactLevel = "critical"]',
      style: {
        'background-color': '#fee2e2',
        'border-color': '#ef4444',
        'border-width': 3
      }
    },
    {
      selector: 'node[impactLevel = "high"]',
      style: {
        'background-color': '#fef3c7',
        'border-color': '#f59e0b',
        'border-width': 3
      }
    },
    {
      selector: 'node[impactLevel = "medium"]',
      style: {
        'background-color': '#fef9c3',
        'border-color': '#eab308'
      }
    },
    {
      selector: 'node[type = "nested"]',
      style: {
        'width': 40,
        'height': 40,
        'font-size': '10px',
        'opacity': 0.7
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#9ca3af',
        'target-arrow-color': '#9ca3af',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'arrow-scale': 1.2
      }
    },
    {
      selector: 'edge[dependencyType = "critical"]',
      style: {
        'line-color': '#ef4444',
        'target-arrow-color': '#ef4444',
        'width': 3
      }
    },
    {
      selector: 'edge[dependencyType = "data-flow"]',
      style: {
        'line-color': '#8b5cf6',
        'target-arrow-color': '#8b5cf6',
        'width': 2,
        'line-style': 'dashed'
      }
    }
  ];

  const impactedCount = blastData?.total_impacted_assets || 0;
  const criticalCount = blastData?.critical_impacts || 0;
  const financialImpact = blastData?.total_financial_impact || 0;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#6b7280' }}>Calculating blast radius...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: '#ef4444', marginBottom: '16px' }}>Error calculating blast radius</p>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Blast Radius Analysis</h3>
          <p style={{ fontSize: '13px', color: '#6b7280' }}>
            {selectedAsset ? `Impact analysis for: ${selectedAsset}` : 'Overview of dependency cascades'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            style={{
              padding: '8px',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            style={{
              padding: '8px',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ZoomOut size={16} />
          </button>
          <button
            onClick={handleReset}
            title="Reset View"
            style={{
              padding: '8px',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleExport}
            title="Export PNG"
            style={{
              padding: '8px',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          placeholder="Enter asset ID or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          style={{
            flex: 1,
            padding: '10px 16px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        />
        <button
          onClick={handleSearch}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px'
          }}
        >
          <Search size={16} />
          Analyze
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div
          style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #f87171',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <AlertOctagon size={24} style={{ color: '#ef4444' }} />
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#991b1b' }}>
              {impactedCount}
            </div>
            <div style={{ fontSize: '13px', color: '#dc2626' }}>Impacted Assets</div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #f87171',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <Radio size={24} style={{ color: '#ef4444' }} />
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#991b1b' }}>
              {criticalCount}
            </div>
            <div style={{ fontSize: '13px', color: '#dc2626' }}>Critical Impacts</div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #fbbf24',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <span style={{ fontSize: '24px' }}>💰</span>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#92400e' }}>
              ${formatCurrency(financialImpact)}
            </div>
            <div style={{ fontSize: '13px', color: '#b45309' }}>Financial Impact</div>
          </div>
        </div>
      </div>

      {/* Graph Visualization */}
      {graphData.nodes.length > 0 ? (
        <>
          <div
            style={{
              height: '500px',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              overflow: 'hidden'
            }}
          >
            <CytoscapeComponent
              elements={CytoscapeComponent.normalizeElements({
                nodes: graphData.nodes,
                edges: graphData.edges
              })}
              layout={layout}
              stylesheet={stylesheet}
              style={{ width: '100%', height: '100%' }}
              cy={(cy) => {
                cyRef.current = cy;
                cy.fit();
              }}
            />
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#6b7280' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 16, height: 16, backgroundColor: '#fecaca', border: '2px solid #ef4444', borderRadius: '50%' }} />
              <span>Compromised</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 16, height: 16, backgroundColor: '#fee2e2', border: '2px solid #ef4444', borderRadius: '50%' }} />
              <span>Critical Impact</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 16, height: 16, backgroundColor: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '50%' }} />
              <span>High Impact</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 16, height: 16, backgroundColor: '#fef9c3', border: '2px solid #eab308', borderRadius: '50%' }} />
              <span>Medium Impact</span>
            </div>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <Radio size={48} style={{ color: '#9ca3af', margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7280' }}>No blast radius data</p>
          <p style={{ fontSize: '13px', color: '#9ca3af' }}>Search for an asset to analyze its blast radius</p>
        </div>
      )}
    </div>
  );
};

const formatCurrency = (value) => {
  if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
  if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
  return value.toFixed(0);
};

export default BlastRadiusDiagram;
