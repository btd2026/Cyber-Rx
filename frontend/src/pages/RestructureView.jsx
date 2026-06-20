import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, ArrowRight, FileSpreadsheet, Network } from 'lucide-react';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper;

const RestructureView = ({ matchId, goBack }) => {
  const [animationPlaying, setAnimationPlaying] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set(['all']));

  const { data: restructureData, isLoading } = useQuery({
    queryKey: ['restructure', matchId],
    queryFn: () => fetch(`/api/mappings/${matchId}/restructure`).then(r => r.json()),
    enabled: !!matchId
  });

  const toggleNode = (nodeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const playAnimation = () => {
    setAnimationPlaying(true);
    setSelectedRow(null);
    setTimeout(() => setAnimationPlaying(false), 3000);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>Loading transformation data...</div>
        </div>
      </div>
    );
  }

  if (!restructureData) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>No transformation data available</h2>
        <button onClick={goBack} style={{ marginTop: '20px' }}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <header style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <button onClick={goBack} style={{ marginBottom: '12px', padding: '8px 16px', background: PANEL, border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              ← Back
            </button>
            <h1 style={{ fontSize: '28px', fontWeight: '700', margin: 0, color: INK, fontFamily: FONTS.display }}>
              From Flat File to Hierarchical Structure
            </h1>
            <p style={{ color: INK2, marginTop: '8px', fontSize: '14px' }}>
              Watch the transformation from messy Excel rows to organized taxonomy
            </p>
          </div>
          <button
            onClick={playAnimation}
            disabled={animationPlaying}
            style={{
              padding: '12px 24px',
              background: animationPlaying ? INK3 : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: animationPlaying ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {animationPlaying ? 'Playing...' : (
              <>
                <span>▶</span>
                <span>Play Transformation</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Comparison Container */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Before: Flat File */}
        <div style={{
          border: '2px solid #fecaca',
          borderRadius: '12px',
          padding: '20px',
          background: '#fef2f2',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <FileSpreadsheet style={{ width: '24px', height: '24px', color: COLORS.bad }} />
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: COLORS.bad, fontFamily: FONTS.display }}>
                Before: Original Excel Upload
              </h2>
              <p style={{ fontSize: '13px', color: COLORS.bad, margin: '4px 0 0 0' }}>
                Messy headers, inconsistent naming, flat structure
              </p>
            </div>
          </div>

          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: 'white',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid #fecaca'
          }}>
            <thead>
              <tr style={{ background: '#fee2e2' }}>
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#7f1d1d', borderBottom: '2px solid #fecaca' }}>Row</th>
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#7f1d1d', borderBottom: '2px solid #fecaca' }}>Process Name</th>
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#7f1d1d', borderBottom: '2px solid #fecaca' }}>Application</th>
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#7f1d1d', borderBottom: '2px solid #fecaca' }}>Criticality</th>
              </tr>
            </thead>
            <tbody>
              {restructureData.original_rows?.map((row, idx) => (
                <tr
                  key={idx}
                  onClick={() => setSelectedRow(idx)}
                  style={{
                    cursor: 'pointer',
                    background: selectedRow === idx ? '#fef3c7' : idx % 2 === 0 ? '#fff' : PANEL,
                    transition: 'background 0.2s',
                    borderLeft: selectedRow === idx ? `3px solid ${COLORS.warn}` : '3px solid transparent'
                  }}
                >
                  <td style={{ padding: '10px', fontSize: '13px', borderBottom: '1px solid #fecaca' }}>{idx + 1}</td>
                  <td style={{ padding: '10px', fontSize: '13px', borderBottom: '1px solid #fecaca' }}>{row.process_name}</td>
                  <td style={{ padding: '10px', fontSize: '13px', borderBottom: '1px solid #fecaca' }}>{row.application_name}</td>
                  <td style={{ padding: '10px', fontSize: '13px', borderBottom: '1px solid #fecaca' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      background: row.criticality === 'High' ? '#fecaca' : '#bbf7d0',
                      color: row.criticality === 'High' ? COLORS.bad : COLORS.good
                    }}>
                      {row.criticality}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Arrow */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowRight style={{
            width: '48px',
            height: '48px',
            color: animationPlaying ? '#10b981' : INK2,
            transition: 'all 0.5s',
            transform: animationPlaying ? 'translateX(10px) scale(1.1)' : 'translateX(0)'
          }} />
        </div>

        {/* After: Tree Structure */}
        <div style={{
          border: '2px solid #86efac',
          borderRadius: '12px',
          padding: '20px',
          background: '#f0fdf4',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          maxHeight: '600px',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Network style={{ width: '24px', height: '24px', color: COLORS.good }} />
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: COLORS.good, fontFamily: FONTS.display }}>
                After: Confirmed Taxonomy
              </h2>
              <p style={{ fontSize: '13px', color: COLORS.good, margin: '4px 0 0 0' }}>
                Organized hierarchy, canonical names, clear relationships
              </p>
            </div>
          </div>

          <div className="tree-structure">
            {restructureData.confirmed_tree?.map(node => (
              <TreeNode
                key={node.id}
                node={node}
                animationPlaying={animationPlaying}
                expandedNodes={expandedNodes}
                onToggle={toggleNode}
                level={0}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'flex',
        gap: '40px',
        padding: '24px',
        background: PANEL,
        borderRadius: '12px',
        border: `1px solid ${HAIR}`
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', color: INK2, marginBottom: '4px' }}>Original Rows</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: INK, fontFamily: FONTS.mono }}>
            {restructureData.stats?.original_rows || 0}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', color: INK2, marginBottom: '4px' }}>Confirmed Nodes</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: INK, fontFamily: FONTS.mono }}>
            {restructureData.stats?.confirmed_nodes || 0}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', color: INK2, marginBottom: '4px' }}>Avg Confidence</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: INK, fontFamily: FONTS.mono }}>
            {((restructureData.stats?.avg_confidence || 0) * 100).toFixed(0)}%
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', color: INK2, marginBottom: '4px' }}>Improvement</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#10b981', fontFamily: FONTS.mono }}>
            +{(((restructureData.stats?.avg_confidence || 0) - 0.5) * 100).toFixed(0)}%
          </div>
        </div>
      </div>
    </div>
  );
};

const TreeNode = ({ node, animationPlaying, expandedNodes, onToggle, level }) => {
  const isExpanded = expandedNodes.has('all') || expandedNodes.has(node.id);
  const delay = level * 100;

  return (
    <div
      className={`tree-node ${animationPlaying ? 'animate-in' : ''}`}
      style={{
        marginLeft: level > 0 ? '20px' : '0',
        padding: '8px',
        borderLeft: level > 0 ? `2px solid ${HAIR}` : 'none',
        transition: 'opacity 0.5s, transform 0.5s',
        opacity: animationPlaying ? 0 : 1,
        transform: animationPlaying ? 'translateX(-20px)' : 'translateX(0)',
        animationDelay: animationPlaying ? `${delay}ms` : '0ms'
      }}
    >
      <div
        onClick={() => onToggle(node.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '6px',
          background: 'white',
          border: `1px solid ${HAIR}`,
          transition: 'background 0.2s',
          position: 'relative'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = PANEL}
        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
      >
        <span style={{ fontSize: '10px', color: INK2 }}>
          {isExpanded ? '▼' : '▶'}
        </span>
        <CheckCircle style={{ width: '16px', height: '16px', color: '#10b981', flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: '14px', fontWeight: '500', color: INK }}>
          {node.name}
        </span>
        {node.type && (
          <span style={{
            fontSize: '11px',
            color: INK2,
            fontStyle: 'italic',
            marginRight: '8px'
          }}>
            {node.type}
          </span>
        )}
        {node.vendor && (
          <span style={{
            fontSize: '11px',
            color: INK2,
            background: PANEL,
            padding: '2px 6px',
            borderRadius: '4px',
            marginRight: '8px'
          }}>
            {node.vendor}
          </span>
        )}
        <span style={{
          marginLeft: 'auto',
          background: '#eef0fb',
          color: '#4a52b0',
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '700',
          flexShrink: 0
        }}>
          {(node.confidence * 100).toFixed(0)}%
        </span>
      </div>
      {isExpanded && node.children && (
        <div style={{ marginTop: '4px' }}>
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              animationPlaying={animationPlaying}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RestructureView;
