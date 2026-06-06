/**
 * AttackPathwayVisualization Component
 *
 * Displays attack pathway graphs using Cytoscape.js
 * Shows how attackers can move through systems to reach crown jewels
 */

import React, { useState, useEffect, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { Network, ZoomIn, ZoomOut, RefreshCw, Download } from 'lucide-react';

const AttackPathwayVisualization = ({ briefing, apiEndpoint, token, orgId }) => {
  const [attackPaths, setAttackPaths] = useState([]);
  const [selectedPath, setSelectedPath] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cyRef = useRef(null);

  useEffect(() => {
    if (briefing?.attack_paths) {
      setAttackPaths(briefing.attack_paths);
    } else {
      fetchAttackPaths();
    }
  }, [briefing]);

  const fetchAttackPaths = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${apiEndpoint}/attack-paths?org_id=${orgId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Org-Id': orgId
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setAttackPaths(data.attack_paths || data || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching attack paths:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!cyRef.current) return;

    const png = cyRef.current.png({ full: true, scale: 2 });
    const link = document.createElement('a');
    link.href = png;
    link.download = `attack-pathways-${new Date().toISOString().split('T')[0]}.png`;
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

  // Convert attack paths to Cytoscape format
  const graphData = {
    nodes: [],
    edges: []
  };

  if (selectedPath) {
    // Render selected pathway
    selectedPath.nodes?.forEach((node, index) => {
      graphData.nodes.push({
        data: {
          id: node.id || `node-${index}`,
          label: node.name || node.asset_name || 'Unknown',
          type: node.type || 'asset',
          compromised: node.compromised || false,
          crownJewel: node.crown_jewel || false
        }
      });
    });

    selectedPath.edges?.forEach((edge, index) => {
      graphData.edges.push({
        data: {
          id: `edge-${index}`,
          source: edge.source,
          target: edge.target,
          technique: edge.technique || 'unknown'
        }
      });
    });
  } else if (attackPaths.length > 0) {
    // Render all pathways as overview
    const nodeMap = new Map();

    attackPaths.forEach((path, pathIndex) => {
      path.nodes?.forEach((node, nodeIndex) => {
        const nodeId = node.id || `node-${pathIndex}-${nodeIndex}`;
        if (!nodeMap.has(nodeId)) {
          nodeMap.set(nodeId, {
            data: {
              id: nodeId,
              label: node.name || node.asset_name || 'Unknown',
              type: node.type || 'asset',
              crownJewel: node.crown_jewel || false,
              inPath: true
            }
          });
        }
      });

      path.edges?.forEach((edge, edgeIndex) => {
        const sourceId = edge.source || `node-${pathIndex}-${edgeIndex}`;
        const targetId = edge.target || `node-${pathIndex}-${edgeIndex + 1}`;

        if (nodeMap.has(sourceId) && nodeMap.has(targetId)) {
          graphData.edges.push({
            data: {
              id: `edge-${pathIndex}-${edgeIndex}`,
              source: sourceId,
              target: targetId,
              pathway: pathIndex,
              technique: edge.technique || 'unknown'
            }
          });
        }
      });
    });

    graphData.nodes = Array.from(nodeMap.values());
  }

  // Cytoscape layout and style
  const layout = {
    name: 'dagre',
    rankDir: 'TB',
    nodeSep: 80,
    rankSep: 120,
    padding: 50
  };

  const stylesheet = [
    {
      selector: 'node',
      style: {
        'background-color': '#e5e7eb',
        'label': 'data(label)',
        'width': 60,
        'height': 60,
        'font-size': '12px',
        'font-weight': '600',
        'text-valign': 'center',
        'text-halign': 'center',
        'border-width': 2,
        'border-color': '#9ca3af',
        'color': '#1f2937'
      }
    },
    {
      selector: 'node[crownJewel = true]',
      style: {
        'background-color': '#fef3c7',
        'border-color': '#fbbf24',
        'border-width': 4,
        'width': 80,
        'height': 80,
        'font-size': '14px'
      }
    },
    {
      selector: 'node[compromised = true]',
      style: {
        'background-color': '#fecaca',
        'border-color': '#ef4444'
      }
    },
    {
      selector: 'node:selected',
      style: {
        'border-color': '#3b82f6',
        'border-width': 4
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
        'arrow-scale': 1.5
      }
    },
    {
      selector: 'edge[technique = "phishing"]',
      style: {
        'line-color': '#ef4444',
        'target-arrow-color': '#ef4444',
        'width': 3
      }
    },
    {
      selector: 'edge[technique = "exploitation"]',
      style: {
        'line-color': '#f59e0b',
        'target-arrow-color': '#f59e0b',
        'width': 3
      }
    },
    {
      selector: 'edge[technique = "lateral"]',
      style: {
        'line-color': '#8b5cf6',
        'target-arrow-color': '#8b5cf6',
        'width': 3
      }
    }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#6b7280' }}>Loading attack pathways...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: '#ef4444', marginBottom: '16px' }}>Error loading attack pathways</p>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>{error}</p>
        <button
          onClick={fetchAttackPaths}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (attackPaths.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <Network size={48} style={{ color: '#9ca3af', margin: '0 auto 16px' }} />
        <p style={{ color: '#6b7280' }}>No attack pathways identified</p>
        <p style={{ fontSize: '13px', color: '#9ca3af' }}>Attack pathways will be calculated from your risk analysis</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Attack Pathway Analysis</h3>
          <p style={{ fontSize: '13px', color: '#6b7280' }}>
            {attackPaths.length} potential attack path{attackPaths.length !== 1 ? 's' : ''} identified
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

      {/* Pathway Selector */}
      {attackPaths.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedPath(null)}
            style={{
              padding: '8px 16px',
              backgroundColor: !selectedPath ? '#3b82f6' : 'white',
              color: !selectedPath ? 'white' : '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: !selectedPath ? '600' : '400'
            }}
          >
            All Pathways
          </button>
          {attackPaths.map((path, index) => (
            <button
              key={index}
              onClick={() => setSelectedPath(path)}
              style={{
                padding: '8px 16px',
                backgroundColor: selectedPath === path ? '#3b82f6' : 'white',
                color: selectedPath === path ? 'white' : '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: selectedPath === path ? '600' : '400'
              }}
            >
              Path {index + 1} ({path.likelihood || 'Medium'} likelihood)
            </button>
          ))}
        </div>
      )}

      {/* Graph Visualization */}
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

      {/* Pathway Details */}
      {selectedPath && (
        <div
          style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '20px'
          }}
        >
          <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Pathway Details</h4>
          <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#374151' }}>
            <p><strong>Entry Point:</strong> {selectedPath.entry_point || 'Unknown'}</p>
            <p><strong>Target:</strong> {selectedPath.target || 'Crown jewel'}</p>
            <p><strong>Likelihood:</strong> {selectedPath.likelihood || 'N/A'}</p>
            <p><strong>Impact:</strong> {selectedPath.impact || 'High'}</p>
            {selectedPath.description && (
              <p style={{ marginTop: '12px' }}>{selectedPath.description}</p>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#6b7280' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 16, height: 16, backgroundColor: '#e5e7eb', border: '2px solid #9ca3af', borderRadius: '50%' }} />
          <span>Asset</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 20, height: 20, backgroundColor: '#fef3c7', border: '4px solid #fbbf24', borderRadius: '50%' }} />
          <span>Crown Jewel</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 16, height: 16, backgroundColor: '#fecaca', border: '2px solid #ef4444', borderRadius: '50%' }} />
          <span>Compromised</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 40, height: 2, backgroundColor: '#ef4444' }} />
          <span>Phishing</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 40, height: 2, backgroundColor: '#f59e0b' }} />
          <span>Exploitation</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 40, height: 2, backgroundColor: '#8b5cf6' }} />
          <span>Lateral Movement</span>
        </div>
      </div>
    </div>
  );
};

export default AttackPathwayVisualization;
