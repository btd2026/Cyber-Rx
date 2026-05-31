/**
 * ConnectorCredentialModal Component Stub
 * This is a temporary stub for T-003 testing.
 * The full implementation will be completed in T-001.
 */

import React from 'react';

const ConnectorCredentialModal = ({ isOpen, onClose, connector, onSuccess }) => {
  if (!isOpen) return null;

  return (
    <div data-testid="credential-modal">
      <h2>Configure {connector?.name || 'Connector'}</h2>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
};

export default ConnectorCredentialModal;
