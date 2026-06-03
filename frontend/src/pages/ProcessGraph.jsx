import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import './ProcessGraph.module.css';

/**
 * ProcessGraph - Interactive Graph Visualization for Process Mappings
 *
 * This component provides an interactive graph visualization showing the relationships
 * between business processes, sub-processes, and applications. Features include:
 * - Process filtering by business process (e.g., "Show only Claims-related")
 * - Interactive node exploration (click to see details)
 * - Zoom and pan capabilities
 * - Color-coded nodes by type (process=blue, app=green)
 * - Confidence-based node sizing for processes
 *
 * T-221: Interactive Graph Render
 */

const ProcessGraph = ({ matchId }) => {
  const [selectedProcess, setSelectedProcess] = useState('all');
  const [selectedNode, setSelectedNode] = useState(null);

  // Fetch graph data from API
  const { data: graphData, isLoading, error } = useQuery({
    queryKey: ['graph-data', matchId],
    queryFn: async () => {
      const response = await fetch(`/api/mappings/${matchId}/graph`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch graph data: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!matchId,
    refetchInterval: 60000 // Refetch every minute
  });

  // Build Cytoscape elements from graph data
  const elements = useMemo(() => {
    if (!graphData) return { nodes: [], edges: [] };

    const nodes = [];
    const edges = [];
    const nodeSet = new Set(); // Track unique nodes

    // Filter by selected process
    const filteredProcesses = selectedProcess === 'all'
      ? graphData.processes || []
      : (graphData.processes || []).filter(p => p.process_id === selectedProcess);

    // Build nodes and edges from filtered processes
    filteredProcesses.forEach(process => {
      // Process node
      if (!nodeSet.has(process.process_id)) {
        nodes.push({
          data: {
            id: process.process_id,
            label: process.process_name,
            type: 'process',
            confidence: process.confidence || 1.0
          }
        });
        nodeSet.add(process.process_id);
      }

      // Sub-process nodes
      if (process.sub_processes && process.sub_processes.length > 0) {
        process.sub_processes.forEach(sub => {
          const subId = sub.sub_process_id;
          if (!nodeSet.has(subId)) {
            nodes.push({
              data: {
                id: subId,
                label: sub.sub_process_name,
                type: 'sub-process',
                parentProcess: process.process_id
              }
            });
            nodeSet.add(subId);

            // Edge: process → sub-process
            edges.push({
              data: {
                source: process.process_id,
                target: subId,
                label: 'contains'
              }
            });
          }
        });
      }

      // Application nodes
      if (process.applications && process.applications.length > 0) {
        process.applications.forEach(app => {
          const appId = app.application_id;
          if (!nodeSet.has(appId)) {
            nodes.push({
              data: {
                id: appId,
                label: app.application_name,
                type: 'application',
                vendor: app.vendor,
                confidence: app.confidence || 1.0
              }
            });
            nodeSet.add(appId);

            // Edge: process → app OR sub-process → app
            // For simplicity, we connect process to app
            edges.push({
              data: {
                source: process.process_id,
                target: appId,
                label: 'supported by',
                confidence: app.confidence
              }
            });
          }
        });
      }
    });

    return { nodes, edges };
  }, [graphData, selectedProcess]);

  // Cytoscape layout configuration
  const layout = {
    name: 'cose', // Compound Spring Embedder for organic layout
    animate: true,
    animationDuration: 500,
    fit: true,
    padding: 50,
    randomize: false,
    nodeRepulsion: 8000,
    idealEdgeLength: 100,
    edgeElasticity: 100,
    nestingFactor: 5,
    gravity: 1,
    numIter: 1000,
    initialTemp: 200,
    coolingFactor: 0.95,
    minTemp: 1.0
  };

  // Cytoscape stylesheet for node/edge styling
  const stylesheet = [
    {
      selector: 'node[type="process"]',
      style: {
        'background-color': '#3b82f6',
        'label': 'data(label)',
        'color': 'white',
        'text-valign': 'center',
        'text-halign': 'center',
        'width': 60,
        'height': 60,
        'font-size': '12px',
        'font-weight': 'bold',
        'text-wrap': 'wrap',
        'text-max-width': '80px',
        'border-width': 2,
        'border-color': '#1e40af'
      }
    },
    {
      selector: 'node[type="sub-process"]',
      style: {
        'background-color': '#8b5cf6',
        'label': 'data(label)',
        'color': 'white',
        'text-valign': 'center',
        'text-halign': 'center',
        'width': 50,
        'height': 50,
        'font-size': '11px',
        'text-wrap': 'wrap',
        'text-max-width': '70px',
        'border-width': 2,
        'border-color': '#6d28d9'
      }
    },
    {
      selector: 'node[type="application"]',
      style: {
        'background-color': '#10b981',
        'label': 'data(label)',
        'color': 'white',
        'text-valign': 'center',
        'text-halign': 'center',
        'width': 45,
        'height': 45,
        'font-size': '10px',
        'text-wrap': 'wrap',
        'text-max-width': '60px',
        'border-width': 2,
        'border-color': '#047857'
      }
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': 4,
        'border-color': '#f59e0b',
        'background-color': '#fbbf24'
      }
    },
    {
      selector: 'node.highlighted',
      style: {
        'border-width': 3,
        'border-color': '#f59e0b'
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#94a3b8',
        'target-arrow-color': '#94a3b8',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'arrow-scale': 0.8,
        'label': 'data(label)',
        'font-size': '9px',
        'text-rotation': 'autorotate',
        'text-margin-y': -10,
        'color': '#64748b'
      }
    },
    {
      selector: 'edge:selected',
      style: {
        'width': 3,
        'line-color': '#f59e0b',
        'target-arrow-color': '#f59e0b'
      }
    },
    {
      selector: 'edge.highlighted',
      style: {
        'width': 3,
        'line-color': '#f59e0b',
        'target-arrow-color': '#f59e0b'
      }
    }
  ];

  // Handle node click
  const handleNodeClick = (event) => {
    const node = event.target.data();
    setSelectedNode(node);

    // Highlight connected nodes and edges
    const cy = event.target.cy();
    cy.elements().removeClass('highlighted');

    // Highlight the clicked node
    event.target.addClass('highlighted');

    // Highlight connected edges
    event.target.connectedEdges().addClass('highlighted');

    // Highlight connected nodes
    event.target.neighborhood().nodes().addClass('highlighted');
  };

  // Get unique business processes for filter dropdown
  const businessProcesses = useMemo(() => {
    if (!graphData?.processes) return [];
    return [
      { id: 'all', name: 'All Processes' },
      ...graphData.processes.map(p => ({
        id: p.process_id,
        name: p.process_name
      }))
    ];
  }, [graphData]);

  if (isLoading) {
    return (
      <div className="process-graph-container loading">
        <div className="loading-spinner"></div>
        <p>Loading graph data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="process-graph-container error">
        <h2>Error Loading Graph Data</h2>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="process-graph-container">
      {/* Header */}
      <header className="graph-header">
        <div className="header-left">
          <h1>Process Mapping Graph</h1>
          <p className="subtitle">
            Match ID: <code>{matchId}</code> •
            {graphData && (
              <span>
                {' '}{elements.nodes.length} nodes • {elements.edges.length} edges
              </span>
            )}
          </p>
        </div>
        <div className="header-actions">
          <div className="filter-group">
            <label htmlFor="process-filter">Filter by Process:</label>
            <select
              id="process-filter"
              value={selectedProcess}
              onChange={(e) => setSelectedProcess(e.target.value)}
            >
              {businessProcesses.map(process => (
                <option key={process.id} value={process.id}>
                  {process.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Legend */}
      <div className="graph-legend">
        <div className="legend-item">
          <span className="legend-color process"></span>
          <span>Business Process</span>
        </div>
        <div className="legend-item">
          <span className="legend-color sub-process"></span>
          <span>Sub-Process</span>
        </div>
        <div className="legend-item">
          <span className="legend-color application"></span>
          <span>Application</span>
        </div>
      </div>

      {/* Graph Container */}
      <div className="graph-wrapper">
        <CytoscapeComponent
          elements={CytoscapeComponent.normalizeElements({
            nodes: elements.nodes,
            edges: elements.edges
          })}
          style={{ width: '100%', height: '600px' }}
          stylesheet={stylesheet}
          layout={layout}
          cy={(cy) => {
            cy.on('tap', 'node', handleNodeClick);
            // Deselect on background click
            cy.on('tap', (event) => {
              if (event.target === cy) {
                cy.elements().removeClass('highlighted');
                setSelectedNode(null);
              }
            });
          }}
          zoomingEnabled={true}
          panningEnabled={true}
          minZoom={0.3}
          maxZoom={3}
        />
      </div>

      {/* Node Details Panel */}
      {selectedNode && (
        <div className="node-details-panel">
          <div className="panel-header">
            <h2>Node Details</h2>
            <button
              className="close-button"
              onClick={() => {
                setSelectedNode(null);
                // Clear highlights when closing panel
                document.querySelectorAll('.highlighted').forEach(el => {
                  el.classList.remove('highlighted');
                });
              }}
              aria-label="Close details panel"
            >
              ×
            </button>
          </div>
          <div className="panel-content">
            <dl>
              <dt>Name:</dt>
              <dd>{selectedNode.label}</dd>

              <dt>Type:</dt>
              <dd>
                <span className={`type-badge ${selectedNode.type}`}>
                  {selectedNode.type === 'process' && 'Business Process'}
                  {selectedNode.type === 'sub-process' && 'Sub-Process'}
                  {selectedNode.type === 'application' && 'Application'}
                </span>
              </dd>

              {selectedNode.confidence && (
                <>
                  <dt>Confidence:</dt>
                  <dd>
                    <div className="confidence-bar">
                      <div
                        className="confidence-fill"
                        style={{ width: `${selectedNode.confidence * 100}%` }}
                      ></div>
                      <span className="confidence-text">
                        {(selectedNode.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </dd>
                </>
              )}

              {selectedNode.vendor && (
                <>
                  <dt>Vendor:</dt>
                  <dd>{selectedNode.vendor}</dd>
                </>
              )}

              {selectedNode.parentProcess && (
                <>
                  <dt>Parent Process:</dt>
                  <dd>{selectedNode.parentProcess}</dd>
                </>
              )}

              <dt>Connections:</dt>
              <dd>
                {selectedNode.type === 'process' && 'Supports applications and contains sub-processes'}
                {selectedNode.type === 'sub-process' && 'Part of a business process'}
                {selectedNode.type === 'application' && 'Supports business processes'}
              </dd>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessGraph;
