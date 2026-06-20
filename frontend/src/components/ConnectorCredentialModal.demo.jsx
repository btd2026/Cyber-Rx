/**
 * ConnectorCredentialModal Demo Component
 *
 * This is a demonstration of how to use the ConnectorCredentialModal component
 * within your application. It shows the proper integration patterns and props.
 *
 * Usage Example:
 * ```jsx
 * import ConnectorCredentialModal from './components/ConnectorCredentialModal';
 *
 * function MyComponent() {
 *   const [showModal, setShowModal] = useState(false);
 *   const [selectedConnector, setSelectedConnector] = useState(null);
 *
 *   const handleConnect = (connector) => {
 *     setSelectedConnector(connector);
 *     setShowModal(true);
 *   };
 *
 *   return (
 *     <>
 *       <button onClick={() => handleConnect(securityScorecardConnector)}>
 *         Configure SecurityScorecard
 *       </button>
 *
 *       <ConnectorCredentialModal
 *         isOpen={showModal}
 *         onClose={() => setShowModal(false)}
 *         connector={selectedConnector}
 *         api_url={apiUrl}
 *         authToken={userToken}
 *         orgId={organizationId}
 *         onSuccess={(connectorId, syncFrequency) => {
 *           console.log('Connected:', connectorId, syncFrequency);
 *           // Refresh your connector list here
 *           fetchConnectors();
 *         }}
 *       />
 *     </>
 *   );
 * }
 * ```
 */

import React, { useState } from 'react';
import ConnectorCredentialModal from './ConnectorCredentialModal';

// Sample connector configurations
const sampleConnectors = [
  {
    id: 'securityscorecard',
    name: 'SecurityScorecard',
    icon: '🛡️',
    purpose: 'Cyber risk ratings',
    description: 'SecurityScorecard provides cybersecurity ratings and threat intelligence for vendors.',
    docsUrl: 'https://www.securityscorecard.com/docs/api/'
  },
  {
    id: 'bitsight',
    name: 'BitSight',
    icon: '🔒',
    purpose: 'Security ratings',
    description: 'BitSight provides security ratings based on observed security performance.',
    docsUrl: 'https://www.bitsighttech.com/resources/'
  },
  {
    id: 'riskrecon',
    name: 'RiskRecon',
    icon: '🎯',
    purpose: 'Risk monitoring',
    description: 'RiskRecon automatically discovers and monitors third-party cyber risks.',
    docsUrl: 'https://www.riskrecon.com/docs/'
  },
  {
    id: 'recorded_future',
    name: 'Recorded Future',
    icon: '🔮',
    purpose: 'Threat intelligence',
    description: 'Recorded Future provides real-time threat intelligence and risk analytics.',
    docsUrl: 'https://www.recordedfuture.com/docs/'
  },
  {
    id: 'compliance_evidence',
    name: 'Compliance Evidence',
    icon: '📋',
    purpose: 'Document tracking',
    description: 'Upload and track compliance evidence like SOC 2 reports and ISO certificates.'
  },
  {
    id: 'google_alerts',
    name: 'Google Alerts',
    icon: '🔔',
    purpose: 'News monitoring',
    description: 'Monitor vendor-related news and breach notifications via Google Alerts.'
  },
  {
    id: 'questionnaire',
    name: 'Vendor Questionnaire',
    icon: '📝',
    purpose: 'Assessment data',
    description: 'Send structured questionnaires to vendors for self-assessment.'
  }
];

const ConnectorCredentialModalDemo = () => {
  const [showModal, setShowModal] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState(null);
  const [connectedConnectors, setConnectedConnectors] = useState([]);

  // Mock API configuration (replace with actual values in production)
  const api_url = import.meta.env?.VITE_API_URL || 'https://cyberrx-api.onrender.com';
  const authToken = localStorage.getItem('authToken');
  const orgId = localStorage.getItem('orgId');

  const handleOpenModal = (connector) => {
    setSelectedConnector(connector);
    setShowModal(true);
  };

  const handleSuccess = (connectorId, syncFrequency) => {
    console.log('Successfully connected:', connectorId, 'with frequency:', syncFrequency);

    // Add to connected list
    setConnectedConnectors(prev => [
      ...prev,
      { connectorId, syncFrequency, connectedAt: new Date().toISOString() }
    ]);

    // In production, you would fetch the updated connector list
    // fetchConnectors();
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
        Connector Credential Modal Demo
      </h1>

      <p style={{ fontSize: 12, color: '#5c6066', marginBottom: 32 }}>
        This demonstrates the ConnectorCredentialModal component with all supported connector types.
        Click any connector below to configure its credentials.
      </p>

      {/* Available connectors */}
      <section>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#5c6066' }}>
          Available Connectors
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {sampleConnectors.map(connector => (
            <div
              key={connector.id}
              style={{
                border: '1px solid #ebecf0',
                borderRadius: 8,
                padding: 16,
                backgroundColor: '#FFFFFF',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>{connector.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0b0c0e' }}>
                    {connector.name}
                  </div>
                  <div style={{ fontSize: 10, color: '#5c6066' }}>
                    {connector.purpose}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 11, color: '#5c6066', marginBottom: 12, lineHeight: 1.5 }}>
                {connector.description}
              </p>
              <button
                onClick={() => handleOpenModal(connector)}
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  backgroundColor: '#5e6ad2',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  transition: 'background-color 0.2s ease'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#4f5ac4'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#5e6ad2'}
              >
                Configure Credentials
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Connected connectors */}
      {connectedConnectors.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#5c6066' }}>
            Connected Connectors
          </h2>
          <div style={{ backgroundColor: '#F9FAFB', borderRadius: 8, padding: 16, border: '1px solid #ebecf0' }}>
            {connectedConnectors.map((conn, index) => {
              const connector = sampleConnectors.find(c => c.id === conn.connectorId);
              return (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: 6,
                    marginBottom: index < connectedConnectors.length - 1 ? 8 : 0,
                    border: '1px solid #ebecf0'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{connector?.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#0b0c0e' }}>
                        {connector?.name}
                      </div>
                      <div style={{ fontSize: 10, color: '#5c6066' }}>
                        Sync: {conn.syncFrequency}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#0FBB80' }} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#0FBB80' }}>
                      Connected
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Usage documentation */}
      <section style={{ marginTop: 32, padding: 20, backgroundColor: '#F9FAFB', borderRadius: 8, border: '1px solid #ebecf0' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#0b0c0e' }}>
          Integration Guide
        </h2>
        <div style={{ fontSize: 11, color: '#5c6066', lineHeight: 1.6 }}>
          <p style={{ marginBottom: 8 }}>
            <strong>Props:</strong>
          </p>
          <ul style={{ marginBottom: 16, paddingLeft: 20 }}>
            <li><code>isOpen</code> (boolean) - Controls modal visibility</li>
            <li><code>onClose</code> (function) - Callback when modal is closed</li>
            <li><code>connector</code> (object) - Connector configuration with id, name, icon, purpose, description, docsUrl</li>
            <li><code>api_url</code> (string) - API base URL (optional, uses VITE_API_URL env var)</li>
            <li><code>authToken</code> (string) - JWT authentication token (optional, reads from localStorage)</li>
            <li><code>orgId</code> (string) - Organization ID (optional, reads from localStorage)</li>
            <li><code>onSuccess</code> (function) - Callback after successful credential save</li>
          </ul>
          <p style={{ marginBottom: 8 }}>
            <strong>Backend API Endpoints Required:</strong>
          </p>
          <ul style={{ marginBottom: 16, paddingLeft: 20 }}>
            <li><code>POST /api/credentials/:connectorId/validate</code> - Validate credentials before saving</li>
            <li><code>POST /api/credentials/:connectorId</code> - Save validated credentials to vault</li>
          </ul>
          <p>
            <strong>Features:</strong>
          </p>
          <ul style={{ paddingLeft: 20 }}>
            <li>Dynamic form fields based on connector type</li>
            <li>Secure password input with show/hide toggle</li>
            <li>Connection testing before save</li>
            <li>Sync frequency selection (Real-time, Hourly, Daily, Weekly)</li>
            <li>Comprehensive error handling and validation feedback</li>
            <li>ESC key and backdrop click to close</li>
            <li>Credential masking in storage (never stores actual API keys)</li>
          </ul>
        </div>
      </section>

      {/* Credential Modal */}
      <ConnectorCredentialModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        connector={selectedConnector}
        api_url={api_url}
        authToken={authToken}
        orgId={orgId}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default ConnectorCredentialModalDemo;
